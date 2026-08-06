package com.example.PaymentProcessing.service;

import com.example.PaymentProcessing.api.RefundRequestResponse;
import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.model.Admin;
import com.example.PaymentProcessing.model.NotificationType;
import com.example.PaymentProcessing.model.Payment;
import com.example.PaymentProcessing.model.PaymentCategory;
import com.example.PaymentProcessing.model.PaymentStatus;
import com.example.PaymentProcessing.model.RefundRequest;
import com.example.PaymentProcessing.model.RefundRequestStatus;
import com.example.PaymentProcessing.model.RefundRequestType;
import com.example.PaymentProcessing.repository.AdminRepository;
import com.example.PaymentProcessing.repository.CustomerRepository;
import com.example.PaymentProcessing.repository.PaymentRepository;
import com.example.PaymentProcessing.repository.RefundRequestRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Orchestrates the sender-raised-ticket -> admin-approval refund workflow. The actual
// money movement lives in PaymentService.applyApprovedRefund - this class only owns the
// ticket lifecycle (PENDING -> APPROVED/REJECTED) and who is allowed to touch it.
@Service
public class RefundRequestService {

    private final RefundRequestRepository refundRequestRepository;
    private final PaymentRepository paymentRepository;
    private final AdminRepository adminRepository;
    private final CustomerRepository customerRepository;
    private final PaymentService paymentService;
    private final EmailService emailService;
    private final NotificationService notificationService;

    public RefundRequestService(
            RefundRequestRepository refundRequestRepository,
            PaymentRepository paymentRepository,
            AdminRepository adminRepository,
            CustomerRepository customerRepository,
            PaymentService paymentService,
            EmailService emailService,
            NotificationService notificationService
    ) {
        this.refundRequestRepository = refundRequestRepository;
        this.paymentRepository = paymentRepository;
        this.adminRepository = adminRepository;
        this.customerRepository = customerRepository;
        this.paymentService = paymentService;
        this.emailService = emailService;
        this.notificationService = notificationService;
    }

    @Transactional
    public RefundRequestResponse createRequest(Long paymentId, String reason, RefundRequestType requestedType, Long authenticatedCustomerId) {
        Payment payment = findPayment(paymentId);

        if (payment.getStatus() != PaymentStatus.COMPLETED) {
            throw new ApiException(
                    "INVALID_STATUS_TRANSITION",
                    "Only a COMPLETED payment can have a refund requested, current status is " + payment.getStatus(),
                    HttpStatus.BAD_REQUEST
            );
        }

        var source = payment.getSourceAccount();
        if (source.getCustomerId() == null || !source.getCustomerId().equals(authenticatedCustomerId)) {
            throw new ApiException("REFUND_REQUEST_NOT_AUTHORIZED",
                    "Only the sender of this payment can request a refund", HttpStatus.FORBIDDEN);
        }

        refundRequestRepository.findByPayment_PaymentIdAndStatus(paymentId, RefundRequestStatus.PENDING)
                .ifPresent(existing -> {
                    throw new ApiException("REFUND_REQUEST_ALREADY_PENDING",
                            "A refund request for this payment is already pending review", HttpStatus.CONFLICT);
                });

        RefundRequest request = new RefundRequest();
        request.setPayment(payment);
        request.setRequestedByCustomerId(authenticatedCustomerId);
        request.setReason(reason);
        request.setStatus(RefundRequestStatus.PENDING);
        // The customer picks a category when raising the ticket (Merchant vs Wrong
        // Payment/Other); fall back to auto-classifying from the payment's own category
        // for callers that don't specify one.
        request.setType(requestedType != null ? requestedType : classifyType(payment.getCategory()));

        RefundRequest saved = refundRequestRepository.save(request);

        notificationService.create(authenticatedCustomerId, NotificationType.REFUND_REQUESTED,
                "Refund requested", "Your refund request for ref " + payment.getReferenceNumber() + " is pending admin review");
        notifyAdminsOfNewTicket(payment, source.getAccountHolderName(), reason);

        return RefundRequestResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<RefundRequestResponse> listForAdmin(RefundRequestStatus status) {
        List<RefundRequest> requests = status == null
                ? refundRequestRepository.findAllByOrderByCreatedAtAsc()
                : refundRequestRepository.findByStatusOrderByCreatedAtAsc(status);
        return requests.stream().map(RefundRequestResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public List<RefundRequestResponse> listMine(Long customerId) {
        return refundRequestRepository.findByRequestedByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(RefundRequestResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RefundRequestResponse> listForPayment(Long paymentId, Long authenticatedCustomerId) {
        Payment payment = findPayment(paymentId);
        boolean isParticipant = Objects.equals(payment.getSourceAccount().getCustomerId(), authenticatedCustomerId)
                || Objects.equals(payment.getDestinationAccount().getCustomerId(), authenticatedCustomerId);
        if (!isParticipant) {
            throw new ApiException("FORBIDDEN", "You do not have access to this payment", HttpStatus.FORBIDDEN);
        }
        return refundRequestRepository.findByPayment_PaymentIdOrderByCreatedAtDesc(paymentId).stream()
                .map(RefundRequestResponse::fromEntity)
                .toList();
    }

    @Transactional
    public RefundRequestResponse approve(Long requestId, Long adminId) {
        RefundRequest request = findRequest(requestId);
        requirePending(request);

        // Apply the refund first: if it fails (e.g. receiver's balance no longer covers it),
        // the ticket stays PENDING so an admin can retry once the underlying issue is fixed.
        paymentService.applyApprovedRefund(request.getPayment().getPaymentId(), request.getReason());

        request.setStatus(RefundRequestStatus.APPROVED);
        request.setResolvedByAdminId(adminId);
        request.setResolvedAt(LocalDateTime.now());

        return RefundRequestResponse.fromEntity(refundRequestRepository.save(request));
    }

    @Transactional
    public RefundRequestResponse reject(Long requestId, Long adminId, String rejectionReason) {
        RefundRequest request = findRequest(requestId);
        requirePending(request);

        request.setStatus(RefundRequestStatus.REJECTED);
        request.setRejectionReason(rejectionReason);
        request.setResolvedByAdminId(adminId);
        request.setResolvedAt(LocalDateTime.now());

        RefundRequest saved = refundRequestRepository.save(request);
        notifySenderOfRejection(saved);

        return RefundRequestResponse.fromEntity(saved);
    }

    // OTHERS/UPI_PAYMENTS look like a person-to-person transfer gone wrong (sent to the
    // wrong account/amount) rather than a purchase, so they're classified as a wrong
    // payment rather than a merchant dispute. Purely informational for the admin reviewing it.
    private RefundRequestType classifyType(PaymentCategory category) {
        if (category == null) {
            return RefundRequestType.WRONG_PAYMENT;
        }
        return switch (category) {
            case SHOPPING, FOOD, ENTERTAINMENT, BILL_PAYMENTS -> RefundRequestType.MERCHANT_REFUND_REQUEST;
            case OTHERS, UPI_PAYMENTS -> RefundRequestType.WRONG_PAYMENT;
        };
    }

    private void requirePending(RefundRequest request) {
        if (request.getStatus() != RefundRequestStatus.PENDING) {
            throw new ApiException("REFUND_REQUEST_ALREADY_RESOLVED",
                    "This refund request was already " + request.getStatus(), HttpStatus.BAD_REQUEST);
        }
    }

    private void notifyAdminsOfNewTicket(Payment payment, String requestedByName, String reason) {
        try {
            String amount = payment.getAmount().toPlainString();
            String ref = payment.getReferenceNumber();
            for (Admin admin : adminRepository.findAll()) {
                emailService.sendRefundTicketRaisedEmail(admin.getEmail(), amount, ref, requestedByName, reason);
            }
        } catch (Exception ex) {
            // EmailService handles its own logging; swallow any unexpected errors here.
        }
    }

    private void notifySenderOfRejection(RefundRequest request) {
        try {
            Payment payment = request.getPayment();
            var source = payment.getSourceAccount();
            String senderEmail = source.getCustomerId() == null ? null
                    : customerRepository.findById(source.getCustomerId()).map(c -> c.getEmail()).orElse(null);
            String amount = payment.getAmount().toPlainString();
            String ref = payment.getReferenceNumber();
            emailService.sendRefundRejectedEmail(senderEmail, source.getAccountHolderName(), amount, ref, request.getRejectionReason());
            notificationService.create(request.getRequestedByCustomerId(), NotificationType.REFUND_REJECTED,
                    "Refund request declined", "Your refund request for ref " + ref + " was declined: "
                            + (request.getRejectionReason() == null || request.getRejectionReason().isBlank()
                                    ? "no reason given" : request.getRejectionReason()));
        } catch (Exception ex) {
            // EmailService/NotificationService handle their own logging; swallow any unexpected errors here.
        }
    }

    private Payment findPayment(Long paymentId) {
        return paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ApiException("PAYMENT_NOT_FOUND", "Payment not found", HttpStatus.NOT_FOUND));
    }

    private RefundRequest findRequest(Long requestId) {
        return refundRequestRepository.findById(requestId)
                .orElseThrow(() -> new ApiException("REFUND_REQUEST_NOT_FOUND", "Refund request not found", HttpStatus.NOT_FOUND));
    }
}

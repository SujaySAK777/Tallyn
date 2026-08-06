package com.example.PaymentProcessing.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.PaymentProcessing.api.PaymentResponse;
import com.example.PaymentProcessing.api.RefundRequestResponse;
import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.model.Account;
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
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class RefundRequestServiceTest {

    private RefundRequestRepository refundRequestRepository;
    private PaymentRepository paymentRepository;
    private AdminRepository adminRepository;
    private CustomerRepository customerRepository;
    private PaymentService paymentService;
    private EmailService emailService;
    private NotificationService notificationService;
    private RefundRequestService service;

    private void setUp() {
        refundRequestRepository = mock(RefundRequestRepository.class);
        paymentRepository = mock(PaymentRepository.class);
        adminRepository = mock(AdminRepository.class);
        customerRepository = mock(CustomerRepository.class);
        paymentService = mock(PaymentService.class);
        emailService = mock(EmailService.class);
        notificationService = mock(NotificationService.class);
        service = new RefundRequestService(refundRequestRepository, paymentRepository, adminRepository,
                customerRepository, paymentService, emailService, notificationService);
        when(adminRepository.findAll()).thenReturn(List.of());
    }

    private Account account(Long id, Long customerId) {
        Account account = new Account();
        account.setAccountId(id);
        account.setCustomerId(customerId);
        account.setAccountHolderName("Holder " + id);
        return account;
    }

    private Payment payment(PaymentStatus status, Account source, Account dest) {
        Payment payment = new Payment();
        payment.setPaymentId(1L);
        payment.setSourceAccount(source);
        payment.setDestinationAccount(dest);
        payment.setAmount(BigDecimal.valueOf(100));
        payment.setCurrency("INR");
        payment.setReferenceNumber("REF1");
        payment.setStatus(status);
        return payment;
    }

    // ---- createRequest ----

    @Test
    void shouldRejectRequestForNonCompletedPayment() {
        setUp();
        Payment payment = payment(PaymentStatus.PROCESSING, account(1L, 5L), account(2L, 6L));
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));

        ApiException ex = assertThrows(ApiException.class, () -> service.createRequest(1L, "reason", null, 5L));
        assertEquals("INVALID_STATUS_TRANSITION", ex.getErrorCode());
    }

    @Test
    void shouldRejectRequestFromSomeoneOtherThanSender() {
        setUp();
        Payment payment = payment(PaymentStatus.COMPLETED, account(1L, 5L), account(2L, 6L));
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));

        // customer 6 is the receiver, not the sender - only the sender may raise a ticket
        ApiException ex = assertThrows(ApiException.class, () -> service.createRequest(1L, "reason", null, 6L));
        assertEquals("REFUND_REQUEST_NOT_AUTHORIZED", ex.getErrorCode());
    }

    @Test
    void shouldRejectDuplicatePendingRequest() {
        setUp();
        Payment payment = payment(PaymentStatus.COMPLETED, account(1L, 5L), account(2L, 6L));
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));
        when(refundRequestRepository.findByPayment_PaymentIdAndStatus(1L, RefundRequestStatus.PENDING))
                .thenReturn(Optional.of(new RefundRequest()));

        ApiException ex = assertThrows(ApiException.class, () -> service.createRequest(1L, "reason", null, 5L));
        assertEquals("REFUND_REQUEST_ALREADY_PENDING", ex.getErrorCode());
    }

    @Test
    void shouldCreatePendingRequestAndNotifySenderAndAdmins() {
        setUp();
        Payment payment = payment(PaymentStatus.COMPLETED, account(1L, 5L), account(2L, 6L));
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));
        when(refundRequestRepository.findByPayment_PaymentIdAndStatus(1L, RefundRequestStatus.PENDING))
                .thenReturn(Optional.empty());
        when(refundRequestRepository.save(any(RefundRequest.class))).thenAnswer(invocation -> {
            RefundRequest request = invocation.getArgument(0);
            request.setRequestId(10L);
            return request;
        });

        RefundRequestResponse response = service.createRequest(1L, "duplicate charge", null, 5L);

        assertEquals(RefundRequestStatus.PENDING, response.getStatus());
        assertEquals(5L, response.getRequestedByCustomerId());
        verify(notificationService).create(eq(5L), eq(NotificationType.REFUND_REQUESTED), any(), any());
    }

    @Test
    void shouldClassifyOthersCategoryAsWrongPayment() {
        setUp();
        Payment payment = payment(PaymentStatus.COMPLETED, account(1L, 5L), account(2L, 6L));
        payment.setCategory(PaymentCategory.OTHERS);
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));
        when(refundRequestRepository.findByPayment_PaymentIdAndStatus(1L, RefundRequestStatus.PENDING))
                .thenReturn(Optional.empty());
        when(refundRequestRepository.save(any(RefundRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RefundRequestResponse response = service.createRequest(1L, "sent to wrong account", null, 5L);

        assertEquals(RefundRequestType.WRONG_PAYMENT, response.getType());
    }

    @Test
    void shouldClassifyShoppingCategoryAsMerchantRefundRequest() {
        setUp();
        Payment payment = payment(PaymentStatus.COMPLETED, account(1L, 5L), account(2L, 6L));
        payment.setCategory(PaymentCategory.SHOPPING);
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));
        when(refundRequestRepository.findByPayment_PaymentIdAndStatus(1L, RefundRequestStatus.PENDING))
                .thenReturn(Optional.empty());
        when(refundRequestRepository.save(any(RefundRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RefundRequestResponse response = service.createRequest(1L, "item not delivered", null, 5L);

        assertEquals(RefundRequestType.MERCHANT_REFUND_REQUEST, response.getType());
    }

    @Test
    void shouldUseCustomerChosenTypeOverAutoClassification() {
        setUp();
        Payment payment = payment(PaymentStatus.COMPLETED, account(1L, 5L), account(2L, 6L));
        payment.setCategory(PaymentCategory.SHOPPING); // would auto-classify as MERCHANT_REFUND_REQUEST
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));
        when(refundRequestRepository.findByPayment_PaymentIdAndStatus(1L, RefundRequestStatus.PENDING))
                .thenReturn(Optional.empty());
        when(refundRequestRepository.save(any(RefundRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RefundRequestResponse response = service.createRequest(1L, "sent to the wrong account", RefundRequestType.WRONG_PAYMENT, 5L);

        assertEquals(RefundRequestType.WRONG_PAYMENT, response.getType());
    }

    // ---- approve ----

    @Test
    void shouldRejectApprovingAlreadyResolvedRequest() {
        setUp();
        RefundRequest request = new RefundRequest();
        request.setStatus(RefundRequestStatus.APPROVED);
        when(refundRequestRepository.findById(10L)).thenReturn(Optional.of(request));

        ApiException ex = assertThrows(ApiException.class, () -> service.approve(10L, 99L));
        assertEquals("REFUND_REQUEST_ALREADY_RESOLVED", ex.getErrorCode());
        verify(paymentService, never()).applyApprovedRefund(anyLong(), any());
    }

    @Test
    void shouldApplyRefundAndMarkApprovedOnApprove() {
        setUp();
        Payment payment = payment(PaymentStatus.COMPLETED, account(1L, 5L), account(2L, 6L));
        RefundRequest request = new RefundRequest();
        request.setRequestId(10L);
        request.setPayment(payment);
        request.setReason("duplicate charge");
        request.setStatus(RefundRequestStatus.PENDING);
        when(refundRequestRepository.findById(10L)).thenReturn(Optional.of(request));
        when(refundRequestRepository.save(any(RefundRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentService.applyApprovedRefund(1L, "duplicate charge"))
                .thenReturn(mock(PaymentResponse.class));

        RefundRequestResponse response = service.approve(10L, 99L);

        assertEquals(RefundRequestStatus.APPROVED, response.getStatus());
        assertEquals(99L, response.getResolvedByAdminId());
        verify(paymentService).applyApprovedRefund(1L, "duplicate charge");
    }

    @Test
    void shouldLeaveTicketPendingWhenRefundApplicationFails() {
        setUp();
        Payment payment = payment(PaymentStatus.COMPLETED, account(1L, 5L), account(2L, 6L));
        RefundRequest request = new RefundRequest();
        request.setRequestId(10L);
        request.setPayment(payment);
        request.setStatus(RefundRequestStatus.PENDING);
        when(refundRequestRepository.findById(10L)).thenReturn(Optional.of(request));
        when(paymentService.applyApprovedRefund(anyLong(), any()))
                .thenThrow(new ApiException("INSUFFICIENT_FUNDS_FOR_REFUND", "no funds", org.springframework.http.HttpStatus.BAD_REQUEST));

        assertThrows(ApiException.class, () -> service.approve(10L, 99L));
        assertEquals(RefundRequestStatus.PENDING, request.getStatus());
        verify(refundRequestRepository, never()).save(any(RefundRequest.class));
    }

    // ---- reject ----

    @Test
    void shouldRejectTicketAndNotifySender() {
        setUp();
        Payment payment = payment(PaymentStatus.COMPLETED, account(1L, 5L), account(2L, 6L));
        RefundRequest request = new RefundRequest();
        request.setRequestId(10L);
        request.setPayment(payment);
        request.setRequestedByCustomerId(5L);
        request.setStatus(RefundRequestStatus.PENDING);
        when(refundRequestRepository.findById(10L)).thenReturn(Optional.of(request));
        when(refundRequestRepository.save(any(RefundRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(customerRepository.findById(anyLong())).thenReturn(Optional.empty());

        RefundRequestResponse response = service.reject(10L, 99L, "receiver already spent the funds");

        assertEquals(RefundRequestStatus.REJECTED, response.getStatus());
        assertEquals("receiver already spent the funds", response.getRejectionReason());
        verify(notificationService).create(eq(5L), eq(NotificationType.REFUND_REJECTED), any(), any());
        verify(paymentService, never()).applyApprovedRefund(anyLong(), any());
    }

    // ---- listForPayment ----

    @Test
    void shouldRejectListingForNonParticipant() {
        setUp();
        Payment payment = payment(PaymentStatus.COMPLETED, account(1L, 5L), account(2L, 6L));
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));

        ApiException ex = assertThrows(ApiException.class, () -> service.listForPayment(1L, 999L));
        assertEquals("FORBIDDEN", ex.getErrorCode());
    }
}

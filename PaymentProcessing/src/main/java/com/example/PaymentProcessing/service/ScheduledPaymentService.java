package com.example.PaymentProcessing.service;

import com.example.PaymentProcessing.api.CreatePaymentRequest;
import com.example.PaymentProcessing.api.CreateScheduledPaymentRequest;
import com.example.PaymentProcessing.api.PaymentResponse;
import com.example.PaymentProcessing.api.ScheduledPaymentResponse;
import com.example.PaymentProcessing.api.UpdatePaymentStatusRequest;
import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.model.Account;
import com.example.PaymentProcessing.model.PaymentStatus;
import com.example.PaymentProcessing.model.ScheduledPayment;
import com.example.PaymentProcessing.model.ScheduledPaymentExecutionType;
import com.example.PaymentProcessing.model.ScheduledPaymentRecurrenceType;
import com.example.PaymentProcessing.model.ScheduledPaymentStatus;
import com.example.PaymentProcessing.model.NotificationType;
import com.example.PaymentProcessing.repository.AccountRepository;
import com.example.PaymentProcessing.repository.ScheduledPaymentRepository;
import com.example.PaymentProcessing.repository.CustomerRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScheduledPaymentService {

    private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();

    private final ScheduledPaymentRepository scheduledPaymentRepository;
    private final AccountRepository accountRepository;
    private final PaymentService paymentService;
    private final CustomerRepository customerRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;

    @Autowired
    public ScheduledPaymentService(
            ScheduledPaymentRepository scheduledPaymentRepository,
            AccountRepository accountRepository,
            PaymentService paymentService,
            CustomerRepository customerRepository,
            EmailService emailService) {
            EmailService emailService,
            NotificationService notificationService) {
        this.scheduledPaymentRepository = scheduledPaymentRepository;
        this.accountRepository = accountRepository;
        this.paymentService = paymentService;
        this.customerRepository = customerRepository;
        this.emailService = emailService;
        this.notificationService = notificationService;
    }

    // Backwards-compatible constructor used by existing tests and callers.
    public ScheduledPaymentService(
            ScheduledPaymentRepository scheduledPaymentRepository,
            AccountRepository accountRepository,
            PaymentService paymentService) {
        this(scheduledPaymentRepository, accountRepository, paymentService, null, null);
        this(scheduledPaymentRepository, accountRepository, paymentService, null, null, null);
    }

    @Transactional
    public ScheduledPaymentResponse createScheduledPayment(CreateScheduledPaymentRequest request) {
        validateCreateRequest(request);
        verifyTpin(request.getSourceAccountId(), request.getTpin());

        ScheduledPaymentExecutionType executionType = request.getExecutionType() == null
                ? ScheduledPaymentExecutionType.ONE_TIME
                : request.getExecutionType();

        ScheduledPayment scheduledPayment = new ScheduledPayment();
        scheduledPayment.setSourceAccountId(request.getSourceAccountId());
        scheduledPayment.setDestinationAccountId(request.getDestinationAccountId());
        scheduledPayment.setAmount(request.getAmount());
        scheduledPayment.setCurrency(request.getCurrency().toUpperCase());
        scheduledPayment.setRemarks(request.getRemarks());
        scheduledPayment.setReceiverBankName(request.getReceiverBankName());
        scheduledPayment.setReceiverIfsc(request.getReceiverIfsc());
        scheduledPayment.setScheduledAt(request.getScheduledAt());
        scheduledPayment.setExecutionType(executionType);
        scheduledPayment.setRecurrenceType(executionType == ScheduledPaymentExecutionType.RECURRING ? request.getRecurrenceType() : null);
        scheduledPayment.setRecurrenceIntervalDays(
                executionType == ScheduledPaymentExecutionType.RECURRING
                        && request.getRecurrenceType() == ScheduledPaymentRecurrenceType.CUSTOM_DAYS
                        ? request.getRecurrenceIntervalDays()
                        : null);
        scheduledPayment.setStatus(ScheduledPaymentStatus.PENDING);
        scheduledPayment.setReferenceNumber("SCH-" + UUID.randomUUID());

        ScheduledPayment saved = scheduledPaymentRepository.save(scheduledPayment);

        // Send scheduled notification to payer (async; failures are logged)
        try {
            var sourceAccount = accountRepository.findById(request.getSourceAccountId()).orElse(null);
            if (sourceAccount != null && sourceAccount.getCustomerId() != null) {
                var customer = customerRepository.findById(sourceAccount.getCustomerId()).orElse(null);
                if (customer != null) {
                    emailService.sendPaymentScheduledEmail(
                            customer.getEmail(),
                            customer.getFirstName(),
                            saved.getAmount() == null ? "" : saved.getAmount().toPlainString(),
                            saved.getScheduledAt() == null ? "" : saved.getScheduledAt().toString(),
                            saved.getReferenceNumber()
                    );
                    String amount = saved.getAmount() == null ? "" : saved.getAmount().toPlainString();
                    String scheduledAt = saved.getScheduledAt() == null ? "" : saved.getScheduledAt().toString();
                    emailService.sendPaymentScheduledEmail(
                            customer.getEmail(),
                            customer.getFirstName(),
                            amount,
                            scheduledAt,
                            saved.getReferenceNumber()
                    );
                    notificationService.create(sourceAccount.getCustomerId(), NotificationType.PAYMENT_SCHEDULED,
                            "Payment scheduled", "Rs. " + amount + " scheduled for " + scheduledAt
                                    + " (ref " + saved.getReferenceNumber() + ")");
                }
            }
        } catch (Exception ex) {
            // swallow; EmailService logs failures
        }

        return ScheduledPaymentResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<ScheduledPaymentResponse> listScheduledPayments() {
        return scheduledPaymentRepository.findAll().stream().map(ScheduledPaymentResponse::fromEntity).toList();
    }

    @Transactional
    public ScheduledPaymentResponse cancelScheduledPayment(Long scheduledPaymentId) {
        ScheduledPayment scheduledPayment = scheduledPaymentRepository.findById(scheduledPaymentId)
                .orElseThrow(() -> new ApiException("SCHEDULED_PAYMENT_NOT_FOUND", "Scheduled payment not found", HttpStatus.NOT_FOUND));

        if (scheduledPayment.getStatus() != ScheduledPaymentStatus.PENDING) {
            throw new ApiException(
                    "INVALID_STATUS",
                    "Only pending scheduled payments can be cancelled",
                    HttpStatus.CONFLICT);
        }

        scheduledPayment.setStatus(ScheduledPaymentStatus.CANCELLED);
        ScheduledPayment saved = scheduledPaymentRepository.save(scheduledPayment);
        return ScheduledPaymentResponse.fromEntity(saved);
    }

    @Scheduled(fixedDelay = 60000)

    public void processDuePayments() {


        LocalDateTime now = LocalDateTime.now();
        List<ScheduledPayment> duePayments = scheduledPaymentRepository
                .findByStatusAndScheduledAtLessThanEqual(ScheduledPaymentStatus.PENDING, now);

        for (ScheduledPayment scheduledPayment : duePayments) {
            Long paymentId = null;
            try {
                CreatePaymentRequest paymentRequest = new CreatePaymentRequest();
                paymentRequest.setSourceAccountId(scheduledPayment.getSourceAccountId());
                paymentRequest.setDestinationAccountId(scheduledPayment.getDestinationAccountId());
                paymentRequest.setAmount(scheduledPayment.getAmount());
                paymentRequest.setCurrency(scheduledPayment.getCurrency());
                paymentRequest.setReferenceNumber(scheduledPayment.getReferenceNumber());
                paymentRequest.setRemarks(scheduledPayment.getRemarks());

                PaymentResponse response = paymentService.createScheduledExecutionPayment(paymentRequest);
                if (response == null) {
                    throw new ApiException("PROCESSING_ERROR", "Payment service returned no response", HttpStatus.INTERNAL_SERVER_ERROR);
                }
                paymentId = response.getPaymentId();

                paymentService.updateStatus(paymentId, statusUpdate(PaymentStatus.VALIDATED, scheduledPayment.getRemarks()));
                paymentService.updateStatus(paymentId, statusUpdate(PaymentStatus.PROCESSING, scheduledPayment.getRemarks()));
                paymentService.updateStatus(paymentId, statusUpdate(PaymentStatus.COMPLETED, scheduledPayment.getRemarks()));

                scheduledPayment.setErrorCode(null);
                scheduledPayment.setErrorMessage(null);
                scheduledPayment.setLastRunAt(now);

                if (scheduledPayment.getExecutionType() == ScheduledPaymentExecutionType.RECURRING) {
                    // Recurring schedules stay PENDING and roll forward to their next
                    // occurrence instead of terminating, per the "runs until cancelled" model.
                    scheduledPayment.setScheduledAt(computeNextOccurrence(scheduledPayment));
                    scheduledPayment.setStatus(ScheduledPaymentStatus.PENDING);
                } else {
                    scheduledPayment.setStatus(ScheduledPaymentStatus.COMPLETED);
                }
            } catch (ApiException ex) {
                failScheduledPayment(paymentId, scheduledPayment, ex.getErrorCode(), ex.getMessage(), now);
            } catch (Exception ex) {
                failScheduledPayment(paymentId, scheduledPayment, "PROCESSING_ERROR", ex.getMessage(), now);
            } finally {
                scheduledPaymentRepository.save(scheduledPayment);
            }
        }
    }

    private void failScheduledPayment(Long paymentId, ScheduledPayment scheduledPayment, String errorCode, String errorMessage, LocalDateTime now) {
        scheduledPayment.setErrorCode(errorCode);
        scheduledPayment.setErrorMessage(errorMessage);
        scheduledPayment.setLastRunAt(now);

        if (scheduledPayment.getExecutionType() == ScheduledPaymentExecutionType.RECURRING) {
            // A single failed cycle (e.g. temporarily insufficient funds) doesn't kill the
            // whole standing instruction — it stays PENDING and retries on the next occurrence,
            // with the failure visible via errorCode/errorMessage until a cycle succeeds.
            scheduledPayment.setScheduledAt(computeNextOccurrence(scheduledPayment));
            scheduledPayment.setStatus(ScheduledPaymentStatus.PENDING);
        } else {
            scheduledPayment.setStatus(ScheduledPaymentStatus.FAILED);
        }

        if (paymentId != null) {
            try {
                UpdatePaymentStatusRequest failRequest = statusUpdate(PaymentStatus.FAILED, scheduledPayment.getRemarks());
                failRequest.setErrorCode(errorCode);
                failRequest.setErrorMessage(errorMessage);
                paymentService.updateStatus(paymentId, failRequest);
            } catch (Exception ignored) {
                // Underlying payment may already be in a terminal state; scheduled payment status still reflects the failure.
            }
        }
    }

    private UpdatePaymentStatusRequest statusUpdate(PaymentStatus status, String remarks) {
        UpdatePaymentStatusRequest request = new UpdatePaymentStatusRequest();
        request.setStatus(status);
        request.setRemarks(remarks);
        return request;
    }

    private void verifyTpin(Long sourceAccountId, String tpin) {
        Account sourceAccount = accountRepository.findById(sourceAccountId)
                .orElseThrow(() -> new ApiException("ACCOUNT_NOT_FOUND", "Source account not found", HttpStatus.NOT_FOUND));

        if (!PASSWORD_ENCODER.matches(tpin, sourceAccount.getTpinHash())) {
            throw new ApiException("INVALID_TPIN", "Incorrect TPIN", HttpStatus.UNAUTHORIZED);
        }
    }

    private void validateCreateRequest(CreateScheduledPaymentRequest request) {
        if (request == null
                || request.getSourceAccountId() == null
                || request.getDestinationAccountId() == null
                || request.getAmount() == null
                || request.getCurrency() == null
                || request.getCurrency().isBlank()
                || request.getScheduledAt() == null
                || request.getTpin() == null
                || request.getTpin().isBlank()) {
            throw new ApiException("VALIDATION_FAILED", "Required fields are missing", HttpStatus.BAD_REQUEST);
        }

        if (request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException("INVALID_AMOUNT", "amount must be greater than 0", HttpStatus.BAD_REQUEST);
        }

        if (request.getSourceAccountId().equals(request.getDestinationAccountId())) {
            throw new ApiException("VALIDATION_FAILED", "Source and destination accounts must be different", HttpStatus.BAD_REQUEST);
        }

        if (!request.getScheduledAt().isAfter(LocalDateTime.now())) {
            throw new ApiException("INVALID_SCHEDULE", "scheduledAt must be in the future", HttpStatus.BAD_REQUEST);
        }

        ScheduledPaymentExecutionType executionType = request.getExecutionType() == null
                ? ScheduledPaymentExecutionType.ONE_TIME
                : request.getExecutionType();

        if (executionType == ScheduledPaymentExecutionType.RECURRING) {
            if (request.getRecurrenceType() == null) {
                throw new ApiException("VALIDATION_FAILED", "recurrenceType is required for recurring schedules", HttpStatus.BAD_REQUEST);
            }
            if (request.getRecurrenceType() == ScheduledPaymentRecurrenceType.CUSTOM_DAYS
                    && (request.getRecurrenceIntervalDays() == null || request.getRecurrenceIntervalDays() < 1)) {
                throw new ApiException("VALIDATION_FAILED", "recurrenceIntervalDays must be at least 1 for a custom repeat interval", HttpStatus.BAD_REQUEST);
            }
        }
    }

    private LocalDateTime computeNextOccurrence(ScheduledPayment scheduledPayment) {
        LocalDateTime current = scheduledPayment.getScheduledAt();
        if (scheduledPayment.getRecurrenceType() == ScheduledPaymentRecurrenceType.CUSTOM_DAYS) {
            return current.plusDays(scheduledPayment.getRecurrenceIntervalDays());
        }
        // LocalDateTime#plusMonths clamps automatically when the source day-of-month
        // doesn't exist in the target month (e.g. Jan 31 -> Feb 28/29), so no manual
        // end-of-month handling is needed here.
        return current.plusMonths(1);
    }
}

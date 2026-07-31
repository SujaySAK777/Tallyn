package com.example.PaymentProcessing.service;

import com.example.PaymentProcessing.api.CreatePaymentRequest;
import com.example.PaymentProcessing.api.CreateScheduledPaymentRequest;
import com.example.PaymentProcessing.api.PaymentResponse;
import com.example.PaymentProcessing.api.ScheduledPaymentResponse;
import com.example.PaymentProcessing.api.UpdatePaymentStatusRequest;
import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.model.PaymentStatus;
import com.example.PaymentProcessing.model.ScheduledPayment;
import com.example.PaymentProcessing.model.ScheduledPaymentStatus;
import com.example.PaymentProcessing.repository.ScheduledPaymentRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScheduledPaymentService {

    private final ScheduledPaymentRepository scheduledPaymentRepository;
    private final PaymentService paymentService;

    public ScheduledPaymentService(ScheduledPaymentRepository scheduledPaymentRepository, PaymentService paymentService) {
        this.scheduledPaymentRepository = scheduledPaymentRepository;
        this.paymentService = paymentService;
    }

    @Transactional
    public ScheduledPaymentResponse createScheduledPayment(CreateScheduledPaymentRequest request) {
        validateCreateRequest(request);

        ScheduledPayment scheduledPayment = new ScheduledPayment();
        scheduledPayment.setSourceAccountId(request.getSourceAccountId());
        scheduledPayment.setDestinationAccountId(request.getDestinationAccountId());
        scheduledPayment.setAmount(request.getAmount());
        scheduledPayment.setCurrency(request.getCurrency().toUpperCase());
        scheduledPayment.setRemarks(request.getRemarks());
        scheduledPayment.setScheduledAt(request.getScheduledAt());
        scheduledPayment.setStatus(ScheduledPaymentStatus.PENDING);
        scheduledPayment.setReferenceNumber("SCH-" + UUID.randomUUID());

        ScheduledPayment saved = scheduledPaymentRepository.save(scheduledPayment);
        return ScheduledPaymentResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<ScheduledPaymentResponse> listScheduledPayments() {
        return scheduledPaymentRepository.findAll().stream().map(ScheduledPaymentResponse::fromEntity).toList();
    }

    @Scheduled(fixedDelay = 60000)
    @Transactional
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

                PaymentResponse response = paymentService.createPayment(paymentRequest);
                if (response == null) {
                    throw new ApiException("PROCESSING_ERROR", "Payment service returned no response", HttpStatus.INTERNAL_SERVER_ERROR);
                }
                paymentId = response.getPaymentId();

                paymentService.updateStatus(paymentId, statusUpdate(PaymentStatus.VALIDATED, scheduledPayment.getRemarks()));
                paymentService.updateStatus(paymentId, statusUpdate(PaymentStatus.PROCESSING, scheduledPayment.getRemarks()));
                paymentService.updateStatus(paymentId, statusUpdate(PaymentStatus.COMPLETED, scheduledPayment.getRemarks()));

                scheduledPayment.setStatus(ScheduledPaymentStatus.COMPLETED);
                scheduledPayment.setErrorCode(null);
                scheduledPayment.setErrorMessage(null);
            } catch (ApiException ex) {
                failScheduledPayment(paymentId, scheduledPayment, ex.getErrorCode(), ex.getMessage());
            } catch (Exception ex) {
                failScheduledPayment(paymentId, scheduledPayment, "PROCESSING_ERROR", ex.getMessage());
            } finally {
                scheduledPaymentRepository.save(scheduledPayment);
            }
        }
    }

    private void failScheduledPayment(Long paymentId, ScheduledPayment scheduledPayment, String errorCode, String errorMessage) {
        scheduledPayment.setStatus(ScheduledPaymentStatus.FAILED);
        scheduledPayment.setErrorCode(errorCode);
        scheduledPayment.setErrorMessage(errorMessage);

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

    private void validateCreateRequest(CreateScheduledPaymentRequest request) {
        if (request == null
                || request.getSourceAccountId() == null
                || request.getDestinationAccountId() == null
                || request.getAmount() == null
                || request.getCurrency() == null
                || request.getCurrency().isBlank()
                || request.getScheduledAt() == null) {
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
    }
}

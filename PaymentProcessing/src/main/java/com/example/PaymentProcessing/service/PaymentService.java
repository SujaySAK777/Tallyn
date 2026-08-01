package com.example.PaymentProcessing.service;

import com.example.PaymentProcessing.api.CreatePaymentRequest;
import com.example.PaymentProcessing.api.PaymentHistoryResponse;
import com.example.PaymentProcessing.api.PaymentReceiptResponse;
import com.example.PaymentProcessing.api.PaymentResponse;
import com.example.PaymentProcessing.api.UpdatePaymentStatusRequest;
import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.model.Account;
import com.example.PaymentProcessing.model.AccountStatus;
import com.example.PaymentProcessing.model.Payment;
import com.example.PaymentProcessing.model.PaymentHistory;
import com.example.PaymentProcessing.model.PaymentStatus;
import com.example.PaymentProcessing.repository.AccountRepository;
import com.example.PaymentProcessing.repository.PaymentHistoryRepository;
import com.example.PaymentProcessing.repository.PaymentRepository;
import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {

    private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();
    private static final Map<PaymentStatus, Set<PaymentStatus>> VALID_TRANSITIONS = buildTransitions();

    private final AccountRepository accountRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentHistoryRepository paymentHistoryRepository;

    public PaymentService(
            AccountRepository accountRepository,
            PaymentRepository paymentRepository,
            PaymentHistoryRepository paymentHistoryRepository
    ) {
        this.accountRepository = accountRepository;
        this.paymentRepository = paymentRepository;
        this.paymentHistoryRepository = paymentHistoryRepository;
    }

    @Transactional
    public PaymentResponse createPayment(CreatePaymentRequest request) {
        validateCreateRequest(request);

        paymentRepository.findByReferenceNumber(request.getReferenceNumber())
                .ifPresent(existing -> {
                    throw new ApiException("DUPLICATE_PAYMENT", "referenceNumber already exists", HttpStatus.CONFLICT);
                });

        Account source = accountRepository.findById(request.getSourceAccountId())
                .orElseThrow(() -> new ApiException("INVALID_ACCOUNT", "Source account not found", HttpStatus.BAD_REQUEST));
        Account destination = accountRepository.findById(request.getDestinationAccountId())
                .orElseThrow(() -> new ApiException("INVALID_ACCOUNT", "Destination account not found", HttpStatus.BAD_REQUEST));

        if (source.getAccountId().equals(destination.getAccountId())) {
            throw new ApiException("VALIDATION_FAILED", "Source and destination accounts must be different", HttpStatus.BAD_REQUEST);
        }

        if (source.getStatus() != AccountStatus.ACTIVE || destination.getStatus() != AccountStatus.ACTIVE) {
            throw new ApiException("INVALID_ACCOUNT", "Both accounts must be ACTIVE", HttpStatus.BAD_REQUEST);
        }

        // Verify TPIN against the source account
        String tpin = request.getTpin();
        if (tpin == null || tpin.isBlank()) {
            throw new ApiException("TPIN_REQUIRED", "TPIN is required to authorize the payment", HttpStatus.BAD_REQUEST);
        }
        if (!PASSWORD_ENCODER.matches(tpin, source.getTpinHash())) {
            throw new ApiException("INVALID_TPIN", "Invalid TPIN", HttpStatus.UNAUTHORIZED);
        }

        String currency = request.getCurrency().toUpperCase();
        if (!source.getCurrency().equalsIgnoreCase(currency)
                || !destination.getCurrency().equalsIgnoreCase(currency)) {
            throw new ApiException("INVALID_CURRENCY", "Currency must match account currencies", HttpStatus.BAD_REQUEST);
        }

        Payment payment = new Payment();
        payment.setSourceAccount(source);
        payment.setDestinationAccount(destination);
        payment.setAmount(request.getAmount());
        payment.setCurrency(currency);
        payment.setStatus(PaymentStatus.CREATED);
        payment.setReferenceNumber(request.getReferenceNumber());
        payment.setRemarks(request.getRemarks());

        Payment saved = paymentRepository.save(payment);
        saveHistory(saved, null, PaymentStatus.CREATED, request.getRemarks());
        return PaymentResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPayment(Long paymentId) {
        return PaymentResponse.fromEntity(findPayment(paymentId));
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> listPayments(PaymentStatus status, Long customerId) {
        List<Payment> items;
        if (customerId != null) {
            List<Long> accountIds = accountRepository.findAccountIdsByCustomerId(customerId);
            if (accountIds.isEmpty()) return List.of();
            items = paymentRepository.findByAccountIds(accountIds);
            if (status != null) {
                final PaymentStatus s = status;
                items = items.stream().filter(p -> p.getStatus() == s).toList();
            }
        } else {
            items = status == null ? paymentRepository.findAll() : paymentRepository.findByStatus(status);
        }
        return items.stream().map(PaymentResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public List<PaymentHistoryResponse> getPaymentHistory(Long paymentId) {
        findPayment(paymentId);
        return paymentHistoryRepository.findByPaymentPaymentIdOrderByChangedAtAsc(paymentId)
                .stream()
                .map(PaymentHistoryResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public PaymentReceiptResponse getPaymentReceipt(Long paymentId) {
        Payment payment = findPayment(paymentId);
        return PaymentReceiptResponse.fromEntity(payment);
    }

    @Transactional
    public PaymentResponse updateStatus(Long paymentId, UpdatePaymentStatusRequest request) {
        if (request == null || request.getStatus() == null) {
            throw new ApiException("VALIDATION_FAILED", "status is required", HttpStatus.BAD_REQUEST);
        }

        Payment payment = findPayment(paymentId);
        PaymentStatus current = payment.getStatus();
        PaymentStatus next = request.getStatus();

        if (current == next) {
            return PaymentResponse.fromEntity(payment);
        }

        if (!VALID_TRANSITIONS.getOrDefault(current, Set.of()).contains(next)) {
            throw new ApiException(
                    "INVALID_STATUS_TRANSITION",
                    "Cannot transition from " + current + " to " + next,
                    HttpStatus.BAD_REQUEST
            );
        }

        if (next == PaymentStatus.VALIDATED) {
            if (payment.getSourceAccount().getBalance().compareTo(payment.getAmount()) < 0) {
                throw new ApiException("INSUFFICIENT_FUNDS", "Insufficient source balance", HttpStatus.BAD_REQUEST);
            }
        }

        if (next == PaymentStatus.COMPLETED) {
            settleBalances(payment);
            payment.setErrorCode(null);
            payment.setErrorMessage(null);
        }

        if (next == PaymentStatus.FAILED) {
            if (request.getErrorCode() == null || request.getErrorCode().isBlank()) {
                throw new ApiException("VALIDATION_FAILED", "errorCode is required for FAILED status", HttpStatus.BAD_REQUEST);
            }
            payment.setErrorCode(request.getErrorCode());
            payment.setErrorMessage(request.getErrorMessage());
        } else {
            payment.setErrorCode(null);
            payment.setErrorMessage(null);
        }

        payment.setStatus(next);
        payment.setRemarks(request.getRemarks());

        Payment saved = paymentRepository.save(payment);
        saveHistory(saved, current, next, request.getRemarks());
        return PaymentResponse.fromEntity(saved);
    }

    private Payment findPayment(Long paymentId) {
        return paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ApiException("PAYMENT_NOT_FOUND", "Payment not found", HttpStatus.NOT_FOUND));
    }

    private void validateCreateRequest(CreatePaymentRequest request) {
        if (request == null
                || request.getSourceAccountId() == null
                || request.getDestinationAccountId() == null
                || request.getAmount() == null
                || request.getCurrency() == null
                || request.getReferenceNumber() == null
                || request.getReferenceNumber().isBlank()) {
            throw new ApiException("VALIDATION_FAILED", "Required fields are missing", HttpStatus.BAD_REQUEST);
        }

        if (request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException("INVALID_AMOUNT", "amount must be greater than 0", HttpStatus.BAD_REQUEST);
        }
    }

    private void settleBalances(Payment payment) {
        Account source = payment.getSourceAccount();
        Account destination = payment.getDestinationAccount();
        BigDecimal amount = payment.getAmount();

        if (source.getBalance().compareTo(amount) < 0) {
            throw new ApiException("INSUFFICIENT_FUNDS", "Insufficient source balance", HttpStatus.BAD_REQUEST);
        }

        source.setBalance(source.getBalance().subtract(amount));
        destination.setBalance(destination.getBalance().add(amount));
        accountRepository.save(source);
        accountRepository.save(destination);
    }

    private void saveHistory(Payment payment, PaymentStatus previous, PaymentStatus current, String remarks) {
        PaymentHistory history = new PaymentHistory();
        history.setPayment(payment);
        history.setPreviousStatus(previous);
        history.setCurrentStatus(current);
        history.setRemarks(remarks);
        paymentHistoryRepository.save(history);
    }

    private static Map<PaymentStatus, Set<PaymentStatus>> buildTransitions() {
        Map<PaymentStatus, Set<PaymentStatus>> transitions = new EnumMap<>(PaymentStatus.class);
        transitions.put(PaymentStatus.CREATED, EnumSet.of(PaymentStatus.VALIDATED, PaymentStatus.FAILED));
        transitions.put(PaymentStatus.VALIDATED, EnumSet.of(PaymentStatus.PROCESSING, PaymentStatus.FAILED));
        transitions.put(PaymentStatus.PROCESSING, EnumSet.of(PaymentStatus.COMPLETED, PaymentStatus.FAILED));
        transitions.put(PaymentStatus.COMPLETED, EnumSet.noneOf(PaymentStatus.class));
        transitions.put(PaymentStatus.FAILED, EnumSet.noneOf(PaymentStatus.class));
        return transitions;
    }
}

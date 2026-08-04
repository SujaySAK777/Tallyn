package com.example.PaymentProcessing.service;

import com.example.PaymentProcessing.api.CreatePaymentRequest;
import com.example.PaymentProcessing.api.PaymentHistoryResponse;
import com.example.PaymentProcessing.api.PaymentReceiptResponse;
import com.example.PaymentProcessing.api.PaymentResponse;
import com.example.PaymentProcessing.api.PaymentSearchResponse;
import com.example.PaymentProcessing.api.PaymentSummaryResponse;
import com.example.PaymentProcessing.api.UpdatePaymentStatusRequest;
import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.model.Account;
import com.example.PaymentProcessing.model.AccountStatus;
import com.example.PaymentProcessing.model.Payment;
import com.example.PaymentProcessing.model.PaymentCategory;
import com.example.PaymentProcessing.model.PaymentHistory;
import com.example.PaymentProcessing.model.PaymentStatus;
import com.example.PaymentProcessing.repository.AccountRepository;
import com.example.PaymentProcessing.repository.PaymentHistoryRepository;
import com.example.PaymentProcessing.repository.PaymentRepository;
import com.example.PaymentProcessing.repository.PaymentSpecifications;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Stream;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {

    private static final Map<PaymentStatus, Set<PaymentStatus>> VALID_TRANSITIONS = buildTransitions();

    private final AccountRepository accountRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentHistoryRepository paymentHistoryRepository;
    private final EntityManager entityManager;

    public PaymentService(
            AccountRepository accountRepository,
            PaymentRepository paymentRepository,
            PaymentHistoryRepository paymentHistoryRepository,
            EntityManager entityManager
    ) {
        this.accountRepository = accountRepository;
        this.paymentRepository = paymentRepository;
        this.paymentHistoryRepository = paymentHistoryRepository;
        this.entityManager = entityManager;
    }

    private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();

    @Transactional
    public PaymentResponse createPayment(CreatePaymentRequest request) {
        // Kept for the existing test suite / any trusted internal caller.
        // The real HTTP-facing path is createPayment(request, customerId)
        // below, which enforces that the caller owns the source account.
        return createPayment(request, true, null);
    }

    @Transactional
    public PaymentResponse createPayment(CreatePaymentRequest request, Long authenticatedCustomerId) {
        return createPayment(request, true, authenticatedCustomerId);
    }

    // Used only by ScheduledPaymentService, whose TPIN was already verified
    // when the standing instruction was originally created.
    @Transactional
    public PaymentResponse createScheduledExecutionPayment(CreatePaymentRequest request) {
        return createPayment(request, false, null);
    }

    private PaymentResponse createPayment(CreatePaymentRequest request, boolean requireTpin, Long authenticatedCustomerId) {
        validateCreateRequest(request, requireTpin);

        paymentRepository.findByReferenceNumber(request.getReferenceNumber())
                .ifPresent(existing -> {
                    throw new ApiException("DUPLICATE_PAYMENT", "referenceNumber already exists", HttpStatus.CONFLICT);
                });

        Account source = accountRepository.findById(request.getSourceAccountId())
                .orElseThrow(() -> new ApiException("INVALID_ACCOUNT", "Source account not found", HttpStatus.BAD_REQUEST));
        Account destination = accountRepository.findById(request.getDestinationAccountId())
                .orElseThrow(() -> new ApiException("INVALID_ACCOUNT", "Destination account not found", HttpStatus.BAD_REQUEST));

        if (authenticatedCustomerId != null
                && (source.getCustomerId() == null || !source.getCustomerId().equals(authenticatedCustomerId))) {
            throw new ApiException("ACCOUNT_NOT_OWNED", "You can only pay from an account you own", HttpStatus.FORBIDDEN);
        }

        if (requireTpin) {
            verifyTpin(source, request.getTpin());
        }

        if (source.getAccountId().equals(destination.getAccountId())) {
            throw new ApiException("VALIDATION_FAILED", "Source and destination accounts must be different", HttpStatus.BAD_REQUEST);
        }

        if (source.getStatus() != AccountStatus.ACTIVE || destination.getStatus() != AccountStatus.ACTIVE) {
            throw new ApiException("INVALID_ACCOUNT", "Both accounts must be ACTIVE", HttpStatus.BAD_REQUEST);
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
        // set category from request if provided, otherwise default to OTHERS
        if (request.getCategory() != null) {
            try {
                payment.setCategory(PaymentCategory.valueOf(request.getCategory()));
            } catch (IllegalArgumentException ex) {
                payment.setCategory(PaymentCategory.OTHERS);
            }
        } else {
            payment.setCategory(PaymentCategory.OTHERS);
        }

        Payment saved = paymentRepository.save(payment);
        saveHistory(saved, null, PaymentStatus.CREATED, request.getRemarks());
        return PaymentResponse.fromEntity(saved);
    }

    private void verifyTpin(Account source, String tpin) {
        if (tpin == null || tpin.isBlank() || !PASSWORD_ENCODER.matches(tpin, source.getTpinHash())) {
            throw new ApiException("INVALID_TPIN", "Incorrect TPIN", HttpStatus.UNAUTHORIZED);
        }
    }


    @Transactional(readOnly = true)
    public PaymentResponse getPayment(Long paymentId) {
        return PaymentResponse.fromEntity(findPayment(paymentId));
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> listPayments(PaymentStatus status, Long customerId) {
        List<Payment> items;
        if (customerId != null) {
            items = paymentRepository.findBySourceAccount_CustomerIdOrDestinationAccount_CustomerId(customerId, customerId);
            if (status != null) {
                items = items.stream().filter(p -> p.getStatus() == status).toList();
            }
        } else {
            items = status == null ? paymentRepository.findAll() : paymentRepository.findByStatus(status);
        }
        return items.stream().map(PaymentResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public PaymentSearchResponse searchPayments(
            List<PaymentStatus> statuses,
            LocalDate fromDate,
            LocalDate toDate,
            BigDecimal minAmount,
            BigDecimal maxAmount,
            Long senderAccountId,
            String search,
            String sortDateDir,
            String sortAmountDir,
            String sortPrimary,
            int page,
            int size
    ) {
        Specification<Payment> baseSpec = buildBaseSpec(fromDate, toDate, minAmount, maxAmount, senderAccountId, search);
        Specification<Payment> spec = withStatus(baseSpec, statuses);

        Pageable pageable = PageRequest.of(page, size, buildSort(sortDateDir, sortAmountDir, sortPrimary));

        Page<PaymentResponse> result = paymentRepository.findAll(spec, pageable)
                .map(PaymentResponse::fromEntity);
        return PaymentSearchResponse.fromPage(result);
    }

    private Sort buildSort(String sortDateDir, String sortAmountDir, String sortPrimary) {
        List<Sort.Order> orders = new ArrayList<>();
        Sort.Order dateOrder = sortDateDir != null ? new Sort.Order(direction(sortDateDir), "createdAt") : null;
        Sort.Order amountOrder = sortAmountDir != null ? new Sort.Order(direction(sortAmountDir), "amount") : null;

        if ("amount".equalsIgnoreCase(sortPrimary)) {
            if (amountOrder != null) orders.add(amountOrder);
            if (dateOrder != null) orders.add(dateOrder);
        } else {
            if (dateOrder != null) orders.add(dateOrder);
            if (amountOrder != null) orders.add(amountOrder);
        }

        if (orders.isEmpty()) {
            orders.add(new Sort.Order(Sort.Direction.DESC, "createdAt"));
        }
        return Sort.by(orders);
    }

    private Sort.Direction direction(String dir) {
        return "asc".equalsIgnoreCase(dir) ? Sort.Direction.ASC : Sort.Direction.DESC;
    }

    @Transactional(readOnly = true)
    public PaymentSummaryResponse getSummary(
            LocalDate fromDate,
            LocalDate toDate,
            BigDecimal minAmount,
            BigDecimal maxAmount,
            Long senderAccountId,
            String search
    ) {
        Specification<Payment> baseSpec = buildBaseSpec(fromDate, toDate, minAmount, maxAmount, senderAccountId, search);
        Specification<Payment> completedSpec = withStatus(baseSpec, List.of(PaymentStatus.COMPLETED));
        Specification<Payment> failedSpec = withStatus(baseSpec, List.of(PaymentStatus.FAILED));
        Specification<Payment> pendingSpec = withStatus(baseSpec,
                List.of(PaymentStatus.CREATED, PaymentStatus.VALIDATED, PaymentStatus.PROCESSING));

        long total = paymentRepository.count(baseSpec);
        long completed = paymentRepository.count(completedSpec);
        long failed = paymentRepository.count(failedSpec);
        long pending = paymentRepository.count(pendingSpec);

        return new PaymentSummaryResponse(
                total, completed, failed, pending,
                sumAmount(baseSpec), sumAmount(completedSpec), sumAmount(failedSpec), sumAmount(pendingSpec)
        );
    }

    private BigDecimal sumAmount(Specification<Payment> spec) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<BigDecimal> query = cb.createQuery(BigDecimal.class);
        Root<Payment> root = query.from(Payment.class);
        query.select(cb.sum(root.get("amount")));
        Predicate predicate = spec == null ? null : spec.toPredicate(root, query, cb);
        if (predicate != null) {
            query.where(predicate);
        }
        BigDecimal result = entityManager.createQuery(query).getSingleResult();
        return result == null ? BigDecimal.ZERO : result;
    }

    private Specification<Payment> withStatus(Specification<Payment> baseSpec, List<PaymentStatus> statuses) {
        Specification<Payment> statusSpec = PaymentSpecifications.statusIn(statuses);
        return statusSpec == null ? baseSpec : baseSpec.and(statusSpec);
    }

    private Specification<Payment> buildBaseSpec(
            LocalDate fromDate,
            LocalDate toDate,
            BigDecimal minAmount,
            BigDecimal maxAmount,
            Long senderAccountId,
            String search
    ) {
        LocalDateTime from = fromDate == null ? null : fromDate.atStartOfDay();
        LocalDateTime to = toDate == null ? null : LocalDateTime.of(toDate, LocalTime.MAX);

        List<Specification<Payment>> specs = Stream.of(
                PaymentSpecifications.createdBetween(from, to),
                PaymentSpecifications.amountBetween(minAmount, maxAmount),
                PaymentSpecifications.hasSourceAccount(senderAccountId),
                PaymentSpecifications.matchesSearch(search)
        ).filter(Objects::nonNull).toList();

        return Specification.allOf(specs);
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

    private void validateCreateRequest(CreatePaymentRequest request, boolean requireTpin) {
        if (request == null
                || request.getSourceAccountId() == null
                || request.getDestinationAccountId() == null
                || request.getAmount() == null
                || request.getCurrency() == null
                || request.getReferenceNumber() == null
                || request.getReferenceNumber().isBlank()
                || (requireTpin && (request.getTpin() == null || request.getTpin().isBlank()))) {
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

package com.example.PaymentProcessing.repository;

import com.example.PaymentProcessing.model.Payment;
import com.example.PaymentProcessing.model.PaymentStatus;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

public final class PaymentSpecifications {

    private PaymentSpecifications() {
    }

    public static Specification<Payment> statusIn(List<PaymentStatus> statuses) {
        if (statuses == null || statuses.isEmpty()) {
            return null;
        }
        return (root, query, cb) -> root.get("status").in(statuses);
    }

    public static Specification<Payment> createdBetween(LocalDateTime from, LocalDateTime to) {
        if (from == null && to == null) {
            return null;
        }
        if (from == null) {
            return (root, query, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), to);
        }
        if (to == null) {
            return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), from);
        }
        return (root, query, cb) -> cb.between(root.get("createdAt"), from, to);
    }

    public static Specification<Payment> amountBetween(BigDecimal min, BigDecimal max) {
        if (min == null && max == null) {
            return null;
        }
        if (min == null) {
            return (root, query, cb) -> cb.lessThanOrEqualTo(root.get("amount"), max);
        }
        if (max == null) {
            return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("amount"), min);
        }
        return (root, query, cb) -> cb.between(root.get("amount"), min, max);
    }

    public static Specification<Payment> hasSourceAccount(Long accountId) {
        if (accountId == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("sourceAccount").get("accountId"), accountId);
    }

    public static Specification<Payment> matchesSearch(String search) {
        if (search == null || search.isBlank()) {
            return null;
        }
        String pattern = "%" + search.trim().toLowerCase() + "%";
        return (root, query, cb) -> {
            Predicate predicate = cb.or(
                    cb.like(cb.lower(root.get("referenceNumber")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("remarks"), "")), pattern),
                    cb.like(cb.lower(root.get("destinationAccount").get("accountHolderName")), pattern)
            );
            try {
                Long paymentId = Long.parseLong(search.trim());
                predicate = cb.or(predicate, cb.equal(root.get("paymentId"), paymentId));
            } catch (NumberFormatException ignored) {
                // search text is not a payment id, skip the exact-match clause
            }
            try {
                BigDecimal amount = new BigDecimal(search.trim());
                predicate = cb.or(predicate, cb.equal(root.get("amount"), amount));
            } catch (NumberFormatException ignored) {
                // search text is not an amount, skip the exact-match clause
            }
            return predicate;
        };
    }
}

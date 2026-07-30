package com.example.PaymentProcessing.repository;

import com.example.PaymentProcessing.model.PaymentHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentHistoryRepository extends JpaRepository<PaymentHistory, Long> {
    List<PaymentHistory> findByPaymentPaymentIdOrderByChangedAtAsc(Long paymentId);
}

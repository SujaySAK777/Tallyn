package com.example.PaymentProcessing.repository;

import com.example.PaymentProcessing.model.ScheduledPayment;
import com.example.PaymentProcessing.model.ScheduledPaymentStatus;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduledPaymentRepository extends JpaRepository<ScheduledPayment, Long> {
    List<ScheduledPayment> findByStatusAndScheduledAtLessThanEqual(ScheduledPaymentStatus status, LocalDateTime scheduledAt);
}

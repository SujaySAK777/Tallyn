package com.example.PaymentProcessing.repository;

import com.example.PaymentProcessing.model.Payment;
import com.example.PaymentProcessing.model.PaymentStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface PaymentRepository extends JpaRepository<Payment, Long>, JpaSpecificationExecutor<Payment> {
    Optional<Payment> findByReferenceNumber(String referenceNumber);

    List<Payment> findByStatus(PaymentStatus status);
}

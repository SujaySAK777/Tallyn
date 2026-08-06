package com.example.PaymentProcessing.repository;

import com.example.PaymentProcessing.model.Payment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface PaymentRepository extends JpaRepository<Payment, Long>, JpaSpecificationExecutor<Payment> {
    boolean existsByReferenceNumber(String referenceNumber);

    List<Payment> findBySourceAccount_CustomerIdOrDestinationAccount_CustomerId(Long sourceCustomerId, Long destinationCustomerId);
}

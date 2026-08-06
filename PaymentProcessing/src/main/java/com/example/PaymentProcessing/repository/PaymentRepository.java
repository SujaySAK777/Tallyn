package com.example.PaymentProcessing.repository;

import com.example.PaymentProcessing.model.Payment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface PaymentRepository extends JpaRepository<Payment, Long>, JpaSpecificationExecutor<Payment> {
    boolean existsByReferenceNumber(String referenceNumber);

<<<<<<< Updated upstream
    Optional<Payment> findByReferenceNumber(String referenceNumber);

    List<Payment> findByStatus(PaymentStatus status);

=======
>>>>>>> Stashed changes
    List<Payment> findBySourceAccount_CustomerIdOrDestinationAccount_CustomerId(Long sourceCustomerId, Long destinationCustomerId);
}

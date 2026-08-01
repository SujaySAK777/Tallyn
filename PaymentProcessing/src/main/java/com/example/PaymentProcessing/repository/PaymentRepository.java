package com.example.PaymentProcessing.repository;

import com.example.PaymentProcessing.model.Payment;
import com.example.PaymentProcessing.model.PaymentStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByReferenceNumber(String referenceNumber);

    List<Payment> findByStatus(PaymentStatus status);

    @Query("SELECT p FROM Payment p WHERE p.sourceAccount.accountId IN :accountIds OR p.destinationAccount.accountId IN :accountIds")
    List<Payment> findByAccountIds(@Param("accountIds") List<Long> accountIds);
}

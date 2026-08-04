package com.example.PaymentProcessing.repository;

import com.example.PaymentProcessing.model.Beneficiary;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BeneficiaryRepository extends JpaRepository<Beneficiary, Long> {
    List<Beneficiary> findByCustomerIdOrderByAccountHolderNameAsc(Long customerId);
    Optional<Beneficiary> findByCustomerIdAndAccountNumber(Long customerId, String accountNumber);
    boolean existsByCustomerIdAndAccountNumber(Long customerId, String accountNumber);
}

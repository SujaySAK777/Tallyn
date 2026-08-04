package com.example.PaymentProcessing.repository;

import com.example.PaymentProcessing.model.Account;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountRepository extends JpaRepository<Account, Long> {
    Optional<Account> findByAccountNumber(String accountNumber);
    Optional<Account> findFirstByCustomerId(Long customerId);
    java.util.List<Account> findByCustomerId(Long customerId);
    Optional<Account> findByMobileNumber(String mobileNumber);
}

package com.example.PaymentProcessing.repository;

import com.example.PaymentProcessing.model.Account;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AccountRepository extends JpaRepository<Account, Long> {
    Optional<Account> findByAccountNumber(String accountNumber);
    Optional<Account> findFirstByCustomerId(Long customerId);

    @Query("SELECT a.accountId FROM Account a WHERE a.customerId = :customerId")
    List<Long> findAccountIdsByCustomerId(@Param("customerId") Long customerId);
}

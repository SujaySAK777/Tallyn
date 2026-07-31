package com.example.PaymentProcessing.repository;

import com.example.PaymentProcessing.model.Account;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountRepository extends JpaRepository<Account, Long> {
}

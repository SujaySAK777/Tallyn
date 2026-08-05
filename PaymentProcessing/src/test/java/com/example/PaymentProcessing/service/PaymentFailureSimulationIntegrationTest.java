package com.example.PaymentProcessing.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.example.PaymentProcessing.api.PaymentResponse;
import com.example.PaymentProcessing.model.Account;
import com.example.PaymentProcessing.model.AccountStatus;
import com.example.PaymentProcessing.model.Payment;
import com.example.PaymentProcessing.model.PaymentStatus;
import com.example.PaymentProcessing.repository.AccountRepository;
import com.example.PaymentProcessing.repository.PaymentRepository;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Full Spring context, real MySQL, real transaction manager — this is what
 * actually proves the rollback claim: a Mockito unit test can only verify
 * which methods were called, it can't prove a debit was undone at the DB
 * level. These tests create real Account/Payment rows, call the real
 * PaymentService.simulateProcessingPayment(...), and re-read the balances
 * from the database afterward. Deliberately NOT annotated @Transactional at
 * the test/class level: that would wrap the test in one outer transaction
 * and defeat the point of proving independent commit/rollback boundaries
 * inside the service. Each test cleans up its own rows in @AfterEach instead.
 */
@SpringBootTest
class PaymentFailureSimulationIntegrationTest {

    private static final BCryptPasswordEncoder ENCODER = new BCryptPasswordEncoder();

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    private Account source;
    private Account destination;
    private Payment payment;

    private Account createAccount(BigDecimal balance) {
        Account account = new Account();
        account.setBankName("HDFC BANK");
        account.setAccountNumber("SIM" + UUID.randomUUID().toString().replace("-", "").substring(0, 9).toUpperCase());
        account.setAccountHolderName("Simulation Test");
        account.setBalance(balance);
        account.setTpinHash(ENCODER.encode("123456"));
        account.setCurrency("INR");
        account.setStatus(AccountStatus.ACTIVE);
        return accountRepository.save(account);
    }

    private Payment createProcessingPayment(Account src, Account dst, BigDecimal amount) {
        Payment p = new Payment();
        p.setSourceAccount(src);
        p.setDestinationAccount(dst);
        p.setAmount(amount);
        p.setCurrency("INR");
        p.setStatus(PaymentStatus.PROCESSING);
        p.setReferenceNumber("SIM-" + UUID.randomUUID());
        return paymentRepository.save(p);
    }

    @AfterEach
    void cleanUp() {
        if (payment != null) {
            paymentRepository.findById(payment.getPaymentId()).ifPresent(paymentRepository::delete);
        }
        if (source != null) {
            accountRepository.findById(source.getAccountId()).ifPresent(accountRepository::delete);
        }
        if (destination != null) {
            accountRepository.findById(destination.getAccountId()).ifPresent(accountRepository::delete);
        }
    }

    /** Test 1: SUCCESS — sender debited, receiver credited, payment COMPLETED. */
    @Test
    void shouldCompletePaymentSuccessfullyWhenFailureModeIsSuccess() {
        source = createAccount(new BigDecimal("1000.00"));
        destination = createAccount(new BigDecimal("200.00"));
        payment = createProcessingPayment(source, destination, new BigDecimal("100.00"));

        PaymentResponse response = paymentService.simulateProcessingPayment(payment.getPaymentId(), "SUCCESS");

        assertEquals(PaymentStatus.COMPLETED, response.getStatus());

        Account reloadedSource = accountRepository.findById(source.getAccountId()).orElseThrow();
        Account reloadedDestination = accountRepository.findById(destination.getAccountId()).orElseThrow();
        assertEquals(0, new BigDecimal("900.00").compareTo(reloadedSource.getBalance()));
        assertEquals(0, new BigDecimal("300.00").compareTo(reloadedDestination.getBalance()));
    }

    /** Test 2: DB_FAILURE — debit executes then rolls back; receiver never touched; payment FAILED. */
    @Test
    void shouldRollBackSenderDebitOnSimulatedDatabaseFailure() {
        source = createAccount(new BigDecimal("1000.00"));
        destination = createAccount(new BigDecimal("200.00"));
        payment = createProcessingPayment(source, destination, new BigDecimal("100.00"));

        PaymentResponse response = paymentService.simulateProcessingPayment(payment.getPaymentId(), "DB_FAILURE");

        assertEquals(PaymentStatus.FAILED, response.getStatus());
        assertEquals("DB_FAILURE", response.getErrorCode());

        Account reloadedSource = accountRepository.findById(source.getAccountId()).orElseThrow();
        Account reloadedDestination = accountRepository.findById(destination.getAccountId()).orElseThrow();
        // The debit was flushed to the DB inside the failing transaction, then rolled back —
        // sender balance is exactly what it was before the attempt.
        assertEquals(0, new BigDecimal("1000.00").compareTo(reloadedSource.getBalance()));
        // Receiver was never credited.
        assertEquals(0, new BigDecimal("200.00").compareTo(reloadedDestination.getBalance()));
    }

    /** Test 3: TIMEOUT_FAILURE — same rollback guarantee, distinct errorCode. */
    @Test
    void shouldRollBackSenderDebitOnSimulatedTimeout() {
        source = createAccount(new BigDecimal("500.00"));
        destination = createAccount(new BigDecimal("50.00"));
        payment = createProcessingPayment(source, destination, new BigDecimal("75.00"));

        PaymentResponse response = paymentService.simulateProcessingPayment(payment.getPaymentId(), "TIMEOUT_FAILURE");

        assertEquals(PaymentStatus.FAILED, response.getStatus());
        assertEquals("TIMEOUT_FAILURE", response.getErrorCode());

        Account reloadedSource = accountRepository.findById(source.getAccountId()).orElseThrow();
        Account reloadedDestination = accountRepository.findById(destination.getAccountId()).orElseThrow();
        assertEquals(0, new BigDecimal("500.00").compareTo(reloadedSource.getBalance()));
        assertEquals(0, new BigDecimal("50.00").compareTo(reloadedDestination.getBalance()));
    }
}

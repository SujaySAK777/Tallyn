package com.example.PaymentProcessing.service;

import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.exception.SimulatedProcessingFailureException;
import com.example.PaymentProcessing.model.Account;
import com.example.PaymentProcessing.model.Payment;
import com.example.PaymentProcessing.model.PaymentStatus;
import com.example.PaymentProcessing.repository.AccountRepository;
import com.example.PaymentProcessing.repository.PaymentRepository;
import java.math.BigDecimal;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Demo-only failure injection for PaymentService.simulateProcessingPayment.
 * Kept as its own bean (not a private method on PaymentService) so its
 * @Transactional actually goes through the Spring proxy: PaymentService
 * calling a method on itself would bypass @Transactional entirely.
 */
@Service
public class PaymentSimulationService {

    private final PaymentRepository paymentRepository;
    private final AccountRepository accountRepository;

    public PaymentSimulationService(PaymentRepository paymentRepository, AccountRepository accountRepository) {
        this.paymentRepository = paymentRepository;
        this.accountRepository = accountRepository;
    }

    /**
     * Debits the sender for a PROCESSING payment, then always throws for
     * DB_FAILURE/TIMEOUT_FAILURE modes — after the debit, before any credit.
     * Because this method is @Transactional, the thrown exception rolls the
     * whole thing back, including the debit that was just saved.
     */
    @Transactional
    public void debitThenSimulateFailure(Long paymentId, String failureMode) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ApiException("PAYMENT_NOT_FOUND", "Payment not found", HttpStatus.NOT_FOUND));

        if (payment.getStatus() != PaymentStatus.PROCESSING) {
            throw new ApiException(
                    "INVALID_STATUS_TRANSITION",
                    "Payment must be in PROCESSING status to simulate completion, was " + payment.getStatus(),
                    HttpStatus.BAD_REQUEST
            );
        }

        Account source = payment.getSourceAccount();
        BigDecimal amount = payment.getAmount();
        if (source.getBalance().compareTo(amount) < 0) {
            throw new ApiException("INSUFFICIENT_FUNDS", "Insufficient source balance", HttpStatus.BAD_REQUEST);
        }

        // Sender debit — this write must be undone if a failure is simulated below.
        source.setBalance(source.getBalance().subtract(amount));
        accountRepository.save(source);
        accountRepository.flush(); // send the debit to the DB now, so the rollback below is a real, visible one

        if ("DB_FAILURE".equals(failureMode)) {
            throw new SimulatedProcessingFailureException(
                    "DB_FAILURE", "Simulated database failure after sender debit, before receiver credit");
        }
        if ("TIMEOUT_FAILURE".equals(failureMode)) {
            throw new SimulatedProcessingFailureException(
                    "TIMEOUT_FAILURE", "Simulated processing timeout after sender debit, before receiver credit");
        }
    }
}

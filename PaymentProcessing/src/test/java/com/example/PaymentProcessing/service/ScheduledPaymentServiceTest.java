package com.example.PaymentProcessing.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.PaymentProcessing.api.CreatePaymentRequest;
import com.example.PaymentProcessing.api.CreateScheduledPaymentRequest;
import com.example.PaymentProcessing.api.PaymentResponse;
import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.model.Account;
import com.example.PaymentProcessing.model.ScheduledPayment;
import com.example.PaymentProcessing.model.ScheduledPaymentStatus;
import com.example.PaymentProcessing.repository.AccountRepository;
import com.example.PaymentProcessing.repository.ScheduledPaymentRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class ScheduledPaymentServiceTest {

    @Test
    void shouldProcessDueScheduledPaymentAndMarkCompleted() {
        ScheduledPaymentRepository repository = mock(ScheduledPaymentRepository.class);
        AccountRepository accountRepository = mock(AccountRepository.class);
        PaymentService paymentService = mock(PaymentService.class);
        ScheduledPaymentService service = new ScheduledPaymentService(repository, accountRepository, paymentService);

        ScheduledPayment scheduledPayment = new ScheduledPayment();
        scheduledPayment.setScheduledPaymentId(1L);
        scheduledPayment.setSourceAccountId(10L);
        scheduledPayment.setDestinationAccountId(20L);
        scheduledPayment.setAmount(BigDecimal.TEN);
        scheduledPayment.setCurrency("INR");
        scheduledPayment.setRemarks("Scheduled test");
        scheduledPayment.setScheduledAt(LocalDateTime.now().minusMinutes(1));
        scheduledPayment.setStatus(ScheduledPaymentStatus.PENDING);
        scheduledPayment.setReferenceNumber("SCH-TEST");

        when(repository.findByStatusAndScheduledAtLessThanEqual(any(), any(LocalDateTime.class))).thenReturn(List.of(scheduledPayment));
        when(repository.save(any(ScheduledPayment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentService.createPayment(any(CreatePaymentRequest.class))).thenReturn(new PaymentResponse());

        service.processDuePayments();

        verify(paymentService).createPayment(any(CreatePaymentRequest.class));
        assertEquals(ScheduledPaymentStatus.COMPLETED, scheduledPayment.getStatus());
    }

    @Test
    void shouldValidateCreateRequest() {
        ScheduledPaymentRepository repository = mock(ScheduledPaymentRepository.class);
        AccountRepository accountRepository = mock(AccountRepository.class);
        PaymentService paymentService = mock(PaymentService.class);
        ScheduledPaymentService service = new ScheduledPaymentService(repository, accountRepository, paymentService);
        CreateScheduledPaymentRequest request = new CreateScheduledPaymentRequest();
        request.setSourceAccountId(10L);
        request.setDestinationAccountId(20L);
        request.setAmount(BigDecimal.ZERO);
        request.setCurrency("INR");
        request.setScheduledAt(LocalDateTime.now().plusDays(1));
        request.setTpin("123456");

        try {
            service.createScheduledPayment(request);
        } catch (RuntimeException ex) {
            assertEquals("amount must be greater than 0", ex.getMessage());
        }
    }

    @Test
    void shouldRejectSchedulingWhenTpinIsIncorrect() {
        ScheduledPaymentRepository repository = mock(ScheduledPaymentRepository.class);
        AccountRepository accountRepository = mock(AccountRepository.class);
        PaymentService paymentService = mock(PaymentService.class);
        ScheduledPaymentService service = new ScheduledPaymentService(repository, accountRepository, paymentService);

        Account sourceAccount = new Account();
        sourceAccount.setAccountId(10L);
        sourceAccount.setTpinHash(new BCryptPasswordEncoder().encode("123456"));
        when(accountRepository.findById(10L)).thenReturn(Optional.of(sourceAccount));

        CreateScheduledPaymentRequest request = new CreateScheduledPaymentRequest();
        request.setSourceAccountId(10L);
        request.setDestinationAccountId(20L);
        request.setAmount(BigDecimal.TEN);
        request.setCurrency("INR");
        request.setScheduledAt(LocalDateTime.now().plusDays(1));
        request.setTpin("000000");

        ApiException ex = assertThrows(ApiException.class, () -> service.createScheduledPayment(request));
        assertEquals("INVALID_TPIN", ex.getErrorCode());
        verify(repository, never()).save(any(ScheduledPayment.class));
    }

    @Test
    void shouldCancelPendingScheduledPayment() {
        ScheduledPaymentRepository repository = mock(ScheduledPaymentRepository.class);
        AccountRepository accountRepository = mock(AccountRepository.class);
        PaymentService paymentService = mock(PaymentService.class);
        ScheduledPaymentService service = new ScheduledPaymentService(repository, accountRepository, paymentService);

        ScheduledPayment scheduledPayment = new ScheduledPayment();
        scheduledPayment.setScheduledPaymentId(1L);
        scheduledPayment.setStatus(ScheduledPaymentStatus.PENDING);

        when(repository.findById(1L)).thenReturn(Optional.of(scheduledPayment));
        when(repository.save(any(ScheduledPayment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.cancelScheduledPayment(1L);

        assertEquals(ScheduledPaymentStatus.CANCELLED, scheduledPayment.getStatus());
    }

    @Test
    void shouldRejectCancellingNonPendingScheduledPayment() {
        ScheduledPaymentRepository repository = mock(ScheduledPaymentRepository.class);
        AccountRepository accountRepository = mock(AccountRepository.class);
        PaymentService paymentService = mock(PaymentService.class);
        ScheduledPaymentService service = new ScheduledPaymentService(repository, accountRepository, paymentService);

        ScheduledPayment scheduledPayment = new ScheduledPayment();
        scheduledPayment.setScheduledPaymentId(2L);
        scheduledPayment.setStatus(ScheduledPaymentStatus.COMPLETED);

        when(repository.findById(2L)).thenReturn(Optional.of(scheduledPayment));

        ApiException ex = assertThrows(ApiException.class, () -> service.cancelScheduledPayment(2L));
        assertEquals("INVALID_STATUS", ex.getErrorCode());
        verify(repository, never()).save(any(ScheduledPayment.class));
    }
}

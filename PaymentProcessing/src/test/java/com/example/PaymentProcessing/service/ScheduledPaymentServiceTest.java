package com.example.PaymentProcessing.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.PaymentProcessing.api.CreatePaymentRequest;
import com.example.PaymentProcessing.api.CreateScheduledPaymentRequest;
import com.example.PaymentProcessing.api.PaymentResponse;
import com.example.PaymentProcessing.model.ScheduledPayment;
import com.example.PaymentProcessing.model.ScheduledPaymentStatus;
import com.example.PaymentProcessing.repository.ScheduledPaymentRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class ScheduledPaymentServiceTest {

    @Test
    void shouldProcessDueScheduledPaymentAndMarkCompleted() {
        ScheduledPaymentRepository repository = mock(ScheduledPaymentRepository.class);
        PaymentService paymentService = mock(PaymentService.class);
        ScheduledPaymentService service = new ScheduledPaymentService(repository, paymentService);

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
        PaymentService paymentService = mock(PaymentService.class);
        ScheduledPaymentService service = new ScheduledPaymentService(repository, paymentService);
        CreateScheduledPaymentRequest request = new CreateScheduledPaymentRequest();
        request.setSourceAccountId(10L);
        request.setDestinationAccountId(20L);
        request.setAmount(BigDecimal.ZERO);
        request.setCurrency("INR");
        request.setScheduledAt(LocalDateTime.now().plusDays(1));

        try {
            service.createScheduledPayment(request);
        } catch (RuntimeException ex) {
            assertEquals("amount must be greater than 0", ex.getMessage());
        }
    }
}

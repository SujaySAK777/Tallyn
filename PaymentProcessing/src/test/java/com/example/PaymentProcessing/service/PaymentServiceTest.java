package com.example.PaymentProcessing.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.PaymentProcessing.api.CreatePaymentRequest;
import com.example.PaymentProcessing.api.PaymentResponse;
import com.example.PaymentProcessing.api.UpdatePaymentStatusRequest;
import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.model.Account;
import com.example.PaymentProcessing.model.AccountStatus;
import com.example.PaymentProcessing.model.NotificationType;
import com.example.PaymentProcessing.model.Payment;
import com.example.PaymentProcessing.model.PaymentCategory;
import com.example.PaymentProcessing.model.PaymentStatus;
import com.example.PaymentProcessing.repository.AccountRepository;
import com.example.PaymentProcessing.repository.CustomerRepository;
import com.example.PaymentProcessing.repository.PaymentHistoryRepository;
import com.example.PaymentProcessing.repository.PaymentRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class PaymentServiceTest {

    private static final BCryptPasswordEncoder ENCODER = new BCryptPasswordEncoder();

    private AccountRepository accountRepository;
    private PaymentRepository paymentRepository;
    private PaymentHistoryRepository paymentHistoryRepository;
    private EntityManager entityManager;
    private EmailService emailService;
    private CustomerRepository customerRepository;
    private CurrencyConversionService currencyConversionService;
    private NotificationService notificationService;
    private PaymentSimulationService paymentSimulationService;
    private PaymentService service;

    private void setUp() {
        accountRepository = mock(AccountRepository.class);
        paymentRepository = mock(PaymentRepository.class);
        paymentHistoryRepository = mock(PaymentHistoryRepository.class);
        entityManager = mock(EntityManager.class);
        emailService = mock(EmailService.class);
        customerRepository = mock(CustomerRepository.class);
        currencyConversionService = mock(CurrencyConversionService.class);
        notificationService = mock(NotificationService.class);
        paymentSimulationService = mock(PaymentSimulationService.class);
        service = new PaymentService(accountRepository, paymentRepository, paymentHistoryRepository,
                entityManager, emailService, customerRepository, currencyConversionService, notificationService,
                paymentSimulationService, null);
    }

    private Account activeAccount(Long id, Long customerId, BigDecimal balance, String currency, String tpin) {
        Account account = new Account();
        account.setAccountId(id);
        account.setCustomerId(customerId);
        account.setBalance(balance);
        account.setCurrency(currency);
        account.setStatus(AccountStatus.ACTIVE);
        account.setAccountHolderName("Holder " + id);
        account.setTpinHash(tpin == null ? null : ENCODER.encode(tpin));
        return account;
    }

    private CreatePaymentRequest validRequest() {
        CreatePaymentRequest request = new CreatePaymentRequest();
        request.setSourceAccountId(1L);
        request.setDestinationAccountId(2L);
        request.setAmount(BigDecimal.valueOf(100));
        request.setReferenceNumber("REF1");
        request.setTpin("123456");
        return request;
    }

    // ---- createPayment validation ----

    @Test
    void shouldRejectMissingRequiredFieldsOnCreate() {
        setUp();
        ApiException ex = assertThrows(ApiException.class, () -> service.createPayment(null));
        assertEquals("VALIDATION_FAILED", ex.getErrorCode());
    }

    @Test
    void shouldRejectZeroOrNegativeAmount() {
        setUp();
        CreatePaymentRequest request = validRequest();
        request.setAmount(BigDecimal.ZERO);
        ApiException ex = assertThrows(ApiException.class, () -> service.createPayment(request));
        assertEquals("INVALID_AMOUNT", ex.getErrorCode());
    }

    @Test
    void shouldRejectDuplicateReferenceNumber() {
        setUp();
        CreatePaymentRequest request = validRequest();
        when(paymentRepository.findByReferenceNumber("REF1")).thenReturn(Optional.of(new Payment()));

        ApiException ex = assertThrows(ApiException.class, () -> service.createPayment(request));
        assertEquals("DUPLICATE_PAYMENT", ex.getErrorCode());
    }

    @Test
    void shouldRejectUnknownSourceAccount() {
        setUp();
        CreatePaymentRequest request = validRequest();
        when(paymentRepository.findByReferenceNumber("REF1")).thenReturn(Optional.empty());
        when(accountRepository.findById(1L)).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class, () -> service.createPayment(request));
        assertEquals("INVALID_ACCOUNT", ex.getErrorCode());
    }

    @Test
    void shouldRejectPayingFromAccountNotOwnedByAuthenticatedCustomer() {
        setUp();
        CreatePaymentRequest request = validRequest();
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(1000), "INR", "123456");
        Account dest = activeAccount(2L, 6L, BigDecimal.ZERO, "INR", null);
        when(paymentRepository.findByReferenceNumber("REF1")).thenReturn(Optional.empty());
        when(accountRepository.findById(1L)).thenReturn(Optional.of(source));
        when(accountRepository.findById(2L)).thenReturn(Optional.of(dest));

        ApiException ex = assertThrows(ApiException.class, () -> service.createPayment(request, 999L));
        assertEquals("ACCOUNT_NOT_OWNED", ex.getErrorCode());
    }

    @Test
    void shouldRejectWrongTpin() {
        setUp();
        CreatePaymentRequest request = validRequest();
        request.setTpin("000000");
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(1000), "INR", "123456");
        Account dest = activeAccount(2L, 6L, BigDecimal.ZERO, "INR", null);
        when(paymentRepository.findByReferenceNumber("REF1")).thenReturn(Optional.empty());
        when(accountRepository.findById(1L)).thenReturn(Optional.of(source));
        when(accountRepository.findById(2L)).thenReturn(Optional.of(dest));

        ApiException ex = assertThrows(ApiException.class, () -> service.createPayment(request, 5L));
        assertEquals("INVALID_TPIN", ex.getErrorCode());
    }

    @Test
    void shouldSkipTpinCheckForScheduledExecution() {
        setUp();
        CreatePaymentRequest request = validRequest();
        request.setTpin(null); // scheduled execution doesn't require TPIN
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(1000), "INR", "123456");
        Account dest = activeAccount(2L, 6L, BigDecimal.ZERO, "INR", null);
        when(paymentRepository.findByReferenceNumber("REF1")).thenReturn(Optional.empty());
        when(accountRepository.findById(1L)).thenReturn(Optional.of(source));
        when(accountRepository.findById(2L)).thenReturn(Optional.of(dest));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PaymentResponse response = service.createScheduledExecutionPayment(request);
        assertEquals(PaymentStatus.CREATED, response.getStatus());
    }

    @Test
    void shouldRejectSameSourceAndDestinationAccount() {
        setUp();
        CreatePaymentRequest request = validRequest();
        request.setDestinationAccountId(1L);
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(1000), "INR", "123456");
        when(paymentRepository.findByReferenceNumber("REF1")).thenReturn(Optional.empty());
        when(accountRepository.findById(1L)).thenReturn(Optional.of(source));

        ApiException ex = assertThrows(ApiException.class, () -> service.createPayment(request, 5L));
        assertEquals("VALIDATION_FAILED", ex.getErrorCode());
    }

    @Test
    void shouldRejectInactiveAccounts() {
        setUp();
        CreatePaymentRequest request = validRequest();
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(1000), "INR", "123456");
        Account dest = activeAccount(2L, 6L, BigDecimal.ZERO, "INR", null);
        dest.setStatus(AccountStatus.INACTIVE);
        when(paymentRepository.findByReferenceNumber("REF1")).thenReturn(Optional.empty());
        when(accountRepository.findById(1L)).thenReturn(Optional.of(source));
        when(accountRepository.findById(2L)).thenReturn(Optional.of(dest));

        ApiException ex = assertThrows(ApiException.class, () -> service.createPayment(request, 5L));
        assertEquals("INVALID_ACCOUNT", ex.getErrorCode());
    }

    @Test
    void shouldDefaultToOthersCategoryWhenNotProvided() {
        setUp();
        CreatePaymentRequest request = validRequest();
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(1000), "INR", "123456");
        Account dest = activeAccount(2L, 6L, BigDecimal.ZERO, "INR", null);
        when(paymentRepository.findByReferenceNumber("REF1")).thenReturn(Optional.empty());
        when(accountRepository.findById(1L)).thenReturn(Optional.of(source));
        when(accountRepository.findById(2L)).thenReturn(Optional.of(dest));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PaymentResponse response = service.createPayment(request, 5L);
        assertEquals(PaymentCategory.OTHERS.name(), response.getCategory());
    }

    @Test
    void shouldFallBackToOthersCategoryForUnknownValue() {
        setUp();
        CreatePaymentRequest request = validRequest();
        request.setCategory("NOT_A_REAL_CATEGORY");
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(1000), "INR", "123456");
        Account dest = activeAccount(2L, 6L, BigDecimal.ZERO, "INR", null);
        when(paymentRepository.findByReferenceNumber("REF1")).thenReturn(Optional.empty());
        when(accountRepository.findById(1L)).thenReturn(Optional.of(source));
        when(accountRepository.findById(2L)).thenReturn(Optional.of(dest));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PaymentResponse response = service.createPayment(request, 5L);
        assertEquals(PaymentCategory.OTHERS.name(), response.getCategory());
    }

    // ---- status transitions ----

    private Payment paymentWithStatus(PaymentStatus status, Account source, Account dest) {
        Payment payment = new Payment();
        payment.setPaymentId(1L);
        payment.setSourceAccount(source);
        payment.setDestinationAccount(dest);
        payment.setAmount(BigDecimal.valueOf(100));
        payment.setCurrency("INR");
        payment.setReferenceNumber("REF1");
        payment.setStatus(status);
        return payment;
    }

    @Test
    void shouldRejectStatusUpdateWithoutStatus() {
        setUp();
        ApiException ex = assertThrows(ApiException.class, () -> service.updateStatus(1L, new UpdatePaymentStatusRequest()));
        assertEquals("VALIDATION_FAILED", ex.getErrorCode());
    }

    @Test
    void shouldRejectStatusUpdateForMissingPayment() {
        setUp();
        when(paymentRepository.findById(1L)).thenReturn(Optional.empty());
        UpdatePaymentStatusRequest request = new UpdatePaymentStatusRequest();
        request.setStatus(PaymentStatus.VALIDATED);

        ApiException ex = assertThrows(ApiException.class, () -> service.updateStatus(1L, request));
        assertEquals("PAYMENT_NOT_FOUND", ex.getErrorCode());
    }

    @Test
    void shouldNoOpWhenTransitioningToSameStatus() {
        setUp();
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(1000), "INR", null);
        Account dest = activeAccount(2L, 6L, BigDecimal.ZERO, "INR", null);
        Payment payment = paymentWithStatus(PaymentStatus.CREATED, source, dest);
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));

        UpdatePaymentStatusRequest request = new UpdatePaymentStatusRequest();
        request.setStatus(PaymentStatus.CREATED);

        PaymentResponse response = service.updateStatus(1L, request);

        assertEquals(PaymentStatus.CREATED, response.getStatus());
        verify(paymentRepository, never()).save(any(Payment.class));
        verify(emailService, never()).sendMoneyDeductedEmail(any(), any(), any(), any(), any(), any());
    }

    @Test
    void shouldRejectInvalidTransitionSkippingSteps() {
        setUp();
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(1000), "INR", null);
        Account dest = activeAccount(2L, 6L, BigDecimal.ZERO, "INR", null);
        Payment payment = paymentWithStatus(PaymentStatus.CREATED, source, dest);
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));

        UpdatePaymentStatusRequest request = new UpdatePaymentStatusRequest();
        request.setStatus(PaymentStatus.COMPLETED); // CREATED -> COMPLETED is not allowed

        ApiException ex = assertThrows(ApiException.class, () -> service.updateStatus(1L, request));
        assertEquals("INVALID_STATUS_TRANSITION", ex.getErrorCode());
    }

    @Test
    void shouldRejectTransitionFromTerminalStatus() {
        setUp();
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(1000), "INR", null);
        Account dest = activeAccount(2L, 6L, BigDecimal.ZERO, "INR", null);
        Payment payment = paymentWithStatus(PaymentStatus.COMPLETED, source, dest);
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));

        UpdatePaymentStatusRequest request = new UpdatePaymentStatusRequest();
        request.setStatus(PaymentStatus.FAILED);

        ApiException ex = assertThrows(ApiException.class, () -> service.updateStatus(1L, request));
        assertEquals("INVALID_STATUS_TRANSITION", ex.getErrorCode());
    }

    @Test
    void shouldRejectValidatingWithInsufficientBalance() {
        setUp();
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(50), "INR", null);
        Account dest = activeAccount(2L, 6L, BigDecimal.ZERO, "INR", null);
        Payment payment = paymentWithStatus(PaymentStatus.CREATED, source, dest);
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));

        UpdatePaymentStatusRequest request = new UpdatePaymentStatusRequest();
        request.setStatus(PaymentStatus.VALIDATED);

        ApiException ex = assertThrows(ApiException.class, () -> service.updateStatus(1L, request));
        assertEquals("INSUFFICIENT_FUNDS", ex.getErrorCode());
    }

    @Test
    void shouldRejectFailedTransitionWithoutErrorCode() {
        setUp();
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(1000), "INR", null);
        Account dest = activeAccount(2L, 6L, BigDecimal.ZERO, "INR", null);
        Payment payment = paymentWithStatus(PaymentStatus.CREATED, source, dest);
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));

        UpdatePaymentStatusRequest request = new UpdatePaymentStatusRequest();
        request.setStatus(PaymentStatus.FAILED);

        ApiException ex = assertThrows(ApiException.class, () -> service.updateStatus(1L, request));
        assertEquals("VALIDATION_FAILED", ex.getErrorCode());
    }

    @Test
    void shouldCompletePaymentAndSettleBalancesWithCurrencyConversion() {
        setUp();
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(1000), "USD", null);
        Account dest = activeAccount(2L, 6L, BigDecimal.valueOf(200), "INR", null);
        Payment payment = paymentWithStatus(PaymentStatus.PROCESSING, source, dest);
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(currencyConversionService.convert(BigDecimal.valueOf(100), "USD", "INR")).thenReturn(BigDecimal.valueOf(8350));
        when(customerRepository.findById(anyLong())).thenReturn(Optional.empty());

        UpdatePaymentStatusRequest request = new UpdatePaymentStatusRequest();
        request.setStatus(PaymentStatus.COMPLETED);

        PaymentResponse response = service.updateStatus(1L, request);

        assertEquals(PaymentStatus.COMPLETED, response.getStatus());
        assertEquals(0, BigDecimal.valueOf(900).compareTo(source.getBalance()));
        assertEquals(0, BigDecimal.valueOf(8550).compareTo(dest.getBalance()));
        verify(accountRepository).save(source);
        verify(accountRepository).save(dest);
    }

    @Test
    void shouldSendTwoEmailsAndTwoNotificationsOnCompletion() {
        setUp();
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(1000), "INR", null);
        Account dest = activeAccount(2L, 6L, BigDecimal.valueOf(200), "INR", null);
        Payment payment = paymentWithStatus(PaymentStatus.PROCESSING, source, dest);
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(currencyConversionService.convert(any(), any(), any())).thenReturn(BigDecimal.valueOf(100));
        when(customerRepository.findById(anyLong())).thenReturn(Optional.empty());

        UpdatePaymentStatusRequest request = new UpdatePaymentStatusRequest();
        request.setStatus(PaymentStatus.COMPLETED);

        service.updateStatus(1L, request);

        verify(emailService).sendMoneyDeductedEmail(any(), any(), any(), any(), any(), any());
        verify(emailService).sendMoneyReceivedEmail(any(), any(), any(), any(), any(), any());
        verify(notificationService).create(eq(5L), eq(NotificationType.MONEY_DEBITED), any(), any());
        verify(notificationService).create(eq(6L), eq(NotificationType.MONEY_CREDITED), any(), any());
    }

    @Test
    void shouldSendOneEmailAndOneNotificationOnFailure() {
        setUp();
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(1000), "INR", null);
        Account dest = activeAccount(2L, 6L, BigDecimal.ZERO, "INR", null);
        Payment payment = paymentWithStatus(PaymentStatus.CREATED, source, dest);
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(customerRepository.findById(anyLong())).thenReturn(Optional.empty());

        UpdatePaymentStatusRequest request = new UpdatePaymentStatusRequest();
        request.setStatus(PaymentStatus.FAILED);
        request.setErrorCode("BANK_DECLINED");

        service.updateStatus(1L, request);

        verify(emailService, times(1)).sendPaymentFailedEmail(any(), any(), any(), any(), any());
        verify(notificationService, times(1)).create(eq(5L), eq(NotificationType.PAYMENT_FAILED), any(), any());
        verify(notificationService, never()).create(eq(6L), any(), any(), any());
    }

    @Test
    void shouldNotSendEmailsOrNotificationsForNonTerminalTransitions() {
        setUp();
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(1000), "INR", null);
        Account dest = activeAccount(2L, 6L, BigDecimal.ZERO, "INR", null);
        Payment payment = paymentWithStatus(PaymentStatus.CREATED, source, dest);
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdatePaymentStatusRequest request = new UpdatePaymentStatusRequest();
        request.setStatus(PaymentStatus.VALIDATED);

        service.updateStatus(1L, request);

        verify(emailService, never()).sendMoneyDeductedEmail(any(), any(), any(), any(), any(), any());
        verify(notificationService, never()).create(any(), any(), any(), any());
    }

    @Test
    void shouldStillReturnSuccessfullyWhenNotificationServiceThrows() {
        setUp();
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(1000), "INR", null);
        Account dest = activeAccount(2L, 6L, BigDecimal.valueOf(200), "INR", null);
        Payment payment = paymentWithStatus(PaymentStatus.PROCESSING, source, dest);
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(currencyConversionService.convert(any(), any(), any())).thenReturn(BigDecimal.valueOf(100));
        when(customerRepository.findById(anyLong())).thenReturn(Optional.empty());
        org.mockito.Mockito.doThrow(new RuntimeException("boom")).when(notificationService)
                .create(any(), any(), any(), any());

        UpdatePaymentStatusRequest request = new UpdatePaymentStatusRequest();
        request.setStatus(PaymentStatus.COMPLETED);

        // Notification/email failures are swallowed; the status update itself must still succeed.
        PaymentResponse response = service.updateStatus(1L, request);
        assertEquals(PaymentStatus.COMPLETED, response.getStatus());
    }

    // ---- resendNotifications ----

    @Test
    void shouldRejectResendForMissingPayment() {
        setUp();
        when(paymentRepository.findById(1L)).thenReturn(Optional.empty());
        ApiException ex = assertThrows(ApiException.class, () -> service.resendNotifications(1L));
        assertEquals("PAYMENT_NOT_FOUND", ex.getErrorCode());
    }

    @Test
    void shouldResendBothEmailsForCompletedPayment() {
        setUp();
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(900), "INR", null);
        Account dest = activeAccount(2L, 6L, BigDecimal.valueOf(300), "INR", null);
        Payment payment = paymentWithStatus(PaymentStatus.COMPLETED, source, dest);
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));
        when(customerRepository.findById(anyLong())).thenReturn(Optional.empty());

        service.resendNotifications(1L);

        verify(emailService).sendMoneyDeductedEmail(any(), any(), any(), any(), any(), any());
        verify(emailService).sendMoneyReceivedEmail(any(), any(), any(), any(), any(), any());
        // Documenting current (undesirable) behavior: resend for COMPLETED does not
        // recreate dashboard notifications, only re-sends the emails.
        verify(notificationService, never()).create(any(), any(), any(), any());
    }

    @Test
    void shouldResendFailedPaymentWithCurrentMistypedNotificationTypes() {
        // NOTE: this documents PaymentService's current behavior, which has a bug -
        // the FAILED branch creates MONEY_DEBITED/MONEY_CREDITED notifications instead
        // of PAYMENT_FAILED, because of an unreachable second "else if FAILED" branch
        // that was clearly meant to hold the correct logic. Fix PaymentService.resendNotifications
        // and then flip this test's expectations to eq(NotificationType.PAYMENT_FAILED) once addressed.
        setUp();
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(900), "INR", null);
        Account dest = activeAccount(2L, 6L, BigDecimal.valueOf(300), "INR", null);
        Payment payment = paymentWithStatus(PaymentStatus.FAILED, source, dest);
        payment.setErrorCode("BANK_DECLINED");
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));
        when(customerRepository.findById(anyLong())).thenReturn(Optional.empty());

        service.resendNotifications(1L);

        verify(emailService).sendPaymentFailedEmail(any(), any(), any(), any(), any());
        verify(notificationService).create(eq(5L), eq(NotificationType.MONEY_DEBITED), any(), any());
        verify(notificationService).create(eq(6L), eq(NotificationType.MONEY_CREDITED), any(), any());
        verify(notificationService, never()).create(any(), eq(NotificationType.PAYMENT_FAILED), any(), any());
    }

    @Test
    void shouldNotSendAnythingWhenResendingNonTerminalPayment() {
        setUp();
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(900), "INR", null);
        Account dest = activeAccount(2L, 6L, BigDecimal.valueOf(300), "INR", null);
        Payment payment = paymentWithStatus(PaymentStatus.VALIDATED, source, dest);
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));

        service.resendNotifications(1L);

        verify(emailService, never()).sendMoneyDeductedEmail(any(), any(), any(), any(), any(), any());
        verify(emailService, never()).sendPaymentFailedEmail(any(), any(), any(), any(), any());
        verify(notificationService, never()).create(any(), any(), any(), any());
    }

    // ---- applyApprovedRefund ----
    // Authorization (sender-raised ticket + admin approval) lives in RefundRequestServiceTest;
    // this only covers the balance-reversal mechanics once approval has already happened.

    private Payment completedPayment(Account source, Account dest, BigDecimal amount, BigDecimal settledAmount) {
        Payment payment = paymentWithStatus(PaymentStatus.COMPLETED, source, dest);
        payment.setAmount(amount);
        payment.setSettledAmount(settledAmount);
        return payment;
    }

    @Test
    void shouldRejectRefundForMissingPayment() {
        setUp();
        when(paymentRepository.findById(1L)).thenReturn(Optional.empty());
        ApiException ex = assertThrows(ApiException.class, () -> service.applyApprovedRefund(1L, "not happy"));
        assertEquals("PAYMENT_NOT_FOUND", ex.getErrorCode());
    }

    @Test
    void shouldRejectRefundForNonCompletedPayment() {
        setUp();
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(900), "INR", null);
        Account dest = activeAccount(2L, 6L, BigDecimal.valueOf(300), "INR", null);
        Payment payment = paymentWithStatus(PaymentStatus.PROCESSING, source, dest);
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));

        ApiException ex = assertThrows(ApiException.class, () -> service.applyApprovedRefund(1L, null));
        assertEquals("INVALID_STATUS_TRANSITION", ex.getErrorCode());
    }

    @Test
    void shouldRejectRefundWhenRecipientHasInsufficientBalance() {
        setUp();
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(900), "INR", null);
        Account dest = activeAccount(2L, 6L, BigDecimal.valueOf(50), "INR", null);
        Payment payment = completedPayment(source, dest, BigDecimal.valueOf(100), BigDecimal.valueOf(100));
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));

        ApiException ex = assertThrows(ApiException.class, () -> service.applyApprovedRefund(1L, null));
        assertEquals("INSUFFICIENT_FUNDS_FOR_REFUND", ex.getErrorCode());
    }

    @Test
    void shouldRefundPaymentAndReverseExactSettledAmount() {
        setUp();
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(900), "USD", null);
        Account dest = activeAccount(2L, 6L, BigDecimal.valueOf(8550), "INR", null);
        Payment payment = completedPayment(source, dest, BigDecimal.valueOf(100), BigDecimal.valueOf(8350));
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(customerRepository.findById(anyLong())).thenReturn(Optional.empty());

        PaymentResponse response = service.applyApprovedRefund(1L, "duplicate charge");

        assertEquals(PaymentStatus.REFUNDED, response.getStatus());
        assertEquals("duplicate charge", response.getRefundReason());
        assertEquals(0, BigDecimal.valueOf(1000).compareTo(source.getBalance()));
        assertEquals(0, BigDecimal.valueOf(200).compareTo(dest.getBalance()));
        verify(accountRepository).save(source);
        verify(accountRepository).save(dest);
        verify(notificationService).create(eq(6L), eq(NotificationType.REFUND_ISSUED), any(), any());
        verify(notificationService).create(eq(5L), eq(NotificationType.REFUND_RECEIVED), any(), any());
    }

    @Test
    void shouldFallBackToReconversionWhenSettledAmountMissing() {
        setUp();
        Account source = activeAccount(1L, 5L, BigDecimal.valueOf(900), "USD", null);
        Account dest = activeAccount(2L, 6L, BigDecimal.valueOf(8550), "INR", null);
        Payment payment = completedPayment(source, dest, BigDecimal.valueOf(100), null);
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(currencyConversionService.convert(BigDecimal.valueOf(100), "USD", "INR")).thenReturn(BigDecimal.valueOf(8350));
        when(customerRepository.findById(anyLong())).thenReturn(Optional.empty());

        PaymentResponse response = service.applyApprovedRefund(1L, null);

        assertEquals(PaymentStatus.REFUNDED, response.getStatus());
        assertEquals(0, BigDecimal.valueOf(1000).compareTo(source.getBalance()));
        assertEquals(0, BigDecimal.valueOf(200).compareTo(dest.getBalance()));
    }

    // ---- listPayments ----

    @Test
    void shouldListPaymentsForCustomerFilteredByStatus() {
        setUp();
        Payment completed = new Payment();
        completed.setStatus(PaymentStatus.COMPLETED);
        completed.setSourceAccount(activeAccount(1L, 5L, BigDecimal.TEN, "INR", null));
        completed.setDestinationAccount(activeAccount(2L, 6L, BigDecimal.TEN, "INR", null));
        Payment failed = new Payment();
        failed.setStatus(PaymentStatus.FAILED);
        failed.setSourceAccount(activeAccount(1L, 5L, BigDecimal.TEN, "INR", null));
        failed.setDestinationAccount(activeAccount(2L, 6L, BigDecimal.TEN, "INR", null));

        when(paymentRepository.findBySourceAccount_CustomerIdOrDestinationAccount_CustomerId(5L, 5L))
                .thenReturn(java.util.List.of(completed, failed));

        var result = service.listPayments(PaymentStatus.COMPLETED, 5L);
        assertEquals(1, result.size());
        assertEquals(PaymentStatus.COMPLETED, result.get(0).getStatus());
    }

    @Test
    void shouldGetPaymentById() {
        setUp();
        Payment payment = paymentWithStatus(PaymentStatus.CREATED,
                activeAccount(1L, 5L, BigDecimal.TEN, "INR", null),
                activeAccount(2L, 6L, BigDecimal.TEN, "INR", null));
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(payment));

        PaymentResponse response = service.getPayment(1L);
        assertEquals("REF1", response.getReferenceNumber());
    }

    @Test
    void shouldThrowWhenPaymentNotFound() {
        setUp();
        when(paymentRepository.findById(404L)).thenReturn(Optional.empty());
        ApiException ex = assertThrows(ApiException.class, () -> service.getPayment(404L));
        assertEquals("PAYMENT_NOT_FOUND", ex.getErrorCode());
    }
}

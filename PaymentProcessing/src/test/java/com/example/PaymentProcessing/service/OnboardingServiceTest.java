package com.example.PaymentProcessing.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.model.Account;
import com.example.PaymentProcessing.model.AccountStatus;
import com.example.PaymentProcessing.model.Customer;
import com.example.PaymentProcessing.repository.AccountRepository;
import com.example.PaymentProcessing.repository.CustomerRepository;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class OnboardingServiceTest {

    private static final BCryptPasswordEncoder ENCODER = new BCryptPasswordEncoder();

    private CustomerRepository customers;
    private AccountRepository accounts;
    private AccountService accountService;
    private SmsService smsService;
    private JwtService jwtService;
    private EmailService emailService;
    private OnboardingService service;

    private void setUp() {
        customers = mock(CustomerRepository.class);
        accounts = mock(AccountRepository.class);
        accountService = mock(AccountService.class);
        smsService = mock(SmsService.class);
        jwtService = mock(JwtService.class);
        emailService = mock(EmailService.class);
        service = new OnboardingService(customers, accounts, accountService, smsService, jwtService, emailService);
        when(emailService.sendOtp(anyString(), anyString(), anyString())).thenReturn(true);
    }

    private Map<String, String> body(String... kv) {
        Map<String, String> map = new HashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            map.put(kv[i], kv[i + 1]);
        }
        return map;
    }

    // ---- sendEmailOtp / verifyEmailOtp ----

    @Test
    void shouldRejectSendingOtpForExistingEmail() {
        setUp();
        when(customers.findByEmail("jane@example.com")).thenReturn(Optional.of(new Customer()));

        ApiException ex = assertThrows(ApiException.class,
                () -> service.sendEmailOtp(body("email", "jane@example.com")));
        assertEquals("EMAIL_EXISTS", ex.getErrorCode());
    }

    @Test
    void shouldRejectSendEmailOtpWhenDeliveryFails() {
        setUp();
        when(customers.findByEmail("jane@example.com")).thenReturn(Optional.empty());
        when(emailService.sendOtp(anyString(), anyString(), anyString())).thenReturn(false);

        ApiException ex = assertThrows(ApiException.class,
                () -> service.sendEmailOtp(body("email", "jane@example.com")));
        assertEquals("EMAIL_SEND_FAILED", ex.getErrorCode());
    }

    @Test
    void shouldRejectVerifyEmailOtpWithWrongCode() {
        setUp();
        when(customers.findByEmail("jane@example.com")).thenReturn(Optional.empty());
        service.sendEmailOtp(body("email", "jane@example.com"));

        ApiException ex = assertThrows(ApiException.class,
                () -> service.verifyEmailOtp(body("email", "jane@example.com", "otp", "000000")));
        assertEquals("INVALID_OTP", ex.getErrorCode());
    }

    // ---- signup ----

    @Test
    void shouldRejectSignupWithWeakPassword() {
        setUp();
        ApiException ex = assertThrows(ApiException.class,
                () -> service.signup(body("email", "jane@example.com", "password", "weak")));
        assertEquals("WEAK_PASSWORD", ex.getErrorCode());
    }

    @Test
    void shouldRejectSignupForExistingEmail() {
        setUp();
        when(customers.findByEmail("jane@example.com")).thenReturn(Optional.of(new Customer()));

        ApiException ex = assertThrows(ApiException.class,
                () -> service.signup(body("email", "jane@example.com", "password", "Str0ng!Pass")));
        assertEquals("EMAIL_EXISTS", ex.getErrorCode());
    }

    @Test
    void shouldRejectSignupWhenEmailNotVerified() {
        setUp();
        when(customers.findByEmail("jane@example.com")).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class,
                () -> service.signup(body("email", "jane@example.com", "password", "Str0ng!Pass")));
        assertEquals("EMAIL_NOT_VERIFIED", ex.getErrorCode());
    }

    @Test
    void shouldSignUpAfterEmailVerification() {
        setUp();
        when(customers.findByEmail("jane@example.com")).thenReturn(Optional.empty());
        service.sendEmailOtp(body("email", "jane@example.com"));

        // Grab the OTP EmailService was called with, since it's randomly generated internally.
        var otpCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(emailService).sendOtp(eq("jane@example.com"), otpCaptor.capture(), anyString());
        service.verifyEmailOtp(body("email", "jane@example.com", "otp", otpCaptor.getValue()));

        when(customers.save(any(Customer.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Map<String, Object> result = service.signup(body("email", "jane@example.com", "password", "Str0ng!Pass"));

        assertEquals("SIGNED_UP", result.get("status"));
    }

    // ---- profile ----

    @Test
    void shouldRejectProfileWithInvalidPhoneNumber() {
        setUp();
        Customer customer = new Customer();
        when(customers.findById(1L)).thenReturn(Optional.of(customer));

        ApiException ex = assertThrows(ApiException.class,
                () -> service.profile(1L, body("phoneNumber", "12345")));
        assertEquals("VALIDATION_FAILED", ex.getErrorCode());
    }

    @Test
    void shouldRejectProfileWhenPhoneUsedByAnotherCustomer() {
        setUp();
        Customer customer = new Customer();
        when(customers.findById(1L)).thenReturn(Optional.of(customer));

        Customer existingOwner = mockCustomerWithId(2L);
        when(customers.findByPhoneNumber("9876543210")).thenReturn(Optional.of(existingOwner));

        ApiException ex = assertThrows(ApiException.class,
                () -> service.profile(1L, body("phoneNumber", "9876543210", "firstName", "Jane", "lastName", "Doe")));
        assertEquals("PHONE_ALREADY_USED", ex.getErrorCode());
    }

    @Test
    void shouldUpdateProfileSuccessfully() {
        setUp();
        Customer customer = mockCustomerWithId(1L);
        when(customers.findById(1L)).thenReturn(Optional.of(customer));
        when(customers.findByPhoneNumber("9876543210")).thenReturn(Optional.empty());

        Map<String, Object> result = service.profile(1L,
                body("phoneNumber", "9876543210", "firstName", "Jane", "lastName", "Doe"));

        assertEquals("PROFILE_COMPLETE", result.get("status"));
        assertEquals("Jane", customer.getFirstName());
    }

    @Test
    void shouldThrowCustomerNotFoundForUnknownProfile() {
        setUp();
        when(customers.findById(404L)).thenReturn(Optional.empty());
        ApiException ex = assertThrows(ApiException.class, () -> service.profile(404L, body("phoneNumber", "9876543210")));
        assertEquals("CUSTOMER_NOT_FOUND", ex.getErrorCode());
    }

    // ---- linkAccount ----

    @Test
    void shouldRejectLinkingWhenAccountAlreadyLinked() {
        setUp();
        Customer customer = mockCustomerWithId(1L);
        when(customers.findById(1L)).thenReturn(Optional.of(customer));
        when(accounts.findFirstByCustomerId(1L)).thenReturn(Optional.of(new Account()));

        ApiException ex = assertThrows(ApiException.class,
                () -> service.linkAccount(1L, body("bankName", "HDFC BANK")));
        assertEquals("ACCOUNT_ALREADY_LINKED", ex.getErrorCode());
    }

    @Test
    void shouldIncludeDevelopmentOtpWhenSmsFails() {
        setUp();
        Customer customer = mockCustomerWithId(1L);
        customer.setFirstName("Jane");
        customer.setLastName("Doe");
        customer.setPhoneNumber("9876543210");
        when(customers.findById(1L)).thenReturn(Optional.of(customer));
        when(accounts.findFirstByCustomerId(1L)).thenReturn(Optional.empty());

        Account provisioned = new Account();
        provisioned.setBankName("HDFC BANK");
        provisioned.setAccountNumber("123456789012");
        provisioned.setIfscCode("HDFC0001234");
        provisioned.setBalance(BigDecimal.valueOf(5000));
        when(accountService.provisionSimulatedAccount(eq("HDFC BANK"), eq("Jane Doe"), eq("INR"), eq(1L), eq("9876543210")))
                .thenReturn(provisioned);
        when(smsService.sendOtp(eq("9876543210"), anyString())).thenReturn(false);

        Map<String, Object> result = service.linkAccount(1L, body("bankName", "HDFC BANK"));

        assertEquals(true, result.containsKey("developmentOtp"));
        assertEquals("123456789012", result.get("accountNumber"));
    }

    @Test
    void shouldOmitDevelopmentOtpWhenSmsSucceeds() {
        setUp();
        Customer customer = mockCustomerWithId(1L);
        when(customers.findById(1L)).thenReturn(Optional.of(customer));
        when(accounts.findFirstByCustomerId(1L)).thenReturn(Optional.empty());
        when(accountService.provisionSimulatedAccount(any(), any(), any(), any(), any())).thenReturn(new Account());
        when(smsService.sendOtp(any(), anyString())).thenReturn(true);

        Map<String, Object> result = service.linkAccount(1L, body("bankName", "HDFC BANK"));

        assertEquals(false, result.containsKey("developmentOtp"));
    }

    // ---- verify ----

    @Test
    void shouldRejectVerifyWhenNoOtpWasEverIssued() {
        setUp();
        Customer customer = mockCustomerWithId(1L);
        when(customers.findById(1L)).thenReturn(Optional.of(customer));

        ApiException ex = assertThrows(ApiException.class, () -> service.verify(1L, body("otp", "123456")));
        assertEquals("OTP_EXPIRED", ex.getErrorCode());
    }

    @Test
    void shouldRejectVerifyWithWrongOtp() {
        setUp();
        Customer customer = mockCustomerWithId(1L);
        when(customers.findById(1L)).thenReturn(Optional.of(customer));
        when(accounts.findFirstByCustomerId(1L)).thenReturn(Optional.empty());
        when(accountService.provisionSimulatedAccount(any(), any(), any(), any(), any())).thenReturn(new Account());
        when(smsService.sendOtp(any(), anyString())).thenReturn(true);
        service.linkAccount(1L, body("bankName", "HDFC BANK"));

        ApiException ex = assertThrows(ApiException.class, () -> service.verify(1L, body("otp", "000000")));
        assertEquals("INVALID_OTP", ex.getErrorCode());
    }

    @Test
    void shouldVerifyWithCorrectOtp() {
        setUp();
        Customer customer = mockCustomerWithId(1L);
        when(customers.findById(1L)).thenReturn(Optional.of(customer));
        when(accounts.findFirstByCustomerId(1L)).thenReturn(Optional.empty());
        when(accountService.provisionSimulatedAccount(any(), any(), any(), any(), any())).thenReturn(new Account());
        when(smsService.sendOtp(any(), anyString())).thenReturn(false); // forces developmentOtp into response

        Map<String, Object> linkResult = service.linkAccount(1L, body("bankName", "HDFC BANK"));
        String otp = (String) linkResult.get("developmentOtp");

        Map<String, Object> result = service.verify(1L, body("otp", otp));
        assertEquals("VERIFIED", result.get("status"));
    }

    // ---- completeWithoutAccount / setTpin ----

    @Test
    void shouldCompleteOnboardingWithoutAccount() {
        setUp();
        Customer customer = mockCustomerWithId(1L);
        when(customers.findById(1L)).thenReturn(Optional.of(customer));

        Map<String, Object> result = service.completeWithoutAccount(1L);
        assertEquals("ACTIVE", result.get("status"));
    }

    @Test
    void shouldRejectTpinThatIsNotSixDigits() {
        setUp();
        ApiException ex = assertThrows(ApiException.class, () -> service.setTpin(1L, body("tpin", "123")));
        assertEquals("INVALID_TPIN", ex.getErrorCode());
    }

    @Test
    void shouldRejectSetTpinWithoutLinkedAccount() {
        setUp();
        Customer customer = mockCustomerWithId(1L);
        when(customers.findById(1L)).thenReturn(Optional.of(customer));
        when(accounts.findFirstByCustomerId(1L)).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class, () -> service.setTpin(1L, body("tpin", "123456")));
        assertEquals("ACCOUNT_NOT_FOUND", ex.getErrorCode());
        assertEquals(org.springframework.http.HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    void shouldSetTpinAndActivateAccountAndCustomer() {
        setUp();
        Customer customer = mockCustomerWithId(1L);
        Account account = new Account();
        account.setAccountId(50L);
        account.setStatus(AccountStatus.INACTIVE);
        when(customers.findById(1L)).thenReturn(Optional.of(customer));
        when(accounts.findFirstByCustomerId(1L)).thenReturn(Optional.of(account));

        Map<String, Object> result = service.setTpin(1L, body("tpin", "123456"));

        assertEquals("ACTIVE", result.get("status"));
        assertEquals(AccountStatus.ACTIVE, account.getStatus());
        assertEquals(50L, result.get("accountId"));
    }

    // ---- login ----

    @Test
    void shouldRejectLoginForUnknownEmail() {
        setUp();
        when(customers.findByEmail("jane@example.com")).thenReturn(Optional.empty());
        ApiException ex = assertThrows(ApiException.class,
                () -> service.login(body("email", "jane@example.com", "password", "whatever")));
        assertEquals("INVALID_LOGIN", ex.getErrorCode());
    }

    @Test
    void shouldRejectLoginWithWrongPassword() {
        setUp();
        Customer customer = mockCustomerWithId(1L);
        customer.setPasswordHash(ENCODER.encode("correct-password"));
        customer.setOnboardingStatus("ACTIVE");
        when(customers.findByEmail("jane@example.com")).thenReturn(Optional.of(customer));

        ApiException ex = assertThrows(ApiException.class,
                () -> service.login(body("email", "jane@example.com", "password", "wrong-password")));
        assertEquals("INVALID_LOGIN", ex.getErrorCode());
    }

    @Test
    void shouldRejectLoginWhenOnboardingNotActiveEvenWithCorrectPassword() {
        setUp();
        Customer customer = mockCustomerWithId(1L);
        customer.setPasswordHash(ENCODER.encode("correct-password"));
        customer.setOnboardingStatus("PROFILE_COMPLETE"); // not yet ACTIVE
        when(customers.findByEmail("jane@example.com")).thenReturn(Optional.of(customer));

        ApiException ex = assertThrows(ApiException.class,
                () -> service.login(body("email", "jane@example.com", "password", "correct-password")));
        assertEquals("INVALID_LOGIN", ex.getErrorCode());
    }

    @Test
    void shouldLoginSuccessfullyAndIncludeLinkedAccount() {
        setUp();
        Customer customer = mockCustomerWithId(1L);
        customer.setPasswordHash(ENCODER.encode("correct-password"));
        customer.setOnboardingStatus("ACTIVE");
        customer.setEmail("jane@example.com");
        when(customers.findByEmail("jane@example.com")).thenReturn(Optional.of(customer));
        when(jwtService.generateToken(1L, "jane@example.com")).thenReturn("fake-jwt-token");

        Account account = new Account();
        account.setAccountId(50L);
        account.setAccountNumber("123456789012");
        account.setBankName("HDFC BANK");
        when(accounts.findFirstByCustomerId(1L)).thenReturn(Optional.of(account));

        Map<String, Object> result = service.login(body("email", "jane@example.com", "password", "correct-password"));

        assertEquals("fake-jwt-token", result.get("token"));
        assertEquals("123456789012", result.get("accountNumber"));
    }

    // ---- forgotPassword / resetPassword ----

    @Test
    void shouldRejectForgotPasswordForUnknownEmail() {
        setUp();
        when(customers.findByEmail("jane@example.com")).thenReturn(Optional.empty());
        ApiException ex = assertThrows(ApiException.class,
                () -> service.forgotPassword(body("email", "jane@example.com")));
        assertEquals("CUSTOMER_NOT_FOUND", ex.getErrorCode());
    }

    @Test
    void shouldRejectResetPasswordWithShortPassword() {
        setUp();
        ApiException ex = assertThrows(ApiException.class, () -> service.resetPassword(
                body("email", "jane@example.com", "otp", "123456", "newPassword", "short")));
        assertEquals("WEAK_PASSWORD", ex.getErrorCode());
    }

    @Test
    void shouldRejectResetPasswordWithWrongOtp() {
        setUp();
        Customer customer = mockCustomerWithId(1L);
        when(customers.findByEmail("jane@example.com")).thenReturn(Optional.of(customer));
        service.forgotPassword(body("email", "jane@example.com"));

        ApiException ex = assertThrows(ApiException.class, () -> service.resetPassword(
                body("email", "jane@example.com", "otp", "000000", "newPassword", "longenoughpassword")));
        assertEquals("INVALID_OTP", ex.getErrorCode());
    }

    @Test
    void shouldResetPasswordWithCorrectOtp() {
        setUp();
        Customer customer = mockCustomerWithId(1L);
        customer.setEmail("jane@example.com");
        when(customers.findByEmail("jane@example.com")).thenReturn(Optional.of(customer));

        service.forgotPassword(body("email", "jane@example.com"));
        var otpCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(emailService).sendOtp(eq("jane@example.com"), otpCaptor.capture(), anyString());

        Map<String, Object> result = service.resetPassword(
                body("email", "jane@example.com", "otp", otpCaptor.getValue(), "newPassword", "longenoughpassword"));

        assertEquals("jane@example.com", result.get("email"));
        assertEquals(true, ENCODER.matches("longenoughpassword", customer.getPasswordHash()));
    }

    private Customer mockCustomerWithId(Long id) {
        Customer customer = new Customer();
        // customerId is only assigned by JPA on save in production; tests that need
        // a specific id reach for it via reflection since Customer has no public setter.
        org.springframework.test.util.ReflectionTestUtils.setField(customer, "customerId", id);
        return customer;
    }
}

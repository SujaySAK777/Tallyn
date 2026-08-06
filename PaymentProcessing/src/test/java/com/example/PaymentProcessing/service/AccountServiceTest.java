package com.example.PaymentProcessing.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.example.PaymentProcessing.api.AccountResponse;
import com.example.PaymentProcessing.api.CheckBalanceRequest;
import com.example.PaymentProcessing.api.CreateAccountRequest;
import com.example.PaymentProcessing.api.SetTpinRequest;
import com.example.PaymentProcessing.api.SimulateAccountRequest;
import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.model.Account;
import com.example.PaymentProcessing.model.AccountStatus;
import com.example.PaymentProcessing.repository.AccountRepository;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class AccountServiceTest {

    private static final BCryptPasswordEncoder ENCODER = new BCryptPasswordEncoder();

    @Test
    void shouldCreateAccountWithHashedTpin() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        CreateAccountRequest request = new CreateAccountRequest();
        request.setBankName(" HDFC BANK ");
        request.setAccountNumber(" 123456789012 ");
        request.setAccountHolderName(" Jane Doe ");
        request.setBalance(BigDecimal.valueOf(1000));
        request.setTpin("123456");
        request.setCurrency(" inr ");

        when(repository.findByAccountNumber("123456789012")).thenReturn(Optional.empty());
        when(repository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AccountResponse response = service.createAccount(request);

        assertEquals("HDFC BANK", response.getBankName());
        assertEquals("123456789012", response.getAccountNumber());
        assertEquals("Jane Doe", response.getAccountHolderName());
        assertEquals("INR", response.getCurrency());
        assertEquals(AccountStatus.ACTIVE, response.getStatus());
    }

    @Test
    void shouldRejectDuplicateAccountNumberOnCreate() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        CreateAccountRequest request = validCreateRequest();
        when(repository.findByAccountNumber(request.getAccountNumber().trim())).thenReturn(Optional.of(new Account()));

        ApiException ex = assertThrows(ApiException.class, () -> service.createAccount(request));
        assertEquals("DUPLICATE_ACCOUNT", ex.getErrorCode());
    }

    @Test
    void shouldRejectNegativeBalanceOnCreate() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        CreateAccountRequest request = validCreateRequest();
        request.setBalance(BigDecimal.valueOf(-1));

        ApiException ex = assertThrows(ApiException.class, () -> service.createAccount(request));
        assertEquals("INVALID_BALANCE", ex.getErrorCode());
    }

    @Test
    void shouldAllowZeroBalanceOnCreate() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        CreateAccountRequest request = validCreateRequest();
        request.setBalance(BigDecimal.ZERO);
        when(repository.findByAccountNumber(anyString())).thenReturn(Optional.empty());
        when(repository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AccountResponse response = service.createAccount(request);
        assertEquals(0, BigDecimal.ZERO.compareTo(response.getBalance()));
    }

    @Test
    void shouldRejectTpinThatIsNotSixDigits() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        CreateAccountRequest request = validCreateRequest();
        request.setTpin("12345");

        ApiException ex = assertThrows(ApiException.class, () -> service.createAccount(request));
        assertEquals("INVALID_TPIN", ex.getErrorCode());
    }

    @Test
    void shouldRejectMissingRequiredFieldsOnCreate() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        ApiException ex = assertThrows(ApiException.class, () -> service.createAccount(null));
        assertEquals("VALIDATION_FAILED", ex.getErrorCode());
    }

    @Test
    void shouldSimulateAccountAsInactiveWithRandomTpin() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        SimulateAccountRequest request = new SimulateAccountRequest();
        request.setBankName("ICICI BANK");
        request.setMobileNumber("9876543210");
        request.setCurrency("INR");

        when(repository.findByMobileNumber("9876543210")).thenReturn(Optional.empty());
        when(repository.findByAccountNumber(anyString())).thenReturn(Optional.empty());
        when(repository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AccountResponse response = service.simulateAccount(request, 42L);

        assertEquals(AccountStatus.INACTIVE, response.getStatus());
        assertTrue(response.getIfscCode().startsWith("ICIC0"));
    }

    @Test
    void shouldRejectSimulateRequestWithInvalidMobileNumber() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        SimulateAccountRequest request = new SimulateAccountRequest();
        request.setBankName("HDFC BANK");
        request.setMobileNumber("12345"); // not 10 digits

        ApiException ex = assertThrows(ApiException.class, () -> service.simulateAccount(request, 1L));
        assertEquals("VALIDATION_FAILED", ex.getErrorCode());
    }

    @Test
    void shouldFallBackToDefaultIfscPrefixForUnknownBank() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        when(repository.findByAccountNumber(anyString())).thenReturn(Optional.empty());
        when(repository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Account account = service.provisionSimulatedAccount("Some Random Bank", "Holder", "INR", null, null);

        assertTrue(account.getIfscCode().startsWith("SIML0"));
    }

    @Test
    void shouldAllowReusingMobileNumberForSameCustomer() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        Account existing = new Account();
        existing.setCustomerId(5L);
        when(repository.findByMobileNumber("9876543210")).thenReturn(Optional.of(existing));
        when(repository.findByAccountNumber(anyString())).thenReturn(Optional.empty());
        when(repository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Account account = service.provisionSimulatedAccount("HDFC BANK", "Holder", "INR", 5L, "9876543210");

        assertEquals(5L, account.getCustomerId());
    }

    @Test
    void shouldRejectMobileNumberAlreadyLinkedToAnotherCustomer() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        Account existing = new Account();
        existing.setCustomerId(999L);
        when(repository.findByMobileNumber("9876543210")).thenReturn(Optional.of(existing));

        ApiException ex = assertThrows(ApiException.class,
                () -> service.provisionSimulatedAccount("HDFC BANK", "Holder", "INR", 5L, "9876543210"));
        assertEquals("MOBILE_NUMBER_ALREADY_USED", ex.getErrorCode());
    }

    @Test
    void shouldRejectMobileNumberLinkedToAccountWithNoOwner() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        Account existing = new Account();
        existing.setCustomerId(null);
        when(repository.findByMobileNumber("9876543210")).thenReturn(Optional.of(existing));

        ApiException ex = assertThrows(ApiException.class,
                () -> service.provisionSimulatedAccount("HDFC BANK", "Holder", "INR", 5L, "9876543210"));
        assertEquals("MOBILE_NUMBER_ALREADY_USED", ex.getErrorCode());
    }

    @Test
    void shouldRetryAccountNumberGenerationUntilUnique() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        Account collision = new Account();
        when(repository.findByAccountNumber(anyString()))
                .thenReturn(Optional.of(collision))
                .thenReturn(Optional.empty());
        when(repository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Account account = service.provisionSimulatedAccount("HDFC BANK", "Holder", "INR", null, null);

        assertTrue(account.getAccountNumber().matches("\\d{12}"));
    }

    @Test
    void shouldGenerateUpiIdFromMobileNumberWhenSimulatingAccount() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        when(repository.findByMobileNumber("9876543210")).thenReturn(Optional.empty());
        when(repository.findByAccountNumber(anyString())).thenReturn(Optional.empty());
        when(repository.findByUpiId(anyString())).thenReturn(Optional.empty());
        when(repository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Account account = service.provisionSimulatedAccount("HDFC BANK", "Jane Doe", "INR", 5L, "9876543210");

        assertTrue(account.getUpiId().matches("9876543210\\d{3}@tallyn"));
    }

    @Test
    void shouldGenerateUpiIdFromNameWhenNoMobileNumber() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        when(repository.findByAccountNumber(anyString())).thenReturn(Optional.empty());
        when(repository.findByUpiId(anyString())).thenReturn(Optional.empty());
        when(repository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Account account = service.provisionSimulatedAccount("HDFC BANK", "Jane Doe", "INR", null, null);

        assertTrue(account.getUpiId().matches("janedoe\\d{3}@tallyn"));
    }

    @Test
    void shouldRetryUpiIdGenerationUntilUnique() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        when(repository.findByAccountNumber(anyString())).thenReturn(Optional.empty());
        when(repository.findByUpiId(anyString()))
                .thenReturn(Optional.of(new Account()))
                .thenReturn(Optional.empty());
        when(repository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Account account = service.provisionSimulatedAccount("HDFC BANK", "Jane Doe", "INR", null, null);

        assertTrue(account.getUpiId().endsWith("@tallyn"));
    }

    @Test
    void shouldLookupAccountByUpiId() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        Account account = new Account();
        account.setUpiId("janedoe123@tallyn");
        account.setAccountHolderName("Jane Doe");
        when(repository.findByUpiId("janedoe123@tallyn")).thenReturn(Optional.of(account));

        AccountResponse response = service.getAccountByUpiId("janedoe123@tallyn");
        assertEquals("Jane Doe", response.getAccountHolderName());
    }

    @Test
    void shouldReturnAccountNotFoundForUnknownUpiId() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);
        when(repository.findByUpiId("nobody@tallyn")).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class, () -> service.getAccountByUpiId("nobody@tallyn"));
        assertEquals("ACCOUNT_NOT_FOUND", ex.getErrorCode());
    }

    @Test
    void shouldSetTpinAndActivateAccount() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        Account account = new Account();
        account.setAccountId(1L);
        account.setStatus(AccountStatus.INACTIVE);
        when(repository.findById(1L)).thenReturn(Optional.of(account));
        when(repository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SetTpinRequest request = new SetTpinRequest();
        request.setTpin("654321");
        request.setConfirmTpin("654321");

        AccountResponse response = service.setTpin(1L, request);

        assertEquals(AccountStatus.ACTIVE, response.getStatus());
    }

    @Test
    void shouldRejectMismatchedTpinConfirmation() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        SetTpinRequest request = new SetTpinRequest();
        request.setTpin("654321");
        request.setConfirmTpin("111111");

        ApiException ex = assertThrows(ApiException.class, () -> service.setTpin(1L, request));
        assertEquals("TPIN_MISMATCH", ex.getErrorCode());
    }

    @Test
    void shouldRejectSetTpinForMissingAccount() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);
        when(repository.findById(1L)).thenReturn(Optional.empty());

        SetTpinRequest request = new SetTpinRequest();
        request.setTpin("654321");
        request.setConfirmTpin("654321");

        ApiException ex = assertThrows(ApiException.class, () -> service.setTpin(1L, request));
        assertEquals("ACCOUNT_NOT_FOUND", ex.getErrorCode());
    }

    @Test
    void shouldReturnAccountNotFoundForUnknownId() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);
        when(repository.findById(99L)).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class, () -> service.getAccount(99L));
        assertEquals("ACCOUNT_NOT_FOUND", ex.getErrorCode());
    }

    @Test
    void shouldCheckBalanceWithCorrectTpin() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        Account account = new Account();
        account.setAccountNumber("123456789012");
        account.setAccountHolderName("Jane Doe");
        account.setBalance(BigDecimal.valueOf(500));
        account.setCurrency("INR");
        account.setTpinHash(ENCODER.encode("123456"));
        when(repository.findByAccountNumber("123456789012")).thenReturn(Optional.of(account));

        CheckBalanceRequest request = new CheckBalanceRequest();
        request.setAccountNumber("123456789012");
        request.setTpin("123456");

        var response = service.checkBalance(request);
        assertEquals(0, BigDecimal.valueOf(500).compareTo(response.getBalance()));
    }

    @Test
    void shouldRejectCheckBalanceWithWrongTpin() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        Account account = new Account();
        account.setAccountNumber("123456789012");
        account.setTpinHash(ENCODER.encode("123456"));
        when(repository.findByAccountNumber("123456789012")).thenReturn(Optional.of(account));

        CheckBalanceRequest request = new CheckBalanceRequest();
        request.setAccountNumber("123456789012");
        request.setTpin("000000");

        ApiException ex = assertThrows(ApiException.class, () -> service.checkBalance(request));
        assertEquals("INVALID_TPIN", ex.getErrorCode());
    }

    @Test
    void shouldRejectCheckBalanceWithMissingFields() {
        AccountRepository repository = mock(AccountRepository.class);
        AccountService service = new AccountService(repository);

        ApiException ex = assertThrows(ApiException.class, () -> service.checkBalance(new CheckBalanceRequest()));
        assertEquals("VALIDATION_FAILED", ex.getErrorCode());
    }

    private CreateAccountRequest validCreateRequest() {
        CreateAccountRequest request = new CreateAccountRequest();
        request.setBankName("HDFC BANK");
        request.setAccountNumber("123456789012");
        request.setAccountHolderName("Jane Doe");
        request.setBalance(BigDecimal.valueOf(1000));
        request.setTpin("123456");
        request.setCurrency("INR");
        return request;
    }
}

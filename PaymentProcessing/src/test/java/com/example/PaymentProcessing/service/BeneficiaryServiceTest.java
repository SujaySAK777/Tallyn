package com.example.PaymentProcessing.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.PaymentProcessing.api.BeneficiaryResponse;
import com.example.PaymentProcessing.api.CreateBeneficiaryRequest;
import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.model.Account;
import com.example.PaymentProcessing.model.Beneficiary;
import com.example.PaymentProcessing.repository.AccountRepository;
import com.example.PaymentProcessing.repository.BeneficiaryRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class BeneficiaryServiceTest {

    @Test
    void shouldCreateBeneficiaryFromExistingAccount() {
        BeneficiaryRepository beneficiaryRepository = mock(BeneficiaryRepository.class);
        AccountRepository accountRepository = mock(AccountRepository.class);
        BeneficiaryService service = new BeneficiaryService(beneficiaryRepository, accountRepository);

        Account account = new Account();
        account.setAccountNumber("123456789012");
        account.setAccountHolderName("Jane Doe");
        account.setBankName("HDFC BANK");
        account.setIfscCode("HDFC0001234");
        account.setCustomerId(50L);

        when(accountRepository.findByAccountNumber("123456789012")).thenReturn(Optional.of(account));
        when(beneficiaryRepository.existsByCustomerIdAndAccountNumber(1L, "123456789012")).thenReturn(false);
        when(beneficiaryRepository.save(any(Beneficiary.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateBeneficiaryRequest request = new CreateBeneficiaryRequest();
        request.setAccountNumber("123456789012");
        request.setNickname("  Jane  ");

        BeneficiaryResponse response = service.create(request, 1L);

        assertEquals("Jane Doe", response.getAccountHolderName());
        assertEquals("Jane", response.getNickname());
    }

    @Test
    void shouldTreatBlankNicknameAsNull() {
        BeneficiaryRepository beneficiaryRepository = mock(BeneficiaryRepository.class);
        AccountRepository accountRepository = mock(AccountRepository.class);
        BeneficiaryService service = new BeneficiaryService(beneficiaryRepository, accountRepository);

        Account account = new Account();
        account.setAccountNumber("123456789012");
        account.setAccountHolderName("Jane Doe");
        account.setBankName("HDFC BANK");
        account.setCustomerId(50L);

        when(accountRepository.findByAccountNumber("123456789012")).thenReturn(Optional.of(account));
        when(beneficiaryRepository.existsByCustomerIdAndAccountNumber(1L, "123456789012")).thenReturn(false);
        when(beneficiaryRepository.save(any(Beneficiary.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateBeneficiaryRequest request = new CreateBeneficiaryRequest();
        request.setAccountNumber("123456789012");
        request.setNickname("   ");

        BeneficiaryResponse response = service.create(request, 1L);

        assertEquals(null, response.getNickname());
    }

    @Test
    void shouldRejectCreateWithMissingAccountNumber() {
        BeneficiaryRepository beneficiaryRepository = mock(BeneficiaryRepository.class);
        AccountRepository accountRepository = mock(AccountRepository.class);
        BeneficiaryService service = new BeneficiaryService(beneficiaryRepository, accountRepository);

        ApiException ex = assertThrows(ApiException.class, () -> service.create(new CreateBeneficiaryRequest(), 1L));
        assertEquals("VALIDATION_FAILED", ex.getErrorCode());
    }

    @Test
    void shouldRejectCreateWhenAccountNotFound() {
        BeneficiaryRepository beneficiaryRepository = mock(BeneficiaryRepository.class);
        AccountRepository accountRepository = mock(AccountRepository.class);
        BeneficiaryService service = new BeneficiaryService(beneficiaryRepository, accountRepository);

        when(accountRepository.findByAccountNumber("999")).thenReturn(Optional.empty());

        CreateBeneficiaryRequest request = new CreateBeneficiaryRequest();
        request.setAccountNumber("999");

        ApiException ex = assertThrows(ApiException.class, () -> service.create(request, 1L));
        assertEquals("ACCOUNT_NOT_FOUND", ex.getErrorCode());
    }

    @Test
    void shouldRejectAddingOwnAccountAsBeneficiary() {
        BeneficiaryRepository beneficiaryRepository = mock(BeneficiaryRepository.class);
        AccountRepository accountRepository = mock(AccountRepository.class);
        BeneficiaryService service = new BeneficiaryService(beneficiaryRepository, accountRepository);

        Account account = new Account();
        account.setAccountNumber("123456789012");
        account.setCustomerId(1L);
        when(accountRepository.findByAccountNumber("123456789012")).thenReturn(Optional.of(account));

        CreateBeneficiaryRequest request = new CreateBeneficiaryRequest();
        request.setAccountNumber("123456789012");

        ApiException ex = assertThrows(ApiException.class, () -> service.create(request, 1L));
        assertEquals("VALIDATION_FAILED", ex.getErrorCode());
    }

    @Test
    void shouldNotFlagSelfAddWhenAccountHasNoOwner() {
        // An account with a null customerId should not be mistaken for the caller's own account.
        BeneficiaryRepository beneficiaryRepository = mock(BeneficiaryRepository.class);
        AccountRepository accountRepository = mock(AccountRepository.class);
        BeneficiaryService service = new BeneficiaryService(beneficiaryRepository, accountRepository);

        Account account = new Account();
        account.setAccountNumber("123456789012");
        account.setAccountHolderName("Jane Doe");
        account.setBankName("HDFC BANK");
        account.setCustomerId(null);

        when(accountRepository.findByAccountNumber("123456789012")).thenReturn(Optional.of(account));
        when(beneficiaryRepository.existsByCustomerIdAndAccountNumber(1L, "123456789012")).thenReturn(false);
        when(beneficiaryRepository.save(any(Beneficiary.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateBeneficiaryRequest request = new CreateBeneficiaryRequest();
        request.setAccountNumber("123456789012");

        BeneficiaryResponse response = service.create(request, 1L);
        assertEquals("Jane Doe", response.getAccountHolderName());
    }

    @Test
    void shouldRejectDuplicateBeneficiary() {
        BeneficiaryRepository beneficiaryRepository = mock(BeneficiaryRepository.class);
        AccountRepository accountRepository = mock(AccountRepository.class);
        BeneficiaryService service = new BeneficiaryService(beneficiaryRepository, accountRepository);

        Account account = new Account();
        account.setAccountNumber("123456789012");
        account.setCustomerId(50L);
        when(accountRepository.findByAccountNumber("123456789012")).thenReturn(Optional.of(account));
        when(beneficiaryRepository.existsByCustomerIdAndAccountNumber(1L, "123456789012")).thenReturn(true);

        CreateBeneficiaryRequest request = new CreateBeneficiaryRequest();
        request.setAccountNumber("123456789012");

        ApiException ex = assertThrows(ApiException.class, () -> service.create(request, 1L));
        assertEquals("DUPLICATE_BENEFICIARY", ex.getErrorCode());
    }

    @Test
    void shouldListBeneficiariesFilteredBySearch() {
        BeneficiaryRepository beneficiaryRepository = mock(BeneficiaryRepository.class);
        AccountRepository accountRepository = mock(AccountRepository.class);
        BeneficiaryService service = new BeneficiaryService(beneficiaryRepository, accountRepository);

        Beneficiary match = new Beneficiary();
        match.setAccountHolderName("Jane Doe");
        match.setAccountNumber("123456789012");
        match.setBankName("HDFC BANK");

        Beneficiary noMatch = new Beneficiary();
        noMatch.setAccountHolderName("Bob Smith");
        noMatch.setAccountNumber("999999999999");
        noMatch.setBankName("ICICI BANK");

        when(beneficiaryRepository.findByCustomerIdOrderByAccountHolderNameAsc(1L)).thenReturn(List.of(match, noMatch));

        List<BeneficiaryResponse> results = service.list(1L, "jane");

        assertEquals(1, results.size());
        assertEquals("Jane Doe", results.get(0).getAccountHolderName());
    }

    @Test
    void shouldListAllBeneficiariesWhenSearchIsNull() {
        BeneficiaryRepository beneficiaryRepository = mock(BeneficiaryRepository.class);
        AccountRepository accountRepository = mock(AccountRepository.class);
        BeneficiaryService service = new BeneficiaryService(beneficiaryRepository, accountRepository);

        Beneficiary beneficiary = new Beneficiary();
        beneficiary.setAccountHolderName("Jane Doe");
        beneficiary.setAccountNumber("123456789012");
        beneficiary.setBankName("HDFC BANK");
        beneficiary.setNickname(null);

        when(beneficiaryRepository.findByCustomerIdOrderByAccountHolderNameAsc(1L)).thenReturn(List.of(beneficiary));

        List<BeneficiaryResponse> results = service.list(1L, null);
        assertEquals(1, results.size());
    }

    @Test
    void shouldDeleteBeneficiaryOwnedByCustomer() {
        BeneficiaryRepository beneficiaryRepository = mock(BeneficiaryRepository.class);
        AccountRepository accountRepository = mock(AccountRepository.class);
        BeneficiaryService service = new BeneficiaryService(beneficiaryRepository, accountRepository);

        Beneficiary beneficiary = new Beneficiary();
        beneficiary.setBeneficiaryId(10L);
        beneficiary.setCustomerId(1L);
        when(beneficiaryRepository.findById(10L)).thenReturn(Optional.of(beneficiary));

        service.delete(10L, 1L);

        verify(beneficiaryRepository).delete(beneficiary);
    }

    @Test
    void shouldRejectDeletingSomeoneElsesBeneficiary() {
        BeneficiaryRepository beneficiaryRepository = mock(BeneficiaryRepository.class);
        AccountRepository accountRepository = mock(AccountRepository.class);
        BeneficiaryService service = new BeneficiaryService(beneficiaryRepository, accountRepository);

        Beneficiary beneficiary = new Beneficiary();
        beneficiary.setBeneficiaryId(10L);
        beneficiary.setCustomerId(1L);
        when(beneficiaryRepository.findById(10L)).thenReturn(Optional.of(beneficiary));

        ApiException ex = assertThrows(ApiException.class, () -> service.delete(10L, 999L));
        assertEquals("FORBIDDEN", ex.getErrorCode());
        verify(beneficiaryRepository, never()).delete(any(Beneficiary.class));
    }

    @Test
    void shouldThrowWhenDeletingMissingBeneficiary() {
        BeneficiaryRepository beneficiaryRepository = mock(BeneficiaryRepository.class);
        AccountRepository accountRepository = mock(AccountRepository.class);
        BeneficiaryService service = new BeneficiaryService(beneficiaryRepository, accountRepository);

        when(beneficiaryRepository.findById(10L)).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class, () -> service.delete(10L, 1L));
        assertEquals("BENEFICIARY_NOT_FOUND", ex.getErrorCode());
    }
}

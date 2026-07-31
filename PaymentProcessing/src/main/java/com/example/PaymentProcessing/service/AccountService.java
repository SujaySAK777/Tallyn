package com.example.PaymentProcessing.service;

import com.example.PaymentProcessing.api.AccountResponse;
import com.example.PaymentProcessing.api.CreateAccountRequest;
import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.model.Account;
import com.example.PaymentProcessing.model.AccountStatus;
import com.example.PaymentProcessing.repository.AccountRepository;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {

    private static final BCryptPasswordEncoder BCRYPT_ENCODER = new BCryptPasswordEncoder();

    private final AccountRepository accountRepository;

    public AccountService(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @Transactional
    public AccountResponse createAccount(CreateAccountRequest request) {
        validateCreateRequest(request);

        String normalizedAccountNumber = request.getAccountNumber().trim();
        accountRepository.findByAccountNumberIgnoreCase(normalizedAccountNumber)
                .ifPresent(existing -> {
                    throw new ApiException(
                            "DUPLICATE_ACCOUNT",
                            "accountNumber already exists",
                            HttpStatus.CONFLICT
                    );
                });

        Account account = new Account();
        account.setAccountNumber(normalizedAccountNumber);
        account.setAccountHolderName(request.getAccountHolderName().trim());
        account.setBalance(request.getBalance());
        account.setCurrency(request.getCurrency().trim().toUpperCase());
        account.setBankName(request.getBankName().trim());
        account.setTpin(BCRYPT_ENCODER.encode(request.getTpin().trim()));
        account.setStatus(AccountStatus.ACTIVE);

        Account saved = accountRepository.save(account);
        return AccountResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> listAccounts() {
        return accountRepository.findAll()
                .stream()
                .map(AccountResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public AccountResponse getAccount(Long accountId) {
        return AccountResponse.fromEntity(findAccount(accountId));
    }

    private Account findAccount(Long accountId) {
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new ApiException("ACCOUNT_NOT_FOUND", "Account not found", HttpStatus.NOT_FOUND));
    }

    private void validateCreateRequest(CreateAccountRequest request) {
        if (request == null
                || request.getAccountNumber() == null
                || request.getAccountNumber().isBlank()
                || request.getAccountHolderName() == null
                || request.getAccountHolderName().isBlank()
                || request.getBalance() == null
                || request.getCurrency() == null
                || request.getCurrency().isBlank()
                || request.getBankName() == null
                || request.getBankName().isBlank()
                || request.getTpin() == null
                || request.getTpin().isBlank()) {
            throw new ApiException("VALIDATION_FAILED", "Required fields are missing", HttpStatus.BAD_REQUEST);
        }

        if (request.getBalance().compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException("INVALID_AMOUNT", "balance cannot be negative", HttpStatus.BAD_REQUEST);
        }

        if (request.getCurrency().trim().length() != 3) {
            throw new ApiException("INVALID_CURRENCY", "currency must be 3 characters", HttpStatus.BAD_REQUEST);
        }

        if (!request.getTpin().trim().matches("\\d{6}")) {
            throw new ApiException("INVALID_TPIN", "tpin must be exactly 6 digits", HttpStatus.BAD_REQUEST);
        }
    }
}
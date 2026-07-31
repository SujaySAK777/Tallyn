package com.example.PaymentProcessing.service;

import com.example.PaymentProcessing.api.AccountResponse;
import com.example.PaymentProcessing.api.BalanceResponse;
import com.example.PaymentProcessing.api.CheckBalanceRequest;
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

    private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();

    private final AccountRepository accountRepository;

    public AccountService(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @Transactional
    public AccountResponse createAccount(CreateAccountRequest request) {
        validateCreateRequest(request);

        accountRepository.findByAccountNumber(request.getAccountNumber())
                .ifPresent(existing -> {
                    throw new ApiException("DUPLICATE_ACCOUNT", "accountNumber already exists", HttpStatus.CONFLICT);
                });

        Account account = new Account();
        account.setBankName(request.getBankName().trim());
        account.setAccountNumber(request.getAccountNumber().trim());
        account.setAccountHolderName(request.getAccountHolderName().trim());
        account.setBalance(request.getBalance());
        account.setTpinHash(PASSWORD_ENCODER.encode(request.getTpin()));
        account.setCurrency(request.getCurrency().trim().toUpperCase());
        account.setStatus(request.getStatus() == null ? AccountStatus.ACTIVE : request.getStatus());

        return AccountResponse.fromEntity(accountRepository.save(account));
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> listAccounts() {
        return accountRepository.findAll().stream().map(AccountResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public AccountResponse getAccount(Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ApiException("ACCOUNT_NOT_FOUND", "Account not found", HttpStatus.NOT_FOUND));
        return AccountResponse.fromEntity(account);
    }

    @Transactional(readOnly = true)
    public BalanceResponse checkBalance(CheckBalanceRequest request) {
        if (request == null
                || request.getAccountNumber() == null
                || request.getAccountNumber().isBlank()
                || request.getTpin() == null
                || request.getTpin().isBlank()) {
            throw new ApiException("VALIDATION_FAILED", "account_number and tpin are required", HttpStatus.BAD_REQUEST);
        }

        Account account = accountRepository.findByAccountNumber(request.getAccountNumber().trim())
                .orElseThrow(() -> new ApiException("ACCOUNT_NOT_FOUND", "Account not found", HttpStatus.NOT_FOUND));

        if (!PASSWORD_ENCODER.matches(request.getTpin(), account.getTpinHash())) {
            throw new ApiException("INVALID_TPIN", "Invalid tpin", HttpStatus.UNAUTHORIZED);
        }

        BalanceResponse response = new BalanceResponse();
        response.setAccountNumber(account.getAccountNumber());
        response.setAccountHolderName(account.getAccountHolderName());
        response.setBalance(account.getBalance());
        response.setCurrency(account.getCurrency());
        return response;
    }

    private void validateCreateRequest(CreateAccountRequest request) {
        if (request == null
                || request.getBankName() == null
                || request.getBankName().isBlank()
                || request.getAccountNumber() == null
                || request.getAccountNumber().isBlank()
                || request.getAccountHolderName() == null
                || request.getAccountHolderName().isBlank()
                || request.getBalance() == null
                || request.getTpin() == null
                || request.getTpin().isBlank()
                || request.getCurrency() == null
                || request.getCurrency().isBlank()) {
            throw new ApiException("VALIDATION_FAILED", "Required fields are missing", HttpStatus.BAD_REQUEST);
        }

        if (request.getBalance().compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException("INVALID_BALANCE", "balance cannot be negative", HttpStatus.BAD_REQUEST);
        }

        if (!request.getTpin().matches("\\d{6}")) {
            throw new ApiException("INVALID_TPIN", "tpin must be exactly 6 digits", HttpStatus.BAD_REQUEST);
        }
    }
}

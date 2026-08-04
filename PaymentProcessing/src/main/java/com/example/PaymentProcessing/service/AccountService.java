package com.example.PaymentProcessing.service;

import com.example.PaymentProcessing.api.AccountResponse;
import com.example.PaymentProcessing.api.BalanceResponse;
import com.example.PaymentProcessing.api.CheckBalanceRequest;
import com.example.PaymentProcessing.api.CreateAccountRequest;
import com.example.PaymentProcessing.api.SetTpinRequest;
import com.example.PaymentProcessing.api.SimulateAccountRequest;
import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.model.Account;
import com.example.PaymentProcessing.model.AccountStatus;
import com.example.PaymentProcessing.repository.AccountRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {

    private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();
    // Each bank has a real-world IFSC prefix; used only to make the simulated
    // fetch look realistic. Extend this map (or reject unknown banks here)
    // when you add the "bank not found" test case.
    private static final Map<String, String> BANK_IFSC_PREFIXES = Map.of(
            "HDFC BANK", "HDFC0",
            "ICICI BANK", "ICIC0",
            "STATE BANK OF INDIA", "SBIN0",
            "AXIS BANK", "UTIB0"
    );
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

    @Transactional
    public AccountResponse simulateAccount(SimulateAccountRequest request, Long authenticatedCustomerId) {
        validateSimulateRequest(request);
        // customerId always comes from the verified JWT, never the request
        // body — otherwise any caller could link a simulated account to
        // someone else's customer ID.
        Account saved = provisionSimulatedAccount(
                request.getBankName(),
                request.getAccountHolderName(),
                request.getCurrency(),
                authenticatedCustomerId
        );
        return AccountResponse.fromEntity(saved);
    }

    // Shared by simulateAccount() (Dashboard "Add Account") and
    // OnboardingService.linkAccount() (welcome-page signup): this app is a
    // payment gateway, so the customer already has a real bank account. We
    // can't call a real bank's API from a learning project, so we simulate
    // fetching that account's IFSC, account number, and pre-existing balance
    // instead of asking the customer to type them in.
    @Transactional
    public Account provisionSimulatedAccount(String bankName, String accountHolderName, String currency, Long customerId) {
        String name = (bankName == null || bankName.isBlank()) ? "Unknown Bank" : bankName.trim();
        String prefix = BANK_IFSC_PREFIXES.getOrDefault(name.toUpperCase(), "SIML0");

        Account account = new Account();
        account.setBankName(name);
        account.setIfscCode(prefix + randomDigits(6));
        account.setAccountNumber(generateUniqueAccountNumber());
        account.setAccountHolderName(
                accountHolderName != null && !accountHolderName.isBlank() ? accountHolderName.trim() : "Account Holder"
        );
        account.setBalance(randomBalance());
        account.setCurrency(currency == null || currency.isBlank() ? "INR" : currency.trim().toUpperCase());
        account.setStatus(AccountStatus.INACTIVE);
        // Placeholder until the customer sets a real TPIN; account stays
        // INACTIVE (unusable for payments) until then.
        account.setTpinHash(PASSWORD_ENCODER.encode(randomDigits(6)));
        if (customerId != null) {
            account.setCustomerId(customerId);
        }
        return accountRepository.save(account);
    }

    @Transactional
    public AccountResponse setTpin(Long accountId, SetTpinRequest request) {
        if (request == null || request.getTpin() == null || !request.getTpin().matches("\\d{6}")) {
            throw new ApiException("INVALID_TPIN", "tpin must be exactly 6 digits", HttpStatus.BAD_REQUEST);
        }
        if (!request.getTpin().equals(request.getConfirmTpin())) {
            throw new ApiException("TPIN_MISMATCH", "tpin and confirm_tpin must match", HttpStatus.BAD_REQUEST);
        }

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ApiException("ACCOUNT_NOT_FOUND", "Account not found", HttpStatus.NOT_FOUND));

        account.setTpinHash(PASSWORD_ENCODER.encode(request.getTpin()));
        account.setStatus(AccountStatus.ACTIVE);
        return AccountResponse.fromEntity(accountRepository.save(account));
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> listAccountsForCustomer(Long customerId) {
        return accountRepository.findByCustomerId(customerId).stream().map(AccountResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public AccountResponse getAccount(Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ApiException("ACCOUNT_NOT_FOUND", "Account not found", HttpStatus.NOT_FOUND));
        return AccountResponse.fromEntity(account);
    }

    @Transactional(readOnly = true)
    public AccountResponse getAccountByNumber(String accountNumber) {
        Account account = accountRepository.findByAccountNumber(accountNumber.trim())
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

        private void validateSimulateRequest(SimulateAccountRequest request) {
            if (request == null
                    || request.getBankName() == null || request.getBankName().isBlank()
                    || request.getMobileNumber() == null || !request.getMobileNumber().matches("\\d{10}")) {
                throw new ApiException("VALIDATION_FAILED", "bank_name and a valid 10-digit mobile_number are required", HttpStatus.BAD_REQUEST);
            }
        }

        private String randomDigits(int count) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < count; i++) {
                sb.append(ThreadLocalRandom.current().nextInt(0, 10));
            }
            return sb.toString();
        }

        private BigDecimal randomBalance() {
            // Simulated "pre-existing" balance: ₹5,000.00 – ₹5,00,000.00
            long paise = ThreadLocalRandom.current().nextLong(500_000, 50_000_000);
            return BigDecimal.valueOf(paise, 2);
        }

        private String generateUniqueAccountNumber() {
            String candidate;
            do {
                candidate = randomDigits(12);
            } while (accountRepository.findByAccountNumber(candidate).isPresent());
            return candidate;
    }
}

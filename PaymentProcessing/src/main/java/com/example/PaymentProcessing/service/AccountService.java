package com.example.PaymentProcessing.service;

import com.example.PaymentProcessing.api.AccountResponse;
import com.example.PaymentProcessing.api.BalanceResponse;
import com.example.PaymentProcessing.api.CheckBalanceRequest;
import com.example.PaymentProcessing.api.CreateAccountRequest;
import com.example.PaymentProcessing.api.SetTpinRequest;
import com.example.PaymentProcessing.api.SimulateAccountCreateRequest;
import com.example.PaymentProcessing.api.SimulateAccountResponse;
import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.model.Account;
import com.example.PaymentProcessing.model.AccountStatus;
import com.example.PaymentProcessing.repository.AccountRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {

    private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();
    private static final Random RANDOM = new Random();

    // Bank name → sample IFSC codes
    private static final Map<String, String[]> BANK_IFSC_MAP = new LinkedHashMap<>();
    static {
        BANK_IFSC_MAP.put("HDFC",  new String[]{"HDFC0001234", "HDFC0005678", "HDFC0009012"});
        BANK_IFSC_MAP.put("IDFC",  new String[]{"IDFB0010001", "IDFB0010002", "IDFB0010003"});
        BANK_IFSC_MAP.put("HSBC",  new String[]{"HSBC0400002", "HSBC0110004", "HSBC0700001"});
        BANK_IFSC_MAP.put("SBI",   new String[]{"SBIN0001234", "SBIN0005678", "SBIN0009999"});
        BANK_IFSC_MAP.put("ICICI", new String[]{"ICIC0001234", "ICIC0005678", "ICIC0009012"});
        BANK_IFSC_MAP.put("AXIS",  new String[]{"UTIB0001234", "UTIB0005678", "UTIB0009012"});
        BANK_IFSC_MAP.put("KOTAK", new String[]{"KKBK0001234", "KKBK0005678", "KKBK0009012"});
        BANK_IFSC_MAP.put("PNB",   new String[]{"PUNB0001234", "PUNB0005678", "PUNB0009012"});
    }

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
    public List<AccountResponse> listAccountsByCustomer(Long customerId) {
        List<Long> ids = accountRepository.findAccountIdsByCustomerId(customerId);
        if (ids.isEmpty()) return List.of();
        return accountRepository.findAllById(ids).stream().map(AccountResponse::fromEntity).toList();
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

    public List<String> getBanks() {
        return new ArrayList<>(BANK_IFSC_MAP.keySet());
    }

    @Transactional(readOnly = true)
    public SimulateAccountResponse simulateAccount(String bankName) {
        String key = bankName.toUpperCase();
        if (!BANK_IFSC_MAP.containsKey(key)) {
            throw new ApiException("INVALID_BANK", "Unsupported bank: " + bankName, HttpStatus.BAD_REQUEST);
        }
        String[] ifscs = BANK_IFSC_MAP.get(key);
        String accountNumber;
        do {
            accountNumber = String.format("ACC%07d", RANDOM.nextInt(9_999_999));
        } while (accountRepository.findByAccountNumber(accountNumber).isPresent());

        SimulateAccountResponse response = new SimulateAccountResponse();
        response.setBankName(key);
        response.setAccountNumber(accountNumber);
        response.setIfscCode(ifscs[RANDOM.nextInt(ifscs.length)]);
        response.setBalance(BigDecimal.valueOf(10_000 + RANDOM.nextInt(90_000)));
        response.setCurrency("INR");
        return response;
    }

    @Transactional
    public SimulateAccountResponse simulateAndCreateAccount(SimulateAccountCreateRequest request) {
        if (request == null || request.getBankName() == null || request.getBankName().isBlank()) {
            throw new ApiException("VALIDATION_FAILED", "bank_name is required", HttpStatus.BAD_REQUEST);
        }
        String key = resolveBank(request.getBankName());
        String[] ifscs = BANK_IFSC_MAP.get(key);
        String holderName = (request.getAccountHolderName() != null && !request.getAccountHolderName().isBlank())
                ? request.getAccountHolderName().trim() : "Account Holder";
        String currency = (request.getCurrency() != null && !request.getCurrency().isBlank())
                ? request.getCurrency().trim().toUpperCase() : "INR";

        Account account = new Account();
        account.setBankName(request.getBankName().trim());
        account.setAccountNumber(generateUniqueAccountNumber());
        account.setAccountHolderName(holderName);
        account.setBalance(BigDecimal.valueOf(10_000 + RANDOM.nextInt(90_000)));
        account.setCurrency(currency);
        account.setStatus(AccountStatus.INACTIVE);
        account.setTpinHash(PASSWORD_ENCODER.encode(String.valueOf(RANDOM.nextInt(1_000_000))));
        account.setIfscCode(ifscs[RANDOM.nextInt(ifscs.length)]);
        if (request.getCustomerId() != null) account.setCustomerId(request.getCustomerId());

        Account saved = accountRepository.save(account);
        return toSimulateResponse(saved);
    }

    @Transactional
    public SimulateAccountResponse activateAccount(Map<String, String> request) {
        String bankName = request.getOrDefault("bank_name", "");
        String tpin     = request.getOrDefault("tpin", "");
        String confirm  = request.getOrDefault("confirm_tpin", "");
        if (bankName.isBlank() || tpin.isBlank()) {
            throw new ApiException("VALIDATION_FAILED", "bank_name and tpin are required", HttpStatus.BAD_REQUEST);
        }
        if (!tpin.matches("\\d{6}")) {
            throw new ApiException("INVALID_TPIN", "tpin must be exactly 6 digits", HttpStatus.BAD_REQUEST);
        }
        if (!tpin.equals(confirm)) {
            throw new ApiException("TPIN_MISMATCH", "tpin and confirm_tpin must match", HttpStatus.BAD_REQUEST);
        }

        String key = resolveBank(bankName);
        String[] ifscs = BANK_IFSC_MAP.get(key);

        Account account = new Account();
        account.setBankName(bankName.trim());
        account.setAccountNumber(generateUniqueAccountNumber());
        String activateHolderName = request.getOrDefault("account_holder_name", "");
        account.setAccountHolderName(activateHolderName.isBlank() ? "Account Holder" : activateHolderName.trim());
        account.setBalance(BigDecimal.valueOf(10_000 + RANDOM.nextInt(90_000)));
        account.setCurrency("INR");
        account.setStatus(AccountStatus.ACTIVE);
        account.setTpinHash(PASSWORD_ENCODER.encode(tpin));
        account.setIfscCode(ifscs[RANDOM.nextInt(ifscs.length)]);
        String customerIdStr = request.get("customer_id");
        if (customerIdStr != null && !customerIdStr.isBlank()) {
            account.setCustomerId(Long.parseLong(customerIdStr));
        }

        Account saved = accountRepository.save(account);
        return toSimulateResponse(saved);
    }

    @Transactional
    public SimulateAccountResponse setAccountTpin(Long accountId, SetTpinRequest request) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ApiException("ACCOUNT_NOT_FOUND", "Account not found", HttpStatus.NOT_FOUND));
        if (request.getTpin() == null || !request.getTpin().matches("\\d{6}")) {
            throw new ApiException("INVALID_TPIN", "tpin must be exactly 6 digits", HttpStatus.BAD_REQUEST);
        }
        if (!request.getTpin().equals(request.getConfirmTpin())) {
            throw new ApiException("TPIN_MISMATCH", "tpin and confirm_tpin must match", HttpStatus.BAD_REQUEST);
        }
        account.setTpinHash(PASSWORD_ENCODER.encode(request.getTpin()));
        account.setStatus(AccountStatus.ACTIVE);
        Account saved = accountRepository.save(account);
        return toSimulateResponse(saved);
    }

    private String resolveBank(String bankName) {
        String upper = bankName.trim().toUpperCase();
        if (BANK_IFSC_MAP.containsKey(upper)) return upper;
        // Try matching by first word (e.g. "HDFC BANK" → "HDFC")
        String firstWord = upper.split("\\s+")[0];
        if (BANK_IFSC_MAP.containsKey(firstWord)) return firstWord;
        throw new ApiException("INVALID_BANK", "Unsupported bank: " + bankName, HttpStatus.BAD_REQUEST);
    }

    private String generateUniqueAccountNumber() {
        String accNo;
        do {
            accNo = String.format("ACC%07d", RANDOM.nextInt(9_999_999));
        } while (accountRepository.findByAccountNumber(accNo).isPresent());
        return accNo;
    }

    private SimulateAccountResponse toSimulateResponse(Account account) {
        SimulateAccountResponse r = new SimulateAccountResponse();
        r.setAccountId(account.getAccountId());
        r.setBankName(account.getBankName());
        r.setAccountNumber(account.getAccountNumber());
        r.setIfscCode(account.getIfscCode());
        r.setBalance(account.getBalance());
        r.setCurrency(account.getCurrency());
        r.setStatus(account.getStatus().name());
        return r;
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

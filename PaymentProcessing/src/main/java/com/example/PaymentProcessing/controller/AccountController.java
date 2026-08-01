package com.example.PaymentProcessing.controller;

import com.example.PaymentProcessing.api.AccountResponse;
import com.example.PaymentProcessing.api.BalanceResponse;
import com.example.PaymentProcessing.api.CheckBalanceRequest;
import com.example.PaymentProcessing.api.CreateAccountRequest;
import com.example.PaymentProcessing.api.SetTpinRequest;
import com.example.PaymentProcessing.api.SimulateAccountCreateRequest;
import com.example.PaymentProcessing.api.SimulateAccountResponse;
import com.example.PaymentProcessing.service.AccountService;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AccountResponse create(@RequestBody CreateAccountRequest request) {
        return accountService.createAccount(request);
    }

    @GetMapping
    public List<AccountResponse> list(@RequestParam(required = false) Long customerId) {
        return customerId != null ? accountService.listAccountsByCustomer(customerId) : accountService.listAccounts();
    }

    @GetMapping("/{accountId}")
    public AccountResponse get(@PathVariable Long accountId) {
        return accountService.getAccount(accountId);
    }

    @GetMapping("/by-number/{accountNumber}")
    public AccountResponse getByNumber(@PathVariable String accountNumber) {
        return accountService.getAccountByNumber(accountNumber);
    }

    @PostMapping("/balance")
    public BalanceResponse checkBalance(@RequestBody CheckBalanceRequest request) {
        return accountService.checkBalance(request);
    }

    @GetMapping("/banks")
    public List<String> getBanks() {
        return accountService.getBanks();
    }

    @GetMapping("/simulate/{bankName}")
    public SimulateAccountResponse simulate(@PathVariable String bankName) {
        return accountService.simulateAccount(bankName);
    }

    @PostMapping("/simulate")
    @ResponseStatus(HttpStatus.CREATED)
    public SimulateAccountResponse simulateAndCreate(@RequestBody SimulateAccountCreateRequest request) {
        return accountService.simulateAndCreateAccount(request);
    }

    @PostMapping("/activate")
    @ResponseStatus(HttpStatus.CREATED)
    public SimulateAccountResponse activate(@RequestBody Map<String, String> request) {
        return accountService.activateAccount(request);
    }

    @PostMapping("/{accountId}/tpin")
    public SimulateAccountResponse setTpin(@PathVariable Long accountId, @RequestBody SetTpinRequest request) {
        return accountService.setAccountTpin(accountId, request);
    }
}

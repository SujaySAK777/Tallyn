package com.example.PaymentProcessing.controller;

import com.example.PaymentProcessing.api.AccountResponse;
import com.example.PaymentProcessing.api.BalanceResponse;
import com.example.PaymentProcessing.api.CheckBalanceRequest;
import com.example.PaymentProcessing.api.CreateAccountRequest;
import com.example.PaymentProcessing.api.SetTpinRequest;
import com.example.PaymentProcessing.api.SimulateAccountRequest;
import com.example.PaymentProcessing.service.AccountService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
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
    public List<AccountResponse> list(@RequestAttribute("customerId") Long customerId) {
        return accountService.listAccountsForCustomer(customerId);
    }

    @GetMapping("/{accountId}")
    public AccountResponse get(@PathVariable Long accountId) {
        return accountService.getAccount(accountId);
    }

    @GetMapping("/number/{accountNumber}")
    public AccountResponse lookup(@PathVariable String accountNumber) {
        return accountService.getAccountByNumber(accountNumber);
    }

    @GetMapping("/upi/{upiId}")
    public AccountResponse lookupByUpi(@PathVariable String upiId) {
        return accountService.getAccountByUpiId(upiId);
    }

    @PostMapping("/balance")
    public BalanceResponse checkBalance(@RequestBody CheckBalanceRequest request) {
        return accountService.checkBalance(request);
    }

    @PostMapping("/simulate")
    @ResponseStatus(HttpStatus.CREATED)
    public AccountResponse simulate(@RequestBody SimulateAccountRequest request, @RequestAttribute("customerId") Long customerId) {
        return accountService.simulateAccount(request, customerId);
    }

    @PostMapping("/{accountId}/tpin")
    public AccountResponse setTpin(@PathVariable Long accountId, @RequestBody SetTpinRequest request) {
        return accountService.setTpin(accountId, request);
    }
}

package com.example.PaymentProcessing.controller;

import com.example.PaymentProcessing.api.AccountResponse;
import com.example.PaymentProcessing.api.CreateAccountRequest;
import com.example.PaymentProcessing.service.AccountService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
    public List<AccountResponse> list() {
        return accountService.listAccounts();
    }

    @GetMapping("/{accountId}")
    public AccountResponse get(@PathVariable Long accountId) {
        return accountService.getAccount(accountId);
    }
}

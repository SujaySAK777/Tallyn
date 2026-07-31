package com.example.PaymentProcessing.api;

import com.example.PaymentProcessing.model.Account;
import com.example.PaymentProcessing.model.AccountStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class AccountResponse {

    private Long accountId;
    private String accountNumber;
    private String accountHolderName;
    private BigDecimal balance;
    private String currency;
    private String bankName;
    private AccountStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static AccountResponse fromEntity(Account account) {
        AccountResponse response = new AccountResponse();
        response.setAccountId(account.getAccountId());
        response.setAccountNumber(account.getAccountNumber());
        response.setAccountHolderName(account.getAccountHolderName());
        response.setBalance(account.getBalance());
        response.setCurrency(account.getCurrency());
        response.setBankName(account.getBankName());
        response.setStatus(account.getStatus());
        response.setCreatedAt(account.getCreatedAt());
        response.setUpdatedAt(account.getUpdatedAt());
        return response;
    }

    public Long getAccountId() {
        return accountId;
    }

    public void setAccountId(Long accountId) {
        this.accountId = accountId;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public String getAccountHolderName() {
        return accountHolderName;
    }

    public void setAccountHolderName(String accountHolderName) {
        this.accountHolderName = accountHolderName;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getBankName() {
        return bankName;
    }

    public void setBankName(String bankName) {
        this.bankName = bankName;
    }

    public AccountStatus getStatus() {
        return status;
    }

    public void setStatus(AccountStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
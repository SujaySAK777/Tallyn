package com.example.PaymentProcessing.api;

import java.math.BigDecimal;

public class CreateAccountRequest {

    private String accountNumber;
    private String accountHolderName;
    private BigDecimal balance;
    private String currency;
    private String bankName;
    private String tpin;

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

    public String getTpin() {
        return tpin;
    }

    public void setTpin(String tpin) {
        this.tpin = tpin;
    }
}
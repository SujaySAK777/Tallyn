package com.example.PaymentProcessing.api;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CheckBalanceRequest {

    @JsonProperty("account_number")
    private String accountNumber;

    private String tpin;

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public String getTpin() {
        return tpin;
    }

    public void setTpin(String tpin) {
        this.tpin = tpin;
    }
}

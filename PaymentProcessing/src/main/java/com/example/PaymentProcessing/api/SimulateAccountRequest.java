package com.example.PaymentProcessing.api;

import com.fasterxml.jackson.annotation.JsonProperty;

public class SimulateAccountRequest {

    @JsonProperty("bank_name")
    private String bankName;

    @JsonProperty("mobile_number")
    private String mobileNumber;

    @JsonProperty("account_holder_name")
    private String accountHolderName;

    private String currency;

    @JsonProperty("customer_id")
    private Long customerId;

    public String getBankName() {
        return bankName;
    }

    public void setBankName(String bankName) {
        this.bankName = bankName;
    }

    public String getMobileNumber() {
        return mobileNumber;
    }

    public void setMobileNumber(String mobileNumber) {
        this.mobileNumber = mobileNumber;
    }

    public String getAccountHolderName() {
        return accountHolderName;
    }

    public void setAccountHolderName(String accountHolderName) {
        this.accountHolderName = accountHolderName;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }
}
package com.example.PaymentProcessing.api;

import java.math.BigDecimal;
import com.fasterxml.jackson.annotation.JsonProperty;

public class GroupSplitMemberRequest {

    @JsonProperty("account_number")
    private String accountNumber;

    // Only required when splitType is UNEQUAL
    private BigDecimal amount;

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
}
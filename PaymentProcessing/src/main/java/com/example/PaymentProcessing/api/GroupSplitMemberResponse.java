package com.example.PaymentProcessing.api;

import java.math.BigDecimal;

public class GroupSplitMemberResponse {
    private String accountNumber;
    private String accountHolderName;
    private BigDecimal shareAmount;
    private boolean seen;
    private boolean paid;

    public static GroupSplitMemberResponse of(String accountNumber, String accountHolderName, BigDecimal shareAmount, boolean seen, boolean paid) {
        GroupSplitMemberResponse response = new GroupSplitMemberResponse();
        response.accountNumber = accountNumber;
        response.accountHolderName = accountHolderName;
        response.shareAmount = shareAmount;
        response.seen = seen;
        response.paid = paid;
        return response;
    }

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public String getAccountHolderName() { return accountHolderName; }
    public void setAccountHolderName(String accountHolderName) { this.accountHolderName = accountHolderName; }

    public BigDecimal getShareAmount() { return shareAmount; }
    public void setShareAmount(BigDecimal shareAmount) { this.shareAmount = shareAmount; }

    public boolean isSeen() { return seen; }
    public void setSeen(boolean seen) { this.seen = seen; }

    public boolean isPaid() { return paid; }
    public void setPaid(boolean paid) { this.paid = paid; }
}
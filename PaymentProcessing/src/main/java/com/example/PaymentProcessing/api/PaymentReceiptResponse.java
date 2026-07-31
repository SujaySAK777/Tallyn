package com.example.PaymentProcessing.api;

import com.example.PaymentProcessing.model.Payment;
import com.example.PaymentProcessing.model.PaymentStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PaymentReceiptResponse {
    private Long paymentId;
    private String referenceNumber;
    private PaymentStatus status;
    private BigDecimal amount;
    private String currency;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long sourceAccountId;
    private String sourceAccountHolderName;
    private String sourceBankName;
    private Long destinationAccountId;
    private String destinationAccountHolderName;
    private String destinationBankName;
    private String remarks;

    public static PaymentReceiptResponse fromEntity(Payment payment) {
        PaymentReceiptResponse response = new PaymentReceiptResponse();
        response.setPaymentId(payment.getPaymentId());
        response.setReferenceNumber(payment.getReferenceNumber());
        response.setStatus(payment.getStatus());
        response.setAmount(payment.getAmount());
        response.setCurrency(payment.getCurrency());
        response.setCreatedAt(payment.getCreatedAt());
        response.setUpdatedAt(payment.getUpdatedAt());
        response.setSourceAccountId(payment.getSourceAccount().getAccountId());
        response.setSourceAccountHolderName(payment.getSourceAccount().getAccountHolderName());
        response.setSourceBankName(payment.getSourceAccount().getBankName());
        response.setDestinationAccountId(payment.getDestinationAccount().getAccountId());
        response.setDestinationAccountHolderName(payment.getDestinationAccount().getAccountHolderName());
        response.setDestinationBankName(payment.getDestinationAccount().getBankName());
        response.setRemarks(payment.getRemarks());
        return response;
    }

    public Long getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(Long paymentId) {
        this.paymentId = paymentId;
    }

    public String getReferenceNumber() {
        return referenceNumber;
    }

    public void setReferenceNumber(String referenceNumber) {
        this.referenceNumber = referenceNumber;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public void setStatus(PaymentStatus status) {
        this.status = status;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
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

    public Long getSourceAccountId() {
        return sourceAccountId;
    }

    public void setSourceAccountId(Long sourceAccountId) {
        this.sourceAccountId = sourceAccountId;
    }

    public String getSourceAccountHolderName() {
        return sourceAccountHolderName;
    }

    public void setSourceAccountHolderName(String sourceAccountHolderName) {
        this.sourceAccountHolderName = sourceAccountHolderName;
    }

    public String getSourceBankName() {
        return sourceBankName;
    }

    public void setSourceBankName(String sourceBankName) {
        this.sourceBankName = sourceBankName;
    }

    public Long getDestinationAccountId() {
        return destinationAccountId;
    }

    public void setDestinationAccountId(Long destinationAccountId) {
        this.destinationAccountId = destinationAccountId;
    }

    public String getDestinationAccountHolderName() {
        return destinationAccountHolderName;
    }

    public void setDestinationAccountHolderName(String destinationAccountHolderName) {
        this.destinationAccountHolderName = destinationAccountHolderName;
    }

    public String getDestinationBankName() {
        return destinationBankName;
    }

    public void setDestinationBankName(String destinationBankName) {
        this.destinationBankName = destinationBankName;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }
}

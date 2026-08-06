package com.example.PaymentProcessing.api;

import com.example.PaymentProcessing.model.Payment;
import com.example.PaymentProcessing.model.PaymentStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PaymentResponse {
    private Long paymentId;
    private Long sourceAccountId;
    private String sourceAccountNumber;
    private String sourceBankName;
    private String sourceAccountHolderName;
    private Long destinationAccountId;
    private String destinationAccountNumber;
    private String destinationBankName;
    private String destinationAccountHolderName;
    private BigDecimal amount;
    private String currency;
    private PaymentStatus status;
    private String referenceNumber;
    private String remarks;
    private String errorCode;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String category;
    private String refundReason;
    private LocalDateTime refundedAt;

    public static PaymentResponse fromEntity(Payment payment) {
        PaymentResponse response = new PaymentResponse();
        response.setPaymentId(payment.getPaymentId());
        response.setSourceAccountId(payment.getSourceAccount().getAccountId());
        response.setSourceAccountNumber(payment.getSourceAccount().getAccountNumber());
        response.setSourceBankName(payment.getSourceAccount().getBankName());
        response.setSourceAccountHolderName(payment.getSourceAccount().getAccountHolderName());
        response.setDestinationAccountId(payment.getDestinationAccount().getAccountId());
        response.setDestinationAccountNumber(payment.getDestinationAccount().getAccountNumber());
        response.setDestinationBankName(payment.getDestinationAccount().getBankName());
        response.setDestinationAccountHolderName(payment.getDestinationAccount().getAccountHolderName());
        response.setAmount(payment.getAmount());
        response.setCurrency(payment.getCurrency());
        response.setStatus(payment.getStatus());
        response.setReferenceNumber(payment.getReferenceNumber());
        response.setRemarks(payment.getRemarks());
        response.setErrorCode(payment.getErrorCode());
        response.setErrorMessage(payment.getErrorMessage());
        response.setCreatedAt(payment.getCreatedAt());
        response.setUpdatedAt(payment.getUpdatedAt());
        response.setCategory(payment.getCategory() == null ? null : payment.getCategory().name());
        response.setRefundReason(payment.getRefundReason());
        response.setRefundedAt(payment.getRefundedAt());
        return response;
    }

    public Long getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(Long paymentId) {
        this.paymentId = paymentId;
    }

    public Long getSourceAccountId() {
        return sourceAccountId;
    }

    public void setSourceAccountId(Long sourceAccountId) {
        this.sourceAccountId = sourceAccountId;
    }

    public String getSourceAccountNumber() {
        return sourceAccountNumber;
    }

    public void setSourceAccountNumber(String sourceAccountNumber) {
        this.sourceAccountNumber = sourceAccountNumber;
    }

    public String getSourceBankName() {
        return sourceBankName;
    }

    public void setSourceBankName(String sourceBankName) {
        this.sourceBankName = sourceBankName;
    }

    public String getSourceAccountHolderName() {
        return sourceAccountHolderName;
    }

    public void setSourceAccountHolderName(String sourceAccountHolderName) {
        this.sourceAccountHolderName = sourceAccountHolderName;
    }

    public Long getDestinationAccountId() {
        return destinationAccountId;
    }

    public void setDestinationAccountId(Long destinationAccountId) {
        this.destinationAccountId = destinationAccountId;
    }

    public String getDestinationAccountNumber() {
        return destinationAccountNumber;
    }

    public void setDestinationAccountNumber(String destinationAccountNumber) {
        this.destinationAccountNumber = destinationAccountNumber;
    }

    public String getDestinationBankName() {
        return destinationBankName;
    }

    public void setDestinationBankName(String destinationBankName) {
        this.destinationBankName = destinationBankName;
    }

    public String getDestinationAccountHolderName() {
        return destinationAccountHolderName;
    }

    public void setDestinationAccountHolderName(String destinationAccountHolderName) {
        this.destinationAccountHolderName = destinationAccountHolderName;
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

    public PaymentStatus getStatus() {
        return status;
    }

    public void setStatus(PaymentStatus status) {
        this.status = status;
    }

    public String getReferenceNumber() {
        return referenceNumber;
    }

    public void setReferenceNumber(String referenceNumber) {
        this.referenceNumber = referenceNumber;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
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

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getRefundReason() {
        return refundReason;
    }

    public void setRefundReason(String refundReason) {
        this.refundReason = refundReason;
    }

    public LocalDateTime getRefundedAt() {
        return refundedAt;
    }

    public void setRefundedAt(LocalDateTime refundedAt) {
        this.refundedAt = refundedAt;
    }
}

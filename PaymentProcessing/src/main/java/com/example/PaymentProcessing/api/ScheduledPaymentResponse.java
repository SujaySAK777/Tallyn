package com.example.PaymentProcessing.api;

import com.example.PaymentProcessing.model.ScheduledPayment;
import com.example.PaymentProcessing.model.ScheduledPaymentExecutionType;
import com.example.PaymentProcessing.model.ScheduledPaymentRecurrenceType;
import com.example.PaymentProcessing.model.ScheduledPaymentStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ScheduledPaymentResponse {
    private Long scheduledPaymentId;
    private Long sourceAccountId;
    private Long destinationAccountId;
    private BigDecimal amount;
    private String currency;
    private String remarks;
    private String receiverBankName;
    private String receiverIfsc;
    private LocalDateTime scheduledAt;
    private ScheduledPaymentExecutionType executionType;
    private ScheduledPaymentRecurrenceType recurrenceType;
    private Integer recurrenceIntervalDays;
    private LocalDateTime lastRunAt;
    private ScheduledPaymentStatus status;
    private String referenceNumber;
    private String errorCode;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ScheduledPaymentResponse fromEntity(ScheduledPayment payment) {
        ScheduledPaymentResponse response = new ScheduledPaymentResponse();
        response.setScheduledPaymentId(payment.getScheduledPaymentId());
        response.setSourceAccountId(payment.getSourceAccountId());
        response.setDestinationAccountId(payment.getDestinationAccountId());
        response.setAmount(payment.getAmount());
        response.setCurrency(payment.getCurrency());
        response.setRemarks(payment.getRemarks());
        response.setReceiverBankName(payment.getReceiverBankName());
        response.setReceiverIfsc(payment.getReceiverIfsc());
        response.setScheduledAt(payment.getScheduledAt());
        response.setExecutionType(payment.getExecutionType());
        response.setRecurrenceType(payment.getRecurrenceType());
        response.setRecurrenceIntervalDays(payment.getRecurrenceIntervalDays());
        response.setLastRunAt(payment.getLastRunAt());
        response.setStatus(payment.getStatus());
        response.setReferenceNumber(payment.getReferenceNumber());
        response.setErrorCode(payment.getErrorCode());
        response.setErrorMessage(payment.getErrorMessage());
        response.setCreatedAt(payment.getCreatedAt());
        response.setUpdatedAt(payment.getUpdatedAt());
        return response;
    }

    public Long getScheduledPaymentId() { return scheduledPaymentId; }
    public void setScheduledPaymentId(Long scheduledPaymentId) { this.scheduledPaymentId = scheduledPaymentId; }

    public Long getSourceAccountId() { return sourceAccountId; }
    public void setSourceAccountId(Long sourceAccountId) { this.sourceAccountId = sourceAccountId; }

    public Long getDestinationAccountId() { return destinationAccountId; }
    public void setDestinationAccountId(Long destinationAccountId) { this.destinationAccountId = destinationAccountId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public String getReceiverBankName() { return receiverBankName; }
    public void setReceiverBankName(String receiverBankName) { this.receiverBankName = receiverBankName; }

    public String getReceiverIfsc() { return receiverIfsc; }
    public void setReceiverIfsc(String receiverIfsc) { this.receiverIfsc = receiverIfsc; }

    public LocalDateTime getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(LocalDateTime scheduledAt) { this.scheduledAt = scheduledAt; }

    public ScheduledPaymentExecutionType getExecutionType() { return executionType; }
    public void setExecutionType(ScheduledPaymentExecutionType executionType) { this.executionType = executionType; }

    public ScheduledPaymentRecurrenceType getRecurrenceType() { return recurrenceType; }
    public void setRecurrenceType(ScheduledPaymentRecurrenceType recurrenceType) { this.recurrenceType = recurrenceType; }

    public Integer getRecurrenceIntervalDays() { return recurrenceIntervalDays; }
    public void setRecurrenceIntervalDays(Integer recurrenceIntervalDays) { this.recurrenceIntervalDays = recurrenceIntervalDays; }

    public LocalDateTime getLastRunAt() { return lastRunAt; }
    public void setLastRunAt(LocalDateTime lastRunAt) { this.lastRunAt = lastRunAt; }

    public ScheduledPaymentStatus getStatus() { return status; }
    public void setStatus(ScheduledPaymentStatus status) { this.status = status; }

    public String getReferenceNumber() { return referenceNumber; }
    public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }

    public String getErrorCode() { return errorCode; }
    public void setErrorCode(String errorCode) { this.errorCode = errorCode; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}

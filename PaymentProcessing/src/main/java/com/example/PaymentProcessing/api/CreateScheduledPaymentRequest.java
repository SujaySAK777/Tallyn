package com.example.PaymentProcessing.api;

import com.example.PaymentProcessing.model.ScheduledPaymentExecutionType;
import com.example.PaymentProcessing.model.ScheduledPaymentRecurrenceType;
import com.example.PaymentProcessing.model.PaymentCategory;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CreateScheduledPaymentRequest {
    private Long sourceAccountId;
    private Long destinationAccountId;
    private BigDecimal amount;
    private String currency;
    private String remarks;
    private PaymentCategory category;
    private String receiverBankName;
    private String receiverIfsc;
    private LocalDateTime scheduledAt;
    private ScheduledPaymentExecutionType executionType;
    private ScheduledPaymentRecurrenceType recurrenceType;
    private Integer recurrenceIntervalDays;
    private String tpin;

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
    public PaymentCategory getCategory() { return category; }
    public void setCategory(PaymentCategory category) { this.category = category; }

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

    public String getTpin() { return tpin; }
    public void setTpin(String tpin) { this.tpin = tpin; }
}

package com.example.PaymentProcessing.api;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CreateScheduledPaymentRequest {
    private Long sourceAccountId;
    private Long destinationAccountId;
    private BigDecimal amount;
    private String currency;
    private String remarks;
    private LocalDateTime scheduledAt;
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

    public LocalDateTime getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(LocalDateTime scheduledAt) { this.scheduledAt = scheduledAt; }

    public String getTpin() { return tpin; }
    public void setTpin(String tpin) { this.tpin = tpin; }
}

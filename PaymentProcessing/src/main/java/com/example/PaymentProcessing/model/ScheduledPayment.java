package com.example.PaymentProcessing.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "scheduled_payment")
public class ScheduledPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "scheduled_payment_id")
    private Long scheduledPaymentId;

    @Column(name = "source_account_id", nullable = false)
    private Long sourceAccountId;

    @Column(name = "destination_account_id", nullable = false)
    private Long destinationAccountId;

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "remarks", length = 255)
    private String remarks;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 32)
    private PaymentCategory category;

    @Column(name = "receiver_bank_name", length = 100)
    private String receiverBankName;

    @Column(name = "receiver_ifsc", length = 20)
    private String receiverIfsc;

    @Column(name = "scheduled_at", nullable = false)
    private LocalDateTime scheduledAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "execution_type", nullable = false)
    private ScheduledPaymentExecutionType executionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "recurrence_type")
    private ScheduledPaymentRecurrenceType recurrenceType;

    @Column(name = "recurrence_interval_days")
    private Integer recurrenceIntervalDays;

    @Column(name = "last_run_at")
    private LocalDateTime lastRunAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ScheduledPaymentStatus status;

    @Column(name = "reference_number", nullable = false, unique = true, length = 100)
    private String referenceNumber;

    @Column(name = "error_code", length = 50)
    private String errorCode;

    @Column(name = "error_message", length = 255)
    private String errorMessage;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

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
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}

package com.example.PaymentProcessing.api;

import java.math.BigDecimal;

public class PaymentSummaryResponse {
    private long total;
    private long completed;
    private long failed;
    private long pending;
    private BigDecimal totalAmount;
    private BigDecimal completedAmount;
    private BigDecimal failedAmount;
    private BigDecimal pendingAmount;

    public PaymentSummaryResponse() {
    }

    public PaymentSummaryResponse(
            long total,
            long completed,
            long failed,
            long pending,
            BigDecimal totalAmount,
            BigDecimal completedAmount,
            BigDecimal failedAmount,
            BigDecimal pendingAmount
    ) {
        this.total = total;
        this.completed = completed;
        this.failed = failed;
        this.pending = pending;
        this.totalAmount = totalAmount;
        this.completedAmount = completedAmount;
        this.failedAmount = failedAmount;
        this.pendingAmount = pendingAmount;
    }

    public long getTotal() {
        return total;
    }

    public void setTotal(long total) {
        this.total = total;
    }

    public long getCompleted() {
        return completed;
    }

    public void setCompleted(long completed) {
        this.completed = completed;
    }

    public long getFailed() {
        return failed;
    }

    public void setFailed(long failed) {
        this.failed = failed;
    }

    public long getPending() {
        return pending;
    }

    public void setPending(long pending) {
        this.pending = pending;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public BigDecimal getCompletedAmount() {
        return completedAmount;
    }

    public void setCompletedAmount(BigDecimal completedAmount) {
        this.completedAmount = completedAmount;
    }

    public BigDecimal getFailedAmount() {
        return failedAmount;
    }

    public void setFailedAmount(BigDecimal failedAmount) {
        this.failedAmount = failedAmount;
    }

    public BigDecimal getPendingAmount() {
        return pendingAmount;
    }

    public void setPendingAmount(BigDecimal pendingAmount) {
        this.pendingAmount = pendingAmount;
    }
}

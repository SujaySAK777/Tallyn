package com.example.PaymentProcessing.api;

import com.example.PaymentProcessing.model.PaymentHistory;
import com.example.PaymentProcessing.model.PaymentStatus;
import java.time.LocalDateTime;

public class PaymentHistoryResponse {
    private Long historyId;
    private Long paymentId;
    private PaymentStatus previousStatus;
    private PaymentStatus currentStatus;
    private String remarks;
    private LocalDateTime changedAt;

    public static PaymentHistoryResponse fromEntity(PaymentHistory history) {
        PaymentHistoryResponse response = new PaymentHistoryResponse();
        response.setHistoryId(history.getHistoryId());
        response.setPaymentId(history.getPayment().getPaymentId());
        response.setPreviousStatus(history.getPreviousStatus());
        response.setCurrentStatus(history.getCurrentStatus());
        response.setRemarks(history.getRemarks());
        response.setChangedAt(history.getChangedAt());
        return response;
    }

    public Long getHistoryId() {
        return historyId;
    }

    public void setHistoryId(Long historyId) {
        this.historyId = historyId;
    }

    public Long getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(Long paymentId) {
        this.paymentId = paymentId;
    }

    public PaymentStatus getPreviousStatus() {
        return previousStatus;
    }

    public void setPreviousStatus(PaymentStatus previousStatus) {
        this.previousStatus = previousStatus;
    }

    public PaymentStatus getCurrentStatus() {
        return currentStatus;
    }

    public void setCurrentStatus(PaymentStatus currentStatus) {
        this.currentStatus = currentStatus;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public LocalDateTime getChangedAt() {
        return changedAt;
    }

    public void setChangedAt(LocalDateTime changedAt) {
        this.changedAt = changedAt;
    }
}

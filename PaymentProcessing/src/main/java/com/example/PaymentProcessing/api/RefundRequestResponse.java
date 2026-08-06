package com.example.PaymentProcessing.api;

import com.example.PaymentProcessing.model.RefundRequest;
import com.example.PaymentProcessing.model.RefundRequestStatus;
import com.example.PaymentProcessing.model.RefundRequestType;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class RefundRequestResponse {
    private Long requestId;
    private Long paymentId;
    private String referenceNumber;
    private BigDecimal amount;
    private String currency;
    private String reason;
    private RefundRequestStatus status;
    private RefundRequestType type;
    private Long requestedByCustomerId;
    private String rejectionReason;
    private Long resolvedByAdminId;
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;

    public static RefundRequestResponse fromEntity(RefundRequest request) {
        RefundRequestResponse response = new RefundRequestResponse();
        response.setRequestId(request.getRequestId());
        response.setPaymentId(request.getPayment().getPaymentId());
        response.setReferenceNumber(request.getPayment().getReferenceNumber());
        response.setAmount(request.getPayment().getAmount());
        response.setCurrency(request.getPayment().getCurrency());
        response.setReason(request.getReason());
        response.setStatus(request.getStatus());
        response.setType(request.getType());
        response.setRequestedByCustomerId(request.getRequestedByCustomerId());
        response.setRejectionReason(request.getRejectionReason());
        response.setResolvedByAdminId(request.getResolvedByAdminId());
        response.setResolvedAt(request.getResolvedAt());
        response.setCreatedAt(request.getCreatedAt());
        return response;
    }

    public Long getRequestId() {
        return requestId;
    }

    public void setRequestId(Long requestId) {
        this.requestId = requestId;
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

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public RefundRequestStatus getStatus() {
        return status;
    }

    public void setStatus(RefundRequestStatus status) {
        this.status = status;
    }

    public RefundRequestType getType() {
        return type;
    }

    public void setType(RefundRequestType type) {
        this.type = type;
    }

    public Long getRequestedByCustomerId() {
        return requestedByCustomerId;
    }

    public void setRequestedByCustomerId(Long requestedByCustomerId) {
        this.requestedByCustomerId = requestedByCustomerId;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public Long getResolvedByAdminId() {
        return resolvedByAdminId;
    }

    public void setResolvedByAdminId(Long resolvedByAdminId) {
        this.resolvedByAdminId = resolvedByAdminId;
    }

    public LocalDateTime getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(LocalDateTime resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

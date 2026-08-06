package com.example.PaymentProcessing.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

// A sender-raised ticket asking that a COMPLETED payment be reversed. Money never
// moves when this is created - only PaymentService.applyApprovedRefund (invoked once
// an admin approves this ticket) actually touches balances.
@Entity
@Table(name = "refund_request")
public class RefundRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "request_id")
    private Long requestId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    @Column(name = "requested_by_customer_id", nullable = false)
    private Long requestedByCustomerId;

    @Column(name = "reason", length = 255)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private RefundRequestStatus status;

    // Auto-classified from the payment's category when the ticket is raised - see
    // RefundRequestService.classifyType. Purely informational for the admin reviewing it.
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private RefundRequestType type;

    @Column(name = "rejection_reason", length = 255)
    private String rejectionReason;

    @Column(name = "resolved_by_admin_id")
    private Long resolvedByAdminId;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getRequestId() {
        return requestId;
    }

    public void setRequestId(Long requestId) {
        this.requestId = requestId;
    }

    public Payment getPayment() {
        return payment;
    }

    public void setPayment(Payment payment) {
        this.payment = payment;
    }

    public Long getRequestedByCustomerId() {
        return requestedByCustomerId;
    }

    public void setRequestedByCustomerId(Long requestedByCustomerId) {
        this.requestedByCustomerId = requestedByCustomerId;
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
}

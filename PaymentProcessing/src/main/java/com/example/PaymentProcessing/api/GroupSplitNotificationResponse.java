package com.example.PaymentProcessing.api;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class GroupSplitNotificationResponse {
    private Long groupSplitId;
    private String description;
    private BigDecimal totalAmount;
    private BigDecimal shareAmount;
    private String currency;
    private String createdByName;
    private LocalDateTime createdAt;
    private boolean seen;
    private boolean paid;

    public static GroupSplitNotificationResponse of(Long groupSplitId, String description, BigDecimal totalAmount,
            BigDecimal shareAmount, String currency, String createdByName, LocalDateTime createdAt, boolean seen, boolean paid) {
        GroupSplitNotificationResponse response = new GroupSplitNotificationResponse();
        response.groupSplitId = groupSplitId;
        response.description = description;
        response.totalAmount = totalAmount;
        response.shareAmount = shareAmount;
        response.currency = currency;
        response.createdByName = createdByName;
        response.createdAt = createdAt;
        response.seen = seen;
        response.paid = paid;
        return response;
    }

    public Long getGroupSplitId() { return groupSplitId; }
    public void setGroupSplitId(Long groupSplitId) { this.groupSplitId = groupSplitId; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public BigDecimal getShareAmount() { return shareAmount; }
    public void setShareAmount(BigDecimal shareAmount) { this.shareAmount = shareAmount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getCreatedByName() { return createdByName; }
    public void setCreatedByName(String createdByName) { this.createdByName = createdByName; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public boolean isSeen() { return seen; }
    public void setSeen(boolean seen) { this.seen = seen; }

    public boolean isPaid() { return paid; }
    public void setPaid(boolean paid) { this.paid = paid; }
}
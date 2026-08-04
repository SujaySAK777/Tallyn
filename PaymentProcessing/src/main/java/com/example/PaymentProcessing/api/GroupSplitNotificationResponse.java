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

    public static GroupSplitNotificationResponse of(Long groupSplitId, String description, BigDecimal totalAmount,
            BigDecimal shareAmount, String currency, String createdByName, LocalDateTime createdAt) {
        GroupSplitNotificationResponse response = new GroupSplitNotificationResponse();
        response.groupSplitId = groupSplitId;
        response.description = description;
        response.totalAmount = totalAmount;
        response.shareAmount = shareAmount;
        response.currency = currency;
        response.createdByName = createdByName;
        response.createdAt = createdAt;
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
}
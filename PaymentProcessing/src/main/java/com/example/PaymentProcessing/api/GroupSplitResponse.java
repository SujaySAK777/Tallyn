package com.example.PaymentProcessing.api;

import com.example.PaymentProcessing.model.GroupSplit;
import com.example.PaymentProcessing.model.GroupSplitType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class GroupSplitResponse {
    private Long groupSplitId;
    private String referenceNumber;
    private String description;
    private BigDecimal totalAmount;
    private String currency;
    private GroupSplitType splitType;
    private LocalDateTime createdAt;
    private List<GroupSplitMemberResponse> members;

    public static GroupSplitResponse fromEntity(GroupSplit split, List<GroupSplitMemberResponse> members) {
        GroupSplitResponse response = new GroupSplitResponse();
        response.groupSplitId = split.getGroupSplitId();
        response.referenceNumber = split.getReferenceNumber();
        response.description = split.getDescription();
        response.totalAmount = split.getTotalAmount();
        response.currency = split.getCurrency();
        response.splitType = split.getSplitType();
        response.createdAt = split.getCreatedAt();
        response.members = members;
        return response;
    }

    public Long getGroupSplitId() { return groupSplitId; }
    public void setGroupSplitId(Long groupSplitId) { this.groupSplitId = groupSplitId; }

    public String getReferenceNumber() { return referenceNumber; }
    public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public GroupSplitType getSplitType() { return splitType; }
    public void setSplitType(GroupSplitType splitType) { this.splitType = splitType; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public List<GroupSplitMemberResponse> getMembers() { return members; }
    public void setMembers(List<GroupSplitMemberResponse> members) { this.members = members; }
}
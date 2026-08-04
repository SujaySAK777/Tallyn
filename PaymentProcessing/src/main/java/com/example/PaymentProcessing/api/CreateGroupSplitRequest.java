package com.example.PaymentProcessing.api;

import com.example.PaymentProcessing.model.GroupSplitType;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.List;

public class CreateGroupSplitRequest {

    private BigDecimal amount;
    private String currency;
    private String description;

    @JsonProperty("split_type")
    private GroupSplitType splitType;

    @JsonProperty("source_account_id")
    private Long sourceAccountId;

    private List<GroupSplitMemberRequest> members;

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public GroupSplitType getSplitType() { return splitType; }
    public void setSplitType(GroupSplitType splitType) { this.splitType = splitType; }

    public Long getSourceAccountId() { return sourceAccountId; }
    public void setSourceAccountId(Long sourceAccountId) { this.sourceAccountId = sourceAccountId; }

    public List<GroupSplitMemberRequest> getMembers() { return members; }
    public void setMembers(List<GroupSplitMemberRequest> members) { this.members = members; }
}
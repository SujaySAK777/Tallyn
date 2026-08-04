package com.example.PaymentProcessing.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "group_split_member")
public class GroupSplitMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "group_split_member_id")
    private Long groupSplitMemberId;

    @Column(name = "group_split_id", nullable = false)
    private Long groupSplitId;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Column(name = "account_number", nullable = false, length = 20)
    private String accountNumber;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "share_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal shareAmount;

    @Column(name = "seen", nullable = false)
    private boolean seen;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getGroupSplitMemberId() { return groupSplitMemberId; }
    public void setGroupSplitMemberId(Long groupSplitMemberId) { this.groupSplitMemberId = groupSplitMemberId; }

    public Long getGroupSplitId() { return groupSplitId; }
    public void setGroupSplitId(Long groupSplitId) { this.groupSplitId = groupSplitId; }

    public Long getAccountId() { return accountId; }
    public void setAccountId(Long accountId) { this.accountId = accountId; }

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public BigDecimal getShareAmount() { return shareAmount; }
    public void setShareAmount(BigDecimal shareAmount) { this.shareAmount = shareAmount; }

    public boolean isSeen() { return seen; }
    public void setSeen(boolean seen) { this.seen = seen; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
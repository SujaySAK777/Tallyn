package com.example.PaymentProcessing.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "group_split")
public class GroupSplit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "group_split_id")
    private Long groupSplitId;

    @Column(name = "created_by_customer_id", nullable = false)
    private Long createdByCustomerId;

    @Column(name = "source_account_id")
    private Long sourceAccountId;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "description", nullable = false, length = 255)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "split_type", nullable = false)
    private GroupSplitType splitType;

    @Column(name = "reference_number", nullable = false, unique = true, length = 100)
    private String referenceNumber;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getGroupSplitId() { return groupSplitId; }
    public void setGroupSplitId(Long groupSplitId) { this.groupSplitId = groupSplitId; }

    public Long getCreatedByCustomerId() { return createdByCustomerId; }
    public void setCreatedByCustomerId(Long createdByCustomerId) { this.createdByCustomerId = createdByCustomerId; }

    public Long getSourceAccountId() { return sourceAccountId; }
    public void setSourceAccountId(Long sourceAccountId) { this.sourceAccountId = sourceAccountId; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public GroupSplitType getSplitType() { return splitType; }
    public void setSplitType(GroupSplitType splitType) { this.splitType = splitType; }

    public String getReferenceNumber() { return referenceNumber; }
    public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
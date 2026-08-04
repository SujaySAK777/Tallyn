package com.example.PaymentProcessing.api;

import com.example.PaymentProcessing.model.Beneficiary;
import java.time.LocalDateTime;

public class BeneficiaryResponse {
    private Long beneficiaryId;
    private String accountNumber;
    private String accountHolderName;
    private String bankName;
    private String ifscCode;
    private String nickname;
    private LocalDateTime createdAt;

    public static BeneficiaryResponse fromEntity(Beneficiary beneficiary) {
        BeneficiaryResponse response = new BeneficiaryResponse();
        response.beneficiaryId = beneficiary.getBeneficiaryId();
        response.accountNumber = beneficiary.getAccountNumber();
        response.accountHolderName = beneficiary.getAccountHolderName();
        response.bankName = beneficiary.getBankName();
        response.ifscCode = beneficiary.getIfscCode();
        response.nickname = beneficiary.getNickname();
        response.createdAt = beneficiary.getCreatedAt();
        return response;
    }

    public Long getBeneficiaryId() { return beneficiaryId; }
    public void setBeneficiaryId(Long beneficiaryId) { this.beneficiaryId = beneficiaryId; }

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public String getAccountHolderName() { return accountHolderName; }
    public void setAccountHolderName(String accountHolderName) { this.accountHolderName = accountHolderName; }

    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }

    public String getIfscCode() { return ifscCode; }
    public void setIfscCode(String ifscCode) { this.ifscCode = ifscCode; }

    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

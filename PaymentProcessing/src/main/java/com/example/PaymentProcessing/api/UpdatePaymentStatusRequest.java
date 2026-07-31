package com.example.PaymentProcessing.api;

import com.example.PaymentProcessing.model.PaymentStatus;

public class UpdatePaymentStatusRequest {
    private PaymentStatus status;
    private String remarks;
    private String errorCode;
    private String errorMessage;
    private String tpin;

    public PaymentStatus getStatus() {
        return status;
    }

    public void setStatus(PaymentStatus status) {
        this.status = status;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public String getTpin() {
        return tpin;
    }

    public void setTpin(String tpin) {
        this.tpin = tpin;
    }
}

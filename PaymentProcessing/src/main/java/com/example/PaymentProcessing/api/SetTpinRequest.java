package com.example.PaymentProcessing.api;

import com.fasterxml.jackson.annotation.JsonProperty;

public class SetTpinRequest {

    private String tpin;

    @JsonProperty("confirm_tpin")
    private String confirmTpin;

    public String getTpin() { return tpin; }
    public void setTpin(String tpin) { this.tpin = tpin; }

    public String getConfirmTpin() { return confirmTpin; }
    public void setConfirmTpin(String confirmTpin) { this.confirmTpin = confirmTpin; }
}

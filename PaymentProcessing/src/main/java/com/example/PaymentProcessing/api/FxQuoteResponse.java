package com.example.PaymentProcessing.api;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public class FxQuoteResponse {
    private BigDecimal sourceAmount;
    private String sourceCurrency;
    private BigDecimal destinationAmount;
    private String destinationCurrency;
    private BigDecimal exchangeRate;
    private BigDecimal fxFee;
    private OffsetDateTime rateTimestamp;

    public BigDecimal getSourceAmount() { return sourceAmount; }
    public void setSourceAmount(BigDecimal sourceAmount) { this.sourceAmount = sourceAmount; }
    public String getSourceCurrency() { return sourceCurrency; }
    public void setSourceCurrency(String sourceCurrency) { this.sourceCurrency = sourceCurrency; }
    public BigDecimal getDestinationAmount() { return destinationAmount; }
    public void setDestinationAmount(BigDecimal destinationAmount) { this.destinationAmount = destinationAmount; }
    public String getDestinationCurrency() { return destinationCurrency; }
    public void setDestinationCurrency(String destinationCurrency) { this.destinationCurrency = destinationCurrency; }
    public BigDecimal getExchangeRate() { return exchangeRate; }
    public void setExchangeRate(BigDecimal exchangeRate) { this.exchangeRate = exchangeRate; }
    public BigDecimal getFxFee() { return fxFee; }
    public void setFxFee(BigDecimal fxFee) { this.fxFee = fxFee; }
    public OffsetDateTime getRateTimestamp() { return rateTimestamp; }
    public void setRateTimestamp(OffsetDateTime rateTimestamp) { this.rateTimestamp = rateTimestamp; }
}

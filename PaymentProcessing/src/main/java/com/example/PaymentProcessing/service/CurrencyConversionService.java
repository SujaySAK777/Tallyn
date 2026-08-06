package com.example.PaymentProcessing.service;

import com.example.PaymentProcessing.api.FxQuoteResponse;
import com.example.PaymentProcessing.exception.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/** Converts using centrally managed reference rates (one INR per unit). */
@Service
public class CurrencyConversionService {
    private static final Map<String, BigDecimal> INR_PER_UNIT = Map.of(
            "INR", BigDecimal.ONE,
            "USD", new BigDecimal("83.50"),
            "EUR", new BigDecimal("90.20"),
            "GBP", new BigDecimal("106.40"),
            "AED", new BigDecimal("22.74"),
            "SGD", new BigDecimal("61.90"),
            "AUD", new BigDecimal("54.60"));

    public BigDecimal convert(BigDecimal amount, String fromCurrency, String toCurrency) {
        return quote(amount, fromCurrency, toCurrency).getDestinationAmount();
    }

    public FxQuoteResponse quote(BigDecimal amount, String fromCurrency, String toCurrency) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException("INVALID_AMOUNT", "amount must be greater than 0", HttpStatus.BAD_REQUEST);
        }
        String from = normalize(fromCurrency);
        String to = normalize(toCurrency);
        BigDecimal rate = INR_PER_UNIT.get(from)
                .divide(INR_PER_UNIT.get(to), 8, RoundingMode.HALF_UP);
        BigDecimal convertedAmount = amount.multiply(rate).setScale(2, RoundingMode.HALF_UP);

        FxQuoteResponse response = new FxQuoteResponse();
        response.setSourceAmount(amount.setScale(2, RoundingMode.HALF_UP));
        response.setSourceCurrency(from);
        response.setDestinationAmount(convertedAmount);
        response.setDestinationCurrency(to);
        response.setExchangeRate(rate);
        response.setFxFee(BigDecimal.ZERO.setScale(2));
        response.setRateTimestamp(OffsetDateTime.now());
        return response;
    }

    private String normalize(String value) {
        String code = value == null ? "" : value.trim().toUpperCase();
        if (!INR_PER_UNIT.containsKey(code)) {
            throw new ApiException("UNSUPPORTED_CURRENCY", "Unsupported account currency: " + code, HttpStatus.BAD_REQUEST);
        }
        return code;
    }
}

package com.example.PaymentProcessing.service;

import com.example.PaymentProcessing.exception.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
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
        String from = normalize(fromCurrency);
        String to = normalize(toCurrency);
        if (from.equals(to)) return amount.setScale(2, RoundingMode.HALF_UP);
        return amount.multiply(INR_PER_UNIT.get(from))
                .divide(INR_PER_UNIT.get(to), 2, RoundingMode.HALF_UP);
    }

    private String normalize(String value) {
        String code = value == null ? "" : value.trim().toUpperCase();
        if (!INR_PER_UNIT.containsKey(code)) {
            throw new ApiException("UNSUPPORTED_CURRENCY", "Unsupported account currency: " + code, HttpStatus.BAD_REQUEST);
        }
        return code;
    }
}

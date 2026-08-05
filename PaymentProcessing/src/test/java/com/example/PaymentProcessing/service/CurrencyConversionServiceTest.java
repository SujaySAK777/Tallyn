package com.example.PaymentProcessing.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.example.PaymentProcessing.exception.ApiException;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class CurrencyConversionServiceTest {

    private final CurrencyConversionService service = new CurrencyConversionService();

    @Test
    void shouldRescaleWithoutConvertingWhenCurrenciesMatch() {
        BigDecimal result = service.convert(new BigDecimal("100.005"), "INR", "INR");
        assertEquals(new BigDecimal("100.01"), result);
    }

    @Test
    void shouldConvertUsdToInrUsingRateTable() {
        BigDecimal result = service.convert(new BigDecimal("10"), "USD", "INR");
        assertEquals(new BigDecimal("835.00"), result);
    }

    @Test
    void shouldConvertInrToUsdUsingRateTable() {
        BigDecimal result = service.convert(new BigDecimal("835"), "INR", "USD");
        assertEquals(new BigDecimal("10.00"), result);
    }

    @Test
    void shouldNormalizeCaseAndWhitespaceBeforeLookup() {
        BigDecimal result = service.convert(new BigDecimal("1"), " usd ", " inr ");
        assertEquals(new BigDecimal("83.50"), result);
    }

    @Test
    void shouldRejectUnsupportedFromCurrency() {
        ApiException ex = assertThrows(ApiException.class, () -> service.convert(BigDecimal.TEN, "XYZ", "INR"));
        assertEquals("UNSUPPORTED_CURRENCY", ex.getErrorCode());
        assertEquals("Unsupported account currency: XYZ", ex.getMessage());
    }

    @Test
    void shouldRejectUnsupportedToCurrency() {
        ApiException ex = assertThrows(ApiException.class, () -> service.convert(BigDecimal.TEN, "INR", "XYZ"));
        assertEquals("UNSUPPORTED_CURRENCY", ex.getErrorCode());
        assertEquals("Unsupported account currency: XYZ", ex.getMessage());
    }

    @Test
    void shouldRejectNullCurrency() {
        ApiException ex = assertThrows(ApiException.class, () -> service.convert(BigDecimal.TEN, null, "INR"));
        assertEquals("UNSUPPORTED_CURRENCY", ex.getErrorCode());
        assertEquals("Unsupported account currency: ", ex.getMessage());
    }
}

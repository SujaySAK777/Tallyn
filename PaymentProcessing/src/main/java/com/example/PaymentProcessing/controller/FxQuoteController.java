package com.example.PaymentProcessing.controller;

import com.example.PaymentProcessing.api.FxQuoteResponse;
import com.example.PaymentProcessing.service.CurrencyConversionService;
import java.math.BigDecimal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/fx")
public class FxQuoteController {
    private final CurrencyConversionService currencyConversionService;

    public FxQuoteController(CurrencyConversionService currencyConversionService) {
        this.currencyConversionService = currencyConversionService;
    }

    @GetMapping("/quote")
    public FxQuoteResponse quote(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam BigDecimal amount) {
        return currencyConversionService.quote(amount, from, to);
    }
}

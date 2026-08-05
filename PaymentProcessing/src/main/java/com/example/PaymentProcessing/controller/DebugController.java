package com.example.PaymentProcessing.controller;

import com.example.PaymentProcessing.service.PaymentService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/onboarding/debug")
public class DebugController {
    private final PaymentService paymentService;

    public DebugController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/payments/{paymentId}/resend-notifications")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void resend(@PathVariable Long paymentId) {
        paymentService.resendNotifications(paymentId);
    }
}

package com.example.PaymentProcessing.controller;

import com.example.PaymentProcessing.api.CreateScheduledPaymentRequest;
import com.example.PaymentProcessing.api.ScheduledPaymentResponse;
import com.example.PaymentProcessing.service.ScheduledPaymentService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/scheduled-payments")
public class ScheduledPaymentController {

    private final ScheduledPaymentService scheduledPaymentService;

    public ScheduledPaymentController(ScheduledPaymentService scheduledPaymentService) {
        this.scheduledPaymentService = scheduledPaymentService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ScheduledPaymentResponse create(@RequestBody CreateScheduledPaymentRequest request) {
        return scheduledPaymentService.createScheduledPayment(request);
    }

    @GetMapping
    public List<ScheduledPaymentResponse> list() {
        return scheduledPaymentService.listScheduledPayments();
    }

    @PutMapping("/{scheduledPaymentId}/cancel")
    public ScheduledPaymentResponse cancel(@PathVariable Long scheduledPaymentId) {
        return scheduledPaymentService.cancelScheduledPayment(scheduledPaymentId);
    }
}

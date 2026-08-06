package com.example.PaymentProcessing.controller;

import com.example.PaymentProcessing.api.RefundRequestResponse;
import com.example.PaymentProcessing.service.RefundRequestService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Customer-facing view of their own refund tickets across all payments, for the
// dashboard's "Refunds" history screen. Per-payment ticket lookups still live on
// PaymentController (/payments/{id}/refund-requests); this is the "all of mine" view.
@RestController
@RequestMapping("/api/refund-requests")
public class RefundRequestController {

    private final RefundRequestService refundRequestService;

    public RefundRequestController(RefundRequestService refundRequestService) {
        this.refundRequestService = refundRequestService;
    }

    @GetMapping("/mine")
    public List<RefundRequestResponse> mine(@RequestAttribute("customerId") Long customerId) {
        return refundRequestService.listMine(customerId);
    }
}

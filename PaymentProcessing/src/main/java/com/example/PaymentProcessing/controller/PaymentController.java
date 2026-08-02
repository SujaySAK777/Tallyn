package com.example.PaymentProcessing.controller;

import com.example.PaymentProcessing.api.CreatePaymentRequest;
import com.example.PaymentProcessing.api.PaymentHistoryResponse;
import com.example.PaymentProcessing.api.PaymentReceiptResponse;
import com.example.PaymentProcessing.api.PaymentResponse;
import com.example.PaymentProcessing.api.PaymentSearchResponse;
import com.example.PaymentProcessing.api.PaymentSummaryResponse;
import com.example.PaymentProcessing.api.UpdatePaymentStatusRequest;
import com.example.PaymentProcessing.model.PaymentStatus;
import com.example.PaymentProcessing.service.PaymentService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentResponse create(@RequestBody CreatePaymentRequest request) {
        return paymentService.createPayment(request);
    }

    @GetMapping("/{paymentId}")
    public PaymentResponse get(@PathVariable Long paymentId) {
        return paymentService.getPayment(paymentId);
    }

    @GetMapping
    public List<PaymentResponse> list(@RequestParam(required = false) PaymentStatus status) {
        return paymentService.listPayments(status);
    }

    @GetMapping("/search")
    public PaymentSearchResponse search(
            @RequestParam(required = false) List<PaymentStatus> status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount,
            @RequestParam(required = false) Long senderAccountId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sortDateDir,
            @RequestParam(required = false) String sortAmountDir,
            @RequestParam(required = false) String sortPrimary,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return paymentService.searchPayments(status, fromDate, toDate, minAmount, maxAmount, senderAccountId, search, sortDateDir, sortAmountDir, sortPrimary, page, size);
    }

    @GetMapping("/summary")
    public PaymentSummaryResponse summary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount,
            @RequestParam(required = false) Long senderAccountId,
            @RequestParam(required = false) String search
    ) {
        return paymentService.getSummary(fromDate, toDate, minAmount, maxAmount, senderAccountId, search);
    }

    @GetMapping("/{paymentId}/history")
    public List<PaymentHistoryResponse> history(@PathVariable Long paymentId) {
        return paymentService.getPaymentHistory(paymentId);
    }

    @GetMapping("/{paymentId}/receipt")
    public PaymentReceiptResponse receipt(@PathVariable Long paymentId) {
        return paymentService.getPaymentReceipt(paymentId);
    }

    @PutMapping("/{paymentId}/status")
    public PaymentResponse updateStatus(@PathVariable Long paymentId, @RequestBody UpdatePaymentStatusRequest request) {
        return paymentService.updateStatus(paymentId, request);
    }
}

package com.example.PaymentProcessing.controller;

import com.example.PaymentProcessing.api.CreatePaymentRequest;
import com.example.PaymentProcessing.api.PaymentHistoryResponse;
import com.example.PaymentProcessing.api.PaymentReceiptResponse;
import com.example.PaymentProcessing.api.PaymentResponse;
import com.example.PaymentProcessing.api.PaymentSearchResponse;
import com.example.PaymentProcessing.api.PaymentSummaryResponse;
import com.example.PaymentProcessing.api.RefundRequestResponse;
import com.example.PaymentProcessing.api.UpdatePaymentStatusRequest;
import com.example.PaymentProcessing.model.PaymentCategory;
import com.example.PaymentProcessing.model.PaymentStatus;
import com.example.PaymentProcessing.model.RefundRequestType;
import com.example.PaymentProcessing.service.PaymentService;
import com.example.PaymentProcessing.service.RefundRequestService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final RefundRequestService refundRequestService;

    public PaymentController(PaymentService paymentService, RefundRequestService refundRequestService) {
        this.paymentService = paymentService;
        this.refundRequestService = refundRequestService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentResponse create(@RequestBody CreatePaymentRequest request, @RequestAttribute("customerId") Long customerId) {
        return paymentService.createPayment(request, customerId);
    }

    @GetMapping("/{paymentId}")
    public PaymentResponse get(@PathVariable Long paymentId) {
        return paymentService.getPayment(paymentId);
    }

    @GetMapping
    public List<PaymentResponse> list(
            @RequestParam(required = false) PaymentStatus status,
            @RequestParam(required = false) Long customerId
    ) {
        return paymentService.listPayments(status, customerId);
    }

    @GetMapping("/search")
    public PaymentSearchResponse search(
            @RequestParam(required = false) List<PaymentStatus> status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount,
            @RequestParam(required = false) Long senderAccountId,
            @RequestParam(required = false) PaymentCategory category,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sortDateDir,
            @RequestParam(required = false) String sortAmountDir,
            @RequestParam(required = false) String sortPrimary,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return paymentService.searchPayments(status, fromDate, toDate, minAmount, maxAmount, senderAccountId, category, paymentMethod, search, sortDateDir, sortAmountDir, sortPrimary, page, size);
    }

    @GetMapping("/summary")
    public PaymentSummaryResponse summary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount,
            @RequestParam(required = false) Long senderAccountId,
            @RequestParam(required = false) PaymentCategory category,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) String search
    ) {
        return paymentService.getSummary(fromDate, toDate, minAmount, maxAmount, senderAccountId, category, paymentMethod, search);
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

    // Sender raises a ticket asking for a COMPLETED payment to be reversed. No money moves
    // here - an admin must approve it (see AdminController) before the receiver is debited.
    @PostMapping("/{paymentId}/refund-requests")
    @ResponseStatus(HttpStatus.CREATED)
    public RefundRequestResponse requestRefund(
            @PathVariable Long paymentId,
            @RequestParam(required = false) String reason,
            @RequestParam(required = false) RefundRequestType type,
            @RequestAttribute("customerId") Long customerId
    ) {
        return refundRequestService.createRequest(paymentId, reason, type, customerId);
    }

    @GetMapping("/{paymentId}/refund-requests")
    public List<RefundRequestResponse> listRefundRequests(
            @PathVariable Long paymentId,
            @RequestAttribute("customerId") Long customerId
    ) {
        return refundRequestService.listForPayment(paymentId, customerId);
    }

    // Demo/testing endpoint: completes a PROCESSING payment, optionally injecting a
    // simulated mid-settlement failure. Keywords: SUCCESS (default), DB_FAILURE, TIMEOUT_FAILURE.
    @PostMapping("/{paymentId}/simulate-processing")
    public PaymentResponse simulateProcessing(
            @PathVariable Long paymentId,
            @RequestParam(defaultValue = "SUCCESS") String failureMode
    ) {
        return paymentService.simulateProcessingPayment(paymentId, failureMode);
    }

    @PostMapping("/{paymentId}/resend-notifications")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void resendNotifications(@PathVariable Long paymentId) {
        paymentService.resendNotifications(paymentId);
    }
}

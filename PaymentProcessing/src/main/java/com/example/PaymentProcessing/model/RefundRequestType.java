package com.example.PaymentProcessing.model;

// Classifies why a refund is being asked for, derived automatically from the underlying
// payment's category when the ticket is raised - see RefundRequestService.classifyType.
public enum RefundRequestType {
    WRONG_PAYMENT,
    MERCHANT_REFUND_REQUEST
}

package com.example.PaymentProcessing.exception;

/**
 * Thrown by {@link com.example.PaymentProcessing.service.PaymentSimulationService}
 * after the sender debit has executed but before the receiver credit, so the
 * enclosing @Transactional method rolls the debit back exactly like a real
 * mid-settlement crash or gateway timeout would.
 */
public class SimulatedProcessingFailureException extends RuntimeException {
    private final String errorCode;

    public SimulatedProcessingFailureException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}

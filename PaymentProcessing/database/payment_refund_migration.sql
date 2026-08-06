USE payment_processing;

ALTER TABLE payment
    MODIFY COLUMN status ENUM(
        'CREATED',
        'VALIDATED',
        'PROCESSING',
        'COMPLETED',
        'FAILED',
        'REFUNDED'
    ) NOT NULL DEFAULT 'CREATED';

ALTER TABLE payment ADD COLUMN settled_amount DECIMAL(15,2) NULL AFTER amount;
ALTER TABLE payment ADD COLUMN refund_reason VARCHAR(255) NULL AFTER error_message;
ALTER TABLE payment ADD COLUMN refunded_at TIMESTAMP NULL AFTER refund_reason;

ALTER TABLE payment_history
    MODIFY COLUMN previous_status ENUM(
        'CREATED',
        'VALIDATED',
        'PROCESSING',
        'COMPLETED',
        'FAILED',
        'REFUNDED'
    ),
    MODIFY COLUMN current_status ENUM(
        'CREATED',
        'VALIDATED',
        'PROCESSING',
        'COMPLETED',
        'FAILED',
        'REFUNDED'
    ) NOT NULL;

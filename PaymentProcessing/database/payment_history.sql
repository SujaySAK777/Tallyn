CREATE TABLE payment_history (

    history_id BIGINT AUTO_INCREMENT PRIMARY KEY,

    payment_id BIGINT NOT NULL,

    previous_status ENUM(
        'CREATED',
        'VALIDATED',
        'PROCESSING',
        'COMPLETED',
        'FAILED'
    ),

    current_status ENUM(
        'CREATED',
        'VALIDATED',
        'PROCESSING',
        'COMPLETED',
        'FAILED'
    ) NOT NULL,

    remarks VARCHAR(255),

    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_history_payment
        FOREIGN KEY (payment_id)
        REFERENCES payment(payment_id)
        ON DELETE CASCADE
);
CREATE TABLE payment_history (

    history_id BIGINT AUTO_INCREMENT PRIMARY KEY,

    payment_id BIGINT NOT NULL,

    previous_status ENUM(
        'CREATED',
        'VALIDATED',
        'PROCESSING',
        'COMPLETED',
        'FAILED'
    ),

    current_status ENUM(
        'CREATED',
        'VALIDATED',
        'PROCESSING',
        'COMPLETED',
        'FAILED'
    ) NOT NULL,

    remarks VARCHAR(255),

    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_history_payment
        FOREIGN KEY (payment_id)
        REFERENCES payment(payment_id)
        ON DELETE CASCADE
);
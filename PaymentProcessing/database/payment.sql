CREATE TABLE payment (

    payment_id BIGINT AUTO_INCREMENT PRIMARY KEY,

    source_account_id BIGINT NOT NULL,
    destination_account_id BIGINT NOT NULL,

    amount DECIMAL(15,2) NOT NULL,

    currency CHAR(3) NOT NULL,

    status ENUM(
        'CREATED',
        'VALIDATED',
        'PROCESSING',
        'COMPLETED',
        'FAILED'
    ) NOT NULL DEFAULT 'CREATED',

    reference_number VARCHAR(100) NOT NULL UNIQUE,

    remarks VARCHAR(255),

    error_code VARCHAR(50),
    error_message VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_source
        FOREIGN KEY (source_account_id)
        REFERENCES account(account_id),

    CONSTRAINT fk_payment_destination
        FOREIGN KEY (destination_account_id)
        REFERENCES account(account_id),

    CONSTRAINT chk_amount
        CHECK (amount > 0),

    CONSTRAINT chk_different_accounts
        CHECK (source_account_id <> destination_account_id)
);

CREATE TABLE scheduled_payment (
    scheduled_payment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_account_id BIGINT NOT NULL,
    destination_account_id BIGINT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency CHAR(3) NOT NULL,
    remarks VARCHAR(255),
    scheduled_at DATETIME NOT NULL,
    status ENUM('PENDING','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING',
    reference_number VARCHAR(100) NOT NULL UNIQUE,
    error_code VARCHAR(50),
    error_message VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_scheduled_source
        FOREIGN KEY (source_account_id) REFERENCES account(account_id),
    CONSTRAINT fk_scheduled_destination
        FOREIGN KEY (destination_account_id) REFERENCES account(account_id),
    CONSTRAINT chk_scheduled_amount
        CHECK (amount > 0),
    CONSTRAINT chk_scheduled_different_accounts
        CHECK (source_account_id <> destination_account_id)
);

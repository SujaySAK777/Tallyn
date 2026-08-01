-- Run after customer.sql
USE payment_processing;

-- OTP values must be stored as hashes, never as plain text.
CREATE TABLE IF NOT EXISTS account_verification (
    verification_id BIGINT NOT NULL AUTO_INCREMENT,
    customer_id BIGINT NOT NULL,
    verification_type ENUM('EMAIL_OTP', 'BANK_ACCOUNT_OTP') NOT NULL,
    destination_hint VARCHAR(100) NOT NULL,
    otp_hash VARCHAR(120) NOT NULL,
    expires_at DATETIME NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    verified_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (verification_id),
    KEY idx_verification_customer_type (customer_id, verification_type),
    CONSTRAINT fk_verification_customer
        FOREIGN KEY (customer_id) REFERENCES customer(customer_id)
        ON DELETE CASCADE
);

-- Run after CreateDatabase.sql
USE payment_processing;

CREATE TABLE IF NOT EXISTS customer (
    customer_id BIGINT NOT NULL AUTO_INCREMENT,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(120) NOT NULL,
    phone_number VARCHAR(20) NULL,
    first_name VARCHAR(80) NULL,
    last_name VARCHAR(80) NULL,
    date_of_birth DATE NULL,
    address_line1 VARCHAR(160) NULL,
    address_line2 VARCHAR(160) NULL,
    city VARCHAR(80) NULL,
    state VARCHAR(80) NULL,
    postal_code VARCHAR(20) NULL,
    country_code CHAR(2) NOT NULL DEFAULT 'IN',
    onboarding_status ENUM('SIGNED_UP', 'PROFILE_COMPLETE', 'ACCOUNT_LINKED', 'VERIFIED', 'TPIN_SET', 'ACTIVE')
        NOT NULL DEFAULT 'SIGNED_UP',
    email_verified_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (customer_id),
    UNIQUE KEY uq_customer_email (email)
);

-- Updated on 4th Aug
ALTER TABLE customer ADD CONSTRAINT uq_customer_phone UNIQUE (phone_number);

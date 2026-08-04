CREATE TABLE scheduled_payment (
    scheduled_payment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_account_id BIGINT NOT NULL,
    destination_account_id BIGINT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency CHAR(3) NOT NULL,
    remarks VARCHAR(255),
    receiver_bank_name VARCHAR(100),
    receiver_ifsc VARCHAR(20),
    scheduled_at DATETIME NOT NULL,
    execution_type ENUM('ONE_TIME','RECURRING') NOT NULL DEFAULT 'ONE_TIME',
    recurrence_type ENUM('MONTHLY','CUSTOM_DAYS') NULL,
    recurrence_interval_days INT NULL,
    last_run_at DATETIME NULL,
    status ENUM('PENDING','COMPLETED','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
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
        CHECK (source_account_id <> destination_account_id),
    CONSTRAINT chk_recurrence_interval
        CHECK (recurrence_interval_days IS NULL OR recurrence_interval_days > 0)
);

-- Updated on 4th Aug(2026)
ALTER TABLE scheduled_payment
  ADD COLUMN execution_type ENUM('ONE_TIME','RECURRING') NOT NULL DEFAULT 'ONE_TIME'
  AFTER scheduled_at;


ALTER TABLE scheduled_payment
  ADD COLUMN receiver_bank_name VARCHAR(100) AFTER remarks,
  ADD COLUMN receiver_ifsc VARCHAR(20) AFTER receiver_bank_name,
  ADD COLUMN recurrence_type ENUM('MONTHLY','CUSTOM_DAYS') NULL AFTER execution_type,
  ADD COLUMN recurrence_interval_days INT NULL AFTER recurrence_type,
  ADD COLUMN last_run_at DATETIME NULL AFTER recurrence_interval_days,
  ADD CONSTRAINT chk_recurrence_interval
    CHECK (recurrence_interval_days IS NULL OR recurrence_interval_days > 0);

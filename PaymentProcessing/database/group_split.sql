CREATE TABLE group_split (
    group_split_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    created_by_customer_id BIGINT NOT NULL,
    source_account_id BIGINT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    description VARCHAR(255) NOT NULL,
    split_type ENUM('EQUAL','UNEQUAL') NOT NULL DEFAULT 'EQUAL',
    reference_number VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_group_split_creator
        FOREIGN KEY (created_by_customer_id) REFERENCES customer(customer_id),
    CONSTRAINT chk_group_split_amount CHECK (total_amount > 0)
);
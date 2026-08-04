CREATE TABLE beneficiary (
    beneficiary_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    account_number VARCHAR(20) NOT NULL,
    account_holder_name VARCHAR(100) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    ifsc_code VARCHAR(20),
    nickname VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_beneficiary_customer
        FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
    CONSTRAINT uq_beneficiary_customer_account UNIQUE (customer_id, account_number)
);

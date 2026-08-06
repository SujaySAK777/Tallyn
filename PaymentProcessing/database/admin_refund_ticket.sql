USE payment_processing;

CREATE TABLE IF NOT EXISTS admin (
    admin_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(120) NOT NULL,
    name VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refund_request (
    request_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    payment_id BIGINT NOT NULL,
    requested_by_customer_id BIGINT NOT NULL,
    reason VARCHAR(255) NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    rejection_reason VARCHAR(255) NULL,
    resolved_by_admin_id BIGINT NULL,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_refund_request_payment
        FOREIGN KEY (payment_id) REFERENCES payment(payment_id),

    CONSTRAINT fk_refund_request_customer
        FOREIGN KEY (requested_by_customer_id) REFERENCES customer(customer_id),

    CONSTRAINT fk_refund_request_admin
        FOREIGN KEY (resolved_by_admin_id) REFERENCES admin(admin_id),

    KEY idx_refund_request_payment (payment_id),
    KEY idx_refund_request_status (status)
);

-- Demo admin login: admin@tallyn.com / 123456
-- (same bcrypt hash already used for the sample customer TPINs/passwords elsewhere in this project)
INSERT INTO admin (email, password_hash, name)
VALUES ('admin@tallyn.com', '$2b$10$gl1qVfcMLMhgVZI4fSuj1eBav.b.bxlXyUOZGjDJAHlHMstmfua62', 'Tallyn Admin');

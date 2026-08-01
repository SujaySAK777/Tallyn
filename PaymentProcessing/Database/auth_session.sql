-- Run after customer.sql
USE payment_processing;

-- Session tokens are hashed, allowing secure expiry and logout.
CREATE TABLE IF NOT EXISTS auth_session (
    session_id BIGINT NOT NULL AUTO_INCREMENT,
    customer_id BIGINT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    last_seen_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id),
    UNIQUE KEY uq_auth_session_token_hash (token_hash),
    KEY idx_auth_session_customer (customer_id),
    KEY idx_auth_session_expiry (expires_at),
    CONSTRAINT fk_auth_session_customer
        FOREIGN KEY (customer_id) REFERENCES customer(customer_id)
        ON DELETE CASCADE
);

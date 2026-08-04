CREATE TABLE group_split_member (
    group_split_member_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    group_split_id BIGINT NOT NULL,
    account_id BIGINT NOT NULL,
    account_number VARCHAR(20) NOT NULL,
    customer_id BIGINT NOT NULL,
    share_amount DECIMAL(15,2) NOT NULL,
    seen BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_gsm_group_split
        FOREIGN KEY (group_split_id) REFERENCES group_split(group_split_id),
    CONSTRAINT fk_gsm_account
        FOREIGN KEY (account_id) REFERENCES account(account_id),
    CONSTRAINT fk_gsm_customer
        FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
    CONSTRAINT chk_gsm_share CHECK (share_amount > 0)
);
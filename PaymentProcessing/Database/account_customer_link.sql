-- Run after customer.sql and after the existing account table has been created.
-- This is a one-time migration. Do not run it more than once.
USE payment_processing;

ALTER TABLE account
    ADD COLUMN customer_id BIGINT NULL AFTER account_id,
    ADD COLUMN linked_at DATETIME NULL,
    ADD COLUMN verified_at DATETIME NULL,
    ADD KEY idx_account_customer (customer_id),
    ADD CONSTRAINT fk_account_customer
        FOREIGN KEY (customer_id) REFERENCES customer(customer_id)
        ON DELETE RESTRICT;

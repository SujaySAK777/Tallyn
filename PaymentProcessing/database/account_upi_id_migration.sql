USE payment_processing;

ALTER TABLE account ADD COLUMN upi_id VARCHAR(60) NULL AFTER mobile_number;
ALTER TABLE account ADD CONSTRAINT uq_account_upi_id UNIQUE (upi_id);

USE payment_processing;
ALTER TABLE payment ADD COLUMN category VARCHAR(32) NULL AFTER currency;

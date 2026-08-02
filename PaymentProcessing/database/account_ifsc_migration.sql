USE payment_processing;
ALTER TABLE account ADD COLUMN ifsc_code VARCHAR(20) NULL AFTER bank_name;
UPDATE account SET ifsc_code = 'DEMO0000001' WHERE ifsc_code IS NULL;

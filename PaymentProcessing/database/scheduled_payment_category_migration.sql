USE payment_processing;

-- scheduled_payment.sql's CREATE TABLE already lists a category column, but the live
-- table predates that and was never altered to add it - this is the missing piece.
ALTER TABLE scheduled_payment ADD COLUMN category VARCHAR(32) NULL AFTER currency;

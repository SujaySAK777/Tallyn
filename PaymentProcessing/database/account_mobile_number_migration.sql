USE payment_processing;

SET @exists := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = 'payment_processing'
      AND table_name = 'account'
      AND column_name = 'mobile_number'
);

SET @sql := IF(
    @exists = 0,
    'ALTER TABLE account ADD COLUMN mobile_number VARCHAR(15) NULL AFTER account_holder_name',
    'SELECT ''mobile_number already exists'''
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

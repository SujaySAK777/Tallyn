-- Test recipient for the INR -> USD payment flow.
-- Run this in the `payment_processing` schema from MySQL Workbench.
-- TPIN is 123456; it is only needed when this account is used as a sender.

INSERT INTO account (
    bank_name,
    ifsc_code,
    account_number,
    account_holder_name,
    mobile_number,
    balance,
    tpin,
    currency,
    status
)
VALUES (
    'Wells Fargo',
    'WFBIUS6S',
    'USD1001',
    'Emma Wilson',
    '+14155550100',
    1500.00,
    '$2b$10$gl1qVfcMLMhgVZI4fSuj1eBav.b.bxlXyUOZGjDJAHlHMstmfua62',
    'USD',
    'ACTIVE'
)
ON DUPLICATE KEY UPDATE
    bank_name = VALUES(bank_name),
    ifsc_code = VALUES(ifsc_code),
    account_holder_name = VALUES(account_holder_name),
    mobile_number = VALUES(mobile_number),
    currency = VALUES(currency),
    status = VALUES(status);

-- Sample Accounts
-- TPIN for every account below is 123456 (bcrypt hash verified against
-- Spring Security's BCryptPasswordEncoder before being committed here).

INSERT INTO account (
    bank_name,
    account_number,
    account_holder_name,
    balance,
    tpin,
    currency,
    status
)
VALUES
('HDFC', 'ACC1001', 'Alice Johnson', 50000.00, '$2b$10$gl1qVfcMLMhgVZI4fSuj1eBav.b.bxlXyUOZGjDJAHlHMstmfua62', 'INR', 'ACTIVE'),
('IDFC', 'ACC1002', 'Bob Smith', 25000.00, '$2b$10$gl1qVfcMLMhgVZI4fSuj1eBav.b.bxlXyUOZGjDJAHlHMstmfua62', 'INR', 'ACTIVE'),
('HSBC', 'ACC1003', 'Charlie Brown', 15000.00, '$2b$10$gl1qVfcMLMhgVZI4fSuj1eBav.b.bxlXyUOZGjDJAHlHMstmfua62', 'INR', 'ACTIVE');

select * from account;

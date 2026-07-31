-- Sample Accounts

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
('HDFC', 'ACC1001', 'Alice Johnson', 50000.00, '$2b$10$MiXXXXRPAFCjfTIzLMtHHXXX7jKTLYh542aBuIOAhxH0ZrBomhToS', 'INR', 'ACTIVE'),
('ICICI', 'ACC1002', 'Bob Smith', 25000.00, '$2b$10$MiXXXXRPAFCjfTIzLMtHHXXX7jKTLYh542aBuIOAhxH0ZrBomhToS', 'INR', 'ACTIVE'),
('SBI', 'ACC1003', 'Charlie Brown', 15000.00, '$2b$10$MiXXXXRPAFCjfTIzLMtHHXXX7jKTLYh542aBuIOAhxH0ZrBomhToS', 'INR', 'ACTIVE'),
('AXIS', 'ACC1004', 'David Wilson', 100000.00, '$2b$10$MiXXXXRPAFCjfTIzLMtHHXXX7jKTLYh542aBuIOAhxH0ZrBomhToS', 'INR', 'ACTIVE'),
('KOTAK', 'ACC1005', 'Emma Davis', 5000.00, '$2b$10$MiXXXXRPAFCjfTIzLMtHHXXX7jKTLYh542aBuIOAhxH0ZrBomhToS', 'INR', 'BLOCKED');


select * from account;
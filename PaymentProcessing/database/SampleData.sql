-- Sample Accounts

INSERT INTO account (
    account_number,
    account_holder_name,
    balance,
    currency,
    status
)
VALUES
('ACC1001', 'Alice Johnson', 50000.00, 'INR', 'ACTIVE'),
('ACC1002', 'Bob Smith', 25000.00, 'INR', 'ACTIVE'),
('ACC1003', 'Charlie Brown', 15000.00, 'INR', 'ACTIVE'),
('ACC1004', 'David Wilson', 100000.00, 'INR', 'ACTIVE'),
('ACC1005', 'Emma Davis', 5000.00, 'INR', 'BLOCKED');


select * from account;
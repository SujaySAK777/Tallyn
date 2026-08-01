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
('HDFC', 'ACC1001', 'Alice Johnson', 50000.00,'$2b$10$Mik8ECRPAFCjfTIzLMtHHO2d7jKTLYh542aBuIOAhxH0ZrBomhToS', 'INR', 'ACTIVE'),
('IDFC', 'ACC1002', 'Bob Smith', 25000.00,'$2b$10$C5xuUet0bfAzttlS8nEOUO52Ph1HXRV0ZLlmomFH.FhTsbb.UbHI.', 'INR', 'ACTIVE'),
('HSBC', 'ACC1003', 'Charlie Brown', 15000.00,'$2b$10$UsxIBHFurjBXGR.DUByjmevApIo.YvIk4Yp7NVKhK9Rdn/WF7AuNm','INR', 'ACTIVE');


select * from account;
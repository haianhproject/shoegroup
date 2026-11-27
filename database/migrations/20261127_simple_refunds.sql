-- Lưu hình thức hoàn tiền, giữ nguyên chứng từ và lịch sử cũ.
SET XACT_ABORT ON;
IF COL_LENGTH('dbo.RefundConfirmations','RefundMethod') IS NULL
  ALTER TABLE dbo.RefundConfirmations ADD RefundMethod varchar(10) NOT NULL
    CONSTRAINT DF_RefundConfirmations_Method DEFAULT('UNKNOWN')
    CONSTRAINT CK_RefundConfirmations_Method CHECK(RefundMethod IN ('CASH','BANK','UNKNOWN'));

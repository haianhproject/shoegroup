-- Nguồn tiếp nhận trả hàng và chỉ mục đối chiếu sản phẩm; giữ nguyên chứng từ cũ.
SET XACT_ABORT ON;
IF COL_LENGTH('dbo.OrderReturns','Source') IS NULL
  ALTER TABLE dbo.OrderReturns ADD Source varchar(16) NOT NULL
    CONSTRAINT DF_OrderReturns_Source DEFAULT('CUSTOMER')
    CONSTRAINT CK_OrderReturns_Source CHECK(Source IN ('CUSTOMER','ZALO'));
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.OrderReturnItems') AND name='IX_OrderReturnItems_OrderDetail')
  CREATE INDEX IX_OrderReturnItems_OrderDetail ON dbo.OrderReturnItems(OrderDetailID,ReturnID)
    INCLUDE(GoodQuantity,DamagedQuantity,RefundAmount);

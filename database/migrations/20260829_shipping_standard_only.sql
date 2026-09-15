/* ShoeGroup - chỉ dùng giao hàng tiêu chuẩn
   Không xóa bản ghi cũ; chỉ tắt phương thức hỏa tốc để có thể khôi phục khi cần. */
IF OBJECT_ID(N'dbo.ShippingMethods', N'U') IS NOT NULL
BEGIN
  UPDATE dbo.ShippingMethods
  SET IsActive = 0
  WHERE UPPER(LTRIM(RTRIM(MethodCode))) = 'EXPRESS';
END
GO

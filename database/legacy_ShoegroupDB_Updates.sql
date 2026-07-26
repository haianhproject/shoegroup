USE [ShoegroupDB]
GO

-- 1. Tạo bảng Notifications (Thông báo)
CREATE TABLE [dbo].[Notifications](
	[NotificationID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NOT NULL,
	[Title] [nvarchar](255) NOT NULL,
	[Message] [nvarchar](max) NOT NULL,
	[Type] [varchar](50) NULL,
	[RelatedID] [int] NULL,
	[IsRead] [bit] NOT NULL CONSTRAINT [DF_Notifications_IsRead] DEFAULT ((0)),
	[CreatedAt] [datetime] NOT NULL CONSTRAINT [DF_Notifications_CreatedAt] DEFAULT (getdate()),
PRIMARY KEY CLUSTERED 
(
	[NotificationID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

-- Thêm khóa ngoại cho bảng Notifications
ALTER TABLE [dbo].[Notifications]  WITH CHECK ADD  CONSTRAINT [FK_Notifications_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[Notifications] CHECK CONSTRAINT [FK_Notifications_Users]
GO

-- 2. Tạo TRIGGER tự động thêm thông báo khi trạng thái đơn hàng thay đổi
CREATE OR ALTER TRIGGER [dbo].[trg_Orders_StatusChange_Notify]
ON [dbo].[Orders]
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Xử lý khi CẬP NHẬT đơn hàng (UPDATE)
    IF EXISTS (SELECT * FROM deleted)
    BEGIN
        IF UPDATE(Status)
        BEGIN
            INSERT INTO [dbo].[Notifications] (UserID, Title, Message, Type, RelatedID, IsRead, CreatedAt)
            SELECT 
                i.UserID,
                N'Cập nhật trạng thái đơn hàng',
                N'Đơn hàng #' + CAST(i.OrderID AS NVARCHAR(50)) + N' đã chuyển sang trạng thái: ' + i.Status,
                'Order',
                i.OrderID,
                0,
                GETDATE()
            FROM inserted i
            INNER JOIN deleted d ON i.OrderID = d.OrderID
            WHERE i.Status <> d.Status AND i.UserID IS NOT NULL;
        END
    END
    -- Xử lý khi TẠO MỚI đơn hàng (INSERT)
    ELSE
    BEGIN
        INSERT INTO [dbo].[Notifications] (UserID, Title, Message, Type, RelatedID, IsRead, CreatedAt)
        SELECT 
            i.UserID,
            N'Đặt hàng thành công',
            N'Bạn đã đặt thành công đơn hàng #' + CAST(i.OrderID AS NVARCHAR(50)) + N' với trạng thái: ' + ISNULL(i.Status, N'Chờ xác nhận'),
            'Order',
            i.OrderID,
            0,
            GETDATE()
        FROM inserted i
        WHERE i.UserID IS NOT NULL;
    END
END;
GO

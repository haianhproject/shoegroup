"use strict";

// Explicitly isolated integration fixture. Never imports the SQL dump's seed data.
const fs = require("node:fs");
const path = require("node:path");
const sql = require("mssql");
const config = require("../../src/security/env");
const jwt = require("../../src/security/jwt");
const password = require("../../src/security/password");
const DATABASE = process.env.AUDIT_DB_NAME || "ShoegroupAudit_20260909";
if (!/^ShoegroupAudit_[A-Za-z0-9_]+$/.test(DATABASE)) throw new Error("Audit database name must use ShoegroupAudit_ prefix");
const connection = (database = DATABASE) => new sql.ConnectionPool({ ...config.db, database, connectionTimeout: 10000 });
const users = Array.from({ length: 12 }, (_, i) => ({ id: i + 2, addressId: i + 1, email: `audit${i + 1}@example.test`, role: "Customer" }));
const admin = { id: 1, email: "audit-admin@example.test", role: "Admin" };
const token = (user = users[0]) => jwt.sign({ sub: user.id, email: user.email, role: user.role, roleId: user.role === "Admin" ? 1 : 2 });
async function api(route, { method = "GET", user = users[0], body, headers = {}, port = process.env.AUDIT_PORT || 5100 } = {}) {
  if (!/^51\d{2}$/.test(String(port))) throw new Error('Audit HTTP writes require an isolated port in 5100-5199');
  const response = await fetch(`http://127.0.0.1:${port}/api${route}`, {
    method, headers: { "Content-Type": "application/json", ...(user ? { Authorization: `Bearer ${token(user)}` } : {}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await response.text();
  let data; try { data = JSON.parse(raw); } catch { data = raw; }
  return { status: response.status, data };
}
async function runBatches(pool, source) {
  let count = 0;
  for (const batch of source.split(/^\s*GO\s*$/gim)) {
    if (!batch.trim()) continue;
    try { await pool.request().batch(batch); } catch (error) {
      error.message = `Schema batch ${count} (${batch.trim().slice(0, 100)}): ${error.message}`;
      throw error;
    }
    count += 1;
  }
  return count;
}
async function setup() {
  const master = await connection("master").connect();
  try {
    const exists = await master.request().input("name", sql.NVarChar, DATABASE).query("SELECT DB_ID(@name) AS id");
    if (!exists.recordset[0].id) await master.request().query(`CREATE DATABASE [${DATABASE}]`);
  } finally { await master.close(); }
  const pool = await connection().connect();
  try {
    const tables = await pool.request().query("SELECT COUNT(*) AS count FROM sys.tables");
    if (tables.recordset[0].count) throw new Error(`Refusing to initialize nonempty audit database ${DATABASE}`);
    const root = path.resolve(__dirname, "../../..");
    const bytes = fs.readFileSync(path.join(root, "database/dbsql.sql"));
    const source = bytes.toString(bytes[0] === 0xff && bytes[1] === 0xfe ? "utf16le" : "utf8").replace(/^\uFEFF/, "")
      .split(/\r?\n/).filter(line => !/^(USE\s|INSERT \[dbo\]|SET IDENTITY_INSERT\s)/i.test(line)).join("\n");
    await runBatches(pool, source);
    for (const name of ["20260826_sales_flow.sql", "20260829_shipping_standard_only.sql", "20260829_profile_avatar.sql", "20260829_stock_race_hardening.sql"]) {
      await runBatches(pool, fs.readFileSync(path.join(root, "database/migrations", name), "utf8"));
    }
    await runBatches(pool, fs.readFileSync(path.join(root, "database/shoegroup_wallet.sql"), "utf8"));
    for (const name of ['20260909_checkout_idempotency.sql','20260909_coupon_redemptions.sql','20260909_audit_constraints.sql']) {
      await runBatches(pool, fs.readFileSync(path.join(root, 'database/migrations', name), 'utf8'));
    }
    const hash = await password.hash("Audit-Only-Password-2026");
    await pool.request().input("hash", sql.VarChar, hash).query(`
      INSERT dbo.Roles(RoleName) VALUES ('Admin'),('Customer');
      INSERT dbo.Users(RoleID,Email,PasswordHash,FullName,Phone,IsActive) VALUES (1,'audit-admin@example.test',@hash,N'Audit Admin','0900000000',1);
      DECLARE @i int = 1;
      WHILE @i <= 12 BEGIN
        INSERT dbo.Users(RoleID,Email,PasswordHash,FullName,Phone,IsActive) VALUES (2,CONCAT('audit',@i,'@example.test'),@hash,CONCAT(N'Audit Customer ',@i),CONCAT('090000',RIGHT('0000'+CAST(@i AS varchar(4)),4)),1);
        DECLARE @uid int = SCOPE_IDENTITY();
        INSERT dbo.UserAddresses(UserID,RecipientName,Phone,Province,District,Ward,AddressLine,FullAddress,Latitude,Longitude,IsVerified,IsDefault)
          VALUES (@uid,CONCAT(N'Audit Customer ',@i),'0900000001',N'Thành phố Hồ Chí Minh',N'Quận 1',N'Phường Bến Nghé',N'1 Audit Street',N'1 Audit Street, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh',10.7769,106.7009,1,1);
        SET @i += 1;
      END;
      INSERT dbo.Categories(CategoryName,IsActive) VALUES (N'Audit Shoes',1);
      INSERT dbo.Brands(BrandName,IsActive) VALUES (N'Audit Brand',1);
      INSERT dbo.Products(CategoryID,BrandID,ProductName,BasePrice,SalePrice,IsActive,ParentSKU) VALUES
        (1,1,N'Audit Product A',500000,0,1,'AUDIT-A'),(1,1,N'Audit Product B',600000,0,1,'AUDIT-B'),(1,1,N'Audit Disabled Product',300000,0,0,'AUDIT-DISABLED');
      INSERT dbo.ProductVariants(ProductID,Size,ColorName,ChildSKU,StockQuantity,PriceAdjustment,IsActive) VALUES
        (1,N'M',N'Black','AUDIT-A-M',100,0,1),(1,N'L',N'Black','AUDIT-A-L',0,0,1),(2,N'M',N'Black','AUDIT-B-M',100,0,1),(3,N'M',N'Black','AUDIT-D-M',100,0,1),(1,N'S',N'Black','AUDIT-A-S',100,0,0);
      INSERT dbo.ShippingMethods(MethodName,MethodCode,BasePrice,PricePerKm,OriginCity,EstimatedTimeText,IsActive)
        VALUES (N'Tiêu chuẩn','STANDARD',30000,0,N'Thành phố Hồ Chí Minh',N'2-5 ngày',1);
      INSERT dbo.PaymentMethods(MethodName,MethodCode,IsActive) VALUES (N'Thanh toán khi nhận hàng','COD',1),(N'Chuyển khoản','BANK',1);
      INSERT dbo.Coupons(CouponCode,DiscountPercent,UsageLimit,UsedCount,ExpiryDate,IsActive,DiscountType,DiscountValue,MinOrderAmount,MaxDiscountAmount,StartDate,PerUserLimit)
        VALUES ('AUDIT-ONE',10,1,0,DATEADD(day,10,GETDATE()),1,N'Phần trăm',10,0,0,DATEADD(day,-1,GETDATE()),1),
          ('AUDIT-MULTI',10,100,0,DATEADD(day,10,GETDATE()),1,N'Phần trăm',10,0,0,DATEADD(day,-1,GETDATE()),1),
          ('AUDIT-EXPIRED',10,100,0,DATEADD(day,-1,GETDATE()),1,N'Phần trăm',10,0,0,DATEADD(day,-10,GETDATE()),1);
    `);
    return { database: DATABASE, users: users.length, adminId: 1, productIds: [1,2,3], variantIds: [1,2,3,4,5] };
  } finally { await pool.close(); }
}
module.exports = { DATABASE, connection, users, admin, token, api, setup, runBatches };
if (require.main === module) setup().then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; });

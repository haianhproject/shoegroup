# ShoeGroup

Vue 3 + Spring Boot + SQL Server. **Chua chuyen het Express sang Spring.**
Hien co 52/76 API native Java; 24 API con lai duoc Spring chuyen tiep den Express.

## Cau truc

```text
frontend/                 Giao dien Vue, anh/video va frontend tests
backend/
  src/main/java/          Code Spring Boot
  src/main/resources/     Cau hinh Spring va SQL truy van
  src/test/               Kiem thu Java va SQL Server
  legacy-express/         Express con can trong giai doan chuyen doi
  scripts/                Chay ung dung, Maven va kiem thu migration
  .env                    Cau hinh cuc bo, khong commit
  pom.xml                 Thu vien va build Spring
  API-INVENTORY.json      Danh sach API va trang thai chuyen doi
database/                 SQL schema va migrations
docs/                     Tai lieu, so do, bao cao va ket qua audit
tools/                    Cong cu kiem tra source; cache duoc Git bo qua
MIGRATION.md              Tien do va ket qua kiem thu
```

## Tim code

| Noi dung | Duong dan |
| --- | --- |
| Diem vao Vue | `frontend/src/main.js`, `frontend/src/App.vue` |
| Route giao dien | `frontend/src/router/index.js`, `frontend/src/views/admin/adminRoutes.js` |
| Trang khach hang | `frontend/src/views/` |
| Trang quan tri | `frontend/src/views/admin/pages/` |
| Logic quan tri/POS | `frontend/src/views/admin/adminStore.js` |
| Goi API / trang thai | `frontend/src/services/`, `frontend/src/stores/` |
| API Spring | `backend/src/main/java/vn/shoegroup/` |
| Checkout/don hang chua port | `backend/legacy-express/server.js`, `backend/legacy-express/src/` |
| Anh/video website | `frontend/img/` |
| So do / bao cao | `docs/diagrams/`, `docs/deliverables/` |

## Chay tu thu muc goc

Can Node.js 22+, JDK 17+ va SQL Server. Lan dau chay `npm run setup`,
tao `backend/.env` theo `backend/.env.example` va cau hinh database cua ban.
Maven tu duoc tai vao `tools/.cache/`, co kiem tra SHA-512.

```powershell
npm run dev
```

Vue: http://localhost:3000. Spring: http://localhost:5000.
Express chuyen tiep chi nghe loopback 127.0.0.1:5001.
Lenh nay doi Express/SQL, Spring/SQL healthy roi moi khoi dong Vue.
`npm run dev:spring` la ten tuong duong. Ctrl+C dung cac tien trinh con.

Khong xoa `backend/legacy-express/`: checkout, don hang, CRUD san pham/khuyen mai,
khach hang, bao cao va scheduled jobs van can no. Doi cau truc thu muc khong phai
da chuyen cac nghiep vu nay sang Java. Xem [MIGRATION.md](MIGRATION.md).

## Kiem tra

```powershell
npm test
npm run build
npm run build:api
npm run test:spring:sql
npm run test:spring:pos
npm run audit:source
```

SQL/POS tests tao database rieng va don sau khi chay, khong ghi du lieu test vao shop.
POS test can JAR duoc tao bang `build:api` truoc. `npm run migration:inventory` liet ke API.

`node_modules/`, `frontend/dist/`, `backend/target/`, `tools/.cache/`, `tools/.work/`
la thu vien/build/cache, khong phai code trung. VS Code an cac thu muc nay.
Bao cao cu co gia tri duoc giu trong `docs/deliverables/`; preview QA duoc Git bo qua.
Khong xoa SQL migrations, `.env`, lockfile, tests hoac media dang su dung.

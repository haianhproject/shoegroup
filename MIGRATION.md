# ShoeGroup: Express -> Spring Boot

Updated: 2026-10-07. Migration is **in progress**, not a complete Java rewrite.

Current checkpoint: **52/76 routes** have native Spring handlers; **24/76** still use the transition API. Admin SSE also retains the legacy event source while order writes remain in Express.

## Contract and architecture

- Keep Vue, existing SQL Server schema, HTTP methods, `/api` paths, JSON field names and status codes.
- Java 17+ (verified locally using JDK 21), Spring Boot 3.5.16, Spring Web, Spring Security, Spring JDBC, Microsoft JDBC driver, Maven.
- Spring listens on 5000. During migration, unconverted routes forward to Express on loopback port 5001. Vue still calls port 5000.
- Native handlers do not fall back after an error. No write is retried through a second implementation.
- Both runtimes use `backend/.env`, the same JWT secret and SQL database. Spring always enforces authorization, including when the old `AUTH_MODE` is `warn`.
- Express remains responsible for existing migrations and scheduled jobs during transition. Do not start two Express instances against the same deployment.
- Set `LEGACY_API_ENABLED=false` to disable forwarding; unfinished APIs then return 501. This does not mean the full application can operate without Express yet.
- No ORM schema generation, password reset for existing users, or edits to business data are required.

## Groups

| Group | Routes | Status |
| --- | --- | --- |
| Foundation | `/api/health`, `/api/log-error`, CORS, rate limits, centralized errors | Native Spring |
| Authentication | `POST /api/login`, `/register`, `/auth/forgot-password`, `/auth/reset-password` | Native Spring |
| Catalogs | GET/POST collections and PUT/DELETE `/:id` for categories, brands, materials, colors, sizes | Native Spring |
| POS carts | GET/DELETE `/api/pos/cart`, PUT `/api/pos/cart/items/:variantId` | Native Spring |
| POS bank settings | GET `/api/pos/payment-config` | Native Spring |
| Admin events | GET `/api/admin/events` | Spring SSE, merges native events and legacy events |
| Addresses | GET/POST `/api/addresses`, PUT/DELETE `/:id` | Native Spring |
| Customer carts | POST `/api/cart/items`, PUT/DELETE `/items/:variantId`, DELETE `/api/cart` | Native Spring |
| Product reads | GET `/api/products`, `/api/v2/products`, `/api/v2/products/featured` | Native Spring, original SQL pricing expressions preserved |
| Product writes | POST `/api/products`, PUT/DELETE `/:id`, PUT `/:id/restore` | Pending, forwarded |
| Accounts | GET/POST `/api/accounts`, PUT/DELETE `/:id` | Native Spring, deletion stays forbidden |
| Customers | `/api/customers`, customer orders and notifications | Pending, forwarded |
| Shipping | GET `/api/shippingmethods`, POST `/api/shipping/quote` | Native Spring, original province rules and fallbacks |
| Checkout/order lifecycle | POST `/api/orders`, GET orders/v2 orders, address/status/payment/receive mutations | Pending, forwarded |
| Discount reads | GET `/api/discounts`, `/api/variantDiscounts` | Native Spring |
| Discount writes | POST/PUT/DELETE `/api/discounts`, `/api/variantDiscounts` | Pending, forwarded |
| Inventory reads | GET `/api/inventory`, `/api/inventory/alerts` | Native Spring |
| Reports | `/chart-data`, `/revenue-by-product`, `/api/v2/dashboard/summary` | Pending, forwarded |
| Scheduled jobs | Auto cancellation and transactional emails attached to orders | Pending, Express owns them |

Run `npm run migration:inventory` for every concrete method/path and its source location.
The checked-in `backend/API-INVENTORY.json` lists all 76 method/path/source/status entries. Regenerate it with `node backend/scripts/inventory.cjs --write` whenever a group is ported.

## Critical invariants

- New passwords retain the Node format `scrypt$16384$8$1$<16-byte-salt-hex>$<64-byte-key-hex>` and UTF-8 input. Existing bcrypt hashes remain accepted. Plaintext legacy credentials upgrade after successful login.
- JWTs retain HS256, numeric `sub`, and the original claims. Every authenticated request reloads account active state and role from SQL; token role alone cannot grant admin rights.
- Account edits are partial patches. Customers cannot edit role/active state, email remains immutable, and account deletion is forbidden. Concurrent admin demotions lock the full admin set in ID order in a serializable transaction, preserving at least one active admin.
- Unknown API routes require admin. Customer account/customer IDs must match the authenticated user. Order ownership checks remain inside legacy order handlers until ported.
- POS locks the cart before variants using the existing `UPDLOCK,HOLDLOCK` statements. Quantity, inventory, version and revision changes commit together. Exceptions roll back all writes. Events publish only after the transactional service returns successfully.
- Checkout still runs the original implementation with the unmodified `Idempotency-Key`, body and token. The SQL transaction-owned application lock and durable `CheckoutRequests` replay remain authoritative. Never add a retry at the HTTP bridge.
- Port checkout only with replay, conflicting-payload, concurrent-key, rollback, stock restoration and discount redemption integration tests. Keep online confirmation-time stock deduction distinct from POS cart-time reservation.

## Run and validate

```powershell
npm run test:spring
npm run test:spring:sql
npm run test:spring:pos
npm run dev:spring
```

`mvnw.cmd` bootstraps Maven 3.9.11 into ignored `tools/.cache/` and verifies its SHA-512 download checksum. Set `JAVA_HOME` to a JDK 17+ if auto-detection does not find one.

`dev:spring` checks ports, waits for Express schema initialization and SQL health, then waits for Spring health before starting Vue; stopping it stops those child process trees. `npm run dev` now starts this same Spring-first transition stack.

Before `test:spring:pos`, build the executable jar with `backend\mvnw.cmd package`. This audit uses an isolated full-schema database and ports 5194/5195. It compares native read responses with Express and exercises native POS reservations through legacy checkout/cancellation, including durable replay and conflicting checkout payloads.

SQL Server named instances: existing `DB_INSTANCE` is supported when `DB_PORT` is absent. `SPRING_DB_URL` can override the generated JDBC URL. Credentials still come from `DB_USER`/`DB_PASS`; keep secrets out of command arguments and Git. Dotenv parsing supports quoted values and comments, with process environment taking precedence.

## Initial checkpoint verification log

- `npm run test:spring:sql`: PASS, 22 tests (12 real SQL integration tests and 10 unit/bridge/shipping tests), isolated temporary database removed afterward.
- SQL coverage includes plaintext password upgrade, locked accounts, role reload, IDOR, one-use reset tokens, atomic POS stock reservations, concurrent last-unit reservations, rollback, online cart non-reservation, address ownership/defaults, password-preserving account patches and concurrent last-admin protection.
- Shipping unit tests cover every fee/ETA boundary, province precedence, accents/aliases, unknown locations and database fallback.
- `backend\mvnw.cmd package -q`: PASS, executable jar created, 10 unit tests passed (12 database tests intentionally skipped without the private SQL test URL).
- `npm test`: PASS, 51/51 frontend contract/regression tests.
- `npm --prefix backend/legacy-express test`: PASS, 29/29 existing backend regression tests.
- `npm run build`: PASS, Vue production bundle created without frontend source changes.
- `npm run test:spring:pos`: PASS, 14/14 full-schema transition scenarios in a temporary database, removed afterward. Product/inventory/discount/account/shipping GET responses match Express exactly; shipping quotes match all original province rules and aliases.
- POS audit also covers restart persistence, stale revisions, checkout replay/conflicting payloads, two-cashier last-unit contention, online/POS stock contention, checkout rollback and cancellation restoring stock once. Checkout/status mutations are still Express-backed in this audit, not evidence of a native Spring checkout.
- `git diff --check`: PASS (only local LF/CRLF conversion notices).
- Live smoke test after `npm run dev:spring`: Vue on 3000 returns 200; Spring on 5000 serves health, products, paginated products, categories and shipping methods directly with 200; anonymous account access returns 401. Express transition listens only on loopback 5001.
- SMTP delivery has not been integration-tested. Native password reset token persistence/expiry/one-use behavior is tested, but order emails and scheduled jobs remain owned by Express.

## Next conversion order

1. Product writes: optimistic stock version checks, image/variant snapshots and hard-delete constraints.
2. Customer administration and order/report reads: maintain owner-scoped queries and date/decimal serialization.
3. Coupon and variant-discount writes: preserve overlapping windows, quota and color/variant scope rules.
4. Checkout: native transaction-owned `sp_getapplock`, canonical payload hashing, durable response replay, POS cart consumption and coupon redemption in one serializable transaction.
5. Order status/payment/receive/address mutations: confirmation-time online stock deduction, idempotent cancellation restoration, payment ledger and revenue history.
6. Move schema migrations, order emails and scheduled cancellation jobs to Spring. Disable legacy forwarding only after native end-to-end tests cover these groups.

Do not describe this checkpoint as a completed Express replacement. `npm run dev:spring` still requires the Express transition process for the pending groups above.

## Project review and cleanup (2026-10-07)

- Git worktree was clean before this review; no pre-existing edits were reverted.
- Removed `backend/legacy/server.original.js`: unreferenced backup, not the running Express server.
- Removed six unreachable Vue/JS files: SakuraFalling, ThemePanel, themeStore, FigmaCustomerLayout, AdminWelcome and StaffReportPage. Import graph includes relative paths, Vue scripts, dynamic routes, CSS and the Vite `@/` alias. Business services, mock shipping fallback and shared navbar/footer remain in use and were preserved.
- Removed obsolete one-shot admin style scripts, document/ERD generation scripts and the tracked Draw.io backup. Removed outdated admin README; root README now maps the actual source entry points.
- Consolidated final and historical coursework into `docs/deliverables/`; consolidated technology diagrams under `docs/diagrams/technology/`. Historical document variants were preserved, not assumed disposable solely because of their dates.
- QA image/PDF files were relocated into ignored `docs/deliverables/qa/` rather than physically deleted (shell deletion was blocked). These are previews, not runtime assets. Git can recover their original tracked versions. Required dependencies, Maven runtime, SQL baselines, schema migrations, `.env`, `.git`, tests and website media were preserved.
- Removed unused `multer` from the Express package and its lockfile dependency tree using npm. No server module imports it; backend regression and full POS suites were repeated after removal. Other dependency versions were not upgraded.
- VS Code hides dependency/build/cache folders so the actual source is easy to find. These settings do not change application behavior or build output.
- Fixed security compatibility: SQL `IsActive=NULL` retains the legacy default-active behavior; oversized owner IDs fail closed instead of throwing; public catalog rules now require a route boundary.
- Fixed development startup ordering: Vue no longer starts before the two backend health checks succeed.
- Native Spring migration remains 52/76 routes. A functioning hybrid setup is not proof the application works without Express or is ready for production. No real SMTP delivery, payment-provider reconciliation or production load test has been performed.
- Found and fixed homepage category fallback returning `undefined` instead of a numeric count. Null category IDs no longer count unrelated products.
- Homepage newsletter has no persistence API; it no longer reports a fabricated successful registration. A real newsletter implementation remains out of scope.
- `npm run audit:source`: PASS, 69 source files reachable, no unresolved local imports or unreachable Vue/JS/CSS modules.
- `npm run test:spring:sql`: PASS, 23 tests including 13 real SQL cases; regression coverage added for nullable legacy active state and oversized owner IDs. Temporary database removed.
- `backend\mvnw.cmd package -q`: PASS (10 unit tests, SQL cases deliberately skipped without the private test URL).
- `npm test`: PASS, 53/53 after the last homepage fixes. `npm --prefix backend/legacy-express test`: PASS, 29/29. `npm run test:spring:pos`: PASS, 14/14. Vue production build repeated successfully.
- Live startup order verified: Express/SQL healthy, Spring/SQL healthy, then Vue starts. Browser smoke checks: homepage, 11-product listing and product detail/variants render without captured console errors. Anonymous accounts/POS requests return 401.
- Read-only local timing, 20 warm sequential samples per endpoint: health median/P95 5/9 ms; products 21/29 ms; v2 products 13/20 ms. Small local dataset only, not a concurrency/production performance benchmark.
- All 34 relocated document/diagram/QA artifacts were checked against their original Git blob hashes; content preserved exactly (technology README intentionally updated for the new location).
- Runtime media is not disposable: `img/hero-walk-alternate.mp4` is about 36 MiB and contributes heavily to the roughly 52 MiB frontend build. It is actively selected by the homepage, so it was preserved; video compression is a separate optimization.

## Repository layout consolidation (2026-10-07)

- Moved Vue source, media, tests, Vite configuration and dependency lockfile into `frontend/`. Root `package.json` now delegates commands; `npm run setup` installs both Node dependency trees from their lockfiles.
- Spring is now the primary `backend/` project. The required Express implementation is explicitly isolated under `backend/legacy-express/`, not deleted or described as a backup. Shared secrets stay at ignored `backend/.env`.
- Moved diagrams into `docs/diagrams/`, Maven bootstrap cache into ignored `tools/.cache/`, and local working artifacts into ignored `tools/.work/`. Updated scripts, SQL fixture paths, documentation links and VS Code exclusions.
- `npm run dev` now starts Express transition on loopback 5001, Spring on 5000, then Vue on 3000 after both SQL health checks pass. `dev:spring` remains an alias. Layout changes did not port any additional API: still **52 native / 24 transitional**.
- Removed unused `concurrently` and its 24 dependency packages. Applied compatible npm audit fixes without `--force`; frontend audit now reports zero known vulnerabilities. Legacy audit still reports **1 high + 3 moderate** entries: Nodemailer and the `mssql -> tedious -> sprintf-js` chain. npm suggests a major Nodemailer upgrade and an unacceptable mssql downgrade to 4.2.0; neither was applied automatically. These need separate compatibility/security work before production.
- Revalidated after relocation: frontend **53/53**, Express **29/29**, Spring **23/23** including **13 SQL Server integration tests with no skips**, full-schema Spring/Express POS audit **14/14**. SQL/POS fixtures used isolated databases and completed cleanup. POS suite, Node tests and frontend build were repeated after dependency patches.
- Maven executable JAR and Vue production build both passed. JavaScript syntax scan passed for 63 files; frontend import graph has 69 reachable files and no missing local imports. Regenerated API inventory has 76 valid source locations.
- Live smoke on the new default command: Vue HTML/module and native health/products/v2-products/categories/shipping return 200; health confirms SQL connected; unauthenticated accounts/POS return 401. This is local functional verification, not a production load test or proof of complete native Spring migration.
- Outstanding: 24 API ports, Express-owned scheduler/schema initialization/order email, dependency warnings above, SMTP delivery and real payment reconciliation. Do not claim all business logic is proven correct or production-ready from these tests alone.

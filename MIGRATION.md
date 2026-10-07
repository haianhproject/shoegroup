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
The checked-in `backend-spring/API-INVENTORY.json` lists all 76 method/path/source/status entries. Regenerate it with `node backend-spring/scripts/inventory.cjs --write` whenever a group is ported.

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

`mvnw.cmd` bootstraps Maven 3.9.11 into ignored `.tools/` and verifies its SHA-512 download checksum. Set `JAVA_HOME` to a JDK 17+ if auto-detection does not find one.

`dev:spring` checks ports before launching Vue, Spring and the transition API; stopping it stops those child process trees. The existing `npm run dev` remains available for the original stack.

Before `test:spring:pos`, build the executable jar with `backend-spring\mvnw.cmd package`. This audit uses an isolated full-schema database and ports 5194/5195. It compares native read responses with Express and exercises native POS reservations through legacy checkout/cancellation, including durable replay and conflicting checkout payloads.

SQL Server named instances: existing `DB_INSTANCE` is supported when `DB_PORT` is absent. `SPRING_DB_URL` can override the generated JDBC URL. Credentials still come from `DB_USER`/`DB_PASS`; keep secrets out of command arguments and Git. Dotenv parsing supports quoted values and comments, with process environment taking precedence.

## Verification log

- `npm run test:spring:sql`: PASS, 22 tests (12 real SQL integration tests and 10 unit/bridge/shipping tests), isolated temporary database removed afterward.
- SQL coverage includes plaintext password upgrade, locked accounts, role reload, IDOR, one-use reset tokens, atomic POS stock reservations, concurrent last-unit reservations, rollback, online cart non-reservation, address ownership/defaults, password-preserving account patches and concurrent last-admin protection.
- Shipping unit tests cover every fee/ETA boundary, province precedence, accents/aliases, unknown locations and database fallback.
- `backend-spring\mvnw.cmd package -q`: PASS, executable jar created, 10 unit tests passed (12 database tests intentionally skipped without the private SQL test URL).
- `npm test`: PASS, 51/51 frontend contract/regression tests.
- `npm --prefix backend test`: PASS, 29/29 existing backend regression tests.
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

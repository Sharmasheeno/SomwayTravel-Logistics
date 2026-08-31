# Macruf V2 Phase 0 Audit

Date: 2026-08-30

Scope: read-only architectural audit of the existing Macruf Travel and Cargo Agency source. Normal repository change made in this phase: this document only.

## 1. Executive Summary

The application is a lightweight agency operations system with a public website/tracking page, owner/staff login, and a protected workspace for tickets, cargo, visas, expenses, clients, receipts, reports, suppliers, daily close, settings, team management, and activity log.

The live production-oriented data path appears to be Express 5 + MongoDB/Mongoose. A Drizzle/SQLite/D1 schema also exists for a previous or platform scaffolded state model, but the README and current Express API indicate MongoDB/Mongoose is the application data source. Drizzle/D1 live usage is NOT VERIFIED.

Highest-risk findings:

- P0: Owner writes replace whole MongoDB collections with client-provided snapshots via `PUT /api/data`, so a stale/malicious owner client or backup import can remove financial records.
- P0: Core financial records are hard deleted from frontend state and then persisted through destructive collection/slice replacement; there is no void/cancel/archive model.
- P0: Public tracking references are short, timestamp-derived, enumerable-looking values and the public endpoint has no rate limiting.
- P1: Branch is hardcoded as a two-value string union/enum in frontend types, Mongoose schemas, forms, filters, rates, balances, and reference generation.
- P1: Role and branch are coupled in role names: `officer_nairobi` and `officer_mogadishu`.
- P1: Payments are booleans/amount fields embedded in each module, not a normalized payment ledger. Partial customer payments are not supported for tickets, visas, or cargo.
- P1: Cargo routing exists only as two-office origin/destination with destination computed as "the other office"; multi-branch routing will break.
- P1: There is no provider-independent notification event architecture. Current notifications are manual Resend email status sends only.

## 2. Current Technology Stack

Frontend:

- Framework/runtime: Next `16.2.6`, React `19.2.6`, React DOM `19.2.6`, TypeScript `5.9.3`.
- Router: Next app directory routes: `/`, `/admin`, `/portal/[token]`; `app/admin/page.tsx` and `app/portal/[token]/page.tsx` re-export `app/page.tsx`.
- Build/dev: Vite `8.0.13`, Vinext `0.0.50`, Cloudflare Vite plugin `1.37.1`, React Server Components plugin `0.5.26`.
- State management: local React `useState`, `useRef`, `useEffect`; no external state library.
- Styling: Tailwind CSS `4.2.1` import plus custom CSS in `app/globals.css`.
- Forms: handwritten React forms.
- Validation: browser attributes plus local submit checks; no validation library found.
- Icons: custom inline `Icon` component in `app/page.tsx`; no icon package found.
- Charts: custom CSS bar chart; no chart library found.

Backend:

- Framework: Express `5.2.1`, Node >= `22.13.0`.
- API architecture: REST-style Express routers under `/api/auth`, `/api/admin`, `/api/data`, `/api/notifications`, `/api/public`.
- Authentication: session cookie `macruf_session`; random opaque token hashed with SHA-256 in MongoDB `sessions`.
- Authorization: route middleware plus role checks in `server/lib/agencyData.js`, `server/routes/admin.js`, and `server/routes/notifications.js`.

Database:

- Live app engine discovered: MongoDB through Mongoose `9.9.4`.
- ORM/query layer: Mongoose models in `server/models`.
- Migration mechanism: none found for MongoDB.
- Seed mechanism: `scripts/seed-default-users.js`.
- Additional DB artifacts: Drizzle ORM `0.45.2`, Drizzle Kit `0.31.10`, SQLite/D1 schema in `db/schema.ts` and `drizzle/0000_sturdy_network.sql`. Live usage NOT VERIFIED.

Other important packages: `bcryptjs`, `cors`, `dotenv`, `jsonwebtoken` (installed but no active JWT usage found), `wrangler`.

## 3. Repository Architecture

Important source tree:

```text
app/
  layout.tsx              Next root layout and metadata
  page.tsx                Public website, auth UI, and entire protected workspace UI
  admin/page.tsx          Re-export of app/page.tsx
  portal/[token]/page.tsx Re-export of app/page.tsx
  globals.css             All public/private UI styling and responsive CSS
server/
  index.js                Express app entry point
  config/db.js            Mongoose connection
  middleware/auth.js      Session lookup and auth/owner guards
  routes/auth.js          Setup, login, logout, current user, staff link lookup
  routes/admin.js         Owner-only staff/account management
  routes/data.js          Snapshot read/write API
  routes/public.js        Public cargo/visa tracking
  routes/notifications.js Manual status email via Resend
  lib/agencyData.js       Data loading, role scoping, merge/write rules
  models/*.js             Mongoose schemas
db/schema.ts              Drizzle SQLite/D1 schema, live usage NOT VERIFIED
drizzle/*.sql             Drizzle migration
scripts/                  Build/env helpers and default-user seed
tests/rendered-html.test.mjs Rendered HTML metadata test
public/                   Logo, favicon, hero and OG images
worker/index.ts           Cloudflare worker entry
vite.config.ts            Vinext/Vite/Cloudflare config
```

## 4. Current Database Model

Mongoose collections:

- `users`: Mongo `_id`; unique `email`; fields `name`, `email`, bcrypt `password`, `role`, `isOwner`, `active`, unique `loginToken`; timestamps enabled. No branch field except role-derived branch.
- `sessions`: `tokenHash` unique, `userId` ObjectId ref to User, `expiresAt` TTL index via `expires: 0`.
- `tickets`: unique string `id`; `ref`; `office` enum Nairobi/Mogadishu; type Sale/Refund; passenger/phone/route/PNR/travel dates; `currency`, `amount`, `cost`, `paymentMethod`, boolean `paid`, `paymentDate`, `servedBy`, `createdBy`, `updatedAt`.
- `cargo`: unique string `id`; `tracking`; `origin`, `destination`, `paidByOffice` enum Nairobi/Mogadishu; sender/receiver fields; `weight`, `currency`, `rate`, `cost`, `payType`, `paymentMethod`, boolean `paid`, `paymentDate`, `status`, `dateDelivered`, `createdBy`, `updatedBy`, `updatedAt`.
- `visas`: unique string `id`; `ref`; `office`; applicant phone/email; destination/visaType; `currency`, `amount`, `cost`, `paymentMethod`, boolean `paid`, `paymentDate`, `status`, `servedBy`, `createdBy`, `updatedAt`.
- `expenses`: unique string `id`; `date`, `office`, category/description; `currency`, `amount`, `paymentMethod`, `inProfitLoss`, boolean `paid`, `paidBy`, `createdBy`.
- `suppliers`: unique string `id`; supplier bill fields `date`, `supplier`, `description`, `currency`, `billed`, `paid`, `dueDate`, `notes`. No branch, no supplier master table.
- `clients`: unique string `id`; `name`, `phone`, indexed `normalizedPhone`, email, `homeOffice`, type, notes. `normalizedPhone` is indexed but not unique.
- `dailycloses`: unique string `id`; `date`, `office`, `paymentMethod`, `currency`, `actuallyCounted`, `countedBy`, `checkedBy`, `reviewed`, `reviewedBy`.
- `rates`: unique string `id`; `origin`, `destination`, `currency`, `rate`.
- `startingbalances`: unique string `id`; `office`, `method`, `currency`, `amount`.
- `activities`: unique string `id`; indexed `at`; actor and detail fields only.
- `agencysettings`: singleton `key`, `agencyName`.

No foreign keys exist between operational records and users/clients/branches because MongoDB documents store string references or free-text values. No soft delete/archive fields were found.

Drizzle/D1 schema:

- `users`, `sessions`, and `agency_state` JSON blob table exist in `db/schema.ts`.
- This does not match the current Express/Mongoose per-entity model. Live usage NOT VERIFIED.

## 5. Current Authentication/Authorization Model

Sign-in:

- First owner setup: `POST /api/auth/setup-owner` creates fixed owner email `abdikadirhassan2015@gmail.com`.
- Normal login: `POST /api/auth/login` by email or `loginToken` from `/portal/[token]`.
- Passwords are hashed with bcryptjs salt rounds from `bcrypt.genSalt(10)`.
- Sessions are random tokens from `crypto.randomBytes`, stored as SHA-256 hashes in MongoDB, and sent as `HttpOnly; Secure; SameSite=Lax` cookies.

Authorization:

- `requireUser` protects `/api/data` and `/api/notifications/status`.
- `requireOwner` protects `/api/admin/*`.
- Frontend hides finance/owner pages, but backend also scopes `/api/data`.
- Consultant is read-only in `mergeWrite`.
- Owner can read/write all data.
- Officers are scoped by `officeForRole(role)` for tickets, visas, expenses, closes; cargo is shared.

Roles:

- `owner`
- `consultant`
- `officer_nairobi`
- `officer_mogadishu`

Role names are directly tied to branch in `server/models/User.js`, `server/lib/agencyData.js`, `server/routes/notifications.js`, and `app/page.tsx`.

## 6. Current Branch Implementation

Branch is not a first-class entity. Branch is represented by string values `"Nairobi"` and `"Mogadishu"` in Mongoose enum fields, frontend TypeScript unions, form options, report filters, settings, and daily close logic.

There is no `branches` collection/table, no branch id, no active/inactive branch lifecycle, and no assignment of users to branches separate from role. Adding Hargeisa currently requires source code changes.

## 7. Current Business Workflows

All protected workflows follow the same broad path:

UI form in `app/page.tsx` -> local `save()` updates full `AgencyData` state and appends activity -> `PUT /api/data` sends a full data snapshot -> `server/routes/data.js` -> `mergeWrite()` in `server/lib/agencyData.js` -> Mongoose collection replace/merge.

Ticket creation:

- `TicketForm` validates required passenger, phone, route, amount in UI.
- Generates `TKT-N-#####` or `TKT-M-#####` from current timestamp.
- Saves embedded payment fields and optional cost.
- `syncClients()` creates/updates a client by normalized phone in frontend state.
- Receipts and reports read the ticket array; activity entry is appended by `save()`.

Visa creation:

- `VisaForm` validates applicant, phone, destination, amount via required fields.
- Generates `VIS-N-#####` or `VIS-M-#####`.
- Saves embedded payment/status fields.
- `syncClients()` links by phone; public/internal tracking use `ref`.

Cargo creation:

- `CargoForm` validates sender, sender phone, receiver, contents, weight, rate.
- Origin defaults from officer role or Nairobi.
- Destination is computed as the opposite office.
- Tracking is `NBO-#####` or `MOG-#####`.
- Pricing is `weight * rate`; default rate is looked up by origin and currency.
- Public/internal tracking use the same `status` field.

Expense creation:

- `ExpenseForm` writes date, office, category, amount, payment method, `paid`, `inProfitLoss`.
- Expenses affect daily close only when `paid` and matching office/date/method/currency.
- P&L flag is displayed but not used in the discovered report formulas.

Supplier bill creation:

- `SupplierForm` writes one payable record with billed and paid amounts.
- Status is derived in UI as Paid/Partial/Unpaid.
- Only owner can write supplier bills.

Daily close:

- `CloseForm` calculates opening, tickets, cargo, visas, paid expenses, should-have.
- Saves counted amount and review flags.
- Owners and consultants can mark reviewed; owners/officers can create/edit.

Receipt generation:

- `Receipt` searches local tickets by `ref`, visas by `ref`, cargo by `tracking`.
- Generates printable/downloadable PDF from current record fields.

Public tracking:

- Public site calls `GET /api/public/track?kind=cargo|visa&reference=...`.
- Server scans all matching collection records and returns a limited status payload.

## 8. Current Transaction Relationships

There is no normalized transaction/payment table. Tickets, visas, cargo, expenses, suppliers, and daily close each store their own financial fields. Clients are synchronized by phone rather than referenced by id. Receipts are generated from current transaction rows and are not persisted.

## 9. Cargo Workflow Findings

- P1: Cargo has `origin` and `destination`, but destination is always computed as the opposite of origin in `CargoForm`.
- P1: Cargo routes are two-office only at schema and UI levels.
- P1: Tracking prefixes are hardcoded to `NBO`/`MOG`.
- P1: Any non-consultant can edit cargo; destination staff visibility is achieved by making cargo shared rather than by route/assignment permissions.
- P1: Arrival and delivery are represented by a single manual `status` enum plus `dateDelivered`; no dispatch/arrival timestamps or actor fields.
- P2: `Claim` exists as a cargo status but is not part of the public progress sequence.
- P2: `paidByOffice` can differ from origin/destination but is constrained to the two hardcoded offices.

## 10. Client Relationship Findings

- P1: Clients are auto-created/updated by frontend `syncClients()` using normalized phone as a map key; server `mergeClients()` also upserts by `normalizedPhone`.
- P1: Phone normalization strips non-digits except `+`, but no E.164 validation or country defaulting exists.
- P1: `normalizedPhone` is indexed but not unique; duplicate clients can still exist at database level.
- P2: Client stats use exact raw phone equality, not normalized phone, so formatted variants can miss history.
- P2: Cargo receiver can be part of stats, but auto-client creation only uses cargo sender.
- P2: Client `homeOffice` is overwritten by latest service record in `syncClients()`, so multi-branch activity is collapsed into one home office.

## 11. Payment Findings

- P1: Tickets, visas, and cargo support only boolean paid/unpaid, not partial payments.
- P1: Supplier partial payments exist as `billed` and `paid`, but not as payment records.
- P1: Revenue and receipts are based on full `amount` or `weight * rate`, regardless of paid status in reports.
- P1: Daily close includes only records with `paid === true` and matching `paymentDate`, office/payment method/currency.
- P1: Money is duplicated across module records; there is no shared payment ledger, no refund ledger, no audit trail of payment events.
- P2: Nairobi forms default payment methods to Cash/M-Pesa, Mogadishu to Bank/EVC Plus in some places, but expenses allow all methods regardless of office.

## 12. Daily Close Findings

Formula from `closeMetrics()`:

- Opening = prior close `actuallyCounted` for same office/method/currency before date, else matching starting balance.
- Tickets = sum paid tickets on payment date, office, method, currency; refunds subtract amount.
- Cargo = sum paid cargo on payment date, `paidByOffice`, method, currency; amount is `weight * rate`.
- Visas = sum paid visas on payment date, office, method, currency; refunds subtract amount.
- Expenses = sum paid expenses on date, office, method, currency.
- Money in = tickets + cargo + visas.
- Should have = opening + tickets + cargo + visas - expenses.
- Difference = actually counted - should have.

Risks:

- P1: No uniqueness rule prevents duplicate close records for same date/office/method/currency.
- P1: Reviewed closes remain editable by canCreate users.
- P1: Later edits to underlying paid transactions can alter historical close calculations.
- P2: Non-cash payment methods are separated by `paymentMethod`; no discovered accidental inclusion across methods in the formula.

## 13. Supplier Findings

- P1: Supplier bills are not linked to expenses, tickets, visas, or cargo costs.
- P1: Supplier exposure in main reports counts only USD suppliers.
- P2: Supplier status is UI-derived only: Paid, Partial, Unpaid.
- P2: No branch field, supplier master, invoice number uniqueness, attachments, payment history, or due-date alerting found.

## 14. Reporting Formula Findings

Overview revenue this month:

- Tickets: saleDate current month, amount; refunds subtract.
- Visas: appDate current month, amount; refunds subtract.
- Cargo: dateIn current month, `weight * rate`.

Reports page:

- Revenue KES/USD = tickets + cargo + visas in date range by currency.
- Tickets revenue = `amount`, refund negative.
- Visa revenue = `amount`, refund negative.
- Cargo revenue = `weight * rate`.
- Gross margin = revenue minus `cost`; ticket/visa refunds invert margin.
- Outstanding records = count unpaid tickets + unpaid visas + unpaid cargo.
- Supplier exposure = USD suppliers only, `max(0, billed - paid)`.
- KES revenue trend = last six months KES sum of ticket amount + visa amount + cargo value; refund sign is NOT applied in this trend.

Naming risks:

- P1: Reports label "Net revenue" but formula is gross sales/collections before expenses.
- P1: P&L expense inclusion is not used in the discovered financial reports.
- P2: Supplier exposure excludes KES in report KPI.

## 15. Activity/Audit Findings

- Activity is written by frontend `save()` when an action object is passed, and by owner setup in backend.
- Logs include id, timestamp, userId, userName, entity/action, detail.
- P1: Previous/new values are not recorded.
- P1: Branch is not recorded on activity entries.
- P1: Server accepts incoming activities through snapshot writes; activity log is not tamper-resistant.
- P1: Backend admin user create/update/password reset operations are not logged, except owner setup.
- P2: Activity retention is limited to 500 entries by UI and `mergeActivities()`.

## 16. Public Tracking Findings

- Endpoint: `GET /api/public/track`.
- Auth: unauthenticated by design.
- Reference matching: case-insensitive exact match against visa `ref` or cargo `tracking`.
- Returned cargo fields: kind, reference, origin, destination, status, date.
- Returned visa fields: kind, reference, destination, visaType, status, date, office.
- P0: References are timestamp-derived and short; enumeration is plausible.
- P0: No rate limiting, CAPTCHA, throttling, or failed lookup logging found.
- P1: Endpoint loads all records then filters in application code.
- P2: Visa public result includes office; customer safety is probably acceptable but should be confirmed.

## 17. Twilio/Notification Readiness Findings

Current notifications:

- Manual status email via Resend in `server/routes/notifications.js`.
- Only cargo and visa status email are supported.
- Requires `RESEND_API_KEY` and `MACRUF_FROM_EMAIL`.
- No Twilio integration found.

Readiness gaps:

- P1: No notification events table/collection.
- P1: No message history, delivery status, queued/sent/delivered/read/failed state.
- P1: No WhatsApp consent/opt-in/opt-out fields.
- P1: No E.164 phone normalization.
- P1: No provider abstraction.

Best future integration points in this repository:

- Business event hooks should be introduced server-side in or behind `mergeWrite()` after detecting created/updated/status/payment deltas.
- A provider-independent service should live under `server/services/notifications/`, for example `NotificationService.js`, `providers/TwilioWhatsAppProvider.js`, and a notification/message Mongoose model.
- Do not scatter Twilio calls in `app/page.tsx`.

## 18. UI Consistency Findings

Shared primitives already exist inside `app/page.tsx`: `PageHeader`, `Toolbar`, `Field`, `Badge`, `Empty`, `Modal`, `Confirm`, `Kpi`, `TableShell`, `Actions`, custom `Icon`.

Inconsistencies:

- P2: All primitives are embedded in one very large page file, making reuse/testing difficult.
- P2: Some delete flows use confirm modals, while expenses/clients/suppliers delete immediately from row action.
- P2: Payment method options vary by module/office.
- P2: Branch selectors are repeated rather than driven by shared branch data.
- P3: Custom icons duplicate what a maintained icon library could provide, but changing this is not urgent.

## 19. Security Findings

- P0: `server/config/db.js` logs the full MongoDB URI on successful connection; if a production URI contains credentials, secrets can be printed to logs.
- P0: Public tracking is not rate limited and references are enumerable-looking.
- P0: Snapshot write endpoint can replace collections; stale clients/backups can destroy data.
- P1: No CSRF protection found for cookie-authenticated write endpoints. SameSite=Lax helps, but explicit CSRF tokens are absent.
- P1: CORS is configured as `origin: true, credentials: true`, reflecting request origins broadly.
- P1: No backend request schema validation layer found.
- P1: Backup import accepts JSON and writes it through the same snapshot path.
- P2: Staff `loginToken` acts as a long-lived login URL identifier and is unique but not separately expiring.

Secret audit:

- `.env.example` contains placeholders/default local values only.
- `scripts/seed-default-users.js` and README contain default seed passwords. These are intended defaults but must be changed/rotated before production.
- No real Twilio credentials found.
- Do not print actual secret values if later found; rotate any committed production credentials.

## 20. Testing Findings

Existing tests:

- `tests/rendered-html.test.mjs` checks rendered HTML metadata from `dist/server/index.js`.

Validation attempted:

- `npm run lint` via PowerShell failed because `npm.ps1` is blocked by execution policy.
- `npm.cmd run lint` ran npm but failed because `bash` is not recognized.
- `npm.cmd test` ran npm but failed because the build script uses `bash scripts/build-verified.sh` and Bash is not installed/available in this shell.

Coverage gaps:

- P1: No automated tests found for auth, authorization, branch scoping, data writes, payments, daily close, public tracking, or notifications.
- P1: No API integration tests for direct URL/API access protection.
- P2: Based on existing stack, Node's built-in test runner can cover server logic/API; Playwright would be the appropriate E2E choice if browser workflow coverage is added.

## 21. Hardcoded Nairobi/Mogadishu Inventory

Search terms: `Nairobi`, `Mogadishu`, `NBO`, `MOG`, `Both offices`, `both offices`, `Nairobi Officer`, `Mogadishu Officer`.

Count: 112 literal matches across source/docs searched (`app`, `server`, `README.md`, `scripts`, `db`, `drizzle`). Important production occurrences:

| File | Occurrence Type | Classification | Third-branch impact |
|---|---|---|---|
| `app/page.tsx` Office type | `"Nairobi" | "Mogadishu"` | E database/API contract mirror | Blocks compile/runtime for new branch |
| `server/models/*.js` office enums | Mongoose enums | E database logic | Blocks persistence of new branch |
| `app/page.tsx` `roleLabel` | role names | D authorization/display | Branch remains coupled to role |
| `app/page.tsx`, `server/lib/agencyData.js`, `server/routes/notifications.js` `officeForRole` | role-to-office mapping | D authorization logic | New branch needs new role/code |
| `app/page.tsx` `Toolbar` options | office filter | A/F display/report filter | New branch invisible |
| `TicketForm`, `VisaForm` refs | `TKT-N/M`, `VIS-N/M` | G reference-number logic | New branch has no prefix |
| `CargoForm` destination | opposite office calculation | H cargo-routing logic | Multi-branch route impossible |
| `CargoForm` tracking | `NBO/MOG-#####` | G reference-number logic | New branch has no prefix |
| `Settings` rates | origin select and opposite destination | C/H business/cargo routing | Cannot set arbitrary branch pair rates |
| `Settings` balances | office-specific defaults | C business logic | New branch no defaults/options |
| `closeMetrics` and forms | office/method/currency matching | F reporting/close logic | Works only if branch values exist |
| `README.md` seed account text | setup docs | A display/docs | Docs stale if branches change |

Occurrences that would break a third branch: all schema enums, TypeScript `Office`, form options, role mapping, cargo destination/reference logic, settings rate/balance UI, and any office-filter UI. Display-only text would not break behavior but would become stale.

## 22. Technical Debt / Risks

- P0: Destructive snapshot persistence for financial collections.
- P0: No immutable financial transaction/payment audit.
- P0: Public tracking enumeration/rate-limit risk.
- P1: Branch not modeled as data.
- P1: Branch and role coupled.
- P1: One-page frontend contains all workflows and domain logic.
- P1: No backend validation layer for business invariants.
- P1: No MongoDB migrations/versioned schema.
- P1: No Twilio-ready notification model/service.
- P2: Windows local validation depends on Bash scripts.

## 23. Recommended Safe Migration Sequence

1. Add tests around current behavior before changing behavior: auth, role scoping, ticket/visa/cargo create/update/delete, daily close formulas, public tracking payloads.
2. Introduce backend request validation and safer write APIs while preserving existing snapshot endpoint temporarily.
3. Add first-class `branches` model and seed current Nairobi/Mogadishu branches without changing UI behavior.
4. Add `branchId` alongside existing office/origin/destination strings; backfill and dual-read/dual-write.
5. Separate user role from branch assignment while preserving current role labels through compatibility mapping.
6. Replace cargo "opposite office" routing with explicit origin/destination branch selection and route/rate lookup.
7. Introduce payment ledger/events while maintaining existing paid booleans as derived/compatibility fields.
8. Make deletes into void/cancel/archive flows for financial records.
9. Add notification event and message history models plus provider-independent notification service.
10. Add Twilio WhatsApp provider and consent/opt-out handling after event model is stable.
11. Gradually extract shared UI/domain primitives from `app/page.tsx` without redesigning the interface.

## 24. Files Likely Affected By Phase 1

- `server/models/User.js`
- `server/models/Ticket.js`
- `server/models/Cargo.js`
- `server/models/Visa.js`
- `server/models/Expense.js`
- `server/models/Client.js`
- `server/models/DailyClose.js`
- `server/models/Rate.js`
- `server/models/StartingBalance.js`
- `server/lib/agencyData.js`
- `server/routes/data.js`
- `server/routes/admin.js`
- `server/routes/public.js`
- `server/routes/notifications.js`
- `app/page.tsx`
- `app/globals.css`
- `scripts/seed-default-users.js`
- future tests under `tests/`

## Mandatory Current To Target Table

| Area | Current implementation | Problem | Target direction | Priority |
|---|---|---|---|---|
| Branches | Hardcoded strings/enums | Cannot add branch dynamically | Branch collection + IDs | P1 |
| Roles | `owner`, `consultant`, `officer_nairobi`, `officer_mogadishu` | Role includes branch | Role plus assigned branch | P1 |
| Users | Email/password/session, no branch field | Branch inferred from role | User role + branch assignment(s) | P1 |
| Cargo | Shared collection, two-office route | Destination is opposite office | Explicit route between branch IDs | P1 |
| Visas | Office-scoped record | Hardcoded office enum | Branch ID with compatibility field | P1 |
| Tickets | Office-scoped record | Hardcoded office enum | Branch ID with compatibility field | P1 |
| Clients | Phone-synced records | Duplicates and weak normalization | Unique normalized phone + relationships | P1 |
| Payments | Embedded paid booleans | No partial/customer ledger | Payment records/events | P1 |
| Daily Close | Computed from embedded paid records | Duplicate/editable closes | Locked close per branch/method/currency/date | P1 |
| Expenses | Embedded office/payment fields | Hard deletes and inconsistent method choices | Branch-linked expense records with voiding | P1 |
| Suppliers | Standalone bill rows | No links/payment history | Supplier/payable model with payments | P2 |
| Reports | Frontend formulas | Naming/formula inconsistencies | Tested report service/formulas | P1 |
| Tracking | Public lookup by short ref | Enumeration/rate-limit risk | Safer references + throttling | P0 |
| Notifications | Manual Resend email | No event/history/provider abstraction | Notification events + provider layer | P1 |
| Activity Log | Client-supplied detail log | Not tamper-resistant, no diffs | Server-written audit events | P1 |
| Settings | Agency name/rates/balances | Rates/balances hardcoded to offices | Settings keyed by branch/route IDs | P1 |
| UI system | Local components in `app/page.tsx` | Hard to reuse/test | Extract shared primitives gradually | P2 |


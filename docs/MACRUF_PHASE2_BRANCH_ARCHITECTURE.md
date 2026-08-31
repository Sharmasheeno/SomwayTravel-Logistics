# Macruf Phase 2 Branch Architecture

Date: 2026-08-30

## Old Role Architecture

Legacy roles coupled branch and permission:

- `owner`
- `consultant`
- `officer_nairobi`
- `officer_mogadishu`

The officer role name determined the office. Adding a new branch required source-code changes.

## New Role Architecture

Normal roles are now:

- `owner`: agency-wide administration and branch access.
- `operator`: one assigned operational branch through `assignedBranchId`.

Legacy role values remain in the schema only for compatibility and migration.

## Branch Schema

`branches` is a Mongo/Mongoose collection with:

- `name`
- `code`
- `city`
- `country`
- `defaultCurrency`
- optional `phone`, `email`, `address`
- `isActive`
- timestamps

Branch code is uppercase alphanumeric, 2-6 characters.

Seeded core branches:

- Nairobi Office, `NBO`, Nairobi, Kenya, KES
- Mogadishu Office, `MOG`, Mogadishu, Somalia, USD

## User Schema Changes

`users.role` now supports normal `owner | operator` plus legacy compatibility values.

`users.assignedBranchId` is required operationally for operators and unused for owners.

## Migration / Backfill Behavior

`runPhase2Migration()` runs at server startup and is idempotent:

- creates or finds `NBO` and `MOG`
- maps `officer_nairobi` to `operator + Nairobi`
- maps `officer_mogadishu` to `operator + Mogadishu`
- backfills branch references for tickets, visas, expenses, clients, daily closes, rates, starting balances, and cargo
- reports scanned, changed, skipped, and unresolved counts

Unresolved historical office strings are reported and not guessed.

## Consultant Compatibility Decision

Consultant was present as a legacy read-only role in code and UI. No seeded/default consultant user exists.

Phase 2 keeps consultant as legacy read-only compatibility and removes it from normal new-user creation. It is not promoted to a permanent third normal role.

## Authorization Rules

Owner:

- list active and inactive branches
- create/edit/deactivate branches
- create owners/operators
- assign operators to active branches
- operate across branches

Operator:

- sees only the assigned branch in `/api/branches`
- branch-owned entity writes are forced to or validated against the assigned branch
- cannot mutate branches
- cannot create/elevate users
- cannot use payload manipulation to write another branch

## Branch Context Behavior

Operators use their assigned branch as working context. Owners can work across active branches. Branch selectors are driven by branch records where updated in Phase 2.

## Entities Backfilled

- tickets: `branchId`
- visas: `branchId`
- expenses: `branchId`
- clients: `homeBranchId`
- daily closes: `branchId`
- rates: `originBranchId`, `destinationBranchId`
- starting balances: `branchId`
- cargo: `originBranchId`, `destinationBranchId`, `paidByBranchId`

Legacy display text fields are retained.

## Cargo Origin / Destination

Cargo now supports explicit `originBranchId` and `destinationBranchId`.

New cargo validation requires different active branches. The old opposite-office server assumption is not used for entity writes.

## Rates And Starting Balances

Rates now support branch-route IDs. Starting balances now support `branchId`.

The older text fields remain for display and historical compatibility.

## Reference Generation

New ticket and cargo references derive branch prefixes from `Branch.code` where updated in the UI. Existing references remain unchanged.

## Remaining Hardcoded Branch Literals

Before Phase 2 audit count: 112.

After Phase 2 implementation count: 73 across app/server/scripts/tests/README/db/drizzle.

Intentional remaining occurrences are:

- seeded branch compatibility: Nairobi/Mogadishu/NBO/MOG
- legacy migration compatibility for `officer_nairobi` and `officer_mogadishu`
- test and smoke fixtures
- historical display examples and login/public copy
- deferred single-file UI areas that still show legacy labels while the server enforces branch IDs

## API Endpoints

Branch API:

- `GET /api/branches`
- `POST /api/branches`
- `PATCH /api/branches/:id`
- `PATCH /api/branches/:id/deactivate`

Entity API preserved from Phase 1B:

- `POST /api/entities/:collection`
- `PATCH /api/entities/:collection/:id`
- `DELETE /api/entities/:collection/:id`

## Tests

Added:

- `tests/branch-authorization.test.mjs`
- `scripts/phase2-smoke.mjs`

The smoke creates Hargeisa, creates a Hargeisa operator, verifies operator branch narrowing, blocks operator branch creation, forces tampered ticket branch payloads back to Hargeisa, and creates Hargeisa to Nairobi cargo.

## Third-Branch Acceptance Result

Hargeisa Office (`HGA`) was created through the owner API without source-code changes.

Test Hargeisa Operator was created and logged in.

Operator saw only Hargeisa through `/api/branches`.

Hargeisa to Nairobi cargo creation passed.

Test-only records/users/branch were cleaned up by the smoke script.

## Known Deferred Work

- Full UI redesign remains Phase 8.
- Cargo lifecycle workflow remains Phase 4.
- Payment ledger remains Phase 5.
- Twilio WhatsApp and Somali notifications remain Phase 6.
- Some legacy display text remains for compatibility and future UI cleanup.

# Macruf Phase 1 Data Safety Foundation

Date: 2026-08-30

Phase 1 adds guardrails around the existing snapshot-based data API without changing the current frontend workflows or business formulas.

## Implemented

- Added pre-write data snapshots in MongoDB through `server/models/DataSnapshot.js`.
- Added snapshot retention capped at the latest 50 snapshots.
- Added malformed snapshot validation so `PUT /api/data` rejects requests missing required collections instead of treating them as empty arrays.
- Added catastrophic-delete protection for populated protected collections.
- Kept ordinary create/edit/small-delete behavior compatible with the current UI.
- Blocked consultant writes before any snapshot is created.
- Redacted MongoDB credentials in successful connection logs.
- Added focused Node tests for the data safety rules.

## Protected Collections

The large-drop guard covers:

- `tickets`
- `cargo`
- `visas`
- `expenses`
- `suppliers`
- `clients`
- `closes`

The API also requires these snapshot arrays to be present:

- all protected collections
- `rates`
- `startingBalances`
- `activities`

## Large Delete Rule

A save is rejected when a protected collection would:

- drop from 5 or more records to zero, or
- drop by at least 10 records and at least 50 percent when the current collection has 20 or more records.

The response uses HTTP `409` and includes operator-safe collection counts, not record data.

## Controlled Maintenance Override

For intentional bulk maintenance only, set:

```text
MACRUF_ALLOW_LARGE_DELETES=true
```

Use this only after taking an external backup. The server still creates a pre-write `DataSnapshot`.

## Verification

- `node --test tests/data-safety.test.mjs`: passed, 8 tests.
- `npx eslint server\lib\dataSafety.js server\routes\data.js server\models\DataSnapshot.js server\config\db.js tests\data-safety.test.mjs`: passed.
- `node --check` on changed server files: passed.

Resolved by Phase 1B:

- `npm.cmd test` now runs through cross-platform npm scripts.
- `tests/rendered-html.test.mjs` now checks real Macruf page metadata instead of obsolete `codex-preview` scaffold metadata.

## Entity-Level Persistence Completion

Phase 1B replaces routine whole-snapshot writes with entity-scoped writes for normal operational changes.

Old write path:

```text
UI action -> app/page.tsx save() -> PUT /api/data -> mergeWrite() -> collection/slice replacement
```

New routine write path:

```text
UI action -> app/page.tsx save() -> POST/PATCH/DELETE /api/entities/:collection/:id? -> writeEntity()/deleteEntity() -> one Mongoose model + deliberate side effects
```

Entity routes:

- `POST /api/entities/:collection`
- `PATCH /api/entities/:collection/:id`
- `DELETE /api/entities/:collection/:id`

Migrated entity collections:

- `tickets`
- `cargo`
- `visas`
- `expenses`
- `clients`
- `suppliers`
- `closes`
- `rates`
- `startingBalances`

Deliberate side effects:

- Ticket, visa, and cargo writes upsert a related client by normalized phone on the server.
- Entity writes can create a server-side activity entry from the submitted action metadata.
- Non-owner writes preserve existing `cost` on tickets, cargo, and visas.

Remaining `/api/data` purpose:

- `GET /api/data` remains the read endpoint for the current workspace snapshot.
- `PUT /api/data` remains only as the legacy controlled bulk snapshot path for backup/import/settings fallback. It keeps Phase 1 snapshot validation, pre-write snapshots, and catastrophic-delete protection.
- Normal single-record ticket, cargo, visa, expense, client, supplier, daily close, rate, and starting balance changes should not use `PUT /api/data`.

Remaining frontend snapshot callers:

- Initial workspace load calls `GET /api/data`.
- Session restore after login calls `GET /api/data`.
- `save()` falls back to `PUT /api/data` only when a change is not a single supported entity collection, such as full backup import or agency-name-only settings.

Concurrency regression:

- Tests reproduce stale Ticket edit after new Cargo creation and stale Cargo edit after new Ticket creation.
- Expected result: the unrelated newer record remains present.
- Result: PASS.

Document identity regression:

- Tests verify representative Ticket and Cargo updates preserve `_id`, `createdAt`, and business reference while changing intended mutable fields.
- Result: PASS.

Windows test command:

```powershell
npm.cmd test
```

The `test`, `build`, and `lint` npm scripts are now cross-platform and do not require Bash:

- `build`: `vite build`
- `test`: `npm run build && node --test tests/*.test.mjs`
- `lint`: `eslint . --ignore-pattern dist --ignore-pattern .next --ignore-pattern node_modules`

Codex-preview decision:

- The old `tests/rendered-html.test.mjs` assertion for `<meta name="codex-preview" content="development">` was obsolete development scaffold residue.
- No application code or product workflow requires that meta tag.
- The test now validates real Macruf public metadata instead of adding meaningless production markup.

Additional Phase 1B verification:

- `npm.cmd test`: passed, 21 tests.
- `npm.cmd run lint`: passed with 0 errors and 7 pre-existing warnings.
- `npx tsc --noEmit`: passed.
- `npm.cmd run build`: passed.
- `node --check` on changed server JavaScript files: passed.

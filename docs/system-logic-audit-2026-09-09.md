# SomWay Travel & Logistics System Logic Audit

Date: 2026-09-09
Branch: arena/01a07273-somwaytravel-logistics

## Scope

This audit reviewed the application logic for authentication, role access, branch scoping, ticket/visa/cargo creation, client relationships, customer payments, supplier payables, deletion, cancellation, daily summaries, financial reports, receipts, operator access routes, and backup/export safety.

The audit was code-level and test-level. It did not connect to the live Contabo database, so production data quality still depends on the current records stored on the server.

## Role access model

### Owner

The Owner can:

- Access the owner workspace at `/admin`.
- View all branches and all financial data.
- Create, edit, deactivate, and view branches.
- Create and manage staff accounts.
- Reset operator passwords and copy the current operator URL.
- Configure agency settings, public base URL, operator login URL, business hours, branch payment methods, rates, and starting balances.
- Delete ticket, visa, cargo, client, expense, close, rate, payment-method, and branch-payment-method records where allowed by the backend.
- Reopen or review daily close records.
- Void customer payments and supplier payments.
- Export, validate, and restore backups.

The Owner cannot:

- Delete their own user account.
- Delete the last remaining owner.
- Directly delete or edit service-generated payables; the payable must be paid, voided through payment logic, or removed by deleting/cancelling its parent service.

### Operator

An Operator can:

- Access the operator workspace only through the active owner-configured operator route.
- View only their assigned branch, plus cargo records that involve their assigned branch as origin, destination, or payment branch.
- Create and update tickets, visas, expenses, daily closes, clients, and cargo within their branch scope.
- Receive customer payments for records in their branch scope.
- Move cargo through allowed branch workflow steps.
- View their current active operator login URL in Settings.

An Operator cannot:

- Access `/admin`.
- Use an old operator URL after the Owner changes/regenerates the route.
- Choose another branch for tickets, visas, expenses, closes, clients, or cargo origin; the server now forces their assigned branch ID and display name.
- Delete service records.
- Manage staff, branches, payment methods, rates, starting balances, backups, or global settings.
- Create or pay supplier payables.
- Void customer or supplier payments.
- Pay cancelled services.

### Consultant

A Consultant can:

- Sign in only through the active operator route.
- Read the visible workspace data.
- View financial reports.

A Consultant cannot:

- Write agency entity data.
- Delete records.
- Create payments.
- Manage settings, staff, branches, backups, payment methods, rates, or starting balances.

## Service and finance connections

### Tickets

Ticket creation creates or links a client by normalized name and phone number. The ticket keeps its passenger and phone snapshot, while the client directory uses the linked client ID for activity counts.

A sale ticket contributes:

- Revenue/customer charge to financial reports.
- Receivable balance until customer payments settle it.
- A generated supplier payable when agency cost is greater than zero.
- Daily summary revenue, collections, receivables, payables, and profit.
- Client activity counts and history.

A refund ticket contributes outbound payment logic and does not create customer debt or supplier payable.

When a ticket is cancelled:

- The ticket record remains for audit/status history.
- Customer payments are purged.
- Generated supplier payable and supplier payments are purged.
- It is excluded from financial reports, receivables, payables, daily summary, revenue, and profit.
- The backend rejects any later customer payment for that cancelled ticket.

When a ticket is deleted:

- The ticket is removed.
- Customer payments, generated payables, supplier payments, receivables, and report traces are removed.
- Stored daily summaries are recalculated.

### Visas

Visa creation follows the same client, receivable, payable, report, and deletion model as tickets. Visa workflow is submitted -> approved/refused -> delivered. Refused/delivered are terminal states. Owner corrections require a reason.

Visa cancellation is now a first-class workflow status. A submitted or approved visa can move to cancelled, and cancellation removes the related financial traces the same way ticket and cargo cancellation do.

### Cargo

Cargo creation links sender and receiver clients separately. The payer is sender or receiver depending on payment responsibility. Cargo revenue belongs to the origin branch. A customer payment can belong to the payment branch. This is intentional because cargo can be created in one branch and paid/collected through another branch.

Cargo contributes:

- Customer charge = weight * rate.
- Receivable balance until the payer pays.
- Generated supplier payable when direct cost is greater than zero.
- Daily summary revenue, collections, receivables, payables, and profit.
- Sender and receiver client activity.

Cargo workflow:

- Origin branch can dispatch cargo from received to in transit.
- Destination branch can move cargo through arrived, ready for collection, and delivered.
- Owner can act across branches.
- Cancellation requires a reason.

When cargo is cancelled:

- The cargo record remains for audit/status history.
- Customer payments, generated payable, and supplier payments are purged.
- It is excluded from reports, receivables, payables, summaries, revenue, and profit.
- The backend rejects any later customer payment for that cancelled cargo.

When cargo is deleted, the same full cascade happens and stored summaries are recalculated.

## Client identity rules

Clients are identified by normalized phone plus normalized name. This is deliberate because two different people may share the same phone number.

- Same name + equivalent Somalia/Kenya phone -> one client.
- Different name + same phone -> separate clients.
- Ticket passenger links to client.
- Visa applicant links to client.
- Cargo sender and receiver link independently.
- Operator-created clients are now forced to the operator's assigned branch ID and branch name.

Client profile edits do not rewrite historical passenger/applicant/sender/receiver snapshots on old services.

## Financial reports and daily summaries

Financial reports build from live service records, payments, expenses, generated supplier bills, and supplier payments.

Cancelled or deleted services are excluded. Orphan payment and payable records are ignored and startup cleanup removes legacy orphan records.

Daily summary rows separate:

- Revenue: service charges for the business date.
- Money received: actual customer payments received that day.
- Refunds: outbound customer payments.
- Expenses: branch expenses paid that day.
- Accounts receivable: unpaid customer balances up to that date.
- Accounts payable: unpaid supplier bills up to that date.
- Profit: revenue less direct service cost.
- Closed amount: actual money held by payment method.
- Expected closing: projected position after receivables and payables settle.

Branch currency rules are enforced by backend configuration. Mogadishu defaults to USD-only; Nairobi supports KES and USD.

## Operator URL system

The operator route is stored in agency settings and read dynamically. Owner login remains `/admin`. Operators cannot log in at `/admin`. If the Owner changes or regenerates the operator route, the old route stops validating immediately. Staff reset links use the active operator URL.

The single Operator login URL field accepts:

- A path such as `/staff`.
- A full URL such as `http://169.58.173.197:8080/staff`.
- A domain such as `staff.example.com`, which stores the domain and uses `/` as the operator login path.

System routes such as `/admin`, `/api`, `/portal`, `/_next`, and `/assets` are reserved and rejected.

## Fixes made during this rescan

- Ticket/visa cancellation now runs inside the service lock, matching cargo's race protection.
- Cancellation finance purge was split into a safe internal purge operation and a public locked operation to avoid nested lock deadlocks.
- Customer payments now re-check the parent service inside the service lock before saving money movement.
- Supplier payable payments now reject payables whose parent service is cancelled.
- Operator-created tickets, visas, expenses, closes, clients, and cargo origin now have the assigned branch ID and branch display name forced by the server.
- Branch authorization tests now prove operator client creation cannot keep a mismatched home branch.

## Verification

Commands run successfully:

- `npm test`
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`
- `npm run lint`
- `npm audit --omit=dev --audit-level=high`

Results:

- 143 tests passed.
- TypeScript passed.
- Production build passed through the test script.
- ESLint reported 0 errors and 19 warnings.
- npm audit still reports dependency advisories: 1 critical, 3 high, and 2 moderate.

## Remaining honest limitations

No code review can truthfully guarantee 100% correctness for all possible production data and user behavior. The current confidence is high for the tested backend logic, but the following remain outside this code-only audit:

- Live Contabo database records may already contain old inconsistent records created before these fixes.
- Browser-only UI paths were not manually clicked in production because previews were intentionally avoided.
- npm dependency advisories remain unresolved because the complete automatic fix requires breaking dependency upgrades.
- Lint warnings remain for unused legacy UI code and image optimization hints; they are not active logic failures.

## Recommended production check after deploy

After deploying, create one test ticket, one test cargo shipment, and one test visa record from the operator route, then confirm:

- Each client appears in Clients.
- Activity counts increase under the correct client.
- Mogadishu records show USD only.
- Cancelling removes financial report, receivable, payable, and daily summary impact.
- Deleted services leave no payment/payable/report traces.


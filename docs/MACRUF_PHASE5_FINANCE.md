# Macruf Phase 5 Finance

Date: 2026-08-31

## 1. Finance Architecture

Phase 5 adds a lightweight management finance layer. It is not double-entry accounting and does not introduce a chart of accounts. The core dimensions are branch, currency, service, payment method, and date.

## 2. Branch Currency Configuration

Branches now support `allowedCurrencies` in addition to `defaultCurrency`. Existing valid historical transaction currencies remain readable; allowed currencies control new normal transaction and payment writes.

## 3. PaymentMethod Model

`PaymentMethod` stores a small catalog: `id`, `name`, `code`, `type`, `isActive`, and timestamps. Initial catalog entries are Cash, M-Pesa, Bank, and EVC Plus.

## 4. Branch Payment Method Configuration

`BranchPaymentMethod` links a branch to a payment method with `allowedCurrencies`, `isActive`, and `countsAsPhysicalCash`.

## 5. Payment Model

`Payment` records targeted customer payments for `ticket`, `visa`, or `cargo` transactions. It stores branch, currency, payment method, date, amount, optional reference/notes, receiver, and void metadata.

## 6. Partial Payment Calculations

`amountPaid = sum(active payments)`. `balance = transaction total - amountPaid`. Status is derived as `unpaid`, `partial`, or `paid`.

## 7. Transaction Financial Formulas

Ticket and Visa total use `amount`. Cargo total uses `weight * rate`. Gross profit uses customer charge minus direct agency cost.

## 8. Expense Behavior

Expenses remain operational records but now validate branch, currency, and payment method combinations. Physical cash and electronic methods can reconcile separately.

## 9. Supplier Bill And Payment Behavior

Supplier bills keep billed amount. `SupplierPayment` records actual supplier payments. Supplier outstanding is derived from active supplier payments.

## 10. Daily Close Formula

Daily Close is scoped by Branch + Date + Currency + Payment Method. `should = opening balance + active customer collections - paid expenses`.

## 11. Daily Close Uniqueness

Daily closes are unique for Branch + Date + Currency + Payment Method.

## 12. Revenue Vs Collections

Revenue is the sale value of tickets, visas, and cargo. Collections are actual active customer payment ledger entries.

## 13. Financial Report Dimensions

Reports group by branch and currency first, with service and payment method breakdowns beneath that.

## 14. Branch/Currency Isolation

Nairobi USD and Mogadishu USD are separate operational balances. Agency USD consolidation may be calculated secondarily, but does not replace branch/currency rows.

## 15. Nairobi Configuration

Nairobi default currency remains KES. Nairobi allowed currencies are KES and USD. Initial methods are Cash KES/USD, M-Pesa KES, and Bank KES/USD.

## 16. Mogadishu Configuration

Mogadishu default currency remains USD. Mogadishu allowed currencies are USD. Initial methods are Cash USD, EVC Plus USD, and Bank USD.

## 17. Report Formulas

Branch/currency rows include revenue, direct cost, gross profit, collections, operating expenses, outstanding balances, supplier exposure, service totals, and payment method totals.

## 18. Migration Behavior

`runPhase5Migration()` seeds branch currencies, payment method catalog entries, branch payment method configurations, and deterministic legacy full-paid customer/supplier payments.

## 19. Legacy Compatibility

Legacy `paid`, `paymentMethod`, and `paymentDate` fields remain readable. Clear full-paid records are migrated once using a `migrationKey`; ambiguous records are reported unresolved.

## 20. Authorization

Owners can configure branch/payment settings, record payments, void payments, and manage suppliers. Operators can record customer payments only for their assigned branch. Consultants remain read-only.

## 21. Future WhatsApp Event Readiness

Stable future financial events are `payment_received`, `payment_completed`, `balance_remaining`, and `payment_voided`. Twilio and WhatsApp sending are not implemented in Phase 5.

## 22. Tests

Phase 5 tests cover branch currencies, branch/currency payment methods, partial payments, overpayment blocking, daily close isolation, supplier payments, and Nairobi USD versus Mogadishu USD report separation.

## 23. Unresolved Business Decisions

MACRUF DECISION REQUIRED: Cargo currently follows the existing `paidByBranchId` financial ownership model. More detailed collect-payment settlement rules between origin and destination branches should be defined before adding inter-branch settlement logic.

## 24. Deferred Work

Deferred work includes full Phase 8 UI redesign, WhatsApp/Twilio notifications, exchange rates, tax handling, bank reconciliation, payroll, inventory, and a full accounting general ledger.

## Phase 5B - Financial Report UI Completion

The Financial Reports screen now consumes the authoritative `/api/reports/finance` endpoint instead of recalculating finance totals from raw frontend transaction arrays.

The page title is `Financial Reports`. The toolbar includes a data-driven branch selector, date-from, date-to, and owner-only PDF download.

All Branches view shows a Branch & Currency Performance table. Rows remain separated by branch and currency, so Nairobi USD and Mogadishu USD are visible as different operational balances. Agency consolidated currency summaries may appear above the table, but they do not replace branch/currency rows.

Single-branch view derives displayed currencies from `Branch.allowedCurrencies`. Nairobi shows KES and USD. Mogadishu shows USD only and does not render useless static KES zero cards.

Revenue by Service is branch/currency aware and displays branch, currency, service, revenue, and gross profit from backend report rows. Collections by Payment Method uses the customer Payment ledger and keeps branch/currency/method combinations explicit.

Outstanding balances, operating expenses, and supplier exposure are displayed in the Branch & Currency Performance table. The six-month trend is scoped to the selected branch or All Branches and labels the selected report scope.

PDF export includes selected branch scope, date range, branch/currency performance rows, consolidated currency summary, and payment-method collections. It does not output a single ambiguous USD total as the only USD reporting result.

Phase 5B tests cover branch/currency separation, Nairobi KES and USD, Mogadishu USD, future Hargeisa USD behavior, backend date filtering, and payment-method collection reporting.

# Codex Implementation Handoff — SomWay UI Redesign

## Objective

Redesign the existing agency management system to the SomWay visual system represented by this package and the screenshots in `public/reference/`.

The existing application is already functional. Treat the redesign as a **front-end refactor**, not a product rewrite.

## Non-negotiable constraints

1. Preserve all current business logic and live data flows.
2. Preserve database schema and API contracts unless a UI requirement truly requires an additive field.
3. Preserve authentication, authorization, and existing role checks.
4. Do not hardcode the demo numbers or sample rows in this package into production.
5. Keep only the real branches: Nairobi and Mogadishu, unless the existing database dynamically contains additional branches.
6. Keep the real services: Visa, Ticketing, Cargo.
7. Preserve existing record references and cargo tracking-number generation.
8. Preserve receipts/PDF generation, report export, payment flows, and audit logs.
9. Do not weaken security or make owner-only controls available to branch officers.
10. Use existing project dependencies when possible. Do not add a large UI framework unless necessary.

## Brand tokens

Use the CSS variables from `src/styles.css` as the source of truth:

- Navy 950: `#031735`
- Navy 900: `#051F49`
- Navy 800: `#08346F`
- Brand Blue: `#0B66E3`
- Cyan: `#00B7D4`
- Teal: `#0AA5B7`
- Ink: `#0D1B42`
- Background: `#F4F7FB`
- Surface: `#FFFFFF`
- Success: `#16A34A`
- Warning: `#F59E0B`
- Danger: `#EF4444`
- Violet: `#7C3AED`

Typography: Poppins preferred; Inter/system sans fallback.

## Layout system

### Admin

- Fixed/sticky 252px dark navy sidebar.
- Sticky 72px white top bar.
- Main background: very light cool gray.
- Page content maxes out naturally to available viewport width.
- Use a 12-column mental grid; most screens use 2- or 3-column card compositions.
- Standard card radius: 14–18px.
- Borders: `#DFE7F2`.
- Elevation should remain soft and subtle.

### Motion

Use motion only to add quality, not distraction:

- Page load: opacity + 5px vertical translate, ~450ms.
- Card hover: -3px lift, ~220ms.
- Modal: opacity + 14px translate + 0.985 scale, ~240ms.
- Public hero: slow orbital lines and floating transport elements.
- Respect `prefers-reduced-motion` in production.

## Route/screen mapping

Map the existing routes to the following component patterns:

| Existing feature | Handoff reference | Prototype file |
|---|---|---|
| Overview | `reference/dashboard.png` | `DashboardPage.tsx` |
| Tickets | `reference/tickets.png` | `TicketsPage.tsx` |
| Create Ticket | `reference/create-ticket.png` | modal inside `TicketsPage.tsx` |
| Cargo desk | `reference/cargo.png` | `CargoPage.tsx` |
| Create Cargo | `reference/create-cargo.png` | modal inside `CargoPage.tsx` |
| Visas | `reference/visas.png` | `VisaPage.tsx` |
| Daily Summary | `reference/daily-summary.png` | `DailySummaryPage.tsx` |
| Expenses | `reference/expenses.png` | `ExpensesPage.tsx` |
| Clients | `reference/clients.png` | `ClientsPage.tsx` |
| Accounts Receivable | `reference/accounts-receivable.png` | `AccountsReceivablePage.tsx` |
| Receipts | `reference/receipts.png` | `ReceiptsPage.tsx` |
| Track shipment / visa | `reference/tracking.png` | `TrackingPage.tsx` |
| Financial reports | `reference/financial-reports.png` | `FinancialReportsPage.tsx` |
| Accounts Payable | `reference/accounts-payable.png` | `AccountsPayablePage.tsx` |
| Team & roles | `reference/team-roles.png` | `TeamRolesPage.tsx` |
| Activity log | `reference/activity-log.png` | `ActivityLogPage.tsx` |
| Agency settings | `reference/agency-settings.png` | `SettingsPage.tsx` |
| Branch/business settings | `reference/business-settings.png` | `BusinessSettingsPage.tsx` |
| Advanced settings | `reference/advanced-settings.png` | `AdvancedSettingsPage.tsx` |
| Public website | `reference/public-landing.png` | `PublicLandingPage.tsx` |

## Navigation

Use the existing route names/URLs so bookmarks and permissions do not break.

Visual navigation labels should be concise:

- Dashboard
- Bookings
- Cargo
- Visa Services
- Clients
- Finance
- Reports
- Operations
- Branches
- Users & Roles
- Settings

Finance can reveal sub-items such as Accounts Receivable and Accounts Payable if the existing route structure supports nested navigation.

## Dashboard

Use metric cards for:

- Total Revenue
- Total Cargo Shipments
- Accounts Receivable
- Total Clients
- Visa Applications
- Tickets Issued

Use charts for revenue trend, revenue by service, branch performance, and cargo status. Do not calculate these on the client if the backend already provides aggregates.

## Ticket screen

Preserve all current ticket fields. Restructure the page into:

- Search/filter toolbar
- Status tabs
- Four KPI cards
- Dense ticket table
- Create Ticket modal

The modal should show a live profit summary using the same existing calculation:

`Gross Profit = Sale Amount - Agency Cost`

Do not change financial calculation semantics.

## Cargo screen

Use the generated **Tracking Number** everywhere rather than “Shipment ID”.

The shared cargo desk should surface:

- Total shipments
- In transit
- Ready for collection
- Delivered
- Cargo revenue
- Status donut
- Route activity
- Search/filter row
- Operational table

Create Cargo should group inputs into Shipment Details, Contact Details, Pricing, and Customer Payment.

## Visa screen

Use KPI cards for total, submitted, approved, pending, refused. Add a clear pipeline/approval view only if the underlying statuses already exist.

## Finance

Accounts Receivable and Accounts Payable should emphasize:

- total balances by currency
- aging/status
- due dates
- paid/outstanding amounts
- collection/payment status

Never merge KES and USD into a single number without an explicit FX conversion rule already present in the application.

## Team roles

Production role model:

- **Owner (Macruf):** full control.
- **General Manager (Abdulkadir):** operational management across Nairobi and Mogadishu, reporting, staff supervision and approved management actions.
- **Branch Officer:** daily operations for assigned branch only.

Use the existing authorization model as the final authority. The cards are explanatory UI, not a substitute for backend permission checks.

## Public landing page

The public page should use the dark navy/cyan motion-graphic hero from `reference/public-landing.png`.

Required public capabilities:

- Service overview: Ticketing, Cargo, Visa.
- Nairobi and Mogadishu contact/branch information.
- Cargo tracking using the public-safe tracking endpoint.
- Visa status tracking using the public-safe application reference endpoint.
- Contact form / WhatsApp CTA.
- Do not expose internal pricing, margins, costs, staff-only notes, or finance records.

## Responsive behavior

The supplied visual references are desktop-first. Implement production breakpoints:

- >= 1280: full sidebar and multi-column dashboard.
- 768–1279: collapsible sidebar; cards reduce columns.
- < 768: drawer navigation; cards stack; tables become horizontal-scroll containers or mobile record cards.
- Modals should become full-height sheets on small screens.

## Quality checklist

Before completing the redesign:

- Compare every route against its PNG reference.
- Confirm no route lost functionality.
- Verify both branch filters.
- Verify USD and KES remain distinct.
- Verify cargo tracking-number behavior.
- Verify owner, GM and branch-officer permissions.
- Verify empty/loading/error states.
- Verify print/PDF screens remain print-safe.
- Verify reduced-motion accessibility.
- Run existing tests and add UI tests where practical.

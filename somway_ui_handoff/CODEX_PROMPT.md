# Ready-to-paste Codex prompt

Use the attached `somway_ui_handoff` package to redesign the existing SomWay Travel & Logistics application.

The current application is functional. I want a UI/UX refactor only. Do not replace or break its backend, database, authentication, roles, permissions, calculations, reference generation, receipts, reports, exports, tracking, or API calls.

First inspect the existing project architecture, routes, components, data layer and styling. Then read `README.md` and `CODEX_HANDOFF.md`. Use the PNGs inside `public/reference/` as the visual target and the React/CSS prototype in `src/` as implementation guidance.

Apply the redesign page by page:

1. App shell / sidebar / top bar
2. Dashboard
3. Tickets and Create Ticket modal
4. Cargo Desk and Create Cargo modal
5. Visa Applications
6. Daily Summary
7. Expenses
8. Clients Registry
9. Accounts Receivable
10. Receipt Builder
11. Cargo & Visa Tracking Centre
12. Financial Reports
13. Accounts Payable
14. Team & Role Access
15. Activity Log
16. Agency / Business / Advanced Settings
17. Public landing page

Business facts that must remain correct:

- Brand: SomWay Travel & Logistics.
- Branches: Nairobi, Kenya and Mogadishu, Somalia.
- Services: Visa, Ticketing, Cargo.
- Macruf is Owner.
- Abdulkadir is General Manager across both branches.
- One Branch Officer handles day-to-day services in each branch.
- Cargo uses a system-generated Tracking Number.
- KES and USD must remain separate unless the current system has an explicit FX conversion workflow.

Use the existing project’s route and state-management conventions. Reuse existing chart/table/form libraries where possible instead of adding unnecessary dependencies. Use shared design tokens and components so the visual system is consistent.

Do not hardcode the demo figures shown in the prototype. Bind all cards, charts, tables, filters and status badges to the existing live data.

For the public page, expose only customer-safe information. Cargo and visa status tracking must not reveal internal costs, profit margins, private staff notes, internal payment details, or administrative data.

Add subtle professional motion: page entrance, card hover, modal entrance, and the public landing hero. Respect `prefers-reduced-motion`.

After implementation, run the existing test/build/lint workflow and fix regressions. Give me a concise summary of files changed, routes updated, any dependency changes, and any backend/API gaps you found that prevented exact parity with the designs.

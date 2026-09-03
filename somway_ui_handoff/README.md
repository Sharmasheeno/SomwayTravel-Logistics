# SomWay Travel & Logistics — UI Redesign Handoff

This package is an implementation-ready visual/UI handoff for the existing SomWay agency operations system.

It contains:

- A standalone **React + TypeScript + Vite** prototype.
- Shared SomWay design tokens and reusable UI components.
- Admin screens for the full operations system.
- Create Ticket and Create Cargo modal designs.
- A public landing page with cargo/visa tracking UI.
- The generated visual references in `public/reference/` so Codex can compare the implementation to the approved direction.

## Important integration rule

**Do not replace the existing backend, database, business rules, authentication, permissions, calculations, record IDs, or API calls.**

This package is a presentation layer / design-system handoff. Codex should transplant the styling and component structure into the existing application and bind it to the current live data and actions.

## Business facts to preserve

- Brand: **SomWay Travel & Logistics**
- Current branches: **Nairobi, Kenya** and **Mogadishu, Somalia** only.
- Current services: **Visa, Ticketing, Cargo**.
- Owner: **Macruf** — full owner access.
- General Manager: **Abdulkadir** — manages both branches and operational staff.
- One branch officer operates day-to-day services in each branch.
- Cargo records use a system-generated **Tracking Number**.

## Screens included

1. Dashboard
2. Tickets / Bookings
3. Create Ticket modal
4. Shared Cargo Desk
5. Create Cargo modal
6. Visa Applications
7. Daily Summary
8. Expenses
9. Clients Registry
10. Accounts Receivable
11. Receipt Builder
12. Cargo & Visa Tracking Centre
13. Financial Reports
14. Accounts Payable
15. Team & Role Access
16. Activity Log
17. Agency Settings
18. Business / Branch Settings
19. Advanced Settings
20. Public Landing Page

## Run the standalone prototype

```bash
npm install
npm run dev
```

Open the local Vite URL. A small developer screen selector is included in the bottom-right corner so every concept can be previewed from one project.

## Design language

- Premium navy base with electric blue and cyan highlights.
- Light admin workspace with high-contrast navy sidebar.
- Rounded 14–18px cards, light borders, soft elevation.
- Dense but readable operational tables.
- Colored status badges instead of heavy filled rows.
- Motion is subtle: page fade/slide, card lift, modal entrance, hero orbital animation.
- Charts are intentionally dependency-free SVG/CSS examples. In the production app, retain the existing chart library if one is already installed.

## Main files

- `src/styles.css` — global design system and motion rules.
- `src/components/AppShell.tsx` — sidebar/topbar shell.
- `src/components/UI.tsx` — cards, tables, filters, modals, fields, charts.
- `src/pages/*` — screen-specific layouts.
- `public/reference/*` — approved visual references.
- `CODEX_HANDOFF.md` — implementation instructions for Codex.
- `CODEX_PROMPT.md` — ready-to-paste task prompt for Codex.

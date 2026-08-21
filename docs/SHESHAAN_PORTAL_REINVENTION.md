# Sheshaan Portal Reinvention Blueprint

## Phase 1: Architecture And Codebase Tear-Down

The portal is an internal smart trade operating system for international agricultural commodity exports. It manages CRM, source-data intelligence, buyer outreach, quote automation, invoices, payments, shipments, freight presets, suppliers, export documents, users, and management visibility.

Primary technical risks identified:

- `src/components/Dashboard.tsx` is a large orchestration component that mixes routing, data fetching, workflows, forms, imports, documents, and UI state.
- Production data behavior can diverge between Supabase, Firebase, localStorage, and the local `db.json` fallback.
- Some lifecycle rules exist both in SQL triggers and client code, creating split-brain workflow risk.
- Large CRM/source-data/reachout lists still need virtualization before the dataset grows further.
- Production error screens must never expose stack traces to end users.

The target production architecture is Next.js App Router, Supabase Auth/PostgreSQL/RLS/Realtime, Netlify serverless hosting, GitHub Actions CI, and an optional Docker image for local parity or container deployment.

## Phase 2: Radical UI/UX And Design System

Design direction:

- High-density enterprise layout with fixed command sidebar, responsive mobile command surface, and data-first cards/tables.
- Neutral graphite shell, white data surfaces, sky/emerald/amber/rose semantic status colors, and a dark mode that preserves table contrast.
- 8px spacing grid, 4px to 8px radius for operational UI, dense typography, and persistent primary actions.
- Every long table must have a mobile-native action layout so users can email, WhatsApp, edit, filter, and search without zooming.

Interaction protocol:

- Inputs use buffered typing where expensive parent state updates would otherwise lag keystrokes.
- Long operations show top loading bars, inline busy states, and final success/error summaries.
- Bulk actions require explicit selected state and must clear selection only after successful persistence.
- Motion is subtle, short, and disabled by `prefers-reduced-motion`.

## Phase 3: Next-Generation Feature Expansion

Approved feature direction:

- Unified Action Queue for overdue follow-ups, stuck quotes, pending payments, shipment risks, and document blockers.
- Automated Outreach Sequences using deterministic templates and date-based state transitions.
- Smart Lead Scoring using rule-based scoring from country, email validity, product interest, activity, value, and follow-up freshness.
- Buyer Lifecycle Automation from lead to client, quote, invoice, shipment, and task creation.
- Import Intelligence for duplicate skipping, source tagging, progress reporting, and export in the same template.

No paid external AI APIs are required. Automation should be deterministic TypeScript plus Supabase triggers/functions.

## Phase 4: CI/CD And Deployment Blueprint

Required checks:

- `npm audit --audit-level=moderate`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Deployment lanes:

- Netlify remains the primary hosting path via `netlify.toml`.
- GitHub Actions verifies every push and pull request.
- Dockerfile provides container parity for environments that require it.

Database strategy:

- Supabase migrations are the production source of truth.
- RLS policies enforce all role permissions.
- Local file-backed storage is development/demo only and must not be treated as production durability.

## Phase 5: Bulletproof Execution Protocol

Implementation rules:

- Every mutation returns a typed success/error result.
- Every page and feature surface has loading, empty, success, and error states.
- Every import validates headers, skips duplicates, tags source, and reports imported/skipped counts.
- Every CRM action writes an activity event and updates the next operator action.
- Production error UI shows a safe reference ID instead of stack traces.
- Large lists use pagination or virtualization before rendering thousands of rows.

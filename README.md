# TokTickIT

TokTickIT is an IT service desk application created for the CPE 334 course project (KMUTT, Semester 1/2026). It is built with a Spec DD / Test DD / TDD workflow and a Zen Green design language.

**Stack:** React, TypeScript, Vite, Bootstrap (client); Node.js, Express, TypeScript (server); PostgreSQL with Prisma (database); Vitest, Supertest and Playwright with axe-core (tests).

## Project status

| Lab | Increment | Status |
|-----|-----------|--------|
| Lab 1 | Project foundation, API health check, category data model and seeding, category list (API + UI) | Done |
| Lab 2 | Requester screens (Create Ticket, My Tickets, Ticket Detail), Attachments, Development Requester selector | Done |
| Lab 3 | Real authentication, roles, IT Staff ticketing, Administrator user management | Done |
| **Lab 4** | **Actions Taken, Ticket Workflow, Role Dashboards, Hardening, Playwright E2E & Release** | **Done** |

## Lab 4 features

- **Actions Taken:** Comprehensive record of interventions taken by IT Staff with chronological audit trail, mandatory description and result, follow-up management with completion tracking, optimistic concurrency control (`expectedVersion` with 409 conflict detection), and responsive desktop table / mobile card rendering. Requesters have read-only access.
- **Ticket Workflow & Resolution Gate:** State transition matrix enforcing permitted lifecycle flows (`New`, `Open`, `InProgress`, `WaitingForRequester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`). Moving to `Resolved` strictly evaluates the 4-part resolution gate (active IT Staff owner, ≥1 Action Taken, 0 open follow-ups, and a 1–1000 character resolution summary). Non-blocking requester resolution indicator ("Problem Appears Resolved") surfaces advisory cues to staff. Terminal states (`Closed`, `Cancelled`) lock all modifications.
- **Role-Aware Dashboards:**
  - *Requester Dashboard:* 4 metric cards (Total, Open, Waiting for You, Recently Resolved), 3 filtered lists, zero-state for new users (David Lee), and drill-down navigation to My Tickets with matching status filters.
  - *IT Staff & Administrator Dashboard:* Workload overview (Unassigned, My Assigned, Requester Says Resolved, My Open Follow-Ups), status and IT Priority breakdown cards with drill-down to Queue, 3 actionable lists, and an Administrator-only Users overview card.
- **Hardening & Security:** Database-backed session validation in `requireAuth` immediately rejecting deactivated or deleted users, uniform error shape `{ error, code }`, 404 existence leakage prevention, and automatic retry on Ticket Number collision (`P2002`).
- **Accessibility & Responsive QA:** WCAG 2.1 AA compliant color contrast (tested via `@axe-core/playwright`), keyboard-operable workflows, and responsive verification across Desktop (1280px), Tablet (820px), and Mobile (390px) viewports with captured screenshot artifacts.

## Getting started

```bash
npm install
cp server/.env.example server/.env      # local values only, never commit real secrets
cd server
npx prisma migrate deploy
npx prisma db seed                      # idempotent, safe to run repeatedly
cd ..
npm run dev
```

## Seeded accounts (LOCAL DEVELOPMENT ONLY)

The seed creates 4 active + 1 inactive Requester, 3 active + 1 inactive IT Staff, and 1 Administrator, along with 18 realistic tickets and 22 actions taken conforming to spec §7.4. All seeded accounts use password `password`. These credentials exist for local development only; exact accounts are defined in `server/prisma/seed.ts`. No real personal passwords or secrets are stored in this repository.

## Running the tests

| Scope | Command | Results |
|-------|---------|---------|
| Server Tests (Vitest + Supertest) | `cd server && npm test` | **150 passed** (19 test files) |
| Client UI Tests (Vitest + RTL) | `cd client && npm test` | **53 passed** (10 test files) |
| End-to-end & A11y (Playwright) | `npx playwright test e2e/lab-04` | **17 passed** (5 spec files) |

The test plan, acceptance-criteria traceability, and passing terminal evidence are documented in `docs/lab-04/tests.md`.

## Documentation

Each lab has its own folder under `docs/`:

- `docs/lab-04/specification.md`: requirements, business rules, acceptance criteria, schema design
- `docs/lab-04/api-spec.md`: endpoints, payload schemas, error codes, concurrency handling
- `docs/lab-04/ui-spec.md`: screens, component states, responsive breakpoints, accessibility
- `docs/lab-04/tests.md`: test plan, acceptance-criteria traceability, final passing results
- `docs/lab-04/reviewer.md`: peer review record
- `docs/lab-04/ai-use.md`: AI usage, key prompts, and reflection

## Git workflow

- One feature branch per GitHub Issue (`feature/NN-name`), merged through Pull Requests with peer review
- Feature branches are merged into `lab4-staging`; a single release PR merges `lab4-staging` into `main`
- Kanban statuses: Backlog, In Progress, In Review, Done

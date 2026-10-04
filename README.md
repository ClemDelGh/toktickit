# TokTickIT

TokTickIT is an IT service desk application created for the CPE 334 course project (KMUTT, Semester 1/2026). It is built with a Spec DD / Test DD / TDD workflow and a Zen Green design language.

**Stack:** React, TypeScript, Vite, Bootstrap (client); Node.js, Express, TypeScript (server); PostgreSQL with Prisma (database); Vitest, Supertest and Playwright (tests).

## Project status

| Lab | Increment | Status |
|-----|-----------|--------|
| Lab 1 | Project foundation, API health check, category data model and seeding, category list (API + UI) | Done |
| Lab 2 | Requester screens (Create Ticket, My Tickets, Ticket Detail), Attachments, Development Requester selector | Done |
| **Lab 3** | **Real authentication, roles, IT Staff ticketing, Administrator user management** | **Done** |

## Lab 3 features

- **Authentication:** email + password login, logout, current-user endpoint, mandatory password change at first login. Passwords are hashed, never stored in plaintext. The Development Requester selector has been removed.
- **Role-based access:** Requester, IT Staff, Administrator (one role per user). Navigation adapts to the role, and every protected operation is enforced by the backend.
- **Requester:** creates and manages their own Tickets and Attachments using the authenticated identity, posts Public Comments, and can indicate "Problem Appears Resolved".
- **IT Staff:** shared Ticket Queue (search, filters, sorting, pagination, responsive table/card layout); Ticket Detail with claim/reassign ownership, IT Priority, permitted status transitions, Public Comments and Internal Notes.
- **Administrator:** minimalist User Management (list, search by name/email, role filter, create, edit, one-role assignment, activate/deactivate, set a new initial password) with safety rules: no duplicate emails, no self-deactivation, never zero active Administrators.

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

The seed creates 4 active + 1 inactive Requester, 3 active + 1 inactive IT Staff and at least 1 Administrator, with realistic Tickets, Public Comments and Internal Notes. Existing Lab 2 Requesters are migrated into real User accounts and keep ownership of their Tickets. All seeded accounts use an initial password and must change it at first login. These credentials exist for local development only; the exact accounts are defined in `server/prisma/seed.ts`. No real personal passwords or secrets are stored in this repository.

## Running the tests

| Scope | Command |
|-------|---------|
| Unit / UI (Vitest) | `npm run test:ui` |
| API (Vitest + Supertest) | `npm run test:api` |
| End-to-end (Playwright) | `npx playwright test` |

Lab 3 tests live in `server/tests/lab-03/`, `client/src/tests/lab-03/` and `e2e/lab-03/`. The test plan and acceptance-criteria traceability are in `docs/lab-03/tests.md`.

## Documentation

Each lab has its own folder under `docs/`:

- `docs/lab-03/specification.md`: requirements, business rules, acceptance criteria, migration decisions
- `docs/lab-03/api-spec.md`: endpoints, authentication, status codes
- `docs/lab-03/ui-spec.md`: screens, modes, responsive rules
- `docs/lab-03/tests.md`: test plan, traceability, results
- `docs/lab-03/reviewer.md`: peer review record
- `docs/lab-03/ai-use.md`: AI usage and reflection

## Git workflow

- One feature branch per GitHub Issue (`feature/NN-name`), merged through Pull Requests with peer review
- Feature branches are merged into `lab3-staging`; a single release PR merges `lab3-staging` into `main`
- Kanban statuses: Backlog, In Progress, In Review, Done

## Out of scope for Lab 3

Email invitations and password-reset email, MFA/SSO/social login, self-registration, Actions Taken (deferred to Lab 4), SLA and notifications, dashboards and KPIs, multiple roles per user, user deletion, bulk operations, import/export, and production deployment.

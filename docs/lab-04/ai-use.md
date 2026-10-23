# Lab 4 — AI Use

## LLM used
Google Antigravity Agent (Gemini & Claude), used as specification authoring, TDD implementer, and QA verification agent.

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | From the Lab 4 handout, draft the Sprint 4 contract: Actions Taken schema, status transition matrix, resolution gate criteria (G1–G4), role dashboard metrics, and test strategy. | Reviewed and refined the contract, establishing `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` prior to implementation. |
| 2 | Design the PostgreSQL migration adding `ActionTaken`, version counters for optimistic locking, resolution timestamps, and the rollback SQL script with a rehearsal runner. | Implemented `lab4_actions_taken_workflow` migration, verified down-migration SQL execution via `rehearse-rollback.ts`, and seeded 18 tickets with 22 actions. |
| 3 | Implement the Actions Taken REST API with validation rules (past/present timestamp, mandatory description/result, clientRequestId idempotency) and version concurrency. | Wrote 15 Supertest integration tests checking validation errors, concurrency 409 status, and role-based access before wiring router handlers. |
| 4 | Build the Actions Taken frontend component with responsive table/card layout, optimistic locking reload banner, and follow-up completion toggle. | Tested UI rendering, read-only view for requesters, and verified WCAG text contrast for follow-up badges. |
| 5 | Implement the ticket workflow transition engine, enforcing BR-07 matrix and the resolution gate (G1: active owner, G2: ≥1 action, G3: 0 open follow-ups, G4: summary 1–1000 chars). | Verified both unit and API tests, ensuring direct API calls cannot bypass the gate and return 422 with structured `blockers` array. |
| 6 | Create the Requester Dashboard (`GET /api/dashboard/requester` and `RequesterDashboard.tsx`) with 4 status cards, 3 lists, zero-state for David Lee, and drill-down to My Tickets. | Validated API response shapes, checked drill-down click handlers setting activeTab and statusFilter, and verified client tests. |
| 7 | Create the Staff/Admin Dashboard (`GET /api/dashboard/staff` and `StaffDashboard.tsx`) including workload cards, priority breakdown, and admin-only user metrics. | Enforced RBAC preventing Requester access with 403, verified queue filter parameter passing, and checked responsive layouts. |
| 8 | Run security hardening: verify database-backed session validation in `requireAuth`, uniform error response shape `{ error, code }`, 404 existence leakage prevention, and Ticket Number retry on P2002. | Verified 33 hardening tests, ensuring inactive or deleted users are immediately rejected and error messages contain no stack traces. |
| 9 | Configure Playwright E2E suite with axe-core accessibility scanner and responsive screenshot capture across Desktop (1280px), Tablet (820px), and Mobile (390px). | Resolved color contrast violations on yellow/green bootstrap badges to satisfy WCAG AA, verified 17 E2E tests, and documented passing output in `tests.md`. |

## My Reflection
Throughout Sprint 4, AI assistance proved exceptionally valuable in maintaining strict traceability across the multi-issue workflow:
1. **Contract-Driven Development:** Defining the exact state machine transitions, resolution gate blockers, and API schemas in Issue #20 ensured zero drift between backend and frontend implementations.
2. **Concurrency & Optimistic Locking:** Generating deterministic tests for 409 conflict detection across two simultaneous browser contexts allowed us to verify optimistic locking without race conditions.
3. **Accessibility & Hardening:** Using axe-core within Playwright caught subtle contrast deficiencies in Bootstrap's default yellow and light-green badges that human review might have missed. Adjusting background and text hex values resolved all serious/critical violations while preserving the visual identity.
In future iterations, generating database reset hooks between parallel test runners earlier in the pipeline would further streamline testing cycles.

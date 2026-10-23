# Lab 4 Test Plan and Results

## 1. Test Strategy
Tests are planned from `specification.md` **before** implementation (Test DD) and written first for each Issue (TDD: red → green → refactor). Every Acceptance Criterion (AC-01…AC-30) maps to at least one test (§3). Levels: **unit** (pure rules), **API/integration** (Supertest against the real app + PostgreSQL), **UI component** (Vitest + Testing Library), **UI style / responsive / accessibility** (Playwright + axe-core), **E2E** (Playwright), **migration/regression**, **performance-smoke**.

**Conventions for the coding agent**
* One Issue = one branch. For each Issue, first write the tests listed for it (see `Issues` file), run them and show they **fail for the expected reason**, then implement, then show them green. Do not report "done" unless the listed Test IDs pass; never skip, disable or loosen a test to make it pass.
* **No hard-coded user ids.** Use `server/tests/helpers/auth.ts`: `cookieFor(email)` looks the real seeded user up in the database and signs a JWT with its real id/role (needed because `requireAuth` becomes database-authoritative, BR-27). Existing Lab 2/3 tests that forge `{ userId: 1, role: ... }` must be migrated to this helper.
* **Dashboard/drill-down oracle.** Expected numbers are never hard-coded: each test computes them with an independent Prisma query (`server/tests/helpers/oracle.ts`) and compares with the API. Only zero-state checks use fixed users (David Lee = no Tickets; Administrator = owns nothing).
* **Test data.** Read-only tests use the §7.4 seed (`TKT-2026-9001…9016`). Tests that write create their own Tickets/Actions with unique numbers (`TKT-TEST-<uuid>`) via Prisma and delete them in `afterAll`. Performance tests bulk-insert `TKT-PERF-*` rows and remove them afterwards.
* Prerequisite for server tests: database migrated and seeded (`npx prisma migrate deploy && npx prisma db seed`).
* New dev dependency for accessibility E2E: `@axe-core/playwright`.

## 2. Planned Tests

Paths: `S/` = `server/tests/lab-04/`, `C/` = `client/tests/lab-04/`, `E/` = `e2e/lab-04/`.

### 2.1 Unit
| Test ID | AC | Type | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UNIT-01 | AC-10 | Unit | Transition matrix, table-driven over all 56 ordered status pairs | Exactly the 21 allowed pairs of BR-11 return allowed; same-status is not a transition | `S/workflow-rules.unit.test.ts` | Pending |
| UNIT-02 | AC-11 | Unit | Resolution-gate evaluator for every combination of G1–G4 | Returns exactly the missing blockers (`NO_OWNER`, `NO_ACTIONS`, `OPEN_FOLLOW_UP`, `NO_RESOLUTION_SUMMARY`); empty when satisfied | `S/workflow-rules.unit.test.ts` | Pending |
| UNIT-03 | AC-02 | Unit | Action validator: trimming, length limits, date bounds (future +5 min, before ticket creation), follow-up rule | Field errors per BR-04/05; follow-up note normalised to null | `S/validators.unit.test.ts` | Pending |
| UNIT-04 | AC-24 | Unit | Query-parameter parser: `sortField` whitelist, `limit` 1–100, `page` ≥ 1, status list, `owner`, `itPriority` | Valid values parsed; invalid values produce `VALIDATION_ERROR` | `S/validators.unit.test.ts` | Pending |

### 2.2 API — Actions Taken (`S/actions-taken.api.test.ts`)
| Test ID | AC | Type | What It Tests | Expected Result | Final |
| :--- | :--- | :--- | :--- | :--- | :--- |
| API-01 | AC-01 | API | IT Staff creates a valid Action | 201; saved under the right Ticket; `performedBy` = session user; `version` = 1 | Pending |
| API-02 | AC-01 | API | Body contains a different `performedById` | Ignored; performer is the authenticated user | Pending |
| API-03 | AC-02 | API | Validation matrix: blank description, blank result, over-length fields, invalid/future/pre-creation date, follow-up required without note | Each → 400 `VALIDATION_ERROR` with `fieldErrors`; no row created | Pending |
| API-04 | AC-02 | API | `followUpRequired=false` with a note supplied | 201; `followUpNote` stored as null | Pending |
| API-05 | AC-03 | API | IT Staff B records an Action on A's Ticket | 201; performer B; `ticketOwnerId` unchanged | Pending |
| API-06 | AC-04 | API | Edit with current `expectedVersion` | 200; `version`+1; `lastEditedBy` set; performer unchanged | Pending |
| API-07 | AC-04 | API | Edit with stale `expectedVersion` | 409 `STALE_UPDATE` with `current`; data not overwritten | Pending |
| API-08 | AC-09 | API | Mark follow-up completed; same on an Action without follow-up | `followUpCompletedAt` set; second case 400 | Pending |
| API-09 | AC-05 | API | Owner Requester lists Actions; tries POST and PATCH | List 200 (all fields); write attempts 403 | Pending |
| API-10 | AC-05 | API | Requester B lists Actions of A's Ticket | 404; no data | Pending |
| API-11 | AC-06 | API | DELETE an Action; list with equal timestamps | DELETE 404 and row remains; order = `actionDateTime`, then `id` | Pending |
| API-12 | AC-07, AC-25 | API | Same `clientRequestId` posted twice (also in parallel) | One row; second response 200 with same id | Pending |
| API-13 | AC-08 | API | Create/edit Action on Closed and Cancelled Tickets | 422 `TICKET_LOCKED` | Pending |
| API-14 | AC-05 | API | Anonymous request; unknown Ticket id | 401; 404 | Pending |
| API-15 | AC-01 | API | Administrator creates and edits an Action | 201 / 200 | Pending |

### 2.3 API — Ticket workflow (`S/ticket-workflow.api.test.ts`)
| Test ID | AC | Type | What It Tests | Expected Result | Final |
| :--- | :--- | :--- | :--- | :--- | :--- |
| API-16 | AC-10 | API | `allowedTransitions` in staff and Requester Ticket detail | Staff: row of BR-11; Requester: `[]` | Pending |
| API-17 | AC-10 | API | One valid transition per matrix row | 200; status changed; `version`+1 | Pending |
| API-18 | AC-10 | API | Invalid transitions (New→Resolved, Closed→Open, Cancelled→Reopened, Resolved→InProgress…) | 422 `INVALID_TRANSITION`; Ticket unchanged | Pending |
| API-19 | AC-11 | API | Resolve blocked by each single reason: no owner / no Action / open follow-up / no summary | 422 `RESOLUTION_BLOCKED` with the matching blocker | Pending |
| API-20 | AC-11 | API | Resolve when several conditions fail | All blockers listed in one response | Pending |
| API-21 | AC-11 | API | Resolve with gate satisfied | 200; status Resolved; `resolvedAt` and `resolutionSummary` set | Pending |
| API-22 | AC-11 | API | Direct crafted PATCH (bypassing the UI) from Open to Resolved on a Ticket with no Actions | Still 422; UI is not the authority | Pending |
| API-23 | AC-12 | API | Requester uses `PATCH /api/tickets/:id/resolve`, twice | Indicator set; status unchanged; second call idempotent 200 | Pending |
| API-24 | AC-12 | API | Requester PATCHes staff route with a status; staff user calls the advisory route; Requester B on A's Ticket | 403; 403; 404 | Pending |
| API-25 | AC-12 | API | Advisory on Resolved/Closed/Cancelled Ticket | 422 `INVALID_STATE` | Pending |
| API-26 | AC-13 | API | Resolved→Closed; Resolved→Reopened; any status change | `closedAt` set; `resolvedAt`+indicator cleared; indicator reset on every change | Pending |
| API-27 | AC-13, AC-08 | API | Cancel from allowed states; edit owner/priority on Closed/Cancelled | Cancel 200; edits 422 `TICKET_LOCKED` | Pending |
| API-28 | AC-14 | API | Stale `expectedVersion`; two parallel PATCHes with the same version | 409 `STALE_UPDATE`; exactly one parallel request wins | Pending |
| API-29 | AC-15 | API | Assign inactive IT Staff, a Requester, an active IT Staff | 400 `INVALID_OWNER` ×2; 200 | Pending |
| API-30 | AC-15 | API | New Ticket's `itPriority`; Requester tries to change it | Equals `requestedPriority`; 403 on change | Pending |

### 2.4 API — Dashboards
| Test ID | AC | Type | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| API-31 | AC-16 | API | Requester dashboard vs oracle (4 counts + 3 lists, caps and ordering) | Equal to independent Prisma queries | `S/requester-dashboard.api.test.ts` | Pending |
| API-32 | AC-16 | API | Requester B's dashboard | Contains none of Requester A's Ticket numbers | `S/requester-dashboard.api.test.ts` | Pending |
| API-33 | AC-17 | API | David Lee (no Tickets) | Counts 0; lists `[]` (not null) | `S/requester-dashboard.api.test.ts` | Pending |
| API-34 | AC-19 | API | Staff/Admin/anonymous call the Requester dashboard | 403 / 403 / 401 | `S/requester-dashboard.api.test.ts` | Pending |
| API-35 | AC-20 | API | `GET /api/tickets?status=…` for each card; invalid status | Total equals card count; invalid → 400 | `S/requester-dashboard.api.test.ts` | Pending |
| API-36 | AC-16 | API | Recently-resolved window | Ticket resolved 2 d ago included, 10 d ago excluded | `S/requester-dashboard.api.test.ts` | Pending |
| API-37 | AC-18 | API | Staff dashboard metrics vs oracle (`unassigned`, `myAssigned`, `byStatus` 8 keys, `byItPriority`, `awaitingReview`, `myOpenFollowUps`) | Equal to independent queries | `S/staff-dashboard.api.test.ts` | Pending |
| API-38 | AC-18 | API | Lists: `myRecentTickets`, `urgentTickets`, `myRecentActions` | ≤5 each; correct ordering and filters; description cut at 120 | `S/staff-dashboard.api.test.ts` | Pending |
| API-39 | AC-19 | API | Requester/anonymous; Staff vs Admin payload | 403/401; `userCounts` only for Admin and equal to oracle | `S/staff-dashboard.api.test.ts` | Pending |
| API-40 | AC-20 | API | Queue drill-down params (`owner=me|unassigned`, `status` list, `itPriority`, `indicated`) | `meta.total` equals card count | `S/staff-dashboard.api.test.ts` | Pending |
| API-41 | AC-24 | API | Queue with invalid `sortField`, `limit=0/1000`, `page=0`, bad `status`/`owner`/`itPriority` | 400 `VALIDATION_ERROR`, never 500 | `S/staff-dashboard.api.test.ts` | Pending |
| API-42 | AC-18 | API | Staff/Admin who own nothing | `myAssigned` 0; own lists `[]` | `S/staff-dashboard.api.test.ts` | Pending |
| API-43 | AC-21 | API | Database failure simulated (spy on Prisma) on both dashboards | 500 `INTERNAL_ERROR`, generic body, no stack/SQL | `S/staff-dashboard.api.test.ts` | Pending |

### 2.5 API — Hardening, migration, regression
| Test ID | AC | Type | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| API-44 | AC-24 | API | Session authority: deactivated user with valid cookie; role changed by Admin; `mustChangePassword` user; cookie reissued after password change | 401; new role applies immediately; 403 `PASSWORD_CHANGE_REQUIRED` except `/me`, `/change-password`, `/logout`; new cookie works | `S/hardening.api.test.ts` | Pending |
| API-45 | AC-24 | API | Foreign vs missing Ticket for a Requester on detail, comments, actions, resolve, attachments | Both 404, identical body | `S/hardening.api.test.ts` | Pending |
| API-46 | AC-24 | API | Internal note on missing Ticket; empty / oversized note and comment | 404; 400 | `S/hardening.api.test.ts` | Pending |
| API-47 | AC-24 | API | Error shape across 400/401/403/404/409/422/500 | JSON `{error, code}`; no stack trace text | `S/hardening.api.test.ts` | Pending |
| API-48 | AC-25 | API | 10 parallel `POST /api/tickets` | 10 distinct Ticket numbers; no 500 | `S/hardening.api.test.ts` | Pending |
| API-49 | AC-23 | API | Route sweep over every protected route: anonymous / wrong role / wrong owner / inactive account | Per §5.5 matrix; nothing leaked | `S/hardening.api.test.ts` | Pending |
| API-50 | AC-23 | API | Public Comments visible to 3 roles; Internal Notes hidden from Requester (Lab 3 rules) | Unchanged behaviour | `S/migration-regression.api.test.ts` | Pending |
| MIG-01 | AC-22 | Migration | Integrity after migration: no orphan FKs; no null `itPriority`; `version` = 1; passwords hashed | All hold on the migrated Lab 3 data | `S/migration-regression.api.test.ts` | Pending |
| MIG-02 | AC-22 | Migration | Backfill and legacy behaviour: Resolved→`resolvedAt`, Closed→`closedAt`; legacy Ticket returns `[]` Actions; legacy Resolved can be Closed/Reopened | As specified in BR-24 | `S/migration-regression.api.test.ts` | Pending |
| MIG-03 | AC-22 | Migration (scripted/manual) | Rollback rehearsal on a scratch DB: dump → migrate → `lab4_down.sql` → app of Lab 3 still starts | Documented commands succeed; evidence pasted in §6 | `server/prisma/rollback/lab4_down.sql` + §6 | Pending |
| REG-01 | AC-23 | Regression | Lab 1 server suite re-run unchanged | Pass | `server/tests/lab-01/` | Pending |
| REG-02 | AC-23 | Regression | Lab 2 server suite re-run (with 404 harmonisation + auth helper updates) | Pass | `server/tests/lab-02/` | Pending |
| REG-03 | AC-23 | Regression | Lab 3 server suite re-run (auth, RBAC, admin safety rules) | Pass | `server/tests/lab-03/` | Pending |
| PERF-01 | AC-30 | Perf-smoke | Both dashboards with ≥ 500 Tickets | 200 in < 1000 ms | `S/performance-smoke.api.test.ts` | Pending |
| PERF-02 | AC-30 | Perf-smoke | Staff queue page (limit 50) with ≥ 500 Tickets | 200 in < 1000 ms | `S/performance-smoke.api.test.ts` | Pending |

### 2.6 UI component (Vitest)
| Test ID | AC | Type | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UI-01 | AC-01 | UI | Actions list rendering and empty state | Ordered rows with all 7 fields; empty → "No actions recorded yet" | `C/ActionsTaken.test.tsx` | Pending |
| UI-02 | AC-02 | UI | Create form validation | Red asterisks; errors under fields (text + icon); follow-up note required only when box ticked; API not called when invalid | `C/ActionsTaken.test.tsx` | Pending |
| UI-03 | AC-25, AC-07 | UI | Submit busy state and double click | Button disabled while pending; one request sent | `C/ActionsTaken.test.tsx` | Pending |
| UI-04 | AC-26 | UI | 400/network failure on create | Entered values preserved; safe message | `C/ActionsTaken.test.tsx` | Pending |
| UI-05 | AC-04, AC-14 | UI | Edit mode pre-filled; save sends `expectedVersion`; 409 | Conflict banner with Reload; edits kept | `C/ActionsTaken.test.tsx` | Pending |
| UI-06 | AC-05 | UI | Requester view of Actions | Read-only; no create/edit controls | `C/ActionsTaken.test.tsx` | Pending |
| UI-07 | AC-09, AC-28 | UI | Follow-up display and completion | "Follow-up open/done" as text badge; "Mark completed" only for open follow-ups | `C/ActionsTaken.test.tsx` | Pending |
| UI-08 | AC-10 | UI | Status control options | Only `allowedTransitions`; none for Requester | `C/TicketWorkflow.test.tsx` | Pending |
| UI-09 | AC-11 | UI | Choose Resolved | Summary field required; `RESOLUTION_BLOCKED` shows checklist of missing conditions | `C/TicketWorkflow.test.tsx` | Pending |
| UI-10 | AC-12 | UI | "Problem Appears Resolved" (Requester) and staff view | Confirmation text; status badge unchanged; staff callout "Requester indicates resolved" | `C/TicketWorkflow.test.tsx` | Pending |
| UI-11 | AC-14, AC-26 | UI | 409 on Ticket save | Conflict message; form values kept; Reload works | `C/TicketWorkflow.test.tsx` | Pending |
| UI-12 | AC-13, AC-08 | UI | Closed/Cancelled Ticket | Controls disabled/read-only with explanation | `C/TicketWorkflow.test.tsx` | Pending |
| UI-13 | AC-16 | UI | Requester dashboard rendering | 4 cards + 3 lists from API data | `C/RequesterDashboard.test.tsx` | Pending |
| UI-14 | AC-17 | UI | Zero-state | Shows `0`, empty-list messages, Create Ticket CTA | `C/RequesterDashboard.test.tsx` | Pending |
| UI-15 | AC-20 | UI | Card / "View all" activation | Opens My Tickets with matching status filter | `C/RequesterDashboard.test.tsx` | Pending |
| UI-16 | AC-21 | UI | Loading, error + Retry | Accessible loading text; generic error; Retry refetches | `C/RequesterDashboard.test.tsx` | Pending |
| UI-17 | AC-18 | UI | Staff dashboard rendering; Admin vs Staff | All cards/lists; Users card only for Admin | `C/StaffDashboard.test.tsx` | Pending |
| UI-18 | AC-20 | UI | Card activation | Opens Queue with `owner/status/itPriority/indicated` filters | `C/StaffDashboard.test.tsx` | Pending |
| UI-19 | AC-21 | UI | Loading, empty, forbidden, failure states | Each visibly distinct | `C/StaffDashboard.test.tsx` | Pending |
| UI-20 | AC-29 | UI | Role navigation and active indicator | Requester: Dashboard/Create/My Tickets; Staff: Dashboard/Queue; Admin: Dashboard/Queue/Users; `aria-current` on active | `C/Navigation.test.tsx` | Pending |
| UI-21 | AC-28 | UI | Accessible names | Icon-only buttons have labels; cards expose label+value; badges contain text | `C/Navigation.test.tsx` | Pending |
| UI-22 | AC-29 | UI | Obsolete UI removed | No Lab 1 "Check System"/Lab 2 selector text or placeholder strings rendered | `C/Navigation.test.tsx` | Pending |

### 2.7 E2E, responsive, accessibility (Playwright)
| Test ID | AC | Type | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| E2E-01 | AC-01, 03, 04, 05 | E2E | Staff opens Ticket, adds then edits an Action; Requester views it read-only | Persisted; Requester has no edit controls | `E/actions-taken-flow.spec.ts` | Pending |
| E2E-02 | AC-02, 26 | E2E | Invalid Action form, then correction | Field errors; values kept; saved after fix | `E/actions-taken-flow.spec.ts` | Pending |
| E2E-03 | AC-10, 11 | E2E | Staff tries to Resolve → blocked list → completes follow-up, adds summary → Resolved | Blockers shown; Resolved succeeds | `E/ticket-resolution.spec.ts` | Pending |
| E2E-04 | AC-12 | E2E | Requester says "appears resolved" → staff sees cue → staff resolves → closes | Status changes only by staff | `E/ticket-resolution.spec.ts` | Pending |
| E2E-05 | AC-13 | E2E | Reopen a Resolved Ticket; cancel another | Matrix respected; terminal states read-only | `E/ticket-resolution.spec.ts` | Pending |
| E2E-06 | AC-14 | E2E | Two browser contexts edit the same Ticket | Second save shows conflict; data kept | `E/ticket-resolution.spec.ts` | Pending |
| E2E-07 | AC-16, 20 | E2E | Requester dashboard → card drill-down → Ticket Detail | Totals match; correct Tickets | `E/dashboards.spec.ts` | Pending |
| E2E-08 | AC-18, 20 | E2E | Staff dashboard card → Queue; compare totals | Queue total equals card number | `E/dashboards.spec.ts` | Pending |
| E2E-09 | AC-17 | E2E | David Lee zero-state dashboard | Zeros and empty messages | `E/dashboards.spec.ts` | Pending |
| E2E-10 | AC-19 | E2E | Admin dashboard vs Staff dashboard | Users card only for Admin; Requester cannot open staff dashboard URL/API | `E/dashboards.spec.ts` | Pending |
| E2E-11 | AC-23 | E2E | Representative regression per role: first-login + login/logout, create Ticket + attachment + comment, staff note and queue, admin create user + safety rules | All behave as in Lab 3 | `E/regression.spec.ts` | Pending |
| E2E-12 | AC-29 | E2E | Tour of every screen per role | No console errors, page errors or failed requests | `E/regression.spec.ts` | Pending |
| RESP-01 | AC-27 | Responsive | Requester dashboard, Staff dashboard, Staff Ticket Detail with Actions, Requester Ticket Detail at 1280/820/390 px | `scrollWidth ≤ clientWidth`; no clipped/overlapping elements; screenshots saved to `artifacts/lab-04/screenshots/` | `E/responsive.spec.ts` | Pending |
| A11Y-01 | AC-28 | Accessibility | axe-core scan of Login, both dashboards, Staff Ticket Detail (Actions tab open) | No serious/critical violations | `E/accessibility.spec.ts` | Pending |
| A11Y-02 | AC-28 | Accessibility | Keyboard-only: add an Action and change status | Operable with Tab/Enter/Space/Esc; focus visible; focus returns after panel closes | `E/accessibility.spec.ts` | Pending |

## 3. Acceptance-Criterion Traceability
| AC | Covered by |
|---|---|
| AC-01 Create Action (valid, session performer) | API-01, API-02, API-15, UI-01, E2E-01 |
| AC-02 Action validation | UNIT-03, API-03, API-04, UI-02, E2E-02 |
| AC-03 Different staff than owner | API-05, E2E-01 |
| AC-04 Edit + stale edit | API-06, API-07, UI-05, E2E-01 |
| AC-05 Requester read-only / isolation | API-09, API-10, API-14, UI-06, E2E-01 |
| AC-06 Append-only, stable order | API-11 |
| AC-07 Idempotent create | API-12, UI-03 |
| AC-08 Terminal Ticket lock | API-13, API-27, UI-12 |
| AC-09 Follow-up completion | API-08, UI-07 |
| AC-10 Transition matrix | UNIT-01, API-16, API-17, API-18, UI-08, E2E-03, E2E-05 |
| AC-11 Resolution gate | UNIT-02, API-19, API-20, API-21, API-22, UI-09, E2E-03 |
| AC-12 Requester advisory | API-23, API-24, API-25, UI-10, E2E-04 |
| AC-13 Close / reopen / cancel | API-26, API-27, UI-12, E2E-05 |
| AC-14 Stale Ticket update | API-28, UI-05, UI-11, E2E-06 |
| AC-15 Owner validity, IT Priority | API-29, API-30 |
| AC-16 Requester dashboard | API-31, API-32, API-36, UI-13, E2E-07 |
| AC-17 Requester zero-state | API-33, UI-14, E2E-09 |
| AC-18 Staff dashboard | API-37, API-38, API-42, UI-17, E2E-08 |
| AC-19 Dashboard authorization | API-34, API-39, E2E-10 |
| AC-20 Drill-down | API-35, API-40, UI-15, UI-18, E2E-07, E2E-08 |
| AC-21 Dashboard states | API-43, UI-16, UI-19 |
| AC-22 Migration | MIG-01, MIG-02, MIG-03 |
| AC-23 Regression | REG-01, REG-02, REG-03, API-49, API-50, E2E-11 |
| AC-24 Hardening / safe errors / sessions | UNIT-04, API-41, API-44, API-45, API-46, API-47 |
| AC-25 Duplicate protection | API-12, API-48, UI-03 |
| AC-26 Form data retained | UI-04, UI-11, E2E-02 |
| AC-27 Responsive | RESP-01 |
| AC-28 Accessibility | A11Y-01, A11Y-02, UI-07, UI-21 |
| AC-29 Final polish / navigation | UI-20, UI-22, E2E-12 |
| AC-30 Performance smoke | PERF-01, PERF-02 |

## 4. Responsive, Visual and Accessibility Checklist
Complete during Issue #28 and keep screenshots in `artifacts/lab-04/screenshots/{staff-dashboard,requester-dashboard,actions-taken}/` at Desktop (≥ 992 px), Tablet (768–991 px), Mobile (< 768 px).
- [ ] Primary green `#006B3C` for header/primary actions; secondary `#0B7A46` for active tabs, focus and links.
- [ ] Metric cards: label + value + drill-down; consistent badges for status, Requested/IT Priority, role.
- [ ] Public Comments, Internal Notes and Actions Taken visually distinct on Staff Ticket Detail.
- [ ] Editable vs read-only fields clearly different; validation messages under the field (text + icon).
- [ ] Follow-up state conveyed by text, not colour only.
- [ ] Actions Taken: table on desktop, cards on mobile, no horizontal page scroll.
- [ ] Conflict, forbidden, empty, no-results, loading and failure states present and consistent.
- [ ] Visible keyboard focus; panels/modals trap focus, close with Esc, and return focus.
- [ ] No clipping, overlap, hidden buttons or unreadable text at any breakpoint.
- [ ] No console errors, placeholder text, obsolete elements or broken links.

## 5. Test Commands
* Server unit + API + migration/regression + perf-smoke: `cd server && npm test`
* Client UI (Vitest): `cd client && npm test`
* E2E, responsive, accessibility (servers running, DB seeded): `npx playwright test e2e/lab-04` (repo root)
* Seed / migrate: `cd server && npx prisma migrate deploy && npx prisma db seed`

## 6. Final Results
_To be completed on the final `main` branch:_ paste the passing terminal output for server, client and Playwright, the MIG-03 rollback evidence, and change every **Pending** above to **Pass**.

## 7. Known Limitations or Deferred Tests
* Not tested (out of scope, spec §3): SLA clocks, notifications, billing, reporting/exports, multi-tenancy.
* Performance tests are smoke checks on the development machine, not load tests.
* Time-zone display is verified only for the browser's local zone; the API contract is UTC (BR-21).

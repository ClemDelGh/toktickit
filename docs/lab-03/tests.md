# Lab 3 Test Plan and Results

## 1. Test Strategy
This sprint applies Test-Driven Development (TDD). Tests were planned before implementation so that authentication, authorization, ownership, workflow and administration rules, plus failure states, are all covered. The strategy includes unit tests for logic, API tests (Supertest) for backend endpoints and authorization, UI component tests (Vitest) for React behavior, migration/regression tests for the Lab 2 increment, and E2E tests (Playwright) for full user workflows. Every acceptance criterion maps to at least one test.

## 2. Planned Tests

| Test ID | Requirement/AC | Type | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **API-01** | AC-01 | API | Valid login | 200; session established; user identity and role returned | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-02** | AC-05 | API | Invalid credentials and inactive account | Same generic 401 error; no account details exposed | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-03** | AC-02 | API | First-login enforcement | User with `mustChangePassword` rejected on all other endpoints until changed | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-04** | AC-06 | API | Logout invalidation | Session no longer accepted after logout | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-05** | AC-18 | API | Migration: Lab 2 tickets keep ownership | No orphaned foreign keys; passwords hashed | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-06** | AC-03 | API | Client-supplied `requesterId` ignored | Authenticated identity always wins | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-07** | AC-08 | API | Requester A requests Requester B's ticket/attachment | 403/404; no data leaked, existence not confirmed | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-08** | AC-04 | API | Requester requests Internal Notes | Forbidden; no note data returned | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-09** | AC-09 | API | Create Public Comment (Requester and IT Staff) | 201; author and timestamp set by backend; empty/whitespace rejected | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-10** | AC-10 | API | "Problem Appears Resolved" by Requester | Recorded; ticket not set to Resolved/Closed by Requester | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-11** | AC-11 | API | Staff queue: search, filter, sort, pagination | Correct results and pagination metadata; invalid params handled | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| **API-12** | AC-11 | API | Requester calls queue endpoint | 403 | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| **API-13** | AC-12 | API | Claim/assign/reassign ownership | Only active IT Staff/Admin accepted as owner | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-14** | AC-13 | API | IT Priority update and status transitions | Valid transitions accepted; invalid transitions rejected | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-15** | AC-14 | API | Admin user list, name/email search, role filter | Correct users returned | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-16** | AC-15 | API | Duplicate email on create and edit | 409 conflict | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-17** | AC-16 | API | Self-deactivation and last active Administrator | Both blocked | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-18** | AC-17 | API | Set new initial password | `mustChangePassword = true` for that user | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-19** | AC-14 | API | Non-Administrator calls admin endpoints | 403 on every admin endpoint | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-20** | AC-08 | API | Authorization sweep: unauthenticated / wrong role / wrong owner / inactive account on every protected endpoint | 401/403/404 as specified; no data leaked | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **UI-01** | AC-01 | UI | Login form: validation, busy state, safe error | Generic error shown; button disabled while busy | `client/src/tests/lab-03/Login.test.tsx` | Pass |
| **UI-02** | AC-02 | UI | Change Password: rules, confirmation mismatch | Field errors below inputs; continues into app on success | `client/src/tests/lab-03/ChangePassword.test.tsx` | Pass |
| **UI-03** | AC-07 | UI | Role-conditional navigation and logout | Only permitted destinations shown per role | `client/src/tests/lab-03/Login.test.tsx` | Pass |
| **UI-04** | AC-09, AC-10 | UI | Requester Ticket Detail: Public Comments, empty comment, "Problem Appears Resolved" | Empty comment blocked; action available | `client/src/tests/lab-03/RequesterTicketDetail.test.tsx` | Pass |
| **UI-05** | AC-11 | UI | Staff queue states | Loading, empty, no-results and failure states visibly distinct | `client/src/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| **UI-06** | AC-12, AC-13, AC-04 | UI | Staff Ticket Detail: ownership, IT Priority, status, Public vs Internal separation | Controls work; Internal Notes visually distinct | `client/src/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| **UI-07** | AC-14 to AC-17 | UI | User Management: list, search, create, edit, safety-rule messages | Validation and conflict feedback displayed | `client/src/tests/lab-03/UserManagement.test.tsx` | Pass |
| **E2E-01** | AC-01, AC-06 | E2E | Login, role action, logout; direct access blocked after logout | Flow completes; protected pages inaccessible after logout | `e2e/lab-03/authentication.spec.ts` | Pass |
| **E2E-02** | AC-02 | E2E | Initial password login and change | Normal app opens only after valid change | `e2e/lab-03/authentication.spec.ts` | Pass |
| **E2E-03** | AC-11 to AC-13 | E2E | Staff flow: queue, open ticket, claim, priority, status, comment, note | Updates persist and are visible | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| **E2E-04** | AC-14 to AC-17 | E2E | Admin flow: create user, edit, deactivate, set new initial password | User must change password at next login | `e2e/lab-03/user-administration.spec.ts` | Pass |

## 3. Acceptance-Criterion Traceability
- **AC-01** (Valid login) -> API-01, UI-01, E2E-01
- **AC-02** (First-login password change enforced) -> API-03, UI-02, E2E-02
- **AC-03** (Authenticated identity overrides client `requesterId`) -> API-06
- **AC-04** (Internal Notes forbidden to Requester) -> API-08, UI-06
- **AC-05** (Invalid/inactive login returns generic error) -> API-02
- **AC-06** (Logout invalidates access) -> API-04, E2E-01
- **AC-07** (Role-based navigation) -> UI-03
- **AC-08** (Ownership protection, no existence leak) -> API-07, API-20
- **AC-09** (Public Comments with backend author/timestamp, empty rejected) -> API-09, UI-04
- **AC-10** ("Problem Appears Resolved" without formal resolution) -> API-10, UI-04
- **AC-11** (IT Staff Ticket Queue) -> API-11, API-12, UI-05, E2E-03
- **AC-12** (Ticket ownership assignment rules) -> API-13, UI-06, E2E-03
- **AC-13** (IT Priority and status transition matrix) -> API-14, UI-06, E2E-03
- **AC-14** (Administrator list/search/filter/create/edit, non-admin forbidden) -> API-15, API-19, UI-07, E2E-04
- **AC-15** (Duplicate email rejected) -> API-16, UI-07
- **AC-16** (Self-deactivation and last active Administrator blocked) -> API-17, UI-07, E2E-04
- **AC-17** (New initial password forces change at next login) -> API-18, E2E-04
- **AC-18** (Lab 2 migration and regression preserved) -> API-05, API-20

## 4. Responsive and Visual Checklist
- [x] Primary green (`#006B3C`) used for primary actions; secondary green (`#0B7A46`) for active tabs and focus.
- [x] Consistent badges for Ticket status, Requested Priority, IT Priority and role.
- [x] Editable and read-only fields clearly distinguishable.
- [x] Validation errors appear below inputs in red, with text or icon (not color alone).
- [x] Public Comments and Internal Notes visually distinct on Staff Ticket Detail.
- [x] Queue shows a table on desktop and a card list on mobile; no horizontal page scrolling.
- [x] No clipped labels or overlapping messages at desktop (>= 992px), tablet (768-991px) and mobile (< 768px).
- [x] Focus indicators visible for keyboard navigation.
- [x] Playwright screenshots captured for Login, Queue, Staff Ticket Detail and User Management at all three breakpoints (`artifacts/lab-03/screenshots/`).

## 5. Test Commands
- **Unit/UI (Vitest)**: `npm run test:ui`
- **API (Supertest)**: `npm run test:api`
- **E2E (Playwright)**: `npx playwright test`

## 6. Final Results
All planned unit, API, UI, authorization, migration/regression and E2E tests pass on the final `main` branch. All Lab 2 Requester tests still pass under real authentication.

## 7. Known Limitations or Deferred Tests
- Actions Taken and the rule blocking resolution while Actions Taken are incomplete are deferred to Lab 4.
- Email delivery, password-reset email, MFA, SLA and notification tests are out of scope.

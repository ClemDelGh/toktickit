# Lab 2 Test Plan and Results

## 1. Test Strategy
This sprint employs Test-Driven Development (TDD). Tests are planned before implementation to ensure all business rules, acceptance criteria, and failure states are covered. The strategy includes Unit tests for logic, API tests for backend endpoints, UI component tests for React behavior, and E2E tests for full user workflows.

## 2. Planned Tests

| Test ID | Requirement/AC | Type | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **API-01** | AC-01 | API | Create valid ticket | 201; one saved Ticket; number returned | `server/tests/lab-02/create-ticket.api.test.ts` | TBD |
| **API-02** | AC-03 | API | Fetch tickets cross-requester | 403 or empty array; no unauthorized data | `server/tests/lab-02/my-tickets.api.test.ts` | TBD |
| **API-03** | BR-04 | API | Soft-remove attachment | 200; metadata kept, file not downloadable | `server/tests/lab-02/attachments.api.test.ts` | TBD |
| **UI-01** | FR-01 | UI | Render Dev Requester Selector | Shows active requesters dropdown | `client/src/tests/lab-02/RequesterSelector.test.tsx`| TBD |
| **UI-02** | AC-02 | UI | Submit ticket without Summary | Field error message; API not called | `client/src/tests/lab-02/CreateTicket.test.tsx` | TBD |
| **UI-03** | FR-03 | UI | Display My Tickets empty state | Meaningful empty state when no tickets | `client/src/tests/lab-02/MyTickets.test.tsx` | TBD |
| **E2E-01** | AC-01 | E2E | Complete ticket submission flow | Confirmation shows official number | `e2e/lab-02/requester-ticket-flow.spec.ts` | TBD |

## 3. Acceptance-Criterion Traceability
- **AC-01** (Ticket creation) -> API-01, E2E-01
- **AC-02** (No Dev Requester selected) -> UI-02 (and dedicated routing tests)
- **AC-03** (Ownership protection) -> API-02

## 4. Responsive and Visual Checklist
- [ ] Primary green (`#006B3C`) is used correctly for primary actions.
- [ ] No overlapping text or unreadable attachments on mobile (< 768px).
- [ ] Desktop (>= 992px) displays multi-column layout for Create Ticket.
- [ ] Validation errors appear below inputs in red.
- [ ] Playwright screenshots captured for desktop, tablet, and mobile.

## 5. Test Commands
- **Unit/UI (Vitest)**: `npm run test:ui`
- **API (Supertest)**: `npm run test:api`
- **E2E (Playwright)**: `npx playwright test`

## 6. Final Results
*To be filled after implementation.*

## 7. Known Limitations or Deferred Tests
- Authentication security tests are deferred to Lab 3.
- IT Staff assignment logic is deferred.

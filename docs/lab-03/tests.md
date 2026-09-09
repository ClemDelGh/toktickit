# Lab 3 Test Plan and Traceability

This document maps the Acceptance Criteria (AC) and functional requirements to the automated test suite, covering API, UI, authorization, regression, and End-to-End (E2E) testing.

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| API-01 | API | AC-01, FR-01 | Valid login attempt | Authenticated response; safe user data returned | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-02 | API | BR-01 | Invalid login credentials | 401 Unauthorized; generic error message | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-03 | API | AC-03 | Requester regression auth identity | Backend applies authenticated identity; ignores client requesterId | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-04 | API | AC-04, BR-04 | Requester accessing Internal Notes | 403 Forbidden; no note data returned | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-05 | API | FR-04 | IT Staff queue retrieval | Paginated queue data returned | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| API-06 | API | BR-09, FR-06 | IT Staff claiming ticket ownership | Ticket owner updated to valid IT Staff user | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-07 | API | BR-08 | Admin creates user with duplicate email | 409 Conflict; user not created | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-08 | API | AC-05, BR-06 | Admin self-deactivation | 400 Bad Request; operation rejected | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| UI-01 | UI | FR-01 | Login screen rendering & validation | Shows busy state and safe failure feedback | `client/tests/lab-03/Login.test.tsx` | Pass |
| UI-02 | UI | FR-02, BR-02 | Change Password validation | Password rules validated; successful continuation | `client/tests/lab-03/ChangePassword.test.tsx` | Pass |
| UI-03 | UI | FR-04 | Staff Ticket Queue UI rendering | Search, filters, sort, and pagination controls work | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| UI-04 | UI | FR-06 | Staff Ticket Detail UI | Public comments & internal notes visually distinct | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| UI-05 | UI | FR-07 | Admin User Management UI | Renders list, search, role filter, create/edit forms | `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| E2E-01 | E2E | AC-02, BR-02 | Initial password login & change | App shell blocked until valid password change is saved | `e2e/lab-03/authentication.spec.ts` | Pass |
| E2E-02 | E2E | FR-04, FR-06 | Full IT Staff ticket flow | Staff logs in, finds ticket in queue, updates status | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| E2E-03 | E2E | FR-07, BR-07 | Full Admin user flow | Admin logs in, creates user, verifies safety rules | `e2e/lab-03/user-administration.spec.ts` | Pass |

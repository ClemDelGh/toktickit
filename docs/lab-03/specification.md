# Lab 3 Engineering Specification

## 1. Sprint Goal
Lab 3 introduces secure authentication, role-based authorization (Requester, IT Staff, Administrator), and first-login password change logic. It replaces the temporary Lab 2 Requester selector with a real authenticated identity, provides an IT Staff Ticket Queue for managing workflow, and establishes minimalist user management for Administrators.

## 2. Stakeholder Request
The system needs real users with secure login, replacing the development selector. Administrators require a simple interface to manage basic user accounts (create, edit, set roles, set initial passwords). Users must change their initial password on first login. Requesters will continue their Lab 2 functions securely using their real identity. IT Staff need a Ticket Queue to find and manage tickets (claim, set priority, update status, add internal notes/public comments). All actions and data must be protected server-side by strict role-based authorization.

## 3. Scope
**Included:**
* Secure authentication, logout, and mandatory first-login password change.
* Server-side role-based authorization (Requester, IT Staff, Administrator).
* Migration of Lab 2 Development Requesters to the real User model.
* IT Staff Ticket Queue, Ticket Detail, ownership, IT Priority, Public Comments, Internal Notes, and workflow status.
* Minimalist Administrator user management (create, edit, one-role assign, activate/deactivate, set initial password).

**Explicitly Excluded:**
* Email invitations, password resets via email, MFA, SSO.
* Self-registration.
* Actions Taken by IT Staff (deferred to Lab 4).
* User deletion, bulk operations, advanced identity-management.
* Pagination for the Administrator user list.

## 4. Functional Requirements
* **FR-01:** The system shall provide a secure login screen requiring an email and password.
* **FR-02:** The system shall force users with an initial password to change it before accessing the application shell.
* **FR-03:** The system shall display navigation elements only for the authenticated user's assigned role.
* **FR-04:** The IT Staff shall be able to view a paginated, filterable, and sortable Ticket Queue.
* **FR-05:** Requesters shall be able to post Public Comments and mark a problem as "appears resolved".
* **FR-06:** IT Staff shall be able to post Public Comments and Internal Notes, assign Ticket Owners, and update Ticket status.
* **FR-07:** Administrators shall be able to manage users via a single screen (create, view, edit basic info, set one role, deactivate, set initial password).

## 5. Business Rules
* **BR-01:** Only an active user with valid credentials may authenticate.
* **BR-02:** A user marked as requiring a password change cannot enter the normal application until a new valid password is saved.
* **BR-03:** The authenticated user identity, not a requesterId supplied by the client, determines ownership of Requester operations.
* **BR-04:** Public Comments are visible to the Requester, IT Staff, and Administrator. Internal Notes are visible only to IT Staff and Administrator.
* **BR-05:** A Requester may indicate that the problem appears resolved, but cannot formally set the Ticket to Resolved or Closed.
* **BR-06:** An Administrator cannot deactivate their own account.
* **BR-07:** The system must prevent the deactivation of the last active Administrator.
* **BR-08:** Duplicate email addresses are not permitted when creating or updating users.
* **BR-09:** Ticket ownership can only be assigned to an active IT Staff or Administrator user.

## 6. UI Specification Summary
The UI continues to use the Zen Green design language. New screens include Login, Change Password, IT Staff Queue, IT Staff Ticket Detail (with comments/notes), and Admin User Management. Refer to `ui-spec.md` for detailed modes, controls, feedback states, and responsive rules.

## 7. Data Changes
* **User Model:** Migrate Lab 2 Development Requester data. Add fields: `email`, `passwordHash`, `role` (Requester, ITStaff, Administrator), `isActive` (boolean), `mustChangePassword` (boolean).
* **Ticket Model:** Add `ticketOwnerId` (FK to User), `itPriority` (enum), `status` (enum: New, Open, In Progress, Waiting for Requester, Resolved, Closed, Reopened, Cancelled).
* **PublicComment Model:** New table mapping to Ticket, containing authorId, content, createdAt.
* **InternalNote Model:** New table mapping to Ticket, containing authorId, content, createdAt.

## 8. API Contract
REST APIs will be secured using hashed passwords and HTTP-only cookies or secure tokens. Unauthenticated requests return 401. Unauthorized role/ownership access returns 403 (or 404 to prevent resource existence leaking). Refer to `api-spec.md` for exact endpoints.

## 9. Acceptance Criteria
* **AC-01:** Given an active user with valid credentials, when the user logs in, then the backend establishes authenticated access and returns the permitted user identity and role.
* **AC-02:** Given a user who must change the initial password, when login succeeds, then normal application screens remain unavailable until a valid new password is saved.
* **AC-03:** Given an authenticated Requester, when the client supplies another requesterId, then the backend still applies the authenticated identity and does not return another Requester's data.
* **AC-04:** Given a Requester account, when an Internal Note endpoint is requested, then the operation is rejected without exposing note content.
* **AC-05:** Given an Administrator, when they attempt to deactivate their own account, the system rejects the operation.

## 10. Definition of Done
Refer to the Product Completion checklist. The developper may report completion only when the approved contract and DoD are satisfied.

## 11. Assumptions and Decisions
* Authentication will use JWTs stored in secure HTTP-only cookies (or similar secure local lab approach).
* Initial passwords generated by Admins are communicated out-of-band (e.g., verbally or via separate non-system email) since email delivery is out of scope.

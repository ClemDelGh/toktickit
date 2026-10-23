# Lab 4 API Contract

## Authentication, Authorization & Hardening
* **Mechanism:** JWT stored in an HTTP-only, secure cookie (carried over from Lab 3).
* **Session Authority:** `requireAuth` loads the user from the database on every request to ensure immediate application of role changes or account deactivation.
* **Uniform Error Shape:** All API errors return a standard JSON structure: `{ "error": "<human message>", "code": "<CODE>", "fieldErrors"?: [{ "field": "<name>", "message": "<reason>" }] }`. 500 errors are generic and never leak stack traces or SQL.
* **Safe Errors:** Missing and foreign resources both return `404 NOT_FOUND` for Requesters to prevent existence leaking. Unauthenticated requests return `401`, and unauthorized roles return `403`.

## Endpoints

### 1. Actions Taken API
* `GET /api/tickets/:ticketId/actions` (Requester [owner only], IT Staff, Admin)
  * **Request:** Empty.
  * **Response:** `200 OK` with an array of Action records, ordered stably by `actionDateTime` ascending, then `id` ascending. `404 Not Found` for Requesters requesting another's ticket, `401` if unauthenticated.
* `POST /api/staff/tickets/:ticketId/actions` (IT Staff, Admin)
  * **Request:** `{ actionDateTime, description, result, followUpRequired, followUpNote?, attachmentNotes?, clientRequestId }`.
  * **Response:** `201 Created` with the new Action data (performer set by backend). `200 OK` if the exact `clientRequestId` and performer already exist (idempotent retry). `400 VALIDATION_ERROR` for bad data. `422 TICKET_LOCKED` if the Ticket is Closed or Cancelled.
* `PATCH /api/staff/tickets/:ticketId/actions/:actionId` (IT Staff, Admin)
  * **Request:** `{ expectedVersion, actionDateTime?, description?, result?, followUpRequired?, followUpNote?, attachmentNotes?, followUpCompleted? }`.
  * **Response:** `200 OK` on success (`version` increments). `409 STALE_UPDATE` if `expectedVersion` mismatches. `422 TICKET_LOCKED` if the Ticket is terminal.
* `DELETE /api/staff/tickets/:ticketId/actions/:actionId`
  * **Response:** `404 Not Found` (Actions are append-only; deletion is explicitly excluded).

### 2. Ticket Workflow API (Extended)
* `PATCH /api/staff/tickets/:id` (IT Staff, Admin)
  * **Request:** `{ expectedVersion, status?, itPriority?, ticketOwnerId?, resolutionSummary? }`.
  * **Response:** `200 OK` with updated ticket. `409 STALE_UPDATE` on version mismatch. `422 INVALID_TRANSITION` if the status change violates the matrix. `422 RESOLUTION_BLOCKED` with an array of blockers if gate conditions fail (missing owner, no actions, open follow-up, missing summary). `400 INVALID_OWNER` if assigning to an inactive user or Requester. `422 TICKET_LOCKED` if Closed/Cancelled.
* `GET /api/staff/tickets/:id` & `GET /api/tickets/:id`
  * **Response:** Extends Lab 3 by adding `version`, `resolutionSummary`, `resolvedAt`, `closedAt`, `requesterResolvedIndicatedAt`, and an `allowedTransitions` array (which is empty for Requesters).
* `PATCH /api/tickets/:id/resolve` (Requester [owner only])
  * **Request:** Empty.
  * **Response:** `200 OK` sets the `requesterResolvedIndicatedAt` advisory flag only; status remains unchanged. `422 INVALID_STATE` if the Ticket is already Resolved, Closed, or Cancelled.
* `GET /api/staff/tickets` & `GET /api/tickets`
  * **Query Params:** Validates `sortField`, `sortOrder`, `page`, `limit`, `status` (comma-separated), `owner`, `itPriority`, `indicated`.
  * **Response:** `200 OK` with `{data, meta}`. Rejects invalid parameters with `400 VALIDATION_ERROR`.

### 3. Dashboards API
* `GET /api/dashboard/requester` (Requester)
  * **Response:** `200 OK` returning `{ generatedAt, open, waitingForYou, resolved, closed, recentTickets[], attentionTickets[], recentlyResolved[] }` for the user's own tickets. `403` for non-Requesters.
* `GET /api/dashboard/staff` (IT Staff, Admin)
  * **Response:** `200 OK` returning `{ generatedAt, unassigned, myAssigned, byStatus:{...}, byItPriority:{...}, awaitingReview, myOpenFollowUps, myRecentTickets[], urgentTickets[], myRecentActions[], userCounts? }`. `userCounts` is included only for Administrators.

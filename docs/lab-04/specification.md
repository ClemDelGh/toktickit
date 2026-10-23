# Lab 4 Engineering Specification

## 1. Sprint Goal
Lab 4 completes the core TokTickIT service-desk workflow. IT Staff and Administrators record **Actions Taken** under each Ticket, the Ticket lifecycle is enforced by the backend through a documented **status-transition matrix and resolution gate**, Requesters and IT Staff get concise **role-appropriate dashboards** with drill-down into the detailed screens, and the whole application built in Labs 1–3 is hardened (security, concurrency, accessibility, regression) so it is ready for final demonstration.

## 2. Stakeholder Request (interpretation)
The desk can receive Tickets and staff can talk to Requesters, but the actual work is not tracked. Each Ticket needs a list of Actions Taken (date/time, description, result, who did it, whether follow-up is needed and why, and a note about which attachment to look at). The Ticket Owner still coordinates the whole Ticket, but other IT Staff may do and record work. A Requester may say "this looks resolved", but only IT Staff formally resolve the Ticket, and only after the work is properly recorded. Requesters and IT Staff get short dashboards that link into the detailed screens. Finally, everything from Labs 1–3 must keep working, look consistent (Zen Green) and be safe.

## 3. Scope
**Included**
* Actions Taken (create, list, edit, mark follow-up completed) on Ticket Detail; read-only for Requesters.
* Final Ticket status-transition matrix, resolution gate, close / cancel / reopen, and the **advisory** "Problem Appears Resolved" indicator.
* Optimistic-concurrency (stale-update) handling for Tickets and Actions Taken.
* Requester Dashboard, IT Staff Dashboard, Administrator Dashboard (staff dashboard + user counts), with drill-down.
* One Prisma migration (with backfill + documented rollback), richer idempotent seed.
* Final hardening: server-authoritative sessions, safe error handling, query-parameter validation, duplicate-submission protection, accessibility, responsive checks, regression of Labs 1–3, README.

**Explicitly excluded** (per handout 4.2): SLA clocks/escalation/on-call/breach notifications; email/SMS/LINE/push notifications; inventory, parts, purchasing, cost accounting; time-sheets/billing/payroll; multi-level approvals and e-signatures; BI tools, report builders, exports; multi-tenant/production cloud; any feature not listed in this document. Also excluded by decision: Action Taken deletion, a separate audit-log table, Requester-initiated status changes (see §11).

## 4. Functional Requirements
* **FR-01:** IT Staff and Administrators can create an Action Taken on any Ticket that is not Closed/Cancelled.
* **FR-02:** IT Staff and Administrators can edit an Action Taken; the original performer is never changed.
* **FR-03:** Ticket Detail shows all Actions Taken in a stable order (table on desktop, cards on mobile), with create mode and view/edit mode. Requesters see all Actions Taken of their own Tickets, read-only.
* **FR-04:** An Action with a required follow-up can be marked "follow-up completed".
* **FR-05:** The Ticket status control shows only the transitions permitted for the current status and role (list supplied by the backend).
* **FR-06:** Moving a Ticket to Resolved is blocked by a resolution gate; the UI lists exactly which conditions are missing.
* **FR-07:** A Requester can indicate "Problem Appears Resolved"; this is advisory, visible to staff, and never changes the status.
* **FR-08:** IT Staff/Admin can close, cancel and reopen Tickets according to the matrix; Closed and Cancelled are terminal.
* **FR-09:** Concurrent/stale updates to a Ticket or an Action are detected and rejected with a conflict message; entered data is kept.
* **FR-10:** Requesters get a dashboard limited to their own Tickets.
* **FR-11:** IT Staff get an operational dashboard (workload, priority, review queue, follow-ups, recent work).
* **FR-12:** Administrators get the IT Staff dashboard plus concise user-account counts.
* **FR-13:** Every dashboard card and list item links to the matching filtered list or Ticket Detail, and the destination total equals the card count.
* **FR-14:** Navigation is role-aware with a Dashboard entry for every role and a clear active-page indicator.
* **FR-15:** The API validates all query parameters, rejects bad input with 4xx (never 500), and returns a uniform JSON error shape.
* **FR-16:** Repeated clicks or network retries cannot create duplicate Actions Taken or duplicate Ticket numbers.
* **FR-17:** The application is polished: no console errors, placeholder/obsolete UI, or broken links; README is current.
* **FR-18:** The seed produces a deterministic dataset covering every status, priority, ownership state, and 0/1/many Actions Taken (§7.4).

## 5. Business Rules

### 5.1 Actions Taken
* **BR-01:** An Action Taken belongs to exactly one Ticket.
* **BR-02:** The Ticket Owner coordinates the Ticket, but an Action Taken may be performed by a different active IT Staff or Administrator user. Recording an action never changes the Ticket Owner.
* **BR-03:** `performedBy` is set by the backend from the authenticated session and is immutable. Any client-supplied performer is ignored.
* **BR-04:** Field rules (trimmed before validation):

| Field | Required | Rule |
|---|---|---|
| Action Date/Time | Yes | Valid ISO 8601; not more than 5 minutes in the future; not earlier than the Ticket's `createdAt`. Client pre-fills "now". |
| Action Description | Yes | 1–2000 characters |
| Result | Yes | 1–1000 characters |
| Performed by | Auto | Authenticated user |
| Follow-Up Required? | Yes | Boolean, default `false` |
| Follow-up Note | Only if follow-up required | 1–1000 characters when `followUpRequired = true`; stored as `null` when `false` |
| Attachment Notes | No | 0–500 characters; free text telling the reader which file to look for. It is **not** a file link. |

* **BR-05:** `followUpCompletedAt` can be set only when `followUpRequired = true`. Changing `followUpRequired` to `false` clears the note and completion time. An Action is **"open follow-up"** when `followUpRequired = true` and `followUpCompletedAt` is null.
* **BR-06:** Actions Taken are append-only: no delete endpoint or UI. Corrections are made by editing; every edit increments `version` and records `lastEditedBy` / `updatedAt`.
* **BR-07:** Actions are visible (all fields) to the owning Requester, IT Staff and Administrators. Only IT Staff and Administrators can create or edit. Private information belongs in Internal Notes, never in Actions Taken.
* **BR-08:** When a Ticket is Closed or Cancelled, Actions Taken cannot be created or edited and Ticket fields (owner, priority, status, resolution summary) cannot be changed. Public Comments and Internal Notes remain allowed.
* **BR-09:** Actions are listed by `actionDateTime` ascending, then `id` ascending (stable ordering).
* **BR-10:** Creating an Action requires a client-generated `clientRequestId`. A repeat of the same `(performer, clientRequestId)` returns the existing record (HTTP 200) and creates nothing new.

### 5.2 Ticket status and resolution
* **BR-11 (transition matrix).** Statuses: New, Open, In Progress, Waiting for Requester, Resolved, Closed, Reopened, Cancelled. Only IT Staff and Administrators perform transitions. Same-status is not a transition.

| From | Allowed To | Note |
|---|---|---|
| New | Open, In Progress, Waiting for Requester, Cancelled | |
| Open | In Progress, Waiting for Requester, Resolved†, Cancelled | |
| In Progress | Waiting for Requester, Resolved†, Cancelled | |
| Waiting for Requester | Open, In Progress, Resolved†, Cancelled | |
| Resolved | Closed, Reopened | |
| Reopened | In Progress, Waiting for Requester, Resolved†, Cancelled | |
| Closed | — | terminal |
| Cancelled | — | terminal |

† Subject to the resolution gate (BR-13). 21 of the 56 possible ordered pairs are allowed; all others are rejected with `INVALID_TRANSITION`.
* **BR-12:** A Requester can never change a Ticket's status, owner, IT Priority or resolution summary, through any endpoint.
* **BR-13 (resolution gate).** A transition to Resolved is accepted only if **all** hold: (G1) the Ticket has an Owner who is an active IT Staff/Administrator; (G2) at least one Action Taken exists; (G3) no Action has an open follow-up; (G4) a non-empty `resolutionSummary` (1–1000 chars) is supplied in the request or already stored. Otherwise the API answers `422 RESOLUTION_BLOCKED` listing every failed condition. The rule is enforced in the backend regardless of the client.
* **BR-14 (advisory indicator).** A Requester indication sets `requesterResolvedIndicatedAt` only; status is unchanged. Allowed only while the Ticket is in New/Open/In Progress/Waiting for Requester/Reopened; repeated calls are idempotent. **Any formal status change resets the indicator.**
* **BR-15:** `resolvedAt` is set on →Resolved and cleared on →Reopened; `closedAt` is set on →Closed.
* **BR-16 (optimistic concurrency).** Tickets and Actions carry an integer `version` (starts at 1). Every update request must send `expectedVersion`; a mismatch returns `409 STALE_UPDATE` with the current record and changes nothing; a successful update increments `version` by 1.
* **BR-17:** `itPriority` is copied from `requestedPriority` when a Ticket is created (and backfilled for legacy Tickets). Only IT Staff/Admin may change it. Values: Low, Medium, High.
* **BR-18:** A Ticket Owner can only be an active IT Staff or Administrator (Lab 3 BR-09 carried forward; invalid owner → `400 INVALID_OWNER`).
* **BR-24 (legacy data).** Existing Tickets without Actions Taken show "No actions recorded". Existing Resolved/Closed Tickets stay valid; the gate applies only to new transitions. Dashboards treat legacy records exactly like new ones.

### 5.3 Dashboards
* **BR-19:** Dashboard numbers are computed by the backend from the database at request time (no caching, no client-side counting) and return aggregates plus capped lists, never whole Ticket collections.
* **BR-20:** Status groups: **ACTIVE** = New, Open, In Progress, Waiting for Requester, Reopened. **TERMINAL** = Closed, Cancelled. Resolved is neither (awaiting closure).
* **BR-21:** "Recent" windows are rolling 7×24 h from the request instant. Timestamps are stored/returned in UTC (ISO 8601) and displayed in the browser's local time; there are no calendar-day boundaries.
* **BR-22:** Lists hold at most 5 items; counts are exact. Each card's drill-down destination returns a total equal to the card count.
* **BR-23:** The Administrator dashboard is the IT Staff dashboard plus `userCounts`.

**Requester dashboard** (`GET /api/dashboard/requester`, own Tickets only)

| Key | Label | Definition | Empty | Drill-down |
|---|---|---|---|---|
| `open` | Open | status ∈ ACTIVE | 0 | My Tickets `status=New,Open,InProgress,WaitingForRequester,Reopened` |
| `waitingForYou` | Waiting for You | status = WaitingForRequester | 0 | My Tickets `status=WaitingForRequester` |
| `resolved` | Resolved | status = Resolved | 0 | My Tickets `status=Resolved` |
| `closed` | Closed | status = Closed | 0 | My Tickets `status=Closed` |
| `recentTickets` | My Recent Tickets | 5 Tickets, `updatedAt` desc | `[]` + message | Ticket Detail; "View all" → My Tickets |
| `attentionTickets` | Needs Your Attention | ≤5 Tickets in WaitingForRequester, `updatedAt` asc | `[]` + message | Ticket Detail |
| `recentlyResolved` | Recently Resolved | ≤5 Tickets Resolved with `resolvedAt` ≥ now−7 d, `resolvedAt` desc | `[]` + message | Ticket Detail |

**IT Staff dashboard** (`GET /api/dashboard/staff`)

| Key | Label | Definition | Drill-down (Queue params) |
|---|---|---|---|
| `unassigned` | Unassigned | owner null AND ACTIVE | `owner=unassigned&status=ACTIVE-list` |
| `myAssigned` | My Assigned | owner = me AND ACTIVE | `owner=me&status=ACTIVE-list` |
| `byStatus` | New / Open / In Progress / Waiting for Requester (all 8 keys returned, zero-filled) | count per status | `status=<status>` |
| `byItPriority` | High / Medium / Low | ACTIVE Tickets per `itPriority` | `itPriority=<p>&status=ACTIVE-list` |
| `awaitingReview` | Requester Says Resolved | ACTIVE with `requesterResolvedIndicatedAt` not null | `indicated=true&status=ACTIVE-list` |
| `myOpenFollowUps` | My Open Follow-Ups | Actions performed by me with open follow-up on non-TERMINAL Tickets | none (see My Recent Actions) |
| `myRecentTickets` | My Recent Tickets | ≤5 owned by me, `updatedAt` desc | Ticket Detail |
| `urgentTickets` | Urgent Tickets | ≤5 ACTIVE with `itPriority = High`, `createdAt` asc | Ticket Detail |
| `myRecentActions` | My Recent Actions | ≤5 Actions performed by me, `actionDateTime` desc, description cut at 120 chars | Ticket Detail |
| `userCounts` (Admin only) | Users | `{active, inactive, byRole}` | User Management |

### 5.4 Hardening and regression
* **BR-25:** Query parameters are validated: `sortField` ∈ {ticketNumber, createdAt, updatedAt, status, requestedPriority, itPriority}; `sortOrder` ∈ {asc, desc}; `page` ≥ 1; `limit` 1–100 (default 10); `status` values must be valid statuses (comma list allowed); `owner` ∈ {me, unassigned, numeric id}; `itPriority` ∈ {Low, Medium, High}; `indicated` = true. Invalid values → `400 VALIDATION_ERROR`.
* **BR-26:** Every error is JSON `{ "error": "<human message>", "code": "<CODE>", "fieldErrors"?: [...] }`. 500s are generic; stack traces and SQL are never returned.
* **BR-27 (session authority).** `requireAuth` loads the user from the database on every request: a deactivated user is rejected (401) even with an unexpired cookie; role changes apply immediately; a user with `mustChangePassword = true` receives `403 PASSWORD_CHANGE_REQUIRED` everywhere except `GET /api/auth/me`, `POST /api/auth/change-password`, `POST /api/auth/logout`; after a successful password change a fresh cookie is issued.
* **BR-28:** For a Requester, a Ticket (or its actions/attachments/comments) that is not theirs and one that does not exist both return `404 NOT_FOUND` (no existence leak). Role-restricted routes return `403 FORBIDDEN`.
* **BR-29:** Ticket Numbers (`TKT-YYYY-NNNN`) stay unique and backend-generated; on a unique-constraint collision the backend retries (max 3) instead of failing.
* **BR-30 (regression).** All Lab 1–3 rules remain in force, notably: first-login password change; generic login error; Public Comments visible to all three roles, Internal Notes to IT Staff/Admin only; Requester cannot set Resolved/Closed; Admin cannot deactivate self or the last active Admin; unique email; attachment rules (JPG/PNG/WEBP/PDF, ≤5 MB, ≤5 active, soft removal, removed files not downloadable).

### 5.5 Authorization matrix

| Operation | Requester (owner) | Requester (not owner) | IT Staff | Administrator | Anonymous |
|---|---|---|---|---|---|
| List/view Actions Taken | ✓ read-only | 404 | ✓ | ✓ | 401 |
| Create / edit Action Taken | 403 | 403 | ✓ | ✓ | 401 |
| Change status / owner / IT Priority / resolution summary | 403 | 403 | ✓ | ✓ | 401 |
| "Problem Appears Resolved" (advisory) | ✓ | 404 | 403 | 403 | 401 |
| Public Comment (create/read) | ✓ | 404 | ✓ | ✓ | 401 |
| Internal Notes (create/read) | 403 | 403 | ✓ | ✓ | 401 |
| Requester dashboard | ✓ | — | 403 | 403 | 401 |
| IT Staff dashboard | 403 | 403 | ✓ | ✓ (+ userCounts) | 401 |
| Staff queue / staff Ticket Detail | 403 | 403 | ✓ | ✓ | 401 |
| User Management | 403 | 403 | 403 | ✓ | 401 |

## 6. UI Specification Summary
Zen Green tokens and component conventions from Labs 2–3 are reused unchanged; full detail goes in `ui-spec.md`.
* **Application shell:** tabs per role with `aria-current="page"` and a visible active indicator. Requester: Dashboard · Create Ticket · My Tickets. IT Staff: Dashboard · Queue. Administrator: Dashboard · Queue · Users. Landing page after login = Dashboard. Leftover/obsolete UI (Lab 1 Check-System page, Lab 2 selector remnants, TODO comments/text) is removed.
* **Metric cards:** label, large value, and an accessible drill-down (a real `<button>`/link whose name includes label and value, e.g. "Waiting for You, 2 tickets, view all"). Zero is shown as `0`, never blank.
* **Requester Dashboard:** 4 cards; lists "My Recent Tickets", "Needs Your Attention", "Recently Resolved"; Quick Actions (Create Ticket, My Tickets); Refresh.
* **IT Staff Dashboard:** cards Unassigned, My Assigned, New, Open, In Progress, Waiting for Requester, Requester Says Resolved, High/Medium/Low breakdown, My Open Follow-Ups; lists My Recent Tickets, Urgent Tickets, My Recent Actions; Administrators additionally see a Users card.
* **Staff Ticket Detail:** existing tabs plus **Actions Taken** (table ≥ 992 px, cards below). **Create mode** = side panel/inline form; **view/edit mode** = row expands to the same form pre-filled. Follow-up shown as a text badge ("Follow-up open" / "Follow-up done"), never colour only. Status control lists only `allowedTransitions`. Choosing Resolved reveals the Resolution Summary field and, on `RESOLUTION_BLOCKED`, a checklist of missing conditions. A callout "Requester indicates this is resolved (date)" appears when the advisory flag is set. Closed/Cancelled Tickets render read-only with an explanation.
* **Requester Ticket Detail:** read-only Actions Taken list; "Problem Appears Resolved" button turns into a confirmation text after use; status badge never changes because of it.
* **Feedback states for every new screen/form:** loading (skeleton/spinner with accessible text), empty, no-results, validation (message under field, text + icon), success, forbidden, not-found, conflict (banner with Reload, form values kept), safe API failure (generic message + Retry).
* **Responsive and accessibility:** same as Labs 2 and 3 — Desktop ≥ 992 px, Tablet 768–991 px, Mobile < 768 px; no clipping, overlap, or horizontal page scroll; visible focus; keyboard-operable modals/panels with focus trap and Escape; labels for every control; icon-only controls have accessible names; status/priority never conveyed by colour alone.

## 7. Data Changes

### 7.1 Prisma models
```prisma
model ActionTaken {
  id                  Int       @id @default(autoincrement())
  ticketId            Int
  ticket              Ticket    @relation(fields: [ticketId], references: [id])
  actionDateTime      DateTime
  description         String
  result              String
  performedById       Int
  performedBy         User      @relation("ActionPerformedBy", fields: [performedById], references: [id])
  followUpRequired    Boolean   @default(false)
  followUpNote        String?
  followUpCompletedAt DateTime?
  attachmentNotes     String?
  clientRequestId     String
  version             Int       @default(1)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  lastEditedById      Int?
  lastEditedBy        User?     @relation("ActionEditedBy", fields: [lastEditedById], references: [id])

  @@unique([performedById, clientRequestId])
  @@index([ticketId, actionDateTime, id])
  @@index([performedById, followUpRequired, followUpCompletedAt])
}
```
`Ticket` gains: `version Int @default(1)`, `resolutionSummary String?`, `resolvedAt DateTime?`, `closedAt DateTime?`, `requesterResolvedIndicatedAt DateTime?`, `actionsTaken ActionTaken[]`, plus indexes `@@index([status, updatedAt])`, `@@index([ticketOwnerId, status])`, `@@index([requesterId, status])` (dashboard and queue filters). `User` gains the two `ActionTaken` back-relations.

### 7.2 Migration and backfill
One migration only (`lab4_actions_taken_workflow`) so parallel feature branches never conflict on schema. Backfill inside the migration, no data deleted:
* `itPriority = requestedPriority` where `itPriority IS NULL`;
* `resolvedAt = updatedAt` for Tickets already `Resolved`; `closedAt = updatedAt` for `Closed` (Lab 3's Requester action could set Resolved directly, so legacy Resolved Tickets exist and stay valid, BR-24);
* `version = 1` (column default); `requesterResolvedIndicatedAt` stays null.

### 7.3 Rollback / recovery
Prisma has no down-migrations, so the documented procedure is: (1) `pg_dump` before `migrate deploy`; (2) scripted rollback `server/prisma/rollback/lab4_down.sql` (drops `ActionTaken`, the new `Ticket` columns and indexes); (3) a scratch-database rehearsal of both steps is part of the test plan (MIG-03). Restoring the dump is the fallback.

### 7.4 Seed (idempotent, deterministic)
Keeps Lab 3 users/categories/systems and the two Lab 3 Tickets. Adds 16 Tickets with fixed numbers `TKT-2026-9001…9016` (upsert by `ticketNumber`; Actions upserted by `(performedById, clientRequestId = "seed-<ticket>-<n>")`; comments/notes only created when the Ticket has none).

| Ticket | Requester | Status | Req/IT Priority | Owner | Actions | Special |
|---|---|---|---|---|---|---|
| 9001 | Jennifer | New | High/High | — | 0 | |
| 9002 | Jennifer | Open | Medium/Medium | it1 | 1 | |
| 9003 | Jennifer | In Progress | High/High | it1 | 3 | one open follow-up performed by it2; public comment + internal note |
| 9004 | Jennifer | Waiting for Requester | Medium/Medium | it2 | 2 | |
| 9005 | Jennifer | Resolved | Low/Low | it1 | 2 | `resolvedAt` = now−2 d, summary |
| 9006 | Jennifer | Closed | Low/Low | it2 | 1 | `resolvedAt` now−21 d, `closedAt` now−20 d |
| 9007 | Michael | New | Medium/Medium | — | 0 | |
| 9008 | Michael | Open | High/High | it3 | 1 | `requesterResolvedIndicatedAt` set; internal note |
| 9009 | Michael | In Progress | Medium/Low | it2 | 2 | one action by it1 (not owner) |
| 9010 | Michael | Reopened | Medium/Medium | it1 | 2 | |
| 9011 | Michael | Cancelled | Low/Low | it3 | 0 | |
| 9012 | Sarah | Open | Low/Low | — | 0 | open but unassigned |
| 9013 | Sarah | Resolved | Medium/Medium | it3 | 1 | `resolvedAt` now−10 d (outside 7-day window) |
| 9014 | Sarah | Waiting for Requester | High/High | it1 | 1 | follow-up completed |
| 9015 | Sarah | In Progress | Medium/Medium | it2 | 4 | one open follow-up performed by it1 |
| 9016 | Sarah | Closed | Medium/Medium | it1 | 2 | |

David Lee has **no** Tickets (zero-state Requester dashboard); the Administrator owns none (zero "My Assigned"). Relative dates are computed from the seed-run time.

## 8. API Contract
Auth is the existing JWT in the httpOnly `auth_token` cookie. Paths keep the Lab 3 conventions (`/api/tickets*` for Requester/shared, `/api/staff/*` for IT Staff/Admin). Full examples go in `api-spec.md`; this section is the binding summary.

**Error shape:** `{ "error": string, "code": string, "fieldErrors"?: [{ "field": string, "message": string }] }`

| Status | Codes |
|---|---|
| 400 | `VALIDATION_ERROR`, `INVALID_OWNER` |
| 401 | `UNAUTHENTICATED` |
| 403 | `FORBIDDEN`, `PASSWORD_CHANGE_REQUIRED` |
| 404 | `NOT_FOUND` |
| 409 | `STALE_UPDATE` (body includes `current`) |
| 422 | `INVALID_TRANSITION`, `RESOLUTION_BLOCKED` (body includes `blockers`), `TICKET_LOCKED`, `INVALID_STATE` |
| 500 | `INTERNAL_ERROR` (generic) |

### 8.1 Actions Taken
| Endpoint | Roles | Notes |
|---|---|---|
| `GET /api/tickets/:ticketId/actions` | owner Requester, IT Staff, Admin | `200 { data: [Action] }`, ordered per BR-09. Others → 404 (Requester) / 401. |
| `POST /api/staff/tickets/:ticketId/actions` | IT Staff, Admin | `201` new; `200` replay of same `clientRequestId`; `400` validation; `404`; `422 TICKET_LOCKED`. |
| `PATCH /api/staff/tickets/:ticketId/actions/:actionId` | IT Staff, Admin | `200`; `400`; `404`; `409 STALE_UPDATE`; `422 TICKET_LOCKED`. |
| `DELETE …/actions/:actionId` | — | Not provided (404). |

Create body: `{ actionDateTime, description, result, followUpRequired, followUpNote?, attachmentNotes?, clientRequestId }`.
Patch body: `{ expectedVersion, actionDateTime?, description?, result?, followUpRequired?, followUpNote?, attachmentNotes?, followUpCompleted? }`.
Action: `{ id, ticketId, actionDateTime, description, result, performedBy:{id,name}, followUpRequired, followUpNote, followUpCompletedAt, attachmentNotes, version, createdAt, updatedAt, lastEditedBy:{id,name}|null }`.

### 8.2 Ticket workflow
| Endpoint | Roles | Notes |
|---|---|---|
| `PATCH /api/staff/tickets/:id` (extended) | IT Staff, Admin | Body `{ expectedVersion, status?, itPriority?, ticketOwnerId?, resolutionSummary? }`. `200` updated Ticket (`version`+1); `400` validation/`INVALID_OWNER`; `404`; `409 STALE_UPDATE`; `422 INVALID_TRANSITION | RESOLUTION_BLOCKED | TICKET_LOCKED`. |
| `GET /api/staff/tickets/:id`, `GET /api/tickets/:id` (extended) | per matrix | Add `version`, `resolutionSummary`, `resolvedAt`, `closedAt`, `requesterResolvedIndicatedAt`, `allowedTransitions: string[]` (empty for Requesters). |
| `PATCH /api/tickets/:id/resolve` (**behaviour changed**) | owner Requester | Sets `requesterResolvedIndicatedAt` only; status unchanged; `200` Ticket; `404`; `403` for staff; `422 INVALID_STATE` for Resolved/Closed/Cancelled. |
| `GET /api/tickets` (extended) | Requester | Optional `status` (comma list) filter, still returns an array of own Tickets. |
| `GET /api/staff/tickets` (extended) | IT Staff, Admin | Adds `owner`, `itPriority`, `indicated`, multi-value `status`; BR-25 validation; response shape `{data, meta}` unchanged. |

### 8.3 Dashboards
* `GET /api/dashboard/requester` → `200 { generatedAt, open, waitingForYou, resolved, closed, recentTickets[], attentionTickets[], recentlyResolved[] }`. Ticket items: `{ id, ticketNumber, summary, status, updatedAt, resolvedAt? }`. `403` for non-Requesters.
* `GET /api/dashboard/staff` → `200 { generatedAt, unassigned, myAssigned, byStatus:{…8 keys}, byItPriority:{High,Medium,Low}, awaitingReview, myOpenFollowUps, myRecentTickets[], urgentTickets[], myRecentActions[], userCounts? }`. `403` for Requesters. `userCounts` only for Administrators.
* No endpoint returns full Ticket collections. Failures return the uniform 500 body.

### 8.4 Carried-over endpoints
All Lab 1–3 endpoints (auth, categories, related systems, create ticket, comments, internal notes, attachments, admin users) keep their paths and behaviour, subject to BR-26/27/28.

## 9. Acceptance Criteria
* **AC-01:** Given an IT Staff or Administrator user and valid data, when an Action Taken is created, then it is saved under the correct Ticket with the authenticated user as performer (a client-supplied performer is ignored).
* **AC-02:** Given invalid data (blank description/result, over-length fields, bad/future/pre-creation date, follow-up required without a note), when an Action is submitted, then the API returns 400 with field-level errors and saves nothing; when follow-up is not required the note is stored as null.
* **AC-03:** Given a Ticket owned by IT Staff A, when IT Staff B records an Action, then it is saved with B as performer and the Ticket Owner is unchanged.
* **AC-04:** Given an existing Action, when an edit is sent with the current `expectedVersion`, then it is saved, `version` increases, `lastEditedBy` is recorded and the performer is unchanged; when the version is stale, then the API returns 409 and nothing is overwritten.
* **AC-05:** Given a Requester, when they read Actions of their own Ticket they see all of them read-only; creating or editing is forbidden; Actions of another Requester's Ticket are not revealed (404).
* **AC-06:** Given Actions with equal timestamps, when listed, then the order is stable (`actionDateTime`, then `id`), and no delete operation exists.
* **AC-07:** Given the same `clientRequestId` submitted twice (double click or retry), when processed, then exactly one Action exists and the second response returns the same record.
* **AC-08:** Given a Closed or Cancelled Ticket, when an Action is created/edited or a Ticket field is changed, then the API returns 422 `TICKET_LOCKED`.
* **AC-09:** Given an Action with a required follow-up, when marked completed, then `followUpCompletedAt` is set; marking an Action that requires no follow-up is rejected.
* **AC-10:** Given a Ticket and a requested status change, when processed, then only transitions in the matrix are accepted (all others 422 `INVALID_TRANSITION`, Ticket unchanged), and Ticket Detail exposes the permitted list (empty for Requesters).
* **AC-11:** Given a request to set Resolved, when the Ticket lacks an owner, any Action, a resolution summary, or has an open follow-up, then the API returns 422 `RESOLUTION_BLOCKED` listing all failed conditions even for direct API calls; when all hold, the Ticket becomes Resolved with `resolvedAt` set.
* **AC-12:** Given an authenticated Requester who owns a Ticket, when they use "Problem Appears Resolved", then only the advisory indicator is set (idempotently), the status is unchanged, staff can see it, and a Requester cannot change status by any other route.
* **AC-13:** Given a Resolved Ticket, when closed, then `closedAt` is set; when reopened, `resolvedAt` and the indicator are cleared; Cancelled/Closed Tickets accept no further status changes; any formal status change resets the indicator.
* **AC-14:** Given two users editing the same Ticket, when the second saves with a stale `expectedVersion`, then the API returns 409 `STALE_UPDATE`, nothing is overwritten, and the UI shows a conflict message while keeping the entered data.
* **AC-15:** Given an owner assignment, when the assignee is inactive or a Requester, then it is rejected with `INVALID_OWNER`; given a new Ticket, `itPriority` equals `requestedPriority`, and only staff can change it.
* **AC-16:** Given an authenticated Requester, when dashboard data is retrieved, then only metrics and Tickets owned by that Requester are returned, with counts equal to direct database queries and lists capped, correctly ordered and window-limited (BR-21/22).
* **AC-17:** Given a Requester with no Tickets, when the dashboard loads, then all counts are 0, lists are empty arrays, and the UI shows an empty-state message with a Create Ticket action.
* **AC-18:** Given an IT Staff user, when the staff dashboard is retrieved, then every metric equals the corresponding database query and lists respect their caps and orderings; a staff user who owns nothing sees zeros and empty lists.
* **AC-19:** Given the dashboard endpoints, when called by the wrong role or anonymously, then they return 403/401; `userCounts` appears only for Administrators.
* **AC-20:** Given a dashboard card or list item, when activated, then the user lands on the filtered My Tickets / Queue view or Ticket Detail, and the destination total equals the card count.
* **AC-21:** Given a dashboard load, then loading, empty, forbidden and safe-failure states are shown (generic message + Retry, no internals).
* **AC-22:** Given the Lab 3 database, when the Lab 4 migration runs, then no data is lost, `itPriority`/`resolvedAt`/`closedAt` are backfilled, legacy Tickets show "No actions recorded", and the documented rollback was rehearsed successfully.
* **AC-23:** Given Labs 1–3 behaviour, when the Lab 4 build is tested, then all earlier suites still pass and every protected route enforces unauthenticated / wrong-role / wrong-owner / inactive-account rules.
* **AC-24:** Given invalid query parameters, a deactivated or role-changed user with an old cookie, a user who must change password, or a missing/foreign resource, then the API answers with the specified 4xx (never 500), keeps the uniform error shape, leaks nothing, and treats foreign and missing resources identically for Requesters.
* **AC-25:** Given repeated clicks or retries on Ticket creation or Action creation, then no duplicate Actions are created, no 500 occurs on Ticket-number collisions, and submit buttons are disabled while a request is pending.
* **AC-26:** Given a recoverable failure (validation, conflict, network), when the user stays on a form, then the entered values are preserved.
* **AC-27:** Given the new/changed screens at Desktop (≥ 992 px), Tablet (768–991 px) and Mobile (< 768 px), then there is no clipping, overlap or horizontal page scroll.
* **AC-28:** Given keyboard-only use and an automated scan, then all new controls are operable and labelled, focus is visible, status/priority never depend on colour alone, and no serious/critical accessibility violation is reported on the main screens.
* **AC-29:** Given the final build, then navigation matches each role, the active page is indicated, there are no console errors, placeholder text or obsolete UI, and the README setup/seed/migration/test/demo steps work.
* **AC-30:** Given ≥ 500 Tickets, then both dashboards and a Queue page respond in under 1 s on the development machine.

## 10. Definition of Done (Product)
- [ ] All approved scope (FR-01…FR-18) implemented; nothing outside this contract added.
- [ ] Every Acceptance Criterion (AC-01…AC-30) maps to at least one test in `tests.md`, and all those tests pass from the documented commands on the final `main` branch.
- [ ] No test is skipped, disabled, flaky or commented out; Lab 1–3 suites still pass.
- [ ] Migration applied to a copy of the Lab 3 database; backfill verified; rollback rehearsed and documented.
- [ ] Seed is idempotent (run twice, same counts) and produces the §7.4 dataset.
- [ ] Transition matrix and resolution gate enforced in the backend and verified by direct API calls.
- [ ] Dashboard numbers verified against independent database queries.
- [ ] Authorization matrix (§5.5) verified by an automated sweep of every protected route.
- [ ] Desktop/tablet/mobile screenshots stored in `artifacts/lab-04/screenshots/`; visual and accessibility checklists completed; no horizontal scroll.
- [ ] No console errors, broken links, placeholder text or unfinished controls in a full manual tour of each role.
- [ ] README (setup, `JWT_SECRET`, migrate, seed, test, demo accounts) and `.env.example` current.
- [ ] `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md` approved and committed **before** the implementation PRs; `reviewer.md`, `ai-use.md` completed.
- [ ] Every Issue on the Kanban is Done; all PRs peer-reviewed into `lab4-staging`; single release PR `lab4-staging → main` merged.

## 11. Assumptions and Decisions
* **D-01 (handout inconsistency).** The stakeholder text defines Actions Taken with seven fields and no assignee/status, while the Part 6 rubric mentions "assign, complete, cancel, inactive-assignee rejection" and AC-01 mentions an "approved assignee". Decision: follow the stakeholder fields; map the rubric terms as — *assign* / *inactive-assignee rejection* → Ticket Owner assignment (BR-18, AC-15); *complete* → marking follow-up completed (BR-05) and resolving the Ticket (BR-13); *cancel* → cancelling the Ticket (BR-11). To be confirmed with the teaching staff; if an Action-level assignee is requested later it is an additive column.
* **D-02 (DB: concurrency).** Integer `version` columns instead of comparing `updatedAt`: deterministic, not affected by clock/precision, and `updatedAt` also changes on unrelated writes. Pessimistic locks were rejected (long-held locks for form editing).
* **D-03 (DB: follow-up state).** `followUpCompletedAt` (nullable timestamp) instead of a boolean or a status enum: one column gives both the state and the completion time, and "open follow-up" is a simple indexed predicate used by the gate and the dashboard.
* **D-04 (DB: idempotency).** `clientRequestId` with a unique `(performedById, clientRequestId)` index makes retries safe at the database level, not just in the UI.
* **D-05 (DB: indexes).** Composite indexes follow the dashboard/queue predicates (`status+updatedAt`, `ownerId+status`, `requesterId+status`, and the follow-up index) so aggregates stay fast with ≥ 500 Tickets (AC-30).
* **D-06:** Actions are append-only (no delete) but editable, because the stakeholder asked for update behaviour while auditability matters; `lastEditedBy`/`updatedAt`/`version` give a minimal trace. A full audit/event-log table is out of scope.
* **D-07:** Requesters never change status. "Request reopening/cancellation" is done through a Public Comment; staff perform the transition. This keeps the gate and matrix a single backend authority.
* **D-08:** Closed and Cancelled are terminal; Reopened is reachable only from Resolved.
* **D-09:** The resolution gate also requires an owner and a resolution summary (the summary is the Requester-visible conclusion shown in the Ticket header since Lab 1).
* **D-10:** Rolling 7-day UTC windows avoid time-zone ambiguity (users are in Bangkok, the server may not be).
* **D-11:** `requireAuth` hits the database each request (one indexed lookup) to close the "deactivated user keeps a 24 h cookie" gap and make role changes immediate. Existing Lab 2/3 tests that forge tokens with arbitrary ids must use real seeded users (shared test helper).
* **D-12:** Foreign and missing Tickets both return 404 to Requesters (replaces the Lab 3 mix of 403/404); affected Lab 2/3 assertions are updated.
* **D-13:** Actions Taken are fully visible to the owning Requester (handout 8.3); staff must keep sensitive details in Internal Notes. Attachment Notes are text only.
* **D-14:** Administrators have all IT Staff behaviour, and the shell gives them Queue access in addition to User Management.
* **D-15:** Seeded accounts keep `mustChangePassword = true`; E2E tests reuse the Lab 3 first-login flow. API tests create tokens for real seeded users through a helper, never with hard-coded ids.

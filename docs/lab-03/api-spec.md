# Lab 3 API Contract

## Authentication & Authorization
* **Mechanism:** JWT stored in an HTTP-only, secure cookie (or standard session). 
* **Safe Errors:** Unauthorized access returns `401 Unauthorized`. Forbidden role access returns `403 Forbidden` (or `404 Not Found` to prevent leaking resource existence). Invalid credentials return a generic `401` message.

## Endpoints

### 1. Auth API
* `POST /api/auth/login`
  * **Request:** `{ email, password }`
  * **Response:** `200 OK` with user data (id, name, role, mustChangePassword), or `401`.
* `POST /api/auth/logout`
  * **Request:** Empty
  * **Response:** `200 OK` (clears cookie/session).
* `GET /api/auth/me`
  * **Request:** Empty
  * **Response:** `200 OK` with current user data, or `401`.
* `POST /api/auth/change-password`
  * **Request:** `{ currentPassword, newPassword }`
  * **Response:** `200 OK` on success, `400 Bad Request` if rules fail, `401` if current password invalid.

### 2. IT Staff & Requester Tickets API
* `GET /api/tickets` (IT Staff only)
  * **Query Params:** `search`, `status`, `page`, `limit`, `sortBy`, `sortOrder`.
  * **Response:** `200 OK` with paginated ticket list and metadata. `403` for Requesters.
* `GET /api/tickets/:id` 
  * **Response:** `200 OK` with ticket details. `403/404` if Requester does not own the ticket.
* `PATCH /api/tickets/:id` (IT Staff / Admin)
  * **Request:** `{ ticketOwnerId, itPriority, status }`
  * **Response:** `200 OK` with updated ticket, `400` for invalid status transition.

### 3. Comments & Notes API
* `POST /api/tickets/:id/comments` (All roles)
  * **Request:** `{ content }` (Whitespace rejected).
  * **Response:** `201 Created` with comment data (author and timestamp set by server).
* `POST /api/tickets/:id/notes` (IT Staff / Admin only)
  * **Request:** `{ content }`
  * **Response:** `201 Created`. `403` for Requesters.

### 4. Admin User Management API (Admin only)
* `GET /api/users`
  * **Query Params:** `search` (name/email), `role`.
  * **Response:** `200 OK` with user list (no pagination required).
* `POST /api/users`
  * **Request:** `{ name, email, role, isActive, initialPassword }`
  * **Response:** `201 Created`, or `409 Conflict` if email duplicates.
* `PATCH /api/users/:id`
  * **Request:** `{ name, email, role, isActive }`
  * **Response:** `200 OK`, `400` if deactivating last Admin or self.
* `POST /api/users/:id/reset-password`
  * **Request:** `{ newInitialPassword }`
  * **Response:** `200 OK` (automatically sets `mustChangePassword = true`).

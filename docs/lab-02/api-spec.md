# Lab 2 API Specification

## Global API Behavior
- Authentication: Lab 2 does not use real authentication. All endpoints requiring requester context must include an `X-Requester-Id` HTTP header.
- Error Responses: All errors return a JSON object containing an "error" property with a descriptive message.

## 1. Reference Data Endpoints

### 1.1 Get Active Development Requesters
- GET /api/development-requesters
- Purpose: Retrieve active requesters for the Lab 2 selection screen.
- Success (200 OK): Returns an array of requester objects (id, name, email).

### 1.2 Get Related Systems
- GET /api/related-systems
- Purpose: Retrieve active related systems for the ticket creation form.
- Success (200 OK): Returns an array of system objects (id, name).

*(Note: GET /api/categories is already implemented in Lab 1)*

## 2. Ticket Endpoints

### 2.1 Create Ticket
- POST /api/tickets
- Headers: `X-Requester-Id: <id>`
- Request Body Properties: categoryId (number), relatedSystemId (number), summary (string), description (string), requestedPriority (string).
- Success (201 Created): Returns the created ticket including the generated ticketNumber (e.g., TKT-2026-001).
- Failures:
  - 400 Bad Request: Missing required fields or invalid data.
  - 403 Forbidden: Missing or invalid X-Requester-Id.

### 2.2 Get My Tickets (List)
- GET /api/tickets
- Headers: `X-Requester-Id: <id>`
- Query Parameters: 
  - page (default: 1)
  - limit (default: 10)
  - search (optional string for ticketNumber or summary)
  - status (optional filter)
- Success (200 OK): Returns a "data" array of tickets and a "meta" object containing pagination details (total, page, totalPages).
- Failures: 
  - 403 Forbidden: Missing X-Requester-Id.

### 2.3 Get Ticket Details
- GET /api/tickets/:id
- Headers: `X-Requester-Id: <id>`
- Purpose: View full details and attachment metadata for a specific ticket.
- Success (200 OK): Returns the full Ticket object.
- Failures:
  - 403 Forbidden: If the ticket belongs to a different requester.
  - 404 Not Found: Ticket does not exist.

## 3. Attachment Endpoints

### 3.1 Upload Attachment
- POST /api/tickets/:id/attachments
- Headers: `X-Requester-Id: <id>`
- Content-Type: multipart/form-data
- Payload: "file" (Max 5MB, JPG/PNG/WEBP/PDF).
- Success (201 Created): Returns saved attachment metadata.
- Failures:
  - 400 Bad Request: File too large or unsupported type.
  - 403 Forbidden: Ticket not owned by requester.
  - 409 Conflict: Limit of 5 active attachments reached.

### 3.2 Download Attachment
- GET /api/attachments/:attachmentId/download
- Headers: `X-Requester-Id: <id>`
- Success (200 OK): File stream.
- Failures:
  - 403 Forbidden: Cross-requester access attempted.
  - 404 Not Found: File missing or marked as soft-removed.

### 3.3 Soft-Remove Attachment
- DELETE /api/attachments/:attachmentId
- Headers: `X-Requester-Id: <id>`
- Request Body: reason (string)
- Success (200 OK): Returns updated attachment metadata (marked as removed).
- Failures: 
  - 403 Forbidden: Requester is not the owner of the ticket.

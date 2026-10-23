# Lab 4 UI Specification

## General Design Language
* **Theme:** Zen Green components from Labs 2 and 3 must be reused unchanged (cards, badges, buttons, form conventions).
* **Application Shell:** Top navigation is role-aware with a clear active-page indicator (`aria-current="page"`). Landing page after login is always the Dashboard. Leftover Lab 1/Lab 2 UI or placeholder texts must be removed.
* **Responsive Rules:** Must adapt seamlessly to Desktop (>= 992px), Tablet (768-991px), and Mobile (< 768px) breakpoints without clipping, overlap, or horizontal page scrolling.

## Screens

### 1. Dashboards
* **Metric Cards:** Display a label and a large value. Zero is explicitly shown as `0` (never blank). Each card must act as an accessible drill-down link/button (e.g., "Waiting for You, 2 tickets, view all") leading to a filtered list where the destination total matches the card count.
* **Requester Dashboard:** Displays 4 metric cards (Open, Waiting for You, Resolved, Closed) and lists for "My Recent Tickets", "Needs Your Attention", and "Recently Resolved". Includes Quick Actions (Create Ticket, My Tickets). Empty state: 0 counts and a message guiding the user to create a ticket.
* **IT Staff / Admin Dashboard:** Displays metric cards for workload (Unassigned, My Assigned), status breakdowns, priority breakdowns, "Requester Says Resolved", and "My Open Follow-Ups". Lists include "My Recent Tickets", "Urgent Tickets", and "My Recent Actions" (descriptions truncated at 120 chars). Admin view adds a Users metric card.

### 2. Ticket Detail (Requester & IT Staff)
* **Actions Taken Section:** New tab/section showing all recorded actions. Displays as a table on Desktop (>= 992px) and as cards on Mobile/Tablet.
* **Requester View:** Actions Taken list is read-only. The "Problem Appears Resolved" button turns into confirmation text once used, without altering the status badge.
* **IT Staff View:** 
  * **Action Form:** Create mode uses a side panel or inline form; view/edit mode expands the row with pre-filled data. Follow-up state is displayed as a text badge ("Follow-up open" / "Follow-up done"), not color alone.
  * **Workflow Controls:** The Status dropdown only lists permitted options based on `allowedTransitions`. Selecting "Resolved" reveals the `Resolution Summary` field. If `RESOLUTION_BLOCKED` occurs, a checklist of missing gate conditions is displayed.
  * **Advisory Callout:** Displays "Requester indicates this is resolved (date)" if the flag is set.
  * **Locked State:** If the ticket is Closed or Cancelled, the form renders read-only with an explanatory message.

### 3. Feedback States & Accessibility
* **Concurrency:** If a `409 STALE_UPDATE` occurs, a conflict banner is displayed with a "Reload" action, and the user's entered form values are preserved.
* **Loading & Errors:** Loading uses skeletons/spinners with accessible text. Safe API failures display a generic message with a "Retry" button (no stack traces).
* **Double Submission:** Submit buttons must be disabled while a request is pending to prevent duplicates.
* **Accessibility:** Keyboard-operable modals and panels must trap focus and respond to the Escape key. All controls have visible focus and labels (or accessible names for icon-only buttons). Status and priority are never conveyed by color alone.

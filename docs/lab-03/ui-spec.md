# Lab 3 UI Specification

## General Design Language
* **Theme:** "Zen Green" components from Lab 2 must be reused (cards, badges, buttons, form conventions).
* **Application Shell:** Top navigation must dynamically render tabs based on the authenticated user's role. Displays the current user's name and role, and a Logout action.
* **Responsive Rules:** All screens must adapt to desktop, tablet, and mobile breakpoints without horizontal scrolling, clipping, or overlap.

## Screens

### 1. Login & Change Password
* **Login Mode:** Email and password fields. Busy state during submission. Safe, generic failure feedback for invalid credentials or inactive accounts.
* **Change Password Mode:** Mandatory screen if `mustChangePassword` is true. Displays password rules with visual validation checkmarks.

### 2. IT Staff Ticket Queue
* **Desktop:** Tabular layout showing Ticket Number, Created Date, Summary, Category, Req. Priority, IT Priority, Status, and Owner.
* **Mobile/Tablet:** Card-based list representation.
* **Controls:** Search bar, Filter dropdown (e.g., by Status/Priority), Sortable column headers, Pagination controls at the bottom.
* **Feedback:** Meaningful empty state, no-results state for searches, and loading skeletons/spinners.

### 3. Ticket Detail (Requester & IT Staff)
* **Requester View:** Preserves Lab 2 functionality. Adds a "Problem Appears Resolved" button. Adds a read-only view of Public Comments and an input to add new ones.
* **IT Staff View:** Extends the view with editable `Ticket Owner` (dropdown), `IT Priority` (dropdown), and `Current Status` (dropdown).
* **Communication:** Public Comments and Internal Notes must be visually distinct (e.g., different background colors or icons) to prevent accidental public disclosure.

### 4. Admin User Management
* **List View:** Minimalist table showing Name, Email, Role, and Status (Active/Inactive badge). Edit button per row.
* **Controls:** Search by name/email, optional role filter. No pagination or multi-column sorting required.
* **Create/Edit Mode:** Modal or side-panel. Clear validation feedback for duplicate emails or empty fields. Form to set/reset initial password with a checkbox indication.

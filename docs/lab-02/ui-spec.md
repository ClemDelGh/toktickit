# Lab 2 UI Specification (Zen Green Theme)

## 1. Color Palette & Typography
- Primary Green: #006B3C (App header, primary actions, strong emphasis)
- Secondary Green: #0B7A46 (Active tabs, focus accents, links, hover states)
- Pale Green: #EAF6EF (Selected, success, subtle section emphasis)
- Page Background: #F5F7F6 (Quiet near-white)
- Surface/Cards: White with subtle border and restrained shadow
- Text Color: Dark charcoal-green (not pure black)
- Error: Dark red text and border
- Warning: Amber callout or badge
- Success: Green confirmation text/background

## 2. Component Rules
- Labels: Placed above controls with consistent font weight.
- Required Fields: Marked with a red asterisk (*).
- Editable Fields: White background with clear neutral border.
- Read-only Fields: Soft gray-green or warm ivory shading, clearly distinct but readable.
- Buttons: Must include visible text. Disabled buttons are visually distinct.
- Submit Button: Shows a busy/loading state and is disabled during processing.
- Validation Messages: Appear immediately below the associated field, not grouped at the top.
- Badges: Consistent pill-shaped badges for Priority and Status.

## 3. Screen Layouts

### 3.1 Development Requester Selection
- Purpose: Simulated login for testing.
- Layout: Centered card layout.
- States: Loading (spinner), Empty (no active requesters message), API Failure (safe error state).

### 3.2 Create Ticket
- Arrangement: System-generated fields at the top, followed by classification (Category, System, Priority), then Summary (full width) and Description (multiline, resizable vertically). Attachments section at the bottom.
- Attachments: Display clear states (active, uploading, invalid file type/size).

### 3.3 My Tickets (List)
- Desktop: Table or multi-column layout showing Ticket Number, Summary, Category, Priority, Status, Last Updated.
- Controls: Search bar, Category/Priority/Status filters, Sort headers, Pagination controls.
- States: Empty list (user has no tickets) vs. No results (filters yield nothing).

### 3.4 Requester Ticket Detail
- Mode: Read-only for main ticket fields.
- Attachments: Allowed to add new, download active, and soft-remove existing (requires a removal reason). Removed attachments show as disabled metadata (strikethrough or greyed out, no download link).

## 4. Responsive Breakpoints
- Desktop (>= 992px): Multi-column layout. Content centered with a sensible maximum width.
- Tablet (768px - 991px): Two-column layout where practical.
- Mobile (< 768px): Fields stack vertically. Buttons remain touch-friendly. No horizontal page scrolling (tables must convert to card lists or allow internal safe scrolling).

## 5. Accessibility
- Focus indicators must remain visible for keyboard navigation.
- Every icon-only control (if any) requires an aria-label and tooltip.
- Colors alone must not be the only indicator of success or error (use icons or text).

## 6. Visual Inspection Checklist
- [ ] No clipped labels or overlapping messages.
- [ ] No unintended horizontal scrolling on mobile.
- [ ] Read-only fields are clearly distinguishable from editable fields.
- [ ] Removed attachments cannot be downloaded.

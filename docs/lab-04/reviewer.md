# Lab 4 — Peer Review Record

**Author:** Clément Dominique Delrieu — 69540460016 — GitHub: @ClemDelGh  
**Peer reviewer:** Baptiste Carré — 69540460014 — GitHub: @ShrekIsLife1  

## Pull Requests I authored (reviewed by my partner)
| Issue | PR | Branch | Reviewer verdict |
|-------|----|--------|------------------|
| #20 | https://github.com/ClemDelGh/toktickit/pull/<N> | feature/20-sprint4-contract | Approved |
| #21 | https://github.com/ClemDelGh/toktickit/pull/<N> | feature/21-data-foundation | Approved |
| #22 | https://github.com/ClemDelGh/toktickit/pull/<N> | feature/22-actions-taken-api | Approved |
| #23 | https://github.com/ClemDelGh/toktickit/pull/<N> | feature/23-actions-taken-ui | Approved |
| #24 | https://github.com/ClemDelGh/toktickit/pull/<N> | feature/24-ticket-workflow | Approved |
| #25 | https://github.com/ClemDelGh/toktickit/pull/<N> | feature/25-requester-dashboard | Approved |
| #26 | https://github.com/ClemDelGh/toktickit/pull/<N> | feature/26-staff-dashboard | Approved |
| #27 | https://github.com/ClemDelGh/toktickit/pull/<N> | feature/27-hardening-regression | Approved |
| #28 | https://github.com/ClemDelGh/toktickit/pull/<N> | feature/28-e2e-release | Approved |

Release PR `lab4-staging` -> `main`: https://github.com/ClemDelGh/toktickit/pull/<N> — Approved

## Reviewer comments I received and how I responded
| Issue | Reviewer comment | How I responded |
|-------|------------------|-----------------|
| #20 | Comprehensive contract; the transition matrix and resolution gate conditions are clear. | Thanks! Proceeding with data foundation. |
| #21 | Migration and rollback scripts execute cleanly; seed accounts conform to spec §7.4. | Verified rollback rehearsal script before merging. |
| #22 | Action Taken CRUD and optimistic locking (expectedVersion) match API contract. | Validated concurrency tests and idempotency with clientRequestId. |
| #23 | Clean responsive table/cards and follow-up completion toggle. | Confirmed requester read-only mode disables edit controls. |
| #24 | Resolution gate blockers and advisory indicator follow business rules (BR-07..BR-14). | Tested 409 conflict handling with reload mechanism. |
| #25 | Metric cards and drill-downs navigate correctly to My Tickets with status filters. | Zero-state display for David Lee verified. |
| #26 | Role boundaries verified: Users card only visible to Administrator. | Queue drill-down parameter mapping verified. |
| #27 | Hardening tests catch DB session revocation and 404/403 leakage properly. | Unified error shape `{ error, code }` harmonized. |
| #28 | All 150 server, 53 client, and 17 Playwright E2E tests pass with zero accessibility violations. | Final release PR opened to main. |

## Pull Requests I reviewed for my partner
My comment: Great work on Sprint 4 implementation, all automated test suites pass and accessibility contrast guidelines are met. Good to merge.  
Partner's response: Thanks!

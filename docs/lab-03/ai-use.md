# Lab 3 — AI Use

## LLM used
Claude (Anthropic), used as both the specification agent and the coding agent.

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | From the Lab 3 handout, help me write the Sprint 3 engineering contract: numbered FR, BR and AC, the authorization matrix, and the DevelopmentRequester-to-User migration strategy. | Reviewed and trimmed the draft, then committed `specification.md`, `api-spec.md`, `ui-spec.md` and `tests.md` before any implementation branch started. |
| 2 | Choose and justify a secure authentication approach for our stack: password hashing, session/token storage, expiration, logout invalidation, CSRF considerations and safe error messages. | Adopted the recommended hashed-password and session approach, and documented the decision and its trade-offs in `api-spec.md`. |
| 3 | Write the Prisma migration that turns `DevelopmentRequester` into `User` (role, `passwordHash`, `mustChangePassword`), extends `Ticket` with status, owner and IT Priority, and makes `seed.ts` idempotent. | Ran the migration and verified existing Lab 2 tickets kept valid ownership, then validated the seed with the required active and inactive accounts. |
| 4 | Write failing Supertest tests first for login, inactive accounts, first-login enforcement and logout, then implement the auth endpoints until they pass (TDD). | Used the red/green cycle to implement `/api/auth/*` and confirmed invalid and inactive logins return the same generic error. |
| 5 | Replace the `x-requester-id` header and `RequesterSelector` with the authenticated session, and add Public Comments plus the "Problem Appears Resolved" action. | Removed the selector, verified a client-supplied `requesterId` is ignored, and kept Lab 2 Requester flows working. |
| 6 | Build the IT Staff Ticket Queue endpoint and responsive screen (table on desktop, cards on mobile) with search, filters, sorting, pagination, and distinct loading/empty/no-results/failure states. | Integrated the queue with the seeded data and checked the layout at desktop, tablet and mobile widths against the Zen Green theme. |
| 7 | Implement the status transition matrix, ownership assignment rules and Internal Notes restricted to IT Staff/Administrator, enforced on the backend. | Wrote the transition tests first, rejected invalid transitions and confirmed a Requester request to Internal Notes returns no note content. |
| 8 | Build the minimalist Administrator User Management screen and API, including duplicate-email rejection, no self-deactivation and no removal of the last active Administrator. | Verified the two safety rules with dedicated tests and kept the scope minimal (no pagination, deletion or multi-role). |
| 9 | Write the authorization hardening tests (unauthenticated, wrong role, wrong owner, inactive account) for every protected endpoint, then the Playwright E2E specs. | Fixed the gaps the tests exposed, then ran the full suite from `main` and captured the responsive screenshots. |

## My Reflection
The specification agent was most useful for turning the handout into a consistent contract: it helped me find missing rules (transition matrix, error behavior, migration of existing Requesters) before coding, and having the tests planned first kept the coding agent focused. The coding agent was fast on the repetitive parts (migration, endpoints, component scaffolding), but I had to review its output carefully for security. In particular, I checked that ownership always comes from the authenticated session, that unauthorized callers cannot learn whether a ticket or note exists, and that authorization is enforced on the backend rather than only hidden in the UI. Next time I would write the authorization test matrix earlier, since it exposed the most issues.

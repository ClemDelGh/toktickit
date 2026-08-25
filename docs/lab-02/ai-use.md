## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | How to refactor `App.tsx` and extract `RequesterSelector.tsx` to follow the Single Responsibility Principle. | Applied the architectural pattern to clean up the app shell and manage the requester context state cleanly. |
| 2 | Design the Prisma schema for `DevelopmentRequester`, `Ticket`, `Attachment`, and `RelatedSystem` with proper relationships. | Integrated the relational database models and successfully ran the Prisma migration. |
| 3 | Write the idempotent `seed.ts` script using `upsert` for categories, active/inactive requesters, and 6 related systems. | Populated the database reliably with test-ready reference data without creating duplicates. |
| 4 | Write API tests and the Express POST route for ticket creation with backend-generated ticket numbers and ownership checks. | Implemented the Supertest suite and the secure endpoint ensuring business rules `BR-01` and `BR-02` were met. |
| 5 | Create the frontend unit test for `CreateTicket.tsx` handling validation errors on empty required fields. | Mocked global fetch to verify front-end validation behavior and prevent invalid submissions. |
| 6 | Implement `MyTickets.tsx` with search filtering and responsive table layout adhering to the Zen Green Theme. | Built the React component logic, integrated it with the backend list route, and enabled real-time search filtering. |
| 7 | Diagnose and fix Git workflow synchronization after accidentally merging a feature branch directly into `main` instead of `lab2-staging`. | Executed corrective Git commands to re-align local and remote branches and restore proper staging workflows. |

## Reflection
Working with the AI significantly streamlined full-stack development, from designing relational Prisma schemas and API endpoints to establishing robust TDD and UI component test suites. One instance where I had to correct the agent's output was handling Git branch divergence when a pull request was mistakenly targeted at `main`, which required manual branch re-alignment to respect the strict staging workflow.

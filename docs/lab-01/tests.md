# Lab 1 — Test Plan and Evidence  (fill this in)

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | |
| 3 | Vitest | Heading renders | |
| 4 | Vitest | Success state shows Online + category list | |
| 5 | Vitest | Error state shows Offline + message | |

Paste your passing terminal output / screenshot below.

meow@meow-ROG-Strix-G16-G614PP-G614PP:~/Documents/SWE/lab_toktickit/toktickit/client$ npm test

> toktickit-client@1.0.0 test
> vitest run


 RUN  v2.1.9 /home/meow/Documents/SWE/lab_toktickit/toktickit/client

 ✓ tests/lab-01/App.test.tsx (3)
   ✓ App (3)
     ✓ renders the TokTickIT heading
     ✓ shows Online and the seeded categories on success
     ✓ shows an Offline error message when the API is unavailable

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  22:36:45
   Duration  776ms (transform 61ms, setup 46ms, collect 69ms, tests 81ms, environment 301ms, prepare 105ms)

meow@meow-ROG-Strix-G16-G614PP-G614PP:~/Documents/SWE/lab_toktickit/toktickit/client$ cd ../server
meow@meow-ROG-Strix-G16-G614PP-G614PP:~/Documents/SWE/lab_toktickit/toktickit/server$ npm test

> toktickit-server@1.0.0 test
> vitest run


 RUN  v2.1.9 /home/meow/Documents/SWE/lab_toktickit/toktickit/server

 ✓ tests/lab-01/categories.test.ts (1)
 ✓ tests/lab-01/health.test.ts (1)

 Test Files  2 passed (2)
      Tests  2 passed (2)
   Start at  22:36:59
   Duration  480ms (transform 76ms, setup 0ms, collect 267ms, tests 54ms, environment 0ms, prepare 211ms)

meow@meow-ROG-Strix-G16-G614PP-G614PP:~/Documents/SWE/lab_toktickit/toktickit/server$ ^C


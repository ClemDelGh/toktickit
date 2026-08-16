# Lab 1 — AI Use and Reflection  (fill this in)

**LLM/agent used:** <name>

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | How to implement the Supertest assertion for GET /api/categories returning the four seeded categories in ID order.  | Used the pattern from the health check test to write the category list test in categories.test.ts. |
| 2 | Update client/src/api.ts to fetch both the health check and the categories endpoints with proper error handling. | Implemented the client-side API communication functions to feed data into the React app. |
| 3 | Update client/src/App.tsx to handle loading, success, and error states with a Bootstrap list of categories. | Built the user interface logic matching the required TokTickIT specifications. |
| 4 | Explain how to handle the Git workflow branches (main, lab1-staging, and feature branches) and final releases. | Structured local branches and handled the staging integration and release process. |
| 5 | Write the Vitest frontend unit tests in App.test.tsx using vi.spyOn for success and error states. | Mocked the API responses to test button clicks, loading states, and error handling. |
| 6 | Fix the esbuild transform error in App.test.tsx caused by a missing keyword in the api module import. | Corrected the import syntax (* as api) so the frontend test suite could compile and pass successfully. |

## Reflection
Two or three sentences: what made your prompts better, and one place you had to
correct or reject what the agent produced.

Working with the AI helped clarify complex testing patterns like mocking API calls with vi.spyOn and structuring full-stack requests. One instance where I had to manually adjust the output was correcting a minor syntax typo in the module import statement during test debugging, which allowed the test suite to pass successfully.

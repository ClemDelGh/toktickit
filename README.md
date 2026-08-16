# TokTickIT - Lab 1

Course:CPE334 - Semester 1/2026. 
An IT service desk application implementing a full-stack vertical slice (React, Express, Prisma, PostgreSQL)

Tech Stack
Frontend:React, TypeScript, Vite, Bootstrap
Backend:Node.js, Express, TypeScript
Database: PostgreSQL, Prisma
Testing:Vitest, Supertest

Lab 1 Issues & Workflow
Issue 1: Project Foundation
Issue 2: API Health Check 
Issue 3: Category Model & Seeding
Issue 4: Category List API & UI Integration

Installation & Setup
bash
git clone <repository-url>
cd toktickit/server
npm install
npx prisma migrate dev
npx prisma db seed
npm test

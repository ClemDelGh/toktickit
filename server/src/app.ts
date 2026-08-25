import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";

// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.
void getPrisma;

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  // TODO(Issue 2): replace this stub with the required 200 response.
  res.status(200).json({ status : "ok", service : "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Issue 4 — Category list
// Add:  GET /api/categories
//   -> read categories from PostgreSQL via getPrisma().category.findMany(...)
//   -> return each { id, name } in a predictable (id) order
//   -> on failure, respond 500 with a safe message (no internal details)
// TODO(Issue 4): implement the route here.
// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      orderBy: { id: "asc" }
    });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch categories" });
  }
});

app.get('/api/development-requesters', async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().developmentRequester.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
    res.json(requesters);
  } catch (error) {
    console.error('Error fetching requesters:', error);
    res.status(500).json({ error: 'Failed to fetch requesters' });
  }
});

app.get('/api/related-systems', async (_req, res) => {
  try {
    const systems = await getPrisma().relatedSystem.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' } // 
    });
    res.json(systems);
  } catch (error) {
    console.error('Error fetching related systems:', error);
    res.status(500).json({ error: 'Failed to fetch related systems' });
  }
});

app.post('/api/tickets', async (req, res) => {
  const requesterId = req.headers['x-requester-id'];
  if (!requesterId) {
    return res.status(403).json({ error: 'Missing X-Requester-Id header' });
  }

  const { categoryId, relatedSystemId, summary, description, requestedPriority } = req.body;

  if (!summary || !description || !categoryId || !relatedSystemId || !requestedPriority) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const prisma = getPrisma();

    const count = await prisma.ticket.count();
    const nextNumber = String(count + 1).padStart(4, '0'); // ex: "0001"
    const year = new Date().getFullYear();
    const ticketNumber = `TKT-${year}-${nextNumber}`;

    // 4. Création en base de données
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        summary,
        description,
        requestedPriority,
        currentStatus: 'New', // BR-02
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        requesterId: Number(requesterId)
      }
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

export default app;

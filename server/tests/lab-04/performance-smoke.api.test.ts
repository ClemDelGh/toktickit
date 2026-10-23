import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { getPrisma } from "../../src/prisma";
import { cookieFor } from "../helpers/auth";

const PERF_TICKET_COUNT = 500;

describe("Lab 4 Performance Smoke Tests", () => {
  const prisma = getPrisma();

  let it1Cookie: string;
  let jenniferCookie: string;
  let perfTicketNumbers: string[] = [];

  beforeAll(async () => {
    it1Cookie = await cookieFor("it1@example.com");
    jenniferCookie = await cookieFor("jennifer.a@example.com");

    const jennifer = await prisma.user.findUnique({
      where: { email: "jennifer.a@example.com" },
    });
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    // Check existing perf ticket count
    const existing = await prisma.ticket.count({
      where: { ticketNumber: { startsWith: "TKT-PERF-" } },
    });

    const needed = Math.max(0, PERF_TICKET_COUNT - existing);

    if (needed > 0) {
      // Bulk insert performance tickets via Prisma direct
      const batchSize = 100;
      const batches = Math.ceil(needed / batchSize);

      for (let b = 0; b < batches; b++) {
        const count = Math.min(batchSize, needed - b * batchSize);
        const data = Array.from({ length: count }, (_, i) => {
          const num = String(b * batchSize + i + existing + 1).padStart(6, "0");
          const ticketNumber = `TKT-PERF-${num}`;
          perfTicketNumbers.push(ticketNumber);
          return {
            ticketNumber,
            summary: `Performance test ticket ${num}`,
            description: "Generated for performance smoke test",
            requestedPriority: "Low" as const,
            itPriority: "Low" as const,
            status: "New" as const,
            requesterId: jennifer!.id,
            categoryId: category!.id,
            relatedSystemId: system!.id,
          };
        });

        await prisma.ticket.createMany({ data });
      }
    }
  }, 60_000);

  afterAll(async () => {
    await prisma.ticket.deleteMany({
      where: { ticketNumber: { startsWith: "TKT-PERF-" } },
    });
  }, 60_000);

  // =========================================================================
  // PERF-01 — Requester dashboard with ≥500 tickets
  // =========================================================================
  describe("PERF-01: GET /api/dashboard/requester with ≥500 tickets", () => {
    it("responds 200 in < 1000 ms", async () => {
      const start = Date.now();

      const res = await request(app)
        .get("/api/dashboard/requester")
        .set("Cookie", jenniferCookie);

      const elapsed = Date.now() - start;

      expect(res.status).toBe(200);
      expect(elapsed).toBeLessThan(1000);
    });
  });

  // =========================================================================
  // PERF-02 — Staff queue with ≥500 tickets (limit=50)
  // =========================================================================
  describe("PERF-02: GET /api/staff/tickets?limit=50 with ≥500 tickets", () => {
    it("responds 200 in < 1000 ms", async () => {
      const start = Date.now();

      const res = await request(app)
        .get("/api/staff/tickets?limit=50")
        .set("Cookie", it1Cookie);

      const elapsed = Date.now() - start;

      expect(res.status).toBe(200);
      expect(elapsed).toBeLessThan(1000);
    });
  });
});

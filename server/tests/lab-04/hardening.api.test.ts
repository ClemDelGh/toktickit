import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { getPrisma } from "../../src/prisma";
import { cookieFor } from "../helpers/auth";
import bcrypt from "bcrypt";

describe("Lab 4 Hardening & Regression", () => {
  const prisma = getPrisma();

  let jenniferCookie: string;
  let michaelCookie: string;
  let it1Cookie: string;
  let adminCookie: string;

  // Temp users created per test scenario
  let disabledUserId: number;
  let mustChangePwdUserId: number;

  // Ticket IDs for 404 tests
  let jenniferTicketId: number;
  let michaelTicketId: number;

  beforeAll(async () => {
    jenniferCookie = await cookieFor("jennifer.a@example.com");
    michaelCookie = await cookieFor("michael.b@example.com");
    it1Cookie = await cookieFor("it1@example.com");
    adminCookie = await cookieFor("admin@example.com");

    const jennifer = await prisma.user.findUnique({ where: { email: "jennifer.a@example.com" } });
    const michael = await prisma.user.findUnique({ where: { email: "michael.b@example.com" } });
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    // Create a ticket for jennifer
    const jTkt = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-HARD-J-${Date.now()}`,
        summary: "Jennifer hardening ticket",
        description: "Hardening test",
        requestedPriority: "Medium",
        itPriority: "Medium",
        status: "New",
        requesterId: jennifer!.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
      },
    });
    jenniferTicketId = jTkt.id;

    // Create a ticket for michael
    const mTkt = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-HARD-M-${Date.now()}`,
        summary: "Michael hardening ticket",
        description: "Hardening test",
        requestedPriority: "Medium",
        itPriority: "Medium",
        status: "New",
        requesterId: michael!.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
      },
    });
    michaelTicketId = mTkt.id;

    // Create a disabled user
    const hash = await bcrypt.hash("TestPass123!", 10);
    const disabledUser = await prisma.user.create({
      data: {
        name: "Disabled Test User",
        email: `disabled-hardening-${Date.now()}@test.com`,
        role: "Requester",
        isActive: false,
        passwordHash: hash,
        mustChangePassword: false,
      },
    });
    disabledUserId = disabledUser.id;

    // Create a user with mustChangePassword = true
    const mustChangePwdUser = await prisma.user.create({
      data: {
        name: "MustChange Test User",
        email: `mustchange-hardening-${Date.now()}@test.com`,
        role: "Requester",
        isActive: true,
        passwordHash: hash,
        mustChangePassword: true,
      },
    });
    mustChangePwdUserId = mustChangePwdUser.id;
  });

  afterAll(async () => {
    // Clean up created test data (cascade: comments then tickets)
    await prisma.publicComment.deleteMany({
      where: { ticket: { ticketNumber: { startsWith: "TKT-TEST-HARD-" } } },
    });
    await prisma.internalNote.deleteMany({
      where: { ticket: { ticketNumber: { startsWith: "TKT-TEST-HARD-" } } },
    });
    await prisma.ticket.deleteMany({
      where: { ticketNumber: { startsWith: "TKT-TEST-HARD-" } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [disabledUserId, mustChangePwdUserId] } },
    });
  });

  // =========================================================================
  // API-44 — Session authority (BR-27)
  // =========================================================================
  describe("API-44: Session authority", () => {
    it("disabled user with valid cookie → 401", async () => {
      // Get a valid cookie for the disabled user (bypass DB check by signing JWT manually)
      const disabledUser = await prisma.user.findUnique({ where: { id: disabledUserId } });
      const disabledCookie = await cookieFor(disabledUser!.email);

      const res = await request(app)
        .get("/api/tickets")
        .set("Cookie", disabledCookie);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
      expect(res.body).toHaveProperty("code");
    });

    it("mustChangePassword user → 403 PASSWORD_CHANGE_REQUIRED on protected route", async () => {
      const mustChangeUser = await prisma.user.findUnique({ where: { id: mustChangePwdUserId } });
      const mustChangeCookie = await cookieFor(mustChangeUser!.email);

      const res = await request(app)
        .get("/api/tickets")
        .set("Cookie", mustChangeCookie);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });

    it("mustChangePassword user → 200 on /api/auth/me", async () => {
      const mustChangeUser = await prisma.user.findUnique({ where: { id: mustChangePwdUserId } });
      const mustChangeCookie = await cookieFor(mustChangeUser!.email);

      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", mustChangeCookie);

      expect(res.status).toBe(200);
    });

    it("mustChangePassword user → 200 on POST /api/auth/logout", async () => {
      const mustChangeUser = await prisma.user.findUnique({ where: { id: mustChangePwdUserId } });
      const mustChangeCookie = await cookieFor(mustChangeUser!.email);

      const res = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", mustChangeCookie);

      expect(res.status).toBe(200);
    });

    it("mustChangePassword user → 403 on dashboard route", async () => {
      const mustChangeUser = await prisma.user.findUnique({ where: { id: mustChangePwdUserId } });
      const mustChangeCookie = await cookieFor(mustChangeUser!.email);

      const res = await request(app)
        .get("/api/dashboard/requester")
        .set("Cookie", mustChangeCookie);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });

    it("after password change, new cookie works on protected route", async () => {
      // Reset mustChangePassword in DB
      await prisma.user.update({
        where: { id: mustChangePwdUserId },
        data: { mustChangePassword: false },
      });

      // Get fresh cookie reflecting updated DB state
      const mustChangeUser = await prisma.user.findUnique({ where: { id: mustChangePwdUserId } });
      const freshCookie = await cookieFor(mustChangeUser!.email);

      const res = await request(app)
        .get("/api/tickets")
        .set("Cookie", freshCookie);

      // Should not get 403 PASSWORD_CHANGE_REQUIRED anymore
      expect(res.status).not.toBe(403);

      // Restore mustChangePassword for other tests
      await prisma.user.update({
        where: { id: mustChangePwdUserId },
        data: { mustChangePassword: true },
      });
    });
  });

  // =========================================================================
  // API-45 — 404 harmonised (BR-28)
  // =========================================================================
  describe("API-45: 404 harmonised", () => {
    it("Requester on another requester's ticket → 404 (not 403)", async () => {
      const res = await request(app)
        .get(`/api/tickets/${michaelTicketId}`)
        .set("Cookie", jenniferCookie);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
    });

    it("Requester on non-existent ticket → 404", async () => {
      const res = await request(app)
        .get("/api/tickets/999999999")
        .set("Cookie", jenniferCookie);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
    });

    it("Requester on non-existent ticket has same error shape as foreign ticket", async () => {
      const resForeign = await request(app)
        .get(`/api/tickets/${michaelTicketId}`)
        .set("Cookie", jenniferCookie);

      const resMissing = await request(app)
        .get("/api/tickets/999999999")
        .set("Cookie", jenniferCookie);

      expect(resForeign.status).toBe(404);
      expect(resMissing.status).toBe(404);
      // Both should have error field
      expect(resForeign.body).toHaveProperty("error");
      expect(resMissing.body).toHaveProperty("error");
    });

    it("RBAC-protected route (staff only) → 403 for requester (not leaking existence)", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${jenniferTicketId}`)
        .set("Cookie", jenniferCookie);

      expect(res.status).toBe(403);
    });

    it("Requester on another requester comment route → 404", async () => {
      const res = await request(app)
        .post(`/api/tickets/${michaelTicketId}/comments`)
        .set("Cookie", jenniferCookie)
        .send({ text: "Hello" });

      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // API-46 — Validation on notes/comments
  // =========================================================================
  describe("API-46: Validation on notes/comments", () => {
    it("internal note on non-existent ticket → 404", async () => {
      const res = await request(app)
        .post("/api/staff/tickets/999999999/notes")
        .set("Cookie", it1Cookie)
        .send({ text: "Some note" });

      expect(res.status).toBe(404);
    });

    it("empty comment → 400", async () => {
      const res = await request(app)
        .post(`/api/tickets/${jenniferTicketId}/comments`)
        .set("Cookie", jenniferCookie)
        .send({ text: "" });

      expect(res.status).toBe(400);
    });

    it("comment too long (>2000 chars) → 400", async () => {
      const res = await request(app)
        .post(`/api/tickets/${jenniferTicketId}/comments`)
        .set("Cookie", jenniferCookie)
        .send({ text: "A".repeat(2001) });

      expect(res.status).toBe(400);
    });

    it("empty note → 400", async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${jenniferTicketId}/notes`)
        .set("Cookie", it1Cookie)
        .send({ text: "" });

      expect(res.status).toBe(400);
    });

    it("note too long (>2000 chars) → 400", async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${jenniferTicketId}/notes`)
        .set("Cookie", it1Cookie)
        .send({ text: "B".repeat(2001) });

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // API-47 — Uniform error shape
  // =========================================================================
  describe("API-47: Uniform error shape", () => {
    const checkErrorShape = (body: any) => {
      expect(body).toHaveProperty("error");
      expect(body).toHaveProperty("code");
      expect(typeof body.error).toBe("string");
      expect(typeof body.code).toBe("string");
      // No stack trace
      expect(JSON.stringify(body)).not.toMatch(/stack|stacktrace|at Object\.|at Module\./i);
    };

    it("400 error has {error, code}", async () => {
      const res = await request(app)
        .post(`/api/tickets/${jenniferTicketId}/comments`)
        .set("Cookie", jenniferCookie)
        .send({ text: "" });
      expect(res.status).toBe(400);
      checkErrorShape(res.body);
    });

    it("401 error has {error, code}", async () => {
      const res = await request(app).get("/api/tickets");
      expect(res.status).toBe(401);
      checkErrorShape(res.body);
    });

    it("403 error has {error, code}", async () => {
      const res = await request(app)
        .get("/api/dashboard/staff")
        .set("Cookie", jenniferCookie);
      expect(res.status).toBe(403);
      checkErrorShape(res.body);
    });

    it("404 error has {error, code}", async () => {
      const res = await request(app)
        .get("/api/tickets/999999999")
        .set("Cookie", jenniferCookie);
      expect(res.status).toBe(404);
      checkErrorShape(res.body);
    });
  });

  // =========================================================================
  // API-48 — Duplicate Ticket Number protection (BR-29)
  // =========================================================================
  describe("API-48: Protection doublons Ticket Number", () => {
    it("10 parallel POST /api/tickets → 10 distinct numbers, no 500", async () => {
      const category = await prisma.category.findFirst();
      const system = await prisma.relatedSystem.findFirst();

      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .post("/api/tickets")
          .set("Cookie", jenniferCookie)
          .send({
            summary: "Parallel ticket test",
            description: "Testing duplicate number prevention",
            categoryId: category!.id,
            relatedSystemId: system!.id,
            requestedPriority: "Low",
          })
      );

      const results = await Promise.all(requests);

      // All should succeed (no 500)
      for (const res of results) {
        expect(res.status).not.toBe(500);
        expect(res.status).toBe(201);
      }

      // All ticket numbers should be distinct
      const ticketNumbers = results.map((r) => r.body.ticketNumber);
      const unique = new Set(ticketNumbers);
      expect(unique.size).toBe(10);

      // Cleanup
      await prisma.ticket.deleteMany({
        where: { ticketNumber: { in: ticketNumbers } },
      });
    });
  });

  // =========================================================================
  // API-49 — Route sweep authorization (§5.5)
  // =========================================================================
  describe("API-49: Route sweep authorization", () => {
    it("anonymous → 401 on GET /api/tickets", async () => {
      const res = await request(app).get("/api/tickets");
      expect(res.status).toBe(401);
    });

    it("anonymous → 401 on POST /api/tickets", async () => {
      const res = await request(app).post("/api/tickets").send({});
      expect(res.status).toBe(401);
    });

    it("anonymous → 401 on GET /api/dashboard/requester", async () => {
      const res = await request(app).get("/api/dashboard/requester");
      expect(res.status).toBe(401);
    });

    it("anonymous → 401 on GET /api/dashboard/staff", async () => {
      const res = await request(app).get("/api/dashboard/staff");
      expect(res.status).toBe(401);
    });

    it("anonymous → 401 on GET /api/staff/tickets", async () => {
      const res = await request(app).get("/api/staff/tickets");
      expect(res.status).toBe(401);
    });

    it("anonymous → 401 on GET /api/users", async () => {
      const res = await request(app).get("/api/users");
      expect(res.status).toBe(401);
    });

    it("Requester on staff route → 403", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Cookie", jenniferCookie);
      expect(res.status).toBe(403);
    });

    it("Requester on staff ticket detail → 403", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${jenniferTicketId}`)
        .set("Cookie", jenniferCookie);
      expect(res.status).toBe(403);
    });

    it("Requester on admin route /api/users → 403", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("Cookie", jenniferCookie);
      expect(res.status).toBe(403);
    });

    it("Staff on admin route /api/users → 403", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("Cookie", it1Cookie);
      expect(res.status).toBe(403);
    });

    it("Staff on admin route POST /api/users → 403", async () => {
      const res = await request(app)
        .post("/api/users")
        .set("Cookie", it1Cookie)
        .send({});
      expect(res.status).toBe(403);
    });

    it("Requester on another requester's ticket → 404 (not 403 or 200)", async () => {
      const res = await request(app)
        .get(`/api/tickets/${michaelTicketId}`)
        .set("Cookie", jenniferCookie);
      expect(res.status).toBe(404);
    });
  });
});

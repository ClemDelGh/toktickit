import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { getPrisma } from "../../src/prisma";
import { cookieFor } from "../helpers/auth";
import { getRequesterDashboardOracle } from "../helpers/oracle";

const VALID_STATUSES = [
  "New",
  "Open",
  "InProgress",
  "WaitingForRequester",
  "Resolved",
  "Closed",
  "Reopened",
  "Cancelled",
] as const;

describe("Requester Dashboard API (API-31 through API-36)", () => {
  const prisma = getPrisma();

  let jenniferCookie: string;
  let michaelCookie: string;
  let davidCookie: string;
  let staffCookie: string;
  let adminCookie: string;

  let jenniferUser: { id: number };
  let michaelUser: { id: number };
  let davidUser: { id: number };

  beforeAll(async () => {
    jenniferCookie = await cookieFor("jennifer.a@example.com");
    michaelCookie = await cookieFor("michael.b@example.com");
    davidCookie = await cookieFor("david.l@example.com");
    staffCookie = await cookieFor("it1@example.com");
    adminCookie = await cookieFor("admin@example.com");

    jenniferUser = (await prisma.user.findUnique({
      where: { email: "jennifer.a@example.com" },
    }))!;
    michaelUser = (await prisma.user.findUnique({
      where: { email: "michael.b@example.com" },
    }))!;
    davidUser = (await prisma.user.findUnique({
      where: { email: "david.l@example.com" },
    }))!;
  });

  // -----------------------------------------------------------------------
  // API-31: Requester dashboard vs oracle (4 counts + 3 lists, caps et ordre)
  // -----------------------------------------------------------------------
  describe("API-31: Jennifer dashboard vs oracle", () => {
    it("returns correct counts and lists matching the oracle", async () => {
      // Fetch oracle and API response concurrently so DB state is consistent
      const [oracleResult, res] = await Promise.all([
        getRequesterDashboardOracle(jenniferUser.id),
        request(app)
          .get("/api/dashboard/requester")
          .set("Cookie", jenniferCookie),
      ]);

      expect(res.status).toBe(200);
      const body = res.body;
      const oracle = oracleResult;

      // Counts
      expect(body.open).toBe(oracle.open);
      expect(body.waitingForYou).toBe(oracle.waitingForYou);
      expect(body.resolved).toBe(oracle.resolved);
      expect(body.closed).toBe(oracle.closed);

      // Lists capped at 5
      expect(body.recentTickets.length).toBeLessThanOrEqual(5);
      expect(body.attentionTickets.length).toBeLessThanOrEqual(5);
      expect(body.recentlyResolved.length).toBeLessThanOrEqual(5);

      // recentTickets order: updatedAt desc
      const oracleRecent = oracle.recentTickets.slice(0, 5);
      expect(body.recentTickets.length).toBe(oracleRecent.length);
      for (let i = 0; i < oracleRecent.length; i++) {
        expect(body.recentTickets[i].id).toBe(oracleRecent[i].id);
      }

      // attentionTickets order: updatedAt asc
      const oracleAttention = oracle.attentionTickets.slice(0, 5);
      expect(body.attentionTickets.length).toBe(oracleAttention.length);
      for (let i = 0; i < oracleAttention.length; i++) {
        expect(body.attentionTickets[i].id).toBe(oracleAttention[i].id);
      }

      // recentlyResolved order: resolvedAt desc
      const oracleResolved = oracle.recentlyResolved.slice(0, 5);
      expect(body.recentlyResolved.length).toBe(oracleResolved.length);
      for (let i = 0; i < oracleResolved.length; i++) {
        expect(body.recentlyResolved[i].id).toBe(oracleResolved[i].id);
      }

      // Fields present in lists
      const ticketFields = [
        "id",
        "ticketNumber",
        "summary",
        "status",
        "requestedPriority",
        "itPriority",
        "updatedAt",
        "resolvedAt",
      ];
      if (body.recentTickets.length > 0) {
        const t = body.recentTickets[0];
        for (const f of ticketFields) {
          expect(t).toHaveProperty(f);
        }
      }
    });
  });

  // -----------------------------------------------------------------------
  // API-32: Requester B's dashboard — ne contient aucun ticket de Requester A
  // -----------------------------------------------------------------------
  describe("API-32: Michael's dashboard contains only his tickets", () => {
    it("michael dashboard tickets do not include jennifer tickets", async () => {
      const jenniferOracle = await getRequesterDashboardOracle(jenniferUser.id);
      const jenniferTicketIds = new Set([
        ...jenniferOracle.recentTickets.map((t) => t.id),
        ...jenniferOracle.attentionTickets.map((t) => t.id),
        ...jenniferOracle.recentlyResolved.map((t) => t.id),
      ]);

      const res = await request(app)
        .get("/api/dashboard/requester")
        .set("Cookie", michaelCookie)
        .expect(200);

      const body = res.body;
      const michaelTicketIds = [
        ...body.recentTickets.map((t: any) => t.id),
        ...body.attentionTickets.map((t: any) => t.id),
        ...body.recentlyResolved.map((t: any) => t.id),
      ];

      for (const id of michaelTicketIds) {
        expect(jenniferTicketIds.has(id)).toBe(false);
      }
    });
  });

  // -----------------------------------------------------------------------
  // API-33: David Lee (no tickets) → counts 0, listes []
  // -----------------------------------------------------------------------
  describe("API-33: David Lee zero-state", () => {
    it("returns all zeros and empty lists for a requester with no tickets", async () => {
      const res = await request(app)
        .get("/api/dashboard/requester")
        .set("Cookie", davidCookie)
        .expect(200);

      expect(res.body.open).toBe(0);
      expect(res.body.waitingForYou).toBe(0);
      expect(res.body.resolved).toBe(0);
      expect(res.body.closed).toBe(0);
      expect(res.body.recentTickets).toEqual([]);
      expect(res.body.attentionTickets).toEqual([]);
      expect(res.body.recentlyResolved).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // API-34: Staff/Admin/anonymous → 403/403/401
  // -----------------------------------------------------------------------
  describe("API-34: Role-based access control", () => {
    it("returns 403 for ITStaff", async () => {
      await request(app)
        .get("/api/dashboard/requester")
        .set("Cookie", staffCookie)
        .expect(403);
    });

    it("returns 403 for Administrator", async () => {
      await request(app)
        .get("/api/dashboard/requester")
        .set("Cookie", adminCookie)
        .expect(403);
    });

    it("returns 401 for anonymous", async () => {
      await request(app).get("/api/dashboard/requester").expect(401);
    });
  });

  // -----------------------------------------------------------------------
  // API-35: GET /api/tickets?status=... filtre multi-valeur; invalide → 400
  // -----------------------------------------------------------------------
  describe("API-35: Status filter for GET /api/tickets", () => {
    it("filters tickets by a single status", async () => {
      const res = await request(app)
        .get("/api/tickets?status=New")
        .set("Cookie", jenniferCookie)
        .expect(200);

      for (const t of res.body) {
        expect(t.status).toBe("New");
      }
    });

    it("filters tickets by multiple comma-separated statuses", async () => {
      const res = await request(app)
        .get("/api/tickets?status=New,Open")
        .set("Cookie", jenniferCookie)
        .expect(200);

      for (const t of res.body) {
        expect(["New", "Open"]).toContain(t.status);
      }
    });

    it("returns 400 for an invalid status value", async () => {
      const res = await request(app)
        .get("/api/tickets?status=InvalidStatus")
        .set("Cookie", jenniferCookie)
        .expect(400);

      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 if any status in the list is invalid", async () => {
      const res = await request(app)
        .get("/api/tickets?status=New,INVALID")
        .set("Cookie", jenniferCookie)
        .expect(400);

      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("works for all valid statuses used in dashboard cards", async () => {
      const cardStatuses = [
        "New,Open,InProgress,WaitingForRequester,Reopened",
        "WaitingForRequester",
        "Resolved",
        "Closed",
      ];
      for (const statusParam of cardStatuses) {
        const res = await request(app)
          .get(`/api/tickets?status=${statusParam}`)
          .set("Cookie", jenniferCookie)
          .expect(200);

        const allowedStatuses = statusParam.split(",");
        for (const t of res.body) {
          expect(allowedStatuses).toContain(t.status);
        }
      }
    });
  });

  // -----------------------------------------------------------------------
  // API-36: Recently-resolved window — 2j inclus, 10j exclu
  // -----------------------------------------------------------------------
  describe("API-36: Recently-resolved 7-day window", () => {
    it("includes a ticket resolved 2 days ago but excludes one resolved 10 days ago", async () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      // Find a resolved ticket from Jennifer's oracle
      const oracle = await getRequesterDashboardOracle(jenniferUser.id);

      // Temporarily create a ticket resolved 2 days ago
      const category = await prisma.category.findFirst();
      const system = await prisma.relatedSystem.findFirst();

      const ticketRecent = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-TEST-API36-A`,
          summary: "API-36 recent resolved test",
          description: "Test",
          requestedPriority: "Low",
          itPriority: "Low",
          status: "Resolved",
          categoryId: category!.id,
          relatedSystemId: system!.id,
          requesterId: jenniferUser.id,
          resolvedAt: twoDaysAgo,
          resolutionSummary: "Test resolution",
          updatedAt: twoDaysAgo,
        },
      });

      const ticketOld = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-TEST-API36-B`,
          summary: "API-36 old resolved test",
          description: "Test",
          requestedPriority: "Low",
          itPriority: "Low",
          status: "Resolved",
          categoryId: category!.id,
          relatedSystemId: system!.id,
          requesterId: jenniferUser.id,
          resolvedAt: tenDaysAgo,
          resolutionSummary: "Test resolution",
          updatedAt: tenDaysAgo,
        },
      });

      try {
        const res = await request(app)
          .get("/api/dashboard/requester")
          .set("Cookie", jenniferCookie)
          .expect(200);

        const recentlyResolvedIds = res.body.recentlyResolved.map(
          (t: any) => t.id
        );

        // 2-day-old ticket MUST be included
        expect(recentlyResolvedIds).toContain(ticketRecent.id);

        // 10-day-old ticket MUST NOT be included
        expect(recentlyResolvedIds).not.toContain(ticketOld.id);
      } finally {
        await prisma.ticket.delete({ where: { id: ticketRecent.id } });
        await prisma.ticket.delete({ where: { id: ticketOld.id } });
      }
    });
  });
});

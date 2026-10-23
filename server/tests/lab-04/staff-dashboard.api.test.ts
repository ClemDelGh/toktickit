import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { getPrisma } from "../../src/prisma";
import { cookieFor } from "../helpers/auth";
import { getStaffDashboardOracle, ACTIVE_STATUSES } from "../helpers/oracle";

const ALL_STATUSES = [
  "New",
  "Open",
  "InProgress",
  "WaitingForRequester",
  "Resolved",
  "Closed",
  "Reopened",
  "Cancelled",
] as const;

describe("Staff Dashboard API (API-37 through API-43)", () => {
  const prisma = getPrisma();

  let staffCookie: string;
  let adminCookie: string;
  let requesterCookie: string;

  let staffUser: { id: number; email: string };
  let adminUser: { id: number; email: string };
  let requesterUser: { id: number; email: string };

  beforeAll(async () => {
    staffCookie = await cookieFor("it1@example.com");
    adminCookie = await cookieFor("admin@example.com");
    requesterCookie = await cookieFor("jennifer.a@example.com");

    staffUser = (await prisma.user.findUnique({
      where: { email: "it1@example.com" },
    }))!;
    adminUser = (await prisma.user.findUnique({
      where: { email: "admin@example.com" },
    }))!;
    requesterUser = (await prisma.user.findUnique({
      where: { email: "jennifer.a@example.com" },
    }))!;
  });

  // -----------------------------------------------------------------------
  // API-37: Staff dashboard metrics vs oracle
  // -----------------------------------------------------------------------
  describe("API-37: Staff dashboard metrics vs oracle", () => {
    it("returns correct metrics and structure matching the oracle", async () => {
      const [oracle, res] = await Promise.all([
        getStaffDashboardOracle(staffUser.id, false),
        request(app)
          .get("/api/dashboard/staff")
          .set("Cookie", staffCookie),
      ]);

      expect(res.status).toBe(200);
      const body = res.body;

      // generatedAt should be a valid ISO date string
      expect(body).toHaveProperty("generatedAt");
      expect(new Date(body.generatedAt).toISOString()).toBe(body.generatedAt);

      // Workload counts
      expect(body.unassigned).toBe(oracle.unassigned);
      expect(body.myAssigned).toBe(oracle.myAssigned);

      // byStatus with all 8 statuses
      expect(body).toHaveProperty("byStatus");
      for (const s of ALL_STATUSES) {
        expect(body.byStatus[s]).toBe(oracle.byStatus[s]);
      }

      // byItPriority for active tickets
      expect(body).toHaveProperty("byItPriority");
      expect(body.byItPriority.High).toBe(oracle.byItPriority.High);
      expect(body.byItPriority.Medium).toBe(oracle.byItPriority.Medium);
      expect(body.byItPriority.Low).toBe(oracle.byItPriority.Low);

      // awaitingReview & myOpenFollowUps
      expect(body.awaitingReview).toBe(oracle.awaitingReview);
      expect(body.myOpenFollowUps).toBe(oracle.myOpenFollowUps);
    });
  });

  // -----------------------------------------------------------------------
  // API-38: Lists myRecentTickets, urgentTickets, myRecentActions
  // -----------------------------------------------------------------------
  describe("API-38: Lists caps, ordering, and truncated descriptions", () => {
    it("caps lists at 5, orders correctly, and provides required fields", async () => {
      const oracle = await getStaffDashboardOracle(staffUser.id, false);
      const res = await request(app)
        .get("/api/dashboard/staff")
        .set("Cookie", staffCookie)
        .expect(200);

      const body = res.body;

      // Caps <= 5
      expect(body.myRecentTickets.length).toBeLessThanOrEqual(5);
      expect(body.urgentTickets.length).toBeLessThanOrEqual(5);
      expect(body.myRecentActions.length).toBeLessThanOrEqual(5);

      // Ordering check against oracle
      const oracleMyRecent = oracle.myRecentTickets.slice(0, 5);
      expect(body.myRecentTickets.length).toBe(oracleMyRecent.length);
      for (let i = 0; i < oracleMyRecent.length; i++) {
        expect(body.myRecentTickets[i].id).toBe(oracleMyRecent[i].id);
      }

      const oracleUrgent = oracle.urgentTickets.slice(0, 5);
      expect(body.urgentTickets.length).toBe(oracleUrgent.length);
      for (let i = 0; i < oracleUrgent.length; i++) {
        expect(body.urgentTickets[i].id).toBe(oracleUrgent[i].id);
      }

      const oracleActions = oracle.myRecentActions.slice(0, 5);
      expect(body.myRecentActions.length).toBe(oracleActions.length);
      for (let i = 0; i < oracleActions.length; i++) {
        expect(body.myRecentActions[i].id).toBe(oracleActions[i].id);
      }

      // Ticket fields shape
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
      if (body.myRecentTickets.length > 0) {
        for (const field of ticketFields) {
          expect(body.myRecentTickets[0]).toHaveProperty(field);
        }
      }
      if (body.urgentTickets.length > 0) {
        for (const field of ticketFields) {
          expect(body.urgentTickets[0]).toHaveProperty(field);
        }
      }

      // Action fields shape
      const actionFields = ["id", "ticketId", "description", "actionDateTime", "result"];
      if (body.myRecentActions.length > 0) {
        for (const field of actionFields) {
          expect(body.myRecentActions[0]).toHaveProperty(field);
        }
      }
    });

    it("truncates action description to at most 120 chars", async () => {
      // Find an active ticket to associate the test action
      const ticket = await prisma.ticket.findFirst({
        where: { status: { in: [...ACTIVE_STATUSES] } },
      });

      const longDescription = "A".repeat(150);
      const action = await prisma.actionTaken.create({
        data: {
          ticketId: ticket!.id,
          actionDateTime: new Date(),
          description: longDescription,
          result: "Test result",
          performedById: staffUser.id,
          clientRequestId: `req-api38-${Date.now()}`,
        },
      });

      try {
        const res = await request(app)
          .get("/api/dashboard/staff")
          .set("Cookie", staffCookie)
          .expect(200);

        const foundAction = res.body.myRecentActions.find(
          (a: any) => a.id === action.id
        );
        expect(foundAction).toBeDefined();
        expect(foundAction.description.length).toBeLessThanOrEqual(120);
        expect(foundAction.description).toBe("A".repeat(120));
      } finally {
        await prisma.actionTaken.delete({ where: { id: action.id } });
      }
    });
  });

  // -----------------------------------------------------------------------
  // API-39: Role-based access control and Admin userCounts
  // -----------------------------------------------------------------------
  describe("API-39: RBAC and Admin userCounts", () => {
    it("returns 403 for Requester", async () => {
      await request(app)
        .get("/api/dashboard/staff")
        .set("Cookie", requesterCookie)
        .expect(403);
    });

    it("returns 401 for anonymous caller", async () => {
      await request(app).get("/api/dashboard/staff").expect(401);
    });

    it("does not include userCounts for ITStaff", async () => {
      const res = await request(app)
        .get("/api/dashboard/staff")
        .set("Cookie", staffCookie)
        .expect(200);

      expect(res.body.userCounts).toBeUndefined();
    });

    it("includes userCounts for Administrator matching oracle", async () => {
      const oracle = await getStaffDashboardOracle(adminUser.id, true);
      const res = await request(app)
        .get("/api/dashboard/staff")
        .set("Cookie", adminCookie)
        .expect(200);

      expect(res.body.userCounts).toBeDefined();
      expect(res.body.userCounts).toEqual(oracle.userCounts);
    });
  });

  // -----------------------------------------------------------------------
  // API-40: Queue drill-down params (owner=me|unassigned, status list, itPriority, indicated)
  // -----------------------------------------------------------------------
  describe("API-40: Queue drill-down params matching card counts", () => {
    const activeStatusParam = ACTIVE_STATUSES.join(",");

    it("drill-down for unassigned tickets matches unassigned card count", async () => {
      const oracle = await getStaffDashboardOracle(staffUser.id, false);
      const res = await request(app)
        .get(`/api/staff/tickets?owner=unassigned&status=${activeStatusParam}`)
        .set("Cookie", staffCookie)
        .expect(200);

      expect(res.body.meta.total).toBe(oracle.unassigned);
      for (const t of res.body.data) {
        expect(t.ticketOwner).toBeNull();
        expect(ACTIVE_STATUSES).toContain(t.status);
      }
    });

    it("drill-down for my assigned tickets matches myAssigned card count", async () => {
      const oracle = await getStaffDashboardOracle(staffUser.id, false);
      const res = await request(app)
        .get(`/api/staff/tickets?owner=me&status=${activeStatusParam}`)
        .set("Cookie", staffCookie)
        .expect(200);

      expect(res.body.meta.total).toBe(oracle.myAssigned);
      for (const t of res.body.data) {
        expect(t.ticketOwner.name).toBe("IT Staff One");
        expect(ACTIVE_STATUSES).toContain(t.status);
      }
    });

    it("drill-down for status matches byStatus card count", async () => {
      const oracle = await getStaffDashboardOracle(staffUser.id, false);
      const res = await request(app)
        .get("/api/staff/tickets?status=Open")
        .set("Cookie", staffCookie)
        .expect(200);

      expect(res.body.meta.total).toBe(oracle.byStatus.Open);
      for (const t of res.body.data) {
        expect(t.status).toBe("Open");
      }
    });

    it("drill-down for itPriority matches byItPriority card count", async () => {
      const oracle = await getStaffDashboardOracle(staffUser.id, false);
      const res = await request(app)
        .get(`/api/staff/tickets?itPriority=High&status=${activeStatusParam}`)
        .set("Cookie", staffCookie)
        .expect(200);

      expect(res.body.meta.total).toBe(oracle.byItPriority.High);
      for (const t of res.body.data) {
        expect(ACTIVE_STATUSES).toContain(t.status);
      }
    });

    it("drill-down for indicated=true matches awaitingReview card count", async () => {
      const oracle = await getStaffDashboardOracle(staffUser.id, false);
      const res = await request(app)
        .get(`/api/staff/tickets?indicated=true&status=${activeStatusParam}`)
        .set("Cookie", staffCookie)
        .expect(200);

      expect(res.body.meta.total).toBe(oracle.awaitingReview);
    });
  });

  // -----------------------------------------------------------------------
  // API-41: Queue invalid query params → 400 VALIDATION_ERROR, never 500
  // -----------------------------------------------------------------------
  describe("API-41: Queue invalid params validation", () => {
    it("returns 400 for invalid sortField", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?sortField=invalidField")
        .set("Cookie", staffCookie)
        .expect(400);

      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 for limit < 1 or limit > 100", async () => {
      const resLow = await request(app)
        .get("/api/staff/tickets?limit=0")
        .set("Cookie", staffCookie)
        .expect(400);
      expect(resLow.body.code).toBe("VALIDATION_ERROR");

      const resHigh = await request(app)
        .get("/api/staff/tickets?limit=1000")
        .set("Cookie", staffCookie)
        .expect(400);
      expect(resHigh.body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 for page < 1", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?page=0")
        .set("Cookie", staffCookie)
        .expect(400);

      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 for invalid status value", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?status=FakeStatus")
        .set("Cookie", staffCookie)
        .expect(400);

      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 for invalid owner value", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?owner=invalidOwner")
        .set("Cookie", staffCookie)
        .expect(400);

      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 for invalid itPriority value", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?itPriority=Urgent")
        .set("Cookie", staffCookie)
        .expect(400);

      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 for invalid indicated value", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?indicated=invalid")
        .set("Cookie", staffCookie)
        .expect(400);

      expect(res.body.code).toBe("VALIDATION_ERROR");
    });
  });

  // -----------------------------------------------------------------------
  // API-42: Staff/Admin with nothing assigned
  // -----------------------------------------------------------------------
  describe("API-42: User with nothing assigned", () => {
    it("returns myAssigned=0, empty myRecentTickets and empty myRecentActions", async () => {
      const res = await request(app)
        .get("/api/dashboard/staff")
        .set("Cookie", adminCookie)
        .expect(200);

      expect(res.body.myAssigned).toBe(0);
      expect(res.body.myRecentTickets).toEqual([]);
      expect(res.body.myRecentActions).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // API-43: Simulated DB failure → 500 INTERNAL_ERROR, generic body
  // -----------------------------------------------------------------------
  describe("API-43: Simulated DB failure returns 500 INTERNAL_ERROR", () => {
    it("staff dashboard handles DB failure gracefully without leaking stack or SQL", async () => {
      const spy = vi.spyOn(prisma.ticket, "count").mockRejectedValueOnce(new Error("Connection to database failed: SELECT 1"));

      const res = await request(app)
        .get("/api/dashboard/staff")
        .set("Cookie", staffCookie);

      spy.mockRestore();

      expect(res.status).toBe(500);
      expect(res.body.code).toBe("INTERNAL_ERROR");
      expect(res.body.error).toBeDefined();
      expect(res.body.error).not.toContain("SELECT 1");
      expect(res.body.error).not.toContain("Connection to database failed");
      expect(res.body.stack).toBeUndefined();
    });

    it("requester dashboard handles DB failure gracefully without leaking stack or SQL", async () => {
      const spy = vi.spyOn(prisma.ticket, "count").mockRejectedValueOnce(new Error("Connection to database failed: SELECT 1"));

      const res = await request(app)
        .get("/api/dashboard/requester")
        .set("Cookie", requesterCookie);

      spy.mockRestore();

      expect(res.status).toBe(500);
      expect(res.body.code).toBe("INTERNAL_ERROR");
      expect(res.body.error).toBeDefined();
      expect(res.body.error).not.toContain("SELECT 1");
      expect(res.body.error).not.toContain("Connection to database failed");
      expect(res.body.stack).toBeUndefined();
    });
  });
});

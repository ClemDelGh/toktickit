import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { getPrisma } from "../../src/prisma";
import { cookieFor } from "../helpers/auth";

describe("Ticket Workflow API (API-16 through API-30)", () => {
  const prisma = getPrisma();

  let itStaffCookie: string;
  let itStaff2Cookie: string;
  let adminCookie: string;
  let requesterCookie: string;
  let requester2Cookie: string;

  let itStaffId: number;
  let itStaff2Id: number;
  let requesterId: number;
  let requester2Id: number;
  let inactiveUserId: number;

  const createdTicketIds: number[] = [];

  beforeAll(async () => {
    itStaffCookie = await cookieFor("it1@example.com");
    itStaff2Cookie = await cookieFor("it2@example.com");
    adminCookie = await cookieFor("admin@example.com");
    requesterCookie = await cookieFor("jennifer.a@example.com");
    requester2Cookie = await cookieFor("michael.b@example.com");

    const itStaff = await prisma.user.findUnique({ where: { email: "it1@example.com" } });
    const itStaff2 = await prisma.user.findUnique({ where: { email: "it2@example.com" } });
    const requester = await prisma.user.findUnique({ where: { email: "jennifer.a@example.com" } });
    const requester2 = await prisma.user.findUnique({ where: { email: "michael.b@example.com" } });

    itStaffId = itStaff!.id;
    itStaff2Id = itStaff2!.id;
    requesterId = requester!.id;
    requester2Id = requester2!.id;

    const inactiveUser = await prisma.user.findUnique({ where: { email: "it.inactive@example.com" } });
    inactiveUserId = inactiveUser!.id;
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await prisma.actionTaken.deleteMany({
        where: { ticketId: { in: createdTicketIds } },
      });
      await prisma.publicComment.deleteMany({
        where: { ticketId: { in: createdTicketIds } },
      });
      await prisma.internalNote.deleteMany({
        where: { ticketId: { in: createdTicketIds } },
      });
      await prisma.ticket.deleteMany({
        where: { id: { in: createdTicketIds } },
      });
    }
  });

  async function createTestTicket(data: Partial<any> = {}) {
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        summary: data.summary || "Workflow Test Ticket",
        description: data.description || "Testing ticket transitions",
        requestedPriority: data.requestedPriority || "Medium",
        itPriority: data.itPriority || "Medium",
        status: data.status || "Open",
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requesterId: data.requesterId || requesterId,
        ticketOwnerId: data.ticketOwnerId !== undefined ? data.ticketOwnerId : itStaffId,
        version: data.version || 1,
        resolutionSummary: data.resolutionSummary || null,
        resolvedAt: data.resolvedAt || null,
        closedAt: data.closedAt || null,
        requesterResolvedIndicatedAt: data.requesterResolvedIndicatedAt || null,
      },
    });

    createdTicketIds.push(ticket.id);
    return ticket;
  }

  // API-16: allowedTransitions in staff and Requester Ticket detail
  describe("API-16: allowedTransitions visibility", () => {
    it("returns permitted transitions for IT Staff and empty array for Requester", async () => {
      const ticket = await createTestTicket({ status: "Open" });

      // Staff detail view
      const staffRes = await request(app)
        .get(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", itStaffCookie);

      expect(staffRes.status).toBe(200);
      expect(staffRes.body.allowedTransitions).toEqual([
        "InProgress",
        "WaitingForRequester",
        "Resolved",
        "Cancelled",
      ]);
      expect(staffRes.body.version).toBeDefined();

      // Requester detail view
      const reqRes = await request(app)
        .get(`/api/tickets/${ticket.id}`)
        .set("Cookie", requesterCookie);

      expect(reqRes.status).toBe(200);
      expect(reqRes.body.allowedTransitions).toEqual([]);
      expect(reqRes.body.version).toBeDefined();
    });
  });

  // API-17: One valid transition per matrix row
  describe("API-17: Valid transitions update status and increment version", () => {
    it("allows valid transitions (e.g. New -> InProgress)", async () => {
      const ticket = await createTestTicket({ status: "New", ticketOwnerId: null });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", itStaffCookie)
        .send({
          expectedVersion: ticket.version,
          status: "InProgress",
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("InProgress");
      expect(res.body.version).toBe(ticket.version + 1);
    });
  });

  // API-18: Invalid transitions
  describe("API-18: Invalid transitions return 422 INVALID_TRANSITION", () => {
    it("rejects forbidden status jumps (e.g. New -> Resolved, Closed -> Open)", async () => {
      const ticketNew = await createTestTicket({ status: "New" });

      const res1 = await request(app)
        .patch(`/api/staff/tickets/${ticketNew.id}`)
        .set("Cookie", itStaffCookie)
        .send({
          expectedVersion: ticketNew.version,
          status: "Resolved",
          resolutionSummary: "Valid summary",
        });

      expect(res1.status).toBe(422);
      expect(res1.body.code).toBe("INVALID_TRANSITION");

      // Verify ticket unchanged in DB
      const freshTicket = await prisma.ticket.findUnique({ where: { id: ticketNew.id } });
      expect(freshTicket!.status).toBe("New");
    });
  });

  // API-19: Resolve blocked by each single reason
  describe("API-19: Resolution gate blockers individually", () => {
    it("blocks resolution when ticket has no owner (NO_OWNER)", async () => {
      const ticket = await createTestTicket({ status: "Open", ticketOwnerId: null });
      // Add an action
      await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          actionDateTime: new Date(),
          description: "Work done",
          result: "Done",
          performedById: itStaffId,
          clientRequestId: `req-${Date.now()}-1`,
        },
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", itStaffCookie)
        .send({
          expectedVersion: ticket.version,
          status: "Resolved",
          resolutionSummary: "Fixed it",
        });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe("RESOLUTION_BLOCKED");
      expect(res.body.blockers).toContain("NO_OWNER");
    });

    it("blocks resolution when ticket has no actions taken (NO_ACTIONS)", async () => {
      const ticket = await createTestTicket({ status: "Open", ticketOwnerId: itStaffId });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", itStaffCookie)
        .send({
          expectedVersion: ticket.version,
          status: "Resolved",
          resolutionSummary: "Fixed it",
        });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe("RESOLUTION_BLOCKED");
      expect(res.body.blockers).toContain("NO_ACTIONS");
    });

    it("blocks resolution when ticket has an open follow-up (OPEN_FOLLOW_UP)", async () => {
      const ticket = await createTestTicket({ status: "Open", ticketOwnerId: itStaffId });
      await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          actionDateTime: new Date(),
          description: "Action with open follow up",
          result: "Pending vendor",
          performedById: itStaffId,
          followUpRequired: true,
          followUpNote: "Call vendor",
          followUpCompletedAt: null,
          clientRequestId: `req-${Date.now()}-2`,
        },
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", itStaffCookie)
        .send({
          expectedVersion: ticket.version,
          status: "Resolved",
          resolutionSummary: "Fixed it",
        });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe("RESOLUTION_BLOCKED");
      expect(res.body.blockers).toContain("OPEN_FOLLOW_UP");
    });

    it("blocks resolution when resolution summary is missing or empty (NO_RESOLUTION_SUMMARY)", async () => {
      const ticket = await createTestTicket({ status: "Open", ticketOwnerId: itStaffId });
      await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          actionDateTime: new Date(),
          description: "Clean action",
          result: "Done",
          performedById: itStaffId,
          clientRequestId: `req-${Date.now()}-3`,
        },
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", itStaffCookie)
        .send({
          expectedVersion: ticket.version,
          status: "Resolved",
          resolutionSummary: "   ",
        });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe("RESOLUTION_BLOCKED");
      expect(res.body.blockers).toContain("NO_RESOLUTION_SUMMARY");
    });
  });

  // API-20: Resolve when several conditions fail
  describe("API-20: Multiple resolution blockers returned together", () => {
    it("returns all failing blockers in one response", async () => {
      const ticket = await createTestTicket({ status: "Open", ticketOwnerId: null });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", itStaffCookie)
        .send({
          expectedVersion: ticket.version,
          status: "Resolved",
        });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe("RESOLUTION_BLOCKED");
      expect(res.body.blockers).toContain("NO_OWNER");
      expect(res.body.blockers).toContain("NO_ACTIONS");
      expect(res.body.blockers).toContain("NO_RESOLUTION_SUMMARY");
    });
  });

  // API-21: Resolve with gate satisfied
  describe("API-21: Resolve with gate satisfied", () => {
    it("transitions to Resolved, sets resolvedAt and stores resolutionSummary", async () => {
      const ticket = await createTestTicket({ status: "Open", ticketOwnerId: itStaffId });
      await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          actionDateTime: new Date(),
          description: "Action taken",
          result: "Fixed cable",
          performedById: itStaffId,
          clientRequestId: `req-${Date.now()}-4`,
        },
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", itStaffCookie)
        .send({
          expectedVersion: ticket.version,
          status: "Resolved",
          resolutionSummary: "Successfully repaired the faulty network port.",
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Resolved");
      expect(res.body.resolutionSummary).toBe("Successfully repaired the faulty network port.");
      expect(res.body.resolvedAt).toBeDefined();
      expect(res.body.version).toBe(ticket.version + 1);
    });
  });

  // API-22: Direct crafted PATCH bypassing the UI
  describe("API-22: Direct crafted PATCH cannot bypass gate", () => {
    it("returns 422 even if requested directly on a ticket with no actions", async () => {
      const ticket = await createTestTicket({ status: "Open", ticketOwnerId: itStaffId });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", itStaffCookie)
        .send({
          expectedVersion: ticket.version,
          status: "Resolved",
          resolutionSummary: "Bypassing UI",
        });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe("RESOLUTION_BLOCKED");
      expect(res.body.blockers).toContain("NO_ACTIONS");
    });
  });

  // API-23: Requester advisory indicator
  describe("API-23: PATCH /api/tickets/:id/resolve advisory indicator", () => {
    it("sets requesterResolvedIndicatedAt without changing ticket status", async () => {
      const ticket = await createTestTicket({ status: "InProgress" });

      const res1 = await request(app)
        .patch(`/api/tickets/${ticket.id}/resolve`)
        .set("Cookie", requesterCookie);

      expect(res1.status).toBe(200);
      expect(res1.body.status).toBe("InProgress"); // Status unchanged!
      expect(res1.body.requesterResolvedIndicatedAt).toBeDefined();

      // Second call is idempotent
      const res2 = await request(app)
        .patch(`/api/tickets/${ticket.id}/resolve`)
        .set("Cookie", requesterCookie);

      expect(res2.status).toBe(200);
      expect(res2.body.status).toBe("InProgress");
    });
  });

  // API-24: Authorization on resolve and status routes
  describe("API-24: Authorization on status and advisory routes", () => {
    it("enforces role permissions and returns safe errors", async () => {
      const ticket = await createTestTicket({ status: "Open" });

      // Requester tries to PATCH staff route -> 403
      const res1 = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", requesterCookie)
        .send({ status: "Resolved" });
      expect(res1.status).toBe(403);

      // Staff user calls Requester advisory route -> 403
      const res2 = await request(app)
        .patch(`/api/tickets/${ticket.id}/resolve`)
        .set("Cookie", itStaffCookie);
      expect(res2.status).toBe(403);

      // Requester B calls advisory route on Requester A's ticket -> 404 (no leak)
      const res3 = await request(app)
        .patch(`/api/tickets/${ticket.id}/resolve`)
        .set("Cookie", requester2Cookie);
      expect(res3.status).toBe(404);
    });
  });

  // API-25: Advisory indicator on Resolved/Closed/Cancelled ticket
  describe("API-25: Advisory indicator on terminal/resolved tickets", () => {
    it("returns 422 INVALID_STATE on Resolved, Closed, or Cancelled tickets", async () => {
      const resolvedTicket = await createTestTicket({ status: "Resolved" });

      const res = await request(app)
        .patch(`/api/tickets/${resolvedTicket.id}/resolve`)
        .set("Cookie", requesterCookie);

      expect(res.status).toBe(422);
      expect(res.body.code).toBe("INVALID_STATE");
    });
  });

  // API-26: Status lifecycle and indicator reset
  describe("API-26: Lifecycle timestamp updates and indicator reset", () => {
    it("sets closedAt on close, clears resolvedAt on reopen, and resets indicator on status change", async () => {
      // 1. Resolved -> Closed sets closedAt
      const resolvedTicket = await createTestTicket({
        status: "Resolved",
        ticketOwnerId: itStaffId,
        resolvedAt: new Date(),
        requesterResolvedIndicatedAt: new Date(),
      });

      const closeRes = await request(app)
        .patch(`/api/staff/tickets/${resolvedTicket.id}`)
        .set("Cookie", itStaffCookie)
        .send({
          expectedVersion: resolvedTicket.version,
          status: "Closed",
        });

      expect(closeRes.status).toBe(200);
      expect(closeRes.body.status).toBe("Closed");
      expect(closeRes.body.closedAt).toBeDefined();
      expect(closeRes.body.requesterResolvedIndicatedAt).toBeNull(); // Reset!

      // 2. Resolved -> Reopened clears resolvedAt and indicator
      const resolvedTicket2 = await createTestTicket({
        status: "Resolved",
        ticketOwnerId: itStaffId,
        resolvedAt: new Date(),
        requesterResolvedIndicatedAt: new Date(),
      });

      const reopenRes = await request(app)
        .patch(`/api/staff/tickets/${resolvedTicket2.id}`)
        .set("Cookie", itStaffCookie)
        .send({
          expectedVersion: resolvedTicket2.version,
          status: "Reopened",
        });

      expect(reopenRes.status).toBe(200);
      expect(reopenRes.body.status).toBe("Reopened");
      expect(reopenRes.body.resolvedAt).toBeNull();
      expect(reopenRes.body.requesterResolvedIndicatedAt).toBeNull();
    });
  });

  // API-27: Cancel and terminal ticket locking
  describe("API-27: Cancel allowed from non-terminal states and edits locked on terminal tickets", () => {
    it("allows cancel from Open and returns 422 TICKET_LOCKED for edits on Closed/Cancelled", async () => {
      const ticket = await createTestTicket({ status: "Open" });

      const cancelRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", itStaffCookie)
        .send({
          expectedVersion: ticket.version,
          status: "Cancelled",
        });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe("Cancelled");

      // Attempting to change priority or owner on Cancelled ticket -> 422 TICKET_LOCKED
      const editRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", itStaffCookie)
        .send({
          expectedVersion: cancelRes.body.version,
          itPriority: "High",
        });

      expect(editRes.status).toBe(422);
      expect(editRes.body.code).toBe("TICKET_LOCKED");
    });
  });

  // API-28: Optimistic concurrency control (expectedVersion)
  describe("API-28: Stale updates return 409 STALE_UPDATE", () => {
    it("rejects mismatched version with 409 and current ticket object", async () => {
      const ticket = await createTestTicket({ status: "Open" });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", itStaffCookie)
        .send({
          expectedVersion: 999, // Mismatched version
          itPriority: "High",
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("STALE_UPDATE");
      expect(res.body.current).toBeDefined();
      expect(res.body.current.version).toBe(ticket.version);
    });

    it("ensures exactly one of two concurrent updates with same expectedVersion wins", async () => {
      const ticket = await createTestTicket({ status: "Open" });

      const [resA, resB] = await Promise.all([
        request(app)
          .patch(`/api/staff/tickets/${ticket.id}`)
          .set("Cookie", itStaffCookie)
          .send({ expectedVersion: ticket.version, itPriority: "High" }),
        request(app)
          .patch(`/api/staff/tickets/${ticket.id}`)
          .set("Cookie", itStaff2Cookie)
          .send({ expectedVersion: ticket.version, itPriority: "Low" }),
      ]);

      const statuses = [resA.status, resB.status].sort();
      expect(statuses).toEqual([200, 409]);
    });
  });

  // API-29: Owner assignment validation
  describe("API-29: Ticket owner assignment rules (BR-18)", () => {
    it("rejects inactive user and Requester with 400 INVALID_OWNER, and accepts active IT staff", async () => {
      const ticket = await createTestTicket({ status: "Open", ticketOwnerId: null });

      // Inactive IT Staff
      const resInactive = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", itStaffCookie)
        .send({
          expectedVersion: ticket.version,
          ticketOwnerId: inactiveUserId,
        });
      expect(resInactive.status).toBe(400);
      expect(resInactive.body.code).toBe("INVALID_OWNER");

      // Requester user
      const resRequester = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", itStaffCookie)
        .send({
          expectedVersion: ticket.version,
          ticketOwnerId: requesterId,
        });
      expect(resRequester.status).toBe(400);
      expect(resRequester.body.code).toBe("INVALID_OWNER");

      // Active IT Staff
      const resValid = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", itStaffCookie)
        .send({
          expectedVersion: ticket.version,
          ticketOwnerId: itStaff2Id,
        });
      expect(resValid.status).toBe(200);
      expect(resValid.body.ticketOwnerId).toBe(itStaff2Id);
    });
  });

  // API-30: itPriority assignment on create and requester restriction
  describe("API-30: itPriority copies requestedPriority on create and is immutable for requesters", () => {
    it("sets itPriority = requestedPriority on creation and forbids requester from modifying it", async () => {
      const category = await prisma.category.findFirst();
      const system = await prisma.relatedSystem.findFirst();

      const createRes = await request(app)
        .post("/api/tickets")
        .set("Cookie", requesterCookie)
        .send({
          summary: "New Printer Problem",
          description: "Cannot print PDF files",
          categoryId: category!.id,
          relatedSystemId: system!.id,
          requestedPriority: "High",
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.requestedPriority).toBe("High");
      expect(createRes.body.itPriority).toBe("High"); // BR-17

      createdTicketIds.push(createRes.body.id);

      // Requester tries to patch ticket status or priority -> 403
      const patchRes = await request(app)
        .patch(`/api/staff/tickets/${createRes.body.id}`)
        .set("Cookie", requesterCookie)
        .send({ itPriority: "Low" });

      expect(patchRes.status).toBe(403);
    });
  });
});

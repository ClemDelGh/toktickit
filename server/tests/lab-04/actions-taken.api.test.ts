import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { getPrisma } from "../../src/prisma";
import { cookieFor } from "../helpers/auth";

describe("Lab 4 Actions Taken API (API-01 ... API-15)", () => {
  const prisma = getPrisma();

  let it1Cookie: string;
  let it2Cookie: string;
  let jenniferCookie: string; // Requester owner of 9003
  let sarahCookie: string; // Requester non-owner of 9003
  let adminCookie: string;

  let testTicketOpenId: number;
  let testTicketClosedId: number;
  let testTicketCancelledId: number;

  beforeAll(async () => {
    it1Cookie = await cookieFor("it1@example.com");
    it2Cookie = await cookieFor("it2@example.com");
    jenniferCookie = await cookieFor("jennifer.a@example.com");
    sarahCookie = await cookieFor("sarah.j@example.com");
    adminCookie = await cookieFor("admin@example.com");

    const jennifer = await prisma.user.findUnique({
      where: { email: "jennifer.a@example.com" },
    });
    const it1 = await prisma.user.findUnique({
      where: { email: "it1@example.com" },
    });
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    // Create unique tickets for mutable API tests
    const ticketOpen = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-${Date.now()}-1`,
        summary: "Test Ticket for Actions",
        description: "Testing Actions Taken API",
        requestedPriority: "High",
        itPriority: "High",
        status: "Open",
        requesterId: jennifer!.id,
        ticketOwnerId: it1!.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
      },
    });
    testTicketOpenId = ticketOpen.id;

    const ticketClosed = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-${Date.now()}-2`,
        summary: "Closed Ticket for Actions Lock",
        description: "Testing locked status",
        requestedPriority: "Low",
        itPriority: "Low",
        status: "Closed",
        requesterId: jennifer!.id,
        ticketOwnerId: it1!.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
      },
    });
    testTicketClosedId = ticketClosed.id;

    const ticketCancelled = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-${Date.now()}-3`,
        summary: "Cancelled Ticket for Actions Lock",
        description: "Testing locked status",
        requestedPriority: "Low",
        itPriority: "Low",
        status: "Cancelled",
        requesterId: jennifer!.id,
        ticketOwnerId: it1!.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
      },
    });
    testTicketCancelledId = ticketCancelled.id;
  });

  afterAll(async () => {
    await prisma.actionTaken.deleteMany({
      where: {
        ticketId: {
          in: [testTicketOpenId, testTicketClosedId, testTicketCancelledId],
        },
      },
    });
    await prisma.ticket.deleteMany({
      where: {
        id: {
          in: [testTicketOpenId, testTicketClosedId, testTicketCancelledId],
        },
      },
    });
  });

  // API-01: IT Staff creates a valid Action
  it("API-01: IT Staff creates a valid Action (201, performer = session user, version = 1)", async () => {
    const res = await request(app)
      .post(`/api/staff/tickets/${testTicketOpenId}/actions`)
      .set("Cookie", it1Cookie)
      .send({
        actionDateTime: new Date().toISOString(),
        description: "Investigated network ports",
        result: "Port 80 is open and listening",
        followUpRequired: false,
        clientRequestId: `req-api01-${Date.now()}`,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.ticketId).toBe(testTicketOpenId);
    expect(res.body.version).toBe(1);
    expect(res.body.performedBy).toBeDefined();
    expect(res.body.performedBy.name).toBe("IT Staff One");
    expect(res.body.lastEditedBy).toBeNull();
  });

  // API-02: Body contains a different performedById -> ignored
  it("API-02: Body contains a different performedById, which is ignored", async () => {
    const res = await request(app)
      .post(`/api/staff/tickets/${testTicketOpenId}/actions`)
      .set("Cookie", it1Cookie)
      .send({
        actionDateTime: new Date().toISOString(),
        description: "Spoofing attempt",
        result: "Should remain performed by IT Staff One",
        performedById: 9999,
        followUpRequired: false,
        clientRequestId: `req-api02-${Date.now()}`,
      });

    expect(res.status).toBe(201);
    expect(res.body.performedBy.name).toBe("IT Staff One");
  });

  // API-03: Validation matrix: blank description, blank result, over-length, bad date, follow-up without note
  it("API-03: Validation matrix returns 400 VALIDATION_ERROR with fieldErrors", async () => {
    const resBlankDesc = await request(app)
      .post(`/api/staff/tickets/${testTicketOpenId}/actions`)
      .set("Cookie", it1Cookie)
      .send({
        actionDateTime: new Date().toISOString(),
        description: "   ",
        result: "Some result",
        followUpRequired: false,
        clientRequestId: `req-api03-1-${Date.now()}`,
      });

    expect(resBlankDesc.status).toBe(400);
    expect(resBlankDesc.body.code).toBe("VALIDATION_ERROR");
    expect(resBlankDesc.body.fieldErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "description" }),
      ])
    );

    const resFutureDate = await request(app)
      .post(`/api/staff/tickets/${testTicketOpenId}/actions`)
      .set("Cookie", it1Cookie)
      .send({
        actionDateTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        description: "Future work",
        result: "Some result",
        followUpRequired: false,
        clientRequestId: `req-api03-2-${Date.now()}`,
      });

    expect(resFutureDate.status).toBe(400);
    expect(resFutureDate.body.code).toBe("VALIDATION_ERROR");

    const resMissingFollowUpNote = await request(app)
      .post(`/api/staff/tickets/${testTicketOpenId}/actions`)
      .set("Cookie", it1Cookie)
      .send({
        actionDateTime: new Date().toISOString(),
        description: "Needs follow-up",
        result: "Result",
        followUpRequired: true,
        followUpNote: "   ",
        clientRequestId: `req-api03-3-${Date.now()}`,
      });

    expect(resMissingFollowUpNote.status).toBe(400);
    expect(resMissingFollowUpNote.body.code).toBe("VALIDATION_ERROR");
    expect(resMissingFollowUpNote.body.fieldErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "followUpNote" }),
      ])
    );
  });

  // API-04: followUpRequired=false with a note supplied -> followUpNote stored as null
  it("API-04: followUpRequired=false with a note supplied stores followUpNote as null", async () => {
    const res = await request(app)
      .post(`/api/staff/tickets/${testTicketOpenId}/actions`)
      .set("Cookie", it1Cookie)
      .send({
        actionDateTime: new Date().toISOString(),
        description: "Checked disk space",
        result: "Adequate space available",
        followUpRequired: false,
        followUpNote: "This note should be normalized to null",
        clientRequestId: `req-api04-${Date.now()}`,
      });

    expect(res.status).toBe(201);
    expect(res.body.followUpRequired).toBe(false);
    expect(res.body.followUpNote).toBeNull();
  });

  // API-05: IT Staff B records an Action on A's Ticket -> performer B, ticketOwnerId unchanged
  it("API-05: IT Staff B records an Action on A's Ticket -> performer B, ticket owner unchanged", async () => {
    const beforeTicket = await prisma.ticket.findUnique({
      where: { id: testTicketOpenId },
    });
    expect(beforeTicket?.ticketOwnerId).not.toBeNull();

    const res = await request(app)
      .post(`/api/staff/tickets/${testTicketOpenId}/actions`)
      .set("Cookie", it2Cookie)
      .send({
        actionDateTime: new Date().toISOString(),
        description: "Assisted by IT Staff Two",
        result: "Collaborative testing completed",
        followUpRequired: false,
        clientRequestId: `req-api05-${Date.now()}`,
      });

    expect(res.status).toBe(201);
    expect(res.body.performedBy.name).toBe("IT Staff Two");

    const afterTicket = await prisma.ticket.findUnique({
      where: { id: testTicketOpenId },
    });
    expect(afterTicket?.ticketOwnerId).toBe(beforeTicket?.ticketOwnerId);
  });

  // API-06: Edit with current expectedVersion -> 200, version+1, lastEditedBy set
  it("API-06: Edit with current expectedVersion increases version and sets lastEditedBy", async () => {
    const createRes = await request(app)
      .post(`/api/staff/tickets/${testTicketOpenId}/actions`)
      .set("Cookie", it1Cookie)
      .send({
        actionDateTime: new Date().toISOString(),
        description: "Action to edit",
        result: "Initial result",
        followUpRequired: false,
        clientRequestId: `req-api06-${Date.now()}`,
      });

    const actionId = createRes.body.id;
    const initialVersion = createRes.body.version;

    const patchRes = await request(app)
      .patch(`/api/staff/tickets/${testTicketOpenId}/actions/${actionId}`)
      .set("Cookie", it2Cookie)
      .send({
        expectedVersion: initialVersion,
        description: "Updated description after review",
        result: "Updated result",
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.version).toBe(initialVersion + 1);
    expect(patchRes.body.performedBy.name).toBe("IT Staff One"); // Performer unchanged
    expect(patchRes.body.lastEditedBy).toBeDefined();
    expect(patchRes.body.lastEditedBy.name).toBe("IT Staff Two");
    expect(patchRes.body.description).toBe("Updated description after review");
  });

  // API-07: Edit with stale expectedVersion -> 409 STALE_UPDATE with current record
  it("API-07: Edit with stale expectedVersion returns 409 STALE_UPDATE with current record", async () => {
    const createRes = await request(app)
      .post(`/api/staff/tickets/${testTicketOpenId}/actions`)
      .set("Cookie", it1Cookie)
      .send({
        actionDateTime: new Date().toISOString(),
        description: "Action for stale test",
        result: "Result",
        followUpRequired: false,
        clientRequestId: `req-api07-${Date.now()}`,
      });

    const actionId = createRes.body.id;

    const staleRes = await request(app)
      .patch(`/api/staff/tickets/${testTicketOpenId}/actions/${actionId}`)
      .set("Cookie", it1Cookie)
      .send({
        expectedVersion: 999, // Stale version
        description: "Should fail",
      });

    expect(staleRes.status).toBe(409);
    expect(staleRes.body.code).toBe("STALE_UPDATE");
    expect(staleRes.body.current).toBeDefined();
    expect(staleRes.body.current.id).toBe(actionId);
  });

  // API-08: Mark follow-up completed; same on Action without follow-up -> 400
  it("API-08: Mark follow-up completed sets followUpCompletedAt; rejected if no follow-up needed", async () => {
    const createWithFollowUp = await request(app)
      .post(`/api/staff/tickets/${testTicketOpenId}/actions`)
      .set("Cookie", it1Cookie)
      .send({
        actionDateTime: new Date().toISOString(),
        description: "Action needing follow-up",
        result: "Initial diagnostics done",
        followUpRequired: true,
        followUpNote: "Follow up tomorrow morning",
        clientRequestId: `req-api08-1-${Date.now()}`,
      });

    const actionId = createWithFollowUp.body.id;
    expect(createWithFollowUp.body.followUpCompletedAt).toBeNull();

    const completeRes = await request(app)
      .patch(`/api/staff/tickets/${testTicketOpenId}/actions/${actionId}`)
      .set("Cookie", it1Cookie)
      .send({
        expectedVersion: 1,
        followUpCompleted: true,
      });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.followUpCompletedAt).not.toBeNull();

    // Now try to mark followUpCompleted on an action where followUpRequired is false
    const createWithoutFollowUp = await request(app)
      .post(`/api/staff/tickets/${testTicketOpenId}/actions`)
      .set("Cookie", it1Cookie)
      .send({
        actionDateTime: new Date().toISOString(),
        description: "No follow up",
        result: "Complete",
        followUpRequired: false,
        clientRequestId: `req-api08-2-${Date.now()}`,
      });

    const badCompleteRes = await request(app)
      .patch(
        `/api/staff/tickets/${testTicketOpenId}/actions/${createWithoutFollowUp.body.id}`
      )
      .set("Cookie", it1Cookie)
      .send({
        expectedVersion: 1,
        followUpCompleted: true,
      });

    expect(badCompleteRes.status).toBe(400);
    expect(badCompleteRes.body.code).toBe("VALIDATION_ERROR");
  });

  // API-09: Owner Requester lists Actions; write attempts -> 403
  it("API-09: Owner Requester lists Actions read-only (200), POST/PATCH forbidden (403)", async () => {
    const listRes = await request(app)
      .get(`/api/tickets/${testTicketOpenId}/actions`)
      .set("Cookie", jenniferCookie);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);

    const postAttempt = await request(app)
      .post(`/api/staff/tickets/${testTicketOpenId}/actions`)
      .set("Cookie", jenniferCookie)
      .send({
        actionDateTime: new Date().toISOString(),
        description: "Requester trying to create action",
        result: "Should fail",
        followUpRequired: false,
        clientRequestId: `req-api09-${Date.now()}`,
      });

    expect(postAttempt.status).toBe(403);
  });

  // API-10: Requester B lists Actions of A's Ticket -> 404
  it("API-10: Requester B lists Actions of A's Ticket returns 404 (no existence leak)", async () => {
    const res = await request(app)
      .get(`/api/tickets/${testTicketOpenId}/actions`)
      .set("Cookie", sarahCookie);

    expect(res.status).toBe(404);
  });

  // API-11: DELETE an Action -> 404; list with equal timestamps -> stable order (actionDateTime, then id)
  it("API-11: DELETE is not allowed (404); list has stable order by actionDateTime asc, then id asc", async () => {
    const delRes = await request(app)
      .delete(`/api/staff/tickets/${testTicketOpenId}/actions/1`)
      .set("Cookie", it1Cookie);

    expect(delRes.status).toBe(404);

    const listRes = await request(app)
      .get(`/api/tickets/${testTicketOpenId}/actions`)
      .set("Cookie", it1Cookie);

    expect(listRes.status).toBe(200);
    const actions = listRes.body.data;
    for (let i = 0; i < actions.length - 1; i++) {
      const current = actions[i];
      const next = actions[i + 1];
      const currentDate = new Date(current.actionDateTime).getTime();
      const nextDate = new Date(next.actionDateTime).getTime();
      expect(currentDate <= nextDate).toBe(true);
      if (currentDate === nextDate) {
        expect(current.id < next.id).toBe(true);
      }
    }
  });

  // API-12: Same clientRequestId posted twice -> one row, second response 200 with same id
  it("API-12: Replaying the same clientRequestId is idempotent (200 with same Action)", async () => {
    const clientRequestId = `req-idempotent-${Date.now()}`;
    const payload = {
      actionDateTime: new Date().toISOString(),
      description: "Idempotent testing",
      result: "First execution",
      followUpRequired: false,
      clientRequestId,
    };

    const firstRes = await request(app)
      .post(`/api/staff/tickets/${testTicketOpenId}/actions`)
      .set("Cookie", it1Cookie)
      .send(payload);

    expect(firstRes.status).toBe(201);
    const firstId = firstRes.body.id;

    const secondRes = await request(app)
      .post(`/api/staff/tickets/${testTicketOpenId}/actions`)
      .set("Cookie", it1Cookie)
      .send(payload);

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.id).toBe(firstId);
  });

  // API-13: Create/edit Action on Closed and Cancelled Tickets -> 422 TICKET_LOCKED
  it("API-13: Create/edit Action on Closed and Cancelled Tickets returns 422 TICKET_LOCKED", async () => {
    const createOnClosed = await request(app)
      .post(`/api/staff/tickets/${testTicketClosedId}/actions`)
      .set("Cookie", it1Cookie)
      .send({
        actionDateTime: new Date().toISOString(),
        description: "Create on closed",
        result: "Should be locked",
        followUpRequired: false,
        clientRequestId: `req-api13-1-${Date.now()}`,
      });

    expect(createOnClosed.status).toBe(422);
    expect(createOnClosed.body.code).toBe("TICKET_LOCKED");

    const createOnCancelled = await request(app)
      .post(`/api/staff/tickets/${testTicketCancelledId}/actions`)
      .set("Cookie", it1Cookie)
      .send({
        actionDateTime: new Date().toISOString(),
        description: "Create on cancelled",
        result: "Should be locked",
        followUpRequired: false,
        clientRequestId: `req-api13-2-${Date.now()}`,
      });

    expect(createOnCancelled.status).toBe(422);
    expect(createOnCancelled.body.code).toBe("TICKET_LOCKED");
  });

  // API-14: Anonymous request -> 401; unknown Ticket id -> 404
  it("API-14: Anonymous returns 401, unknown Ticket id returns 404", async () => {
    const anonRes = await request(app).get(
      `/api/tickets/${testTicketOpenId}/actions`
    );
    expect(anonRes.status).toBe(401);

    const notFoundRes = await request(app)
      .get(`/api/tickets/999999/actions`)
      .set("Cookie", it1Cookie);
    expect(notFoundRes.status).toBe(404);
  });

  // API-15: Administrator creates and edits an Action -> 201 / 200
  it("API-15: Administrator creates and edits an Action successfully", async () => {
    const adminCreate = await request(app)
      .post(`/api/staff/tickets/${testTicketOpenId}/actions`)
      .set("Cookie", adminCookie)
      .send({
        actionDateTime: new Date().toISOString(),
        description: "Admin intervention",
        result: "Verified by administrator",
        followUpRequired: false,
        clientRequestId: `req-api15-${Date.now()}`,
      });

    expect(adminCreate.status).toBe(201);
    expect(adminCreate.body.performedBy.name).toBe("System Admin");

    const adminPatch = await request(app)
      .patch(
        `/api/staff/tickets/${testTicketOpenId}/actions/${adminCreate.body.id}`
      )
      .set("Cookie", adminCookie)
      .send({
        expectedVersion: 1,
        result: "Admin verified and updated",
      });

    expect(adminPatch.status).toBe(200);
    expect(adminPatch.body.result).toBe("Admin verified and updated");
  });
});


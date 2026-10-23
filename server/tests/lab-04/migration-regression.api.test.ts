import { describe, it, expect, beforeAll } from "vitest";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 4 Migration & Regression (MIG-01, MIG-02)", () => {
  const prisma = getPrisma();

  describe("MIG-01: Integrity after migration", () => {
    it("should ensure all tickets have valid foreign keys and no orphan relations", async () => {
      const tickets = await prisma.ticket.findMany({
        include: {
          requester: true,
          category: true,
          relatedSystem: true,
          ticketOwner: true,
        },
      });

      expect(tickets.length).toBeGreaterThan(0);
      for (const t of tickets) {
        expect(t.requester).toBeDefined();
        expect(t.requester.id).toBe(t.requesterId);
        expect(t.category).toBeDefined();
        expect(t.category.id).toBe(t.categoryId);
        expect(t.relatedSystem).toBeDefined();
        expect(t.relatedSystem.id).toBe(t.relatedSystemId);
        if (t.ticketOwnerId !== null) {
          expect(t.ticketOwner).toBeDefined();
          expect(t.ticketOwner?.id).toBe(t.ticketOwnerId);
        }
      }
    });

    it("should ensure no null itPriority exists on any migrated/seeded ticket", async () => {
      const seededTicketNumbers = [
        "TKT-001",
        "TKT-002",
        ...Array.from({ length: 16 }, (_, i) => `TKT-2026-${9001 + i}`),
      ];
      const ticketsWithNullItPriority = await prisma.ticket.findMany({
        where: {
          ticketNumber: { in: seededTicketNumbers },
          itPriority: null,
        },
      });
      expect(ticketsWithNullItPriority).toHaveLength(0);
    });

    it("should ensure every seeded/migrated ticket has version = 1 (or >= 1)", async () => {
      const seededTicketNumbers = [
        "TKT-001",
        "TKT-002",
        ...Array.from({ length: 16 }, (_, i) => `TKT-2026-${9001 + i}`),
      ];
      const tickets = await prisma.ticket.findMany({
        where: { ticketNumber: { in: seededTicketNumbers } },
      });
      expect(tickets.length).toBe(18);
      for (const t of tickets) {
        expect(t.version).toBeDefined();
        expect(t.version).toBeGreaterThanOrEqual(1);
      }
    });

    it("should ensure all users have hashed passwords", async () => {
      const users = await prisma.user.findMany();
      expect(users.length).toBeGreaterThan(0);
      for (const u of users) {
        expect(u.passwordHash).toMatch(/^\$2[ab]\$/);
      }
    });
  });

  describe("MIG-02: Backfill and legacy behaviour", () => {
    it("should have backfilled resolvedAt for Resolved tickets and closedAt for Closed tickets", async () => {
      const resolvedTickets = await prisma.ticket.findMany({
        where: { status: "Resolved" },
      });
      for (const t of resolvedTickets) {
        expect(t.resolvedAt).toBeDefined();
        expect(t.resolvedAt).not.toBeNull();
      }

      const closedTickets = await prisma.ticket.findMany({
        where: { status: "Closed" },
      });
      for (const t of closedTickets) {
        expect(t.closedAt).toBeDefined();
        expect(t.closedAt).not.toBeNull();
      }
    });

    it("should return empty actionsTaken list for legacy tickets without actions", async () => {
      // Legacy tickets TKT-001 or TKT-002
      const legacyTicket = await prisma.ticket.findFirst({
        where: { ticketNumber: "TKT-001" },
        include: { actionsTaken: true },
      });
      if (legacyTicket) {
        expect(legacyTicket.actionsTaken).toBeDefined();
        expect(legacyTicket.actionsTaken).toEqual([]);
      }
    });

    it("should ensure David Lee has 0 tickets and Administrator owns 0 tickets per spec §7.4", async () => {
      const david = await prisma.user.findUnique({ where: { email: "david.l@example.com" } });
      expect(david).toBeDefined();
      const davidTickets = await prisma.ticket.count({ where: { requesterId: david!.id } });
      expect(davidTickets).toBe(0);

      const admin = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
      expect(admin).toBeDefined();
      const adminOwned = await prisma.ticket.count({ where: { ticketOwnerId: admin!.id } });
      expect(adminOwned).toBe(0);
    });

    it("should verify total seeded tickets count and actions count", async () => {
      // 2 Lab 3 tickets + 16 Lab 4 tickets = 18 tickets
      const totalTickets = await prisma.ticket.count();
      expect(totalTickets).toBeGreaterThanOrEqual(18);

      // Verify actions taken exist (exact sum from spec §7.4 is 22 actions)
      const totalActions = await prisma.actionTaken.count();
      expect(totalActions).toBe(22);
    });
  });
});


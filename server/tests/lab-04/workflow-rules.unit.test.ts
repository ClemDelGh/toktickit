import { describe, it, expect } from "vitest";
import {
  STATUSES,
  ALLOWED_TRANSITIONS,
  isTransitionAllowed,
  getAllowedTransitions,
  evaluateResolutionGate,
} from "../../src/workflow/rules";

describe("Workflow Rules Unit Tests (UNIT-01, UNIT-02)", () => {
  describe("UNIT-01: Transition matrix (BR-11)", () => {
    it("verifies all 56 ordered status pairs and ensures exactly 21 pairs are allowed", () => {
      let allowedCount = 0;
      let disallowedCount = 0;

      for (const from of STATUSES) {
        for (const to of STATUSES) {
          if (from === to) {
            // Same status is not a transition
            expect(isTransitionAllowed(from, to)).toBe(false);
          } else {
            const isAllowed = isTransitionAllowed(from, to);
            if (isAllowed) {
              allowedCount++;
              expect(ALLOWED_TRANSITIONS[from]).toContain(to);
            } else {
              disallowedCount++;
              expect(ALLOWED_TRANSITIONS[from] || []).not.toContain(to);
            }
          }
        }
      }

      // Exactly 21 of the 56 ordered pairs are allowed
      expect(allowedCount).toBe(21);
      expect(disallowedCount).toBe(35); // 56 - 21 = 35
    });

    it("verifies allowed transitions per role", () => {
      // Requesters can never transition statuses -> []
      expect(getAllowedTransitions("New", "Requester")).toEqual([]);
      expect(getAllowedTransitions("Open", "Requester")).toEqual([]);

      // Staff/Admin get transitions from matrix
      expect(getAllowedTransitions("New", "ITStaff")).toEqual([
        "Open",
        "InProgress",
        "WaitingForRequester",
        "Cancelled",
      ]);
      expect(getAllowedTransitions("Resolved", "Administrator")).toEqual([
        "Closed",
        "Reopened",
      ]);
      expect(getAllowedTransitions("Closed", "ITStaff")).toEqual([]);
      expect(getAllowedTransitions("Cancelled", "ITStaff")).toEqual([]);
    });
  });

  describe("UNIT-02: Resolution gate evaluator (BR-13)", () => {
    const validOwner = { id: 2, isActive: true, role: "ITStaff" };
    const validAction = { followUpRequired: false, followUpCompletedAt: null };
    const validSummary = "Resolved the issue by restarting the service.";

    it("returns empty blockers array when all G1-G4 conditions are satisfied", () => {
      const blockers = evaluateResolutionGate(
        {
          ticketOwner: validOwner,
          actionsTaken: [validAction],
          resolutionSummary: null,
        },
        validSummary
      );
      expect(blockers).toEqual([]);
    });

    it("fails G1 when ticket has no owner, inactive owner, or requester owner", () => {
      // No owner
      expect(
        evaluateResolutionGate(
          { ticketOwner: null, actionsTaken: [validAction] },
          validSummary
        )
      ).toContain("NO_OWNER");

      // Inactive owner
      expect(
        evaluateResolutionGate(
          {
            ticketOwner: { id: 2, isActive: false, role: "ITStaff" },
            actionsTaken: [validAction],
          },
          validSummary
        )
      ).toContain("NO_OWNER");

      // Requester owner
      expect(
        evaluateResolutionGate(
          {
            ticketOwner: { id: 2, isActive: true, role: "Requester" },
            actionsTaken: [validAction],
          },
          validSummary
        )
      ).toContain("NO_OWNER");
    });

    it("fails G2 when ticket has no Actions Taken", () => {
      expect(
        evaluateResolutionGate(
          { ticketOwner: validOwner, actionsTaken: [] },
          validSummary
        )
      ).toContain("NO_ACTIONS");
    });

    it("fails G3 when an Action Taken has an open follow-up", () => {
      const openFollowUpAction = {
        followUpRequired: true,
        followUpCompletedAt: null,
      };

      expect(
        evaluateResolutionGate(
          {
            ticketOwner: validOwner,
            actionsTaken: [validAction, openFollowUpAction],
          },
          validSummary
        )
      ).toContain("OPEN_FOLLOW_UP");

      // But passes if followUpCompletedAt is set
      const completedFollowUpAction = {
        followUpRequired: true,
        followUpCompletedAt: new Date().toISOString(),
      };

      expect(
        evaluateResolutionGate(
          {
            ticketOwner: validOwner,
            actionsTaken: [validAction, completedFollowUpAction],
          },
          validSummary
        )
      ).toEqual([]);
    });

    it("fails G4 when resolution summary is missing, empty, or exceeds 1000 characters", () => {
      // Missing
      expect(
        evaluateResolutionGate(
          { ticketOwner: validOwner, actionsTaken: [validAction], resolutionSummary: null },
          ""
        )
      ).toContain("NO_RESOLUTION_SUMMARY");

      // Whitespace only
      expect(
        evaluateResolutionGate(
          { ticketOwner: validOwner, actionsTaken: [validAction], resolutionSummary: "   " },
          null
        )
      ).toContain("NO_RESOLUTION_SUMMARY");

      // Over 1000 chars
      const longSummary = "a".repeat(1001);
      expect(
        evaluateResolutionGate(
          { ticketOwner: validOwner, actionsTaken: [validAction] },
          longSummary
        )
      ).toContain("NO_RESOLUTION_SUMMARY");
    });

    it("reports multiple blockers simultaneously when multiple conditions fail", () => {
      const blockers = evaluateResolutionGate(
        {
          ticketOwner: null,
          actionsTaken: [],
          resolutionSummary: null,
        },
        ""
      );

      expect(blockers).toContain("NO_OWNER");
      expect(blockers).toContain("NO_ACTIONS");
      expect(blockers).toContain("NO_RESOLUTION_SUMMARY");
      expect(blockers.length).toBe(3);
    });
  });
});


export const STATUSES = [
  "New",
  "Open",
  "InProgress",
  "WaitingForRequester",
  "Resolved",
  "Closed",
  "Reopened",
  "Cancelled",
] as const;

export type TicketStatus = (typeof STATUSES)[number];

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  New: ["Open", "InProgress", "WaitingForRequester", "Cancelled"],
  Open: ["InProgress", "WaitingForRequester", "Resolved", "Cancelled"],
  InProgress: ["WaitingForRequester", "Resolved", "Cancelled"],
  WaitingForRequester: ["Open", "InProgress", "Resolved", "Cancelled"],
  Resolved: ["Closed", "Reopened"],
  Reopened: ["InProgress", "WaitingForRequester", "Resolved", "Cancelled"],
  Closed: [],
  Cancelled: [],
};

export function isTransitionAllowed(from: string, to: string): boolean {
  if (from === to) return false;
  const allowed = ALLOWED_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

export function getAllowedTransitions(currentStatus: string, role: string): string[] {
  if (role === "Requester") {
    return [];
  }
  return ALLOWED_TRANSITIONS[currentStatus] || [];
}

export interface GateTicket {
  ticketOwner?: {
    id: number;
    isActive: boolean;
    role: string;
  } | null;
  actionsTaken?: Array<{
    followUpRequired: boolean;
    followUpCompletedAt: Date | string | null;
  }>;
  resolutionSummary?: string | null;
}

export function evaluateResolutionGate(
  ticket: GateTicket,
  proposedSummary?: string | null
): string[] {
  const blockers: string[] = [];

  // G1: Ticket Owner exists, is active, and is IT Staff or Administrator
  const owner = ticket.ticketOwner;
  if (
    !owner ||
    !owner.isActive ||
    (owner.role !== "ITStaff" && owner.role !== "Administrator")
  ) {
    blockers.push("NO_OWNER");
  }

  // G2: At least one Action Taken exists
  const actions = ticket.actionsTaken || [];
  if (actions.length === 0) {
    blockers.push("NO_ACTIONS");
  }

  // G3: No Action has an open follow-up (followUpRequired = true AND followUpCompletedAt is null)
  const hasOpenFollowUp = actions.some(
    (a) => a.followUpRequired && !a.followUpCompletedAt
  );
  if (hasOpenFollowUp) {
    blockers.push("OPEN_FOLLOW_UP");
  }

  // G4: Non-empty resolutionSummary (1-1000 characters)
  const summary =
    proposedSummary !== undefined && proposedSummary !== null
      ? proposedSummary.trim()
      : (ticket.resolutionSummary || "").trim();

  if (!summary || summary.length < 1 || summary.length > 1000) {
    blockers.push("NO_RESOLUTION_SUMMARY");
  }

  return blockers;
}


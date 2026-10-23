-- Rollback for lab4_actions_taken_workflow
DROP TABLE IF EXISTS "ActionTaken" CASCADE;

DROP INDEX IF EXISTS "Ticket_requesterId_status_idx";
DROP INDEX IF EXISTS "Ticket_ticketOwnerId_status_idx";
DROP INDEX IF EXISTS "Ticket_status_updatedAt_idx";

ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "requesterResolvedIndicatedAt";
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "closedAt";
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "resolvedAt";
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "resolutionSummary";
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "version";

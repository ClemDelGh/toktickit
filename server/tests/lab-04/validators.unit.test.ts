import { describe, it, expect } from "vitest";
import { validateActionInput, validateActionUpdateInput } from "../../src/validators/actionValidators";

describe("UNIT-03: Action Validators", () => {
  const ticketCreatedAt = new Date("2026-10-01T10:00:00.000Z");

  const validActionData = {
    actionDateTime: new Date("2026-10-02T10:00:00.000Z").toISOString(),
    description: "Replaced faulty switch port",
    result: "Connection restored and verified",
    followUpRequired: false,
    clientRequestId: "req-12345",
  };

  it("should accept valid action data", () => {
    const result = validateActionInput(validActionData, ticketCreatedAt);
    expect(result.isValid).toBe(true);
    expect(result.errors).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data?.followUpNote).toBeNull();
  });

  it("should trim strings and reject empty description or result", () => {
    const emptyDesc = validateActionInput(
      { ...validActionData, description: "   " },
      ticketCreatedAt
    );
    expect(emptyDesc.isValid).toBe(false);
    expect(emptyDesc.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "description" }),
      ])
    );

    const emptyResult = validateActionInput(
      { ...validActionData, result: "" },
      ticketCreatedAt
    );
    expect(emptyResult.isValid).toBe(false);
    expect(emptyResult.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "result" }),
      ])
    );
  });

  it("should reject description > 2000 chars and result > 1000 chars", () => {
    const tooLongDesc = validateActionInput(
      { ...validActionData, description: "a".repeat(2001) },
      ticketCreatedAt
    );
    expect(tooLongDesc.isValid).toBe(false);
    expect(tooLongDesc.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "description" }),
      ])
    );

    const tooLongResult = validateActionInput(
      { ...validActionData, result: "b".repeat(1001) },
      ticketCreatedAt
    );
    expect(tooLongResult.isValid).toBe(false);
    expect(tooLongResult.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "result" }),
      ])
    );
  });

  it("should reject attachmentNotes > 500 chars", () => {
    const tooLongNotes = validateActionInput(
      { ...validActionData, attachmentNotes: "c".repeat(501) },
      ticketCreatedAt
    );
    expect(tooLongNotes.isValid).toBe(false);
    expect(tooLongNotes.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "attachmentNotes" }),
      ])
    );
  });

  it("should reject date earlier than Ticket createdAt", () => {
    const beforeTicket = validateActionInput(
      { ...validActionData, actionDateTime: "2026-09-30T10:00:00.000Z" },
      ticketCreatedAt
    );
    expect(beforeTicket.isValid).toBe(false);
    expect(beforeTicket.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "actionDateTime" }),
      ])
    );
  });

  it("should reject date more than 5 minutes in the future", () => {
    const farFuture = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const futureDate = validateActionInput(
      { ...validActionData, actionDateTime: farFuture },
      ticketCreatedAt
    );
    expect(futureDate.isValid).toBe(false);
    expect(futureDate.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "actionDateTime" }),
      ])
    );
  });

  it("should require followUpNote when followUpRequired is true", () => {
    const missingNote = validateActionInput(
      { ...validActionData, followUpRequired: true, followUpNote: "" },
      ticketCreatedAt
    );
    expect(missingNote.isValid).toBe(false);
    expect(missingNote.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "followUpNote" }),
      ])
    );

    const withValidNote = validateActionInput(
      {
        ...validActionData,
        followUpRequired: true,
        followUpNote: "Check connectivity after restart",
      },
      ticketCreatedAt
    );
    expect(withValidNote.isValid).toBe(true);
    expect(withValidNote.data?.followUpNote).toBe(
      "Check connectivity after restart"
    );
  });

  it("should normalize followUpNote to null when followUpRequired is false", () => {
    const ignoredNote = validateActionInput(
      {
        ...validActionData,
        followUpRequired: false,
        followUpNote: "This should be ignored",
      },
      ticketCreatedAt
    );
    expect(ignoredNote.isValid).toBe(true);
    expect(ignoredNote.data?.followUpNote).toBeNull();
  });

  it("should require clientRequestId for creation", () => {
    const missingClientRequestId = validateActionInput(
      { ...validActionData, clientRequestId: "" },
      ticketCreatedAt
    );
    expect(missingClientRequestId.isValid).toBe(false);
    expect(missingClientRequestId.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "clientRequestId" }),
      ])
    );
  });

  it("should validate update inputs requiring expectedVersion", () => {
    const noVersion = validateActionUpdateInput(
      { description: "New description" },
      ticketCreatedAt
    );
    expect(noVersion.isValid).toBe(false);
    expect(noVersion.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "expectedVersion" }),
      ])
    );

    const validUpdate = validateActionUpdateInput(
      { expectedVersion: 1, description: "Updated description" },
      ticketCreatedAt
    );
    expect(validUpdate.isValid).toBe(true);
  });
});


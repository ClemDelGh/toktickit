import { FieldError } from "../utils/errors";

export interface ActionInput {
  actionDateTime: string | Date;
  description: string;
  result: string;
  followUpRequired?: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
  clientRequestId: string;
}

export interface ActionUpdateInput {
  expectedVersion: number;
  actionDateTime?: string | Date;
  description?: string;
  result?: string;
  followUpRequired?: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
  followUpCompleted?: boolean;
}

export interface ValidationResult<T> {
  isValid: boolean;
  errors?: FieldError[];
  data?: T;
}

export function validateActionInput(
  input: any,
  ticketCreatedAt?: Date
): ValidationResult<{
  actionDateTime: Date;
  description: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  clientRequestId: string;
}> {
  const errors: FieldError[] = [];

  // 1. clientRequestId
  const clientRequestId =
    typeof input?.clientRequestId === "string"
      ? input.clientRequestId.trim()
      : "";
  if (!clientRequestId) {
    errors.push({
      field: "clientRequestId",
      message: "Client request ID is required",
    });
  }

  // 2. actionDateTime
  let parsedDate: Date | null = null;
  if (!input?.actionDateTime) {
    errors.push({
      field: "actionDateTime",
      message: "Action date and time is required",
    });
  } else {
    parsedDate = new Date(input.actionDateTime);
    if (isNaN(parsedDate.getTime())) {
      errors.push({
        field: "actionDateTime",
        message: "Invalid action date and time format",
      });
    } else {
      const now = Date.now();
      const fiveMinutesInFuture = now + 5 * 60 * 1000;
      if (parsedDate.getTime() > fiveMinutesInFuture) {
        errors.push({
          field: "actionDateTime",
          message: "Action date and time cannot be more than 5 minutes in the future",
        });
      }
      if (
        ticketCreatedAt &&
        parsedDate.getTime() < ticketCreatedAt.getTime() - 1000
      ) {
        errors.push({
          field: "actionDateTime",
          message: "Action date and time cannot be earlier than ticket creation time",
        });
      }
    }
  }

  // 3. description
  const description =
    typeof input?.description === "string" ? input.description.trim() : "";
  if (!description || description.length < 1 || description.length > 2000) {
    errors.push({
      field: "description",
      message: "Description must be between 1 and 2000 characters",
    });
  }

  // 4. result
  const result =
    typeof input?.result === "string" ? input.result.trim() : "";
  if (!result || result.length < 1 || result.length > 1000) {
    errors.push({
      field: "result",
      message: "Result must be between 1 and 1000 characters",
    });
  }

  // 5. followUpRequired & followUpNote
  const followUpRequired = Boolean(input?.followUpRequired);
  let followUpNote: string | null = null;

  if (followUpRequired) {
    const rawNote =
      typeof input?.followUpNote === "string"
        ? input.followUpNote.trim()
        : "";
    if (!rawNote || rawNote.length < 1 || rawNote.length > 1000) {
      errors.push({
        field: "followUpNote",
        message: "Follow-up note is required when follow-up is requested (1-1000 characters)",
      });
    } else {
      followUpNote = rawNote;
    }
  } else {
    followUpNote = null;
  }

  // 6. attachmentNotes
  let attachmentNotes: string | null = null;
  if (typeof input?.attachmentNotes === "string") {
    const rawAttachment = input.attachmentNotes.trim();
    if (rawAttachment.length > 500) {
      errors.push({
        field: "attachmentNotes",
        message: "Attachment notes must not exceed 500 characters",
      });
    } else {
      attachmentNotes = rawAttachment || null;
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    data: {
      actionDateTime: parsedDate!,
      description,
      result,
      followUpRequired,
      followUpNote,
      attachmentNotes,
      clientRequestId,
    },
  };
}

export function validateActionUpdateInput(
  input: any,
  ticketCreatedAt?: Date
): ValidationResult<{
  expectedVersion: number;
  actionDateTime?: Date;
  description?: string;
  result?: string;
  followUpRequired?: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
  followUpCompleted?: boolean;
}> {
  const errors: FieldError[] = [];

  // expectedVersion is mandatory
  if (
    typeof input?.expectedVersion !== "number" ||
    !Number.isInteger(input.expectedVersion) ||
    input.expectedVersion < 1
  ) {
    errors.push({
      field: "expectedVersion",
      message: "A valid expectedVersion is required",
    });
  }

  let actionDateTime: Date | undefined;
  if (input?.actionDateTime !== undefined) {
    actionDateTime = new Date(input.actionDateTime);
    if (isNaN(actionDateTime.getTime())) {
      errors.push({
        field: "actionDateTime",
        message: "Invalid action date and time format",
      });
    } else {
      const now = Date.now();
      const fiveMinutesInFuture = now + 5 * 60 * 1000;
      if (actionDateTime.getTime() > fiveMinutesInFuture) {
        errors.push({
          field: "actionDateTime",
          message: "Action date and time cannot be more than 5 minutes in the future",
        });
      }
      if (
        ticketCreatedAt &&
        actionDateTime.getTime() < ticketCreatedAt.getTime() - 1000
      ) {
        errors.push({
          field: "actionDateTime",
          message: "Action date and time cannot be earlier than ticket creation time",
        });
      }
    }
  }

  let description: string | undefined;
  if (input?.description !== undefined) {
    description =
      typeof input.description === "string" ? input.description.trim() : "";
    if (!description || description.length < 1 || description.length > 2000) {
      errors.push({
        field: "description",
        message: "Description must be between 1 and 2000 characters",
      });
    }
  }

  let result: string | undefined;
  if (input?.result !== undefined) {
    result = typeof input.result === "string" ? input.result.trim() : "";
    if (!result || result.length < 1 || result.length > 1000) {
      errors.push({
        field: "result",
        message: "Result must be between 1 and 1000 characters",
      });
    }
  }

  let followUpRequired: boolean | undefined;
  let followUpNote: string | null | undefined;
  if (input?.followUpRequired !== undefined) {
    followUpRequired = Boolean(input.followUpRequired);
    if (followUpRequired) {
      const rawNote =
        typeof input.followUpNote === "string" ? input.followUpNote.trim() : "";
      if (!rawNote || rawNote.length < 1 || rawNote.length > 1000) {
        errors.push({
          field: "followUpNote",
          message: "Follow-up note is required when follow-up is requested (1-1000 characters)",
        });
      } else {
        followUpNote = rawNote;
      }
    } else {
      followUpNote = null;
    }
  } else if (input?.followUpNote !== undefined) {
    const rawNote =
      typeof input.followUpNote === "string" ? input.followUpNote.trim() : "";
    if (rawNote.length > 1000) {
      errors.push({
        field: "followUpNote",
        message: "Follow-up note must not exceed 1000 characters",
      });
    } else {
      followUpNote = rawNote || null;
    }
  }

  let attachmentNotes: string | null | undefined;
  if (input?.attachmentNotes !== undefined) {
    if (typeof input.attachmentNotes === "string") {
      const rawAttachment = input.attachmentNotes.trim();
      if (rawAttachment.length > 500) {
        errors.push({
          field: "attachmentNotes",
          message: "Attachment notes must not exceed 500 characters",
        });
      } else {
        attachmentNotes = rawAttachment || null;
      }
    } else {
      attachmentNotes = null;
    }
  }

  const followUpCompleted =
    input?.followUpCompleted !== undefined
      ? Boolean(input.followUpCompleted)
      : undefined;

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    data: {
      expectedVersion: input.expectedVersion,
      ...(actionDateTime !== undefined && { actionDateTime }),
      ...(description !== undefined && { description }),
      ...(result !== undefined && { result }),
      ...(followUpRequired !== undefined && { followUpRequired }),
      ...(followUpNote !== undefined && { followUpNote }),
      ...(attachmentNotes !== undefined && { attachmentNotes }),
      ...(followUpCompleted !== undefined && { followUpCompleted }),
    },
  };
}


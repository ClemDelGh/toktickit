import { Router } from "express";
import { getPrisma } from "../prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/authMiddleware";
import { sendError } from "../utils/errors";
import {
  validateActionInput,
  validateActionUpdateInput,
} from "../validators/actionValidators";

const router = Router();
const prisma = getPrisma();

// GET /api/tickets/:ticketId/actions
// Allowed: Requester (owner only), IT Staff, Administrator
router.get("/tickets/:ticketId/actions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const ticketId = parseInt(req.params.ticketId, 10);
    if (isNaN(ticketId)) {
      return sendError(res, 404, "NOT_FOUND", "Ticket not found");
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return sendError(res, 404, "NOT_FOUND", "Ticket not found");
    }

    // Requester can only read their own tickets (404 otherwise to avoid existence leaking, BR-28)
    if (req.user?.role === "Requester" && ticket.requesterId !== req.user.userId) {
      return sendError(res, 404, "NOT_FOUND", "Ticket not found");
    }

    // Stable ordering: actionDateTime asc, then id asc (BR-09)
    const actions = await prisma.actionTaken.findMany({
      where: { ticketId },
      orderBy: [{ actionDateTime: "asc" }, { id: "asc" }],
      include: {
        performedBy: { select: { id: true, name: true } },
        lastEditedBy: { select: { id: true, name: true } },
      },
    });

    return res.status(200).json({ data: actions });
  } catch (error) {
    console.error("Error in GET /api/tickets/:ticketId/actions:", error);
    return sendError(res, 500, "INTERNAL_ERROR", "Internal server error");
  }
});

// POST /api/staff/tickets/:ticketId/actions
// Allowed: IT Staff, Administrator
router.post(
  "/staff/tickets/:ticketId/actions",
  requireAuth,
  requireRole(["ITStaff", "Administrator"]),
  async (req: AuthRequest, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId, 10);
      if (isNaN(ticketId)) {
        return sendError(res, 404, "NOT_FOUND", "Ticket not found");
      }

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        return sendError(res, 404, "NOT_FOUND", "Ticket not found");
      }

      // BR-08: Closed or Cancelled tickets are locked
      if (ticket.status === "Closed" || ticket.status === "Cancelled") {
        return sendError(
          res,
          422,
          "TICKET_LOCKED",
          "Actions cannot be created on a closed or cancelled ticket"
        );
      }

      const performerId = req.user!.userId;

      // BR-10: Idempotency with (performedById, clientRequestId)
      if (req.body?.clientRequestId && typeof req.body.clientRequestId === "string") {
        const trimmedRequestId = req.body.clientRequestId.trim();
        const existingAction = await prisma.actionTaken.findUnique({
          where: {
            performedById_clientRequestId: {
              performedById: performerId,
              clientRequestId: trimmedRequestId,
            },
          },
          include: {
            performedBy: { select: { id: true, name: true } },
            lastEditedBy: { select: { id: true, name: true } },
          },
        });

        if (existingAction) {
          return res.status(200).json(existingAction);
        }
      }

      // Validation (BR-04, BR-05)
      const validation = validateActionInput(req.body, ticket.createdAt);
      if (!validation.isValid) {
        return sendError(res, 400, "VALIDATION_ERROR", "Validation failed", {
          fieldErrors: validation.errors,
        });
      }

      const data = validation.data!;

      const newAction = await prisma.actionTaken.create({
        data: {
          ticketId,
          performedById: performerId,
          actionDateTime: data.actionDateTime,
          description: data.description,
          result: data.result,
          followUpRequired: data.followUpRequired,
          followUpNote: data.followUpNote,
          attachmentNotes: data.attachmentNotes,
          clientRequestId: data.clientRequestId,
          version: 1,
        },
        include: {
          performedBy: { select: { id: true, name: true } },
          lastEditedBy: { select: { id: true, name: true } },
        },
      });

      return res.status(201).json(newAction);
    } catch (error) {
      console.error("Error in POST /api/staff/tickets/:ticketId/actions:", error);
      return sendError(res, 500, "INTERNAL_ERROR", "Internal server error");
    }
  }
);

// PATCH /api/staff/tickets/:ticketId/actions/:actionId
// Allowed: IT Staff, Administrator
router.patch(
  "/staff/tickets/:ticketId/actions/:actionId",
  requireAuth,
  requireRole(["ITStaff", "Administrator"]),
  async (req: AuthRequest, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId, 10);
      const actionId = parseInt(req.params.actionId, 10);

      if (isNaN(ticketId) || isNaN(actionId)) {
        return sendError(res, 404, "NOT_FOUND", "Ticket or Action not found");
      }

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        return sendError(res, 404, "NOT_FOUND", "Ticket not found");
      }

      // BR-08: Closed or Cancelled tickets are locked
      if (ticket.status === "Closed" || ticket.status === "Cancelled") {
        return sendError(
          res,
          422,
          "TICKET_LOCKED",
          "Actions cannot be edited on a closed or cancelled ticket"
        );
      }

      const existingAction = await prisma.actionTaken.findUnique({
        where: { id: actionId },
        include: {
          performedBy: { select: { id: true, name: true } },
          lastEditedBy: { select: { id: true, name: true } },
        },
      });

      if (!existingAction || existingAction.ticketId !== ticketId) {
        return sendError(res, 404, "NOT_FOUND", "Action not found");
      }

      // Validation
      const validation = validateActionUpdateInput(req.body, ticket.createdAt);
      if (!validation.isValid) {
        return sendError(res, 400, "VALIDATION_ERROR", "Validation failed", {
          fieldErrors: validation.errors,
        });
      }

      const updateData = validation.data!;

      // Concurrency check (BR-16)
      if (existingAction.version !== updateData.expectedVersion) {
        return sendError(
          res,
          409,
          "STALE_UPDATE",
          "The action has been modified by another user",
          { current: existingAction }
        );
      }

      // Follow-up logic (BR-05)
      let followUpCompletedAt = existingAction.followUpCompletedAt;
      const willBeFollowUpRequired =
        updateData.followUpRequired !== undefined
          ? updateData.followUpRequired
          : existingAction.followUpRequired;

      if (updateData.followUpCompleted === true) {
        if (!willBeFollowUpRequired) {
          return sendError(
            res,
            400,
            "VALIDATION_ERROR",
            "Cannot mark follow-up completed on an action that does not require follow-up",
            {
              fieldErrors: [
                {
                  field: "followUpCompleted",
                  message: "Action does not require follow-up",
                },
              ],
            }
          );
        }
        followUpCompletedAt = new Date();
      }

      let followUpNote =
        updateData.followUpNote !== undefined
          ? updateData.followUpNote
          : existingAction.followUpNote;

      if (!willBeFollowUpRequired) {
        followUpNote = null;
        followUpCompletedAt = null;
      }

      const updatedAction = await prisma.actionTaken.update({
        where: { id: actionId },
        data: {
          ...(updateData.actionDateTime && {
            actionDateTime: updateData.actionDateTime,
          }),
          ...(updateData.description && {
            description: updateData.description,
          }),
          ...(updateData.result && { result: updateData.result }),
          ...(updateData.followUpRequired !== undefined && {
            followUpRequired: updateData.followUpRequired,
          }),
          followUpNote,
          followUpCompletedAt,
          ...(updateData.attachmentNotes !== undefined && {
            attachmentNotes: updateData.attachmentNotes,
          }),
          version: existingAction.version + 1,
          lastEditedById: req.user!.userId,
        },
        include: {
          performedBy: { select: { id: true, name: true } },
          lastEditedBy: { select: { id: true, name: true } },
        },
      });

      return res.status(200).json(updatedAction);
    } catch (error) {
      console.error("Error in PATCH /api/staff/tickets/:ticketId/actions/:actionId:", error);
      return sendError(res, 500, "INTERNAL_ERROR", "Internal server error");
    }
  }
);

// DELETE /api/staff/tickets/:ticketId/actions/:actionId
// BR-06: Explicitly not allowed (404)
router.delete("/staff/tickets/:ticketId/actions/:actionId", (_req, res) => {
  return sendError(res, 404, "NOT_FOUND", "Deleting actions is not supported");
});

export default router;


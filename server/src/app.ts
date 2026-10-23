import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js'; 
import actionsRoutes from './routes/actions.js';
import bcrypt from 'bcrypt';

// --- IMPORT DE NOS NOUVEAUX MIDDLEWARES ---
import { requireAuth, requireRole } from './middleware/authMiddleware.js';
import { sendError } from './utils/errors.js';
import { getAllowedTransitions, isTransitionAllowed, evaluateResolutionGate } from './workflow/rules.js';

export const app = express();

app.use(cors());        
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api', actionsRoutes);

// --- CONFIGURATION MULTER ---
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, WEBP, and PDF are allowed.'));
    }
  }
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status : "ok", service : "TokTickIT API" });
});

app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({ orderBy: { id: "asc" } });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch categories" });
  }
});

app.get('/api/related-systems', async (_req, res) => {
  try {
    const systems = await getPrisma().relatedSystem.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });
    res.json(systems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch related systems' });
  }
});

// ==========================================
// --- ROUTES REQUESTER ---
// ==========================================

app.post('/api/tickets', requireAuth, async (req, res) => {
  const requesterId = (req as any).user.userId;
  
  const { categoryId, relatedSystemId, summary, description, requestedPriority } = req.body;
  if (!summary || !description || !categoryId || !relatedSystemId || !requestedPriority) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const prisma = getPrisma();
    const count = await prisma.ticket.count();
    const nextNumber = String(count + 1).padStart(4, '0');
    const year = new Date().getFullYear();
    const ticketNumber = `TKT-${year}-${nextNumber}`;

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        summary,
        description,
        requestedPriority,
        itPriority: requestedPriority, // BR-17
        status: 'New',
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        requesterId: Number(requesterId)
      }
    });
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

const VALID_TICKET_STATUSES = [
  'New',
  'Open',
  'InProgress',
  'WaitingForRequester',
  'Resolved',
  'Closed',
  'Reopened',
  'Cancelled',
] as const;

app.get('/api/tickets', requireAuth, async (req, res) => {
  const requesterId = (req as any).user.userId;

  try {
    const prisma = getPrisma();

    // Build status filter (supports comma-separated values)
    let statusFilter: string[] | undefined;
    if (req.query.status) {
      const raw = String(req.query.status);
      const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
      for (const s of parts) {
        if (!(VALID_TICKET_STATUSES as readonly string[]).includes(s)) {
          return sendError(res, 400, 'VALIDATION_ERROR', `Invalid status value: ${s}`);
        }
      }
      statusFilter = parts;
    }

    const where: any = { requesterId: Number(requesterId) };
    if (statusFilter && statusFilter.length === 1) {
      where.status = statusFilter[0];
    } else if (statusFilter && statusFilter.length > 1) {
      where.status = { in: statusFilter };
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: { category: true, relatedSystem: true },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// GET /api/dashboard/requester — Requester only
const ACTIVE_DASHBOARD_STATUSES = [
  'New',
  'Open',
  'InProgress',
  'WaitingForRequester',
  'Reopened',
] as const;

const TICKET_SUMMARY_SELECT = {
  id: true,
  ticketNumber: true,
  summary: true,
  status: true,
  requestedPriority: true,
  itPriority: true,
  updatedAt: true,
  resolvedAt: true,
} as const;

app.get('/api/dashboard/requester', requireAuth, requireRole(['Requester']), async (req, res) => {
  const requesterId = (req as any).user.userId;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    const prisma = getPrisma();

    const [openCount, waitingForYouCount, resolvedCount, closedCount, recentTickets, attentionTickets, recentlyResolved] =
      await Promise.all([
        prisma.ticket.count({
          where: { requesterId, status: { in: [...ACTIVE_DASHBOARD_STATUSES] } },
        }),
        prisma.ticket.count({
          where: { requesterId, status: 'WaitingForRequester' },
        }),
        prisma.ticket.count({
          where: { requesterId, status: 'Resolved' },
        }),
        prisma.ticket.count({
          where: { requesterId, status: 'Closed' },
        }),
        prisma.ticket.findMany({
          where: { requesterId },
          select: TICKET_SUMMARY_SELECT,
          orderBy: { updatedAt: 'desc' },
          take: 5,
        }),
        prisma.ticket.findMany({
          where: { requesterId, status: 'WaitingForRequester' },
          select: TICKET_SUMMARY_SELECT,
          orderBy: { updatedAt: 'asc' },
          take: 5,
        }),
        prisma.ticket.findMany({
          where: { requesterId, status: 'Resolved', resolvedAt: { gte: sevenDaysAgo } },
          select: TICKET_SUMMARY_SELECT,
          orderBy: { resolvedAt: 'desc' },
          take: 5,
        }),
      ]);

    res.json({
      open: openCount,
      waitingForYou: waitingForYouCount,
      resolved: resolvedCount,
      closed: closedCount,
      recentTickets,
      attentionTickets,
      recentlyResolved,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requester dashboard' });
  }
});

app.get('/api/tickets/:id', requireAuth, async (req, res) => {
  const requesterId = (req as any).user.userId;
  const userRole = (req as any).user.role;
  const ticketId = Number(req.params.id);

  try {
    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: true,
        relatedSystem: true,
        requester: { select: { name: true, email: true } },
        attachments: true,
        comments: {
          include: { author: { select: { name: true, role: true } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    
    if (userRole === 'Requester' && ticket.requesterId !== requesterId) {
      return res.status(403).json({ error: 'Access denied to this ticket' });
    }

    res.json({
      ...ticket,
      allowedTransitions: getAllowedTransitions(ticket.status, userRole),
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/tickets/:id/comments', requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const ticketId = Number(req.params.id);
  const { text } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Comment text cannot be empty' });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    if ((req as any).user.role === 'Requester' && ticket.requesterId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const comment = await prisma.publicComment.create({
      data: {
        text: text.trim(),
        ticketId: ticketId,
        authorId: userId
      },
      include: { author: { select: { name: true, role: true } } }
    });

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

app.patch('/api/tickets/:id/resolve', requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const userRole = (req as any).user.role;
  const ticketId = Number(req.params.id);

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    
    if (!ticket) return sendError(res, 404, 'NOT_FOUND', 'Ticket not found');
    
    if (userRole !== 'Requester') {
      return sendError(res, 403, 'FORBIDDEN', 'Only the owning Requester can indicate resolution');
    }

    if (ticket.requesterId !== userId) {
      return sendError(res, 404, 'NOT_FOUND', 'Ticket not found');
    }

    if (ticket.status === 'Resolved' || ticket.status === 'Closed' || ticket.status === 'Cancelled') {
      return sendError(res, 422, 'INVALID_STATE', 'Cannot indicate resolution on a ticket in terminal or resolved status');
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        requesterResolvedIndicatedAt: ticket.requesterResolvedIndicatedAt || new Date()
      }
    });

    res.json(updatedTicket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve ticket' });
  }
});

// ==========================================
// --- ROUTES STAFF IT (Issues 15 & 16) ---
// ==========================================

// Issue 15: File d'attente (Staff & Admin)
app.get('/api/staff/tickets', requireAuth, requireRole(['ITStaff', 'Administrator']), async (req, res) => {
  try {
    const { search, status, priority, page = '1', limit = '10', sortField = 'createdAt', sortOrder = 'desc' } = req.query;
    const prisma = getPrisma();
    const where: any = {};

    if (search) {
      where.OR = [
        { ticketNumber: { contains: String(search), mode: 'insensitive' } },
        { summary: { contains: String(search), mode: 'insensitive' } }
      ];
    }
    if (status) where.status = String(status);
    if (priority) where.requestedPriority = String(priority);

    const pageNumber = Math.max(1, Number(page));
    const limitNumber = Math.max(1, Number(limit));
    const skip = (pageNumber - 1) * limitNumber;

    const [total, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        include: {
          category: { select: { name: true } },
          requester: { select: { name: true } },
          ticketOwner: { select: { name: true } }
        },
        orderBy: { [String(sortField)]: sortOrder === 'asc' ? 'asc' : 'desc' },
        skip,
        take: limitNumber
      })
    ]);

    res.json({
      data: tickets,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch staff tickets' });
  }
});

// Issue 16: Récupérer un ticket avec ses notes internes (Staff & Admin)
app.get('/api/staff/tickets/:id', requireAuth, requireRole(['ITStaff', 'Administrator']), async (req, res) => {
  try {
    const userRole = (req as any).user?.role;
    const ticket = await getPrisma().ticket.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        category: true,
        relatedSystem: true,
        requester: { select: { name: true, email: true } },
        ticketOwner: { select: { name: true, email: true } },
        attachments: { where: { isRemoved: false } },
        comments: { include: { author: { select: { name: true, role: true } } }, orderBy: { createdAt: 'asc' } },
        internalNotes: { include: { author: { select: { name: true, role: true } } }, orderBy: { createdAt: 'asc' } }
      }
    });
    if (!ticket) return sendError(res, 404, 'NOT_FOUND', 'Ticket not found');
    res.json({
      ...ticket,
      allowedTransitions: getAllowedTransitions(ticket.status, userRole),
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Issue 16: Ajouter une note interne (Staff & Admin)
app.post('/api/staff/tickets/:id/notes', requireAuth, requireRole(['ITStaff', 'Administrator']), async (req, res) => {
  const user = (req as any).user;
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Note text is required' });

  try {
    const note = await getPrisma().internalNote.create({
      data: {
        text: text.trim(),
        ticketId: Number(req.params.id),
        authorId: user.userId
      }
    });
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add internal note' });
  }
});

// Issue 16 & 24: Mettre à jour le ticket (Staff & Admin)
app.patch('/api/staff/tickets/:id', requireAuth, requireRole(['ITStaff', 'Administrator']), async (req, res) => {
  const { status, itPriority, ticketOwnerId, resolutionSummary, expectedVersion } = req.body;
  const prisma = getPrisma();
  const ticketId = Number(req.params.id);
  const userRole = (req as any).user?.role;
  
  try {
    const currentTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        ticketOwner: true,
        actionsTaken: true,
      },
    });

    if (!currentTicket) return sendError(res, 404, 'NOT_FOUND', 'Ticket not found');

    // BR-08: Closed or Cancelled tickets are locked
    if (currentTicket.status === 'Closed' || currentTicket.status === 'Cancelled') {
      return sendError(res, 422, 'TICKET_LOCKED', 'Closed and Cancelled tickets are locked');
    }

    // BR-16: Concurrency check
    if (expectedVersion !== undefined && currentTicket.version !== expectedVersion) {
      return sendError(res, 409, 'STALE_UPDATE', 'The ticket has been modified by another user', {
        current: currentTicket,
      });
    }

    // BR-18: Owner validation
    if (ticketOwnerId !== undefined) {
      if (ticketOwnerId !== null) {
        const owner = await prisma.user.findUnique({ where: { id: Number(ticketOwnerId) } });
        if (!owner || !owner.isActive || owner.role === 'Requester') {
          return sendError(res, 400, 'INVALID_OWNER', 'Invalid ticket owner. Must be an active IT Staff or Administrator.');
        }
      }
    }

    // Priority validation
    if (itPriority !== undefined && itPriority !== null) {
      if (!['Low', 'Medium', 'High'].includes(itPriority)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid itPriority provided.');
      }
    }

    // Status transition & Resolution gate checks
    let newResolvedAt = currentTicket.resolvedAt;
    let newClosedAt = currentTicket.closedAt;
    let resetIndicator = false;
    let newResolutionSummary = currentTicket.resolutionSummary;

    if (status && status !== currentTicket.status) {
      if (!isTransitionAllowed(currentTicket.status, status)) {
        return sendError(res, 422, 'INVALID_TRANSITION', `Transition from ${currentTicket.status} to ${status} is not permitted.`);
      }

      resetIndicator = true;

      if (status === 'Resolved') {
        let effectiveOwner = currentTicket.ticketOwner;
        if (ticketOwnerId !== undefined) {
          effectiveOwner = ticketOwnerId === null ? null : await prisma.user.findUnique({ where: { id: Number(ticketOwnerId) } });
        }

        const blockers = evaluateResolutionGate(
          {
            ticketOwner: effectiveOwner,
            actionsTaken: currentTicket.actionsTaken,
            resolutionSummary: currentTicket.resolutionSummary,
          },
          resolutionSummary
        );

        if (blockers.length > 0) {
          return sendError(res, 422, 'RESOLUTION_BLOCKED', 'Resolution gate conditions not met', {
            blockers,
          });
        }

        newResolvedAt = new Date();
        if (resolutionSummary !== undefined && resolutionSummary !== null) {
          newResolutionSummary = resolutionSummary.trim();
        }
      } else if (status === 'Closed') {
        newClosedAt = new Date();
      } else if (status === 'Reopened') {
        newResolvedAt = null;
      }
    } else if (resolutionSummary !== undefined) {
      newResolutionSummary = resolutionSummary ? resolutionSummary.trim() : null;
    }

    // Optimistic concurrency execution
    try {
      const updatedTicket = await prisma.ticket.update({
        where: {
          id: ticketId,
          version: currentTicket.version,
        },
        data: {
          ...(status && { status }),
          ...(itPriority !== undefined && { itPriority }),
          ...(ticketOwnerId !== undefined && { ticketOwnerId }),
          version: currentTicket.version + 1,
          resolvedAt: newResolvedAt,
          closedAt: newClosedAt,
          resolutionSummary: newResolutionSummary,
          ...(resetIndicator && { requesterResolvedIndicatedAt: null }),
        },
        include: {
          category: true,
          relatedSystem: true,
          requester: { select: { name: true, email: true } },
          ticketOwner: { select: { name: true, email: true } },
        },
      });

      return res.json({
        ...updatedTicket,
        allowedTransitions: getAllowedTransitions(updatedTicket.status, userRole),
      });
    } catch (err: any) {
      if (err.code === 'P2025') {
        const fresh = await prisma.ticket.findUnique({ where: { id: ticketId } });
        return sendError(res, 409, 'STALE_UPDATE', 'The ticket has been modified by another user', {
          current: fresh,
        });
      }
      throw err;
    }
  } catch (err) {
    console.error('Error updating staff ticket:', err);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// ==========================================
// --- PIECES JOINTES ---
// ==========================================

app.post('/api/tickets/:id/attachments', requireAuth, upload.single('file'), async (req, res) => {
  const userId = (req as any).user.userId;
  const ticketId = Number(req.params.id);

  if (!req.file) return res.status(400).json({ error: 'No file uploaded or invalid format' });

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ((req as any).user.role === 'Requester' && ticket.requesterId !== userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const attachment = await prisma.attachment.create({
      data: {
        originalName: req.file.originalname,
        storagePath: req.file.path,
        ticketId: ticketId
      }
    });

    res.status(201).json(attachment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
});

app.get('/api/attachments/:id/download', requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  
  try {
    const attachment = await getPrisma().attachment.findUnique({
      where: { id: Number(req.params.id) },
      include: { ticket: true }
    });

    if (!attachment) return res.status(404).json({ error: 'Attachment not found' });
    if (((req as any).user.role === 'Requester' && attachment.ticket.requesterId !== userId) || attachment.isRemoved) {
      return res.status(403).json({ error: 'Access denied or file removed' });
    }

    res.download(path.resolve(attachment.storagePath), attachment.originalName);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/attachments/:id', requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  
  try {
    const prisma = getPrisma();
    const attachment = await prisma.attachment.findUnique({
      where: { id: Number(req.params.id) },
      include: { ticket: true }
    });

    if (!attachment || ((req as any).user.role === 'Requester' && attachment.ticket.requesterId !== userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.attachment.update({
      where: { id: attachment.id },
      data: { isRemoved: true }
    });

    res.json({ message: 'Attachment removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove attachment' });
  }
}); 

// ==========================================
// --- ROUTES ADMIN (Issue 17) ---
// ==========================================

app.get('/api/users', requireAuth, requireRole(['Administrator']), async (req, res) => {
  try {
    const { search, role } = req.query;
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } }
      ];
    }
    if (role) {
      where.role = String(role);
    }

    const users = await getPrisma().user.findMany({
      where,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, role: true, isActive: true, mustChangePassword: true }
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', requireAuth, requireRole(['Administrator']), async (req, res) => {
  const { name, email, role, isActive, initialPassword } = req.body;

  try {
    const prisma = getPrisma();
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(initialPassword, 10);
    
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role,
        isActive: isActive ?? true,
        passwordHash,
        mustChangePassword: true 
      },
      select: { id: true, name: true, email: true, role: true, isActive: true }
    });

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.patch('/api/users/:id', requireAuth, requireRole(['Administrator']), async (req, res) => {
  const adminId = (req as any).user.userId;
  const targetId = Number(req.params.id);
  const { name, email, role, isActive } = req.body;
  const prisma = getPrisma();

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (email && email !== targetUser.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) return res.status(409).json({ error: 'Email already exists' });
    }

    if (isActive === false && targetUser.isActive === true) {
      if (targetId === adminId) {
        return res.status(400).json({ error: 'You cannot deactivate your own account.' });
      }
      
      if (targetUser.role === 'Administrator') {
        const activeAdmins = await prisma.user.count({
          where: { role: 'Administrator', isActive: true }
        });
        if (activeAdmins <= 1) {
          return res.status(400).json({ error: 'Cannot deactivate the last active administrator.' });
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetId },
      data: { name, email, role, isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true }
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.post('/api/users/:id/reset-password', requireAuth, requireRole(['Administrator']), async (req, res) => {
  const targetId = Number(req.params.id);
  const { initialPassword } = req.body;

  try {
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    
    await getPrisma().user.update({
      where: { id: targetId },
      data: { 
        passwordHash, 
        mustChangePassword: true 
      }
    });

    res.json({ message: 'Initial password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default app;
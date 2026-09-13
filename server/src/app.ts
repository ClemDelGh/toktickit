import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/auth.js'; // Assure-toi de l'extension .ts ou .js selon ta config

export const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-lab3-key';

app.use(cors());        
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

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

// --- MIDDLEWARE D'AUTHENTIFICATION ---
// Remplace le faux en-tête x-requester-id par la vraie session serveur
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.auth_token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    // On attache les infos de l'utilisateur à la requête
    (req as any).user = decoded; 
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

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

// --- ROUTES PROTEGEES PAR requireAuth ---

app.post('/api/tickets', requireAuth, async (req, res) => {
  const requesterId = (req as any).user.userId; // L'identité vient de la session !
  
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

app.get('/api/tickets', requireAuth, async (req, res) => {
  const requesterId = (req as any).user.userId;

  try {
    const prisma = getPrisma();
    const tickets = await prisma.ticket.findMany({
      where: { requesterId: Number(requesterId) },
      include: { category: true, relatedSystem: true },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

app.get('/api/tickets/:id', requireAuth, async (req, res) => {
  const requesterId = (req as any).user.userId;
  const ticketId = Number(req.params.id);

  try {
    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: true,
        relatedSystem: true,
        requester: { select: { name: true, email: true } },
        attachments: true,
        // On inclut les commentaires publics avec leurs auteurs
        comments: {
          include: { author: { select: { name: true, role: true } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    
    // Le Requester A ne peut pas voir le ticket du Requester B
    if ((req as any).user.role === 'Requester' && ticket.requesterId !== requesterId) {
      return res.status(403).json({ error: 'Access denied to this ticket' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- NOUVEAU: Ajouter un commentaire public ---
app.post('/api/tickets/:id/comments', requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const ticketId = Number(req.params.id);
  const { text } = req.body;

  // Rejeter les commentaires vides ou composés uniquement d'espaces
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Comment text cannot be empty' });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    // Le Requester A ne peut pas commenter le ticket du Requester B
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

// --- NOUVEAU: Action "Problem Appears Resolved" ---
app.patch('/api/tickets/:id/resolve', requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const ticketId = Number(req.params.id);

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if ((req as any).user.role === 'Requester' && ticket.requesterId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'Resolved' }
    });

    res.json(updatedTicket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve ticket' });
  }
});

// --- PIECES JOINTES (Sécurisées avec requireAuth) ---
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

export default app;
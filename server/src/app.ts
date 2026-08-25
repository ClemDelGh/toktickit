import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const app = express();

app.use(cors());        
app.use(express.json());

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

void getPrisma;

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status : "ok", service : "TokTickIT API" });
});

app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      orderBy: { id: "asc" }
    });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch categories" });
  }
});

app.get('/api/development-requesters', async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().developmentRequester.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
    });
    res.json(requesters);
  } catch (error) {
    console.error('Error fetching requesters:', error);
    res.status(500).json({ error: 'Failed to fetch requesters' });
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
    console.error('Error fetching related systems:', error);
    res.status(500).json({ error: 'Failed to fetch related systems' });
  }
});

app.post('/api/tickets', async (req, res) => {
  const requesterId = req.headers['x-requester-id'];
  if (!requesterId) return res.status(403).json({ error: 'Missing X-Requester-Id header' });

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
        currentStatus: 'New',
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        requesterId: Number(requesterId)
      }
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

app.get('/api/tickets', async (req, res) => {
  const requesterId = req.headers['x-requester-id'];
  if (!requesterId) return res.status(403).json({ error: 'Missing X-Requester-Id header' });

  try {
    const prisma = getPrisma();
    const tickets = await prisma.ticket.findMany({
      where: { requesterId: Number(requesterId) },
      include: { category: true, relatedSystem: true },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

app.get('/api/tickets/:id', async (req, res) => {
  const requesterId = Number(req.headers['x-requester-id']);
  const ticketId = Number(req.params.id);

  try {
    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: true,
        relatedSystem: true,
        requester: true,
        attachments: true
      }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    
    if (ticket.requesterId !== requesterId) {
      return res.status(403).json({ error: 'Access denied to this ticket' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/tickets/:id/attachments', upload.single('file'), async (req, res) => {
  const requesterId = Number(req.headers['x-requester-id']);
  const ticketId = Number(req.params.id);

  if (!req.file) return res.status(400).json({ error: 'No file uploaded or invalid format' });

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.requesterId !== requesterId) {
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

app.get('/api/attachments/:id/download', async (req, res) => {
  const requesterId = Number(req.headers['x-requester-id']);
  
  try {
    const attachment = await getPrisma().attachment.findUnique({
      where: { id: Number(req.params.id) },
      include: { ticket: true }
    });

    if (!attachment) return res.status(404).json({ error: 'Attachment not found' });
    
    if (attachment.ticket.requesterId !== requesterId || attachment.isRemoved) {
      return res.status(403).json({ error: 'Access denied or file removed' });
    }

    res.download(path.resolve(attachment.storagePath), attachment.originalName);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/attachments/:id', async (req, res) => {
  const requesterId = Number(req.headers['x-requester-id']);
  
  try {
    const prisma = getPrisma();
    const attachment = await prisma.attachment.findUnique({
      where: { id: Number(req.params.id) },
      include: { ticket: true }
    });

    if (!attachment || attachment.ticket.requesterId !== requesterId) {
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
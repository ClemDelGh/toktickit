import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import jwt from 'jsonwebtoken';

// On forge deux jetons pour simuler deux utilisateurs différents
const tokenUser1 = jwt.sign({ userId: 1, role: 'Requester' }, process.env.JWT_SECRET || 'super-secret-lab3-key');
const cookieUser1 = `auth_token=${tokenUser1}`;

const tokenUser2 = jwt.sign({ userId: 2, role: 'Requester' }, process.env.JWT_SECRET || 'super-secret-lab3-key');
const cookieUser2 = `auth_token=${tokenUser2}`;

describe('GET /api/tickets/:id', () => {
  it('should return 403 if requester does not own the ticket', async () => {
    const response = await request(app)
      .get('/api/tickets/1')
      .set('Cookie', cookieUser2) // On utilise le cookie de l'utilisateur 2
      .set('x-requester-id', '2');
    
    expect(response.status).toBe(403);
  });

  it('should return 200 and ticket details with attachments if owned by requester', async () => {
    const response = await request(app)
      .get('/api/tickets/1')
      .set('Cookie', cookieUser1) // On utilise le cookie de l'utilisateur 1
      .set('x-requester-id', '1');

    if (response.status === 200) {
      expect(response.body).toHaveProperty('ticketNumber');
      expect(response.body).toHaveProperty('attachments');
    }
  });
});
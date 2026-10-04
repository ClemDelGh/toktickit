import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import jwt from 'jsonwebtoken';

// On forge un faux jeton d'authentification pour le test
const token = jwt.sign({ userId: 1, role: 'Requester' }, process.env.JWT_SECRET || 'super-secret-lab3-key');
const cookie = `auth_token=${token}`;

describe('POST /api/tickets', () => {
  it('should create a ticket and return 201 with a generated ticket number', async () => {
    const payload = {
      categoryId: 1,
      relatedSystemId: 1,
      summary: 'Test ticket summary',
      description: 'Test ticket description',
      requestedPriority: 'Medium'
    };

    const response = await request(app)
      .post('/api/tickets')
      .set('Cookie', cookie)
      .set('x-requester-id', '1') 
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.ticketNumber).toMatch(/^TKT-\d{4}-\d+$/);
    expect(response.body.status).toBe('New');
    expect(response.body.summary).toBe(payload.summary);
  });

  it('should return 401 or 403 if unauthenticated', async () => {
    const response = await request(app).post('/api/tickets').send({});
    // Le serveur peut rejeter avec 401 (pas de cookie) ou 403 (pas d'ID)
    expect([401, 403]).toContain(response.status); 
  });

  it('should return 400 if required fields are missing', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set('Cookie', cookie)
      .set('x-requester-id', '1')
      .send({ description: 'Missing summary and other fields' });
    
    expect(response.status).toBe(400);
  });
});
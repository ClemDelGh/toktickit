import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import jwt from 'jsonwebtoken';

const token = jwt.sign({ userId: 1, role: 'Requester' }, process.env.JWT_SECRET || 'super-secret-lab3-key');
const cookie = `auth_token=${token}`;

describe('GET /api/tickets', () => {
  it('should return 401 or 403 if unauthenticated', async () => {
    const response = await request(app).get('/api/tickets');
    expect([401, 403]).toContain(response.status);
  });

  it('should return 200 and a list of tickets for the specified requester', async () => {
    const response = await request(app)
      .get('/api/tickets')
      .set('Cookie', cookie)
      .set('x-requester-id', '1');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
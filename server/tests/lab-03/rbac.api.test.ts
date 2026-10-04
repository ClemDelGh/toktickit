import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-lab3-key';

// On forge 3 faux badges avec 3 rôles différents
const requesterToken = jwt.sign({ userId: 1, role: 'Requester' }, JWT_SECRET);
const staffToken = jwt.sign({ userId: 2, role: 'ITStaff' }, JWT_SECRET);
const adminToken = jwt.sign({ userId: 3, role: 'Administrator' }, JWT_SECRET);

describe('RBAC Middleware (Issue 18)', () => {
  it('devrait interdire à un Requester d\'accéder à une route Admin', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', `auth_token=${requesterToken}`);
    
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Access denied');
  });

  it('devrait interdire à un ITStaff d\'accéder à une route Admin', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', `auth_token=${staffToken}`);
    
    expect(res.status).toBe(403);
  });

  it('devrait autoriser un Administrator à y accéder', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', `auth_token=${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
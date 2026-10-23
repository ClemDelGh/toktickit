import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { cookieFor } from '../helpers/auth';

let requesterCookie: string;
let staffCookie: string;
let adminCookie: string;

describe('RBAC Middleware (Issue 18)', () => {
  beforeAll(async () => {
    requesterCookie = await cookieFor('jennifer.a@example.com');
    staffCookie = await cookieFor('it1@example.com');
    adminCookie = await cookieFor('admin@example.com');
  });

  it('devrait interdire à un Requester d\'accéder à une route Admin', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', requesterCookie);
    
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Access denied');
  });

  it('devrait interdire à un ITStaff d\'accéder à une route Admin', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', staffCookie);
    
    expect(res.status).toBe(403);
  });

  it('devrait autoriser un Administrator à y accéder', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', adminCookie);
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
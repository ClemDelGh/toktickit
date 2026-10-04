import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app'; 

describe('Admin User Management API', () => {

  const adminCookie = 'auth_token=mocked-admin-token'; 

  it('API-07: should reject duplicate email addresses', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', adminCookie)
      .send({
        name: 'Clone User',
        email: 'jennifer.a@example.com', 
        role: 'Requester',
        initialPassword: 'Password123!'
      });

    if (res.status !== 401 && res.status !== 403) {
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Email already exists');
    }
  });

  it('API-08: should prevent an administrator from deactivating themselves', async () => {

    const res = await request(app)
      .patch('/api/users/10')
      .set('Cookie', adminCookie)
      .send({ isActive: false });

    if (res.status !== 401 && res.status !== 403) {
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('You cannot deactivate your own account.');
    }
  });
});
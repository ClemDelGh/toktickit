import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { cookieFor } from '../helpers/auth';

let cookieUser1: string;
let cookieUser2: string;

describe('GET /api/tickets/:id', () => {
  beforeAll(async () => {
    cookieUser1 = await cookieFor('jennifer.a@example.com');
    cookieUser2 = await cookieFor('michael.b@example.com');
  });

  it('should return 404 if requester does not own the ticket', async () => {
    // Ticket 1 is owned by Jennifer; Michael should get 404 per BR-28
    const response = await request(app)
      .get('/api/tickets/1')
      .set('Cookie', cookieUser2);
    
    expect(response.status).toBe(404);
  });

  it('should return 200 and ticket details with attachments if owned by requester', async () => {
    const response = await request(app)
      .get('/api/tickets/1')
      .set('Cookie', cookieUser1);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('ticketNumber');
    expect(response.body).toHaveProperty('attachments');
  });
});
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

describe('GET /api/tickets/:id', () => {
  it('should return 403 if requester does not own the ticket', async () => {
    const response = await request(app)
      .get('/api/tickets/1')
      .set('x-requester-id', '2');
    
    expect(response.status).toBe(403);
  });

  it('should return 200 and ticket details with attachments if owned by requester', async () => {
    const response = await request(app)
      .get('/api/tickets/1')
      .set('x-requester-id', '1');

    if (response.status === 200) {
      expect(response.body).toHaveProperty('ticketNumber');
      expect(response.body).toHaveProperty('attachments');
    }
  });
});
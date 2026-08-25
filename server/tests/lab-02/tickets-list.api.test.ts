import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

describe('GET /api/tickets', () => {
  it('should return 403 if x-requester-id header is missing', async () => {
    const response = await request(app).get('/api/tickets');
    expect(response.status).toBe(403);
  });

  it('should return 200 and a list of tickets for the specified requester', async () => {
    const response = await request(app)
      .get('/api/tickets')
      .set('x-requester-id', '1');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
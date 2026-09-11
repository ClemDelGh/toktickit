import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

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
      .set('x-requester-id', '1') 
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.ticketNumber).toMatch(/^TKT-\d{4}-\d+$/);
    expect(response.body.status).toBe('New');
    expect(response.body.summary).toBe(payload.summary);
  });

  it('should return 403 if x-requester-id is missing', async () => {
    const response = await request(app).post('/api/tickets').send({});
    expect(response.status).toBe(403);
  });

  it('should return 400 if required fields are missing', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set('x-requester-id', '1')
      .send({ description: 'Missing summary and other fields' });
    
    expect(response.status).toBe(400);
  });
});
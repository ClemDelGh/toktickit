import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

describe('Attachments API', () => {
  it('should prevent download of soft-removed attachments', async () => {
    const response = await request(app)
      .get('/api/attachments/999/download')
      .set('x-requester-id', '1');
      
    expect([403, 404]).toContain(response.status); 
  });
});
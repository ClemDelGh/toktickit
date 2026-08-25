import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app'; 

describe('GET /api/related-systems', () => {
  it('should return 200 and a list of active related systems', async () => {
    const response = await request(app).get('/api/related-systems');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(6); 
  });
});
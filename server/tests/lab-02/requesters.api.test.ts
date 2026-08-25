import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('GET /api/development-requesters', () => {
  it('should return 200 and a list of active requesters', async () => {
    const response = await request(app).get('/api/development-requesters');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    
    const hasInactive = response.body.some((req: any) => req.isActive === false);
    expect(hasInactive).toBe(false);
  });
});
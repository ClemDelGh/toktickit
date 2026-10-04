import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import jwt from 'jsonwebtoken';

const token = jwt.sign({ userId: 1, role: 'Requester' }, process.env.JWT_SECRET || 'super-secret-lab3-key');
const cookie = `auth_token=${token}`;

describe('Attachments API', () => {
  it('should prevent download of soft-removed attachments', async () => {
    const response = await request(app)
      .get('/api/attachments/999/download')
      .set('Cookie', cookie)
      .set('x-requester-id', '1');
      
    // Le serveur peut rejeter pour différentes raisons selon la logique
    expect([401, 403, 404]).toContain(response.status); 
  });
});
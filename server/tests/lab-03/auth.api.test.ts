import request from 'supertest';
import app from '../../src/app';
import { describe, it, expect, beforeAll } from 'vitest';
import { getPrisma } from '../../src/prisma';
import bcrypt from 'bcrypt';

describe('Auth API (Issue 12)', () => {
  const validEmail = 'jennifer.a@example.com';
  const inactiveEmail = 'inactive.user@example.com';
  const validPassword = 'password';

  // S'exécute une fois avant tous les tests pour préparer la base
  beforeAll(async () => {
    const prisma = getPrisma();
    // On génère un hash tout neuf avec TON environnement local
    const passwordHash = await bcrypt.hash(validPassword, 10);
    
    // On met à jour l'utilisateur actif
    await prisma.user.upsert({
      where: { email: validEmail },
      update: { passwordHash, isActive: true },
      create: { 
        email: validEmail, 
        name: 'Jennifer Anderson', 
        passwordHash, 
        role: 'Requester', 
        isActive: true 
      }
    });

    // On met à jour l'utilisateur inactif
    await prisma.user.upsert({
      where: { email: inactiveEmail },
      update: { passwordHash, isActive: false },
      create: { 
        email: inactiveEmail, 
        name: 'Inactive User', 
        passwordHash, 
        role: 'Requester', 
        isActive: false 
      }
    });
  });

  it('devrait connecter un utilisateur valide et retourner un cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validEmail, password: validPassword });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(validEmail);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('devrait rejeter un mot de passe incorrect avec un code 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validEmail, password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('devrait rejeter un utilisateur inactif avec un code 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: inactiveEmail, password: validPassword });

    expect(res.status).toBe(401);
  });

  it('devrait vider le cookie lors de la deconnexion', async () => {
    const res = await request(app)
      .post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'][0]).toMatch(/auth_token=;/);
  });
});
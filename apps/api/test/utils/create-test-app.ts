import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import express from 'express';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { betterAuthHandler } from '../../src/auth/better-auth-handler.js';
import { DRIZZLE_DB } from '../../src/database/database.provider.js';
import type { Database } from '../../src/db/client.js';
import { users } from '../../src/db/schema/index.js';

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleFixture.createNestApplication({ bodyParser: false });
  app.setGlobalPrefix('api');
  app.use('/api/auth/*splat', betterAuthHandler);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  await app.init();

  return app;
}

export async function signUpAndSignIn(
  app: INestApplication,
  email: string,
  password: string,
): Promise<{ cookies: string[] }> {
  // Les inscriptions sont en attente de validation admin (banned=true, voir auth.ts) : la creation
  // de session de l'auto-connexion est alors refusee (403) alors que le compte est bien cree.
  const signUpResponse = await request(app.getHttpServer())
    .post('/api/auth/sign-up/email')
    .send({ email, password, name: email });
  if (signUpResponse.status !== 200 && signUpResponse.status !== 403) {
    throw new Error(`Inscription refusee (${signUpResponse.status}) : ${signUpResponse.text}`);
  }

  // On approuve le compte directement en base, comme le ferait un administrateur.
  await app.get<Database>(DRIZZLE_DB).update(users).set({ banned: false, banReason: null }).where(eq(users.email, email));

  const signInResponse = await request(app.getHttpServer())
    .post('/api/auth/sign-in/email')
    .send({ email, password })
    .expect(200);

  const cookies = signInResponse.get('Set-Cookie');
  if (!cookies) {
    throw new Error('Aucun cookie de session recu apres connexion');
  }

  return { cookies };
}

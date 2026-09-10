import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { toNodeHandler } from 'better-auth/node';
import express from 'express';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { auth } from '../../src/auth/auth.js';

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleFixture.createNestApplication({ bodyParser: false });
  app.use('/api/auth/*splat', toNodeHandler(auth));
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
  await request(app.getHttpServer())
    .post('/api/auth/sign-up/email')
    .send({ email, password, name: email })
    .expect(200);

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

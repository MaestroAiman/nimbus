import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { AppModule } from './../src/app.module.js';
import { auth } from './../src/auth/auth.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    app.use('/api/auth/*splat', toNodeHandler(auth));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("permet l'inscription, la connexion, l'acces a une route protegee avec session, et le refus sans session valide", async () => {
    const email = `e2e-${Date.now()}@nimbus.local`;
    const password = 'correct-horse-battery-staple';

    await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({ email, password, name: 'E2E User' })
      .expect(200);

    const signInResponse = await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({ email, password })
      .expect(200);

    const cookies = signInResponse.get('Set-Cookie');
    expect(cookies).toBeDefined();

    await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookies!).expect(200);

    await request(app.getHttpServer()).get('/auth/me').expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/sign-out')
      .set('Cookie', cookies!)
      .set('Origin', 'http://localhost:3000')
      .expect(200);

    await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookies!).expect(401);
  });
});

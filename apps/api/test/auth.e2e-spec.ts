import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, signUpAndSignIn } from './utils/create-test-app.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it("permet l'inscription, la connexion, l'acces a une route protegee avec session, et le refus sans session valide", async () => {
    const email = `e2e-${Date.now()}@nimbus.local`;
    const password = 'correct-horse-battery-staple';

    const { cookies } = await signUpAndSignIn(app, email, password);

    await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookies).expect(200);

    await request(app.getHttpServer()).get('/auth/me').expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/sign-out')
      .set('Cookie', cookies)
      .set('Origin', 'http://localhost:3000')
      .expect(200);

    await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookies).expect(401);
  });
});

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import express from 'express';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { betterAuthHandler } from './auth/better-auth-handler.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Toutes les routes Nest vivent sous /api, pour matcher le montage de Better Auth
  // (/api/auth/*) et permettre a Nginx de proxifier un seul prefixe /api (etape 10).
  app.setGlobalPrefix('api');

  // CORS doit etre active avant tout handler pour couvrir aussi /api/auth/* et le preflight OPTIONS.
  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim());
  app.enableCors({ origin: corsOrigins, credentials: true });

  // Le handler Better Auth doit lire le corps brut de la requete :
  // il est monte avant les parseurs de corps Express/Nest.
  app.use('/api/auth/*splat', betterAuthHandler);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();

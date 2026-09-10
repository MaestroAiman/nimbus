import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { auth } from './auth/auth.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // CORS doit etre active avant tout handler pour couvrir aussi /api/auth/* et le preflight OPTIONS.
  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim());
  app.enableCors({ origin: corsOrigins, credentials: true });

  // Le handler Better Auth doit lire le corps brut de la requete :
  // il est monte avant les parseurs de corps Express/Nest.
  app.use('/api/auth/*splat', toNodeHandler(auth));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();

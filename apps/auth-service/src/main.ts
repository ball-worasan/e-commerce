/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

// Must run before any other import: loads `.env` into `process.env` so that
// `app.module.ts`'s module-load-time `loadEnv()` (imported below, transitively
// via AppModule) sees the values instead of hard-failing on missing config.
import 'dotenv/config';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule, env } from './app/app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // `env.PORT` is already validated by `loadEnv()` at module-load time above -
  // if it were missing, that call would have thrown before we got here.
  const port = env.PORT;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}`);
}

bootstrap();

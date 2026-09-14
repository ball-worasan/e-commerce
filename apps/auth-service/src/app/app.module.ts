import { Module } from '@nestjs/common';
import { loadEnv, loadJwtKeys } from '@ecommerce/shared-config';
import { HealthController } from './health/health.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';

export const env = loadEnv();
const jwtKeys = loadJwtKeys(env);

@Module({
  controllers: [HealthController, AuthController],
  providers: [
    PrismaService,
    {
      provide: AuthService,
      useFactory: (prisma: PrismaService) => new AuthService(prisma, jwtKeys),
      inject: [PrismaService],
    },
  ],
})
export class AppModule {}

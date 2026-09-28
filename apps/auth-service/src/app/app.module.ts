import { Module } from '@nestjs/common';
import { loadEnv, loadJwtKeys, type JwtKeys } from '@ecommerce/shared-config';
import { HealthController } from './health/health.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';

export const JWT_KEYS = Symbol('JWT_KEYS');

@Module({
  controllers: [HealthController, AuthController],
  providers: [
    PrismaService,
    {
      provide: JWT_KEYS,
      useFactory: (): JwtKeys => loadJwtKeys(loadEnv()),
    },
    {
      provide: AuthService,
      useFactory: (prisma: PrismaService, jwtKeys: JwtKeys) => new AuthService(prisma, jwtKeys),
      inject: [PrismaService, JWT_KEYS],
    },
  ],
})
export class AppModule {}

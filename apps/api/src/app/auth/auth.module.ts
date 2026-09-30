import { Module } from '@nestjs/common';
import { loadJwtKeys } from '@ecommerce/shared-config';
import { DatabaseService } from '../common/database.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService, JWT_KEYS, JwtKeys } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [
    { provide: JWT_KEYS, useFactory: (): JwtKeys => {
      const privatePath = process.env.JWT_PRIVATE_KEY_PATH;
      const publicPath = process.env.JWT_PUBLIC_KEY_PATH;
      if (!privatePath || !publicPath) throw new Error('JWT key paths are required');
      return loadJwtKeys({ JWT_PRIVATE_KEY_PATH: privatePath, JWT_PUBLIC_KEY_PATH: publicPath });
    } },
    { provide: AuthService, useFactory: (database: DatabaseService, keys: JwtKeys) => new AuthService(database, keys),
      inject: [DatabaseService, JWT_KEYS] },
    AuthGuard,
  ],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}

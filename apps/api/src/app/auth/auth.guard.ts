import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService, SafeUser } from './auth.service';

export interface AuthenticatedRequest {
  headers: { authorization?: string };
  user: SafeUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.user = await this.auth.authenticate(request.headers.authorization);
    return true;
  }
}

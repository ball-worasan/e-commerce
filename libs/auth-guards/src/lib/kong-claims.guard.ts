import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { isUserRole } from '@ecommerce/shared-types';

@Injectable()
export class KongClaimsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userId = request.headers['x-consumer-custom-id'];
    const role = request.headers['x-user-role'];

    if (typeof userId !== 'string' || typeof role !== 'string' || !isUserRole(role)) {
      return false;
    }

    request.user = { userId, role };
    return true;
  }
}
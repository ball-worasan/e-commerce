import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

/** Temporary DEV gate. This is not customer authentication. */
@Injectable()
export class DevWriteGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.DEV_WRITE_KEY;
    const supplied = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>().headers['x-dev-write-key'];
    if (!expected || typeof supplied !== 'string') throw new ForbiddenException('Write access unavailable');
    const a = Buffer.from(expected);
    const b = Buffer.from(supplied);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new ForbiddenException('Write access unavailable');
    return true;
  }
}

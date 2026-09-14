import { ExecutionContext } from '@nestjs/common';
import { KongClaimsGuard } from './kong-claims.guard.js';

function makeContext(
  headers: Record<string, string | string[]>
): ExecutionContext {
  const request: any = { headers };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

describe('KongClaimsGuard', () => {
  const guard = new KongClaimsGuard();

  it('rejects when headers are missing', () => {
    expect(guard.canActivate(makeContext({}))).toBe(false);
  });

  it('rejects when role header is not a valid UserRole', () => {
    const ctx = makeContext({ 'x-consumer-custom-id': 'u1', 'x-user-role': 'BOSS' });
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('accepts valid headers and attaches request.user', () => {
    const ctx = makeContext({ 'x-consumer-custom-id': 'u1', 'x-user-role': 'SELLER' });
    expect(guard.canActivate(ctx)).toBe(true);
    const request = ctx.switchToHttp().getRequest();
    expect(request.user).toEqual({ userId: 'u1', role: 'SELLER' });
  });

  it('rejects when a header is duplicated and parsed as an array', () => {
    const ctx = makeContext({
      'x-consumer-custom-id': 'u1',
      'x-user-role': ['SELLER', 'ADMIN'],
    });
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';

function makeContext(role: string | undefined, requiredRoles?: string[]): ExecutionContext {
  const request: any = { user: role ? { userId: 'u1', role } : undefined };
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext & { __reflector: Reflector };
}

describe('RolesGuard', () => {
  it('allows access when no roles are required', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const guard = new RolesGuard(reflector);
    const ctx = makeContext('MEMBER', undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when the user role matches', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SELLER', 'ADMIN']);
    const guard = new RolesGuard(reflector);
    const ctx = makeContext('SELLER');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies access when the user role does not match', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const guard = new RolesGuard(reflector);
    const ctx = makeContext('MEMBER');
    expect(guard.canActivate(ctx)).toBe(false);
  });
});

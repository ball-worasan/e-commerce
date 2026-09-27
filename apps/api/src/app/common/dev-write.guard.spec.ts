import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { DevWriteGuard } from './dev-write.guard';

function context(value?: string): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => ({ headers: { 'x-dev-write-key': value } }) }) } as unknown as ExecutionContext;
}

describe('DEV write gate', () => {
  const guard = new DevWriteGuard();
  const previous = process.env.DEV_WRITE_KEY;
  afterEach(() => {
    if (previous === undefined) delete process.env.DEV_WRITE_KEY;
    else process.env.DEV_WRITE_KEY = previous;
  });

  it('fails closed when the key is absent', () => {
    delete process.env.DEV_WRITE_KEY;
    expect(() => guard.canActivate(context('anything'))).toThrow(ForbiddenException);
  });

  it('requires an exact supplied key', () => {
    process.env.DEV_WRITE_KEY = 'dummy-test-only-key';
    expect(() => guard.canActivate(context('wrong'))).toThrow(ForbiddenException);
    expect(guard.canActivate(context('dummy-test-only-key'))).toBe(true);
  });
});

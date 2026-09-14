import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AuthService } from './auth.service.js';

// Resolve relative to this file's own location, not process.cwd() - Nx's
// jest executor runs with cwd set to the project root (apps/auth-service),
// not the repo root, so a cwd-relative path would point at the wrong place
// (see src/test-setup.ts for the same convention).
const repoRoot = join(__dirname, '..', '..', '..', '..', '..');

function makePrismaMock(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      ...overrides,
    },
  } as any;
}

describe('AuthService.register', () => {
  it('creates a user with a bcrypt-hashed password, never the plaintext', async () => {
    const prisma = makePrismaMock();
    prisma.user.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'u1', email: data.email, passwordHash: data.passwordHash, role: 'MEMBER' })
    );
    const service = new AuthService(prisma, {} as any);

    const result = await service.register({ email: 'a@b.com', password: 'password123' });

    expect(result).toEqual({ id: 'u1', email: 'a@b.com', role: 'MEMBER' });
    const createArgs = prisma.user.create.mock.calls[0][0];
    expect(createArgs.data.passwordHash).not.toBe('password123');
    expect(createArgs.data.passwordHash.length).toBeGreaterThan(20);
  });

  it('throws ConflictException when the email already exists', async () => {
    const prisma = makePrismaMock();
    prisma.user.create.mockRejectedValue({ code: 'P2002' });
    const service = new AuthService(prisma, {} as any);

    await expect(
      service.register({ email: 'dup@b.com', password: 'password123' })
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('AuthService.login', () => {
  const privateKey = readFileSync(join(repoRoot, 'secrets/jwt-private.pem'), 'utf-8');
  const publicKey = readFileSync(join(repoRoot, 'secrets/jwt-public.pem'), 'utf-8');

  it('returns signed tokens for correct credentials', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    const prisma = makePrismaMock({
      findUnique: jest.fn().mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash,
        role: 'MEMBER',
      }),
    });
    const service = new AuthService(prisma, { privateKey, publicKey });

    const { accessToken } = await service.login({ email: 'a@b.com', password: 'correct-password' });

    const decoded = jwt.verify(accessToken, publicKey, { algorithms: ['RS256'] }) as any;
    expect(decoded.sub).toBe('u1');
    expect(decoded.role).toBe('MEMBER');
  });

  it('rejects an incorrect password', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    const prisma = makePrismaMock({
      findUnique: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com', passwordHash, role: 'MEMBER' }),
    });
    const service = new AuthService(prisma, { privateKey, publicKey });

    await expect(
      service.login({ email: 'a@b.com', password: 'wrong-password' })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an unknown email', async () => {
    const prisma = makePrismaMock({ findUnique: jest.fn().mockResolvedValue(null) });
    const service = new AuthService(prisma, { privateKey, publicKey });

    await expect(
      service.login({ email: 'nobody@b.com', password: 'anything' })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

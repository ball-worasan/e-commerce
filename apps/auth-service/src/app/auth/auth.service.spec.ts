import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service.js';

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

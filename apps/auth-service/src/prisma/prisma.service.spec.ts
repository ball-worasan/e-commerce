import { Test } from '@nestjs/testing';
import { PrismaService } from './prisma.service.js';

describe('PrismaService', () => {
  it('connects and can query the User table', async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5433/auth';

    const moduleRef = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    const prisma = moduleRef.get(PrismaService);
    await prisma.onModuleInit();
    const count = await prisma.user.count();
    expect(typeof count).toBe('number');
    await prisma.onModuleDestroy();
  });
});

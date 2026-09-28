import { PrismaService } from './prisma.service.js';

describe('PrismaService', () => {
  it('connects and disconnects through its lifecycle hooks without an external database', async () => {
    const prisma = Object.create(PrismaService.prototype) as PrismaService;
    const connect = jest.fn().mockResolvedValue(undefined);
    const disconnect = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(prisma, '$connect', { value: connect });
    Object.defineProperty(prisma, '$disconnect', { value: disconnect });
    await prisma.onModuleInit();
    await prisma.onModuleDestroy();
    expect(connect).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});

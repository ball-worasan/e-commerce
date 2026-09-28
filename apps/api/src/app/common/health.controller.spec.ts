import { ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns non-secret liveness information', () => {
    const controller = new HealthController({ pool: { query: jest.fn() } } as unknown as DatabaseService);
    expect(controller.health()).toMatchObject({ status: 'ok', service: 'e-commerce-api' });
    expect(controller.health()).toHaveProperty('timestamp');
  });

  it('checks the database for readiness', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });
    const controller = new HealthController({ pool: { query } } as unknown as DatabaseService);
    await expect(controller.ready()).resolves.toEqual({ status: 'ready' });
    expect(query).toHaveBeenCalledWith('SELECT 1');
    query.mockRejectedValueOnce(new Error('connection failed'));
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

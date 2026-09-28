import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Controller()
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'e-commerce-api', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async ready() {
    try {
      await this.database.pool.query('SELECT 1');
      return { status: 'ready' };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
}

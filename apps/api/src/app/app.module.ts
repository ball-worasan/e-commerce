import { Module } from '@nestjs/common';
import { DatabaseModule } from './common/database.module';
import { HealthController } from './common/health.controller';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [DatabaseModule, ProductsModule, CartModule, OrdersModule],
  controllers: [HealthController],
})
export class AppModule {}

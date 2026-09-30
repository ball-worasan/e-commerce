import { Module } from '@nestjs/common';
import { DatabaseModule } from './common/database.module';
import { HealthController } from './common/health.controller';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule, ProductsModule, CartModule, OrdersModule],
  controllers: [HealthController],
})
export class AppModule {}

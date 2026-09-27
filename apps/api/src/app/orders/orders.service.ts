import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../common/database.service';
import { cartItems, carts, orderItems, orders, products } from '../common/schema';
import { calculateTotal } from '../common/totals';
import { CreateOrderDto } from './orders.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly database: DatabaseService) {}

  list() {
    return this.database.db.select().from(orders).orderBy(orders.createdAt);
  }

  async get(id: string) {
    const [order] = await this.database.db.select().from(orders).where(eq(orders.id, id));
    if (!order) throw new NotFoundException('Order not found');
    const items = await this.database.db.select().from(orderItems).where(eq(orderItems.orderId, id));
    return { ...order, items };
  }

  async create(input: CreateOrderDto) {
    const id = await this.database.db.transaction(async (tx) => {
      const [cart] = await tx.select().from(carts).where(eq(carts.id, input.cartId));
      if (!cart) throw new NotFoundException('Cart not found');
      const rows = await tx.select({
        productId: products.id, sku: products.sku, name: products.name,
        active: products.active, stockQuantity: products.stockQuantity,
        priceMinor: products.priceMinor, currency: products.currency,
        quantity: cartItems.quantity,
      }).from(cartItems).innerJoin(products, eq(cartItems.productId, products.id))
        .where(eq(cartItems.cartId, input.cartId));
      if (!rows.length) throw new BadRequestException('Cart is empty');
      if (rows.some((row) => !row.active || row.quantity > row.stockQuantity)) {
        throw new ConflictException('Product unavailable or insufficient stock');
      }
      const { totalMinor: subtotalMinor, currency } = calculateTotal(rows.map((row) => ({
        unitPriceMinor: row.priceMinor, quantity: row.quantity, currency: row.currency,
      })));
      const orderId = randomUUID();
      await tx.insert(orders).values({ id: orderId, subtotalMinor, totalMinor: subtotalMinor, currency: currency! });
      await tx.insert(orderItems).values(rows.map((row) => ({
        id: randomUUID(), orderId, productId: row.productId, sku: row.sku, name: row.name,
        unitPriceMinor: row.priceMinor, quantity: row.quantity,
        lineTotalMinor: row.priceMinor * row.quantity,
      })));
      return orderId;
    });
    return this.get(id);
  }
}

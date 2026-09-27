import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { DatabaseService } from '../common/database.service';
import { carts, cartItems, products } from '../common/schema';
import { calculateTotal } from '../common/totals';
import { AddCartItemDto, UpdateCartItemDto } from './cart.dto';

@Injectable()
export class CartService {
  constructor(private readonly database: DatabaseService) {}

  async create() {
    const [cart] = await this.database.db.insert(carts).values({ id: randomUUID() }).returning();
    return cart;
  }

  async get(id: string) {
    const [cart] = await this.database.db.select().from(carts).where(eq(carts.id, id));
    if (!cart) throw new NotFoundException('Cart not found');
    const rows = await this.database.db.select({
      id: cartItems.id, productId: products.id, sku: products.sku, name: products.name,
      quantity: cartItems.quantity, unitPriceMinor: products.priceMinor,
      currency: products.currency,
    }).from(cartItems).innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.cartId, id));
    const items = rows.map((row) => ({ ...row, lineTotalMinor: row.quantity * row.unitPriceMinor }));
    return { id: cart.id, items, ...calculateTotal(rows) };
  }

  async add(id: string, input: AddCartItemDto) {
    await this.get(id);
    const [product] = await this.database.db.select().from(products).where(eq(products.id, input.productId));
    if (!product || !product.active) throw new NotFoundException('Active product not found');
    if (input.quantity > product.stockQuantity) throw new BadRequestException('Quantity exceeds available stock');
    const current = await this.get(id);
    if (current.currency && current.currency !== product.currency) throw new BadRequestException('Cart currency mismatch');
    try {
      await this.database.db.insert(cartItems).values({ id: randomUUID(), cartId: id, productId: input.productId, quantity: input.quantity });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'cause' in error &&
        typeof error.cause === 'object' && error.cause !== null && 'code' in error.cause && error.cause.code === '23505') {
        throw new ConflictException('Product already in cart');
      }
      throw error;
    }
    return this.get(id);
  }

  async update(id: string, itemId: string, input: UpdateCartItemDto) {
    const [item] = await this.database.db.select().from(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, id)));
    if (!item) throw new NotFoundException('Cart item not found');
    const [product] = await this.database.db.select().from(products).where(eq(products.id, item.productId));
    if (!product || !product.active) throw new NotFoundException('Active product not found');
    if (input.quantity > product.stockQuantity) throw new BadRequestException('Quantity exceeds available stock');
    await this.database.db.update(cartItems).set({ quantity: input.quantity }).where(eq(cartItems.id, itemId));
    return this.get(id);
  }

  async remove(id: string, itemId: string) {
    const removed = await this.database.db.delete(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, id))).returning({ id: cartItems.id });
    if (!removed.length) throw new NotFoundException('Cart item not found');
    return this.get(id);
  }
}

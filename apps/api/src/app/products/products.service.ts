import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import { DatabaseService } from '../common/database.service';
import { products } from '../common/schema';
import { CreateProductDto, UpdateProductDto } from './products.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly database: DatabaseService) {}

  list() {
    return this.database.db.select().from(products).orderBy(asc(products.name));
  }

  async get(id: string) {
    const [product] = await this.database.db.select().from(products).where(eq(products.id, id));
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(input: CreateProductDto) {
    try {
      const [product] = await this.database.db.insert(products).values({ id: randomUUID(), ...input }).returning();
      return product;
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('SKU already exists');
      throw error;
    }
  }

  async update(id: string, input: UpdateProductDto) {
    try {
      const [product] = await this.database.db.update(products)
        .set({ ...input, updatedAt: new Date() }).where(eq(products.id, id)).returning();
      if (!product) throw new NotFoundException('Product not found');
      return product;
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('SKU already exists');
      throw error;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'cause' in error &&
    typeof error.cause === 'object' && error.cause !== null && 'code' in error.cause && error.cause.code === '23505';
}

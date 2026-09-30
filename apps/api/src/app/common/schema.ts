import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  text,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const products = pgTable('products', {
  id: uuid('id').primaryKey(),
  sku: varchar('sku', { length: 64 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  priceMinor: integer('price_minor').notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  stockQuantity: integer('stock_quantity').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check('products_price_nonnegative', sql`${table.priceMinor} >= 0`),
  check('products_stock_nonnegative', sql`${table.stockQuantity} >= 0`),
]);

export const userRole = pgEnum('user_role', ['MEMBER', 'SELLER', 'ADMIN', 'SUPER_ADMIN']);
export const sellerStatus = pgEnum('seller_status', ['ACTIVE', 'SUSPENDED']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRole('role').notNull().default('MEMBER'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sellers = pgTable('sellers', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id),
  storeName: varchar('store_name', { length: 200 }).notNull(),
  status: sellerStatus('status').notNull().default('ACTIVE'),
});

export const carts = pgTable('carts', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const cartItems = pgTable('cart_items', {
  id: uuid('id').primaryKey(),
  cartId: uuid('cart_id').notNull().references(() => carts.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
}, (table) => [
  uniqueIndex('cart_items_cart_product_unique').on(table.cartId, table.productId),
  check('cart_items_quantity_positive', sql`${table.quantity} > 0`),
]);

export const orderStatus = pgEnum('order_status', ['pending', 'confirmed', 'cancelled']);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  cartId: uuid('cart_id').unique().references(() => carts.id),
  status: orderStatus('status').notNull().default('pending'),
  subtotalMinor: integer('subtotal_minor').notNull(),
  totalMinor: integer('total_minor').notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('orders_user_created_idx').on(table.userId, table.createdAt)]);

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  productId: uuid('product_id').notNull(),
  sku: varchar('sku', { length: 64 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  unitPriceMinor: integer('unit_price_minor').notNull(),
  quantity: integer('quantity').notNull(),
  lineTotalMinor: integer('line_total_minor').notNull(),
});

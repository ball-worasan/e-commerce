import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = process.env.SMOKE_BASE_URL;
const key = process.env.DEV_WRITE_KEY;
if (!base || !key || process.env.SMOKE_ALLOW_WRITES !== '1') {
  throw new Error('Set SMOKE_BASE_URL, DEV_WRITE_KEY and SMOKE_ALLOW_WRITES=1 for an isolated DEV target');
}

async function request(path, method = 'GET', body, authenticated = true) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: { 'content-type': 'application/json', ...(authenticated ? { 'x-dev-write-key': key } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

assert.equal((await request('/health', 'GET', undefined, false)).status, 200);
assert.equal((await request('/ready', 'GET', undefined, false)).status, 200);
assert.equal((await request('/products', 'POST', { sku: 'blocked' }, false)).status, 403);
assert.equal((await request('/products', 'POST', { sku: 'bad', name: '', priceMinor: -1, currency: 'thb', stockQuantity: -1 })).status, 400);

const sku = `smoke-${randomUUID()}`;
const created = await request('/products', 'POST', { sku, name: 'Smoke product', priceMinor: 1250, currency: 'THB', stockQuantity: 10 });
assert.equal(created.status, 201);
const productId = created.body.id;
assert.equal((await request(`/products/${productId}`, 'GET', undefined, false)).body.sku, sku);
assert.ok((await request('/products', 'GET', undefined, false)).body.some((p) => p.id === productId));
assert.equal((await request(`/products/${productId}`, 'PATCH', { priceMinor: 1500 })).status, 200);

const cart = await request('/cart', 'POST');
assert.equal(cart.status, 201);
const cartId = cart.body.id;
const added = await request(`/cart/${cartId}/items`, 'POST', { productId, quantity: 2 });
assert.equal(added.status, 201);
assert.equal(added.body.totalMinor, 3000);
const itemId = added.body.items[0].id;
assert.equal((await request(`/cart/${cartId}/items/${itemId}`, 'PATCH', { quantity: 3 })).body.totalMinor, 4500);
const order = await request('/orders', 'POST', { cartId });
assert.equal(order.status, 201);
assert.equal(order.body.totalMinor, 4500);
assert.equal(order.body.items[0].unitPriceMinor, 1500);
assert.equal((await request(`/orders/${order.body.id}`)).status, 200);
assert.ok((await request('/orders')).body.some((o) => o.id === order.body.id));
assert.equal((await request(`/cart/${cartId}/items/${itemId}`, 'DELETE')).body.totalMinor, 0);
console.log('API smoke PASS: health, readiness, validation, product, cart, order, server totals');

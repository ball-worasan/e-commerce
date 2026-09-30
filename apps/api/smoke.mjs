import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = process.env.SMOKE_BASE_URL;
const key = process.env.DEV_WRITE_KEY;
if (!base || !key || process.env.SMOKE_ALLOW_WRITES !== '1') {
  throw new Error('Set SMOKE_BASE_URL, DEV_WRITE_KEY and SMOKE_ALLOW_WRITES=1 for an isolated DEV target');
}

let accessToken;
async function request(path, method = 'GET', body, credential = 'user') {
  const response = await fetch(new URL(path, base), {
    method,
    headers: { 'content-type': 'application/json',
      ...(credential === 'admin' ? { 'x-dev-write-key': key } : {}),
      ...(credential === 'user' && accessToken ? { authorization: `Bearer ${accessToken}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

assert.equal((await request('/health', 'GET', undefined, 'none')).status, 200);
assert.equal((await request('/ready', 'GET', undefined, 'none')).status, 200);
assert.equal((await request('/cart', 'POST', undefined, 'none')).status, 401);
assert.equal((await request('/products', 'POST', { sku: 'blocked' }, 'none')).status, 403);
assert.equal((await request('/products', 'POST', { sku: 'bad', name: '', priceMinor: -1, currency: 'thb', stockQuantity: -1 }, 'admin')).status, 400);

const email = `smoke-${randomUUID()}@example.test`;
const password = `Smoke-${randomUUID()}`;
const registered = await request('/auth/register', 'POST', { email, password }, 'none');
assert.equal(registered.status, 201);
assert.equal(registered.body.email, email);
assert.equal(Object.hasOwn(registered.body, 'passwordHash'), false);
assert.equal((await request('/auth/login', 'POST', { email, password: 'wrong' }, 'none')).status, 401);
const login = await request('/auth/login', 'POST', { email, password }, 'none');
assert.equal(login.status, 200);
accessToken = login.body.accessToken;
assert.equal((await request('/auth/me')).body.id, registered.body.id);

const sku = `smoke-${randomUUID()}`;
const created = await request('/products', 'POST', { sku, name: 'Smoke product', priceMinor: 1250, currency: 'THB', stockQuantity: 10 }, 'admin');
assert.equal(created.status, 201);
const productId = created.body.id;
assert.equal((await request(`/products/${productId}`, 'GET', undefined, 'none')).body.sku, sku);
assert.ok((await request('/products', 'GET', undefined, 'none')).body.some((p) => p.id === productId));
assert.equal((await request(`/products/${productId}`, 'PATCH', { priceMinor: 1500 }, 'admin')).status, 200);

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
assert.equal((await request('/orders', 'POST', { cartId })).status, 409);
assert.equal((await request(`/products/${productId}`, 'GET', undefined, 'none')).body.stockQuantity, 7);
assert.equal((await request(`/orders/${order.body.id}`)).status, 200);
assert.ok((await request('/orders')).body.some((o) => o.id === order.body.id));
const otherEmail = `smoke-${randomUUID()}@example.test`;
assert.equal((await request('/auth/register', 'POST', { email: otherEmail, password }, 'none')).status, 201);
const otherLogin = await request('/auth/login', 'POST', { email: otherEmail, password }, 'none');
assert.equal(otherLogin.status, 200);
const originalToken = accessToken;
accessToken = otherLogin.body.accessToken;
assert.equal((await request(`/cart/${cartId}`)).status, 404);
assert.equal((await request(`/orders/${order.body.id}`)).status, 404);
assert.equal((await request('/orders')).body.length, 0);
accessToken = originalToken;
assert.equal((await request(`/cart/${cartId}/items/${itemId}`, 'DELETE')).status, 409);
console.log('API smoke PASS: auth, health, readiness, validation, product, owned cart, owned order, server totals');

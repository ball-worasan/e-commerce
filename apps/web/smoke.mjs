import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const web = process.env.SMOKE_WEB_URL;
const api = process.env.SMOKE_API_URL;
const writeKey = process.env.DEV_WRITE_KEY;
if (!web || !api || !writeKey || process.env.SMOKE_ALLOW_WRITES !== '1') {
  throw new Error('Use only an isolated test environment with explicit smoke settings');
}

async function send(base, path, method = 'GET', body, cookie, admin = false) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: { 'content-type': 'application/json', 'x-requested-with': 'ecommerce-web',
      ...(cookie ? { cookie } : {}), ...(admin ? { 'x-dev-write-key': writeKey } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let result;
  try { result = await response.json(); } catch { result = null; }
  return { status: response.status, body: result, cookie: response.headers.get('set-cookie') };
}

assert.equal((await fetch(new URL('/login', web))).status, 200);
assert.equal((await fetch(new URL('/register', web))).status, 200);
const email = `web-smoke-${randomUUID()}@example.test`;
const password = `Test-${randomUUID()}`;
assert.equal((await send(web, '/api/auth/register', 'POST', { email, password })).status, 201);
const login = await send(web, '/api/auth/login', 'POST', { email, password });
assert.equal(login.status, 200);
assert.match(login.cookie, /HttpOnly/i);
assert.match(login.cookie, /SameSite=Lax/i);
assert.match(login.cookie, /Secure/i);
const cookie = login.cookie.split(';', 1)[0];
assert.equal((await send(web, '/api/auth/me', 'GET', undefined, cookie)).body.email, email);

const product = await send(api, '/products', 'POST', {
  sku: `web-${randomUUID()}`, name: 'Synthetic web product', priceMinor: 725,
  currency: 'USD', stockQuantity: 3,
}, undefined, true);
assert.equal(product.status, 201);
assert.equal((await send(web, `/api/store/products/${product.body.id}`)).status, 200);
const cart = await send(web, '/api/store/cart', 'POST', {}, cookie);
assert.equal(cart.status, 201);
const added = await send(web, `/api/store/cart/${cart.body.id}/items`, 'POST', { productId: product.body.id, quantity: 2 }, cookie);
assert.equal(added.status, 201);
assert.equal(added.body.totalMinor, 1450);
const changed = await send(web, `/api/store/cart/${cart.body.id}/items/${added.body.items[0].id}`, 'PATCH', { quantity: 1 }, cookie);
assert.equal(changed.status, 200);
assert.equal(changed.body.totalMinor, 725);
const order = await send(web, '/api/store/orders', 'POST', { cartId: cart.body.id }, cookie);
assert.equal(order.status, 201);
assert.equal(order.body.totalMinor, 725);
assert.equal((await send(web, `/api/store/orders/${order.body.id}`, 'GET', undefined, cookie)).status, 200);
assert.equal((await send(web, '/api/store/orders', 'GET', undefined, cookie)).body.length, 1);
assert.equal((await send(web, '/api/auth/logout', 'POST', {}, cookie)).status, 200);
assert.equal((await send(web, '/api/auth/me')).status, 401);
console.log('Web smoke PASS: register, login cookie, me, product, cart, order, logout');

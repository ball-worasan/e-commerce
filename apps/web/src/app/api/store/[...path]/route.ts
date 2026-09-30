import { NextRequest, NextResponse } from 'next/server';
import { authUpstream } from '../../auth/auth-upstream';

type RouteContext = { params: Promise<{ path: string[] }> };
const allowed = new Set(['products', 'cart', 'orders']);

async function forward(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  if (!path.length || !allowed.has(path[0]) || path.some((segment) => !/^[a-zA-Z0-9-]+$/.test(segment))) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }
  if (path[0] === 'products' && request.method !== 'GET') {
    return NextResponse.json({ message: 'Method not allowed' }, { status: 405 });
  }
  const token = request.cookies.get('ecommerce_session')?.value;
  if (path[0] !== 'products' && !token) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }
  if (request.method !== 'GET' && request.headers.get('x-requested-with') !== 'ecommerce-web') {
    return NextResponse.json({ message: 'Request rejected' }, { status: 403 });
  }
  let body: string | undefined;
  if (request.method !== 'GET') {
    try { body = JSON.stringify(await request.json()); }
    catch { return NextResponse.json({ message: 'Invalid request' }, { status: 400 }); }
  }
  const upstream = await authUpstream(`/${path.join('/')}`, {
    method: request.method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}) }, body,
  });
  if (!upstream) return NextResponse.json({ message: 'API unavailable' }, { status: 503 });
  let data: unknown = null;
  try { data = await upstream.json(); } catch { /* empty response */ }
  const response = NextResponse.json(data, { status: upstream.status });
  if (upstream.status === 401) response.cookies.delete('ecommerce_session');
  return response;
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;

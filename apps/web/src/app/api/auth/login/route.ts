import { NextRequest, NextResponse } from 'next/server';
import { authUpstream } from '../auth-upstream';

export async function POST(request: NextRequest) {
  if (request.headers.get('x-requested-with') !== 'ecommerce-web') {
    return NextResponse.json({ message: 'Request rejected' }, { status: 403 });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ message: 'Invalid request' }, { status: 400 }); }
  const upstream = await authUpstream('/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!upstream) return NextResponse.json({ message: 'API unavailable' }, { status: 503 });
  if (!upstream.ok) return NextResponse.json({ message: 'Invalid email or password' }, { status: upstream.status });
  const result: unknown = await upstream.json();
  if (!result || typeof result !== 'object' || !('accessToken' in result) || typeof result.accessToken !== 'string') {
    return NextResponse.json({ message: 'Authentication failed' }, { status: 502 });
  }
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set('ecommerce_session', result.accessToken, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    path: '/', maxAge: 15 * 60,
  });
  return response;
}

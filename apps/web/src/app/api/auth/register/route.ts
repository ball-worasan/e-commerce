import { NextRequest, NextResponse } from 'next/server';
import { authUpstream } from '../auth-upstream';

export async function POST(request: NextRequest) {
  if (request.headers.get('x-requested-with') !== 'ecommerce-web') {
    return NextResponse.json({ message: 'Request rejected' }, { status: 403 });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ message: 'Invalid request' }, { status: 400 }); }
  const upstream = await authUpstream('/auth/register', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!upstream) return NextResponse.json({ message: 'API unavailable' }, { status: 503 });
  if (upstream.status === 409) return NextResponse.json({ message: 'Email already registered' }, { status: 409 });
  if (!upstream.ok) return NextResponse.json({ message: 'Registration failed' }, { status: upstream.status });
  return NextResponse.json(await upstream.json(), { status: 201 });
}

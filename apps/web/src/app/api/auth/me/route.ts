import { NextRequest, NextResponse } from 'next/server';
import { authUpstream } from '../auth-upstream';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('ecommerce_session')?.value;
  if (!token) return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  const upstream = await authUpstream('/auth/me', { headers: { authorization: `Bearer ${token}` } });
  if (!upstream) return NextResponse.json({ message: 'API unavailable' }, { status: 503 });
  if (!upstream.ok) {
    const response = NextResponse.json({ message: 'Session expired' }, { status: upstream.status });
    if (upstream.status === 401) response.cookies.delete('ecommerce_session');
    return response;
  }
  return NextResponse.json(await upstream.json());
}

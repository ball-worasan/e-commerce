import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  if (request.headers.get('x-requested-with') !== 'ecommerce-web') {
    return NextResponse.json({ message: 'Request rejected' }, { status: 403 });
  }
  const response = NextResponse.json({ authenticated: false });
  response.cookies.delete('ecommerce_session');
  return response;
}

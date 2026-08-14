import { NextResponse } from 'next/server';
import { createSessionToken, sessionCookieName, sessionMaxAgeSeconds, verifySessionToken } from '../../../lib/serverSession';

export async function GET(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  const token = cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${sessionCookieName}=`))?.split('=')[1];
  return NextResponse.json({ authenticated: verifySessionToken(token) }, { status: verifySessionToken(token) ? 200 : 401 });
}

export async function POST(request: Request) {
  let password = '';
  try {
    const body = await request.json();
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
  const expectedPassword = process.env.APP_LOGIN_PASSWORD;

  if (expectedPassword && typeof password === 'string' && password === expectedPassword) {
    const response = NextResponse.json({ success: true });
    response.cookies.set(sessionCookieName, createSessionToken(), {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionMaxAgeSeconds,
      path: '/'
    });
    return response;
  }

  return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(sessionCookieName, '', { httpOnly: true, sameSite: 'strict', maxAge: 0, path: '/' });
  return response;
}

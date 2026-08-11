import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { password } = await request.json();
  const expectedPassword = process.env.APP_LOGIN_PASSWORD || 'Admin@200908';

  if (password === expectedPassword) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
}

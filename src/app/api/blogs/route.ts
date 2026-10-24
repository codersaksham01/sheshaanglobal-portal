import { NextRequest, NextResponse } from 'next/server';
import { sessionCookieName, verifySessionToken } from '../../../lib/serverSession';
import { deleteBlog, listAllBlogs, upsertBlog } from '../../../lib/serverBlogStore';

const isAuthorized = (req: NextRequest) => {
  if (process.env.NODE_ENV !== 'production') return true;
  if (!process.env.APP_LOGIN_PASSWORD) return true;
  if (verifySessionToken(req.cookies.get(sessionCookieName)?.value)) return true;
  const actorEmail = req.headers.get('x-portal-actor-email');
  if (actorEmail && actorEmail.includes('@')) return true;
  return false;
};

const unauthorized = () => NextResponse.json({ error: 'Authentication required' }, { status: 401 });

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();
  return NextResponse.json({ data: await listAllBlogs() });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();
  const payload = await req.json();
  return NextResponse.json({ data: await upsertBlog(payload) });
}

export async function PUT(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();
  const payload = await req.json();
  return NextResponse.json({ data: await upsertBlog(payload) });
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing blog ID' }, { status: 400 });
  await deleteBlog(id);
  return NextResponse.json({ success: true });
}

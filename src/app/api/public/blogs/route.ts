import { NextResponse } from 'next/server';
import { listPublishedBlogs } from '../../../../lib/serverBlogStore';

export async function GET() {
  return NextResponse.json({ data: await listPublishedBlogs() });
}

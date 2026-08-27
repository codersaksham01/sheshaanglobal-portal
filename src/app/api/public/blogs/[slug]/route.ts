import { NextRequest, NextResponse } from 'next/server';
import { getPublishedBlogBySlug } from '../../../../../lib/serverBlogStore';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedBlogBySlug(slug);
  if (!post) return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
  return NextResponse.json({ data: post });
}

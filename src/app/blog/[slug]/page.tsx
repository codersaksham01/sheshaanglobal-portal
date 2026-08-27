import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { blogDescription } from '../../../lib/blogs';
import { getPublishedBlogBySlug } from '../../../lib/serverBlogStore';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogBySlug(slug);
  if (!post) {
    return {
      title: 'Blog Not Found | Sheshaan Global'
    };
  }

  const description = blogDescription(post);

  return {
    title: `${post.title} | Sheshaan Global`,
    description,
    keywords: post.seo_keywords,
    openGraph: {
      title: post.title,
      description,
      images: post.cover_image_url ? [post.cover_image_url] : undefined,
      type: 'article',
      publishedTime: post.published_at
    }
  };
}

export default async function BlogDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPublishedBlogBySlug(slug);
  if (!post) notFound();

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <article>
        <header className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-3xl px-5 py-10">
            <Link href="/blogs" className="text-xs font-black uppercase tracking-wider text-sky-700">Blogs</Link>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-5xl">{post.title}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
              <span>{post.author || 'Sheshaan Global'}</span>
              {post.published_at && <span>{new Date(post.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
            </div>
          </div>
          {post.cover_image_url && (
            <div className="relative mx-auto aspect-[16/7] max-w-5xl overflow-hidden rounded-t-lg bg-slate-200">
              <Image
                src={post.cover_image_url}
                alt={post.title}
                fill
                sizes="(min-width: 1024px) 1024px, 100vw"
                className="object-cover"
                priority
                unoptimized
              />
            </div>
          )}
        </header>

        <div className="mx-auto max-w-3xl px-5 py-10">
          <div
            className="blog-content text-base leading-8 text-slate-700 [&_a]:font-bold [&_a]:text-sky-700 [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-slate-950 [&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-black [&_h3]:text-slate-950 [&_img]:my-6 [&_img]:max-w-full [&_img]:rounded-lg [&_li]:mb-2 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-5 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </article>
    </main>
  );
}

import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { blogDescription } from '../../lib/blogs';
import { listPublishedBlogs } from '../../lib/serverBlogStore';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blogs | Sheshaan Global',
  description: 'Export trade insights, product sourcing guidance, and international buyer updates from Sheshaan Global.'
};

export default async function BlogsPage() {
  const posts = await listPublishedBlogs();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <Link href="/" className="text-xs font-black uppercase tracking-wider text-sky-700">Sheshaan Global</Link>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Blogs</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
                Practical export intelligence, product notes, and sourcing guidance from the Sheshaan Global team.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">{posts.length} published</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8">
        {posts.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
            No published blogs yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm hover:border-sky-200 hover:shadow-md">
                <div className="relative aspect-[16/10] bg-slate-100">
                  {post.cover_image_url ? (
                    <Image
                      src={post.cover_image_url}
                      alt={post.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-900 via-sky-900 to-emerald-800 text-sm font-black uppercase tracking-widest text-white">
                      Sheshaan Global
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    {post.published_at ? new Date(post.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Published'}
                  </div>
                  <h2 className="mt-2 line-clamp-2 text-lg font-black leading-snug text-slate-950 group-hover:text-sky-700">{post.title}</h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{blogDescription(post, 150)}</p>
                  <div className="mt-4 text-xs font-black uppercase tracking-wider text-sky-700">Read article</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

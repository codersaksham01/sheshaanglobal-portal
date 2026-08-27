import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { BlogPost } from './types';
import { generateBlogSlug, sanitizeBlogHtml } from './blogs';

const dbPath = path.join(process.cwd(), 'db.json');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_project_url');

const getSupabase = (admin = false) => {
  const key = admin && supabaseServiceKey ? supabaseServiceKey : supabaseAnonKey;
  return isSupabaseConfigured ? createClient(supabaseUrl, key) : null;
};

const readFileDB = () => {
  if (!fs.existsSync(dbPath)) return { blogs: [] as BlogPost[] };
  const parsed = JSON.parse(fs.readFileSync(dbPath, 'utf-8').replace(/^\uFEFF/, ''));
  return { ...parsed, blogs: parsed.blogs || [] };
};

const writeFileDB = (db: any) => {
  fs.writeFileSync(dbPath, JSON.stringify({ ...db, blogs: db.blogs || [] }, null, 2), 'utf-8');
};

export const prepareBlogPayload = (payload: Partial<BlogPost>, existing?: BlogPost): BlogPost => {
  const now = new Date().toISOString();
  const title = (payload.title || existing?.title || '').trim();
  const status = payload.status || existing?.status || 'Draft';
  const publishingNow = status === 'Published' && !payload.published_at && !existing?.published_at;

  return {
    id: payload.id || existing?.id || `blo-${Math.random().toString(36).slice(2, 11)}`,
    title,
    slug: generateBlogSlug(title),
    content: sanitizeBlogHtml(payload.content ?? existing?.content ?? ''),
    cover_image_url: payload.cover_image_url ?? existing?.cover_image_url ?? '',
    author: (payload.author || existing?.author || 'Sheshaan Global').trim(),
    status,
    seo_keywords: payload.seo_keywords ?? existing?.seo_keywords ?? '',
    published_at: status === 'Published' ? (payload.published_at || existing?.published_at || (publishingNow ? now : now)) : undefined,
    created_at: payload.created_at || existing?.created_at || now,
    updated_at: now
  };
};

export const listPublishedBlogs = async () => {
  const client = getSupabase();
  if (client) {
    const { data, error } = await client
      .from('blogs')
      .select('*')
      .eq('status', 'Published')
      .order('published_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as BlogPost[];
  }

  const db = readFileDB();
  return [...db.blogs]
    .filter((post) => post.status === 'Published')
    .sort((a, b) => new Date(b.published_at || b.created_at || 0).getTime() - new Date(a.published_at || a.created_at || 0).getTime());
};

export const getPublishedBlogBySlug = async (slug: string) => {
  const posts = await listPublishedBlogs();
  return posts.find((post) => post.slug === slug) || null;
};

export const listAllBlogs = async () => {
  const client = getSupabase(true);
  if (client) {
    const { data, error } = await client.from('blogs').select('*').order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as BlogPost[];
  }

  const db = readFileDB();
  return [...db.blogs].sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());
};

export const upsertBlog = async (payload: Partial<BlogPost>) => {
  const client = getSupabase(true);
  if (client) {
    const existing = payload.id
      ? ((await client.from('blogs').select('*').eq('id', payload.id).single()).data as BlogPost | null)
      : null;
    const prepared = prepareBlogPayload(payload, existing || undefined);
    const { data, error } = await client.from('blogs').upsert(prepared).select().single();
    if (error) throw new Error(error.message);
    return data as BlogPost;
  }

  const db = readFileDB();
  const existing = db.blogs.find((post: BlogPost) => post.id === payload.id);
  const prepared = prepareBlogPayload(payload, existing);
  db.blogs = existing
    ? db.blogs.map((post: BlogPost) => post.id === prepared.id ? prepared : post)
    : [prepared, ...db.blogs];
  writeFileDB(db);
  return prepared;
};

export const deleteBlog = async (id: string) => {
  const client = getSupabase(true);
  if (client) {
    const { error } = await client.from('blogs').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }

  const db = readFileDB();
  db.blogs = db.blogs.filter((post: BlogPost) => post.id !== id);
  writeFileDB(db);
};

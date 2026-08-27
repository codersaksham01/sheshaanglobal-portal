import type { BlogPost } from './types';

export const blankBlogPost: Partial<BlogPost> = {
  title: '',
  slug: '',
  content: '',
  cover_image_url: '',
  author: 'Sheshaan Global',
  status: 'Draft',
  seo_keywords: ''
};

export const generateBlogSlug = (title: string) => {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return slug || `blog-${Date.now()}`;
};

export const stripHtml = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const blogDescription = (post: Pick<BlogPost, 'content' | 'seo_keywords'>, maxLength = 160) => {
  const text = stripHtml(post.content || '') || post.seo_keywords || 'Insights from Sheshaan Global.';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}...` : text;
};

export const sanitizeBlogHtml = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/\s(href|src)=["']javascript:[^"']*["']/gi, '');

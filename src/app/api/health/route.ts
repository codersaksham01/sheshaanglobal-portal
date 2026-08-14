import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url'
  );
  const securedLocalFallback = Boolean(process.env.APP_LOGIN_PASSWORD && process.env.APP_SESSION_SECRET);
  const productionReady = supabaseConfigured || securedLocalFallback || process.env.NODE_ENV !== 'production';

  return NextResponse.json({
    status: productionReady ? 'ok' : 'misconfigured',
    service: 'sheshaan-global-smart-portal',
    database: supabaseConfigured ? 'supabase' : 'local-development-fallback',
    timestamp: new Date().toISOString()
  }, {
    status: productionReady ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' }
  });
}

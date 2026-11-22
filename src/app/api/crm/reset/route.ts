import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const unauthorized = () => NextResponse.json({ error: 'Administrator authentication is required.' }, { status: 401 });

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'CRM reset is not configured on the server.' }, { status: 503 });
  }
  if (!token) return unauthorized();

  const authClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return unauthorized();

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: profile, error: profileError } = await admin
    .from('app_users')
    .select('role, active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (profileError || !profile?.active || profile.role !== 'Admin') return unauthorized();

  // This endpoint already verified the active Admin profile above. Use the
  // service-role client for the restricted CRM-only deletes so database
  // functions that depend on auth.uid() do not lose the browser identity.
  const { error: activitiesError } = await admin.from('activities').delete().not('lead_id', 'is', null);
  if (activitiesError) return NextResponse.json({ error: activitiesError.message }, { status: 400 });
  const { error: tasksError } = await admin.from('tasks').delete().not('lead_id', 'is', null);
  if (tasksError) return NextResponse.json({ error: tasksError.message }, { status: 400 });
  const { error: leadsError } = await admin.from('leads').delete().not('id', 'is', null);
  if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 400 });

  return NextResponse.json({ success: true });
}

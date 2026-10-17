import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'db.json');
const roles = new Set(['Admin', 'Sales', 'Accounts', 'Operations']);

const readDB = () => {
  try {
    return fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, 'utf-8')) : {};
  } catch {
    return {};
  }
};

const writeDB = (data: any) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const name = String(body?.name || '').trim();
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');
  const requestedRole = roles.has(body?.requested_role) ? body.requested_role : 'Sales';
  const phone = String(body?.phone || '').trim();
  const title = String(body?.title || '').trim();

  if (!name || !email || !password || password.length < 6) {
    return NextResponse.json({ error: 'Name, email, and a 6+ character password are required.' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const now = new Date().toISOString();

  if (supabaseUrl && serviceRoleKey) {
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, requested_role: requestedRole }
    });
    if (createError && !createError.message.toLowerCase().includes('already')) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    const authUserId = created.user?.id;
    const { error: profileError } = await admin.from('app_users').upsert({
      auth_user_id: authUserId,
      name,
      email,
      role: requestedRole,
      requested_role: requestedRole,
      active: false,
      status: 'Pending',
      phone,
      title,
      updated_at: now
    }, { onConflict: 'email' });

    await admin.from('activity_logs').insert({
      actor_email: email,
      actor_name: name,
      action: 'Login Request',
      table_name: 'app_users',
      record_id: authUserId || email,
      record_label: name,
      details: `Requested ${requestedRole} portal access.`,
      created_at: now
    });

    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  const db = readDB();
  db.app_users = db.app_users || [];
  db.activity_logs = db.activity_logs || [];
  const existingIndex = db.app_users.findIndex((user: any) => String(user.email || '').toLowerCase() === email);
  const record = {
    ...(existingIndex > -1 ? db.app_users[existingIndex] : {}),
    id: existingIndex > -1 ? db.app_users[existingIndex].id : `usr-${Math.random().toString(36).slice(2, 11)}`,
    name,
    email,
    role: requestedRole,
    requested_role: requestedRole,
    active: false,
    status: 'Pending',
    phone,
    title,
    created_at: existingIndex > -1 ? db.app_users[existingIndex].created_at : now,
    updated_at: now
  };
  if (existingIndex > -1) db.app_users[existingIndex] = record;
  else db.app_users.push(record);

  db.activity_logs.unshift({
    id: `log-${Math.random().toString(36).slice(2, 11)}`,
    actor_email: email,
    actor_name: name,
    action: 'Login Request',
    table_name: 'app_users',
    record_id: record.id,
    record_label: name,
    details: `Requested ${requestedRole} portal access.`,
    created_at: now
  });

  writeDB(db);
  return NextResponse.json({ success: true });
}

import { supabase } from './supabaseClient';

const CORE_TEAM_EMAILS = [
  'info@sheshaanglobal.com',
  'sakshamsingh@sheshaanglobal.com',
  'junedbarade@sheshaanglobal.com',
  'sanazeba@sheshaanglobal.com'
];

type NotificationKind = 'task' | 'message' | 'system';

type TeamNotificationInput = {
  scope: string;
  senderEmail?: string;
  title: string;
  message: string;
  kind: NotificationKind;
  href: string;
};

type DueTask = {
  id: string;
  title: string;
  owner: string | null;
  due_date: string | null;
  status: string;
};

const cleanEmail = (value: string) => value.trim().toLowerCase();

export async function notifyCoreTeam({ scope, senderEmail = '', title, message, kind, href }: TeamNotificationInput) {
  const sender = cleanEmail(senderEmail);
  const recipients = CORE_TEAM_EMAILS.filter((email) => email !== sender);
  if (!recipients.length) return;

  await supabase.from('portal_notifications').upsert(recipients.map((targetEmail) => ({
    id: `${scope}-${targetEmail}`,
    target_email: targetEmail,
    title,
    message,
    kind,
    href
  })), { onConflict: 'id', ignoreDuplicates: true });
}

export async function createDueTaskNotifications(email: string) {
  const targetEmail = cleanEmail(email);
  if (!targetEmail) return;

  const [{ data: profile }, { data: tasks }] = await Promise.all([
    supabase.from('app_users').select('name').eq('email', targetEmail).maybeSingle(),
    supabase.from('tasks').select('id, title, owner, due_date, status').neq('status', 'Done').not('due_date', 'is', null).lte('due_date', new Date().toISOString().slice(0, 10)).limit(100)
  ]);

  const name = profile?.name?.trim().toLowerCase();
  if (!name || !tasks?.length) return;
  const today = new Date().toISOString().slice(0, 10);
  const dueTasks = (tasks as DueTask[]).filter((task) => task.owner?.trim().toLowerCase() === name);
  if (!dueTasks.length) return;

  await supabase.from('portal_notifications').upsert(dueTasks.map((task) => ({
    id: `task-due-${task.id}-${today}`,
    target_email: targetEmail,
    title: task.due_date === today ? 'Task due today' : 'Task overdue',
    message: `“${task.title}” ${task.due_date === today ? 'is due today' : `was due on ${task.due_date}`}.`,
    kind: 'task' as const,
    href: '/team-tasks'
  })), { onConflict: 'id', ignoreDuplicates: true });
}

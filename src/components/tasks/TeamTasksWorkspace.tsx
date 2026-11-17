'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, CheckSquare, CircleAlert, Clock3, Loader2, Plus, RefreshCw, UserPlus, UsersRound, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { usePortalIdentity } from '../AuthGate';
import { AppUser, TaskRecord } from '../../lib/types';

const today = () => new Date().toISOString().slice(0, 10);
const priorityTone = (priority: TaskRecord['priority']) => priority === 'High' ? 'bg-rose-50 text-rose-700' : priority === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700';

export function TeamTasksWorkspace() {
  const { email } = usePortalIdentity();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [members, setMembers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ title: '', ownerEmail: '', priority: 'Medium' as TaskRecord['priority'], dueDate: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [tasksResult, usersResult] = await Promise.all([
      supabase.from('tasks').select('*').order('due_date', { ascending: true }).limit(100),
      supabase.from('app_users').select('*').eq('active', true).order('name')
    ]);
    setTasks((tasksResult.data || []) as TaskRecord[]);
    setMembers((usersResult.data || []) as AppUser[]);
    if (tasksResult.error) setNotice('Tasks could not be loaded. Please refresh the workspace.');
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => ({
    open: tasks.filter((task) => task.status !== 'Done').length,
    due: tasks.filter((task) => task.status !== 'Done' && task.due_date && task.due_date <= today()).length,
    done: tasks.filter((task) => task.status === 'Done').length
  }), [tasks]);

  const currentMember = useMemo(
    () => members.find((member) => member.email.toLowerCase() === email.toLowerCase()),
    [email, members]
  );

  const myOpenTasks = useMemo(() => tasks.filter((task) => (
    task.status !== 'Done' && Boolean(currentMember) && task.owner?.trim().toLowerCase() === currentMember?.name.trim().toLowerCase()
  )), [currentMember, tasks]);

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || saving) return;
    setSaving(true);
    setNotice('');
    const assignee = members.find((member) => member.email.toLowerCase() === form.ownerEmail.toLowerCase());
    const record = {
      id: `task-${crypto.randomUUID()}`,
      title: form.title.trim(),
      status: 'Open' as const,
      priority: form.priority,
      due_date: form.dueDate || null,
      owner: assignee?.name || '',
      assigned_by_email: email.toLowerCase(),
      assigned_by_name: currentMember?.name || email.split('@')[0],
      notes: form.notes.trim()
    };
    const { data, error } = await supabase.from('tasks').insert([record]).select().single();
    if (error) {
      setNotice('Task could not be created. Please try again.');
      setSaving(false);
      return;
    }
    if (assignee?.email && assignee.email.toLowerCase() !== email.toLowerCase()) {
      await supabase.from('portal_notifications').insert([{
        id: `notification-${crypto.randomUUID()}`,
        target_email: assignee.email.toLowerCase(),
        title: 'New task assigned to you',
        message: `${form.title.trim()}${form.dueDate ? ` · Due ${form.dueDate}` : ''}`,
        kind: 'task',
        href: '/team-tasks'
      }]);
    }
    setTasks((current) => [((data || record) as TaskRecord), ...current]);
    setForm({ title: '', ownerEmail: '', priority: 'Medium', dueDate: '', notes: '' });
    setCreateOpen(false);
    setSaving(false);
    setNotice(assignee ? `Task created and assigned to ${assignee.name}.` : 'Task created in the shared work queue.');
  };

  const updateStatus = async (task: TaskRecord, status: TaskRecord['status']) => {
    if (status === task.status) return;
    const currentName = currentMember?.name.trim().toLowerCase();
    const isAssignee = Boolean(currentName && task.owner?.trim().toLowerCase() === currentName);
    const isAssigner = Boolean(task.assigned_by_email && task.assigned_by_email.toLowerCase() === email.toLowerCase());
    if (!isAssignee && !isAssigner) {
      setNotice('Only the assignee or the person who created this task can update its status.');
      return;
    }
    const wasCompleted = status === 'Done' && task.status !== 'Done';
    const { error } = await supabase.from('tasks').update({ status }).eq('id', task.id);
    if (error) { setNotice('Task status could not be updated.'); return; }
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
    if (wasCompleted && task.assigned_by_email && task.assigned_by_email.toLowerCase() !== email.toLowerCase()) {
      const completedBy = currentMember?.name || email.split('@')[0];
      const { error: notificationError } = await supabase.from('portal_notifications').insert([{
        id: `notification-${crypto.randomUUID()}`,
        target_email: task.assigned_by_email.toLowerCase(),
        title: 'Assigned task completed',
        message: `${completedBy} completed “${task.title}”.`,
        kind: 'task',
        href: '/team-tasks'
      }]);
      setNotice(notificationError
        ? 'Task marked complete, but the completion notification could not be sent.'
        : 'Task marked complete. The person who assigned it has been notified.');
      return;
    }
    setNotice(status === 'Done' ? 'Task marked complete.' : 'Task status updated.');
  };

  return <div className="space-y-4">
    <section className="overview-hero relative overflow-hidden rounded-2xl px-5 py-6 sm:px-7"><div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black tracking-widest text-emerald-100">TEAM OPERATIONS</p><h1 className="mt-1 text-2xl font-black text-white">Tasks with clear ownership.</h1><p className="mt-2 max-w-2xl text-sm font-medium text-emerald-50">Create work, assign it to the right person, track progress, and notify the assignee automatically.</p></div><div className="flex gap-2"><button type="button" onClick={() => setCreateOpen(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-emerald-900 transition hover:bg-emerald-50"><Plus className="h-4 w-4"/>New task</button><button type="button" onClick={() => void load()} className="grid h-10 w-10 place-items-center rounded-xl border border-white/25 bg-white/10 text-white hover:bg-white/20" aria-label="Refresh tasks"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/></button></div></div></section>

    {myOpenTasks.length > 0 && <section className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm"><CheckSquare className="h-4 w-4" /></span><div className="min-w-0"><p className="text-xs font-black text-emerald-950">Your assigned work</p><p className="mt-0.5 truncate text-[11px] font-semibold text-emerald-800">{myOpenTasks.length === 1 ? `You have 1 task to complete: ${myOpenTasks[0].title}` : `You have ${myOpenTasks.length} open tasks assigned to you.`}</p></div></div></section>}

    {notice && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4"/>{notice}</p>}
    <section className="grid gap-3 sm:grid-cols-3">{[{ label: 'Open tasks', value: stats.open, icon: Clock3, tone: 'bg-amber-50 text-amber-700' }, { label: 'Due today or overdue', value: stats.due, icon: CircleAlert, tone: 'bg-rose-50 text-rose-700' }, { label: 'Completed', value: stats.done, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' }].map((card) => <article key={card.label} className="premium-card rounded-2xl p-4"><span className={`grid h-9 w-9 place-items-center rounded-xl ${card.tone}`}><card.icon className="h-4 w-4"/></span><p className="mt-3 text-2xl font-black text-slate-950">{card.value}</p><p className="mt-1 text-xs font-bold text-slate-500">{card.label}</p></article>)}</section>

    <section className="premium-card overflow-hidden rounded-2xl"><header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-2"><CheckSquare className="h-4 w-4 text-emerald-700"/><div><h2 className="text-sm font-black text-slate-950">Team work queue</h2><p className="text-[10px] font-semibold text-slate-400">Owner, priority, due date and delivery status</p></div></div><button type="button" onClick={() => setCreateOpen(true)} className="hidden items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-800 hover:bg-emerald-100 sm:inline-flex"><UserPlus className="h-3.5 w-3.5"/>Assign task</button></header>{loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-700"/></div> : tasks.length ? <div className="divide-y divide-slate-100">{tasks.map((task) => <article key={task.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className={`text-sm font-black ${task.status === 'Done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${priorityTone(task.priority)}`}>{task.priority}</span></div><div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500"><span className="inline-flex items-center gap-1"><UsersRound className="h-3.5 w-3.5"/>{task.owner || 'Unassigned'}</span><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5"/>{task.due_date || 'No due date'}</span>{task.notes && <span className="max-w-md truncate">{task.notes}</span>}</div></div><label className="inline-flex shrink-0 items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-400"><span className="sr-only">Task status</span><select value={task.status} onChange={(event) => void updateStatus(task, event.target.value as TaskRecord['status'])} className="rounded-xl border border-emerald-100 bg-white px-2.5 py-2 text-[10px] font-black normal-case tracking-normal text-slate-700 outline-none focus:border-emerald-400"><option>Open</option><option>In Progress</option><option>Done</option></select></label></article>)}</div> : <div className="px-5 py-16 text-center"><CheckSquare className="mx-auto h-8 w-8 text-emerald-200"/><p className="mt-3 text-sm font-bold text-slate-600">No tasks yet</p><p className="mt-1 text-xs text-slate-400">Create the first task and assign clear ownership.</p></div>}</section>

    {createOpen && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-4"><form onSubmit={createTask} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-sm font-black text-slate-950">Create and assign a task</p><p className="mt-1 text-[11px] font-medium text-slate-500">The assignee receives a notification in the portal.</p></div><button type="button" onClick={() => setCreateOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close task form"><X className="h-4 w-4"/></button></div><label className="mt-5 block text-xs font-black text-slate-700">Task title<input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Confirm vessel schedule with forwarder" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100/70"/></label><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="block text-xs font-black text-slate-700">Assign to<select value={form.ownerEmail} onChange={(event) => setForm((current) => ({ ...current, ownerEmail: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400"><option value="">Shared queue (unassigned)</option>{members.map((member) => <option key={member.id} value={member.email}>{member.name} — {member.title || member.role}</option>)}</select></label><label className="block text-xs font-black text-slate-700">Due date<input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400"/></label></div><label className="mt-3 block text-xs font-black text-slate-700">Priority<select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as TaskRecord['priority'] }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400"><option>Low</option><option>Medium</option><option>High</option></select></label><label className="mt-3 block text-xs font-black text-slate-700">Notes<textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={4} placeholder="Add useful context, files, follow-up steps, or customer details." className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100/70"/></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setCreateOpen(false)} className="h-10 rounded-xl px-4 text-xs font-black text-slate-600 hover:bg-slate-100">Cancel</button><button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#073f35] px-4 text-xs font-black text-white hover:bg-[#087f63] disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4"/>}Create task</button></div></form></div>}
  </div>;
}

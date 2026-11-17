'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, CheckSquare, Clock3, CreditCard, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { AccountingRecord, InvoiceRecord, TaskRecord } from '../../lib/types';

const today = () => new Date().toISOString().slice(0, 10);

export function OfflineOperationsWorkspace({ area }: { area: 'tasks' | 'payments' | 'inbox' }) {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [transactions, setTransactions] = useState<AccountingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [tasksResult, invoicesResult, transactionsResult] = await Promise.all([
      supabase.from('tasks').select('*').order('due_date', { ascending: true }).limit(80),
      supabase.from('invoices').select('*').order('due_date', { ascending: true }).limit(80),
      supabase.from('accounting_transactions').select('*').order('transaction_date', { ascending: false }).limit(80)
    ]);
    setTasks((tasksResult.data || []) as TaskRecord[]);
    setInvoices((invoicesResult.data || []) as InvoiceRecord[]);
    setTransactions((transactionsResult.data || []) as AccountingRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const taskStats = useMemo(() => ({ open: tasks.filter((task) => task.status !== 'Done').length, due: tasks.filter((task) => task.status !== 'Done' && task.due_date && task.due_date <= today()).length, done: tasks.filter((task) => task.status === 'Done').length }), [tasks]);
  const paymentStats = useMemo(() => {
    const receivables = invoices.filter((invoice) => invoice.payment_status !== 'Paid');
    const amount = receivables.reduce((sum, invoice) => sum + Number(invoice.balance_amount ?? invoice.amount ?? 0), 0);
    const overdue = receivables.filter((invoice) => invoice.payment_status === 'Overdue' || (!!invoice.due_date && invoice.due_date < today()));
    const pending = transactions.filter((transaction) => transaction.status === 'pending_approval');
    return { receivables, amount, overdue, pending };
  }, [invoices, transactions]);

  if (area === 'inbox') return null;
  const isTasks = area === 'tasks';
  const Icon = isTasks ? CheckSquare : CreditCard;
  const title = isTasks ? 'Team Tasks' : 'Payment Intelligence';
  const description = isTasks ? 'A live view of shared operational work, deadlines, and task progress.' : 'Track receivables, overdue invoices, and finance approvals from your live records.';
  const records = isTasks ? tasks.filter((task) => task.status !== 'Done').slice(0, 8) : paymentStats.receivables.slice(0, 8);

  return <div className="space-y-4">
    <section className="overview-hero relative overflow-hidden rounded-2xl px-6 py-7"><div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black tracking-widest text-emerald-100">LIVE OPERATIONS</p><h1 className="mt-1 text-2xl font-black text-white">{title}</h1><p className="mt-2 max-w-2xl text-sm text-emerald-50">{description}</p></div><button onClick={() => void load()} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-white/25 bg-white/10 px-4 text-xs font-black text-white hover:bg-white/20"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>Refresh</button></div></section>
    <section className="grid gap-3 sm:grid-cols-3">{(isTasks ? [{ label: 'Open tasks', value: taskStats.open, icon: Clock3, tone: 'text-amber-700 bg-amber-50' }, { label: 'Due today or overdue', value: taskStats.due, icon: CheckSquare, tone: 'text-rose-700 bg-rose-50' }, { label: 'Completed', value: taskStats.done, icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50' }] : [{ label: 'Outstanding receivables', value: paymentStats.receivables.length, icon: CreditCard, tone: 'text-blue-700 bg-blue-50' }, { label: 'Overdue invoices', value: paymentStats.overdue.length, icon: Clock3, tone: 'text-rose-700 bg-rose-50' }, { label: 'Awaiting approval', value: paymentStats.pending.length, icon: ShieldCheck, tone: 'text-amber-700 bg-amber-50' }]).map((card) => <div key={card.label} className="premium-card rounded-2xl p-4"><span className={`grid h-9 w-9 place-items-center rounded-xl ${card.tone}`}><card.icon className="h-4 w-4"/></span><p className="mt-4 text-2xl font-black text-slate-950">{card.value}</p><p className="mt-1 text-xs font-bold text-slate-500">{card.label}</p></div>)}</section>
    {!isTasks && <section className="premium-card flex items-center justify-between rounded-2xl p-4"><div><p className="text-xs font-bold text-slate-500">Open receivable value</p><p className="mt-1 text-2xl font-black text-slate-950">₹{paymentStats.amount.toLocaleString('en-IN')}</p></div><Link href="/accounting" className="inline-flex items-center gap-2 rounded-xl bg-[#073f35] px-4 py-2.5 text-xs font-black text-white hover:bg-[#087f63]">Open accounting <ArrowRight className="h-4 w-4"/></Link></section>}
    <section className="premium-card overflow-hidden rounded-2xl"><header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-emerald-700"/><h2 className="text-sm font-black text-slate-950">{isTasks ? 'Priority work queue' : 'Receivable follow-up queue'}</h2></div><Link href={isTasks ? '/crm' : '/accounting'} className="text-xs font-black text-emerald-700 hover:text-emerald-900">Open workspace</Link></header>{loading ? <div className="grid min-h-44 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-emerald-700"/></div> : records.length ? <div className="divide-y divide-slate-100">{records.map((record: TaskRecord | InvoiceRecord) => isTasks ? <div key={record.id} className="flex items-center justify-between gap-3 px-5 py-4"><div className="min-w-0"><p className="truncate text-sm font-black text-slate-800">{(record as TaskRecord).title}</p><p className="mt-1 text-[11px] font-semibold text-slate-500">Owner: {(record as TaskRecord).owner || 'Unassigned'} · Due: {(record as TaskRecord).due_date || 'Not set'}</p></div><span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">{(record as TaskRecord).status}</span></div> : <div key={record.id} className="flex items-center justify-between gap-3 px-5 py-4"><div className="min-w-0"><p className="truncate text-sm font-black text-slate-800">{(record as InvoiceRecord).invoice_number}</p><p className="mt-1 text-[11px] font-semibold text-slate-500">Due: {(record as InvoiceRecord).due_date || 'Not set'} · {(record as InvoiceRecord).currency}</p></div><div className="text-right"><p className="text-sm font-black text-slate-900">{(record as InvoiceRecord).currency} {Number((record as InvoiceRecord).balance_amount ?? (record as InvoiceRecord).amount).toLocaleString()}</p><span className="text-[10px] font-black text-rose-600">{(record as InvoiceRecord).payment_status}</span></div></div>)}</div> : <div className="px-5 py-16 text-center"><Icon className="mx-auto h-8 w-8 text-emerald-200"/><p className="mt-3 text-sm font-bold text-slate-600">No live records need attention</p><p className="mt-1 text-xs text-slate-400">New records added in the portal will appear here.</p></div>}</section>
  </div>;
}

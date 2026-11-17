'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, BellRing, Box, CheckCircle2, ClipboardPlus, FilePlus2,
  Layers3, PackagePlus, Receipt, RefreshCw, Ship, TrendingUp, UsersRound,
  ChevronLeft, ChevronRight, UserPlus
} from 'lucide-react';
import { getPortalCache, fetchAllPortalData } from '../../lib/portalDataStore';
import { Lead, Quote } from '../../lib/types';

const stages: Array<{ key: Lead['stage']; label: string; color: string }> = [
  { key: 'New Lead', label: 'New Lead', color: '#3488f6' },
  { key: 'Contacted', label: 'In Discussion', color: '#8868f2' },
  { key: 'Quoted', label: 'Quotation Sent', color: '#21c4cf' },
  { key: 'Negotiation', label: 'Negotiation', color: '#eea43f' },
  { key: 'Won', label: 'Won', color: '#12a979' }
];

function valueOfQuote(quote: Quote) {
  return (quote.items || []).reduce((total, item) => total + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0)
    + (Number(quote.freight_cost) || 0) + (Number(quote.insurance_cost) || 0);
}

function money(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function shortMoney(amount: number) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return money(amount);
}

export function OverviewWorkspace() {
  const router = useRouter();
  const [cache, setCache] = useState(() => getPortalCache());
  const [syncing, setSyncing] = useState(false);
  const [period, setPeriod] = useState<'Week' | 'Month' | 'Quarter'>('Month');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const sync = useCallback(async () => {
    setSyncing(true);
    try { setCache(await fetchAllPortalData({ force: true })); } finally { setSyncing(false); }
  }, []);

  useEffect(() => { if (!cache) sync(); }, [cache, sync]);

  const quotes = cache?.quotes || [];
  const leads = cache?.leads || [];
  const clients = cache?.clients || [];
  const invoices = cache?.invoices || [];
  const tasks = cache?.tasks || [];
  const shipments = cache?.shipments || [];
  const accounting = cache?.accountingTransactions || [];
  const activities = cache?.activities || [];

  const totals = useMemo(() => {
    const quoted = quotes.reduce((sum, quote) => sum + valueOfQuote(quote), 0);
    const approved = quotes.filter((quote) => ['Approved', 'Invoice Raised', 'Shipped', 'Closed'].includes(quote.status)).reduce((sum, quote) => sum + valueOfQuote(quote), 0);
    const receivables = invoices.filter((invoice) => invoice.payment_status !== 'Paid').reduce((sum, invoice) => sum + (Number(invoice.amount) || 0), 0);
    const income = accounting.filter((entry) => entry.type === 'income' && entry.status === 'approved').reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    const expenses = accounting.filter((entry) => entry.type === 'expense' && entry.status === 'approved').reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    return { quoted, approved, receivables, income, expenses, net: income - expenses };
  }, [quotes, invoices, accounting]);

  const series = useMemo(() => {
    const buckets = period === 'Week' ? 7 : period === 'Month' ? 6 : 4;
    const span = period === 'Week' ? 1 : period === 'Month' ? 30 : 90;
    const now = new Date();
    const values = Array.from({ length: buckets }, () => 0);
    quotes.forEach((quote) => {
      const date = quote.created_at ? new Date(quote.created_at) : null;
      if (!date || Number.isNaN(date.getTime())) return;
      const age = Math.max(0, (now.getTime() - date.getTime()) / 86400000);
      if (age > span) return;
      const index = Math.min(buckets - 1, buckets - 1 - Math.floor(age / (span / buckets)));
      values[index] += valueOfQuote(quote);
    });
    return values;
  }, [quotes, period]);

  const points = useMemo(() => {
    const max = Math.max(...series, 1);
    return series.map((value, index) => `${index * (100 / Math.max(series.length - 1, 1))},${90 - (value / max) * 76}`).join(' ');
  }, [series]);

  const stageCounts = useMemo(() => stages.map((stage) => ({ ...stage, count: leads.filter((lead) => lead.stage === stage.key).length })), [leads]);
  const stageGradient = useMemo(() => {
    if (!leads.length) return 'conic-gradient(#e5e7eb 0 100%)';
    let offset = 0;
    return `conic-gradient(${stageCounts.map((stage) => { const next = offset + (stage.count / leads.length) * 100; const result = `${stage.color} ${offset}% ${next}%`; offset = next; return result; }).join(',')})`;
  }, [stageCounts, leads.length]);

  const activeDeals = leads.filter((lead) => !['Won', 'Lost'].includes(lead.stage)).slice(0, 8);
  const kpis = [
    { label: 'Total deals', value: quotes.length, detail: `${shortMoney(totals.quoted)} quoted`, icon: Layers3, tone: 'text-blue-600 bg-blue-50', href: '/quotes' },
    { label: 'Active buyers', value: clients.length || leads.filter((lead) => !['Won', 'Lost'].includes(lead.stage)).length, detail: `${leads.length} CRM leads`, icon: UsersRound, tone: 'text-violet-600 bg-violet-50', href: '/crm' },
    { label: 'Quotes sent', value: quotes.filter((quote) => !['Draft', 'Declined'].includes(quote.status)).length, detail: 'Commercial proposals', icon: FilePlus2, tone: 'text-sky-600 bg-sky-50', href: '/quotes' },
    { label: 'Approved revenue', value: shortMoney(totals.approved), detail: 'Confirmed pipeline value', icon: Receipt, tone: 'text-emerald-600 bg-emerald-50', href: '/accounting' }
  ];
  const quickActions: Array<{ label: string; Icon: React.ComponentType<{ className?: string }>; href: string }> = [
    { label: 'New quote', Icon: FilePlus2, href: '/quotes?new=true' },
    { label: 'Add product', Icon: PackagePlus, href: '/products' },
    { label: 'Add buyer', Icon: UsersRound, href: '/potential-buyers' },
    { label: 'Letterhead', Icon: Box, href: '/letterhead' },
    { label: 'Accounting', Icon: Receipt, href: '/accounting' },
    { label: 'New task', Icon: ClipboardPlus, href: '/crm' }
  ];
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const monthName = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const monthDays = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  const today = new Date();

  return (
    <div className="overview-bento grid grid-cols-1 gap-4 2xl:grid-cols-12">
      <section className="grid gap-4 2xl:col-span-12 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="overview-hero rounded-[22px] border border-white/10 px-5 py-5 sm:px-7 sm:py-6">
        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-wide text-emerald-100">TRADE INTELLIGENCE OVERVIEW</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">{greeting}, Trade Desk <span aria-hidden>👋</span></h1>
            <p className="mt-1 text-sm font-medium text-emerald-50">Here’s your trade intelligence overview for Sheshaan Global.</p>
          </div>
          <button type="button" onClick={sync} disabled={syncing} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/30 bg-white/12 px-3 text-xs font-bold text-white transition hover:bg-white/20 disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} /> Sync live data</button>
        </div>
        <div className="overview-actions relative z-10 mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => router.push('/quotes?new=true')} className="inline-flex items-center gap-2 rounded-full bg-[#a4f4d6] px-4 py-2 text-xs font-black text-[#073f35] shadow-sm transition hover:bg-white"><FilePlus2 className="h-3.5 w-3.5"/> New Quote</button><button type="button" onClick={() => router.push('/potential-buyers')} className="inline-flex items-center gap-2 rounded-full border border-white/35 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"><UserPlus className="h-3.5 w-3.5"/> Add Buyer</button><button type="button" onClick={() => router.push('/products')} className="inline-flex items-center gap-2 rounded-full border border-white/35 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"><PackagePlus className="h-3.5 w-3.5"/> Add Product</button><button type="button" onClick={() => router.push('/letterhead')} className="inline-flex items-center gap-2 rounded-full border border-white/35 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"><Box className="h-3.5 w-3.5"/> Create Letterhead</button></div>
        <p className="relative z-10 mt-5 max-w-xl border-l-2 border-[#a4f4d6]/70 pl-3 text-xs font-medium leading-5 text-emerald-50/90">Built for dependable global trade — from first buyer conversation to documentation, delivery, and payment visibility.</p>
      </div>
      <aside className="premium-card rounded-[22px] p-4"><div className="flex items-center justify-between"><p className="text-lg font-black text-slate-950">{monthName}</p><div className="flex gap-1"><button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="grid h-8 w-8 place-items-center rounded-full bg-slate-50 text-slate-600 hover:bg-emerald-50"><ChevronLeft className="h-4 w-4"/></button><button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="grid h-8 w-8 place-items-center rounded-full bg-slate-50 text-slate-600 hover:bg-emerald-50"><ChevronRight className="h-4 w-4"/></button></div></div><div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <span key={day}>{day}</span>)}</div><div className="mt-2 grid grid-cols-7 gap-1">{Array.from({ length: firstWeekday }, (_, index) => <span key={`empty-${index}`} />)}{Array.from({ length: monthDays }, (_, index) => { const day = index + 1; const active = day === today.getDate() && calendarMonth.getMonth() === today.getMonth() && calendarMonth.getFullYear() === today.getFullYear(); return <span key={day} className={`grid h-8 place-items-center rounded-full text-xs font-bold ${active ? 'bg-[#073f35] text-white' : 'text-slate-700'}`}>{day}</span>; })}</div></aside>
      </section>

      <section className="overview-kpis grid grid-cols-2 gap-3 2xl:col-span-8 xl:grid-cols-4">
        {kpis.map((kpi) => <button key={kpi.label} type="button" onClick={() => router.push(kpi.href)} className="premium-card group min-w-0 rounded-2xl p-3.5 text-left transition hover:-translate-y-0.5">
          <div className="flex items-center gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${kpi.tone}`}><kpi.icon className="h-5 w-5" /></span><div className="min-w-0"><p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">{kpi.label}</p><p className="mt-0.5 truncate text-2xl font-black tracking-tight text-slate-950">{kpi.value}</p><p className="mt-0.5 truncate text-[10px] font-semibold text-emerald-700">{kpi.detail}</p></div><TrendingUp className="ml-auto h-4 w-4 shrink-0 text-emerald-500" /></div>
        </button>)}
      </section>

      <article className="premium-card rounded-2xl p-4 2xl:col-span-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Ship className="h-4 w-4 text-emerald-700"/><p className="text-sm font-black text-slate-950">Recent shipments</p></div><button type="button" onClick={() => router.push('/crm')} className="text-[11px] font-bold text-emerald-700">View all <ArrowRight className="inline h-3 w-3"/></button></div>{shipments[0] ? <div className="mt-4"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Ship className="h-5 w-5"/></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-800">{shipments[0].booking_number || shipments[0].bl_number || 'Shipment record'}</p><p className="truncate text-[11px] font-medium text-slate-500">{shipments[0].vessel_name || 'Vessel details pending'}</p></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">{shipments[0].status}</span></div><div className="mt-4 h-1.5 rounded-full bg-emerald-100"><div className="h-full w-2/3 rounded-full bg-emerald-600"/></div><div className="mt-1 flex justify-between text-[9px] font-bold text-slate-400"><span>Booked</span><span>In transit</span><span>Delivered</span></div></div> : <p className="mt-5 text-xs font-semibold text-slate-500">No shipment records available.</p>}</article>

      <section className="grid gap-4 2xl:col-span-8 xl:grid-cols-[minmax(0,5fr)_minmax(0,3fr)]">
        <article className="premium-card rounded-2xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-black text-slate-950">Revenue intelligence</p><p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{money(totals.approved || totals.quoted)}</p><p className="text-xs font-semibold text-emerald-600">Approved commercial value</p></div><div className="flex rounded-xl bg-indigo-50 p-1">{(['Week', 'Month', 'Quarter'] as const).map((item) => <button key={item} type="button" onClick={() => setPeriod(item)} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${period === item ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-indigo-700'}`}>{item}</button>)}</div></div>
          <div className="mt-4 h-40 rounded-xl bg-gradient-to-b from-emerald-50/80 to-white p-3"><svg className="h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${period} revenue chart`}><defs><linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#087f63" stopOpacity=".32"/><stop offset="1" stopColor="#087f63" stopOpacity="0"/></linearGradient></defs><polygon points={`0,100 ${points} 100,100`} fill="url(#revenueFill)"/><polyline points={points} fill="none" stroke="#087f63" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
          <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wide text-slate-400">{series.map((_, index) => <span key={index}>{index + 1}</span>)}</div>
        </article>

        <article className="premium-card rounded-2xl p-5"><div className="flex items-center justify-between"><p className="text-sm font-black text-slate-950">CRM pipeline distribution</p><button type="button" onClick={() => router.push('/crm')} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800">Open pipeline</button></div><div className="mt-4 flex items-center gap-4"><div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{ background: stageGradient }}><div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center"><strong className="block text-2xl font-black text-slate-950">{leads.length}</strong><span className="text-[10px] font-bold uppercase text-slate-500">Leads</span></div></div><div className="min-w-0 space-y-2">{stageCounts.map((stage) => <button type="button" key={stage.key} onClick={() => router.push('/crm')} className="flex w-full items-center gap-2 text-left text-[11px] font-semibold text-slate-600 hover:text-indigo-700"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: stage.color }} /><span className="flex-1 truncate">{stage.label}</span><span className="font-black text-slate-800">{leads.length ? Math.round(stage.count / leads.length * 100) : 0}%</span></button>)}</div></div></article>

      </section>

      <section className="2xl:col-span-8">
        <article className="premium-card overflow-hidden rounded-2xl"><div className="flex items-center justify-between border-b border-indigo-50 px-5 py-4"><div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-indigo-600"/><p className="text-sm font-black text-slate-950">CRM pipeline</p></div><button type="button" onClick={() => router.push('/crm')} className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600">View pipeline <ArrowRight className="h-3.5 w-3.5"/></button></div><div className="grid gap-2 overflow-x-auto p-3 sm:grid-cols-2 xl:grid-cols-4">{stages.slice(0, 4).map((stage) => <div key={stage.key} className="min-w-[180px] rounded-xl p-2.5" style={{ background: `${stage.color}18` }}><div className="mb-2 flex items-center justify-between text-[11px] font-black text-slate-700"><span>{stage.label}</span><span>{stageCounts.find((item) => item.key === stage.key)?.count || 0}</span></div><div className="space-y-2">{activeDeals.filter((lead) => lead.stage === stage.key).slice(0, 2).map((lead) => <button key={lead.id} type="button" onClick={() => router.push('/crm')} className="w-full rounded-lg border border-white/80 bg-white/80 p-2 text-left shadow-sm transition hover:bg-white"><p className="truncate text-[11px] font-bold text-slate-800">{lead.company_name}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">{lead.product_interest || 'Buyer opportunity'}</p><p className="mt-1 text-[11px] font-black text-emerald-700">{lead.estimated_value ? money(lead.estimated_value) : 'Value pending'}</p></button>)}{!activeDeals.some((lead) => lead.stage === stage.key) && <p className="py-4 text-center text-[10px] font-medium text-slate-400">No active deals</p>}</div></div>)}</div></article>
      </section>

      <article className="premium-card rounded-2xl p-4 2xl:col-span-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><BellRing className="h-4 w-4 text-emerald-700"/><p className="text-sm font-black text-slate-950">Notifications</p></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">{activities.length} New</span></div><div className="mt-3 divide-y divide-emerald-50">{activities.slice(0, 3).map((activity) => <button type="button" key={activity.id} onClick={() => router.push(activity.quote_id ? `/quotes?edit=${activity.quote_id}` : '/crm')} className="flex w-full items-center gap-2 py-3 text-left"><span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-4 w-4"/></span><span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{activity.title}</span><span className="text-[10px] text-slate-400">{activity.activity_date ? new Date(activity.activity_date).toLocaleDateString() : ''}</span></button>)}{!activities.length && <p className="py-6 text-center text-xs font-semibold text-slate-500">No recent notifications.</p>}</div></article>

      <section className="grid gap-4 2xl:col-span-12 lg:grid-cols-3"><article className="premium-card rounded-2xl p-4"><p className="text-sm font-black text-slate-950">Financial snapshot</p><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-[10px] font-bold text-slate-500">Receivables</p><p className="mt-1 text-sm font-black text-emerald-700">{shortMoney(totals.receivables)}</p></div><div className="rounded-xl bg-rose-50 p-3"><p className="text-[10px] font-bold text-slate-500">Expenses</p><p className="mt-1 text-sm font-black text-rose-700">{shortMoney(totals.expenses)}</p></div><div className="rounded-xl bg-indigo-50 p-3"><p className="text-[10px] font-bold text-slate-500">Net revenue</p><p className="mt-1 text-sm font-black text-indigo-700">{shortMoney(totals.net)}</p></div></div></article><article className="premium-card rounded-2xl p-4"><p className="text-sm font-black text-slate-950">Trading clocks</p><div className="mt-4 grid grid-cols-3 gap-3 text-center"><div><span className="mx-auto grid h-9 w-9 place-items-center rounded-full border-2 border-emerald-400 text-xs font-black text-emerald-700">M</span><p className="mt-2 text-[11px] font-black text-slate-800">Mumbai</p><p className="text-xs font-black text-slate-950">{new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit'}).format(today)}</p></div><div><span className="mx-auto grid h-9 w-9 place-items-center rounded-full border-2 border-amber-300 text-xs font-black text-amber-700">D</span><p className="mt-2 text-[11px] font-black text-slate-800">Dubai</p><p className="text-xs font-black text-slate-950">{new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dubai',hour:'2-digit',minute:'2-digit'}).format(today)}</p></div><div><span className="mx-auto grid h-9 w-9 place-items-center rounded-full border-2 border-violet-300 text-xs font-black text-violet-700">L</span><p className="mt-2 text-[11px] font-black text-slate-800">London</p><p className="text-xs font-black text-slate-950">{new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'}).format(today)}</p></div></div></article><article className="premium-card rounded-2xl p-4"><div className="flex items-center justify-between"><p className="text-sm font-black text-slate-950">Quick actions</p><ClipboardPlus className="h-4 w-4 text-emerald-700"/></div><div className="mt-3 grid grid-cols-4 gap-2">{quickActions.slice(0,4).map(({ label, Icon, href }) => <button type="button" key={label} onClick={() => router.push(href)} className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-2 py-3 text-center text-[10px] font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-white"><Icon className="mx-auto mb-1 h-4 w-4 text-emerald-700"/>{label}</button>)}</div></article></section>
    </div>
  );
}

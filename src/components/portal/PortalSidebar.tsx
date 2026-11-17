'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Building2, Check, ChevronDown, ClipboardList, FileCheck2, FileText, KanbanSquare, LayoutDashboard, Lock, LogOut, Mail, MessageCircle, Package, Plus, Receipt, RefreshCw, Send, Target } from 'lucide-react';
import { canAccessTab, PortalRole } from '../../lib/permissions';

export interface NavItemDef { key: string; label: string; icon: React.ReactNode; href: string; count?: number; }
export interface PortalSidebarProps { currentTab: string; isMinimized: boolean; onToggleMinimized: () => void; onNavigate: (tabKey: string, href: string) => void; badgeCounts?: Record<string, number>; authEmail?: string | null; currentRole?: PortalRole; onNewQuote?: () => void; fxRate?: number; fxRateLoading?: boolean; fxRateFetchedAt?: string | null; fxRateSource?: string; onRefreshFxRate?: () => void; onSaveManualFxRate?: (rate: number) => void; }

export const PortalSidebar: React.FC<PortalSidebarProps> = ({ currentTab, isMinimized, onToggleMinimized, onNavigate, badgeCounts = {}, authEmail, currentRole = 'Admin', onNewQuote, fxRate = 86.85, fxRateLoading = false, onRefreshFxRate }) => {
  const router = useRouter();
  const [crmOpen, setCrmOpen] = useState(true);
  const [mailOpen, setMailOpen] = useState(false);
  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('crixy_actor_email');
      localStorage.removeItem('crixy_actor_name');
    }
    try {
      const { supabase, isSupabaseConfigured } = await import('../../lib/supabaseClient');
      if (isSupabaseConfigured) await supabase.auth.signOut();
    } catch {}
    try {
      const { firebaseAuth } = await import('../../lib/firebaseClient');
      if (firebaseAuth) {
        const { signOut } = await import('firebase/auth');
        await signOut(firebaseAuth);
      }
    } catch {}
    await fetch('/api/login', { method: 'DELETE' }).catch(() => {});
    router.push('/');
  };
  const items: NavItemDef[] = useMemo(() => [
    { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4"/>, href: '/overview' },
    { key: 'crm', label: 'Smart CRM', icon: <KanbanSquare className="h-4 w-4"/>, href: '/crm', count: badgeCounts.crm },
    { key: 'potentialBuyers', label: 'Potential Buyers', icon: <Target className="h-4 w-4"/>, href: '/potential-buyers', count: badgeCounts.potentialBuyers },
    { key: 'quotes', label: 'Quote Automation', icon: <FileCheck2 className="h-4 w-4"/>, href: '/quotes', count: badgeCounts.quotes },
    { key: 'accounting', label: 'Accounting & Expenses', icon: <Receipt className="h-4 w-4"/>, href: '/accounting', count: badgeCounts.accounting },
    { key: 'paymentIntelligence', label: 'Payment Intelligence', icon: <Receipt className="h-4 w-4"/>, href: '/payment-intelligence' },
    { key: 'teamTasks', label: 'Team Tasks', icon: <ClipboardList className="h-4 w-4"/>, href: '/team-tasks' },
    { key: 'inbox', label: 'Unified Inbox', icon: <Mail className="h-4 w-4"/>, href: '/inbox' },
    { key: 'templates', label: 'Mail & Message Templates', icon: <Mail className="h-4 w-4"/>, href: '/templates', count: badgeCounts.templates },
    { key: 'generateResponses', label: 'Generate Responses', icon: <Send className="h-4 w-4"/>, href: '/generate-responses' },
    { key: 'letterhead', label: 'Letterhead Generator', icon: <FileText className="h-4 w-4"/>, href: '/letterhead' },
    { key: 'products', label: 'Products', icon: <Package className="h-4 w-4"/>, href: '/products', count: badgeCounts.products },
    { key: 'vendors', label: 'Suppliers Management', icon: <Building2 className="h-4 w-4"/>, href: '/vendors', count: badgeCounts.vendors },
    { key: 'teamChat', label: 'Team Chat', icon: <MessageCircle className="h-4 w-4"/>, href: '/team-chat' },
    { key: 'users', label: 'Users & Roles', icon: <Lock className="h-4 w-4"/>, href: '/users', count: badgeCounts.users }
  ], [badgeCounts]);
  const groups = [
    { label: 'Command', keys: ['overview','crm','quotes','accounting','paymentIntelligence','teamTasks','inbox','templates','letterhead','teamChat'] },
    { label: 'Operations', keys: ['vendors','products'] },
    { label: 'Administration', keys: ['users'] }
  ];
  const itemButton = (active: boolean) => `relative flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[11.5px] font-bold transition-all duration-200 ${active ? 'bg-gradient-to-r from-emerald-300 to-teal-300 text-emerald-950 shadow-[0_10px_24px_-14px_rgba(110,231,183,.9)]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`;

  return <aside data-sidebar="true" data-minimized={isMinimized || undefined} className={`portal-sidebar fixed left-0 top-0 z-40 hidden h-screen flex-col overflow-hidden transition-[width,box-shadow] duration-300 ease-out lg:flex ${isMinimized ? 'w-[76px]' : 'w-[280px]'}`}>
    <div className="flex h-[72px] shrink-0 items-center border-b border-white/10 px-3.5">
      <button type="button" onClick={() => isMinimized ? onToggleMinimized() : onNavigate('overview', '/overview')} className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white" aria-label="Sheshaan Global home"><Image src="/logo.png" alt="" width={36} height={36} className="h-full w-full object-contain"/></button>
      {!isMinimized && <button type="button" onClick={() => onNavigate('overview', '/overview')} className="ml-3 min-w-0 flex-1 text-left"><p className="truncate text-sm font-black text-white">Sheshaan Global</p><p className="mt-0.5 truncate text-[9px] font-bold text-sky-100/70">Import · Export · Trade Solutions</p></button>}
      {!isMinimized && <button type="button" onClick={onToggleMinimized} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Minimize sidebar">‹</button>}
    </div>
    <div className="shrink-0 px-3.5 pb-2 pt-3"><button type="button" onClick={() => onNewQuote ? onNewQuote() : onNavigate('quotes', '/quotes?new=true')} className={`flex h-10 items-center justify-center rounded-lg bg-sky-600 text-xs font-black text-white transition hover:bg-sky-500 ${isMinimized ? 'mx-auto w-10' : 'w-full gap-2'}`} aria-label="New quote"><Plus className="h-4 w-4"/>{!isMinimized && 'New Quote'}</button></div>
    <nav aria-label="Primary navigation" className={`flex-1 overflow-y-auto ${isMinimized ? 'space-y-2 px-2 py-2' : 'space-y-4 px-3.5 py-2'} scrollbar-thin scrollbar-thumb-white/10`}>
      {groups.map((group, index) => { const visible = items.filter((item) => group.keys.includes(item.key) && canAccessTab(currentRole, item.key)); if (!visible.length) return null; return <section key={group.label}>{!isMinimized ? <p className="px-2 pb-1.5 text-[9.5px] font-black uppercase tracking-wider text-slate-400">{group.label}</p> : index > 0 ? <div className="mx-2 my-2 border-t border-white/10"/> : null}<div className="space-y-1">{visible.map((item) => { const active = item.key === currentTab || (item.key === 'crm' && currentTab === 'potentialBuyers') || (item.key === 'templates' && currentTab === 'generateResponses'); if (isMinimized) return <button key={item.key} type="button" onClick={() => onNavigate(item.key, item.href)} title={item.label} className={`mx-auto grid h-10 w-10 place-items-center rounded-lg transition ${active ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>{item.icon}</button>; if (item.key === 'crm') return <div key="crm" className="space-y-1"><button type="button" onClick={() => setCrmOpen((value) => !value)} className={itemButton(active)}>{item.icon}<span className="flex-1">Smart CRM</span><ChevronDown className={`h-3.5 w-3.5 transition ${crmOpen ? 'rotate-180' : ''}`}/></button>{crmOpen && <div className="ml-6 space-y-1 border-l border-white/10 pl-2"><button type="button" onClick={() => onNavigate('crm','/crm')} className="w-full rounded px-2 py-1.5 text-left text-[10.5px] font-bold text-slate-400 hover:bg-white/10 hover:text-white">CRM Pipeline</button><button type="button" onClick={() => onNavigate('potentialBuyers','/potential-buyers')} className="w-full rounded px-2 py-1.5 text-left text-[10.5px] font-bold text-slate-400 hover:bg-white/10 hover:text-white">Potential Buyers</button></div>}</div>; if (item.key === 'templates') return <div key="templates" className="space-y-1"><button type="button" onClick={() => setMailOpen((value) => !value)} className={itemButton(active)}>{item.icon}<span className="flex-1">Mail & Messages</span><ChevronDown className={`h-3.5 w-3.5 transition ${mailOpen ? 'rotate-180' : ''}`}/></button>{mailOpen && <div className="ml-6 space-y-1 border-l border-white/10 pl-2"><button type="button" onClick={() => onNavigate('templates','/templates')} className="w-full rounded px-2 py-1.5 text-left text-[10.5px] font-bold text-slate-400 hover:bg-white/10 hover:text-white">Template Library</button><button type="button" onClick={() => onNavigate('generateResponses','/generate-responses')} className="w-full rounded px-2 py-1.5 text-left text-[10.5px] font-bold text-slate-400 hover:bg-white/10 hover:text-white">Generate Responses</button></div>}</div>; if (item.key === 'potentialBuyers' || item.key === 'generateResponses') return null; return <button key={item.key} type="button" onClick={() => onNavigate(item.key, item.href)} onMouseEnter={() => router.prefetch(item.href)} className={itemButton(active)}>{item.icon}<span className="min-w-0 flex-1 truncate">{item.label}</span>{typeof item.count === 'number' && item.count > 0 && <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-slate-200">{item.count > 99 ? '99+' : item.count}</span>}</button>; })}</div></section>; })}
    </nav>
    <footer className="shrink-0 border-t border-white/10 bg-slate-950/20 p-3">{!isMinimized ? <><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-sky-500/20 text-xs font-black text-sky-200">{(authEmail || 'A')[0]?.toUpperCase()}</span><div className="min-w-0"><p className="truncate text-[10px] font-black text-white">{authEmail || 'Administrator'}</p><p className="text-[9px] font-bold text-slate-400">{currentRole}</p></div></div><div className="mt-2 flex items-center justify-between rounded-lg border border-white/10 bg-white/[.04] p-2"><span><span className="block text-[8px] font-black uppercase text-slate-400">USD / INR</span><strong className="text-[11px] text-emerald-300">₹{fxRate.toFixed(2)}</strong></span><button type="button" onClick={onRefreshFxRate} className="grid h-6 w-6 place-items-center rounded border border-white/10 text-slate-200" aria-label="Refresh USD INR rate"><RefreshCw className={`h-3 w-3 ${fxRateLoading ? 'animate-spin' : ''}`}/></button></div></> : <button type="button" onClick={onToggleMinimized} className="mx-auto grid h-9 w-9 place-items-center rounded-lg text-emerald-300">₹</button>}</footer>
    {!isMinimized && <div className="shrink-0 border-t border-white/10 bg-slate-950/30 px-3 pb-3 pt-2"><button type="button" onClick={() => void handleLogout()} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[.04] px-2 py-2 text-[10px] font-black text-slate-200 transition hover:border-rose-400/30 hover:bg-rose-500/15 hover:text-rose-100"><LogOut className="h-3.5 w-3.5"/>Logout</button></div>}
  </aside>;
};

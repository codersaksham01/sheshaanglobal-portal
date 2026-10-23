'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Target,
  KanbanSquare,
  Database,
  Mail,
  Phone,
  FileCheck2,
  MessageSquare,
  Send,
  FileText,
  ClipboardList,
  CalendarCheck,
  Ship,
  CheckSquare,
  Package,
  Building2,
  Anchor,
  History,
  BarChart3,
  Lock,
  LineChart,
  Plus,
  RefreshCw,
  Edit2,
  Check,
  ChevronDown,
  Menu,
  X,
  Search,
  Bell,
  Sparkles,
  Users
} from 'lucide-react';
import { AuthGate, usePortalIdentity } from '../AuthGate';
import { AppErrorBoundary } from '../AppErrorBoundary';
import { canAccessTab, PortalRole } from '../../lib/permissions';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { isFirebaseConfigured } from '../../lib/firebaseClient';

export type NavItemDef = {
  key: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  count?: number;
};

export const TAB_ROUTES: Record<string, string> = {
  overview: '/overview',
  actionQueue: '/action-queue',
  crm: '/crm',
  potentialBuyers: '/potential-buyers',
  dataSources: '/data-sources',
  dataCleanup: '/data-cleanup',
  phoneCleanup: '/phone-cleanup',
  phoneReachout: '/phone-reachout',
  quotes: '/quotes',
  communications: '/communications',
  teamChat: '/team-chat',
  templates: '/templates',
  generateResponses: '/generate-responses',
  blogs: '/admin-blogs',
  letterhead: '/letterhead',
  tasks: '/tasks',
  accounts: '/accounts',
  shipments: '/shipments',
  documents: '/documents',
  products: '/products',
  vendors: '/vendors',
  freight: '/freight',
  rates: '/rates',
  analytics: '/analytics',
  users: '/users',
  auditLog: '/audit-log',
  manager: '/manager'
};

interface PortalLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  pageTitle?: string;
  pageIcon?: React.ReactNode;
  badgeCounts?: Record<string, number>;
}

export function PortalLayoutContent({
  children,
  activeTab: propActiveTab,
  pageTitle: propPageTitle,
  pageIcon: propPageIcon,
  badgeCounts = {}
}: PortalLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { email: authEmail } = usePortalIdentity();

  // Determine active tab from route or prop
  const currentTab = useMemo(() => {
    if (propActiveTab) return propActiveTab;
    for (const [key, href] of Object.entries(TAB_ROUTES)) {
      if (pathname === href || pathname.startsWith(`${href}/`)) {
        return key;
      }
    }
    if (pathname === '/' || pathname === '/portal') return 'crm';
    return 'overview';
  }, [pathname, propActiveTab]);

  const [currentRole, setCurrentRole] = useState<PortalRole>('Admin');
  const [crmMenuOpen, setCrmMenuOpen] = useState(true);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Quick stats state with 0ms cached initial render
  const [quickCounts, setQuickCounts] = useState<{
    buyers: number;
    inquiries: number;
    leads: number;
    quotes: number;
    shipments: number;
  }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('portal_quick_counts');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch {}
    }
    return { buyers: 0, inquiries: 0, leads: 0, quotes: 0, shipments: 0 };
  });

  // USD / INR FX State
  const [fxRate, setFxRate] = useState<number>(86.85);
  const [fxRateDraft, setFxRateDraft] = useState<string>('86.85');
  const [fxRateLoading, setFxRateLoading] = useState(false);
  const [fxRateEditing, setFxRateEditing] = useState(false);
  const [fxRateSource, setFxRateSource] = useState<'Market' | 'Manual'>('Market');
  const [fxRateFetchedAt, setFxRateFetchedAt] = useState<string | null>(null);

  // Load user role and FX rate from cache or Supabase
  useEffect(() => {
    if (!authEmail) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('app_users')
          .select('role')
          .eq('email', authEmail.toLowerCase())
          .single();
        if (data?.role) {
          setCurrentRole(data.role as PortalRole);
        }
      } catch {
        // Fallback to Admin
      }
    })();
  }, [authEmail]);

  // Load quick counters in background and cache
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [
          { data: lData },
          { data: cData },
          { data: qData },
          { data: sData }
        ] = await Promise.all([
          supabase.from('leads').select('*'),
          supabase.from('clients').select('*'),
          supabase.from('quotes').select('*'),
          supabase.from('shipments').select('*')
        ]);
        if (isMounted) {
          const counts = {
            leads: lData?.length || 0,
            buyers: cData?.length || 0,
            quotes: qData?.length || 0,
            shipments: sData?.length || 0,
            inquiries: 0
          };
          setQuickCounts(counts);
          sessionStorage.setItem('portal_quick_counts', JSON.stringify(counts));
        }
      } catch {
        // Silent
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Fetch FX Rate
  const fetchMarketFxRate = useCallback(async () => {
    setFxRateLoading(true);
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (res.ok) {
        const json = await res.json();
        const inr = json?.rates?.INR;
        if (typeof inr === 'number' && inr > 0) {
          setFxRate(inr);
          setFxRateDraft(inr.toFixed(2));
          setFxRateSource('Market');
          setFxRateFetchedAt(new Date().toISOString());
          localStorage.setItem('portal_fx_rate', inr.toString());
          return;
        }
      }
    } catch {
      // Fallback
    } finally {
      setFxRateLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = localStorage.getItem('portal_fx_rate');
    if (cached) {
      const parsed = parseFloat(cached);
      if (!isNaN(parsed) && parsed > 0) {
        setFxRate(parsed);
        setFxRateDraft(parsed.toFixed(2));
      }
    } else {
      fetchMarketFxRate();
    }
  }, [fetchMarketFxRate]);

  const saveManualFxRate = () => {
    const parsed = parseFloat(fxRateDraft);
    if (!isNaN(parsed) && parsed > 0) {
      setFxRate(parsed);
      setFxRateSource('Manual');
      setFxRateFetchedAt(new Date().toISOString());
      localStorage.setItem('portal_fx_rate', parsed.toString());
      setFxRateEditing(false);
    }
  };

  const navItems: NavItemDef[] = useMemo(() => [
    { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" />, href: '/overview' },
    { key: 'actionQueue', label: 'Action Queue', icon: <Target className="h-4 w-4" />, href: '/action-queue', count: badgeCounts.actionQueue },
    { key: 'crm', label: 'Smart CRM Pipeline', icon: <KanbanSquare className="h-4 w-4" />, href: '/crm', count: badgeCounts.crm ?? quickCounts.leads },
    { key: 'potentialBuyers', label: 'Potential Buyers', icon: <Target className="h-4 w-4" />, href: '/potential-buyers', count: badgeCounts.potentialBuyers },
    { key: 'dataSources', label: 'Source Data', icon: <Database className="h-4 w-4" />, href: '/data-sources', count: badgeCounts.dataSources },
    { key: 'dataCleanup', label: 'Need Email Fix', icon: <Mail className="h-4 w-4" />, href: '/data-cleanup', count: badgeCounts.dataCleanup },
    { key: 'phoneCleanup', label: 'Need Phone Fix', icon: <Phone className="h-4 w-4" />, href: '/phone-cleanup', count: badgeCounts.phoneCleanup },
    { key: 'phoneReachout', label: 'Number Reachout', icon: <Phone className="h-4 w-4" />, href: '/phone-reachout', count: badgeCounts.phoneReachout },
    { key: 'quotes', label: 'Quote Automation', icon: <FileCheck2 className="h-4 w-4" />, href: '/quotes', count: badgeCounts.quotes ?? quickCounts.quotes },
    { key: 'communications', label: 'Communication Center', icon: <MessageSquare className="h-4 w-4" />, href: '/communications', count: badgeCounts.communications },
    { key: 'teamChat', label: 'Team Chat', icon: <MessageSquare className="h-4 w-4" />, href: '/team-chat', count: badgeCounts.teamChat },
    { key: 'templates', label: 'Mail & Message Templates', icon: <Mail className="h-4 w-4" />, href: '/templates', count: badgeCounts.templates },
    { key: 'generateResponses', label: 'Generate Responses', icon: <Send className="h-4 w-4" />, href: '/generate-responses' },
    { key: 'blogs', label: 'Blog Management', icon: <FileText className="h-4 w-4" />, href: '/admin-blogs', count: badgeCounts.blogs },
    { key: 'letterhead', label: 'Letterhead Generator', icon: <FileText className="h-4 w-4" />, href: '/letterhead' },
    { key: 'tasks', label: 'Tasks & Reminders', icon: <ClipboardList className="h-4 w-4" />, href: '/tasks', count: badgeCounts.tasks },
    { key: 'accounts', label: 'Accounts & Payments', icon: <CalendarCheck className="h-4 w-4" />, href: '/accounts', count: badgeCounts.accounts },
    { key: 'shipments', label: 'Shipment Operations', icon: <Ship className="h-4 w-4" />, href: '/shipments', count: badgeCounts.shipments ?? quickCounts.shipments },
    { key: 'documents', label: 'Document Packet Generator', icon: <CheckSquare className="h-4 w-4" />, href: '/documents', count: badgeCounts.documents },
    { key: 'products', label: 'Products', icon: <Package className="h-4 w-4" />, href: '/products', count: badgeCounts.products },
    { key: 'vendors', label: 'Suppliers / Vendors', icon: <Building2 className="h-4 w-4" />, href: '/vendors', count: badgeCounts.vendors },
    { key: 'freight', label: 'Freight Presets', icon: <Anchor className="h-4 w-4" />, href: '/freight', count: badgeCounts.freight },
    { key: 'rates', label: 'Rate History', icon: <History className="h-4 w-4" />, href: '/rates', count: badgeCounts.rates },
    { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" />, href: '/analytics' },
    { key: 'users', label: 'Users & Roles', icon: <Lock className="h-4 w-4" />, href: '/users', count: badgeCounts.users },
    { key: 'auditLog', label: 'Activity Log', icon: <History className="h-4 w-4" />, href: '/audit-log', count: badgeCounts.auditLog },
    { key: 'manager', label: 'Manager Dashboard', icon: <LineChart className="h-4 w-4" />, href: '/manager' }
  ], [badgeCounts, quickCounts]);

  const authorizedNavItems = useMemo(() => {
    return navItems.filter((item) => canAccessTab(currentRole, item.key));
  }, [navItems, currentRole]);

  const activeNavItem = authorizedNavItems.find((item) => item.key === currentTab) || authorizedNavItems[0];

  const navGroups = useMemo(() => [
    {
      label: 'Command',
      items: authorizedNavItems.filter((item) =>
        ['overview', 'actionQueue', 'crm', 'dataSources', 'dataCleanup', 'phoneCleanup', 'phoneReachout', 'quotes', 'communications', 'teamChat', 'templates', 'generateResponses', 'blogs', 'tasks', 'letterhead'].includes(item.key)
      )
    },
    {
      label: 'Operations',
      items: authorizedNavItems.filter((item) =>
        ['accounts', 'shipments', 'documents', 'products', 'vendors', 'freight', 'rates'].includes(item.key)
      )
    },
    {
      label: 'Admin',
      items: authorizedNavItems.filter((item) =>
        ['analytics', 'users', 'auditLog', 'manager'].includes(item.key)
      )
    }
  ], [authorizedNavItems]);

  const dbType = isFirebaseConfigured ? 'Firebase' : isSupabaseConfigured ? 'Supabase' : 'Local';
  const portalBuildLabel = 'Sheshaan Portal v3.4 Enterprise';

  return (
    <div className="portal-os relative min-h-screen pb-28 lg:pb-0">
      <div className="portal-shell">
        <div className="flex flex-col lg:flex-row">
          {/* Desktop Fixed Sidebar */}
          <aside
            data-sidebar="true"
            className="portal-sidebar hidden lg:flex flex-col w-[304px] h-screen fixed top-0 left-0 overflow-hidden z-40 animate-fade-up"
          >
            {/* Brand Header */}
            <div className="portal-brand-block flex items-center gap-3 px-5 py-5 shrink-0">
              <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-[0_16px_36px_rgba(14,165,233,0.22)] shrink-0 ring-1 ring-white/15">
                <Image src="/logo.png" alt="Sheshaan Global" width={40} height={40} className="h-full w-full object-contain" priority />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-black text-white tracking-tight leading-none truncate">Sheshaan Global</h1>
                <p className="text-[10px] text-sky-200/75 font-bold mt-1 uppercase tracking-wider">Export Operations Portal</p>
              </div>
            </div>

            {/* New Quote CTA */}
            <div className="px-4 pt-4 pb-2 shrink-0">
              <Link
                href="/quotes?new=true"
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white text-slate-950 hover:bg-sky-50 active:bg-sky-100 text-[11px] font-black rounded-lg shadow-[0_14px_34px_rgba(255,255,255,0.12)] transition-all duration-150"
              >
                <Plus className="h-3.5 w-3.5" />
                New Quote
              </Link>
            </div>

            {/* Navigation Groups */}
            <nav className="flex-1 overflow-y-auto px-3.5 pb-4 pt-2 space-y-5">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <p className="portal-nav-heading px-2 pb-1.5 pt-1">{group.label}</p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isCrmParent = item.key === 'crm';
                      const isTemplateParent = item.key === 'templates';
                      if (item.key === 'generateResponses') return null;
                      const isActive = isCrmParent
                        ? currentTab === 'crm' || currentTab === 'potentialBuyers'
                        : currentTab === item.key;

                      if (isCrmParent) {
                        return (
                          <div key={item.key} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => setCrmMenuOpen((open) => !open)}
                              className={`portal-nav-item w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-[11.5px] font-bold transition-all duration-150 relative group ${
                                isActive
                                  ? 'portal-nav-item-active text-white'
                                  : 'text-slate-400 hover:bg-white/10 hover:text-zinc-100'
                              }`}
                            >
                              {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-orange-400 rounded-r-full" />}
                              <span className={`shrink-0 ${isActive ? 'text-sky-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>{item.icon}</span>
                              <span className="flex-1 truncate">Smart CRM</span>
                              {typeof item.count === 'number' && item.count > 0 && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                                  isActive ? 'bg-sky-500/20 text-sky-300' : 'bg-zinc-700 text-zinc-400'
                                }`}>
                                  {item.count}
                                </span>
                              )}
                              <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${crmMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {crmMenuOpen && (
                              <div className="ml-6 space-y-1 border-l border-white/10 pl-2">
                                <Link
                                  href="/crm"
                                  className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-[10.5px] font-bold transition ${
                                    currentTab === 'crm' ? 'bg-sky-500/15 text-sky-200' : 'text-slate-500 hover:bg-white/10 hover:text-white'
                                  }`}
                                >
                                  Normal Smart CRM
                                </Link>
                                <Link
                                  href="/potential-buyers"
                                  className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-[10.5px] font-bold transition ${
                                    currentTab === 'potentialBuyers' ? 'bg-emerald-500/15 text-emerald-200' : 'text-slate-500 hover:bg-white/10 hover:text-white'
                                  }`}
                                >
                                  Potential Buyers
                                </Link>
                              </div>
                            )}
                          </div>
                        );
                      }

                      if (isTemplateParent) {
                        const templatesActive = currentTab === 'templates' || currentTab === 'generateResponses';
                        return (
                          <div key={item.key} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => setTemplateMenuOpen((open) => !open)}
                              className={`portal-nav-item w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-[11.5px] font-bold transition-all duration-150 relative group ${
                                templatesActive
                                  ? 'portal-nav-item-active text-white'
                                  : 'text-slate-400 hover:bg-white/10 hover:text-zinc-100'
                              }`}
                            >
                              {templatesActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-orange-400 rounded-r-full" />}
                              <span className={`shrink-0 ${templatesActive ? 'text-sky-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>{item.icon}</span>
                              <span className="flex-1 truncate">Mail & Messages</span>
                              <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${templateMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {templateMenuOpen && (
                              <div className="ml-6 space-y-1 border-l border-white/10 pl-2">
                                <Link
                                  href="/templates"
                                  className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-[10.5px] font-bold transition ${
                                    currentTab === 'templates' ? 'bg-sky-500/15 text-sky-200' : 'text-slate-500 hover:bg-white/10 hover:text-white'
                                  }`}
                                >
                                  Template Library
                                </Link>
                                <Link
                                  href="/generate-responses"
                                  className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-[10.5px] font-bold transition ${
                                    currentTab === 'generateResponses' ? 'bg-emerald-500/15 text-emerald-200' : 'text-slate-500 hover:bg-white/10 hover:text-white'
                                  }`}
                                >
                                  Generate Responses
                                </Link>
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          className={`portal-nav-item w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-[11.5px] font-bold transition-all duration-150 relative group ${
                            isActive
                              ? 'portal-nav-item-active text-white'
                              : 'text-slate-400 hover:bg-white/10 hover:text-zinc-100'
                          }`}
                        >
                          {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-orange-400 rounded-r-full" />}
                          <span className={`shrink-0 ${isActive ? 'text-sky-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>{item.icon}</span>
                          <span className="flex-1 truncate">{item.label}</span>
                          {typeof item.count === 'number' && item.count > 0 && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                              isActive ? 'bg-sky-500/20 text-sky-300' : 'bg-zinc-700 text-zinc-400'
                            }`}>
                              {item.count}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* Sidebar Footer: Role Badge + FX Rate */}
            <div className="border-t border-zinc-800 px-4 py-3 shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6 w-6 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-black text-sky-400">{(authEmail || 'A')[0].toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-zinc-300 truncate">{authEmail || 'Admin'}</p>
                    <p className="text-[9px] text-zinc-600 font-semibold">{currentRole}</p>
                  </div>
                </div>
                <span className="sbadge sbadge-sky text-[8px] shrink-0">{currentRole}</span>
              </div>

              {/* FX Box */}
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="block text-[9px] text-zinc-500 font-semibold">USD/INR</span>
                    <span className={`block text-[11px] font-black ${fxRateLoading ? 'text-zinc-500 animate-pulse' : 'text-emerald-400'}`}>
                      ₹{fxRate.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setFxRateEditing((value) => !value)}
                      className="h-7 w-7 rounded-md border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white flex items-center justify-center"
                      title="Edit USD/INR rate"
                      aria-label="Edit USD INR rate"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={fetchMarketFxRate}
                      disabled={fxRateLoading}
                      className="h-7 w-7 rounded-md border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-50 flex items-center justify-center"
                      title="Refresh market USD/INR rate"
                      aria-label="Refresh market USD INR rate"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${fxRateLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[8px] font-bold uppercase tracking-wide text-zinc-600">
                  <span>{fxRateSource} Rate</span>
                  <span>{fxRateFetchedAt ? new Date(fxRateFetchedAt).toLocaleDateString('en-IN') : 'Not synced'}</span>
                </div>
                {fxRateEditing && (
                  <div className="mt-2 flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      step="0.0001"
                      value={fxRateDraft}
                      onChange={(event) => setFxRateDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') saveManualFxRate();
                        if (event.key === 'Escape') {
                          setFxRateDraft(fxRate.toString());
                          setFxRateEditing(false);
                        }
                      }}
                      className="h-8 min-h-8 w-full rounded-md border border-white/10 bg-zinc-950 px-2 text-[11px] font-black text-white outline-none focus:border-sky-400"
                      aria-label="Manual USD INR rate"
                    />
                    <button
                      type="button"
                      onClick={saveManualFxRate}
                      className="h-8 w-8 rounded-md bg-emerald-500 text-white hover:bg-emerald-400 flex items-center justify-center"
                      title="Save manual rate"
                      aria-label="Save manual USD INR rate"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-sky-200/80">
                {portalBuildLabel}
              </div>
            </div>
          </aside>

          {/* Main Content Workspace Column */}
          <section className="relative z-10 flex-1 lg:ml-[304px] space-y-4 min-w-0 p-3 lg:p-5 xl:p-6">
            {/* Mobile Header Bar */}
            <div className="lg:hidden sticky top-2 z-30 portal-glass overflow-hidden animate-fade-up">
              <div className="px-3 py-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(false);
                    setShowMobileMenu(true);
                  }}
                  className="h-10 w-10 rounded-md bg-slate-900 text-white flex items-center justify-center shadow-sm active:scale-95 transition hover:bg-slate-800"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
                  <Image src="/logo.png" alt="Sheshaan Global logo" width={40} height={40} className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Sheshaan Global</p>
                  <p className="text-sm font-extrabold text-slate-900 truncate">{propPageTitle || activeNavItem?.label || 'Workspace'}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-sky-700">{portalBuildLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotifications((value) => !value)}
                  className="relative h-10 w-10 rounded-md border border-slate-200 bg-white text-slate-700 flex items-center justify-center active:scale-95 transition hover:bg-slate-50"
                  aria-label="Open notifications"
                >
                  <Bell className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Mobile Navigation Drawer */}
            {showMobileMenu && (
              <div className="lg:hidden fixed inset-0 z-50 flex">
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)} />
                <div className="relative w-72 max-w-[80vw] h-full bg-[#081827] text-white p-4 flex flex-col overflow-y-auto">
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Image src="/logo.png" alt="Sheshaan" width={32} height={32} className="rounded" />
                      <span className="font-bold text-sm">Sheshaan Global</span>
                    </div>
                    <button type="button" onClick={() => setShowMobileMenu(false)} className="p-1 rounded bg-white/10">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <nav className="mt-4 space-y-1 flex-1">
                    {authorizedNavItems.map((item) => (
                      <Link
                        key={item.key}
                        href={item.href}
                        onClick={() => setShowMobileMenu(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition ${
                          currentTab === item.key ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {item.icon}
                        <span className="flex-1">{item.label}</span>
                        {typeof item.count === 'number' && item.count > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10">{item.count}</span>
                        )}
                      </Link>
                    ))}
                  </nav>
                </div>
              </div>
            )}

            {/* Desktop Topbar */}
            <div className="hidden lg:block sticky top-4 z-20 portal-topbar overflow-visible animate-fade-up">
              <div className="min-h-16 px-4 py-3 grid gap-3 border-b border-slate-200 xl:grid-cols-[minmax(240px,0.42fr)_minmax(360px,1fr)] xl:items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-slate-950 text-white flex items-center justify-center shrink-0 shadow-[0_14px_30px_rgba(15,23,42,0.22)]">
                    {propPageIcon || activeNavItem?.icon || <LayoutDashboard className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sheshaan Global Admin</div>
                    <div className="portal-section-title text-base truncate">{propPageTitle || activeNavItem?.label || 'Workspace'}</div>
                  </div>
                </div>
                <div className="relative w-full min-w-0">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    placeholder="Search buyers, leads, quotes, invoices, shipments..."
                    className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            {/* Command Strip */}
            <div className="hidden lg:flex portal-command-strip items-center justify-between gap-3 px-4 py-3 animate-fade-up">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="portal-chip portal-chip-strong"><Database className="h-3.5 w-3.5" /> {dbType}</span>
                <span className="portal-chip"><Users className="h-3.5 w-3.5 text-sky-600" /> {quickCounts.buyers.toLocaleString()} buyers</span>
                <span className="portal-chip"><Target className="h-3.5 w-3.5 text-emerald-600" /> {quickCounts.leads.toLocaleString()} leads</span>
                <span className="portal-chip"><FileCheck2 className="h-3.5 w-3.5 text-amber-600" /> {quickCounts.quotes.toLocaleString()} quotes</span>
                <span className="portal-chip"><Ship className="h-3.5 w-3.5 text-indigo-600" /> {quickCounts.shipments.toLocaleString()} shipments</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="portal-chip"><RefreshCw className="h-3.5 w-3.5 text-emerald-600" /> Ready</span>
                <span className="portal-chip portal-chip-strong">USD/INR {fxRate.toFixed(2)}</span>
              </div>
            </div>

            {/* Workspace Main Area */}
            <main className="portal-workspace p-3 sm:p-5 lg:p-6 min-w-0 animate-panel-in">
              {children}
            </main>
          </section>
        </div>
      </div>
    </div>
  );
}

export function PortalLayout(props: PortalLayoutProps) {
  return (
    <AuthGate>
      <AppErrorBoundary>
        <PortalLayoutContent {...props} />
      </AppErrorBoundary>
    </AuthGate>
  );
}

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
  Send,
  FileText,
  ClipboardList,
  Package,
  Building2,
  Lock,
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
  Users,
  Receipt,
  ArrowRight
} from 'lucide-react';

const PanelLeftClose = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M9 3v18" />
    <path d="m14 9-3 3 3 3" />
  </svg>
);

const PanelLeftOpen = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M9 3v18" />
    <path d="m13 15 3-3-3-3" />
  </svg>
);
import { AuthGate, usePortalIdentity } from '../AuthGate';
import { AppErrorBoundary } from '../AppErrorBoundary';
import { PortalSidebar } from './PortalSidebar';
import { SystematicLoadingScreen } from '../SystematicLoadingScreen';
import { canAccessTab, PortalRole } from '../../lib/permissions';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { isFirebaseConfigured } from '../../lib/firebaseClient';
import { getPortalCache, fetchAllPortalData, TAB_ROUTES } from '../../lib/portalDataStore';

export type NavItemDef = {
  key: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  count?: number;
};

export { TAB_ROUTES };

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
  const [isSidebarMinimized, setIsSidebarMinimized] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem('portal_sidebar_minimized') === 'true';
      if (val) setIsSidebarMinimized(true);
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarMinimized((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('portal_sidebar_minimized', String(next));
        window.dispatchEvent(new Event('portal_sidebar_toggle'));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const val = localStorage.getItem('portal_sidebar_minimized') === 'true';
      setIsSidebarMinimized(val);
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('portal_sidebar_toggle', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('portal_sidebar_toggle', handleStorageChange);
    };
  }, []);

  const [commandOpen, setCommandOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setCommandOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  const [crmMenuOpen, setCrmMenuOpen] = useState(true);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Quick stats state with 0ms cached initial render
  const [isInitialSyncing, setIsInitialSyncing] = useState<boolean>(() => !getPortalCache());
  const [quickCounts, setQuickCounts] = useState<{
    buyers: number;
    inquiries: number;
    leads: number;
    quotes: number;
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
    return { buyers: 0, inquiries: 0, leads: 0, quotes: 0 };
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
    const cached = getPortalCache();
    if (cached && (cached.leads.length > 0 || cached.clients.length > 0 || cached.quotes.length > 0)) {
      setQuickCounts({
        leads: cached.leads.length,
        buyers: cached.clients.length,
        quotes: cached.quotes.length,
        inquiries: cached.inquiries.length
      });
      setIsInitialSyncing(false);
      return;
    }
    (async () => {
      try {
        const data = await fetchAllPortalData();
        if (isMounted) {
          const counts = {
            leads: data.leads.length,
            buyers: data.clients.length,
            quotes: data.quotes.length,
            inquiries: data.inquiries.length
          };
          setQuickCounts(counts);
          sessionStorage.setItem('portal_quick_counts', JSON.stringify(counts));
        }
      } catch {
        // Silent
      } finally {
        if (isMounted) setIsInitialSyncing(false);
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
    { key: 'crm', label: 'Smart CRM Pipeline', icon: <KanbanSquare className="h-4 w-4" />, href: '/crm', count: badgeCounts.crm ?? quickCounts.leads },
    { key: 'potentialBuyers', label: 'Potential Buyers', icon: <Target className="h-4 w-4" />, href: '/potential-buyers', count: badgeCounts.potentialBuyers },
    { key: 'quotes', label: 'Quote Automation', icon: <FileCheck2 className="h-4 w-4" />, href: '/quotes', count: badgeCounts.quotes ?? quickCounts.quotes },
    { key: 'accounting', label: 'Accounting & Expenses', icon: <Receipt className="h-4 w-4" />, href: '/accounting', count: badgeCounts.accounting },
    { key: 'templates', label: 'Mail & Message Templates', icon: <Mail className="h-4 w-4" />, href: '/templates', count: badgeCounts.templates },
    { key: 'generateResponses', label: 'Generate Responses', icon: <Send className="h-4 w-4" />, href: '/generate-responses' },
    { key: 'letterhead', label: 'Letterhead Generator', icon: <FileText className="h-4 w-4" />, href: '/letterhead' },
    { key: 'products', label: 'Products', icon: <Package className="h-4 w-4" />, href: '/products', count: badgeCounts.products },
    { key: 'vendors', label: 'Suppliers Management', icon: <Building2 className="h-4 w-4" />, href: '/vendors', count: badgeCounts.vendors },
    { key: 'users', label: 'Users & Roles', icon: <Lock className="h-4 w-4" />, href: '/users', count: badgeCounts.users }
  ], [badgeCounts, quickCounts]);

  const authorizedNavItems = useMemo(() => {
    return navItems.filter((item) => canAccessTab(currentRole, item.key));
  }, [navItems, currentRole]);

  const activeNavItem = authorizedNavItems.find((item) => item.key === currentTab) || authorizedNavItems[0];

  const navGroups = useMemo(() => [
    {
      label: 'Command',
      items: authorizedNavItems.filter((item) =>
        ['overview', 'crm', 'quotes', 'accounting', 'templates', 'generateResponses', 'letterhead'].includes(item.key)
      )
    },
    {
      label: 'Operations',
      items: authorizedNavItems.filter((item) =>
        ['products', 'vendors'].includes(item.key)
      )
    },
    {
      label: 'Admin',
      items: authorizedNavItems.filter((item) =>
        ['users'].includes(item.key)
      )
    }
  ], [authorizedNavItems]);

  const dbType = isFirebaseConfigured ? 'Firebase' : isSupabaseConfigured ? 'Supabase' : 'Local';
  const portalBuildLabel = 'Sheshaan Portal v3.4 Enterprise';

  return (
    <div className="portal-os relative min-h-screen pb-28 lg:pb-0">
      {/* Subtle Top Sync Indicator */}
      {isInitialSyncing && (
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400 via-indigo-500 to-emerald-400 z-50 animate-pulse pointer-events-none" />
      )}
      <div className="portal-shell">
        <div className="flex flex-col lg:flex-row">
          {/* Desktop Fixed Sidebar */}
          <PortalSidebar
            currentTab={currentTab}
            isMinimized={isSidebarMinimized}
            onToggleMinimized={toggleSidebar}
            onNavigate={(_key, href) => router.push(href)}
            badgeCounts={{
              ...badgeCounts,
              crm: badgeCounts.crm ?? quickCounts.leads,
              quotes: badgeCounts.quotes ?? quickCounts.quotes
            }}
            authEmail={authEmail}
            currentRole={currentRole}
            onNewQuote={() => router.push('/quotes?new=true')}
            fxRate={fxRate}
            fxRateLoading={fxRateLoading}
            fxRateFetchedAt={fxRateFetchedAt}
            fxRateSource={fxRateSource}
            onRefreshFxRate={fetchMarketFxRate}
            onSaveManualFxRate={(rate) => {
              setFxRate(rate);
              setFxRateSource('Manual');
              setFxRateFetchedAt(new Date().toISOString());
              localStorage.setItem('portal_fx_rate', rate.toString());
            }}
          />

          {/* Main Content Workspace Column: Full Page, Borderless, Natural Spacing */}
          <section className={`relative z-10 flex-1 ${
            isSidebarMinimized ? 'lg:ml-[76px]' : 'lg:ml-[304px]'
          } min-w-0 transition-[margin-left] duration-200 ease-out will-change-[margin-left]`}>
            {/* Mobile Header Bar: Flush edge-to-edge, full width, 0 border gaps */}
            <div className="lg:hidden sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs mb-0 overflow-hidden pt-[env(safe-area-inset-top,0px)]">
              <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(false);
                    setShowMobileMenu(true);
                  }}
                  className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm active:scale-95 transition hover:bg-slate-800 shrink-0"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white shadow-xs">
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
                  className="relative h-10 w-10 rounded-xl bg-white text-slate-700 flex items-center justify-center shadow-xs active:scale-95 transition hover:bg-slate-50 shrink-0"
                  aria-label="Open notifications"
                >
                  <Bell className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Mobile Notification Popover */}
            {showNotifications && (
              <div className="lg:hidden fixed inset-x-3 top-16 z-50 rounded-2xl border border-slate-200 bg-white shadow-2xl p-4 animate-panel-in">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-sky-600" />
                    <span className="font-extrabold text-xs text-slate-900">Notifications</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="h-7 w-7 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
                    aria-label="Close notifications"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800">System Ready</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Database synchronized and all trade workspaces live.</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-sky-500 mt-1 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800">FX Rate Updated</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">USD/INR at ₹{fxRate.toFixed(2)} ({fxRateSource}).</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Navigation Drawer */}
            {showMobileMenu && (
              <div className="lg:hidden fixed inset-0 z-50 flex">
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setShowMobileMenu(false)} />
                <div className="relative w-80 max-w-[85vw] h-full bg-[#081827] text-white flex flex-col overflow-hidden shadow-2xl animate-slide-in-left">
                  {/* Drawer Header */}
                  <div className="p-4 flex items-center justify-between border-b border-white/10 shrink-0 pt-[max(1rem,env(safe-area-inset-top,0px))]">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center overflow-hidden p-1 shadow-sm shrink-0">
                        <Image src="/logo.png" alt="Sheshaan" width={32} height={32} className="h-full w-full object-contain" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-black text-sm block leading-none">Sheshaan Global</span>
                        <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider block mt-1">Export Command</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMobileMenu(false)}
                      className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center text-slate-300 hover:text-white transition"
                      aria-label="Close drawer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* New Quote Quick Action */}
                  <div className="p-3 shrink-0 border-b border-white/5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMobileMenu(false);
                        router.push('/quotes?new=true');
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-sky-50 active:bg-sky-100 text-slate-950 text-xs font-black rounded-xl shadow-md transition"
                    >
                      <Plus className="h-4 w-4" />
                      <span>New Quote</span>
                    </button>
                  </div>

                  {/* Nav Items List */}
                  <nav className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
                    {navGroups.map((group) => (
                      <div key={group.label}>
                        <p className="px-2 pb-1.5 text-[9.5px] uppercase font-extrabold tracking-wider text-slate-400/80">
                          {group.label}
                        </p>
                        <div className="space-y-1">
                          {group.items.map((item) => {
                            if (!canAccessTab(currentRole, item.key)) return null;
                            if (item.key === 'generateResponses') return null;

                            const isCrmParent = item.key === 'crm';
                            const isTemplateParent = item.key === 'templates';
                            const isActive = isCrmParent
                              ? currentTab === 'crm' || currentTab === 'potentialBuyers'
                              : isTemplateParent
                              ? currentTab === 'templates' || currentTab === 'generateResponses'
                              : currentTab === item.key;

                            if (isCrmParent) {
                              return (
                                <div key={item.key} className="space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => setCrmMenuOpen((open) => !open)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                                      isActive ? 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/30' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                    }`}
                                  >
                                    <span className={isActive ? 'text-sky-400' : 'text-slate-400'}>{item.icon}</span>
                                    <span className="flex-1">Smart CRM</span>
                                    {typeof item.count === 'number' && item.count > 0 && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/15 text-white font-bold">{item.count}</span>
                                    )}
                                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${crmMenuOpen ? 'rotate-180' : ''}`} />
                                  </button>
                                  {crmMenuOpen && (
                                    <div className="ml-5 space-y-1 border-l border-white/10 pl-2.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowMobileMenu(false);
                                          router.push('/crm');
                                        }}
                                        className={`w-full rounded-lg px-2.5 py-2 text-left text-xs font-bold transition ${
                                          currentTab === 'crm' ? 'bg-sky-500/20 text-sky-200' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                      >
                                        Normal Smart CRM
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowMobileMenu(false);
                                          router.push('/potential-buyers');
                                        }}
                                        className={`w-full rounded-lg px-2.5 py-2 text-left text-xs font-bold transition ${
                                          currentTab === 'potentialBuyers' ? 'bg-emerald-500/20 text-emerald-200' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                      >
                                        Potential Buyers
                                      </button>
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
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                                      templatesActive ? 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/30' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                    }`}
                                  >
                                    <span className={templatesActive ? 'text-sky-400' : 'text-slate-400'}>{item.icon}</span>
                                    <span className="flex-1">Mail & Messages</span>
                                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${templateMenuOpen ? 'rotate-180' : ''}`} />
                                  </button>
                                  {templateMenuOpen && (
                                    <div className="ml-5 space-y-1 border-l border-white/10 pl-2.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowMobileMenu(false);
                                          router.push('/templates');
                                        }}
                                        className={`w-full rounded-lg px-2.5 py-2 text-left text-xs font-bold transition ${
                                          currentTab === 'templates' ? 'bg-sky-500/20 text-sky-200' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                      >
                                        Template Library
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowMobileMenu(false);
                                          router.push('/generate-responses');
                                        }}
                                        className={`w-full rounded-lg px-2.5 py-2 text-left text-xs font-bold transition ${
                                          currentTab === 'generateResponses' ? 'bg-emerald-500/20 text-emerald-200' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                      >
                                        Generate Responses
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => {
                                  setShowMobileMenu(false);
                                  router.push(item.href);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                                  isActive ? 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/30' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                }`}
                              >
                                <span className={isActive ? 'text-sky-400' : 'text-slate-400'}>{item.icon}</span>
                                <span className="flex-1 truncate">{item.label}</span>
                                {typeof item.count === 'number' && item.count > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/15 text-white font-bold">{item.count}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </nav>

                  {/* Drawer Footer: FX Rate & User Role */}
                  <div className="p-3 border-t border-white/10 shrink-0 bg-slate-950/60 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
                    <div className="flex items-center justify-between text-xs mb-2 bg-white/5 p-2 rounded-xl">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">USD/INR</span>
                        <span className="text-emerald-400 font-extrabold text-xs">₹{fxRate.toFixed(2)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={fetchMarketFxRate}
                        disabled={fxRateLoading}
                        className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center text-slate-300 transition"
                        title="Refresh FX rate"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${fxRateLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-sky-500/20 border border-sky-400/30 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-black text-sky-400">{(authEmail || 'A')[0].toUpperCase()}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-300 truncate">{authEmail || 'Admin'}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-sky-500/15 text-sky-300 border border-sky-500/30 shrink-0">
                        {currentRole}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Bottom Navigation Dock */}
            <nav className="fixed inset-x-3 bottom-3 z-40 portal-mobile-dock lg:hidden mobile-safe-bottom">
              <div className="grid grid-cols-5 p-1">
                <button
                  type="button"
                  onClick={() => router.push('/overview')}
                  className={`min-h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition active:scale-95 ${
                    currentTab === 'overview' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="leading-none">Home</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/crm')}
                  className={`min-h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition active:scale-95 relative ${
                    currentTab === 'crm' || currentTab === 'potentialBuyers' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <KanbanSquare className="h-4 w-4" />
                  <span className="leading-none">CRM</span>
                  {quickCounts.leads > 0 && (
                    <span className="absolute top-1.5 right-2 h-2 w-2 rounded-full bg-sky-500" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/quotes')}
                  className={`min-h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition active:scale-95 relative ${
                    currentTab === 'quotes' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileCheck2 className="h-4 w-4" />
                  <span className="leading-none">Quotes</span>
                  {quickCounts.quotes > 0 && (
                    <span className="absolute top-1.5 right-2 h-2 w-2 rounded-full bg-amber-500" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/accounting')}
                  className={`min-h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition active:scale-95 ${
                    currentTab === 'accounting' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Receipt className="h-4 w-4" />
                  <span className="leading-none">Accounts</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(false);
                    setShowMobileMenu(true);
                  }}
                  className="min-h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 transition active:scale-95"
                >
                  <Menu className="h-4 w-4" />
                  <span className="leading-none">Menu</span>
                </button>
              </div>
            </nav>

            {/* Desktop Top Header Bar */}
            <header className="hidden lg:flex items-center justify-between px-8 py-3 bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                  {propPageIcon || activeNavItem?.icon}
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 leading-none">
                    {propPageTitle || activeNavItem?.label || 'Trade Command'}
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                    Sheshaan Global • Export Portal
                  </p>
                </div>
              </div>

              {/* Center Command Search Trigger */}
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="w-80 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-between text-xs font-semibold transition group shadow-2xs cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600" />
                  <span>Search or jump to...</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
                  Ctrl+K
                </span>
              </button>

              {/* Right Strip */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={fetchMarketFxRate}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-[11px] font-black hover:bg-emerald-100/60 transition"
                  title="Click to refresh live USD/INR market rate"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>USD/INR ₹{fxRate.toFixed(2)}</span>
                  <RefreshCw className={`h-2.5 w-2.5 text-emerald-600 ${fxRateLoading ? 'animate-spin' : ''}`} />
                </button>

                <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                  <div className="h-7 w-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">
                    {(authEmail || 'A')[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-slate-700 max-w-[120px] truncate">
                    {authEmail || 'Admin'}
                  </span>
                </div>
              </div>
            </header>

            {/* Workspace Main Area: Full Width, Edge-to-Edge */}
            <main className="w-full min-w-0 px-3 py-4 sm:p-6 lg:p-8 animate-panel-in">
              {children}
            </main>
          </section>
        </div>
      </div>

      {/* Global Command Center (Ctrl+K Modal) */}
      {commandOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={() => setCommandOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl animate-panel-in max-h-[70vh] flex flex-col z-50">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <Search className="h-5 w-5 text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                placeholder="Type a workspace, action, or record..."
                className="w-full text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setCommandOpen(false)}
                className="h-6 px-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 text-[10px] font-bold"
              >
                ESC
              </button>
            </div>

            <div className="mt-3 overflow-y-auto flex-1 space-y-3 text-xs">
              {/* Navigation Options */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Workspaces
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {authorizedNavItems
                    .filter((item) => !commandSearch || item.label.toLowerCase().includes(commandSearch.toLowerCase()))
                    .slice(0, 8)
                    .map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          router.push(item.href);
                          setCommandOpen(false);
                          setCommandSearch('');
                        }}
                        className="flex items-center gap-2 p-2 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-sky-50 hover:border-sky-200 transition text-left"
                      >
                        <span className="text-slate-600">{item.icon}</span>
                        <span className="font-extrabold text-slate-800 text-[11px] truncate">{item.label}</span>
                      </button>
                    ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Quick Actions
                </p>
                <div className="space-y-1">
                  {[
                    { label: 'Create New Quotation', icon: <Plus className="h-3.5 w-3.5" />, href: '/quotes?new=true' },
                    { label: 'Register Product SKU', icon: <Package className="h-3.5 w-3.5" />, href: '/products' },
                    { label: 'Add Potential Buyer', icon: <Target className="h-3.5 w-3.5" />, href: '/potential-buyers' },
                    { label: 'Generate Official Letterhead', icon: <FileText className="h-3.5 w-3.5" />, href: '/letterhead' },
                    { label: 'Corporate Expense Accounting', icon: <Receipt className="h-3.5 w-3.5" />, href: '/accounting' }
                  ]
                    .filter((a) => !commandSearch || a.label.toLowerCase().includes(commandSearch.toLowerCase()))
                    .map((action, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          router.push(action.href);
                          setCommandOpen(false);
                          setCommandSearch('');
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition text-left font-semibold text-slate-700"
                      >
                        <span className="flex items-center gap-2 text-slate-800">
                          {action.icon}
                          <span className="text-[11px]">{action.label}</span>
                        </span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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

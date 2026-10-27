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
  Receipt
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
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
          } min-w-0 p-3 sm:p-5 lg:p-6 transition-[margin-left] duration-200 ease-out will-change-[margin-left]`}>
            {/* Mobile Header Bar */}
            <div className="lg:hidden sticky top-2 z-30 bg-white/95 backdrop-blur-md rounded-2xl shadow-sm mb-3 overflow-hidden animate-fade-up">
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(false);
                    setShowMobileMenu(true);
                  }}
                  className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm active:scale-95 transition hover:bg-slate-800"
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
                  className="relative h-10 w-10 rounded-xl bg-white text-slate-700 flex items-center justify-center shadow-xs active:scale-95 transition hover:bg-slate-50"
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
                        prefetch={true}
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

            {/* Workspace Main Area: Full Width, Edge-to-Edge */}
            <main className="w-full min-w-0 animate-panel-in">
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

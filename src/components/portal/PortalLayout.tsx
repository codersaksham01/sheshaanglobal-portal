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
  MessageCircle,
  Receipt,
  ArrowRight,
  Sun,
  Moon,
  LogOut
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
import { supabase } from '../../lib/supabaseClient';
import { createDueTaskNotifications } from '../../lib/portalNotifications';
import { getPortalCache, fetchAllPortalData, TAB_ROUTES, type PortalDataCache } from '../../lib/portalDataStore';
import { PortalNotification } from '../../lib/types';

export type NavItemDef = {
  key: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  count?: number;
};

type GlobalSearchRecord = {
  id: string;
  type: string;
  title: string;
  details: string;
  href: string;
  tab: string;
  icon: React.ReactNode;
  searchableText: string;
};

const searchText = (values: Array<unknown>) => values
  .flatMap((value) => Array.isArray(value) ? value : [value])
  .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
  .map((value) => String(value).trim())
  .filter(Boolean)
  .join(' ');

const recordDetails = (fields: Array<[string, unknown]>) => fields
  .flatMap(([label, value]) => {
    const text = Array.isArray(value) ? value.filter(Boolean).join(', ') : String(value || '').trim();
    return text ? [`${label}: ${text}`] : [];
  })
  .join(' · ');

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

  const [currentRole, setCurrentRole] = useState<PortalRole>('Sales');
  const [isSidebarMinimized, setIsSidebarMinimized] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('portal_sidebar_minimized');
      setIsSidebarMinimized(stored === null ? true : stored === 'true');
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
  const [searchData, setSearchData] = useState<PortalDataCache | null>(() => getPortalCache());
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('portal_theme');
    const next = saved === 'dark';
    setIsDark(next);
    document.body.classList.toggle('dark', next);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((current) => {
      const next = !current;
      document.body.classList.toggle('dark', next);
      localStorage.setItem('portal_theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

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
        setShowNotifications(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  const [crmMenuOpen, setCrmMenuOpen] = useState(true);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [notificationsUnavailable, setNotificationsUnavailable] = useState(false);

  const handleMobileLogout = useCallback(async () => {
    setShowMobileMenu(false);
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
  }, [router]);
  const [globalSearch, setGlobalSearch] = useState('');

  const loadNotifications = useCallback(async () => {
    if (!authEmail || notificationsUnavailable) return;
    await createDueTaskNotifications(authEmail).catch(() => {});
    const { data, error } = await supabase
      .from('portal_notifications')
      .select('*')
      .eq('target_email', authEmail.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(12);
    if (error) {
      // A missing table means the Supabase migration has not been applied yet.
      // Stop polling in that state rather than filling the console every 30s.
      if (error.code === 'PGRST205' || error.message.includes("Could not find the table 'public.portal_notifications'")) {
        setNotificationsUnavailable(true);
        setNotifications([]);
        return;
      }
      console.warn('Unable to load portal notifications:', error.message);
      return;
    }
    setNotifications((data || []) as PortalNotification[]);
  }, [authEmail, notificationsUnavailable]);

  useEffect(() => {
    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 30_000);
    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  const openNotifications = () => {
    setShowNotifications((open) => !open);
    void loadNotifications();
  };

  const unreadNotificationCount = notifications.filter((notification) => !notification.read_at).length;

  const markNotificationsRead = useCallback(async () => {
    if (!unreadNotificationCount || notificationsUnavailable) return;
    const readAt = new Date().toISOString();
    const { error } = await supabase.from('portal_notifications').update({ read_at: readAt }).eq('target_email', authEmail.toLowerCase()).is('read_at', null);
    if (!error) setNotifications((current) => current.map((notification) => notification.read_at ? notification : { ...notification, read_at: readAt }));
  }, [authEmail, notificationsUnavailable, unreadNotificationCount]);

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
    { key: 'paymentIntelligence', label: 'Payment Intelligence', icon: <Receipt className="h-4 w-4" />, href: '/payment-intelligence' },
    { key: 'teamTasks', label: 'Team Tasks', icon: <ClipboardList className="h-4 w-4" />, href: '/team-tasks' },
    { key: 'inbox', label: 'Unified Inbox', icon: <Mail className="h-4 w-4" />, href: '/inbox' },
    { key: 'templates', label: 'Mail & Message Templates', icon: <Mail className="h-4 w-4" />, href: '/templates', count: badgeCounts.templates },
    { key: 'generateResponses', label: 'Generate Responses', icon: <Send className="h-4 w-4" />, href: '/generate-responses' },
    { key: 'letterhead', label: 'Letterhead Generator', icon: <FileText className="h-4 w-4" />, href: '/letterhead' },
    { key: 'products', label: 'Products', icon: <Package className="h-4 w-4" />, href: '/products', count: badgeCounts.products },
    { key: 'vendors', label: 'Suppliers Management', icon: <Building2 className="h-4 w-4" />, href: '/vendors', count: badgeCounts.vendors },
    { key: 'teamChat', label: 'Team Chat', icon: <MessageCircle className="h-4 w-4" />, href: '/team-chat' },
    { key: 'users', label: 'Users & Roles', icon: <Lock className="h-4 w-4" />, href: '/users', count: badgeCounts.users }
  ], [badgeCounts, quickCounts]);

  const authorizedNavItems = useMemo(() => {
    return navItems.filter((item) => canAccessTab(currentRole, item.key));
  }, [navItems, currentRole]);

  useEffect(() => {
    if (!commandOpen) return;

    let cancelled = false;
    const cached = getPortalCache();
    if (cached) setSearchData(cached);

    setIsSearchLoading(!cached);
    fetchAllPortalData()
      .then((data) => {
        if (!cancelled) setSearchData(data);
      })
      .catch(() => {
        // Keep any cached records available rather than replacing them with an error state.
      })
      .finally(() => {
        if (!cancelled) setIsSearchLoading(false);
      });

    return () => { cancelled = true; };
  }, [commandOpen]);

  const globalSearchRecords = useMemo<GlobalSearchRecord[]>(() => {
    if (!searchData) return [];

    const records: GlobalSearchRecord[] = [];
    const canSearch = (tab: string) => canAccessTab(currentRole, tab);
    const add = (record: Omit<GlobalSearchRecord, 'searchableText'>, terms: Array<unknown>) => {
      records.push({ ...record, searchableText: searchText([record.title, record.details, ...terms]).toLowerCase() });
    };

    if (canSearch('crm')) {
      searchData.clients.forEach((client) => {
        const details = recordDetails([
          ['Contact', client.contact_name], ['Email', client.contact_email], ['Phone', client.phone],
          ['Address', client.address], ['Destination', client.destination_port], ['Products', client.products_dealing], ['Status', client.lifecycle_status]
        ]);
        add({ id: `buyer-${client.id}`, type: 'Buyer', title: client.company_name || 'Unnamed buyer', details, href: '/crm', tab: 'crm', icon: <Users className="h-4 w-4" /> }, Object.values(client));
      });
      searchData.leads.forEach((lead) => {
        const details = recordDetails([
          ['Contact', lead.contact_name], ['Email', lead.contact_email], ['Phone', lead.phone], ['Country', lead.country],
          ['Product', lead.product_interest], ['Stage', lead.stage], ['Owner', lead.owner], ['Notes', lead.notes]
        ]);
        add({ id: `lead-${lead.id}`, type: 'CRM lead', title: lead.company_name || 'Unnamed lead', details, href: '/crm', tab: 'crm', icon: <Target className="h-4 w-4" /> }, Object.values(lead));
      });
      searchData.inquiries.forEach((inquiry) => {
        const details = recordDetails([
          ['Inquiry', inquiry.inquiry_number], ['Contact', inquiry.contact_person], ['Email', inquiry.contact_email], ['WhatsApp', inquiry.whatsapp_number],
          ['Country', inquiry.country], ['Product', inquiry.product_name], ['Destination', inquiry.destination_port], ['Stage', inquiry.stage], ['Salesperson', inquiry.salesperson]
        ]);
        add({ id: `inquiry-${inquiry.id}`, type: 'Inquiry', title: inquiry.buyer_company || inquiry.inquiry_number, details, href: '/crm', tab: 'crm', icon: <KanbanSquare className="h-4 w-4" /> }, Object.values(inquiry));
      });
    }

    if (canSearch('vendors')) {
      searchData.vendors.forEach((vendor) => {
        const details = recordDetails([
          ['Contact', vendor.contact_name], ['Email', vendor.contact_email], ['Phone', vendor.phone], ['Address', vendor.address],
          ['Location', [vendor.city, vendor.state, vendor.country].filter(Boolean)], ['Products', vendor.product_categories], ['Terms', vendor.payment_terms], ['Status', vendor.status], ['Notes', vendor.notes]
        ]);
        add({ id: `supplier-${vendor.id}`, type: 'Supplier', title: vendor.company_name || 'Unnamed supplier', details, href: '/vendors', tab: 'vendors', icon: <Building2 className="h-4 w-4" /> }, Object.values(vendor));
      });
    }

    if (canSearch('products')) {
      searchData.products.forEach((product) => {
        const details = recordDetails([
          ['SKU', product.sku], ['Description', product.description], ['Price', product.unit_price ? `₹${product.unit_price}` : undefined],
          ['Weight', product.weight ? `${product.weight} kg` : undefined], ['Dimensions', product.dimensions]
        ]);
        add({ id: `product-${product.id}`, type: 'Product', title: product.description || product.sku || 'Unnamed product', details, href: '/products', tab: 'products', icon: <Package className="h-4 w-4" /> }, Object.values(product));
      });
    }

    if (canSearch('quotes')) {
      searchData.quotes.forEach((quote) => {
        const quoteWithRelations = quote as typeof quote & { client?: { company_name?: string }; items?: Array<{ sku?: string; description?: string }> };
        const details = recordDetails([
          ['Quote', quote.quote_number], ['Buyer', quoteWithRelations.client?.company_name], ['Origin', quote.origin_country], ['Route', [quote.loading_port, quote.destination_port].filter(Boolean)],
          ['Incoterm', quote.incoterm], ['Mode', quote.shipment_mode], ['Terms', quote.payment_terms], ['Status', quote.status], ['Items', quoteWithRelations.items?.map((item) => item.description || item.sku)]
        ]);
        add({ id: `quote-${quote.id}`, type: 'Quote', title: quote.quote_number || 'Untitled quote', details, href: '/quotes', tab: 'quotes', icon: <FileCheck2 className="h-4 w-4" /> }, [Object.values(quote), quoteWithRelations.client?.company_name, quoteWithRelations.items?.flatMap((item) => [item.sku, item.description])]);
      });
    }

    if (canSearch('accounting')) {
      searchData.invoices.forEach((invoice) => {
        const details = recordDetails([
          ['Type', invoice.invoice_type], ['Amount', `${invoice.currency} ${invoice.amount}`], ['Payment', invoice.payment_status], ['Due', invoice.due_date], ['Notes', invoice.notes]
        ]);
        add({ id: `invoice-${invoice.id}`, type: 'Invoice', title: invoice.invoice_number || 'Untitled invoice', details, href: '/accounting', tab: 'accounting', icon: <Receipt className="h-4 w-4" /> }, Object.values(invoice));
      });
    }

    if (canSearch('overview')) {
      searchData.shipments.forEach((shipment) => {
        const details = recordDetails([
          ['Booking', shipment.booking_number], ['Vessel', shipment.vessel_name], ['Container', shipment.container_number],
          ['Bill of lading', shipment.bl_number], ['ETD', shipment.etd], ['ETA', shipment.eta], ['Status', shipment.status], ['Notes', shipment.notes]
        ]);
        add({ id: `shipment-${shipment.id}`, type: 'Shipment', title: shipment.booking_number || shipment.container_number || 'Shipment record', details, href: '/overview', tab: 'overview', icon: <Database className="h-4 w-4" /> }, Object.values(shipment));
      });
    }

    if (canSearch('teamTasks')) {
      searchData.tasks.forEach((task) => {
        const details = recordDetails([
          ['Status', task.status], ['Priority', task.priority], ['Owner', task.owner], ['Due', task.due_date], ['Notes', task.notes]
        ]);
        add({ id: `task-${task.id}`, type: 'Task', title: task.title || 'Untitled task', details, href: '/team-tasks', tab: 'teamTasks', icon: <ClipboardList className="h-4 w-4" /> }, Object.values(task));
      });
    }

    return records;
  }, [currentRole, searchData]);

  const matchingSearchRecords = useMemo(() => {
    const query = commandSearch.trim().toLowerCase();
    if (!query) return [];
    return globalSearchRecords.filter((record) => record.searchableText.includes(query)).slice(0, 30);
  }, [commandSearch, globalSearchRecords]);

  const activeNavItem = authorizedNavItems.find((item) => item.key === currentTab) || authorizedNavItems[0];

  const navGroups = useMemo(() => [
    { label: 'Command', items: authorizedNavItems.filter((item) => ['overview', 'crm', 'vendors', 'quotes', 'accounting', 'paymentIntelligence', 'teamTasks', 'inbox', 'templates', 'generateResponses', 'letterhead', 'teamChat'].includes(item.key)) },
    { label: 'Operations', items: authorizedNavItems.filter((item) => ['products'].includes(item.key)) },
    { label: 'Admin', items: authorizedNavItems.filter((item) => ['users'].includes(item.key)) }
  ], [authorizedNavItems]);

  const portalBuildLabel = 'Sheshaan Portal v3.4 Enterprise';

  return (
    <div className="portal-os relative min-h-screen pb-28 lg:pb-0">
      {/* Subtle Top Sync Indicator */}
      {isInitialSyncing && (
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-sky-500 opacity-80 z-50 animate-pulse pointer-events-none" />
      )}
      <div className="portal-shell">
        <PortalSidebar
          currentTab={currentTab}
          isMinimized={isSidebarMinimized}
          onToggleMinimized={toggleSidebar}
          onNavigate={(_key, href) => router.push(href)}
          badgeCounts={{ ...badgeCounts, crm: badgeCounts.crm ?? quickCounts.leads, quotes: badgeCounts.quotes ?? quickCounts.quotes }}
          authEmail={authEmail}
          currentRole={currentRole}
          onNewQuote={() => router.push('/quotes?new=true')}
          fxRate={fxRate}
          fxRateLoading={fxRateLoading}
          fxRateFetchedAt={fxRateFetchedAt}
          fxRateSource={fxRateSource}
          onRefreshFxRate={fetchMarketFxRate}
          onSaveManualFxRate={(rate) => { setFxRate(rate); setFxRateSource('Manual'); setFxRateFetchedAt(new Date().toISOString()); localStorage.setItem('portal_fx_rate', rate.toString()); }}
        />

        <div className={`flex min-h-screen flex-col transition-[padding] duration-200 ${isSidebarMinimized ? 'lg:pl-[76px]' : 'lg:pl-[280px]'}`}>

          <header className="portal-desktop-toolbar relative z-40 hidden h-[72px] items-center justify-between gap-5 border-b border-emerald-100/80 bg-white/65 px-7 backdrop-blur-xl lg:flex">
            <div className="flex min-w-0 items-center gap-5">
              <button type="button" onClick={() => router.push('/overview')} className="flex items-center gap-2.5 text-left" aria-label="Go to overview">
                <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-white shadow-sm"><Image src="/logo.png" alt="Sheshaan Global" width={32} height={32} className="h-8 w-8 object-contain" /></div>
                <div className="hidden min-w-0 2xl:block"><p className="truncate text-sm font-black text-slate-900">Sheshaan Global</p><p className="truncate text-[10px] font-bold text-slate-500">Import · Export · Trade Solutions</p></div>
              </button>
            <button type="button" onClick={() => setCommandOpen(true)} className="flex h-11 w-full min-w-[360px] max-w-[540px] items-center gap-3 rounded-full border border-emerald-100 bg-white/80 px-4 text-left text-xs font-semibold text-slate-500 shadow-sm transition hover:border-emerald-200 hover:bg-white">
              <Search className="h-4 w-4 text-indigo-500" />
              <span className="flex-1">Search buyers, quotes, products, suppliers…</span>
              <kbd className="rounded-md border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">Ctrl K</kbd>
            </button>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={fetchMarketFxRate} className="flex items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-3 py-2 text-left shadow-sm transition hover:bg-white" title="Refresh USD/INR exchange rate">
                <RefreshCw className={`h-4 w-4 text-emerald-700 ${fxRateLoading ? 'animate-spin' : ''}`} />
                <span><span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">USD/INR</span><span className="text-sm font-black text-slate-900">₹{fxRate.toFixed(2)}</span></span>
              </button>
              <div className="relative">
                <button type="button" onClick={() => { openNotifications(); void markNotificationsRead(); }} className="relative grid h-10 w-10 place-items-center rounded-full border border-emerald-100 bg-white/80 text-slate-600 shadow-sm transition hover:bg-white" aria-label="Open notifications" aria-expanded={showNotifications}><Bell className="h-4 w-4" />{unreadNotificationCount > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[8px] font-black text-white">{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</span>}</button>
                {showNotifications && (
                  <div className="absolute right-0 top-[calc(100%+10px)] z-[60] w-80 rounded-2xl border border-indigo-100 bg-white/95 p-3 shadow-2xl backdrop-blur-xl animate-panel-in">
                    <div className="flex items-center justify-between border-b border-indigo-50 pb-2"><span className="text-xs font-black text-slate-900">Notifications</span><button type="button" onClick={() => setShowNotifications(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close notifications"><X className="h-3.5 w-3.5" /></button></div>
                    <div className="mt-2 max-h-80 space-y-2 overflow-y-auto text-xs">{notificationsUnavailable ? <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center text-[11px] font-semibold leading-4 text-amber-800">Notifications are being set up. Apply the Supabase notification migration, then refresh this page.</div> : notifications.length ? notifications.map((notification) => <button type="button" key={notification.id} onClick={() => { setShowNotifications(false); router.push(notification.href || '/overview'); }} className="flex w-full gap-2 rounded-xl bg-emerald-50/70 p-2.5 text-left transition hover:bg-emerald-100"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.kind === 'task' ? 'bg-amber-500' : notification.kind === 'message' ? 'bg-sky-500' : 'bg-emerald-500'}`}/><span><span className="block font-black text-slate-800">{notification.title}</span><span className="mt-0.5 block text-[11px] font-medium leading-4 text-slate-500">{notification.message || 'Open to view details.'}</span></span></button>) : <div className="rounded-xl bg-slate-50 p-4 text-center text-[11px] font-semibold text-slate-500">You are all caught up.</div>}</div>
                  </div>
                )}
              </div>
              <button type="button" onClick={toggleTheme} className="grid h-10 w-10 place-items-center rounded-xl border border-indigo-100 bg-white/80 text-slate-600 shadow-sm transition hover:bg-white" aria-label="Toggle color theme">{isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
              <button type="button" onClick={() => router.push('/profile')} className="flex items-center gap-2 border-l border-indigo-100 pl-3 text-left"><span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-black text-white">{(authEmail || 'A')[0].toUpperCase()}</span><span className="max-w-[130px]"><span className="block truncate text-xs font-black text-slate-800">{authEmail?.split('@')[0] || 'Administrator'}</span><span className="block text-[10px] font-bold text-slate-500">{currentRole}</span></span></button>
            </div>
          </header>

          {/* Main Content Workspace Column: Full Page, Borderless, Natural Spacing */}
          <section className="relative z-10 flex-1 w-full min-w-0">
            {/* Mobile Header Bar: Flush edge-to-edge, full width, 0 border gaps */}
            <div className="portal-mobile-header lg:hidden sticky top-0 z-30 w-full bg-[#091124] text-white border-b border-slate-800 shadow-md mb-0 overflow-hidden pt-[env(safe-area-inset-top,0px)]">
              <div className="portal-mobile-header-inner px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(false);
                    setShowMobileMenu(true);
                  }}
                  className="portal-mobile-icon-button h-9 w-9 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center shadow-sm active:scale-95 transition hover:bg-slate-700 shrink-0 cursor-pointer"
                  aria-label="Open menu"
                >
                  <Menu className="h-4.5 w-4.5" />
                </button>
                <div className="portal-mobile-logo h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-white border border-slate-700/80 p-0.5 shadow-xs flex items-center justify-center">
                  <Image src="/logo.png" alt="Sheshaan Global logo" width={34} height={34} className="h-full w-full object-contain" />
                </div>
                <div className="portal-mobile-brand min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="portal-mobile-brand-name text-[10px] uppercase font-bold tracking-wider text-sky-300">Sheshaan Global</p>
                    <span className="portal-mobile-brand-badge text-[8px] font-black uppercase px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">Enterprise</span>
                  </div>
                  <p className="text-xs sm:text-sm font-extrabold text-white truncate">{propPageTitle || activeNavItem?.label || 'Workspace'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
                    <span>₹{fxRate.toFixed(2)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { openNotifications(); void markNotificationsRead(); }}
                    className="portal-mobile-icon-button relative h-9 w-9 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center shadow-xs active:scale-95 transition hover:bg-slate-700 shrink-0 cursor-pointer"
                    aria-label="Open notifications"
                  >
                    <Bell className="h-4.5 w-4.5" />
                    {unreadNotificationCount > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[8px] font-black text-white">{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</span>}
                  </button>
                </div>
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
                <div className="max-h-80 space-y-2 overflow-y-auto text-xs">
                  {notificationsUnavailable ? <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center text-[11px] font-semibold leading-4 text-amber-800">Notifications are being set up. Apply the Supabase notification migration, then refresh this page.</div> : notifications.map((notification) => <button type="button" key={notification.id} onClick={() => { setShowNotifications(false); router.push(notification.href || '/overview'); }} className="flex w-full gap-2.5 rounded-xl bg-emerald-50 p-2.5 text-left transition hover:bg-emerald-100"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.kind === 'task' ? 'bg-amber-500' : notification.kind === 'message' ? 'bg-sky-500' : 'bg-emerald-500'}`}/><span><span className="block font-bold text-slate-800">{notification.title}</span><span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{notification.message || 'Open to view details.'}</span></span></button>)}
                  {!notificationsUnavailable && !notifications.length && <div className="rounded-xl bg-slate-50 p-4 text-center text-[11px] font-semibold text-slate-500">You are all caught up.</div>}
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
                <div className="portal-mobile-drawer relative w-80 max-w-[85vw] h-full bg-[#081827] text-white flex flex-col overflow-hidden shadow-2xl animate-slide-in-left">
                  {/* Drawer Header */}
                  <div className="portal-mobile-drawer-head p-4 flex items-center justify-between border-b border-white/10 shrink-0 pt-[max(1rem,env(safe-area-inset-top,0px))]">
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
                      className="portal-mobile-drawer-cta w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-sky-50 active:bg-sky-100 text-slate-950 text-xs font-black rounded-xl shadow-md transition"
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
                    <button
                      type="button"
                      onClick={() => void handleMobileLogout()}
                      className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 text-xs font-black text-rose-200 transition hover:bg-rose-500/20 active:scale-[0.98]"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout securely
                    </button>
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
                  className={`portal-dock-item min-h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition active:scale-95 ${
                    currentTab === 'overview' ? 'portal-dock-item-active text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="leading-none">Home</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/crm')}
                  className={`portal-dock-item min-h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition active:scale-95 relative ${
                    currentTab === 'crm' || currentTab === 'potentialBuyers' ? 'portal-dock-item-active text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
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
                  className={`portal-dock-item min-h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition active:scale-95 relative ${
                    currentTab === 'quotes' ? 'portal-dock-item-active text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
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
                  className={`portal-dock-item min-h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition active:scale-95 ${
                    currentTab === 'accounting' ? 'portal-dock-item-active text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
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
                  className="portal-dock-item min-h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 transition active:scale-95"
                >
                  <Menu className="h-4 w-4" />
                  <span className="leading-none">Menu</span>
                </button>
              </div>
            </nav>

            {/* Workspace Main Area: Structured Max-Width Container */}
            <main className="portal-main-content mx-auto w-full min-w-0 max-w-[1760px] px-4 py-4 sm:px-6 lg:px-8 animate-panel-in">
              {children}
            </main>
          </section>
        </div>
      </div>

      {/* Global Command Center (Ctrl+K Modal) */}
      {commandOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={() => setCommandOpen(false)} />
          <div className="relative z-50 flex max-h-[76vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl animate-panel-in">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <Search className="h-5 w-5 text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                placeholder="Search any buyer, supplier, product, quote, contact, phone, email, route, or record detail..."
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

            <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1 text-xs">
              {commandSearch.trim() && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Record results</p>
                    {isSearchLoading && <span className="text-[10px] font-semibold text-slate-400">Loading records…</span>}
                    {!isSearchLoading && <span className="text-[10px] font-semibold text-slate-400">{matchingSearchRecords.length} found</span>}
                  </div>
                  {matchingSearchRecords.length > 0 ? (
                    <div className="space-y-1.5">
                      {matchingSearchRecords.map((record) => (
                        <button
                          key={record.id}
                          type="button"
                          onClick={() => {
                            router.push(record.href);
                            setCommandOpen(false);
                            setCommandSearch('');
                          }}
                          className="flex w-full items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">{record.icon}</span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="font-extrabold text-slate-900">{record.title}</span>
                              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-500">{record.type}</span>
                            </span>
                            <span className="mt-1 block break-words text-[11px] leading-4 text-slate-600">{record.details || 'Open the workspace to view this record.'}</span>
                          </span>
                          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  ) : !isSearchLoading ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-[11px] font-semibold text-slate-500">
                      No records match “{commandSearch.trim()}”. Try a supplier contact, email, phone, product, route, or reference number.
                    </div>
                  ) : null}
                </div>
              )}
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

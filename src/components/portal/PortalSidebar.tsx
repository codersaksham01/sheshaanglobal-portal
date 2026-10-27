import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  KanbanSquare,
  Target,
  FileCheck2,
  Mail,
  Send,
  FileText,
  Package,
  Building2,
  Lock,
  Plus,
  ChevronDown,
  RefreshCw,
  Edit2,
  Check,
  Receipt
} from 'lucide-react';
import { canAccessTab, PortalRole } from '../../lib/permissions';
import { TAB_ROUTES } from '../../lib/portalDataStore';

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

export interface NavItemDef {
  key: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  count?: number;
}

export interface PortalSidebarProps {
  currentTab: string;
  isMinimized: boolean;
  onToggleMinimized: () => void;
  onNavigate: (tabKey: string, href: string) => void;
  badgeCounts?: Record<string, number>;
  authEmail?: string | null;
  currentRole?: PortalRole;
  onNewQuote?: () => void;
  fxRate?: number;
  fxRateLoading?: boolean;
  fxRateFetchedAt?: string | null;
  fxRateSource?: string;
  onRefreshFxRate?: () => void;
  onSaveManualFxRate?: (rate: number) => void;
}

export const PortalSidebar: React.FC<PortalSidebarProps> = ({
  currentTab,
  isMinimized,
  onToggleMinimized,
  onNavigate,
  badgeCounts = {},
  authEmail,
  currentRole = 'Admin',
  onNewQuote,
  fxRate: propFxRate,
  fxRateLoading: propFxRateLoading,
  fxRateFetchedAt: propFxRateFetchedAt,
  fxRateSource: propFxRateSource,
  onRefreshFxRate,
  onSaveManualFxRate
}) => {
  const router = useRouter();
  const [crmMenuOpen, setCrmMenuOpen] = useState(true);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);

  // Fallback internal FX Rate state if not provided as props
  const [localFxRate, setLocalFxRate] = useState<number>(86.85);
  const [localFxLoading, setLocalFxLoading] = useState(false);
  const [localFxEditing, setLocalFxEditing] = useState(false);
  const [localFxDraft, setLocalFxDraft] = useState('86.85');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portal_fx_rate');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed > 0) {
          setLocalFxRate(parsed);
          setLocalFxDraft(parsed.toFixed(2));
        }
      }
    }
  }, []);

  const fxRate = propFxRate !== undefined ? propFxRate : localFxRate;
  const fxRateLoading = propFxRateLoading !== undefined ? propFxRateLoading : localFxLoading;

  const fetchMarketFx = useCallback(async () => {
    if (onRefreshFxRate) {
      onRefreshFxRate();
      return;
    }
    setLocalFxLoading(true);
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (res.ok) {
        const json = await res.json();
        const inr = json?.rates?.INR;
        if (typeof inr === 'number' && inr > 0) {
          setLocalFxRate(inr);
          setLocalFxDraft(inr.toFixed(2));
          if (typeof window !== 'undefined') {
            localStorage.setItem('portal_fx_rate', inr.toString());
          }
        }
      }
    } catch {} finally {
      setLocalFxLoading(false);
    }
  }, [onRefreshFxRate]);

  const handleSaveRate = () => {
    const parsed = parseFloat(localFxDraft);
    if (!isNaN(parsed) && parsed > 0) {
      if (onSaveManualFxRate) {
        onSaveManualFxRate(parsed);
      } else {
        setLocalFxRate(parsed);
        if (typeof window !== 'undefined') {
          localStorage.setItem('portal_fx_rate', parsed.toString());
        }
      }
      setLocalFxEditing(false);
    }
  };

  const navItems: NavItemDef[] = useMemo(() => [
    { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" />, href: '/overview' },
    { key: 'crm', label: 'Smart CRM Pipeline', icon: <KanbanSquare className="h-4 w-4" />, href: '/crm', count: badgeCounts.crm },
    { key: 'potentialBuyers', label: 'Potential Buyers', icon: <Target className="h-4 w-4" />, href: '/potential-buyers', count: badgeCounts.potentialBuyers },
    { key: 'quotes', label: 'Quote Automation', icon: <FileCheck2 className="h-4 w-4" />, href: '/quotes', count: badgeCounts.quotes },
    { key: 'accounting', label: 'Accounting & Expenses', icon: <Receipt className="h-4 w-4" />, href: '/accounting', count: badgeCounts.accounting },
    { key: 'templates', label: 'Mail & Message Templates', icon: <Mail className="h-4 w-4" />, href: '/templates', count: badgeCounts.templates },
    { key: 'generateResponses', label: 'Generate Responses', icon: <Send className="h-4 w-4" />, href: '/generate-responses' },
    { key: 'letterhead', label: 'Letterhead Generator', icon: <FileText className="h-4 w-4" />, href: '/letterhead' },
    { key: 'products', label: 'Products', icon: <Package className="h-4 w-4" />, href: '/products', count: badgeCounts.products },
    { key: 'vendors', label: 'Suppliers Management', icon: <Building2 className="h-4 w-4" />, href: '/vendors', count: badgeCounts.vendors },
    { key: 'users', label: 'Users & Roles', icon: <Lock className="h-4 w-4" />, href: '/users', count: badgeCounts.users }
  ], [badgeCounts]);

  const navGroups = useMemo(() => [
    { label: 'Command', items: navItems.filter((item) => ['overview', 'crm', 'quotes', 'accounting', 'templates', 'generateResponses', 'letterhead'].includes(item.key)) },
    { label: 'Operations', items: navItems.filter((item) => ['products', 'vendors'].includes(item.key)) },
    { label: 'Admin', items: navItems.filter((item) => ['users'].includes(item.key)) }
  ], [navItems]);

  const prefetchRoute = useCallback((href: string) => {
    try {
      router.prefetch(href);
    } catch {}
  }, [router]);

  return (
    <aside
      data-sidebar="true"
      data-minimized={isMinimized ? 'true' : undefined}
      className={`portal-sidebar hidden lg:flex flex-col ${
        isMinimized ? 'w-[76px]' : 'w-[304px]'
      } h-screen fixed top-0 left-0 overflow-hidden z-40 transition-[width] duration-200 ease-out will-change-[width] select-none`}
    >
      {/* Brand Header */}
      <div className="portal-brand-block flex items-center px-3.5 shrink-0 border-b border-white/5 h-[72px] relative overflow-hidden">
        {/* Logo Card */}
        <button
          type="button"
          onClick={() => {
            if (isMinimized) {
              onToggleMinimized();
            } else {
              onNavigate('overview', '/overview');
            }
          }}
          onMouseEnter={() => prefetchRoute('/overview')}
          className="h-10 w-10 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-[0_16px_36px_rgba(14,165,233,0.22)] shrink-0 ring-1 ring-white/15 relative group cursor-pointer"
          title={isMinimized ? 'Click to expand navbar (Ctrl+B)' : 'Sheshaan Global Overview'}
        >
          <Image
            src="/logo.png"
            alt="Sheshaan Global"
            width={36}
            height={36}
            className={`h-full w-full object-contain transition-opacity duration-200 ${isMinimized ? 'group-hover:opacity-20' : ''}`}
            priority
          />
          {isMinimized && (
            <PanelLeftOpen className="absolute h-5 w-5 text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
          )}
        </button>

        {/* Brand Text (collapses smoothly with 0 layout shift) */}
        <div
          onClick={() => onNavigate('overview', '/overview')}
          onMouseEnter={() => prefetchRoute('/overview')}
          className={`min-w-0 ml-3 cursor-pointer transition-all duration-200 overflow-hidden whitespace-nowrap ${
            isMinimized ? 'opacity-0 max-w-0 ml-0 pointer-events-none' : 'opacity-100 max-w-[155px]'
          }`}
        >
          <h1 className="text-sm font-black text-white tracking-tight leading-none truncate">Sheshaan Global</h1>
          <p className="text-[10px] text-sky-200/75 font-bold mt-1 uppercase tracking-wider truncate">Export Operations</p>
        </div>

        {/* Minimize Button (visible only in expanded mode) */}
        <button
          type="button"
          onClick={onToggleMinimized}
          className={`h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all duration-200 shrink-0 ml-auto ${
            isMinimized ? 'opacity-0 max-w-0 pointer-events-none scale-75' : 'opacity-100 max-w-[32px] scale-100'
          }`}
          title="Minimize navbar (Ctrl+B)"
          aria-label="Minimize navbar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* New Quote CTA */}
      <div className="px-3.5 pt-3 pb-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            if (onNewQuote) {
              onNewQuote();
            } else {
              onNavigate('quotes', '/quotes?new=true');
            }
          }}
          onMouseEnter={() => prefetchRoute('/quotes')}
          className={`flex items-center justify-center bg-white text-slate-950 hover:bg-sky-50 active:bg-sky-100 font-black rounded-lg shadow-[0_14px_34px_rgba(255,255,255,0.12)] transition-all duration-200 overflow-hidden ${
            isMinimized ? 'w-10 h-10 p-0 mx-auto' : 'w-full px-3 py-2.5 text-[11px] gap-2'
          }`}
          title={isMinimized ? 'New Quote' : undefined}
          aria-label="New Quote"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className={`whitespace-nowrap transition-all duration-200 overflow-hidden ${
            isMinimized ? 'opacity-0 max-w-0 pointer-events-none hidden' : 'opacity-100 max-w-[120px]'
          }`}>
            New Quote
          </span>
        </button>
      </div>

      {/* Navigation Groups */}
      <nav className={`flex-1 overflow-y-auto ${isMinimized ? 'px-2 pb-4 pt-2 space-y-3' : 'px-3.5 pb-4 pt-2 space-y-4'} scrollbar-thin scrollbar-thumb-white/10`}>
        {navGroups.map((group, groupIdx) => (
          <div key={group.label}>
            {!isMinimized ? (
              <p className="portal-nav-heading px-2 pb-1.5 pt-1 text-[9.5px] uppercase font-extrabold tracking-wider text-slate-400/80">
                {group.label}
              </p>
            ) : groupIdx > 0 ? (
              <div className="my-2 border-t border-white/10 mx-2" title={group.label} />
            ) : null}

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

                // Minimized Mode Item
                if (isMinimized) {
                  return (
                    <div key={item.key} className="flex justify-center my-1 relative group/mini">
                      <button
                        type="button"
                        onClick={() => onNavigate(item.key, item.href)}
                        onMouseEnter={() => prefetchRoute(item.href)}
                        title={item.label}
                        aria-label={item.label}
                        className={`h-10 w-10 flex items-center justify-center rounded-lg transition-all duration-150 relative ${
                          isActive
                            ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/40 shadow-sm'
                            : 'text-slate-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {item.icon}
                        {typeof item.count === 'number' && item.count > 0 && (
                          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-sky-500 text-[9px] font-black text-white flex items-center justify-center shadow">
                            {item.count > 99 ? '99+' : item.count}
                          </span>
                        )}
                      </button>

                      {/* Tooltip / Flyout Menu on Hover */}
                      {isCrmParent ? (
                        <div className="absolute left-full ml-3 top-0 p-1.5 rounded-lg bg-slate-900 border border-white/10 shadow-2xl opacity-0 group-hover/mini:opacity-100 pointer-events-none group-hover/mini:pointer-events-auto transition-opacity duration-150 z-50 min-w-[170px] space-y-1">
                          <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-white/10 flex items-center justify-between">
                            <span>Smart CRM</span>
                            {typeof item.count === 'number' && item.count > 0 && (
                              <span className="text-[9px] text-sky-400">{item.count}</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => onNavigate('crm', '/crm')}
                            onMouseEnter={() => prefetchRoute('/crm')}
                            className={`w-full text-left px-2.5 py-1.5 rounded text-[11px] font-bold transition ${
                              currentTab === 'crm' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            Normal Smart CRM
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigate('potentialBuyers', '/potential-buyers')}
                            onMouseEnter={() => prefetchRoute('/potential-buyers')}
                            className={`w-full text-left px-2.5 py-1.5 rounded text-[11px] font-bold transition ${
                              currentTab === 'potentialBuyers' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            Potential Buyers
                            {badgeCounts.potentialBuyers !== undefined && badgeCounts.potentialBuyers > 0 && (
                              <span className="ml-1.5 px-1 rounded-full bg-emerald-500/30 text-emerald-300 text-[9px]">
                                {badgeCounts.potentialBuyers}
                              </span>
                            )}
                          </button>
                        </div>
                      ) : isTemplateParent ? (
                        <div className="absolute left-full ml-3 top-0 p-1.5 rounded-lg bg-slate-900 border border-white/10 shadow-2xl opacity-0 group-hover/mini:opacity-100 pointer-events-none group-hover/mini:pointer-events-auto transition-opacity duration-150 z-50 min-w-[170px] space-y-1">
                          <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-white/10 flex items-center justify-between">
                            <span>Mail & Messages</span>
                            {typeof item.count === 'number' && item.count > 0 && (
                              <span className="text-[9px] text-sky-400">{item.count}</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => onNavigate('templates', '/templates')}
                            onMouseEnter={() => prefetchRoute('/templates')}
                            className={`w-full text-left px-2.5 py-1.5 rounded text-[11px] font-bold transition ${
                              currentTab === 'templates' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            Template Library
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigate('generateResponses', '/generate-responses')}
                            onMouseEnter={() => prefetchRoute('/generate-responses')}
                            className={`w-full text-left px-2.5 py-1.5 rounded text-[11px] font-bold transition ${
                              currentTab === 'generateResponses' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            Generate Responses
                          </button>
                        </div>
                      ) : (
                        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-md bg-slate-900 text-white text-[11px] font-bold shadow-xl border border-white/10 opacity-0 group-hover/mini:opacity-100 pointer-events-none transition-opacity duration-150 z-50 whitespace-nowrap">
                          {item.label}
                          {typeof item.count === 'number' && item.count > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-sky-500/30 text-sky-300 text-[9px]">
                              {item.count}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                // Expanded Mode: Smart CRM Dropdown
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
                          <button
                            type="button"
                            onClick={() => onNavigate('crm', '/crm')}
                            onMouseEnter={() => prefetchRoute('/crm')}
                            className={`w-full rounded-lg px-2.5 py-1.5 text-left text-[10.5px] font-bold transition ${
                              currentTab === 'crm' ? 'bg-sky-500/15 text-sky-200' : 'text-slate-500 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            Normal Smart CRM
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigate('potentialBuyers', '/potential-buyers')}
                            onMouseEnter={() => prefetchRoute('/potential-buyers')}
                            className={`w-full rounded-lg px-2.5 py-1.5 text-left text-[10.5px] font-bold transition ${
                              currentTab === 'potentialBuyers' ? 'bg-emerald-500/15 text-emerald-200' : 'text-slate-500 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            Potential Buyers
                            {badgeCounts.potentialBuyers !== undefined && badgeCounts.potentialBuyers > 0 && (
                              <span className="ml-2 rounded-full bg-zinc-700 px-1.5 py-0.5 text-[9px] text-zinc-300">
                                {badgeCounts.potentialBuyers}
                              </span>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }

                // Expanded Mode: Templates Dropdown
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
                        {typeof item.count === 'number' && item.count > 0 && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                            templatesActive ? 'bg-sky-500/20 text-sky-300' : 'bg-zinc-700 text-zinc-400'
                          }`}>
                            {item.count}
                          </span>
                        )}
                        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${templateMenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {templateMenuOpen && (
                        <div className="ml-6 space-y-1 border-l border-white/10 pl-2">
                          <button
                            type="button"
                            onClick={() => onNavigate('templates', '/templates')}
                            onMouseEnter={() => prefetchRoute('/templates')}
                            className={`w-full rounded-lg px-2.5 py-1.5 text-left text-[10.5px] font-bold transition ${
                              currentTab === 'templates' ? 'bg-sky-500/15 text-sky-200' : 'text-slate-500 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            Template Library
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigate('generateResponses', '/generate-responses')}
                            onMouseEnter={() => prefetchRoute('/generate-responses')}
                            className={`w-full rounded-lg px-2.5 py-1.5 text-left text-[10.5px] font-bold transition ${
                              currentTab === 'generateResponses' ? 'bg-emerald-500/15 text-emerald-200' : 'text-slate-500 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            Generate Responses
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }

                // Expanded Mode: Regular Nav Item
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onNavigate(item.key, item.href)}
                    onMouseEnter={() => prefetchRoute(item.href)}
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
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sidebar Footer: Role Badge + FX Rate */}
      <div className="border-t border-zinc-800/80 p-3 shrink-0">
        <div className={`flex items-center gap-2.5 transition-all duration-200 ${isMinimized ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="h-8 w-8 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0 cursor-default"
              title={`${authEmail || 'Admin'} (${currentRole})`}
            >
              <span className="text-[10px] font-black text-sky-400">{(authEmail || 'A')[0].toUpperCase()}</span>
            </div>
            <div className={`min-w-0 transition-all duration-200 ${isMinimized ? 'opacity-0 max-w-0 hidden' : 'opacity-100 max-w-[140px]'}`}>
              <p className="text-[10.5px] font-bold text-zinc-200 truncate">{authEmail || 'Admin'}</p>
              <p className="text-[9px] text-zinc-500 font-semibold">{currentRole}</p>
            </div>
          </div>
          {!isMinimized && (
            <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-sky-500/10 text-sky-300 border border-sky-500/20 shrink-0">
              {currentRole}
            </span>
          )}
        </div>

        {/* FX Rate Box */}
        {!isMinimized ? (
          <div className="mt-2.5 rounded-lg border border-white/10 bg-white/[0.03] p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="block text-[8.5px] text-zinc-500 font-semibold uppercase tracking-wider">USD/INR</span>
                <span className={`block text-[11px] font-black ${fxRateLoading ? 'text-zinc-500 animate-pulse' : 'text-emerald-400'}`}>
                  ₹{fxRate.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setLocalFxEditing((v) => !v)}
                  className="h-6 w-6 rounded border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white flex items-center justify-center transition"
                  title="Edit rate"
                  aria-label="Edit USD INR rate"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={fetchMarketFx}
                  disabled={fxRateLoading}
                  className="h-6 w-6 rounded border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-50 flex items-center justify-center transition"
                  title="Refresh market rate"
                  aria-label="Refresh market rate"
                >
                  <RefreshCw className={`h-3 w-3 ${fxRateLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            {localFxEditing && (
              <div className="mt-2 flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  step="0.0001"
                  value={localFxDraft}
                  onChange={(e) => setLocalFxDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRate();
                    if (e.key === 'Escape') setLocalFxEditing(false);
                  }}
                  className="h-7 w-full rounded border border-white/10 bg-zinc-950 px-2 text-[10.5px] font-bold text-white outline-none focus:border-sky-400"
                  aria-label="Manual USD INR rate"
                />
                <button
                  type="button"
                  onClick={handleSaveRate}
                  className="h-7 w-7 rounded bg-emerald-500 text-white hover:bg-emerald-400 flex items-center justify-center shrink-0"
                  title="Save rate"
                  aria-label="Save rate"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between gap-1">
            <div
              className="h-7 flex-1 rounded-md border border-white/10 bg-white/[0.04] flex items-center justify-center text-center cursor-default"
              title={`USD/INR Rate: ₹${fxRate.toFixed(2)}`}
            >
              <span className="text-[10px] font-black text-emerald-400">₹{Math.round(fxRate)}</span>
            </div>
            <button
              type="button"
              onClick={onToggleMinimized}
              className="h-7 w-7 rounded-md border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition shrink-0"
              title="Expand navbar (Ctrl+B)"
              aria-label="Expand navbar"
            >
              <PanelLeftOpen className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

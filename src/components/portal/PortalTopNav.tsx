'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  KanbanSquare,
  Target,
  FileCheck2,
  Receipt,
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
  Search,
  Sparkles,
  Bell,
  LogOut,
  X
} from 'lucide-react';
import { canAccessTab, PortalRole } from '../../lib/permissions';

export interface NavSubItem {
  key: string;
  label: string;
  href: string;
  count?: number;
  description?: string;
}

export interface NavItemDef {
  key: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  count?: number;
  subItems?: NavSubItem[];
}

export interface PortalTopNavProps {
  currentTab: string;
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
  onOpenCommand?: () => void;
}

export const PortalTopNav: React.FC<PortalTopNavProps> = ({
  currentTab,
  onNavigate,
  badgeCounts = {},
  authEmail,
  currentRole = 'Admin',
  onNewQuote,
  fxRate: propFxRate,
  fxRateLoading: propFxRateLoading,
  fxRateSource,
  onRefreshFxRate,
  onSaveManualFxRate,
  onOpenCommand
}) => {
  const router = useRouter();

  // FX Rate local state fallback
  const [localFxRate, setLocalFxRate] = useState<number>(86.85);
  const [localFxLoading, setLocalFxLoading] = useState(false);
  const [localFxEditing, setLocalFxEditing] = useState(false);
  const [localFxDraft, setLocalFxDraft] = useState('86.85');
  const fxMenuRef = useRef<HTMLDivElement>(null);

  // Active navigation tab dropdown menu state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownNavRef = useRef<HTMLDivElement>(null);

  // User Profile popover state
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Notifications popover state
  const [notifOpen, setNotifOpen] = useState(false);
  const notifMenuRef = useRef<HTMLDivElement>(null);

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
    } catch {
      // Ignore
    } finally {
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

  // Hover handlers with debounce for smooth dropdown operation
  const handleTabMouseEnter = (key: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setOpenDropdown(key);
  };

  const handleTabMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 180);
  };

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownNavRef.current && !dropdownNavRef.current.contains(target)) {
        setOpenDropdown(null);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
      if (fxMenuRef.current && !fxMenuRef.current.contains(target)) {
        setLocalFxEditing(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(target)) {
        setNotifOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
        setUserMenuOpen(false);
        setLocalFxEditing(false);
        setNotifOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const prefetchRoute = useCallback((href: string) => {
    try {
      router.prefetch(href);
    } catch {}
  }, [router]);

  // Main navigation items definition
  const navItems: NavItemDef[] = useMemo(() => [
    {
      key: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="h-4 w-4" />,
      href: '/overview'
    },
    {
      key: 'crm',
      label: 'Smart CRM',
      icon: <KanbanSquare className="h-4 w-4" />,
      href: '/crm',
      count: badgeCounts.crm,
      subItems: [
        {
          key: 'crm',
          label: 'CRM Pipeline',
          href: '/crm',
          count: badgeCounts.crm,
          description: 'Kanban & tabular buyer outreach'
        },
        {
          key: 'potentialBuyers',
          label: 'Potential Buyers',
          href: '/potential-buyers',
          count: badgeCounts.potentialBuyers,
          description: 'High-score prospect database'
        }
      ]
    },
    {
      key: 'quotes',
      label: 'Quotes',
      icon: <FileCheck2 className="h-4 w-4" />,
      href: '/quotes',
      count: badgeCounts.quotes
    },
    {
      key: 'accounting',
      label: 'Accounting',
      icon: <Receipt className="h-4 w-4" />,
      href: '/accounting',
      count: badgeCounts.accounting
    },
    {
      key: 'products',
      label: 'Products',
      icon: <Package className="h-4 w-4" />,
      href: '/products',
      count: badgeCounts.products
    },
    {
      key: 'vendors',
      label: 'Suppliers',
      icon: <Building2 className="h-4 w-4" />,
      href: '/vendors',
      count: badgeCounts.vendors
    },
    {
      key: 'templates',
      label: 'Mail & Messages',
      icon: <Mail className="h-4 w-4" />,
      href: '/templates',
      count: badgeCounts.templates,
      subItems: [
        {
          key: 'templates',
          label: 'Template Library',
          href: '/templates',
          description: 'Pre-approved email & WhatsApp copies'
        },
        {
          key: 'generateResponses',
          label: 'Generate Responses',
          href: '/generate-responses',
          description: 'Assisted commercial response composer'
        }
      ]
    },
    {
      key: 'letterhead',
      label: 'Letterhead',
      icon: <FileText className="h-4 w-4" />,
      href: '/letterhead'
    },
    {
      key: 'users',
      label: 'Users & Roles',
      icon: <Lock className="h-4 w-4" />,
      href: '/users',
      count: badgeCounts.users
    }
  ], [badgeCounts]);

  const visibleNavItems = useMemo(() => {
    return navItems.filter((item) => canAccessTab(currentRole, item.key));
  }, [navItems, currentRole]);

  return (
    <header className="hidden lg:block sticky top-0 z-40 w-full shadow-md select-none">
      {/* Tier 1: Midnight Executive Navy Utility Bar */}
      <div className="bg-[#091124] border-b border-slate-800 relative z-30">
        <div className="max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
          {/* Brand Logo & Title */}
          <div
            onClick={() => onNavigate('overview', '/overview')}
            onMouseEnter={() => prefetchRoute('/overview')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="h-9 w-9 rounded-lg bg-white border border-slate-700/80 p-1 flex items-center justify-center overflow-hidden shadow-sm group-hover:scale-105 transition">
              <Image
                src="/logo.png"
                alt="Sheshaan Global"
                width={34}
                height={34}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black text-white tracking-tight leading-none group-hover:text-sky-300 transition">
                  Sheshaan Global
                </h1>
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  Enterprise
                </span>
              </div>
              <p className="text-[10px] text-sky-200/70 font-semibold mt-0.5 tracking-wide">
                Export Operations & Trade Command
              </p>
            </div>
          </div>

          {/* Global Quick Search Trigger (Ctrl+K) */}
          <div className="flex-1 max-w-md mx-4">
            <button
              type="button"
              onClick={onOpenCommand}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-700/90 bg-slate-850 hover:bg-slate-800 hover:border-slate-600 text-slate-300 hover:text-white flex items-center justify-between text-xs font-semibold transition group cursor-pointer shadow-inner"
              title="Search workspaces, actions, or records (Ctrl+K)"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-sky-400 shrink-0" />
                <span className="truncate text-slate-300">Search workspaces, actions, records...</span>
              </span>
              <kbd className="text-[10px] font-mono font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
                Ctrl+K
              </kbd>
            </button>
          </div>

          {/* Right Action Utilities: FX Rate + Notifications + New Quote + User Menu */}
          <div className="flex items-center gap-3 shrink-0">
            {/* FX Rate Widget with Anchored Popover */}
            <div className="relative" ref={fxMenuRef}>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-[9.5px] text-emerald-400/90 font-bold uppercase tracking-wider">USD/INR</span>
                <span className="text-xs font-black text-emerald-300 font-mono">₹{fxRate.toFixed(2)}</span>
                <button
                  type="button"
                  onClick={fetchMarketFx}
                  disabled={fxRateLoading}
                  className="p-1 hover:bg-emerald-900/60 rounded text-emerald-300 transition disabled:opacity-50 cursor-pointer"
                  title="Refresh live USD/INR exchange rate"
                  aria-label="Refresh FX Rate"
                >
                  <RefreshCw className={`h-3 w-3 ${fxRateLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setLocalFxEditing((v) => !v)}
                  className="p-1 hover:bg-emerald-900/60 rounded text-emerald-300 transition cursor-pointer"
                  title="Manually adjust FX rate"
                  aria-label="Edit FX Rate"
                >
                  <Edit2 className="h-2.5 w-2.5" />
                </button>
              </div>

              {/* Inline FX Edit Popover - Anchored */}
              {localFxEditing && (
                <div
                  className="absolute right-0 top-full pt-2 z-50 animate-panel-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-2.5 rounded-xl bg-[#0c1527] border border-slate-700 shadow-2xl flex items-center gap-1.5 text-white ring-1 ring-black/40 backdrop-blur-md">
                    <span className="text-[10px] font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={localFxDraft}
                      onChange={(e) => setLocalFxDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRate();
                        if (e.key === 'Escape') setLocalFxEditing(false);
                      }}
                      className="h-7 w-20 px-1.5 text-xs font-bold border border-slate-700 bg-slate-800 rounded focus:border-sky-400 text-white outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveRate}
                      className="h-7 w-7 rounded bg-emerald-600 text-white hover:bg-emerald-500 flex items-center justify-center text-xs cursor-pointer transition"
                      title="Save manual exchange rate"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* System Notifications Popover */}
            <div className="relative" ref={notifMenuRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                className="relative h-8 w-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shadow-xs"
                title="System Notifications"
                aria-label="System Notifications"
              >
                <Bell className="h-3.5 w-3.5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full pt-2 w-80 z-50 animate-panel-in" onClick={(e) => e.stopPropagation()}>
                  <div className="rounded-xl border border-slate-700/90 bg-[#0c1527] shadow-2xl p-3 text-white ring-1 ring-black/40 backdrop-blur-md space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Bell className="h-3.5 w-3.5 text-sky-400" />
                        <span className="text-xs font-extrabold text-white">System Notifications</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotifOpen(false)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/60 flex items-start gap-2.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 mt-1 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-200">Trade Terminal Operational</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Database synchronized and all 11 trade workspaces live.</p>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/60 flex items-start gap-2.5">
                        <span className="h-2 w-2 rounded-full bg-sky-400 mt-1 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-200">USD/INR Exchange Rate</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Live market rate ₹{fxRate.toFixed(2)} active across quote automations.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* New Quote Primary CTA */}
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
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 active:from-sky-700 active:to-sky-600 text-white rounded-lg font-black text-xs shadow-sm transition active:scale-95 cursor-pointer"
              title="Create new commercial quotation"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              <span>New Quote</span>
            </button>

            {/* Interactive User Profile Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 border-l border-slate-800 pl-3 py-0.5 hover:bg-slate-800/60 rounded-lg transition cursor-pointer text-left select-none"
                title="Account & Role Settings"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div
                  className="h-7 w-7 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-500 text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-xs"
                >
                  {(authEmail || 'A')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-200 leading-tight truncate max-w-[110px]">
                    {authEmail ? authEmail.split('@')[0] : 'Admin'}
                  </p>
                  <p className="text-[9px] font-black text-sky-400 uppercase tracking-wider leading-none">
                    {currentRole}
                  </p>
                </div>
                <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Account Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full pt-2 w-64 z-50 animate-panel-in" onClick={(e) => e.stopPropagation()}>
                  <div className="rounded-xl border border-slate-700/90 bg-[#0c1527] shadow-2xl p-3 text-white ring-1 ring-black/40 backdrop-blur-md space-y-3">
                    <div className="flex items-center gap-3 pb-2.5 border-b border-slate-800">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-500 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                        {(authEmail || 'A')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{authEmail || 'admin@sheshaanglobal.com'}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                            {currentRole}
                          </span>
                          <span className="text-[10px] text-slate-400">Enterprise</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          onNavigate('overview', '/overview');
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition text-left cursor-pointer"
                      >
                        <LayoutDashboard className="h-3.5 w-3.5 text-slate-400" />
                        <span>Executive Overview</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          onNavigate('users', '/users');
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition text-left cursor-pointer"
                      >
                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                        <span>Users & Access Control</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          if (onOpenCommand) onOpenCommand();
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition text-left cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Search className="h-3.5 w-3.5 text-slate-400" />
                          <span>Command Palette</span>
                        </span>
                        <kbd className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                          Ctrl+K
                        </kbd>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={async () => {
                          setUserMenuOpen(false);
                          if (typeof window !== 'undefined') {
                            try {
                              const { supabase } = await import('../../lib/supabaseClient');
                              await supabase.auth.signOut();
                            } catch {}
                            try {
                              const { firebaseAuth } = await import('../../lib/firebaseClient');
                              if (firebaseAuth) {
                                const { signOut } = await import('firebase/auth');
                                await signOut(firebaseAuth);
                              }
                            } catch {}
                            window.location.href = '/';
                          }
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 transition text-left cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tier 2: Executive Slate Navy Workspace Navigation Tabs (overflow-visible for unclipped popovers) */}
      <div className="bg-[#0e172e] border-b border-slate-800 relative z-30 overflow-visible" ref={dropdownNavRef}>
        <div className="max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-1 flex items-center justify-between relative overflow-visible">
          <nav className="flex items-center gap-1.5 py-0.5 overflow-visible">
            {visibleNavItems.map((item) => {
              const hasSub = Boolean(item.subItems && item.subItems.length > 0);
              const isSubActive = hasSub && item.subItems?.some((sub) => currentTab === sub.key);
              const isActive = isSubActive || currentTab === item.key;
              const isDropdownOpen = openDropdown === item.key;

              if (hasSub) {
                return (
                  <div
                    key={item.key}
                    className="relative"
                    onMouseEnter={() => handleTabMouseEnter(item.key)}
                    onMouseLeave={handleTabMouseLeave}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdown((prev) => (prev === item.key ? null : item.key));
                      }}
                      onMouseEnter={() => prefetchRoute(item.href)}
                      className={`h-9 px-3 flex items-center gap-2 text-xs rounded-md transition select-none cursor-pointer ${
                        isActive
                          ? 'bg-sky-600 text-white font-bold shadow-xs'
                          : 'text-slate-300 hover:text-white hover:bg-white/10 font-semibold'
                      }`}
                      aria-expanded={isDropdownOpen}
                      aria-haspopup="true"
                    >
                      <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                      <span>{item.label}</span>
                      {typeof item.count === 'number' && item.count > 0 && (
                        <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black ${
                          isActive ? 'bg-sky-800 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {item.count > 99 ? '99+' : item.count}
                        </span>
                      )}
                      <ChevronDown className={`h-3 w-3 ${isActive ? 'text-white' : 'text-slate-400'} transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Popover (Seamless continuous hit area with pt-1.5) */}
                    {isDropdownOpen && (
                      <div
                        className="absolute left-0 top-full pt-1.5 w-64 z-50 animate-panel-in"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="rounded-xl border border-slate-700/90 bg-[#0c1527] shadow-2xl p-1.5 space-y-1 ring-1 ring-black/40 backdrop-blur-md">
                          {item.subItems?.map((sub) => {
                            const isThisSubActive = currentTab === sub.key;
                            return (
                              <button
                                key={sub.key}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNavigate(sub.key, sub.href);
                                  setOpenDropdown(null);
                                }}
                                onMouseEnter={() => prefetchRoute(sub.href)}
                                className={`w-full text-left p-2.5 rounded-lg transition flex items-start justify-between gap-2 cursor-pointer ${
                                  isThisSubActive
                                    ? 'bg-sky-600 text-white font-bold shadow-xs'
                                    : 'hover:bg-slate-800/90 text-slate-300 hover:text-white'
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-bold leading-tight">{sub.label}</p>
                                  {sub.description && (
                                    <p className={`text-[10.5px] font-normal mt-0.5 truncate ${
                                      isThisSubActive ? 'text-sky-100' : 'text-slate-400'
                                    }`}>
                                      {sub.description}
                                    </p>
                                  )}
                                </div>
                                {typeof sub.count === 'number' && sub.count > 0 && (
                                  <span className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                                    isThisSubActive
                                      ? 'bg-sky-800 text-white'
                                      : 'bg-slate-800 text-sky-300 border border-slate-700'
                                  }`}>
                                    {sub.count}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
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
                    setOpenDropdown(null);
                    onNavigate(item.key, item.href);
                  }}
                  onMouseEnter={() => prefetchRoute(item.href)}
                  className={`h-9 px-3 flex items-center gap-2 text-xs rounded-md transition select-none cursor-pointer ${
                    isActive
                      ? 'bg-sky-600 text-white font-bold shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-white/10 font-semibold'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black ${
                      isActive ? 'bg-sky-800 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {item.count > 99 ? '99+' : item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Info Tag */}
          <div className="hidden xl:flex items-center gap-2 text-[11px] font-semibold text-slate-400 py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-bold">Trade Terminal Active</span>
          </div>
        </div>
      </div>
    </header>
  );
};

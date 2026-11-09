'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  KanbanSquare,
  ClipboardList,
  Ship,
  FileCheck2,
  Receipt,
  Building2,
  Package,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  BarChart3,
  Calendar,
  Layers
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { getPortalCache, setPortalCache, fetchAllPortalData } from '../../lib/portalDataStore';
import {
  Quote,
  Lead,
  TaskRecord,
  ShipmentRecord,
  InvoiceRecord,
  DocumentChecklist
} from '../../lib/types';
import {
  SmartCommandCenter,
  SmartPortalPulse,
  SmartPortalInsight,
  SmartCommandMetric,
  SmartPortalTarget
} from '../SmartCommandCenter';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export function OverviewWorkspace() {
  const router = useRouter();

  const [cache, setCache] = useState(() => getPortalCache());
  const [loading, setLoading] = useState(() => !getPortalCache());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedLabel, setLastSyncedLabel] = useState('Just now');

  const loadData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const data = await fetchAllPortalData({ force: true });
      setCache(data);
      setLastSyncedLabel(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.warn('Failed to refresh overview data:', e);
    } finally {
      setIsSyncing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cache) {
      loadData();
    }
  }, [cache, loadData]);

  const quotes = useMemo(() => cache?.quotes || [], [cache]);
  const leads = useMemo(() => cache?.leads || [], [cache]);
  const tasks = useMemo(() => cache?.tasks || [], [cache]);
  const shipments = useMemo(() => cache?.shipments || [], [cache]);
  const invoices = useMemo(() => cache?.invoices || [], [cache]);
  const checklists = useMemo(() => cache?.checklists || [], [cache]);
  const clients = useMemo(() => cache?.clients || [], [cache]);

  // Analytics
  const analytics = useMemo(() => {
    const hotLeads = leads.filter((l) => l.priority === 'High' && l.stage !== 'Lost');
    const overdueTasks = tasks.filter((t) => t.status !== 'Done');
    const activeShipments = shipments.filter((s) => s.status !== 'Arrived');
    const totalQuoted = quotes.reduce((acc, q) => {
      const items = (q.items || []).reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
      return acc + items + (Number(q.freight_cost) || 0) + (Number(q.insurance_cost) || 0);
    }, 0);
    const wonValue = quotes
      .filter((q) => ['Approved', 'Invoice Raised', 'Shipped', 'Closed'].includes(q.status))
      .reduce((acc, q) => {
        const items = (q.items || []).reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
        return acc + items + (Number(q.freight_cost) || 0) + (Number(q.insurance_cost) || 0);
      }, 0);
    const pendingReceivables = invoices
      .filter((inv) => inv.payment_status !== 'Paid')
      .reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);

    return {
      hotLeadsCount: hotLeads.length,
      overdueTasksCount: overdueTasks.length,
      activeShipmentsCount: activeShipments.length,
      totalQuoted,
      wonValue,
      pendingReceivables
    };
  }, [quotes, leads, tasks, shipments, invoices]);

  // Smart pulse stats
  const smartPortalPulse: SmartPortalPulse = useMemo(() => {
    return {
      healthScore: 94,
      urgentActions: analytics.overdueTasksCount,
      pipelineMomentum: quotes.filter((q) => ['Sent', 'Negotiation'].includes(q.status)).length,
      receivableRisk: analytics.pendingReceivables > 0 ? formatCurrency(analytics.pendingReceivables) : 'Healthy',
      automationCoverage: 88,
      activeShipments: analytics.activeShipmentsCount
    };
  }, [analytics, quotes]);

  const smartPortalInsights: SmartPortalInsight[] = useMemo(() => {
    const list: SmartPortalInsight[] = [];
    if (analytics.hotLeadsCount > 0) {
      list.push({
        id: 'hot-leads',
        tone: 'opportunity',
        title: `${analytics.hotLeadsCount} Priority Buyers Ready for Follow-up`,
        detail: 'High-score potential buyers currently have active inquiries.',
        evidence: 'CRM Pipeline Priority',
        action: 'Open CRM Pipeline',
        target: 'crm'
      });
    }
    if (analytics.overdueTasksCount > 0) {
      list.push({
        id: 'overdue-tasks',
        tone: 'warning',
        title: `${analytics.overdueTasksCount} Action Items Due`,
        detail: 'Tasks require operational attention for documentation or shipping.',
        evidence: 'Task Queue',
        action: 'Review Tasks',
        target: 'tasks'
      });
    }
    list.push({
      id: 'pipeline-healthy',
      tone: 'healthy',
      title: 'Commercial Engine Operational',
      detail: `Total quoted deals value at ${formatCurrency(analytics.totalQuoted)}.`,
      evidence: 'Export Quotation Desk',
      action: 'View Quotes',
      target: 'quotes'
    });
    return list;
  }, [analytics]);

  const commandMetrics: SmartCommandMetric[] = useMemo(() => {
    return [
      {
        label: 'Active Leads',
        value: leads.length.toString(),
        detail: `${analytics.hotLeadsCount} high priority`,
        target: 'crm',
        tone: 'sky'
      },
      {
        label: 'Commercial Quotes',
        value: quotes.length.toString(),
        detail: formatCurrency(analytics.totalQuoted),
        target: 'quotes',
        tone: 'emerald'
      },
      {
        label: 'Pending Invoices',
        value: invoices.filter((i) => i.payment_status !== 'Paid').length.toString(),
        detail: formatCurrency(analytics.pendingReceivables),
        target: 'accounts',
        tone: 'amber'
      },
      {
        label: 'Live Shipments',
        value: analytics.activeShipmentsCount.toString(),
        detail: 'Ocean & Air Freight',
        target: 'shipments',
        tone: 'slate'
      }
    ];
  }, [leads, quotes, invoices, analytics]);

  const handleNavigate = (target: SmartPortalTarget) => {
    const map: Record<SmartPortalTarget, string> = {
      crm: '/crm',
      quotes: '/quotes',
      accounts: '/accounting',
      shipments: '/crm',
      documents: '/letterhead',
      tasks: '/crm'
    };
    router.push(map[target] || '/crm');
  };

  return (
    <div className="space-y-6">
      {/* Smart Command Center Executive Hero */}
      <SmartCommandCenter
        pulse={smartPortalPulse}
        insights={smartPortalInsights}
        busy={isSyncing}
        lastSyncedAt={lastSyncedLabel}
        operatorName="Trade Desk"
        commandMetrics={commandMetrics}
        onNavigate={handleNavigate}
        onRunAutomation={loadData}
      />

      {/* Primary KPI Grid with Rich Color Accents */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-sky-200/90 bg-gradient-to-br from-white via-white to-sky-50/80 p-4 shadow-2xs border-t-3 border-t-sky-500">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500">Active Deals</span>
            <div className="p-2 rounded-lg bg-sky-100 text-sky-700 shadow-2xs">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{quotes.length}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">Total generated proposals</p>
        </div>

        <div className="rounded-xl border border-indigo-200/90 bg-gradient-to-br from-white via-white to-indigo-50/80 p-4 shadow-2xs border-t-3 border-t-indigo-500">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500">Hot Prospects</span>
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 shadow-2xs">
              <KanbanSquare className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{analytics.hotLeadsCount}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">High priority buyers</p>
        </div>

        <div className="rounded-xl border border-amber-200/90 bg-gradient-to-br from-white via-white to-amber-50/80 p-4 shadow-2xs border-t-3 border-t-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500">Pending Tasks</span>
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shadow-2xs">
              <ClipboardList className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{analytics.overdueTasksCount}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">Operational actions</p>
        </div>

        <div className="rounded-xl border border-teal-200/90 bg-gradient-to-br from-white via-white to-teal-50/80 p-4 shadow-2xs border-t-3 border-t-teal-500">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500">Active Shipments</span>
            <div className="p-2 rounded-lg bg-teal-100 text-teal-700 shadow-2xs">
              <Ship className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{analytics.activeShipmentsCount}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">Sea / Air freight in transit</p>
        </div>
      </div>

      {/* Snapshot Cards with Color Depth */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Commercial Pipeline Snapshot */}
        <div className="rounded-xl border border-emerald-200/90 bg-white p-5 shadow-xs space-y-3.5 border-t-3 border-t-emerald-500">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <Receipt className="h-4 w-4" />
              </span>
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                Financial Overview
              </h3>
            </div>
            <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              Live
            </span>
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-semibold">Total Quoted Value</span>
              <span className="font-mono font-black text-slate-900">{formatCurrency(analytics.totalQuoted)}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/60">
              <span className="text-emerald-900 font-bold">Confirmed / Won Value</span>
              <span className="font-mono font-black text-emerald-700">{formatCurrency(analytics.wonValue)}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/60">
              <span className="text-amber-900 font-bold">Pending Receivables</span>
              <span className="font-mono font-black text-amber-700">{formatCurrency(analytics.pendingReceivables)}</span>
            </div>
          </div>
        </div>

        {/* Lead Stages Distribution */}
        <div className="rounded-xl border border-indigo-200/90 bg-white p-5 shadow-xs space-y-3.5 border-t-3 border-t-indigo-500">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                <Layers className="h-4 w-4" />
              </span>
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                CRM Pipeline Stages
              </h3>
            </div>
            <span className="text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
              {leads.length} Leads
            </span>
          </div>
          <div className="space-y-2 text-xs">
            {[
              { stage: 'New Lead', color: 'bg-sky-500' },
              { stage: 'Contacted', color: 'bg-indigo-500' },
              { stage: 'Quoted', color: 'bg-amber-500' },
              { stage: 'Negotiation', color: 'bg-purple-500' },
              { stage: 'Won', color: 'bg-emerald-500' }
            ].map(({ stage, color }) => {
              const count = leads.filter((l) => l.stage === stage).length;
              const pct = leads.length ? Math.round((count / leads.length) * 100) : 0;
              return (
                <div key={stage} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-700">{stage}</span>
                    <span className="text-slate-500 font-semibold">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Operations Shortcuts */}
        <div className="rounded-xl border border-sky-200/90 bg-white p-5 shadow-xs space-y-3.5 border-t-3 border-t-sky-500">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                <Sparkles className="h-4 w-4" />
              </span>
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                Quick Actions
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <button
              type="button"
              onClick={() => router.push('/quotes?new=true')}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-sky-50 hover:border-sky-300 transition text-left font-bold text-slate-800 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700 group-hover:bg-sky-600 group-hover:text-white transition">
                  <FileCheck2 className="h-3.5 w-3.5" />
                </div>
                <span>Create Export Quotation</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition" />
            </button>
            <button
              type="button"
              onClick={() => router.push('/crm')}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 transition text-left font-bold text-slate-800 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition">
                  <KanbanSquare className="h-3.5 w-3.5" />
                </div>
                <span>Manage CRM Pipeline</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
            </button>
            <button
              type="button"
              onClick={() => router.push('/accounting')}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 transition text-left font-bold text-slate-800 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition">
                  <Receipt className="h-3.5 w-3.5" />
                </div>
                <span>Accounting & Expenses</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
            </button>
            <button
              type="button"
              onClick={() => router.push('/vendors')}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-teal-50 hover:border-teal-300 transition text-left font-bold text-slate-800 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-teal-100 text-teal-700 group-hover:bg-teal-600 group-hover:text-white transition">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <span>Suppliers & Agreements</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

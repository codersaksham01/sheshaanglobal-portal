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

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Active Deals</span>
            <TrendingUp className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{quotes.length}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">Total generated proposals</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Hot Prospects</span>
            <KanbanSquare className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{analytics.hotLeadsCount}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">High priority buyers</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Pending Tasks</span>
            <ClipboardList className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{analytics.overdueTasksCount}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">Operational actions</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Active Shipments</span>
            <Ship className="h-4 w-4 text-teal-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{analytics.activeShipmentsCount}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">Sea / Air freight in transit</p>
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Commercial Pipeline Snapshot */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">
              Financial Overview
            </h3>
            <Receipt className="h-4 w-4 text-slate-400" />
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 font-semibold">Total Quoted Value</span>
              <span className="font-mono font-black text-slate-900">{formatCurrency(analytics.totalQuoted)}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 font-semibold">Confirmed / Won Value</span>
              <span className="font-mono font-black text-emerald-600">{formatCurrency(analytics.wonValue)}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 font-semibold">Pending Receivables</span>
              <span className="font-mono font-black text-amber-600">{formatCurrency(analytics.pendingReceivables)}</span>
            </div>
          </div>
        </div>

        {/* Lead Stages Distribution */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">
              CRM Pipeline Stages
            </h3>
            <Layers className="h-4 w-4 text-slate-400" />
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
                    <span className="text-slate-500">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Operations Shortcuts */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">
              Quick Actions
            </h3>
            <Sparkles className="h-4 w-4 text-sky-600" />
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <button
              type="button"
              onClick={() => router.push('/quotes?new=true')}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-left font-extrabold text-slate-900"
            >
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-sky-600" />
                <span>Create Export Quotation</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={() => router.push('/crm')}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-left font-extrabold text-slate-900"
            >
              <div className="flex items-center gap-2">
                <KanbanSquare className="h-4 w-4 text-indigo-600" />
                <span>Manage CRM Pipeline</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={() => router.push('/accounting')}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-left font-extrabold text-slate-900"
            >
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-600" />
                <span>Accounting & Expenses</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={() => router.push('/vendors')}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-left font-extrabold text-slate-900"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-teal-600" />
                <span>Suppliers & Agreements</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

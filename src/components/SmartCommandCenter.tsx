import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Gauge,
  Radar,
  RefreshCw,
  Route,
  Ship,
  Sparkles,
  Target,
  Zap,
  Building2,
  Calendar
} from 'lucide-react';

export type SmartPortalTarget = 'crm' | 'quotes' | 'accounts' | 'shipments' | 'documents' | 'tasks';

export interface SmartPortalInsight {
  id: string;
  tone: 'critical' | 'warning' | 'opportunity' | 'healthy';
  title: string;
  detail: string;
  evidence: string;
  action: string;
  target: SmartPortalTarget;
}

export interface SmartPortalPulse {
  healthScore: number;
  urgentActions: number;
  pipelineMomentum: number;
  receivableRisk: string;
  automationCoverage: number;
  activeShipments: number;
}

export interface SmartCommandMetric {
  label: string;
  value: string;
  detail: string;
  target: SmartPortalTarget;
  tone: 'sky' | 'emerald' | 'amber' | 'red' | 'slate';
}

interface SmartCommandCenterProps {
  pulse: SmartPortalPulse;
  insights: SmartPortalInsight[];
  busy: boolean;
  lastSyncedAt: string;
  operatorName: string;
  commandMetrics: SmartCommandMetric[];
  onNavigate: (target: SmartPortalTarget) => void;
  onRunAutomation: () => void;
}

const toneStyles: Record<SmartPortalInsight['tone'], { icon: React.ReactNode; accent: string; badge: string }> = {
  critical: {
    icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
    accent: 'border-l-red-500',
    badge: 'bg-red-100 text-red-700'
  },
  warning: {
    icon: <Radar className="h-4 w-4 text-amber-600" />,
    accent: 'border-l-amber-500',
    badge: 'bg-amber-100 text-amber-700'
  },
  opportunity: {
    icon: <Target className="h-4 w-4 text-sky-600" />,
    accent: 'border-l-sky-500',
    badge: 'bg-sky-100 text-sky-700'
  },
  healthy: {
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    accent: 'border-l-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700'
  }
};

const commandMetricTone: Record<SmartCommandMetric['tone'], { card: string; text: string; topBorder: string }> = {
  sky: {
    card: 'bg-gradient-to-br from-white via-white to-sky-50/90 border-sky-200 hover:border-sky-400 hover:shadow-sm',
    text: 'text-sky-950',
    topBorder: 'border-t-3 border-t-sky-500'
  },
  emerald: {
    card: 'bg-gradient-to-br from-white via-white to-emerald-50/90 border-emerald-200 hover:border-emerald-400 hover:shadow-sm',
    text: 'text-emerald-950',
    topBorder: 'border-t-3 border-t-emerald-500'
  },
  amber: {
    card: 'bg-gradient-to-br from-white via-white to-amber-50/90 border-amber-200 hover:border-amber-400 hover:shadow-sm',
    text: 'text-amber-950',
    topBorder: 'border-t-3 border-t-amber-500'
  },
  red: {
    card: 'bg-gradient-to-br from-white via-white to-rose-50/90 border-rose-200 hover:border-rose-400 hover:shadow-sm',
    text: 'text-rose-950',
    topBorder: 'border-t-3 border-t-rose-500'
  },
  slate: {
    card: 'bg-gradient-to-br from-white via-white to-slate-100/90 border-slate-300 hover:border-slate-400 hover:shadow-sm',
    text: 'text-slate-900',
    topBorder: 'border-t-3 border-t-slate-600'
  }
};

export function SmartCommandCenter({
  pulse,
  insights,
  busy,
  lastSyncedAt,
  operatorName,
  commandMetrics,
  onNavigate,
  onRunAutomation
}: SmartCommandCenterProps) {
  const visibleInsights = insights.slice(0, 5);
  const firstName = (operatorName || 'Trade Desk').split(' ')[0] || 'Trade Desk';

  const executionLanes = [
    {
      label: 'Immediate Attention',
      value: pulse.urgentActions,
      detail: 'Overdue buyer follow-ups',
      target: 'crm' as SmartPortalTarget,
      cardStyle: 'bg-gradient-to-br from-white to-rose-50/90 border-rose-200 hover:bg-rose-100/70 hover:border-rose-300',
      badgeStyle: 'bg-rose-100 text-rose-800',
      tone: 'text-rose-700'
    },
    {
      label: 'Active Pipeline',
      value: pulse.pipelineMomentum,
      detail: 'Proposals under negotiation',
      target: 'quotes' as SmartPortalTarget,
      cardStyle: 'bg-gradient-to-br from-white to-sky-50/90 border-sky-200 hover:bg-sky-100/70 hover:border-sky-300',
      badgeStyle: 'bg-sky-100 text-sky-800',
      tone: 'text-sky-700'
    },
    {
      label: 'Receivables Risk',
      value: pulse.receivableRisk,
      detail: 'Pending invoice balance',
      target: 'accounts' as SmartPortalTarget,
      cardStyle: 'bg-gradient-to-br from-white to-amber-50/90 border-amber-200 hover:bg-amber-100/70 hover:border-amber-300',
      badgeStyle: 'bg-amber-100 text-amber-800',
      tone: 'text-amber-700'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Executive Overview Card with Color Accents */}
      <section className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-white to-sky-50/30 p-5 sm:p-6 shadow-xs border-t-4 border-t-sky-600">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-900 text-[10px] font-black uppercase tracking-wider border border-sky-200/80">
                <Building2 className="h-3 w-3 text-sky-700" />
                Sheshaan Global • Export Command
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                <Calendar className="h-3 w-3 text-slate-400" />
                {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Welcome back, {firstName}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed font-medium">
              Consolidated export operations: buyer inquiries, active quotations, shipment tracking, and cash collection milestones.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate('crm')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white px-4 py-2 text-xs font-black transition shadow-xs active:scale-95 cursor-pointer"
              >
                <Target className="h-3.5 w-3.5" />
                <span>Open CRM Pipeline</span>
              </button>
              <button
                type="button"
                onClick={onRunAutomation}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 text-xs font-bold transition shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
                <span>{busy ? 'Syncing...' : 'Sync Data'}</span>
              </button>
            </div>

            {/* Quick Priority Lanes with Rich Card Fills */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {executionLanes.map((lane) => (
                <button
                  key={lane.label}
                  type="button"
                  onClick={() => onNavigate(lane.target)}
                  className={`rounded-xl border p-3.5 text-left transition shadow-2xs ${lane.cardStyle}`}
                >
                  <span className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-600">
                    {lane.label}
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </span>
                  <span className={`mt-2 block text-xl font-black ${lane.tone}`}>
                    {lane.value}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">
                    {lane.detail}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Pillar: Operational Health */}
          <div className="border-t border-slate-200/80 pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Operational Health
                </p>
                <p className="text-3xl font-black text-slate-900 mt-0.5">
                  {pulse.healthScore}%
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shadow-2xs">
                <Gauge className="h-5 w-5" />
              </div>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-500"
                style={{ width: `${pulse.healthScore}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span>Database status</span>
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live ({lastSyncedAt || 'Active'})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-xl border border-sky-200/80 bg-sky-50/70">
                <span className="text-[10px] uppercase font-bold text-sky-800 block">Active Leads</span>
                <span className="text-xs font-black text-sky-950">{pulse.automationCoverage}% Enrolled</span>
              </div>
              <div className="p-2.5 rounded-xl border border-indigo-200/80 bg-indigo-50/70">
                <span className="text-[10px] uppercase font-bold text-indigo-800 block">Freight</span>
                <span className="text-xs font-black text-indigo-950">{pulse.activeShipments} Shipments</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Structured Metrics Row with Rich Color Accents */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5" aria-label="Trade Metrics">
        {commandMetrics.map((metric) => {
          const tone = commandMetricTone[metric.tone];
          return (
            <button
              key={metric.label}
              type="button"
              onClick={() => onNavigate(metric.target)}
              className={`rounded-xl border p-4 text-left transition shadow-2xs ${tone.card} ${tone.topBorder}`}
            >
              <span className="flex items-center justify-between gap-2 text-[10.5px] font-black uppercase tracking-wider text-slate-500">
                {metric.label}
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </span>
              <span className={`mt-2 block truncate text-2xl font-black ${tone.text}`}>{metric.value}</span>
              <span className="mt-0.5 block text-xs font-semibold text-slate-600 truncate">{metric.detail}</span>
            </button>
          );
        })}
      </section>

      {/* Recommended Next Actions */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5 bg-gradient-to-r from-slate-50 via-sky-50/30 to-slate-50">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-sky-600" />
              Priority Actions & Operations
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Automated signals from CRM, quotes, and accounts</p>
          </div>
          <span className="text-[11px] font-black text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full border border-sky-200">
            {visibleInsights.length} Recommended
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {visibleInsights.map((insight) => {
            const style = toneStyles[insight.tone];
            return (
              <div
                key={insight.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-slate-50/70 transition border-l-4 ${style.accent}`}
              >
                <div className="min-w-0 flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${style.badge}`}>
                    {style.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{insight.title}</h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-snug font-medium">{insight.detail}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">Source: {insight.evidence}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate(insight.target)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 text-xs font-bold text-slate-700 shadow-2xs transition shrink-0 active:scale-95"
                >
                  <span>{insight.action}</span>
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                </button>
              </div>
            );
          })}
          {!visibleInsights.length && (
            <div className="flex items-center gap-2 p-5 text-xs text-slate-500 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>All daily trade actions are up to date.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  Radar,
  RefreshCw,
  Route,
  Ship,
  Sparkles,
  Target
} from 'lucide-react';

export type SmartPortalTarget = 'actionQueue' | 'crm' | 'quotes' | 'accounts' | 'shipments' | 'documents' | 'tasks';

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

interface SmartCommandCenterProps {
  pulse: SmartPortalPulse;
  insights: SmartPortalInsight[];
  busy: boolean;
  lastSyncedAt: string;
  onNavigate: (target: SmartPortalTarget) => void;
  onRunAutomation: () => void;
}

const toneStyles: Record<SmartPortalInsight['tone'], { icon: React.ReactNode; accent: string; badge: string }> = {
  critical: {
    icon: <AlertTriangle className="h-4 w-4" />,
    accent: 'border-l-red-500',
    badge: 'bg-red-50 text-red-700'
  },
  warning: {
    icon: <Radar className="h-4 w-4" />,
    accent: 'border-l-amber-500',
    badge: 'bg-amber-50 text-amber-700'
  },
  opportunity: {
    icon: <Target className="h-4 w-4" />,
    accent: 'border-l-sky-500',
    badge: 'bg-sky-50 text-sky-700'
  },
  healthy: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    accent: 'border-l-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700'
  }
};

const healthTone = (score: number) => score >= 80 ? 'text-emerald-300' : score >= 60 ? 'text-amber-300' : 'text-red-300';

export function SmartCommandCenter({ pulse, insights, busy, lastSyncedAt, onNavigate, onRunAutomation }: SmartCommandCenterProps) {
  const visibleInsights = insights.slice(0, 5);

  return (
    <div className="space-y-4">
      <section className="smart-hero overflow-hidden text-white">
        <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)] xl:items-center">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-400/10 px-2.5 py-1 text-[10px] font-extrabold uppercase text-sky-200 ring-1 ring-sky-300/15">
                <Bot className="h-3.5 w-3.5" /> Rule-Based Trade Intelligence
              </span>
              <span className="text-[10px] font-semibold text-slate-400">Explainable signals from live operational data</span>
            </div>
            <h2 className="max-w-3xl text-2xl font-extrabold leading-tight sm:text-3xl">Your commercial command center</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Buyers, quotations, collections, freight, documents, and shipment execution are ranked into one operating plan.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => onNavigate('actionQueue')} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-extrabold text-slate-950 hover:bg-slate-100 shadow-[0_18px_44px_rgba(255,255,255,0.14)]">
                <Target className="h-4 w-4" /> Work priority queue
              </button>
              <button type="button" onClick={onRunAutomation} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-xs font-extrabold text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50">
                <Sparkles className="h-4 w-4" /> {busy ? 'Automation running' : 'Run smart automation'}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase text-slate-500">Operating health</p>
                <p className={`mt-1 text-5xl font-black ${healthTone(pulse.healthScore)}`}>{pulse.healthScore}</p>
              </div>
              <Gauge className="h-10 w-10 text-slate-600" />
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800" aria-label={`Operating health ${pulse.healthScore} percent`}>
              <div className="h-full rounded-full bg-sky-400 transition-[width] duration-500" style={{ width: `${pulse.healthScore}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
              <span>Last synchronized</span>
              <span className="inline-flex items-center gap-1 font-bold text-slate-300"><RefreshCw className="h-3 w-3" /> {lastSyncedAt || 'Connecting'}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5" aria-label="Business pulse">
        <PulseMetric icon={<AlertTriangle className="h-4 w-4" />} label="Urgent actions" value={String(pulse.urgentActions)} detail="Require attention" />
        <PulseMetric icon={<Route className="h-4 w-4" />} label="Pipeline momentum" value={String(pulse.pipelineMomentum)} detail="Active qualified buyers" />
        <PulseMetric icon={<CircleDollarSign className="h-4 w-4" />} label="Collection risk" value={pulse.receivableRisk} detail="Outstanding balance" />
        <PulseMetric icon={<Sparkles className="h-4 w-4" />} label="Automation" value={`${pulse.automationCoverage}%`} detail="Active leads enrolled" />
        <PulseMetric icon={<Ship className="h-4 w-4" />} label="Shipments" value={String(pulse.activeShipments)} detail="Currently in motion" className="col-span-2 lg:col-span-1" />
      </section>

      <section className="portal-card">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase text-sky-700">Deterministic operating brief</p>
            <h3 className="text-sm font-extrabold text-slate-950">Recommended next moves</h3>
          </div>
          <span className="text-[10px] font-semibold text-slate-500">Every recommendation includes its source signal</span>
        </div>
        <div className="divide-y divide-slate-100">
          {visibleInsights.map((insight) => {
            const style = toneStyles[insight.tone];
            return (
              <div key={insight.id} className={`grid gap-3 border-l-4 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${style.accent}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded ${style.badge}`}>{style.icon}</span>
                    <p className="text-xs font-extrabold text-slate-900">{insight.title}</p>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{insight.detail}</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">Signal: {insight.evidence}</p>
                </div>
                <button type="button" onClick={() => onNavigate(insight.target)} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-extrabold text-slate-800 hover:border-slate-300 hover:bg-slate-100">
                  {insight.action} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          {!visibleInsights.length && (
            <div className="flex items-center gap-3 px-4 py-6 text-sm text-slate-600">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> No operational exceptions need attention right now.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PulseMetric({ icon, label, value, detail, className = '' }: { icon: React.ReactNode; label: string; value: string; detail: string; className?: string }) {
  return (
    <div className={`metric-tile min-w-0 p-3 ${className}`}>
      <div className="flex items-center gap-2 text-slate-500">{icon}<span className="truncate text-[10px] font-extrabold uppercase">{label}</span></div>
      <p className="mt-2 truncate text-xl font-black text-slate-950">{value}</p>
      <p className="mt-0.5 truncate text-[10px] text-slate-500">{detail}</p>
    </div>
  );
}

import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import readXlsxFile from 'read-excel-file/browser';
import { dbType, isFirebase, isMock, mockDB, supabase } from '../lib/supabaseClient';
import {
  AppUser,
  Client,
  DocumentChecklist,
  FreightPreset,
  FreightRateHistory,
  InvoiceRecord,
  Lead,
  MessageTemplate,
  Product,
  Quote,
  ShipmentRecord,
  TaskRecord,
  TimelineActivity,
  Vendor
} from '../lib/types';
import { InvoicePDF } from './InvoicePDF';
import { QuoteForm } from './QuoteForm';
import { CrmTable } from './crm/CrmTable';
import { CrmKanban } from './crm/CrmKanban';
import { LeadInspectorDrawer } from './crm/LeadInspectorDrawer';
import { CrmLead, CrmStage } from '../lib/types/crm';
import { useCallback } from 'react';
import { SmartCommandCenter, SmartPortalInsight, SmartPortalPulse } from './SmartCommandCenter';
import { usePortalIdentity } from './AuthGate';
import { canAccessTab, canManageTable } from '../lib/permissions';
import {
  Anchor,
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  Check,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  Copy,
  Database,
  Download,
  Edit2,
  FileCheck2,
  Filter,
  History,
  LayoutDashboard,
  KanbanSquare,
  Lock,
  Mail,
  Menu,
  MessageSquare,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Ship,
  Sparkles,
  Trash2,
  Target,
  LineChart,
  CheckCircle2,
  Sun,
  Moon,
  FileText,
  ArrowRight,
  TrendingUp,
  Users,
  X
} from 'lucide-react';

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);

const quoteStatuses: Quote['status'][] = [
  'Draft',
  'Sent',
  'Negotiation',
  'Approved',
  'Invoice Raised',
  'Shipped',
  'Closed',
  'Lost',
  'Declined'
];
const buyerListPageSize = 48;
const portalDataCacheVersion = 'crm-pipeline-only-2026-08-14';
const reachoutListPageSize = 60;
const missingPhonePageSize = 40;
const sourceListPageSize = 60;
const crmColumnPageSize = 24;

type TabKey = 'overview' | 'actionQueue' | 'crm' | 'dataSources' | 'phoneReachout' | 'quotes' | 'communications' | 'templates' | 'tasks' | 'accounts' | 'shipments' | 'documents' | 'products' | 'vendors' | 'freight' | 'rates' | 'analytics' | 'users' | 'manager';
type QuoteSortKey = 'created_desc' | 'created_asc' | 'value_desc' | 'value_asc' | 'buyer_asc' | 'status_asc';
type ImportSummary = { buyers: number; leads: number; activities: number; tasks: number; skipped: number; message: string; skippedList?: string[] };
type ImportProgress = { label: string; processed: number; total: number } | null;
type ImportDataSource = 'Embassy Data' | 'Custom Researched Data';
type LeadTrackingAction = 'email_sent' | 'followup_1' | 'followup_2' | 'followup_3' | 'responded' | 'followup_due';
type BuyerSortKey = 'name' | 'phone_asc' | 'phone_desc' | 'followup_first' | 'reachout_first' | 'waiting_first' | 'responded_first';

const blankClient: Partial<Client> = {
  company_name: '',
  address: '',
  contact_name: '',
  contact_email: '',
  destination_port: '',
  phone: '',
  products_dealing: []
};

const blankProduct: Partial<Product> = {
  sku: '',
  description: '',
  unit_price: 0,
  cost_price: 0,
  weight: 0,
  dimensions: ''
};

const blankVendor: Partial<Vendor> = {
  company_name: '',
  contact_name: '',
  contact_email: '',
  phone: '',
  city: '',
  country: 'India',
  product_categories: '',
  payment_terms: '',
  rating: 3,
  status: 'Active',
  notes: ''
};

const blankPreset: Partial<FreightPreset> = {
  name: '',
  loading_port: 'Mundra Port, India',
  destination_port: '',
  shipment_mode: 'Sea Freight (1x20ft FCL)',
  freight_cost: 0,
  insurance_cost: 0,
  shipment_window: '10-14 days post advance payment/LC confirmation',
  transit_time: '',
  partial_shipment: 'Allowed / Allowed',
  container_type: '20ft FCL Dry Container / Ambient Storage',
  storage_condition: 'Store in a cool, dry place away from direct sunlight'
};

const blankLead: Partial<Lead> = {
  company_name: '',
  contact_name: '',
  contact_email: '',
  phone: '',
  country: '',
  product_interest: '',
  estimated_value: 0,
  stage: 'New Lead',
  priority: 'Medium',
  owner: 'Sana Zeba',
  next_follow_up: '',
  notes: '',
  sequence_enrolled: ''
};

const blankActivity: Partial<TimelineActivity> = {
  type: 'Note',
  title: '',
  details: '',
  activity_date: new Date().toISOString().slice(0, 10),
  owner: 'Sana Zeba'
};

const blankTask: Partial<TaskRecord> = {
  title: '',
  status: 'Open',
  priority: 'Medium',
  due_date: new Date().toISOString().slice(0, 10),
  owner: 'Sana Zeba',
  notes: ''
};

const blankTemplate: Partial<MessageTemplate> = {
  name: '',
  channel: 'Email',
  category: 'Quote Follow-up',
  subject: '',
  body: '',
  active: true
};

const blankRate: Partial<FreightRateHistory> = {
  loading_port: 'Mundra Port, India',
  destination_port: '',
  shipment_mode: 'Sea Freight (1x20ft FCL)',
  forwarder: '',
  freight_cost: 0,
  insurance_cost: 0,
  currency: 'INR',
  effective_date: new Date().toISOString().slice(0, 10),
  validity_date: '',
  notes: ''
};

const blankInvoice: Partial<InvoiceRecord> = {
  invoice_number: '',
  invoice_type: 'Proforma',
  amount: 0,
  currency: 'INR',
  payment_status: 'Pending',
  advance_amount: 0,
  balance_amount: 0,
  due_date: '',
  notes: ''
};

const blankShipment: Partial<ShipmentRecord> = {
  booking_number: '',
  vessel_name: '',
  container_number: '',
  seal_number: '',
  bl_number: '',
  etd: '',
  eta: '',
  status: 'Planning',
  notes: ''
};

const blankChecklist: Partial<DocumentChecklist> = {
  commercial_invoice: false,
  packing_list: false,
  certificate_origin: false,
  phytosanitary: false,
  insurance: false,
  bill_of_lading: false,
  notes: ''
};

const blankUser: Partial<AppUser> = {
  name: '',
  email: '',
  role: 'Sales',
  active: true
};

const countryTimezoneOffsets: Record<string, number> = {
  australia: 10,
  austria: 1,
  bahrain: 3,
  bangladesh: 6,
  belgium: 1,
  brazil: -3,
  canada: -5,
  china: 8,
  croatia: 1,
  denmark: 1,
  egypt: 2,
  france: 1,
  germany: 1,
  greece: 2,
  'hong kong': 8,
  hongkong: 8,
  hungary: 1,
  indonesia: 7,
  italy: 1,
  japan: 9,
  kuwait: 3,
  malaysia: 8,
  netherlands: 1,
  norway: 1,
  oman: 4,
  poland: 1,
  portugal: 0,
  qatar: 3,
  'saudi arabia': 3,
  singapore: 8,
  spain: 1,
  sweden: 1,
  switzerland: 1,
  thailand: 7,
  turkey: 3,
  uae: 4,
  uk: 0,
  'united arab emirates': 4,
  'united kingdom': 0,
  'united states': -5,
  usa: -5,
  vietnam: 7
};

const countryTimeZones: Record<string, string> = {
  australia: 'Australia/Sydney',
  austria: 'Europe/Vienna',
  bahrain: 'Asia/Bahrain',
  bangladesh: 'Asia/Dhaka',
  belgium: 'Europe/Brussels',
  brazil: 'America/Sao_Paulo',
  canada: 'America/Toronto',
  china: 'Asia/Shanghai',
  croatia: 'Europe/Zagreb',
  denmark: 'Europe/Copenhagen',
  egypt: 'Africa/Cairo',
  france: 'Europe/Paris',
  germany: 'Europe/Berlin',
  greece: 'Europe/Athens',
  'hong kong': 'Asia/Hong_Kong',
  hongkong: 'Asia/Hong_Kong',
  hungary: 'Europe/Budapest',
  indonesia: 'Asia/Jakarta',
  italy: 'Europe/Rome',
  japan: 'Asia/Tokyo',
  kuwait: 'Asia/Kuwait',
  malaysia: 'Asia/Kuala_Lumpur',
  netherlands: 'Europe/Amsterdam',
  norway: 'Europe/Oslo',
  oman: 'Asia/Muscat',
  poland: 'Europe/Warsaw',
  portugal: 'Europe/Lisbon',
  qatar: 'Asia/Qatar',
  'saudi arabia': 'Asia/Riyadh',
  singapore: 'Asia/Singapore',
  spain: 'Europe/Madrid',
  sweden: 'Europe/Stockholm',
  switzerland: 'Europe/Zurich',
  thailand: 'Asia/Bangkok',
  turkey: 'Europe/Istanbul',
  uae: 'Asia/Dubai',
  uk: 'Europe/London',
  'united arab emirates': 'Asia/Dubai',
  'united kingdom': 'Europe/London',
  'united states': 'America/New_York',
  usa: 'America/New_York',
  vietnam: 'Asia/Ho_Chi_Minh'
};

const commonCountryNames = Object.keys(countryTimezoneOffsets).sort((a, b) => b.length - a.length);
const titleCaseCountry = (country: string) => country.replace(/\b\w/g, (letter) => letter.toUpperCase()).replace(/\bUae\b/, 'UAE').replace(/\bUsa\b/, 'USA').replace(/\bUk\b/, 'UK');
const normalizeCountryKey = (country = '') => country.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
const formatIstHour = (hour: number) => {
  const normalized = ((hour % 24) + 24) % 24;
  const wholeHour = Math.floor(normalized);
  const minutes = Math.round((normalized - wholeHour) * 60);
  const date = new Date(2026, 0, 1, wholeHour, minutes);
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
};
const getTimeZoneOffsetMinutes = (timeZone: string, date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute));
  return (asUtc - date.getTime()) / 60000;
};
const zonedLocalTimeToUtc = (timeZone: string, localHour: number) => {
  const now = new Date();
  const guess = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), localHour, 0));
  const offset = getTimeZoneOffsetMinutes(timeZone, guess);
  return new Date(guess.getTime() - offset * 60000);
};
const bestSendWindowCache = new Map<string, string>();
const bestSendWindowIST = (country = '') => {
  const key = normalizeCountryKey(country);
  if (bestSendWindowCache.has(key)) {
    return bestSendWindowCache.get(key)!;
  }
  let windowStr = '';
  const timeZone = countryTimeZones[key];
  if (timeZone) {
    const start = zonedLocalTimeToUtc(timeZone, 10);
    const end = zonedLocalTimeToUtc(timeZone, 12);
    const formatter = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });
    windowStr = `Best send: ${formatter.format(start)} - ${formatter.format(end)} IST`;
  } else {
    const offset = countryTimezoneOffsets[key];
    if (offset === undefined) {
      windowStr = 'Best send: 10:30 AM - 12:30 PM IST';
    } else {
      const start = 10 - offset + 5.5;
      const end = 12 - offset + 5.5;
      windowStr = `Best send: ${formatIstHour(start)} - ${formatIstHour(end)} IST`;
    }
  }
  bestSendWindowCache.set(key, windowStr);
  return windowStr;
};

// ─────────────────────────────────────────────────────────────────────────────
// SHIPMENT TRANSIT RADAR — Visual 6-stage progress rail with demurrage clock
// ─────────────────────────────────────────────────────────────────────────────
const SHIPMENT_STAGES: ShipmentRecord['status'][] = ['Planning', 'Booked', 'Stuffed', 'Sailed', 'Arrived', 'Delivered'];
const STAGE_ICONS = ['📋', '🔖', '📦', '🚢', '⚓', '✅'];

const ShipmentRadar = ({
  shipments,
  clients,
  onSelectShipment,
}: {
  shipments: ShipmentRecord[];
  clients: Client[];
  onSelectShipment: (id: string) => void;
}) => {
  const active = shipments.filter(s => !['Delivered'].includes(s.status)).slice(0, 6);
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  if (active.length === 0) return null;

  const msPerDay = 86400000;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
          <Ship className="h-4 w-4 text-sky-500" />
          Live Shipment Transit Radar
          <span className="sbadge sbadge-sky">{active.length} Active</span>
        </h3>
      </div>
      <div className="space-y-4">
        {active.map(s => {
          const activeIdx = SHIPMENT_STAGES.indexOf(s.status);
          const client = clients.find(c => c.id === s.client_id);
          const etaDays = s.eta && now ? Math.ceil((new Date(s.eta).getTime() - now) / msPerDay) : null;
          const demurrage = s.status === 'Sailed' && etaDays !== null && etaDays <= 3;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectShipment(s.id)}
              className="w-full text-left group"
            >
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-black text-slate-700 truncate">{client?.company_name || 'Shipment'}</span>
                  {s.booking_number && <span className="text-[10px] text-slate-400 font-mono shrink-0">{s.booking_number}</span>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {demurrage && (
                    <span className="sbadge sbadge-red animate-pulse">
                      ⚠ ETA {etaDays}d
                    </span>
                  )}
                  {!demurrage && etaDays !== null && (
                    <span className="sbadge sbadge-slate">ETA {etaDays > 0 ? `+${etaDays}d` : 'Today'}</span>
                  )}
                  <span className={`sbadge ${activeIdx >= 3 ? 'sbadge-sky' : activeIdx >= 1 ? 'sbadge-amber' : 'sbadge-slate'}`}>{s.status}</span>
                </div>
              </div>
              {/* Progress Rail */}
              <div className="flex items-center gap-0">
                {SHIPMENT_STAGES.map((stage, i) => {
                  const done = i < activeIdx;
                  const active = i === activeIdx;
                  const future = i > activeIdx;
                  return (
                    <React.Fragment key={stage}>
                      {/* Node */}
                      <div className={`relative flex items-center justify-center h-7 w-7 rounded-full text-[10px] shrink-0 transition-all ${
                        done ? 'bg-emerald-500 text-white shadow-sm' :
                        active ? 'bg-sky-500 text-white shadow-md ring-2 ring-sky-200' :
                        'bg-slate-100 text-slate-400'
                      }`}>
                        {done ? '✓' : STAGE_ICONS[i]}
                        {active && <span className="absolute inset-0 rounded-full bg-sky-400 animate-ping opacity-30" />}
                      </div>
                      {/* Connector */}
                      {i < SHIPMENT_STAGES.length - 1 && (
                        <div className={`flex-1 h-[2px] mx-0.5 ${done ? 'bg-emerald-400' : 'bg-slate-100'}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1 px-0.5">
                {SHIPMENT_STAGES.map((stage, i) => (
                  <span key={stage} className={`text-[8px] font-semibold ${i === activeIdx ? 'text-sky-600' : 'text-slate-300'} ${i === 0 ? 'text-left' : i === SHIPMENT_STAGES.length - 1 ? 'text-right' : 'text-center'} w-7`} style={{minWidth: 0}}>
                    {stage.slice(0, 4)}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MARGIN GUARD — Deterministic live margin calculator + container fill optimizer
// ─────────────────────────────────────────────────────────────────────────────
const MarginGuard = ({
  quote,
  fxRate,
  fxRateLoading,
}: {
  quote: Partial<Quote> & { items?: NonNullable<Quote['items']> };
  fxRate: number;
  fxRateLoading: boolean;
}) => {
  const MARGIN_FLOOR = 8;

  const totalRevenue = useMemo(() => {
    const items = (quote.items || []).reduce((sum, it) => sum + (Number(it.unit_price || 0) * Number(it.quantity || 0)), 0);
    return items + Number(quote.packaging_cost || 0) + Number(quote.inland_haulage_cost || 0) +
      Number(quote.customs_clearance_cost || 0) + Number(quote.freight_cost || 0) + Number(quote.insurance_cost || 0);
  }, [quote]);

  const totalCost = useMemo(() => {
    const items = (quote.items || []).reduce((sum, it) => sum + (Number(it.cost_price || 0) * Number(it.quantity || 0)), 0);
    return items + Number(quote.packaging_cost || 0) + Number(quote.inland_haulage_cost || 0) +
      Number(quote.customs_clearance_cost || 0) + Number(quote.freight_cost || 0) + Number(quote.insurance_cost || 0);
  }, [quote]);

  const netMarginPct = totalRevenue > 0 ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 100) : 0;
  const gaugeColor = netMarginPct >= 15 ? '#10b981' : netMarginPct >= 8 ? '#f59e0b' : '#ef4444';
  const gaugeBg = netMarginPct >= 15 ? '#f0fdf4' : netMarginPct >= 8 ? '#fffbeb' : '#fef2f2';

  const totalWeightKg = useMemo(() =>
    (quote.items || []).reduce((sum, it) => sum + (Number(it.weight || 0) * Number(it.quantity || 0)), 0),
  [quote.items]);

  const fillPct20ft = Math.min(100, Math.round((totalWeightKg / 26500) * 100));
  const fillPct40ft = Math.min(100, Math.round((totalWeightKg / 28000) * 100));

  const revenueINR = quote.currency === 'USD' ? totalRevenue * fxRate : totalRevenue;
  const costINR    = quote.currency === 'USD' ? totalCost    * fxRate : totalCost;

  if (totalRevenue === 0) return null;

  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ background: gaugeBg, borderColor: gaugeColor + '33' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" style={{ color: gaugeColor }} />
          <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">Margin Guard</span>
          {fxRateLoading && <span className="text-[9px] text-slate-400 animate-pulse">Updating FX…</span>}
        </div>
        <span className="text-xl font-black" style={{ color: gaugeColor }}>{netMarginPct}%</span>
      </div>

      {/* Gauge bar */}
      <div className="margin-gauge-track">
        <div
          className="margin-gauge-fill"
          style={{ width: `${Math.min(100, Math.max(0, netMarginPct))}%`, backgroundColor: gaugeColor }}
        />
      </div>

      {netMarginPct < MARGIN_FLOOR && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-red-600 text-[10px] font-bold">⚠ Margin below floor ({MARGIN_FLOOR}%). Increase price or reduce cost before sending quote.</span>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white/70 rounded-lg p-2">
          <p className="text-[9px] text-slate-500 font-bold uppercase">Revenue</p>
          <p className="text-[11px] font-black text-slate-900">₹{(revenueINR / 1000).toFixed(0)}k</p>
        </div>
        <div className="bg-white/70 rounded-lg p-2">
          <p className="text-[9px] text-slate-500 font-bold uppercase">Cost</p>
          <p className="text-[11px] font-black text-slate-900">₹{(costINR / 1000).toFixed(0)}k</p>
        </div>
        <div className="bg-white/70 rounded-lg p-2">
          <p className="text-[9px] text-slate-500 font-bold uppercase">USD/INR</p>
          <p className="text-[11px] font-black text-emerald-600">₹{fxRate.toFixed(1)}</p>
        </div>
      </div>

      {/* Container fill optimizer */}
      {totalWeightKg > 0 && (
        <div className="space-y-1.5">
          <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Container Fill ({(totalWeightKg / 1000).toFixed(1)} MT)</p>
          <div>
            <div className="flex justify-between text-[9px] text-slate-500 mb-0.5">
              <span>20ft FCL</span><span>{fillPct20ft}% of 26.5 MT</span>
            </div>
            <div className="margin-gauge-track">
              <div className="margin-gauge-fill" style={{ width: `${fillPct20ft}%`, backgroundColor: fillPct20ft > 90 ? '#10b981' : fillPct20ft > 60 ? '#f59e0b' : '#94a3b8' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[9px] text-slate-500 mb-0.5">
              <span>40ft HQ</span><span>{fillPct40ft}% of 28.0 MT</span>
            </div>
            <div className="margin-gauge-track">
              <div className="margin-gauge-fill" style={{ width: `${fillPct40ft}%`, backgroundColor: fillPct40ft > 90 ? '#10b981' : fillPct40ft > 60 ? '#f59e0b' : '#94a3b8' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PipelineChart = ({ leads }: { leads: Lead[] }) => {
  const stages = ['New Lead', 'Contacted', 'Quoted', 'Negotiation', 'Won', 'Lost'];
  const stageCounts = stages.map((stage) => {
    return {
      stage,
      count: leads.filter((lead) => lead.stage === stage).length
    };
  });
  const maxCount = Math.max(...stageCounts.map(d => d.count), 1);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
      <h3 className="font-extrabold text-slate-900 text-sm mb-4 relative pb-2 border-b border-slate-100 flex items-center">
        <span className="absolute bottom-[-1px] left-0 h-[2px] w-8 bg-indigo-500 rounded"></span>
        CRM Pipeline Funnel
      </h3>
      <div className="w-full flex items-center justify-center">
        <svg viewBox="0 0 420 180" className="w-full h-auto">
          <line x1="40" y1="20" x2="400" y2="20" stroke="#f8fafc" strokeWidth="1" />
          <line x1="40" y1="75" x2="400" y2="75" stroke="#f8fafc" strokeWidth="1" />
          <line x1="40" y1="130" x2="400" y2="130" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

          {stageCounts.map((d, i) => {
            const x = 50 + i * 60;
            const barHeight = (d.count / maxCount) * 110;
            const y = 130 - barHeight;
            const colors = [
              ['#38bdf8', '#0284c7'],
              ['#818cf8', '#4f46e5'],
              ['#fb7185', '#e11d48'],
              ['#fbbf24', '#d97706'],
              ['#34d399', '#059669'],
              ['#94a3b8', '#475569']
            ];
            const [gradStart, gradEnd] = colors[i % colors.length];

            return (
              <g key={d.stage} className="group">
                <defs>
                  <linearGradient id={`grad-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={gradStart} />
                    <stop offset="100%" stopColor={gradEnd} />
                  </linearGradient>
                </defs>
                <rect
                  x={x}
                  y={y}
                  width="36"
                  height={Math.max(barHeight, 2)}
                  rx="4"
                  fill={`url(#grad-${i})`}
                  className="transition-all duration-300 hover:opacity-90 cursor-pointer"
                />
                <text
                  x={x + 18}
                  y={y - 6}
                  textAnchor="middle"
                  className="fill-slate-700 text-[10px] font-extrabold"
                >
                  {d.count}
                </text>
                <text
                  x={x + 18}
                  y="150"
                  textAnchor="middle"
                  className="fill-slate-400 text-[8px] font-bold tracking-tight uppercase"
                >
                  {d.stage.split(' ')[0]}
                </text>
              </g>
            );
          })}
          <line x1="30" y1="130" x2="410" y2="130" stroke="#cbd5e1" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
};

const RevenueTrendChart = ({ quotes, formatQuoteCurrency }: { quotes: Quote[]; formatQuoteCurrency: (val: number, cur: 'INR') => string }) => {
  const months = useMemo(() => {
    const list: { monthLabel: string; value: number }[] = [];
    const now = new Date();
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const monthLabel = d.toLocaleString('en-US', { month: 'short' });

      const monthQuotes = quotes.filter((q) => {
        const qDate = new Date(q.created_at || q.updated_at || now);
        return qDate.getFullYear() === year && qDate.getMonth() === monthIdx;
      });

      const totalValue = monthQuotes.reduce((acc, q) => {
        const freight = Number(q.freight_cost || 0);
        const ins = Number(q.insurance_cost || 0);
        const pack = Number(q.packaging_cost || 0);
        const haul = Number(q.inland_haulage_cost || 0);
        const custom = Number(q.customs_clearance_cost || 0);

        let itemsSum = 0;
        if (q.items) {
          itemsSum = q.items.reduce((sum, item) => sum + (Number(item.unit_price || 0) * Number(item.quantity || 0)), 0);
        }
        return acc + freight + ins + pack + haul + custom + itemsSum;
      }, 0);

      list.push({ monthLabel, value: totalValue });
    }
    return list;
  }, [quotes]);

  const maxVal = Math.max(...months.map((m) => m.value), 1);
  const points = months.map((m, i) => {
    const x = 50 + i * 80;
    const y = 130 - (m.value / maxVal) * 90;
    return { x, y };
  });

  const linePath = points.reduce((acc, p, i) => {
    return acc + `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
  }, '');

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} 130 L ${points[0].x} 130 Z`
    : '';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
      <h3 className="font-extrabold text-slate-900 text-sm mb-4 relative pb-2 border-b border-slate-100 flex items-center">
        <span className="absolute bottom-[-1px] left-0 h-[2px] w-8 bg-emerald-500 rounded"></span>
        Revenue Value Trend
      </h3>
      <div className="w-full flex items-center justify-center">
        <svg viewBox="0 0 420 180" className="w-full h-auto">
          <defs>
            <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <line x1="40" y1="40" x2="380" y2="40" stroke="#f8fafc" strokeWidth="1" />
          <line x1="40" y1="85" x2="380" y2="85" stroke="#f8fafc" strokeWidth="1" />
          <line x1="40" y1="130" x2="380" y2="130" stroke="#f1f5f9" strokeWidth="1" />

          {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}
          {linePath && <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

          {points.map((p, i) => (
            <g key={i} className="group">
              <circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                fill="#ffffff"
                stroke="#10b981"
                strokeWidth="2.5"
                className="transition-all duration-300 hover:r-6 cursor-pointer"
              />
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                className="fill-slate-800 text-[8px] font-extrabold opacity-75 group-hover:opacity-100 transition-opacity"
              >
                {months[i].value > 100000
                  ? `₹${(months[i].value / 100000).toFixed(1)}L`
                  : months[i].value > 1000
                  ? `₹${(months[i].value / 1000).toFixed(0)}k`
                  : `₹${months[i].value.toFixed(0)}`}
              </text>
              <text
                x={p.x}
                y="152"
                textAnchor="middle"
                className="fill-slate-400 text-[9px] font-black uppercase tracking-wider"
              >
                {months[i].monthLabel}
              </text>
            </g>
          ))}
          <line x1="30" y1="130" x2="390" y2="130" stroke="#cbd5e1" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
};

const LogisticsCompletionGauge = ({ completionRate, totalCount }: { completionRate: number; totalCount: number }) => {
  const radius = 50;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (completionRate / 100) * circumference;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
      <h3 className="font-extrabold text-slate-900 text-sm mb-4 relative pb-2 border-b border-slate-100 flex items-center">
        <span className="absolute bottom-[-1px] left-0 h-[2px] w-8 bg-sky-500 rounded"></span>
        Logistics Compliance Gauge
      </h3>
      <div className="flex items-center gap-6 py-2">
        <div className="relative flex items-center justify-center shrink-0">
          <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
            <circle
              stroke="#f1f5f9"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            <circle
              stroke="#0ea5e9"
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference + ' ' + circumference}
              style={{ strokeDashoffset }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-[11px] font-black text-slate-900 leading-none">{completionRate}%</span>
            <span className="text-[6px] font-black uppercase text-slate-400 mt-0.5 tracking-tighter">Done</span>
          </div>
        </div>
        <div className="space-y-1.5 min-w-0">
          <p className="text-[11px] text-slate-500 leading-snug">
            Out of <strong className="text-slate-800 font-bold">{totalCount} Active Checklists</strong>, export documents are compiled to complete standards.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping shrink-0" />
            <span className="text-[9px] font-black text-sky-700 bg-sky-50 px-2 py-0.5 rounded uppercase tracking-wider">Compliance Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [freightPresets, setFreightPresets] = useState<FreightPreset[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [freightRates, setFreightRates] = useState<FreightRateHistory[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [checklists, setChecklists] = useState<DocumentChecklist[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [editingQuoteId, setEditingQuoteId] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [reachoutSearchQuery, setReachoutSearchQuery] = useState('');
  const [reachoutCountryFilter, setReachoutCountryFilter] = useState('All');
  const [reachoutSortKey, setReachoutSortKey] = useState<'name' | 'country'>('name');
  const [reachoutVisibleCount, setReachoutVisibleCount] = useState(reachoutListPageSize);
  const [missingPhoneVisibleCount, setMissingPhoneVisibleCount] = useState(missingPhonePageSize);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [importingBuyers, setImportingBuyers] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress>(null);
  const [importDataSource, setImportDataSource] = useState<ImportDataSource>('Custom Researched Data');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Next-Generation Enterprise Upgrade States
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotMessage, setCopilotMessage] = useState('');
  const [copilotLog, setCopilotLog] = useState<{ sender: 'ai' | 'user'; text: string; action?: { label: string; tab: TabKey } }[]>([
    { sender: 'ai', text: 'Sheshaan AI Copilot ready. Ask to "add lead Nestle Switzerland Peanuts", "create quote", "analytics", or search items.' }
  ]);
  const [autoDocShipmentId, setAutoDocShipmentId] = useState<string>('');
  const [autoDocType, setAutoDocType] = useState<'invoice' | 'packing_list'>('invoice');
  const { email: authEmail } = usePortalIdentity();
  const currentRole = useMemo(() => {
    if (!authEmail) return 'Admin';
    const matchedUser = users.find((u) => u.email.toLowerCase() === authEmail.toLowerCase());
    return matchedUser?.role || 'Admin';
  }, [users, authEmail]);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
  };

  const alert = (msg: string) => {
    const isErr = msg.toLowerCase().includes('failed') ||
                  msg.toLowerCase().includes('error') ||
                  msg.toLowerCase().includes('not') ||
                  msg.toLowerCase().includes('denied') ||
                  msg.toLowerCase().includes('please') ||
                  msg.toLowerCase().includes('invalid');
    showToast(msg, isErr ? 'error' : 'success');
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme as 'light' | 'dark');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    showToast(`Theme switched to ${nextTheme} mode!`, 'info');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── FX Rate State & Fetcher ──────────────────────────────────────────
  const [fxRate, setFxRate] = useState<number>(84); // fallback: ₹84 per $1
  const [fxRateLoading, setFxRateLoading] = useState(false);
  const [fxRateFetchedAt, setFxRateFetchedAt] = useState<string>('');

  useEffect(() => {
    const FX_CACHE_KEY = 'fx_cache_usd_inr';
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    try {
      const cached = localStorage.getItem(FX_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const age = Date.now() - new Date(parsed.fetched_at).getTime();
        if (age < TWO_HOURS_MS && parsed.rate > 0) {
          setFxRate(parsed.rate);
          setFxRateFetchedAt(parsed.fetched_at);
          return;
        }
      }
    } catch {}
    // Fetch fresh rate from Frankfurter (free, no API key)
    setFxRateLoading(true);
    fetch('https://api.frankfurter.app/latest?base=USD&symbols=INR')
      .then(r => r.json())
      .then(data => {
        const rate = data?.rates?.INR;
        if (rate && rate > 0) {
          const now = new Date().toISOString();
          setFxRate(rate);
          setFxRateFetchedAt(now);
          localStorage.setItem('fx_cache_usd_inr', JSON.stringify({ rate, base: 'USD', target: 'INR', fetched_at: now }));
        }
      })
      .catch(() => { /* Keep fallback ₹84 */ })
      .finally(() => setFxRateLoading(false));
  }, []);

  // ── Enterprise Grid: Row Density & Multi-Select ──────────────────────
  const [rowDensity, setRowDensity] = useState<'compact' | 'default' | 'comfortable'>('default');
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedLeadIdsGrid, setSelectedLeadIdsGrid] = useState<string[]>([]);
  const [quoteSortCol, setQuoteSortCol] = useState<string>('created_at');
  const [quoteSortDir, setQuoteSortDir] = useState<'asc' | 'desc'>('desc');
  const [dossierQuoteId, setDossierQuoteId] = useState<string>('');
  const [dossierOpen, setDossierOpen] = useState(false);

  // ── Trigger Engine: State-Transition Rule-Based Task Auto-Creator ─────
  const prevInvoicesRef = React.useRef<typeof invoices>([]);
  const prevQuotesRef   = React.useRef<typeof quotes>([]);
  const prevShipmentsRef = React.useRef<typeof shipments>([]);
  const prevLeadsRef    = React.useRef<typeof leads>([]);
  const prevChecklistsRef = React.useRef<typeof checklists>([]);
  const triggerEngineRef = React.useRef(false);

  const autoCreateTask = React.useCallback(async (
    title: string,
    priority: 'High' | 'Medium' | 'Low',
    dueDays: number,
    links: Partial<Pick<TaskRecord, 'quote_id' | 'invoice_id' | 'shipment_id' | 'client_id' | 'lead_id'>>,
    existingTasks: TaskRecord[]
  ) => {
    // Deduplicate: skip if open task with same title+link already exists
    const linkKey = Object.entries(links).find(([, v]) => v)?.[1] || '';
    const dupe = existingTasks.some(t =>
      t.status !== 'Done' &&
      t.title === title &&
      Object.entries(links).every(([k, v]) => (t as unknown as Record<string,unknown>)[k] === v)
    );
    if (dupe) return;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);
    const newTask: Partial<TaskRecord> = {
      title,
      status: 'Open',
      priority,
      due_date: dueDate.toISOString().slice(0, 10),
      owner: 'Sana Zeba',
      notes: `[AUTO] Generated by Trigger Engine${linkKey ? ` | ref: ${linkKey}` : ''}`,
      ...links,
    };
    const { data } = await supabase.from('tasks').insert([newTask]).select();
    if (data?.[0]) setTasks(prev => [data[0] as TaskRecord, ...prev]);
  }, []);

  useEffect(() => {
    if (!triggerEngineRef.current) { triggerEngineRef.current = true; return; } // skip first mount

    const prevInv  = prevInvoicesRef.current;
    const prevQts  = prevQuotesRef.current;
    const prevShps = prevShipmentsRef.current;
    const prevLds  = prevLeadsRef.current;
    const prevChks = prevChecklistsRef.current;

    // Rule 1: Invoice → Paid → create "Book Shipment" task
    invoices.forEach(inv => {
      const prev = prevInv.find(p => p.id === inv.id);
      if (prev && prev.payment_status !== 'Paid' && inv.payment_status === 'Paid') {
        const clientName = clients.find(c => c.id === inv.client_id)?.company_name || 'Client';
        autoCreateTask(`Book Shipment for ${clientName}`, 'High', 1, { invoice_id: inv.id, client_id: inv.client_id || undefined }, tasks);
      }
      if (prev && prev.payment_status !== 'Overdue' && inv.payment_status === 'Overdue') {
        const clientName = clients.find(c => c.id === inv.client_id)?.company_name || 'Client';
        autoCreateTask(`Chase overdue payment from ${clientName}`, 'High', 0, { invoice_id: inv.id, client_id: inv.client_id || undefined }, tasks);
      }
    });

    // Rule 2: Quote status transitions
    quotes.forEach(q => {
      const prev = prevQts.find(p => p.id === q.id);
      if (prev && prev.status !== 'Approved' && q.status === 'Approved') {
        autoCreateTask(`Raise Invoice for Quote ${q.quote_number}`, 'High', 2, { quote_id: q.id, client_id: q.client_id }, tasks);
      }
      if (prev && prev.status !== 'Sent' && q.status === 'Sent') {
        autoCreateTask(`Follow up on Quote ${q.quote_number}`, 'Medium', 4, { quote_id: q.id, client_id: q.client_id }, tasks);
      }
    });

    // Rule 3: Shipment status transitions
    shipments.forEach(s => {
      const prev = prevShps.find(p => p.id === s.id);
      if (prev && prev.status !== 'Sailed' && s.status === 'Sailed') {
        const clientName = clients.find(c => c.id === s.client_id)?.company_name || 'Client';
        autoCreateTask(`Share Bill of Lading copy with ${clientName}`, 'High', 1, { shipment_id: s.id, client_id: s.client_id || undefined }, tasks);
      }
      if (prev && prev.status !== 'Arrived' && s.status === 'Arrived') {
        autoCreateTask(`Arrange customs clearance & delivery`, 'High', 0, { shipment_id: s.id, client_id: s.client_id || undefined }, tasks);
      }
    });

    // Rule 4: Lead Won → Onboard task
    leads.forEach(l => {
      const prev = prevLds.find(p => p.id === l.id);
      if (prev && prev.stage !== 'Won' && l.stage === 'Won') {
        autoCreateTask(`Onboard ${l.company_name} as active client`, 'High', 3, { lead_id: l.id, client_id: l.client_id || undefined }, tasks);
      }
    });

    // Rule 5: All 6 checklist docs complete → submit to forwarder task
    checklists.forEach(c => {
      const prev = prevChks.find(p => p.id === c.id);
      const allDone = c.commercial_invoice && c.packing_list && c.certificate_origin && c.phytosanitary && c.insurance && c.bill_of_lading;
      const prevAllDone = prev && prev.commercial_invoice && prev.packing_list && prev.certificate_origin && prev.phytosanitary && prev.insurance && prev.bill_of_lading;
      if (allDone && !prevAllDone) {
        autoCreateTask(`Submit full dossier to freight forwarder`, 'High', 1, { shipment_id: c.shipment_id || undefined }, tasks);
      }
    });

    prevInvoicesRef.current  = invoices;
    prevQuotesRef.current    = quotes;
    prevShipmentsRef.current = shipments;
    prevLeadsRef.current     = leads;
    prevChecklistsRef.current = checklists;
  }, [invoices, quotes, shipments, leads, checklists]);



  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<'All' | Quote['status']>('All');
  const [quoteCurrencyFilter, setQuoteCurrencyFilter] = useState<'All' | 'INR' | 'USD'>('All');
  const [quoteSort, setQuoteSort] = useState<QuoteSortKey>('created_desc');

  const [clientForm, setClientForm] = useState<Partial<Client>>(blankClient);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingPhoneBuyerId, setEditingPhoneBuyerId] = useState<string | null>(null);
  const [editingPhoneValue, setEditingPhoneValue] = useState('');

  const [productForm, setProductForm] = useState<Partial<Product>>(blankProduct);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [vendorForm, setVendorForm] = useState<Partial<Vendor>>(blankVendor);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);

  const [presetForm, setPresetForm] = useState<Partial<FreightPreset>>(blankPreset);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);

  const [leadForm, setLeadForm] = useState<Partial<Lead>>(blankLead);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [hasOpenedCrm, setHasOpenedCrm] = useState(false);
  const [crmVisibleCount, setCrmVisibleCount] = useState(40);
  const [selectedCrmLead, setSelectedCrmLead] = useState<CrmLead | null>(null);
  const [crmViewMode, setCrmViewMode] = useState<'table' | 'kanban'>('table');
  const [crmSearchQuery, setCrmSearchQuery] = useState('');
  const [crmQueueFilter, setCrmQueueFilter] = useState<string | null>(null);
  const [crmCountryFilter, setCrmCountryFilter] = useState('All');
  const [crmSortKey, setCrmSortKey] = useState<
    'action' | 'velocity' | 'reachout' | 'country' |
    'followup' | 'emailfix' | 'stage_new' | 'stage_contacted' |
    'stage_quoted' | 'stage_negotiation' | 'stage_won' | 'stage_lost'
  >('action');
  const [sourceSearchQuery, setSourceSearchQuery] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<'All' | ImportDataSource>('All');
  const [sourceCountryFilter, setSourceCountryFilter] = useState('All');
  const [sourceActionFilter, setSourceActionFilter] = useState('All');
  const [sourceSortKey, setSourceSortKey] = useState<'source' | 'action' | 'country' | 'followup'>('source');
  const [sourceVisibleCount, setSourceVisibleCount] = useState(sourceListPageSize);
  const [crmColumnVisibleCounts, setCrmColumnVisibleCounts] = useState<Record<string, number>>({});
  const [buyerSearchQuery, setBuyerSearchQuery] = useState('');
  const [activityForm, setActivityForm] = useState<Partial<TimelineActivity>>(blankActivity);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<Partial<TaskRecord>>(blankTask);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<Partial<MessageTemplate>>(blankTemplate);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedCrmTemplateId, setSelectedCrmTemplateId] = useState('');
  const [selectedCommunicationClientId, setSelectedCommunicationClientId] = useState('');
  const [selectedTemplateClientId, setSelectedTemplateClientId] = useState('');
  const [selectedTemplateProductId, setSelectedTemplateProductId] = useState('');
  const [buyerCountryFilter, setBuyerCountryFilter] = useState('All');
  const [buyerActionFilter, setBuyerActionFilter] = useState('All');
  const [buyerSortKey, setBuyerSortKey] = useState<BuyerSortKey>('name');
  const [buyerVisibleCount, setBuyerVisibleCount] = useState(buyerListPageSize);
  const [rateForm, setRateForm] = useState<Partial<FreightRateHistory>>(blankRate);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<Partial<InvoiceRecord>>(blankInvoice);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [shipmentForm, setShipmentForm] = useState<Partial<ShipmentRecord>>(blankShipment);
  const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null);
  const [checklistForm, setChecklistForm] = useState<Partial<DocumentChecklist>>(blankChecklist);
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<Partial<AppUser>>(blankUser);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const deferredGlobalSearch = useDeferredValue(globalSearch);
  const deferredBuyerSearchQuery = useDeferredValue(buyerSearchQuery);
  const deferredReachoutSearchQuery = useDeferredValue(reachoutSearchQuery);
  const deferredCrmSearchQuery = useDeferredValue(crmSearchQuery);
  const deferredSourceSearchQuery = useDeferredValue(sourceSearchQuery);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cacheVersionKey = 'sheshaan_portal_cache_version';
      if (window.localStorage.getItem(cacheVersionKey) !== portalDataCacheVersion) {
        window.localStorage.removeItem('crixy_portal_db');
        window.localStorage.setItem(cacheVersionKey, portalDataCacheVersion);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    setBuyerVisibleCount(buyerListPageSize);
  }, [buyerCountryFilter, buyerActionFilter, buyerSortKey, buyerSearchQuery]);

  useEffect(() => {
    setReachoutVisibleCount(reachoutListPageSize);
    setMissingPhoneVisibleCount(missingPhonePageSize);
  }, [reachoutSearchQuery, reachoutCountryFilter, reachoutSortKey]);

  useEffect(() => {
    setSourceVisibleCount(sourceListPageSize);
  }, [sourceSearchQuery, sourceTypeFilter, sourceCountryFilter, sourceActionFilter, sourceSortKey]);

  useEffect(() => {
    if (activeTab === 'crm') {
      setHasOpenedCrm(true);
    }
  }, [activeTab]);

  useEffect(() => {
    setCrmVisibleCount(40);
  }, [crmSearchQuery, crmCountryFilter, crmSortKey, crmQueueFilter]);

  useEffect(() => {
    setCrmColumnVisibleCounts({});
  }, [crmSearchQuery, crmCountryFilter, crmSortKey]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: qData },
        { data: cData },
        { data: vData },
        { data: pData },
        { data: fData },
        { data: lData },
        { data: aData },
        { data: rData },
        { data: iData },
        { data: sData },
        { data: dData },
        { data: tData },
        { data: mtData },
        { data: uData }
      ] = await Promise.all([
        supabase.from('quotes').select('*, client:clients(*), items:quote_items(*)').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('company_name'),
        supabase.from('vendors').select('*').order('company_name'),
        supabase.from('products').select('*').order('sku'),
        supabase.from('freight_presets').select('*').order('name'),
        supabase.from('leads').select('*').order('updated_at', { ascending: false }),
        supabase.from('activities').select('*').order('activity_date', { ascending: false }),
        supabase.from('freight_rate_history').select('*').order('effective_date', { ascending: false }),
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('shipments').select('*').order('updated_at', { ascending: false }),
        supabase.from('document_checklists').select('*').order('updated_at', { ascending: false }),
        supabase.from('tasks').select('*').order('due_date', { ascending: true }),
        supabase.from('message_templates').select('*').order('name'),
        supabase.from('app_users').select('*').order('name')
      ]);

      setQuotes(qData || []);
      setClients(cData || []);
      setVendors(vData || []);
      setProducts(pData || []);
      setFreightPresets(fData || []);
      const activityLeadIds = new Set((aData || []).map((act: any) => act.lead_id).filter(Boolean));
      const quotedClientIds = new Set((qData || []).map((q: any) => q.client_id).filter(Boolean));
      const alignedLeads = (lData || []).map((lead: any) => {
        const notesStr = lead.notes || '';
        const statusMatch = notesStr.match(/Email Status:\s*([^\n]+)/i);
        const emailStatus = statusMatch ? statusMatch[1].trim().toLowerCase() : '';
        const hasOutreach = activityLeadIds.has(lead.id) || 
                            emailStatus.includes('sent') || 
                            emailStatus.includes('delivered') || 
                            emailStatus.includes('opened') || 
                            emailStatus.includes('replied');
                            
        let finalStage = lead.stage;
        if (lead.stage === 'New Lead' && hasOutreach) {
          finalStage = 'Contacted';
        } else if (lead.stage === 'Quoted' && lead.client_id && !quotedClientIds.has(lead.client_id)) {
          // If in Quoted stage but has no quotes created in the portal, downgrade to Contacted
          finalStage = 'Contacted';
        }
        
        if (finalStage !== lead.stage) {
          supabase.from('leads').update({ stage: finalStage }).eq('id', lead.id);
          return { ...lead, stage: finalStage };
        }
        return lead;
      });
      setLeads(alignedLeads);
      setActivities(aData || []);
      setFreightRates(rData || []);
      setInvoices(iData || []);
      setShipments(sData || []);
      setChecklists(dData || []);
      setTasks(tData || []);
      setTemplates(mtData || []);
      setUsers(uData || []);
    } catch (err) {
      console.warn('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const quoteValue = (q: Quote) => {
    const subtotal = (q.items || []).reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0);
    return subtotal + Number(q.packaging_cost || 0) + Number(q.inland_haulage_cost || 0) + Number(q.customs_clearance_cost || 0) + Number(q.freight_cost || 0) + Number(q.insurance_cost || 0);
  };

  const filteredQuotes = useMemo(() => {
    const search = quoteSearch.trim().toLowerCase();
    const filtered = quotes.filter((q) => {
      const haystack = [
        q.quote_number,
        q.client?.company_name,
        q.client?.contact_email,
        q.client?.destination_port,
        q.loading_port,
        q.shipment_mode
      ].join(' ').toLowerCase();

      const matchesSearch = !search || haystack.includes(search);
      const matchesStatus = quoteStatusFilter === 'All' || q.status === quoteStatusFilter;
      const matchesCurrency = quoteCurrencyFilter === 'All' || q.currency === quoteCurrencyFilter;
      return matchesSearch && matchesStatus && matchesCurrency;
    });

    return filtered.sort((a, b) => {
      if (quoteSort === 'created_asc') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      if (quoteSort === 'value_desc') return quoteValue(b) - quoteValue(a);
      if (quoteSort === 'value_asc') return quoteValue(a) - quoteValue(b);
      if (quoteSort === 'buyer_asc') return (a.client?.company_name || '').localeCompare(b.client?.company_name || '');
      if (quoteSort === 'status_asc') return a.status.localeCompare(b.status);
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [quotes, quoteSearch, quoteStatusFilter, quoteCurrencyFilter, quoteSort]);

  const analytics = useMemo(() => {
    const totalQuoted = quotes.reduce((sum, quote) => sum + quoteValue(quote), 0);
    const wonValue = quotes
      .filter((quote) => quote.status === 'Approved' || quote.status === 'Closed')
      .reduce((sum, quote) => sum + quoteValue(quote), 0);
    const pendingInvoiceValue = invoices
      .filter((invoice) => invoice.payment_status !== 'Paid')
      .reduce((sum, invoice) => sum + Number(invoice.balance_amount || invoice.amount || 0), 0);
    const activeShipments = shipments.filter((shipment) => !['Delivered', 'Arrived'].includes(shipment.status)).length;
    const completedDocs = checklists.reduce((sum, item) => {
      const flags = [item.commercial_invoice, item.packing_list, item.certificate_origin, item.phytosanitary, item.insurance, item.bill_of_lading];
      return sum + flags.filter(Boolean).length;
    }, 0);
    const totalDocs = checklists.length * 6;
    const docCompletion = totalDocs ? Math.round((completedDocs / totalDocs) * 100) : 0;
    const averageFreight = freightRates.length
      ? freightRates.reduce((sum, item) => sum + Number(item.freight_cost || 0), 0) / freightRates.length
      : 0;
    const overdueTasks = tasks.filter((task) => task.status !== 'Done' && task.due_date && new Date(task.due_date).getTime() < new Date().setHours(0, 0, 0, 0)).length;
    const hotLeads = leads.filter((lead) => lead.priority === 'High' && !['Won', 'Lost'].includes(lead.stage)).length;
    const quoteFollowUps = quotes.filter((quote) => ['Sent', 'Negotiation'].includes(quote.status)).length;

    return { totalQuoted, wonValue, pendingInvoiceValue, activeShipments, docCompletion, averageFreight, overdueTasks, hotLeads, quoteFollowUps };
  }, [quotes, invoices, shipments, checklists, freightRates, tasks, leads]);

  const quoteClient = (quote: Quote) => quote.client || clients.find((client) => client.id === quote.client_id);

  const clientCountries = useMemo(() => {
    const map: Record<string, string> = {};
    clients.forEach((client) => {
      const linkedLead = leads.find((lead) => lead.client_id === client.id || lead.company_name.toLowerCase() === client.company_name.toLowerCase());
      if (linkedLead?.country) {
        map[client.id] = titleCaseCountry(linkedLead.country.trim());
        return;
      }
      const searchable = `${client.address || ''} ${client.destination_port || ''}`.toLowerCase();
      const matchedCountry = commonCountryNames.find((country) => searchable.includes(country));
      map[client.id] = matchedCountry ? titleCaseCountry(matchedCountry) : 'Uncategorized';
    });
    return map;
  }, [clients, leads]);

  const clientPhones = useMemo(() => {
    const map: Record<string, string> = {};
    clients.forEach((client) => {
      if (client.phone) {
        map[client.id] = client.phone;
        return;
      }
      const linkedLead = leads.find((lead) => lead.client_id === client.id || lead.company_name.toLowerCase() === client.company_name.toLowerCase());
      map[client.id] = linkedLead?.phone || '';
    });
    return map;
  }, [clients, leads]);

  const leadScoreValue = useMemo(() => {
    const calculateScore = (l: Lead) => {
      let score = 30; // base score
      if (l.phone && l.phone.trim().length > 0) score += 20;
      if (l.contact_email && l.contact_email.trim().length > 0) score += 20;
      if (l.country) score += 10;
      if (l.product_interest) score += 10;

      const hasQuotes = quotes.some(q => q.client_id === l.client_id || q.client?.company_name.toLowerCase() === l.company_name.toLowerCase());
      if (hasQuotes) score += 10;

      const hasInvoices = invoices.some(i => i.client_id === l.client_id && i.payment_status === 'Paid');
      if (hasInvoices) score += 10;

      return Math.min(100, Math.max(0, score));
    };

    const map: Record<string, number> = {};
    leads.forEach(l => {
      map[l.id] = calculateScore(l);
    });
    return map;
  }, [leads, quotes, invoices]);

  const leadVelocityScore = useMemo(() => {
    const calculateVelocity = (l: Lead) => {
      let score = 0;

      const key = normalizeCountryKey(l.country || '');
      const offset = countryTimezoneOffsets[key] !== undefined ? countryTimezoneOffsets[key] : 5.5;
      const utcHour = new Date().getUTCHours();
      const localHour = (utcHour + offset + 24) % 24;
      const isWorkingHours = localHour >= 9 && localHour <= 18;

      if (isWorkingHours) {
        score += 40;
      } else if (localHour >= 18 && localHour <= 22) {
        score += 20;
      }

      const val = Number(l.estimated_value) || 0;
      score += Math.min(val / 10000, 30);

      if (l.stage === 'Negotiation') {
        score += 20;
      } else if (l.stage === 'Quoted') {
        score += 15;
      } else if (l.stage === 'Contacted') {
        score += 10;
      }

      if (l.priority === 'High') {
        score += 10;
      } else if (l.priority === 'Medium') {
        score += 5;
      }

      return Math.round(score);
    };

    const map: Record<string, number> = {};
    leads.forEach(l => {
      map[l.id] = calculateVelocity(l);
    });
    return map;
  }, [leads]);

  const leadsWithOutreachActivities = useMemo(() => {
    const set = new Set();
    activities.forEach((activity) => {
      if (activity.lead_id && (
        activity.type === 'Email' || 
        activity.title.toLowerCase().includes('whatsapp') || 
        (activity.details || '').toLowerCase().includes('whatsapp')
      )) {
        set.add(activity.lead_id);
      }
    });
    return set;
  }, [activities]);

  const buyerCountry = (client: Client) => clientCountries[client.id] || 'Uncategorized';

  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todayEnd = new Date().setHours(23, 59, 59, 999);
  const leadNoteValue = (lead: Lead, label: string) => {
    const line = (lead.notes || '').split('\n').find((item) => item.toLowerCase().startsWith(`${label.toLowerCase()}:`));
    return line ? line.slice(line.indexOf(':') + 1).trim() : '';
  };
  const setLeadNoteValues = (lead: Lead, fields: Record<string, string>) => {
    const fieldLabels = Object.keys(fields).map((label) => label.toLowerCase());
    const existingLines = (lead.notes || '')
      .split('\n')
      .filter((line) => line.trim() && !fieldLabels.some((label) => line.toLowerCase().startsWith(`${label}:`)));
    const updatedLines = Object.entries(fields).map(([label, value]) => `${label}: ${value}`);
    return [...updatedLines, ...existingLines].join('\n');
  };
  const leadEmailStatus = (lead: Lead) => leadNoteValue(lead, 'Email Status') || 'Not tracked';
  const leadResponseStatus = (lead: Lead) => leadNoteValue(lead, 'Response Received') || 'No';
  const leadNextAction = (lead: Lead) => leadNoteValue(lead, 'Next Action') || 'Review lead';
  const leadDataSource = (lead: Lead): ImportDataSource | 'Uncategorized' => {
    const source = leadNoteValue(lead, 'Data Source').toLowerCase();
    if (source.includes('embassy')) return 'Embassy Data';
    if (source.includes('custom') || source.includes('research')) return 'Custom Researched Data';
    return 'Uncategorized';
  };
  const leadHasOutreach = (lead: Lead) => {
    const status = leadEmailStatus(lead).toLowerCase();
    return ['sent', 'follow', 'opened', 'replied', 'whatsapp', 'reached', 'contacted', 'done', 'yes', 'responded', 'email'].some((term) => status.includes(term)) 
      || leadsWithOutreachActivities.has(lead.id);
  };
  const leadResponded = (lead: Lead) => leadResponseStatus(lead).toLowerCase().startsWith('yes');
  const leadFollowUpDue = (lead: Lead) => Boolean(lead.next_follow_up && new Date(lead.next_follow_up).getTime() <= todayEnd && !['Won', 'Lost'].includes(lead.stage));
  const leadNextFollowUpScheduled = (lead: Lead) => Boolean(lead.next_follow_up && new Date(lead.next_follow_up).getTime() > todayEnd && !leadResponded(lead) && !['Won', 'Lost'].includes(lead.stage));
  const leadNeedsFirstReach = (lead: Lead) => !leadHasOutreach(lead) && !['Won', 'Lost'].includes(lead.stage);
  const leadMissingEmail = (lead: Lead) => !lead.contact_email || leadEmailStatus(lead).toLowerCase().includes('invalid');
  const leadNextActionRequiresFollowUp = (lead: Lead) => {
    const nextAction = leadNextAction(lead).toLowerCase();
    return (
      nextAction.includes('follow-up due') ||
      nextAction.includes('follow up due') ||
      nextAction.includes('follow-up pending') ||
      nextAction.includes('follow up pending') ||
      nextAction.includes('send follow-up') ||
      nextAction.includes('send follow up')
    );
  };
  const leadActionCategory = useCallback((lead: Lead) => {
    const nextAction = leadNextAction(lead).toLowerCase();
    if (lead.stage === 'Won' || lead.stage === 'Lost') return 'Closed';
    if (leadMissingEmail(lead) || nextAction.includes('fix') || nextAction.includes('verify email')) return 'Needs Email Fix';
    if (leadNeedsFirstReach(lead) || nextAction.includes('send first') || nextAction.includes('first email')) return 'Need Reach Out';
    if (leadResponded(lead)) return 'Responded / Qualify';
    if (leadFollowUpDue(lead) || leadNextActionRequiresFollowUp(lead)) return 'Follow-up Due';
    if (leadNextFollowUpScheduled(lead)) return 'Next Follow-up';
    if (leadHasOutreach(lead)) return 'Waiting Reply';
    return 'Review';
  }, [activities, todayEnd]);
  const dateAfterDays = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const smartLeadPayload = (payload: Partial<Lead>, editingId?: string | null) => {
    const stage = payload.stage || 'New Lead';
    const draftLead = {
      ...blankLead,
      ...payload,
      id: editingId || payload.id || 'draft-lead',
      company_name: payload.company_name || 'Buyer Company',
      stage
    } as Lead;
    const fields: Record<string, string> = {};

    if (!leadNoteValue(draftLead, 'Email Status')) {
      fields['Email Status'] = ['Contacted', 'Quoted', 'Negotiation'].includes(stage) ? 'Email Sent' : 'Not Contacted';
    }

    if (!leadNoteValue(draftLead, 'Response Received')) {
      fields['Response Received'] = 'No';
    }

    if (!leadNoteValue(draftLead, 'Next Action')) {
      fields['Next Action'] = ['Contacted', 'Quoted', 'Negotiation'].includes(stage) ? 'Waiting for buyer response' : 'Send first outreach';
    }

    const shouldScheduleFollowUp = !payload.next_follow_up && ['Contacted', 'Quoted', 'Negotiation'].includes(stage) && !leadResponded(draftLead);

    return {
      ...payload,
      notes: Object.keys(fields).length ? setLeadNoteValues(draftLead, fields) : payload.notes,
      next_follow_up: shouldScheduleFollowUp ? dateAfterDays(3) : payload.next_follow_up
    };
  };

  const resetLeadForm = () => { setEditingLeadId(null); setLeadForm(blankLead); };
  const resetActivityForm = () => { setEditingActivityId(null); setActivityForm(blankActivity); };
  const resetTaskForm = () => { setEditingTaskId(null); setTaskForm(blankTask); };
  const resetTemplateForm = () => { setEditingTemplateId(null); setTemplateForm(blankTemplate); };
  const resetRateForm = () => { setEditingRateId(null); setRateForm(blankRate); };
  const resetInvoiceForm = () => { setEditingInvoiceId(null); setInvoiceForm(blankInvoice); };
  const resetShipmentForm = () => { setEditingShipmentId(null); setShipmentForm(blankShipment); };
  const resetChecklistForm = () => { setEditingChecklistId(null); setChecklistForm(blankChecklist); };
  const resetUserForm = () => { setEditingUserId(null); setUserForm(blankUser); };

  const saveRecord = async <T extends { id: string }>(
    table: string,
    editingId: string | null,
    payload: Partial<T>,
    reset: () => void
  ) => {
    const preparedPayload = table === 'leads' ? smartLeadPayload(payload as Partial<Lead>, editingId) : payload;
    const finalPayload = { ...preparedPayload, id: editingId || preparedPayload.id || undefined };
    // Auto-populate lead_id for activities and tasks if client_id is provided but lead_id is missing
    if ((table === 'activities' || table === 'tasks') && (finalPayload as any).client_id && !(finalPayload as any).lead_id) {
      const linkedLead = leads.find(l => l.client_id === (finalPayload as any).client_id);
      if (linkedLead) {
        (finalPayload as any).lead_id = linkedLead.id;
      }
    }

    const query = editingId
      ? supabase.from(table).update(finalPayload).eq('id', editingId)
      : supabase.from(table).insert([finalPayload]).select().single();
    const { data, error } = await query as any;
    if (error) {
      alert(error.message || `Failed to save ${table}`);
      return;
    }

    // Sync CRM lead updates to registered buyer profiles, or automatically create profiles for new leads
    if (table === 'leads') {
      const isNew = !editingId;
      const payloadObj = finalPayload as any;
      const leadCompany = payloadObj.company_name;

      if (leadCompany) {
        const client = clients.find(c => c.company_name.toLowerCase() === leadCompany.toLowerCase());

        if (isNew) {
          const insertedLead = Array.isArray(data) ? data[0] : data;
          const leadId = insertedLead?.id || payloadObj.id;

          if (!client) {
            const newClientPayload = {
              company_name: payloadObj.company_name,
              contact_name: payloadObj.contact_name || '',
              contact_email: payloadObj.contact_email || '',
              destination_port: payloadObj.country || 'Not specified',
              address: payloadObj.country ? `Country: ${payloadObj.country}` : '',
              phone: payloadObj.phone || '',
              products_dealing: payloadObj.product_interest ? [payloadObj.product_interest] : []
            };

            const { data: insertedClient } = await supabase.from('clients').insert([newClientPayload]).select().single();
            const newClientId = insertedClient?.id;

            if (leadId && newClientId) {
              await supabase.from('leads').update({
                client_id: newClientId
              }).eq('id', leadId);
            }
          } else {
            if (leadId) {
              await supabase.from('leads').update({
                client_id: client.id
              }).eq('id', leadId);
            }
          }
        } else {
          if (client) {
            await supabase.from('clients').update({
              company_name: payloadObj.company_name || client.company_name,
              contact_name: payloadObj.contact_name !== undefined ? payloadObj.contact_name : client.contact_name,
              contact_email: payloadObj.contact_email !== undefined ? payloadObj.contact_email : client.contact_email,
              phone: payloadObj.phone !== undefined ? payloadObj.phone : client.phone,
              destination_port: payloadObj.country || client.destination_port
            }).eq('id', client.id);
          }
        }
      }
    }

    // Auto-set lead stage to 'Won' when a shipment is created
    if (table === 'shipments' && !editingId && (finalPayload as any).client_id) {
      const clientId = (finalPayload as any).client_id;
      const clientObj = clients.find(c => c.id === clientId);
      const lead = leads.find(l => l.client_id === clientId || (clientObj && l.company_name.toLowerCase() === clientObj.company_name.toLowerCase()));
      if (lead) {
        await supabase.from('leads').update({
          stage: 'Won'
        }).eq('id', lead.id);
      }
    }

    // Buyer Lifecycle Automation
    try {
      if (table === 'clients' && !editingId) {
        const clientRecord = Array.isArray(data) ? data[0] : data;
        if (clientRecord?.id) {
          await supabase.from('clients').update({ lifecycle_status: 'Prospect' }).eq('id', clientRecord.id);
        }
      } else if (table === 'quotes') {
        const qRecord = Array.isArray(data) ? data[0] : data || finalPayload;
        if (qRecord?.client_id) {
          await supabase.from('clients').update({ lifecycle_status: 'Qualified' }).eq('id', qRecord.client_id);
        }
      } else if (table === 'invoices') {
        const invRecord = Array.isArray(data) ? data[0] : data || finalPayload;
        if (invRecord?.client_id) {
          const status = invRecord.payment_status === 'Paid' ? 'Completed Cycle' : 'Customer';
          await supabase.from('clients').update({ lifecycle_status: status }).eq('id', invRecord.client_id);
        }
      } else if (table === 'shipments') {
        const shipRecord = Array.isArray(data) ? data[0] : data || finalPayload;
        if (shipRecord?.client_id) {
          await supabase.from('clients').update({ lifecycle_status: 'Active Sourcing' }).eq('id', shipRecord.client_id);
        }
      }
    } catch (lifecycleErr) {
      console.warn('Lifecycle transition automation failed:', lifecycleErr);
    }

    reset();
    await fetchData();
  };

  const deleteRecord = async (table: string, id: string, label: string) => {
    if (!confirm(`Delete this ${label}?`)) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      alert(error.message || `Failed to delete ${label}`);
      return;
    }
    await fetchData();
  };


  const tradeOperatingMetrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const activeQuoteStatuses: Quote['status'][] = ['Sent', 'Negotiation', 'Approved', 'Invoice Raised', 'Shipped'];

    const receivableBalance = invoices
      .filter((invoice) => invoice.payment_status !== 'Paid')
      .reduce((sum, invoice) => sum + Number(invoice.balance_amount || invoice.amount || 0), 0);
    const overdueReceivables = invoices.filter((invoice) => (
      invoice.payment_status === 'Overdue' ||
      (invoice.payment_status !== 'Paid' && invoice.due_date && new Date(invoice.due_date) < today)
    ));
    const marginRiskQuotes = quotes.filter((quote) => (
      activeQuoteStatuses.includes(quote.status) &&
      Number(quote.margin_per_kg || 0) > 0 &&
      Number(quote.margin_per_kg || 0) < 8
    ));
    const staleQuotes = quotes.filter((quote) => (
      ['Sent', 'Negotiation'].includes(quote.status) &&
      quote.created_at &&
      new Date(quote.created_at).getTime() < today.getTime() - 7 * 86400000
    ));
    const followUpDueLeads = leads.filter((lead) => leadActionCategory(lead) === 'Follow-up Due');
    const reachOutLeads = leads.filter((lead) => leadActionCategory(lead) === 'Need Reach Out');
    const activeShipments = shipments.filter((shipment) => !['Delivered', 'Arrived'].includes(shipment.status));
    const shipmentExecutionRisks = activeShipments.filter((shipment) => (
      !shipment.booking_number ||
      !shipment.container_number ||
      !shipment.bl_number ||
      (shipment.eta && new Date(shipment.eta) <= nextWeek)
    ));
    const documentRiskItems = checklists.filter((item) => {
      const shipment = shipments.find((shipment) => shipment.id === item.shipment_id || shipment.quote_id === item.quote_id);
      const activeShipment = !shipment || shipment.status !== 'Delivered';
      const ready = item.commercial_invoice && item.packing_list && item.certificate_origin && item.phytosanitary && item.insurance && item.bill_of_lading;
      return activeShipment && !ready;
    });
    const expiringFreightRates = freightRates.filter((rate) => (
      rate.validity_date &&
      new Date(rate.validity_date) >= today &&
      new Date(rate.validity_date) <= nextWeek
    ));
    const preferredVendorCoverage = vendors.filter((vendor) => vendor.status === 'Preferred').length;
    const readinessItems = [
      leads.length > 0,
      quotes.length > 0,
      invoices.length > 0,
      shipments.length > 0,
      checklists.length > 0,
      freightRates.length > 0,
      vendors.length > 0,
      preferredVendorCoverage > 0
    ];
    const readinessScore = Math.round((readinessItems.filter(Boolean).length / readinessItems.length) * 100);
    const riskLoad = (
      overdueReceivables.length * 12 +
      marginRiskQuotes.length * 8 +
      documentRiskItems.length * 7 +
      shipmentExecutionRisks.length * 6 +
      followUpDueLeads.length * 4 +
      expiringFreightRates.length * 3
    );
    const operatingHealth = Math.max(5, Math.min(100, readinessScore - riskLoad + Math.min(18, reachOutLeads.length)));
    const automationCoverage = leads.length > 0
      ? Math.round((leads.filter((lead) => Boolean(lead.sequence_enrolled) || leadHasOutreach(lead) || Boolean(lead.next_follow_up)).length / leads.length) * 100)
      : 0;

    return {
      automationCoverage,
      documentRiskItems,
      expiringFreightRates,
      followUpDueLeads,
      marginRiskQuotes,
      operatingHealth,
      overdueReceivables,
      reachOutLeads,
      readinessScore,
      receivableBalance,
      shipmentExecutionRisks,
      staleQuotes
    };
  }, [checklists, freightRates, invoices, leads, quotes, shipments, vendors]);

  const lastSyncedLabel = useMemo(() => {
    const timestamps = [
      ...clients,
      ...leads,
      ...quotes,
      ...invoices,
      ...shipments,
      ...tasks,
      ...activities
    ]
      .map((item) => {
        const stampedItem = item as { updated_at?: string; created_at?: string };
        return stampedItem.updated_at || stampedItem.created_at;
      })
      .filter(Boolean)
      .map((value) => new Date(value as string).getTime())
      .filter((value) => Number.isFinite(value));
    if (!timestamps.length) return 'Ready';
    return new Date(Math.max(...timestamps)).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [activities, clients, invoices, leads, quotes, shipments, tasks]);

  const smartPortalPulse: SmartPortalPulse = useMemo(() => ({
    healthScore: tradeOperatingMetrics.operatingHealth,
    urgentActions: tradeOperatingMetrics.overdueReceivables.length + tradeOperatingMetrics.documentRiskItems.length + tradeOperatingMetrics.followUpDueLeads.length + tradeOperatingMetrics.shipmentExecutionRisks.length,
    pipelineMomentum: leads.filter((lead) => ['Contacted', 'Quoted', 'Negotiation'].includes(lead.stage)).length,
    receivableRisk: formatQuoteCurrency(tradeOperatingMetrics.receivableBalance, 'INR'),
    automationCoverage: tradeOperatingMetrics.automationCoverage,
    activeShipments: shipments.filter((shipment) => !['Delivered', 'Arrived'].includes(shipment.status)).length
  }), [leads, shipments, tradeOperatingMetrics]);

  const smartPortalInsights: SmartPortalInsight[] = useMemo(() => {
    const insights: SmartPortalInsight[] = [];
    const firstOverdue = tradeOperatingMetrics.overdueReceivables[0];
    const firstDocRisk = tradeOperatingMetrics.documentRiskItems[0];
    const firstMarginRisk = tradeOperatingMetrics.marginRiskQuotes[0];
    const firstShipmentRisk = tradeOperatingMetrics.shipmentExecutionRisks[0];
    const firstFreightExpiry = tradeOperatingMetrics.expiringFreightRates[0];
    const firstFollowUp = tradeOperatingMetrics.followUpDueLeads[0];

    if (firstOverdue) {
      insights.push({
        id: `receivable-${firstOverdue.id}`,
        tone: 'critical',
        title: 'Collection risk needs action',
        detail: `${firstOverdue.invoice_number} is unpaid. Prioritize reminder, payment confirmation, or hold further shipment movement.`,
        evidence: `${firstOverdue.payment_status} | Due ${firstOverdue.due_date || 'not set'} | ${formatQuoteCurrency(Number(firstOverdue.balance_amount || firstOverdue.amount || 0), firstOverdue.currency || 'INR')}`,
        action: 'Open Accounts',
        target: 'accounts'
      });
    }

    if (firstDocRisk) {
      const missing = [
        !firstDocRisk.commercial_invoice && 'Commercial Invoice',
        !firstDocRisk.packing_list && 'Packing List',
        !firstDocRisk.certificate_origin && 'COO',
        !firstDocRisk.phytosanitary && 'Phytosanitary',
        !firstDocRisk.insurance && 'Insurance',
        !firstDocRisk.bill_of_lading && 'BL'
      ].filter(Boolean).join(', ');
      insights.push({
        id: `docs-${firstDocRisk.id}`,
        tone: 'critical',
        title: 'Export document packet incomplete',
        detail: `Compliance packet is missing ${missing || 'required documents'} before final dispatch control.`,
        evidence: `${tradeOperatingMetrics.documentRiskItems.length} checklist item(s) not complete`,
        action: 'Open Documents',
        target: 'documents'
      });
    }

    if (firstMarginRisk) {
      insights.push({
        id: `margin-${firstMarginRisk.id}`,
        tone: 'warning',
        title: 'Quote margin guard triggered',
        detail: `${firstMarginRisk.quote_number} has low margin per kg. Review freight, packaging, and inland haulage before approval.`,
        evidence: `Margin/kg: ${formatQuoteCurrency(Number(firstMarginRisk.margin_per_kg || 0), firstMarginRisk.currency || 'INR')}`,
        action: 'Review Quote',
        target: 'quotes'
      });
    }

    if (firstShipmentRisk) {
      insights.push({
        id: `ship-${firstShipmentRisk.id}`,
        tone: 'warning',
        title: 'Shipment execution data missing',
        detail: `${firstShipmentRisk.booking_number || firstShipmentRisk.vessel_name || 'Active shipment'} needs booking, container, BL, or ETA validation.`,
        evidence: `${tradeOperatingMetrics.shipmentExecutionRisks.length} shipment(s) need control data`,
        action: 'Open Shipments',
        target: 'shipments'
      });
    }

    if (firstFreightExpiry) {
      insights.push({
        id: `freight-${firstFreightExpiry.id}`,
        tone: 'opportunity',
        title: 'Freight rate expiring soon',
        detail: `${firstFreightExpiry.destination_port} rate from ${firstFreightExpiry.forwarder || 'forwarder'} should be refreshed before quoting.`,
        evidence: `Valid until ${firstFreightExpiry.validity_date}`,
        action: 'Open Rates',
        target: 'shipments'
      });
    }

    if (firstFollowUp) {
      insights.push({
        id: `followup-${firstFollowUp.id}`,
        tone: 'opportunity',
        title: 'Buyer follow-up due',
        detail: `${firstFollowUp.company_name} is due for follow-up. Use the saved template and update the next action after sending.`,
        evidence: `${firstFollowUp.country || 'Country not set'} | ${leadNextAction(firstFollowUp)}`,
        action: 'Open CRM',
        target: 'crm'
      });
    }

    if (!insights.length) {
      insights.push({
        id: 'healthy-trade-os',
        tone: 'healthy',
        title: 'Trade OS is in control',
        detail: 'No urgent receivable, document, shipment, or follow-up exceptions are active right now.',
        evidence: `Readiness ${tradeOperatingMetrics.readinessScore}% | Automation ${tradeOperatingMetrics.automationCoverage}%`,
        action: 'Open CRM',
        target: 'crm'
      });
    }

    return insights;
  }, [tradeOperatingMetrics]);



  const actionQueueItems = useMemo(() => {
    const list: { id: string; tone: 'critical' | 'warning' | 'opportunity' | 'healthy'; title: string; detail: string; evidence: string; action: string; target: TabKey }[] = [];

    invoices.forEach((inv) => {
      const isOverdue = inv.payment_status === 'Overdue' ||
                        (inv.payment_status !== 'Paid' && inv.due_date && new Date(inv.due_date).getTime() < new Date().setHours(0, 0, 0, 0));
      if (isOverdue) {
        const clientName = clients.find(c => c.id === inv.client_id)?.company_name || 'Client';
        list.push({
          id: `inv-${inv.id}`,
          tone: 'critical',
          title: 'Invoice Payment Overdue',
          detail: `Invoice ${inv.invoice_number} for ${clientName} is past its due date. Amount: ${formatQuoteCurrency(inv.amount || 0, inv.currency || 'INR')}.`,
          evidence: `Due: ${inv.due_date || 'Not set'} | Bal: ${formatQuoteCurrency(inv.balance_amount || inv.amount || 0, inv.currency || 'INR')}`,
          action: 'Send Reminder',
          target: 'accounts'
        });
      }
    });

    checklists.forEach((item) => {
      const missing = [];
      if (!item.commercial_invoice) missing.push('Invoice');
      if (!item.packing_list) missing.push('Packing List');
      if (!item.certificate_origin) missing.push('COO');
      if (!item.phytosanitary) missing.push('Phytosanitary');
      if (!item.insurance) missing.push('Insurance');
      if (!item.bill_of_lading) missing.push('Bill of Lading');

      if (missing.length > 0) {
        const shipment = shipments.find(s => s.id === item.shipment_id || s.quote_id === item.quote_id);
        const ref = shipment?.booking_number || item.quote_id || 'Shipment';
        list.push({
          id: `doc-${item.id}`,
          tone: 'warning',
          title: 'Missing Cargo Documents',
          detail: `Compliance checklist for ${ref} is missing required papers: ${missing.join(', ')}.`,
          evidence: `${missing.length} documents missing from checklist`,
          action: 'Upload Docs',
          target: 'documents'
        });
      }
    });

    leads.forEach((l) => {
      if (l.sequence_enrolled) {
        const emailStatus = leadEmailStatus(l).toLowerCase();
        if (l.sequence_enrolled === 'Intro Sequence') {
          if (emailStatus.includes('not sent') || emailStatus === 'new') {
            list.push({
              id: `seq-intro-1-${l.id}`,
              tone: 'critical',
              title: 'Sequence: Intro Day 1',
              detail: `Send introductory email presentation to ${l.company_name} as enrolled in Intro Sequence.`,
              evidence: `Sequence: Intro Sequence | Enrolled`,
              action: 'Send Intro',
              target: 'crm'
            });
          } else {
            list.push({
              id: `seq-intro-3-${l.id}`,
              tone: 'warning',
              title: 'Sequence: Intro Day 3 Follow-up',
              detail: `Follow up on introductory offer with ${l.company_name}. Check if catalog was reviewed.`,
              evidence: `Prior outreach sent | Score: ${leadScoreValue[l.id] || 0}`,
              action: 'Draft Follow-up',
              target: 'crm'
            });
          }
        } else if (l.sequence_enrolled === 'Warm Follow-Up') {
          list.push({
            id: `seq-warm-${l.id}`,
            tone: 'opportunity',
            title: 'Sequence: Warm Follow-up',
            detail: `Reach out to warm contact ${l.company_name} with custom quotation or revised rates.`,
            evidence: `Sequence: Warm Follow-up | Score: ${leadScoreValue[l.id] || 0}`,
            action: 'Send Message',
            target: 'crm'
          });
        }
      } else if (leadActionCategory(l) === 'Need Reach Out') {
        const score = leadScoreValue[l.id] || 0;
        list.push({
          id: `lead-${l.id}`,
          tone: 'opportunity',
          title: 'Uncontacted Lead (Outreach Opportunity)',
          detail: `New lead registered for ${l.company_name} dealing in ${l.product_interest || 'unspecified'}.`,
          evidence: `Smart Lead Score: ${score}/100`,
          action: 'Initiate Outreach',
          target: 'crm'
        });
      } else if (leadActionCategory(l) === 'Follow-up Due') {
        const score = leadScoreValue[l.id] || 0;
        list.push({
          id: `lead-followup-${l.id}`,
          tone: 'warning',
          title: 'Follow-up Due',
          detail: `Scheduled follow-up is due for ${l.company_name} dealing in ${l.product_interest || 'unspecified'}.`,
          evidence: `Next Action: ${leadNextAction(l)} | Score: ${score}/100`,
          action: 'Send Follow-up',
          target: 'crm'
        });
      }
    });

    tradeOperatingMetrics.marginRiskQuotes.forEach((quote) => {
      list.push({
        id: `margin-risk-${quote.id}`,
        tone: 'warning',
        title: 'Low Margin Quote',
        detail: `${quote.quote_number} is active with low margin. Recheck freight, packaging, inland haulage, and FX before sending or approving.`,
        evidence: `Margin/kg: ${formatQuoteCurrency(Number(quote.margin_per_kg || 0), quote.currency || 'INR')}`,
        action: 'Review Quote',
        target: 'quotes'
      });
    });

    tradeOperatingMetrics.staleQuotes.forEach((quote) => {
      list.push({
        id: `stale-quote-${quote.id}`,
        tone: 'opportunity',
        title: 'Stale Quote Follow-up',
        detail: `${quote.quote_number} has been sitting in ${quote.status}. Push a follow-up or close the opportunity.`,
        evidence: `Created: ${quote.created_at ? new Date(quote.created_at).toLocaleDateString('en-IN') : 'Unknown'}`,
        action: 'Open Quotes',
        target: 'quotes'
      });
    });

    tradeOperatingMetrics.shipmentExecutionRisks.forEach((shipment) => {
      const missing = [
        !shipment.booking_number && 'Booking',
        !shipment.container_number && 'Container',
        !shipment.bl_number && 'BL',
        shipment.eta && 'ETA watch'
      ].filter(Boolean).join(', ');
      list.push({
        id: `shipment-control-${shipment.id}`,
        tone: 'warning',
        title: 'Shipment Control Gap',
        detail: `${shipment.booking_number || shipment.vessel_name || 'Active shipment'} needs logistics validation before dispatch confidence is high.`,
        evidence: missing || `${shipment.status} | ETA ${shipment.eta || 'TBA'}`,
        action: 'Open Shipment',
        target: 'shipments'
      });
    });

    tradeOperatingMetrics.expiringFreightRates.forEach((rate) => {
      list.push({
        id: `rate-expiry-${rate.id}`,
        tone: 'opportunity',
        title: 'Freight Rate Expiring',
        detail: `${rate.destination_port} rate should be refreshed so sales quotes do not use stale logistics pricing.`,
        evidence: `${rate.forwarder || 'Forwarder not set'} | Valid until ${rate.validity_date}`,
        action: 'Open Freight',
        target: 'shipments'
      });
    });

    tasks.forEach((t) => {
      const isOverdue = t.status !== 'Done' && t.due_date && new Date(t.due_date).getTime() < new Date().setHours(0, 0, 0, 0);
      if (isOverdue) {
        list.push({
          id: `task-${t.id}`,
          tone: 'warning',
          title: 'Overdue Operational Task',
          detail: `Task "${t.title}" is pending assignment or completion.`,
          evidence: `Due: ${t.due_date} | Priority: ${t.priority}`,
          action: 'Complete Task',
          target: 'tasks'
        });
      }
    });

    const priorityMap = { critical: 0, warning: 1, opportunity: 2, healthy: 3 };
    return list.sort((a, b) => priorityMap[a.tone] - priorityMap[b.tone]);
  }, [invoices, checklists, shipments, leads, tasks, clients, leadScoreValue, tradeOperatingMetrics]);

  const buyerCountries = useMemo(() => {
    return Array.from(new Set(clients.map((client) => clientCountries[client.id] || 'Uncategorized').filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [clients, clientCountries]);
  const leadsByClientId = useMemo(() => {
    const map: Record<string, Lead> = {};
    leads.forEach((lead) => {
      if (lead.client_id && !map[lead.client_id]) map[lead.client_id] = lead;
    });
    return map;
  }, [leads]);
  const leadsByCompanyName = useMemo(() => {
    const map: Record<string, Lead> = {};
    leads.forEach((lead) => {
      const key = lead.company_name.toLowerCase();
      if (key && !map[key]) map[key] = lead;
    });
    return map;
  }, [leads]);
  const linkedLeadForBuyer = (client: Client) => leadsByClientId[client.id] || leadsByCompanyName[client.company_name.toLowerCase()];
  const buyerActionCategory = (client: Client) => {
    const linkedLead = linkedLeadForBuyer(client);
    return linkedLead ? leadActionCategory(linkedLead) : 'Need Reach Out';
  };
  const buyerActionRank = (client: Client, priority: BuyerSortKey) => {
    const category = buyerActionCategory(client);
    const rankMaps: Record<BuyerSortKey, Record<string, number>> = {
      name: {},
      phone_asc: {},
      phone_desc: {},
      followup_first: { 'Follow-up Due': 0, 'Need Reach Out': 1, 'Waiting Reply': 2, 'Responded / Qualify': 3, 'Needs Email Fix': 4, Review: 5, Closed: 6 },
      reachout_first: { 'Need Reach Out': 0, 'Follow-up Due': 1, 'Needs Email Fix': 2, 'Waiting Reply': 3, 'Responded / Qualify': 4, Review: 5, Closed: 6 },
      waiting_first: { 'Waiting Reply': 0, 'Follow-up Due': 1, 'Need Reach Out': 2, 'Responded / Qualify': 3, 'Needs Email Fix': 4, Review: 5, Closed: 6 },
      responded_first: { 'Responded / Qualify': 0, 'Follow-up Due': 1, 'Waiting Reply': 2, 'Need Reach Out': 3, 'Needs Email Fix': 4, Review: 5, Closed: 6 }
    };
    return rankMaps[priority][category] ?? 99;
  };

  const filteredBuyers = useMemo(() => {
    const countryList = buyerCountryFilter === 'All'
      ? clients
      : clients.filter((client) => (clientCountries[client.id] || 'Uncategorized') === buyerCountryFilter);
    const list = buyerActionFilter === 'All'
      ? countryList
      : countryList.filter((client) => buyerActionCategory(client) === buyerActionFilter);

    const query = deferredBuyerSearchQuery.trim().toLowerCase();
    const searchedList = query
      ? list.filter((client) => {
          return (
            client.company_name.toLowerCase().includes(query) ||
            (client.contact_name || '').toLowerCase().includes(query) ||
            (client.contact_email || '').toLowerCase().includes(query) ||
            (client.phone || '').toLowerCase().includes(query) ||
            (client.destination_port || '').toLowerCase().includes(query) ||
            (client.address || '').toLowerCase().includes(query)
          );
        })
      : list;

    if (buyerSortKey === 'phone_asc') {
      return [...searchedList].sort((a, b) => {
        const phoneA = a.phone || clientPhones[a.id] || '';
        const phoneB = b.phone || clientPhones[b.id] || '';
        if (!phoneA) return 1;
        if (!phoneB) return -1;
        return phoneA.localeCompare(phoneB);
      });
    } else if (buyerSortKey === 'phone_desc') {
      return [...searchedList].sort((a, b) => {
        const phoneA = a.phone || clientPhones[a.id] || '';
        const phoneB = b.phone || clientPhones[b.id] || '';
        if (!phoneA) return 1;
        if (!phoneB) return -1;
        return phoneB.localeCompare(phoneA);
      });
    } else if (['followup_first', 'reachout_first', 'waiting_first', 'responded_first'].includes(buyerSortKey)) {
      return [...searchedList].sort((a, b) => {
        const rankA = buyerActionRank(a, buyerSortKey);
        const rankB = buyerActionRank(b, buyerSortKey);
        if (rankA !== rankB) return rankA - rankB;
        return a.company_name.localeCompare(b.company_name);
      });
    } else {
      return [...searchedList].sort((a, b) => a.company_name.localeCompare(b.company_name));
    }
  }, [clients, clientCountries, buyerCountryFilter, buyerActionFilter, buyerSortKey, clientPhones, deferredBuyerSearchQuery, leads]);

  const reachoutBuyers = useMemo(() => {
    return clients.filter((client) => {
      const phone = client.phone || clientPhones[client.id] || '';
      return phone.trim().length > 0;
    });
  }, [clients, clientPhones]);

  const reachoutCountries = useMemo(() => {
    return Array.from(new Set(reachoutBuyers.map((buyer) => buyerCountry(buyer)).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [reachoutBuyers, clientCountries]);

  const filteredReachoutBuyers = useMemo(() => {
    const query = deferredReachoutSearchQuery.trim().toLowerCase();
    const countryFiltered = reachoutCountryFilter === 'All'
      ? reachoutBuyers
      : reachoutBuyers.filter((buyer) => buyerCountry(buyer) === reachoutCountryFilter);
    const searched = query
      ? countryFiltered.filter((buyer) => {
          const phone = buyer.phone || clientPhones[buyer.id] || '';
          return (
            buyer.company_name.toLowerCase().includes(query) ||
            (buyer.contact_name || '').toLowerCase().includes(query) ||
            (buyer.contact_email || '').toLowerCase().includes(query) ||
            buyerCountry(buyer).toLowerCase().includes(query) ||
            phone.toLowerCase().includes(query)
          );
        })
      : countryFiltered;

    return [...searched].sort((a, b) => {
      if (reachoutSortKey === 'country') {
        const countryCompare = buyerCountry(a).localeCompare(buyerCountry(b));
        if (countryCompare !== 0) return countryCompare;
      }
      return a.company_name.localeCompare(b.company_name);
    });
  }, [reachoutBuyers, deferredReachoutSearchQuery, reachoutCountryFilter, reachoutSortKey, clientPhones, clientCountries]);

  const visibleReachoutBuyers = useMemo(() => filteredReachoutBuyers.slice(0, reachoutVisibleCount), [filteredReachoutBuyers, reachoutVisibleCount]);

  const missingPhoneBuyers = useMemo(() => {
    return clients.filter((client) => {
      const phone = client.phone || clientPhones[client.id] || '';
      return !phone.trim();
    });
  }, [clients, clientPhones]);

  const visibleMissingPhoneBuyers = useMemo(() => missingPhoneBuyers.slice(0, missingPhoneVisibleCount), [missingPhoneBuyers, missingPhoneVisibleCount]);

  const whatsappActivityByClientId = useMemo(() => {
    const map: Record<string, TimelineActivity> = {};
    activities.forEach((activity) => {
      if (!activity.client_id || map[activity.client_id]) return;
      if (activity.title.toLowerCase().includes('whatsapp')) map[activity.client_id] = activity;
    });
    return map;
  }, [activities]);

  const clientMetrics = useMemo(() => {
    const map: Record<string, {
      quotesCount: number;
      receivableValue: number;
      shipmentsCount: number;
      openTasksCount: number;
      lastActivityTitle: string;
    }> = {};

    clients.forEach((client) => {
      map[client.id] = {
        quotesCount: 0,
        receivableValue: 0,
        shipmentsCount: 0,
        openTasksCount: 0,
        lastActivityTitle: 'No activity logged'
      };
    });

    quotes.forEach((quote) => {
      if (quote.client_id && map[quote.client_id]) map[quote.client_id].quotesCount += 1;
    });

    invoices.forEach((invoice) => {
      if (invoice.client_id && invoice.payment_status !== 'Paid' && map[invoice.client_id]) {
        map[invoice.client_id].receivableValue += Number(invoice.balance_amount || invoice.amount || 0);
      }
    });

    shipments.forEach((shipment) => {
      if (shipment.client_id && map[shipment.client_id]) map[shipment.client_id].shipmentsCount += 1;
    });

    tasks.forEach((task) => {
      if (task.client_id && task.status !== 'Done' && map[task.client_id]) map[task.client_id].openTasksCount += 1;
    });

    activities.forEach((activity) => {
      if (activity.client_id && map[activity.client_id] && map[activity.client_id].lastActivityTitle === 'No activity logged') {
        map[activity.client_id].lastActivityTitle = activity.title;
      }
    });

    return map;
  }, [clients, quotes, invoices, shipments, tasks, activities]);

  const buyerSummaryStats = useMemo(() => {
    const shown = filteredBuyers.length;
    const countriesCount = buyerCountries.filter((country) => country !== 'Uncategorized').length;
    const uncategorized = clients.filter((client) => clientCountries[client.id] === 'Uncategorized').length;
    const crmLinked = clients.filter((client) => leads.some((lead) => lead.client_id === client.id)).length;
    return { shown, countriesCount, uncategorized, crmLinked };
  }, [filteredBuyers, buyerCountries, clients, clientCountries, leads]);

  const visibleBuyers = useMemo(() => filteredBuyers.slice(0, buyerVisibleCount), [filteredBuyers, buyerVisibleCount]);

  const notifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 3);

    return [
      ...tasks
        .filter((task) => task.status !== 'Done' && task.due_date && new Date(task.due_date) < today)
        .map((task) => ({ id: `task-${task.id}`, title: task.title, meta: `Overdue task | ${task.due_date}`, tab: 'tasks' as TabKey, tone: 'red' })),
      ...leads
        .filter((lead) => lead.next_follow_up && new Date(lead.next_follow_up) <= soon && !['Won', 'Lost'].includes(lead.stage))
        .map((lead) => ({ id: `lead-${lead.id}`, title: `Follow up ${lead.company_name}`, meta: `${lead.stage} | ${lead.next_follow_up}`, tab: 'crm' as TabKey, tone: 'amber' })),
      ...invoices
        .filter((invoice) => invoice.payment_status !== 'Paid' && invoice.due_date && new Date(invoice.due_date) <= soon)
        .map((invoice) => ({ id: `invoice-${invoice.id}`, title: `Payment due ${invoice.invoice_number}`, meta: `${invoice.payment_status} | ${invoice.due_date}`, tab: 'accounts' as TabKey, tone: 'sky' })),
      ...shipments
        .filter((shipment) => shipment.status !== 'Delivered' && shipment.eta && new Date(shipment.eta) <= soon)
        .map((shipment) => ({ id: `shipment-${shipment.id}`, title: `Shipment ETA ${shipment.booking_number || shipment.vessel_name || 'pending'}`, meta: `${shipment.status} | ${shipment.eta}`, tab: 'shipments' as TabKey, tone: 'teal' }))
    ];
  }, [tasks, leads, invoices, shipments]);

  const globalResults = useMemo<{ key: string; label: string; meta: string; tab: TabKey; buyerId?: string }[]>(() => {
    const search = deferredGlobalSearch.trim().toLowerCase();
    if (!search) return [];

    return [
      ...clients.map((item) => ({ key: `buyer-${item.id}`, label: item.company_name, meta: `${buyerCountry(item)} | ${item.contact_email || item.destination_port || 'Buyer'}`, tab: 'crm' as TabKey, buyerId: item.id })),
      ...leads.map((item) => ({ key: `lead-${item.id}`, label: item.company_name, meta: `${item.country || 'Country not set'} | ${item.stage} | ${item.product_interest || 'Lead'}`, tab: 'crm' as TabKey })),
      ...quotes.map((item) => ({ key: `quote-${item.id}`, label: item.quote_number, meta: `${quoteClient(item)?.company_name || 'Unassigned'} | ${item.status}`, tab: 'quotes' as TabKey })),
      ...invoices.map((item) => ({ key: `invoice-${item.id}`, label: item.invoice_number, meta: `${item.payment_status} | ${formatQuoteCurrency(Number(item.balance_amount || item.amount || 0), item.currency || 'INR')}`, tab: 'accounts' as TabKey })),
      ...shipments.map((item) => ({ key: `shipment-${item.id}`, label: item.booking_number || item.vessel_name || 'Shipment', meta: `${item.status} | ETA ${item.eta || 'TBA'}`, tab: 'shipments' as TabKey })),
      ...vendors.map((item) => ({ key: `vendor-${item.id}`, label: item.company_name, meta: `${item.status} | ${item.product_categories || 'Vendor'}`, tab: 'vendors' as TabKey }))
    ].filter((item) => `${item.label} ${item.meta}`.toLowerCase().includes(search)).slice(0, 8);
  }, [deferredGlobalSearch, clients, leads, quotes, invoices, shipments, vendors]);

  const communicationClient = clients.find((client) => client.id === selectedCommunicationClientId) || clients[0];
  const communicationQuote = quotes.find((quote) => quote.client_id === communicationClient?.id) || quotes[0];
  const communicationShipment = shipments.find((shipment) => shipment.client_id === communicationClient?.id || shipment.quote_id === communicationQuote?.id);
  const templatePreviewClient = clients.find((client) => client.id === selectedTemplateClientId) || communicationClient;
  const templatePreviewProduct = products.find((product) => product.id === selectedTemplateProductId);
  const productCatalogue = products.map((product) => product.sku).filter(Boolean).slice(0, 6).join(', ') || 'spices, agro commodities, and export-ready food products';
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || templates[0];
  const selectedCrmTemplate = templates.find((template) => template.id === selectedCrmTemplateId);
  const resolveCrmEmailTemplate = (mode: 'First Reach' | 'Follow-up') => {
    const targetCategory = mode === 'First Reach' ? 'Introduction' : 'Quote Follow-up';
    const explicitTemplate = selectedCrmTemplate?.channel === 'Email' && selectedCrmTemplate.category === targetCategory
      ? selectedCrmTemplate
      : null;

    return explicitTemplate ||
      templates.find((item) => item.channel === 'Email' && item.category === targetCategory && item.active !== false) ||
      templates.find((item) => item.category === targetCategory && item.active !== false);
  };

  const replaceTemplateVars = (text = '', options: { client?: Client; product?: Product | null } = {}) => {
    const buyer = options.client || communicationClient;
    const quote = quotes.find((item) => item.client_id === buyer?.id) || communicationQuote;
    const selectedProduct = options.product === undefined ? templatePreviewProduct : options.product;
    const productName = selectedProduct?.sku || quote?.items?.[0]?.sku || 'our complete export product range';
    const productDescription = selectedProduct?.description?.split('\n')[0] || 'quality export-ready spices, agro commodities, and customized sourcing support';
    return text
      .replaceAll('{{buyer_name}}', buyer?.contact_name || buyer?.company_name || 'Buyer')
      .replaceAll('{{company_name}}', buyer?.company_name || 'Buyer Company')
      .replaceAll('{{client_name}}', buyer?.contact_name || buyer?.company_name || 'Buyer')
      .replaceAll('{{quote_number}}', quote?.quote_number || 'SG-CIF-XXXX-0000')
      .replaceAll('{{product_name}}', productName)
      .replaceAll('{{product_description}}', productDescription)
      .replaceAll('{{product_catalogue}}', productCatalogue)
      .replaceAll('{{total_value}}', quote ? formatQuoteCurrency(quoteValue(quote), quote.currency || 'INR') : 'quoted value')
      .replaceAll('{{destination_port}}', buyer?.destination_port || quote?.client?.destination_port || 'destination port')
      .replaceAll('{{shipment_status}}', communicationShipment?.status || 'Planning')
      .replaceAll('{{etd}}', communicationShipment?.etd || 'TBA')
      .replaceAll('{{eta}}', communicationShipment?.eta || 'TBA');
  };

  const replaceLeadTemplateVars = (text = '', lead: Lead) => {
    const client = clients.find((item) => item.id === lead.client_id);
    const quote = quotes.find((item) => item.client_id === client?.id);
    const shipment = shipments.find((item) => item.client_id === client?.id || item.quote_id === quote?.id);
    return text
      .replaceAll('{{buyer_name}}', lead.contact_name || client?.contact_name || lead.company_name)
      .replaceAll('{{company_name}}', lead.company_name || client?.company_name || 'Buyer Company')
      .replaceAll('{{quote_number}}', quote?.quote_number || 'your quotation')
      .replaceAll('{{product_name}}', lead.product_interest || quote?.items?.[0]?.sku || 'our export product')
      .replaceAll('{{total_value}}', quote ? formatQuoteCurrency(quoteValue(quote), quote.currency || 'INR') : formatQuoteCurrency(Number(lead.estimated_value || 0), 'INR'))
      .replaceAll('{{destination_port}}', client?.destination_port || lead.country || 'your destination port')
      .replaceAll('{{shipment_status}}', shipment?.status || 'Planning')
      .replaceAll('{{etd}}', shipment?.etd || 'TBA')
      .replaceAll('{{eta}}', shipment?.eta || 'TBA');
  };

  const handleLeadEmail = useCallback(async (lead: Lead, mode: 'First Reach' | 'Follow-up') => {
    if (!lead.contact_email) {
      alert('Please add a lead email address before sending.');
      return;
    }

    const template = resolveCrmEmailTemplate(mode);
    const defaultSubject = mode === 'First Reach'
      ? 'Export sourcing support from Sheshaan Global'
      : 'Following up with {{company_name}}';
    const defaultBody = mode === 'First Reach'
      ? 'Hi {{buyer_name}},\n\nI am reaching out from Sheshaan Global, India.\n\nWe support international buyers with export-ready products including {{product_catalogue}}. If you have a specific product requirement, we can share specifications, packing options, CIF/FOB pricing, and shipment timelines for {{destination_port}}.\n\nRegards,\nSheshaan Global'
      : 'Hi {{buyer_name}},\n\nJust following up on our previous discussion regarding {{product_name}}.\n\nIf this product is still relevant, we can share an updated quotation. If your requirement has changed, we can also propose options from our wider range: {{product_catalogue}}.\n\nRegards,\nSheshaan Global';
    const subject = replaceLeadTemplateVars(template?.subject || defaultSubject, lead);
    const body = replaceLeadTemplateVars(template?.body || defaultBody, lead);
    const today = new Date().toISOString().slice(0, 10);
    const nextFollowUpDate = new Date();
    nextFollowUpDate.setDate(nextFollowUpDate.getDate() + (mode === 'First Reach' ? 3 : 4));
    const nextFollowUp = nextFollowUpDate.toISOString().slice(0, 10);
    const fields: Record<string, string> =
      mode === 'First Reach'
        ? {
            'Email Status': 'Email Sent',
            'First Email Sent On': leadNoteValue(lead, 'First Email Sent On') || today,
            'Last Email Sent On': today,
            'Next Action': 'Waiting for buyer response'
          }
        : {
            'Email Status': 'Follow-up Sent',
            'Last Email Sent On': today,
            'Next Action': 'Waiting for buyer response'
          };

    // 1. Launch email client instantly (non-blocking)
    const mailtoUrl = `mailto:${encodeURIComponent(lead.contact_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = mailtoUrl;
    document.body.appendChild(iframe);
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 300);

    // 2. Perform database actions in the background concurrently
    (async () => {
      const { error: leadUpdateError } = await supabase.from('leads').update({
        notes: setLeadNoteValues(lead, fields),
        stage: ['Won', 'Lost'].includes(lead.stage) ? lead.stage : 'Contacted',
        next_follow_up: nextFollowUp
      }).eq('id', lead.id);

      if (leadUpdateError) {
        console.error('Could not update lead outreach status:', leadUpdateError.message);
        return;
      }

      saveRecord<TimelineActivity>('activities', null, {
        client_id: lead.client_id,
        lead_id: lead.id,
        type: 'Email',
        title: `${mode} email prepared for ${lead.company_name}`,
        details: `Template: ${template?.name || 'Default message'}\nTo: ${lead.contact_email}`,
        activity_date: today,
        owner: lead.owner || 'Sana Zeba'
      }, resetActivityForm);
    })();
  }, [resolveCrmEmailTemplate, replaceLeadTemplateVars, saveRecord, fetchData]);

  const handleLeadWhatsApp = useCallback(async (lead: Lead) => {
    if (!lead.phone) {
      alert('Please add a phone number before opening WhatsApp.');
      return;
    }

    const template = templates.find((item) => item.channel === 'WhatsApp') || selectedCrmTemplate;
    const body = replaceLeadTemplateVars(template?.body || 'Hi {{buyer_name}}, this is Sheshaan Global following up regarding {{product_name}}.', lead);
    const cleanPhone = lead.phone.replace(/[^\d]/g, '');
    const today = new Date().toISOString().slice(0, 10);
    const nextFollowUpDate = new Date();
    nextFollowUpDate.setDate(nextFollowUpDate.getDate() + 3);

    // 1. Launch WhatsApp instantly (non-blocking)
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');

    // 2. Perform database actions in the background concurrently
    (async () => {
      const { error: leadUpdateError } = await supabase.from('leads').update({
        notes: setLeadNoteValues(lead, {
          'Email Status': 'WhatsApp Sent',
          'Last Email Sent On': today,
          'Next Action': 'Waiting for buyer response'
        }),
        stage: ['Won', 'Lost'].includes(lead.stage) ? lead.stage : 'Contacted',
        next_follow_up: nextFollowUpDate.toISOString().slice(0, 10)
      }).eq('id', lead.id);

      if (leadUpdateError) {
        console.error('Could not update WhatsApp outreach status:', leadUpdateError.message);
        return;
      }

      saveRecord<TimelineActivity>('activities', null, {
        client_id: lead.client_id,
        lead_id: lead.id,
        type: 'Note',
        title: `WhatsApp message opened for ${lead.company_name}`,
        details: `Template: ${template?.name || 'Default WhatsApp message'}\nPhone: ${lead.phone}`,
        activity_date: today,
        owner: lead.owner || 'Sana Zeba'
      }, resetActivityForm);
    })();
  }, [templates, selectedCrmTemplate, replaceLeadTemplateVars, saveRecord, fetchData]);

  const handleBuyerWhatsAppReachout = async (client: Client, phone: string) => {
    if (!phone) {
      alert('Please add a phone number before opening WhatsApp.');
      return;
    }

    const template = templates.find((item) => item.channel === 'WhatsApp' && item.category === 'Introduction')
      || templates.find((item) => item.channel === 'WhatsApp')
      || { name: 'Default Intro', body: 'Hello {{buyer_name}}, this is Sheshaan Global from India. We can support {{company_name}} with export-ready products. Please let us know your requirement and destination port.' };

    const linkedLead = leads.find((l) => l.client_id === client.id || l.company_name.toLowerCase() === client.company_name.toLowerCase());
    const leadObj: Lead = linkedLead || {
      id: '',
      company_name: client.company_name,
      contact_name: client.contact_name,
      contact_email: client.contact_email,
      phone: phone,
      stage: 'Contacted',
      client_id: client.id
    };

    const body = replaceLeadTemplateVars(template.body || '', leadObj);
    const cleanPhone = phone.replace(/[^\d]/g, '');
    const today = new Date().toISOString().slice(0, 10);

    if (linkedLead?.id) {
      const nextFollowUpDate = new Date();
      nextFollowUpDate.setDate(nextFollowUpDate.getDate() + 3);
      await supabase.from('leads').update({
        notes: setLeadNoteValues(linkedLead, {
          'Email Status': 'WhatsApp Intro Sent',
          'Last Email Sent On': today,
          'Next Action': 'Waiting for buyer response'
        }),
        stage: ['Won', 'Lost'].includes(linkedLead.stage) ? linkedLead.stage : 'Contacted',
        next_follow_up: nextFollowUpDate.toISOString().slice(0, 10)
      }).eq('id', linkedLead.id);
    }

    await saveRecord<TimelineActivity>('activities', null, {
      client_id: client.id,
      lead_id: linkedLead?.id || undefined,
      type: 'Note',
      title: `WhatsApp Intro opened for ${client.company_name}`,
      details: `Template: ${template.name || 'WhatsApp Introduction'}\nPhone: ${phone}`,
      activity_date: today,
      owner: 'Sana Zeba'
    }, resetActivityForm);

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');
  };

  const handleBuyerEmail = async (client: Client, mode: 'First Reach' | 'Follow-up') => {
    const email = client.contact_email?.trim();
    if (!email) {
      alert('Please add a buyer email address before sending.');
      return;
    }

    const linkedLead = leads.find((lead) => lead.client_id === client.id || lead.company_name.toLowerCase() === client.company_name.toLowerCase());
    if (linkedLead) {
      await handleLeadEmail({ ...linkedLead, contact_email: linkedLead.contact_email || email }, mode);
      return;
    }

    const leadPayload: Partial<Lead> = {
      client_id: client.id,
      company_name: client.company_name,
      contact_name: client.contact_name,
      contact_email: email,
      phone: client.phone || clientPhones[client.id] || '',
      country: buyerCountry(client),
      product_interest: client.products_dealing?.join(', ') || 'General export product range',
      estimated_value: 0,
      stage: 'New Lead',
      priority: 'Medium',
      owner: 'Sana Zeba',
      notes: ''
    };

    const { data, error } = await supabase.from('leads').insert([leadPayload]).select().single();
    if (error || !data) {
      alert(error?.message || 'Could not create the CRM lead before sending email.');
      return;
    }

    setLeads((current) => [data as Lead, ...current]);
    await handleLeadEmail(data as Lead, mode);
  };

  const runFollowUpAutomation = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const automatedTasks: Partial<TaskRecord>[] = [
      ...leads
        .filter((lead) => lead.next_follow_up && lead.next_follow_up <= today && !['Won', 'Lost'].includes(lead.stage))
        .map((lead) => ({
          title: `Follow up with ${lead.company_name}`,
          status: 'Open' as const,
          priority: lead.priority || 'Medium',
          due_date: today,
          owner: lead.owner || 'Sana Zeba',
          client_id: lead.client_id,
          lead_id: lead.id,
          notes: `Auto-created from CRM follow-up date. Stage: ${lead.stage}`
        })),
      ...quotes
        .filter((quote) => ['Sent', 'Negotiation'].includes(quote.status))
        .map((quote) => ({
          title: `Quote follow-up: ${quote.quote_number}`,
          status: 'Open' as const,
          priority: 'High' as const,
          due_date: today,
          owner: 'Sana Zeba',
          client_id: quote.client_id,
          quote_id: quote.id,
          notes: 'Auto-created because quote is awaiting buyer response.'
        })),
      ...invoices
        .filter((invoice) => invoice.payment_status !== 'Paid')
        .map((invoice) => ({
          title: `Payment follow-up: ${invoice.invoice_number}`,
          status: 'Open' as const,
          priority: invoice.payment_status === 'Overdue' ? 'High' as const : 'Medium' as const,
          due_date: invoice.due_date || today,
          owner: 'Sana Zeba',
          client_id: invoice.client_id,
          invoice_id: invoice.id,
          notes: `Auto-created from ${invoice.payment_status} invoice.`
        })),
      ...shipments
        .filter((shipment) => ['Planning', 'Booked', 'Stuffed', 'Sailed'].includes(shipment.status))
        .map((shipment) => ({
          title: `Shipment update: ${shipment.booking_number || shipment.vessel_name || shipment.id}`,
          status: 'Open' as const,
          priority: 'Medium' as const,
          due_date: shipment.eta || today,
          owner: 'Operations',
          client_id: shipment.client_id,
          shipment_id: shipment.id,
          notes: `Auto-created from active shipment status: ${shipment.status}.`
        }))
    ].filter((candidate) => !tasks.some((task) => task.title === candidate.title && task.status !== 'Done'));

    if (!automatedTasks.length) {
      alert('No new follow-up tasks needed right now.');
      return;
    }

    const { error } = await supabase.from('tasks').insert(automatedTasks);
    if (error) {
      alert(error.message || 'Failed to create automated follow-up tasks.');
      return;
    }
    await fetchData();
    alert(`${automatedTasks.length} follow-up task${automatedTasks.length === 1 ? '' : 's'} created.`);
  };

  const editTemplateFromCrm = () => {
    if (selectedCrmTemplate) {
      setEditingTemplateId(selectedCrmTemplate.id);
      setTemplateForm(selectedCrmTemplate);
    } else {
      setEditingTemplateId(null);
      setTemplateForm(blankTemplate);
    }
    setActiveTab('templates');
  };

  const applyTemplateStarter = (type: 'product_pitch' | 'catalogue_pitch' | 'follow_up' | 'whatsapp_intro') => {
    const starters: Record<typeof type, Partial<MessageTemplate>> = {
      product_pitch: {
        name: 'Personalized Product Pitch',
        channel: 'Email',
        category: 'Introduction',
        subject: 'Export supply proposal for {{product_name}}',
        body: 'Hi {{buyer_name}},\n\nI hope you are doing well. I am reaching out from Sheshaan Global regarding {{product_name}}.\n\nWe can support your requirement with {{product_description}}, export documentation, CIF/FOB pricing, and reliable shipment coordination to {{destination_port}}.\n\nIf you are currently sourcing this product, I would be happy to share specifications, packing options, pricing, and shipment timelines.\n\nRegards,\nSheshaan Global'
      },
      catalogue_pitch: {
        name: 'General Buyer Introduction',
        channel: 'Email',
        category: 'Introduction',
        subject: 'Export sourcing support from Sheshaan Global',
        body: 'Hi {{buyer_name}},\n\nI hope you are doing well. I am reaching out from Sheshaan Global, India.\n\nWe support international buyers with export-ready products including {{product_catalogue}}. If you do not have a specific product requirement right now, we can still share our product range, current availability, packing options, and CIF/FOB quotations based on your destination port.\n\nPlease let us know the products or categories you are exploring, and we will prepare a suitable offer for {{company_name}}.\n\nRegards,\nSheshaan Global'
      },
      follow_up: {
        name: 'Warm Follow-up',
        channel: 'Email',
        category: 'Quote Follow-up',
        subject: 'Following up with {{company_name}}',
        body: 'Hi {{buyer_name}},\n\nJust following up on our previous discussion regarding {{product_name}}.\n\nIf this product is still relevant, we can share an updated quotation. If your requirement has changed, we can also propose options from our wider range: {{product_catalogue}}.\n\nWould you like us to prepare a fresh offer for {{destination_port}}?\n\nRegards,\nSheshaan Global'
      },
      whatsapp_intro: {
        name: 'WhatsApp Buyer Intro',
        channel: 'WhatsApp',
        category: 'Introduction',
        subject: '',
        body: 'Hello {{buyer_name}}, this is Sheshaan Global from India. We can support {{company_name}} with {{product_name}} or our wider export range: {{product_catalogue}}. Please let us know your requirement and destination port.'
      }
    };

    setTemplateForm({ ...blankTemplate, ...starters[type], active: true });
    setEditingTemplateId(null);
  };

  const createInvoiceFromQuote = async (quote: Quote) => {
    const exists = invoices.some((invoice) => invoice.quote_id === quote.id);
    if (exists && !confirm('An invoice already exists for this quote. Create another one?')) return;
    const amount = quoteValue(quote);
    const year = new Date().getFullYear();
    await saveRecord<InvoiceRecord>('invoices', null, {
      quote_id: quote.id,
      client_id: quote.client_id,
      invoice_number: `PI-SG-${year}-${String(invoices.length + 1).padStart(4, '0')}`,
      invoice_type: 'Proforma',
      amount,
      currency: quote.currency || 'INR',
      payment_status: 'Pending',
      advance_amount: amount / 2,
      balance_amount: amount / 2,
      due_date: new Date().toISOString().slice(0, 10),
      notes: `Auto-created from ${quote.quote_number}`
    }, resetInvoiceForm);
  };

  const createShipmentFromQuote = async (quote: Quote) => {
    const existingInvoice = invoices.find((invoice) => invoice.quote_id === quote.id);
    await saveRecord<ShipmentRecord>('shipments', null, {
      quote_id: quote.id,
      invoice_id: existingInvoice?.id,
      client_id: quote.client_id,
      booking_number: `BK-SG-${String(shipments.length + 1).padStart(4, '0')}`,
      vessel_name: 'To be nominated',
      status: 'Planning',
      notes: `Auto-created operations record from ${quote.quote_number}`
    }, resetShipmentForm);
  };

  function formatQuoteCurrency(amount: number, currency: 'USD' | 'INR') {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency
    }).format(amount);
  }

  const resetClientForm = () => {
    setEditingClientId(null);
    setClientForm(blankClient);
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setProductForm(blankProduct);
  };

  const resetVendorForm = () => {
    setEditingVendorId(null);
    setVendorForm(blankVendor);
  };

  const resetPresetForm = () => {
    setEditingPresetId(null);
    setPresetForm(blankPreset);
  };



  const handleSeedMock = async () => {
    const dbWithHelpers = mockDB || (supabase as any);
    if ((!isMock && !isFirebase) || !dbWithHelpers?.seedMockData) return;
    try {
      setLoading(true);
      await dbWithHelpers.seedMockData();
      await fetchData();
      alert('Demo database seeded with clients, products, quote, and freight preset.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearMock = async () => {
    const dbWithHelpers = mockDB || (supabase as any);
    if ((!isMock && !isFirebase) || !dbWithHelpers?.clearAllData || !confirm('Are you sure you want to clear the entire local database?')) return;
    try {
      setLoading(true);
      await dbWithHelpers.clearAllData();
      await fetchData();
      resetClientForm();
      resetProductForm();
      resetPresetForm();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuote = async (id: string) => {
    if (!confirm('Delete this quote and all line items?')) return;
    const { error } = await supabase.from('quotes').delete().eq('id', id);
    if (error) {
      alert(error.message || 'Failed to delete quote');
      return;
    }
    setQuotes((current) => current.filter((q) => q.id !== id));
  };

  const saveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.company_name || !clientForm.destination_port) {
      alert('Please fill out Company Name and Destination Port.');
      return;
    }

    const payload = {
      id: editingClientId || undefined,
      company_name: clientForm.company_name,
      address: clientForm.address || '',
      contact_name: clientForm.contact_name || '',
      contact_email: clientForm.contact_email || '',
      destination_port: clientForm.destination_port,
      phone: clientForm.phone || '',
      products_dealing: clientForm.products_dealing || []
    };

    const query = editingClientId ? supabase.from('clients').update(payload).eq('id', editingClientId) : supabase.from('clients').insert([payload]).select().single();
    const { data, error } = await query as any;
    if (error) {
      alert(error.message || 'Failed to save client');
      return;
    }

    if (editingClientId) await fetchData();
    else setClients((current) => [...current, data]);

    // Sync phone and details with linked lead or insert new lead
    const targetClientId = editingClientId || data?.id;
    if (targetClientId) {
      const linkedLead = leads.find((l) => l.client_id === targetClientId || l.company_name.toLowerCase() === payload.company_name.toLowerCase());
      if (linkedLead) {
        await supabase.from('leads').update({
          ...linkedLead,
          company_name: payload.company_name,
          contact_name: payload.contact_name,
          contact_email: payload.contact_email,
          phone: payload.phone,
          country: payload.destination_port
        }).eq('id', linkedLead.id);
      } else {
        await supabase.from('leads').insert([{
          id: `import-lead-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          company_name: payload.company_name,
          contact_name: payload.contact_name,
          contact_email: payload.contact_email,
          phone: payload.phone,
          country: payload.destination_port,
          product_interest: payload.products_dealing && payload.products_dealing.length > 0
            ? payload.products_dealing.join(', ')
            : 'General export product range',
          estimated_value: 0,
          stage: 'New Lead',
          priority: 'Medium',
          owner: 'Sana Zeba',
          notes: `Auto-created from registered buyer profile.`,
          client_id: targetClientId
        }]);
      }
    }

    await fetchData();
    resetClientForm();
  };

  const deleteClient = async (id: string) => {
    if (!confirm('Delete this buyer? Existing quotes will keep their saved buyer snapshot where available.')) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
      alert(error.message || 'Failed to delete client');
      return;
    }
    await supabase.from('leads').delete().eq('client_id', id);
    setClients((current) => current.filter((c) => c.id !== id));
    await fetchData();
  };

  const handleSavePhone = async (clientId: string, newPhone: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    const payload = {
      company_name: client.company_name,
      address: client.address || '',
      contact_name: client.contact_name || '',
      contact_email: client.contact_email || '',
      destination_port: client.destination_port,
      phone: newPhone,
      products_dealing: client.products_dealing || []
    };

    const { error } = await supabase.from('clients').update(payload).eq('id', clientId);
    if (error) {
      alert(error.message || 'Failed to update phone number');
      return;
    }

    // Sync phone with linked lead
    const linkedLead = leads.find((l) => l.client_id === clientId || l.company_name.toLowerCase() === client.company_name.toLowerCase());
    if (linkedLead && linkedLead.phone !== newPhone) {
      await supabase.from('leads').update({
        ...linkedLead,
        phone: newPhone
      }).eq('id', linkedLead.id);
    }

    await fetchData();
    setEditingPhoneBuyerId(null);
  };

  const handleDeleteBuyerPhone = async (client: Client, phone: string) => {
    if (!confirm(`Remove invalid phone number ${phone} from ${client.company_name}?`)) return;

    const { error } = await supabase.from('clients').update({
      company_name: client.company_name,
      address: client.address || '',
      contact_name: client.contact_name || '',
      contact_email: client.contact_email || '',
      destination_port: client.destination_port,
      phone: '',
      products_dealing: client.products_dealing || []
    }).eq('id', client.id);

    if (error) {
      alert(error.message || 'Failed to remove phone number.');
      return;
    }

    const linkedLead = leads.find((lead) => lead.client_id === client.id || lead.company_name.toLowerCase() === client.company_name.toLowerCase());
    if (linkedLead?.phone) {
      await supabase.from('leads').update({
        ...linkedLead,
        phone: ''
      }).eq('id', linkedLead.id);
    }

    if (editingPhoneBuyerId === client.id) {
      setEditingPhoneBuyerId(null);
      setEditingPhoneValue('');
    }

    await fetchData();
  };

  const normalizeImportDate = (value: unknown) => {
    if (!value) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    const raw = String(value).trim();
    if (!raw || raw === '-') return '';
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? raw.slice(0, 10) : parsed.toISOString().slice(0, 10);
  };

  const normalizeDuplicateValue = (value: unknown) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const normalizePhoneValue = (value: unknown) => String(value || '').replace(/\D/g, '');

  const mapImportStage = (stage: string, response: string): Lead['stage'] => {
    const normalizedStage = stage.toLowerCase();
    const normalized = `${stage} ${response}`.toLowerCase();
    if (normalized.includes('won') || normalized.includes('response received yes')) return 'Won';
    if (normalized.includes('lost')) return 'Lost';
    if (normalized.includes('negotiation')) return 'Negotiation';
    
    // Only map to 'Quoted' if the stage explicitly mentions sent/delivered/quoted
    if (normalizedStage.includes('quote sent') || normalizedStage.includes('quoted') || normalizedStage.includes('quote delivered')) {
      return 'Quoted';
    }
    
    if (normalized.includes('follow') || normalized.includes('contact') || normalized.includes('sent') || normalized.includes('reply') || normalized.includes('response') || normalized.includes('quote')) {
      return 'Contacted';
    }
    
    return 'New Lead';
  };

  const handleBuyerWorkbookImport = async (file: File | null) => {
    if (!file) return;
    setImportingBuyers(true);
    setImportSummary(null);
    setImportProgress({ label: 'Reading file', processed: 0, total: 100 });

    try {
      const parsedRows = file.name.toLowerCase().endsWith('.csv')
        ? (await file.text()).split(/\r?\n/).filter(Boolean).map((line) => line.split(',').map((cell) => cell.replace(/^"|"$/g, '').replace(/""/g, '"')))
        : await readXlsxFile(file) as unknown as unknown[][];
      const firstParsedRow = parsedRows[0] as unknown;
      const rawRows = Array.isArray(parsedRows) && parsedRows.length === 1 && firstParsedRow && typeof firstParsedRow === 'object' && 'data' in firstParsedRow
        ? (((firstParsedRow as unknown) as { data?: unknown[][] }).data || [])
        : parsedRows;
      const headers = (rawRows[0] || []).map((header: unknown) => String(header || '').trim());
      const rows = rawRows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));

      if (!headers.includes('Company Name')) {
        throw new Error(`Missing required column "Company Name". Found: ${headers.slice(0, 8).join(', ') || 'no headers'}`);
      }

      setImportProgress({ label: 'Checking duplicates', processed: 0, total: rows.length || 1 });

      const clientPayloads: Partial<Client>[] = [];
      const leadPayloads: Partial<Lead>[] = [];
      const activityPayloads: Partial<TimelineActivity>[] = [];
      const taskPayloads: Partial<TaskRecord>[] = [];
      const seen = new Set<string>();
      const existingKeys = new Set<string>();
      const importBatchId = Date.now().toString(36);
      let skipped = 0;
      const skippedCompanies: string[] = [];

      clients.forEach((client) => {
        const companyKey = normalizeDuplicateValue(client.company_name);
        const emailKey = normalizeDuplicateValue(client.contact_email);
        const phoneKey = normalizePhoneValue(client.phone);
        if (companyKey) existingKeys.add(`company:${companyKey}`);
        if (emailKey) existingKeys.add(`email:${emailKey}`);
        if (phoneKey) existingKeys.add(`phone:${phoneKey}`);
      });

      leads.forEach((lead) => {
        const companyKey = normalizeDuplicateValue(lead.company_name);
        const emailKey = normalizeDuplicateValue(lead.contact_email);
        const phoneKey = normalizePhoneValue(lead.phone);
        if (companyKey) existingKeys.add(`company:${companyKey}`);
        if (emailKey) existingKeys.add(`email:${emailKey}`);
        if (phoneKey) existingKeys.add(`phone:${phoneKey}`);
      });

      rows.forEach((row, index) => {
        const company = String(row['Company Name'] || '').trim();
        const email = String(row.Email || '').trim();
        const phone = String(row.Phone || '').trim();
        const companyKey = normalizeDuplicateValue(company);
        const emailKey = normalizeDuplicateValue(email);
        const phoneKey = normalizePhoneValue(phone);
        const rowKeys = [
          companyKey && `company:${companyKey}`,
          emailKey && `email:${emailKey}`,
          phoneKey && `phone:${phoneKey}`
        ].filter(Boolean) as string[];

        if (!company || rowKeys.some((key) => seen.has(key) || existingKeys.has(key))) {
          skipped += 1;
          if (company) skippedCompanies.push(company);
          return;
        }

        rowKeys.forEach((key) => seen.add(key));
        const sourceId = String(row.ID || index + 1).replace(/[^a-zA-Z0-9_-]/g, '');
        const rowId = `${importBatchId}-${sourceId || index + 1}`;
        const clientId = `import-client-${rowId}`;
        const leadId = `import-lead-${rowId}`;
        const firstEmail = normalizeImportDate(row['First Email Sent On']);
        const lastEmail = normalizeImportDate(row['Last Email Sent On']);
        const nextFollowUp = normalizeImportDate(row['Next Follow-up Date']);
        const responseDate = normalizeImportDate(row['Response Date']);
        const product = String(row.Product || '').trim();
        const productCategory = String(row['Product Category'] || '').trim();
        const stage = mapImportStage(String(row.Stage || ''), String(row['Response Received'] || ''));
        const outreachDone = Boolean(firstEmail || lastEmail || String(row['Follow-up 1 Done'] || '').toLowerCase() === 'yes');

        clientPayloads.push({
          id: clientId,
          company_name: company,
          contact_name: String(row['Contact Person'] || '').trim(),
          contact_email: email,
          destination_port: String(row.Country || '').trim() || 'Not specified',
          address: [
            `Data Source: ${importDataSource}`,
            String(row.Website || '').trim() && `Website: ${String(row.Website).trim()}`,
            String(row.Country || '').trim() && `Country: ${String(row.Country).trim()}`,
            String(row['Market Category'] || '').trim() && `Market: ${String(row['Market Category']).trim()}`,
            String(row['Buyer Type'] || '').trim() && `Buyer Type: ${String(row['Buyer Type']).trim()}`,
            phone && `Phone: ${phone}`
          ].filter(Boolean).join('\n')
        });

        leadPayloads.push({
          id: leadId,
          company_name: company,
          contact_name: String(row['Contact Person'] || '').trim(),
          contact_email: email,
          phone,
          country: String(row.Country || '').trim(),
          product_interest: product && product !== 'Other' ? product : productCategory || 'General export product range',
          estimated_value: Number(row['Lead Score'] || 0),
          stage: (outreachDone && stage === 'New Lead') ? 'Contacted' : stage,
          priority: ['Low', 'Medium', 'High'].includes(String(row.Priority)) ? String(row.Priority) as Lead['priority'] : 'Medium',
          owner: 'Sana Zeba',
          next_follow_up: nextFollowUp,
          notes: [
            `Data Source: ${importDataSource}`,
            `Source: ${String(row.Source || 'Bulk import').trim()}`,
            `Email Status: ${String(row['Email Status'] || '').trim()}`,
            `Next Action: ${String(row['Next Action'] || '').trim()}`,
            `Lead Score: ${String(row['Lead Score'] || '').trim()}`,
            `Response Received: ${String(row['Response Received'] || '').trim()}`,
            `Original Notes: ${String(row.Notes || '').trim()}`
          ].filter(Boolean).join('\n'),
          client_id: clientId
        });

        if (outreachDone) {
          activityPayloads.push({
            id: `import-activity-${rowId}`,
            client_id: clientId,
            lead_id: leadId,
            type: 'Email',
            title: `Imported outreach status for ${company}`,
            details: `Data Source: ${importDataSource}\nEmail Status: ${String(row['Email Status'] || 'Imported')}\nFirst Email: ${firstEmail || 'N/A'}\nLast Email: ${lastEmail || 'N/A'}\nFollow-up 1: ${String(row['Follow-up 1 Done'] || 'No')}\nFollow-up 2: ${String(row['Follow-up 2 Done'] || 'No')}\nFollow-up 3: ${String(row['Follow-up 3 Done'] || 'No')}`,
            activity_date: lastEmail || firstEmail || new Date().toISOString().slice(0, 10),
            owner: 'Sana Zeba'
          });
        }

        if (nextFollowUp && !['Won', 'Lost'].includes(stage)) {
          taskPayloads.push({
            id: `import-task-${rowId}`,
            title: `Follow up with ${company}`,
            status: 'Open',
            priority: ['Low', 'Medium', 'High'].includes(String(row.Priority)) ? String(row.Priority) as TaskRecord['priority'] : 'Medium',
            due_date: nextFollowUp,
            owner: 'Sana Zeba',
            client_id: clientId,
            lead_id: leadId,
            notes: `Data Source: ${importDataSource}\nAuto-created from imported CRM sheet. Next action: ${String(row['Next Action'] || 'Follow up')}`
          });
        }

        if (responseDate) {
          activityPayloads.push({
            id: `import-response-${rowId}`,
            client_id: clientId,
            lead_id: leadId,
            type: 'Status',
            title: `Response recorded for ${company}`,
            details: `Response Received: ${String(row['Response Received'] || '')}`,
            activity_date: responseDate,
            owner: 'Sana Zeba'
          });
        }
      });

      setImportProgress({ label: 'Duplicate check complete', processed: rows.length, total: rows.length || 1 });

      const insertBatches = async (table: string, payloads: unknown[]) => {
        const chunkSize = 150;
        for (let start = 0; start < payloads.length; start += chunkSize) {
          setImportProgress({ label: `Saving ${table}`, processed: Math.min(start, payloads.length), total: payloads.length || 1 });
          const chunk = payloads.slice(start, start + chunkSize);
          const { error } = await supabase.from(table).insert(chunk);
          if (error) throw new Error(`${table}: ${error.message || 'insert failed'}`);
          setImportProgress({ label: `Saving ${table}`, processed: Math.min(start + chunk.length, payloads.length), total: payloads.length || 1 });
        }
      };

      await insertBatches('clients', clientPayloads);
      await insertBatches('leads', leadPayloads);
      await insertBatches('activities', activityPayloads);
      await insertBatches('tasks', taskPayloads);

      await fetchData();
      setImportProgress({ label: 'Import complete', processed: rows.length, total: rows.length || 1 });
      setImportSummary({
        buyers: clientPayloads.length,
        leads: leadPayloads.length,
        activities: activityPayloads.length,
        tasks: taskPayloads.length,
        skipped,
        message: `Import complete: ${clientPayloads.length} new ${importDataSource.toLowerCase()} buyer${clientPayloads.length === 1 ? '' : 's'} added from ${file.name}. ${skipped} duplicate${skipped === 1 ? '' : 's'} skipped.`,
        skippedList: skippedCompanies
      });
    } catch (err) {
      console.warn('Buyer import failed:', err);
      alert(`Could not import this file. ${err instanceof Error ? err.message : 'Please use the same Buyers Excel or CSV template.'}`);
    } finally {
      setImportingBuyers(false);
      setTimeout(() => setImportProgress(null), 1400);
    }
  };

  const crmImportHeaders = [
      'ID',
      'Company Name',
      'Contact Person',
      'Email',
      'Phone',
      'Website',
      'Country',
      'Market Category',
      'Product',
      'Product Category',
      'Buyer Type',
      'Source',
      'Email Status',
      'Priority',
      'Stage',
      'Lead Score',
      'Next Action',
      'First Email Sent On',
      'Last Email Sent On',
      'Response Received',
      'Response Date',
      'Follow-up 1 Done',
      'Follow-up 1 Date',
      'Follow-up 2 Done',
      'Follow-up 2 Date',
      'Follow-up 3 Done',
      'Follow-up 3 Date',
      'Next Follow-up Date',
      'Notes',
      'Created At',
      'Updated At'
    ];

  const downloadCsvFile = (filename: string, rows: unknown[][]) => {
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clientAddressValue = (client: Client | undefined, label: string) => {
    const line = (client?.address || '').split('\n').find((item) => item.toLowerCase().startsWith(`${label.toLowerCase()}:`));
    return line ? line.slice(line.indexOf(':') + 1).trim() : '';
  };

  const downloadCrmImportTemplate = () => {
    const today = new Date().toISOString().slice(0, 10);
    const sampleRows = [
      [
        '001',
        'Example Foods Trading LLC',
        'Aisha Khan',
        'buyer@example.com',
        '+971501234567',
        'https://examplefoods.com',
        'UAE',
        'Spices Importer',
        'Cumin Seeds',
        'Spices',
        'Importer',
        'Trade Portal',
        'Not Sent',
        'High',
        'New Lead',
        '85',
        'Send first introduction email',
        '',
        '',
        'No',
        '',
        'No',
        '',
        'No',
        '',
        'No',
        '',
        today,
        'Interested in CIF quotation and product catalogue.',
        today,
        today
      ],
      [
        '002',
        'Global Retail Buyer GmbH',
        'Procurement Team',
        'procurement@example.de',
        '+491701234567',
        'https://globalretail.example',
        'Germany',
        'Retail / Distributor',
        'Other',
        'Agro Commodities',
        'Distributor',
        'Outreach Export',
        'First Email Sent',
        'Medium',
        'Follow-up',
        '72',
        'Wait until next follow-up',
        today,
        today,
        'No',
        '',
        'Yes',
        today,
        'No',
        '',
        'No',
        '',
        today,
        'No specific product yet. Pitch full Sheshaan Global product range.',
        today,
        today
      ]
    ];

    downloadCsvFile('sheshaan-global-crm-import-template.csv', [crmImportHeaders, ...sampleRows]);
  };

  const exportCrmImportTemplateData = (exportLeads: Lead[]) => {
    const rows = exportLeads.map((lead, index) => {
      const client = clients.find((item) => item.id === lead.client_id || item.company_name.toLowerCase() === lead.company_name.toLowerCase());
      const productParts = (lead.product_interest || '').split(',').map((item) => item.trim()).filter(Boolean);
      const product = productParts[0] || 'Other';
      const productCategory = productParts.slice(1).join(', ') || leadNoteValue(lead, 'Product Category') || 'General export product range';
      return [
        lead.id || String(index + 1).padStart(3, '0'),
        lead.company_name,
        lead.contact_name || client?.contact_name || '',
        lead.contact_email || client?.contact_email || '',
        lead.phone || client?.phone || '',
        clientAddressValue(client, 'Website'),
        lead.country || clientAddressValue(client, 'Country') || client?.destination_port || '',
        clientAddressValue(client, 'Market'),
        product,
        productCategory,
        clientAddressValue(client, 'Buyer Type'),
        leadNoteValue(lead, 'Source') || leadDataSource(lead),
        leadEmailStatus(lead),
        lead.priority || 'Medium',
        lead.stage,
        lead.estimated_value || '',
        leadNextAction(lead),
        leadNoteValue(lead, 'First Email Sent On'),
        leadNoteValue(lead, 'Last Email Sent On'),
        leadResponseStatus(lead),
        leadNoteValue(lead, 'Response Date'),
        leadNoteValue(lead, 'Follow-up 1 Done') || 'No',
        leadNoteValue(lead, 'Follow-up 1 Date'),
        leadNoteValue(lead, 'Follow-up 2 Done') || 'No',
        leadNoteValue(lead, 'Follow-up 2 Date'),
        leadNoteValue(lead, 'Follow-up 3 Done') || 'No',
        leadNoteValue(lead, 'Follow-up 3 Date'),
        lead.next_follow_up || '',
        (lead.notes || '').replace(/\r?\n/g, ' | '),
        lead.created_at || '',
        lead.updated_at || ''
      ];
    });

    downloadCsvFile(`sheshaan-global-crm-export-${new Date().toISOString().slice(0, 10)}.csv`, [crmImportHeaders, ...rows]);
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.sku || !productForm.unit_price) {
      alert('Please fill out SKU and Default FOB Unit Price.');
      return;
    }

    const payload = {
      id: editingProductId || undefined,
      sku: productForm.sku,
      description: productForm.description || '',
      unit_price: Number(productForm.unit_price) || 0,
      cost_price: Number(productForm.cost_price) || 0,
      weight: Number(productForm.weight) || 0,
      dimensions: productForm.dimensions || ''
    };

    const query = editingProductId ? supabase.from('products').update(payload).eq('id', editingProductId) : supabase.from('products').insert([payload]).select().single();
    const { data, error } = await query as any;
    if (error) {
      alert(error.message || 'Failed to save product');
      return;
    }

    if (editingProductId) await fetchData();
    else setProducts((current) => [...current, data]);
    resetProductForm();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this SKU? Historical quote line items will remain as snapshots.')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert(error.message || 'Failed to delete product');
      return;
    }
    setProducts((current) => current.filter((p) => p.id !== id));
  };

  const saveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.company_name) {
      alert('Please enter supplier company name.');
      return;
    }

    await saveRecord<Vendor>('vendors', editingVendorId, {
      ...vendorForm,
      rating: Number(vendorForm.rating) || 3,
      status: vendorForm.status || 'Active'
    }, resetVendorForm);
  };

  const savePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetForm.name || !presetForm.loading_port || !presetForm.destination_port) {
      alert('Please fill out preset name, loading port, and destination port.');
      return;
    }

    const payload = {
      id: editingPresetId || undefined,
      name: presetForm.name,
      loading_port: presetForm.loading_port,
      destination_port: presetForm.destination_port,
      shipment_mode: presetForm.shipment_mode || 'Sea Freight (1x20ft FCL)',
      freight_cost: Number(presetForm.freight_cost) || 0,
      insurance_cost: Number(presetForm.insurance_cost) || 0,
      shipment_window: presetForm.shipment_window || '',
      transit_time: presetForm.transit_time || '',
      partial_shipment: presetForm.partial_shipment || '',
      container_type: presetForm.container_type || '',
      storage_condition: presetForm.storage_condition || ''
    };

    const query = editingPresetId ? supabase.from('freight_presets').update(payload).eq('id', editingPresetId) : supabase.from('freight_presets').insert([payload]).select().single();
    const { data, error } = await query as any;
    if (error) {
      alert(error.message || 'Failed to save freight preset');
      return;
    }

    if (editingPresetId) await fetchData();
    else setFreightPresets((current) => [...current, data]);
    resetPresetForm();
  };

  const deletePreset = async (id: string) => {
    if (!confirm('Delete this freight and insurance preset?')) return;
    const { error } = await supabase.from('freight_presets').delete().eq('id', id);
    if (error) {
      alert(error.message || 'Failed to delete preset');
      return;
    }
    setFreightPresets((current) => current.filter((p) => p.id !== id));
  };

  // CRM lead helper functions moved to the top of the component to avoid Temporal Dead Zone ReferenceError

  const crmCountries = useMemo(() => {
    return Array.from(new Set(leads.map((lead) => (lead.country || 'Uncategorized').trim() || 'Uncategorized'))).sort((a, b) => a.localeCompare(b));
  }, [leads]);

  const searchedCrmLeads = useMemo(() => {
    const query = deferredCrmSearchQuery.trim().toLowerCase();
    const countryFiltered = crmCountryFilter === 'All'
      ? leads
      : leads.filter((lead) => ((lead.country || 'Uncategorized').trim() || 'Uncategorized') === crmCountryFilter);
    return query
      ? countryFiltered.filter((lead) => {
          return (
            lead.company_name.toLowerCase().includes(query) ||
            (lead.contact_name || '').toLowerCase().includes(query) ||
            (lead.contact_email || '').toLowerCase().includes(query) ||
            (lead.phone || '').toLowerCase().includes(query) ||
            (lead.country || '').toLowerCase().includes(query) ||
            (lead.product_interest || '').toLowerCase().includes(query)
          );
        })
      : countryFiltered;
  }, [leads, deferredCrmSearchQuery, crmCountryFilter]);

  const filteredCrmLeads = useMemo(() => {
    let finalLeads = searchedCrmLeads;
    if (crmQueueFilter) {
      finalLeads = searchedCrmLeads.filter((lead) => {
        if (crmQueueFilter === 'Need Reach Out') return lead.stage !== 'Won' && lead.stage !== 'Lost' && leadActionCategory(lead) === 'Need Reach Out';
        if (crmQueueFilter === 'Follow-up Due') return lead.stage !== 'Won' && lead.stage !== 'Lost' && leadActionCategory(lead) === 'Follow-up Due';
        if (crmQueueFilter === 'Next Follow-up') return lead.stage !== 'Won' && lead.stage !== 'Lost' && leadActionCategory(lead) === 'Next Follow-up';
        if (crmQueueFilter === 'Waiting Reply') return lead.stage !== 'Won' && lead.stage !== 'Lost' && leadActionCategory(lead) === 'Waiting Reply';
        return true;
      });
    }

    return [...finalLeads].sort((a, b) => {
      if (crmSortKey === 'reachout') {
        const catA = leadActionCategory(a);
        const catB = leadActionCategory(b);
        if (catA === 'Need Reach Out' && catB !== 'Need Reach Out') return -1;
        if (catA !== 'Need Reach Out' && catB === 'Need Reach Out') return 1;
      }
      if (crmSortKey === 'followup') {
        const catA = leadActionCategory(a);
        const catB = leadActionCategory(b);
        if (catA === 'Follow-up Due' && catB !== 'Follow-up Due') return -1;
        if (catA !== 'Follow-up Due' && catB === 'Follow-up Due') return 1;
      }
      if (crmSortKey === 'emailfix') {
        const catA = leadActionCategory(a);
        const catB = leadActionCategory(b);
        if (catA === 'Needs Email Fix' && catB !== 'Needs Email Fix') return -1;
        if (catA !== 'Needs Email Fix' && catB === 'Needs Email Fix') return 1;
      }
      if (crmSortKey === 'stage_new') {
        if (a.stage === 'New Lead' && b.stage !== 'New Lead') return -1;
        if (a.stage !== 'New Lead' && b.stage === 'New Lead') return 1;
      }
      if (crmSortKey === 'stage_contacted') {
        if (a.stage === 'Contacted' && b.stage !== 'Contacted') return -1;
        if (a.stage !== 'Contacted' && b.stage === 'Contacted') return 1;
      }
      if (crmSortKey === 'stage_quoted') {
        if (a.stage === 'Quoted' && b.stage !== 'Quoted') return -1;
        if (a.stage !== 'Quoted' && b.stage === 'Quoted') return 1;
      }
      if (crmSortKey === 'stage_negotiation') {
        if (a.stage === 'Negotiation' && b.stage !== 'Negotiation') return -1;
        if (a.stage !== 'Negotiation' && b.stage === 'Negotiation') return 1;
      }
      if (crmSortKey === 'stage_won') {
        if (a.stage === 'Won' && b.stage !== 'Won') return -1;
        if (a.stage !== 'Won' && b.stage === 'Won') return 1;
      }
      if (crmSortKey === 'stage_lost') {
        if (a.stage === 'Lost' && b.stage !== 'Lost') return -1;
        if (a.stage !== 'Lost' && b.stage === 'Lost') return 1;
      }
      if (crmSortKey === 'velocity') {
        return (leadVelocityScore[b.id] || 0) - (leadVelocityScore[a.id] || 0);
      }
      if (crmSortKey === 'action') {
        const scoreA = 
          leadActionCategory(a) === 'Needs Email Fix' ? 10 :
          leadActionCategory(a) === 'Need Reach Out' ? 9 :
          leadActionCategory(a) === 'Follow-up Due' ? 8 :
          leadActionCategory(a) === 'Responded / Qualify' ? 7 :
          leadActionCategory(a) === 'Next Follow-up' ? 6 :
          leadActionCategory(a) === 'Waiting Reply' ? 5 :
          leadActionCategory(a) === 'Review' ? 4 : 1;
        const scoreB = 
          leadActionCategory(b) === 'Needs Email Fix' ? 10 :
          leadActionCategory(b) === 'Need Reach Out' ? 9 :
          leadActionCategory(b) === 'Follow-up Due' ? 8 :
          leadActionCategory(b) === 'Responded / Qualify' ? 7 :
          leadActionCategory(b) === 'Next Follow-up' ? 6 :
          leadActionCategory(b) === 'Waiting Reply' ? 5 :
          leadActionCategory(b) === 'Review' ? 4 : 1;
        if (scoreB !== scoreA) return scoreB - scoreA;
      }
      if (crmSortKey === 'country') {
        const countryCompare = (a.country || 'Uncategorized').localeCompare(b.country || 'Uncategorized');
        if (countryCompare !== 0) return countryCompare;
      }
      return a.company_name.localeCompare(b.company_name);
    });
  }, [searchedCrmLeads, crmSortKey, crmQueueFilter, leadActionCategory, leadVelocityScore]);

  const crmQueues = useMemo(() => [
    { label: 'Need Reach Out', description: 'No email/WhatsApp sent yet', tone: 'sky' as const, leads: searchedCrmLeads.filter((lead) => lead.stage !== 'Won' && lead.stage !== 'Lost' && leadActionCategory(lead) === 'Need Reach Out') },
    { label: 'Follow-up Due', description: 'Due now or next action says follow-up', tone: 'amber' as const, leads: searchedCrmLeads.filter((lead) => lead.stage !== 'Won' && lead.stage !== 'Lost' && leadActionCategory(lead) === 'Follow-up Due') },
    { label: 'Next Follow-up', description: 'Scheduled later with date', tone: 'indigo' as const, leads: searchedCrmLeads.filter((lead) => lead.stage !== 'Won' && lead.stage !== 'Lost' && leadActionCategory(lead) === 'Next Follow-up').sort((a, b) => (a.next_follow_up || '').localeCompare(b.next_follow_up || '')) },
    { label: 'Waiting Reply', description: 'Reached out, no response yet', tone: 'slate' as const, leads: searchedCrmLeads.filter((lead) => lead.stage !== 'Won' && lead.stage !== 'Lost' && leadActionCategory(lead) === 'Waiting Reply') },
    { label: 'Responded / Qualify', description: 'Buyer replied; review requirement', tone: 'teal' as const, leads: searchedCrmLeads.filter((lead) => lead.stage !== 'Won' && lead.stage !== 'Lost' && leadActionCategory(lead) === 'Responded / Qualify') },
    { label: 'Needs Email Fix', description: 'Missing or invalid email', tone: 'red' as const, leads: searchedCrmLeads.filter((lead) => lead.stage !== 'Won' && lead.stage !== 'Lost' && leadActionCategory(lead) === 'Needs Email Fix') },
    { label: 'Needs Review', description: 'Imported action is unclear', tone: 'violet' as const, leads: searchedCrmLeads.filter((lead) => lead.stage !== 'Won' && lead.stage !== 'Lost' && leadActionCategory(lead) === 'Review') },
    { label: 'Won / Approved', description: 'Pipeline deals successfully won', tone: 'emerald' as const, leads: searchedCrmLeads.filter((lead) => lead.stage === 'Won') },
    { label: 'Lost / Declined', description: 'Pipeline deals lost/declined', tone: 'rose' as const, leads: searchedCrmLeads.filter((lead) => lead.stage === 'Lost') }
  ], [searchedCrmLeads, leadActionCategory]);

  const visibleCrmLeads = useMemo(() => filteredCrmLeads.slice(0, crmVisibleCount), [filteredCrmLeads, crmVisibleCount]);

  const sourceFilteredLeads = useMemo(() => {
    const query = deferredSourceSearchQuery.trim().toLowerCase();
    const filtered = leads.filter((lead) => {
      const source = leadDataSource(lead);
      const action = leadActionCategory(lead);
      const isSourceTagged = source === 'Embassy Data' || source === 'Custom Researched Data';
      const country = (lead.country || 'Uncategorized').trim() || 'Uncategorized';
      const searchable = [
        lead.company_name,
        lead.contact_name,
        lead.contact_email,
        lead.phone,
        lead.country,
        lead.product_interest,
        source,
        action
      ].join(' ').toLowerCase();
      const matchesSource = sourceTypeFilter === 'All' || source === sourceTypeFilter;
      const matchesCountry = sourceCountryFilter === 'All' || country === sourceCountryFilter;
      const matchesAction = sourceActionFilter === 'All' || action === sourceActionFilter;
      const matchesSearch = !query || searchable.includes(query);
      return isSourceTagged && matchesSource && matchesCountry && matchesAction && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      if (sourceSortKey === 'source') {
        const sourceCompare = leadDataSource(a).localeCompare(leadDataSource(b));
        if (sourceCompare !== 0) return sourceCompare;
      }
      if (sourceSortKey === 'action') {
        const actionCompare = leadActionCategory(a).localeCompare(leadActionCategory(b));
        if (actionCompare !== 0) return actionCompare;
      }
      if (sourceSortKey === 'country') {
        const countryCompare = (a.country || 'Uncategorized').localeCompare(b.country || 'Uncategorized');
        if (countryCompare !== 0) return countryCompare;
      }
      if (sourceSortKey === 'followup') {
        const dateCompare = (a.next_follow_up || '9999-12-31').localeCompare(b.next_follow_up || '9999-12-31');
        if (dateCompare !== 0) return dateCompare;
      }
      return a.company_name.localeCompare(b.company_name);
    });
  }, [leads, deferredSourceSearchQuery, sourceTypeFilter, sourceCountryFilter, sourceActionFilter, sourceSortKey]);

  const sourceCountries = useMemo(() => {
    return Array.from(new Set(leads
      .filter((lead) => {
        const source = leadDataSource(lead);
        return source === 'Embassy Data' || source === 'Custom Researched Data';
      })
      .map((lead) => (lead.country || 'Uncategorized').trim() || 'Uncategorized')))
      .sort((a, b) => a.localeCompare(b));
  }, [leads]);

  const sourceStats = useMemo(() => ({
    embassy: leads.filter((lead) => leadDataSource(lead) === 'Embassy Data').length,
    custom: leads.filter((lead) => leadDataSource(lead) === 'Custom Researched Data').length,
    followup: sourceFilteredLeads.filter((lead) => leadActionCategory(lead) === 'Follow-up Due').length,
    reachout: sourceFilteredLeads.filter((lead) => leadActionCategory(lead) === 'Need Reach Out').length
  }), [leads, sourceFilteredLeads]);
  const visibleSourceLeads = useMemo(() => sourceFilteredLeads.slice(0, sourceVisibleCount), [sourceFilteredLeads, sourceVisibleCount]);
  const crmBoardColumns = crmQueues.filter((queue) => ['Need Reach Out', 'Follow-up Due', 'Next Follow-up', 'Waiting Reply', 'Responded / Qualify', 'Needs Email Fix', 'Won / Approved', 'Lost / Declined'].includes(queue.label));
  const selectedLeads = leads.filter((lead) => selectedLeadIds.includes(lead.id));

  const toggleLeadSelection = (leadId: string, checked: boolean) => {
    setSelectedLeadIds((current) => checked ? Array.from(new Set([...current, leadId])) : current.filter((id) => id !== leadId));
  };

  const selectLeadGroup = (group: Lead[]) => {
    setSelectedLeadIds(Array.from(new Set([...selectedLeadIds, ...group.map((lead) => lead.id)])));
  };

  const deleteRecordsByIds = async (table: string, ids: string[]) => {
    const chunkSize = 25;
    for (let index = 0; index < ids.length; index += chunkSize) {
      const chunk = ids.slice(index, index + chunkSize);
      const results = await Promise.all(chunk.map((id) => supabase.from(table).delete().eq('id', id)));
      const failed = results.find((result) => result.error);
      if (failed?.error) throw new Error(failed.error.message || `Failed to delete ${table}`);
    }
  };

  const handleDeleteAllCrmData = async () => {
    const leadIds = leads.map((lead) => lead.id);
    const clientIds = clients.map((client) => client.id);
    const leadIdSet = new Set(leadIds);
    const clientIdSet = new Set(clientIds);
    const crmActivityIds = activities
      .filter((activity) => (activity.lead_id && leadIdSet.has(activity.lead_id)) || (activity.client_id && clientIdSet.has(activity.client_id)))
      .map((activity) => activity.id);
    const crmTaskIds = tasks
      .filter((task) => (task.lead_id && leadIdSet.has(task.lead_id)) || (task.client_id && clientIdSet.has(task.client_id)))
      .map((task) => task.id);
    const totalRecords = leadIds.length + clientIds.length + crmActivityIds.length + crmTaskIds.length;

    if (!totalRecords) {
      alert('No CRM buyer or lead data found to delete.');
      return;
    }

    const confirmed = confirm(
      `Delete all CRM data?\n\nThis will delete ${clientIds.length} registered buyers, ${leadIds.length} leads, ${crmActivityIds.length} CRM activities, and ${crmTaskIds.length} CRM follow-up tasks.\n\nQuotes, invoices, products, templates, and shipments will stay safe.`
    );
    if (!confirmed) return;

    const typed = window.prompt('Type DELETE CRM to confirm this action.');
    if (typed !== 'DELETE CRM') {
      alert('CRM delete cancelled.');
      return;
    }

    try {
      setLoading(true);
      await deleteRecordsByIds('activities', crmActivityIds);
      await deleteRecordsByIds('tasks', crmTaskIds);
      await deleteRecordsByIds('leads', leadIds);
      await deleteRecordsByIds('clients', clientIds);

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('crixy_portal_db');
      }

      setActivities((current) => current.filter((activity) => !crmActivityIds.includes(activity.id)));
      setTasks((current) => current.filter((task) => !crmTaskIds.includes(task.id)));
      setClients([]);
      setLeads([]);
      setSelectedLeadIds([]);
      setSelectedBuyerId(null);
      setEditingLeadId(null);
      setEditingClientId(null);
      setLeadForm(blankLead);
      setClientForm(blankClient);
      setImportSummary(null);
      await fetchData();
      alert('All CRM buyer and lead data has been deleted.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete CRM data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const leadTrackingDefinition = (action: LeadTrackingAction) => {
    const today = new Date().toISOString().slice(0, 10);
    const actionDefinitions: Record<LeadTrackingAction, { title: string; fields: Record<string, string>; stage: Lead['stage']; nextFollowUp: string | null }> = {
      email_sent: {
        title: 'Buyer contacted',
        fields: { 'Email Status': 'Email Sent', 'First Email Sent On': today, 'Last Email Sent On': today, 'Response Received': 'No', 'Next Action': 'Waiting for buyer response' },
        stage: 'Contacted',
        nextFollowUp: dateAfterDays(3)
      },
      followup_due: {
        title: 'Follow-up scheduled as due',
        fields: { 'Next Action': 'Send follow-up today', 'Response Received': 'No' },
        stage: 'Contacted',
        nextFollowUp: today
      },
      followup_1: {
        title: 'Follow-up 1 completed',
        fields: { 'Email Status': 'Follow-up 1 Done', 'Follow-up 1 Done': 'Yes', 'Follow-up 1 Date': today, 'Last Email Sent On': today, 'Response Received': 'No', 'Next Action': 'Waiting for buyer response' },
        stage: 'Contacted',
        nextFollowUp: dateAfterDays(4)
      },
      followup_2: {
        title: 'Follow-up 2 completed',
        fields: { 'Email Status': 'Follow-up 2 Done', 'Follow-up 2 Done': 'Yes', 'Follow-up 2 Date': today, 'Last Email Sent On': today, 'Response Received': 'No', 'Next Action': 'Waiting for buyer response' },
        stage: 'Contacted',
        nextFollowUp: dateAfterDays(7)
      },
      followup_3: {
        title: 'Follow-up 3 completed',
        fields: { 'Email Status': 'Follow-up 3 Done', 'Follow-up 3 Done': 'Yes', 'Follow-up 3 Date': today, 'Last Email Sent On': today, 'Response Received': 'No', 'Next Action': 'No further follow-up scheduled' },
        stage: 'Contacted',
        nextFollowUp: ''
      },
      responded: {
        title: 'Buyer response received',
        fields: { 'Response Received': 'Yes', 'Response Date': today, 'Next Action': 'Review buyer requirement and prepare next step' },
        stage: 'Negotiation',
        nextFollowUp: ''
      }
    };

    return actionDefinitions[action];
  };

  const updateLeadTracking = async (lead: Lead, action: LeadTrackingAction, refresh = true) => {
    const actionMap = leadTrackingDefinition(action);
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('leads').update({
      notes: setLeadNoteValues(lead, actionMap.fields),
      stage: ['Won', 'Lost'].includes(lead.stage) ? lead.stage : actionMap.stage,
      next_follow_up: actionMap.nextFollowUp === null ? lead.next_follow_up : actionMap.nextFollowUp
    }).eq('id', lead.id);

    if (error) {
      alert(error.message || 'Could not update lead tracking.');
      return false;
    }

    await supabase.from('activities').insert([{
      client_id: lead.client_id,
      lead_id: lead.id,
      type: action === 'responded' ? 'Status' : 'Email',
      title: `${actionMap.title}: ${lead.company_name}`,
      details: `Smart CRM tracker updated ${lead.company_name}.`,
      activity_date: today,
      owner: lead.owner || 'Sana Zeba'
    }]);

    if (refresh) await fetchData();
    return true;
  };

  const bulkUpdateSelectedLeads = async (action: LeadTrackingAction) => {
    if (!selectedLeads.length) {
      alert('Select at least one lead first.');
      return;
    }

    try {
      await Promise.all(selectedLeads.map((lead) => updateLeadTracking(lead, action, false)));
      setSelectedLeadIds([]);
      await fetchData();
    } catch (err) {
      console.warn('Bulk lead update failed:', err);
      alert('Could not update selected leads. Please try again.');
    }
  };

  const navItems = useMemo(() => {
    const allNavItems: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
      { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
      { key: 'actionQueue', label: 'Action Queue', icon: <Target className="h-4 w-4" />, count: actionQueueItems.length },
      { key: 'crm', label: 'Smart CRM Pipeline', icon: <KanbanSquare className="h-4 w-4" />, count: leads.length },
      { key: 'dataSources', label: 'Source Data', icon: <Database className="h-4 w-4" />, count: sourceFilteredLeads.length },
      { key: 'phoneReachout', label: 'Number Reachout', icon: <Phone className="h-4 w-4" />, count: reachoutBuyers.length },
      { key: 'quotes', label: 'Quote Automation', icon: <FileCheck2 className="h-4 w-4" />, count: quotes.length },
      { key: 'communications', label: 'Communication Center', icon: <MessageSquare className="h-4 w-4" />, count: activities.length },
      { key: 'templates', label: 'Mail & Message Templates', icon: <Mail className="h-4 w-4" />, count: templates.length },
      { key: 'tasks', label: 'Tasks & Reminders', icon: <ClipboardList className="h-4 w-4" />, count: tasks.filter((task) => task.status !== 'Done').length },
      { key: 'accounts', label: 'Accounts & Payments', icon: <CalendarCheck className="h-4 w-4" />, count: invoices.length },
      { key: 'shipments', label: 'Shipment Operations', icon: <Ship className="h-4 w-4" />, count: shipments.length },
      { key: 'documents', label: 'Documents', icon: <CheckSquare className="h-4 w-4" />, count: checklists.length },
      { key: 'products', label: 'Products', icon: <Package className="h-4 w-4" />, count: products.length },
      { key: 'vendors', label: 'Suppliers / Vendors', icon: <Building2 className="h-4 w-4" />, count: vendors.length },
      { key: 'freight', label: 'Freight Presets', icon: <Anchor className="h-4 w-4" />, count: freightPresets.length },
      { key: 'rates', label: 'Rate History', icon: <History className="h-4 w-4" />, count: freightRates.length },
      { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
      { key: 'users', label: 'Users & Roles', icon: <Lock className="h-4 w-4" />, count: users.length },
      { key: 'manager', label: 'Manager Dashboard', icon: <LineChart className="h-4 w-4" /> }
    ];
    return allNavItems.filter((item) => canAccessTab(currentRole, item.key));
  }, [
    currentRole,
    actionQueueItems,
    leads,
    sourceFilteredLeads,
    reachoutBuyers,
    quotes,
    activities,
    templates,
    tasks,
    invoices,
    shipments,
    checklists,
    products,
    vendors,
    freightPresets,
    freightRates,
    users
  ]);

  const activeNavItem = navItems.find((item) => item.key === activeTab);
  const appBusy = loading || importingBuyers;
  const importProgressPercent = importProgress ? Math.min(100, Math.round((importProgress.processed / Math.max(importProgress.total, 1)) * 100)) : 0;
  const mobilePrimaryNav = useMemo(() => navItems.filter((item) => ['overview', 'crm', 'dataSources', 'tasks'].includes(item.key)), [navItems]);
  const navGroups = useMemo(() => [
    { label: 'Command', items: navItems.filter((item) => ['overview', 'actionQueue', 'crm', 'dataSources', 'phoneReachout', 'quotes', 'communications', 'templates', 'tasks'].includes(item.key)) },
    { label: 'Operations', items: navItems.filter((item) => ['accounts', 'shipments', 'documents', 'products', 'vendors', 'freight', 'rates'].includes(item.key)) },
    { label: 'Admin', items: navItems.filter((item) => ['analytics', 'users', 'manager'].includes(item.key)) }
  ], [navItems]);

  const hasAccessToActiveTab = useMemo(() => {
    return canAccessTab(currentRole, activeTab);
  }, [currentRole, activeTab]);
  const navigateToTab = (tab: TabKey) => {
    setActiveTab(tab);
    setShowMobileMenu(false);
    setShowNotifications(false);
  };
  const selectedBuyer = clients.find((client) => client.id === selectedBuyerId);
  const leadCategoryClass = useCallback((category: string) => {
    if (category === 'Need Reach Out') return 'bg-sky-50 text-sky-700 border-sky-100';
    if (category === 'Follow-up Due') return 'bg-amber-50 text-amber-700 border-amber-100';
    if (category === 'Next Follow-up') return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    if (category === 'Waiting Reply') return 'bg-slate-100 text-slate-700 border-slate-200';
    if (category === 'Responded / Qualify') return 'bg-teal-50 text-teal-700 border-teal-100';
    if (category === 'Needs Email Fix') return 'bg-red-50 text-red-700 border-red-100';
    return 'bg-violet-50 text-violet-700 border-violet-100';
  }, []);
  const leadEmailMode = useCallback((lead: Lead): 'First Reach' | 'Follow-up' => {
    const category = leadActionCategory(lead);
    if (category === 'Need Reach Out') return 'First Reach';
    if (category === 'Follow-up Due' || category === 'Next Follow-up' || category === 'Waiting Reply' || category === 'Responded / Qualify') return 'Follow-up';
    if (leadNextActionRequiresFollowUp(lead) || leadFollowUpDue(lead) || leadHasOutreach(lead)) return 'Follow-up';
    return 'First Reach';
  }, [leadActionCategory]);
  const handleSendCopilotMessage = () => {
    if (!copilotMessage.trim()) return;
    const msg = copilotMessage.trim();
    setCopilotLog((prev) => [...prev, { sender: 'user', text: msg }]);
    setCopilotMessage('');

    setTimeout(() => {
      const lower = msg.toLowerCase();

      if (lower.startsWith('add lead') || lower.startsWith('create lead')) {
        const parts = msg.split(/\s+/).slice(2);
        const company = parts[0] || 'Nestle';
        const country = parts[1] || 'Switzerland';
        const product = parts.slice(2).join(' ') || 'Peanuts';

        setLeadForm({
          ...blankLead,
          company_name: company,
          country: country,
          product_interest: product
        });
        setEditingLeadId(null);
        setActiveTab('crm');

        setCopilotLog((prev) => [...prev, {
          sender: 'ai',
          text: `I have pre-populated the CRM form for "${company}" (from ${country}) interested in "${product}". Fill in remaining details on the left.`,
          action: { label: 'Go to CRM', tab: 'crm' }
        }]);
        return;
      }

      if (lower.includes('quote') || lower.includes('create quote')) {
        setActiveTab('quotes');
        setCopilotLog((prev) => [...prev, {
          sender: 'ai',
          text: 'Navigated to the Quote Automation workspace. Click "Create New Quote" to begin.',
          action: { label: 'Go to Quotes', tab: 'quotes' }
        }]);
        return;
      }

      if (lower.includes('analytics') || lower.includes('chart') || lower.includes('reports') || lower.includes('overview')) {
        setActiveTab('overview');
        setCopilotLog((prev) => [...prev, {
          sender: 'ai',
          text: 'Switched to the Command Center overview. You can inspect operational metrics and trends here.',
          action: { label: 'Go to Command Center', tab: 'overview' }
        }]);
        return;
      }

      if (lower.startsWith('find') || lower.startsWith('search')) {
        const query = msg.split(/\s+/).slice(1).join(' ');
        if (query) {
          setCrmSearchQuery(query);
          setActiveTab('crm');
          setCopilotLog((prev) => [...prev, {
            sender: 'ai',
            text: `Filtered CRM board by "${query}".`,
            action: { label: 'Go to CRM', tab: 'crm' }
          }]);
          return;
        }
      }

      setCopilotLog((prev) => [...prev, {
        sender: 'ai',
        text: `I understood your command "${msg}". Try saying: "add lead Nestle Switzerland Peanuts", "create quote", or search for records.`
      }]);
    }, 600);
  };

  const editLeadFromCard = (lead: Lead) => {
    setEditingLeadId(lead.id);
    setLeadForm(lead);
  };
  const openBuyerAsCrmLead = (client: Client) => {
    const linkedLead = leads.find((lead) => lead.client_id === client.id || lead.company_name.toLowerCase() === client.company_name.toLowerCase());
    if (linkedLead) {
      setEditingLeadId(linkedLead.id);
      setLeadForm(linkedLead);
      return;
    }

    setEditingLeadId(null);
    setLeadForm({
      ...blankLead,
      client_id: client.id,
      company_name: client.company_name,
      contact_name: client.contact_name,
      contact_email: client.contact_email,
      phone: client.phone || clientPhones[client.id] || '',
      country: buyerCountry(client),
      product_interest: client.products_dealing?.join(', ') || '',
      stage: 'New Lead',
      priority: 'Medium'
    });
  };
  const renderLeadCard = (lead: Lead, compact = false) => {
    const actionCategory = leadActionCategory(lead);
    const emailMode = leadEmailMode(lead);
    const emailButtonLabel = actionCategory === 'Needs Email Fix' ? 'Fix Email' : emailMode;
    const whatsappButtonLabel = lead.phone ? 'WhatsApp' : 'Add Phone';
    const sendWindow = bestSendWindowIST(lead.country);
    return (
    <div key={lead.id} className="smooth-card bg-white border border-slate-200 rounded-lg p-3 text-xs shadow-sm hover:border-sky-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <input
            type="checkbox"
            checked={selectedLeadIds.includes(lead.id)}
            onChange={(event) => toggleLeadSelection(lead.id, event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            title="Select lead"
          />
          <div className="min-w-0">
            <div className="font-bold text-slate-900 leading-tight truncate">{lead.company_name}</div>
            <div className="text-[10px] text-slate-500 truncate">{lead.product_interest || 'General export product range'}</div>
          </div>
        </div>
        <RowActions currentRole={currentRole} onEdit={() => editLeadFromCard(lead)} onDelete={() => deleteRecord('leads', lead.id, 'lead')} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${leadCategoryClass(actionCategory)}`}>{actionCategory}</span>
        <SmallBadge text={lead.priority || 'Medium'} />
        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
          (leadScoreValue[lead.id] || 0) >= 70 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
          (leadScoreValue[lead.id] || 0) >= 50 ? 'bg-sky-50 text-sky-800 border border-sky-200' :
          'bg-slate-50 text-slate-800 border border-slate-200'
        }`}>Score: {leadScoreValue[lead.id] || 0}</span>
        {lead.sequence_enrolled && (
          <span className="inline-block px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-extrabold">Seq: {lead.sequence_enrolled}</span>
        )}
        <SmallBadge text={leadEmailStatus(lead)} />
        {leadResponded(lead) && <span className="inline-block px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold">Responded</span>}
        {leadFollowUpDue(lead) && <span className="inline-block px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">Due</span>}
        {leadNextFollowUpScheduled(lead) && <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">Next: {lead.next_follow_up}</span>}
        {leadMissingEmail(lead) && <span className="inline-block px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold">Verify Email</span>}
      </div>
      {!compact && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
          <SmallMetric label="Follow-up" value={lead.next_follow_up || 'Not set'} />
          <SmallMetric label="Next Action" value={leadNextAction(lead)} />
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => actionCategory === 'Needs Email Fix' ? editLeadFromCard(lead) : handleLeadEmail(lead, emailMode)} className="flex-1 min-w-[104px] py-1.5 bg-slate-900 text-white rounded font-bold flex items-center justify-center gap-1.5 hover:bg-slate-800 transition">
          <Mail className="h-3.5 w-3.5" />
          {emailButtonLabel}
        </button>
        <button type="button" onClick={() => lead.phone ? handleLeadWhatsApp(lead) : editLeadFromCard(lead)} className={`flex-1 min-w-[104px] py-1.5 text-white rounded font-bold flex items-center justify-center gap-1.5 transition ${lead.phone ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-500 hover:bg-slate-600'}`}>
          <Phone className="h-3.5 w-3.5" />
          {whatsappButtonLabel}
        </button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <button type="button" onClick={() => updateLeadTracking(lead, 'email_sent')} className="rounded bg-sky-50 px-2 py-1 text-[10px] font-extrabold text-sky-700 hover:bg-sky-100">Contacted</button>
        <button type="button" onClick={() => updateLeadTracking(lead, leadFollowUpDue(lead) ? 'followup_1' : 'followup_due')} className="rounded bg-amber-50 px-2 py-1 text-[10px] font-extrabold text-amber-700 hover:bg-amber-100">{leadFollowUpDue(lead) ? 'Follow-up Done' : 'Need Follow-up'}</button>
        <button type="button" onClick={() => updateLeadTracking(lead, 'responded')} className="rounded bg-teal-50 px-2 py-1 text-[10px] font-extrabold text-teal-700 hover:bg-teal-100">Responded</button>
      </div>
      <div className="mt-2 rounded bg-slate-50 border border-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 truncate">{sendWindow}{lead.country ? ` | ${lead.country}` : ' | Country not set'}</div>
      <div className="mt-2 text-[10px] text-slate-400 truncate">{lead.contact_email || 'Missing email'}{lead.phone ? ` | ${lead.phone}` : ' | Missing phone'}</div>
    </div>
    );
  };

  if (editingQuoteId !== undefined) {
    return (
      <div className="p-4 md:p-8">
        <QuoteForm
          quoteId={editingQuoteId}
          onSaveSuccess={() => {
            setEditingQuoteId(undefined);
            fetchData();
          }}
          onCancel={() => setEditingQuoteId(undefined)}
        />
      </div>
    );
  }

  const handleDeleteLeadFromCrm = useCallback(async (id: string) => {
    await deleteRecord('leads', id, 'lead');
    if (selectedCrmLead?.id === id) {
      setSelectedCrmLead(null);
    }
  }, [deleteRecord, selectedCrmLead]);

  const handleBulkDeleteLeads = useCallback(async () => {
    if (!selectedLeadIds.length) return;
    if (!confirm(`Are you sure you want to delete ${selectedLeadIds.length} selected leads?`)) return;

    setLoading(true);
    const { error } = await supabase
      .from('leads')
      .delete()
      .in('id', selectedLeadIds);

    setLoading(false);

    if (error) {
      alert(`Failed to delete leads: ${error.message}`);
      return;
    }

    setSelectedLeadIds([]);
    await fetchData();
  }, [selectedLeadIds, fetchData]);

  const handleMoveLeadFromCrm = useCallback(async (leadId: string, newStage: CrmStage) => {
    setLeads((prevLeads) =>
      prevLeads.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l))
    );

    const { error } = await supabase
      .from('leads')
      .update({ stage: newStage })
      .eq('id', leadId);

    if (error) {
      alert(`Failed to move lead: ${error.message}`);
      await fetchData();
    } else {
      await fetchData();
    }
  }, [fetchData]);

  const handleSaveLeadFromDrawer = useCallback(async (updates: Partial<CrmLead>) => {
    if (!selectedCrmLead) return;
    
    const updatedLead = { ...selectedCrmLead, ...updates };
    setSelectedCrmLead(updatedLead);
    setLeads((prevLeads) =>
      prevLeads.map((l) => (l.id === selectedCrmLead.id ? { ...l, ...updates } : l))
    );

    await saveRecord<Lead>('leads', selectedCrmLead.id.startsWith('new-') ? null : selectedCrmLead.id, updates, () => {});
  }, [selectedCrmLead, saveRecord]);

  const handleToggleSelection = useCallback((id: string | string[], checked: boolean) => {
    setSelectedLeadIds((prev) => {
      if (Array.isArray(id)) {
        if (checked) {
          const toAdd = id.filter(x => !prev.includes(x));
          return [...prev, ...toAdd];
        } else {
          return prev.filter(x => !id.includes(x));
        }
      } else {
        return checked ? [...prev, id] : prev.filter((item) => item !== id);
      }
    });
  }, []);

  const handleToggleSelectAll = useCallback((checked: boolean) => {
    setSelectedLeadIds(checked ? filteredCrmLeads.map((l) => l.id) : []);
  }, [filteredCrmLeads]);

  const handleEditLead = useCallback((l: CrmLead) => {
    setSelectedCrmLead(l);
  }, []);

  const handleSendEmail = useCallback((lead: CrmLead) => {
    handleLeadEmail(lead, leadEmailMode(lead));
  }, [handleLeadEmail, leadEmailMode]);

  const handleUpdateStatus = useCallback((lead: CrmLead, action: 'email_sent' | 'followup_due' | 'responded') => {
    if (action === 'email_sent') handleLeadEmail(lead, 'First Reach');
    if (action === 'followup_due') handleLeadEmail(lead, 'Follow-up');
  }, [handleLeadEmail]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e0f2fe_0,_transparent_28%),radial-gradient(circle_at_90%_10%,_#ecfeff_0,_transparent_22%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] pb-28 lg:pb-0">
      {appBusy && (
        <div className="fixed inset-x-0 top-0 z-[70] h-1 overflow-hidden bg-slate-200/70">
          <div className="h-full w-1/2 animate-loading-bar bg-sky-500 shadow-[0_0_18px_rgba(14,165,233,0.65)]" />
        </div>
      )}
      <div className="w-full">
        <div className="flex flex-col lg:flex-row">
          <aside
            data-sidebar="true"
            className="hidden lg:flex flex-col w-[280px] h-screen fixed top-0 left-0 bg-zinc-950 border-r border-zinc-800 overflow-hidden z-40 animate-fade-up"
          >
            {/* Brand Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/80 shrink-0">
              <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                <Image src="/logo.png" alt="Sheshaan Global" width={36} height={36} className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[13px] font-extrabold text-white tracking-tight leading-none truncate">Sheshaan Global</h1>
                <p className="text-[10px] text-zinc-500 font-semibold mt-0.5 uppercase tracking-wider">Trade Portal</p>
              </div>
            </div>

            {/* New Quote CTA */}
            <div className="px-4 pt-4 pb-2 shrink-0">
              <button
                onClick={() => { setEditingQuoteId(null); setShowMobileMenu(false); navigateToTab('quotes'); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white text-[11px] font-bold rounded-lg shadow-sm shadow-sky-500/20 transition-all duration-150"
              >
                <Plus className="h-3.5 w-3.5" />
                New Quote
              </button>
            </div>

            {/* Nav Groups */}
            <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-1 space-y-5">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <p className="px-2 pb-1.5 pt-1 text-[9px] font-extrabold uppercase tracking-widest text-zinc-600">{group.label}</p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = activeTab === item.key;
                      return (
                        <button
                          key={item.key}
                          onClick={() => navigateToTab(item.key)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left text-[11.5px] font-semibold transition-all duration-150 relative group ${
                            isActive
                              ? 'bg-zinc-800 text-white'
                              : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
                          }`}
                        >
                          {/* Active accent bar */}
                          {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-sky-400 rounded-r-full" />}
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
              <div className="flex items-center justify-between px-1">
                <span className="text-[9px] text-zinc-600 font-semibold">USD/INR</span>
                <span className={`text-[10px] font-black ${fxRateLoading ? 'text-zinc-600 animate-pulse' : 'text-emerald-400'}`}>
                  ₹{fxRate.toFixed(2)}
                </span>
              </div>
            </div>
          </aside>

          <section className="flex-1 lg:ml-[280px] space-y-4 min-w-0 p-3 lg:p-5">
            <div className="lg:hidden sticky top-2 z-30 bg-white/95 backdrop-blur rounded-lg border border-slate-200 shadow-sm overflow-hidden animate-fade-up">
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
                  <p className="text-sm font-extrabold text-slate-900 truncate">{activeNavItem?.label || 'Overview'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotifications((value) => !value)}
                  className="relative h-10 w-10 rounded-md border border-slate-200 bg-white text-slate-700 flex items-center justify-center active:scale-95 transition hover:bg-slate-50"
                  aria-label="Open notifications"
                >
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && <span className="absolute -right-1 -top-1 bg-red-600 text-white text-[10px] h-5 min-w-5 px-1 rounded-full flex items-center justify-center">{notifications.length}</span>}
                </button>
              </div>
            </div>

            {showNotifications && (
              <div className="lg:hidden fixed inset-x-3 top-20 z-50 rounded-lg border border-slate-200 bg-white shadow-2xl p-3 animate-panel-in">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-slate-900">Notification Center</span>
                  <button type="button" onClick={() => setShowNotifications(false)} className="h-8 w-8 rounded bg-slate-50 text-slate-500 flex items-center justify-center" aria-label="Close notifications"><X className="h-4 w-4" /></button>
                </div>
                {notifications.length === 0 ? (
                  <div className="text-xs text-slate-500 py-4 text-center">No active alerts.</div>
                ) : notifications.slice(0, 8).map((item) => (
                  <button key={item.id} type="button" onClick={() => navigateToTab(item.tab)} className="w-full text-left p-2 rounded hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
                    <span className="block text-xs font-bold text-slate-900">{item.title}</span>
                    <span className="block text-[10px] text-slate-500">{item.meta}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="lg:hidden sticky top-[4.75rem] z-20 bg-white/95 backdrop-blur rounded-lg border border-slate-200 shadow-sm p-3 animate-fade-up">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <SmoothInput
                  value={globalSearch}
                  onChange={setGlobalSearch}
                  placeholder="Search portal..."
                  className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                {globalResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-10 z-40 rounded-lg border border-slate-200 bg-white shadow-lg p-2">
                    {globalResults.map((result) => (
                      <button
                        key={result.key}
                        type="button"
                        onClick={() => {
                          navigateToTab(result.tab);
                          if (result.buyerId) setSelectedBuyerId(result.buyerId);
                          setGlobalSearch('');
                        }}
                        className="w-full text-left px-3 py-2 rounded hover:bg-slate-50 text-xs"
                      >
                        <span className="block font-bold text-slate-900">{result.label}</span>
                        <span className="block text-[10px] text-slate-500">{result.meta}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                <button type="button" onClick={runFollowUpAutomation} className="h-10 rounded-md bg-slate-50 text-slate-700 text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 active:scale-95 transition">
                  <Sparkles className="h-4 w-4" />
                  Auto
                </button>
                <button type="button" onClick={() => navigateToTab('templates')} className="h-10 rounded-md bg-slate-50 text-slate-700 text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 active:scale-95 transition">
                  <Edit2 className="h-4 w-4" />
                  Templates
                </button>
                <button type="button" onClick={() => navigateToTab('communications')} className="h-10 rounded-md bg-slate-50 text-slate-700 text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 active:scale-95 transition">
                  <Mail className="h-4 w-4" />
                  Mail
                </button>
                <button type="button" onClick={() => setEditingQuoteId(null)} className="h-10 rounded-md bg-slate-900 text-white text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 active:scale-95 transition">
                  <Plus className="h-4 w-4" />
                  Quote
                </button>
              </div>
            </div>

            <div className="hidden lg:block sticky top-3 z-20 bg-white/95 backdrop-blur rounded-lg border border-slate-200 shadow-sm overflow-hidden animate-fade-up">
              <div className="min-h-14 px-4 py-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded bg-slate-900 text-white flex items-center justify-center shrink-0">
                    {activeNavItem?.icon || <LayoutDashboard className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sheshaan Global Admin</div>
                    <div className="text-sm font-extrabold text-slate-900 truncate">{activeNavItem?.label || 'Overview'}</div>
                  </div>
                </div>
                <div className="relative w-full xl:max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <SmoothInput
                    value={globalSearch}
                    onChange={setGlobalSearch}
                    placeholder="Search buyers, leads, quotes, invoices, shipments..."
                    className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  {globalResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-10 z-30 rounded-lg border border-slate-200 bg-white shadow-lg p-2">
                      {globalResults.map((result) => (
                        <button
                          key={result.key}
                          type="button"
                          onClick={() => {
                            navigateToTab(result.tab);
                            if (result.buyerId) setSelectedBuyerId(result.buyerId);
                            setGlobalSearch('');
                          }}
                          className="w-full text-left px-3 py-2 rounded hover:bg-slate-50 text-xs"
                        >
                          <span className="block font-bold text-slate-900">{result.label}</span>
                          <span className="block text-[10px] text-slate-500">{result.meta}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setCommandOpen(true)} className="h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-500 text-xs font-semibold flex items-center gap-2 hover:bg-slate-50 transition shadow-inner">
                    <Search className="h-4 w-4 text-slate-400" />
                    <span className="hidden md:inline">Search console...</span>
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-black bg-slate-100 border border-slate-200 rounded text-slate-400">Ctrl+K</kbd>
                  </button>
                  <button type="button" onClick={() => setCopilotOpen(true)} className="h-9 px-3 rounded-md border border-sky-200 bg-sky-50 text-sky-700 text-xs font-bold flex items-center gap-2 hover:bg-sky-100 transition shadow-sm">
                    <Sparkles className="h-4 w-4" />
                    <span>AI Copilot</span>
                  </button>
                  <button type="button" onClick={toggleTheme} className="h-9 w-9 rounded-md border border-slate-200 bg-white text-slate-600 flex items-center justify-center hover:bg-slate-50 transition" title="Toggle Theme">
                    {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-500" />}
                  </button>
                  <button type="button" onClick={runFollowUpAutomation} className="h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition">
                    <Sparkles className="h-4 w-4" />
                    Automate
                  </button>
                  <div className="relative">
                    <button type="button" onClick={() => setShowNotifications((value) => !value)} className="h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition">
                      <Bell className="h-4 w-4" />
                      Alerts
                      {notifications.length > 0 && <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{notifications.length}</span>}
                    </button>
                    {showNotifications && (
                      <div className="absolute right-0 top-10 z-30 w-80 rounded-lg border border-slate-200 bg-white shadow-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-xs text-slate-900">Notification Center</span>
                          <button type="button" onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
                        </div>
                        {notifications.length === 0 ? (
                          <div className="text-xs text-slate-500 py-4 text-center">No active alerts.</div>
                        ) : notifications.slice(0, 8).map((item) => (
                          <button key={item.id} type="button" onClick={() => navigateToTab(item.tab)} className="w-full text-left p-2 rounded hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
                            <span className="block text-xs font-bold text-slate-900">{item.title}</span>
                            <span className="block text-[10px] text-slate-500">{item.meta}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {(isMock || isFirebase) && currentRole === 'Admin' && (
                    <div className="relative">
                      <button type="button" onClick={() => setShowDevMenu((v) => !v)} className="h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition">
                        <Database className="h-4 w-4 text-sky-600 shrink-0" />
                        <span>Database</span>
                      </button>
                      {showDevMenu && (
                        <div className="absolute right-0 top-10 z-30 w-80 rounded-lg border border-slate-200 bg-white shadow-xl p-4 text-xs space-y-3">
                          <div className="border-b pb-2 flex justify-between items-center">
                            <span className="font-bold text-slate-800">Database Tools</span>
                            <span className="text-[10px] bg-sky-50 text-sky-700 font-extrabold px-1.5 py-0.5 rounded">{dbType.split(' ')[0]}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {isFirebase ? 'Connected to Firebase Firestore. Seed will push mock data, Clear will wipe remote Firestore collections.' : 'Using local db.json file storage. Seed will inject standard mock data, Clear will empty database.'}
                          </p>
                          <div className="flex gap-2">
                            <button onClick={() => { fetchData(); setShowDevMenu(false); }} className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[11px] flex items-center justify-center gap-1 border border-slate-200">
                              <RefreshCw className="h-3 w-3" /> Refresh
                            </button>
                            <button onClick={() => { handleSeedMock(); setShowDevMenu(false); }} className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] flex items-center justify-center gap-1 shadow">
                              <Sparkles className="h-3 w-3" /> Seed
                            </button>
                            <button onClick={() => { handleClearMock(); setShowDevMenu(false); }} className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded text-[11px] flex items-center justify-center gap-1">
                              <Trash2 className="h-3 w-3" /> Clear
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <button type="button" onClick={() => navigateToTab('templates')} className="h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition">
                    <Edit2 className="h-4 w-4" />
                    Templates
                  </button>
                  <button type="button" onClick={() => navigateToTab('communications')} className="h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition">
                    <Mail className="h-4 w-4" />
                    Composer
                  </button>
                  <button type="button" onClick={() => setEditingQuoteId(null)} className="h-9 px-3 rounded-md bg-slate-900 text-white text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition shadow-sm">
                    <Plus className="h-4 w-4" />
                    New Quote
                  </button>
                </div>
              </div>
            </div>
            <div key={activeTab} className="bg-white/95 rounded-lg border border-slate-200 shadow-sm p-3 sm:p-5 min-w-0 animate-panel-in">
              {!hasAccessToActiveTab ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 rounded-xl border border-slate-200/60 shadow-inner animate-fade-in my-6">
                  <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center border border-red-100 mb-4 animate-pulse">
                    <Lock className="h-6 w-6 text-red-500" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">Access Denied</h3>
                  <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">Your account role (<span className="font-bold text-red-600">{currentRole}</span>) does not have permission to access the <strong>{activeNavItem?.label || activeTab}</strong> workspace.</p>
                  <button type="button" onClick={() => setActiveTab('overview')} className="mt-5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow active:scale-98 transition">
                    Return to Overview
                  </button>
                </div>
              ) : (
                <>
                  {activeTab === 'manager' && (
                    <div className="space-y-6">
                      <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
                        <div>
                          <h2 className="text-lg font-black text-slate-900">Manager Dashboard</h2>
                          <p className="text-xs text-slate-500">Commercial overview, pipeline conversion rates, and revenue forecasts.</p>
                        </div>
                        <div className="text-xs font-bold text-slate-400">
                          Real-time Database Sync
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-slate-950 text-white rounded-xl border border-slate-800 shadow-sm">
                          <p className="text-[10px] font-extrabold uppercase text-slate-400">Total Pipeline Value</p>
                          <p className="text-2xl font-black mt-1">
                            {formatQuoteCurrency(
                              quotes.reduce((acc, q) => acc + (q.status !== 'Lost' ? quoteValue(q) : 0), 0),
                              'USD'
                            )}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">Sum of active quote values (USD)</p>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                          <p className="text-[10px] font-extrabold uppercase text-slate-400">CRM Conversion Rate</p>
                          <p className="text-2xl font-black mt-1 text-slate-900">
                            {leads.length > 0 ? Math.round((leads.filter(l => l.stage === 'Won').length / leads.length) * 100) : 0}%
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">Won leads vs total inquiries</p>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                          <p className="text-[10px] font-extrabold uppercase text-slate-500">Active Sequences</p>
                          <p className="text-2xl font-black mt-1 text-slate-900">
                            {leads.filter(l => l.sequence_enrolled).length} Enrolled
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">Leads in automated follow-ups</p>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                          <p className="text-[10px] font-extrabold uppercase text-slate-500">Outstanding Invoices</p>
                          <p className="text-2xl font-black mt-1 text-red-600">
                            {formatQuoteCurrency(
                              invoices.reduce((acc, inv) => acc + (inv.payment_status !== 'Paid' ? (inv.balance_amount || inv.amount || 0) : 0), 0),
                              'USD'
                            )}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">Uncollected operational balances</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                          <h3 className="text-xs font-black text-slate-900 mb-3 uppercase tracking-wider">Product Demand Analysis</h3>
                          <div className="space-y-3">
                            {Array.from(new Set(leads.map(l => l.product_interest).filter(Boolean))).slice(0, 5).map((prod) => {
                              const count = leads.filter(l => l.product_interest === prod).length;
                              const pct = Math.round((count / Math.max(1, leads.length)) * 100);
                              return (
                                <div key={prod} className="space-y-1">
                                  <div className="flex justify-between text-xs font-bold text-slate-800">
                                    <span>{prod}</span>
                                    <span>{count} Inquir{count === 1 ? 'y' : 'ies'} ({pct}%)</span>
                                  </div>
                                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-sky-500 rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                            {leads.filter(l => l.product_interest).length === 0 && (
                              <p className="text-xs text-slate-400 font-semibold italic">No product interest records found in database.</p>
                            )}
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                          <h3 className="text-xs font-black text-slate-900 mb-3 uppercase tracking-wider">Team Activity & Performance</h3>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-[10px] font-extrabold text-slate-500">Emails Logged</p>
                              <p className="text-lg font-black text-slate-800 mt-1">
                                {activities.filter(a => a.type === 'Email').length}
                              </p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-[10px] font-extrabold text-slate-500">Calls Logged</p>
                              <p className="text-lg font-black text-slate-800 mt-1">
                                {activities.filter(a => a.type === 'Call').length}
                              </p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-[10px] font-extrabold text-slate-500">Tasks Completed</p>
                              <p className="text-lg font-black text-slate-800 mt-1">
                                {tasks.filter(t => t.status === 'Done').length}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 border-t border-slate-100 pt-3">
                            <p className="text-[10px] font-extrabold uppercase text-slate-400">Database User Profiles</p>
                            <div className="mt-2 space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                              {users.map(u => (
                                <div key={u.id} className="flex justify-between items-center text-xs font-semibold text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-100">
                                  <span className="truncate">{u.name} ({u.role})</span>
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${u.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {u.active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <h3 className="text-xs font-black text-slate-900 mb-3 uppercase tracking-wider">Vendor Performance Matrix</h3>
                        <div className="overflow-x-auto min-w-0 w-full">
                          <table className="min-w-full text-left text-xs text-slate-700">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              <tr>
                                <th className="px-4 py-2">Company</th>
                                <th className="px-4 py-2">Categories</th>
                                <th className="px-4 py-2">Rating</th>
                                <th className="px-4 py-2">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {vendors.slice(0, 8).map(v => (
                                <tr key={v.id} className="hover:bg-slate-50">
                                  <td className="px-4 py-2.5 font-bold text-slate-900 truncate max-w-[150px]">{v.company_name}</td>
                                  <td className="px-4 py-2.5 text-slate-500 truncate max-w-[150px]">{v.product_categories || 'N/A'}</td>
                                  <td className="px-4 py-2.5 font-bold text-amber-500">⭐ {v.rating || 'N/A'}/5</td>
                                  <td className="px-4 py-2.5">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                      v.status === 'Preferred' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                      v.status === 'Active' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>{v.status}</span>
                                  </td>
                                </tr>
                              ))}
                              {vendors.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400 font-semibold italic">No vendor records found.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'actionQueue' && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
                        <div>
                          <h2 className="text-lg font-black text-slate-900">Unified Action Queue</h2>
                          <p className="text-xs text-slate-500">Real-time prioritized operational actions based on database triggers.</p>
                        </div>
                        <div className="text-xs bg-slate-100 text-slate-700 font-extrabold px-3 py-1 rounded-full">
                          {actionQueueItems.length} Pending Actions
                        </div>
                      </div>

                      <div className="space-y-3">
                        {actionQueueItems.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 border border-slate-100 rounded-xl">
                            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                            <p className="text-xs font-bold text-slate-800">Operational Plan Healthy</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">No critical issues or exceptions detected in database.</p>
                          </div>
                        ) : (
                          actionQueueItems.map((item) => (
                            <div key={item.id} className={`p-4 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition hover:shadow-sm ${
                              item.tone === 'critical' ? 'bg-red-50/60 border-red-200/60 text-red-950' :
                              item.tone === 'warning' ? 'bg-amber-50/60 border-amber-200/60 text-amber-950' :
                              'bg-sky-50/60 border-sky-200/60 text-sky-950'
                            }`}>
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                    item.tone === 'critical' ? 'bg-red-200 text-red-900' :
                                    item.tone === 'warning' ? 'bg-amber-200 text-amber-900' :
                                    'bg-sky-200 text-sky-900'
                                  }`}>{item.tone}</span>
                                  <span className="font-extrabold text-xs text-slate-900">{item.title}</span>
                                </div>
                                <p className="text-xs text-slate-700 leading-relaxed font-semibold">{item.detail}</p>
                                <p className="text-[10px] text-slate-400 font-bold">Signal: {item.evidence}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => navigateToTab(item.target)}
                                className="shrink-0 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-lg shadow-sm active:scale-98 transition"
                              >
                                {item.action}
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'overview' && (
            <div className="space-y-5">
              <SmartCommandCenter
                pulse={smartPortalPulse}
                insights={smartPortalInsights}
                busy={appBusy}
                lastSyncedAt={lastSyncedLabel}
                onNavigate={navigateToTab}
                onRunAutomation={runFollowUpAutomation}
              />
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                <Stat icon={<TrendingUp className="h-5 w-5" />} label="Active Deals" value={quotes.length.toString()} tone="sky" />
                <Stat icon={<KanbanSquare className="h-5 w-5" />} label="Hot Leads" value={analytics.hotLeads.toString()} tone="indigo" />
                <Stat icon={<ClipboardList className="h-5 w-5" />} label="Overdue Tasks" value={analytics.overdueTasks.toString()} tone="slate" />
                <Stat icon={<Ship className="h-5 w-5" />} label="Active Shipments" value={analytics.activeShipments.toString()} tone="teal" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <PipelineChart leads={leads} />
                <RevenueTrendChart quotes={quotes} formatQuoteCurrency={formatQuoteCurrency} />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <SimplePanel title="Today Focus" rows={[
                  ['Quote follow-ups', analytics.quoteFollowUps.toString()],
                  ['Pending payments', invoices.filter((invoice) => invoice.payment_status !== 'Paid').length.toString()],
                  ['Open tasks', tasks.filter((task) => task.status !== 'Done').length.toString()],
                  ['Missing documents', checklists.filter((item) => [item.commercial_invoice, item.packing_list, item.certificate_origin, item.phytosanitary, item.insurance, item.bill_of_lading].some((flag) => !flag)).length.toString()]
                ]} />
                <LogisticsCompletionGauge completionRate={analytics.docCompletion} totalCount={checklists.length} />
                <SimplePanel title="Financial Snapshot" rows={[
                  ['Total quoted', formatQuoteCurrency(analytics.totalQuoted, 'INR')],
                  ['Won value', formatQuoteCurrency(analytics.wonValue, 'INR')],
                  ['Pending receivable', formatQuoteCurrency(analytics.pendingInvoiceValue, 'INR')],
                  ['Document completion', `${analytics.docCompletion}%`]
                ]} />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <DashboardList title="Next Tasks" empty="No open tasks." rows={tasks.filter((task) => task.status !== 'Done').slice(0, 6).map((task) => ({
                  title: task.title,
                  meta: `${task.priority} priority | Due ${task.due_date || 'not set'} | ${clients.find((client) => client.id === task.client_id)?.company_name || 'Unlinked'}`
                }))} />
                <DashboardList title="Shipment Watch" empty="No shipments yet." rows={shipments.slice(0, 6).map((shipment) => ({
                  title: shipment.booking_number || shipment.vessel_name || 'Shipment pending booking',
                  meta: `${shipment.status} | ETA ${shipment.eta || 'TBA'} | ${clients.find((client) => client.id === shipment.client_id)?.company_name || 'Unlinked'}`
                }))} />
              </div>
            </div>
          )}

          {activeTab === 'quotes' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 text-xs">
                <label className="lg:col-span-2 relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <SmoothInput value={quoteSearch} onChange={setQuoteSearch} placeholder="Search quote, buyer, email, port, shipment..." className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none" />
                </label>
                <select value={quoteStatusFilter} onChange={(e) => setQuoteStatusFilter(e.target.value as any)} className="px-3 py-2 border border-slate-300 rounded">
                  <option value="All">All Statuses</option>
                  {quoteStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={quoteSort} onChange={(e) => setQuoteSort(e.target.value as QuoteSortKey)} className="px-3 py-2 border border-slate-300 rounded">
                  <option value="created_desc">Newest first</option>
                  <option value="created_asc">Oldest first</option>
                  <option value="value_desc">Highest CIF first</option>
                  <option value="value_asc">Lowest CIF first</option>
                  <option value="buyer_asc">Buyer A-Z</option>
                  <option value="status_asc">Status A-Z</option>
                </select>
                <select value={quoteCurrencyFilter} onChange={(e) => setQuoteCurrencyFilter(e.target.value as any)} className="px-3 py-2 border border-slate-300 rounded">
                  <option value="All">All Currencies</option>
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              {loading && quotes.length === 0 ? (
                <TableSkeleton />
              ) : filteredQuotes.length === 0 ? (
                <EmptyState text="No quotes match the current filters." />
              ) : (
                <>
                  {/* MarginGuard: show for top/newest quote in filtered list */}
                  {filteredQuotes[0] && (
                    <MarginGuard
                      quote={filteredQuotes[0]}
                      fxRate={fxRate}
                      fxRateLoading={fxRateLoading}
                    />
                  )}
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{filteredQuotes.length} quotes</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-400 font-semibold">Density:</span>
                      {(['compact', 'default', 'comfortable'] as const).map(d => (
                        <button key={d} type="button" onClick={() => setRowDensity(d)}
                          className={`text-[9px] px-2 py-0.5 rounded font-bold transition ${rowDensity === d ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                          {d.slice(0, 4)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <table className={`data-grid density-${rowDensity}`}>
                    <thead>
                      <tr>
                        <th className="p-3 w-8"><input type="checkbox" onChange={e => setSelectedQuoteIds(e.target.checked ? filteredQuotes.map(q => q.id) : [])} checked={selectedQuoteIds.length === filteredQuotes.length && filteredQuotes.length > 0} className="rounded" /></th>
                        <th className={`p-3 ${quoteSortCol === 'quote_number' ? quoteSortDir === 'asc' ? 'sort-asc' : 'sort-desc' : ''}`} onClick={() => { setQuoteSortCol('quote_number'); setQuoteSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Reference</th>
                        <th className="p-3">Buyer Company</th>
                        <th className="p-3">Destination Port</th>
                        <th className={`p-3 text-right ${quoteSortCol === 'freight' ? quoteSortDir === 'asc' ? 'sort-asc' : 'sort-desc' : ''}`} onClick={() => { setQuoteSortCol('freight'); setQuoteSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Freight</th>
                        <th className="p-3 text-right">Insurance</th>
                        <th className={`p-3 text-right ${quoteSortCol === 'value' ? quoteSortDir === 'asc' ? 'sort-asc' : 'sort-desc' : ''}`} onClick={() => { setQuoteSortCol('value'); setQuoteSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Total CIF</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredQuotes.map((q) => (
                        <tr key={q.id} className={`transition ${selectedQuoteIds.includes(q.id) ? 'selected' : 'hover:bg-slate-50'}`}>
                          <td className="p-3 w-8"><input type="checkbox" checked={selectedQuoteIds.includes(q.id)} onChange={e => setSelectedQuoteIds(prev => e.target.checked ? [...prev, q.id] : prev.filter(id => id !== q.id))} className="rounded" onClick={ev => ev.stopPropagation()} /></td>
                          <td className="p-3 font-mono font-bold text-slate-900">{q.quote_number}</td>
                          <td className="p-3">
                            <span className="font-bold text-slate-800 block">{q.client?.company_name || 'Unassigned'}</span>
                            <span className="text-[10px] text-slate-400 block">{q.client?.contact_email}</span>
                          </td>
                          <td className="p-3 text-slate-600">{q.client?.destination_port || 'N/A'}</td>
                          <td className="p-3 text-right font-mono text-slate-500">{formatQuoteCurrency(Number(q.freight_cost || 0), q.currency || 'INR')}</td>
                          <td className="p-3 text-right font-mono text-slate-500">{formatQuoteCurrency(Number(q.insurance_cost || 0), q.currency || 'INR')}</td>
                          <td className="p-3 text-right font-mono font-bold text-sky-600">{formatQuoteCurrency(quoteValue(q), q.currency || 'INR')}</td>
                          <td className="p-3 text-center"><StatusBadge status={q.status} /></td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => setEditingQuoteId(q.id)} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition" title="Edit Deal">
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button onClick={() => createInvoiceFromQuote(q)} className="p-1 hover:bg-sky-50 text-slate-500 hover:text-sky-700 rounded transition" title="Auto-create proforma invoice">
                                <FileCheck2 className="h-4 w-4" />
                              </button>
                              <button onClick={() => createShipmentFromQuote(q)} className="p-1 hover:bg-teal-50 text-slate-500 hover:text-teal-700 rounded transition" title="Auto-create shipment">
                                <Ship className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleDeleteQuote(q.id)} disabled={currentRole !== 'Admin'} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition disabled:opacity-40 disabled:hover:bg-transparent" title={currentRole === 'Admin' ? "Delete Deal" : "Only Admins can delete"}>
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Bulk Action Bar */}
                  {selectedQuoteIds.length > 0 && (
                    <div className="bulk-action-bar sticky bottom-0 flex items-center justify-between gap-3 bg-slate-900 text-white px-4 py-2.5 border-t border-slate-700">
                      <span className="text-xs font-bold">{selectedQuoteIds.length} selected</span>
                      <div className="flex items-center gap-2">
                        <select className="text-xs bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" onChange={async e => { const st = e.target.value as Quote['status']; if (!st) return; await Promise.all(selectedQuoteIds.map(id => supabase.from('quotes').update({ status: st }).eq('id', id))); setQuotes(prev => prev.map(q => selectedQuoteIds.includes(q.id) ? { ...q, status: st } : q)); setSelectedQuoteIds([]); showToast(`Updated ${selectedQuoteIds.length} quotes to ${st}`, 'success'); }}>
                          <option value="">Bulk Status…</option>
                          {(['Draft','Sent','Negotiation','Approved','Invoice Raised','Shipped','Closed','Lost'] as Quote['status'][]).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button type="button" onClick={() => setSelectedQuoteIds([])} className="text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 transition">Deselect</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
              )}
            </div>
          )}

          <div className={activeTab === 'crm' ? 'block' : 'hidden'}>
            {hasOpenedCrm && (
              
            <div className="space-y-4">
              {/* Dynamic Metric Grid */}
              <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-white shadow-sm">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-sky-300">Smart CRM Pipeline</p>
                    <h3 className="text-xl font-black">Lead Command OS</h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                      Real-time B2B commodity buyer pipeline. Click rows or cards to open the slide-over Workspace Inspector.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-slate-950">
                    <button
                      type="button"
                      onClick={downloadCrmImportTemplate}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-white/10 border border-white/15 text-white rounded-lg font-bold hover:bg-white/15 transition text-xs"
                    >
                      <Download className="h-4 w-4" />
                      Template
                    </button>
                    <label className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-sky-500 text-white rounded-lg font-bold cursor-pointer hover:bg-sky-400 transition text-xs">
                      <FileCheck2 className="h-4 w-4" />
                      {importingBuyers ? 'Importing...' : 'Import CRM'}
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        disabled={importingBuyers}
                        onChange={(event) => {
                          handleBuyerWorkbookImport(event.target.files?.[0] || null);
                          event.currentTarget.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={runFollowUpAutomation}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-white text-slate-950 rounded-lg font-bold text-xs hover:bg-slate-100 transition"
                    >
                      <Sparkles className="h-4 w-4" />
                      Auto-Tasks
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAllCrmData}
                      disabled={(!leads.length && !clients.length) || loading}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-400 transition text-xs disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                      Purge Data
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 xl:grid-cols-5 gap-2.5">
                  <CrmMetric
                    label="Total Pipeline"
                    value={leads.length.toString()}
                    helper="Leads in stages"
                    active={crmQueueFilter === null}
                    onClick={() => setCrmQueueFilter(null)}
                  />
                  <CrmMetric
                    label="Need Reach Out"
                    value={crmQueues[0].leads.length.toString()}
                    helper="Uncontacted"
                    active={crmQueueFilter === 'Need Reach Out'}
                    onClick={() => setCrmQueueFilter(crmQueueFilter === 'Need Reach Out' ? null : 'Need Reach Out')}
                  />
                  <CrmMetric
                    label="Follow-up Due"
                    value={crmQueues[1].leads.length.toString()}
                    helper="Overdue alerts"
                    active={crmQueueFilter === 'Follow-up Due'}
                    onClick={() => setCrmQueueFilter(crmQueueFilter === 'Follow-up Due' ? null : 'Follow-up Due')}
                  />
                  <CrmMetric
                    label="Next Follow-up"
                    value={crmQueues[2].leads.length.toString()}
                    helper="Scheduled outreach"
                    active={crmQueueFilter === 'Next Follow-up'}
                    onClick={() => setCrmQueueFilter(crmQueueFilter === 'Next Follow-up' ? null : 'Next Follow-up')}
                  />
                  <CrmMetric
                    label="Waiting Reply"
                    value={crmQueues[3].leads.length.toString()}
                    helper="Awaiting response"
                    active={crmQueueFilter === 'Waiting Reply'}
                    onClick={() => setCrmQueueFilter(crmQueueFilter === 'Waiting Reply' ? null : 'Waiting Reply')}
                  />
                </div>
              </div>

              {/* Filter Controls Row */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-3">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                  <div className="relative w-full xl:max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <SmoothInput
                      type="text"
                      placeholder="Search company name, country, phone, product interest..."
                      value={crmSearchQuery}
                      onChange={setCrmSearchQuery}
                      className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-10 text-sm font-semibold text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                    {crmSearchQuery && (
                      <button type="button" onClick={() => setCrmSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-40">
                      <select
                        aria-label="Filter Country"
                        value={crmCountryFilter}
                        onChange={(e) => setCrmCountryFilter(e.target.value)}
                        className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 pr-9 text-xs font-bold text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                      >
                        {['All', ...crmCountries].map((c) => (
                          <option key={c} value={c}>{c === 'All' ? 'All Countries' : c}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                    </div>
                    <div className="relative w-44">
                      <select
                        aria-label="Sort leads"
                        value={crmSortKey}
                        onChange={(e) => setCrmSortKey(e.target.value as typeof crmSortKey)}
                        className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 pr-9 text-xs font-bold text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                      >
                        <option value="action">Action First</option>
                        <option value="reachout">Need Reach Out First</option>
                        <option value="followup">Follow-up Due First</option>
                        <option value="emailfix">Needs Email Fix First</option>
                        <option value="velocity">Smart Velocity Score</option>
                        <option value="country">Country A-Z</option>
                        <option value="stage_new">Stage: New Leads First</option>
                        <option value="stage_contacted">Stage: Contacted First</option>
                        <option value="stage_quoted">Stage: Quoted First</option>
                        <option value="stage_negotiation">Stage: Negotiating First</option>
                        <option value="stage_won">Stage: Won Deals First</option>
                        <option value="stage_lost">Stage: Lost Leads First</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                    </div>

                    {/* View Switcher Toggle buttons */}
                    <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 h-10">
                      <button
                        type="button"
                        onClick={() => setCrmViewMode('table')}
                        className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all ${
                          crmViewMode === 'table' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Grid View
                      </button>
                      <button
                        type="button"
                        onClick={() => setCrmViewMode('kanban')}
                        className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all ${
                          crmViewMode === 'kanban' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Kanban Board
                      </button>
                    </div>

                    {/* Add Lead manual button */}
                    <button
                      type="button"
                      onClick={() => {
                        const emptyLead: CrmLead = {
                          id: 'new-' + Math.random().toString(36).substring(2, 9),
                          company_name: 'New Company Ltd',
                          stage: 'New Lead' as CrmStage,
                          estimated_value: 0
                        };
                        setSelectedCrmLead(emptyLead);
                      }}
                      className="h-10 px-4 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition text-xs"
                    >
                      + Add Lead
                    </button>
                  </div>
                </div>

                {/* Bulk status update bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <div className="text-xs text-slate-500 font-medium">
                    {selectedLeadIds.length > 0 ? (
                      <span>
                        <strong className="text-slate-900">{selectedLeadIds.length}</strong> leads selected
                      </span>
                    ) : (
                      <span>No leads selected for bulk action</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => selectLeadGroup(crmQueues[1].leads)}
                      className="px-3 py-2 bg-amber-50 text-amber-700 rounded-lg font-bold hover:bg-amber-100"
                    >
                      Select Due
                    </button>
                    <button
                      type="button"
                      onClick={() => selectLeadGroup(crmQueues[0].leads)}
                      className="px-3 py-2 bg-sky-50 text-sky-700 rounded-lg font-bold hover:bg-sky-100"
                    >
                      Select Reach Out
                    </button>
                    <button
                      type="button"
                      onClick={() => bulkUpdateSelectedLeads('email_sent')}
                      disabled={!selectedLeadIds.length}
                      className="px-3 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 disabled:opacity-40"
                    >
                      Bulk Contacted
                    </button>
                    <button
                      type="button"
                      onClick={() => bulkUpdateSelectedLeads('followup_due')}
                      disabled={!selectedLeadIds.length}
                      className="px-3 py-2 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-400 disabled:opacity-40"
                    >
                      Bulk Follow-up
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkDeleteLeads}
                      disabled={!selectedLeadIds.length}
                      className="px-3 py-2 bg-rose-600 hover:bg-rose-750 text-white rounded-lg font-bold disabled:opacity-40 transition-colors hover:bg-rose-700"
                    >
                      Bulk Delete
                    </button>
                    {selectedLeadIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedLeadIds([])}
                        className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200"
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Workspace Board view */}
              <div className="mt-4">
                {crmViewMode === 'table' ? (
                  <>
                    <CrmTable
                      leads={visibleCrmLeads}
                      selectedLeadIds={selectedLeadIds}
                      onToggleSelection={handleToggleSelection}
                      onToggleSelectAll={handleToggleSelectAll}
                      onEditLead={handleEditLead}
                      onDeleteLead={handleDeleteLeadFromCrm}
                      onSendEmail={handleSendEmail}
                      onSendWhatsApp={handleLeadWhatsApp}
                      onUpdateStatus={handleUpdateStatus}
                      leadScoreValue={leadScoreValue}
                      leadVelocityScore={leadVelocityScore}
                      bestSendWindowIST={bestSendWindowIST}
                      leadCategoryClass={leadCategoryClass}
                      leadActionCategory={leadActionCategory}
                    />
                    {filteredCrmLeads.length > crmVisibleCount && (
                      <div className="mt-3 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setCrmVisibleCount((prev) => prev + 45)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition text-xs shadow-sm animate-fade-in"
                        >
                          Load More Leads ({filteredCrmLeads.length - crmVisibleCount} remaining)
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <CrmKanban
                    leads={filteredCrmLeads}
                    selectedLeadIds={selectedLeadIds}
                    onToggleSelection={handleToggleSelection}
                    onEditLead={handleEditLead}
                    onDeleteLead={handleDeleteLeadFromCrm}
                    onMoveLead={handleMoveLeadFromCrm}
                    leadScoreValue={leadScoreValue}
                    leadVelocityScore={leadVelocityScore}
                    leadCategoryClass={leadCategoryClass}
                    leadActionCategory={leadActionCategory}
                  />
                )}
              </div>

              {/* Workspace Slide-over Inspector Drawer */}
              <LeadInspectorDrawer
                lead={selectedCrmLead}
                onClose={() => {
                  setSelectedCrmLead(null);
                  fetchData();
                }}
                onSaveLead={handleSaveLeadFromDrawer}
                activities={activities}
              />
            </div>
          
            )}
          </div>

          {activeTab === 'dataSources' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-white shadow-sm">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-sky-300">Imported Source Data</p>
                    <h3 className="text-xl font-black">Embassy and custom researched buyers</h3>
                    <p className="mt-1 max-w-3xl text-xs text-slate-300">Imported buyers are separated by source and stay synced with CRM status, follow-up date, response status, and outreach actions.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-950">
                    <CrmMetric label="Embassy" value={sourceStats.embassy.toString()} helper="Tagged imports" />
                    <CrmMetric label="Research" value={sourceStats.custom.toString()} helper="Custom data" />
                    <CrmMetric label="Reach Out" value={sourceStats.reachout.toString()} helper="Needs first contact" />
                    <CrmMetric label="Follow-up" value={sourceStats.followup.toString()} helper="Due now" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px_160px] gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <SmoothInput
                      type="text"
                      placeholder="Search source data by company, country, email, product, status..."
                      value={sourceSearchQuery}
                      onChange={setSourceSearchQuery}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-9 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20"
                    />
                    {sourceSearchQuery && (
                      <button type="button" onClick={() => setSourceSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" title="Clear search">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <select
                      aria-label="Source Type"
                      value={sourceTypeFilter}
                      onChange={(event) => setSourceTypeFilter(event.target.value as typeof sourceTypeFilter)}
                      className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 pr-9 text-xs font-bold text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    >
                      <option value="All">All Sources</option>
                      <option value="Embassy Data">Embassy Data</option>
                      <option value="Custom Researched Data">Custom Researched</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                  <div className="relative">
                    <select
                      aria-label="Source Country Filter"
                      value={sourceCountryFilter}
                      onChange={(event) => setSourceCountryFilter(event.target.value)}
                      className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 pr-9 text-xs font-bold text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    >
                      {['All', ...sourceCountries].map((country) => (
                        <option key={country} value={country}>{country === 'All' ? 'All Countries' : country}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                  <div className="relative">
                    <select
                      aria-label="Source Action Filter"
                      value={sourceActionFilter}
                      onChange={(event) => setSourceActionFilter(event.target.value)}
                      className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 pr-9 text-xs font-bold text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Need Reach Out">Need Reach Out</option>
                      <option value="Follow-up Due">Follow-up Due</option>
                      <option value="Next Follow-up">Next Follow-up</option>
                      <option value="Waiting Reply">Waiting Reply</option>
                      <option value="Responded / Qualify">Responded</option>
                      <option value="Needs Email Fix">Needs Email Fix</option>
                      <option value="Review">Needs Review</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                  <div className="relative">
                    <select
                      aria-label="Source Sort"
                      value={sourceSortKey}
                      onChange={(event) => setSourceSortKey(event.target.value as typeof sourceSortKey)}
                      className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 pr-9 text-xs font-bold text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    >
                      <option value="source">Sort by Source</option>
                      <option value="action">Sort by Status</option>
                      <option value="followup">Next Follow-up</option>
                      <option value="country">Sort Country A-Z</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
                  <span>Showing <strong className="text-slate-900">{sourceFilteredLeads.length}</strong> source-tagged CRM record{sourceFilteredLeads.length === 1 ? '' : 's'}{sourceCountryFilter !== 'All' ? ` in ${sourceCountryFilter}` : ''}</span>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setSourceActionFilter('Need Reach Out')} className="rounded-lg bg-sky-50 px-3 py-2 font-black text-sky-700 hover:bg-sky-100">Reach Out</button>
                    <button type="button" onClick={() => setSourceActionFilter('Follow-up Due')} className="rounded-lg bg-amber-50 px-3 py-2 font-black text-amber-700 hover:bg-amber-100">Follow-up Due</button>
                    <button type="button" onClick={() => setSourceTypeFilter('Embassy Data')} className="rounded-lg bg-slate-100 px-3 py-2 font-black text-slate-700 hover:bg-slate-200">Embassy</button>
                    <button type="button" onClick={() => setSourceTypeFilter('Custom Researched Data')} className="rounded-lg bg-slate-100 px-3 py-2 font-black text-slate-700 hover:bg-slate-200">Research</button>
                  </div>
                </div>
                {sourceFilteredLeads.length === 0 ? (
                  <EmptyState text="No source-tagged buyers match this filter." />
                ) : (
                  <>
                  <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3">
                    {visibleSourceLeads.map((lead) => {
                      const source = leadDataSource(lead);
                      const action = leadActionCategory(lead);
                      return (
                        <div key={lead.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs shadow-sm">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-black text-slate-950 truncate">{lead.company_name}</div>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${source === 'Embassy Data' ? 'bg-indigo-50 text-indigo-700' : source === 'Custom Researched Data' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{source}</span>
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${leadCategoryClass(action)}`}>{action}</span>
                                {lead.country && <SmallBadge text={lead.country} />}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                editLeadFromCard(lead);
                                navigateToTab('crm');
                              }}
                              className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-black text-slate-700 border border-slate-200 hover:bg-slate-100"
                            >
                              Edit
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <SmallMetric label="Best Email Time" value={bestSendWindowIST(lead.country).replace('Best send: ', '')} />
                            <SmallMetric label="Next Follow-up" value={lead.next_follow_up || 'Not set'} />
                            <SmallMetric label="Email" value={lead.contact_email || 'Missing'} />
                            <SmallMetric label="Phone" value={lead.phone || 'Missing'} />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button type="button" onClick={() => handleLeadEmail(lead, 'First Reach')} className="flex-1 rounded-lg bg-slate-950 px-3 py-2 font-black text-white hover:bg-slate-800">Reach Out Email</button>
                            <button type="button" onClick={() => handleLeadEmail(lead, 'Follow-up')} className="flex-1 rounded-lg bg-amber-500 px-3 py-2 font-black text-white hover:bg-amber-400">Follow-up Email</button>
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-1.5">
                            <button type="button" onClick={() => updateLeadTracking(lead, 'email_sent')} className="rounded bg-sky-50 px-2 py-1 text-[10px] font-black text-sky-700 hover:bg-sky-100">Contacted</button>
                            <button type="button" onClick={() => updateLeadTracking(lead, 'followup_due')} className="rounded bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700 hover:bg-amber-100">Need Follow-up</button>
                            <button type="button" onClick={() => updateLeadTracking(lead, 'responded')} className="rounded bg-teal-50 px-2 py-1 text-[10px] font-black text-teal-700 hover:bg-teal-100">Responded</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {sourceFilteredLeads.length > visibleSourceLeads.length && (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setSourceVisibleCount((count) => Math.min(count + sourceListPageSize, sourceFilteredLeads.length))}
                        className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
                      >
                        Load More Source Data ({sourceFilteredLeads.length - visibleSourceLeads.length})
                      </button>
                    </div>
                  )}
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'communications' && (
            <TwoColumnManager
              formTitle={editingActivityId ? 'Edit Timeline Activity' : 'Add Timeline Activity'}
              onSubmit={(e) => {
                e.preventDefault();
                if (!activityForm.title) return alert('Please enter activity title.');
                saveRecord<TimelineActivity>('activities', editingActivityId, activityForm, resetActivityForm);
              }}
              onCancel={resetActivityForm}
              isEditing={Boolean(editingActivityId)}
              form={
                <>
                  <TextInput label="Title *" value={activityForm.title || ''} onChange={(value) => setActivityForm({ ...activityForm, title: value })} required />
                  <SelectInput label="Type" value={activityForm.type || 'Note'} onChange={(value) => setActivityForm({ ...activityForm, type: value as TimelineActivity['type'] })} options={['Call', 'Email', 'Meeting', 'Quote', 'Invoice', 'Shipment', 'Note', 'Status']} />
                  <TextInput label="Activity Date" type="date" value={activityForm.activity_date || ''} onChange={(value) => setActivityForm({ ...activityForm, activity_date: value })} />
                  <SelectInput label="Buyer" value={activityForm.client_id || ''} onChange={(value) => setActivityForm({ ...activityForm, client_id: value })} options={['', ...clients.map((client) => client.id)]} labels={{ '': 'Unlinked', ...Object.fromEntries(clients.map((client) => [client.id, client.company_name])) }} />
                  <TextArea label="Details" value={activityForm.details || ''} onChange={(value) => setActivityForm({ ...activityForm, details: value })} />
                </>
              }
            >
              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs space-y-3">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Send className="h-4 w-4 text-sky-600" />
                    Buyer Message Composer
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <SelectInput label="Buyer" value={communicationClient?.id || ''} onChange={setSelectedCommunicationClientId} options={clients.map((client) => client.id)} labels={Object.fromEntries(clients.map((client) => [client.id, client.company_name]))} />
                    <SelectInput label="Template" value={selectedTemplate?.id || ''} onChange={setSelectedTemplateId} options={templates.map((template) => template.id)} labels={Object.fromEntries(templates.map((template) => [template.id, template.name]))} />
                  </div>
                  <div className="bg-white rounded border border-slate-200 p-3">
                    <div className="font-semibold text-slate-800">{replaceTemplateVars(selectedTemplate?.subject || '') || 'No subject'}</div>
                    <p className="mt-2 text-slate-600 whitespace-pre-line">{replaceTemplateVars(selectedTemplate?.body || 'Create a template to generate filled email or WhatsApp messages here.')}</p>
                  </div>
                </div>
                {activities.length === 0 ? <EmptyState text="No customer timeline activities yet." /> : activities.map((activity) => (
                  <div key={activity.id} className="bg-white border border-slate-200 rounded-lg p-4 text-xs shadow-sm">
                    <div className="flex justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900">{activity.title}</div>
                        <div className="text-[10px] text-slate-400">{activity.type} | {activity.activity_date} | {clients.find((client) => client.id === activity.client_id)?.company_name || 'Unlinked'}</div>
                      </div>
                      <RowActions currentRole={currentRole} onEdit={() => { setEditingActivityId(activity.id); setActivityForm(activity); }} onDelete={() => deleteRecord('activities', activity.id, 'activity')} />
                    </div>
                    {activity.details && <p className="mt-2 text-slate-600">{activity.details}</p>}
                  </div>
                ))}
              </div>
            </TwoColumnManager>
          )}

          {activeTab === 'templates' && (
            <TwoColumnManager
              formTitle={editingTemplateId ? 'Edit Template' : 'Add Mail / Message Template'}
              onSubmit={(e) => {
                e.preventDefault();
                if (!templateForm.name || !templateForm.body) return alert('Please enter template name and body.');
                saveRecord<MessageTemplate>('message_templates', editingTemplateId, {
                  ...templateForm,
                  active: templateForm.active !== false
                }, resetTemplateForm);
              }}
              onCancel={resetTemplateForm}
              isEditing={Boolean(editingTemplateId)}
              form={
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => applyTemplateStarter('product_pitch')} className="px-2 py-1.5 bg-sky-50 text-sky-700 rounded font-bold hover:bg-sky-100">Product Pitch</button>
                    <button type="button" onClick={() => applyTemplateStarter('catalogue_pitch')} className="px-2 py-1.5 bg-slate-100 text-slate-700 rounded font-bold hover:bg-slate-200">General Pitch</button>
                    <button type="button" onClick={() => applyTemplateStarter('follow_up')} className="px-2 py-1.5 bg-amber-50 text-amber-700 rounded font-bold hover:bg-amber-100">Follow-up</button>
                    <button type="button" onClick={() => applyTemplateStarter('whatsapp_intro')} className="px-2 py-1.5 bg-emerald-50 text-emerald-700 rounded font-bold hover:bg-emerald-100">WhatsApp</button>
                  </div>
                  <TextInput label="Template Name *" value={templateForm.name || ''} onChange={(value) => setTemplateForm({ ...templateForm, name: value })} required />
                  <SelectInput label="Channel" value={templateForm.channel || 'Email'} onChange={(value) => setTemplateForm({ ...templateForm, channel: value as MessageTemplate['channel'] })} options={['Email', 'WhatsApp', 'SMS']} />
                  <SelectInput label="Category" value={templateForm.category || 'General'} onChange={(value) => setTemplateForm({ ...templateForm, category: value as MessageTemplate['category'] })} options={['Introduction', 'Quote Follow-up', 'Payment Reminder', 'Shipment Update', 'Document Sharing', 'General']} />
                  <TextInput label="Email Subject" value={templateForm.subject || ''} onChange={(value) => setTemplateForm({ ...templateForm, subject: value })} />
                  <TextArea label="Message Body *" value={templateForm.body || ''} onChange={(value) => setTemplateForm({ ...templateForm, body: value })} />
                  <CheckboxInput label="Active Template" checked={templateForm.active !== false} onChange={(value) => setTemplateForm({ ...templateForm, active: value })} />
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[10px] text-slate-600 leading-relaxed">
                    Variables: {'{{buyer_name}}'}, {'{{client_name}}'}, {'{{company_name}}'}, {'{{product_name}}'}, {'{{product_description}}'}, {'{{product_catalogue}}'}, {'{{destination_port}}'}, {'{{quote_number}}'}, {'{{total_value}}'}.
                  </div>
                </>
              }
            >
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="space-y-3">
                  {templates.length === 0 ? <EmptyState text="No templates saved yet." /> : templates.map((template) => (
                    <div key={template.id} className="bg-white border border-slate-200 rounded-lg p-4 text-xs shadow-sm">
                      <div className="flex justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-900">{template.name}</div>
                          <div className="text-[10px] text-slate-400">{template.channel} | {template.category} | {template.active ? 'Active' : 'Inactive'}</div>
                        </div>
                        <RowActions currentRole={currentRole} onEdit={() => { setEditingTemplateId(template.id); setTemplateForm(template); }} onDelete={() => deleteRecord('message_templates', template.id, 'template')} />
                      </div>
                      {template.subject && <p className="mt-2 font-semibold text-slate-700">{template.subject}</p>}
                      <p className="mt-2 text-slate-600 whitespace-pre-line line-clamp-4">{template.body}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 h-fit text-xs space-y-3">
                  <h3 className="font-bold text-slate-900">Personalized Preview</h3>
                  <SelectInput label="Template" value={selectedTemplate?.id || ''} onChange={setSelectedTemplateId} options={templates.map((template) => template.id)} labels={Object.fromEntries(templates.map((template) => [template.id, template.name]))} />
                  <SelectInput label="Buyer / Client" value={templatePreviewClient?.id || ''} onChange={setSelectedTemplateClientId} options={clients.map((client) => client.id)} labels={Object.fromEntries(clients.map((client) => [client.id, `${client.contact_name || client.company_name} - ${client.company_name}`]))} />
                  <SelectInput label="Product Focus" value={selectedTemplateProductId} onChange={setSelectedTemplateProductId} options={['', ...products.map((product) => product.id)]} labels={{ '': 'No specific product - pitch full range', ...Object.fromEntries(products.map((product) => [product.id, product.sku])) }} />
                  <div className="bg-white border border-slate-200 rounded p-3">
                    <div className="font-bold text-slate-700">{replaceTemplateVars(selectedTemplate?.subject || '', { client: templatePreviewClient, product: templatePreviewProduct }) || 'Message Preview'}</div>
                    <p className="mt-2 whitespace-pre-line text-slate-600">{replaceTemplateVars(selectedTemplate?.body || 'Choose a saved template to preview buyer-specific text.', { client: templatePreviewClient, product: templatePreviewProduct })}</p>
                  </div>
                  <button type="button" onClick={() => navigator.clipboard?.writeText(`${replaceTemplateVars(selectedTemplate?.subject || '', { client: templatePreviewClient, product: templatePreviewProduct })}\n\n${replaceTemplateVars(selectedTemplate?.body || '', { client: templatePreviewClient, product: templatePreviewProduct })}`)} className="w-full py-2 bg-slate-900 text-white rounded font-semibold flex items-center justify-center gap-2">
                    <Copy className="h-4 w-4" />
                    Copy Filled Message
                  </button>
                </div>
              </div>
            </TwoColumnManager>
          )}

          {activeTab === 'tasks' && (
            <TwoColumnManager
              formTitle={editingTaskId ? 'Edit Task / Reminder' : 'Add Task / Reminder'}
              onSubmit={(e) => {
                e.preventDefault();
                if (!taskForm.title) return alert('Please enter task title.');
                saveRecord<TaskRecord>('tasks', editingTaskId, taskForm, resetTaskForm);
              }}
              onCancel={resetTaskForm}
              isEditing={Boolean(editingTaskId)}
              form={
                <>
                  <TextInput label="Task Title *" value={taskForm.title || ''} onChange={(value) => setTaskForm({ ...taskForm, title: value })} required />
                  <SelectInput label="Status" value={taskForm.status || 'Open'} onChange={(value) => setTaskForm({ ...taskForm, status: value as TaskRecord['status'] })} options={['Open', 'In Progress', 'Done']} />
                  <SelectInput label="Priority" value={taskForm.priority || 'Medium'} onChange={(value) => setTaskForm({ ...taskForm, priority: value as TaskRecord['priority'] })} options={['Low', 'Medium', 'High']} />
                  <TextInput label="Due Date" type="date" value={taskForm.due_date || ''} onChange={(value) => setTaskForm({ ...taskForm, due_date: value })} />
                  <TextInput label="Owner" value={taskForm.owner || ''} onChange={(value) => setTaskForm({ ...taskForm, owner: value })} />
                  <SelectInput label="Buyer" value={taskForm.client_id || ''} onChange={(value) => setTaskForm({ ...taskForm, client_id: value })} options={['', ...clients.map((client) => client.id)]} labels={{ '': 'Unlinked', ...Object.fromEntries(clients.map((client) => [client.id, client.company_name])) }} />
                  <SelectInput label="Quote" value={taskForm.quote_id || ''} onChange={(value) => setTaskForm({ ...taskForm, quote_id: value })} options={['', ...quotes.map((quote) => quote.id)]} labels={{ '': 'Unlinked', ...Object.fromEntries(quotes.map((quote) => [quote.id, quote.quote_number])) }} />
                  <TextArea label="Notes" value={taskForm.notes || ''} onChange={(value) => setTaskForm({ ...taskForm, notes: value })} />
                </>
              }
            >
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {['Open', 'In Progress', 'Done'].map((status) => (
                  <div key={status} className="bg-slate-50 border border-slate-200 rounded-lg p-3 min-h-[180px]">
                    <h4 className="text-[11px] font-bold text-slate-600 uppercase mb-3">{status}</h4>
                    <div className="space-y-2">
                      {tasks.filter((task) => task.status === status).map((task) => (
                        <div key={task.id} className="bg-white border border-slate-200 rounded p-3 text-xs shadow-sm">
                          <div className="flex justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-900">{task.title}</div>
                              <div className="text-[10px] text-slate-500">{task.priority} | Due {task.due_date || 'Not set'} | {task.owner || 'Unassigned'}</div>
                            </div>
                            <RowActions currentRole={currentRole} onEdit={() => { setEditingTaskId(task.id); setTaskForm(task); }} onDelete={() => deleteRecord('tasks', task.id, 'task')} />
                          </div>
                          <div className="mt-2 text-[10px] text-slate-400">{clients.find((client) => client.id === task.client_id)?.company_name || 'Unlinked buyer'} | {quotes.find((quote) => quote.id === task.quote_id)?.quote_number || 'No quote'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TwoColumnManager>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Stat icon={<BarChart3 className="h-5 w-5" />} label="Total Quoted" value={formatQuoteCurrency(analytics.totalQuoted, 'INR')} tone="sky" />
                <Stat icon={<TrendingUp className="h-5 w-5" />} label="Won Value" value={formatQuoteCurrency(analytics.wonValue, 'INR')} tone="teal" />
                <Stat icon={<FileCheck2 className="h-5 w-5" />} label="Pending Invoice" value={formatQuoteCurrency(analytics.pendingInvoiceValue, 'INR')} tone="indigo" />
                <Stat icon={<Ship className="h-5 w-5" />} label="Active Shipments" value={analytics.activeShipments.toString()} tone="slate" />
                <Stat icon={<CheckSquare className="h-5 w-5" />} label="Document Completion" value={`${analytics.docCompletion}%`} tone="teal" />
                <Stat icon={<History className="h-5 w-5" />} label="Avg Freight Rate" value={formatQuoteCurrency(analytics.averageFreight, 'INR')} tone="sky" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SimplePanel title="Pipeline By Stage" rows={['New Lead', 'Contacted', 'Quoted', 'Negotiation', 'Won', 'Lost'].map((stage) => [stage, leads.filter((lead) => lead.stage === stage).length.toString()])} />
                <SimplePanel title="Invoice Status" rows={['Pending', 'Part Paid', 'Paid', 'Overdue'].map((status) => [status, invoices.filter((invoice) => invoice.payment_status === status).length.toString()])} />
              </div>
            </div>
          )}

          {activeTab === 'phoneReachout' && (
            <div className="space-y-5">
              {/* Header and Statistics Panel */}
              <div className="bg-slate-950 text-white rounded-lg p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Outreach automation</p>
                    <h3 className="text-xl font-extrabold">Phone & WhatsApp Reachout</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      The CRM automatically finds which buyers have phone numbers registered directly or via linked CRM leads, and prepares quick WhatsApp intro templates.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded px-3 py-2 text-right">
                      <span className="block text-[9px] uppercase font-bold text-emerald-300">Ready for Reachout</span>
                      <span className="font-extrabold text-lg text-emerald-400">{reachoutBuyers.length} Buyers</span>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-right">
                      <span className="block text-[9px] uppercase font-bold text-slate-400">Total Buyers</span>
                      <span className="font-extrabold text-lg text-white">{clients.length} Buyers</span>
                    </div>
                  </div>
                </div>

                {/* Search and Filters */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px_180px] gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <SmoothInput
                      type="text"
                      placeholder="Search reachout list by company, country, contact, or phone..."
                      value={reachoutSearchQuery}
                      onChange={setReachoutSearchQuery}
                      className="w-full h-10 bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="relative">
                    <select
                      aria-label="Reachout Country Filter"
                      value={reachoutCountryFilter}
                      onChange={(event) => setReachoutCountryFilter(event.target.value)}
                      className="h-10 w-full appearance-none rounded-lg border border-slate-800 bg-slate-900 px-3 pr-9 text-xs font-bold text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    >
                      {['All', ...reachoutCountries].map((country) => (
                        <option key={country} value={country}>{country === 'All' ? 'All Countries' : country}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                  <div className="relative">
                    <select
                      aria-label="Reachout Sort"
                      value={reachoutSortKey}
                      onChange={(event) => setReachoutSortKey(event.target.value as typeof reachoutSortKey)}
                      className="h-10 w-full appearance-none rounded-lg border border-slate-800 bg-slate-900 px-3 pr-9 text-xs font-bold text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="name">Company A-Z</option>
                      <option value="country">Country A-Z</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Main content grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Reachable Buyers list */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <h3 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      Identified Sourcing Contacts ({filteredReachoutBuyers.length})
                    </h3>

                    {filteredReachoutBuyers.length === 0 ? (
                      <EmptyState text="No buyers with phone numbers identified in the CRM. You can add phone numbers to buyers below." />
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {visibleReachoutBuyers
                          .map((b) => {
                            const phone = b.phone || clientPhones[b.id] || '';
                            const country = buyerCountry(b);
                            const lastActivity = whatsappActivityByClientId[b.id];

                            return (
                              <div key={b.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-extrabold text-slate-900 text-sm">{b.company_name}</h4>
                                    <SmallBadge text={country} />
                                  </div>
                                  <div className="text-slate-500 font-medium">
                                    Contact: <span className="text-slate-800">{b.contact_name || 'N/A'}</span>
                                    {b.contact_email && <span className="mx-1.5 text-slate-300">|</span>}
                                    {b.contact_email && <span className="text-slate-600">{b.contact_email}</span>}
                                  </div>
                                  {editingPhoneBuyerId === b.id ? (
                                    <div className="flex items-center gap-1.5 pt-0.5">
                                      <input
                                        type="text"
                                        aria-label="Edit Phone Number"
                                        value={editingPhoneValue}
                                        onChange={(e) => setEditingPhoneValue(e.target.value)}
                                        className="px-2 py-0.5 border border-slate-300 bg-slate-50 rounded text-xs font-mono w-44 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSavePhone(b.id, editingPhoneValue);
                                          if (e.key === 'Escape') setEditingPhoneBuyerId(null);
                                        }}
                                        autoFocus
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSavePhone(b.id, editingPhoneValue)}
                                        className="p-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded transition"
                                        title="Save Phone"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingPhoneBuyerId(null)}
                                        className="p-1 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded transition"
                                        title="Cancel"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600">
                                      <Phone className="h-3 w-3 text-slate-400" />
                                      <span>{phone}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingPhoneBuyerId(b.id);
                                          setEditingPhoneValue(phone);
                                        }}
                                        className="p-0.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition"
                                        title="Edit Phone"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteBuyerPhone(b, phone)}
                                        className="p-0.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition"
                                        title="Remove Invalid Phone"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  )}
                                  {lastActivity ? (
                                    <div className="text-[10px] text-emerald-600 font-medium">
                                      Last Reachout: {lastActivity.title} on {lastActivity.activity_date}
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-slate-400">
                                      No WhatsApp reachout logged yet
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 self-start sm:self-center">
                                  <button
                                    type="button"
                                    onClick={() => handleBuyerWhatsAppReachout(b, phone)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-sm transition active:scale-[0.98]"
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                    WhatsApp Intro
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedBuyerId(b.id)}
                                    className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-bold transition"
                                  >
                                    View Details
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        {filteredReachoutBuyers.length > visibleReachoutBuyers.length && (
                          <div className="pt-4 flex justify-center">
                            <button
                              type="button"
                              onClick={() => setReachoutVisibleCount((count) => Math.min(count + reachoutListPageSize, filteredReachoutBuyers.length))}
                              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                            >
                              Load More Contacts
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side panel: Missing numbers */}
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <h3 className="text-sm font-extrabold text-slate-900 mb-2 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                      Missing Phone Numbers ({missingPhoneBuyers.length})
                    </h3>
                    <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                      These buyers do not have a phone number in the system. Add their phone numbers to enable one-click WhatsApp outreach.
                    </p>

                    <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1">
                      {visibleMissingPhoneBuyers
                        .map((client) => (
                          <div key={client.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-3 text-xs">
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-800 truncate">{client.company_name}</h4>
                              <p className="text-[10px] text-slate-500 truncate">{client.contact_name || 'No contact name'}</p>
                            </div>
                            {editingPhoneBuyerId === client.id ? (
                              <div className="flex items-center gap-1 shrink-0">
                                <input
                                  type="text"
                                  aria-label="Add Phone Number"
                                  placeholder="Phone"
                                  value={editingPhoneValue}
                                  onChange={(e) => setEditingPhoneValue(e.target.value)}
                                  className="px-2 py-0.5 border border-slate-300 bg-white rounded text-[11px] font-mono w-28 focus:border-emerald-500 focus:outline-none"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSavePhone(client.id, editingPhoneValue);
                                    if (e.key === 'Escape') setEditingPhoneBuyerId(null);
                                  }}
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSavePhone(client.id, editingPhoneValue)}
                                  className="p-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded transition"
                                  title="Save Phone"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingPhoneBuyerId(null)}
                                  className="p-1 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded transition"
                                  title="Cancel"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPhoneBuyerId(client.id);
                                  setEditingPhoneValue('');
                                }}
                                className="shrink-0 px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded font-bold transition"
                              >
                                Add Phone
                              </button>
                            )}
                          </div>
                        ))}
                      {missingPhoneBuyers.length > visibleMissingPhoneBuyers.length && (
                        <button
                          type="button"
                          onClick={() => setMissingPhoneVisibleCount((count) => Math.min(count + missingPhonePageSize, missingPhoneBuyers.length))}
                          className="w-full rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-bold text-white hover:bg-slate-800 transition"
                        >
                          Load More Missing Numbers
                        </button>
                      )}
                      {missingPhoneBuyers.length === 0 && (
                        <div className="text-center py-4 text-[11px] text-slate-400 font-medium">
                          All buyers have phone numbers.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Intro template details */}
                  <div className="bg-emerald-950 text-white rounded-xl p-4 shadow-sm space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Template Information</h4>
                    <p className="text-[11px] text-emerald-200 leading-relaxed">
                      WhatsApp Intro buttons use the <strong>WhatsApp Introduction</strong> category template. You can customize the body and variables of this message in the <strong>Mail & Message Templates</strong> tab.
                    </p>
                    <div className="bg-white/10 rounded p-2.5 text-[10px] border border-white/5 font-mono text-emerald-100">
                      Hello {'{{buyer_name}}'}, this is Sheshaan Global...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <TwoColumnManager
              formTitle={editingProductId ? 'Edit Product SKU' : 'Register Product SKU'}
              onSubmit={saveProduct}
              onCancel={resetProductForm}
              isEditing={Boolean(editingProductId)}
              form={
                <>
                  <TextInput label="SKU *" value={productForm.sku || ''} onChange={(value) => setProductForm({ ...productForm, sku: value })} required />
                  <NumberInput label="Selling Price / kg *" value={Number(productForm.unit_price) || 0} onChange={(value) => setProductForm({ ...productForm, unit_price: value })} />
                  <NumberInput label="Internal Cost / kg" value={Number(productForm.cost_price) || 0} onChange={(value) => setProductForm({ ...productForm, cost_price: value })} />
                  <NumberInput label="Gross Weight per Unit (kg)" value={Number(productForm.weight) || 0} onChange={(value) => setProductForm({ ...productForm, weight: value })} />
                  <TextInput label="Dimensions (LxWxH)" value={productForm.dimensions || ''} onChange={(value) => setProductForm({ ...productForm, dimensions: value })} />
                  <TextArea label="Description & Specifications" value={productForm.description || ''} onChange={(value) => setProductForm({ ...productForm, description: value })} />
                </>
              }
            >
              {products.length === 0 ? <EmptyState text="No product SKUs registered." /> : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                        <th className="p-3">SKU</th>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Sell / kg</th>
                        <th className="p-3 text-right">Cost / kg</th>
                        <th className="p-3 text-right">Weight</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-mono font-semibold text-slate-900">{p.sku}</td>
                          <td className="p-3 text-slate-600 max-w-[240px] truncate" title={p.description}>{p.description?.split('\n')[0] || 'N/A'}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800">{formatQuoteCurrency(Number(p.unit_price || 0), 'INR')}</td>
                          <td className="p-3 text-right font-mono text-slate-500">{formatQuoteCurrency(Number(p.cost_price || 0), 'INR')}</td>
                          <td className="p-3 text-right text-slate-500">{p.weight ? `${p.weight} kg` : 'N/A'}</td>
                          <td className="p-3"><RowActions currentRole={currentRole} onEdit={() => { setEditingProductId(p.id); setProductForm(p); }} onDelete={() => deleteProduct(p.id)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TwoColumnManager>
          )}

          {activeTab === 'vendors' && (
            <TwoColumnManager
              formTitle={editingVendorId ? 'Edit Supplier / Vendor' : 'Add Supplier / Vendor'}
              onSubmit={saveVendor}
              onCancel={resetVendorForm}
              isEditing={Boolean(editingVendorId)}
              form={
                <>
                  <TextInput label="Company Name *" value={vendorForm.company_name || ''} onChange={(value) => setVendorForm({ ...vendorForm, company_name: value })} required />
                  <TextInput label="Contact Person" value={vendorForm.contact_name || ''} onChange={(value) => setVendorForm({ ...vendorForm, contact_name: value })} />
                  <TextInput label="Email" type="email" value={vendorForm.contact_email || ''} onChange={(value) => setVendorForm({ ...vendorForm, contact_email: value })} />
                  <TextInput label="Phone / WhatsApp" value={vendorForm.phone || ''} onChange={(value) => setVendorForm({ ...vendorForm, phone: value })} />
                  <TextInput label="City" value={vendorForm.city || ''} onChange={(value) => setVendorForm({ ...vendorForm, city: value })} />
                  <TextInput label="Country" value={vendorForm.country || ''} onChange={(value) => setVendorForm({ ...vendorForm, country: value })} />
                  <TextInput label="Product Categories" value={vendorForm.product_categories || ''} onChange={(value) => setVendorForm({ ...vendorForm, product_categories: value })} />
                  <TextInput label="Payment Terms" value={vendorForm.payment_terms || ''} onChange={(value) => setVendorForm({ ...vendorForm, payment_terms: value })} />
                  <NumberInput label="Rating (1-5)" value={Number(vendorForm.rating) || 3} onChange={(value) => setVendorForm({ ...vendorForm, rating: Math.max(1, Math.min(5, Math.round(value))) })} />
                  <SelectInput label="Status" value={vendorForm.status || 'Active'} onChange={(value) => setVendorForm({ ...vendorForm, status: value as Vendor['status'] })} options={['Active', 'Preferred', 'On Hold']} />
                  <TextArea label="Notes" value={vendorForm.notes || ''} onChange={(value) => setVendorForm({ ...vendorForm, notes: value })} />
                </>
              }
            >
              {vendors.length === 0 ? <EmptyState text="No suppliers or vendors registered yet." /> : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {vendors.map((vendor) => (
                    <div key={vendor.id} className="bg-white border border-slate-200 rounded-lg p-4 text-xs shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-900">{vendor.company_name}</div>
                          <div className="text-[10px] text-slate-500">{vendor.city || 'City N/A'}, {vendor.country || 'Country N/A'} | {vendor.status}</div>
                        </div>
                        <RowActions currentRole={currentRole} onEdit={() => { setEditingVendorId(vendor.id); setVendorForm(vendor); }} onDelete={() => deleteRecord('vendors', vendor.id, 'supplier/vendor')} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <SmallMetric label="Categories" value={vendor.product_categories || 'Not set'} />
                        <SmallMetric label="Payment" value={vendor.payment_terms || 'Not set'} />
                        <SmallMetric label="Rating" value={`${vendor.rating || 3}/5`} />
                        <SmallMetric label="Contact" value={vendor.contact_name || vendor.phone || 'Not set'} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {vendor.contact_email && <a href={`mailto:${vendor.contact_email}`} className="px-3 py-1.5 rounded bg-slate-900 text-white font-bold flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</a>}
                        {vendor.phone && <a target="_blank" rel="noreferrer" href={`https://wa.me/${vendor.phone.replace(/[^\d]/g, '')}`} className="px-3 py-1.5 rounded bg-emerald-600 text-white font-bold flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> WhatsApp</a>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TwoColumnManager>
          )}

          {activeTab === 'freight' && (
            <TwoColumnManager
              formTitle={editingPresetId ? 'Edit Freight Preset' : 'Add Freight Preset'}
              onSubmit={savePreset}
              onCancel={resetPresetForm}
              isEditing={Boolean(editingPresetId)}
              form={
                <>
                  <TextInput label="Preset Name *" value={presetForm.name || ''} onChange={(value) => setPresetForm({ ...presetForm, name: value })} required />
                  <TextInput label="Loading Port *" value={presetForm.loading_port || ''} onChange={(value) => setPresetForm({ ...presetForm, loading_port: value })} required />
                  <TextInput label="Destination Port *" value={presetForm.destination_port || ''} onChange={(value) => setPresetForm({ ...presetForm, destination_port: value })} required />
                  <TextInput label="Shipment Mode" value={presetForm.shipment_mode || ''} onChange={(value) => setPresetForm({ ...presetForm, shipment_mode: value })} />
                  <NumberInput label="Freight Cost" value={Number(presetForm.freight_cost) || 0} onChange={(value) => setPresetForm({ ...presetForm, freight_cost: value })} />
                  <NumberInput label="Insurance Cost" value={Number(presetForm.insurance_cost) || 0} onChange={(value) => setPresetForm({ ...presetForm, insurance_cost: value })} />
                  <TextInput label="Shipment Window" value={presetForm.shipment_window || ''} onChange={(value) => setPresetForm({ ...presetForm, shipment_window: value })} />
                  <TextInput label="Transit Time" value={presetForm.transit_time || ''} onChange={(value) => setPresetForm({ ...presetForm, transit_time: value })} />
                  <TextInput label="Partial / Transshipment" value={presetForm.partial_shipment || ''} onChange={(value) => setPresetForm({ ...presetForm, partial_shipment: value })} />
                  <TextInput label="Container Type" value={presetForm.container_type || ''} onChange={(value) => setPresetForm({ ...presetForm, container_type: value })} />
                  <TextArea label="Storage Condition" value={presetForm.storage_condition || ''} onChange={(value) => setPresetForm({ ...presetForm, storage_condition: value })} />
                </>
              }
            >
              {freightPresets.length === 0 ? <EmptyState text="No freight presets yet." /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {freightPresets.map((p) => (
                    <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
                      <div className="flex justify-between gap-3">
                        <h4 className="font-bold text-slate-900">{p.name}</h4>
                        <RowActions currentRole={currentRole} onEdit={() => { setEditingPresetId(p.id); setPresetForm(p); }} onDelete={() => deletePreset(p.id)} />
                      </div>
                      <p className="font-mono text-slate-600">{p.loading_port} {'->'} {p.destination_port}</p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                        <span>Freight: {formatQuoteCurrency(Number(p.freight_cost || 0), 'INR')}</span>
                        <span>Insurance: {formatQuoteCurrency(Number(p.insurance_cost || 0), 'INR')}</span>
                        <span>Mode: {p.shipment_mode}</span>
                        <span>Transit: {p.transit_time || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TwoColumnManager>
          )}

          {activeTab === 'rates' && (
            <TwoColumnManager
              formTitle={editingRateId ? 'Edit Freight Rate' : 'Add Freight Rate'}
              onSubmit={(e) => {
                e.preventDefault();
                if (!rateForm.loading_port || !rateForm.destination_port) return alert('Please enter loading and destination ports.');
                saveRecord<FreightRateHistory>('freight_rate_history', editingRateId, {
                  ...rateForm,
                  freight_cost: Number(rateForm.freight_cost) || 0,
                  insurance_cost: Number(rateForm.insurance_cost) || 0
                }, resetRateForm);
              }}
              onCancel={resetRateForm}
              isEditing={Boolean(editingRateId)}
              form={
                <>
                  <TextInput label="Loading Port *" value={rateForm.loading_port || ''} onChange={(value) => setRateForm({ ...rateForm, loading_port: value })} required />
                  <TextInput label="Destination Port *" value={rateForm.destination_port || ''} onChange={(value) => setRateForm({ ...rateForm, destination_port: value })} required />
                  <TextInput label="Shipment Mode" value={rateForm.shipment_mode || ''} onChange={(value) => setRateForm({ ...rateForm, shipment_mode: value })} />
                  <TextInput label="Forwarder" value={rateForm.forwarder || ''} onChange={(value) => setRateForm({ ...rateForm, forwarder: value })} />
                  <NumberInput label="Freight Cost" value={Number(rateForm.freight_cost) || 0} onChange={(value) => setRateForm({ ...rateForm, freight_cost: value })} />
                  <NumberInput label="Insurance Cost" value={Number(rateForm.insurance_cost) || 0} onChange={(value) => setRateForm({ ...rateForm, insurance_cost: value })} />
                  <SelectInput label="Currency" value={rateForm.currency || 'INR'} onChange={(value) => setRateForm({ ...rateForm, currency: value as FreightRateHistory['currency'] })} options={['INR', 'USD']} />
                  <TextInput label="Effective Date" type="date" value={rateForm.effective_date || ''} onChange={(value) => setRateForm({ ...rateForm, effective_date: value })} />
                  <TextInput label="Validity Date" type="date" value={rateForm.validity_date || ''} onChange={(value) => setRateForm({ ...rateForm, validity_date: value })} />
                  <TextArea label="Notes" value={rateForm.notes || ''} onChange={(value) => setRateForm({ ...rateForm, notes: value })} />
                </>
              }
            >
              <DataTable headers={['Route', 'Forwarder', 'Mode', 'Freight', 'Insurance', 'Effective', 'Actions']}>
                {freightRates.map((rate) => (
                  <tr key={rate.id} className="border-b border-slate-100">
                    <td className="p-3 font-semibold">{rate.loading_port} {'->'} {rate.destination_port}</td>
                    <td className="p-3">{rate.forwarder || 'N/A'}</td>
                    <td className="p-3">{rate.shipment_mode}</td>
                    <td className="p-3 text-right font-mono">{formatQuoteCurrency(Number(rate.freight_cost || 0), rate.currency || 'INR')}</td>
                    <td className="p-3 text-right font-mono">{formatQuoteCurrency(Number(rate.insurance_cost || 0), rate.currency || 'INR')}</td>
                    <td className="p-3">{rate.effective_date || 'N/A'}</td>
                    <td className="p-3"><RowActions currentRole={currentRole} onEdit={() => { setEditingRateId(rate.id); setRateForm(rate); }} onDelete={() => deleteRecord('freight_rate_history', rate.id, 'freight rate')} /></td>
                  </tr>
                ))}
              </DataTable>
            </TwoColumnManager>
          )}

          {activeTab === 'accounts' && (
            <TwoColumnManager
              formTitle={editingInvoiceId ? 'Edit Invoice' : 'Add Proforma / Tax Invoice'}
              onSubmit={(e) => {
                e.preventDefault();
                if (!invoiceForm.invoice_number) return alert('Please enter invoice number.');
                saveRecord<InvoiceRecord>('invoices', editingInvoiceId, {
                  ...invoiceForm,
                  amount: Number(invoiceForm.amount) || 0,
                  advance_amount: Number(invoiceForm.advance_amount) || 0,
                  balance_amount: Number(invoiceForm.balance_amount) || 0
                }, resetInvoiceForm);
              }}
              onCancel={resetInvoiceForm}
              isEditing={Boolean(editingInvoiceId)}
              form={
                <>
                  <TextInput label="Invoice Number *" value={invoiceForm.invoice_number || ''} onChange={(value) => setInvoiceForm({ ...invoiceForm, invoice_number: value })} required />
                  <SelectInput label="Invoice Type" value={invoiceForm.invoice_type || 'Proforma'} onChange={(value) => setInvoiceForm({ ...invoiceForm, invoice_type: value as InvoiceRecord['invoice_type'] })} options={['Proforma', 'Tax']} />
                  <SelectInput label="Buyer" value={invoiceForm.client_id || ''} onChange={(value) => setInvoiceForm({ ...invoiceForm, client_id: value })} options={['', ...clients.map((client) => client.id)]} labels={{ '': 'Unlinked', ...Object.fromEntries(clients.map((client) => [client.id, client.company_name])) }} />
                  <NumberInput label="Amount" value={Number(invoiceForm.amount) || 0} onChange={(value) => setInvoiceForm({ ...invoiceForm, amount: value })} />
                  <NumberInput label="Advance Amount" value={Number(invoiceForm.advance_amount) || 0} onChange={(value) => setInvoiceForm({ ...invoiceForm, advance_amount: value })} />
                  <NumberInput label="Balance Amount" value={Number(invoiceForm.balance_amount) || 0} onChange={(value) => setInvoiceForm({ ...invoiceForm, balance_amount: value })} />
                  <SelectInput label="Payment Status" value={invoiceForm.payment_status || 'Pending'} onChange={(value) => setInvoiceForm({ ...invoiceForm, payment_status: value as InvoiceRecord['payment_status'] })} options={['Pending', 'Part Paid', 'Paid', 'Overdue']} />
                  <SelectInput label="Currency" value={invoiceForm.currency || 'INR'} onChange={(value) => setInvoiceForm({ ...invoiceForm, currency: value as InvoiceRecord['currency'] })} options={['INR', 'USD']} />
                  <TextInput label="Due Date" type="date" value={invoiceForm.due_date || ''} onChange={(value) => setInvoiceForm({ ...invoiceForm, due_date: value })} />
                  <TextArea label="Notes" value={invoiceForm.notes || ''} onChange={(value) => setInvoiceForm({ ...invoiceForm, notes: value })} />
                </>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <Stat icon={<FileCheck2 className="h-5 w-5" />} label="Invoice Value" value={formatQuoteCurrency(invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0), 'INR')} tone="sky" />
                <Stat icon={<CalendarCheck className="h-5 w-5" />} label="Receivable" value={formatQuoteCurrency(invoices.filter((invoice) => invoice.payment_status !== 'Paid').reduce((sum, invoice) => sum + Number(invoice.balance_amount || invoice.amount || 0), 0), 'INR')} tone="indigo" />
                <Stat icon={<CheckSquare className="h-5 w-5" />} label="Paid Invoices" value={invoices.filter((invoice) => invoice.payment_status === 'Paid').length.toString()} tone="teal" />
              </div>
              <DataTable headers={['Invoice', 'Type', 'Buyer', 'Amount', 'Balance', 'Status', 'Actions']}>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-100">
                    <td className="p-3 font-mono font-bold">{invoice.invoice_number}</td>
                    <td className="p-3">{invoice.invoice_type}</td>
                    <td className="p-3">{clients.find((client) => client.id === invoice.client_id)?.company_name || 'Unlinked'}</td>
                    <td className="p-3 text-right font-mono">{formatQuoteCurrency(Number(invoice.amount || 0), invoice.currency || 'INR')}</td>
                    <td className="p-3 text-right font-mono">{formatQuoteCurrency(Number(invoice.balance_amount || 0), invoice.currency || 'INR')}</td>
                    <td className="p-3"><SmallBadge text={invoice.payment_status} /></td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <PDFDownloadLink
                          document={<InvoicePDF invoice={invoice} client={clients.find((client) => client.id === invoice.client_id)} quote={quotes.find((quote) => quote.id === invoice.quote_id)} />}
                          fileName={`${invoice.invoice_number || 'invoice'}-sheshaan-global.pdf`}
                          className="p-1.5 hover:bg-sky-50 text-slate-500 hover:text-sky-700 rounded transition"
                          title="Download invoice PDF"
                        >
                          {({ loading: pdfLoading }) => pdfLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </PDFDownloadLink>
                        <RowActions currentRole={currentRole} onEdit={() => { setEditingInvoiceId(invoice.id); setInvoiceForm(invoice); }} onDelete={() => deleteRecord('invoices', invoice.id, 'invoice')} />
                      </div>
                    </td>
                  </tr>
                ))}
              </DataTable>
            </TwoColumnManager>
          )}

          {activeTab === 'shipments' && (
            <TwoColumnManager
              formTitle={editingShipmentId ? 'Edit Shipment' : 'Add Shipment'}
              onSubmit={(e) => {
                e.preventDefault();
                saveRecord<ShipmentRecord>('shipments', editingShipmentId, shipmentForm, resetShipmentForm);
              }}
              onCancel={resetShipmentForm}
              isEditing={Boolean(editingShipmentId)}
              form={
                <>
                  <TextInput label="Booking Number" value={shipmentForm.booking_number || ''} onChange={(value) => setShipmentForm({ ...shipmentForm, booking_number: value })} />
                  <TextInput label="Vessel Name" value={shipmentForm.vessel_name || ''} onChange={(value) => setShipmentForm({ ...shipmentForm, vessel_name: value })} />
                  <TextInput label="Container Number" value={shipmentForm.container_number || ''} onChange={(value) => setShipmentForm({ ...shipmentForm, container_number: value })} />
                  <TextInput label="Seal Number" value={shipmentForm.seal_number || ''} onChange={(value) => setShipmentForm({ ...shipmentForm, seal_number: value })} />
                  <TextInput label="BL Number" value={shipmentForm.bl_number || ''} onChange={(value) => setShipmentForm({ ...shipmentForm, bl_number: value })} />
                  <TextInput label="ETD" type="date" value={shipmentForm.etd || ''} onChange={(value) => setShipmentForm({ ...shipmentForm, etd: value })} />
                  <TextInput label="ETA" type="date" value={shipmentForm.eta || ''} onChange={(value) => setShipmentForm({ ...shipmentForm, eta: value })} />
                  <SelectInput label="Status" value={shipmentForm.status || 'Planning'} onChange={(value) => setShipmentForm({ ...shipmentForm, status: value as ShipmentRecord['status'] })} options={['Planning', 'Booked', 'Stuffed', 'Sailed', 'Arrived', 'Delivered']} />
                  <TextArea label="Notes" value={shipmentForm.notes || ''} onChange={(value) => setShipmentForm({ ...shipmentForm, notes: value })} />
                </>
              }
            >
              <ShipmentRadar
                shipments={shipments}
                clients={clients}
                onSelectShipment={(id) => { const s = shipments.find(sh => sh.id === id); if (s) { setEditingShipmentId(s.id); setShipmentForm(s); } }}
              />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <Stat icon={<Ship className="h-5 w-5" />} label="Planning" value={shipments.filter((shipment) => shipment.status === 'Planning').length.toString()} tone="sky" />
                <Stat icon={<Package className="h-5 w-5" />} label="Booked/Stuffed" value={shipments.filter((shipment) => ['Booked', 'Stuffed'].includes(shipment.status)).length.toString()} tone="indigo" />
                <Stat icon={<Anchor className="h-5 w-5" />} label="Sailed" value={shipments.filter((shipment) => shipment.status === 'Sailed').length.toString()} tone="slate" />
                <Stat icon={<CheckSquare className="h-5 w-5" />} label="Delivered" value={shipments.filter((shipment) => shipment.status === 'Delivered').length.toString()} tone="teal" />
              </div>
              <DataTable headers={['Booking', 'Vessel', 'Container', 'BL', 'ETD', 'ETA', 'Status', 'Actions']}>
                {shipments.map((shipment) => (
                  <tr key={shipment.id} className="border-b border-slate-100">
                    <td className="p-3 font-mono font-bold">{shipment.booking_number || 'N/A'}</td>
                    <td className="p-3">{shipment.vessel_name || 'N/A'}</td>
                    <td className="p-3">{shipment.container_number || 'N/A'}</td>
                    <td className="p-3">{shipment.bl_number || 'N/A'}</td>
                    <td className="p-3">{shipment.etd || 'N/A'}</td>
                    <td className="p-3">{shipment.eta || 'N/A'}</td>
                    <td className="p-3"><SmallBadge text={shipment.status} /></td>
                    <td className="p-3"><RowActions currentRole={currentRole} onEdit={() => { setEditingShipmentId(shipment.id); setShipmentForm(shipment); }} onDelete={() => deleteRecord('shipments', shipment.id, 'shipment')} /></td>
                  </tr>
                ))}
              </DataTable>
            </TwoColumnManager>
          )}

          {activeTab === 'documents' && (
            <TwoColumnManager
              formTitle={editingChecklistId ? 'Edit Document Checklist' : 'Add Document Checklist'}
              onSubmit={(e) => {
                e.preventDefault();
                saveRecord<DocumentChecklist>('document_checklists', editingChecklistId, checklistForm, resetChecklistForm);
              }}
              onCancel={resetChecklistForm}
              isEditing={Boolean(editingChecklistId)}
              form={
                <>
                  <CheckboxInput label="Commercial Invoice" checked={Boolean(checklistForm.commercial_invoice)} onChange={(value) => setChecklistForm({ ...checklistForm, commercial_invoice: value })} />
                  <CheckboxInput label="Packing List" checked={Boolean(checklistForm.packing_list)} onChange={(value) => setChecklistForm({ ...checklistForm, packing_list: value })} />
                  <CheckboxInput label="Certificate of Origin" checked={Boolean(checklistForm.certificate_origin)} onChange={(value) => setChecklistForm({ ...checklistForm, certificate_origin: value })} />
                  <CheckboxInput label="Phytosanitary" checked={Boolean(checklistForm.phytosanitary)} onChange={(value) => setChecklistForm({ ...checklistForm, phytosanitary: value })} />
                  <CheckboxInput label="Insurance" checked={Boolean(checklistForm.insurance)} onChange={(value) => setChecklistForm({ ...checklistForm, insurance: value })} />
                  <CheckboxInput label="Bill of Lading" checked={Boolean(checklistForm.bill_of_lading)} onChange={(value) => setChecklistForm({ ...checklistForm, bill_of_lading: value })} />
                  <TextArea label="Notes" value={checklistForm.notes || ''} onChange={(value) => setChecklistForm({ ...checklistForm, notes: value })} />
                </>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {checklists.map((item) => {
                  const done = [item.commercial_invoice, item.packing_list, item.certificate_origin, item.phytosanitary, item.insurance, item.bill_of_lading].filter(Boolean).length;
                  return (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-4 text-xs shadow-sm">
                      <div className="flex justify-between items-start gap-2">
                        <div className="font-bold text-slate-900">Checklist {done}/6 complete</div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => { setDossierQuoteId(item.quote_id || ''); setDossierOpen(true); }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded transition"
                          >
                            <FileText className="h-3 w-3" />
                            Compile Dossier
                          </button>
                          <RowActions currentRole={currentRole} onEdit={() => { setEditingChecklistId(item.id); setChecklistForm(item); }} onDelete={() => deleteRecord('document_checklists', item.id, 'document checklist')} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3 text-slate-600">
                        {[
                          ['Commercial Invoice', item.commercial_invoice],
                          ['Packing List', item.packing_list],
                          ['Certificate Origin', item.certificate_origin],
                          ['Phytosanitary', item.phytosanitary],
                          ['Insurance', item.insurance],
                          ['Bill of Lading', item.bill_of_lading]
                        ].map(([label, checked]) => <span key={String(label)} className={checked ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>{checked ? '✓' : '○'} {label}</span>)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── 6-Document Cargo Dossier Modal ─────────────────────────────── */}
              {dossierOpen && (() => {
                const q = quotes.find(qt => qt.id === dossierQuoteId) || quotes[0];
                const client = q ? (q.client || clients.find(c => c.id === q.client_id)) : null;
                const shipment = q ? shipments.find(s => s.quote_id === q.id) : null;
                const shipper = q?.shipper_details;
                const bank = q?.bank_details;
                const items = q?.items || [];
                const totalVal = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);
                const totalWt = items.reduce((s, it) => s + Number(it.weight || 0) * Number(it.quantity || 0), 0);
                const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
                const invoiceNo = `CI-${(q?.quote_number || 'DRAFT').replace('Q-', '')}`;
                return (
                  <div className="fixed inset-0 z-[80] bg-slate-950/80 flex items-start justify-center overflow-y-auto py-8 px-4 doc-no-print">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden">
                      {/* Modal Header */}
                      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-950 text-white">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-sky-400" />
                          <div>
                            <p className="font-extrabold text-sm">Full Export Cargo Dossier</p>
                            <p className="text-[10px] text-slate-400">{q?.quote_number} · {client?.company_name} · 6 Documents</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-lg transition">
                            <Download className="h-3.5 w-3.5" /> Print All (6 Docs)
                          </button>
                          <button type="button" onClick={() => setDossierOpen(false)} className="h-9 w-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Printable Dossier Content */}
                      <div id="cargo-dossier-print" className="p-8 space-y-0 font-serif text-[11px] text-slate-900 leading-relaxed">

                        {/* ── DOC 1: Commercial Invoice ─────────────────────── */}
                        <div className="doc-page-break pb-10">
                          <div className="border-2 border-slate-900 p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h2 className="text-base font-black uppercase tracking-widest text-slate-900">Commercial Invoice</h2>
                                <p className="text-[10px] text-slate-500">Original · For Export Only</p>
                              </div>
                              <div className="text-right">
                                <p><strong>Invoice No.:</strong> {invoiceNo}</p>
                                <p><strong>Date:</strong> {today}</p>
                                <p><strong>Quote Ref.:</strong> {q?.quote_number || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6 border-t border-b border-slate-300 py-4 mb-4">
                              <div>
                                <p className="font-black text-[9px] uppercase tracking-wider text-slate-500 mb-1">Shipper / Exporter</p>
                                <p className="font-bold">{shipper?.company_name || 'SHESHAAN GLOBAL PVT LTD'}</p>
                                <p>{shipper?.address || 'India'}</p>
                                <p>IEC: {shipper?.tax_id || 'XXXXXXXXXX'}</p>
                              </div>
                              <div>
                                <p className="font-black text-[9px] uppercase tracking-wider text-slate-500 mb-1">Consignee / Buyer</p>
                                <p className="font-bold">{client?.company_name || 'N/A'}</p>
                                <p>{client?.address || 'N/A'}</p>
                                <p>{client?.contact_email || ''}</p>
                              </div>
                            </div>
                            <table className="w-full text-[10px] mb-4">
                              <thead><tr className="border-b-2 border-slate-900"><th className="text-left py-1">Description</th><th className="text-center py-1">HS Code</th><th className="text-right py-1">Qty</th><th className="text-right py-1">Unit Price</th><th className="text-right py-1">Amount</th></tr></thead>
                              <tbody>
                                {items.map((it, i) => <tr key={i} className="border-b border-slate-200"><td className="py-1.5">{it.description} {it.packing_container ? `— ${it.packing_container}` : ''}</td><td className="text-center py-1.5 font-mono">{it.hs_code || '—'}</td><td className="text-right py-1.5">{it.quantity} kg</td><td className="text-right py-1.5">{q?.currency === 'USD' ? '$' : '₹'}{Number(it.unit_price || 0).toFixed(2)}</td><td className="text-right py-1.5 font-bold">{q?.currency === 'USD' ? '$' : '₹'}{(Number(it.quantity || 0) * Number(it.unit_price || 0)).toFixed(2)}</td></tr>)}
                                <tr className="border-t-2 border-slate-900 font-black"><td colSpan={4} className="text-right py-2">TOTAL CFR VALUE:</td><td className="text-right py-2">{q?.currency === 'USD' ? '$' : '₹'}{totalVal.toFixed(2)}</td></tr>
                              </tbody>
                            </table>
                            <div className="grid grid-cols-2 gap-6 text-[10px]">
                              <div><p className="font-black text-[9px] uppercase text-slate-500 mb-1">Bank Details</p><p><strong>Bank:</strong> {bank?.beneficiary_bank || '—'}</p><p><strong>A/C:</strong> {bank?.account_number || '—'}</p><p><strong>SWIFT:</strong> {bank?.swift_code || '—'}</p><p><strong>IFSC:</strong> {bank?.ifsc_code || '—'}</p></div>
                              <div><p className="font-black text-[9px] uppercase text-slate-500 mb-1">Shipment Terms</p><p><strong>Incoterms:</strong> {q?.shipment_mode || 'CFR'}</p><p><strong>Payment:</strong> {q?.payment_terms || 'TT in advance'}</p><p><strong>Port of Loading:</strong> {q?.loading_port || '—'}</p><p><strong>Destination:</strong> {client?.destination_port || '—'}</p></div>
                            </div>
                            <div className="mt-6 border-t border-slate-300 pt-3 text-[9px] text-slate-500">
                              <p>Declaration: We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
                              <div className="flex justify-between mt-4 font-black text-slate-900"><span>For SHESHAAN GLOBAL PVT LTD</span><span className="border-t border-slate-400 pt-1 w-32 text-center text-[9px]">Authorized Signatory</span></div>
                            </div>
                          </div>
                        </div>

                        {/* ── DOC 2: Packing List ───────────────────────────── */}
                        <div className="doc-page-break pb-10">
                          <div className="border-2 border-slate-900 p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div><h2 className="text-base font-black uppercase tracking-widest">Export Packing List</h2><p className="text-[10px] text-slate-500">Original · For Customs Use</p></div>
                              <div className="text-right"><p><strong>PL No.:</strong> PL-{(q?.quote_number || 'DRAFT').replace('Q-', '')}</p><p><strong>Date:</strong> {today}</p></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-300 py-3 mb-4 text-[10px]">
                              <div><strong>Vessel:</strong> {shipment?.vessel_name || '—'}</div>
                              <div><strong>Container No.:</strong> {shipment?.container_number || '—'}</div>
                              <div><strong>Seal No.:</strong> {shipment?.seal_number || '—'}</div>
                              <div><strong>BL No.:</strong> {shipment?.bl_number || '—'}</div>
                              <div><strong>ETD:</strong> {shipment?.etd || '—'}</div>
                              <div><strong>ETA:</strong> {shipment?.eta || '—'}</div>
                            </div>
                            <table className="w-full text-[10px] mb-4">
                              <thead><tr className="border-b-2 border-slate-900"><th className="text-left py-1">Description</th><th className="text-center py-1">Packing</th><th className="text-right py-1">Net Wt (kg)</th><th className="text-right py-1">Gross Wt (kg)</th></tr></thead>
                              <tbody>
                                {items.map((it, i) => { const netWt = Number(it.weight || 0) * Number(it.quantity || 0); return <tr key={i} className="border-b border-slate-200"><td className="py-1.5">{it.description}</td><td className="text-center py-1.5">{it.packing_container || '—'}</td><td className="text-right py-1.5">{netWt.toFixed(0)}</td><td className="text-right py-1.5">{(netWt * 1.02).toFixed(0)}</td></tr>; })}
                                <tr className="border-t-2 border-slate-900 font-black"><td colSpan={2} className="py-2">TOTAL</td><td className="text-right py-2">{totalWt.toFixed(0)} kg</td><td className="text-right py-2">{(totalWt * 1.02).toFixed(0)} kg</td></tr>
                              </tbody>
                            </table>
                            <div className="flex justify-between mt-6 font-black text-slate-900 text-[9px]"><span>For SHESHAAN GLOBAL PVT LTD</span><span className="border-t border-slate-400 pt-1 w-32 text-center">Authorized Signatory</span></div>
                          </div>
                        </div>

                        {/* ── DOC 3: Certificate of Origin Draft ───────────── */}
                        <div className="doc-page-break pb-10">
                          <div className="border-2 border-slate-900 p-6">
                            <h2 className="text-base font-black uppercase tracking-widest text-center mb-4">Certificate of Origin — Application Draft</h2>
                            <p className="text-[10px] text-slate-500 text-center mb-4">(To be submitted to APEDA / Chamber of Commerce for endorsement)</p>
                            <div className="space-y-3 text-[11px]">
                              <div className="grid grid-cols-2 gap-4"><div><strong>Exporter Name:</strong> {shipper?.company_name || 'SHESHAAN GLOBAL PVT LTD'}</div><div><strong>Country of Origin:</strong> {q?.origin_country || 'India'}</div></div>
                              <div className="grid grid-cols-2 gap-4"><div><strong>Consignee:</strong> {client?.company_name || '—'}</div><div><strong>Destination Country:</strong> {client?.destination_port || '—'}</div></div>
                              <div><strong>Description of Goods:</strong> {items.map(it => it.description).join(', ')}</div>
                              <div className="grid grid-cols-2 gap-4"><div><strong>Total Net Weight:</strong> {totalWt.toFixed(0)} kg</div><div><strong>Invoice Ref.:</strong> {invoiceNo}</div></div>
                              <div className="grid grid-cols-2 gap-4"><div><strong>Vessel / Flight:</strong> {shipment?.vessel_name || '—'}</div><div><strong>Port of Loading:</strong> {q?.loading_port || '—'}</div></div>
                            </div>
                            <div className="mt-8 border-t border-slate-300 pt-4 text-[9px] text-slate-500">Declaration: The undersigned hereby declares that the above details and statements are correct; that all the goods were produced in India.</div>
                            <div className="flex justify-between mt-6 font-black text-slate-900 text-[9px]"><span>Exporter Signature & Stamp</span><span className="border-t border-slate-400 pt-1 w-40 text-center">Chamber / APEDA Endorsement</span></div>
                          </div>
                        </div>

                        {/* ── DOC 4: Phytosanitary Declaration ─────────────── */}
                        <div className="doc-page-break pb-10">
                          <div className="border-2 border-slate-900 p-6">
                            <h2 className="text-base font-black uppercase tracking-widest text-center mb-2">Phytosanitary Inspection Declaration</h2>
                            <p className="text-[10px] text-slate-500 text-center mb-4">(For submission to Plant Quarantine Authority, Govt. of India)</p>
                            <div className="space-y-2 text-[11px]">
                              <div className="grid grid-cols-2 gap-4"><div><strong>Exporter:</strong> {shipper?.company_name || 'SHESHAAN GLOBAL PVT LTD'}</div><div><strong>Consignee:</strong> {client?.company_name || '—'}</div></div>
                              <div><strong>Commodity:</strong> {items.map(it => it.description).join(', ')}</div>
                              <div className="grid grid-cols-2 gap-4"><div><strong>Quantity:</strong> {totalWt.toFixed(0)} kg Net</div><div><strong>Country of Destination:</strong> {client?.destination_port || '—'}</div></div>
                              <div className="grid grid-cols-2 gap-4"><div><strong>Means of Conveyance:</strong> Sea Freight</div><div><strong>Port of Entry:</strong> {client?.destination_port || '—'}</div></div>
                              <div><strong>Declaration:</strong> The consignment described above has been inspected according to appropriate official procedures and is considered to be free from quarantine pests.</div>
                              <div className="grid grid-cols-2 gap-4"><div><strong>Treatment Method:</strong> Fumigation (Methyl Bromide / Phosphine)</div><div><strong>Treatment Date:</strong> ___________</div></div>
                            </div>
                            <div className="flex justify-between mt-8 font-black text-slate-900 text-[9px]"><span>Authorized Inspector Signature</span><span className="border-t border-slate-400 pt-1 w-40 text-center">Plant Quarantine Official Stamp</span></div>
                          </div>
                        </div>

                        {/* ── DOC 5: Marine Insurance Certificate Draft ─────── */}
                        <div className="doc-page-break pb-10">
                          <div className="border-2 border-slate-900 p-6">
                            <h2 className="text-base font-black uppercase tracking-widest text-center mb-2">Marine Cargo Insurance Certificate</h2>
                            <p className="text-[10px] text-slate-500 text-center mb-4">(Draft — to be finalized by insurer)</p>
                            <div className="space-y-2 text-[11px]">
                              <div className="grid grid-cols-2 gap-4"><div><strong>Insured:</strong> {shipper?.company_name || 'SHESHAAN GLOBAL PVT LTD'}</div><div><strong>Certificate No.:</strong> MIC-{today.replace(/\s/g,'')}</div></div>
                              <div><strong>Description of Goods:</strong> {items.map(it => it.description).join(', ')}</div>
                              <div className="grid grid-cols-2 gap-4"><div><strong>Sum Insured:</strong> {q?.currency === 'USD' ? '$' : '₹'}{(totalVal * 1.1).toFixed(2)} (CIF + 10%)</div><div><strong>Voyage:</strong> {q?.loading_port || 'India'} to {client?.destination_port || '—'}</div></div>
                              <div className="grid grid-cols-2 gap-4"><div><strong>Vessel:</strong> {shipment?.vessel_name || '—'}</div><div><strong>BL No.:</strong> {shipment?.bl_number || '—'}</div></div>
                              <div><strong>Coverage:</strong> Institute Cargo Clauses (A) · All Risks · Including War & Strike Clauses</div>
                            </div>
                            <div className="flex justify-between mt-8 font-black text-slate-900 text-[9px]"><span>Insurer Authorized Signature</span><span className="border-t border-slate-400 pt-1 w-40 text-center">Insurer Official Stamp</span></div>
                          </div>
                        </div>

                        {/* ── DOC 6: Shipping Instructions ─────────────────── */}
                        <div className="pb-10">
                          <div className="border-2 border-slate-900 p-6">
                            <h2 className="text-base font-black uppercase tracking-widest mb-2">Shipping Instructions</h2>
                            <p className="text-[10px] text-slate-500 mb-4">To: Freight Forwarder / NVOCC</p>
                            <div className="space-y-2 text-[11px]">
                              <div className="grid grid-cols-2 gap-4"><div><strong>Shipper:</strong> {shipper?.company_name || 'SHESHAAN GLOBAL PVT LTD'}<br/>{shipper?.address || ''}</div><div><strong>Consignee:</strong> {client?.company_name || '—'}<br/>{client?.address || ''}</div></div>
                              <div><strong>Notify Party:</strong> {client?.company_name || '—'} · {client?.contact_email || ''}</div>
                              <div className="grid grid-cols-2 gap-4"><div><strong>Port of Loading:</strong> {q?.loading_port || '—'}</div><div><strong>Port of Discharge:</strong> {client?.destination_port || '—'}</div></div>
                              <div className="grid grid-cols-2 gap-4"><div><strong>Container Type:</strong> {q?.logistics_specs?.container_type || '20ft FCL Dry'}</div><div><strong>ETD Requested:</strong> {shipment?.etd || '—'}</div></div>
                              <div><strong>Cargo Description:</strong> {items.map(it => `${it.description} (${it.quantity} kg, HS: ${it.hs_code || '—'})`).join('; ')}</div>
                              <div className="grid grid-cols-2 gap-4"><div><strong>Total Net Weight:</strong> {totalWt.toFixed(0)} kg</div><div><strong>Gross Weight:</strong> {(totalWt * 1.02).toFixed(0)} kg</div></div>
                              <div><strong>Special Instructions:</strong> {q?.logistics_specs?.storage_condition || 'Store in cool, dry place. Handle with care.'}</div>
                              <div><strong>Freight Terms:</strong> {q?.payment_terms || 'Prepaid'} · {q?.shipment_mode || 'Sea Freight'}</div>
                            </div>
                            <div className="flex justify-between mt-8 font-black text-slate-900 text-[9px]"><span>Sheshaan Global — Authorized Representative</span><span className="border-t border-slate-400 pt-1 w-40 text-center">Date: {today}</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* AI Commercial Document Compiler */}
              <div className="mt-8 border-t border-slate-200 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">AI Commercial Document Compiler</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {/* Options Panel */}
                  <div className="space-y-4 text-xs font-semibold">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Select Reference Shipment</label>
                      <select
                        value={autoDocShipmentId}
                        onChange={(e) => setAutoDocShipmentId(e.target.value)}
                        className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 font-bold text-slate-800 shadow-sm"
                      >
                        <option value="">-- Choose Shipment --</option>
                        {shipments.map((s) => (
                          <option key={s.id} value={s.id}>{s.booking_number || 'Shipment'} ({s.status})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Document Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAutoDocType('invoice')}
                          className={`h-9 font-bold rounded-lg border transition ${autoDocType === 'invoice' ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white text-slate-700 border-slate-200'}`}
                        >
                          Commercial Invoice
                        </button>
                        <button
                          type="button"
                          onClick={() => setAutoDocType('packing_list')}
                          className={`h-9 font-bold rounded-lg border transition ${autoDocType === 'packing_list' ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white text-slate-700 border-slate-200'}`}
                        >
                          Packing List
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-lg border space-y-2 text-[11px] text-slate-600">
                      <p className="font-bold text-slate-900">Document Settings</p>
                      <p>Auto-compiles shipper ports, container seals, client addresses, and commodity weights from shipment records.</p>
                    </div>
                  </div>

                  {/* Live Preview Panel */}
                  <div className="lg:col-span-2">
                    <div className="border border-slate-300 rounded-xl bg-white shadow-md p-6 max-h-[500px] overflow-y-auto font-serif text-[10px] text-slate-900 leading-tight">
                      {(() => {
                        const selectedShipment = shipments.find((s) => s.id === autoDocShipmentId);
                        const relatedQuote = selectedShipment ? quotes.find((q) => q.id === selectedShipment.quote_id) : null;
                        const relatedClient = relatedQuote ? clients.find((c) => c.id === relatedQuote.client_id) : null;

                        const invoiceNum = relatedQuote ? `IN-${relatedQuote.quote_number}` : 'IN-TEMP-998';
                        const docDate = new Date().toLocaleDateString();
                        const clientName = relatedClient?.company_name || 'Acme Trading LLC';
                        const clientAddr = relatedClient?.contact_name || '102 Industrial Area, Port City';
                        const containerNo = selectedShipment?.container_number || 'MSKU908234-1';
                        const sealNo = selectedShipment?.seal_number || 'SL-892348';
                        const vesselName = selectedShipment?.vessel_name || 'MAERSK MC-KINNEY MOLLER';
                        const items = ((relatedQuote?.items && relatedQuote.items.length > 0)
                          ? relatedQuote.items
                          : [{ description: 'High Grade Raw Peanuts (Bold 40/50)', quantity: 24, unit_price: 1150, packing_container: 'MT' }]) as any[];

                        const currency = relatedQuote?.currency || 'USD';
                        const totalVal = items.reduce((acc, it) => acc + (it.quantity * (it.unit_price || 0)), 0);

                        if (autoDocType === 'invoice') {
                          return (
                            <div className="space-y-4">
                              <div className="border-b pb-4 flex justify-between">
                                <div>
                                  <h1 className="text-sm font-black text-slate-900 uppercase font-sans">Sheshaan Global Pvt Ltd</h1>
                                  <p className="text-[9px] text-slate-500 font-sans">Exporter of Agro Products | Nhava Sheva, India</p>
                                </div>
                                <div className="text-right">
                                  <h2 className="text-xs font-black uppercase text-indigo-700 font-sans">Commercial Invoice</h2>
                                  <p className="font-sans">No: {invoiceNum}</p>
                                  <p className="font-sans">Date: {docDate}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="border p-2 rounded">
                                  <p className="font-sans font-black text-slate-700">Exporter / Shipper:</p>
                                  <p className="font-bold">SHESHAAN GLOBAL PVT LTD</p>
                                  <p>Mumbai Office, MH, India</p>
                                  <p>IEC: 0312098433 | PAN: AAECS1234F</p>
                                </div>
                                <div className="border p-2 rounded">
                                  <p className="font-sans font-black text-slate-700">Consignee / Buyer:</p>
                                  <p className="font-bold">{clientName}</p>
                                  <p>{clientAddr}</p>
                                  <p>Country: {relatedClient ? buyerCountry(relatedClient) : 'United Kingdom'}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="border p-2 rounded">
                                  <p className="font-sans font-black text-slate-700">Transport Details:</p>
                                  <p>Vessel/Voyage: {vesselName}</p>
                                  <p>Port of Loading: Nhava Sheva (INNSA)</p>
                                  <p>Port of Discharge: Rotterdam</p>
                                </div>
                                <div className="border p-2 rounded">
                                  <p className="font-sans font-black text-slate-700">Container Details:</p>
                                  <p>Container No: {containerNo}</p>
                                  <p>Seal No: {sealNo}</p>
                                  <p>Payment Terms: L/C at Sight</p>
                                </div>
                              </div>

                              <table className="w-full border-collapse border border-slate-300">
                                <thead>
                                  <tr className="bg-slate-100 font-sans font-bold">
                                    <th className="border p-1.5 text-left">Description of Goods</th>
                                    <th className="border p-1.5 text-right">Quantity</th>
                                    <th className="border p-1.5 text-right">Unit Rate ({currency})</th>
                                    <th className="border p-1.5 text-right">Total Amount ({currency})</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((it, idx) => (
                                    <tr key={idx}>
                                      <td className="border p-1.5">{it.description}</td>
                                      <td className="border p-1.5 text-right">{it.quantity} {it.packing_container || 'MT'}</td>
                                      <td className="border p-1.5 text-right">{formatQuoteCurrency(it.unit_price || 0, currency)}</td>
                                      <td className="border p-1.5 text-right">{formatQuoteCurrency(it.quantity * (it.unit_price || 0), currency)}</td>
                                    </tr>
                                  ))}
                                  <tr className="font-bold font-sans">
                                    <td colSpan={3} className="border p-1.5 text-right">Total CFR Value:</td>
                                    <td className="border p-1.5 text-right">{formatQuoteCurrency(totalVal, currency)}</td>
                                  </tr>
                                </tbody>
                              </table>

                              <div className="border-t pt-4 text-[9px] text-slate-500">
                                <p className="font-bold">Declaration:</p>
                                <p>We declare that this invoice shows the actual value of the goods and that all particulars are true and correct.</p>
                                <div className="mt-4 flex justify-between items-center font-sans font-bold text-slate-900">
                                  <span>For SHESHAAN GLOBAL PVT LTD</span>
                                  <span className="border-t border-slate-400 pt-1 w-32 text-center">Authorized Signatory</span>
                                </div>
                              </div>
                            </div>
                          );
                        } else {
                          const totalQty = items.reduce((acc, it) => acc + it.quantity, 0);
                          const grossWeight = totalQty * 1000 + 400;
                          return (
                            <div className="space-y-4">
                              <div className="border-b pb-4 flex justify-between">
                                <div>
                                  <h1 className="text-sm font-black text-slate-900 uppercase font-sans">Sheshaan Global Pvt Ltd</h1>
                                  <p className="text-[9px] text-slate-500 font-sans font-bold">Agro Exporter | Mumbai, India</p>
                                </div>
                                <div className="text-right">
                                  <h2 className="text-xs font-black uppercase text-indigo-700 font-sans">Export Packing List</h2>
                                  <p className="font-sans">No: PL-{invoiceNum}</p>
                                  <p className="font-sans">Date: {docDate}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="border p-2 rounded">
                                  <p className="font-sans font-black text-slate-700">Shipper:</p>
                                  <p className="font-bold">SHESHAAN GLOBAL PVT LTD</p>
                                  <p>Mumbai Office, MH, India</p>
                                </div>
                                <div className="border p-2 rounded">
                                  <p className="font-sans font-black text-slate-700">Consignee:</p>
                                  <p className="font-bold">{clientName}</p>
                                  <p>{clientAddr}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="border p-2 rounded">
                                  <p className="font-sans font-black text-slate-700">Ocean Voyage Details:</p>
                                  <p>Vessel: {vesselName}</p>
                                  <p>Port of Loading: Nhava Sheva (INNSA)</p>
                                  <p>Container No: {containerNo}</p>
                                </div>
                                <div className="border p-2 rounded">
                                  <p className="font-sans font-black text-slate-700">Packaging Details:</p>
                                  <p>Total Packages: {totalQty * 20} Bags (50kg PP Bags)</p>
                                  <p>Container Seal: {sealNo}</p>
                                  <p>Total Cargo Net Weight: {totalQty * 1000} KGS</p>
                                </div>
                              </div>

                              <table className="w-full border-collapse border border-slate-300">
                                <thead>
                                  <tr className="bg-slate-100 font-sans font-bold">
                                    <th className="border p-1.5 text-left">Description of Packages & Goods</th>
                                    <th className="border p-1.5 text-right">No of Packages</th>
                                    <th className="border p-1.5 text-right">Net Weight (KG)</th>
                                    <th className="border p-1.5 text-right">Gross Weight (KG)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((it, idx) => (
                                    <tr key={idx}>
                                      <td className="border p-1.5">{it.description} <br />Packed in 50KG Net PP Bags</td>
                                      <td className="border p-1.5 text-right">{it.quantity * 20} Bags</td>
                                      <td className="border p-1.5 text-right">{(it.quantity * 1000).toLocaleString()} KGS</td>
                                      <td className="border p-1.5 text-right">{(it.quantity * 1000 + 80).toLocaleString()} KGS</td>
                                    </tr>
                                  ))}
                                  <tr className="font-bold font-sans">
                                    <td className="border p-1.5 text-right">Total:</td>
                                    <td className="border p-1.5 text-right">{totalQty * 20} Bags</td>
                                    <td className="border p-1.5 text-right">{(totalQty * 1000).toLocaleString()} KGS</td>
                                    <td className="border p-1.5 text-right">{grossWeight.toLocaleString()} KGS</td>
                                  </tr>
                                </tbody>
                              </table>

                              <div className="border-t pt-4 flex justify-between items-center font-sans font-bold text-slate-900">
                                <span>For SHESHAAN GLOBAL PVT LTD</span>
                                <button
                                  type="button"
                                  onClick={() => window.print()}
                                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded font-sans text-[9px]"
                                >
                                  Print / Export Document
                                </button>
                              </div>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </TwoColumnManager>
          )}

          {activeTab === 'users' && (
            <TwoColumnManager
              formTitle={editingUserId ? 'Edit User' : 'Add User'}
              onSubmit={(e) => {
                e.preventDefault();
                if (!userForm.name || !userForm.email) return alert('Please enter name and email.');
                saveRecord<AppUser>('app_users', editingUserId, userForm, resetUserForm);
              }}
              onCancel={resetUserForm}
              isEditing={Boolean(editingUserId)}
              form={
                <>
                  <TextInput label="Name *" value={userForm.name || ''} onChange={(value) => setUserForm({ ...userForm, name: value })} required />
                  <TextInput label="Email *" value={userForm.email || ''} onChange={(value) => setUserForm({ ...userForm, email: value })} required />
                  <SelectInput label="Role" value={userForm.role || 'Sales'} onChange={(value) => setUserForm({ ...userForm, role: value as AppUser['role'] })} options={['Admin', 'Sales', 'Accounts', 'Operations']} />
                  <CheckboxInput label="Active User" checked={Boolean(userForm.active)} onChange={(value) => setUserForm({ ...userForm, active: value })} />
                </>
              }
            >
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 mb-4 flex gap-2">
                <Lock className="h-4 w-4 mt-0.5" />
                <span>This manages app users and roles for workflow tracking. App access is protected by Firebase Authentication when Firebase is configured.</span>
              </div>
              <DataTable headers={['Name', 'Email', 'Role', 'Status', 'Actions']}>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100">
                    <td className="p-3 font-bold">{user.name}</td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3">{user.role}</td>
                    <td className="p-3">{user.active ? 'Active' : 'Inactive'}</td>
                    <td className="p-3"><RowActions currentRole={currentRole} onEdit={() => { setEditingUserId(user.id); setUserForm(user); }} onDelete={() => deleteRecord('app_users', user.id, 'user')} /></td>
                  </tr>
                ))}
              </DataTable>
            </TwoColumnManager>
          )}
                </>
              )}
            </div>
            {selectedBuyer && (
              <BuyerDetailModal
                buyer={selectedBuyer}
                clientMetrics={clientMetrics}
                quotes={quotes}
                invoices={invoices}
                shipments={shipments}
                tasks={tasks}
                activities={activities}
                onClose={() => setSelectedBuyerId(null)}
                formatQuoteCurrency={formatQuoteCurrency}
                quoteValue={quoteValue}
              />
            )}
          </section>
        </div>
      </div>
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden" onClick={() => setShowMobileMenu(false)}>
          <div className="absolute left-0 top-0 h-full w-[88vw] max-w-sm bg-white shadow-2xl animate-slide-in-left overflow-y-auto mobile-safe-bottom" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-950 text-white p-4 z-10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded bg-white flex items-center justify-center overflow-hidden">
                    <Image src="/logo.png" alt="Sheshaan Global logo" width={40} height={40} className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold">Sheshaan Global</p>
                    <p className="text-[11px] text-slate-400">Admin Portal Menu</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowMobileMenu(false)} className="h-9 w-9 rounded bg-white/10 flex items-center justify-center" aria-label="Close menu">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <button
                onClick={() => {
                  setEditingQuoteId(null);
                  setShowMobileMenu(false);
                }}
                className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 bg-white text-slate-950 text-xs font-bold rounded shadow active:scale-[0.98] transition"
              >
                <Plus className="h-4 w-4" />
                New Quote
              </button>
            </div>
            <nav className="p-3">
              {navGroups.map((group) => (
                <div key={group.label} className="mb-4 last:mb-0">
                  <p className="px-3 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{group.label}</p>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => navigateToTab(item.key)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-left text-sm font-semibold transition ${activeTab === item.key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        {item.icon}
                        <span className="flex-1">{item.label}</span>
                        {typeof item.count === 'number' && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === item.key ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>{item.count}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
      <nav className="fixed inset-x-3 bottom-3 z-40 rounded-xl border border-slate-200 bg-white/95 backdrop-blur shadow-2xl lg:hidden mobile-safe-bottom">
        <div className="grid grid-cols-5 p-1">
          {mobilePrimaryNav.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => navigateToTab(item.key)}
              className={`min-h-14 rounded-lg flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition active:scale-95 ${activeTab === item.key ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
            >
              {item.icon}
              <span className="leading-none">{item.key === 'overview' ? 'Home' : item.key === 'crm' ? 'CRM' : item.key === 'quotes' ? 'Quotes' : 'Tasks'}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setShowNotifications(false);
              setShowMobileMenu(true);
            }}
            className="min-h-14 rounded-lg flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-slate-500 transition active:scale-95"
          >
            <Menu className="h-4 w-4" />
            <span className="leading-none">Menu</span>
          </button>
        </div>
      </nav>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-in-right">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-[11px] font-black uppercase tracking-wider ${
            toast.type === 'success' ? 'bg-slate-900 border-slate-800 text-white' :
            toast.type === 'error' ? 'bg-red-950 border-red-900/60 text-red-200' :
            toast.type === 'warning' ? 'bg-amber-950 border-amber-900/60 text-amber-200' :
            'bg-slate-900 border-slate-800 text-white'
          }`}>
            <span className="flex-1">{toast.message}</span>
            <button type="button" onClick={() => setToast(null)} className="opacity-60 hover:opacity-100 transition p-1 hover:bg-white/15 rounded">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Docked Command Console (Ctrl+K Overlay) */}
      {commandOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setCommandOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl animate-fade-up max-h-[70vh] flex flex-col">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <Search className="h-5 w-5 text-slate-400" />
              <SmoothInput
                type="text"
                placeholder="Search console (e.g. /crm, /quotes, /manager, or type record name)..."
                value={commandSearch}
                onChange={setCommandSearch}
                className="w-full text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none"
                autoFocus
                delay={80}
              />
              <button type="button" onClick={() => setCommandOpen(false)} className="text-slate-400 hover:text-slate-600">
                <kbd className="text-[10px] font-black bg-slate-100 border px-1.5 py-0.5 rounded">ESC</kbd>
              </button>
            </div>

            <div className="mt-3 overflow-y-auto flex-1 space-y-2 text-xs">
              {commandSearch.startsWith('/') || !commandSearch ? (
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Workspace Navigation</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { cmd: '/overview', label: 'Command Center', tab: 'overview' as TabKey },
                      { cmd: '/actionQueue', label: 'Action Queue', tab: 'actionQueue' as TabKey },
                      { cmd: '/crm', label: 'CRM Pipeline', tab: 'crm' as TabKey },
                      { cmd: '/quotes', label: 'Quote Automation', tab: 'quotes' as TabKey },
                      { cmd: '/tasks', label: 'Tasks & Reminders', tab: 'tasks' as TabKey },
                      { cmd: '/accounts', label: 'Accounts / Receipts', tab: 'accounts' as TabKey },
                      { cmd: '/shipments', label: 'Shipment Ops', tab: 'shipments' as TabKey },
                      { cmd: '/manager', label: 'Manager Dashboard', tab: 'manager' as TabKey }
                    ].filter(item => item.cmd.includes(commandSearch)).map(item => (
                      <button
                        key={item.cmd}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.tab);
                          setCommandOpen(false);
                          setCommandSearch('');
                        }}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:border-slate-200 transition text-left"
                      >
                        <span className="font-extrabold text-slate-800">{item.label}</span>
                        <span className="text-[9px] font-black text-sky-700 bg-sky-50 px-1 rounded border border-sky-200">{item.cmd}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {commandSearch && !commandSearch.startsWith('/') ? (
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Record Matches</p>
                  <div className="space-y-1">
                    {[
                      ...clients.map(c => ({ label: c.company_name, meta: 'Buyer Profile', onClick: () => { setActiveTab('crm'); setSelectedBuyerId(c.id); } })),
                      ...leads.map(l => ({ label: l.company_name, meta: `Lead | ${l.stage}`, onClick: () => { setActiveTab('crm'); setCrmSearchQuery(l.company_name); } })),
                      ...quotes.map(q => ({ label: q.quote_number, meta: `Quote | ${q.status}`, onClick: () => { setActiveTab('quotes'); setQuoteSearch(q.quote_number); } })),
                      ...tasks.map(t => ({ label: t.title, meta: `Task | ${t.status}`, onClick: () => { setActiveTab('tasks'); } }))
                    ].filter(item => item.label.toLowerCase().includes(commandSearch.toLowerCase())).slice(0, 5).map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          item.onClick();
                          setCommandOpen(false);
                          setCommandSearch('');
                        }}
                        className="w-full flex justify-between items-center p-2 rounded-lg hover:bg-slate-50 transition text-left font-semibold text-slate-700"
                      >
                        <span>{item.label}</span>
                        <span className="text-[9px] text-slate-400 font-extrabold">{item.meta}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* AI Copilot Sidebar Drawer */}
      {copilotOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs transition-opacity" onClick={() => setCopilotOpen(false)} />
          <div className="relative w-full max-w-sm bg-white border-l border-slate-200 shadow-2xl flex flex-col h-full animate-slide-over">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-950 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-sky-400" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-sky-400">Sheshaan Copilot</h3>
                  <p className="text-[10px] text-slate-400 font-medium">B2B Trade AI Assistant</p>
                </div>
              </div>
              <button type="button" onClick={() => setCopilotOpen(false)} className="text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {copilotLog.map((log, idx) => (
                <div key={idx} className={`flex ${log.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                    log.sender === 'user'
                      ? 'bg-slate-900 text-white rounded-tr-none'
                      : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none font-semibold'
                  }`}>
                    <p>{log.text}</p>
                    {log.action && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab(log.action!.tab);
                          setCopilotOpen(false);
                        }}
                        className="mt-2.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded font-black text-[10px] flex items-center gap-1 active:scale-98 transition shadow-sm"
                      >
                        {log.action.label} <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex gap-2">
              <input
                type="text"
                placeholder="Ask copilot..."
                value={copilotMessage}
                onChange={(e) => setCopilotMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCopilotMessage()}
                className="flex-1 h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={handleSendCopilotMessage}
                className="h-9 w-9 bg-slate-900 text-white rounded-lg flex items-center justify-center hover:bg-slate-800 transition active:scale-95"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Stat = ({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'sky' | 'indigo' | 'slate' | 'teal' }) => {
  const colorMap = {
    sky: {
      bg: 'bg-sky-50 text-sky-600 border-sky-100',
      glow: 'hover:shadow-sky-100/50 hover:border-sky-300',
      iconBg: 'bg-sky-500/10 text-sky-600',
    },
    indigo: {
      bg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      glow: 'hover:shadow-indigo-100/50 hover:border-indigo-300',
      iconBg: 'bg-indigo-500/10 text-indigo-600',
    },
    slate: {
      bg: 'bg-slate-50 text-slate-600 border-slate-200',
      glow: 'hover:shadow-slate-100/50 hover:border-slate-350',
      iconBg: 'bg-slate-500/10 text-slate-600',
    },
    teal: {
      bg: 'bg-teal-50 text-teal-600 border-teal-100',
      glow: 'hover:shadow-teal-100/50 hover:border-teal-300',
      iconBg: 'bg-teal-500/10 text-teal-600',
    },
  }[tone];

  return (
    <div className={`group bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-lg transition-all duration-300 ${colorMap.glow}`}>
      <div className={`p-3 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110 ${colorMap.iconBg}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</span>
        <span className="block text-xl sm:text-2xl font-black text-slate-800 tracking-tight truncate" title={value}>{value}</span>
      </div>
    </div>
  );
};

const CrmMetric = ({ label, value, helper, active, onClick }: { label: string; value: string; helper: string; active?: boolean; onClick?: () => void }) => (
  <div
    onClick={onClick}
    className={`border rounded-xl p-3.5 transition duration-250 cursor-pointer select-none ${
      active
        ? 'bg-white/15 border-sky-400 shadow-md ring-1 ring-sky-400'
        : 'bg-white/5 border-white/10 hover:bg-white/10'
    }`}
  >
    <span className={`block text-[10px] font-bold uppercase tracking-wider ${active ? 'text-sky-300' : 'text-slate-400'}`}>{label}</span>
    <span className="block text-xl font-extrabold text-white mt-1">{value}</span>
    <span className={`block text-[10px] mt-1 ${active ? 'text-sky-300' : 'text-slate-400'}`}>{helper}</span>
  </div>
);

const StatusBadge = ({ status }: { status: Quote['status'] }) => {
  const tone =
    status === 'Approved' || status === 'Closed'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : status === 'Sent' || status === 'Invoice Raised' || status === 'Shipped'
        ? 'bg-sky-50 text-sky-700 border-sky-100'
        : status === 'Lost' || status === 'Declined'
          ? 'bg-red-50 text-red-700 border-red-100'
          : status === 'Negotiation'
            ? 'bg-amber-50 text-amber-700 border-amber-100'
            : 'bg-slate-100 text-slate-700 border-slate-200';

  return <span className={`inline-block px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${tone}`}>{status}</span>;
};

const EmptyState = ({ text }: { text: string }) => (
  <div className="text-center py-12 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50 font-medium px-4">{text}</div>
);

const DashboardList = ({ title, empty, rows }: { title: string; empty: string; rows: { title: string; meta: string }[] }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
    <h3 className="font-extrabold text-slate-900 text-sm mb-4 relative pb-2 border-b border-slate-100 flex items-center">
      <span className="absolute bottom-[-1px] left-0 h-[2px] w-8 bg-indigo-500 rounded"></span>
      {title}
    </h3>
    {rows.length === 0 ? (
      <EmptyState text={empty} />
    ) : (
      <div className="space-y-2.5 text-xs">
        {rows.map((row) => (
          <div key={`${row.title}-${row.meta}`} className="rounded-xl border border-slate-100 bg-slate-50/30 p-3.5 transition-all duration-200 hover:border-sky-200 hover:bg-sky-50/20">
            <div className="font-bold text-slate-900 leading-snug">{row.title}</div>
            <div className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              {row.meta}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const RowActions = ({ onEdit, onDelete, currentRole = 'Admin' }: { onEdit: () => void; onDelete: () => void; currentRole?: string }) => (
  <div className="flex items-center justify-center gap-1">
    <button type="button" onClick={onEdit} className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition" title="Edit">
      <Edit2 className="h-4 w-4" />
    </button>
    {currentRole === 'Admin' && (
      <button type="button" onClick={onDelete} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition" title="Delete">
        <Trash2 className="h-4 w-4" />
      </button>
    )}
  </div>
);

const TwoColumnManager = ({
  formTitle,
  form,
  children,
  isEditing,
  onSubmit,
  onCancel,
  scrollableForm = false
}: {
  formTitle: string;
  form: React.ReactNode;
  children: React.ReactNode;
  isEditing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  scrollableForm?: boolean;
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="bg-slate-50/90 p-5 rounded-2xl border border-slate-200 h-fit space-y-4 shadow-sm lg:sticky lg:top-24">
      <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-wider border-b border-slate-200 pb-2">{formTitle}</h3>
      <form onSubmit={onSubmit} className="space-y-3.5 text-xs">
        <div className={scrollableForm ? 'max-h-[52vh] overflow-y-auto pr-2 space-y-3.5 scroll-smooth' : 'space-y-3.5'}>
          {form}
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow transition flex items-center justify-center gap-1.5 active:scale-98">
            <Plus className="h-4 w-4" />
            {isEditing ? 'Update' : 'Save'}
          </button>
          {isEditing && (
            <button type="button" onClick={onCancel} className="px-3.5 py-2.5 bg-white border border-slate-300 text-slate-600 font-bold rounded-lg transition hover:bg-slate-50 active:scale-98">
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
    <div className="lg:col-span-2 space-y-4">{children}</div>
  </div>
);

const useBufferedText = (value: string, onChange: (value: string) => void, delay = 140) => {
  const [draft, setDraft] = React.useState(value);
  const latestValue = React.useRef(value);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    latestValue.current = value;
    setDraft(value);
  }, [value]);

  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const commit = React.useCallback((nextValue: string) => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    latestValue.current = nextValue;
    onChange(nextValue);
  }, [onChange]);

  const schedule = React.useCallback((nextValue: string) => {
    setDraft(nextValue);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(nextValue), delay);
  }, [commit, delay]);

  return { draft, schedule, commit };
};

const SmoothInput = ({
  value,
  onChange,
  className,
  delay = 140,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
  delay?: number;
}) => {
  const { draft, schedule, commit } = useBufferedText(value, onChange, delay);

  return (
    <input
      {...props}
      value={draft}
      onChange={(event) => schedule(event.target.value)}
      onBlur={() => commit(draft)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit(draft);
        props.onKeyDown?.(event);
      }}
      className={className}
    />
  );
};

const SmoothTextarea = ({
  value,
  onChange,
  className,
  delay = 140,
  ...props
}: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
  delay?: number;
}) => {
  const { draft, schedule, commit } = useBufferedText(value, onChange, delay);

  return (
    <textarea
      {...props}
      value={draft}
      onChange={(event) => schedule(event.target.value)}
      onBlur={() => commit(draft)}
      className={className}
    />
  );
};

const TextInput = ({ label, value, onChange, type = 'text', required = false, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) => (
  <label className="block">
    <span className="block text-slate-600 mb-1.5 font-bold tracking-wide text-[11px] uppercase">{label}</span>
    <SmoothInput
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      delay={type === 'date' ? 0 : 140}
      className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all duration-200 shadow-sm"
    />
  </label>
);

const NumberInput = ({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) => {
  const stringValue = Number.isFinite(value) && value !== 0 ? String(value) : '';

  return (
    <label className="block">
      <span className="block text-slate-600 mb-1.5 font-bold tracking-wide text-[11px] uppercase">{label}</span>
      <SmoothInput
        type="number"
        step="0.01"
        value={stringValue}
        onChange={(nextValue) => onChange(parseFloat(nextValue) || 0)}
        className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-xs font-semibold text-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all duration-200 shadow-sm"
      />
    </label>
  );
};

const SelectInput = ({
  label,
  value,
  onChange,
  options,
  labels = {}
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) => (
  <label className="block">
    <span className="block text-slate-600 mb-1.5 font-bold tracking-wide text-[11px] uppercase">{label}</span>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-xs font-semibold text-slate-800 appearance-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all duration-200 shadow-sm"
      >
        {options.map((option) => <option key={option} value={option}>{labels[option] || option || 'None'}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
    </div>
  </label>
);

const CheckboxInput = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) => (
  <label className="flex items-center gap-2.5 text-slate-600 cursor-pointer select-none">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4.5 w-4.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer" />
    <span className="font-bold text-xs">{label}</span>
  </label>
);

const TextArea = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <label className="block">
    <span className="block text-slate-600 mb-1.5 font-bold tracking-wide text-[11px] uppercase">{label}</span>
    <SmoothTextarea
      value={value}
      onChange={onChange}
      className="w-full p-3 border border-slate-200 rounded-lg bg-white text-xs font-semibold text-slate-800 min-h-24 resize-y focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all duration-200 shadow-sm"
    />
  </label>
);

const DataTable = ({ headers, children, pageSize = 8 }: { headers: string[]; children: React.ReactNode; pageSize?: number }) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const rows = React.Children.toArray(children);
  const totalPages = Math.ceil(rows.length / pageSize);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [rows.length]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = rows.slice(startIndex, startIndex + pageSize);

  if (rows.length === 0) {
    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm scroll-fade">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
              {headers.map((header) => <th key={header} className="p-3.5 whitespace-nowrap">{header}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td colSpan={headers.length} className="p-8 text-center text-slate-400">No records found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm scroll-fade">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
              {headers.map((header) => <th key={header} className="p-3.5 whitespace-nowrap">{header}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{paginatedRows}</tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border border-slate-200 bg-white px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 shadow-sm">
          <span>Showing <strong className="text-slate-900">{startIndex + 1}</strong> to <strong className="text-slate-900">{Math.min(startIndex + pageSize, rows.length)}</strong> of <strong className="text-slate-900">{rows.length}</strong> records</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(v => Math.max(1, v - 1))}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition active:scale-98"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(v => Math.min(totalPages, v + 1))}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition active:scale-98"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TableSkeleton = () => (
  <div className="space-y-4 py-4 animate-pulse w-full">
    <div className="h-10 bg-slate-100/60 rounded-xl w-full" />
    <div className="h-14 bg-slate-50/60 rounded-xl w-full" />
    <div className="h-14 bg-slate-50/60 rounded-xl w-full" />
    <div className="h-14 bg-slate-50/60 rounded-xl w-full" />
  </div>
);

const SimplePanel = ({ title, rows }: { title: string; rows: [string, string][] }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
    <h3 className="font-extrabold text-slate-900 text-sm mb-4 relative pb-2 border-b border-slate-100 flex items-center">
      <span className="absolute bottom-[-1px] left-0 h-[2px] w-8 bg-sky-500 rounded"></span>
      {title}
    </h3>
    <div className="space-y-2.5 text-xs">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-3 border-b border-slate-50 pb-2.5 last:border-b-0 last:pb-0">
          <span className="font-medium text-slate-500">{label}</span>
          <span className="font-bold text-slate-900 text-right break-words">{value}</span>
        </div>
      ))}
    </div>
  </div>
);

const SmallMetric = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 min-w-0">
    <span className="block text-[9px] uppercase font-bold text-slate-400">{label}</span>
    <span className="block font-bold text-slate-900 truncate mt-0.5" title={value}>{value}</span>
  </div>
);

const SmallBadge = ({ text }: { text: string }) => (
  <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold">{text}</span>
);

interface BuyerCardProps {
  client: Client;
  country: string;
  phone: string;
  metrics: {
    quotesCount: number;
    receivableValue: number;
    shipmentsCount: number;
    openTasksCount: number;
    lastActivityTitle: string;
  };
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  formatQuoteCurrency: (val: number, cur: 'INR' | 'USD') => string;
  bestSendWindowIST: (country: string) => string;
  crmLead?: Lead;
  onPushToCrm?: () => void;
  currentRole?: string;
}

const BuyerCard: React.FC<BuyerCardProps> = React.memo(({
  client,
  country,
  phone,
  metrics,
  onView,
  onEdit,
  onDelete,
  formatQuoteCurrency,
  bestSendWindowIST,
  crmLead,
  onPushToCrm,
  currentRole = 'Admin'
}) => {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
      <div className="flex justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-bold text-slate-900 truncate">{client.company_name}</h4>
          <div className="mt-1 flex flex-wrap gap-1.5 items-center">
            <SmallBadge text={country} />
            <span className="inline-block px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-bold">
              {bestSendWindowIST(country).replace('Best send: ', '')}
            </span>
            {crmLead ? (
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                crmLead.stage === 'Won' ? 'bg-teal-50 text-teal-700' :
                crmLead.stage === 'Lost' ? 'bg-rose-50 text-rose-700' :
                crmLead.stage === 'Quoted' ? 'bg-amber-50 text-amber-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                CRM: {crmLead.stage}
              </span>
            ) : (
              <button
                type="button"
                onClick={onPushToCrm}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-extrabold transition shadow-sm"
                title="Synchronize and create lead inside CRM Pipeline"
              >
                + Push to CRM
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onView} className="px-2 py-1 bg-sky-50 text-sky-700 rounded font-bold hover:bg-sky-100">View</button>
          <RowActions currentRole={currentRole} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
      <p className="text-slate-500 font-mono font-medium">{client.destination_port}</p>
      {client.address && <p className="text-[11px] text-slate-600 border-t pt-1.5">{client.address}</p>}
      <div className="text-[10px] text-slate-400 pt-1">
        <div>Contact: {client.contact_name || 'N/A'}</div>
        <div>Email: {client.contact_email || 'N/A'}</div>
        <div>Phone: {phone || 'N/A'}</div>
      </div>
      {client.products_dealing && client.products_dealing.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1.5 border-t border-dashed border-slate-100">
          {client.products_dealing.map((sku) => (
            <span key={sku} className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-extrabold uppercase tracking-wide">
              {sku}
            </span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
        {[
          ['Quotes', metrics.quotesCount.toString()],
          ['Receivable', formatQuoteCurrency(metrics.receivableValue, 'INR')],
          ['Shipments', metrics.shipmentsCount.toString()],
          ['Open Tasks', metrics.openTasksCount.toString()]
        ].map(([label, value]) => (
          <div key={label} className="bg-slate-50 rounded p-2">
            <span className="block text-[9px] uppercase font-bold text-slate-400">{label}</span>
            <span className="font-bold text-slate-900">{value}</span>
          </div>
        ))}
      </div>
      <div className="pt-2 text-[11px] text-slate-600">
        Last activity: {metrics.lastActivityTitle}
      </div>
    </div>
  );
});
BuyerCard.displayName = 'BuyerCard';

interface BuyerDetailModalProps {
  buyer: Client;
  clientMetrics: Record<string, {
    quotesCount: number;
    receivableValue: number;
    shipmentsCount: number;
    openTasksCount: number;
    lastActivityTitle: string;
  }>;
  quotes: Quote[];
  invoices: InvoiceRecord[];
  shipments: ShipmentRecord[];
  tasks: TaskRecord[];
  activities: TimelineActivity[];
  onClose: () => void;
  formatQuoteCurrency: (val: number, cur: 'INR' | 'USD') => string;
  quoteValue: (q: Quote) => number;
}

const BuyerDetailModal: React.FC<BuyerDetailModalProps> = React.memo(({
  buyer,
  clientMetrics,
  quotes,
  invoices,
  shipments,
  tasks,
  activities,
  onClose,
  formatQuoteCurrency,
  quoteValue
}) => {
  const metrics = clientMetrics[buyer.id] || {
    quotesCount: 0,
    receivableValue: 0,
    shipmentsCount: 0,
    openTasksCount: 0,
    lastActivityTitle: 'No activity logged'
  };

  const clientQuotes = quotes.filter((q) => q.client_id === buyer.id);
  const clientTasks = tasks.filter((t) => t.client_id === buyer.id && t.status !== 'Done');
  const clientShipments = shipments.filter((s) => s.client_id === buyer.id);
  const clientActivities = activities.filter((act) => act.client_id === buyer.id);

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/30 flex justify-end" onClick={onClose}>
      <div className="h-full w-full max-w-xl bg-white shadow-2xl overflow-y-auto animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Buyer CRM Detail</p>
            <h3 className="text-xl font-extrabold text-slate-900">{buyer.company_name}</h3>
            <p className="text-xs text-slate-500">{buyer.destination_port}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded hover:bg-slate-100 text-slate-500"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <SmallMetric label="Contact" value={buyer.contact_name || 'Not set'} />
            <SmallMetric label="Email" value={buyer.contact_email || 'Not set'} />
            <SmallMetric label="Quotes" value={metrics.quotesCount.toString()} />
            <SmallMetric label="Open Tasks" value={metrics.openTasksCount.toString()} />
          </div>
          <SimplePanel title="Financials" rows={[
            ['Quoted value', formatQuoteCurrency(clientQuotes.reduce((sum, quote) => sum + quoteValue(quote), 0), 'INR')],
            ['Receivable', formatQuoteCurrency(metrics.receivableValue, 'INR')],
            ['Invoices', invoices.filter((invoice) => invoice.client_id === buyer.id).length.toString()],
            ['Shipments', metrics.shipmentsCount.toString()]
          ]} />
          {buyer.products_dealing && buyer.products_dealing.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">Products Dealing In</h4>
              <div className="flex flex-wrap gap-2">
                {buyer.products_dealing.map((sku) => (
                  <span key={sku} className="inline-block px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wide">
                    {sku}
                  </span>
                ))}
              </div>
            </div>
          )}
          <DashboardList title="Recent Communication" empty="No communication logged." rows={clientActivities.slice(0, 5).map((activity) => ({
            title: activity.title,
            meta: `${activity.type} | ${activity.activity_date}`
          }))} />
          <DashboardList title="Active Shipments" empty="No active shipments." rows={clientShipments.map((shipment) => ({
            title: shipment.booking_number || shipment.vessel_name || 'Shipment',
            meta: `${shipment.status} | ETA ${shipment.eta || 'TBA'}`
          }))} />
        </div>
      </div>
    </div>
  );
});
BuyerDetailModal.displayName = 'BuyerDetailModal';

// CRM Re-built cleanly with optimal callbacks and memo hooks v4
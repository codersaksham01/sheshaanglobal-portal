'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  FileCheck2,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Ship,
  Eye,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Download,
  Receipt,
  RotateCcw,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Check
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { getPortalCache, setPortalCache, fetchAllPortalData } from '../../lib/portalDataStore';
import { Quote, Client, Product, FreightPreset } from '../../lib/types';
import { QuoteForm } from '../QuoteForm';

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

type QuoteSortKey = 'created_desc' | 'created_asc' | 'value_desc' | 'value_asc' | 'buyer_asc' | 'status_asc';

function quoteValue(quote: Quote): number {
  const itemsTotal = (quote.items || []).reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0
  );
  return itemsTotal + (Number(quote.freight_cost) || 0) + (Number(quote.insurance_cost) || 0);
}

function formatQuoteCurrency(amount: number, currency: string = 'INR'): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  }
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function StatusBadge({ status }: { status: Quote['status'] }) {
  const styles: Record<Quote['status'], string> = {
    Draft: 'bg-slate-100 text-slate-700 border-slate-200',
    Sent: 'bg-sky-50 text-sky-700 border-sky-200',
    Negotiation: 'bg-amber-50 text-amber-700 border-amber-200',
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Invoice Raised': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Shipped: 'bg-teal-50 text-teal-700 border-teal-200',
    Closed: 'bg-slate-200 text-slate-800 border-slate-300',
    Lost: 'bg-red-50 text-red-700 border-red-200',
    Declined: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border ${styles[status] || styles.Draft}`}>
      {status}
    </span>
  );
}

export function QuotesWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [quotes, setQuotes] = useState<Quote[]>(() => {
    const cached = getPortalCache();
    return cached?.quotes || [];
  });
  const [loading, setLoading] = useState(() => !getPortalCache()?.quotes?.length);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null | undefined>(() => {
    if (searchParams.get('new') === 'true') return null;
    const editId = searchParams.get('edit');
    return editId || undefined;
  });

  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<'All' | Quote['status']>('All');
  const [quoteCurrencyFilter, setQuoteCurrencyFilter] = useState<'All' | 'INR' | 'USD'>('All');
  const [quoteSort, setQuoteSort] = useState<QuoteSortKey>('created_desc');
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  const [rowDensity, setRowDensity] = useState<'compact' | 'default' | 'comfortable'>('default');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchQuotes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*, client:clients(*), items:quote_items(*)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setQuotes(data);
        setPortalCache({ quotes: data });
      }
    } catch (e) {
      console.warn('Failed to fetch quotes:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Filter and sort quotes
  const filteredQuotes = useMemo(() => {
    let result = [...quotes];

    if (quoteSearch.trim()) {
      const query = quoteSearch.toLowerCase();
      result = result.filter(
        (q) =>
          q.quote_number?.toLowerCase().includes(query) ||
          q.client?.company_name?.toLowerCase().includes(query) ||
          q.client?.destination_port?.toLowerCase().includes(query) ||
          q.client?.contact_email?.toLowerCase().includes(query)
      );
    }

    if (quoteStatusFilter !== 'All') {
      result = result.filter((q) => q.status === quoteStatusFilter);
    }

    if (quoteCurrencyFilter !== 'All') {
      result = result.filter((q) => (q.currency || 'INR') === quoteCurrencyFilter);
    }

    result.sort((a, b) => {
      if (quoteSort === 'created_desc') return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
      if (quoteSort === 'created_asc') return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
      if (quoteSort === 'value_desc') return quoteValue(b) - quoteValue(a);
      if (quoteSort === 'value_asc') return quoteValue(a) - quoteValue(b);
      if (quoteSort === 'buyer_asc') return (a.client?.company_name || '').localeCompare(b.client?.company_name || '');
      if (quoteSort === 'status_asc') return (a.status || '').localeCompare(b.status || '');
      return 0;
    });

    return result;
  }, [quotes, quoteSearch, quoteStatusFilter, quoteCurrencyFilter, quoteSort]);

  // Operational pipeline stats
  const metrics = useMemo(() => {
    const approvalQueue = quotes.filter((q) => q.status === 'Draft');
    const inNegotiation = quotes.filter((q) => ['Sent', 'Negotiation'].includes(q.status));
    const approved = quotes.filter((q) => ['Approved', 'Invoice Raised', 'Shipped', 'Closed'].includes(q.status));
    const totalPipelineValue = quotes.reduce((sum, q) => sum + quoteValue(q), 0);

    return {
      approvalQueue: approvalQueue.length,
      inNegotiation: inNegotiation.length,
      approved: approved.length,
      pipelineValue: totalPipelineValue
    };
  }, [quotes]);

  const handleDeleteQuote = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this quotation?')) return;
    try {
      await supabase.from('quote_items').delete().eq('quote_id', id);
      await supabase.from('quotes').delete().eq('id', id);
      setQuotes((prev) => prev.filter((q) => q.id !== id));
      showToast('Quotation deleted successfully.');
    } catch {
      alert('Failed to delete quote. Please try again.');
    }
  };

  const handleUpdateStatus = async (quoteId: string, status: Quote['status']) => {
    try {
      await supabase.from('quotes').update({ status }).eq('id', quoteId);
      setQuotes((prev) => prev.map((q) => (q.id === quoteId ? { ...q, status } : q)));
      showToast(`Status updated to ${status}`);
    } catch {
      alert('Failed to update quote status.');
    }
  };

  if (editingQuoteId !== undefined) {
    return (
      <div className="space-y-4">
        <QuoteForm
          quoteId={editingQuoteId}
          onSaveSuccess={() => {
            setEditingQuoteId(undefined);
            fetchQuotes();
          }}
          onCancel={() => setEditingQuoteId(undefined)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white shadow-2xl animate-fade-up">
          {toastMessage}
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Quote Automation</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Create FOB/CIF commercial offers, manage margins, and generate client-ready export documents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditingQuoteId(null)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-sm active:scale-95 transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Quote</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Approval Queue</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{metrics.approvalQueue}</p>
          <p className="mt-1 text-xs font-semibold text-slate-600">Drafts pending review</p>
        </div>
        <div className="rounded-xl border border-sky-200/80 bg-sky-50/60 p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-sky-700">Sent / Negotiation</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{metrics.inNegotiation}</p>
          <p className="mt-1 text-xs font-semibold text-slate-600">Awaiting buyer response</p>
        </div>
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Approved Deals</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{metrics.approved}</p>
          <p className="mt-1 text-xs font-semibold text-slate-600">Ready for invoice / shipment</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Pipeline Value</p>
          <p className="mt-1 text-xl font-black text-slate-950 truncate">
            {formatQuoteCurrency(metrics.pipelineValue, 'INR')}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-600">Total active commercial quotes</p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={quoteSearch}
            onChange={(e) => setQuoteSearch(e.target.value)}
            placeholder="Search by quote number, buyer company, destination port, email..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
          />
        </div>
        <select
          value={quoteStatusFilter}
          onChange={(e) => setQuoteStatusFilter(e.target.value as any)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        >
          <option value="All">All Statuses</option>
          {quoteStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={quoteSort}
          onChange={(e) => setQuoteSort(e.target.value as QuoteSortKey)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        >
          <option value="created_desc">Newest first</option>
          <option value="created_asc">Oldest first</option>
          <option value="value_desc">Highest CIF first</option>
          <option value="value_asc">Lowest CIF first</option>
          <option value="buyer_asc">Buyer A-Z</option>
          <option value="status_asc">Status A-Z</option>
        </select>
      </div>

      {/* Main Content Area */}
      {loading && quotes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <RefreshCw className="h-7 w-7 animate-spin text-sky-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">Synchronizing quotations...</p>
          <p className="text-xs text-slate-400 mt-0.5">Connecting to database</p>
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <FileCheck2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">No quotes match the current filters</p>
          <p className="text-xs text-slate-400 mt-1">Try clearing your search term or status filters.</p>
          <button
            type="button"
            onClick={() => {
              setQuoteSearch('');
              setQuoteStatusFilter('All');
              setQuoteCurrencyFilter('All');
            }}
            className="mt-4 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          {/* Mobile Quotes Card List (< md) */}
          <div className="md:hidden space-y-2.5">
            <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-500">
              <span>{filteredQuotes.length} quotes</span>
              <button
                type="button"
                onClick={() => setEditingQuoteId(null)}
                className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 font-extrabold text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                New Quote
              </button>
            </div>
            {filteredQuotes.map((q) => (
              <div
                key={q.id}
                onClick={() => setEditingQuoteId(q.id)}
                className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs space-y-2.5 active:scale-[0.99] transition cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {q.quote_number}
                      </span>
                      <StatusBadge status={q.status} />
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900 truncate mt-1.5">
                      {q.client?.company_name || 'Unassigned'}
                    </h4>
                    {q.client?.destination_port && (
                      <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                        Port: {q.client.destination_port}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Total CIF</span>
                    <span className="font-mono font-black text-sm text-sky-600 block mt-0.5">
                      {formatQuoteCurrency(quoteValue(q), q.currency || 'INR')}
                    </span>
                  </div>
                </div>

                {/* Mobile Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setEditingQuoteId(q.id)}
                    className="flex-1 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1 transition"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit Quote</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuote(q.id)}
                    className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 inline-flex items-center justify-center transition"
                    title="Delete Quote"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Quotes Table (>= md) */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-xs">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/70 border-b border-slate-200/80">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                {filteredQuotes.length} quotes displayed
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold">Density:</span>
                {(['compact', 'default', 'comfortable'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setRowDensity(d)}
                    className={`text-[10px] px-2 py-0.5 rounded font-extrabold transition ${
                      rowDensity === d ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/40 text-[10px] uppercase font-black tracking-wider text-slate-500">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      onChange={(e) => setSelectedQuoteIds(e.target.checked ? filteredQuotes.map((q) => q.id) : [])}
                      checked={selectedQuoteIds.length === filteredQuotes.length && filteredQuotes.length > 0}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 font-black">Reference</th>
                  <th className="py-3 px-4 font-black">Buyer Company</th>
                  <th className="py-3 px-4 font-black">Destination Port</th>
                  <th className="py-3 px-4 font-black text-right">Freight</th>
                  <th className="py-3 px-4 font-black text-right">Insurance</th>
                  <th className="py-3 px-4 font-black text-right">Total CIF</th>
                  <th className="py-3 px-4 font-black text-center">Status</th>
                  <th className="py-3 px-4 font-black text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotes.map((q) => {
                  const isSelected = selectedQuoteIds.includes(q.id);
                  const pad = rowDensity === 'compact' ? 'py-2 px-4' : rowDensity === 'comfortable' ? 'py-4 px-4' : 'py-3 px-4';
                  return (
                    <tr
                      key={q.id}
                      onClick={() => setEditingQuoteId(q.id)}
                      className={`hover:bg-slate-50/80 transition cursor-pointer select-none ${isSelected ? 'bg-sky-50/40' : ''}`}
                    >
                      <td className={pad} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) =>
                            setSelectedQuoteIds((prev) =>
                              e.target.checked ? [...prev, q.id] : prev.filter((id) => id !== q.id)
                            )
                          }
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                      </td>
                      <td className={pad}>
                        <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {q.quote_number}
                        </span>
                      </td>
                      <td className={pad}>
                        <span className="font-extrabold text-slate-900 block">{q.client?.company_name || 'Unassigned'}</span>
                        <span className="text-[10px] text-slate-400 block">{q.client?.contact_email}</span>
                      </td>
                      <td className={pad}>
                        <span className="font-bold text-slate-600">{q.client?.destination_port || 'N/A'}</span>
                      </td>
                      <td className={`${pad} text-right font-mono text-slate-500`}>
                        {formatQuoteCurrency(Number(q.freight_cost || 0), q.currency || 'INR')}
                      </td>
                      <td className={`${pad} text-right font-mono text-slate-500`}>
                        {formatQuoteCurrency(Number(q.insurance_cost || 0), q.currency || 'INR')}
                      </td>
                      <td className={`${pad} text-right font-mono font-black text-sky-600`}>
                        {formatQuoteCurrency(quoteValue(q), q.currency || 'INR')}
                      </td>
                      <td className={`${pad} text-center`}>
                        <StatusBadge status={q.status} />
                      </td>
                      <td className={pad} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingQuoteId(q.id)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition"
                            title="Edit Quote"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuote(q.id)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                            title="Delete Quote"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

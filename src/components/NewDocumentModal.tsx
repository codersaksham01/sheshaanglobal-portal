'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Receipt,
  Package,
  Search,
  X,
  ArrowLeft,
  ArrowRight,
  User,
  ClipboardCopy,
  Plus,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getPortalCache } from '../lib/portalDataStore';
import type { Client, Quote } from '../lib/types';

export type DocumentType = 'quotation' | 'invoice' | 'packing_list';

export interface NewDocumentSelection {
  documentType: DocumentType;
  prefillBuyerId?: string;
  prefillQuoteId?: string;
}

interface NewDocumentModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (selection: NewDocumentSelection) => void;
}

const DOC_TYPE_OPTIONS: {
  type: DocumentType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    type: 'quotation',
    label: 'Quotation',
    description: 'Create a CIF/FOB commercial quotation with pricing, terms, and detailed cost breakdowns.',
    icon: <FileText className="w-6 h-6" />,
    color: 'text-sky-700',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200 hover:border-sky-400',
  },
  {
    type: 'invoice',
    label: 'Commercial Invoice',
    description: 'Generate a formal commercial invoice for customs and payment processing.',
    icon: <Receipt className="w-6 h-6" />,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200 hover:border-emerald-400',
  },
  {
    type: 'packing_list',
    label: 'Packing List',
    description: 'Create export packing specifications with container, weight, and cargo details.',
    icon: <Package className="w-6 h-6" />,
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200 hover:border-violet-400',
  },
];

export const NewDocumentModal: React.FC<NewDocumentModalProps> = ({ open, onClose, onSelect }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null);
  const [prefillMode, setPrefillMode] = useState<'fresh' | 'buyer' | 'quote' | null>(null);

  // Data for pre-fill dropdowns
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [quoteSearch, setQuoteSearch] = useState('');
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const clientSearchRef = useRef<HTMLInputElement>(null);
  const quoteSearchRef = useRef<HTMLInputElement>(null);

  // Load data from cache or Supabase
  useEffect(() => {
    if (!open) return;

    const cached = getPortalCache();
    if (cached?.clients?.length) {
      setClients(cached.clients);
    } else {
      supabase.from('clients').select('*').then(({ data }: { data: any }) => {
        if (data) setClients(data);
      });
    }

    if (cached?.quotes?.length) {
      setQuotes(cached.quotes);
    } else {
      supabase
        .from('quotes')
        .select('*, client:clients(*)')
        .order('created_at', { ascending: false })
        .then(({ data }: { data: any }) => {
          if (data) setQuotes(data);
        });
    }
  }, [open]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedDocType(null);
      setPrefillMode(null);
      setClientSearch('');
      setQuoteSearch('');
      setSelectedBuyerId(null);
      setSelectedQuoteId(null);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Filtered data
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(
      (c) =>
        c.company_name?.toLowerCase().includes(q) ||
        c.contact_name?.toLowerCase().includes(q) ||
        c.contact_email?.toLowerCase().includes(q) ||
        c.destination_port?.toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  const filteredQuotes = useMemo(() => {
    if (!quoteSearch.trim()) return quotes.slice(0, 50);
    const q = quoteSearch.toLowerCase();
    return quotes
      .filter(
        (qt) =>
          qt.quote_number?.toLowerCase().includes(q) ||
          (qt.client as Client | undefined)?.company_name?.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [quotes, quoteSearch]);

  const handleDocTypeSelect = (type: DocumentType) => {
    setSelectedDocType(type);
    setStep(2);
  };

  const handleStartFresh = () => {
    if (!selectedDocType) return;
    onSelect({ documentType: selectedDocType });
  };

  const handlePrefillFromBuyer = () => {
    if (!selectedDocType || !selectedBuyerId) return;
    onSelect({ documentType: selectedDocType, prefillBuyerId: selectedBuyerId });
  };

  const handlePrefillFromQuote = () => {
    if (!selectedDocType || !selectedQuoteId) return;
    onSelect({ documentType: selectedDocType, prefillQuoteId: selectedQuoteId });
  };

  if (!open) return null;

  const selectedDocOption = DOC_TYPE_OPTIONS.find((d) => d.type === selectedDocType);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 fade-in duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                onClick={() => {
                  setStep(1);
                  setPrefillMode(null);
                  setSelectedBuyerId(null);
                  setSelectedQuoteId(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {step === 1 ? 'Create New Document' : `New ${selectedDocOption?.label || 'Document'}`}
              </h2>
              <p className="text-[11px] text-slate-500">
                {step === 1
                  ? 'Choose the type of document you want to create'
                  : 'Choose how to start your document'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DOC_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => handleDocTypeSelect(opt.type)}
                  className={`group relative text-left p-4 rounded-xl border-2 ${opt.borderColor} ${opt.bgColor} transition-all duration-150 hover:shadow-md active:scale-[0.98]`}
                >
                  <div className={`inline-flex p-2.5 rounded-lg ${opt.bgColor} ${opt.color} mb-3 ring-1 ring-inset ring-current/10`}>
                    {opt.icon}
                  </div>
                  <h3 className={`text-sm font-bold ${opt.color} mb-1`}>{opt.label}</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{opt.description}</p>
                  <ChevronRight className="absolute top-4 right-3 w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {/* Start Fresh */}
              <button
                onClick={handleStartFresh}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50 text-left transition-all duration-150 active:scale-[0.99] group"
              >
                <div className="flex-shrink-0 p-2.5 rounded-lg bg-slate-100 text-slate-600">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-800">Start Fresh</h4>
                  <p className="text-[11px] text-slate-500">Create a blank document and fill in all details manually.</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
              </button>

              {/* Pre-fill from Buyer */}
              <div className="rounded-xl border-2 border-slate-200 hover:border-slate-300 bg-white overflow-hidden transition-colors">
                <button
                  onClick={() => {
                    setPrefillMode(prefillMode === 'buyer' ? null : 'buyer');
                    setSelectedBuyerId(null);
                    setClientSearch('');
                    setTimeout(() => clientSearchRef.current?.focus(), 100);
                  }}
                  className="w-full flex items-center gap-4 p-4 text-left group"
                >
                  <div className="flex-shrink-0 p-2.5 rounded-lg bg-amber-50 text-amber-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-800">Pre-fill from Buyer</h4>
                    <p className="text-[11px] text-slate-500">Select a buyer to auto-fill their details (company, port, terms).</p>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-300 transition-transform ${prefillMode === 'buyer' ? 'rotate-90' : ''}`}
                  />
                </button>

                {prefillMode === 'buyer' && (
                  <div className="px-4 pb-4 border-t border-slate-100">
                    <div className="relative mt-3 mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        ref={clientSearchRef}
                        type="text"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder="Search buyers by name, email, or port..."
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 bg-slate-50"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                      {filteredClients.length === 0 ? (
                        <p className="text-[11px] text-slate-400 text-center py-3">No buyers found.</p>
                      ) : (
                        filteredClients.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setSelectedBuyerId(c.id)}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition text-xs ${
                              selectedBuyerId === c.id
                                ? 'bg-sky-50 border border-sky-300 text-sky-900'
                                : 'hover:bg-slate-50 border border-transparent text-slate-700'
                            }`}
                          >
                            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 flex-shrink-0">
                              {(c.company_name || '?')[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold truncate">{c.company_name}</div>
                              {c.destination_port && (
                                <div className="text-[10px] text-slate-400 truncate">{c.destination_port}</div>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    {selectedBuyerId && (
                      <button
                        onClick={handlePrefillFromBuyer}
                        className="mt-3 w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition active:scale-[0.98]"
                      >
                        Create {selectedDocOption?.label} with Selected Buyer
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Pre-fill from Existing Quote */}
              <div className="rounded-xl border-2 border-slate-200 hover:border-slate-300 bg-white overflow-hidden transition-colors">
                <button
                  onClick={() => {
                    setPrefillMode(prefillMode === 'quote' ? null : 'quote');
                    setSelectedQuoteId(null);
                    setQuoteSearch('');
                    setTimeout(() => quoteSearchRef.current?.focus(), 100);
                  }}
                  className="w-full flex items-center gap-4 p-4 text-left group"
                >
                  <div className="flex-shrink-0 p-2.5 rounded-lg bg-violet-50 text-violet-600">
                    <ClipboardCopy className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-800">Pre-fill from Existing Quote</h4>
                    <p className="text-[11px] text-slate-500">Clone an existing quotation to reuse items, pricing, and logistics.</p>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-300 transition-transform ${prefillMode === 'quote' ? 'rotate-90' : ''}`}
                  />
                </button>

                {prefillMode === 'quote' && (
                  <div className="px-4 pb-4 border-t border-slate-100">
                    <div className="relative mt-3 mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        ref={quoteSearchRef}
                        type="text"
                        value={quoteSearch}
                        onChange={(e) => setQuoteSearch(e.target.value)}
                        placeholder="Search by quote number or buyer..."
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 bg-slate-50"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                      {filteredQuotes.length === 0 ? (
                        <p className="text-[11px] text-slate-400 text-center py-3">No quotes found.</p>
                      ) : (
                        filteredQuotes.map((qt) => {
                          const clientName =
                            (qt.client as Client | undefined)?.company_name || 'No buyer';
                          return (
                            <button
                              key={qt.id}
                              onClick={() => setSelectedQuoteId(qt.id)}
                              className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition text-xs ${
                                selectedQuoteId === qt.id
                                  ? 'bg-violet-50 border border-violet-300 text-violet-900'
                                  : 'hover:bg-slate-50 border border-transparent text-slate-700'
                              }`}
                            >
                              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 flex-shrink-0">
                                {(qt.quote_number || '#')[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold truncate">{qt.quote_number || 'Untitled'}</div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {clientName} · {qt.status || 'Draft'}
                                </div>
                              </div>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                  qt.status === 'Approved'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : qt.status === 'Sent'
                                      ? 'bg-sky-100 text-sky-700'
                                      : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {qt.status || 'Draft'}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                    {selectedQuoteId && (
                      <button
                        onClick={handlePrefillFromQuote}
                        className="mt-3 w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition active:scale-[0.98]"
                      >
                        Create {selectedDocOption?.label} from Selected Quote
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[10px] text-slate-400 text-center">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-mono text-[9px]">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
};

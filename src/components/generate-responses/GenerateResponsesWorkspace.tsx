'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Send,
  Search,
  Copy,
  Check,
  Sparkles,
  MessageSquare,
  Mail,
  User,
  Building,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { getPortalCache, setPortalCache } from '../../lib/portalDataStore';
import { Client, Lead } from '../../lib/types';

const sanitizePhoneDigits = (phone?: string) => (phone || '').replace(/\D/g, '');

type ResponseType = 'Reachout' | 'Quotation' | 'Follow-up' | 'Payment';

export function GenerateResponsesWorkspace() {
  const [clients, setClients] = useState<Client[]>(() => getPortalCache()?.clients || []);
  const [leads, setLeads] = useState<Lead[]>(() => getPortalCache()?.leads || []);
  const [responseType, setResponseType] = useState<ResponseType>('Reachout');
  const [buyerSearch, setBuyerSearch] = useState('');
  const [selectedBuyerName, setSelectedBuyerName] = useState('');
  const [selectedContactPerson, setSelectedContactPerson] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('1121 Basmati Rice (Steam / Sella)');
  const [selectedPort, setSelectedPort] = useState('Jebel Ali, UAE');
  const [selectedPhone, setSelectedPhone] = useState('');
  const [selectedEmail, setSelectedEmail] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (!clients.length) {
      supabase.from('clients').select('*').then(({ data }: { data: any }) => {
        if (data) setClients(data);
      });
    }
    if (!leads.length) {
      supabase.from('leads').select('*').then(({ data }: { data: any }) => {
        if (data) setLeads(data);
      });
    }
  }, [clients.length, leads.length]);

  // Search matches from clients and leads
  const buyerMatches = useMemo(() => {
    if (!buyerSearch.trim()) return [];
    const q = buyerSearch.toLowerCase();
    const fromClients = clients
      .filter((c) => c.company_name?.toLowerCase().includes(q) || c.contact_name?.toLowerCase().includes(q))
      .map((c) => ({
        id: c.id,
        name: c.company_name,
        contact: c.contact_name,
        email: c.contact_email,
        phone: c.phone,
        port: c.destination_port
      }));
    const fromLeads = leads
      .filter((l) => l.company_name?.toLowerCase().includes(q) || l.contact_name?.toLowerCase().includes(q))
      .map((l) => ({
        id: l.id,
        name: l.company_name,
        contact: l.contact_name,
        email: l.contact_email,
        phone: l.phone,
        port: l.country ? `Port of ${l.country}` : ''
      }));

    return [...fromClients, ...fromLeads].slice(0, 6);
  }, [clients, leads, buyerSearch]);

  const selectBuyer = (b: { name: string; contact?: string; email?: string; phone?: string; port?: string }) => {
    setSelectedBuyerName(b.name);
    if (b.contact) setSelectedContactPerson(b.contact);
    if (b.email) setSelectedEmail(b.email);
    if (b.phone) setSelectedPhone(b.phone);
    if (b.port) setSelectedPort(b.port);
    setBuyerSearch('');
    showToast(`Loaded details for ${b.name}`);
  };

  // Generate dynamic text based on chosen parameters
  const generatedMessage = useMemo(() => {
    const greeting = selectedContactPerson ? `Dear ${selectedContactPerson}` : `Dear Procurement Team, ${selectedBuyerName || 'Sir/Madam'}`;
    const company = selectedBuyerName ? ` (${selectedBuyerName})` : '';

    if (responseType === 'Reachout') {
      return `${greeting}${company},\n\nGreetings from Sheshaan Global - direct processors and merchant exporters of premium Indian agro commodities.\n\nWe specialize in direct milling, automated Sortex cleaning, and containerized export of:\n• 1121 & 1509 Basmati Rice (Golden / Creamy Sella, Steam)\n• Premium Spices (Cumin Seeds, Turmeric, Coriander, Red Chilli)\n• Agro Commodities & Oilseeds\n\nWe currently supply top distributors across GCC, Europe, and North America with strict SGS/Phytosanitary inspection, competitive FOB/CIF rates, and prompt container shipment.\n\nCould you please share your active procurement specifications for ${selectedProduct} into ${selectedPort || 'your destination port'}? We would be delighted to submit our best commercial offer.\n\nBest regards,\nExport Sales Desk\nSheshaan Global`;
    }

    if (responseType === 'Quotation') {
      return `${greeting}${company},\n\nThank you for your inquiry regarding ${selectedProduct}.\n\nWe have prepared our formal CIF quotation for your destination (${selectedPort || 'CIF destination port'}). Our offer includes:\n• Specification: Sortex Cleaned, Export Grade, Max 12.5% Moisture\n• Packaging: 25kg / 50kg Non-Woven / BOPP Poly Bags\n• Inspection: Comprehensive SGS / Intertek Pre-shipment Quality Clearance\n• Shipping: 20ft / 40ft FCL Containerized Sea Freight\n\nPlease find the attached formal commercial offer document for your review. We look forward to your confirmation or counter-feedback to finalize the booking.\n\nBest regards,\nSheshaan Global Export Operations`;
    }

    if (responseType === 'Follow-up') {
      return `Hello ${selectedContactPerson || selectedBuyerName || 'Sir'},\n\nFollowing up on our quotation for ${selectedProduct} shared earlier this week.\n\nOcean freight rates for ${selectedPort || 'your port'} remain competitive for the upcoming vessel sailing. Please let us know if you have reviewed our commercial proposal or if you require any adjustments on payment terms, packaging, or target pricing.\n\nLooking forward to hearing from you.\n\nWarm regards,\nSheshaan Global`;
    }

    return `Dear ${selectedContactPerson || selectedBuyerName || 'Accounts Team'},\n\nWe hope this message finds you well.\n\nThis is a gentle update regarding proforma invoice for shipment of ${selectedProduct}. Kindly share the swift copy / advance payment receipt at your earliest convenience so our warehouse team can lock the milling schedule and container dispatch.\n\nThank you for your valued partnership.\n\nBest regards,\nSheshaan Global Finance Desk`;
  }, [responseType, selectedContactPerson, selectedBuyerName, selectedProduct, selectedPort]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    showToast('Copied message to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const raw = sanitizePhoneDigits(selectedPhone);
    const text = encodeURIComponent(generatedMessage);
    if (raw) {
      window.open(`https://wa.me/${raw}?text=${text}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  return (
    <div className="space-y-5">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white shadow-2xl animate-fade-up">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Generate Buyer Responses</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Craft tailored commercial messages for international buyers, select communication tone, and dispatch in one click.
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          {(['Reachout', 'Quotation', 'Follow-up', 'Payment'] as ResponseType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setResponseType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                responseType === type
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Inputs Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3.5 text-xs">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
              Buyer & Deal Parameters
            </h3>

            {/* Quick Search */}
            <div className="relative">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Quick Fill From Existing Buyer
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={buyerSearch}
                  onChange={(e) => setBuyerSearch(e.target.value)}
                  placeholder="Type company or contact name..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:bg-white"
                />
              </div>
              {buyerMatches.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl space-y-1">
                  {buyerMatches.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => selectBuyer(m)}
                      className="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition flex items-center justify-between"
                    >
                      <span className="font-extrabold text-slate-900 truncate">{m.name}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{m.contact || m.port || 'Select'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={selectedBuyerName}
                onChange={(e) => setSelectedBuyerName(e.target.value)}
                placeholder="e.g. Al Maya International LLC"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={selectedContactPerson}
                  onChange={(e) => setSelectedContactPerson(e.target.value)}
                  placeholder="Mr. Tariq"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Destination Port
                </label>
                <input
                  type="text"
                  value={selectedPort}
                  onChange={(e) => setSelectedPort(e.target.value)}
                  placeholder="Jebel Ali, UAE"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                Commodity / Product Interest
              </label>
              <input
                type="text"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                placeholder="1121 Basmati Rice / Cumin Seeds"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Phone / WhatsApp
                </label>
                <input
                  type="text"
                  value={selectedPhone}
                  onChange={(e) => setSelectedPhone(e.target.value)}
                  placeholder="+971 50..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={selectedEmail}
                  onChange={(e) => setSelectedEmail(e.target.value)}
                  placeholder="buyer@domain.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Output & Preview Panel */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs flex flex-col justify-between space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                  Generated {responseType} Message
                </h3>
              </div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Ready for Dispatch
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 font-sans text-xs text-slate-800 leading-relaxed whitespace-pre-wrap min-h-[300px] select-text">
              {generatedMessage}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black inline-flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black inline-flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Open in WhatsApp</span>
              </button>

              {selectedEmail && (
                <a
                  href={`mailto:${selectedEmail}?subject=${encodeURIComponent(
                    `Commercial Export Information: ${selectedProduct}`
                  )}&body=${encodeURIComponent(generatedMessage)}`}
                  className="h-9 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black inline-flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
                >
                  <Mail className="h-4 w-4" />
                  <span>Send Email</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

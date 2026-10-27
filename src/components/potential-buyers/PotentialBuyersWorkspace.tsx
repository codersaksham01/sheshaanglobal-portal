'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Target,
  Plus,
  Search,
  Mail,
  Phone,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { getPortalCache, setPortalCache } from '../../lib/portalDataStore';
import { Lead } from '../../lib/types';
import {
  leadActionCategory,
  leadCategoryClass,
  hasContactablePhone
} from '../../lib/leadUtils';

const sanitizePhoneDigits = (phone?: string) => (phone || '').replace(/\D/g, '');

const blankBuyer: Partial<Lead> = {
  company_name: '',
  contact_name: '',
  contact_email: '',
  phone: '',
  country: '',
  product_interest: '',
  priority: 'High',
  stage: 'New Lead',
  next_follow_up: '',
  notes: 'Status: Potential Focused Buyer'
};

export function PotentialBuyersWorkspace() {
  const [leads, setLeads] = useState<Lead[]>(() => {
    return getPortalCache()?.leads || [];
  });
  const [loading, setLoading] = useState(() => !getPortalCache()?.leads?.length);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'All' | 'Need Reach Out' | 'Follow-up Due' | 'With Phone'>('All');
  const [editingBuyer, setEditingBuyer] = useState<Partial<Lead> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchLeads = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('leads').select('*').order('updated_at', { ascending: false });
      if (!error && data) {
        setLeads(data);
        setPortalCache({ leads: data });
      }
    } catch (e) {
      console.warn('Failed to fetch leads:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Separate high-focus potential buyers
  const potentialBuyers = useMemo(() => {
    return leads.filter(
      (l) =>
        (l.priority === 'High' && l.stage !== 'Lost') ||
        (l.notes && l.notes.toLowerCase().includes('potential'))
    );
  }, [leads]);

  const filteredBuyers = useMemo(() => {
    let result = [...potentialBuyers];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.company_name?.toLowerCase().includes(q) ||
          l.country?.toLowerCase().includes(q) ||
          l.contact_email?.toLowerCase().includes(q) ||
          l.phone?.toLowerCase().includes(q) ||
          l.product_interest?.toLowerCase().includes(q)
      );
    }

    if (filterMode === 'Need Reach Out') {
      result = result.filter((l) => leadActionCategory(l) === 'Need Reach Out');
    } else if (filterMode === 'Follow-up Due') {
      result = result.filter((l) => leadActionCategory(l) === 'Follow-up Due');
    } else if (filterMode === 'With Phone') {
      result = result.filter((l) => hasContactablePhone(l.phone));
    }

    return result;
  }, [potentialBuyers, searchQuery, filterMode]);

  const handleOpenForm = (lead?: Lead) => {
    setEditingBuyer(lead ? { ...lead } : { ...blankBuyer });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingBuyer(null);
    setIsFormOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBuyer?.company_name?.trim()) {
      alert('Company name is required.');
      return;
    }

    setSaving(true);
    try {
      if (editingBuyer.id) {
        const { error } = await supabase.from('leads').update(editingBuyer).eq('id', editingBuyer.id);
        if (error) throw error;
        setLeads((prev) => prev.map((l) => (l.id === editingBuyer.id ? ({ ...l, ...editingBuyer } as Lead) : l)));
        showToast('Buyer profile updated.');
      } else {
        const { data, error } = await supabase.from('leads').insert([editingBuyer]).select().single();
        if (error) throw error;
        if (data) setLeads((prev) => [data, ...prev]);
        showToast('New potential buyer registered.');
      }
      handleCloseForm();
      fetchLeads();
    } catch (err: any) {
      alert(err.message || 'Failed to save buyer.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from potential buyers?`)) return;
    try {
      await supabase.from('leads').delete().eq('id', id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      showToast('Buyer removed.');
    } catch {
      alert('Failed to delete buyer.');
    }
  };

  const handleWhatsApp = (buyer: Lead) => {
    const raw = sanitizePhoneDigits(buyer.phone);
    if (!raw) {
      alert('No valid phone number for WhatsApp.');
      return;
    }
    const text = encodeURIComponent(
      `Hello ${buyer.contact_name || buyer.company_name}, greeting from Sheshaan Global export desk.`
    );
    window.open(`https://wa.me/${raw}?text=${text}`, '_blank');
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
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Potential Buyers</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Focus list of verified international procurement heads, import managers, and qualified prospective clients.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenForm()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-sm active:scale-95 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add Potential Buyer</span>
        </button>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setFilterMode('All')}
          className={`p-4 rounded-xl border text-left transition ${
            filterMode === 'All'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <p className={`text-[10px] font-black uppercase tracking-wider ${filterMode === 'All' ? 'text-slate-400' : 'text-slate-500'}`}>Total Focused</p>
          <p className="mt-1 text-2xl font-black">{potentialBuyers.length}</p>
          <p className={`mt-1 text-xs font-semibold ${filterMode === 'All' ? 'text-slate-300' : 'text-slate-600'}`}>High-value prospects</p>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('Need Reach Out')}
          className={`p-4 rounded-xl border text-left transition ${
            filterMode === 'Need Reach Out'
              ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
              : 'bg-sky-50/60 text-slate-900 border-sky-200/80 hover:bg-sky-50'
          }`}
        >
          <p className={`text-[10px] font-black uppercase tracking-wider ${filterMode === 'Need Reach Out' ? 'text-sky-200' : 'text-sky-700'}`}>Need Reach Out</p>
          <p className="mt-1 text-2xl font-black">
            {potentialBuyers.filter((b) => leadActionCategory(b) === 'Need Reach Out').length}
          </p>
          <p className={`mt-1 text-xs font-semibold ${filterMode === 'Need Reach Out' ? 'text-sky-100' : 'text-slate-600'}`}>First contact required</p>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('Follow-up Due')}
          className={`p-4 rounded-xl border text-left transition ${
            filterMode === 'Follow-up Due'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-amber-50/60 text-slate-900 border-amber-200/80 hover:bg-amber-50'
          }`}
        >
          <p className={`text-[10px] font-black uppercase tracking-wider ${filterMode === 'Follow-up Due' ? 'text-amber-200' : 'text-amber-700'}`}>Follow-up Due</p>
          <p className="mt-1 text-2xl font-black">
            {potentialBuyers.filter((b) => leadActionCategory(b) === 'Follow-up Due').length}
          </p>
          <p className={`mt-1 text-xs font-semibold ${filterMode === 'Follow-up Due' ? 'text-amber-100' : 'text-slate-600'}`}>Action due today</p>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('With Phone')}
          className={`p-4 rounded-xl border text-left transition ${
            filterMode === 'With Phone'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-emerald-50/60 text-slate-900 border-emerald-200/80 hover:bg-emerald-50'
          }`}
        >
          <p className={`text-[10px] font-black uppercase tracking-wider ${filterMode === 'With Phone' ? 'text-emerald-200' : 'text-emerald-700'}`}>With Phone</p>
          <p className="mt-1 text-2xl font-black">
            {potentialBuyers.filter((b) => hasContactablePhone(b.phone)).length}
          </p>
          <p className={`mt-1 text-xs font-semibold ${filterMode === 'With Phone' ? 'text-emerald-100' : 'text-slate-600'}`}>WhatsApp outreach ready</p>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search potential buyers by company, country, contact, email, or product interest..."
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition text-xs"
        />
      </div>

      {/* Buyer Cards Grid */}
      {loading && potentialBuyers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <RefreshCw className="h-7 w-7 animate-spin text-sky-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">Loading buyers...</p>
        </div>
      ) : filteredBuyers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <Target className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">No buyers found in this view</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredBuyers.map((b) => (
            <div
              key={b.id}
              className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase text-sky-600 tracking-wider block">
                      {b.country || 'Global'}
                    </span>
                    <h3 className="font-extrabold text-sm text-slate-900 truncate mt-0.5">{b.company_name}</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${leadCategoryClass(leadActionCategory(b))}`}>
                    {leadActionCategory(b)}
                  </span>
                </div>

                <div className="mt-2.5 space-y-1 text-xs">
                  {b.contact_name && (
                    <p className="text-slate-700 font-semibold truncate">
                      <span className="text-slate-400 font-normal">Contact:</span> {b.contact_name}
                    </p>
                  )}
                  {b.contact_email && (
                    <p className="text-slate-600 font-medium truncate flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                      <a href={`mailto:${b.contact_email}`} className="hover:text-sky-600 hover:underline truncate">
                        {b.contact_email}
                      </a>
                    </p>
                  )}
                  {b.phone && (
                    <p className="text-slate-600 font-medium truncate flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                      <span>{b.phone}</span>
                    </p>
                  )}
                  {b.product_interest && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-[11px] text-slate-600 font-semibold">
                      <span className="text-slate-400 font-normal">Interest:</span> {b.product_interest}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                {b.phone ? (
                  <button
                    type="button"
                    onClick={() => handleWhatsApp(b)}
                    className="flex-1 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold inline-flex items-center justify-center gap-1 transition"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>WhatsApp</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenForm(b)}
                    className="flex-1 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold inline-flex items-center justify-center gap-1 transition"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Add Phone</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenForm(b)}
                  className="h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center justify-center transition"
                  title="Edit details"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(b.id, b.company_name)}
                  className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 inline-flex items-center justify-center transition"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Form */}
      {isFormOpen && editingBuyer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-panel-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-black text-slate-900">
                {editingBuyer.id ? 'Edit Potential Buyer' : 'Add Potential Buyer'}
              </h3>
              <button
                type="button"
                onClick={handleCloseForm}
                className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingBuyer.company_name || ''}
                  onChange={(e) => setEditingBuyer({ ...editingBuyer, company_name: e.target.value })}
                  placeholder="e.g. Al Maya General Trading LLC"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={editingBuyer.contact_name || ''}
                    onChange={(e) => setEditingBuyer({ ...editingBuyer, contact_name: e.target.value })}
                    placeholder="Procurement Manager"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={editingBuyer.country || ''}
                    onChange={(e) => setEditingBuyer({ ...editingBuyer, country: e.target.value })}
                    placeholder="UAE, Saudi Arabia, USA..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editingBuyer.contact_email || ''}
                    onChange={(e) => setEditingBuyer({ ...editingBuyer, contact_email: e.target.value })}
                    placeholder="buyer@domain.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={editingBuyer.phone || ''}
                    onChange={(e) => setEditingBuyer({ ...editingBuyer, phone: e.target.value })}
                    placeholder="+971 50..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Product Requirement
                </label>
                <input
                  type="text"
                  value={editingBuyer.product_interest || ''}
                  onChange={(e) => setEditingBuyer({ ...editingBuyer, product_interest: e.target.value })}
                  placeholder="Basmati rice, cumin seeds, turmeric, whole spices..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingBuyer.id ? 'Save Changes' : 'Register Buyer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

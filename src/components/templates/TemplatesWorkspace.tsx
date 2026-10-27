'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Mail,
  Plus,
  Search,
  Copy,
  Check,
  Edit2,
  Trash2,
  MessageSquare,
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { getPortalCache, setPortalCache } from '../../lib/portalDataStore';
import { MessageTemplate } from '../../lib/types';

const blankTemplate: Partial<MessageTemplate> = {
  name: '',
  channel: 'Email',
  subject: '',
  body: ''
};

export function TemplatesWorkspace() {
  const [templates, setTemplates] = useState<MessageTemplate[]>(() => {
    return getPortalCache()?.templates || [];
  });
  const [loading, setLoading] = useState(() => !getPortalCache()?.templates?.length);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<'All' | 'Email' | 'WhatsApp'>('All');
  const [editingTemplate, setEditingTemplate] = useState<Partial<MessageTemplate> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('message_templates').select('*').order('name');
      if (!error && data) {
        setTemplates(data);
        setPortalCache({ templates: data });
      }
    } catch (e) {
      console.warn('Failed to fetch templates:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const filteredTemplates = useMemo(() => {
    let result = [...templates];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.subject?.toLowerCase().includes(q) ||
          t.body.toLowerCase().includes(q)
      );
    }
    if (channelFilter !== 'All') {
      result = result.filter((t) => t.channel === channelFilter);
    }
    return result;
  }, [templates, searchQuery, channelFilter]);

  const handleCopy = (t: MessageTemplate) => {
    navigator.clipboard.writeText(t.body);
    setCopiedId(t.id);
    showToast(`Copied "${t.name}" to clipboard.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenForm = (t?: MessageTemplate) => {
    setEditingTemplate(t ? { ...t } : { ...blankTemplate });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingTemplate(null);
    setIsFormOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate?.name?.trim() || !editingTemplate?.body?.trim()) {
      alert('Template name and content are required.');
      return;
    }

    setSaving(true);
    try {
      if (editingTemplate.id) {
        const { error } = await supabase.from('message_templates').update(editingTemplate).eq('id', editingTemplate.id);
        if (error) throw error;
        setTemplates((prev) => prev.map((t) => (t.id === editingTemplate.id ? ({ ...t, ...editingTemplate } as MessageTemplate) : t)));
        showToast('Template updated.');
      } else {
        const { data, error } = await supabase.from('message_templates').insert([editingTemplate]).select().single();
        if (error) throw error;
        if (data) setTemplates((prev) => [...prev, data]);
        showToast('New template created.');
      }
      handleCloseForm();
      fetchTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"?`)) return;
    try {
      await supabase.from('message_templates').delete().eq('id', id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      showToast('Template deleted.');
    } catch {
      alert('Failed to delete template.');
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
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Mail & Outreach Templates</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Pre-written cold reachouts, quotation cover letters, payment reminders, and WhatsApp follow-up scripts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenForm()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-sm active:scale-95 transition"
        >
          <Plus className="h-4 w-4" />
          <span>New Template</span>
        </button>
      </div>

      {/* Variables Hint Banner */}
      <div className="rounded-xl border border-sky-200/80 bg-sky-50/60 p-3.5 text-xs text-sky-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-sky-600 shrink-0" />
          <span className="font-bold">Dynamic Variable Placeholders:</span>
          <span className="font-mono text-[11px] text-sky-800 bg-white/80 px-1.5 py-0.5 rounded border border-sky-200">
            {'{{company_name}}'}
          </span>
          <span className="font-mono text-[11px] text-sky-800 bg-white/80 px-1.5 py-0.5 rounded border border-sky-200">
            {'{{contact_name}}'}
          </span>
          <span className="font-mono text-[11px] text-sky-800 bg-white/80 px-1.5 py-0.5 rounded border border-sky-200">
            {'{{product}}'}
          </span>
        </div>
        <span className="text-[11px] text-sky-600 font-semibold">Auto-substituted on send</span>
      </div>

      {/* Search and Channel Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates by name, subject, or message body..."
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition text-xs"
          />
        </div>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value as any)}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        >
          <option value="All">All Channels</option>
          <option value="Email">Email Templates</option>
          <option value="WhatsApp">WhatsApp Scripts</option>
        </select>
      </div>

      {/* Templates Grid */}
      {loading && templates.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <RefreshCw className="h-7 w-7 animate-spin text-sky-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">Loading templates...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <Mail className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">No templates found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredTemplates.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="font-black text-sm text-slate-900">{t.name}</h3>
                    {t.subject && (
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5 truncate">
                        Subject: <span className="text-slate-700">{t.subject}</span>
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                    t.channel === 'WhatsApp' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-sky-50 text-sky-700 border border-sky-200'
                  }`}>
                    {t.channel || 'Email'}
                  </span>
                </div>

                <div className="mt-3 p-3 rounded-lg bg-slate-50/70 border border-slate-100 font-mono text-[11px] text-slate-700 whitespace-pre-wrap max-h-44 overflow-y-auto leading-relaxed">
                  {t.body}
                </div>
              </div>

              {/* Actions Strip */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(t)}
                  className="flex-1 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  {copiedId === t.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Template</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenForm(t)}
                  className="h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center justify-center transition"
                  title="Edit"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(t.id, t.name)}
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
      {isFormOpen && editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-panel-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-black text-slate-900">
                {editingTemplate.id ? 'Edit Template' : 'Create New Message Template'}
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
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.name || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    placeholder="e.g. Basmati Price Quote Introduction"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Channel
                  </label>
                  <select
                    value={editingTemplate.channel || 'Email'}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, channel: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value="Email">Email</option>
                    <option value="WhatsApp">WhatsApp</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Email Subject Line (optional for WhatsApp)
                </label>
                <input
                  type="text"
                  value={editingTemplate.subject || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  placeholder="e.g. Commercial Offer: 1121 Basmati Rice CIF Jebel Ali"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Message Body *
                </label>
                <textarea
                  rows={8}
                  required
                  value={editingTemplate.body || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                  placeholder="Dear {{contact_name}}, Greetings from Sheshaan Global..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
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
                  {saving ? 'Saving...' : editingTemplate.id ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

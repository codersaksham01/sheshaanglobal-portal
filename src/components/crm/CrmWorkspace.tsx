'use client';

import React, { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import dynamic from 'next/dynamic';
import readXlsxFile from 'read-excel-file/browser';
import {
  Plus,
  Download,
  FileText,
  RefreshCw,
  FileCheck2,
  Sparkles,
  Trash2,
  ChevronDown,
  Search,
  X,
  Mail,
  Phone,
  Clock,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { getPortalCache, setPortalCache, fetchAllPortalData } from '../../lib/portalDataStore';
import { Lead, Client, MessageTemplate, TimelineActivity } from '../../lib/types';
import { CrmLead, CrmStage, CrmPriority } from '../../lib/types/crm';
import { SystematicLoadingScreen } from '../SystematicLoadingScreen';
import { CrmTable } from './CrmTable';
import { CrmKanban } from './CrmKanban';
import { LeadInspectorDrawer } from './LeadInspectorDrawer';
import {
  leadNoteValue,
  setLeadNoteValues,
  leadEmailStatus,
  leadNextAction,
  extractContactEmails,
  leadNeedsFirstReach,
  leadHasOutreach,
  leadActionCategory,
  leadCategoryClass,
  leadEmailMode,
  calculateLeadScore,
  calculateLeadVelocity,
  bestSendWindowIST,
  replaceLeadTemplateVars,
  companyKey,
  titleCaseCountry
} from '../../lib/leadUtils';

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);

const BuyerExportPDF = dynamic(
  () => import('../BuyerExportPDF').then((mod) => mod.BuyerExportPDF),
  { ssr: false }
);

interface CrmWorkspaceProps {
  initialLeads?: Lead[];
  onLeadsChange?: (leads: Lead[]) => void;
}

const CrmMetric = ({
  label,
  value,
  helper,
  active,
  onClick
}: {
  label: string;
  value: string;
  helper: string;
  active?: boolean;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={`border rounded-xl p-3.5 transition duration-200 cursor-pointer select-none ${
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

export function CrmWorkspace({ initialLeads, onLeadsChange }: CrmWorkspaceProps) {
  // Fast hydration from shared portal cache or sessionStorage for 0ms initial render
  const [leads, setLeads] = useState<Lead[]>(() => {
    if (initialLeads && initialLeads.length) return initialLeads;
    const storeCache = getPortalCache();
    if (storeCache?.leads && storeCache.leads.length > 0) return storeCache.leads;
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('cached_crm_leads');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  });
  const [activities, setActivities] = useState<TimelineActivity[]>(() => {
    const storeCache = getPortalCache();
    if (storeCache?.activities && storeCache.activities.length > 0) return storeCache.activities;
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('cached_crm_activities');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  });
  const [templates, setTemplates] = useState<MessageTemplate[]>(() => {
    const storeCache = getPortalCache();
    if (storeCache?.templates && storeCache.templates.length > 0) return storeCache.templates;
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (initialLeads && initialLeads.length) return false;
    const storeCache = getPortalCache();
    if (storeCache?.leads && storeCache.leads.length > 0) return false;
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('cached_crm_leads');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return false;
        }
      } catch {}
    }
    return true;
  });
  const [importingBuyers, setImportingBuyers] = useState(false);
  const [importDataSource, setImportDataSource] = useState<'Custom Researched Data' | 'Embassy Data'>('Custom Researched Data');
  const [loadTimeout, setLoadTimeout] = useState(false);

  useEffect(() => {
    if (loading && leads.length === 0) {
      const timer = setTimeout(() => setLoadTimeout(true), 5000);
      return () => clearTimeout(timer);
    } else {
      setLoadTimeout(false);
    }
  }, [loading, leads.length]);

  // CRM Workspace State
  const [crmSearchQuery, setCrmSearchQuery] = useState('');
  const deferredCrmSearchQuery = useDeferredValue(crmSearchQuery);
  const [crmCountryFilter, setCrmCountryFilter] = useState('All');
  const [crmQueueFilter, setCrmQueueFilter] = useState<string | null>('Need Reach Out');
  const [crmSortKey, setCrmSortKey] = useState<
    'action' | 'reachout' | 'followup' | 'emailfix' | 'velocity' | 'country' |
    'stage_new' | 'stage_contacted' | 'stage_quoted' | 'stage_negotiation' | 'stage_won' | 'stage_lost'
  >('reachout');
  const [crmViewMode, setCrmViewMode] = useState<'table' | 'kanban'>('table');
  const [crmVisibleCount, setCrmVisibleCount] = useState(50);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [selectedCrmLead, setSelectedCrmLead] = useState<CrmLead | null>(null);
  const [buyerPdfExportReady, setBuyerPdfExportReady] = useState(false);

  // Load CRM Data directly from database
  const fetchCrmData = useCallback(async () => {
    try {
      const [
        { data: lData },
        { data: aData },
        { data: mtData }
      ] = await Promise.all([
        supabase.from('leads').select('*').order('updated_at', { ascending: false }),
        supabase.from('activities').select('*').order('activity_date', { ascending: false }),
        supabase.from('message_templates').select('*').order('name')
      ]);

      const loadedLeads = lData || [];
      const loadedActivities = aData || [];
      setLeads(loadedLeads);
      setActivities(loadedActivities);
      setTemplates(mtData || []);
      setPortalCache({
        leads: loadedLeads,
        activities: loadedActivities,
        templates: mtData || []
      });
      if (onLeadsChange) onLeadsChange(loadedLeads);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('cached_crm_leads', JSON.stringify(loadedLeads));
          sessionStorage.setItem('cached_crm_activities', JSON.stringify(loadedActivities));
        } catch {}
      }
    } catch (err) {
      console.error('Failed to load CRM data:', err);
    } finally {
      setLoading(false);
    }
  }, [onLeadsChange]);

  useEffect(() => {
    if (!initialLeads) {
      fetchCrmData();
    }
  }, [fetchCrmData, initialLeads]);

  // Set of lead IDs with logged outreach activities
  const leadsWithOutreachSet = useMemo(() => {
    return new Set(activities.map((act) => act.lead_id).filter(Boolean) as string[]);
  }, [activities]);

  // Pre-index action category for O(1) lookups
  const leadActionCategoryMap = useMemo(() => {
    const map = new Map<string, string>();
    leads.forEach((lead) => {
      map.set(lead.id, leadActionCategory(lead, leadsWithOutreachSet));
    });
    return map;
  }, [leads, leadsWithOutreachSet]);

  const getLeadActionCategory = useCallback((lead: Lead) => {
    return leadActionCategoryMap.get(lead.id) || leadActionCategory(lead, leadsWithOutreachSet);
  }, [leadActionCategoryMap, leadsWithOutreachSet]);

  // Country list for filter
  const crmCountries = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      const c = (l.country || '').trim();
      if (c) set.add(titleCaseCountry(c));
    });
    return Array.from(set).sort();
  }, [leads]);

  // Lead score and velocity maps
  const leadScoreValue = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l) => {
      map[l.id] = calculateLeadScore(l);
    });
    return map;
  }, [leads]);

  const leadVelocityScore = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l) => {
      map[l.id] = calculateLeadVelocity(l);
    });
    return map;
  }, [leads]);

  // Search filter
  const searchedCrmLeads = useMemo(() => {
    const query = deferredCrmSearchQuery.trim().toLowerCase();
    const countryFiltered = crmCountryFilter === 'All'
      ? leads
      : leads.filter((lead) => titleCaseCountry((lead.country || '').trim()) === crmCountryFilter);

    if (!query) return countryFiltered;
    return countryFiltered.filter((lead) => {
      return (
        companyKey(lead).includes(query) ||
        (lead.contact_name || '').toLowerCase().includes(query) ||
        (lead.contact_email || '').toLowerCase().includes(query) ||
        (lead.phone || '').toLowerCase().includes(query) ||
        (lead.country || '').toLowerCase().includes(query) ||
        (lead.product_interest || '').toLowerCase().includes(query)
      );
    });
  }, [leads, deferredCrmSearchQuery, crmCountryFilter]);

  // Filtered by Outreach Queue + Sorted
  const filteredCrmLeads = useMemo(() => {
    let finalLeads = searchedCrmLeads;
    if (crmQueueFilter) {
      finalLeads = searchedCrmLeads.filter((lead) => {
        const category = getLeadActionCategory(lead);
        if (crmQueueFilter === 'Need Reach Out') {
          return lead.stage !== 'Won' && lead.stage !== 'Lost' && (category === 'Need Reach Out' || leadNeedsFirstReach(lead, leadsWithOutreachSet));
        }
        if (crmQueueFilter === 'Follow-up Due') {
          return lead.stage !== 'Won' && lead.stage !== 'Lost' && category === 'Follow-up Due';
        }
        if (crmQueueFilter === 'Next Follow-up') {
          return lead.stage !== 'Won' && lead.stage !== 'Lost' && category === 'Next Follow-up';
        }
        if (crmQueueFilter === 'Waiting Reply') {
          return lead.stage !== 'Won' && lead.stage !== 'Lost' && (category === 'Waiting Reply' || category === 'Email Sent' || category === 'Follow-up Sent');
        }
        return true;
      });
    }

    // Pre-extract sort metadata
    const metaMap = new Map<string, { cat: string; velocity: number; key: string }>();
    for (let i = 0; i < finalLeads.length; i++) {
      const l = finalLeads[i];
      metaMap.set(l.id, {
        cat: getLeadActionCategory(l),
        velocity: leadVelocityScore[l.id] || 0,
        key: companyKey(l)
      });
    }

    return [...finalLeads].sort((a, b) => {
      const metaA = metaMap.get(a.id);
      const metaB = metaMap.get(b.id);
      const catA = metaA?.cat || 'Review';
      const catB = metaB?.cat || 'Review';

      if (crmSortKey === 'reachout') {
        const isReachA = (catA === 'Need Reach Out' || catA === 'Email Sent' || catA === 'Follow-up Sent') ? 0 : 1;
        const isReachB = (catB === 'Need Reach Out' || catB === 'Email Sent' || catB === 'Follow-up Sent') ? 0 : 1;
        if (isReachA !== isReachB) return isReachA - isReachB;
      }
      if (crmSortKey === 'followup') {
        const isFollowA = catA === 'Follow-up Due' ? 0 : 1;
        const isFollowB = catB === 'Follow-up Due' ? 0 : 1;
        if (isFollowA !== isFollowB) return isFollowA - isFollowB;
      }
      if (crmSortKey === 'velocity') {
        return (metaB?.velocity || 0) - (metaA?.velocity || 0);
      }
      if (crmSortKey === 'country') {
        return (a.country || '').localeCompare(b.country || '');
      }
      return (metaA?.key || '').localeCompare(metaB?.key || '');
    });
  }, [searchedCrmLeads, crmQueueFilter, crmSortKey, getLeadActionCategory, leadVelocityScore, leadsWithOutreachSet]);

  // Paginated visible leads
  const visibleCrmLeads = useMemo(() => {
    return filteredCrmLeads.slice(0, crmVisibleCount) as CrmLead[];
  }, [filteredCrmLeads, crmVisibleCount]);

  // Queue Counts for Metric Cards
  const crmQueues = useMemo(() => [
    {
      label: 'Need Reach Out',
      leads: searchedCrmLeads.filter((l) => l.stage !== 'Won' && l.stage !== 'Lost' && (getLeadActionCategory(l) === 'Need Reach Out' || leadNeedsFirstReach(l, leadsWithOutreachSet)))
    },
    {
      label: 'Follow-up Due',
      leads: searchedCrmLeads.filter((l) => l.stage !== 'Won' && l.stage !== 'Lost' && getLeadActionCategory(l) === 'Follow-up Due')
    },
    {
      label: 'Next Follow-up',
      leads: searchedCrmLeads.filter((l) => l.stage !== 'Won' && l.stage !== 'Lost' && getLeadActionCategory(l) === 'Next Follow-up')
    },
    {
      label: 'Waiting Reply',
      leads: searchedCrmLeads.filter((l) => l.stage !== 'Won' && l.stage !== 'Lost' && (getLeadActionCategory(l) === 'Waiting Reply' || getLeadActionCategory(l) === 'Email Sent' || getLeadActionCategory(l) === 'Follow-up Sent'))
    }
  ], [searchedCrmLeads, getLeadActionCategory, leadsWithOutreachSet]);

  // Email Action - Ultra Fast & Optimistic
  const handleSendEmail = useCallback((lead: CrmLead) => {
    const mode = leadEmailMode(lead, leadsWithOutreachSet);
    const cleanEmails = extractContactEmails(lead.contact_email);
    if (!cleanEmails.length) {
      alert('Please add a lead email address before sending.');
      return;
    }

    const targetCategory = mode === 'First Reach' ? 'Introduction' : 'Quote Follow-up';
    const template = templates.find((t) => t.channel === 'Email' && t.category === targetCategory && t.active !== false) ||
      templates.find((t) => t.category === targetCategory) ||
      templates[0];
    const defaultSubject = mode === 'First Reach'
      ? 'Export sourcing support from Sheshaan Global'
      : 'Following up with {{company_name}}';
    const defaultBody = mode === 'First Reach'
      ? 'Hi {{buyer_name}},\n\nI am reaching out from Sheshaan Global, India.\n\nWe support international buyers with export-ready products. If you have a specific product requirement, we can share specifications, packing options, CIF/FOB pricing, and shipment timelines for {{destination_port}}.\n\nRegards,\nSheshaan Global'
      : 'Hi {{buyer_name}},\n\nJust following up on our previous discussion regarding {{product_name}}.\n\nIf this product is still relevant, we can share an updated quotation.\n\nRegards,\nSheshaan Global';

    const subject = replaceLeadTemplateVars(template?.subject || defaultSubject, lead);
    const body = replaceLeadTemplateVars(template?.body || defaultBody, lead);
    const today = new Date().toISOString().slice(0, 10);
    const nextFollowUpDate = new Date();
    nextFollowUpDate.setDate(nextFollowUpDate.getDate() + (mode === 'First Reach' ? 3 : 4));
    const nextFollowUp = nextFollowUpDate.toISOString().slice(0, 10);

    const updatedNotes = setLeadNoteValues(lead, mode === 'First Reach' ? {
      'Email Status': 'Email Sent',
      'First Email Sent On': leadNoteValue(lead, 'First Email Sent On') || today,
      'Last Email Sent On': today,
      'Next Action': 'Waiting for buyer response'
    } : {
      'Email Status': 'Follow-up Sent',
      'Last Email Sent On': today,
      'Next Action': 'Waiting for buyer response'
    });

    const nextStage = ['Won', 'Lost'].includes(lead.stage) ? lead.stage : 'Contacted';

    // 1. Instant local optimistic update
    setLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id
          ? {
              ...l,
              notes: updatedNotes,
              stage: nextStage,
              next_follow_up: nextFollowUp,
              updated_at: new Date().toISOString()
            }
          : l
      )
    );

    setSelectedCrmLead((prev) =>
      prev && prev.id === lead.id
        ? {
            ...prev,
            notes: updatedNotes,
            stage: nextStage,
            next_follow_up: nextFollowUp,
            updated_at: new Date().toISOString()
          }
        : prev
    );

    // 2. Open email client in background tab without freezing portal
    const mailtoUrl = `mailto:${cleanEmails.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    try {
      const win = window.open(mailtoUrl, '_blank', 'noopener,noreferrer');
      if (!win) {
        const a = document.createElement('a');
        a.href = mailtoUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch {
      const a = document.createElement('a');
      a.href = mailtoUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    // 3. Concurrently save to Supabase in background
    (async () => {
      try {
        await supabase.from('leads').update({
          notes: updatedNotes,
          stage: nextStage,
          next_follow_up: nextFollowUp
        }).eq('id', lead.id);

        await supabase.from('activities').insert({
          client_id: lead.client_id,
          lead_id: lead.id,
          type: 'Email',
          title: `${mode} email prepared for ${lead.company_name}`,
          details: `Template: ${template?.name || 'Default'}\nTo: ${cleanEmails.join(', ')}`,
          activity_date: today,
          activity_time: new Date().toLocaleTimeString('en-US', { hour12: false })
        });
      } catch (err) {
        console.error('Background sync failed:', err);
      }
    })();
  }, [templates, leadsWithOutreachSet]);

  // WhatsApp Action
  const handleLeadWhatsApp = useCallback((lead: CrmLead) => {
    const rawPhone = (lead.phone || '').replace(/\D/g, '');
    if (!rawPhone || rawPhone.length < 7) {
      alert('Please add a valid phone number with country code before starting WhatsApp.');
      return;
    }
    const message = `Hi ${lead.contact_name || lead.company_name},\n\nI am reaching out from Sheshaan Global regarding export sourcing for ${lead.product_interest || 'agricultural products'}.\n\nRegards,\nSheshaan Global`;
    const url = `https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');

    const today = new Date().toISOString().slice(0, 10);
    const updatedNotes = setLeadNoteValues(lead, {
      'WhatsApp Status': 'WhatsApp Sent',
      'Last Outreach': today,
      'Next Action': 'Waiting for buyer response'
    });

    setLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id
          ? { ...l, notes: updatedNotes, updated_at: new Date().toISOString() }
          : l
      )
    );

    (async () => {
      try {
        await supabase.from('leads').update({ notes: updatedNotes }).eq('id', lead.id);
        await supabase.from('activities').insert({
          client_id: lead.client_id,
          lead_id: lead.id,
          type: 'WhatsApp',
          title: `WhatsApp message initiated for ${lead.company_name}`,
          details: `Phone: ${lead.phone}`,
          activity_date: today
        });
      } catch (err) {
        console.error('WhatsApp activity sync failed:', err);
      }
    })();
  }, []);

  // Update Status / Stage
  const handleUpdateStatus = useCallback((lead: CrmLead, action: 'email_sent' | 'followup_due' | 'responded') => {
    if (action === 'email_sent') handleSendEmail(lead);
  }, [handleSendEmail]);

  // Move Lead in Kanban
  const handleMoveLeadFromCrm = useCallback(async (leadId: string, targetStage: CrmStage) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: targetStage } : l))
    );
    try {
      await supabase.from('leads').update({ stage: targetStage }).eq('id', leadId);
    } catch (err) {
      console.error('Failed to update stage:', err);
    }
  }, []);

  // Delete Lead
  const handleDeleteLeadFromCrm = useCallback(async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    setSelectedLeadIds((prev) => prev.filter((id) => id !== leadId));
    if (selectedCrmLead?.id === leadId) setSelectedCrmLead(null);
    try {
      await supabase.from('leads').delete().eq('id', leadId);
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  }, [selectedCrmLead]);

  // Edit Lead / Open Drawer
  const handleEditLead = useCallback((lead: CrmLead) => {
    setSelectedCrmLead(lead);
  }, []);

  // Save Lead from Drawer
  const handleSaveLeadFromDrawer = useCallback(async (updates: Partial<CrmLead>) => {
    if (!selectedCrmLead) return;
    const updated = { ...selectedCrmLead, ...updates, updated_at: new Date().toISOString() };
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? (updated as Lead) : l)));
    setSelectedCrmLead(updated);
    try {
      await supabase.from('leads').update(updates).eq('id', updated.id);
    } catch (err) {
      console.error('Failed to save lead updates:', err);
    }
  }, [selectedCrmLead]);

  // Quick Open Drawer for New Lead
  const openNewLeadDrawer = useCallback((source: string) => {
    const blank: CrmLead = {
      id: `new-${Date.now()}`,
      company_name: '',
      contact_name: '',
      contact_email: '',
      phone: '',
      country: '',
      product_interest: '',
      stage: 'New Lead',
      priority: 'Medium',
      notes: `Data Source: ${source}\nCreated: ${new Date().toISOString().slice(0, 10)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setSelectedCrmLead(blank);
  }, []);

  // Selection handlers
  const handleToggleSelection = useCallback((id: string | string[], checked: boolean) => {
    setSelectedLeadIds((prev) => {
      const ids = Array.isArray(id) ? id : [id];
      if (checked) {
        return Array.from(new Set([...prev, ...ids]));
      }
      return prev.filter((i) => !ids.includes(i));
    });
  }, []);

  const handleToggleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(visibleCrmLeads.map((l) => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  }, [visibleCrmLeads]);

  // Bulk Contacted
  const handleBulkMarkContacted = useCallback(async () => {
    if (!selectedLeadIds.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const selectedSet = new Set(selectedLeadIds);

    setLeads((prev) =>
      prev.map((l) => {
        if (!selectedSet.has(l.id)) return l;
        const notes = setLeadNoteValues(l, {
          'Email Status': 'Email Sent',
          'Last Email Sent On': today
        });
        return { ...l, notes, stage: l.stage === 'New Lead' ? 'Contacted' : l.stage };
      })
    );
    setSelectedLeadIds([]);

    for (const id of selectedLeadIds) {
      try {
        await supabase.from('leads').update({
          stage: 'Contacted',
          updated_at: new Date().toISOString()
        }).eq('id', id);
      } catch {
        // Continue
      }
    }
  }, [selectedLeadIds]);

  // Bulk Delete
  const handleBulkDelete = useCallback(async () => {
    if (!selectedLeadIds.length) return;
    if (!confirm(`Delete ${selectedLeadIds.length} selected leads? This cannot be undone.`)) return;

    const selectedSet = new Set(selectedLeadIds);
    setLeads((prev) => prev.filter((l) => !selectedSet.has(l.id)));
    setSelectedLeadIds([]);
    if (selectedCrmLead && selectedSet.has(selectedCrmLead.id)) {
      setSelectedCrmLead(null);
    }

    try {
      await supabase.from('leads').delete().in('id', selectedLeadIds);
    } catch (err) {
      console.error('Failed to bulk delete leads:', err);
    }
  }, [selectedLeadIds, selectedCrmLead]);

  // Excel Export
  const downloadBuyerExcelExport = () => {
    const headers = ['Company Name', 'Contact Person', 'Email', 'Phone', 'Country', 'Product Interest', 'Stage', 'Priority', 'Action Category'];
    const rows = filteredCrmLeads.map((l) => [
      l.company_name || '',
      l.contact_name || '',
      l.contact_email || '',
      l.phone || '',
      l.country || '',
      l.product_interest || '',
      l.stage || '',
      l.priority || 'Medium',
      getLeadActionCategory(l)
    ]);

    const html = `<!doctype html><html><head><meta charset="utf-8"/><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd5e1;padding:8px;font-size:12px;font-family:sans-serif}th{background:#0f172a;color:#fff}</style></head><body><h2>Sheshaan Global - Buyer CRM Export</h2><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sheshaan-crm-buyers-${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Records for PDF Export
  const buyerPdfRecords = useMemo(() => {
    return filteredCrmLeads.slice(0, 200).map((l) => ({
      company: l.company_name || 'Buyer',
      contact: l.contact_name || '',
      email: l.contact_email || '',
      phone: l.phone || '',
      country: l.country || 'Global',
      product: l.product_interest || 'Agricultural commodities',
      source: leadNoteValue(l, 'Data Source') || 'Custom Research',
      stage: l.stage || 'New Lead',
      priority: l.priority || 'Medium',
      action: getLeadActionCategory(l),
      nextFollowUp: l.next_follow_up || 'Scheduled',
      bestSendTime: bestSendWindowIST(l.country || ''),
      score: leadScoreValue[l.id] || 0,
      notes: l.notes || ''
    }));
  }, [filteredCrmLeads, getLeadActionCategory, leadScoreValue]);

  if (loading && leads.length === 0) {
    return (
      <SystematicLoadingScreen
        title="Loading Smart CRM Pipeline"
        subtitle="Retrieving buyer database records, pipeline stages, and outreach logs from server..."
        onRetry={fetchCrmData}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Background sync banner if leads are already displayed */}
      {loading && leads.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-sky-500/15 border border-sky-400/25 text-white backdrop-blur-md text-xs font-bold animate-fade-up shadow-sm">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-sky-400 shrink-0" />
            <span>Updating buyer database in background...</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-sky-300 font-black bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-400/30">
            Syncing
          </span>
        </div>
      )}
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
              onClick={() => openNewLeadDrawer('Quick Add')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-black hover:bg-emerald-400 transition text-xs shadow-sm shadow-emerald-950/20"
            >
              <Plus className="h-4 w-4" />
              New Lead
            </button>
            {!buyerPdfExportReady ? (
              <button
                type="button"
                onClick={() => setBuyerPdfExportReady(true)}
                disabled={!buyerPdfRecords.length}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-white/10 border border-white/15 text-white rounded-lg font-bold hover:bg-white/15 transition text-xs disabled:opacity-40"
              >
                <FileText className="h-4 w-4" />
                Prepare PDF
              </button>
            ) : (
              <PDFDownloadLink
                document={
                  <BuyerExportPDF
                    records={buyerPdfRecords}
                    title="Buyer Data Export"
                    subtitle="Current CRM buyer list with contact details, source, action status, and lead score."
                    generatedBy="Sheshaan Global"
                  />
                }
                fileName={`sheshaan-crm-export-${new Date().toISOString().slice(0, 10)}.pdf`}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-white/10 border border-white/15 text-white rounded-lg font-bold hover:bg-white/15 transition text-xs"
              >
                {({ loading: pdfLoading }) => (
                  <>
                    {pdfLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {pdfLoading ? 'Preparing...' : 'Download PDF'}
                  </>
                )}
              </PDFDownloadLink>
            )}
            <button
              type="button"
              onClick={downloadBuyerExcelExport}
              disabled={!filteredCrmLeads.length}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-400 transition text-xs disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Outreach Queue Cards */}
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

      {/* Quick Lead Capture Banner */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Quick Lead Capture</p>
            <h3 className="text-sm font-black text-slate-950">Add a buyer inquiry in seconds</h3>
            <p className="mt-1 text-xs font-semibold text-slate-600">Use these shortcuts while reading WhatsApp, Titan email, or Embassy buyer data.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {[
              { label: 'WhatsApp', tone: 'bg-emerald-600 hover:bg-emerald-500 text-white' },
              { label: 'Titan Email', tone: 'bg-slate-950 hover:bg-slate-800 text-white' },
              { label: 'Embassy', tone: 'bg-sky-600 hover:bg-sky-500 text-white' },
              { label: 'Other', tone: 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200' }
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => openNewLeadDrawer(item.label)}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-black transition ${item.tone}`}
              >
                <Plus className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Controls Row */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="relative w-full xl:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search company name, country, phone, product interest..."
              value={crmSearchQuery}
              onChange={(e) => setCrmSearchQuery(e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-10 text-sm font-semibold text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            {crmSearchQuery && (
              <button type="button" onClick={() => setCrmSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            <div className="relative flex-1 min-w-[130px] sm:w-40 sm:flex-none">
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

            <div className="relative flex-1 min-w-[140px] sm:w-44 sm:flex-none">
              <select
                aria-label="Filter Queue"
                value={crmQueueFilter || 'All'}
                onChange={(e) => setCrmQueueFilter(e.target.value === 'All' ? null : e.target.value)}
                className={`h-10 w-full appearance-none rounded-lg border px-3 pr-9 text-xs font-bold outline-none focus:ring-2 ${
                  crmQueueFilter === 'Need Reach Out'
                    ? 'border-sky-400 bg-sky-50 text-sky-800 focus:ring-sky-500/20'
                    : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
                }`}
              >
                <option value="All">All Outreach Queues</option>
                <option value="Need Reach Out">⚡ Need Reach Out</option>
                <option value="Follow-up Due">⏰ Follow-up Due</option>
                <option value="Next Follow-up">📅 Next Follow-up</option>
                <option value="Waiting Reply">⏳ Waiting Reply</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
            </div>

            <div className="relative flex-1 min-w-[140px] sm:w-44 sm:flex-none">
              <select
                aria-label="Sort leads"
                value={crmSortKey}
                onChange={(e) => setCrmSortKey(e.target.value as typeof crmSortKey)}
                className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 pr-9 text-xs font-bold text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="reachout">Need Reach Out First</option>
                <option value="followup">Follow-up Due First</option>
                <option value="action">Action First</option>
                <option value="velocity">Smart Velocity Score</option>
                <option value="country">Country A-Z</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 h-10 flex-1 sm:flex-none justify-center">
              <button
                type="button"
                onClick={() => setCrmViewMode('table')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md font-bold text-xs transition-all text-center ${
                  crmViewMode === 'table' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Grid View
              </button>
              <button
                type="button"
                onClick={() => setCrmViewMode('kanban')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md font-bold text-xs transition-all text-center ${
                  crmViewMode === 'kanban' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Kanban
              </button>
            </div>

            <button
              type="button"
              onClick={() => openNewLeadDrawer('Manual Entry')}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-bold text-white transition hover:bg-slate-800 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Add Lead
            </button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="text-xs text-slate-500 font-medium">
            {selectedLeadIds.length > 0 ? (
              <span>
                <strong className="text-slate-900">{selectedLeadIds.length}</strong> leads selected
              </span>
            ) : (
              <span>Showing {filteredCrmLeads.length} leads</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSelectedLeadIds(crmQueues[0].leads.map((l) => l.id))}
              className="px-3 py-1.5 bg-sky-50 text-sky-700 rounded-lg font-bold hover:bg-sky-100"
            >
              Select Reach Out ({crmQueues[0].leads.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedLeadIds(crmQueues[1].leads.map((l) => l.id))}
              className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg font-bold hover:bg-amber-100"
            >
              Select Due ({crmQueues[1].leads.length})
            </button>
            <button
              type="button"
              onClick={handleBulkMarkContacted}
              disabled={!selectedLeadIds.length}
              className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 disabled:opacity-40"
            >
              Bulk Contacted
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={!selectedLeadIds.length}
              className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 disabled:opacity-40"
            >
              Bulk Delete
            </button>
            {selectedLeadIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedLeadIds([])}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Board View: Table or Kanban */}
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
              leadActionCategory={getLeadActionCategory}
            />
            {filteredCrmLeads.length > crmVisibleCount && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setCrmVisibleCount((prev) => prev + 50)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition text-xs shadow-sm"
                >
                  Load More Leads ({filteredCrmLeads.length - crmVisibleCount} remaining)
                </button>
              </div>
            )}
          </>
        ) : (
          <CrmKanban
            leads={filteredCrmLeads as CrmLead[]}
            selectedLeadIds={selectedLeadIds}
            onToggleSelection={handleToggleSelection}
            onEditLead={handleEditLead}
            onDeleteLead={handleDeleteLeadFromCrm}
            onMoveLead={handleMoveLeadFromCrm}
            onSendEmail={(lead) => handleSendEmail(lead)}
            leadScoreValue={leadScoreValue}
            leadVelocityScore={leadVelocityScore}
            leadCategoryClass={leadCategoryClass}
            leadActionCategory={getLeadActionCategory}
          />
        )}
      </div>

      {/* Slide-over Workspace Inspector */}
      <LeadInspectorDrawer
        lead={selectedCrmLead}
        onClose={() => setSelectedCrmLead(null)}
        onSaveLead={handleSaveLeadFromDrawer}
        activities={activities}
        leadScore={selectedCrmLead ? leadScoreValue[selectedCrmLead.id] || 0 : 0}
        velocityScore={selectedCrmLead ? leadVelocityScore[selectedCrmLead.id] || 0 : 0}
        actionCategory={selectedCrmLead ? getLeadActionCategory(selectedCrmLead) : 'Review'}
        bestSendWindow={selectedCrmLead ? bestSendWindowIST(selectedCrmLead.country || '') : 'Best send: office hours'}
        onSendEmail={handleSendEmail}
        onSendWhatsApp={handleLeadWhatsApp}
      />
    </div>
  );
}

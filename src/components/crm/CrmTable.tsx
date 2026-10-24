import React, { useState, useMemo } from 'react';
import { CrmLead } from '../../lib/types/crm';
import { Mail, Phone, Edit2, Trash2, Check, Copy } from 'lucide-react';

const TIMEZONE_MAP: Record<string, number> = {
  india: 5.5, sweden: 1, france: 1, uae: 4, usa: -5,
  vietnam: 7, qatar: 3, singapore: 8, uk: 0, poland: 1
};

interface CrmTableRowProps {
  lead: CrmLead;
  selected: boolean;
  onToggleSelection: (id: string | string[], checked: boolean) => void;
  onEditLead: (lead: CrmLead) => void;
  onDeleteLead: (id: string) => void;
  onSendEmail: (lead: CrmLead) => void;
  onSendWhatsApp: (lead: CrmLead) => void;
  score: number;
  velocity: number;
  actionCategory: string;
  leadCategoryClass: (cat: string) => string;
}

const CrmTableRowComponent: React.FC<CrmTableRowProps> = ({
  lead,
  selected,
  onToggleSelection,
  onEditLead,
  onDeleteLead,
  onSendEmail,
  onSendWhatsApp,
  score,
  velocity,
  actionCategory,
  leadCategoryClass
}) => {
  const countryLower = (lead.country || '').trim().toLowerCase();
  const offset = TIMEZONE_MAP[countryLower] !== undefined ? TIMEZONE_MAP[countryLower] : 5.5;
  const utcHour = new Date().getUTCHours();
  const localHour = (utcHour + offset + 24) % 24;
  const isWorkingHours = localHour >= 9 && localHour <= 18;
  const localTimeFormatted = `${Math.floor(localHour).toString().padStart(2, '0')}:${Math.round((localHour % 1) * 60).toString().padStart(2, '0')}`;
  const isSent = actionCategory === 'Email Sent' || actionCategory === 'Follow-up Sent' || (lead.notes && (lead.notes.includes('Email Status: Email Sent') || lead.notes.includes('Email Status: Follow-up Sent')));
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!lead.contact_email) return;
    navigator.clipboard.writeText(lead.contact_email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <tr
      onClick={() => onEditLead(lead)}
      className={`group hover:bg-slate-50/90 transition-colors cursor-pointer select-none border-b border-slate-100 ${
        selected ? 'bg-sky-50/40' : isSent ? 'bg-emerald-50/20' : 'bg-white'
      }`}
    >
      <td className="py-2.5 px-3 w-[44px] min-w-[44px] text-center" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onToggleSelection(lead.id, e.target.checked)}
          className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
          aria-label={`Select ${lead.company_name}`}
        />
      </td>
      <td className="py-2.5 px-3 min-w-[190px] max-w-[260px]">
        <div className="font-extrabold text-xs text-slate-900 truncate" title={lead.company_name}>
          {lead.company_name}
        </div>
        <div className="text-[10px] text-slate-400 font-semibold truncate flex items-center gap-1.5 mt-0.5" title={lead.product_interest || 'General Export'}>
          <span className="truncate">{lead.product_interest || 'General Export'}</span>
          {lead.contact_email && (
            <span className="text-[9px] text-slate-400/80 font-normal truncate hidden xl:inline">
              • {lead.contact_email}
            </span>
          )}
        </div>
      </td>
      <td className="py-2.5 px-3 w-[110px] min-w-[90px]">
        <span className="font-bold text-slate-600 text-xs truncate block" title={lead.country || 'Global'}>
          {lead.country || 'Global'}
        </span>
      </td>
      <td className="py-2.5 px-3 w-[145px] min-w-[130px]">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9.5px] font-black tracking-wide truncate max-w-full ${leadCategoryClass(actionCategory)}`}>
          {isSent && <Check className="h-2.5 w-2.5 text-emerald-600 stroke-[3] shrink-0" />}
          <span className="truncate">{actionCategory}</span>
        </span>
      </td>
      <td className="py-2.5 px-3 w-[85px] min-w-[75px]">
        <span className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-black ${
          lead.priority === 'High' ? 'bg-red-50 text-red-700 border border-red-200' :
          lead.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
          'bg-slate-100 text-slate-600 border border-slate-200'
        }`}>
          {lead.priority || 'Medium'}
        </span>
      </td>
      <td className="py-2.5 px-2 text-center w-[65px] min-w-[60px]">
        <span className={`inline-block px-1.5 py-0.5 rounded-full font-extrabold text-[9px] min-w-6 ${
          score >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
          score >= 50 ? 'bg-sky-50 text-sky-700 border border-sky-200' :
          'bg-slate-100 text-slate-600 border border-slate-200'
        }`}>
          {score}
        </span>
      </td>
      <td className="py-2.5 px-2 text-center w-[70px] min-w-[65px]">
        <span className="inline-block px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-black text-[9px] min-w-6">
          {velocity}
        </span>
      </td>
      <td className="py-2.5 px-3 w-[85px] min-w-[80px]">
        <div className="flex items-center gap-1.5 font-bold" title={`Local Time: ${localTimeFormatted} (${isWorkingHours ? 'Working Hours' : 'Outside Hours'})`}>
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isWorkingHours ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-400'}`} />
          <span className={isWorkingHours ? 'text-emerald-700 text-[10px]' : 'text-slate-500 text-[10px]'}>
            {localTimeFormatted}
          </span>
        </div>
      </td>
      <td
        className={`py-2 px-3 text-right whitespace-nowrap w-[205px] min-w-[205px] sticky right-0 z-10 transition-colors shadow-[-6px_0_10px_-2px_rgba(0,0,0,0.06)] border-l border-slate-200/50 ${
          selected
            ? 'bg-sky-50'
            : isSent
            ? 'bg-emerald-50/70 group-hover:bg-emerald-100/60'
            : 'bg-white group-hover:bg-slate-50'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inline-flex items-center justify-end gap-1.5 w-full">
          {isSent ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onSendEmail(lead);
              }}
              className="h-7 px-2.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 text-[10px] font-bold inline-flex items-center gap-1 transition active:scale-95 shrink-0"
              title="Email Sent • Click to re-send or follow-up"
            >
              <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />
              <span>Sent</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onSendEmail(lead);
              }}
              className="h-7 px-2.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs inline-flex items-center gap-1 transition active:scale-95 shrink-0"
              title="Send Reach Out Email"
            >
              <Mail className="h-3 w-3" />
              <span>Mail</span>
            </button>
          )}

          {lead.contact_email && (
            <button
              type="button"
              onClick={handleCopyEmail}
              className={`h-7 w-7 rounded-md inline-flex items-center justify-center border transition active:scale-95 shrink-0 ${
                copied
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 border-slate-200/60 bg-slate-50/50'
              }`}
              title={copied ? 'Copied to clipboard!' : `Copy email: ${lead.contact_email}`}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}

          {lead.phone && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onSendWhatsApp(lead);
              }}
              className="h-7 w-7 rounded-md inline-flex items-center justify-center text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-200/60 bg-emerald-50/30 transition active:scale-95 shrink-0"
              title={`WhatsApp outreach: ${lead.phone}`}
            >
              <Phone className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onEditLead(lead);
            }}
            className="h-7 w-7 rounded-md inline-flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60 bg-slate-50/50 transition active:scale-95 shrink-0"
            title="Inspect / Edit Lead"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDeleteLead(lead.id);
            }}
            className="h-7 w-7 rounded-md inline-flex items-center justify-center text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/60 bg-rose-50/30 transition active:scale-95 shrink-0"
            title="Delete Lead"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};

const CrmTableRow = React.memo(CrmTableRowComponent);

// Responsive mobile card component
const CrmMobileCard: React.FC<{
  lead: CrmLead;
  selected: boolean;
  onToggleSelection: (id: string | string[], checked: boolean) => void;
  onEditLead: (lead: CrmLead) => void;
  onDeleteLead: (id: string) => void;
  onSendEmail: (lead: CrmLead) => void;
  onSendWhatsApp: (lead: CrmLead) => void;
  score: number;
  velocity: number;
  actionCategory: string;
  leadCategoryClass: (cat: string) => string;
}> = ({
  lead,
  selected,
  onToggleSelection,
  onEditLead,
  onDeleteLead,
  onSendEmail,
  onSendWhatsApp,
  score,
  velocity,
  actionCategory,
  leadCategoryClass
}) => {
  const countryLower = (lead.country || '').trim().toLowerCase();
  const offset = TIMEZONE_MAP[countryLower] !== undefined ? TIMEZONE_MAP[countryLower] : 5.5;
  const utcHour = new Date().getUTCHours();
  const localHour = (utcHour + offset + 24) % 24;
  const isWorkingHours = localHour >= 9 && localHour <= 18;
  const localTimeFormatted = `${Math.floor(localHour).toString().padStart(2, '0')}:${Math.round((localHour % 1) * 60).toString().padStart(2, '0')}`;
  const isSent = actionCategory === 'Email Sent' || actionCategory === 'Follow-up Sent' || (lead.notes && (lead.notes.includes('Email Status: Email Sent') || lead.notes.includes('Email Status: Follow-up Sent')));
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!lead.contact_email) return;
    navigator.clipboard.writeText(lead.contact_email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      onClick={() => onEditLead(lead)}
      className={`rounded-xl border p-3.5 transition-all cursor-pointer ${
        selected
          ? 'bg-sky-50/50 border-sky-300 ring-1 ring-sky-300'
          : isSent
          ? 'bg-emerald-50/20 border-emerald-200/80'
          : 'bg-white border-slate-200 hover:border-slate-300'
      } shadow-xs space-y-2.5`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelection(lead.id, e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 shrink-0 cursor-pointer"
            aria-label={`Select ${lead.company_name}`}
          />
          <div className="min-w-0">
            <h4 className="font-extrabold text-xs text-slate-900 leading-tight truncate">
              {lead.company_name}
            </h4>
            <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
              {lead.product_interest || 'General Export'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
            lead.priority === 'High' ? 'bg-red-50 text-red-700 border border-red-200' :
            lead.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            {lead.priority || 'Medium'}
          </span>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {lead.country || 'Global'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-black ${leadCategoryClass(actionCategory)}`}>
          {isSent && <Check className="h-2.5 w-2.5 text-emerald-600 stroke-[3]" />}
          {actionCategory}
        </span>
        <span className={`inline-block px-1.5 py-0.5 rounded-full font-extrabold text-[9px] ${
          score >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
          score >= 50 ? 'bg-sky-50 text-sky-700 border border-sky-200' :
          'bg-slate-100 text-slate-600 border border-slate-200'
        }`}>
          Score: {score}
        </span>
        <span className="inline-block px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-black text-[9px]">
          Vel: {velocity}
        </span>
        <div className="ml-auto flex items-center gap-1 text-[10px] font-bold text-slate-500">
          <span className={`h-1.5 w-1.5 rounded-full ${isWorkingHours ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          <span>{localTimeFormatted}</span>
        </div>
      </div>

      {/* Action Strip */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        {isSent ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSendEmail(lead);
            }}
            className="flex-1 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
            <span>Sent (Follow-up)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSendEmail(lead);
            }}
            className="flex-1 h-8 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Send Mail</span>
          </button>
        )}

        <div className="flex items-center gap-1">
          {lead.contact_email && (
            <button
              type="button"
              onClick={handleCopyEmail}
              className={`h-8 w-8 rounded-lg inline-flex items-center justify-center border transition ${
                copied
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-slate-200'
              }`}
              title="Copy Email"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}
          {lead.phone && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSendWhatsApp(lead);
              }}
              className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition"
              title="WhatsApp"
            >
              <Phone className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditLead(lead);
            }}
            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
            title="Inspect"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteLead(lead.id);
            }}
            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface CrmTableProps {
  leads: CrmLead[];
  selectedLeadIds: string[];
  onToggleSelection: (id: string | string[], checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onEditLead: (lead: CrmLead) => void;
  onDeleteLead: (id: string) => void;
  onSendEmail: (lead: CrmLead) => void;
  onSendWhatsApp: (lead: CrmLead) => void;
  onUpdateStatus: (lead: CrmLead, action: 'email_sent' | 'followup_due' | 'responded') => void;
  leadScoreValue: Record<string, number>;
  leadVelocityScore: Record<string, number>;
  bestSendWindowIST: (country: string) => string;
  leadCategoryClass: (cat: string) => string;
  leadActionCategory: (lead: CrmLead) => string;
}

const CrmTableComponent: React.FC<CrmTableProps> = ({
  leads,
  selectedLeadIds,
  onToggleSelection,
  onToggleSelectAll,
  onEditLead,
  onDeleteLead,
  onSendEmail,
  onSendWhatsApp,
  leadScoreValue,
  leadVelocityScore,
  leadCategoryClass,
  leadActionCategory,
}) => {
  const selectedLeadIdSet = useMemo(() => new Set(selectedLeadIds), [selectedLeadIds]);
  const allSelected = leads.length > 0 && leads.every((lead) => selectedLeadIdSet.has(lead.id));

  return (
    <div className="w-full space-y-3">
      {/* Mobile Card Layout (< md) */}
      <div className="md:hidden space-y-2.5">
        {leads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400 font-semibold text-xs">
            No active leads found matching current filter context.
          </div>
        ) : (
          leads.map((lead) => (
            <CrmMobileCard
              key={lead.id}
              lead={lead}
              selected={selectedLeadIdSet.has(lead.id)}
              onToggleSelection={onToggleSelection}
              onEditLead={onEditLead}
              onDeleteLead={onDeleteLead}
              onSendEmail={onSendEmail}
              onSendWhatsApp={onSendWhatsApp}
              score={leadScoreValue[lead.id] || 0}
              velocity={leadVelocityScore[lead.id] || 0}
              actionCategory={leadActionCategory(lead)}
              leadCategoryClass={leadCategoryClass}
            />
          ))
        )}
      </div>

      {/* Desktop / Tablet Adaptive Table (>= md) */}
      <div className="hidden md:block w-full overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-xs scrollbar-thin scrollbar-thumb-slate-200">
        <table className="w-full min-w-[940px] text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3 w-[44px] min-w-[44px] text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onToggleSelectAll(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  aria-label="Select all leads"
                />
              </th>
              <th className="py-3 px-3 font-extrabold text-slate-600 min-w-[190px]">Company / Product</th>
              <th className="py-3 px-3 font-extrabold text-slate-600 w-[110px] min-w-[90px]">Country</th>
              <th className="py-3 px-3 font-extrabold text-slate-600 w-[145px] min-w-[130px]">Outreach / Stage</th>
              <th className="py-3 px-3 font-extrabold text-slate-600 w-[85px] min-w-[75px]">Priority</th>
              <th className="py-3 px-2 font-extrabold text-center text-slate-600 w-[65px] min-w-[60px]">Score</th>
              <th className="py-3 px-2 font-extrabold text-center text-slate-600 w-[70px] min-w-[65px]">Velocity</th>
              <th className="py-3 px-3 font-extrabold text-slate-600 w-[85px] min-w-[80px]">Time</th>
              <th className="py-3 px-3 font-extrabold text-right text-slate-600 w-[205px] min-w-[205px] sticky right-0 bg-slate-50 z-20 shadow-[-6px_0_10px_-2px_rgba(0,0,0,0.06)] border-l border-slate-200/60">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 px-4 text-center text-slate-400 font-semibold">
                  No active leads found matching current filter context.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <CrmTableRow
                  key={lead.id}
                  lead={lead}
                  selected={selectedLeadIdSet.has(lead.id)}
                  onToggleSelection={onToggleSelection}
                  onEditLead={onEditLead}
                  onDeleteLead={onDeleteLead}
                  onSendEmail={onSendEmail}
                  onSendWhatsApp={onSendWhatsApp}
                  score={leadScoreValue[lead.id] || 0}
                  velocity={leadVelocityScore[lead.id] || 0}
                  actionCategory={leadActionCategory(lead)}
                  leadCategoryClass={leadCategoryClass}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const CrmTable = React.memo(CrmTableComponent);

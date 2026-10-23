import React from 'react';
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

  return (
    <tr
      onClick={() => onEditLead(lead)}
      className={`hover:bg-slate-50/90 transition-colors cursor-pointer select-none ${
        selected ? 'bg-sky-50/30' : isSent ? 'bg-emerald-50/20' : ''
      }`}
    >
      <td className="py-1.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onToggleSelection(lead.id, e.target.checked)}
          className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          aria-label={`Select ${lead.company_name}`}
        />
      </td>
      <td className="py-2 px-3 font-medium text-slate-900">
        <div className="font-extrabold truncate text-xs" title={lead.company_name}>
          {lead.company_name}
        </div>
        <div className="text-[9px] text-slate-400 truncate font-semibold" title={lead.product_interest}>
          {lead.product_interest || 'General Export'}
        </div>
      </td>
      <td className="py-2 px-3 font-bold text-slate-500 truncate" title={lead.country || 'Global'}>
        {lead.country || 'Global'}
      </td>
      <td className="py-2 px-3">
        <span className={`inline-flex items-center gap-1 max-w-full px-2 py-1 rounded border text-[9px] font-black tracking-wide ${leadCategoryClass(actionCategory)}`}>
          {isSent && <Check className="h-2.5 w-2.5 text-emerald-600 stroke-[3]" />}
          {actionCategory}
        </span>
      </td>
      <td className="py-2 px-3">
        <span className={`inline-block px-2 py-1 rounded text-[9px] font-black ${
          lead.priority === 'High' ? 'bg-red-50 text-red-700 border border-red-100' :
          lead.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
          'bg-slate-100 text-slate-600'
        }`}>
          {lead.priority || 'Medium'}
        </span>
      </td>
      <td className="py-2 px-3 text-center">
        <span className={`inline-block px-1.5 py-0.5 rounded-full font-extrabold text-[9px] ${
          score >= 70 ? 'bg-emerald-50 text-emerald-700' :
          score >= 50 ? 'bg-sky-50 text-sky-700' :
          'bg-slate-100 text-slate-600'
        }`}>
          {score}
        </span>
      </td>
      <td className="py-2 px-3 text-center">
        <span className="inline-block px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-250 font-black text-[9px]">
          {velocity}
        </span>
      </td>
      <td className="py-2 px-3 font-bold text-slate-600">
        <div className="flex items-center gap-1">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isWorkingHours ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          <span className={isWorkingHours ? 'text-emerald-700 text-[10px]' : 'text-slate-500 text-[10px]'}>
            {localTimeFormatted}
          </span>
        </div>
      </td>
      <td className="py-2 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="inline-flex items-center justify-end gap-1 shrink-0">
          {isSent ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onSendEmail(lead);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 text-[10px] font-black transition active:scale-95"
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
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600 text-white hover:bg-sky-700 text-[10px] font-black uppercase tracking-wider shadow-sm transition active:scale-95"
              title="Send Reach Out Email"
            >
              <Mail className="h-3 w-3" />
              <span>Send Mail</span>
            </button>
          )}
          {lead.contact_email && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                navigator.clipboard.writeText(lead.contact_email || '');
              }}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
              title={`Copy email address: ${lead.contact_email}`}
            >
              <Copy className="h-3 w-3" />
            </button>
          )}
          {lead.phone && (
            <button
              type="button"
              onClick={() => onSendWhatsApp(lead)}
              className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition"
              title="WhatsApp Outreach"
            >
              <Phone className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onEditLead(lead)}
            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition"
            title="Inspect Lead"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteLead(lead.id)}
            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
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
  const selectedLeadIdSet = React.useMemo(() => new Set(selectedLeadIds), [selectedLeadIds]);
  const allSelected = leads.length > 0 && leads.every((lead) => selectedLeadIdSet.has(lead.id));

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[1120px] w-full text-left border-collapse text-xs table-auto">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
            <th className="py-2 px-2 w-10 text-center">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onToggleSelectAll(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                aria-label="Select all leads"
              />
            </th>
            <th className="py-2 px-3 font-extrabold w-[30%] text-slate-600">Company / Product</th>
            <th className="py-2 px-3 font-extrabold w-[12%] text-slate-600">Country</th>
            <th className="py-2 px-3 font-extrabold w-[18%] text-slate-600">Outreach / Stage</th>
            <th className="py-2 px-3 font-extrabold w-[10%] text-slate-600">Priority</th>
            <th className="py-2 px-3 font-extrabold text-center w-[8%] text-slate-600">Score</th>
            <th className="py-2 px-3 font-extrabold text-center w-[8%] text-slate-600">Velocity</th>
            <th className="py-2 px-3 font-extrabold w-[8%] text-slate-600">Status</th>
            <th className="py-2 px-3 font-extrabold text-right w-[12%] text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leads.length === 0 ? (
            <tr>
              <td colSpan={9} className="p-8 text-center text-slate-400 font-semibold">
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
  );
};

export const CrmTable = React.memo(CrmTableComponent);

import React from 'react';
import { CrmLead, CrmStage } from '../../lib/types/crm';
import { Edit2, Trash2, Mail } from 'lucide-react';

interface CrmKanbanCardProps {
  lead: CrmLead;
  selected: boolean;
  onToggleSelection: (id: string | string[], checked: boolean) => void;
  onEditLead: (lead: CrmLead) => void;
  onDeleteLead: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onSendEmail: (lead: CrmLead, mode: 'First Reach' | 'Follow-up') => void;
  score: number;
  velocity: number;
  actionCategory: string;
  leadCategoryClass: (cat: string) => string;
}

const CrmKanbanCardComponent: React.FC<CrmKanbanCardProps> = ({
  lead,
  selected,
  onToggleSelection,
  onEditLead,
  onDeleteLead,
  onDragStart,
  onSendEmail,
  score,
  velocity,
  actionCategory,
  leadCategoryClass
}) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      className={`bg-white border rounded-lg p-3 shadow-sm hover:border-sky-300 hover:shadow-md cursor-grab active:cursor-grabbing transition duration-150 group ${
        selected ? 'border-sky-200 bg-sky-50/15' : 'border-slate-200'
      }`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onToggleSelection(lead.id, e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
              aria-label={`Select ${lead.company_name}`}
            />
          </div>
          <div className="min-w-0">
            <h5 className="font-extrabold text-slate-900 truncate leading-snug">{lead.company_name}</h5>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">{lead.product_interest || 'General Commodity'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-150">
          <button
            type="button"
            onClick={() => onEditLead(lead)}
            className="p-1 hover:bg-slate-100 text-slate-500 rounded"
            title="Edit"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteLead(lead.id)}
            className="p-1 hover:bg-rose-50 text-rose-600 rounded"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1">
        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${leadCategoryClass(actionCategory)}`}>
          {actionCategory.slice(0, 10)}
        </span>
        <span className="inline-block px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[8px] font-black uppercase">
          Vel: {velocity}
        </span>
        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black ${
          score >= 70 ? 'bg-emerald-50 text-emerald-700' :
          score >= 50 ? 'bg-sky-50 text-sky-700' :
          'bg-slate-100 text-slate-600'
        }`}>
          Score: {score}
        </span>
      </div>

      {actionCategory === 'Need Reach Out' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSendEmail(lead, 'First Reach');
          }}
          className="w-full mt-2.5 py-1 px-2 bg-sky-600 hover:bg-sky-700 text-white rounded text-[10px] font-black uppercase flex items-center justify-center gap-1 transition shadow-sm"
        >
          <Mail className="h-3 w-3" />
          Send Reach Out
        </button>
      )}
      {actionCategory === 'Follow-up Due' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSendEmail(lead, 'Follow-up');
          }}
          className="w-full mt-2.5 py-1 px-2 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-black uppercase flex items-center justify-center gap-1 transition shadow-sm"
        >
          <Mail className="h-3 w-3" />
          Send Follow-up
        </button>
      )}

      <div className="mt-3 flex justify-between items-center text-[9px] text-slate-400 font-bold border-t border-slate-50 pt-2">
        <span>{lead.country || 'Global'}</span>
        {lead.priority && (
          <span className={
            lead.priority === 'High' ? 'text-red-600' :
            lead.priority === 'Medium' ? 'text-amber-600' : 'text-slate-400'
          }>
            {lead.priority}
          </span>
        )}
      </div>
    </div>
  );
};

const CrmKanbanCard = React.memo(CrmKanbanCardComponent);

interface CrmKanbanProps {
  leads: CrmLead[];
  selectedLeadIds: string[];
  onToggleSelection: (id: string | string[], checked: boolean) => void;
  onEditLead: (lead: CrmLead) => void;
  onDeleteLead: (id: string) => void;
  onMoveLead: (leadId: string, newStage: any) => void;
  onSendEmail: (lead: CrmLead, mode: 'First Reach' | 'Follow-up') => void;
  leadScoreValue: Record<string, number>;
  leadVelocityScore: Record<string, number>;
  leadCategoryClass: (cat: string) => string;
  leadActionCategory: (lead: CrmLead) => string;
}

const COLUMNS: { id: string; title: string; color: string }[] = [
  { id: 'New Lead', title: 'Need Reach Out', color: 'border-t-sky-500 bg-sky-50/10' },
  { id: 'Contacted', title: 'Contacted', color: 'border-t-blue-500 bg-blue-50/10' },
  { id: 'Follow-up Due', title: 'Follow-up Due', color: 'border-t-amber-600 bg-amber-50/20 border-l border-r border-amber-250 shadow-sm' },
  { id: 'Quoted', title: 'Quoted', color: 'border-t-purple-500 bg-purple-50/10' },
  { id: 'Negotiation', title: 'Negotiating', color: 'border-t-amber-500 bg-amber-50/10' },
  { id: 'Won', title: 'Won Deals', color: 'border-t-emerald-500 bg-emerald-50/10' },
  { id: 'Lost', title: 'Lost Leads', color: 'border-t-rose-500 bg-rose-50/10' }
];

const CrmKanbanComponent: React.FC<CrmKanbanProps> = ({
  leads,
  selectedLeadIds,
  onToggleSelection,
  onEditLead,
  onDeleteLead,
  onMoveLead,
  onSendEmail,
  leadScoreValue,
  leadVelocityScore,
  leadCategoryClass,
  leadActionCategory
}) => {
  
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStage: any) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      onMoveLead(leadId, targetStage);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-7 gap-3.5 items-start">
      {COLUMNS.map((col) => {
        const colLeads = leads.filter((l) => {
          const actionCat = leadActionCategory(l);
          if (col.id === 'Follow-up Due') {
            return actionCat === 'Follow-up Due' && l.stage !== 'Won' && l.stage !== 'Lost';
          }
          // For other columns, exclude if they have follow-up due
          if (actionCat === 'Follow-up Due' && l.stage !== 'Won' && l.stage !== 'Lost') {
            return false;
          }
          return l.stage === col.id;
        });

        return (
          <div
            key={col.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`rounded-xl border border-slate-200 border-t-4 p-3 min-h-[500px] flex flex-col ${col.color}`}
          >
            <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 min-w-0">
                <input
                  type="checkbox"
                  checked={colLeads.length > 0 && colLeads.every((l) => selectedLeadIds.includes(l.id))}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const leadIds = colLeads.map((l) => l.id);
                    onToggleSelection(leadIds, checked);
                  }}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  title="Select all in stage"
                  aria-label={`Select all in ${col.title}`}
                />
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider truncate">{col.title}</h4>
              </div>
              <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                {colLeads.length}
              </span>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[70vh] pr-1">
              {colLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-200 rounded-lg text-slate-400 text-[10px] text-center font-semibold">
                  Drag cards here
                </div>
              ) : (
                colLeads.map((lead) => (
                  <CrmKanbanCard
                    key={lead.id}
                    lead={lead}
                    selected={selectedLeadIds.includes(lead.id)}
                    onToggleSelection={onToggleSelection}
                    onEditLead={onEditLead}
                    onDeleteLead={onDeleteLead}
                    onDragStart={handleDragStart}
                    onSendEmail={onSendEmail}
                    score={leadScoreValue[lead.id] || 0}
                    velocity={leadVelocityScore[lead.id] || 0}
                    actionCategory={leadActionCategory(lead)}
                    leadCategoryClass={leadCategoryClass}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const CrmKanban = React.memo(CrmKanbanComponent);

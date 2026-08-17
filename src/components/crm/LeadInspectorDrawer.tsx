import React, { useEffect, useState, useRef } from 'react';
import { CrmLead, CrmStage, CrmPriority } from '../../lib/types/crm';
import { X, Calendar, User, Tag, FileText, CheckSquare, Clock } from 'lucide-react';

interface LeadInspectorDrawerProps {
  lead: CrmLead | null;
  onClose: () => void;
  onSaveLead: (updates: Partial<CrmLead>) => void;
  activities: { id: string; lead_id?: string; type: string; title: string; details?: string; activity_date: string }[];
}

const LeadInspectorDrawerComponent: React.FC<LeadInspectorDrawerProps> = ({
  lead,
  onClose,
  onSaveLead,
  activities
}) => {
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [priority, setPriority] = useState<CrmPriority>('Medium');
  const [stage, setStage] = useState<CrmStage>('New Lead');
  const [sequence, setSequence] = useState('');
  const [notes, setNotes] = useState('');
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lead) {
      setCompanyName(lead.company_name || '');
      setContactName(lead.contact_name || '');
      setContactEmail(lead.contact_email || '');
      setPhone(lead.phone || '');
      setPriority(lead.priority || 'Medium');
      setStage(lead.stage || 'New Lead');
      setSequence(lead.sequence_enrolled || '');
      setNotes(lead.notes || '');
    }
  }, [lead]);

  // Binds Escape Key hotkey listener
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!lead) return null;

  const handleFieldBlur = (fieldName: keyof CrmLead, value: string) => {
    onSaveLead({ [fieldName]: value });
  };

  const leadActivities = activities.filter((act) => act.lead_id === lead.id);

  return (
    <div className="fixed inset-0 z-40 overflow-hidden flex justify-end" role="dialog" aria-modal="true">
      {/* Background glass overlay */}
      <div
        className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Body Panel */}
      <div
        ref={drawerRef}
        className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-50 animate-fade-left border-l border-slate-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-950 text-white">
          <div>
            <span className="text-[9px] font-black uppercase text-sky-400 tracking-wider">Lead Workspace</span>
            <h3 className="text-sm font-extrabold truncate max-w-[320px]">{companyName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition text-white"
            title="Close Drawer (ESC)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Editor Contents */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Company & Primary Info */}
          <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <h4 className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider">Primary Metadata</h4>
            <div>
              <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                onBlur={() => handleFieldBlur('company_name', companyName)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-sky-500 bg-white font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Contact Person</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  onBlur={() => handleFieldBlur('contact_name', contactName)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => handleFieldBlur('phone', phone)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-sky-500 bg-white font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Email Address</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                onBlur={() => handleFieldBlur('contact_email', contactEmail)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              />
            </div>
          </div>

          {/* Deal & Sequence parameters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <h4 className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider">Pipeline Coordinates</h4>
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">CRM Stage</label>
                <select
                  aria-label="Crm Stage"
                  value={stage}
                  onChange={(e) => {
                    setStage(e.target.value as CrmStage);
                    onSaveLead({ stage: e.target.value as CrmStage });
                  }}
                  className="w-full h-8 px-2 border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-sky-500 bg-white font-bold"
                >
                  <option value="New Lead">New Lead</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Quoted">Quoted</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Priority</label>
                <select
                  aria-label="Crm Priority"
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value as CrmPriority);
                    onSaveLead({ priority: e.target.value as CrmPriority });
                  }}
                  className="w-full h-8 px-2 border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-sky-500 bg-white font-bold"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <h4 className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider">Outreach Flow</h4>
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Email Sequence</label>
                <select
                  aria-label="Crm Sequence"
                  value={sequence}
                  onChange={(e) => {
                    setSequence(e.target.value);
                    onSaveLead({ sequence_enrolled: e.target.value });
                  }}
                  className="w-full h-8 px-2 border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-sky-500 bg-white font-bold"
                >
                  <option value="">None (Enrolled)</option>
                  <option value="Intro Sequence">Intro Sequence</option>
                  <option value="Warm Follow-Up">Warm Follow-Up</option>
                  <option value="Reactivation Sequence">Reactivation</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Follow-up Schedule</label>
                <input
                  type="date"
                  value={lead.next_follow_up || ''}
                  onChange={(e) => onSaveLead({ next_follow_up: e.target.value })}
                  className="w-full h-8 px-2 border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-sky-500 bg-white font-bold"
                />
              </div>
            </div>
          </div>

          {/* Notes Area */}
          <div className="space-y-1">
            <label className="block text-slate-500 font-bold uppercase text-[10px]">CRM Activity Notes</label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => handleFieldBlur('notes', notes)}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-sky-500 bg-slate-50/50"
              placeholder="Log outreach call outcomes, freight quote adjustments, or inspection milestones here..."
            />
          </div>

          {/* Activities Timeline logs */}
          <div className="space-y-3.5">
            <h4 className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider">CRM Activity Trail</h4>
            <div className="relative border-l-2 border-slate-100 pl-4 ml-2 space-y-3.5">
              {leadActivities.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic">No timeline events logged for this account.</p>
              ) : (
                leadActivities.map((act) => (
                  <div key={act.id} className="relative">
                    <div className="absolute -left-[23px] top-0.5 bg-white border-2 border-slate-200 h-2.5 w-2.5 rounded-full" />
                    <div>
                      <div className="font-extrabold text-slate-900 leading-snug">{act.title}</div>
                      <p className="text-slate-600 mt-0.5 text-[10px] leading-relaxed">{act.details}</p>
                      <div className="text-[8px] text-slate-400 mt-1 font-black uppercase tracking-wider flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(act.activity_date).toLocaleDateString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const LeadInspectorDrawer = React.memo(LeadInspectorDrawerComponent);

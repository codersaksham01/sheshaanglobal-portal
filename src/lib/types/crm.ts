import { Lead, TimelineActivity, TaskRecord } from '../types';

export type CrmStage = 'New Lead' | 'Contacted' | 'Quoted' | 'Negotiation' | 'Won' | 'Lost';
export type CrmPriority = 'Low' | 'Medium' | 'High';
export type OutreachStatus = 'Need Reach Out' | 'Follow-up Due' | 'Next Follow-up' | 'Waiting Reply' | 'Responded / Qualify' | 'Needs Email Fix' | 'Review' | 'Closed';

export interface CrmLead extends Lead {
  stage: CrmStage;
  priority?: CrmPriority;
  outreach_status?: OutreachStatus;
  smart_score?: number;
  velocity_score?: number;
  local_time_status?: {
    localHour: number;
    localTimeFormatted: string;
    isWorkingHours: boolean;
  };
}

export interface LeadTimelineEvent {
  id: string;
  lead_id: string;
  type: TimelineActivity['type'];
  title: string;
  details?: string;
  event_date: string;
  owner?: string;
  created_at?: string;
}

export interface CrmColumn {
  id: CrmStage;
  title: string;
  color: string;
  leads: CrmLead[];
}

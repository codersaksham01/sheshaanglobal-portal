import { supabase, isSupabaseConfigured, isMock, setDatabaseMutationCallback } from './supabaseClient';
import type {
  Quote,
  Client,
  Vendor,
  Product,
  FreightPreset,
  Lead,
  InquiryRecord,
  InquiryQuotationRecord,
  InquiryFollowUpRecord,
  TimelineActivity,
  FreightRateHistory,
  InvoiceRecord,
  ShipmentRecord,
  DocumentChecklist,
  TaskRecord,
  MessageTemplate,
  BlogPost,
  AppUser,
  ActivityLog,
  TeamMessage
} from './types';

export interface PortalDataCache {
  quotes: Quote[];
  clients: Client[];
  vendors: Vendor[];
  products: Product[];
  freightPresets: FreightPreset[];
  leads: Lead[];
  inquiries: InquiryRecord[];
  inquiryQuotations: InquiryQuotationRecord[];
  inquiryFollowUps: InquiryFollowUpRecord[];
  activities: TimelineActivity[];
  freightRates: FreightRateHistory[];
  invoices: InvoiceRecord[];
  shipments: ShipmentRecord[];
  checklists: DocumentChecklist[];
  tasks: TaskRecord[];
  templates: MessageTemplate[];
  blogs: BlogPost[];
  users: AppUser[];
  activityLogs: ActivityLog[];
  teamMessages: TeamMessage[];
  lastFetched: number;
}

export const TAB_ROUTES: Record<string, string> = {
  overview: '/overview',
  crm: '/crm',
  potentialBuyers: '/potential-buyers',
  quotes: '/quotes',
  templates: '/templates',
  generateResponses: '/generate-responses',
  letterhead: '/letterhead',
  products: '/products',
  vendors: '/vendors',
  users: '/users'
};

let memoryCache: PortalDataCache | null = null;
let inFlightFetch: Promise<PortalDataCache> | null = null;

export function hasCachedData(): boolean {
  if (memoryCache !== null && memoryCache.lastFetched > 0 && (memoryCache.quotes.length > 0 || memoryCache.products.length > 0 || memoryCache.leads.length > 0)) {
    return true;
  }
  return false;
}

export function getPortalCache(): PortalDataCache | null {
  return memoryCache;
}

export function clearPortalCache(): void {
  memoryCache = null;
  inFlightFetch = null;
}

setDatabaseMutationCallback(clearPortalCache);

export function setPortalCache(patch: Partial<PortalDataCache>): void {
  if (!memoryCache) {
    memoryCache = {
      quotes: [],
      clients: [],
      vendors: [],
      products: [],
      freightPresets: [],
      leads: [],
      inquiries: [],
      inquiryQuotations: [],
      inquiryFollowUps: [],
      activities: [],
      freightRates: [],
      invoices: [],
      shipments: [],
      checklists: [],
      tasks: [],
      templates: [],
      blogs: [],
      users: [],
      activityLogs: [],
      teamMessages: [],
      lastFetched: Date.now(),
      ...patch
    };
  } else {
    Object.assign(memoryCache, patch);
  }

  // Also sync essential pieces to sessionStorage for CrmWorkspace and PortalLayout
  if (typeof window !== 'undefined') {
    try {
      if (patch.leads) sessionStorage.setItem('cached_crm_leads', JSON.stringify(patch.leads));
      if (patch.activities) sessionStorage.setItem('cached_crm_activities', JSON.stringify(patch.activities));
      if (patch.leads || patch.clients || patch.quotes) {
        const quickCounts = {
          leads: memoryCache.leads.length,
          buyers: memoryCache.clients.length,
          quotes: memoryCache.quotes.length,
          inquiries: memoryCache.inquiries.length
        };
        sessionStorage.setItem('portal_quick_counts', JSON.stringify(quickCounts));
      }
    } catch {}
  }
}

export async function fetchAllPortalData(options?: { force?: boolean }): Promise<PortalDataCache> {
  const force = options?.force || false;
  const hasFullData = Boolean(
    memoryCache &&
    (memoryCache.quotes.length > 0 || memoryCache.products.length > 0 || memoryCache.leads.length > 0)
  );
  // If fresh cache with actual data exists within 30s and not forced, return immediately (0ms)
  if (!force && memoryCache && hasFullData && Date.now() - memoryCache.lastFetched < 30000) {
    return memoryCache;
  }
  // Deduplicate concurrent fetch calls
  if (inFlightFetch) {
    return inFlightFetch;
  }

  inFlightFetch = (async () => {
    try {
      let qData: any[] = [], cData: any[] = [], vData: any[] = [], pData: any[] = [], fData: any[] = [];
      let lData: any[] = [], inquiryData: any[] = [], inquiryQuotationData: any[] = [], inquiryFollowUpData: any[] = [];
      let aData: any[] = [], rData: any[] = [], iData: any[] = [], sData: any[] = [], dData: any[] = [];
      let tData: any[] = [], mtData: any[] = [], bData: any[] = [], uData: any[] = [], logData: any[] = [], chatData: any[] = [];

      let usedBatch = false;
      if (isMock && typeof window !== 'undefined') {
        try {
          const batchRes = await fetch('/api/db?table=all', {
            headers: {
              'x-portal-actor-email': localStorage.getItem('crixy_actor_email') || '',
              'x-portal-actor-name': localStorage.getItem('crixy_actor_name') || ''
            }
          });
          if (batchRes.ok) {
            const batchJson = await batchRes.json();
            const allDb = batchJson?.data;
            if (allDb && typeof allDb === 'object') {
              qData = allDb.quotes || [];
              cData = allDb.clients || [];
              vData = allDb.vendors || [];
              pData = allDb.products || [];
              fData = allDb.freight_presets || [];
              lData = allDb.leads || [];
              inquiryData = allDb.inquiries || [];
              inquiryQuotationData = allDb.inquiry_quotations || [];
              inquiryFollowUpData = allDb.inquiry_follow_ups || [];
              aData = allDb.activities || [];
              rData = allDb.freight_rate_history || [];
              iData = allDb.invoices || [];
              sData = allDb.shipments || [];
              dData = allDb.document_checklists || [];
              tData = allDb.tasks || [];
              mtData = allDb.message_templates || [];
              bData = allDb.blogs || [];
              uData = allDb.app_users || [];
              logData = allDb.activity_logs || [];
              chatData = allDb.team_messages || [];
              usedBatch = true;
            }
          }
        } catch {}
      }

      if (!usedBatch) {
        const results = await Promise.all([
          supabase.from('quotes').select('*, client:clients(*), items:quote_items(*)').order('created_at', { ascending: false }),
          supabase.from('clients').select('*').order('company_name'),
          supabase.from('vendors').select('*').order('company_name'),
          supabase.from('products').select('*').order('sku'),
          supabase.from('freight_presets').select('*').order('name'),
          supabase.from('leads').select('*').order('updated_at', { ascending: false }),
          supabase.from('inquiries').select('*').order('updated_at', { ascending: false }),
          supabase.from('inquiry_quotations').select('*').order('created_at', { ascending: false }),
          supabase.from('inquiry_follow_ups').select('*').order('follow_up_date', { ascending: true }),
          supabase.from('activities').select('*').order('activity_date', { ascending: false }),
          supabase.from('freight_rate_history').select('*').order('effective_date', { ascending: false }),
          supabase.from('invoices').select('*').order('created_at', { ascending: false }),
          supabase.from('shipments').select('*').order('updated_at', { ascending: false }),
          supabase.from('document_checklists').select('*').order('updated_at', { ascending: false }),
          supabase.from('tasks').select('*').order('due_date', { ascending: true }),
          supabase.from('message_templates').select('*').order('name'),
          supabase.from('blogs').select('*').order('updated_at', { ascending: false }),
          supabase.from('app_users').select('*').order('name'),
          supabase.from('activity_logs').select('*').order('created_at', { ascending: false }),
          supabase.from('team_messages').select('*').order('created_at', { ascending: false })
        ]);
        qData = results[0].data || [];
        cData = results[1].data || [];
        vData = results[2].data || [];
        pData = results[3].data || [];
        fData = results[4].data || [];
        lData = results[5].data || [];
        inquiryData = results[6].data || [];
        inquiryQuotationData = results[7].data || [];
        inquiryFollowUpData = results[8].data || [];
        aData = results[9].data || [];
        rData = results[10].data || [];
        iData = results[11].data || [];
        sData = results[12].data || [];
        dData = results[13].data || [];
        tData = results[14].data || [];
        mtData = results[15].data || [];
        bData = results[16].data || [];
        uData = results[17].data || [];
        logData = results[18].data || [];
        chatData = results[19].data || [];
      }

      const activityLeadIds = new Set((aData || []).map((act: any) => act.lead_id).filter(Boolean));
      const quotedClientIds = new Set((qData || []).map((q: any) => q.client_id).filter(Boolean));
      const alignedLeads = (lData || []).map((lead: any) => {
        const notesStr = lead.notes || '';
        const statusMatch = notesStr.match(/Email Status:\s*([^\n]+)/i);
        const emailStatus = statusMatch ? statusMatch[1].trim().toLowerCase() : '';
        const hasOutreach = activityLeadIds.has(lead.id) ||
                            emailStatus.includes('sent') ||
                            emailStatus.includes('delivered') ||
                            emailStatus.includes('opened') ||
                            emailStatus.includes('replied');

        let finalStage = lead.stage;
        if (lead.stage === 'New Lead' && hasOutreach) {
          finalStage = 'Contacted';
        } else if (lead.stage === 'Quoted' && lead.client_id && !quotedClientIds.has(lead.client_id)) {
          finalStage = 'Contacted';
        }

        if (finalStage !== lead.stage) {
          return { ...lead, stage: finalStage };
        }
        return lead;
      });

      const populated: PortalDataCache = {
        quotes: qData || [],
        clients: cData || [],
        vendors: vData || [],
        products: pData || [],
        freightPresets: fData || [],
        leads: alignedLeads,
        inquiries: inquiryData || [],
        inquiryQuotations: inquiryQuotationData || [],
        inquiryFollowUps: inquiryFollowUpData || [],
        activities: aData || [],
        freightRates: rData || [],
        invoices: iData || [],
        shipments: sData || [],
        checklists: dData || [],
        tasks: tData || [],
        templates: mtData || [],
        blogs: bData || [],
        users: uData || [],
        activityLogs: logData || [],
        teamMessages: chatData || [],
        lastFetched: Date.now()
      };

      setPortalCache(populated);
      return populated;
    } finally {
      inFlightFetch = null;
    }
  })();

  return inFlightFetch;
}

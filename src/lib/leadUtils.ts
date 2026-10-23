import { Lead, Client, Quote, ShipmentRecord } from './types';
import { CrmLead } from './types/crm';

export const countryTimezoneOffsets: Record<string, number> = {
  australia: 10,
  austria: 1,
  bahrain: 3,
  bangladesh: 6,
  belgium: 1,
  brazil: -3,
  canada: -5,
  china: 8,
  croatia: 1,
  denmark: 1,
  egypt: 2,
  france: 1,
  germany: 1,
  greece: 2,
  'hong kong': 8,
  hongkong: 8,
  hungary: 1,
  india: 5.5,
  indonesia: 7,
  italy: 1,
  japan: 9,
  kuwait: 3,
  malaysia: 8,
  netherlands: 1,
  norway: 1,
  oman: 4,
  poland: 1,
  portugal: 0,
  qatar: 3,
  'saudi arabia': 3,
  singapore: 8,
  spain: 1,
  sweden: 1,
  switzerland: 1,
  thailand: 7,
  turkey: 3,
  uae: 4,
  uk: 0,
  'united arab emirates': 4,
  'united kingdom': 0,
  'united states': -5,
  usa: -5,
  vietnam: 7
};

export const countryTimeZones: Record<string, string> = {
  australia: 'Australia/Sydney',
  austria: 'Europe/Vienna',
  bahrain: 'Asia/Bahrain',
  bangladesh: 'Asia/Dhaka',
  belgium: 'Europe/Brussels',
  brazil: 'America/Sao_Paulo',
  canada: 'America/Toronto',
  china: 'Asia/Shanghai',
  croatia: 'Europe/Zagreb',
  denmark: 'Europe/Copenhagen',
  egypt: 'Africa/Cairo',
  france: 'Europe/Paris',
  germany: 'Europe/Berlin',
  greece: 'Europe/Athens',
  'hong kong': 'Asia/Hong_Kong',
  hongkong: 'Asia/Hong_Kong',
  hungary: 'Europe/Budapest',
  india: 'Asia/Kolkata',
  indonesia: 'Asia/Jakarta',
  italy: 'Europe/Rome',
  japan: 'Asia/Tokyo',
  kuwait: 'Asia/Kuwait',
  malaysia: 'Asia/Kuala_Lumpur',
  netherlands: 'Europe/Amsterdam',
  norway: 'Europe/Oslo',
  oman: 'Asia/Muscat',
  poland: 'Europe/Warsaw',
  portugal: 'Europe/Lisbon',
  qatar: 'Asia/Qatar',
  'saudi arabia': 'Asia/Riyadh',
  singapore: 'Asia/Singapore',
  spain: 'Europe/Madrid',
  sweden: 'Europe/Stockholm',
  switzerland: 'Europe/Zurich',
  thailand: 'Asia/Bangkok',
  turkey: 'Europe/Istanbul',
  uae: 'Asia/Dubai',
  uk: 'Europe/London',
  'united arab emirates': 'Asia/Dubai',
  'united kingdom': 'Europe/London',
  'united states': 'America/New_York',
  usa: 'America/New_York',
  vietnam: 'Asia/Ho_Chi_Minh'
};

export const commonCountryNames = Object.keys(countryTimezoneOffsets).sort((a, b) => b.length - a.length);

export const normalizeCountryKey = (country = '') =>
  country.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();

export const titleCaseCountry = (country: string) =>
  country.replace(/\b\w/g, (letter) => letter.toUpperCase()).replace(/\bUae\b/, 'UAE').replace(/\bUsa\b/, 'USA').replace(/\bUk\b/, 'UK');

const formatIstHour = (hour: number) => {
  const normalized = ((hour % 24) + 24) % 24;
  const wholeHour = Math.floor(normalized);
  const minutes = Math.round((normalized - wholeHour) * 60);
  const date = new Date(2026, 0, 1, wholeHour, minutes);
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const getTimeZoneOffsetMinutes = (timeZone: string, date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);
  const getPart = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  const localDate = new Date(Date.UTC(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
    getPart('hour'),
    getPart('minute'),
    getPart('second')
  ));
  return Math.round((localDate.getTime() - date.getTime()) / 60000);
};

const zonedLocalTimeToUtc = (timeZone: string, localHour: number) => {
  const now = new Date();
  const guess = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), localHour, 0, 0));
  const offset = getTimeZoneOffsetMinutes(timeZone, guess);
  return new Date(guess.getTime() - offset * 60000);
};

const bestSendWindowCache = new Map<string, string>();

export const bestSendWindowIST = (country = '') => {
  const key = normalizeCountryKey(country);
  if (bestSendWindowCache.has(key)) {
    return bestSendWindowCache.get(key)!;
  }
  let windowStr = '';
  const timeZone = countryTimeZones[key];
  if (timeZone) {
    const start = zonedLocalTimeToUtc(timeZone, 10);
    const end = zonedLocalTimeToUtc(timeZone, 12);
    const formatter = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });
    windowStr = `Best send: ${formatter.format(start)} - ${formatter.format(end)} IST`;
  } else {
    const offset = countryTimezoneOffsets[key];
    if (offset === undefined) {
      windowStr = 'Best send: 10:30 AM - 12:30 PM IST';
    } else {
      const istDifference = 5.5 - offset;
      const startIst = 10 + istDifference;
      const endIst = 12 + istDifference;
      windowStr = `Best send: ${formatIstHour(startIst)} - ${formatIstHour(endIst)} IST`;
    }
  }
  bestSendWindowCache.set(key, windowStr);
  return windowStr;
};

export const companyKey = (record?: { company_name?: string } | null) => (record?.company_name || '').trim().toLowerCase();

export const leadNoteValue = (lead: Lead, label: string) => {
  const line = (lead.notes || '').split('\n').find((item) => item.toLowerCase().startsWith(`${label.toLowerCase()}:`));
  return line ? line.slice(line.indexOf(':') + 1).trim() : '';
};

export const setLeadNoteValues = (lead: Lead, fields: Record<string, string>) => {
  const fieldLabels = Object.keys(fields).map((label) => label.toLowerCase());
  const existingLines = (lead.notes || '')
    .split('\n')
    .filter((line) => line.trim() && !fieldLabels.some((label) => line.toLowerCase().startsWith(`${label}:`)));
  const updatedLines = Object.entries(fields).map(([label, value]) => `${label}: ${value}`);
  return [...updatedLines, ...existingLines].join('\n');
};

export const leadEmailStatus = (lead: Lead) => leadNoteValue(lead, 'Email Status') || 'Not tracked';
export const leadResponseStatus = (lead: Lead) => leadNoteValue(lead, 'Response Received') || 'No';
export const leadNextAction = (lead: Lead) => leadNoteValue(lead, 'Next Action') || 'Review lead';

export const extractContactEmails = (value?: string) => Array.from(new Set(
  ((value || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((email) => email.toLowerCase())
));

export const hasContactableEmail = (value?: string) => extractContactEmails(value).length > 0;
export const hasEmailQualityIssue = (value?: string) => !hasContactableEmail(value);
export const hasContactablePhone = (value?: string) => ((value || '').replace(/\D/g, '')).length >= 7;
export const hasPhoneQualityIssue = (value?: string) => !hasContactablePhone(value);

export const cleanContactName = (value?: string) => {
  const text = (value || '').trim();
  if (!text) return '';
  const digits = text.replace(/\D/g, '');
  const hasEmail = extractContactEmails(text).length > 0;
  const hasUrl = /(https?:\/\/|www\.|\.com\b|\.net\b|\.org\b)/i.test(text);
  const hasPhonePattern = /(\+\d{1,4}|\(\d{2,5}\)|\d{3,}[\s.-]\d{3,})/.test(text);
  const hasPersonLetterPattern = /[a-z]{2,}\s+[a-z]{2,}/i.test(text);
  if (hasEmail || hasUrl || (digits.length >= 7 && !hasPersonLetterPattern) || hasPhonePattern) return '';
  return text;
};

export const buyerGreetingName = (contactName?: string, companyName?: string) =>
  cleanContactName(contactName) || (companyName || '').trim() || 'Buyer';

export const leadHasOutreach = (lead: Lead, activityLeadIds?: Set<string>) => {
  const rawStatus = leadEmailStatus(lead).trim().toLowerCase();
  if (
    !rawStatus || 
    rawStatus === 'not tracked' || 
    rawStatus === 'not contacted' || 
    rawStatus === 'not sent' || 
    rawStatus === 'none' || 
    rawStatus === 'pending' ||
    rawStatus.startsWith('not ') || 
    rawStatus.includes('no email') ||
    rawStatus.includes('to be contacted')
  ) {
    return activityLeadIds ? activityLeadIds.has(lead.id) : false;
  }
  const positiveOutreachTerms = ['sent', 'opened', 'replied', 'whatsapp', 'reached', 'contacted', 'done', 'yes', 'responded'];
  return positiveOutreachTerms.some((term) => rawStatus.includes(term)) || (activityLeadIds ? activityLeadIds.has(lead.id) : false);
};

export const leadResponded = (lead: Lead) => leadResponseStatus(lead).toLowerCase().startsWith('yes');

export const leadFollowUpDue = (lead: Lead, todayEnd = new Date().setHours(23, 59, 59, 999)) =>
  Boolean(lead.next_follow_up && new Date(lead.next_follow_up).getTime() <= todayEnd && !['Won', 'Lost'].includes(lead.stage));

export const leadNextFollowUpScheduled = (lead: Lead, todayEnd = new Date().setHours(23, 59, 59, 999)) =>
  Boolean(lead.next_follow_up && new Date(lead.next_follow_up).getTime() > todayEnd && !leadResponded(lead) && !['Won', 'Lost'].includes(lead.stage));

export const leadNeedsFirstReach = (lead: Lead, activityLeadIds?: Set<string>) => {
  if (['Won', 'Lost'].includes(lead.stage)) return false;
  const status = leadEmailStatus(lead).trim().toLowerCase();
  if (status === 'email sent' || status === 'follow-up sent' || status === 'whatsapp sent') return false;
  if (lead.stage === 'New Lead') return true;
  return !leadHasOutreach(lead, activityLeadIds);
};

export const leadMissingEmail = (lead: Lead) => hasEmailQualityIssue(lead.contact_email);

export const leadNextActionRequiresFollowUp = (lead: Lead) => {
  const nextAction = leadNextAction(lead).toLowerCase();
  return (
    nextAction.includes('follow-up due') ||
    nextAction.includes('follow up due') ||
    nextAction.includes('follow-up pending') ||
    nextAction.includes('follow up pending') ||
    nextAction.includes('send follow-up') ||
    nextAction.includes('send follow up')
  );
};

export const leadActionCategory = (lead: Lead, activityLeadIds?: Set<string>, todayEnd = new Date().setHours(23, 59, 59, 999)): string => {
  if (lead.stage === 'Won' || lead.stage === 'Lost') return 'Closed';
  if (leadMissingEmail(lead)) return 'Needs Email Fix';

  const emailStatus = leadEmailStatus(lead);
  if (emailStatus === 'Email Sent') return 'Email Sent';
  if (emailStatus === 'Follow-up Sent') return 'Follow-up Sent';

  const nextAction = leadNextAction(lead).toLowerCase();
  if (leadNeedsFirstReach(lead, activityLeadIds) || nextAction.includes('send first') || nextAction.includes('first email') || nextAction.includes('reach out')) return 'Need Reach Out';
  if (leadResponded(lead)) return 'Responded / Qualify';
  if (leadFollowUpDue(lead, todayEnd) || leadNextActionRequiresFollowUp(lead)) return 'Follow-up Due';

  if (leadNextFollowUpScheduled(lead, todayEnd)) return 'Next Follow-up';
  if (leadHasOutreach(lead, activityLeadIds)) return 'Waiting Reply';
  return 'Need Reach Out';
};

export const leadCategoryClass = (category: string) => {
  if (category === 'Need Reach Out') return 'bg-sky-50 text-sky-700 border-sky-100';
  if (category === 'Follow-up Due') return 'bg-amber-50 text-amber-700 border-amber-100';
  if (category === 'Next Follow-up') return 'bg-indigo-50 text-indigo-700 border-indigo-100';
  if (category === 'Waiting Reply') return 'bg-slate-100 text-slate-700 border-slate-200';
  if (category === 'Responded / Qualify') return 'bg-teal-50 text-teal-700 border-teal-100';
  if (category === 'Needs Email Fix') return 'bg-red-50 text-red-700 border-red-100';
  if (category === 'Email Sent' || category === 'Contacted') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (category === 'Follow-up Sent') return 'bg-teal-50 text-teal-800 border-teal-200';
  return 'bg-violet-50 text-violet-700 border-violet-100';
};

export const leadEmailMode = (lead: Lead, activityLeadIds?: Set<string>): 'First Reach' | 'Follow-up' => {
  const category = leadActionCategory(lead, activityLeadIds);
  if (category === 'Need Reach Out') return 'First Reach';
  if (
    category === 'Follow-up Due' ||
    category === 'Next Follow-up' ||
    category === 'Waiting Reply' ||
    category === 'Responded / Qualify' ||
    category === 'Email Sent' ||
    category === 'Follow-up Sent'
  ) return 'Follow-up';
  if (leadNextActionRequiresFollowUp(lead) || leadFollowUpDue(lead) || leadHasOutreach(lead, activityLeadIds)) return 'Follow-up';
  return 'First Reach';
};

export const calculateLeadScore = (lead: Lead, hasQuotes = false, hasInvoices = false) => {
  let score = 30; // base score
  if (lead.phone && lead.phone.trim().length > 0) score += 20;
  if (lead.contact_email && lead.contact_email.trim().length > 0) score += 20;
  if (lead.country) score += 10;
  if (lead.product_interest) score += 10;
  if (hasQuotes) score += 10;
  if (hasInvoices) score += 10;
  return Math.min(100, score);
};

export const calculateLeadVelocity = (lead: Lead) => {
  let score = 0;
  const key = normalizeCountryKey(lead.country || '');
  const offset = countryTimezoneOffsets[key] !== undefined ? countryTimezoneOffsets[key] : 5.5;
  const utcHour = new Date().getUTCHours();
  const localHour = (utcHour + offset + 24) % 24;
  const isWorkingHours = localHour >= 9 && localHour <= 18;

  if (isWorkingHours) {
    score += 40;
  } else if (localHour >= 18 && localHour <= 22) {
    score += 20;
  }

  const category = leadActionCategory(lead);
  if (category === 'Follow-up Due') score += 40;
  else if (category === 'Need Reach Out') score += 30;
  else if (category === 'Responded / Qualify') score += 20;

  if (lead.priority === 'High') score += 20;
  else if (lead.priority === 'Medium') score += 10;

  return Math.min(100, score);
};

export const replaceLeadTemplateVars = (
  text = '',
  lead: Lead,
  client?: Client | null,
  quote?: Quote | null,
  shipment?: ShipmentRecord | null
) => {
  const greetingName = buyerGreetingName(lead.contact_name || client?.contact_name, lead.company_name || client?.company_name);
  return text
    .replaceAll('{{buyer_name}}', greetingName)
    .replaceAll('{{company_name}}', lead.company_name || client?.company_name || 'Buyer Company')
    .replaceAll('{{quote_number}}', quote?.quote_number || 'your quotation')
    .replaceAll('{{product_name}}', lead.product_interest || quote?.items?.[0]?.sku || 'our export product')
    .replaceAll('{{destination_port}}', client?.destination_port || lead.country || 'your destination port')
    .replaceAll('{{shipment_status}}', shipment?.status || 'Planning')
    .replaceAll('{{etd}}', shipment?.etd || 'TBA')
    .replaceAll('{{eta}}', shipment?.eta || 'TBA');
};

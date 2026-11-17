#!/usr/bin/env node

/**
 * Restores the pre-existing buyer CRM exports found in ../outputs into
 * Supabase. This never talks to Firebase/Firestore.
 *
 * Run a safe preview first:
 *   npm run crm:restore:preview
 *
 * Apply only after checking the preview:
 *   npm run crm:restore:apply
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import Papa from 'papaparse';

const apply = process.argv.includes('--apply');
const workspaceOutput = resolve(process.cwd(), '..', 'outputs');
const localEnvPath = resolve(process.cwd(), '.env.local');

const sources = [
  { name: 'Buyer CRM export', path: resolve(workspaceOutput, 'buyer_crm_import', 'buyer_crm_records.json'), type: 'json' },
  { name: 'Pasted buyer list', path: resolve(workspaceOutput, 'pasted_buyer_crm_import', 'sheshaan-global-crm-import-ready-pasted-list.csv'), type: 'csv' },
  { name: 'Malaysia buyer list', path: resolve(workspaceOutput, 'malaysia_buyer_crm_import', 'sheshaan-global-crm-import-ready-malaysia.csv'), type: 'csv' },
  { name: 'Belgium buyer list', path: resolve(workspaceOutput, 'belgium_buyer_crm_import', 'sheshaan-global-crm-import-ready.csv'), type: 'csv' }
];

async function loadLocalEnv() {
  try {
    const raw = await readFile(localEnvPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

function text(value) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function date(value) {
  const valueText = text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(valueText) ? valueText : null;
}

function leadStage(value) {
  const stage = text(value).toLowerCase();
  if (stage.includes('contact') || stage.includes('reach')) return 'Contacted';
  if (stage.includes('quot')) return 'Quoted';
  if (stage.includes('negotiat')) return 'Negotiation';
  if (stage.includes('won')) return 'Won';
  if (stage.includes('lost') || stage.includes('closed')) return 'Lost';
  return 'New Lead';
}

function outreachStatus(record) {
  if (text(record['Response Received']).toLowerCase() === 'yes') return 'Responded / Qualify';
  if (text(record['Email Status']).toLowerCase().includes('invalid')) return 'Needs Email Fix';
  if (date(record['Next Follow-up Date'])) return 'Next Follow-up';
  if (text(record['Last Email Sent On'])) return 'Waiting Reply';
  return 'Need Reach Out';
}

function stableId(record) {
  const identity = [text(record['Company Name']).toLowerCase(), text(record.Email).toLowerCase(), text(record.Country).toLowerCase(), text(record['Contact Person']).toLowerCase()].join('|');
  return `crm_restore_${createHash('sha256').update(identity).digest('hex').slice(0, 24)}`;
}

function toLead(record) {
  const source = text(record.Source).toLowerCase().includes('embassy') ? 'Embassy Data' : 'Custom Researched Data';
  const score = Number.parseInt(text(record['Lead Score']), 10);
  const notes = [
    text(record.Notes),
    text(record.Website) && `Website: ${text(record.Website)}`,
    text(record['Market Category']) && `Market category: ${text(record['Market Category'])}`,
    text(record['Product Category']) && `Product category: ${text(record['Product Category'])}`,
    text(record['Buyer Type']) && `Buyer type: ${text(record['Buyer Type'])}`,
    text(record['Next Action']) && `Next action: ${text(record['Next Action'])}`
  ].filter(Boolean).join(' | ');

  return {
    id: stableId(record),
    company_name: text(record['Company Name']),
    contact_name: text(record['Contact Person']),
    contact_email: text(record.Email).toLowerCase(),
    phone: text(record.Phone),
    country: text(record.Country),
    product_interest: text(record.Product),
    stage: leadStage(record.Stage),
    priority: ['Low', 'Medium', 'High'].includes(text(record.Priority)) ? text(record.Priority) : 'Medium',
    next_follow_up: date(record['Next Follow-up Date']),
    notes,
    data_source: source,
    outreach_status: outreachStatus(record),
    smart_score: Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 30,
    created_at: date(record['Created At']) ? `${date(record['Created At'])}T00:00:00.000Z` : undefined,
    updated_at: date(record['Updated At']) ? `${date(record['Updated At'])}T00:00:00.000Z` : undefined
  };
}

async function readSource(source) {
  const raw = await readFile(source.path, 'utf8');
  if (source.type === 'json') {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.records) ? parsed.records : [];
  }
  const result = Papa.parse(raw, { header: true, skipEmptyLines: 'greedy' });
  if (result.errors.length) throw new Error(`${source.name}: ${result.errors[0].message}`);
  return result.data;
}

async function importBatch(leads, supabaseUrl, serviceRoleKey) {
  const headers = { apikey: serviceRoleKey, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' };
  if (!serviceRoleKey.startsWith('sb_secret_')) headers.Authorization = `Bearer ${serviceRoleKey}`;
  const response = await fetch(`${supabaseUrl}/rest/v1/leads?on_conflict=id`, { method: 'POST', headers, body: JSON.stringify(leads) });
  if (!response.ok) throw new Error(`Supabase restore failed: ${response.status} ${await response.text()}`);
}

await loadLocalEnv();
const loaded = await Promise.all(sources.map(async (source) => ({ ...source, records: await readSource(source) })));
const seen = new Map();
let skipped = 0;

for (const { records } of loaded) {
  for (const record of records) {
    const company = text(record['Company Name']);
    if (!company) { skipped += 1; continue; }
    const dedupeKey = text(record.Email).toLowerCase() || `${company.toLowerCase()}|${text(record.Country).toLowerCase()}`;
    if (seen.has(dedupeKey)) { skipped += 1; continue; }
    seen.set(dedupeKey, toLead(record));
  }
}

const leads = [...seen.values()];
console.table(loaded.map(({ name, records }) => ({ source: name, records: records.length })));
console.log(`Prepared ${leads.length} unique real CRM lead(s); skipped ${skipped} duplicate/incomplete row(s).`);
console.log(`Countries: ${[...new Set(leads.map((lead) => lead.country).filter(Boolean))].sort().join(', ')}`);
console.log(`Preview: ${leads.slice(0, 3).map(({ company_name, country, contact_email }) => `${company_name} (${country}${contact_email ? `, ${contact_email}` : ''})`).join(' · ')}`);

if (!apply) {
  console.log('Preview complete. No database records were changed.');
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('A server-only SUPABASE_SERVICE_ROLE_KEY is required for the final restore. Keep it out of NEXT_PUBLIC_ variables.');
}

for (let index = 0; index < leads.length; index += 100) {
  await importBatch(leads.slice(index, index + 100), supabaseUrl, serviceRoleKey);
  console.log(`Restored ${Math.min(index + 100, leads.length)}/${leads.length} leads.`);
}

console.log('CRM restore complete. The imported records can be safely re-run because their IDs are stable.');

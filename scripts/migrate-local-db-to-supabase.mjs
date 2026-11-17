#!/usr/bin/env node

/**
 * Imports the local portal data into Supabase in dependency order.
 *
 * Default mode is a read-only preview:
 *   npm run migration:preview
 *
 * Apply only after the Supabase schema and migrations have been run:
 *   SUPABASE_SERVICE_ROLE_KEY=... npm run migration:apply
 *
 * The service-role key is intentionally server-only. Never put it in a
 * NEXT_PUBLIC_ environment variable or commit it to the repository.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const apply = process.argv.includes('--apply');
const dbPath = resolve(process.cwd(), 'db.json');
const localEnvPath = resolve(process.cwd(), '.env.local');

async function loadLocalEnv() {
  try {
    const raw = await readFile(localEnvPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

await loadLocalEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const tableOrder = [
  'clients', 'vendors', 'products', 'freight_presets', 'leads', 'quotes',
  'quote_items', 'inquiries', 'inquiry_quotations', 'inquiry_follow_ups',
  'inquiry_attachments', 'activities', 'freight_rate_history', 'invoices',
  'shipments', 'document_checklists', 'tasks', 'message_templates', 'blogs',
  'activity_logs', 'team_messages', 'accounting_transactions'
];

// app_users is intentionally excluded: profiles must reference Supabase Auth
// users, and the leadership bootstrap migration creates that safely.
const allowedColumns = {
  clients: ['id', 'company_name', 'address', 'contact_name', 'contact_email', 'phone', 'destination_port', 'products_dealing', 'created_at', 'updated_at'],
  vendors: ['id', 'company_name', 'contact_name', 'contact_email', 'phone', 'city', 'country', 'product_categories', 'payment_terms', 'rating', 'status', 'notes', 'created_at', 'updated_at'],
  products: ['id', 'sku', 'description', 'unit_price', 'cost_price', 'weight', 'dimensions', 'created_at', 'updated_at'],
  freight_presets: ['id', 'name', 'loading_port', 'destination_port', 'shipment_mode', 'freight_cost', 'insurance_cost', 'shipment_window', 'transit_time', 'partial_shipment', 'container_type', 'storage_condition', 'created_at', 'updated_at'],
  quotes: ['id', 'quote_number', 'client_id', 'currency', 'incoterm', 'origin_country', 'loading_port', 'shipment_mode', 'payment_terms', 'validity_days', 'packaging_cost', 'inland_haulage_cost', 'customs_clearance_cost', 'freight_cost', 'insurance_cost', 'status', 'margin_per_kg', 'internal_notes', 'shipper_details', 'bank_details', 'commercial_note', 'show_cif_breakdown', 'show_details_page', 'show_cif_port_in_total', 'included_responsibilities', 'excluded_responsibilities', 'included_docs', 'logistics_specs', 'commercial_terms', 'created_at', 'updated_at'],
  quote_items: ['id', 'quote_id', 'product_id', 'sku', 'description', 'quantity', 'unit_price', 'cost_price', 'weight', 'pricing_basis', 'package_quantity', 'package_unit_price', 'package_cost_price', 'hs_code', 'packing_container', 'basis_of_calculation', 'created_at', 'updated_at'],
  leads: ['id', 'company_name', 'contact_name', 'contact_email', 'phone', 'country', 'product_interest', 'estimated_value', 'stage', 'priority', 'owner', 'next_follow_up', 'notes', 'client_id', 'sequence_enrolled', 'data_source', 'outreach_status', 'smart_score', 'created_at', 'updated_at'],
  inquiries: ['id', 'inquiry_number', 'inquiry_date', 'lead_source', 'client_id', 'lead_id', 'buyer_company', 'contact_person', 'contact_email', 'whatsapp_number', 'country', 'salesperson', 'priority', 'stage', 'product_name', 'product_category', 'quantity', 'quantity_unit', 'target_price', 'currency', 'destination_country', 'destination_port', 'required_delivery_date', 'incoterm', 'packaging_requirement', 'quality_specification', 'payment_terms', 'additional_requirements', 'original_message', 'last_contact_date', 'next_follow_up_date', 'next_action', 'follow_up_status', 'estimated_value', 'notes', 'created_by', 'created_at', 'updated_at'],
  inquiry_quotations: ['id', 'quotation_number', 'inquiry_id', 'quote_id', 'client_id', 'buyer_company', 'quotation_date', 'product_name', 'quantity', 'quantity_unit', 'unit_price', 'currency', 'incoterm', 'destination_port', 'payment_terms', 'validity_date', 'packaging', 'quality', 'freight', 'total_amount', 'status', 'notes', 'created_at', 'updated_at'],
  inquiry_follow_ups: ['id', 'inquiry_id', 'client_id', 'lead_id', 'follow_up_date', 'last_contact_date', 'action', 'status', 'owner', 'result', 'notes', 'created_at', 'updated_at'],
  inquiry_attachments: ['id', 'inquiry_id', 'name', 'url', 'type', 'created_at', 'updated_at'],
  activities: ['id', 'client_id', 'lead_id', 'inquiry_id', 'quote_id', 'type', 'title', 'details', 'activity_date', 'owner', 'created_at', 'updated_at'],
  freight_rate_history: ['id', 'loading_port', 'destination_port', 'shipment_mode', 'forwarder', 'freight_cost', 'insurance_cost', 'currency', 'effective_date', 'validity_date', 'notes', 'created_at', 'updated_at'],
  invoices: ['id', 'quote_id', 'invoice_number', 'invoice_type', 'client_id', 'amount', 'currency', 'payment_status', 'advance_amount', 'balance_amount', 'due_date', 'notes', 'created_at', 'updated_at'],
  shipments: ['id', 'quote_id', 'invoice_id', 'client_id', 'booking_number', 'vessel_name', 'container_number', 'seal_number', 'bl_number', 'etd', 'eta', 'status', 'notes', 'created_at', 'updated_at'],
  document_checklists: ['id', 'quote_id', 'shipment_id', 'commercial_invoice', 'packing_list', 'certificate_origin', 'phytosanitary', 'insurance', 'bill_of_lading', 'notes', 'created_at', 'updated_at'],
  tasks: ['id', 'title', 'status', 'priority', 'due_date', 'owner', 'client_id', 'lead_id', 'quote_id', 'invoice_id', 'shipment_id', 'notes', 'created_at', 'updated_at'],
  message_templates: ['id', 'name', 'channel', 'category', 'subject', 'body', 'active', 'created_at', 'updated_at'],
  blogs: ['id', 'title', 'slug', 'content', 'cover_image_url', 'author', 'status', 'seo_keywords', 'published_at', 'created_at', 'updated_at'],
  activity_logs: ['id', 'actor_email', 'actor_name', 'action', 'table_name', 'record_id', 'record_label', 'details', 'created_at', 'updated_at'],
  team_messages: ['id', 'sender_email', 'sender_name', 'body', 'link_url', 'link_label', 'tag_type', 'tag_id', 'tag_label', 'created_at', 'updated_at'],
  accounting_transactions: ['id', 'type', 'title', 'description', 'category', 'amount', 'currency', 'payment_method', 'reference_number', 'transaction_date', 'paid_to_or_from', 'vendor_id', 'client_id', 'logged_by_name', 'logged_by_email', 'status', 'approved_by_name', 'approved_by_email', 'approval_date', 'approval_notes', 'requires_otp', 'otp_verified', 'otp_verified_at', 'receipt_url', 'created_at', 'updated_at']
};

const dateColumns = new Set([
  'inquiry_date', 'required_delivery_date', 'last_contact_date', 'next_follow_up_date',
  'quotation_date', 'validity_date', 'follow_up_date', 'effective_date', 'validity_date',
  'due_date', 'transaction_date', 'etd', 'eta'
]);

function normalizeRecord(table, record) {
  const normalized = {};
  for (const column of allowedColumns[table]) {
    if (!(column in record)) continue;
    const value = record[column];
    if (dateColumns.has(column)) {
      normalized[column] = typeof value === 'string' && value.trim() ? value.slice(0, 10) : null;
    } else if (value !== '') {
      normalized[column] = value;
    }
  }
  return normalized;
}

async function importBatch(table, records) {
  const headers = {
    apikey: serviceRoleKey,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal'
  };

  // New sb_secret_* keys are opaque API keys, not JWTs. Passing one as a
  // Bearer token returns 401; legacy service_role JWTs still need it.
  if (!serviceRoleKey.startsWith('sb_secret_')) {
    headers.Authorization = `Bearer ${serviceRoleKey}`;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?on_conflict=id`, {
    method: 'POST',
    headers,
    body: JSON.stringify(records)
  });
  if (!response.ok) throw new Error(`${table}: ${response.status} ${await response.text()}`);
}

const data = JSON.parse(await readFile(dbPath, 'utf8'));
const preview = tableOrder.map((table) => ({
  table,
  records: Array.isArray(data[table]) ? data[table].map((record) => normalizeRecord(table, record)) : []
}));

console.table(preview.map(({ table, records }) => ({ table, records: records.length })));
console.log(`Profiles: ${Array.isArray(data.app_users) ? data.app_users.length : 0} deferred to the Auth bootstrap migration.`);

if (!apply) {
  console.log('Dry run complete. No Supabase records were changed.');
  process.exit(0);
}

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running with --apply.');
}

for (const { table, records } of preview) {
  // PostgREST requires all objects in a bulk payload to expose identical
  // fields. Local records may omit optional fields, so import one at a time
  // to preserve database defaults and make retries idempotent.
  for (const record of records) {
    await importBatch(table, [record]);
  }
  if (records.length) console.log(`Imported ${records.length} ${table} record(s).`);
}

console.log('Migration complete. Verify row counts in Supabase before enabling NEXT_PUBLIC_USE_SUPABASE.');

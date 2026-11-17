#!/usr/bin/env node

/**
 * Migrates historic portal data from Cloud Firestore to Supabase.
 *
 * Usage:
 *   node scripts/migrate-firestore-to-supabase.mjs                 # preview only
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-firestore-to-supabase.mjs --apply
 *
 * The preview reads Firestore and does not modify either database. Applying is
 * idempotent because records retain their existing ids and use upserts.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, getFirestore } from 'firebase/firestore';

const apply = process.argv.includes('--apply');
const resumeFrom = process.argv.find((arg) => arg.startsWith('--from='))?.slice('--from='.length) || '';
const onlyTable = process.argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length) || '';
const recordOffset = Math.max(0, Number(process.argv.find((arg) => arg.startsWith('--offset='))?.slice('--offset='.length) || 0));
const recordLimit = Math.max(0, Number(process.argv.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length) || 0));
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

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const tableOrder = [
  'clients', 'vendors', 'supplier_agreements', 'products', 'freight_presets',
  'leads', 'quotes', 'quote_items', 'inquiries', 'inquiry_quotations',
  'inquiry_follow_ups', 'inquiry_attachments', 'activities', 'freight_rate_history',
  'invoices', 'shipments', 'document_checklists', 'tasks', 'message_templates',
  'blogs', 'activity_logs', 'team_messages', 'accounting_transactions', 'mailbox_messages'
];

// app_users stays out of the import: each profile must refer to an actual
// Supabase Auth user, created through the existing leadership bootstrap flow.
const allowedColumns = {
  clients: ['id', 'company_name', 'address', 'contact_name', 'contact_email', 'phone', 'destination_port', 'products_dealing', 'created_at', 'updated_at'],
  vendors: ['id', 'company_name', 'contact_name', 'contact_email', 'phone', 'city', 'country', 'product_categories', 'payment_terms', 'rating', 'status', 'notes', 'created_at', 'updated_at'],
  supplier_agreements: ['id', 'vendor_id', 'agreement_number', 'title', 'product_category', 'start_date', 'end_date', 'currency', 'status', 'terms', 'notes', 'created_at', 'updated_at'],
  products: ['id', 'sku', 'description', 'unit_price', 'cost_price', 'weight', 'dimensions', 'created_at', 'updated_at'],
  freight_presets: ['id', 'name', 'loading_port', 'destination_port', 'shipment_mode', 'freight_cost', 'insurance_cost', 'shipment_window', 'transit_time', 'partial_shipment', 'container_type', 'storage_condition', 'created_at', 'updated_at'],
  leads: ['id', 'company_name', 'contact_name', 'contact_email', 'phone', 'country', 'product_interest', 'estimated_value', 'stage', 'priority', 'owner', 'next_follow_up', 'notes', 'client_id', 'sequence_enrolled', 'data_source', 'outreach_status', 'smart_score', 'created_at', 'updated_at'],
  quotes: ['id', 'quote_number', 'client_id', 'currency', 'incoterm', 'origin_country', 'loading_port', 'shipment_mode', 'payment_terms', 'validity_days', 'packaging_cost', 'inland_haulage_cost', 'customs_clearance_cost', 'freight_cost', 'insurance_cost', 'status', 'margin_per_kg', 'internal_notes', 'shipper_details', 'bank_details', 'commercial_note', 'show_cif_breakdown', 'show_details_page', 'show_cif_port_in_total', 'included_responsibilities', 'excluded_responsibilities', 'included_docs', 'logistics_specs', 'commercial_terms', 'created_at', 'updated_at'],
  quote_items: ['id', 'quote_id', 'product_id', 'sku', 'description', 'quantity', 'unit_price', 'cost_price', 'weight', 'pricing_basis', 'package_quantity', 'package_unit_price', 'package_cost_price', 'hs_code', 'packing_container', 'basis_of_calculation', 'created_at', 'updated_at'],
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
  accounting_transactions: ['id', 'type', 'title', 'description', 'category', 'amount', 'currency', 'payment_method', 'reference_number', 'transaction_date', 'paid_to_or_from', 'vendor_id', 'client_id', 'logged_by_name', 'logged_by_email', 'status', 'approved_by_name', 'approved_by_email', 'approval_date', 'approval_notes', 'requires_otp', 'otp_verified', 'otp_verified_at', 'receipt_url', 'created_at', 'updated_at'],
  mailbox_messages: ['id', 'mailbox', 'message_id', 'thread_id', 'from_name', 'from_email', 'to_recipients', 'cc_recipients', 'subject', 'text_body', 'html_body', 'received_at', 'sent_at', 'direction', 'status', 'is_read', 'labels', 'created_at', 'updated_at'],
};

const dateColumns = new Set(['inquiry_date', 'required_delivery_date', 'last_contact_date', 'next_follow_up', 'next_follow_up_date', 'quotation_date', 'validity_date', 'follow_up_date', 'effective_date', 'due_date', 'transaction_date', 'etd', 'eta', 'start_date', 'end_date', 'approval_date', 'published_at']);
const timestampColumns = new Set(['created_at', 'updated_at', 'activity_date', 'received_at', 'sent_at', 'otp_verified_at']);
const nonNegativeColumns = {
  products: ['unit_price', 'cost_price', 'weight'],
  freight_presets: ['freight_cost', 'insurance_cost'],
  quotes: ['packaging_cost', 'inland_haulage_cost', 'customs_clearance_cost', 'freight_cost', 'insurance_cost', 'margin_per_kg'],
  quote_items: ['unit_price', 'cost_price', 'weight', 'package_quantity', 'package_unit_price', 'package_cost_price'],
  leads: ['estimated_value', 'smart_score'],
  inquiries: ['target_price', 'estimated_value', 'order_value', 'final_quantity', 'final_price'],
  inquiry_quotations: ['unit_price', 'freight', 'total_amount'],
  invoices: ['amount', 'advance_amount', 'balance_amount'],
  freight_rate_history: ['freight_cost', 'insurance_cost'],
  accounting_transactions: ['amount'],
};
const migrationAdjustments = new Map();

function recordAdjustment(table, column) {
  const key = `${table}.${column}`;
  migrationAdjustments.set(key, (migrationAdjustments.get(key) || 0) + 1);
}

function normalizeValue(value) {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(normalizeValue);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeValue(item)]));
}

function normalizeRecord(table, record) {
  const normalized = {};
  for (const column of allowedColumns[table]) {
    if (!(column in record)) continue;
    const value = normalizeValue(record[column]);
    if (timestampColumns.has(column)) {
      if (typeof value !== 'string' || !value.trim() || Number.isNaN(Date.parse(value))) {
        if (value !== null && value !== undefined && value !== '') recordAdjustment(table, column);
      } else {
        normalized[column] = new Date(value).toISOString();
      }
    } else if (dateColumns.has(column)) {
      if (typeof value !== 'string' || !value.trim() || Number.isNaN(Date.parse(value))) {
        normalized[column] = null;
        if (value !== null && value !== undefined && value !== '') recordAdjustment(table, column);
      } else {
        normalized[column] = new Date(value).toISOString().slice(0, 10);
      }
    }
    // Omit empty and null non-date fields so Supabase can apply its declared
    // defaults instead of rejecting a null value in a required column.
    else if (value !== '' && value !== null) normalized[column] = value;
  }
  for (const column of nonNegativeColumns[table] || []) {
    if (typeof normalized[column] !== 'number' || normalized[column] >= 0) continue;
    normalized[column] = 0;
    recordAdjustment(table, column);
  }
  if (table === 'quote_items' && typeof normalized.quantity === 'number' && normalized.quantity <= 0) {
    normalized.quantity = 0.001;
    recordAdjustment(table, 'quantity');
  }
  if (table === 'quote_items' && (typeof normalized.quantity !== 'number' || !Number.isFinite(normalized.quantity))) {
    normalized.quantity = 0.001;
    recordAdjustment(table, 'quantity');
  }
  if (table === 'quote_items' && (typeof normalized.unit_price !== 'number' || !Number.isFinite(normalized.unit_price))) {
    normalized.unit_price = 0;
    recordAdjustment(table, 'unit_price');
  }
  if (table === 'quote_items' && !normalized.sku) {
    normalized.sku = `MIGRATED-SKU-${record.id}`;
    recordAdjustment(table, 'sku');
  }
  if (table === 'inquiries' && typeof normalized.quantity === 'number' && normalized.quantity <= 0) {
    normalized.quantity = 0.001;
    recordAdjustment(table, 'quantity');
  }
  if (table === 'inquiry_quotations' && typeof normalized.quantity === 'number' && normalized.quantity <= 0) {
    normalized.quantity = 0.001;
    recordAdjustment(table, 'quantity');
  }
  if (table === 'quotes' && typeof normalized.validity_days === 'number' && normalized.validity_days <= 0) {
    normalized.validity_days = 1;
    recordAdjustment(table, 'validity_days');
  }
  if (table === 'vendors' && typeof normalized.rating === 'number' && (normalized.rating < 1 || normalized.rating > 5)) {
    normalized.rating = Math.max(1, Math.min(5, Math.round(normalized.rating)));
    recordAdjustment(table, 'rating');
  }
  return normalized;
}

async function readCollection(db, table) {
  const snapshot = await getDocs(collection(db, table));
  return snapshot.docs.map((item) => normalizeRecord(table, { id: item.id, ...item.data() }));
}

async function importBatch(table, records) {
  const headers = { apikey: serviceRoleKey, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' };
  if (!serviceRoleKey.startsWith('sb_secret_')) headers.Authorization = `Bearer ${serviceRoleKey}`;
  const conflictKey = table === 'products' ? 'sku' : table === 'blogs' ? 'slug' : table === 'invoices' ? 'invoice_number' : 'id';
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?on_conflict=${conflictKey}`, { method: 'POST', headers, body: JSON.stringify(records) });
  if (!response.ok) throw new Error(`${table}: ${response.status} ${await response.text()}`);
}

async function fetchExistingQuoteIds() {
  const headers = { apikey: serviceRoleKey };
  if (!serviceRoleKey.startsWith('sb_secret_')) headers.Authorization = `Bearer ${serviceRoleKey}`;
  const response = await fetch(`${supabaseUrl}/rest/v1/quotes?select=id,quote_number`, { headers });
  if (!response.ok) throw new Error(`Could not read existing Supabase quotes: ${response.status} ${await response.text()}`);
  return await response.json();
}

async function fetchExistingInvoiceIds() {
  const headers = { apikey: serviceRoleKey };
  if (!serviceRoleKey.startsWith('sb_secret_')) headers.Authorization = `Bearer ${serviceRoleKey}`;
  const response = await fetch(`${supabaseUrl}/rest/v1/invoices?select=id,invoice_number`, { headers });
  if (!response.ok) throw new Error(`Could not read existing Supabase invoices: ${response.status} ${await response.text()}`);
  return await response.json();
}

if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) throw new Error('Firebase configuration is missing in .env.local.');
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
// A dedicated migration account is preferred so the portal's normal login
// credentials do not need to be changed. Fall back to the current portal
// account only when dedicated values have not been supplied.
const firebaseLoginEmail = process.env.FIREBASE_MIGRATION_EMAIL || process.env.NEXT_PUBLIC_FIREBASE_LOGIN_EMAIL;
const firebaseLoginPassword = process.env.FIREBASE_MIGRATION_PASSWORD || process.env.APP_LOGIN_PASSWORD;
if (firebaseLoginEmail && firebaseLoginPassword) {
  try {
    await signInWithEmailAndPassword(getAuth(app), firebaseLoginEmail, firebaseLoginPassword);
  } catch (error) {
    throw new Error(`Firebase sign-in failed before migration: ${error instanceof Error ? error.message : 'unknown authentication error'}`);
  }
} else {
  throw new Error('Firebase login email or password is missing from .env.local.');
}
const firestore = getFirestore(app);

const preview = [];
for (const table of tableOrder) {
  const records = await readCollection(firestore, table);
  preview.push({ table, records });
}
console.table(preview.map(({ table, records }) => ({ table, firestore_records: records.length })));

// Firestore allowed historic duplicate product SKUs, but Supabase protects SKU
// integrity. Keep the first product per SKU and remap every duplicate product
// id in quote items to that canonical record before importing dependent rows.
const firestoreProducts = preview.find(({ table }) => table === 'products')?.records || [];
const canonicalProductBySku = new Map();
const productIdRemap = new Map();
for (const product of firestoreProducts) {
  const sku = String(product.sku || product.id).trim().toUpperCase();
  const canonical = canonicalProductBySku.get(sku);
  if (canonical) productIdRemap.set(product.id, canonical.id);
  else {
    canonicalProductBySku.set(sku, product);
    productIdRemap.set(product.id, product.id);
  }
}
const duplicateProductCount = firestoreProducts.length - canonicalProductBySku.size;
if (duplicateProductCount) console.log(`Consolidating ${duplicateProductCount} duplicate Firestore product SKU record(s) and remapping dependent quote items.`);
if (migrationAdjustments.size) console.log(`Normalizing historical values for schema compliance: ${[...migrationAdjustments.entries()].map(([key, count]) => `${key} (${count})`).join(', ')}.`);

let migrationPreview = preview.map(({ table, records }) => {
  if (table === 'products') return { table, records: [...canonicalProductBySku.values()] };
  if (table === 'quote_items') return { table, records: records.map((record) => {
    if (!record.product_id) return record;
    if (productIdRemap.has(record.product_id)) return { ...record, product_id: productIdRemap.get(record.product_id) };
    const { product_id, ...withoutUnknownProduct } = record;
    return withoutUnknownProduct;
  }) };
  return { table, records };
});

if (!apply) {
  console.log('Firestore preview complete. No Supabase records were changed.');
  process.exit(0);
}
if (!supabaseUrl || !serviceRoleKey) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before applying the migration.');

// Keep an existing Supabase quote id whenever the quote number already exists.
// That avoids breaking related records that may already reference that quote.
const remoteQuotes = await fetchExistingQuoteIds();
const remoteQuoteIdByNumber = new Map(remoteQuotes.map((quote) => [quote.quote_number, quote.id]));
const quoteIdRemap = new Map();
const canonicalQuotesByNumber = new Map();
const sourceQuotes = migrationPreview.find(({ table }) => table === 'quotes')?.records || [];
for (const quote of sourceQuotes) {
  const quoteNumber = String(quote.quote_number || quote.id).trim();
  const canonical = canonicalQuotesByNumber.get(quoteNumber);
  if (canonical) {
    quoteIdRemap.set(quote.id, canonical.id);
    continue;
  }
  const existingId = remoteQuoteIdByNumber.get(quoteNumber);
  const normalizedQuote = existingId ? { ...quote, id: existingId } : quote;
  canonicalQuotesByNumber.set(quoteNumber, normalizedQuote);
  quoteIdRemap.set(quote.id, normalizedQuote.id);
}
const quoteReferenceTables = new Set(['quote_items', 'inquiry_quotations', 'activities', 'invoices', 'shipments', 'document_checklists', 'tasks']);
migrationPreview = migrationPreview.map(({ table, records }) => {
  if (table === 'quotes') return { table, records: [...canonicalQuotesByNumber.values()] };
  if (!quoteReferenceTables.has(table)) return { table, records };
  return { table, records: records.map((record) => record.quote_id && quoteIdRemap.has(record.quote_id) ? { ...record, quote_id: quoteIdRemap.get(record.quote_id) } : record) };
});
const duplicateQuoteCount = sourceQuotes.length - canonicalQuotesByNumber.size;
if (duplicateQuoteCount) console.log(`Consolidating ${duplicateQuoteCount} duplicate Firestore quote number record(s) and remapping dependent records.`);

// Retain quote items even where the original Firestore quote document has
// already been deleted. The placeholder makes that exception visible for later
// review while preserving the item and its historic ID.
const knownQuoteIds = new Set([...remoteQuotes.map((quote) => quote.id), ...canonicalQuotesByNumber.values()].map((quote) => typeof quote === 'string' ? quote : quote.id));
const quoteItemRecords = migrationPreview.find(({ table }) => table === 'quote_items')?.records || [];
const orphanQuoteIds = [...new Set(quoteItemRecords.map((item) => item.quote_id).filter((id) => id && !knownQuoteIds.has(id)))];
if (orphanQuoteIds.length) {
  const placeholderQuotes = orphanQuoteIds.map((id) => ({ id, quote_number: `MIGRATED-ORPHAN-${id}`, internal_notes: 'Placeholder created during Firestore migration because the related quote document was missing.' }));
  migrationPreview = migrationPreview.map(({ table, records }) => table === 'quotes' ? { table, records: [...records, ...placeholderQuotes] } : { table, records });
  console.log(`Creating ${orphanQuoteIds.length} placeholder quote record(s) for historic orphaned quote item references.`);
}

const remoteInvoices = await fetchExistingInvoiceIds();
const remoteInvoiceIdByNumber = new Map(remoteInvoices.map((invoice) => [invoice.invoice_number, invoice.id]));
const canonicalInvoicesByNumber = new Map();
const invoiceIdRemap = new Map();
const sourceInvoices = migrationPreview.find(({ table }) => table === 'invoices')?.records || [];
for (const invoice of sourceInvoices) {
  const invoiceNumber = String(invoice.invoice_number || invoice.id).trim();
  const canonical = canonicalInvoicesByNumber.get(invoiceNumber);
  if (canonical) {
    invoiceIdRemap.set(invoice.id, canonical.id);
    continue;
  }
  const existingId = remoteInvoiceIdByNumber.get(invoiceNumber);
  const normalizedInvoice = existingId ? { ...invoice, id: existingId } : invoice;
  canonicalInvoicesByNumber.set(invoiceNumber, normalizedInvoice);
  invoiceIdRemap.set(invoice.id, normalizedInvoice.id);
}
migrationPreview = migrationPreview.map(({ table, records }) => {
  if (table === 'invoices') return { table, records: [...canonicalInvoicesByNumber.values()] };
  if (!['shipments', 'tasks'].includes(table)) return { table, records };
  return { table, records: records.map((record) => record.invoice_id && invoiceIdRemap.has(record.invoice_id) ? { ...record, invoice_id: invoiceIdRemap.get(record.invoice_id) } : record) };
});
const duplicateInvoiceCount = sourceInvoices.length - canonicalInvoicesByNumber.size;
if (duplicateInvoiceCount) console.log(`Consolidating ${duplicateInvoiceCount} duplicate Firestore invoice number record(s) and remapping dependent records.`);

// Activity and task records should remain available even where a referenced
// Firestore document was deleted before the migration. Remove only an invalid
// optional relationship; retain the record and all of its business context.
const knownIdsByTable = new Map(migrationPreview.map(({ table, records }) => [table, new Set(records.map((record) => record.id))]));
const optionalReferences = {
  quotes: { client_id: 'clients' },
  activities: { client_id: 'clients', lead_id: 'leads', inquiry_id: 'inquiries', quote_id: 'quotes' },
  tasks: { client_id: 'clients', lead_id: 'leads', quote_id: 'quotes', invoice_id: 'invoices', shipment_id: 'shipments' },
  invoices: { quote_id: 'quotes', client_id: 'clients' },
  shipments: { quote_id: 'quotes', invoice_id: 'invoices', client_id: 'clients' },
  document_checklists: { quote_id: 'quotes', shipment_id: 'shipments' },
  inquiry_follow_ups: { inquiry_id: 'inquiries', client_id: 'clients', lead_id: 'leads' },
  inquiry_quotations: { inquiry_id: 'inquiries', quote_id: 'quotes', client_id: 'clients' },
};
const removedReferenceCounts = new Map();
migrationPreview = migrationPreview.map(({ table, records }) => {
  const references = optionalReferences[table];
  if (!references) return { table, records };
  return {
    table,
    records: records.map((record) => {
      const normalized = { ...record };
      for (const [field, targetTable] of Object.entries(references)) {
        if (!normalized[field] || knownIdsByTable.get(targetTable)?.has(normalized[field])) continue;
        delete normalized[field];
        const key = `${table}.${field}`;
        removedReferenceCounts.set(key, (removedReferenceCounts.get(key) || 0) + 1);
      }
      return normalized;
    })
  };
});
if (removedReferenceCounts.size) console.log(`Removing links to deleted Firestore records: ${[...removedReferenceCounts.entries()].map(([key, count]) => `${key} (${count})`).join(', ')}.`);

const startIndex = resumeFrom ? migrationPreview.findIndex(({ table }) => table === resumeFrom) : 0;
if (resumeFrom && startIndex < 0) throw new Error(`Unknown resume table: ${resumeFrom}`);
if (resumeFrom) console.log(`Resuming migration from ${resumeFrom}.`);
let selectedCollections = migrationPreview.slice(Math.max(0, startIndex));
if (onlyTable) {
  selectedCollections = selectedCollections.filter(({ table }) => table === onlyTable);
  if (!selectedCollections.length) throw new Error(`Unknown or skipped table: ${onlyTable}`);
  console.log(`Migrating only ${onlyTable}${recordLimit ? ` records ${recordOffset} through ${recordOffset + recordLimit - 1}` : ''}.`);
}
for (const { table, records: allRecords } of selectedCollections) {
  const records = onlyTable && recordLimit ? allRecords.slice(recordOffset, recordOffset + recordLimit) : allRecords;
  // PostgREST requires matching object keys within a bulk request. Group by
  // field pattern so optional columns still retain their database defaults.
  const groups = new Map();
  for (const record of records) {
    const signature = Object.keys(record).sort().join('|');
    const group = groups.get(signature) || [];
    group.push(record);
    groups.set(signature, group);
  }
  for (const group of groups.values()) {
    for (let start = 0; start < group.length; start += 250) {
      await importBatch(table, group.slice(start, start + 250));
    }
  }
  if (records.length) console.log(`Migrated ${records.length} ${table} record(s).`);
}
console.log('Firestore migration complete. Verify Supabase row counts before changing application data settings.');
process.exit(0);

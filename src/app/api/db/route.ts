import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'db.json');
const emptyDB = {
  clients: [],
  vendors: [],
  products: [],
  freight_presets: [],
  quotes: [],
  quote_items: [],
  leads: [],
  activities: [],
  freight_rate_history: [],
  invoices: [],
  shipments: [],
  document_checklists: [],
  tasks: [],
  message_templates: [],
  app_users: []
};

const allowedTables = new Set(Object.keys(emptyDB));

function readDB() {
  try {
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify(emptyDB, null, 2), 'utf-8');
      return { ...emptyDB };
    }

    const parsed = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    return { ...emptyDB, ...parsed };
  } catch (err) {
    console.error('Error reading db.json:', err);
    return { ...emptyDB };
  }
}

function writeDB(data: any) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify({ ...emptyDB, ...data }, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing db.json:', err);
    return false;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table');

  if (!table) {
    return NextResponse.json({ error: 'Missing table name' }, { status: 400 });
  }

  if (!allowedTables.has(table)) {
    return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
  }

  const db = readDB();
  const records = db[table] || [];

  if (table === 'quotes') {
    const resolvedQuotes = records.map((q: any) => {
      const client = db.clients.find((c: any) => c.id === q.client_id);
      const items = db.quote_items.filter((qi: any) => qi.quote_id === q.id);
      return { ...q, client, items };
    });
    return NextResponse.json({ data: resolvedQuotes });
  }

  return NextResponse.json({ data: records });
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table');
  const action = searchParams.get('action');
  const db = readDB();

  if (action === 'seed') {
    const now = new Date().toISOString();

    db.clients = [
      {
        id: 'client-sg-1',
        company_name: 'BusyExim Private Limited',
        address: 'Plot No. 204, Industrial Area 1, Khor Fakkan / Dubai, UAE',
        contact_name: 'Nancy Sharma',
        contact_email: 'business@busyexim.com',
        destination_port: 'Khor Fakkan Port, UAE',
        created_at: now
      }
    ];

    db.products = [
      {
        id: 'prod-sg-1',
        sku: 'CUMIN-SG99',
        description: 'Cumin Seeds Singapore 99 (Jeera)\n- Quality: Machine Cleaned / Sortex Cleaned\n- Purity: 99% Min | Admixture: 1% Max\n- Moisture: 8-9% Max | Origin: Gujarat, India',
        unit_price: 228.27,
        cost_price: 218.27,
        weight: 1.0,
        dimensions: 'N/A',
        created_at: now
      }
    ];

    db.vendors = [
      {
        id: 'ven-sg-1',
        company_name: 'Nagpur Spice Processing Co.',
        contact_name: 'Operations Desk',
        contact_email: 'procurement@example.com',
        phone: '+91 98765 43210',
        city: 'Nagpur',
        country: 'India',
        product_categories: 'Cumin, coriander, fennel, export packing',
        payment_terms: '30% advance, balance before dispatch',
        rating: 4,
        status: 'Preferred',
        notes: 'Demo preferred supplier for spice processing and packing readiness.',
        created_at: now,
        updated_at: now
      }
    ];

    db.freight_presets = [
      {
        id: 'fre-sg-1',
        name: 'Mundra to Khor Fakkan - 20ft FCL',
        loading_port: 'Mundra Port, India',
        destination_port: 'Khor Fakkan Port, UAE',
        shipment_mode: 'Sea Freight (1x20ft FCL)',
        freight_cost: 260000.0,
        insurance_cost: 2860.0,
        shipment_window: '10-14 days post advance payment/LC confirmation',
        transit_time: '7-12 days approx., subject to carrier schedule',
        partial_shipment: 'Allowed / Allowed',
        container_type: '20ft FCL Dry Container / Ambient Storage',
        storage_condition: 'Store in a cool, dry place away from direct sunlight',
        created_at: now,
        updated_at: now
      }
    ];

    db.quotes = [
      {
        id: 'quote-sg-1',
        quote_number: 'SG-CIF-2026-0001',
        client_id: 'client-sg-1',
        currency: 'INR',
        origin_country: 'India',
        loading_port: 'Mundra Port, India',
        shipment_mode: 'Sea Freight (1x20ft FCL)',
        payment_terms: '50% Advance, 50% vs Shipping Bill',
        validity_days: 15,
        packaging_cost: 45500.0,
        inland_haulage_cost: 65000.0,
        customs_clearance_cost: 19500.0,
        freight_cost: 260000.0,
        insurance_cost: 2860.0,
        status: 'Draft',
        margin_per_kg: 10,
        internal_notes: 'Internal margin sample only. Not printed on PDFs.',
        shipper_details: {
          company_name: 'Sheshaan Global',
          address: 'Plot No. 1459, Opp. M.A.K. Azad Urdu School, Aasinagar, Nagpur - 440017, Maharashtra, India\nReg: IEC | GST | APEDA | FSSAI',
          contact_name: 'Sana Zeba Bakshi (CEO)',
          contact_email: 'info@sheshaanglobal.com',
          tax_id: 'GST: 27AAAAA1111A1Z1'
        },
        bank_details: {
          beneficiary_bank: 'State Bank of India (SBI)',
          branch_location: 'Nagpur Main Branch, Civil Lines, Nagpur, India',
          account_holder_name: 'Sheshaan Global Export Account',
          account_number: '334455667788',
          ifsc_code: 'SBIN0000432',
          swift_code: 'SBININBBXXX'
        },
        commercial_note: 'Base FOB product price incorporates a commercial margin of INR 10.00/kg. FOB sub-components, main ocean freight, and marine insurance are transparently itemized above.',
        included_responsibilities: [
          'Complete raw product cost & export packing in 40 kg Jute Bags',
          'Inland haulage and transportation from factory to Mundra Port',
          'Terminal Handling Charges (THC) & container stuffing at origin port',
          'Export customs clearance, shipping bill, COO, and Phytosanitary Certificate',
          'Main ocean freight from Mundra to Khor Fakkan Port (INR 2,60,000.00 lump sum)',
          'Marine transit cargo insurance policy (INR 2,860.00 lump sum coverage)'
        ],
        excluded_responsibilities: [
          'Import duties, tariffs, and local destination taxes / VAT in destination country',
          'Destination port terminal handling charges (THC at Khor Fakkan)',
          'Import customs clearance and local destination documentation',
          'Inland transport/delivery from discharge port to buyer warehouse',
          'Container demurrage, detention, or storage fees at destination port',
          'Buyer-requested third-party pre-shipment or destination inspection/testing fees unless explicitly agreed in writing.'
        ],
        included_docs: [
          'Commercial Invoice (Issued)',
          'Packing List (Issued)',
          'Bill of Lading (Clean On-Board B/L)',
          'Marine Insurance Certificate',
          'Certificate of Origin (Issued)',
          'Phytosanitary Certificate (Issued)'
        ],
        logistics_specs: {
          shipment_window: '10-14 days post advance payment/LC confirmation',
          transit_time: '7-12 days approx., subject to carrier schedule',
          partial_shipment: 'Allowed / Allowed',
          container_type: '20ft FCL Dry Container / Ambient Storage',
          storage_condition: 'Store in a cool, dry place away from direct sunlight'
        },
        commercial_terms: [
          'Quotation Validity & Ocean Freight Adjustments: Quoted rates are valid for 15 days from issuance. Ocean freight rates, insurance premiums, and exchange rates remain indicative until final vessel booking confirmation.',
          'Payment Terms: 50% advance payment upon proforma invoice acceptance; balance 50% payable against soft copy of Shipping Bill / Bill of Lading (B/L).',
          'Currency Exchange Protections & Settlement: All prices are quoted in Indian Rupees (INR) based on a baseline exchange rate. Final invoicing and settlement may be converted to USD or AED at prevailing RBI reference rates upon agreement.',
          'Quality Assurance & Pre-Shipment Photos: Goods are supplied strictly per contract specifications. Pre-shipment quality inspection reports, container stuffing/loading photographs, and seal numbers will be provided prior to vessel departure.',
          'Claims & Discrepancies: Any product quality or weight claims must be reported in writing within 48 hours of cargo arrival at destination port, supported by an official independent surveyor report and photographs.',
          'Force Majeure: Seller shall not be held liable for shipment delays or non-performance resulting from vessel delays, port congestion, acts of God, strikes, or unexpected customs policy changes.',
          'Governing Law & Dispute Resolution: This contract shall be governed by Indian Maritime and Commercial Law. Any dispute arising under this agreement shall be subject to the exclusive jurisdiction of the courts in Nagpur, Maharashtra, India, or resolved through binding arbitration.'
        ],
        created_at: now,
        updated_at: now
      }
    ];

    db.quote_items = [
      {
        id: 'qi-sg-1',
        quote_id: 'quote-sg-1',
        product_id: 'prod-sg-1',
        sku: 'CUMIN-SG99',
        description: 'Cumin Seeds Singapore 99 (Jeera)\n- Quality: Machine Cleaned / Sortex Cleaned\n- Purity: 99% Min | Admixture: 1% Max\n- Moisture: 8-9% Max | Origin: Gujarat, India',
        quantity: 13000,
        unit_price: 228.27,
        cost_price: 218.27,
        weight: 1.0,
        hs_code: '09093129',
        packing_container: '325 Jute Bags (40 kg Net / Bag)\n1 x 20ft FCL',
        basis_of_calculation: 'Per kg (13,000 kg)'
      }
    ];

    db.leads = [
      {
        id: 'lead-sg-1',
        company_name: 'BusyExim Private Limited',
        contact_name: 'Nancy Sharma',
        contact_email: 'business@busyexim.com',
        phone: '+971 4 388 9100',
        country: 'UAE',
        product_interest: 'Cumin Seeds Singapore 99',
        estimated_value: 3360370,
        stage: 'Quoted',
        priority: 'High',
        owner: 'Sana Zeba',
        next_follow_up: now,
        notes: 'Demo pipeline lead linked to the active CIF quote.',
        client_id: 'client-sg-1',
        created_at: now,
        updated_at: now
      }
    ];

    db.activities = [
      {
        id: 'act-sg-1',
        client_id: 'client-sg-1',
        lead_id: 'lead-sg-1',
        quote_id: 'quote-sg-1',
        type: 'Quote',
        title: 'CIF quote prepared',
        details: 'SG-CIF-2026-0001 generated for Khor Fakkan shipment.',
        activity_date: now,
        owner: 'Sana Zeba',
        created_at: now,
        updated_at: now
      }
    ];

    db.freight_rate_history = [
      {
        id: 'frh-sg-1',
        loading_port: 'Mundra Port, India',
        destination_port: 'Khor Fakkan Port, UAE',
        shipment_mode: 'Sea Freight (1x20ft FCL)',
        forwarder: 'Preferred Forwarder',
        freight_cost: 260000,
        insurance_cost: 2860,
        currency: 'INR',
        effective_date: now,
        validity_date: now,
        notes: 'Seeded from default freight preset.',
        created_at: now,
        updated_at: now
      }
    ];

    db.invoices = [
      {
        id: 'inv-sg-1',
        quote_id: 'quote-sg-1',
        invoice_number: 'PI-SG-2026-0001',
        invoice_type: 'Proforma',
        client_id: 'client-sg-1',
        amount: 3360370,
        currency: 'INR',
        payment_status: 'Pending',
        advance_amount: 1680185,
        balance_amount: 1680185,
        due_date: now,
        notes: 'Demo proforma invoice record.',
        created_at: now,
        updated_at: now
      }
    ];

    db.shipments = [
      {
        id: 'ship-sg-1',
        quote_id: 'quote-sg-1',
        invoice_id: 'inv-sg-1',
        client_id: 'client-sg-1',
        booking_number: 'BK-DEMO-001',
        vessel_name: 'To be nominated',
        container_number: '',
        seal_number: '',
        bl_number: '',
        etd: now,
        eta: now,
        status: 'Planning',
        notes: 'Demo shipment tracker record.',
        created_at: now,
        updated_at: now
      }
    ];

    db.document_checklists = [
      {
        id: 'doc-sg-1',
        quote_id: 'quote-sg-1',
        shipment_id: 'ship-sg-1',
        commercial_invoice: true,
        packing_list: true,
        certificate_origin: false,
        phytosanitary: false,
        insurance: false,
        bill_of_lading: false,
        notes: 'Initial export document checklist.',
        created_at: now,
        updated_at: now
      }
    ];

    db.tasks = [
      {
        id: 'task-sg-1',
        title: 'Follow up on CIF quotation acceptance',
        status: 'Open',
        priority: 'High',
        due_date: now,
        owner: 'Sana Zeba',
        client_id: 'client-sg-1',
        lead_id: 'lead-sg-1',
        quote_id: 'quote-sg-1',
        invoice_id: 'inv-sg-1',
        shipment_id: 'ship-sg-1',
        notes: 'Confirm buyer feedback and advance payment timeline.',
        created_at: now,
        updated_at: now
      }
    ];

    db.message_templates = [
      {
        id: 'tmpl-sg-1',
        name: 'Quotation Follow-up',
        channel: 'Email',
        category: 'Quote Follow-up',
        subject: 'Follow-up on {{quote_number}} from Sheshaan Global',
        body: 'Hi {{buyer_name}},\n\nI hope you are doing well. I am following up on quotation {{quote_number}} for {{product_name}} with CIF value {{total_value}} to {{destination_port}}.\n\nIf this product is still relevant, we can share a revised offer. If your requirement has changed, we can also propose options from our wider export range: {{product_catalogue}}.\n\nRegards,\nSheshaan Global',
        active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 'tmpl-sg-3',
        name: 'General Buyer Introduction',
        channel: 'Email',
        category: 'Introduction',
        subject: 'Export sourcing support from Sheshaan Global',
        body: 'Hi {{buyer_name}},\n\nI am reaching out from Sheshaan Global, India.\n\nWe support international buyers with export-ready products including {{product_catalogue}}. If you do not have a specific product requirement right now, we can share our product range, current availability, packing options, and CIF/FOB quotations based on your destination port.\n\nPlease let us know the products or categories {{company_name}} is exploring.\n\nRegards,\nSheshaan Global',
        active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 'tmpl-sg-2',
        name: 'Shipment Status Update',
        channel: 'WhatsApp',
        category: 'Shipment Update',
        subject: '',
        body: 'Hello {{buyer_name}}, shipment update for {{quote_number}}: current status is {{shipment_status}}. ETD: {{etd}}, ETA: {{eta}}. We will share documents as soon as they are ready.',
        active: true,
        created_at: now,
        updated_at: now
      }
    ];

    db.app_users = [
      {
        id: 'usr-sg-1',
        name: 'Sana Zeba',
        email: 'info@sheshaanglobal.com',
        role: 'Admin',
        active: true,
        created_at: now,
        updated_at: now
      }
    ];

    if (!writeDB(db)) {
      return NextResponse.json({ error: 'Could not save demo data' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (action === 'clear') {
    if (!writeDB({ ...emptyDB })) {
      return NextResponse.json({ error: 'Could not clear demo data' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (!table) {
    return NextResponse.json({ error: 'Missing table name' }, { status: 400 });
  }

  if (!allowedTables.has(table)) {
    return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
  }

  const body = await req.json();
  const valArray = Array.isArray(body) ? body : [body];
  const currentTable = db[table] || [];
  const insertedOrUpdated: any[] = [];

  valArray.forEach((v: any) => {
    const id = v.id || `${table.substring(0, 3)}-${Math.random().toString(36).slice(2, 11)}`;
    const existingIndex = currentTable.findIndex((r: any) => r.id === id);
    const existing = existingIndex > -1 ? currentTable[existingIndex] : {};
    const record = {
      ...existing,
      ...v,
      id,
      updated_at: new Date().toISOString(),
      created_at: v.created_at || existing.created_at || new Date().toISOString()
    };

    if (existingIndex > -1) currentTable[existingIndex] = record;
    else currentTable.push(record);

    insertedOrUpdated.push(record);
  });

  db[table] = currentTable;
  if (!writeDB(db)) {
    return NextResponse.json({ error: 'Could not save record' }, { status: 500 });
  }

  return NextResponse.json({ data: insertedOrUpdated });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table');
  const id = searchParams.get('id');

  if (!table || !id) {
    return NextResponse.json({ error: 'Missing table name or ID' }, { status: 400 });
  }

  if (!allowedTables.has(table)) {
    return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
  }

  const db = readDB();
  db[table] = (db[table] || []).filter((r: any) => r.id !== id);

  if (table === 'quotes') {
    db.quote_items = (db.quote_items || []).filter((qi: any) => qi.quote_id !== id);
  }

  if (!writeDB(db)) {
    return NextResponse.json({ error: 'Could not delete record' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

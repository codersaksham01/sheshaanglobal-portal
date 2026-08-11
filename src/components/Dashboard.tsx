import React, { useEffect, useMemo, useState } from 'react';
import { dbType, isFirebase, isMock, mockDB, supabase } from '../lib/supabaseClient';
import {
  AppUser,
  Client,
  DocumentChecklist,
  FreightPreset,
  FreightRateHistory,
  InvoiceRecord,
  Lead,
  Product,
  Quote,
  ShipmentRecord,
  TimelineActivity
} from '../lib/types';
import { QuoteForm } from './QuoteForm';
import {
  Anchor,
  BarChart3,
  CalendarCheck,
  CheckSquare,
  Database,
  Edit2,
  FileCheck2,
  History,
  KanbanSquare,
  Lock,
  Package,
  Plus,
  RefreshCw,
  Search,
  Ship,
  Sparkles,
  Trash2,
  TrendingUp,
  Users
} from 'lucide-react';

const quoteStatuses: Quote['status'][] = [
  'Draft',
  'Sent',
  'Negotiation',
  'Approved',
  'Invoice Raised',
  'Shipped',
  'Closed',
  'Lost',
  'Declined'
];

type TabKey = 'quotes' | 'crm' | 'timeline' | 'analytics' | 'clients' | 'products' | 'freight' | 'rates' | 'invoices' | 'shipments' | 'documents' | 'users';
type QuoteSortKey = 'created_desc' | 'created_asc' | 'value_desc' | 'value_asc' | 'buyer_asc' | 'status_asc';

const blankClient: Partial<Client> = {
  company_name: '',
  address: '',
  contact_name: '',
  contact_email: '',
  destination_port: ''
};

const blankProduct: Partial<Product> = {
  sku: '',
  description: '',
  unit_price: 0,
  cost_price: 0,
  weight: 0,
  dimensions: ''
};

const blankPreset: Partial<FreightPreset> = {
  name: '',
  loading_port: 'Mundra Port, India',
  destination_port: '',
  shipment_mode: 'Sea Freight (1x20ft FCL)',
  freight_cost: 0,
  insurance_cost: 0,
  shipment_window: '10-14 days post advance payment/LC confirmation',
  transit_time: '',
  partial_shipment: 'Allowed / Allowed',
  container_type: '20ft FCL Dry Container / Ambient Storage',
  storage_condition: 'Store in a cool, dry place away from direct sunlight'
};

const blankLead: Partial<Lead> = {
  company_name: '',
  contact_name: '',
  contact_email: '',
  phone: '',
  country: '',
  product_interest: '',
  estimated_value: 0,
  stage: 'New Lead',
  priority: 'Medium',
  owner: 'Sana Zeba',
  next_follow_up: '',
  notes: ''
};

const blankActivity: Partial<TimelineActivity> = {
  type: 'Note',
  title: '',
  details: '',
  activity_date: new Date().toISOString().slice(0, 10),
  owner: 'Sana Zeba'
};

const blankRate: Partial<FreightRateHistory> = {
  loading_port: 'Mundra Port, India',
  destination_port: '',
  shipment_mode: 'Sea Freight (1x20ft FCL)',
  forwarder: '',
  freight_cost: 0,
  insurance_cost: 0,
  currency: 'INR',
  effective_date: new Date().toISOString().slice(0, 10),
  validity_date: '',
  notes: ''
};

const blankInvoice: Partial<InvoiceRecord> = {
  invoice_number: '',
  invoice_type: 'Proforma',
  amount: 0,
  currency: 'INR',
  payment_status: 'Pending',
  advance_amount: 0,
  balance_amount: 0,
  due_date: '',
  notes: ''
};

const blankShipment: Partial<ShipmentRecord> = {
  booking_number: '',
  vessel_name: '',
  container_number: '',
  seal_number: '',
  bl_number: '',
  etd: '',
  eta: '',
  status: 'Planning',
  notes: ''
};

const blankChecklist: Partial<DocumentChecklist> = {
  commercial_invoice: false,
  packing_list: false,
  certificate_origin: false,
  phytosanitary: false,
  insurance: false,
  bill_of_lading: false,
  notes: ''
};

const blankUser: Partial<AppUser> = {
  name: '',
  email: '',
  role: 'Sales',
  active: true
};

export const Dashboard: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [freightPresets, setFreightPresets] = useState<FreightPreset[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [freightRates, setFreightRates] = useState<FreightRateHistory[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [checklists, setChecklists] = useState<DocumentChecklist[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('quotes');
  const [editingQuoteId, setEditingQuoteId] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<'All' | Quote['status']>('All');
  const [quoteCurrencyFilter, setQuoteCurrencyFilter] = useState<'All' | 'INR' | 'USD'>('All');
  const [quoteSort, setQuoteSort] = useState<QuoteSortKey>('created_desc');

  const [clientForm, setClientForm] = useState<Partial<Client>>(blankClient);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  const [productForm, setProductForm] = useState<Partial<Product>>(blankProduct);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [presetForm, setPresetForm] = useState<Partial<FreightPreset>>(blankPreset);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);

  const [leadForm, setLeadForm] = useState<Partial<Lead>>(blankLead);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [activityForm, setActivityForm] = useState<Partial<TimelineActivity>>(blankActivity);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [rateForm, setRateForm] = useState<Partial<FreightRateHistory>>(blankRate);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<Partial<InvoiceRecord>>(blankInvoice);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [shipmentForm, setShipmentForm] = useState<Partial<ShipmentRecord>>(blankShipment);
  const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null);
  const [checklistForm, setChecklistForm] = useState<Partial<DocumentChecklist>>(blankChecklist);
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<Partial<AppUser>>(blankUser);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: qData },
        { data: cData },
        { data: pData },
        { data: fData },
        { data: lData },
        { data: aData },
        { data: rData },
        { data: iData },
        { data: sData },
        { data: dData },
        { data: uData }
      ] = await Promise.all([
        supabase.from('quotes').select('*, client:clients(*), items:quote_items(*)').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('company_name'),
        supabase.from('products').select('*').order('sku'),
        supabase.from('freight_presets').select('*').order('name'),
        supabase.from('leads').select('*').order('updated_at', { ascending: false }),
        supabase.from('activities').select('*').order('activity_date', { ascending: false }),
        supabase.from('freight_rate_history').select('*').order('effective_date', { ascending: false }),
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('shipments').select('*').order('updated_at', { ascending: false }),
        supabase.from('document_checklists').select('*').order('updated_at', { ascending: false }),
        supabase.from('app_users').select('*').order('name')
      ]);

      setQuotes(qData || []);
      setClients(cData || []);
      setProducts(pData || []);
      setFreightPresets(fData || []);
      setLeads(lData || []);
      setActivities(aData || []);
      setFreightRates(rData || []);
      setInvoices(iData || []);
      setShipments(sData || []);
      setChecklists(dData || []);
      setUsers(uData || []);
    } catch (err) {
      console.warn('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const quoteValue = (q: Quote) => {
    const subtotal = (q.items || []).reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0);
    return subtotal + Number(q.packaging_cost || 0) + Number(q.inland_haulage_cost || 0) + Number(q.customs_clearance_cost || 0) + Number(q.freight_cost || 0) + Number(q.insurance_cost || 0);
  };

  const filteredQuotes = useMemo(() => {
    const search = quoteSearch.trim().toLowerCase();
    const filtered = quotes.filter((q) => {
      const haystack = [
        q.quote_number,
        q.client?.company_name,
        q.client?.contact_email,
        q.client?.destination_port,
        q.loading_port,
        q.shipment_mode
      ].join(' ').toLowerCase();

      const matchesSearch = !search || haystack.includes(search);
      const matchesStatus = quoteStatusFilter === 'All' || q.status === quoteStatusFilter;
      const matchesCurrency = quoteCurrencyFilter === 'All' || q.currency === quoteCurrencyFilter;
      return matchesSearch && matchesStatus && matchesCurrency;
    });

    return filtered.sort((a, b) => {
      if (quoteSort === 'created_asc') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      if (quoteSort === 'value_desc') return quoteValue(b) - quoteValue(a);
      if (quoteSort === 'value_asc') return quoteValue(a) - quoteValue(b);
      if (quoteSort === 'buyer_asc') return (a.client?.company_name || '').localeCompare(b.client?.company_name || '');
      if (quoteSort === 'status_asc') return a.status.localeCompare(b.status);
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [quotes, quoteSearch, quoteStatusFilter, quoteCurrencyFilter, quoteSort]);

  const analytics = useMemo(() => {
    const totalQuoted = quotes.reduce((sum, quote) => sum + quoteValue(quote), 0);
    const wonValue = quotes
      .filter((quote) => quote.status === 'Approved' || quote.status === 'Closed')
      .reduce((sum, quote) => sum + quoteValue(quote), 0);
    const pendingInvoiceValue = invoices
      .filter((invoice) => invoice.payment_status !== 'Paid')
      .reduce((sum, invoice) => sum + Number(invoice.balance_amount || invoice.amount || 0), 0);
    const activeShipments = shipments.filter((shipment) => !['Delivered', 'Arrived'].includes(shipment.status)).length;
    const completedDocs = checklists.reduce((sum, item) => {
      const flags = [item.commercial_invoice, item.packing_list, item.certificate_origin, item.phytosanitary, item.insurance, item.bill_of_lading];
      return sum + flags.filter(Boolean).length;
    }, 0);
    const totalDocs = checklists.length * 6;
    const docCompletion = totalDocs ? Math.round((completedDocs / totalDocs) * 100) : 0;
    const averageFreight = freightRates.length
      ? freightRates.reduce((sum, item) => sum + Number(item.freight_cost || 0), 0) / freightRates.length
      : 0;

    return { totalQuoted, wonValue, pendingInvoiceValue, activeShipments, docCompletion, averageFreight };
  }, [quotes, invoices, shipments, checklists, freightRates]);

  const formatQuoteCurrency = (amount: number, currency: 'USD' | 'INR') => {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const resetClientForm = () => {
    setEditingClientId(null);
    setClientForm(blankClient);
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setProductForm(blankProduct);
  };

  const resetPresetForm = () => {
    setEditingPresetId(null);
    setPresetForm(blankPreset);
  };

  const resetLeadForm = () => { setEditingLeadId(null); setLeadForm(blankLead); };
  const resetActivityForm = () => { setEditingActivityId(null); setActivityForm(blankActivity); };
  const resetRateForm = () => { setEditingRateId(null); setRateForm(blankRate); };
  const resetInvoiceForm = () => { setEditingInvoiceId(null); setInvoiceForm(blankInvoice); };
  const resetShipmentForm = () => { setEditingShipmentId(null); setShipmentForm(blankShipment); };
  const resetChecklistForm = () => { setEditingChecklistId(null); setChecklistForm(blankChecklist); };
  const resetUserForm = () => { setEditingUserId(null); setUserForm(blankUser); };

  const saveRecord = async <T extends { id: string }>(
    table: string,
    editingId: string | null,
    payload: Partial<T>,
    reset: () => void
  ) => {
    const finalPayload = { ...payload, id: editingId || payload.id || undefined };
    const query = editingId
      ? supabase.from(table).update(finalPayload).eq('id', editingId)
      : supabase.from(table).insert([finalPayload]).select().single();
    const { error } = await query as any;
    if (error) {
      alert(error.message || `Failed to save ${table}`);
      return;
    }
    reset();
    await fetchData();
  };

  const deleteRecord = async (table: string, id: string, label: string) => {
    if (!confirm(`Delete this ${label}?`)) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      alert(error.message || `Failed to delete ${label}`);
      return;
    }
    await fetchData();
  };

  const handleSeedMock = async () => {
    const dbWithHelpers = mockDB || (supabase as any);
    if ((!isMock && !isFirebase) || !dbWithHelpers?.seedMockData) return;
    try {
      setLoading(true);
      await dbWithHelpers.seedMockData();
      await fetchData();
      alert('Demo database seeded with clients, products, quote, and freight preset.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearMock = async () => {
    const dbWithHelpers = mockDB || (supabase as any);
    if ((!isMock && !isFirebase) || !dbWithHelpers?.clearAllData || !confirm('Are you sure you want to clear the entire local database?')) return;
    try {
      setLoading(true);
      await dbWithHelpers.clearAllData();
      await fetchData();
      resetClientForm();
      resetProductForm();
      resetPresetForm();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuote = async (id: string) => {
    if (!confirm('Delete this quote and all line items?')) return;
    const { error } = await supabase.from('quotes').delete().eq('id', id);
    if (error) {
      alert(error.message || 'Failed to delete quote');
      return;
    }
    setQuotes((current) => current.filter((q) => q.id !== id));
  };

  const saveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.company_name || !clientForm.destination_port) {
      alert('Please fill out Company Name and Destination Port.');
      return;
    }

    const payload = {
      id: editingClientId || undefined,
      company_name: clientForm.company_name,
      address: clientForm.address || '',
      contact_name: clientForm.contact_name || '',
      contact_email: clientForm.contact_email || '',
      destination_port: clientForm.destination_port
    };

    const query = editingClientId ? supabase.from('clients').update(payload).eq('id', editingClientId) : supabase.from('clients').insert([payload]).select().single();
    const { data, error } = await query as any;
    if (error) {
      alert(error.message || 'Failed to save client');
      return;
    }

    if (editingClientId) await fetchData();
    else setClients((current) => [...current, data]);
    resetClientForm();
  };

  const deleteClient = async (id: string) => {
    if (!confirm('Delete this buyer? Existing quotes will keep their saved buyer snapshot where available.')) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
      alert(error.message || 'Failed to delete client');
      return;
    }
    setClients((current) => current.filter((c) => c.id !== id));
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.sku || !productForm.unit_price) {
      alert('Please fill out SKU and Default FOB Unit Price.');
      return;
    }

    const payload = {
      id: editingProductId || undefined,
      sku: productForm.sku,
      description: productForm.description || '',
      unit_price: Number(productForm.unit_price) || 0,
      cost_price: Number(productForm.cost_price) || 0,
      weight: Number(productForm.weight) || 0,
      dimensions: productForm.dimensions || ''
    };

    const query = editingProductId ? supabase.from('products').update(payload).eq('id', editingProductId) : supabase.from('products').insert([payload]).select().single();
    const { data, error } = await query as any;
    if (error) {
      alert(error.message || 'Failed to save product');
      return;
    }

    if (editingProductId) await fetchData();
    else setProducts((current) => [...current, data]);
    resetProductForm();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this SKU? Historical quote line items will remain as snapshots.')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert(error.message || 'Failed to delete product');
      return;
    }
    setProducts((current) => current.filter((p) => p.id !== id));
  };

  const savePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetForm.name || !presetForm.loading_port || !presetForm.destination_port) {
      alert('Please fill out preset name, loading port, and destination port.');
      return;
    }

    const payload = {
      id: editingPresetId || undefined,
      name: presetForm.name,
      loading_port: presetForm.loading_port,
      destination_port: presetForm.destination_port,
      shipment_mode: presetForm.shipment_mode || 'Sea Freight (1x20ft FCL)',
      freight_cost: Number(presetForm.freight_cost) || 0,
      insurance_cost: Number(presetForm.insurance_cost) || 0,
      shipment_window: presetForm.shipment_window || '',
      transit_time: presetForm.transit_time || '',
      partial_shipment: presetForm.partial_shipment || '',
      container_type: presetForm.container_type || '',
      storage_condition: presetForm.storage_condition || ''
    };

    const query = editingPresetId ? supabase.from('freight_presets').update(payload).eq('id', editingPresetId) : supabase.from('freight_presets').insert([payload]).select().single();
    const { data, error } = await query as any;
    if (error) {
      alert(error.message || 'Failed to save freight preset');
      return;
    }

    if (editingPresetId) await fetchData();
    else setFreightPresets((current) => [...current, data]);
    resetPresetForm();
  };

  const deletePreset = async (id: string) => {
    if (!confirm('Delete this freight and insurance preset?')) return;
    const { error } = await supabase.from('freight_presets').delete().eq('id', id);
    if (error) {
      alert(error.message || 'Failed to delete preset');
      return;
    }
    setFreightPresets((current) => current.filter((p) => p.id !== id));
  };

  if (editingQuoteId !== undefined) {
    return (
      <div className="p-4 md:p-8">
        <QuoteForm
          quoteId={editingQuoteId}
          onSaveSuccess={() => {
            setEditingQuoteId(undefined);
            fetchData();
          }}
          onCancel={() => setEditingQuoteId(undefined)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Anchor className="text-sky-600 h-7 w-7 sm:h-8 sm:w-8 shrink-0" />
            Sheshaan Global CIF Automation
          </h1>
          <p className="text-slate-500 mt-1 text-sm">CRM, quotations, invoices, shipments, freight intelligence, and export document tracking.</p>
        </div>
        <button
          onClick={() => setEditingQuoteId(null)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow transition"
        >
          <Plus className="h-4 w-4" />
          New Quotation / Invoice
        </button>
      </div>

      {(isMock || isFirebase) && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-sky-500" />
            <div>
              <span className="font-bold text-slate-800 text-sm block">{dbType} Active</span>
              <span className="text-[11px] text-slate-500 block">
                {isFirebase ? 'Firebase environment keys are configured, so records sync with Cloud Firestore.' : 'Cloud keys are not configured, so data is stored in db.json for this workspace.'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:flex gap-2 w-full md:w-auto">
            <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 text-xs font-medium rounded border border-slate-200 transition">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button onClick={handleSeedMock} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded shadow transition">
              <Sparkles className="h-3.5 w-3.5" />
              Seed Demo
            </button>
            <button onClick={handleClearMock} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded border border-red-200 transition">
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Stat icon={<TrendingUp className="h-5 w-5" />} label="Active Deals" value={quotes.length.toString()} tone="sky" />
        <Stat icon={<KanbanSquare className="h-5 w-5" />} label="CRM Leads" value={leads.length.toString()} tone="indigo" />
        <Stat icon={<FileCheck2 className="h-5 w-5" />} label="Invoices" value={invoices.length.toString()} tone="slate" />
        <Stat icon={<Ship className="h-5 w-5" />} label="Shipments" value={shipments.length.toString()} tone="teal" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 flex overflow-x-auto text-xs md:text-sm">
          {[
            ['quotes', `Saved Deals (${quotes.length})`],
            ['crm', `CRM Pipeline (${leads.length})`],
            ['timeline', `Customer Timeline (${activities.length})`],
            ['analytics', 'Analytics'],
            ['clients', `Client Directory (${clients.length})`],
            ['products', `Product Catalog (${products.length})`],
            ['freight', `Freight Presets (${freightPresets.length})`],
            ['rates', `Freight History (${freightRates.length})`],
            ['invoices', `Invoices (${invoices.length})`],
            ['shipments', `Shipments (${shipments.length})`],
            ['documents', `Documents (${checklists.length})`],
            ['users', `Users (${users.length})`]
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as TabKey)}
              className={`px-5 py-3 font-bold border-b-2 whitespace-nowrap transition ${activeTab === key ? 'border-sky-600 text-sky-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'quotes' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 text-xs">
                <label className="lg:col-span-2 relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input value={quoteSearch} onChange={(e) => setQuoteSearch(e.target.value)} placeholder="Search quote, buyer, email, port, shipment..." className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none" />
                </label>
                <select value={quoteStatusFilter} onChange={(e) => setQuoteStatusFilter(e.target.value as any)} className="px-3 py-2 border border-slate-300 rounded">
                  <option value="All">All Statuses</option>
                  {quoteStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={quoteSort} onChange={(e) => setQuoteSort(e.target.value as QuoteSortKey)} className="px-3 py-2 border border-slate-300 rounded">
                  <option value="created_desc">Newest first</option>
                  <option value="created_asc">Oldest first</option>
                  <option value="value_desc">Highest CIF first</option>
                  <option value="value_asc">Lowest CIF first</option>
                  <option value="buyer_asc">Buyer A-Z</option>
                  <option value="status_asc">Status A-Z</option>
                </select>
                <select value={quoteCurrencyFilter} onChange={(e) => setQuoteCurrencyFilter(e.target.value as any)} className="px-3 py-2 border border-slate-300 rounded">
                  <option value="All">All Currencies</option>
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              {loading && quotes.length === 0 ? (
                <EmptyState text="Loading records..." />
              ) : filteredQuotes.length === 0 ? (
                <EmptyState text="No quotes match the current filters." />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                        <th className="p-3">Reference</th>
                        <th className="p-3">Buyer Company</th>
                        <th className="p-3">Destination Port</th>
                        <th className="p-3 text-right">Freight</th>
                        <th className="p-3 text-right">Insurance</th>
                        <th className="p-3 text-right">Total CIF</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredQuotes.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-mono font-bold text-slate-900">{q.quote_number}</td>
                          <td className="p-3">
                            <span className="font-bold text-slate-800 block">{q.client?.company_name || 'Unassigned'}</span>
                            <span className="text-[10px] text-slate-400 block">{q.client?.contact_email}</span>
                          </td>
                          <td className="p-3 text-slate-600">{q.client?.destination_port || 'N/A'}</td>
                          <td className="p-3 text-right font-mono text-slate-500">{formatQuoteCurrency(Number(q.freight_cost || 0), q.currency || 'INR')}</td>
                          <td className="p-3 text-right font-mono text-slate-500">{formatQuoteCurrency(Number(q.insurance_cost || 0), q.currency || 'INR')}</td>
                          <td className="p-3 text-right font-mono font-bold text-sky-600">{formatQuoteCurrency(quoteValue(q), q.currency || 'INR')}</td>
                          <td className="p-3 text-center"><StatusBadge status={q.status} /></td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => setEditingQuoteId(q.id)} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition" title="Edit Deal">
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleDeleteQuote(q.id)} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition" title="Delete Deal">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'crm' && (
            <TwoColumnManager
              formTitle={editingLeadId ? 'Edit CRM Lead' : 'Add CRM Lead'}
              onSubmit={(e) => {
                e.preventDefault();
                if (!leadForm.company_name) return alert('Please enter company name.');
                saveRecord<Lead>('leads', editingLeadId, {
                  ...leadForm,
                  estimated_value: Number(leadForm.estimated_value) || 0,
                  stage: leadForm.stage || 'New Lead'
                }, resetLeadForm);
              }}
              onCancel={resetLeadForm}
              isEditing={Boolean(editingLeadId)}
              form={
                <>
                  <TextInput label="Company Name *" value={leadForm.company_name || ''} onChange={(value) => setLeadForm({ ...leadForm, company_name: value })} required />
                  <TextInput label="Contact Person" value={leadForm.contact_name || ''} onChange={(value) => setLeadForm({ ...leadForm, contact_name: value })} />
                  <TextInput label="Email" value={leadForm.contact_email || ''} onChange={(value) => setLeadForm({ ...leadForm, contact_email: value })} />
                  <TextInput label="Phone" value={leadForm.phone || ''} onChange={(value) => setLeadForm({ ...leadForm, phone: value })} />
                  <SelectInput label="Pipeline Stage" value={leadForm.stage || 'New Lead'} onChange={(value) => setLeadForm({ ...leadForm, stage: value as Lead['stage'] })} options={['New Lead', 'Contacted', 'Quoted', 'Negotiation', 'Won', 'Lost']} />
                  <SelectInput label="Priority" value={leadForm.priority || 'Medium'} onChange={(value) => setLeadForm({ ...leadForm, priority: value as Lead['priority'] })} options={['Low', 'Medium', 'High']} />
                  <TextInput label="Product Interest" value={leadForm.product_interest || ''} onChange={(value) => setLeadForm({ ...leadForm, product_interest: value })} />
                  <NumberInput label="Estimated Value" value={Number(leadForm.estimated_value) || 0} onChange={(value) => setLeadForm({ ...leadForm, estimated_value: value })} />
                  <TextInput label="Next Follow-up" type="date" value={leadForm.next_follow_up || ''} onChange={(value) => setLeadForm({ ...leadForm, next_follow_up: value })} />
                  <TextArea label="Notes" value={leadForm.notes || ''} onChange={(value) => setLeadForm({ ...leadForm, notes: value })} />
                </>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['New Lead', 'Contacted', 'Quoted', 'Negotiation', 'Won', 'Lost'].map((stage) => (
                  <div key={stage} className="bg-slate-50 border border-slate-200 rounded-lg p-3 min-h-[160px]">
                    <h4 className="text-[11px] font-bold text-slate-600 uppercase mb-3">{stage}</h4>
                    <div className="space-y-2">
                      {leads.filter((lead) => lead.stage === stage).map((lead) => (
                        <div key={lead.id} className="bg-white border border-slate-200 rounded p-3 text-xs shadow-sm">
                          <div className="flex justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-900">{lead.company_name}</div>
                              <div className="text-slate-500">{lead.product_interest || 'No product noted'}</div>
                            </div>
                            <RowActions onEdit={() => { setEditingLeadId(lead.id); setLeadForm(lead); }} onDelete={() => deleteRecord('leads', lead.id, 'lead')} />
                          </div>
                          <div className="mt-2 text-[10px] text-slate-400">Follow-up: {lead.next_follow_up || 'Not set'} | {lead.priority || 'Medium'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TwoColumnManager>
          )}

          {activeTab === 'timeline' && (
            <TwoColumnManager
              formTitle={editingActivityId ? 'Edit Timeline Activity' : 'Add Timeline Activity'}
              onSubmit={(e) => {
                e.preventDefault();
                if (!activityForm.title) return alert('Please enter activity title.');
                saveRecord<TimelineActivity>('activities', editingActivityId, activityForm, resetActivityForm);
              }}
              onCancel={resetActivityForm}
              isEditing={Boolean(editingActivityId)}
              form={
                <>
                  <TextInput label="Title *" value={activityForm.title || ''} onChange={(value) => setActivityForm({ ...activityForm, title: value })} required />
                  <SelectInput label="Type" value={activityForm.type || 'Note'} onChange={(value) => setActivityForm({ ...activityForm, type: value as TimelineActivity['type'] })} options={['Call', 'Email', 'Meeting', 'Quote', 'Invoice', 'Shipment', 'Note', 'Status']} />
                  <TextInput label="Activity Date" type="date" value={activityForm.activity_date || ''} onChange={(value) => setActivityForm({ ...activityForm, activity_date: value })} />
                  <SelectInput label="Buyer" value={activityForm.client_id || ''} onChange={(value) => setActivityForm({ ...activityForm, client_id: value })} options={['', ...clients.map((client) => client.id)]} labels={{ '': 'Unlinked', ...Object.fromEntries(clients.map((client) => [client.id, client.company_name])) }} />
                  <TextArea label="Details" value={activityForm.details || ''} onChange={(value) => setActivityForm({ ...activityForm, details: value })} />
                </>
              }
            >
              <div className="space-y-3">
                {activities.length === 0 ? <EmptyState text="No customer timeline activities yet." /> : activities.map((activity) => (
                  <div key={activity.id} className="bg-white border border-slate-200 rounded-lg p-4 text-xs shadow-sm">
                    <div className="flex justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900">{activity.title}</div>
                        <div className="text-[10px] text-slate-400">{activity.type} | {activity.activity_date} | {clients.find((client) => client.id === activity.client_id)?.company_name || 'Unlinked'}</div>
                      </div>
                      <RowActions onEdit={() => { setEditingActivityId(activity.id); setActivityForm(activity); }} onDelete={() => deleteRecord('activities', activity.id, 'activity')} />
                    </div>
                    {activity.details && <p className="mt-2 text-slate-600">{activity.details}</p>}
                  </div>
                ))}
              </div>
            </TwoColumnManager>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Stat icon={<BarChart3 className="h-5 w-5" />} label="Total Quoted" value={formatQuoteCurrency(analytics.totalQuoted, 'INR')} tone="sky" />
                <Stat icon={<TrendingUp className="h-5 w-5" />} label="Won Value" value={formatQuoteCurrency(analytics.wonValue, 'INR')} tone="teal" />
                <Stat icon={<FileCheck2 className="h-5 w-5" />} label="Pending Invoice" value={formatQuoteCurrency(analytics.pendingInvoiceValue, 'INR')} tone="indigo" />
                <Stat icon={<Ship className="h-5 w-5" />} label="Active Shipments" value={analytics.activeShipments.toString()} tone="slate" />
                <Stat icon={<CheckSquare className="h-5 w-5" />} label="Document Completion" value={`${analytics.docCompletion}%`} tone="teal" />
                <Stat icon={<History className="h-5 w-5" />} label="Avg Freight Rate" value={formatQuoteCurrency(analytics.averageFreight, 'INR')} tone="sky" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SimplePanel title="Pipeline By Stage" rows={['New Lead', 'Contacted', 'Quoted', 'Negotiation', 'Won', 'Lost'].map((stage) => [stage, leads.filter((lead) => lead.stage === stage).length.toString()])} />
                <SimplePanel title="Invoice Status" rows={['Pending', 'Part Paid', 'Paid', 'Overdue'].map((status) => [status, invoices.filter((invoice) => invoice.payment_status === status).length.toString()])} />
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <TwoColumnManager
              formTitle={editingClientId ? 'Edit Buyer' : 'Register Buyer'}
              onSubmit={saveClient}
              onCancel={resetClientForm}
              isEditing={Boolean(editingClientId)}
              form={
                <>
                  <TextInput label="Company Name *" value={clientForm.company_name || ''} onChange={(value) => setClientForm({ ...clientForm, company_name: value })} required />
                  <TextInput label="Destination Port *" value={clientForm.destination_port || ''} onChange={(value) => setClientForm({ ...clientForm, destination_port: value })} required />
                  <TextArea label="Address" value={clientForm.address || ''} onChange={(value) => setClientForm({ ...clientForm, address: value })} />
                  <TextInput label="Contact Person" value={clientForm.contact_name || ''} onChange={(value) => setClientForm({ ...clientForm, contact_name: value })} />
                  <TextInput label="Email" type="email" value={clientForm.contact_email || ''} onChange={(value) => setClientForm({ ...clientForm, contact_email: value })} />
                </>
              }
            >
              {clients.length === 0 ? <EmptyState text="No buyer companies found." /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clients.map((c) => (
                    <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
                      <div className="flex justify-between gap-3">
                        <h4 className="font-bold text-slate-900">{c.company_name}</h4>
                        <RowActions onEdit={() => { setEditingClientId(c.id); setClientForm(c); }} onDelete={() => deleteClient(c.id)} />
                      </div>
                      <p className="text-slate-500 font-mono font-medium">{c.destination_port}</p>
                      {c.address && <p className="text-[11px] text-slate-600 border-t pt-1.5">{c.address}</p>}
                      <div className="text-[10px] text-slate-400 pt-1">
                        <div>Contact: {c.contact_name || 'N/A'}</div>
                        <div>Email: {c.contact_email || 'N/A'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TwoColumnManager>
          )}

          {activeTab === 'products' && (
            <TwoColumnManager
              formTitle={editingProductId ? 'Edit Product SKU' : 'Register Product SKU'}
              onSubmit={saveProduct}
              onCancel={resetProductForm}
              isEditing={Boolean(editingProductId)}
              form={
                <>
                  <TextInput label="SKU *" value={productForm.sku || ''} onChange={(value) => setProductForm({ ...productForm, sku: value })} required />
                  <NumberInput label="Selling Price / kg *" value={Number(productForm.unit_price) || 0} onChange={(value) => setProductForm({ ...productForm, unit_price: value })} />
                  <NumberInput label="Internal Cost / kg" value={Number(productForm.cost_price) || 0} onChange={(value) => setProductForm({ ...productForm, cost_price: value })} />
                  <NumberInput label="Gross Weight per Unit (kg)" value={Number(productForm.weight) || 0} onChange={(value) => setProductForm({ ...productForm, weight: value })} />
                  <TextInput label="Dimensions (LxWxH)" value={productForm.dimensions || ''} onChange={(value) => setProductForm({ ...productForm, dimensions: value })} />
                  <TextArea label="Description & Specifications" value={productForm.description || ''} onChange={(value) => setProductForm({ ...productForm, description: value })} />
                </>
              }
            >
              {products.length === 0 ? <EmptyState text="No product SKUs registered." /> : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                        <th className="p-3">SKU</th>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Sell / kg</th>
                        <th className="p-3 text-right">Cost / kg</th>
                        <th className="p-3 text-right">Weight</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-mono font-semibold text-slate-900">{p.sku}</td>
                          <td className="p-3 text-slate-600 max-w-[240px] truncate" title={p.description}>{p.description?.split('\n')[0] || 'N/A'}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800">{formatQuoteCurrency(Number(p.unit_price || 0), 'INR')}</td>
                          <td className="p-3 text-right font-mono text-slate-500">{formatQuoteCurrency(Number(p.cost_price || 0), 'INR')}</td>
                          <td className="p-3 text-right text-slate-500">{p.weight ? `${p.weight} kg` : 'N/A'}</td>
                          <td className="p-3"><RowActions onEdit={() => { setEditingProductId(p.id); setProductForm(p); }} onDelete={() => deleteProduct(p.id)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TwoColumnManager>
          )}

          {activeTab === 'freight' && (
            <TwoColumnManager
              formTitle={editingPresetId ? 'Edit Freight Preset' : 'Add Freight Preset'}
              onSubmit={savePreset}
              onCancel={resetPresetForm}
              isEditing={Boolean(editingPresetId)}
              form={
                <>
                  <TextInput label="Preset Name *" value={presetForm.name || ''} onChange={(value) => setPresetForm({ ...presetForm, name: value })} required />
                  <TextInput label="Loading Port *" value={presetForm.loading_port || ''} onChange={(value) => setPresetForm({ ...presetForm, loading_port: value })} required />
                  <TextInput label="Destination Port *" value={presetForm.destination_port || ''} onChange={(value) => setPresetForm({ ...presetForm, destination_port: value })} required />
                  <TextInput label="Shipment Mode" value={presetForm.shipment_mode || ''} onChange={(value) => setPresetForm({ ...presetForm, shipment_mode: value })} />
                  <NumberInput label="Freight Cost" value={Number(presetForm.freight_cost) || 0} onChange={(value) => setPresetForm({ ...presetForm, freight_cost: value })} />
                  <NumberInput label="Insurance Cost" value={Number(presetForm.insurance_cost) || 0} onChange={(value) => setPresetForm({ ...presetForm, insurance_cost: value })} />
                  <TextInput label="Shipment Window" value={presetForm.shipment_window || ''} onChange={(value) => setPresetForm({ ...presetForm, shipment_window: value })} />
                  <TextInput label="Transit Time" value={presetForm.transit_time || ''} onChange={(value) => setPresetForm({ ...presetForm, transit_time: value })} />
                  <TextInput label="Partial / Transshipment" value={presetForm.partial_shipment || ''} onChange={(value) => setPresetForm({ ...presetForm, partial_shipment: value })} />
                  <TextInput label="Container Type" value={presetForm.container_type || ''} onChange={(value) => setPresetForm({ ...presetForm, container_type: value })} />
                  <TextArea label="Storage Condition" value={presetForm.storage_condition || ''} onChange={(value) => setPresetForm({ ...presetForm, storage_condition: value })} />
                </>
              }
            >
              {freightPresets.length === 0 ? <EmptyState text="No freight presets yet." /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {freightPresets.map((p) => (
                    <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
                      <div className="flex justify-between gap-3">
                        <h4 className="font-bold text-slate-900">{p.name}</h4>
                        <RowActions onEdit={() => { setEditingPresetId(p.id); setPresetForm(p); }} onDelete={() => deletePreset(p.id)} />
                      </div>
                      <p className="font-mono text-slate-600">{p.loading_port} {'->'} {p.destination_port}</p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                        <span>Freight: {formatQuoteCurrency(Number(p.freight_cost || 0), 'INR')}</span>
                        <span>Insurance: {formatQuoteCurrency(Number(p.insurance_cost || 0), 'INR')}</span>
                        <span>Mode: {p.shipment_mode}</span>
                        <span>Transit: {p.transit_time || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TwoColumnManager>
          )}

          {activeTab === 'rates' && (
            <TwoColumnManager
              formTitle={editingRateId ? 'Edit Freight Rate' : 'Add Freight Rate'}
              onSubmit={(e) => {
                e.preventDefault();
                if (!rateForm.loading_port || !rateForm.destination_port) return alert('Please enter loading and destination ports.');
                saveRecord<FreightRateHistory>('freight_rate_history', editingRateId, {
                  ...rateForm,
                  freight_cost: Number(rateForm.freight_cost) || 0,
                  insurance_cost: Number(rateForm.insurance_cost) || 0
                }, resetRateForm);
              }}
              onCancel={resetRateForm}
              isEditing={Boolean(editingRateId)}
              form={
                <>
                  <TextInput label="Loading Port *" value={rateForm.loading_port || ''} onChange={(value) => setRateForm({ ...rateForm, loading_port: value })} required />
                  <TextInput label="Destination Port *" value={rateForm.destination_port || ''} onChange={(value) => setRateForm({ ...rateForm, destination_port: value })} required />
                  <TextInput label="Shipment Mode" value={rateForm.shipment_mode || ''} onChange={(value) => setRateForm({ ...rateForm, shipment_mode: value })} />
                  <TextInput label="Forwarder" value={rateForm.forwarder || ''} onChange={(value) => setRateForm({ ...rateForm, forwarder: value })} />
                  <NumberInput label="Freight Cost" value={Number(rateForm.freight_cost) || 0} onChange={(value) => setRateForm({ ...rateForm, freight_cost: value })} />
                  <NumberInput label="Insurance Cost" value={Number(rateForm.insurance_cost) || 0} onChange={(value) => setRateForm({ ...rateForm, insurance_cost: value })} />
                  <SelectInput label="Currency" value={rateForm.currency || 'INR'} onChange={(value) => setRateForm({ ...rateForm, currency: value as FreightRateHistory['currency'] })} options={['INR', 'USD']} />
                  <TextInput label="Effective Date" type="date" value={rateForm.effective_date || ''} onChange={(value) => setRateForm({ ...rateForm, effective_date: value })} />
                  <TextInput label="Validity Date" type="date" value={rateForm.validity_date || ''} onChange={(value) => setRateForm({ ...rateForm, validity_date: value })} />
                  <TextArea label="Notes" value={rateForm.notes || ''} onChange={(value) => setRateForm({ ...rateForm, notes: value })} />
                </>
              }
            >
              <DataTable headers={['Route', 'Forwarder', 'Mode', 'Freight', 'Insurance', 'Effective', 'Actions']}>
                {freightRates.map((rate) => (
                  <tr key={rate.id} className="border-b border-slate-100">
                    <td className="p-3 font-semibold">{rate.loading_port} {'->'} {rate.destination_port}</td>
                    <td className="p-3">{rate.forwarder || 'N/A'}</td>
                    <td className="p-3">{rate.shipment_mode}</td>
                    <td className="p-3 text-right font-mono">{formatQuoteCurrency(Number(rate.freight_cost || 0), rate.currency || 'INR')}</td>
                    <td className="p-3 text-right font-mono">{formatQuoteCurrency(Number(rate.insurance_cost || 0), rate.currency || 'INR')}</td>
                    <td className="p-3">{rate.effective_date || 'N/A'}</td>
                    <td className="p-3"><RowActions onEdit={() => { setEditingRateId(rate.id); setRateForm(rate); }} onDelete={() => deleteRecord('freight_rate_history', rate.id, 'freight rate')} /></td>
                  </tr>
                ))}
              </DataTable>
            </TwoColumnManager>
          )}

          {activeTab === 'invoices' && (
            <TwoColumnManager
              formTitle={editingInvoiceId ? 'Edit Invoice' : 'Add Proforma / Tax Invoice'}
              onSubmit={(e) => {
                e.preventDefault();
                if (!invoiceForm.invoice_number) return alert('Please enter invoice number.');
                saveRecord<InvoiceRecord>('invoices', editingInvoiceId, {
                  ...invoiceForm,
                  amount: Number(invoiceForm.amount) || 0,
                  advance_amount: Number(invoiceForm.advance_amount) || 0,
                  balance_amount: Number(invoiceForm.balance_amount) || 0
                }, resetInvoiceForm);
              }}
              onCancel={resetInvoiceForm}
              isEditing={Boolean(editingInvoiceId)}
              form={
                <>
                  <TextInput label="Invoice Number *" value={invoiceForm.invoice_number || ''} onChange={(value) => setInvoiceForm({ ...invoiceForm, invoice_number: value })} required />
                  <SelectInput label="Invoice Type" value={invoiceForm.invoice_type || 'Proforma'} onChange={(value) => setInvoiceForm({ ...invoiceForm, invoice_type: value as InvoiceRecord['invoice_type'] })} options={['Proforma', 'Tax']} />
                  <SelectInput label="Buyer" value={invoiceForm.client_id || ''} onChange={(value) => setInvoiceForm({ ...invoiceForm, client_id: value })} options={['', ...clients.map((client) => client.id)]} labels={{ '': 'Unlinked', ...Object.fromEntries(clients.map((client) => [client.id, client.company_name])) }} />
                  <NumberInput label="Amount" value={Number(invoiceForm.amount) || 0} onChange={(value) => setInvoiceForm({ ...invoiceForm, amount: value })} />
                  <NumberInput label="Advance Amount" value={Number(invoiceForm.advance_amount) || 0} onChange={(value) => setInvoiceForm({ ...invoiceForm, advance_amount: value })} />
                  <NumberInput label="Balance Amount" value={Number(invoiceForm.balance_amount) || 0} onChange={(value) => setInvoiceForm({ ...invoiceForm, balance_amount: value })} />
                  <SelectInput label="Payment Status" value={invoiceForm.payment_status || 'Pending'} onChange={(value) => setInvoiceForm({ ...invoiceForm, payment_status: value as InvoiceRecord['payment_status'] })} options={['Pending', 'Part Paid', 'Paid', 'Overdue']} />
                  <SelectInput label="Currency" value={invoiceForm.currency || 'INR'} onChange={(value) => setInvoiceForm({ ...invoiceForm, currency: value as InvoiceRecord['currency'] })} options={['INR', 'USD']} />
                  <TextInput label="Due Date" type="date" value={invoiceForm.due_date || ''} onChange={(value) => setInvoiceForm({ ...invoiceForm, due_date: value })} />
                  <TextArea label="Notes" value={invoiceForm.notes || ''} onChange={(value) => setInvoiceForm({ ...invoiceForm, notes: value })} />
                </>
              }
            >
              <DataTable headers={['Invoice', 'Type', 'Buyer', 'Amount', 'Balance', 'Status', 'Actions']}>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-100">
                    <td className="p-3 font-mono font-bold">{invoice.invoice_number}</td>
                    <td className="p-3">{invoice.invoice_type}</td>
                    <td className="p-3">{clients.find((client) => client.id === invoice.client_id)?.company_name || 'Unlinked'}</td>
                    <td className="p-3 text-right font-mono">{formatQuoteCurrency(Number(invoice.amount || 0), invoice.currency || 'INR')}</td>
                    <td className="p-3 text-right font-mono">{formatQuoteCurrency(Number(invoice.balance_amount || 0), invoice.currency || 'INR')}</td>
                    <td className="p-3"><SmallBadge text={invoice.payment_status} /></td>
                    <td className="p-3"><RowActions onEdit={() => { setEditingInvoiceId(invoice.id); setInvoiceForm(invoice); }} onDelete={() => deleteRecord('invoices', invoice.id, 'invoice')} /></td>
                  </tr>
                ))}
              </DataTable>
            </TwoColumnManager>
          )}

          {activeTab === 'shipments' && (
            <TwoColumnManager
              formTitle={editingShipmentId ? 'Edit Shipment' : 'Add Shipment'}
              onSubmit={(e) => {
                e.preventDefault();
                saveRecord<ShipmentRecord>('shipments', editingShipmentId, shipmentForm, resetShipmentForm);
              }}
              onCancel={resetShipmentForm}
              isEditing={Boolean(editingShipmentId)}
              form={
                <>
                  <TextInput label="Booking Number" value={shipmentForm.booking_number || ''} onChange={(value) => setShipmentForm({ ...shipmentForm, booking_number: value })} />
                  <TextInput label="Vessel Name" value={shipmentForm.vessel_name || ''} onChange={(value) => setShipmentForm({ ...shipmentForm, vessel_name: value })} />
                  <TextInput label="Container Number" value={shipmentForm.container_number || ''} onChange={(value) => setShipmentForm({ ...shipmentForm, container_number: value })} />
                  <TextInput label="Seal Number" value={shipmentForm.seal_number || ''} onChange={(value) => setShipmentForm({ ...shipmentForm, seal_number: value })} />
                  <TextInput label="BL Number" value={shipmentForm.bl_number || ''} onChange={(value) => setShipmentForm({ ...shipmentForm, bl_number: value })} />
                  <TextInput label="ETD" type="date" value={shipmentForm.etd || ''} onChange={(value) => setShipmentForm({ ...shipmentForm, etd: value })} />
                  <TextInput label="ETA" type="date" value={shipmentForm.eta || ''} onChange={(value) => setShipmentForm({ ...shipmentForm, eta: value })} />
                  <SelectInput label="Status" value={shipmentForm.status || 'Planning'} onChange={(value) => setShipmentForm({ ...shipmentForm, status: value as ShipmentRecord['status'] })} options={['Planning', 'Booked', 'Stuffed', 'Sailed', 'Arrived', 'Delivered']} />
                  <TextArea label="Notes" value={shipmentForm.notes || ''} onChange={(value) => setShipmentForm({ ...shipmentForm, notes: value })} />
                </>
              }
            >
              <DataTable headers={['Booking', 'Vessel', 'Container', 'BL', 'ETD', 'ETA', 'Status', 'Actions']}>
                {shipments.map((shipment) => (
                  <tr key={shipment.id} className="border-b border-slate-100">
                    <td className="p-3 font-mono font-bold">{shipment.booking_number || 'N/A'}</td>
                    <td className="p-3">{shipment.vessel_name || 'N/A'}</td>
                    <td className="p-3">{shipment.container_number || 'N/A'}</td>
                    <td className="p-3">{shipment.bl_number || 'N/A'}</td>
                    <td className="p-3">{shipment.etd || 'N/A'}</td>
                    <td className="p-3">{shipment.eta || 'N/A'}</td>
                    <td className="p-3"><SmallBadge text={shipment.status} /></td>
                    <td className="p-3"><RowActions onEdit={() => { setEditingShipmentId(shipment.id); setShipmentForm(shipment); }} onDelete={() => deleteRecord('shipments', shipment.id, 'shipment')} /></td>
                  </tr>
                ))}
              </DataTable>
            </TwoColumnManager>
          )}

          {activeTab === 'documents' && (
            <TwoColumnManager
              formTitle={editingChecklistId ? 'Edit Document Checklist' : 'Add Document Checklist'}
              onSubmit={(e) => {
                e.preventDefault();
                saveRecord<DocumentChecklist>('document_checklists', editingChecklistId, checklistForm, resetChecklistForm);
              }}
              onCancel={resetChecklistForm}
              isEditing={Boolean(editingChecklistId)}
              form={
                <>
                  <CheckboxInput label="Commercial Invoice" checked={Boolean(checklistForm.commercial_invoice)} onChange={(value) => setChecklistForm({ ...checklistForm, commercial_invoice: value })} />
                  <CheckboxInput label="Packing List" checked={Boolean(checklistForm.packing_list)} onChange={(value) => setChecklistForm({ ...checklistForm, packing_list: value })} />
                  <CheckboxInput label="Certificate of Origin" checked={Boolean(checklistForm.certificate_origin)} onChange={(value) => setChecklistForm({ ...checklistForm, certificate_origin: value })} />
                  <CheckboxInput label="Phytosanitary" checked={Boolean(checklistForm.phytosanitary)} onChange={(value) => setChecklistForm({ ...checklistForm, phytosanitary: value })} />
                  <CheckboxInput label="Insurance" checked={Boolean(checklistForm.insurance)} onChange={(value) => setChecklistForm({ ...checklistForm, insurance: value })} />
                  <CheckboxInput label="Bill of Lading" checked={Boolean(checklistForm.bill_of_lading)} onChange={(value) => setChecklistForm({ ...checklistForm, bill_of_lading: value })} />
                  <TextArea label="Notes" value={checklistForm.notes || ''} onChange={(value) => setChecklistForm({ ...checklistForm, notes: value })} />
                </>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {checklists.map((item) => {
                  const done = [item.commercial_invoice, item.packing_list, item.certificate_origin, item.phytosanitary, item.insurance, item.bill_of_lading].filter(Boolean).length;
                  return (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-4 text-xs shadow-sm">
                      <div className="flex justify-between">
                        <div className="font-bold text-slate-900">Checklist {done}/6 complete</div>
                        <RowActions onEdit={() => { setEditingChecklistId(item.id); setChecklistForm(item); }} onDelete={() => deleteRecord('document_checklists', item.id, 'document checklist')} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3 text-slate-600">
                        {[
                          ['Commercial Invoice', item.commercial_invoice],
                          ['Packing List', item.packing_list],
                          ['Certificate Origin', item.certificate_origin],
                          ['Phytosanitary', item.phytosanitary],
                          ['Insurance', item.insurance],
                          ['Bill of Lading', item.bill_of_lading]
                        ].map(([label, checked]) => <span key={String(label)}>{checked ? 'Done' : 'Pending'} - {label}</span>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TwoColumnManager>
          )}

          {activeTab === 'users' && (
            <TwoColumnManager
              formTitle={editingUserId ? 'Edit User' : 'Add User'}
              onSubmit={(e) => {
                e.preventDefault();
                if (!userForm.name || !userForm.email) return alert('Please enter name and email.');
                saveRecord<AppUser>('app_users', editingUserId, userForm, resetUserForm);
              }}
              onCancel={resetUserForm}
              isEditing={Boolean(editingUserId)}
              form={
                <>
                  <TextInput label="Name *" value={userForm.name || ''} onChange={(value) => setUserForm({ ...userForm, name: value })} required />
                  <TextInput label="Email *" value={userForm.email || ''} onChange={(value) => setUserForm({ ...userForm, email: value })} required />
                  <SelectInput label="Role" value={userForm.role || 'Sales'} onChange={(value) => setUserForm({ ...userForm, role: value as AppUser['role'] })} options={['Admin', 'Sales', 'Accounts', 'Operations']} />
                  <CheckboxInput label="Active User" checked={Boolean(userForm.active)} onChange={(value) => setUserForm({ ...userForm, active: value })} />
                </>
              }
            >
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 mb-4 flex gap-2">
                <Lock className="h-4 w-4 mt-0.5" />
                <span>This manages app users and roles for workflow tracking. App access is protected by Firebase Authentication when Firebase is configured.</span>
              </div>
              <DataTable headers={['Name', 'Email', 'Role', 'Status', 'Actions']}>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100">
                    <td className="p-3 font-bold">{user.name}</td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3">{user.role}</td>
                    <td className="p-3">{user.active ? 'Active' : 'Inactive'}</td>
                    <td className="p-3"><RowActions onEdit={() => { setEditingUserId(user.id); setUserForm(user); }} onDelete={() => deleteRecord('app_users', user.id, 'user')} /></td>
                  </tr>
                ))}
              </DataTable>
            </TwoColumnManager>
          )}
        </div>
      </div>
    </div>
  );
};

const Stat = ({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'sky' | 'indigo' | 'slate' | 'teal' }) => {
  const toneClass = {
    sky: 'bg-sky-50 text-sky-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    slate: 'bg-slate-100 text-slate-600',
    teal: 'bg-teal-50 text-teal-600'
  }[tone];

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`p-2.5 rounded-lg ${toneClass}`}>{icon}</div>
      <div>
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-xl font-extrabold text-slate-800">{value}</span>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: Quote['status'] }) => {
  const tone =
    status === 'Approved' || status === 'Closed'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'Sent' || status === 'Invoice Raised' || status === 'Shipped'
        ? 'bg-sky-50 text-sky-700'
        : status === 'Lost' || status === 'Declined'
          ? 'bg-red-50 text-red-700'
          : status === 'Negotiation'
            ? 'bg-amber-50 text-amber-700'
            : 'bg-slate-100 text-slate-700';

  return <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${tone}`}>{status}</span>;
};

const EmptyState = ({ text }: { text: string }) => (
  <div className="text-center py-10 text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">{text}</div>
);

const RowActions = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => (
  <div className="flex items-center justify-center gap-2">
    <button type="button" onClick={onEdit} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition" title="Edit">
      <Edit2 className="h-4 w-4" />
    </button>
    <button type="button" onClick={onDelete} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition" title="Delete">
      <Trash2 className="h-4 w-4" />
    </button>
  </div>
);

const TwoColumnManager = ({
  formTitle,
  form,
  children,
  isEditing,
  onSubmit,
  onCancel
}: {
  formTitle: string;
  form: React.ReactNode;
  children: React.ReactNode;
  isEditing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 h-fit space-y-3">
      <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b pb-1">{formTitle}</h3>
      <form onSubmit={onSubmit} className="space-y-3 text-xs">
        {form}
        <div className="flex gap-2">
          <button type="submit" className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded shadow transition flex items-center justify-center gap-1">
            <Plus className="h-4 w-4" />
            {isEditing ? 'Update' : 'Save'}
          </button>
          {isEditing && (
            <button type="button" onClick={onCancel} className="px-3 py-2 bg-white border border-slate-300 text-slate-600 font-semibold rounded transition">
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
    <div className="lg:col-span-2 space-y-3">{children}</div>
  </div>
);

const TextInput = ({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) => (
  <label className="block">
    <span className="block text-slate-500 mb-0.5">{label}</span>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none" />
  </label>
);

const NumberInput = ({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) => (
  <label className="block">
    <span className="block text-slate-500 mb-0.5">{label}</span>
    <input type="number" step="0.01" value={value || ''} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none" />
  </label>
);

const SelectInput = ({
  label,
  value,
  onChange,
  options,
  labels = {}
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) => (
  <label className="block">
    <span className="block text-slate-500 mb-0.5">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none">
      {options.map((option) => <option key={option} value={option}>{labels[option] || option || 'None'}</option>)}
    </select>
  </label>
);

const CheckboxInput = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) => (
  <label className="flex items-center gap-2 text-slate-600">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
    <span>{label}</span>
  </label>
);

const TextArea = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <label className="block">
    <span className="block text-slate-500 mb-0.5">{label}</span>
    <textarea value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded h-16 resize-none focus:ring-1 focus:ring-sky-500 focus:outline-none" />
  </label>
);

const DataTable = ({ headers, children }: { headers: string[]; children: React.ReactNode }) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200">
    <table className="w-full text-left border-collapse text-xs">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
          {headers.map((header) => <th key={header} className="p-3">{header}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>
);

const SimplePanel = ({ title, rows }: { title: string; rows: [string, string][] }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
    <h3 className="font-bold text-slate-900 text-sm mb-3">{title}</h3>
    <div className="space-y-2 text-xs">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-slate-500">{label}</span>
          <span className="font-bold text-slate-900">{value}</span>
        </div>
      ))}
    </div>
  </div>
);

const SmallBadge = ({ text }: { text: string }) => (
  <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">{text}</span>
);

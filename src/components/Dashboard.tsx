import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import readXlsxFile from 'read-excel-file/browser';
import { dbType, isFirebase, isMock, mockDB, supabase } from '../lib/supabaseClient';
import {
  AppUser,
  Client,
  DocumentChecklist,
  FreightPreset,
  FreightRateHistory,
  InvoiceRecord,
  Lead,
  MessageTemplate,
  Product,
  Quote,
  ShipmentRecord,
  TaskRecord,
  TimelineActivity,
  Vendor
} from '../lib/types';
import { InvoicePDF } from './InvoicePDF';
import { QuoteForm } from './QuoteForm';
import {
  Anchor,
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  Check,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  Copy,
  Database,
  Download,
  Edit2,
  FileCheck2,
  Filter,
  History,
  LayoutDashboard,
  KanbanSquare,
  Lock,
  Mail,
  Menu,
  MessageSquare,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Ship,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  X
} from 'lucide-react';

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);

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
const buyerListPageSize = 48;

type TabKey = 'overview' | 'crm' | 'buyers360' | 'phoneReachout' | 'quotes' | 'communications' | 'templates' | 'tasks' | 'accounts' | 'shipments' | 'documents' | 'products' | 'vendors' | 'freight' | 'rates' | 'analytics' | 'users';
type QuoteSortKey = 'created_desc' | 'created_asc' | 'value_desc' | 'value_asc' | 'buyer_asc' | 'status_asc';
type ImportSummary = { buyers: number; leads: number; activities: number; tasks: number; skipped: number; message: string };

const blankClient: Partial<Client> = {
  company_name: '',
  address: '',
  contact_name: '',
  contact_email: '',
  destination_port: '',
  phone: '',
  products_dealing: []
};

const blankProduct: Partial<Product> = {
  sku: '',
  description: '',
  unit_price: 0,
  cost_price: 0,
  weight: 0,
  dimensions: ''
};

const blankVendor: Partial<Vendor> = {
  company_name: '',
  contact_name: '',
  contact_email: '',
  phone: '',
  city: '',
  country: 'India',
  product_categories: '',
  payment_terms: '',
  rating: 3,
  status: 'Active',
  notes: ''
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

const blankTask: Partial<TaskRecord> = {
  title: '',
  status: 'Open',
  priority: 'Medium',
  due_date: new Date().toISOString().slice(0, 10),
  owner: 'Sana Zeba',
  notes: ''
};

const blankTemplate: Partial<MessageTemplate> = {
  name: '',
  channel: 'Email',
  category: 'Quote Follow-up',
  subject: '',
  body: '',
  active: true
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

const countryTimezoneOffsets: Record<string, number> = {
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

const countryTimeZones: Record<string, string> = {
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

const commonCountryNames = Object.keys(countryTimezoneOffsets).sort((a, b) => b.length - a.length);
const titleCaseCountry = (country: string) => country.replace(/\b\w/g, (letter) => letter.toUpperCase()).replace(/\bUae\b/, 'UAE').replace(/\bUsa\b/, 'USA').replace(/\bUk\b/, 'UK');
const normalizeCountryKey = (country = '') => country.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
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
    hourCycle: 'h23'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute));
  return (asUtc - date.getTime()) / 60000;
};
const zonedLocalTimeToUtc = (timeZone: string, localHour: number) => {
  const now = new Date();
  const guess = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), localHour, 0));
  const offset = getTimeZoneOffsetMinutes(timeZone, guess);
  return new Date(guess.getTime() - offset * 60000);
};
const bestSendWindowCache = new Map<string, string>();
const bestSendWindowIST = (country = '') => {
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
      const start = 10 - offset + 5.5;
      const end = 12 - offset + 5.5;
      windowStr = `Best send: ${formatIstHour(start)} - ${formatIstHour(end)} IST`;
    }
  }
  bestSendWindowCache.set(key, windowStr);
  return windowStr;
};

export const Dashboard: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [freightPresets, setFreightPresets] = useState<FreightPreset[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [freightRates, setFreightRates] = useState<FreightRateHistory[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [checklists, setChecklists] = useState<DocumentChecklist[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [editingQuoteId, setEditingQuoteId] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [reachoutSearchQuery, setReachoutSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [importingBuyers, setImportingBuyers] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<'All' | Quote['status']>('All');
  const [quoteCurrencyFilter, setQuoteCurrencyFilter] = useState<'All' | 'INR' | 'USD'>('All');
  const [quoteSort, setQuoteSort] = useState<QuoteSortKey>('created_desc');

  const [clientForm, setClientForm] = useState<Partial<Client>>(blankClient);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingPhoneBuyerId, setEditingPhoneBuyerId] = useState<string | null>(null);
  const [editingPhoneValue, setEditingPhoneValue] = useState('');

  const [productForm, setProductForm] = useState<Partial<Product>>(blankProduct);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [vendorForm, setVendorForm] = useState<Partial<Vendor>>(blankVendor);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);

  const [presetForm, setPresetForm] = useState<Partial<FreightPreset>>(blankPreset);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);

  const [leadForm, setLeadForm] = useState<Partial<Lead>>(blankLead);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [activityForm, setActivityForm] = useState<Partial<TimelineActivity>>(blankActivity);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<Partial<TaskRecord>>(blankTask);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<Partial<MessageTemplate>>(blankTemplate);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedCrmTemplateId, setSelectedCrmTemplateId] = useState('');
  const [selectedCommunicationClientId, setSelectedCommunicationClientId] = useState('');
  const [selectedTemplateClientId, setSelectedTemplateClientId] = useState('');
  const [selectedTemplateProductId, setSelectedTemplateProductId] = useState('');
  const [buyerCountryFilter, setBuyerCountryFilter] = useState('All');
  const [buyerSortKey, setBuyerSortKey] = useState<'name' | 'phone_asc' | 'phone_desc'>('name');
  const [buyerVisibleCount, setBuyerVisibleCount] = useState(buyerListPageSize);
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

  useEffect(() => {
    setBuyerVisibleCount(buyerListPageSize);
  }, [buyerCountryFilter, buyerSortKey]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: qData },
        { data: cData },
        { data: vData },
        { data: pData },
        { data: fData },
        { data: lData },
        { data: aData },
        { data: rData },
        { data: iData },
        { data: sData },
        { data: dData },
        { data: tData },
        { data: mtData },
        { data: uData }
      ] = await Promise.all([
        supabase.from('quotes').select('*, client:clients(*), items:quote_items(*)').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('company_name'),
        supabase.from('vendors').select('*').order('company_name'),
        supabase.from('products').select('*').order('sku'),
        supabase.from('freight_presets').select('*').order('name'),
        supabase.from('leads').select('*').order('updated_at', { ascending: false }),
        supabase.from('activities').select('*').order('activity_date', { ascending: false }),
        supabase.from('freight_rate_history').select('*').order('effective_date', { ascending: false }),
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('shipments').select('*').order('updated_at', { ascending: false }),
        supabase.from('document_checklists').select('*').order('updated_at', { ascending: false }),
        supabase.from('tasks').select('*').order('due_date', { ascending: true }),
        supabase.from('message_templates').select('*').order('name'),
        supabase.from('app_users').select('*').order('name')
      ]);

      setQuotes(qData || []);
      setClients(cData || []);
      setVendors(vData || []);
      setProducts(pData || []);
      setFreightPresets(fData || []);
      setLeads(lData || []);
      setActivities(aData || []);
      setFreightRates(rData || []);
      setInvoices(iData || []);
      setShipments(sData || []);
      setChecklists(dData || []);
      setTasks(tData || []);
      setTemplates(mtData || []);
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
    const overdueTasks = tasks.filter((task) => task.status !== 'Done' && task.due_date && new Date(task.due_date).getTime() < new Date().setHours(0, 0, 0, 0)).length;
    const hotLeads = leads.filter((lead) => lead.priority === 'High' && !['Won', 'Lost'].includes(lead.stage)).length;
    const quoteFollowUps = quotes.filter((quote) => ['Sent', 'Negotiation'].includes(quote.status)).length;

    return { totalQuoted, wonValue, pendingInvoiceValue, activeShipments, docCompletion, averageFreight, overdueTasks, hotLeads, quoteFollowUps };
  }, [quotes, invoices, shipments, checklists, freightRates, tasks, leads]);

  const quoteClient = (quote: Quote) => quote.client || clients.find((client) => client.id === quote.client_id);
  
  const clientCountries = useMemo(() => {
    const map: Record<string, string> = {};
    clients.forEach((client) => {
      const linkedLead = leads.find((lead) => lead.client_id === client.id || lead.company_name.toLowerCase() === client.company_name.toLowerCase());
      if (linkedLead?.country) {
        map[client.id] = titleCaseCountry(linkedLead.country.trim());
        return;
      }
      const searchable = `${client.address || ''} ${client.destination_port || ''}`.toLowerCase();
      const matchedCountry = commonCountryNames.find((country) => searchable.includes(country));
      map[client.id] = matchedCountry ? titleCaseCountry(matchedCountry) : 'Uncategorized';
    });
    return map;
  }, [clients, leads]);

  const clientPhones = useMemo(() => {
    const map: Record<string, string> = {};
    clients.forEach((client) => {
      if (client.phone) {
        map[client.id] = client.phone;
        return;
      }
      const linkedLead = leads.find((lead) => lead.client_id === client.id || lead.company_name.toLowerCase() === client.company_name.toLowerCase());
      map[client.id] = linkedLead?.phone || '';
    });
    return map;
  }, [clients, leads]);

  const buyerCountry = (client: Client) => clientCountries[client.id] || 'Uncategorized';
  
  const buyerCountries = useMemo(() => {
    return Array.from(new Set(clients.map((client) => clientCountries[client.id] || 'Uncategorized').filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [clients, clientCountries]);

  const filteredBuyers = useMemo(() => {
    const list = buyerCountryFilter === 'All' 
      ? clients 
      : clients.filter((client) => (clientCountries[client.id] || 'Uncategorized') === buyerCountryFilter);
    
    if (buyerSortKey === 'phone_asc') {
      return [...list].sort((a, b) => {
        const phoneA = a.phone || clientPhones[a.id] || '';
        const phoneB = b.phone || clientPhones[b.id] || '';
        if (!phoneA) return 1;
        if (!phoneB) return -1;
        return phoneA.localeCompare(phoneB);
      });
    } else if (buyerSortKey === 'phone_desc') {
      return [...list].sort((a, b) => {
        const phoneA = a.phone || clientPhones[a.id] || '';
        const phoneB = b.phone || clientPhones[b.id] || '';
        if (!phoneA) return 1;
        if (!phoneB) return -1;
        return phoneB.localeCompare(phoneA);
      });
    } else {
      return [...list].sort((a, b) => a.company_name.localeCompare(b.company_name));
    }
  }, [clients, clientCountries, buyerCountryFilter, buyerSortKey, clientPhones]);

  const reachoutBuyers = useMemo(() => {
    return clients.filter((client) => {
      const phone = client.phone || clientPhones[client.id] || '';
      return phone.trim().length > 0;
    });
  }, [clients, clientPhones]);

  const clientMetrics = useMemo(() => {
    const map: Record<string, {
      quotesCount: number;
      receivableValue: number;
      shipmentsCount: number;
      openTasksCount: number;
      lastActivityTitle: string;
    }> = {};

    clients.forEach((client) => {
      const cQuotes = quotes.filter((quote) => quote.client_id === client.id);
      const cInvoices = invoices.filter((invoice) => invoice.client_id === client.id && invoice.payment_status !== 'Paid');
      const cShipments = shipments.filter((shipment) => shipment.client_id === client.id);
      const cTasks = tasks.filter((task) => task.client_id === client.id && task.status !== 'Done');
      const cLastActivity = activities.find((activity) => activity.client_id === client.id);

      const receivableValue = cInvoices.reduce((sum, invoice) => sum + Number(invoice.balance_amount || invoice.amount || 0), 0);

      map[client.id] = {
        quotesCount: cQuotes.length,
        receivableValue,
        shipmentsCount: cShipments.length,
        openTasksCount: cTasks.length,
        lastActivityTitle: cLastActivity?.title || 'No activity logged'
      };
    });

    return map;
  }, [clients, quotes, invoices, shipments, tasks, activities]);

  const buyerSummaryStats = useMemo(() => {
    const shown = filteredBuyers.length;
    const countriesCount = buyerCountries.filter((country) => country !== 'Uncategorized').length;
    const uncategorized = clients.filter((client) => clientCountries[client.id] === 'Uncategorized').length;
    const crmLinked = clients.filter((client) => leads.some((lead) => lead.client_id === client.id)).length;
    return { shown, countriesCount, uncategorized, crmLinked };
  }, [filteredBuyers, buyerCountries, clients, clientCountries, leads]);

  const visibleBuyers = useMemo(() => filteredBuyers.slice(0, buyerVisibleCount), [filteredBuyers, buyerVisibleCount]);

  const notifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 3);

    return [
      ...tasks
        .filter((task) => task.status !== 'Done' && task.due_date && new Date(task.due_date) < today)
        .map((task) => ({ id: `task-${task.id}`, title: task.title, meta: `Overdue task | ${task.due_date}`, tab: 'tasks' as TabKey, tone: 'red' })),
      ...leads
        .filter((lead) => lead.next_follow_up && new Date(lead.next_follow_up) <= soon && !['Won', 'Lost'].includes(lead.stage))
        .map((lead) => ({ id: `lead-${lead.id}`, title: `Follow up ${lead.company_name}`, meta: `${lead.stage} | ${lead.next_follow_up}`, tab: 'crm' as TabKey, tone: 'amber' })),
      ...invoices
        .filter((invoice) => invoice.payment_status !== 'Paid' && invoice.due_date && new Date(invoice.due_date) <= soon)
        .map((invoice) => ({ id: `invoice-${invoice.id}`, title: `Payment due ${invoice.invoice_number}`, meta: `${invoice.payment_status} | ${invoice.due_date}`, tab: 'accounts' as TabKey, tone: 'sky' })),
      ...shipments
        .filter((shipment) => shipment.status !== 'Delivered' && shipment.eta && new Date(shipment.eta) <= soon)
        .map((shipment) => ({ id: `shipment-${shipment.id}`, title: `Shipment ETA ${shipment.booking_number || shipment.vessel_name || 'pending'}`, meta: `${shipment.status} | ${shipment.eta}`, tab: 'shipments' as TabKey, tone: 'teal' }))
    ];
  }, [tasks, leads, invoices, shipments]);

  const globalResults = useMemo<{ key: string; label: string; meta: string; tab: TabKey; buyerId?: string }[]>(() => {
    const search = globalSearch.trim().toLowerCase();
    if (!search) return [];

    return [
      ...clients.map((item) => ({ key: `buyer-${item.id}`, label: item.company_name, meta: `${buyerCountry(item)} | ${item.contact_email || item.destination_port || 'Buyer'}`, tab: 'buyers360' as TabKey, buyerId: item.id })),
      ...leads.map((item) => ({ key: `lead-${item.id}`, label: item.company_name, meta: `${item.country || 'Country not set'} | ${item.stage} | ${item.product_interest || 'Lead'}`, tab: 'crm' as TabKey })),
      ...quotes.map((item) => ({ key: `quote-${item.id}`, label: item.quote_number, meta: `${quoteClient(item)?.company_name || 'Unassigned'} | ${item.status}`, tab: 'quotes' as TabKey })),
      ...invoices.map((item) => ({ key: `invoice-${item.id}`, label: item.invoice_number, meta: `${item.payment_status} | ${formatQuoteCurrency(Number(item.balance_amount || item.amount || 0), item.currency || 'INR')}`, tab: 'accounts' as TabKey })),
      ...shipments.map((item) => ({ key: `shipment-${item.id}`, label: item.booking_number || item.vessel_name || 'Shipment', meta: `${item.status} | ETA ${item.eta || 'TBA'}`, tab: 'shipments' as TabKey })),
      ...vendors.map((item) => ({ key: `vendor-${item.id}`, label: item.company_name, meta: `${item.status} | ${item.product_categories || 'Vendor'}`, tab: 'vendors' as TabKey }))
    ].filter((item) => `${item.label} ${item.meta}`.toLowerCase().includes(search)).slice(0, 8);
  }, [globalSearch, clients, leads, quotes, invoices, shipments, vendors]);

  const communicationClient = clients.find((client) => client.id === selectedCommunicationClientId) || clients[0];
  const communicationQuote = quotes.find((quote) => quote.client_id === communicationClient?.id) || quotes[0];
  const communicationShipment = shipments.find((shipment) => shipment.client_id === communicationClient?.id || shipment.quote_id === communicationQuote?.id);
  const templatePreviewClient = clients.find((client) => client.id === selectedTemplateClientId) || communicationClient;
  const templatePreviewProduct = products.find((product) => product.id === selectedTemplateProductId);
  const productCatalogue = products.map((product) => product.sku).filter(Boolean).slice(0, 6).join(', ') || 'spices, agro commodities, and export-ready food products';
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || templates[0];
  const selectedCrmTemplate = templates.find((template) => template.id === selectedCrmTemplateId);
  const resolveCrmEmailTemplate = (mode: 'First Reach' | 'Follow-up') => {
    const targetCategory = mode === 'First Reach' ? 'Introduction' : 'Quote Follow-up';
    const explicitTemplate = selectedCrmTemplate?.channel === 'Email' && selectedCrmTemplate.category === targetCategory
      ? selectedCrmTemplate
      : null;

    return explicitTemplate ||
      templates.find((item) => item.channel === 'Email' && item.category === targetCategory && item.active !== false) ||
      templates.find((item) => item.category === targetCategory && item.active !== false);
  };

  const replaceTemplateVars = (text = '', options: { client?: Client; product?: Product | null } = {}) => {
    const buyer = options.client || communicationClient;
    const quote = quotes.find((item) => item.client_id === buyer?.id) || communicationQuote;
    const selectedProduct = options.product === undefined ? templatePreviewProduct : options.product;
    const productName = selectedProduct?.sku || quote?.items?.[0]?.sku || 'our complete export product range';
    const productDescription = selectedProduct?.description?.split('\n')[0] || 'quality export-ready spices, agro commodities, and customized sourcing support';
    return text
      .replaceAll('{{buyer_name}}', buyer?.contact_name || buyer?.company_name || 'Buyer')
      .replaceAll('{{company_name}}', buyer?.company_name || 'Buyer Company')
      .replaceAll('{{client_name}}', buyer?.contact_name || buyer?.company_name || 'Buyer')
      .replaceAll('{{quote_number}}', quote?.quote_number || 'SG-CIF-XXXX-0000')
      .replaceAll('{{product_name}}', productName)
      .replaceAll('{{product_description}}', productDescription)
      .replaceAll('{{product_catalogue}}', productCatalogue)
      .replaceAll('{{total_value}}', quote ? formatQuoteCurrency(quoteValue(quote), quote.currency || 'INR') : 'quoted value')
      .replaceAll('{{destination_port}}', buyer?.destination_port || quote?.client?.destination_port || 'destination port')
      .replaceAll('{{shipment_status}}', communicationShipment?.status || 'Planning')
      .replaceAll('{{etd}}', communicationShipment?.etd || 'TBA')
      .replaceAll('{{eta}}', communicationShipment?.eta || 'TBA');
  };

  const replaceLeadTemplateVars = (text = '', lead: Lead) => {
    const client = clients.find((item) => item.id === lead.client_id);
    const quote = quotes.find((item) => item.client_id === client?.id);
    const shipment = shipments.find((item) => item.client_id === client?.id || item.quote_id === quote?.id);
    return text
      .replaceAll('{{buyer_name}}', lead.contact_name || client?.contact_name || lead.company_name)
      .replaceAll('{{company_name}}', lead.company_name || client?.company_name || 'Buyer Company')
      .replaceAll('{{quote_number}}', quote?.quote_number || 'your quotation')
      .replaceAll('{{product_name}}', lead.product_interest || quote?.items?.[0]?.sku || 'our export product')
      .replaceAll('{{total_value}}', quote ? formatQuoteCurrency(quoteValue(quote), quote.currency || 'INR') : formatQuoteCurrency(Number(lead.estimated_value || 0), 'INR'))
      .replaceAll('{{destination_port}}', client?.destination_port || lead.country || 'your destination port')
      .replaceAll('{{shipment_status}}', shipment?.status || 'Planning')
      .replaceAll('{{etd}}', shipment?.etd || 'TBA')
      .replaceAll('{{eta}}', shipment?.eta || 'TBA');
  };

  const handleLeadEmail = async (lead: Lead, mode: 'First Reach' | 'Follow-up') => {
    if (!lead.contact_email) {
      alert('Please add a lead email address before sending.');
      return;
    }

    const template = resolveCrmEmailTemplate(mode);
    const defaultSubject = mode === 'First Reach'
      ? 'Export sourcing support from Sheshaan Global'
      : 'Following up with {{company_name}}';
    const defaultBody = mode === 'First Reach'
      ? 'Hi {{buyer_name}},\n\nI am reaching out from Sheshaan Global, India.\n\nWe support international buyers with export-ready products including {{product_catalogue}}. If you have a specific product requirement, we can share specifications, packing options, CIF/FOB pricing, and shipment timelines for {{destination_port}}.\n\nRegards,\nSheshaan Global'
      : 'Hi {{buyer_name}},\n\nJust following up on our previous discussion regarding {{product_name}}.\n\nIf this product is still relevant, we can share an updated quotation. If your requirement has changed, we can also propose options from our wider range: {{product_catalogue}}.\n\nRegards,\nSheshaan Global';
    const subject = replaceLeadTemplateVars(template?.subject || defaultSubject, lead);
    const body = replaceLeadTemplateVars(template?.body || defaultBody, lead);
    const today = new Date().toISOString().slice(0, 10);
    const nextFollowUpDate = new Date();
    nextFollowUpDate.setDate(nextFollowUpDate.getDate() + (mode === 'First Reach' ? 3 : 4));
    const nextFollowUp = nextFollowUpDate.toISOString().slice(0, 10);
    const fields: Record<string, string> =
      mode === 'First Reach'
        ? {
            'Email Status': 'Email Sent',
            'First Email Sent On': leadNoteValue(lead, 'First Email Sent On') || today,
            'Last Email Sent On': today,
            'Next Action': 'Waiting for buyer response'
          }
        : {
            'Email Status': 'Follow-up Sent',
            'Last Email Sent On': today,
            'Next Action': 'Waiting for buyer response'
          };

    const { error: leadUpdateError } = await supabase.from('leads').update({
      notes: setLeadNoteValues(lead, fields),
      stage: ['Won', 'Lost'].includes(lead.stage) ? lead.stage : 'Contacted',
      next_follow_up: nextFollowUp
    }).eq('id', lead.id);
    if (leadUpdateError) {
      alert(leadUpdateError.message || 'Could not update lead outreach status.');
      return;
    }

    await saveRecord<TimelineActivity>('activities', null, {
      client_id: lead.client_id,
      lead_id: lead.id,
      type: 'Email',
      title: `${mode} email prepared for ${lead.company_name}`,
      details: `Template: ${template?.name || 'Default message'}\nTo: ${lead.contact_email}`,
      activity_date: today,
      owner: lead.owner || 'Sana Zeba'
    }, resetActivityForm);

    window.location.href = `mailto:${encodeURIComponent(lead.contact_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleLeadWhatsApp = async (lead: Lead) => {
    if (!lead.phone) {
      alert('Please add a phone number before opening WhatsApp.');
      return;
    }

    const template = templates.find((item) => item.channel === 'WhatsApp') || selectedCrmTemplate;
    const body = replaceLeadTemplateVars(template?.body || 'Hi {{buyer_name}}, this is Sheshaan Global following up regarding {{product_name}}.', lead);
    const cleanPhone = lead.phone.replace(/[^\d]/g, '');
    const today = new Date().toISOString().slice(0, 10);
    const nextFollowUpDate = new Date();
    nextFollowUpDate.setDate(nextFollowUpDate.getDate() + 3);
    const { error: leadUpdateError } = await supabase.from('leads').update({
      notes: setLeadNoteValues(lead, {
        'Email Status': 'WhatsApp Sent',
        'Last Email Sent On': today,
        'Next Action': 'Waiting for buyer response'
      }),
      stage: ['Won', 'Lost'].includes(lead.stage) ? lead.stage : 'Contacted',
      next_follow_up: nextFollowUpDate.toISOString().slice(0, 10)
    }).eq('id', lead.id);
    if (leadUpdateError) {
      alert(leadUpdateError.message || 'Could not update WhatsApp outreach status.');
      return;
    }

    await saveRecord<TimelineActivity>('activities', null, {
      client_id: lead.client_id,
      lead_id: lead.id,
      type: 'Note',
      title: `WhatsApp message opened for ${lead.company_name}`,
      details: `Template: ${template?.name || 'Default WhatsApp message'}\nPhone: ${lead.phone}`,
      activity_date: today,
      owner: lead.owner || 'Sana Zeba'
    }, resetActivityForm);

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');
  };

  const handleBuyerWhatsAppReachout = async (client: Client, phone: string) => {
    if (!phone) {
      alert('Please add a phone number before opening WhatsApp.');
      return;
    }

    const template = templates.find((item) => item.channel === 'WhatsApp' && item.category === 'Introduction')
      || templates.find((item) => item.channel === 'WhatsApp')
      || { name: 'Default Intro', body: 'Hello {{buyer_name}}, this is Sheshaan Global from India. We can support {{company_name}} with export-ready products. Please let us know your requirement and destination port.' };

    const linkedLead = leads.find((l) => l.client_id === client.id || l.company_name.toLowerCase() === client.company_name.toLowerCase());
    const leadObj: Lead = linkedLead || {
      id: '',
      company_name: client.company_name,
      contact_name: client.contact_name,
      contact_email: client.contact_email,
      phone: phone,
      stage: 'Contacted',
      client_id: client.id
    };

    const body = replaceLeadTemplateVars(template.body || '', leadObj);
    const cleanPhone = phone.replace(/[^\d]/g, '');
    const today = new Date().toISOString().slice(0, 10);

    if (linkedLead?.id) {
      const nextFollowUpDate = new Date();
      nextFollowUpDate.setDate(nextFollowUpDate.getDate() + 3);
      await supabase.from('leads').update({
        notes: setLeadNoteValues(linkedLead, {
          'Email Status': 'WhatsApp Intro Sent',
          'Last Email Sent On': today,
          'Next Action': 'Waiting for buyer response'
        }),
        stage: ['Won', 'Lost'].includes(linkedLead.stage) ? linkedLead.stage : 'Contacted',
        next_follow_up: nextFollowUpDate.toISOString().slice(0, 10)
      }).eq('id', linkedLead.id);
    }

    await saveRecord<TimelineActivity>('activities', null, {
      client_id: client.id,
      lead_id: linkedLead?.id || undefined,
      type: 'Note',
      title: `WhatsApp Intro opened for ${client.company_name}`,
      details: `Template: ${template.name || 'WhatsApp Introduction'}\nPhone: ${phone}`,
      activity_date: today,
      owner: 'Sana Zeba'
    }, resetActivityForm);

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');
  };

  const runFollowUpAutomation = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const automatedTasks: Partial<TaskRecord>[] = [
      ...leads
        .filter((lead) => lead.next_follow_up && lead.next_follow_up <= today && !['Won', 'Lost'].includes(lead.stage))
        .map((lead) => ({
          title: `Follow up with ${lead.company_name}`,
          status: 'Open' as const,
          priority: lead.priority || 'Medium',
          due_date: today,
          owner: lead.owner || 'Sana Zeba',
          client_id: lead.client_id,
          lead_id: lead.id,
          notes: `Auto-created from CRM follow-up date. Stage: ${lead.stage}`
        })),
      ...quotes
        .filter((quote) => ['Sent', 'Negotiation'].includes(quote.status))
        .map((quote) => ({
          title: `Quote follow-up: ${quote.quote_number}`,
          status: 'Open' as const,
          priority: 'High' as const,
          due_date: today,
          owner: 'Sana Zeba',
          client_id: quote.client_id,
          quote_id: quote.id,
          notes: 'Auto-created because quote is awaiting buyer response.'
        })),
      ...invoices
        .filter((invoice) => invoice.payment_status !== 'Paid')
        .map((invoice) => ({
          title: `Payment follow-up: ${invoice.invoice_number}`,
          status: 'Open' as const,
          priority: invoice.payment_status === 'Overdue' ? 'High' as const : 'Medium' as const,
          due_date: invoice.due_date || today,
          owner: 'Sana Zeba',
          client_id: invoice.client_id,
          invoice_id: invoice.id,
          notes: `Auto-created from ${invoice.payment_status} invoice.`
        })),
      ...shipments
        .filter((shipment) => ['Planning', 'Booked', 'Stuffed', 'Sailed'].includes(shipment.status))
        .map((shipment) => ({
          title: `Shipment update: ${shipment.booking_number || shipment.vessel_name || shipment.id}`,
          status: 'Open' as const,
          priority: 'Medium' as const,
          due_date: shipment.eta || today,
          owner: 'Operations',
          client_id: shipment.client_id,
          shipment_id: shipment.id,
          notes: `Auto-created from active shipment status: ${shipment.status}.`
        }))
    ].filter((candidate) => !tasks.some((task) => task.title === candidate.title && task.status !== 'Done'));

    if (!automatedTasks.length) {
      alert('No new follow-up tasks needed right now.');
      return;
    }

    const { error } = await supabase.from('tasks').insert(automatedTasks);
    if (error) {
      alert(error.message || 'Failed to create automated follow-up tasks.');
      return;
    }
    await fetchData();
    alert(`${automatedTasks.length} follow-up task${automatedTasks.length === 1 ? '' : 's'} created.`);
  };

  const editTemplateFromCrm = () => {
    if (selectedCrmTemplate) {
      setEditingTemplateId(selectedCrmTemplate.id);
      setTemplateForm(selectedCrmTemplate);
    } else {
      setEditingTemplateId(null);
      setTemplateForm(blankTemplate);
    }
    setActiveTab('templates');
  };

  const applyTemplateStarter = (type: 'product_pitch' | 'catalogue_pitch' | 'follow_up' | 'whatsapp_intro') => {
    const starters: Record<typeof type, Partial<MessageTemplate>> = {
      product_pitch: {
        name: 'Personalized Product Pitch',
        channel: 'Email',
        category: 'Introduction',
        subject: 'Export supply proposal for {{product_name}}',
        body: 'Hi {{buyer_name}},\n\nI hope you are doing well. I am reaching out from Sheshaan Global regarding {{product_name}}.\n\nWe can support your requirement with {{product_description}}, export documentation, CIF/FOB pricing, and reliable shipment coordination to {{destination_port}}.\n\nIf you are currently sourcing this product, I would be happy to share specifications, packing options, pricing, and shipment timelines.\n\nRegards,\nSheshaan Global'
      },
      catalogue_pitch: {
        name: 'General Buyer Introduction',
        channel: 'Email',
        category: 'Introduction',
        subject: 'Export sourcing support from Sheshaan Global',
        body: 'Hi {{buyer_name}},\n\nI hope you are doing well. I am reaching out from Sheshaan Global, India.\n\nWe support international buyers with export-ready products including {{product_catalogue}}. If you do not have a specific product requirement right now, we can still share our product range, current availability, packing options, and CIF/FOB quotations based on your destination port.\n\nPlease let us know the products or categories you are exploring, and we will prepare a suitable offer for {{company_name}}.\n\nRegards,\nSheshaan Global'
      },
      follow_up: {
        name: 'Warm Follow-up',
        channel: 'Email',
        category: 'Quote Follow-up',
        subject: 'Following up with {{company_name}}',
        body: 'Hi {{buyer_name}},\n\nJust following up on our previous discussion regarding {{product_name}}.\n\nIf this product is still relevant, we can share an updated quotation. If your requirement has changed, we can also propose options from our wider range: {{product_catalogue}}.\n\nWould you like us to prepare a fresh offer for {{destination_port}}?\n\nRegards,\nSheshaan Global'
      },
      whatsapp_intro: {
        name: 'WhatsApp Buyer Intro',
        channel: 'WhatsApp',
        category: 'Introduction',
        subject: '',
        body: 'Hello {{buyer_name}}, this is Sheshaan Global from India. We can support {{company_name}} with {{product_name}} or our wider export range: {{product_catalogue}}. Please let us know your requirement and destination port.'
      }
    };

    setTemplateForm({ ...blankTemplate, ...starters[type], active: true });
    setEditingTemplateId(null);
  };

  const createInvoiceFromQuote = async (quote: Quote) => {
    const exists = invoices.some((invoice) => invoice.quote_id === quote.id);
    if (exists && !confirm('An invoice already exists for this quote. Create another one?')) return;
    const amount = quoteValue(quote);
    const year = new Date().getFullYear();
    await saveRecord<InvoiceRecord>('invoices', null, {
      quote_id: quote.id,
      client_id: quote.client_id,
      invoice_number: `PI-SG-${year}-${String(invoices.length + 1).padStart(4, '0')}`,
      invoice_type: 'Proforma',
      amount,
      currency: quote.currency || 'INR',
      payment_status: 'Pending',
      advance_amount: amount / 2,
      balance_amount: amount / 2,
      due_date: new Date().toISOString().slice(0, 10),
      notes: `Auto-created from ${quote.quote_number}`
    }, resetInvoiceForm);
  };

  const createShipmentFromQuote = async (quote: Quote) => {
    const existingInvoice = invoices.find((invoice) => invoice.quote_id === quote.id);
    await saveRecord<ShipmentRecord>('shipments', null, {
      quote_id: quote.id,
      invoice_id: existingInvoice?.id,
      client_id: quote.client_id,
      booking_number: `BK-SG-${String(shipments.length + 1).padStart(4, '0')}`,
      vessel_name: 'To be nominated',
      status: 'Planning',
      notes: `Auto-created operations record from ${quote.quote_number}`
    }, resetShipmentForm);
  };

  function formatQuoteCurrency(amount: number, currency: 'USD' | 'INR') {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency
    }).format(amount);
  }

  const resetClientForm = () => {
    setEditingClientId(null);
    setClientForm(blankClient);
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setProductForm(blankProduct);
  };

  const resetVendorForm = () => {
    setEditingVendorId(null);
    setVendorForm(blankVendor);
  };

  const resetPresetForm = () => {
    setEditingPresetId(null);
    setPresetForm(blankPreset);
  };

  const resetLeadForm = () => { setEditingLeadId(null); setLeadForm(blankLead); };
  const resetActivityForm = () => { setEditingActivityId(null); setActivityForm(blankActivity); };
  const resetTaskForm = () => { setEditingTaskId(null); setTaskForm(blankTask); };
  const resetTemplateForm = () => { setEditingTemplateId(null); setTemplateForm(blankTemplate); };
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
      destination_port: clientForm.destination_port,
      phone: clientForm.phone || '',
      products_dealing: clientForm.products_dealing || []
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

  const handleSavePhone = async (clientId: string, newPhone: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    const payload = {
      company_name: client.company_name,
      address: client.address || '',
      contact_name: client.contact_name || '',
      contact_email: client.contact_email || '',
      destination_port: client.destination_port,
      phone: newPhone
    };

    const { error } = await supabase.from('clients').update(payload).eq('id', clientId);
    if (error) {
      alert(error.message || 'Failed to update phone number');
      return;
    }

    setClients((prev) => prev.map((c) => c.id === clientId ? { ...c, phone: newPhone } : c));
    setEditingPhoneBuyerId(null);
  };

  const normalizeImportDate = (value: unknown) => {
    if (!value) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    const raw = String(value).trim();
    if (!raw || raw === '-') return '';
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? raw.slice(0, 10) : parsed.toISOString().slice(0, 10);
  };

  const mapImportStage = (stage: string, response: string): Lead['stage'] => {
    const normalized = `${stage} ${response}`.toLowerCase();
    if (normalized.includes('won') || normalized.includes('response received yes')) return 'Won';
    if (normalized.includes('lost')) return 'Lost';
    if (normalized.includes('negotiation')) return 'Negotiation';
    if (normalized.includes('quote')) return 'Quoted';
    if (normalized.includes('follow') || normalized.includes('contact') || normalized.includes('sent')) return 'Contacted';
    return 'New Lead';
  };

  const handleBuyerWorkbookImport = async (file: File | null) => {
    if (!file) return;
    setImportingBuyers(true);
    setImportSummary(null);

    try {
      const parsedRows = file.name.toLowerCase().endsWith('.csv')
        ? (await file.text()).split(/\r?\n/).filter(Boolean).map((line) => line.split(',').map((cell) => cell.replace(/^"|"$/g, '').replace(/""/g, '"')))
        : await readXlsxFile(file) as unknown as unknown[][];
      const firstParsedRow = parsedRows[0] as unknown;
      const rawRows = Array.isArray(parsedRows) && parsedRows.length === 1 && firstParsedRow && typeof firstParsedRow === 'object' && 'data' in firstParsedRow
        ? (((firstParsedRow as unknown) as { data?: unknown[][] }).data || [])
        : parsedRows;
      const headers = (rawRows[0] || []).map((header: unknown) => String(header || '').trim());
      const rows = rawRows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));

      if (!headers.includes('Company Name')) {
        throw new Error(`Missing required column "Company Name". Found: ${headers.slice(0, 8).join(', ') || 'no headers'}`);
      }

      const clientPayloads: Partial<Client>[] = [];
      const leadPayloads: Partial<Lead>[] = [];
      const activityPayloads: Partial<TimelineActivity>[] = [];
      const taskPayloads: Partial<TaskRecord>[] = [];
      const seen = new Set<string>();
      let skipped = 0;

      rows.forEach((row, index) => {
        const company = String(row['Company Name'] || '').trim();
        const email = String(row.Email || '').trim();
        if (!company || (!email && seen.has(company.toLowerCase()))) {
          skipped += 1;
          return;
        }

        const key = email.toLowerCase() || company.toLowerCase();
        if (seen.has(key)) {
          skipped += 1;
          return;
        }
        seen.add(key);

        const existing = clients.find((client) =>
          (email && client.contact_email?.toLowerCase() === email.toLowerCase()) ||
          client.company_name.toLowerCase() === company.toLowerCase()
        );
        const sourceId = String(row.ID || index + 1).replace(/[^a-zA-Z0-9_-]/g, '');
        const clientId = existing?.id || `import-client-${sourceId || index + 1}`;
        const firstEmail = normalizeImportDate(row['First Email Sent On']);
        const lastEmail = normalizeImportDate(row['Last Email Sent On']);
        const nextFollowUp = normalizeImportDate(row['Next Follow-up Date']);
        const responseDate = normalizeImportDate(row['Response Date']);
        const product = String(row.Product || '').trim();
        const productCategory = String(row['Product Category'] || '').trim();
        const stage = mapImportStage(String(row.Stage || ''), String(row['Response Received'] || ''));
        const outreachDone = Boolean(firstEmail || lastEmail || String(row['Follow-up 1 Done'] || '').toLowerCase() === 'yes');

        clientPayloads.push({
          id: clientId,
          company_name: company,
          contact_name: String(row['Contact Person'] || '').trim(),
          contact_email: email,
          destination_port: String(row.Country || '').trim() || 'Not specified',
          address: [
            String(row.Website || '').trim() && `Website: ${String(row.Website).trim()}`,
            String(row.Country || '').trim() && `Country: ${String(row.Country).trim()}`,
            String(row['Market Category'] || '').trim() && `Market: ${String(row['Market Category']).trim()}`,
            String(row['Buyer Type'] || '').trim() && `Buyer Type: ${String(row['Buyer Type']).trim()}`,
            String(row.Phone || '').trim() && `Phone: ${String(row.Phone).trim()}`
          ].filter(Boolean).join('\n')
        });

        leadPayloads.push({
          id: `import-lead-${sourceId || index + 1}`,
          company_name: company,
          contact_name: String(row['Contact Person'] || '').trim(),
          contact_email: email,
          phone: String(row.Phone || '').trim(),
          country: String(row.Country || '').trim(),
          product_interest: product && product !== 'Other' ? product : productCategory || 'General export product range',
          estimated_value: Number(row['Lead Score'] || 0),
          stage,
          priority: ['Low', 'Medium', 'High'].includes(String(row.Priority)) ? String(row.Priority) as Lead['priority'] : 'Medium',
          owner: 'Sana Zeba',
          next_follow_up: nextFollowUp,
          notes: [
            `Source: ${String(row.Source || 'Bulk import').trim()}`,
            `Email Status: ${String(row['Email Status'] || '').trim()}`,
            `Next Action: ${String(row['Next Action'] || '').trim()}`,
            `Lead Score: ${String(row['Lead Score'] || '').trim()}`,
            `Response Received: ${String(row['Response Received'] || '').trim()}`,
            `Original Notes: ${String(row.Notes || '').trim()}`
          ].filter(Boolean).join('\n'),
          client_id: clientId
        });

        if (outreachDone) {
          activityPayloads.push({
            id: `import-activity-${sourceId || index + 1}`,
            client_id: clientId,
            lead_id: `import-lead-${sourceId || index + 1}`,
            type: 'Email',
            title: `Imported outreach status for ${company}`,
            details: `Email Status: ${String(row['Email Status'] || 'Imported')}\nFirst Email: ${firstEmail || 'N/A'}\nLast Email: ${lastEmail || 'N/A'}\nFollow-up 1: ${String(row['Follow-up 1 Done'] || 'No')}\nFollow-up 2: ${String(row['Follow-up 2 Done'] || 'No')}\nFollow-up 3: ${String(row['Follow-up 3 Done'] || 'No')}`,
            activity_date: lastEmail || firstEmail || new Date().toISOString().slice(0, 10),
            owner: 'Sana Zeba'
          });
        }

        if (nextFollowUp && !['Won', 'Lost'].includes(stage)) {
          taskPayloads.push({
            id: `import-task-${sourceId || index + 1}`,
            title: `Follow up with ${company}`,
            status: 'Open',
            priority: ['Low', 'Medium', 'High'].includes(String(row.Priority)) ? String(row.Priority) as TaskRecord['priority'] : 'Medium',
            due_date: nextFollowUp,
            owner: 'Sana Zeba',
            client_id: clientId,
            lead_id: `import-lead-${sourceId || index + 1}`,
            notes: `Auto-created from imported CRM sheet. Next action: ${String(row['Next Action'] || 'Follow up')}`
          });
        }

        if (responseDate) {
          activityPayloads.push({
            id: `import-response-${sourceId || index + 1}`,
            client_id: clientId,
            lead_id: `import-lead-${sourceId || index + 1}`,
            type: 'Status',
            title: `Response recorded for ${company}`,
            details: `Response Received: ${String(row['Response Received'] || '')}`,
            activity_date: responseDate,
            owner: 'Sana Zeba'
          });
        }
      });

      const insertBatches = async (table: string, payloads: unknown[]) => {
        const chunkSize = 150;
        for (let start = 0; start < payloads.length; start += chunkSize) {
          const chunk = payloads.slice(start, start + chunkSize);
          const { error } = await supabase.from(table).insert(chunk);
          if (error) throw new Error(`${table}: ${error.message || 'insert failed'}`);
        }
      };

      await insertBatches('clients', clientPayloads);
      await insertBatches('leads', leadPayloads);
      await insertBatches('activities', activityPayloads);
      await insertBatches('tasks', taskPayloads);

      await fetchData();
      setImportSummary({
        buyers: clientPayloads.length,
        leads: leadPayloads.length,
        activities: activityPayloads.length,
        tasks: taskPayloads.length,
        skipped,
        message: `Imported ${clientPayloads.length} buyers from ${file.name}. Outreach and follow-up fields were synced automatically.`
      });
    } catch (err) {
      console.warn('Buyer import failed:', err);
      alert(`Could not import this file. ${err instanceof Error ? err.message : 'Please use the same Buyers Excel or CSV template.'}`);
    } finally {
      setImportingBuyers(false);
    }
  };

  const downloadCrmImportTemplate = () => {
    const headers = [
      'ID',
      'Company Name',
      'Contact Person',
      'Email',
      'Phone',
      'Website',
      'Country',
      'Market Category',
      'Product',
      'Product Category',
      'Buyer Type',
      'Source',
      'Email Status',
      'Priority',
      'Stage',
      'Lead Score',
      'Next Action',
      'First Email Sent On',
      'Last Email Sent On',
      'Response Received',
      'Response Date',
      'Follow-up 1 Done',
      'Follow-up 1 Date',
      'Follow-up 2 Done',
      'Follow-up 2 Date',
      'Follow-up 3 Done',
      'Follow-up 3 Date',
      'Next Follow-up Date',
      'Notes',
      'Created At',
      'Updated At'
    ];
    const today = new Date().toISOString().slice(0, 10);
    const sampleRows = [
      [
        '001',
        'Example Foods Trading LLC',
        'Aisha Khan',
        'buyer@example.com',
        '+971501234567',
        'https://examplefoods.com',
        'UAE',
        'Spices Importer',
        'Cumin Seeds',
        'Spices',
        'Importer',
        'Trade Portal',
        'Not Sent',
        'High',
        'New Lead',
        '85',
        'Send first introduction email',
        '',
        '',
        'No',
        '',
        'No',
        '',
        'No',
        '',
        'No',
        '',
        today,
        'Interested in CIF quotation and product catalogue.',
        today,
        today
      ],
      [
        '002',
        'Global Retail Buyer GmbH',
        'Procurement Team',
        'procurement@example.de',
        '+491701234567',
        'https://globalretail.example',
        'Germany',
        'Retail / Distributor',
        'Other',
        'Agro Commodities',
        'Distributor',
        'Outreach Export',
        'First Email Sent',
        'Medium',
        'Follow-up',
        '72',
        'Wait until next follow-up',
        today,
        today,
        'No',
        '',
        'Yes',
        today,
        'No',
        '',
        'No',
        '',
        today,
        'No specific product yet. Pitch full Sheshaan Global product range.',
        today,
        today
      ]
    ];

    const csv = [headers, ...sampleRows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sheshaan-global-crm-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
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

  const saveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.company_name) {
      alert('Please enter supplier company name.');
      return;
    }

    await saveRecord<Vendor>('vendors', editingVendorId, {
      ...vendorForm,
      rating: Number(vendorForm.rating) || 3,
      status: vendorForm.status || 'Active'
    }, resetVendorForm);
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

  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todayEnd = new Date().setHours(23, 59, 59, 999);
  const leadNoteValue = (lead: Lead, label: string) => {
    const line = (lead.notes || '').split('\n').find((item) => item.toLowerCase().startsWith(`${label.toLowerCase()}:`));
    return line ? line.slice(line.indexOf(':') + 1).trim() : '';
  };
  const setLeadNoteValues = (lead: Lead, fields: Record<string, string>) => {
    const fieldLabels = Object.keys(fields).map((label) => label.toLowerCase());
    const existingLines = (lead.notes || '')
      .split('\n')
      .filter((line) => line.trim() && !fieldLabels.some((label) => line.toLowerCase().startsWith(`${label}:`)));
    const updatedLines = Object.entries(fields).map(([label, value]) => `${label}: ${value}`);
    return [...updatedLines, ...existingLines].join('\n');
  };
  const leadEmailStatus = (lead: Lead) => leadNoteValue(lead, 'Email Status') || 'Not tracked';
  const leadResponseStatus = (lead: Lead) => leadNoteValue(lead, 'Response Received') || 'No';
  const leadNextAction = (lead: Lead) => leadNoteValue(lead, 'Next Action') || 'Review lead';
  const leadHasOutreach = (lead: Lead) => {
    const status = leadEmailStatus(lead).toLowerCase();
    return ['sent', 'follow', 'opened', 'replied', 'whatsapp'].some((term) => status.includes(term)) || activities.some((activity) => (
      activity.lead_id === lead.id &&
      (activity.type === 'Email' || activity.title.toLowerCase().includes('whatsapp') || (activity.details || '').toLowerCase().includes('whatsapp'))
    ));
  };
  const leadResponded = (lead: Lead) => leadResponseStatus(lead).toLowerCase().startsWith('yes');
  const leadFollowUpDue = (lead: Lead) => Boolean(lead.next_follow_up && new Date(lead.next_follow_up).getTime() <= todayEnd && !['Won', 'Lost'].includes(lead.stage));
  const leadNeedsFirstReach = (lead: Lead) => !leadHasOutreach(lead) && !['Won', 'Lost'].includes(lead.stage);
  const leadMissingEmail = (lead: Lead) => !lead.contact_email || leadEmailStatus(lead).toLowerCase().includes('invalid');
  const leadNextActionRequiresFollowUp = (lead: Lead) => {
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
  const leadActionCategory = (lead: Lead) => {
    const nextAction = leadNextAction(lead).toLowerCase();
    if (lead.stage === 'Won' || lead.stage === 'Lost') return 'Closed';
    if (leadMissingEmail(lead) || nextAction.includes('fix') || nextAction.includes('verify email')) return 'Needs Email Fix';
    if (leadResponded(lead)) return 'Responded / Qualify';
    if (leadFollowUpDue(lead) || leadNextActionRequiresFollowUp(lead)) return 'Follow-up Due';
    if (leadNeedsFirstReach(lead) || nextAction.includes('send first') || nextAction.includes('first email')) return 'Need Reach Out';
    if (leadHasOutreach(lead)) return 'Waiting Reply';
    return 'Review';
  };
  const crmQueues = [
    { label: 'Need Reach Out', description: 'No email/WhatsApp sent yet', tone: 'sky' as const, leads: leads.filter((lead) => leadActionCategory(lead) === 'Need Reach Out') },
    { label: 'Follow-up Due', description: 'Due now or next action says follow-up', tone: 'amber' as const, leads: leads.filter((lead) => leadActionCategory(lead) === 'Follow-up Due') },
    { label: 'Waiting Reply', description: 'Reached out, no response yet', tone: 'slate' as const, leads: leads.filter((lead) => leadActionCategory(lead) === 'Waiting Reply') },
    { label: 'Responded / Qualify', description: 'Buyer replied; review requirement', tone: 'teal' as const, leads: leads.filter((lead) => leadActionCategory(lead) === 'Responded / Qualify') },
    { label: 'Needs Email Fix', description: 'Missing or invalid email', tone: 'red' as const, leads: leads.filter((lead) => leadActionCategory(lead) === 'Needs Email Fix') },
    { label: 'Needs Review', description: 'Imported action is unclear', tone: 'violet' as const, leads: leads.filter((lead) => leadActionCategory(lead) === 'Review') }
  ];
  const selectedLeads = leads.filter((lead) => selectedLeadIds.includes(lead.id));

  const toggleLeadSelection = (leadId: string, checked: boolean) => {
    setSelectedLeadIds((current) => checked ? Array.from(new Set([...current, leadId])) : current.filter((id) => id !== leadId));
  };

  const selectLeadGroup = (group: Lead[]) => {
    setSelectedLeadIds(Array.from(new Set([...selectedLeadIds, ...group.map((lead) => lead.id)])));
  };

  const bulkUpdateSelectedLeads = async (action: 'email_sent' | 'followup_1' | 'followup_2' | 'followup_3' | 'responded') => {
    if (!selectedLeads.length) {
      alert('Select at least one lead first.');
      return;
    }

    const dateAfterDays = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date.toISOString().slice(0, 10);
    };
    const today = new Date().toISOString().slice(0, 10);
    const actionDefinitions: Record<typeof action, { title: string; fields: Record<string, string>; stage: Lead['stage']; nextFollowUp: string | null }> = {
      email_sent: {
        title: 'Email marked as sent',
        fields: { 'Email Status': 'Email Sent', 'First Email Sent On': today, 'Last Email Sent On': today, 'Next Action': 'Waiting for buyer response' },
        stage: 'Contacted' as Lead['stage'],
        nextFollowUp: dateAfterDays(3)
      },
      followup_1: {
        title: 'Follow-up 1 marked done',
        fields: { 'Email Status': 'Follow-up 1 Done', 'Follow-up 1 Done': 'Yes', 'Follow-up 1 Date': today, 'Last Email Sent On': today, 'Next Action': 'Waiting for buyer response' },
        stage: 'Contacted' as Lead['stage'],
        nextFollowUp: dateAfterDays(4)
      },
      followup_2: {
        title: 'Follow-up 2 marked done',
        fields: { 'Email Status': 'Follow-up 2 Done', 'Follow-up 2 Done': 'Yes', 'Follow-up 2 Date': today, 'Last Email Sent On': today, 'Next Action': 'Waiting for buyer response' },
        stage: 'Contacted' as Lead['stage'],
        nextFollowUp: dateAfterDays(7)
      },
      followup_3: {
        title: 'Follow-up 3 marked done',
        fields: { 'Email Status': 'Follow-up 3 Done', 'Follow-up 3 Done': 'Yes', 'Follow-up 3 Date': today, 'Last Email Sent On': today, 'Next Action': 'No further follow-up scheduled' },
        stage: 'Contacted' as Lead['stage'],
        nextFollowUp: ''
      },
      responded: {
        title: 'Buyer response marked received',
        fields: { 'Response Received': 'Yes', 'Response Date': today, 'Next Action': 'Review buyer requirement and prepare next step' },
        stage: 'Negotiation' as Lead['stage'],
        nextFollowUp: ''
      }
    };
    const actionMap = actionDefinitions[action];

    try {
      await Promise.all(selectedLeads.map((lead) => supabase.from('leads').update({
        notes: setLeadNoteValues(lead, actionMap.fields),
        stage: ['Won', 'Lost'].includes(lead.stage) ? lead.stage : actionMap.stage,
        next_follow_up: actionMap.nextFollowUp === null ? lead.next_follow_up : actionMap.nextFollowUp
      }).eq('id', lead.id)));

      await supabase.from('activities').insert(selectedLeads.map((lead) => ({
        client_id: lead.client_id,
        lead_id: lead.id,
        type: action === 'responded' ? 'Status' : 'Email',
        title: `${actionMap.title}: ${lead.company_name}`,
        details: `Bulk CRM update applied to ${lead.company_name}.`,
        activity_date: today,
        owner: lead.owner || 'Sana Zeba'
      })));

      setSelectedLeadIds([]);
      await fetchData();
    } catch (err) {
      console.warn('Bulk lead update failed:', err);
      alert('Could not update selected leads. Please try again.');
    }
  };

  const navItems: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: 'crm', label: 'Smart CRM Pipeline', icon: <KanbanSquare className="h-4 w-4" />, count: leads.length },
    { key: 'buyers360', label: 'Buyer 360 Profile', icon: <Users className="h-4 w-4" />, count: clients.length },
    { key: 'phoneReachout', label: 'Number Reachout', icon: <Phone className="h-4 w-4" />, count: reachoutBuyers.length },
    { key: 'quotes', label: 'Quote Automation', icon: <FileCheck2 className="h-4 w-4" />, count: quotes.length },
    { key: 'communications', label: 'Communication Center', icon: <MessageSquare className="h-4 w-4" />, count: activities.length },
    { key: 'templates', label: 'Mail & Message Templates', icon: <Mail className="h-4 w-4" />, count: templates.length },
    { key: 'tasks', label: 'Tasks & Reminders', icon: <ClipboardList className="h-4 w-4" />, count: tasks.filter((task) => task.status !== 'Done').length },
    { key: 'accounts', label: 'Accounts & Payments', icon: <CalendarCheck className="h-4 w-4" />, count: invoices.length },
    { key: 'shipments', label: 'Shipment Operations', icon: <Ship className="h-4 w-4" />, count: shipments.length },
    { key: 'documents', label: 'Documents', icon: <CheckSquare className="h-4 w-4" />, count: checklists.length },
    { key: 'products', label: 'Products', icon: <Package className="h-4 w-4" />, count: products.length },
    { key: 'vendors', label: 'Suppliers / Vendors', icon: <Building2 className="h-4 w-4" />, count: vendors.length },
    { key: 'freight', label: 'Freight Presets', icon: <Anchor className="h-4 w-4" />, count: freightPresets.length },
    { key: 'rates', label: 'Rate History', icon: <History className="h-4 w-4" />, count: freightRates.length },
    { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { key: 'users', label: 'Users & Roles', icon: <Lock className="h-4 w-4" />, count: users.length }
  ];

  const activeNavItem = navItems.find((item) => item.key === activeTab);
  const appBusy = loading || importingBuyers;
  const mobilePrimaryNav = navItems.filter((item) => ['overview', 'crm', 'quotes', 'tasks'].includes(item.key));
  const navGroups = [
    { label: 'Command', items: navItems.filter((item) => ['overview', 'crm', 'buyers360', 'phoneReachout', 'quotes', 'communications', 'templates', 'tasks'].includes(item.key)) },
    { label: 'Operations', items: navItems.filter((item) => ['accounts', 'shipments', 'documents', 'products', 'vendors', 'freight', 'rates'].includes(item.key)) },
    { label: 'Admin', items: navItems.filter((item) => ['analytics', 'users'].includes(item.key)) }
  ];
  const navigateToTab = (tab: TabKey) => {
    setActiveTab(tab);
    setShowMobileMenu(false);
    setShowNotifications(false);
  };
  const selectedBuyer = clients.find((client) => client.id === selectedBuyerId);
  const leadCategoryClass = (category: string) => {
    if (category === 'Need Reach Out') return 'bg-sky-50 text-sky-700 border-sky-100';
    if (category === 'Follow-up Due') return 'bg-amber-50 text-amber-700 border-amber-100';
    if (category === 'Waiting Reply') return 'bg-slate-100 text-slate-700 border-slate-200';
    if (category === 'Responded / Qualify') return 'bg-teal-50 text-teal-700 border-teal-100';
    if (category === 'Needs Email Fix') return 'bg-red-50 text-red-700 border-red-100';
    return 'bg-violet-50 text-violet-700 border-violet-100';
  };
  const leadEmailMode = (lead: Lead): 'First Reach' | 'Follow-up' => {
    const category = leadActionCategory(lead);
    if (category === 'Need Reach Out') return 'First Reach';
    if (category === 'Follow-up Due' || category === 'Waiting Reply' || category === 'Responded / Qualify') return 'Follow-up';
    if (leadNextActionRequiresFollowUp(lead) || leadFollowUpDue(lead) || leadHasOutreach(lead)) return 'Follow-up';
    return 'First Reach';
  };
  const editLeadFromCard = (lead: Lead) => {
    setEditingLeadId(lead.id);
    setLeadForm(lead);
  };
  const renderLeadCard = (lead: Lead, compact = false) => {
    const actionCategory = leadActionCategory(lead);
    const emailMode = leadEmailMode(lead);
    const emailButtonLabel = actionCategory === 'Needs Email Fix' ? 'Fix Email' : emailMode;
    const whatsappButtonLabel = lead.phone ? 'WhatsApp' : 'Add Phone';
    const sendWindow = bestSendWindowIST(lead.country);
    return (
    <div key={lead.id} className="smooth-card bg-white border border-slate-200 rounded-lg p-3 text-xs shadow-sm hover:border-sky-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <input
            type="checkbox"
            checked={selectedLeadIds.includes(lead.id)}
            onChange={(event) => toggleLeadSelection(lead.id, event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            title="Select lead"
          />
          <div className="min-w-0">
            <div className="font-bold text-slate-900 leading-tight truncate">{lead.company_name}</div>
            <div className="text-[10px] text-slate-500 truncate">{lead.product_interest || 'General export product range'}</div>
          </div>
        </div>
        <RowActions onEdit={() => editLeadFromCard(lead)} onDelete={() => deleteRecord('leads', lead.id, 'lead')} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${leadCategoryClass(actionCategory)}`}>{actionCategory}</span>
        <SmallBadge text={lead.priority || 'Medium'} />
        <SmallBadge text={leadEmailStatus(lead)} />
        {leadResponded(lead) && <span className="inline-block px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold">Responded</span>}
        {leadFollowUpDue(lead) && <span className="inline-block px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">Due</span>}
        {leadMissingEmail(lead) && <span className="inline-block px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold">Verify Email</span>}
      </div>
      {!compact && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
          <SmallMetric label="Follow-up" value={lead.next_follow_up || 'Not set'} />
          <SmallMetric label="Next Action" value={leadNextAction(lead)} />
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => actionCategory === 'Needs Email Fix' ? editLeadFromCard(lead) : handleLeadEmail(lead, emailMode)} className="flex-1 min-w-[104px] py-1.5 bg-slate-900 text-white rounded font-bold flex items-center justify-center gap-1.5 hover:bg-slate-800 transition">
          <Mail className="h-3.5 w-3.5" />
          {emailButtonLabel}
        </button>
        <button type="button" onClick={() => lead.phone ? handleLeadWhatsApp(lead) : editLeadFromCard(lead)} className={`flex-1 min-w-[104px] py-1.5 text-white rounded font-bold flex items-center justify-center gap-1.5 transition ${lead.phone ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-500 hover:bg-slate-600'}`}>
          <Phone className="h-3.5 w-3.5" />
          {whatsappButtonLabel}
        </button>
      </div>
      <div className="mt-2 rounded bg-slate-50 border border-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 truncate">{sendWindow}{lead.country ? ` | ${lead.country}` : ' | Country not set'}</div>
      <div className="mt-2 text-[10px] text-slate-400 truncate">{lead.contact_email || 'Missing email'}{lead.phone ? ` | ${lead.phone}` : ' | Missing phone'}</div>
    </div>
    );
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e0f2fe_0,_transparent_28%),radial-gradient(circle_at_90%_10%,_#ecfeff_0,_transparent_22%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] pb-28 lg:pb-0">
      {appBusy && (
        <div className="fixed inset-x-0 top-0 z-[70] h-1 overflow-hidden bg-slate-200/70">
          <div className="h-full w-1/2 animate-loading-bar bg-sky-500 shadow-[0_0_18px_rgba(14,165,233,0.65)]" />
        </div>
      )}
      <div className="mx-auto max-w-[1500px] p-3 lg:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
          <aside className="hidden lg:block bg-white/95 backdrop-blur rounded-lg border border-slate-200 shadow-sm overflow-hidden lg:sticky lg:top-5 lg:h-[calc(100vh-40px)] animate-fade-up">
            <div className="p-4 border-b border-slate-200 bg-slate-950 text-white">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded bg-white flex items-center justify-center overflow-hidden border border-white/10">
                  <Image src="/logo.png" alt="Sheshaan Global logo" width={44} height={44} className="h-full w-full object-contain" />
                </div>
                <div>
                  <h1 className="text-sm font-extrabold tracking-wide">Sheshaan Global</h1>
                  <p className="text-[11px] text-slate-400">Admin Portal</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingQuoteId(null);
                  setShowMobileMenu(false);
                }}
                className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 bg-white text-slate-950 text-xs font-bold rounded shadow transition hover:bg-slate-100"
              >
                <Plus className="h-4 w-4" />
                New Quote
              </button>
            </div>
            <nav className="hidden lg:block p-2 overflow-y-auto h-[calc(100%-130px)] bg-white">
              {navGroups.map((group) => (
                <div key={group.label} className="mb-3 last:mb-0">
                  <p className="px-3 pb-1.5 pt-2 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">{group.label}</p>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => navigateToTab(item.key)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left text-xs font-semibold transition-all duration-200 ${activeTab === item.key ? 'bg-slate-900 text-white shadow-sm translate-x-0.5' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
                      >
                        {item.icon}
                        <span className="flex-1">{item.label}</span>
                        {typeof item.count === 'number' && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === item.key ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>{item.count}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          <section className="space-y-4 min-w-0">
            <div className="lg:hidden sticky top-2 z-30 bg-white/95 backdrop-blur rounded-lg border border-slate-200 shadow-sm overflow-hidden animate-fade-up">
              <div className="px-3 py-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(false);
                    setShowMobileMenu(true);
                  }}
                  className="h-10 w-10 rounded-md bg-slate-900 text-white flex items-center justify-center shadow-sm active:scale-95 transition hover:bg-slate-800"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
                  <Image src="/logo.png" alt="Sheshaan Global logo" width={40} height={40} className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Sheshaan Global</p>
                  <p className="text-sm font-extrabold text-slate-900 truncate">{activeNavItem?.label || 'Overview'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotifications((value) => !value)}
                  className="relative h-10 w-10 rounded-md border border-slate-200 bg-white text-slate-700 flex items-center justify-center active:scale-95 transition hover:bg-slate-50"
                  aria-label="Open notifications"
                >
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && <span className="absolute -right-1 -top-1 bg-red-600 text-white text-[10px] h-5 min-w-5 px-1 rounded-full flex items-center justify-center">{notifications.length}</span>}
                </button>
              </div>
            </div>

            {showNotifications && (
              <div className="lg:hidden fixed inset-x-3 top-20 z-50 rounded-lg border border-slate-200 bg-white shadow-2xl p-3 animate-panel-in">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-slate-900">Notification Center</span>
                  <button type="button" onClick={() => setShowNotifications(false)} className="h-8 w-8 rounded bg-slate-50 text-slate-500 flex items-center justify-center" aria-label="Close notifications"><X className="h-4 w-4" /></button>
                </div>
                {notifications.length === 0 ? (
                  <div className="text-xs text-slate-500 py-4 text-center">No active alerts.</div>
                ) : notifications.slice(0, 8).map((item) => (
                  <button key={item.id} type="button" onClick={() => navigateToTab(item.tab)} className="w-full text-left p-2 rounded hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
                    <span className="block text-xs font-bold text-slate-900">{item.title}</span>
                    <span className="block text-[10px] text-slate-500">{item.meta}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="lg:hidden sticky top-[4.75rem] z-20 bg-white/95 backdrop-blur rounded-lg border border-slate-200 shadow-sm p-3 animate-fade-up">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Search portal..."
                  className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                {globalResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-10 z-40 rounded-lg border border-slate-200 bg-white shadow-lg p-2">
                    {globalResults.map((result) => (
                      <button
                        key={result.key}
                        type="button"
                        onClick={() => {
                          navigateToTab(result.tab);
                          if (result.buyerId) setSelectedBuyerId(result.buyerId);
                          setGlobalSearch('');
                        }}
                        className="w-full text-left px-3 py-2 rounded hover:bg-slate-50 text-xs"
                      >
                        <span className="block font-bold text-slate-900">{result.label}</span>
                        <span className="block text-[10px] text-slate-500">{result.meta}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                <button type="button" onClick={runFollowUpAutomation} className="h-10 rounded-md bg-slate-50 text-slate-700 text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 active:scale-95 transition">
                  <Sparkles className="h-4 w-4" />
                  Auto
                </button>
                <button type="button" onClick={() => navigateToTab('templates')} className="h-10 rounded-md bg-slate-50 text-slate-700 text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 active:scale-95 transition">
                  <Edit2 className="h-4 w-4" />
                  Templates
                </button>
                <button type="button" onClick={() => navigateToTab('communications')} className="h-10 rounded-md bg-slate-50 text-slate-700 text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 active:scale-95 transition">
                  <Mail className="h-4 w-4" />
                  Mail
                </button>
                <button type="button" onClick={() => setEditingQuoteId(null)} className="h-10 rounded-md bg-slate-900 text-white text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 active:scale-95 transition">
                  <Plus className="h-4 w-4" />
                  Quote
                </button>
              </div>
            </div>

            <div className="hidden lg:block sticky top-3 z-20 bg-white/95 backdrop-blur rounded-lg border border-slate-200 shadow-sm overflow-hidden animate-fade-up">
              <div className="min-h-14 px-4 py-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded bg-slate-900 text-white flex items-center justify-center shrink-0">
                    {activeNavItem?.icon || <LayoutDashboard className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sheshaan Global Admin</div>
                    <div className="text-sm font-extrabold text-slate-900 truncate">{activeNavItem?.label || 'Overview'}</div>
                  </div>
                </div>
                <div className="relative w-full xl:max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    placeholder="Search buyers, leads, quotes, invoices, shipments..."
                    className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  {globalResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-10 z-30 rounded-lg border border-slate-200 bg-white shadow-lg p-2">
                      {globalResults.map((result) => (
                        <button
                          key={result.key}
                          type="button"
                          onClick={() => {
                            navigateToTab(result.tab);
                            if (result.buyerId) setSelectedBuyerId(result.buyerId);
                            setGlobalSearch('');
                          }}
                          className="w-full text-left px-3 py-2 rounded hover:bg-slate-50 text-xs"
                        >
                          <span className="block font-bold text-slate-900">{result.label}</span>
                          <span className="block text-[10px] text-slate-500">{result.meta}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={runFollowUpAutomation} className="h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition">
                    <Sparkles className="h-4 w-4" />
                    Automate
                  </button>
                  <div className="relative">
                    <button type="button" onClick={() => setShowNotifications((value) => !value)} className="h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition">
                      <Bell className="h-4 w-4" />
                      Alerts
                      {notifications.length > 0 && <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{notifications.length}</span>}
                    </button>
                    {showNotifications && (
                      <div className="absolute right-0 top-10 z-30 w-80 rounded-lg border border-slate-200 bg-white shadow-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-xs text-slate-900">Notification Center</span>
                          <button type="button" onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
                        </div>
                        {notifications.length === 0 ? (
                          <div className="text-xs text-slate-500 py-4 text-center">No active alerts.</div>
                        ) : notifications.slice(0, 8).map((item) => (
                          <button key={item.id} type="button" onClick={() => navigateToTab(item.tab)} className="w-full text-left p-2 rounded hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
                            <span className="block text-xs font-bold text-slate-900">{item.title}</span>
                            <span className="block text-[10px] text-slate-500">{item.meta}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {(isMock || isFirebase) && (
                    <div className="relative">
                      <button type="button" onClick={() => setShowDevMenu((v) => !v)} className="h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition">
                        <Database className="h-4 w-4 text-sky-600 shrink-0" />
                        <span>Database</span>
                      </button>
                      {showDevMenu && (
                        <div className="absolute right-0 top-10 z-30 w-80 rounded-lg border border-slate-200 bg-white shadow-xl p-4 text-xs space-y-3">
                          <div className="border-b pb-2 flex justify-between items-center">
                            <span className="font-bold text-slate-800">Database Tools</span>
                            <span className="text-[10px] bg-sky-50 text-sky-700 font-extrabold px-1.5 py-0.5 rounded">{dbType.split(' ')[0]}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {isFirebase ? 'Connected to Firebase Firestore. Seed will push mock data, Clear will wipe remote Firestore collections.' : 'Using local db.json file storage. Seed will inject standard mock data, Clear will empty database.'}
                          </p>
                          <div className="flex gap-2">
                            <button onClick={() => { fetchData(); setShowDevMenu(false); }} className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[11px] flex items-center justify-center gap-1 border border-slate-200">
                              <RefreshCw className="h-3 w-3" /> Refresh
                            </button>
                            <button onClick={() => { handleSeedMock(); setShowDevMenu(false); }} className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] flex items-center justify-center gap-1 shadow">
                              <Sparkles className="h-3 w-3" /> Seed
                            </button>
                            <button onClick={() => { handleClearMock(); setShowDevMenu(false); }} className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded text-[11px] flex items-center justify-center gap-1">
                              <Trash2 className="h-3 w-3" /> Clear
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <button type="button" onClick={() => navigateToTab('templates')} className="h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition">
                    <Edit2 className="h-4 w-4" />
                    Templates
                  </button>
                  <button type="button" onClick={() => navigateToTab('communications')} className="h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition">
                    <Mail className="h-4 w-4" />
                    Composer
                  </button>
                  <button type="button" onClick={() => setEditingQuoteId(null)} className="h-9 px-3 rounded-md bg-slate-900 text-white text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition shadow-sm">
                    <Plus className="h-4 w-4" />
                    New Quote
                  </button>
                </div>
              </div>
            </div>
            <div key={activeTab} className="bg-white/95 rounded-lg border border-slate-200 shadow-sm p-3 sm:p-5 min-w-0 animate-panel-in">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                <Stat icon={<TrendingUp className="h-5 w-5" />} label="Active Deals" value={quotes.length.toString()} tone="sky" />
                <Stat icon={<KanbanSquare className="h-5 w-5" />} label="Hot Leads" value={analytics.hotLeads.toString()} tone="indigo" />
                <Stat icon={<ClipboardList className="h-5 w-5" />} label="Overdue Tasks" value={analytics.overdueTasks.toString()} tone="slate" />
                <Stat icon={<Ship className="h-5 w-5" />} label="Active Shipments" value={analytics.activeShipments.toString()} tone="teal" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <SimplePanel title="Today Focus" rows={[
                  ['Quote follow-ups', analytics.quoteFollowUps.toString()],
                  ['Pending payments', invoices.filter((invoice) => invoice.payment_status !== 'Paid').length.toString()],
                  ['Open tasks', tasks.filter((task) => task.status !== 'Done').length.toString()],
                  ['Missing documents', checklists.filter((item) => [item.commercial_invoice, item.packing_list, item.certificate_origin, item.phytosanitary, item.insurance, item.bill_of_lading].some((flag) => !flag)).length.toString()]
                ]} />
                <SimplePanel title="Pipeline Health" rows={['New Lead', 'Contacted', 'Quoted', 'Negotiation', 'Won', 'Lost'].map((stage) => [stage, leads.filter((lead) => lead.stage === stage).length.toString()])} />
                <SimplePanel title="Financial Snapshot" rows={[
                  ['Total quoted', formatQuoteCurrency(analytics.totalQuoted, 'INR')],
                  ['Won value', formatQuoteCurrency(analytics.wonValue, 'INR')],
                  ['Pending receivable', formatQuoteCurrency(analytics.pendingInvoiceValue, 'INR')],
                  ['Document completion', `${analytics.docCompletion}%`]
                ]} />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <DashboardList title="Next Tasks" empty="No open tasks." rows={tasks.filter((task) => task.status !== 'Done').slice(0, 6).map((task) => ({
                  title: task.title,
                  meta: `${task.priority} priority | Due ${task.due_date || 'not set'} | ${clients.find((client) => client.id === task.client_id)?.company_name || 'Unlinked'}`
                }))} />
                <DashboardList title="Shipment Watch" empty="No shipments yet." rows={shipments.slice(0, 6).map((shipment) => ({
                  title: shipment.booking_number || shipment.vessel_name || 'Shipment pending booking',
                  meta: `${shipment.status} | ETA ${shipment.eta || 'TBA'} | ${clients.find((client) => client.id === shipment.client_id)?.company_name || 'Unlinked'}`
                }))} />
              </div>
            </div>
          )}

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
                              <button onClick={() => createInvoiceFromQuote(q)} className="p-1 hover:bg-sky-50 text-slate-500 hover:text-sky-700 rounded transition" title="Auto-create proforma invoice">
                                <FileCheck2 className="h-4 w-4" />
                              </button>
                              <button onClick={() => createShipmentFromQuote(q)} className="p-1 hover:bg-teal-50 text-slate-500 hover:text-teal-700 rounded transition" title="Auto-create shipment">
                                <Ship className="h-4 w-4" />
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
              <div className="space-y-4">
                <div className="bg-slate-950 rounded-lg p-4 text-white overflow-hidden">
                  <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300">CRM command center</p>
                      <h3 className="text-lg font-extrabold">Imported buyer outreach, follow-ups, and sales pipeline</h3>
                      <p className="text-xs text-slate-300 mt-1 max-w-3xl">Upload the old CRM sheet once. The portal reads outreach status, response status, next action, priority, and follow-up dates, then sorts every lead into the right queue automatically.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={downloadCrmImportTemplate} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/10 border border-white/15 text-white rounded font-bold hover:bg-white/15 transition">
                        <Download className="h-4 w-4" />
                        Sample Template
                      </button>
                      <label className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-sky-500 text-white rounded font-bold cursor-pointer hover:bg-sky-400 transition">
                        <FileCheck2 className="h-4 w-4" />
                        {importingBuyers ? 'Importing...' : 'Import CRM File'}
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          disabled={importingBuyers}
                          onChange={(event) => {
                            handleBuyerWorkbookImport(event.target.files?.[0] || null);
                            event.currentTarget.value = '';
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mt-5">
                    <CrmMetric label="Total Leads" value={leads.length.toString()} helper="All imported and manual leads" />
                    <CrmMetric label="Need Reach Out" value={crmQueues[0].leads.length.toString()} helper="First email/message not done" />
                    <CrmMetric label="Follow-up Due" value={crmQueues[1].leads.length.toString()} helper="Due today, overdue, or requested" />
                    <CrmMetric label="Waiting Reply" value={crmQueues[2].leads.length.toString()} helper="Reached, no response" />
                    <CrmMetric label="Needs Email Fix" value={crmQueues[4].leads.length.toString()} helper="Missing or invalid email" />
                  </div>
                  {importSummary && (
                    <div className="mt-4 bg-white text-slate-700 border border-white/20 rounded p-3 text-xs">
                      <div className="font-bold text-slate-900">{importSummary.message}</div>
                      <div className="mt-1 text-[11px] text-slate-500">Buyers: {importSummary.buyers} | Leads: {importSummary.leads} | Activities: {importSummary.activities} | Tasks: {importSummary.tasks} | Skipped: {importSummary.skipped}</div>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm text-xs">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-slate-900">Bulk Lead Actions</h3>
                      <p className="text-slate-500 mt-0.5">{selectedLeads.length} selected. Mark imported/outreach status without editing each buyer manually.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => selectLeadGroup(crmQueues[1].leads)} className="px-3 py-2 bg-amber-50 text-amber-700 rounded font-bold hover:bg-amber-100">Select Follow-up Due</button>
                      <button type="button" onClick={() => selectLeadGroup(crmQueues[0].leads)} className="px-3 py-2 bg-sky-50 text-sky-700 rounded font-bold hover:bg-sky-100">Select Reach Out</button>
                      <button type="button" onClick={() => selectLeadGroup(crmQueues[2].leads)} className="px-3 py-2 bg-slate-100 text-slate-700 rounded font-bold hover:bg-slate-200">Select Waiting Reply</button>
                      <button type="button" onClick={() => selectLeadGroup(crmQueues[4].leads)} className="px-3 py-2 bg-red-50 text-red-700 rounded font-bold hover:bg-red-100">Select Email Fix</button>
                      <button type="button" onClick={() => setSelectedLeadIds([])} className="px-3 py-2 bg-slate-100 text-slate-600 rounded font-bold hover:bg-slate-200">Clear</button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => bulkUpdateSelectedLeads('email_sent')} className="px-3 py-2 bg-slate-900 text-white rounded font-bold hover:bg-slate-800 disabled:opacity-40" disabled={!selectedLeads.length}>Mark Email Sent</button>
                    <button type="button" onClick={() => bulkUpdateSelectedLeads('followup_1')} className="px-3 py-2 bg-sky-600 text-white rounded font-bold hover:bg-sky-500 disabled:opacity-40" disabled={!selectedLeads.length}>Follow-up 1 Done</button>
                    <button type="button" onClick={() => bulkUpdateSelectedLeads('followup_2')} className="px-3 py-2 bg-sky-600 text-white rounded font-bold hover:bg-sky-500 disabled:opacity-40" disabled={!selectedLeads.length}>Follow-up 2 Done</button>
                    <button type="button" onClick={() => bulkUpdateSelectedLeads('followup_3')} className="px-3 py-2 bg-sky-600 text-white rounded font-bold hover:bg-sky-500 disabled:opacity-40" disabled={!selectedLeads.length}>Follow-up 3 Done</button>
                    <button type="button" onClick={() => bulkUpdateSelectedLeads('responded')} className="px-3 py-2 bg-teal-600 text-white rounded font-bold hover:bg-teal-500 disabled:opacity-40" disabled={!selectedLeads.length}>Mark Responded</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_340px] gap-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {crmQueues.map((queue) => (
                        <div key={queue.label} className="bg-slate-50 border border-slate-200 rounded-lg p-3 min-h-[220px]">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div>
                              <h4 className="text-[11px] font-extrabold text-slate-800 uppercase">{queue.label}</h4>
                              <p className="text-[10px] text-slate-400">{queue.description}</p>
                              <p className="text-[10px] font-bold text-slate-500 mt-0.5">{queue.leads.length} lead{queue.leads.length === 1 ? '' : 's'}</p>
                            </div>
                            <span className={`h-2.5 w-2.5 rounded-full ${queue.tone === 'amber' ? 'bg-amber-500' : queue.tone === 'sky' ? 'bg-sky-500' : queue.tone === 'teal' ? 'bg-teal-500' : queue.tone === 'red' ? 'bg-red-500' : queue.tone === 'violet' ? 'bg-violet-500' : 'bg-slate-400'}`} />
                          </div>
                          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                            {queue.leads.length === 0 ? <EmptyState text="Nothing here." /> : queue.leads.slice(0, 12).map((lead) => renderLeadCard(lead, true))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                          <h3 className="font-extrabold text-slate-900">Pipeline Board</h3>
                          <p className="text-xs text-slate-500">Stage synced from imported sheet, responses, and manual edits.</p>
                        </div>
                        <button type="button" onClick={runFollowUpAutomation} className="px-3 py-2 bg-slate-900 text-white rounded font-bold text-xs flex items-center gap-2 hover:bg-slate-800">
                          <Sparkles className="h-4 w-4" />
                          Create Follow-up Tasks
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {['New Lead', 'Contacted', 'Quoted', 'Negotiation', 'Won', 'Lost'].map((stage) => {
                          const stageLeads = leads.filter((lead) => lead.stage === stage);
                          return (
                            <div key={stage} className="bg-slate-50 border border-slate-200 rounded-lg p-3 min-h-[180px]">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-[11px] font-bold text-slate-600 uppercase">{stage}</h4>
                                <span className="text-[10px] font-bold text-slate-400">{stageLeads.length}</span>
                              </div>
                              <div className="space-y-2">
                                {stageLeads.length === 0 ? <EmptyState text="No leads." /> : stageLeads.slice(0, 8).map((lead) => renderLeadCard(lead))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white border border-slate-200 rounded-lg p-4 text-xs space-y-3 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-900">Outreach Template</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">Used by email and WhatsApp actions.</p>
                        </div>
                        <button type="button" onClick={editTemplateFromCrm} className="px-2.5 py-1.5 bg-slate-100 rounded font-bold text-slate-700 hover:bg-slate-200 flex items-center gap-1.5">
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      </div>
                      <SelectInput
                        label="Template"
                        value={selectedCrmTemplateId}
                        onChange={setSelectedCrmTemplateId}
                        options={['', ...templates.map((template) => template.id)]}
                        labels={{
                          '': 'Auto by action type',
                          ...Object.fromEntries(templates.map((template) => [template.id, `${template.name} (${template.channel} / ${template.category})`]))
                        }}
                      />
                    </div>
                    <SimplePanel title="Imported Field Sync" rows={[
                      ['Email Status', 'Outreach badges + queues'],
                      ['Response Received', 'Responded queue'],
                      ['Next Follow-up Date', 'Pending follow-up queue + tasks'],
                      ['Next Action', 'Lead card action context'],
                      ['Priority', 'Hot lead scoring']
                    ]} />
                  </div>
                </div>
              </div>
            </TwoColumnManager>
          )}

          {activeTab === 'communications' && (
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
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs space-y-3">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Send className="h-4 w-4 text-sky-600" />
                    Buyer Message Composer
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <SelectInput label="Buyer" value={communicationClient?.id || ''} onChange={setSelectedCommunicationClientId} options={clients.map((client) => client.id)} labels={Object.fromEntries(clients.map((client) => [client.id, client.company_name]))} />
                    <SelectInput label="Template" value={selectedTemplate?.id || ''} onChange={setSelectedTemplateId} options={templates.map((template) => template.id)} labels={Object.fromEntries(templates.map((template) => [template.id, template.name]))} />
                  </div>
                  <div className="bg-white rounded border border-slate-200 p-3">
                    <div className="font-semibold text-slate-800">{replaceTemplateVars(selectedTemplate?.subject || '') || 'No subject'}</div>
                    <p className="mt-2 text-slate-600 whitespace-pre-line">{replaceTemplateVars(selectedTemplate?.body || 'Create a template to generate filled email or WhatsApp messages here.')}</p>
                  </div>
                </div>
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

          {activeTab === 'templates' && (
            <TwoColumnManager
              formTitle={editingTemplateId ? 'Edit Template' : 'Add Mail / Message Template'}
              onSubmit={(e) => {
                e.preventDefault();
                if (!templateForm.name || !templateForm.body) return alert('Please enter template name and body.');
                saveRecord<MessageTemplate>('message_templates', editingTemplateId, {
                  ...templateForm,
                  active: templateForm.active !== false
                }, resetTemplateForm);
              }}
              onCancel={resetTemplateForm}
              isEditing={Boolean(editingTemplateId)}
              form={
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => applyTemplateStarter('product_pitch')} className="px-2 py-1.5 bg-sky-50 text-sky-700 rounded font-bold hover:bg-sky-100">Product Pitch</button>
                    <button type="button" onClick={() => applyTemplateStarter('catalogue_pitch')} className="px-2 py-1.5 bg-slate-100 text-slate-700 rounded font-bold hover:bg-slate-200">General Pitch</button>
                    <button type="button" onClick={() => applyTemplateStarter('follow_up')} className="px-2 py-1.5 bg-amber-50 text-amber-700 rounded font-bold hover:bg-amber-100">Follow-up</button>
                    <button type="button" onClick={() => applyTemplateStarter('whatsapp_intro')} className="px-2 py-1.5 bg-emerald-50 text-emerald-700 rounded font-bold hover:bg-emerald-100">WhatsApp</button>
                  </div>
                  <TextInput label="Template Name *" value={templateForm.name || ''} onChange={(value) => setTemplateForm({ ...templateForm, name: value })} required />
                  <SelectInput label="Channel" value={templateForm.channel || 'Email'} onChange={(value) => setTemplateForm({ ...templateForm, channel: value as MessageTemplate['channel'] })} options={['Email', 'WhatsApp', 'SMS']} />
                  <SelectInput label="Category" value={templateForm.category || 'General'} onChange={(value) => setTemplateForm({ ...templateForm, category: value as MessageTemplate['category'] })} options={['Introduction', 'Quote Follow-up', 'Payment Reminder', 'Shipment Update', 'Document Sharing', 'General']} />
                  <TextInput label="Email Subject" value={templateForm.subject || ''} onChange={(value) => setTemplateForm({ ...templateForm, subject: value })} />
                  <TextArea label="Message Body *" value={templateForm.body || ''} onChange={(value) => setTemplateForm({ ...templateForm, body: value })} />
                  <CheckboxInput label="Active Template" checked={templateForm.active !== false} onChange={(value) => setTemplateForm({ ...templateForm, active: value })} />
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[10px] text-slate-600 leading-relaxed">
                    Variables: {'{{buyer_name}}'}, {'{{client_name}}'}, {'{{company_name}}'}, {'{{product_name}}'}, {'{{product_description}}'}, {'{{product_catalogue}}'}, {'{{destination_port}}'}, {'{{quote_number}}'}, {'{{total_value}}'}.
                  </div>
                </>
              }
            >
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="space-y-3">
                  {templates.length === 0 ? <EmptyState text="No templates saved yet." /> : templates.map((template) => (
                    <div key={template.id} className="bg-white border border-slate-200 rounded-lg p-4 text-xs shadow-sm">
                      <div className="flex justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-900">{template.name}</div>
                          <div className="text-[10px] text-slate-400">{template.channel} | {template.category} | {template.active ? 'Active' : 'Inactive'}</div>
                        </div>
                        <RowActions onEdit={() => { setEditingTemplateId(template.id); setTemplateForm(template); }} onDelete={() => deleteRecord('message_templates', template.id, 'template')} />
                      </div>
                      {template.subject && <p className="mt-2 font-semibold text-slate-700">{template.subject}</p>}
                      <p className="mt-2 text-slate-600 whitespace-pre-line line-clamp-4">{template.body}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 h-fit text-xs space-y-3">
                  <h3 className="font-bold text-slate-900">Personalized Preview</h3>
                  <SelectInput label="Template" value={selectedTemplate?.id || ''} onChange={setSelectedTemplateId} options={templates.map((template) => template.id)} labels={Object.fromEntries(templates.map((template) => [template.id, template.name]))} />
                  <SelectInput label="Buyer / Client" value={templatePreviewClient?.id || ''} onChange={setSelectedTemplateClientId} options={clients.map((client) => client.id)} labels={Object.fromEntries(clients.map((client) => [client.id, `${client.contact_name || client.company_name} - ${client.company_name}`]))} />
                  <SelectInput label="Product Focus" value={selectedTemplateProductId} onChange={setSelectedTemplateProductId} options={['', ...products.map((product) => product.id)]} labels={{ '': 'No specific product - pitch full range', ...Object.fromEntries(products.map((product) => [product.id, product.sku])) }} />
                  <div className="bg-white border border-slate-200 rounded p-3">
                    <div className="font-bold text-slate-700">{replaceTemplateVars(selectedTemplate?.subject || '', { client: templatePreviewClient, product: templatePreviewProduct }) || 'Message Preview'}</div>
                    <p className="mt-2 whitespace-pre-line text-slate-600">{replaceTemplateVars(selectedTemplate?.body || 'Choose a saved template to preview buyer-specific text.', { client: templatePreviewClient, product: templatePreviewProduct })}</p>
                  </div>
                  <button type="button" onClick={() => navigator.clipboard?.writeText(`${replaceTemplateVars(selectedTemplate?.subject || '', { client: templatePreviewClient, product: templatePreviewProduct })}\n\n${replaceTemplateVars(selectedTemplate?.body || '', { client: templatePreviewClient, product: templatePreviewProduct })}`)} className="w-full py-2 bg-slate-900 text-white rounded font-semibold flex items-center justify-center gap-2">
                    <Copy className="h-4 w-4" />
                    Copy Filled Message
                  </button>
                </div>
              </div>
            </TwoColumnManager>
          )}

          {activeTab === 'tasks' && (
            <TwoColumnManager
              formTitle={editingTaskId ? 'Edit Task / Reminder' : 'Add Task / Reminder'}
              onSubmit={(e) => {
                e.preventDefault();
                if (!taskForm.title) return alert('Please enter task title.');
                saveRecord<TaskRecord>('tasks', editingTaskId, taskForm, resetTaskForm);
              }}
              onCancel={resetTaskForm}
              isEditing={Boolean(editingTaskId)}
              form={
                <>
                  <TextInput label="Task Title *" value={taskForm.title || ''} onChange={(value) => setTaskForm({ ...taskForm, title: value })} required />
                  <SelectInput label="Status" value={taskForm.status || 'Open'} onChange={(value) => setTaskForm({ ...taskForm, status: value as TaskRecord['status'] })} options={['Open', 'In Progress', 'Done']} />
                  <SelectInput label="Priority" value={taskForm.priority || 'Medium'} onChange={(value) => setTaskForm({ ...taskForm, priority: value as TaskRecord['priority'] })} options={['Low', 'Medium', 'High']} />
                  <TextInput label="Due Date" type="date" value={taskForm.due_date || ''} onChange={(value) => setTaskForm({ ...taskForm, due_date: value })} />
                  <TextInput label="Owner" value={taskForm.owner || ''} onChange={(value) => setTaskForm({ ...taskForm, owner: value })} />
                  <SelectInput label="Buyer" value={taskForm.client_id || ''} onChange={(value) => setTaskForm({ ...taskForm, client_id: value })} options={['', ...clients.map((client) => client.id)]} labels={{ '': 'Unlinked', ...Object.fromEntries(clients.map((client) => [client.id, client.company_name])) }} />
                  <SelectInput label="Quote" value={taskForm.quote_id || ''} onChange={(value) => setTaskForm({ ...taskForm, quote_id: value })} options={['', ...quotes.map((quote) => quote.id)]} labels={{ '': 'Unlinked', ...Object.fromEntries(quotes.map((quote) => [quote.id, quote.quote_number])) }} />
                  <TextArea label="Notes" value={taskForm.notes || ''} onChange={(value) => setTaskForm({ ...taskForm, notes: value })} />
                </>
              }
            >
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {['Open', 'In Progress', 'Done'].map((status) => (
                  <div key={status} className="bg-slate-50 border border-slate-200 rounded-lg p-3 min-h-[180px]">
                    <h4 className="text-[11px] font-bold text-slate-600 uppercase mb-3">{status}</h4>
                    <div className="space-y-2">
                      {tasks.filter((task) => task.status === status).map((task) => (
                        <div key={task.id} className="bg-white border border-slate-200 rounded p-3 text-xs shadow-sm">
                          <div className="flex justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-900">{task.title}</div>
                              <div className="text-[10px] text-slate-500">{task.priority} | Due {task.due_date || 'Not set'} | {task.owner || 'Unassigned'}</div>
                            </div>
                            <RowActions onEdit={() => { setEditingTaskId(task.id); setTaskForm(task); }} onDelete={() => deleteRecord('tasks', task.id, 'task')} />
                          </div>
                          <div className="mt-2 text-[10px] text-slate-400">{clients.find((client) => client.id === task.client_id)?.company_name || 'Unlinked buyer'} | {quotes.find((quote) => quote.id === task.quote_id)?.quote_number || 'No quote'}</div>
                        </div>
                      ))}
                    </div>
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

          {activeTab === 'buyers360' && (
            <TwoColumnManager
              formTitle={editingClientId ? 'Edit Buyer' : 'Register Buyer'}
              onSubmit={saveClient}
              onCancel={resetClientForm}
              isEditing={Boolean(editingClientId)}
              scrollableForm
              form={
                <>
                  <TextInput label="Company Name *" value={clientForm.company_name || ''} onChange={(value) => setClientForm({ ...clientForm, company_name: value })} required />
                  <TextInput label="Destination Port *" value={clientForm.destination_port || ''} onChange={(value) => setClientForm({ ...clientForm, destination_port: value })} required />
                  <TextArea label="Address" value={clientForm.address || ''} onChange={(value) => setClientForm({ ...clientForm, address: value })} />
                  <TextInput label="Contact Person" value={clientForm.contact_name || ''} onChange={(value) => setClientForm({ ...clientForm, contact_name: value })} />
                  <TextInput label="Email" type="email" value={clientForm.contact_email || ''} onChange={(value) => setClientForm({ ...clientForm, contact_email: value })} />
                  <TextInput label="Phone Number" value={clientForm.phone || ''} onChange={(value) => setClientForm({ ...clientForm, phone: value })} />
                  <TextInput
                    label="Products Dealing In"
                    placeholder="e.g. Basmati Rice, Red Onions, Peanuts"
                    value={(clientForm.products_dealing || []).join(', ')}
                    onChange={(value) => {
                      const list = value.split(',').map((s) => s.trim()).filter(Boolean);
                      setClientForm({ ...clientForm, products_dealing: list });
                    }}
                  />
                </>
              }
            >
              <div className="space-y-4">
                <div className="bg-slate-950 text-white rounded-lg p-4">
                  <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300">Buyer geography</p>
                      <h3 className="text-lg font-extrabold">Filter buyers by country and plan outreach windows</h3>
                      <p className="text-xs text-slate-300 mt-1">Country is detected from the linked CRM lead first, then buyer address or destination port.</p>
                    </div>
                    <div className="w-full xl:max-w-sm">
                      <div className="rounded-lg border border-white/15 bg-white/10 p-3 text-xs shadow-inner">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded bg-sky-400/20 text-sky-200">
                              <Filter className="h-3.5 w-3.5" />
                            </span>
                            <div>
                              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300">Country Filter</p>
                              <p className="text-[11px] font-semibold text-white">{buyerCountryFilter === 'All' ? 'Showing all buyer markets' : `Showing ${buyerCountryFilter}`}</p>
                            </div>
                          </div>
                          {buyerCountryFilter !== 'All' && (
                            <button type="button" onClick={() => setBuyerCountryFilter('All')} className="rounded bg-white/10 px-2 py-1 text-[10px] font-bold text-white hover:bg-white/20">
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <select
                            aria-label="Country Filter"
                            value={buyerCountryFilter}
                            onChange={(event) => setBuyerCountryFilter(event.target.value)}
                            className="h-10 w-full appearance-none rounded-md border border-white/15 bg-white px-3 pr-9 text-xs font-bold text-slate-800 shadow-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30"
                          >
                            {['All', ...buyerCountries].map((country) => (
                              <option key={country} value={country}>{country === 'All' ? 'All Countries' : country}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-white border-t border-white/10 pt-2.5">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300">Sort Buyers</p>
                        </div>
                        <div className="relative mt-2">
                          <select
                            aria-label="Buyer Sorting"
                            value={buyerSortKey}
                            onChange={(event) => setBuyerSortKey(event.target.value as any)}
                            className="h-10 w-full appearance-none rounded-md border border-white/15 bg-white px-3 pr-9 text-xs font-bold text-slate-800 shadow-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30"
                          >
                            <option value="name">Company Name (A-Z)</option>
                            <option value="phone_asc">Phone Number (Ascending)</option>
                            <option value="phone_desc">Phone Number (Descending)</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                        </div>
                        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scroll-fade">
                          {['All', ...buyerCountries.filter((country) => country !== 'Uncategorized').slice(0, 8)].map((country) => (
                            <button
                              key={country}
                              type="button"
                              onClick={() => setBuyerCountryFilter(country)}
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold transition ${buyerCountryFilter === country ? 'bg-sky-400 text-slate-950 shadow' : 'bg-white/10 text-slate-200 hover:bg-white/20'}`}
                            >
                              {country === 'All' ? 'All' : country}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <CrmMetric label="Shown Buyers" value={buyerSummaryStats.shown.toString()} helper={buyerCountryFilter === 'All' ? 'All countries' : buyerCountryFilter} />
                    <CrmMetric label="Countries" value={buyerSummaryStats.countriesCount.toString()} helper="Detected markets" />
                    <CrmMetric label="Uncategorized" value={buyerSummaryStats.uncategorized.toString()} helper="Needs country data" />
                    <CrmMetric label="CRM Linked" value={buyerSummaryStats.crmLinked.toString()} helper="Synced with leads" />
                  </div>
                </div>

                {clients.length === 0 ? <EmptyState text="No buyer companies found." /> : filteredBuyers.length === 0 ? <EmptyState text="No buyers match this country filter." /> : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                      <span>
                        Showing <strong className="text-slate-900">{visibleBuyers.length}</strong> of <strong className="text-slate-900">{filteredBuyers.length}</strong> buyers
                      </span>
                      {filteredBuyers.length > visibleBuyers.length && (
                        <button
                          type="button"
                          onClick={() => setBuyerVisibleCount((count) => Math.min(count + buyerListPageSize, filteredBuyers.length))}
                          className="rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800"
                        >
                          Load {Math.min(buyerListPageSize, filteredBuyers.length - visibleBuyers.length)} More
                        </button>
                      )}
                    </div>
                    <div className="max-h-[64vh] overflow-y-auto pr-2 space-y-4 scroll-fade scroll-smooth">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {visibleBuyers.map((c) => (
                          <BuyerCard
                            key={c.id}
                            client={c}
                            country={buyerCountry(c)}
                            phone={c.phone || clientPhones[c.id] || ''}
                            metrics={clientMetrics[c.id] || { quotesCount: 0, receivableValue: 0, shipmentsCount: 0, openTasksCount: 0, lastActivityTitle: 'No activity logged' }}
                            onView={() => setSelectedBuyerId(c.id)}
                            onEdit={() => { setEditingClientId(c.id); setClientForm(c); }}
                            onDelete={() => deleteClient(c.id)}
                            formatQuoteCurrency={formatQuoteCurrency}
                            bestSendWindowIST={bestSendWindowIST}
                          />
                        ))}
                      </div>
                      {filteredBuyers.length > visibleBuyers.length && (
                        <div className="flex justify-center pt-2">
                          <button
                            type="button"
                            onClick={() => setBuyerVisibleCount((count) => Math.min(count + buyerListPageSize, filteredBuyers.length))}
                            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-sky-200 hover:text-sky-700"
                          >
                            Load More Buyers
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </TwoColumnManager>
          )}

          {activeTab === 'phoneReachout' && (
            <div className="space-y-5">
              {/* Header and Statistics Panel */}
              <div className="bg-slate-950 text-white rounded-lg p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Outreach automation</p>
                    <h3 className="text-xl font-extrabold">Phone & WhatsApp Reachout</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      The CRM automatically finds which buyers have phone numbers registered directly or via linked CRM leads, and prepares quick WhatsApp intro templates.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded px-3 py-2 text-right">
                      <span className="block text-[9px] uppercase font-bold text-emerald-300">Ready for Reachout</span>
                      <span className="font-extrabold text-lg text-emerald-400">{reachoutBuyers.length} Buyers</span>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-right">
                      <span className="block text-[9px] uppercase font-bold text-slate-400">Total Buyers</span>
                      <span className="font-extrabold text-lg text-white">{clients.length} Buyers</span>
                    </div>
                  </div>
                </div>

                {/* Search and Filters */}
                <div className="mt-4 flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search reachout list by company, contact person, or phone number..."
                      value={reachoutSearchQuery}
                      onChange={(e) => setReachoutSearchQuery(e.target.value)}
                      className="w-full h-10 bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Main content grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Reachable Buyers list */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <h3 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      Identified Sourcing Contacts ({
                        reachoutBuyers.filter((b) => {
                          const query = reachoutSearchQuery.toLowerCase();
                          const phone = b.phone || clientPhones[b.id] || '';
                          return b.company_name.toLowerCase().includes(query) ||
                            (b.contact_name || '').toLowerCase().includes(query) ||
                            phone.includes(query);
                        }).length
                      })
                    </h3>

                    {reachoutBuyers.length === 0 ? (
                      <EmptyState text="No buyers with phone numbers identified in the CRM. You can add phone numbers to buyers below." />
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {reachoutBuyers
                          .filter((b) => {
                            const query = reachoutSearchQuery.toLowerCase();
                            const phone = b.phone || clientPhones[b.id] || '';
                            return b.company_name.toLowerCase().includes(query) ||
                              (b.contact_name || '').toLowerCase().includes(query) ||
                              phone.includes(query);
                          })
                          .map((b) => {
                            const phone = b.phone || clientPhones[b.id] || '';
                            const country = buyerCountry(b);
                            const lastActivity = activities.find((act) => act.client_id === b.id && act.title.toLowerCase().includes('whatsapp'));
                            
                            return (
                              <div key={b.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-extrabold text-slate-900 text-sm">{b.company_name}</h4>
                                    <SmallBadge text={country} />
                                  </div>
                                  <div className="text-slate-500 font-medium">
                                    Contact: <span className="text-slate-800">{b.contact_name || 'N/A'}</span>
                                    {b.contact_email && <span className="mx-1.5 text-slate-300">|</span>}
                                    {b.contact_email && <span className="text-slate-600">{b.contact_email}</span>}
                                  </div>
                                  {editingPhoneBuyerId === b.id ? (
                                    <div className="flex items-center gap-1.5 pt-0.5">
                                      <input
                                        type="text"
                                        aria-label="Edit Phone Number"
                                        value={editingPhoneValue}
                                        onChange={(e) => setEditingPhoneValue(e.target.value)}
                                        className="px-2 py-0.5 border border-slate-300 bg-slate-50 rounded text-xs font-mono w-44 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSavePhone(b.id, editingPhoneValue);
                                          if (e.key === 'Escape') setEditingPhoneBuyerId(null);
                                        }}
                                        autoFocus
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSavePhone(b.id, editingPhoneValue)}
                                        className="p-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded transition"
                                        title="Save Phone"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingPhoneBuyerId(null)}
                                        className="p-1 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded transition"
                                        title="Cancel"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600">
                                      <Phone className="h-3 w-3 text-slate-400" />
                                      <span>{phone}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingPhoneBuyerId(b.id);
                                          setEditingPhoneValue(phone);
                                        }}
                                        className="p-0.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition"
                                        title="Edit Phone"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  )}
                                  {lastActivity ? (
                                    <div className="text-[10px] text-emerald-600 font-medium">
                                      Last Reachout: {lastActivity.title} on {lastActivity.activity_date}
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-slate-400">
                                      No WhatsApp reachout logged yet
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 self-start sm:self-center">
                                  <button
                                    type="button"
                                    onClick={() => handleBuyerWhatsAppReachout(b, phone)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-sm transition active:scale-[0.98]"
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                    WhatsApp Intro
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedBuyerId(b.id)}
                                    className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-bold transition"
                                  >
                                    View 360
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side panel: Missing numbers */}
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <h3 className="text-sm font-extrabold text-slate-900 mb-2 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                      Missing Phone Numbers ({clients.length - reachoutBuyers.length})
                    </h3>
                    <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                      These buyers do not have a phone number in the system. Add their phone numbers to enable one-click WhatsApp outreach.
                    </p>

                    <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1 scroll-fade">
                      {clients
                        .filter((client) => {
                          const phone = client.phone || clientPhones[client.id] || '';
                          return !phone.trim();
                        })
                        .map((client) => (
                          <div key={client.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-3 text-xs">
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-800 truncate">{client.company_name}</h4>
                              <p className="text-[10px] text-slate-500 truncate">{client.contact_name || 'No contact name'}</p>
                            </div>
                            {editingPhoneBuyerId === client.id ? (
                              <div className="flex items-center gap-1 shrink-0">
                                <input
                                  type="text"
                                  aria-label="Add Phone Number"
                                  placeholder="Phone"
                                  value={editingPhoneValue}
                                  onChange={(e) => setEditingPhoneValue(e.target.value)}
                                  className="px-2 py-0.5 border border-slate-300 bg-white rounded text-[11px] font-mono w-28 focus:border-emerald-500 focus:outline-none"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSavePhone(client.id, editingPhoneValue);
                                    if (e.key === 'Escape') setEditingPhoneBuyerId(null);
                                  }}
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSavePhone(client.id, editingPhoneValue)}
                                  className="p-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded transition"
                                  title="Save Phone"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingPhoneBuyerId(null)}
                                  className="p-1 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded transition"
                                  title="Cancel"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPhoneBuyerId(client.id);
                                  setEditingPhoneValue('');
                                }}
                                className="shrink-0 px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded font-bold transition"
                              >
                                Add Phone
                              </button>
                            )}
                          </div>
                        ))}
                      {clients.length === reachoutBuyers.length && (
                        <div className="text-center py-4 text-[11px] text-slate-400 font-medium">
                          All buyers have phone numbers! 🎉
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Intro template details */}
                  <div className="bg-emerald-950 text-white rounded-xl p-4 shadow-sm space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Template Information</h4>
                    <p className="text-[11px] text-emerald-200 leading-relaxed">
                      WhatsApp Intro buttons use the <strong>WhatsApp Introduction</strong> category template. You can customize the body and variables of this message in the <strong>Mail & Message Templates</strong> tab.
                    </p>
                    <div className="bg-white/10 rounded p-2.5 text-[10px] border border-white/5 font-mono text-emerald-100">
                      Hello {'{{buyer_name}}'}, this is Sheshaan Global...
                    </div>
                  </div>
                </div>
              </div>
            </div>
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

          {activeTab === 'vendors' && (
            <TwoColumnManager
              formTitle={editingVendorId ? 'Edit Supplier / Vendor' : 'Add Supplier / Vendor'}
              onSubmit={saveVendor}
              onCancel={resetVendorForm}
              isEditing={Boolean(editingVendorId)}
              form={
                <>
                  <TextInput label="Company Name *" value={vendorForm.company_name || ''} onChange={(value) => setVendorForm({ ...vendorForm, company_name: value })} required />
                  <TextInput label="Contact Person" value={vendorForm.contact_name || ''} onChange={(value) => setVendorForm({ ...vendorForm, contact_name: value })} />
                  <TextInput label="Email" type="email" value={vendorForm.contact_email || ''} onChange={(value) => setVendorForm({ ...vendorForm, contact_email: value })} />
                  <TextInput label="Phone / WhatsApp" value={vendorForm.phone || ''} onChange={(value) => setVendorForm({ ...vendorForm, phone: value })} />
                  <TextInput label="City" value={vendorForm.city || ''} onChange={(value) => setVendorForm({ ...vendorForm, city: value })} />
                  <TextInput label="Country" value={vendorForm.country || ''} onChange={(value) => setVendorForm({ ...vendorForm, country: value })} />
                  <TextInput label="Product Categories" value={vendorForm.product_categories || ''} onChange={(value) => setVendorForm({ ...vendorForm, product_categories: value })} />
                  <TextInput label="Payment Terms" value={vendorForm.payment_terms || ''} onChange={(value) => setVendorForm({ ...vendorForm, payment_terms: value })} />
                  <NumberInput label="Rating (1-5)" value={Number(vendorForm.rating) || 3} onChange={(value) => setVendorForm({ ...vendorForm, rating: Math.max(1, Math.min(5, Math.round(value))) })} />
                  <SelectInput label="Status" value={vendorForm.status || 'Active'} onChange={(value) => setVendorForm({ ...vendorForm, status: value as Vendor['status'] })} options={['Active', 'Preferred', 'On Hold']} />
                  <TextArea label="Notes" value={vendorForm.notes || ''} onChange={(value) => setVendorForm({ ...vendorForm, notes: value })} />
                </>
              }
            >
              {vendors.length === 0 ? <EmptyState text="No suppliers or vendors registered yet." /> : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {vendors.map((vendor) => (
                    <div key={vendor.id} className="bg-white border border-slate-200 rounded-lg p-4 text-xs shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-900">{vendor.company_name}</div>
                          <div className="text-[10px] text-slate-500">{vendor.city || 'City N/A'}, {vendor.country || 'Country N/A'} | {vendor.status}</div>
                        </div>
                        <RowActions onEdit={() => { setEditingVendorId(vendor.id); setVendorForm(vendor); }} onDelete={() => deleteRecord('vendors', vendor.id, 'supplier/vendor')} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <SmallMetric label="Categories" value={vendor.product_categories || 'Not set'} />
                        <SmallMetric label="Payment" value={vendor.payment_terms || 'Not set'} />
                        <SmallMetric label="Rating" value={`${vendor.rating || 3}/5`} />
                        <SmallMetric label="Contact" value={vendor.contact_name || vendor.phone || 'Not set'} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {vendor.contact_email && <a href={`mailto:${vendor.contact_email}`} className="px-3 py-1.5 rounded bg-slate-900 text-white font-bold flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</a>}
                        {vendor.phone && <a target="_blank" rel="noreferrer" href={`https://wa.me/${vendor.phone.replace(/[^\d]/g, '')}`} className="px-3 py-1.5 rounded bg-emerald-600 text-white font-bold flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> WhatsApp</a>}
                      </div>
                    </div>
                  ))}
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

          {activeTab === 'accounts' && (
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <Stat icon={<FileCheck2 className="h-5 w-5" />} label="Invoice Value" value={formatQuoteCurrency(invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0), 'INR')} tone="sky" />
                <Stat icon={<CalendarCheck className="h-5 w-5" />} label="Receivable" value={formatQuoteCurrency(invoices.filter((invoice) => invoice.payment_status !== 'Paid').reduce((sum, invoice) => sum + Number(invoice.balance_amount || invoice.amount || 0), 0), 'INR')} tone="indigo" />
                <Stat icon={<CheckSquare className="h-5 w-5" />} label="Paid Invoices" value={invoices.filter((invoice) => invoice.payment_status === 'Paid').length.toString()} tone="teal" />
              </div>
              <DataTable headers={['Invoice', 'Type', 'Buyer', 'Amount', 'Balance', 'Status', 'Actions']}>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-100">
                    <td className="p-3 font-mono font-bold">{invoice.invoice_number}</td>
                    <td className="p-3">{invoice.invoice_type}</td>
                    <td className="p-3">{clients.find((client) => client.id === invoice.client_id)?.company_name || 'Unlinked'}</td>
                    <td className="p-3 text-right font-mono">{formatQuoteCurrency(Number(invoice.amount || 0), invoice.currency || 'INR')}</td>
                    <td className="p-3 text-right font-mono">{formatQuoteCurrency(Number(invoice.balance_amount || 0), invoice.currency || 'INR')}</td>
                    <td className="p-3"><SmallBadge text={invoice.payment_status} /></td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <PDFDownloadLink
                          document={<InvoicePDF invoice={invoice} client={clients.find((client) => client.id === invoice.client_id)} quote={quotes.find((quote) => quote.id === invoice.quote_id)} />}
                          fileName={`${invoice.invoice_number || 'invoice'}-sheshaan-global.pdf`}
                          className="p-1.5 hover:bg-sky-50 text-slate-500 hover:text-sky-700 rounded transition"
                          title="Download invoice PDF"
                        >
                          {({ loading: pdfLoading }) => pdfLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </PDFDownloadLink>
                        <RowActions onEdit={() => { setEditingInvoiceId(invoice.id); setInvoiceForm(invoice); }} onDelete={() => deleteRecord('invoices', invoice.id, 'invoice')} />
                      </div>
                    </td>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <Stat icon={<Ship className="h-5 w-5" />} label="Planning" value={shipments.filter((shipment) => shipment.status === 'Planning').length.toString()} tone="sky" />
                <Stat icon={<Package className="h-5 w-5" />} label="Booked/Stuffed" value={shipments.filter((shipment) => ['Booked', 'Stuffed'].includes(shipment.status)).length.toString()} tone="indigo" />
                <Stat icon={<Anchor className="h-5 w-5" />} label="Sailed" value={shipments.filter((shipment) => shipment.status === 'Sailed').length.toString()} tone="slate" />
                <Stat icon={<CheckSquare className="h-5 w-5" />} label="Delivered" value={shipments.filter((shipment) => shipment.status === 'Delivered').length.toString()} tone="teal" />
              </div>
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
            {selectedBuyer && (
              <BuyerDetailModal
                buyer={selectedBuyer}
                clientMetrics={clientMetrics}
                quotes={quotes}
                invoices={invoices}
                shipments={shipments}
                tasks={tasks}
                activities={activities}
                onClose={() => setSelectedBuyerId(null)}
                formatQuoteCurrency={formatQuoteCurrency}
                quoteValue={quoteValue}
              />
            )}
          </section>
        </div>
      </div>
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden" onClick={() => setShowMobileMenu(false)}>
          <div className="absolute left-0 top-0 h-full w-[88vw] max-w-sm bg-white shadow-2xl animate-slide-in-left overflow-y-auto mobile-safe-bottom" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-950 text-white p-4 z-10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded bg-white flex items-center justify-center overflow-hidden">
                    <Image src="/logo.png" alt="Sheshaan Global logo" width={40} height={40} className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold">Sheshaan Global</p>
                    <p className="text-[11px] text-slate-400">Admin Portal Menu</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowMobileMenu(false)} className="h-9 w-9 rounded bg-white/10 flex items-center justify-center" aria-label="Close menu">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <button
                onClick={() => {
                  setEditingQuoteId(null);
                  setShowMobileMenu(false);
                }}
                className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 bg-white text-slate-950 text-xs font-bold rounded shadow active:scale-[0.98] transition"
              >
                <Plus className="h-4 w-4" />
                New Quote
              </button>
            </div>
            <nav className="p-3">
              {navGroups.map((group) => (
                <div key={group.label} className="mb-4 last:mb-0">
                  <p className="px-3 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{group.label}</p>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => navigateToTab(item.key)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-left text-sm font-semibold transition ${activeTab === item.key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        {item.icon}
                        <span className="flex-1">{item.label}</span>
                        {typeof item.count === 'number' && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === item.key ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>{item.count}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
      <nav className="fixed inset-x-3 bottom-3 z-40 rounded-xl border border-slate-200 bg-white/95 backdrop-blur shadow-2xl lg:hidden mobile-safe-bottom">
        <div className="grid grid-cols-5 p-1">
          {mobilePrimaryNav.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => navigateToTab(item.key)}
              className={`min-h-14 rounded-lg flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition active:scale-95 ${activeTab === item.key ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
            >
              {item.icon}
              <span className="leading-none">{item.key === 'overview' ? 'Home' : item.key === 'crm' ? 'CRM' : item.key === 'quotes' ? 'Quotes' : 'Tasks'}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setShowNotifications(false);
              setShowMobileMenu(true);
            }}
            className="min-h-14 rounded-lg flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-slate-500 transition active:scale-95"
          >
            <Menu className="h-4 w-4" />
            <span className="leading-none">Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

const Stat = ({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'sky' | 'indigo' | 'slate' | 'teal' }) => {
  const colorMap = {
    sky: {
      bg: 'bg-sky-50 text-sky-600 border-sky-100',
      glow: 'hover:shadow-sky-100/50 hover:border-sky-300',
      iconBg: 'bg-sky-500/10 text-sky-600',
    },
    indigo: {
      bg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      glow: 'hover:shadow-indigo-100/50 hover:border-indigo-300',
      iconBg: 'bg-indigo-500/10 text-indigo-600',
    },
    slate: {
      bg: 'bg-slate-50 text-slate-600 border-slate-200',
      glow: 'hover:shadow-slate-100/50 hover:border-slate-350',
      iconBg: 'bg-slate-500/10 text-slate-600',
    },
    teal: {
      bg: 'bg-teal-50 text-teal-600 border-teal-100',
      glow: 'hover:shadow-teal-100/50 hover:border-teal-300',
      iconBg: 'bg-teal-500/10 text-teal-600',
    },
  }[tone];

  return (
    <div className={`group bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-lg transition-all duration-300 ${colorMap.glow}`}>
      <div className={`p-3 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110 ${colorMap.iconBg}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</span>
        <span className="block text-xl sm:text-2xl font-black text-slate-800 tracking-tight truncate" title={value}>{value}</span>
      </div>
    </div>
  );
};

const CrmMetric = ({ label, value, helper }: { label: string; value: string; helper: string }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 hover:bg-white/10 transition duration-250">
    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
    <span className="block text-xl font-extrabold text-white mt-1">{value}</span>
    <span className="block text-[10px] text-slate-400 mt-1">{helper}</span>
  </div>
);

const StatusBadge = ({ status }: { status: Quote['status'] }) => {
  const tone =
    status === 'Approved' || status === 'Closed'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : status === 'Sent' || status === 'Invoice Raised' || status === 'Shipped'
        ? 'bg-sky-50 text-sky-700 border-sky-100'
        : status === 'Lost' || status === 'Declined'
          ? 'bg-red-50 text-red-700 border-red-100'
          : status === 'Negotiation'
            ? 'bg-amber-50 text-amber-700 border-amber-100'
            : 'bg-slate-100 text-slate-700 border-slate-200';

  return <span className={`inline-block px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${tone}`}>{status}</span>;
};

const EmptyState = ({ text }: { text: string }) => (
  <div className="text-center py-12 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50 font-medium px-4">{text}</div>
);

const DashboardList = ({ title, empty, rows }: { title: string; empty: string; rows: { title: string; meta: string }[] }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
    <h3 className="font-extrabold text-slate-900 text-sm mb-4 relative pb-2 border-b border-slate-100 flex items-center">
      <span className="absolute bottom-[-1px] left-0 h-[2px] w-8 bg-indigo-500 rounded"></span>
      {title}
    </h3>
    {rows.length === 0 ? (
      <EmptyState text={empty} />
    ) : (
      <div className="space-y-2.5 text-xs">
        {rows.map((row) => (
          <div key={`${row.title}-${row.meta}`} className="rounded-xl border border-slate-100 bg-slate-50/30 p-3.5 transition-all duration-200 hover:border-sky-200 hover:bg-sky-50/20">
            <div className="font-bold text-slate-900 leading-snug">{row.title}</div>
            <div className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              {row.meta}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const RowActions = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => (
  <div className="flex items-center justify-center gap-1">
    <button type="button" onClick={onEdit} className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition" title="Edit">
      <Edit2 className="h-4 w-4" />
    </button>
    <button type="button" onClick={onDelete} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition" title="Delete">
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
  onCancel,
  scrollableForm = false
}: {
  formTitle: string;
  form: React.ReactNode;
  children: React.ReactNode;
  isEditing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  scrollableForm?: boolean;
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="bg-slate-50/90 p-5 rounded-2xl border border-slate-200 h-fit space-y-4 shadow-sm lg:sticky lg:top-24">
      <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-wider border-b border-slate-200 pb-2">{formTitle}</h3>
      <form onSubmit={onSubmit} className="space-y-3.5 text-xs">
        <div className={scrollableForm ? 'max-h-[52vh] overflow-y-auto pr-2 space-y-3.5 scroll-smooth' : 'space-y-3.5'}>
          {form}
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow transition flex items-center justify-center gap-1.5 active:scale-98">
            <Plus className="h-4 w-4" />
            {isEditing ? 'Update' : 'Save'}
          </button>
          {isEditing && (
            <button type="button" onClick={onCancel} className="px-3.5 py-2.5 bg-white border border-slate-300 text-slate-600 font-bold rounded-lg transition hover:bg-slate-50 active:scale-98">
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
    <div className="lg:col-span-2 space-y-4">{children}</div>
  </div>
);

const TextInput = ({ label, value, onChange, type = 'text', required = false, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) => (
  <label className="block">
    <span className="block text-slate-600 mb-1.5 font-bold tracking-wide text-[11px] uppercase">{label}</span>
    <input 
      type={type} 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      required={required} 
      placeholder={placeholder}
      className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all duration-200 shadow-sm" 
    />
  </label>
);

const NumberInput = ({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) => (
  <label className="block">
    <span className="block text-slate-600 mb-1.5 font-bold tracking-wide text-[11px] uppercase">{label}</span>
    <input 
      type="number" 
      step="0.01" 
      value={value || ''} 
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)} 
      className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-xs font-semibold text-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all duration-200 shadow-sm" 
    />
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
    <span className="block text-slate-600 mb-1.5 font-bold tracking-wide text-[11px] uppercase">{label}</span>
    <div className="relative">
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-xs font-semibold text-slate-800 appearance-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all duration-200 shadow-sm"
      >
        {options.map((option) => <option key={option} value={option}>{labels[option] || option || 'None'}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
    </div>
  </label>
);

const CheckboxInput = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) => (
  <label className="flex items-center gap-2.5 text-slate-600 cursor-pointer select-none">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4.5 w-4.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer" />
    <span className="font-bold text-xs">{label}</span>
  </label>
);

const TextArea = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <label className="block">
    <span className="block text-slate-600 mb-1.5 font-bold tracking-wide text-[11px] uppercase">{label}</span>
    <textarea 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      className="w-full p-3 border border-slate-200 rounded-lg bg-white text-xs font-semibold text-slate-800 min-h-24 resize-y focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all duration-200 shadow-sm" 
    />
  </label>
);

const DataTable = ({ headers, children }: { headers: string[]; children: React.ReactNode }) => (
  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm scroll-fade">
    <table className="w-full text-left border-collapse text-xs">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
          {headers.map((header) => <th key={header} className="p-3.5 whitespace-nowrap">{header}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>
);

const SimplePanel = ({ title, rows }: { title: string; rows: [string, string][] }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
    <h3 className="font-extrabold text-slate-900 text-sm mb-4 relative pb-2 border-b border-slate-100 flex items-center">
      <span className="absolute bottom-[-1px] left-0 h-[2px] w-8 bg-sky-500 rounded"></span>
      {title}
    </h3>
    <div className="space-y-2.5 text-xs">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-3 border-b border-slate-50 pb-2.5 last:border-b-0 last:pb-0">
          <span className="font-medium text-slate-500">{label}</span>
          <span className="font-bold text-slate-900 text-right break-words">{value}</span>
        </div>
      ))}
    </div>
  </div>
);

const SmallMetric = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 min-w-0">
    <span className="block text-[9px] uppercase font-bold text-slate-400">{label}</span>
    <span className="block font-bold text-slate-900 truncate mt-0.5" title={value}>{value}</span>
  </div>
);

const SmallBadge = ({ text }: { text: string }) => (
  <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold">{text}</span>
);

interface BuyerCardProps {
  client: Client;
  country: string;
  phone: string;
  metrics: {
    quotesCount: number;
    receivableValue: number;
    shipmentsCount: number;
    openTasksCount: number;
    lastActivityTitle: string;
  };
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  formatQuoteCurrency: (val: number, cur: 'INR' | 'USD') => string;
  bestSendWindowIST: (country: string) => string;
}

const BuyerCard: React.FC<BuyerCardProps> = React.memo(({
  client,
  country,
  phone,
  metrics,
  onView,
  onEdit,
  onDelete,
  formatQuoteCurrency,
  bestSendWindowIST
}) => {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
      <div className="flex justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-bold text-slate-900 truncate">{client.company_name}</h4>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <SmallBadge text={country} />
            <span className="inline-block px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-bold">
              {bestSendWindowIST(country).replace('Best send: ', '')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onView} className="px-2 py-1 bg-sky-50 text-sky-700 rounded font-bold hover:bg-sky-100">View</button>
          <RowActions onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
      <p className="text-slate-500 font-mono font-medium">{client.destination_port}</p>
      {client.address && <p className="text-[11px] text-slate-600 border-t pt-1.5">{client.address}</p>}
      <div className="text-[10px] text-slate-400 pt-1">
        <div>Contact: {client.contact_name || 'N/A'}</div>
        <div>Email: {client.contact_email || 'N/A'}</div>
        <div>Phone: {phone || 'N/A'}</div>
      </div>
      {client.products_dealing && client.products_dealing.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1.5 border-t border-dashed border-slate-100">
          {client.products_dealing.map((sku) => (
            <span key={sku} className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-extrabold uppercase tracking-wide">
              {sku}
            </span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
        {[
          ['Quotes', metrics.quotesCount.toString()],
          ['Receivable', formatQuoteCurrency(metrics.receivableValue, 'INR')],
          ['Shipments', metrics.shipmentsCount.toString()],
          ['Open Tasks', metrics.openTasksCount.toString()]
        ].map(([label, value]) => (
          <div key={label} className="bg-slate-50 rounded p-2">
            <span className="block text-[9px] uppercase font-bold text-slate-400">{label}</span>
            <span className="font-bold text-slate-900">{value}</span>
          </div>
        ))}
      </div>
      <div className="pt-2 text-[11px] text-slate-600">
        Last activity: {metrics.lastActivityTitle}
      </div>
    </div>
  );
});
BuyerCard.displayName = 'BuyerCard';

interface BuyerDetailModalProps {
  buyer: Client;
  clientMetrics: Record<string, {
    quotesCount: number;
    receivableValue: number;
    shipmentsCount: number;
    openTasksCount: number;
    lastActivityTitle: string;
  }>;
  quotes: Quote[];
  invoices: InvoiceRecord[];
  shipments: ShipmentRecord[];
  tasks: TaskRecord[];
  activities: TimelineActivity[];
  onClose: () => void;
  formatQuoteCurrency: (val: number, cur: 'INR' | 'USD') => string;
  quoteValue: (q: Quote) => number;
}

const BuyerDetailModal: React.FC<BuyerDetailModalProps> = React.memo(({
  buyer,
  clientMetrics,
  quotes,
  invoices,
  shipments,
  tasks,
  activities,
  onClose,
  formatQuoteCurrency,
  quoteValue
}) => {
  const metrics = clientMetrics[buyer.id] || {
    quotesCount: 0,
    receivableValue: 0,
    shipmentsCount: 0,
    openTasksCount: 0,
    lastActivityTitle: 'No activity logged'
  };

  const clientQuotes = quotes.filter((q) => q.client_id === buyer.id);
  const clientTasks = tasks.filter((t) => t.client_id === buyer.id && t.status !== 'Done');
  const clientShipments = shipments.filter((s) => s.client_id === buyer.id);
  const clientActivities = activities.filter((act) => act.client_id === buyer.id);

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/30 flex justify-end" onClick={onClose}>
      <div className="h-full w-full max-w-xl bg-white shadow-2xl overflow-y-auto animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Buyer 360 Detail</p>
            <h3 className="text-xl font-extrabold text-slate-900">{buyer.company_name}</h3>
            <p className="text-xs text-slate-500">{buyer.destination_port}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded hover:bg-slate-100 text-slate-500"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <SmallMetric label="Contact" value={buyer.contact_name || 'Not set'} />
            <SmallMetric label="Email" value={buyer.contact_email || 'Not set'} />
            <SmallMetric label="Quotes" value={metrics.quotesCount.toString()} />
            <SmallMetric label="Open Tasks" value={metrics.openTasksCount.toString()} />
          </div>
          <SimplePanel title="Financials" rows={[
            ['Quoted value', formatQuoteCurrency(clientQuotes.reduce((sum, quote) => sum + quoteValue(quote), 0), 'INR')],
            ['Receivable', formatQuoteCurrency(metrics.receivableValue, 'INR')],
            ['Invoices', invoices.filter((invoice) => invoice.client_id === buyer.id).length.toString()],
            ['Shipments', metrics.shipmentsCount.toString()]
          ]} />
          {buyer.products_dealing && buyer.products_dealing.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">Products Dealing In</h4>
              <div className="flex flex-wrap gap-2">
                {buyer.products_dealing.map((sku) => (
                  <span key={sku} className="inline-block px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wide">
                    {sku}
                  </span>
                ))}
              </div>
            </div>
          )}
          <DashboardList title="Recent Communication" empty="No communication logged." rows={clientActivities.slice(0, 5).map((activity) => ({
            title: activity.title,
            meta: `${activity.type} | ${activity.activity_date}`
          }))} />
          <DashboardList title="Active Shipments" empty="No active shipments." rows={clientShipments.map((shipment) => ({
            title: shipment.booking_number || shipment.vessel_name || 'Shipment',
            meta: `${shipment.status} | ETA ${shipment.eta || 'TBA'}`
          }))} />
        </div>
      </div>
    </div>
  );
});
BuyerDetailModal.displayName = 'BuyerDetailModal';

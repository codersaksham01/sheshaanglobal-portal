export interface Client {
  id: string;
  company_name: string;
  address: string;
  contact_name: string;
  contact_email: string;
  destination_port: string;
  created_at?: string;
  phone?: string;
}

export interface Product {
  id: string;
  sku: string;
  description: string;
  unit_price: number;
  cost_price?: number;
  weight?: number; // in kg
  dimensions?: string;
  created_at?: string;
}

export interface Vendor {
  id: string;
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  phone?: string;
  city?: string;
  country?: string;
  product_categories?: string;
  payment_terms?: string;
  rating?: number;
  status: 'Active' | 'Preferred' | 'On Hold';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FreightPreset {
  id: string;
  name: string;
  loading_port: string;
  destination_port: string;
  shipment_mode: string;
  freight_cost: number;
  insurance_cost: number;
  shipment_window?: string;
  transit_time?: string;
  partial_shipment?: string;
  container_type?: string;
  storage_condition?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Lead {
  id: string;
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  phone?: string;
  country?: string;
  product_interest?: string;
  estimated_value?: number;
  stage: 'New Lead' | 'Contacted' | 'Quoted' | 'Negotiation' | 'Won' | 'Lost';
  priority?: 'Low' | 'Medium' | 'High';
  owner?: string;
  next_follow_up?: string;
  notes?: string;
  client_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TimelineActivity {
  id: string;
  client_id?: string;
  lead_id?: string;
  quote_id?: string;
  type: 'Call' | 'Email' | 'Meeting' | 'Quote' | 'Invoice' | 'Shipment' | 'Note' | 'Status';
  title: string;
  details?: string;
  activity_date: string;
  owner?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TaskRecord {
  id: string;
  title: string;
  status: 'Open' | 'In Progress' | 'Done';
  priority: 'Low' | 'Medium' | 'High';
  due_date?: string;
  owner?: string;
  client_id?: string;
  lead_id?: string;
  quote_id?: string;
  invoice_id?: string;
  shipment_id?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  channel: 'Email' | 'WhatsApp' | 'SMS';
  category: 'Introduction' | 'Quote Follow-up' | 'Payment Reminder' | 'Shipment Update' | 'Document Sharing' | 'General';
  subject?: string;
  body: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FreightRateHistory {
  id: string;
  loading_port: string;
  destination_port: string;
  shipment_mode: string;
  forwarder?: string;
  freight_cost: number;
  insurance_cost: number;
  currency: 'INR' | 'USD';
  effective_date: string;
  validity_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceRecord {
  id: string;
  quote_id?: string;
  invoice_number: string;
  invoice_type: 'Proforma' | 'Tax';
  client_id?: string;
  amount: number;
  currency: 'INR' | 'USD';
  payment_status: 'Pending' | 'Part Paid' | 'Paid' | 'Overdue';
  advance_amount?: number;
  balance_amount?: number;
  due_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ShipmentRecord {
  id: string;
  quote_id?: string;
  invoice_id?: string;
  client_id?: string;
  booking_number?: string;
  vessel_name?: string;
  container_number?: string;
  seal_number?: string;
  bl_number?: string;
  etd?: string;
  eta?: string;
  status: 'Planning' | 'Booked' | 'Stuffed' | 'Sailed' | 'Arrived' | 'Delivered';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentChecklist {
  id: string;
  quote_id?: string;
  shipment_id?: string;
  commercial_invoice: boolean;
  packing_list: boolean;
  certificate_origin: boolean;
  phytosanitary: boolean;
  insurance: boolean;
  bill_of_lading: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Sales' | 'Accounts' | 'Operations';
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LogisticsSpecs {
  shipment_window?: string;
  transit_time?: string;
  partial_shipment?: string;
  container_type?: string;
  storage_condition?: string;
}

export interface Quote {
  id: string;
  quote_number: string;
  client_id: string;
  
  // Currency and Logistics
  currency: 'USD' | 'INR';
  origin_country: string;
  loading_port: string;
  shipment_mode: string;
  payment_terms: string;
  validity_days: number;
  
  // Detailed breakdown components
  packaging_cost: number;
  inland_haulage_cost: number;
  customs_clearance_cost: number;
  freight_cost: number;
  insurance_cost: number;
  
  status: 'Draft' | 'Sent' | 'Negotiation' | 'Approved' | 'Invoice Raised' | 'Shipped' | 'Closed' | 'Lost' | 'Declined';
  margin_per_kg?: number;
  internal_notes?: string;
  shipper_details?: ShipperDetails;
  bank_details?: BankDetails;
  commercial_note?: string; // Note on Commercial Structure
  
  // Page 2 parameters
  included_responsibilities?: string[];
  excluded_responsibilities?: string[];
  included_docs?: string[];
  logistics_specs?: LogisticsSpecs;
  commercial_terms?: string[];
  
  created_at?: string;
  updated_at?: string;
  client?: Client;
  items?: QuoteItem[];
}

export interface QuoteItem {
  id?: string;
  quote_id?: string;
  product_id?: string;
  sku: string;
  description: string;
  quantity: number;
  unit_price: number;
  cost_price?: number;
  weight?: number; // unit weight in kg
  
  // Specific offer parameters
  hs_code?: string;
  packing_container?: string; // e.g. "325 Jute Bags (40 kg Net / Bag)"
  basis_of_calculation?: string; // e.g. "Per kg (13,000 kg)"
}

export interface ShipperDetails {
  company_name: string;
  address: string;
  contact_name: string;
  contact_email: string;
  tax_id?: string;
}

export interface BankDetails {
  beneficiary_bank: string;
  branch_location: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  swift_code: string;
}

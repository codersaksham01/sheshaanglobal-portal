import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Client, Product, Quote, QuoteItem, ShipperDetails, LogisticsSpecs, FreightPreset, BankDetails } from '../lib/types';
import { Plus, Trash2, Save, Eye, ArrowLeft, Loader2, Download } from 'lucide-react';
import { QuotePDF } from './QuotePDF';
import dynamic from 'next/dynamic';

const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFViewer),
  { ssr: false }
);

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

interface QuoteFormProps {
  quoteId?: string | null;
  onSaveSuccess: () => void;
  onCancel: () => void;
}

class PdfPreviewBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full min-h-[320px] border border-amber-200 bg-amber-50 text-amber-900 rounded flex items-center justify-center p-6 text-center text-sm">
          PDF preview could not render. Your quote data is still saved; hide and show the preview again after checking required fields.
        </div>
      );
    }

    return this.props.children;
  }
}

export const QuoteForm: React.FC<QuoteFormProps> = ({ quoteId, onSaveSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [freightPresets, setFreightPresets] = useState<FreightPreset[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const [bankDefaultStatus, setBankDefaultStatus] = useState('');
  const autosaveReadyRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraftRef = useRef<Record<string, unknown> | null>(null);

  // Defaults Exporter Info
  const defaultShipper: ShipperDetails = {
    company_name: 'Sheshaan Global',
    address: 'Plot No. 1459, Opp. M.A.K. Azad Urdu School, Aasinagar, Nagpur - 440017, Maharashtra, India',
    contact_name: 'Sana Zeba Bakshi (CEO)',
    contact_email: 'info@sheshaanglobal.com',
    tax_id: 'GST | APEDA | FSSAI'
  };

  const defaultBankDetails: BankDetails = {
    beneficiary_bank: 'State Bank of India (SBI)',
    branch_location: 'Nagpur Main Branch, Civil Lines, Nagpur, India',
    account_holder_name: 'Sheshaan Global Export Account',
    account_number: '334455667788',
    ifsc_code: 'SBIN0000432',
    swift_code: 'SBININBBXXX'
  };
  const bankDefaultKey = 'crixy-default-bank-details';

  const readDefaultBankDetails = (): BankDetails => {
    if (typeof window === 'undefined') return defaultBankDetails;

    try {
      const raw = window.localStorage.getItem(bankDefaultKey);
      return raw ? { ...defaultBankDetails, ...JSON.parse(raw) } : defaultBankDetails;
    } catch (err) {
      console.warn('Error reading default bank details:', err);
      return defaultBankDetails;
    }
  };

  // Pre-filled defaults lists
  const defaultIncluded = [
    'Complete raw product cost & export packing in 40 kg Jute Bags',
    'Inland haulage and transportation from factory to Mundra Port',
    'Terminal Handling Charges (THC) & container stuffing at origin port',
    'Export customs clearance, shipping bill, COO, and Phytosanitary Certificate',
    'Main ocean freight from Mundra to destination port (lump sum)',
    'Marine transit cargo insurance policy (lump sum coverage)'
  ];

  const defaultExcluded = [
    'Import duties, tariffs, and local destination taxes / VAT in destination country',
    'Destination port terminal handling charges (THC at destination port)',
    'Import customs clearance and local destination documentation',
    'Inland transport/delivery from discharge port to buyer warehouse',
    'Container demurrage, detention, or storage fees at destination port',
    'Buyer-requested third-party pre-shipment or destination inspection/testing fees (e.g. SGS / Intertek) unless explicitly agreed in writing.'
  ];

  const defaultDocs = [
    'Commercial Invoice (Issued)',
    'Packing List (Issued)',
    'Bill of Lading (Clean On-Board B/L)',
    'Marine Insurance Certificate',
    'Certificate of Origin (Issued)',
    'Phytosanitary Certificate (Issued)'
  ];

  const defaultLogisticsSpecs: LogisticsSpecs = {
    shipment_window: '10-14 days post advance payment/LC confirmation',
    transit_time: '7-12 days (approx., subject to carrier schedule)',
    partial_shipment: 'Allowed / Allowed',
    container_type: '20ft FCL Dry Container / Ambient Storage',
    storage_condition: 'Store in a cool, dry place away from direct sunlight'
  };

  const defaultCommercialTerms = [
    'Quotation Validity & Ocean Freight Adjustments: Quoted rates are valid for 15 days from issuance. Ocean freight rates, insurance premiums, and exchange rates remain indicative until final vessel booking confirmation.',
    'Payment Terms: 50% advance payment upon proforma invoice acceptance; balance 50% payable against soft copy of Shipping Bill / Bill of Lading (B/L).',
    'Currency Exchange Protections & Settlement: All prices are quoted in Indian Rupees (INR) based on a baseline exchange rate. Final proforma invoicing and settlement may be converted to USD or AED at prevailing RBI reference rates upon agreement.',
    'Quality Assurance & Pre-Shipment Photos: Goods are supplied strictly per contract specifications. Pre-shipment quality inspection reports, container stuffing/loading photographs, and seal numbers will be provided prior to vessel departure.',
    'Claims & Discrepancies: Any product quality or weight claims must be reported in writing within 48 hours of cargo arrival at destination port, supported by an official independent surveyor report and photographs.',
    'Force Majeure: Seller shall not be held liable for shipment delays or non-performance resulting from vessel delays, port congestion, acts of God, strikes, or unexpected customs policy changes.',
    'Governing Law & Dispute Resolution: This contract shall be governed by Indian Maritime and Commercial Law. Any dispute arising under this agreement shall be subject to the exclusive jurisdiction of the courts in Nagpur, Maharashtra, India, or resolved through binding arbitration.'
  ];

  // Core Form States
  const [quoteNumber, setQuoteNumber] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'INR'>('INR');
  const [originCountry, setOriginCountry] = useState('India');
  const [loadingPort, setLoadingPort] = useState('Mundra Port, India');
  const [shipmentMode, setShipmentMode] = useState('Sea Freight (1x20ft FCL)');
  const [paymentTerms, setPaymentTerms] = useState('50% Advance, 50% vs Shipping Bill');
  const [validityDays, setValidityDays] = useState<number>(15);
  
  // Cost breakdown
  const [packagingCost, setPackagingCost] = useState<number>(0);
  const [inlandHaulageCost, setInlandHaulageCost] = useState<number>(0);
  const [customsClearanceCost, setCustomsClearanceCost] = useState<number>(0);
  const [freightCost, setFreightCost] = useState<number>(0);
  const [insuranceCost, setInsuranceCost] = useState<number>(0);
  
  const [status, setStatus] = useState<Quote['status']>('Draft');
  const [marginPerKg, setMarginPerKg] = useState<number>(10);
  const [internalNotes, setInternalNotes] = useState('');
  const [shipper, setShipper] = useState<ShipperDetails>(defaultShipper);
  const [bankDetails, setBankDetails] = useState<BankDetails>(defaultBankDetails);
  const [lineItems, setLineItems] = useState<QuoteItem[]>([]);
  const [commercialNote, setCommercialNote] = useState('Base FOB product price incorporates a commercial margin of INR 10.00/kg. FOB sub-components, main ocean freight, and marine insurance are transparently itemized above.');

  // Page 2 Lists States
  const [includedScope, setIncludedScope] = useState<string[]>(defaultIncluded);
  const [excludedScope, setExcludedScope] = useState<string[]>(defaultExcluded);
  const [docList, setDocList] = useState<string[]>(defaultDocs);
  const [specMap, setSpecMap] = useState<LogisticsSpecs>(defaultLogisticsSpecs);
  const [commercialTerms, setCommercialTerms] = useState<string[]>(defaultCommercialTerms);

  // Preview options
  const [showPreview, setShowPreview] = useState(false);
  const [previewDocType, setPreviewDocType] = useState<'quotation' | 'invoice' | 'packing_list'>('quotation');
  const [selectedFreightPresetId, setSelectedFreightPresetId] = useState('');

  const draftKey = `crixy-quote-draft-${quoteId || 'new'}`;

  const getDraftPayload = () => ({
    quoteNumber,
    selectedClientId,
    currency,
    originCountry,
    loadingPort,
    shipmentMode,
    paymentTerms,
    validityDays,
    packagingCost,
    inlandHaulageCost,
    customsClearanceCost,
    freightCost,
    insuranceCost,
    status,
    marginPerKg,
    internalNotes,
    shipper,
    bankDetails,
    lineItems,
    commercialNote,
    includedScope,
    excludedScope,
    docList,
    specMap,
    commercialTerms,
    savedAt: new Date().toISOString()
  });

  useEffect(() => {
    latestDraftRef.current = getDraftPayload();
  });

  const writeLatestDraft = () => {
    if (typeof window !== 'undefined' && autosaveReadyRef.current && latestDraftRef.current) {
      window.localStorage.setItem(draftKey, JSON.stringify({
        ...latestDraftRef.current,
        savedAt: new Date().toISOString()
      }));
    }
  };

  const applyDraftPayload = (draft: ReturnType<typeof getDraftPayload>) => {
    setQuoteNumber(draft.quoteNumber || '');
    setSelectedClientId(draft.selectedClientId || '');
    setCurrency(draft.currency || 'INR');
    setOriginCountry(draft.originCountry || 'India');
    setLoadingPort(draft.loadingPort || 'Mundra Port, India');
    setShipmentMode(draft.shipmentMode || 'Sea Freight (1x20ft FCL)');
    setPaymentTerms(draft.paymentTerms || '50% Advance, 50% vs Shipping Bill');
    setValidityDays(Number(draft.validityDays) || 15);
    setPackagingCost(Number(draft.packagingCost) || 0);
    setInlandHaulageCost(Number(draft.inlandHaulageCost) || 0);
    setCustomsClearanceCost(Number(draft.customsClearanceCost) || 0);
    setFreightCost(Number(draft.freightCost) || 0);
    setInsuranceCost(Number(draft.insuranceCost) || 0);
    setStatus(draft.status || 'Draft');
    setMarginPerKg(Number(draft.marginPerKg) || 0);
    setInternalNotes(draft.internalNotes || '');
    setShipper(draft.shipper || defaultShipper);
    setBankDetails(draft.bankDetails || readDefaultBankDetails());
    setLineItems(draft.lineItems || []);
    setCommercialNote(draft.commercialNote || '');
    setIncludedScope(draft.includedScope || defaultIncluded);
    setExcludedScope(draft.excludedScope || defaultExcluded);
    setDocList(draft.docList || defaultDocs);
    setSpecMap(draft.specMap || defaultLogisticsSpecs);
    setCommercialTerms(draft.commercialTerms || defaultCommercialTerms);
  };

  const restoreDraft = () => {
    if (typeof window === 'undefined') return;

    const raw = window.localStorage.getItem(draftKey);
    if (raw) {
      try {
        const draft = JSON.parse(raw);
        applyDraftPayload(draft);
        const savedTime = draft.savedAt ? new Date(draft.savedAt).toLocaleString() : 'recently';
        setDraftStatus(`Autosaved draft restored from ${savedTime}`);
      } catch (err) {
        console.warn('Error restoring autosaved draft:', err);
        setDraftStatus('Autosave ready');
      }
    } else {
      setDraftStatus('Autosave ready');
    }

    autosaveReadyRef.current = true;
  };

  const clearDraft = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(draftKey);
    }
    setDraftStatus('Draft cleared after save');
  };

  // Load clients and products
  useEffect(() => {
    setIsMounted(true);
    fetchClientsAndProducts();
  }, []);

  // Load quote details if in edit mode
  useEffect(() => {
    autosaveReadyRef.current = false;
    setDraftStatus('Preparing autosave...');

    if (quoteId) {
      fetchQuoteDetails(quoteId);
    } else {
      // Clear forms for creation
      setSelectedClientId('');
      setCurrency('INR');
      setOriginCountry('India');
      setLoadingPort('Mundra Port, India');
      setShipmentMode('Sea Freight (1x20ft FCL)');
      setPaymentTerms('50% Advance, 50% vs Shipping Bill');
      setValidityDays(15);
      
      setPackagingCost(0);
      setInlandHaulageCost(0);
      setCustomsClearanceCost(0);
      setFreightCost(0);
      setInsuranceCost(0);
      
      setStatus('Draft');
      setMarginPerKg(10);
      setInternalNotes('');
      setShipper(defaultShipper);
      setBankDetails(readDefaultBankDetails());
      setLineItems([]);
      setCommercialNote('Base FOB product price incorporates a commercial margin of INR 10.00/kg. FOB sub-components, main ocean freight, and marine insurance are transparently itemized above.');
      
      setIncludedScope(defaultIncluded);
      setExcludedScope(defaultExcluded);
      setDocList(defaultDocs);
      setSpecMap(defaultLogisticsSpecs);
      setCommercialTerms(defaultCommercialTerms);
      generateNextQuoteNumber().then(() => restoreDraft());
    }
  }, [quoteId]);

  // Autosave reads the latest draft through a ref so close/navigation saves fresh state.
  useEffect(() => {
    if (!isMounted || !autosaveReadyRef.current || typeof window === 'undefined') return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      writeLatestDraft();
      setDraftStatus(`Autosaved at ${new Date().toLocaleTimeString()}`);
    }, 500);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [
    isMounted,
    draftKey,
    quoteNumber,
    selectedClientId,
    currency,
    originCountry,
    loadingPort,
    shipmentMode,
    paymentTerms,
    validityDays,
    packagingCost,
    inlandHaulageCost,
    customsClearanceCost,
    freightCost,
    insuranceCost,
    status,
    marginPerKg,
    internalNotes,
    shipper,
    lineItems,
    commercialNote,
    includedScope,
    excludedScope,
    docList,
    specMap,
    commercialTerms
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeunload', writeLatestDraft);
    return () => {
      writeLatestDraft();
      window.removeEventListener('beforeunload', writeLatestDraft);
    };
  }, [draftKey]);

  const generateNextQuoteNumber = async () => {
    try {
      const { data } = await supabase.from('quotes').select('*');
      const year = new Date().getFullYear();
      const next = ((data || []) as Quote[]).reduce((max, quote) => {
        const match = quote.quote_number?.match(new RegExp(`SG-CIF-${year}-(\\d+)$`));
        return match ? Math.max(max, Number(match[1])) : max;
      }, 0) + 1;
      setQuoteNumber(`SG-CIF-${year}-${String(next).padStart(4, '0')}`);
    } catch (err) {
      console.warn('Error generating quote number:', err);
      setQuoteNumber(`SG-CIF-${new Date().getFullYear()}-0001`);
    }
  };

  const fetchClientsAndProducts = async () => {
    try {
      const { data: clientsData } = await supabase.from('clients').select('*');
      const { data: productsData } = await supabase.from('products').select('*');
      const { data: presetData } = await supabase.from('freight_presets').select('*');
      setClients(clientsData || []);
      setProducts(productsData || []);
      setFreightPresets(presetData || []);
    } catch (err) {
      console.warn('Error fetching catalog data:', err);
    }
  };

  const fetchQuoteDetails = async (id: string) => {
    setLoading(true);
    try {
      const { data: q, error } = await supabase
        .from('quotes')
        .select(`
          *,
          client:clients(*),
          items:quote_items(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (q) {
        setQuoteNumber(q.quote_number);
        setSelectedClientId(q.client_id || '');
        setCurrency(q.currency || 'INR');
        setOriginCountry(q.origin_country || 'India');
        setLoadingPort(q.loading_port || 'Mundra Port, India');
        setShipmentMode(q.shipment_mode || 'Sea Freight (1x20ft FCL)');
        setPaymentTerms(q.payment_terms || '50% Advance, 50% vs Shipping Bill');
        setValidityDays(Number(q.validity_days) || 15);
        
        setPackagingCost(Number(q.packaging_cost) || 0);
        setInlandHaulageCost(Number(q.inland_haulage_cost) || 0);
        setCustomsClearanceCost(Number(q.customs_clearance_cost) || 0);
        setFreightCost(Number(q.freight_cost) || 0);
        setInsuranceCost(Number(q.insurance_cost) || 0);
        
        setStatus(q.status);
        setMarginPerKg(Number(q.margin_per_kg) || 0);
        setInternalNotes(q.internal_notes || '');
        if (q.shipper_details) setShipper(q.shipper_details as ShipperDetails);
        setBankDetails((q.bank_details as BankDetails) || readDefaultBankDetails());
        setCommercialNote(q.commercial_note || '');
        setLineItems(q.items || []);

        setIncludedScope(q.included_responsibilities || defaultIncluded);
        setExcludedScope(q.excluded_responsibilities || defaultExcluded);
        setDocList(q.included_docs || defaultDocs);
        setSpecMap(q.logistics_specs || defaultLogisticsSpecs);
        setCommercialTerms(q.commercial_terms || defaultCommercialTerms);
      }
      restoreDraft();
    } catch (err) {
      console.warn('Error fetching quote details:', err);
      alert('Could not load quote details.');
      restoreDraft();
    } finally {
      setLoading(false);
    }
  };

  // Add Item to Specifications
  const handleAddLineItem = (productId: string) => {
    if (productId === 'custom') {
      const newItem: QuoteItem = {
        sku: 'CUMIN-SG99',
        description: 'Cumin Seeds Singapore 99 (Jeera)\n- Quality: Machine Cleaned / Sortex Cleaned\n- Purity: 99% Min\n- Moisture: 8-9% Max',
        quantity: 13000,
        unit_price: 228.27,
        cost_price: 218.27,
        weight: 1.0,
        hs_code: '09093129',
        packing_container: '325 Jute Bags (40 kg Net / Bag)',
        basis_of_calculation: 'Per kg (13,000 kg)'
      };
      setLineItems([...lineItems, newItem]);
      return;
    }

    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const newItem: QuoteItem = {
      product_id: prod.id,
      sku: prod.sku,
      description: prod.description,
      quantity: 13000,
      unit_price: Number(prod.unit_price) || 0,
      cost_price: Number(prod.cost_price) || Math.max((Number(prod.unit_price) || 0) - marginPerKg, 0),
      weight: Number(prod.weight) || 1.0,
      hs_code: '09093129',
      packing_container: '325 Jute Bags (40 kg Net / Bag)',
      basis_of_calculation: 'Per kg (13,000 kg)'
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleUpdateLineItem = (index: number, fields: Partial<QuoteItem>) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], ...fields };
    
    // Auto sync basis of calculation on quantity change
    if (fields.quantity !== undefined) {
      updated[index].basis_of_calculation = `Per kg (${new Intl.NumberFormat('en-US').format(fields.quantity)} kg)`;
    }
    
    setLineItems(updated);
  };

  const updateBankDetails = (fields: Partial<BankDetails>) => {
    setBankDetails({ ...bankDetails, ...fields });
  };

  const handleSetBankDefault = () => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(bankDefaultKey, JSON.stringify(bankDetails));
    setBankDefaultStatus('Default bank details saved');
  };

  const handleUseBankDefault = () => {
    setBankDetails(readDefaultBankDetails());
    setBankDefaultStatus('Default bank details applied');
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Calculations
  const goodsSubtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const internalGoodsCost = lineItems.reduce((sum, item) => sum + item.quantity * Number(item.cost_price || 0), 0);
  const totalWeight = lineItems.reduce((sum, item) => sum + (item.quantity * (item.weight || 0)), 0);
  const estimatedMargin = goodsSubtotal - internalGoodsCost;
  const estimatedMarginPerKg = totalWeight > 0 ? estimatedMargin / totalWeight : 0;
  const totalFOB = goodsSubtotal + packagingCost + inlandHaulageCost + customsClearanceCost;
  const totalCIF = totalFOB + freightCost + insuranceCost;

  const applyFreightPreset = (presetId: string) => {
    setSelectedFreightPresetId(presetId);
    const preset = freightPresets.find((item) => item.id === presetId);
    if (!preset) return;

    setLoadingPort(preset.loading_port);
    setShipmentMode(preset.shipment_mode);
    setFreightCost(Number(preset.freight_cost) || 0);
    setInsuranceCost(Number(preset.insurance_cost) || 0);
    setSpecMap({
      shipment_window: preset.shipment_window || specMap.shipment_window,
      transit_time: preset.transit_time || specMap.transit_time,
      partial_shipment: preset.partial_shipment || specMap.partial_shipment,
      container_type: preset.container_type || specMap.container_type,
      storage_condition: preset.storage_condition || specMap.storage_condition
    });
  };

  // List Updates
  const handleAddListItem = (list: 'included' | 'excluded' | 'docs' | 'terms') => {
    if (list === 'included') setIncludedScope([...includedScope, '']);
    else if (list === 'excluded') setExcludedScope([...excludedScope, '']);
    else if (list === 'docs') setDocList([...docList, '']);
    else if (list === 'terms') setCommercialTerms([...commercialTerms, '']);
  };

  const handleRemoveListItem = (list: 'included' | 'excluded' | 'docs' | 'terms', index: number) => {
    if (list === 'included') setIncludedScope(includedScope.filter((_, i) => i !== index));
    else if (list === 'excluded') setExcludedScope(excludedScope.filter((_, i) => i !== index));
    else if (list === 'docs') setDocList(docList.filter((_, i) => i !== index));
    else if (list === 'terms') setCommercialTerms(commercialTerms.filter((_, i) => i !== index));
  };

  const handleUpdateListValue = (list: 'included' | 'excluded' | 'docs' | 'terms', index: number, value: string) => {
    if (list === 'included') {
      const copy = [...includedScope];
      copy[index] = value;
      setIncludedScope(copy);
    } else if (list === 'excluded') {
      const copy = [...excludedScope];
      copy[index] = value;
      setExcludedScope(copy);
    } else if (list === 'docs') {
      const copy = [...docList];
      copy[index] = value;
      setDocList(copy);
    } else if (list === 'terms') {
      const copy = [...commercialTerms];
      copy[index] = value;
      setCommercialTerms(copy);
    }
  };

  // Save Quote
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      alert('Please select a Buyer/Client.');
      return;
    }
    if (lineItems.length === 0) {
      alert('Please add at least one product line item.');
      return;
    }

    setLoading(true);
    try {
      const quotePayload = {
        quote_number: quoteNumber,
        client_id: selectedClientId,
        currency,
        origin_country: originCountry,
        loading_port: loadingPort,
        shipment_mode: shipmentMode,
        payment_terms: paymentTerms,
        validity_days: validityDays,
        
        packaging_cost: packagingCost,
        inland_haulage_cost: inlandHaulageCost,
        customs_clearance_cost: customsClearanceCost,
        freight_cost: freightCost,
        insurance_cost: insuranceCost,
        
        status,
        margin_per_kg: marginPerKg,
        internal_notes: internalNotes,
        shipper_details: shipper,
        bank_details: bankDetails,
        commercial_note: commercialNote,
        
        included_responsibilities: includedScope,
        excluded_responsibilities: excludedScope,
        included_docs: docList,
        logistics_specs: specMap,
        commercial_terms: commercialTerms,
        
        updated_at: new Date().toISOString()
      };

      let quoteResultId = quoteId;

      if (quoteId) {
        const { error: quoteErr } = await supabase
          .from('quotes')
          .update(quotePayload)
          .eq('id', quoteId);

        if (quoteErr) throw quoteErr;

        const { error: deleteErr } = await supabase
          .from('quote_items')
          .delete()
          .eq('quote_id', quoteId);

        if (deleteErr) throw deleteErr;
      } else {
        const { data: newQuote, error: quoteErr } = await supabase
          .from('quotes')
          .insert([quotePayload])
          .select()
          .single();

        if (quoteErr) throw quoteErr;
        quoteResultId = newQuote.id;
      }

      const itemsPayload = lineItems.map(item => ({
        quote_id: quoteResultId,
        product_id: item.product_id || null,
        sku: item.sku,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        cost_price: item.cost_price || 0,
        weight: item.weight || 0,
        hs_code: item.hs_code,
        packing_container: item.packing_container,
        basis_of_calculation: item.basis_of_calculation
      }));

      const { error: itemsErr } = await supabase
        .from('quote_items')
        .insert(itemsPayload);

      if (itemsErr) throw itemsErr;

      // Update CRM lead stage to 'Quoted'
      if (selectedClientId) {
        const { data: leadData } = await supabase.from('leads').select('*').eq('client_id', selectedClientId);
        const lead = leadData?.[0];
        if (lead) {
          await supabase.from('leads').update({
            stage: 'Quoted'
          }).eq('id', lead.id);
        } else {
          const clientObj = clients.find(c => c.id === selectedClientId);
          if (clientObj) {
            const { data: leadByCompany } = await supabase.from('leads').select('*').eq('company_name', clientObj.company_name);
            const leadComp = leadByCompany?.[0];
            if (leadComp) {
              await supabase.from('leads').update({
                stage: 'Quoted'
              }).eq('id', leadComp.id);
            }
          }
        }
      }

      alert(quoteId ? 'Deal details updated!' : 'Deal saved successfully!');
      clearDraft();
      onSaveSuccess();
    } catch (err: any) {
      console.warn('Error saving quote:', err);
      setLoading(false);
    }
  };

  const currentClient = clients.find(c => c.id === selectedClientId);
  const tempQuoteForPDF: Quote = {
    id: quoteId || 'temp',
    quote_number: quoteNumber,
    client_id: selectedClientId,
    currency,
    origin_country: originCountry,
    loading_port: loadingPort,
    shipment_mode: shipmentMode,
    payment_terms: paymentTerms,
    validity_days: validityDays,
    packaging_cost: packagingCost,
    inland_haulage_cost: inlandHaulageCost,
    customs_clearance_cost: customsClearanceCost,
    freight_cost: freightCost,
    insurance_cost: insuranceCost,
    status,
    margin_per_kg: marginPerKg,
    internal_notes: internalNotes,
    shipper_details: shipper,
    bank_details: bankDetails,
    commercial_note: commercialNote,
    client: currentClient,
    items: lineItems,
    included_responsibilities: includedScope,
    excluded_responsibilities: excludedScope,
    included_docs: docList,
    logistics_specs: specMap,
    commercial_terms: commercialTerms,
    created_at: new Date().toISOString()
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const documentLabelMap = {
    quotation: 'CIF Quotation',
    invoice: 'Commercial Invoice',
    packing_list: 'Packing List'
  };
  const pdfFileName = `${quoteNumber || 'export-document'}-${previewDocType}.pdf`.replace(/[^a-z0-9_.-]/gi, '-');
  const downloadButtonClass = 'inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded shadow transition min-h-9';

  return (
    <div className="bg-white sm:rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Upper Navigation Bar */}
      <div className="bg-slate-900 px-3 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <button 
            type="button" 
            onClick={() => {
              writeLatestDraft();
              onCancel();
            }}
            className="p-1 hover:bg-slate-800 rounded transition shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-base sm:text-lg font-semibold flex flex-wrap items-center gap-2 min-w-0">
            <span className="break-words">{quoteId ? `Edit Deal Details: ${quoteNumber}` : 'New Export Deal & PDF Maker'}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-mono ${currency === 'INR' ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`}>
              {currency} Mode
            </span>
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {draftStatus && (
            <span className="hidden md:inline text-[10px] text-slate-300 font-medium">
              {draftStatus}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium rounded transition min-h-9"
          >
            <Eye className="h-4 w-4" />
            <span className="sm:hidden">{showPreview ? 'Hide Preview' : 'Preview'}</span>
            <span className="hidden sm:inline">{showPreview ? 'Hide Live PDF Preview' : 'Show Live PDF Preview'}</span>
          </button>
          {isMounted && (
            <PDFDownloadLink
              document={<QuotePDF quote={tempQuoteForPDF} documentType={previewDocType} />}
              fileName={pdfFileName}
              className={downloadButtonClass}
            >
              {({ loading: pdfLoading }) => (
                <>
                  {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download PDF
                </>
              )}
            </PDFDownloadLink>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 text-xs font-semibold rounded shadow transition min-h-9"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:min-h-[650px]">
        {/* Left Side Inputs Form */}
        <form onSubmit={handleSave} className={`flex-1 p-3 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto lg:max-h-[750px] ${showPreview ? 'lg:max-w-[48%]' : ''}`}>
          
          {/* Header Banners Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quote Reference Code</label>
              <input
                type="text"
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono focus:ring-1 focus:ring-sky-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Transaction Currency</label>
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-200 rounded border">
                <button
                  type="button"
                  onClick={() => setCurrency('INR')}
                  className={`py-1 text-xs font-medium rounded transition ${currency === 'INR' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}
                >
                  INR (Rs)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`py-1 text-xs font-medium rounded transition ${currency === 'USD' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}
                >
                  USD ($)
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Quote['status'])}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
              >
                {quoteStatuses.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 1: Exporter / Buyer Selection */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-1">1. Exporter & Buyer Parties</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Buyer Consignee *</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  required
                >
                  <option value="">-- Choose Buyer --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Signatory Representative (Exporter)</label>
                <input
                  type="text"
                  value={shipper.contact_name}
                  onChange={(e) => setShipper({ ...shipper, contact_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Logistics Meta */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-1">2. Logistics Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-sky-50 border border-sky-100 rounded-lg p-3">
              <div className="md:col-span-2">
                <label className="block text-sky-700 font-semibold mb-1">Apply Freight & Insurance Preset</label>
                <select
                  value={selectedFreightPresetId}
                  onChange={(e) => {
                    applyFreightPreset(e.target.value);
                  }}
                  className="w-full px-3 py-1.5 border border-sky-200 bg-white rounded focus:ring-1 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="">Choose a saved route preset...</option>
                  {freightPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} - {preset.loading_port} to {preset.destination_port}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-[11px] text-sky-700 flex items-end">
                Manage presets from the Freight Presets tab on the dashboard.
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Origin Country</label>
                <input
                  type="text"
                  value={originCountry}
                  onChange={(e) => setOriginCountry(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Loading Port</label>
                <input
                  type="text"
                  value={loadingPort}
                  onChange={(e) => setLoadingPort(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Shipment Mode / Container</label>
                <input
                  type="text"
                  value={shipmentMode}
                  onChange={(e) => setShipmentMode(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Payment Terms</label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Discharge Destination Port</label>
                <input
                  type="text"
                  value={currentClient?.destination_port || 'N/A'}
                  disabled
                  className="w-full px-3 py-1.5 border border-slate-200 bg-slate-100 text-slate-500 rounded"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Quotation Validity (Days)</label>
                <input
                  type="number"
                  value={validityDays}
                  onChange={(e) => setValidityDays(parseInt(e.target.value) || 15)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Commercial Offer Specification List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-1">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">3. Commercial Offer Goods</h3>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddLineItem(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="px-2 py-1 border border-slate-300 rounded text-[11px] focus:outline-none"
              >
                <option value="">+ Add Product SKU</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.sku} - {p.description.split('\n')[0]}</option>
                ))}
                <option value="custom">Add Cumin Seed Sample...</option>
              </select>
            </div>

            {lineItems.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded text-slate-400 text-xs">
                No items added yet. Choose a product SKU.
              </div>
            ) : (
              <div className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={index} className="bg-slate-50 p-4 rounded-lg border border-slate-200 relative space-y-3 text-xs">
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(index)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-red-500 transition"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-400">SKU</label>
                        <input
                          type="text"
                          value={item.sku}
                          onChange={(e) => handleUpdateLineItem(index, { sku: e.target.value })}
                          className="w-full px-2 py-1 border rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400">HS Code</label>
                        <input
                          type="text"
                          value={item.hs_code || ''}
                          onChange={(e) => handleUpdateLineItem(index, { hs_code: e.target.value })}
                          className="w-full px-2 py-1 border rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400">Packing & Container Specs</label>
                        <input
                          type="text"
                          value={item.packing_container || ''}
                          onChange={(e) => handleUpdateLineItem(index, { packing_container: e.target.value })}
                          className="w-full px-2 py-1 border rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400">Quantity (kg)</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateLineItem(index, { quantity: parseInt(e.target.value) || 0 })}
                          className="w-full px-2 py-1 border rounded bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-400">Unit Price ({currency}/kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => handleUpdateLineItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1 border rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400">Internal Cost ({currency}/kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.cost_price || ''}
                          onChange={(e) => handleUpdateLineItem(index, { cost_price: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1 border rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400">Unit Weight (kg/bag)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={item.weight || 0}
                          onChange={(e) => handleUpdateLineItem(index, { weight: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1 border rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400">Basis of Calculation</label>
                        <input
                          type="text"
                          value={item.basis_of_calculation || ''}
                          disabled
                          className="w-full px-2 py-1 border rounded bg-slate-100 text-slate-500 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400">Goods Description & Specification (multiline)</label>
                      <textarea
                        value={item.description}
                        onChange={(e) => handleUpdateLineItem(index, { description: e.target.value })}
                        className="w-full px-2 py-1 border rounded bg-white h-16 resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Transparent Cost Component Breakdown */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-1">4. Cost Breakdown Components ({currency})</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Export Packaging (1.2)</label>
                <input
                  type="number"
                  step="0.01"
                  value={packagingCost || ''}
                  onChange={(e) => setPackagingCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium"
                />
              </div>
              
              <div>
                <label className="block text-slate-500 mb-1">Inland Haulage & THC (1.3)</label>
                <input
                  type="number"
                  step="0.01"
                  value={inlandHaulageCost || ''}
                  onChange={(e) => setInlandHaulageCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Customs Clearance (1.4)</label>
                <input
                  type="number"
                  step="0.01"
                  value={customsClearanceCost || ''}
                  onChange={(e) => setCustomsClearanceCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Ocean Freight Cost (C) (2)</label>
                <input
                  type="number"
                  step="0.01"
                  value={freightCost || ''}
                  onChange={(e) => setFreightCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Cargo Transit Insurance (I) (3)</label>
                <input
                  type="number"
                  step="0.01"
                  value={insuranceCost || ''}
                  onChange={(e) => setInsuranceCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Invoice bank details */}
          <details className="group border border-slate-200 rounded-lg">
            <summary className="flex justify-between items-center p-3 font-medium text-xs text-slate-700 bg-slate-50 cursor-pointer hover:bg-slate-100 list-none select-none">
              <span>Bank Details for Commercial Invoice</span>
              <span className="transition group-open:rotate-180">v</span>
            </summary>
            <div className="p-4 border-t border-slate-200 bg-white text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
                <div className="text-[11px] text-slate-500">
                  Defaults are used automatically for new quotes on this browser.
                  {bankDefaultStatus && <span className="ml-2 font-semibold text-emerald-700">{bankDefaultStatus}</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleUseBankDefault}
                    className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 font-semibold rounded hover:bg-slate-50 transition"
                  >
                    Use Default
                  </button>
                  <button
                    type="button"
                    onClick={handleSetBankDefault}
                    className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 transition"
                  >
                    Set as Default
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Beneficiary Bank</label>
                  <input
                    type="text"
                    value={bankDetails.beneficiary_bank}
                    onChange={(e) => updateBankDetails({ beneficiary_bank: e.target.value })}
                    className="w-full px-2 py-1 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Branch Location</label>
                  <input
                    type="text"
                    value={bankDetails.branch_location}
                    onChange={(e) => updateBankDetails({ branch_location: e.target.value })}
                    className="w-full px-2 py-1 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    value={bankDetails.account_holder_name}
                    onChange={(e) => updateBankDetails({ account_holder_name: e.target.value })}
                    className="w-full px-2 py-1 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={bankDetails.account_number}
                    onChange={(e) => updateBankDetails({ account_number: e.target.value })}
                    className="w-full px-2 py-1 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={bankDetails.ifsc_code}
                    onChange={(e) => updateBankDetails({ ifsc_code: e.target.value })}
                    className="w-full px-2 py-1 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">SWIFT / BIC Code</label>
                  <input
                    type="text"
                    value={bankDetails.swift_code}
                    onChange={(e) => updateBankDetails({ swift_code: e.target.value })}
                    className="w-full px-2 py-1 border rounded"
                  />
                </div>
              </div>
            </div>
          </details>

          {/* Section 5: Page 2 specifications */}
          <details className="group border border-slate-200 rounded-lg">
            <summary className="flex justify-between items-center p-3 font-medium text-xs text-slate-700 bg-slate-50 cursor-pointer hover:bg-slate-100 list-none select-none">
              <span>Page 2: Export Responsibilities, Documentation, & Terms Editor</span>
              <span className="transition group-open:rotate-180">v</span>
            </summary>
            <div className="p-4 border-t border-slate-200 space-y-4 bg-white text-xs">
              
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Commercial Structure Footnote</label>
                <textarea
                  value={commercialNote}
                  onChange={(e) => setCommercialNote(e.target.value)}
                  className="w-full p-2 border rounded h-16 resize-none"
                />
              </div>

              {/* Responsibilities lists */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-1">
                  <h4 className="font-semibold text-slate-800">Included in Seller&apos;s Price</h4>
                  <button
                    type="button"
                    onClick={() => handleAddListItem('included')}
                    className="text-[10px] text-sky-600 hover:text-sky-500 font-bold"
                  >
                    + Add Inclusion
                  </button>
                </div>
                {includedScope.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleUpdateListValue('included', idx, e.target.value)}
                      className="w-full px-2 py-1 border rounded"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveListItem('included', idx)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-1">
                  <h4 className="font-semibold text-slate-800">Buyer Exclusions & Responsibilities</h4>
                  <button
                    type="button"
                    onClick={() => handleAddListItem('excluded')}
                    className="text-[10px] text-sky-600 hover:text-sky-500 font-bold"
                  >
                    + Add Exclusion
                  </button>
                </div>
                {excludedScope.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleUpdateListValue('excluded', idx, e.target.value)}
                      className="w-full px-2 py-1 border rounded"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveListItem('excluded', idx)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Documentation lists */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-1">
                  <h4 className="font-semibold text-slate-800">Documents Included</h4>
                  <button
                    type="button"
                    onClick={() => handleAddListItem('docs')}
                    className="text-[10px] text-sky-600 hover:text-sky-500 font-bold"
                  >
                    + Add Document
                  </button>
                </div>
                {docList.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleUpdateListValue('docs', idx, e.target.value)}
                      className="w-full px-2 py-1 border rounded"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveListItem('docs', idx)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Logistics Specs */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800 border-b pb-1">Logistics Specifications (Page 2 Card)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400">Shipment Window</label>
                    <input
                      type="text"
                      value={specMap.shipment_window || ''}
                      onChange={(e) => setSpecMap({ ...specMap, shipment_window: e.target.value })}
                      className="w-full px-2 py-1 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Transit Time</label>
                    <input
                      type="text"
                      value={specMap.transit_time || ''}
                      onChange={(e) => setSpecMap({ ...specMap, transit_time: e.target.value })}
                      className="w-full px-2 py-1 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Partial/Transshipment</label>
                    <input
                      type="text"
                      value={specMap.partial_shipment || ''}
                      onChange={(e) => setSpecMap({ ...specMap, partial_shipment: e.target.value })}
                      className="w-full px-2 py-1 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Container Type</label>
                    <input
                      type="text"
                      value={specMap.container_type || ''}
                      onChange={(e) => setSpecMap({ ...specMap, container_type: e.target.value })}
                      className="w-full px-2 py-1 border rounded"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] text-slate-400">Storage Condition</label>
                    <input
                      type="text"
                      value={specMap.storage_condition || ''}
                      onChange={(e) => setSpecMap({ ...specMap, storage_condition: e.target.value })}
                      className="w-full px-2 py-1 border rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Commercial terms */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-1">
                  <h4 className="font-semibold text-slate-800">Commercial Terms & Conditions (1-7)</h4>
                  <button
                    type="button"
                    onClick={() => handleAddListItem('terms')}
                    className="text-[10px] text-sky-600 hover:text-sky-500 font-bold"
                  >
                    + Add Condition
                  </button>
                </div>
                {commercialTerms.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <span className="font-bold py-1 text-slate-500">{idx+1}.</span>
                    <div className="flex-1 flex gap-2">
                      <textarea
                        value={item}
                        onChange={(e) => handleUpdateListValue('terms', idx, e.target.value)}
                        className="w-full p-1 border rounded h-14 resize-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveListItem('terms', idx)}
                        className="text-slate-400 hover:text-red-500 p-1 mt-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </details>

          {/* Internal margin summary - never rendered in PDFs */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3 text-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-amber-200 pb-2">
              <div>
                <h3 className="font-bold text-amber-900 uppercase tracking-wider">Internal Margin Calculator</h3>
                <p className="text-[11px] text-amber-700">Private only. These values are saved for you and are not printed on PDFs.</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-amber-800 font-semibold whitespace-nowrap">Target margin / kg</label>
                <input
                  type="number"
                  step="0.01"
                  value={marginPerKg || ''}
                  onChange={(e) => setMarginPerKg(parseFloat(e.target.value) || 0)}
                  className="w-28 px-2 py-1 border border-amber-300 rounded bg-white text-right"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-white border border-amber-100 rounded p-3">
                <span className="block text-[10px] text-amber-700 uppercase font-bold">Sell Value</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(goodsSubtotal)}</span>
              </div>
              <div className="bg-white border border-amber-100 rounded p-3">
                <span className="block text-[10px] text-amber-700 uppercase font-bold">Internal Goods Cost</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(internalGoodsCost)}</span>
              </div>
              <div className="bg-white border border-amber-100 rounded p-3">
                <span className="block text-[10px] text-amber-700 uppercase font-bold">Projected Gross Margin</span>
                <span className={`font-mono font-bold ${estimatedMargin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(estimatedMargin)}</span>
              </div>
              <div className="bg-white border border-amber-100 rounded p-3">
                <span className="block text-[10px] text-amber-700 uppercase font-bold">Actual Margin / kg</span>
                <span className={`font-mono font-bold ${estimatedMarginPerKg >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(estimatedMarginPerKg)}</span>
              </div>
            </div>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Internal notes for negotiation, margins, supplier rate, or follow-up. Not printed."
              className="w-full px-3 py-2 border border-amber-200 rounded h-16 resize-none"
            />
          </div>

          {/* Totals Summary */}
          <div className="p-4 bg-slate-900 text-white rounded-lg space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Base Goods Cost:</span>
              <span className="font-mono">{formatCurrency(goodsSubtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Packaging, Haulage & Clearance Base:</span>
              <span className="font-mono">{formatCurrency(packagingCost + inlandHaulageCost + customsClearanceCost)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-300 border-t border-slate-800 pt-1.5 pb-1">
              <span>FOB Value:</span>
              <span className="font-mono">{formatCurrency(totalFOB)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Ocean Freight (C) + Marine Insurance (I):</span>
              <span className="font-mono">{formatCurrency(freightCost + insuranceCost)}</span>
            </div>
            <div className="flex justify-between font-bold text-sky-400 border-t border-slate-800 pt-2 text-sm">
              <span>Total CIF Value:</span>
              <span className="font-mono text-base">{formatCurrency(totalCIF)}</span>
            </div>
          </div>
        </form>

        {/* Right Side PDF Live Preview */}
        {showPreview && isMounted && (
          <div className="flex-1 border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-100 flex flex-col">
            <div className="bg-slate-200 px-3 py-2 sm:px-4 border-b border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-700">
              <span className="text-[10px] font-bold uppercase tracking-wider">Live {documentLabelMap[previewDocType]} Document</span>
              <div className="flex flex-wrap items-center gap-1 bg-white rounded border p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewDocType('quotation')}
                  className={`px-2.5 py-1 text-[9px] font-semibold rounded transition ${previewDocType === 'quotation' ? 'bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
                >
                  CIF Quotation
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDocType('invoice')}
                  className={`px-2.5 py-1 text-[9px] font-semibold rounded transition ${previewDocType === 'invoice' ? 'bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
                >
                  Commercial Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDocType('packing_list')}
                  className={`px-2.5 py-1 text-[9px] font-semibold rounded transition ${previewDocType === 'packing_list' ? 'bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
                >
                  Packing List
                </button>
              </div>
            </div>

            <div className="block md:hidden p-3 bg-white border-b border-slate-200 text-xs text-slate-600">
              Mobile browsers may not show the embedded PDF preview. Use the Download PDF button above to save or share this document.
            </div>
            
            <div className="hidden md:block flex-1 p-2 h-[650px] lg:h-auto">
              <PdfPreviewBoundary key={`${previewDocType}-${quoteNumber}`}>
                <PDFViewer width="100%" height="100%" className="border border-slate-300 rounded shadow-sm bg-slate-50">
                  <QuotePDF quote={tempQuoteForPDF} documentType={previewDocType} />
                </PDFViewer>
              </PdfPreviewBoundary>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

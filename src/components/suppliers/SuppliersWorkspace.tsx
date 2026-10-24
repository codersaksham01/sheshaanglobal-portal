'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Building2,
  Plus,
  Search,
  FileCheck2,
  Download,
  Printer,
  Copy,
  Edit2,
  Trash2,
  Mail,
  Phone,
  FileText,
  CheckCircle2,
  Sparkles,
  Eye,
  RefreshCw,
  X,
  ShieldCheck,
  Package,
  Layers,
  MapPin,
  ZoomIn,
  ZoomOut,
  Maximize2,
  LayoutGrid,
  List,
  Columns,
  Check,
  ExternalLink
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '../../lib/supabaseClient';
import { getPortalCache, setPortalCache } from '../../lib/portalDataStore';
import { Vendor, SupplierAgreement, AgreementProductItem } from '../../lib/types';

// Default initial suppliers for onboarding
const DEFAULT_SUPPLIERS: Vendor[] = [
  {
    id: 'supp-1',
    company_name: 'Kohinoor Grain Millers Pvt Ltd',
    contact_name: 'Harpreet Singh (Managing Director)',
    contact_email: 'exports@kohinoorgrains.in',
    phone: '+91 98140 88765',
    address: 'Grand Trunk Road, Taraori, Karnal',
    city: 'Karnal',
    state: 'Haryana',
    country: 'India',
    postal_code: '132116',
    tax_id: '06AABCK9876C1ZQ',
    product_categories: '1121 Basmati Rice, Sugandha, Sharbati, Sella Rice, Sortex Cleaned',
    payment_terms: '30% Advance Upon Contract, 70% Against BL & Quality Clearance',
    rating: 5,
    status: 'Preferred',
    notes: 'State-of-the-art automated Buhler milling plant. Capacity 450 MT/month. Phytosanitary and SGS certified.'
  },
  {
    id: 'supp-2',
    company_name: 'Bharat Royal Agro Processors Ltd',
    contact_name: 'Ramesh Patel (Head of Sourcing)',
    contact_email: 'ramesh.patel@bharatroyalagro.com',
    phone: '+91 98250 12345',
    address: 'Plot 42-45, Agro Industrial Estate, GIDC',
    city: 'Unjha',
    state: 'Gujarat',
    country: 'India',
    postal_code: '384170',
    tax_id: '24AABCB1234F1Z8',
    product_categories: 'Cumin Seeds (Jeera), Fennel Seeds (Saunf), Coriander, Sesame Seeds',
    payment_terms: '20% Advance, 80% Against BL Copy',
    rating: 5,
    status: 'Preferred',
    notes: 'Direct farm aggregation in Saurashtra & North Gujarat. ISO 22000, US FDA, HALAL & KOSHER certified facility.'
  },
  {
    id: 'supp-3',
    company_name: 'Deccan Agro Commodities',
    contact_name: 'Vijay Deshmukh (Managing Partner)',
    contact_email: 'vijay@deccancommodities.com',
    phone: '+91 94221 54321',
    address: 'APMC Market Yard, Phase 2, Sangli',
    city: 'Sangli',
    state: 'Maharashtra',
    country: 'India',
    postal_code: '416416',
    tax_id: '27AAACD4567M1Z3',
    product_categories: 'Turmeric Fingers (Salem / Nizamabad / Rajapore), Dry Red Chilli, Raisins',
    payment_terms: '100% Against Independent Inspection Report & Warehouse Receipt',
    rating: 4,
    status: 'Active',
    notes: 'Strong farmer cooperative network in Sangli-Kolhapur belt. High curcumin grade availability.'
  }
];

// Pre-crafted legal agreement templates
const AGREEMENT_TEMPLATES: Record<string, { title: string; body: string }> = {
  standard_export: {
    title: 'COMMERCIAL COMMODITY SUPPLY & SHIPMENT AGREEMENT',
    body: `1. RECITALS & UNDERTAKING TO SUPPLY:
The Supplier unconditionally covenants, warrants, and agrees to harvest, process, sort, pack, and supply the designated commodities specified in Schedule A strictly adhering to the agreed parameters, grade, and packaging conditions.

2. SHIPMENT SCHEDULE & DISPATCH MILESTONES:
The Supplier guarantees that the complete consignment shall be packed, cleared for export, and dispatched from its processing plant to reach the nominated Port of Loading strictly within the Target Shipment Window stipulated in Schedule B. In the event of unexcused delay beyond the final cutoff date, the Buyer reserves the right to levy liquidated damages at 0.5% per week of delay or terminate the contract without liability.

3. QUALITY GUARANTEE & INDEPENDENT PRE-SHIPMENT INSPECTION:
All goods must strictly match the agreed physical, chemical, and organoleptic specifications set forth in Schedule A. The Buyer reserves the right to appoint an internationally accredited surveyor (such as SGS, Bureau Veritas, or Geo-Chem) to inspect the cargo at the Supplier's factory/warehouse prior to container stuffing. The Certificate of Quality and Quantity issued by the surveyor shall be final and binding on both parties.

4. PACKAGING, PALLETIZATION & EXPORT FUMIGATION:
Goods shall be packed in clean, sound, brand-new export-grade packaging suitable for deep-sea containerized transportation. Bags must bear complete buyer markings, gross/net weight, and lot numbers. The Supplier shall ensure comprehensive fumigation (using Phosphine or Methyl Bromide as mandated by destination customs) and furnish an official Government Phytosanitary Certificate.

5. FIXED PRICING & PAYMENT TERMS:
The contract prices agreed in Schedule A are fixed, firm, and non-escalating under any market circumstances, tariff alterations, or foreign exchange variances. Payments shall be released strictly in accordance with the milestone schedule detailed in Schedule B.

6. RISK, PASSING OF TITLE & INCOTERMS:
Transfer of risk, ocean freight obligations, export duties, and documentary deliveries shall be governed strictly by Incoterms 2020 as designated in Schedule B.

7. NON-CIRCUMVENTION & STRICT TRADE CONFIDENTIALITY:
The Supplier irrevocably undertakes that it shall not, directly or indirectly, disclose the identity of, contact, negotiate with, or solicit business from the Buyer's foreign consignees, importers, or overseas buyers revealed during the performance of this Agreement.

8. GOVERNING LAW & ARBITRATION:
This Agreement shall be governed by and interpreted in accordance with the laws of India. Any dispute, difference, or controversy arising hereunder shall be referred to and resolved by arbitration in Nagpur, Maharashtra, India in accordance with the Arbitration and Conciliation Act, 1996.`
  },
  consignment_spot: {
    title: 'SPOT CONSIGNMENT SUPPLY & CONTAINER STUFFING CONTRACT',
    body: `1. SPOT SHIPMENT COMMITMENT:
The Supplier confirms having earmarked and set aside the precise quantity of export-grade cargo indicated in Schedule A, ready for immediate containerization and port transit.

2. PORT DELIVERY & BL TIMELINES:
Supplier shall ensure that the loaded containers arrive at the Port of Loading on or before the container freight station (CFS) gate cut-off date for the nominated ocean vessel. The ocean Bill of Lading (B/L) draft must be furnished to Buyer within 48 hours of vessel sailing.

3. QUALITY TOLERANCE & MOISTURE RETENTION:
Moisture levels must strictly remain below the threshold defined in Schedule A. Any moisture-related damage, fungus, or weevil infestation detected upon landing at the destination port caused by deficient drying or packing will result in full financial restitution by the Supplier.

4. COMPLIANCE & CUSTOMS DOCUMENTATION:
Supplier guarantees provision of: Commercial Invoice, Packing List, Certificate of Origin, Phytosanitary Certificate, Non-GMO Declaration, and Lab Analysis Certificate.

5. NON-DISCLOSURE:
All commercial discussions, volume rates, and trade logistics under this contract shall remain strictly private and proprietary to Sheshaan Global.`
  },
  annual_framework: {
    title: 'ANNUAL STRATEGIC SOURCING & PROCUREMENT FRAMEWORK',
    body: `1. STRATEGIC SOURCING PARTNERSHIP:
This Framework Agreement establishes the terms under which the Supplier shall act as a preferred vendor to Sheshaan Global for the continuous seasonal procurement of export-grade commodities.

2. BATCH REQUISITIONS & SHIPMENT CALL-OFFS:
Individual container lots shall be called off via formal Purchase Orders, each governed by the pricing formulas, quality thresholds, and logistical protocols outlined in Schedule A and Schedule B.

3. QUALITY COMPLIANCE & FACTORY AUDITS:
Buyer's quality assurance inspectors shall have unhindered access to the Supplier's processing units, grading tables, and cold storages to verify sanitary compliance and hygienic packing standards.

4. EXCLUSIVITY & ANTI-BYPASS COVENANT:
Supplier guarantees not to supply identical custom-branded packaging or proprietary blended formulations developed jointly with Buyer to any third party in Buyer's destination markets.`
  }
};

export function SuppliersWorkspace() {
  // Navigation View State
  const [activeView, setActiveView] = useState<'suppliers' | 'agreements' | 'studio'>('suppliers');
  const [directoryViewMode, setDirectoryViewMode] = useState<'table' | 'grid'>('table');
  const [studioLayoutMode, setStudioLayoutMode] = useState<'split' | 'editor' | 'preview'>('split');
  const [studioStep, setStudioStep] = useState<'parties' | 'products' | 'clauses' | 'sign'>('parties');
  const [previewZoom, setPreviewZoom] = useState<number>(0.85);

  // Suppliers Data State
  const [suppliers, setSuppliers] = useState<Vendor[]>(() => {
    const storeCache = getPortalCache();
    if (storeCache?.vendors && storeCache.vendors.length > 0) return storeCache.vendors;
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sheshaan_portal_suppliers');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return DEFAULT_SUPPLIERS;
  });

  // Agreements Data State
  const [agreements, setAgreements] = useState<SupplierAgreement[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sheshaan_supplier_agreements');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [
      {
        id: 'agr-sample-1',
        agreement_number: 'SG/SA/2026/012',
        supplier_id: 'supp-1',
        supplier_company_name: 'Kohinoor Grain Millers Pvt Ltd',
        supplier_contact_name: 'Harpreet Singh (Managing Director)',
        supplier_email: 'exports@kohinoorgrains.in',
        supplier_phone: '+91 98140 88765',
        supplier_address: 'Grand Trunk Road, Taraori, Karnal, Haryana, India - 132116',
        supplier_tax_id: '06AABCK9876C1ZQ',
        date: '24 October 2026',
        effective_date: '24 October 2026',
        shipment_target_date: '15 November 2026 - 30 November 2026',
        loading_port: 'Nhava Sheva (JNPT), Mumbai, India / Mundra Port',
        destination_port: 'Jebel Ali Port, Dubai, UAE',
        incoterm: 'FOB (Free On Board)',
        payment_terms: '30% Advance Upon Contract, 70% Against BL & Quality Clearance',
        items: [
          {
            id: 'item-1',
            product_name: 'Premium 1121 XXL Steam Basmati Rice (Export Grade)',
            specification: 'Grain Length: min 8.35mm, Moisture: max 12.5%, Broken: max 1.0%, Purity: 95%, Crop Year: 2025-26, 100% Sortexed',
            quantity: 100,
            unit: 'Metric Tons (MT)',
            unit_price: 92500,
            total_price: 9250000
          }
        ],
        currency: 'INR',
        total_value: 9250000,
        agreement_title: AGREEMENT_TEMPLATES.standard_export.title,
        agreement_body: AGREEMENT_TEMPLATES.standard_export.body,
        include_stamp: true,
        include_signature: true,
        signatory_name: 'Sana Zeba Bakshi',
        signatory_title: 'Chief Executive Officer / Managing Director',
        status: 'Signed',
        created_at: new Date().toISOString()
      }
    ];
  });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Preferred' | 'On Hold'>('All');
  const [agreementSearchQuery, setAgreementSearchQuery] = useState('');

  // Modals & Forms
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Vendor | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Vendor | null>(null);
  const [supplierFormData, setSupplierFormData] = useState<Partial<Vendor>>({
    status: 'Active',
    rating: 4,
    country: 'India'
  });

  // Studio / Agreement Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('supp-1');
  const [agreementNumber, setAgreementNumber] = useState<string>('SG/SA/2026/101');
  const [agreementDate, setAgreementDate] = useState<string>('24 October 2026');
  const [shipmentTargetDate, setShipmentTargetDate] = useState<string>('15 November 2026 - 30 November 2026');
  const [loadingPort, setLoadingPort] = useState<string>('Nhava Sheva (JNPT), Mumbai, India');
  const [destinationPort, setDestinationPort] = useState<string>('Jebel Ali Port, Dubai, UAE');
  const [incoterm, setIncoterm] = useState<string>('FOB (Free On Board)');
  const [packagingDetails, setPackagingDetails] = useState<string>('25 KG Polypropylene (PP) Woven Bags with Inner Liner, Palletized & Shrink-Wrapped');
  const [paymentTerms, setPaymentTerms] = useState<string>('30% Advance Upon Contract, 70% Against BL & Quality Clearance');
  const [currency, setCurrency] = useState<string>('INR');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('standard_export');
  const [agreementTitle, setAgreementTitle] = useState<string>(AGREEMENT_TEMPLATES.standard_export.title);
  const [agreementBody, setAgreementBody] = useState<string>(AGREEMENT_TEMPLATES.standard_export.body);

  // Signatures State
  const [includeStamp, setIncludeStamp] = useState<boolean>(true);
  const [includeSignature, setIncludeSignature] = useState<boolean>(true);
  const [signatoryName, setSignatoryName] = useState<string>('Sana Zeba Bakshi');
  const [signatoryTitle, setSignatoryTitle] = useState<string>('Chief Executive Officer / Managing Director');
  const [supplierSignatoryName, setSupplierSignatoryName] = useState<string>('');
  const [supplierSignatoryTitle, setSupplierSignatoryTitle] = useState<string>('Authorized Signatory / Director');

  // Product Line Items State
  const [productItems, setProductItems] = useState<AgreementProductItem[]>([
    {
      id: 'prod-1',
      product_name: 'Premium 1121 XXL Steam Basmati Rice (Export Grade)',
      specification: 'Grain Length: min 8.35mm, Moisture: max 12.5%, Broken: max 1.0%, Purity: 95%, 100% Sortexed',
      quantity: 50,
      unit: 'Metric Tons (MT)',
      unit_price: 92000,
      total_price: 4600000
    }
  ]);

  // Loading & generation status
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // A4 Preview Ref
  const previewRef = useRef<HTMLDivElement>(null);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sheshaan_portal_suppliers', JSON.stringify(suppliers));
      } catch {}
    }
  }, [suppliers]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sheshaan_supplier_agreements', JSON.stringify(agreements));
      } catch {}
    }
  }, [agreements]);

  // Load suppliers from Supabase on mount
  useEffect(() => {
    async function loadData() {
      try {
        const { data: vData } = await supabase.from('vendors').select('*');
        if (vData && vData.length > 0) {
          setSuppliers(vData);
          setPortalCache({ vendors: vData });
        }
      } catch {}
    }
    loadData();
  }, []);

  // Selected supplier resolution
  const activeSupplier = useMemo(() => {
    return suppliers.find(s => s.id === selectedSupplierId) || suppliers[0] || null;
  }, [suppliers, selectedSupplierId]);

  // Update supplier signatory name when active supplier changes
  useEffect(() => {
    if (activeSupplier) {
      if (activeSupplier.contact_name) {
        setSupplierSignatoryName(activeSupplier.contact_name);
      } else {
        setSupplierSignatoryName('Authorized Director');
      }
      if (activeSupplier.payment_terms) {
        setPaymentTerms(activeSupplier.payment_terms);
      }
    }
  }, [activeSupplier]);

  // Calculation of grand total
  const agreementGrandTotal = useMemo(() => {
    return productItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
  }, [productItems]);

  // Currency Formatter
  const formatCurrency = (val: number, cur: string) => {
    if (cur === 'USD') return `$${val.toLocaleString()}`;
    if (cur === 'EUR') return `€${val.toLocaleString()}`;
    if (cur === 'AED') return `AED ${val.toLocaleString()}`;
    return `₹${val.toLocaleString()}`;
  };

  // Product Line Items Handlers
  const handleAddItem = () => {
    const newItem: AgreementProductItem = {
      id: 'prod-' + Date.now(),
      product_name: '',
      specification: '',
      quantity: 1,
      unit: 'Metric Tons (MT)',
      unit_price: 0,
      total_price: 0
    };
    setProductItems([...productItems, newItem]);
  };

  const handleUpdateItem = (id: string, field: keyof AgreementProductItem, val: any) => {
    setProductItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: val };
          if (field === 'quantity' || field === 'unit_price') {
            const qty = field === 'quantity' ? Number(val) || 0 : Number(item.quantity) || 0;
            const price = field === 'unit_price' ? Number(val) || 0 : Number(item.unit_price) || 0;
            updated.total_price = Math.round(qty * price * 100) / 100;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    if (productItems.length <= 1) {
      showToast('Agreement must include at least one product item');
      return;
    }
    setProductItems(prev => prev.filter(item => item.id !== id));
  };

  // Change Template Handler
  const handleSelectTemplate = (templateKey: string) => {
    setSelectedTemplateKey(templateKey);
    const tmpl = AGREEMENT_TEMPLATES[templateKey];
    if (tmpl) {
      setAgreementTitle(tmpl.title);
      setAgreementBody(tmpl.body);
    }
  };

  // Supplier CRUD Handlers
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierFormData.company_name?.trim()) {
      showToast('Please enter the Supplier Company Name');
      return;
    }

    try {
      if (editingSupplier) {
        const updated: Vendor = {
          ...editingSupplier,
          ...supplierFormData,
          company_name: supplierFormData.company_name.trim(),
          updated_at: new Date().toISOString()
        } as Vendor;

        setSuppliers(prev => prev.map(s => s.id === updated.id ? updated : s));
        try {
          await supabase.from('vendors').upsert(updated);
        } catch {}
        showToast(`Supplier "${updated.company_name}" updated`);
      } else {
        const newSupplier: Vendor = {
          id: 'supp-' + Date.now(),
          company_name: supplierFormData.company_name.trim(),
          contact_name: supplierFormData.contact_name || '',
          contact_email: supplierFormData.contact_email || '',
          phone: supplierFormData.phone || '',
          address: supplierFormData.address || '',
          city: supplierFormData.city || '',
          state: supplierFormData.state || '',
          country: supplierFormData.country || 'India',
          postal_code: supplierFormData.postal_code || '',
          tax_id: supplierFormData.tax_id || '',
          product_categories: supplierFormData.product_categories || '',
          payment_terms: supplierFormData.payment_terms || '30% Advance, 70% against BL',
          rating: Number(supplierFormData.rating) || 4,
          status: (supplierFormData.status as any) || 'Active',
          notes: supplierFormData.notes || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        setSuppliers(prev => [newSupplier, ...prev]);
        try {
          await supabase.from('vendors').insert(newSupplier);
        } catch {}
        showToast(`Supplier "${newSupplier.company_name}" added`);
      }

      setShowSupplierModal(false);
      setEditingSupplier(null);
      setSupplierFormData({ status: 'Active', rating: 4, country: 'India' });
    } catch (err: any) {
      showToast('Error saving supplier: ' + err.message);
    }
  };

  const handleDeleteSupplier = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete supplier "${name}"?`)) {
      setSuppliers(prev => prev.filter(s => s.id !== id));
      try {
        supabase.from('vendors').delete().eq('id', id);
      } catch {}
      showToast(`Supplier "${name}" deleted`);
    }
  };

  const handleOpenEditSupplier = (supplier: Vendor) => {
    setEditingSupplier(supplier);
    setSupplierFormData({ ...supplier });
    setShowSupplierModal(true);
  };

  const handleCreateAgreementForSupplier = useCallback((supplier: Vendor) => {
    if (!supplier) return;
    setSelectedSupplierId(supplier.id);
    if (supplier.payment_terms) {
      setPaymentTerms(supplier.payment_terms);
    }
    if (supplier.contact_name) {
      setSupplierSignatoryName(supplier.contact_name);
    }
    const rand = Math.floor(100 + ((Date.now() % 899)));
    setAgreementNumber(`SG/SA/2026/${rand}`);
    setActiveView('studio');
    showToast(`Drafting agreement for ${supplier.company_name}`);
  }, []);

  const handleSaveAgreementRecord = () => {
    if (!activeSupplier) {
      showToast('Please select or specify a supplier');
      return;
    }

    const newAgreement: SupplierAgreement = {
      id: 'agr-' + Date.now(),
      agreement_number: agreementNumber,
      supplier_id: activeSupplier.id,
      supplier_company_name: activeSupplier.company_name,
      supplier_contact_name: activeSupplier.contact_name,
      supplier_email: activeSupplier.contact_email,
      supplier_phone: activeSupplier.phone,
      supplier_address: `${activeSupplier.address || ''}, ${activeSupplier.city || ''}, ${activeSupplier.country || ''}`,
      supplier_tax_id: activeSupplier.tax_id,
      date: agreementDate,
      effective_date: agreementDate,
      shipment_target_date: shipmentTargetDate,
      loading_port: loadingPort,
      destination_port: destinationPort,
      incoterm: incoterm,
      payment_terms: paymentTerms,
      items: productItems,
      currency: currency,
      total_value: agreementGrandTotal,
      agreement_title: agreementTitle,
      agreement_body: agreementBody,
      include_stamp: includeStamp,
      include_signature: includeSignature,
      signatory_name: signatoryName,
      signatory_title: signatoryTitle,
      status: 'Draft',
      created_at: new Date().toISOString()
    };

    setAgreements(prev => [newAgreement, ...prev]);
    showToast(`Agreement #${agreementNumber} saved to archive`);
  };

  const handleDeleteAgreement = (id: string, num: string) => {
    if (confirm(`Are you sure you want to delete agreement #${num}?`)) {
      setAgreements(prev => prev.filter(a => a.id !== id));
      showToast(`Agreement #${num} deleted`);
    }
  };

  // High-Resolution PDF Export
  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;
    setGeneratingPdf(true);
    showToast('Rendering high-resolution PDF document...');

    try {
      const element = previewRef.current;
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 5) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const filename = `Sheshaan_Supply_Agreement_${agreementNumber.replace(/[^\w-]/g, '_')}.pdf`;
      pdf.save(filename);
      showToast(`Downloaded ${filename} successfully!`);
    } catch (err: any) {
      console.error('PDF export error:', err);
      showToast('Error generating PDF: ' + err.message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handlePrintDocument = () => {
    window.print();
  };

  const handleCopyText = () => {
    const textContent = `
${agreementTitle}
Ref No: ${agreementNumber}
Date: ${agreementDate}

BETWEEN:
Buyer: SHESHAAN GLOBAL, Nagpur, Maharashtra, India (GSTIN: 27DCTPB6192N1ZS)
Supplier: ${activeSupplier?.company_name || 'Supplier'}
Contact: ${activeSupplier?.contact_name || ''} | ${activeSupplier?.contact_email || ''} | ${activeSupplier?.phone || ''}
Address: ${activeSupplier?.address || ''}, ${activeSupplier?.city || ''}, ${activeSupplier?.country || ''}
Tax ID: ${activeSupplier?.tax_id || ''}

SCHEDULE A: COMMODITY SPECIFICATIONS:
${productItems.map((p, idx) => `${idx + 1}. ${p.product_name} | Specs: ${p.specification} | Qty: ${p.quantity} ${p.unit} | Unit Price: ${formatCurrency(p.unit_price, currency)} | Total: ${formatCurrency(p.total_price, currency)}`).join('\n')}
GRAND TOTAL CONTRACT VALUE: ${formatCurrency(agreementGrandTotal, currency)}

SCHEDULE B: LOGISTICS & SHIPMENT:
- Target Shipment Date: ${shipmentTargetDate}
- Port of Loading: ${loadingPort}
- Destination Port: ${destinationPort}
- Delivery Terms: ${incoterm}
- Packaging: ${packagingDetails}
- Payment Terms: ${paymentTerms}

SCHEDULE C: TERMS & CONDITIONS:
${agreementBody}

SCHEDULE D: EXECUTION & ATTESTATION:
For & On Behalf of Sheshaan Global: ${signatoryName} (${signatoryTitle})
For & On Behalf of ${activeSupplier?.company_name}: ${supplierSignatoryName} (${supplierSignatoryTitle})
    `.trim();

    navigator.clipboard.writeText(textContent);
    showToast('Agreement text copied to clipboard!');
  };

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const matchesSearch =
        searchQuery === '' ||
        s.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.contact_name && s.contact_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.city && s.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.product_categories && s.product_categories.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchQuery, statusFilter]);

  // Filtered Agreements
  const filteredAgreements = useMemo(() => {
    return agreements.filter(a => {
      return (
        agreementSearchQuery === '' ||
        a.agreement_number.toLowerCase().includes(agreementSearchQuery.toLowerCase()) ||
        a.supplier_company_name.toLowerCase().includes(agreementSearchQuery.toLowerCase()) ||
        a.items.some(i => i.product_name.toLowerCase().includes(agreementSearchQuery.toLowerCase()))
      );
    });
  }, [agreements, agreementSearchQuery]);

  return (
    <div className="space-y-5 animate-fade-in text-slate-800 max-w-[1600px] mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-xs font-bold border border-slate-700 animate-slide-up">
          <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER: Clean, Professional, High-Contrast */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-900 font-bold">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Procurement & Supply Chain
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Suppliers Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified suppliers network, commercial commodity agreements, and print-ready PDF execution with official stamp and signature.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              setEditingSupplier(null);
              setSupplierFormData({ status: 'Active', rating: 4, country: 'India' });
              setShowSupplierModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-sm transition active:scale-95"
          >
            <Plus className="h-3.5 w-3.5 text-blue-900" />
            <span>Add Supplier</span>
          </button>

          <button
            onClick={() => {
              setAgreementNumber('SG/SA/2026/' + Math.floor(100 + ((Date.now() % 899))));
              setActiveView('studio');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-sm transition active:scale-95"
          >
            <FileCheck2 className="h-4 w-4 text-orange-400" />
            <span>Create Agreement</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS STRIP: Compact & Elegant */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Suppliers</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">{suppliers.length}</span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
            <Building2 className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Preferred Partners</span>
            <span className="text-xl font-black text-emerald-600 mt-0.5 block">
              {suppliers.filter(s => s.status === 'Preferred').length}
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Drafted Agreements</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">{agreements.length}</span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <FileText className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Official Attestation</span>
            <span className="text-xs font-black text-emerald-600 mt-1 block flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Stamp & Sign Ready
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <FileCheck2 className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* VIEW SELECTOR PILLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveView('suppliers')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeView === 'suppliers'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Suppliers Directory</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeView === 'suppliers' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {suppliers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveView('agreements')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeView === 'agreements'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Agreements Archive</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeView === 'agreements' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {agreements.length}
            </span>
          </button>

          <button
            onClick={() => setActiveView('studio')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeView === 'studio'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileCheck2 className="h-3.5 w-3.5 text-orange-400" />
            <span>Agreement Studio & PDF</span>
          </button>
        </div>

        {/* View mode toggle for suppliers directory */}
        {activeView === 'suppliers' && (
          <div className="flex items-center gap-1 border border-slate-200 p-0.5 rounded-lg bg-slate-50">
            <button
              onClick={() => setDirectoryViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-bold transition ${
                directoryViewMode === 'table' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDirectoryViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-bold transition ${
                directoryViewMode === 'grid' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Studio layout mode toggles */}
        {activeView === 'studio' && (
          <div className="flex items-center gap-1 border border-slate-200 p-0.5 rounded-lg bg-slate-50 text-xs">
            <button
              onClick={() => setStudioLayoutMode('split')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold transition ${
                studioLayoutMode === 'split' ? 'bg-white shadow text-blue-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              <span>Split View</span>
            </button>
            <button
              onClick={() => setStudioLayoutMode('editor')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold transition ${
                studioLayoutMode === 'editor' ? 'bg-white shadow text-blue-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>Editor Only</span>
            </button>
            <button
              onClick={() => setStudioLayoutMode('preview')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold transition ${
                studioLayoutMode === 'preview' ? 'bg-white shadow text-blue-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Preview & PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: SUPPLIERS DIRECTORY */}
      {activeView === 'suppliers' && (
        <div className="space-y-4 animate-fade-in">
          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search suppliers by name, contact, product, location, tax ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['All', 'Preferred', 'Active', 'On Hold'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    statusFilter === status
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* TABLE VIEW */}
          {directoryViewMode === 'table' ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[650px] sm:min-w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                      <th className="py-3 px-3 sm:px-4">Supplier Company</th>
                      <th className="py-3 px-3 sm:px-4 hidden sm:table-cell">Contact & Location</th>
                      <th className="py-3 px-3 sm:px-4 hidden lg:table-cell">GSTIN / Tax ID</th>
                      <th className="py-3 px-3 sm:px-4 hidden xl:table-cell">Commodities Handled</th>
                      <th className="py-3 px-3 sm:px-4 hidden 2xl:table-cell">Payment Terms</th>
                      <th className="py-3 px-2 sm:px-3 text-center">Status</th>
                      <th className="py-3 px-3 sm:px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSuppliers.map(supplier => (
                      <tr key={supplier.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 sm:px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-900 font-black text-xs shrink-0">
                              {supplier.company_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 max-w-[200px] sm:max-w-xs">
                              <button
                                type="button"
                                onClick={() => setViewingSupplier(supplier)}
                                className="font-bold text-slate-900 hover:text-blue-900 hover:underline text-left block leading-tight truncate"
                                title="Click to view full supplier profile"
                              >
                                {supplier.company_name}
                              </button>
                              <span className="sm:hidden text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                                <MapPin className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                                {supplier.city || 'City N/A'}, {supplier.country || 'India'}
                              </span>
                              <span className="hidden sm:block text-[10px] text-slate-400 font-normal truncate">
                                {supplier.notes ? supplier.notes.slice(0, 45) + '...' : 'Registered supplier'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 sm:px-4 hidden sm:table-cell">
                          <span className="font-semibold text-slate-800 block truncate max-w-[160px]">{supplier.contact_name || 'N/A'}</span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[150px]">{supplier.city || 'City N/A'}, {supplier.country || 'India'}</span>
                          </span>
                        </td>

                        <td className="py-3 px-3 sm:px-4 font-mono font-bold text-slate-700 text-[11px] hidden lg:table-cell whitespace-nowrap">
                          {supplier.tax_id ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                              {supplier.tax_id}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-sans font-normal italic">None</span>
                          )}
                        </td>

                        <td className="py-3 px-3 sm:px-4 max-w-xs hidden xl:table-cell">
                          <span className="text-slate-700 font-medium line-clamp-1">
                            {supplier.product_categories || 'Various Agri Products'}
                          </span>
                        </td>

                        <td className="py-3 px-3 sm:px-4 text-slate-700 font-medium hidden 2xl:table-cell whitespace-nowrap">
                          <span className="text-slate-600 font-semibold">{supplier.payment_terms || 'Standard'}</span>
                        </td>

                        <td className="py-3 px-2 sm:px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              supplier.status === 'Preferred'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : supplier.status === 'Active'
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {supplier.status}
                          </span>
                        </td>

                        <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setViewingSupplier(supplier)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 text-[11px] font-bold shadow-sm transition active:scale-95 shrink-0"
                              title="View full supplier details"
                            >
                              <Eye className="h-3.5 w-3.5 text-blue-900 shrink-0" />
                              <span className="hidden xl:inline">View</span>
                            </button>

                            <button
                              onClick={() => handleCreateAgreementForSupplier(supplier)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-[11px] font-bold shadow-sm transition active:scale-95 shrink-0"
                              title="Draft Supply Agreement"
                            >
                              <FileCheck2 className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                              <span className="hidden xl:inline">Agreement</span>
                            </button>

                            <div className="flex items-center gap-1 pl-1 border-l border-slate-200 ml-0.5 shrink-0">
                              {supplier.phone && (
                                <a
                                  href={`https://wa.me/${supplier.phone.replace(/[^\d]/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 shrink-0 transition"
                                  title={`WhatsApp: ${supplier.phone}`}
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                </a>
                              )}

                              {supplier.contact_email && (
                                <a
                                  href={`mailto:${supplier.contact_email}`}
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-blue-900 hover:bg-blue-50 hover:border-blue-200 shrink-0 transition"
                                  title={`Email: ${supplier.contact_email}`}
                                >
                                  <Mail className="h-3.5 w-3.5" />
                                </a>
                              )}

                              <button
                                onClick={() => handleOpenEditSupplier(supplier)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 shrink-0 transition"
                                title="Edit Supplier"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteSupplier(supplier.id, supplier.company_name)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 shrink-0 transition"
                                title="Delete Supplier"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredSuppliers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Building2 className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-bold text-xs">No suppliers found matching your query.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map(supplier => (
                <div
                  key={supplier.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setViewingSupplier(supplier)}
                          className="font-bold text-slate-900 text-sm truncate hover:text-blue-900 hover:underline text-left block max-w-full"
                          title="Click to view details"
                        >
                          {supplier.company_name}
                        </button>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span>{supplier.city || 'City N/A'}, {supplier.country || 'India'}</span>
                        </p>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                          supplier.status === 'Preferred'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : supplier.status === 'Active'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {supplier.status}
                      </span>
                    </div>

                    <div className="mt-3 bg-slate-50 rounded-lg p-2.5 text-xs space-y-1 text-slate-600">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-400">Contact:</span>
                        <span className="font-bold text-slate-800 truncate max-w-[170px]">{supplier.contact_name || 'N/A'}</span>
                      </div>
                      {supplier.tax_id && (
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-400">Tax ID:</span>
                          <span className="font-mono font-bold text-slate-800">{supplier.tax_id}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-400">Payment:</span>
                        <span className="font-medium text-slate-700 truncate max-w-[170px]">{supplier.payment_terms || 'Standard'}</span>
                      </div>
                    </div>

                    {supplier.product_categories && (
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {supplier.product_categories.split(',').slice(0, 3).map((c, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {c.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewingSupplier(supplier)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-[11px] font-bold transition"
                        title="View Full Supplier Profile"
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-900" />
                        <span>Details</span>
                      </button>

                      {supplier.contact_email && (
                        <a href={`mailto:${supplier.contact_email}`} className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-900" title="Send Email">
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {supplier.phone && (
                        <a href={`https://wa.me/${supplier.phone.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg border border-slate-200 text-emerald-600" title="WhatsApp Chat">
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button onClick={() => handleOpenEditSupplier(supplier)} className="p-1.5 rounded-lg border border-slate-200 text-slate-600" title="Edit Supplier">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleCreateAgreementForSupplier(supplier)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-[11px] font-bold shadow-sm"
                    >
                      <FileCheck2 className="h-3 w-3 text-orange-400" />
                      <span>Agreement</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SUPPLY AGREEMENTS ARCHIVE */}
      {activeView === 'agreements' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search archive by agreement number, supplier, product..."
                value={agreementSearchQuery}
                onChange={e => setAgreementSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <button
              onClick={() => {
                setAgreementNumber('SG/SA/2026/' + Math.floor(100 + ((Date.now() % 899))));
                setActiveView('studio');
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-900 text-white text-xs font-bold hover:bg-blue-800 transition"
            >
              <Plus className="h-4 w-4 text-orange-400" />
              <span>Draft New Agreement</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[650px] sm:min-w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                    <th className="py-3 px-3 sm:px-4">Agreement Ref</th>
                    <th className="py-3 px-3 sm:px-4">Supplier / Vendor</th>
                    <th className="py-3 px-3 sm:px-4 hidden sm:table-cell">Commodity / Qty</th>
                    <th className="py-3 px-3 sm:px-4 hidden lg:table-cell">Target Window</th>
                    <th className="py-3 px-3 sm:px-4">Contract Value</th>
                    <th className="py-3 px-2 sm:px-3 text-center">Status</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAgreements.map(agreement => (
                    <tr key={agreement.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 sm:px-4 font-mono font-bold text-blue-900 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-blue-900 shrink-0" />
                          {agreement.agreement_number}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-sans font-normal ml-5">{agreement.date}</span>
                      </td>

                      <td className="py-3 px-3 sm:px-4">
                        <span className="font-bold text-slate-900 block truncate max-w-[200px]">{agreement.supplier_company_name}</span>
                        <span className="text-[10px] text-slate-500 sm:hidden block truncate max-w-[180px]">
                          {agreement.items.map(i => i.product_name).join(', ')}
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:block truncate max-w-[180px]">{agreement.supplier_contact_name || 'Contact'}</span>
                      </td>

                      <td className="py-3 px-3 sm:px-4 max-w-xs hidden sm:table-cell">
                        <span className="font-bold text-slate-800 line-clamp-1">
                          {agreement.items.map(i => i.product_name).join(', ') || 'Agri Cargo'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {agreement.items.map(i => `${i.quantity} ${i.unit}`).join(', ')}
                        </span>
                      </td>

                      <td className="py-3 px-3 sm:px-4 hidden lg:table-cell whitespace-nowrap">
                        <span className="font-semibold text-slate-800 block">{agreement.shipment_target_date}</span>
                        <span className="text-[10px] text-slate-400">{agreement.incoterm}</span>
                      </td>

                      <td className="py-3 px-3 sm:px-4 font-black text-slate-900 whitespace-nowrap">
                        {formatCurrency(agreement.total_value, agreement.currency)}
                      </td>

                      <td className="py-3 px-2 sm:px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            agreement.status === 'Signed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {agreement.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              setAgreementNumber(agreement.agreement_number);
                              setAgreementDate(agreement.date);
                              setShipmentTargetDate(agreement.shipment_target_date);
                              setLoadingPort(agreement.loading_port);
                              setDestinationPort(agreement.destination_port);
                              setIncoterm(agreement.incoterm);
                              setPaymentTerms(agreement.payment_terms);
                              setProductItems(agreement.items);
                              setCurrency(agreement.currency);
                              setAgreementTitle(agreement.agreement_title);
                              setAgreementBody(agreement.agreement_body);
                              setIncludeStamp(agreement.include_stamp);
                              setIncludeSignature(agreement.include_signature);
                              if (agreement.supplier_id) setSelectedSupplierId(agreement.supplier_id);
                              setActiveView('studio');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-blue-900 text-[11px] font-bold shadow-sm transition active:scale-95 shrink-0"
                            title="Open in Agreement Studio"
                          >
                            <Eye className="h-3.5 w-3.5 text-blue-900 shrink-0" />
                            <span className="hidden sm:inline">Open</span>
                          </button>

                          <button
                            onClick={() => handleDeleteAgreement(agreement.id, agreement.agreement_number)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 shrink-0 transition"
                            title="Delete Agreement"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredAgreements.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-bold text-xs">No supply agreements recorded yet.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: AGREEMENT STUDIO & PDF GENERATOR */}
      {activeView === 'studio' && (
        <div className="space-y-4 animate-fade-in">
          {/* Studio Top Control Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-black text-slate-900 text-sm">Agreement Studio:</span>
              <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {agreementNumber}
              </span>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                • {activeSupplier?.company_name || 'Select Supplier'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={generatingPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-900 text-white text-xs font-black shadow-md hover:bg-blue-800 transition disabled:opacity-50 active:scale-95"
              >
                <Download className="h-3.5 w-3.5 text-orange-400" />
                <span>{generatingPdf ? 'Rendering PDF...' : 'Download PDF'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintDocument}
                className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100"
                title="Print Document"
              >
                <Printer className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100"
                title="Copy Plain Text"
              >
                <Copy className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleSaveAgreementRecord}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
                title="Save to Records"
              >
                <FileCheck2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Save Record</span>
              </button>
            </div>
          </div>

          {/* STUDIO MAIN WORKSPACE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* EDITOR COLUMN */}
            {(studioLayoutMode === 'split' || studioLayoutMode === 'editor') && (
              <div className={`${studioLayoutMode === 'editor' ? 'lg:col-span-12 max-w-4xl mx-auto' : 'lg:col-span-6'} space-y-4`}>
                {/* Step Tabs */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs font-bold overflow-x-auto">
                  <button
                    onClick={() => setStudioStep('parties')}
                    className={`flex-1 py-1.5 px-3 rounded-lg transition whitespace-nowrap ${
                      studioStep === 'parties' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    1. Supplier & Logistics
                  </button>
                  <button
                    onClick={() => setStudioStep('products')}
                    className={`flex-1 py-1.5 px-3 rounded-lg transition whitespace-nowrap ${
                      studioStep === 'products' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    2. Commodities ({productItems.length})
                  </button>
                  <button
                    onClick={() => setStudioStep('clauses')}
                    className={`flex-1 py-1.5 px-3 rounded-lg transition whitespace-nowrap ${
                      studioStep === 'clauses' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    3. Clauses & Body
                  </button>
                  <button
                    onClick={() => setStudioStep('sign')}
                    className={`flex-1 py-1.5 px-3 rounded-lg transition whitespace-nowrap ${
                      studioStep === 'sign' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    4. Attestation & Sign
                  </button>
                </div>

                {/* STEP 1: PARTIES & LOGISTICS */}
                {studioStep === 'parties' && (
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
                      Supplier Selection & Shipping Logistics
                    </h3>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Select Contracting Supplier *
                      </label>
                      <select
                        value={selectedSupplierId}
                        onChange={e => setSelectedSupplierId(e.target.value)}
                        className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.company_name} ({s.city || 'City N/A'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          Agreement Reference #
                        </label>
                        <input
                          type="text"
                          value={agreementNumber}
                          onChange={e => setAgreementNumber(e.target.value)}
                          className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-mono font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          Agreement Date
                        </label>
                        <input
                          type="text"
                          value={agreementDate}
                          onChange={e => setAgreementDate(e.target.value)}
                          className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Target Shipment Date / Window *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 15 November 2026 - 30 November 2026"
                        value={shipmentTargetDate}
                        onChange={e => setShipmentTargetDate(e.target.value)}
                        className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          Port of Loading
                        </label>
                        <input
                          type="text"
                          value={loadingPort}
                          onChange={e => setLoadingPort(e.target.value)}
                          className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          Destination Port
                        </label>
                        <input
                          type="text"
                          value={destinationPort}
                          onChange={e => setDestinationPort(e.target.value)}
                          className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          Incoterms (2020)
                        </label>
                        <select
                          value={incoterm}
                          onChange={e => setIncoterm(e.target.value)}
                          className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800"
                        >
                          <option value="FOB (Free On Board)">FOB (Free On Board)</option>
                          <option value="CIF (Cost, Insurance & Freight)">CIF (Cost, Insurance & Freight)</option>
                          <option value="CFR (Cost & Freight)">CFR (Cost & Freight)</option>
                          <option value="EXW (Ex Works / Mill Gate)">EXW (Ex Works / Mill Gate)</option>
                          <option value="FCA (Free Carrier)">FCA (Free Carrier)</option>
                          <option value="CIP (Carriage & Insurance Paid)">CIP (Carriage & Insurance Paid)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          Currency
                        </label>
                        <select
                          value={currency}
                          onChange={e => setCurrency(e.target.value)}
                          className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800"
                        >
                          <option value="INR">INR (₹)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="AED">AED (د.إ)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Packaging Requirements
                      </label>
                      <input
                        type="text"
                        value={packagingDetails}
                        onChange={e => setPackagingDetails(e.target.value)}
                        className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Payment Milestones
                      </label>
                      <input
                        type="text"
                        value={paymentTerms}
                        onChange={e => setPaymentTerms(e.target.value)}
                        className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setStudioStep('products')}
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
                      >
                        Next: Commodity Schedule →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: COMMODITY SCHEDULE */}
                {studioStep === 'products' && (
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Schedule A: Commodity Items
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-900 hover:text-blue-700"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Item</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {productItems.map((item, idx) => (
                        <div key={item.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700 text-[11px] uppercase">Commodity #{idx + 1}</span>
                            {productItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          <div>
                            <input
                              type="text"
                              placeholder="Product Name / Commodity"
                              value={item.product_name}
                              onChange={e => handleUpdateItem(item.id, 'product_name', e.target.value)}
                              className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-800"
                            />
                          </div>

                          <div>
                            <input
                              type="text"
                              placeholder="Quality Specifications & Parameters (Moisture, Broken, Purity, Length)"
                              value={item.specification}
                              onChange={e => handleUpdateItem(item.id, 'specification', e.target.value)}
                              className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] text-slate-700"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase block">Quantity</label>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={e => handleUpdateItem(item.id, 'quantity', e.target.value)}
                                className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-800"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase block">Unit</label>
                              <input
                                type="text"
                                value={item.unit}
                                onChange={e => handleUpdateItem(item.id, 'unit', e.target.value)}
                                className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-800"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase block">Unit Price</label>
                              <input
                                type="number"
                                value={item.unit_price}
                                onChange={e => handleUpdateItem(item.id, 'unit_price', e.target.value)}
                                className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-800"
                              />
                            </div>
                          </div>

                          <div className="text-right pt-1 font-bold text-slate-900 text-xs">
                            Line Total: {formatCurrency(item.total_price, currency)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-xs font-black text-blue-950 uppercase">Grand Total Contract Value:</span>
                      <span className="text-base font-black text-blue-900">{formatCurrency(agreementGrandTotal, currency)}</span>
                    </div>

                    <div className="pt-2 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setStudioStep('parties')}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudioStep('clauses')}
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
                      >
                        Next: Legal Clauses →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: LEGAL CLAUSES & BODY */}
                {studioStep === 'clauses' && (
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
                      Schedule C: Agreement Clauses & Terms
                    </h3>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Select Template Preset
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectTemplate('standard_export')}
                          className={`p-2 rounded-lg text-[10px] font-bold border transition ${
                            selectedTemplateKey === 'standard_export' ? 'bg-blue-900 text-white border-blue-900' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Standard Export
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectTemplate('consignment_spot')}
                          className={`p-2 rounded-lg text-[10px] font-bold border transition ${
                            selectedTemplateKey === 'consignment_spot' ? 'bg-blue-900 text-white border-blue-900' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Spot Consignment
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectTemplate('annual_framework')}
                          className={`p-2 rounded-lg text-[10px] font-bold border transition ${
                            selectedTemplateKey === 'annual_framework' ? 'bg-blue-900 text-white border-blue-900' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Annual Framework
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Agreement Document Title
                      </label>
                      <input
                        type="text"
                        value={agreementTitle}
                        onChange={e => setAgreementTitle(e.target.value)}
                        className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Custom Legal Body Clauses (Fully Editable)
                      </label>
                      <textarea
                        rows={12}
                        value={agreementBody}
                        onChange={e => setAgreementBody(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>

                    <div className="pt-2 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setStudioStep('products')}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudioStep('sign')}
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
                      >
                        Next: Attestation Block →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: ATTESTATION & SIGNATURES */}
                {studioStep === 'sign' && (
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
                      Schedule D: Stamp, Signature & Attestation Block
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={includeStamp}
                          onChange={e => setIncludeStamp(e.target.checked)}
                          className="rounded text-blue-900 focus:ring-blue-900 h-4 w-4"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">Sheshaan Rubber Stamp</span>
                          <span className="text-[10px] text-slate-400">Render official seal</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={includeSignature}
                          onChange={e => setIncludeSignature(e.target.checked)}
                          className="rounded text-blue-900 focus:ring-blue-900 h-4 w-4"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">CEO Signature Graphic</span>
                          <span className="text-[10px] text-slate-400">Authorized signature</span>
                        </div>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Buyer Signatory Name</label>
                        <input
                          type="text"
                          value={signatoryName}
                          onChange={e => setSignatoryName(e.target.value)}
                          className="w-full h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Buyer Title</label>
                        <input
                          type="text"
                          value={signatoryTitle}
                          onChange={e => setSignatoryTitle(e.target.value)}
                          className="w-full h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Supplier Signatory</label>
                        <input
                          type="text"
                          value={supplierSignatoryName}
                          onChange={e => setSupplierSignatoryName(e.target.value)}
                          className="w-full h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Supplier Title</label>
                        <input
                          type="text"
                          value={supplierSignatoryTitle}
                          onChange={e => setSupplierSignatoryTitle(e.target.value)}
                          className="w-full h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setStudioStep('clauses')}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadPDF}
                        disabled={generatingPdf}
                        className="px-5 py-2 rounded-xl bg-blue-900 text-white text-xs font-black shadow-md hover:bg-blue-800 transition"
                      >
                        {generatingPdf ? 'Rendering...' : 'Download Contract PDF'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PREVIEW COLUMN (794px Document Viewer with Zoom & Fit) */}
            {(studioLayoutMode === 'split' || studioLayoutMode === 'preview') && (
              <div className={`${studioLayoutMode === 'preview' ? 'lg:col-span-12' : 'lg:col-span-6'} space-y-3`}>
                {/* Preview Toolbar */}
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                    <span>A4 Document Preview</span>
                    <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">(Print-Ready)</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewZoom(z => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))}
                      className="p-1 rounded hover:bg-slate-100 text-slate-600"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <span className="font-mono text-[11px] font-bold text-slate-700 min-w-[40px] text-center">
                      {Math.round(previewZoom * 100)}%
                    </span>
                    <button
                      onClick={() => setPreviewZoom(z => Math.min(1.2, Math.round((z + 0.1) * 10) / 10))}
                      className="p-1 rounded hover:bg-slate-100 text-slate-600"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPreviewZoom(0.85)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 ml-1"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* SCALED VIEWER CANVAS */}
                <div className="w-full overflow-auto border border-slate-200 rounded-2xl p-4 bg-slate-200/50 shadow-inner flex justify-center max-h-[82vh]">
                  <div
                    style={{
                      transform: `scale(${previewZoom})`,
                      transformOrigin: 'top center',
                      marginBottom: `${(previewZoom - 1) * 1123}px`
                    }}
                    className="transition-transform duration-150"
                  >
                    {/* A4 PAPER ELEMENT */}
                    <div
                      ref={previewRef}
                      id="supplier-agreement-a4"
                      className="w-[794px] bg-white shadow-2xl relative flex flex-col shrink-0 text-slate-800 text-left font-serif"
                      style={{ minWidth: '794px', minHeight: '1123px' }}
                    >
                      {/* TOP BRAND ACCENT BAND */}
                      <div className="relative top-0 left-0 right-0 h-[14px] bg-blue-900 z-10 flex-none">
                        <div
                          className="absolute right-0 top-0 h-full w-[45%] bg-orange-500"
                          style={{ clipPath: 'polygon(15px 0, 100% 0, 100% 100%, 0 100%)' }}
                        />
                      </div>

                      {/* HEADER SECTION */}
                      <div className="px-10 pt-8 pb-4 flex justify-between items-start flex-none relative z-10">
                        {/* Brand & Logo */}
                        <div className="flex items-center gap-3.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/logo.jpg"
                            alt="Sheshaan Global Logo"
                            className="h-16 w-auto object-contain select-none"
                          />
                          <div className="flex flex-col items-start select-none" style={{ fontFamily: 'sans-serif' }}>
                            <h1 className="text-[24px] font-black tracking-tight text-blue-900 leading-none">
                              SHESHAAN
                            </h1>
                            <div className="flex items-center w-full justify-between gap-1 mt-0.5">
                              <div className="h-[2px] bg-orange-500 flex-grow" />
                              <span className="text-[12px] font-black tracking-[0.24em] text-orange-500 uppercase leading-none">
                                GLOBAL
                              </span>
                              <div className="h-[2px] bg-orange-500 flex-grow" />
                            </div>
                            <p className="text-[6.5px] font-black text-slate-500 tracking-[0.16em] mt-1">
                              CONNECTING MARKETS, DELIVERING TRUST
                            </p>
                          </div>
                        </div>

                        {/* Company Contact Details */}
                        <div className="flex items-center gap-3 select-none" style={{ fontFamily: 'sans-serif' }}>
                          <div className="w-[1px] h-12 bg-slate-200" />
                          <div className="flex flex-col text-[8.5px] text-slate-600 space-y-0.5">
                            <span className="font-extrabold text-slate-900 text-[9px]">Sheshaan Global Merchant Exporter</span>
                            <span>Plot 1459, Aasinagar, Nagpur, MH, India</span>
                            <span>GSTIN: <strong className="text-slate-900">27DCTPB6192N1ZS</strong></span>
                            <span>Email: info@sheshaanglobal.com | +91 81499 09546</span>
                          </div>
                        </div>
                      </div>

                      {/* Header Divider Line */}
                      <div className="px-10 flex-none select-none relative z-10">
                        <div className="relative w-full h-[2.5px] bg-blue-900">
                          <div className="absolute right-0 top-0 h-full w-[28%] bg-orange-500" />
                        </div>
                      </div>

                      {/* AGREEMENT TITLE & METADATA */}
                      <div className="px-10 pt-5 pb-3 flex-none relative z-10" style={{ fontFamily: 'sans-serif' }}>
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                          <div>
                            <h2 className="text-[15px] font-black tracking-wide text-blue-950 uppercase">
                              {agreementTitle}
                            </h2>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                              Bilateral Commercial Commodity Purchase & Shipment Undertaking
                            </p>
                          </div>

                          <div className="text-right">
                            <div className="inline-block bg-blue-900 text-white text-[9.5px] font-black font-mono px-2.5 py-1 rounded">
                              REF: {agreementNumber}
                            </div>
                            <div className="text-[9px] font-bold text-slate-600 mt-1">
                              Date: {agreementDate}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* CONTRACTING PARTIES GRID */}
                      <div className="px-10 py-3 flex-none" style={{ fontFamily: 'sans-serif' }}>
                        <div className="grid grid-cols-2 gap-4 bg-slate-50/80 p-3.5 rounded-lg border border-slate-200 text-[9px] leading-relaxed">
                          {/* Buyer Party */}
                          <div className="border-r border-slate-200 pr-3">
                            <span className="block text-[8px] font-black uppercase text-blue-900 tracking-wider mb-1">
                              THE BUYER / MERCHANT EXPORTER
                            </span>
                            <strong className="text-[11px] text-slate-900 block font-black">SHESHAAN GLOBAL</strong>
                            <p className="text-slate-600 mt-0.5">
                              Office: Plot no. 1459, Opp. M.A.K Azad Urdu School, Aasinagar, Nagpur, Maharashtra, India - 440017
                            </p>
                            <p className="text-slate-600 mt-0.5 font-medium">
                              GSTIN: <strong>27DCTPB6192N1ZS</strong> | IEC: Registered
                            </p>
                            <p className="text-slate-600 mt-0.5">
                              Rep by: <strong>Sana Zeba Bakshi</strong>, Chief Executive Officer
                            </p>
                          </div>

                          {/* Supplier Party */}
                          <div className="pl-1">
                            <span className="block text-[8px] font-black uppercase text-orange-600 tracking-wider mb-1">
                              THE SUPPLIER / VENDOR
                            </span>
                            <strong className="text-[11px] text-slate-900 block font-black">
                              {activeSupplier?.company_name || 'Supplier / Vendor Company'}
                            </strong>
                            <p className="text-slate-600 mt-0.5">
                              Address: {activeSupplier?.address || ''}, {activeSupplier?.city || ''}, {activeSupplier?.state ? `${activeSupplier.state}, ` : ''}{activeSupplier?.country || 'India'}{activeSupplier?.postal_code ? ` - ${activeSupplier.postal_code}` : ''}
                            </p>
                            {activeSupplier?.tax_id && (
                              <p className="text-slate-600 mt-0.5 font-medium">
                                GSTIN / Tax ID: <strong>{activeSupplier.tax_id}</strong>
                              </p>
                            )}
                            <p className="text-slate-600 mt-0.5">
                              Contact: {activeSupplier?.contact_name || supplierSignatoryName} ({activeSupplier?.phone || 'Phone N/A'})
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* SCHEDULE A: COMMODITIES TABLE */}
                      <div className="px-10 py-2.5 flex-none" style={{ fontFamily: 'sans-serif' }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black uppercase text-blue-950 tracking-wider">
                            Schedule A: Commodity & Price Specifications
                          </span>
                        </div>

                        <table className="w-full text-left text-[9px] border-collapse border border-slate-300 table-fixed">
                          <thead>
                            <tr className="bg-blue-900 text-white font-black text-[8.5px] uppercase">
                              <th className="py-1.5 px-2 border border-slate-400 w-[6%] text-center">#</th>
                              <th className="py-1.5 px-2 border border-slate-400 w-[28%]">Commodity / Item Description</th>
                              <th className="py-1.5 px-2 border border-slate-400 w-[28%]">Quality Specifications</th>
                              <th className="py-1.5 px-2 border border-slate-400 w-[14%] text-center">Quantity</th>
                              <th className="py-1.5 px-2 border border-slate-400 w-[11%] text-right">Unit Price</th>
                              <th className="py-1.5 px-2 border border-slate-400 w-[13%] text-right">Total ({currency})</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productItems.map((item, idx) => (
                              <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                <td className="py-1.5 px-2 border border-slate-300 text-center font-bold">{idx + 1}</td>
                                <td className="py-1.5 px-2 border border-slate-300 font-extrabold text-slate-900 truncate">
                                  {item.product_name || 'Commodity item'}
                                </td>
                                <td className="py-1.5 px-2 border border-slate-300 text-[8px] text-slate-600 line-clamp-2">
                                  {item.specification || 'Standard export quality'}
                                </td>
                                <td className="py-1.5 px-2 border border-slate-300 text-center font-bold">
                                  {item.quantity} {item.unit}
                                </td>
                                <td className="py-1.5 px-2 border border-slate-300 text-right font-semibold">
                                  {formatCurrency(item.unit_price, currency)}
                                </td>
                                <td className="py-1.5 px-2 border border-slate-300 text-right font-black text-slate-900">
                                  {formatCurrency(item.total_price, currency)}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-slate-100 font-black text-[9.5px]">
                              <td colSpan={5} className="py-1.5 px-2 border border-slate-300 text-right uppercase text-slate-700">
                                Total Contract Value ({currency}):
                              </td>
                              <td className="py-1.5 px-2 border border-slate-300 text-right text-blue-900">
                                {formatCurrency(agreementGrandTotal, currency)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* SCHEDULE B: SHIPMENT & LOGISTICS */}
                      <div className="px-10 py-2.5 flex-none" style={{ fontFamily: 'sans-serif' }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black uppercase text-blue-950 tracking-wider">
                            Schedule B: Shipment, Ports & Logistics Framework
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 bg-slate-50 p-2.5 rounded border border-slate-200 text-[8.5px]">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-500">Target Shipment Date / Cutoff:</span>
                            <strong className="text-slate-900 font-black">{shipmentTargetDate}</strong>
                          </div>

                          <div className="flex justify-between">
                            <span className="font-bold text-slate-500">Port of Loading:</span>
                            <strong className="text-slate-900">{loadingPort}</strong>
                          </div>

                          <div className="flex justify-between">
                            <span className="font-bold text-slate-500">Delivery Incoterms (2020):</span>
                            <strong className="text-blue-900 font-black">{incoterm}</strong>
                          </div>

                          <div className="flex justify-between">
                            <span className="font-bold text-slate-500">Destination Port:</span>
                            <strong className="text-slate-900">{destinationPort}</strong>
                          </div>

                          <div className="flex justify-between col-span-2 border-t border-slate-200 pt-1 mt-0.5">
                            <span className="font-bold text-slate-500">Packaging Requirements:</span>
                            <span className="text-slate-800 font-semibold">{packagingDetails}</span>
                          </div>

                          <div className="flex justify-between col-span-2">
                            <span className="font-bold text-slate-500">Agreed Payment Terms:</span>
                            <span className="text-slate-800 font-bold">{paymentTerms}</span>
                          </div>
                        </div>
                      </div>

                      {/* SCHEDULE C: TERMS & CONDITIONS */}
                      <div className="px-10 py-2 flex-1 relative flex flex-col justify-start">
                        <div className="mb-1.5" style={{ fontFamily: 'sans-serif' }}>
                          <span className="text-[10px] font-black uppercase text-blue-950 tracking-wider">
                            Schedule C: Legal Terms, Covenants & Dispute Resolution
                          </span>
                        </div>

                        <div className="text-[8.5px] leading-relaxed text-slate-700 whitespace-pre-line text-justify space-y-2 pr-1">
                          {agreementBody}
                        </div>
                      </div>

                      {/* SCHEDULE D: ATTESTATION BLOCK */}
                      <div className="px-10 pt-4 pb-6 flex-none relative z-10" style={{ fontFamily: 'sans-serif' }}>
                        <div className="mb-2">
                          <span className="text-[9.5px] font-black uppercase text-blue-950 tracking-wider">
                            Schedule D: Execution, Signatures & Corporate Seal
                          </span>
                          <p className="text-[8px] text-slate-500">
                            IN WITNESS WHEREOF, the authorized representatives of the parties hereto have executed this Agreement on the date first written above.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mt-3">
                          {/* Buyer Execution */}
                          <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/30 relative">
                            <span className="block text-[8px] font-black uppercase text-blue-900 tracking-wider">
                              FOR & ON BEHALF OF BUYER:
                            </span>
                            <strong className="text-[9.5px] font-black text-slate-900 block mt-0.5">
                              SHESHAAN GLOBAL
                            </strong>

                            <div className="h-10 my-1 relative select-none flex items-center">
                              {includeSignature && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src="/signature.png"
                                  alt="CEO Signature"
                                  className="h-20 w-auto object-contain absolute left-0 -top-5 z-10"
                                />
                              )}
                            </div>

                            <div className="text-[8.5px] text-slate-700 leading-tight">
                              <p className="font-black text-slate-900">{signatoryName}</p>
                              <p className="text-slate-500 font-semibold">{signatoryTitle}</p>
                              <p className="text-[8px] text-slate-400 mt-0.5">Date: {agreementDate}</p>
                            </div>

                            {includeStamp && (
                              <div className="absolute right-3 bottom-2 select-none">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src="/stamp.png"
                                  alt="Official Sheshaan Stamp"
                                  className="h-14 w-auto object-contain opacity-95 -rotate-[2deg]"
                                />
                              </div>
                            )}
                          </div>

                          {/* Supplier Execution */}
                          <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50 relative flex flex-col justify-between">
                            <div>
                              <span className="block text-[8px] font-black uppercase text-orange-600 tracking-wider">
                                FOR & ON BEHALF OF SUPPLIER:
                              </span>
                              <strong className="text-[9.5px] font-black text-slate-900 block mt-0.5 truncate">
                                {activeSupplier?.company_name || 'Supplier / Vendor'}
                              </strong>

                              <div className="h-10 my-1 border-b border-dashed border-slate-400 flex items-end">
                                <span className="text-[7.5px] text-slate-400 font-sans italic pb-0.5">Authorized Signature</span>
                              </div>

                              <div className="text-[8.5px] text-slate-700 leading-tight">
                                <p className="font-black text-slate-900">{supplierSignatoryName || 'Authorized Signatory'}</p>
                                <p className="text-slate-500 font-semibold">{supplierSignatoryTitle}</p>
                                <p className="text-[8px] text-slate-400 mt-0.5">Date: ____ / ____ / 2026</p>
                              </div>
                            </div>

                            <div className="absolute right-3 bottom-2 w-16 h-12 border border-dashed border-slate-400 rounded flex items-center justify-center text-center p-1">
                              <span className="text-[6.5px] font-bold text-slate-400 uppercase leading-none">
                                Supplier Stamp
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* FOOTER DIVIDER LINE */}
                      <div className="px-10 flex-none select-none relative z-10">
                        <div className="relative w-full h-[2px] bg-blue-900">
                          <div className="absolute right-0 top-0 h-full w-[35%] bg-orange-500" />
                        </div>
                      </div>

                      {/* FOOTER DETAILS */}
                      <div
                        className="px-10 py-2.5 flex items-center justify-between flex-none z-10 relative select-none text-[7.5px] text-slate-500"
                        style={{ fontFamily: 'sans-serif' }}
                      >
                        <div>
                          <span className="font-bold text-slate-800">SHESHAAN GLOBAL</span> | Plot 1459, Aasinagar, Nagpur, MH, India | GSTIN: 27DCTPB6192N1ZS
                        </div>
                        <div>
                          Ref: <strong className="font-mono text-slate-700">{agreementNumber}</strong> | Confidential Trade Document
                        </div>
                      </div>

                      {/* BOTTOM BAND */}
                      <div className="relative w-full h-5 bg-blue-900 flex-none overflow-hidden select-none z-10">
                        <div className="absolute left-0 top-0 h-full w-9 bg-orange-500 -skew-x-[28deg] -translate-x-3.5" />
                        <div className="absolute left-9 top-0 h-full w-[3px] bg-white -skew-x-[28deg] -translate-x-2" />
                        <div className="absolute left-11 top-0 h-full w-[5px] bg-blue-900 -skew-x-[28deg] -translate-x-2" />
                        <div className="absolute right-0 top-0 h-full w-24 bg-orange-500 -skew-x-[28deg] translate-x-5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD / EDIT SUPPLIER MODAL */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-900" />
                <span>{editingSupplier ? 'Edit Supplier Record' : 'Register New Supplier'}</span>
              </h3>
              <button
                onClick={() => setShowSupplierModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kisan Agri Exports Ltd"
                  value={supplierFormData.company_name || ''}
                  onChange={e => setSupplierFormData({ ...supplierFormData, company_name: e.target.value })}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Contact Person & Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar (Director)"
                    value={supplierFormData.contact_name || ''}
                    onChange={e => setSupplierFormData({ ...supplierFormData, contact_name: e.target.value })}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    GSTIN / Tax ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 27AABCK1234M1Z2"
                    value={supplierFormData.tax_id || ''}
                    onChange={e => setSupplierFormData({ ...supplierFormData, tax_id: e.target.value })}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="supplier@company.com"
                    value={supplierFormData.contact_email || ''}
                    onChange={e => setSupplierFormData({ ...supplierFormData, contact_email: e.target.value })}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={supplierFormData.phone || ''}
                    onChange={e => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  placeholder="Plot/Survey No., Industrial Area, Road"
                  value={supplierFormData.address || ''}
                  onChange={e => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Unjha / Karnal"
                    value={supplierFormData.city || ''}
                    onChange={e => setSupplierFormData({ ...supplierFormData, city: e.target.value })}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">State</label>
                  <input
                    type="text"
                    placeholder="e.g. Gujarat"
                    value={supplierFormData.state || ''}
                    onChange={e => setSupplierFormData({ ...supplierFormData, state: e.target.value })}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Postal Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 384170"
                    value={supplierFormData.postal_code || ''}
                    onChange={e => setSupplierFormData({ ...supplierFormData, postal_code: e.target.value })}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Product Categories Dealing (Comma Separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cumin Seeds, Basmati Rice, Red Chilli, Fennel"
                  value={supplierFormData.product_categories || ''}
                  onChange={e => setSupplierFormData({ ...supplierFormData, product_categories: e.target.value })}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Standard Payment Terms
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 30% Advance, 70% against BL"
                    value={supplierFormData.payment_terms || ''}
                    onChange={e => setSupplierFormData({ ...supplierFormData, payment_terms: e.target.value })}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Partner Status
                  </label>
                  <select
                    value={supplierFormData.status || 'Active'}
                    onChange={e => setSupplierFormData({ ...supplierFormData, status: e.target.value as any })}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800"
                  >
                    <option value="Active">Active</option>
                    <option value="Preferred">Preferred Partner</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Internal Notes & Certifications
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. ISO 22000 certified, capacity details..."
                  value={supplierFormData.notes || ''}
                  onChange={e => setSupplierFormData({ ...supplierFormData, notes: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-900 text-white font-bold hover:bg-blue-800 shadow-sm"
                >
                  {editingSupplier ? 'Update Supplier' : 'Register Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* VIEW SUPPLIER DETAILS MODAL */}
      {viewingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-0 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-scale-up">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="h-11 w-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-inner">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-black text-white">{viewingSupplier.company_name}</h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        viewingSupplier.status === 'Preferred'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : viewingSupplier.status === 'Active'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {viewingSupplier.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {viewingSupplier.city || 'City N/A'}, {viewingSupplier.state ? `${viewingSupplier.state}, ` : ''}{viewingSupplier.country || 'India'}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-amber-400 font-bold">★ {viewingSupplier.rating || 4}/5 Rating</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewingSupplier(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Action Ribbon */}
            <div className="bg-slate-100 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {viewingSupplier.phone && (
                  <a
                    href={`https://wa.me/${viewingSupplier.phone.replace(/[^\d]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition active:scale-95"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>WhatsApp ({viewingSupplier.phone})</span>
                  </a>
                )}

                {viewingSupplier.contact_email && (
                  <a
                    href={`mailto:${viewingSupplier.contact_email}?subject=Sheshaan Global - Commodity Supply Inquiry`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition active:scale-95"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Send Email</span>
                  </a>
                )}

                <button
                  onClick={() => {
                    const supp = viewingSupplier;
                    setViewingSupplier(null);
                    if (supp) handleCreateAgreementForSupplier(supp);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-sm transition active:scale-95"
                >
                  <FileCheck2 className="h-3.5 w-3.5 text-orange-400" />
                  <span>Create Supply Agreement</span>
                </button>
              </div>

              <button
                onClick={() => {
                  const supp = viewingSupplier;
                  setViewingSupplier(null);
                  handleOpenEditSupplier(supp);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-700 text-xs font-semibold"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Contact & Location Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Primary Contact & Communication
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Contact Person</span>
                    <span className="text-xs font-bold text-slate-900 mt-0.5 block">{viewingSupplier.contact_name || 'N/A'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Email Address</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold text-slate-800">{viewingSupplier.contact_email || 'N/A'}</span>
                      {viewingSupplier.contact_email && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(viewingSupplier.contact_email || '');
                            showToast('Email address copied!');
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700"
                          title="Copy Email"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Phone / WhatsApp Number</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold text-slate-800">{viewingSupplier.phone || 'N/A'}</span>
                      {viewingSupplier.phone && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(viewingSupplier.phone || '');
                            showToast('Phone number copied!');
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700"
                          title="Copy Phone"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Full Street Address</span>
                    <span className="text-xs font-medium text-slate-800 mt-0.5 block leading-relaxed">
                      {viewingSupplier.address || 'Address not registered'}
                      {viewingSupplier.city ? `, ${viewingSupplier.city}` : ''}
                      {viewingSupplier.state ? `, ${viewingSupplier.state}` : ''}
                      {viewingSupplier.country ? `, ${viewingSupplier.country}` : ''}
                      {viewingSupplier.postal_code ? ` - ${viewingSupplier.postal_code}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Commercial & Statutory Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Commercial Terms & Statutory Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">GSTIN / Tax ID</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {viewingSupplier.tax_id || 'Not Provided'}
                      </span>
                      {viewingSupplier.tax_id && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(viewingSupplier.tax_id || '');
                            showToast('GSTIN copied!');
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700"
                          title="Copy GSTIN"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Standard Payment Terms</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                      {viewingSupplier.payment_terms || 'Standard Terms'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Commodities Handled */}
              {viewingSupplier.product_categories && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                    Commodities & Sourcing Scope
                  </h4>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {viewingSupplier.product_categories.split(',').map((cat, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 text-xs font-bold border border-blue-200"
                      >
                        {cat.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Internal Notes & Facilities */}
              {viewingSupplier.notes && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                  <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                    Internal Notes & Processing Facilities
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {viewingSupplier.notes}
                  </p>
                </div>
              )}

              {/* Associated Supply Agreements */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black uppercase text-slate-700 tracking-wider">
                    Supply Agreement History
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400">
                    {agreements.filter(a => a.supplier_company_name === viewingSupplier.company_name).length} Recorded
                  </span>
                </div>

                <div className="space-y-2">
                  {agreements
                    .filter(a => a.supplier_company_name === viewingSupplier.company_name)
                    .map(agr => (
                      <div
                        key={agr.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-blue-900">{agr.agreement_number}</span>
                          <span className="text-[10px] text-slate-400 ml-2">{agr.date}</span>
                          <p className="text-[11px] font-bold text-slate-800 line-clamp-1 mt-0.5">
                            {agr.items.map(i => `${i.product_name} (${i.quantity} ${i.unit})`).join(', ')}
                          </p>
                          <span className="text-[10px] text-slate-500">
                            Shipment: {agr.shipment_target_date} • {agr.incoterm}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-black text-slate-900 block">
                            {formatCurrency(agr.total_value, agr.currency)}
                          </span>
                          <button
                            onClick={() => {
                              setViewingSupplier(null);
                              setAgreementNumber(agr.agreement_number);
                              setAgreementDate(agr.date);
                              setShipmentTargetDate(agr.shipment_target_date);
                              setLoadingPort(agr.loading_port);
                              setDestinationPort(agr.destination_port);
                              setIncoterm(agr.incoterm);
                              setPaymentTerms(agr.payment_terms);
                              setProductItems(agr.items);
                              setCurrency(agr.currency);
                              setAgreementTitle(agr.agreement_title);
                              setAgreementBody(agr.agreement_body);
                              setIncludeStamp(agr.include_stamp);
                              setIncludeSignature(agr.include_signature);
                              if (agr.supplier_id) setSelectedSupplierId(agr.supplier_id);
                              setActiveView('studio');
                            }}
                            className="text-[10px] font-bold text-blue-900 hover:underline mt-1 block"
                          >
                            Open in Studio →
                          </button>
                        </div>
                      </div>
                    ))}

                  {agreements.filter(a => a.supplier_company_name === viewingSupplier.company_name).length === 0 && (
                    <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-400 italic">
                        No supply agreements created for this supplier yet.
                      </p>
                      <button
                        onClick={() => {
                          const supp = viewingSupplier;
                          setViewingSupplier(null);
                          if (supp) handleCreateAgreementForSupplier(supp);
                        }}
                        className="mt-2 text-xs font-bold text-blue-900 hover:underline"
                      >
                        + Create First Supply Agreement
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">ID: {viewingSupplier.id}</span>
              <button
                onClick={() => setViewingSupplier(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

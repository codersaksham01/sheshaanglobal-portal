import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { Quote, QuoteItem, BankDetails } from '../lib/types';

// PDF Styling layout
const styles = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingHorizontal: 26,
    paddingBottom: 24,
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: '#334155', // slate-700
    backgroundColor: '#ffffff',
  },
  
  // Upper Header
  companyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1.25,
    borderBottomColor: '#0284c7',
    paddingBottom: 8,
    marginBottom: 9,
  },
  logoImage: {
    width: 58,
    height: 48,
    objectFit: 'contain',
    marginRight: 9,
  },
  companyLogoCol: {
    flexDirection: 'column',
  },
  companyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  companyLogoBadge: {
    backgroundColor: '#0f172a', // dark slate
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    padding: '3 6',
    borderRadius: 2,
    marginRight: 6,
  },
  companyTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  companySlogan: {
    fontSize: 6.3,
    color: '#0f766e',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  companyMeta: {
    fontSize: 5.8,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 1.2,
  },
  docHeaderCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    maxWidth: '42%',
    backgroundColor: '#f0f9ff',
    borderRadius: 4,
    padding: '7 8',
    borderWidth: 0.75,
    borderColor: '#bae6fd',
  },
  docHeaderTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  docHeaderRef: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f766e',
    marginTop: 2,
  },
  docHeaderMeta: {
    fontSize: 6.5,
    color: '#475569',
    marginTop: 2,
  },

  // Section Dividers
  sectionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0f172a',
    backgroundColor: '#eff6ff',
    padding: '3 6',
    borderLeftWidth: 2,
    borderLeftColor: '#0284c7',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Party Details Box
  partyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  partyCard: {
    width: '49%',
    borderWidth: 0.75,
    borderColor: '#cbd5e1',
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  partyHeaderBar: {
    backgroundColor: '#0f172a',
    padding: '2.5 6',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  partyHeaderText: {
    fontSize: 6.8,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  partyBody: {
    padding: '3.5 6',
    lineHeight: 1,
  },
  partyName: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2.5,
  },
  partyText: {
    fontSize: 6,
    color: '#475569',
    lineHeight: 1.05,
  },
  partyInfoRow: {
    flexDirection: 'row',
    borderTopWidth: 0.35,
    borderTopColor: '#e2e8f0',
    paddingTop: 2,
    marginTop: 2,
  },
  partyInfoLabel: {
    width: '17%',
    fontSize: 5.4,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  partyInfoValue: {
    width: '83%',
    fontSize: 5.9,
    color: '#334155',
    lineHeight: 1.05,
  },
  partyMuted: {
    color: '#64748b',
    fontSize: 5.8,
  },

  // Logistics Parameters Grid
  logisticsGrid: {
    borderWidth: 0.75,
    borderColor: '#bae6fd',
    borderRadius: 3,
    marginBottom: 7,
    backgroundColor: '#f0f9ff',
  },
  logisticsRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  logisticsRowLast: {
    flexDirection: 'row',
  },
  logisticsCell: {
    flex: 1,
    padding: '3 6',
    borderRightWidth: 0.5,
    borderRightColor: '#bae6fd',
  },
  logisticsCellLast: {
    flex: 1,
    padding: '3 6',
  },
  logisticsLabel: {
    fontSize: 5.4,
    color: '#0369a1',
    textTransform: 'uppercase',
    marginBottom: 0.5,
  },
  logisticsVal: {
    fontSize: 6.5,
    fontWeight: 'bold',
    color: '#0f172a',
  },

  // Tables
  table: {
    width: '100%',
    marginBottom: 6,
    borderWidth: 0.75,
    borderColor: '#cbd5e1',
    borderRadius: 3,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b', // slate-800
    padding: '4 6',
    alignItems: 'center',
  },
  tableHeaderCol: {
    color: '#ffffff',
    fontSize: 6.5,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
    padding: '4 6',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  tableRowAlternate: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
    padding: '4 6',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  tableCol: {
    fontSize: 6.7,
    color: '#334155',
    lineHeight: 1.2,
  },
  tableColDescBlock: {
    flexDirection: 'column',
  },
  tableColDescTitle: {
    fontWeight: 'bold',
    color: '#0f172a',
    fontSize: 7,
    marginBottom: 1.5,
  },
  tableColDescBullet: {
    fontSize: 6.1,
    color: '#475569',
    marginLeft: 4,
  },

  // Table Column Widths (Commercial offer)
  colSr: { width: '5%' },
  colDesc: { width: '40%' },
  colHs: { width: '10%', textAlign: 'center' },
  colPack: { width: '18%' },
  colQty: { width: '10%', textAlign: 'right' },
  colPrice: { width: '12%', textAlign: 'right' },
  colTotal: { width: '15%', textAlign: 'right' },

  // Table Column Widths (Packing List - no pricing)
  colPlPl: { width: '22%' },
  colPlDesc: { width: '48%' },
  colPlQty: { width: '15%', textAlign: 'right' },
  colPlWeight: { width: '15%', textAlign: 'right' },

  // Subtotals and Grand Totals
  grandTotalRow: {
    flexDirection: 'row',
    backgroundColor: '#cbd5e1',
    padding: '5 6',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grandTotalLabel: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  grandTotalVal: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#0284c7', // Sky-600
  },
  amountWordsBlock: {
    padding: '4 6',
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
  },
  amountWordsText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#475569',
  },

  // Section 3: Cost Breakdown Widths
  colBdSr: { width: '5%' },
  colBdDesc: { width: '45%' },
  colBdBasis: { width: '18%' },
  colBdRate: { width: '15%', textAlign: 'right' },
  colBdTotal: { width: '17%', textAlign: 'right' },

  // Breakdown Summary Rows (FOB subtotal, Ocean freight, CIF Total)
  tableRowSubtotal: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    padding: '5 6',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
  },
  tableRowGrandTotal: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: '5 6',
    alignItems: 'center',
  },
  bdSubtotalLabel: {
    flexGrow: 1,
    fontSize: 7,
    fontWeight: 'bold',
    color: '#1e293b',
    textTransform: 'uppercase',
    textAlign: 'right',
    paddingRight: 10,
  },
  bdSubtotalVal: {
    width: '17%',
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'right',
  },
  bdGrandLabel: {
    flexGrow: 1,
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    textAlign: 'right',
    paddingRight: 10,
  },
  bdGrandVal: {
    width: '17%',
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#38bdf8', // Sky-400
    textAlign: 'right',
  },

  commercialNoteBlock: {
    marginTop: 4,
    paddingHorizontal: 2,
    lineHeight: 1.3,
  },
  commercialNoteText: {
    fontSize: 6.5,
    color: '#64748b',
  },

  // Page 2 CSS
  responsibilitiesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scopeBox: {
    width: '49%',
    borderWidth: 0.75,
    borderRadius: 3,
    padding: 6,
  },
  scopeBoxIncluded: {
    borderColor: '#86efac', // Green-300
    backgroundColor: '#f0fdf4', // Green-50
  },
  scopeBoxExcluded: {
    borderColor: '#fca5a5', // Red-300
    backgroundColor: '#fef2f2', // Red-50
  },
  scopeTitle: {
    fontSize: 7.5,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  scopeTitleIncluded: { color: '#16a34a' },
  scopeTitleExcluded: { color: '#dc2626' },
  bulletList: {
    flexDirection: 'column',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  bulletPoint: {
    fontSize: 7,
    marginRight: 4,
  },
  bulletPointIncluded: { color: '#16a34a' },
  bulletPointExcluded: { color: '#dc2626' },
  bulletText: {
    fontSize: 6.5,
    color: '#334155',
    lineHeight: 1.2,
    flex: 1,
  },

  // Documentations side-by-side Page 2
  docSpecsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  docBox: {
    width: '49%',
    borderWidth: 0.75,
    borderColor: '#94a3b8',
    borderRadius: 3,
    padding: 6,
    backgroundColor: '#f8fafc',
  },
  docTitle: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#1e293b',
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 3,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  specsBox: {
    width: '49%',
    borderWidth: 0.75,
    borderColor: '#94a3b8',
    borderRadius: 3,
    padding: 6,
    backgroundColor: '#f8fafc',
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2.5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  specsLabel: {
    fontSize: 6.5,
    fontWeight: 'bold',
    color: '#475569',
  },
  specsValue: {
    fontSize: 6.5,
    color: '#0f172a',
    textAlign: 'right',
  },

  // Terms and Conditions Section 6
  termsSection: {
    marginBottom: 10,
  },
  termsList: {
    flexDirection: 'column',
    gap: 3,
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2.5,
  },
  termNum: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#0f172a',
    marginRight: 4,
    width: '2.5%',
  },
  termText: {
    fontSize: 6.5,
    color: '#475569',
    lineHeight: 1.25,
    flex: 1,
  },

  // Signatures Section Page 2
  signaturesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto', // Pushes signature box to the very bottom
    paddingTop: 10,
    borderTopWidth: 0.75,
    borderTopColor: '#cbd5e1',
  },
  signatureBox: {
    width: '49%',
    alignItems: 'center',
    padding: 4,
  },
  signatureRoleLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  signatureSignLine: {
    width: '80%',
    borderBottomWidth: 0.75,
    borderBottomColor: '#94a3b8',
    marginBottom: 4,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signatureImage: {
    width: 105,
    height: 34,
    objectFit: 'contain',
    marginBottom: -4,
  },
  signatureCursive: {
    fontSize: 11,
    fontFamily: 'Times-Italic', // standard italic font in pdf
    color: '#1e3a8a', // dark blue ink
  },
  signatureTextName: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  signatureTextCompany: {
    fontSize: 6.5,
    color: '#64748b',
    marginTop: 1,
  },

  // Universal Page Footer
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#cbd5e1',
    paddingTop: 4,
    fontSize: 6,
    color: '#94a3b8',
  }
});

// Helper: Indian & International Number-to-Words logic
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertLessThanThousand(num: number): string {
  if (num === 0) return '';
  let str = '';
  if (num >= 100) {
    str += ones[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num >= 20) {
    str += tens[Math.floor(num / 10)] + ' ';
    num %= 10;
  }
  if (num > 0) {
    str += ones[num] + ' ';
  }
  return str.trim();
}

function numberToWords(num: number, currency: 'USD' | 'INR'): string {
  if (num === 0) return 'Zero';
  
  const integerPart = Math.floor(num);
  let result = '';
  
  if (currency === 'INR') {
    let n = integerPart;
    const crores = Math.floor(n / 10000000);
    n %= 10000000;
    const lakhs = Math.floor(n / 100000);
    n %= 100000;
    const thousands = Math.floor(n / 1000);
    n %= 1000;
    
    if (crores > 0) {
      result += convertLessThanThousand(crores) + ' Crore ';
    }
    if (lakhs > 0) {
      result += convertLessThanThousand(lakhs) + ' Lakh ';
    }
    if (thousands > 0) {
      result += convertLessThanThousand(thousands) + ' Thousand ';
    }
    if (n > 0) {
      result += convertLessThanThousand(n);
    }
    
    result = result.trim();
    return `Indian Rupees ${result} Only.`;
  } else {
    let n = integerPart;
    const billions = Math.floor(n / 1000000000);
    n %= 1000000000;
    const millions = Math.floor(n / 1000000);
    n %= 1000000;
    const thousands = Math.floor(n / 1000);
    n %= 1000;
    
    if (billions > 0) {
      result += convertLessThanThousand(billions) + ' Billion ';
    }
    if (millions > 0) {
      result += convertLessThanThousand(millions) + ' Million ';
    }
    if (thousands > 0) {
      result += convertLessThanThousand(thousands) + ' Thousand ';
    }
    if (n > 0) {
      result += convertLessThanThousand(n);
    }
    
    result = result.trim();
    return `U.S. Dollars ${result} Only.`;
  }
}

interface QuotePDFProps {
  quote: Quote;
  documentType: 'quotation' | 'invoice' | 'packing_list';
}

export const QuotePDF: React.FC<QuotePDFProps> = ({ quote, documentType }) => {
  const getDocumentTitle = () => {
    switch (documentType) {
      case 'invoice':
        return 'COMMERCIAL EXPORT INVOICE';
      case 'packing_list':
        return 'EXPORT PACKING LIST';
      case 'quotation':
      default:
        return 'COMMERCIAL EXPORT QUOTATION';
    }
  };

  // Indian/US formatting utility
  const formatValue = (amount: number) => {
    const symbol = quote.currency === 'INR' ? 'INR' : 'USD';
    const formatter = new Intl.NumberFormat(quote.currency === 'INR' ? 'en-IN' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${symbol} ${formatter.format(amount)}`;
  };

  const lineItems = quote.items || [];
  
  // Calculate item sum base (FOB base value)
  const itemsSubtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  
  // Calculate Subtotal Base Product Value (FOB)
  const totalFOB = itemsSubtotal + Number(quote.packaging_cost) + Number(quote.inland_haulage_cost) + Number(quote.customs_clearance_cost);
  
  // Final CIF
  const totalCIF = totalFOB + Number(quote.freight_cost) + Number(quote.insurance_cost);
  
  // Total quantity
  const totalQty = lineItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalWeight = lineItems.reduce((sum, item) => sum + (item.quantity * (item.weight || 0)), 0);

  const defaultShipper = {
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

  const shipper = quote.shipper_details || defaultShipper;
  const bankDetails = quote.bank_details || defaultBankDetails;
  const client = quote.client || {
    company_name: 'N/A',
    address: 'N/A',
    contact_name: 'N/A',
    contact_email: 'N/A',
    destination_port: 'N/A'
  };
  const clientEmail = client.contact_email || 'N/A';
  const buyerPhone = clientEmail.includes('busyexim') ? '+971 4 388 9100' : 'N/A';

  // Pre-filled scope fallbacks matching the Sheshaan Global sample
  const includedScope = quote.included_responsibilities || [
    'Complete raw product cost & export packing in 40 kg Jute Bags',
    'Inland haulage and transportation from factory to Mundra Port',
    'Terminal Handling Charges (THC) & container stuffing at origin port',
    'Export customs clearance, shipping bill, COO, and Phytosanitary Certificate',
    `Main ocean freight from Mundra to ${client.destination_port} (${formatValue(quote.freight_cost)} lump sum)`,
    `Marine transit cargo insurance policy (${formatValue(quote.insurance_cost)} lump sum)`
  ];

  const excludedScope = quote.excluded_responsibilities || [
    'Import duties, tariffs, and local destination taxes / VAT in destination country',
    `Destination port terminal handling charges (THC at ${client.destination_port})`,
    'Import customs clearance and local destination documentation',
    'Inland transport/delivery from discharge port to buyer warehouse',
    'Container demurrage, detention, or storage fees at destination port',
    'Buyer-requested third-party pre-shipment or destination inspection/testing fees (e.g. SGS / Intertek) unless explicitly agreed in writing.'
  ];

  const docList = quote.included_docs || [
    'Commercial Invoice (Issued)',
    'Packing List (Issued)',
    'Bill of Lading (Clean On-Board B/L)',
    'Marine Insurance Certificate',
    'Certificate of Origin (Issued)',
    'Phytosanitary Certificate (Issued)'
  ];

  const specMap = quote.logistics_specs || {
    shipment_window: '10-14 days post advance payment/LC confirmation',
    transit_time: '7-12 days (approx., subject to carrier schedule)',
    partial_shipment: 'Allowed / Allowed',
    container_type: '20ft FCL Dry Container / Ambient Storage',
    storage_condition: 'Store in a cool, dry place away from direct sunlight'
  };

  const commercialTerms = quote.commercial_terms || [
    `Quotation Validity & Ocean Freight Adjustments: Quoted rates are valid for ${quote.validity_days || 15} days from issuance. Ocean freight rates, insurance premiums, and exchange rates remain indicative until final vessel booking confirmation.`,
    'Payment Terms: ' + quote.payment_terms,
    `Currency Exchange Protections & Settlement: All prices are quoted in ${quote.currency} based on a baseline exchange rate. Final proforma invoicing and settlement may be converted to USD or AED at prevailing RBI reference rates upon agreement.`,
    'Quality Assurance & Pre-Shipment Photos: Goods are supplied strictly per contract specifications. Pre-shipment quality inspection reports, container stuffing/loading photographs, and seal numbers will be provided prior to vessel departure.',
    'Claims & Discrepancies: Any product quality or weight claims must be reported in writing within 48 hours of cargo arrival at destination port, supported by an official independent surveyor report and photographs.',
    'Force Majeure: Seller shall not be held liable for shipment delays or non-performance resulting from vessel delays, port congestion, acts of God, strikes, or unexpected customs policy changes.',
    'Governing Law & Dispute Resolution: This contract shall be governed by Indian Maritime and Commercial Law. Any dispute arising under this agreement shall be subject to the exclusive jurisdiction of the courts in Nagpur, Maharashtra, India, or resolved through binding arbitration.'
  ];

  return (
    <Document>
      
      {/* ==================== PAGE 1 ==================== */}
      <Page size="A4" style={styles.page}>
        
        {/* Upper Header Block */}
        <View style={styles.companyHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image src="/logo.png" style={styles.logoImage} />
            <View style={{ marginLeft: 2 }}>
              <Text style={[styles.companyTitle, { textTransform: 'uppercase' }]}>{shipper.company_name}</Text>
              <Text style={styles.companySlogan}>Exporting Goodness Worldwide</Text>
              <Text style={styles.companyMeta}>
                IEC | GST | APEDA | FSSAI | Global Export Documentation
              </Text>
            </View>
          </View>
          
          <View style={styles.docHeaderCol}>
            <Text style={styles.docHeaderTitle}>{getDocumentTitle()}</Text>
            <Text style={styles.docHeaderRef}>REF: {quote.quote_number}</Text>
            <Text style={styles.docHeaderMeta}>
              Date: {quote.created_at ? new Date(quote.created_at).toLocaleDateString() : new Date().toLocaleDateString()} | Validity: {quote.validity_days || 15} Days
            </Text>
          </View>
        </View>

        {/* 1. QUOTATION & PARTY DETAILS */}
        <Text style={styles.sectionTitle}>1. Quotation & Party Details</Text>
        <View style={styles.partyContainer}>
          <View style={styles.partyCard}>
            <View style={styles.partyHeaderBar}>
              <Text style={styles.partyHeaderText}>Exporter / Seller</Text>
            </View>
            <View style={styles.partyBody}>
              <Text style={styles.partyName}>{shipper.company_name}</Text>
              <Text style={styles.partyText}>{shipper.address}</Text>
              <View style={styles.partyInfoRow}>
                <Text style={styles.partyInfoLabel}>Contact</Text>
                <Text style={styles.partyInfoValue}>
                  {shipper.contact_name} | {shipper.contact_name === 'Sana Zeba Bakshi (CEO)' ? '+91 81499 09546' : '+91 XXXXX XXXXX'}
                </Text>
              </View>
              <View style={styles.partyInfoRow}>
                <Text style={styles.partyInfoLabel}>Email</Text>
                <Text style={styles.partyInfoValue}>{shipper.contact_email} | www.sheshaanglobal.com</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.partyCard}>
            <View style={styles.partyHeaderBar}>
              <Text style={styles.partyHeaderText}>Buyer / Consignee</Text>
            </View>
            <View style={styles.partyBody}>
              <Text style={styles.partyName}>{client.company_name}</Text>
              <Text style={styles.partyText}>{client.address}</Text>
              <View style={styles.partyInfoRow}>
                <Text style={styles.partyInfoLabel}>Contact</Text>
                <Text style={styles.partyInfoValue}>{client.contact_name || 'N/A'} | {buyerPhone}</Text>
              </View>
              <View style={styles.partyInfoRow}>
                <Text style={styles.partyInfoLabel}>Email</Text>
                <Text style={styles.partyInfoValue}>{clientEmail} | Port: {client.destination_port}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Logistics Grid details */}
        <View style={styles.logisticsGrid}>
          <View style={styles.logisticsRow}>
            <View style={styles.logisticsCell}>
              <Text style={styles.logisticsLabel}>Incoterm</Text>
              <Text style={styles.logisticsVal}>CIF (Cost, Insurance & Freight)</Text>
            </View>
            <View style={styles.logisticsCell}>
              <Text style={styles.logisticsLabel}>Origin</Text>
              <Text style={styles.logisticsVal}>{quote.origin_country}</Text>
            </View>
            <View style={styles.logisticsCellLast}>
              <Text style={styles.logisticsLabel}>Loading Port</Text>
              <Text style={styles.logisticsVal}>{quote.loading_port}</Text>
            </View>
          </View>
          <View style={styles.logisticsRowLast}>
            <View style={styles.logisticsCell}>
              <Text style={styles.logisticsLabel}>Destination Port</Text>
              <Text style={styles.logisticsVal}>{client.destination_port}</Text>
            </View>
            <View style={styles.logisticsCell}>
              <Text style={styles.logisticsLabel}>Shipment Mode</Text>
              <Text style={styles.logisticsVal}>{quote.shipment_mode}</Text>
            </View>
            <View style={styles.logisticsCellLast}>
              <Text style={styles.logisticsLabel}>Payment Terms</Text>
              <Text style={styles.logisticsVal}>{quote.payment_terms}</Text>
            </View>
          </View>
        </View>

        {/* 2. COMMERCIAL OFFER & SPECIFICATIONS */}
        <Text style={styles.sectionTitle}>2. {documentType === 'packing_list' ? 'Export Goods Specifications' : 'Commercial Offer & Specifications'}</Text>
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            {documentType !== 'packing_list' ? (
              <>
                <Text style={[styles.tableHeaderCol, styles.colSr]}>SR</Text>
                <Text style={[styles.tableHeaderCol, styles.colDesc]}>Product Description & Specifications</Text>
                <Text style={[styles.tableHeaderCol, styles.colHs]}>HS Code</Text>
                <Text style={[styles.tableHeaderCol, styles.colPack]}>Packing & Container</Text>
                <Text style={[styles.tableHeaderCol, styles.colQty]}>Quantity</Text>
                <Text style={[styles.tableHeaderCol, styles.colPrice]}>Unit Price ({quote.currency})</Text>
                <Text style={[styles.tableHeaderCol, styles.colTotal]}>Total Amount ({quote.currency})</Text>
              </>
            ) : (
              <>
                <Text style={[styles.tableHeaderCol, styles.colSr]}>SR</Text>
                <Text style={[styles.tableHeaderCol, { width: '45%' }]}>Product Description & Specifications</Text>
                <Text style={[styles.tableHeaderCol, { width: '15%', textAlign: 'center' }]}>HS Code</Text>
                <Text style={[styles.tableHeaderCol, { width: '20%' }]}>Packing & Container</Text>
                <Text style={[styles.tableHeaderCol, { width: '15%', textAlign: 'right' }]}>Quantity</Text>
              </>
            )}
          </View>

          {/* Rows */}
          {lineItems.map((item, index) => {
            const isAlternate = index % 2 === 1;
            const rowStyle = isAlternate ? styles.tableRowAlternate : styles.tableRow;
            
            const descLines = (item.description || '').split('\n');
            const mainTitle = descLines[0];
            const bullets = descLines.slice(1);

            return (
              <View key={item.id || index} style={rowStyle}>
                <Text style={[styles.tableCol, styles.colSr]}>{index + 1}</Text>
                
                {documentType !== 'packing_list' ? (
                  <>
                    <View style={[styles.tableCol, styles.colDesc, styles.tableColDescBlock]}>
                      <Text style={styles.tableColDescTitle}>{mainTitle}</Text>
                      {bullets.map((b, bi) => (
                        <Text key={bi} style={styles.tableColDescBullet}>{b}</Text>
                      ))}
                    </View>
                    
                    <Text style={[styles.tableCol, styles.colHs]}>{item.hs_code || 'N/A'}</Text>
                    <Text style={[styles.tableCol, styles.colPack]}>{item.packing_container || 'Standard Carton'}</Text>
                    
                    <Text style={[styles.tableCol, styles.colQty]}>
                      {new Intl.NumberFormat('en-US').format(item.quantity)} kg{"\n"}
                      {item.quantity === 13000 ? '(13.00 MT)' : `(${(item.quantity / 1000).toFixed(2)} MT)`}
                    </Text>
                    
                    <Text style={[styles.tableCol, styles.colPrice]}>
                      {quote.currency === 'INR' ? 'INR' : '$'} {item.unit_price.toFixed(2)}
                    </Text>
                    
                    <Text style={[styles.tableCol, styles.colTotal, { fontWeight: 'bold' }]}>
                      {quote.currency === 'INR' ? 'INR' : '$'} {new Intl.NumberFormat('en-US').format(item.quantity * item.unit_price)}
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={[styles.tableCol, { width: '45%' }, styles.tableColDescBlock]}>
                      <Text style={styles.tableColDescTitle}>{mainTitle}</Text>
                      {bullets.map((b, bi) => (
                        <Text key={bi} style={styles.tableColDescBullet}>{b}</Text>
                      ))}
                    </View>
                    <Text style={[styles.tableCol, { width: '15%', textAlign: 'center' }]}>{item.hs_code || 'N/A'}</Text>
                    <Text style={[styles.tableCol, { width: '20%' }]}>{item.packing_container || 'Standard Carton'}</Text>
                    <Text style={[styles.tableCol, { width: '15%', textAlign: 'right', fontWeight: 'bold' }]}>
                      {new Intl.NumberFormat('en-US').format(item.quantity)} kg{"\n"}
                      {item.quantity === 13000 ? '(13.00 MT)' : `(${(item.quantity / 1000).toFixed(2)} MT)`}
                    </Text>
                  </>
                )}
              </View>
            );
          })}

          {/* Grand total header row of section 2 */}
          {documentType !== 'packing_list' && (
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total CIF {client.destination_port}</Text>
              <Text style={styles.grandTotalVal}>{formatValue(totalCIF)}</Text>
            </View>
          )}
        </View>

        {/* Amount in words */}
        {documentType !== 'packing_list' && (
          <View style={styles.amountWordsBlock}>
            <Text style={styles.amountWordsText}>
              Amount in Words: {numberToWords(totalCIF, quote.currency)}
            </Text>
          </View>
        )}

        {/* 3. TRANSPARENT CIF COST STRUCTURE BREAKDOWN / BANK INSTRUCTIONS */}
        {documentType === 'quotation' && (
          <>
            <Text style={styles.sectionTitle}>3. Transparent CIF Cost Structure Breakdown</Text>
            <View style={styles.table}>
              {/* Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCol, styles.colBdSr]}>SR</Text>
                <Text style={[styles.tableHeaderCol, styles.colBdDesc]}>Cost Component Itemization</Text>
                <Text style={[styles.tableHeaderCol, styles.colBdBasis]}>Basis of Calculation</Text>
                <Text style={[styles.tableHeaderCol, styles.colBdRate]}>Rate / Charge</Text>
                <Text style={[styles.tableHeaderCol, styles.colBdTotal]}>Total Amount ({quote.currency})</Text>
              </View>

              {/* Row 1: FOB Base Product Value */}
              <View style={styles.tableRow}>
                <Text style={[styles.tableCol, styles.colBdSr]}>1</Text>
                <View style={[styles.tableCol, styles.colBdDesc]}>
                  <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>Base Product Value (FOB {quote.loading_port.split(',')[0].trim()})</Text>
                  <Text style={{ fontSize: 6, color: '#64748b', marginTop: 1 }}>
                    FOB package value including raw product cost, packaging, loading, haulage and origin port charges.
                  </Text>
                </View>
                <Text style={[styles.tableCol, styles.colBdBasis]}>Per kg ({new Intl.NumberFormat('en-US').format(totalQty)} kg)</Text>
                <Text style={[styles.tableCol, styles.colBdRate]}>
                  {quote.currency === 'INR' ? 'INR' : '$'} {(totalFOB / (totalQty || 1)).toFixed(2)} / kg
                </Text>
                <Text style={[styles.tableCol, styles.colBdTotal]}>{formatValue(totalFOB)}</Text>
              </View>

              {/* Row 2: Main Ocean Freight */}
              <View style={styles.tableRowAlternate}>
                <Text style={[styles.tableCol, styles.colBdSr]}>2</Text>
                <View style={[styles.tableCol, styles.colBdDesc]}>
                  <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>Main Ocean Freight</Text>
                  <Text style={{ fontSize: 6, color: '#64748b', marginTop: 1 }}>Lump-sum ocean freight from {quote.loading_port.split(',')[0].trim()} to {client.destination_port.split(',')[0].trim()}.</Text>
                </View>
                <Text style={[styles.tableCol, styles.colBdBasis]}>Lump Sum ({quote.shipment_mode})</Text>
                <Text style={[styles.tableCol, styles.colBdRate]}>Overall Order</Text>
                <Text style={[styles.tableCol, styles.colBdTotal]}>{formatValue(quote.freight_cost)}</Text>
              </View>

              {/* Row 3: Insurance */}
              <View style={styles.tableRow}>
                <Text style={[styles.tableCol, styles.colBdSr]}>3</Text>
                <View style={[styles.tableCol, styles.colBdDesc]}>
                  <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>Marine Cargo Transit Insurance</Text>
                  <Text style={{ fontSize: 6, color: '#64748b', marginTop: 1 }}>Comprehensive marine transit cargo insurance policy up to destination port.</Text>
                </View>
                <Text style={[styles.tableCol, styles.colBdBasis]}>Lump Sum (Policy)</Text>
                <Text style={[styles.tableCol, styles.colBdRate]}>Overall Order</Text>
                <Text style={[styles.tableCol, styles.colBdTotal]}>{formatValue(quote.insurance_cost)}</Text>
              </View>

              {/* Grand total breakdown */}
              <View style={styles.tableRowGrandTotal}>
                <Text style={styles.bdGrandLabel}>Total Offered CIF Value ({client.destination_port.split(',')[0].toUpperCase()})</Text>
                <Text style={styles.bdGrandVal}>{formatValue(totalCIF)}</Text>
              </View>
            </View>
          </>
        )}

        {documentType === 'invoice' && (
          <>
            <Text style={styles.sectionTitle}>3. Banking Settlement & Wire Instructions</Text>
            <View style={{ borderWidth: 0.75, borderColor: '#cbd5e1', borderRadius: 3, padding: 8, backgroundColor: '#f8fafc', marginBottom: 10 }}>
              <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: '#0f172a', marginBottom: 6, borderBottomWidth: 0.5, borderBottomColor: '#cbd5e1', paddingBottom: 2 }}>TELEGRAPHIC TRANSFER (T/T) ACCOUNT ROUTING</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <View style={{ width: '48%', marginBottom: 3 }}>
                  <Text style={{ fontSize: 5.5, color: '#64748b', textTransform: 'uppercase' }}>Beneficiary Bank</Text>
                  <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#334155' }}>{bankDetails.beneficiary_bank}</Text>
                </View>
                <View style={{ width: '48%', marginBottom: 3 }}>
                  <Text style={{ fontSize: 5.5, color: '#64748b', textTransform: 'uppercase' }}>Branch Location</Text>
                  <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#334155' }}>{bankDetails.branch_location}</Text>
                </View>
                <View style={{ width: '48%', marginBottom: 3 }}>
                  <Text style={{ fontSize: 5.5, color: '#64748b', textTransform: 'uppercase' }}>Account Holder Name</Text>
                  <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#334155' }}>{bankDetails.account_holder_name}</Text>
                </View>
                <View style={{ width: '48%', marginBottom: 3 }}>
                  <Text style={{ fontSize: 5.5, color: '#64748b', textTransform: 'uppercase' }}>Routing Account Number</Text>
                  <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#334155' }}>{bankDetails.account_number}</Text>
                </View>
                <View style={{ width: '48%' }}>
                  <Text style={{ fontSize: 5.5, color: '#64748b', textTransform: 'uppercase' }}>Local IFSC Code</Text>
                  <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#334155' }}>{bankDetails.ifsc_code}</Text>
                </View>
                <View style={{ width: '48%' }}>
                  <Text style={{ fontSize: 5.5, color: '#64748b', textTransform: 'uppercase' }}>SWIFT BIC Identifier</Text>
                  <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#334155' }}>{bankDetails.swift_code}</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {documentType === 'packing_list' && (
          <>
            <Text style={styles.sectionTitle}>3. Shipping Weight & Volumetric Totals</Text>
            <View style={{ borderWidth: 0.75, borderColor: '#cbd5e1', borderRadius: 3, padding: 8, backgroundColor: '#f8fafc', marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 6, color: '#64748b', textTransform: 'uppercase' }}>Total Packages</Text>
                <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#0f172a', marginTop: 2 }}>{lineItems.length === 1 && lineItems[0]?.packing_container?.includes('325') ? '325 Bags' : 'Standard Crates/Bags'}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 6, color: '#64748b', textTransform: 'uppercase' }}>Total Estimated Gross Weight</Text>
                <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#0f172a', marginTop: 2 }}>{new Intl.NumberFormat('en-US').format(totalWeight)} kg</Text>
              </View>
              <View>
                <Text style={{ fontSize: 6, color: '#64748b', textTransform: 'uppercase' }}>Shipment Container Specifications</Text>
                <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#0f172a', marginTop: 2 }}>{quote.shipment_mode}</Text>
              </View>
            </View>
          </>
        )}

        {/* Note on commercial structure */}
        {documentType === 'quotation' && quote.commercial_note && (
          <View style={styles.commercialNoteBlock}>
            <Text style={styles.commercialNoteText}>
              Note on Commercial Structure: {quote.commercial_note}
            </Text>
          </View>
        )}

        {/* Footer Page 1 */}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => (
            `${shipper.company_name} | Office: Maharashtra, India | Email: ${shipper.contact_email} | Web: www.sheshaanglobal.com | Page 1 of 2`
          )}
          fixed
        />
      </Page>

      {/* ==================== PAGE 2 ==================== */}
      <Page size="A4" style={styles.page}>
        
        {/* Mini Header Page 2 */}
        <View style={[styles.companyHeader, { marginBottom: 15 }]}>
          <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#475569' }}>
            {shipper.company_name.toUpperCase()} - {getDocumentTitle()} REF: {quote.quote_number}
          </Text>
          <Text style={{ fontSize: 8, color: '#64748b' }}>
            Date: {quote.created_at ? new Date(quote.created_at).toLocaleDateString() : new Date().toLocaleDateString()}
          </Text>
        </View>

        {/* 4. SCOPE OF RESPONSIBILITIES & EXPORT CONDITIONS */}
        {documentType !== 'packing_list' ? (
          <>
            <Text style={styles.sectionTitle}>4. Scope of Responsibilities & Export Conditions</Text>
            <View style={styles.responsibilitiesContainer}>
              
              <View style={[styles.scopeBox, styles.scopeBoxIncluded]}>
                <Text style={[styles.scopeTitle, styles.scopeTitleIncluded]}>Included in Seller&apos;s CIF Price</Text>
                <View style={styles.bulletList}>
                  {includedScope.map((item, idx) => (
                    <View key={idx} style={styles.bulletRow}>
                      <Text style={[styles.bulletPoint, styles.bulletPointIncluded]}>-</Text>
                      <Text style={styles.bulletText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
              
              <View style={[styles.scopeBox, styles.scopeBoxExcluded]}>
                <Text style={[styles.scopeTitle, styles.scopeTitleExcluded]}>Buyer Exclusions & Responsibilities</Text>
                <View style={styles.bulletList}>
                  {excludedScope.map((item, idx) => (
                    <View key={idx} style={styles.bulletRow}>
                      <Text style={[styles.bulletPoint, styles.bulletPointExcluded]}>-</Text>
                      <Text style={styles.bulletText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>4. Packaging & Stuffing Specifications</Text>
            <View style={{ borderWidth: 0.75, borderColor: '#cbd5e1', borderRadius: 3, padding: 8, backgroundColor: '#f8fafc', marginBottom: 12 }}>
              <Text style={{ fontSize: 7, color: '#334155', lineHeight: 1.4 }}>
                - Packaging Material: High-strength, food-grade single Jute Bags (40 kg Net / Bag) with internal LDPE poly liner (50 microns).{"\n"}
                - Container Stuffing: 325 bags manually palletized, strapped, and shrink-wrapped with corner guards inside a standard 20ft FCL container.{"\n"}
                - Cargo Protection: Desiccant bags placed inside container to prevent sweat/moisture condensation.
              </Text>
            </View>
          </>
        )}

        {/* 5. DOCUMENTATION & LOGISTICS PARAMETERS */}
        <Text style={styles.sectionTitle}>5. Documentation & Logistics Parameters</Text>
        <View style={styles.docSpecsContainer}>
          
          <View style={styles.docBox}>
            <Text style={styles.docTitle}>{documentType === 'packing_list' ? 'Shipping Documents Attached' : 'Export Documentation Included'}</Text>
            <View style={styles.bulletList}>
              {docList.map((item, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Text style={[styles.bulletPoint, { color: '#475569' }]}>-</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
          
          <View style={styles.specsBox}>
            <Text style={styles.docTitle}>Logistics & Operational Specifications</Text>
            
            <View style={styles.specsRow}>
              <Text style={styles.specsLabel}>Shipment Window:</Text>
              <Text style={styles.specsValue}>{specMap.shipment_window}</Text>
            </View>
            <View style={styles.specsRow}>
              <Text style={styles.specsLabel}>Transit Time:</Text>
              <Text style={styles.specsValue}>{specMap.transit_time}</Text>
            </View>
            <View style={styles.specsRow}>
              <Text style={styles.specsLabel}>Partial Shipment / Transshipment:</Text>
              <Text style={styles.specsValue}>{specMap.partial_shipment}</Text>
            </View>
            <View style={styles.specsRow}>
              <Text style={styles.specsLabel}>Container Type:</Text>
              <Text style={styles.specsValue}>{specMap.container_type}</Text>
            </View>
            <View style={[styles.specsRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.specsLabel}>Storage Condition:</Text>
              <Text style={styles.specsValue}>{specMap.storage_condition}</Text>
            </View>
          </View>
        </View>

        {/* 6. COMMERCIAL TERMS & CONDITIONS */}
        {documentType !== 'packing_list' ? (
          <>
            <Text style={styles.sectionTitle}>6. Commercial Terms & Conditions</Text>
            <View style={styles.termsSection}>
              <View style={styles.termsList}>
                {commercialTerms.map((term, idx) => (
                  <View key={idx} style={styles.termRow}>
                    <Text style={styles.termNum}>{idx + 1}.</Text>
                    <Text style={styles.termText}>{term}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>6. Port Delivery & Receipt Conditions</Text>
            <View style={{ borderLeftWidth: 2, borderLeftColor: '#0ea5e9', paddingLeft: 6, marginBottom: 15 }}>
              <Text style={{ fontSize: 6.5, color: '#64748b', lineHeight: 1.4 }}>
                1. Recipient must perform validation of seal integrity and container numbers against the Clean Bill of Lading immediately upon port clearance.
                2. Weight tolerances: A standard moisture weight variation of +/- 0.5% during sea transport is commercially acceptable.
              </Text>
            </View>
          </>
        )}

        {/* SIGNATURES BLOCK */}
        <View style={styles.signaturesGrid}>
          
          <View style={styles.signatureBox}>
            <Text style={styles.signatureRoleLabel}>For Sheshaan Global{"\n"}(Exporter / Seller Authorization)</Text>
            <View style={styles.signatureSignLine}>
              <Image src="/sana-signature.png" style={styles.signatureImage} />
            </View>
            <Text style={styles.signatureTextName}>{shipper.contact_name}</Text>
            <Text style={styles.signatureTextCompany}>Proprietor & CEO, {shipper.company_name}</Text>
          </View>
          
          <View style={styles.signatureBox}>
            <Text style={styles.signatureRoleLabel}>{documentType === 'packing_list' ? 'Received & Audited By Buyer' : 'Accepted & Confirmed By Buyer'}{"\n"}(Buyer Order Confirmation)</Text>
            <View style={[styles.signatureSignLine, { borderStyle: 'dashed' }]} />
            <Text style={styles.signatureTextName}>Authorized Buyer Signature & Stamp</Text>
            <Text style={styles.signatureTextCompany}>{client.contact_name} / {client.company_name}</Text>
          </View>
        </View>

        {/* Footer Page 2 */}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => (
            `${shipper.company_name} | Office: Maharashtra, India | Email: ${shipper.contact_email} | Web: www.sheshaanglobal.com | Page 2 of 2`
          )}
          fixed
        />
      </Page>

    </Document>
  );
};

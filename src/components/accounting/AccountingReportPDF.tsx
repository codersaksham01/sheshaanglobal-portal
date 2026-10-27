import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Svg, Path, Line, Circle, Font } from '@react-pdf/renderer';
import { AccountingRecord, AccountingSummary } from '../../lib/types';

// Asset path resolver helper for browser & server/test environments
const isBrowser = typeof window !== 'undefined';
const getAssetSrc = (relPath: string) => {
  if (isBrowser) return relPath;
  try {
    return `${process.cwd()}/public${relPath}`;
  } catch {
    return relPath;
  }
};

try {
  Font.register({
    family: 'TimesCustom',
    fonts: [
      { src: isBrowser ? '/fonts/Times-Regular.ttf' : `${process.cwd()}/public/fonts/Times-Regular.ttf`, fontWeight: 'normal' },
      { src: isBrowser ? '/fonts/Times-Bold.ttf' : `${process.cwd()}/public/fonts/Times-Bold.ttf`, fontWeight: 'bold' }
    ]
  });

  Font.register({
    family: 'ArialCustom',
    fonts: [
      { src: isBrowser ? '/fonts/Arial-Regular.ttf' : `${process.cwd()}/public/fonts/Arial-Regular.ttf`, fontWeight: 'normal' },
      { src: isBrowser ? '/fonts/Arial-Bold.ttf' : `${process.cwd()}/public/fonts/Arial-Bold.ttf`, fontWeight: 'bold' }
    ]
  });
} catch (e) {
  // Graceful fallback to default core PDF fonts
}

// Design System Palette (faithfully matching Sheshaan Global corporate quotation style)
const C = {
  navyDark: '#101B32',         // Deep corporate navy
  navyMedium: '#173D5B',       // Header bar & table headers
  navyHeaderBorder: '#275276', // Vertical borders in table headers
  slateText: '#2D3748',        // Main body text
  slateMuted: '#556987',       // Subtitles, labels
  slateLight: '#475569',       // Details labels
  bgSection: '#EEF2F6',        // Section ribbon & note background
  borderGrey: '#D6DEE7',       // Table & card borders
  borderLight: '#E2E8F0',      // Dividers
  bgWords: '#FFF5EA',          // Peach words box
  borderWords: '#F6D7B8',      // Peach words box border
  bgTotalRow: '#EAF2F8',       // Light blue total row tint
  white: '#FFFFFF',
  goldLine: '#CBB499',         // Header vertical line
  emerald: '#059669',
  rose: '#E11D48',
  amber: '#D97706'
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingHorizontal: 26,
    paddingBottom: 22,
    fontFamily: 'ArialCustom',
    fontSize: 7.5,
    color: C.slateText,
    backgroundColor: C.white,
  },

  // Upper Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '60%',
  },
  logo: {
    width: 58,
    height: 48,
    objectFit: 'contain',
    marginRight: 8,
  },
  brandCol: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  companyTitle: {
    fontFamily: 'TimesCustom',
    fontWeight: 'bold',
    fontSize: 18,
    color: C.navyDark,
    letterSpacing: 0.6,
  },
  tagline: {
    fontFamily: 'ArialCustom',
    fontSize: 6.8,
    color: '#475569',
    letterSpacing: 1.8,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  regLine: {
    fontFamily: 'ArialCustom',
    fontSize: 5.6,
    color: '#64748B',
    letterSpacing: 0.4,
    marginTop: 3,
  },
  headerDivider: {
    width: 0.75,
    height: 52,
    backgroundColor: C.goldLine,
    marginHorizontal: 10,
  },
  headerRight: {
    flexDirection: 'column',
    width: '36%',
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  docTitle: {
    fontFamily: 'ArialCustom',
    fontSize: 6.8,
    color: '#475569',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  refNumber: {
    fontFamily: 'TimesCustom',
    fontWeight: 'bold',
    fontSize: 12.5,
    color: C.navyDark,
    marginBottom: 3,
  },
  metaTable: {
    flexDirection: 'column',
    width: '100%',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1.2,
  },
  metaLabel: {
    fontFamily: 'ArialCustom',
    fontSize: 6.5,
    color: '#334155',
    width: 44,
  },
  metaColon: {
    fontFamily: 'ArialCustom',
    fontSize: 6.5,
    color: '#334155',
    width: 8,
    textAlign: 'center',
  },
  metaVal: {
    fontFamily: 'ArialCustom',
    fontSize: 6.5,
    color: C.navyDark,
  },

  // Section Banner Ribbon
  sectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bgSection,
    height: 17,
    marginTop: 6,
    marginBottom: 5,
    overflow: 'hidden',
  },
  sectionBadge: {
    width: 24,
    height: '100%',
    backgroundColor: C.navyMedium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionBadgeText: {
    fontFamily: 'TimesCustom',
    fontWeight: 'bold',
    fontSize: 9,
    color: C.white,
  },
  sectionTitleText: {
    fontFamily: 'TimesCustom',
    fontWeight: 'bold',
    fontSize: 8,
    color: C.navyDark,
    paddingLeft: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // Executive Summary 4-Column Bar
  summaryBar: {
    flexDirection: 'row',
    borderWidth: 0.75,
    borderColor: C.borderGrey,
    borderRadius: 2,
    backgroundColor: C.white,
    marginBottom: 6,
    alignItems: 'stretch',
  },
  summaryCol: {
    flex: 1,
    paddingVertical: 4.5,
    paddingHorizontal: 6,
    borderRightWidth: 0.75,
    borderRightColor: C.borderGrey,
  },
  summaryColLast: {
    flex: 1,
    paddingVertical: 4.5,
    paddingHorizontal: 6,
  },
  summaryLabel: {
    fontFamily: 'ArialCustom',
    fontSize: 5.8,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 1.5,
  },
  summaryValue: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 9,
    color: C.navyDark,
  },
  summarySub: {
    fontFamily: 'ArialCustom',
    fontSize: 5.4,
    color: '#94A3B8',
    marginTop: 1,
  },

  // Tables
  table: {
    borderWidth: 0.75,
    borderColor: C.borderGrey,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
    backgroundColor: C.white,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.navyMedium,
    paddingVertical: 3.5,
    alignItems: 'center',
  },
  thText: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 6.2,
    color: C.white,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEF2F6',
    paddingVertical: 3,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  tdText: {
    fontFamily: 'ArialCustom',
    fontSize: 6.3,
    color: C.slateText,
  },
  tdTextBold: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 6.3,
    color: C.navyDark,
  },

  // Totals Row
  totalRow: {
    flexDirection: 'row',
    backgroundColor: C.bgTotalRow,
    borderTopWidth: 0.75,
    borderTopColor: C.borderGrey,
    paddingVertical: 3.5,
    alignItems: 'center',
  },
  totalLabel: {
    fontFamily: 'TimesCustom',
    fontWeight: 'bold',
    fontSize: 7.2,
    color: C.navyDark,
    textTransform: 'uppercase',
  },
  totalVal: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 8,
    color: C.navyDark,
    textAlign: 'right',
  },

  // Peach Words Box
  wordsBox: {
    borderWidth: 0.75,
    borderColor: C.borderWords,
    backgroundColor: C.bgWords,
    borderRadius: 2,
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  wordsText: {
    fontFamily: 'ArialCustom',
    fontSize: 6.3,
    color: '#334155',
  },

  // Note / Compliance Box
  complianceBox: {
    borderWidth: 0.75,
    borderColor: C.borderGrey,
    borderRadius: 2,
    backgroundColor: C.bgSection,
    paddingVertical: 4.5,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  complianceTitle: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 6.5,
    color: C.navyDark,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  complianceText: {
    fontFamily: 'ArialCustom',
    fontSize: 5.6,
    color: '#334155',
    lineHeight: 1.3,
  },

  // Signatures Dual Box
  signaturesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 6,
  },
  signatureBox: {
    width: '49%',
    borderWidth: 0.75,
    borderColor: C.borderGrey,
    borderRadius: 2,
    padding: 6,
    alignItems: 'center',
    backgroundColor: C.white,
  },
  signatureRoleLabel: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 6.3,
    color: C.navyDark,
    textAlign: 'center',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  signatureSignLine: {
    width: '80%',
    height: 38,
    borderBottomWidth: 0.75,
    borderBottomColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    position: 'relative',
  },
  signatureImage: {
    width: 75,
    height: 32,
    objectFit: 'contain',
  },
  stampImage: {
    width: 44,
    height: 44,
    objectFit: 'contain',
    position: 'absolute',
    right: 8,
    top: -4,
    opacity: 0.88,
  },
  signatureTextName: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 6.5,
    color: C.navyDark,
    marginTop: 2,
  },
  signatureTextCompany: {
    fontFamily: 'ArialCustom',
    fontSize: 5.6,
    color: '#64748B',
  },

  // Corporate Footer
  footer: {
    borderTopWidth: 0.75,
    borderTopColor: C.borderGrey,
    paddingTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  footerCol: {
    flexDirection: 'column',
  },
  footerHeading: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 5.6,
    color: C.navyDark,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  footerText: {
    fontFamily: 'ArialCustom',
    fontSize: 5.2,
    color: '#64748B',
    lineHeight: 1.25,
  }
});

// Amount in words conversion for Indian Rupee format
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

function numberToWordsINR(num: number): string {
  const safeNum = Math.round(Number(num) || 0);
  if (safeNum <= 0) return 'Indian Rupees Zero Only.';

  let n = safeNum;
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const remainder = n;

  let result = '';
  if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
  if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
  if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
  if (remainder > 0) result += convertLessThanThousand(remainder) + ' ';

  return `Indian Rupees ${result.trim()} Only.`;
}

export interface AccountingReportPDFProps {
  records: AccountingRecord[];
  summary: AccountingSummary;
  dateRangeLabel?: string;
  generatedBy?: string;
  reportRef?: string;
  statementPeriod?: string;
}

export const AccountingReportPDF: React.FC<AccountingReportPDFProps> = ({
  records = [],
  summary,
  dateRangeLabel = 'Current Financial Period',
  generatedBy = 'Accounts & Finance Department',
  reportRef = 'SG-ACCR-2026-0042',
  statementPeriod = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}) => {
  const approvedExpenses = records.filter(r => r.type === 'expense' && r.status === 'approved');
  const totalApprovedExpense = approvedExpenses.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalIncome = records.filter(r => r.type === 'income').reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const netMargin = totalIncome - totalApprovedExpense;
  const pendingApprovals = records.filter(r => r.type === 'expense' && r.status === 'pending_approval');
  const pendingAmount = pendingApprovals.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  // Group approved expenses by category
  const categoryMap = new Map<string, { total: number; count: number }>();
  for (const item of approvedExpenses) {
    const cat = item.category || 'General Operations';
    const curr = categoryMap.get(cat) || { total: 0, count: 0 };
    curr.total += Number(item.amount || 0);
    curr.count += 1;
    categoryMap.set(cat, curr);
  }
  const categoryList = Array.from(categoryMap.entries()).map(([cat, data]) => ({
    category: cat,
    total: data.total,
    count: data.count,
    share: totalApprovedExpense > 0 ? (data.total / totalApprovedExpense) * 100 : 0
  })).sort((a, b) => b.total - a.total);

  return (
    <Document title={`Sheshaan-Global-Financial-Statement-${reportRef}`} author="Sheshaan Global">
      {/* PAGE 1: Executive Summary, Category Breakdown, and Primary Ledger */}
      <Page size="A4" style={styles.page}>
        {/* UPPER HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image src={getAssetSrc('/logo.png')} style={styles.logo} />
            <View style={styles.brandCol}>
              <Text style={styles.companyTitle}>SHESHAAN GLOBAL</Text>
              <Text style={styles.tagline}>EXPORTING GOODNESS WORLDWIDE</Text>
              <Text style={styles.regLine}>IEC | GST | APEDA | FSSAI | Internal Corporate Finance & Audit</Text>
            </View>
          </View>

          <View style={styles.headerDivider} />

          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>FINANCIAL STATEMENT & EXPENSE AUDIT</Text>
            <Text style={styles.refNumber}>{reportRef}</Text>
            <View style={styles.metaTable}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Statement Date</Text>
                <Text style={styles.metaColon}>:</Text>
                <Text style={styles.metaVal}>{new Date().toLocaleDateString('en-GB')}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Period Covered</Text>
                <Text style={styles.metaColon}>:</Text>
                <Text style={styles.metaVal}>{dateRangeLabel}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Auditor / Desk</Text>
                <Text style={styles.metaColon}>:</Text>
                <Text style={styles.metaVal}>{generatedBy}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 1: EXECUTIVE FINANCIAL SUMMARY */}
        <View style={styles.sectionBar}>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>1</Text>
          </View>
          <Text style={styles.sectionTitleText}>EXECUTIVE FINANCIAL SUMMARY (INR)</Text>
        </View>

        <View style={styles.summaryBar}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Total Income / Inflows</Text>
            <Text style={[styles.summaryValue, { color: C.navyDark }]}>
              ₹{totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={styles.summarySub}>Inward Export Remittances</Text>
          </View>

          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Total Approved Expenses</Text>
            <Text style={[styles.summaryValue, { color: C.navyDark }]}>
              ₹{totalApprovedExpense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={styles.summarySub}>{approvedExpenses.length} Audited Disbursements</Text>
          </View>

          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Net Operating Balance</Text>
            <Text style={[styles.summaryValue, { color: netMargin >= 0 ? C.emerald : C.rose }]}>
              ₹{netMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={styles.summarySub}>{netMargin >= 0 ? 'Surplus / Operating Margin' : 'Deficit'}</Text>
          </View>

          <View style={styles.summaryColLast}>
            <Text style={styles.summaryLabel}>Pending Admin Approval</Text>
            <Text style={[styles.summaryValue, { color: pendingApprovals.length > 0 ? C.amber : C.slateMuted }]}>
              ₹{pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={styles.summarySub}>{pendingApprovals.length} Awaiting Sana Zeba Bakshi</Text>
          </View>
        </View>

        {/* SECTION 2: EXPENSE BREAKDOWN BY COST CENTER */}
        <View style={styles.sectionBar}>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>2</Text>
          </View>
          <Text style={styles.sectionTitleText}>EXPENSE BREAKDOWN BY COST CENTER & CATEGORY</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.thText, { width: '6%', textAlign: 'center' }]}>SR</Text>
            <Text style={[styles.thText, { width: '44%', paddingLeft: 6 }]}>Cost Center / Category</Text>
            <Text style={[styles.thText, { width: '16%', textAlign: 'center' }]}>Transactions</Text>
            <Text style={[styles.thText, { width: '16%', textAlign: 'center' }]}>Share %</Text>
            <Text style={[styles.thText, { width: '18%', textAlign: 'right', paddingRight: 6 }]}>Incurred (INR)</Text>
          </View>

          {categoryList.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.tdText, { width: '100%', textAlign: 'center', paddingVertical: 4, color: '#64748B' }]}>
                No approved expenses logged for this statement period.
              </Text>
            </View>
          ) : (
            categoryList.map((cat, idx) => (
              <View key={cat.category} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.tdText, { width: '6%', textAlign: 'center' }]}>{idx + 1}</Text>
                <Text style={[styles.tdTextBold, { width: '44%', paddingLeft: 6 }]}>{cat.category}</Text>
                <Text style={[styles.tdText, { width: '16%', textAlign: 'center' }]}>{cat.count} voucher(s)</Text>
                <Text style={[styles.tdText, { width: '16%', textAlign: 'center' }]}>{cat.share.toFixed(1)}%</Text>
                <Text style={[styles.tdTextBold, { width: '18%', textAlign: 'right', paddingRight: 6 }]}>
                  ₹{cat.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            ))
          )}

          {categoryList.length > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { width: '50%', paddingLeft: 6 }]}>Total Operational Expenditure</Text>
              <Text style={[styles.tdText, { width: '16%', textAlign: 'center', fontWeight: 'bold' }]}>
                {approvedExpenses.length} vouchers
              </Text>
              <Text style={[styles.tdText, { width: '16%', textAlign: 'center', fontWeight: 'bold' }]}>100.0%</Text>
              <Text style={[styles.totalVal, { width: '18%', paddingRight: 6 }]}>
                ₹{totalApprovedExpense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          )}
        </View>

        {/* SECTION 3: ITEMIZED EXPENDITURE & DISBURSEMENT LEDGER */}
        <View style={styles.sectionBar}>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>3</Text>
          </View>
          <Text style={styles.sectionTitleText}>ITEMIZED EXPENDITURE & DISBURSEMENT LEDGER</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.thText, { width: '5%', textAlign: 'center' }]}>SR</Text>
            <Text style={[styles.thText, { width: '12%', paddingLeft: 4 }]}>Date</Text>
            <Text style={[styles.thText, { width: '28%', paddingLeft: 4 }]}>Description / Cost Head</Text>
            <Text style={[styles.thText, { width: '20%', paddingLeft: 4 }]}>Payee / Vendor</Text>
            <Text style={[styles.thText, { width: '14%', paddingLeft: 4 }]}>Method / Ref</Text>
            <Text style={[styles.thText, { width: '9%', textAlign: 'center' }]}>Sanction</Text>
            <Text style={[styles.thText, { width: '12%', textAlign: 'right', paddingRight: 6 }]}>Amount (INR)</Text>
          </View>

          {approvedExpenses.slice(0, 7).map((item, idx) => (
            <View key={item.id} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tdText, { width: '5%', textAlign: 'center' }]}>{idx + 1}</Text>
              <Text style={[styles.tdText, { width: '12%', paddingLeft: 4 }]}>{item.transaction_date}</Text>
              <View style={{ width: '28%', paddingLeft: 4 }}>
                <Text style={styles.tdTextBold}>{item.title}</Text>
                <Text style={{ fontSize: 5.2, color: '#64748B' }}>{item.category}</Text>
              </View>
              <Text style={[styles.tdText, { width: '20%', paddingLeft: 4 }]}>{item.paid_to_or_from || '-'}</Text>
              <View style={{ width: '14%', paddingLeft: 4 }}>
                <Text style={{ fontSize: 5.6, color: C.slateText }}>{item.payment_method || 'Bank Transfer'}</Text>
                {item.reference_number && (
                  <Text style={{ fontSize: 5.0, color: '#64748B' }}>{item.reference_number}</Text>
                )}
              </View>
              <View style={{ width: '9%', alignItems: 'center' }}>
                <Text style={{ fontSize: 5.4, color: C.emerald, fontWeight: 'bold' }}>APPROVED</Text>
                {item.requires_otp && (
                  <Text style={{ fontSize: 4.8, color: '#64748B' }}>OTP Verified</Text>
                )}
              </View>
              <Text style={[styles.tdTextBold, { width: '12%', textAlign: 'right', paddingRight: 6 }]}>
                ₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          ))}
        </View>

        {/* Amount in words peach box */}
        <View style={styles.wordsBox}>
          <Text style={styles.wordsText}>
            <Text style={{ fontWeight: 'bold', color: C.navyDark }}>Total Audited Expenditure (in words): </Text>
            {numberToWordsINR(totalApprovedExpense)}
          </Text>
        </View>

        {/* Statutory Compliance Note */}
        <View style={styles.complianceBox}>
          <Text style={styles.complianceTitle}>Statutory Accounting & Executive Internal Audit Declaration</Text>
          <Text style={styles.complianceText}>
            1. This document constitutes an official internal accounting statement generated under Sheshaan Global corporate financial governance policies.
            {'\n'}
            2. Two-Factor Security Gate: In strict compliance with financial control directives, all disbursements exceeding ₹2,000 have been validated via SMS One-Time Password (OTP) dispatched to registered device +91 81499 09546 prior to ledger logging.
            {'\n'}
            3. Final Sanction: All operational outflows reflect certified disbursements authorized by Chief Executive Officer Sana Zeba Bakshi.
          </Text>
        </View>

        {/* Dual Signature Block */}
        <View style={styles.signaturesGrid}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureRoleLabel}>PREPARED & VERIFIED BY</Text>
            <View style={styles.signatureSignLine}>
              <Text style={{ fontFamily: 'ArialCustom', fontWeight: 'bold', fontSize: 9.5, color: '#334155' }}>
                Nancy Sharma
              </Text>
            </View>
            <Text style={styles.signatureTextName}>Accounts & Finance Desk</Text>
            <Text style={styles.signatureTextCompany}>Sheshaan Global, Nagpur</Text>
          </View>

          <View style={styles.signatureBox}>
            <Text style={styles.signatureRoleLabel}>APPROVED & CERTIFIED BY (PROPRIETOR)</Text>
            <View style={styles.signatureSignLine}>
              <Image src={getAssetSrc('/signature.png')} style={styles.signatureImage} />
              <Image src={getAssetSrc('/stamp.png')} style={styles.stampImage} />
            </View>
            <Text style={styles.signatureTextName}>Sana Zeba Bakshi</Text>
            <Text style={styles.signatureTextCompany}>CEO & Proprietor | Sheshaan Global</Text>
          </View>
        </View>

        {/* Corporate Footer */}
        <View style={styles.footer}>
          <View style={styles.footerCol}>
            <Text style={styles.footerHeading}>Registered Office</Text>
            <Text style={styles.footerText}>Sheshaan Global, Plot No. 12, Export Zone</Text>
            <Text style={styles.footerText}>Nagpur, Maharashtra 440001, India</Text>
          </View>
          <View style={styles.footerCol}>
            <Text style={styles.footerHeading}>Corporate Finance & Banking</Text>
            <Text style={styles.footerText}>State Bank of India (Commercial Export Branch)</Text>
            <Text style={styles.footerText}>IFSC: SBIN0000432 | Swift: SBININBB</Text>
          </View>
          <View style={styles.footerCol}>
            <Text style={styles.footerHeading}>Audit & Verification</Text>
            <Text style={styles.footerText}>IEC: 0316987654 | GSTIN: 27AABCS1234F1Z8</Text>
            <Text style={styles.footerText}>APEDA / FSSAI Global Compliance</Text>
          </View>
          <View style={styles.footerCol}>
            <Text style={styles.footerHeading}>Digital Authentication</Text>
            <Text style={styles.footerText}>https://sheshaanglobal.com/portal</Text>
            <Text style={styles.footerText}>finance@sheshaanglobal.com</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

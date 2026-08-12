/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Client, InvoiceRecord, Quote } from '../lib/types';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#334155',
    backgroundColor: '#ffffff'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#0284c7',
    paddingBottom: 10,
    marginBottom: 14
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '58%'
  },
  logo: {
    width: 60,
    height: 50,
    objectFit: 'contain',
    marginRight: 10
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  tagline: {
    marginTop: 2,
    color: '#0284c7',
    fontSize: 6.8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  companyMeta: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 6.5,
    lineHeight: 1.3
  },
  docBox: {
    width: '38%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    alignItems: 'flex-end'
  },
  docTitle: {
    color: '#0f172a',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  docNo: {
    marginTop: 4,
    color: '#0284c7',
    fontSize: 13,
    fontWeight: 'bold'
  },
  docMeta: {
    marginTop: 3,
    color: '#475569',
    fontSize: 6.8,
    lineHeight: 1.25
  },
  cards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  card: {
    width: '49%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden'
  },
  cardTitle: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: 7.5,
    fontWeight: 'bold',
    paddingVertical: 4.5,
    paddingHorizontal: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  cardBody: {
    padding: 8,
    lineHeight: 1.35
  },
  partyName: {
    fontSize: 8.8,
    color: '#0f172a',
    fontWeight: 'bold',
    marginBottom: 4
  },
  muted: {
    color: '#475569',
    fontSize: 6.8,
    lineHeight: 1.3
  },
  sectionTitle: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#0f172a',
    backgroundColor: '#f1f5f9',
    borderLeftWidth: 3,
    borderLeftColor: '#0284c7',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  table: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
    backgroundColor: '#ffffff'
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a', // dark blue/slate theme matching quote PDF
    alignItems: 'center'
  },
  th: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: 'bold',
    paddingVertical: 5.5,
    paddingHorizontal: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  td: {
    paddingVertical: 5.5,
    paddingHorizontal: 8,
    fontSize: 7.2,
    color: '#334155',
    lineHeight: 1.3
  },
  summaryWrap: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12
  },
  summary: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    overflow: 'hidden'
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    fontSize: 7.2,
    color: '#334155'
  },
  summaryGrand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: '#0f172a'
  },
  grandText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  grandValue: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: 'bold'
  },
  note: {
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: '#f0f9ff',
    borderRadius: 6,
    padding: 8,
    color: '#475569',
    fontSize: 7.2,
    lineHeight: 1.35
  },
  footer: {
    position: 'absolute',
    bottom: 14,
    left: 30,
    right: 30,
    borderTopWidth: 0.5,
    borderTopColor: '#cbd5e1',
    paddingTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#94a3b8',
    fontSize: 6.2
  }
});

const formatMoney = (amount: number, currency: 'INR' | 'USD') => {
  const symbol = currency === 'INR' ? 'INR' : 'USD';
  return `${symbol} ${new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0)}`;
};

export const InvoicePDF = ({
  invoice,
  client,
  quote
}: {
  invoice: InvoiceRecord;
  client?: Client;
  quote?: Quote;
}) => {
  const currency = invoice.currency || 'INR';
  const amount = Number(invoice.amount || 0);
  const advance = Number(invoice.advance_amount || 0);
  const balance = Number(invoice.balance_amount || Math.max(amount - advance, 0));
  const issueDate = invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image src="/logo.png" style={styles.logo} />
            <View>
              <Text style={styles.companyName}>Sheshaan Global</Text>
              <Text style={styles.tagline}>Exporting Goodness Worldwide</Text>
              <Text style={styles.companyMeta}>Nagpur, Maharashtra, India{"\n"}IEC | GST | APEDA | FSSAI | Export Documentation</Text>
            </View>
          </View>
          <View style={styles.docBox}>
            <Text style={styles.docTitle}>{invoice.invoice_type} Invoice</Text>
            <Text style={styles.docNo}>{invoice.invoice_number}</Text>
            <Text style={styles.docMeta}>Issue Date: {issueDate}</Text>
            <Text style={styles.docMeta}>Due Date: {invoice.due_date || 'As agreed'}</Text>
          </View>
        </View>

        <View style={styles.cards} wrap={false}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bill From</Text>
            <View style={styles.cardBody}>
              <Text style={styles.partyName}>Sheshaan Global</Text>
              <Text style={styles.muted}>Plot No. 1459, Opp. M.A.K. Azad Urdu School, Aasinagar, Nagpur - 440017, Maharashtra, India</Text>
              <Text style={[styles.muted, { marginTop: 4 }]}>Email: info@sheshaanglobal.com</Text>
            </View>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bill To</Text>
            <View style={styles.cardBody}>
              <Text style={styles.partyName}>{client?.company_name || 'Unlinked Buyer'}</Text>
              <Text style={styles.muted}>{client?.address || client?.destination_port || 'Buyer address not set'}</Text>
              <Text style={[styles.muted, { marginTop: 4 }]}>Contact: {client?.contact_name || 'N/A'}</Text>
              <Text style={styles.muted}>Email: {client?.contact_email || 'N/A'}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Invoice Summary</Text>
        <View style={styles.table} wrap={false}>
          <View style={styles.headerRow}>
            <Text style={[styles.th, { width: '22%' }]}>Reference</Text>
            <Text style={[styles.th, { width: '32%' }]}>Description</Text>
            <Text style={[styles.th, { width: '16%', textAlign: 'center' }]}>Status</Text>
            <Text style={[styles.th, { width: '15%', textAlign: 'right' }]}>Advance</Text>
            <Text style={[styles.th, { width: '15%', textAlign: 'right' }]}>Balance</Text>
          </View>
          <View style={styles.row} wrap={false}>
            <Text style={[styles.td, { width: '22%', fontWeight: 'bold', color: '#0f172a' }]}>{quote?.quote_number || invoice.invoice_number}</Text>
            <Text style={[styles.td, { width: '32%' }]}>{invoice.notes || `${invoice.invoice_type} invoice raised for export order settlement.`}</Text>
            <Text style={[styles.td, { width: '16%', textAlign: 'center', fontWeight: 'bold' }]}>{invoice.payment_status}</Text>
            <Text style={[styles.td, { width: '15%', textAlign: 'right' }]}>{formatMoney(advance, currency)}</Text>
            <Text style={[styles.td, { width: '15%', textAlign: 'right', fontWeight: 'bold' }]}>{formatMoney(balance, currency)}</Text>
          </View>
        </View>

        <View style={styles.summaryWrap} wrap={false}>
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text>Invoice Amount</Text>
              <Text>{formatMoney(amount, currency)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Advance Received</Text>
              <Text>{formatMoney(advance, currency)}</Text>
            </View>
            <View style={styles.summaryGrand}>
              <Text style={styles.grandText}>Balance Payable</Text>
              <Text style={styles.grandValue}>{formatMoney(balance, currency)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Payment Instructions</Text>
        <View style={styles.note} wrap={false}>
          <Text>Payment should be made as per agreed commercial terms. Please mention invoice number {invoice.invoice_number} in the bank transfer reference. This document is generated from Sheshaan Global Admin Portal.</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Sheshaan Global | Maharashtra, India | info@sheshaanglobal.com</Text>
          <Text>Generated Invoice PDF</Text>
        </View>
      </Page>
    </Document>
  );
};

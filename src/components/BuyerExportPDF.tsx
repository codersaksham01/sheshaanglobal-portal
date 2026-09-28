import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

export type BuyerExportRecord = {
  company: string;
  contact: string;
  email: string;
  phone: string;
  country: string;
  product: string;
  source: string;
  stage: string;
  priority: string;
  action: string;
  nextFollowUp: string;
  bestSendTime: string;
  score: string | number;
  notes: string;
};

type BuyerExportPDFProps = {
  records: BuyerExportRecord[];
  title?: string;
  subtitle?: string;
  generatedBy?: string;
  filterSummary?: string;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingHorizontal: 28,
    paddingBottom: 32,
    fontFamily: 'Helvetica',
    fontSize: 7.4,
    color: '#172033',
    backgroundColor: '#f8fafc'
  },
  accentTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#07111f'
  },
  accentGold: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '30%',
    height: 8,
    backgroundColor: '#f59e0b'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1'
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  logo: {
    width: 42,
    height: 42,
    objectFit: 'contain',
    borderRadius: 7,
    backgroundColor: '#ffffff'
  },
  brandName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#07111f'
  },
  brandMeta: {
    marginTop: 2,
    fontSize: 6.5,
    color: '#64748b'
  },
  titleBlock: {
    textAlign: 'right',
    maxWidth: 230
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0284c7'
  },
  subtitle: {
    marginTop: 3,
    fontSize: 7,
    color: '#475569',
    lineHeight: 1.35
  },
  metrics: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 10
  },
  metric: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: '#dbe7f3',
    backgroundColor: '#ffffff',
    borderRadius: 6
  },
  metricLabel: {
    fontSize: 5.8,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: 'bold'
  },
  metricValue: {
    marginTop: 3,
    fontSize: 13,
    color: '#07111f',
    fontWeight: 'bold'
  },
  table: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#07111f',
    color: '#ffffff',
    minHeight: 22,
    alignItems: 'center'
  },
  row: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    minHeight: 28
  },
  altRow: {
    backgroundColor: '#f8fafc'
  },
  cell: {
    paddingHorizontal: 4,
    paddingVertical: 5,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    lineHeight: 1.25
  },
  th: {
    fontSize: 5.7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#ffffff'
  },
  strong: {
    fontWeight: 'bold',
    color: '#0f172a'
  },
  muted: {
    color: '#64748b'
  },
  chip: {
    marginTop: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    fontSize: 5.5,
    fontWeight: 'bold'
  },
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#dbe7f3',
    paddingTop: 6,
    fontSize: 5.8,
    color: '#64748b'
  },
  signatureBlock: {
    marginTop: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  signText: {
    fontSize: 7,
    color: '#334155',
    lineHeight: 1.35
  },
  signName: {
    marginTop: 4,
    fontSize: 9,
    color: '#07111f',
    fontWeight: 'bold'
  },
  signatureImages: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  stamp: {
    width: 58,
    height: 58,
    objectFit: 'contain'
  },
  signature: {
    width: 86,
    height: 38,
    objectFit: 'contain'
  }
});

const uniqueCount = (records: BuyerExportRecord[], key: keyof BuyerExportRecord) => (
  new Set(records.map((record) => String(record[key] || '').trim()).filter(Boolean)).size
);

export const BuyerExportPDF: React.FC<BuyerExportPDFProps> = ({
  records,
  title = 'Buyer Data Export',
  subtitle = 'Professional CRM buyer report generated from Sheshaan Global Smart Trade Portal.',
  generatedBy = 'Sana Zeba Bakshi',
  filterSummary = 'Current CRM view'
}) => {
  const now = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const pages = records.length ? records : [];
  const contacted = records.filter((record) => !['Need Reach Out', 'Needs Email Fix', 'Review'].includes(record.action)).length;

  return (
    <Document title={`Sheshaan Global - ${title}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.accentTop} fixed />
        <View style={styles.accentGold} fixed />

        <View style={styles.header} fixed>
          <View style={styles.brandBlock}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- React PDF Image does not support alt text props. */}
            <Image src="/logo.png" style={styles.logo} />
            <View>
              <Text style={styles.brandName}>Sheshaan Global</Text>
              <Text style={styles.brandMeta}>Smart Trade Portal - Buyer Intelligence Export</Text>
              <Text style={styles.brandMeta}>Generated: {now}</Text>
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <Text style={styles.subtitle}>Scope: {filterSummary}</Text>
          </View>
        </View>

        <View style={styles.metrics} fixed>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Total Buyers</Text>
            <Text style={styles.metricValue}>{records.length}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Countries</Text>
            <Text style={styles.metricValue}>{uniqueCount(records, 'country')}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Contacted / Active</Text>
            <Text style={styles.metricValue}>{contacted}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Follow-up Records</Text>
            <Text style={styles.metricValue}>{records.filter((record) => record.action.includes('Follow')).length}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.cell, styles.th, { width: '18%' }]}>Buyer</Text>
            <Text style={[styles.cell, styles.th, { width: '15%' }]}>Contact</Text>
            <Text style={[styles.cell, styles.th, { width: '13%' }]}>Country</Text>
            <Text style={[styles.cell, styles.th, { width: '17%' }]}>Product / Source</Text>
            <Text style={[styles.cell, styles.th, { width: '14%' }]}>CRM Status</Text>
            <Text style={[styles.cell, styles.th, { width: '13%' }]}>Next Action</Text>
            <Text style={[styles.cell, styles.th, { width: '10%', borderRightWidth: 0 }]}>Score</Text>
          </View>
          {pages.map((record, index) => (
            <View key={`${record.company}-${index}`} style={[styles.row, index % 2 === 1 ? styles.altRow : undefined]} wrap={false}>
              <View style={[styles.cell, { width: '18%' }]}>
                <Text style={styles.strong}>{record.company || 'Unnamed Buyer'}</Text>
                <Text style={styles.muted}>{record.email || 'Email missing'}</Text>
              </View>
              <View style={[styles.cell, { width: '15%' }]}>
                <Text>{record.contact || 'Procurement Team'}</Text>
                <Text style={styles.muted}>{record.phone || 'Phone missing'}</Text>
              </View>
              <View style={[styles.cell, { width: '13%' }]}>
                <Text style={styles.strong}>{record.country || 'Uncategorized'}</Text>
                <Text style={styles.muted}>{record.bestSendTime || 'Office-hour check needed'}</Text>
              </View>
              <View style={[styles.cell, { width: '17%' }]}>
                <Text>{record.product || 'General product range'}</Text>
                <Text style={styles.chip}>{record.source || 'CRM'}</Text>
              </View>
              <View style={[styles.cell, { width: '14%' }]}>
                <Text style={styles.strong}>{record.stage || 'New Lead'}</Text>
                <Text style={styles.muted}>{record.priority || 'Medium'} priority</Text>
              </View>
              <View style={[styles.cell, { width: '13%' }]}>
                <Text>{record.action || 'Review'}</Text>
                <Text style={styles.muted}>{record.nextFollowUp || 'No date set'}</Text>
              </View>
              <View style={[styles.cell, { width: '10%', borderRightWidth: 0 }]}>
                <Text style={styles.strong}>{record.score || '-'}</Text>
                <Text style={styles.muted}>Lead score</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.signatureBlock} wrap={false}>
          <View>
            <Text style={styles.signText}>Certified CRM buyer data export prepared for internal business development and export operations.</Text>
            <Text style={styles.signName}>{generatedBy || 'Sana Zeba Bakshi'}</Text>
            <Text style={styles.signText}>Founder / Authorized Signatory, Sheshaan Global</Text>
          </View>
          <View style={styles.signatureImages}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- React PDF Image does not support alt text props. */}
            <Image src="/sana-signature.png" style={styles.signature} />
            {/* eslint-disable-next-line jsx-a11y/alt-text -- React PDF Image does not support alt text props. */}
            <Image src="/stamp.png" style={styles.stamp} />
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>Sheshaan Global - Buyer Data Export</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

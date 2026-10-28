import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Svg, Path, Line, Circle, Rect, Polyline, Font } from '@react-pdf/renderer';
import { Quote, QuoteItem, BankDetails, CostBreakdownNotes, ShipperDetails } from '../lib/types';

// Register fonts for crisp vector typography
const isBrowser = typeof window !== 'undefined';
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
  // Graceful fallback to core PDF fonts
}

// Design System Palette (faithfully matching reference image)
const C = {
  navyDark: '#101B32',         // Primary deep navy
  navyMedium: '#173D5B',       // Header & card header navy
  navyHeaderBorder: '#275276', // Vertical border inside dark table headers
  slateText: '#2D3748',        // Main body text
  slateMuted: '#556987',       // Subtitles, secondary text
  slateLight: '#475569',       // Details labels
  bgSection: '#EEF2F6',        // Section header & note background
  borderGrey: '#D6DEE7',       // Table & card borders
  borderLight: '#E2E8F0',      // Dividers
  bgWords: '#FFF5EA',          // Soft peach/cream words box background
  borderWords: '#F6D7B8',      // Words box border
  bgTotalRow: '#EAF2F8',       // Grand total light blue tint
  white: '#FFFFFF',
  goldLine: '#CBB499',         // Header vertical line
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
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '61%',
  },
  logo: {
    width: 60,
    height: 50,
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
    marginTop: 4,
  },
  headerDivider: {
    width: 0.75,
    height: 52,
    backgroundColor: C.goldLine,
    marginHorizontal: 10,
  },
  headerRight: {
    flexDirection: 'column',
    width: '35%',
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  quoteTitle: {
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
    fontSize: 13.5,
    color: C.navyDark,
    marginBottom: 4,
  },
  metaTable: {
    flexDirection: 'column',
    width: '100%',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1.5,
  },
  metaLabel: {
    fontFamily: 'ArialCustom',
    fontSize: 6.8,
    color: '#334155',
    width: 38,
  },
  metaColon: {
    fontFamily: 'ArialCustom',
    fontSize: 6.8,
    color: '#334155',
    width: 10,
    textAlign: 'center',
  },
  metaVal: {
    fontFamily: 'ArialCustom',
    fontSize: 6.8,
    color: C.navyDark,
  },

  // Section Banner Bar
  sectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bgSection,
    height: 18,
    marginBottom: 6,
    overflow: 'hidden',
  },
  sectionBadge: {
    width: 26,
    height: '100%',
    backgroundColor: C.navyMedium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionBadgeText: {
    fontFamily: 'TimesCustom',
    fontWeight: 'bold',
    fontSize: 9.5,
    color: C.white,
  },
  sectionTitleText: {
    fontFamily: 'TimesCustom',
    fontWeight: 'bold',
    fontSize: 8.5,
    color: C.navyDark,
    paddingLeft: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // Party details
  partyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  partyCard: {
    width: '49%',
    borderWidth: 0.75,
    borderColor: C.borderGrey,
    borderRadius: 2,
    backgroundColor: C.white,
    overflow: 'hidden',
  },
  partyHeaderBar: {
    backgroundColor: C.navyMedium,
    paddingVertical: 3.5,
    paddingHorizontal: 8,
  },
  partyHeaderTitle: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 6.8,
    color: C.white,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  partyBody: {
    padding: 7,
  },
  partyName: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 8.8,
    color: C.navyDark,
    marginBottom: 3,
  },
  partyAddress: {
    fontFamily: 'ArialCustom',
    fontSize: 6.5,
    color: '#475569',
    lineHeight: 1.3,
    marginBottom: 6,
  },
  partyDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEF2F6',
    marginBottom: 5,
  },
  kvRow: {
    flexDirection: 'row',
    marginBottom: 2.5,
    alignItems: 'flex-start',
  },
  kvLabel: {
    fontFamily: 'ArialCustom',
    fontSize: 6.2,
    color: '#64748B',
    width: 40,
  },
  kvColon: {
    fontFamily: 'ArialCustom',
    fontSize: 6.2,
    color: '#64748B',
    width: 8,
    textAlign: 'center',
  },
  kvValue: {
    fontFamily: 'ArialCustom',
    fontSize: 6.2,
    color: C.navyDark,
    flex: 1,
  },

  // Shipment Horizontal Grid
  shipmentBar: {
    flexDirection: 'row',
    borderWidth: 0.75,
    borderColor: C.borderGrey,
    borderRadius: 2,
    backgroundColor: C.white,
    marginBottom: 8,
    alignItems: 'stretch',
  },
  shipmentCol: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4.5,
    paddingHorizontal: 5,
    borderRightWidth: 0.75,
    borderRightColor: C.borderGrey,
  },
  shipmentColLast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4.5,
    paddingHorizontal: 5,
  },
  shipmentIconBox: {
    width: 17,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shipmentContent: {
    flex: 1,
    flexDirection: 'column',
  },
  shipmentLabel: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 5.2,
    color: '#556987',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  shipmentVal: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 6.5,
    color: C.navyDark,
    lineHeight: 1.15,
  },

  // Table Common
  table: {
    borderWidth: 0.75,
    borderColor: C.borderGrey,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  tHeaderRow: {
    flexDirection: 'row',
    backgroundColor: C.navyMedium,
    alignItems: 'center',
    paddingVertical: 4.5,
  },
  tHeaderCol: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 5.8,
    color: C.white,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    paddingHorizontal: 3,
  },
  tHeaderColBorder: {
    borderRightWidth: 0.75,
    borderRightColor: C.navyHeaderBorder,
  },
  tRow: {
    flexDirection: 'row',
    borderTopWidth: 0.75,
    borderTopColor: C.borderGrey,
    backgroundColor: C.white,
    alignItems: 'center',
    paddingVertical: 4.5,
  },
  tCell: {
    fontFamily: 'ArialCustom',
    fontSize: 6.5,
    color: C.slateText,
    paddingHorizontal: 3,
  },
  tCellBorder: {
    borderRightWidth: 0.75,
    borderRightColor: C.borderGrey,
  },
  tCellBold: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 6.8,
    color: C.navyDark,
  },

  // Section 2 Table Columns
  colS2Sr: { width: '4%', textAlign: 'center' },
  colS2Desc: { width: '33%', paddingLeft: 4 },
  colS2Hs: { width: '9%', textAlign: 'center' },
  colS2Pack: { width: '16%', textAlign: 'center' },
  colS2Qty: { width: '13%', textAlign: 'center' },
  colS2Price: { width: '11%', textAlign: 'center' },
  colS2Total: { width: '14%', textAlign: 'right', paddingRight: 6 },

  // Section 2 Packing List Specific Table Columns
  colPlSr: { width: '4%', textAlign: 'center' },
  colPlMarks: { width: '12%', paddingLeft: 3 },
  colPlDesc: { width: '27%', paddingLeft: 4 },
  colPlHs: { width: '9%', textAlign: 'center' },
  colPlPack: { width: '15%', textAlign: 'center' },
  colPlNetUnit: { width: '10%', textAlign: 'center' },
  colPlNetTotal: { width: '11%', textAlign: 'right', paddingRight: 4 },
  colPlGrossTotal: { width: '12%', textAlign: 'right', paddingRight: 4 },

  // Grand Total Row
  grandTotalRow: {
    flexDirection: 'row',
    borderTopWidth: 0.75,
    borderTopColor: C.borderGrey,
    backgroundColor: C.bgTotalRow,
    alignItems: 'center',
    paddingVertical: 4.5,
  },
  grandTotalLeftCell: {
    width: '86%',
    paddingLeft: 10,
    borderRightWidth: 0.75,
    borderRightColor: C.borderGrey,
  },
  grandTotalLabel: {
    fontFamily: 'TimesCustom',
    fontWeight: 'bold',
    fontSize: 8,
    color: C.navyDark,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  grandTotalRightCell: {
    width: '14%',
    paddingRight: 6,
    textAlign: 'right',
  },
  grandTotalVal: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 8.5,
    color: C.navyDark,
    textAlign: 'right',
  },

  // Words Box
  wordsBox: {
    borderWidth: 0.75,
    borderColor: C.borderWords,
    backgroundColor: C.bgWords,
    borderRadius: 2,
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    marginBottom: 7,
  },
  wordsText: {
    fontFamily: 'ArialCustom',
    fontSize: 6.3,
    color: '#334155',
  },

  // Section 3 Table Columns
  colS3Sr: { width: '4%', textAlign: 'center' },
  colS3Desc: { width: '40%', paddingLeft: 4 },
  colS3Basis: { width: '23%', textAlign: 'left', paddingLeft: 6 },
  colS3Rate: { width: '15%', textAlign: 'left', paddingLeft: 6 },
  colS3Total: { width: '18%', textAlign: 'right', paddingRight: 6 },

  // Section 3 Dark Highlighted Total Bar
  offeredTotalBar: {
    flexDirection: 'row',
    backgroundColor: C.navyMedium,
    alignItems: 'center',
    paddingVertical: 4.5,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  offeredTotalLeft: {
    fontFamily: 'TimesCustom',
    fontWeight: 'bold',
    fontSize: 8,
    color: C.white,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  offeredTotalRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offeredTotalDivider: {
    color: '#8BA9C4',
    fontSize: 9,
    marginRight: 10,
  },
  offeredTotalVal: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 9,
    color: C.white,
    textAlign: 'right',
  },

  // Note Box
  noteBox: {
    flexDirection: 'row',
    borderWidth: 0.75,
    borderColor: C.borderGrey,
    borderRadius: 2,
    backgroundColor: C.bgSection,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  noteLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  noteIconBox: {
    marginRight: 4,
  },
  noteTitle: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 7.2,
    color: C.navyDark,
    letterSpacing: 0.5,
  },
  noteDivider: {
    width: 0.75,
    height: 24,
    backgroundColor: '#CBD5E1',
    marginRight: 8,
  },
  noteRightTextGroup: {
    flex: 1,
    flexDirection: 'column',
  },
  noteTextLine: {
    fontFamily: 'ArialCustom',
    fontSize: 5.8,
    color: '#334155',
    lineHeight: 1.3,
  },

  // Footer
  footer: {
    borderTopWidth: 0.75,
    borderTopColor: C.borderGrey,
    paddingTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  footerCol1: {
    width: '25%',
    flexDirection: 'column',
  },
  footerBrand: {
    fontFamily: 'TimesCustom',
    fontWeight: 'bold',
    fontSize: 7.5,
    color: C.navyDark,
  },
  footerTagline: {
    fontFamily: 'ArialCustom',
    fontSize: 4.8,
    color: C.slateMuted,
    letterSpacing: 0.6,
    marginTop: 1,
    textTransform: 'uppercase',
  },
  footerDivider: {
    width: 0.75,
    height: 18,
    backgroundColor: C.borderGrey,
    marginHorizontal: 3,
  },
  footerCol2: {
    width: '29%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerCol3: {
    width: '24%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerCol4: {
    width: '18%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  footerCircleIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.navyDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  footerText: {
    fontFamily: 'ArialCustom',
    fontSize: 5.2,
    color: '#475569',
    lineHeight: 1.25,
  },
  footerPhone: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 6.5,
    color: C.navyDark,
  },

  // Page 2 Styles
  page2Header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.75,
    borderBottomColor: C.borderGrey,
    paddingBottom: 6,
    marginBottom: 10,
  },
  page2HeaderText: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 7.5,
    color: C.navyDark,
  },
  page2HeaderDate: {
    fontFamily: 'ArialCustom',
    fontSize: 7,
    color: '#64748B',
  },
  p2TwoColRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  p2Box: {
    width: '49%',
    borderWidth: 0.75,
    borderColor: C.borderGrey,
    borderRadius: 2,
    backgroundColor: C.white,
    overflow: 'hidden',
  },
  p2BoxHeader: {
    backgroundColor: C.navyMedium,
    paddingVertical: 3.5,
    paddingHorizontal: 8,
  },
  p2BoxHeaderTitle: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 6.5,
    color: C.white,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  p2BoxBody: {
    padding: 6,
  },
  p2BulletRow: {
    flexDirection: 'row',
    marginBottom: 3,
    alignItems: 'flex-start',
  },
  p2BulletDot: {
    width: 8,
    fontSize: 6,
    color: C.navyMedium,
  },
  p2BulletText: {
    flex: 1,
    fontFamily: 'ArialCustom',
    fontSize: 5.8,
    color: C.slateText,
    lineHeight: 1.3,
  },
  p2SpecRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEF2F6',
    paddingVertical: 2.5,
  },
  p2SpecLabel: {
    fontFamily: 'ArialCustom',
    fontSize: 5.8,
    color: '#64748B',
  },
  p2SpecValue: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 5.8,
    color: C.navyDark,
  },
  p2TermsContainer: {
    borderWidth: 0.75,
    borderColor: C.borderGrey,
    borderRadius: 2,
    backgroundColor: C.bgSection,
    padding: 6,
    marginBottom: 8,
  },
  p2TermRow: {
    flexDirection: 'row',
    marginBottom: 3,
    alignItems: 'flex-start',
  },
  p2TermNum: {
    width: 12,
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 5.6,
    color: C.navyMedium,
  },
  p2TermText: {
    flex: 1,
    fontFamily: 'ArialCustom',
    fontSize: 5.6,
    color: '#334155',
    lineHeight: 1.25,
  },

  // Signatures
  signaturesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 10,
  },
  signatureBox: {
    width: '49%',
    borderWidth: 0.75,
    borderColor: C.borderGrey,
    borderRadius: 2,
    padding: 8,
    alignItems: 'center',
    backgroundColor: C.white,
  },
  signatureRoleLabel: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 6.5,
    color: C.navyDark,
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  signatureSignLine: {
    width: '92%',
    height: 38,
    borderBottomWidth: 0.75,
    borderBottomColor: '#CBD5E1',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 3,
    gap: 8,
  },
  signatureImage: {
    width: 76,
    height: 34,
    objectFit: 'contain',
  },
  stampImage: {
    width: 68,
    height: 30,
    objectFit: 'contain',
    opacity: 0.95,
  },
  signatureTextName: {
    fontFamily: 'ArialCustom',
    fontWeight: 'bold',
    fontSize: 6.8,
    color: C.navyDark,
    marginTop: 2,
  },
  signatureTextCompany: {
    fontFamily: 'ArialCustom',
    fontSize: 5.8,
    color: '#64748B',
  },
});

// Precise Vector SVG Icons
const BoxIcon = () => (
  <Svg width="15" height="15" viewBox="0 0 24 24">
    <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke={C.navyMedium} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3.27 6.96L12 12.01l8.73-5.05" stroke={C.navyMedium} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="22.08" x2="12" y2="12" stroke={C.navyMedium} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const GlobeIcon = () => (
  <Svg width="15" height="15" viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="10" stroke={C.navyMedium} strokeWidth="1.7" fill="none" />
    <Line x1="2" y1="12" x2="22" y2="12" stroke={C.navyMedium} strokeWidth="1.7" />
    <Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke={C.navyMedium} strokeWidth="1.7" fill="none" />
  </Svg>
);

const AnchorIcon = () => (
  <Svg width="15" height="15" viewBox="0 0 24 24">
    <Circle cx="12" cy="5" r="3" stroke={C.navyMedium} strokeWidth="1.7" fill="none" />
    <Line x1="12" y1="22" x2="12" y2="8" stroke={C.navyMedium} strokeWidth="1.7" strokeLinecap="round" />
    <Path d="M5 12H2a10 10 0 0 0 20 0h-3" stroke={C.navyMedium} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const MapPinIcon = () => (
  <Svg width="15" height="15" viewBox="0 0 24 24">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke={C.navyMedium} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="10" r="3" stroke={C.navyMedium} strokeWidth="1.7" fill="none" />
  </Svg>
);

const ContainerIcon = () => (
  <Svg width="16" height="15" viewBox="0 0 24 24">
    <Rect x="2" y="5" width="20" height="14" rx="1.5" stroke={C.navyMedium} strokeWidth="1.7" fill="none" />
    <Line x1="6" y1="5" x2="6" y2="19" stroke={C.navyMedium} strokeWidth="1.3" />
    <Line x1="9" y1="5" x2="9" y2="19" stroke={C.navyMedium} strokeWidth="1.3" />
    <Line x1="12" y1="5" x2="12" y2="19" stroke={C.navyMedium} strokeWidth="1.3" />
    <Line x1="15" y1="5" x2="15" y2="19" stroke={C.navyMedium} strokeWidth="1.3" />
    <Line x1="18" y1="5" x2="18" y2="19" stroke={C.navyMedium} strokeWidth="1.3" />
  </Svg>
);

const DocIcon = () => (
  <Svg width="15" height="15" viewBox="0 0 24 24">
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={C.navyMedium} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="14 2 14 8 20 8" stroke={C.navyMedium} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="16" y1="13" x2="8" y2="13" stroke={C.navyMedium} strokeWidth="1.7" strokeLinecap="round" />
    <Line x1="16" y1="17" x2="8" y2="17" stroke={C.navyMedium} strokeWidth="1.7" strokeLinecap="round" />
    <Line x1="10" y1="9" x2="8" y2="9" stroke={C.navyMedium} strokeWidth="1.7" strokeLinecap="round" />
  </Svg>
);

const FooterPinBadge = () => (
  <Svg width="8" height="8" viewBox="0 0 24 24">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="#FFFFFF" />
    <Circle cx="12" cy="10" r="3" fill={C.navyDark} />
  </Svg>
);

const FooterMailBadge = () => (
  <Svg width="8" height="8" viewBox="0 0 24 24">
    <Rect x="2" y="4" width="20" height="16" rx="2" stroke="#FFFFFF" strokeWidth="2" fill="none" />
    <Path d="M22 6l-10 7L2 6" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const FooterPhoneBadge = () => (
  <Svg width="8" height="8" viewBox="0 0 24 24">
    <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" fill="#FFFFFF" />
  </Svg>
);

// Calculation Helpers
const getItemPricingBasis = (item: QuoteItem) => item.pricing_basis || 'kg';
const getItemPackageQuantity = (item: QuoteItem) => Number(item.package_quantity || 0);
const getItemPackageWeight = (item: QuoteItem) => Number(item.weight || 0);
const getItemSellTotal = (item: QuoteItem) => {
  if (getItemPricingBasis(item) === 'package') {
    return getItemPackageQuantity(item) * Number(item.package_unit_price || 0);
  }
  return Number(item.quantity || 0) * Number(item.unit_price || 0);
};
const getItemNetWeight = (item: QuoteItem) => {
  if (getItemPricingBasis(item) === 'package') {
    const packageQuantity = getItemPackageQuantity(item);
    const packageWeight = getItemPackageWeight(item);
    return packageQuantity > 0 && packageWeight > 0 ? packageQuantity * packageWeight : Number(item.quantity || 0);
  }
  return Number(item.quantity || 0);
};

export interface PackingLineComputation {
  item: QuoteItem;
  sr: number;
  marks: string;
  description: string;
  grade?: string;
  specBullets: string[];
  hsCode: string;
  packagingType: string;
  packageCount: number;
  netWeightPerPackage: number | null;
  isUniformWeight: boolean;
  totalNetWeight: number;
  totalGrossWeight: number;
  tareWeightPerPackage: number;
  cbm?: number;
}

export function computePackingListLines(
  items: QuoteItem[],
  defaultMarks = 'SG / EXPORT'
) {
  let totalPackages = 0;
  let totalNetWeight = 0;
  let totalGrossWeight = 0;
  let totalCbm = 0;

  const lines: PackingLineComputation[] = items.map((item, index) => {
    const descLines = (item.description || '').split('\n').map(s => s.trim()).filter(Boolean);
    const mainTitle = descLines[0] || item.sku || 'Export Commodity';
    const specBullets = descLines.slice(1);
    const grade = item.product_grade || undefined;

    // Actual verified or entered net weight
    let itemNetWeight: number;
    if (item.net_weight !== undefined && Number(item.net_weight) > 0) {
      itemNetWeight = Number(item.net_weight);
    } else {
      itemNetWeight = getItemNetWeight(item);
    }

    // Actual package count
    let packageCount = Number(item.package_quantity || 0);
    const nominalPkgWeight = Number(item.weight || 0);
    if (packageCount <= 0 && nominalPkgWeight > 0 && itemNetWeight > 0) {
      packageCount = Math.ceil(itemNetWeight / nominalPkgWeight);
    }

    // Weight calculation & uniformity validation
    // Requirements:
    // If all packages have identical weights, calculate total from actual package count & weight.
    // If individual package weights vary, support actual total net weight (e.g. 26000 kg with 434 bags of nominal 60 kg).
    // Never assume 434 x 60 kg = 26000 kg when 434 x 60 = 26040 kg.
    let isUniformWeight = false;
    let netWeightPerPackage: number | null = null;
    if (packageCount > 0 && nominalPkgWeight > 0) {
      const nominalProduct = packageCount * nominalPkgWeight;
      if (Math.abs(nominalProduct - itemNetWeight) < 0.01) {
        isUniformWeight = true;
        netWeightPerPackage = nominalPkgWeight;
      } else {
        isUniformWeight = false;
        netWeightPerPackage = nominalPkgWeight;
      }
    } else if (packageCount > 0 && itemNetWeight > 0) {
      netWeightPerPackage = Number((itemNetWeight / packageCount).toFixed(2));
      isUniformWeight = true;
    }

    // Packaging Type (e.g. jute bags, PP bags, cartons, drums)
    const packagingType = (item.packaging_type?.trim()
      || item.packing_container?.trim()
      || 'Standard Export Bags');

    // Gross weight (must include packaging and never assumed to equal net weight)
    let itemGrossWeight: number;
    let tarePerPkg = Number(item.tare_weight || 0);

    if (item.gross_weight !== undefined && Number(item.gross_weight) > 0) {
      itemGrossWeight = Number(item.gross_weight);
      if (tarePerPkg <= 0 && packageCount > 0 && itemGrossWeight > itemNetWeight) {
        tarePerPkg = (itemGrossWeight - itemNetWeight) / packageCount;
      }
    } else if (tarePerPkg > 0 && packageCount > 0) {
      itemGrossWeight = itemNetWeight + (packageCount * tarePerPkg);
    } else {
      const lowerPack = packagingType.toLowerCase();
      let defaultTare = 0.5;
      if (lowerPack.includes('jute')) defaultTare = 0.6;
      else if (lowerPack.includes('pp') || lowerPack.includes('poly')) defaultTare = 0.15;
      else if (lowerPack.includes('carton') || lowerPack.includes('box')) defaultTare = 0.6;
      else if (lowerPack.includes('drum')) defaultTare = 2.5;
      else if (nominalPkgWeight > 0) defaultTare = Math.max(0.12, nominalPkgWeight * 0.015);

      tarePerPkg = defaultTare;
      const totalTare = packageCount > 0 ? (packageCount * tarePerPkg) : (itemNetWeight * 0.015);
      itemGrossWeight = itemNetWeight + totalTare;
    }

    const marks = item.marks_numbers?.trim() || defaultMarks;
    const lineCbm = Number(item.cbm || 0);

    totalPackages += packageCount;
    totalNetWeight += itemNetWeight;
    totalGrossWeight += itemGrossWeight;
    totalCbm += lineCbm;

    return {
      item,
      sr: index + 1,
      marks,
      description: mainTitle,
      grade,
      specBullets,
      hsCode: item.hs_code || '-',
      packagingType,
      packageCount,
      netWeightPerPackage,
      isUniformWeight,
      totalNetWeight: itemNetWeight,
      totalGrossWeight: itemGrossWeight,
      tareWeightPerPackage: tarePerPkg,
      cbm: lineCbm > 0 ? lineCbm : undefined
    };
  });

  return {
    lines,
    totalPackages,
    totalNetWeight,
    totalGrossWeight,
    totalCbm
  };
};

const isAirFreightMode = (mode?: string) => (mode || '').toLowerCase().includes('air');
const getFreightPdfLabels = (mode?: string) => {
  const isAir = isAirFreightMode(mode);
  return {
    isAir,
    freightTitle: isAir ? 'Main Air Freight' : 'Main Ocean Freight',
    freightDetail: isAir ? 'air freight' : 'ocean freight',
    freightBasis: isAir ? 'Air Freight' : 'Ocean Freight',
    freightAdjustmentTerm: isAir ? 'Air Freight Adjustments' : 'Ocean Freight Adjustments',
    freightRateTerm: isAir ? 'Air freight rates' : 'Ocean freight rates',
    bookingTerm: isAir ? 'airline booking confirmation' : 'vessel booking confirmation',
    insuranceTitle: isAir ? 'Cargo Transit Insurance' : 'Marine Cargo Transit Insurance',
    insuranceDetail: isAir
      ? 'Comprehensive cargo transit insurance policy up to destination airport or delivery point.'
      : 'Comprehensive marine transit cargo insurance policy up to destination port.',
    includedFreightPrefix: isAir ? 'Main air freight' : 'Main ocean freight'
  };
};

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
  const safeNum = Number(num);
  if (!safeNum || isNaN(safeNum) || safeNum <= 0) {
    return currency === 'INR' ? 'Indian Rupees Zero Only.' : 'U.S. Dollars Zero Only.';
  }
  
  const integerPart = Math.floor(safeNum);
  const decimalPart = Math.round((safeNum - integerPart) * 100);
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
    if (decimalPart > 0) {
      return `Indian Rupees ${result || 'Zero'} and ${convertLessThanThousand(decimalPart)} Paise Only.`;
    }
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
    if (decimalPart > 0) {
      return `U.S. Dollars ${result || 'Zero'} and ${convertLessThanThousand(decimalPart)} Cents Only.`;
    }
    return `U.S. Dollars ${result} Only.`;
  }
}

// Logo resolution helper (works in Node and Browser)
const getLogoSrc = () => {
  if (typeof window !== 'undefined') {
    return '/logo-opt.png';
  }
  try {
    const fs = require('fs');
    const path = require('path');
    const fullPath = path.resolve(process.cwd(), 'public', 'logo-opt.png');
    if (fs.existsSync(fullPath)) {
      const b64 = fs.readFileSync(fullPath).toString('base64');
      return `data:image/png;base64,${b64}`;
    }
  } catch {
    // fallback
  }
  return '/logo-opt.png';
};

const getSignatureSrc = () => {
  if (typeof window !== 'undefined') {
    return '/signature.png';
  }
  try {
    const fs = require('fs');
    const path = require('path');
    const fullPath = path.resolve(process.cwd(), 'public', 'signature.png');
    if (fs.existsSync(fullPath)) {
      const b64 = fs.readFileSync(fullPath).toString('base64');
      return `data:image/png;base64,${b64}`;
    }
  } catch {
    // fallback
  }
  return '/signature.png';
};

const getStampSrc = () => {
  if (typeof window !== 'undefined') {
    return '/stamp.png';
  }
  try {
    const fs = require('fs');
    const path = require('path');
    const fullPath = path.resolve(process.cwd(), 'public', 'stamp.png');
    if (fs.existsSync(fullPath)) {
      const b64 = fs.readFileSync(fullPath).toString('base64');
      return `data:image/png;base64,${b64}`;
    }
  } catch {
    // fallback
  }
  return '/stamp.png';
};

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

  const currencySymbol = quote.currency === 'USD' ? 'USD' : 'INR';

  // Format with currency symbol and 2 decimals (for cost breakdown)
  const formatValue = (amount: number) => {
    const validAmount = Number(amount) || 0;
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${currencySymbol} ${formatter.format(validAmount)}`;
  };

  // Format for section 2 product totals (integers without .00, matching reference)
  const formatSection2Amount = (amount: number) => {
    const validAmount = Number(amount) || 0;
    const hasDecimals = validAmount % 1 !== 0;
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    });
    return `${currencySymbol} ${formatter.format(validAmount)}`;
  };

  const formatDate = (dateStr?: string) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const toFormatted = (date: Date) => {
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    };
    if (!dateStr || dateStr === 'preview') return toFormatted(new Date());
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? toFormatted(new Date()) : toFormatted(d);
  };

  const lineItems = quote.items || [];
  const showCifBreakdown = quote.show_cif_breakdown !== false;
  const showDetailsPage = quote.show_details_page === true;
  const showSignatureBlock = quote.show_signature_block !== false;
  const showCeoSignature = quote.show_ceo_signature !== false;
  const showOriginCharges = quote.show_origin_charges !== false;
  const showOceanFreight = quote.show_ocean_freight !== false;
  const showInsuranceCharge = quote.show_insurance_charge !== false;

  // Subtotal for Section 2
  const itemsSubtotal = lineItems.reduce((sum, item) => sum + getItemSellTotal(item), 0);

  // Origin export charges
  const originExportCharges = Number(quote.packaging_cost || 0) + Number(quote.inland_haulage_cost || 0) + Number(quote.customs_clearance_cost || 0);
  
  // Total FOB (items + origin charges if applicable)
  const totalFOB = itemsSubtotal + (showOriginCharges ? originExportCharges : 0);
  
  // Final Total including freight and insurance
  const freightAmount = showOceanFreight ? Number(quote.freight_cost || 0) : 0;
  const insuranceAmount = showInsuranceCharge ? Number(quote.insurance_cost || 0) : 0;
  const finalOfferedTotal = totalFOB + freightAmount + insuranceAmount;

  // Total quantity
  const totalQty = lineItems.reduce((sum, item) => sum + getItemNetWeight(item), 0);
  const totalWeight = totalQty;

  const defaultShipper: ShipperDetails = {
    company_name: 'Sheshaan Global',
    address: 'Plot No. 1459, Opp. M.A.K. Azad Urdu School,\nAasingar, Nagpur - 440017, Maharashtra, India',
    contact_name: 'Sana Zeba Bakshi (CEO)',
    contact_email: 'info@sheshaanglobal.com',
    tax_id: 'GST: 27AAAAA1111A1Z1 | IEC: 0312098433 | PAN: AAECS1234F',
    iec_number: '0312098433',
    gstin: '27AAAAA1111A1Z1',
    phone: '+91 81499 09546'
  };

  const defaultBankDetails: BankDetails = {
    beneficiary_bank: 'State Bank of India (SBI)',
    branch_location: 'Nagpur Main Branch, Civil Lines, Nagpur, India',
    account_holder_name: 'Sheshaan Global Export Account',
    account_number: '334455667788',
    ifsc_code: 'SBIN0000432',
    swift_code: 'SBININBBXXX'
  };

  const shipper = { ...defaultShipper, ...(quote.shipper_details || {}) };
  const bankDetails = quote.bank_details || defaultBankDetails;
  const client = quote.client || {
    id: 'client-temp',
    company_name: '',
    address: '',
    contact_name: '',
    contact_email: '',
    destination_port: ''
  };

  const clientAddress = client.address && client.address !== 'N/A'
    ? client.address
    : '-';

  const clientContact = client.contact_name && client.contact_name !== 'N/A'
    ? `${client.contact_name} ${client.phone ? `| ${client.phone}` : ''}`
    : '-';

  const clientEmail = client.contact_email || '-';
  const destinationPort = (quote.destination_port || client.destination_port || '').trim();
  const incotermRaw = (quote.incoterm || '').trim();
  const incotermCode = incotermRaw.split(/[ (]/)[0].trim().toUpperCase() || 'FOB';
  const freightLabels = getFreightPdfLabels(quote.shipment_mode);

  // Packing List specific computations & verified values
  const plComputation = computePackingListLines(lineItems, quote.marks_numbers || 'SG / EXPORT');
  const totalCbm = Number(quote.total_cbm || plComputation.totalCbm || 0);

  const packingListNumber = quote.packing_list_number
    ? (quote.packing_list_number.startsWith('PL-') ? quote.packing_list_number : `PL-${quote.packing_list_number}`)
    : (quote.quote_number ? `PL-${quote.quote_number.replace(/^Q-/, '')}` : 'PL-SG-2026-1236');

  const packingListDate = quote.packing_list_date || quote.created_at;

  const vesselName = quote.vessel_name || quote.shipment?.vessel_name;
  const containerNumber = quote.container_number || quote.shipment?.container_number;
  const sealNumber = quote.seal_number || quote.shipment?.seal_number;
  const blNumber = quote.bl_number || quote.shipment?.bl_number;
  const hasTransportDetails = Boolean(vesselName || containerNumber || sealNumber || blNumber);

  const finalDestination = quote.final_destination || destinationPort || '-';
  const placeOfIssue = quote.place_of_issue || 'Nagpur, Maharashtra, India';
  const signatoryName = quote.signatory_name || shipper.contact_name || 'Sana Zeba Bakshi';
  const signatoryDesignation = quote.signatory_designation || shipper.signatory_title || 'Proprietor & CEO';

  const shipperIec = shipper.iec_number
    || (quote as any).iec_number
    || (shipper.tax_id && shipper.tax_id.match(/IEC:?\s*([A-Z0-9]+)/i)?.[1])
    || '';
  const shipperGstin = shipper.gstin
    || (quote as any).gstin
    || (shipper.tax_id && shipper.tax_id.match(/GST(?:IN)?:?\s*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i)?.[1])
    || '';
  const shipperPhone = shipper.phone || '+91 81499 09546';

  const clientCountry = (client as unknown as Record<string, unknown>).country as string
    || (quote as any).destination_country
    || (destinationPort ? destinationPort.split(',').pop()?.trim() : '')
    || '';

  const costNotes: CostBreakdownNotes = quote.cost_breakdown_notes || {};

  // Build Cost Breakdown Rows matching reference structure
  const costBreakdownRows = [
    {
      visible: true,
      title: 'Offered Goods Value',
      detail: costNotes.offered_goods || 'Commercial offer value from Section 2, inclusive of quoted selling margin.',
      basis: 'As per Section 2',
      rate: 'Offered Rate',
      amount: itemsSubtotal
    },
    {
      visible: showOriginCharges && originExportCharges > 0,
      title: 'Local Transport, Export & Handling Charges',
      detail: costNotes.origin_charges || 'Export packing, inland haulage, THC, loading, and customs clearance as applicable.',
      basis: 'Origin Services',
      rate: 'Overall Order',
      amount: originExportCharges
    },
    {
      visible: showOceanFreight && Number(quote.freight_cost || 0) > 0,
      title: freightLabels.freightTitle,
      detail: costNotes.ocean_freight || `Lump-sum ${freightLabels.freightDetail} from ${(quote.loading_port || 'Loading Port').split(',')[0].trim()} to ${(destinationPort).split(',')[0].trim()}.`,
      basis: `Lump Sum (${quote.shipment_mode || 'Sea Freight 1x20ft FCL'})`,
      rate: 'Overall Order',
      amount: Number(quote.freight_cost)
    },
    {
      visible: showInsuranceCharge && Number(quote.insurance_cost || 0) > 0,
      title: freightLabels.insuranceTitle,
      detail: costNotes.insurance || freightLabels.insuranceDetail,
      basis: 'Lump Sum (Policy)',
      rate: 'Overall Order',
      amount: Number(quote.insurance_cost)
    }
  ].filter(r => r.visible);

  // Pre-filled fallback terms for Page 2
  const includedScope = quote.included_responsibilities || [
    'Complete raw product cost & export packing in 50 kg PP Bags',
    'Inland haulage and transportation from factory to loading port',
    'Terminal Handling Charges (THC) & container stuffing at origin port',
    'Export customs clearance, shipping bill, COO, and Phytosanitary Certificate',
    `${freightLabels.includedFreightPrefix} from ${(quote.loading_port || 'Nhava Sheva').split(',')[0].trim()} to ${destinationPort} (${formatValue(quote.freight_cost || 0)} lump sum)`,
    `${freightLabels.insuranceTitle} policy (${formatValue(quote.insurance_cost || 0)} lump sum)`
  ];

  const excludedScope = quote.excluded_responsibilities || [
    'Import duties, tariffs, and local destination taxes / VAT in destination country',
    freightLabels.isAir
      ? `Destination airport handling charges and local terminal fees at ${destinationPort}`
      : `Destination port terminal handling charges (THC at ${destinationPort})`,
    'Import customs clearance and local destination documentation',
    freightLabels.isAir ? 'Inland transport/delivery from destination airport to buyer warehouse' : 'Inland transport/delivery from discharge port to buyer warehouse',
    freightLabels.isAir ? 'Airline storage, handling, or warehousing fees at destination airport' : 'Container demurrage, detention, or storage fees at destination port',
    'Buyer-requested third-party pre-shipment or destination inspection/testing fees (e.g. SGS / Intertek) unless explicitly agreed in writing.'
  ];

  const docList = quote.included_docs || [
    'Commercial Invoice (Issued)',
    'Packing List (Issued)',
    freightLabels.isAir ? 'Air Waybill / Airline Booking Copy' : 'Bill of Lading (Clean On-Board B/L)',
    freightLabels.isAir ? 'Cargo Insurance Certificate' : 'Marine Insurance Certificate',
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
    `Quotation Validity & ${freightLabels.freightAdjustmentTerm}: Quoted rates are valid for ${quote.validity_days || 7} days from issuance. ${freightLabels.freightRateTerm}, insurance premiums, and exchange rates remain indicative until final ${freightLabels.bookingTerm}.`,
    'Payment Terms: ' + (quote.payment_terms || '50% Advance, 50% against shipping bill'),
    `Currency Exchange Protections & Settlement: All prices are quoted in ${quote.currency} based on a baseline exchange rate. Final proforma invoicing and settlement may be converted to USD or AED at prevailing RBI reference rates upon agreement.`,
    freightLabels.isAir
      ? 'Quality Assurance & Pre-Shipment Photos: Goods are supplied strictly per contract specifications. Pre-shipment quality inspection reports, packing photographs, and airway booking references will be provided prior to dispatch.'
      : 'Quality Assurance & Pre-Shipment Photos: Goods are supplied strictly per contract specifications. Pre-shipment quality inspection reports, container stuffing/loading photographs, and seal numbers will be provided prior to vessel departure.',
    freightLabels.isAir
      ? 'Claims & Discrepancies: Any product quality or weight claims must be reported in writing within 48 hours of cargo arrival at destination airport, supported by an official independent surveyor report and photographs.'
      : 'Claims & Discrepancies: Any product quality or weight claims must be reported in writing within 48 hours of cargo arrival at destination port, supported by an official independent surveyor report and photographs.',
    freightLabels.isAir
      ? 'Force Majeure: Seller shall not be held liable for shipment delays or non-performance resulting from flight delays, airport congestion, acts of God, strikes, or unexpected customs policy changes.'
      : 'Force Majeure: Seller shall not be held liable for shipment delays or non-performance resulting from vessel delays, port congestion, acts of God, strikes, or unexpected customs policy changes.',
    'Governing Law & Dispute Resolution: This contract shall be governed by Indian Maritime and Commercial Law. Any dispute arising under this agreement shall be subject to the exclusive jurisdiction of the courts in Nagpur, Maharashtra, India, or resolved through binding arbitration.'
  ];

  const logoSrc = getLogoSrc();

  return (
    <Document>
      {/* ==================== PAGE 1 ==================== */}
      <Page size="A4" style={styles.page}>
        
        {/* Upper Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image src={logoSrc} style={styles.logo} />
            <View style={styles.brandCol}>
              <Text style={styles.companyTitle}>{shipper.company_name.toUpperCase()}</Text>
              <Text style={styles.tagline}>EXPORTING GOODNESS WORLDWIDE</Text>
              <Text style={styles.regLine}>IEC  |  GST  |  APEDA  |  FSSAI  |  GLOBAL EXPORT DOCUMENTATION</Text>
            </View>
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.headerRight}>
            <Text style={styles.quoteTitle}>{getDocumentTitle()}</Text>
            <Text style={styles.refNumber}>
              {documentType === 'packing_list'
                ? `REF: ${packingListNumber}`
                : `REF: ${quote.quote_number || 'SG-CIF-2026-1236'}`}
            </Text>
            <View style={styles.metaTable}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Date</Text>
                <Text style={styles.metaColon}>:</Text>
                <Text style={styles.metaVal}>{formatDate(documentType === 'packing_list' ? packingListDate : quote.created_at)}</Text>
              </View>
              {documentType === 'packing_list' ? (
                <>
                  {quote.invoice_number ? (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Inv No</Text>
                      <Text style={styles.metaColon}>:</Text>
                      <Text style={styles.metaVal}>
                        {quote.invoice_number}
                        {quote.invoice_date ? ` (${formatDate(quote.invoice_date)})` : ''}
                      </Text>
                    </View>
                  ) : null}
                  {(quote.po_number || quote.contract_number) ? (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>{quote.po_number ? 'PO No' : 'Contract'}</Text>
                      <Text style={styles.metaColon}>:</Text>
                      <Text style={styles.metaVal}>{quote.po_number || quote.contract_number}</Text>
                    </View>
                  ) : null}
                  {(quote.shipment_ref || quote.booking_number) ? (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Ship Ref</Text>
                      <Text style={styles.metaColon}>:</Text>
                      <Text style={styles.metaVal}>{quote.shipment_ref || quote.booking_number}</Text>
                    </View>
                  ) : null}
                  {quote.country_of_origin || quote.origin_country ? (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Origin</Text>
                      <Text style={styles.metaColon}>:</Text>
                      <Text style={styles.metaVal}>{quote.country_of_origin || quote.origin_country}</Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Validity</Text>
                    <Text style={styles.metaColon}>:</Text>
                    <Text style={styles.metaVal}>{quote.validity_days ? `${quote.validity_days} Days` : '-'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Terms</Text>
                    <Text style={styles.metaColon}>:</Text>
                    <Text style={styles.metaVal}>{quote.payment_terms || '-'}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* 1. QUOTATION & PARTY DETAILS / PACKING LIST & PARTY DETAILS */}
        <View style={styles.sectionBar}>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>1.</Text>
          </View>
          <Text style={styles.sectionTitleText}>
            {documentType === 'packing_list' ? 'PACKING LIST & PARTY DETAILS' : 'QUOTATION & PARTY DETAILS'}
          </Text>
        </View>

        {/* Party Row */}
        <View style={styles.partyRow}>
          {/* Exporter */}
          <View style={styles.partyCard}>
            <View style={styles.partyHeaderBar}>
              <Text style={styles.partyHeaderTitle}>
                {documentType === 'packing_list' ? 'EXPORTER / SHIPPER' : 'EXPORTER / SELLER'}
              </Text>
            </View>
            <View style={styles.partyBody}>
              <Text style={styles.partyName}>{shipper.company_name}</Text>
              <Text style={styles.partyAddress}>{shipper.address}</Text>
              <View style={styles.partyDivider} />
              {documentType === 'packing_list' && shipperIec ? (
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>IEC No</Text>
                  <Text style={styles.kvColon}>:</Text>
                  <Text style={styles.kvValue}>{shipperIec}</Text>
                </View>
              ) : null}
              {documentType === 'packing_list' && shipperGstin ? (
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>GSTIN</Text>
                  <Text style={styles.kvColon}>:</Text>
                  <Text style={styles.kvValue}>{shipperGstin}</Text>
                </View>
              ) : null}
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Contact</Text>
                <Text style={styles.kvColon}>:</Text>
                <Text style={styles.kvValue}>{shipper.contact_name}  |  {shipperPhone}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Email</Text>
                <Text style={styles.kvColon}>:</Text>
                <Text style={styles.kvValue}>{shipper.contact_email}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Website</Text>
                <Text style={styles.kvColon}>:</Text>
                <Text style={styles.kvValue}>www.sheshaanglobal.com</Text>
              </View>
            </View>
          </View>

          {/* Buyer */}
          <View style={styles.partyCard}>
            <View style={styles.partyHeaderBar}>
              <Text style={styles.partyHeaderTitle}>
                {documentType === 'packing_list' ? 'CONSIGNEE / IMPORTER' : 'TO: BUYER / CONSIGNEE'}
              </Text>
            </View>
            <View style={styles.partyBody}>
              <Text style={styles.partyName}>{client.company_name || '-'}</Text>
              <Text style={styles.partyAddress}>{clientAddress}</Text>
              <View style={styles.partyDivider} />
              {clientCountry ? (
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Country</Text>
                  <Text style={styles.kvColon}>:</Text>
                  <Text style={styles.kvValue}>{clientCountry}</Text>
                </View>
              ) : null}
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Contact</Text>
                <Text style={styles.kvColon}>:</Text>
                <Text style={styles.kvValue}>{clientContact}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Email</Text>
                <Text style={styles.kvColon}>:</Text>
                <Text style={styles.kvValue}>{clientEmail}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Port</Text>
                <Text style={styles.kvColon}>:</Text>
                <Text style={styles.kvValue}>{destinationPort || '-'}</Text>
              </View>
              {quote.notify_party ? (
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Notify Party</Text>
                  <Text style={styles.kvColon}>:</Text>
                  <Text style={styles.kvValue}>{quote.notify_party}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Shipment Horizontal Grid */}
        <View style={styles.shipmentBar}>
          <View style={[styles.shipmentCol, { width: '13%' }]}>
            <View style={styles.shipmentIconBox}><BoxIcon /></View>
            <View style={styles.shipmentContent}>
              <Text style={styles.shipmentLabel}>INCOTERM</Text>
              <Text style={styles.shipmentVal}>{incotermCode || '-'}</Text>
            </View>
          </View>
          <View style={[styles.shipmentCol, { width: '11%' }]}>
            <View style={styles.shipmentIconBox}><GlobeIcon /></View>
            <View style={styles.shipmentContent}>
              <Text style={styles.shipmentLabel}>ORIGIN</Text>
              <Text style={styles.shipmentVal}>{quote.country_of_origin || quote.origin_country || '-'}</Text>
            </View>
          </View>
          <View style={[styles.shipmentCol, { width: '19%' }]}>
            <View style={styles.shipmentIconBox}><AnchorIcon /></View>
            <View style={styles.shipmentContent}>
              <Text style={styles.shipmentLabel}>LOADING PORT</Text>
              <Text style={[styles.shipmentVal, { fontSize: 5.6 }]}>{quote.loading_port || '-'}</Text>
            </View>
          </View>
          <View style={[styles.shipmentCol, { width: '19%' }]}>
            <View style={styles.shipmentIconBox}><MapPinIcon /></View>
            <View style={styles.shipmentContent}>
              <Text style={styles.shipmentLabel}>DESTINATION PORT</Text>
              <Text style={[styles.shipmentVal, { fontSize: 5.6 }]}>{destinationPort || '-'}</Text>
            </View>
          </View>
          <View style={[styles.shipmentCol, { width: '18%' }]}>
            <View style={styles.shipmentIconBox}><ContainerIcon /></View>
            <View style={styles.shipmentContent}>
              <Text style={styles.shipmentLabel}>
                {documentType === 'packing_list' ? 'FINAL DESTINATION' : 'SHIPMENT MODE'}
              </Text>
              <Text style={[styles.shipmentVal, { fontSize: 5.6 }]}>
                {documentType === 'packing_list' ? finalDestination : (quote.shipment_mode || '-')}
              </Text>
            </View>
          </View>
          <View style={[styles.shipmentColLast, { width: '20%' }]}>
            <View style={styles.shipmentIconBox}><DocIcon /></View>
            <View style={styles.shipmentContent}>
              <Text style={styles.shipmentLabel}>
                {documentType === 'packing_list' ? 'SHIPMENT MODE' : 'PAYMENT TERMS'}
              </Text>
              <Text style={[styles.shipmentVal, { fontSize: 5.2, fontFamily: 'ArialCustom' }]}>
                {documentType === 'packing_list' ? (quote.shipment_mode || 'FCL Ocean Cargo') : (quote.payment_terms || '-')}
              </Text>
            </View>
          </View>
        </View>

        {/* Optional Transport Details Row for Packing List (rendered when available) */}
        {documentType === 'packing_list' && hasTransportDetails && (
          <View style={[styles.shipmentBar, { marginTop: -4 }]}>
            {vesselName ? (
              <View style={[styles.shipmentCol, { flex: 1 }]}>
                <View style={styles.shipmentIconBox}><AnchorIcon /></View>
                <View style={styles.shipmentContent}>
                  <Text style={styles.shipmentLabel}>VESSEL / CARRIER</Text>
                  <Text style={[styles.shipmentVal, { fontSize: 5.6 }]}>{vesselName}</Text>
                </View>
              </View>
            ) : null}
            {containerNumber ? (
              <View style={[styles.shipmentCol, { flex: 1 }]}>
                <View style={styles.shipmentIconBox}><ContainerIcon /></View>
                <View style={styles.shipmentContent}>
                  <Text style={styles.shipmentLabel}>CONTAINER NO.</Text>
                  <Text style={[styles.shipmentVal, { fontSize: 5.6 }]}>{containerNumber}</Text>
                </View>
              </View>
            ) : null}
            {sealNumber ? (
              <View style={[styles.shipmentCol, { flex: 1 }]}>
                <View style={styles.shipmentIconBox}><BoxIcon /></View>
                <View style={styles.shipmentContent}>
                  <Text style={styles.shipmentLabel}>SEAL NO.</Text>
                  <Text style={[styles.shipmentVal, { fontSize: 5.6 }]}>{sealNumber}</Text>
                </View>
              </View>
            ) : null}
            {blNumber ? (
              <View style={[styles.shipmentColLast, { flex: 1 }]}>
                <View style={styles.shipmentIconBox}><DocIcon /></View>
                <View style={styles.shipmentContent}>
                  <Text style={styles.shipmentLabel}>B/L NUMBER</Text>
                  <Text style={[styles.shipmentVal, { fontSize: 5.6 }]}>{blNumber}</Text>
                </View>
              </View>
            ) : null}
          </View>
        )}

        {/* 2. COMMERCIAL OFFER & SPECIFICATIONS / EXPORT COMMODITY SPECIFICATIONS */}
        <View style={styles.sectionBar}>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>2.</Text>
          </View>
          <Text style={styles.sectionTitleText}>
            {documentType === 'packing_list' ? 'EXPORT COMMODITY & PACKING SPECIFICATIONS' : 'COMMERCIAL OFFER & SPECIFICATIONS'}
          </Text>
        </View>

        {/* Section 2 Table */}
        <View style={styles.table}>
          <View style={styles.tHeaderRow} fixed>
            {documentType === 'packing_list' ? (
              <>
                <Text style={[styles.tHeaderCol, styles.tHeaderColBorder, styles.colPlSr]}>SR</Text>
                <Text style={[styles.tHeaderCol, styles.tHeaderColBorder, styles.colPlMarks]}>MARKS & NUMBERS</Text>
                <Text style={[styles.tHeaderCol, styles.tHeaderColBorder, styles.colPlDesc]}>COMMODITY & SPECIFICATIONS</Text>
                <Text style={[styles.tHeaderCol, styles.tHeaderColBorder, styles.colPlHs]}>HS CODE</Text>
                <Text style={[styles.tHeaderCol, styles.tHeaderColBorder, styles.colPlPack]}>PACKAGING & PKGS</Text>
                <Text style={[styles.tHeaderCol, styles.tHeaderColBorder, styles.colPlNetUnit]}>NET WT/PKG</Text>
                <Text style={[styles.tHeaderCol, styles.tHeaderColBorder, styles.colPlNetTotal]}>NET WT (KG)</Text>
                <Text style={[styles.tHeaderCol, styles.colPlGrossTotal]}>GROSS WT (KG)</Text>
              </>
            ) : (
              <>
                <Text style={[styles.tHeaderCol, styles.tHeaderColBorder, styles.colS2Sr]}>SR</Text>
                <Text style={[styles.tHeaderCol, styles.tHeaderColBorder, styles.colS2Desc]}>PRODUCT DESCRIPTION & SPECIFICATIONS</Text>
                <Text style={[styles.tHeaderCol, styles.tHeaderColBorder, styles.colS2Hs]}>HS CODE</Text>
                <Text style={[styles.tHeaderCol, styles.tHeaderColBorder, styles.colS2Pack]}>PACKING & CONTAINER</Text>
                <Text style={[styles.tHeaderCol, styles.tHeaderColBorder, styles.colS2Qty]}>QUANTITY</Text>
                <Text style={[styles.tHeaderCol, styles.tHeaderColBorder, styles.colS2Price]}>UNIT PRICE ({currencySymbol})</Text>
                <Text style={[styles.tHeaderCol, styles.colS2Total]}>TOTAL AMOUNT ({currencySymbol})</Text>
              </>
            )}
          </View>

          {/* Line items */}
          {documentType === 'packing_list' ? (
            plComputation.lines.map((pLine) => (
              <View key={pLine.item.id || pLine.sr} style={styles.tRow} wrap={false}>
                <Text style={[styles.tCell, styles.tCellBorder, styles.colPlSr]}>{pLine.sr}</Text>
                <View style={[styles.colPlMarks, styles.tCellBorder]}>
                  <Text style={[styles.tCellBold, { fontSize: 6 }]}>{pLine.marks}</Text>
                </View>
                <View style={[styles.colPlDesc, styles.tCellBorder]}>
                  <Text style={styles.tCellBold}>{pLine.description}</Text>
                  {pLine.grade ? (
                    <Text style={[styles.tCell, { fontSize: 5.3, color: C.navyMedium, fontWeight: 'bold', marginTop: 1 }]}>
                      Grade: {pLine.grade}
                    </Text>
                  ) : null}
                  {pLine.specBullets.map((b, bi) => (
                    <Text key={bi} style={[styles.tCell, { fontSize: 5.3, color: '#64748B', marginTop: 1 }]}>
                      {b}
                    </Text>
                  ))}
                </View>
                <Text style={[styles.tCell, styles.tCellBorder, styles.colPlHs]}>{pLine.hsCode}</Text>
                <View style={[styles.colPlPack, styles.tCellBorder, { alignItems: 'center' }]}>
                  <Text style={styles.tCellBold}>
                    {pLine.packageCount > 0 ? `${new Intl.NumberFormat('en-US').format(pLine.packageCount)} Pkgs` : '-'}
                  </Text>
                  <Text style={[styles.tCell, { fontSize: 5.2, color: '#64748B', textAlign: 'center' }]}>
                    {pLine.packagingType}
                  </Text>
                </View>
                <Text style={[styles.tCell, styles.tCellBorder, styles.colPlNetUnit]}>
                  {pLine.isUniformWeight
                    ? (pLine.netWeightPerPackage ? `${pLine.netWeightPerPackage} kg` : '-')
                    : (pLine.netWeightPerPackage ? `${pLine.netWeightPerPackage} kg (Nom.)` : 'Variable')}
                </Text>
                <View style={[styles.colPlNetTotal, styles.tCellBorder, { alignItems: 'flex-end' }]}>
                  <Text style={styles.tCellBold}>
                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(pLine.totalNetWeight)} kg
                  </Text>
                  <Text style={[styles.tCell, { fontSize: 5.2, color: '#64748B' }]}>
                    {(pLine.totalNetWeight / 1000).toFixed(2)} MT
                  </Text>
                </View>
                <View style={[styles.colPlGrossTotal, { alignItems: 'flex-end' }]}>
                  <Text style={styles.tCellBold}>
                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(pLine.totalGrossWeight)} kg
                  </Text>
                  <Text style={[styles.tCell, { fontSize: 5.2, color: '#64748B' }]}>
                    {(pLine.totalGrossWeight / 1000).toFixed(2)} MT
                  </Text>
                </View>
              </View>
            ))
          ) : (
            lineItems.map((item, index) => {
              const pricingBasis = getItemPricingBasis(item);
              const netWeight = getItemNetWeight(item);
              const packageQuantity = getItemPackageQuantity(item);
              const packageWeight = getItemPackageWeight(item);
              const itemTotal = getItemSellTotal(item);
              const unitPriceAmount = pricingBasis === 'package'
                ? Number(item.package_unit_price || 0)
                : Number(item.unit_price || 0);
              const unitPriceBasis = pricingBasis === 'package' ? 'pkg' : 'kg';

              const descLines = (item.description || '').split('\n').filter(Boolean);
              const mainTitle = descLines[0] || 'Product';
              const specBullets = descLines.slice(1);

              return (
                <View key={item.id || index} style={styles.tRow} wrap={false}>
                  <Text style={[styles.tCell, styles.tCellBorder, styles.colS2Sr]}>{index + 1}</Text>
                  <View style={[styles.colS2Desc, styles.tCellBorder]}>
                    <Text style={styles.tCellBold}>{mainTitle}</Text>
                    {specBullets.map((b, bi) => (
                      <Text key={bi} style={[styles.tCell, { fontSize: 5.5, color: '#64748B', marginTop: 1 }]}>
                        {b}
                      </Text>
                    ))}
                  </View>
                  <Text style={[styles.tCell, styles.tCellBorder, styles.colS2Hs]}>{item.hs_code || '-'}</Text>
                  <Text style={[styles.tCell, styles.tCellBorder, styles.colS2Pack]}>{item.packing_container || '-'}</Text>
                  <Text style={[styles.tCell, styles.tCellBorder, styles.colS2Qty]}>
                    {pricingBasis === 'package' && packageQuantity > 0
                      ? `${new Intl.NumberFormat('en-US').format(packageQuantity)} pkgs\n(${packageWeight} kg/pkg)`
                      : `${new Intl.NumberFormat('en-US').format(netWeight)} kg\n(${(netWeight / 1000).toFixed(2)} MT)`}
                  </Text>
                  <Text style={[styles.tCell, styles.tCellBorder, styles.colS2Price]}>
                    {currencySymbol} {unitPriceAmount.toFixed(2)}{"\n"}/{unitPriceBasis}
                  </Text>
                  <Text style={[styles.tCellBold, styles.colS2Total, { fontSize: 7.5 }]}>
                    {formatSection2Amount(itemTotal)}
                  </Text>
                </View>
              );
            })
          )}

          {/* Grand Total Row */}
          {documentType === 'packing_list' ? (
            <View style={styles.grandTotalRow} wrap={false}>
              <View style={[styles.grandTotalLeftCell, { width: '52%' }]}>
                <Text style={styles.grandTotalLabel}>TOTAL SHIPMENT QUANTITY & PACKING</Text>
              </View>
              <View style={{ width: '15%', borderRightWidth: 0.75, borderRightColor: C.borderGrey, paddingVertical: 2, alignItems: 'center' }}>
                <Text style={[styles.grandTotalVal, { textAlign: 'center', fontSize: 7 }]}>
                  {plComputation.totalPackages > 0 ? `${new Intl.NumberFormat('en-US').format(plComputation.totalPackages)} Pkgs` : '-'}
                </Text>
              </View>
              <View style={{ width: '10%', borderRightWidth: 0.75, borderRightColor: C.borderGrey, paddingVertical: 2, alignItems: 'center' }}>
                <Text style={[styles.tCell, { textAlign: 'center', fontSize: 6.2, color: '#64748B' }]}>-</Text>
              </View>
              <View style={{ width: '11%', paddingRight: 4, borderRightWidth: 0.75, borderRightColor: C.borderGrey, paddingVertical: 2, alignItems: 'flex-end' }}>
                <Text style={[styles.grandTotalVal, { fontSize: 7 }]}>
                  {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(plComputation.totalNetWeight)} kg
                </Text>
              </View>
              <View style={{ width: '12%', paddingRight: 4, paddingVertical: 2, alignItems: 'flex-end' }}>
                <Text style={[styles.grandTotalVal, { fontSize: 7 }]}>
                  {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(plComputation.totalGrossWeight)} kg
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.grandTotalRow} wrap={false}>
              <View style={styles.grandTotalLeftCell}>
                <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
              </View>
              <View style={styles.grandTotalRightCell}>
                <Text style={styles.grandTotalVal}>{formatSection2Amount(itemsSubtotal)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Amount in words / Packing Summary box */}
        {documentType === 'packing_list' ? (
          <View style={styles.wordsBox} wrap={false}>
            <Text style={styles.wordsText}>
              Total Cargo: {plComputation.totalPackages.toLocaleString()} {plComputation.totalPackages === 1 ? 'Package' : 'Packages'}  |  Total Net Weight: {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(plComputation.totalNetWeight)} KG ({(plComputation.totalNetWeight / 1000).toFixed(3)} MT)  |  Total Gross Weight: {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(plComputation.totalGrossWeight)} KG ({(plComputation.totalGrossWeight / 1000).toFixed(3)} MT)
              {totalCbm > 0 ? `  |  Total Volume: ${totalCbm.toFixed(2)} CBM` : ''}
            </Text>
          </View>
        ) : (
          <View style={styles.wordsBox} wrap={false}>
            <Text style={styles.wordsText}>
              Amount in Words: {numberToWords(itemsSubtotal, quote.currency)}
            </Text>
          </View>
        )}

        {/* 3. TRANSPARENT FOB / CIF COST STRUCTURE BREAKDOWN */}
        {documentType === 'quotation' && showCifBreakdown && (
          <>
            <View style={styles.sectionBar} wrap={false}>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>3.</Text>
              </View>
              <Text style={styles.sectionTitleText}>
                TRANSPARENT {incotermCode} COST STRUCTURE BREAKDOWN
              </Text>
            </View>

            <View style={styles.table}>
              <View style={styles.tHeaderRow} wrap={false}>
                <Text style={[styles.tHeaderCol, styles.tHeaderColBorder, styles.colS3Sr]}>SR</Text>
                <Text style={[styles.tHeaderCol, styles.tHeaderColBorder, styles.colS3Desc]}>COST COMPONENT / ITEMIZATION</Text>
                <Text style={[styles.tHeaderCol, styles.tHeaderColBorder, styles.colS3Basis]}>BASIS OF CALCULATION</Text>
                <Text style={[styles.tHeaderCol, styles.tHeaderColBorder, styles.colS3Rate]}>RATE / CHARGE</Text>
                <Text style={[styles.tHeaderCol, styles.colS3Total]}>TOTAL AMOUNT ({currencySymbol})</Text>
              </View>

              {costBreakdownRows.map((row, index) => (
                <View key={row.title} style={styles.tRow} wrap={false}>
                  <Text style={[styles.tCell, styles.tCellBorder, styles.colS3Sr]}>{index + 1}</Text>
                  <View style={[styles.colS3Desc, styles.tCellBorder]}>
                    <Text style={styles.tCellBold}>{row.title}</Text>
                    <Text style={[styles.tCell, { fontSize: 5.4, color: '#64748B', marginTop: 1 }]}>
                      {row.detail}
                    </Text>
                  </View>
                  <Text style={[styles.tCell, styles.tCellBorder, styles.colS3Basis]}>{row.basis}</Text>
                  <Text style={[styles.tCell, styles.tCellBorder, styles.colS3Rate]}>{row.rate}</Text>
                  <Text style={[styles.tCell, styles.colS3Total]}>{formatValue(row.amount)}</Text>
                </View>
              ))}

              {/* Highlighted Dark Total Row */}
              <View style={styles.offeredTotalBar} wrap={false}>
                <Text style={styles.offeredTotalLeft}>TOTAL OFFERED {incotermCode} VALUE</Text>
                <View style={styles.offeredTotalRightGroup}>
                  <Text style={styles.offeredTotalDivider}>|</Text>
                  <Text style={styles.offeredTotalVal}>{formatValue(finalOfferedTotal)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.wordsBox} wrap={false}>
              <Text style={styles.wordsText}>
                Total Offered {incotermCode} Value in Words: {numberToWords(finalOfferedTotal, quote.currency)}
              </Text>
            </View>
          </>
        )}

        {/* Banking Settlement for Invoice */}
        {documentType === 'invoice' && (
          <>
            <View style={styles.sectionBar}>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>3.</Text>
              </View>
              <Text style={styles.sectionTitleText}>BANKING SETTLEMENT & WIRE INSTRUCTIONS</Text>
            </View>
            <View style={[styles.table, { padding: 8, backgroundColor: C.bgSection }]}>
              <Text style={{ fontFamily: 'ArialCustom', fontWeight: 'bold', fontSize: 7, color: C.navyDark, marginBottom: 5 }}>
                TELEGRAPHIC TRANSFER (T/T) ACCOUNT ROUTING
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <View style={{ width: '48%', marginBottom: 3 }}>
                  <Text style={{ fontSize: 5.5, color: '#64748B' }}>Beneficiary Bank</Text>
                  <Text style={{ fontFamily: 'ArialCustom', fontWeight: 'bold', fontSize: 6.8, color: C.navyDark }}>{bankDetails.beneficiary_bank}</Text>
                </View>
                <View style={{ width: '48%', marginBottom: 3 }}>
                  <Text style={{ fontSize: 5.5, color: '#64748B' }}>Branch Location</Text>
                  <Text style={{ fontFamily: 'ArialCustom', fontWeight: 'bold', fontSize: 6.8, color: C.navyDark }}>{bankDetails.branch_location}</Text>
                </View>
                <View style={{ width: '48%', marginBottom: 3 }}>
                  <Text style={{ fontSize: 5.5, color: '#64748B' }}>Account Holder Name</Text>
                  <Text style={{ fontFamily: 'ArialCustom', fontWeight: 'bold', fontSize: 6.8, color: C.navyDark }}>{bankDetails.account_holder_name}</Text>
                </View>
                <View style={{ width: '48%', marginBottom: 3 }}>
                  <Text style={{ fontSize: 5.5, color: '#64748B' }}>Routing Account Number</Text>
                  <Text style={{ fontFamily: 'ArialCustom', fontWeight: 'bold', fontSize: 6.8, color: C.navyDark }}>{bankDetails.account_number}</Text>
                </View>
                <View style={{ width: '48%' }}>
                  <Text style={{ fontSize: 5.5, color: '#64748B' }}>Local IFSC Code</Text>
                  <Text style={{ fontFamily: 'ArialCustom', fontWeight: 'bold', fontSize: 6.8, color: C.navyDark }}>{bankDetails.ifsc_code}</Text>
                </View>
                <View style={{ width: '48%' }}>
                  <Text style={{ fontSize: 5.5, color: '#64748B' }}>SWIFT BIC Identifier</Text>
                  <Text style={{ fontFamily: 'ArialCustom', fontWeight: 'bold', fontSize: 6.8, color: C.navyDark }}>{bankDetails.swift_code}</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Shipping Weight for Packing List */}
        {documentType === 'packing_list' && (
          <>
            <View style={styles.sectionBar}>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>3.</Text>
              </View>
              <Text style={styles.sectionTitleText}>SHIPPING WEIGHT & VOLUMETRIC TOTALS</Text>
            </View>
            <View style={[styles.shipmentBar, { padding: 6, justifyContent: 'space-between', marginBottom: 6 }]}>
              <View style={{ flex: 1, paddingHorizontal: 4 }}>
                <Text style={styles.shipmentLabel}>TOTAL PACKAGES</Text>
                <Text style={[styles.shipmentVal, { fontSize: 7.5 }]}>
                  {new Intl.NumberFormat('en-US').format(plComputation.totalPackages)} Packages
                </Text>
                <Text style={{ fontSize: 5.2, color: '#64748B', marginTop: 1 }}>
                  {plComputation.lines.length === 1 ? plComputation.lines[0]?.packagingType : 'Multiple Packaging Lines'}
                </Text>
              </View>
              <View style={{ width: 0.75, height: 26, backgroundColor: C.borderGrey, marginHorizontal: 3 }} />
              <View style={{ flex: 1.1, paddingHorizontal: 4 }}>
                <Text style={styles.shipmentLabel}>TOTAL NET WEIGHT</Text>
                <Text style={[styles.shipmentVal, { fontSize: 7.5 }]}>
                  {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(plComputation.totalNetWeight)} kg
                </Text>
                <Text style={{ fontSize: 5.2, color: '#64748B', marginTop: 1 }}>
                  {(plComputation.totalNetWeight / 1000).toFixed(3)} Metric Tons
                </Text>
              </View>
              <View style={{ width: 0.75, height: 26, backgroundColor: C.borderGrey, marginHorizontal: 3 }} />
              <View style={{ flex: 1.1, paddingHorizontal: 4 }}>
                <Text style={styles.shipmentLabel}>TOTAL GROSS WEIGHT</Text>
                <Text style={[styles.shipmentVal, { fontSize: 7.5 }]}>
                  {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(plComputation.totalGrossWeight)} kg
                </Text>
                <Text style={{ fontSize: 5.2, color: '#64748B', marginTop: 1 }}>
                  {(plComputation.totalGrossWeight / 1000).toFixed(3)} Metric Tons
                </Text>
              </View>
              {totalCbm > 0 ? (
                <>
                  <View style={{ width: 0.75, height: 26, backgroundColor: C.borderGrey, marginHorizontal: 3 }} />
                  <View style={{ flex: 0.9, paddingHorizontal: 4 }}>
                    <Text style={styles.shipmentLabel}>TOTAL VOLUME</Text>
                    <Text style={[styles.shipmentVal, { fontSize: 7.5 }]}>{totalCbm.toFixed(2)} CBM</Text>
                    <Text style={{ fontSize: 5.2, color: '#64748B', marginTop: 1 }}>Cubic Metres</Text>
                  </View>
                </>
              ) : null}
              <View style={{ width: 0.75, height: 26, backgroundColor: C.borderGrey, marginHorizontal: 3 }} />
              <View style={{ flex: 1.2, paddingHorizontal: 4 }}>
                <Text style={styles.shipmentLabel}>CONTAINER SPECIFICATION</Text>
                <Text style={[styles.shipmentVal, { fontSize: 7.2 }]}>{quote.shipment_mode || '20ft FCL Dry Container'}</Text>
                <Text style={{ fontSize: 5.2, color: '#64748B', marginTop: 1 }}>
                  {containerNumber ? `No: ${containerNumber}` : 'Standard Shipping Container'}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Note / Declaration Box */}
        {documentType === 'packing_list' ? (
          <View style={styles.noteBox} wrap={false}>
            <View style={styles.noteLeftGroup}>
              <View style={styles.noteIconBox}><DocIcon /></View>
              <Text style={styles.noteTitle}>DECLARATION</Text>
            </View>
            <View style={styles.noteDivider} />
            <View style={styles.noteRightTextGroup}>
              <Text style={[styles.noteTextLine, { fontWeight: 'bold', color: C.navyDark }]}>
                &quot;We hereby certify that the particulars stated above are true and correct and accurately describe the packing and physical contents of this shipment.&quot;
              </Text>
              <Text style={[styles.noteTextLine, { marginTop: 2, fontSize: 5.4, color: '#64748B' }]}>
                Place of Issue: {placeOfIssue}   |   Date of Issue: {formatDate(packingListDate)}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noteBox} wrap={false}>
            <View style={styles.noteLeftGroup}>
              <View style={styles.noteIconBox}><DocIcon /></View>
              <Text style={styles.noteTitle}>NOTE</Text>
            </View>
            <View style={styles.noteDivider} />
            <View style={styles.noteRightTextGroup}>
              {quote.commercial_note?.trim() ? (
                <Text style={styles.noteTextLine}>
                  {quote.commercial_note}
                </Text>
              ) : null}
              <Text style={styles.noteTextLine}>
                This commercial structure is indicative and subject to final confirmation, availability of cargo, and standard export documentation.
              </Text>
            </View>
          </View>
        )}

        {/* SIGNATURES BLOCK (Shown on Page 1 when Details Page is disabled) */}
        {!showDetailsPage && showSignatureBlock && (
          <View style={styles.signaturesGrid} wrap={false}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureRoleLabel}>
                {`For ${shipper.company_name.toUpperCase()}\n(${documentType === 'packing_list' ? 'Exporter / Shipper' : 'Exporter / Seller'})`}
              </Text>
              <View style={styles.signatureSignLine}>
                {showCeoSignature && (
                  <Image src={getSignatureSrc()} style={styles.signatureImage} />
                )}
                <Image src={getStampSrc()} style={styles.stampImage} />
              </View>
              <Text style={styles.signatureTextName}>{signatoryName}</Text>
              <Text style={styles.signatureTextCompany}>{signatoryDesignation}, {shipper.company_name}</Text>
              <Text style={{ fontSize: 5.2, color: '#64748B', marginTop: 1 }}>
                Place: {placeOfIssue}  |  Date: {formatDate(packingListDate)}
              </Text>
            </View>

            <View style={styles.signatureBox}>
              <Text style={styles.signatureRoleLabel}>
                {documentType === 'packing_list'
                  ? 'RECEIVED & VERIFIED BY CONSIGNEE\n(Port / Customs / Warehouse Clearance)'
                  : 'Accepted & Confirmed By Buyer\n(Buyer Order Confirmation)'}
              </Text>
              <View style={[styles.signatureSignLine, { borderStyle: 'dashed' }]} />
              <Text style={styles.signatureTextName}>
                {documentType === 'packing_list' ? 'Authorized Consignee Signature & Stamp' : 'Authorized Buyer Signature & Stamp'}
              </Text>
              <Text style={styles.signatureTextCompany}>
                {[client.contact_name, client.company_name].filter(Boolean).join(' / ') || 'Authorized Representative'}
              </Text>
              {documentType === 'packing_list' ? (
                <Text style={{ fontSize: 5.2, color: '#64748B', marginTop: 1 }}>
                  Clearance Verification & Cargo Receipt
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} wrap={false}>
          <View style={styles.footerCol1}>
            <Text style={styles.footerBrand}>SHESHAAN GLOBAL</Text>
            <Text style={styles.footerTagline}>EXPORTING GOODNESS WORLDWIDE</Text>
          </View>
          <View style={styles.footerDivider} />
          <View style={styles.footerCol2}>
            <View style={styles.footerCircleIcon}><FooterPinBadge /></View>
            <Text style={styles.footerText}>
              {shipper.address.replace(/\n/g, ', ')}
            </Text>
          </View>
          <View style={styles.footerDivider} />
          <View style={styles.footerCol3}>
            <View style={styles.footerCircleIcon}><FooterMailBadge /></View>
            <Text style={styles.footerText}>
              {shipper.contact_email}{"\n"}www.sheshaanglobal.com
            </Text>
          </View>
          <View style={styles.footerDivider} />
          <View style={styles.footerCol4}>
            <View style={styles.footerCircleIcon}><FooterPhoneBadge /></View>
            <Text style={styles.footerPhone}>+91 81499 09546</Text>
          </View>
        </View>
      </Page>

      {/* ==================== PAGE 2 (If Details Page Enabled) ==================== */}
      {showDetailsPage && (
        <Page size="A4" style={styles.page}>
          
          {/* Mini Header Page 2 */}
          <View style={styles.page2Header}>
            <Text style={styles.page2HeaderText}>
              {shipper.company_name.toUpperCase()} - {getDocumentTitle()} REF: {quote.quote_number || 'SG-CIF-2026-1236'}
            </Text>
            <Text style={styles.page2HeaderDate}>
              Date: {formatDate(quote.created_at)}
            </Text>
          </View>

          {/* 4. SCOPE OF RESPONSIBILITIES & EXPORT CONDITIONS */}
          {documentType !== 'packing_list' ? (
            <>
              <View style={styles.sectionBar}>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>4.</Text>
                </View>
                <Text style={styles.sectionTitleText}>SCOPE OF RESPONSIBILITIES & EXPORT CONDITIONS</Text>
              </View>
              <View style={styles.p2TwoColRow}>
                <View style={styles.p2Box}>
                  <View style={styles.p2BoxHeader}>
                    <Text style={styles.p2BoxHeaderTitle}>INCLUDED IN SELLER&apos;S {incotermCode} PRICE</Text>
                  </View>
                  <View style={styles.p2BoxBody}>
                    {includedScope.map((item, idx) => (
                      <View key={idx} style={styles.p2BulletRow}>
                        <Text style={styles.p2BulletDot}>•</Text>
                        <Text style={styles.p2BulletText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={styles.p2Box}>
                  <View style={styles.p2BoxHeader}>
                    <Text style={styles.p2BoxHeaderTitle}>BUYER EXCLUSIONS & RESPONSIBILITIES</Text>
                  </View>
                  <View style={styles.p2BoxBody}>
                    {excludedScope.map((item, idx) => (
                      <View key={idx} style={styles.p2BulletRow}>
                        <Text style={styles.p2BulletDot}>•</Text>
                        <Text style={styles.p2BulletText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.sectionBar}>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>4.</Text>
                </View>
                <Text style={styles.sectionTitleText}>PACKAGING & STUFFING SPECIFICATIONS</Text>
              </View>
              <View style={[styles.p2TermsContainer, { marginBottom: 10 }]}>
                <Text style={[styles.p2TermText, { fontSize: 6.2 }]}>
                  • Packaging Material: High-strength, food-grade PP bags (50 kg Net / Bag) with internal moisture liner.{"\n"}
                  • Container Stuffing: Manually palletized, strapped, and shrink-wrapped with corner guards inside standard 20ft FCL container.{"\n"}
                  • Cargo Protection: Desiccant bags placed inside container to prevent sweat/moisture condensation.
                </Text>
              </View>
            </>
          )}

          {/* 5. DOCUMENTATION & LOGISTICS PARAMETERS */}
          <View style={styles.sectionBar}>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>5.</Text>
            </View>
            <Text style={styles.sectionTitleText}>DOCUMENTATION & LOGISTICS PARAMETERS</Text>
          </View>
          <View style={styles.p2TwoColRow}>
            <View style={styles.p2Box}>
              <View style={styles.p2BoxHeader}>
                <Text style={styles.p2BoxHeaderTitle}>
                  {documentType === 'packing_list' ? 'SHIPPING DOCUMENTS ATTACHED' : 'EXPORT DOCUMENTATION INCLUDED'}
                </Text>
              </View>
              <View style={styles.p2BoxBody}>
                {docList.map((item, idx) => (
                  <View key={idx} style={styles.p2BulletRow}>
                    <Text style={styles.p2BulletDot}>•</Text>
                    <Text style={styles.p2BulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.p2Box}>
              <View style={styles.p2BoxHeader}>
                <Text style={styles.p2BoxHeaderTitle}>LOGISTICS & OPERATIONAL SPECIFICATIONS</Text>
              </View>
              <View style={styles.p2BoxBody}>
                <View style={styles.p2SpecRow}>
                  <Text style={styles.p2SpecLabel}>Shipment Window:</Text>
                  <Text style={styles.p2SpecValue}>{specMap.shipment_window}</Text>
                </View>
                <View style={styles.p2SpecRow}>
                  <Text style={styles.p2SpecLabel}>Transit Time:</Text>
                  <Text style={styles.p2SpecValue}>{specMap.transit_time}</Text>
                </View>
                <View style={styles.p2SpecRow}>
                  <Text style={styles.p2SpecLabel}>Partial Shipment / Transshipment:</Text>
                  <Text style={styles.p2SpecValue}>{specMap.partial_shipment}</Text>
                </View>
                <View style={styles.p2SpecRow}>
                  <Text style={styles.p2SpecLabel}>Container Type:</Text>
                  <Text style={styles.p2SpecValue}>{specMap.container_type}</Text>
                </View>
                <View style={[styles.p2SpecRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.p2SpecLabel}>Storage Condition:</Text>
                  <Text style={styles.p2SpecValue}>{specMap.storage_condition}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 6. COMMERCIAL TERMS & CONDITIONS */}
          {documentType !== 'packing_list' ? (
            <>
              <View style={styles.sectionBar}>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>6.</Text>
                </View>
                <Text style={styles.sectionTitleText}>COMMERCIAL TERMS & CONDITIONS</Text>
              </View>
              <View style={styles.p2TermsContainer}>
                {commercialTerms.map((term, idx) => (
                  <View key={idx} style={styles.p2TermRow}>
                    <Text style={styles.p2TermNum}>{idx + 1}.</Text>
                    <Text style={styles.p2TermText}>{term}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
              <View style={styles.sectionBar}>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>6.</Text>
                </View>
                <Text style={styles.sectionTitleText}>
                  {freightLabels.isAir ? 'AIR CARGO DELIVERY & RECEIPT CONDITIONS' : 'PORT DELIVERY & RECEIPT CONDITIONS'}
                </Text>
              </View>
              <View style={styles.p2TermsContainer}>
                <Text style={[styles.p2TermText, { fontSize: 6 }]}>
                  {freightLabels.isAir
                    ? '1. Recipient must validate carton count, airway bill reference, and package condition immediately upon airport cargo release.\n2. Weight tolerances: A standard moisture weight variation of +/- 0.5% during air transport is commercially acceptable.'
                    : '1. Recipient must perform validation of seal integrity and container numbers against the Clean Bill of Lading immediately upon port clearance.\n2. Weight tolerances: A standard moisture weight variation of +/- 0.5% during sea transport is commercially acceptable.'}
                </Text>
              </View>
            </>
          )}

          {/* SIGNATURES BLOCK */}
          {showSignatureBlock && (
            <View wrap={false}>
              {documentType === 'packing_list' && (
                <View style={[styles.noteBox, { marginBottom: 6 }]} wrap={false}>
                  <View style={styles.noteLeftGroup}>
                    <View style={styles.noteIconBox}><DocIcon /></View>
                    <Text style={styles.noteTitle}>DECLARATION</Text>
                  </View>
                  <View style={styles.noteDivider} />
                  <View style={styles.noteRightTextGroup}>
                    <Text style={[styles.noteTextLine, { fontWeight: 'bold', color: C.navyDark }]}>
                      &quot;We hereby certify that the particulars stated above are true and correct and accurately describe the packing and physical contents of this shipment.&quot;
                    </Text>
                    <Text style={[styles.noteTextLine, { marginTop: 2, fontSize: 5.4, color: '#64748B' }]}>
                      Place of Issue: {placeOfIssue}   |   Date of Issue: {formatDate(packingListDate)}   |   Doc: Packing List ({packingListNumber})
                    </Text>
                  </View>
                </View>
              )}
              <View style={styles.signaturesGrid}>
                <View style={styles.signatureBox}>
                  <Text style={styles.signatureRoleLabel}>
                    {documentType === 'packing_list' ? 'For Sheshaan Global\n(Authorized Signatory)' : 'For Sheshaan Global\n(Exporter / Seller)'}
                  </Text>
                  <View style={styles.signatureSignLine}>
                    {showCeoSignature && (
                      <Image src={getSignatureSrc()} style={styles.signatureImage} />
                    )}
                    <Image src={getStampSrc()} style={styles.stampImage} />
                  </View>
                  <Text style={styles.signatureTextName}>{signatoryName}</Text>
                  <Text style={styles.signatureTextCompany}>{signatoryDesignation}, {shipper.company_name}</Text>
                  {documentType === 'packing_list' && (
                    <Text style={{ fontSize: 5.2, color: '#64748B', marginTop: 1 }}>
                      Date: {formatDate(packingListDate)} • {placeOfIssue}
                    </Text>
                  )}
                </View>

                <View style={styles.signatureBox}>
                  <Text style={styles.signatureRoleLabel}>
                    {documentType === 'packing_list' ? 'Received & Audited By Importer / Consignee' : 'Accepted & Confirmed By Buyer'}{"\n"}({documentType === 'packing_list' ? 'Consignee Verification' : 'Buyer Order Confirmation'})
                  </Text>
                  <View style={[styles.signatureSignLine, { borderStyle: 'dashed' }]} />
                  <Text style={styles.signatureTextName}>Authorized Consignee Signature & Stamp</Text>
                  <Text style={styles.signatureTextCompany}>
                    {[client.contact_name, client.company_name].filter(Boolean).join(' / ') || 'Authorized Consignee Representative'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Footer Page 2 */}
          <View style={styles.footer} wrap={false}>
            <View style={styles.footerCol1}>
              <Text style={styles.footerBrand}>SHESHAAN GLOBAL</Text>
              <Text style={styles.footerTagline}>EXPORTING GOODNESS WORLDWIDE</Text>
            </View>
            <View style={styles.footerDivider} />
            <View style={styles.footerCol2}>
              <View style={styles.footerCircleIcon}><FooterPinBadge /></View>
              <Text style={styles.footerText}>
                {shipper.address.replace(/\n/g, ', ')}
              </Text>
            </View>
            <View style={styles.footerDivider} />
            <View style={styles.footerCol3}>
              <View style={styles.footerCircleIcon}><FooterMailBadge /></View>
              <Text style={styles.footerText}>
                {shipper.contact_email}{"\n"}www.sheshaanglobal.com
              </Text>
            </View>
            <View style={styles.footerDivider} />
            <View style={styles.footerCol4}>
              <View style={styles.footerCircleIcon}><FooterPhoneBadge /></View>
              <Text style={styles.footerPhone}>+91 81499 09546</Text>
            </View>
          </View>
        </Page>
      )}
    </Document>
  );
};

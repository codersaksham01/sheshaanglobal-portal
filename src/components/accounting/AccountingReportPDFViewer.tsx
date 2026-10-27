'use client';

import React from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import { AccountingReportPDF } from './AccountingReportPDF';
import { AccountingRecord, AccountingSummary } from '../../lib/types';

export interface AccountingReportPDFViewerProps {
  records: AccountingRecord[];
  summary: AccountingSummary;
  dateRangeLabel: string;
  generatedBy?: string;
  reportRef?: string;
}

export function AccountingReportPDFViewer(props: AccountingReportPDFViewerProps) {
  return (
    <PDFViewer width="100%" height="100%" className="border-0">
      <AccountingReportPDF {...props} />
    </PDFViewer>
  );
}

export default AccountingReportPDFViewer;

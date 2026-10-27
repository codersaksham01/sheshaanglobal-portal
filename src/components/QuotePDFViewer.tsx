'use client';

import React from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import { QuotePDF } from './QuotePDF';
import { Quote } from '../lib/types';

export interface QuotePDFViewerProps {
  quote: Quote;
  documentType: 'quotation' | 'invoice' | 'packing_list';
}

export function QuotePDFViewer({ quote, documentType }: QuotePDFViewerProps) {
  return (
    <PDFViewer width="100%" height="100%" className="border border-slate-300 rounded shadow-sm bg-slate-50">
      <QuotePDF quote={quote} documentType={documentType} />
    </PDFViewer>
  );
}

export default QuotePDFViewer;

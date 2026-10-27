'use client';

import React from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { QuotesWorkspace } from '../../components/quotes/QuotesWorkspace';
import { FileCheck2 } from 'lucide-react';

export default function QuotesPage() {
  return (
    <PortalLayout
      activeTab="quotes"
      pageTitle="Quote Automation"
      pageIcon={<FileCheck2 className="h-4 w-4" />}
    >
      <QuotesWorkspace />
    </PortalLayout>
  );
}

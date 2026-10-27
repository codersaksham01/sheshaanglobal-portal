'use client';

import React from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { AccountingWorkspace } from '../../components/accounting/AccountingWorkspace';
import { Receipt } from 'lucide-react';

export default function AccountingPage() {
  return (
    <PortalLayout
      activeTab="accounting"
      pageTitle="Corporate Expenses & Accounts"
      pageIcon={<Receipt className="h-4 w-4" />}
    >
      <AccountingWorkspace />
    </PortalLayout>
  );
}

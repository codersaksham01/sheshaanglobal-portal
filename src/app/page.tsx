'use client';

import React from 'react';
import { PortalLayout } from '../components/portal/PortalLayout';
import { CrmWorkspace } from '../components/crm/CrmWorkspace';
import { KanbanSquare } from 'lucide-react';

export default function Home() {
  return (
    <PortalLayout
      activeTab="crm"
      pageTitle="Smart CRM Pipeline"
      pageIcon={<KanbanSquare className="h-4 w-4" />}
    >
      <CrmWorkspace />
    </PortalLayout>
  );
}

'use client';

import React from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { OverviewWorkspace } from '../../components/overview/OverviewWorkspace';
import { LayoutDashboard } from 'lucide-react';

export default function OverviewPage() {
  return (
    <PortalLayout
      activeTab="overview"
      pageTitle="Trade Command Center"
      pageIcon={<LayoutDashboard className="h-4 w-4" />}
    >
      <OverviewWorkspace />
    </PortalLayout>
  );
}

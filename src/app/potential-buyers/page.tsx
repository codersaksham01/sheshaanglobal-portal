'use client';

import React from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { PotentialBuyersWorkspace } from '../../components/potential-buyers/PotentialBuyersWorkspace';
import { Target } from 'lucide-react';

export default function PotentialBuyersPage() {
  return (
    <PortalLayout
      activeTab="potentialBuyers"
      pageTitle="Potential Buyers Directory"
      pageIcon={<Target className="h-4 w-4" />}
    >
      <PotentialBuyersWorkspace />
    </PortalLayout>
  );
}

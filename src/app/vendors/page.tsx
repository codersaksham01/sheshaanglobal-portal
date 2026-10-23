'use client';

import React from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { SuppliersWorkspace } from '../../components/suppliers/SuppliersWorkspace';
import { Building2 } from 'lucide-react';

export default function VendorsPage() {
  return (
    <PortalLayout
      activeTab="vendors"
      pageTitle="Suppliers & Agreement Management"
      pageIcon={<Building2 className="h-4 w-4" />}
    >
      <SuppliersWorkspace />
    </PortalLayout>
  );
}

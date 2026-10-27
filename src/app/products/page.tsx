'use client';

import React from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { ProductsWorkspace } from '../../components/products/ProductsWorkspace';
import { Package } from 'lucide-react';

export default function ProductsPage() {
  return (
    <PortalLayout
      activeTab="products"
      pageTitle="Products & SKU Catalog"
      pageIcon={<Package className="h-4 w-4" />}
    >
      <ProductsWorkspace />
    </PortalLayout>
  );
}

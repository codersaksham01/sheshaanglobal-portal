'use client';

import React from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { TemplatesWorkspace } from '../../components/templates/TemplatesWorkspace';
import { Mail } from 'lucide-react';

export default function TemplatesPage() {
  return (
    <PortalLayout
      activeTab="templates"
      pageTitle="Outreach & Message Templates"
      pageIcon={<Mail className="h-4 w-4" />}
    >
      <TemplatesWorkspace />
    </PortalLayout>
  );
}

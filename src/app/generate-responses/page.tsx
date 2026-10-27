'use client';

import React from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { GenerateResponsesWorkspace } from '../../components/generate-responses/GenerateResponsesWorkspace';
import { Send } from 'lucide-react';

export default function GenerateResponsesPage() {
  return (
    <PortalLayout
      activeTab="generateResponses"
      pageTitle="Buyer Response Generator"
      pageIcon={<Send className="h-4 w-4" />}
    >
      <GenerateResponsesWorkspace />
    </PortalLayout>
  );
}

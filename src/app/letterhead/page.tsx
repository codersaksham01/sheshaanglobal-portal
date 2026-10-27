'use client';

import React from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { LetterheadGenerator } from '../../components/LetterheadGenerator';
import { FileText } from 'lucide-react';

export default function LetterheadPage() {
  return (
    <PortalLayout
      activeTab="letterhead"
      pageTitle="Official Letterhead Generator"
      pageIcon={<FileText className="h-4 w-4" />}
    >
      <LetterheadGenerator />
    </PortalLayout>
  );
}

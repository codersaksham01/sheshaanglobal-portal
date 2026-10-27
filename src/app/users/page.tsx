'use client';

import React from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { UsersWorkspace } from '../../components/users/UsersWorkspace';
import { Lock } from 'lucide-react';

export default function UsersPage() {
  return (
    <PortalLayout
      activeTab="users"
      pageTitle="Users & Role Management"
      pageIcon={<Lock className="h-4 w-4" />}
    >
      <UsersWorkspace />
    </PortalLayout>
  );
}

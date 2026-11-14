'use client';

import { UserRound } from 'lucide-react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { ProfileWorkspace } from '../../components/profile/ProfileWorkspace';

export default function ProfilePage() {
  return <PortalLayout activeTab="profile" pageTitle="My Profile" pageIcon={<UserRound className="h-4 w-4"/>}><ProfileWorkspace /></PortalLayout>;
}

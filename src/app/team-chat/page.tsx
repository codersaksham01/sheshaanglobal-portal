'use client';

import { MessageCircle } from 'lucide-react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { TeamChatWorkspace } from '../../components/chat/TeamChatWorkspace';

export default function TeamChatPage() {
  return <PortalLayout activeTab="teamChat" pageTitle="Team Chat" pageIcon={<MessageCircle className="h-4 w-4"/>}><TeamChatWorkspace /></PortalLayout>;
}

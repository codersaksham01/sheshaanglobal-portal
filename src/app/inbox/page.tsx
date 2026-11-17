import { Inbox } from 'lucide-react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { TitanInboxWorkspace } from '../../components/inbox/TitanInboxWorkspace';

export default function Page() {
  return <PortalLayout activeTab="inbox" pageTitle="Unified Inbox" pageIcon={<Inbox className="h-4 w-4"/>}><TitanInboxWorkspace/></PortalLayout>;
}

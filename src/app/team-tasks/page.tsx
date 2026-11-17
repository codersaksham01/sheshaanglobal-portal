import { CheckSquare } from 'lucide-react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { TeamTasksWorkspace } from '../../components/tasks/TeamTasksWorkspace';

export default function Page() {
  return <PortalLayout activeTab="teamTasks" pageTitle="Team Tasks" pageIcon={<CheckSquare className="h-4 w-4"/>}><TeamTasksWorkspace/></PortalLayout>;
}

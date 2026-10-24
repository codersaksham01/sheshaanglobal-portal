import type { AppUser } from './types';

export type PortalRole = AppUser['role'];

export const roleTabs: Record<PortalRole, readonly string[]> = {
  Admin: ['overview', 'crm', 'potentialBuyers', 'quotes', 'templates', 'generateResponses', 'letterhead', 'products', 'vendors', 'users'],
  Sales: ['overview', 'crm', 'potentialBuyers', 'quotes', 'templates', 'generateResponses', 'letterhead', 'products'],
  Accounts: ['overview', 'quotes', 'letterhead'],
  Operations: ['overview', 'products', 'vendors', 'letterhead']
};

const tableArea: Record<string, string> = {
  clients: 'crm',
  leads: 'crm',
  activities: 'crm',
  quotes: 'quotes',
  quote_items: 'quotes',
  blogs: 'blogs',
  message_templates: 'templates',
  tasks: 'tasks',
  invoices: 'accounts',
  shipments: 'shipments',
  document_checklists: 'documents',
  products: 'products',
  vendors: 'vendors',
  freight_presets: 'freight',
  freight_rate_history: 'rates',
  app_users: 'users',
  activity_logs: 'auditLog',
  team_messages: 'teamChat'
};

export const canAccessTab = (role: PortalRole, tab: string) => {
  const allowed = (role && roleTabs[role]) || roleTabs.Admin;
  return allowed.includes(tab);
};
export const canManageTable = (role: PortalRole, table: string) => canAccessTab(role, tableArea[table] || 'users');

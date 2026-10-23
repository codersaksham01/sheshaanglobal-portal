import type { AppUser } from './types';

export type PortalRole = AppUser['role'];

export const roleTabs: Record<PortalRole, readonly string[]> = {
  Admin: ['overview', 'actionQueue', 'crm', 'potentialBuyers', 'dataSources', 'quotes', 'communications', 'templates', 'generateResponses', 'accounts', 'shipments', 'documents', 'products', 'vendors', 'freight', 'rates', 'analytics', 'users', 'auditLog', 'manager', 'letterhead'],
  Sales: ['overview', 'actionQueue', 'crm', 'potentialBuyers', 'dataSources', 'quotes', 'communications', 'templates', 'generateResponses', 'products', 'analytics', 'letterhead'],
  Accounts: ['overview', 'quotes', 'accounts', 'analytics', 'letterhead'],
  Operations: ['overview', 'shipments', 'documents', 'products', 'vendors', 'freight', 'rates', 'analytics', 'letterhead']
};

const tableArea: Record<string, string> = {
  clients: 'crm',
  leads: 'crm',
  activities: 'communications',
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

export const canAccessTab = (role: PortalRole, tab: string) => roleTabs[role].includes(tab);
export const canManageTable = (role: PortalRole, table: string) => canAccessTab(role, tableArea[table] || 'users');

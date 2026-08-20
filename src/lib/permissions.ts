import type { AppUser } from './types';

export type PortalRole = AppUser['role'];

export const roleTabs: Record<PortalRole, readonly string[]> = {
  Admin: ['overview', 'actionQueue', 'crm', 'dataSources', 'phoneReachout', 'quotes', 'communications', 'templates', 'tasks', 'accounts', 'shipments', 'documents', 'products', 'vendors', 'freight', 'rates', 'analytics', 'users', 'manager', 'letterhead'],
  Sales: ['overview', 'actionQueue', 'crm', 'dataSources', 'phoneReachout', 'quotes', 'communications', 'templates', 'tasks', 'products', 'analytics', 'letterhead'],
  Accounts: ['overview', 'quotes', 'tasks', 'accounts', 'analytics', 'letterhead'],
  Operations: ['overview', 'tasks', 'shipments', 'documents', 'products', 'vendors', 'freight', 'rates', 'analytics', 'letterhead']
};

const tableArea: Record<string, string> = {
  clients: 'crm',
  leads: 'crm',
  activities: 'communications',
  quotes: 'quotes',
  quote_items: 'quotes',
  message_templates: 'templates',
  tasks: 'tasks',
  invoices: 'accounts',
  shipments: 'shipments',
  document_checklists: 'documents',
  products: 'products',
  vendors: 'vendors',
  freight_presets: 'freight',
  freight_rate_history: 'rates',
  app_users: 'users'
};

export const canAccessTab = (role: PortalRole, tab: string) => roleTabs[role].includes(tab);
export const canManageTable = (role: PortalRole, table: string) => canAccessTab(role, tableArea[table] || 'users');

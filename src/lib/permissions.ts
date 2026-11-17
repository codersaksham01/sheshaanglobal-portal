import type { AppUser } from './types';

export type PortalRole = AppUser['role'];

export const roleTabs: Record<PortalRole, readonly string[]> = {
  Admin: ['overview', 'crm', 'potentialBuyers', 'quotes', 'accounting', 'paymentIntelligence', 'teamTasks', 'inbox', 'templates', 'generateResponses', 'letterhead', 'products', 'vendors', 'users', 'teamChat', 'profile'],
  Executive: ['overview', 'crm', 'potentialBuyers', 'quotes', 'accounting', 'paymentIntelligence', 'teamTasks', 'inbox', 'templates', 'generateResponses', 'letterhead', 'products', 'vendors', 'teamChat', 'profile'],
  Sales: ['overview', 'crm', 'potentialBuyers', 'quotes', 'teamTasks', 'inbox', 'templates', 'generateResponses', 'letterhead', 'products', 'teamChat', 'profile'],
  Accounts: ['overview', 'quotes', 'accounting', 'paymentIntelligence', 'teamTasks', 'letterhead', 'teamChat', 'profile'],
  Operations: ['overview', 'products', 'vendors', 'teamTasks', 'letterhead', 'teamChat', 'profile']
};

const tableArea: Record<string, string> = {
  clients: 'crm',
  leads: 'crm',
  activities: 'crm',
  quotes: 'quotes',
  quote_items: 'quotes',
  accounting_transactions: 'accounting',
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

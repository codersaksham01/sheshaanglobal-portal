'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Lock,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { getPortalCache, setPortalCache } from '../../lib/portalDataStore';
import { AppUser } from '../../lib/types';

const blankUser: Partial<AppUser> = {
  name: '',
  email: '',
  role: 'Sales',
  title: '',
  phone: '',
  status: 'Approved',
  active: true
};

export function UsersWorkspace() {
  const [users, setUsers] = useState<AppUser[]>(() => {
    return getPortalCache()?.users || [];
  });
  const [loading, setLoading] = useState(() => !getPortalCache()?.users?.length);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [editingUser, setEditingUser] = useState<Partial<AppUser> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('app_users').select('*').order('name');
      if (!error && data) {
        setUsers(data);
        setPortalCache({ users: data });
      }
    } catch (e) {
      console.warn('Failed to fetch users:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    let result = [...users];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.title?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== 'All') {
      result = result.filter((u) => u.role === roleFilter);
    }
    return result;
  }, [users, searchQuery, roleFilter]);

  const pendingUsers = useMemo(() => {
    return users.filter((u) => (u.status || (u.active ? 'Approved' : 'Pending')) === 'Pending');
  }, [users]);

  const handleOpenForm = (user?: AppUser) => {
    setEditingUser(user ? { ...user } : { ...blankUser });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingUser(null);
    setIsFormOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser?.name?.trim() || !editingUser?.email?.trim()) {
      alert('Name and email are required.');
      return;
    }

    setSaving(true);
    try {
      if (editingUser.id) {
        const { error } = await supabase.from('app_users').update(editingUser).eq('id', editingUser.id);
        if (error) throw error;
        setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? ({ ...u, ...editingUser } as AppUser) : u)));
        showToast('User record updated.');
      } else {
        const { data, error } = await supabase.from('app_users').insert([editingUser]).select().single();
        if (error) throw error;
        if (data) setUsers((prev) => [...prev, data]);
        showToast('New team member added.');
      }
      handleCloseForm();
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (user: AppUser, role: AppUser['role']) => {
    try {
      const patch = {
        role,
        status: 'Approved' as const,
        active: true,
        approved_by: 'Admin',
        approved_at: new Date().toISOString()
      };
      await supabase.from('app_users').update(patch).eq('id', user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...patch } : u)));
      showToast(`Approved ${user.name} as ${role}.`);
    } catch {
      alert('Failed to approve user.');
    }
  };

  const handleReject = async (user: AppUser) => {
    if (!confirm(`Reject access request for ${user.name}?`)) return;
    try {
      const patch = { status: 'Rejected' as const, active: false };
      await supabase.from('app_users').update(patch).eq('id', user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...patch } : u)));
      showToast(`Rejected request for ${user.name}.`);
    } catch {
      alert('Failed to reject user.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from portal users?`)) return;
    try {
      await supabase.from('app_users').delete().eq('id', id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      showToast('User removed.');
    } catch {
      alert('Failed to delete user.');
    }
  };

  return (
    <div className="space-y-5">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white shadow-2xl animate-fade-up">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Users & Role Permissions</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Manage administrative privileges, sales assignments, operations roles, and team approvals.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenForm()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-sm active:scale-95 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add User</span>
        </button>
      </div>

      {/* Pending Approvals Alert Banner */}
      {pendingUsers.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-700" />
            <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider">
              {pendingUsers.length} Pending Registration Request{pendingUsers.length > 1 ? 's' : ''}
            </h3>
          </div>
          <div className="space-y-2 mt-2">
            {pendingUsers.map((pu) => (
              <div key={pu.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-white border border-amber-200/80 shadow-2xs">
                <div>
                  <span className="font-extrabold text-xs text-slate-900 block">{pu.name}</span>
                  <span className="text-[11px] text-slate-500">{pu.email} {pu.title ? `| ${pu.title}` : ''}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-bold mr-1">Approve as:</span>
                  {(['Sales', 'Accounts', 'Operations', 'Admin'] as AppUser['role'][]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleApprove(pu, role)}
                      className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-black border border-emerald-200/60 transition"
                    >
                      {role}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleReject(pu)}
                    className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 text-[10px] font-black border border-rose-200/60 transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team members by name, email, designation, phone..."
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition text-xs"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        >
          <option value="All">All Roles</option>
          <option value="Admin">Admin</option>
          <option value="Sales">Sales</option>
          <option value="Accounts">Accounts</option>
          <option value="Operations">Operations</option>
        </select>
      </div>

      {/* Table */}
      {loading && users.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <RefreshCw className="h-7 w-7 animate-spin text-sky-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">Loading directory...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">No users match the criteria</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/50 text-[10px] uppercase font-black tracking-wider text-slate-500">
                <th className="py-3 px-4 font-black">Member</th>
                <th className="py-3 px-4 font-black">Email</th>
                <th className="py-3 px-4 font-black">Role</th>
                <th className="py-3 px-4 font-black">Status</th>
                <th className="py-3 px-4 font-black">Approval Audit</th>
                <th className="py-3 px-4 font-black text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const status = u.status || (u.active ? 'Approved' : 'Pending');
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition select-none">
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900">{u.name}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{u.title || u.phone || ''}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black border ${
                        u.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        u.role === 'Sales' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                        u.role === 'Accounts' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        status === 'Approved' ? 'bg-emerald-50 text-emerald-700' :
                        status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                        'bg-rose-50 text-rose-700'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] font-semibold">
                      {u.approved_by ? `By ${u.approved_by}` : 'System Registered'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenForm(u)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition"
                          title="Edit User"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(u.id, u.name)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Add / Edit User */}
      {isFormOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-panel-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-black text-slate-900">
                {editingUser.id ? 'Edit User Details' : 'Add New Team Member'}
              </h3>
              <button
                type="button"
                onClick={handleCloseForm}
                className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  placeholder="e.g. Sana Zeba Bakshi"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  placeholder="user@sheshaanglobal.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={editingUser.title || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, title: e.target.value })}
                    placeholder="e.g. Export Director"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Phone / Mobile
                  </label>
                  <input
                    type="text"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    placeholder="+91 98..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    System Role
                  </label>
                  <select
                    value={editingUser.role || 'Sales'}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as AppUser['role'] })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value="Admin">Admin (Full Access)</option>
                    <option value="Sales">Sales (CRM & Quotes)</option>
                    <option value="Accounts">Accounts (Expenses & P&L)</option>
                    <option value="Operations">Operations (Shipments & Docs)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Access Status
                  </label>
                  <select
                    value={editingUser.status || 'Approved'}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        status: e.target.value as AppUser['status'],
                        active: e.target.value === 'Approved'
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value="Approved">Approved (Active)</option>
                    <option value="Pending">Pending (Blocked)</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingUser.id ? 'Save Changes' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

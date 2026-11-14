'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, MapPin, Save, ShieldCheck, UserRound } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { usePortalIdentity } from '../AuthGate';
import { AppUser } from '../../lib/types';

type ProfileForm = Pick<AppUser, 'name' | 'phone' | 'title' | 'avatar_url' | 'address_line1' | 'city' | 'state' | 'country' | 'postal_code' | 'bio' | 'timezone'>;
const initial: ProfileForm = { name: '', phone: '', title: '', avatar_url: '', address_line1: '', city: '', state: '', country: '', postal_code: '', bio: '', timezone: 'Asia/Kolkata' };

function ProfileField({ label, name, value, onChange, placeholder }: { label: string; name: keyof ProfileForm; value: string; onChange: (key: keyof ProfileForm, value: string) => void; placeholder?: string }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</span><input value={value} onChange={(event) => onChange(name, event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-xl border border-emerald-100 bg-white/80 px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100/70"/></label>;
}

export function ProfileWorkspace() {
  const { email } = usePortalIdentity();
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [form, setForm] = useState<ProfileForm>(initial);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const change = (key: keyof ProfileForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const load = useCallback(async () => {
    const { data } = await supabase.from('app_users').select('*').eq('email', email.toLowerCase()).single();
    if (data) { setProfile(data as AppUser); setForm({ ...initial, ...(data as AppUser) }); }
  }, [email]);
  useEffect(() => { load(); }, [load]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setNotice('');
    try {
      let saved: AppUser | null = null;
      if (isSupabaseConfigured && typeof (supabase as any).rpc === 'function') {
        const { data, error } = await (supabase as any).rpc('update_my_portal_profile', { profile: form });
        if (error) throw error;
        saved = Array.isArray(data) ? data[0] : data;
      } else if (profile?.id) {
        const { data, error } = await supabase.from('app_users').update(form).eq('id', profile.id).select().single();
        if (error) throw error;
        saved = data as AppUser;
      }
      if (saved) setProfile(saved);
      if (typeof window !== 'undefined') localStorage.setItem('crixy_actor_name', form.name);
      setNotice('Profile saved successfully.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not save profile.'); }
    finally { setSaving(false); }
  };

  const avatarStyle = form.avatar_url ? { backgroundImage: `url(${form.avatar_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined;
  return <form onSubmit={save} className="profile-workspace mx-auto max-w-5xl space-y-4">
    <section className="profile-hero overview-hero rounded-2xl px-6 py-6"><div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div style={avatarStyle} className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-white/30 bg-white/15 text-xl font-black text-white">{form.avatar_url ? null : form.name.slice(0, 1).toUpperCase() || <UserRound/>}</div><div><p className="text-[11px] font-black uppercase tracking-widest text-emerald-100">Personal workspace</p><h1 className="mt-1 text-2xl font-black text-white">My profile</h1><p className="text-sm text-emerald-50">Keep your team identity and contact details up to date.</p></div></div><span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-2 text-xs font-bold text-white"><ShieldCheck className="h-4 w-4"/>{profile?.role || 'Portal member'}</span></div></section>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_310px]"><section className="premium-card rounded-2xl p-5"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-emerald-700"/><h2 className="text-sm font-black text-slate-950">Identity & contact</h2></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><ProfileField label="Full name" name="name" value={form.name} onChange={change}/><ProfileField label="Designation" name="title" value={form.title || ''} onChange={change} placeholder="Managing Director"/><ProfileField label="Phone" name="phone" value={form.phone || ''} onChange={change} placeholder="+91…"/><ProfileField label="Avatar URL" name="avatar_url" value={form.avatar_url || ''} onChange={change} placeholder="https://…"/><ProfileField label="Time zone" name="timezone" value={form.timezone || ''} onChange={change}/></div><label className="mt-4 block"><span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Bio</span><textarea value={form.bio || ''} onChange={(event) => change('bio', event.target.value)} rows={4} placeholder="A short professional introduction" className="w-full rounded-xl border border-emerald-100 bg-white/80 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100/70"/></label></section>
      <aside className="premium-card rounded-2xl p-5"><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-700"/><h2 className="text-sm font-black text-slate-950">Address</h2></div><div className="mt-5 space-y-4"><label className="block"><span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Work email</span><input value={email} disabled className="h-10 w-full rounded-xl border border-emerald-100 bg-slate-50 px-3 text-sm font-medium text-slate-500"/></label><ProfileField label="Address" name="address_line1" value={form.address_line1 || ''} onChange={change}/><ProfileField label="City" name="city" value={form.city || ''} onChange={change}/><ProfileField label="State" name="state" value={form.state || ''} onChange={change}/><ProfileField label="Country" name="country" value={form.country || ''} onChange={change}/><ProfileField label="Postal code" name="postal_code" value={form.postal_code || ''} onChange={change}/></div></aside></div>
    {notice && <div className={`flex items-center gap-2 rounded-xl p-3 text-xs font-bold ${notice.includes('success') ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}><CheckCircle2 className="h-4 w-4"/>{notice}</div>}
    <div className="flex justify-end"><button type="submit" disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#073f35] px-5 text-sm font-black text-white shadow-lg shadow-emerald-950/10 transition hover:bg-[#087f63] disabled:opacity-60"><Save className="h-4 w-4"/>{saving ? 'Saving…' : 'Save profile'}</button></div>
  </form>;
}

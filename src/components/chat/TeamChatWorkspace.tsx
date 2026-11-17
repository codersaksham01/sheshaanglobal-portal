'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CircleDot,
  CornerDownLeft,
  Hash,
  Loader2,
  LockKeyhole,
  Megaphone,
  MessageCircle,
  PackageSearch,
  RefreshCw,
  Send,
  Settings2,
  UsersRound,
  WalletCards
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { notifyCoreTeam } from '../../lib/portalNotifications';
import { usePortalIdentity } from '../AuthGate';
import { TeamMessage } from '../../lib/types';

type ChannelId =
  | 'company-announcements'
  | 'daily-operations'
  | 'sales-and-volza'
  | 'sourcing-and-logistics'
  | 'finance-and-approvals'
  | 'portal-development';

type Channel = {
  id: ChannelId;
  name: string;
  description: string;
  icon: typeof Megaphone;
  accent: string;
  activeClass: string;
};

const CHANNELS: Channel[] = [
  {
    id: 'company-announcements',
    name: 'company-announcements',
    description: 'Official updates, policies and decisions',
    icon: Megaphone,
    accent: 'text-violet-600 bg-violet-50',
    activeClass: 'bg-violet-50 text-violet-800 ring-1 ring-violet-100'
  },
  {
    id: 'daily-operations',
    name: 'daily-operations',
    description: 'Meetings, coordination, priorities and blockers',
    icon: UsersRound,
    accent: 'text-sky-600 bg-sky-50',
    activeClass: 'bg-sky-50 text-sky-800 ring-1 ring-sky-100'
  },
  {
    id: 'sales-and-volza',
    name: 'sales-and-volza',
    description: 'Buyer research, enquiries, outreach and follow-ups',
    icon: BarChart3,
    accent: 'text-cyan-600 bg-cyan-50',
    activeClass: 'bg-cyan-50 text-cyan-800 ring-1 ring-cyan-100'
  },
  {
    id: 'sourcing-and-logistics',
    name: 'sourcing-and-logistics',
    description: 'Suppliers, RFQs, loading, shipment and CHA updates',
    icon: PackageSearch,
    accent: 'text-amber-600 bg-amber-50',
    activeClass: 'bg-amber-50 text-amber-800 ring-1 ring-amber-100'
  },
  {
    id: 'finance-and-approvals',
    name: 'finance-and-approvals',
    description: 'Costing, margins, payment issues and approvals',
    icon: WalletCards,
    accent: 'text-rose-600 bg-rose-50',
    activeClass: 'bg-rose-50 text-rose-800 ring-1 ring-rose-100'
  },
  {
    id: 'portal-development',
    name: 'portal-development',
    description: 'CRM bugs, improvements, email sync and feature requests',
    icon: Settings2,
    accent: 'text-slate-600 bg-slate-100',
    activeClass: 'bg-slate-100 text-slate-800 ring-1 ring-slate-200'
  }
];

const DEFAULT_CHANNEL: ChannelId = 'daily-operations';
const ANNOUNCEMENT_ADMIN = 'info@sheshaanglobal.com';
const formatName = (value: string) => value.split(/[.\s_-]+/).filter(Boolean).map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ');

export function TeamChatWorkspace() {
  const { email } = usePortalIdentity();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [target, setTarget] = useState<ChannelId>(DEFAULT_CHANNEL);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const selectedChannel = CHANNELS.find((channel) => channel.id === target) || CHANNELS[1];
  const SelectedChannelIcon = selectedChannel.icon;
  const isAnnouncementEditor = email.trim().toLowerCase() === ANNOUNCEMENT_ADMIN;
  const channelIsReadOnly = target === 'company-announcements' && !isAnnouncementEditor;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: loadError } = await supabase
        .from('team_messages')
        .select('*')
        .order('created_at', { ascending: true });
      if (loadError) throw loadError;
      setMessages((data || []) as TeamMessage[]);
    } catch (loadError) {
      console.error('Unable to load team messages:', loadError);
      setError('Messages could not be loaded. Confirm that the Team Chat database migration has been applied.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visibleMessages = useMemo(
    () => messages.filter((message) => (message.channel || DEFAULT_CHANNEL) === target),
    [messages, target]
  );

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || channelIsReadOnly || sending) return;

    const payload = {
      id: `msg-${crypto.randomUUID()}`,
      sender_email: email,
      sender_name: email.split('@')[0].replaceAll('.', ' '),
      body,
      channel: target,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setSending(true);
    setError('');
    setDraft('');
    const { data, error: insertError } = await supabase.from('team_messages').insert([payload]).select().single();
    setSending(false);
    if (insertError) {
      console.error('Unable to send team message:', insertError);
      setDraft(body);
      setError('Message was not sent. Please try again.');
      return;
    }
    setMessages((current) => [...current, (data || payload) as TeamMessage]);
    await notifyCoreTeam({
      scope: `chat-${(data || payload).id}`,
      senderEmail: email,
      title: target === 'company-announcements' ? 'New company announcement' : `New message in #${selectedChannel.name}`,
      message: `${formatName(email.split('@')[0])}: ${body.slice(0, 160)}`,
      kind: 'message',
      href: '/team-chat'
    });
  };

  const submitOnEnter = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return <div className="team-chat-layout grid gap-4 xl:grid-cols-[330px_minmax(0,1fr)]">
    <aside className="team-chat-sidebar premium-card hidden rounded-2xl p-3 xl:block">
      <div className="flex items-center gap-3 px-2 py-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><MessageCircle className="h-5 w-5"/></span>
        <div><p className="text-sm font-black text-slate-950">Internal workspace</p><p className="text-[11px] font-semibold text-slate-500">Focused conversations for every team</p></div>
      </div>
      <div className="mx-2 mt-3 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-800">Channels</span><span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><CircleDot className="h-3 w-3"/>6 active</span></div>
      <nav aria-label="Internal chat channels" className="team-chat-channel-list mt-2 space-y-1.5">
        {CHANNELS.map((channel) => {
          const Icon = channel.icon;
          const active = target === channel.id;
          return <button type="button" key={channel.id} onClick={() => setTarget(channel.id)} aria-current={active ? 'page' : undefined} className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${active ? channel.activeClass : 'text-slate-600 hover:bg-slate-50'}`}>
            <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${channel.accent}`}><Icon className="h-4 w-4"/></span>
            <span className="min-w-0"><span className="block text-sm font-black leading-5">{channel.name}</span><span className="mt-0.5 block text-[11px] font-medium leading-4 text-slate-500">{channel.description}</span></span>
          </button>;
        })}
      </nav>
    </aside>

    <section className="team-chat-panel premium-card flex min-h-[620px] flex-col overflow-hidden rounded-2xl">
      <header className="border-b border-emerald-50 px-4 py-4 sm:px-5">
        <label className="mb-3 block xl:hidden"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Current channel</span><select value={target} onChange={(event) => setTarget(event.target.value as ChannelId)} className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100/70">{CHANNELS.map((channel) => <option key={channel.id} value={channel.id}># {channel.name}</option>)}</select></label>
        <div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${selectedChannel.accent}`}><SelectedChannelIcon className="h-5 w-5"/></span><div className="min-w-0"><h1 className="truncate text-base font-black text-slate-950"><Hash className="mr-0.5 inline h-4 w-4"/>{selectedChannel.name}</h1><p className="mt-0.5 text-xs font-medium text-slate-500">{selectedChannel.description}</p></div></div><div className="flex shrink-0 items-center gap-1.5"><span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 sm:inline-flex"><UsersRound className="h-3 w-3"/>Internal</span><button type="button" onClick={() => void load()} disabled={loading} className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-100 text-emerald-700 transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50" aria-label="Refresh messages" title="Refresh messages"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/></button></div></div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,rgba(247,253,250,0.72),rgba(255,255,255,0)_34%)] p-4 sm:p-5" role="log" aria-live="polite" aria-relevant="additions text" aria-label={`${selectedChannel.name} messages`}>
        {loading ? <div className="grid min-h-[300px] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-600"/><span className="sr-only">Loading messages</span></div> : error ? <div role="alert" className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm font-semibold text-amber-800">{error}</div> : visibleMessages.length ? visibleMessages.map((message) => {
          const own = message.sender_email.toLowerCase() === email.toLowerCase();
          const name = own ? 'You' : message.sender_name || formatName(message.sender_email.split('@')[0]);
          return <article key={message.id} className={`flex items-end gap-2.5 ${own ? 'justify-end' : ''}`}><span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-black ${own ? 'order-2 bg-emerald-700 text-white' : 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100'}`}>{name.slice(0, 1).toUpperCase()}</span><div className={`max-w-[84%] rounded-2xl px-3.5 py-3 shadow-sm sm:max-w-[72%] ${own ? 'bg-[#073f35] text-white' : 'border border-slate-100 bg-white text-slate-800'}`}><div className="flex items-center gap-2"><p className={`text-[10px] font-black ${own ? 'text-emerald-100' : 'text-emerald-700'}`}>{name}</p><p className={`text-[9px] ${own ? 'text-emerald-100/70' : 'text-slate-400'}`}>{message.created_at ? new Date(message.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''}</p></div><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5">{message.body}</p></div></article>;
        }) : <div className="grid min-h-[300px] place-items-center py-16 text-center"><div><span className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl ${selectedChannel.accent}`}><MessageCircle className="h-5 w-5"/></span><p className="mt-4 text-sm font-black text-slate-700">No messages in #{selectedChannel.name}</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-400">{channelIsReadOnly ? 'Company announcements are published by the portal administrator.' : 'Start a focused discussion with the team in this channel.'}</p></div></div>}
      </div>

      <form onSubmit={send} className="border-t border-emerald-50 bg-white/80 p-3 sm:p-4"><div className={`flex items-end gap-2 rounded-2xl border bg-white p-2 shadow-sm transition ${channelIsReadOnly ? 'border-slate-100 bg-slate-50' : 'border-emerald-100 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100/60'}`}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={submitOnEnter} rows={1} disabled={channelIsReadOnly || sending} aria-label={`Message ${selectedChannel.name}`} placeholder={channelIsReadOnly ? 'Only the portal administrator can post announcements.' : `Message #${selectedChannel.name}…`} className="max-h-28 min-h-11 flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:text-slate-400"/><button type="submit" disabled={!draft.trim() || channelIsReadOnly || sending} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#073f35] text-white shadow-sm transition hover:bg-[#087f63] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-40" aria-label="Send message"><Send className="h-4 w-4"/></button></div><div className="mt-2 flex items-center justify-between gap-3 px-1 text-[10px] font-medium text-slate-400"><span>{channelIsReadOnly ? <span className="inline-flex items-center gap-1"><LockKeyhole className="h-3 w-3"/>Read-only channel</span> : 'Enter to send · Shift + Enter for a new line'}</span>{sending && <span className="inline-flex items-center gap-1 text-emerald-700"><Loader2 className="h-3 w-3 animate-spin"/>Sending</span>}</div></form>
    </section>
  </div>;
}

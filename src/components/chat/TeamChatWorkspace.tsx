'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Hash, MessageCircle, Paperclip, Send, UsersRound } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { usePortalIdentity } from '../AuthGate';
import { AppUser, TeamMessage } from '../../lib/types';

const CHANNELS = ['Leadership', 'All Team', 'Operations'];

export function TeamChatWorkspace() {
  const { email } = usePortalIdentity();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [members, setMembers] = useState<AppUser[]>([]);
  const [target, setTarget] = useState('Leadership');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const isDirect = target.startsWith('dm:');
  const recipient = isDirect ? target.slice(3) : '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [messagesResult, usersResult] = await Promise.all([
        supabase.from('team_messages').select('*').order('created_at', { ascending: true }),
        supabase.from('app_users').select('*').eq('active', true).order('name')
      ]);
      setMessages((messagesResult.data || []) as TeamMessage[]);
      setMembers((usersResult.data || []) as AppUser[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleMessages = useMemo(() => messages.filter((message) => {
    if (isDirect) return [message.sender_email, message.recipient_email].includes(email) && [message.sender_email, message.recipient_email].includes(recipient);
    return !message.recipient_email && (message.channel || 'Leadership') === target;
  }), [messages, email, isDirect, recipient, target]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    const member = members.find((item) => item.email.toLowerCase() === email.toLowerCase());
    const payload = {
      id: `msg-${crypto.randomUUID()}`,
      sender_email: email,
      sender_name: member?.name || email.split('@')[0],
      body,
      channel: isDirect ? '' : target,
      recipient_email: recipient,
      read_by: [email],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setDraft('');
    const { data, error } = await supabase.from('team_messages').insert([payload]).select().single();
    if (error) {
      setDraft(body);
      return;
    }
    setMessages((current) => [...current, (data || payload) as TeamMessage]);
  };

  return <div className="team-chat-layout grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
    <aside className="team-chat-sidebar premium-card rounded-2xl p-3">
      <div className="flex items-center gap-2 px-2 py-2"><MessageCircle className="h-4 w-4 text-emerald-700"/><div><p className="text-sm font-black text-slate-950">Team chat</p><p className="text-[10px] font-semibold text-slate-500">Internal team messaging</p></div></div>
      <p className="mt-4 px-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Channels</p>
      <div className="team-chat-channel-list mt-2 space-y-1">{CHANNELS.map((channel) => <button type="button" key={channel} onClick={() => setTarget(channel)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold transition ${target === channel ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-50'}`}><Hash className="h-3.5 w-3.5"/>{channel}</button>)}</div>
      <p className="mt-5 px-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Direct messages</p>
      <div className="team-chat-member-list mt-2 space-y-1">{members.filter((member) => member.email !== email).map((member) => <button type="button" key={member.id} onClick={() => setTarget(`dm:${member.email}`)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition ${target === `dm:${member.email}` ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}><span className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-[10px] font-black text-white">{member.name.slice(0, 1)}</span><span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-700">{member.name}</span><span className="block text-[10px] text-slate-400">{member.title || member.role}</span></span></button>)}</div>
    </aside>
    <section className="team-chat-panel premium-card flex min-h-[560px] flex-col overflow-hidden rounded-2xl">
      <header className="flex items-center justify-between border-b border-emerald-50 px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">{isDirect ? <MessageCircle className="h-4 w-4"/> : <Hash className="h-4 w-4"/>}</span><div><h1 className="text-sm font-black text-slate-950">{isDirect ? members.find((member) => member.email === recipient)?.name || recipient : target}</h1><p className="text-[11px] font-semibold text-slate-500">{isDirect ? 'Direct conversation' : 'Shared team channel'}</p></div></div><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700"><UsersRound className="h-3 w-3"/>{members.length} members</span></header>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">{loading ? <p className="text-sm font-semibold text-slate-400">Loading conversations…</p> : visibleMessages.length ? visibleMessages.map((message) => { const own = message.sender_email === email; return <div key={message.id} className={`flex gap-2 ${own ? 'justify-end' : ''}`}><div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${own ? 'bg-[#073f35] text-white' : 'bg-slate-50 text-slate-800'}`}><p className={`text-[10px] font-black ${own ? 'text-emerald-100' : 'text-emerald-700'}`}>{own ? 'You' : message.sender_name}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-5">{message.body}</p><p className={`mt-1 text-[9px] ${own ? 'text-emerald-100/70' : 'text-slate-400'}`}>{message.created_at ? new Date(message.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''}</p></div></div>; }) : <div className="grid h-full place-items-center py-24 text-center"><div><MessageCircle className="mx-auto h-8 w-8 text-emerald-300"/><p className="mt-3 text-sm font-bold text-slate-600">Start the conversation</p><p className="mt-1 text-xs text-slate-400">Use a shared channel or begin a direct conversation.</p></div></div>}</div>
      <form onSubmit={send} className="border-t border-emerald-50 p-3"><div className="flex items-end gap-2 rounded-2xl border border-emerald-100 bg-white p-2 focus-within:border-emerald-300"><button type="button" className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-emerald-50 hover:text-emerald-700" aria-label="Attachments coming soon"><Paperclip className="h-4 w-4"/></button><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={1} placeholder={`Message ${isDirect ? members.find((member) => member.email === recipient)?.name || 'team member' : `#${target.toLowerCase().replaceAll(' ', '-')}`}…`} className="max-h-28 min-h-9 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm outline-none"/><button type="submit" disabled={!draft.trim()} className="grid h-9 w-9 place-items-center rounded-xl bg-[#073f35] text-white transition hover:bg-[#087f63] disabled:opacity-40" aria-label="Send message"><Send className="h-4 w-4"/></button></div></form>
    </section>
  </div>;
}

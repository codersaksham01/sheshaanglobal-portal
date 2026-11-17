'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Inbox, Loader2, Mail, PenLine, RefreshCw, Send, Settings2, UserRound, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { MailboxMessage } from '../../lib/types';

type TitanStatus = { configured: boolean; mailbox: string | null; incoming: string; outgoing: string };

const formatDate = (value: string) => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const senderInitial = (message: MailboxMessage) => (message.sender_name || message.sender_email || '?').trim().slice(0, 1).toUpperCase();

export function TitanInboxWorkspace() {
  const [messages, setMessages] = useState<MailboxMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [status, setStatus] = useState<TitanStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [notice, setNotice] = useState('');

  const token = useCallback(async () => (await supabase.auth.getSession()).data.session?.access_token || '', []);
  const headers = useCallback(async () => ({ Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' }), [token]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, configResponse] = await Promise.all([
      supabase.from('mailbox_messages').select('*').order('received_at', { ascending: false }).limit(100),
      fetch('/api/mail/titan', { headers: { Authorization: `Bearer ${await token()}` } })
    ]);
    const config = await configResponse.json().catch(() => null);
    if (configResponse.ok) setStatus(config as TitanStatus);
    if (error) setNotice('Run the Titan mailbox SQL migration before loading messages.');
    setMessages((data || []) as MailboxMessage[]);
    setLoading(false);
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const selected = useMemo(() => messages.find((message) => message.id === selectedId) || messages[0], [messages, selectedId]);

  const sync = async () => {
    setSyncing(true);
    setNotice('');
    try {
      const response = await fetch('/api/mail/titan', { method: 'POST', headers: await headers(), body: JSON.stringify({ action: 'sync' }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not sync Titan inbox.');
      setNotice(`Inbox synchronised: ${result.synced || 0} recent messages checked, including message content.`);
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not sync Titan inbox.');
    } finally { setSyncing(false); }
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice('');
    const response = await fetch('/api/mail/titan', { method: 'POST', headers: await headers(), body: JSON.stringify({ action: 'send', to: recipient, subject, text: body }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setNotice(result.error || 'Could not send Titan email.'); return; }
    setComposeOpen(false); setRecipient(''); setSubject(''); setBody(''); setNotice('Email sent from the shared Titan mailbox.'); await load();
  };

  return <div className="inbox-workspace space-y-4">
    <section className="overview-hero relative overflow-hidden rounded-2xl px-5 py-5 sm:px-7">
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black tracking-widest text-emerald-100">TITAN UNIFIED INBOX</p><h1 className="mt-1 text-2xl font-black text-white">Shared mailbox, connected to trade operations.</h1><p className="mt-2 max-w-2xl text-sm font-medium text-emerald-50">Review customer messages, reply from the company mailbox, and retain a searchable operational trail.</p></div><div className="flex gap-2"><button type="button" onClick={() => setComposeOpen(true)} disabled={!status?.configured} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-emerald-900 transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"><PenLine className="h-4 w-4"/>Compose</button><button type="button" onClick={sync} disabled={!status?.configured || syncing} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 text-xs font-black text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60">{syncing ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}Sync now</button></div></div>
    </section>

    {!status?.configured && <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><Settings2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"/><div><p className="text-sm font-black">Titan is ready to be connected</p><p className="mt-1 text-xs leading-5 text-amber-800">Add the server-only Titan variables to <code>.env.local</code>, enable third-party email access in Titan, and restart the portal. The password never reaches the browser.</p></div></section>}
    {status?.configured && <section className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4"/>Connected as {status.mailbox} · IMAP {status.incoming}</section>}
    {notice && <p role="status" className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"><AlertCircle className="h-4 w-4"/>{notice}</p>}

    <section className="premium-card grid min-h-[620px] overflow-hidden rounded-2xl lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="border-b border-slate-100 lg:border-b-0 lg:border-r"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-4"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Inbox className="h-4 w-4"/></span><div><h2 className="text-sm font-black text-slate-900">Inbox</h2><p className="text-[10px] font-semibold text-slate-400">Latest synced messages</p></div></div><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">{messages.length}</span></div><div className="max-h-[540px] overflow-y-auto">{loading ? <div className="grid place-items-center py-16"><Loader2 className="h-5 w-5 animate-spin text-emerald-700"/></div> : messages.length ? messages.map((message) => <button type="button" onClick={() => setSelectedId(message.id)} key={message.id} aria-pressed={selected?.id === message.id} className={`block w-full border-b border-slate-100 px-4 py-3.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-emerald-600 ${selected?.id === message.id ? 'bg-emerald-50/80' : 'hover:bg-slate-50'}`}><div className="flex items-start gap-2.5"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-black ${selected?.id === message.id ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}`}>{senderInitial(message)}</span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><span className="truncate text-xs font-black text-slate-800">{message.sender_name || message.sender_email || 'Unknown sender'}</span><span className="shrink-0 text-[9px] font-semibold text-slate-400">{new Date(message.received_at).toLocaleDateString()}</span></span><span className="mt-1 block truncate text-xs font-bold text-slate-700">{message.subject}</span><span className="mt-1 line-clamp-2 block text-[11px] leading-4 text-slate-500">{message.preview || 'No preview available'}</span></span></div></button>) : <div className="px-5 py-16 text-center"><Mail className="mx-auto h-7 w-7 text-emerald-200"/><p className="mt-3 text-xs font-bold text-slate-500">No mailbox records yet</p><p className="mt-1 text-[11px] text-slate-400">Connect Titan and run a sync.</p></div>}</div></aside>
      <article className="flex min-w-0 flex-col">{selected ? <><header className="border-b border-slate-100 bg-white/70 px-5 py-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><UserRound className="h-4 w-4"/></span><div className="min-w-0 flex-1"><h2 className="text-base font-black leading-6 text-slate-950">{selected.subject}</h2><p className="mt-2 truncate text-xs font-bold text-slate-700">{selected.sender_name ? `${selected.sender_name} · ` : ''}{selected.sender_email}</p><p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-slate-400"><Clock3 className="h-3 w-3"/>{formatDate(selected.received_at)} · {selected.folder}</p></div></div></header><div className="mailbox-message-body flex-1 whitespace-pre-wrap p-5 text-sm leading-7 text-slate-700">{selected.body_text || selected.preview || 'No saved body is available for this earlier sync. Select “Sync now” to retrieve message content from Titan.'}</div></> : <div className="grid flex-1 place-items-center p-8 text-center"><div><Mail className="mx-auto h-9 w-9 text-emerald-200"/><p className="mt-3 text-sm font-black text-slate-700">Select a message</p><p className="mt-1 text-xs text-slate-400">Your synced Titan email will appear here.</p></div></div>}</article>
    </section>

    {composeOpen && <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/40 p-4"><form onSubmit={send} className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-sm font-black text-slate-950">New Titan email</p><p className="text-[11px] font-semibold text-slate-400">Sent from {status?.mailbox}</p></div><button type="button" onClick={() => setComposeOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600" aria-label="Close compose window"><X className="h-4 w-4"/></button></div><label className="mt-5 block text-xs font-black text-slate-700">To<input required type="email" value={recipient} onChange={(event) => setRecipient(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100/70"/></label><label className="mt-3 block text-xs font-black text-slate-700">Subject<input required value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100/70"/></label><label className="mt-3 block text-xs font-black text-slate-700">Message<textarea required value={body} onChange={(event) => setBody(event.target.value)} rows={8} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100/70"/></label><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setComposeOpen(false)} className="h-10 rounded-xl px-4 text-xs font-black text-slate-600 hover:bg-slate-100">Cancel</button><button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#073f35] px-4 text-xs font-black text-white hover:bg-[#087f63]"><Send className="h-4 w-4"/>Send email</button></div></form></div>}
  </div>;
}

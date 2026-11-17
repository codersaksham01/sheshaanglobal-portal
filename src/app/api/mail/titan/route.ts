import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const titanConfig = () => ({
  email: process.env.TITAN_EMAIL || '',
  password: process.env.TITAN_PASSWORD || '',
  // This portal uses GoDaddy Professional Email powered by Titan. Standard
  // Titan customers can still override these values in their server env.
  imapHost: process.env.TITAN_IMAP_HOST || 'imap.secureserver.net',
  imapPort: Number(process.env.TITAN_IMAP_PORT || 993),
  smtpHost: process.env.TITAN_SMTP_HOST || 'smtpout.secureserver.net',
  smtpPort: Number(process.env.TITAN_SMTP_PORT || 465)
});

const configured = () => {
  const config = titanConfig();
  return Boolean(projectUrl && publishableKey && config.email && config.password);
};

const decodeQuotedPrintable = (value: string) => value
  .replace(/=\r?\n/g, '')
  .replace(/=([A-F\d]{2})/gi, (_match, hex) => String.fromCharCode(parseInt(hex, 16)));

const decodeMimeText = (value: string, encoding = '') => {
  const normalizedEncoding = encoding.toLowerCase();
  try {
    if (normalizedEncoding.includes('base64')) return Buffer.from(value.replace(/\s/g, ''), 'base64').toString('utf8');
    if (normalizedEncoding.includes('quoted-printable')) return decodeQuotedPrintable(value);
  } catch {
    // A malformed mail part should not stop the complete mailbox sync.
  }
  return value;
};

const stripEmailHtml = (value: string) => value
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])\b[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const getPartText = (part: string) => {
  const separator = part.search(/\r?\n\r?\n/);
  if (separator < 0) return '';
  const headers = part.slice(0, separator);
  const content = part.slice(separator).trim();
  const transferEncoding = headers.match(/content-transfer-encoding:\s*([^;\r\n]+)/i)?.[1] || '';
  return decodeMimeText(content, transferEncoding).trim();
};

// Keep a plain, safe body in the portal. Titan content is never injected as
// HTML, avoiding scripts, tracking markup, and layout breakage in the app.
const extractEmailBody = (source: Buffer | undefined) => {
  if (!source?.length) return '';
  const raw = source.toString('utf8');
  const headerEnd = raw.search(/\r?\n\r?\n/);
  if (headerEnd < 0) return '';
  const headers = raw.slice(0, headerEnd);
  const body = raw.slice(headerEnd).trim();
  const boundary = headers.match(/boundary=["']?([^"';\r\n]+)/i)?.[1];
  const parts = boundary ? body.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:--)?\\r?\\n`, 'i')) : [raw];
  const textPart = parts.find((part) => /content-type:\s*text\/plain/i.test(part));
  const htmlPart = parts.find((part) => /content-type:\s*text\/html/i.test(part));
  const selected = textPart || htmlPart || raw;
  const text = getPartText(selected);
  const selectedIsHtml = Boolean((htmlPart && selected === htmlPart) || (!boundary && /content-type:\s*text\/html/i.test(headers)));
  return (selectedIsHtml ? stripEmailHtml(text) : text).slice(0, 200_000);
};

async function portalClient(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token || !projectUrl || !publishableKey) return null;

  const client = createClient(projectUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) return null;
  const { data: profile } = await client
    .from('app_users')
    .select('id, active')
    .eq('auth_user_id', userData.user.id)
    .eq('active', true)
    .maybeSingle();
  return profile ? client : null;
}

export async function GET(request: Request) {
  const client = await portalClient(request);
  if (!client) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const config = titanConfig();
  return NextResponse.json({
    configured: configured(),
    mailbox: config.email || null,
    incoming: `${config.imapHost}:${config.imapPort}`,
    outgoing: `${config.smtpHost}:${config.smtpPort}`
  });
}

export async function POST(request: Request) {
  const client = await portalClient(request);
  if (!client) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!configured()) return NextResponse.json({ error: 'Titan is not configured on this server.' }, { status: 409 });

  const body = await request.json().catch(() => ({}));
  const config = titanConfig();

  if (body.action === 'sync') {
    const imap = new ImapFlow({
      host: config.imapHost,
      port: config.imapPort,
      secure: true,
      auth: { user: config.email, pass: config.password },
      logger: false
    });
    let phase = 'connecting to Titan';
    try {
      await imap.connect();
      phase = 'opening the INBOX folder';
      const lock = await imap.getMailboxLock('INBOX');
      try {
        phase = 'reading mailbox headers';
        const status = await imap.status('INBOX', { messages: true });
        const messageCount = typeof status === 'object' ? status.messages || 0 : 0;
        const start = Math.max(1, messageCount - 59);
        const records: Record<string, unknown>[] = [];
        for await (const message of imap.fetch(`${start}:*`, { uid: true, envelope: true, flags: true, internalDate: true, bodyStructure: true, source: true })) {
          const sender = message.envelope?.from?.[0];
          const recipients = (message.envelope?.to || []).map((recipient) => recipient.address).filter(Boolean);
          const bodyText = extractEmailBody(message.source);
          records.push({
            external_id: `titan-inbox-${message.uid}`,
            folder: 'INBOX',
            sender_name: sender?.name || '',
            sender_email: sender?.address || '',
            recipient_emails: recipients,
            subject: message.envelope?.subject || '(No subject)',
            preview: bodyText.replace(/\s+/g, ' ').trim().slice(0, 240) || message.envelope?.subject || '',
            body_text: bodyText,
            received_at: message.internalDate ? new Date(message.internalDate).toISOString() : new Date().toISOString(),
            is_read: !message.flags?.has('\\Seen'),
            has_attachments: Boolean(message.bodyStructure?.childNodes?.some((node) => node.disposition === 'attachment'))
          });
        }
        if (records.length) {
          const { error } = await client.from('mailbox_messages').upsert(records, { onConflict: 'external_id' });
          if (error) throw error;
        }
        return NextResponse.json({ synced: records.length });
      } finally {
        lock.release();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Titan inbox sync failed.';
      return NextResponse.json({ error: `Titan sync failed while ${phase}: ${message}` }, { status: 502 });
    } finally {
      await imap.logout().catch(() => {});
    }
  }

  if (body.action === 'send') {
    const to = String(body.to || '').trim();
    const subject = String(body.subject || '').trim();
    const text = String(body.text || '').trim();
    if (!/^\S+@\S+\.\S+$/.test(to) || !subject || !text) {
      return NextResponse.json({ error: 'Recipient, subject, and message are required.' }, { status: 400 });
    }
    try {
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: { user: config.email, pass: config.password }
      });
      const sent = await transporter.sendMail({ from: config.email, to, subject, text });
      await client.from('mailbox_messages').upsert({
        external_id: `titan-sent-${sent.messageId}`,
        folder: 'Sent',
        sender_name: 'Sheshaan Global',
        sender_email: config.email,
        recipient_emails: [to],
        subject,
        preview: text.slice(0, 240),
        body_text: text,
        received_at: new Date().toISOString(),
        is_read: true,
        has_attachments: false
      }, { onConflict: 'external_id' });
      return NextResponse.json({ sent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Titan could not send this email.';
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  return NextResponse.json({ error: 'Unsupported mailbox action.' }, { status: 400 });
}

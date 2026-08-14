import { createHmac, timingSafeEqual } from 'crypto';

export const sessionCookieName = 'sheshaan_portal_session';
export const sessionMaxAgeSeconds = 60 * 60 * 12;

const sessionSecret = () => process.env.APP_SESSION_SECRET || process.env.APP_LOGIN_PASSWORD || '';

export const createSessionToken = () => {
  const issuedAt = Date.now().toString();
  const signature = createHmac('sha256', sessionSecret()).update(issuedAt).digest('hex');
  return `${issuedAt}.${signature}`;
};

export const verifySessionToken = (token?: string) => {
  if (!token || !sessionSecret()) return false;
  const [issuedAt, signature] = token.split('.');
  if (!issuedAt || !signature || !/^\d+$/.test(issuedAt)) return false;
  if (Date.now() - Number(issuedAt) > sessionMaxAgeSeconds * 1000) return false;

  const expected = createHmac('sha256', sessionSecret()).update(issuedAt).digest('hex');
  const suppliedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
};

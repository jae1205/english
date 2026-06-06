const crypto = require('crypto');

const COOKIE_NAME = 'anki_auth';
const SESSION_VALUE = 'ok';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function getPassword() {
  return process.env.APP_PASSWORD;
}

function getSecret() {
  return process.env.APP_AUTH_SECRET || getPassword();
}

function sign(value) {
  const secret = getSecret();
  if (!secret) return null;

  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function timingSafeEqualString(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createSessionCookie() {
  const signature = sign(SESSION_VALUE);
  if (!signature) return null;

  return [
    `${COOKIE_NAME}=${SESSION_VALUE}.${signature}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${SESSION_MAX_AGE}`,
  ].join('; ');
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function parseCookies(cookieHeader) {
  return Object.fromEntries(
    String(cookieHeader || '')
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf('=');
        return index === -1 ? [item, ''] : [item.slice(0, index), decodeURIComponent(item.slice(index + 1))];
      })
  );
}

function hasValidSession(req) {
  const sessionCookie = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (!sessionCookie) return false;

  const [value, signature] = sessionCookie.split('.');
  const expectedSignature = sign(value);

  return value === SESSION_VALUE && Boolean(signature) && expectedSignature === signature;
}

function isPasswordConfigured() {
  return Boolean(getPassword());
}

function isPasswordValid(password) {
  const configuredPassword = getPassword();
  if (!configuredPassword || typeof password !== 'string') return false;

  return timingSafeEqualString(password, configuredPassword);
}

module.exports = {
  clearSessionCookie,
  createSessionCookie,
  hasValidSession,
  isPasswordConfigured,
  isPasswordValid,
};

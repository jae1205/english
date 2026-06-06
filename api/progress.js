const STORE_KEY = process.env.PROGRESS_SYNC_KEY || 'hackers-transfer-750:progress:v1';
const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const ACCESS_TOKEN = process.env.PROGRESS_SYNC_TOKEN;
const { hasValidSession, isPasswordConfigured } = require('./_auth');

function sendJson(res, status, body) {
  res.status(status);
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.json(body);
}

function setCorsHeaders(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,PUT,DELETE,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type,x-progress-sync-token');
}

function isAuthorized(req) {
  if (isPasswordConfigured() && hasValidSession(req)) return true;
  if (ACCESS_TOKEN && req.headers['x-progress-sync-token'] === ACCESS_TOKEN) return true;
  return !isPasswordConfigured() && !ACCESS_TOKEN;
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'string') return JSON.parse(body);
  return body;
}

async function redisCommand(command) {
  if (!REST_URL || !REST_TOKEN) {
    const error = new Error('Progress sync database is not configured');
    error.code = 'SYNC_NOT_CONFIGURED';
    throw error;
  }

  const response = await fetch(REST_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${REST_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || `Redis REST error: ${response.status}`);
  }

  return data.result;
}

function normalizeSnapshot(snapshot) {
  if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.cardProgress)) {
    throw new Error('Invalid progress snapshot');
  }

  return {
    version: 1,
    updatedAt: Date.now(),
    cardProgress: snapshot.cardProgress,
    reviewLogs: Array.isArray(snapshot.reviewLogs) ? snapshot.reviewLogs : [],
  };
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (!isAuthorized(req)) {
    sendJson(res, 401, { ok: false, error: 'Unauthorized' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const value = await redisCommand(['GET', STORE_KEY]);
      sendJson(res, 200, {
        ok: true,
        snapshot: value ? JSON.parse(value) : null,
      });
      return;
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const body = parseBody(req.body);
      const snapshot = normalizeSnapshot(body.snapshot);
      await redisCommand(['SET', STORE_KEY, JSON.stringify(snapshot)]);
      sendJson(res, 200, { ok: true, updatedAt: snapshot.updatedAt });
      return;
    }

    if (req.method === 'DELETE') {
      await redisCommand(['DEL', STORE_KEY]);
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (error) {
    if (error.code === 'SYNC_NOT_CONFIGURED') {
      sendJson(res, 503, {
        ok: false,
        error: 'Set KV_REST_API_URL and KV_REST_API_TOKEN on Vercel to enable progress sync.',
      });
      return;
    }

    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

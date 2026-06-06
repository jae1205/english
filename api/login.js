const {
  createSessionCookie,
  isPasswordConfigured,
  isPasswordValid,
} = require('./_auth');

function sendJson(res, status, body) {
  res.status(status);
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.json(body);
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'string') return JSON.parse(body);
  return body;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  if (!isPasswordConfigured()) {
    sendJson(res, 503, { ok: false, error: 'Set APP_PASSWORD on Vercel to enable password protection.' });
    return;
  }

  try {
    const body = parseBody(req.body);
    if (!isPasswordValid(body.password)) {
      sendJson(res, 401, { ok: false, error: 'Invalid password' });
      return;
    }

    const cookie = createSessionCookie();
    if (!cookie) {
      sendJson(res, 503, { ok: false, error: 'Password protection is not configured.' });
      return;
    }

    res.setHeader('set-cookie', cookie);
    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: 'Invalid request' });
  }
};

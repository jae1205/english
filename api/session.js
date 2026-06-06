const { hasValidSession, isPasswordConfigured } = require('./_auth');

function sendJson(res, status, body) {
  res.status(status);
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.json(body);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  if (!isPasswordConfigured()) {
    sendJson(res, 503, { ok: false, error: 'Set APP_PASSWORD on Vercel to enable password protection.' });
    return;
  }

  sendJson(res, hasValidSession(req) ? 200 : 401, {
    ok: hasValidSession(req),
  });
};

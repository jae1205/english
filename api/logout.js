const { clearSessionCookie } = require('./_auth');

function sendJson(res, status, body) {
  res.status(status);
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.json(body);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  res.setHeader('set-cookie', clearSessionCookie());
  sendJson(res, 200, { ok: true });
};

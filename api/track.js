// POST /api/track  { event: 'pageview'|'agendar_click', path?, vid }  → contadores anónimos en Vercel KV
// Público, sin autenticación; vid es un UUID anónimo generado en el navegador (localStorage, sin cookies ni PII).
const { kvReady, kvIncr, kvPfadd } = require('./_kv');

const RATE_PER_MIN = Number(process.env.TRACK_RATE_PER_MIN || 60);
const EVENTOS = new Set(['pageview', 'agendar_click']);

const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 60000;
  const list = (hits.get(ip) || []).filter(t => now - t < win);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > RATE_PER_MIN;
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}

function hoy() { return new Date().toISOString().slice(0, 10); }

module.exports = async (req, res) => {
  if (req.method === 'GET') return res.status(200).json({ ok: kvReady() });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!kvReady()) return res.status(204).end(); // no configurado todavía: no es un error del cliente

  const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'anon').split(',')[0].trim();
  if (limited(ip)) return res.status(429).end();

  const body = readBody(req);
  const event = String(body.event || '');
  if (!EVENTOS.has(event)) return res.status(400).json({ error: 'Evento no permitido' });
  const vid = String(body.vid || '').slice(0, 80) || ip;

  try {
    if (event === 'pageview') {
      await Promise.all([
        kvIncr('stats:pageviews:total'),
        kvIncr('stats:pageviews:' + hoy()),
        kvPfadd('stats:uniques:total', vid),
        kvPfadd('stats:uniques:' + hoy(), vid)
      ]);
    } else if (event === 'agendar_click') {
      await kvIncr('stats:clicks:agendar:total');
    }
    return res.status(204).end();
  } catch (e) {
    console.error('track', e);
    return res.status(204).end(); // nunca romper la navegación del visitante por un fallo de analítica
  }
};

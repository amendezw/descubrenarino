// POST /api/track  { event: 'pageview'|'agendar_click'|'click_zona', path?, vid, zona? }  → contadores anónimos en Vercel KV
// Público, sin autenticación; vid es un UUID anónimo generado en el navegador (localStorage, sin cookies ni PII).
// El país, la ciudad y la ubicación aproximada vienen de los headers de geolocalización que Vercel agrega
// automáticamente a cada request (x-vercel-ip-*); no se guarda la IP del visitante.
const { kvReady, kvIncr, kvPfadd, kvZincrby, kvHset } = require('./_kv');

const RATE_PER_MIN = Number(process.env.TRACK_RATE_PER_MIN || 60);
const EVENTOS = new Set(['pageview', 'agendar_click', 'click_zona']);

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

// Agrupa cualquier ruta del sitio en una de las 4 secciones conocidas (sirve para "secciones con más tráfico" y para
// darle contexto a cada clic por zona).
function seccionDe(path) {
  const p = String(path || '/').toLowerCase();
  if (p === '/' || p === '' || /\/index(\.html)?\/?$/.test(p)) return 'portada';
  if (/\/app(\.html)?\/?$/.test(p)) return 'app';
  if (/\/gobierno(\.html)?\/?$/.test(p)) return 'gobierno';
  if (/\/prestador(\.html)?\/?$/.test(p)) return 'prestador';
  return 'otro';
}

const ZONA_RE = /^[a-z0-9_]{1,50}$/;

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
  const seccion = seccionDe(body.path);

  try {
    if (event === 'pageview') {
      const tareas = [
        kvIncr('stats:pageviews:total'),
        kvIncr('stats:pageviews:' + hoy()),
        kvPfadd('stats:uniques:total', vid),
        kvPfadd('stats:uniques:' + hoy(), vid),
        kvZincrby('stats:secciones:rank', 1, seccion)
      ];

      const pais = req.headers['x-vercel-ip-country'];
      if (pais) {
        let ciudad = req.headers['x-vercel-ip-city'];
        try { ciudad = ciudad ? decodeURIComponent(ciudad) : ''; } catch (e) { ciudad = ''; }
        const lat = req.headers['x-vercel-ip-latitude'];
        const lng = req.headers['x-vercel-ip-longitude'];
        const paisCod = String(pais).slice(0, 5);
        tareas.push(kvZincrby('stats:geo:paises:rank', 1, paisCod));
        if (ciudad) {
          const clave = ciudad.slice(0, 80) + ', ' + paisCod;
          tareas.push(kvZincrby('stats:geo:ciudades:rank', 1, clave));
          if (lat && lng) tareas.push(kvHset('stats:geo:latlng', clave, lat + ',' + lng));
        }
      }

      await Promise.all(tareas);
    } else if (event === 'agendar_click') {
      await kvIncr('stats:clicks:agendar:total');
    } else if (event === 'click_zona') {
      const zona = String(body.zona || '').slice(0, 50);
      if (ZONA_RE.test(zona)) await kvZincrby('stats:zonas:rank', 1, seccion + ':' + zona);
    }
    return res.status(204).end();
  } catch (e) {
    console.error('track', e);
    return res.status(204).end(); // nunca romper la navegación del visitante por un fallo de analítica
  }
};

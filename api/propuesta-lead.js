// POST /api/propuesta-lead  { nombre, email, entidad, rol, web }  → envía el link de descarga por correo
// GET  /api/propuesta-lead  → { ok }  (diagnóstico: Resend + KV + PDF configurados)
const crypto = require('crypto');
const { kvReady, kvGetJSON, kvSetJSON, kvZadd, kvIncr } = require('./_kv');

const RATE_PER_MIN = Number(process.env.PROPUESTA_RATE_PER_MIN || 5);
const ALLOWED = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const DEBOUNCE_MS = 60000; // no reenviar el correo si el mismo email ya se registró hace <60s

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

function clean(s, max) { return String(s == null ? '' : s).trim().slice(0, max); }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validar(body) {
  const nombre = clean(body.nombre, 120);
  const email = clean(body.email, 200).toLowerCase();
  const entidad = clean(body.entidad, 160);
  const rol = clean(body.rol, 120);
  if (nombre.length < 2) return { error: 'Falta el nombre y apellido', field: 'nombre' };
  if (email.length < 3 || !EMAIL_RE.test(email)) return { error: 'El correo no es válido', field: 'email' };
  if (entidad.length < 2) return { error: 'Falta la entidad donde trabaja', field: 'entidad' };
  if (rol.length < 2) return { error: 'Falta el rol dentro de la entidad', field: 'rol' };
  return { nombre, email, entidad, rol };
}

function emailHtml(nombre, link) {
  const primerNombre = (nombre.split(' ')[0] || nombre);
  return '<div style="font-family:Arial,Helvetica,sans-serif;color:#141A21;max-width:480px;margin:0 auto">' +
    '<p>Hola ' + primerNombre + ', gracias por tu interés en Descubre Nariño.</p>' +
    '<p>Aquí está el enlace para descargar la propuesta completa. Puedes guardarlo, no vence:</p>' +
    '<p><a href="' + link + '" style="display:inline-block;background:#E0401F;color:#fff;text-decoration:none;padding:12px 20px;border-radius:24px;font-weight:bold">Descargar propuesta</a></p>' +
    '<p style="font-size:13px;color:#4B5560">Si prefieres conversar sobre el alcance o el MVP, agenda 30 minutos con Andrés Méndez: ' +
    '<a href="https://meetings.hubspot.com/andresm/reuniones-andres-mendez">meetings.hubspot.com/andresm/reuniones-andres-mendez</a></p>' +
    '<p style="font-size:13px;color:#4B5560">— Equipo Wigilabs</p></div>';
}

async function enviarCorreo(email, nombre, token) {
  const base = (process.env.SITE_URL || 'https://descubrenarino-qmes.vercel.app').replace(/\/+$/, '');
  const link = base + '/propuesta/' + token;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM,
      to: [email],
      subject: 'Tu propuesta de Descubre Nariño está lista',
      html: emailHtml(nombre, link)
    })
  });
  if (!r.ok) throw new Error('Resend ' + r.status + ': ' + (await r.text()).slice(0, 300));
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  const norm = u => String(u || '').replace(/\/+$/, '').toLowerCase();
  const sameHost = origin && req.headers.host && norm(origin).endsWith('//' + String(req.headers.host).toLowerCase());
  if (ALLOWED.length && origin && !sameHost && !ALLOWED.map(norm).includes(norm(origin))) return res.status(403).json({ error: 'Origen no permitido: ' + origin });

  const ready = kvReady() && !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM && !!process.env.PROPUESTA_PDF_URL;
  if (req.method === 'GET') return res.status(200).json({ ok: ready });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!ready) return res.status(503).json({ error: 'La descarga de la propuesta no está configurada todavía' });

  const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'anon').split(',')[0].trim();
  if (limited(ip)) return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un minuto.' });

  const body = readBody(req);
  if (clean(body.web, 200)) return res.status(200).json({ ok: true }); // honeypot: no revelar la trampa

  const v = validar(body);
  if (v.error) return res.status(400).json(v);

  try {
    const existing = await kvGetJSON('lead:email:' + v.email);
    if (existing && (Date.now() - existing.createdAt) < DEBOUNCE_MS) return res.status(200).json({ ok: true });

    const token = existing ? existing.token : crypto.randomBytes(24).toString('base64url');
    const record = { nombre: v.nombre, email: v.email, entidad: v.entidad, rol: v.rol, token, createdAt: Date.now(), ip };
    await kvSetJSON('lead:email:' + v.email, record);
    await kvSetJSON('lead:token:' + token, v.email);
    if (!existing) {
      await kvZadd('leads:index', record.createdAt, v.email);
      await kvIncr('stats:leads:total').catch(() => {});
    }
    await enviarCorreo(v.email, v.nombre, token);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('propuesta-lead', e);
    return res.status(502).json({ error: 'No se pudo procesar la solicitud, intenta de nuevo' });
  }
};

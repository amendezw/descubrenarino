// POST /api/chat  { messages: [{role, content}], lang: 'es' | 'en' }
// GET  /api/chat  → { ok, model }  (la app lo usa para saber si Claude está configurado)
const { buildSystem, parseReply, bloqueado, fuera } = require('./_guia');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
const MAX_USER_CHARS = 500;          // largo máximo de cada mensaje del turista
const MAX_TURNS = 8;                 // mensajes de historial que se envían a Claude
const RATE_PER_MIN = Number(process.env.CHAT_RATE_PER_MIN || 12);   // mensajes por minuto por IP
const ALLOWED = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

const hits = new Map();              // límite por IP (por instancia; para límites estrictos usa Vercel KV o Upstash)
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

function cleanMessages(list) {
  const out = [];
  (Array.isArray(list) ? list : []).slice(-MAX_TURNS).forEach(m => {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string' || !m.content.trim()) return;
    const content = m.content.slice(0, m.role === 'user' ? MAX_USER_CHARS : 600);
    if (out.length && out[out.length - 1].role === m.role) out[out.length - 1].content += '\n' + content;
    else out.push({ role: m.role, content });
  });
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

module.exports = async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  const origin = req.headers.origin || '';
  if (ALLOWED.length && origin && !ALLOWED.includes(origin)) return res.status(403).json({ error: 'Origen no permitido' });
  if (req.method === 'GET') return res.status(200).json({ ok: !!key, model: key ? MODEL : null });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!key) return res.status(503).json({ error: 'ANTHROPIC_API_KEY no está configurada' });

  const ip = String(req.headers['x-forwarded-for'] || req.socket && req.socket.remoteAddress || 'anon').split(',')[0].trim();
  if (limited(ip)) return res.status(429).json({ error: 'Demasiados mensajes seguidos. Espera un minuto.' });

  const body = readBody(req);
  const lang = body.lang === 'en' ? 'en' : 'es';
  const messages = cleanMessages(body.messages);
  if (!messages.length || messages[messages.length - 1].role !== 'user') return res.status(400).json({ error: 'El último mensaje debe ser del usuario' });

  // Capa 1: filtro de entrada sin gastar tokens
  if (bloqueado(messages[messages.length - 1].content)) return res.status(200).json(Object.assign(fuera(lang), { model: 'filtro' }));

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 500, temperature: 0.3, system: buildSystem(lang), messages })
    });
    if (!r.ok) return res.status(502).json({ error: 'Claude respondió ' + r.status });
    const data = await r.json();
    const raw = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    // Capa 3: validación de salida
    return res.status(200).json(Object.assign(parseReply(raw, lang), { model: MODEL }));
  } catch (e) {
    return res.status(500).json({ error: 'No se pudo contactar al asistente' });
  }
};

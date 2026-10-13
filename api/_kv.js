// Helper compartido: llamadas REST crudas a Vercel KV (Upstash), sin SDK.
// Usa el estilo de comando-como-array que documenta Upstash: POST a la URL base
// con el comando Redis como JSON (p. ej. ["SET", "clave", "valor"]) → { result }.
const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

function kvReady() { return !!(KV_URL && KV_TOKEN); }

async function kv(cmd) {
  const r = await fetch(KV_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + KV_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  if (!r.ok) throw new Error('KV ' + r.status + ': ' + (await r.text()).slice(0, 300));
  const j = await r.json();
  return j.result;
}

async function kvGetJSON(key) {
  const v = await kv(['GET', key]);
  if (v == null) return null;
  try { return JSON.parse(v); } catch (e) { return null; }
}
function kvSetJSON(key, value) { return kv(['SET', key, JSON.stringify(value)]); }
function kvGetStr(key) { return kv(['GET', key]); }
function kvSetStr(key, value) { return kv(['SET', key, String(value)]); }
function kvIncr(key) { return kv(['INCR', key]); }
function kvZadd(key, score, member) { return kv(['ZADD', key, String(score), member]); }
async function kvZrangeRev(key, start, stop) {
  const v = await kv(['ZRANGE', key, String(start), String(stop), 'REV']);
  return Array.isArray(v) ? v : [];
}
function kvPfadd(key, value) { return kv(['PFADD', key, value]); }
async function kvPfcount(key) { const v = await kv(['PFCOUNT', key]); return Number(v) || 0; }

module.exports = { kvReady, kvGetJSON, kvSetJSON, kvGetStr, kvSetStr, kvIncr, kvZadd, kvZrangeRev, kvPfadd, kvPfcount };

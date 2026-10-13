// Helper compartido: Basic Auth para /api/admin* (no es ruta).
// La contraseña vive como hash (scrypt) en Vercel KV bajo "admin:auth".
// En el primer acceso, si no existe todavía, se siembra desde ADMIN_PASS_INICIAL
// (variable de entorno que solo se define en el dashboard de Vercel, nunca en el repo).
const crypto = require('crypto');
const { kvReady, kvGetJSON, kvSetJSON } = require('./_kv');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  try { return crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hash, 'hex')); }
  catch (e) { return false; }
}

async function getAuthRecord() {
  let rec = await kvGetJSON('admin:auth');
  if (!rec) {
    const initial = process.env.ADMIN_PASS_INICIAL;
    if (!initial) return null;
    rec = hashPassword(initial);
    await kvSetJSON('admin:auth', rec);
  }
  return rec;
}

function unauthorized(res) {
  res.setHeader('WWW-Authenticate', 'Basic realm="Descubre Narino Admin"');
  res.status(401).end('Autenticación requerida');
  return null;
}

// Devuelve { user } si las credenciales del header Authorization son válidas.
// Si no, ya escribió la respuesta 401/503 y devuelve null (el caller debe hacer `return`).
async function requireAdmin(req, res) {
  if (!kvReady()) { res.status(503).json({ error: 'El panel de administración no está configurado todavía' }); return null; }
  const auth = req.headers.authorization || '';
  const m = /^Basic\s+(.+)$/i.exec(auth);
  if (!m) return unauthorized(res);
  let user = '', pass = '';
  try {
    const decoded = Buffer.from(m[1], 'base64').toString('utf8');
    const i = decoded.indexOf(':');
    user = decoded.slice(0, i); pass = decoded.slice(i + 1);
  } catch (e) { return unauthorized(res); }
  const rec = await getAuthRecord();
  if (!rec || user !== ADMIN_USER || !verifyPassword(pass, rec.salt, rec.hash)) return unauthorized(res);
  return { user };
}

module.exports = { requireAdmin, hashPassword, verifyPassword, getAuthRecord, ADMIN_USER };

// GET  /api/admin-password  → formulario simple para cambiar la contraseña (protegido con Basic Auth)
// POST /api/admin-password  { actual, nueva } → cambia el hash guardado en KV
const { requireAdmin, hashPassword, verifyPassword, getAuthRecord } = require('./_admin-auth');
const { kvSetJSON } = require('./_kv');

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}

function formHtml(msg) {
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Cambiar contraseña · Admin</title>' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{font-family:\'Public Sans\',Arial,sans-serif;background:#F4F6F7;color:#141A21;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}' +
    '.card{background:#fff;border-radius:16px;padding:28px;max-width:360px;width:100%}' +
    'input{width:100%;height:42px;border-radius:10px;border:1px solid #D3D9DE;padding:0 12px;font-size:14px;margin-top:6px;margin-bottom:14px;box-sizing:border-box}' +
    'label{font-size:12.5px;font-weight:600}' +
    'button{width:100%;height:46px;border:0;border-radius:23px;background:#E0401F;color:#fff;font-weight:700;font-size:14px;cursor:pointer}</style>' +
    '</head><body><div class="card"><div style="font:400 26px/1 \'Instrument Serif\',serif;margin-bottom:14px">Cambiar contraseña</div>' +
    (msg ? '<div style="background:#EEF0F2;padding:10px 12px;border-radius:10px;font-size:13px;margin-bottom:14px">' + msg + '</div>' : '') +
    '<form id="f"><label>Contraseña actual<input type="password" name="actual" required></label>' +
    '<label>Contraseña nueva (mínimo 8 caracteres)<input type="password" name="nueva" minlength="8" required></label>' +
    '<button type="submit">Guardar</button></form>' +
    '<p style="margin-top:14px"><a href="/api/admin" style="color:#E0401F;text-decoration:none;font-size:13px;font-weight:700">Volver al panel</a></p>' +
    '<script>document.getElementById("f").onsubmit=function(e){e.preventDefault();var f=e.target;' +
    'fetch(location.pathname,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({actual:f.actual.value,nueva:f.nueva.value})})' +
    '.then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j}})}).then(function(x){' +
    'alert(x.ok?"Contraseña actualizada.":(x.j&&x.j.error)||"No se pudo cambiar la contraseña");if(x.ok)location.href="/api/admin";});};</script>' +
    '</div></body></html>';
}

module.exports = async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).end(formHtml(''));
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const body = readBody(req);
  const actual = String(body.actual || '');
  const nueva = String(body.nueva || '');
  if (nueva.length < 8) return res.status(400).json({ error: 'La contraseña nueva debe tener al menos 8 caracteres' });

  try {
    const rec = await getAuthRecord();
    if (!rec || !verifyPassword(actual, rec.salt, rec.hash)) return res.status(401).json({ error: 'La contraseña actual no es correcta' });
    await kvSetJSON('admin:auth', hashPassword(nueva));
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('admin-password', e);
    return res.status(502).json({ error: 'No se pudo cambiar la contraseña, intenta de nuevo' });
  }
};

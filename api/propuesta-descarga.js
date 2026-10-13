// GET /api/propuesta-descarga?token=...  (también accesible como /propuesta/:token, ver vercel.json)
// Resuelve el token contra Vercel KV y redirige al PDF; el link es reutilizable y no vence.
const { kvReady, kvGetStr, kvIncr } = require('./_kv');

function paginaError(titulo, detalle) {
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>' + titulo + '</title>' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="font-family:\'Public Sans\',Arial,sans-serif;background:#F4F6F7;color:#141A21;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center">' +
    '<div><h1 style="font-size:22px">' + titulo + '</h1><p style="color:#4B5560">' + detalle + '</p>' +
    '<p><a href="/" style="color:#E0401F;font-weight:700;text-decoration:none">Volver a Descubre Nariño</a></p></div></body></html>';
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end('Método no permitido');

  const pdfUrl = process.env.PROPUESTA_PDF_URL;
  if (!kvReady() || !pdfUrl) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(503).end('La descarga de la propuesta no está configurada todavía');
  }

  const m = /[?&]token=([^&]*)/.exec(String(req.url || ''));
  const token = m ? decodeURIComponent(m[1]) : '';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!token) return res.status(404).end(paginaError('Enlace incompleto', 'Falta el código de acceso en el enlace.'));

  try {
    const email = await kvGetStr('lead:token:' + token);
    if (!email) return res.status(404).end(paginaError('Este enlace no es válido', 'Puede que esté mal copiado. Vuelve al sitio y solicita la propuesta de nuevo.'));
    kvIncr('stats:descargas:total').catch(() => {});
    res.writeHead(302, { Location: pdfUrl });
    return res.end();
  } catch (e) {
    console.error('propuesta-descarga', e);
    return res.status(502).end(paginaError('No se pudo verificar el enlace', 'Intenta de nuevo en unos minutos.'));
  }
};

// GET /api/admin           → visor HTML con KPIs + tabla de leads (protegido con Basic Auth)
// GET /api/admin?export=csv → la misma tabla de leads en CSV
const { requireAdmin } = require('./_admin-auth');
const { kvGetStr, kvGetJSON, kvZrangeRev, kvPfcount } = require('./_kv');

async function num(key) { const v = await kvGetStr(key); return Number(v) || 0; }

function hoy() { return new Date().toISOString().slice(0, 10); }

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function csvCell(s) {
  const v = String(s == null ? '' : s);
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

async function cargarLeads() {
  const emails = await kvZrangeRev('leads:index', 0, -1);
  const leads = [];
  for (const email of emails) {
    const r = await kvGetJSON('lead:email:' + email);
    if (r) leads.push(r);
  }
  return leads;
}

function paginaHtml(kpis, leads) {
  const filas = leads.map(l => (
    '<tr><td style="padding:8px 10px;border-bottom:1px solid #EEF0F2">' + esc(l.nombre) + '</td>' +
    '<td style="padding:8px 10px;border-bottom:1px solid #EEF0F2">' + esc(l.email) + '</td>' +
    '<td style="padding:8px 10px;border-bottom:1px solid #EEF0F2">' + esc(l.entidad) + '</td>' +
    '<td style="padding:8px 10px;border-bottom:1px solid #EEF0F2">' + esc(l.rol) + '</td>' +
    '<td style="padding:8px 10px;border-bottom:1px solid #EEF0F2;white-space:nowrap">' + esc(new Date(l.createdAt).toLocaleString('es-CO')) + '</td></tr>'
  )).join('');

  const kpiHtml = kpis.map(k => (
    '<div style="background:#fff;border-radius:14px;padding:16px 18px;flex:1;min-width:150px">' +
    '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6B747D">' + esc(k.label) + '</div>' +
    '<div style="font:400 32px/1.1 \'Instrument Serif\',serif;margin-top:4px">' + esc(k.value) + '</div></div>'
  )).join('');

  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Admin · Descubre Nariño</title>' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{font-family:\'Public Sans\',Arial,sans-serif;background:#F4F6F7;color:#141A21;margin:0;padding:28px}' +
    'table{border-collapse:collapse;width:100%;background:#fff;border-radius:14px;overflow:hidden}' +
    'th{text-align:left;padding:10px;background:#141A21;color:#fff;font-size:12px;text-transform:uppercase;letter-spacing:.06em}' +
    'a.btn{display:inline-block;background:#E0401F;color:#fff;text-decoration:none;padding:10px 16px;border-radius:20px;font-size:13px;font-weight:700}</style>' +
    '</head><body>' +
    '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px">' +
    '<div style="font:400 30px/1 \'Instrument Serif\',serif">Panel · Descubre Nariño</div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn" href="/api/admin?export=csv">Descargar CSV</a>' +
    '<a class="btn" style="background:#141A21" href="/api/admin-password">Cambiar contraseña</a></div></div>' +
    '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:24px">' + kpiHtml + '</div>' +
    '<table><thead><tr><th>Nombre</th><th>Correo</th><th>Entidad</th><th>Rol</th><th>Fecha</th></tr></thead>' +
    '<tbody>' + (filas || '<tr><td colspan="5" style="padding:18px;text-align:center;color:#6B747D">Todavía no hay leads</td></tr>') + '</tbody></table>' +
    '</body></html>';
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end('Método no permitido');
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const esCsv = /[?&]export=csv\b/.test(String(req.url || ''));

  try {
    const leads = await cargarLeads();

    if (esCsv) {
      const header = 'Nombre,Correo,Entidad,Rol,Fecha\n';
      const body = leads.map(l => [l.nombre, l.email, l.entidad, l.rol, new Date(l.createdAt).toISOString()].map(csvCell).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="leads-descubre-narino.csv"');
      return res.status(200).end('﻿' + header + body);
    }

    const [pageviewsTotal, uniquesTotal, uniquesHoy, agendarTotal, leadsTotal, descargasTotal] = await Promise.all([
      num('stats:pageviews:total'),
      kvPfcount('stats:uniques:total'),
      kvPfcount('stats:uniques:' + hoy()),
      num('stats:clicks:agendar:total'),
      num('stats:leads:total'),
      num('stats:descargas:total')
    ]);

    const kpis = [
      { label: 'Formularios completados', value: leadsTotal },
      { label: 'Propuestas descargadas', value: descargasTotal },
      { label: 'Visitas totales', value: pageviewsTotal },
      { label: 'Visitantes únicos (hoy)', value: uniquesHoy },
      { label: 'Visitantes únicos (total)', value: uniquesTotal },
      { label: 'Clics en Agendar reunión', value: agendarTotal }
    ];

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).end(paginaHtml(kpis, leads));
  } catch (e) {
    console.error('admin', e);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(502).end('No se pudo cargar el panel, intenta de nuevo');
  }
};

// GET /api/admin           → visor HTML con KPIs + tráfico por sección/zona + zonas de calor + tabla de leads (protegido con Basic Auth)
// GET /api/admin?export=csv → la misma tabla de leads en CSV
const { requireAdmin } = require('./_admin-auth');
const { kvGetStr, kvGetJSON, kvZrangeRev, kvZrangeRevWithScores, kvHgetAll, kvPfcount } = require('./_kv');

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

const SECCIONES = { portada: 'Portada (propuesta)', app: 'App turista (demo)', gobierno: 'Gobernación (demo)', prestador: 'Portal prestador (demo)', otro: 'Otras rutas' };

const PAISES = {
  CO: 'Colombia', EC: 'Ecuador', US: 'Estados Unidos', ES: 'España', MX: 'México', PE: 'Perú', VE: 'Venezuela',
  CL: 'Chile', AR: 'Argentina', BR: 'Brasil', CA: 'Canadá', DE: 'Alemania', FR: 'Francia', GB: 'Reino Unido',
  IT: 'Italia', NL: 'Países Bajos', PA: 'Panamá', CR: 'Costa Rica', UY: 'Uruguay', BO: 'Bolivia', PY: 'Paraguay',
  DO: 'Rep. Dominicana', PT: 'Portugal', AU: 'Australia', JP: 'Japón', KR: 'Corea del Sur', IN: 'India', CN: 'China'
};
function paisLabel(cod) { return PAISES[cod] || cod; }

// Lista de {member, score} de ZRANGE → filas de una barra horizontal con el ancho proporcional al máximo.
function barraHtml(items, color) {
  if (!items.length) return '<div style="padding:14px 2px;color:#6B747D;font-size:13px">Todavía no hay datos suficientes</div>';
  const max = Math.max.apply(null, items.map(i => i.score)) || 1;
  return items.map(i => {
    const pct = Math.max(4, Math.round(i.score / max * 100));
    return '<div style="margin-bottom:10px">' +
      '<div style="display:flex;justify-content:space-between;gap:10px;font-size:12.5px;color:#141A21;margin-bottom:4px">' +
      '<span>' + esc(i.label) + '</span><span style="font-weight:700;white-space:nowrap">' + i.score.toLocaleString('es-CO') + '</span></div>' +
      '<div style="background:#EEF0F2;border-radius:6px;height:8px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:' + color + '"></div></div>' +
      '</div>';
  }).join('');
}

function seccionesParaBarra(rows) {
  return rows.map(r => ({ label: SECCIONES[r.member] || r.member, score: r.score }));
}

function zonasParaBarra(rows) {
  return rows.map(r => {
    const i = r.member.indexOf(':');
    const seccion = i >= 0 ? r.member.slice(0, i) : r.member;
    const zona = i >= 0 ? r.member.slice(i + 1) : '';
    const zonaLegible = zona.replace(/_/g, ' ');
    const label = (SECCIONES[seccion] || seccion) + ' · ' + (zonaLegible.charAt(0).toUpperCase() + zonaLegible.slice(1));
    return { label, score: r.score };
  });
}

function paisesParaBarra(rows) { return rows.map(r => ({ label: paisLabel(r.member), score: r.score })); }
function ciudadesParaBarra(rows) { return rows.map(r => ({ label: r.member, score: r.score })); }

// Puntos [lat, lng, intensidad] para la capa de calor, cruzando el ranking de ciudades con su lat/lng conocida.
function puntosCalor(ciudadesRows, latlngMap) {
  const max = Math.max.apply(null, ciudadesRows.map(r => r.score)) || 1;
  const pts = [];
  ciudadesRows.forEach(r => {
    const raw = latlngMap[r.member];
    if (!raw) return;
    const partes = raw.split(',');
    const lat = Number(partes[0]), lng = Number(partes[1]);
    if (!isFinite(lat) || !isFinite(lng)) return;
    pts.push([lat, lng, Math.max(0.25, r.score / max)]);
  });
  return pts;
}

function paginaHtml(kpis, leads, paneles) {
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

  const panel = (titulo, contenidoHtml) => (
    '<div style="background:#fff;border-radius:14px;padding:16px 18px;flex:1;min-width:280px">' +
    '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6B747D;margin-bottom:12px">' + esc(titulo) + '</div>' +
    contenidoHtml + '</div>'
  );

  const puntosJson = JSON.stringify(paneles.puntos).replace(/</g, '\\u003c');

  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Admin · Descubre Nariño</title>' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">' +
    '<style>body{font-family:\'Public Sans\',Arial,sans-serif;background:#F4F6F7;color:#141A21;margin:0;padding:28px}' +
    'table{border-collapse:collapse;width:100%;background:#fff;border-radius:14px;overflow:hidden}' +
    'th{text-align:left;padding:10px;background:#141A21;color:#fff;font-size:12px;text-transform:uppercase;letter-spacing:.06em}' +
    'a.btn{display:inline-block;background:#E0401F;color:#fff;text-decoration:none;padding:10px 16px;border-radius:20px;font-size:13px;font-weight:700}' +
    '.grid{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:24px}</style>' +
    '</head><body>' +
    '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px">' +
    '<div style="font:400 30px/1 \'Instrument Serif\',serif">Panel · Descubre Nariño</div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn" href="/api/admin?export=csv">Descargar CSV</a>' +
    '<a class="btn" style="background:#141A21" href="/api/admin-password">Cambiar contraseña</a></div></div>' +
    '<div class="grid">' + kpiHtml + '</div>' +
    '<div class="grid">' +
    panel('Secciones con más tráfico', barraHtml(paneles.secciones, '#141A21')) +
    panel('Zonas con más clics', barraHtml(paneles.zonas, '#E0401F')) +
    '</div>' +
    '<div style="background:#fff;border-radius:14px;padding:16px 18px;margin-bottom:24px">' +
    '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6B747D;margin-bottom:12px">Zonas de calor · desde dónde navegan</div>' +
    '<div id="mapa-calor" style="height:360px;border-radius:10px;background:#EEF0F2;margin-bottom:16px"></div>' +
    '<div class="grid" style="margin-bottom:0">' +
    panel('Países', barraHtml(paneles.paises, '#2E6F8E')) +
    panel('Ciudades', barraHtml(paneles.ciudades, '#2E6F8E')) +
    '</div></div>' +
    '<table><thead><tr><th>Nombre</th><th>Correo</th><th>Entidad</th><th>Rol</th><th>Fecha</th></tr></thead>' +
    '<tbody>' + (filas || '<tr><td colspan="5" style="padding:18px;text-align:center;color:#6B747D">Todavía no hay leads</td></tr>') + '</tbody></table>' +
    '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>' +
    '<script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>' +
    '<script>try {' +
    'var puntos = ' + puntosJson + ';' +
    'var el = document.getElementById("mapa-calor");' +
    'if (puntos.length) {' +
    'var mapa = L.map(el).setView([4.5, -74], puntos.length > 1 ? 3 : 5);' +
    'L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 10 }).addTo(mapa);' +
    'L.heatLayer(puntos, { radius: 28, blur: 22, maxZoom: 8 }).addTo(mapa);' +
    '} else { el.innerHTML = \'<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#6B747D;font-size:13px">Todavía no hay suficientes datos de ubicación</div>\'; }' +
    '} catch (e) { console.error(e); }</script>' +
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

    const [
      pageviewsTotal, uniquesTotal, uniquesHoy, agendarTotal, leadsTotal, descargasTotal,
      seccionesRank, zonasRank, paisesRank, ciudadesRank, latlngMap
    ] = await Promise.all([
      num('stats:pageviews:total'),
      kvPfcount('stats:uniques:total'),
      kvPfcount('stats:uniques:' + hoy()),
      num('stats:clicks:agendar:total'),
      num('stats:leads:total'),
      num('stats:descargas:total'),
      kvZrangeRevWithScores('stats:secciones:rank', 0, 9),
      kvZrangeRevWithScores('stats:zonas:rank', 0, 14),
      kvZrangeRevWithScores('stats:geo:paises:rank', 0, 9),
      kvZrangeRevWithScores('stats:geo:ciudades:rank', 0, 29),
      kvHgetAll('stats:geo:latlng')
    ]);

    const kpis = [
      { label: 'Formularios completados', value: leadsTotal },
      { label: 'Propuestas descargadas', value: descargasTotal },
      { label: 'Visitas totales', value: pageviewsTotal },
      { label: 'Visitantes únicos (hoy)', value: uniquesHoy },
      { label: 'Visitantes únicos (total)', value: uniquesTotal },
      { label: 'Clics en Agendar reunión', value: agendarTotal }
    ];

    const paneles = {
      secciones: seccionesParaBarra(seccionesRank),
      zonas: zonasParaBarra(zonasRank),
      paises: paisesParaBarra(paisesRank),
      ciudades: ciudadesParaBarra(ciudadesRank),
      puntos: puntosCalor(ciudadesRank, latlngMap)
    };

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).end(paginaHtml(kpis, leads, paneles));
  } catch (e) {
    console.error('admin', e);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(502).end('No se pudo cargar el panel, intenta de nuevo');
  }
};

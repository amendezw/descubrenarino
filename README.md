# Descubre Nariño · Mockups MVP

Sitio estático (HTML + JS). No requiere build.

## Estructura
- `index.html` — lienzo con las 9 pantallas del MVP
- `mapa-narino.html` — mapa ilustrado (Leaflet, sin teselas externas) embebido en las pantallas 1b y 1f
- `support.js`, `ios-frame.jsx` — runtime y marco de iPhone
- `img/` — fotografías

## Deploy en Vercel
1. Sube esta carpeta como raíz del repositorio en GitHub.
2. En Vercel: **Add New → Project**, importa el repo.
3. Framework Preset: **Other**. Build Command: vacío. Output Directory: `./` (raíz).
4. Deploy.

Carga React, Babel, Leaflet y fuentes desde CDNs públicos (unpkg, Google Fonts), así que necesita conexión.

## Local
`npx serve .` y abre http://localhost:3000 (no abrir con doble clic: los iframes y el .jsx necesitan servidor).

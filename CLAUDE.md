# Descubre Nariño — instrucciones para Claude Code

## Contexto
Plataforma pública-privada de turismo inteligente para el departamento de Nariño (Colombia), propuesta por Wigilabs a la Gobernación, la Cámara de Comercio de Pasto y los gremios. Un catálogo único verificado contra el Registro Nacional de Turismo (RNT) alimenta tres interfaces: app del turista (web/PWA, móvil primero), portal del prestador y portal de la Gobernación. Esta versión suma **recorridos narrados** (audioguías por punto de interés, activables desde el mapa, la ficha o un QR en el lugar).

## Qué hay en este repo
- Un **prototipo navegable de alta fidelidad** (`*.html`). Son Design Components que corren sin build con `support.js`. Úsalos como **referencia de diseño y comportamiento**, no como código de producción.
- Dos funciones de Vercel funcionales: `api/chat.js` (Claude) y `api/tts.js` (ElevenLabs).
- Datos semilla en `data/` y documentación en `docs/`.

## Reglas de producto que no se negocian
1. **El catálogo es la fuente de verdad.** El asistente no inventa precios, horarios ni prestadores. Si no está en el catálogo, lo dice y registra la pregunta (`consultas_sin_respuesta`).
2. **Trazabilidad.** Toda recomendación guarda los ids de ficha usados y su fecha de actualización.
3. **Solo prestadores con RNT vigente** son visibles, reciben reservas y publican cupones.
4. **Bilingüe y binacional:** español e inglés en toda la interfaz; tiempos desde Pasto, Ipiales y Rumichaca.
5. **Accesibilidad AA:** todo audio tiene transcripción; contraste mínimo 4.5:1; objetivos táctiles ≥ 44 px.
6. **Invitado por defecto:** cuentas opcionales para el turista; tratamiento de datos conforme a la Ley 1581 de 2012.
7. Tono del asistente: español de Colombia, tutea, cercano y local, máximo 3 frases.

## Stack recomendado (si no hay uno definido)
- Next.js (App Router) + TypeScript, desplegado en Vercel.
- Postgres (Supabase o Neon) con pgvector para recuperación de fichas; Supabase Auth con roles `turista`, `prestador`, `editor`, `admin`.
- Claude Messages API con **tool use**: `buscar_fichas`, `crear_itinerario`, `registrar_consulta`. Streaming para el chat.
- ElevenLabs: generación por lotes al publicar un guion (no en cada reproducción); MP3 en Vercel Blob o Supabase Storage; caché offline con service worker.
- PWA instalable con plan y audioguías descargables.
- i18n con archivos de mensajes ES/EN.

## Plan de trabajo sugerido
1. **Modelo de datos y semilla** desde `data/*.json` (ver `docs/ARQUITECTURA.md`).
2. **App turista**: Inicio + chat con streaming y tarjetas → Mi plan → Catálogo/Ficha → Mapa (MapLibre + rutas reales) → Agenda → SOS.
3. **Audioguías (MVP)**: reproductor persistente, rutas `/a/[codigo]` para los QR, descarga offline, transcripción.
4. **Gobernación**: CRUD de fichas con revisión, cruce RNT nocturno, alertas, consultas sin respuesta, editor de guiones con generación de voz y descarga de cartel QR.
5. **Prestador**: ficha con revisión, cupones, validación de canjes, reservas, reseñas, estadísticas.
6. **Tablero**: eventos de analítica propios → indicadores de `docs/ARQUITECTURA.md`; integración SITUR/CITUR en Fase 2.

## Equivalencias del prototipo → backend
| localStorage (demo) | Endpoint / tabla en producción |
|---|---|
| `dn_consultas` | `POST /api/consultas` · tabla `consultas_sin_respuesta` |
| `dn_cupones` | `POST /api/prestador/cupones` · `cupones` |
| `dn_canjes` | `POST /api/canjes`, `POST /api/prestador/canjes/:codigo/validar` · `canjes` |
| `dn_reservas` | `POST /api/reservas`, `PATCH /api/prestador/reservas/:id` · `reservas` |
| `dn_alertas` | `GET /api/alertas`, `PATCH /api/gobierno/alertas/:id` · `alertas` |
| `dn_revisiones` | `POST /api/prestador/ficha` → `revisiones` (aprobación en Gobernación) |
| `dn_pase` | `POST /api/pases` · `pases` (pago en Fase 3) |

## Diseño
Especificación completa en `docs/HANDOFF.md`. Fidelidad: **alta** (colores, tipografía, espaciado e interacciones finales).

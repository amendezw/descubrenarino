# Descubre Nariño · Plataforma de turismo inteligente

Prototipo navegable de la plataforma completa: app del turista, portal del prestador con RNT y portal de la Gobernación (gestor de contenidos + tablero de inteligencia turística), con asistente conversacional sobre Claude y audioguías con voces de ElevenLabs.

## Vistas

| Archivo | Vista | Para quién |
|---|---|---|
| `index.html` | Plataforma: qué ofrece cada vista, recorrido de demo, fases | Comité, presentación |
| `app.html` | App turista (marco de iPhone en escritorio, pantalla completa en celular) | Turista |
| `prestador.html` | Portal del prestador | Hoteles, restaurantes, guías, operadores con RNT |
| `gobierno.html` | Gobernación: tablero, fichas, prestadores, audioguías, eventos, rutas, alertas, consultas | Gobernación, alcaldías, gremios |

Las tres vistas comparten estado por `localStorage` (claves `dn_*`): abre cada una en una pestaña y lo que haces en una aparece en la otra. Ver el recorrido de 8 pasos en `index.html`.

## Deploy en Vercel

Guía paso a paso del chat con Claude, límites y pruebas: `docs/CONFIGURAR-VERCEL.md`.

1. Sube esta carpeta como raíz de un repositorio en GitHub.
2. Vercel › Add New › Project › importa el repo. Framework preset: **Other**. Build command: vacío. Output directory: `./`.
3. En Settings › Environment Variables agrega las de `.env.example`:
   - `ANTHROPIC_API_KEY` activa el chat real con Claude (`/api/chat`).
   - `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ES` (+ `ELEVENLABS_VOICE_EN`) activan las voces en vivo (`/api/tts`).
4. Deploy. Sin claves todo funciona en modo demostración: respuestas guionizadas y voz del navegador.

Local: `npx vercel dev` (las funciones de `/api` necesitan el runtime de Vercel). Para ver solo las pantallas basta `npx serve .`.

## Audioguías

Textos para ElevenLabs y nombres de archivo: `docs/GUIONES-ELEVENLABS.md` (9 puntos × ES/EN = 18 MP3).


Orden de reproducción: `audio/<id>.mp3` → `/api/tts` (ElevenLabs en vivo) → voz del navegador.
- Para un audio de ejemplo hecho en ElevenLabs: guárdalo como `audio/lajas-01.mp3`.
- Para generar todos: `npm run audios` (lee `data/audioguias.json`, escribe en `audio/`).
- Códigos QR de la demo: LAJ-01..03, COC-01..02, VER-01..02, PAS-01..02.

## Estructura

```
api/chat.js            Claude Messages API, respuestas ancladas al catálogo (JSON con tarjetas y acciones)
api/tts.js             ElevenLabs text-to-speech → audio/mpeg
api/_guia.js           System prompt y validación de la respuesta (no es ruta)
data/catalogo.json     Fichas, rutas, eventos y cupones de ejemplo
data/audioguias.json   Recorridos, puntos, QR y guiones ES/EN
audio/                 MP3 de las audioguías
prompts/guia-narino.md Comportamiento del asistente
scripts/               Generación de audios
docs/                  Especificación de diseño y arquitectura para continuar en Claude Code
CLAUDE.md              Instrucciones para Claude Code
*.html + support.js    Prototipo (Design Components, sin build)
```

Datos de ejemplo: precios, números de RNT, prestadores, cifras del tablero y algunas fechas.

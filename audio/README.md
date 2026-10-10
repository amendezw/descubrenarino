# Audios de las audioguías

La app busca primero un MP3 en esta carpeta y solo si no existe lo pide a `/api/tts` (ElevenLabs en vivo) o usa la voz del navegador.

Nombra cada archivo con el id del punto que está en `data/audioguias.json`:

Español: `lajas-01.mp3` `lajas-02.mp3` `lajas-03.mp3` `cocha-01.mp3` `cocha-02.mp3` `verde-01.mp3` `verde-02.mp3` `pasto-01.mp3` `pasto-02.mp3`
Inglés: los mismos con `-en` (`lajas-01-en.mp3`…)

Textos exactos en `docs/GUIONES-ELEVENLABS.md`.

Para generarlos todos con ElevenLabs: configura `.env.local` y ejecuta `npm run audios`.
Si tienes un audio de ejemplo hecho a mano en ElevenLabs, guárdalo como `lajas-01.mp3` y abre Las Lajas en la app.

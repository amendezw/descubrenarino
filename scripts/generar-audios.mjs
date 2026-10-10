// Genera los MP3 de todas las audioguías con ElevenLabs y los guarda en /audio.
// Uso: configura .env.local (ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ES, ELEVENLABS_VOICE_EN) y ejecuta  npm run audios
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';

const env = Object.fromEntries((await readFile('.env.local', 'utf8').catch(() => '')).split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const KEY = process.env.ELEVENLABS_API_KEY || env.ELEVENLABS_API_KEY;
const VOICE = { es: process.env.ELEVENLABS_VOICE_ES || env.ELEVENLABS_VOICE_ES, en: process.env.ELEVENLABS_VOICE_EN || env.ELEVENLABS_VOICE_EN };
const MODEL = process.env.ELEVENLABS_MODEL || env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
if (!KEY || !VOICE.es) { console.error('Falta ELEVENLABS_API_KEY o ELEVENLABS_VOICE_ES'); process.exit(1); }

const data = JSON.parse(await readFile('data/audioguias.json', 'utf8'));
await mkdir('audio', { recursive: true });
const force = process.argv.includes('--force');

for (const rec of data.recorridos) {
  for (const p of rec.puntos) {
    for (const lang of ['es', 'en']) {
      const text = lang === 'es' ? p.guion_es : p.guion_en;
      if (!text || (lang === 'en' && !VOICE.en)) continue;
      const file = 'audio/' + p.id + (lang === 'en' ? '-en' : '') + '.mp3';
      if (!force && await access(file).then(() => true, () => false)) { console.log('ya existe', file); continue; }
      const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOICE[lang] + '?output_format=mp3_44100_128', { method: 'POST', headers: { 'xi-api-key': KEY, 'content-type': 'application/json', accept: 'audio/mpeg' }, body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true } }) });
      if (!r.ok) { console.error('error', file, r.status, await r.text()); continue; }
      await writeFile(file, Buffer.from(await r.arrayBuffer()));
      console.log('generado', file);
    }
  }
}

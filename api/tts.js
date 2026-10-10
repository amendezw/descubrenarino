// POST /api/tts  { text, lang: 'es' | 'en', id? }  → audio/mpeg generado por ElevenLabs
// GET  /api/tts  → { ok }  (la app lo usa para saber si ElevenLabs está configurado)
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}

module.exports = async (req, res) => {
  const key = process.env.ELEVENLABS_API_KEY;
  const voices = { es: process.env.ELEVENLABS_VOICE_ES, en: process.env.ELEVENLABS_VOICE_EN || process.env.ELEVENLABS_VOICE_ES };
  if (req.method === 'GET') return res.status(200).json({ ok: !!(key && voices.es) });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!key || !voices.es) return res.status(503).json({ error: 'ELEVENLABS_API_KEY o ELEVENLABS_VOICE_ES no están configuradas' });

  const body = readBody(req);
  const text = String(body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Falta el texto' });
  if (text.length > 2500) return res.status(413).json({ error: 'El guion supera 2.500 caracteres; divídelo en puntos' });
  const voice = body.lang === 'en' ? voices.en : voices.es;

  try {
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voice) + '?output_format=mp3_44100_128', {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true } })
    });
    if (!r.ok) return res.status(502).json({ error: 'ElevenLabs respondió ' + r.status, detail: (await r.text()).slice(0, 600) });
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(500).json({ error: 'No se pudo contactar a ElevenLabs', detail: String(e && e.message || e) });
  }
};

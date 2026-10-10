# Arquitectura · Descubre Nariño

## Capas
1. **Fuentes:** RNT, contenido de Gobernación y alcaldías, agenda de Corpocarnaval y ferias, SITUR Nariño y CITUR.
2. **Catálogo único:** una ficha normalizada por atractivo, prestador y experiencia.
3. **Recuperación y generación:** Claude recibe solo fichas relevantes y responde con trazabilidad.
4. **Experiencias:** app turista (PWA), portal del prestador, portal de la Gobernación.

## Modelo de datos (mínimo)
```
municipios(id, nombre, subregion, geom)
prestadores(id, nombre, nit, rnt_numero, rnt_estado, rnt_vence, categoria, municipio_id, contacto)
fichas(id, tipo, categoria, nombre, descripcion_es, descripcion_en, municipio_id, prestador_id?, precio_sugerido, unidad,
       rango_min, rango_max, horario, duracion, accesible, poco_visitado, reservable, geom, estado, actualizada_en, embedding)
fichas_fotos(ficha_id, url, orden, credito)
como_llegar(ficha_id, desde: pasto|ipiales|rumichaca, tiempo, distancia_km)
rutas(id, nombre, descripcion, color) · ruta_paradas(ruta_id, ficha_id, orden)
eventos(id, nombre, municipio_id, inicio, fin, descripcion, destacado)
recorridos(id, nombre, ficha_id, minutos) · puntos_audio(id, recorrido_id, orden, codigo_qr, titulo, ubicacion, guion_es, guion_en,
       audio_es_url, audio_en_url, voz_es, voz_en, generado_en)
pases(id, tipo: 1|3|5, turista_id?, inicio, fin, estado)
cupones(id, prestador_id, titulo, tipo, valor, cupo, vigencia, estado)
canjes(codigo, cupon_id, turista_id?, estado, ahorro, creado_en, validado_en, validado_por)
reservas(id, ficha_id, fecha, personas, contacto, estado, creado_en, respondido_en)
resenas(id, ficha_id, calificacion, texto, respuesta, origen)
itinerarios(id, turista_id?, dias, llegada, intereses, json, creado_en, compartido_slug)
conversaciones(id, idioma, llegada, creado_en) · mensajes(id, conversacion_id, rol, texto, fichas_usadas[], modelo, tokens)
consultas_sin_respuesta(id, texto, municipio_id?, tema, veces, estado, ficha_creada_id?)
alertas(id, titulo, detalle, nivel, activa, desde, hasta)
revisiones(id, prestador_id, ficha_id, cambios_json, estado, revisado_por)
eventos_analitica(id, tipo, ficha_id?, municipio_id?, origen, idioma, canal: asistente|catalogo|mapa|qr|audioguia, ts)
```

## Asistente (Claude)
- Endpoint con streaming. System prompt en `api/_guia.js`; en producción con **tool use**:
  - `buscar_fichas({texto, municipio?, tipo?, precio_max?, accesible?, poco_visitado?, limite})` → filtros SQL + similitud vectorial.
  - `crear_itinerario({dias, llegada, intereses, presupuesto?})` → arma días con traslados reales.
  - `registrar_consulta({texto, municipio?})`.
- La respuesta se valida en servidor: ids de ficha existentes y publicadas, acciones permitidas.
- Registrar tokens y fichas usadas por mensaje (trazabilidad y costo).

## Audioguías (ElevenLabs)
- La Gobernación edita el guion → «Generar voz» crea el MP3 (modelo `eleven_multilingual_v2`), lo guarda en almacenamiento y actualiza `audio_*_url`.
- La app reproduce el MP3 cacheado; el service worker lo guarda al tocar «Descargar».
- Cada punto tiene una URL corta `/a/LAJ-01` codificada en su QR; abre el reproductor en ese punto (y la app si está instalada).
- Medir: inicios por canal (mapa, ficha, QR), porcentaje escuchado, idioma.

## Indicadores
Prestadores con ficha activa (90 días), municipios con oferta publicada, itinerarios creados y descargados, dispersión territorial (planes con municipios distintos de Pasto e Ipiales), distribución mensual de la demanda, consultas sin respuesta, origen del visitante; en Fase 2 cupones redimidos y gasto inducido, ocupación y estancia (SITUR/CITUR).

## Fases
- **MVP (meses 1–4):** asistente bilingüe, catálogo con RNT y precio sugerido, itinerario, mapa con rutas, recorridos narrados (audioguías y QR), gestor de contenidos, transversales.
- **Fase 2 (meses 9–18):** pase y cupones, portal del prestador, reservas, tablero integrado, offline, PWA, WhatsApp y voz.
- **Fase 3 (mes 18+):** pagos y comisiones, OTAs, fidelidad, realidad aumentada, proyecciones con IA, datos abiertos.

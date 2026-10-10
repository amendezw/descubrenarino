# Handoff de diseño · Descubre Nariño

## Sobre estos archivos
Los `*.html` son **referencias de diseño hechas en HTML**: prototipos que muestran el aspecto y el comportamiento esperados. La tarea es recrearlos en el entorno de la aplicación (recomendado: Next.js + TypeScript) con sus propios patrones, no copiar el HTML. Fidelidad **alta**: colores, tipografía, espaciado e interacciones son finales.

## Tokens

### Color
| Token | Valor | Uso |
|---|---|---|
| ink | `#141A21` | Texto principal, botones secundarios rellenos |
| muted | `#4B5560` | Texto secundario |
| subtle | `#6B747D` | Metadatos, etiquetas |
| line | `#E2E6E9` / `#EEF0F2` | Bordes y separadores |
| surface | `#F4F6F7` | Fondo de app y portales |
| card | `#FFFFFF` | Tarjetas |
| accent (bermellón) | `oklch(0.56 0.19 35)` | Solo acciones primarias, SOS, audioguías |
| accent-ink | `oklch(0.5 0.19 35)` | Enlaces y texto de acción sobre blanco |
| accent-tint | `oklch(0.95 0.04 35)` | Fondos de cupones y etiquetas «Nuevo» |
| verified | `oklch(0.45 0.11 160)` | Sello RNT, estados OK |
| verified-tint | `oklch(0.95 0.035 160)` / texto `oklch(0.38 0.1 160)` | Chips de verificación |
| warn-tint | `oklch(0.95 0.05 80)` / texto `oklch(0.42 0.1 70)` | Pendiente, Fase 2 |
| night | `oklch(0.24 0.03 250)` | Superficies oscuras (pase, audioguía, sidebar Gobernación) |
| chrome | `#1B232B` | Barra de navegación global y fondo del escritorio de la app |
| Rutas | Naturaleza `oklch(0.52 0.13 155)`, Religiosa `oklch(0.55 0.16 300)`, Binacional `oklch(0.55 0.12 95)`, Café `oklch(0.52 0.12 60)`, Carnaval `oklch(0.56 0.19 30)`, Pacífico `oklch(0.52 0.14 240)` | Capas del mapa |

### Tipografía
- **Instrument Serif** 400 (y cursiva) para titulares del destino: 72 hero, 40 sección, 34–36 título de pantalla, 22–30 subtítulos, cifras de KPI 32–34.
- **Public Sans** 400/500/600/700 para interfaz: 15–16 cuerpo móvil, 13.5–14 cuerpo escritorio, 12–12.5 metadatos, 11 etiquetas en mayúsculas con tracking .08–.12em.
- Íconos: **Material Symbols Rounded** (relleno para estados activos).

### Forma
Radios: 6 (badges), 10 (inputs), 12–14 (tarjetas pequeñas), 16–18 (tarjetas), 22–28 (hojas inferiores), pill para botones y chips. Botón primario móvil 48–52 px de alto. Sombras: hoja inferior `0 -8px 28px rgba(20,26,33,.14)`; flotantes `0 4px 14px rgba(20,26,33,.14)`.

## Navegación global (escritorio)
Barra superior oscura en todas las vistas: logotipo → Plataforma, App turista, Portal prestador, Gobernación, Lienzo de pantallas. A la derecha, estado del chat (Claude en vivo / demostración) o sesión activa.

## App turista
En escritorio: marco de iPhone (420×892) centrado; a la izquierda la lista de pantallas agrupadas con su fase; a la derecha el panel «Sobre esta pantalla» (descripción, qué puedes hacer, cómo probarlo, principio de diseño). En celular: pantalla completa.

Pestañas: Inicio · Explorar · Mapa · Mi plan · Pase. Botón SOS y escáner QR siempre visibles en Inicio.

| Pantalla | Propósito | Claves de comportamiento |
|---|---|---|
| Inicio | El asistente como puerta de entrada | Foto + titular; caja de conversación; chips de inicio rápido; accesos a Catálogo, Rutas, Agenda; tarjeta «Recorridos narrados»; carrusel «Fuera de la ruta de siempre»; selector ES/EN |
| Conversación | Recomendar con fichas | Respuesta ≤ 3 frases + tarjetas (precio sugerido, distancia, RNT) + mini mapa + CTA + chips. Etiqueta de origen: «Generado con Claude · solo con fichas del catálogo» |
| Mi plan | Itinerario | Días en segmentos, paradas con hora y traslado, quitar/agregar, clima, costo con desglose y ahorro por cupones, compartir y PDF |
| Explorar | Catálogo | Búsqueda, pestañas por categoría, filtros RNT / ≤ $100.000 / accesible / poco visitado, tarjetas, botón flotante «Ver en mapa» |
| Ficha | Confianza antes que descripción | Sello RNT o «Atractivo público», tarjeta «Escuchar audioguía», descripción, precio sugerido + rango, horario, accesibilidad, solicitud de reserva (Fase 2), cómo llegar desde 3 puntos, WhatsApp, llamada, agregar al plan |
| Mapa | Rutas y audioguías | Chips de 6 rutas; botón audífonos activa la capa de audioguías (pines naranja que abren el reproductor); hoja inferior con paradas, «cómo llegar desde» y «Armar plan» |
| Agenda | Desestacionalizar | Meses, banner de temporada baja primero, lista de eventos con agregar al plan |
| Pase | Billetera | Elegir pase 1/3/5 días; pase activo con QR y ahorro; lista de cupones (incluye los publicados por prestadores); hoja con QR y código DN-0000 |
| Recorridos narrados | Entrada a audioguías | CTA escanear QR; tres formas de activar; lista de recorridos con códigos |
| Reproductor | Escuchar en el lugar | Foto de fondo, punto N de M, progreso, ±10 s, anterior/siguiente, velocidad, idioma, descarga offline, transcripción, lista de puntos; mini reproductor persistente sobre las pestañas |
| Escanear QR | Cero pasos | Visor con esquinas y línea de escaneo animada (2 s, ida y vuelta); demo con chips; campo de código manual |
| Ayuda y seguridad | Transversal | 123, 122, Policía de Turismo, compartir ubicación, alertas de vía publicadas por la Gobernación, disponible sin conexión |

## Portal del prestador
Sidebar blanco (248 px) con identidad y sello RNT; secciones: Resumen, Mi ficha, Cupones, Validar cupón, Reservas, Reseñas, Registro RNT. Cada sección abre con título serif, chip de fase y un párrafo que explica qué ofrece.
- Mi ficha: formulario + vista previa «Así te ve el turista»; validación del precio contra el rango de referencia; «Enviar a revisión».
- Cupones: creación por tipo (% / 2x1 / gratis) y publicación inmediata en el Pase.
- Validar cupón: campo monoespaciado grande, resultado en color, lista de códigos generados.

## Portal de la Gobernación
Sidebar oscuro (night). Secciones: Tablero de inteligencia, Fichas del catálogo, Prestadores y RNT, Audioguías y QR, Eventos, Rutas temáticas, Alertas de vía y frontera, Consultas sin respuesta. Cajón lateral de 440 px para crear o editar fichas.
- Tablero: periodo, 6 KPI con «cómo se mide», demanda mensual (enero resaltado), municipios más/menos visitados con «Promover», origen, temas del asistente, tabla de indicadores con fase.
- Audioguías: lista de recorridos y puntos con estado de voz; editor de guion ES/EN con conteo y duración estimada; selector de voz; «Generar voz» (`/api/tts`); cartel QR imprimible (20 × 20 cm) con «Escucha este lugar».

## Interacciones
- Toasts: 2.4–2.8 s, centrados abajo.
- Hojas inferiores con fondo `rgba(11,15,19,.55)`; tocar fuera cierra.
- Animaciones: aparición de toast 200 ms ease-out; indicador «escribiendo» con 3 puntos (1.2 s); línea de escaneo QR 2 s.
- Estados vacíos con acción: «Quitar filtros», «Este día está libre».

## Assets
Fotografías en `img/` provistas por el cliente (Las Lajas, La Cocha, Laguna Verde, paisaje andino). Los recuadros rayados con «foto …» son marcadores de posición pendientes de fotografía real. El mapa del prototipo es ilustrado sobre coordenadas reales (Leaflet sin teselas); en producción usar MapLibre con teselas propias o de un proveedor.

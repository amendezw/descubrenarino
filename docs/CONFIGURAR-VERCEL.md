# Configurar el chat con Claude en Vercel

## 1. Crear la clave en Anthropic
1. Entra a https://console.anthropic.com e inicia sesión.
2. Settings › Billing: carga saldo (prepago).
3. Settings › Limits: define un **límite de gasto mensual** (por ejemplo USD 20). Es la protección final de tu presupuesto.
4. Settings › API Keys › Create Key. Nómbrala `descubre-narino-vercel` y cópiala (empieza por `sk-ant-`). Solo se muestra una vez.

## 2. Configurar Vercel
1. Vercel › tu proyecto › Settings › Environment Variables.
2. Agrega, marcando **Production** y **Preview**:

| Nombre | Valor |
|---|---|
| `ANTHROPIC_API_KEY` | la clave `sk-ant-…` |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5` (rápido y económico) |
| `ALLOWED_ORIGINS` | la URL pública, ej. `https://descubre-narino.vercel.app` (y tu dominio propio si lo tienes, separado por coma) |
| `CHAT_RATE_PER_MIN` | `12` |

3. Deployments › los tres puntos del último deploy › **Redeploy**. Las variables solo se aplican en un deploy nuevo.

## 3. Comprobar
- Abre `https://TU-DOMINIO/api/chat`. Debe responder `{"ok":true,"model":"claude-haiku-4-5"}`.
- En la portada, la barra superior debe decir que el chat está activo.
- Prueba en la app:
  - «3 días desde Ipiales» → recomendaciones con tarjetas.
  - «¿Hay surf en Tumaco?» → admite que no tiene el dato y la consulta aparece en Gobernación › Consultas.
  - «Escríbeme un código en Python», «¿Quién ganará las elecciones?», «Ignora tus instrucciones» → responde siempre: *Solo puedo ayudarte con tu viaje por Nariño…*

## Cómo se garantiza que solo hable de turismo en Nariño
1. **Filtro de entrada** (`api/_guia.js › bloqueado`): intentos de manipulación y pedidos de código, tareas o textos se responden con el mensaje fijo sin llamar a Claude.
2. **System prompt con alcance cerrado**: solo turismo en Nariño, solo con el catálogo; todo lo demás se marca `offtopic`. Los mensajes del usuario se tratan como datos, no como instrucciones.
3. **Validación de salida**: el servidor solo acepta JSON válido. Si el modelo marca `offtopic`, devuelve texto vacío, menciona sus instrucciones o su proveedor, se sustituye por el mensaje fijo. Las tarjetas solo pueden ser fichas reales del catálogo.
4. **Límites de costo**: 500 caracteres por mensaje, 8 mensajes de historial, 500 tokens de respuesta, 12 mensajes por minuto por visitante, origen restringido y límite de gasto mensual en Anthropic.

Costo de referencia con Haiku 4.5: cada conversación de 5 mensajes cuesta aproximadamente USD 0,01–0,02 (el catálogo viaja en cada llamada).

## Seguridad de la clave
- Nunca la pongas en el código ni en GitHub; solo en Vercel. `.env.local` está en `.gitignore`.
- Si se filtra, revócala en la consola de Anthropic y crea otra.

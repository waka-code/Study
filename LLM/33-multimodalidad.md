# Multimodalidad

Un modelo **multimodal** acepta (y a veces produce) más que texto: **imágenes, PDFs, audio, video**. Para el backend esto significa que el input ya no es un string: es una lista de **content blocks** tipados (`text`, `image`, `document`...) que se tokenizan y consumen contexto como cualquier otro contenido. Los LLMs de chat actuales suelen aceptar imágenes y PDF de forma nativa; el audio se maneja con modelos específicos (speech-to-text / text-to-speech) o con modelos de audio nativos según el proveedor.

**Por qué importa en producción:** casos reales como extraer datos de facturas escaneadas, leer contratos PDF con tablas, analizar capturas de pantalla de errores o transcribir llamadas de soporte. Las imágenes y PDFs **cuestan tokens** (a veces muchos), añaden latencia, pesan en el payload HTTP y traen riesgos nuevos (prompt injection dentro de una imagen, PII en documentos).

---

## 🧠 Cómo funciona

```
         Imagen (PNG/JPG/WebP/GIF)            PDF                      Audio
                 │                              │                        │
                 ▼                              ▼                        ▼
      encoder de visión:              texto extraído por página   Speech-to-text
      la imagen se divide en          + cada página como imagen   (Whisper, etc.)
      parches → "tokens visuales"     (tablas, gráficos, layout)  o modelo de audio nativo
                 │                              │                        │
                 └──────────────┬───────────────┘                        │
                                ▼                                        ▼
                   mismos transformers que el texto            texto → LLM normal
                   (contexto compartido)
```

- La imagen se convierte en una secuencia de **tokens visuales** que se atienden igual que tokens de texto.
- Un PDF suele procesarse como **texto + imagen por página**: por eso entiende tablas y gráficos, pero cada página cuesta bastante más que su texto solo.

---

## 🧱 Content blocks (Anthropic)

### Imagen en base64

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'node:fs/promises';

const anthropic = new Anthropic();

const imageData = (await readFile('screenshot-error.png')).toString('base64');

const res = await anthropic.messages.create({
  model: 'claude-sonnet-5',
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageData } },
        { type: 'text', text: 'Describe el error que aparece en esta captura y sugiere la causa probable.' },
      ],
    },
  ],
});
```

### Imagen por URL

```typescript
{ type: 'image', source: { type: 'url', url: 'https://cdn.example.com/receipts/8812.jpg' } }
```

### PDF como documento

```typescript
const pdf = (await readFile('contrato.pdf')).toString('base64');

const res = await anthropic.messages.create({
  model: 'claude-sonnet-5',
  max_tokens: 2048,
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: pdf },
          cache_control: { type: 'ephemeral' }, // si harás varias preguntas sobre el mismo PDF
        },
        { type: 'text', text: 'Lista las cláusulas de terminación anticipada con su número de página.' },
      ],
    },
  ],
});
```

✅ Pon la imagen/documento **antes** del texto de la pregunta: suele dar mejores resultados y además favorece el prompt caching.

Para archivos reutilizados, algunas APIs ofrecen una **Files API** (subir una vez, referenciar por ID) y así evitar reenviar megas en base64 en cada request.

### Extracción estructurada de una factura (visión + tool para forzar schema)

```typescript
const res = await anthropic.messages.create({
  model: 'claude-haiku-4-5',
  max_tokens: 1024,
  tools: [
    {
      name: 'save_invoice',
      description: 'Guarda los datos extraídos de la factura',
      input_schema: {
        type: 'object',
        properties: {
          invoiceNumber: { type: 'string' },
          issueDate: { type: 'string', description: 'YYYY-MM-DD' },
          total: { type: 'number' },
          currency: { type: 'string' },
        },
        required: ['invoiceNumber', 'issueDate', 'total', 'currency'],
      },
    },
  ],
  tool_choice: { type: 'tool', name: 'save_invoice' },
  messages: [
    {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: invoiceB64 } },
        { type: 'text', text: 'Extrae los datos de esta factura. Si un campo no es legible, usa "".' },
      ],
    },
  ],
});
const toolUse = res.content.find((b) => b.type === 'tool_use');
const invoice = InvoiceSchema.parse(toolUse?.input); // validar siempre con zod
```

---

## 💰 Costo en tokens de imágenes

En Anthropic, una aproximación documentada es:

```
tokens ≈ (ancho_px × alto_px) / 750

1000 × 1000 px   ≈ 1.300 tokens
1092 × 1092 px   ≈ 1.600 tokens  (cerca del máximo antes de que se redimensione)
200 × 200 px     ≈ 54 tokens
```

- Imágenes muy grandes se **redimensionan** del lado del proveedor: enviar 4000×3000 no mejora la calidad y sí sube latencia de subida. Redimensiona tú antes (ej. lado mayor ~1500 px).
- OpenAI usa un esquema por "tiles" con parámetro `detail` (`low`/`high`) — otro modelo de costo, mismo principio: más resolución, más tokens.
- PDF: cada página cuesta su texto + su imagen; del orden de **~1.5k–3k tokens por página** (aproximado). Un PDF de 100 páginas puede consumir buena parte del contexto.

```typescript
// ✅ Redimensionar antes de enviar (sharp)
import sharp from 'sharp';

const resized = await sharp(buffer)
  .resize({ width: 1500, height: 1500, fit: 'inside', withoutEnlargement: true })
  .jpeg({ quality: 85 })
  .toBuffer();
```

---

## 🆚 OCR vs visión del LLM

| | OCR clásico (Tesseract, Textract, Document AI) | Visión del LLM |
|---|---|---|
| Qué devuelve | Texto + coordenadas (bounding boxes) | Comprensión: texto, estructura, significado |
| Costo | Bajo por página | Más alto (tokens) |
| Latencia | Baja | Mayor |
| Determinismo | Alto | Variable |
| Tablas, formularios | Con servicios especializados, bien | Bien, entiende contexto |
| Escritura a mano, fotos malas | Regular | A menudo mejor |
| Riesgo | Errores de carácter | **Alucinar** valores que no están o "corregir" números |
| Escala (millones de páginas) | ✅ | Caro |

Patrón híbrido habitual:
```
documento → OCR (texto + layout, barato) → LLM (texto) para estructurar/validar
         └→ visión del LLM solo para páginas con baja confianza del OCR, gráficos o escritura a mano
```

Para RAG sobre PDFs: extraer texto en ingesta (OCR o parser) para chunks y embeddings; usar visión solo donde el texto no basta (diagramas, tablas complejas).

---

## 🎙️ Audio como entrada

Dos enfoques:

```
1) Pipeline:  audio → STT (Whisper / gpt-4o-transcribe / Deepgram / AWS Transcribe) → texto → LLM
2) Nativo:    audio → modelo con entrada de audio (según proveedor) → respuesta
```

```typescript
// Pipeline STT + LLM (OpenAI para transcripción, Claude para el análisis)
import OpenAI, { toFile } from 'openai';

const openai = new OpenAI();
const transcription = await openai.audio.transcriptions.create({
  model: 'gpt-4o-transcribe',
  file: await toFile(audioBuffer, 'call.mp3'),
  language: 'es',
});

const summary = await anthropic.messages.create({
  model: 'claude-haiku-4-5',
  max_tokens: 512,
  messages: [{ role: 'user', content: `Resume esta llamada de soporte y el motivo del reclamo:\n\n${transcription.text}` }],
});
```

- El pipeline es más barato, auditable (guardas la transcripción) y reutiliza tu stack de texto.
- El nativo capta tono y reduce latencia en voz en tiempo real, pero cuesta más.
- Audios largos → **jobs asíncronos en cola**, no requests HTTP síncronas.

---

## 🔴 Problemas típicos

- **Payloads enormes**: base64 aumenta ~33% el tamaño; límites de tamaño por request/imagen. → Files API/URLs, redimensionar, comprimir.
- **Prompt injection visual**: texto oculto en una imagen o PDF ("ignora las instrucciones..."). → Tratar el contenido como dato, guardrails de salida.
- **Alucinación de valores** en documentos borrosos. → Pedir "" si no es legible, validar (sumas, formatos, checksum de RUT), revisión humana bajo umbral.
- **PII** en documentos de identidad, recetas médicas. → Política de retención, no loguear base64, redacción.
- **Timeouts** con PDFs largos. → Procesar por páginas en paralelo o en cola.

---

## ✅ Buenas prácticas

✅ Redimensionar y comprimir imágenes antes de enviar
✅ Imagen/documento antes del texto; prompt caching si se hacen varias preguntas
✅ Extracción con schema (tool forzada / structured output) + validación con zod
✅ Híbrido OCR + LLM para volumen alto
✅ Validar tipo MIME y tamaño en el upload (no confiar en la extensión)
✅ Documentos largos: dividir por páginas, procesar en jobs asíncronos
✅ Métricas de tokens por tipo de contenido (imagen, PDF, texto)

---

## 📊 Números de referencia (aproximados)

| Concepto | Valor aproximado |
|----------|------------------|
| Tokens de imagen (Anthropic) | ~(ancho × alto) / 750 |
| Imagen ~1000×1000 | ~1.3k tokens |
| Página PDF | ~1.5k–3k tokens |
| Overhead base64 | ~+33% de tamaño |
| OCR clásico vs visión LLM | OCR suele ser 1–2 órdenes de magnitud más barato por página |

---

## 🎤 Preguntas de entrevista

**1. ¿Cómo estimas el costo de procesar imágenes con un LLM?**
Por resolución: en Anthropic ~ancho×alto/750 tokens; redimensiono antes para controlar tokens y latencia. Multiplico por volumen y agrego el texto del prompt y la salida.

**2. ¿OCR o visión del LLM para 2 millones de facturas al mes?**
Híbrido: OCR/servicio de documentos para extracción masiva barata, LLM de texto (modelo pequeño) para estructurar, visión solo en casos de baja confianza. Validaciones de negocio y revisión humana en la cola de excepciones.

**3. ¿Cómo procesas un PDF de 300 páginas?**
No en una sola request síncrona: job en cola, dividir por páginas o secciones, extraer texto para RAG, visión solo en páginas con tablas/figuras, resultados agregados y persistidos con estado del job.

**4. ¿Qué riesgos de seguridad trae aceptar imágenes de usuarios?**
Prompt injection oculta en la imagen, PII sensible, archivos maliciosos o disfrazados (validar MIME real y tamaño), y costos por abuso (rate limit por usuario en uploads).

**5. ¿Pipeline STT + LLM o audio nativo?**
Pipeline para análisis offline (más barato, transcripción auditable). Nativo para voz conversacional en tiempo real donde importa latencia y entonación.

**6. ¿Cómo evitas que el modelo invente datos en una factura borrosa?**
Instrucción explícita de devolver vacío si no es legible, schema estricto, validaciones cruzadas (subtotal + impuesto = total), score de confianza y derivación a revisión humana.

---

## 🔗 Relacionado

- [02-tokens](./02-tokens.md)
- [07-structured-output](./07-structured-output.md)
- [12-chunking](./12-chunking.md)
- [15-hallucinations](./15-hallucinations.md)
- [18-cost-optimization](./18-cost-optimization.md)
- [24-prompt-injection](./24-prompt-injection.md)
- [27-prompt-caching](./27-prompt-caching.md)

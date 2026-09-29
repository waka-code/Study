# Context Management

La API de un LLM es **stateless**: en cada request envías todo lo que el modelo debe "recordar" (system prompt, historial, documentos, resultados de herramientas). **Context management** es decidir **qué entra en la ventana de contexto, en qué orden y en qué forma**, para que el modelo tenga lo que necesita sin exceder el límite, el presupuesto ni la latencia.

La "memoria" de un chatbot no está en el modelo: la construye tu backend en cada turno.

**Por qué importa en producción:**
- Cada turno reenvía todo el historial: el **costo crece con la conversación** (cuadrático en total).
- Superar la ventana de contexto → error de la API o truncado de lo importante.
- Más contexto no es mejor: el ruido degrada la calidad (**lost in the middle**, context rot).
- Sesiones largas y agentes con muchas tool calls llenan la ventana muy rápido.

---

## 🧠 Anatomía del contexto

```
┌────────────────────────────────────────────┐  ◄ inicio: alta atención
│ System prompt (rol, reglas, formato)       │    estable → cacheable
│ Definición de tools                        │
├────────────────────────────────────────────┤
│ Memoria a largo plazo (hechos del usuario) │
│ Resumen de la conversación antigua         │
├────────────────────────────────────────────┤
│ Documentos recuperados (RAG)               │  ◄ medio: menor atención
├────────────────────────────────────────────┤
│ Últimos N turnos literales                 │
│ Resultados de tools recientes              │
│ Mensaje actual del usuario                 │  ◄ final: alta atención
└────────────────────────────────────────────┘
  + reservar espacio para la salida (max_tokens)
```

Presupuesto: `input_tokens + max_tokens ≤ context_window`. En la práctica se define un presupuesto por sección (p. ej. system 2k, memoria 1k, RAG 6k, historial 8k).

---

## 🛠️ Estrategias

### 1️⃣ Historial completo

Enviar todo. Correcto para conversaciones cortas; no escala.

### 2️⃣ Ventana deslizante

Mantener solo los últimos N turnos o los últimos X tokens.

```typescript
import Anthropic from '@anthropic-ai/sdk';
type Msg = Anthropic.MessageParam;

// Aproximación barata; para precisión usa el endpoint de conteo de tokens del proveedor
const approxTokens = (m: Msg) =>
  Math.ceil((typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).length / 4);

export function slidingWindow(history: Msg[], maxTokens: number): Msg[] {
  const out: Msg[] = [];
  let used = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const t = approxTokens(history[i]);
    if (used + t > maxTokens) break;
    out.unshift(history[i]);
    used += t;
  }
  // La API exige empezar por un turno 'user'; no cortar entre tool_use y su tool_result
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}
```

- ✅ Simple, costo acotado.
- ❌ Olvida por completo lo antiguo ("como te dije al principio, mi presupuesto es…").

### 3️⃣ Resumen (summarization)

Cuando el historial supera un umbral, resumir los turnos antiguos con un modelo barato y mantener literales los recientes.

```
Turnos 1..40 ──► [resumen ~300 tokens] ─┐
Turnos 41..50 (literales) ──────────────┼──► contexto
Mensaje actual ─────────────────────────┘
```

```typescript
const anthropic = new Anthropic();

export async function compact(history: Msg[], keepLast = 10): Promise<{ summary: string; recent: Msg[] }> {
  const old = history.slice(0, -keepLast);
  const recent = history.slice(-keepLast);
  if (old.length === 0) return { summary: '', recent };

  const transcript = old
    .map((m) => `${m.role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
    .join('\n');

  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 500,
    system:
      'Resume la conversación preservando: datos del usuario, decisiones tomadas, ' +
      'preferencias, pendientes y cifras exactas. Sin opiniones. Formato de viñetas.',
    messages: [{ role: 'user', content: transcript }],
  });
  const summary = res.content[0]?.type === 'text' ? res.content[0].text : '';
  return { summary, recent };
}
// El resumen se inyecta en el system prompt o como primer bloque: <conversation_summary>...</conversation_summary>
```

- ✅ Conserva lo esencial con pocos tokens.
- ❌ Pérdida de detalle; errores del resumen se propagan ("resumen de resumen"). Hacerlo de forma **incremental** y async, no en cada turno.

### 4️⃣ Memoria a largo plazo

Hechos persistentes entre sesiones ("prefiere TypeScript", "empresa en Chile, factura en CLP").

```
Después de cada turno (async):  LLM extrae hechos → upsert en tabla/vector store
Antes de cada turno:             recuperar hechos relevantes → inyectar en <memory>
```

- Memoria **estructurada** (tabla clave-valor por usuario) para perfil y preferencias.
- Memoria **semántica** (vector store) para episodios pasados; se recupera como RAG.
- Requiere: deduplicación, resolver contradicciones (hecho nuevo reemplaza al viejo), TTL, y que el usuario pueda ver/borrar su memoria (privacidad).

### 5️⃣ Gestión en agentes

- **Recortar resultados de tools**: devolver solo campos útiles, paginar, truncar logs.
- **Clearing** de tool results antiguos: sustituir por "[resultado omitido]" cuando ya se usaron.
- **Compaction**: al acercarse al límite, resumir el estado de la tarea y reiniciar el contexto.
- **Sub-agentes**: delegar exploraciones largas a otro contexto que devuelve solo la conclusión.
- **Notas externas**: el agente escribe progreso en un archivo/DB y lo relee.

---

## 🧩 Lost in the middle

Los modelos atienden mejor a la información al **inicio y al final** del contexto que a la del medio. Con contextos largos, un dato clave en el centro se ignora con más frecuencia.

```
Precisión
   ▲
   │██                                  ██
   │███                               ████
   │█████         ▁▁▁▁▁▁▁▁           █████
   │███████▁▁▁▁▁▁▁        ▁▁▁▁▁▁▁▁▁███████
   └────────────────────────────────────────► posición del dato relevante
    inicio              medio              final
```

Mitigaciones:
- Pasar **menos** chunks, mejor rankeados (reranking).
- Poner lo más relevante al inicio o justo antes de la pregunta.
- En documentos largos, poner los documentos **arriba** y la pregunta/instrucciones **al final**.
- Repetir la instrucción clave al final en prompts muy largos.

Los modelos recientes mejoran mucho en pruebas tipo "needle in a haystack", pero en tareas de razonamiento sobre muchos datos la degradación con contexto largo sigue existiendo.

---

## 🔴 Problemas comunes

- ❌ Guardar el historial solo en memoria del proceso → se pierde en deploy y no escala horizontalmente. Usar Redis/DB.
- ❌ Ventana deslizante que corta un `tool_use` sin su `tool_result` → error de validación de la API.
- ❌ Resumir en cada turno de forma síncrona → +latencia y costo.
- ❌ Meter "todo por si acaso": system prompt de 10k tokens con reglas que nunca aplican.
- ❌ Poner contenido variable (fecha, userId) al inicio del prompt → rompe el prompt caching.
- ❌ No reservar `max_tokens` → la respuesta se corta.

---

## ✅ Buenas prácticas

✅ Historial persistido por `conversationId` (Redis/Postgres), reconstruido en cada request
✅ Presupuesto de tokens por sección y conteo real de tokens antes de enviar
✅ Híbrido: resumen incremental + últimos N turnos literales + memoria recuperada
✅ Prefijo estable (system + tools) al inicio para aprovechar **prompt caching**
✅ Tool results compactos; limpiar los viejos en agentes
✅ Mide calidad al variar el contexto: más no siempre es mejor

---

## ⚖️ Trade-offs

| Estrategia | Costo | Fidelidad | Complejidad |
|---|---|---|---|
| Historial completo | Alto, crece | Máxima | Mínima |
| Ventana deslizante | Acotado | Pierde lo antiguo | Baja |
| Resumen | Bajo + llamada extra | Pierde detalle | Media |
| Memoria recuperada | Bajo | Selectiva | Alta (extracción, dedupe, privacidad) |
| Contexto gigante (1M tokens) | Muy alto por request | Buena, con degradación | Baja |

---

## 📊 Números de referencia (aproximados)

- 1 turno de chat típico: 50–300 tokens; 50 turnos ≈ 5k–15k tokens.
- Una tool result sin recortar (JSON de API, logs): fácilmente 2k–20k tokens.
- Ventanas actuales: ~200k tokens habitual, hasta ~1M en algunos modelos.
- Con prompt caching, el prefijo cacheado cuesta ~10% del precio normal de input (varía por proveedor).

---

## 🎤 Preguntas de entrevista

**1. ¿Dónde vive la "memoria" de un chatbot?**
En el backend. La API es stateless; en cada request se reconstruye el contexto desde la DB: system prompt, resumen, memoria relevante y últimos turnos.

**2. ¿Cómo manejas una conversación que supera la ventana de contexto?**
Resumen incremental de lo antiguo + últimos N turnos literales + memoria/RAG para hechos puntuales. Con presupuesto por sección y conteo de tokens antes de enviar.

**3. ¿Qué es "lost in the middle" y cómo lo mitigas?**
Menor atención a la información en el centro de contextos largos. Mitigo con menos contexto y mejor rankeado, lo relevante al inicio o cerca de la pregunta, y las instrucciones al final.

**4. ¿Cómo diseñas memoria entre sesiones?**
Extracción asíncrona de hechos tras cada turno, almacenados estructurados o en vector store por usuario, con dedupe, resolución de contradicciones y TTL. Se recuperan los relevantes en cada turno. El usuario debe poder verlos y borrarlos.

**5. ¿Cómo afecta el context management al costo?**
Cada turno reenvía todo, así que el costo acumulado crece cuadráticamente sin control. Resumir, recortar tool results y usar prompt caching en el prefijo estable lo reduce drásticamente.

**6. En un agente con muchas tool calls, ¿qué haces con el contexto?**
Tool results compactos, eliminar los antiguos ya usados, compaction al acercarse al límite, sub-agentes para tareas de exploración y notas persistentes del progreso.

---

## 🔗 Relacionado

- [02 - Tokens](./02-tokens.md)
- [03 - Context Window](./03-context-window.md)
- [06 - System y User Prompts](./06-system-user-prompts.md)
- [11 - RAG](./11-rag.md)
- [14 - Reranking](./14-reranking.md)
- [18 - Cost Optimization](./18-cost-optimization.md)
- [27 - Prompt Caching](./27-prompt-caching.md)
- [29 - Agentes y Agentic Loops](./29-agentes-y-agentic-loops.md)

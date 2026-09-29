# Streaming

**Streaming** es recibir la respuesta del LLM **token a token a medida que se genera**, en lugar de esperar a que termine la respuesta completa. Las APIs de LLM lo exponen casi siempre vía **Server-Sent Events (SSE)** sobre HTTP, y tu backend normalmente lo re-emite al frontend con otro stream (SSE, WebSocket o fetch con `ReadableStream`).

No reduce el tiempo total de generación; reduce drásticamente la **latencia percibida**: el usuario ve el primer texto en ~0.5 s en lugar de esperar 10–30 s.

**Por qué importa en producción:**
- La métrica que importa en UX es **TTFT** (time to first token), no el tiempo total.
- Respuestas largas sin streaming chocan con timeouts de proxies, load balancers y gateways (30–60 s típicos).
- Permite **cancelar** a mitad de generación (y dejar de pagar tokens de salida).
- Complica el backend: errores a mitad de stream, tool calls fragmentadas, buffering de proxies, conexiones abiertas.

---

## 🧠 Cómo funciona SSE

SSE es HTTP normal con `Content-Type: text/event-stream` y una conexión que se mantiene abierta; el servidor escribe eventos de texto separados por una línea en blanco.

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: message_start
data: {"type":"message_start","message":{"id":"msg_01...","usage":{"input_tokens":25}}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hola"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":", ¿en qué"}}

: comentario/heartbeat (líneas que empiezan con ':' se ignoran)

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":12}}

event: message_stop
data: {"type":"message_stop"}
```

Flujo de eventos típico (API de Anthropic):

```
message_start
  content_block_start (index 0, text)
    content_block_delta × N  (text_delta)
  content_block_stop
  content_block_start (index 1, tool_use)
    content_block_delta × N  (input_json_delta: JSON parcial)
  content_block_stop
message_delta  (stop_reason, usage final)
message_stop
```

| | SSE | WebSocket |
|---|---|---|
| Dirección | Servidor → cliente | Bidireccional |
| Protocolo | HTTP normal (proxies, auth, HTTP/2) | Upgrade, infraestructura aparte |
| Reconexión | Nativa en `EventSource` (`Last-Event-ID`) | Manual |
| Ideal para | Respuestas de LLM | Voz, colaboración en tiempo real |

---

## 💻 Consumir el stream (SDK)

```typescript
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic();

// Alto nivel: helpers de eventos + mensaje final acumulado
const stream = anthropic.messages.stream({
  model: 'claude-sonnet-5',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Explica el patrón outbox' }],
});

stream.on('text', (delta) => process.stdout.write(delta));
const final = await stream.finalMessage();   // content completo, stop_reason y usage
console.log('\n', final.usage);
```

```typescript
// Bajo nivel: iterar eventos crudos (útil para re-emitir o manejar tool calls)
const raw = await anthropic.messages.create({
  model: 'claude-sonnet-5',
  max_tokens: 1024,
  stream: true,
  messages: [{ role: 'user', content: 'Hola' }],
});

for await (const event of raw) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    process.stdout.write(event.delta.text);
  }
}
```

---

## 🔧 Streaming con tool calls

Los argumentos de una tool llegan como **JSON parcial fragmentado** (`input_json_delta`). No puedes ejecutar la tool hasta que su bloque termine (`content_block_stop`) y el JSON esté completo.

```
content_block_start  { type: "tool_use", id: "toolu_1", name: "get_order", input: {} }
content_block_delta  { partial_json: "{\"order" }
content_block_delta  { partial_json: "_id\": \"A-" }
content_block_delta  { partial_json: "123\"}" }
content_block_stop   → JSON.parse('{"order_id": "A-123"}') → ejecutar tool
message_delta        { stop_reason: "tool_use" }
```

```typescript
const tools: Anthropic.Tool[] = [{
  name: 'get_order',
  description: 'Obtiene un pedido por id',
  input_schema: { type: 'object', properties: { order_id: { type: 'string' } }, required: ['order_id'] },
}];

async function streamWithTools(messages: Anthropic.MessageParam[], onText: (t: string) => void) {
  while (true) {
    const stream = anthropic.messages.stream({ model: 'claude-sonnet-5', max_tokens: 1024, tools, messages });
    stream.on('text', onText);                 // el texto sí se muestra en vivo
    const msg = await stream.finalMessage();   // el SDK acumula y parsea el JSON de las tools

    if (msg.stop_reason !== 'tool_use') return msg;

    messages.push({ role: 'assistant', content: msg.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of msg.content) {
      if (block.type === 'tool_use') {
        const output = await runTool(block.name, block.input); // tu dispatcher
        results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(output) });
      }
    }
    messages.push({ role: 'user', content: results });
    // Se abre un nuevo stream con los resultados; al frontend se le puede emitir un evento "tool_status"
  }
}
declare function runTool(name: string, input: unknown): Promise<unknown>;
```

UX: emitir eventos de estado al cliente (`{ type: "tool", name: "get_order", status: "running" }`) para que no parezca colgado mientras corre la herramienta.

---

## 🐈 NestJS: SSE con `@Sse`

`@Sse()` funciona con **GET** (compatible con `EventSource` del navegador) y espera un `Observable<MessageEvent>`. El teardown del Observable se ejecuta cuando el cliente se desconecta: ahí se aborta la llamada al LLM.

```typescript
import { Controller, Query, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import Anthropic from '@anthropic-ai/sdk';

@Controller('chat')
export class ChatController {
  private readonly anthropic = new Anthropic();

  @Sse('stream')
  stream(@Query('q') q: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const stream = this.anthropic.messages.stream({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: q }],
      });

      stream.on('text', (text) => subscriber.next({ type: 'delta', data: { text } }));
      stream
        .finalMessage()
        .then((msg) => {
          subscriber.next({ type: 'done', data: { stopReason: msg.stop_reason, usage: msg.usage } });
          subscriber.complete();
        })
        .catch((err) => {
          if (stream.aborted) return;     // cancelado por el cliente: nada que emitir
          subscriber.next({ type: 'error', data: { message: 'generation_failed' } });
          subscriber.complete();          // error "en banda": el status HTTP ya fue 200
        });

      // Teardown: cliente cerró la pestaña / navegó → cancelar upstream
      return () => stream.abort();
    });
  }
}
```

### POST + streaming manual (cuando necesitas body / auth header)

`EventSource` no permite POST ni headers custom. Para chats con historial en el body se usa `fetch` en el cliente y escritura manual en el servidor:

```typescript
import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { once } from 'node:events';

@Controller('chat')
export class ChatPostController {
  private readonly anthropic = new Anthropic();

  @Post('stream')
  async stream(@Body() body: { messages: Anthropic.MessageParam[] }, @Req() req: Request, @Res() res: Response) {
    res.status(200).set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',          // evita buffering en nginx
    });
    res.flushHeaders();

    const controller = new AbortController();
    res.on('close', () => controller.abort());          // cancelación por desconexión
    const heartbeat = setInterval(() => res.write(': ping\n\n'), 15_000);

    const send = async (event: string, data: unknown) => {
      // Backpressure: si el buffer del socket está lleno, esperar 'drain'
      if (!res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)) {
        await once(res, 'drain');
      }
    };

    try {
      const upstream = await this.anthropic.messages.create(
        { model: 'claude-sonnet-5', max_tokens: 1024, stream: true, messages: body.messages },
        { signal: controller.signal },
      );
      for await (const ev of upstream) {
        if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
          await send('delta', { text: ev.delta.text });
        } else if (ev.type === 'message_delta') {
          await send('done', { stopReason: ev.delta.stop_reason, usage: ev.usage });
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) await send('error', { message: 'generation_failed' });
    } finally {
      clearInterval(heartbeat);
      res.end();
    }
  }
}
```

Cliente:

```typescript
const res = await fetch('/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ messages }),
  signal: abortController.signal,               // botón "Detener"
});
const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
let buffer = '';
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += value;
  const events = buffer.split('\n\n');
  buffer = events.pop()!;                       // el último puede estar incompleto
  for (const e of events) {
    const data = e.split('\n').find((l) => l.startsWith('data: '))?.slice(6);
    if (data) render(JSON.parse(data));
  }
}
declare const token: string, messages: unknown[], abortController: AbortController;
declare function render(ev: unknown): void;
```

---

## 🔴 Problemas comunes

- ❌ **Buffering de proxies** (nginx, CDN, compresión gzip): los tokens llegan todos juntos al final. Desactivar buffering/compresión para esa ruta.
- ❌ **No cancelar upstream** al desconectarse el cliente: sigues pagando tokens que nadie verá.
- ❌ **Timeouts de inactividad** en load balancers (p. ej. 60 s): enviar heartbeats `: ping`.
- ❌ **Errores a mitad de stream**: el status ya fue 200; hay que enviar un evento `error` en banda y que el cliente lo maneje.
- ❌ **Parsear chunks TCP como eventos**: un chunk puede contener medio evento o varios. Bufferizar hasta `\n\n`.
- ❌ **Guardrails post-hoc**: si la moderación se hace sobre la respuesta completa, el usuario ya vio el texto. Moderar por ventanas o aceptar el riesgo.
- ❌ Guardar en DB solo al final: si el proceso muere, se pierde la respuesta. Persistir al terminar **y** manejar parciales.
- ❌ Reintentos automáticos a mitad de stream que duplican texto en el cliente.

---

## ✅ Buenas prácticas

✅ Streaming por defecto en interfaces conversacionales; sin streaming para jobs batch/back-office
✅ Propagar `AbortSignal` desde la desconexión del cliente hasta la llamada al LLM
✅ Eventos tipados propios (`delta`, `tool`, `done`, `error`) en vez de reenviar el formato del proveedor
✅ Heartbeats cada 15–30 s y buffering desactivado
✅ Registrar `usage` del evento final para costos y métricas (TTFT, tokens/s)
✅ Respetar backpressure (`res.write` → `drain`) cuando hay clientes lentos
✅ Con varias réplicas: conexión SSE atada a una instancia; si el cliente reconecta, reanudar desde lo persistido (o un pub/sub como Redis Streams)

---

## ⚖️ Trade-offs

| | Streaming | Sin streaming |
|---|---|---|
| Latencia percibida | Baja (TTFT) | Alta (tiempo total) |
| Complejidad backend | Alta | Baja |
| Validación de salida | Difícil (parcial) | Fácil (completa) |
| Structured output | Parciales difíciles de usar | Directo |
| Timeouts de infraestructura | Evitados con heartbeats | Riesgo en respuestas largas |

---

## 📊 Números de referencia (aproximados)

- TTFT: **~0.3–1.5 s** según modelo, tamaño del prompt y carga.
- Velocidad de salida: **~50–150 tokens/s** en modelos medianos; más en modelos pequeños.
- Respuesta de 800 tokens: ~8–15 s en total; con streaming el usuario empieza a leer en < 1 s.
- Lectura humana: ~5–10 tokens/s → el stream siempre va más rápido que el lector.
- Timeout de inactividad por defecto en muchos LB: 60 s.

---

## 🎤 Preguntas de entrevista

**1. ¿Por qué SSE y no WebSocket para respuestas de LLM?**
El flujo es unidireccional servidor → cliente. SSE es HTTP simple: funciona con proxies, auth y HTTP/2 sin infraestructura extra, y tiene reconexión nativa. WebSocket se justifica para interacción bidireccional en tiempo real (voz).

**2. ¿Cómo implementas cancelación de extremo a extremo?**
El cliente aborta el fetch; el servidor detecta `close` en la respuesta y dispara un `AbortController` cuya señal se pasó al SDK del LLM, que corta la conexión upstream y deja de generar (y facturar) tokens.

**3. ¿Qué pasa si falla el LLM a mitad del stream?**
El status HTTP ya fue 200, así que se emite un evento `error` en banda, el cliente muestra el parcial con un aviso y opción de reintentar. Se loguea con el `usage` parcial.

**4. ¿Cómo funcionan las tool calls en streaming?**
Llegan como bloques `tool_use` con JSON parcial en deltas. Se acumulan hasta `content_block_stop`, se parsean, se ejecuta la tool y se abre otro stream con el `tool_result`. Al cliente se le emiten eventos de estado mientras corre.

**5. Los tokens llegan todos juntos al final en producción, pero en local funciona. ¿Por qué?**
Buffering intermedio: nginx (`proxy_buffering`), compresión gzip, CDN o un middleware. Se desactiva para la ruta (`X-Accel-Buffering: no`, `Cache-Control: no-transform`, excluir compresión).

**6. ¿Qué es backpressure aquí y te preocupa?**
Que el productor escriba más rápido de lo que el cliente consume y crezca el buffer en memoria. Con LLMs el ritmo es bajo, pero con miles de conexiones lentas importa: respetar el retorno de `res.write` y esperar `drain`.

**7. ¿Cómo escalas miles de conexiones SSE concurrentes en Node?**
Node maneja bien conexiones I/O-bound; el límite suele ser memoria por conexión, file descriptors y rate limits del proveedor. Ajustar timeouts del LB, heartbeats, límites de concurrencia por usuario y escalar horizontalmente con sticky sessions o reanudación desde storage compartido.

---

## 🔗 Relacionado

- [08 - Function / Tool Calling](./08-function-tool-calling.md)
- [19 - Latency](./19-latency.md)
- [20 - Rate Limits](./20-rate-limits.md)
- [21 - Retries](./21-retries.md)
- [22 - Guardrails](./22-guardrails.md)
- [29 - Agentes y Agentic Loops](./29-agentes-y-agentic-loops.md)
- [31 - Observabilidad y LLMOps](./31-observabilidad-llmops.md)
- [34 - Arquitectura LLM en producción](./34-arquitectura-llm-en-produccion.md)

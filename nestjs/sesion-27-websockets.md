# Sesión 27 — WebSockets: Gateways, Socket.io, rooms, auth y escalado con Redis

> **Objetivo de la sesión**: construir comunicación **bidireccional en tiempo real** con Nest y entender qué cambia cuando la conexión deja de ser "una request, una response". Al terminar deberías poder explicar el handshake de WebSocket y qué agrega Socket.io encima, escribir un **Gateway** (`@WebSocketGateway`, `@SubscribeMessage`, lifecycle hooks), usar **namespaces y rooms**, **autenticar** en el handshake y autorizar por mensaje con guards, validar payloads, emitir desde servicios de dominio, manejar errores con `WsException`, **escalar horizontalmente** con `@socket.io/redis-adapter` (y saber por qué hacen falta *sticky sessions*) y testear un gateway de punta a punta.

---

## 1. WebSocket, el protocolo

HTTP es *request → response*: el servidor no puede hablar si el cliente no pregunta. WebSocket (RFC 6455) abre **una conexión TCP persistente y full-duplex**: cualquiera de los dos lados envía *frames* cuando quiera.

La conexión empieza como HTTP y se "actualiza":

```
Cliente                                         Servidor
  │  GET /socket HTTP/1.1                          │
  │  Upgrade: websocket                            │
  │  Connection: Upgrade                           │
  │  Sec-WebSocket-Key: dGhlIHNhbXBsZQ==           │
  │ ─────────────────────────────────────────────▶ │
  │                                                │
  │  HTTP/1.1 101 Switching Protocols              │
  │  Upgrade: websocket                            │
  │  Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYG...     │
  │ ◀───────────────────────────────────────────── │
  │                                                │
  │ ◀════════ frames en ambas direcciones ════════▶│
  │          (texto, binario, ping/pong, close)    │
```

Consecuencias de diseño que un senior debe tener claras:

| HTTP | WebSocket |
|---|---|
| Stateless: cualquier réplica atiende cualquier request | **Stateful**: el socket vive en *una* réplica concreta |
| Auth por request (header `Authorization`) | Auth **una vez** en el handshake; el token puede expirar con la conexión abierta |
| Balanceo por request | Balanceo por conexión: conexiones largas desbalancean réplicas |
| Status codes, verbos, caché | Nada de eso: tú defines el protocolo de mensajes |
| Escalar = más réplicas | Escalar = más réplicas **+ un bus** para que se hablen (Redis adapter) |

> ❓ **Entrevista**: *"¿Por qué escalar WebSockets es más difícil que escalar una API REST?"* → Porque las conexiones son stateful y están atadas a una réplica. Si el usuario A está en la réplica 1 y B en la 2, un mensaje de A a B necesita un mecanismo de *fan-out* entre réplicas (pub/sub, típicamente Redis). Además el balanceo es por conexión, no por request, y los deploys cortan conexiones abiertas.

---

## 2. Socket.io: qué agrega sobre WebSocket puro

Socket.io **no es** WebSocket: es un protocolo propio que *usa* WebSocket (o HTTP long-polling como fallback). Un cliente WebSocket nativo no puede hablar con un servidor Socket.io y viceversa.

| Característica | `ws` / WebSocket nativo | Socket.io |
|---|---|---|
| Eventos con nombre | ❌ solo mensajes; tú defines el formato | ✅ `emit('orden:actualizada', data)` |
| Acknowledgements (respuesta a un mensaje) | ❌ | ✅ callback / `emitWithAck` |
| Reconexión automática | ❌ | ✅ con backoff |
| Rooms y namespaces | ❌ | ✅ |
| Fallback a long-polling | ❌ | ✅ (útil tras proxies corporativos) |
| Heartbeat | ping/pong de protocolo | ✅ `pingInterval` / `pingTimeout` |
| Escalado multi-nodo | Hazlo tú | ✅ adapters (Redis, Postgres, etc.) |
| Overhead | Mínimo | Pequeño (encabezado de paquete) |

En Nest hay dos plataformas:

```bash
npm i @nestjs/websockets @nestjs/platform-socket.io     # Socket.io (default)
npm i @nestjs/websockets @nestjs/platform-ws            # ws puro (WsAdapter)
```

Esta sesión usa Socket.io, que es lo más común en aplicaciones Nest. Con `ws` el código del gateway es casi igual; cambias el adapter (`app.useWebSocketAdapter(new WsAdapter(app))`) y pierdes rooms/acks.

---

## 3. Tu primer Gateway

Un **Gateway** es a WebSockets lo que un controller es a HTTP: una clase `@Injectable` (participa del DI) cuyos métodos atienden mensajes.

```ts
// src/soporte/soporte.gateway.ts
import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket,
  OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Namespace, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/soporte',                         // ws://host:3000/soporte (mismo puerto que HTTP)
  cors: { origin: ['https://tienda.cl'], credentials: true },
})
export class SoporteGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SoporteGateway.name);

  // Con namespace, lo inyectado es el Namespace (no el Server raíz)
  @WebSocketServer() private readonly nsp: Namespace;

  afterInit(nsp: Namespace) {
    this.logger.log(`Gateway listo en ${nsp.name}`);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Conectado ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Desconectado ${client.id}`);
  }

  // 1) Retornar un valor → se envía como ACK al emisor
  @SubscribeMessage('ping')
  ping(@MessageBody() data: { t: number }) {
    return { pong: Date.now(), latenciaCliente: Date.now() - data.t };
  }

  // 2) Retornar { event, data } → se emite ese evento al emisor
  @SubscribeMessage('eco')
  eco(@MessageBody() texto: string) {
    return { event: 'eco', data: texto.toUpperCase() };
  }

  // 3) Emitir explícitamente a otros
  @SubscribeMessage('mensaje')
  mensaje(@MessageBody() texto: string, @ConnectedSocket() client: Socket) {
    client.broadcast.emit('mensaje', { de: client.id, texto }); // a todos menos al emisor
  }
}
```

Registro: el gateway es un **provider**, no un controller.

```ts
@Module({ providers: [SoporteGateway] })
export class SoporteModule {}
```

Cliente (`socket.io-client`):

```ts
import { io } from 'socket.io-client';

const socket = io('https://api.tienda.cl/soporte', { auth: { token: jwt } });

const resp = await socket.emitWithAck('ping', { t: Date.now() }); // espera el ACK
socket.on('eco', (d) => console.log(d));
socket.emit('eco', 'hola');
```

### 3.1 Opciones de `@WebSocketGateway`

```ts
@WebSocketGateway(3001, { ... })  // puerto distinto al HTTP (servidor separado)
@WebSocketGateway({ ... })        // mismo servidor HTTP (lo habitual: un solo puerto, un solo ALB)
```

Las opciones se pasan al constructor de `socket.io` `Server`: `path` (default `/socket.io`), `transports`, `pingInterval`, `pingTimeout`, `maxHttpBufferSize` (default 1 MB: tamaño máximo de un mensaje), `cors`, `connectionStateRecovery`.

> ⚠️ `cors` de `app.enableCors()` **no aplica** al gateway: se configura en `@WebSocketGateway({ cors })`. Y CORS solo afecta al polling; un navegador puede abrir un WebSocket a cualquier origen. Para bloquear orígenes no deseados en WS valida `client.handshake.headers.origin` en el middleware de conexión (sección 5).

### 3.2 Lifecycle del gateway

```
 app.listen()
     │
     ▼
 afterInit(server)           ← una vez: registrar middleware de socket.io, adapters
     │
     ▼  (por cada cliente)
 [middlewares server.use()]  ← handshake: auth, rate limit de conexión
     │ next()
     ▼
 handleConnection(client)    ← conectado: unir a rooms, registrar presencia
     │
     ▼
 @SubscribeMessage handlers  ← guards → interceptors → pipes → handler → filters
     │
     ▼
 handleDisconnect(client)    ← limpiar presencia, timers
```

> ⚠️ **Los guards NO se ejecutan en `handleConnection`.** Guards, pipes e interceptors aplican solo a los métodos `@SubscribeMessage`. Si tu única protección es un `@UseGuards` en el gateway, **cualquiera puede conectarse** y quedarse escuchando broadcasts. Autentica en el handshake (sección 5).

---

## 4. Namespaces y rooms

```
 Server (io)
 ├── Namespace "/"          (default)
 ├── Namespace "/soporte"   → gateway de chat de soporte
 └── Namespace "/ordenes"   → gateway de seguimiento de órdenes
        ├── room "usuario:42"      (todos los sockets del usuario 42: móvil + web)
        ├── room "orden:A-17"      (quien sigue esa orden)
        └── room "rol:admin"       (panel de administración)
```

| Concepto | Qué es | Quién lo decide |
|---|---|---|
| **Namespace** | Canal lógico con su propio endpoint, middlewares y handlers | El cliente al conectar (`io('/ordenes')`) |
| **Room** | Grupo arbitrario de sockets *dentro* de un namespace | **Solo el servidor** (`socket.join()`) |

Un socket entra automáticamente a una room con su propio `socket.id`. Las rooms no existen en el cliente: son un índice del servidor para hacer broadcast selectivo.

```ts
// src/ordenes/ordenes.gateway.ts
import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket,
  OnGatewayConnection, WsException,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { OrdenesService } from './ordenes.service';

@WebSocketGateway({ namespace: '/ordenes' })
export class OrdenesGateway implements OnGatewayConnection {
  @WebSocketServer() private readonly nsp: Namespace;

  constructor(private readonly ordenes: OrdenesService) {}

  async handleConnection(client: Socket) {
    const user = client.data.user as UsuarioWs;      // lo dejó el middleware de auth
    await client.join(`usuario:${user.id}`);          // canal personal (todas sus pestañas)
    if (user.roles.includes('admin')) await client.join('rol:admin');
  }

  @SubscribeMessage('orden:seguir')
  async seguir(@MessageBody() ordenId: string, @ConnectedSocket() client: Socket) {
    const user = client.data.user as UsuarioWs;
    // Autorización: ¿la orden es suya? (ownership, Sesión 19)
    const orden = await this.ordenes.buscarDeUsuario(ordenId, user.id);
    if (!orden) throw new WsException('Orden no encontrada');
    await client.join(`orden:${ordenId}`);
    return { ok: true, estado: orden.estado };        // ACK con el estado actual
  }

  @SubscribeMessage('orden:dejar')
  async dejar(@MessageBody() ordenId: string, @ConnectedSocket() client: Socket) {
    await client.leave(`orden:${ordenId}`);
    return { ok: true };
  }

  // API pública del gateway para el resto de la app
  notificarEstado(ordenId: string, usuarioId: number, estado: string) {
    this.nsp.to(`orden:${ordenId}`).to(`usuario:${usuarioId}`).emit('orden:estado', { ordenId, estado });
    this.nsp.to('rol:admin').emit('admin:orden:estado', { ordenId, estado });
  }
}
```

Chuleta de emisión:

| Código | Quién recibe |
|---|---|
| `client.emit(ev, d)` | Solo ese socket |
| `client.broadcast.emit(ev, d)` | Todos en el namespace menos el emisor |
| `client.to('sala').emit(ev, d)` | Todos en la sala menos el emisor |
| `nsp.to('sala').emit(ev, d)` | Todos en la sala (incluido el emisor si está) |
| `nsp.to('a').to('b').emit(...)` | Unión de `a` y `b`, sin duplicados |
| `nsp.except('sala').emit(...)` | Todos excepto la sala |
| `nsp.emit(ev, d)` | Todo el namespace |
| `nsp.timeout(5000).emitWithAck(ev, d)` | Todos, esperando ACK de cada uno |

> ❓ **Entrevista**: *"Un usuario tiene la app abierta en el móvil y en dos pestañas, ¿cómo le mandas una notificación a él y no a un socket concreto?"* → Uniendo cada socket a una room `usuario:<id>` en la conexión, y emitiendo a esa room. Nunca guardes un mapa `userId → socketId` en memoria: se rompe con varias conexiones por usuario y con varias réplicas. La room + Redis adapter resuelve ambos.

---

## 5. Autenticación y autorización

### 5.1 Autenticar en el handshake (obligatorio)

El cliente envía el token en `auth` (no en query string: queda en logs de proxies):

```ts
io('/ordenes', { auth: { token: accessToken } });
```

En el servidor, un **middleware de Socket.io** registrado en `afterInit` rechaza la conexión antes de que exista:

```ts
// src/ordenes/ordenes.gateway.ts (fragmento)
import { OnGatewayInit } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';

export interface UsuarioWs { id: number; email: string; roles: string[]; exp: number }

@WebSocketGateway({ namespace: '/ordenes' })
export class OrdenesGateway implements OnGatewayInit, OnGatewayConnection {
  constructor(private readonly jwt: JwtService, private readonly ordenes: OrdenesService) {}

  afterInit(nsp: Namespace) {
    nsp.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token as string | undefined;
        if (!token) return next(new Error('UNAUTHORIZED'));
        const payload = await this.jwt.verifyAsync<{ sub: number; email: string; roles: string[]; exp: number }>(token);
        socket.data.user = { id: payload.sub, email: payload.email, roles: payload.roles, exp: payload.exp };
        next();
      } catch {
        next(new Error('UNAUTHORIZED'));            // el cliente recibe 'connect_error'
      }
    });
  }
  // ...
}
```

Cliente:

```ts
socket.on('connect_error', async (err) => {
  if (err.message === 'UNAUTHORIZED') {
    socket.auth = { token: await refrescarToken() };   // Sesión 18: refresh token
    socket.connect();
  }
});
```

Para reutilizar el middleware en varios gateways, extráelo a una función `wsAuthMiddleware(jwt)` o hazlo en un **adapter** custom (sección 7) sobreescribiendo `createIOServer` y registrando `server.of(/.*/).use(...)`.

> ⚠️ **El token expira, la conexión no.** Un access token de 15 minutos valida el handshake, pero el socket puede vivir horas. Opciones: guardar `exp` en `socket.data` y verificarlo en un guard por mensaje (desconectando si expiró), forzar reautenticación periódica con un evento `auth:renovar`, o desconectar sockets del usuario al revocar su sesión (`nsp.in('usuario:42').disconnectSockets()`).

### 5.2 Autorizar por mensaje con guards

Los guards funcionan igual que en HTTP (Sesión 11), pero el contexto es `ws`:

```ts
// src/common/ws/ws-roles.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class WsRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const client = ctx.switchToWs().getClient<Socket>();
    const user = client.data.user as UsuarioWs | undefined;

    if (!user || user.exp * 1000 < Date.now()) {
      client.disconnect(true);                       // token vencido: fuera
      throw new WsException('Sesión expirada');
    }

    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!roles?.length) return true;
    if (roles.some((r) => user.roles.includes(r))) return true;
    throw new WsException('Prohibido');
  }
}
```

```ts
@UseGuards(WsRolesGuard)
@Roles('admin')
@SubscribeMessage('admin:forzar-estado')
forzarEstado(@MessageBody() dto: ForzarEstadoDto) { /* ... */ }
```

> ⚠️ Un guard que retorna `false` en WS lanza una `WsException('Forbidden')` que, por defecto, se emite como evento `exception` al cliente. **No** desconecta el socket: si quieres desconectar, hazlo explícitamente.

`ExecutionContext` en WS:

| Método | Devuelve |
|---|---|
| `ctx.getType()` | `'ws'` (útil en guards/interceptors compartidos con HTTP) |
| `ctx.switchToWs().getClient()` | El `Socket` |
| `ctx.switchToWs().getData()` | El payload del mensaje |
| `ctx.switchToWs().getPattern()` | El nombre del evento |

---

## 6. Validación, errores e interceptors

### 6.1 Validar payloads

El `ValidationPipe` global de `main.ts` (`app.useGlobalPipes`) **sí** aplica a gateways, pero lanza `BadRequestException` (HTTP), que el filtro WS por defecto convierte en un genérico "Internal server error". Configúralo para WS:

```ts
// src/ordenes/dto/mensaje-soporte.dto.ts
import { IsString, Length, IsUUID } from 'class-validator';

export class MensajeSoporteDto {
  @IsUUID() ticketId: string;
  @IsString() @Length(1, 2000) texto: string;
}
```

```ts
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

export const WsValidationPipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  exceptionFactory: (errores) =>
    new WsException({
      code: 'VALIDATION',
      errores: errores.map((e) => ({ campo: e.property, reglas: Object.values(e.constraints ?? {}) })),
    }),
});

@UsePipes(WsValidationPipe)
@WebSocketGateway({ namespace: '/soporte' })
export class SoporteGateway { /* ... */ }
```

### 6.2 Errores: `WsException` y filtros

Por defecto (`BaseWsExceptionFilter`), una `WsException` se envía al cliente como evento **`exception`** con `{ status: 'error', message }`; cualquier otra excepción se convierte en `Internal server error`. Esto choca con los **ACKs**: el cliente que hizo `emitWithAck` se queda esperando. Un filtro propio que responda por el ACK es mucho más ergonómico:

```ts
// src/common/ws/ws-ack-exception.filter.ts
import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';

@Catch()
export class WsAckExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const args = host.getArgs();
    // Si el cliente envió un callback de ACK, es el último argumento
    const ack = args.find((a) => typeof a === 'function') as ((r: unknown) => void) | undefined;

    const error =
      exception instanceof WsException ? exception.getError()
      : exception instanceof HttpException ? exception.getResponse()
      : 'Error interno';

    if (ack) return ack({ ok: false, error });
    return super.catch(exception, host);           // sin ACK: evento 'exception'
  }
}
```

```ts
@UseFilters(WsAckExceptionFilter)
@WebSocketGateway({ namespace: '/soporte' })
export class SoporteGateway {}
```

> 💡 Define un **contrato de respuesta** uniforme para todos los ACK (`{ ok: true, data } | { ok: false, error }`) y compártelo tipado con el frontend. En WebSockets no hay status codes: el contrato es tuyo.

### 6.3 Tipar los eventos

Socket.io permite tipar eventos en ambas direcciones; compártelos en una librería común (monorepo, Sesión 31):

```ts
// libs/contratos/src/ordenes.events.ts
export interface ServerToClient {
  'orden:estado': (p: { ordenId: string; estado: EstadoOrden }) => void;
}
export interface ClientToServer {
  'orden:seguir': (ordenId: string, ack: (r: AckRespuesta<{ estado: EstadoOrden }>) => void) => void;
}
export interface SocketData { user: UsuarioWs }

// En el gateway
@WebSocketServer() nsp: Namespace<ClientToServer, ServerToClient, {}, SocketData>;
// nsp.emit('orden:estdo', ...) → error de compilación por el typo
```

---

## 7. Emitir desde el dominio sin acoplarlo al gateway

El `OrdenesService` no debería saber que existen WebSockets. Dos formas limpias:

```ts
// Opción 1: eventos internos (Sesión 25). El gateway escucha, el dominio no conoce el gateway.
@Injectable()
export class OrdenesService {
  constructor(private readonly eventos: EventEmitter2) {}
  async cambiarEstado(id: string, estado: EstadoOrden) {
    const orden = await this.repo.actualizarEstado(id, estado);
    this.eventos.emit('orden.estado', { ordenId: id, usuarioId: orden.usuarioId, estado });
  }
}

@WebSocketGateway({ namespace: '/ordenes' })
export class OrdenesGateway {
  @OnEvent('orden.estado')
  alCambiarEstado(e: { ordenId: string; usuarioId: number; estado: string }) {
    this.nsp.to(`orden:${e.ordenId}`).to(`usuario:${e.usuarioId}`).emit('orden:estado', e);
  }
}
```

```ts
// Opción 2: desde OTRO proceso (worker de BullMQ, microservicio) que no tiene servidor socket.io
import { Emitter } from '@socket.io/redis-emitter';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();
const emitter = new Emitter(redis);

// Llega a todos los nodos que usan el redis-adapter (sección 8)
emitter.of('/ordenes').to('orden:A-17').emit('orden:estado', { ordenId: 'A-17', estado: 'DESPACHADA' });
```

> ⚠️ Evita la dependencia `OrdenesService → OrdenesGateway` (inyectar el gateway en el servicio): acopla el dominio al transporte y es una fuente clásica de dependencias circulares (`OrdenesGateway` también inyecta `OrdenesService`; Sesión 23).

---

## 8. Escalar horizontalmente: Redis adapter

### 8.1 El problema

```
            ALB
       ┌─────┴─────┐
   Réplica 1    Réplica 2
   socket A     socket B          A y B están en room "orden:A-17"
      │
   nsp.to('orden:A-17').emit(...) en réplica 1
      → llega a A ✅   → NO llega a B ❌ (la réplica 1 no conoce los sockets de la 2)
```

### 8.2 La solución: adapter

Un **adapter** es el componente de Socket.io que sabe qué sockets hay en cada room. El default es en memoria. `@socket.io/redis-adapter` publica cada broadcast en Redis Pub/Sub; todas las réplicas lo reciben y lo entregan a sus sockets locales.

```
   Réplica 1 ──publish──▶  Redis Pub/Sub  ──▶ Réplica 2 ──▶ socket B
      │                        ▲
      └──▶ socket A            └── Worker con @socket.io/redis-emitter
```

```bash
npm i @socket.io/redis-adapter redis
```

```ts
// src/common/ws/redis-io.adapter.ts
import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(url: string): Promise<void> {
    const pubClient = createClient({ url });
    const subClient = pubClient.duplicate();     // pub/sub requiere una conexión dedicada
    pubClient.on('error', (e) => console.error('Redis pub', e));
    subClient.on('error', (e) => console.error('Redis sub', e));
    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
```

```ts
// src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis(process.env.REDIS_URL!);
  app.useWebSocketAdapter(redisIoAdapter);
  app.enableShutdownHooks();                     // cerrar sockets limpio en deploys (Sesión 34)
  await app.listen(3000);
}
```

Con el adapter también funcionan entre réplicas: `nsp.in('usuario:42').disconnectSockets()`, `await nsp.in('orden:A-17').fetchSockets()` (devuelve sockets remotos con `id`, `data`, `rooms`) y `nsp.serverSideEmit('evento', ...)` para hablar entre servidores.

### 8.3 Sticky sessions: el detalle que rompe producción

Socket.io empieza con **HTTP long-polling** y luego hace upgrade a WebSocket. Durante el polling, el cliente hace varias requests HTTP que **deben llegar a la misma réplica** (la sesión Engine.IO vive en memoria). Sin afinidad, ves errores `400 Session ID unknown`.

| Opción | Cómo |
|---|---|
| **Sticky sessions en el balanceador** | ALB: *stickiness* por cookie en el target group; Nginx: `ip_hash` o `hash $cookie_...` |
| **Solo WebSocket** (sin polling) | Cliente `io(url, { transports: ['websocket'] })`; el upgrade es una sola request → no necesita afinidad. Pierdes el fallback para redes que bloquean WS |

> ❓ **Entrevista**: *"Tengo el Redis adapter configurado y aun así veo `Session ID unknown` al escalar a 3 réplicas"* → El adapter resuelve el *broadcast* entre réplicas, no la afinidad. El transporte long-polling necesita que todas las requests de una sesión lleguen a la misma réplica: activa sticky sessions en el ALB o fuerza `transports: ['websocket']` en el cliente.

### 8.4 Otras consideraciones de escala

- **Pérdida de mensajes en reconexión**: Socket.io entrega *at-most-once*. Si el cliente estuvo desconectado 10 segundos, perdió lo emitido. `connectionStateRecovery` (Socket.io 4.6+) reenvía lo perdido si la desconexión fue corta, pero **no** está soportado por el Redis adapter clásico (sí por `@socket.io/redis-streams-adapter`). Patrón robusto: al reconectar, el cliente pide el estado actual por HTTP ("dame las notificaciones desde el id X"). Trata el WebSocket como un **aviso**, no como la fuente de verdad.
- **Deploys**: al reemplazar una tarea de ECS se cortan miles de conexiones que reconectan a la vez (*thundering herd*). La reconexión con backoff aleatorio (`randomizationFactor`) de Socket.io mitiga; hazlo en ventanas de bajo tráfico y con *deregistration delay* razonable.
- **Límites**: cada socket consume memoria (~decenas de KB) y un file descriptor. Sube `ulimit -n`, mide conexiones por réplica y escala por conexiones, no por CPU.
- **Mensajes grandes**: `maxHttpBufferSize` (1 MB por defecto) protege de payloads gigantes; para archivos usa HTTP/S3 (Sesión 26) y manda solo la referencia.
- **Rate limiting por socket**: `@nestjs/throttler` requiere un guard adaptado a WS; alternativamente cuenta mensajes en `socket.data` o en Redis y desconecta abusadores.

---

## 9. Testing de gateways

**Unit**: el gateway es una clase; pruébala instanciándola con mocks, como un service (Sesión 22). **E2E**: levanta la app en un puerto aleatorio y conecta un cliente real.

```ts
// test/ordenes.gateway.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';

describe('OrdenesGateway (e2e)', () => {
  let app: INestApplication;
  let url: string;
  let token: string;
  let cliente: Socket;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.listen(0);                                   // puerto libre aleatorio
    url = `${await app.getUrl()}/ordenes`;
    token = await app.get(JwtService).signAsync({ sub: 1, email: 'a@t.cl', roles: [] });
  });

  afterEach(() => cliente?.disconnect());
  afterAll(() => app.close());

  it('rechaza conexiones sin token', (done) => {
    cliente = io(url, { transports: ['websocket'] });
    cliente.on('connect_error', (err) => {
      expect(err.message).toBe('UNAUTHORIZED');
      done();
    });
  });

  it('permite seguir una orden propia y recibe el ACK', async () => {
    cliente = io(url, { transports: ['websocket'], auth: { token } });
    await new Promise<void>((res) => cliente.on('connect', () => res()));
    const resp = await cliente.timeout(2000).emitWithAck('orden:seguir', 'A-17');
    expect(resp).toEqual({ ok: true, estado: 'PENDIENTE' });
  });
});
```

> ⚠️ Olvidar `disconnect()` y `app.close()` deja handles abiertos y Jest no termina (`--detectOpenHandles` te lo muestra).

---

## 10. ¿Cuándo NO usar WebSockets?

| Necesidad | Mejor opción |
|---|---|
| Notificaciones servidor → cliente, sin mensajes del cliente | **SSE** (Sesión 26) |
| Actualizaciones cada minuto o más | Polling (más simple, cacheable) |
| Notificación con la app cerrada | Push notifications (FCM/APNs/Web Push) |
| Subscriptions sobre un API GraphQL | GraphQL subscriptions (Sesión 28), que usan WS por debajo |
| Comunicación entre servicios backend | Broker de mensajes (Sesión 29), no WebSockets |
| Chat, colaboración, juegos, dashboards en vivo con interacción | ✅ WebSockets |

---

## Resumen mental de la sesión

```
WebSocket: HTTP Upgrade → 101 → TCP full-duplex persistente. STATEFUL.
Socket.io ≠ WebSocket: eventos, ACK, rooms, namespaces, reconexión, fallback polling.

Gateway = provider con @WebSocketGateway({ namespace, cors })
  @WebSocketServer() nsp       @SubscribeMessage('ev') + @MessageBody() + @ConnectedSocket()
  return valor → ACK   | return { event, data } → emite al emisor
  afterInit → handleConnection → handlers → handleDisconnect

Rooms: client.join('usuario:42'); nsp.to(room).emit(); solo el servidor decide
Auth: en el HANDSHAKE (nsp.use middleware, socket.handshake.auth.token → socket.data.user)
  Guards NO corren en handleConnection. Token expira, conexión no → revisar exp.
Guards/pipes/filters: ctx.switchToWs(); ValidationPipe con exceptionFactory → WsException
Errores: WsException → evento 'exception'; filtro propio para responder por ACK
Dominio desacoplado: EventEmitter2 → @OnEvent en el gateway; otros procesos → redis-emitter

Escala: RedisIoAdapter (createAdapter(pub, sub)) + app.useWebSocketAdapter
  + sticky sessions  O  transports: ['websocket']
WS = aviso, no fuente de verdad: al reconectar, pedir estado por HTTP
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ Describe el handshake de WebSocket. ¿Qué status code devuelve el servidor?
2. ❓ ¿Qué agrega Socket.io sobre WebSocket? ¿Puede un cliente `WebSocket` nativo conectarse a un servidor Socket.io?
3. ❓ ¿Qué diferencia hay entre namespace y room? ¿Quién decide a qué room pertenece un socket?
4. ❓ ¿Qué pasa si devuelves un valor en un `@SubscribeMessage`? ¿Y si devuelves `{ event, data }`?
5. ❓ ¿Por qué un `@UseGuards` en el gateway no impide que alguien se conecte? ¿Dónde autenticas?
6. ❓ El access token expira a los 15 minutos pero el socket sigue abierto 3 horas. ¿Qué haces?
7. ❓ ¿Cómo haces que `ValidationPipe` devuelva errores útiles al cliente en un gateway?
8. ❓ ¿Cómo notificas a un usuario conectado desde varios dispositivos? ¿Por qué no usar un `Map<userId, socketId>`?
9. ❓ Explica el Redis adapter: qué problema resuelve y qué problema **no** resuelve.
10. ❓ ¿Por qué hacen falta sticky sessions con Socket.io y cómo las evitas?
11. ❓ ¿Cómo emites un evento a los clientes desde un worker de BullMQ que no tiene servidor Socket.io?
12. ❓ ¿Socket.io garantiza la entrega de mensajes? ¿Cómo diseñas la reconexión para no perder información?

## Ejercicio práctico
1. Instala `@nestjs/websockets @nestjs/platform-socket.io` y crea `OrdenesGateway` en el namespace `/ordenes` con los hooks `afterInit`, `handleConnection` y `handleDisconnect` logueando.
2. Agrega el middleware de auth en `afterInit` con `JwtService` (Sesión 18). Prueba con un script `socket.io-client` sin token (espera `connect_error`) y con token válido.
3. En `handleConnection`, une el socket a `usuario:<id>` y, si es admin, a `rol:admin`.
4. Implementa `orden:seguir` con verificación de ownership, `WsValidationPipe` para el payload y respuesta por ACK `{ ok, estado }`. Agrega `WsAckExceptionFilter` y verifica que un `ordenId` ajeno devuelve `{ ok: false, error }` por el ACK.
5. Haz que `PATCH /ordenes/:id/estado` emita `orden.estado` con `EventEmitter2` y que el gateway lo reenvíe con `@OnEvent`. Abre dos clientes (dueño y otro usuario) y verifica que solo el dueño lo recibe.
6. Levanta Redis con Docker, configura `RedisIoAdapter` y arranca **dos** instancias (`PORT=3000` y `PORT=3001`). Conecta un cliente a cada una y comprueba que un cambio de estado hecho vía la 3000 llega al cliente de la 3001.
7. Conecta un cliente sin forzar `transports` a través de un Nginx con `upstream` round-robin y reproduce el error `Session ID unknown`; arréglalo con `ip_hash` y, alternativamente, con `transports: ['websocket']`.
8. Escribe el test e2e de la sección 9 (rechazo sin token + ACK de `orden:seguir`).
9. (Opcional) Crea un script aparte con `@socket.io/redis-emitter` que emita `orden:estado` a una room y verifica que llega a los clientes de ambas instancias.

---

➡️ **Cuando termines**, marca la Sesión 27 en el [README](README.md) y pasa a la **Sesión 28 — GraphQL: code-first, resolvers, DataLoader, subscriptions**.

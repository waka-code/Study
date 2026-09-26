# Sesión 29 — Microservicios: transports (TCP, Redis, NATS, RabbitMQ, Kafka, gRPC) y apps híbridas

> **Objetivo de la sesión**: partir TiendaApi en servicios que se comunican por mensajes y, sobre todo, entender **qué se rompe** cuando lo haces. Al terminar deberías poder explicar cuándo (no) conviene usar microservicios, distinguir **request-response (`@MessagePattern`) de eventos (`@EventPattern`)**, usar `ClientProxy` (`send` vs `emit`, cold vs hot), elegir un **transport** (TCP, Redis, NATS, RabbitMQ, Kafka, gRPC) según sus garantías, montar **apps híbridas** (HTTP + mensajes), manejar errores y timeouts, y diseñar para la realidad de un sistema distribuido: **entrega at-least-once, consumidores idempotentes, patrón Outbox y sagas** con compensaciones.

---

## 1. Antes de partir el monolito

Un microservicio es un proceso desplegable de forma independiente que es dueño de **su propio dato** y de una capacidad de negocio. La motivación real es **organizacional**: equipos que despliegan sin coordinarse. No es una técnica de performance.

| | Monolito modular | Microservicios |
|---|---|---|
| Deploy | Uno | Uno por servicio |
| Llamada entre módulos | Función en memoria (ns) | Red (ms), puede fallar, puede duplicarse |
| Transacciones | ACID en una base | **No hay** transacción distribuida práctica → consistencia eventual, sagas |
| Consultas cruzadas | `JOIN` | Composición por API, réplicas de datos, CQRS (Sesión 30) |
| Observabilidad | Un log, un stack trace | Tracing distribuido obligatorio (Sesión 32) |
| Escalado | Todo junto | Por servicio |
| Costo operativo | Bajo | Alto: CI/CD, versionado de contratos, brokers, on-call |

> ❓ **Entrevista**: *"¿Cuándo NO usarías microservicios?"* → Con un equipo pequeño, un dominio que aún no entiendes bien (los límites cambiarán y mover una frontera entre servicios es carísimo) o sin madurez operativa (CI/CD, observabilidad, on-call). La recomendación habitual es empezar con un **monolito modular** con límites claros (Sesiones 3 y 30) y extraer servicios cuando haya una razón concreta: escalado distinto, equipo independiente, requisito de aislamiento.

> ⚠️ **Monolito distribuido**: servicios que comparten base de datos o que se llaman en cadena síncrona para cada request (`API → Órdenes → Inventario → Precios → Usuarios`). Tienes todos los costos de los microservicios y ninguno de los beneficios: si uno cae, caen todos, y la latencia se suma.

---

## 2. El modelo de Nest: patterns, handlers y transports

`@nestjs/microservices` abstrae el transporte: escribes handlers por **pattern** y el mismo código funciona sobre TCP, Redis, RabbitMQ, etc.

```bash
npm i @nestjs/microservices
```

Dos estilos de mensaje, y elegir bien es la mitad del diseño:

| | `@MessagePattern` (request-response) | `@EventPattern` (evento) |
|---|---|---|
| Semántica | "Haz esto y respóndeme" (comando/consulta) | "Esto ocurrió" (hecho pasado) |
| Cliente | `client.send(pattern, data)` | `client.emit(pattern, data)` |
| Respuesta | Sí (Observable con el resultado) | No |
| Acoplamiento | Temporal: el receptor debe estar arriba **ahora** | Bajo: el emisor no sabe quién escucha |
| Consumidores | Uno responde | Cero, uno o muchos |
| Nombre | Imperativo: `inventario.reservar` | Pasado: `orden.creada` |

```
 MessagePattern:  Órdenes ──send('inventario.reservar')──▶ Inventario
                          ◀────────── { ok: true } ─────────

 EventPattern:    Órdenes ──emit('orden.creada')──▶ [broker] ──▶ Inventario
                                                          ├──▶ Notificaciones
                                                          └──▶ Analítica
```

### 2.1 Un microservicio puro

```ts
// apps/inventario/src/main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { InventarioModule } from './inventario.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(InventarioModule, {
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: 4001 },
  });
  app.enableShutdownHooks();
  await app.listen();
}
bootstrap();
```

```ts
// apps/inventario/src/inventario.controller.ts
import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { InventarioService } from './inventario.service';

export interface ReservarStockDto { ordenId: string; lineas: { productoId: number; cantidad: number }[] }

@Controller()
export class InventarioController {
  constructor(private readonly inventario: InventarioService) {}

  // Request-response: el valor retornado (o Promise/Observable) vuelve al cliente
  @MessagePattern('inventario.reservar')
  async reservar(@Payload() dto: ReservarStockDto) {
    const faltantes = await this.inventario.reservar(dto);
    if (faltantes.length) {
      throw new RpcException({ code: 'STOCK_INSUFICIENTE', faltantes });
    }
    return { ok: true };
  }

  @MessagePattern('inventario.stock')
  stock(@Payload() productoId: number) {
    return this.inventario.stockDe(productoId);
  }

  // Evento: no hay respuesta
  @EventPattern('orden.cancelada')
  async liberar(@Payload() evt: { ordenId: string }) {
    await this.inventario.liberarReserva(evt.ordenId);
  }
}
```

Guards, pipes, interceptors y filtros funcionan igual que en HTTP; el contexto es `ctx.getType() === 'rpc'` y `ctx.switchToRpc().getData()`.

> ⚠️ En microservicios, el `ValidationPipe` debe lanzar `RpcException` (no `BadRequestException`): usa `exceptionFactory: (e) => new RpcException(e)`, igual que con WebSockets (Sesión 27).

### 2.2 El cliente: `ClientsModule` y `ClientProxy`

```ts
// apps/ordenes/src/ordenes.module.ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

export const INVENTARIO = 'INVENTARIO_SERVICE';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: INVENTARIO,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: { host: config.getOrThrow('INVENTARIO_HOST'), port: 4001 },
        }),
      },
    ]),
  ],
  providers: [OrdenesService],
})
export class OrdenesModule {}
```

```ts
// apps/ordenes/src/ordenes.service.ts
import { Inject, Injectable, ServiceUnavailableException, ConflictException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, throwError, TimeoutError } from 'rxjs';

@Injectable()
export class OrdenesService {
  constructor(@Inject(INVENTARIO) private readonly inventario: ClientProxy) {}

  async reservarStock(dto: ReservarStockDto) {
    try {
      return await firstValueFrom(
        this.inventario.send<{ ok: true }>('inventario.reservar', dto).pipe(
          timeout(3000),                    // SIEMPRE: sin timeout, esperas para siempre
        ),
      );
    } catch (err) {
      if (err instanceof TimeoutError) throw new ServiceUnavailableException('Inventario no responde');
      if (err?.code === 'STOCK_INSUFICIENTE') throw new ConflictException(err);
      throw err;
    }
  }

  notificarCancelacion(ordenId: string) {
    // emit es "hot": se envía aunque nadie se suscriba
    this.inventario.emit('orden.cancelada', { ordenId });
  }
}
```

| | `send()` | `emit()` |
|---|---|---|
| Observable | **Cold**: no envía nada hasta que te suscribes (`firstValueFrom`, `subscribe`) | **Hot**: se despacha de inmediato |
| Espera respuesta | Sí | No (el Observable completa cuando el mensaje se entregó al transporte) |
| Handler remoto | `@MessagePattern` | `@EventPattern` |

> ⚠️ **El error clásico**: `this.client.send('x', data);` sin suscribirse. Como es *cold*, **el mensaje nunca sale** y no hay error. Siempre `await firstValueFrom(...)` (o `lastValueFrom`).

> ⚠️ Una `RpcException` lanzada en el servidor llega al cliente como el **objeto de error** (lo que pasaste al constructor), no como una instancia de `RpcException` ni de `HttpException`. Tienes que traducirlo a HTTP en el gateway, como arriba o con un filtro/interceptor.

La conexión es *lazy*: se abre en el primer `send/emit`. Para fallar rápido al arrancar, llama `await this.client.connect()` en `onApplicationBootstrap`. En Nest 11, `ClientProxy` y los servidores exponen además un observable `status` y `on('error', ...)` para reaccionar a caídas de conexión.

---

## 3. Apps híbridas: HTTP + mensajes en el mismo proceso

El caso más común: el servicio de Órdenes expone su API REST **y** consume eventos del broker.

```ts
// apps/ordenes/src/main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL!],
        queue: 'ordenes',
        queueOptions: { durable: true },
        noAck: false,                 // ack manual (sección 5)
        prefetchCount: 10,            // máx. mensajes sin ack en vuelo por consumidor
      },
    },
    { inheritAppConfig: true },       // hereda pipes/guards/interceptors globales
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  await app.startAllMicroservices();
  await app.listen(3000);
}
bootstrap();
```

> ⚠️ Sin `{ inheritAppConfig: true }`, los `useGlobal*()` del `app` HTTP **no** aplican a los handlers de mensajes. Otra opción es registrar los globales como providers `APP_PIPE`, `APP_GUARD`, etc. (Sesión 13), que aplican a todo.

---

## 4. Transports: garantías, no solo sintaxis

La pregunta correcta no es "¿cuál es más rápido?" sino **"¿qué pasa con un mensaje si el consumidor está caído?"**.

| Transport | Modelo | Persistencia | Entrega | Orden | Replay | Cuándo |
|---|---|---|---|---|---|---|
| **TCP** | Punto a punto, sin broker | ❌ | At-most-once (si el receptor está caído, error) | Por conexión | ❌ | Request-response interno simple, dev |
| **Redis** (pub/sub) | Pub/sub | ❌ | At-most-once: sin suscriptor conectado, **se pierde** | — | ❌ | Notificaciones efímeras, fan-out barato |
| **NATS** (core) | Pub/sub + request-reply, *queue groups* | ❌ (JetStream sí, pero no es el transport default de Nest) | At-most-once | — | ❌ | Baja latencia, request-reply, service mesh ligero |
| **RabbitMQ** (RMQ) | Colas + exchanges | ✅ colas durables | **At-least-once** con ack manual | Por cola (con 1 consumidor) | ❌ (consumido = borrado) | Trabajo asíncrono, comandos, integración entre servicios |
| **Kafka** | Log particionado | ✅ retención por tiempo/tamaño | At-least-once (commit de offset) | **Por partición** | ✅ rebobinar offsets | Event streaming, alto volumen, event sourcing, múltiples consumidores independientes |
| **gRPC** | RPC sobre HTTP/2 + Protobuf | ❌ | Síncrono | Streams ordenados | ❌ | Request-response tipado, baja latencia, streaming, polyglot |
| **MQTT** | Pub/sub con QoS | Según broker | QoS 0/1/2 | — | ❌ | IoT |

> ❓ **Entrevista**: *"RabbitMQ o Kafka?"* → RabbitMQ es un **broker de colas**: el mensaje se entrega a un consumidor y se borra al hacer ack; enruta de forma flexible (exchanges direct/topic/fanout), ideal para distribuir trabajo y comandos. Kafka es un **log distribuido**: los mensajes se retienen, cada *consumer group* lleva su propio offset, se pueden releer y el orden está garantizado por partición; ideal para event streaming, alto throughput y varios consumidores que procesan la misma historia a su ritmo.

### 4.1 Redis y NATS

```ts
// Servidor
{ transport: Transport.REDIS, options: { host: 'redis', port: 6379 } }
{ transport: Transport.NATS,  options: { servers: ['nats://nats:4222'], queue: 'inventario' } }
// "queue" en NATS = queue group: cada mensaje lo recibe UNA réplica del grupo (balanceo)
```

> ⚠️ Con **Redis pub/sub**, cada réplica suscrita recibe **todos** los eventos: si tienes 3 réplicas de Notificaciones, el email se envía 3 veces. Para "una réplica procesa cada mensaje" necesitas colas (RMQ), queue groups (NATS) o consumer groups (Kafka).

### 4.2 RabbitMQ

```bash
npm i amqplib amqp-connection-manager
```

```ts
// Cliente
ClientsModule.register([{
  name: 'NOTIFICACIONES',
  transport: Transport.RMQ,
  options: { urls: ['amqp://rabbitmq:5672'], queue: 'notificaciones', queueOptions: { durable: true } },
}]);
```

Con el transport RMQ de Nest, cada servicio consume de **su** cola. Para fan-out (un evento a varias colas) configura un exchange (el transport de Nest 11 acepta opciones de `exchange` / `exchangeType` / routing; revisa tu versión) o publica explícitamente a cada cola que corresponda.

### 4.3 Kafka

```bash
npm i kafkajs
```

```ts
// Servidor (consumidor)
{
  transport: Transport.KAFKA,
  options: {
    client: { clientId: 'inventario', brokers: ['kafka:9092'] },
    consumer: { groupId: 'inventario-consumer' },   // réplicas del mismo grupo se reparten particiones
  },
}
```

```ts
// Cliente: para send() (request-response) en Kafka hay que suscribirse al topic de respuesta
@Injectable()
export class CatalogoClient implements OnModuleInit {
  constructor(@Inject('CATALOGO') private readonly kafka: ClientKafka) {}

  async onModuleInit() {
    this.kafka.subscribeToResponseOf('catalogo.precio');   // escucha 'catalogo.precio.reply'
    await this.kafka.connect();
  }

  precio(productoId: number) {
    return firstValueFrom(this.kafka.send('catalogo.precio', { productoId }).pipe(timeout(3000)));
  }

  publicarOrdenCreada(evt: OrdenCreadaEvent) {
    // key = ordenId → todos los eventos de la misma orden van a la misma partición → orden garantizado
    return lastValueFrom(this.kafka.emit('orden.creada', { key: evt.ordenId, value: evt }));
  }
}
```

> 💡 Request-response sobre Kafka funciona pero es antinatural (topics de reply, latencia). Usa Kafka para **eventos** y gRPC/HTTP para consultas síncronas.

> ⚠️ El transport Kafka de Nest usa `kafkajs`, que ya no tiene mantenimiento activo. Para cargas críticas evalúa un custom transporter (sección 4.5) con otro cliente.

### 4.4 gRPC

Contrato primero, con Protobuf: tipado fuerte, binario compacto, HTTP/2, streaming y clientes en cualquier lenguaje.

```bash
npm i @grpc/grpc-js @grpc/proto-loader
```

```protobuf
// proto/inventario.proto
syntax = "proto3";
package inventario;

service InventarioService {
  rpc ObtenerStock (StockRequest) returns (StockResponse);
}
message StockRequest  { int32 producto_id = 1; }
message StockResponse { int32 producto_id = 1; int32 disponible = 2; }
```

```ts
// Servidor
NestFactory.createMicroservice<MicroserviceOptions>(InventarioModule, {
  transport: Transport.GRPC,
  options: {
    package: 'inventario',
    protoPath: join(__dirname, '../proto/inventario.proto'),
    url: '0.0.0.0:5001',
  },
});

@Controller()
export class InventarioGrpcController {
  @GrpcMethod('InventarioService', 'ObtenerStock')
  obtenerStock(req: { productoId: number }): Promise<{ productoId: number; disponible: number }> {
    // proto-loader convierte snake_case → camelCase por defecto (keepCase: false)
    return this.inventario.stockDe(req.productoId);
  }
}
```

```ts
// Cliente
interface InventarioGrpc {
  obtenerStock(req: { productoId: number }): Observable<{ productoId: number; disponible: number }>;
}

@Injectable()
export class InventarioGrpcClient implements OnModuleInit {
  private svc: InventarioGrpc;
  constructor(@Inject('INVENTARIO_GRPC') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.svc = this.client.getService<InventarioGrpc>('InventarioService');
  }

  stock(productoId: number) {
    return firstValueFrom(this.svc.obtenerStock({ productoId }).pipe(timeout(2000)));
  }
}
```

Errores gRPC: lanza `RpcException({ code: status.NOT_FOUND, message })` con `status` de `@grpc/grpc-js` para devolver códigos gRPC estándar.

> ⚠️ gRPC usa conexiones HTTP/2 persistentes: un balanceador de capa 4 (NLB) reparte **conexiones**, no requests, y una réplica puede recibir todo el tráfico. Usa un balanceador de capa 7 con soporte gRPC (ALB en modo gRPC, Envoy) o balanceo en el cliente.

### 4.5 Custom transporters

Si necesitas SQS, Google Pub/Sub o NATS JetStream, extiende `Server` (implementando `listen`/`close` y despachando a `this.messageHandlers`) y `ClientProxy` (`connect`, `close`, `publish`, `dispatchEvent`). Se registra con `strategy: new MiServer()` en `createMicroservice`.

---

## 5. La realidad distribuida: at-least-once e idempotencia

En un sistema con broker durable, la garantía práctica es **at-least-once**: el mensaje llegará, **quizás más de una vez**. ¿Por qué duplicados?

```
Consumidor:  recibe msg → procesa (descuenta stock) → 💥 crash antes del ack
Broker:      no recibió ack → re-entrega msg a otra réplica → descuenta stock OTRA VEZ
```

*Exactly-once* de punta a punta no existe gratis; lo que se construye es **efecto exactly-once** = at-least-once + **consumidor idempotente**.

### 5.1 Ack manual en RabbitMQ

```ts
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';

@EventPattern('orden.creada')
async onOrdenCreada(@Payload() evt: OrdenCreadaEvent, @Ctx() ctx: RmqContext) {
  const channel = ctx.getChannelRef();
  const mensaje = ctx.getMessage();
  try {
    await this.procesador.procesarIdempotente(evt);
    channel.ack(mensaje);                          // ✅ solo después de persistir
  } catch (err) {
    // requeue=false → va a la Dead Letter Exchange si la cola la tiene configurada
    channel.nack(mensaje, false, false);
  }
}
```

> ⚠️ Con `noAck: true` (el default del transport RMQ) el broker considera entregado el mensaje **al enviarlo**: si tu proceso muere a mitad, el mensaje se pierde. Para trabajo importante: `noAck: false` + ack explícito + **Dead Letter Queue** para mensajes venenosos (los que fallan siempre), o reintentarán infinitamente.

### 5.2 Consumidor idempotente con tabla de mensajes procesados

Cada evento lleva un `mensajeId` único (UUID generado por el emisor). El consumidor registra el id **en la misma transacción** que su efecto:

```ts
// apps/inventario/src/procesador.service.ts
@Injectable()
export class ProcesadorOrdenesService {
  constructor(private readonly dataSource: DataSource) {}

  async procesarIdempotente(evt: OrdenCreadaEvent): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      // Tabla mensajes_procesados(mensaje_id PK). Si ya existe, no inserta nada.
      const insertados: unknown[] = await m.query(
        `INSERT INTO mensajes_procesados (mensaje_id, procesado_en)
         VALUES ($1, now()) ON CONFLICT (mensaje_id) DO NOTHING RETURNING mensaje_id`,
        [evt.mensajeId],
      );
      if (insertados.length === 0) return;          // duplicado: ya se procesó → no-op

      for (const l of evt.lineas) {
        await m.query(
          `UPDATE stock SET reservado = reservado + $1 WHERE producto_id = $2`,
          [l.cantidad, l.productoId],
        );
      }
      // Si algo falla, el rollback deshace también el INSERT del mensaje → se podrá reintentar
    });
  }
}
```

Otras formas de idempotencia: operaciones naturalmente idempotentes (`SET estado = 'PAGADA'` en vez de `saldo = saldo - x`), *upsert* por clave de negocio, o control de versión (`WHERE version = $n`).

> ❓ **Entrevista**: *"¿Cómo garantizas que un pago no se procese dos veces si el mensaje llega duplicado?"* → No se puede evitar el duplicado en el transporte; se hace idempotente el consumidor: un id único por mensaje (o *idempotency key* de negocio) registrado con una constraint única **en la misma transacción** que el efecto. Si el insert choca, es un duplicado y se hace ack sin volver a procesar. Hacia afuera (la pasarela de pago), se envía la misma idempotency key para que el tercero también deduplique.

---

## 6. Patrón Outbox: publicar sin perder eventos

El problema del **dual write**:

```ts
// ❌ Dos sistemas, ninguna transacción común
await this.repo.save(orden);                              // 1. commit en Postgres
await lastValueFrom(this.broker.emit('orden.creada', e)); // 2. 💥 el broker está caído / el proceso muere
// → la orden existe, pero nadie se enteró: inventario nunca reserva, nunca se envía el email
```

Invertir el orden no ayuda (evento publicado de una orden que hizo rollback). La solución: escribir el evento en una tabla **outbox en la misma transacción** que el cambio, y que un proceso aparte lo publique.

```
 ┌────────────── Transacción Postgres ──────────────┐
 │ INSERT INTO ordenes (...)                         │
 │ INSERT INTO outbox (id, tipo, payload, publicado) │
 └───────────────────────────────────────────────────┘
                       │
      Relay (polling o CDC con Debezium) lee outbox pendientes
                       │
                       ▼
              Broker (RabbitMQ / Kafka) ──▶ consumidores idempotentes
                       │
      marca publicado_en = now()   (si crashea antes → republica → duplicado → idempotencia)
```

```ts
// apps/ordenes/src/outbox/outbox.entity.ts
@Entity('outbox')
export class OutboxMensaje {
  @PrimaryColumn('uuid') id: string;                 // = mensajeId que verán los consumidores
  @Column() tipo: string;                            // 'orden.creada'
  @Column('jsonb') payload: Record<string, unknown>;
  @CreateDateColumn() creadoEn: Date;
  @Column({ type: 'timestamptz', nullable: true }) publicadoEn: Date | null;
  @Column({ default: 0 }) intentos: number;
}
```

```ts
// apps/ordenes/src/ordenes.service.ts
async crearOrden(dto: CrearOrdenDto, usuarioId: number) {
  return this.dataSource.transaction(async (m) => {
    const orden = await m.save(Orden, m.create(Orden, { usuarioId, lineas: dto.lineas, estado: 'PENDIENTE' }));
    await m.save(OutboxMensaje, {
      id: randomUUID(),
      tipo: 'orden.creada',
      payload: { ordenId: orden.id, usuarioId, lineas: dto.lineas },
      publicadoEn: null,
    });
    return orden;                                    // ambas filas o ninguna
  });
}
```

```ts
// apps/ordenes/src/outbox/outbox-relay.service.ts
import { Interval } from '@nestjs/schedule';

@Injectable()
export class OutboxRelay {
  private readonly logger = new Logger(OutboxRelay.name);
  private corriendo = false;

  constructor(private readonly dataSource: DataSource, @Inject('BROKER') private readonly broker: ClientProxy) {}

  @Interval(1000)
  async publicarPendientes() {
    if (this.corriendo) return;                      // evita solapamiento dentro del proceso
    this.corriendo = true;
    try {
      await this.dataSource.transaction(async (m) => {
        // SKIP LOCKED: varias réplicas del relay no toman los mismos mensajes
        const pendientes: OutboxMensaje[] = await m.query(
          `SELECT * FROM outbox WHERE publicado_en IS NULL
           ORDER BY creado_en LIMIT 100 FOR UPDATE SKIP LOCKED`,
        );
        for (const msg of pendientes) {
          await lastValueFrom(this.broker.emit(msg.tipo, { mensajeId: msg.id, ...msg.payload }));
          await m.query(`UPDATE outbox SET publicado_en = now() WHERE id = $1`, [msg.id]);
        }
      });
    } catch (e) {
      this.logger.error('Fallo publicando outbox', e as Error);
    } finally {
      this.corriendo = false;
    }
  }
}
```

> 💡 Alternativa sin polling: **CDC (Change Data Capture)** con Debezium leyendo el WAL de Postgres y publicando a Kafka. Menos latencia y carga sobre la base, más infraestructura. El lado consumidor del patrón (tabla de procesados) se llama a veces **Inbox**.

> ⚠️ Outbox garantiza **at-least-once**, no exactly-once: si el relay publica y muere antes del `UPDATE`, republicará. Por eso Outbox e idempotencia van **siempre juntos**.

---

## 7. Sagas: transacciones de negocio entre servicios

Crear una orden toca tres servicios con tres bases: reservar stock (Inventario), cobrar (Pagos), confirmar (Órdenes). No hay `ROLLBACK` global. Una **saga** es una secuencia de transacciones locales donde cada paso tiene una **compensación** que deshace su efecto de negocio.

```
 Paso                     Compensación
 1. Orden PENDIENTE   ◀── Orden CANCELADA
 2. Reservar stock    ◀── Liberar stock
 3. Cobrar pago       ◀── Reembolsar
 4. Orden CONFIRMADA

 Si falla 3 → ejecutar compensaciones de 2 y 1 (en orden inverso)
```

| | Coreografía | Orquestación |
|---|---|---|
| Control | Cada servicio reacciona a eventos y emite otros | Un **orquestador** envía comandos y decide el siguiente paso |
| Acoplamiento | Bajo, pero el flujo está repartido | El flujo está en un lugar |
| Visibilidad | Difícil ("¿en qué paso va la orden 9?") | Estado explícito de la saga |
| Riesgo | Ciclos de eventos, flujo implícito | El orquestador concentra lógica |
| Cuándo | 2–3 pasos simples | Flujos largos, con timeouts y ramas |

Coreografía:

```
Órdenes ──orden.creada──▶ Inventario ──stock.reservado──▶ Pagos ──pago.rechazado──▶ Inventario (libera)
                                                                                 └──▶ Órdenes (cancela)
```

Orquestación, con el estado de la saga persistido:

```ts
// apps/ordenes/src/sagas/crear-orden.saga.ts
type PasoSaga = 'RESERVANDO_STOCK' | 'COBRANDO' | 'CONFIRMADA' | 'COMPENSANDO' | 'CANCELADA';

@Injectable()
export class CrearOrdenSaga {
  constructor(
    private readonly sagas: SagaRepository,                  // tabla saga_estado(orden_id, paso, datos)
    @Inject(INVENTARIO) private readonly inventario: ClientProxy,
    @Inject(PAGOS) private readonly pagos: ClientProxy,
    private readonly ordenes: OrdenesRepository,
  ) {}

  async ejecutar(orden: Orden): Promise<void> {
    await this.sagas.guardar(orden.id, 'RESERVANDO_STOCK');
    try {
      await firstValueFrom(this.inventario.send('inventario.reservar', { ordenId: orden.id, lineas: orden.lineas }).pipe(timeout(5000)));
    } catch {
      return this.cancelar(orden.id, []);                     // nada que compensar aún
    }

    await this.sagas.guardar(orden.id, 'COBRANDO');
    try {
      await firstValueFrom(this.pagos.send('pagos.cobrar', {
        ordenId: orden.id, monto: orden.total, idempotencyKey: `cobro-${orden.id}`,
      }).pipe(timeout(10000)));
    } catch {
      return this.cancelar(orden.id, ['liberarStock']);
    }

    await this.ordenes.marcarConfirmada(orden.id);
    await this.sagas.guardar(orden.id, 'CONFIRMADA');
  }

  private async cancelar(ordenId: string, compensaciones: 'liberarStock'[]) {
    await this.sagas.guardar(ordenId, 'COMPENSANDO');
    if (compensaciones.includes('liberarStock')) {
      // Las compensaciones también deben ser idempotentes y reintentarse hasta tener éxito
      await lastValueFrom(this.inventario.emit('inventario.liberar', { ordenId }));
    }
    await this.ordenes.marcarCancelada(ordenId);
    await this.sagas.guardar(ordenId, 'CANCELADA');
  }
}
```

> ⚠️ **El timeout es el caso difícil**: si `pagos.cobrar` hace timeout, ¿se cobró o no? No lo sabes. Por eso: idempotency key en el cobro (reintentar es seguro), consulta de estado antes de compensar, y un proceso que retome sagas atascadas leyendo `saga_estado` (un `@Cron` o un job de BullMQ, Sesión 25). En producción, flujos así suelen implementarse sobre motores de workflow (Temporal, AWS Step Functions) o con las sagas de `@nestjs/cqrs` (Sesión 30) para coreografía interna.

> ❓ **Entrevista**: *"¿Por qué no usar two-phase commit (2PC) entre servicios?"* → 2PC bloquea recursos mientras espera al coordinador, reduce la disponibilidad (si un participante o el coordinador cae, todos quedan bloqueados) y la mayoría de brokers y bases modernos distribuidos no lo soportan bien. Las sagas aceptan **consistencia eventual** a cambio de disponibilidad, con compensaciones de negocio explícitas.

---

## 8. Resiliencia en las llamadas síncronas

| Patrón | Qué evita | En Nest |
|---|---|---|
| **Timeout** | Esperar para siempre | `timeout()` de RxJS en cada `send` |
| **Retry con backoff + jitter** | Fallar por errores transitorios | `retry({ count: 3, delay: (e, i) => timer(2 ** i * 100 + Math.random() * 100) })` — **solo** operaciones idempotentes |
| **Circuit breaker** | Martillar un servicio caído y agotar recursos propios | Librerías como `opossum` envolviendo la llamada |
| **Bulkhead** | Que un servicio lento consuma todo el pool | Límites de concurrencia por dependencia |
| **Fallback** | Error total por una dependencia no crítica | Valor por defecto / caché (recomendaciones vacías) |

```ts
this.catalogo.send('catalogo.precio', { productoId }).pipe(
  timeout(2000),
  retry({ count: 2, delay: (_e, intento) => timer(100 * 2 ** intento + Math.random() * 100) }),
);
```

> ⚠️ Retries en cascada: si el gateway reintenta 3 veces, Órdenes 3 y Inventario 3, un fallo abajo se convierte en 27 requests. Reintenta en **una** capa y propaga un *deadline* (timeout total) hacia abajo.

---

## 9. Contratos y observabilidad

- **Contratos compartidos**: patterns, DTOs de payload y `.proto` en una librería común del monorepo (Sesión 31). Nunca strings mágicos repetidos.
- **Evolución**: solo cambios compatibles (agregar campos opcionales); para romper, un nuevo pattern/topic (`orden.creada.v2`) y convivencia.
- **Correlation id / tracing**: propaga un `traceId` en cada mensaje (en Nest 11 puedes usar `RmqRecordBuilder`/`KafkaRecord` con headers) y usa OpenTelemetry (Sesión 32) para ver la saga completa.
- **Health checks**: `@nestjs/terminus` tiene indicadores para microservicios (`MicroserviceHealthIndicator`) para verificar la conexión al broker.

---

## Resumen mental de la sesión

```
Microservicios = independencia de equipos/deploy, NO performance. Empieza modular.
Cada servicio es dueño de su dato. Nada de DB compartida ni cadenas síncronas largas.

@MessagePattern + client.send()  → request-response, cold (sin subscribe NO se envía), timeout SIEMPRE
@EventPattern   + client.emit()  → evento "ocurrió X", hot, 0..N consumidores
createMicroservice (puro) | connectMicroservice + startAllMicroservices (híbrida, inheritAppConfig)
RpcException → llega como objeto de error; tradúcelo a HTTP en el borde

Transports: TCP/Redis/NATS core = at-most-once, sin persistencia
            RMQ = colas durables, ack manual (noAck:false) + DLQ
            Kafka = log, orden por partición (key), replay, consumer groups
            gRPC = contrato .proto, HTTP/2, L7 balancing

Realidad: at-least-once → duplicados → CONSUMIDOR IDEMPOTENTE (mensajeId + unique, misma TX)
Dual write → OUTBOX (misma TX) + relay (polling SKIP LOCKED / CDC) → at-least-once
Transacción entre servicios → SAGA: pasos locales + compensaciones (coreografía vs orquestación)
Resiliencia: timeout, retry con backoff+jitter (idempotente), circuit breaker, reintentar en UNA capa
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Cuándo NO conviene usar microservicios? ¿Qué es un monolito distribuido?
2. ❓ Diferencia entre `@MessagePattern` y `@EventPattern`. ¿Cómo nombrarías cada uno?
3. ❓ `send()` es cold y `emit()` es hot: ¿qué significa y qué bug típico produce?
4. ❓ ¿Qué es una app híbrida en Nest y para qué sirve `inheritAppConfig`?
5. ❓ Compara TCP, Redis, RabbitMQ, Kafka y gRPC por garantías de entrega y persistencia.
6. ❓ ¿RabbitMQ o Kafka? ¿Cómo garantizas orden en Kafka?
7. ❓ ¿Por qué un broker durable entrega "at-least-once" y qué implica para el consumidor?
8. ❓ ¿Cómo implementas un consumidor idempotente? ¿Por qué el registro del mensaje va en la misma transacción?
9. ❓ Explica el problema del dual write y cómo lo resuelve el patrón Outbox. ¿Outbox da exactly-once?
10. ❓ ¿Qué es una saga? Coreografía vs orquestación. ¿Por qué no 2PC?
11. ❓ Un `pagos.cobrar` hace timeout dentro de una saga: ¿qué haces?
12. ❓ ¿Qué patrones de resiliencia aplicas a una llamada síncrona entre servicios? ¿Qué es la amplificación de retries?

## Ejercicio práctico
1. Crea un workspace con dos apps: `ordenes` (HTTP) e `inventario` (microservicio TCP en el puerto 4001). Puedes adelantarte con `nest g app` (Sesión 31) o usar dos proyectos.
2. En `inventario`, implementa `@MessagePattern('inventario.stock')` e `inventario.reservar` (con `RpcException` si falta stock).
3. En `ordenes`, registra el cliente con `ClientsModule.registerAsync` y expone `GET /productos/:id/stock` usando `send` + `timeout(2000)`. Apaga `inventario` y verifica que respondes `503`, no que la request cuelga.
4. Escribe a propósito `this.client.send(...)` sin `firstValueFrom` y comprueba que el mensaje nunca llega. Corrígelo.
5. Levanta RabbitMQ (`docker run -p 5672:5672 -p 15672:15672 rabbitmq:3-management`) y convierte `ordenes` en app híbrida que publica `orden.creada`. En `inventario` consume con `noAck: false` y ack manual.
6. Implementa la tabla `mensajes_procesados` y el consumidor idempotente. Publica el mismo evento dos veces (mismo `mensajeId`) y verifica que el stock se reserva una sola vez.
7. Implementa el Outbox en `ordenes` con el relay `@Interval`. Detén RabbitMQ, crea 5 órdenes, vuelve a levantarlo y verifica que los 5 eventos se publican.
8. Mata el consumidor (`kill -9`) justo después de procesar y antes del ack (agrega un `await sleep(5000)` antes del `ack`) y observa la re-entrega y cómo la idempotencia la absorbe.
9. Implementa la saga orquestada `CrearOrdenSaga` con un servicio `pagos` falso que rechaza montos mayores a 100 000. Verifica que el stock se libera y la orden queda `CANCELADA`.
10. (Opcional) Expón `ObtenerStock` por gRPC con el `.proto` de la sección 4.4 y llámalo desde `ordenes` con `ClientGrpc`.

---

➡️ **Cuando termines**, marca la Sesión 29 en el [README](README.md) y pasa a la **Sesión 30 — Arquitectura: Clean/Hexagonal, DDD y CQRS con @nestjs/cqrs**.

# Sesión 32 — Observabilidad: logging con Pino, health checks, métricas y OpenTelemetry

> **Objetivo de la sesión**: pasar de "funciona en mi máquina" a "sé qué está pasando en producción sin conectarme al servidor". Al terminar deberías poder explicar los **tres pilares** (logs, métricas, trazas) y para qué sirve cada uno, reemplazar el logger de Nest por **Pino** con logs JSON estructurados y un `requestId` por request, exponer **health checks** de liveness y readiness con `@nestjs/terminus`, publicar **métricas Prometheus** sin explotar la cardinalidad, e instrumentar TiendaApi con **OpenTelemetry** (inicializado *antes* de importar Nest) para seguir una request a través de gateway → ordenes → base de datos.

---

## 1. Monitoreo vs observabilidad

**Monitoreo** responde preguntas que ya conocías ("¿el CPU pasa del 80%?"). **Observabilidad** es la capacidad de responder preguntas que **no** anticipaste ("¿por qué solo los usuarios de Valparaíso con más de 3 items en el carrito ven timeouts?") a partir de las señales que emite el sistema.

| Pilar | Qué es | Pregunta que responde | Costo | Herramientas |
|---|---|---|---|---|
| **Logs** | Eventos discretos con contexto | *¿Qué pasó exactamente en esta request?* | Alto (volumen) | Pino → CloudWatch / Loki / Elasticsearch |
| **Métricas** | Números agregados en el tiempo | *¿Cuánto? ¿Con qué frecuencia? ¿Está empeorando?* | Bajo (agregado) | prom-client → Prometheus / Grafana |
| **Trazas** | El recorrido de una request entre servicios, con tiempos | *¿Dónde se fue el tiempo? ¿Qué servicio falló?* | Medio (muestreo) | OpenTelemetry → Jaeger / Tempo / X-Ray |

```
  Alerta (métrica): p99 de POST /ordenes > 2s
        │
        ▼
  Traza (ejemplo lento): gateway 2.1s → ordenes 2.0s → SELECT stock 1.9s
        │
        ▼
  Logs (filtrados por trace_id): "lock wait timeout en tabla productos"
```

El flujo senior es ese: **las métricas te avisan, las trazas te dicen dónde, los logs te dicen por qué**. Para que funcione, las tres señales deben estar **correlacionadas** (mismo `trace_id`).

> ❓ **Entrevista**: *"¿Por qué no basta con logs?"* → Porque los logs no se agregan bien: calcular un percentil 99 de latencia sobre millones de líneas es caro y lento, y en un sistema distribuido una request deja logs en 5 servicios sin un hilo que los una. Las métricas dan tendencias baratas para alertar; las trazas unen los saltos entre servicios.

---

## 2. Logging: por qué cambiar el logger de Nest

El `Logger` de `@nestjs/common` (Sesión 1) escribe texto coloreado pensado para humanos:

```
[Nest] 4123  - 25/09/2026, 10:15:02     LOG [OrdenesService] Orden creada 8f2c...
```

En producción eso es un problema: el agregador de logs no sabe qué es el nivel, qué es el mensaje ni qué es el id de la orden. Necesitas **logs estructurados** (JSON, una línea por evento) con campos consultables:

```json
{"level":30,"time":1790331302000,"pid":1,"hostname":"ip-10-0-1-12","req":{"id":"b1c7...","method":"POST","url":"/ordenes"},"context":"OrdenesService","ordenId":"8f2c...","total":45990,"msg":"Orden creada"}
```

Ahora puedes consultar `ordenId = "8f2c..."` o `level >= 50 AND context = "OrdenesService"`.

**¿Por qué Pino?** Es de los loggers más rápidos de Node porque serializa JSON de forma muy optimizada y delega el formateo "bonito" y el transporte a otros procesos/hilos (*transports*). Un logger lento es un problema de rendimiento real: loguear es I/O en el camino caliente de cada request.

| Logger | Formato | Rendimiento | Notas |
|---|---|---|---|
| `ConsoleLogger` de Nest | Texto (JSON opcional desde v11) | Aceptable | Sin contexto por request |
| **Pino** (`nestjs-pino`) | JSON | Muy alto | Log de request automático vía `pino-http`, contexto por request |
| Winston (`nest-winston`) | Configurable | Menor | Muy flexible, múltiples transports |

> 💡 Desde Nest 11 el `ConsoleLogger` acepta `json: true` (`new ConsoleLogger({ json: true })`), útil para apps simples. Para producción seria, `nestjs-pino` sigue siendo la opción más común porque agrega el **log por request** y el contexto automático.

---

## 3. nestjs-pino en TiendaApi

```bash
npm i nestjs-pino pino-http pino
npm i -D pino-pretty
```

### 3.1 Configuración del módulo

```ts
// src/logging/logging.module.ts
import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import type { IncomingMessage, ServerResponse } from 'node:http';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const esProd = config.get('NODE_ENV') === 'production';
        return {
          pinoHttp: {
            level: config.get('LOG_LEVEL', esProd ? 'info' : 'debug'),

            // En dev: legible. En prod: JSON crudo a stdout (el agregador lo parsea)
            transport: esProd
              ? undefined
              : { target: 'pino-pretty', options: { singleLine: true, colorize: true } },

            // Reutiliza el id que viene del load balancer / gateway, o crea uno
            genReqId: (req: IncomingMessage, res: ServerResponse) => {
              const existente = req.headers['x-request-id'];
              const id = (Array.isArray(existente) ? existente[0] : existente) ?? randomUUID();
              res.setHeader('x-request-id', id);   // lo devolvemos al cliente
              return id;
            },

            // NUNCA loguees secretos: pino los reemplaza por "[Redacted]"
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'res.headers["set-cookie"]',
              ],
              censor: '[Redacted]',
            },

            // Nivel según el resultado: 5xx = error, 4xx = warn
            customLogLevel: (_req, res, err) => {
              if (err || res.statusCode >= 500) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },

            // No ensucies los logs con los health checks del load balancer
            autoLogging: {
              ignore: (req) => req.url?.startsWith('/health') ?? false,
            },
          },
        };
      },
    }),
  ],
})
export class LoggingModule {}
```

### 3.2 Reemplazar el logger de la app

```ts
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  // bufferLogs: guarda los logs del arranque hasta que Pino esté listo;
  // sin esto, los primeros logs salen con el ConsoleLogger (texto) y rompen el formato
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();         // Sesión 34
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

Con esto, **todo** `new Logger(Contexto.name)` de `@nestjs/common` en tu código sigue funcionando y termina en Pino: no tienes que cambiar tus servicios.

### 3.3 Logger con contexto de la request

`nestjs-pino` guarda el logger hijo de cada request en `AsyncLocalStorage`, así que cualquier log emitido durante esa request (aunque sea en un servicio singleton, 5 llamadas más abajo) incluye `req.id` automáticamente.

```ts
// src/ordenes/ordenes.service.ts
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CrearOrdenDto } from '@app/contracts';

@Injectable()
export class OrdenesService {
  constructor(
    @InjectPinoLogger(OrdenesService.name) private readonly logger: PinoLogger,
  ) {}

  async crear(dto: CrearOrdenDto, usuarioId: string) {
    // assign: agrega campos al logger de ESTA request (los siguientes logs y el
    // log final "request completed" también los llevarán)
    this.logger.assign({ usuarioId });

    const orden = await this.persistir(dto);

    // Pino: primero el objeto con campos, después el mensaje
    this.logger.info({ ordenId: orden.id, total: orden.total }, 'Orden creada');
    return orden;
  }

  private async persistir(dto: CrearOrdenDto) {
    return { id: 'ord_123', total: 45990, items: dto.items };
  }
}
```

> ⚠️ Con Pino el orden es `logger.info(objeto, mensaje)`, **al revés** que en muchos loggers. `logger.info('Orden creada', { ordenId })` pierde los campos (el segundo argumento se trata como parámetro de interpolación).

> ⚠️ **No** interpoles datos en el mensaje: `logger.info(\`Orden ${id} creada\`)` produce mensajes únicos imposibles de agrupar. Mensaje **constante** + campos variables.

### 3.4 Errores con stack

Por defecto, cuando un exception filter convierte el error en respuesta, el log automático de `pino-http` solo ve el status. `nestjs-pino` trae un interceptor para adjuntar el error original:

```ts
import { LoggerErrorInterceptor } from 'nestjs-pino';
app.useGlobalInterceptors(new LoggerErrorInterceptor());
```

### 3.5 Niveles y qué loguear

| Nivel (Pino) | Valor | Úsalo para |
|---|---|---|
| `fatal` | 60 | La app no puede seguir (sin DB al arrancar) |
| `error` | 50 | Fallo que requiere atención (5xx, job fallido definitivamente) |
| `warn` | 40 | Anómalo pero manejado (reintento, 4xx sospechoso, degradación) |
| `info` | 30 | Eventos de negocio (orden creada, pago confirmado) |
| `debug` | 20 | Detalle para diagnosticar (desactivado en prod) |
| `trace` | 10 | Muy verboso |

> ❓ **Entrevista**: *"¿Qué NO debes loguear?"* → Secretos (tokens, passwords, API keys), datos personales sensibles (RUT completo, tarjetas: PCI-DSS lo prohíbe), bodies completos de requests (volumen y PII). Usa `redact`, loguea identificadores en vez de objetos completos y revisa los logs como parte del code review.

---

## 4. Health checks con @nestjs/terminus

Un orquestador (ECS, Kubernetes) o un load balancer (ALB) necesita saber dos cosas distintas:

| Probe | Pregunta | Si falla… | Qué debe verificar |
|---|---|---|---|
| **Liveness** | ¿El proceso está vivo o colgado? | Se **reinicia** el contenedor | Casi nada: que el event loop responda |
| **Readiness** | ¿Puede atender tráfico ahora? | Se **saca del balanceo** (sin reiniciar) | Dependencias críticas: DB, Redis |
| **Startup** (K8s) | ¿Terminó de arrancar? | Espera antes de aplicar liveness | Migraciones, warm-up |

> ⚠️ Error clásico: poner el ping a la base de datos en el **liveness**. Si la DB tiene un hipo de 30 segundos, el orquestador reinicia **todos** los contenedores a la vez, que al arrancar golpean la DB en masa: convertiste un problema pequeño en una caída total (*cascading failure*).

### 4.1 Instalación y controller

```bash
npm i @nestjs/terminus
```

```ts
// src/health/health.module.ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis.health';

@Module({
  imports: [
    TerminusModule.forRoot({
      // Al recibir SIGTERM, espera antes de cerrar para que el LB deje de enviar tráfico
      gracefulShutdownTimeoutMs: 5_000,
    }),
  ],
  controllers: [HealthController],
  providers: [RedisHealthIndicator],
})
export class HealthModule {}
```

```ts
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis.health';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  // LIVENESS: barato y sin dependencias externas
  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([
      // Si el heap pasa de 512 MB, algo va mal (posible leak, Sesión 33)
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }

  // READINESS: ¿puedo atender tráfico?
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 1_500 }),
      () => this.redis.isHealthy('redis'),
      () => this.disk.checkStorage('disk', { path: '/', thresholdPercent: 0.9 }),
    ]);
  }
}
```

Respuesta cuando todo está bien (HTTP 200); si algún indicador falla, Terminus responde **503** con el detalle en `error`:

```json
{
  "status": "ok",
  "info": { "database": { "status": "up" }, "redis": { "status": "up" }, "disk": { "status": "up" } },
  "error": {},
  "details": { "database": { "status": "up" }, "redis": { "status": "up" }, "disk": { "status": "up" } }
}
```

Terminus trae indicadores para TypeORM, Mongoose, Sequelize, MikroORM, Prisma, HTTP (`HttpHealthIndicator`, requiere `@nestjs/axios`), microservicios, memoria y disco.

### 4.2 Indicador propio (API de Terminus 11)

En Terminus 11 la forma recomendada es inyectar `HealthIndicatorService` (la clase base `HealthIndicator` y `HealthCheckError` quedaron deprecadas):

```ts
// src/health/redis.health.ts
import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);
    try {
      const inicio = Date.now();
      await this.redis.ping();
      return indicator.up({ latenciaMs: Date.now() - inicio });
    } catch (error) {
      return indicator.down({ message: (error as Error).message });
    }
  }
}
```

> ⚠️ Los endpoints de health **no** deben pasar por tu `AuthGuard` global ni por el rate limiter (el ALB no manda JWT). Márcalos con tu decorador `@Public()` (Sesión 11) y exclúyelos de `ThrottlerGuard` (Sesión 20).

> ❓ **Entrevista**: *"Tu readiness depende de un servicio externo de pagos que está caído. ¿Qué haces?"* → No lo incluyo en readiness: si pagos cae, sacar todas mis instancias del balanceo tumba también el catálogo, que funcionaba. Readiness solo verifica dependencias **sin las cuales no puedo atender nada** (mi DB). Para el resto: circuit breaker y degradación, y una **métrica/alerta** de la dependencia.

---

## 5. Métricas con Prometheus (prom-client)

Prometheus usa un modelo **pull**: cada instancia expone `GET /metrics` en texto plano y Prometheus lo "raspa" (*scrape*) cada N segundos.

### 5.1 Tipos de métricas

| Tipo | Qué es | Ejemplo en TiendaApi |
|---|---|---|
| **Counter** | Solo sube (se reinicia al reiniciar el proceso) | `ordenes_creadas_total` |
| **Gauge** | Sube y baja | `carritos_activos`, conexiones del pool |
| **Histogram** | Distribución en *buckets*; permite percentiles agregables | `http_request_duration_seconds` |
| **Summary** | Percentiles calculados en el cliente | Poco usado: no se agrega entre instancias |

Dos marcos para decidir qué medir:
- **RED** (para servicios): **R**ate (requests/s), **E**rrors (tasa de error), **D**uration (latencia).
- **USE** (para recursos): **U**tilization, **S**aturation, **E**rrors (CPU, pool de conexiones, event loop).

### 5.2 Módulo de métricas

```bash
npm i prom-client
```

```ts
// src/metrics/metrics.service.ts
// Registry propio (no el global) → aislado en tests y sin colisiones entre módulos
import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly httpDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duración de las requests HTTP',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],   // en SEGUNDOS (convención Prometheus)
    registers: [this.registry],
  });

  readonly ordenesCreadas = new Counter({
    name: 'tienda_ordenes_creadas_total',
    help: 'Órdenes creadas',
    labelNames: ['medio_pago'] as const,
    registers: [this.registry],
  });

  constructor() {
    // CPU, memoria, GC, event loop lag, handles activos... del proceso Node
    collectDefaultMetrics({ register: this.registry });
  }
}
```

### 5.3 Medir cada request (middleware)

Uso un **middleware** con `res.on('finish')` en vez de un interceptor porque así también se miden las requests rechazadas por guards (401/403) y por pipes (400), que nunca llegan a los interceptors (Sesión 13).

```ts
// src/metrics/http-metrics.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const finTimer = this.metrics.httpDuration.startTimer();
    res.on('finish', () => {
      // Usa el PATRÓN de la ruta (/productos/:id), NUNCA la URL real (/productos/8f2c...)
      const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : 'unmatched';
      finTimer({ method: req.method, route, status_code: String(res.statusCode) });
    });
    next();
  }
}
```

```ts
// src/metrics/metrics.controller.ts
import { Controller, Get, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  async scrape(@Res() res: Response) {
    res.setHeader('Content-Type', this.metrics.registry.contentType);
    res.send(await this.metrics.registry.metrics());   // metrics() es async
  }
}
```

```ts
// src/metrics/metrics.module.ts
import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HttpMetricsMiddleware } from './http-metrics.middleware';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  providers: [MetricsService],
  controllers: [MetricsController],
  exports: [MetricsService],
})
export class MetricsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Nest 11 usa path-to-regexp v8: el comodín "todas las rutas" se escribe así
    consumer.apply(HttpMetricsMiddleware).forRoutes('{*splat}');
  }
}
```

Métrica de negocio desde un servicio:

```ts
this.metrics.ordenesCreadas.inc({ medio_pago: dto.medioPago }); // 'webpay' | 'transferencia'
```

> ⚠️ **Cardinalidad**: cada combinación única de labels es una serie temporal distinta en Prometheus. Un label con `userId`, `ordenId` o la URL cruda crea millones de series y tumba tu Prometheus (o tu factura). Labels solo con valores **acotados**: método, patrón de ruta, clase de status, medio de pago.

> ⚠️ `/metrics` expone información interna. Sírvelo en un puerto interno, restríngelo por security group o protégelo; nunca lo publiques en el ALB público. Y exclúyelo del middleware de métricas y del log automático.

### 5.4 Consultas útiles (PromQL)

```promql
# Tasa de requests por ruta
sum by (route) (rate(http_request_duration_seconds_count[5m]))

# Tasa de error 5xx
sum(rate(http_request_duration_seconds_count{status_code=~"5.."}[5m]))
  / sum(rate(http_request_duration_seconds_count[5m]))

# Latencia p99 por ruta (histogram_quantile sobre buckets agregados entre instancias)
histogram_quantile(0.99, sum by (le, route) (rate(http_request_duration_seconds_bucket[5m])))
```

> ❓ **Entrevista**: *"¿Por qué histogram y no summary para la latencia?"* → Porque los buckets de un histogram se pueden **sumar entre instancias** y luego calcular el percentil global. Los percentiles de un summary se calculan en cada proceso y **no se pueden promediar** (el promedio de p99 no es el p99). El costo del histogram: precisión limitada por la elección de buckets.

---

## 6. Trazas distribuidas con OpenTelemetry

**OpenTelemetry (OTel)** es el estándar abierto (CNCF) para instrumentar trazas, métricas y logs, independiente del backend: exportas por **OTLP** a Jaeger, Grafana Tempo, Datadog, Honeycomb o AWS X-Ray (vía ADOT collector).

### 6.1 Conceptos

```
Trace  (trace_id = 4bf92f...)                          tiempo ──▶
├─ span: POST /ordenes              [api-gateway]  ████████████████████ 820ms
│  ├─ span: JwtAuthGuard            [api-gateway]  █ 4ms
│  └─ span: POST ordenes.crear      [ordenes]        ███████████████████ 790ms
│     ├─ span: pg.query SELECT stock                  ███████████ 510ms  ← aquí
│     ├─ span: pg.query INSERT orden                      ██ 60ms
│     └─ span: redis SET                                    █ 3ms
```

- **Span**: una operación con inicio, fin, atributos (`http.route`, `db.statement`) y estado.
- **Trace**: árbol de spans que comparten `trace_id`.
- **Context propagation**: el `trace_id` y el span padre viajan entre servicios en el header W3C `traceparent` (`00-<trace_id>-<span_id>-01`).
- **Instrumentación automática**: parches sobre librerías (`http`, `express`, `pg`, `ioredis`, `@nestjs/core`...) que crean spans sin tocar tu código.

### 6.2 Por qué debe inicializarse ANTES de importar Nest

La instrumentación automática funciona **parcheando los módulos cuando se cargan** (hookea `require`). Si `express`, `http` o `pg` ya se importaron antes de iniciar el SDK, las referencias ya existen sin parchear y **no verás spans**.

```
❌ main.ts: import { NestFactory } ...  → carga express, http
            import './tracing'            → demasiado tarde: express ya cargado

✅ node --require ./dist/tracing.js dist/main.js
   (o `import './tracing'` como PRIMERA línea de main.ts en CommonJS)
```

### 6.3 Setup de TiendaApi

```bash
npm i @opentelemetry/api @opentelemetry/sdk-node \
      @opentelemetry/auto-instrumentations-node \
      @opentelemetry/exporter-trace-otlp-http \
      @opentelemetry/exporter-metrics-otlp-http @opentelemetry/sdk-metrics
```

```ts
// src/tracing.ts — se ejecuta ANTES que cualquier otra cosa
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';

export const otelSdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME ?? 'tienda-api',

  // Por defecto envía a http://localhost:4318/v1/traces (un OTel Collector local o sidecar);
  // se configura con OTEL_EXPORTER_OTLP_ENDPOINT sin tocar código
  traceExporter: new OTLPTraceExporter(),

  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 30_000,
  }),

  instrumentations: [
    getNodeAutoInstrumentations({
      // fs genera muchísimos spans inútiles
      '@opentelemetry/instrumentation-fs': { enabled: false },
      // no traces los health checks del load balancer
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingRequestHook: (req) => req.url?.startsWith('/health') ?? false,
      },
    }),
  ],
});

otelSdk.start();
```

```jsonc
// package.json
"scripts": {
  "start:prod": "node --require ./dist/tracing.js dist/main.js"
}
```

Cierre ordenado: el SDK tiene spans en buffer; si el proceso muere sin `shutdown()`, se pierden los últimos. Engánchalo al ciclo de vida de Nest (Sesión 24) en vez de registrar otro `process.on('SIGTERM')` que compita con `enableShutdownHooks`:

```ts
// src/observability/otel-shutdown.service.ts
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { otelSdk } from '../tracing';

@Injectable()
export class OtelShutdownService implements OnApplicationShutdown {
  async onApplicationShutdown() {
    await otelSdk.shutdown();    // flush de spans y métricas pendientes
  }
}
```

> 💡 Alternativa "zero-code": `node --require @opentelemetry/auto-instrumentations-node/register dist/main.js` y configuras todo por variables de entorno (`OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_TRACES_EXPORTER`...). Menos control, cero código.

### 6.4 Spans manuales para lógica de negocio

La instrumentación automática ve HTTP, DB y Nest (controllers/handlers). Tu lógica de negocio interesante (cálculo de descuentos, reserva de stock) necesita spans propios:

```ts
// src/ordenes/ordenes.service.ts (extracto)
import { SpanStatusCode, trace } from '@opentelemetry/api';

const tracer = trace.getTracer('tienda-api.ordenes');

async reservarStock(items: ItemOrdenDto[]) {
  return tracer.startActiveSpan('ordenes.reservarStock', async (span) => {
    span.setAttribute('ordenes.items_count', items.length);   // atributos acotados, sin PII
    try {
      const resultado = await this.stockRepo.reservar(items);  // su span de pg queda como HIJO
      return resultado;
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
      throw err;
    } finally {
      span.end();              // ⚠️ sin end() el span nunca se exporta
    }
  });
}
```

`@opentelemetry/api` es solo la API (no-op si no hay SDK): tus servicios pueden depender de ella sin acoplarse al backend, y en los tests unitarios no hace nada.

### 6.5 Propagación entre microservicios

- **HTTP** (gateway → servicio por REST/axios): automática, la instrumentación de `http` inyecta y extrae `traceparent`.
- **Transports de Nest** (Sesión 29): depende. Hay instrumentaciones para `kafkajs`, `amqplib` y otras, pero un transport TCP de Nest no lleva headers W3C. En esos casos propagas a mano en el payload:

```ts
import { context, propagation } from '@opentelemetry/api';

// Productor: inyecta el contexto actual en un objeto "carrier"
const headers: Record<string, string> = {};
propagation.inject(context.active(), headers);
this.client.emit(ORDENES_EVENTS.CREADA, { ...evento, _otel: headers });

// Consumidor: extrae y ejecuta dentro de ese contexto
const ctx = propagation.extract(context.active(), payload._otel ?? {});
await context.with(ctx, () => this.procesar(payload));
```

### 6.6 Muestreo

Trazar el 100% de las requests en producción es caro. Se muestrea:

```bash
OTEL_TRACES_SAMPLER=parentbased_traceidratio   # respeta la decisión del servicio anterior
OTEL_TRACES_SAMPLER_ARG=0.1                     # 10% de las trazas nuevas
```

`parentbased` es clave: si el gateway decidió trazar, todos los servicios aguas abajo también, y la traza queda **completa**. El *tail sampling* (decidir después de ver la traza, ej. "guarda todas las que tuvieron error o > 1s") se hace en el **OTel Collector**, no en la app.

> ❓ **Entrevista**: *"Instrumentaste con OTel pero no aparecen spans de Postgres ni de Express. ¿Por qué?"* → Casi siempre porque el SDK se inició **después** de que esos módulos se cargaron (importaste `tracing.ts` después de `@nestjs/core`, o con ESM sin el loader correcto). También: la instrumentación desactivada, o el bundler (webpack/esbuild) empaquetó `pg` dentro del bundle y el hook de `require` no lo ve.

---

## 7. Correlación: el mismo trace_id en logs, métricas y trazas

Las auto-instrumentaciones incluyen `@opentelemetry/instrumentation-pino`, que inyecta `trace_id`, `span_id` y `trace_flags` en cada log de Pino emitido dentro de un span activo:

```json
{"level":50,"msg":"Stock insuficiente","ordenId":"ord_123","req":{"id":"b1c7..."},"trace_id":"4bf92f3577b34da6a3ce929d0e0e4736","span_id":"00f067aa0ba902b7"}
```

En Grafana (Loki + Tempo) o Datadog, desde una traza saltas a sus logs y viceversa; con *exemplars*, desde un bucket lento del histograma saltas a una traza concreta.

> 💡 Para propagar **otros** datos por request (tenantId, usuarioId) sin pasarlos por parámetro, usa `AsyncLocalStorage` (o `nestjs-cls`, que lo envuelve para Nest). Es la alternativa barata a los providers `Scope.REQUEST` (Sesión 23), que recrean el subárbol de dependencias en cada request.

---

## 8. De señales a alertas: SLIs y SLOs

- **SLI** (indicador): "proporción de `POST /ordenes` que responden 2xx en < 500 ms".
- **SLO** (objetivo): "99.5% en ventanas de 30 días".
- **Error budget**: el 0.5% restante. Si se consume rápido, se congelan features y se prioriza estabilidad.

Alerta sobre **síntomas que afectan al usuario** (tasa de 5xx > 2% por 10 min, p99 de checkout > 2 s, burn rate del SLO), no sobre causas (CPU al 80%): el CPU alto sin impacto no debería despertarte a las 3 AM.

> ❓ **Entrevista**: *"¿Qué dashboards tendrías el día 1 para TiendaApi?"* → Un dashboard RED por servicio (rate, errores, p50/p95/p99 por ruta), uno USE de recursos (CPU, memoria/heap, event loop lag, pool de DB, lag de colas BullMQ), y métricas de negocio (órdenes/min, pagos fallidos). Con links desde cada panel a trazas y logs filtrados.

---

## Resumen mental de la sesión

```
3 PILARES: métricas avisan → trazas dicen DÓNDE → logs dicen POR QUÉ
           correlacionados por trace_id

LOGS (nestjs-pino)
  LoggerModule.forRoot({ pinoHttp: { level, genReqId, redact, customLogLevel, autoLogging } })
  NestFactory.create(AppModule, { bufferLogs: true }); app.useLogger(app.get(Logger))
  @InjectPinoLogger(X.name) PinoLogger · logger.assign({...}) · info(obj, 'msg constante')
  JSON a stdout en prod · pino-pretty solo en dev · nunca secretos ni PII

HEALTH (@nestjs/terminus)
  liveness = ¿vivo? (sin dependencias) → reinicia
  readiness = ¿atiendo? (DB crítica)    → saca del LB
  HealthCheckService.check([...]) · 503 si falla · HealthIndicatorService (v11)

MÉTRICAS (prom-client)
  Counter · Gauge · Histogram (agregable) · Summary (no agregable)
  RED para servicios, USE para recursos · collectDefaultMetrics
  labels ACOTADOS (patrón de ruta, no URL) · /metrics interno

TRAZAS (OpenTelemetry)
  NodeSDK + getNodeAutoInstrumentations + OTLP exporter
  iniciar ANTES de cargar Nest: node --require ./dist/tracing.js dist/main.js
  startActiveSpan + recordException + setStatus + end()
  traceparent (W3C) · parentbased_traceidratio · shutdown() en onApplicationShutdown
ALERTAS: sobre síntomas (SLO), no causas
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué diferencia hay entre monitoreo y observabilidad? ¿Qué aporta cada pilar?
2. ❓ ¿Por qué logs estructurados en JSON? ¿Por qué el mensaje debe ser constante?
3. ❓ ¿Para qué sirve `bufferLogs: true` en `NestFactory.create`?
4. ❓ ¿Cómo consigue `nestjs-pino` que un log dentro de un servicio singleton lleve el `req.id` de la request actual?
5. ❓ ¿Qué diferencia hay entre liveness y readiness? ¿Por qué no pondrías la DB en liveness?
6. ❓ ¿Cómo implementas un health indicator propio en Terminus 11?
7. ❓ Counter vs Gauge vs Histogram vs Summary. ¿Por qué histogram para latencia?
8. ❓ ¿Qué es la cardinalidad de una métrica y cómo la rompes sin darte cuenta?
9. ❓ ¿Por qué mides la latencia HTTP en un middleware con `res.on('finish')` y no en un interceptor?
10. ❓ ¿Por qué el SDK de OpenTelemetry debe iniciarse antes de importar Nest? ¿Cómo lo garantizas?
11. ❓ ¿Cómo se propaga el contexto de una traza entre servicios HTTP? ¿Y por un transport TCP de Nest?
12. ❓ ¿Qué es `parentbased_traceidratio` y qué problema resuelve el tail sampling?

## Ejercicio práctico
1. Instala `nestjs-pino` en TiendaApi con la configuración de la sección 3.1. Verifica que en dev ves logs legibles y con `NODE_ENV=production` ves JSON en una línea.
2. Haz un `POST /auth/login` y confirma que `authorization` y `password` aparecen como `[Redacted]`.
3. En `OrdenesService` usa `PinoLogger.assign({ usuarioId })` y comprueba que el log final `request completed` también lleva `usuarioId`.
4. Agrega `HealthModule` con `/health/live` (memoria) y `/health/ready` (DB + Redis con tu `RedisHealthIndicator`). Detén el contenedor de Redis y verifica el 503 con el detalle del error; confirma que `/health/live` sigue en 200.
5. Implementa `MetricsModule` con el histograma HTTP y el counter `tienda_ordenes_creadas_total`. Llama a `GET /productos/1`, `/productos/2`, `/productos/3` y comprueba en `/metrics` que hay **una** serie con `route="/productos/:id"`, no tres.
6. Levanta Prometheus + Grafana con docker compose, configura el scrape y grafica p99 por ruta con `histogram_quantile`.
7. Agrega `src/tracing.ts`, levanta Jaeger (`jaegertracing/all-in-one`, puerto OTLP 4318) y arranca con `node --require ./dist/tracing.js dist/main.js`. Busca la traza de un `POST /ordenes` y ubica el span de Postgres.
8. Cambia el orden: importa `tracing` **después** de `@nestjs/core` y comprueba que desaparecen los spans de Express/pg. Explica por qué.
9. Agrega el span manual `ordenes.reservarStock` y fuerza un error: verifica `recordException` en Jaeger y el `trace_id` en el log de Pino correspondiente.

---

➡️ **Cuando termines**, marca la Sesión 32 en el [README](README.md) y pasa a la **Sesión 33 — Performance: Fastify, event loop, profiling, memory leaks, clustering**.

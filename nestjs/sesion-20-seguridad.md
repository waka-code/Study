# Sesión 20 — Seguridad de la API: Helmet, CORS, Throttler, CSRF, OWASP API Top 10

> **Objetivo de la sesión**: endurecer TiendaApi con **defensa en profundidad**. Al terminar deberías poder explicar y configurar **Helmet** (cabeceras de seguridad), **CORS** (qué protege y qué no), **rate limiting** con `@nestjs/throttler` v6 (varios throttlers, overrides por ruta, Redis, proxies), decidir **cuándo necesitas protección CSRF** y cómo implementarla, blindar la entrada contra **inyección** (SQL, NoSQL, mass assignment, payloads gigantes), verificar **webhooks** con HMAC, y recorrer el **OWASP API Security Top 10 (2023)** sabiendo qué hace Nest por ti en cada punto y qué te toca a ti.

---

## 1. Defensa en profundidad

No existe "la" medida de seguridad. Cada capa asume que la anterior puede fallar:

```
Internet
   │
   ▼
[ WAF / CDN ]  ← filtra bots, DDoS volumétrico, reglas OWASP genéricas
   │
[ Load balancer / reverse proxy ]  ← TLS, límites de tamaño, timeouts
   │
   ▼  ─────────────────── TiendaApi (Nest) ───────────────────
[ Helmet ]           cabeceras de seguridad en cada respuesta
[ CORS ]             qué orígenes de navegador pueden leer respuestas
[ Body limits ]      payloads acotados
[ Throttler ]        límites de tasa por IP / usuario / ruta
[ AuthN / AuthZ ]    Sesiones 18–19
[ ValidationPipe ]   whitelist + tipos: nada inesperado llega al servicio
[ Queries parametrizadas ]  sin inyección
[ Exception filter ] errores sin filtrar internals
   │
[ Base de datos ]  usuario con privilegios mínimos, RLS, cifrado en reposo
```

> ❓ **Entrevista**: *"Ya tengo WAF, ¿para qué rate limiting en la app?"* → El WAF ve IPs y patrones genéricos; la app conoce la **semántica**: "5 intentos de login por email", "3 órdenes por minuto por usuario", "el endpoint de exportación es caro". Además el WAF puede no estar (entornos internos, otro despliegue) o ser evadido. Cada capa cubre cosas distintas.

---

## 2. Helmet: cabeceras de seguridad

Helmet es un conjunto de middlewares que fija cabeceras HTTP que le dicen al **navegador** cómo comportarse de forma segura con tus respuestas.

```bash
npm i helmet
```

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Regístralo ANTES de cualquier otro app.use() o ruta: los middlewares
  // registrados antes no llevarían las cabeceras
  app.use(helmet());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

| Cabecera | Qué hace | Relevancia en una API JSON |
|---|---|---|
| `Content-Security-Policy` | Restringe de dónde se cargan scripts, estilos, frames | Baja para JSON; alta si sirves HTML (Swagger UI) |
| `Strict-Transport-Security` | Fuerza HTTPS en visitas futuras (HSTS) | Alta (si todo el dominio es HTTPS) |
| `X-Content-Type-Options: nosniff` | Impide que el navegador "adivine" el tipo MIME | Alta: evita que un JSON se interprete como HTML/JS |
| `X-Frame-Options` / `frame-ancestors` | Evita que te embeban en un iframe (clickjacking) | Media |
| `Referrer-Policy` | Controla qué URL se envía en `Referer` | Media: no filtres tokens en URLs |
| `Cross-Origin-Resource-Policy` | Qué orígenes pueden cargar el recurso | Media |
| Elimina `X-Powered-By` | No anuncia "Express" | Baja (oscuridad), pero gratis |

> ⚠️ **Swagger UI y CSP**: la CSP por defecto de Helmet puede romper Swagger UI (Sesión 21) si cargas assets externos o scripts inline. Ajusta la política en vez de desactivar Helmet:

```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
        scriptSrc: ["'self'", "https: 'unsafe-inline'"],
      },
    },
  }),
);
// Alternativa: exponer Swagger solo en entornos no productivos
```

Con **Fastify** (Sesión 33) se usa el plugin oficial: `await app.register(helmet)` importando `helmet` desde `@fastify/helmet`.

> ⚠️ HSTS con `includeSubDomains` y `preload` es difícil de revertir: los navegadores recordarán forzar HTTPS en todos tus subdominios durante `max-age`. Actívalo con conciencia en el dominio raíz.

---

## 3. CORS: qué es y qué NO es

### 3.1 El modelo mental

La **Same-Origin Policy** del navegador impide que JavaScript de `https://malo.com` **lea** respuestas de `https://api.tienda.cl`. **CORS** es el mecanismo por el cual *tu servidor relaja* esa restricción para orígenes concretos, mediante cabeceras `Access-Control-Allow-*`.

```
Navegador en https://app.tienda.cl                 API https://api.tienda.cl
   │ OPTIONS /ordenes                                    │
   │ Origin: https://app.tienda.cl                       │  ← PREFLIGHT (métodos/headers no simples)
   │ Access-Control-Request-Method: POST                 │
   │ Access-Control-Request-Headers: authorization, content-type
   │────────────────────────────────────────────────────▶│
   │◀──── 204  Access-Control-Allow-Origin: https://app.tienda.cl
   │          Access-Control-Allow-Methods: GET,POST,PATCH,DELETE
   │          Access-Control-Allow-Headers: authorization,content-type
   │          Access-Control-Allow-Credentials: true
   │          Access-Control-Max-Age: 600
   │ POST /ordenes (la request real)                     │
   │────────────────────────────────────────────────────▶│
```

Tres verdades que hay que tener claras:

1. **CORS lo aplica el navegador**, no el servidor. `curl`, Postman, otro backend o un bot ignoran CORS por completo.
2. **CORS no es autenticación ni autorización.** No protege tu API de nadie que no sea un navegador.
3. Para requests "simples" (GET, POST con `form`), el navegador **envía la request igual** y solo bloquea la **lectura** de la respuesta. Los efectos secundarios ocurren. Por eso CORS no sustituye la protección CSRF (sección 5).

### 3.2 Configuración en Nest

```typescript
// src/main.ts
const origenesPermitidos = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean); // p. ej. "https://app.tienda.cl,https://admin.tienda.cl"

app.enableCors({
  origin: (origin, callback) => {
    // Sin Origin: requests no-navegador (curl, server-to-server) → CORS no aplica
    if (!origin || origenesPermitidos.includes(origin)) return callback(null, true);
    return callback(new Error(`Origen no permitido: ${origin}`), false);
  },
  credentials: true,                          // permite cookies (refresh token, Sesión 18)
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-CSRF-Token'],
  exposedHeaders: ['X-RateLimit-Remaining', 'Retry-After'], // headers que JS podrá leer
  maxAge: 600,                                // cachea el preflight 10 min
});
```

> ⚠️ `origin: '*'` con `credentials: true` está **prohibido por la especificación**: el navegador rechaza la respuesta. Y el "arreglo" de **reflejar** cualquier `Origin` recibido (`origin: true` junto con credenciales) equivale a desactivar la Same-Origin Policy para tu API: cualquier sitio puede hacer requests autenticadas con las cookies del usuario y leer la respuesta. Usa siempre una **lista explícita**.

> ⚠️ Cuidado con validaciones por sufijo o regex laxas: `origin.endsWith('tienda.cl')` acepta `https://eviltienda.cl`. Compara orígenes completos, o regex ancladas: `/^https:\/\/([a-z0-9-]+\.)?tienda\.cl$/`.

> ❓ **Entrevista**: *"Tengo un error de CORS en el frontend, ¿lo arreglo en el frontend?"* → No: el error lo produce el navegador porque el **servidor** no devolvió las cabeceras adecuadas para ese origen. Se arregla en la configuración CORS del backend (o con un proxy del mismo origen en desarrollo). Y si alguien propone `origin: '*'`, la respuesta es no si hay credenciales.

---

## 4. Rate limiting con `@nestjs/throttler` v6

### 4.1 Por qué

Sin límites, un atacante puede: probar millones de contraseñas (fuerza bruta / credential stuffing), enumerar ids, disparar endpoints caros (exportaciones, búsquedas) hasta tumbar la base, o abusar de flujos de negocio (reservar todo el stock). Es la categoría **API4: Unrestricted Resource Consumption** del OWASP.

### 4.2 Configuración básica

```bash
npm i @nestjs/throttler
```

En la v6, `ttl` y `blockDuration` se expresan en **milisegundos**, y se configura un **array de throttlers**, cada uno con nombre. Todos se evalúan en cada request: basta que uno se exceda para responder **429**.

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, seconds, minutes } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'corto', ttl: seconds(1), limit: 5 },     // ráfagas: máx. 5 req/s
      { name: 'medio', ttl: seconds(10), limit: 30 },
      { name: 'largo', ttl: minutes(1), limit: 100 },   // sostenido: 100 req/min
    ]),
  ],
  providers: [
    // Global: toda ruta queda limitada. (seconds(1) === 1000, es azúcar para ms)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
```

Por defecto la clave de conteo (el *tracker*) es la **IP** del cliente, y el contador es por **tracker + ruta + nombre de throttler**. Las respuestas incluyen cabeceras como `X-RateLimit-Limit-<nombre>`, `X-RateLimit-Remaining-<nombre>`, `X-RateLimit-Reset-<nombre>` y, al exceder, `Retry-After`.

### 4.3 Overrides por ruta

```typescript
import { SkipThrottle, Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  // Login: mucho más estricto. Se sobrescribe por NOMBRE de throttler
  @Throttle({ largo: { limit: 5, ttl: minutes(1), blockDuration: minutes(5) } })
  @Post('login')
  login() { /* ... */ }
}

// @SkipThrottle() a secas solo salta el throttler llamado 'default';
// con throttlers nombrados hay que listarlos:
@SkipThrottle({ corto: true, medio: true, largo: true })
@Controller('health')
export class HealthController {}         // health checks del load balancer (Sesión 32)
```

> ⚠️ `@SkipThrottle()` sin argumentos equivale a `@SkipThrottle({ default: true })`: solo salta el throttler llamado **`default`**. Si nombraste tus throttlers (`corto`, `largo`), debes listarlos explícitamente, o la ruta seguirá limitada.

> 💡 `blockDuration` (v6): cuando se excede el límite, el cliente queda bloqueado ese tiempo aunque la ventana `ttl` ya haya pasado. Útil para desalentar fuerza bruta.

### 4.4 Tracker personalizado: por usuario, por email

Limitar el login solo por IP no frena un *credential stuffing* distribuido (miles de IPs, un intento cada una contra el mismo email). Y limitar la API solo por IP castiga a oficinas enteras detrás de un NAT. Personaliza el tracker extendiendo el guard:

```typescript
// src/common/guards/throttler-por-usuario.guard.ts
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerPorUsuarioGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Autenticado → por usuario; login → por email; resto → por IP
    if (req.user?.id) return `u:${req.user.id}`;
    if (req.body?.email) return `e:${String(req.body.email).toLowerCase()}`;
    return `ip:${req.ip}`;
  }
}
```

> ⚠️ Si el throttler es global y corre **antes** que el guard de autenticación, `req.user` todavía no existe. Registra el `JwtAuthGuard` primero, o aplica este guard con `@UseGuards` en los controllers donde lo necesites.

### 4.5 Detrás de un proxy o load balancer

Detrás de un ALB/Nginx, `req.ip` es la IP **del proxy**: todos los clientes comparten contador y el primero que abuse bloquea a todos. Hay que decirle a Express en cuántos proxies confiar:

```typescript
import { NestExpressApplication } from '@nestjs/platform-express';

const app = await NestFactory.create<NestExpressApplication>(AppModule);
app.set('trust proxy', 1); // confía en 1 salto (el ALB): req.ip = IP real desde X-Forwarded-For
```

> ⚠️ **No** pongas `trust proxy: true` sin pensar: confiaría en cualquier `X-Forwarded-For`, y un atacante lo falsifica para obtener un contador nuevo en cada request. Confía exactamente en el número de proxies que controlas.

### 4.6 Varias instancias: almacenamiento en Redis

El storage por defecto es **en memoria**: con 4 réplicas, cada una tiene su propio contador y el límite real es 4× el configurado (y se reinicia en cada deploy). Para producción usa un storage compartido, por ejemplo el paquete comunitario `@nest-lab/throttler-storage-redis`:

```typescript
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

ThrottlerModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    throttlers: [{ name: 'largo', ttl: minutes(1), limit: 100 }], // forma objeto: throttlers + storage
    storage: new ThrottlerStorageRedisService(config.getOrThrow<string>('REDIS_URL')),
  }),
});
```

> 💡 El throttler también funciona en WebSockets y GraphQL, pero requiere extender el guard para extraer `req`/`res` de ese contexto (Sesiones 27–28).

---

## 5. CSRF: ¿lo necesito?

### 5.1 El ataque

**CSRF** (*Cross-Site Request Forgery*) explota que el navegador **adjunta cookies automáticamente**. Si el usuario está logueado en TiendaApi con una cookie de sesión y visita `malo.com`, esta página puede hacer:

```html
<form action="https://api.tienda.cl/usuarios/me/email" method="POST">
  <input name="email" value="atacante@malo.com">
</form>
<script>document.forms[0].submit()</script>
```

El navegador envía la request **con la cookie** del usuario. CORS no lo impide: es un POST "simple" de formulario, y al atacante no le importa leer la respuesta.

### 5.2 ¿Aplica a mi API?

| Cómo se autentica la request | ¿Vulnerable a CSRF? |
|---|---|
| `Authorization: Bearer <token>` puesto por JavaScript | **No**: el navegador no lo añade solo; `malo.com` no conoce el token |
| Cookie de sesión / token en cookie, **sin** `SameSite` | **Sí** |
| Cookie con `SameSite=Lax` | Protegido en POST cross-site; vulnerable si tienes GET con efectos secundarios |
| Cookie con `SameSite=Strict` | Protegido casi siempre (salvo ataques desde subdominios del mismo *site*) |

En la Sesión 18, el access token viaja en `Authorization` (inmune) y solo el refresh token va en cookie `httpOnly; SameSite=Strict; path=/auth`. El único endpoint expuesto es `POST /auth/refresh`, y un atacante que lo dispare solo consigue que el navegador del usuario reciba un token nuevo que el atacante **no puede leer**. Riesgo bajo, pero en endpoints con cookie y efectos (logout, cambiar email) conviene una defensa explícita.

### 5.3 Defensas

1. **`SameSite=Strict` o `Lax`** en las cookies (primera línea, gratis).
2. **Nunca** efectos secundarios en `GET`.
3. **Verificar `Origin`** en requests que cambian estado (barato y eficaz).
4. **Token CSRF** (*double submit* o *synchronizer*) cuando usas sesiones en cookie para toda la API.

> ⚠️ El paquete `csurf` está **deprecado** desde 2022. No lo uses en proyectos nuevos.

Double submit cookie con `csrf-csrf` (Express):

```bash
npm i csrf-csrf cookie-parser
```

```typescript
// src/main.ts
import * as cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';

app.use(cookieParser());

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET!,
  // Ata el token a la sesión del usuario (aquí, el id de la sesión o del refresh token)
  getSessionIdentifier: (req) => req.cookies?.sid ?? '',
  cookieName: '__Host-csrf',               // prefijo __Host-: exige Secure, path=/ y sin Domain
  cookieOptions: { sameSite: 'strict', secure: true, httpOnly: true },
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

app.use(doubleCsrfProtection); // valida POST/PUT/PATCH/DELETE; GET/HEAD/OPTIONS se ignoran
// Un endpoint GET /csrf devuelve generateCsrfToken(req, res) para que el frontend lo envíe en X-CSRF-Token
```

> 💡 La API de `csrf-csrf` cambió entre versiones mayores (p. ej. `generateToken` → `generateCsrfToken` y `getSessionIdentifier` obligatorio en la v4). Revisa el README de la versión que instales. Con Fastify, el equivalente es `@fastify/csrf-protection`.

Verificación de `Origin` como guard ligero:

```typescript
@Injectable()
export class OrigenGuard implements CanActivate {
  private readonly permitidos = new Set((process.env.CORS_ORIGINS ?? '').split(','));
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
    const origin = req.headers.origin;
    // Sin Origin → no es un navegador moderno cross-site (o es server-to-server)
    if (!origin || this.permitidos.has(origin)) return true;
    throw new ForbiddenException('Origen no permitido');
  }
}
```

> ❓ **Entrevista**: *"¿Mi API REST con JWT necesita CSRF?"* → Si el JWT viaja en el header `Authorization` y lo pone el JavaScript del frontend, no: el navegador no lo adjunta automáticamente. Sí lo necesita si el token o la sesión viajan en **cookies**; entonces uso `SameSite`, verifico `Origin` y, si la API entera depende de cookies, un token CSRF.

---

## 6. Entrada: validación, límites e inyección

### 6.1 ValidationPipe estricto (Sesión 6)

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // elimina propiedades sin decoradores → anti mass-assignment
    forbidNonWhitelisted: true,   // ...o mejor: 400 si llegan (detecta clientes mal hechos / ataques)
    transform: true,
    transformOptions: { enableImplicitConversion: false }, // conversión explícita con @Type
  }),
);
```

### 6.2 Límite de tamaño del body

Por defecto el body parser JSON de Express acepta hasta **100 kb**. Hazlo explícito y ajústalo por necesidad:

```typescript
const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: true });
app.useBodyParser('json', { limit: '100kb' });
app.useBodyParser('urlencoded', { limit: '50kb', extended: true });
// Uploads: límites en Multer (fileSize, files), Sesión 26
```

También limita **arrays** y **strings** en los DTOs (`@ArrayMaxSize(50)`, `@MaxLength(2000)`) y el `limit` de paginación (`@Max(100)`, Sesión 17): un JSON de 100 kb con 10 000 items por crear sigue siendo un ataque de consumo.

### 6.3 Inyección SQL

Los ORMs parametrizan por defecto; el peligro está en los atajos:

```typescript
// ❌ Concatenar en QueryBuilder o raw
this.repo.createQueryBuilder('p').where(`p.nombre = '${nombre}'`);          // SQLi
this.prisma.$queryRawUnsafe(`SELECT * FROM productos WHERE nombre = '${nombre}'`); // SQLi

// ✅ Parámetros
this.repo.createQueryBuilder('p').where('p.nombre = :nombre', { nombre });
this.prisma.$queryRaw`SELECT * FROM productos WHERE nombre = ${nombre}`;   // tagged template: parametriza

// ⚠️ Identificadores (columnas de ORDER BY) NO se pueden parametrizar → lista blanca
const COLUMNAS = { precio: 'p.precio', fecha: 'p.createdAt' } as const;
qb.orderBy(COLUMNAS[dto.orden] ?? 'p.createdAt', 'DESC');
```

### 6.4 Inyección NoSQL (Mongo)

```typescript
// Body malicioso: { "email": "admin@tienda.cl", "password": { "$ne": null } }
await this.usuarioModel.findOne({ email: body.email, password: body.password }); // 💥 match sin password
```

Defensas:
- DTO con `@IsString()` en cada campo: `{ "$ne": null }` no es string → 400. **La validación es la defensa principal.**
- `mongoose.set('sanitizeFilter', true)` (Mongoose ≥ 6): envuelve en `$eq` los objetos con claves `$` en los filtros.
- No construyas filtros con objetos del usuario sin mapear: `find(req.query)` es una invitación.

> ⚠️ `express-mongo-sanitize` y otros middlewares que **reasignan `req.query`** no funcionan con **Express 5**, que es el que usa Nest 11 (`req.query` es un getter). Usa validación con DTOs y `sanitizeFilter`.

### 6.5 Otras clases de entrada peligrosa

| Riesgo | Ejemplo | Mitigación |
|---|---|---|
| **ReDoS** | `@Matches(/^(a+)+$/)` con input largo bloquea el event loop | Regex simples, longitud máxima antes de la regex |
| **Prototype pollution** | `{"__proto__": {"isAdmin": true}}` en merges profundos | `whitelist` del ValidationPipe; no hagas `merge` profundo de input |
| **Path traversal** | `GET /archivos?nombre=../../etc/passwd` | Resolver y verificar prefijo; ids en vez de nombres (Sesión 26) |
| **Deserialización** | Parsear YAML/XML con features peligrosas | Parsers seguros, deshabilitar entidades externas (XXE) |

---

## 7. Webhooks y comparaciones seguras

Una pasarela de pago llama a `POST /webhooks/pagos` avisando "orden 17 pagada". Sin verificación, cualquiera puede marcar órdenes como pagadas. La pasarela firma el **body crudo** con HMAC:

```typescript
// main.ts: conserva el body crudo (req.rawBody) para poder verificar la firma
const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
```

```typescript
// src/webhooks/webhooks.controller.ts
import { Controller, Headers, Post, RawBodyRequest, Req, UnauthorizedException, HttpCode } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Controller('webhooks')
export class WebhooksController {
  @Public()
  @SkipThrottle({ corto: true, medio: true, largo: true }) // la pasarela puede enviar ráfagas legítimas
  @HttpCode(200)
  @Post('pagos')
  recibir(@Req() req: RawBodyRequest<Request>, @Headers('x-firma') firma?: string) {
    const esperado = createHmac('sha256', process.env.WEBHOOK_SECRET!).update(req.rawBody!).digest();
    const recibido = Buffer.from(firma ?? '', 'hex');
    // timingSafeEqual: tiempo constante (evita adivinar la firma byte a byte midiendo tiempos)
    if (recibido.length !== esperado.length || !timingSafeEqual(recibido, esperado)) {
      throw new UnauthorizedException('Firma inválida');
    }
    // Verifica también un timestamp firmado (anti-replay) e IDEMPOTENCIA por id de evento
    // ... encolar el procesamiento (Sesión 25) y responder rápido
  }
}
```

> ⚠️ Verifica la firma sobre el **body crudo**, no sobre `JSON.stringify(req.body)`: el re-serializado puede diferir (orden de claves, espacios) y la firma no coincidirá, o peor, validarás algo distinto de lo que se firmó.

---

## 8. OWASP API Security Top 10 (2023)

| # | Riesgo | Qué es | En Nest / TiendaApi |
|---|---|---|---|
| **API1** | Broken Object Level Authorization (**BOLA**) | Acceder a objetos ajenos cambiando el id | Consultas acotadas por `user.id`, CASL por instancia (Sesión 19) |
| **API2** | Broken Authentication | Fuerza bruta, tokens débiles, sin expiración | argon2, JWT corto + refresh rotado (Sesión 18), throttler en login |
| **API3** | Broken Object **Property** Level Authorization | Leer o escribir **propiedades** que no deberías (mass assignment, over-exposure) | `whitelist` + DTOs de entrada; DTOs/serialización de salida (Sesión 21); `permittedFieldsOf` |
| **API4** | Unrestricted Resource Consumption | Sin límites de tasa, tamaño, paginación | Throttler, `useBodyParser` limits, `@Max` en `limit`, timeouts (Sesión 12) |
| **API5** | Broken **Function** Level Authorization | Cliente llama a endpoints de admin | Guards de roles/permisos globales, "denegar por defecto" |
| **API6** | Unrestricted Access to Sensitive Business Flows | Bots que compran todo el stock o abusan de cupones | Límites por usuario, CAPTCHA, detección de patrones, reglas de negocio |
| **API7** | Server-Side Request Forgery (**SSRF**) | La API hace requests a URLs del usuario → alcanza la red interna | Allowlist de dominios, bloquear IPs privadas y metadata (`169.254.169.254`) |
| **API8** | Security Misconfiguration | CORS abierto, stack traces, Swagger público, headers | Helmet, CORS con lista, exception filter, config por entorno |
| **API9** | Improper Inventory Management | Versiones viejas o endpoints de debug olvidados expuestos | Versionado y deprecación (Sesión 21), inventario OpenAPI, apagar `/v1` |
| **API10** | Unsafe Consumption of APIs | Confiar ciegamente en respuestas de terceros | Validar respuestas externas, timeouts, TLS, circuit breakers |

### 8.1 SSRF en la práctica

```typescript
// "Importar imagen de producto desde URL": clásico vector de SSRF
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const DOMINIOS_PERMITIDOS = new Set(['cdn.proveedor.cl', 'images.unsplash.com']);

async function validarUrlExterna(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new BadRequestException('Solo https');
  if (!DOMINIOS_PERMITIDOS.has(url.hostname)) throw new BadRequestException('Dominio no permitido');
  // Defensa extra: que el DNS no resuelva a una IP interna (10.x, 127.x, 169.254.x, 192.168.x...)
  const { address } = await lookup(url.hostname);
  if (isIP(address) && esIpPrivada(address)) throw new BadRequestException('Destino no permitido');
  return url;
}
// Además: sin seguir redirects automáticamente, timeout corto, tamaño máximo de respuesta
```

> ⚠️ Una **allowlist** de dominios es mucho más robusta que una denylist de IPs: hay decenas de formas de escribir `127.0.0.1` (decimal, octal, IPv6 `::ffff:127.0.0.1`) y el DNS puede cambiar entre la validación y la request (*DNS rebinding*).

### 8.2 Errores que no filtran información (API8)

```typescript
// Exception filter global (Sesión 9): nunca stack traces ni mensajes de la BD al cliente
@Catch()
export class TodoFilter implements ExceptionFilter {
  private readonly logger = new Logger(TodoFilter.name);
  catch(ex: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (ex instanceof HttpException) return res.status(ex.getStatus()).json(ex.getResponse());
    this.logger.error(ex);                      // detalle completo solo en logs internos
    res.status(500).json({ statusCode: 500, message: 'Error interno' }); // genérico hacia fuera
  }
}
```

Y en los logs: **redacta** `authorization`, `cookie`, `password`, tokens (Pino tiene `redact`, Sesión 32).

---

## 9. Secretos y cadena de suministro

| Área | Práctica |
|---|---|
| Secretos | Nunca en el repo; `.env` solo local; en producción Secrets Manager / Parameter Store (Sesión 34); rotación periódica |
| Validación de config | Falla al arrancar si falta un secreto (Sesión 7): mejor que un JWT firmado con `undefined` |
| Dependencias | `npm ci` con lockfile en CI; `npm audit` / Dependabot / Snyk; revisar dependencias nuevas |
| Imagen Docker | Usuario no root, imagen mínima, sin devDependencies (Sesión 34) |
| Base de datos | Usuario de la app sin permisos DDL; el usuario de migraciones es otro |
| TLS | HTTPS extremo a extremo o al menos hasta el load balancer; HSTS |

---

## 10. `main.ts` endurecido: todo junto

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  app.set('trust proxy', 1);                         // IP real detrás del ALB (throttler, logs)
  app.use(helmet());                                 // cabeceras de seguridad, lo primero
  const origenesPermitidos = (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean);
  app.enableCors({ origin: origenesPermitidos, credentials: true, maxAge: 600 }); // array = lista exacta
  app.useBodyParser('json', { limit: '100kb' });     // payloads acotados
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();                         // cierre ordenado (Sesión 34)

  if (process.env.NODE_ENV !== 'production') {
    // Swagger solo fuera de producción, o detrás de auth (Sesión 21)
  }
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
// En AppModule: APP_GUARD en orden → JwtAuthGuard, RolesGuard, ThrottlerGuard; filtro global de errores
```

---

## Resumen mental de la sesión

```
Defensa en profundidad: WAF → proxy → Helmet → CORS → límites → throttler → AuthN/Z → validación → queries param.

HELMET: app.use(helmet()) primero; nosniff, HSTS, frame-ancestors, CSP (ajustar para Swagger)
CORS: lo aplica el NAVEGADOR; no es auth; no evita que la request llegue
  lista explícita de orígenes; '*' + credentials PROHIBIDO; nunca reflejar cualquier Origin
THROTTLER v6: forRoot([{ name, ttl(ms), limit, blockDuration? }, ...]) + APP_GUARD ThrottlerGuard
  @Throttle({ nombre: { limit, ttl } })  @SkipThrottle({ nombre: true }) (sin args = 'default')
  getTracker(): usuario / email / IP;  trust proxy = nº exacto de proxies
  varias réplicas → storage Redis (en memoria = límite × réplicas)
CSRF: solo si hay auth por COOKIE. Bearer en header = inmune
  SameSite + no efectos en GET + verificar Origin + token (csrf-csrf; csurf deprecado)
ENTRADA: whitelist + forbidNonWhitelisted; useBodyParser limit; @Max/@ArrayMaxSize
  SQL: parámetros (:x, $queryRaw``), lista blanca para ORDER BY; nunca $queryRawUnsafe con input
  NoSQL: @IsString + sanitizeFilter; express-mongo-sanitize rompe con Express 5
WEBHOOKS: rawBody: true + HMAC + timingSafeEqual + anti-replay + idempotencia
OWASP API 2023: 1 BOLA · 2 AuthN · 3 Propiedades · 4 Recursos · 5 Funciones
  6 Flujos de negocio · 7 SSRF · 8 Misconfig · 9 Inventario · 10 APIs de terceros
Errores: genéricos hacia fuera, detalle en logs redactados
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué es defensa en profundidad? Nombra cinco capas de seguridad de una API Nest.
2. ❓ ¿Qué hace Helmet? Nombra tres cabeceras y qué ataque mitiga cada una.
3. ❓ ¿CORS protege tu API de un atacante que usa `curl`? ¿Qué protege exactamente?
4. ❓ ¿Por qué `origin: '*'` con `credentials: true` no funciona y por qué reflejar el `Origin` es peligroso?
5. ❓ ¿Qué es una request preflight y cuándo ocurre?
6. ❓ Configura `@nestjs/throttler` v6 con dos límites (ráfaga y sostenido) y uno más estricto para login. ¿En qué unidad va `ttl`?
7. ❓ ¿Por qué el rate limit falla detrás de un load balancer y cómo lo corriges sin abrir otro agujero?
8. ❓ ¿Qué problema tiene el storage en memoria del throttler con varias réplicas?
9. ❓ ¿Cuándo necesita tu API protección CSRF y cuándo no? ¿Qué aporta `SameSite`?
10. ❓ ¿Cómo evitas inyección SQL con TypeORM y Prisma? ¿Qué no se puede parametrizar?
11. ❓ Muestra un ataque de inyección NoSQL en un login y cómo lo previenes.
12. ❓ Recorre el OWASP API Top 10 2023 y di una mitigación en Nest para BOLA, API3 y SSRF.

## Ejercicio práctico
1. Agrega `helmet()` en `main.ts` y compara con `curl -I` las cabeceras antes y después. Verifica que `X-Powered-By` desapareció.
2. Configura CORS con lista de orígenes desde `CORS_ORIGINS`. Desde una página HTML servida en `http://localhost:5173`, haz un `fetch` con credenciales y comprueba el preflight en DevTools; luego prueba desde un origen no permitido.
3. Instala `@nestjs/throttler`, configura los throttlers `corto`, `medio` y `largo` como guard global y verifica con un bucle de `curl` que recibes `429` y la cabecera `Retry-After`.
4. Aplica `@Throttle` estricto con `blockDuration` a `POST /auth/login` y `@SkipThrottle` (con los nombres correctos) al health check.
5. Implementa `ThrottlerPorUsuarioGuard` con `getTracker` por usuario / email / IP y verifica que dos usuarios distintos desde la misma IP tienen contadores separados.
6. Configura `trust proxy` y simula el proxy enviando `X-Forwarded-For`; explica qué pasaría con `trust proxy: true`.
7. Implementa el `OrigenGuard` para métodos que cambian estado y pruébalo con un formulario HTML desde otro origen contra `POST /auth/logout`.
8. Reproduce la inyección NoSQL de la sección 6.4 en la versión Mongoose de TiendaApi y corrígela con DTO + `sanitizeFilter`.
9. Implementa `POST /webhooks/pagos` con `rawBody: true`, HMAC-SHA256 y `timingSafeEqual`; escribe un script que envíe un evento firmado y otro con firma alterada.
10. Haz una auditoría de TiendaApi contra la tabla del OWASP API Top 10: por cada punto, anota qué mitigación tienes y qué falta.

---

➡️ **Cuando termines**, marca la Sesión 20 en el [README](README.md) y pasa a la **Sesión 21 — OpenAPI/Swagger, versionado de API y serialización de respuestas**.

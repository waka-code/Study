# Sesión 7 — Configuración: ConfigModule, .env, validación de config y entornos

> **Objetivo de la sesión**: dejar de esparcir `process.env.ALGO` por el código. Al terminar deberías poder explicar *por qué* la configuración vive fuera del código (12-Factor), cargar `.env` con **`@nestjs/config`**, leer valores **tipados** con `ConfigService`, **validar** la configuración al arrancar (Joi, class-validator o Zod) para fallar rápido, organizarla en **namespaces** con `registerAs`, usarla en módulos asíncronos (`forRootAsync`), manejar varios **entornos** y saber dónde viven los **secretos** en producción. También conocerás los cambios de `@nestjs/config` v4 que trajo Nest 11.

---

## 1. Por qué la configuración va fuera del código

El factor III de la metodología **12-Factor App** dice: *"guarda la configuración en el entorno"*. Configuración es todo lo que **cambia entre despliegues** (dev, staging, prod) y no cambia el comportamiento del código:

| Es configuración | NO es configuración |
|---|---|
| URL y credenciales de la BD | Rutas de la API |
| API keys de terceros (pagos, email) | Reglas de negocio ("envío gratis sobre $50.000") *— discutible, a veces feature flags* |
| Puerto, nivel de log, orígenes CORS | Estructura de módulos |
| TTL de caché, timeouts | Mensajes de validación |

¿Por qué en variables de entorno?

1. **El mismo artefacto** (imagen Docker) se despliega en todos los entornos; solo cambia el entorno (Sesión 34).
2. **Los secretos no entran al repositorio**: un `git log` no debe revelar la contraseña de producción.
3. Son **agnósticas** de lenguaje y plataforma: ECS, Kubernetes, Lambda, systemd y `docker run -e` las entienden.

> ❓ **Entrevista**: *"¿Por qué no un `config.production.ts` en el repo?"* → Porque obliga a recompilar/reconstruir para cambiar un valor, mezcla secretos con código versionado y rompe el principio de "un artefacto, muchos entornos". Los archivos por entorno están bien para **valores no secretos por defecto**, pero los secretos y lo que varía por despliegue deben venir del entorno.

---

## 2. Antes de Nest: `process.env`, dotenv y Node 20+

`process.env` es un objeto con **strings** (o `undefined`). Nada más: sin tipos, sin validación, sin defaults.

```typescript
const puerto = process.env.PORT;          // string | undefined
const ttl = process.env.CACHE_TTL * 2;    // ❌ TS se queja; en JS sería "3003" * 2 = 6006... o NaN
```

Un archivo `.env` es solo una convención para desarrollo local: líneas `CLAVE=valor` que alguien carga en `process.env`. Históricamente ese "alguien" era la librería **dotenv**. Desde Node 20.6 existe soporte nativo:

```bash
node --env-file=.env dist/main.js      # Node ≥ 20.6
```

```typescript
process.loadEnvFile('.env');           // Node ≥ 20.12 / 21.7, programático
```

`@nestjs/config` usa **dotenv** por debajo y añade encima lo que falta: carga en el arranque del módulo, validación, tipado, namespaces e integración con DI.

> ⚠️ `.env` **siempre** en `.gitignore`. Versiona un `.env.example` con las claves (sin valores secretos) para documentar qué necesita la app.

---

## 3. `ConfigModule.forRoot()`

```bash
npm i @nestjs/config
```

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,                          // ConfigService disponible en todos los módulos sin importarlo
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}.local`,
                    `.env.${process.env.NODE_ENV ?? 'development'}`,
                    '.env'],                  // el PRIMERO que defina una clave gana
      cache: true,                             // cachea lecturas de process.env (micro-optimización)
      expandVariables: true,                   // permite ${OTRA_VAR} dentro de .env
    }),
    // ...ProductosModule, UsuariosModule, etc.
  ],
})
export class AppModule {}
```

Opciones importantes:

| Opción | Qué hace |
|---|---|
| `isGlobal` | Registra el módulo como global (Sesión 3). Casi siempre `true` para config. |
| `envFilePath` | Ruta o array de rutas. Si una clave está en varios archivos, **gana el primero**. |
| `ignoreEnvFile` | No lee ningún `.env` (útil en producción/contenedores donde todo viene del entorno). |
| `load` | Array de *factories* de configuración custom (sección 6). |
| `validationSchema` / `validationOptions` | Validación con Joi (sección 5). |
| `validate` | Función de validación propia (class-validator, Zod...). |
| `expandVariables` | Interpolación `${VAR}` en `.env`. |
| `cache` | Cachea valores leídos. |
| `validatePredefined` | (v4) Valida también variables **ya presentes** en `process.env` antes de cargar el módulo (default `true`). Reemplaza al deprecado `ignoreEnvVars`. |
| `skipProcessEnv` | (v4) `ConfigService#get` **no** lee `process.env`; solo configuración interna/validada. |

¿Quién gana si la clave está en el archivo **y** en el entorno real? **La variable de entorno real**. dotenv no sobreescribe variables ya definidas en `process.env`. Esto es exactamente lo que quieres: en un contenedor, lo que inyecta ECS/Kubernetes prevalece sobre cualquier `.env` que se haya colado.

```
.env / .env.development  ──┐
                           ├─▶ dotenv NO pisa lo que ya existe
Variables reales del SO ───┘      (entorno real > archivo)
```

```bash
# .env
DB_HOST=localhost
DB_PORT=5432
DB_USER=tienda
DB_PASSWORD=tienda
DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/tienda   # requiere expandVariables
```

> ⚠️ `ConfigModule.forRoot()` debe estar en el **módulo raíz** (o importado muy temprano). Si otro módulo lee `process.env` en tiempo de **import** (a nivel de archivo, fuera de clases), el `.env` todavía no se cargó y leerá `undefined`. Ver sección 10.

---

## 4. `ConfigService`: leer valores

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PagosService {
  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return this.config.get<string>('PAGOS_BASE_URL', 'https://sandbox.pagos.cl'); // con default
  }

  private get apiKey(): string {
    return this.config.getOrThrow<string>('PAGOS_API_KEY');   // lanza si no existe
  }
}
```

| Método | Si la clave no existe |
|---|---|
| `get<T>(key)` | `undefined` |
| `get<T>(key, default)` | `default` |
| `getOrThrow<T>(key)` | Lanza `TypeError` en ese momento |

> ⚠️ El genérico de `get<number>('PORT')` es **solo una aserción de tipo**: no convierte nada. Si viene de `process.env`, sigue siendo el string `"3000"`. La conversión real la hace la **validación** (sección 5) o tus factories (sección 6).

### 4.1 `ConfigService` tipado de verdad

`ConfigService` acepta dos genéricos: la forma de tu configuración y un booleano `WasValidated`:

```typescript
// src/config/env.ts
export interface EnvVars {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
}

@Injectable()
export class AppService {
  // true = "la config fue validada": get() devuelve T, no T | undefined
  constructor(private readonly config: ConfigService<EnvVars, true>) {}

  puerto() {
    return this.config.get('PORT', { infer: true });   // tipo: number (inferido de EnvVars)
  }
}
```

Con `{ infer: true }` el tipo se infiere de la interface y el autocompletado sugiere las claves válidas. Recuerda: el tipo es tan confiable como tu validación.

### 4.2 Precedencia de lectura en `@nestjs/config` v4 (Nest 11)

Nest 11 trae `@nestjs/config` v4, que **cambió el orden** en que `ConfigService#get` busca una clave:

```
1. Configuración interna   (factories de `load`, namespaces con registerAs)
2. Variables validadas     (resultado de validationSchema / validate)
3. process.env
```

Antes (v3) las variables validadas se leían primero, así que una factory de `load` no podía sobrescribir un valor de `process.env`. Ahora sí. Si migras desde Nest 10 y usabas nombres de clave iguales en `load` y en `.env`, revisa qué valor obtienes.

---

## 5. Validar la configuración: *fail fast*

¿Qué pasa si en producción falta `JWT_SECRET`? Sin validación, la app **arranca**, pasa el health check, recibe tráfico... y la primera request de login lanza un error 500 con `secretOrPrivateKey must have a value`. Peor: un `JWT_SECRET` vacío podría firmar tokens con una clave predecible.

La regla: **si la configuración es inválida, la app no debe arrancar**. El despliegue falla, el orquestador (ECS) no reemplaza las tareas sanas y nadie recibe errores 500.

```
Sin validación:  deploy ✅ → health ✅ → tráfico → 💥 500 en runtime (a las 3 AM)
Con validación:  deploy ❌ "JWT_SECRET is required" → rollback automático, tareas viejas siguen vivas
```

### 5.1 Opción A: Joi (la de la documentación oficial)

```bash
npm i joi
```

```typescript
import * as Joi from 'joi';

ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: Joi.object({
    NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
    PORT: Joi.number().port().default(3000),          // convierte "3000" → 3000
    DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
    JWT_SECRET: Joi.string().min(32).required(),
    CORS_ORIGINS: Joi.string().default('http://localhost:5173'),
    LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace').default('info'),
  }),
  validationOptions: {
    allowUnknown: true,     // process.env tiene cientos de variables del SO (PATH, HOME...): permítelas
    abortEarly: false,      // reporta TODOS los errores, no solo el primero
  },
});
```

> ⚠️ Sin `allowUnknown: true` (que es el default de Nest para este schema, pero conviene ser explícito), Joi rechazaría `PATH`, `HOME` y demás variables del sistema operativo.

### 5.2 Opción B: class-validator (reutiliza lo de la Sesión 6)

```typescript
// src/config/env.validation.ts
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, IsString, IsUrl, Max, Min, MinLength, validateSync } from 'class-validator';

enum Entorno { Development = 'development', Test = 'test', Production = 'production' }

class EnvironmentVariables {
  @IsEnum(Entorno)
  NODE_ENV: Entorno = Entorno.Development;

  @IsInt() @Min(0) @Max(65535)
  PORT: number = 3000;

  @IsUrl({ protocols: ['postgres', 'postgresql'], require_tld: false })
  DATABASE_URL!: string;

  @IsString() @MinLength(32)
  JWT_SECRET!: string;
}

export function validate(config: Record<string, unknown>) {
  const validado = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,   // aquí SÍ conviene: "3000" → 3000 según el tipo declarado
  });
  const errores = validateSync(validado, { skipMissingProperties: false });
  if (errores.length > 0) {
    throw new Error(`Configuración inválida:\n${errores.map((e) => ` - ${Object.values(e.constraints ?? {}).join(', ')}`).join('\n')}`);
  }
  return validado;   // lo que devuelves es lo que ConfigService leerá como "variables validadas"
}

// app.module.ts
ConfigModule.forRoot({ isGlobal: true, validate });
```

### 5.3 Opción C: Zod

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});

export type Env = z.infer<typeof envSchema>;       // el tipo sale del schema: una sola fuente de verdad

ConfigModule.forRoot({
  isGlobal: true,
  validate: (config) => envSchema.parse(config),   // lanza ZodError → la app no arranca
});

// Uso: ConfigService<Env, true>
```

| | Joi | class-validator | Zod |
|---|---|---|---|
| Documentación oficial Nest | ✅ | ✅ | ❌ (patrón `validate`) |
| Tipo TS derivado del schema | ❌ (duplicas interface) | ✅ (la clase es el tipo) | ✅ `z.infer` |
| Coerción de strings | Automática (`convert`) | `enableImplicitConversion` | `z.coerce` |
| Dependencia extra | `joi` | ya la tienes (Sesión 6) | `zod` |

> ❓ **Entrevista**: *"¿Por qué validar las variables de entorno al arrancar?"* → Para **fallar rápido**: un error de configuración debe impedir que el proceso arranque, así el despliegue se detiene y el orquestador mantiene la versión anterior. Sin validación, el error aparece en runtime, bajo tráfico real, como 500 intermitentes difíciles de diagnosticar. Además la validación **convierte tipos** (strings → number/boolean) y aplica defaults en un único lugar.

---

## 6. Configuración por namespaces: `registerAs`

Con 40 variables planas, el código se llena de `config.get('DB_HOST')`, `config.get('DB_PORT')`... Mejor agrupar por dominio y convertir tipos **una vez**:

```typescript
// src/config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL!,
  poolMax: parseInt(process.env.DB_POOL_MAX ?? '10', 10),
  ssl: process.env.DB_SSL === 'true',          // conversión explícita de booleano
  logging: process.env.NODE_ENV === 'development',
}));
```

```typescript
// src/config/pagos.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('pagos', () => ({
  baseUrl: process.env.PAGOS_BASE_URL ?? 'https://sandbox.pagos.cl',
  apiKey: process.env.PAGOS_API_KEY!,
  timeoutMs: parseInt(process.env.PAGOS_TIMEOUT_MS ?? '5000', 10),
}));
```

```typescript
// app.module.ts
import databaseConfig from './config/database.config';
import pagosConfig from './config/pagos.config';

ConfigModule.forRoot({
  isGlobal: true,
  load: [databaseConfig, pagosConfig],     // las factories se ejecutan DESPUÉS de cargar el .env
  validate,
});
```

Hay dos formas de consumirlo:

```typescript
// Forma 1: por ruta con punto (sin tipos fuertes)
const url = this.config.get<string>('database.url');

// Forma 2 (recomendada): inyectar el namespace tipado
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import pagosConfig from '../config/pagos.config';

@Injectable()
export class PagosService {
  constructor(
    @Inject(pagosConfig.KEY)                                   // token de inyección del namespace
    private readonly pagos: ConfigType<typeof pagosConfig>,    // tipo = retorno de la factory
  ) {}

  async cobrar(montoCentavos: number) {
    const res = await fetch(`${this.pagos.baseUrl}/cobros`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.pagos.apiKey}` },
      body: JSON.stringify({ monto: montoCentavos }),
      signal: AbortSignal.timeout(this.pagos.timeoutMs),       // timeout desde config
    });
    return res.json();
  }
}
```

¿Por qué la forma 2 es mejor? Porque el service depende **solo de su configuración** (principio de mínimo conocimiento) y en un test lo sustituyes sin `ConfigService`:

```typescript
const moduleRef = await Test.createTestingModule({
  providers: [
    PagosService,
    { provide: pagosConfig.KEY, useValue: { baseUrl: 'http://fake', apiKey: 'x', timeoutMs: 100 } },
  ],
}).compile();
```

### 6.1 `forFeature`: configuración local a un módulo

```typescript
@Module({
  imports: [ConfigModule.forFeature(pagosConfig)],   // registra el namespace solo cuando este módulo se carga
  providers: [PagosService],
})
export class PagosModule {}
```

> ⚠️ Las factories de `registerAs` se ejecutan cuando se inicializa el módulo. **No** leas `pagosConfig()` ni `process.env` en el cuerpo de un archivo (fuera de la factory): se evalúa al importar, antes de que dotenv haya cargado el `.env`.

> 💡 Las factories de `registerAs` no pasan por `validate` (que valida variables planas). Estrategia robusta: valida las variables planas en `validate` y en la factory solo **mapea** a la forma tipada. O valida dentro de la factory con Zod.

---

## 7. Configuración en módulos asíncronos: `forRootAsync`

Muchos módulos de terceros necesitan configuración al registrarse: TypeORM (Sesión 14), JWT (Sesión 18), BullMQ (Sesión 25). No puedes escribir `TypeOrmModule.forRoot({ url: config.get(...) })` porque en ese momento **no hay instancia de ConfigService**: estás declarando metadata en un decorador. La solución es la variante `Async`, que usa una **factory con DI**:

```typescript
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService, ConfigType } from '@nestjs/config';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig], validate }),

    // Variante 1: inject + useFactory con ConfigService
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),

    // Variante 2: inyectar el namespace tipado
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (db: ConfigType<typeof databaseConfig>) => ({
        type: 'postgres',
        url: db.url,
        ssl: db.ssl,
        autoLoadEntities: true,
        synchronize: false,      // nunca true en producción (Sesión 17)
      }),
    }),

    // Variante 3: atajo — asProvider() genera { imports, useFactory, inject } del namespace
    // TypeOrmModule.forRootAsync(databaseConfig.asProvider()),
    // (solo si la factory devuelve EXACTAMENTE las opciones que espera TypeORM)
  ],
})
export class AppModule {}
```

Cómo construir tus propios módulos con `forRootAsync` lo vemos en la **Sesión 24** (módulos dinámicos y `ConfigurableModuleBuilder`).

> ❓ **Entrevista**: *"¿Por qué existe `forRootAsync`?"* → Porque los argumentos de `forRoot()` se evalúan al **declarar** el módulo (en el decorador `@Module`), antes de que el contenedor de DI exista. `forRootAsync` recibe una factory y sus dependencias (`inject`); Nest la ejecuta **durante** la resolución del grafo, cuando `ConfigService` ya está disponible, y puede ser `async` (p. ej. para traer un secreto de AWS).

---

## 8. Entornos

### 8.1 Estructura de archivos

```
.env                      # defaults compartidos NO secretos (puede versionarse... o no)
.env.development          # overrides de desarrollo
.env.test                 # tests e2e: BD de test, logs silenciados
.env.development.local    # overrides personales, NUNCA versionado
.env.example              # plantilla documentada, SÍ versionada
```

```gitignore
.env
.env.*.local
.env.production
```

### 8.2 `NODE_ENV` no es tu entorno de despliegue

`NODE_ENV` tiene un significado para el ecosistema: muchas librerías (Express incluido) activan optimizaciones con `production`. Mezclarlo con "staging/qa/prod" es un error común.

| Variable | Valores | Para qué |
|---|---|---|
| `NODE_ENV` | `development` · `test` · `production` | Comportamiento de librerías y del runtime |
| `APP_ENV` (o `DEPLOY_ENV`) | `local` · `qa` · `staging` · `prod` | Tu lógica de despliegue: qué BD, qué URLs, qué feature flags |

> ⚠️ Staging debe correr con `NODE_ENV=production`. Si staging usa `development`, no estás probando lo que corre en producción (stack traces expuestos, logs verbosos, cachés desactivadas).

### 8.3 Configuración según entorno en el código

```typescript
// main.ts
const app = await NestFactory.create(AppModule, { bufferLogs: true });
const config = app.get<ConfigService<EnvVars, true>>(ConfigService);

app.enableCors({
  origin: config.get('CORS_ORIGINS', { infer: true }).split(','),  // "https://a.cl,https://b.cl"
});

if (config.get('NODE_ENV', { infer: true }) !== 'production') {
  // Swagger solo fuera de producción (Sesión 21)
}

await app.listen(config.get('PORT', { infer: true }));
```

`app.get(ConfigService)` funciona en `main.ts` porque, tras `NestFactory.create`, el contenedor ya está inicializado.

---

## 9. Secretos en producción

`.env` es para **desarrollo**. En producción, los secretos deben venir de un gestor:

```
AWS Secrets Manager / SSM Parameter Store
            │
            │  (ECS inyecta como variables de entorno al arrancar la tarea)
            ▼
   Task Definition: "secrets": [{ "name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:..." }]
            │
            ▼
   process.env.JWT_SECRET  ──▶ ConfigModule (validación) ──▶ tu código
```

Ventajas de inyectarlos como variables de entorno: tu app **no sabe** de AWS; en local usas `.env`, en ECS la plataforma los pone. Alternativa: leerlos en runtime con el SDK dentro de una factory async (útil si necesitas **rotación** sin reiniciar):

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export default registerAs('pagos', async () => {
  // las factories de registerAs pueden ser async
  if (process.env.APP_ENV === 'local') {
    return { apiKey: process.env.PAGOS_API_KEY! };
  }
  const client = new SecretsManagerClient({});
  const res = await client.send(new GetSecretValueCommand({ SecretId: 'tienda/pagos' }));
  return JSON.parse(res.SecretString!) as { apiKey: string };
});
```

> ⚠️ **Nunca** loguees la configuración completa "para depurar" (`console.log(process.env)`): los logs terminan en CloudWatch/Datadog con retención de meses y acceso amplio. Si necesitas depurar, loguea solo claves o valores enmascarados.

> ⚠️ Las variables de entorno no son un cofre perfecto: cualquier código del proceso (incluidas dependencias comprometidas) puede leerlas, y aparecen en `docker inspect` si las pasas con `-e`. Para secretos críticos, minimiza su tiempo de vida y alcance. Lo profundizamos en la Sesión 34.

---

## 10. Antipatrones y errores clásicos

### 10.1 `process.env` en decoradores o a nivel de archivo

```typescript
// ❌ Se evalúa al IMPORTAR el archivo, antes de que ConfigModule cargue .env
const SECRETO = process.env.JWT_SECRET;

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET })],   // ❌ puede ser undefined
})
export class AuthModule {}
```

¿Por qué funciona "a veces"? Porque si el módulo que lo usa se importa **después** de que `AppModule` ejecutó `ConfigModule.forRoot()`, dotenv ya cargó. El orden de imports de archivos se vuelve una dependencia oculta. Usa `registerAsync` / `forRootAsync` (sección 7).

### 10.2 `process.env` disperso por todo el código

Problemas: no hay un inventario de qué configuración existe, no hay validación, no hay tipos y los tests necesitan manipular el entorno global. Regla: **solo** tus archivos de `config/` leen `process.env`; el resto inyecta `ConfigService` o namespaces.

### 10.3 Booleanos

```typescript
if (process.env.FEATURE_X) { ... }   // ❌ "false" es truthy → siempre entra
```

Convierte en un único lugar (validación o factory): `process.env.FEATURE_X === 'true'`, o `z.stringbool()` / `Joi.boolean()`.

### 10.4 Config en tests

```typescript
// test e2e: config controlada, sin leer .env del desarrollador
const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
})
  .overrideProvider(pagosConfig.KEY)
  .useValue({ baseUrl: 'http://localhost:9999', apiKey: 'test', timeoutMs: 100 })
  .compile();
```

O en el `ConfigModule.forRoot` usa `envFilePath: '.env.test'` cuando `NODE_ENV=test`. Lo vemos en la Sesión 22.

> ❓ **Entrevista**: *"¿Cómo evitas que un test e2e use la base de datos de desarrollo?"* → Con un `.env.test` cargado cuando `NODE_ENV=test`, validación que exija que `DATABASE_URL` apunte a una BD de test (p. ej. que contenga `_test`), y sobrescribiendo providers de configuración con `overrideProvider(...KEY)` en el `TestingModule`.

---

## 11. Tabla resumen: ¿dónde va cada cosa?

| Qué | Dónde |
|---|---|
| Secretos de producción | Secrets Manager / SSM → variables de entorno de la tarea |
| Defaults no secretos | Validación (`default(...)`) o factories |
| Valores locales del dev | `.env.development.local` (no versionado) |
| Documentación de variables | `.env.example` + schema de validación |
| Conversión de tipos | Validación o factories (una sola vez) |
| Acceso en el código | `ConfigService<Env, true>` o `@Inject(ns.KEY) ConfigType<typeof ns>` |
| Módulos de terceros | `forRootAsync` / `registerAsync` con `inject` |

---

## Resumen mental de la sesión

```
12-Factor: config = lo que cambia entre despliegues → en el ENTORNO, no en el código
.env = solo desarrollo; .gitignore; .env.example versionado
Entorno real > archivo .env (dotenv no pisa variables existentes)
envFilePath: [a, b, c] → gana el PRIMERO que define la clave

ConfigModule.forRoot({ isGlobal, envFilePath, load, validate | validationSchema, expandVariables })
ConfigService: get(k, default) · getOrThrow(k) · ConfigService<Env, true> + { infer: true }
get<T>() NO convierte: solo asierta el tipo → convierte en validación/factory

VALIDAR al arrancar = fail fast (Joi | class-validator + validate | Zod.parse)
registerAs('ns', factory) → load: [...] → @Inject(ns.KEY) cfg: ConfigType<typeof ns>
forFeature(ns) → config local a un módulo; factories pueden ser async (secretos)
Módulos de terceros: forRootAsync({ inject, useFactory })  (no process.env en decoradores)

@nestjs/config v4 (Nest 11): get() lee interna(load) → validadas → process.env
  ignoreEnvVars deprecado → validatePredefined; nuevo skipProcessEnv
NODE_ENV (runtime) ≠ APP_ENV (despliegue); staging corre con NODE_ENV=production
Nunca loguees la config; secretos vía Secrets Manager/SSM
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué dice el factor III de 12-Factor y por qué importa en contenedores?
2. ❓ Si `PORT` está en `.env` y también como variable de entorno real, ¿cuál gana? ¿Por qué es deseable?
3. ❓ Con `envFilePath: ['.env.local', '.env']`, ¿qué archivo gana si ambos definen la misma clave?
4. ❓ ¿`config.get<number>('PORT')` devuelve un número? ¿Por qué?
5. ❓ ¿Qué significa *fail fast* aplicado a la configuración? Da un ejemplo de lo que pasa sin él.
6. ❓ Compara Joi, class-validator y Zod para validar variables de entorno.
7. ❓ ¿Qué hace `registerAs` y cómo inyectas un namespace tipado? ¿Por qué es mejor para testing?
8. ❓ ¿Por qué `JwtModule.register({ secret: process.env.JWT_SECRET })` puede fallar? ¿Cuál es la solución?
9. ❓ ¿Qué es `forRootAsync` y cuándo se ejecuta su factory?
10. ❓ ¿Qué diferencia hay entre `NODE_ENV` y el entorno de despliegue? ¿Con qué `NODE_ENV` corre staging?
11. ❓ ¿Cómo llegan los secretos a una app Nest en ECS?
12. ❓ ¿Qué cambió en `@nestjs/config` v4 respecto al orden de lectura de `ConfigService#get`?

## Ejercicio práctico
1. Instala `@nestjs/config` en TiendaApi y registra `ConfigModule.forRoot({ isGlobal: true })`.
2. Crea `.env`, `.env.test` y `.env.example` con `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `PAGOS_BASE_URL`, `PAGOS_API_KEY`. Agrega los que correspondan a `.gitignore`.
3. Implementa la validación con **Zod** (o class-validator) y define `type Env`. Borra `JWT_SECRET` del `.env` y verifica que la app **no arranca** y el mensaje es claro.
4. Ejecuta `PORT=4000 npm run start:dev` con `PORT=3000` en `.env` y confirma que gana la variable real.
5. Crea los namespaces `database` y `pagos` con `registerAs` y cárgalos con `load`.
6. Refactoriza un `PagosService` para que inyecte `@Inject(pagosConfig.KEY)` en vez de `ConfigService`, y escribe un test unitario que lo provea con `useValue`.
7. Registra `JwtModule.registerAsync` leyendo el secreto de `ConfigService` (aunque todavía no lo uses: Sesión 18).
8. En `main.ts`, lee `PORT` y `CORS_ORIGINS` desde `ConfigService<Env, true>` con `{ infer: true }`.
9. Agrega un `APP_ENV` y haz que Swagger (o un endpoint `/debug`) solo exista cuando `APP_ENV !== 'prod'`.
10. (Opcional) Escribe una factory `registerAs` async que simule traer un secreto remoto con un `await new Promise(r => setTimeout(r, 100))` y comprueba que Nest espera a que se resuelva antes de arrancar.

---

➡️ **Cuando termines**, marca la Sesión 7 en el [README](README.md) y pasa a la **Sesión 8 — Middleware**.

# Sesión 31 — Monorepos: Nest workspaces, Nx y librerías compartidas

> **Objetivo de la sesión**: entender *por qué* un equipo termina con varias apps Nest en un mismo repositorio y cómo organizarlas sin crear un monolito distribuido. Al terminar deberías poder convertir TiendaApi en un **monorepo del CLI de Nest** (apps + libs), explicar qué hace `nest-cli.json` en modo monorepo, compartir contratos entre microservicios (Sesión 29) mediante librerías, decidir entre **Nest workspaces, Nx y pnpm + Turborepo**, imponer **límites de módulo** y construir imágenes Docker por app sin arrastrar todo el repo.

---

## 1. ¿Por qué un monorepo?

En la Sesión 29 partimos TiendaApi en varios servicios: `api-gateway`, `ordenes`, `catalogo`, `notificaciones`. Todos hablan con los mismos contratos (patrones de mensajes, DTOs, eventos). La pregunta es dónde vive ese código compartido.

| Estrategia | Cómo se comparte código | Problema típico |
|---|---|---|
| **Polyrepo** (un repo por servicio) | Paquetes npm privados versionados | "Dependency hell": `ordenes` usa `contracts@1.4`, `catalogo` usa `@1.2`; un cambio de contrato requiere N PRs y N publicaciones |
| **Copiar/pegar** | Nada se comparte | Los DTOs divergen silenciosamente; bugs de serialización en producción |
| **Monorepo** | Import directo (`@tienda/contracts`) | Si no pones límites, todo depende de todo y los tiempos de CI crecen |

Un **monorepo** es un repositorio con **varios proyectos desplegables** (apps) y **librerías** internas, con herramientas que entienden el grafo de dependencias entre ellos.

Beneficios reales:
1. **Cambios atómicos**: cambias un contrato y todos sus consumidores en **un solo PR**; el CI valida que nadie se rompió.
2. **Una sola versión de las dependencias** (`@nestjs/*`, TypeScript, ESLint): no hay servicios atrapados en Nest 9.
3. **Refactor global** con el IDE: renombrar un tipo actualiza las 5 apps.
4. **Tooling compartido**: una config de lint, test y tsconfig base.

Costos reales:
1. **CI más lento** si construyes todo en cada commit → necesitas *affected builds* y caché.
2. **Acoplamiento accidental**: es tan fácil importar código de otro dominio que alguien lo hará.
3. **Permisos más gruesos**: todo el mundo ve todo (CODEOWNERS mitiga).

> ❓ **Entrevista**: *"¿Monorepo implica monolito?"* → No. Monorepo es una decisión de **organización del código fuente**; monolito es una decisión de **despliegue**. Puedes tener 10 microservicios desplegados independientemente en un monorepo (Google, Meta) o un monolito en polyrepo. Lo que sí debes evitar es el **monolito distribuido**: servicios que no pueden desplegarse por separado porque comparten demasiado código de dominio.

---

## 2. Monorepo con el CLI de Nest (modo "workspace")

El CLI de Nest trae un modo monorepo integrado. Es la opción con **menos herramientas nuevas**: sigue siendo `nest build` y `nest start`.

### 2.1 De proyecto estándar a monorepo

```bash
nest new tienda            # proyecto estándar: src/, test/, un solo tsconfig
cd tienda
nest generate app admin    # ← este comando convierte el proyecto en monorepo
nest generate library contracts   # alias: nest g lib contracts
```

El primer `nest generate app` **reestructura** el proyecto: mueve `src/` a `apps/tienda/src` y crea `apps/admin`.

```
tienda/
├── apps/
│   ├── tienda/                 # la app original (proyecto por defecto)
│   │   ├── src/main.ts
│   │   ├── test/
│   │   └── tsconfig.app.json
│   └── admin/
│       ├── src/main.ts
│       └── tsconfig.app.json
├── libs/
│   └── contracts/
│       ├── src/
│       │   ├── contracts.module.ts
│       │   ├── contracts.service.ts
│       │   └── index.ts        # API pública de la librería
│       └── tsconfig.lib.json
├── nest-cli.json               # ← describe todos los proyectos
├── package.json                # UN solo package.json
├── tsconfig.json               # paths para @app/contracts
└── node_modules/               # UN solo node_modules
```

### 2.2 `nest-cli.json` en modo monorepo

```jsonc
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "monorepo": true,                         // activa el modo workspace
  "root": "apps/tienda",                    // proyecto por defecto
  "sourceRoot": "apps/tienda/src",
  "compilerOptions": {
    "webpack": true,                        // en monorepo el default es webpack
    "tsConfigPath": "apps/tienda/tsconfig.app.json"
  },
  "projects": {
    "tienda": {
      "type": "application",
      "root": "apps/tienda",
      "entryFile": "main",
      "sourceRoot": "apps/tienda/src",
      "compilerOptions": { "tsConfigPath": "apps/tienda/tsconfig.app.json" }
    },
    "admin": {
      "type": "application",
      "root": "apps/admin",
      "entryFile": "main",
      "sourceRoot": "apps/admin/src",
      "compilerOptions": { "tsConfigPath": "apps/admin/tsconfig.app.json" }
    },
    "contracts": {
      "type": "library",
      "root": "libs/contracts",
      "entryFile": "index",
      "sourceRoot": "libs/contracts/src",
      "compilerOptions": { "tsConfigPath": "libs/contracts/tsconfig.lib.json" }
    }
  }
}
```

Comandos por proyecto:

```bash
nest start admin --watch     # levanta solo admin
nest build admin             # dist/apps/admin/main.js
nest build                   # construye el proyecto por defecto ("root")
nest g service productos --project admin   # genera dentro de apps/admin
```

### 2.3 Cómo se resuelve `@app/contracts`

Al generar la librería, el CLI pregunta un **prefijo** (por defecto `@app`) y agrega paths al `tsconfig.json` raíz:

```jsonc
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@app/contracts": ["libs/contracts/src"],
      "@app/contracts/*": ["libs/contracts/src/*"]
    }
  }
}
```

Y el CLI añade el mapeo equivalente para Jest en `package.json`:

```jsonc
"jest": {
  "roots": ["<rootDir>/apps/", "<rootDir>/libs/"],
  "moduleNameMapper": {
    "^@app/contracts(|/.*)$": "<rootDir>/libs/contracts/src/$1"
  }
}
```

> ⚠️ Los `paths` de TypeScript **solo afectan al type-checker**; no reescriben los `import` del JavaScript emitido. Por eso el modo monorepo usa **webpack** por defecto: el bundle resuelve `@app/contracts` e **incluye** el código de la librería dentro de `dist/apps/<app>/main.js`. Si desactivas webpack y compilas con `tsc` puro, `node dist/...` fallará con `Cannot find module '@app/contracts'` (necesitarías `tsconfig-paths` en runtime o un bundler).

> ❓ **Entrevista**: *"¿Qué hay dentro de `dist/apps/ordenes/main.js` en un monorepo Nest?"* → El código de la app **más** el código de las libs internas que importa, empaquetados por webpack. Las dependencias de `node_modules` quedan **fuera** del bundle (el CLI usa `webpack-node-externals`), así que en runtime sigues necesitando `node_modules` con las dependencias de producción.

### 2.4 Qué es una "library" en Nest

Una librería de Nest es simplemente código TypeScript con un **barrel** (`index.ts`) que define su API pública. Puede contener:

- Un **módulo Nest** reutilizable (ej. `DatabaseModule`, `AuthModule` con `forRootAsync`, Sesión 24).
- **Contratos puros**: DTOs, interfaces, enums, constantes de patrones de mensajes. Sin Nest.
- **Utilidades**: formateo de montos, paginación, errores de dominio.

```ts
// libs/contracts/src/index.ts — SOLO lo que exportes aquí es "público"
export * from './ordenes/ordenes.patterns';
export * from './ordenes/crear-orden.dto';
export * from './ordenes/orden-creada.event';
export * from './catalogo/producto.dto';
```

---

## 3. Compartir contratos entre microservicios de TiendaApi

Retomemos la Sesión 29: el `api-gateway` envía `crear_orden` al servicio `ordenes` por TCP/NATS y `ordenes` emite `orden_creada`, que consume `notificaciones`.

```
                 ┌──────────────── libs/contracts ────────────────┐
                 │ ORDENES_PATTERNS · CrearOrdenDto · OrdenCreada  │
                 └───────▲──────────────────▲──────────────▲───────┘
                         │                  │              │
               ┌─────────┴───┐     ┌────────┴────┐   ┌─────┴──────────┐
 HTTP ───────▶ │ api-gateway │────▶│   ordenes   │──▶│ notificaciones │
               └─────────────┘ cmd └─────────────┘evt└────────────────┘
```

```ts
// libs/contracts/src/ordenes/ordenes.patterns.ts
// Constantes: un typo en un string mágico = un mensaje que nadie escucha
export const ORDENES_PATTERNS = {
  CREAR: 'ordenes.crear',
  OBTENER: 'ordenes.obtener',
} as const;

export const ORDENES_EVENTS = {
  CREADA: 'ordenes.creada',
} as const;

export const ORDENES_SERVICE = Symbol('ORDENES_SERVICE'); // token para ClientProxy
```

```ts
// libs/contracts/src/ordenes/crear-orden.dto.ts
import { Type } from 'class-transformer';
import { ArrayMinSize, IsInt, IsPositive, IsUUID, ValidateNested } from 'class-validator';

export class ItemOrdenDto {
  @IsUUID()
  productoId!: string;

  @IsInt()
  @IsPositive()
  cantidad!: number;
}

export class CrearOrdenDto {
  @IsUUID()
  usuarioId!: string;

  @ValidateNested({ each: true })
  @Type(() => ItemOrdenDto)
  @ArrayMinSize(1)
  items!: ItemOrdenDto[];
}
```

```ts
// libs/contracts/src/ordenes/orden-creada.event.ts
// Los EVENTOS son contratos públicos: versiónalos, no los cambies en caliente
export interface OrdenCreadaEventV1 {
  version: 1;
  ordenId: string;
  usuarioId: string;
  total: number;           // en centavos, nunca float para dinero
  creadaEn: string;        // ISO-8601: los Date no sobreviven a JSON
}
```

Consumo en el gateway y en el servicio:

```ts
// apps/api-gateway/src/ordenes/ordenes.controller.ts
import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CrearOrdenDto, ORDENES_PATTERNS, ORDENES_SERVICE } from '@app/contracts';

@Controller('ordenes')
export class OrdenesController {
  constructor(@Inject(ORDENES_SERVICE) private readonly ordenes: ClientProxy) {}

  @Post()
  crear(@Body() dto: CrearOrdenDto) {
    // El mismo DTO valida en el borde HTTP (ValidationPipe global)
    return firstValueFrom(this.ordenes.send(ORDENES_PATTERNS.CREAR, dto));
  }
}
```

```ts
// apps/ordenes/src/ordenes.controller.ts
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CrearOrdenDto, ORDENES_PATTERNS } from '@app/contracts';
import { OrdenesService } from './ordenes.service';

@Controller()
export class OrdenesController {
  constructor(private readonly service: OrdenesService) {}

  @MessagePattern(ORDENES_PATTERNS.CREAR)
  crear(@Payload() dto: CrearOrdenDto) {
    return this.service.crear(dto);
  }
}
```

> ⚠️ Compartir DTOs **no** reemplaza la compatibilidad hacia atrás. En producción, `ordenes` v2 y `api-gateway` v1 conviven durante el despliegue (rolling update, Sesión 34). Regla: **agrega campos opcionales, nunca renombres ni elimines** en el mismo release. El monorepo te da atomicidad en el *código*, no en el *despliegue*.

> ❓ **Entrevista**: *"Si el monorepo permite cambiar productor y consumidor en un commit, ¿por qué versionar eventos?"* → Porque los servicios se despliegan en momentos distintos y los mensajes viven en colas/topics (Kafka retiene días). Un consumidor viejo puede leer un evento nuevo y viceversa. El commit es atómico; el despliegue y los datos en tránsito no.

---

## 4. Librerías con módulos Nest reutilizables

Una librería típica en TiendaApi es la de base de datos o la de observabilidad, que cada app configura distinto.

```ts
// libs/database/src/database.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,   // cada app registra SUS entidades con forFeature
        synchronize: false,       // nunca en producción (Sesión 17)
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
```

```ts
// apps/ordenes/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { OrdenesModule } from './ordenes/ordenes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: 'apps/ordenes/.env' }),
    DatabaseModule,
    OrdenesModule,
  ],
})
export class AppModule {}
```

Para librerías configurables, usa `ConfigurableModuleBuilder` (Sesión 24): la librería no debe leer `process.env` directamente, debe **recibir** su configuración.

```ts
// libs/auth/src/auth.module-definition.ts
import { ConfigurableModuleBuilder } from '@nestjs/common';

export interface AuthLibOptions {
  jwksUri: string;
  audience: string;
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<AuthLibOptions>().setClassMethodName('forRoot').build();
```

> ⚠️ Una lib que hace `process.env.JWT_SECRET` internamente es una **dependencia oculta**: rompe tests, obliga a todas las apps a usar el mismo nombre de variable y no se puede configurar por app.

---

## 5. Qué va en una librería (y qué no)

### 5.1 Taxonomía de librerías

Una clasificación popular (difundida por Nx) que funciona muy bien en Nest:

| Tipo | Contiene | Puede depender de |
|---|---|---|
| `app` | `main.ts`, `AppModule`, wiring | cualquiera |
| `feature` | Módulos con casos de uso de un dominio (ordenes, catálogo) | `data-access`, `domain`, `util` |
| `data-access` | Repositorios, clientes HTTP/DB, entidades ORM | `domain`, `util` |
| `domain` | Entidades de dominio, value objects, reglas puras (Sesión 30) | `util` |
| `contracts` | DTOs de API, patrones, eventos | `util` |
| `util` | Funciones puras: fechas, dinero, paginación | nada interno |

```
  app ──▶ feature ──▶ data-access ──▶ domain ──▶ util
                 └──────────────────▶ contracts ─┘
  (las flechas SOLO van hacia abajo: nunca util → feature)
```

### 5.2 Antipatrones

- **La lib `shared` / `common` gigante**: termina con 200 archivos y todas las apps dependen de todo. Cualquier cambio invalida la caché de todo el repo.
- **Compartir entidades de dominio entre servicios**: si `catalogo` y `ordenes` importan la misma entidad `Producto`, ya no son servicios independientes; comparten el modelo de datos. Comparte **contratos** (lo que viaja por el cable), no **modelos internos**.
- **Ciclos entre libs**: `libs/ordenes` importa `libs/usuarios` que importa `libs/ordenes`. TypeScript lo tolera; webpack puede producir `undefined` en tiempo de carga (igual que los ciclos de módulos Nest, Sesión 23).
- **Importar rutas internas**: `import { X } from '@app/contracts/ordenes/internal/helper'` salta la API pública del barrel.

> ❓ **Entrevista**: *"¿Qué compartirías entre dos microservicios en un monorepo?"* → Contratos (DTOs de mensajes, eventos, constantes de patrones), utilidades puras y módulos de infraestructura configurables (logging, auth, DB). **No** compartiría entidades de dominio ni servicios de negocio: eso acopla los modelos y te obliga a desplegar juntos.

---

## 6. Nx: monorepo con grafo, caché y límites

Nest workspaces se queda corto cuando hay muchos proyectos: **todo se construye y testea siempre**, no hay caché, no hay límites de módulo. **Nx** resuelve eso y tiene plugin oficial para Nest (`@nx/nest`).

### 6.1 Crear el workspace

```bash
npx create-nx-workspace@latest tienda --preset=nest
cd tienda

# Generadores (la sintaxis de Nx reciente usa la ruta del proyecto)
npx nx g @nx/nest:application apps/ordenes
npx nx g @nx/nest:library libs/contracts
npx nx g @nx/nest:resource productos --project=api   # recurso CRUD dentro de "api"
```

Cada proyecto tiene su `project.json` (o se infiere de `package.json` con los *inferred tasks* de Nx), con *targets*: `build`, `serve`, `test`, `lint`.

```bash
npx nx serve api                 # levanta con watch
npx nx build ordenes             # construye (webpack/esbuild según config)
npx nx test contracts
npx nx graph                     # abre el grafo interactivo de dependencias
npx nx run-many -t test          # todos los proyectos
```

### 6.2 Affected: solo lo que cambió

Nx conoce el grafo (analiza los `import`), así que puede calcular qué proyectos se ven afectados por un diff:

```bash
# En CI: compara contra main y ejecuta solo lo afectado
npx nx affected -t lint test build --base=origin/main --head=HEAD
```

```
Cambio en libs/contracts/src/ordenes/crear-orden.dto.ts
        │
        ▼
   contracts ──▶ api-gateway   (afectado)
            └──▶ ordenes       (afectado)
   catalogo                    (NO afectado: no importa contracts)
   notificaciones ──▶ contracts (afectado)
```

### 6.3 Caché de tareas (local y remota)

Nx calcula un hash de los *inputs* de una tarea (código fuente del proyecto y sus dependencias, config, versión de dependencias, variables de entorno declaradas). Si el hash ya se ejecutó, **reproduce la salida** en milisegundos en vez de volver a correr. Con caché remota (Nx Cloud u opciones self-hosted), un build hecho en CI se reutiliza en tu laptop y viceversa.

> ⚠️ La caché es tan buena como la declaración de *inputs*. Si tus tests leen una variable de entorno que no declaraste como input, Nx puede devolver un resultado cacheado **incorrecto**. Declara `inputs` y `outputs` explícitos para tareas no triviales.

### 6.4 Límites de módulo con tags

Esta es la característica que más valor aporta en equipos grandes. En `project.json` etiquetas cada proyecto:

```jsonc
// libs/contracts/project.json (extracto)
{ "name": "contracts", "tags": ["type:contracts", "scope:shared"] }

// libs/ordenes/data-access/project.json
{ "name": "ordenes-data-access", "tags": ["type:data-access", "scope:ordenes"] }
```

Y en ESLint defines reglas que **fallan el lint** si alguien cruza un límite:

```js
// eslint.config.mjs (flat config, extracto)
import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  {
    files: ['**/*.ts'],
    rules: {
      '@nx/enforce-module-boundaries': ['error', {
        enforceBuildableLibDependency: true,
        depConstraints: [
          { sourceTag: 'type:app',         onlyDependOnLibsWithTags: ['type:feature', 'type:contracts', 'type:util'] },
          { sourceTag: 'type:feature',     onlyDependOnLibsWithTags: ['type:data-access', 'type:domain', 'type:contracts', 'type:util'] },
          { sourceTag: 'type:data-access', onlyDependOnLibsWithTags: ['type:domain', 'type:util'] },
          { sourceTag: 'type:util',        onlyDependOnLibsWithTags: ['type:util'] },
          // Un dominio no puede importar otro dominio: solo contratos compartidos
          { sourceTag: 'scope:ordenes',    onlyDependOnLibsWithTags: ['scope:ordenes', 'scope:shared'] },
          { sourceTag: 'scope:catalogo',   onlyDependOnLibsWithTags: ['scope:catalogo', 'scope:shared'] },
        ],
      }],
    },
  },
];
```

La misma regla también prohíbe **deep imports** (saltarse el `index.ts`) e importaciones circulares entre proyectos.

> ❓ **Entrevista**: *"¿Cómo evitas que un monorepo se convierta en una bola de barro?"* → Límites **automatizados**, no documentación: tags por tipo y dominio + `@nx/enforce-module-boundaries` en el lint del CI (o `dependency-cruiser` si no usas Nx), barrels como API pública, CODEOWNERS por carpeta, y revisar el grafo (`nx graph`) periódicamente.

---

## 7. pnpm workspaces + Turborepo (la alternativa "paquetes")

La tercera opción: cada app y lib es un **paquete npm real** con su propio `package.json`, enlazados por el gestor de paquetes.

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```jsonc
// apps/ordenes/package.json
{
  "name": "@tienda/ordenes",
  "private": true,
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@tienda/contracts": "workspace:*"     // enlace al paquete local
  }
}
```

```jsonc
// turbo.json — Turborepo: orquestación + caché (clave "tasks" desde Turbo 2)
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },  // ^ = construir deps primero
    "test":  { "dependsOn": ["^build"] },
    "lint":  {}
  }
}
```

```bash
pnpm turbo run build --filter=@tienda/ordenes...   # ordenes y todo lo que necesita
pnpm turbo run test --filter='...[origin/main]'    # solo lo que cambió desde main
```

Aquí las libs se **compilan** a `dist/` (con `tsc`) y se consumen como cualquier paquete, o se consumen como TS fuente con *project references* / un bundler.

### 7.1 Comparación

| Aspecto | Nest workspaces | Nx | pnpm + Turborepo |
|---|---|---|---|
| Curva de aprendizaje | Mínima | Media-alta | Media |
| `package.json` | Uno | Uno (o varios) | Uno por paquete |
| Versiones de deps | Una sola (forzado) | Una sola (política recomendada) | Pueden divergir (riesgo) |
| Affected / caché | ❌ | ✅ local + remota | ✅ local + remota |
| Límites de módulo | ❌ (manual) | ✅ lint con tags | ❌ (dependency-cruiser) |
| Generadores | Schematics de Nest | Generadores Nx para Nest | Ninguno oficial |
| Encaja cuando | 2–4 apps, un equipo | Muchas apps/libs, varios equipos | Repos mixtos (front + back) centrados en paquetes |

> 💡 No hay que casarse: muchos equipos empiezan con Nest workspaces y migran a Nx cuando el CI supera los 10–15 minutos. Nx incluso puede adoptarse sobre un repo existente (`npx nx init`).

---

## 8. Configuración, entornos y tests en un monorepo

### 8.1 Un tsconfig base

```jsonc
// tsconfig.base.json (Nx) o tsconfig.json (Nest workspaces)
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "commonjs",
    "strict": true,
    "emitDecoratorMetadata": true,     // imprescindible para la DI de Nest (Sesión 2)
    "experimentalDecorators": true,
    "skipLibCheck": true,
    "paths": {
      "@tienda/contracts": ["libs/contracts/src/index.ts"],
      "@tienda/database":  ["libs/database/src/index.ts"]
    }
  }
}
```

> ⚠️ Si una lib se compila con un tsconfig sin `emitDecoratorMetadata`, sus providers perderán `design:paramtypes` y verás `Nest can't resolve dependencies of X (?)` **solo** en la app que la consume. Revisa que todos los tsconfig hereden del base.

### 8.2 Variables de entorno por app

Cada app tiene su `.env` y su esquema de validación (Sesión 7). Evita un `.env` gigante compartido: `notificaciones` no debería conocer `STRIPE_SECRET`.

### 8.3 Tests

- **Unit tests por lib**: la lib `contracts` testea sus validaciones sin levantar ninguna app.
- **E2E por app**: `apps/ordenes/test/app.e2e-spec.ts`.
- **Tests de contrato** (consumer-driven, ej. Pact) cuando los servicios se despliegan por separado: el monorepo reduce la necesidad, no la elimina.

```ts
// libs/contracts/src/ordenes/crear-orden.dto.spec.ts
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CrearOrdenDto } from './crear-orden.dto';

describe('CrearOrdenDto', () => {
  it('rechaza una orden sin items', async () => {
    const dto = plainToInstance(CrearOrdenDto, {
      usuarioId: '5b0f3c2e-8d1a-4f6b-9a3e-2c1d0e9f8a7b',
      items: [],
    });
    const errores = await validate(dto);
    expect(errores.map((e) => e.property)).toContain('items');
  });
});
```

---

## 9. Docker por app en un monorepo

Problema: el Dockerfile de `ordenes` no debería copiar `apps/catalogo`, ni instalar dependencias que solo usa el front, ni reconstruirse cuando cambia otra app.

### 9.1 Nest workspaces

Un Dockerfile parametrizado por app (detalle completo de multi-stage en la Sesión 34):

```dockerfile
# Dockerfile (raíz del monorepo)
ARG APP=tienda

FROM node:22-alpine AS build
ARG APP
WORKDIR /repo
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx nest build ${APP}                # dist/apps/${APP}/main.js (incluye libs)
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
ARG APP
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/dist/apps/${APP} ./dist
USER node
CMD ["node", "dist/main.js"]
```

```bash
docker build --build-arg APP=ordenes -t tienda/ordenes .
```

Limitación: `node_modules` contiene las dependencias de **todas** las apps (un solo `package.json`).

### 9.2 Nx y Turborepo: podar el grafo

- **Nx**: el executor de build de Node permite `generatePackageJson: true`, que genera en `dist/apps/ordenes/package.json` **solo** con las dependencias que esa app realmente importa. En la imagen haces `npm ci` sobre ese archivo.
- **Turborepo**: `turbo prune @tienda/ordenes --docker` genera una carpeta `out/` con el subconjunto del repo (y un lockfile podado) necesario para esa app, separando `out/json` (para cachear la capa de dependencias) de `out/full`.

> ❓ **Entrevista**: *"¿Cómo evitas reconstruir y redesplegar los 8 servicios cuando solo cambió uno?"* → En CI uso *affected* (Nx) o filtros por cambios (Turborepo / paths de GitHub Actions) para construir solo las imágenes afectadas; cada imagen se construye con un contexto podado; y cada servicio tiene su propio pipeline de despliegue. Los tags de imagen van por commit SHA para saber exactamente qué versión corre.

---

## 10. CI para un monorepo (vista previa de la Sesión 34)

```yaml
# .github/workflows/ci.yml (extracto, Nx)
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  affected:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0                 # Nx necesita el historial para comparar con main
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - uses: nrwl/nx-set-shas@v4        # calcula NX_BASE / NX_HEAD correctos
      - run: npx nx affected -t lint test build --parallel=3
```

> ⚠️ `fetch-depth: 1` (el default de `actions/checkout`) rompe *affected*: sin historial no hay contra qué comparar y Nx acaba considerando todo afectado o falla.

---

## Resumen mental de la sesión

```
MONOREPO ≠ MONOLITO: organización del código vs forma de despliegue
  + cambios atómicos, una versión de deps, refactor global
  − CI lento sin affected/caché, acoplamiento accidental

NEST WORKSPACES
  nest g app X  → convierte a monorepo (apps/, libs/, nest-cli.json "monorepo": true)
  nest g lib Y  → libs/Y + paths "@app/Y" en tsconfig + moduleNameMapper en Jest
  webpack por defecto: bundlea las libs; node_modules quedan externos
  nest build X / nest start X --watch

NX
  @nx/nest generators · nx graph · nx affected -t lint test build
  caché local/remota por hash de inputs · tags + @nx/enforce-module-boundaries
  generatePackageJson para imágenes Docker livianas

PNPM + TURBOREPO
  un package.json por paquete · "workspace:*" · turbo.json tasks + ^build
  turbo prune --docker

QUÉ COMPARTIR: contratos (DTOs, patrones, eventos versionados), utils puras,
               módulos de infra configurables (forRootAsync / ConfigurableModuleBuilder)
QUÉ NO: entidades de dominio, servicios de negocio, lib "shared" gigante
REGLAS: barrels = API pública · sin ciclos · flechas solo hacia abajo
DEPLOY: commit atómico ≠ despliegue atómico → compatibilidad hacia atrás
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué diferencia hay entre monorepo y monolito? ¿Qué es un monolito distribuido?
2. ❓ ¿Qué cambia en el proyecto cuando ejecutas `nest generate app` por primera vez?
3. ❓ ¿Por qué el modo monorepo de Nest usa webpack por defecto? ¿Qué pasa con los `paths` de TypeScript si compilas con `tsc`?
4. ❓ ¿Qué contiene `dist/apps/<app>/main.js` y por qué aún necesitas `node_modules` en runtime?
5. ❓ ¿Qué compartirías y qué no entre dos microservicios del mismo monorepo?
6. ❓ Si puedes cambiar productor y consumidor en el mismo commit, ¿por qué versionar eventos?
7. ❓ ¿Qué es un *affected build* y cómo lo calcula Nx?
8. ❓ ¿Cómo funciona la caché de Nx y cuándo puede devolverte un resultado incorrecto?
9. ❓ ¿Cómo impones límites de módulo en un monorepo? Da un ejemplo de regla con tags.
10. ❓ Nest workspaces vs Nx vs pnpm + Turborepo: ¿cuándo elegirías cada uno?
11. ❓ ¿Por qué una librería no debería leer `process.env` directamente?
12. ❓ ¿Cómo construyes una imagen Docker de una sola app sin arrastrar las dependencias de todo el repo?

## Ejercicio práctico
1. Toma tu TiendaApi y ejecuta `nest generate app ordenes` y `nest generate app notificaciones`. Revisa el diff de `nest-cli.json`, `tsconfig.json` y `package.json` y explica cada cambio.
2. Crea `nest g lib contracts` y mueve ahí `ORDENES_PATTERNS`, `CrearOrdenDto` y `OrdenCreadaEventV1`. Exporta todo desde `index.ts`.
3. Conecta `tienda` (gateway) con `ordenes` por TCP (Sesión 29) usando **solo** los contratos de `@app/contracts`. Levanta ambas con `nest start ordenes --watch` y `nest start --watch` en dos terminales.
4. Haz `nest build ordenes` y abre `dist/apps/ordenes/main.js`: busca el código de `CrearOrdenDto` dentro del bundle. Luego verifica que `@nestjs/core` **no** está dentro (es externo).
5. Crea `libs/database` con `DatabaseModule` basado en `forRootAsync` y úsalo desde `ordenes` con su propio `.env`.
6. Escribe un test unitario en `libs/contracts` que valide `CrearOrdenDto` y ejecútalo con `npx jest libs/contracts`.
7. Escribe el Dockerfile parametrizado con `ARG APP` y construye `tienda/ordenes`. Mide el tamaño con `docker images`.
8. (Opcional, Nx) Crea un workspace Nx vacío con `--preset=nest`, replica dos apps y `contracts`, agrega tags y la regla `@nx/enforce-module-boundaries`. Intenta importar `libs/ordenes` desde `libs/catalogo` y comprueba que el lint falla. Ejecuta `nx graph` y `nx affected -t test` tras tocar solo `contracts`.

---

➡️ **Cuando termines**, marca la Sesión 31 en el [README](README.md) y pasa a la **Sesión 32 — Observabilidad: logging con Pino, health checks, métricas y OpenTelemetry**.

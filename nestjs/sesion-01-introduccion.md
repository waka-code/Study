# Sesión 1 — Qué es NestJS: filosofía, arquitectura, Express vs Fastify, CLI y estructura del proyecto

> **Objetivo de la sesión**: entender *por qué* existe NestJS y qué problema resuelve sobre Express/Fastify. Al terminar deberías poder explicar sus tres piezas centrales (**módulos, controllers, providers**), cómo arranca una app (`NestFactory`), la diferencia entre la plataforma Express y la Fastify, usar el **CLI** con soltura (`nest new`, `nest g resource`) y recorrer cada archivo del proyecto generado sabiendo para qué sirve. También deberías conocer los cambios de **NestJS 11** que afectan a un proyecto nuevo (Node 20+, Express 5, Fastify 5).

---

## 1. El problema: Express no opina

Node.js con Express es minimalista a propósito: te da un router y una cadena de middleware. Todo lo demás lo decides tú.

```ts
// Express "puro": funciona, pero ¿dónde vive cada cosa cuando la app crece?
import express from 'express';

const app = express();
app.use(express.json());

const productos = new Map<number, { id: number; nombre: string }>();

app.get('/productos/:id', (req, res) => {
  const p = productos.get(Number(req.params.id)); // ¿validación? ¿dónde?
  if (!p) return res.status(404).json({ message: 'No existe' });
  res.json(p);
});

app.listen(3000);
```

Con 5 endpoints esto es perfecto. Con 200 endpoints y 10 desarrolladores aparecen las preguntas que Express no responde:

| Pregunta | Express | NestJS |
|---|---|---|
| ¿Dónde pongo la lógica de negocio? | Lo que decida el equipo | **Providers** (services) |
| ¿Cómo comparto una conexión a BD? | `require` global, singletons caseros | **Inyección de dependencias** |
| ¿Cómo agrupo por dominio? | Carpetas por convención | **Módulos** con encapsulación real |
| ¿Cómo valido el body? | Middleware ad hoc por ruta | **Pipes** + DTOs (Sesión 6 y 10) |
| ¿Cómo protejo rutas? | Middleware | **Guards** con metadata (Sesión 11) |
| ¿Cómo testeo sin levantar HTTP? | Mockear `require` (jest.mock) | Reemplazar providers en el contenedor (Sesión 22) |
| ¿Cómo documento? | swagger-jsdoc a mano | `@nestjs/swagger` lee tus decoradores (Sesión 21) |

**NestJS** es un framework para construir aplicaciones de servidor en Node.js con TypeScript que aporta **arquitectura**: una estructura opinada, un contenedor de inversión de control (IoC) y un sistema de extensiones (pipes, guards, interceptors, filters) que corren en un orden definido.

> ❓ **Entrevista**: *"¿NestJS reemplaza a Express?"* → No. Nest **corre encima** de Express (por defecto) o de Fastify. Nest es la capa de arquitectura (DI, módulos, ciclo de vida de la request); Express/Fastify es la capa HTTP (parsear la request, enrutar, escribir la response). Puedes incluso usar middleware de Express dentro de Nest.

---

## 2. Filosofía: de dónde viene cada idea

Nest no inventó sus conceptos: los tomó de frameworks maduros y los trajo a Node.

| Idea | Origen | En Nest |
|---|---|---|
| Módulos con `imports/exports` y decoradores | **Angular** | `@Module({ ... })` |
| Inversión de control e inyección por constructor | **Spring** / **ASP.NET Core** | `@Injectable()` + constructor |
| Decoradores/anotaciones para describir rutas | Spring MVC, ASP.NET MVC | `@Controller`, `@Get` |
| Pipeline de filtros sobre la request | ASP.NET (filters), Spring (interceptors) | Guards, pipes, interceptors, filters |
| Programación reactiva | RxJS (Angular) | Interceptors devuelven `Observable` |

Los principios que debes poder nombrar:

1. **Arquitectura por defecto**: el framework decide la forma de la app para que el equipo discuta el negocio, no la estructura.
2. **Inversión de control**: tus clases *declaran* lo que necesitan; el contenedor las construye y conecta (Sesión 5 y 23).
3. **Declarativo mediante metadata**: los decoradores no ejecutan lógica; **adjuntan metadata** a clases y métodos que Nest lee al arrancar (Sesión 2).
4. **Agnóstico de plataforma**: el mismo código corre sobre Express o Fastify, y los mismos conceptos sirven para HTTP, WebSockets (Sesión 27), microservicios (Sesión 29) y GraphQL (Sesión 28).
5. **Progresivo**: puedes empezar con un controller y un service y crecer hasta CQRS (Sesión 30) sin cambiar de framework.

> ⚠️ "Opinado" no significa "mágico". Todo lo que hace Nest es explicable: decoradores guardan metadata, el scanner la lee, el injector construye instancias y el router registra rutas en Express. En la Sesión 35 lo vemos por dentro.

---

## 3. Arquitectura: las tres piezas

```
                        ┌──────────────────────────────┐
                        │          AppModule           │  ← módulo raíz
                        │  imports: [ProductosModule,  │
                        │            UsuariosModule]   │
                        └──────────────┬───────────────┘
                 ┌─────────────────────┴───────────────────┐
                 ▼                                         ▼
     ┌───────────────────────┐                 ┌───────────────────────┐
     │    ProductosModule    │                 │    UsuariosModule     │
     │                       │                 │                       │
     │  controllers:         │                 │  controllers:         │
     │   ProductosController │──usa──┐         │   UsuariosController  │
     │  providers:           │       │         │  providers:           │
     │   ProductosService  ◀─┘───────┘         │   UsuariosService     │
     │  exports:             │                 │  exports:             │
     │   ProductosService    │                 │   UsuariosService     │
     └───────────────────────┘                 └───────────────────────┘
```

| Pieza | Decorador | Responsabilidad | Analogía ASP.NET Core |
|---|---|---|---|
| **Módulo** | `@Module()` | Agrupa y **encapsula** controllers y providers de un dominio | Sin equivalente directo (≈ `IServiceCollection` extensions por feature) |
| **Controller** | `@Controller()` | Recibe HTTP, extrae datos, delega, devuelve respuesta. **Delgado** | `ControllerBase` |
| **Provider** | `@Injectable()` | Lógica de negocio, acceso a datos, clientes externos. Inyectable | Servicio registrado en DI |

Regla de oro: **el controller no contiene lógica de negocio**. Traduce HTTP ↔ llamadas a services. Si mañana expones lo mismo por GraphQL o por una cola, reutilizas el service entero.

### 3.1 Dónde encaja Nest respecto a la plataforma HTTP

```
 Request HTTP
      │
      ▼
┌─────────────────────────────┐
│  Servidor HTTP de Node      │  (módulo http nativo)
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│  Express 5  ó  Fastify 5    │  ← "plataforma": parseo, routing de bajo nivel
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│  HttpAdapter de Nest        │  ← capa de abstracción (ExpressAdapter / FastifyAdapter)
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│  Pipeline de Nest           │  middleware → guards → interceptors → pipes
│                             │  → handler → interceptors → filters  (Sesión 13)
└──────────────┬──────────────┘
               ▼
        Tu controller → tu service
```

Nest habla con la plataforma a través de un **adapter** (`AbstractHttpAdapter`). Por eso tu controller no importa nada de Express, y cambiar a Fastify es (casi) cambiar una línea en `main.ts`.

---

## 4. Express vs Fastify

Nest trae dos plataformas oficiales: `@nestjs/platform-express` (default) y `@nestjs/platform-fastify`.

| Aspecto | Express (default) | Fastify |
|---|---|---|
| Versión en Nest 11 | **Express 5** | **Fastify 5** |
| Rendimiento | Bueno | Mayor throughput y menor overhead por request (serialización y routing más eficientes) |
| Ecosistema de middleware | Enorme (passport, multer, helmet...) | Plugins propios (`@fastify/helmet`, `@fastify/multipart`...) |
| Compatibilidad con librerías Nest | Total | Muy alta, pero algunas asumen Express (ej. `FileInterceptor` usa multer → en Fastify se usa otra estrategia, Sesión 26) |
| Host por defecto en `listen` | Todas las interfaces | **`localhost`** → en Docker necesitas `'0.0.0.0'` |
| Objeto `req`/`res` nativo | `Request`/`Response` de Express | `FastifyRequest`/`FastifyReply` |
| Curva | Conocida por todos | Algo más de fricción |

### 4.1 Cambiar a Fastify

```bash
npm i @nestjs/platform-fastify
```

```ts
// main.ts con Fastify
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }), // opciones propias de Fastify
  );

  // ⚠️ Fastify escucha solo en localhost por defecto: en contenedores usa 0.0.0.0
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();
```

```ts
// main.ts con Express, tipado explícito (te da app.set, app.useStaticAssets, etc.)
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
```

> ⚠️ Si en tu código usas `@Req() req: Request` importando `Request` de `express`, ese controller queda **acoplado a Express**. Al cambiar a Fastify compila (los tipos no se validan en runtime) pero puede romper en ejecución (`res.status().json()` no existe igual en `FastifyReply`). Evita tocar `req`/`res` directamente (Sesión 4).

> ❓ **Entrevista**: *"¿Cuándo elegirías Fastify?"* → Cuando el throughput por instancia importa (APIs de alto tráfico, costo de infraestructura) y no dependes de middleware exclusivo de Express. Pero la mayoría de las veces el cuello de botella es la base de datos, no el framework HTTP: mide antes de cambiar (Sesión 33).

### 4.2 Nest 11 y Express 5: cambios que te afectan desde el día 1

Nest 11 (enero de 2025) actualizó la plataforma por defecto a **Express 5**, que usa una nueva versión de `path-to-regexp`. Consecuencias:

| Antes (Nest ≤10, Express 4) | Ahora (Nest 11, Express 5) |
|---|---|
| `@Get('archivos/*')` | `@Get('archivos/*splat')` — el comodín **debe tener nombre** |
| Comodín que también matchea la raíz | `@Get('archivos/{*splat}')` — llaves = opcional |
| Parámetro opcional `@Get(':id?')` | `@Get('{:id}')` — los `?` ya no se usan |
| Regex dentro del path `':id(\\d+)'` | No soportado: valida con pipes (Sesión 10) |
| `forRoutes('*')` en middleware | `forRoutes('{*splat}')` (Nest intenta convertir la sintaxis vieja y avisa con un warning) |
| Query parser "extended" (`?filtro[precio]=10` → objeto) | Parser **"simple"** por defecto: los objetos anidados no se parsean. Se restaura con `app.set('query parser', 'extended')` |

Lo detallamos en la Sesión 4 (routing) y la Sesión 8 (middleware).

---

## 5. Instalación y CLI

Requisitos para Nest 11: **Node.js 20 o superior** (Nest 11 dejó de soportar Node 16 y 18).

```bash
node -v                                  # v20.x o v22.x
npm i -g @nestjs/cli                     # el CLI global
nest --version                           # 11.x

nest new tienda-api                      # pregunta el gestor de paquetes (npm / yarn / pnpm)
nest new tienda-api -p pnpm --strict     # sin preguntar + TypeScript en modo strict
cd tienda-api
npm run start:dev                        # watch mode: recompila y reinicia al guardar
```

> 💡 Usa `--strict` en proyectos nuevos. Sin él, el `tsconfig.json` generado deja `noImplicitAny: false` y otras flags relajadas. Ser estricto desde el día 1 es mucho más barato que activarlo después.

### 5.1 Generadores (schematics)

`nest generate <schematic> <nombre>` (alias `nest g`) crea el archivo, su `.spec.ts` y **lo registra en el módulo** correspondiente.

| Schematic | Alias | Genera |
|---|---|---|
| `module` | `mo` | Módulo |
| `controller` | `co` | Controller (+ lo agrega a `controllers` del módulo) |
| `service` | `s` | Provider (+ lo agrega a `providers`) |
| `resource` | `res` | **CRUD completo**: módulo, controller, service, DTOs, entidad |
| `guard` | `gu` | Guard (Sesión 11) |
| `interceptor` | `itc` | Interceptor (Sesión 12) |
| `pipe` | `pi` | Pipe (Sesión 10) |
| `filter` | `f` | Exception filter (Sesión 9) |
| `middleware` | `mi` | Middleware (Sesión 8) |
| `decorator` | `d` | Decorador personalizado (Sesión 13) |
| `gateway` | `ga` | WebSocket gateway (Sesión 27) |
| `resolver` | `r` | Resolver GraphQL (Sesión 28) |
| `library` / `sub-app` | `lib` / `app` | Monorepo (Sesión 31) |

```bash
nest g res productos --dry-run      # muestra qué crearía SIN escribir nada (úsalo siempre al aprender)
nest g s productos --no-spec        # sin archivo de test
nest g co productos --flat          # sin crear carpeta propia
nest g mo core/database             # en una subcarpeta
```

### 5.2 Comandos de ejecución y build

| Comando | Qué hace |
|---|---|
| `nest start` | Compila y ejecuta una vez |
| `nest start --watch` | Watch mode (lo que usa `npm run start:dev`) |
| `nest start --debug --watch` | Con inspector de Node (`start:debug`) para depurar en VS Code / Chrome |
| `nest build` | Compila a `dist/` (con `deleteOutDir: true` limpia antes) |
| `node dist/main` | Producción (`start:prod`): **nunca** uses `nest start` en producción |
| `nest start -b swc` | Compila con **SWC** (mucho más rápido que `tsc`); requiere `@swc/cli` y `@swc/core` |
| `nest info` | Versiones de Nest, Node y SO (útil al reportar bugs) |

> ⚠️ SWC transpila sin chequear tipos. En proyectos grandes acelera el watch mode muchísimo, pero agrega `--type-check` o corre `tsc --noEmit` en CI para no perder los errores de tipos.

---

## 6. Estructura del proyecto generado

```
tienda-api/
├── src/
│   ├── main.ts                 ← punto de entrada: crea la app y escucha
│   ├── app.module.ts           ← módulo raíz
│   ├── app.controller.ts       ← controller de ejemplo (GET /)
│   ├── app.controller.spec.ts  ← test unitario del controller
│   └── app.service.ts          ← provider de ejemplo
├── test/
│   ├── app.e2e-spec.ts         ← test end-to-end con Supertest (Sesión 22)
│   └── jest-e2e.json           ← config de Jest para e2e
├── nest-cli.json               ← config del CLI (sourceRoot, compilador, assets)
├── tsconfig.json               ← config de TypeScript
├── tsconfig.build.json         ← excluye tests y dist del build
├── eslint.config.mjs           ← ESLint "flat config" (formato nuevo)
├── .prettierrc
└── package.json
```

### 6.1 Los archivos clave, línea por línea

```ts
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // 1. Construye la aplicación a partir del módulo raíz:
  //    escanea módulos, resuelve el grafo de dependencias, instancia providers
  //    y registra las rutas en Express.
  const app = await NestFactory.create(AppModule);

  // 2. Aquí va la configuración global (la veremos sesión a sesión):
  //    app.useGlobalPipes(...)  (Sesión 6)
  //    app.enableCors(...)      (Sesión 20)
  //    app.setGlobalPrefix('api')

  // 3. Empieza a aceptar conexiones
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap(); // "void" marca explícitamente que no esperamos la promesa (regla no-floating-promises)
```

```ts
// src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],                  // otros módulos cuyos providers exportados necesito
  controllers: [AppController], // controllers que pertenecen a este módulo
  providers: [AppService],      // providers que el contenedor debe saber construir
})
export class AppModule {}       // la clase está vacía: todo está en la metadata
```

```ts
// src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller() // sin prefijo → rutas desde "/"
export class AppController {
  // Inyección por constructor: Nest ve que el constructor pide un AppService
  // (gracias a la metadata de tipos, Sesión 2) y le pasa la instancia única.
  constructor(private readonly appService: AppService) {}

  @Get() // GET /
  getHello(): string {
    return this.appService.getHello(); // lo que devuelves se serializa como respuesta
  }
}
```

```ts
// src/app.service.ts
import { Injectable } from '@nestjs/common';

@Injectable() // marca la clase como gestionable por el contenedor de DI
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
```

### 6.2 `tsconfig.json`: las dos flags que hacen funcionar a Nest

```jsonc
{
  "compilerOptions": {
    "experimentalDecorators": true,   // habilita los decoradores "legacy" que usa Nest
    "emitDecoratorMetadata": true,    // emite los tipos de los parámetros del constructor
                                      // → así Nest sabe QUÉ inyectar (Sesión 2)
    "target": "ES2023",
    "module": "nodenext",             // plantilla de Nest 11 (antes era "commonjs")
    "moduleResolution": "nodenext",
    "isolatedModules": true,
    "outDir": "./dist",
    "strictNullChecks": true
    // ...
  }
}
```

> ⚠️ Si alguien "limpia" el `tsconfig` y quita `emitDecoratorMetadata`, **todo compila**, pero al arrancar Nest no puede resolver ninguna dependencia inyectada por tipo. Es uno de los errores más desconcertantes para un junior: la causa está en la configuración, no en el código.

### 6.3 `nest-cli.json`

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

Aquí se configuran también `assets` (copiar `.graphql`, plantillas o `.proto` a `dist/`), `builder: "swc"`, plugins como el de Swagger (Sesión 21) y los proyectos de un monorepo (Sesión 31).

---

## 7. Qué pasa cuando arranca la app

```bash
npm run start:dev
```

```
[Nest] 12345  - LOG [NestFactory] Starting Nest application...
[Nest] 12345  - LOG [InstanceLoader] AppModule dependencies initialized +8ms
[Nest] 12345  - LOG [RoutesResolver] AppController {/}: +3ms
[Nest] 12345  - LOG [RouterExplorer] Mapped {/, GET} route +2ms
[Nest] 12345  - LOG [NestApplication] Nest application successfully started +1ms
```

Cada línea corresponde a una fase del bootstrap:

```
NestFactory.create(AppModule)
   │
   ├─ 1. SCAN (DependenciesScanner)
   │      Recorre AppModule y sus imports recursivamente leyendo la metadata
   │      de @Module → construye el grafo de módulos, controllers y providers.
   │
   ├─ 2. INSTANCIAR (InstanceLoader + Injector)      → "dependencies initialized"
   │      Para cada provider lee design:paramtypes, resuelve sus dependencias
   │      primero (orden topológico) y crea UNA instancia (singleton por defecto).
   │
   ├─ 3. RUTAS (RoutesResolver + RouterExplorer)     → "Mapped {/, GET} route"
   │      Lee @Controller/@Get/... y registra cada ruta en Express/Fastify,
   │      envolviendo tu método con el pipeline de guards/pipes/interceptors.
   │
   └─ 4. HOOKS: onModuleInit → onApplicationBootstrap (Sesión 24)

app.listen(3000)                                     → "successfully started"
```

> ❓ **Entrevista**: *"Si un provider tiene una dependencia que no se puede resolver, ¿cuándo falla?"* → **Al arrancar**, no en la primera request. El injector construye el grafo completo en el bootstrap y lanza `Nest can't resolve dependencies of the X (?)...`. Es una ventaja: los errores de cableado se detectan en el deploy, no en producción a las 3 a. m. (salvo providers con scope REQUEST o lazy, Sesión 23).

> ⚠️ Si no ves la línea `Mapped {...} route` de tu endpoint, el controller **no está registrado** en ningún módulo alcanzable desde `AppModule`. Nest no busca archivos por carpeta: solo conoce lo que declaras en `@Module`.

---

## 8. Primer recurso de TiendaApi

Vamos a crear el recurso de productos con el generador y a entender lo que produce.

```bash
nest g resource productos
# ? What transport layer do you use? REST API
# ? Would you like to generate CRUD entry points? Yes
```

```
src/productos/
├── dto/
│   ├── create-producto.dto.ts
│   └── update-producto.dto.ts
├── entities/
│   └── producto.entity.ts
├── productos.controller.spec.ts
├── productos.controller.ts
├── productos.module.ts
├── productos.service.spec.ts
└── productos.service.ts
UPDATE src/app.module.ts        ← agregó ProductosModule a imports
```

> ⚠️ El generador singulariza con reglas del **inglés** (librería `pluralize`). `productos` → `Producto` y `categorias` → `Categoria` salen bien porque basta con quitar la "s", pero `ordenes` probablemente te dé algo como `Ordene`. Revisa siempre los nombres generados (usa `--dry-run`) y renombra a `Orden` cuando haga falta.

El controller generado (simplificado):

```ts
// src/productos/productos.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Controller('productos') // prefijo: todas las rutas empiezan con /productos
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post() // POST /productos → 201 por defecto
  create(@Body() createProductoDto: CreateProductoDto) {
    return this.productosService.create(createProductoDto);
  }

  @Get() // GET /productos
  findAll() {
    return this.productosService.findAll();
  }

  @Get(':id') // GET /productos/42
  findOne(@Param('id') id: string) {
    // los params de ruta SIEMPRE llegan como string: el "+" convierte a número.
    // En la Sesión 4 lo reemplazamos por ParseIntPipe.
    return this.productosService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductoDto: UpdateProductoDto) {
    return this.productosService.update(+id, updateProductoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productosService.remove(+id);
  }
}
```

```ts
// src/productos/dto/update-producto.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductoDto } from './create-producto.dto';

// PartialType crea una clase con todas las propiedades opcionales
// (y conserva los decoradores de validación, Sesión 6)
export class UpdateProductoDto extends PartialType(CreateProductoDto) {}
```

Hagamos que el service funcione **en memoria** (en el Bloque 3 lo conectaremos a una base de datos):

```ts
// src/productos/entities/producto.entity.ts
export class Producto {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
}
```

```ts
// src/productos/dto/create-producto.dto.ts
export class CreateProductoDto {
  nombre: string;
  precio: number;
  stock: number;
  // la validación con class-validator llega en la Sesión 6
}
```

```ts
// src/productos/productos.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Producto } from './entities/producto.entity';

@Injectable()
export class ProductosService {
  // Estado en memoria: vive mientras viva el proceso (el service es singleton)
  private readonly productos = new Map<number, Producto>();
  private siguienteId = 1;

  create(dto: CreateProductoDto): Producto {
    const producto: Producto = { id: this.siguienteId++, ...dto };
    this.productos.set(producto.id, producto);
    return producto;
  }

  findAll(): Producto[] {
    return [...this.productos.values()];
  }

  findOne(id: number): Producto {
    const producto = this.productos.get(id);
    // Lanzar una HttpException desde el service: Nest la convierte en 404 JSON.
    // (Si esto es buena idea en capas de dominio lo discutimos en la Sesión 9.)
    if (!producto) throw new NotFoundException(`Producto ${id} no existe`);
    return producto;
  }

  update(id: number, dto: UpdateProductoDto): Producto {
    const actualizado = { ...this.findOne(id), ...dto };
    this.productos.set(id, actualizado);
    return actualizado;
  }

  remove(id: number): void {
    this.findOne(id); // lanza 404 si no existe
    this.productos.delete(id);
  }
}
```

```bash
curl -X POST localhost:3000/productos \
  -H 'Content-Type: application/json' \
  -d '{"nombre":"Teclado","precio":49990,"stock":10}'
# {"id":1,"nombre":"Teclado","precio":49990,"stock":10}   ← 201 Created

curl localhost:3000/productos/99
# {"message":"Producto 99 no existe","error":"Not Found","statusCode":404}
```

> ❓ **Entrevista**: *"¿Por qué el estado en memoria funciona entre requests?"* → Porque los providers son **singletons** por defecto: Nest crea una sola instancia de `ProductosService` para toda la aplicación, así que el `Map` persiste entre requests. Esto no escala horizontalmente (cada réplica tendría su propio `Map`) y por eso en producción el estado va a una base de datos o Redis.

---

## 9. Qué trae NestJS 11 (y por qué te importa)

| Cambio | Impacto |
|---|---|
| **Node 20+** obligatorio | Imágenes Docker y CI deben usar Node 20/22 |
| **Express 5** por defecto | Nueva sintaxis de comodines y opcionales; query parser "simple" (Sesión 4) |
| **Fastify 5** en `platform-fastify` | Plugins `@fastify/*` deben estar en versiones compatibles con Fastify 5 |
| `ConsoleLogger` con **modo JSON** (`new ConsoleLogger({ json: true })`) | Logs estructurados sin librería externa (Sesión 32) |
| Nuevo `ParseDatePipe` | Parsear fechas de params/query (Sesión 10) |
| Hooks de cierre (`onModuleDestroy`, `beforeApplicationShutdown`, `onApplicationShutdown`) en **orden inverso** al de inicialización | Importa para graceful shutdown (Sesión 24 y 34) |
| Generación de la clave de módulos dinámicos por **referencia de objeto** (arranque más rápido) | Importar dos veces el "mismo" módulo dinámico creado con dos llamadas distintas puede producir dos instancias (Sesión 3 y 24) |
| `@nestjs/cache-manager` 3 sobre **cache-manager v6 + Keyv** | Cambia la forma de configurar stores como Redis (Sesión 25) |
| `@nestjs/config` 4: cambios en la precedencia de lectura de `ConfigService` | Revisar si dependías del orden viejo (Sesión 7) |

> ⚠️ Mucho material en internet (tutoriales, respuestas de Stack Overflow, código generado por IA entrenada con código viejo) sigue mostrando `@Get('*')` o `cacheManager.store`. Cuando algo "no funciona como en el tutorial", revisa primero la versión.

---

## 10. Cuándo Nest es (y no es) la herramienta correcta

| Escenario | ¿Nest? | Por qué |
|---|---|---|
| API de negocio con varios dominios y equipo mediano/grande | ✅ | La estructura y la DI pagan su costo rápidamente |
| Backend que combina REST + colas + WebSockets + cron | ✅ | Mismo modelo (módulos, DI, guards) para todo |
| Microservicios que comparten convenciones | ✅ | Transports integrados, monorepo (Sesión 29, 31) |
| Script, Lambda pequeña o proxy de 3 endpoints | ⚠️ | El bootstrap y la abstracción pueden sobrar; Express/Fastify/Hono puro basta |
| Equipo sin experiencia en OOP/decoradores y proyecto chico | ⚠️ | La curva inicial es real |
| Máximo rendimiento bruto por request | ⚠️ | Hay overhead; Fastify ayuda, pero un framework minimalista siempre gana en microbenchmarks |

> ❓ **Entrevista**: *"¿Cuál es la principal crítica a NestJS?"* → La **verbosidad y el overhead conceptual**: decoradores, módulos y DI para cosas que en Express son 3 líneas, y cierta "magia" de metadata que dificulta depurar a quien no la entiende. La contrapartida es consistencia, testabilidad y escalabilidad organizacional. Una respuesta senior reconoce el trade-off en vez de defender el framework ciegamente.

---

## Resumen mental de la sesión

```
NestJS = arquitectura (módulos + DI + pipeline) SOBRE Express 5 (default) o Fastify 5
Inspirado en Angular (módulos/decoradores) y Spring/ASP.NET (IoC)

3 piezas:
  @Module()      → agrupa y encapsula (imports / controllers / providers / exports)
  @Controller()  → HTTP ↔ llamadas a services. Delgado, sin lógica de negocio
  @Injectable()  → provider: lógica, datos, clientes. Singleton por defecto

Bootstrap: NestFactory.create(AppModule)
  scan metadata → resolver grafo DI → instanciar → mapear rutas → hooks → listen
  Dependencia faltante = falla AL ARRANCAR

tsconfig: experimentalDecorators + emitDecoratorMetadata  (sin ellos, no hay DI por tipo)

CLI: nest new -p pnpm --strict | nest g res|mo|co|s <nombre> [--dry-run --no-spec --flat]
     start:dev (watch) · build → dist · start:prod = node dist/main · -b swc

Fastify: FastifyAdapter + listen(port, '0.0.0.0'); no acoples controllers a req/res
Nest 11: Node 20+, Express 5 (comodines con nombre '*splat', opcionales '{...}', query "simple")
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué problema resuelve NestJS que Express no resuelve? ¿Lo reemplaza?
2. ❓ Nombra tres ideas que Nest toma de Angular y Spring/ASP.NET.
3. ❓ ¿Cuál es la responsabilidad de un módulo, un controller y un provider? ¿Por qué el controller debe ser delgado?
4. ❓ ¿Qué es el HttpAdapter y por qué permite cambiar Express por Fastify?
5. ❓ ¿Cuándo elegirías Fastify? ¿Qué cuidado especial tiene `listen` en Docker?
6. ❓ Explica las fases de `NestFactory.create`. ¿En qué momento se detecta una dependencia no resolvible?
7. ❓ ¿Qué pasa si quitas `emitDecoratorMetadata` del `tsconfig`?
8. ❓ ¿Qué hace `nest g resource` y qué registra automáticamente?
9. ❓ ¿Por qué no se usa `nest start` en producción? ¿Qué ventaja y qué riesgo tiene SWC?
10. ❓ ¿Qué cambió con Express 5 en Nest 11 respecto a rutas con comodines, parámetros opcionales y query strings?
11. ❓ ¿Por qué un `Map` en un service conserva datos entre requests? ¿Por qué no escala?
12. ❓ ¿Cuál es la principal crítica a Nest y cómo la responderías?

## Ejercicio práctico
1. Instala el CLI y crea el proyecto: `nest new tienda-api -p npm --strict`. Ejecuta `npm run start:dev` y verifica `GET http://localhost:3000`.
2. Lee los logs de arranque e identifica las fases scan → instanciar → rutas. Luego elimina `AppController` del array `controllers` de `AppModule` y observa qué línea desaparece.
3. Abre `tsconfig.json`, comenta `emitDecoratorMetadata`, reinicia y lee el error. Restáuralo.
4. Ejecuta `nest g res productos --dry-run`, revisa la salida y luego genéralo de verdad.
5. Implementa el `ProductosService` en memoria de la sección 8 (con `NotFoundException`) y prueba el CRUD con `curl` o un archivo `.http`.
6. Genera también `nest g res categorias` y comprueba el nombre de la clase de la entidad generada. Repite con `usuarios`.
7. Agrega `app.setGlobalPrefix('api')` en `main.ts` y verifica que ahora las rutas son `/api/productos`.
8. Crea una rama y migra `main.ts` a **Fastify** (sección 4.1). Verifica que el CRUD sigue funcionando sin tocar controllers ni services. Vuelve a Express.
9. Ejecuta `npm run build` y luego `npm run start:prod`. Mira qué hay en `dist/`.
10. (Opcional) Configura `"builder": "swc"` en `nest-cli.json`, instala `@swc/cli @swc/core` y compara el tiempo de arranque en watch mode.

---

➡️ **Cuando termines**, marca la Sesión 1 en el [README](README.md) y pasa a la **Sesión 2 — TypeScript para Nest: clases, decoradores, reflect-metadata y generics**.

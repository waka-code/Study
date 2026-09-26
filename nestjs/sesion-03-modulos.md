# Sesión 3 — Módulos: imports, exports, providers, módulos globales y compartidos

> **Objetivo de la sesión**: entender el módulo como **límite de encapsulación**, no como una carpeta. Al terminar deberías poder explicar qué hace cada propiedad de `@Module`, por qué un provider es **privado** a su módulo por defecto, cómo compartirlo correctamente (`exports` + `imports`) y por qué **no** hay que volver a declararlo en `providers`, re-exportar módulos, decidir cuándo (casi nunca) usar `@Global()`, leer sin miedo el error *"Nest can't resolve dependencies"*, entender qué es un módulo dinámico (`forRoot` / `forFeature`) y organizar **TiendaApi** en módulos de dominio con dependencias limpias.

---

## 1. Por qué existen los módulos

En Express, cualquier archivo puede importar cualquier otro. Con el tiempo, el grafo de dependencias se convierte en una telaraña: el código de órdenes llama directo al repositorio de usuarios, el de pagos lee tablas de productos, y nadie sabe qué se rompe al cambiar algo.

Un **módulo** de Nest es una unidad que:

1. **Agrupa** lo que pertenece a un mismo dominio (productos, órdenes, usuarios).
2. **Encapsula**: lo que no exporta es invisible para el resto de la app.
3. **Declara sus dependencias** explícitamente (`imports`), así el grafo de la aplicación es visible y verificable al arrancar.

```
 Sin módulos (todo ve todo)             Con módulos (contratos explícitos)

  órdenes ─────▶ usuarios.repo           ┌────────────┐ exports ┌────────────┐
     │  ╲                                │ Productos  │────────▶│  Órdenes   │
     │   ╲──▶ productos.repo             │ Module     │         │  Module    │
     ▼                                   │ [repo priv]│         │            │
  pagos ──────▶ productos.repo           └────────────┘         └────────────┘
                                          solo ProductosService es público
```

> ❓ **Entrevista**: *"¿Un módulo de Nest es lo mismo que un módulo de JavaScript (ES module)?"* → No. Un ES module es un **archivo** con `import/export` de símbolos: controla la visibilidad *en compilación*. Un módulo de Nest es una **clase decorada** que define qué providers existen en el contenedor de DI y cuáles son visibles para otros módulos: controla la visibilidad *en el contenedor de DI*. Puedes importar la clase `ProductosRepository` en un archivo TypeScript, pero si su módulo no la exporta, Nest **no te la inyectará**.

---

## 2. Anatomía de `@Module`

```ts
import { Module } from '@nestjs/common';

@Module({
  imports: [],      // módulos cuyos providers EXPORTADOS necesito
  controllers: [],  // controllers de este módulo (Nest registra sus rutas)
  providers: [],    // providers que el injector instancia en este módulo
  exports: [],      // subconjunto de providers (o módulos importados) que expongo
})
export class ProductosModule {}
```

| Propiedad | Qué acepta | Pregunta que responde |
|---|---|---|
| `imports` | Clases de módulo o **módulos dinámicos** (`ConfigModule.forRoot()`) | ¿De quién dependo? |
| `controllers` | Clases `@Controller()` | ¿Qué rutas expongo? |
| `providers` | Clases `@Injectable()` o providers personalizados (`{ provide, useValue }`, Sesión 5 y 23) | ¿Qué sé construir? |
| `exports` | Providers de `providers`, tokens, o **módulos** de `imports` | ¿Qué es público? |

> ⚠️ Poner un service en `imports` es un error frecuente. Nest lo detecta y falla al arrancar con un mensaje del estilo *"Classes annotated with @Injectable(), @Catch(), and @Controller() decorators must not appear in the "imports" array of a module"*. `imports` es **solo para módulos**.

> ⚠️ Los **controllers no se exportan** ni se comparten: no son inyectables. Tampoco hace falta exportarlos para que sus rutas funcionen; basta con que su módulo sea alcanzable desde `AppModule`.

---

## 3. Encapsulación: los providers son privados por defecto

Veamos TiendaApi con un módulo de órdenes que necesita consultar productos.

```ts
// src/productos/productos.module.ts
@Module({
  controllers: [ProductosController],
  providers: [ProductosService, ProductosRepository],
  // sin exports: NADIE fuera de este módulo puede inyectar estos providers
})
export class ProductosModule {}
```

```ts
// src/ordenes/ordenes.service.ts
@Injectable()
export class OrdenesService {
  constructor(private readonly productosService: ProductosService) {}
}
```

```ts
// src/ordenes/ordenes.module.ts
@Module({
  controllers: [OrdenesController],
  providers: [OrdenesService],
})
export class OrdenesModule {}
```

Al arrancar:

```
ERROR [ExceptionHandler] Nest can't resolve dependencies of the OrdenesService (?).
Please make sure that the argument ProductosService at index [0] is available
in the OrdenesModule context.

Potential solutions:
- Is OrdenesModule a valid NestJS module?
- If ProductosService is a provider, is it part of the current OrdenesModule?
- If ProductosService is exported from a separate @Module, is that module
  imported within OrdenesModule?
  @Module({
    imports: [ /* the Module containing ProductosService */ ]
  })
```

### 3.1 Cómo leer este error (lo verás cientos de veces)

| Parte del mensaje | Significado |
|---|---|
| `dependencies of the OrdenesService` | **Quién** no se pudo construir |
| `(?)` | Lista de parámetros del constructor; el `?` marca **cuál** falló. Con `(ConfigService, ?)` falló el segundo |
| `argument ProductosService at index [0]` | **Qué token** buscaba. Si dice `Object` o `Function`, el tipo es una interfaz o hubo un problema de metadata (Sesión 2). Si dice `undefined` o no muestra nombre, sospecha de un **import circular** (Sesión 23) |
| `in the OrdenesModule context` | **Dónde** buscó: en los providers propios de ese módulo y en lo que exportan sus imports |

Nest busca un token en este orden: providers del propio módulo → exports de los módulos importados → módulos globales. Si no lo encuentra, falla.

---

## 4. Compartir providers: `exports` + `imports`

La solución correcta tiene dos partes:

```ts
// 1) El dueño EXPORTA lo que quiere hacer público
@Module({
  controllers: [ProductosController],
  providers: [ProductosService, ProductosRepository],
  exports: [ProductosService], // el repositorio sigue siendo privado
})
export class ProductosModule {}

// 2) El consumidor IMPORTA el módulo (no el service)
@Module({
  imports: [ProductosModule],
  controllers: [OrdenesController],
  providers: [OrdenesService],
})
export class OrdenesModule {}
```

Ahora el grafo de TiendaApi queda explícito:

```
                 AppModule
       ┌────────────┼──────────────┐
       ▼            ▼              ▼
 ProductosModule  UsuariosModule  OrdenesModule
   exports:        exports:        imports: [ProductosModule, UsuariosModule]
   ProductosService UsuariosService
       ▲                ▲              │
       └────────────────┴──────────────┘
          OrdenesService inyecta ambos
```

> 💡 Exportar solo el **service** y no el **repositorio** es diseño deliberado: otros dominios pasan por las reglas de negocio de productos (validar stock, precios) en lugar de escribir directo en sus datos. El módulo es tu **API pública interna**.

### 4.1 El error más peligroso: redeclarar el provider

La "solución rápida" que ves en muchos proyectos:

```ts
// ❌ MAL: OrdenesModule declara ProductosService en SUS providers
@Module({
  controllers: [OrdenesController],
  providers: [OrdenesService, ProductosService, ProductosRepository],
})
export class OrdenesModule {}
```

Compila y arranca. Pero ahora hay **dos instancias** de `ProductosService` y de `ProductosRepository`: una en `ProductosModule` y otra en `OrdenesModule`. Con nuestro repositorio en memoria el bug es evidente:

```
POST /productos          → crea el producto en el Map de la instancia A
POST /ordenes {productoId: 1}
  → OrdenesService consulta la instancia B → "Producto 1 no existe" (404)
```

Con una base de datos el síntoma es más sutil: dos pools de conexiones, dos cachés locales que se desincronizan, dos suscripciones a la misma cola.

> ❓ **Entrevista**: *"¿Los providers de un módulo compartido son singletons?"* → Sí: los providers se instancian **una vez por módulo que los declara**. Si N módulos importan `ProductosModule`, todos reciben **la misma** instancia de `ProductosService`. Si además lo declaras en `providers` de otro módulo, creas una segunda instancia. Por eso se **importa el módulo**, nunca se redeclara el provider.

### 4.2 Qué se puede exportar

```ts
@Module({
  imports: [HttpModule],
  providers: [
    ProductosService,
    { provide: 'TASA_IVA', useValue: 0.19 },     // provider con token string (Sesión 5)
  ],
  exports: [
    ProductosService,  // una clase de providers
    'TASA_IVA',        // un token
    HttpModule,        // un MÓDULO importado → re-export (sección 5)
  ],
})
export class ProductosModule {}
```

Solo puedes exportar lo que **pertenece** al módulo (está en `providers`) o lo que el módulo **importa**. Exportar algo ajeno falla al arrancar con un error que indica que no se puede exportar un provider/módulo que no forma parte del módulo actual.

---

## 5. Re-exportar módulos

Un módulo puede exportar módulos que importa, para ofrecer un "paquete" de funcionalidad:

```ts
// src/core/core.module.ts
@Module({
  imports: [DatabaseModule, LoggingModule],
  exports: [DatabaseModule, LoggingModule], // quien importe CoreModule obtiene ambos
})
export class CoreModule {}
```

```ts
@Module({
  imports: [CoreModule], // accede a lo que exportan DatabaseModule y LoggingModule
  providers: [ProductosService],
})
export class ProductosModule {}
```

La visibilidad **no es transitiva** salvo que re-exportes:

```
A imports B, B imports C (C exporta X)
  → B puede inyectar X
  → A NO puede inyectar X ... salvo que B haga exports: [C]
```

> ⚠️ No abuses del patrón "SharedModule que re-exporta todo". Termina siendo un módulo del que depende toda la app, que arrastra 30 providers a cada módulo y hace que los límites de dominio desaparezcan. Prefiere módulos pequeños y específicos (`DatabaseModule`, `MailModule`) importados donde se usan.

---

## 6. Módulos globales: `@Global()`

```ts
import { Global, Module } from '@nestjs/common';

@Global() // sus EXPORTS quedan disponibles en todos los módulos sin importarlo
@Module({
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
```

Un módulo global **se registra una sola vez** (normalmente importándolo en `AppModule`) y sus exports se inyectan en cualquier parte.

| A favor | En contra |
|---|---|
| Menos boilerplate para infraestructura realmente transversal (config, logger) | Oculta dependencias: mirando `@Module` ya no ves de qué depende el módulo |
| | Dificulta extraer un módulo a otra app o librería (Sesión 31) |
| | Tests más frágiles: el módulo "funciona" solo porque alguien registró el global |

Reglas prácticas:

- **Sí** para infraestructura omnipresente: `ConfigModule.forRoot({ isGlobal: true })` (Sesión 7), logger, cliente de métricas.
- **No** para servicios de dominio (`ProductosService`, `UsuariosService`): importa su módulo explícitamente.
- `@Global()` hace globales los **exports**, no los providers internos, y aun así el módulo debe importarse **una vez** (en `AppModule` o en un `CoreModule`).

> ❓ **Entrevista**: *"¿Por qué Nest no hace globales todos los providers como Angular con `providedIn: 'root'`?"* → Por decisión de diseño: la encapsulación por módulo hace el grafo explícito y evita el acoplamiento accidental entre dominios. La documentación de Nest describe los módulos globales como una herramienta para casos puntuales y advierte que hacer todo global es una mala práctica de diseño.

> ⚠️ Los **enhancers globales** registrados con tokens `APP_GUARD`, `APP_PIPE`, `APP_INTERCEPTOR`, `APP_FILTER` son globales **sin importar** en qué módulo se declaren. No es lo mismo que `@Global()`: lo vemos en las Sesiones 9–12.

---

## 7. Módulos dinámicos (vista previa)

Hasta ahora todos los módulos son **estáticos**: su configuración está fija en el decorador. Pero muchos módulos necesitan **parámetros**: la URL de la base de datos, qué entidades registrar, opciones de caché. Para eso existen los **módulos dinámicos**: un método estático que devuelve un objeto `DynamicModule`.

```ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),         // configuración global de la app
    TypeOrmModule.forRoot({ type: 'postgres', /*...*/ }), // conexión (una vez)
    TypeOrmModule.forFeature([Producto, Categoria]),  // repositorios para ESTE módulo
    HttpModule.register({ timeout: 5000 }),           // instancia configurada
  ],
})
export class ProductosModule {}
```

| Convención | Significado | Ejemplo |
|---|---|---|
| `forRoot()` / `forRootAsync()` | Configurar **una vez** para toda la app (conexiones, globales) | `TypeOrmModule.forRoot`, `ConfigModule.forRoot` |
| `forFeature()` | Registrar algo **para el módulo que lo importa**, reutilizando la config de `forRoot` | `TypeOrmModule.forFeature([Producto])` |
| `register()` / `registerAsync()` | Instancia configurada **por cada** importación | `HttpModule.register`, `JwtModule.register` |

La variante `Async` recibe una factory con `inject`, para leer configuración de otro provider (`ConfigService`) en vez de valores fijos.

Un `DynamicModule` es simplemente la metadata de `@Module` construida en runtime:

```ts
// Forma mínima de un módulo dinámico (lo construimos en serio en la Sesión 24)
import { DynamicModule, Module } from '@nestjs/common';

export interface MailOptions { remitente: string; }
export const MAIL_OPTIONS = Symbol('MAIL_OPTIONS');

@Module({})
export class MailModule {
  static register(opciones: MailOptions): DynamicModule {
    return {
      module: MailModule,                              // obligatorio
      providers: [
        { provide: MAIL_OPTIONS, useValue: opciones }, // la config como provider
        MailService,
      ],
      exports: [MailService],
      // global: true  ← también se puede hacer global así
    };
  }
}
```

> ⚠️ **Cambio en Nest 11**: la clave interna con la que Nest identifica un módulo dinámico se genera ahora a partir de la **referencia del objeto** (antes se calculaba un hash serializando su metadata, que era lento). Consecuencia: dos llamadas separadas como `MailModule.register({...})` en dos módulos distintos, aunque tengan la misma configuración, pueden producir **dos instancias** del módulo. Si quieres compartir la misma instancia, guarda el resultado en una constante y reutilízala (`export const MailConfigurado = MailModule.register({...})`), o expónlo desde un módulo propio que lo re-exporte.

---

## 8. Organizando TiendaApi

```
src/
├── main.ts
├── app.module.ts
├── core/                    ← infraestructura transversal (se importa una vez)
│   ├── core.module.ts
│   └── reloj/reloj.service.ts
├── common/                  ← código puro reutilizable: DTOs base, pipes, decoradores
│   └── dto/paginado.ts        (NO es un módulo: son clases/funciones sueltas)
├── categorias/
│   ├── categorias.module.ts
│   ├── categorias.controller.ts
│   └── categorias.service.ts
├── productos/
│   ├── productos.module.ts
│   ├── productos.controller.ts
│   ├── productos.service.ts
│   └── productos.repository.ts
├── usuarios/
│   └── ...
└── ordenes/
    ├── ordenes.module.ts
    ├── ordenes.controller.ts
    └── ordenes.service.ts
```

```ts
// src/core/core.module.ts
import { Global, Module } from '@nestjs/common';
import { RelojService } from './reloj/reloj.service';

@Global() // infraestructura verdaderamente transversal: aceptable
@Module({
  providers: [RelojService], // abstrae "la hora actual" → testeable (Sesión 5)
  exports: [RelojService],
})
export class CoreModule {}
```

```ts
// src/categorias/categorias.module.ts
@Module({
  controllers: [CategoriasController],
  providers: [CategoriasService],
  exports: [CategoriasService],
})
export class CategoriasModule {}
```

```ts
// src/productos/productos.module.ts
@Module({
  imports: [CategoriasModule],                 // validar que la categoría exista
  controllers: [ProductosController],
  providers: [ProductosService, ProductosRepository],
  exports: [ProductosService],                  // el repositorio queda privado
})
export class ProductosModule {}
```

```ts
// src/ordenes/ordenes.module.ts
@Module({
  imports: [ProductosModule, UsuariosModule],
  controllers: [OrdenesController],
  providers: [OrdenesService],
})
export class OrdenesModule {}
```

```ts
// src/app.module.ts
@Module({
  imports: [
    CoreModule,
    CategoriasModule,
    ProductosModule,
    UsuariosModule,
    OrdenesModule,
  ],
})
export class AppModule {}
```

Dirección de dependencias (debe ser un **grafo acíclico**):

```
   OrdenesModule ──▶ ProductosModule ──▶ CategoriasModule
         │
         └────────▶ UsuariosModule

   CoreModule (@Global) ── disponible para todos
```

> 💡 ¿Hace falta importar `CategoriasModule` en `AppModule` si ya lo importa `ProductosModule`? Para que funcione, no: Nest recorre los imports recursivamente y registra las rutas de `CategoriasController` igual. Listarlos todos en `AppModule` es una convención de **legibilidad**: de un vistazo ves todos los dominios de la app. El módulo sigue siendo único (una sola instancia).

### 8.1 Tipos de módulo por responsabilidad

| Tipo | Contiene | Se importa en |
|---|---|---|
| **Feature module** | Un dominio: controller + services + repositorio | `AppModule` y en los módulos que lo consumen |
| **Core / infraestructura** | Config, BD, logger, reloj, clientes HTTP | Una vez (`AppModule`), a veces global |
| **Módulo de integración** | Cliente de un sistema externo (pagos, email, S3) | En los features que lo usan |
| **`common/` (no-módulo)** | Pipes, decoradores, DTOs base, utilidades puras | Imports de TypeScript normales |

> ⚠️ No todo necesita ser un módulo de Nest. Un pipe, un decorador o una función de utilidad sin dependencias se importan con `import` de TypeScript y se usan directamente. Solo necesitas un módulo cuando hay **providers que el contenedor debe instanciar**.

---

## 9. Dependencias circulares entre módulos

Supón que `ProductosModule` importa `OrdenesModule` (para mostrar "cuántas veces se vendió") y `OrdenesModule` importa `ProductosModule`. Al arrancar, uno de los dos imports llega como `undefined` y Nest falla con un error que menciona una **dependencia circular** o un módulo `undefined` en `imports`, sugiriendo `forwardRef()`.

```ts
// La salida de emergencia (la vemos a fondo en la Sesión 23)
@Module({
  imports: [forwardRef(() => OrdenesModule)],
})
export class ProductosModule {}
```

Pero `forwardRef` trata el síntoma. Una circularidad entre módulos casi siempre indica **límites de dominio mal trazados**. Opciones mejores:

| Estrategia | Cómo |
|---|---|
| **Extraer un tercer módulo** | Lo que ambos necesitan (ej. `EstadisticasVentasModule`) depende de los dos, no al revés |
| **Invertir la dependencia** | Órdenes depende de productos; productos no necesita saber de órdenes: que órdenes **publique** "venta realizada" |
| **Eventos** | `EventEmitter2` / `@nestjs/event-emitter` (Sesión 25) o CQRS (Sesión 30): desacopla en el tiempo y en el grafo |

> ❓ **Entrevista**: *"Tienes una dependencia circular entre dos módulos, ¿qué haces?"* → Primero cuestiono el diseño: ¿los límites son correctos? Busco extraer lo compartido a un tercer módulo o reemplazar la llamada directa por un evento. `forwardRef()` es la última opción, porque la circularidad sigue ahí y además complica la inicialización (el orden de instanciación deja de ser obvio).

---

## 10. Utilidades relacionadas

### 10.1 `RouterModule`: prefijos por módulo

Para agrupar rutas bajo un prefijo sin tocar cada controller:

```ts
import { RouterModule } from '@nestjs/core';

@Module({
  imports: [
    AdminModule,
    ProductosModule,
    RouterModule.register([
      { path: 'admin', module: AdminModule }, // rutas de AdminModule → /admin/...
    ]),
  ],
})
export class AppModule {}
```

### 10.2 Obtener providers fuera del contexto de una request

```ts
// main.ts: por ejemplo, para un script de seed
const app = await NestFactory.create(AppModule);
const productos = app.get(ProductosService);              // busca en toda la app
const soloDelModulo = app.select(ProductosModule).get(ProductosService, { strict: true });
```

`app.get()` es útil en scripts, pero en código de aplicación **siempre inyecta por constructor**: `app.get` esconde dependencias igual que un service locator.

### 10.3 El módulo como clase

La clase del módulo también puede inyectar providers (por ejemplo, para configurar algo al iniciar), pero **no** puede inyectarse en otros providers.

```ts
@Module({ providers: [ProductosService], exports: [ProductosService] })
export class ProductosModule {
  constructor(private readonly productos: ProductosService) {} // válido
}
```

---

## Resumen mental de la sesión

```
Módulo Nest = límite de encapsulación del CONTENEDOR DI (≠ ES module = archivo)

@Module({
  imports:     módulos (o DynamicModule) de los que dependo   ← NUNCA services
  controllers: rutas de este módulo                            ← no se exportan
  providers:   lo que el injector construye AQUÍ
  exports:     lo público: providers propios, tokens, módulos importados
})

Providers PRIVADOS por defecto. Para compartir:
  dueño → exports: [Service]    consumidor → imports: [DueñoModule]
  ❌ redeclarar el Service en providers del consumidor = SEGUNDA instancia

Singleton por módulo declarante: N importadores → misma instancia
Visibilidad NO transitiva salvo re-export (exports: [OtroModule])
Búsqueda: providers propios → exports de imports → globales → error

@Global(): exports visibles en toda la app; importar UNA vez; solo infraestructura
Dinámicos: forRoot (una vez) · forFeature (por módulo) · register (por import) · *Async
  Nest 11: identidad por referencia → reutiliza la constante si quieres UNA instancia
Circulares: rediseñar (tercer módulo / eventos) antes que forwardRef (Sesión 23)

Error "can't resolve dependencies of X (?, ...)": quién · cuál índice · qué token · dónde
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué diferencia hay entre un módulo de Nest y un ES module?
2. ❓ ¿Qué va en `imports`, `providers`, `controllers` y `exports`? ¿Qué pasa si pones un service en `imports`?
3. ❓ Un service de otro módulo no se puede inyectar: explica el error *"can't resolve dependencies"* parte por parte.
4. ❓ ¿Por qué no se debe redeclarar en `providers` un service que pertenece a otro módulo? ¿Qué bug produce?
5. ❓ Si tres módulos importan `ProductosModule`, ¿cuántas instancias de `ProductosService` hay?
6. ❓ ¿La visibilidad de exports es transitiva? ¿Cómo se re-exporta un módulo?
7. ❓ ¿Qué hace `@Global()`, cuándo lo usarías y por qué no para todo?
8. ❓ Diferencia entre `forRoot`, `forFeature` y `register`. ¿Para qué sirven las variantes `Async`?
9. ❓ ¿Qué cambió en Nest 11 en cómo se identifican los módulos dinámicos y qué implicación tiene?
10. ❓ ¿Cómo resolverías una dependencia circular entre `ProductosModule` y `OrdenesModule` sin `forwardRef`?
11. ❓ ¿Por qué exportarías `ProductosService` pero no `ProductosRepository`?
12. ❓ ¿Todo archivo reutilizable debe estar dentro de un módulo de Nest? ¿Qué va en `common/`?

## Ejercicio práctico
1. En TiendaApi, genera los módulos faltantes: `nest g res categorias`, `nest g res usuarios`, `nest g res ordenes` (REST, con CRUD).
2. Haz que `OrdenesService` inyecte `ProductosService` **sin** tocar `ProductosModule`. Arranca y lee el error completo; identifica quién, índice, token y contexto.
3. Arréglalo de la forma **incorrecta**: agrega `ProductosService` a `providers` de `OrdenesModule`. Crea un producto con `POST /productos` y luego, desde `OrdenesService.create`, busca ese producto: comprueba que no existe. Explica por qué.
4. Arréglalo bien: `exports: [ProductosService]` + `imports: [ProductosModule]`. Repite la prueba.
5. Extrae un `ProductosRepository` (el `Map` en memoria) y déjalo **sin exportar**. Intenta inyectarlo en `OrdenesService` y confirma que Nest lo impide.
6. Crea `CoreModule` con `@Global()` y un `RelojService` con método `ahora(): Date`. Úsalo en `OrdenesService` para registrar la fecha de la orden sin importar `CoreModule` en `OrdenesModule`.
7. Crea una dependencia circular a propósito (`ProductosModule` ↔ `OrdenesModule`), observa el error y resuélvela **rediseñando** (por ejemplo, que solo órdenes dependa de productos).
8. Crea un `MailModule.register({ remitente })` mínimo (sección 7) que exporte un `MailService` que solo haga `console.log`. Impórtalo en `UsuariosModule`.
9. Agrega `RouterModule.register([{ path: 'admin', module: CategoriasModule }])` y verifica en los logs de arranque (`Mapped {...}`) que las rutas de categorías cambiaron.
10. Dibuja el grafo de módulos de TiendaApi (quién importa a quién) y verifica que es acíclico.

---

➡️ **Cuando termines**, marca la Sesión 3 en el [README](README.md) y pasa a la **Sesión 4 — Controllers y routing: params, query, body, headers, status codes, respuestas**.

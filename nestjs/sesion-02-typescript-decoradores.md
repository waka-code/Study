# Sesión 2 — TypeScript para Nest: clases, decoradores, reflect-metadata y generics

> **Objetivo de la sesión**: entender el TypeScript que hace posible a NestJS. Al terminar deberías poder explicar qué es un decorador (una función, nada más), escribir decoradores de clase, método, propiedad y parámetro, predecir su **orden de ejecución**, explicar cómo `emitDecoratorMetadata` + `reflect-metadata` permiten que Nest sepa **qué inyectar** sin que se lo digas, conocer los **límites** de ese mecanismo (interfaces, uniones, generics, imports de solo tipo) y usar generics para escribir código reutilizable. Construiremos un **mini contenedor de DI** en 40 líneas para que lo que hace Nest deje de parecer magia.

---

## 1. El problema: los tipos no existen en runtime

TypeScript **borra los tipos** al compilar (*type erasure*). Esto:

```ts
class ProductosController {
  constructor(private readonly service: ProductosService) {}
}
```

compila a algo como:

```js
class ProductosController {
  constructor(service) {          // ← el tipo ProductosService desapareció
    this.service = service;
  }
}
```

Entonces, ¿cómo sabe Nest en tiempo de ejecución que debe pasar una instancia de `ProductosService`? La respuesta tiene tres piezas que veremos en esta sesión:

```
 1. Decoradores           → te permiten "enganchar" código a una clase
 2. emitDecoratorMetadata → el compilador ANOTA los tipos del constructor
                            en las clases decoradas
 3. reflect-metadata      → API para guardar y leer esas anotaciones en runtime
```

> ❓ **Entrevista**: *"¿Cómo hace Nest la inyección por tipo si TypeScript borra los tipos?"* → Con `emitDecoratorMetadata`, el compilador emite para cada clase **decorada** la metadata `design:paramtypes`: un array con las referencias a las **clases** (valores de runtime) de los parámetros del constructor. Nest lo lee con `Reflect.getMetadata` y resuelve cada dependencia. Solo funciona con tipos que existen en runtime (clases), no con interfaces.

---

## 2. Clases: lo que usarás todos los días

### 2.1 Parameter properties y modificadores

```ts
// Forma larga
class ProductosController {
  private readonly productosService: ProductosService;
  constructor(productosService: ProductosService) {
    this.productosService = productosService;
  }
}

// Forma corta (parameter property): declara, asigna e inyecta en una línea.
// Es el estilo idiomático de Nest.
class ProductosController {
  constructor(private readonly productosService: ProductosService) {}
}
```

| Modificador | Significado | Uso típico en Nest |
|---|---|---|
| `private` | Solo visible dentro de la clase (chequeo en compilación) | Dependencias inyectadas |
| `readonly` | No se puede reasignar después del constructor | **Siempre** en dependencias: nadie debería cambiar el service |
| `protected` | Visible en subclases | Base classes (`BaseRepository<T>`) |
| `#campo` | Privado **real** de JavaScript (en runtime) | Raro en Nest; no funciona como parameter property |

### 2.2 Clase vs interfaz vs clase abstracta

| | `interface` | `abstract class` | `class` |
|---|---|---|---|
| ¿Existe en runtime? | ❌ Se borra | ✅ Es una función constructora | ✅ |
| ¿Puede ser token de DI? | ❌ (necesita `@Inject(TOKEN)`, Sesión 5) | ✅ | ✅ |
| ¿Tiene implementación? | No | Parcial | Sí |
| ¿Sirve para DTOs con class-validator? | ❌ (los decoradores necesitan clases) | — | ✅ |

```ts
// Una clase abstracta existe en runtime → sirve como "contrato inyectable"
export abstract class NotificadorService {
  abstract enviar(destino: string, mensaje: string): Promise<void>;
}

@Injectable()
export class EmailNotificadorService extends NotificadorService {
  async enviar(destino: string, mensaje: string) {
    // ... SMTP / SES
  }
}
// En la Sesión 5 veremos { provide: NotificadorService, useClass: EmailNotificadorService }
```

> ⚠️ Los **DTOs deben ser clases**, no interfaces. Con una interfaz, `ValidationPipe` no tiene nada que instanciar ni decoradores que leer: la validación simplemente no ocurre y no hay error (Sesión 6).

### 2.3 `strictPropertyInitialization` y el `!`

Con `--strict`, TypeScript exige inicializar las propiedades. En DTOs y entidades las rellena otra librería (class-transformer, TypeORM), así que se usa el operador de aserción:

```ts
export class CreateProductoDto {
  nombre!: string;   // "confía en mí: alguien la va a asignar"
  precio!: number;
  descripcion?: string; // opcional de verdad
}
```

---

## 3. Qué es un decorador

Un decorador es **una función** que se aplica a una declaración (clase, método, propiedad, accessor o parámetro) usando la sintaxis `@`. Se ejecuta **una sola vez, al definir la clase** (cuando se carga el módulo), no cada vez que se instancia ni cada vez que se llama al método.

```ts
function MiDecorador(target: Function) {
  console.log('Decorando', target.name); // se imprime al IMPORTAR el archivo
}

@MiDecorador
class Producto {}
// → "Decorando Producto" aunque nunca hagas new Producto()
```

### 3.1 Decorator factories

Casi todos los decoradores de Nest son **factories**: funciones que *devuelven* un decorador, para poder recibir argumentos. Por eso llevan paréntesis: `@Controller('productos')`, `@Injectable()`, `@Get(':id')`.

```ts
function Recurso(nombre: string) {       // factory: recibe configuración
  return function (target: Function) {   // decorador real
    Reflect.defineMetadata('recurso', nombre, target);
  };
}

@Recurso('productos')
class ProductosController {}
```

> ⚠️ `@Injectable` sin paréntesis es un error clásico: pasas la clase a la factory en lugar de al decorador. TypeScript normalmente lo marca, pero el mensaje es críptico. En Nest, **todos** los decoradores llevan `()`.

### 3.2 Los cinco tipos (modo legacy / `experimentalDecorators`)

| Tipo | Firma | Ejemplo en Nest |
|---|---|---|
| Clase | `(target: Function) => void \| Function` | `@Module()`, `@Controller()`, `@Injectable()` |
| Método | `(target: object, key: string \| symbol, descriptor: PropertyDescriptor) => void \| PropertyDescriptor` | `@Get()`, `@UseGuards()`, `@HttpCode()` |
| Propiedad | `(target: object, key: string \| symbol) => void` | `@IsString()` (class-validator), `@Column()` (TypeORM) |
| Parámetro | `(target: object, key: string \| symbol \| undefined, index: number) => void` | `@Body()`, `@Param()`, `@Inject()` |
| Accessor | igual que método, sobre `get`/`set` | Poco usado |

`target` es el **prototipo** para miembros de instancia, o el **constructor** para miembros estáticos y para parámetros del constructor.

### 3.3 Escribiendo uno de cada tipo

```ts
import 'reflect-metadata';

// ── Clase: registra la clase en un catálogo global
const catalogo: Function[] = [];
function Registrar(): ClassDecorator {
  return (target) => {
    catalogo.push(target);
  };
}

// ── Método: envuelve el método original para medir su duración
function Medir() {
  return function (target: object, key: string | symbol, descriptor: PropertyDescriptor) {
    const original = descriptor.value as (...args: unknown[]) => unknown;
    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      const inicio = performance.now();
      try {
        return await original.apply(this, args); // ¡conserva el "this"!
      } finally {
        console.log(`${String(key)} tardó ${(performance.now() - inicio).toFixed(1)} ms`);
      }
    };
  };
}

// ── Propiedad: marca campos obligatorios
function Requerido(): PropertyDecorator {
  return (target, key) => {
    const previos: (string | symbol)[] = Reflect.getMetadata('requeridos', target) ?? [];
    Reflect.defineMetadata('requeridos', [...previos, key], target);
  };
}

// ── Parámetro: recuerda qué argumento es el "id"
function Id(): ParameterDecorator {
  return (target, key, index) => {
    Reflect.defineMetadata('param:id', index, target, key!);
  };
}

@Registrar()
class ProductosService {
  @Requerido() nombre!: string;

  @Medir()
  async buscar(@Id() id: number) {
    await new Promise((r) => setTimeout(r, 50));
    return { id };
  }
}
```

> ⚠️ **Cuidado al envolver métodos en Nest.** Decoradores como `@Get()` guardan su metadata **sobre la función** (`descriptor.value`). Si tu decorador reemplaza `descriptor.value` y se aplica *después* que `@Get()` (es decir, está escrito *arriba*), la función nueva no tiene la metadata y la ruta desaparece sin error. Para lógica transversal (medir, loguear, cachear) usa **interceptors** (Sesión 12), no decoradores que envuelven métodos. Si igual lo haces, copia la metadata con `Reflect.getMetadataKeys(original)`.

---

## 4. Orden de evaluación

Dos reglas que se preguntan en entrevistas:

1. Las **factories** se evalúan de **arriba hacia abajo**; los **decoradores** resultantes se aplican de **abajo hacia arriba** (como composición de funciones: `f(g(x))`).
2. Por declaración: primero los miembros de instancia (para cada uno, sus **parámetros** y luego el método/propiedad), después los estáticos, luego los **parámetros del constructor** y **al final la clase**.

```ts
function log(nombre: string) {
  console.log(`evalúa ${nombre}`);
  return (..._args: unknown[]) => console.log(`aplica ${nombre}`);
}

@log('clase-A')
@log('clase-B')
class Demo {
  constructor(@log('ctor-param') x: string) {}

  @log('metodo-1')
  @log('metodo-2')
  hacer(@log('param-0') a: string, @log('param-1') b: string) {}

  @log('propiedad') campo!: string;
}
```

```
evalúa metodo-1
evalúa metodo-2
evalúa param-0
evalúa param-1
aplica param-1      ← parámetros primero (del último al primero)
aplica param-0
aplica metodo-2     ← luego el método, de abajo hacia arriba
aplica metodo-1
evalúa propiedad
aplica propiedad    ← miembros en orden de declaración
evalúa clase-A
evalúa clase-B
evalúa ctor-param
aplica ctor-param   ← parámetros del constructor
aplica clase-B      ← la clase al final, de abajo hacia arriba
aplica clase-A
```

Fíjate en el último bloque: TypeScript mete los decoradores de clase **y** los de parámetros del constructor en la misma llamada a `__decorate([clase-A, clase-B, __param(0, ctor-param)], Demo)`. Por eso se *evalúan* en ese orden y se *aplican* al revés.

> ❓ **Entrevista**: *"¿Importa el orden de `@UseGuards(A)` y `@UseGuards(B)` en líneas separadas?"* → Sí. `@UseGuards` **acumula** metadata en un array (agrega al final lo que ya había). Como los decoradores se aplican de abajo hacia arriba, con `@UseGuards(A)` arriba y `@UseGuards(B)` abajo primero se registra B y después A: el array queda `[B, A]`, al revés del orden visual. Si el orden importa, ponlos **en una sola llamada**: `@UseGuards(A, B)` ejecuta A y luego B.

---

## 5. Decoradores legacy vs decoradores estándar (TC39)

TypeScript 5.0 implementó los **decoradores estándar** de ECMAScript (propuesta TC39, stage 3), que se activan cuando **no** pones `experimentalDecorators`. Nest usa los **legacy**.

| Aspecto | Legacy (`experimentalDecorators: true`) | Estándar TC39 (TS ≥ 5.0) |
|---|---|---|
| Lo usa NestJS 11 | ✅ | ❌ |
| Decoradores de **parámetro** | ✅ | ❌ No existen en la propuesta |
| `emitDecoratorMetadata` | ✅ | ❌ No soportado |
| Firma | `(target, key, descriptor)` | `(value, context)` con `context.kind`, `context.addInitializer` |
| Usado por | Nest, TypeORM, class-validator, Angular (histórico), InversifyJS | Código nuevo sin frameworks de metadata |

Sin decoradores de parámetro no hay `@Body()` ni `@Inject()`, y sin `emitDecoratorMetadata` no hay inyección por tipo. Por eso Nest sigue en modo legacy.

> ⚠️ Si tu `tsconfig.json` no tiene `experimentalDecorators: true`, TypeScript 5 compila los decoradores con la **semántica nueva** y verás errores de firma raros como *"Unable to resolve signature of parameter decorator"* o *"Decorators are not valid here"*. No es un bug de Nest: falta la flag.

---

## 6. `reflect-metadata` y `emitDecoratorMetadata`

`reflect-metadata` es un polyfill que agrega al objeto global `Reflect` una API para asociar datos arbitrarios a objetos (y a propiedades de objetos):

| Método | Uso |
|---|---|
| `Reflect.defineMetadata(clave, valor, target, propiedad?)` | Guardar |
| `Reflect.getMetadata(clave, target, propiedad?)` | Leer (sube por la cadena de prototipos → **hereda**) |
| `Reflect.getOwnMetadata(clave, target, propiedad?)` | Leer sin herencia |
| `Reflect.getMetadataKeys(target, propiedad?)` | Listar claves |
| `Reflect.hasMetadata(...)` | Comprobar |

Con `emitDecoratorMetadata: true`, el compilador agrega **automáticamente** tres claves a cada declaración **que tenga al menos un decorador**:

| Clave | Contiene | Dónde |
|---|---|---|
| `design:paramtypes` | Array de tipos de los parámetros | Constructor (en la clase) y métodos |
| `design:type` | Tipo de la propiedad (o `Function` para métodos) | Propiedades y métodos |
| `design:returntype` | Tipo de retorno | Métodos |

### 6.1 Lo que realmente emite el compilador

```ts
@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Get(':id')
  findOne(@Param('id') id: string) { /* ... */ }
}
```

Compilado con `tsc` (CommonJS, simplificado):

```js
let ProductosController = class ProductosController {
  constructor(productosService) { this.productosService = productosService; }
  findOne(id) { /* ... */ }
};
__decorate([
  (0, common_1.Get)(':id'),
  __param(0, (0, common_1.Param)('id')),
  __metadata("design:type", Function),
  __metadata("design:paramtypes", [String]),     // ← tipos de findOne
  __metadata("design:returntype", void 0)
], ProductosController.prototype, "findOne", null);

ProductosController = __decorate([
  (0, common_1.Controller)('productos'),
  __metadata("design:paramtypes", [productos_service_1.ProductosService]) // ← ¡la clave de la DI!
], ProductosController);
```

`productos_service_1.ProductosService` es **la clase real** importada: un valor de runtime. Eso es lo que Nest usa como **token** para buscar el provider.

> ❓ **Entrevista**: *"¿Por qué un service sin dependencias funciona sin `@Injectable()` pero uno con dependencias no?"* → TypeScript solo emite `design:paramtypes` para clases **que tienen algún decorador**. Sin `@Injectable()`, la clase no tiene decorador, no hay metadata y Nest no sabe qué pasarle al constructor (si no hay parámetros, no le hace falta). Además `@Injectable()` marca la clase para Nest. Regla: **pon siempre `@Injectable()`** en providers.

### 6.2 Cómo lee Nest su propia metadata

Los decoradores de Nest no hacen nada más que guardar metadata con claves internas. Puedes comprobarlo:

```ts
import 'reflect-metadata';
import { ProductosController } from './productos/productos.controller';

console.log(Reflect.getMetadata('path', ProductosController));            // 'productos'
console.log(Reflect.getMetadata('design:paramtypes', ProductosController)); // [ [class ProductosService] ]
console.log(
  Reflect.getMetadata('path', ProductosController.prototype.findOne),     // ':id'
);
```

> ⚠️ Las claves internas (`'path'`, `'method'`, `'__injectable__'`...) son **detalles de implementación** de Nest y pueden cambiar. Úsalas para aprender, no en código de producción. Para metadata propia usa las APIs públicas (sección 9).

---

## 7. Construyendo un mini contenedor de DI

Para que la DI deje de ser magia, implementemos la idea central de Nest en unas 40 líneas:

```ts
// mini-di.ts
import 'reflect-metadata';

type Ctor<T = unknown> = new (...args: any[]) => T;

const INYECTABLE = Symbol('inyectable');

// Decorador que marca la clase (y fuerza a TS a emitir design:paramtypes)
export function Inyectable(): ClassDecorator {
  return (target) => Reflect.defineMetadata(INYECTABLE, true, target);
}

export class Contenedor {
  private readonly instancias = new Map<Ctor, unknown>(); // singletons

  resolver<T>(clase: Ctor<T>, pila: Ctor[] = []): T {
    // 1. ¿Ya existe? → singleton
    if (this.instancias.has(clase)) return this.instancias.get(clase) as T;

    if (!Reflect.getMetadata(INYECTABLE, clase)) {
      throw new Error(`${clase.name} no está marcado con @Inyectable()`);
    }
    if (pila.includes(clase)) {
      throw new Error(`Dependencia circular: ${[...pila, clase].map((c) => c.name).join(' → ')}`);
    }

    // 2. Leer los tipos del constructor que emitió el compilador
    const deps: (Ctor | undefined)[] = Reflect.getMetadata('design:paramtypes', clase) ?? [];

    // 3. Resolver cada dependencia recursivamente (primero las hojas del grafo)
    const args = deps.map((dep, i) => {
      if (!dep || dep === Object) {
        // undefined → import circular; Object → interfaz/union: el tipo no existe en runtime
        throw new Error(`No puedo resolver el parámetro #${i} de ${clase.name}`);
      }
      return this.resolver(dep, [...pila, clase]);
    });

    // 4. Instanciar y cachear
    const instancia = new clase(...args);
    this.instancias.set(clase, instancia);
    return instancia;
  }
}
```

```ts
// uso.ts
import { Contenedor, Inyectable } from './mini-di';

@Inyectable()
class ProductosRepository {
  private datos = [{ id: 1, nombre: 'Teclado' }];
  todos() { return this.datos; }
}

@Inyectable()
class ProductosService {
  constructor(private readonly repo: ProductosRepository) {}
  listar() { return this.repo.todos(); }
}

@Inyectable()
class ProductosController {
  constructor(private readonly service: ProductosService) {}
  get() { return this.service.listar(); }
}

const c = new Contenedor();
const ctrl = c.resolver(ProductosController); // construye Repository → Service → Controller
console.log(ctrl.get());                       // [ { id: 1, nombre: 'Teclado' } ]
console.log(c.resolver(ProductosService) === c.resolver(ProductosService)); // true (singleton)
```

El injector real de Nest hace esto mismo, más: tokens que no son clases (`@Inject`), módulos con encapsulación (Sesión 3), scopes (Sesión 23), factories asíncronas, `forwardRef` y lifecycle hooks. Lo abrimos en la Sesión 35.

> ⚠️ Para ejecutar este ejemplo usa `tsc` o `ts-node`. **`tsx`, esbuild y Vite no emiten `design:paramtypes`** (esbuild no implementa `emitDecoratorMetadata`), así que `deps` llegará vacío. SWC sí lo soporta (`decoratorMetadata: true`), y por eso Nest puede usar SWC (Sesión 1).

---

## 8. Los límites de la metadata de tipos

Lo que el compilador puede emitir depende de si el tipo **existe como valor**:

| Tipo declarado | `design:paramtypes` emite | ¿Nest puede inyectarlo por tipo? |
|---|---|---|
| `ProductosService` (clase) | `ProductosService` | ✅ |
| `NotificadorService` (clase abstracta) | `NotificadorService` | ✅ |
| `INotificador` (interfaz) | `Object` | ❌ → `@Inject(TOKEN)` |
| `A \| B` (unión) | `Object` | ❌ |
| `string`, `number` | `String`, `Number` | ❌ (no son providers) → `@Inject('TOKEN')` |
| `Repository<Producto>` (genérico) | `Repository` (se pierde `<Producto>`) | ❌ → `@InjectRepository(Producto)` (Sesión 14) |
| Clase de un import circular | `undefined` | ❌ → `forwardRef` (Sesión 23) |

Por eso existen `@InjectRepository(Producto)`, `@InjectModel(Producto.name)` o `@Inject(CACHE_MANAGER)`: son la forma de decirle a Nest el token cuando el tipo solo no alcanza.

```ts
@Injectable()
export class ProductosService {
  constructor(
    // Repository<Producto> se emite como "Repository": no dice DE QUÉ entidad.
    // El decorador agrega el token correcto.
    @InjectRepository(Producto) private readonly repo: Repository<Producto>,
  ) {}
}
```

### 8.1 Imports de solo tipo e `isolatedModules`

La plantilla de Nest 11 activa `isolatedModules`. Si importas **solo como tipo** algo usado en un constructor decorado, el import se elimina y la metadata queda vacía:

```ts
import type { ProductosService } from './productos.service'; // ❌ import de solo tipo

@Injectable()
export class OrdenesService {
  constructor(private readonly productos: ProductosService) {} // metadata: undefined / error
}
```

- Con una **clase**, usa un import normal (`import { ProductosService }`). Linters con la regla `consistent-type-imports` a veces lo "arreglan" automáticamente a `import type` y rompen la DI: configúrala para respetar decoradores.
- Con una **interfaz** en una firma decorada, TypeScript con `isolatedModules` + `emitDecoratorMetadata` exige `import type` (error TS1272), y tú aportas el token con `@Inject(...)`.

> ❓ **Entrevista**: *"Inyecto `Repository<Producto>` y `Repository<Categoria>` en el mismo service sin decoradores extra, ¿qué pasa?"* → Ambos se emiten como `Repository`; Nest no puede distinguirlos ni sabe qué entidad es. Por eso `@InjectRepository(Entidad)` genera un token distinto por entidad.

---

## 9. Metadata propia con las APIs de Nest

No necesitas `Reflect.defineMetadata` a mano: Nest trae helpers que usarás en guards e interceptors (Sesiones 11–13).

```ts
import { SetMetadata, applyDecorators, UseGuards, HttpCode } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// 1) SetMetadata: forma clásica
export const ES_PUBLICO = 'esPublico';
export const Publico = () => SetMetadata(ES_PUBLICO, true);

// 2) Reflector.createDecorator (Nest ≥10.2): decorador tipado sin claves string
export const Roles = Reflector.createDecorator<string[]>();
// uso: @Roles(['admin'])
// lectura en un guard: this.reflector.get(Roles, context.getHandler()) → string[]

// 3) applyDecorators: componer varios decoradores en uno
export function SoloAdmin() {
  return applyDecorators(
    Roles(['admin']),
    UseGuards(RolesGuard), // RolesGuard lo escribimos en la Sesión 11
    HttpCode(200),
  );
}
```

---

## 10. Generics al servicio de Nest

Los generics **no existen en runtime** (sección 8), pero son la herramienta para no repetir código y mantener el tipado.

### 10.1 Tipos de respuesta reutilizables

```ts
// src/common/dto/paginado.ts
export interface Paginado<T> {
  items: T[];
  total: number;
  pagina: number;
  tamanoPagina: number;
}

export function paginar<T>(todos: T[], pagina = 1, tamanoPagina = 20): Paginado<T> {
  const inicio = (pagina - 1) * tamanoPagina;
  return {
    items: todos.slice(inicio, inicio + tamanoPagina),
    total: todos.length,
    pagina,
    tamanoPagina,
  };
}

// En el service: el tipo de retorno se infiere como Paginado<Producto>
listar(pagina: number) {
  return paginar([...this.productos.values()], pagina);
}
```

### 10.2 Base class genérica con restricciones

```ts
// src/common/repositorio-memoria.ts
export interface ConId { id: number }

// T debe tener un id numérico: la restricción "extends ConId" lo garantiza
export abstract class RepositorioEnMemoria<T extends ConId> {
  protected readonly datos = new Map<number, T>();
  private siguienteId = 1;

  crear(datos: Omit<T, 'id'>): T {
    const entidad = { ...datos, id: this.siguienteId++ } as T;
    this.datos.set(entidad.id, entidad);
    return entidad;
  }

  buscarPorId(id: number): T | undefined {
    return this.datos.get(id);
  }

  todos(): T[] {
    return [...this.datos.values()];
  }
}

@Injectable()
export class ProductosRepository extends RepositorioEnMemoria<Producto> {
  // métodos específicos del dominio
  conStockBajo(umbral = 5): Producto[] {
    return this.todos().filter((p) => p.stock < umbral);
  }
}
```

> ⚠️ Una clase genérica **no puede ser provider directamente** por su parámetro de tipo: `RepositorioEnMemoria<Producto>` y `RepositorioEnMemoria<Categoria>` son el mismo token en runtime. Crea una **subclase concreta** por entidad (como arriba) o usa tokens explícitos.

### 10.3 `Type<T>` y mixins: clases que crean clases

Nest exporta `Type<T>` (un constructor que produce `T`). Con él se escriben **funciones que devuelven clases**, como `PartialType` de `@nestjs/mapped-types` (Sesión 6) o `AuthGuard('jwt')` de Passport (Sesión 18).

```ts
import { Type } from '@nestjs/common';

// Mixin: agrega timestamps a cualquier clase
export function ConTimestamps<TBase extends Type<object>>(Base: TBase) {
  return class extends Base {
    creadoEn = new Date();
    actualizadoEn = new Date();
  };
}

class ProductoBase { nombre!: string; }
export class ProductoAuditado extends ConTimestamps(ProductoBase) {}

const p = new ProductoAuditado();
p.creadoEn;  // Date  ✅ tipado
p.nombre;    // string ✅
```

### 10.4 Generics en APIs de Nest que usarás

| API | Generic | Sesión |
|---|---|---|
| `NestFactory.create<NestExpressApplication>()` | Tipo de la app según plataforma | 1 |
| `ConfigService<EnvVars, true>` | Tipado de variables de entorno | 7 |
| `PipeTransform<T, R>` | Entrada y salida del pipe | 10 |
| `CallHandler<T>` / `Observable<T>` | Respuesta en interceptors | 12 |
| `Repository<T>` (TypeORM), `Model<T>` (Mongoose) | Entidad | 14, 16 |
| `Reflector.createDecorator<T>()` | Tipo de la metadata | 11 |

---

## 11. Otros detalles de TypeScript que pagan en Nest

| Feature | Para qué en Nest |
|---|---|
| `strict: true` (`nest new --strict`) | Detectar `undefined` que en runtime serían 500 |
| **Uniones de string** vs `enum` | Las uniones no generan código; los `enum` sí existen en runtime y **Swagger/class-validator los pueden leer** (`@IsEnum(EstadoOrden)`). En DTOs, `enum` suele ser más práctico |
| `satisfies` | Validar objetos de configuración sin perder el tipo literal |
| `as const` | Arrays de roles o estados como tipos literales |
| `unknown` en vez de `any` | En filtros de excepciones (`catch (exception: unknown)`, Sesión 9) |

```ts
// Enum real: existe en runtime → sirve para validación y documentación
export enum EstadoOrden {
  Pendiente = 'pendiente',
  Pagada = 'pagada',
  Enviada = 'enviada',
  Cancelada = 'cancelada',
}

// Union + as const: solo tipos, cero runtime (salvo el array que tú declaras)
export const ROLES = ['cliente', 'admin'] as const;
export type Rol = (typeof ROLES)[number]; // 'cliente' | 'admin'
```

> ⚠️ Evita los `const enum` en código compartido: con `isolatedModules` (activo en la plantilla de Nest 11) no se pueden usar entre archivos de la misma forma, y no existen en runtime para validarlos.

---

## Resumen mental de la sesión

```
Tipos se BORRAN al compilar → Nest necesita metadata para saber qué inyectar

Decorador = función ejecutada UNA vez al definir la clase
  factory @Algo(args) → devuelve el decorador. En Nest: siempre con ()
  tipos: clase · método · propiedad · parámetro · accessor
  orden: factories ↓ (arriba→abajo), aplicación ↑ (abajo→arriba)
         parámetros → método → ... → params del constructor → CLASE al final

Nest = decoradores LEGACY (experimentalDecorators). TC39 no tiene params ni metadata

emitDecoratorMetadata (solo en clases CON decorador):
  design:paramtypes  (constructor → tokens de DI)
  design:type / design:returntype
reflect-metadata: defineMetadata / getMetadata (hereda) / getOwnMetadata

Límites: interfaz/unión → Object · genérico → pierde <T> · import circular → undefined
         import type → sin metadata · esbuild/tsx no emiten metadata
  → @Inject(TOKEN), @InjectRepository(E), forwardRef()

Metadata propia: SetMetadata · Reflector.createDecorator<T>() · applyDecorators
Generics: Paginado<T>, base classes <T extends ConId>, Type<T> + mixins
DTOs = CLASES (no interfaces)
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Cómo sabe Nest qué inyectar en un constructor si TypeScript borra los tipos?
2. ❓ ¿Qué es un decorador? ¿Cuándo se ejecuta? ¿Qué es una decorator factory?
3. ❓ Enumera los tipos de decoradores y da un ejemplo de Nest para cada uno.
4. ❓ ¿En qué orden se evalúan y aplican los decoradores de una clase con métodos y parámetros?
5. ❓ ¿Por qué Nest usa decoradores legacy y no los estándar de TC39?
6. ❓ ¿Qué claves emite `emitDecoratorMetadata` y en qué condiciones?
7. ❓ ¿Por qué un provider con dependencias necesita `@Injectable()`?
8. ❓ ¿Qué emite el compilador si el parámetro es una interfaz? ¿Y un genérico? ¿Y un import circular?
9. ❓ ¿Por qué existe `@InjectRepository(Producto)` si ya escribo `Repository<Producto>`?
10. ❓ ¿Por qué un `import type` puede romper la DI? ¿Qué herramientas no emiten metadata?
11. ❓ ¿Por qué los DTOs deben ser clases y no interfaces?
12. ❓ ¿Qué riesgo tiene un decorador de método que reemplaza `descriptor.value` sobre un handler de Nest?

## Ejercicio práctico
1. Crea una carpeta `playground/` fuera de `src/`, instala `typescript`, `ts-node` y `reflect-metadata`, y un `tsconfig.json` con `experimentalDecorators` y `emitDecoratorMetadata`.
2. Copia el ejemplo de orden de evaluación (sección 4). **Antes de ejecutarlo**, escribe en papel el orden esperado; luego compáralo con la salida.
3. Compila `uso.ts` con `npx tsc` y abre el `.js` generado: localiza `__metadata("design:paramtypes", ...)`.
4. Implementa el **mini contenedor de DI** (sección 7) y verifica que resuelve Repository → Service → Controller como singletons.
5. Rompe el contenedor a propósito: (a) quita `@Inyectable()` del repositorio; (b) cambia el tipo del parámetro a una interfaz; (c) crea una dependencia circular A → B → A. Lee el error en cada caso.
6. Ejecuta `uso.ts` con `npx tsx` en lugar de `ts-node` y explica por qué falla.
7. Extiende el contenedor con `registrarValor(token: symbol, valor: unknown)` y un decorador de parámetro `@InyectarToken(token)` que guarde el token por índice. Es exactamente lo que hace `@Inject()` de Nest.
8. En TiendaApi, crea `RepositorioEnMemoria<T extends ConId>` (sección 10.2) y úsalo en `ProductosRepository`. Haz que `ProductosService` lo inyecte.
9. Crea `src/common/dto/paginado.ts` con `Paginado<T>` y `paginar()`, y úsalo en `findAll` de productos.
10. Crea un decorador `@Publico()` con `Reflector.createDecorator<boolean>()` y, desde `main.ts`, imprime su metadata con `Reflect.getMetadataKeys` sobre un handler decorado (solo para explorar; lo usaremos de verdad en la Sesión 11).

---

➡️ **Cuando termines**, marca la Sesión 2 en el [README](README.md) y pasa a la **Sesión 3 — Módulos: imports, exports, providers, módulos globales y compartidos**.

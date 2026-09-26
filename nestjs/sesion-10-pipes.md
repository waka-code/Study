# Sesión 10 — Pipes: built-in, custom, transformación y validación

> **Objetivo de la sesión**: entender qué es un pipe, *dónde* corre en el ciclo de vida y *por qué* Nest separa la preparación de argumentos de la lógica del handler. Al terminar deberías poder usar los pipes integrados (`ParseIntPipe`, `ParseUUIDPipe`, `ParseEnumPipe`, `ParseArrayPipe`, `DefaultValuePipe`, `ParseDatePipe`...), configurar sus opciones, escribir pipes propios de **transformación** y de **validación** (incluido un `ZodValidationPipe`), aplicar pipes a nivel de parámetro, método, controller y global (y saber la diferencia entre `useGlobalPipes` y `APP_PIPE`), entender `ArgumentMetadata` y reconocer los antipatrones más comunes, como hacer consultas pesadas a la base de datos dentro de un pipe.

---

## 1. Qué es un pipe y por qué existe

Un **pipe** es una clase con un método `transform(value, metadata)` que Nest ejecuta **sobre cada argumento** del handler justo antes de invocarlo. Tiene dos usos:

| Uso | Qué hace | Ejemplo |
|---|---|---|
| **Transformación** | Convierte el valor de entrada a la forma deseada | `"42"` → `42` |
| **Validación** | Deja pasar el valor sin cambios o lanza una excepción | body inválido → `400` |

```
                                               ┌── pipe(@Param('id'))  "42" → 42
Request ─▶ Middleware ─▶ Guards ─▶ Interceptors ┼── pipe(@Query())      {...} → QueryDto
                                               └── pipe(@Body())       {...} → CrearOrdenDto (validado)
                                                           │
                                             todos OK ─────┴──▶ handler(42, queryDto, dto)
                                             alguno lanza ─────▶ Exception filter (Sesión 9) → 400
```

¿Por qué no hacerlo en el handler? Porque el handler debería recibir **datos ya confiables y tipados**. Si cada handler hace `parseInt`, verifica `NaN` y lanza `BadRequestException`, repites código y mezclas "¿los datos son válidos?" con "¿qué hago con ellos?". El pipe es un **punto único y declarativo** para esa responsabilidad.

Los pipes corren **dentro de la zona de excepciones**: cualquier excepción que lancen la procesan los exception filters de la Sesión 9, y el handler **nunca** se ejecuta.

> ❓ **Entrevista**: *"¿Cuáles son los dos usos de un pipe?"* → **Transformación** (convertir el valor a otro tipo/forma, p. ej. string a número) y **validación** (comprobar el valor y lanzar una excepción si es inválido). Se ejecutan justo antes del handler, sobre cada argumento, y si lanzan, el handler no se ejecuta.

---

## 2. Los pipes integrados

Todos se importan desde `@nestjs/common`:

| Pipe | Convierte / valida | Error por defecto |
|---|---|---|
| `ValidationPipe` | DTO con class-validator (Sesión 6) | 400 |
| `ParseIntPipe` | string → entero | 400 `Validation failed (numeric string is expected)` |
| `ParseFloatPipe` | string → número decimal | 400 |
| `ParseBoolPipe` | `'true'`/`'false'` → boolean | 400 |
| `ParseArrayPipe` | string separado o array → array (opcionalmente validando ítems) | 400 |
| `ParseUUIDPipe` | valida UUID (versión configurable) | 400 |
| `ParseEnumPipe` | valida que el valor pertenezca a un enum | 400 |
| `DefaultValuePipe` | si el valor es `null`/`undefined`, usa un default | — |
| `ParseFilePipe` | valida archivos subidos (tamaño, tipo) | 400 — Sesión 26 |
| `ParseDatePipe` | string → `Date` (**nuevo en Nest 11**) | 400 |

### 2.1 Uso básico

```typescript
import {
  Controller, DefaultValuePipe, Get, Param, ParseBoolPipe, ParseEnumPipe,
  ParseIntPipe, ParseUUIDPipe, Query,
} from '@nestjs/common';

export enum OrdenEstado {
  PENDIENTE = 'pendiente',
  PAGADA = 'pagada',
  ENVIADA = 'enviada',
}

@Controller('ordenes')
export class OrdenesController {
  // GET /ordenes/3f0c...-uuid
  @Get(':id')
  buscar(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.ordenes.buscar(id);
  }

  // GET /ordenes?estado=pagada&page=2&soloMias=true
  @Get()
  listar(
    @Query('estado', new ParseEnumPipe(OrdenEstado, { optional: true })) estado?: OrdenEstado,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,        // encadenados: se ejecutan en orden
    @Query('soloMias', new DefaultValuePipe(false), ParseBoolPipe) soloMias = false,
  ) {
    return this.ordenes.listar({ estado, page, soloMias });
  }
}
```

Dos formas de pasar un pipe:

```typescript
@Param('id', ParseIntPipe)                 // CLASE: Nest instancia (y puede reutilizar) con DI
@Param('id', new ParseIntPipe({ ... }))    // INSTANCIA: cuando necesitas pasar opciones
```

> ⚠️ **El orden en la cadena importa.** `@Query('page', ParseIntPipe, new DefaultValuePipe(1))` falla si `page` no viene: `ParseIntPipe` recibe `undefined` y lanza 400 **antes** de que el default actúe. El default va **primero**.

### 2.2 Opciones comunes

```typescript
// Status distinto y mensaje propio
new ParseIntPipe({
  errorHttpStatusCode: HttpStatus.NOT_ACCEPTABLE,
  exceptionFactory: (error) => new BadRequestException(`El id debe ser numérico: ${error}`),
});

// Parámetro opcional: si es undefined/null, lo deja pasar sin validar
new ParseIntPipe({ optional: true });

// Arrays desde query string: ?ids=1,2,3 → [1, 2, 3]
@Query('ids', new ParseArrayPipe({ items: Number, separator: ',' })) ids: number[]

// Arrays de DTOs en el body raíz (Sesión 6, sección 7.1)
@Body(new ParseArrayPipe({ items: CrearProductoDto, whitelist: true })) dtos: CrearProductoDto[]
```

> ⚠️ `ParseBoolPipe` solo acepta `'true'`/`'false'` (y booleanos): `?activo=1` o `?activo=yes` → 400. Documenta el contrato o escribe tu propio pipe si necesitas aceptar más variantes.

> ❓ **Entrevista**: *"¿Por qué usar `ParseIntPipe` si `transform: true` ya convierte `@Param('id') id: number`?"* → Porque la conversión implícita no valida: `/productos/abc` produce `NaN` y el handler se ejecuta con un valor basura. `ParseIntPipe` rechaza con 400 de forma explícita. Además, es visible en la firma: quien lee el handler sabe exactamente qué se acepta.

---

## 3. `PipeTransform` y `ArgumentMetadata`

Un pipe implementa la interface `PipeTransform<T, R>`:

```typescript
import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class DebugPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    console.log({ value, ...metadata });
    return value;                          // lo que devuelves es lo que recibe el handler
  }
}
```

`ArgumentMetadata` describe el argumento que se está procesando:

| Propiedad | Valores | Ejemplo |
|---|---|---|
| `type` | `'body'` · `'query'` · `'param'` · `'custom'` | `@Body()` → `'body'`; decorador propio → `'custom'` |
| `metatype` | El constructor del tipo declarado (vía `emitDecoratorMetadata`) | `CrearOrdenDto`, `Number`, `String`, `Object`... |
| `data` | El string pasado al decorador | `@Param('id')` → `'id'`; `@Body()` → `undefined` |

Para `@Get(':id') buscar(@Param('id', DebugPipe) id: number)` y la URL `/productos/42`:

```
{ value: '42', type: 'param', metatype: [Function: Number], data: 'id' }
```

Así funciona el `ValidationPipe` por dentro: lee `metatype`, y si es una clase "validable" (no `String`, `Number`, `Boolean`, `Array`, `Object`) hace `plainToInstance(metatype, value)` + `validate()`. Por eso las interfaces no se validan (Sesión 6): su metatipo es `Object`.

> ⚠️ `metatype` es `undefined` si no hay anotación de tipo, si usas un tipo que no existe en runtime (interface, union `string | number`, genérico), o si el código se compila sin `emitDecoratorMetadata` (p. ej. algunos setups con **esbuild/SWC** mal configurados). SWC, usado por `nest start -b swc`, sí soporta decorator metadata si está configurado (Sesión 33).

---

## 4. Pipes propios de transformación

### 4.1 Normalizar un slug

```typescript
// src/common/pipes/slug.pipe.ts
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class SlugPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || value.length === 0) {
      throw new BadRequestException('Slug requerido');
    }
    const slug = value
      .normalize('NFD').replace(/[̀-ͯ]/g, '')   // quita tildes: "Televisión" → "Television"
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    if (slug.length < 2 || slug.length > 80) throw new BadRequestException('Slug inválido');
    return slug;
  }
}

// GET /categorias/Televisión%20y%20Audio → slug "television-y-audio"
@Get(':slug')
porSlug(@Param('slug', SlugPipe) slug: string) {}
```

### 4.2 Parsear un sort de la query

```typescript
// ?sort=-precio,nombre → [{ campo: 'precio', dir: 'DESC' }, { campo: 'nombre', dir: 'ASC' }]
export interface Orden { campo: string; dir: 'ASC' | 'DESC' }

@Injectable()
export class ParseSortPipe implements PipeTransform<string | undefined, Orden[]> {
  constructor(private readonly permitidos: readonly string[]) {}   // whitelist: evita ordenar por columnas internas

  transform(value: string | undefined): Orden[] {
    if (!value) return [];
    return value.split(',').map((parte) => {
      const dir = parte.startsWith('-') ? 'DESC' : 'ASC';
      const campo = parte.replace(/^[-+]/, '');
      if (!this.permitidos.includes(campo)) {
        throw new BadRequestException(`No se puede ordenar por "${campo}"`);
      }
      return { campo, dir };
    });
  }
}

@Get()
listar(@Query('sort', new ParseSortPipe(['precio', 'nombre', 'creadoEn'])) sort: Orden[]) {}
```

> 💡 La whitelist no es cosmética: si pasas `campo` directo a un `ORDER BY` de un QueryBuilder, un atacante podría ordenar por `passwordHash` e inferir datos (o peor, inyectar SQL si concatenas strings). Sesión 14 y 20.

---

## 5. Pipes propios de validación: `ZodValidationPipe`

El `ValidationPipe` es un pipe como cualquier otro. Para demostrarlo, construyamos uno con **Zod**:

```bash
npm i zod
```

```typescript
// src/common/pipes/zod-validation.pipe.ts
import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodType } from 'zod';

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const resultado = this.schema.safeParse(value);
    if (!resultado.success) {
      throw new BadRequestException({
        message: 'La request tiene campos inválidos',
        errors: resultado.error.issues.map((i) => ({
          campo: i.path.join('.'),       // "items.0.cantidad"
          mensaje: i.message,
        })),
      });
    }
    return resultado.data;               // datos PARSEADOS: coerciones y defaults aplicados, props extra eliminadas
  }
}
```

```typescript
// src/ordenes/schemas/crear-orden.schema.ts
import { z } from 'zod';

export const crearOrdenSchema = z.object({
  items: z.array(z.object({
    productoId: z.number().int().positive(),
    cantidad: z.number().int().min(1).max(50),
  })).min(1).max(100),
  metodoPago: z.enum(['tarjeta', 'transferencia']),
  cupon: z.string().trim().toUpperCase().optional(),
});

export type CrearOrdenInput = z.infer<typeof crearOrdenSchema>;   // tipo derivado del schema
```

```typescript
@Post()
crear(@Body(new ZodValidationPipe(crearOrdenSchema)) dto: CrearOrdenInput) {
  return this.ordenes.crear(dto);
}
```

Fíjate en una diferencia con class-validator: aquí el pipe **no** depende de `metatype` (el schema viaja en el constructor), así que funciona con tipos puros de TypeScript. Por defecto, `z.object()` **elimina** las propiedades desconocidas (como `whitelist`); usa `.strict()` si quieres rechazarlas (como `forbidNonWhitelisted`).

> ⚠️ Si tienes un `ValidationPipe` **global** y además un `ZodValidationPipe` en el parámetro, **ambos** se ejecutan (primero el global). Con un tipo `CrearOrdenInput` (un `type`, no una clase), el metatipo es `Object` y el `ValidationPipe` lo deja pasar sin tocarlo, así que conviven. Pero si usas una clase, tendrás doble validación.

> 💡 En proyectos reales se usa `nestjs-zod`, que agrega `createZodDto` (clases a partir de schemas, compatibles con Swagger). Lo mencionamos en la Sesión 21.

---

## 6. Pipes con inyección de dependencias

Un pipe es un provider: puede inyectar servicios si lo pasas como **clase** (no como instancia).

```typescript
// Convierte un id en la entidad completa, o lanza 404
@Injectable()
export class ProductoPorIdPipe implements PipeTransform<number, Promise<Producto>> {
  constructor(private readonly productos: ProductosService) {}

  async transform(id: number): Promise<Producto> {       // los pipes pueden ser async
    const producto = await this.productos.buscar(id);
    if (!producto) throw new NotFoundException(`Producto ${id} no existe`);
    return producto;
  }
}

@Get(':id')
detalle(@Param('id', ParseIntPipe, ProductoPorIdPipe) producto: Producto) {
  return producto;   // el handler recibe la ENTIDAD, no el id
}
```

Es elegante, pero tiene un costo. Pondera antes de usarlo:

| A favor | En contra |
|---|---|
| Handlers cortos, 404 centralizado | Oculta una consulta a la BD en la firma del handler |
| Reutilizable | El service vuelve a consultar si necesita la entidad con otras relaciones o con lock (transacción, Sesión 17) |
| | Corre **antes** del handler pero **después** de los guards: si el guard de ownership (Sesión 19) necesita la entidad, la consulta se repite |

> ⚠️ Para que la DI funcione, el pipe debe poder resolver sus dependencias **en el módulo donde se usa** (el `ProductosService` debe estar en `providers` o exportado por un módulo importado). Si pasas `new ProductoPorIdPipe(...)` tú mismo, pierdes la DI.

---

## 7. Dónde aplicar pipes (binding)

```typescript
// 1) Parámetro: el más común para Parse*Pipe
@Param('id', ParseIntPipe) id: number

// 2) Método: aplica a TODOS los argumentos del handler
@Post()
@UsePipes(new ValidationPipe({ groups: ['crear'] }))
crear(@Body() dto: ProductoDto) {}

// 3) Controller: todos los handlers
@UsePipes(TrimStringsPipe)
@Controller('productos')
export class ProductosController {}

// 4a) Global en main.ts — sin DI
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

// 4b) Global como provider — con DI y presente en los tests e2e (recomendado)
import { APP_PIPE } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_PIPE,
      useFactory: () => new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    },
  ],
})
export class AppModule {}
```

| | `useGlobalPipes(new X())` | `APP_PIPE` |
|---|---|---|
| DI | ❌ | ✅ (`useClass` o `useFactory` con `inject`) |
| En `Test.createTestingModule({ imports: [AppModule] })` | ❌ hay que repetirlo | ✅ automático |
| Apps híbridas / microservicios | No aplica a gateways ni microservicios conectados, salvo `inheritAppConfig` | Aplica como enhancer global |

### 7.1 Orden de ejecución

```
1. Pipes globales
2. Pipes del controller   (@UsePipes en la clase)
3. Pipes del método       (@UsePipes en el handler)
4. Pipes del parámetro    (@Param('id', A, B) → A y luego B)
```

Cada nivel se aplica a **cada argumento**; la salida de un pipe es la entrada del siguiente. La documentación de Nest indica además que, en cuanto a los pipes de parámetro, se procesan **del último parámetro al primero**; no escribas lógica que dependa del orden entre parámetros distintos.

> ⚠️ Un pipe a nivel de método/controller/global se aplica también a los argumentos de **decoradores propios** (`type: 'custom'`)... excepto el `ValidationPipe`, que por defecto **ignora** los decoradores custom. Para validarlos: `new ValidationPipe({ validateCustomDecorators: true })` (Sesión 13).

> ❓ **Entrevista**: *"¿Por qué preferirías `APP_PIPE` a `app.useGlobalPipes()`?"* → Porque `APP_PIPE` registra el pipe como provider: puede inyectar dependencias y viene incluido cuando creas el módulo en tests e2e, así el comportamiento de validación de los tests es idéntico al de producción. `useGlobalPipes` se configura fuera del grafo de DI, en `main.ts`, y hay que repetirlo en el setup de tests.

---

## 8. Pipes sobre decoradores y objetos completos

Los pipes también se aplican a decoradores sin clave y a decoradores propios:

```typescript
@Query(new ZodValidationPipe(filtroSchema)) filtro: Filtro     // todo el objeto query
@Body('items', new ParseArrayPipe({ items: ItemOrdenDto })) items: ItemOrdenDto[]   // una propiedad del body
@UsuarioActual(new ValidationPipe({ validateCustomDecorators: true })) usuario: UsuarioDto  // Sesión 13
```

Un pipe **genérico** que opera según `metadata.type`:

```typescript
// Recorta espacios en todos los strings de body y query (antes del ValidationPipe)
@Injectable()
export class TrimStringsPipe implements PipeTransform {
  transform(value: unknown, { type }: ArgumentMetadata) {
    if (type !== 'body' && type !== 'query') return value;     // no toques params ni custom
    return this.recortar(value);
  }

  private recortar(v: unknown): unknown {
    if (typeof v === 'string') return v.trim();
    if (Array.isArray(v)) return v.map((x) => this.recortar(x));
    if (v !== null && typeof v === 'object') {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, this.recortar(x)]));
    }
    return v;
  }
}

// Global, en orden: primero recorta, luego valida
app.useGlobalPipes(new TrimStringsPipe(), new ValidationPipe({ whitelist: true, transform: true }));
```

> ⚠️ `TrimStringsPipe` no debería tocar campos como `password`: un espacio al final puede ser parte legítima de la contraseña. En ese caso, recorta por DTO con `@Transform` (Sesión 6) en lugar de globalmente.

---

## 9. Pipes vs guards vs interceptors vs validación en el service

| Pregunta | Herramienta |
|---|---|
| ¿El argumento tiene el formato/tipo correcto? | **Pipe** |
| ¿El usuario puede ejecutar este handler? | **Guard** (Sesión 11) |
| ¿Quiero transformar la **respuesta** o medir la ejecución? | **Interceptor** (Sesión 12) |
| ¿El stock alcanza? ¿La orden puede pasar de `pagada` a `enviada`? | **Dominio / service** (Sesión 30) |

Regla práctica: los pipes validan lo que se puede decidir **mirando solo el valor de entrada** (y, a lo sumo, una consulta simple de existencia). Lo que depende del **estado del sistema** o de reglas de negocio pertenece al dominio.

> ❓ **Entrevista**: *"¿Un pipe puede acceder al usuario autenticado o a la request?"* → No directamente: `transform` recibe solo el valor y `ArgumentMetadata`, no el `ExecutionContext`. Si necesitas el usuario, lo obtienes con un decorador de parámetro (Sesión 13) y el pipe procesa ese valor; o la lógica pertenece a un guard o interceptor, que sí tienen contexto. (Técnicamente podrías inyectar `REQUEST` en un pipe request-scoped, pero eso convierte en request-scoped toda la cadena y tiene costo, Sesión 23.)

---

## 10. Antipatrones y errores comunes

1. **Validar a mano en el handler** (`if (isNaN(+id)) throw ...`): usa `ParseIntPipe`.
2. **Olvidar `DefaultValuePipe` primero** en la cadena.
3. **Confiar en `transform: true` para params**: produce `NaN` sin error.
4. **Pipes con efectos secundarios** (escribir en la BD, enviar eventos): un pipe debe ser una función pura de su entrada; si la request falla después, el efecto ya ocurrió.
5. **Instanciar con `new` un pipe que necesita DI**: sus dependencias quedan `undefined`.
6. **Doble validación** con un `ValidationPipe` global y otro local con opciones distintas: el global corre primero y puede rechazar lo que el local habría aceptado (p. ej. por `forbidNonWhitelisted`).
7. **Pipes pesados en rutas calientes**: `ValidationPipe` con DTOs profundos cuesta CPU en cada request; en endpoints de altísimo tráfico, mide (Sesión 33).

```typescript
// ❌ Validación manual repetida
@Get(':id')
buscar(@Param('id') id: string) {
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) throw new BadRequestException('id inválido');
  return this.productos.buscar(n);
}

// ✅ Declarativo
@Get(':id')
buscar(@Param('id', ParseIntPipe) id: number) {
  return this.productos.buscar(id);
}
```

---

## Resumen mental de la sesión

```
Pipe = transform(value, metadata) sobre CADA argumento, justo antes del handler
  Transformación: "42" → 42      Validación: pasa igual o lanza (→ filter → 400)
  Corre en la zona de excepciones; si lanza, el handler NO se ejecuta

Built-in: ValidationPipe · ParseInt/Float/Bool/Array/UUID/Enum · DefaultValue · ParseFile
          · ParseDatePipe (nuevo en Nest 11)
  Opciones: errorHttpStatusCode · exceptionFactory · optional
  Cadena en orden: @Query('page', new DefaultValuePipe(1), ParseIntPipe)  ← default PRIMERO

ArgumentMetadata { type: body|query|param|custom, metatype, data }
  metatype viene de emitDecoratorMetadata → interfaces/unions = Object/undefined

Custom: @Injectable() implements PipeTransform<In, Out> (puede ser async)
  ZodValidationPipe(schema) → no depende de metatype; safeParse → data
  Con DI → pasa la CLASE, no new

Binding: parámetro · @UsePipes(método) · @UsePipes(controller) · useGlobalPipes · APP_PIPE
  Orden: global → controller → método → parámetro (A luego B)
  APP_PIPE > useGlobalPipes (DI + tests e2e)
  ValidationPipe ignora decoradores custom salvo validateCustomDecorators: true

Pipe = forma del INPUT · Guard = permiso · Interceptor = envolver/respuesta · Dominio = reglas de negocio
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué es un pipe y cuáles son sus dos usos?
2. ❓ ¿En qué punto del ciclo de vida corren los pipes y qué pasa si uno lanza una excepción?
3. ❓ Nombra seis pipes integrados. ¿Cuál agregó Nest 11?
4. ❓ ¿Por qué `@Query('page', ParseIntPipe, new DefaultValuePipe(1))` falla si no envían `page`?
5. ❓ ¿Qué contiene `ArgumentMetadata` y de dónde sale `metatype`?
6. ❓ ¿Por qué `ParseIntPipe` es mejor que depender de `transform: true` para params?
7. ❓ ¿Qué diferencia hay entre pasar `ParseIntPipe` y `new ParseIntPipe()`? ¿Cuándo necesitas cada una?
8. ❓ Implementa de memoria un `ZodValidationPipe`. ¿Por qué no necesita `metatype`?
9. ❓ `useGlobalPipes` vs `APP_PIPE`: ¿cuál usarías y por qué?
10. ❓ ¿En qué orden se ejecutan pipes globales, de controller, de método y de parámetro?
11. ❓ ¿Es buena idea un pipe que convierta un id en la entidad desde la BD? Pros y contras.
12. ❓ ¿Qué opción necesita el `ValidationPipe` para validar el resultado de un decorador propio?

## Ejercicio práctico
1. En TiendaApi, reemplaza toda conversión manual de ids por `ParseIntPipe` en productos y categorías. Si las órdenes usan UUID, aplica `ParseUUIDPipe({ version: '4' })`.
2. En `GET /ordenes` agrega `estado` con `ParseEnumPipe` (opcional), `page` con `DefaultValuePipe(1)` + `ParseIntPipe` y `soloMias` con `ParseBoolPipe`. Invierte el orden del default y observa el 400.
3. Personaliza el `ParseIntPipe` de `GET /productos/:id` con `exceptionFactory` para devolver un mensaje en español.
4. Crea `DebugPipe` y aplícalo a `@Param`, `@Query` y `@Body` de un mismo handler. Anota el `ArgumentMetadata` de cada uno. Cambia el tipo del body a una `interface` y observa el `metatype`.
5. Implementa `SlugPipe` para `GET /categorias/:slug` y `ParseSortPipe` con whitelist para `GET /productos?sort=-precio,nombre`.
6. Implementa `ZodValidationPipe` y úsalo en `POST /ordenes` con `crearOrdenSchema`. Compara el formato de errores con el del `ValidationPipe`.
7. Mueve el `ValidationPipe` global de `main.ts` a `APP_PIPE` con `useFactory` y verifica que un test e2e (aunque sea mínimo) lo respeta sin configurarlo de nuevo.
8. Implementa `ProductoPorIdPipe` con DI y úsalo en `GET /productos/:id`. Luego escribe en una nota por qué no lo usarías en `PATCH /productos/:id` dentro de una transacción.
9. Implementa `TrimStringsPipe` global antes del `ValidationPipe` y verifica que `"  TV  "` llega como `"TV"`. Excluye explícitamente las propiedades `password`.
10. (Opcional) Usa `ParseDatePipe` en `GET /ordenes?desde=2025-01-01` y prueba qué ocurre con una fecha inválida.

---

➡️ **Cuando termines**, marca la Sesión 10 en el [README](README.md) y pasa a la **Sesión 11 — Guards: autorización por request, ExecutionContext y Reflector**.

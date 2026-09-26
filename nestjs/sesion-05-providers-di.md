# Sesión 5 — Providers e Inyección de Dependencias (básico)

> **Objetivo de la sesión**: entender la **inversión de control** y la **inyección de dependencias** como herramientas de diseño, no solo como sintaxis. Al terminar deberías poder explicar qué es un provider (y que no tiene por qué ser una clase), cómo resuelve Nest un **token** hasta llegar a una instancia, qué significa que los providers sean **singletons**, usar tokens de clase, string y `Symbol` con `@Inject`, registrar providers con `useClass`, `useValue`, `useFactory` y `useExisting` a nivel introductorio, programar contra **abstracciones** (clase abstracta o interfaz + token), usar `@Optional()`, evitar los errores clásicos (estado por request en un singleton, `new` manual, lógica asíncrona en constructores) y aprovechar la DI para **testear** `OrdenesService` de TiendaApi sin tocar nada real.

---

## 1. El problema: acoplamiento por `new`

```ts
// ❌ Sin DI: OrdenesService construye sus propias dependencias
export class OrdenesService {
  private readonly productos = new ProductosService(new ProductosRepository());
  private readonly pagos = new StripePagosClient(process.env.STRIPE_KEY!);

  crear(productoId: number, cantidad: number) {
    const producto = this.productos.findOne(productoId);
    const total = producto.precio * cantidad;
    this.pagos.cobrar(total);                 // ¿cómo testeo esto sin cobrar de verdad?
    return { productoId, cantidad, total, fecha: new Date() }; // ¿y la fecha?
  }
}
```

Problemas:

| Problema | Consecuencia |
|---|---|
| Conoce **cómo construir** cada dependencia | Si `ProductosService` pide un parámetro nuevo, hay que cambiar todos los `new` |
| Elige la **implementación concreta** (Stripe) | Cambiar de proveedor de pagos obliga a tocar la lógica de órdenes |
| Cada `new` crea **otra instancia** | Otro `Map` en memoria, otro pool de conexiones: estado inconsistente (Sesión 3) |
| **No se puede testear** en aislamiento | Un test unitario llamaría a Stripe y dependería del reloj real |

### 1.1 Inversión de control e inyección de dependencias

- **Inversión de control (IoC)**: tu clase ya no controla la creación de sus colaboradores; ese control pasa a un **contenedor**. "No nos llames, nosotros te llamamos" (principio de Hollywood).
- **Inyección de dependencias (DI)**: la técnica concreta de IoC en la que las dependencias se **entregan desde afuera**, normalmente por el constructor.
- **Principio de inversión de dependencias (la "D" de SOLID)**: los módulos de alto nivel (órdenes) dependen de **abstracciones** (un "cobrador de pagos"), no de detalles (Stripe).

```ts
// ✅ Con DI: OrdenesService DECLARA lo que necesita; el contenedor se lo entrega
@Injectable()
export class OrdenesService {
  constructor(
    private readonly productos: ProductosService,
    private readonly pagos: PagosService,   // abstracción (sección 6)
    private readonly reloj: RelojService,   // hasta la hora es una dependencia
  ) {}
}
```

```
      Sin DI                                  Con DI

  OrdenesService                          Contenedor de Nest
     │ new                                  │ construye y conecta
     ├──▶ ProductosService                  ├──▶ ProductosService ──┐
     │      └─ new ─▶ Repository            ├──▶ StripePagosService ├──▶ OrdenesService
     └──▶ StripePagosClient                 └──▶ RelojService ──────┘
  (OrdenesService sabe TODO)            (OrdenesService solo conoce contratos)
```

> ❓ **Entrevista**: *"¿Qué diferencia hay entre IoC, DI y el principio de inversión de dependencias?"* → IoC es el principio general (el framework controla el flujo y la creación de objetos). DI es una forma concreta de lograrlo: las dependencias se pasan desde afuera. El principio de inversión de dependencias (DIP) es una regla de diseño: depender de abstracciones y no de implementaciones. Puedes usar DI y violar DIP (inyectar siempre clases concretas); el máximo beneficio aparece al combinarlos.

---

## 2. Qué es un provider

En Nest, un **provider** es cualquier cosa que el contenedor sabe **entregar** a partir de un **token**. Casi siempre es una clase `@Injectable()`, pero también puede ser un valor, el resultado de una función o un alias.

```ts
@Module({
  providers: [ProductosService], // forma corta
})
export class ProductosModule {}
```

La forma corta es azúcar para:

```ts
providers: [
  {
    provide: ProductosService,   // TOKEN: con qué se pide
    useClass: ProductosService,  // RECETA: cómo se construye
  },
],
```

Todo provider es un par **token → receta**:

| Receta | Qué entrega | Ejemplo típico |
|---|---|---|
| `useClass` | Una instancia de la clase (con sus dependencias resueltas) | Implementación de una abstracción |
| `useValue` | El valor tal cual (objeto, número, mock) | Configuración constante, mocks en tests |
| `useFactory` | Lo que devuelva la función (puede ser `async`) | Conexiones, clientes configurados |
| `useExisting` | Otro provider ya registrado (alias) | Exponer un service con dos tokens |

Aquí los vemos de forma introductoria; la Sesión 23 profundiza (factories asíncronas, scopes, tokens dinámicos).

### 2.1 `@Injectable()`

```ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class RelojService {
  ahora(): Date {
    return new Date();
  }
}
```

`@Injectable()` hace dos cosas (Sesión 2): marca la clase como gestionable por Nest y, al ser un decorador, obliga a TypeScript a emitir `design:paramtypes` con los tipos de su constructor. Sin él, una clase con dependencias no se puede resolver.

---

## 3. Cómo resuelve Nest una dependencia

Cuando el injector construye `OrdenesService`:

```
1. Lee design:paramtypes de OrdenesService
      → [ProductosService, PagosService, RelojService]
   (si un parámetro tiene @Inject(TOKEN), usa ese token en su lugar)

2. Para cada token busca un provider, en este orden:
      a) providers del propio módulo (OrdenesModule)
      b) exports de los módulos importados
      c) exports de módulos @Global()
      → si no lo encuentra: "Nest can't resolve dependencies of the OrdenesService (?, ...)"

3. Si el provider aún no tiene instancia, lo construye primero (recursivo, hojas primero)

4. Llama a new OrdenesService(productos, pagos, reloj) y GUARDA la instancia
```

### 3.1 Singletons por defecto

Por defecto cada provider tiene scope **DEFAULT**: una instancia por módulo que lo declara, **compartida** por toda la aplicación y creada **al arrancar**.

| Scope | Instancias | Cuándo | Costo |
|---|---|---|---|
| `DEFAULT` (singleton) | Una para toda la app | Casi siempre | Ninguno |
| `REQUEST` | Una **por cada request** HTTP | Multi-tenant por request, datos de contexto | Alto: se "contagia" a quien lo inyecta |
| `TRANSIENT` | Una **por cada consumidor** que lo inyecta | Helpers con estado propio (ej. logger con contexto) | Medio |

```ts
@Injectable({ scope: Scope.REQUEST }) // vista previa: lo estudiamos en la Sesión 23
export class ContextoTenantService {}
```

> ⚠️ Un provider `REQUEST` hace que **todos** los que lo inyectan (y los que inyectan a esos) también pasen a ser por-request. Un solo `REQUEST` en un service base puede convertir media aplicación en objetos creados en cada request. No lo uses "por si acaso".

### 3.2 El error clásico: estado de la request en un singleton

```ts
// ❌ MAL: un singleton guardando datos de UNA request
@Injectable()
export class CarritoService {
  private usuarioActual?: Usuario; // compartido por TODAS las requests concurrentes

  iniciar(usuario: Usuario) {
    this.usuarioActual = usuario;
  }

  async agregar(productoId: number) {
    await this.algoAsincrono();            // mientras espera, llega otra request...
    return { usuario: this.usuarioActual }; // ...y ahora este campo es OTRO usuario
  }
}
```

Node atiende muchas requests concurrentes en un solo hilo: entre dos `await`, otra request puede sobrescribir el campo. Resultado: datos de un usuario mostrados a otro, un bug de **seguridad** difícil de reproducir.

✅ Pasa los datos de la request **como parámetros** (`agregar(usuario, productoId)`). Si de verdad necesitas contexto implícito, usa `AsyncLocalStorage` (por ejemplo con `nestjs-cls`) o un provider `REQUEST`, sabiendo su costo (Sesión 23).

> ❓ **Entrevista**: *"¿Es seguro guardar estado en un service de Nest?"* → Depende del estado. Estado **de la aplicación** (caché en memoria, configuración, contadores) sí, entendiendo que no se comparte entre réplicas. Estado **de una request** (usuario actual, tenant, transacción) nunca en un campo de un singleton: con la concurrencia de Node se mezclan requests. Ese estado va por parámetros, en `AsyncLocalStorage` o en un provider de scope REQUEST.

---

## 4. Tokens: clase, string o Symbol

| Tipo de token | Ejemplo | Inyección | Cuándo |
|---|---|---|---|
| **Clase** | `ProductosService` | Automática por tipo | El 90% de los casos |
| **String** | `'TASA_IVA'` | `@Inject('TASA_IVA')` | Rápido, pero con riesgo de colisiones y typos |
| **Symbol** | `TASA_IVA = Symbol('TASA_IVA')` | `@Inject(TASA_IVA)` | Valores, interfaces: único y refactorizable |
| Clase abstracta | `PagosService` | Automática por tipo | Abstracciones (sección 6) |

```ts
// src/ordenes/ordenes.constants.ts
export const TASA_IVA = Symbol('TASA_IVA');
export const MAX_ITEMS_POR_ORDEN = Symbol('MAX_ITEMS_POR_ORDEN');
```

```ts
// src/ordenes/ordenes.module.ts
@Module({
  imports: [ProductosModule],
  providers: [
    OrdenesService,
    { provide: TASA_IVA, useValue: 0.19 },            // IVA de Chile
    { provide: MAX_ITEMS_POR_ORDEN, useValue: 50 },
  ],
})
export class OrdenesModule {}
```

```ts
// src/ordenes/ordenes.service.ts
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class OrdenesService {
  constructor(
    private readonly productos: ProductosService,
    @Inject(TASA_IVA) private readonly tasaIva: number, // number no sirve como token: hace falta @Inject
    @Inject(MAX_ITEMS_POR_ORDEN) private readonly maxItems: number,
  ) {}
}
```

> ⚠️ Con **string tokens**, `@Inject('TASA_IVA')` y `@Inject('TASA_iva')` son tokens distintos y el error aparece recién al arrancar. Centraliza los tokens en constantes exportadas (preferiblemente `Symbol`) y nunca escribas el literal dos veces.

> 💡 Para configuración real (variables de entorno, secretos), en lugar de `useValue` con constantes usarás `ConfigService` (Sesión 7). `useValue` es ideal para constantes de dominio y para **mocks en tests**.

---

## 5. Las cuatro recetas en TiendaApi

### 5.1 `useClass`: elegir implementación

```ts
@Module({
  providers: [
    {
      provide: PagosService,  // token = la abstracción
      useClass: process.env.NODE_ENV === 'production'
        ? StripePagosService
        : PagosFalsoService, // en desarrollo no cobramos de verdad
    },
  ],
  exports: [PagosService],
})
export class PagosModule {}
```

> ⚠️ Leer `process.env` directamente dentro de `@Module` funciona, pero se evalúa al **importar el archivo**, antes de que `ConfigModule` cargue el `.env`. En la Sesión 7 lo haremos bien con `useFactory` + `ConfigService`.

### 5.2 `useValue`: constantes y objetos

```ts
{ provide: TASA_IVA, useValue: 0.19 }
{ provide: PagosService, useValue: { cobrar: async () => ({ id: 'fake', ok: true }) } } // típico en tests
```

### 5.3 `useFactory`: construir con lógica

```ts
export const CLIENTE_HTTP_PAGOS = Symbol('CLIENTE_HTTP_PAGOS');

@Module({
  providers: [
    {
      provide: CLIENTE_HTTP_PAGOS,
      // la factory recibe las dependencias listadas en "inject", en el mismo orden
      useFactory: (reloj: RelojService, timeoutMs: number) => ({
        timeoutMs,
        creadoEn: reloj.ahora(),
        // ... aquí iría un cliente real (axios, fetch con AbortSignal, SDK)
      }),
      inject: [RelojService, TIMEOUT_PAGOS_MS],
    },
    { provide: TIMEOUT_PAGOS_MS, useValue: 5_000 },
  ],
})
export class PagosModule {}
```

La factory puede ser `async`: Nest **espera la promesa antes de terminar el bootstrap**. Es la forma correcta de inicializar algo asíncrono (conectar a una base de datos, cargar un certificado). Lo exprimimos en la Sesión 23.

### 5.4 `useExisting`: alias

```ts
providers: [
  StripePagosService,
  { provide: PagosService, useExisting: StripePagosService }, // mismo objeto, dos tokens
]
```

A diferencia de `useClass`, `useExisting` **no crea otra instancia**: ambos tokens apuntan al mismo singleton.

> ❓ **Entrevista**: *"¿Qué diferencia hay entre `useClass: X` y `useExisting: X`?"* → `useClass` crea una **instancia nueva** de X asociada a ese token (si X también está registrado por su cuenta, tendrás dos instancias). `useExisting` crea un **alias** que apunta al provider ya registrado con el token X: una sola instancia accesible por dos tokens.

---

## 6. Programar contra abstracciones

Queremos que `OrdenesService` dependa de "algo que cobra", no de Stripe. Hay dos formas en Nest.

### 6.1 Clase abstracta como token (recomendada)

```ts
// src/pagos/pagos.service.ts — el CONTRATO
export interface ResultadoCobro { id: string; aprobado: boolean }

export abstract class PagosService {
  abstract cobrar(montoClp: number, referencia: string): Promise<ResultadoCobro>;
}
```

```ts
// src/pagos/pagos-falso.service.ts — una implementación
@Injectable()
export class PagosFalsoService extends PagosService {
  private readonly logger = new Logger(PagosFalsoService.name);

  async cobrar(montoClp: number, referencia: string): Promise<ResultadoCobro> {
    this.logger.log(`Cobro simulado de $${montoClp} (${referencia})`);
    return { id: `fake-${Date.now()}`, aprobado: true };
  }
}
```

```ts
// src/pagos/pagos.module.ts
@Module({
  providers: [{ provide: PagosService, useClass: PagosFalsoService }],
  exports: [PagosService],
})
export class PagosModule {}
```

```ts
// Consumidor: inyección por tipo, sin @Inject, y con tipado completo
constructor(private readonly pagos: PagosService) {}
```

### 6.2 Interfaz + Symbol

```ts
export interface IPagosService {
  cobrar(montoClp: number, referencia: string): Promise<ResultadoCobro>;
}
export const PAGOS_SERVICE = Symbol('PAGOS_SERVICE');

// módulo
providers: [{ provide: PAGOS_SERVICE, useClass: PagosFalsoService }]

// consumidor: la interfaz no existe en runtime → @Inject obligatorio
constructor(@Inject(PAGOS_SERVICE) private readonly pagos: IPagosService) {}
```

| Criterio | Clase abstracta | Interfaz + Symbol |
|---|---|---|
| ¿Necesita `@Inject`? | ❌ | ✅ en cada consumidor |
| Riesgo de inyectar el token equivocado | Bajo (el tipo *es* el token) | Medio (tipo y token pueden no coincidir) |
| Implementación con `implements` | ✅ (`extends` o `implements` de la clase abstracta) | ✅ |
| Puede tener lógica compartida | ✅ | ❌ |
| Estilo | Idiomático en Nest | Familiar si vienes de .NET/Java |

> ⚠️ Con `isolatedModules` + `emitDecoratorMetadata` (plantilla de Nest 11), importar una **interfaz** usada en un constructor decorado requiere `import type { IPagosService }` (error TS1272). Otro punto a favor de la clase abstracta (Sesión 2).

---

## 7. Otras herramientas de inyección

### 7.1 `@Optional()`

```ts
@Injectable()
export class OrdenesService {
  constructor(
    private readonly productos: ProductosService,
    @Optional() @Inject(NOTIFICADOR) private readonly notificador?: Notificador,
  ) {}

  private avisar(msg: string) {
    this.notificador?.enviar(msg); // si no hay provider registrado, llega undefined
  }
}
```

Úsalo para integraciones realmente opcionales (métricas, notificaciones). Si la dependencia es obligatoria para el negocio, **no** la hagas opcional: prefieres que la app falle al arrancar.

### 7.2 Inyección por propiedad

```ts
@Injectable()
export class ServicioBase {
  @Inject(RelojService)
  protected readonly reloj!: RelojService; // se asigna DESPUÉS del constructor
}
```

La documentación de Nest la reserva para casos concretos, como clases base de las que heredan muchas subclases (así no tienes que propagar el parámetro con `super(...)`). En el resto, **prefiere constructor**: las dependencias quedan explícitas y la propiedad está disponible dentro del constructor.

### 7.3 Nada de `new` para providers

```ts
// ❌ Esto crea un ProductosService FUERA del contenedor: sin sus dependencias, otra instancia
const svc = new ProductosService();
```

Un `new` manual de un provider rompe el singleton, se salta sus dependencias y sus hooks (`onModuleInit`, Sesión 24). Objetos de valor, entidades, DTOs y errores sí se crean con `new`; **services, repositorios y clientes**, nunca.

### 7.4 Nada asíncrono en el constructor

```ts
// ❌ El constructor no puede ser async; la promesa queda flotando y los errores se pierden
constructor(private readonly db: DbClient) {
  this.db.conectar(); // ¿cuándo termina? ¿y si falla?
}
```

✅ Usa una **factory asíncrona** (sección 5.3) o el hook `onModuleInit()`, que Nest espera antes de levantar el servidor (Sesión 24).

---

## 8. `OrdenesService` de TiendaApi completo

```ts
// src/core/reloj/reloj.service.ts
@Injectable()
export class RelojService {
  ahora(): Date {
    return new Date();
  }
}
```

```ts
// src/ordenes/entities/orden.entity.ts
export class Orden {
  id!: number;
  usuarioId!: number;
  items!: { productoId: number; cantidad: number; precioUnitario: number }[];
  neto!: number;
  iva!: number;
  total!: number;
  pagoId!: string;
  creadaEn!: Date;
}
```

```ts
// src/ordenes/ordenes.service.ts
import { BadRequestException, Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';

export interface ItemSolicitado { productoId: number; cantidad: number }

@Injectable()
export class OrdenesService {
  private readonly ordenes = new Map<number, Orden>(); // estado de la APLICACIÓN: aceptable
  private siguienteId = 1;

  constructor(
    private readonly productos: ProductosService,             // exportado por ProductosModule
    private readonly pagos: PagosService,                     // abstracción
    private readonly reloj: RelojService,                     // del CoreModule global
    @Inject(TASA_IVA) private readonly tasaIva: number,
    @Inject(MAX_ITEMS_POR_ORDEN) private readonly maxItems: number,
  ) {}

  // Los datos de la request (usuarioId) llegan por PARÁMETRO, no se guardan en campos
  async crear(usuarioId: number, items: ItemSolicitado[]): Promise<Orden> {
    if (items.length === 0 || items.length > this.maxItems) {
      throw new BadRequestException(`Una orden debe tener entre 1 y ${this.maxItems} ítems`);
    }

    const lineas = items.map(({ productoId, cantidad }) => {
      const p = this.productos.findOne(productoId); // 404 si no existe
      if (p.stock < cantidad) {
        throw new UnprocessableEntityException(`Stock insuficiente para "${p.nombre}"`);
      }
      return { productoId, cantidad, precioUnitario: p.precio };
    });

    const neto = lineas.reduce((acc, l) => acc + l.precioUnitario * l.cantidad, 0);
    const iva = Math.round(neto * this.tasaIva);
    const total = neto + iva;

    const id = this.siguienteId++;
    const cobro = await this.pagos.cobrar(total, `orden-${id}`);
    if (!cobro.aprobado) throw new UnprocessableEntityException('Pago rechazado');

    // Descontar stock (en la Sesión 17 esto irá dentro de una transacción)
    for (const l of lineas) this.productos.descontarStock(l.productoId, l.cantidad);

    const orden: Orden = {
      id, usuarioId, items: lineas, neto, iva, total,
      pagoId: cobro.id,
      creadaEn: this.reloj.ahora(), // la hora también viene inyectada → testeable
    };
    this.ordenes.set(id, orden);
    return orden;
  }
}
```

```ts
// src/ordenes/ordenes.module.ts
@Module({
  imports: [ProductosModule, PagosModule], // CoreModule es global (Sesión 3)
  controllers: [OrdenesController],
  providers: [
    OrdenesService,
    { provide: TASA_IVA, useValue: 0.19 },
    { provide: MAX_ITEMS_POR_ORDEN, useValue: 50 },
  ],
})
export class OrdenesModule {}
```

(Agrega `descontarStock(id, cantidad)` a `ProductosService`: busca el producto y resta la cantidad.)

---

## 9. La recompensa: tests sin infraestructura

Como `OrdenesService` recibe todo desde afuera, en un test reemplazamos cada dependencia por un doble controlado:

```ts
// src/ordenes/ordenes.service.spec.ts
import { Test } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';

describe('OrdenesService', () => {
  let service: OrdenesService;
  const productosMock = {
    findOne: jest.fn(),
    descontarStock: jest.fn(),
  };
  const pagosMock = { cobrar: jest.fn() };
  const fechaFija = new Date('2025-06-01T12:00:00Z');

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdenesService,                                   // la clase REAL bajo prueba
        { provide: ProductosService, useValue: productosMock },
        { provide: PagosService, useValue: pagosMock },
        { provide: RelojService, useValue: { ahora: () => fechaFija } },
        { provide: TASA_IVA, useValue: 0.19 },
        { provide: MAX_ITEMS_POR_ORDEN, useValue: 50 },
      ],
    }).compile();

    service = moduleRef.get(OrdenesService);
  });

  it('calcula IVA, cobra y descuenta stock', async () => {
    productosMock.findOne.mockReturnValue({ id: 1, nombre: 'Teclado', precio: 10_000, stock: 5 });
    pagosMock.cobrar.mockResolvedValue({ id: 'pago-1', aprobado: true });

    const orden = await service.crear(7, [{ productoId: 1, cantidad: 2 }]);

    expect(orden.neto).toBe(20_000);
    expect(orden.iva).toBe(3_800);
    expect(orden.total).toBe(23_800);
    expect(orden.creadaEn).toBe(fechaFija);
    expect(pagosMock.cobrar).toHaveBeenCalledWith(23_800, 'orden-1');
    expect(productosMock.descontarStock).toHaveBeenCalledWith(1, 2);
  });

  it('rechaza si no hay stock, sin cobrar', async () => {
    productosMock.findOne.mockReturnValue({ id: 1, nombre: 'Teclado', precio: 10_000, stock: 1 });

    await expect(service.crear(7, [{ productoId: 1, cantidad: 2 }]))
      .rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(pagosMock.cobrar).not.toHaveBeenCalled();
  });
});
```

Sin HTTP, sin base de datos, sin Stripe, sin depender de la hora real. `Test.createTestingModule`, `overrideProvider` y los tests e2e son la Sesión 22.

> ❓ **Entrevista**: *"¿Cuál es el beneficio práctico más grande de la DI?"* → La **sustituibilidad**: puedes cambiar una implementación (pagos falsos en desarrollo, Stripe en producción, un mock en tests) sin tocar al consumidor. De ahí vienen la testabilidad, el desacople de proveedores externos y la configuración por entorno. La gestión automática del ciclo de vida (singletons, orden de construcción) es el segundo beneficio.

---

## 10. Errores comunes y cómo leerlos

| Síntoma | Causa probable | Solución |
|---|---|---|
| `can't resolve dependencies of X (?)` con el nombre de una clase | El provider no está en el módulo ni en un import que lo exporte | `exports` + `imports` (Sesión 3) |
| `... argument Object at index [n]` | El parámetro es una **interfaz** o unión | `@Inject(TOKEN)` o clase abstracta |
| `... argument String/Number at index [n]` | Primitivo sin token | `@Inject(TOKEN)` + `useValue` |
| `... at index [n]` sin nombre útil / `undefined` | Import circular entre archivos | Revisar imports; `forwardRef` (Sesión 23) |
| `... argument "TASA_IVA" at index [n]` | Token string no registrado o con typo | Constantes/Symbol centralizados |
| Datos que "desaparecen" entre endpoints | Dos instancias (redeclarado en `providers` o `new` manual) | Un solo módulo dueño |
| Datos de un usuario visibles para otro | Estado de request en un campo de un singleton | Parámetros / `AsyncLocalStorage` |
| Todo compila pero ninguna dependencia se resuelve | Falta `@Injectable()` o `emitDecoratorMetadata` | Sesión 2 |

---

## Resumen mental de la sesión

```
IoC: el contenedor crea y conecta · DI: dependencias entran por constructor
DIP: depende de ABSTRACCIONES (PagosService), no de Stripe

Provider = TOKEN → RECETA
  [Clase]                    ≡ { provide: Clase, useClass: Clase }
  useClass    → instancia nueva de la implementación elegida
  useValue    → valor tal cual (constantes, mocks)
  useFactory  → resultado de la función (+ inject: [...]); puede ser async
  useExisting → ALIAS del provider existente (misma instancia)

Tokens: Clase (auto) · Symbol (@Inject, recomendado) · string (@Inject, cuidado typos)
Interfaz/primitivo en constructor → @Inject(TOKEN) obligatorio
Abstracción preferida en Nest: CLASE ABSTRACTA como token

Resolución: design:paramtypes/@Inject → módulo propio → imports.exports → globales → error
Scope DEFAULT = singleton creado al arrancar · REQUEST/TRANSIENT (Sesión 23, costo)
NUNCA estado de request en campos de un singleton (concurrencia de Node)
NUNCA new de un provider · NUNCA async en constructor (factory async / onModuleInit)
@Optional() para dependencias realmente opcionales · property injection solo en clases base

Premio: Test.createTestingModule + useValue mocks → tests sin infraestructura
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ Explica IoC, DI y el principio de inversión de dependencias. ¿Se pueden tener uno sin los otros?
2. ❓ ¿Qué es un provider en Nest? ¿Tiene que ser una clase?
3. ❓ ¿A qué equivale `providers: [ProductosService]` en forma larga?
4. ❓ Describe paso a paso cómo resuelve Nest las dependencias de un constructor.
5. ❓ ¿Qué scope tienen los providers por defecto? ¿Cuándo se crean? ¿Qué problema tiene el scope REQUEST?
6. ❓ ¿Por qué es peligroso guardar el usuario actual en un campo de un service?
7. ❓ ¿Cuándo necesitas `@Inject()`? ¿Por qué preferir `Symbol` a strings como token?
8. ❓ Diferencia entre `useClass`, `useValue`, `useFactory` y `useExisting`.
9. ❓ ¿Clase abstracta o interfaz + Symbol para una abstracción? Argumenta.
10. ❓ ¿Qué pasa si haces `new ProductosService()` dentro de otro service?
11. ❓ ¿Dónde pones una inicialización asíncrona (conectar a una BD) si no puede ir en el constructor?
12. ❓ ¿Cuál es el beneficio práctico más grande de la DI? Da un ejemplo con tests.

## Ejercicio práctico
1. Crea `RelojService` en `CoreModule` (global, Sesión 3) y úsalo en lugar de `new Date()` en todos los services de TiendaApi.
2. Crea `PagosModule` con la clase abstracta `PagosService` y la implementación `PagosFalsoService`; expórtalo.
3. Crea `ordenes.constants.ts` con los tokens `TASA_IVA` y `MAX_ITEMS_POR_ORDEN` como `Symbol` y regístralos con `useValue` en `OrdenesModule`.
4. Implementa `OrdenesService.crear` de la sección 8 (incluye `descontarStock` en `ProductosService`) y un `POST /ordenes` que reciba `{ usuarioId, items }`.
5. Quita `@Inject(TASA_IVA)` del constructor, arranca y lee el error. Restáuralo.
6. Cambia el token de `TASA_IVA` por el string `'TASA_IVA'` en el módulo pero deja el `Symbol` en el service: observa el error y explica por qué los tokens deben centralizarse.
7. Implementa `PagosRechazaTodoService` (siempre `aprobado: false`) y cámbialo en el módulo con `useClass` **sin tocar** `OrdenesService`. Verifica el 422.
8. Registra `StripePagosService` (simulado) y un alias `{ provide: PagosService, useExisting: StripePagosService }`. Comprueba con `app.get` en `main.ts` que ambos tokens devuelven el **mismo** objeto (`===`).
9. Escribe el test unitario de la sección 9 y agrega un caso para "pago rechazado" que verifique que **no** se descuenta stock.
10. Introduce a propósito un campo `usuarioActual` en `OrdenesService` asignado en `crear` y usado después de un `await new Promise(r => setTimeout(r, 100))`. Lanza dos requests en paralelo con usuarios distintos (`curl ... & curl ...`) y observa la mezcla. Luego corrígelo.

---

➡️ **Cuando termines**, marca la Sesión 5 en el [README](README.md) y pasa a la **Sesión 6 — DTOs y validación: class-validator, class-transformer y ValidationPipe**.

# Sesión 30 — Arquitectura: Clean/Hexagonal, DDD y CQRS con @nestjs/cqrs

> **Objetivo de la sesión**: pasar de "controller → service → repository" a una arquitectura donde **el dominio no depende del framework** y las reglas de negocio viven en un solo lugar. Al terminar deberías poder explicar la **regla de dependencia** de Clean/Hexagonal y aplicarla en Nest con **puertos y adaptadores** (tokens de DI), modelar con **DDD táctico** (entidades, value objects, agregados, eventos de dominio, repositorios), separar escrituras y lecturas con **CQRS** usando `@nestjs/cqrs` (`CommandBus`, `QueryBus`, `EventBus`, `AggregateRoot`, `EventPublisher`, `@Saga`) y, sobre todo, saber **cuándo no** usar nada de esto.

---

## 1. El problema: el "service gordo"

La arquitectura por capas de las sesiones anteriores funciona bien para CRUD. Con el tiempo, en un dominio rico, aparece esto:

```ts
// ❌ OrdenesService de 1 200 líneas
@Injectable()
export class OrdenesService {
  constructor(@InjectRepository(Orden) private repo: Repository<Orden>, /* + cupones, mail, http... */) {}

  async crear(dto: CrearOrdenDto, userId: number) {
    // validación de negocio, cálculo de precios, descuentos, stock, persistencia,
    // envío de email y llamada a pagos... todo mezclado, todo dependiente de TypeORM
    const orden = this.repo.create({ ...dto, userId, estado: 'PENDIENTE' });
    orden.total = dto.lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);  // ¿el precio viene del cliente?!
  }
}
```

Síntomas:
- **Modelo anémico**: la entidad `Orden` es una bolsa de propiedades públicas; cualquiera hace `orden.estado = 'PAGADA'` saltándose reglas.
- Reglas de negocio **duplicadas** en services, controllers y resolvers.
- Tests unitarios que requieren mockear TypeORM, HTTP y mail para probar una regla de descuento.
- Cambiar de ORM o de proveedor de pagos toca el núcleo del negocio.

La idea de las arquitecturas de esta sesión: **aislar el núcleo de negocio** y hacer que todo lo demás (HTTP, base de datos, colas) sea un detalle reemplazable.

---

## 2. Clean Architecture y Hexagonal (Ports & Adapters)

Son dos formulaciones de la misma idea. Hexagonal (Alistair Cockburn, 2005) habla de **puertos** (interfaces que define el núcleo) y **adaptadores** (implementaciones concretas). Clean Architecture (Robert C. Martin, 2012) lo expresa en círculos concéntricos.

```
                ┌──────────────────────────────────────────────┐
                │ Infraestructura / Adaptadores                │
                │  Controllers HTTP · Resolvers GraphQL ·      │
                │  Consumers RMQ · TypeORM · S3 · Stripe       │
                │   ┌──────────────────────────────────────┐   │
                │   │ Aplicación (casos de uso)            │   │
                │   │  CrearOrdenHandler · PagarOrden      │   │
                │   │  Puertos: OrdenRepository,           │   │
                │   │           PasarelaPagos, Catalogo    │   │
                │   │   ┌──────────────────────────────┐   │   │
                │   │   │ Dominio                      │   │   │
                │   │   │  Orden (agregado) · Dinero   │   │   │
                │   │   │  reglas · eventos de dominio │   │   │
                │   │   └──────────────────────────────┘   │   │
                │   └──────────────────────────────────────┘   │
                └──────────────────────────────────────────────┘
                    Las dependencias apuntan SOLO hacia adentro
```

**La regla de dependencia**: el código de un círculo interior no conoce nada del exterior. El dominio no importa `@nestjs/*`, `typeorm` ni `express`. La aplicación define **interfaces** (puertos) que la infraestructura implementa: es la **inversión de dependencias** (la D de SOLID).

| Capa | Contiene | Puede importar | NO puede importar |
|---|---|---|---|
| **Dominio** | Entidades, value objects, agregados, eventos, errores de dominio | Solo TypeScript (y quizá utilidades puras) | Nest, ORM, HTTP |
| **Aplicación** | Casos de uso (commands/queries + handlers), puertos | Dominio, `@nestjs/cqrs`/`@nestjs/common` (pragmático) | TypeORM, Express, SDKs externos |
| **Infraestructura** | Adaptadores: repositorios ORM, clientes HTTP, brokers | Todo | — |
| **Presentación** | Controllers, resolvers, gateways, DTOs de transporte | Aplicación | Dominio directamente para *escribir* (pasa por casos de uso) |

> ❓ **Entrevista**: *"¿Qué es un puerto y qué es un adaptador?"* → Un **puerto** es una interfaz definida por el núcleo según **sus** necesidades (`OrdenRepository.guardar(orden)`, `PasarelaPagos.cobrar(monto)`). Un **adaptador** la implementa con una tecnología concreta (`TypeOrmOrdenRepository`, `StripePasarelaPagos`). Hay adaptadores *primarios/de entrada* (controllers, consumers: llaman al núcleo) y *secundarios/de salida* (repositorios, clientes: el núcleo los llama a través del puerto).

> 💡 Pragmatismo: que la capa de aplicación use decoradores de `@nestjs/cqrs` o `@Injectable()` es un acoplamiento aceptable para muchos equipos (los decoradores son metadata, el código sigue siendo testeable sin Nest). El dominio sí debería quedar **libre** de framework.

### 2.1 Puertos en Nest: interfaces no existen en runtime

Las interfaces de TypeScript desaparecen al compilar, así que no pueden ser token de DI (Sesión 23). Dos opciones válidas (elige una convención para todo el proyecto):

```ts
// Opción A: Symbol + interface
export const ORDEN_REPOSITORY = Symbol('ORDEN_REPOSITORY');
export interface OrdenRepository {
  porId(id: OrdenId): Promise<Orden | null>;
  guardar(orden: Orden): Promise<void>;
}
// uso: constructor(@Inject(ORDEN_REPOSITORY) private readonly repo: OrdenRepository) {}

// Opción B: clase abstracta (existe en runtime → sirve de token y de tipo, sin @Inject)
export abstract class OrdenRepository {
  abstract porId(id: OrdenId): Promise<Orden | null>;
  abstract guardar(orden: Orden): Promise<void>;
}
// uso: constructor(private readonly repo: OrdenRepository) {}
// registro: { provide: OrdenRepository, useClass: TypeOrmOrdenRepository }
```

### 2.2 Estructura de carpetas

```
src/
└── ordenes/                         ← un bounded context / módulo
    ├── domain/
    │   ├── orden.aggregate.ts
    │   ├── linea-orden.ts
    │   ├── value-objects/dinero.ts, orden-id.ts, cantidad.ts
    │   ├── events/orden-creada.event.ts, orden-pagada.event.ts
    │   ├── errors/orden.errors.ts
    │   └── orden.repository.ts      ← PUERTO (lo define el dominio/aplicación)
    ├── application/
    │   ├── commands/crear-orden/{crear-orden.command.ts, crear-orden.handler.ts}
    │   ├── commands/pagar-orden/...
    │   ├── queries/obtener-orden/{obtener-orden.query.ts, obtener-orden.handler.ts}
    │   ├── ports/catalogo.port.ts, pasarela-pagos.port.ts
    │   └── sagas/ordenes.saga.ts
    ├── infrastructure/
    │   ├── persistence/orden.orm-entity.ts, typeorm-orden.repository.ts, orden.mapper.ts
    │   ├── adapters/catalogo-http.adapter.ts, stripe-pagos.adapter.ts
    │   └── read-models/ordenes-resumen.projection.ts
    ├── presentation/
    │   ├── ordenes.controller.ts, dto/crear-orden.request.ts
    └── ordenes.module.ts            ← el ÚNICO lugar que conecta puertos con adaptadores
```

> 💡 Haz cumplir la regla de dependencia con herramientas, no con fe: `eslint-plugin-boundaries`, `dependency-cruiser` o `@nx/enforce-module-boundaries` (Sesión 31) fallan el CI si `domain/` importa de `infrastructure/`.

---

## 3. DDD estratégico: antes que el código

Domain-Driven Design (Eric Evans, 2003) tiene dos mitades. La **estratégica** es la más valiosa y la más ignorada:

| Concepto | Qué es | En TiendaApi |
|---|---|---|
| **Lenguaje ubicuo** | El mismo vocabulario en conversaciones, código y tests | "Orden", "Línea", "Reserva de stock", no `Order`/`Pedido`/`Compra` mezclados |
| **Bounded context** | Límite dentro del cual un modelo tiene un significado preciso | *Catálogo*, *Ventas (Órdenes)*, *Inventario*, *Pagos*, *Identidad* |
| **Context map** | Cómo se relacionan los contextos | Ventas es *cliente* de Catálogo (lee precios); Inventario escucha eventos de Ventas |
| **Anti-corruption layer** | Traductor que protege tu modelo de uno externo | Adaptador de la pasarela de pagos que convierte su modelo al tuyo |

"Producto" en Catálogo tiene descripción, fotos y SEO; en Inventario solo SKU y cantidad; en Ventas es una línea con precio **congelado** al momento de comprar. Intentar un único `Producto` para todo es el origen de las entidades de 60 columnas.

> ❓ **Entrevista**: *"¿Qué relación hay entre bounded contexts y microservicios?"* → Un bounded context es un buen **candidato** a límite de microservicio (Sesión 29), pero no es obligatorio: en un monolito modular cada contexto es un módulo de Nest con su propio modelo y su propia API pública. Primero se descubren los contextos; la decisión de desplegarlos por separado es posterior y operacional.

---

## 4. DDD táctico: los bloques de construcción

### 4.1 Value Objects

Objetos **definidos por su valor**, inmutables, que se validan al construirse. Eliminan la "obsesión por primitivos" (`number` para dinero, `string` para email).

```ts
// src/ordenes/domain/value-objects/dinero.ts
import { DomainError } from '../errors/domain.error';

export type Moneda = 'CLP' | 'USD';

export class Dinero {
  // Constructor privado: la única forma de crear uno es por los métodos de fábrica
  private constructor(readonly montoMinimo: number, readonly moneda: Moneda) {}
  static de(montoMinimo: number, moneda: Moneda = 'CLP'): Dinero {
    if (!Number.isInteger(montoMinimo)) throw new DomainError('El dinero se expresa en unidades mínimas enteras');
    if (montoMinimo < 0) throw new DomainError('El dinero no puede ser negativo');
    return new Dinero(montoMinimo, moneda);
  }
  static cero(moneda: Moneda = 'CLP') { return new Dinero(0, moneda); }
  sumar(otro: Dinero): Dinero {
    this.mismaMoneda(otro);
    return new Dinero(this.montoMinimo + otro.montoMinimo, this.moneda);   // nuevo objeto: inmutable
  }
  multiplicar(factor: number): Dinero {
    return Dinero.de(Math.round(this.montoMinimo * factor), this.moneda);
  }
  mayorQue(otro: Dinero): boolean {
    this.mismaMoneda(otro);
    return this.montoMinimo > otro.montoMinimo;
  }
  equals(otro: Dinero): boolean {
    return this.montoMinimo === otro.montoMinimo && this.moneda === otro.moneda;
  }
  private mismaMoneda(otro: Dinero) {
    if (otro.moneda !== this.moneda) throw new DomainError('No se pueden operar monedas distintas');
  }
}
```

> ⚠️ Nunca uses `number` con decimales para dinero: `0.1 + 0.2 !== 0.3`. Guarda enteros en la unidad mínima (centavos; en CLP el peso ya es la unidad mínima) o usa una librería decimal.

### 4.2 Entidades y Agregados

- **Entidad**: tiene **identidad** que perdura aunque cambien sus atributos (una `LineaOrden` con id, un `Usuario`).
- **Agregado**: grupo de entidades y value objects que se modifican **juntos** como una unidad de consistencia. Tiene una **raíz** (aggregate root) que es la única puerta de entrada.

Reglas de agregados que debes recitar:
1. Las **invariantes** (reglas que siempre deben cumplirse) se protegen **dentro** del agregado.
2. Desde fuera solo se referencia a la raíz; a otros agregados **por id**, no por objeto.
3. **Una transacción modifica un agregado**. Si necesitas cambiar dos, usa eventos de dominio y consistencia eventual.
4. Un repositorio **por agregado** (no por tabla).
5. Diseña agregados **pequeños**: un agregado grande es un cuello de botella de concurrencia.

```ts
// src/ordenes/domain/orden.aggregate.ts
import { AggregateRoot } from '@nestjs/cqrs';
import { Dinero } from './value-objects/dinero';
import { OrdenCreadaEvent } from './events/orden-creada.event';
import { OrdenPagadaEvent } from './events/orden-pagada.event';
import { OrdenCanceladaEvent } from './events/orden-cancelada.event';
import { DomainError } from './errors/domain.error';

export type EstadoOrden = 'PENDIENTE' | 'PAGADA' | 'DESPACHADA' | 'CANCELADA';

export class LineaOrden {
  constructor(
    readonly productoId: number,
    readonly cantidad: number,
    readonly precioUnitario: Dinero,       // precio CONGELADO al crear la orden
  ) {
    if (!Number.isInteger(cantidad) || cantidad < 1) throw new DomainError('Cantidad inválida');
  }
  subtotal(): Dinero { return this.precioUnitario.multiplicar(this.cantidad); }
}

export class Orden extends AggregateRoot {
  private static readonly MAX_LINEAS = 50;

  private constructor(
    readonly id: string,
    readonly clienteId: number,
    private _lineas: LineaOrden[],
    private _estado: EstadoOrden,
    private _version: number,
  ) {
    super();
  }

  // Fábrica: el ÚNICO modo de crear una orden nueva válida
  static crear(id: string, clienteId: number, lineas: LineaOrden[]): Orden {
    if (lineas.length === 0) throw new DomainError('Una orden necesita al menos una línea');
    if (lineas.length > Orden.MAX_LINEAS) throw new DomainError('Demasiadas líneas');
    const ids = new Set(lineas.map((l) => l.productoId));
    if (ids.size !== lineas.length) throw new DomainError('Producto repetido: suma la cantidad');

    const orden = new Orden(id, clienteId, lineas, 'PENDIENTE', 0);
    // apply() registra el evento (no lo publica todavía)
    orden.apply(new OrdenCreadaEvent(id, clienteId, orden.total().montoMinimo,
      lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad }))));
    return orden;
  }

  // Reconstituir desde la base: NO emite eventos ni revalida reglas de creación
  static reconstituir(p: { id: string; clienteId: number; lineas: LineaOrden[]; estado: EstadoOrden; version: number }): Orden {
    return new Orden(p.id, p.clienteId, p.lineas, p.estado, p.version);
  }

  pagar(referenciaPago: string): void {
    if (this._estado !== 'PENDIENTE') throw new DomainError(`No se puede pagar una orden ${this._estado}`);
    this._estado = 'PAGADA';
    this.apply(new OrdenPagadaEvent(this.id, referenciaPago, this.total().montoMinimo));
  }

  cancelar(motivo: string): void {
    if (this._estado === 'DESPACHADA') throw new DomainError('Una orden despachada no se cancela: usa devolución');
    if (this._estado === 'CANCELADA') return;                       // idempotente
    this._estado = 'CANCELADA';
    this.apply(new OrdenCanceladaEvent(this.id, motivo));
  }

  total(): Dinero {
    return this._lineas.reduce((acc, l) => acc.sumar(l.subtotal()), Dinero.cero());
  }

  get estado(): EstadoOrden { return this._estado; }
  get lineas(): readonly LineaOrden[] { return this._lineas; }    // copia de solo lectura
  get version(): number { return this._version; }
}
```

Fíjate: no hay setters públicos. `orden.estado = 'PAGADA'` **no compila**. La única forma de pagar es `orden.pagar()`, que valida la transición. Eso es un **modelo rico**.

> ⚠️ `extends AggregateRoot` hace que el dominio importe `@nestjs/cqrs`. Es un compromiso pragmático muy común (la clase solo gestiona una lista de eventos). Si quieres un dominio 100% puro, implementa tu propia clase base con `private eventos: DomainEvent[]` y `extraerEventos()`, y publícalos en el handler con `EventBus.publishAll()`.

### 4.3 Eventos de dominio

Un evento de dominio es un **hecho de negocio en pasado** que otros pueden necesitar conocer. Son clases simples e inmutables:

```ts
// src/ordenes/domain/events/orden-creada.event.ts
export class OrdenCreadaEvent {
  constructor(
    readonly ordenId: string,
    readonly clienteId: number,
    readonly totalMinimo: number,
    readonly lineas: { productoId: number; cantidad: number }[],
    readonly ocurridoEn: Date = new Date(),
  ) {}
}
```

### 4.4 Repositorio (puerto) y su adaptador

```ts
// src/ordenes/domain/orden.repository.ts  ← PUERTO
import { Orden } from './orden.aggregate';

export abstract class OrdenRepository {
  abstract porId(id: string): Promise<Orden | null>;
  abstract guardar(orden: Orden): Promise<void>;
}
```

```ts
// src/ordenes/infrastructure/persistence/typeorm-orden.repository.ts  ← ADAPTADOR
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdenRepository } from '../../domain/orden.repository';
import { Orden } from '../../domain/orden.aggregate';
import { OrdenOrmEntity } from './orden.orm-entity';
import { OrdenMapper } from './orden.mapper';
import { ConcurrenciaError } from '../../domain/errors/concurrencia.error';

@Injectable()
export class TypeOrmOrdenRepository extends OrdenRepository {
  constructor(@InjectRepository(OrdenOrmEntity) private readonly orm: Repository<OrdenOrmEntity>) {
    super();
  }

  async porId(id: string): Promise<Orden | null> {
    const fila = await this.orm.findOne({ where: { id }, relations: { lineas: true } });
    return fila ? OrdenMapper.aDominio(fila) : null;
  }

  async guardar(orden: Orden): Promise<void> {
    // Concurrencia optimista: solo actualiza si nadie cambió la versión mientras tanto
    const fila = OrdenMapper.aPersistencia(orden);
    if (orden.version === 0) {
      await this.orm.save({ ...fila, version: 1 });
      return;
    }
    const res = await this.orm.update(
      { id: orden.id, version: orden.version },
      { estado: fila.estado, version: orden.version + 1 },
    );
    if (res.affected === 0) throw new ConcurrenciaError(`Orden ${orden.id} modificada por otro proceso`);
  }
}
```

La **entidad ORM** (`OrdenOrmEntity` con decoradores `@Entity`, `@Column`) y el **agregado** (`Orden`) son clases distintas; el `OrdenMapper` traduce. Parece duplicación, pero es lo que permite que el dominio no sepa de columnas, `nullable` ni lazy relations.

> ❓ **Entrevista**: *"¿No es sobre-ingeniería tener una entidad ORM y una de dominio?"* → Depende del dominio. En un CRUD, sí: usa la entidad ORM directamente. Cuando el modelo tiene invariantes reales, separarlas evita que el esquema de la base condicione el diseño del negocio y que el ORM exponga setters públicos. Un camino intermedio es usar la entidad ORM como agregado con métodos de negocio y propiedades privadas, aceptando el acoplamiento.

---

## 5. CQRS: separar escrituras de lecturas

**CQRS** (Command Query Responsibility Segregation, Greg Young) separa el modelo que **cambia** el estado del modelo que lo **lee**:

```
                 ┌──────────── WRITE side ─────────────┐
 POST /ordenes ─▶│ CommandBus → CrearOrdenHandler      │
                 │   → Orden (agregado, invariantes)    │──▶ DB de escritura (normalizada)
                 │   → eventos de dominio ──────────┐   │
                 └──────────────────────────────────┼───┘
                                                    ▼ EventBus
                 ┌──────────── READ side ───────────┼──┐
 GET /ordenes ──▶│ QueryBus → ListarOrdenesHandler   │  │
                 │   → SQL directo / vista / réplica ◀─┘ proyección actualizada por eventos
                 │   → DTO plano (sin agregado)         │──▶ modelo de lectura (desnormalizado)
                 └──────────────────────────────────────┘
```

¿Por qué? Porque las necesidades son opuestas:

| | Escritura (commands) | Lectura (queries) |
|---|---|---|
| Objetivo | Proteger invariantes | Velocidad y forma conveniente para la UI |
| Modelo | Agregados ricos | DTOs planos, vistas, JOINs, caché |
| Volumen | Bajo | Normalmente 10–100× mayor |
| Escalado | Vertical, consistencia fuerte | Réplicas de lectura, caché, índices específicos |

> ⚠️ **CQRS no implica event sourcing, ni dos bases de datos, ni consistencia eventual.** El nivel más básico (y más útil) es: commands que pasan por el agregado y queries que leen **directo** de la misma base con SQL optimizado, sin reconstruir agregados. Las proyecciones separadas y el event sourcing son pasos opcionales posteriores.

### 5.1 Instalación y registro

```bash
npm i @nestjs/cqrs
```

```ts
// src/app.module.ts
import { CqrsModule } from '@nestjs/cqrs';

@Module({
  imports: [CqrsModule.forRoot(), OrdenesModule],   // forRoot() en el módulo raíz (v11)
})
export class AppModule {}
```

> 💡 En versiones anteriores a la 11 se importaba `CqrsModule` en cada módulo de feature. Los handlers se descubren porque son **providers** decorados: si olvidas listarlos en `providers`, el bus lanza `CommandHandlerNotFoundException`.

### 5.2 Commands y handlers

```ts
// src/ordenes/application/commands/crear-orden/crear-orden.command.ts
import { Command } from '@nestjs/cqrs';

// Command<TResultado> (v11): el tipo de retorno de commandBus.execute() queda inferido
export class CrearOrdenCommand extends Command<{ ordenId: string }> {
  constructor(
    readonly clienteId: number,
    readonly lineas: { productoId: number; cantidad: number }[],
  ) {
    super();
  }
}
```

```ts
// src/ordenes/application/ports/catalogo.port.ts
export abstract class CatalogoPort {
  // Devuelve el precio vigente de cada producto (en unidades mínimas)
  abstract preciosDe(productoIds: number[]): Promise<Map<number, number>>;
}
```

```ts
// src/ordenes/application/commands/crear-orden/crear-orden.handler.ts
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';
import { CrearOrdenCommand } from './crear-orden.command';
import { OrdenRepository } from '../../../domain/orden.repository';
import { CatalogoPort } from '../../ports/catalogo.port';
import { Orden, LineaOrden } from '../../../domain/orden.aggregate';
import { Dinero } from '../../../domain/value-objects/dinero';
import { ProductoNoDisponibleError } from '../../../domain/errors/orden.errors';

@CommandHandler(CrearOrdenCommand)
export class CrearOrdenHandler implements ICommandHandler<CrearOrdenCommand> {
  constructor(
    private readonly ordenes: OrdenRepository,      // puerto (clase abstracta = token)
    private readonly catalogo: CatalogoPort,        // puerto
    private readonly publisher: EventPublisher,
  ) {}

  async execute({ clienteId, lineas }: CrearOrdenCommand): Promise<{ ordenId: string }> {
    // 1. Los precios los decide el servidor (nunca el cliente)
    const precios = await this.catalogo.preciosDe(lineas.map((l) => l.productoId));
    const lineasDominio = lineas.map((l) => {
      const precio = precios.get(l.productoId);
      if (precio === undefined) throw new ProductoNoDisponibleError(l.productoId);
      return new LineaOrden(l.productoId, l.cantidad, Dinero.de(precio));
    });

    // 2. El agregado aplica las invariantes; mergeObjectContext lo conecta al EventBus
    const orden = this.publisher.mergeObjectContext(Orden.crear(randomUUID(), clienteId, lineasDominio));

    // 3. Persistir y LUEGO publicar los eventos registrados con apply()
    await this.ordenes.guardar(orden);
    orden.commit();

    return { ordenId: orden.id };
  }
}
```

```ts
// src/ordenes/presentation/ordenes.controller.ts — delgado: traduce HTTP ↔ commands/queries
@Controller('ordenes')
@UseGuards(JwtAuthGuard)
export class OrdenesController {
  constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

  @Post()
  @HttpCode(201)
  crear(@Body() dto: CrearOrdenRequest, @CurrentUser() user: UsuarioActual) {
    // execute() devuelve Promise<{ ordenId: string }> gracias a Command<T>
    return this.commandBus.execute(new CrearOrdenCommand(user.id, dto.lineas));
  }

  @Post(':id/pago')
  pagar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PagarOrdenRequest, @CurrentUser() user: UsuarioActual) {
    return this.commandBus.execute(new PagarOrdenCommand(id, user.id, dto.tokenPago));
  }

  @Get(':id')
  obtener(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UsuarioActual) {
    return this.queryBus.execute(new ObtenerOrdenQuery(id, user.id));
  }
}
```

> ⚠️ **`commit()` antes del `guardar()` es un bug**: publicarías eventos de algo que quizá no se persistió. Y aun en el orden correcto, los eventos del `EventBus` son **en memoria**: si el proceso muere entre `guardar()` y `commit()`, los efectos colaterales se pierden. Para eventos que cruzan servicios, persístelos en un **Outbox** dentro de la misma transacción (Sesión 29) y deja el `EventBus` para reacciones internas no críticas.

> ⚠️ Mapea los errores de dominio a HTTP en un **exception filter** (Sesión 9): `DomainError → 422`, `ConcurrenciaError → 409`, `ProductoNoDisponibleError → 409`. El dominio no debe lanzar `HttpException`.

### 5.3 Queries: leer sin pasar por el agregado

```ts
// src/ordenes/application/queries/obtener-orden/obtener-orden.query.ts
import { Query } from '@nestjs/cqrs';

export interface OrdenDetalleDto {
  id: string; estado: string; total: number;
  lineas: { productoId: number; nombre: string; cantidad: number; subtotal: number }[];
}

export class ObtenerOrdenQuery extends Query<OrdenDetalleDto> {
  constructor(readonly ordenId: string, readonly usuarioId: number) { super(); }
}
```

```ts
// src/ordenes/application/queries/obtener-orden/obtener-orden.handler.ts
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@QueryHandler(ObtenerOrdenQuery)
export class ObtenerOrdenHandler implements IQueryHandler<ObtenerOrdenQuery> {
  constructor(private readonly db: DataSource) {}   // lectura directa: SQL optimizado, sin mapper

  async execute({ ordenId, usuarioId }: ObtenerOrdenQuery): Promise<OrdenDetalleDto> {
    const filas: any[] = await this.db.query(
      `SELECT o.id, o.estado, l.producto_id, p.nombre, l.cantidad, l.precio_unitario
         FROM ordenes o
         JOIN lineas_orden l ON l.orden_id = o.id
         JOIN productos p    ON p.id = l.producto_id
        WHERE o.id = $1 AND o.cliente_id = $2`,
      [ordenId, usuarioId],
    );
    if (filas.length === 0) throw new NotFoundException();
    const lineas = filas.map((f) => ({
      productoId: f.producto_id, nombre: f.nombre, cantidad: f.cantidad,
      subtotal: f.cantidad * f.precio_unitario,
    }));
    return { id: filas[0].id, estado: filas[0].estado, total: lineas.reduce((s, l) => s + l.subtotal, 0), lineas };
  }
}
```

> 💡 Que el query handler use `DataSource` directamente "rompe" la hexagonal en el lado de lectura, y es intencional: las queries no tienen invariantes que proteger. Muchos equipos aceptan esto o lo encapsulan en un puerto `OrdenesReadModel` si quieren poder cambiar la fuente.

### 5.4 Eventos: handlers y proyecciones

```ts
// src/ordenes/infrastructure/read-models/ordenes-resumen.projection.ts
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

// Un handler puede escuchar varios eventos
@EventsHandler(OrdenCreadaEvent, OrdenPagadaEvent, OrdenCanceladaEvent)
export class OrdenesResumenProjection
  implements IEventHandler<OrdenCreadaEvent | OrdenPagadaEvent | OrdenCanceladaEvent> {
  constructor(private readonly db: DataSource) {}

  async handle(e: OrdenCreadaEvent | OrdenPagadaEvent | OrdenCanceladaEvent) {
    // Tabla desnormalizada para el dashboard: ventas por cliente
    if (e instanceof OrdenCreadaEvent) {
      await this.db.query(
        `INSERT INTO resumen_cliente (cliente_id, ordenes, pendiente) VALUES ($1, 1, $2)
         ON CONFLICT (cliente_id) DO UPDATE
           SET ordenes = resumen_cliente.ordenes + 1, pendiente = resumen_cliente.pendiente + $2`,
        [e.clienteId, e.totalMinimo],
      );
    }
    // ... OrdenPagadaEvent mueve de "pendiente" a "pagado", etc.
  }
}
```

> ⚠️ Los `EventsHandler` se ejecutan de forma asíncrona **y sus errores no llegan al que hizo `commit()`**: el command ya respondió `201`. Suscríbete a `UnhandledExceptionBus` para loguearlos y alertar; si la proyección no puede fallar silenciosamente, usa una cola (BullMQ, Sesión 25) con reintentos.

```ts
@Injectable()
export class CqrsErrorLogger implements OnModuleInit {
  constructor(private readonly unhandled: UnhandledExceptionBus) {}
  onModuleInit() {
    this.unhandled.subscribe(({ exception, cause }) =>
      Logger.error(`Fallo manejando ${cause?.constructor?.name}`, (exception as Error)?.stack, 'CQRS'));
  }
}
```

### 5.5 Sagas de `@nestjs/cqrs`: eventos → commands

En `@nestjs/cqrs`, una **saga** es un stream de RxJS que escucha eventos y emite **commands**. Sirve para coordinar pasos **dentro del proceso** (coreografía interna). Para sagas entre servicios, con estado persistido y compensaciones, vuelve a la Sesión 29.

```ts
// src/ordenes/application/sagas/ordenes.saga.ts
import { Injectable } from '@nestjs/common';
import { ICommand, ofType, Saga } from '@nestjs/cqrs';
import { Observable, map } from 'rxjs';

@Injectable()
export class OrdenesSagas {
  // Cuando se crea una orden → reservar stock (contexto Inventario del monolito modular)
  @Saga()
  ordenCreada = (eventos$: Observable<any>): Observable<ICommand> =>
    eventos$.pipe(
      ofType(OrdenCreadaEvent),
      map((e) => new ReservarStockCommand(e.ordenId, e.lineas)),
    );

  // Cuando falla la reserva → cancelar la orden (compensación)
  @Saga()
  reservaFallida = (eventos$: Observable<any>): Observable<ICommand> =>
    eventos$.pipe(
      ofType(ReservaStockFallidaEvent),
      map((e) => new CancelarOrdenCommand(e.ordenId, 'Sin stock')),
    );
}
```

### 5.6 El módulo: el único lugar que conoce los adaptadores

```ts
// src/ordenes/ordenes.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([OrdenOrmEntity, LineaOrdenOrmEntity]), HttpModule],
  controllers: [OrdenesController],
  providers: [
    // Casos de uso
    CrearOrdenHandler, PagarOrdenHandler, CancelarOrdenHandler, ObtenerOrdenHandler,
    // Eventos y sagas
    OrdenesResumenProjection, OrdenesSagas, CqrsErrorLogger,
    // Puertos → adaptadores (cambiar Stripe por otro = cambiar UNA línea)
    { provide: OrdenRepository, useClass: TypeOrmOrdenRepository },
    { provide: CatalogoPort, useClass: CatalogoLocalAdapter },       // o CatalogoHttpAdapter si Catálogo es otro servicio
    { provide: PasarelaPagosPort, useClass: StripePagosAdapter },
  ],
})
export class OrdenesModule {}
```

### 5.7 Testear el núcleo sin Nest

El premio de todo esto: las reglas de negocio se prueban con objetos en memoria, en milisegundos.

```ts
// src/ordenes/domain/orden.aggregate.spec.ts
describe('Orden', () => {
  const linea = (id: number, cant = 1, precio = 1000) => new LineaOrden(id, cant, Dinero.de(precio));

  it('calcula el total y registra OrdenCreadaEvent', () => {
    const orden = Orden.crear('o-1', 7, [linea(1, 2, 1500), linea(2, 1, 500)]);
    expect(orden.total().equals(Dinero.de(3500))).toBe(true);
    expect(orden.getUncommittedEvents()[0]).toBeInstanceOf(OrdenCreadaEvent);
  });

  it('no permite pagar una orden cancelada', () => {
    const orden = Orden.crear('o-1', 7, [linea(1)]);
    orden.cancelar('cliente');
    expect(() => orden.pagar('ref')).toThrow(DomainError);
  });
});

// Handler con fakes en memoria (sin TypeORM, sin HTTP)
class OrdenRepositoryEnMemoria extends OrdenRepository {
  readonly guardadas = new Map<string, Orden>();
  async porId(id: string) { return this.guardadas.get(id) ?? null; }
  async guardar(o: Orden) { this.guardadas.set(o.id, o); }
}
```

---

## 6. Event Sourcing (en una sección, a propósito)

En vez de guardar el estado actual, se guarda la **secuencia de eventos** y el estado se reconstruye reproduciéndolos. `AggregateRoot` lo soporta: `apply(evento)` busca un método `on<NombreDelEvento>` en el agregado y lo ejecuta, y `loadFromHistory(eventos)` reproduce la historia sin volver a registrarlos.

Ejemplo: `pagar()` valida y llama `this.apply(new OrdenPagadaEvent(...))`; la mutación ocurre en `onOrdenPagadaEvent(e) { this.estado = 'PAGADA'; }`, y para rehidratar haces `new Orden(id).loadFromHistory(eventosDelStore)`.

Ventajas: auditoría completa, viajar en el tiempo, nuevas proyecciones desde la historia. Costos: versionado de eventos para siempre, snapshots, consultas solo vía proyecciones, curva de aprendizaje alta. **Úsalo solo cuando la historia es el negocio** (contabilidad, ledger, logística con trazabilidad legal).

---

## 7. Cuándo usar qué (el criterio senior)

| Situación | Recomendación |
|---|---|
| CRUD de categorías, configuración, catálogos simples | Controller → service → repositorio ORM. Nada de esta sesión |
| Dominio con reglas y estados (órdenes, pagos, reservas) | Agregados ricos + casos de uso + puertos para dependencias externas |
| Lecturas muy distintas de las escrituras (dashboards, búsquedas) | CQRS: query handlers con SQL directo o proyecciones |
| Varios equipos, contextos claros | Bounded contexts como módulos (monolito modular); extraer servicios después |
| Auditoría legal, historia como fuente de verdad | Event sourcing |
| Proyecto nuevo, dominio aún confuso | Empieza simple, con módulos bien delimitados; refactoriza cuando aparezcan las reglas |

> ⚠️ **Sobre-ingeniería**: CQRS + DDD + hexagonal sobre un CRUD produce 6 archivos para guardar un nombre, sin ganar nada. La arquitectura se aplica **por módulo**, no por proyecto: el módulo `Órdenes` puede ser hexagonal con CQRS mientras `Categorías` es un CRUD directo.

> 💡 Alternativa popular: **Vertical Slice Architecture**. Organiza por feature (`crear-orden/` con su request, handler, validación y test) en vez de por capa técnica. Combina muy bien con `@nestjs/cqrs`: cada command/query es un slice.

> ❓ **Entrevista**: *"¿Cómo le explicarías a un junior por qué no usamos CQRS en todos los módulos?"* → Porque cada patrón tiene un costo en archivos, indirección y curva de aprendizaje, y solo se paga si resuelve un problema presente: invariantes complejas (DDD), lecturas con forma o carga distinta de las escrituras (CQRS), dependencias externas volátiles o tests del núcleo sin infraestructura (hexagonal). Un CRUD no tiene esos problemas.

---

## Resumen mental de la sesión

```
Regla de dependencia: Presentación/Infra → Aplicación → Dominio (nunca al revés)
Puerto = interfaz del núcleo (clase abstracta o Symbol como token)
Adaptador = implementación (TypeORM, HTTP, Stripe); se conectan SOLO en el módulo

DDD estratégico: lenguaje ubicuo, bounded contexts, context map, anti-corruption layer
DDD táctico:
  Value Object → inmutable, validado, igualdad por valor (Dinero, no number)
  Entidad → identidad | Agregado → unidad de consistencia, raíz única, invariantes dentro
  1 transacción = 1 agregado · referencias por id · agregados pequeños · repo por agregado
  Crear con fábrica (emite eventos) vs reconstituir (no emite)

@nestjs/cqrs: CqrsModule.forRoot()
  Command<T> + @CommandHandler + ICommandHandler → commandBus.execute() tipado
  Query<T>   + @QueryHandler   → lectura directa, DTOs planos, sin agregado
  AggregateRoot.apply() → publisher.mergeObjectContext(agg) → repo.guardar → agg.commit()
  @EventsHandler → proyecciones/reacciones; errores → UnhandledExceptionBus
  @Saga() = events$.pipe(ofType(E), map(e => new Command())) (coreografía intra-proceso)
  EventBus en memoria → eventos entre servicios por Outbox (Sesión 29)
Event sourcing: on<Evento>() + loadFromHistory(); solo si la historia ES el negocio
Aplica por MÓDULO; CRUD simple = sin nada de esto
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué es la regla de dependencia y cómo la aplicas en Nest si las interfaces no existen en runtime?
2. ❓ ¿Qué es un puerto y un adaptador? Da un ejemplo primario y uno secundario.
3. ❓ ¿Qué es un modelo anémico y por qué es un problema?
4. ❓ Diferencia entre entidad, value object y agregado. ¿Por qué `Dinero` debería ser un value object?
5. ❓ Enumera las reglas de diseño de agregados. ¿Por qué "una transacción, un agregado"?
6. ❓ ¿Qué es un bounded context y qué relación tiene con los microservicios?
7. ❓ ¿Qué es CQRS? ¿Implica dos bases de datos o event sourcing?
8. ❓ Explica el flujo `apply` → `mergeObjectContext` → `guardar` → `commit`. ¿Qué pasa si el proceso muere entre `guardar` y `commit`?
9. ❓ ¿Qué pasa si un `EventsHandler` lanza una excepción? ¿Cómo te enteras?
10. ❓ ¿Qué es una `@Saga()` en `@nestjs/cqrs` y en qué se diferencia de una saga entre microservicios?
11. ❓ ¿Qué es event sourcing y cuándo lo usarías?
12. ❓ ¿Cuándo NO aplicarías DDD/CQRS/hexagonal? ¿Qué es vertical slice architecture?

## Ejercicio práctico
1. Instala `@nestjs/cqrs` y registra `CqrsModule.forRoot()` en `AppModule`.
2. Reorganiza el módulo `ordenes` de TiendaApi en `domain/`, `application/`, `infrastructure/` y `presentation/`. Deja `categorias` como CRUD simple a propósito.
3. Crea los value objects `Dinero` y `Cantidad` con tests unitarios (suma, monedas distintas, negativos).
4. Implementa el agregado `Orden` con `crear`, `reconstituir`, `pagar`, `cancelar` y `total`, sin setters públicos. Escribe tests del dominio sin `Test.createTestingModule`.
5. Define los puertos `OrdenRepository` y `CatalogoPort` como clases abstractas; implementa `TypeOrmOrdenRepository` (con mapper y concurrencia optimista por `version`) y un `CatalogoLocalAdapter`.
6. Implementa `CrearOrdenCommand extends Command<{ ordenId: string }>`, su handler y el controller delgado. Verifica que el tipo de `commandBus.execute(...)` se infiere solo.
7. Implementa `ObtenerOrdenQuery` con SQL directo y un `ListarOrdenesQuery` paginado (Sesión 17).
8. Crea la proyección `OrdenesResumenProjection` que mantiene `resumen_cliente` y un `CqrsErrorLogger` con `UnhandledExceptionBus`. Haz fallar la proyección a propósito y comprueba que el `POST` responde `201` y el error se loguea.
9. Implementa la `@Saga()` `ordenCreada → ReservarStockCommand` y `ReservaStockFallidaEvent → CancelarOrdenCommand`, y prueba el flujo de compensación con un producto sin stock.
10. Escribe un `DomainExceptionFilter` que mapee `DomainError → 422` y `ConcurrenciaError → 409`, y prueba dos `PATCH` concurrentes sobre la misma orden.
11. (Opcional) Agrega `dependency-cruiser` con una regla que prohíba importar `infrastructure/` desde `domain/` y rompe el build a propósito para verla funcionar.

---

➡️ **Cuando termines**, marca la Sesión 30 en el [README](README.md) y pasa a la **Sesión 31 — Monorepos: Nest workspaces, Nx y librerías compartidas**.

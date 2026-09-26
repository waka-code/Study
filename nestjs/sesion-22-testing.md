# Sesión 22 — Testing: unit, integración y e2e con Jest y Supertest

> **Objetivo de la sesión**: escribir tests que den **confianza real** sin volverse frágiles. Al terminar deberías poder explicar la pirámide (y el "trofeo") de testing aplicada a Nest, usar `Test.createTestingModule` para aislar providers, mockear dependencias con `useValue`/`useMocker`, sobrescribir guards, interceptors y módulos, testear pipes, guards y filters de forma aislada, levantar la app completa con Supertest para tests e2e, correr tests de integración contra una base de datos real con Testcontainers, y organizar la configuración de Jest (unit vs e2e, cobertura, fake timers).

---

## 1. ¿Por qué testear y qué testear?

Un test no existe para subir un porcentaje de cobertura: existe para que puedas **cambiar el código sin miedo**. Un buen test falla cuando rompes un comportamiento y **no** falla cuando solo reorganizas el código (refactor). Un test que se rompe con cada refactor es un costo, no un activo.

```
                 ▲  lento, caro, frágil, alta confianza
                ╱ ╲
               ╱E2E╲          Supertest contra la app completa (+ DB real)
              ╱─────╲
             ╱ Integ. ╲       Módulo real + DB/Redis reales (Testcontainers)
            ╱──────────╲
           ╱    Unit     ╲    Service/pipe/guard aislado, dependencias mockeadas
          ╱───────────────╲
                 ▼  rápido, barato, estable, confianza parcial
```

| Tipo | Qué prueba | Dependencias | Velocidad | Cuándo brilla |
|---|---|---|---|---|
| **Unit** | Una clase/función | Mocks | ms | Reglas de negocio, cálculos, ramas de error |
| **Integración** | Varias piezas reales juntas | DB/cola reales en contenedor | 100s de ms | Queries, repositorios, transacciones, mapeos ORM |
| **E2E** | La API por HTTP | App completa | segundos | Contrato HTTP: rutas, validación, auth, serialización, status codes |

> ❓ **Entrevista**: *"¿Pirámide o trofeo de testing?"* → La pirámide clásica pide muchos unit y pocos e2e. El "testing trophy" (Kent C. Dodds) pone el peso en **integración**, porque es donde se rompen las cosas reales (queries, wiring de DI, validación). En un backend Nest típico, lo sensato es: unit para lógica de dominio con ramas, integración para repositorios y casos de uso con la DB real, y un set de e2e que cubra el contrato HTTP de los flujos críticos. Evita mockear lo que no es tuyo (el ORM) en tests que pretenden validar queries.

---

## 2. El setup que trae Nest

`nest new` configura Jest + ts-jest + Supertest:

```jsonc
// package.json (extracto)
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",          // unit: *.spec.ts junto al código
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

```jsonc
// test/jest-e2e.json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",               // e2e: test/*.e2e-spec.ts
  "transform": { "^.+\\.(t|j)s$": "ts-jest" }
}
```

Convención: `*.spec.ts` al lado del archivo (unit), `test/*.e2e-spec.ts` (e2e) y, si quieres separarlos, `*.int-spec.ts` con su propia config (integración).

> ⚠️ Si usas **path aliases** (`@common/...` en `tsconfig.json`), Jest no los entiende solo: agrega `moduleNameMapper` (`"^@common/(.*)$": "<rootDir>/common/$1"`). Error típico: "Cannot find module '@common/...'" solo en tests.

> 💡 `ts-jest` hace type-checking y es lento en suites grandes. Alternativas: `@swc/jest` como transform (mucho más rápido) o **Vitest** con `unplugin-swc` (necesario porque esbuild no emite `emitDecoratorMetadata`, del que depende la DI de Nest).

---

## 3. Unit tests de un service

### 3.1 El servicio a probar

```typescript
// src/ordenes/ordenes.service.ts
@Injectable()
export class OrdenesService {
  constructor(
    private readonly productos: ProductosService,
    @InjectRepository(Orden) private readonly repo: Repository<Orden>,
    private readonly eventos: EventEmitter2,
  ) {}

  async crear(usuarioId: number, dto: CrearOrdenDto): Promise<Orden> {
    if (dto.items.length === 0) throw new BadRequestException('La orden no tiene items');

    let total = 0;
    for (const item of dto.items) {
      const p = await this.productos.buscar(item.productoId);   // lanza NotFound si no existe
      if (p.stock < item.cantidad) {
        throw new ConflictException(`Stock insuficiente para ${p.nombre}`);
      }
      total += p.precio * item.cantidad;
    }

    const orden = await this.repo.save(this.repo.create({ usuarioId, total, estado: 'pendiente' }));
    this.eventos.emit('orden.creada', { ordenId: orden.id, usuarioId, total });
    return orden;
  }
}
```

### 3.2 Opción A: sin Nest (instanciar a mano)

Si el servicio solo recibe dependencias por constructor, **no necesitas** el contenedor de Nest para un unit test:

```typescript
const productos = { buscar: jest.fn() } as unknown as jest.Mocked<ProductosService>;
const service = new OrdenesService(productos, repoMock, eventosMock);
```

Es el test más rápido posible. Pierdes la verificación del wiring de DI (que igual cubrirás en integración/e2e).

### 3.3 Opción B: `Test.createTestingModule`

```typescript
// src/ordenes/ordenes.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('OrdenesService', () => {
  let service: OrdenesService;
  let productos: jest.Mocked<Pick<ProductosService, 'buscar'>>;
  let repo: { create: jest.Mock; save: jest.Mock };
  let eventos: { emit: jest.Mock };

  beforeEach(async () => {
    productos = { buscar: jest.fn() };
    repo = {
      create: jest.fn((x) => x),                          // devuelve lo que recibe
      save: jest.fn(async (x) => ({ id: 1, ...x })),      // simula el INSERT
    };
    eventos = { emit: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        OrdenesService,                                   // la clase REAL bajo prueba
        { provide: ProductosService, useValue: productos },
        { provide: getRepositoryToken(Orden), useValue: repo },   // token del @InjectRepository
        { provide: EventEmitter2, useValue: eventos },
      ],
    }).compile();

    service = moduleRef.get(OrdenesService);
  });

  it('calcula el total y emite orden.creada', async () => {
    productos.buscar
      .mockResolvedValueOnce({ id: 1, nombre: 'Teclado', precio: 1000, stock: 5 } as any)
      .mockResolvedValueOnce({ id: 2, nombre: 'Mouse', precio: 500, stock: 5 } as any);

    const orden = await service.crear(7, {
      items: [{ productoId: 1, cantidad: 2 }, { productoId: 2, cantidad: 1 }],
    });

    expect(orden.total).toBe(2500);
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: 7, total: 2500 }));
    expect(eventos.emit).toHaveBeenCalledWith('orden.creada', { ordenId: 1, usuarioId: 7, total: 2500 });
  });

  it('rechaza si no hay stock y NO guarda', async () => {
    productos.buscar.mockResolvedValue({ id: 1, nombre: 'Teclado', precio: 1000, stock: 1 } as any);

    await expect(service.crear(7, { items: [{ productoId: 1, cantidad: 3 }] }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(repo.save).not.toHaveBeenCalled();
    expect(eventos.emit).not.toHaveBeenCalled();
  });

  it('propaga NotFound del producto', async () => {
    productos.buscar.mockRejectedValue(new NotFoundException());
    await expect(service.crear(7, { items: [{ productoId: 99, cantidad: 1 }] }))
      .rejects.toThrow(NotFoundException);
  });
});
```

Puntos clave:
- `Test.createTestingModule` recibe la **misma** forma que `@Module()`. `compile()` resuelve el grafo de DI igual que en producción.
- Los tokens deben coincidir: `@InjectRepository(Orden)` usa `getRepositoryToken(Orden)`; `@InjectModel(Producto.name)` usa `getModelToken(Producto.name)`; un `@Inject('PAGOS')` usa `'PAGOS'`.
- `beforeEach` crea mocks nuevos por test → sin estado compartido entre tests.

> ⚠️ `moduleRef.get()` **no** sirve para providers con scope `REQUEST` o `TRANSIENT` (lanza error). Usa `await moduleRef.resolve(Clase)` (Sesión 23).

> ⚠️ `expect(promesa).rejects` sin `await` (o sin `return`) hace que el test **pase siempre**: Jest termina antes de que la promesa se rechace. Siempre `await expect(...).rejects...`.

### 3.4 Automocking con `useMocker`

Cuando un servicio tiene 6 dependencias y solo te importan 2, declarar todos los mocks es ruido. `useMocker` genera un mock para cada token **no** declarado:

```typescript
import { createMock } from '@golevelup/ts-jest';

const moduleRef = await Test.createTestingModule({ providers: [OrdenesService] })
  .useMocker((token) => {
    if (token === ProductosService) return { buscar: jest.fn() };
    return createMock(); // mock profundo para todo lo demás (repo, eventos, ...)
  })
  .compile();

const productos = moduleRef.get(ProductosService);
```

> ⚠️ `useMocker` es cómodo pero oculta dependencias: si el servicio acumula 10 dependencias, el test no te lo hará notar. Esa "fricción" de escribir mocks es una señal de diseño útil.

---

## 4. Qué mockear y qué no

| Mockea | No mockees |
|---|---|
| Servicios externos (pasarela de pagos, email, S3) | La clase bajo prueba |
| Reloj (`jest.useFakeTimers`) y aleatoriedad | Value objects, DTOs, funciones puras |
| Otros servicios propios en un unit test | El ORM en un test que quiere validar la query |
| Colas/eventos en unit tests (verificas que se emitió) | Todo "por si acaso" |

**Stub vs mock vs spy**:
- **Stub**: devuelve datos preparados (`mockResolvedValue`). Te interesa el *estado* resultante.
- **Mock**: verificas la *interacción* (`toHaveBeenCalledWith`).
- **Spy**: envuelves un método real (`jest.spyOn(obj, 'metodo')`), opcionalmente reemplazándolo.

> ❓ **Entrevista**: *"¿Qué problema tienen los tests con demasiados mocks?"* → Se acoplan a la **implementación** (qué métodos se llaman y en qué orden) en vez de al **comportamiento**. Cualquier refactor los rompe aunque el sistema funcione, y pueden pasar aunque la integración real esté rota (el mock "miente": devuelve algo que el repositorio real nunca devolvería). Por eso se complementan con tests de integración.

---

## 5. Testear piezas del request lifecycle de forma aislada

### 5.1 Pipes (funciones puras en la práctica)

```typescript
// src/common/pipes/parse-slug.pipe.spec.ts
describe('ParseSlugPipe', () => {
  const pipe = new ParseSlugPipe();
  const meta = { type: 'param', data: 'slug' } as ArgumentMetadata;

  it('normaliza a minúsculas', () => {
    expect(pipe.transform('Teclado-Mecanico', meta)).toBe('teclado-mecanico');
  });

  it('rechaza caracteres inválidos', () => {
    expect(() => pipe.transform('hola mundo!', meta)).toThrow(BadRequestException);
  });
});
```

### 5.2 DTOs + ValidationPipe

Testear el DTO con el `ValidationPipe` real prueba exactamente lo que verá la API:

```typescript
import { ValidationPipe } from '@nestjs/common';

describe('CrearProductoDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const meta = { type: 'body', metatype: CrearProductoDto } as const;

  it('rechaza precio negativo', async () => {
    await expect(pipe.transform({ nombre: 'Mouse', precio: -1, categoriaId: 1 }, meta))
      .rejects.toThrow(BadRequestException);
  });

  it('rechaza propiedades no declaradas (over-posting)', async () => {
    await expect(pipe.transform({ nombre: 'Mouse', precio: 10, categoriaId: 1, esAdmin: true }, meta))
      .rejects.toThrow(BadRequestException);
  });
});
```

### 5.3 Guards: fabricar un `ExecutionContext`

```typescript
// src/auth/guards/roles.guard.spec.ts
import { Reflector } from '@nestjs/core';
import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext } from '@nestjs/common';

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const contextoCon = (user: unknown) =>
    createMock<ExecutionContext>({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    });

  it('permite si la ruta no declara roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(contextoCon({ rol: 'cliente' }))).toBe(true);
  });

  it('bloquea a un cliente en ruta de admin', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    expect(guard.canActivate(contextoCon({ rol: 'cliente' }))).toBe(false);
  });
});
```

`createMock<ExecutionContext>()` evita escribir a mano la interfaz entera (`getHandler`, `getClass`, `switchToHttp`...). Sin librería, un objeto con `as unknown as ExecutionContext` también sirve.

### 5.4 Interceptors: probar el Observable

```typescript
describe('TimeoutInterceptor', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('lanza RequestTimeoutException si el handler tarda más de 5s', async () => {
    const interceptor = new TimeoutInterceptor(5000);
    const next: CallHandler = { handle: () => new Observable(() => {}) }; // nunca emite

    const resultado = lastValueFrom(interceptor.intercept(createMock<ExecutionContext>(), next));
    jest.advanceTimersByTime(5001);

    await expect(resultado).rejects.toBeInstanceOf(RequestTimeoutException);
  });
});
```

### 5.5 Exception filters

```typescript
describe('HttpExceptionFilter', () => {
  it('responde con el formato estándar', () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host = createMock<ArgumentsHost>({
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/api/v1/productos/9' }),
      }),
    });

    new HttpExceptionFilter().catch(new NotFoundException('Producto 9 no encontrado'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 404, message: 'Producto 9 no encontrado', path: '/api/v1/productos/9',
    }));
  });
});
```

---

## 6. Tests de controller: ¿valen la pena?

Un unit test de controller con el servicio mockeado suele probar poco: el controller solo delega. Lo que realmente importa del controller (routing, pipes, guards, status codes, serialización) **no se ejecuta** cuando llamas `controller.buscar(1)` directamente: esos componentes los aplica el *router* de Nest, no el método.

```typescript
// Esto NO ejecuta ParseIntPipe, ni guards, ni ValidationPipe, ni el serializador
const res = await controller.buscar(1);
```

Por eso, para controllers, prefiere **e2e con Supertest**: prueban la pieza en su contexto real.

> ❓ **Entrevista**: *"¿Por qué un test que llama al método del controller no detecta un `@UseGuards` olvidado?"* → Porque guards, pipes, interceptors y filters son aplicados por el **router/`RouterExecutionContext`** de Nest al despachar la request HTTP. Llamar el método directamente es llamar una función de TypeScript: no hay pipeline. Para verificar esas capas necesitas un test HTTP (e2e).

---

## 7. Tests e2e con Supertest

### 7.1 El problema de `main.ts`

`main.ts` configura cosas globales (`ValidationPipe`, prefijo, versionado, filtros). Si el test crea la app con `createNestApplication()` pero no repite esa configuración, **pruebas una app distinta** de la de producción. Solución: extrae la configuración a una función compartida.

```typescript
// src/configurar-app.ts
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';

export function configurarApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  return app;
}

// src/main.ts
const app = configurarApp(await NestFactory.create(AppModule));
await app.listen(3000);
```

> 💡 Lo registrado vía `APP_PIPE`, `APP_GUARD`, `APP_INTERCEPTOR`, `APP_FILTER` en un módulo **sí** viaja con el `AppModule` al test automáticamente. Es otra razón para preferir esa forma frente a `app.useGlobal*` (Sesiones 9–12).

### 7.2 Un e2e completo

```typescript
// test/productos.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';                  // requiere esModuleInterop (plantilla de Nest 11)
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/configurar-app';

describe('Productos (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PagosService).useValue({ cobrar: jest.fn().mockResolvedValue({ ok: true }) })
      .compile();

    app = configurarApp(moduleRef.createNestApplication());
    await app.init();                              // inicializa sin escuchar en un puerto
  });

  afterAll(async () => {
    await app.close();                             // cierra conexiones → Jest no queda colgado
  });

  it('GET /api/v1/productos/:id → 400 si el id no es numérico', () => {
    return request(app.getHttpServer())
      .get('/api/v1/productos/abc')
      .expect(400);
  });

  it('POST /api/v1/productos → 401 sin token', () => {
    return request(app.getHttpServer())
      .post('/api/v1/productos')
      .send({ nombre: 'Mouse', precio: 9990, categoriaId: 1 })
      .expect(401);
  });

  it('POST /api/v1/productos → 201 como admin y sin campos internos', async () => {
    const token = await loginComo(app, 'admin@tienda.cl');   // helper de test/utils (ver 7.3)

    const res = await request(app.getHttpServer())
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Mouse', precio: 9990, categoriaId: 1 })
      .expect(201);

    expect(res.body).toMatchObject({ id: expect.any(Number), nombre: 'Mouse', precio: 9990 });
    expect(res.body).not.toHaveProperty('costoInterno');    // serialización (Sesión 21)
  });

  it('POST con propiedad extra → 400 (forbidNonWhitelisted)', async () => {
    const token = await loginComo(app, 'admin@tienda.cl');
    await request(app.getHttpServer())
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Mouse', precio: 9990, categoriaId: 1, destacado: true })
      .expect(400);
  });
});
```

> ⚠️ `import * as request from 'supertest'` era el estilo de plantillas antiguas. Con `esModuleInterop: true` (plantilla actual) usa `import request from 'supertest'`. Mezclar ambos da "request is not a function".

> ⚠️ "Jest did not exit one second after the test run has completed": casi siempre falta `await app.close()`, o hay un `setInterval`/conexión a Redis que no se cierra. `--detectOpenHandles` te dice cuál.

### 7.3 Sobrescribir piezas en el TestingModule

```typescript
const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(EmailService).useValue({ enviar: jest.fn() })      // servicio externo
  .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })  // saltar auth
  .overrideInterceptor(CacheInterceptor).useValue({ intercept: (_c, n) => n.handle() })
  .overridePipe(ParseSlugPipe).useClass(ParseSlugPipeFalso)
  .overrideFilter(HttpExceptionFilter).useValue(new FiltroQueLogea())
  .overrideModule(RedisModule).useModule(RedisFalsoModule)            // módulo entero (Nest 10+)
  .compile();
```

> ⚠️ `overrideGuard` solo funciona para guards referenciados por **clase** en `@UseGuards(JwtAuthGuard)` o registrados como provider. Si el guard global se registró con `app.useGlobalGuards(new JwtAuthGuard())`, no está en el contenedor y no se puede sobrescribir. Si es global vía `APP_GUARD`, regístralo como `{ provide: APP_GUARD, useExisting: JwtAuthGuard }` junto a `JwtAuthGuard` como provider normal: así puedes hacer `.overrideProvider(JwtAuthGuard)` en el test.

Para autenticación, en vez de saltarte el guard, suele ser más valioso **generar un token real** con el mismo `JwtService` de la app: así también pruebas la estrategia de Passport.

```typescript
// test/utils/auth.ts
export async function tokenPara(app: INestApplication, payload: { sub: number; rol: string }) {
  const jwt = app.get(JwtService);
  return jwt.signAsync(payload);
}
```

---

## 8. Integración con una base de datos real: Testcontainers

SQLite en memoria "para tests" y PostgreSQL en producción no se comportan igual (tipos, constraints, `ILIKE`, JSONB, locks). Si tu test debe validar la persistencia, usa **la misma base** que producción en un contenedor efímero.

```bash
npm i -D @testcontainers/postgresql
```

```typescript
// test/utils/postgres.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

export async function iniciarPostgres(): Promise<StartedPostgreSqlContainer> {
  // Descarga y levanta postgres:16 en un puerto aleatorio (requiere Docker)
  return new PostgreSqlContainer('postgres:16-alpine').start();
}
```

```typescript
// src/ordenes/ordenes.int-spec.ts
describe('OrdenesService (integración)', () => {
  let pg: StartedPostgreSqlContainer;
  let moduleRef: TestingModule;
  let service: OrdenesService;
  let dataSource: DataSource;

  beforeAll(async () => {
    pg = await iniciarPostgres();
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: pg.getConnectionUri(),
          autoLoadEntities: true,
          synchronize: true,      // OK en tests; en prod usa migraciones (Sesión 17)
        }),
        OrdenesModule,
      ],
    })
      .overrideProvider(EventEmitter2).useValue({ emit: jest.fn() })
      .compile();

    service = moduleRef.get(OrdenesService);
    dataSource = moduleRef.get(DataSource);
  }, 60_000);                    // la primera descarga de la imagen tarda

  afterAll(async () => {
    await moduleRef.close();
    await pg.stop();
  });

  beforeEach(async () => {
    // Estado limpio por test: vaciar tablas (más rápido que recrear el contenedor)
    await dataSource.query('TRUNCATE orden, producto, categoria RESTART IDENTITY CASCADE');
  });

  it('persiste la orden con el total correcto', async () => {
    const cat = await dataSource.getRepository(Categoria).save({ nombre: 'Periféricos' });
    await dataSource.getRepository(Producto).save({ nombre: 'Mouse', precio: 500, stock: 3, categoria: cat });

    const orden = await service.crear(1, { items: [{ productoId: 1, cantidad: 2 }] });

    const enDb = await dataSource.getRepository(Orden).findOneByOrFail({ id: orden.id });
    expect(enDb.total).toBe(1000);
  });
});
```

Estrategias de aislamiento de datos:

| Estrategia | Cómo | Pros | Contras |
|---|---|---|---|
| `TRUNCATE` por test | `beforeEach` | Simple, robusto | Algo más lento |
| Transacción + rollback | Envolver cada test | Muy rápido | No sirve si el código abre sus propias transacciones o usa otra conexión |
| Contenedor por suite | `beforeAll` | Aislamiento total | Lento |
| Datos únicos por test | emails/IDs aleatorios | Tests paralelos sin limpiar | Tablas crecen; asserts más cuidadosos |

> ⚠️ Jest corre archivos **en paralelo** (workers). Si varias suites comparten la misma base y hacen `TRUNCATE`, se pisan. Usa un contenedor por archivo, una base por worker (`process.env.JEST_WORKER_ID`) o `--runInBand` para integración.

---

## 9. Tiempo, aleatoriedad y asincronía

```typescript
// Congelar el reloj para lógica dependiente de fechas (expiración de carritos, tokens)
beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-09-25T10:00:00Z') });
});
afterEach(() => jest.useRealTimers());

it('marca el carrito como expirado tras 30 minutos', () => {
  const carrito = new Carrito(new Date());
  jest.advanceTimersByTime(31 * 60_000);
  expect(carrito.expirado()).toBe(true);
});
```

Mejor aún a nivel de diseño: inyecta un `Reloj` en vez de llamar a `new Date()` directamente, y en tests provee `{ provide: Reloj, useValue: { ahora: () => fechaFija } }`. Es DI usada para testabilidad (Sesión 23).

> ⚠️ Fake timers + promesas: `advanceTimersByTime` ejecuta callbacks de timers, pero las promesas que esos callbacks encadenan se resuelven en microtareas. Usa `await jest.advanceTimersByTimeAsync(ms)` cuando el código mezcla `setTimeout` y `await`.

---

## 10. Cobertura y organización

```bash
npm run test:cov
```

```jsonc
// package.json → jest
"coverageThreshold": {
  "global": { "branches": 70, "functions": 80, "lines": 80, "statements": 80 }
},
"coveragePathIgnorePatterns": ["main.ts", ".module.ts", ".dto.ts", "/migrations/"]
```

- La cobertura mide **qué líneas se ejecutaron**, no si los asserts son buenos. 100% de cobertura con `expect(true).toBe(true)` es posible.
- Prioriza **cobertura de ramas** en la lógica de dominio.
- Excluye archivos sin lógica (módulos, DTOs, `main.ts`).

Estructura sugerida de TiendaApi:

```
src/
  ordenes/
    ordenes.service.ts
    ordenes.service.spec.ts        ← unit
    ordenes.int-spec.ts            ← integración (Postgres real)
test/
  jest-e2e.json
  jest-int.json
  utils/ auth.ts, postgres.ts, factories.ts
  productos.e2e-spec.ts            ← contrato HTTP
  ordenes.e2e-spec.ts
```

**Factories de datos** evitan tests con 20 líneas de setup:

```typescript
// test/utils/factories.ts
let secuencia = 0;
export const unProducto = (over: Partial<Producto> = {}): Partial<Producto> => ({
  nombre: `Producto ${++secuencia}`,
  precio: 1000,
  stock: 10,
  ...over,                          // el test solo declara lo que le importa
});
```

> ❓ **Entrevista**: *"¿Qué hace que un test sea bueno?"* → Es **determinista** (no depende del reloj, del orden ni de la red), **aislado** (no comparte estado con otros), **rápido** en proporción a su nivel, **legible** (Arrange-Act-Assert, un comportamiento por test, nombre que describe el comportamiento) y **resistente a refactors** (verifica comportamiento observable, no detalles internos).

---

## 11. Tests en CI

```yaml
# .github/workflows/ci.yml (extracto)
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --ci --coverage
      - run: npm run test:int -- --ci --runInBand    # Testcontainers: el runner trae Docker
      - run: npm run test:e2e -- --ci
```

El despliegue completo (Docker, pipelines, entornos) se ve en la **Sesión 34**.

---

## Resumen mental de la sesión

```
Test bueno = falla si rompes comportamiento, NO si refactorizas

Unit  → clase aislada, mocks, ms           (lógica de dominio, ramas)
Integ → módulo real + DB real (Testcontainers)   (queries, transacciones)
E2E   → Supertest sobre la app completa    (rutas, pipes, guards, status, shape)

Test.createTestingModule({ providers | imports }).compile()
  moduleRef.get(X)        ← singleton    |  await moduleRef.resolve(X) ← REQUEST/TRANSIENT
  { provide: Token, useValue: mock }     tokens: getRepositoryToken(E), getModelToken(n)
  .useMocker(createMock)  ← automock de lo no declarado
  .overrideProvider/Guard/Interceptor/Pipe/Filter().useValue|useClass
  .overrideModule(M).useModule(Falso)

Llamar controller.metodo() NO ejecuta guards/pipes/interceptors → usa e2e
E2E: configurarApp(app) compartido con main.ts · app.init() · app.close()
     request(app.getHttpServer()).post(...).set(...).send(...).expect(201)
Siempre: await expect(p).rejects... · fake timers (+ Async) · un reloj inyectable
Jest paralelo + DB compartida = tests que se pisan → runInBand / DB por worker
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ Explica la pirámide de testing y el "testing trophy". ¿Cómo distribuirías los tests en una API Nest?
2. ❓ ¿Qué hace `Test.createTestingModule(...).compile()` y en qué se parece a un `@Module`?
3. ❓ ¿Cómo mockeas un repositorio inyectado con `@InjectRepository(Producto)`?
4. ❓ `moduleRef.get()` vs `moduleRef.resolve()`: ¿cuándo cada uno?
5. ❓ ¿Qué es `useMocker` y cuál es su riesgo de diseño?
6. ❓ ¿Por qué un unit test de controller no detecta un guard mal configurado?
7. ❓ ¿Cómo evitas que tu test e2e pruebe una app configurada distinto a producción?
8. ❓ ¿Qué permite `overrideGuard` y cuándo no funciona?
9. ❓ ¿Por qué usar Testcontainers en vez de SQLite en memoria?
10. ❓ ¿Cómo aíslas los datos entre tests de integración? ¿Qué pasa con Jest en paralelo?
11. ❓ ¿Por qué un test con `expect(promesa).rejects` puede pasar siempre?
12. ❓ ¿Qué mide la cobertura y qué no? ¿Qué umbral pondrías y dónde?

## Ejercicio práctico
1. Escribe `ordenes.service.spec.ts` con `Test.createTestingModule` cubriendo: total correcto, sin items (400), sin stock (409, sin `save` ni `emit`), producto inexistente (404).
2. Reescribe el mismo test instanciando el servicio con `new` (sin Nest) y compara tiempos con `--verbose`.
3. Prueba `CrearProductoDto` con un `ValidationPipe` real: precio negativo, nombre corto y propiedad extra.
4. Testea `RolesGuard` con `createMock<ExecutionContext>()` y `jest.spyOn(reflector, 'getAllAndOverride')`.
5. Extrae `configurarApp()` de `main.ts` y úsala en `test/productos.e2e-spec.ts`. Cubre 400 (id inválido), 401 (sin token), 403 (cliente), 201 (admin) y verifica que `costoInterno` **no** está en la respuesta.
6. Genera tokens reales con `JwtService` en vez de `overrideGuard` y compara qué capas quedan probadas en cada caso.
7. Instala `@testcontainers/postgresql` y crea `ordenes.int-spec.ts` con `TRUNCATE` en `beforeEach`. Crea `test/jest-int.json` y el script `test:int`.
8. Introduce un `Reloj` inyectable en la lógica de expiración de carritos y testéala con una fecha fija.
9. Agrega `coverageThreshold` y excluye módulos/DTOs; haz que CI falle si baja la cobertura de ramas.

---

➡️ **Cuando termines**, marca la Sesión 22 en el [README](README.md) y pasa a la **Sesión 23 — DI avanzada: custom providers, scopes, dependencias circulares, ModuleRef**.

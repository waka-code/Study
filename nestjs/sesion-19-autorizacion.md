# Sesión 19 — Autorización: roles (RBAC), CASL, policies y ownership

> **Objetivo de la sesión**: decidir *qué* puede hacer un usuario ya autenticado (Sesión 18) y hacerlo sin agujeros. Al terminar deberías poder comparar RBAC, permisos, ABAC y ReBAC; implementar **roles** con `Reflector.createDecorator` y un `RolesGuard`; pasar de roles a **permisos**; resolver la **propiedad de recursos** (ownership) evitando **BOLA**, la vulnerabilidad nº 1 del OWASP API Top 10; modelar reglas con **CASL** (condiciones, permisos por campo, `ForbiddenError`); y filtrar consultas según lo que el usuario puede ver.

---

## 1. Modelos de autorización

Autenticar responde *quién eres*; autorizar responde *¿puede este sujeto hacer esta acción sobre este recurso?*. Toda autorización se reduce a esa tupla:

```
        ¿puede  SUJETO   hacer  ACCIÓN   sobre  RECURSO  (en este CONTEXTO)?
                 │               │                │                │
          usuario 42,      update          orden 17 de       horario, IP,
          rol cliente                      usuario 42,       tenant, plan
                                           estado PENDIENTE
```

| Modelo | Decide según | Ejemplo en TiendaApi | Fortaleza | Debilidad |
|---|---|---|---|---|
| **RBAC** (roles) | Rol del usuario | "Solo `admin` crea categorías" | Simple, auditable | No sabe de *qué* recurso se trata |
| **Permisos** (RBAC fino) | Permisos concretos, agrupados en roles | `productos:crear`, `ordenes:reembolsar` | Roles configurables sin tocar código | Sigue sin mirar el recurso |
| **ABAC** (atributos) | Atributos de sujeto, recurso y contexto | "Cliente puede cancelar **su** orden si está `PENDIENTE`" | Expresivo | Reglas más difíciles de auditar |
| **ReBAC** (relaciones) | Grafo de relaciones | "Miembro del equipo dueño de la tienda" (estilo Google Zanzibar / OpenFGA) | Jerarquías y compartidos | Requiere infraestructura dedicada |

En la práctica se combinan: **RBAC/permisos para funciones** ("¿puedes usar este endpoint?") + **ABAC/ownership para datos** ("¿puedes tocar *este* registro?"). CASL (sección 6) permite expresar ambos con un solo lenguaje.

> ❓ **Entrevista**: *"¿Por qué no basta con roles?"* → Porque el rol responde "¿puede un cliente leer órdenes?", pero no "¿puede el cliente 42 leer la orden 17?". Sin la verificación a nivel de objeto, cualquier cliente lee las órdenes de todos cambiando el id en la URL: eso es **BOLA** (API1 del OWASP API Top 10).

---

## 2. 401, 403 o 404

| Situación | Status | Por qué |
|---|---|---|
| Sin token, token inválido o expirado | **401** | No sabemos quién eres (el nombre "Unauthorized" es histórico: significa *unauthenticated*) |
| Autenticado pero sin permiso para la **función** (cliente llama a `POST /categorias`) | **403** | Sabemos quién eres y no puedes |
| Autenticado, intenta leer un **recurso ajeno** (`GET /ordenes/17` de otro cliente) | **404** (recomendado) o 403 | Un 403 confirma que la orden 17 existe; un 404 no filtra información |

> ⚠️ Ser consistente importa más que la elección: si `GET /ordenes/17` devuelve 404 para ajenas pero 403 en `PATCH /ordenes/17`, has filtrado la existencia igual.

---

## 3. RBAC con decorador y guard

### 3.1 El decorador con `Reflector.createDecorator`

Desde Nest 10 hay una forma **tipada** de crear decoradores de metadata, sin strings mágicos ni `SetMetadata` (Sesión 11):

```typescript
// src/auth/roles/rol.enum.ts
export enum Rol {
  CLIENTE = 'cliente',
  VENDEDOR = 'vendedor',
  SOPORTE = 'soporte',
  ADMIN = 'admin',
}

// src/auth/roles/roles.decorator.ts
import { Reflector } from '@nestjs/core';
import { Rol } from './rol.enum';

// El propio decorador es la clave de metadata: reflector.get(Roles, handler) ya viene tipado como Rol[]
export const Roles = Reflector.createDecorator<Rol[]>();
```

### 3.2 El guard

```typescript
// src/auth/roles/roles.guard.ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from './roles.decorator';
import { UsuarioAutenticado } from '../auth.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    // Método > clase: @Roles en el handler sobrescribe el de la clase
    const requeridos = this.reflector.getAllAndOverride(Roles, [ctx.getHandler(), ctx.getClass()]);
    if (!requeridos || requeridos.length === 0) return true; // la ruta no exige rol

    const user = ctx.switchToHttp().getRequest().user as UsuarioAutenticado | undefined;
    // Si no hay user, el guard de autenticación no corrió antes: error de configuración
    if (!user) throw new ForbiddenException();

    // "Alguno de" (OR). Para "todos" (AND) usa .every
    const ok = requeridos.some((r) => user.roles.includes(r));
    if (!ok) throw new ForbiddenException('No tienes el rol requerido');
    return true;
  }
}
```

```typescript
// src/categorias/categorias.controller.ts
@Controller('categorias')
@Roles([Rol.ADMIN])                     // por defecto, todo el controller exige admin
export class CategoriasController {
  @Public()                             // (Sesión 18) listado público
  @Roles([])                            // anula el rol de la clase para este handler
  @Get()
  listar() { /* ... */ }

  @Post()
  crear(@Body() dto: CrearCategoriaDto) { /* solo admin */ }
}
```

### 3.3 Orden de los guards globales

El `RolesGuard` necesita `request.user`, que deja el `JwtAuthGuard`. Si ambos son globales, regístralos **en el mismo módulo y en orden**:

```typescript
// src/auth/auth.module.ts
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },   // 1º autentica
  { provide: APP_GUARD, useClass: RolesGuard },     // 2º autoriza
],
```

> ⚠️ Los guards globales registrados con `APP_GUARD` en **módulos distintos** se ejecutan en el orden en que Nest resuelve esos módulos, que no siempre es obvio. Mantén autenticación y autorización global en el mismo módulo, o usa `@UseGuards(JwtAuthGuard, RolesGuard)` explícito, donde el orden es el de los argumentos.

> ⚠️ Con el patrón `@Public()`, el `RolesGuard` debe tolerar `user` ausente en rutas públicas. Arriba lo resolvemos porque las rutas públicas no llevan `@Roles` (o llevan `@Roles([])`), así que el guard retorna `true` antes de mirar `user`.

---

## 4. De roles a permisos

Los roles cableados en el código (`@Roles([Rol.ADMIN, Rol.SOPORTE])`) escalan mal: cada vez que negocio quiere "que soporte también pueda reembolsar", tocas N controllers. Mejor: el código habla de **permisos**, y un mapa (o la BD) dice qué permisos tiene cada rol.

```typescript
// src/auth/permisos/permiso.enum.ts
export enum Permiso {
  PRODUCTOS_CREAR = 'productos:crear',
  PRODUCTOS_EDITAR = 'productos:editar',
  ORDENES_VER_TODAS = 'ordenes:ver-todas',
  ORDENES_REEMBOLSAR = 'ordenes:reembolsar',
  USUARIOS_ADMINISTRAR = 'usuarios:administrar',
}

// Mapa rol → permisos (podría vivir en BD y cachearse, Sesión 25)
export const PERMISOS_POR_ROL: Record<Rol, readonly Permiso[]> = {
  [Rol.CLIENTE]: [],
  [Rol.VENDEDOR]: [Permiso.PRODUCTOS_CREAR, Permiso.PRODUCTOS_EDITAR],
  [Rol.SOPORTE]: [Permiso.ORDENES_VER_TODAS, Permiso.ORDENES_REEMBOLSAR],
  [Rol.ADMIN]: Object.values(Permiso),
};

export const RequierePermisos = Reflector.createDecorator<Permiso[]>();
```

```typescript
// src/auth/permisos/permisos.guard.ts
@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride(RequierePermisos, [ctx.getHandler(), ctx.getClass()]);
    if (!requeridos?.length) return true;
    const user = ctx.switchToHttp().getRequest().user as UsuarioAutenticado;
    const concedidos = new Set(user.roles.flatMap((r) => PERMISOS_POR_ROL[r as Rol] ?? []));
    // Permisos: normalmente se exigen TODOS (AND)
    if (!requeridos.every((p) => concedidos.has(p))) throw new ForbiddenException();
    return true;
  }
}

// uso
@RequierePermisos([Permiso.ORDENES_REEMBOLSAR])
@Post(':id/reembolso')
reembolsar(@Param('id', ParseIntPipe) id: number) { /* ... */ }
```

> ❓ **Entrevista**: *"¿Pones los permisos dentro del JWT?"* → Es una opción (evita lookups), pero el token crece y los cambios de permisos no aplican hasta el siguiente refresh. Alternativa común: el JWT lleva solo roles (o nada), y los permisos se resuelven en el servidor con caché. Nunca confíes en permisos que el cliente pueda modificar: el JWT firmado sí es confiable, un header `X-Roles` no.

---

## 5. Ownership y BOLA

### 5.1 El bug

```typescript
// ❌ BOLA: cualquier cliente autenticado lee cualquier orden
@Get(':id')
obtener(@Param('id', ParseIntPipe) id: number) {
  return this.ordenes.obtener(id);
}
```

`GET /ordenes/1`, `/ordenes/2`, `/ordenes/3`... El guard de roles no lo detecta: el usuario *sí* tiene permiso para "leer órdenes". Lo que falta es verificar **esta** orden.

### 5.2 La solución preferida: consultas acotadas al usuario

La forma más robusta es que la condición de propiedad sea **parte de la query**, no un `if` posterior que alguien puede olvidar:

```typescript
// src/ordenes/ordenes.service.ts
@Injectable()
export class OrdenesService {
  constructor(private readonly prisma: PrismaService) {}

  // Todas las lecturas de cliente pasan por aquí: el filtro de propiedad es obligatorio
  private alcance(user: UsuarioAutenticado): Prisma.OrdenWhereInput {
    const puedeVerTodas = user.roles.some((r) => PERMISOS_POR_ROL[r as Rol]?.includes(Permiso.ORDENES_VER_TODAS));
    return puedeVerTodas ? {} : { clienteId: user.id };
  }

  async obtener(id: number, user: UsuarioAutenticado) {
    const orden = await this.prisma.orden.findFirst({ where: { id, ...this.alcance(user) } });
    // Ajena o inexistente: misma respuesta (no filtra existencia)
    if (!orden) throw new NotFoundException(`Orden ${id} no encontrada`);
    return orden;
  }

  listar(user: UsuarioAutenticado, p: PaginacionQueryDto) {
    return this.prisma.orden.findMany({
      where: this.alcance(user),
      take: p.limit, skip: (p.page - 1) * p.limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async cancelar(id: number, user: UsuarioAutenticado) {
    // Update condicional: propiedad + regla de negocio en una sola operación atómica
    const { count } = await this.prisma.orden.updateMany({
      where: { id, clienteId: user.id, estado: 'PENDIENTE' },
      data: { estado: 'CANCELADA' },
    });
    if (count === 0) throw new NotFoundException('Orden no encontrada o no cancelable');
  }
}

// controller: el usuario viene del token, NUNCA del body o la query
@Get(':id')
obtener(@Param('id', ParseIntPipe) id: number, @UsuarioActual() user: UsuarioAutenticado) {
  return this.ordenes.obtener(id, user);
}
```

> ⚠️ Nunca tomes el `clienteId` del body (`POST /ordenes { clienteId: 99 }`) ni de la query para decidir de quién es algo. El dueño **siempre** sale de `request.user`, que viene de un token verificado.

> 💡 Los **ids secuenciales** facilitan la enumeración; los UUID dificultan adivinar, pero **no son autorización**. Un UUID filtrado en un log o un email sigue siendo explotable sin el chequeo de propiedad.

### 5.3 ¿Guard o servicio?

| Dónde | Ventaja | Límite |
|---|---|---|
| **Guard** | Declarativo, corre antes del handler | No tiene el recurso: tendría que cargarlo (query duplicada) |
| **Servicio / caso de uso** | Tiene el recurso y las reglas de negocio | Hay que acordarse de llamarlo (mitígalo con consultas acotadas) |
| **Base de datos** (Row Level Security de Postgres) | Imposible saltárselo desde la app | Complejidad operativa; la app debe setear el usuario por conexión |

Regla práctica: **guards para "¿puedes usar esta función?"**, **servicio para "¿puedes tocar este objeto?"**. RLS como defensa adicional en sistemas multi-tenant sensibles.

---

## 6. CASL: reglas expresivas en un solo lugar

Cuando las reglas se multiplican ("el vendedor edita sus productos pero no el precio si hay órdenes abiertas", "soporte lee todas las órdenes pero no los datos de pago"), los `if` dispersos se vuelven inmanejables. **CASL** (`@casl/ability`) centraliza las reglas en una **Ability** y responde `can(acción, sujeto, campo?)`.

```bash
npm i @casl/ability
```

### 6.1 Conceptos

| Concepto | Qué es | Ejemplo |
|---|---|---|
| **Acción** | Verbo | `read`, `create`, `update`, `delete`, `manage` (= cualquier acción) |
| **Sujeto** | Tipo de recurso (o `all`) | `'Orden'`, `'Producto'` |
| **Condiciones** | Filtro estilo MongoDB sobre el recurso | `{ clienteId: user.id, estado: 'PENDIENTE' }` |
| **Campos** | Restricción por propiedad | `['nombre', 'direccion']` |
| **`cannot`** | Regla negativa (tiene prioridad si es posterior) | `cannot('delete', 'Orden')` |

### 6.2 La fábrica de abilities

```typescript
// src/casl/casl-ability.factory.ts
import { Injectable } from '@nestjs/common';
import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import { Rol } from '../auth/roles/rol.enum';
import { UsuarioAutenticado } from '../auth/auth.service';

export enum Accion {
  MANAGE = 'manage', // comodín de CASL: cualquier acción
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  REEMBOLSAR = 'reembolsar', // las acciones pueden ser de negocio, no solo CRUD
}

export type Sujetos = 'Producto' | 'Categoria' | 'Orden' | 'Usuario' | 'all';
export type AppAbility = MongoAbility<[Accion, Sujetos]>;

@Injectable()
export class CaslAbilityFactory {
  crearPara(user: UsuarioAutenticado): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (user.roles.includes(Rol.ADMIN)) {
      can(Accion.MANAGE, 'all');
      cannot(Accion.DELETE, 'Usuario', { id: user.id }).because('No puedes borrar tu propia cuenta de admin');
      return build();
    }

    // Reglas de cualquier usuario autenticado
    can(Accion.READ, ['Producto', 'Categoria']);
    can(Accion.CREATE, 'Orden');
    can(Accion.READ, 'Orden', { clienteId: user.id });
    can(Accion.UPDATE, 'Orden', ['estado'], { clienteId: user.id, estado: 'PENDIENTE' }); // solo cancelar
    can(Accion.READ, 'Usuario', { id: user.id });
    can(Accion.UPDATE, 'Usuario', ['nombre', 'direccion', 'telefono'], { id: user.id }); // NO roles, NO email

    if (user.roles.includes(Rol.VENDEDOR)) {
      can(Accion.CREATE, 'Producto');
      can([Accion.UPDATE, Accion.DELETE], 'Producto', { vendedorId: user.id });
    }

    if (user.roles.includes(Rol.SOPORTE)) {
      can(Accion.READ, 'Orden');                        // todas
      can(Accion.REEMBOLSAR, 'Orden', { estado: 'PAGADA' });
      cannot(Accion.READ, 'Orden', ['datosPago']);      // pero no los datos de pago
    }

    return build();
  }
}
```

```typescript
// src/casl/casl.module.ts
@Module({ providers: [CaslAbilityFactory], exports: [CaslAbilityFactory] })
export class CaslModule {}
```

> ⚠️ **Orden de reglas**: CASL evalúa de la **última a la primera**; una regla posterior gana. Por eso los `cannot` van **después** de los `can` que restringen. Un `cannot` antes de un `can(MANAGE, 'all')` no tiene efecto.

### 6.3 Chequear sobre una instancia

Con objetos planos (Prisma, `lean()` de Mongoose) CASL no sabe qué tipo son; se lo dices con el helper `subject()`:

```typescript
import { ForbiddenError, subject } from '@casl/ability';

async cancelar(id: number, user: UsuarioAutenticado) {
  const ability = this.caslFactory.crearPara(user);
  const orden = await this.prisma.orden.findUnique({ where: { id } });
  if (!orden || !ability.can(Accion.READ, subject('Orden', orden))) {
    throw new NotFoundException(); // no puede ni verla → 404
  }
  // Puede verla pero ¿puede cancelarla? (dueño + PENDIENTE, campo 'estado')
  ForbiddenError.from(ability).throwUnlessCan(Accion.UPDATE, subject('Orden', orden), 'estado');
  return this.prisma.orden.update({ where: { id }, data: { estado: 'CANCELADA' } });
}
```

`ForbiddenError` es de CASL, no de Nest. Tradúcelo a 403 con un filter (Sesión 9):

```typescript
// src/casl/casl-forbidden.filter.ts
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { ForbiddenError } from '@casl/ability';
import type { Response } from 'express';

@Catch(ForbiddenError)
export class CaslForbiddenFilter implements ExceptionFilter {
  catch(err: ForbiddenError<any>, host: ArgumentsHost) {
    host.switchToHttp().getResponse<Response>().status(403).json({
      statusCode: 403,
      error: 'Forbidden',
      message: err.message, // el texto de .because(...) o uno genérico
    });
  }
}
// main.ts: app.useGlobalFilters(new CaslForbiddenFilter());
```

### 6.4 Permisos por campo: evitar mass assignment de privilegios

Aunque el DTO de actualización de perfil no tenga `roles` (Sesión 6, `whitelist: true`), CASL permite una segunda barrera y, sobre todo, **distintos campos según quién edite**:

```typescript
import { permittedFieldsOf } from '@casl/ability/extra';
import { pick } from 'lodash';

async actualizarUsuario(id: string, dto: Record<string, unknown>, user: UsuarioAutenticado) {
  const ability = this.caslFactory.crearPara(user);
  const objetivo = subject('Usuario', await this.usuarios.obtenerOFallar(id));
  ForbiddenError.from(ability).throwUnlessCan(Accion.UPDATE, objetivo);

  // Campos que ESTE usuario puede tocar en ESTE objetivo (admin: todos; cliente: nombre/dirección/teléfono)
  const permitidos = permittedFieldsOf(ability, Accion.UPDATE, objetivo, {
    fieldsFrom: (regla) => regla.fields ?? Object.keys(dto),
  });
  return this.usuarios.actualizar(id, pick(dto, permitidos));
}
```

> 💡 Para **ocultar** campos en la respuesta según permisos (el `datosPago` que soporte no debe ver), usa `permittedFieldsOf` con `Accion.READ` y proyecta el resultado, o los grupos de `class-transformer` (Sesión 21).

---

## 7. Policies guard: CASL en el borde

Para chequeos **sin instancia** ("¿puede crear productos?", "¿puede leer órdenes en general?") conviene un guard declarativo, como propone la documentación de Nest:

```typescript
// src/casl/policies.decorator.ts
import { Reflector } from '@nestjs/core';
import { AppAbility } from './casl-ability.factory';

export type PolicyHandler = (ability: AppAbility) => boolean;
export const ChequearPolicies = Reflector.createDecorator<PolicyHandler[]>();
```

```typescript
// src/casl/policies.guard.ts
@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly casl: CaslAbilityFactory) {}

  canActivate(ctx: ExecutionContext): boolean {
    const handlers = this.reflector.getAllAndOverride(ChequearPolicies, [ctx.getHandler(), ctx.getClass()]) ?? [];
    if (handlers.length === 0) return true;
    const req = ctx.switchToHttp().getRequest();
    const ability = this.casl.crearPara(req.user);
    req.ability = ability; // reutilizable en el handler / servicio sin reconstruirla
    if (!handlers.every((h) => h(ability))) throw new ForbiddenException();
    return true;
  }
}

// uso
@UseGuards(PoliciesGuard)
@ChequearPolicies([(a) => a.can(Accion.CREATE, 'Producto')])
@Post()
crear(@Body() dto: CrearProductoDto, @UsuarioActual() user: UsuarioAutenticado) {
  return this.productos.crear({ ...dto, vendedorId: user.id }); // el dueño lo pone el servidor
}
```

> ⚠️ `can(Accion.UPDATE, 'Producto')` sobre el **tipo** (string) devuelve `true` si existe *alguna* regla que lo permita, aunque tenga condiciones (`{ vendedorId: user.id }`). Significa "puede actualizar *algunos* productos", no "puede actualizar *este*". El chequeo de instancia (sección 6.3) sigue siendo obligatorio.

> ❓ **Entrevista**: *"¿Por qué el guard de CASL no reemplaza el chequeo en el servicio?"* → Porque el guard no tiene el recurso: solo puede responder a nivel de tipo. Las condiciones (dueño, estado) se evalúan contra la instancia concreta, que se carga en el servicio.

---

## 8. Filtrar listados con las reglas

Chequear instancia por instancia sirve para `GET /:id`, pero en un listado no puedes traer 10 000 órdenes y filtrar en memoria. Hay que convertir las reglas en un **filtro de la query**.

Con Prisma existe `@casl/prisma`, que construye abilities cuyas condiciones son `WhereInput` de Prisma y las traduce con `accessibleBy`:

```bash
npm i @casl/prisma
```

```typescript
import { AbilityBuilder, PureAbility } from '@casl/ability';
import { createPrismaAbility, PrismaQuery, Subjects, accessibleBy } from '@casl/prisma';
import { Orden, Producto, Usuario } from '@prisma/client';

type AppSubjects = 'all' | Subjects<{ Orden: Orden; Producto: Producto; Usuario: Usuario }>;
export type PrismaAbility = PureAbility<[Accion, AppSubjects], PrismaQuery>;

// En la fábrica: new AbilityBuilder<PrismaAbility>(createPrismaAbility)
// y las condiciones ya se escriben (y tipan) como filtros Prisma:
//   can(Accion.READ, 'Orden', { clienteId: user.id });

// En el servicio:
listar(ability: PrismaAbility, filtros: Prisma.OrdenWhereInput) {
  return this.prisma.orden.findMany({
    where: { AND: [accessibleBy(ability).Orden, filtros] }, // reglas de CASL → WHERE
  });
}
```

Para Mongoose, CASL ofrece `@casl/mongoose` (plugin `accessibleRecordsPlugin` → `Model.find().accessibleBy(ability)`), y en general `rulesToQuery` de `@casl/ability/extra` para otros ORMs.

> 💡 Si no quieres añadir CASL, el patrón de la sección 5.2 (`alcance(user)` que devuelve un `where`) es la versión manual de exactamente esto.

---

## 9. Multi-tenancy en una línea (y por qué es autorización)

Si TiendaApi fuera un SaaS con muchas tiendas, cada request pertenece a un **tenant**. Filtrar por `tiendaId` es un caso particular de ownership, y olvidarlo en *una* query expone datos de otro cliente. Patrones:

| Patrón | Aislamiento | Costo |
|---|---|---|
| Columna `tenantId` + filtro en cada query | Lógico (depende de no olvidarlo) | Bajo |
| Columna + **Row Level Security** (Postgres) | Lo impone la BD | Medio |
| Schema por tenant | Fuerte | Migraciones × N |
| Base por tenant | Máximo | Alto (conexiones, operación) |

El `tenantId` sale del token (claim) o del subdominio validado, nunca de un parámetro libre. Contexto por request con `nestjs-cls` (Sesión 17) o scopes `REQUEST` (**Sesión 23**, con su costo).

---

## 10. Testear la autorización

La autorización es donde más duele un bug silencioso. Testea la **fábrica de abilities** como función pura, con una matriz de casos:

```typescript
// src/casl/casl-ability.factory.spec.ts
import { subject } from '@casl/ability';

describe('CaslAbilityFactory', () => {
  const factory = new CaslAbilityFactory();
  const cliente = { id: 'u1', email: 'c@x.cl', roles: [Rol.CLIENTE] };
  const soporte = { id: 's1', email: 's@x.cl', roles: [Rol.SOPORTE] };

  it.each`
    user       | accion               | orden                                      | campo        | esperado
    ${cliente} | ${Accion.READ}       | ${{ clienteId: 'u1', estado: 'PAGADA' }}   | ${undefined} | ${true}
    ${cliente} | ${Accion.READ}       | ${{ clienteId: 'u2', estado: 'PAGADA' }}   | ${undefined} | ${false}
    ${cliente} | ${Accion.UPDATE}     | ${{ clienteId: 'u1', estado: 'PENDIENTE' }}| ${'estado'}  | ${true}
    ${cliente} | ${Accion.UPDATE}     | ${{ clienteId: 'u1', estado: 'PAGADA' }}   | ${'estado'}  | ${false}
    ${cliente} | ${Accion.UPDATE}     | ${{ clienteId: 'u1', estado: 'PENDIENTE' }}| ${'total'}   | ${false}
    ${soporte} | ${Accion.REEMBOLSAR} | ${{ clienteId: 'u2', estado: 'PAGADA' }}   | ${undefined} | ${true}
    ${soporte} | ${Accion.READ}       | ${{ clienteId: 'u2', estado: 'PAGADA' }}   | ${'datosPago'} | ${false}
  `('$accion sobre $orden.estado (campo $campo) → $esperado', ({ user, accion, orden, campo, esperado }) => {
    const ability = factory.crearPara(user);
    expect(ability.can(accion, subject('Orden', orden), campo)).toBe(esperado);
  });
});
```

Y en e2e (Sesión 22), el test clave de BOLA: el usuario A crea una orden, el usuario B hace `GET /ordenes/:id` → debe recibir **404**.

---

## Resumen mental de la sesión

```
Autorización = ¿SUJETO puede ACCIÓN sobre RECURSO en CONTEXTO?
  RBAC (rol) · Permisos (rol → permisos) · ABAC (atributos) · ReBAC (relaciones)
  Funciones → roles/permisos en GUARDS   |   Datos → ownership en SERVICIO/QUERY
401 sin identidad · 403 sin permiso de función · 404 para recursos ajenos (no filtrar existencia)

RBAC:
  export const Roles = Reflector.createDecorator<Rol[]>()
  RolesGuard: reflector.getAllAndOverride(Roles, [handler, class]) → some(roles)
  APP_GUARD: JwtAuthGuard ANTES que RolesGuard, en el mismo módulo
Permisos: el código pide permisos; el mapa/BD asigna permisos a roles

BOLA (OWASP API1): el rol no basta → where { id, clienteId: user.id }
  dueño SIEMPRE de req.user, nunca del body; UUID ≠ autorización
  update condicional: propiedad + estado en una operación atómica

CASL:
  AbilityBuilder(createMongoAbility): can(acción, sujeto, campos?, condiciones?) / cannot(...)
  última regla gana → cannot DESPUÉS de can
  instancia: ability.can(acc, subject('Orden', obj), campo?)
  ForbiddenError.from(ability).throwUnlessCan(...) + filter → 403
  permittedFieldsOf → anti mass-assignment por rol
  PoliciesGuard: solo nivel TIPO ("algunos"); la instancia se chequea en el servicio
  listados: accessibleBy(ability).Orden (@casl/prisma) → WHERE
Tests: matriz de la fábrica de abilities + e2e "usuario B no ve la orden de A"
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ Compara RBAC, permisos, ABAC y ReBAC. ¿Cuál usarías en TiendaApi y para qué parte?
2. ❓ ¿Cuándo devuelves 401, 403 y 404 en un problema de autorización?
3. ❓ ¿Qué ventaja tiene `Reflector.createDecorator` sobre `SetMetadata`?
4. ❓ ¿Qué diferencia hay entre `getAllAndOverride` y `getAllAndMerge`? ¿Cuál usarías para `@Roles`?
5. ❓ ¿Cómo garantizas que el guard de roles corra después del de autenticación?
6. ❓ ¿Por qué el código debería chequear permisos y no roles?
7. ❓ ¿Qué es BOLA? Muestra el endpoint vulnerable y su corrección.
8. ❓ ¿Por qué es preferible meter la condición de propiedad en la query que en un `if` después?
9. ❓ En CASL, ¿en qué orden se evalúan las reglas? ¿Qué pasa con un `cannot` antes de un `can`?
10. ❓ ¿Por qué `ability.can('update', 'Producto')` puede devolver `true` aunque el usuario no pueda editar un producto concreto?
11. ❓ ¿Cómo filtras un listado según las reglas de CASL sin cargar todo en memoria?
12. ❓ ¿Cómo evitas que un cliente se asigne el rol `admin` actualizando su perfil?

## Ejercicio práctico
1. Crea el enum `Rol`, el decorador `Roles` con `Reflector.createDecorator` y el `RolesGuard`; regístralo como `APP_GUARD` después del `JwtAuthGuard`.
2. Protege `POST/PATCH/DELETE /categorias` con `@Roles([Rol.ADMIN])` a nivel de clase y deja `GET /categorias` público. Verifica 401 sin token, 403 con cliente, 201 con admin.
3. Migra a permisos: crea `Permiso`, `PERMISOS_POR_ROL`, `RequierePermisos` y `PermisosGuard`; haz que `POST /ordenes/:id/reembolso` requiera `ordenes:reembolsar`.
4. Reproduce BOLA: con dos usuarios, verifica que B lee la orden de A. Corrígelo con `alcance(user)` y comprueba que B recibe 404.
5. Instala `@casl/ability` e implementa `CaslAbilityFactory` con las reglas de la sección 6.2.
6. Implementa `PATCH /ordenes/:id/cancelar` con chequeo de instancia y `ForbiddenError` → 403 vía `CaslForbiddenFilter`. Prueba con una orden `PAGADA`.
7. Implementa `PATCH /usuarios/:id` usando `permittedFieldsOf`: un cliente que envía `{ "roles": ["admin"] }` no debe cambiar su rol; un admin sí.
8. Crea `PoliciesGuard` + `@ChequearPolicies` y úsalo en `POST /productos` (solo vendedores y admin).
9. (Opcional) Migra la fábrica a `@casl/prisma` y usa `accessibleBy(ability).Orden` en `GET /ordenes`.
10. Escribe el test de matriz de la sección 10 y un e2e de BOLA.

---

➡️ **Cuando termines**, marca la Sesión 19 en el [README](README.md) y pasa a la **Sesión 20 — Seguridad de la API: Helmet, CORS, Throttler, CSRF, OWASP API Top 10**.

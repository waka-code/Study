# Sesión 6 — DTOs y validación: class-validator, class-transformer y ValidationPipe

> **Objetivo de la sesión**: entender *por qué* TypeScript no te protege en runtime y cómo Nest cierra esa brecha. Al terminar deberías poder diseñar **DTOs** como clases, validarlos con **class-validator**, transformarlos con **class-transformer**, configurar el **ValidationPipe** global con las opciones correctas para producción (`whitelist`, `forbidNonWhitelisted`, `transform`), validar objetos anidados y arrays, reutilizar DTOs con **mapped types**, escribir **validadores propios** (incluso asíncronos con DI) y personalizar el formato de los errores.

---

## 1. El problema: los tipos de TypeScript desaparecen en runtime

En la Sesión 4 escribiste algo así:

```typescript
@Post()
crear(@Body() body: CrearProductoDto) {
  return this.productosService.crear(body);
}
```

Parece seguro: `body` es un `CrearProductoDto`. **Es mentira.** TypeScript es *type erasure*: al compilar a JavaScript, las anotaciones de tipo desaparecen. Lo que llega por HTTP es un JSON arbitrario que Express/Fastify parsea a un objeto plano:

```
Cliente envía:  { "nombre": 123, "precio": "gratis", "esAdmin": true }
                               │
                               ▼
         body-parser → objeto plano de JS (sin validar)
                               │
                               ▼
     crear(body)  ← TS "cree" que es CrearProductoDto, pero NADIE lo comprobó
```

El compilador te protege de **tus** errores (llamar a una función con el tipo equivocado dentro de tu código). **No** te protege de lo que envía el cliente. Para eso necesitas **validación en runtime**, en el borde del sistema.

> ❓ **Entrevista**: *"Si ya tipé el `@Body()` con un DTO, ¿por qué tengo que validarlo?"* → Porque los tipos de TypeScript se borran al compilar. En runtime el body es un objeto plano con lo que el cliente quiera enviar. La validación en runtime (class-validator + `ValidationPipe`) es lo único que garantiza que el objeto cumple el contrato antes de llegar al handler.

---

## 2. DTO: qué es y por qué es una **clase** (y no una interface)

Un **DTO** (*Data Transfer Object*) define la **forma del dato en el contrato HTTP**, separada de la forma del dato en tu dominio o base de datos (entidades, Sesiones 14–16).

La documentación de Nest recomienda que los DTOs sean **clases**. No es estética, es técnica:

| | `interface` / `type` | `class` |
|---|---|---|
| ¿Existe en runtime? | ❌ Se borra al compilar | ✅ Es una función constructora en JS |
| ¿Puede llevar decoradores? | ❌ | ✅ `@IsString()`, `@Min()`... |
| ¿`emitDecoratorMetadata` emite su tipo? | Emite `Object` (inútil) | Emite la referencia a la clase |
| ¿El `ValidationPipe` puede validarla? | ❌ | ✅ |

Recuerda la Sesión 2: con `emitDecoratorMetadata`, TypeScript emite `design:paramtypes` con el **constructor** de cada parámetro. El `ValidationPipe` lee ese metatipo (`metadata.metatype`), hace `plainToInstance(CrearProductoDto, body)` y luego `validate(instancia)`. Si el tipo es una interface, el metatipo es `Object` y **no hay nada que validar**: el pipe deja pasar el valor tal cual.

> ⚠️ El error más común de principiante: definir `export interface CrearProductoDto { ... }` y creer que está validado. No lo está. Sin error, sin warning. Silencioso.

---

## 3. Instalación y primer `ValidationPipe` global

```bash
npm i class-validator class-transformer
```

Nest no incluye estas librerías como dependencia: son *peer* opcionales que el `ValidationPipe` carga dinámicamente (si faltan, lanza un error pidiendo instalarlas).

```typescript
// src/productos/dto/crear-producto.dto.ts
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Length, MaxLength } from 'class-validator';

export class CrearProductoDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  nombre!: string;               // "!" = definite assignment: lo asigna class-transformer, no un constructor

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsInt()
  @IsPositive()
  precioCentavos!: number;       // dinero en enteros (centavos) para evitar errores de coma flotante

  @IsInt()
  @IsPositive()
  categoriaId!: number;
}
```

```typescript
// src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // elimina propiedades SIN decoradores
      forbidNonWhitelisted: true,   // ...y en vez de eliminarlas, responde 400
      transform: true,              // entrega una INSTANCIA del DTO (y convierte primitivos de params/query)
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

Petición inválida:

```bash
curl -X POST localhost:3000/productos -H 'Content-Type: application/json' \
  -d '{"nombre":"TV","precioCentavos":-5}'
```

```json
{
  "message": [
    "nombre must be longer than or equal to 3 characters",
    "precioCentavos must be a positive number",
    "categoriaId must be a positive number",
    "categoriaId must be an integer number"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

El handler **nunca se ejecutó**. Ese es el punto: el pipe es un portero en la puerta del handler (lo estudiamos a fondo en la Sesión 10).

```
Request ─▶ Middleware ─▶ Guards ─▶ Interceptors (antes) ─▶ PIPES ─▶ Handler
                                                             │
                                          inválido ──────────┘──▶ BadRequestException
                                                                  └─▶ Exception filter (Sesión 9) ─▶ 400
```

> ⚠️ `app.useGlobalPipes()` **no** aplica a apps híbridas/gateways de la misma forma y, sobre todo, **no participa de la DI**. Si tu pipe global necesita dependencias, regístralo como provider con `APP_PIPE` (lo vemos en la Sesión 10). Además, en tests e2e con `Test.createTestingModule` tienes que volver a llamar a `useGlobalPipes` en la app de test, o usar `APP_PIPE` para que venga "de fábrica" con el módulo (Sesión 22).

---

## 4. Catálogo de decoradores de class-validator

Los que usarás el 90 % del tiempo:

| Categoría | Decoradores |
|---|---|
| **Presencia** | `@IsDefined()`, `@IsOptional()`, `@IsNotEmpty()`, `@IsEmpty()`, `@Allow()` |
| **Tipo** | `@IsString()`, `@IsInt()`, `@IsNumber({ maxDecimalPlaces: 2 })`, `@IsBoolean()`, `@IsDate()`, `@IsArray()`, `@IsObject()`, `@IsEnum(Enum)` |
| **Strings** | `@Length(min, max)`, `@MinLength()`, `@MaxLength()`, `@Matches(/regex/)`, `@IsEmail()`, `@IsUrl()`, `@IsUUID('4')`, `@IsISO8601()`, `@IsDateString()`, `@IsAlphanumeric()`, `@IsStrongPassword()` |
| **Números** | `@Min()`, `@Max()`, `@IsPositive()`, `@IsNegative()`, `@IsDivisibleBy()` |
| **Arrays** | `@ArrayMinSize()`, `@ArrayMaxSize()`, `@ArrayNotEmpty()`, `@ArrayUnique()`, `@ArrayContains()` |
| **Valores** | `@IsIn([...])`, `@IsNotIn([...])`, `@Equals()` |
| **Anidados / condicionales** | `@ValidateNested()`, `@ValidateIf(fn)` |

Opciones comunes a (casi) todos los decoradores:

```typescript
@IsString({ each: true })                          // valida cada elemento de un array
@Length(3, 100, { message: 'El nombre debe tener entre $constraint1 y $constraint2 caracteres (recibí "$value")' })
@IsInt({ groups: ['admin'] })                      // solo aplica si se pide el grupo "admin" (sección 9)
```

Tokens disponibles en `message`: `$value`, `$property`, `$target`, `$constraint1`, `$constraint2`... También puedes pasar una función `message: (args) => string`.

### 4.1 `@IsOptional` vs `@IsNotEmpty` vs `@IsDefined`

Esta tabla evita muchos bugs:

| Decorador | `undefined` | `null` | `""` |
|---|---|---|---|
| (ninguno de presencia) + `@IsString()` | ❌ falla | ❌ falla | ✅ pasa |
| `@IsOptional()` + `@IsString()` | ✅ se salta la validación | ✅ se salta | ✅ pasa |
| `@IsNotEmpty()` | ❌ | ❌ | ❌ |
| `@IsDefined()` | ❌ | ❌ | ✅ |

> ⚠️ `@IsOptional()` también acepta **`null`**. Si tu columna en BD es `NOT NULL` y el cliente envía `"descripcion": null` en un PATCH, pasará la validación y explotará en la base de datos. Si quieres "opcional pero no null", combínalo con `@ValidateIf((_, v) => v !== undefined)` en vez de `@IsOptional()`.

> ⚠️ `@IsNumber()` acepta `NaN`? No por defecto (`allowNaN: false`), pero sí acepta decimales. Para IDs y cantidades usa `@IsInt()`.

---

## 5. Las opciones del `ValidationPipe` que importan

```typescript
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: false }, // explícito > implícito (ver 6.3)
  stopAtFirstError: false,          // true = solo el primer error por propiedad
  disableErrorMessages: false,      // true en APIs públicas si no quieres revelar reglas
  errorHttpStatusCode: 400,         // p. ej. 422 si tu equipo lo prefiere
  validationError: { target: false, value: false }, // no incluir el objeto ni el valor en ValidationError
  // forbidUnknownValues: true      // default desde class-validator 0.14 (ver abajo)
  // exceptionFactory: (errors) => ... (sección 11)
});
```

| Opción | Qué hace | Recomendación |
|---|---|---|
| `whitelist` | Quita propiedades que **no tienen ningún decorador** de validación | ✅ Siempre |
| `forbidNonWhitelisted` | Con `whitelist`, en vez de quitar, responde **400** | ✅ En APIs internas/estrictas; opcional en públicas |
| `transform` | Devuelve la instancia del DTO y convierte params/query a su tipo declarado | ✅ Casi siempre |
| `enableImplicitConversion` | Convierte según el tipo TS de la propiedad (`'5'` → `5`) | ⚠️ Con cuidado |
| `skipMissingProperties` | No valida propiedades ausentes (`undefined`) | ❌ Casi nunca global; peligroso |
| `forbidUnknownValues` | Rechaza objetos cuya clase no se conoce (p. ej. `Object` literal) | Default `true` en class-validator ≥ 0.14 |
| `groups` / `always` | Validación por grupos | Casos específicos |

### 5.1 Por qué `whitelist` es una medida de seguridad

Imagina el DTO de registro de usuario en TiendaApi. Sin `whitelist`, si el service hace `repo.save({ ...dto })`:

```bash
curl -X POST /usuarios -d '{"email":"a@b.cl","password":"Secreta123!","rol":"admin"}'
```

`rol` no está en el DTO, pero **viaja en el objeto** y termina guardado. Esto es **mass assignment** (OWASP API3:2023 — *Broken Object Property Level Authorization*, Sesión 20). Con `whitelist: true`, `rol` se elimina antes de llegar al handler; con `forbidNonWhitelisted: true`, el cliente recibe:

```json
{ "message": ["property rol should not exist"], "error": "Bad Request", "statusCode": 400 }
```

> ⚠️ `whitelist` solo conserva propiedades con **al menos un decorador de class-validator**. Si agregas una propiedad al DTO y olvidas decorarla, desaparece silenciosamente. Para campos que aceptas sin reglas, usa `@Allow()`.

> ❓ **Entrevista**: *"¿Qué diferencia hay entre `whitelist` y `forbidNonWhitelisted`?"* → `whitelist` **elimina** en silencio las propiedades no declaradas en el DTO; `forbidNonWhitelisted` (requiere `whitelist`) **rechaza** la request con 400. Ambas previenen mass assignment; la segunda además avisa al cliente que está enviando basura, útil para detectar clientes mal integrados.

---

## 6. Transformación: class-transformer

La validación dice *"¿esto es válido?"*. La transformación dice *"conviértelo en lo que necesito"*. El `ValidationPipe` hace **las dos** en este orden:

```
valor plano ─▶ plainToInstance(Dto, valor, transformOptions) ─▶ validate(instancia) ─▶ handler
              (class-transformer: @Type, @Transform)            (class-validator)
                                                         ↑
                            si transform: false, el handler recibe el objeto ORIGINAL,
                            no la instancia (aunque se validó la instancia)
```

### 6.1 `transform: true` con params y query

Todo lo que viene en la URL es **string**. Con `transform: true`, Nest usa el metatipo del parámetro para convertir primitivos:

```typescript
@Get(':id')
buscar(@Param('id') id: number) {   // con transform: true, llega 42 (number), no "42"
  console.log(typeof id);           // "number"
}
```

Aun así, **prefiere pipes explícitos** para params (`ParseIntPipe`, `ParseUUIDPipe`, Sesión 10): si envían `/productos/abc`, la conversión implícita produce `NaN` sin error, mientras que `ParseIntPipe` responde 400.

### 6.2 `@Type` y `@Transform`

```typescript
import { Transform, Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListarProductosQueryDto {
  @IsOptional()
  @Type(() => Number)                     // "2" → 2
  @IsInt()
  @Min(1)
  page: number = 1;                       // valor por defecto si no viene

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)                               // nunca confíes en el pageSize del cliente
  pageSize: number = 20;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  busqueda?: string;

  @IsOptional()
  @Type(() => Date)                       // "2025-01-31" → Date
  @IsDate()
  desde?: Date;
}
```

```typescript
@Get()
listar(@Query() query: ListarProductosQueryDto) {
  // query.page es number, query.desde es Date, query es instancia de ListarProductosQueryDto
  return this.productosService.listar(query);
}
```

> ⚠️ Los valores por defecto (`page: number = 1`) solo funcionan con `transform: true`, porque se asignan al **instanciar** la clase. Sin transform, el handler recibe el objeto plano sin defaults.

### 6.3 El peligro de `enableImplicitConversion` con booleanos

Con `enableImplicitConversion: true`, class-transformer convierte según el tipo TS de la propiedad usando los constructores de JS: `Boolean("false")` es **`true`** (cualquier string no vacío es truthy).

```typescript
export class FiltroDto {
  @IsOptional()
  @IsBoolean()
  soloActivos?: boolean;   // ?soloActivos=false  →  true  😱
}
```

Solución explícita:

```typescript
@IsOptional()
@Transform(({ obj, key }) => {
  const raw = obj[key];                      // usa el valor ORIGINAL (antes de conversiones)
  if (raw === 'true' || raw === true) return true;
  if (raw === 'false' || raw === false) return false;
  return raw;                                 // deja que @IsBoolean falle con otros valores
})
@IsBoolean()
soloActivos?: boolean;
```

> ⚠️ **Express 5 (default en Nest 11) cambió el query parser.** Express 4 usaba el parser *extended* (`qs`), que convierte `?filtro[precio][gte]=100` en objetos anidados. Express 5 usa por defecto el parser *simple* (`querystring` de Node), que **no** anida. Si tus DTOs de query esperan objetos anidados, restaura el comportamiento anterior:
>
> ```typescript
> import { NestExpressApplication } from '@nestjs/platform-express';
> const app = await NestFactory.create<NestExpressApplication>(AppModule);
> app.set('query parser', 'extended');
> ```

---

## 7. Objetos anidados y arrays

Crear una orden en TiendaApi: una orden tiene N ítems, cada uno con su propia validación.

```typescript
// src/ordenes/dto/crear-orden.dto.ts
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, IsPositive,
  IsString, Length, Max, ValidateNested,
} from 'class-validator';

export enum MetodoPago {
  TARJETA = 'tarjeta',
  TRANSFERENCIA = 'transferencia',
}

export class ItemOrdenDto {
  @IsInt()
  @IsPositive()
  productoId!: number;

  @IsInt()
  @IsPositive()
  @Max(50)
  cantidad!: number;
}

export class DireccionDto {
  @IsString() @Length(3, 120) calle!: string;
  @IsString() @Length(2, 60)  comuna!: string;
  @IsOptional() @IsString()   referencia?: string;
}

export class CrearOrdenDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })   // valida CADA elemento con las reglas de ItemOrdenDto
  @Type(() => ItemOrdenDto)         // sin esto, los elementos son objetos planos: ¡no se validan!
  items!: ItemOrdenDto[];

  @ValidateNested()
  @Type(() => DireccionDto)
  direccionEnvio!: DireccionDto;

  @IsEnum(MetodoPago)
  metodoPago!: MetodoPago;
}
```

¿Por qué hacen falta **dos** decoradores (`@ValidateNested` + `@Type`)? Porque `emitDecoratorMetadata` para `ItemOrdenDto[]` emite solo `Array`: el tipo del elemento se **borra**. `@Type(() => ItemOrdenDto)` le dice a class-transformer qué clase instanciar; `@ValidateNested` le dice a class-validator que entre a validar esas instancias.

> ⚠️ Olvidar `@Type` es el bug #1 de validación anidada: `@ValidateNested` recibe objetos planos, y con `forbidUnknownValues` (default) falla con un error críptico *"an unknown value was passed to the validate function"*, o, en configuraciones antiguas, **no valida nada**.

### 7.1 Arrays en el body raíz

```typescript
@Post('lote')
crearLote(@Body() dtos: CrearProductoDto[]) { ... }   // ❌ el metatipo es Array: NO se valida cada elemento
```

Dos soluciones:

```typescript
// 1) ParseArrayPipe (Sesión 10)
@Post('lote')
crearLote(@Body(new ParseArrayPipe({ items: CrearProductoDto, whitelist: true })) dtos: CrearProductoDto[]) {}

// 2) Envolver en un DTO (preferible: el contrato es extensible)
export class CrearLoteDto {
  @ValidateNested({ each: true }) @Type(() => CrearProductoDto) @ArrayMaxSize(500)
  productos!: CrearProductoDto[];
}
```

> ❓ **Entrevista**: *"¿Por qué `@Body() dto: MiDto[]` no se valida?"* → Porque por *type erasure* el metatipo emitido es `Array`, sin información del elemento. El `ValidationPipe` no sabe qué clase instanciar. Se resuelve con `ParseArrayPipe({ items: MiDto })` o envolviendo el array en un DTO con `@ValidateNested({ each: true })` y `@Type`.

---

## 8. Mapped types: no repitas DTOs

`ActualizarProductoDto` es "lo mismo que crear, pero todo opcional". Copiar y pegar es receta para que diverjan. Nest provee utilidades que **copian también los decoradores de validación**:

```bash
npm i @nestjs/mapped-types   # (si usas Swagger, importa desde @nestjs/swagger: Sesión 21)
```

```typescript
import { IntersectionType, OmitType, PartialType, PickType } from '@nestjs/mapped-types';

// Todo opcional (agrega @IsOptional a cada propiedad heredada)
export class ActualizarProductoDto extends PartialType(CrearProductoDto) {}

// Solo algunas propiedades
export class CambiarPrecioDto extends PickType(CrearProductoDto, ['precioCentavos'] as const) {}

// Todas menos algunas
export class CrearProductoPublicoDto extends OmitType(CrearProductoDto, ['categoriaId'] as const) {}

// Unión de dos DTOs
export class CrearProductoConStockDto extends IntersectionType(CrearProductoDto, StockInicialDto) {}

// Se componen
export class ActualizarUsuarioDto extends PartialType(OmitType(CrearUsuarioDto, ['password'] as const)) {}
```

| Utilidad | Resultado |
|---|---|
| `PartialType(A)` | Todas las props de A, opcionales |
| `PickType(A, keys)` | Solo `keys` de A |
| `OmitType(A, keys)` | A sin `keys` |
| `IntersectionType(A, B)` | Props de A y B |

> ⚠️ Si usas `@nestjs/swagger`, importa estas utilidades **desde `@nestjs/swagger`**, no desde `@nestjs/mapped-types`. Las de swagger además copian la metadata de `@ApiProperty`; las de mapped-types no, y tu documentación OpenAPI quedará vacía para los DTOs derivados.

> ⚠️ `PartialType` + `whitelist` + PATCH: si el cliente envía `{}`, pasa la validación (todo es opcional). Si un PATCH vacío no tiene sentido en tu negocio, valídalo en el service o con un validador de clase.

---

## 9. Validación condicional y grupos

```typescript
export class CrearUsuarioDto {
  @IsEmail()
  email!: string;

  @IsStrongPassword({ minLength: 10, minSymbols: 1 })
  password!: string;

  @IsEnum(TipoCliente)
  tipo!: TipoCliente;            // 'persona' | 'empresa'

  // Solo se valida si es empresa
  @ValidateIf((o: CrearUsuarioDto) => o.tipo === TipoCliente.EMPRESA)
  @IsString()
  @Matches(/^\d{7,8}-[\dkK]$/, { message: 'RUT inválido' })
  rutEmpresa?: string;
}
```

`@ValidateIf` es más poderoso que `@IsOptional`: si la condición es falsa, **se ignoran todos** los validadores de esa propiedad.

Los **grupos** permiten reutilizar un DTO con reglas distintas por contexto:

```typescript
export class ProductoDto {
  @IsInt({ groups: ['actualizar'] })
  id?: number;

  @IsString({ always: true })        // always: se aplica en cualquier grupo
  nombre!: string;
}

// En el endpoint:
@Put(':id')
actualizar(@Body(new ValidationPipe({ groups: ['actualizar'] })) dto: ProductoDto) {}
```

> 💡 En la práctica, los grupos vuelven los DTOs difíciles de leer. Muchos equipos prefieren **un DTO por operación** + mapped types. Usa grupos solo si realmente reducen duplicación.

---

## 10. Validadores propios

### 10.1 Síncrono: decorador reutilizable

Regla de negocio de TiendaApi: un SKU tiene formato `AAA-0000`.

```typescript
// src/common/validators/is-sku.validator.ts
import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsSku(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSku',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && /^[A-Z]{3}-\d{4}$/.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} debe tener formato AAA-0000`;
        },
      },
    });
  };
}

// Uso
export class CrearProductoDto {
  @IsSku()
  sku!: string;
}
```

### 10.2 Validación entre campos

```typescript
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, Validate } from 'class-validator';

@ValidatorConstraint({ name: 'rangoPrecioValido', async: false })
export class RangoPrecioValido implements ValidatorConstraintInterface {
  validate(precioMax: number, args: ValidationArguments) {
    const obj = args.object as { precioMin?: number };
    return obj.precioMin === undefined || precioMax >= obj.precioMin;
  }
  defaultMessage() {
    return 'precioMax debe ser mayor o igual a precioMin';
  }
}

export class FiltroPrecioDto {
  @IsOptional() @Type(() => Number) @IsInt() precioMin?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  @Validate(RangoPrecioValido)
  precioMax?: number;
}
```

### 10.3 Asíncrono con inyección de dependencias

"El email no debe estar registrado". Necesitas el `UsuariosService` dentro de un validador de class-validator, que **no pertenece** al contenedor de Nest. Hay que conectarlos:

```typescript
// src/usuarios/validators/email-unico.validator.ts
import { Injectable } from '@nestjs/common';
import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { UsuariosService } from '../usuarios.service';

@ValidatorConstraint({ name: 'emailUnico', async: true })
@Injectable()                                       // para que Nest lo pueda instanciar con DI
export class EmailUnicoConstraint implements ValidatorConstraintInterface {
  constructor(private readonly usuarios: UsuariosService) {}

  async validate(email: string): Promise<boolean> {
    return !(await this.usuarios.existePorEmail(email));
  }

  defaultMessage() {
    return 'El email $value ya está registrado';
  }
}

export function EmailUnico(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      validator: EmailUnicoConstraint,              // la clase, no una instancia
    });
}
```

```typescript
// usuarios.module.ts → registrar el constraint como provider
@Module({
  providers: [UsuariosService, EmailUnicoConstraint],
  exports: [UsuariosService],
})
export class UsuariosModule {}

// main.ts → decirle a class-validator que resuelva clases desde el contenedor de Nest
import { useContainer } from 'class-validator';

const app = await NestFactory.create(AppModule);
useContainer(app.select(AppModule), { fallbackOnErrors: true });
```

> ⚠️ Validaciones que consultan la BD en el DTO tienen dos problemas: (1) **condición de carrera**: dos requests simultáneas pasan la validación y ambas insertan (la verdadera garantía es un **índice único** en la BD + mapear el error a 409, Sesión 9); (2) mezclan capa HTTP con reglas de negocio. Úsalas para mejorar la UX (mensaje temprano), nunca como única defensa.

> ❓ **Entrevista**: *"¿Cómo inyectas un service en un validador de class-validator?"* → Marcando el constraint con `@Injectable()`, registrándolo como provider en un módulo y llamando a `useContainer(app.select(AppModule), { fallbackOnErrors: true })` en `main.ts` para que class-validator pida las instancias al contenedor de Nest en vez de crearlas con `new`.

---

## 11. Personalizar el formato de errores

El formato por defecto (`message: string[]`) es cómodo, pero un frontend prefiere errores **por campo**. `exceptionFactory` recibe los `ValidationError[]` crudos:

```typescript
import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';

// Aplana errores anidados: "items.0.cantidad", "direccionEnvio.calle"...
function aplanarErrores(errors: ValidationError[], padre = ''): Record<string, string[]> {
  return errors.reduce<Record<string, string[]>>((acc, err) => {
    const ruta = padre ? `${padre}.${err.property}` : err.property;
    if (err.constraints) acc[ruta] = Object.values(err.constraints);
    if (err.children?.length) Object.assign(acc, aplanarErrores(err.children, ruta));
    return acc;
  }, {});
}

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'La request tiene campos inválidos',
        errors: aplanarErrores(errors),
      }),
  }),
);
```

```json
{
  "code": "VALIDATION_ERROR",
  "message": "La request tiene campos inválidos",
  "errors": {
    "items.0.cantidad": ["cantidad must not be greater than 50"],
    "direccionEnvio.calle": ["calle must be longer than or equal to 3 characters"]
  }
}
```

> 💡 `ValidationError` se importa desde `class-validator`; `@nestjs/common` lo re-exporta como tipo en versiones recientes, pero lo más portable es `import { ValidationError } from 'class-validator'`.

En la Sesión 9 llevaremos esto a un **exception filter global** que produce Problem Details (RFC 9457) para *todos* los errores, no solo los de validación.

---

## 12. DTOs de salida y alternativas

### 12.1 La salida también es contrato

Los DTOs de entrada evitan *over-posting*; los de salida evitan *over-exposure* (devolver `passwordHash`, `costoProveedor`...). Las dos estrategias en Nest son:

- **Mapear explícitamente** entidad → objeto de respuesta en el service o un mapper.
- **`ClassSerializerInterceptor`** + `@Exclude()` / `@Expose()` de class-transformer.

Lo vemos en detalle en la **Sesión 21** (serialización) y en la **Sesión 12** (interceptors).

### 12.2 ¿Siempre class-validator?

| Opción | Pros | Contras |
|---|---|---|
| **class-validator + class-transformer** | Estándar de Nest, integración con Swagger, mapped types | Decoradores verbosos, rendimiento medio, mantenimiento lento de las libs |
| **Zod** (con un pipe custom o `nestjs-zod`) | Un schema = tipo TS + validación (`z.infer`), composable, sin decoradores | Integración con Swagger requiere librería extra |
| **Valibot / ArkType / typia** | Muy rápidos o muy pequeños | Menor adopción en el ecosistema Nest |

En la **Sesión 10** implementamos un `ZodValidationPipe` propio para que veas que el `ValidationPipe` no es magia: es un pipe más.

> ❓ **Entrevista**: *"¿Dónde validas: en el DTO o en el dominio?"* → En ambos, con responsabilidades distintas. El DTO valida **forma y formato** (tipos, longitudes, rangos) en el borde HTTP. El dominio valida **invariantes de negocio** (stock suficiente, transición de estado válida) que dependen del estado del sistema. Mezclarlos acopla tu dominio a HTTP (Sesión 30).

---

## Resumen mental de la sesión

```
Tipos TS se BORRAN en runtime → el body es un objeto plano sin validar
DTO = CLASE (existe en runtime, lleva decoradores, emite metatipo). Interface = no se valida.

ValidationPipe:  plainToInstance (class-transformer) → validate (class-validator) → handler
  whitelist            → quita props sin decorador (anti mass-assignment)
  forbidNonWhitelisted → ...y responde 400
  transform            → instancia del DTO + defaults + primitivos en params/query
  enableImplicitConversion → cuidado: Boolean("false") === true
  exceptionFactory     → formato de error propio

@IsOptional acepta undefined Y null
Anidados: @ValidateNested({ each: true }) + @Type(() => Clase)   ← ambos, siempre
Array en body raíz: ParseArrayPipe({ items }) o DTO envoltorio
Mapped types: PartialType / PickType / OmitType / IntersectionType (desde @nestjs/swagger si usas Swagger)
Condicional: @ValidateIf; grupos: groups/always
Custom: registerDecorator / @ValidatorConstraint; con DI → @Injectable + provider + useContainer
Express 5 (Nest 11): query parser "simple" → app.set('query parser', 'extended') si anidas
Validar BD en DTO = UX, no garantía → índice único + 409
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Por qué un DTO tipado en `@Body()` no garantiza nada en runtime?
2. ❓ ¿Por qué los DTOs deben ser clases y no interfaces? ¿Qué papel juega `emitDecoratorMetadata`?
3. ❓ ¿Qué hace el `ValidationPipe` internamente, paso a paso?
4. ❓ `whitelist` vs `forbidNonWhitelisted`: ¿qué ataque previenen y cómo se llama en OWASP?
5. ❓ ¿Qué hace `transform: true`? ¿Por qué los valores por defecto de un DTO de query no funcionan sin él?
6. ❓ ¿Qué problema tiene `enableImplicitConversion` con booleanos en query strings?
7. ❓ ¿Por qué `@ValidateNested` necesita `@Type`?
8. ❓ ¿Cómo validas un array de DTOs recibido como body raíz?
9. ❓ ¿Qué hacen `PartialType`, `PickType`, `OmitType`? ¿Por qué importarlas desde `@nestjs/swagger`?
10. ❓ ¿`@IsOptional` acepta `null`? ¿Qué implicancias tiene en un PATCH?
11. ❓ ¿Cómo inyectas un service en un validador async? ¿Por qué no basta para garantizar unicidad?
12. ❓ ¿Qué cambió en el query parser con Express 5 / Nest 11?

## Ejercicio práctico
1. En TiendaApi, instala `class-validator`, `class-transformer` y `@nestjs/mapped-types`.
2. Crea `CrearProductoDto` (nombre, descripción opcional, `precioCentavos`, `categoriaId`, `sku` con tu decorador `@IsSku`) y `ActualizarProductoDto extends PartialType(CrearProductoDto)`.
3. Configura el `ValidationPipe` global con `whitelist`, `forbidNonWhitelisted` y `transform`. Envía un body con `"esAdmin": true` y verifica el 400.
4. Cambia temporalmente el DTO a `interface` y comprueba que **ya no valida nada**. Vuelve a clase.
5. Crea `ListarProductosQueryDto` con `page`, `pageSize` (máx. 100), `busqueda` (trim + lowercase) y `soloActivos` (booleano con `@Transform` explícito). Prueba `?soloActivos=false` con y sin tu transform usando `enableImplicitConversion: true`.
6. Crea `CrearOrdenDto` con `items: ItemOrdenDto[]` y `direccionEnvio: DireccionDto`. Quita el `@Type` de `items` y observa qué error aparece; vuelve a ponerlo.
7. Crea el endpoint `POST /productos/lote` y valida el array con `ParseArrayPipe`.
8. Implementa `@EmailUnico()` con DI y `useContainer` (el service puede usar un array en memoria).
9. Implementa el `exceptionFactory` que devuelve errores por campo con rutas anidadas (`items.0.cantidad`).
10. (Opcional) Si tu query usa `?filtro[precio][gte]=100`, comprueba el comportamiento con el parser por defecto de Express 5 y luego con `app.set('query parser', 'extended')`.

---

➡️ **Cuando termines**, marca la Sesión 6 en el [README](README.md) y pasa a la **Sesión 7 — Configuración: ConfigModule, .env, validación de config y entornos**.

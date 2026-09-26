# Sesión 18 — Autenticación: Passport, JWT, access/refresh tokens, hashing

> **Objetivo de la sesión**: implementar la autenticación de TiendaApi como se hace en producción y entender el *porqué* de cada decisión. Al terminar deberías poder explicar la diferencia entre sesiones y tokens, **hashear contraseñas** correctamente (argon2id / bcrypt), describir la anatomía de un **JWT** y sus riesgos, configurar `@nestjs/jwt` y `@nestjs/passport` (estrategias `local` y `jwt`), proteger toda la API con un **guard global + `@Public()`**, y diseñar un flujo de **access + refresh tokens con rotación y detección de reutilización**, incluyendo logout y revocación.

---

## 1. Autenticación vs autorización

| | Autenticación (AuthN) | Autorización (AuthZ) |
|---|---|---|
| Pregunta | **¿Quién eres?** | **¿Qué puedes hacer?** |
| Falla con | `401 Unauthorized` | `403 Forbidden` |
| Ejemplos | Login, JWT, API key, OAuth/OIDC | Roles, permisos, ownership |
| Sesión | Esta (18) | Siguiente (19) |

En el ciclo de vida de Nest (Sesión 13), ambas viven normalmente en **guards**: primero uno que autentica (y deja `request.user`), luego otros que autorizan leyendo ese usuario.

```
Request ─▶ Middleware ─▶ [JwtAuthGuard] ─▶ [RolesGuard] ─▶ Interceptors ─▶ Pipes ─▶ Handler
                          ¿token válido?     ¿rol admin?
                          → req.user         (Sesión 19)
                          ✗ 401              ✗ 403
```

---

## 2. Sesiones con estado vs tokens sin estado

| Aspecto | **Sesión (stateful)** | **JWT (stateless)** |
|---|---|---|
| Qué recibe el cliente | Un id opaco (cookie `sid`) | Un token firmado con los claims dentro |
| Dónde vive el estado | Servidor (Redis, BD) | En el propio token |
| Validar una request | Lookup en el store | Verificar firma (CPU, sin I/O) |
| Revocar | Trivial: borras la sesión | Difícil: el token vale hasta `exp` |
| Escalado horizontal | Store compartido (Redis) | Cualquier instancia valida sola |
| Microservicios | Cada servicio consulta el store | Cada servicio verifica con la clave pública |
| Tamaño | ~32 bytes | 300–1000+ bytes en cada request |

La solución habitual combina ambos mundos: **access token JWT de vida corta** (5–15 min, stateless, rápido) + **refresh token de vida larga guardado en el servidor** (revocable). Así la revocación tarda como máximo lo que dura el access token.

> ❓ **Entrevista**: *"¿JWT o sesiones?"* → Para un monolito web con un solo frontend, las sesiones en cookie son más simples y se revocan al instante. JWT brilla cuando varios servicios o clientes (móvil, terceros) deben validar identidad sin consultar un store central. Lo que no se defiende es un JWT de 30 días sin forma de revocarlo.

---

## 3. Hashing de contraseñas

### 3.1 Por qué no SHA-256 ni cifrado

- **Cifrar** es reversible: si roban la clave, tienen todas las contraseñas. Las contraseñas se **hashean**, nunca se cifran.
- **SHA-256/MD5** son hashes *rápidos* a propósito: una GPU calcula miles de millones por segundo → un diccionario rompe la mayoría de contraseñas en horas.
- Un **KDF de contraseñas** (argon2, bcrypt, scrypt) es **lento y costoso en memoria a propósito**, e incluye un **salt** aleatorio por usuario (dos usuarios con la misma contraseña tienen hashes distintos → las *rainbow tables* no sirven).

| Algoritmo | Estado | Parámetros mínimos (OWASP) | Nota |
|---|---|---|---|
| **argon2id** | ✅ Recomendado | m = 19 MiB, t = 2, p = 1 | Ganador de la Password Hashing Competition; resistente a GPU por memoria |
| **bcrypt** | ✅ Aceptable | cost ≥ 10 (12 es común) | Trunca la entrada a **72 bytes** |
| scrypt | ✅ Aceptable | N = 2^17, r = 8, p = 1 | Nativo en `node:crypto` |
| PBKDF2 | ⚠️ Solo si FIPS lo exige | 600 000 iteraciones (SHA-256) | No usa memoria |
| SHA-*, MD5 | ❌ | — | Nunca para contraseñas |

### 3.2 Un servicio de hashing intercambiable

```bash
npm i argon2          # binding nativo; alternativa pura JS: bcryptjs (más lenta)
```

```typescript
// src/auth/hashing/hashing.service.ts
// Clase abstracta como token de DI (Sesión 17): cambiar de algoritmo = cambiar un provider
export abstract class HashingService {
  abstract hash(plano: string): Promise<string>;
  abstract verificar(plano: string, hash: string): Promise<boolean>;
  abstract necesitaRehash(hash: string): boolean;
}
```

```typescript
// src/auth/hashing/argon2.service.ts
import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { HashingService } from './hashing.service';

const OPCIONES = {
  type: argon2.argon2id,
  memoryCost: 19_456, // KiB = 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class Argon2Service extends HashingService {
  hash(plano: string) {
    // El salt se genera solo y queda codificado dentro del string:
    // $argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>
    return argon2.hash(plano, OPCIONES);
  }

  async verificar(plano: string, hash: string) {
    try {
      return await argon2.verify(hash, plano); // lee salt y parámetros del propio hash
    } catch {
      return false; // hash corrupto o con formato desconocido
    }
  }

  necesitaRehash(hash: string) {
    // true si el hash se creó con parámetros más débiles que los actuales
    return argon2.needsRehash(hash, OPCIONES);
  }
}
```

Con bcrypt la implementación equivalente sería `bcrypt.hash(plano, 12)` y `bcrypt.compare(plano, hash)`.

> ⚠️ **bcrypt y los 72 bytes**: todo lo que pase del byte 72 se ignora. Con contraseñas largas o pre-hashes esto puede ser un problema; limita la longitud en el DTO (`@MaxLength(72)`) o usa argon2.

> 💡 **Rehash transparente**: al hacer login correcto, si `necesitaRehash(hash)` es `true`, guarda un hash nuevo con los parámetros actuales. Así subes el costo con el tiempo sin forzar a nadie a cambiar su contraseña.

> ⚠️ El hashing es CPU/memoria intensivo. argon2 y bcrypt nativos corren en el **threadpool de libuv** (no bloquean el event loop), pero cada login consume recursos reales: por eso el endpoint de login necesita **rate limiting** (Sesión 20).

---

## 4. Anatomía de un JWT

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 . eyJzdWIiOiI0MiIsInJvbGVzIjpbImNsaWVudGUiXSwiZXhwIjoxNzI3MDAwMDAwfQ . 3q2+7w...
└──────────── HEADER ────────────┘   └──────────────────────── PAYLOAD ────────────────────────┘   └─ SIGNATURE ─┘
 {"alg":"HS256","typ":"JWT"}          {"sub":"42","roles":["cliente"],"iat":...,"exp":...}          HMAC(header.payload, secret)
```

- Header y payload son **base64url, no cifrados**: cualquiera puede leerlos (pégalo en jwt.io). **Nunca** pongas datos sensibles en el payload.
- La **firma** garantiza *integridad*: si alguien cambia `"roles":["admin"]`, la firma deja de coincidir.

| Claim | Significado |
|---|---|
| `sub` | Subject: id del usuario |
| `exp` | Expiración (epoch en segundos) |
| `iat` | Emitido en |
| `nbf` | No válido antes de |
| `iss` | Emisor (`tienda-api`) |
| `aud` | Audiencia (`tienda-web`): evita usar un token de un servicio en otro |
| `jti` | Id único del token (para revocación/denylist) |

| Algoritmo | Tipo | Quién puede firmar | Quién puede verificar | Uso |
|---|---|---|---|---|
| **HS256** | Simétrico (HMAC) | Quien tenga el secreto | Quien tenga el mismo secreto | Monolito: el mismo servicio emite y valida |
| **RS256 / ES256** | Asimétrico | Solo quien tiene la clave privada | Cualquiera con la clave pública (JWKS) | Microservicios, IdP externos (Auth0, Cognito, Keycloak) |

> ⚠️ Ataques clásicos: **`alg: none`** (token sin firma aceptado) y **confusión de algoritmo** (verificar un RS256 como HS256 usando la clave pública como secreto). Defensa: fija explícitamente los algoritmos aceptados al verificar (`algorithms: ['HS256']`), y usa librerías mantenidas (`jsonwebtoken`, que usa `@nestjs/jwt`, rechaza `none` si hay secreto).

> ⚠️ El secreto HS256 debe ser largo y aleatorio (≥ 256 bits: `openssl rand -base64 32`), distinto para access y refresh, y vivir en un gestor de secretos (Sesión 7), nunca en el repositorio.

---

## 5. Configurar `@nestjs/jwt`

```bash
npm i @nestjs/jwt @nestjs/passport passport passport-local passport-jwt cookie-parser
npm i -D @types/passport-local @types/passport-jwt @types/cookie-parser
```

```typescript
// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HashingService } from './hashing/hashing.service';
import { Argon2Service } from './hashing/argon2.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokensService } from './refresh-tokens.service';

@Module({
  imports: [
    UsuariosModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '15m', issuer: 'tienda-api', audience: 'tienda-web' },
        verifyOptions: { algorithms: ['HS256'], issuer: 'tienda-api', audience: 'tienda-web' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RefreshTokensService,
    LocalStrategy,
    JwtStrategy,
    { provide: HashingService, useClass: Argon2Service },
    // Guard GLOBAL: toda ruta requiere JWT salvo las marcadas con @Public() (sección 7)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
```

> 💡 Registrar `APP_GUARD` dentro de `AuthModule` lo aplica a **toda la aplicación**, no solo al módulo. Es el patrón recomendado: seguro por defecto, y las excepciones son explícitas.

---

## 6. Passport: estrategias `local` y `jwt`

**Passport** es la librería de autenticación más usada de Node, con 500+ estrategias (local, JWT, Google, GitHub, SAML...). `@nestjs/passport` la envuelve: cada estrategia es un **provider** que extiende `PassportStrategy(Strategy)` y cuyo método `validate()` devuelve lo que acabará en `request.user`.

```
AuthGuard('local') ─▶ LocalStrategy ─▶ passport-local lee email/password del body
                                         └─▶ validate(email, password) → usuario | lanza 401
                                               └─▶ req.user = usuario

AuthGuard('jwt') ─▶ JwtStrategy ─▶ passport-jwt extrae Bearer, VERIFICA firma y exp
                                     └─▶ validate(payload) → objeto
                                           └─▶ req.user = objeto
```

### 6.1 Servicio de autenticación

```typescript
// src/auth/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { HashingService } from './hashing/hashing.service';
import { RefreshTokensService } from './refresh-tokens.service';
import { RegistroDto } from './dto/registro.dto';

export interface JwtPayload { sub: string; email: string; roles: string[] }
export interface UsuarioAutenticado { id: string; email: string; roles: string[] }
export interface Tokens { accessToken: string; refreshToken: string }

@Injectable()
export class AuthService {
  // Hash "señuelo" precalculado: se verifica aunque el usuario no exista (ver 6.2)
  private hashSenuelo?: Promise<string>;

  constructor(
    private readonly usuarios: UsuariosService,
    private readonly hashing: HashingService,
    private readonly jwt: JwtService,
    private readonly refreshTokens: RefreshTokensService,
  ) {}

  async registrar(dto: RegistroDto): Promise<UsuarioAutenticado> {
    if (await this.usuarios.buscarPorEmail(dto.email)) throw new ConflictException('Email ya registrado');
    const passwordHash = await this.hashing.hash(dto.password);
    const u = await this.usuarios.crear({ email: dto.email, nombre: dto.nombre, passwordHash });
    return { id: u.id, email: u.email, roles: u.roles };
  }

  // Usado por LocalStrategy
  async validarCredenciales(email: string, password: string): Promise<UsuarioAutenticado> {
    const u = await this.usuarios.buscarPorEmailConHash(email.toLowerCase());
    this.hashSenuelo ??= this.hashing.hash('password-senuelo');
    const ok = await this.hashing.verificar(password, u?.passwordHash ?? (await this.hashSenuelo));
    // MISMO mensaje para "no existe" y "password incorrecta": evita enumeración de usuarios
    if (!u || !ok || !u.activo) throw new UnauthorizedException('Credenciales inválidas');

    if (this.hashing.necesitaRehash(u.passwordHash)) {
      await this.usuarios.actualizarHash(u.id, await this.hashing.hash(password));
    }
    return { id: u.id, email: u.email, roles: u.roles };
  }

  async emitirTokens(usuario: UsuarioAutenticado, familia?: string): Promise<Tokens> {
    const payload: JwtPayload = { sub: usuario.id, email: usuario.email, roles: usuario.roles };
    const accessToken = await this.jwt.signAsync(payload); // usa secret/expiresIn del módulo
    const refreshToken = await this.refreshTokens.emitir(usuario.id, familia);
    return { accessToken, refreshToken };
  }
}
```

### 6.2 Estrategia local (login)

```typescript
// src/auth/strategies/local.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService, UsuarioAutenticado } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) { // nombre por defecto: 'local'
  constructor(private readonly auth: AuthService) {
    super({ usernameField: 'email' }); // passport-local espera "username" por defecto
  }

  // Passport llama a validate con los campos del body; lo que retorne → req.user
  validate(email: string, password: string): Promise<UsuarioAutenticado> {
    return this.auth.validarCredenciales(email, password);
  }
}
```

> ⚠️ **Timing attack / enumeración**: si cuando el email no existe respondes en 2 ms y cuando existe (verificando argon2) en 80 ms, un atacante descubre qué emails están registrados midiendo tiempos. Por eso `validarCredenciales` verifica contra un hash señuelo también cuando el usuario no existe, y devuelve siempre el mismo mensaje.

> ⚠️ `passport-local` **no ejecuta** tu `ValidationPipe`: el guard corre **antes** que los pipes (Sesión 13). Si quieres validar el formato del body del login, hazlo en la estrategia o no uses `AuthGuard('local')` (ver sección 8).

### 6.3 Estrategia JWT (rutas protegidas)

```typescript
// src/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, UsuarioAutenticado } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) { // nombre por defecto: 'jwt'
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Authorization: Bearer <token>
      ignoreExpiration: false,                                 // exp vencido → 401
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      algorithms: ['HS256'],
      issuer: 'tienda-api',
      audience: 'tienda-web',
    });
  }

  // Aquí la firma YA fue verificada. validate solo transforma el payload en req.user.
  validate(payload: JwtPayload): UsuarioAutenticado {
    return { id: payload.sub, email: payload.email, roles: payload.roles };
  }
}
```

> ❓ **Entrevista**: *"¿Consultas la base de datos en `validate()` de la JwtStrategy?"* → Es un trade-off. Sin consulta: stateless y rápido, pero un usuario bloqueado sigue entrando hasta que vence el access token (por eso debe durar poco). Con consulta (o caché en Redis): puedes verificar `activo` o un `tokenVersion`, a costa de I/O en cada request. Con access tokens de 15 min, lo habitual es no consultar y confiar en el refresh para revocar.

---

## 7. Guard global y `@Public()`

```typescript
// src/auth/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

```typescript
// src/auth/guards/jwt-auth.guard.ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) { super(); }

  canActivate(context: ExecutionContext) {
    // getAllAndOverride: el metadata del handler tiene prioridad sobre el de la clase (Sesión 11)
    const esPublica = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (esPublica) return true;
    return super.canActivate(context); // delega en passport-jwt
  }
}

// Guard para el login con la estrategia local
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
```

### 7.1 Decorador `@UsuarioActual()`

```typescript
// src/auth/decorators/usuario-actual.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UsuarioAutenticado } from '../auth.service';

export const UsuarioActual = createParamDecorator(
  (campo: keyof UsuarioAutenticado | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest().user as UsuarioAutenticado;
    return campo ? user?.[campo] : user;
  },
);

// uso: @Get('me') perfil(@UsuarioActual() u: UsuarioAutenticado) {}
//      @Get('mis-ordenes') ordenes(@UsuarioActual('id') id: string) {}
```

> 💡 Para tipar `request.user` en todo el proyecto, extiende la interfaz de Express: `declare global { namespace Express { interface User extends UsuarioAutenticado {} } }`.

---

## 8. ¿Passport o un guard propio?

La documentación oficial de Nest muestra ambos caminos. Sin Passport, un guard con `JwtService.verifyAsync` hace lo mismo que `JwtStrategy`:

```typescript
@Injectable()
export class JwtAuthGuardSinPassport implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()])) return true;
    const req = ctx.switchToHttp().getRequest<Request>();
    const [tipo, token] = req.headers.authorization?.split(' ') ?? [];
    if (tipo !== 'Bearer' || !token) throw new UnauthorizedException();
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token); // usa verifyOptions del módulo
      req.user = { id: payload.sub, email: payload.email, roles: payload.roles };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
```

| | Passport | Guard propio |
|---|---|---|
| Código | Estrategias + guards | Un guard |
| OAuth/social login (Google, GitHub), SAML | ✅ Estrategias listas | Tendrías que implementarlo |
| Múltiples mecanismos en la misma ruta | `AuthGuard(['jwt', 'api-key'])` | Manual |
| Control y transparencia | Algo de "magia" | Total |
| Login con validación de DTO | Guard corre antes que el pipe | Controller normal con `ValidationPipe` |

En la práctica: Passport cuando necesitas varias estrategias (sobre todo OAuth); guard propio para una API con solo JWT. Ambos son válidos.

---

## 9. Access + refresh tokens con rotación

### 9.1 El flujo

```
Cliente                                    TiendaApi                           BD
  │ POST /auth/login {email,pwd}              │                                  │
  │──────────────────────────────────────────▶│ verifica argon2                  │
  │                                           │ emite access (15m) + refresh (7d)│
  │                                           │─── guarda hash(refresh), familia ▶│
  │◀── 200 { accessToken } + Set-Cookie: rt ──│                                  │
  │                                           │                                  │
  │ GET /ordenes  Authorization: Bearer AT    │ verifica firma (sin BD)          │
  │──────────────────────────────────────────▶│                                  │
  │ ... 15 min después: 401 (AT expirado) ... │                                  │
  │ POST /auth/refresh  (cookie rt)           │                                  │
  │──────────────────────────────────────────▶│ busca rt, ¿válido y no usado?    │
  │                                           │ marca rt como usado ─────────────▶│
  │                                           │ emite AT nuevo + rt NUEVO (misma familia)
  │◀── 200 { accessToken } + Set-Cookie: rt' ─│                                  │
```

**Rotación**: cada refresh token es de **un solo uso**; al usarlo se emite uno nuevo. **Detección de reutilización**: si llega un refresh token *ya usado*, significa que alguien lo copió (el legítimo y el atacante tienen el mismo). Respuesta: revocar **toda la familia** y forzar login.

### 9.2 Refresh tokens opacos guardados en la BD

El refresh token no necesita ser JWT: un valor aleatorio opaco es más simple y se valida contra la BD igual.

```prisma
// prisma/schema.prisma
model RefreshToken {
  id         String    @id @default(uuid())
  usuarioId  String
  familia    String    // todos los tokens de una misma sesión de login
  hash       String    // SHA-256 del secreto: nunca guardes el token en claro
  expiraEn   DateTime
  usadoEn    DateTime?
  revocadoEn DateTime?
  createdAt  DateTime  @default(now())
  usuario    Usuario   @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  @@index([usuarioId])
  @@index([familia])
}
```

```typescript
// src/auth/refresh-tokens.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

const DURACION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

@Injectable()
export class RefreshTokensService {
  constructor(private readonly prisma: PrismaService) {}

  // SHA-256 basta aquí: el token tiene 256 bits de entropía, no es una contraseña humana
  private sha256(valor: string) { return createHash('sha256').update(valor).digest(); }

  async emitir(usuarioId: string, familia = randomUUID()): Promise<string> {
    const secreto = randomBytes(32).toString('base64url');
    const registro = await this.prisma.refreshToken.create({
      data: {
        usuarioId, familia,
        hash: this.sha256(secreto).toString('hex'),
        expiraEn: new Date(Date.now() + DURACION_MS),
      },
    });
    return `${registro.id}.${secreto}`; // id para buscar + secreto para verificar
  }

  /** Valida y CONSUME el token. Devuelve usuario y familia para emitir el siguiente. */
  async rotar(token: string): Promise<{ usuarioId: string; familia: string }> {
    const [id, secreto] = token.split('.');
    if (!id || !secreto) throw new UnauthorizedException();

    const rt = await this.prisma.refreshToken.findUnique({ where: { id } });
    const coincide = rt && timingSafeEqual(Buffer.from(rt.hash, 'hex'), this.sha256(secreto));
    if (!rt || !coincide) throw new UnauthorizedException('Refresh token inválido');

    if (rt.usadoEn || rt.revocadoEn) {
      // 🚨 REUTILIZACIÓN: alguien más tiene este token → revocar toda la familia
      await this.revocarFamilia(rt.familia);
      throw new UnauthorizedException('Sesión revocada');
    }
    if (rt.expiraEn < new Date()) throw new UnauthorizedException('Refresh token expirado');

    // Marcado atómico: si dos requests usan el mismo token a la vez, solo una gana (Sesión 17)
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id, usadoEn: null },
      data: { usadoEn: new Date() },
    });
    if (count !== 1) {
      await this.revocarFamilia(rt.familia);
      throw new UnauthorizedException('Sesión revocada');
    }
    return { usuarioId: rt.usuarioId, familia: rt.familia };
  }

  revocarFamilia(familia: string) {
    return this.prisma.refreshToken.updateMany({
      where: { familia, revocadoEn: null }, data: { revocadoEn: new Date() },
    });
  }

  revocarTodas(usuarioId: string) { // "cerrar sesión en todos los dispositivos"
    return this.prisma.refreshToken.updateMany({
      where: { usuarioId, revocadoEn: null }, data: { revocadoEn: new Date() },
    });
  }
}
```

> ⚠️ Con rotación estricta, un frontend que dispara **dos refresh en paralelo** (dos pestañas o dos requests que reciben 401 a la vez) provoca un falso positivo de reutilización y cierra la sesión. Solución en el cliente: una sola promesa de refresh compartida; en el servidor, algunos equipos toleran un *grace period* de pocos segundos para el token recién rotado.

> 💡 Programa un job (Sesión 25) que borre refresh tokens expirados: la tabla crece con cada refresh.

### 9.3 El controller

```typescript
// src/auth/auth.controller.ts
import { Body, Controller, HttpCode, Post, Req, Res, UseGuards, UnauthorizedException, Get } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, UsuarioAutenticado } from './auth.service';
import { RefreshTokensService } from './refresh-tokens.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { Public } from './decorators/public.decorator';
import { UsuarioActual } from './decorators/usuario-actual.decorator';
import { LocalAuthGuard } from './guards/jwt-auth.guard';
import { RegistroDto } from './dto/registro.dto';

const COOKIE_RT = 'rt';
const opcionesCookie = {
  httpOnly: true,                         // JavaScript NO puede leerla → inmune a robo por XSS
  secure: process.env.NODE_ENV === 'production', // solo HTTPS
  sameSite: 'strict' as const,            // no viaja en requests cross-site (mitiga CSRF, Sesión 20)
  path: '/auth',                          // solo se envía a /auth/*, no a cada request de la API
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly refreshTokens: RefreshTokensService,
    private readonly usuarios: UsuariosService,
  ) {}

  @Public()
  @Post('registro')
  registrar(@Body() dto: RegistroDto) {
    return this.auth.registrar(dto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)       // valida credenciales; req.user = UsuarioAutenticado
  @HttpCode(200)                   // POST por defecto devuelve 201; login no crea un recurso
  @Post('login')
  async login(@UsuarioActual() u: UsuarioAutenticado, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.auth.emitirTokens(u);
    res.cookie(COOKIE_RT, refreshToken, opcionesCookie);
    return { accessToken, expiraEn: 900 };
  }

  @Public()                        // el access token puede estar vencido: por eso es pública
  @HttpCode(200)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[COOKIE_RT];
    if (!token) throw new UnauthorizedException();
    const { usuarioId, familia } = await this.refreshTokens.rotar(token);
    const u = await this.usuarios.obtenerActivo(usuarioId); // roles frescos + ¿sigue activo?
    const tokens = await this.auth.emitirTokens({ id: u.id, email: u.email, roles: u.roles }, familia);
    res.cookie(COOKIE_RT, tokens.refreshToken, opcionesCookie);
    return { accessToken: tokens.accessToken, expiraEn: 900 };
  }

  @Public()
  @HttpCode(204)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[COOKIE_RT];
    if (token) await this.refreshTokens.rotar(token).then(({ familia }) => this.refreshTokens.revocarFamilia(familia)).catch(() => undefined);
    res.clearCookie(COOKIE_RT, { ...opcionesCookie, maxAge: undefined });
  }

  @Get('me')
  perfil(@UsuarioActual() u: UsuarioAutenticado) {
    return u;
  }
}
```

```typescript
// main.ts
import * as cookieParser from 'cookie-parser'; // (con esModuleInterop: import cookieParser from ...)
app.use(cookieParser()); // necesario para leer req.cookies
```

> ⚠️ `@Res()` **sin** `passthrough: true` desactiva el manejo de respuesta de Nest (interceptors de serialización, `return` como body): te obliga a llamar `res.json()` a mano. Con `passthrough: true` puedes poner cookies y seguir devolviendo el valor normalmente.

> 💡 Si prefieres refresh tokens JWT, crea una segunda estrategia con nombre: `PassportStrategy(Strategy, 'jwt-refresh')` con otro secreto, `jwtFromRequest: ExtractJwt.fromExtractors([(req) => req?.cookies?.rt ?? null])` y `passReqToCallback: true`. Igualmente necesitarás guardar su `jti` en la BD para rotación y revocación.

---

## 10. ¿Dónde guarda el cliente los tokens?

| Opción | XSS (script malicioso) | CSRF | Nota |
|---|---|---|---|
| `localStorage` | ❌ El script lo lee y lo exfiltra | ✅ No aplica (no se envía solo) | Simple, pero un XSS = robo de sesión persistente |
| **Memoria (variable JS)** para el access token | ⚠️ El script puede usarlo mientras la página esté abierta, no robarlo a largo plazo | ✅ | Se pierde al recargar → se recupera con refresh |
| **Cookie `httpOnly` + `Secure` + `SameSite`** para el refresh | ✅ JS no la lee | ⚠️ Mitigado por `SameSite` y `path` | Recomendado para el refresh token |

Patrón recomendado para SPAs: **access token en memoria** + **refresh en cookie `httpOnly` restringida a `/auth`**. Para apps móviles: almacenamiento seguro del SO (Keychain / Keystore). CSRF y CORS en detalle en la **Sesión 20**.

---

## 11. Revocación inmediata y otros mecanismos

Si un admin bloquea una cuenta, el access token sigue siendo válido hasta `exp`. Opciones para acortar esa ventana:

| Técnica | Cómo | Costo |
|---|---|---|
| Access tokens cortos | 5–15 min | Ninguno; la ventana existe igual |
| **`tokenVersion`** en el usuario | Se incluye en el JWT; `validate()` compara con la BD/caché; incrementar = revocar todos | 1 lookup (cacheable en Redis) |
| **Denylist por `jti`** | Guardar en Redis los `jti` revocados con TTL = tiempo restante del token | 1 lookup en Redis por request |
| Introspección (OAuth2) | Preguntar al IdP en cada request | Latencia |

Otros mecanismos que aparecen en proyectos reales:
- **API keys** para integraciones máquina-a-máquina: genera un valor aleatorio, guarda solo su hash, muestra el valor una sola vez (como GitHub).
- **OAuth2 / OpenID Connect**: login social (`passport-google-oauth20`) o un IdP externo (Cognito, Auth0, Keycloak). En ese caso tu API solo **valida** tokens RS256 con la clave pública del IdP (JWKS, p. ej. con `jwks-rsa` en `secretOrKeyProvider`).
- **MFA/TOTP**: segundo factor tras el password (librerías como `otplib`); el primer login emite un token temporal con alcance "solo completar MFA".

> ❓ **Entrevista**: *"¿Cómo harías logout con JWT?"* → El access token no se puede "borrar" del servidor: expira solo. El logout revoca el **refresh token** (o su familia) y borra la cookie; el access token muere en ≤ 15 min. Si se necesita revocación inmediata, se añade una denylist por `jti` o un `tokenVersion`.

---

## Resumen mental de la sesión

```
AuthN = ¿quién eres? (401)   AuthZ = ¿qué puedes? (403, Sesión 19)

PASSWORDS: KDF lento + salt → argon2id (m=19MiB,t=2,p=1) | bcrypt cost ≥ 12 (72 bytes)
  nunca SHA/MD5/cifrado; needsRehash al hacer login; mismo mensaje + hash señuelo (anti-enumeración)

JWT = header.payload.firma (base64url, NO cifrado)
  HS256 simétrico (monolito) | RS256/ES256 asimétrico (microservicios, IdP, JWKS)
  claims: sub exp iat iss aud jti; fijar algorithms; secreto ≥ 256 bits en secret manager

Nest:
  JwtModule.registerAsync({ secret, signOptions: { expiresIn:'15m', issuer, audience } })
  PassportStrategy(Strategy) → validate() → req.user
    local: super({ usernameField:'email' })   jwt: ExtractJwt.fromAuthHeaderAsBearerToken()
  APP_GUARD = JwtAuthGuard (extends AuthGuard('jwt')) + @Public() vía Reflector.getAllAndOverride
  @UsuarioActual() con createParamDecorator
  Sin Passport: guard + jwtService.verifyAsync

TOKENS: access corto (memoria) + refresh largo (cookie httpOnly, Secure, SameSite, path=/auth)
  refresh opaco, hash SHA-256 en BD, un solo uso (ROTACIÓN), familia
  token ya usado → REUTILIZACIÓN → revocar familia
  logout = revocar refresh; revocación inmediata = tokenVersion / denylist jti en Redis
@Res({ passthrough: true }) para cookies sin perder el manejo de respuesta de Nest
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ Diferencia entre autenticación y autorización. ¿Qué status HTTP corresponde a cada fallo?
2. ❓ Sesiones con estado vs JWT: ventajas y desventajas de cada uno.
3. ❓ ¿Por qué no usar SHA-256 para contraseñas? ¿Qué es un salt y qué problema resuelve?
4. ❓ argon2id vs bcrypt: ¿cuál elegirías y qué limitación tiene bcrypt?
5. ❓ ¿Un JWT está cifrado? ¿Qué garantiza la firma? ¿Qué es el ataque `alg: none`?
6. ❓ HS256 vs RS256: ¿cuándo usar cada uno?
7. ❓ ¿Qué hace `validate()` en una estrategia de Passport y qué pasa con lo que retorna?
8. ❓ ¿Cómo proteges toda la API por defecto y dejas públicas algunas rutas?
9. ❓ ¿Por qué tener access token corto + refresh token largo? ¿Qué es la rotación y la detección de reutilización?
10. ❓ ¿Dónde guardarías el access token y el refresh token en una SPA? Justifica frente a XSS y CSRF.
11. ❓ ¿Cómo implementas logout y revocación inmediata con JWT?
12. ❓ ¿Qué es la enumeración de usuarios por timing y cómo la mitigas en el login?

## Ejercicio práctico
1. Instala `@nestjs/jwt`, `@nestjs/passport`, `passport-local`, `passport-jwt`, `argon2` y `cookie-parser`. Genera dos secretos con `openssl rand -base64 32` y ponlos en `.env` validado (Sesión 7).
2. Implementa `HashingService` abstracto con `Argon2Service`; agrega una implementación `BcryptService` y cambia entre ambas solo tocando el provider.
3. Implementa `POST /auth/registro` (DTO con `@IsEmail`, `@MinLength(12)`) y `POST /auth/login` con `LocalStrategy`.
4. Registra `JwtAuthGuard` como `APP_GUARD`, crea `@Public()` y verifica que `GET /productos` pide token salvo que lo marques público.
5. Crea `@UsuarioActual()` e implementa `GET /auth/me`.
6. Implementa refresh tokens opacos con rotación y familia (modelo `RefreshToken`). Prueba: haz refresh, luego reutiliza el token viejo y verifica que la familia entera queda revocada.
7. Implementa `POST /auth/logout` y un endpoint `POST /auth/logout-todos` que llame `revocarTodas`.
8. Mide con un script el tiempo de respuesta del login para un email existente con password incorrecta vs un email inexistente; confirma que son similares gracias al hash señuelo.
9. Decodifica tu access token en jwt.io, cambia un rol en el payload y verifica que la API lo rechaza con 401.
10. (Opcional) Reemplaza el `JwtAuthGuard` de Passport por el guard propio de la sección 8 y compara la cantidad de código.

---

➡️ **Cuando termines**, marca la Sesión 18 en el [README](README.md) y pasa a la **Sesión 19 — Autorización: roles (RBAC), CASL, policies y ownership**.

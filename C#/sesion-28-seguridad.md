# Sesión 28 — Seguridad: JWT, OAuth 2.0 / OpenID Connect, ASP.NET Core Identity y OWASP

> **Objetivo de la sesión**: distinguir con precisión **autenticación** de **autorización**, entender cómo funciona el pipeline de seguridad de ASP.NET Core (schemes, handlers, claims, policies), emitir y validar **JWT** correctamente (y conocer sus trampas), explicar los flujos de **OAuth 2.0 / OpenID Connect** (Authorization Code + PKCE, Client Credentials), saber cuándo usar **ASP.NET Core Identity**, y recorrer el **OWASP Top 10** con la mitigación concreta en .NET para cada riesgo. Al terminar deberías poder asegurar el API `Tienda` de las sesiones 26–27 y responder cualquier pregunta de seguridad de una entrevista senior.

---

## 1. Autenticación vs Autorización

| | **Autenticación (AuthN)** | **Autorización (AuthZ)** |
|---|---|---|
| Pregunta | *¿Quién eres?* | *¿Qué puedes hacer?* |
| Resultado | Una identidad (`ClaimsPrincipal`) | Permitir / denegar |
| Código HTTP al fallar | **401 Unauthorized** (en realidad "unauthenticated") | **403 Forbidden** |
| En ASP.NET Core | `AddAuthentication` + `UseAuthentication()` | `AddAuthorization` + `UseAuthorization()` + `[Authorize]` |

> ❓ **Entrevista**: *"¿401 o 403?"* → **401** cuando no hay credenciales válidas (no sé quién eres; el servidor debe mandar `WWW-Authenticate`). **403** cuando sé quién eres pero no tienes permiso. Devolver 404 en lugar de 403 es válido para no revelar que un recurso existe.

### 1.1 El modelo de identidad de .NET: Claims

```
ClaimsPrincipal  (el "usuario" de la request: HttpContext.User)
   └── ClaimsIdentity  (una por scheme de autenticación; IsAuthenticated, AuthenticationType)
          ├── Claim("sub",   "42")
          ├── Claim("email", "ana@tienda.cl")
          ├── Claim("role",  "Admin")
          └── Claim("scope", "orders.write")
```

Un **claim** es una afirmación sobre el sujeto (clave-valor) emitida por alguien de confianza. Roles, permisos, tenant, edad... todo son claims. Esto unifica cookies, JWT, Windows auth o proveedores externos: tras autenticar, el resto de la app solo ve `ClaimsPrincipal`.

---

## 2. El pipeline de seguridad de ASP.NET Core

```
 Request
   │
   ▼
 UseRouting()            ← decide qué endpoint (y su metadata [Authorize])
   │
   ▼
 UseAuthentication()     ← ejecuta el scheme por defecto → rellena HttpContext.User
   │
   ▼
 UseAuthorization()      ← evalúa policies del endpoint → 401 (Challenge) / 403 (Forbid)
   │
   ▼
 Endpoint
```

Conceptos:
- **Authentication scheme**: nombre + handler (`JwtBearer`, `Cookies`, `OpenIdConnect`). Cada handler sabe hacer **Authenticate** (leer credenciales), **Challenge** (qué hacer si no hay: 401 o redirect a login) y **Forbid** (403).
- **Policy**: conjunto de *requirements* que el usuario debe cumplir.

> ⚠️ **El orden importa**: `UseAuthentication()` antes de `UseAuthorization()`, y ambos después de `UseRouting()` (implícito en minimal hosting) y de `UseCors()`. Si los inviertes, `User` estará vacío al autorizar y todo devolverá 401.

---

## 3. JWT (JSON Web Token)

### 3.1 Estructura

Un JWT (RFC 7519) firmado (**JWS**) son tres partes Base64Url separadas por puntos:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 . eyJzdWIiOiI0MiIsInJvbGUiOiJBZG1pbiIsImV4cCI6MTc1OTAwMDAwMH0 . SflKxw...
└──────────── HEADER ────────────┘   └──────────────────── PAYLOAD (claims) ───────────────┘   └ SIGNATURE ┘
 {"alg":"HS256","typ":"JWT"}          {"sub":"42","role":"Admin","exp":1759000000, ...}      HMAC(header.payload, key)
```

Claims registrados importantes:

| Claim | Significado | Validación |
|---|---|---|
| `iss` | Issuer: quién emitió el token | Debe coincidir con el esperado |
| `aud` | Audience: para quién es el token | Debe ser **tu** API |
| `exp` | Expiración (epoch segundos) | Rechazar si expiró |
| `nbf` / `iat` | No antes de / emitido en | Clock skew |
| `sub` | Subject: id del usuario | — |
| `jti` | Id único del token | Útil para revocación / anti-replay |

> ⚠️ **Firmado ≠ cifrado**. El payload es Base64, **cualquiera puede leerlo** (pégalo en jwt.io). **Nunca** pongas contraseñas, datos personales sensibles o secretos en un JWT. La firma solo garantiza **integridad** y **autenticidad** (nadie lo alteró y lo emitió quien tiene la clave). Para confidencialidad existe JWE, poco usado.

### 3.2 Simétrico vs asimétrico

| | **HS256** (HMAC) | **RS256 / ES256** (RSA / ECDSA) |
|---|---|---|
| Clave | Un secreto compartido firma y verifica | Privada firma, **pública** verifica |
| Quién puede emitir | Cualquiera que pueda verificar (¡mismo secreto!) | Solo el dueño de la privada |
| Distribución | El secreto debe estar en cada API | Clave pública vía **JWKS** (`/.well-known/jwks.json`) |
| Uso típico | Un solo servicio que emite y consume | Identity Provider + muchas APIs |

### 3.3 Emitir un JWT (ejemplo didáctico)

```csharp
// dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

public sealed class JwtOptions
{
    public const string Section = "Jwt";
    public required string Issuer { get; init; }
    public required string Audience { get; init; }
    public required string SigningKey { get; init; }   // ≥ 256 bits para HS256; desde secretos, NO appsettings
    public int AccessTokenMinutes { get; init; } = 15;
}

public sealed class TokenService(Microsoft.Extensions.Options.IOptions<JwtOptions> opt, TimeProvider clock)
{
    private readonly JwtOptions _o = opt.Value;

    public string CreateAccessToken(Guid userId, string email, IEnumerable<string> roles)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(JwtRegisteredClaimNames.Email, email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_o.SigningKey));
        var now = clock.GetUtcNow().UtcDateTime;

        var token = new JwtSecurityToken(
            issuer: _o.Issuer,
            audience: _o.Audience,
            claims: claims,
            notBefore: now,
            expires: now.AddMinutes(_o.AccessTokenMinutes),       // access tokens CORTOS
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

> 💡 En código nuevo puedes usar `JsonWebTokenHandler` (paquete `Microsoft.IdentityModel.JsonWebTokens`), más rápido y el que usa internamente `JwtBearer` desde .NET 8.

### 3.4 Validar JWT en el API

```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
var jwt = builder.Configuration.GetSection(JwtOptions.Section).Get<JwtOptions>()!;
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.Section));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<TokenService>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        // Con un IdP real (Entra ID, Auth0, Keycloak) basta con Authority + Audience:
        // o.Authority = "https://login.tu-idp.com/"; → descarga metadata OIDC y JWKS automáticamente
        o.MapInboundClaims = false;          // conserva "sub", "email" en vez de URIs largas de ClaimTypes
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,           ValidIssuer = jwt.Issuer,
            ValidateAudience = true,         ValidAudience = jwt.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
            ValidAlgorithms = [SecurityAlgorithms.HmacSha256],   // whitelist de algoritmos
            ClockSkew = TimeSpan.FromSeconds(30),                // default = 5 MINUTOS
            RoleClaimType = System.Security.Claims.ClaimTypes.Role,
            NameClaimType = "sub",
        };
    });

builder.Services.AddAuthorization();
var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapPost("/auth/login", (LoginRequest req, TokenService tokens) =>
{
    // DEMO: aquí validarías contra Identity (sección 6). Nunca credenciales hardcodeadas en prod.
    if (req is not { Email: "ana@tienda.cl", Password: "demo" }) return Results.Unauthorized();
    return Results.Ok(new { access_token = tokens.CreateAccessToken(Guid.NewGuid(), req.Email, ["Admin"]) });
});

app.MapGet("/me", (System.Security.Claims.ClaimsPrincipal user) =>
        Results.Ok(user.Claims.Select(c => new { c.Type, c.Value })))
   .RequireAuthorization();                                     // equivale a [Authorize]

app.Run();

public sealed record LoginRequest(string Email, string Password);
```

```bash
TOKEN=$(curl -s -X POST localhost:5000/auth/login -H 'Content-Type: application/json' \
        -d '{"email":"ana@tienda.cl","password":"demo"}' | jq -r .access_token)
curl -H "Authorization: Bearer $TOKEN" localhost:5000/me
```

> 💡 Para desarrollo local, `dotnet user-jwts create --role Admin` genera tokens firmados y configura el API automáticamente.

### 3.5 Trampas clásicas de JWT

| ⚠️ Vulnerabilidad | Qué pasa | Mitigación |
|---|---|---|
| `alg: none` | Token sin firma aceptado | Las librerías modernas lo rechazan; fija `ValidAlgorithms` |
| **Algorithm confusion** (RS256→HS256) | El atacante firma con HMAC usando la clave **pública** como secreto | Whitelist de algoritmos, tipo de clave coherente |
| No validar `aud` | Un token emitido para otra API sirve en la tuya | `ValidateAudience = true` |
| Tokens de larga duración | Robo = acceso prolongado; un JWT **no se puede revocar** por sí mismo | Access token 5–15 min + refresh token |
| Secreto débil / en el repo | Fuerza bruta offline de HS256 | ≥256 bits aleatorios, Key Vault / Secrets Manager |
| Guardar el JWT en `localStorage` | Cualquier XSS lo roba | En SPA: patrón **BFF** con cookie `HttpOnly` |

### 3.6 Refresh tokens

```
 Cliente                       API / IdP
   │── login ───────────────────▶│
   │◀── access (15 min) + refresh (opaco, 7-30 días, guardado HASHEADO en BD)
   │── GET /orders (access) ────▶│  ✓
   │   ... access expira ...     │
   │── POST /refresh (refresh) ─▶│  valida, INVALIDA el refresh usado, emite par nuevo (rotación)
   │◀── access nuevo + refresh nuevo
```

- El refresh token es **opaco** (aleatorio, `RandomNumberGenerator.GetBytes(64)`), no un JWT, y se guarda como **hash** en BD.
- **Rotación + detección de reuso**: si llega un refresh ya usado, alguien lo robó → revoca toda la familia de tokens del usuario.

> ❓ **Entrevista**: *"¿Cómo revocas un JWT?"* → No se puede "des-emitir". Opciones: expiración corta + refresh tokens revocables (lo estándar), una *denylist* de `jti` en Redis hasta que expiren, o un `security stamp`/versión de usuario en el token que se compara en cada request (pierde parte de la ventaja stateless).

---

## 4. Autorización: roles, claims y policies

```csharp
builder.Services.AddAuthorizationBuilder()
    // Política basada en rol
    .AddPolicy("AdminOnly", p => p.RequireRole("Admin"))
    // Basada en claim (típico con scopes OAuth)
    .AddPolicy("orders:write", p => p.RequireClaim("scope", "orders.write"))
    // Requirement personalizado
    .AddPolicy("Adult", p => p.AddRequirements(new MinimumAgeRequirement(18)))
    // Política por defecto para TODO endpoint sin [AllowAnonymous] (secure by default)
    .SetFallbackPolicy(new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser().Build());

builder.Services.AddSingleton<IAuthorizationHandler, MinimumAgeHandler>();

app.MapDelete("/orders/{id:guid}", (Guid id) => Results.NoContent()).RequireAuthorization("AdminOnly");
app.MapGet("/health", () => "ok").AllowAnonymous();
```

```csharp
using Microsoft.AspNetCore.Authorization;

public sealed record MinimumAgeRequirement(int Age) : IAuthorizationRequirement;

public sealed class MinimumAgeHandler(TimeProvider clock) : AuthorizationHandler<MinimumAgeRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext ctx, MinimumAgeRequirement req)
    {
        var birth = ctx.User.FindFirst("birthdate")?.Value;
        if (DateOnly.TryParse(birth, out var date))
        {
            var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
            var age = today.Year - date.Year - (today < date.AddYears(today.Year - date.Year) ? 1 : 0);
            if (age >= req.Age) ctx.Succeed(req);   // no llamar Fail() permite que otro handler lo apruebe
        }
        return Task.CompletedTask;
    }
}
```

### 4.1 Autorización basada en recursos (anti-IDOR)

Las policies anteriores miran solo al usuario. Pero *"¿puede Ana ver **este** pedido?"* depende del recurso:

```csharp
public sealed class OrderOwnerHandler : AuthorizationHandler<OperationAuthorizationRequirement, Order>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext ctx,
        OperationAuthorizationRequirement op, Order order)
    {
        var userId = ctx.User.FindFirst("sub")?.Value;
        if (userId == order.CustomerId.ToString() || ctx.User.IsInRole("Admin")) ctx.Succeed(op);
        return Task.CompletedTask;
    }
}

app.MapGet("/orders/{id:guid}", async (Guid id, IOrderRepository repo, IAuthorizationService authz,
                                       ClaimsPrincipal user, CancellationToken ct) =>
{
    var order = await repo.GetByIdAsync(new OrderId(id), ct);
    if (order is null) return Results.NotFound();
    var result = await authz.AuthorizeAsync(user, order, new OperationAuthorizationRequirement { Name = "Read" });
    return result.Succeeded ? Results.Ok(order.ToDto()) : Results.NotFound(); // 404 para no filtrar existencia
});
```

| Modelo | Ejemplo | Limitación |
|---|---|---|
| **RBAC** (roles) | `RequireRole("Admin")` | Explosión de roles; no expresa "solo lo suyo" |
| **Claims / scopes** | `scope=orders.write` | Granularidad a nivel de API, no de recurso |
| **Policy / ABAC** | Edad, tenant, horario | Más código |
| **Resource-based** | Dueño del pedido | Requiere cargar el recurso primero |

> ❓ **Entrevista**: *"¿Qué es IDOR y cómo lo previenes?"* → *Insecure Direct Object Reference*: el usuario cambia `/orders/123` por `/orders/124` y ve datos ajenos porque solo se verificó que estaba autenticado. Se previene con **autorización basada en recursos** en cada acceso (o filtrando siempre por tenant/usuario en la query, p. ej. con *global query filters* de EF Core, Sesión 25). Es parte de *Broken Access Control*, el riesgo #1 de OWASP.

---

## 5. OAuth 2.0 y OpenID Connect

### 5.1 Qué es cada uno

- **OAuth 2.0** (RFC 6749): protocolo de **autorización delegada**. Permite que una app obtenga un **access token** para llamar a una API *en nombre* de un usuario (o de sí misma), **sin conocer su contraseña**.
- **OpenID Connect (OIDC)**: capa de **autenticación** sobre OAuth 2.0. Añade el **ID token** (un JWT con quién es el usuario), el endpoint `/userinfo` y el discovery `/.well-known/openid-configuration`.

| Token | Para quién | Formato | Uso |
|---|---|---|---|
| **ID token** | El **cliente** (la app) | Siempre JWT | Saber quién inició sesión. ⚠️ No enviarlo a APIs |
| **Access token** | La **API** (resource server) | JWT u opaco | Autorizar llamadas (`Authorization: Bearer`) |
| **Refresh token** | El cliente, contra el IdP | Opaco | Obtener nuevos access tokens |

Roles: **Resource Owner** (usuario), **Client** (tu app), **Authorization Server** (IdP: Entra ID, Auth0, Keycloak, Cognito, Duende IdentityServer), **Resource Server** (tu API).

### 5.2 Flujos (grants)

| Flujo | Cuándo | Estado |
|---|---|---|
| **Authorization Code + PKCE** | Apps web, SPAs, móviles: hay un usuario | ✅ Recomendado para todo cliente con usuario |
| **Client Credentials** | Servicio a servicio, sin usuario | ✅ |
| **Device Code** | TVs, CLIs sin navegador | ✅ |
| **Refresh Token** | Renovar access token | ✅ |
| Implicit | SPAs antiguas (token en la URL) | ❌ Deprecado en OAuth 2.1 |
| Resource Owner Password | La app recibe la contraseña del usuario | ❌ Deprecado |

### 5.3 Authorization Code + PKCE

```
 Usuario/Navegador        Cliente (app)                    Authorization Server           API
      │                        │                                    │                     │
      │  1. "Iniciar sesión"   │                                    │                     │
      │───────────────────────▶│ genera code_verifier (aleatorio)   │                     │
      │                        │ code_challenge = SHA256(verifier)  │                     │
      │  2. redirect /authorize?response_type=code&client_id&redirect_uri&scope&state&code_challenge
      │◀───────────────────────│───────────────────────────────────▶│                     │
      │  3. login + consentimiento en el IdP (la app NUNCA ve la contraseña)                │
      │─────────────────────────────────────────────────────────────▶│                     │
      │  4. redirect a redirect_uri?code=XYZ&state=...               │                     │
      │───────────────────────▶│                                    │                     │
      │                        │ 5. POST /token (code + code_verifier [+ client_secret])  │
      │                        │───────────────────────────────────▶│ verifica SHA256     │
      │                        │◀── id_token + access_token + refresh_token               │
      │                        │ 6. GET /orders  Authorization: Bearer access_token       │
      │                        │─────────────────────────────────────────────────────────▶│
```

- **`state`**: valor aleatorio que protege contra **CSRF** en el callback.
- **PKCE** (*Proof Key for Code Exchange*): si alguien intercepta el `code`, no puede canjearlo sin el `code_verifier` original. Obligatorio para clientes públicos (SPA, móvil) y recomendado para todos en OAuth 2.1.
- **`nonce`** (OIDC): liga el ID token a la sesión, contra replay.

### 5.4 Configuración en .NET

```csharp
// API (resource server): solo valida access tokens del IdP
builder.Services.AddAuthentication().AddJwtBearer(o =>
{
    o.Authority = "https://login.microsoftonline.com/<tenant>/v2.0"; // discovery + JWKS automáticos
    o.Audience  = "api://tienda-api";
});

// App web MVC/Razor (cliente): login con OIDC y sesión en cookie
builder.Services.AddAuthentication(o =>
{
    o.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    o.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
})
.AddCookie()
.AddOpenIdConnect(o =>
{
    o.Authority = "https://auth.tienda.cl";
    o.ClientId = "tienda-web";
    o.ClientSecret = builder.Configuration["Oidc:ClientSecret"];
    o.ResponseType = "code";            // Authorization Code (PKCE activado por defecto en .NET)
    o.SaveTokens = true;                // guarda access/refresh en la cookie de auth (cifrada)
    o.Scope.Add("orders.read");
    o.MapInboundClaims = false;
});
```

> ❓ **Entrevista**: *"¿OAuth es un protocolo de autenticación?"* → No: OAuth 2.0 es de **autorización delegada**; el access token dice *qué puede hacer* el cliente, no *quién es* el usuario. **OIDC** agrega autenticación con el ID token. Usar solo OAuth para login fue el origen de muchas vulnerabilidades.

---

## 6. ASP.NET Core Identity

**Identity** es la librería de Microsoft para **gestionar usuarios** en *tu* base de datos: registro, hash de contraseñas, confirmación de email, lockout, 2FA/TOTP, recuperación, roles y logins externos. Persiste con EF Core (`IdentityDbContext`).

```csharp
// dotnet add package Microsoft.AspNetCore.Identity.EntityFrameworkCore
public sealed class AppUser : IdentityUser<Guid> { public string? FullName { get; set; } }

public sealed class AuthDbContext(DbContextOptions<AuthDbContext> o)
    : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>(o);

builder.Services.AddDbContext<AuthDbContext>(o => o.UseNpgsql(builder.Configuration.GetConnectionString("Auth")));

builder.Services.AddIdentityCore<AppUser>(o =>
{
    o.Password.RequiredLength = 12;               // NIST: longitud > complejidad arbitraria
    o.Password.RequireNonAlphanumeric = false;
    o.Lockout.MaxFailedAccessAttempts = 5;        // anti fuerza bruta
    o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    o.User.RequireUniqueEmail = true;
    o.SignIn.RequireConfirmedEmail = true;
})
.AddRoles<IdentityRole<Guid>>()
.AddEntityFrameworkStores<AuthDbContext>()
.AddDefaultTokenProviders();

// Login usando Identity + nuestro TokenService (sección 3.3)
app.MapPost("/auth/login", async (LoginRequest req, UserManager<AppUser> users, TokenService tokens) =>
{
    var user = await users.FindByEmailAsync(req.Email);
    // Mismo mensaje en ambos casos: no revelar si el email existe (user enumeration)
    if (user is null || await users.IsLockedOutAsync(user)) return Results.Unauthorized();

    if (!await users.CheckPasswordAsync(user, req.Password))
    {
        await users.AccessFailedAsync(user);          // incrementa contador → lockout
        return Results.Unauthorized();
    }
    await users.ResetAccessFailedCountAsync(user);
    var roles = await users.GetRolesAsync(user);
    return Results.Ok(new { access_token = tokens.CreateAccessToken(user.Id, user.Email!, roles) });
});
```

> 💡 .NET 8 añadió **Identity API endpoints**: `builder.Services.AddIdentityApiEndpoints<AppUser>()` + `app.MapIdentityApi<AppUser>()` expone `/register`, `/login`, `/refresh`, `/manage/2fa`... con tokens propietarios (no JWT estándar) o cookies. Útil para SPAs propias; para varias apps o SSO, usa un IdP OIDC.

### 6.1 Hashing de contraseñas

| ⚠️ Nunca | ✅ Sí |
|---|---|
| Texto plano, cifrado reversible (AES) | Algoritmo **lento** con salt: PBKDF2, bcrypt, scrypt, **Argon2id** |
| MD5 / SHA-1 / SHA-256 simple (millones de hashes/segundo en GPU) | Salt único por usuario (evita rainbow tables) |
| Salt global | Iteraciones altas y re-hash al subirlas |

El `PasswordHasher<T>` de Identity usa **PBKDF2-HMAC-SHA512 con 100.000 iteraciones** (formato v3 en .NET 7+), salt de 128 bits, e indica `SuccessRehashNeeded` para migrar hashes antiguos de forma transparente.

### 6.2 ¿Identity, IdP propio o IdP externo?

| Opción | Cuándo |
|---|---|
| **Identity + JWT/cookies propios** | Una app (o pocas) con usuarios propios, sin SSO |
| **IdP gestionado** (Entra ID / B2C, Auth0, Cognito, Okta) | Varias apps, SSO, social login, compliance; no quieres operar seguridad |
| **IdP self-hosted** (Keycloak, Duende IdentityServer, OpenIddict) | Control total y OIDC completo; Duende requiere licencia comercial |

> ❓ **Entrevista**: *"¿Por qué no escribir tu propio sistema de login?"* → Porque la superficie es enorme: hashing, lockout, 2FA, recuperación segura, timing attacks, enumeración de usuarios, rotación de claves, revocación. Uso Identity o un IdP probado y me concentro en autorizar bien.

---

## 7. Cookies vs Tokens (y el patrón BFF)

| | **Cookie de sesión** | **Bearer token (JWT)** |
|---|---|---|
| Envío | Automático por el navegador | Manual (`Authorization` header) |
| Riesgo principal | **CSRF** (se envía sola) | **XSS** (si JS puede leerlo) |
| Mitigación | `SameSite=Lax/Strict`, antiforgery tokens | No guardarlo en `localStorage`; CSP |
| Revocación | Fácil (sesión en servidor) | Difícil (stateless) |
| Ideal para | Apps web del mismo sitio | APIs consumidas por otros servicios, móviles |

Cookie segura en ASP.NET Core: `HttpOnly` (JS no la lee), `Secure` (solo HTTPS), `SameSite=Lax` o `Strict`.

**BFF (Backend For Frontend)**: la SPA no maneja tokens. Un backend ligero (mismo dominio) hace el flujo OIDC, guarda los tokens del lado servidor y da a la SPA solo una cookie `HttpOnly`; reenvía las llamadas a las APIs añadiendo el access token (p. ej. con YARP). Es la recomendación actual de la IETF para SPAs ("OAuth 2.0 for Browser-Based Apps").

---

## 8. OWASP Top 10 (2021) con mitigaciones en .NET

| # | Riesgo | Ejemplo | Mitigación en .NET |
|---|---|---|---|
| A01 | **Broken Access Control** | IDOR, falta de `[Authorize]`, CORS `*` con credenciales | Fallback policy autenticada, resource-based authz, filtros por tenant, CORS explícito |
| A02 | **Cryptographic Failures** | HTTP plano, MD5, claves en el repo | `UseHttpsRedirection` + `UseHsts`, Identity hasher, `System.Security.Cryptography` (AES-GCM), Key Vault |
| A03 | **Injection** (SQL, comandos, XSS) | `FromSqlRaw($"... {input}")` | LINQ/parámetros, `FromSql($"...")` (interpolación parametrizada), Razor codifica HTML por defecto |
| A04 | **Insecure Design** | Sin rate limiting en login, flujos de reset débiles | Threat modeling, `AddRateLimiter` (.NET 7+), revisiones de diseño |
| A05 | **Security Misconfiguration** | `DeveloperExceptionPage` en prod, stack traces, headers por defecto | `UseExceptionHandler` + ProblemDetails, headers de seguridad, entorno correcto |
| A06 | **Vulnerable Components** | Paquete NuGet con CVE | `dotnet list package --vulnerable`, Dependabot, NuGet audit (activo por defecto en .NET 8) |
| A07 | **Identification & Auth Failures** | Sin lockout, contraseñas débiles, tokens eternos | Identity lockout + 2FA, access tokens cortos, MFA |
| A08 | **Software & Data Integrity Failures** | Deserialización insegura, CI/CD comprometido | ⚠️ Nunca `BinaryFormatter` (eliminado en .NET 9); `System.Text.Json` sin `TypeNameHandling.All` de Newtonsoft; paquetes firmados |
| A09 | **Logging & Monitoring Failures** | No registrar logins fallidos; loguear contraseñas | Logs estructurados de eventos de seguridad, **sin** secretos ni tokens; alertas |
| A10 | **SSRF** | El API descarga una URL que manda el usuario → `http://169.254.169.254` (metadata cloud) | Allowlist de hosts, bloquear IPs privadas, `HttpClient` con handler que valide destino |

### 8.1 Inyección SQL en EF Core: lo que sí y lo que no

```csharp
string name = userInput;

// ❌ VULNERABLE: la cadena se construye ANTES de llegar a EF
var bad = db.Products.FromSqlRaw("SELECT * FROM Products WHERE Name = '" + name + "'");

// ❌ También vulnerable: FromSqlRaw con interpolación NO parametriza (es un string normal)
var bad2 = db.Products.FromSqlRaw($"SELECT * FROM Products WHERE Name = '{name}'");

// ✅ FromSql / FromSqlInterpolated reciben FormattableString → cada {x} se convierte en parámetro @p0
var ok = db.Products.FromSql($"SELECT * FROM Products WHERE Name = {name}");

// ✅ LINQ siempre parametriza
var ok2 = db.Products.Where(p => p.Name == name);
```

### 8.2 Hardening básico del pipeline

```csharp
using System.Threading.RateLimiting;

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("login", ctx => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions { PermitLimit = 5, Window = TimeSpan.FromMinutes(1) }));
});

builder.Services.AddCors(o => o.AddPolicy("spa", p => p
    .WithOrigins("https://app.tienda.cl")          // ⚠️ nunca AllowAnyOrigin + AllowCredentials
    .AllowAnyHeader().WithMethods("GET", "POST")
    .AllowCredentials()));

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler();                      // ProblemDetails sin stack trace
    app.UseHsts();                                  // Strict-Transport-Security
}
app.UseHttpsRedirection();

app.Use(async (ctx, next) =>                        // headers de seguridad
{
    var h = ctx.Response.Headers;
    h["X-Content-Type-Options"] = "nosniff";
    h["X-Frame-Options"] = "DENY";                  // anti clickjacking
    h["Referrer-Policy"] = "no-referrer";
    h["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'";
    await next();
});

app.UseCors("spa");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapPost("/auth/login", /* ... */ () => Results.Ok()).RequireRateLimiting("login").AllowAnonymous();
```

### 8.3 Gestión de secretos

| Entorno | Dónde |
|---|---|
| Desarrollo | `dotnet user-secrets set "Jwt:SigningKey" "..."` (fuera del repo, en el perfil del usuario) |
| Producción | Azure Key Vault, AWS Secrets Manager / Parameter Store, HashiCorp Vault, variables de entorno inyectadas por el orquestador |
| ⚠️ Nunca | `appsettings.json` commiteado, código fuente, logs, imágenes Docker |

Para proteger datos temporales (cookies, tokens de reset, `state` de OIDC), ASP.NET Core usa la **Data Protection API**. En un cluster con varias instancias, el *key ring* debe persistirse en un lugar compartido (Redis, blob, BD) o cada instancia no podrá descifrar las cookies de las otras.

> ❓ **Entrevista**: *"Te llega un API en producción, ¿qué revisas primero en seguridad?"* → Que todo endpoint requiera auth por defecto (fallback policy) y que haya autorización por recurso (IDOR); validación de JWT completa (iss, aud, exp, algoritmos); HTTPS + HSTS; secretos fuera del repo; manejo de errores sin filtrar detalles; rate limiting en endpoints sensibles; CORS restrictivo; dependencias sin CVEs; y logs de eventos de seguridad sin datos sensibles.

---

## Resumen mental de la sesión

```
AuthN = ¿quién eres? → 401 · AuthZ = ¿qué puedes? → 403
Identidad = ClaimsPrincipal → ClaimsIdentity → Claims
Pipeline: UseAuthentication() ANTES de UseAuthorization()

JWT = header.payload.firma · firmado ≠ cifrado (payload legible)
  validar SIEMPRE: firma, iss, aud, exp, algoritmos permitidos · ClockSkew default 5 min
  HS256 (secreto compartido) vs RS256/ES256 (privada firma, pública verifica vía JWKS)
  access corto + refresh opaco, hasheado, rotado · JWT no se revoca solo

AuthZ: roles → claims/scopes → policies/requirements → resource-based (anti-IDOR)
  SetFallbackPolicy(RequireAuthenticatedUser) = secure by default

OAuth 2.0 = autorización delegada (access token) · OIDC = + autenticación (ID token)
  Authorization Code + PKCE (con usuario) · Client Credentials (servicio a servicio)
  Implicit y Password = deprecados · state anti-CSRF · nonce anti-replay
Identity = usuarios en tu BD: PBKDF2, lockout, 2FA, roles. IdP externo para SSO.
SPA → BFF + cookie HttpOnly/Secure/SameSite, no tokens en localStorage

OWASP: A01 Access Control · A02 Crypto · A03 Injection · A04 Design · A05 Misconfig
       A06 Componentes · A07 AuthN · A08 Integridad/deserialización · A09 Logging · A10 SSRF
Secretos: user-secrets (dev) · Key Vault/Secrets Manager (prod) · nunca en el repo
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ Diferencia entre autenticación y autorización. ¿Cuándo devuelves 401 y cuándo 403?
2. ❓ Describe las tres partes de un JWT. ¿Por qué no debes poner datos sensibles en el payload?
3. ❓ ¿Qué parámetros validas siempre en un JWT y qué ataques previene cada uno (alg none, algorithm confusion, audiencia)?
4. ❓ HS256 vs RS256: ¿cuándo usarías cada uno y qué es JWKS?
5. ❓ ¿Cómo revocas un JWT? Explica refresh tokens con rotación y detección de reuso.
6. ❓ Roles vs claims vs policies vs autorización basada en recursos. ¿Qué es IDOR y cómo lo evitas?
7. ❓ ¿OAuth 2.0 es autenticación? ¿Qué agrega OpenID Connect? ID token vs access token.
8. ❓ Explica el flujo Authorization Code + PKCE paso a paso. ¿Qué protegen `state` y PKCE?
9. ❓ ¿Qué flujo usas para comunicación servicio a servicio? ¿Por qué Implicit y Password están deprecados?
10. ❓ ¿Cómo almacena contraseñas ASP.NET Core Identity y por qué SHA-256 simple no sirve?
11. ❓ Cookies vs tokens en una SPA: riesgos (CSRF vs XSS) y qué es el patrón BFF.
12. ❓ Nombra 5 riesgos del OWASP Top 10 y su mitigación concreta en .NET (incluye `FromSqlRaw` vs `FromSql`).

## Ejercicio práctico
1. En el API `Tienda` (sesiones 26–27), añade `AddAuthentication().AddJwtBearer(...)` con validación completa (issuer, audience, lifetime, `ValidAlgorithms`, `ClockSkew` de 30 s) y la clave en **user-secrets**.
2. Integra **ASP.NET Core Identity** con `AppUser : IdentityUser<Guid>`, crea endpoints `/auth/register` y `/auth/login` con lockout tras 5 intentos, y emite access tokens de 15 minutos.
3. Implementa **refresh tokens** opacos: tabla `RefreshTokens` (hash SHA-256, expiración, `ReplacedBy`), endpoint `/auth/refresh` con rotación y revocación de la familia si se detecta reuso.
4. Configura `SetFallbackPolicy` autenticada, una policy `AdminOnly`, y un handler **resource-based** que impida ver pedidos de otro cliente (devuelve 404). Escribe un test de integración (Sesión 27) que lo verifique con dos usuarios distintos.
5. Añade rate limiting al login, CORS restringido, headers de seguridad, `UseExceptionHandler` y HSTS. Verifica con `curl -I` los headers.
6. Ejecuta `dotnet list package --vulnerable --include-transitive` y revisa el resultado.
7. (Opcional) Levanta **Keycloak** en Docker, crea un realm y un client, y cambia tu API para validar tokens con `Authority` en lugar de la clave simétrica. Obtén un token con Client Credentials usando `curl`.
8. (Opcional avanzado) Escribe a propósito un endpoint vulnerable con `FromSqlRaw` concatenando input, explótalo con `' OR '1'='1`, y corrígelo con `FromSql`.

---

➡️ **Cuando termines**, marca la Sesión 28 en el [README](Readme.md) y pídeme la **Sesión 29 — Concurrencia avanzada (Channels, locks, Parallel, PLINQ)**.

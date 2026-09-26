# Sesión 22 — HTTP, REST y JSON: los cimientos del backend

> **Objetivo de la sesión**: entender *cómo* conversan un cliente y un servidor en la web antes de tocar ASP.NET Core. Al terminar deberías poder explicar el ciclo request/response de HTTP, elegir el verbo y el status code correctos, diseñar una API REST razonable (recursos, idempotencia, versionado, paginación), serializar y deserializar JSON con `System.Text.Json`, y consumir APIs desde C# con `HttpClient` **sin** caer en los errores clásicos (socket exhaustion, DNS obsoleto, falta de timeouts).

---

## 1. ¿Por qué empezar por HTTP y no por ASP.NET Core?

ASP.NET Core (Sesión 23) es "solo" una forma muy eficiente de **recibir** requests HTTP y **devolver** responses HTTP. Si no entiendes el protocolo, el framework se vuelve magia: no sabrás por qué tu `POST` devuelve `415`, por qué el navegador bloquea tu llamada por CORS, o por qué un `PUT` repetido no debería crear duplicados.

En entrevistas senior es habitual que pregunten *"¿qué pasa cuando escribes una URL en el navegador?"* o *"¿diferencia entre PUT y PATCH?"*. Esas respuestas no dependen de .NET: son del protocolo.

```
   Cliente (navegador, app móvil, otro servicio)
        │   HTTP Request  (método + URL + headers + body)
        ▼
   ┌───────────────────────────┐
   │  Servidor (Kestrel/ASP.NET)│
   └───────────────────────────┘
        │   HTTP Response (status + headers + body)
        ▼
   Cliente interpreta el resultado
```

---

## 2. Anatomía de HTTP

HTTP (*HyperText Transfer Protocol*) es un protocolo **de texto** (en HTTP/1.1), **request/response** y **sin estado** (*stateless*): cada request es independiente; el servidor no "recuerda" la request anterior salvo que tú envíes algo (cookie, token) que lo identifique.

### 2.1 Una request real

```http
POST /api/v1/pedidos HTTP/1.1              ← línea de inicio: MÉTODO RUTA VERSIÓN
Host: tienda.example.com                    ← headers (clave: valor)
Content-Type: application/json              ← formato del BODY que envío
Accept: application/json                    ← formato que ACEPTO en la respuesta
Authorization: Bearer eyJhbGciOi...         ← credenciales (Sesión 28)
Content-Length: 48
                                            ← línea vacía: separa headers del body
{"clienteId": 17, "productos": [3, 9, 12]}  ← body
```

### 2.2 Su response

```http
HTTP/1.1 201 Created                         ← versión + STATUS CODE + frase
Content-Type: application/json; charset=utf-8
Location: /api/v1/pedidos/1042               ← dónde vive el recurso creado
ETag: "a1b2c3"

{"id": 1042, "estado": "Pendiente", "total": 59990}
```

### 2.3 Las partes de una URL

```
https://tienda.example.com:443/api/v1/productos/42?incluir=stock&page=2#detalle
└─┬─┘   └───────┬─────────┘└┬┘└────────┬────────┘ └──────────┬─────────┘└──┬──┘
esquema        host       puerto     path (ruta)          query string    fragmento
                                   (identifica el       (filtros/opciones) (solo cliente,
                                    RECURSO)                                no viaja al server)
```

> ⚠️ El **fragmento** (`#detalle`) nunca llega al servidor. Y la query string **sí** queda en logs de proxies y en el historial del navegador: jamás pongas tokens o contraseñas ahí.

### 2.4 Versiones de HTTP

| Versión | Idea clave |
|---|---|
| **HTTP/1.1** | Texto plano, una request a la vez por conexión (keep-alive reutiliza la conexión). Problema: *head-of-line blocking*. |
| **HTTP/2** | Binario, **multiplexación** (muchas requests en paralelo sobre una conexión TCP), compresión de headers (HPACK). Base de **gRPC**. |
| **HTTP/3** | Sobre **QUIC** (UDP) en vez de TCP: elimina el HOL blocking a nivel de transporte, handshake más rápido. Kestrel lo soporta. |

> ❓ **Entrevista**: *"¿Qué significa que HTTP sea stateless?"* → Que el servidor no guarda contexto entre requests: cada una debe traer toda la información necesaria (identidad, parámetros). El estado se externaliza en tokens, cookies, base de datos o caché distribuida. Eso es lo que permite **escalar horizontalmente**: cualquier instancia puede atender cualquier request.

---

## 3. Métodos (verbos) HTTP: seguridad e idempotencia

Dos propiedades que **siempre** preguntan:

- **Seguro (*safe*)**: no modifica estado en el servidor (solo lectura).
- **Idempotente**: ejecutarlo 1 vez o N veces deja el servidor **en el mismo estado**. (La respuesta puede variar; el *efecto* no.)

| Método | Uso típico | Seguro | Idempotente | Body en request |
|---|---|---|---|---|
| `GET` | Leer un recurso o colección | ✅ | ✅ | No (no se recomienda) |
| `HEAD` | Como GET pero sin body (¿existe? ¿tamaño?) | ✅ | ✅ | No |
| `OPTIONS` | ¿Qué métodos permite? (preflight CORS) | ✅ | ✅ | No |
| `POST` | Crear un recurso / acción no idempotente | ❌ | ❌ | Sí |
| `PUT` | **Reemplazar** un recurso completo (o crearlo en una URL conocida) | ❌ | ✅ | Sí |
| `PATCH` | Modificar **parcialmente** | ❌ | ❌ (en general) | Sí |
| `DELETE` | Eliminar | ❌ | ✅ | Opcional |

¿Por qué importa la idempotencia? Porque **las redes fallan**. Si el cliente envía un `PUT /usuarios/5` y se corta la conexión antes de recibir la respuesta, puede **reintentar sin miedo**: el resultado final es el mismo. Con un `POST /pagos` reintentar podría cobrar dos veces.

> ❓ **Entrevista**: *"¿DELETE es idempotente si la segunda vez devuelve 404?"* → Sí. La idempotencia habla del **estado del servidor**, no del status code. Tras 1 o 10 `DELETE`, el recurso no existe: mismo estado.

> ❓ **Entrevista**: *"¿Cómo haces idempotente un POST de pago?"* → Con una **Idempotency-Key**: el cliente genera un GUID y lo manda en un header; el servidor guarda la clave con el resultado y, si llega de nuevo, devuelve la respuesta guardada en vez de procesar otra vez. Es el patrón que usan Stripe y la mayoría de pasarelas.

### 3.1 PUT vs PATCH

```json
// Recurso actual: { "id": 5, "nombre": "Ana", "email": "ana@x.com", "activo": true }

// PUT /usuarios/5  → REEMPLAZA todo. Lo que no mandes, se pierde/queda en default.
{ "nombre": "Ana María", "email": "ana@x.com", "activo": true }

// PATCH /usuarios/5 → solo cambia lo enviado (JSON Merge Patch, RFC 7396)
{ "nombre": "Ana María" }
```

> ⚠️ `PATCH` con **JSON Patch** (RFC 6902, `[{ "op": "replace", "path": "/nombre", "value": "..." }]`) es otro formato distinto a *Merge Patch*. En .NET, JSON Patch históricamente requería `Newtonsoft.Json` (`Microsoft.AspNetCore.JsonPatch`); en la práctica muchos equipos usan DTOs con propiedades opcionales.

---

## 4. Status codes: el idioma de las respuestas

Los códigos se agrupan por centena. Memoriza las familias y los más usados:

| Familia | Significado | Códigos clave |
|---|---|---|
| **1xx** | Informativo | `101 Switching Protocols` (WebSockets) |
| **2xx** | Éxito | `200 OK`, `201 Created` (+ `Location`), `202 Accepted` (proceso asíncrono), `204 No Content` |
| **3xx** | Redirección | `301` permanente, `302`/`307` temporal, `304 Not Modified` (caché) |
| **4xx** | Error **del cliente** | `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `405 Method Not Allowed`, `409 Conflict`, `412 Precondition Failed`, `415 Unsupported Media Type`, `422 Unprocessable Entity`, `429 Too Many Requests` |
| **5xx** | Error **del servidor** | `500 Internal Server Error`, `502 Bad Gateway`, `503 Service Unavailable`, `504 Gateway Timeout` |

Distinciones que separan juniors de seniors:

- **401 vs 403**: `401` = "no sé quién eres" (falta o es inválida la autenticación). `403` = "sé quién eres, pero no tienes permiso". El nombre "Unauthorized" del 401 es histórico y engañoso: realmente significa *unauthenticated*.
- **400 vs 422**: `400` = la request está mal formada (JSON roto, tipo incorrecto). `422` = está bien formada pero viola reglas de negocio/validación. ASP.NET Core por defecto devuelve `400` para errores de validación de modelo; ambos son aceptables si eres consistente.
- **404 vs 204**: `GET /usuarios/99` que no existe → `404`. `DELETE` exitoso sin nada que devolver → `204`.
- **409 Conflict**: el estado actual lo impide (email duplicado, conflicto de concurrencia optimista — Sesión 25).
- **502 vs 503 vs 504**: los tres suelen venir de un proxy/load balancer. `502` = el upstream respondió basura; `503` = no hay capacidad o está en mantenimiento; `504` = el upstream no respondió a tiempo.

> ⚠️ **Nunca** devuelvas `200 OK` con `{ "error": "no encontrado" }` en el body. Rompe cachés, reintentos, monitoreo y a cualquier cliente que confíe en el status code.

### 4.1 Problem Details (RFC 9457, antes 7807)

El estándar para el **cuerpo** de un error. ASP.NET Core lo genera nativamente (Sesión 23):

```json
{
  "type": "https://example.com/errors/stock-insuficiente",
  "title": "Stock insuficiente",
  "status": 409,
  "detail": "El producto 42 solo tiene 3 unidades disponibles.",
  "instance": "/api/v1/pedidos",
  "traceId": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
}
```
`Content-Type: application/problem+json`.

---

## 5. Headers que debes conocer

| Header | Dirección | Para qué |
|---|---|---|
| `Content-Type` | Req/Res | Formato del body que **envío** (`application/json`). Si falta en un POST → `415`. |
| `Accept` | Req | Formato que **acepto** en la respuesta (content negotiation). Si no puede → `406`. |
| `Authorization` | Req | Credenciales: `Bearer <token>`, `Basic <base64>`. |
| `Location` | Res | URL del recurso creado (con `201`) o destino de redirección. |
| `Cache-Control` | Res/Req | `no-store`, `max-age=60`, `private`, `public`. |
| `ETag` / `If-None-Match` | Res / Req | Versión del recurso. Si coincide → `304 Not Modified` (ahorra ancho de banda). |
| `If-Match` | Req | Concurrencia optimista: "actualiza solo si la versión sigue siendo X" → si no, `412`. |
| `Retry-After` | Res | Con `429`/`503`: cuánto esperar antes de reintentar. |
| `X-Correlation-Id` / `traceparent` | Req/Res | Trazabilidad distribuida entre microservicios (W3C Trace Context). |
| `Origin` / `Access-Control-Allow-*` | Req / Res | CORS. |

### 5.1 CORS en 30 segundos

El **navegador** (no el servidor, no Postman, no `HttpClient`) aplica la *Same-Origin Policy*: JavaScript de `https://app.com` no puede leer respuestas de `https://api.com` salvo que `api.com` lo autorice con headers `Access-Control-Allow-Origin`. Para requests "no simples" (ej. `PUT`, o `Content-Type: application/json`), el navegador envía antes un **preflight** `OPTIONS`.

```
Navegador ──OPTIONS /api/x (Origin: https://app.com)──▶ API
Navegador ◀── 204 + Access-Control-Allow-Origin: https://app.com ── API
Navegador ──PUT /api/x ──▶ API   (ahora sí la real)
```

> ❓ **Entrevista**: *"Mi API funciona en Postman pero no desde el front, ¿por qué?"* → Casi siempre CORS: Postman no es un navegador y no aplica Same-Origin Policy. Se configura en el servidor (`builder.Services.AddCors(...)`, Sesión 23).

---

## 6. REST: un estilo arquitectónico, no un protocolo

REST (*Representational State Transfer*, Roy Fielding, 2000) define **restricciones**:

1. **Cliente-servidor** separados.
2. **Stateless**.
3. **Cacheable** (las respuestas indican si se pueden cachear).
4. **Interfaz uniforme**: recursos identificados por URI, manipulados mediante representaciones (JSON), mensajes autodescriptivos, y **HATEOAS** (links en las respuestas para navegar).
5. **Sistema en capas** (proxies, gateways transparentes).
6. *Code on demand* (opcional).

> 💡 La mayoría de APIs "REST" del mundo real son en realidad **HTTP APIs con estilo REST** (nivel 2 del modelo de madurez de Richardson): usan recursos y verbos correctamente, pero no HATEOAS. Decirlo en entrevista demuestra criterio.

```
Modelo de madurez de Richardson
Nivel 3  HATEOAS (links de navegación en las respuestas)
Nivel 2  Verbos HTTP + status codes correctos     ← donde vive casi todo el mundo
Nivel 1  Recursos (URIs distintas por entidad)
Nivel 0  Un solo endpoint, todo POST (estilo RPC/SOAP)
```

### 6.1 Buenas prácticas de diseño de URIs

| ✅ Hazlo | ❌ Evítalo |
|---|---|
| `GET /productos` | `GET /getProductos` |
| `GET /productos/42` | `GET /productos?id=42` (para un recurso concreto) |
| `POST /productos` | `POST /productos/crear` |
| `GET /clientes/17/pedidos` (subrecurso) | `GET /pedidosDelCliente?c=17` |
| Sustantivos en plural, minúsculas, `kebab-case` | Verbos en la ruta, mayúsculas mezcladas |
| `POST /pedidos/1042/cancelacion` (acción modelada como recurso) | `GET /pedidos/1042/cancelar` (¡un GET que modifica!) |

### 6.2 Paginación, filtrado y orden

```http
GET /api/v1/productos?categoria=tecnologia&minPrecio=10000&sort=-precio&page=2&pageSize=20
```

Respuesta con metadatos:

```json
{
  "items": [ { "id": 51, "nombre": "Mouse" } ],
  "page": 2,
  "pageSize": 20,
  "totalCount": 347
}
```

| Estrategia | Cómo | Pros / Contras |
|---|---|---|
| **Offset** (`page`, `pageSize`) | `SKIP 20 TAKE 20` | Simple, permite saltar a página N. Lento con offsets enormes; inconsistente si insertan filas mientras paginas. |
| **Cursor / keyset** (`after=eyJpZCI6NTF9`) | `WHERE id > 51 ORDER BY id TAKE 20` | Rápido y estable a cualquier escala. No permite "ir a la página 500". |

> ⚠️ **Siempre** limita `pageSize` en el servidor (ej. máx. 100). Una API que permite `pageSize=1000000` es un DoS esperando a pasar.

### 6.3 Versionado

| Estrategia | Ejemplo | Comentario |
|---|---|---|
| En la URL | `/api/v1/productos` | La más común y visible. Fácil de enrutar y cachear. |
| Query string | `/api/productos?api-version=2.0` | Default del paquete `Asp.Versioning`. |
| Header | `X-Api-Version: 2` | URLs limpias, menos descubrible. |
| Media type | `Accept: application/vnd.tienda.v2+json` | El más "purista REST". |

Regla: **nunca rompas** a los clientes existentes. Agregar un campo opcional no es breaking; renombrar o eliminar uno sí → nueva versión.

---

## 7. JSON y `System.Text.Json`

JSON es el formato de intercambio *de facto*. Tipos: objeto `{}`, array `[]`, string, number, `true/false`, `null`. **No** tiene fechas nativas (se usan strings ISO 8601: `"2026-09-25T14:30:00Z"`), ni enteros vs decimales distinguidos, ni comentarios.

En .NET moderno el serializador por defecto es **`System.Text.Json`** (STJ), incluido en el runtime, orientado a performance y bajo consumo de memoria (trabaja sobre UTF-8 y `Span<T>` — Sesión 19). `Newtonsoft.Json` (Json.NET) sigue muy presente en código legado.

### 7.1 Serializar y deserializar

```csharp
using System.Text.Json;
using System.Text.Json.Serialization;

var producto = new Producto(42, "Teclado mecánico", 49990m, Categoria.Tecnologia, DateTime.UtcNow);

// Opciones: créalas UNA vez y reutilízalas (cachean metadata internamente)
var opciones = new JsonSerializerOptions(JsonSerializerDefaults.Web) // camelCase + case-insensitive
{
    WriteIndented = true,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,     // omite nulls
    Converters = { new JsonStringEnumConverter() }                     // enums como texto
};

string json = JsonSerializer.Serialize(producto, opciones);
Console.WriteLine(json);
// {
//   "id": 42,
//   "nombre": "Teclado mecánico",
//   "precio": 49990,
//   "categoria": "Tecnologia",
//   "creadoEn": "2026-09-25T14:30:00.123Z"
// }

Producto? copia = JsonSerializer.Deserialize<Producto>(json, opciones);
Console.WriteLine(copia); // records tienen ToString útil (Sesión 17)

public enum Categoria { Hogar, Tecnologia, Deporte }

// Los records posicionales se deserializan usando su constructor
public record Producto(
    int Id,
    string Nombre,
    decimal Precio,
    Categoria Categoria,
    DateTime CreadoEn)
{
    [JsonIgnore]                     // nunca se serializa
    public string Sku => $"SKU-{Id:D6}";
}
```

`JsonSerializerDefaults.Web` es lo que usa ASP.NET Core: `PropertyNamingPolicy = CamelCase`, `PropertyNameCaseInsensitive = true`, `NumberHandling = AllowReadingFromString`.

> ⚠️ **Crear `new JsonSerializerOptions()` en cada llamada** es un antipatrón de performance: cada instancia reconstruye su caché de metadata por reflection. Guárdala en un `static readonly` o inyéctala.

> ⚠️ Por defecto STJ es **case-sensitive** al deserializar (fuera de los defaults Web). Si tu JSON trae `"nombre"` y tu propiedad es `Nombre`, sin `PropertyNameCaseInsensitive` o `CamelCase` obtendrás valores vacíos **sin error**.

### 7.2 Atributos más usados

```csharp
public class PedidoDto
{
    [JsonPropertyName("order_id")]         // nombre exacto en el JSON
    public int Id { get; set; }

    [JsonRequired]                          // .NET 7+: falla si falta en el JSON
    public string Cliente { get; set; } = "";

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal Descuento { get; set; }

    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public int Cantidad { get; set; }       // acepta 5 o "5"

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public EstadoPedido Estado { get; set; }
}

public enum EstadoPedido { Pendiente, Pagado, Enviado }
```

### 7.3 JSON dinámico: `JsonDocument` y `JsonNode`

Cuando no tienes (o no quieres) una clase:

```csharp
using System.Text.Json;
using System.Text.Json.Nodes;

const string raw = """
{ "usuario": { "nombre": "Ana", "roles": ["admin", "ventas"] }, "version": 3 }
""";

// JsonDocument: SOLO LECTURA, muy eficiente (usa memoria pooled → hay que hacer Dispose)
using (JsonDocument doc = JsonDocument.Parse(raw))
{
    JsonElement root = doc.RootElement;
    string nombre = root.GetProperty("usuario").GetProperty("nombre").GetString()!;
    int roles = root.GetProperty("usuario").GetProperty("roles").GetArrayLength();
    Console.WriteLine($"{nombre} tiene {roles} roles");
}

// JsonNode: DOM MUTABLE, cómodo para modificar
JsonNode nodo = JsonNode.Parse(raw)!;
nodo["version"] = 4;
nodo["usuario"]!["roles"]!.AsArray().Add("soporte");
Console.WriteLine(nodo.ToJsonString());
```

### 7.4 Source generators: STJ sin reflection

Para Native AOT (Sesión 31) o máximo rendimiento, el compilador genera el código de serialización:

```csharp
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(Producto))]
[JsonSerializable(typeof(List<Producto>))]
internal partial class AppJsonContext : JsonSerializerContext { }

// Uso: pasas el metadata generado en vez de las options
string json = JsonSerializer.Serialize(producto, AppJsonContext.Default.Producto);
```

| | `System.Text.Json` | `Newtonsoft.Json` |
|---|---|---|
| Incluido en .NET | ✅ | ❌ (NuGet) |
| Rendimiento / memoria | Mejor (UTF-8, Span, source gen) | Menor |
| AOT / trimming | ✅ con source generators | ❌ |
| Flexibilidad (`dynamic`, JSON Patch, convertidores exóticos) | Buena y creciendo | Máxima |
| Case-insensitive por defecto | No (sí con defaults Web) | Sí |
| Referencias circulares | `ReferenceHandler.IgnoreCycles` / `Preserve` | `ReferenceLoopHandling` |

> ❓ **Entrevista**: *"Serializo una entidad de EF Core y obtengo 'A possible object cycle was detected'"* → `Pedido.Cliente.Pedidos.Cliente...`: referencia circular. La solución correcta **no** es `ReferenceHandler.IgnoreCycles`, sino **no exponer entidades**: proyectar a DTOs (Sesiones 23 y 25).

---

## 8. Consumir APIs: `HttpClient` bien usado

### 8.1 El error más famoso de .NET

```csharp
// ❌ ANTIPATRÓN: un HttpClient nuevo por request
public async Task<string> ObtenerAsync(string url)
{
    using var client = new HttpClient();   // al hacer Dispose, el socket queda en TIME_WAIT
    return await client.GetStringAsync(url);
}
```

`HttpClient` es `IDisposable`, así que el instinto dice `using`. Pero al disponerlo se cierra la conexión TCP y el socket queda en estado `TIME_WAIT` (~240 s en Windows). Bajo carga agotas los puertos efímeros → **socket exhaustion** (`SocketException: Only one usage of each socket address...`).

```csharp
// ❌ También problemático: un static para siempre
private static readonly HttpClient _client = new();   // reutiliza conexiones ✅
// ...pero nunca refresca DNS: si la IP del servicio cambia (blue/green, failover), sigues golpeando la vieja ❌
```

### 8.2 Las soluciones correctas

| Opción | Cuándo |
|---|---|
| `static HttpClient` con `SocketsHttpHandler { PooledConnectionLifetime = TimeSpan.FromMinutes(2) }` | Apps de consola / librerías sin DI |
| **`IHttpClientFactory`** (`AddHttpClient`) | Apps con DI (ASP.NET Core, workers) — la opción estándar |

```csharp
// Opción 1: sin DI
var handler = new SocketsHttpHandler
{
    PooledConnectionLifetime = TimeSpan.FromMinutes(2)  // recicla conexiones → respeta cambios DNS
};
var sharedClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.github.com/") };
```

```csharp
// Opción 2: IHttpClientFactory con TYPED CLIENT (lo más limpio). DI se ve en la Sesión 24.
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = Host.CreateApplicationBuilder(args);   // requiere el paquete Microsoft.Extensions.Hosting
builder.Services.AddHttpClient<GitHubClient>(c =>
{
    c.BaseAddress = new Uri("https://api.github.com/");
    c.DefaultRequestHeaders.UserAgent.ParseAdd("CursoCSharp/1.0"); // GitHub exige User-Agent
    c.Timeout = TimeSpan.FromSeconds(10);
});
var app = builder.Build();

var gh = app.Services.GetRequiredService<GitHubClient>();
var repo = await gh.ObtenerRepoAsync("dotnet", "runtime");
Console.WriteLine($"{repo?.FullName} ⭐ {repo?.StargazersCount}");

public record Repo(string FullName, int StargazersCount);

public class GitHubClient(HttpClient http)   // primary constructor (Sesión 18)
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower   // .NET 8: full_name ↔ FullName
    };

    public async Task<Repo?> ObtenerRepoAsync(string owner, string name, CancellationToken ct = default)
    {
        using var response = await http.GetAsync($"repos/{owner}/{name}", ct);

        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            return null;                                   // 404 es un caso de negocio esperado

        response.EnsureSuccessStatusCode();                // otros 4xx/5xx → HttpRequestException
        return await response.Content.ReadFromJsonAsync<Repo>(Json, ct);
    }
}
```

La factory mantiene un **pool de `HttpMessageHandler`** que se reciclan (por defecto cada 2 minutos): reutilizas conexiones **y** respetas DNS. Los `HttpClient` que te entrega son baratos y desechables.

```
IHttpClientFactory
   ├── HttpClient (liviano, uno por uso) ─┐
   ├── HttpClient ────────────────────────┼──▶ HttpMessageHandler (pooled, vive ~2 min)
   └── HttpClient ────────────────────────┘        └── conexiones TCP reutilizadas
```

### 8.3 `System.Net.Http.Json`: los atajos

```csharp
// GET + deserializar
List<Producto>? lista = await http.GetFromJsonAsync<List<Producto>>("api/v1/productos");

// POST + serializar el body (Content-Type: application/json automático)
HttpResponseMessage resp = await http.PostAsJsonAsync("api/v1/productos",
    new { nombre = "Mouse", precio = 9990 });

if (resp.StatusCode == System.Net.HttpStatusCode.Created)
    Console.WriteLine($"Creado en {resp.Headers.Location}");

// PUT / PATCH / DELETE
await http.PutAsJsonAsync("api/v1/productos/42", producto);
await http.PatchAsJsonAsync("api/v1/productos/42", new { precio = 44990 });
await http.DeleteAsync("api/v1/productos/42");
```

> ⚠️ `GetFromJsonAsync` lanza `HttpRequestException` ante cualquier status no-2xx: no puedes distinguir 404 de 500 con elegancia. Cuando el status importa, usa `GetAsync` + inspección de `StatusCode` como en `GitHubClient`.

### 8.4 Timeouts, cancelación y resiliencia

- `HttpClient.Timeout` por defecto es **100 segundos**. Casi siempre es demasiado: define el tuyo.
- Propaga el `CancellationToken` (Sesión 13) para que, si el cliente de *tu* API se desconecta, dejes de esperar al servicio remoto.
- Los fallos transitorios (`503`, `429`, timeouts) se manejan con **reintentos con backoff exponencial + jitter**, **circuit breaker** y **timeout por intento**. En .NET 8 se usa `Microsoft.Extensions.Http.Resilience` (sobre Polly v8):

```csharp
builder.Services.AddHttpClient<GitHubClient>(c => c.BaseAddress = new Uri("https://api.github.com/"))
    .AddStandardResilienceHandler();   // retry + circuit breaker + timeouts con defaults sensatos
```

> ⚠️ **Reintenta solo operaciones idempotentes** (o con Idempotency-Key). Reintentar un `POST /pagos` a ciegas es exactamente como se cobra dos veces a un cliente. Por eso la Sección 3 importa.

> ❓ **Entrevista**: *"¿Por qué no debo hacer `new HttpClient()` en cada request? ¿Y por qué tampoco un único static para siempre?"* → Lo primero causa socket exhaustion (sockets en TIME_WAIT); lo segundo ignora cambios de DNS. `IHttpClientFactory` (o `PooledConnectionLifetime`) resuelve ambos reciclando handlers.

---

## 9. ¿REST es la única opción?

| Estilo | Formato | Cuándo brilla |
|---|---|---|
| **REST/HTTP API** | JSON sobre HTTP/1.1-2 | APIs públicas, CRUD, interoperabilidad universal, cacheable |
| **gRPC** | Protobuf binario sobre HTTP/2 | Comunicación interna entre microservicios, baja latencia, streaming, contratos fuertes (`.proto`) |
| **GraphQL** | JSON, un endpoint, el cliente pide los campos | Frontends con necesidades de datos variables, evitar over/under-fetching |
| **WebSockets / SignalR** | Bidireccional persistente | Tiempo real: chats, dashboards, notificaciones |
| **Mensajería** (RabbitMQ, SQS, Kafka) | Asíncrono | Desacoplar servicios, picos de carga, eventos |

---

## Resumen mental de la sesión

```
HTTP = request/response, stateless, texto (1.1) → binario multiplexado (2) → QUIC (3)
Request  = MÉTODO + URL + headers + body
Response = STATUS  + headers + body

Seguro      → GET, HEAD, OPTIONS            (no cambia estado)
Idempotente → GET, HEAD, OPTIONS, PUT, DELETE (N veces = 1 vez)
POST ✗ idempotente → Idempotency-Key si hay reintentos

2xx ok · 3xx redirige · 4xx culpa del cliente · 5xx culpa del servidor
401 = ¿quién eres?  403 = sé quién eres, no puedes
Errores → Problem Details (application/problem+json)

REST = recursos (sustantivos plurales) + verbos + status correctos (nivel 2 Richardson)
Paginación offset vs cursor · versiona sin romper clientes

JSON en .NET → System.Text.Json (options reutilizadas, defaults Web = camelCase)
             → source generators para AOT
HttpClient  → NUNCA new por request · IHttpClientFactory + typed clients
             → timeout propio, CancellationToken, resiliencia solo en idempotentes
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué significa que HTTP sea *stateless* y por qué eso ayuda a escalar horizontalmente?
2. ❓ Define "seguro" e "idempotente". Clasifica GET, POST, PUT, PATCH y DELETE.
3. ❓ ¿Diferencia entre PUT y PATCH? ¿Qué pasa con los campos que no envías en un PUT?
4. ❓ ¿401 vs 403? ¿400 vs 422? ¿Cuándo usarías 409 y cuándo 412?
5. ❓ ¿Qué devuelves tras crear un recurso con POST (status y headers)?
6. ❓ ¿Qué es CORS, quién lo aplica y qué es un preflight?
7. ❓ ¿Qué es el modelo de madurez de Richardson? ¿Tu API es "REST de verdad"?
8. ❓ Paginación offset vs cursor: ventajas y desventajas.
9. ❓ ¿Por qué `System.Text.Json` sobre Newtonsoft? ¿Por qué reutilizar `JsonSerializerOptions`?
10. ❓ ¿Qué problemas causa `new HttpClient()` por request? ¿Y un static eterno? ¿Cómo lo resuelve `IHttpClientFactory`?
11. ❓ ¿Cómo implementarías un POST de pagos seguro ante reintentos?
12. ❓ ¿Cuándo elegirías gRPC en vez de REST?

## Ejercicio práctico
1. Crea una consola: `dotnet new console -o ClienteHttp` y agrega `dotnet add package Microsoft.Extensions.Hosting` y `dotnet add package Microsoft.Extensions.Http.Resilience`.
2. Implementa el `GitHubClient` tipado de la sección 8.2, registrado con `AddHttpClient` + `AddStandardResilienceHandler()` y un timeout de 10 s.
3. Consulta `dotnet/runtime` y un repo inexistente; verifica que el segundo devuelve `null` (404) y no una excepción.
4. Usa `curl -i https://api.github.com/repos/dotnet/runtime` y analiza la response: status, `Content-Type`, `ETag`, `Cache-Control`, headers de rate limit (`x-ratelimit-remaining`).
5. Repite con `curl -i -H 'If-None-Match: "<el ETag que obtuviste>"' ...` y observa el `304 Not Modified`.
6. Define un `JsonSerializerContext` con source generators para `Repo` y serializa una lista de 3 repos con `WriteIndented`.
7. Parsea con `JsonNode` la respuesta cruda de `GET repos/dotnet/runtime/languages` (sin clase) e imprime el lenguaje con más bytes.
8. (Opcional) Diseña en papel las rutas REST de una tienda: productos, clientes, pedidos, líneas de pedido y la acción "cancelar pedido", con verbos y status codes esperados de cada una.

---

➡️ **Cuando termines**, marca la Sesión 22 en el [README](Readme.md) y pídeme la **Sesión 23 — ASP.NET Core (Controllers, Minimal APIs, routing, DTOs)**.

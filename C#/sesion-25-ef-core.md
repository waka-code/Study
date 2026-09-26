# Sesión 25 — Entity Framework Core: el ORM de .NET a fondo

> **Objetivo de la sesión**: entender *qué hace* EF Core por debajo y no solo *cómo* se escribe una consulta. Al terminar deberías poder modelar entidades y relaciones con Fluent API, gestionar el esquema con **migrations**, explicar el **change tracker** y los estados de una entidad, escribir consultas eficientes (proyecciones, `AsNoTracking`, evitar **N+1**, *cartesian explosion*), manejar **transacciones** y **concurrencia optimista**, y saber cuándo bajar a SQL crudo o a Dapper.

---

## 1. ¿Qué es un ORM y por qué EF Core?

Un **ORM** (*Object-Relational Mapper*) traduce entre el mundo de **objetos** (clases, referencias, colecciones) y el mundo **relacional** (tablas, filas, foreign keys). Esa brecha se llama *impedance mismatch*.

```
   Mundo C#                              Mundo SQL
   ─────────                             ─────────
   class Pedido                          TABLE Pedidos (Id PK, ClienteId FK, Fecha)
   {                                     TABLE LineasPedido (Id PK, PedidoId FK, ...)
     Cliente Cliente;       ◀── EF ──▶
     List<Linea> Lineas;                 JOIN, FOREIGN KEY, índices
   }
   LINQ: db.Pedidos.Where(...)  ──▶  SELECT ... FROM Pedidos WHERE ...
```

**EF Core** es el ORM oficial de Microsoft: reescritura de EF6, multiplataforma, con providers para SQL Server, PostgreSQL (Npgsql), SQLite, MySQL, Oracle, Cosmos DB e InMemory.

| Enfoque | Qué es | Cuándo |
|---|---|---|
| **EF Core** (ORM completo) | LINQ → SQL, change tracking, migrations | CRUD, dominio rico, productividad |
| **Dapper** (micro-ORM) | Tú escribes el SQL; mapea filas → objetos | Consultas de lectura complejas o de máximo rendimiento |
| **ADO.NET** puro | `SqlConnection`, `DbDataReader` | Casos muy específicos; base de todo lo anterior |

> ❓ **Entrevista**: *"¿EF Core o Dapper?"* → No son excluyentes. Un patrón común (y que encaja con CQRS, Sesión 26) es **EF Core para escrituras** (change tracking, validaciones de dominio, transacciones) y **Dapper o proyecciones sin tracking para lecturas** pesadas.

> 💡 Muchos conceptos de esta sesión (transacciones, aislamiento, índices, planes de ejecución) dependen del motor de base de datos. EF Core no te exime de entender SQL: es la causa #1 de problemas de rendimiento en apps .NET.

---

## 2. Setup mínimo

```bash
dotnet add package Microsoft.EntityFrameworkCore.Sqlite        # o Npgsql.EntityFrameworkCore.PostgreSQL / ...SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Design        # necesario para migrations
dotnet tool install --global dotnet-ef                         # CLI: dotnet ef ...
```

### 2.1 Entidades

```csharp
public class Cliente
{
    public int Id { get; set; }                               // convención: "Id" o "ClienteId" → PK
    public required string Nombre { get; set; }
    public required string Email { get; set; }
    public List<Pedido> Pedidos { get; set; } = [];           // navegación de colección (1:N)
}

public class Pedido
{
    public int Id { get; set; }
    public DateTime FechaUtc { get; set; }
    public EstadoPedido Estado { get; set; }

    public int ClienteId { get; set; }                        // FK explícita (recomendado)
    public Cliente Cliente { get; set; } = null!;             // navegación de referencia

    public List<LineaPedido> Lineas { get; set; } = [];
    public uint Version { get; set; }                         // concurrencia (sección 9)

    public decimal Total => Lineas.Sum(l => l.PrecioUnitario * l.Cantidad);  // calculada: no se mapea (sin setter)
}

public class LineaPedido
{
    public int Id { get; set; }
    public int PedidoId { get; set; }
    public int ProductoId { get; set; }
    public Producto Producto { get; set; } = null!;
    public int Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }               // precio "congelado" al momento de la compra
}

public class Producto
{
    public int Id { get; set; }
    public required string Nombre { get; set; }
    public decimal Precio { get; set; }
    public bool Eliminado { get; set; }                       // soft delete (sección 10)
    public List<Etiqueta> Etiquetas { get; set; } = [];       // N:M
}

public class Etiqueta
{
    public int Id { get; set; }
    public required string Nombre { get; set; }
    public List<Producto> Productos { get; set; } = [];       // N:M sin clase intermedia (EF Core 5+)
}

public enum EstadoPedido { Pendiente, Pagado, Enviado, Cancelado }
```

> ⚠️ `= null!` en navegaciones de referencia le dice al compilador de Nullable Reference Types (Sesión 15) "confía en mí, EF lo llenará". Es la convención oficial, pero recuerda: si **no** hiciste `Include`, esa propiedad **sí** será `null` en runtime.

### 2.2 El `DbContext`

```csharp
using Microsoft.EntityFrameworkCore;

public class TiendaDbContext(DbContextOptions<TiendaDbContext> options) : DbContext(options)
{
    public DbSet<Cliente> Clientes => Set<Cliente>();        // cada DbSet ≈ una tabla consultable
    public DbSet<Pedido> Pedidos => Set<Pedido>();
    public DbSet<Producto> Productos => Set<Producto>();
    public DbSet<Etiqueta> Etiquetas => Set<Etiqueta>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Carga todas las clases IEntityTypeConfiguration<T> del ensamblado
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(TiendaDbContext).Assembly);
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder builder)
    {
        builder.Properties<decimal>().HavePrecision(18, 2);    // default global para decimales
        builder.Properties<string>().HaveMaxLength(256);       // evita nvarchar(max) por todas partes
    }
}
```

Registro en ASP.NET Core (lifetime **Scoped** por defecto — Sesión 24):

```csharp
builder.Services.AddDbContext<TiendaDbContext>(o =>
    o.UseSqlite(builder.Configuration.GetConnectionString("Default"))
     .EnableSensitiveDataLogging(builder.Environment.IsDevelopment())   // valores de parámetros en logs, SOLO dev
     .LogTo(Console.WriteLine, LogLevel.Information));                  // ver el SQL generado
```

> ⚠️ **`DbContext` no es thread-safe** y está pensado para ser de **vida corta** (una unidad de trabajo). Nunca lo registres como singleton ni lances dos consultas en paralelo sobre la misma instancia (`Task.WhenAll` con el mismo contexto → `InvalidOperationException: A second operation was started on this context`).

---

## 3. Configuración del modelo: convenciones, anotaciones y Fluent API

Tres formas, de menor a mayor prioridad:

| Forma | Ejemplo | Comentario |
|---|---|---|
| **Convenciones** | `Id` → PK, `ClienteId` + `Cliente` → FK | Cero código. Conócelas para no pelear con ellas. |
| **Data Annotations** | `[Key]`, `[MaxLength(100)]`, `[Required]` | Rápido, pero ensucia el dominio con detalles de persistencia. |
| **Fluent API** | `builder.Property(x => x.Nombre).HasMaxLength(100)` | ✅ La más potente y la que gana en conflictos. Mantiene el dominio limpio. |

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class PedidoConfiguration : IEntityTypeConfiguration<Pedido>
{
    public void Configure(EntityTypeBuilder<Pedido> b)
    {
        b.ToTable("Pedidos");
        b.HasKey(p => p.Id);

        b.Property(p => p.Estado)
         .HasConversion<string>()                  // guarda "Pagado" en vez de 1: legible y robusto a reordenar el enum
         .HasMaxLength(20);

        b.HasOne(p => p.Cliente)                   // 1:N Cliente → Pedidos
         .WithMany(c => c.Pedidos)
         .HasForeignKey(p => p.ClienteId)
         .OnDelete(DeleteBehavior.Restrict);       // no borrar clientes con pedidos

        b.HasMany(p => p.Lineas)
         .WithOne()
         .HasForeignKey(l => l.PedidoId)
         .OnDelete(DeleteBehavior.Cascade);        // las líneas mueren con su pedido

        b.HasIndex(p => new { p.ClienteId, p.FechaUtc });   // índice compuesto para "pedidos de un cliente por fecha"

        b.Ignore(p => p.Total);                    // explícito: no es columna
    }
}

public class ClienteConfiguration : IEntityTypeConfiguration<Cliente>
{
    public void Configure(EntityTypeBuilder<Cliente> b)
    {
        b.Property(c => c.Nombre).HasMaxLength(100).IsRequired();
        b.Property(c => c.Email).HasMaxLength(200).IsRequired();
        b.HasIndex(c => c.Email).IsUnique();       // la BD garantiza unicidad, no tu código
    }
}
```

### 3.1 Relaciones

```
1:1   Usuario ── Perfil          HasOne().WithOne().HasForeignKey<Perfil>(p => p.UsuarioId)
1:N   Cliente ──< Pedido         HasOne(p => p.Cliente).WithMany(c => c.Pedidos)
N:M   Producto >──< Etiqueta     HasMany().WithMany()  → EF crea la tabla ProductoEtiqueta
```

> 💡 **Owned types** (`OwnsOne`) y, desde EF Core 8, **complex types** (`ComplexProperty`) mapean *value objects* de DDD (Sesión 26) como `Direccion` o `Dinero` en columnas de la misma tabla, sin identidad propia.

---

## 4. Migrations: el esquema versionado

Una migration es una clase C# que describe **cómo pasar** de una versión del esquema a la siguiente (`Up`) y cómo volver (`Down`). EF compara el modelo actual con un **snapshot** (`TiendaDbContextModelSnapshot.cs`) para generar la diferencia.

```bash
dotnet ef migrations add Inicial                 # genera Migrations/2026..._Inicial.cs + snapshot
dotnet ef database update                        # aplica migraciones pendientes
dotnet ef migrations add AgregarIndiceEmail
dotnet ef migrations remove                      # quita la ÚLTIMA (si no fue aplicada)
dotnet ef database update Inicial                # rollback hasta "Inicial"
dotnet ef migrations script --idempotent -o migracion.sql   # SQL para revisar/aplicar en prod
dotnet ef migrations bundle                      # ejecutable autocontenido que aplica migraciones
```

EF guarda en la tabla `__EFMigrationsHistory` cuáles se aplicaron.

```csharp
// Migration generada (se puede editar a mano)
public partial class AgregarIndiceEmail : Migration
{
    protected override void Up(MigrationBuilder mb)
    {
        mb.CreateIndex(name: "IX_Clientes_Email", table: "Clientes", column: "Email", unique: true);
    }

    protected override void Down(MigrationBuilder mb)
    {
        mb.DropIndex(name: "IX_Clientes_Email", table: "Clientes");
    }
}
```

| Estrategia para producción | Comentario |
|---|---|
| `db.Database.Migrate()` al arrancar | Cómodo en dev. ⚠️ En prod con varias instancias → carreras; la app necesita permisos DDL. |
| **Script SQL idempotente** revisado en el pipeline de CI/CD | ✅ Lo más controlado: un DBA puede revisarlo. |
| **Migration bundle** ejecutado como paso del despliegue | ✅ Automatizable y sin SDK en el servidor. |

> ⚠️ **Revisa siempre la migración generada**. Renombrar una propiedad puede generarse como `DropColumn` + `AddColumn` → **pérdida de datos**. Corrígelo a `RenameColumn` a mano. Y en tablas grandes, crear índices o columnas NOT NULL puede bloquear la tabla: planifica.

> ❓ **Entrevista**: *"¿Cómo despliegas un cambio de esquema sin downtime?"* → Con el patrón **expand/contract**: 1) agregar la columna nueva nullable (compatible con la versión vieja), 2) desplegar código que escribe en ambas, 3) migrar datos, 4) desplegar código que solo usa la nueva, 5) eliminar la vieja en una migración posterior.

---

## 5. Consultas: de LINQ a SQL

Las consultas sobre `DbSet` son `IQueryable<T>` (Sesión 9): construyen un **árbol de expresiones** que el provider traduce a SQL. **Nada se ejecuta** hasta que materializas (`ToListAsync`, `FirstOrDefaultAsync`, `CountAsync`, `foreach`...).

```csharp
var desde = DateTime.UtcNow.AddDays(-30);

var query = db.Pedidos
    .Where(p => p.FechaUtc >= desde && p.Estado != EstadoPedido.Cancelado)   // aún no va a la BD
    .OrderByDescending(p => p.FechaUtc);

var pagina = await query
    .Skip(20).Take(20)
    .Select(p => new PedidoResumenDto(                       // PROYECCIÓN: solo las columnas necesarias
        p.Id,
        p.Cliente.Nombre,                                    // navegación → EF genera el JOIN
        p.FechaUtc,
        p.Lineas.Sum(l => l.PrecioUnitario * l.Cantidad)))   // agregación traducida a SQL
    .ToListAsync(ct);                                        // ← AQUÍ se ejecuta

var total = await query.CountAsync(ct);

public record PedidoResumenDto(int Id, string Cliente, DateTime FechaUtc, decimal Total);
```

SQL aproximado (SQLite):

```sql
SELECT p.Id, c.Nombre, p.FechaUtc,
       (SELECT COALESCE(SUM(l.PrecioUnitario * l.Cantidad), 0) FROM LineasPedido l WHERE p.Id = l.PedidoId)
FROM Pedidos p
INNER JOIN Clientes c ON p.ClienteId = c.Id
WHERE p.FechaUtc >= @desde AND p.Estado <> 'Cancelado'
ORDER BY p.FechaUtc DESC
LIMIT @take OFFSET @skip
```

### 5.1 `IQueryable` vs `IEnumerable`: el error caro

```csharp
// ❌ AsEnumerable/ToList ANTES del filtro: trae TODA la tabla a memoria y filtra en C#
var caros = db.Productos.ToList().Where(p => p.Precio > 100_000);

// ❌ Método propio dentro de la expresión: EF no sabe traducirlo
var x = db.Productos.Where(p => EsPremium(p)).ToList();
// → InvalidOperationException: "could not be translated" (EF Core 3+ ya no evalúa en cliente en silencio)

// ✅ Filtra en IQueryable → WHERE en SQL
var ok = await db.Productos.Where(p => p.Precio > 100_000).ToListAsync(ct);
```

### 5.2 Tracking vs No-Tracking

```csharp
// Tracking (default): EF guarda una copia (snapshot) para detectar cambios → más memoria y CPU
var p1 = await db.Productos.FirstAsync(p => p.Id == 1, ct);

// No-tracking: solo lectura, más rápido, sin identity resolution
var lista = await db.Productos.AsNoTracking().ToListAsync(ct);

// Global para un contexto de solo lectura
o.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
```

> Regla: **lecturas → `AsNoTracking()` o proyección con `Select`** (las proyecciones a DTO no se trackean). **Escrituras → tracking**.

---

## 6. Cargar datos relacionados y el problema N+1

| Estrategia | Cómo | Cuándo |
|---|---|---|
| **Eager loading** | `.Include(p => p.Lineas).ThenInclude(l => l.Producto)` | Sabes que necesitarás las relaciones |
| **Proyección** | `.Select(p => new Dto(..., p.Cliente.Nombre))` | ✅ Lecturas: trae exactamente lo necesario |
| **Explicit loading** | `await db.Entry(pedido).Collection(p => p.Lineas).LoadAsync()` | Decides en runtime si cargar |
| **Lazy loading** | Paquete `Proxies` + navegaciones `virtual` | ⚠️ Cómodo pero peligroso (N+1 invisible) |

### 6.1 N+1

```csharp
// ❌ N+1: 1 consulta para pedidos + N consultas (una por pedido) para las líneas
var pedidos = await db.Pedidos.ToListAsync(ct);          // 1 query
foreach (var p in pedidos)
{
    await db.Entry(p).Collection(x => x.Lineas).LoadAsync(ct);  // N queries
    Console.WriteLine($"{p.Id}: {p.Lineas.Count} líneas");
}
// Con lazy loading ocurre lo mismo, pero SIN que se vea en el código: solo con acceder a p.Lineas

// ✅ Una sola consulta
var conLineas = await db.Pedidos.Include(p => p.Lineas).AsNoTracking().ToListAsync(ct);

// ✅✅ Mejor aún si solo necesitas el conteo
var resumen = await db.Pedidos.Select(p => new { p.Id, Cantidad = p.Lineas.Count }).ToListAsync(ct);
```

> ❓ **Entrevista**: *"¿Qué es el problema N+1 y cómo lo detectas?"* → Ejecutar 1 consulta para una lista y luego 1 por cada elemento para sus relaciones. Se detecta revisando los logs de SQL (`LogTo`), con herramientas de APM/OpenTelemetry o MiniProfiler. Se soluciona con `Include`, proyecciones o cargas por lotes.

### 6.2 Cartesian explosion y `AsSplitQuery`

```csharp
// Incluir DOS colecciones hermanas en una sola query → JOIN que multiplica filas
var productos = await db.Productos
    .Include(p => p.Etiquetas)     // 10 etiquetas
    .Include(p => p.Resenas)       // 100 reseñas
    .ToListAsync(ct);              // → 10 × 100 = 1 000 filas POR producto viajando por la red

// ✅ Split query: una consulta por colección, EF las une en memoria
var productos2 = await db.Productos
    .Include(p => p.Etiquetas)
    .Include(p => p.Resenas)
    .AsSplitQuery()
    .ToListAsync(ct);
```

> ⚠️ `AsSplitQuery` hace varios roundtrips y, sin transacción, las consultas pueden ver datos inconsistentes entre sí. Es un trade-off, no una bala de plata. (Asume `Producto.Resenas` como una colección adicional para este ejemplo.)

---

## 7. El Change Tracker y `SaveChanges`

Cada entidad trackeada tiene un **estado**:

```
                   Add()
   Detached ─────────────────▶ Added ──SaveChanges──▶ INSERT ─┐
      ▲                                                        │
      │ (se deja de trackear)       consulta con tracking      ▼
      │                        ┌────────────────────────▶ Unchanged ◀──┐
      │                        │                               │       │
      │                                    modificas propiedad │       │ SaveChanges
      │                                                        ▼       │
      │                                                    Modified ───┘ (UPDATE solo de columnas cambiadas)
      │                                                        │
      └──────────── SaveChanges ◀── Deleted ◀── Remove() ──────┘ (DELETE)
```

```csharp
// CREATE
var cliente = new Cliente { Nombre = "Ana", Email = "ana@x.cl" };
db.Clientes.Add(cliente);                                    // estado: Added
await db.SaveChangesAsync(ct);                               // INSERT; cliente.Id queda asignado

// UPDATE (conectado): leer con tracking, modificar, guardar
var prod = await db.Productos.FirstAsync(p => p.Id == 7, ct); // Unchanged
prod.Precio = 12_990m;                                       // DetectChanges → Modified
await db.SaveChangesAsync(ct);                               // UPDATE Productos SET Precio=@p WHERE Id=7

// DELETE
db.Productos.Remove(prod);                                   // Deleted
await db.SaveChangesAsync(ct);

// Inspeccionar
Console.WriteLine(db.Entry(prod).State);
Console.WriteLine(db.ChangeTracker.DebugView.LongView);      // vista de todo lo trackeado
```

- `SaveChanges` envuelve **todos** los cambios pendientes en **una transacción** implícita: o se guarda todo o nada.
- El `DbContext` es en sí mismo un **Unit of Work** y cada `DbSet` un **Repository** (implicaciones para la Sesión 26).
- EF agrupa comandos en **batches** para reducir roundtrips.

### 7.1 Escenario desconectado (típico en APIs)

El DTO llega en el request; la entidad no está trackeada:

```csharp
// Opción A (recomendada): leer + aplicar cambios → UPDATE solo de lo que cambió, reglas de dominio respetadas
var p = await db.Productos.FindAsync([id], ct);
if (p is null) return TypedResults.NotFound();
p.Nombre = req.Nombre;
p.Precio = req.Precio;
await db.SaveChangesAsync(ct);

// Opción B: Update() → marca TODAS las columnas como modificadas, sin leer primero
db.Productos.Update(new Producto { Id = id, Nombre = req.Nombre, Precio = req.Precio });
// ⚠️ columnas no enviadas (ej. Eliminado) se sobrescriben con su valor por defecto
```

### 7.2 Operaciones masivas (EF Core 7+)

```csharp
// Sin cargar entidades en memoria: un UPDATE / DELETE directo en SQL
int afectados = await db.Productos
    .Where(p => p.Etiquetas.Any(e => e.Nombre == "liquidacion"))
    .ExecuteUpdateAsync(s => s.SetProperty(p => p.Precio, p => p.Precio * 0.8m), ct);

await db.Pedidos
    .Where(p => p.Estado == EstadoPedido.Cancelado && p.FechaUtc < DateTime.UtcNow.AddYears(-2))
    .ExecuteDeleteAsync(ct);
```

> ⚠️ `ExecuteUpdate/Delete` **se saltan el change tracker**: no disparan interceptores de `SaveChanges`, no actualizan entidades ya cargadas y no participan de la transacción implícita de `SaveChanges` (sí de una explícita).

---

## 8. Transacciones

```csharp
// Transacción explícita: varias operaciones + varios SaveChanges atómicos
await using var tx = await db.Database.BeginTransactionAsync(ct);
try
{
    var pedido = new Pedido { ClienteId = 1, FechaUtc = DateTime.UtcNow, Estado = EstadoPedido.Pendiente };
    db.Pedidos.Add(pedido);
    await db.SaveChangesAsync(ct);                                     // INSERT pedido → obtiene Id

    int filas = await db.Productos
        .Where(p => p.Id == 7 && p.Stock >= 2)                         // (asume una propiedad Stock)
        .ExecuteUpdateAsync(s => s.SetProperty(p => p.Stock, p => p.Stock - 2), ct);

    if (filas == 0) throw new ConflictException("Sin stock");

    await tx.CommitAsync(ct);
}
catch
{
    await tx.RollbackAsync(ct);   // (también ocurre automáticamente al hacer Dispose sin Commit)
    throw;
}
```

> ⚠️ Con **retry strategies** (`EnableRetryOnFailure`, recomendadas en la nube) no puedes abrir transacciones manuales directamente: debes envolverlas en `db.Database.CreateExecutionStrategy().ExecuteAsync(...)` para que el reintento repita el bloque completo.

> 💡 Para consistencia entre la BD y un broker de mensajes (publicar un evento "PedidoCreado"), no uses transacciones distribuidas: usa el **patrón Outbox** (guardar el evento en una tabla en la misma transacción y publicarlo después). Se ve en la Sesión 26.

---

## 9. Concurrencia optimista

Dos usuarios leen el mismo pedido, ambos lo modifican, el segundo pisa al primero sin saberlo: **lost update**. EF Core lo resuelve con un **token de concurrencia**:

```csharp
// SQL Server: rowversion automático
public byte[] RowVersion { get; set; } = [];
b.Property(p => p.RowVersion).IsRowVersion();

// PostgreSQL (Npgsql): la columna de sistema xmin
b.Property(p => p.Version).IsRowVersion();   // con uint Version, Npgsql la mapea a xmin

// Genérico (cualquier provider): tú actualizas el token
b.Property(p => p.Version).IsConcurrencyToken();
```

EF agrega el token al `WHERE`:

```sql
UPDATE Pedidos SET Estado = @estado WHERE Id = @id AND Version = @versionOriginal;
-- si afecta 0 filas → alguien lo cambió antes → DbUpdateConcurrencyException
```

```csharp
try
{
    pedido.Estado = EstadoPedido.Enviado;
    await db.SaveChangesAsync(ct);
}
catch (DbUpdateConcurrencyException ex)
{
    var entry = ex.Entries.Single();
    var valoresEnBd = await entry.GetDatabaseValuesAsync(ct);
    if (valoresEnBd is null) return TypedResults.NotFound();         // lo borraron
    return TypedResults.Conflict("El pedido fue modificado por otro usuario. Recarga e intenta de nuevo.");  // 409
}
```

En una API, el token viaja al cliente (como `ETag`) y vuelve en `If-Match` (Sesión 22) → `412 Precondition Failed` o `409 Conflict`.

| | Optimista | Pesimista |
|---|---|---|
| Mecanismo | Token de versión, detecta al guardar | Bloqueo (`SELECT ... FOR UPDATE`, `UPDLOCK`) al leer |
| Conflictos | Se detectan y se resuelven después | Se previenen esperando |
| Escala | ✅ Muy bien (sin bloqueos) | Peor (bloqueos, deadlocks) |
| EF Core | Nativo | Solo con SQL crudo |

> ❓ **Entrevista**: *"¿Cómo evitas que dos personas compren el último producto en stock?"* → O un `UPDATE ... SET Stock = Stock - 1 WHERE Id = @id AND Stock >= 1` atómico (revisando filas afectadas), o concurrencia optimista con reintento, o una restricción `CHECK (Stock >= 0)` en la BD como red de seguridad. Nunca "leer stock en C#, comparar y luego guardar" sin protección.

---

## 10. Features que usarás en proyectos reales

### 10.1 Global query filters (soft delete, multi-tenant)

```csharp
b.HasQueryFilter(p => !p.Eliminado);                    // se agrega a TODAS las consultas de Producto
// Multi-tenant: b.HasQueryFilter(p => p.TenantId == _tenantProvider.TenantId);

var incluyendoBorrados = await db.Productos.IgnoreQueryFilters().ToListAsync(ct);
```

### 10.2 Interceptores y auditoría automática

```csharp
public interface IAuditable { DateTime CreadoUtc { get; set; } DateTime? ModificadoUtc { get; set; } }

public class AuditoriaInterceptor(TimeProvider reloj) : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken ct = default)
    {
        var ahora = reloj.GetUtcNow().UtcDateTime;
        foreach (var e in eventData.Context!.ChangeTracker.Entries<IAuditable>())
        {
            if (e.State == EntityState.Added)    e.Entity.CreadoUtc = ahora;
            if (e.State == EntityState.Modified) e.Entity.ModificadoUtc = ahora;
        }
        return base.SavingChangesAsync(eventData, result, ct);
    }
}

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<AuditoriaInterceptor>();
builder.Services.AddDbContext<TiendaDbContext>((sp, o) =>
    o.UseSqlite(cs).AddInterceptors(sp.GetRequiredService<AuditoriaInterceptor>()));
```

### 10.3 SQL crudo cuando LINQ no alcanza

```csharp
// Interpolación → PARAMETRIZADA automáticamente (segura frente a SQL injection)
var minimo = 50_000m;
var caros = await db.Productos
    .FromSql($"SELECT * FROM Productos WHERE Precio > {minimo}")
    .Where(p => !p.Eliminado)                                  // se puede seguir componiendo
    .ToListAsync(ct);

// EF Core 8: consultar tipos NO mapeados (reportes)
var ventas = await db.Database
    .SqlQuery<VentaMensual>($"SELECT strftime('%Y-%m', FechaUtc) AS Mes, COUNT(*) AS Pedidos FROM Pedidos GROUP BY Mes")
    .ToListAsync(ct);

public record VentaMensual(string Mes, int Pedidos);
```

> ⚠️ **`FromSqlRaw($"... {input}")` con interpolación es SQL injection**: `FromSqlRaw` recibe un string ya armado. Usa `FromSql` / `FromSqlInterpolated` (parametrizan) o `FromSqlRaw("... {0}", input)` con parámetros posicionales.

### 10.4 Rendimiento: checklist

| Técnica | Efecto |
|---|---|
| `AsNoTracking()` / proyecciones `Select` | Menos memoria y CPU en lecturas |
| Índices en columnas de `WHERE`, `JOIN`, `ORDER BY` | La diferencia entre 2 ms y 2 s. Revisa el plan de ejecución |
| Paginar siempre (`Skip/Take` o keyset) | Nunca `ToListAsync()` de tablas completas |
| Evitar N+1 y cartesian explosion | `Include` consciente, `AsSplitQuery` |
| `ExecuteUpdate/Delete` | Operaciones masivas sin cargar entidades |
| **Compiled queries** (`EF.CompileAsyncQuery`) | Ahorra la traducción LINQ→SQL en consultas muy calientes |
| **DbContext pooling** (`AddDbContextPool`) | Reutiliza instancias; menos asignaciones en alto throughput |
| `IDbContextFactory<T>` (`AddDbContextFactory`) | Crear contextos a demanda en singletons, Blazor, trabajos paralelos |

---

## 11. Testing con EF Core (adelanto de la Sesión 27)

| Opción | Veredicto |
|---|---|
| Provider **InMemory** | ⚠️ No es una base relacional: no valida FKs, ni transacciones, ni traduce SQL real. Microsoft desaconseja usarlo para tests. |
| **SQLite in-memory** | Mejor: relacional real, rápido. Diferencias de dialecto con tu motor de producción. |
| **Testcontainers** (PostgreSQL/SQL Server real en Docker) | ✅ Lo más fiel. Estándar actual para tests de integración. |
| Mockear `DbSet` | ❌ Frágil y no prueba nada útil. Mockea tu repositorio/servicio, no EF. |

---

## Resumen mental de la sesión

```
EF Core = ORM: objetos ⇄ tablas · LINQ (IQueryable) → SQL
DbContext = Unit of Work · DbSet = Repository · Scoped, vida corta, NO thread-safe

Modelo: convenciones < DataAnnotations < Fluent API (IEntityTypeConfiguration<T>)
Migrations: add → revisar → script idempotente/bundle en prod · expand/contract sin downtime

Consultas:
  nada se ejecuta hasta materializar (ToListAsync, First, Count...)
  filtra en IQueryable, no después de ToList
  lecturas → AsNoTracking / Select a DTO
  N+1 → Include / proyección · 2+ colecciones → AsSplitQuery

Change tracker: Detached · Added · Unchanged · Modified · Deleted
SaveChanges = 1 transacción · ExecuteUpdate/Delete = masivo, salta el tracker
Transacción explícita: BeginTransaction (+ ExecutionStrategy si hay retries)
Concurrencia optimista: RowVersion / xmin / ConcurrencyToken → DbUpdateConcurrencyException → 409/412

Extras: query filters (soft delete/tenant) · interceptores (auditoría)
SQL crudo: FromSql (parametriza) ✅ · FromSqlRaw + interpolación ❌ injection
Tests: Testcontainers > SQLite > InMemory
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué es un ORM y qué es el *impedance mismatch*? ¿Cuándo usarías Dapper en vez de EF Core?
2. ❓ ¿Por qué `DbContext` es Scoped y no Singleton? ¿Qué pasa si ejecutas dos consultas en paralelo sobre el mismo contexto?
3. ❓ Convenciones vs Data Annotations vs Fluent API: ¿cuál gana y cuál prefieres?
4. ❓ ¿Cómo funcionan las migrations y qué riesgos tiene renombrar una propiedad? ¿Cómo aplicas migraciones en producción?
5. ❓ ¿Diferencia entre `IQueryable` e `IEnumerable` en EF? ¿Qué pasa si llamas a un método C# propio dentro de un `Where`?
6. ❓ ¿Qué es el problema N+1? ¿Qué relación tiene con lazy loading?
7. ❓ ¿Qué es la *cartesian explosion* y cómo la mitiga `AsSplitQuery`? ¿Qué coste tiene?
8. ❓ Enumera los estados de una entidad en el change tracker. ¿Qué hace `SaveChanges` exactamente?
9. ❓ ¿`AsNoTracking` cuándo sí y cuándo no?
10. ❓ ¿Cómo implementas concurrencia optimista en EF Core? ¿Qué excepción obtienes y qué status HTTP devolverías?
11. ❓ ¿Qué limitaciones tienen `ExecuteUpdateAsync` / `ExecuteDeleteAsync`?
12. ❓ ¿`FromSqlRaw` con interpolación es seguro? ¿Por qué no deberías testear con el provider InMemory?

## Ejercicio práctico
1. En tu `TiendaApi` (Sesiones 23–24), agrega EF Core con SQLite y crea las entidades `Cliente`, `Pedido`, `LineaPedido`, `Producto` y `Etiqueta` con configuraciones Fluent API en clases separadas.
2. Ejecuta `dotnet ef migrations add Inicial` y `dotnet ef database update`. Abre la migración generada y el archivo `.db` (con DB Browser for SQLite o `sqlite3`) para ver las tablas, FKs e índices.
3. Reemplaza el `IProductoService` en memoria por uno basado en `TiendaDbContext`. Todas las lecturas deben usar proyección a DTO.
4. Activa `LogTo(Console.WriteLine)` y **provoca a propósito un N+1** recorriendo pedidos y cargando sus líneas una por una. Cuenta las queries en consola; luego corrígelo con `Include` y con proyección y compara.
5. Agrega un token de concurrencia a `Pedido`. Simula el conflicto con dos `DbContext` distintos que leen el mismo pedido y lo guardan: captura `DbUpdateConcurrencyException` y devuelve `409`.
6. Implementa soft delete con `HasQueryFilter` y un endpoint de administración que use `IgnoreQueryFilters()`.
7. Crea el `AuditoriaInterceptor` y verifica que `CreadoUtc` / `ModificadoUtc` se llenan solos.
8. Implementa `POST /pedidos` en una transacción que cree el pedido y descuente stock con `ExecuteUpdateAsync`, fallando con `409` si no hay stock suficiente.
9. Genera el script de producción con `dotnet ef migrations script --idempotent` y léelo entero.
10. (Opcional) Escribe un test de integración con Testcontainers + PostgreSQL que verifique la restricción única de `Cliente.Email`.

---

➡️ **Cuando termines**, marca la Sesión 25 en el [README](Readme.md) y pídeme la **Sesión 26 — Arquitectura (Clean, CQRS, DDD, Repository/UoW)**.

# Locking Patterns (Optimistic & Pessimistic)

Estrategias para manejar acceso concurrente a recursos compartidos en aplicaciones multi-usuario, evitando condiciones de carrera (race conditions) y garantizando integridad de datos.

**Ventajas:**
- Previene corrupción de datos en acceso concurrente.
- Garantiza consistencia en transacciones.
- Protege recursos críticos.

**Trade-off:**
- Puede reducir rendimiento (bloqueos, reintentos).
- Requiere manejo de conflictos y errores.
- Complejidad en sistemas distribuidos.

---

## 🔒 Tipos de Locking

### 1️⃣ Pessimistic Locking (Bloqueo Pesimista)

**Concepto:** Bloquear el recurso **antes** de modificarlo, asumiendo que conflictos son probables.

**Cómo funciona:**
```
Usuario A lee registro (CON BLOQUEO)
├─ SELECT * FROM users WHERE id = 1 FOR UPDATE
├─ Base de datos BLOQUEA la fila
│
Usuario B intenta leer el mismo registro
├─ ESPERA hasta que Usuario A termine
│
Usuario A actualiza y hace commit
└─ Usuario B ahora puede acceder
```

**Ventajas:**
- ✅ Previene conflictos garantizando acceso exclusivo
- ✅ Simple de entender y usar
- ✅ Ideal para operaciones críticas (ej: saldo bancario)

**Desventajas:**
- ❌ Reduce concurrencia (otros threads esperan)
- ❌ Riesgo de deadlocks
- ❌ Menor rendimiento en alta concurrencia

---

#### Implementación SQL

```sql
-- PostgreSQL / MySQL / SQL Server
BEGIN TRANSACTION;

-- Bloquear fila para actualización
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;

-- Otros usuarios esperan aquí hasta que termine esta transacción
UPDATE accounts SET balance = balance - 100 WHERE id = 1;

COMMIT;
```

---

#### Implementación Node.js con Sequelize

```javascript
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('database', 'user', 'password', {
    dialect: 'postgres'
});

const Account = sequelize.define('Account', {
    balance: DataTypes.DECIMAL(10, 2)
});

async function transferMoney(fromId, toId, amount) {
    const transaction = await sequelize.transaction();

    try {
        // Bloqueo pesimista con FOR UPDATE
        const fromAccount = await Account.findByPk(fromId, {
            lock: transaction.LOCK.UPDATE,  // SELECT FOR UPDATE
            transaction
        });

        const toAccount = await Account.findByPk(toId, {
            lock: transaction.LOCK.UPDATE,
            transaction
        });

        if (fromAccount.balance < amount) {
            throw new Error('Fondos insuficientes');
        }

        // Actualizar balances
        fromAccount.balance -= amount;
        toAccount.balance += amount;

        await fromAccount.save({ transaction });
        await toAccount.save({ transaction });

        await transaction.commit();
        console.log('Transferencia exitosa');
    } catch (error) {
        await transaction.rollback();
        console.error('Error en transferencia:', error.message);
    }
}

// Uso
transferMoney(1, 2, 100);
```

---

#### Implementación C# con Entity Framework

```csharp
using Microsoft.EntityFrameworkCore;

public class Account
{
    public int Id { get; set; }
    public decimal Balance { get; set; }
}

public class AppDbContext : DbContext
{
    public DbSet<Account> Accounts { get; set; }
}

public class BankService
{
    private readonly AppDbContext _context;

    public BankService(AppDbContext context)
    {
        _context = context;
    }

    public async Task TransferMoneyAsync(int fromId, int toId, decimal amount)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            // Pessimistic Locking: SELECT FOR UPDATE
            var fromAccount = await _context.Accounts
                .FromSqlRaw("SELECT * FROM Accounts WHERE Id = {0} FOR UPDATE", fromId)
                .FirstOrDefaultAsync();

            var toAccount = await _context.Accounts
                .FromSqlRaw("SELECT * FROM Accounts WHERE Id = {0} FOR UPDATE", toId)
                .FirstOrDefaultAsync();

            if (fromAccount == null || toAccount == null)
                throw new Exception("Cuenta no encontrada");

            if (fromAccount.Balance < amount)
                throw new Exception("Fondos insuficientes");

            fromAccount.Balance -= amount;
            toAccount.Balance += amount;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            Console.WriteLine("Transferencia exitosa");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            Console.WriteLine($"Error: {ex.Message}");
            throw;
        }
    }
}
```

---

### 2️⃣ Optimistic Locking (Bloqueo Optimista)

**Concepto:** NO bloquear el recurso al leerlo. Detectar conflictos **al momento de guardar** usando un campo de versión.

**Cómo funciona:**
```
Usuario A lee registro (id=1, version=5)
Usuario B lee el mismo registro (id=1, version=5)

Usuario A actualiza:
├─ UPDATE users SET name='Alice', version=6 WHERE id=1 AND version=5
└─ ✅ Éxito (version cambia a 6)

Usuario B intenta actualizar:
├─ UPDATE users SET name='Bob', version=6 WHERE id=1 AND version=5
└─ ❌ Falla (version ya es 6, no 5)
    └─ StaleObjectError / ConcurrencyException
```

**Ventajas:**
- ✅ Mayor rendimiento (no bloquea recursos)
- ✅ Ideal cuando conflictos son raros
- ✅ Mejor escalabilidad

**Desventajas:**
- ❌ Requiere reintento si hay conflicto
- ❌ Complejidad en manejo de errores
- ❌ No adecuado para operaciones críticas

---

#### Implementación SQL

```sql
-- 1. Agregar columna de versión
ALTER TABLE products ADD COLUMN version INT DEFAULT 0;

-- 2. Leer registro (sin bloqueo)
SELECT id, name, price, version FROM products WHERE id = 1;
-- Resultado: id=1, name='Laptop', price=1000, version=5

-- 3. Actualizar con verificación de versión
UPDATE products
SET price = 900, version = version + 1
WHERE id = 1 AND version = 5;

-- Si otra transacción cambió la versión, 0 filas afectadas
```

---

#### Implementación Node.js con Sequelize

```javascript
const Product = sequelize.define('Product', {
    name: DataTypes.STRING,
    price: DataTypes.DECIMAL(10, 2),
    version: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    version: true  // Activa optimistic locking
});

async function updateProductPrice(productId, newPrice, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Leer producto (sin bloqueo)
            const product = await Product.findByPk(productId);

            if (!product) {
                throw new Error('Producto no encontrado');
            }

            const currentVersion = product.version;

            // Actualizar precio
            product.price = newPrice;

            // Guardar con verificación de versión
            await product.save();

            console.log('Actualización exitosa');
            return;

        } catch (error) {
            if (error.name === 'SequelizeOptimisticLockError') {
                console.log(`Conflicto detectado (intento ${attempt + 1})`);

                if (attempt === maxRetries - 1) {
                    throw new Error('Demasiados intentos, operación cancelada');
                }

                // Esperar antes de reintentar (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
            } else {
                throw error;
            }
        }
    }
}

// Uso
updateProductPrice(1, 900);
```

---

#### Implementación C# con Entity Framework

```csharp
public class Product
{
    public int Id { get; set; }
    public string Name { get; set; }
    public decimal Price { get; set; }

    // Campo de versión para optimistic locking
    [Timestamp]  // SQL Server: rowversion
    public byte[] RowVersion { get; set; }
}

public class ProductService
{
    private readonly AppDbContext _context;

    public ProductService(AppDbContext context)
    {
        _context = context;
    }

    public async Task UpdateProductPriceAsync(int productId, decimal newPrice, int maxRetries = 3)
    {
        for (int attempt = 0; attempt < maxRetries; attempt++)
        {
            try
            {
                // Leer producto (sin bloqueo)
                var product = await _context.Products.FindAsync(productId);

                if (product == null)
                    throw new Exception("Producto no encontrado");

                // Actualizar precio
                product.Price = newPrice;

                // Guardar con verificación automática de RowVersion
                await _context.SaveChangesAsync();

                Console.WriteLine("Actualización exitosa");
                return;
            }
            catch (DbUpdateConcurrencyException ex)
            {
                Console.WriteLine($"Conflicto detectado (intento {attempt + 1})");

                if (attempt == maxRetries - 1)
                    throw new Exception("Demasiados intentos, operación cancelada");

                // Recargar valores de la base de datos
                foreach (var entry in ex.Entries)
                {
                    await entry.ReloadAsync();
                }

                // Esperar antes de reintentar
                await Task.Delay(100 * (attempt + 1));
            }
        }
    }
}

// Uso
var service = new ProductService(context);
await service.UpdateProductPriceAsync(1, 900);
```

---

## 📊 Comparación: Optimistic vs Pessimistic

| Aspecto | Pessimistic Locking | Optimistic Locking |
|---------|---------------------|-------------------|
| **Estrategia** | Bloquea ANTES de modificar | Detecta conflictos AL GUARDAR |
| **Conflictos esperados** | Frecuentes | Raros |
| **Rendimiento** | Menor (bloqueos) | Mayor (sin bloqueos) |
| **Complejidad** | Simple | Requiere manejo de reintentos |
| **Escalabilidad** | Baja | Alta |
| **Caso de uso** | Saldo bancario, inventario crítico | Edición de formularios, configuraciones |
| **Riesgo de deadlock** | Sí | No |
| **Implementación** | SELECT FOR UPDATE | Campo version |

---

## 🎯 Cuándo Usar Cada Uno

### Usar Pessimistic Locking cuando:
- ✅ Operaciones financieras (saldos, transacciones)
- ✅ Inventario de productos (stock limitado)
- ✅ Asignación de recursos únicos (asientos, habitaciones)
- ✅ Conflictos son frecuentes y costosos de resolver

### Usar Optimistic Locking cuando:
- ✅ Edición de formularios por usuarios
- ✅ Configuraciones de aplicación
- ✅ Datos que cambian poco
- ✅ Alta concurrencia de lectura, baja de escritura
- ✅ Conflictos son raros

---

## 💡 Patrón Híbrido: Retry con Backoff

Combinar optimistic locking con estrategia de reintentos inteligente:

```javascript
async function updateWithExponentialBackoff(operation, maxRetries = 5) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (error.name === 'ConcurrencyError' && attempt < maxRetries - 1) {
                // Exponential backoff: 100ms, 200ms, 400ms, 800ms...
                const delay = 100 * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
                console.log(`Reintentando (${attempt + 1}/${maxRetries})...`);
            } else {
                throw error;
            }
        }
    }
}

// Uso
await updateWithExponentialBackoff(async () => {
    const product = await Product.findByPk(1);
    product.price = 900;
    await product.save();
});
```

---

## 🔴 Problemas Comunes

### 1. Deadlock con Pessimistic Locking

```javascript
// ❌ MAL: Orden diferente de bloqueos
Transaction A: Lock(User1) → Lock(User2)
Transaction B: Lock(User2) → Lock(User1)
// → DEADLOCK!

// ✅ BIEN: Orden consistente de bloqueos
Transaction A: Lock(User1) → Lock(User2)
Transaction B: Lock(User1) → Lock(User2)
// → Sin deadlock
```

**Solución:** Siempre bloquear recursos en el mismo orden (ej: por ID ascendente).

---

### 2. Lost Update sin Locking

```javascript
// ❌ SIN LOCKING
User A lee balance: 1000
User B lee balance: 1000
User A resta 100 → balance = 900 ✅
User B resta 200 → balance = 800 ✅
// Resultado final: 800 (debería ser 700)

// ✅ CON PESSIMISTIC LOCKING
User A bloquea y lee balance: 1000
User B ESPERA...
User A resta 100 → balance = 900 ✅
User B bloquea y lee balance: 900
User B resta 200 → balance = 700 ✅
// Resultado final: 700 ✅
```

---

## 🔗 Relación con Otros Patrones

- **Transaction Pattern**: Locking ocurre dentro de transacciones
- **Retry Pattern**: Optimistic locking requiere reintentos
- **Idempotencia**: Previene duplicados en reintentos

---

## 💡 Mejores Prácticas

✅ Usar pessimistic locking para operaciones críticas (dinero, stock)
✅ Usar optimistic locking para alta concurrencia de lectura
✅ Implementar exponential backoff en reintentos
✅ Ordenar bloqueos consistentemente para evitar deadlocks
✅ Establecer timeouts en bloqueos (NOWAIT, SKIP LOCKED)
✅ Monitorear deadlocks y conflictos en producción
✅ Usar índices en campos de versión para optimistic locking

---

**Nivel de Dificultad:** ⭐⭐⭐⭐ Muy Avanzado

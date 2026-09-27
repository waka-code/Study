# Connection Pooling

Abrir y mantener conexiones a la base de datos es caro. Un pool mal dimensionado es una de las causas más comunes de caídas en producción: "la BD no responde" muchas veces significa "nos quedamos sin conexiones". Este archivo explica por qué pasa y cómo dimensionar el pool en la app, en poolers externos (PgBouncer, RDS Proxy) y en entornos serverless.

## Por qué una conexión es cara

En **PostgreSQL** cada conexión es un **proceso del sistema operativo** (fork del postmaster), no un hilo:

- **Establecerla** cuesta: TCP handshake + TLS + autenticación (SCRAM) + fork + inicialización. Son entre unos pocos ms y decenas de ms, contra una consulta típica de menos de 1 ms.
- **Mantenerla** cuesta memoria: cada backend usa ~5-10 MB de base, más cachés de catálogo y planes, más `work_mem` por operación mientras ejecuta.
- **Muchas conexiones degradan todo el servidor**, aunque estén ociosas: el cálculo de snapshots MVCC recorre el array de procesos (PG14 lo mejoró mucho, pero no es gratis), hay más contención en locks internos (LWLocks) y más cambios de contexto de CPU.
- MySQL usa un **hilo por conexión**: es más liviano, pero el principio es el mismo. Más conexiones activas que núcleos solo agrega contención.

Conclusión: la BD rinde mejor con **pocas conexiones muy ocupadas** que con muchas conexiones medio ociosas.

## Pool en la aplicación

El pool mantiene N conexiones abiertas y las presta a cada request:

```ts
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST,
  max: 10,                        // conexiones máximas de ESTA instancia
  min: 2,
  idleTimeoutMillis: 30_000,      // cierra conexiones ociosas
  connectionTimeoutMillis: 2_000, // timeout para obtener conexión (crear una o esperar en cola)
  statement_timeout: 5_000,       // se envía a la sesión
  maxLifetimeSeconds: 1800,       // recicla conexiones (útil tras failover/DNS)
});

// Uso correcto: siempre liberar
export async function transfer(from: string, to: string, amount: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, from]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, to]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();              // sin esto: leak
  }
}
```

- **Prisma**: `connection_limit` y `pool_timeout` en la URL (`?connection_limit=10&pool_timeout=5`). El default es `num_cpus * 2 + 1`.
- **TypeORM**: `extra: { max: 10 }` se pasa al driver `pg`.
- **Java**: **HikariCP** (`maximumPoolSize`, `connectionTimeout`, `leakDetectionThreshold`), que es el default de Spring Boot.

## ¿De qué tamaño debe ser el pool?

### La fórmula de referencia

La guía clásica de PostgreSQL (popularizada por HikariCP):

```
conexiones ≈ (núcleos_CPU × 2) + discos_efectivos
```

- Para un servidor de BD de 8 núcleos con SSD: **~17-20 conexiones activas** es un buen punto de partida para **todo el servidor**, no por instancia de la app.
- Es un punto de partida, no una ley: se ajusta con pruebas de carga midiendo throughput y latencia.

### Por qué más no es mejor

- Un núcleo ejecuta una consulta a la vez. Con 8 núcleos y 200 consultas activas, 192 esperan; y además se pierde tiempo en cambios de contexto, contención de locks y caché de CPU arruinado.
- Pasado el punto óptimo, **el throughput se estanca y la latencia crece**. En pruebas de HikariCP, bajar de 2.048 a 96 conexiones redujo la latencia en un orden de magnitud.
- Es mejor que los requests **esperen en la cola del pool** (barato, en la app) que dentro de la BD (caro, compartido por todos).
- Excepción: si las conexiones pasan mucho tiempo esperando IO de red o locks (no CPU), el óptimo es algo más alto. Pero la solución real suele ser transacciones más cortas.

### Multiplicar: instancias × pool size

El error más común en arquitecturas con autoscaling:

```
total = instancias_app × pool_max_por_instancia (+ workers, cron jobs, migraciones, consolas)

20 pods × pool 20 = 400 conexiones  →  supera max_connections = 200
```

- Al escalar horizontalmente (HPA, ECS autoscaling), el total de conexiones crece **linealmente** sin que nadie lo note, hasta que llega un pico de tráfico, escala y la BD rechaza conexiones (`FATAL: sorry, too many clients already`).
- Dimensiona **de arriba hacia abajo**: presupuesto de conexiones de la BD ÷ máximo de instancias = pool por instancia.
- Reserva conexiones para administración (`superuser_reserved_connections`), réplicas, migraciones y monitoreo.
- Si el número de instancias es alto o impredecible → pooler externo.

## max_connections

- Subir `max_connections` a 2.000 **no soluciona** nada: cambia el error "too many clients" por un servidor lento o sin memoria.
- Valores sanos: 100-500 según la RAM, con un pooler delante si hay muchos clientes.
- En RDS el default depende de la RAM de la instancia (`LEAST({DBInstanceClassMemory/9531392}, 5000)`), que puede ser alto para lo que el CPU soporta.

```sql
-- ¿Quién tiene las conexiones y en qué estado?
SELECT usename, application_name, state, count(*)
FROM pg_stat_activity
GROUP BY 1, 2, 3
ORDER BY 4 DESC;
-- 'idle in transaction' persistente = bug en la app (transacción sin cerrar)
```

## PgBouncer

Pooler externo y liviano (un proceso, event-driven) que acepta **miles de conexiones de clientes** y las multiplexa sobre **pocas conexiones reales** a PostgreSQL.

### Modos de pooling

| Modo | La conexión del servidor se asigna... | Multiplexación | Compatibilidad |
|---|---|---|---|
| **session** | Durante toda la sesión del cliente | Baja (1:1 mientras esté conectado) | Total |
| **transaction** | Solo durante una transacción | Alta | Con limitaciones |
| **statement** | Solo durante una sentencia | Máxima | No permite transacciones multi-sentencia |

- **Transaction mode** es el más usado: la conexión real se devuelve al pool en el `COMMIT`/`ROLLBACK`. Con 5.000 clientes y 50 conexiones reales funciona bien si las transacciones son cortas.
- **Session mode** sirve casi solo para limitar el número de conexiones o para clientes que necesitan estado de sesión.

### Limitaciones del modo transaction

Como transacciones consecutivas del mismo cliente pueden ir a **backends distintos**, todo lo que dependa del **estado de la sesión** se rompe:

- **Prepared statements** a nivel protocolo: el statement se preparó en otro backend → `prepared statement "s1" does not exist`. PgBouncer **1.21+** soporta prepared statements del protocolo con `max_prepared_statements`. En versiones anteriores había que desactivarlos (Prisma: `?pgbouncer=true`).
- **`SET`** de sesión (`SET search_path`, `SET timezone`, `SET statement_timeout`): se aplica a un backend que luego usa otro cliente. Usa `SET LOCAL` dentro de la transacción o configura por rol (`ALTER ROLE ... SET`).
- **Advisory locks de sesión** (`pg_advisory_lock`): quedan tomados en un backend ajeno. Usa `pg_advisory_xact_lock` (se libera al terminar la transacción).
- **`LISTEN/NOTIFY`**, tablas temporales `ON COMMIT PRESERVE ROWS`, cursores `WITH HOLD`: no funcionan. Usa una conexión directa para esos casos.
- Transacciones largas (o `idle in transaction`) retienen la conexión real y **anulan la multiplexación**.

```ini
; pgbouncer.ini
[databases]
app = host=10.0.0.5 port=5432 dbname=app

[pgbouncer]
pool_mode = transaction
max_client_conn = 5000
default_pool_size = 40          ; conexiones reales por par (db, user)
reserve_pool_size = 5
server_idle_timeout = 60
query_wait_timeout = 10         ; el cliente espera como máximo 10 s una conexión
max_prepared_statements = 200   ; PgBouncer 1.21+
```

- Arquitectura típica: pool pequeño en cada instancia de la app → PgBouncer → PostgreSQL. Las migraciones suelen ir **directo** a la BD (usan locks de sesión y DDL largos).
- Alternativas: **Odyssey**, **PgCat** (con sharding y balanceo a réplicas), **Supavisor**.

## RDS Proxy

Pooler administrado de AWS para RDS/Aurora (PostgreSQL y MySQL).

- Multiplexa conexiones de forma similar al modo transaction.
- **Mejora el failover**: mantiene las conexiones de los clientes mientras cambia de instancia primaria y reduce el tiempo de recuperación, sin depender del TTL del DNS.
- Integra **IAM auth** y Secrets Manager.
- **Pinning**: cuando detecta estado de sesión (`SET`, advisory locks, tablas temporales, algunos prepared statements), "fija" el cliente a una conexión y pierde la multiplexación. Se monitorea con la métrica `DatabaseConnectionsCurrentlySessionPinned`.
- Cuesta dinero (por vCPU de la BD) y agrega un poco de latencia. No lo necesitas si tienes pocas instancias estables.

## Serverless y Lambda

Es el caso extremo del problema instancias × pool:

- Cada **ambiente de ejecución** de Lambda es una instancia aislada con su propia conexión. 1.000 invocaciones concurrentes = hasta 1.000 conexiones.
- Los ambientes congelados mantienen conexiones abiertas que la BD ve como ociosas hasta que expiran.
- Un pico de tráfico se convierte en una **tormenta de conexiones** que agota `max_connections` y afecta a todos los demás servicios.

Mitigaciones:

- **RDS Proxy** (o PgBouncer) entre Lambda y la BD: es la solución estándar.
- Crear el cliente **fuera del handler** para reutilizarlo entre invocaciones del mismo ambiente, con `max: 1`.
- Limitar la concurrencia de la función (**reserved concurrency**) para acotar las conexiones.
- Drivers HTTP/serverless (Neon serverless driver, Aurora Data API, Prisma Accelerate) que no mantienen conexiones TCP persistentes.

```ts
// Fuera del handler: se reutiliza en invocaciones "calientes"
const pool = new Pool({ host: process.env.PROXY_ENDPOINT, max: 1, idleTimeoutMillis: 60_000 });

export const handler = async (event: { id: string }) => {
  const { rows } = await pool.query('SELECT id, status FROM orders WHERE id = $1', [event.id]);
  return rows[0];
};
```

## Timeouts de adquisición

Cuando todas las conexiones están ocupadas, el request espera en la cola del pool. Hay que acotar esa espera:

- **Timeout de adquisición** (`connectionTimeoutMillis` en `pg`, que cubre tanto crear una conexión como esperar en la cola; `pool_timeout` en Prisma; `connectionTimeout` en HikariCP): falla rápido en lugar de acumular requests colgados.
- Un fallo rápido permite devolver **503** y aplicar backpressure. Esperar indefinidamente hace que los hilos o el event loop se llenen de trabajo que el cliente ya abandonó.
- Métricas a exponer: conexiones en uso, ociosas, **requests esperando** y tiempo de espera de adquisición (p99). Si la espera crece, o el pool es chico, o (más frecuente) las conexiones se retienen demasiado.

## Leaks de conexiones

Un **leak** ocurre cuando una conexión se toma y nunca se devuelve. El pool se vacía de a poco hasta que todo request queda esperando.

Causas típicas:

- `pool.connect()` sin `release()` en un camino de error (usa siempre `try/finally`).
- Transacción iniciada y nunca cerrada (excepción entre `BEGIN` y `COMMIT`) → la conexión queda `idle in transaction`.
- Llamadas HTTP externas **dentro** de una transacción: la conexión queda retenida durante segundos esperando a un tercero.
- Streams/cursores que no se consumen ni se cierran.

Detección y defensa:

- HikariCP `leakDetectionThreshold`; en Node, instrumentar el tiempo que cada cliente permanece prestado.
- `idle_in_transaction_session_timeout` en la BD como red de seguridad.
- Preferir APIs que gestionen el ciclo de vida: `pool.query()` para consultas sueltas, `prisma.$transaction(async tx => ...)`, `dataSource.transaction(async manager => ...)` en TypeORM, `@Transactional` en Spring.

## Checklist de dimensionamiento

1. Calcula el presupuesto de conexiones útiles de la BD (~núcleos × 2-4, validado con pruebas de carga).
2. Resta reservas (admin, réplicas, migraciones, jobs).
3. Divide por el **máximo** de instancias que el autoscaling puede crear.
4. Si el resultado es menor que ~5 por instancia o hay serverless → pooler externo.
5. Configura timeouts de adquisición, `statement_timeout` e `idle_in_transaction_session_timeout`.
6. Monitorea espera en el pool, conexiones por estado y conexiones rechazadas. Ver [Observabilidad.md](Observabilidad.md).

## Preguntas de entrevista

1. **¿Por qué las conexiones en PostgreSQL son más caras que en otros motores?**
   Cada conexión es un proceso con su propia memoria; crearla implica fork, TLS y autenticación. Muchas conexiones aumentan el costo de los snapshots MVCC, la contención interna y los cambios de contexto aunque estén ociosas.
2. **Tienes 30 pods con un pool de 20 y la BD tiene `max_connections=500`. ¿Qué pasa en un pico?**
   30 × 20 = 600: en el pico o al escalar, las conexiones nuevas fallan con "too many clients". Hay que dimensionar desde el presupuesto de la BD (bajar el pool por pod) o poner PgBouncer/RDS Proxy.
3. **¿Por qué un pool más grande puede empeorar el rendimiento?**
   Pasado el número de núcleos (más un margen para IO), las consultas compiten por CPU, locks y caché; el throughput no sube y la latencia crece. Es mejor encolar en la app.
4. **¿Qué se rompe con PgBouncer en modo transaction?**
   Todo lo que dependa de la sesión: prepared statements (antes de 1.21), `SET` de sesión, advisory locks de sesión, `LISTEN/NOTIFY`, tablas temporales. Soluciones: `SET LOCAL`, `pg_advisory_xact_lock`, configuración por rol y conexión directa para casos especiales.
5. **¿Cómo conectas Lambda a PostgreSQL sin agotar conexiones?**
   RDS Proxy o PgBouncer delante, cliente creado fuera del handler con `max: 1`, reserved concurrency para acotar y/o drivers HTTP serverless.
6. **Los requests se cuelgan esperando conexión, pero la BD tiene la CPU al 10%. ¿Qué investigas?**
   Leaks o conexiones retenidas: sesiones `idle in transaction` en `pg_stat_activity`, llamadas externas dentro de transacciones, `release()` faltante. También esperas de locks que bloquean a todas las conexiones.
7. **¿Qué aporta RDS Proxy además del pooling?**
   Failover más rápido y transparente, IAM auth y Secrets Manager. Su trampa es el pinning, que anula la multiplexación cuando hay estado de sesión.

## Errores comunes

- Subir `max_connections` en lugar de reducir los pools o usar un pooler.
- Configurar el pool por instancia sin multiplicar por el máximo de réplicas del autoscaling.
- Olvidar a workers, crons y consolas en el presupuesto de conexiones.
- Hacer llamadas HTTP o esperas largas dentro de una transacción.
- `SET` de sesión o advisory locks de sesión detrás de PgBouncer en modo transaction.
- No tener timeout de adquisición: los requests se acumulan indefinidamente.
- Crear un `new Pool()` por request (o por invocación de Lambda dentro del handler).

# Seguridad en Bases de Datos

La BD concentra el activo más valioso (los datos) y es el objetivo final de la mayoría de ataques. La seguridad se construye en capas: **código** (inyección), **identidad y permisos** (mínimo privilegio, RLS), **cifrado** (tránsito, reposo, columna), **secretos**, **red**, **datos sensibles** y **auditoría**.

> La seguridad HTTP de la aplicación (cabeceras con Helmet, CORS, CSRF, XSS) no es tema de BD: ver la carpeta [../Seguridad](../Seguridad).

## SQL injection

Ocurre cuando input del usuario se **concatena** en el texto SQL y pasa a ser interpretado como código.

```ts
import { Pool } from 'pg';
const pool = new Pool();

// VULNERABLE
app.get('/users', async (req, res) => {
  const email = req.query.email as string;
  const { rows } = await pool.query(`SELECT id, name FROM users WHERE email = '${email}'`);
  res.json(rows);
});
// email = ' OR '1'='1          → devuelve todos los usuarios
// email = '; DROP TABLE users;-- → pg permite múltiples sentencias en queries sin parámetros
// email = ' UNION SELECT id, password_hash FROM users-- → exfiltración
```

```ts
// CORRECTO: query parametrizada
const { rows } = await pool.query(
  'SELECT id, name FROM users WHERE email = $1',
  [email],
);
```

- Con parámetros, el texto SQL y los valores viajan **por separado** (protocolo extendido: Parse/Bind/Execute). El valor nunca se parsea como SQL, sea lo que sea.
- Bonus: con queries parametrizadas `pg` no permite múltiples sentencias en una llamada.

### Por qué escapar no basta

- Escapar es **frágil**: depende del encoding (ataques multibyte históricos en MySQL con GBK), de `standard_conforming_strings`, del contexto (dentro de comillas, identificador, número, `LIKE`).
- Un valor numérico sin comillas no se protege escapando comillas: `WHERE id = ${id}` con `id = "1 OR 1=1"`.
- Basta un lugar olvidado. La parametrización es **estructural**; el escape es disciplina manual.
- Validar entrada (zod, tipos) es defensa en profundidad, **no** reemplazo de la parametrización.

### Inyección en ORDER BY, nombres de columna y tablas

Los **identificadores** no se pueden parametrizar (`ORDER BY $1` ordena por una constante, no por la columna). Solución: **whitelist**.

```ts
const SORTABLE = { name: 'name', createdAt: 'created_at', total: 'total' } as const;
type SortKey = keyof typeof SORTABLE;

function listOrders(sort: string, dir: string, limit: number) {
  const column = SORTABLE[sort as SortKey] ?? 'created_at';
  const direction = dir?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return pool.query(
    `SELECT id, name, total FROM orders ORDER BY ${column} ${direction} LIMIT $1`,
    [Math.min(limit, 100)],
  );
}
```

- Si el identificador debe ser dinámico de verdad: `pg-format` con `%I` o `quote_ident()`/`format('%I')` en SQL dinámico de PL/pgSQL.
- Los ORMs **no** son inmunes: `sequelize.literal`, `knex.raw`, `$queryRawUnsafe` de Prisma, `createQueryBuilder().orderBy(userInput)` en TypeORM. Usar las variantes con placeholders (`knex.raw('?', [v])`, tagged template `` prisma.$queryRaw`...${v}` ``). Ver [ORMs.md](ORMs.md).
- También hay inyección en SQL dinámico **dentro** de la BD (`EXECUTE 'SELECT ... ' || param` en PL/pgSQL): usar `EXECUTE format('... %I ... $1', col) USING valor`.

### NoSQL injection (MongoDB)

Mongo no parsea strings, pero si el input llega como **objeto** puede inyectar operadores.

```ts
// VULNERABLE: body JSON { "email": "admin@x.com", "password": { "$ne": null } }
const user = await users.findOne({ email: req.body.email, password: req.body.password });
// → { password: { $ne: null } } matchea cualquier password: bypass de login

// CORRECTO: forzar tipos
const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
const user = await users.findOne({ email });
if (!user || !(await argon2.verify(user.passwordHash, password))) throw new Unauthorized();
```

- **`$where`**, `$function` y `mapReduce` ejecutan JavaScript en el servidor: nunca con input del usuario (deshabilitar con `security.javascriptEnabled: false`).
- Otros vectores: `$regex` con input (ReDoS), query strings parseados como objetos (`?email[$ne]=x` con `qs`). Usar `express-mongo-sanitize` o validación estricta de esquema.

## Mínimo privilegio

- **Nunca** conectar la app como superuser (`postgres`, `rds_superuser`) ni como owner de las tablas: un SQL injection se vuelve `DROP`, `COPY ... TO PROGRAM` (ejecución de comandos) o lectura de todo.
- Roles separados:

| Rol | Permisos | Uso |
|---|---|---|
| `app_owner` | Owner del esquema, DDL | Solo migraciones (CI/CD), nunca en runtime |
| `app_rw` | SELECT/INSERT/UPDATE/DELETE en tablas de la app | Servicio en runtime |
| `app_ro` | SELECT | Réplicas, reporting, soporte |
| personas | Roles nominales, temporales, auditados | Acceso humano break-glass |

```sql
-- Endurecer defaults
REVOKE CREATE ON SCHEMA public FROM PUBLIC;          -- default en PG15+
REVOKE ALL ON DATABASE appdb FROM PUBLIC;

CREATE ROLE app_owner NOLOGIN;
CREATE ROLE app_rw   LOGIN PASSWORD '...' CONNECTION LIMIT 200;
CREATE ROLE app_ro   LOGIN PASSWORD '...';

CREATE SCHEMA app AUTHORIZATION app_owner;
GRANT CONNECT ON DATABASE appdb TO app_rw, app_ro;
GRANT USAGE ON SCHEMA app TO app_rw, app_ro;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO app_rw;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO app_rw;
GRANT SELECT ON ALL TABLES IN SCHEMA app TO app_ro;

-- Que las tablas futuras creadas por app_owner hereden los permisos
ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA app
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rw;
ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA app
  GRANT SELECT ON TABLES TO app_ro;

-- Tabla append-only: la app puede insertar pero no modificar la auditoría
REVOKE UPDATE, DELETE ON app.audit_log FROM app_rw;

-- Límites defensivos por rol
ALTER ROLE app_rw SET statement_timeout = '5s';
ALTER ROLE app_ro SET default_transaction_read_only = on;
```

- Un rol por servicio en microservicios: si un servicio se compromete, no lee las tablas de otro.
- Revisar permisos con `\dp` / `information_schema.role_table_grants`.
- Funciones `SECURITY DEFINER` corren con permisos del owner: fijar `search_path` (`SET search_path = app, pg_temp`) para evitar hijacking.

## Row Level Security (RLS) multi-tenant

RLS hace que la BD filtre filas según políticas, como red de seguridad contra un `WHERE tenant_id = ?` olvidado.

```sql
CREATE TABLE app.invoices (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id  uuid NOT NULL,
  amount     numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON app.invoices (tenant_id, created_at);

ALTER TABLE app.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.invoices FORCE ROW LEVEL SECURITY;   -- aplica también al owner

CREATE POLICY tenant_isolation ON app.invoices
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

```ts
async function withTenant<T>(tenantId: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // set_config(..., true) = SET LOCAL: se limpia al terminar la tx (seguro con pooling)
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Aunque el SQL olvide filtrar, solo ve facturas del tenant
await withTenant(tenantId, c => c.query('SELECT id, amount FROM app.invoices'));
```

- Usar **`SET LOCAL`** dentro de transacción: un `SET` de sesión se filtra a otro request que reutilice la conexión (pool, PgBouncer en transaction mode). Ver [ConnectionPooling.md](ConnectionPooling.md).
- Superusers y roles con `BYPASSRLS` ignoran las políticas; la app no debe tenerlos.
- Costo: el predicado se agrega a cada query; necesita índice con `tenant_id` al inicio. Funciones en políticas deben ser `STABLE`/baratas.
- Sin `current_setting` definido, `current_setting(..., true)` devuelve NULL → la política no matchea nada (falla cerrada, deseable).

## Cifrado en tránsito

- Toda conexión app ↔ BD con **TLS**, incluso dentro de la VPC (movimiento lateral, sniffing).
- `sslmode=require` cifra pero **no verifica** el servidor (vulnerable a MITM). Usar **`verify-full`**: valida la CA y el hostname.

```ts
import fs from 'node:fs';
const pool = new Pool({
  host: process.env.PGHOST,
  ssl: {
    ca: fs.readFileSync('/etc/ssl/rds-global-bundle.pem', 'utf8'),
    rejectUnauthorized: true,   // nunca false en producción
  },
});
// o en connection string: postgres://...?sslmode=verify-full&sslrootcert=/path/ca.pem
```

- Del lado servidor: forzar TLS (`hostssl` en `pg_hba.conf`, `rds.force_ssl = 1`), TLS 1.2+.
- Replicación y backups también por canal cifrado.

## Cifrado en reposo

- **TDE / cifrado de volumen**: RDS/Aurora con **KMS**, EBS cifrado, SQL Server/Oracle TDE. Protege contra robo de discos, snapshots o backups; **no** protege contra alguien con acceso a la BD o un SQL injection (los datos se leen descifrados).
- Snapshots de un volumen cifrado quedan cifrados; compartirlos entre cuentas requiere compartir la clave KMS (CMK propia, no la administrada por AWS).
- En RDS el cifrado se define al crear la instancia; para cifrar una existente: snapshot → copia cifrada → restaurar.

## Cifrado a nivel columna y hashing

Para datos muy sensibles (documentos de identidad, datos de tarjeta, tokens) que deben protegerse incluso de quien lee la BD.

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Cifrado simétrico en la BD (la clave viaja en la query: queda en logs si no se cuida)
INSERT INTO app.customers (id, national_id_enc)
VALUES (1, pgp_sym_encrypt('12.345.678-9', current_setting('app.enc_key')));
SELECT pgp_sym_decrypt(national_id_enc, current_setting('app.enc_key')) FROM app.customers;
```

- Mejor: **cifrar en la aplicación** con envelope encryption (data key de KMS, AES-256-GCM). La BD nunca ve la clave ni el texto plano.
- Trade-off: no se puede indexar/buscar sobre datos cifrados. Para búsqueda por igualdad: guardar además un **HMAC** determinístico (blind index).
- **Contraseñas: hashing, no cifrado**. Algoritmos lentos con salt: **argon2id** (preferido) o **bcrypt** (cost ≥ 12), scrypt. Hacerlo **en la aplicación**.
  - Nunca MD5/SHA-1/SHA-256 simples (se crackean con GPUs a miles de millones por segundo), ni `crypt()`/`md5()` en SQL (el password en claro queda en logs de queries y `pg_stat_statements`).

```ts
import argon2 from 'argon2';
const hash = await argon2.hash(password, { type: argon2.argon2id });
await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
const ok = await argon2.verify(storedHash, candidate);
```

- Tampoco usar autenticación `md5` de Postgres para usuarios de BD: usar **`scram-sha-256`** (`password_encryption = scram-sha-256`).

## Gestión de secretos

- Nada de credenciales en el repo, imágenes Docker, `.env` commiteados o variables en texto plano en la definición de tareas.
- **AWS Secrets Manager / SSM Parameter Store**, **HashiCorp Vault**, GCP Secret Manager: inyectar en runtime.
- **Rotación** automática (Secrets Manager con Lambda de rotación, estrategia de dos usuarios alternados para evitar cortes). La app debe **re-leer** el secreto al fallar la autenticación, no solo al arrancar.
- **Credenciales dinámicas** (Vault database secrets engine): usuario temporal por servicio con TTL.
- **IAM database authentication** (RDS/Aurora): token de 15 min firmado con el rol IAM, sin password estático.

```ts
import { Signer } from '@aws-sdk/rds-signer';
const signer = new Signer({ hostname: host, port: 5432, username: 'app_rw', region: 'us-east-1' });
const pool = new Pool({
  host, user: 'app_rw', database: 'appdb',
  password: () => signer.getAuthToken(),   // pg acepta función async: token fresco por conexión
  ssl: { ca, rejectUnauthorized: true },
});
```

- Cuidar que secretos no terminen en logs (connection strings en errores, `log_statement = 'all'` con claves de pgcrypto).

## PII, enmascaramiento y entornos no productivos

- **Clasificar** datos: PII (nombre, email, RUT/DNI, teléfono), datos sensibles (salud, financieros), secretos. Inventario de dónde vive cada uno (BD, réplicas, warehouse, logs, backups, caché).
- **Minimización**: no guardar lo que no se necesita; retención con borrado programado.
- **Datos de producción en dev/staging: no**. Un dump de prod en la laptop de un desarrollador es una brecha. Alternativas:
  - Datos sintéticos (Faker, seeds).
  - Copias **anonimizadas** de forma irreversible (PostgreSQL Anonymizer, scripts de enmascaramiento en el pipeline de copia), manteniendo formato y distribución.
  - Subconjuntos pequeños y enmascarados.
- **Enmascaramiento dinámico** para roles de soporte: vistas que exponen `left(email, 2) || '***'`, con permisos solo sobre la vista.

```sql
CREATE VIEW support.customers_masked AS
SELECT id,
       left(name, 1) || '***'                          AS name,
       regexp_replace(email, '(^.).*(@.*$)', '\1***\2') AS email,
       created_at
FROM app.customers;
GRANT SELECT ON support.customers_masked TO support_ro;   -- sin acceso a app.customers
```

- Derecho al olvido (GDPR/leyes locales): borrar en BD, réplicas, warehouse, índices de búsqueda; en backups y logs inmutables → **crypto-shredding** (cifrar por usuario y destruir la clave).

## Auditoría

- **pgaudit**: registra sesiones y objetos accedidos (DDL, escrituras, lecturas sobre tablas sensibles) en el log de Postgres.

```sql
-- postgresql.conf / parameter group: shared_preload_libraries = 'pgaudit'
CREATE EXTENSION pgaudit;
ALTER SYSTEM SET pgaudit.log = 'ddl, role, write';
-- Auditoría de objetos: solo lecturas de tablas sensibles
CREATE ROLE auditor NOLOGIN;
ALTER SYSTEM SET pgaudit.role = 'auditor';
GRANT SELECT ON app.customers TO auditor;   -- toda lectura de customers se audita
```

- `log_connections`, `log_disconnections`, intentos fallidos de autenticación.
- Enviar logs fuera de la BD (CloudWatch, SIEM) donde el DBA no pueda borrarlos.
- Auditoría de negocio (quién cambió qué) en tablas append-only o vía CDC, separada de pgaudit.
- Cuidado: `pgaudit.log = 'all'` genera volumen enorme y puede incluir datos sensibles en parámetros.

## Red

- La BD **nunca** con puerto público (`0.0.0.0/0:5432`). En subredes privadas, sin IP pública (`PubliclyAccessible = false`).
- **Security groups** que solo permiten el SG de la aplicación (referencia por SG, no por CIDR amplio).
- Acceso humano vía bastion/SSM Session Manager o VPN, con MFA y sesiones auditadas; nunca abrir el SG "un rato".
- `pg_hba.conf`: restringir por usuario, base y origen; `hostssl ... scram-sha-256`; sin `trust`.
- VPC endpoints / PrivateLink para servicios administrados.

## Backups seguros

- Backups y snapshots **cifrados** (KMS), con acceso restringido y separado de producción: una cuenta AWS distinta con copias inmutables (AWS Backup Vault Lock, S3 Object Lock) protege contra ransomware y contra un atacante con credenciales de prod.
- Los dumps contienen toda la PII: tratarlos con el mismo nivel que la BD.
- Probar restauraciones. Detalle en [Backups.md](Backups.md).

## Otras prácticas

- Mantener el motor parcheado (minor versions) y extensiones al día.
- `statement_timeout` y `idle_in_transaction_session_timeout` por rol como defensa ante abuso y queries descontroladas.
- Mensajes de error genéricos al cliente: no devolver el error SQL (revela esquema).
- Monitorear anomalías: picos de filas leídas por un rol, queries desde orígenes inusuales (ver [Observabilidad.md](Observabilidad.md)).

## Preguntas de entrevista

1. **¿Por qué las queries parametrizadas previenen SQL injection y escapar no?** Los parámetros viajan separados del texto SQL y nunca se parsean como código; escapar depende del contexto y encoding y basta un olvido. La parametrización es estructural.
2. **¿Cómo haces seguro un `ORDER BY` dinámico?** Los identificadores no se parametrizan: se mapea el input a una whitelist de columnas y direcciones permitidas; o `format('%I')` si es realmente dinámico.
3. **¿Cómo ocurre una NoSQL injection en Mongo?** Pasando objetos con operadores (`{"$ne": null}`) donde se esperaba un string, o input en `$where`. Se previene validando tipos y deshabilitando JavaScript del servidor.
4. **¿Qué roles de BD definirías para un servicio?** Owner para migraciones (solo CI), rol de runtime con DML mínimo, rol de solo lectura para reporting, y accesos humanos nominales y auditados. Nunca superuser en la app.
5. **¿Cómo implementas aislamiento multi-tenant con RLS y qué riesgo hay con pooling?** Política `tenant_id = current_setting('app.tenant_id')` con `FORCE ROW LEVEL SECURITY` y el setting con `SET LOCAL` por transacción; un `SET` de sesión se filtraría a otros requests en conexiones compartidas.
6. **¿`sslmode=require` es suficiente?** No: cifra pero no valida el certificado ni el hostname, permitiendo MITM. Usar `verify-full` con la CA.
7. **¿Qué protege el cifrado en reposo y qué no?** Protege discos, snapshots y backups robados; no protege ante quien consulta la BD con credenciales válidas o vía SQL injection. Para eso: cifrado a nivel columna en la app y mínimo privilegio.
8. **¿Cómo guardarías contraseñas?** Hash lento con salt (argon2id o bcrypt) calculado en la aplicación; nunca MD5/SHA simples ni hashing en SQL, que deja el password en logs.

## Errores comunes

- Conectar la app como `postgres`/owner de las tablas.
- Concatenar strings "porque el input viene de un dropdown".
- `rejectUnauthorized: false` para "arreglar" un error de certificado.
- Credenciales en el repositorio o en la imagen Docker; secretos sin rotación.
- Usar `SET` de sesión para el tenant con un pool compartido.
- Copiar dumps de producción a entornos de desarrollo.
- BD con acceso público "temporal" para depurar.
- Creer que el cifrado de disco protege contra SQL injection.

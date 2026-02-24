# 8️⃣ Performance y Optimización

Senior = sabe **leer planes de ejecución**, optimizar queries y diseñar índices eficientes.

---

## Índice

1. [EXPLAIN & EXPLAIN ANALYZE](#explain--explain-analyze)
2. [Índices y Optimización](#índices-y-optimización)
3. [Query Optimization](#query-optimization)
4. [N+1 Problem](#n1-problem)
5. [Connection Pooling](#connection-pooling)
6. [Proyección y SELECT Específico](#proyección-y-select-específico)
7. [Paginación Eficiente](#paginación-eficiente)
8. [Vacuum y Mantenimiento](#vacuum-y-mantenimiento)
9. [Monitoring y Slow Queries](#monitoring-y-slow-queries)

---

## EXPLAIN & EXPLAIN ANALYZE

### EXPLAIN (Plan estimado)

\`\`\`sql
EXPLAIN SELECT * FROM users WHERE email = 'juan@example.com';
\`\`\`

**Salida:**
\`\`\`
Seq Scan on users  (cost=0.00..18.50 rows=1 width=100)
  Filter: (email = 'juan@example.com'::text)
\`\`\`

**Interpretación:**
- \`Seq Scan\`: Escaneo secuencial (lee toda la tabla)
- \`cost=0.00..18.50\`: Costo estimado (0 inicial, 18.50 total)
- \`rows=1\`: Filas estimadas que devolverá
- \`width=100\`: Ancho promedio de cada fila en bytes

---

### EXPLAIN ANALYZE (Ejecución real)

\`\`\`sql
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'juan@example.com';
\`\`\`

**Salida:**
\`\`\`
Seq Scan on users  (cost=0.00..18.50 rows=1 width=100)
                   (actual time=0.045..2.123 rows=1 loops=1)
  Filter: (email = 'juan@example.com'::text)
  Rows Removed by Filter: 9999
Planning Time: 0.123 ms
Execution Time: 2.234 ms
\`\`\`

**Interpretación:**
- \`actual time=0.045..2.123\`: Tiempo real (inicio..fin) en ms
- \`rows=1\`: Filas reales devueltas
- \`Rows Removed by Filter: 9999\`: Filas descartadas por filtro (ineficiente!)
- \`Execution Time: 2.234 ms\`: Tiempo total de ejecución

---

### Tipos de Scans

| Tipo | Descripción | Cuándo ocurre | Eficiencia |
|------|-------------|---------------|------------|
| **Seq Scan** | Lee toda la tabla | No hay índice | ❌ Lento en tablas grandes |
| **Index Scan** | Usa índice + lee tabla | Hay índice, pocas filas | ✅ Rápido |
| **Index Only Scan** | Solo usa índice | Índice cubre todas las columnas | ✅✅ Muy rápido |
| **Bitmap Index Scan** | Índice + scan de heap | Muchas filas coinciden | ⚠️ Medio |
| **Nested Loop** | JOIN anidado | Tablas pequeñas | ✅ Bueno para pocos datos |
| **Hash Join** | JOIN con hash table | Tablas grandes | ✅ Bueno para muchos datos |
| **Merge Join** | JOIN en datos ordenados | Datos pre-ordenados | ✅ Rápido si está ordenado |

---

## Índices y Optimización

### Tipos de Índices

#### 1. B-Tree (Default)

\`\`\`sql
-- Índice simple
CREATE INDEX idx_users_email ON users(email);

-- Índice compuesto (order matters!)
CREATE INDEX idx_users_email_status ON users(email, status);

-- Índice parcial (solo filas activas)
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';

-- Índice único
CREATE UNIQUE INDEX idx_users_username ON users(username);
\`\`\`

**Cuándo usar:**
- ✅ Igualdad (\`WHERE email = 'x'\`)
- ✅ Rangos (\`WHERE created_at > '2024-01-01'\`)
- ✅ Ordenamiento (\`ORDER BY created_at\`)
- ✅ LIKE prefijo (\`WHERE name LIKE 'Juan%'\`)

---

#### 2. Hash Index

\`\`\`sql
CREATE INDEX idx_users_id_hash ON users USING HASH (id);
\`\`\`

**Cuándo usar:**
- ✅ Solo igualdad (\`WHERE id = 123\`)
- ❌ NO soporta rangos ni ORDER BY

---

#### 3. GIN (Generalized Inverted Index)

\`\`\`sql
-- Para búsqueda de texto completo
CREATE INDEX idx_posts_content_gin ON posts USING GIN (to_tsvector('english', content));

-- Para arrays
CREATE INDEX idx_tags_gin ON posts USING GIN (tags);
\`\`\`

**Cuándo usar:**
- ✅ Full-text search
- ✅ Arrays, JSONB
- ✅ \`@>\`, \`&&\`, \`@>\` operators

---

> **Ver archivo completo en:** /Users/waddini/Study/Backend/step-1/PostgreSQL/performance/README.md

**Nivel de Dificultad:** ⭐⭐⭐⭐ Senior

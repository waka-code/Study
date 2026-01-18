# Performance en Base de Datos

## Índices
- Mejoran la velocidad de búsqueda y filtrado.
- Úsalos en columnas que se consultan frecuentemente.

### Ejemplo
```sql
CREATE INDEX idx_email ON usuarios(email);
```

---

## Consultas eficientes
- Selecciona solo los campos necesarios (`SELECT campo1, campo2 ...`).
- Evita consultas N+1 (haz joins o usa IN).
- Usa paginación para grandes volúmenes de datos.

### Ejemplo
```sql
SELECT nombre FROM usuarios WHERE activo = true LIMIT 20 OFFSET 0;
```

---

## Normalización y desnormalización
- Normaliza para evitar redundancia y mantener integridad.
- Desnormaliza para acelerar lecturas en casos de alto volumen.

---

## Caching de consultas
- Guarda resultados de consultas costosas en memoria (ej: Redis, Memcached).

---

## Sharding y replicación
- Divide la base en shards para escalar horizontalmente.
- Usa réplicas para balancear lecturas y mejorar disponibilidad.

---

## Monitoreo y profiling
- Usa herramientas como `EXPLAIN`, `ANALYZE` o el dashboard del motor para detectar cuellos de botella.

### Ejemplo
```sql
EXPLAIN ANALYZE SELECT * FROM usuarios WHERE email = 'ana@email.com';
```

---

## Buenas prácticas
- Mantén estadísticas y analiza planes de ejecución.
- Elimina consultas y subconsultas innecesarias.
- Revisa bloqueos y deadlocks.
- Automatiza backups y pruebas de restauración.

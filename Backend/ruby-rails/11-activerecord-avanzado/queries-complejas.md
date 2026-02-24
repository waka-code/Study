# Queries Complejas y Optimización SQL

## GROUP BY + HAVING / Subqueries / UNION

```ruby
# GROUP BY + HAVING
User.select("users.*, COUNT(posts.id) as posts_count")
    .joins(:posts)
    .group("users.id")
    .having("COUNT(posts.id) > ?", 5)

# Subqueries
active_user_ids = User.where(active: true).select(:id)
Post.where(user_id: active_user_ids)

# UNION
published = Post.where(published: true)
featured  = Post.where(featured: true)
Post.from("(#{published.to_sql} UNION #{featured.to_sql}) AS posts")

# Window functions (PostgreSQL)
User.select("users.*, ROW_NUMBER() OVER (PARTITION BY role ORDER BY created_at) as row_num")
```

---

## EXPLAIN: Analizar Queries Lentas

```ruby
# Ver el plan de ejecución (no corre la query)
pp User.where(email: "john@example.com").explain
# EXPLAIN SELECT * FROM users WHERE email = 'john@...'
# Seq Scan on users → ⚠️ Sin índice, escanea toda la tabla

# EXPLAIN ANALYZE (corre la query y mide tiempos reales)
pp User.where(email: "john@example.com").explain(:analyze)
# Index Scan using index_users_on_email → ✅ Usa el índice

# En PostgreSQL con más detalle
pp User.all.explain(:analyze, :verbose, :buffers)
```

**Qué buscar:**
- `Seq Scan` en tablas grandes → falta índice
- `Index Scan` → usa índice correctamente
- Rows estimados muy distintos de los reales → estadísticas desactualizadas (`ANALYZE`)

---

## `pluck` vs `select`: Elegir Solo lo Necesario

```ruby
# ❌ Carga objetos completos cuando solo necesitas IDs
User.all.map(&:id)          # Instancia N objetos User en memoria

# ✅ pluck: devuelve array de valores primitivos (sin instanciar modelos)
User.pluck(:id)             # [1, 2, 3, ...]
User.pluck(:id, :email)     # [[1, "a@b.com"], [2, "c@d.com"]]

# ✅ select: devuelve objetos AR pero solo con los campos pedidos
User.select(:id, :name)     # Útil si necesitas métodos del modelo

# Regla: pluck para datos simples, select si necesitas el objeto
User.where(active: true).pluck(:email)  # Para enviar emails
```

---

## `find_each` / `find_in_batches`: Datasets Grandes

```ruby
# ❌ Carga TODOS los usuarios en memoria
User.all.each { |u| send_email(u) }  # 1M usuarios = problema de RAM

# ✅ find_each: procesa de a 1000 en 1000 (configurable)
User.find_each(batch_size: 500) do |user|
  send_email(user)
end
# Genera: SELECT * FROM users WHERE id > 0 ORDER BY id LIMIT 500
# Luego: SELECT * FROM users WHERE id > 500 ORDER BY id LIMIT 500 ...

# ✅ find_in_batches: te da el array de cada batch
User.find_in_batches(batch_size: 1000) do |batch|
  emails = batch.map(&:email)
  BulkMailer.send_to(emails)
end

# Con condiciones
User.where(active: true).find_each do |user|
  user.recalculate_stats!
end
```

---

## Bulk Operations: `update_all` y `delete_all`

```ruby
# ❌ Lento: instancia cada objeto y dispara callbacks
User.where(trial: true, created_at: ..30.days.ago).each do |u|
  u.update!(expired: true)
end
# N queries

# ✅ update_all: 1 sola query, sin callbacks ni validaciones
User.where(trial: true, created_at: ..30.days.ago)
    .update_all(expired: true, updated_at: Time.current)
# UPDATE users SET expired = true WHERE ...

# ✅ delete_all: DELETE sin callbacks
Post.where(published: false, created_at: ..90.days.ago).delete_all
# DELETE FROM posts WHERE ...

# ⚠️ destroy_all vs delete_all
Post.where(...).destroy_all  # Carga objetos, ejecuta callbacks (lento)
Post.where(...).delete_all   # 1 query, sin callbacks (rápido)
```

**Cuándo usar bulk ops:**
- Tareas de mantenimiento (expirar registros, limpiar datos viejos)
- Migraciones de datos a gran escala
- Cuando los callbacks no son necesarios

---

## `insert_all` / `upsert_all` (Rails 6+)

```ruby
# ❌ Insertar 1000 registros de a uno = 1000 queries
products.each { |p| Product.create!(p) }

# ✅ insert_all: 1 sola query, sin validaciones ni callbacks
Product.insert_all([
  { name: "Widget", price: 9.99 },
  { name: "Gadget", price: 19.99 },
  # ... 1000 más
])

# ✅ upsert_all: INSERT o UPDATE si existe (basado en unique index)
Product.upsert_all(
  [{ sku: "ABC", price: 9.99 }, { sku: "XYZ", price: 14.99 }],
  unique_by: :sku
)
```

---

## Pregunta de Entrevista

**P: ¿Cómo optimizarías una query que tarda 5 segundos?**

**R:**
1. `explain(:analyze)` para ver el plan de ejecución y detectar Seq Scans
2. Agregar índice en la columna del WHERE/JOIN más selectiva
3. Revisar si se están cargando columnas innecesarias (usar `select` o `pluck`)
4. Si itera sobre muchos registros, usar `find_each` para evitar OOM
5. Si hace N updates, reemplazar por `update_all`
6. Verificar N+1 con Bullet y usar `includes`

**P: ¿Diferencia entre `delete_all` y `destroy_all`?**

`destroy_all` carga cada registro en Ruby y ejecuta callbacks (`before_destroy`, etc.) — N queries. `delete_all` emite un solo `DELETE FROM ... WHERE` — sin callbacks, sin instanciar objetos. Usa `destroy_all` cuando necesitas callbacks (ej: borrar archivos, notificar). Usa `delete_all` para mantenimiento masivo donde los callbacks no aplican.

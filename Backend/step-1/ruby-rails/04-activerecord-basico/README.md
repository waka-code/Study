# 04 - ActiveRecord Básico

ActiveRecord es el **ORM** (Object-Relational Mapper) de Rails. Es potente, expresivo y sigue el patrón **Active Record**. Este módulo cubre los fundamentos.

---

## 📚 Contenido

1. **[crud-basico.md](./crud-basico.md)** - Create, Read, Update, Delete (find, where, all, create, update, destroy)
2. **[validaciones.md](./validaciones.md)** - presence, uniqueness, length, format, numericality, custom validations
3. **[callbacks.md](./callbacks.md)** - before_save, after_create, before_validation, after_commit, etc.
4. **[scopes.md](./scopes.md)** - Scopes básicos, default_scope
5. **[queries.md](./queries.md)** - where, find_by, order, limit, offset, pluck, select
6. **[migraciones-basicas.md](./migraciones-basicas.md)** - Crear tablas, agregar columnas, índices, tipos de datos

---

## 🎯 Objetivos de aprendizaje

Al terminar este módulo deberías:

- ✅ Dominar CRUD con ActiveRecord
- ✅ Usar validaciones para integridad de datos
- ✅ Entender y usar callbacks correctamente
- ✅ Crear scopes reutilizables
- ✅ Escribir queries eficientes
- ✅ Crear y modificar migraciones

---

## 🔥 ¿Por qué ActiveRecord?

- **Productivo**: menos código que otros ORMs
- **Expresivo**: queries se leen como inglés
- **Convenciones**: sigue naming conventions estrictas
- **Migraciones**: versionado de base de datos
- **Validaciones**: integradas en modelos
- **Callbacks**: hooks de ciclo de vida
- **Asociaciones**: relaciones simples y potentes

---

## 💡 ActiveRecord vs Sequelize vs Entity Framework

| Característica | ActiveRecord (Rails) | Sequelize (Node.js) | Entity Framework (.NET) |
|----------------|----------------------|---------------------|------------------------|
| **Patrón** | Active Record | Data Mapper + Active Record | Data Mapper |
| **Sintaxis** | Ruby DSL | JavaScript/TypeScript | C# LINQ |
| **Migraciones** | Integradas | CLI separado | Code First / Migrations |
| **Validaciones** | En modelos | En modelos | Data Annotations |
| **Callbacks** | Integrados | Hooks manuales | Interceptors |
| **Queries** | Chainable methods | Chainable promises | LINQ |
| **Performance** | Muy optimizado | Bueno | Excelente |

---

## 🏗️ Convenciones de ActiveRecord

### Naming conventions

```ruby
# Modelo (singular, CamelCase)
class User < ApplicationRecord
end

# Tabla (plural, snake_case)
users

# Clave primaria (por defecto)
id

# Clave foránea (singular_id)
user_id

# Timestamps (por defecto si existen)
created_at
updated_at
```

### Ejemplo

```ruby
# Modelo
class BlogPost < ApplicationRecord
  belongs_to :user
  has_many :comments
end

# Tabla: blog_posts
# Columnas esperadas:
# - id (primary key)
# - user_id (foreign key)
# - title
# - body
# - created_at
# - updated_at
```

---

## 🎓 Filosofía ActiveRecord

1. **Convention over Configuration**: sigue las convenciones y todo funciona
2. **DRY**: validaciones y lógica en modelos
3. **Fat Models, Skinny Controllers**: lógica de negocio en modelos
4. **Chainable queries**: `User.where(active: true).order(:name).limit(10)`
5. **SQL abstraction**: escribe menos SQL (pero entiende SQL)

---

## 🔗 Estructura de archivos

```
app/models/
├── application_record.rb    # Base para todos los modelos
├── user.rb
├── post.rb
└── comment.rb

db/
├── migrate/                  # Migraciones
│   ├── 20240115000001_create_users.rb
│   ├── 20240115000002_create_posts.rb
│   └── 20240115000003_add_index_to_users_email.rb
├── schema.rb                 # Snapshot de la DB
└── seeds.rb                  # Data de prueba
```

---

**Prerrequisito**: haber completado [03-api-rest](../03-api-rest/)

**Nota**: ActiveRecord es MUY potente. Este módulo cubre lo básico. Los módulos avanzados cubrirán asociaciones, queries complejas, performance, etc.

# Arquitectura de APIs - REST

Bienvenido a la sección de Arquitectura de APIs REST. Aquí aprenderás cómo diseñar APIs profesionales, escalables y fáciles de usar.

## 📚 Índice de Contenidos

1. **[Qué es REST](01-que-es-rest.md)** - Definición y principios fundamentales
2. **[Recursos y Endpoints](02-recursos-endpoints.md)** - Modelado de recursos
3. **[Nombres de Rutas](03-nombres-rutas.md)** - Convenciones de naming
4. **[Métodos HTTP Correcto](04-metodos-http-correcto.md)** - Uso apropiado de métodos
5. **[Versionado de APIs](05-versionado-apis.md)** - Gestión de versiones
6. **[Paginación Básica](06-paginacion-basica.md)** - Listar recursos
7. **[Filtrado y Ordenamiento](07-filtrado-ordenamiento.md)** - Búsquedas avanzadas
8. **[Manejo de Errores REST](08-manejo-errores-rest.md)** - Respuestas de error

## 🎯 Objetivos de Aprendizaje

- Entender los principios REST
- Diseñar APIs escalables y mantenibles
- Implementar buenas prácticas
- Gestionar versiones y cambios
- Manejar errores profesionalmente

## 📝 Ejemplos de Código

Todos los ejemplos están implementados en:
- **C#** - Usando ASP.NET Core
- **Node.js** - Usando Express

## 📊 Conceptos Clave

### REST (Representational State Transfer)
Arquitectura basada en:
- **Recursos** - Entidades del sistema
- **Métodos HTTP** - Operaciones sobre recursos
- **Stateless** - Sin estado en el servidor
- **Cacheable** - Respuestas cacheables

## 🚀 Ejemplo Rápido: API REST

```
GET    /api/v1/usuarios          → Listar usuarios
POST   /api/v1/usuarios          → Crear usuario
GET    /api/v1/usuarios/123      → Obtener usuario
PUT    /api/v1/usuarios/123      → Actualizar usuario
DELETE /api/v1/usuarios/123      → Eliminar usuario
```

---

**Nota:** Se recomienda leer los temas en orden para una mejor comprensión.

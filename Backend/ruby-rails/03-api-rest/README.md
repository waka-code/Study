# 03 - API REST

Rails tiene soporte nativo para crear APIs RESTful. Este módulo cubre cómo construir APIs profesionales siguiendo las convenciones de Rails.

---

## 📚 Contenido

1. **[controladores-rest.md](./controladores-rest.md)** - Controladores RESTful (index, show, create, update, destroy), render json, status codes
2. **[strong-params.md](./strong-params.md)** - Parámetros permitidos, seguridad, require y permit, nested params
3. **[rutas.md](./rutas.md)** - resources, member routes, collection routes, namespace, scope, constraints
4. **[versionado-basico.md](./versionado-basico.md)** - API versioning básico (v1, v2)
5. **[response-format.md](./response-format.md)** - Formateo de respuestas JSON, errores estandarizados
6. **[paginacion-basica.md](./paginacion-basica.md)** - Paginación básica con kaminari o pagy

---

## 🎯 Objetivos de aprendizaje

Al terminar este módulo deberías:

- ✅ Crear controladores RESTful siguiendo convenciones Rails
- ✅ Usar strong parameters para seguridad
- ✅ Configurar rutas para APIs REST
- ✅ Versionar APIs correctamente
- ✅ Formatear respuestas JSON consistentemente
- ✅ Implementar paginación en listados

---

## 🔥 ¿Por qué Rails para APIs?

- **RESTful by default**: Rails fue diseñado con REST en mente
- **Convenciones claras**: menos decisiones, más productividad
- **ActiveRecord integrado**: ORM potente para consultas
- **Strong parameters**: seguridad contra mass assignment
- **Serializers**: formateo de JSON limpio y reutilizable
- **Testing incluido**: RSpec/Minitest listo para usar

---

## 💡 Rails vs Express vs .NET

| Característica | Rails | Express (Node.js) | .NET Core |
|----------------|-------|-------------------|-----------|
| **Configuración** | Convention over Configuration | Manual | Configuración explícita |
| **ORM** | ActiveRecord (integrado) | Sequelize/TypeORM | Entity Framework |
| **Routing** | RESTful por defecto | Manual | Attribute routing |
| **Validaciones** | En modelos | Manual/Joi | Data annotations |
| **Serialización** | Active Model Serializers | Manual | AutoMapper |

---

## 🏗️ Estructura típica de una API Rails

```
app/
├── controllers/
│   └── api/
│       └── v1/
│           ├── users_controller.rb
│           └── posts_controller.rb
├── models/
│   ├── user.rb
│   └── post.rb
├── serializers/           # Con active_model_serializers
│   ├── user_serializer.rb
│   └── post_serializer.rb
└── services/              # Lógica de negocio compleja
    └── authentication_service.rb
```

---

**Prerrequisito**: haber completado [02-rails-basico](../02-rails-basico/)

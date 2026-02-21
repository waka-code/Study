# 🔟 Seguridad en PostgreSQL y Aplicaciones

La seguridad NO es solo responsabilidad del backend. **La base de datos es una capa crítica de seguridad.**

---

## Índice

1. [SQL Injection Prevention](#sql-injection-prevention)
2. [Input Validation & Sanitization](#input-validation--sanitization)
3. [Prepared Statements & Parameterized Queries](#prepared-statements--parameterized-queries)
4. [Validation con Zod](#validation-con-zod)
5. [Helmet.js (Security Headers)](#helmetjs-security-headers)
6. [Row Level Security (RLS)](#row-level-security-rls)
7. [Roles y Permisos](#roles-y-permisos)
8. [Encriptación de Datos Sensibles](#encriptación-de-datos-sensibles)
9. [Audit Logging](#audit-logging)
10. [Mejores Prácticas](#mejores-prácticas)

---

## SQL Injection Prevention

### Definición
El SQL Injection es una vulnerabilidad que permite a un atacante inyectar código SQL malicioso en una consulta, comprometiendo la base de datos.

### ¿Qué debes saber?
- **Evitar concatenar cadenas en consultas SQL.**
- **Usar consultas parametrizadas o prepared statements.**
- **Validar y sanitizar entradas del usuario.**

### Ejemplo seguro
```javascript
const userId = req.params.id;
const query = 'SELECT * FROM users WHERE id = $1';
await db.query(query, [userId]);
```

---

## Input Validation & Sanitization

### Definición
La validación y sanitización de entradas asegura que los datos proporcionados por el usuario sean correctos y seguros antes de procesarlos.

### ¿Qué debes saber?
- **Validar datos en el servidor, no solo en el cliente.**
- **Usar librerías como `Joi`, `Zod` o `Validator.js` para simplificar la validación.**
- **Sanitizar entradas para eliminar caracteres peligrosos.**

### Ejemplo seguro
```javascript
const { body, validationResult } = require('express-validator');

app.post('/users', [
    body('email').isEmail().withMessage('Email inválido'),
    body('age').isInt({ min: 0 }).withMessage('La edad debe ser un número positivo')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, age } = req.body;
    await db.query('INSERT INTO users (email, age) VALUES ($1, $2)', [email, age]);
    res.json({ success: true });
});
```

---

## Prepared Statements & Parameterized Queries

### Definición
Los prepared statements son consultas precompiladas que permiten separar la lógica de la consulta de los datos, evitando inyecciones SQL.

### ¿Qué debes saber?
- **Siempre usar parámetros en lugar de concatenar cadenas.**
- **Los parámetros se representan con marcadores como `$1`, `$2`, etc.**
- **Son más eficientes porque el plan de ejecución se reutiliza.**

### Ejemplo
```javascript
const query = 'INSERT INTO users (name, email) VALUES ($1, $2)';
await db.query(query, [name, email]);
```

---

## Validation con Zod

### Definición
Zod es una librería de validación de esquemas para JavaScript/TypeScript que permite definir y validar datos de manera declarativa.

### ¿Qué debes saber?
- **Define esquemas para validar objetos complejos.**
- **Compatible con TypeScript para validación y tipado.**

### Ejemplo
```javascript
const z = require('zod');

const userSchema = z.object({
    email: z.string().email(),
    age: z.number().min(0)
});

const result = userSchema.safeParse({ email: 'test@example.com', age: 25 });
if (!result.success) {
    console.error(result.error);
} else {
    console.log('Datos válidos:', result.data);
}
```

---

## Helmet.js (Security Headers)

### Definición
Helmet.js es un middleware de Node.js que ayuda a proteger aplicaciones web configurando cabeceras HTTP relacionadas con la seguridad.

### ¿Qué debes saber?
- **Protege contra ataques comunes como XSS y clickjacking.**
- **Configura cabeceras como `Content-Security-Policy`, `X-Frame-Options`, etc.**

### Ejemplo
```javascript
const helmet = require('helmet');
const express = require('express');
const app = express();

app.use(helmet());
```

---

## Row Level Security (RLS)

### Definición
RLS permite definir políticas de acceso a nivel de fila en PostgreSQL, restringiendo qué datos puede ver o modificar cada usuario.

### ¿Qué debes saber?
- **Habilitar RLS en tablas sensibles.**
- **Definir políticas específicas para cada rol.**

### Ejemplo
```sql
-- Habilitar RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Definir política
CREATE POLICY user_orders_policy ON orders
    USING (user_id = current_user_id());

-- Asignar rol
GRANT SELECT, INSERT, UPDATE ON orders TO user_role;
```

---

## Roles y Permisos

### Definición
Los roles y permisos en PostgreSQL controlan quién puede acceder y realizar acciones en la base de datos.

### ¿Qué debes saber?
- **Usar roles para agrupar permisos.**
- **Asignar permisos mínimos necesarios (principio de menor privilegio).**

### Ejemplo
```sql
-- Crear rol
CREATE ROLE readonly;

-- Asignar permisos
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;

-- Asignar rol a usuario
GRANT readonly TO usuario;
```

---

## Encriptación de Datos Sensibles

### Definición
La encriptación protege datos sensibles en reposo y en tránsito, asegurando que solo usuarios autorizados puedan acceder a ellos.

### ¿Qué debes saber?
- **Usar TLS para encriptar conexiones a la base de datos.**
- **Encriptar datos sensibles como contraseñas y números de tarjeta de crédito.**

### Ejemplo
```sql
-- Encriptar datos sensibles
CREATE EXTENSION pgcrypto;

INSERT INTO users (email, password)
VALUES ('user@example.com', crypt('password123', gen_salt('bf')));

-- Verificar contraseña
SELECT * FROM users WHERE password = crypt('password123', password);
```

---

## Audit Logging

### Definición
El audit logging registra todas las operaciones realizadas en la base de datos, proporcionando un historial para auditorías y análisis de seguridad.

### ¿Qué debes saber?
- **Usar extensiones como `pgaudit` para registrar eventos.**
- **Monitorear accesos y cambios en datos sensibles.**

### Ejemplo
```sql
-- Instalar extensión pgaudit
CREATE EXTENSION pgaudit;

-- Configurar auditoría
ALTER SYSTEM SET pgaudit.log = 'all';
SELECT pg_reload_conf();
```

---

## Mejores Prácticas

1. **Principio de menor privilegio**: Asignar solo los permisos necesarios.
2. **Rotación de contraseñas**: Cambiar contraseñas regularmente.
3. **Monitoreo continuo**: Revisar logs y alertas de seguridad.
4. **Actualizaciones regulares**: Mantener PostgreSQL y dependencias actualizadas.
5. **Pruebas de seguridad**: Realizar pruebas periódicas para identificar vulnerabilidades.

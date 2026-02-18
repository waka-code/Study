# Seguridad en Node.js: Resumen

Este archivo es un índice de referencias a la documentación de seguridad detallada en otras carpetas del proyecto.

## Documentación Relacionada

### Patrones de Seguridad
Consulta `/Backend/step-1/PatronesSeguridad/` para:
- Autenticación y autorización
- JWT y OAuth
- Hashing de contraseñas (bcrypt, argon2)
- Control de acceso basado en roles (RBAC)
- Seguridad en APIs

### Seguridad Básica
Consulta `/Backend/step-1/SeguridadBasica/` para:
- Principios fundamentales de seguridad
- Validación de entrada
- Prevención de inyección SQL
- Protección contra XSS/CSRF
- Configuración segura de headers
- Manejo de secretos y variables de entorno

## Quick Checklist para Node.js

```javascript
// ✅ Validar TODAS las entradas
const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ✅ Usar variables de entorno
const dbPassword = process.env.DB_PASSWORD;
// Nunca commit .env

// ✅ Helmet para headers de seguridad
const helmet = require('helmet');
app.use(helmet());

// ✅ CORS restringido
const cors = require('cors');
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',')
}));

// ✅ Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100 // max 100 requests
});
app.use(limiter);

// ✅ SQL injection prevention
// ❌ BAD
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ GOOD
const query = 'SELECT * FROM users WHERE email = ?';
db.query(query, [email]);

// ✅ Hash de contraseñas
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash(password, 10);

// ✅ HTTPS en producción
// Usar NODE_ENV=production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

## Temas por Nivel

### Nivel Junior
- Validación de entrada
- Variables de entorno (.env)
- Headers de seguridad (Helmet)
- CORS seguro

### Nivel Mid
- Autenticación con JWT
- Hashing de contraseñas
- Rate limiting
- SQL injection prevention
- XSS/CSRF prevention

### Nivel Senior
- OAuth 2.0
- Seguridad en microservicios
- Auditoría y logging
- Penetration testing awareness
- OWASP Top 10

## Referencias

Para documentación completa ver:
- `/Backend/step-1/PatronesSeguridad/`
- `/Backend/step-1/SeguridadBasica/`

## Pregunta de Entrevista

**¿Cuáles son los errores de seguridad más comunes en Node.js?**

1. Confiar en entrada del usuario sin validar
2. Hardcodear secretos en código
3. SQL injection por concatenación de strings
4. No usar HTTPS en producción
5. CORS permitiendo todos los orígenes
6. Sin rate limiting (DDoS vulnerable)
7. Guardar contraseñas en plaintext
8. No implementar autenticación/autorización

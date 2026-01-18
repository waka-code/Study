# Seguridad Avanzada

## OWASP Top 10
- Lista de los 10 riesgos de seguridad más críticos para aplicaciones web.
- Incluye: inyección, XSS, control de acceso roto, exposición de datos, etc.

---

## SQL Injection
- Ataque donde se insertan comandos SQL maliciosos en una consulta.

### Ejemplo vulnerable
```js
// ¡No hagas esto!
db.query(`SELECT * FROM usuarios WHERE email = '${email}'`);
```

### Ejemplo seguro
```js
db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
```

---

## XSS (Cross-Site Scripting)
- Inyección de scripts maliciosos en páginas web vistas por otros usuarios.

### Ejemplo vulnerable
```html
<div>{usuario.nombre}</div> <!-- Si no se escapa, puede ejecutar JS -->
```

### Ejemplo seguro
- Escapa el contenido antes de mostrarlo.

---

## CSRF (Cross-Site Request Forgery)
- Ataque donde un usuario autenticado es engañado para ejecutar acciones no deseadas.

### Prevención
- Usa tokens CSRF en formularios.
- Verifica el origen de las peticiones.

---

## Secrets management
- Nunca guardes contraseñas, claves o tokens en el código fuente.
- Usa variables de entorno o servicios de gestión de secretos (ej: AWS Secrets Manager, Vault).

---

## ¿Cómo evitar o contrarrestar cada ataque?

### SQL Injection
- Usa siempre consultas preparadas o parámetros en las queries.
- Valida y escapa la entrada del usuario.
- Limita los permisos de la base de datos.

### XSS (Cross-Site Scripting)
- Escapa y/o sanitiza todo dato que se muestre en el HTML.
- Usa frameworks que escapan automáticamente (React, Angular, etc).
- Implementa Content Security Policy (CSP).

### CSRF (Cross-Site Request Forgery)
- Usa tokens CSRF en formularios y peticiones sensibles.
- Verifica el origen y el referer de las peticiones.
- Requiere autenticación para acciones críticas.

### Secrets management
- Usa variables de entorno o servicios de gestión de secretos.
- Nunca subas secretos al repositorio.
- Rota las claves periódicamente.

### OWASP Top 10 (en general)
- Mantén tus dependencias actualizadas.
- Haz revisiones de código y pruebas de seguridad.
- Usa herramientas de análisis estático y dinámico.
- Aplica el principio de menor privilegio.

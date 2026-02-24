# CSRF Protection

La protección contra CSRF (Cross-Site Request Forgery) es una medida de seguridad que previene ataques en los que un atacante engaña a un usuario para que realice acciones no deseadas en una aplicación en la que ya está autenticado. Este tipo de ataque puede ser utilizado para realizar transferencias de dinero, cambiar contraseñas o realizar otras acciones maliciosas en nombre del usuario.

## ¿Cómo funciona un ataque CSRF?
1. Un usuario inicia sesión en una aplicación web legítima y su sesión queda activa.
2. El atacante engaña al usuario para que haga clic en un enlace malicioso o visite un sitio web controlado por el atacante.
3. El enlace malicioso envía una solicitud a la aplicación legítima utilizando las credenciales del usuario (por ejemplo, cookies de sesión).
4. La aplicación legítima procesa la solicitud porque proviene de un usuario autenticado, sin verificar si fue intencionada.

## ¿Cómo protege CSRF?
La protección contra CSRF generalmente se implementa utilizando tokens únicos que se generan para cada sesión o solicitud. Estos tokens deben ser enviados junto con cada solicitud que realice el cliente. Si el token no está presente o no coincide, la solicitud se rechaza.

### Ejemplo en Express.js con `csurf`
La biblioteca `csurf` es una solución popular para proteger aplicaciones Express contra ataques CSRF. A continuación, se muestra un ejemplo de cómo implementarla:

```js
const express = require('express');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

const app = express();

// Middleware para analizar cookies
app.use(cookieParser());

// Middleware para protección CSRF
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// Ruta protegida
app.get('/form', csrfProtection, (req, res) => {
  // Enviar el token CSRF al cliente
  res.send(`<form method="POST" action="/process">
              <input type="hidden" name="_csrf" value="${req.csrfToken()}">
              <button type="submit">Enviar</button>
            </form>`);
});

// Procesar el formulario
app.post('/process', csrfProtection, (req, res) => {
  res.send('Solicitud procesada con éxito');
});
```

### Mejores Prácticas para la Protección CSRF
1. **Usar tokens CSRF**: Generar un token único para cada sesión o solicitud y validarlo en el servidor.
2. **Validar el origen de las solicitudes**: Verificar el encabezado `Origin` o `Referer` para asegurarse de que las solicitudes provienen de fuentes confiables.
3. **Usar cookies seguras**: Configurar las cookies como `HttpOnly` y `Secure` para evitar que sean accesibles desde JavaScript o en conexiones no seguras.
4. **Limitar métodos HTTP**: Restringir el uso de métodos como `POST`, `PUT` y `DELETE` solo cuando sea necesario.
5. **Educar a los usuarios**: Informar a los usuarios sobre los riesgos de hacer clic en enlaces sospechosos o visitar sitios web no confiables.

---

Implementar una protección adecuada contra CSRF es esencial para garantizar la seguridad de las aplicaciones web y proteger a los usuarios contra ataques maliciosos.

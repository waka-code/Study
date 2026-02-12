# Security Headers

Las security headers son cabeceras HTTP que ayudan a proteger tu aplicación web de ataques comunes como XSS, clickjacking, robo de información y otros. Configurarlas correctamente es una defensa fundamental.

## Principales Security Headers

- **Strict-Transport-Security (HSTS):** Obliga a usar HTTPS en futuras conexiones.
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- **X-Frame-Options:** Previene que tu sitio sea embebido en un iframe (protege contra clickjacking).
  - `X-Frame-Options: DENY`
- **Content-Security-Policy (CSP):** Controla qué recursos pueden cargarse y ejecutarse en tu web (protege contra XSS).
  - `Content-Security-Policy: default-src 'self'`
- **X-XSS-Protection:** Activa el filtro de protección XSS en navegadores.
  - `X-XSS-Protection: 1; mode=block`
- **X-Content-Type-Options:** Evita que el navegador interprete archivos como otro tipo.
  - `X-Content-Type-Options: nosniff`
- **Referrer-Policy:** Controla qué información de referencia se envía.
  - `Referrer-Policy: no-referrer`
- **Permissions-Policy:** Restringe APIs del navegador (geolocalización, cámara, etc).
  - `Permissions-Policy: geolocation=(), camera=()`

## Ejemplo Express:
```js
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});
```

## Ejemplo C# (ASP.NET Core):
```csharp
app.Use(async (context, next) => {
  context.Response.Headers.Add("X-Frame-Options", "DENY");
  context.Response.Headers.Add("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  context.Response.Headers.Add("Content-Security-Policy", "default-src 'self'");
  context.Response.Headers.Add("X-XSS-Protection", "1; mode=block");
  context.Response.Headers.Add("X-Content-Type-Options", "nosniff");
  context.Response.Headers.Add("Referrer-Policy", "no-referrer");
  await next();
});
```

**Ejemplo Express:**
```js
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

# Helmet

Helmet es un middleware para aplicaciones Express.js que ayuda a proteger tu app configurando cabeceras HTTP de seguridad automáticamente.

## ¿En qué ayuda?
- Previene ataques comunes como XSS, clickjacking, sniffing de contenido y otros.
- Configura headers como `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`, entre otros.
- Es una defensa básica recomendada para cualquier API o app Node.js expuesta a internet.

## Ejemplo básico de uso
```js
const express = require('express');
const helmet = require('helmet');
const app = express();

app.use(helmet());

app.get('/', (req, res) => {
	res.send('¡App segura!');
});

app.listen(3000);
```

## Ejemplo: configuración personalizada
```js
app.use(helmet({
	contentSecurityPolicy: false, // Desactiva CSP si tienes problemas con recursos externos
	frameguard: { action: 'deny' },
	referrerPolicy: { policy: 'no-referrer' }
}));
```

---

> Helmet es una forma sencilla y efectiva de mejorar la seguridad de tus aplicaciones Express.

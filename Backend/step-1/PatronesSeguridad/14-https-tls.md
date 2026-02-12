# HTTPS / TLS

Usa HTTPS para cifrar la comunicación entre cliente y servidor. TLS es el protocolo de seguridad subyacente.

**Ejemplo Express:**
```js
const https = require('https');
https.createServer({ key, cert }, app).listen(443);
```

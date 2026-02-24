# CORS (Cross-Origin Resource Sharing)

CORS es un mecanismo que permite controlar qué dominios pueden acceder a recursos de tu servidor desde navegadores web. Es fundamental para la seguridad de APIs públicas.

- Previene que sitios no autorizados hagan peticiones a tu API.
- Se configura mediante headers en la respuesta HTTP.

**Ejemplo de header CORS:**
```
Access-Control-Allow-Origin: https://dominio-autorizado.com
```

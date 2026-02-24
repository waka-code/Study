# Revocación de Tokens

La revocación permite invalidar tokens antes de su expiración, por ejemplo, al cerrar sesión o detectar actividad sospechosa.

**Técnicas comunes:**
- Lista negra (blacklist) de tokens
- Cambiar secret o claims
- Almacenar tokens revocados en base de datos

**Ejemplo:**
```js
// Al cerrar sesión
blacklist.add(token);
```

> Es fundamental para seguridad avanzada en sistemas con JWT o refresh tokens.

# Tokens

Un token es una cadena generada por el servidor que representa la identidad y permisos de un usuario. Se utiliza para mantener sesiones sin almacenar estado en el servidor (stateless).

- Los tokens suelen ser JWT (JSON Web Token).
- Se envían en el header Authorization.
- Permiten autenticación y autorización en APIs.

**Ejemplo de token JWT (estructura):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

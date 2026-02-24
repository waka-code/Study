# OAuth Flow (Conceptual)

OAuth es un protocolo de autorización que permite a aplicaciones acceder a recursos de usuario en otro servicio sin compartir credenciales.

**Flujo básico:**
1. El usuario autoriza a la app a acceder a su cuenta en un proveedor (Google, GitHub, etc).
2. La app recibe un authorization code.
3. La app intercambia el code por un access token.
4. Usa el access token para acceder a la API del proveedor.

> OAuth es estándar para login social y acceso a APIs de terceros.

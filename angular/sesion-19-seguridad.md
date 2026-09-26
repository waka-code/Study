# Sesión 19 — Seguridad

> **Objetivo**: entender las amenazas web más relevantes en Angular y cómo el framework te protege: XSS y la **sanitización** automática, `DomSanitizer`, CSRF/XSRF, JWT y refresh token, OAuth, CORS y HTTPS. La seguridad es parcialmente responsabilidad del framework y parcialmente tuya: hay que saber dónde está cada línea.

> Requisito: [Sesión 12](sesion-12-http.md) y [Sesión 18](sesion-18-interceptors.md).

---

## 1. XSS (Cross-Site Scripting) 🔑

**XSS** = un atacante inyecta código JS malicioso que se ejecuta en el navegador de otros usuarios (ej. robar cookies/tokens). Ocurre cuando renderizas **datos no confiables** como HTML sin limpiarlos.

```html
<!-- si 'comentario' viene del usuario y contiene <script>… -->
<div>{{ comentario }}</div>
```

### 1.1 Cómo protege Angular: sanitización automática
Angular trata **todos los valores como no confiables por defecto** y los **sanitiza** al insertarlos en el DOM:
- **Interpolación `{{ }}`**: escapa el HTML → un `<script>` se muestra como texto, no se ejecuta. **Seguro por defecto.**
- **`[innerHTML]`**: Angular **sanitiza** el HTML, eliminando `<script>`, `onerror`, etc. antes de insertarlo.

```html
<div [innerHTML]="htmlDelUsuario"></div>   <!-- Angular quita lo peligroso -->
```

> 🔑 Regla: la interpolación `{{ }}` es segura (escapa todo). El peligro aparece cuando **saltas** la protección (ver `bypassSecurity`, §2) o construyes HTML/DOM manualmente.

### 1.2 Contextos de seguridad
Angular sanitiza según el contexto: **HTML**, **Style**, **URL**, **Resource URL** (`<script src>`, `<iframe src>` — el más estricto, no se puede sanitizar, solo confiar explícitamente).

### 1.3 Buenas prácticas anti-XSS
- Confía en la interpolación y `[innerHTML]` sanitizado; **no** desactives la protección sin necesidad.
- Evita `ElementRef.nativeElement.innerHTML = ...` y manipular el DOM directo (Sesión 5); usa `Renderer2`.
- Nunca uses `eval`, ni construyas templates concatenando strings del usuario.
- Usa AOT (Sesión 1): compila templates en build, reduciendo superficie de inyección.

---

## 2. `DomSanitizer` y `bypassSecurityTrust…`

A veces **necesitas** insertar contenido confiable que Angular bloquearía (ej. un `<iframe>` de YouTube, un `blob:` URL). `DomSanitizer` permite **marcar explícitamente** algo como confiable:

```typescript
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

constructor(private sanitizer: DomSanitizer) {}

videoUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
  'https://www.youtube.com/embed/XXXX',
);
```
```html
<iframe [src]="videoUrl"></iframe>
```

Métodos: `bypassSecurityTrustHtml`, `…Style`, `…Url`, `…ResourceUrl`, `…Script`.

> ⚠️ Advertencia crítica: `bypassSecurityTrust…` **desactiva** la protección de Angular. Úsalo **solo** con contenido que tú controlas, **nunca** con datos del usuario/backend sin validar. Es la puerta más común a XSS por mal uso. En entrevista, enfatiza esto.

---

## 3. CSRF / XSRF 🔑

**CSRF** (Cross-Site Request Forgery) = un sitio malicioso hace que el navegador del usuario envíe peticiones a tu backend usando sus cookies de sesión, sin su consentimiento.

### Protección de Angular (patrón cookie-to-header)
`HttpClient` trae soporte integrado: lee una cookie (`XSRF-TOKEN` por defecto) y la reenvía en un header (`X-XSRF-TOKEN`) en peticiones mutantes (POST/PUT/DELETE). El backend valida que coincidan.

```typescript
// standalone
provideHttpClient(withXsrfConfiguration({
  cookieName: 'XSRF-TOKEN',
  headerName: 'X-XSRF-TOKEN',
}));
```
- Requiere que el backend **ponga** la cookie XSRF y **valide** el header.
- Solo funciona same-origin (no envía el header a otros dominios).

> Si usas **JWT en header** `Authorization` (no cookies) para auth, el riesgo de CSRF baja, porque el token no se envía automáticamente como las cookies. Es un punto de decisión de arquitectura.

---

## 4. Autenticación: JWT

**JWT** (JSON Web Token) = un token firmado que representa la sesión del usuario. Estructura: `header.payload.signature` (base64). El backend lo firma; el cliente lo envía en cada petición.

```
Authorization: Bearer eyJhbGciOi...
```

- El **payload** es legible (no cifrado) → **nunca** guardes datos sensibles ahí.
- La **firma** garantiza que no fue alterado (solo el backend con la clave puede firmarlo).
- Tiene expiración (`exp`).

### 4.1 Dónde guardar el token
| Lugar | Pros | Contras |
|---|---|---|
| `localStorage` | Simple, persiste | Vulnerable a **XSS** (JS puede leerlo) |
| `sessionStorage` | Se borra al cerrar pestaña | Igual vulnerable a XSS |
| Cookie `HttpOnly` | JS **no** puede leerla → inmune a XSS | Vulnerable a CSRF (mitigable) |

> No hay opción perfecta. Cookie `HttpOnly` + protección CSRF es lo más seguro; `localStorage` es común pero exige protegerte bien contra XSS. Menciona el trade-off en entrevista.

### 4.2 Refresh token
El access token es de **vida corta** (minutos). Un **refresh token** (vida larga, guardado de forma más segura) permite obtener nuevos access tokens sin re-login. El flujo automático se implementa con un **interceptor** (Sesión 18, caso 6).

---

## 5. OAuth 2.0 / OpenID Connect (visión general)

**OAuth 2.0** = protocolo de autorización delegada ("Entrar con Google"). El usuario se autentica en un **proveedor** (Google, Auth0) y tu app recibe un token sin manejar contraseñas.

- Flujo recomendado para SPAs: **Authorization Code + PKCE** (no el implícito, ya obsoleto).
- Librerías comunes: `angular-oauth2-oidc`, Auth0 SDK, MSAL (Azure AD).
- **OpenID Connect (OIDC)** añade autenticación (identidad) sobre OAuth (autorización).

En entrevista basta con: *"para SPAs se usa Authorization Code Flow con PKCE; no implementar OAuth a mano, usar una librería probada"*.

---

## 6. CORS

**CORS** (Cross-Origin Resource Sharing) = mecanismo del navegador que **bloquea** peticiones a un origen distinto (dominio/puerto/protocolo) salvo que el servidor lo autorice con headers (`Access-Control-Allow-Origin`).

> 🔑 CORS se resuelve en el **backend**, no en Angular. Un error de CORS no se arregla en el frontend. En desarrollo se usa el **proxy** de Angular CLI para evitarlo:
```json
// proxy.conf.json
{ "/api": { "target": "http://localhost:3000", "secure": false } }
```
```bash
ng serve --proxy-config proxy.conf.json
```
Así `/api/...` se redirige al backend y el navegador lo ve como same-origin.

---

## 7. HTTPS y otras medidas

- **HTTPS** siempre en producción: cifra el tráfico, evita interceptación de tokens (man-in-the-middle).
- **Content Security Policy (CSP)**: headers que restringen de dónde se cargan scripts → defensa extra contra XSS.
- **No exponer secretos** en el frontend: cualquier cosa en el bundle es pública (API keys sensibles van en el backend). Los `environments` no son secretos.
- **Validación en el backend**: la validación de formularios en Angular es **UX**, no seguridad. El backend debe re-validar siempre.
- Mantener dependencias actualizadas (`npm audit`) contra vulnerabilidades conocidas.

---

## 8. Preguntas de entrevista

1. ¿Qué es XSS y cómo protege Angular por defecto?
2. ¿Es segura la interpolación `{{ }}`? ¿Y `[innerHTML]`?
3. ¿Qué es `DomSanitizer` y qué peligro tiene `bypassSecurityTrust…`?
4. ¿Qué es CSRF y cómo lo mitiga Angular?
5. ¿Dónde guardarías un JWT y qué trade-offs hay?
6. ¿Por qué el payload de un JWT no debe tener datos sensibles?
7. ¿Qué es un refresh token y cómo se implementa el flujo?
8. ¿CORS se resuelve en el frontend o backend? ¿Cómo lo evitas en dev?
9. ¿La validación de formularios en Angular es seguridad?
10. ¿Qué flujo OAuth se recomienda para SPAs?

<details>
<summary>Respuestas resumidas</summary>

1. Inyección de JS malicioso; Angular sanitiza/escapa valores por defecto al insertarlos en el DOM.
2. `{{ }}` escapa todo (segura); `[innerHTML]` sanitiza (quita scripts/handlers).
3. Servicio para marcar contenido como confiable; `bypassSecurityTrust…` desactiva la protección y abre XSS si se usa con datos no confiables.
4. Un sitio usa las cookies del usuario para hacer peticiones; Angular reenvía la cookie XSRF en un header que el backend valida.
5. localStorage (simple, vulnerable a XSS) vs cookie HttpOnly (inmune a XSS, requiere protección CSRF); trade-off de seguridad.
6. El payload es legible (base64, no cifrado); cualquiera puede decodificarlo.
7. Token de vida larga para obtener nuevos access tokens sin re-login; se implementa con un interceptor que reintenta en 401.
8. En el backend (headers CORS); en dev se usa el proxy de Angular CLI.
9. No, es UX; el backend debe validar siempre.
10. Authorization Code Flow con PKCE (con una librería, no a mano).

</details>

---

## ✅ Checklist para pasar a la Sesión 20

- [ ] Explico XSS y la sanitización automática de Angular.
- [ ] Sé cuándo y con qué cuidado usar `DomSanitizer`.
- [ ] Entiendo CSRF y la protección cookie-to-header.
- [ ] Conozco los trade-offs de dónde guardar el JWT y el refresh token.
- [ ] Sé que CORS es del backend y cómo usar el proxy en dev.
- [ ] Recuerdo que la validación de Angular es UX, no seguridad.

Sigue con la **Sesión 20 — Performance** (ya creada).

# Sesión 18 — HTTP Interceptors

> **Objetivo**: dominar los interceptors, que se colocan "en medio" de cada petición/respuesta HTTP para modificarlas de forma centralizada: añadir el token (Authorization), refrescar tokens expirados, logging, manejo global de errores, y mostrar un loader. Verás la forma **funcional** (Angular 15+, recomendada) y la de clase.

> Requisito: [Sesión 12](sesion-12-http.md) (HTTP) y [Sesión 13](sesion-13-rxjs.md) (RxJS: `switchMap`, `catchError`, `finalize`).

---

## 0. ¿Qué es un interceptor?

Un **interceptor** es una función/clase que Angular ejecuta en **cada** petición HTTP que sale (y cada respuesta que vuelve), permitiendo **inspeccionarla o transformarla**. Es un punto **central** para lógica transversal (cross-cutting): en vez de repetir código en cada llamada, lo pones una vez.

```
Componente/Servicio  →  http.get()  →  [Interceptor 1] → [Interceptor 2]  →  Servidor
                                     ←  [Interceptor 2] ← [Interceptor 1]  ←  respuesta
```

Casos de uso: **añadir el token**, refresh token, logging, manejo global de errores, loader global, cachear, reintentar, transformar URLs.

---

## 1. Forma funcional (Angular 15+) 🔑

Un interceptor funcional es una función `HttpInterceptorFn` que recibe la petición (`req`) y `next` (el siguiente eslabón de la cadena):

```typescript
import { HttpInterceptorFn } from '@angular/common/http';

export const miInterceptor: HttpInterceptorFn = (req, next) => {
  // ... modificar req si hace falta
  return next(req);   // pasa al siguiente interceptor / al servidor
};
```

Registro:
```typescript
// app.config.ts (standalone)
import { provideHttpClient, withInterceptors } from '@angular/common/http';

provideHttpClient(
  withInterceptors([authInterceptor, loadingInterceptor, errorInterceptor]),
);
```
> El **orden** del array importa: se ejecutan en ese orden a la ida, y en orden inverso a la vuelta.

---

## 2. La petición es inmutable 🔑

`HttpRequest` es **inmutable**: no puedes modificar `req` directamente; debes **clonarla** con `req.clone()` aplicando los cambios:

```typescript
const clon = req.clone({
  setHeaders: { Authorization: `Bearer ${token}` },
});
return next(clon);
```
> Pregunta clásica: *"¿por qué se clona la request?"* → porque es inmutable; garantiza que otros interceptors/reintentos no se vean afectados por mutaciones.

---

## 3. Caso 1: añadir el token (Authorization)

El uso más común: inyectar el JWT en cada petición.

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  if (!token) return next(req);           // sin token, pasa tal cual

  const clon = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
  return next(clon);
};
```
Así ningún servicio necesita añadir el header manualmente (Sesión 12).

---

## 4. Caso 2: manejo global de errores

Capturar errores HTTP en un solo lugar (mostrar toast, redirigir en 401, etc.):

```typescript
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const notify = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 401: router.navigate(['/login']); break;
        case 403: notify.error('No tienes permisos'); break;
        case 500: notify.error('Error del servidor'); break;
      }
      return throwError(() => error);   // re-lanza para que el caller también lo sepa
    }),
  );
};
```

---

## 5. Caso 3: loader global

Mostrar un spinner mientras haya peticiones en curso, contando las activas:

```typescript
import { finalize } from 'rxjs';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loader = inject(LoadingService);
  loader.mostrar();                       // +1 petición activa

  return next(req).pipe(
    finalize(() => loader.ocultar()),     // -1 al terminar (éxito o error)
  );
};
```
```typescript
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private activas = 0;
  loading$ = new BehaviorSubject(false);
  mostrar() { this.activas++; this.loading$.next(true); }
  ocultar() { if (--this.activas === 0) this.loading$.next(false); }
}
```
> `finalize` (Sesión 13) se ejecuta al completar **o** al fallar → ideal para apagar el loader siempre. El contador evita ocultarlo mientras otras peticiones siguen activas.

---

## 6. Caso 4: refresh token 🔑 (el más avanzado)

Cuando el token expira (401), refrescarlo automáticamente y **reintentar** la petición original, sin que el usuario note nada. Es un clásico de entrevistas senior.

```typescript
export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(addToken(req, auth.getToken())).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && auth.getRefreshToken()) {
        // token expirado → pedir uno nuevo y reintentar
        return auth.refreshToken().pipe(
          switchMap(nuevoToken => next(addToken(req, nuevoToken))),
          catchError(err => { auth.logout(); return throwError(() => err); }),
        );
      }
      return throwError(() => error);
    }),
  );
};

function addToken(req: HttpRequest<unknown>, token: string | null) {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}
```

### 6.1 El problema de las peticiones concurrentes
Si expiran varias peticiones a la vez, cada una intentaría refrescar → múltiples refresh. Solución típica: un `BehaviorSubject` que "comparte" el refresh en curso, de modo que las demás **esperan** el nuevo token en vez de pedir otro:
```typescript
// esquema conceptual
private refrescando = false;
private tokenSubject = new BehaviorSubject<string | null>(null);
// 1ª petición 401: dispara refresh, pone refrescando=true
// otras 401 mientras tanto: esperan a tokenSubject y reusan el token nuevo
```
Menciona este matiz en entrevista: demuestra que piensas en concurrencia.

---

## 7. Caso 5: logging

```typescript
export const logInterceptor: HttpInterceptorFn = (req, next) => {
  const inicio = performance.now?.() ?? 0;
  return next(req).pipe(
    tap(event => {
      if (event.type === HttpEventType.Response) {
        console.log(`${req.method} ${req.url} → ${event.status}`);
      }
    }),
  );
};
```

---

## 8. Forma de clase (legacy)

Antes de v15, los interceptors eran clases que implementaban `HttpInterceptor`:
```typescript
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const clon = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    return next.handle(clon);
  }
}
```
Registro (multi-provider, el orden lo da el array de providers):
```typescript
providers: [
  { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
]
// o en standalone puente: provideHttpClient(withInterceptorsFromDi())
```
> Las funcionales son la recomendación actual; las de clase siguen soportadas y se ven en proyectos existentes.

---

## 9. Orden y buenas prácticas

- El **orden** en `withInterceptors([...])` define la cadena (ida en orden, vuelta en reverso). Ej: auth antes que logging; error/loader al final.
- Un interceptor puede **short-circuit** (devolver una respuesta sin llamar a `next`) → útil para caché.
- No metas lógica de negocio en interceptors; solo cosas **transversales**.
- Cuidado con bucles: un interceptor que hace HTTP puede re-interceptarse a sí mismo.

---

## 10. Preguntas de entrevista

1. ¿Qué es un interceptor y para qué sirve?
2. ¿Por qué hay que clonar la `HttpRequest`?
3. ¿Cómo añades el token a todas las peticiones?
4. ¿Cómo manejas errores HTTP de forma global?
5. ¿Cómo implementas un loader global con interceptors? ¿Por qué `finalize`?
6. Explica el flujo de un interceptor de refresh token.
7. ¿Qué problema surge con refresh y peticiones concurrentes? ¿Cómo se resuelve?
8. ¿Importa el orden de los interceptors?
9. ¿Diferencia entre interceptor funcional y de clase?
10. ¿Un interceptor puede responder sin llamar al servidor?

<details>
<summary>Respuestas resumidas</summary>

1. Función/clase que intercepta cada request/response para lógica transversal (token, errores, logging…).
2. `HttpRequest` es inmutable; se clona con `req.clone()` para aplicar cambios sin mutar la original.
3. En un interceptor, clonando la request con `setHeaders: { Authorization: Bearer ... }`.
4. Con `catchError` en el interceptor, actuando según `error.status` (401→login, etc.).
5. Incrementar un contador al iniciar y `finalize` para decrementar al terminar (éxito o error), mostrando el spinner mientras haya activas.
6. En 401 con refresh disponible: `refreshToken()` + `switchMap` para reintentar la request original con el nuevo token; si falla, logout.
7. Múltiples 401 dispararían múltiples refresh; se comparte el refresh con un `BehaviorSubject` y las demás esperan el nuevo token.
8. Sí: se ejecutan en orden a la ida y en reverso a la vuelta.
9. Funcional = `HttpInterceptorFn` con `inject()` (recomendado); clase = implementa `HttpInterceptor` y se registra con `HTTP_INTERCEPTORS` multi.
10. Sí (short-circuit): devolver una respuesta sin llamar a `next`, útil para caché.

</details>

---

## ✅ Checklist para pasar a la Sesión 19

- [ ] Explico qué es un interceptor y su cadena (orden ida/vuelta).
- [ ] Sé por qué se clona la request.
- [ ] Implemento auth (token), errores globales y loader (`finalize`).
- [ ] Entiendo el flujo de refresh token y el problema de concurrencia.
- [ ] Distingo interceptor funcional vs de clase.

Cuando lo tengas, dime **"siguiente"** y armo la **Sesión 20** (o ya la tienes: creé 18–21 juntas). Sigue con la **Sesión 19 — Seguridad**.

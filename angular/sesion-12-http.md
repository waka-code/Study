# Sesión 12 — HTTP

> **Objetivo**: dominar la comunicación con APIs mediante `HttpClient`: los verbos (GET/POST/PUT/PATCH/DELETE), headers y params, cómo funciona con Observables, y el manejo de errores, `retry` y `timeout`. Es la forma en que tu app habla con el backend.

> Requisito: [Sesión 8](sesion-08-servicios.md) (servicios) y nociones de Observables (se profundiza en Sesión 13).

---

## 0. `HttpClient`

`HttpClient` es el servicio de Angular para hacer peticiones HTTP. Devuelve **Observables** (no Promises), lo que permite cancelar, reintentar y componer con operadores RxJS.

### 0.1 Registrarlo
```typescript
// Standalone (moderno) — app.config.ts
import { provideHttpClient } from '@angular/common/http';
export const appConfig = {
  providers: [provideHttpClient()],
};
```
```typescript
// Clásico — en un módulo
import { HttpClientModule } from '@angular/common/http';
@NgModule({ imports: [HttpClientModule] })
```

### 0.2 Inyectarlo (en un servicio, no en el componente)
> Buena práctica: las llamadas HTTP van en **servicios** (Sesión 8), no en componentes.
```typescript
@Injectable({ providedIn: 'root' })
export class ProductoService {
  private http = inject(HttpClient);          // o constructor(private http: HttpClient)
  private url = '/api/productos';
}
```

---

## 1. Los verbos HTTP

Todos devuelven `Observable<T>` y **no se ejecutan hasta que te suscribes** (Observables son "lazy" — Sesión 13).

```typescript
// GET — obtener
obtenerTodos(): Observable<Producto[]> {
  return this.http.get<Producto[]>(this.url);
}
obtenerUno(id: number): Observable<Producto> {
  return this.http.get<Producto>(`${this.url}/${id}`);
}

// POST — crear
crear(p: Producto): Observable<Producto> {
  return this.http.post<Producto>(this.url, p);   // body = p
}

// PUT — reemplazar completo
actualizar(id: number, p: Producto): Observable<Producto> {
  return this.http.put<Producto>(`${this.url}/${id}`, p);
}

// PATCH — actualización parcial
parcial(id: number, cambios: Partial<Producto>): Observable<Producto> {
  return this.http.patch<Producto>(`${this.url}/${id}`, cambios);
}

// DELETE — eliminar
eliminar(id: number): Observable<void> {
  return this.http.delete<void>(`${this.url}/${id}`);
}
```

| Verbo | Uso | Body |
|---|---|---|
| GET | Leer | No |
| POST | Crear | Sí |
| PUT | Reemplazar completo | Sí |
| PATCH | Actualizar parcial | Sí |
| DELETE | Eliminar | No |

### 1.1 El genérico `<T>`
`this.http.get<Producto[]>()` **no valida** en runtime que la respuesta sea `Producto[]`; solo **tipa** el Observable para TypeScript (autocompletado, chequeo en compilación). La respuesta real depende del backend.

---

## 2. Suscribirse (dónde ocurre la petición)

La petición **solo se dispara al suscribirse**. En el componente:
```typescript
export class ListaComponent implements OnInit {
  productos: Producto[] = [];

  constructor(private service: ProductoService) {}

  ngOnInit(): void {
    this.service.obtenerTodos().subscribe({
      next: data => this.productos = data,
      error: err => console.error(err),
      complete: () => console.log('listo'),
    });
  }
}
```

Mejor aún, con el pipe `async` (Sesión 6) evitas el subscribe manual y las fugas:
```typescript
productos$ = this.service.obtenerTodos();
```
```html
<li *ngFor="let p of productos$ | async">{{ p.nombre }}</li>
```

---

## 3. Headers y Params

### 3.1 Query params (`?page=2&sort=asc`)
```typescript
import { HttpParams } from '@angular/common/http';

const params = new HttpParams()
  .set('page', '2')
  .set('sort', 'asc')
  .set('q', 'teclado');

this.http.get<Producto[]>(this.url, { params });
// GET /api/productos?page=2&sort=asc&q=teclado
```
> `HttpParams` es **inmutable**: cada `.set()` devuelve una **nueva** instancia. Por eso se encadena. Alternativa simple: `{ params: { page: '2', sort: 'asc' } }`.

### 3.2 Headers
```typescript
import { HttpHeaders } from '@angular/common/http';

const headers = new HttpHeaders()
  .set('Authorization', `Bearer ${token}`)
  .set('Content-Type', 'application/json');

this.http.post(this.url, body, { headers });
```
> En la práctica, el token se añade automáticamente con un **interceptor** (Sesión 18), no manualmente en cada llamada.

### 3.3 Respuesta completa y tipos de respuesta
```typescript
// por defecto devuelve solo el body ya parseado
this.http.get<Producto[]>(url);

// respuesta completa (status, headers…)
this.http.get<Producto[]>(url, { observe: 'response' });   // HttpResponse<Producto[]>

// otros responseType
this.http.get(url, { responseType: 'text' });   // texto plano
this.http.get(url, { responseType: 'blob' });    // archivo/binario
```

---

## 4. Manejo de errores

Las peticiones fallan (red, 4xx, 5xx). Se manejan con el callback `error` o, mejor, con el operador `catchError` (RxJS):

```typescript
import { catchError, throwError } from 'rxjs';

obtenerTodos(): Observable<Producto[]> {
  return this.http.get<Producto[]>(this.url).pipe(
    catchError(this.manejarError),
  );
}

private manejarError(error: HttpErrorResponse) {
  if (error.status === 0) {
    // error de red o del lado del cliente
    console.error('Error de red:', error.error);
  } else {
    // el backend devolvió un código de error
    console.error(`Backend ${error.status}:`, error.error);
  }
  return throwError(() => new Error('Algo salió mal; intenta más tarde.'));
}
```

`HttpErrorResponse` trae `status`, `statusText`, `error` (el body del error), `url`.

Patrón para no romper la UI (devolver un fallback en vez de propagar):
```typescript
catchError(() => of([]))   // devuelve lista vacía si falla (of, Sesión 13)
```

---

## 5. `retry` y `timeout`

### 5.1 `retry` — reintentar
Reintenta la petición N veces si falla (útil para errores de red intermitentes):
```typescript
import { retry } from 'rxjs';

this.http.get<Producto[]>(this.url).pipe(
  retry(3),                          // reintenta hasta 3 veces
);

// con configuración (v7+): esperar entre reintentos
retry({ count: 3, delay: 1000 });   // 3 intentos, 1s de espera
```
> ⚠️ No reintentes peticiones **no idempotentes** (POST que crea recursos) a ciegas: podrías duplicar. GET es seguro reintentar.

### 5.2 `timeout` — abortar si tarda
```typescript
import { timeout } from 'rxjs';

this.http.get<Producto[]>(this.url).pipe(
  timeout(5000),      // error si no responde en 5s
  catchError(err => throwError(() => new Error('Tardó demasiado'))),
);
```

### 5.3 Combinados (orden importa)
```typescript
this.http.get<Producto[]>(this.url).pipe(
  timeout(5000),
  retry({ count: 2, delay: 1000 }),
  catchError(this.manejarError),
);
```

---

## 6. Ejemplo completo (servicio CRUD)

```typescript
@Injectable({ providedIn: 'root' })
export class ProductoService {
  private http = inject(HttpClient);
  private url = '/api/productos';

  listar(filtro?: string): Observable<Producto[]> {
    let params = new HttpParams();
    if (filtro) params = params.set('q', filtro);
    return this.http.get<Producto[]>(this.url, { params }).pipe(
      retry(1),
      catchError(this.error),
    );
  }

  crear(p: Producto): Observable<Producto> {
    return this.http.post<Producto>(this.url, p).pipe(catchError(this.error));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(catchError(this.error));
  }

  private error(e: HttpErrorResponse) {
    return throwError(() => new Error(e.error?.mensaje ?? 'Error inesperado'));
  }
}
```

---

## 7. Peticiones en paralelo / dependientes (adelanto RxJS)

- **Varias a la vez y esperar todas** → `forkJoin` (Sesión 13):
```typescript
forkJoin({
  usuario: this.http.get<Usuario>('/api/usuario/1'),
  pedidos: this.http.get<Pedido[]>('/api/pedidos'),
}).subscribe(({ usuario, pedidos }) => { /* ambas listas */ });
```
- **Una que depende de otra** → `switchMap` (Sesión 13):
```typescript
this.http.get<Usuario>('/api/usuario/1').pipe(
  switchMap(user => this.http.get<Pedido[]>(`/api/pedidos?user=${user.id}`)),
).subscribe(pedidos => { /* ... */ });
```
Estos operadores se explican a fondo en la próxima sesión.

---

## 8. Preguntas de entrevista

1. ¿Por qué `HttpClient` devuelve Observables y no Promises?
2. ¿Cuándo se ejecuta realmente una petición HTTP?
3. ¿El genérico `get<Producto[]>()` valida la respuesta en runtime?
4. ¿Diferencia entre PUT y PATCH?
5. ¿Dónde deben ir las llamadas HTTP, en el componente o en un servicio? ¿Por qué?
6. ¿Cómo agregas query params y headers?
7. ¿Cómo manejas errores? ¿Qué es `HttpErrorResponse`?
8. ¿Qué precaución hay al usar `retry` con POST?
9. ¿Cómo haces dos peticiones en paralelo? ¿Y una dependiente de otra?
10. ¿Cómo obtienes la respuesta completa (status/headers) en vez de solo el body?

<details>
<summary>Respuestas resumidas</summary>

1. Observables permiten cancelar, reintentar, componer con operadores y son lazy; las Promises no.
2. Solo al **suscribirse** (o vía pipe `async`).
3. No; solo tipa para TypeScript. La forma real depende del backend.
4. PUT reemplaza el recurso completo; PATCH actualiza parcialmente.
5. En un servicio: reutilizable, testeable, separa lógica de la vista.
6. Con `HttpParams` (inmutable) y `HttpHeaders`, pasados en el objeto de opciones.
7. Con `catchError` o el callback `error`; `HttpErrorResponse` trae status, error (body), url.
8. POST no es idempotente: reintentar puede crear duplicados.
9. Paralelo: `forkJoin`. Dependiente: `switchMap`.
10. Con `{ observe: 'response' }` → `HttpResponse<T>`.

</details>

---

## ✅ Checklist para pasar a la Sesión 13

- [ ] Sé registrar e inyectar `HttpClient` (en un servicio).
- [ ] Domino GET/POST/PUT/PATCH/DELETE y el genérico `<T>`.
- [ ] Entiendo que la petición corre al suscribirse (o con `async`).
- [ ] Sé pasar `HttpParams` y `HttpHeaders`.
- [ ] Manejo errores con `catchError` y conozco `HttpErrorResponse`.
- [ ] Uso `retry`/`timeout` con criterio (idempotencia).

Cuando lo tengas, dime **"siguiente"** y armo la **Sesión 13 — RxJS**, la sesión que separa a un Junior de un Semi-Senior: Observables, Subjects, operadores (`switchMap`, `mergeMap`, `debounceTime`, `forkJoin`…) y cuándo usar cada uno.

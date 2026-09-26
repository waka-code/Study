# Sesión 17 — Guards

> **Objetivo**: dominar los guards de rutas, que deciden si el usuario puede **entrar, salir, cargar o emparejar** una ruta: `CanActivate`, `CanActivateChild`, `CanDeactivate`, `CanMatch` (reemplaza a `CanLoad`) y `Resolve`. Verás la forma **funcional moderna** (recomendada) y la de clases (legacy), más los valores de retorno.

> Requisito: [Sesión 10](sesion-10-routing.md) (routing) y [Sesión 16](sesion-16-lazy-loading.md) (lazy).

---

## 0. ¿Qué es un guard?

Un **guard** es una función (o clase) que Angular ejecuta **antes** de activar/cargar una ruta (o antes de salir de ella) para **decidir si la navegación procede**. Usos típicos: autenticación, permisos por rol, confirmar salida con cambios sin guardar, feature flags.

```
Usuario navega a /admin  →  Angular ejecuta los guards  →  ¿permiten? → activa la ruta
                                                          → ¿deniegan? → cancela / redirige
```

---

## 1. Valores de retorno 🔑

Todos los guards devuelven uno de estos (o un `Observable`/`Promise` de ello — pueden ser **asíncronos**):

| Retorno | Efecto |
|---|---|
| `true` | Permite la navegación |
| `false` | La **bloquea** (se queda donde está) |
| `UrlTree` | La bloquea y **redirige** a esa URL (`router.createUrlTree([...])`) |

```typescript
// bloquear y redirigir a login
return router.createUrlTree(['/login']);
```
> Buena práctica: en vez de `false` + `router.navigate()` (dos pasos, posible parpadeo), devuelve un **`UrlTree`**: Angular cancela y redirige atómicamente.

---

## 2. Los tipos de guard

| Guard | Cuándo se ejecuta | Uso típico |
|---|---|---|
| **`CanActivate`** | Antes de **entrar** a una ruta | Auth, permisos |
| **`CanActivateChild`** | Antes de entrar a **rutas hijas** | Proteger todo un grupo |
| **`CanDeactivate`** | Antes de **salir** de una ruta | Confirmar cambios sin guardar |
| **`CanMatch`** | Antes de que Angular **empareje/cargue** la ruta | Auth + evitar descargar chunk lazy; rutas condicionales |
| **`Resolve`** | Antes de activar: **precarga datos** | Tener datos listos al renderizar |

> `CanLoad` está **deprecado** desde Angular 15+; usa **`CanMatch`** (más potente: participa en el *matching* de rutas, no solo en la carga).

---

## 3. Forma funcional moderna (Angular 14+) 🔑

Es la recomendada: un guard es simplemente una **función** que usa `inject()` (Sesión 8/9). Menos boilerplate que las clases.

### 3.1 `CanActivateFn`
```typescript
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.estaLogueado()) return true;

  // guardar a dónde iba, para volver tras login
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
```
```typescript
// en la ruta
{ path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] }
```

### 3.2 Guard con parámetro (rol)
Un guard configurable = una **factory** que devuelve un `CanActivateFn`:
```typescript
export function roleGuard(rolRequerido: string): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    return auth.tieneRol(rolRequerido) || inject(Router).createUrlTree(['/403']);
  };
}
```
```typescript
{ path: 'admin', component: AdminComponent, canActivate: [roleGuard('admin')] }
```

### 3.3 `CanDeactivate` — confirmar salida
Genérico sobre el componente que se abandona:
```typescript
export interface PuedeSalir {
  puedeSalir(): boolean | Observable<boolean>;
}

export const salirGuard: CanDeactivateFn<PuedeSalir> = (component) => {
  return component.puedeSalir ? component.puedeSalir() : true;
};
```
```typescript
// en el componente con un formulario a medio llenar
export class EditarComponent implements PuedeSalir {
  puedeSalir(): boolean {
    return this.form.pristine || confirm('Tienes cambios sin guardar. ¿Salir?');
  }
}

// ruta
{ path: 'editar', component: EditarComponent, canDeactivate: [salirGuard] }
```

### 3.4 `CanMatch` — auth + lazy en un paso
```typescript
export const adminMatch: CanMatchFn = () => {
  return inject(AuthService).tieneRol('admin') || inject(Router).createUrlTree(['/login']);
};
```
```typescript
{
  path: 'admin',
  canMatch: [adminMatch],   // si falla, ni siquiera descarga el chunk lazy
  loadChildren: () => import('./admin.routes').then(m => m.ADMIN_ROUTES),
}
```
> 🔑 Ventaja de `CanMatch` sobre `CanActivate` con lazy: si el usuario no tiene permiso, **no se descarga** el chunk. Además, permite tener **dos rutas con el mismo path** y elegir según el guard (ej. mostrar una u otra vista según el rol).

---

## 4. Resolvers (precargar datos)

Ya introducidos en Routing (Sesión 10). Un `Resolve` obtiene datos **antes** de activar la ruta:

```typescript
export const productoResolver: ResolveFn<Producto> = (route) => {
  const id = route.paramMap.get('id')!;
  return inject(ProductoService).obtener(id);   // Observable<Producto>
};
```
```typescript
{
  path: 'productos/:id',
  component: DetalleComponent,
  resolve: { producto: productoResolver },
}
```
```typescript
// el dato ya viene resuelto
ngOnInit() {
  this.producto = this.route.snapshot.data['producto'];
  // o reactivo: this.route.data.subscribe(d => this.producto = d['producto']);
}
```
Trade-off (recordatorio Sesión 10): retrasa la navegación hasta tener los datos. Bien para datos críticos; para el resto, mejor un loader dentro del componente.

---

## 5. Forma de clase (legacy, aún se ve)

Antes de Angular 14, los guards eran **clases inyectables** que implementaban una interfaz:
```typescript
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    return this.auth.estaLogueado() ? true : this.router.createUrlTree(['/login']);
  }
}
```
```typescript
{ path: 'dashboard', canActivate: [AuthGuard] }
```
> Las interfaces `CanActivate`, `CanDeactivate`, etc. como **clases** están **deprecadas** desde v15+ a favor de las funcionales. En proyectos existentes las verás; en nuevos, usa funciones. Puedes convertir una clase a función con `inject()`.

---

## 6. Orden de ejecución y varios guards

- Una ruta puede tener **varios** guards en el array: `canActivate: [g1, g2]`. Se ejecutan y **todos** deben permitir (si uno devuelve `false`/`UrlTree`, se detiene).
- Orden general en una navegación: `CanMatch` → `CanActivateChild` → `CanActivate` → `Resolve`. (`CanDeactivate` del componente que se abandona corre **primero**, antes de todo, para permitir cancelar la salida.)
- Los guards pueden ser **async** (devolver `Observable`/`Promise`), útil para consultar permisos al servidor.

---

## 7. Preguntas de entrevista

1. ¿Qué es un guard y para qué sirve?
2. ¿Qué valores puede devolver un guard y qué hace cada uno?
3. ¿Por qué devolver un `UrlTree` en vez de `false` + `navigate`?
4. ¿Diferencia entre `CanActivate` y `CanMatch`? ¿Ventaja de `CanMatch` con lazy?
5. ¿Para qué sirve `CanDeactivate`? Da un caso de uso.
6. ¿Qué pasó con `CanLoad`?
7. ¿Diferencia entre guard funcional y de clase? ¿Cuál se recomienda?
8. ¿Cómo haces un guard configurable (por rol)?
9. ¿Pueden ser asíncronos los guards?
10. Si una ruta tiene `canActivate: [a, b]`, ¿cómo se resuelve?

<details>
<summary>Respuestas resumidas</summary>

1. Función/clase que decide si una navegación procede (entrar/salir/cargar una ruta).
2. `true` (permite), `false` (bloquea), `UrlTree` (bloquea y redirige).
3. El `UrlTree` cancela y redirige atómicamente, sin parpadeo ni doble paso.
4. `CanActivate` corre al entrar; `CanMatch` participa en el matching/carga: si falla, no descarga el chunk lazy y permite rutas condicionales por path.
5. Confirmar antes de salir; ej. un formulario con cambios sin guardar.
6. Está deprecado (v15+); se reemplaza por `CanMatch`.
7. El funcional usa `inject()` y menos boilerplate (recomendado); el de clase implementa la interfaz (legacy/deprecado).
8. Con una factory que recibe el parámetro y devuelve un `CanActivateFn`.
9. Sí, devolviendo `Observable`/`Promise`.
10. Se ejecutan ambos; todos deben permitir; si uno bloquea, se detiene la navegación.

</details>

---

## ✅ Checklist para pasar a la Sesión 18

- [ ] Sé qué es un guard y los valores que devuelve (incl. `UrlTree`).
- [ ] Conozco los tipos: CanActivate, CanActivateChild, CanDeactivate, CanMatch, Resolve.
- [ ] Escribo guards funcionales con `inject()`.
- [ ] Entiendo la ventaja de `CanMatch` con lazy loading.
- [ ] Sé implementar `CanDeactivate` (cambios sin guardar).
- [ ] Reconozco la forma de clase (legacy) y que `CanLoad` está deprecado.

Cuando lo tengas, dime **"siguiente"** y armo la **Sesión 18 — Interceptors** (añadir token, refresh token, logging, manejo de errores, loader; funcionales vs de clase).

# Sesión 10 — Routing

> **Objetivo**: dominar el sistema de rutas de Angular: configurar rutas, navegación, parámetros (path y query), rutas hijas, lazy loading, redirects/wildcards, resolvers, y el uso de `Router` vs `ActivatedRoute`. El router es lo que convierte tu SPA en una app "multipágina" sin recargar.

> Requisito: [Sesión 8](sesion-08-servicios.md) y [Sesión 9](sesion-09-dependency-injection.md).

---

## 0. ¿Qué hace el router?

En un **SPA** (Sesión 1) no hay recargas de página. El **Router** de Angular:
- Mapea **URLs** a **componentes**.
- Cambia la vista **sin recargar** (renderiza el componente en un `<router-outlet>`).
- Gestiona historial, parámetros, guards, lazy loading.

```
URL /productos/42  →  Router  →  renderiza <ProductoDetalleComponent> en el <router-outlet>
```

---

## 1. Configurar rutas

### 1.1 Definición de rutas
```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'productos', component: ProductosComponent },
  { path: 'productos/:id', component: ProductoDetalleComponent },
  { path: 'about', component: AboutComponent },
  { path: '', redirectTo: 'home', pathMatch: 'full' },  // redirect
  { path: '**', component: NotFoundComponent },          // wildcard (404)
];
```

- `path` **sin** barra inicial (`'productos'`, no `'/productos'`).
- `:id` = parámetro de ruta (§4).
- `**` = wildcard: cualquier ruta no coincidente (siempre **al final**).

### 1.2 Registrar el router
```typescript
// Standalone (Angular 15+) — app.config.ts
import { provideRouter } from '@angular/router';

export const appConfig = {
  providers: [provideRouter(routes)],
};
```
```typescript
// Clásico con módulos — app-routing.module.ts
@NgModule({
  imports: [RouterModule.forRoot(routes)],   // forRoot en el módulo raíz
  exports: [RouterModule],
})
export class AppRoutingModule {}
```
(En módulos de features se usa `RouterModule.forChild(routes)`.)

### 1.3 El `<router-outlet>`
El componente activo se renderiza aquí:
```html
<app-header></app-header>
<router-outlet></router-outlet>   <!-- aquí aparece la vista de la ruta -->
<app-footer></app-footer>
```

---

## 2. Navegación

### 2.1 En el template: `routerLink`
```html
<a routerLink="/productos">Productos</a>
<a [routerLink]="['/productos', producto.id]">Ver detalle</a>   <!-- /productos/42 -->
<a [routerLink]="['/productos']" [queryParams]="{ page: 2 }">Página 2</a>
```
> ❌ No uses `href="/productos"` para navegación interna: recarga toda la página (rompe el SPA). Usa `routerLink`.

### 2.2 Ruta activa: `routerLinkActive`
```html
<a routerLink="/home" routerLinkActive="activo">Home</a>
<!-- añade la clase 'activo' cuando la ruta coincide -->
<a routerLink="/home" routerLinkActive="activo"
   [routerLinkActiveOptions]="{ exact: true }">Home</a>
```

### 2.3 Programática: `Router`
```typescript
import { Router } from '@angular/router';

export class LoginComponent {
  constructor(private router: Router) {}

  entrar(): void {
    this.router.navigate(['/dashboard']);
    this.router.navigate(['/productos', 42]);            // /productos/42
    this.router.navigate(['/buscar'], { queryParams: { q: 'teclado' } });
    this.router.navigateByUrl('/home');                  // por string
  }
}
```

`NavigationExtras` (segundo argumento) permite `queryParams`, `fragment`, `state`, `relativeTo`, etc.

---

## 3. Rutas hijas (children)

Para layouts anidados (ej. un panel con secciones):

```typescript
export const routes: Routes = [
  {
    path: 'admin',
    component: AdminLayoutComponent,   // tiene su propio <router-outlet>
    children: [
      { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
      { path: 'usuarios', component: UsuariosComponent },
      { path: 'reportes', component: ReportesComponent },
    ],
  },
];
```
`AdminLayoutComponent` incluye **otro** `<router-outlet>` donde se renderizan los hijos. URL: `/admin/usuarios`.

---

## 4. Parámetros de ruta

### 4.1 Route params (`:id`) — parte de la URL
```typescript
{ path: 'productos/:id', component: ProductoDetalleComponent }
```
Se leen con `ActivatedRoute`:
```typescript
import { ActivatedRoute } from '@angular/router';

export class ProductoDetalleComponent implements OnInit {
  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // opción A: snapshot (valor una vez, si el componente no se reutiliza)
    const id = this.route.snapshot.paramMap.get('id');

    // opción B: observable (reacciona si el id cambia sin recrear el componente)
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      this.cargar(id);
    });
  }
}
```

> 🔑 **`snapshot` vs observable**: si navegas de `/productos/1` a `/productos/2`, Angular **reutiliza** el componente (no lo recrea), así que `snapshot` (leído una vez en `ngOnInit`) **no se actualiza**. Usa el **observable** `paramMap` para reaccionar. Pregunta clásica de entrevista.

### 4.2 Query params (`?page=2&sort=asc`) — opcionales
```typescript
this.route.queryParamMap.subscribe(params => {
  const page = params.get('page');
});
// snapshot: this.route.snapshot.queryParamMap.get('page')
```
Los query params **no** se declaran en la ruta; van tras `?` y sirven para filtros, paginación, etc.

### 4.3 Fragment (`#seccion`)
```typescript
this.route.fragment.subscribe(f => { /* scroll a #f */ });
```
```html
<a [routerLink]="['/docs']" fragment="instalacion">Instalación</a>
```

### 4.4 Route params vs query params

| | Route param `:id` | Query param `?x=` |
|---|---|---|
| En la URL | `/productos/42` | `/productos?page=2` |
| Se declara en la ruta | Sí (`:id`) | No |
| Obligatorio | Sí | No (opcional) |
| Uso típico | Identificar un recurso | Filtros, orden, paginación |

---

## 5. Lazy Loading (carga diferida) 🔑

En vez de cargar todo el JS al inicio, se cargan módulos/componentes **cuando se visitan**. Mejora el tiempo de carga inicial (Sesión 16 lo amplía).

```typescript
// Standalone (moderno) — carga un componente
{
  path: 'admin',
  loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent),
}

// Standalone — carga un conjunto de rutas
{
  path: 'admin',
  loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
}

// Clásico con módulos
{
  path: 'admin',
  loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule),
}
```
El `import()` dinámico crea un **chunk** separado que se descarga solo al entrar en `/admin`.

---

## 6. Guards y Resolvers (intro)

### 6.1 Guards — proteger rutas
Deciden si se puede entrar/salir de una ruta (login, permisos). Se ven a fondo en **Sesión 17**. Forma funcional moderna:
```typescript
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.estaLogueado() ? true : router.createUrlTree(['/login']);
};

// en la ruta:
{ path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] }
```

### 6.2 Resolvers — precargar datos antes de entrar
Un **resolver** obtiene datos **antes** de activar la ruta, para que el componente ya los tenga al renderizar (evita el "flash" de pantalla vacía).

```typescript
export const productoResolver: ResolveFn<Producto> = (route) => {
  const service = inject(ProductoService);
  return service.obtener(route.paramMap.get('id')!);
};

// ruta:
{
  path: 'productos/:id',
  component: ProductoDetalleComponent,
  resolve: { producto: productoResolver },
}
```
```typescript
// en el componente, el dato ya viene resuelto:
ngOnInit() {
  this.producto = this.route.snapshot.data['producto'];
}
```

> Trade-off: el resolver **retrasa** la navegación hasta tener los datos. Bien para datos críticos; mal si tarda mucho (mejor mostrar un loader dentro del componente).

---

## 7. `Router` vs `ActivatedRoute`

| | `Router` | `ActivatedRoute` |
|---|---|---|
| Para qué | **Navegar** (cambiar de ruta) | **Leer** info de la ruta actual |
| Métodos/props | `navigate()`, `navigateByUrl()`, `events` | `paramMap`, `queryParamMap`, `data`, `snapshot`, `fragment` |

```typescript
constructor(
  private router: Router,          // para navegar
  private route: ActivatedRoute,   // para leer params de la ruta actual
) {}
```

### 7.1 Router events
El `Router` emite eventos del ciclo de navegación (útil para un loader global):
```typescript
this.router.events.subscribe(event => {
  if (event instanceof NavigationStart) { /* mostrar loader */ }
  if (event instanceof NavigationEnd)   { /* ocultar loader */ }
});
```
Eventos: `NavigationStart`, `NavigationEnd`, `NavigationCancel`, `NavigationError`.

---

## 8. Preguntas de entrevista

1. ¿Cómo funciona el router en una SPA?
2. ¿Diferencia entre `routerLink` y `href`? ¿Por qué importa?
3. ¿Diferencia entre `Router` y `ActivatedRoute`?
4. ¿`snapshot` vs `paramMap` observable? ¿Cuándo falla el snapshot?
5. ¿Diferencia entre route params y query params?
6. ¿Qué es el lazy loading y cómo se configura?
7. ¿Qué es un resolver y qué trade-off tiene?
8. ¿Cómo defines una ruta 404 (wildcard) y una redirección?
9. ¿Qué es `<router-outlet>` y cómo funcionan las rutas hijas?
10. ¿Para qué sirven los router events?

<details>
<summary>Respuestas resumidas</summary>

1. Mapea URLs a componentes y los renderiza en `<router-outlet>` sin recargar la página.
2. `routerLink` navega dentro del SPA (sin recarga); `href` recarga toda la página.
3. `Router` navega; `ActivatedRoute` lee params/data de la ruta actual.
4. `snapshot` lee una vez; falla al navegar entre `/x/1`→`/x/2` porque el componente se reutiliza. El observable reacciona.
5. Route param (`:id`) identifica un recurso y va en la ruta; query param (`?x=`) es opcional, para filtros/paginación.
6. Cargar módulos/componentes al visitarlos con `loadChildren`/`loadComponent` e `import()` dinámico → chunk separado.
7. Precarga datos antes de activar la ruta; trade-off: retrasa la navegación hasta tenerlos.
8. `{ path: '**', component: NotFound }` al final; redirect con `{ path:'', redirectTo:'x', pathMatch:'full' }`.
9. El punto donde se renderiza la ruta activa; las rutas hijas usan un `<router-outlet>` anidado en su layout.
10. Reaccionar al ciclo de navegación (loaders, analytics): NavigationStart/End/Cancel/Error.

</details>

---

## ✅ Checklist para pasar a la Sesión 11

- [ ] Sé configurar rutas, `router-outlet`, redirects y wildcard.
- [ ] Domino `routerLink`, `routerLinkActive` y navegación con `Router`.
- [ ] Entiendo rutas hijas y outlets anidados.
- [ ] Distingo route params vs query params y leo ambos con `ActivatedRoute`.
- [ ] Explico snapshot vs observable y cuándo falla el snapshot.
- [ ] Configuro lazy loading con `loadComponent`/`loadChildren`.
- [ ] Sé qué es un resolver y su trade-off.

Cuando lo tengas, dime **"siguiente"** y armo la **Sesión 11 — Formularios** (Template Driven vs Reactive, `FormControl/FormGroup/FormArray`, validadores síncronos/async y dinámicos).

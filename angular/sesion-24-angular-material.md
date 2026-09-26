# Sesión 24 — Angular Material

> **Objetivo**: conocer Angular Material, la librería oficial de componentes UI basada en Material Design: instalación, theming (incluido custom theme), los componentes más usados, y su relación con el **CDK** (que se ve a fondo en la Sesión 25). No hay que memorizar cada componente, sino saber cómo se estructura y personaliza.

> Requisito: componentes/módulos (S3, S15). El CDK se profundiza en la Sesión 25.

---

## 0. ¿Qué es Angular Material?

**Angular Material** es la implementación oficial de **Material Design** (el sistema de diseño de Google) como componentes Angular listos para usar: botones, inputs, tablas, diálogos, menús, etc. Construido sobre el **CDK** (Component Dev Kit), que provee los comportamientos base (overlay, accesibilidad, scrolling…).

```
Material Design (guía visual de Google)
        ↓
Angular Material (componentes: mat-button, mat-table…)
        ↓
CDK (comportamientos base: overlay, a11y, drag-drop…)   ← Sesión 25
```

---

## 1. Instalación

```bash
ng add @angular/material
```
Este comando (no `npm install` a secas): instala los paquetes, configura un **tema** predefinido, añade tipografía Roboto y los iconos, y ajusta `angular.json`/`styles`. Usar `ng add` es la forma correcta porque ejecuta un **schematic** que hace toda la configuración.

---

## 2. Usar un componente

Con standalone, se importa el módulo/componente del control que uses:
```typescript
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';

@Component({
  imports: [MatButtonModule, MatInputModule],
  template: `
    <button mat-raised-button color="primary">Guardar</button>
    <mat-form-field>
      <mat-label>Nombre</mat-label>
      <input matInput [(ngModel)]="nombre">
    </mat-form-field>
  `,
})
```
> Cada componente vive en su propio paquete (`@angular/material/button`, `/input`…) → solo importas lo que usas (tree shaking, Sesión 20).

---

## 3. Theming 🔑

Material usa un **sistema de temas** basado en paletas de colores. Un tema define tres paletas y modo claro/oscuro.

### 3.1 Las paletas
| Paleta | Uso |
|---|---|
| **primary** | Color principal de la marca (barras, botones destacados) |
| **accent** | Color secundario/destacado (FAB, elementos activos) |
| **warn** | Errores/peligro (rojo típicamente) |

### 3.2 Custom theme (Angular Material 3, con Sass)
```scss
@use '@angular/material' as mat;

$mi-theme: mat.define-theme((
  color: (
    theme-type: light,
    primary: mat.$azure-palette,
    tertiary: mat.$blue-palette,
  ),
));

html {
  @include mat.all-component-themes($mi-theme);
}
```
> En versiones anteriores (M2) se usaban `define-palette` / `define-light-theme`. La API cambia entre versiones mayores; en entrevista basta entender el **concepto**: defines paletas primary/accent/warn y modo claro/oscuro, y Material tiñe todos los componentes.

### 3.3 Dark mode
Se define un tema oscuro (`theme-type: dark`) y se aplica bajo una clase/media query. Los componentes se adaptan automáticamente.

---

## 4. Componentes más usados

No hay que memorizarlos; reconoce las familias:

**Formularios**: `mat-form-field`, `matInput`, `mat-select`, `mat-checkbox`, `mat-radio`, `mat-slide-toggle`, `mat-datepicker`, `mat-autocomplete`, `mat-slider`.

**Botones/indicadores**: `mat-button`, `mat-raised-button`, `mat-icon-button`, `mat-fab`, `mat-icon`, `mat-progress-spinner`, `mat-progress-bar`, `mat-badge`, `mat-chips`.

**Navegación**: `mat-toolbar`, `mat-sidenav`, `mat-menu`, `mat-tabs`, `mat-stepper`, `mat-expansion-panel`.

**Layout/datos**: `mat-card`, `mat-list`, `mat-grid-list`, `mat-divider`, `mat-tree`.

**Overlays** (usan el CDK Overlay por debajo): `MatDialog`, `MatSnackBar`, `MatBottomSheet`, `matTooltip`, `mat-menu`.

---

## 5. `MatTable` (tabla con Paginator y Sort) 🔑

La tabla es el componente estrella en apps de negocio. Combina `MatTableModule`, `MatPaginator` y `MatSort`:

```typescript
displayedColumns = ['nombre', 'precio', 'acciones'];
dataSource = new MatTableDataSource<Producto>(this.productos);

@ViewChild(MatPaginator) paginator!: MatPaginator;   // Sesión 7
@ViewChild(MatSort) sort!: MatSort;

ngAfterViewInit() {
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
}
```
```html
<table mat-table [dataSource]="dataSource" matSort>
  <ng-container matColumnDef="nombre">
    <th mat-header-cell *matHeaderCellDef mat-sort-header>Nombre</th>
    <td mat-cell *matCellDef="let p">{{ p.nombre }}</td>
  </ng-container>
  <!-- más columnas… -->
  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
  <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
</table>
<mat-paginator [pageSizeOptions]="[5, 10, 20]"></mat-paginator>
```
> `MatTableDataSource` maneja paginación, orden y filtrado en cliente. Para grandes volúmenes o servidor, se implementa un `DataSource` personalizado (streams del CDK).

---

## 6. Servicios de overlay: Dialog y SnackBar

Se abren **imperativamente** desde el TS (no con etiquetas), inyectando el servicio:

```typescript
// Dialog
constructor(private dialog: MatDialog) {}
abrir() {
  const ref = this.dialog.open(ConfirmarComponent, { data: { mensaje: '¿Eliminar?' } });
  ref.afterClosed().subscribe(result => { /* respuesta del diálogo */ });
}

// SnackBar (toast)
constructor(private snack: MatSnackBar) {}
avisar() { this.snack.open('Guardado', 'OK', { duration: 3000 }); }
```
Ambos usan el **CDK Overlay** por debajo (Sesión 25).

---

## 7. Accesibilidad y ventajas

Angular Material trae **accesibilidad (a11y)** de fábrica: roles ARIA, navegación por teclado, focus management (vía CDK a11y). Es una de sus mayores ventajas frente a maquetar componentes a mano.

| Ventajas | Consideraciones |
|---|---|
| Componentes probados y accesibles | Peso del bundle (importar solo lo usado) |
| Theming consistente | "Look" muy Material (personalizar cuesta) |
| Mantenido por el equipo Angular | Menos flexible que Tailwind/CSS puro para diseños muy custom |
| Integra con el CDK | API cambia entre versiones mayores |

Alternativas: PrimeNG, Nebular, Ng-Zorro (Ant Design), o headless (CDK + tu propio CSS / Tailwind).

---

## 8. Preguntas de entrevista

1. ¿Qué es Angular Material y sobre qué está construido?
2. ¿Por qué se instala con `ng add` y no con `npm install`?
3. ¿Qué son las paletas primary/accent/warn?
4. ¿Cómo implementas un custom theme y dark mode?
5. ¿Cómo se importan los componentes y qué ventaja tiene?
6. ¿Cómo combinas `MatTable` con paginación y orden?
7. ¿Cómo abres un diálogo y recibes su resultado?
8. ¿Qué relación hay entre Material y el CDK?
9. ¿Qué aporta Material en accesibilidad?
10. ¿Cuándo elegirías Material vs otra librería?

<details>
<summary>Respuestas resumidas</summary>

1. Librería oficial de componentes UI (Material Design) construida sobre el CDK.
2. `ng add` ejecuta un schematic que instala, configura tema, tipografía e iconos automáticamente.
3. Las tres paletas de un tema: principal, secundaria/destacada y errores.
4. Definiendo paletas y `theme-type` con Sass (`define-theme`), y un tema dark aplicado por clase/media query.
5. Importando el módulo de cada componente por separado; solo entra en el bundle lo que usas.
6. Con `MatTableDataSource`, asignándole `paginator` y `sort` (obtenidos con `@ViewChild`) en `ngAfterViewInit`.
7. `dialog.open(Componente, { data })` y `afterClosed().subscribe(...)`.
8. Material usa el CDK para comportamientos base (overlay, a11y, scrolling, drag-drop).
9. Roles ARIA, navegación por teclado y focus management de fábrica.
10. Material si quieres consistencia/a11y rápida y estás cómodo con el look Material; otras (PrimeNG, headless+Tailwind) para más flexibilidad de diseño.

</details>

---

## ✅ Checklist para pasar a la Sesión 25

- [ ] Sé qué es Material y su relación con el CDK.
- [ ] Instalo con `ng add` y entiendo por qué.
- [ ] Comprendo el theming (paletas, custom theme, dark mode).
- [ ] Sé importar componentes y montar una `MatTable` con paginator/sort.
- [ ] Abro dialogs/snackbars desde el TS.
- [ ] Conozco las ventajas (a11y) y alternativas.

Cuando lo tengas, dime **"siguiente"**. La **Sesión 25 — CDK** ya está creada.

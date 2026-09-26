# Sesión 2 — TypeScript aplicado a Angular

> **Objetivo**: dominar el TypeScript que *realmente* usas en Angular todos los días. No es un curso de TS completo: es el subconjunto que aparece en componentes, servicios, modelos y templates. Al terminar deberías leer cualquier archivo `.ts` de Angular sin dudar.

> Requisito: haber hecho la [Sesión 1](sesion-01-fundamentos.md).

---

## 0. ¿Por qué TypeScript en Angular?

Angular **está escrito en TypeScript** y te obliga a usarlo. TS = JavaScript + **tipos** + características modernas. El navegador no lo entiende → se **transpila** a JS (ver Sesión 1).

Lo que ganas: errores en **tiempo de compilación** (no en producción), autocompletado, refactors seguros y contratos claros entre capas (componente ↔ servicio ↔ API).

---

## 1. Tipos básicos

```typescript
let nombre: string = 'Ada';
let edad: number = 30;
let activo: boolean = true;
let cualquiera: any = 'evítalo';       // ❌ apaga el tipado, úsalo lo mínimo
let desconocido: unknown = getData();  // ✅ como any pero seguro: obliga a comprobar
let nada: null = null;
let indefinido: undefined = undefined;

let ids: number[] = [1, 2, 3];         // array de números
let nombres: Array<string> = ['a','b'];// forma genérica equivalente

let tupla: [string, number] = ['edad', 30]; // posición y tipo fijos
```

### `any` vs `unknown` (aparece en entrevistas)
- **`any`**: desactiva el chequeo de tipos. Contagia y esconde bugs. Evítalo.
- **`unknown`**: "no sé qué es todavía", pero TS te **obliga a validar** antes de usarlo. Es la opción segura.

```typescript
function procesar(x: unknown) {
  // x.toUpperCase();          // ❌ error: hay que estrechar el tipo primero
  if (typeof x === 'string') {
    x.toUpperCase();           // ✅ aquí TS ya sabe que es string
  }
}
```

---

## 2. Interfaces

Definen la **forma** de un objeto (un contrato de tipos). Es lo que más usarás para modelar datos que vienen de una API.

```typescript
interface Usuario {
  id: number;
  nombre: string;
  email: string;
  telefono?: string;      // opcional (puede no venir)
  readonly creado: Date;  // solo lectura: no se puede reasignar
}

const u: Usuario = {
  id: 1,
  nombre: 'Ada',
  email: 'ada@mail.com',
  creado: new Date(),
};

u.nombre = 'Ada L.';   // ✅
// u.creado = new Date(); // ❌ readonly
```

Las interfaces se pueden **extender**:

```typescript
interface Persona { nombre: string; }
interface Empleado extends Persona { salario: number; }
```

### Interface vs Type alias
Ambos sirven para tipar. Regla práctica en Angular:
- **`interface`** → para la forma de objetos/modelos (extensible, mensajes de error claros).
- **`type`** → para uniones, intersecciones, tipos primitivos o combinaciones.

```typescript
type ID = string | number;                 // unión
type Estado = 'activo' | 'inactivo';       // union de literales (muy útil)
type UsuarioConRol = Usuario & { rol: string }; // intersección
```

---

## 3. Classes

En Angular, **componentes y servicios son clases** decoradas. Dominar clases es dominar Angular.

```typescript
class Cuenta {
  saldo: number;

  constructor(saldoInicial: number) {
    this.saldo = saldoInicial;
  }

  depositar(monto: number): void {
    this.saldo += monto;
  }
}

const c = new Cuenta(100);
c.depositar(50);   // saldo = 150
```

### 3.1 Modificadores de acceso

| Modificador | Alcance |
|---|---|
| `public` (por defecto) | Accesible desde cualquier lado |
| `private` | Solo dentro de la clase |
| `protected` | Dentro de la clase y sus subclases |
| `readonly` | Se asigna una vez (constructor) y no se cambia |

```typescript
class Persona {
  public nombre: string;
  private password: string;
  protected id: number;
  readonly pais = 'CL';

  constructor(nombre: string, password: string, id: number) {
    this.nombre = nombre;
    this.password = password;
    this.id = id;
  }
}
```

### 3.2 Atajo del constructor (parameter properties)
TypeScript permite declarar y asignar propiedades en el propio constructor. **Angular usa esto constantemente**, sobre todo para inyectar servicios:

```typescript
// forma larga
class Componente {
  private servicio: DataService;
  constructor(servicio: DataService) {
    this.servicio = servicio;
  }
}

// forma corta equivalente (la que verás siempre)
class Componente {
  constructor(private servicio: DataService) {}
  // 'private servicio' ya crea this.servicio y lo asigna
}
```

> 🔑 Este patrón es la base de la **Inyección de Dependencias** de Angular (Sesión 9). Cuando ves `constructor(private http: HttpClient)`, Angular *inyecta* ese servicio automáticamente.

---

## 4. Enums

Conjunto de constantes con nombre. Útiles para estados, roles, tipos.

```typescript
enum Rol {
  Admin,      // 0
  Editor,     // 1
  Lector,     // 2
}

let r: Rol = Rol.Admin;

// Enum de strings (más legible en logs y APIs):
enum Estado {
  Activo = 'ACTIVO',
  Inactivo = 'INACTIVO',
}
```

> Alternativa moderna y ligera: **union de literales** (`type Estado = 'ACTIVO' | 'INACTIVO'`). No genera código extra y es muy común. Menciónalo en entrevista como opción "tree-shakeable".

---

## 5. Generics (genéricos)

Permiten escribir código **reutilizable que preserva el tipo**. Es lo que diferencia un tipado pobre de uno bueno.

```typescript
// sin genéricos: pierdes el tipo
function primeroAny(arr: any[]): any { return arr[0]; }

// con genéricos: <T> es un "tipo variable"
function primero<T>(arr: T[]): T {
  return arr[0];
}

const n = primero([1, 2, 3]);       // n es number
const s = primero(['a', 'b']);      // s es string
```

Dónde los ves en Angular todo el tiempo:

```typescript
this.http.get<Usuario[]>('/api/usuarios');  // devuelve Observable<Usuario[]>
const control = new FormControl<string>(''); // Typed Forms (Sesión 11)
@Input() datos!: Producto[];
```

Interface genérica típica para respuestas de API:

```typescript
interface ApiResponse<T> {
  data: T;
  total: number;
  ok: boolean;
}

const resp: ApiResponse<Usuario[]> = { data: [], total: 0, ok: true };
```

---

## 6. Decorators (decoradores)

Un **decorador** es una función que se aplica con `@` sobre clases, propiedades, métodos o parámetros para **añadirles metadatos/comportamiento**. Angular está *construido* sobre decoradores.

```typescript
@Component({ selector: 'app-x', template: '...' })  // decorador de clase
export class XComponent {
  @Input() titulo!: string;      // decorador de propiedad
  @Output() click = new EventEmitter();
  @ViewChild('ref') ref!: ElementRef;

  constructor(@Inject(TOKEN) private dep: any) {}  // decorador de parámetro
}
```

Decoradores clave que verás (cada uno en su sesión):

| Decorador | Para qué |
|---|---|
| `@Component` | Declara un componente |
| `@NgModule` | Declara un módulo |
| `@Injectable` | Declara un servicio inyectable |
| `@Input` / `@Output` | Comunicación entre componentes (Sesión 7) |
| `@ViewChild` / `@ContentChild` | Acceder a elementos/hijos |
| `@Directive` / `@Pipe` | Directivas y pipes |
| `@HostListener` / `@HostBinding` | Eventos y props del host |

> No necesitas *escribir* decoradores propios al inicio; sí entender que **añaden metadatos** que Angular lee para saber qué hacer con tu clase.

---

## 7. Sintaxis moderna imprescindible

Estas características de JS/TS aparecen en cada archivo de Angular.

### 7.1 Arrow functions `=>`

Funciones más cortas que **no crean su propio `this`** (heredan el del contexto). Clave en RxJS y callbacks.

```typescript
const doble = (x: number): number => x * 2;

this.http.get('/api').subscribe(data => this.datos = data);
//                              ^ arrow: 'this' sigue siendo el del componente
```

### 7.2 Optional chaining `?.`

Accede a propiedades anidadas **sin romper** si algo es `null`/`undefined`.

```typescript
const ciudad = usuario?.direccion?.ciudad;  // undefined si algo falta, no error
```

En templates de Angular es habitual:
```html
{{ usuario?.nombre }}
```

### 7.3 Nullish coalescing `??`

Devuelve el lado derecho **solo si** el izquierdo es `null` o `undefined` (no si es `0`, `''` o `false`).

```typescript
const nombre = input ?? 'Anónimo';

let x = 0;
x || 100;   // 100  ❌ (0 es "falsy")
x ?? 100;   // 0    ✅ (0 no es null/undefined)
```

### 7.4 Destructuring

Extraer propiedades/elementos en variables.

```typescript
const usuario = { nombre: 'Ada', edad: 30 };
const { nombre, edad } = usuario;      // nombre='Ada', edad=30

const [primero, segundo] = [10, 20];   // primero=10, segundo=20

// renombrar y valor por defecto
const { nombre: n, rol = 'lector' } = usuario;
```

### 7.5 Spread / Rest `...`

```typescript
// spread: expandir (copiar/combinar sin mutar)
const arr = [1, 2, 3];
const copia = [...arr, 4];              // [1,2,3,4]

const u1 = { nombre: 'Ada' };
const u2 = { ...u1, edad: 30 };         // { nombre:'Ada', edad:30 }

// rest: agrupar el resto
function sumar(...nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}
sumar(1, 2, 3);   // 6
```

> 🔑 **Inmutabilidad**: usar spread para crear copias en vez de mutar es *fundamental* para el rendimiento con `ChangeDetectionStrategy.OnPush` (Sesión 14) y para NgRx (Sesión 23).

---

## 8. Utilidades de tipos que verás en Angular

TypeScript trae *utility types* muy usados:

```typescript
Partial<Usuario>    // todas las props opcionales (ideal para updates)
Required<Usuario>   // todas obligatorias
Readonly<Usuario>   // todas readonly
Pick<Usuario, 'id' | 'nombre'>   // solo esas props
Omit<Usuario, 'password'>        // todas menos esa
Record<string, number>           // objeto {clave: número}
```

Ejemplo real (actualizar parcialmente un usuario):
```typescript
actualizar(id: number, cambios: Partial<Usuario>) { /* ... */ }
actualizar(1, { email: 'nuevo@mail.com' });   // ✅ no exige todos los campos
```

---

## 9. Non-null assertion `!` y `?` — no confundir

```typescript
@Input() titulo!: string;   // '!' = "confía en mí, se asignará" (definite assignment)
telefono?: string;          // '?' = propiedad opcional (puede no existir)
const el = ref!.nativeElement;  // '!' = "esto no es null aquí"
```

En Angular verás `!` mucho en `@Input()` y `@ViewChild()` porque Angular las asigna *después* del constructor, y con `strictPropertyInitialization` activo TS se quejaría.

---

## 10. Preguntas de entrevista

1. ¿Diferencia entre `interface` y `type`? ¿Cuándo usas cada uno?
2. ¿`any` vs `unknown`? ¿Por qué evitar `any`?
3. ¿Qué son los parameter properties del constructor y por qué Angular los usa?
4. ¿Para qué sirven los genéricos? Da un ejemplo en Angular.
5. ¿Qué es un decorador? Nombra tres de Angular.
6. ¿Diferencia entre `||` y `??`?
7. ¿Qué hace `?.` y dónde lo usarías en un template?
8. ¿Por qué el spread ayuda con OnPush / inmutabilidad?
9. ¿Qué significa `@Input() nombre!: string`? ¿Y `telefono?: string`?
10. ¿Diferencia entre `private`, `protected` y `readonly`?

<details>
<summary>Respuestas resumidas</summary>

1. `interface` para formas de objetos (extensible); `type` para uniones/intersecciones/primitivos.
2. `any` apaga el tipado (peligroso); `unknown` obliga a validar antes de usar. Evita `any` porque esconde bugs.
3. Declarar+asignar props en el constructor (`constructor(private x: Svc){}`). Angular los usa para inyectar dependencias.
4. Reutilizar código preservando tipos. Ej: `http.get<Usuario[]>()`.
5. Función con `@` que añade metadatos/comportamiento. Ej: `@Component`, `@Injectable`, `@Input`.
6. `||` devuelve el derecho con cualquier "falsy" (0, '', false); `??` solo con `null`/`undefined`.
7. Accede a props anidadas sin romper si hay null. En template: `{{ user?.nombre }}`.
8. Spread crea copias nuevas (nueva referencia); OnPush detecta cambios por referencia.
9. `!` = se asignará (confía); `?` = propiedad opcional que puede no existir.
10. `private` solo la clase; `protected` clase + subclases; `readonly` asignable una vez.

</details>

---

## ✅ Checklist para pasar a la Sesión 3

- [ ] Distingo tipos básicos, `any` vs `unknown`.
- [ ] Modelo datos con `interface` y sé cuándo usar `type`.
- [ ] Entiendo clases, modificadores de acceso y los parameter properties del constructor.
- [ ] Sé qué son enums y la alternativa con union de literales.
- [ ] Entiendo genéricos y los reconozco en `http.get<T>()`.
- [ ] Sé qué es un decorador y para qué sirve en Angular.
- [ ] Domino `=>`, `?.`, `??`, destructuring y spread/rest.

Cuando lo tengas, avísame y armo la **Sesión 3 — Componentes y ciclo de vida** (aquí empieza lo bueno de Angular de verdad).

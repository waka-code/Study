# Sesión 21 — Testing

> **Objetivo**: saber probar aplicaciones Angular: el stack (Jasmine/Karma, y Jest en proyectos modernos), `TestBed`, testear componentes y servicios, mockear dependencias, `HttpTestingController`, spies (`spyOn`), y utilidades async (`fakeAsync`/`tick`). El testing es lo que distingue código mantenible de frágil.

> Requisito: haber visto componentes (S3), servicios/DI (S8-9) y HTTP (S12).

---

## 0. El stack de testing

| Herramienta | Rol |
|---|---|
| **Jasmine** | Framework de aserciones (`describe`, `it`, `expect`) — el default |
| **Karma** | Test runner que corre los tests en un navegador real — el default clásico |
| **TestBed** | Utilidad de Angular para crear un módulo de pruebas y compilar componentes |
| **Jest** | Alternativa moderna a Jasmine+Karma (más rápido, corre en Node con jsdom) |
| **Cypress / Playwright** | Tests **end-to-end** (E2E), la app real en un navegador |

> Angular trae Jasmine+Karma por defecto. Muchos equipos migran a **Jest** por velocidad. En entrevista: menciona ambos y que la API de Jasmine y Jest es muy parecida (`describe/it/expect`).

Tipos de test:
- **Unit**: una clase/pieza aislada (un servicio, un pipe).
- **Integration**: un componente con su template y dependencias mockeadas.
- **E2E**: flujos completos en la app real (Cypress/Playwright).

---

## 1. Anatomía de un test (Jasmine)

```typescript
describe('Calculadora', () => {          // agrupa tests
  let calc: Calculadora;

  beforeEach(() => {                     // corre antes de CADA it
    calc = new Calculadora();
  });

  it('debería sumar dos números', () => {   // un caso
    // Arrange / Act / Assert
    const resultado = calc.sumar(2, 3);
    expect(resultado).toBe(5);
  });
});
```
Matchers comunes: `toBe` (===), `toEqual` (valor/estructura), `toContain`, `toBeTruthy`, `toHaveBeenCalled`, `toThrow`.

---

## 2. Testear un servicio (unit)

Los servicios sin dependencias son los más fáciles (lógica pura):

```typescript
describe('CalculadoraService', () => {
  let service: CalculadoraService;

  beforeEach(() => {
    TestBed.configureTestingModule({});         // módulo de pruebas
    service = TestBed.inject(CalculadoraService);
  });

  it('suma', () => {
    expect(service.sumar(2, 2)).toBe(4);
  });
});
```
`TestBed.inject()` respeta la DI (Sesión 9): resuelve el servicio con sus providers.

---

## 3. `HttpTestingController` — testear HTTP 🔑

Para servicios que usan `HttpClient`, se **mockea** el backend con `HttpTestingController`: verificas qué petición se hizo y controlas la respuesta, sin red real.

```typescript
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

describe('ProductoService', () => {
  let service: ProductoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());   // asegura que no queden peticiones pendientes

  it('obtiene productos', () => {
    const mock = [{ id: 1, nombre: 'Teclado' }];

    service.obtenerTodos().subscribe(productos => {
      expect(productos).toEqual(mock);          // 3. valida la respuesta
    });

    const req = httpMock.expectOne('/api/productos');  // 1. espera la petición
    expect(req.request.method).toBe('GET');
    req.flush(mock);                                    // 2. responde con el mock
  });

  it('maneja error 500', () => {
    service.obtenerTodos().subscribe({
      error: err => expect(err.status).toBe(500),
    });
    httpMock.expectOne('/api/productos').flush(null, { status: 500, statusText: 'Error' });
  });
});
```
Flujo: `expectOne` (interceptar) → `flush` (responder) → el subscribe recibe → `verify` (nada pendiente).

---

## 4. Testear un componente (integration)

`TestBed` compila el componente con su template. Se usa un `ComponentFixture`:

```typescript
describe('ContadorComponent', () => {
  let fixture: ComponentFixture<ContadorComponent>;
  let component: ContadorComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ContadorComponent],   // standalone: se importa; clásico: declarations
    });
    fixture = TestBed.createComponent(ContadorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();          // dispara ngOnInit + primer render
  });

  it('se crea', () => {
    expect(component).toBeTruthy();
  });

  it('incrementa al hacer click', () => {
    const boton = fixture.nativeElement.querySelector('button');
    boton.click();
    fixture.detectChanges();          // refleja el cambio en el DOM

    const texto = fixture.nativeElement.querySelector('p').textContent;
    expect(texto).toContain('1');
    expect(component.contador).toBe(1);
  });
});
```

- **`fixture`**: envuelve el componente + su DOM.
- **`fixture.detectChanges()`**: dispara la detección de cambios (Sesión 14) manualmente — en tests **tú controlas** cuándo. Sin llamarlo, la vista no se actualiza.
- **`fixture.nativeElement`** / **`fixture.debugElement`**: acceso al DOM renderizado.

---

## 5. Mocks, stubs y spies

### 5.1 `spyOn` — espiar/simular métodos
```typescript
it('llama al servicio al iniciar', () => {
  const service = TestBed.inject(ProductoService);
  const spy = spyOn(service, 'obtenerTodos').and.returnValue(of([]));  // simula retorno

  component.ngOnInit();

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledTimes(1);
});
```
`.and.returnValue()`, `.and.callThrough()`, `.and.callFake()`, `.and.throwError()`.

### 5.2 Servicio mock por provider
Sustituir una dependencia real por un doble (Sesión 9, `useValue`/`useClass`):
```typescript
const productoServiceMock = {
  obtenerTodos: () => of([{ id: 1, nombre: 'Mock' }]),
};

TestBed.configureTestingModule({
  imports: [ListaComponent],
  providers: [{ provide: ProductoService, useValue: productoServiceMock }],
});
```
> Testear el componente **aislado** de servicios reales (sin HTTP real) = tests rápidos y deterministas.

### 5.3 `jasmine.createSpyObj`
Crea un mock con métodos espiados de golpe:
```typescript
const spy = jasmine.createSpyObj('ProductoService', ['obtenerTodos', 'crear']);
spy.obtenerTodos.and.returnValue(of([]));
```

---

## 6. Testing asíncrono 🔑

El código async (Observables, promesas, timers) requiere utilidades especiales.

### 6.1 `fakeAsync` + `tick`
Controla el tiempo virtualmente: `tick(ms)` avanza timers/debounce sin esperar real.
```typescript
it('busca tras debounce', fakeAsync(() => {
  component.buscar('teclado');
  tick(300);                       // avanza el debounceTime(300)
  expect(component.resultados.length).toBeGreaterThan(0);
}));
```
`flush()` ejecuta todos los timers pendientes. Ideal para `debounceTime`, `setTimeout`.

### 6.2 `waitForAsync` / `whenStable`
Para promesas y compilación async:
```typescript
it('carga datos', waitForAsync(() => {
  fixture.detectChanges();
  fixture.whenStable().then(() => {
    expect(component.datos).toBeDefined();
  });
}));
```

### 6.3 Observables síncronos con `of`
Si el mock devuelve `of(...)` (síncrono), muchas veces no necesitas `fakeAsync`: el valor llega de inmediato.

---

## 7. Testear pipes y directivas

```typescript
// pipe: puro TypeScript, sin TestBed
it('trunca', () => {
  const pipe = new TruncarPipe();
  expect(pipe.transform('texto largo', 5)).toBe('texto…');
});
```
Las directivas se testean con un **componente host** de prueba que las use en su template.

---

## 8. Buenas prácticas

- **Arrange-Act-Assert**: estructura clara por test.
- Un test = un comportamiento; nombres descriptivos (`debería …`).
- **Aísla**: mockea dependencias externas (HTTP, servicios) → tests rápidos y deterministas.
- Testea **comportamiento**, no implementación (que no se rompan al refactorizar interno).
- No olvides `httpMock.verify()` y limpiar en `afterEach`.
- Cobertura: `ng test --code-coverage` genera un reporte; apunta a lo crítico, no a 100% ciego.

---

## 9. Preguntas de entrevista

1. ¿Qué stack de testing trae Angular y qué alternativas hay?
2. ¿Qué es `TestBed` y para qué sirve?
3. ¿Cómo testeas un servicio con HTTP sin hacer llamadas reales?
4. ¿Qué es un `ComponentFixture` y para qué `detectChanges()`?
5. ¿Diferencia entre `toBe` y `toEqual`?
6. ¿Cómo mockeas una dependencia de un componente?
7. ¿Qué hace `spyOn` y qué variantes tiene?
8. ¿Cómo testeas código con `debounceTime` o timers?
9. ¿Diferencia entre `fakeAsync/tick` y `waitForAsync/whenStable`?
10. ¿Unit vs integration vs E2E?

<details>
<summary>Respuestas resumidas</summary>

1. Jasmine + Karma por defecto; alternativas: Jest (unit/integration), Cypress/Playwright (E2E).
2. Utilidad de Angular que crea un módulo de pruebas y resuelve la DI/compila componentes.
3. Con `HttpTestingController`: `expectOne` intercepta y `flush` responde con un mock; `verify` al final.
4. Envuelve componente + DOM; `detectChanges()` dispara la detección de cambios para reflejar cambios en la vista.
5. `toBe` es identidad (===); `toEqual` compara valor/estructura.
6. Con un provider `{ provide: Real, useValue: mock }` en `TestBed`.
7. Espía/simula un método; variantes: returnValue, callThrough, callFake, throwError.
8. Con `fakeAsync` y `tick(ms)` para avanzar el tiempo virtual.
9. `fakeAsync/tick` controla timers síncronamente; `waitForAsync/whenStable` espera promesas/tareas async reales.
10. Unit = pieza aislada; integration = componente + template + mocks; E2E = flujo completo en la app real.

</details>

---

## ✅ Checklist para pasar a la Sesión 22

- [ ] Conozco el stack (Jasmine/Karma, Jest, E2E) y los tipos de test.
- [ ] Uso `TestBed` para servicios y componentes.
- [ ] Testeo HTTP con `HttpTestingController`.
- [ ] Entiendo `ComponentFixture` y `detectChanges`.
- [ ] Mockeo dependencias con providers y uso `spyOn`.
- [ ] Manejo async con `fakeAsync/tick` y `waitForAsync`.

Cuando lo tengas, dime **"siguiente"** y armo la **Sesión 22 — Arquitectura** (Clean/Hexagonal, feature-based, DDD, Nx/monorepo, Repository y Facade patterns, state management).

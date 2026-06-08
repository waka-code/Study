# TypeScript Senior - Parte 1: Fundamentos y Sistema de Tipos

## Fundamentos internos de TypeScript

### Qué es TypeScript realmente

TypeScript es un superset tipado de JavaScript que compila a JavaScript plano. Pero esto es solo la superficie. Internamente, TypeScript es:

**Un sistema de tipos estructurales que opera en tiempo de compilación sobre un AST (Abstract Syntax Tree) de JavaScript.**

```typescript
// TypeScript no existe en runtime
const x: string = "hello";
// Compila a: const x = "hello";
```

**Arquitectura del compilador:**

```
Source Code (.ts)
    ↓
[Scanner/Tokenizer]
    ↓
Tokens
    ↓
[Parser]
    ↓
AST (Abstract Syntax Tree)
    ↓
[Binder] - Crea símbolos (Symbols)
    ↓
[Checker] - Type Checking
    ↓
[Emitter] - Generación de código
    ↓
JavaScript (.js) + Declaration Files (.d.ts)
```

### Cómo funciona internamente

**1. Scanning (Tokenización):**
El lexer convierte el código fuente en tokens. Cada token tiene información sobre su tipo y posición.

```typescript
const x: number = 42;
// Tokens: Identifier("const"), Identifier("x"), Punctuation(":"), 
// Keyword("number"), Punctuation("="), NumericLiteral("42"), Punctuation(";")
```

**2. Parsing (Análisis sintáctico):**
Los tokens se convierten en un AST siguiendo la gramática de TypeScript.

```typescript
// AST simplificado:
{
  kind: SyntaxKind.VariableStatement,
  declarationList: {
    declarations: [{
      name: { kind: SyntaxKind.Identifier, text: "x" },
      type: { kind: SyntaxKind.NumberKeyword },
      initializer: { kind: SyntaxKind.NumericLiteral, text: "42" }
    }]
  }
}
```

**3. Binding (Creación de símbolos):**
El binder crea símbolos para cada declaración y los conecta con sus usos.

**4. Type Checking:**
El checker verifica que todos los tipos sean consistentes usando el sistema de tipos estructurales.

**5. Emitting:**
El emitter genera el JavaScript final, eliminando toda la información de tipos (type erasure).

### AST (Abstract Syntax Tree)

El AST es la representación estructurada del código:

```typescript
import * as ts from "typescript";

const sourceCode = "const x: number = 42;";
const sourceFile = ts.createSourceFile(
  "temp.ts",
  sourceCode,
  ts.ScriptTarget.Latest
);

// Recorrer el AST
function visit(node: ts.Node) {
  console.log(ts.SyntaxKind[node.kind]);
  ts.forEachChild(node, visit);
}

visit(sourceFile);
```

**Nodos importantes:**
- `SourceFile`: Raíz del AST
- `VariableStatement`: Declaración de variables
- `FunctionDeclaration`: Declaración de funciones
- `InterfaceDeclaration`: Declaración de interfaces
- `TypeAliasDeclaration`: Declaración de type aliases

### Type Checking

El type checker opera en fases:

**Fase 1: Pre-checking**
- Verifica sintaxis
- Resuelve referencias de módulos
- Carga declaration files

**Fase 2: Type Checking**
- Verifica asignaciones
- Verifica llamadas a funciones
- Verifica tipos de retorno
- Verifica acceso a propiedades

**Fase 3: Post-checking**
- Verifica exhaustiveness
- Verifica definite assignment
- Genera errores

### Type Inference

TypeScript infiere tipos cuando no se especifican explícitamente:

```typescript
// Inferencia básica
const x = 42; // Inferido como: number (literal 42)
let y = 42;   // Inferido como: number (no literal)

// Inferencia contextual
const numbers = [1, 2, 3]; // number[]
const map = numbers.map(n => n * 2); // number[] (n inferido como number)

// Inferencia de retorno
function add(a: number, b: number) {
  return a + b; // Inferido como: number
}
```

**Algoritmo de inferencia:**
1. **Best Common Type**: Encuentra el tipo más específico que todos los valores comparten
2. **Contextual Typing**: Usa el contexto esperado para inferir tipos
3. **Widening**: Convierte literales a tipos más amplios cuando es necesario

### Type Erasure

TypeScript elimina toda la información de tipos en runtime:

```typescript
interface User {
  name: string;
  age: number;
}

function processUser(user: User): string {
  return user.name;
}

// Compila a:
function processUser(user) {
  return user.name;
}
```

**Implicaciones:**
- No hay reflection de tipos en runtime
- No se pueden validar tipos en runtime con TypeScript puro
- Se necesitan librerías externas (Zod, io-ts) para validación runtime

### Structural Typing

TypeScript usa **structural typing**, no nominal typing:

```typescript
// Structural typing
interface User {
  name: string;
  age: number;
}

interface Person {
  name: string;
  age: number;
}

const user: User = { name: "John", age: 30 };
const person: Person = user; // ✅ OK - misma estructura
```

**Ventajas:**
- Más flexible para composición
- Facilita duck typing
- Menos boilerplate

### Nominal vs Structural Typing

```typescript
// Structural typing (TypeScript default)
interface Vector2D {
  x: number;
  y: number;
}

interface Point2D {
  x: number;
  y: number;
}

function addVectors(v: Vector2D): Vector2D {
  return v;
}

const point: Point2D = { x: 1, y: 2 };
addVectors(point); // ✅ OK

// Simular nominal typing con branded types
type UserId = string & { readonly __brand: unique symbol };
type ProductId = string & { readonly __brand: unique symbol };

function createUserId(id: string): UserId {
  return id as UserId;
}

const userId = createUserId("user-123");
const productId = createProductId("prod-456");

function processUser(id: UserId) {
  console.log(id);
}

processUser(userId);    // ✅ OK
processUser(productId); // ❌ Error
```

### Transpilación

TypeScript transpila a diferentes targets de JavaScript:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs"
  }
}
```

**Transformaciones comunes:**

```typescript
// Arrow functions (target: ES5)
const add = (a: number, b: number): number => a + b;
// Compila a: var add = function (a, b) { return a + b; };

// Classes (target: ES5)
class Person {
  constructor(private name: string) {}
}
// Compila a función constructora con prototype
```

### tsconfig internamente

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    },
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "incremental": true
  }
}
```

### Cómo resuelve módulos

**Algoritmo de resolución:**

1. **Relative imports**: Resuelto relativo al archivo actual
2. **Non-relative imports**: 
   - Busca en `node_modules`
   - Busca en `node_modules/@types`
   - Usa `package.json` → `"types"` o `"typings"`
   - Busca `index.d.ts` o `index.ts`

### Declaration files (.d.ts)

Los declaration files contienen solo información de tipos:

```typescript
// user.d.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

export function getUser(id: string): Promise<User>;
```

### DefinitelyTyped

DefinitelyTyped es el repositorio de tipos para librerías JavaScript:

```bash
npm install --save-dev @types/node
npm install --save-dev @types/express
```

### Incremental compilation

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  }
}
```

**Qué cachea:**
- AST de cada archivo
- Símbolos
- Información de tipos
- Timestamps de archivos

### Compiler API

```typescript
import * as ts from "typescript";

const sourceCode = "const x: number = 42;";
const sourceFile = ts.createSourceFile(
  "temp.ts",
  sourceCode,
  ts.ScriptTarget.Latest,
  true
);

// Type checking
const program = ts.createProgram(["temp.ts"], {});
const diagnostics = ts.getPreEmitDiagnostics(program);
```

**Casos de uso:**
- Custom linters
- Code transformation tools
- Documentation generators
- Static analysis tools

### Language Service

El Language Service powers IDE features:

```typescript
import * as ts from "typescript";

const languageService = ts.createLanguageService(
  {
    getScriptFileNames: () => ["file.ts"],
    getScriptVersion: () => "0",
    getScriptSnapshot: (fileName) => {
      const content = "const x = 42;";
      return ts.ScriptSnapshot.fromString(content);
    },
    getCurrentDirectory: () => "/",
    getCompilationSettings: () => ({}),
    getDefaultLibFileName: () => "lib.d.ts",
    fileExists: () => true,
    readFile: () => "",
    readDirectory: () => [],
    getDirectories: () => [],
  },
  ts.createCompilerHost({})
);

// Completions
const completions = languageService.getCompletionsAtPosition("file.ts", 10, {});

// Quick info
const quickInfo = languageService.getQuickInfoAtPosition("file.ts", 10);

// Diagnostics
const diagnostics = languageService.getSemanticDiagnostics("file.ts");
```

---

## Sistema de tipos profundo

### Primitive Types

```typescript
// String
const name: string = "John";

// Number (todos los números son floating point)
const age: number = 30;
const pi: number = 3.14159;
const hex: number = 0xf00d;
const binary: number = 0b1010;
const octal: number = 0o744;

// Boolean
const isActive: boolean = true;

// BigInt
const bigNumber: bigint = 100n;

// Symbol
const sym: symbol = Symbol("unique");

// Undefined
const undef: undefined = undefined;

// Null
const nullValue: null = null;

// Never
function neverReturns(): never {
  throw new Error("Never returns");
}

// Void
function log(message: string): void {
  console.log(message);
}

// Unknown (tipo superior seguro)
const value: unknown = "could be anything";

// Any (tipo superior inseguro - EVITAR)
const anything: any = "anything goes";
```

### Literal Types

```typescript
// String literals
type Direction = "north" | "south" | "east" | "west";
const direction: Direction = "north";

// Numeric literals
type Dice = 1 | 2 | 3 | 4 | 5 | 6;
const roll: Dice = 6;

// Boolean literals
type Success = true;
type Failure = false;

// Template literal types
type Greeting = `Hello ${string}`;
const greet: Greeting = "Hello World";

// Combinación con inferencia
type EventName<T extends string> = `on${Capitalize<T>}`;
type ClickEvent = EventName<"click">; // "onClick"
```

### Union Types

```typescript
// Union básica
type ID = string | number;

function printId(id: ID) {
  if (typeof id === "string") {
    console.log(id.toUpperCase());
  } else {
    console.log(id.toFixed(2));
  }
}

// Union discriminada
type Success = {
  status: "success";
  data: string;
};

type Error = {
  status: "error";
  error: string;
};

type Result = Success | Error;

function handleResult(result: Result) {
  if (result.status === "success") {
    console.log(result.data);
  } else {
    console.log(result.error);
  }
}
```

**Reglas de union types:**
- Un valor es asignable a una union si es asignable a cualquiera de los miembros
- Las operaciones solo están permitidas en la intersección de los miembros
- Type narrowing reduce la union

### Intersection Types

```typescript
// Intersection básica
type Person = {
  name: string;
};

type Employee = {
  employeeId: string;
};

type EmployeePerson = Person & Employee;

const emp: EmployeePerson = {
  name: "John",
  employeeId: "E123"
};

// Intersection de interfaces
type HasId = { id: string };
type HasTimestamp = { createdAt: Date };
type Entity = HasId & HasTimestamp;

// Branding con intersections
type UserId = string & { readonly __brand: unique symbol };
```

**Reglas de intersection types:**
- Un valor es asignable a una intersection si es asignable a todos los miembros
- Las propiedades de los miembros se combinan
- Conflictos de tipos en propiedades causan never

### Tuple Types

```typescript
// Tuple básico
type Point = [number, number];
const point: Point = [10, 20];

// Tuple con nombres
type User = [id: number, name: string, email: string];
const user: User = [1, "John", "john@example.com"];

// Tuple con elementos opcionales
type OptionalPoint = [number, number?, number?];
const p1: OptionalPoint = [10];
const p2: OptionalPoint = [10, 20];
const p3: OptionalPoint = [10, 20, 30];

// Tuple con rest elements
type StringNumberBooleans = [string, number, ...boolean[]];
const snb: StringNumberBooleans = ["hello", 42, true, false];

// Tuple read-only
type ReadonlyPoint = readonly [number, number];
const rp: ReadonlyPoint = [10, 20];
// rp[0] = 5; // ❌ Error
```

### Enum vs const enum

**Enum regular:**

```typescript
enum Direction {
  North = "North",
  South = "South"
}

// Compila a un objeto en runtime
var Direction;
(function (Direction) {
  Direction["North"] = "North";
  Direction["South"] = "South";
})(Direction || (Direction = {}));
```

**const enum:**

```typescript
const enum Direction {
  North = "North",
  South = "South"
}

// Compila a inline literals
const d = Direction.North; // const d = "North";
```

**Best practice:**
- Usar `const enum` para valores constantes
- Considerar usar union de literal types en su lugar

### Unknown vs Any

```typescript
let anything: any = 42;
anything = "hello";
anything.methodThatDoesntExist(); // ❌ No hay error en compile-time

let value: unknown = 42;
value = "hello";
// value.methodThatDoesntExist(); // ❌ Error en compile-time

if (typeof value === "string") {
  console.log(value.toUpperCase()); // ✅ OK
}
```

**Best practice:**
- Nunca usar `any` en código production
- Usar `unknown` para valores de origen desconocido

### Never

```typescript
// Funciones que nunca retornan
function throwError(message: string): never {
  throw new Error(message);
}

// Exhaustiveness checking
type Shape = 
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.side ** 2;
    default:
      const _exhaustiveCheck: never = shape;
      return _exhaustiveCheck;
  }
}
```

### Void

```typescript
// Funciones sin retorno
function log(message: string): void {
  console.log(message);
}

// Void en callbacks
function process(callback: () => void) {
  callback();
}

process(() => {
  return "ignored"; // El retorno es ignorado
});
```

### Object

```typescript
// Object type (no es lo mismo que {})
let obj: object = { foo: "bar" };
obj = [1, 2, 3];
obj = new Date();
obj = () => {}; // Las funciones son objects
// obj = 42; // ❌ Error

// {} - tipo vacío
let empty: {} = { foo: "bar" };
empty = 42; // ✅ Sorpresivamente OK
```

### Type aliases vs Interfaces

**Type aliases:**
```typescript
type User = {
  id: string;
  name: string;
};

type ID = string | number;
type Callback = (data: string) => void;
```

**Interfaces:**
```typescript
interface User {
  id: string;
  name: string;
}

interface User {
  email: string; // Declaration merging
}
```

**Diferencias:**
- `type`: Más flexible, puede representar primitivos, unions, intersections, tuples
- `interface`: Solo para objetos, soporta declaration merging

### Optional properties

```typescript
interface User {
  id: string;
  name: string;
  age?: number;
  email?: string;
}

const user1: User = { id: "1", name: "John" };
const user2: User = { id: "2", name: "Jane", age: 30 };

// Checking optional properties
function printAge(user: User) {
  if (user.age !== undefined) {
    console.log(user.age);
  }
}
```

### Readonly

```typescript
interface User {
  readonly id: string;
  name: string;
}

const user: User = { id: "1", name: "John" };
// user.id = "2"; // ❌ Error

// Readonly type
type ReadonlyUser = Readonly<User>;

// Readonly array
const numbers: readonly number[] = [1, 2, 3];
// numbers.push(4); // ❌ Error

// as const para readonly deep
const config = {
  apiUrl: "https://api.example.com" as const,
  timeout: 5000 as const
};
```

### Exactness

```typescript
interface User {
  name: string;
  age: number;
}

// Excess property checking en object literals
const user1: User = {
  name: "John",
  age: 30,
  email: "john@example.com" // ❌ Error
};

// No excess property checking en variables
const data = {
  name: "John",
  age: 30,
  email: "john@example.com"
};
const user2: User = data; // ✅ OK

// Para forzar exactness:
type Exact<T> = T & { [K in keyof T]: T[K] };
```

### Discriminated unions

```typescript
type Success = {
  status: "success";
  data: string;
};

type Error = {
  status: "error";
  error: string;
};

type Result = Success | Error;

function handleResult(result: Result) {
  if (result.status === "success") {
    console.log(result.data);
  } else {
    console.log(result.error);
  }
}

type Shape = 
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.side ** 2;
  }
}
```

### Recursive types

```typescript
type JsonValue = 
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const data: JsonValue = {
  name: "John",
  age: 30,
  tags: ["developer", "typescript"],
  metadata: {
    active: true,
    score: 95.5
  }
};

// Linked list
type ListNode<T> = {
  value: T;
  next: ListNode<T> | null;
};

// Tree structure
type TreeNode<T> = {
  value: T;
  children: TreeNode<T>[];
};
```

### Branded types

```typescript
type UserId = string & { readonly __brand: unique symbol };
type ProductId = string & { readonly __brand: unique symbol };

function createUserId(id: string): UserId {
  return id as UserId;
}

const userId = createUserId("user-123");
const productId = createProductId("prod-456");

function processUser(id: UserId) {
  console.log(`Processing user: ${id}`);
}

processUser(userId); // ✅ OK
processUser(productId); // ❌ Error
```

### Opaque types

```typescript
type Opaque<T, P> = T & { readonly __opaque__: P };

type UserId = Opaque<string, "UserId">;

function createUserId(id: string): UserId {
  return id as UserId;
}

function getUserId(id: UserId): string {
  return id as string;
}
```

---

**Continúa en Parte 2: Type Inference + Generics + Utility Types**

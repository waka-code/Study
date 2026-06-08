# TypeScript Senior - Parte 2: Type Inference + Generics + Utility Types

## Type Inference avanzado

### Contextual typing

La contextual typing usa el contexto para inferir tipos:

```typescript
// Contextual typing en funciones
const numbers = [1, 2, 3];
const doubled = numbers.map(n => n * 2); // n inferido como number

// Sin contexto
const fn = (n) => n * 2; // n inferido como any (sin strict mode)

// Con contexto
type Mapper = (n: number) => number;
const fn2: Mapper = n => n * 2; // n inferido como number por contexto

// Contextual typing en object literals
interface User {
  name: string;
  age: number;
}

function createUser(user: User) {
  return user;
}

createUser({
  name: "John",
  age: 30 // Inferido como number por contexto
});

// Contextual typing en arrays
const users: User[] = [
  { name: "John", age: 30 },
  { name: "Jane", age: 25 }
];
```

### Best common type

El algoritmo de best common type encuentra el tipo más específico que todos los valores comparten:

```typescript
// Best common type básico
const arr = [0, 1, null]; // Tipo: (number | null)[]

// Best common type con interfaces
interface Animal {
  name: string;
}

interface Dog extends Animal {
  breed: string;
}

interface Cat extends Animal {
  color: string;
}

const pets = [
  { name: "Fido", breed: "Labrador" },
  { name: "Whiskers", color: "orange" }
]; // Tipo: (Dog | Cat)[]

// Best common type con clases
class Pet {
  constructor(public name: string) {}
}

class Dog extends Pet {
  constructor(name: string, public breed: string) {
    super(name);
  }
}

const animals = [new Pet("Generic"), new Dog("Fido", "Labrador")];
// Tipo: Pet[]
```

### Widening / narrowing

**Widening:**
```typescript
// Widening de literales
const x = "hello"; // Tipo: "hello" (literal)
let y = "hello"; // Tipo: string (widened)

// Widening en arrays
const arr1 = [1, 2, 3]; // Tipo: number[]
const arr2 = [1, 2, 3] as const; // Tipo: readonly [1, 2, 3] (no widening)

// Widening en funciones
function identity<T>(x: T): T {
  return x;
}

const result1 = identity("hello"); // Tipo: "hello"
let result2 = identity("hello"); // Tipo: string
```

**Narrowing:**
```typescript
// Narrowing con typeof
function process(value: string | number) {
  if (typeof value === "string") {
    console.log(value.toUpperCase()); // value es string
  } else {
    console.log(value.toFixed(2)); // value es number
  }
}

// Narrowing con instanceof
class Dog {
  bark() { console.log("Woof!"); }
}

class Cat {
  meow() { console.log("Meow!"); }
}

function makeSound(animal: Dog | Cat) {
  if (animal instanceof Dog) {
    animal.bark(); // animal es Dog
  } else {
    animal.meow(); // animal es Cat
  }
}

// Narrowing con in operator
interface Bird {
  fly(): void;
}

interface Fish {
  swim(): void;
}

function move(animal: Bird | Fish) {
  if ("fly" in animal) {
    animal.fly(); // animal es Bird
  } else {
    animal.swim(); // animal es Fish
  }
}
```

### Control flow analysis

TypeScript usa control flow analysis para narrow tipos:

```typescript
// Control flow analysis con assignments
let value: string | number;

value = "hello";
console.log(value.toUpperCase()); // value es string

value = 42;
console.log(value.toFixed(2)); // value es number

// Control flow analysis con conditionals
function process(value: string | number | null) {
  if (value !== null) {
    // value es string | number
    if (typeof value === "string") {
      console.log(value.toUpperCase()); // value es string
    } else {
      console.log(value.toFixed(2)); // value es number
    }
  }
}

// Control flow analysis con throw
function assert(condition: boolean): asserts condition {
  if (!condition) {
    throw new Error("Assertion failed");
  }
}

function divide(a: number, b: number): number {
  assert(b !== 0);
  return a / b; // TypeScript sabe que b no es 0
}
```

### Type guards

Los type guards son funciones que narrow tipos:

```typescript
// Type guard básico
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function process(value: unknown) {
  if (isString(value)) {
    console.log(value.toUpperCase()); // value es string
  }
}

// Type guard con interfaces
interface Dog {
  type: "dog";
  bark(): void;
}

interface Cat {
  type: "cat";
  meow(): void;
}

function isDog(animal: Dog | Cat): animal is Dog {
  return animal.type === "dog";
}

function makeSound(animal: Dog | Cat) {
  if (isDog(animal)) {
    animal.bark();
  } else {
    animal.meow();
  }
}
```

### User-defined type guards

Los user-defined type guards permiten crear type guards personalizados:

```typescript
// User-defined type guard básico
function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function process(value: string | null) {
  if (isDefined(value)) {
    console.log(value.toUpperCase()); // value es string
  }
}

// User-defined type guard con propiedades
interface User {
  name: string;
  email?: string;
}

function hasEmail(user: User): user is User & { email: string } {
  return user.email !== undefined;
}

function sendEmail(user: User) {
  if (hasEmail(user)) {
    console.log(`Sending to ${user.email}`); // email es string
  }
}
```

### Assertion functions

Las assertion functions son type guards que no retornan valor:

```typescript
// Assertion function básica
function assert(condition: boolean): asserts condition {
  if (!condition) {
    throw new Error("Assertion failed");
  }
}

function divide(a: number, b: number): number {
  assert(b !== 0);
  return a / b; // TypeScript sabe que b no es 0
}

// Assertion function con type narrowing
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new Error("Value is not a string");
  }
}

function process(value: unknown) {
  assertIsString(value);
  console.log(value.toUpperCase()); // value es string
}

// Assertion function con type guards
function assertDefined<T>(value: T | null | undefined): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error("Value is null or undefined");
  }
}
```

### Exhaustiveness checking

El exhaustiveness checking asegura que todos los casos de una union estén cubiertos:

```typescript
type Shape = 
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number }
  | { kind: "triangle"; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.side ** 2;
    case "triangle":
      return (shape.base * shape.height) / 2;
    default:
      const _exhaustiveCheck: never = shape; // Error si falta un caso
      return _exhaustiveCheck;
  }
}
```

### Definite assignment analysis

El definite assignment analysis asegura que las variables estén asignadas antes de usar:

```typescript
// Definite assignment básico
let x: number;
console.log(x); // ❌ Error - x no está asignada

x = 42;
console.log(x); // ✅ OK

// Definite assignment en funciones
function getValue(): number {
  let x: number;
  if (Math.random() > 0.5) {
    x = 42;
  }
  return x; // ❌ Error - x puede no estar asignada
}

// Definite assignment assertion
let y!: number; // ! indica que está asignada
console.log(y); // ✅ OK (pero peligroso en runtime)

// Definite assignment en propiedades de clase
class MyClass {
  private value: number; // ❌ Error con strictPropertyInitialization
  
  constructor() {
    this.value = 42; // ✅ OK
  }
}
```

---

## Generics avanzado

### Generic constraints

Los generic constraints restringen los tipos que puede aceptar un generic:

```typescript
// Generic constraint básico
interface Lengthwise {
  length: number;
}

function logLength<T extends Lengthwise>(arg: T): void {
  console.log(arg.length);
}

logLength("hello"); // ✅ OK
logLength([1, 2, 3]); // ✅ OK
logLength({ length: 10 }); // ✅ OK
// logLength(42); // ❌ Error

// Generic constraint con keyof
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: "John", age: 30 };
getProperty(user, "name"); // ✅ string
getProperty(user, "age"); // ✅ number
// getProperty(user, "email"); // ❌ Error

// Generic constraint con constructor
function createInstance<T>(c: new () => T): T {
  return new c();
}

class MyClass {
  constructor() {}
}

const instance = createInstance(MyClass); // ✅ OK

// Multiple generic constraints
interface HasId {
  id: string;
}

interface HasTimestamp {
  createdAt: Date;
}

function process<T extends HasId & HasTimestamp>(item: T): void {
  console.log(item.id);
  console.log(item.createdAt);
}
```

### Default generics

Los default generics proporcionan valores por defecto:

```typescript
// Generic con default
interface Box<T = string> {
  value: T;
}

const box1: Box = { value: "hello" }; // T es string (default)
const box2: Box<number> = { value: 42 }; // T es number

// Multiple generics con defaults
interface Pair<T = string, U = number> {
  first: T;
  second: U;
}

const pair1: Pair = { first: "hello", second: 42 }; // Defaults
const pair2: Pair<boolean> = { first: true, second: 42 }; // Solo T especificado
const pair3: Pair<boolean, string> = { first: true, second: "hello" }; // Ambos
```

### Variance

La variance describe cómo los tipos compuestos se relacionan con sus componentes:

**Covariance:**
```typescript
// Covariance - los tipos compuestos preservan la relación
class Animal {
  constructor(public name: string) {}
}

class Dog extends Animal {
  bark() { console.log("Woof!"); }
}

// Arrays en TypeScript son covariantes (unsafe)
const animals: Animal[] = [new Dog("Fido")]; // ✅ OK
const dogs: Dog[] = [new Dog("Fido")];
const animals2: Animal[] = dogs; // ✅ OK (pero unsafe)
```

**Contravariance:**
```typescript
// Contravariance - la relación se invierte
type Logger<T> = (value: T) => void;

const logAnimal: Logger<Animal> = (animal) => console.log(animal.name);
const logDog: Logger<Dog> = (dog) => console.log(dog.name);

const animalLogger: Logger<Animal> = logDog; // ✅ OK
// const dogLogger: Logger<Dog> = logAnimal; // ❌ Error
```

**Bivariance:**
```typescript
// Bivariance - tanto covariant como contravariant
type Handler<T> = (value: T) => void;

const handleAnimal: Handler<Animal> = (animal) => {};
const handleDog: Handler<Dog> = (dog) => {};

const handler1: Handler<Animal> = handleDog; // ✅ OK (bivariance)
const handler2: Handler<Dog> = handleAnimal; // ✅ OK (bivariance)

// Con strictFunctionTypes: true, las funciones son contravariantes
```

### Generic inference

TypeScript infiere tipos genéricos automáticamente:

```typescript
// Inferencia básica
function identity<T>(value: T): T {
  return value;
}

const result1 = identity("hello"); // T inferido como string
const result2 = identity(42); // T inferido como number

// Inferencia con múltiples parámetros
function pair<T, U>(first: T, second: U): [T, U] {
  return [first, second];
}

const p1 = pair("hello", 42); // [string, number]
const p2 = pair(1, 2); // [number, number]

// Inferencia contextual
function map<T, U>(array: T[], fn: (item: T) => U): U[] {
  return array.map(fn);
}

const numbers = [1, 2, 3];
const strings = map(numbers, n => n.toString()); // T inferido como number, U como string
```

### Recursive generics

Los recursive generics se refieren a sí mismos:

```typescript
// Recursive generic básico
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

interface User {
  name: string;
  age: number;
  address: {
    street: string;
    city: string;
  };
}

type PartialUser = DeepPartial<User>;

// Recursive generic para nested arrays
type Flatten<T> = T extends any[] ? Flatten<T[number]> : T;

type Nested = number[][][][];
type Flat = Flatten<Nested>; // number

// Recursive generic para deep readonly
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
```

### Higher-order generics

Los higher-order generics son generics que aceptan otros generics:

```typescript
// Higher-order generic básico
type Container<T> = {
  value: T;
};

type ContainerOfContainers<T> = Container<Container<T>>;

// Higher-order generic con funciones
type Mapper<T, U> = (value: T) => U;
type ArrayMapper<T> = <U>(mapper: Mapper<T, U>) => U[];

function mapArray<T>(array: T[]): ArrayMapper<T> {
  return <U>(mapper: Mapper<T, U>) => array.map(mapper);
}
```

### Generic factories

Los generic factories crean instancias de tipos genéricos:

```typescript
// Generic factory básico
interface Factory<T> {
  create(): T;
}

class UserFactory implements Factory<User> {
  create(): User {
    return { name: "John", age: 30 };
  }
}

// Generic factory con constructor
function createInstance<T>(factory: Factory<T>): T {
  return factory.create();
}

// Generic factory con constructor signature
function createFromConstructor<T>(ctor: new () => T): T {
  return new ctor();
}

class MyClass {
  constructor() {}
}

const instance = createFromConstructor(MyClass);
```

### Generic repositories

Los generic repositories son un pattern común en arquitectura:

```typescript
// Generic repository básico
interface Repository<T, ID> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: ID): Promise<void>;
}

interface Entity<ID> {
  id: ID;
}

// Implementación genérica
class InMemoryRepository<T extends Entity<ID>, ID> implements Repository<T, ID> {
  private entities: Map<ID, T> = new Map();

  async findById(id: ID): Promise<T | null> {
    return this.entities.get(id) || null;
  }

  async findAll(): Promise<T[]> {
    return Array.from(this.entities.values());
  }

  async save(entity: T): Promise<T> {
    this.entities.set(entity.id, entity);
    return entity;
  }

  async delete(id: ID): Promise<void> {
    this.entities.delete(id);
  }
}

// Uso específico
interface User extends Entity<string> {
  name: string;
  email: string;
}

const userRepo = new InMemoryRepository<User, string>();
```

### Generic API design

```typescript
// Generic API con múltiples parámetros
interface Response<T, E = Error> {
  data: T;
  error?: E;
}

async function fetchAPI<T, E = Error>(
  url: string
): Promise<Response<T, E>> {
  const response = await fetch(url);
  const data = await response.json();
  return { data };
}

// Generic API con builders
class QueryBuilder<T> {
  private filters: Partial<T> = {};

  where<K extends keyof T>(key: K, value: T[K]): this {
    this.filters[key] = value;
    return this;
  }

  build(): Partial<T> {
    return this.filters;
  }
}

interface User {
  name: string;
  age: number;
  email: string;
}

const query = new QueryBuilder<User>()
  .where("name", "John")
  .where("age", 30)
  .build();

// Generic API con composición
type Middleware<T> = (context: T) => Promise<void> | void;

class Pipeline<T> {
  private middlewares: Middleware<T>[] = [];

  use(middleware: Middleware<T>): this {
    this.middlewares.push(middleware);
    return this;
  }

  async execute(context: T): Promise<void> {
    for (const middleware of this.middlewares) {
      await middleware(context);
    }
  }
}
```

---

## Utility Types en profundidad

### Partial

`Partial<T>` hace todas las propiedades de T opcionales:

```typescript
// Implementación manual
type MyPartial<T> = {
  [P in keyof T]?: T[P];
};

// Uso
interface User {
  name: string;
  age: number;
  email: string;
}

type PartialUser = Partial<User>;
// {
//   name?: string;
//   age?: number;
//   email?: string;
// }

const partialUser: PartialUser = { name: "John" }; // ✅ OK
```

### Required

`Required<T>` hace todas las propiedades de T requeridas:

```typescript
// Implementación manual
type MyRequired<T> = {
  [P in keyof T]-?: T[P];
};

// Uso
interface User {
  name?: string;
  age?: number;
}

type RequiredUser = Required<User>;
// {
//   name: string;
//   age: number;
// }
```

### Readonly

`Readonly<T>` hace todas las propiedades de T readonly:

```typescript
// Implementación manual
type MyReadonly<T> = {
  readonly [P in keyof T]: T[P];
};

// Uso
interface User {
  name: string;
  age: number;
}

type ReadonlyUser = Readonly<User>;
// {
//   readonly name: string;
//   readonly age: number;
// }
```

### Pick

`Pick<T, K>` selecciona propiedades específicas de T:

```typescript
// Implementación manual
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Uso
interface User {
  name: string;
  age: number;
  email: string;
}

type UserName = Pick<User, "name" | "age">;
// {
//   name: string;
//   age: number;
// }
```

### Omit

`Omit<T, K>` elimina propiedades específicas de T:

```typescript
// Implementación manual
type MyOmit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

// Uso
interface User {
  name: string;
  age: number;
  email: string;
}

type UserWithoutEmail = Omit<User, "email">;
// {
//   name: string;
//   age: number;
// }
```

### Record

`Record<K, T>` crea un tipo con keys K y valores T:

```typescript
// Implementación manual
type MyRecord<K extends keyof any, T> = {
  [P in K]: T;
};

// Uso
type UserRecord = Record<string, User>;
// {
//   [key: string]: User;
// }

type Status = "pending" | "success" | "error";
type StatusMessages = Record<Status, string>;
// {
//   pending: string;
//   success: string;
//   error: string;
// }
```

### Exclude

`Exclude<T, U>` excluye de T los tipos que son asignables a U:

```typescript
// Implementación manual
type MyExclude<T, U> = T extends U ? never : T;

// Uso
type AllTypes = string | number | boolean;
type WithoutString = Exclude<AllTypes, string>; // number | boolean
```

### Extract

`Extract<T, U>` extrae de T los tipos que son asignables a U:

```typescript
// Implementación manual
type MyExtract<T, U> = T extends U ? T : never;

// Uso
type AllTypes = string | number | boolean;
type OnlyString = Extract<AllTypes, string>; // string
```

### NonNullable

`NonNullable<T>` elimina null y undefined de T:

```typescript
// Implementación manual
type MyNonNullable<T> = T extends null | undefined ? never : T;

// Uso
type Nullable = string | number | null | undefined;
type NotNullable = NonNullable<Nullable>; // string | number
```

### ReturnType

`ReturnType<T>` extrae el tipo de retorno de una función:

```typescript
// Implementación manual
type MyReturnType<T extends (...args: any) => any> = T extends (
  ...args: any
) => infer R
  ? R
  : any;

// Uso
function greet(): string {
  return "Hello";
}

type GreetReturn = ReturnType<typeof greet>; // string

async function fetchUser(): Promise<User> {
  return { name: "John", age: 30 };
}

type FetchUserReturn = ReturnType<typeof fetchUser>; // Promise<User>
```

### Parameters

`Parameters<T>` extrae los tipos de parámetros de una función:

```typescript
// Implementación manual
type MyParameters<T extends (...args: any) => any> = T extends (
  ...args: infer P
) => any
  ? P
  : never;

// Uso
function greet(name: string, age: number): string {
  return `Hello ${name}, you are ${age}`;
}

type GreetParams = Parameters<typeof greet>;
// [name: string, age: number]
```

### ConstructorParameters

`ConstructorParameters<T>` extrae los tipos de parámetros de un constructor:

```typescript
// Implementación manual
type MyConstructorParameters<T extends new (...args: any) => any> =
  T extends new (...args: infer P) => any ? P : never;

// Uso
class User {
  constructor(public name: string, public age: number) {}
}

type UserConstructorParams = ConstructorParameters<typeof User>;
// [name: string, age: number]
```

### InstanceType

`InstanceType<T>` extrae el tipo de instancia de una clase:

```typescript
// Implementación manual
type MyInstanceType<T extends new (...args: any) => any> = T extends new (
  ...args: any
) => infer R
  ? R
  : any;

// Uso
class User {
  constructor(public name: string, public age: number) {}
}

type UserInstance = InstanceType<typeof User>; // User
```

### Awaited

`Awaited<T>` desenvuelve el tipo de una Promise:

```typescript
// Implementación manual
type MyAwaited<T> = T extends Promise<infer U> ? U : T;

// Uso
type PromiseString = Promise<string>;
type AwaitedString = Awaited<PromiseString>; // string

type NestedPromise = Promise<Promise<number>>;
type AwaitedNested = Awaited<NestedPromise>; // number
```

### ThisType

`ThisType<T>` especifica el tipo de this:

```typescript
// Uso
interface MyObject {
  name: string;
  greet: (this: MyObject) => string;
}

const obj: MyObject = {
  name: "John",
  greet() {
    return `Hello, ${this.name}`;
  }
};

// ThisType en mapped types
type ObjectWithMethods<D, M> = D & { [K in keyof M]: M[K] & ThisType<D & M> };

const person = {
  name: "John",
  greet() {
    return `Hello, ${this.name}`;
  }
} as ObjectWithMethods<{ name: string }, { greet: () => string }>;
```

---

**Continúa en Parte 3: Conditional Types + Mapped Types + infer**

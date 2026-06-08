# TypeScript Senior - Parte 4: Template Literal Types + Advanced Type Manipulation

## Template Literal Types

### String manipulation

Los template literal types permiten manipulación de strings a nivel de tipos:

```typescript
// Concatenación básica
type World = "world";
type Greeting = `hello ${World}`; // "hello world"

// Uso con generics
type EventName<T extends string> = `on${Capitalize<T>}`;

type ClickEvent = EventName<"click">; // "onClick"
type SubmitEvent = EventName<"submit">; // "onSubmit"

// String manipulation con inferencia
type FirstChar<S extends string> = S extends `${infer F}${string}` ? F : never;

type F1 = FirstChar<"hello">; // "h"
type F2 = FirstChar<"world">; // "w"
```

### Dynamic key generation

Generación dinámica de keys en objetos:

```typescript
// Generar keys dinámicamente
type EventHandler<T extends string> = {
  [K in T as `on${Capitalize<K>}`]: (event: Event) => void
};

type Events = "click" | "submit" | "change";
type EventHandlers = EventHandler<Events>;
// {
//   onClick: (event: Event) => void;
//   onSubmit: (event: Event) => void;
//   onChange: (event: Event) => void;
// }

// Generar getters/setters
type Accessors<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
} & {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void
};

interface User {
  name: string;
  age: number;
}

type UserAccessors = Accessors<User>;
// {
//   getName: () => string;
//   getAge: () => number;
//   setName: (value: string) => void;
//   setAge: (value: number) => void;
// }
```

### Recursive template types

Template types recursivos para manipulación compleja:

```typescript
// Replace recursivo
type Replace<S extends string, From extends string, To extends string> = 
  From extends "" 
    ? S 
    : S extends `${infer Before}${From}${infer After}` 
      ? `${Before}${To}${Replace<After, From, To>}` 
      : S;

type R1 = Replace<"foo-bar-baz", "-", "_">; // "foo_bar_baz"
type R2 = Replace<"hello world", "world", "typescript">; // "hello typescript"

// Split recursivo
type Split<S extends string, Delimiter extends string> = 
  Delimiter extends "" 
    ? never 
    : S extends `${infer First}${Delimiter}${infer Rest}` 
      ? [First, ...Split<Rest, Delimiter>] 
      : [S];

type S1 = Split<"a,b,c", ",">; // ["a", "b", "c"]
type S2 = Split<"hello-world", "-">; // ["hello", "world"]

// Join recursivo
type Join<T extends string[], Delimiter extends string> = 
  T extends [infer First extends string, ...infer Rest extends string[]] 
    ? Rest extends [] 
      ? First 
      : `${First}${Delimiter}${Join<Rest, Delimiter>}` 
    : "";

type J1 = Join<["a", "b", "c"], ",">; // "a,b,c"
type J2 = Join<["hello", "world"], " ">; // "hello world"
```

### Path extraction

Extracción de paths en objetos anidados:

```typescript
// Path extraction básico
type Path<T, K extends keyof T = keyof T> = 
  K extends string | number 
    ? T[K] extends object 
      ? K | `${K}.${Path<T[K]>}` 
      : K 
    : never;

interface User {
  name: string;
  age: number;
  address: {
    street: string;
    city: string;
  };
}

type UserPaths = Path<User>;
// "name" | "age" | "address" | "address.street" | "address.city"

// Path con array access
type PathWithArray<T, K extends keyof T = keyof T> = 
  K extends string | number 
    ? T[K] extends (infer U)[] 
      ? K | `${K}.${number}` | `${K}.${PathWithArray<U>}` 
      : T[K] extends object 
        ? K | `${K}.${PathWithArray<T[K]>}` 
        : K 
    : never;

interface Data {
  users: User[];
  items: number[];
}

type DataPaths = PathWithArray<Data>;
// "users" | "users.0" | "users.0.name" | "items" | "items.0"
```

### Route-safe typing

Tipado seguro para rutas:

```typescript
// Route parameters
type RouteParams<Route extends string> = 
  Route extends `${string}:${infer Param}/${infer Rest}` 
    ? Param | RouteParams<Rest> 
    : Route extends `${string}:${infer Param}` 
      ? Param 
      : never;

type UserRoute = "/users/:userId/posts/:postId";
type UserRouteParams = RouteParams<UserRoute>; // "userId" | "postId"

// Route builder
type BuildRoute<Route extends string, Params extends Record<string, string | number>> = 
  Route extends `${infer Start}:${infer Param}/${infer Rest}` 
    ? `${Start}${Params[Param & keyof Params]}${BuildRoute<Rest, Params>}` 
    : Route extends `${infer Start}:${infer Param}` 
      ? `${Start}${Params[Param & keyof Params]}` 
      : Route;

type BuiltRoute = BuildRoute<UserRoute, { userId: string; postId: number }>;
// "/users/${string}/posts/${number}"
```

### Event-safe typing

Tipado seguro para eventos:

```typescript
// Event types
type EventType<T extends string> = T extends `${infer Prefix}:${infer Action}` 
  ? { type: T; payload: Action } 
  : never;

type UserEvent = EventType<"user:created">; // { type: "user:created"; payload: "created" }

// Event handlers
type EventHandler<T extends string> = T extends `${infer Domain}:${infer Action}` 
  ? (event: { type: T; payload: any }) => void 
  : never;

type UserCreatedHandler = EventHandler<"user:created">;
// (event: { type: "user:created"; payload: any }) => void

// Event map
type EventMap<T extends Record<string, any>> = {
  [K in keyof T as K extends `${string}:${string}` ? K : never]: EventHandler<K & string>
};

type Events = {
  "user:created": { userId: string };
  "user:deleted": { userId: string };
};

type Handlers = EventMap<Events>;
// {
//   "user:created": (event: { type: "user:created"; payload: any }) => void;
//   "user:deleted": (event: { type: "user:deleted"; payload: any }) => void;
// }
```

### DSLs tipados

Domain Specific Languages tipados:

```typescript
// Query DSL
type Query<T> = {
  select<K extends keyof T>(...fields: K[]): Query<Pick<T, K>>;
  where<K extends keyof T>(field: K, value: T[K]): Query<T>;
  orderBy<K extends keyof T>(field: K, direction: "asc" | "desc"): Query<T>;
  execute(): Promise<T[]>;
};

// CSS DSL
type CSSValue = 
  | string 
  | number 
  | `${number}px` 
  | `${number}%` 
  | `${number}em` 
  | `${number}rem`;

type CSSProperties = {
  [K in keyof CSSStyleDeclaration as K extends string ? K : never]?: CSSValue;
};

type Style = CSSProperties;

const buttonStyle: Style = {
  padding: "10px",
  margin: "20px",
  fontSize: "16px",
  width: "100%"
};
```

---

## Advanced Type Manipulation

### Type transformations

Transformaciones complejas de tipos:

```typescript
// Remover null y undefined recursivamente
type DeepNonNullable<T> = {
  [P in keyof T]-?: T[P] extends object 
    ? DeepNonNullable<T[P]> 
    : NonNullable<T[P]>
};

interface NullableUser {
  name: string | null;
  age: number | undefined;
  address: {
    street: string | null;
  };
}

type CleanUser = DeepNonNullable<NullableUser>;
// {
//   name: string;
//   age: number;
//   address: {
//     street: string;
//   };
// }

// Remover readonly recursivamente
type DeepMutable<T> = {
  -readonly [P in keyof T]: T[P] extends object 
    ? DeepMutable<T[P]> 
    : T[P]
};

// Convertir a mayúsculas
type UpperCaseKeys<T> = {
  [K in keyof T as Uppercase<string & K>]: T[K]
};

type UpperUser = UpperCaseKeys<User>;
// { NAME: string; AGE: number; EMAIL: string }
```

### Type composition

Composición de tipos complejos:

```typescript
// Composición con intersection
type Composable<T> = {
  compose<U>(other: U): Composable<T & U>;
}

function createComposable<T>(value: T): Composable<T> {
  return {
    compose<U>(other: U) {
      return createComposable({ ...value, ...other } as T & U);
    }
  };
}

const obj = createComposable({ a: 1 })
  .compose({ b: 2 })
  .compose({ c: 3 });

// Composición con curry
type Curried<F> = F extends (...args: infer A) => infer R 
  ? A extends [infer First, ...infer Rest] 
    ? (arg: First) => Curried<(...args: Rest) => R> 
    : R 
  : never;

function add(a: number, b: number, c: number): number {
  return a + b + c;
}

type CurriedAdd = Curried<typeof add>;
// (arg: number) => (arg: number) => (arg: number) => number
```

### Type-level recursion

Recursión a nivel de tipos:

```typescript
// Fibonacci a nivel de tipos
type Fibonacci<N extends number, I extends number[] = [], A extends number[] = [], B extends number[] = []> = 
  I["length"] extends N 
    ? B["length"] 
    : Fibonacci<N, [...I, 1], B, [...A, ...B]>;

type F0 = Fibonacci<0>; // 0
type F1 = Fibonacci<1>; // 1
type F5 = Fibonacci<5>; // 5
type F10 = Fibonacci<10>; // 55

// Factorial a nivel de tipos
type Factorial<N extends number, Acc extends number[] = []> = 
  Acc["length"] extends N 
    ? Acc["length"] 
    : Factorial<N, [...Acc, ...Array<Acc["length"] extends 0 ? never : Acc["length"]>>>;

// Nota: La implementación de factorial es compleja debido a limitaciones de TypeScript
```

### Type-safe object paths

Paths seguras en objetos:

```typescript
// Path seguro
type PathValue<T, P extends string> = 
  P extends `${infer K}.${infer Rest}` 
    ? K extends keyof T 
      ? PathValue<T[K], Rest> 
      : never 
    : P extends keyof T 
      ? T[P] 
      : never;

interface User {
  name: string;
  address: {
    street: string;
    city: string;
  };
}

type NameType = PathValue<User, "name">; // string
type StreetType = PathValue<User, "address.street">; // string
type InvalidType = PathValue<User, "address.invalid">; // never

// Path seguro con función
function get<T, P extends string>(obj: T, path: P): PathValue<T, P> {
  return path.split(".").reduce((o: any, k) => o[k], obj);
}

const user: User = {
  name: "John",
  address: { street: "123 Main", city: "NYC" }
};

const name = get(user, "name"); // string
const street = get(user, "address.street"); // string
// const invalid = get(user, "address.invalid"); // Error en compile-time
```

### Deep merge types

Merge profundo de tipos:

```typescript
// Deep merge
type DeepMerge<T, U> = 
  T extends object 
    ? U extends object 
      ? {
          [K in keyof T | keyof U]: K extends keyof T 
            ? K extends keyof U 
              ? DeepMerge<T[K], U[K]> 
              : T[K] 
            : U[K]
        }
      : U 
    : U;

type Merged = DeepMerge<
  { a: number; b: { c: string } },
  { b: { d: boolean }; e: string }
>;
// { a: number; b: { c: string; d: boolean }; e: string }

// Deep merge con override
type DeepMergeOverride<T, U> = 
  T extends object 
    ? U extends object 
      ? {
          [K in keyof T]: K extends keyof U 
            ? DeepMergeOverride<T[K], U[K]> 
            : T[K]
        } & {
          [K in keyof U as K extends keyof T ? never : K]: U[K]
        }
      : U 
    : U;
```

### Flatten types

Aplanamiento de tipos:

```typescript
// Flatten arrays
type Flatten<T> = T extends any[] ? Flatten<T[number]> : T;

type Nested = number[][][][];
type Flat = Flatten<Nested>; // number

// Flatten objetos
type FlattenObject<T> = {
  [K in keyof T]: T[K] extends infer U 
    ? U extends object 
      ? FlattenObject<U> 
      : U 
    : never
};

interface NestedObj {
  a: { b: { c: string } };
  d: { e: number };
}

type FlatObj = FlattenObject<NestedObj>;
// { a: string; d: number }
```

### Distributed transformations

Transformaciones distribuidas sobre unions:

```typescript
// Distribución sobre unions
type Distribute<T> = T extends any ? T : never;

type D1 = Distribute<string | number>; // string | number

// Distribución con transformación
type Boxed<T> = { value: T };

type BoxedUnion = Boxed<string | number>; // { value: string | number }
type DistributedBoxed = Distribute<Boxed<string | number>>; // { value: string } | { value: number }

// Distribución condicional
type ConditionalDistribute<T> = T extends string ? Boxed<T> : never;

type CD1 = ConditionalDistribute<string | number>; // { value: string }
```

---

**Continúa en Parte 5: Decorators + Architecture Patterns**

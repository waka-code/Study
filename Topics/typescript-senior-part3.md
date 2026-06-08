# TypeScript Senior - Parte 3: Conditional Types + Mapped Types + infer

## Conditional Types profundo

### extends internamente

`extends` en conditional types verifica si un tipo es asignable a otro:

```typescript
// Conditional type básico
type IsString<T> = T extends string ? true : false;

type Test1 = IsString<string>; // true
type Test2 = IsString<number>; // false

// extends con distributivity
type ToArray<T> = T extends any ? T[] : never;

type Test3 = ToArray<string | number>; // string[] | number[] (distribuido)
```

### Conditional branching

Los conditional types permiten branching basado en tipos:

```typescript
// Conditional branching básico
type TypeName<T> = 
  T extends string ? "string" :
  T extends number ? "number" :
  T extends boolean ? "boolean" :
  T extends undefined ? "undefined" :
  T extends Function ? "function" :
  "object";

type T1 = TypeName<string>; // "string"
type T2 = TypeName<number>; // "number"
type T3 = TypeName<Function>; // "function"
type T4 = TypeName<{ a: number }>; // "object"

// Conditional branching anidado
type NonNullable<T> = T extends null | undefined ? never : T;

type T5 = NonNullable<string | null>; // string
type T6 = NonNullable<number | undefined>; // number
```

### infer keyword

El keyword `infer` permite inferir tipos dentro de conditional types:

```typescript
// Infer básico
type ReturnType<T> = T extends (...args: any) => infer R ? R : never;

function greet(): string {
  return "Hello";
}

type GreetReturn = ReturnType<typeof greet>; // string

// Infer con múltiples parámetros
type Parameters<T> = T extends (...args: infer P) => any ? P : never;

function add(a: number, b: number): number {
  return a + b;
}

type AddParams = Parameters<typeof add>; // [a: number, b: number]

// Infer en arrays
type First<T extends any[]> = T extends [infer F, ...any[]] ? F : never;

type First1 = First<[1, 2, 3]>; // 1
type First2 = First<[]>; // never

// Infer en último elemento
type Last<T extends any[]> = T extends [...any[], infer L] ? L : never;

type Last1 = Last<[1, 2, 3]>; // 3
type Last2 = Last<[]>; // never

// Infer en objetos
type GetValueType<T> = T extends { value: infer V } ? V : never;

type Value = GetValueType<{ value: string }>; // string
```

### Recursive conditional types

Los conditional types pueden ser recursivos:

```typescript
// Deep readonly con conditional types recursivos
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

interface User {
  name: string;
  address: {
    street: string;
    city: string;
  };
}

type ReadonlyUser = DeepReadonly<User>;

// Flatten arrays recursivamente
type Flatten<T> = T extends any[] ? Flatten<T[number]> : T;

type Nested = number[][][][];
type Flat = Flatten<Nested>; // number

// Replace recursivo
type Replace<S, From extends string, To extends string> = 
  S extends `${infer Before}${From}${infer After}` 
    ? `${Before}${To}${Replace<After, From, To>}` 
    : S;

type Replaced = Replace<"foo-bar-baz", "-", "_">; // "foo_bar_baz"
```

### Distribution over unions

Los conditional types se distribuyen automáticamente sobre unions:

```typescript
// Distribución automática
type ToArray<T> = T extends any ? T[] : never;

type Distributed = ToArray<string | number>; // string[] | number[]

// Prevenir distribución
type NonDistributed<T> = [T] extends [any] ? T[] : never;

type NotDistributed = NonDistributed<string | number>; // (string | number)[]
```

### Preventing distribution

Para prevenir la distribución, envuelve el tipo en un tuple:

```typescript
// Distribución (por defecto)
type ToArray<T> = T extends any ? T[] : never;
type D1 = ToArray<string | number>; // string[] | number[]

// Sin distribución
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type D2 = ToArrayNonDist<string | number>; // (string | number)[]
```

### Pattern matching con tipos

Los conditional types permiten pattern matching:

```typescript
// Pattern matching básico
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type P1 = UnwrapPromise<Promise<string>>; // string
type P2 = UnwrapPromise<number>; // number

// Pattern matching anidado
type UnwrapPromiseDeep<T> = 
  T extends Promise<infer U> 
    ? UnwrapPromiseDeep<U> 
    : T;

type P3 = UnwrapPromiseDeep<Promise<Promise<string>>>; // string

// Pattern matching en objetos
type Getters<T> = {
  [K in keyof T as K extends `get${infer Name}` ? Name : never]: T[K]
};

interface User {
  getName: () => string;
  getAge: () => number;
  setName: (name: string) => void;
}

type UserGetters = Getters<User>;
// { Name: () => string; Age: () => number }
```

### Type-level computation

Los conditional types permiten computación a nivel de tipos:

```typescript
// Suma a nivel de tipos
type Add<A extends number, B extends number> = 
  [A, B] extends [infer a extends number, infer b extends number]
    ? a extends b
      ? Add<a, b extends 0 ? 0 : never> // Implementación simplificada
      : never
    : never;

// Length de string literal
type Length<S extends string> = S extends `${infer _}${infer Rest}` 
  ? 1 + Length<Rest> 
  : 0;

type L1 = Length<"abc">; // 3
type L2 = Length<"hello">; // 5

// Split string
type Split<S extends string, Delimiter extends string> = 
  S extends `${infer First}${Delimiter}${infer Rest}` 
    ? [First, ...Split<Rest, Delimiter>] 
    : [S];

type S1 = Split<"a,b,c", ",">; // ["a", "b", "c"]
type S2 = Split<"hello world", " ">; // ["hello", "world"]
```

---

## Mapped Types avanzado

### Key remapping

Los mapped types permiten remapping de keys:

```typescript
// Key remapping básico
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
};

interface User {
  name: string;
  age: number;
}

type UserGetters = Getters<User>;
// {
//   getName: () => string;
//   getAge: () => number;
// }

// Key remapping con filter
type OnlyStringKeys<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K]
};

interface Mixed {
  name: string;
  age: number;
  active: boolean;
}

type StringProps = OnlyStringKeys<Mixed>;
// { name: string }
```

### Modifier mapping

Los mapped types pueden agregar o remover modificadores:

```typescript
// Agregar readonly
type Readonly<T> = {
  readonly [P in keyof T]: T[P]
};

// Remover readonly
type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
};

interface User {
  readonly id: string;
  readonly name: string;
}

type MutableUser = Mutable<User>;
// { id: string; name: string }

// Agregar optional
type Partial<T> = {
  [P in keyof T]?: T[P]
};

// Remover optional
type Required<T> = {
  [P in keyof T]-?: T[P]
};
```

### Recursive mapped types

Los mapped types pueden ser recursivos:

```typescript
// Deep partial
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
};

interface User {
  name: string;
  address: {
    street: string;
    city: string;
  };
}

type PartialUser = DeepPartial<User>;
// {
//   name?: string;
//   address?: {
//     street?: string;
//     city?: string;
//   };
// }

// Deep readonly
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
};

type ReadonlyUser = DeepReadonly<User>;

// Deep required
type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P]
};
```

### Conditional mapped types

Los mapped types pueden ser condicionales:

```typescript
// Mapped type condicional
type ConditionalPartial<T> = {
  [P in keyof T as T[P] extends string ? P : never]?: T[P]
};

interface User {
  name: string;
  age: number;
  email: string;
}

type PartialStrings = ConditionalPartial<User>;
// { name?: string; email?: string }

// Mapped type con conditional en el valor
type Stringify<T> = {
  [P in keyof T]: T[P] extends string ? T[P] : string
};

type StringifiedUser = Stringify<User>;
// { name: string; age: string; email: string }
```

### Dynamic transformations

Los mapped types permiten transformaciones dinámicas:

```typescript
// Transformación dinámica de keys
type EventHandlers<T> = {
  [K in keyof T as K extends `on${infer Event}` ? Event : never]: T[K]
};

interface Events {
  onClick: () => void;
  onChange: () => void;
  onSubmit: () => void;
  other: string;
}

type Handlers = EventHandlers<Events>;
// { Click: () => void; Change: () => void; Submit: () => void }

// Prefix/suffix en keys
type Prefixed<T, P extends string> = {
  [K in keyof T as `${P}${string & K}`]: T[K]
};

type PrefixedUser = Prefixed<User, "user_">;
// { user_name: string; user_age: number; user_email: string }
```

### Immutable transformations

Transformaciones para inmutabilidad:

```typescript
// Deep immutable
type Immutable<T> = {
  readonly [P in keyof T]: T[P] extends (...args: any) => any 
    ? T[P] 
    : Immutable<T[P]>
};

interface Complex {
  data: {
    items: number[];
  };
  update: (val: number) => void;
}

type ImmutableComplex = Immutable<Complex>;
// {
//   readonly data: {
//     readonly items: readonly number[];
//   };
//   readonly update: (val: number) => void;
// }
```

### DeepPartial

Implementación de DeepPartial:

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: 
    T[P] extends object 
      ? T[P] extends Function 
        ? T[P] 
        : DeepPartial<T[P]> 
      : T[P]
};

interface Nested {
  a: number;
  b: {
    c: string;
    d: {
      e: boolean;
    };
  };
}

type PartialNested = DeepPartial<Nested>;
// {
//   a?: number;
//   b?: {
//     c?: string;
//     d?: {
//       e?: boolean;
//     };
//   };
// }
```

### DeepReadonly

Implementación de DeepReadonly:

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: 
    T[P] extends object 
      ? T[P] extends Function 
        ? T[P] 
        : DeepReadonly<T[P]> 
      : T[P]
};

type ReadonlyNested = DeepReadonly<Nested>;
// {
//   readonly a: number;
//   readonly b: {
//     readonly c: string;
//     readonly d: {
//       readonly e: boolean;
//     };
//   };
// }
```

### DeepRequired

Implementación de DeepRequired:

```typescript
type DeepRequired<T> = {
  [P in keyof T]-?: 
    T[P] extends object 
      ? T[P] extends Function 
        ? T[P] 
        : DeepRequired<T[P]> 
      : T[P]
};

type RequiredNested = DeepRequired<PartialNested>;
// {
//   a: number;
//   b: {
//     c: string;
//     d: {
//       e: boolean;
//     };
//   };
// }
```

---

## infer keyword profundo

### Cómo funciona internamente

`infer` declara una variable de tipo que TypeScript infiere del contexto:

```typescript
// Infer en el tipo de retorno de una función
type ReturnType<T> = T extends (...args: any) => infer R ? R : never;

// TypeScript analiza:
// 1. ¿T es una función?
// 2. Si sí, ¿cuál es su tipo de retorno?
// 3. Asigna ese tipo a R
// 4. Retorna R

function fn(): string {
  return "hello";
}

type FnReturn = ReturnType<typeof fn>; // string
```

### Inferencia condicional

```typescript
// Infer en diferentes posiciones
type First<T extends any[]> = T extends [infer F, ...any[]] ? F : never;
type Last<T extends any[]> = T extends [...any[], infer L] ? L : never;
type Tail<T extends any[]> = T extends [any, ...infer Rest] ? Rest : never;

type F = First<[1, 2, 3]>; // 1
type L = Last<[1, 2, 3]>; // 3
type T = Tail<[1, 2, 3]>; // [2, 3]

// Infer en objetos
type GetValue<T> = T extends { value: infer V } ? V : never;

type V = GetValue<{ value: string }>; // string
```

### Tuple inference

```typescript
// Infer en tuples
type TupleToArray<T extends any[]> = T extends infer U ? U : never;

type Arr = TupleToArray<[1, 2, 3]>; // [1, 2, 3]

// Infer en length de tuple
type Length<T extends any[]> = T extends { length: infer L } ? L : never;

type Len = Length<[1, 2, 3]>; // 3

// Infer en elementos específicos
type At<T extends any[], I extends number> = 
  T extends { [K in I]: infer V } ? V : never;

type A = At<[1, 2, 3], 0>; // 1
type B = At<[1, 2, 3], 1>; // 2
```

### Function inference

```typescript
// Infer en parámetros de función
type Parameters<T> = T extends (...args: infer P) => any ? P : never;

type Params = Parameters<(a: string, b: number) => void>;
// [a: string, b: number]

// Infer en this parameter
type ThisParameterType<T> = T extends (this: infer U, ...args: any) => any ? U : unknown;

function greet(this: User, message: string) {
  console.log(`${this.name}: ${message}`);
}

type GreetThis = ThisParameterType<typeof greet>; // User

// Omitir this parameter
type OmitThisParameter<T> = T extends (this: any, ...args: infer A) => infer R 
  ? (...args: A) => R 
  : T;

type GreetWithoutThis = OmitThisParameter<typeof greet>;
// (message: string) => void
```

### Nested inference

```typescript
// Infer anidado en Promises
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type P1 = UnwrapPromise<Promise<string>>; // string
type P2 = UnwrapPromise<Promise<Promise<number>>>; // Promise<number>

// Infer anidado profundo
type DeepUnwrapPromise<T> = 
  T extends Promise<infer U> 
    ? DeepUnwrapPromise<U> 
    : T;

type P3 = DeepUnwrapPromise<Promise<Promise<Promise<boolean>>>>; // boolean

// Infer en objetos anidados
type DeepValue<T> = 
  T extends { value: infer V } 
    ? V extends { value: infer W } 
      ? W 
      : V 
    : never;

type D = DeepValue<{ value: { value: number } }>; // number
```

### Variadic tuple inference

```typescript
// Infer en variadic tuples
type Push<T extends any[], Item> = [...T, Item];
type Pop<T extends any[]> = T extends [...infer Rest, any] ? Rest : never;
type Shift<T extends any[]> = T extends [any, ...infer Rest] ? Rest : never;
type Unshift<T extends any[], Item> = [Item, ...T];

type P1 = Push<[1, 2], 3>; // [1, 2, 3]
type P2 = Pop<[1, 2, 3]>; // [1, 2]
type S = Shift<[1, 2, 3]>; // [2, 3]
type U = Unshift<[2, 3], 1>; // [1, 2, 3]

// Infer en rest parameters
type RestArgs<T extends any[]> = T extends [any, ...infer Rest] ? Rest : never;

type R = RestArgs<[1, 2, 3]>; // [2, 3]
```

### Advanced extraction patterns

```typescript
// Extraer tipos de propiedades específicas
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K]
};

interface User {
  name: string;
  age: number;
  email: string;
  active: boolean;
}

type StringProps = PickByValue<User, string>;
// { name: string; email: string }

// Extraer keys por patrón
type KeysMatching<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never
}[keyof T];

type StringKeys = KeysMatching<User, string>; // "name" | "email"

// Extraer de union de objetos
type UnionToIntersection<U> = 
  (U extends any ? (k: U) => void : never) extends (k: infer I) => void 
    ? I 
    : never;

type U = UnionToIntersection<{ a: number } | { b: string }>;
// { a: number } & { b: string }

// Extraer último elemento de union
type LastOf<T> = 
  UnionToIntersection<T extends any ? () => T : never> extends () => infer R 
    ? R 
    : never;

type L = LastOf<1 | 2 | 3>; // 3
```

---

**Continúa en Parte 4: Template Literal Types + Advanced Type Manipulation**

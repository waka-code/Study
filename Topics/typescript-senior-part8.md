# TypeScript Senior - Parte 8: Errores comunes + Entrevistas + Roadmap

## Errores comunes Senior

### Type widening accidental

```typescript
// ERROR: Widening accidental
const user = { name: "John", age: 30 };
// user.name es string, no "John"

// SOLUCIÓN: Usar as const
const user = { name: "John", age: 30 } as const;
// user.name es "John"

// ERROR: En funciones
function getConfig() {
  return { apiUrl: "https://api.example.com" };
}
// Retorna { apiUrl: string }

// SOLUCIÓN: Tipo explícito o as const
function getConfig(): { apiUrl: "https://api.example.com" } {
  return { apiUrl: "https://api.example.com" };
}
```

### any leaks

```typescript
// ERROR: any leaks
function process(data: any) {
  return data.map(item => item.value); // data es any, item es any
}

// SOLUCIÓN: Usar unknown y type guards
function process(data: unknown) {
  if (Array.isArray(data)) {
    return data.map(item => {
      if (item && typeof item === "object" && "value" in item) {
        return (item as { value: unknown }).value;
      }
      return null;
    });
  }
  return [];
}

// ERROR: any en type assertions
const value = someValue as any;

// SOLUCIÓN: Type guard o validación
if (typeof someValue === "string") {
  const value = someValue;
}
```

### Unsafe assertions

```typescript
// ERROR: Assertion sin validación
const user = response.data as User;

// SOLUCIÓN: Validación runtime
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email()
});

const user = UserSchema.parse(response.data);

// ERROR: Double assertion
const value = someValue as unknown as User;

// SOLUCIÓN: Type guard
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    "email" in value
  );
}
```

### Over-engineering types

```typescript
// ERROR: Tipos excesivamente complejos
type OverEngineered<T> = DeepPartial<
  DeepReadonly<
    Required<
      Omit<
        T,
        "password"
      > & {
        metadata: {
          [K in keyof Metadata as K extends string ? Uppercase<K> : never]: Metadata[K]
        }
      }
    >
  >
>;

// SOLUCIÓN: Dividir en tipos simples
type SafeUser = Omit<User, "password">;
type ReadonlyUser = Readonly<SafeUser>;
type RequiredUser = Required<ReadonlyUser>;

// ERROR: Conditional types anidados
type Complex<T> = T extends string
  ? T extends `${infer A}-${infer B}`
    ? B extends "foo"
      ? A
      : never
    : never
  : never;

// SOLUCIÓN: Funciones auxiliares
function extractPrefix(value: string): string {
  const parts = value.split("-");
  return parts[0];
}
```

### Recursive explosion

```typescript
// ERROR: Recursión infinita en tipos
type Infinite<T> = {
  [K in keyof T]: T[K] extends object ? Infinite<T[K]> : T[K]
};

// SOLUCIÓN: Límite de profundidad
type DeepPartial<T, Depth extends number = 5> = Depth extends 0
  ? T
  : {
      [P in keyof T]?: T[P] extends object
        ? DeepPartial<T[P], Depth - 1>
        : T[P]
    };

// ERROR: Template literals recursivos sin límite
type Repeat<S extends string, N extends number> = N extends 0
  ? ""
  : `${S}${Repeat<S, N extends number ? N - 1 : never>}`;

// SOLUCIÓN: Usar arrays en lugar de recursión
type RepeatArray<S extends string, N extends number, Acc extends string[] = []> =
  Acc["length"] extends N ? Acc : RepeatArray<S, N, [...Acc, S]>;
```

### Slow compiler traps

```typescript
// ERROR: Archivos muy grandes
// archivo.ts (5000+ líneas)

// SOLUCIÓN: Dividir en módulos
// archivo.ts → archivo.core.ts, archivo.utils.ts, archivo.types.ts

// ERROR: Imports circulares
// fileA.ts imports fileB.ts
// fileB.ts imports fileA.ts

// SOLUCIÓN: Reorganizar arquitectura
// shared.ts → fileA.ts, fileB.ts

// ERROR: Tipos en .d.ts complejos
// types.d.ts (1000+ líneas)

// SOLUCIÓN: Dividir en archivos específicos
// user.types.ts, api.types.ts, etc.

// ERROR: Usar any para "solucionar" errores
const data: any = response;

// SOLUCIÓN: Definir tipos correctamente
interface ApiResponse {
  data: unknown;
}
```

### Incorrect narrowing

```typescript
// ERROR: Narrowing incorrecto
function process(value: string | number) {
  if (value) {
    // value sigue siendo string | number
    console.log(value.toUpperCase()); // Error
  }
}

// SOLUCIÓN: Type guard correcto
function process(value: string | number) {
  if (typeof value === "string") {
    console.log(value.toUpperCase()); // value es string
  } else {
    console.log(value.toFixed(2)); // value es number
  }
}

// ERROR: Filter no narrow
const values = [1, 2, null, 3];
const filtered = values.filter(v => v !== null);
// filtered es (number | null)[]

// SOLUCIÓN: Type guard en filter
const filtered = values.filter((v): v is number => v !== null);
// filtered es number[]
```

### API unsafety

```typescript
// ERROR: Sin validación en boundaries
app.post("/users", (req, res) => {
  const user: User = req.body; // Sin validación
  userService.create(user);
});

// SOLUCIÓN: Validación en boundaries
app.post("/users", (req, res) => {
  const validated = UserSchema.parse(req.body);
  userService.create(validated);
});

// ERROR: Asumir datos externos son correctos
const externalData = await fetch("https://api.example.com/user");
const user: User = await externalData.json();

// SOLUCIÓN: Validar datos externos
const response = await fetch("https://api.example.com/user");
const data = await response.json();
const user = UserSchema.parse(data);
```

---

## Entrevistas técnicas Senior TypeScript

### Preguntas reales

**Pregunta 1: ¿Qué es type erasure y por qué es importante?**

**Respuesta Senior:**
Type erasure es el proceso por el cual TypeScript elimina toda la información de tipos durante la transpilación a JavaScript. Esto significa que los tipos solo existen en tiempo de compilación, no en runtime. Es importante porque:

1. **No hay runtime overhead**: El código generado es JavaScript puro, sin overhead de tipos
2. **Limita reflection**: No podemos acceder a tipos en runtime sin herramientas adicionales
3. **Requiere validación separada**: Necesitamos librerías como Zod para validación runtime
4. **Afecta el diseño**: Debemos diseñar sistemas con validación en boundaries

**Pregunta 2: ¿Cuál es la diferencia entre structural typing y nominal typing?**

**Respuesta Senior:**
Structural typing (TypeScript) compara tipos por su estructura, no por su nombre. Si dos tipos tienen la misma forma, son compatibles. Nominal typing (Java, C#) requiere que los tipos tengan el mismo nombre o herencia.

TypeScript usa structural typing por defecto, lo que permite:
- Mayor flexibilidad en composición
- Duck typing natural
- Menos boilerplate

Pero podemos simular nominal typing con branded types:
```typescript
type UserId = string & { readonly __brand: unique symbol };
```

**Pregunta 3: ¿Cómo funciona el sistema de inferencia de tipos de TypeScript?**

**Respuesta Senior:**
TypeScript usa tres algoritmos principales de inferencia:

1. **Best Common Type**: Encuentra el tipo más específico que todos los valores comparten
2. **Contextual Typing**: Usa el contexto esperado para inferir tipos
3. **Widening/Narrowing**: Convierte entre literales y tipos más amplios

El proceso es:
- Primero intenta inferir desde el valor
- Luego aplica contextual typing si hay un contexto
- Finalmente aplica widening si es necesario (const vs let)

**Pregunta 4: ¿Qué son los conditional types y cómo funcionan?**

**Respuesta Senior:**
Los conditional types permiten seleccionar tipos basándose en condiciones:
```typescript
type IsString<T> = T extends string ? true : false;
```

Funcionan verificando si un tipo extiende otro. Cuando se aplican a unions, se distribuyen automáticamente:
```typescript
type ToArray<T> = T extends any ? T[] : never;
type Result = ToArray<string | number>; // string[] | number[]
```

Podemos prevenir la distribución envolviendo en un tuple:
```typescript
type NonDistributed<T> = [T] extends [any] ? T[] : never;
```

**Pregunta 5: ¿Cómo implementarías un type-safe API client?**

**Respuesta Senior:**
Usaría un enfoque de tres capas:

1. **Shared types package**: Tipos compartidos entre frontend y backend
2. **API contracts**: Definir contratos con TypeScript
3. **Runtime validation**: Validar en boundaries con Zod

```typescript
// Shared types
interface CreateUserRequest {
  name: string;
  email: string;
}

// API client
class ApiClient {
  async post<TRequest, TResponse>(
    path: string,
    data: TRequest
  ): Promise<TResponse> {
    const response = await fetch(path, {
      method: "POST",
      body: JSON.stringify(data)
    });
    return response.json();
  }
}

// Con validación
const client = new ApiClient();
const result = await client.post(
  "/users",
  CreateUserSchema.parse(data)
);
```

### Preguntas trampas

**Trampa 1: ¿Qué tipo es `never`?**
- No es "nada", es un tipo que nunca puede ocurrir
- Útil para exhaustiveness checking
- Diferente de `void` y `unknown`

**Trampa 2: ¿Es `unknown` lo mismo que `any`?**
- No. `any` deshabilita type checking (inseguro)
- `unknown` requiere type narrowing antes de usar (seguro)

**Trampa 3: ¿Puedo acceder a tipos en runtime?**
- No directamente. TypeScript hace type erasure.
- Necesitas reflect-metadata o validación runtime.

**Trampa 4: ¿Son las interfaces y type aliases iguales?**
- No. Interfaces soportan declaration merging.
- Type aliases pueden representar primitivos, unions, etc.

### Live coding challenges

**Challenge 1: Implementar DeepPartial**
```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object 
    ? T[P] extends Function 
      ? T[P] 
      : DeepPartial<T[P]> 
    : T[P]
};
```

**Challenge 2: Implementar un type-safe event bus**
```typescript
type EventMap = {
  UserCreated: { userId: string; name: string };
  UserDeleted: { userId: string };
};

class EventBus {
  on<K extends keyof EventMap>(
    event: K,
    handler: (data: EventMap[K]) => void
  ): void;
  
  emit<K extends keyof EventMap>(
    event: K,
    data: EventMap[K]
  ): void;
}
```

**Challenge 3: Implementar branded types**
```typescript
type Brand<T, B> = T & { readonly __brand: B };

type UserId = Brand<string, "UserId">;

function createUserId(id: string): UserId {
  return id as UserId;
}
```

### Resolver tipos avanzados

**Ejercicio 1: Extraer el tipo de retorno de una función**
```typescript
type ReturnType<T> = T extends (...args: any) => infer R ? R : never;
```

**Ejercicio 2: Extraer parámetros de una función**
```typescript
type Parameters<T> = T extends (...args: infer P) => any ? P : never;
```

**Ejercicio 3: Implementar Pick**
```typescript
type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};
```

### Preguntas internas del compilador

**Pregunta: ¿Cómo resuelve TypeScript los módulos?**
- Relative imports: Resuelto relativo al archivo actual
- Non-relative: Busca en node_modules, luego @types
- Usa package.json → "types" o "typings"
- Busca index.d.ts o index.ts

**Pregunta: ¿Qué hace el binder en el compilador?**
- Crea símbolos para cada declaración
- Conecta símbolos con sus usos
- Esencial para scope resolution

**Pregunta: ¿Cómo funciona incremental compilation?**
- Cachea AST, símbolos, información de tipos
- Guarda timestamps de archivos
- Solo recompila archivos modificados

### Preguntas sobre inferencia

**Pregunta: ¿Cuándo se aplica widening?**
- Con `let` en lugar de `const`
- En parámetros de función sin tipo explícito
- En propiedades de objeto sin as const

**Pregunta: ¿Cómo hacer contextual typing?**
```typescript
type Mapper = (n: number) => number;
const fn: Mapper = n => n * 2; // n inferido como number
```

**Pregunta: ¿Cómo prevenir widening?**
```typescript
const x = 42 as const;
const arr = [1, 2, 3] as const;
```

---

## Cómo responde un Senior en entrevistas

### Cómo justificar decisiones de diseño tipado

**Framework para justificar:**

1. **Identificar el problema**: "El problema que estamos resolviendo es..."
2. **Proponer solución**: "Mi solución es..."
3. **Explicar trade-offs**: "Las ventajas son... Las desventajas son..."
4. **Justificar decisión**: "Dadas las circunstancias, elegí esta opción porque..."

**Ejemplo:**
"Para el sistema de tipos de nuestra API, elegí usar Zod en lugar de solo TypeScript. La razón es que TypeScript solo valida en compile-time, pero necesitamos validación en runtime para datos externos. Zop nos permite definir el schema una vez y usarlo tanto para tipos TypeScript como para validación runtime. El trade-off es que añade una dependency más, pero el beneficio de type safety end-to-end justifica este costo."

### Cómo explicar trade-offs

**Patrón para explicar trade-offs:**

1. **Opción A**: Ventajas y desventajas
2. **Opción B**: Ventajas y desventajas
3. **Comparación**: Cuándo usar cada una
4. **Recomendación**: Basada en contexto específico

**Ejemplo:**
"Entre interfaces y type aliases, las interfaces son mejores cuando necesitas declaration merging o estás definiendo shapes de objetos que pueden ser extendidos. Los type aliases son mejores para unions, intersections, primitivos, o tipos computados. Para shapes de objetos simples, prefiero interfaces por su capacidad de merging. Para tipos complejos como unions o tipos derivados, uso type aliases."

### Cómo detectar malos diseños de tipos

**Señales de mal diseño:**

1. **Uso excesivo de any**: Indica falta de entendimiento del sistema de tipos
2. **Tipos excesivamente complejos**: Over-engineering que reduce mantenibilidad
3. **Falta de validación runtime**: Confusión entre compile-time y runtime
4. **Imports circulares**: Problema arquitectónico que afecta tipos
5. **Archivos de tipos gigantes**: Falta de organización

**Cómo abordar:**
"Veo que hay mucho uso de `any` en este código. Esto elimina los beneficios de TypeScript. Mi recomendación sería identificar los casos específicos donde se usa `any` y definir tipos apropiados. Si hay incertidumbre sobre el tipo, usar `unknown` y type guards es más seguro que `any`."

### Cómo pensar como arquitecto TypeScript

**Principios arquitectónicos:**

1. **Type safety en boundaries**: Validar en edges de tu sistema
2. **Domain-driven types**: Tipos que reflejan el dominio del negocio
3. **Composición sobre herencia**: Preferir composition patterns
4. **Separación de concerns**: Tipos de dominio vs tipos de infraestructura
5. **Incremental complexity**: Empezar simple, complicar solo cuando necesario

**Ejemplo de razonamiento:**
"Para diseñar el sistema de tipos de nuestra aplicación, empezaría definiendo los tipos de dominio core como value objects y entities. Estos tipos serían inmutables y estarían en un package compartido. Luego, definiría DTOs para comunicación entre capas, con validación en los boundaries. Para la capa de infraestructura, usaría adapters para convertir entre tipos de dominio y tipos externos. Este enfoque mantiene el dominio puro mientras permite integración con sistemas externos."

---

## Roadmap Senior TypeScript

### Niveles de dominio

**Nivel 1: Fundamentos (Junior)**
- Sintaxis básica de TypeScript
- Interfaces y type aliases
- Generics básicos
- Union y intersection types
- Type assertions básicos

**Nivel 2: Intermedio (Mid)**
- Type inference y contextual typing
- Utility types comunes
- Type guards y narrowing
- Decorators básicos
- Configuración de tsconfig

**Nivel 3: Avanzado (Senior)**
- Conditional types
- Mapped types
- Template literal types
- Advanced generics
- Type-level programming
- Compiler API

**Nivel 4: Experto (Staff/Principal)**
- Diseño de sistemas de tipos complejos
- Arquitectura type-safe
- Optimización de compilador
- Contribución al ecosistema
- Mentoría y liderazgo técnico

### Checklist completo Senior TypeScript

#### Fundamentos
- [ ] Entiende type erasure y sus implicaciones
- [ ] Conoce la arquitectura del compilador
- [ ] Sabe cómo funciona el type checker
- [ ] Entiende structural vs nominal typing
- [ ] Conoce el sistema de módulos de TypeScript

#### Sistema de tipos
- [ ] Domina todos los tipos primitivos
- [ ] Usa literal types efectivamente
- [ ] Entiende union y intersection types
- [ ] Usa tuple types correctamente
- [ ] Conoce la diferencia entre enum y const enum
- [ ] Usa unknown en lugar de any
- [ ] Entiende never y sus casos de uso
- [ ] Usa branded types para nominal typing

#### Type inference
- [ ] Entiende contextual typing
- [ ] Conoce el algoritmo de best common type
- [ ] Sabe cuando ocurre widening/narrowing
- [ ] Usa control flow analysis efectivamente
- [ ] Escribe type guards personalizados
- [ ] Usa assertion functions
- [ ] Implementa exhaustiveness checking

#### Generics
- [ ] Usa generic constraints correctamente
- [ ] Entiende default generics
- [ ] Conoce variance (covariance, contravariance)
- [ ] Implementa generic inference
- [ ] Usa recursive generics
- [ ] Diseña generic factories
- [ ] Implementa generic repositories

#### Utility types
- [ ] Conoce todos los utility types built-in
- [ ] Puede implementar Partial, Required, Readonly manualmente
- [ ] Usa Pick y Omit efectivamente
- [ ] Entiende Record, Exclude, Extract
- [ ] Usa ReturnType, Parameters
- [ ] Conoce Awaited y ThisType

#### Advanced types
- [ ] Domina conditional types
- [ ] Usa el keyword infer correctamente
- [ ] Implementa mapped types avanzados
- [ ] Usa template literal types
- [ ] Hace type-level computation
- [ ] Implementa recursive types
- [ ] Usa key remapping en mapped types

#### Architecture
- [ ] Diseña sistemas type-safe
- [ ] Implementa domain modeling con tipos
- [ ] Usa DDD con TypeScript
- [ ] Implementa repository pattern tipado
- [ ] Usa factory pattern tipado
- [ ] Implementa strategy pattern tipado
- [ ] Diseña event sourcing tipado
- [ ] Implementa CQRS tipado

#### APIs
- [ ] Diseña APIs type-safe end-to-end
- [ ] Define API contracts con TypeScript
- [ ] Usa DTOs correctamente
- [ ] Implementa runtime validation
- [ ] Usa Zod, io-ts, o similar
- [ ] Integra con OpenAPI
- [ ] Usa GraphQL codegen
- [ ] Entiende tRPC

#### Runtime vs Compile-time
- [ ] Entiende type erasure completamente
- [ ] Sabe qué existe en runtime
- [ ] Conoce límites de reflection
- [ ] Valida en boundaries correctamente
- [ ] Genera schemas de validación

#### Performance
- [ ] Optimiza el compilador TypeScript
- [ ] Usa project references
- [ ] Implementa incremental compilation
- [ ] Optimiza type complexity
- [ ] Evita slow compiler traps

#### Testing
- [ ] Escribe type tests con tsd
- [ ] Usa compile-time tests
- [ ] Integra TypeScript con Vitest
- [ ] Escribe mocks type-safe
- [ ] Implementa testing patterns type-safe

#### Monorepos
- [ ] Usa project references en monorepos
- [ ] Comparte tipos entre paquetes
- [ ] Define package boundaries
- [ ] Usa path aliases
- [ ] Orquesta builds con Nx o Turborepo

#### Errores comunes
- [ ] Evita type widening accidental
- [ ] Previene any leaks
- [ ] Evita unsafe assertions
- [ ] Evita over-engineering types
- [ ] Previene recursive explosion
- [ ] Evita slow compiler traps
- [ ] Corrige incorrect narrowing
- [ ] Previene API unsafety

### Recursos recomendados

**Libros:**
- "Programming TypeScript" por Boris Cherny
- "TypeScript Quickly" por Yakov Fain y Anton Moiseev
- "Effective TypeScript" por Dan Vanderkam

**Documentación oficial:**
- TypeScript Handbook
- TypeScript Deep Dive
- TypeScript Compiler API

**Herramientas:**
- TypeScript Playground
- tsd para type testing
- ts-to-zod para generar schemas
- type-fest para tipos utility

**Comunidades:**
- TypeScript Discord
- r/typescript
- TypeScript GitHub Discussions

---

## Conclusión

Para convertirse en un Senior en TypeScript, necesitas:

1. **Dominar los fundamentos**: Entender cómo funciona el compilador internamente
2. **Conocer el sistema de tipos profundamente**: No solo usarlo, entenderlo
3. **Pensar en términos de arquitectura**: Diseñar sistemas type-safe escalables
4. **Optimizar para performance**: Mantener el compilador rápido
5. **Validar en boundaries**: Distinguir entre compile-time y runtime
6. **Mentorar a otros**: Compartir conocimiento y mejores prácticas

TypeScript es más que un transpilador: es una herramienta de diseño que te permite modelar tu dominio de manera precisa y segura. Dominarlo a nivel Senior requiere años de práctica y estudio continuo.

---

**Fin de la guía TypeScript Senior**

# TypeScript Senior - Parte 6: Type-safe APIs + Runtime vs Compile-time

## Type-safe APIs

### End-to-end type safety

Type safety de extremo a extremo entre frontend y backend:

```typescript
// Shared types package (types package)
// src/types/user.ts
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface CreateUserRequest {
  name: string;
  email: string;
}

export interface CreateUserResponse {
  user: User;
}

// Backend API
// backend/src/routes/users.ts
import { User, CreateUserRequest, CreateUserResponse } from "@myapp/types";

app.post("/users", async (req: CreateUserRequest, res: Response<CreateUserResponse>) => {
  const user = await userService.create(req.body);
  res.json({ user });
});

// Frontend API client
// frontend/src/api/users.ts
import { User, CreateUserRequest, CreateUserResponse } from "@myapp/types";

const apiClient = {
  async createUser(data: CreateUserRequest): Promise<CreateUserResponse> {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};

// Uso en frontend
const result = await apiClient.createUser({ name: "John", email: "john@example.com" });
console.log(result.user.name); // Type-safe
```

### API contracts

Contratos de API con TypeScript:

```typescript
// API Contract definition
interface ApiContract {
  "/users": {
    GET: {
      response: User[];
      query?: { page?: number; limit?: number };
    };
    POST: {
      request: CreateUserRequest;
      response: CreateUserResponse;
    };
  };
  "/users/:id": {
    GET: {
      response: User;
    };
    PUT: {
      request: Partial<User>;
      response: User;
    };
    DELETE: {
      response: { success: boolean };
    };
  };
}

// Type-safe client generator
type ApiClient<T extends ApiContract> = {
  [Path in keyof T]: {
    [Method in keyof T[Path]]: (
      args: T[Path][Method] extends { request: infer R } ? R : never
    ) => Promise<T[Path][Method] extends { response: infer R } ? R : never>;
  };
};

// Generated client
const client: ApiClient<ApiContract> = {
  "/users": {
    GET: async (query) => {
      const response = await fetch(`/users?page=${query?.page}`);
      return response.json();
    },
    POST: async (data) => {
      const response = await fetch("/users", {
        method: "POST",
        body: JSON.stringify(data)
      });
      return response.json();
    }
  },
  "/users/:id": {
    GET: async () => {
      const response = await fetch("/users/1");
      return response.json();
    },
    PUT: async (data) => {
      const response = await fetch("/users/1", {
        method: "PUT",
        body: JSON.stringify(data)
      });
      return response.json();
    },
    DELETE: async () => {
      const response = await fetch("/users/1", { method: "DELETE" });
      return response.json();
    }
  }
};
```

### DTO typing

Data Transfer Objects tipados:

```typescript
// Domain entity
class User {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    private passwordHash: string,
    public readonly createdAt: Date
  ) {}

  static create(name: string, email: string, password: string): User {
    return new User(
      crypto.randomUUID(),
      name,
      email,
      this.hashPassword(password),
      new Date()
    );
  }

  private static hashPassword(password: string): string {
    return bcrypt.hashSync(password, 10);
  }

  verifyPassword(password: string): boolean {
    return bcrypt.compareSync(password, this.passwordHash);
  }

  toDTO(): UserDTO {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      createdAt: this.createdAt.toISOString()
    };
  }

  static fromDTO(dto: CreateUserDTO): User {
    return User.create(dto.name, dto.email, dto.password);
  }
}

// DTOs
interface UserDTO {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
}

interface UpdateUserDTO {
  name?: string;
  email?: string;
}

// Mapper
class UserMapper {
  static toDomain(dto: UserDTO): User {
    return new User(
      dto.id,
      dto.name,
      dto.email,
      "", // Password not in DTO
      new Date(dto.createdAt)
    );
  }

  static toDTO(user: User): UserDTO {
    return user.toDTO();
  }
}
```

### Runtime validation + static typing

Validación runtime con tipos estáticos:

```typescript
// Zod integration
import { z } from "zod";

// Schema definition
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3).max(100),
  email: z.string().email(),
  createdAt: z.date()
});

const CreateUserSchema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email(),
  password: z.string().min(8)
});

// Infer types from schemas
type User = z.infer<typeof UserSchema>;
type CreateUser = z.infer<typeof CreateUserSchema>;

// Validation function
function validateCreateUser(data: unknown): CreateUser {
  return CreateUserSchema.parse(data);
}

// API endpoint
app.post("/users", (req, res) => {
  try {
    const validated = validateCreateUser(req.body);
    const user = userService.create(validated);
    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});
```

### Zod

Zod para validación de tipos:

```typescript
import { z } from "zod";

// Basic schemas
const stringSchema = z.string();
const numberSchema = z.number();
const booleanSchema = z.boolean();

// Object schemas
const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3),
  email: z.string().email(),
  age: z.number().min(18).optional()
});

// Array schemas
const usersSchema = z.array(userSchema);

// Union schemas
const statusSchema = z.union([
  z.literal("pending"),
  z.literal("active"),
  z.literal("inactive")
]);

// Discriminated unions
const eventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("click"),
    x: z.number(),
    y: z.number()
  }),
  z.object({
    type: z.literal("keypress"),
    key: z.string()
  })
]);

// Transformations
const emailSchema = z.string().email().transform(val => val.toLowerCase());

// Refinements
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain uppercase letter")
  .regex(/[0-9]/, "Must contain number");

// Custom validation
const usernameSchema = z.string()
  .refine(
    val => !val.includes("admin"),
    { message: "Username cannot contain 'admin'" }
  );

// Schema composition
const baseSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date()
});

const userWithBase = baseSchema.extend({
  name: z.string(),
  email: z.string().email()
});

// Partial schema
const partialUser = userSchema.partial();

// Required schema
const requiredUser = userSchema.required();

// Pick schema
const userNameEmail = userSchema.pick({ name: true, email: true });

// Omit schema
const userWithoutId = userSchema.omit({ id: true });
```

### io-ts

io-ts para validación funcional:

```typescript
import * as t from "io-ts";
import { PathReporter } from "io-ts/PathReporter";
import { either } from "fp-ts/lib/Either";

// Basic codecs
const stringCodec = t.string;
const numberCodec = t.number;

// Object codec
const UserCodec = t.type({
  id: t.string,
  name: t.string,
  email: t.string,
  age: t.union([t.number, t.undefined])
});

// Array codec
const UsersCodec = t.array(UserCodec);

// Union codec
const StatusCodec = t.union([
  t.literal("pending"),
  t.literal("active"),
  t.literal("inactive")
]);

// Intersection codec
const WithTimestamp = t.type({
  createdAt: t.string
});

const UserWithTimestamp = t.intersection([UserCodec, WithTimestamp]);

// Validation
function validateUser(data: unknown) {
  const result = UserCodec.decode(data);
  if (either.isLeft(result)) {
    throw new Error(PathReporter.report(result).join("\n"));
  }
  return result.right;
}

// Infer type
type User = t.TypeOf<typeof UserCodec>;
```

### Valibot

Valibot para validación ligera:

```typescript
import { object, string, number, minLength, email } from "valibot";

// Schema definition
const userSchema = object({
  id: string(),
  name: string([minLength(3)]),
  email: string([email()]),
  age: number()
});

// Validation
function validate(data: unknown) {
  const result = userSchema(data);
  if (result.issues) {
    throw new Error(result.issues.map(i => i.message).join(", "));
  }
  return result.output;
}

// Infer type
type User = typeof userSchema.output;
```

### TypeBox

TypeBox para JSON Schema + TypeScript:

```typescript
import { Type, Static } from "@sinclair/typebox";

// Schema definition
const UserSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  name: Type.String({ minLength: 3 }),
  email: Type.String({ format: "email" }),
  age: Type.Optional(Type.Number({ minimum: 0 }))
});

// Generate JSON Schema
const jsonSchema = UserSchema;

// Infer type
type User = Static<typeof UserSchema>;

// Validation
import { Value } from "@sinclair/typebox/value";

function validate(data: unknown): User {
  if (Value.Check(UserSchema, data)) {
    return data as User;
  }
  const errors = [...Value.Errors(UserSchema, data)];
  throw new Error(errors.map(e => e.message).join(", "));
}
```

### OpenAPI + TypeScript

OpenAPI con TypeScript:

```typescript
// openapi.yaml
openapi: 3.0.0
info:
  title: User API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
    post:
      summary: Create user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        email:
          type: string
          format: email
    CreateUserRequest:
      type: object
      required:
        - name
        - email
      properties:
        name:
          type: string
        email:
          type: string
          format: email

// Generate TypeScript types with openapi-typescript
// npm install -D openapi-typescript
// npx openapi-typescript openapi.yaml -o src/types/api.ts

// Generated types
// src/types/api.ts
export interface paths {
  "/users": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["User"][];
          };
        };
      };
    };
    post: {
      requestBody: {
        content: {
          "application/json": components["schemas"]["CreateUserRequest"];
        };
      };
      responses: {
        201: {
          content: {
            "application/json": components["schemas"]["User"];
          };
        };
      };
    };
  };
}

export interface components {
  schemas: {
    User: {
      id: string;
      name: string;
      email: string;
    };
    CreateUserRequest: {
      name: string;
      email: string;
    };
  };
}
```

### GraphQL codegen

GraphQL codegen con TypeScript:

```typescript
// schema.graphql
type User {
  id: ID!
  name: String!
  email: String!
}

type Query {
  user(id: ID!): User
  users: [User!]!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
}

input CreateUserInput {
  name: String!
  email: String!
}

// codegen.yml
schema: schema.graphql
generates:
  src/types/graphql.ts:
    plugins:
      - typescript
      - typescript-operations
    config:
      scalars:
        ID: string
  src/graphql/sdk.ts:
    plugins:
      - typescript
      - typescript-operations
      - typescript-graphql-request
    config:
      scalars:
        ID: string

// Generated types
// src/types/graphql.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
}

export interface CreateUserMutationVariables {
  input: CreateUserInput;
}

export interface CreateUserMutation {
  createUser: User;
}

// Usage
import { getSdk } from "./graphql/sdk";
import { GraphQLClient } from "graphql-request";

const client = new GraphQLClient("http://localhost:4000/graphql");
const sdk = getSdk(client);

const result = await sdk.createUser({
  input: { name: "John", email: "john@example.com" }
});

console.log(result.createUser.name); // Type-safe
```

### tRPC internals

tRPC para type-safe APIs sin schemas:

```typescript
// Backend
// server/trpc.ts
import { initTRPC } from "@trpc/server";
import * as trpcNext from "@trpc/server/adapters/next";

const t = initTRPC.create();

// Context
interface Context {
  user?: { id: string };
}

function createContext(): Context {
  return { user: { id: "1" } };
}

// Procedures
const appRouter = t.router({
  user: t.router({
    get: t.procedure
      .input((val: unknown) => {
        if (typeof val === "string") return val;
        throw new Error("Invalid input");
      })
      .query(({ input }) => {
        return { id: input, name: "John", email: "john@example.com" };
      }),
    create: t.procedure
      .input(z => z.object({
        name: z.string(),
        email: z.string().email()
      }))
      .mutation(({ input }) => {
        return { id: "1", ...input };
      })
  })
});

export type AppRouter = typeof appRouter;

// API handler
export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext
});

// Frontend
// client/trpc.ts
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../server/trpc";

const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "http://localhost:3000/api/trpc"
    })
  ]
});

// Usage - fully type-safe
const user = await trpc.user.get.query("1");
console.log(user.name); // Type-safe

const created = await trpc.user.create.mutate({
  name: "John",
  email: "john@example.com"
});
console.log(created.id); // Type-safe
```

---

## Runtime vs Compile-time

### Type erasure

TypeScript elimina todos los tipos en runtime:

```typescript
// TypeScript code
interface User {
  name: string;
  age: number;
}

function greet(user: User): string {
  return `Hello, ${user.name}`;
}

// Compiled JavaScript (no types)
function greet(user) {
  return "Hello, " + user.name;
}

// Generics also erased
function identity<T>(value: T): T {
  return value;
}

// Compiled to
function identity(value) {
  return value;
}
```

### Qué existe en runtime

En runtime solo existe JavaScript:

```typescript
// Existen en runtime:
// - Primitives: string, number, boolean, null, undefined, symbol, bigint
// - Objects: arrays, functions, dates, etc.
// - Classes (como funciones constructoras)

// NO existen en runtime:
// - Interfaces
// - Type aliases
// - Generics
// - Union types
// - Intersection types
// - Conditional types
// - Mapped types
// - Decorators metadata (sin reflect-metadata)

// Ejemplo:
interface User {
  name: string;
  age: number;
}

const user: User = { name: "John", age: 30 };

console.log(typeof user); // "object"
console.log(user instanceof User); // Error - User no existe en runtime
```

### Qué no existe

```typescript
// Interfaces no existen
interface User {
  name: string;
}

// Type aliases no existen
type ID = string;

// Generics no existen
function identity<T>(value: T): T {
  return value;
}

// Union types no existen
type StringOrNumber = string | number;

// Decorators metadata (sin reflect-metadata)
class MyClass {
  @log
  method() {}
}

// En runtime, MyClass es solo una función
console.log(MyClass); // [Function: MyClass]
console.log(MyClass.method); // undefined (sin metadata)
```

### Reflection limits

TypeScript tiene limitaciones de reflection:

```typescript
import "reflect-metadata";

// Con reflect-metadata, puedes obtener metadata limitada
class User {
  name: string;
  age: number;
}

// Obtener tipos de propiedades (solo primitivos)
const nameType = Reflect.getMetadata("design:type", User.prototype, "name");
console.log(nameType); // String

const ageType = Reflect.getMetadata("design:type", User.prototype, "age");
console.log(ageType); // Number

// LIMITACIONES:
// - No puedes obtener tipos complejos (interfaces, unions, etc.)
// - No puedes obtener tipos genéricos
// - No puedes obtener tipos de retorno de funciones complejas
// - No puedes obtener tipos de parámetros de funciones complejas

// Ejemplo de limitación:
interface ComplexType {
  nested: {
    value: string;
  };
}

class MyClass {
  complex: ComplexType;
}

const complexType = Reflect.getMetadata("design:type", MyClass.prototype, "complex");
console.log(complexType); // Object (no ComplexType)
```

### Validation boundaries

La validación debe ocurrir en boundaries:

```typescript
// Boundary 1: API input
app.post("/users", (req, res) => {
  // Validar aquí
  const validated = validateCreateUser(req.body);
  // Después de validar, TypeScript puede inferir tipos
  const user: User = validated;
});

// Boundary 2: Database output
const dbUser = await db.query("SELECT * FROM users WHERE id = $1", [id]);
// Validar aquí
const validated = validateUser(dbUser);
const user: User = validated;

// Boundary 3: External API response
const response = await fetch("https://api.example.com/user");
const data = await response.json();
// Validar aquí
const validated = validateExternalUser(data);
const user: User = validated;

// Dentro de la aplicación, asume datos validados
function processUser(user: User) {
  // No necesitas validar aquí
  console.log(user.name.toUpperCase());
}
```

### Runtime schema generation

Generar schemas de validación desde tipos:

```typescript
// TypeScript types
interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
}

// Generar Zod schema desde types
import { z } from "zod";

function generateSchema<T>(type: T): z.ZodType<T> {
  // Esta es una simplificación - en realidad necesitarías
  // un sistema más complejo o usar herramientas como ts-to-zod
  return z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    age: z.number().optional()
  }) as z.ZodType<T>;
}

// Usar ts-to-zod
// npm install -D ts-to-zod
// npx ts-to-zod src/types/user.ts src/schemas/user.ts

// Generado automáticamente por ts-to-zod
export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().optional()
});

export type User = z.infer<typeof UserSchema>;
```

---

**Continúa en Parte 7: Performance + Testing + Monorepos**

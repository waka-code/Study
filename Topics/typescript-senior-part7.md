# TypeScript Senior - Parte 7: Performance + Testing + Monorepos

## Performance y optimización

### Compiler performance

Optimización del compilador TypeScript:

```typescript
// tsconfig.json optimizado
{
  "compilerOptions": {
    // Opciones de performance
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo",
    
    // Skip lib check para dependencies
    "skipLibCheck": true,
    
    // Solo incluir archivos necesarios
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "**/*.test.ts"],
    
    // Usar project references para monorepos grandes
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    
    // Optimizaciones adicionales
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Large codebases optimization

Optimización para codebases grandes:

```typescript
// Usar project references
// tsconfig.json (root)
{
  "files": [],
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/ui" },
    { "path": "./packages/api" }
  ]
}

// packages/core/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": []
}

// packages/ui/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../core" }
  ]
}

// Compilar solo lo necesario
// tsc --build packages/ui
```

### Project references

Project references para mejor performance:

```typescript
// Estructura
my-monorepo/
├── packages/
│   ├── shared/
│   │   ├── tsconfig.json
│   │   └── src/
│   ├── backend/
│   │   ├── tsconfig.json
│   │   └── src/
│   └── frontend/
│       ├── tsconfig.json
│       └── src/
└── tsconfig.json

// tsconfig.json (root)
{
  "files": [],
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/backend" },
    { "path": "./packages/frontend" }
  ]
}

// packages/shared/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}

// packages/backend/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist"
  },
  "references": [
    { "path": "../shared" }
  ],
  "include": ["src/**/*"]
}

// Compilar en orden de dependencias
// tsc --build --verbose
```

### Build performance

Optimización de build:

```typescript
// Usar esbuild/swc para transpilación rápida
// esbuild.config.js
const esbuild = require("esbuild");

esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node16",
  outfile: "dist/index.js",
  tsconfig: "tsconfig.json"
}).catch(() => process.exit(1));

// Usar swc
// .swcrc
{
  "$schema": "https://json.schemastore.org/swcrc",
  "jsc": {
    "parser": {
      "syntax": "typescript",
      "tsx": false
    },
    "transform": {
      "react": {
        "runtime": "automatic"
      }
    }
  },
  "module": {
    "type": "commonjs"
  }
}
```

### Incremental builds

Builds incrementales:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  }
}

// El archivo .tsbuildinfo cachea:
// - AST de cada archivo
// - Símbolos
// - Información de tipos
// - Timestamps

// Solo recompila archivos modificados
```

### Type complexity optimization

Reducir complejidad de tipos:

```typescript
// EVITAR: Tipos excesivamente complejos
type BadType = DeepPartial<
  DeepReadonly<
    Required<
      Omit<
        User,
        "password"
      > & {
        metadata: {
          [K in keyof Metadata as K extends string ? Uppercase<K> : never]: Metadata[K]
        }
      }
    >
  >
>;

// MEJOR: Dividir en tipos más simples
type SafeUser = Omit<User, "password">;
type ReadonlyUser = Readonly<SafeUser>;
type RequiredUser = Required<ReadonlyUser>;
type FinalUser = DeepPartial<RequiredUser>;

// EVITAR: Conditional types anidados excesivamente
type BadConditional<T> = T extends string
  ? T extends `${infer A}-${infer B}`
    ? B extends "foo"
      ? A
      : never
    : never
  : never;

// MEJOR: Usar type guards y funciones auxiliares
function isFooBar<T extends string>(value: T): value is `${string}-foo` {
  return value.endsWith("-foo");
}
```

### Avoiding compiler slowdowns

Evitar que el compilador se ralentice:

```typescript
// EVITAR: Archivos muy grandes
// archivo.ts (5000+ líneas) → Mover a múltiples archivos

// EVITAR: Imports circulares
// fileA.ts imports fileB.ts
// fileB.ts imports fileA.ts
// → Reorganizar arquitectura

// EVITAR: Tipos en archivos .d.ts complejos
// types.d.ts (1000+ líneas de tipos) → Mover a archivos específicos

// EVITAR: Usar any para "solucionar" errores
const data: any = response; // → Define tipos correctamente

// USAR: Path aliases para imports más limpios
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@components/*": ["components/*"],
      "@utils/*": ["utils/*"],
      "@types/*": ["types/*"]
    }
  }
}

// USAR: skipLibCheck para dependencies
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

---

## Testing con TypeScript

### Type testing

Testing de tipos con TypeScript:

```typescript
// Usar tsd para type testing
// npm install -D tsd

// test/types.ts
import { expectType } from "tsd";
import { User, createUser } from "../src/user";

// Test de tipos
expectType<User>(createUser("John", "john@example.com"));

// Test de errores de tipo
expectError(createUser(123, "john@example.com"));

// Test de tipos genéricos
expectType<ReturnType<typeof createUser>>({
  id: expectType<string>(),
  name: expectType<string>(),
  email: expectType<string>(),
  createdAt: expectType<Date>()
});
```

### Compile-time tests

Tests en tiempo de compilación:

```typescript
// Compile-time assertions
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
  ? true
  : false;

// Test: Verificar que dos tipos son iguales
type Test1 = Equal<string, string>; // true
type Test2 = Equal<string, number>; // false

// Compile-time function
function assertType<T>(value: T): T {
  return value;
}

// Uso
const user = assertType<User>({
  id: "1",
  name: "John",
  email: "john@example.com",
  createdAt: new Date()
});

// Error en compile-time si el tipo no coincide
// const bad = assertType<User>({ id: 1 }); // Error
```

### tsd

tsd para type testing:

```typescript
// package.json
{
  "scripts": {
    "test:types": "tsd"
  }
}

// test/types.ts
import { expectType, expectError, expectAssignable } from "tsd";
import { User, createUser, getUser } from "../src/user";

// Test de retorno
expectType<User>(createUser("John", "john@example.com"));

// Test de parámetros
expectError(createUser(123, "john@example.com"));

// Test de asignabilidad
expectAssignable<{ id: string }>({ id: "1" });

// Test de tipos condicionales
expectType<"user" | "admin">("user");
expectError<"user" | "admin">("superadmin");
```

### Vitest + TS

Vitest con TypeScript:

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    typecheck: {
      tsconfig: "./tsconfig.json"
    }
  }
});

// user.test.ts
import { describe, it, expect } from "vitest";
import { createUser, User } from "./user";

describe("User", () => {
  it("should create a user", () => {
    const user = createUser("John", "john@example.com");
    expect(user).toBeInstanceOf(User);
    expect(user.name).toBe("John");
  });

  it("should validate email", () => {
    expect(() => createUser("John", "invalid")).toThrow();
  });
});
```

### Mock typing

Tipado de mocks:

```typescript
// Usar vi.fn() de vitest
import { vi, describe, it, expect } from "vitest";
import { UserService } from "./user.service";

describe("UserService", () => {
  it("should call repository", async () => {
    const mockRepository = {
      findById: vi.fn(),
      save: vi.fn()
    };

    mockRepository.findById.mockResolvedValue({
      id: "1",
      name: "John",
      email: "john@example.com",
      createdAt: new Date()
    });

    const service = new UserService(mockRepository);
    const user = await service.getUser("1");

    expect(mockRepository.findById).toHaveBeenCalledWith("1");
    expect(user.name).toBe("John");
  });
});

// Tipado explícito de mocks
interface MockRepository {
  findById: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
}

const mockRepository: MockRepository = {
  findById: vi.fn(),
  save: vi.fn()
};
```

### Type-safe testing patterns

Patrones de testing type-safe:

```typescript
// Pattern 1: Test factories tipados
function createTestUser(overrides: Partial<User> = {}): User {
  return {
    id: overrides.id || "test-id",
    name: overrides.name || "Test User",
    email: overrides.email || "test@example.com",
    createdAt: overrides.createdAt || new Date()
  };
}

// Pattern 2: Test data builders
class UserBuilder {
  private user: Partial<User> = {};

  withId(id: string): this {
    this.user.id = id;
    return this;
  }

  withName(name: string): this {
    this.user.name = name;
    return this;
  }

  withEmail(email: string): this {
    this.user.email = email;
    return this;
  }

  build(): User {
    return {
      id: this.user.id || "test-id",
      name: this.user.name || "Test User",
      email: this.user.email || "test@example.com",
      createdAt: this.user.createdAt || new Date()
    };
  }
}

// Pattern 3: Type-safe fixtures
const fixtures = {
  users: {
    john: new UserBuilder().withName("John").withEmail("john@example.com").build(),
    jane: new UserBuilder().withName("Jane").withEmail("jane@example.com").build()
  }
};
```

---

## Monorepos y TypeScript escalable

### Project references

Project references en monorepos:

```typescript
// Estructura de monorepo
my-monorepo/
├── packages/
│   ├── types/
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── tsconfig.json
│   ├── utils/
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── tsconfig.json
│   └── app/
│       ├── src/
│       │   └── index.ts
│       └── tsconfig.json
├── tsconfig.json
└── package.json

// tsconfig.json (root)
{
  "files": [],
  "references": [
    { "path": "./packages/types" },
    { "path": "./packages/utils" },
    { "path": "./packages/app" }
  ]
}

// packages/types/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}

// packages/utils/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist"
  },
  "references": [
    { "path": "../types" }
  ],
  "include": ["src/**/*"]
}

// packages/app/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist"
  },
  "references": [
    { "path": "../types" },
    { "path": "../utils" }
  ],
  "include": ["src/**/*"]
}
```

### Shared types

Tipos compartidos en monorepo:

```typescript
// packages/types/src/index.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
}

export interface CreateUserResponse {
  user: User;
}

// packages/types/package.json
{
  "name": "@myapp/types",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  }
}

// Usar en otros paquetes
// packages/utils/src/index.ts
import { User } from "@myapp/types";

export function formatUser(user: User): string {
  return `${user.name} (${user.email})`;
}
```

### Package boundaries

Definir boundaries entre paquetes:

```typescript
// Usar path aliases para imports limpios
// packages/app/tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@myapp/types": ["../types/src"],
      "@myapp/utils": ["../utils/src"]
    }
  }
}

// O usar package.json workspaces
// package.json (root)
{
  "private": true,
  "workspaces": [
    "packages/*"
  ]
}

// Instalar dependencies locales
// npm install
// Esto crea symlinks en node_modules
```

### Path aliases

Path aliases en monorepo:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"],
      "@shared/*": ["../shared/src/*"]
    }
  }
}

// Uso en código
import { Button } from "@components/Button";
import { formatDate } from "@utils/date";
import { User } from "@types/user";
import { sharedUtil } from "@shared/util";
```

### Build orchestration

Orquestación de builds:

```typescript
// Usar turborepo o nx
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    }
  }
}

// nx.json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "test", "lint"]
      }
    }
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"]
    }
  }
}
```

### Nx

Nx para monorepos con TypeScript:

```typescript
// Crear monorepo con Nx
// npx create-nx-workspace@latest my-workspace --preset=ts

// nx.json
{
  "extends": "nx/presets/npm.json",
  "npmScope": "myapp",
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "test", "lint", "type-check"]
      }
    }
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["{projectRoot}/dist"]
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}

// Generar librería
// npx g @nx/js:lib my-lib --directory=packages/my-lib

// Ejecutar commands
// nx run my-lib:build
// nx run my-lib:test
// nx affected:build
// nx affected:test
```

### Turborepo

Turborepo para monorepos rápidos:

```typescript
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}

// package.json (root)
{
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check"
  },
  "workspaces": [
    "packages/*"
  ],
  "devDependencies": {
    "turbo": "latest"
  }
}

// Ejecutar
// turbo run build
// turbo run test --filter=my-app
// turbo run build --filter=...my-lib
```

---

**Continúa en Parte 8: Errores comunes + Entrevistas + Roadmap**

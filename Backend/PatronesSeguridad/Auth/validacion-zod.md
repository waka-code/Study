# Validación con Zod - Schema Validation TypeScript-first

> **Concepto clave:**
> Zod es una biblioteca de validación y parsing de schemas TypeScript-first que garantiza type safety en runtime.

---

## ¿Por qué Zod?

### Ventajas ✅

- **TypeScript-first**: Los tipos se infieren automáticamente del schema
- **Zero dependencies**: Librería ligera (~8kb minified)
- **Runtime validation**: Valida datos en tiempo de ejecución
- **Composable**: Schemas reutilizables y combinables
- **Error messages**: Mensajes de error detallados y customizables
- **Funciona en Node.js y browser**

### vs Alternativas

| Librería | TypeScript | Runtime | Bundle Size | Type Inference |
|----------|------------|---------|-------------|----------------|
| **Zod** | ✅ Nativo | ✅ | ~8KB | ✅ Automático |
| Yup | ⚠️ @types | ✅ | ~15KB | ❌ Manual |
| Joi | ❌ No | ✅ | ~145KB | ❌ No |
| class-validator | ⚠️ Decorators | ✅ | Variable | ⚠️ Parcial |

---

## Instalación

```bash
npm install zod
```

---

## Conceptos Básicos

### 1. Tipos Primitivos

```typescript
import { z } from 'zod';

// String
const nameSchema = z.string();
nameSchema.parse('John'); // ✅ OK
nameSchema.parse(123); // ❌ Error: Expected string, received number

// Number
const ageSchema = z.number();
ageSchema.parse(25); // ✅ OK

// Boolean
const isActiveSchema = z.boolean();

// Date
const createdAtSchema = z.date();

// Undefined, Null
const undefinedSchema = z.undefined();
const nullSchema = z.null();
```

### 2. String Validations

```typescript
const emailSchema = z.string().email();
const urlSchema = z.string().url();
const uuidSchema = z.string().uuid();

// Length constraints
const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters');

// Regex
const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/);

// Transform
const trimmedSchema = z.string().trim();
const lowercaseSchema = z.string().toLowerCase();
```

### 3. Number Validations

```typescript
const positiveSchema = z.number().positive();
const nonNegativeSchema = z.number().nonnegative();
const integerSchema = z.number().int();

// Min/Max
const ageSchema = z.number().min(0).max(120);

// Multiple of
const evenSchema = z.number().multipleOf(2);

// Finite (no Infinity)
const finiteSchema = z.number().finite();
```

### 4. Objects

```typescript
const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).max(120),
  role: z.enum(['admin', 'user', 'guest']),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string()), // { [key: string]: string }
});

// Inferir tipo TypeScript del schema
type User = z.infer<typeof userSchema>;
// Equivalente a:
// type User = {
//   id: string;
//   name: string;
//   email: string;
//   age: number;
//   role: 'admin' | 'user' | 'guest';
//   isActive: boolean;
//   metadata: Record<string, string>;
// }

// Validar
const result = userSchema.safeParse({
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  role: 'user',
  isActive: true,
  metadata: { country: 'USA' },
});

if (result.success) {
  console.log(result.data); // Typed as User
} else {
  console.log(result.error.errors);
}
```

### 5. Arrays

```typescript
const numbersSchema = z.array(z.number());
numbersSchema.parse([1, 2, 3]); // ✅ OK

// Min/Max length
const tagsSchema = z.array(z.string()).min(1).max(10);

// Non-empty array
const categoriesSchema = z.array(z.string()).nonempty();
```

### 6. Tuples

```typescript
const coordinatesSchema = z.tuple([z.number(), z.number()]);
coordinatesSchema.parse([40.7128, -74.006]); // ✅ OK
```

### 7. Enums

```typescript
const roleSchema = z.enum(['admin', 'user', 'guest']);
type Role = z.infer<typeof roleSchema>; // 'admin' | 'user' | 'guest'

// Native enum
enum Status {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
}
const statusSchema = z.nativeEnum(Status);
```

### 8. Unions

```typescript
const stringOrNumberSchema = z.union([z.string(), z.number()]);
stringOrNumberSchema.parse('hello'); // ✅ OK
stringOrNumberSchema.parse(42); // ✅ OK

// Shorthand
const stringOrNumber = z.string().or(z.number());
```

### 9. Optional y Nullable

```typescript
const optionalStringSchema = z.string().optional(); // string | undefined
const nullableStringSchema = z.string().nullable(); // string | null
const nullishStringSchema = z.string().nullish(); // string | null | undefined
```

---

## Uso en Express/Node.js

### Middleware de Validación

```typescript
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Schema para registro de usuario
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  age: z.number().min(18, 'Must be at least 18 years old').optional(),
});

// Middleware de validación genérico
function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    // Reemplazar req.body con datos validados y parseados
    req.body = result.data;
    next();
  };
}

// Uso en ruta
app.post('/register', validateBody(registerSchema), async (req, res) => {
  // req.body es tipo-seguro aquí
  const { email, password, name, age } = req.body;

  // Crear usuario...
  res.json({ message: 'User registered successfully' });
});
```

### Validación de Query Params

```typescript
const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: result.error.errors,
      });
    }

    req.query = result.data as any;
    next();
  };
}

app.get('/users', validateQuery(paginationSchema), async (req, res) => {
  const { page, limit, sortBy, order } = req.query;
  // page y limit son números aquí (transformados)

  // Fetch users con paginación...
  res.json({ users: [], page, limit });
});
```

---

## Uso en Next.js (Server Actions)

```typescript
'use server';

import { z } from 'zod';

const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  published: z.boolean().default(false),
  tags: z.array(z.string()).max(5, 'Maximum 5 tags allowed'),
});

export async function createPost(formData: FormData) {
  const rawData = {
    title: formData.get('title'),
    content: formData.get('content'),
    published: formData.get('published') === 'true',
    tags: formData.getAll('tags'),
  };

  const result = createPostSchema.safeParse(rawData);

  if (!result.success) {
    return {
      error: result.error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      })),
    };
  }

  const { title, content, published, tags } = result.data;

  // Guardar en database...
  return { success: true, postId: '123' };
}
```

---

## Transformaciones

```typescript
// Trim y lowercase
const emailSchema = z.string().email().trim().toLowerCase();

// Custom transform
const dateSchema = z.string().transform((str) => new Date(str));

// Parse número de string
const ageSchema = z.string().regex(/^\d+$/).transform(Number);

// Conditional transform
const priceSchema = z.number().transform((price) => {
  return Math.round(price * 100) / 100; // 2 decimales
});
```

---

## Refinements (Validaciones Custom)

```typescript
const passwordSchema = z.string()
  .min(8)
  .refine((password) => /[A-Z]/.test(password), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((password) => /[a-z]/.test(password), {
    message: 'Password must contain at least one lowercase letter',
  })
  .refine((password) => /[0-9]/.test(password), {
    message: 'Password must contain at least one number',
  });

// Validación dependiente de múltiples campos
const signupSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'], // Especifica qué campo tiene el error
});
```

---

## Error Handling Avanzado

### Custom Error Map

```typescript
import { z } from 'zod';

const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) {
    if (issue.expected === 'string') {
      return { message: 'Este campo debe ser texto' };
    }
  }
  if (issue.code === z.ZodIssueCode.too_small) {
    if (issue.type === 'string') {
      return { message: `Mínimo ${issue.minimum} caracteres` };
    }
  }
  return { message: ctx.defaultError };
};

z.setErrorMap(customErrorMap);
```

### Formatear Errores

```typescript
const result = schema.safeParse(data);

if (!result.success) {
  const formatted = result.error.format();
  console.log(formatted);
  // {
  //   email: { _errors: ['Invalid email'] },
  //   password: { _errors: ['Too short', 'Missing uppercase'] }
  // }
}
```

---

## Schemas Reutilizables

```typescript
// Base schemas
const emailSchema = z.string().email();
const passwordSchema = z.string().min(8);

// Login schema
const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Register schema (extiende login)
const registerSchema = loginSchema.extend({
  name: z.string().min(2),
  age: z.number().min(18).optional(),
});

// Pick y Omit
const updateUserSchema = registerSchema.omit({ password: true });
const credentialsSchema = registerSchema.pick({ email: true, password: true });

// Partial (todos los campos opcionales)
const partialUserSchema = registerSchema.partial();

// DeepPartial (anidados opcionales)
const deepPartialSchema = z.object({
  user: z.object({
    name: z.string(),
    email: z.string(),
  }),
}).deepPartial();
```

---

## Preprocess (Transformar antes de validar)

```typescript
// Parse JSON string
const jsonSchema = z.preprocess(
  (val) => (typeof val === 'string' ? JSON.parse(val) : val),
  z.object({ name: z.string() })
);

// Convertir string a number
const numberFromString = z.preprocess(
  (val) => (typeof val === 'string' ? Number(val) : val),
  z.number()
);

jsonSchema.parse('{"name":"John"}'); // ✅ OK
numberFromString.parse('42'); // ✅ OK, returns 42 (number)
```

---

## Best Practices

### 1. Definir schemas cerca de donde se usan

```typescript
// ✅ Bueno
// routes/users.ts
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string(),
});

app.post('/users', validateBody(createUserSchema), handler);
```

### 2. Reutilizar schemas comunes

```typescript
// schemas/common.ts
export const emailSchema = z.string().email();
export const passwordSchema = z.string().min(8);
export const uuidSchema = z.string().uuid();
```

### 3. Usar .safeParse() en producción

```typescript
// ❌ Mal - lanza error
const data = schema.parse(input);

// ✅ Bien - maneja error gracefully
const result = schema.safeParse(input);
if (!result.success) {
  // Handle error
}
```

### 4. Inferir tipos TypeScript

```typescript
// ✅ Siempre inferir tipos del schema
const userSchema = z.object({
  id: z.string(),
  name: z.string(),
});

type User = z.infer<typeof userSchema>;

// ❌ No duplicar definiciones
type User = {
  id: string;
  name: string;
};
const userSchema = z.object({
  id: z.string(),
  name: z.string(),
});
```

---

## Preguntas de Entrevista

### 1. ¿Por qué usar Zod en lugar de TypeScript types?

**Respuesta:**
TypeScript types solo existen en tiempo de compilación. Zod valida datos en **runtime**, lo cual es crítico para:
- Validar input de usuarios (forms, APIs)
- Validar datos externos (APIs de terceros)
- Garantizar type safety en runtime
- Auto-generar tipos TypeScript del schema

### 2. ¿Cómo manejas errores de validación en una API REST?

**Respuesta:**
Uso un middleware de validación con Zod que retorna errores 400 con detalles:

```typescript
const result = schema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({
    error: 'Validation failed',
    details: result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    })),
  });
}
```

### 3. ¿Diferencia entre `.parse()` y `.safeParse()`?

**Respuesta:**
- `.parse()`: Lanza error si validación falla (usar en código interno)
- `.safeParse()`: Retorna objeto `{ success: boolean, data?, error? }` (usar en boundaries como APIs, forms)

---

## Recursos

- **Documentación oficial:** https://zod.dev/
- **Zod con tRPC:** https://trpc.io/docs/server/validators
- **Zod con React Hook Form:** https://github.com/react-hook-form/resolvers#zod

---

**Última actualización:** 2026-02-20

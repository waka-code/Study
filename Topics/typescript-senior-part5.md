# TypeScript Senior - Parte 5: Decorators + Architecture Patterns

## Decorators profundo

### Cómo funcionan internamente

Los decorators son funciones que se aplican a clases, métodos, propiedades, parámetros o accesores:

```typescript
// Decorator básico
function log(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = function (...args: any[]) {
    console.log(`Calling ${propertyKey} with args:`, args);
    const result = originalMethod.apply(this, args);
    console.log(`${propertyKey} returned:`, result);
    return result;
  };
}

class Calculator {
  @log
  add(a: number, b: number): number {
    return a + b;
  }
}

const calc = new Calculator();
calc.add(2, 3);
// Output:
// Calling add with args: [2, 3]
// add returned: 5
```

### Legacy decorators

Los decorators "legacy" (experimentalDecorators: true):

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}

// Class decorator
function sealed(constructor: Function) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

@sealed
class MyClass {
  constructor() {}
}

// Method decorator
function enumerable(value: boolean) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    descriptor.enumerable = value;
  };
}

class Greeter {
  @enumerable(false)
  greet() {
    return "Hello";
  }
}

// Property decorator
function format(formatString: string) {
  return function (target: any, propertyKey: string) {
    let value: string;
    const getter = function () {
      return value;
    };
    const setter = function (newVal: string) {
      value = formatString.replace("%s", newVal);
    };
    Object.defineProperty(target, propertyKey, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true
    });
  };
}

class Person {
  @format("Hello, %s!")
  name: string;
}

// Parameter decorator
function required(target: any, propertyKey: string, parameterIndex: number) {
  console.log(`Parameter at index ${parameterIndex} of ${propertyKey} is required`);
}

class User {
  greet(@required name: string) {
    return `Hello, ${name}`;
  }
}
```

### New ECMAScript decorators

Los nuevos decorators ECMAScript (stage 3):

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": false
  }
}

// Class decorator (new syntax)
const logged = <T extends { new (...args: any[]): {} }>(constructor: T) => {
  return class extends constructor {
    constructor(...args: any[]) {
      console.log("Creating instance");
      super(...args);
    }
  };
};

@logged
class MyClass {
  constructor() {}
}

// Method decorator (new syntax)
function log(target: any, context: ClassMethodDecoratorContext) {
  return function (this: any, ...args: any[]) {
    console.log(`Calling ${String(context.name)}`);
    return target.call(this, ...args);
  };
}

class Calculator {
  @log
  add(a: number, b: number) {
    return a + b;
  }
}

// Field decorator (new syntax)
const format = (formatString: string) => (target: undefined, context: ClassFieldDecoratorContext) => {
  return function (initialValue: string) {
    return formatString.replace("%s", initialValue);
  };
};

class Person {
  @format("Hello, %s!")
  name = "World";
}
```

### Metadata reflection

Usando reflect-metadata para metadata:

```typescript
import "reflect-metadata";

// Definir metadata
function setMetadata(key: string, value: any) {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata(key, value, target, propertyKey);
  };
}

// Obtener metadata
function getMetadata(target: any, propertyKey: string, key: string) {
  return Reflect.getMetadata(key, target, propertyKey);
}

class User {
  @setMetadata("validation", { required: true, minLength: 3 })
  name: string;
}

const metadata = getMetadata(User.prototype, "name", "validation");
console.log(metadata); // { required: true, minLength: 3 }

// Design-time metadata
function getType(target: any, propertyKey: string) {
  return Reflect.getMetadata("design:type", target, propertyKey);
}

class Product {
  name: string;
  price: number;
  active: boolean;
}

const nameType = getType(Product.prototype, "name"); // String
const priceType = getType(Product.prototype, "price"); // Number
```

### Reflect API

El Reflect API completo:

```typescript
import "reflect-metadata";

// Métodos principales de Reflect
// Reflect.get(target, propertyKey, receiver)
// Reflect.set(target, propertyKey, value, receiver)
// Reflect.has(target, propertyKey)
// Reflect.deleteProperty(target, propertyKey)
// Reflect.apply(target, thisArgument, argumentsList)
// Reflect.construct(target, argumentsList, newTarget)
// Reflect.getPrototypeOf(target)
// Reflect.setPrototypeOf(target, prototype)
// Reflect.ownKeys(target)
// Reflect.defineProperty(target, propertyKey, attributes)
// Reflect.getOwnPropertyDescriptor(target, propertyKey)
// Reflect.isExtensible(target)
// Reflect.preventExtensions(target)

// Métodos de metadata
// Reflect.defineMetadata(metadataKey, metadataValue, target, propertyKey?)
// Reflect.getMetadata(metadataKey, target, propertyKey?)
// Reflect.hasMetadata(metadataKey, target, propertyKey?)
// Reflect.deleteMetadata(metadataKey, target, propertyKey?)
// Reflect.getMetadataKeys(target, propertyKey?)
// Reflect.getOwnMetadata(metadataKey, target, propertyKey?)
// Reflect.getOwnMetadataKeys(target, propertyKey?)
```

### Decorator factories

Las decorator factories retornan decorators:

```typescript
// Decorator factory para métodos
function logWithPrefix(prefix: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      console.log(`[${prefix}] Calling ${propertyKey}`);
      return originalMethod.apply(this, args);
    };
  };
}

class Service {
  @logWithPrefix("API")
  fetchData() {
    return "data";
  }
}

// Decorator factory para propiedades
function minLength(min: number) {
  return function (target: any, propertyKey: string) {
    let value: string;
    const getter = () => value;
    const setter = (newVal: string) => {
      if (newVal.length < min) {
        throw new Error(`${propertyKey} must be at least ${min} characters`);
      }
      value = newVal;
    };
    Object.defineProperty(target, propertyKey, { get: getter, set: setter });
  };
}

class User {
  @minLength(3)
  username: string;
}
```

### Dependency injection patterns

Patrones de dependency injection con decorators:

```typescript
import "reflect-metadata";

// Token de inyección
const INJECTABLE_METADATA_KEY = Symbol("injectable");

function Injectable() {
  return function (target: any) {
    Reflect.defineMetadata(INJECTABLE_METADATA_KEY, true, target);
  };
}

// Token de dependencia
const INJECT_METADATA_KEY = Symbol("inject");

function Inject(token: any) {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    const existingTokens = Reflect.getMetadata(INJECT_METADATA_KEY, target) || [];
    existingTokens[parameterIndex] = token;
    Reflect.defineMetadata(INJECT_METADATA_KEY, existingTokens, target);
  };
}

// Contenedor de inyección
class Container {
  private services = new Map<any, any>();

  register<T>(token: any, implementation: new (...args: any[]) => T): void {
    this.services.set(token, implementation);
  }

  resolve<T>(token: any): T {
    const Implementation = this.services.get(token);
    if (!Implementation) {
      throw new Error(`Service not found: ${token}`);
    }

    const paramTypes = Reflect.getMetadata("design:paramtypes", Implementation) || [];
    const dependencies = paramTypes.map((type: any, index: number) => {
      const injectToken = Reflect.getMetadata(INJECT_METADATA_KEY, Implementation)?.[index];
      return this.resolve(injectToken || type);
    });

    return new Implementation(...dependencies);
  }
}

// Uso
@Injectable()
class Database {
  query() {
    return "query result";
  }
}

@Injectable()
class UserRepository {
  constructor(@Inject(Database) private db: Database) {}

  find() {
    return this.db.query();
  }
}

const container = new Container();
container.register(Database, Database);
container.register(UserRepository, UserRepository);

const repo = container.resolve(UserRepository);
console.log(repo.find()); // "query result"
```

### Framework internals (NestJS style)

Implementación estilo NestJS:

```typescript
import "reflect-metadata";

const PATH_METADATA = Symbol("path");
const METHOD_METADATA = Symbol("method");

function Controller(path: string) {
  return function (target: any) {
    Reflect.defineMetadata(PATH_METADATA, path, target);
  };
}

function Get(path: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(PATH_METADATA, path, target, propertyKey);
    Reflect.defineMetadata(METHOD_METADATA, "GET", target, propertyKey);
  };
}

function Post(path: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(PATH_METADATA, path, target, propertyKey);
    Reflect.defineMetadata(METHOD_METADATA, "POST", target, propertyKey);
  };
}

@Controller("/users")
class UserController {
  @Get("/:id")
  getUser(id: string) {
    return { id, name: "John" };
  }

  @Post("/")
  createUser(user: any) {
    return { ...user, id: "1" };
  }
}

// Router simple
class Router {
  private routes: any[] = [];

  registerController(controller: any) {
    const basePath = Reflect.getMetadata(PATH_METADATA, controller) || "";
    const prototype = controller.prototype;

    Object.getOwnPropertyNames(prototype).forEach(methodName => {
      const methodPath = Reflect.getMetadata(PATH_METADATA, prototype, methodName);
      const httpMethod = Reflect.getMetadata(METHOD_METADATA, prototype, methodName);

      if (methodPath && httpMethod) {
        this.routes.push({
          method: httpMethod,
          path: basePath + methodPath,
          handler: prototype[methodName]
        });
      }
    });
  }

  getRoutes() {
    return this.routes;
  }
}

const router = new Router();
router.registerController(UserController);
console.log(router.getRoutes());
// [
//   { method: "GET", path: "/users/:id", handler: [Function] },
//   { method: "POST", path: "/users/", handler: [Function] }
// ]
```

---

## TypeScript Architecture Patterns

### Type-safe architecture

Arquitectura type-safe con TypeScript:

```typescript
// Domain events type-safe
type DomainEvent = {
  type: string;
  payload: unknown;
  timestamp: Date;
};

type EventMap = {
  UserCreated: { userId: string; name: string };
  UserDeleted: { userId: string };
  OrderPlaced: { orderId: string; userId: string; amount: number };
};

type TypedEvent<T extends keyof EventMap> = DomainEvent & {
  type: T;
  payload: EventMap[T];
};

class EventBus {
  private handlers = new Map<keyof EventMap, Set<(event: any) => void>>();

  on<T extends keyof EventMap>(
    eventType: T,
    handler: (event: TypedEvent<T>) => void
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  emit<T extends keyof EventMap>(event: TypedEvent<T>): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }
  }
}

// Uso
const eventBus = new EventBus();

eventBus.on("UserCreated", (event) => {
  console.log(`User created: ${event.payload.name}`);
});

eventBus.emit({
  type: "UserCreated",
  payload: { userId: "1", name: "John" },
  timestamp: new Date()
});
```

### Domain modeling

Modelado de dominio tipado:

```typescript
// Value objects
type UserId = string & { readonly __brand: "UserId" };
type Email = string & { readonly __brand: "Email" };

function createUserId(id: string): UserId {
  if (!id.match(/^[a-z0-9-]+$/i)) {
    throw new Error("Invalid user ID");
  }
  return id as UserId;
}

function createEmail(email: string): Email {
  if (!email.includes("@")) {
    throw new Error("Invalid email");
  }
  return email as Email;
}

// Entity
class User {
  private constructor(
    public readonly id: UserId,
    public readonly email: Email,
    public readonly name: string
  ) {}

  static create(email: Email, name: string): User {
    return new User(createUserId(crypto.randomUUID()), email, name);
  }

  changeName(newName: string): User {
    return new User(this.id, this.email, newName);
  }
}

// Aggregate root
class Order {
  private constructor(
    public readonly id: string,
    public readonly userId: UserId,
    private items: OrderItem[],
    private status: "pending" | "paid" | "shipped" | "cancelled"
  ) {}

  static create(userId: UserId): Order {
    return new Order(crypto.randomUUID(), userId, [], "pending");
  }

  addItem(product: string, quantity: number, price: number): void {
    if (this.status !== "pending") {
      throw new Error("Cannot add items to non-pending order");
    }
    this.items.push({ product, quantity, price });
  }

  pay(): void {
    if (this.status !== "pending") {
      throw new Error("Order is not pending");
    }
    this.status = "paid";
  }
}

interface OrderItem {
  product: string;
  quantity: number;
  price: number;
}
```

### DDD con TypeScript

Domain-Driven Design con TypeScript:

```typescript
// Domain layer
namespace Domain {
  export type EntityId = string & { readonly __brand: "EntityId" };

  export abstract class Entity {
    protected constructor(public readonly id: EntityId) {}
  }

  export abstract class ValueObject {
    protected constructor() {}
  }

  export abstract class AggregateRoot extends Entity {
    private events: DomainEvent[] = [];

    protected constructor(id: EntityId) {
      super(id);
    }

    protected addEvent(event: DomainEvent): void {
      this.events.push(event);
    }

    pullEvents(): DomainEvent[] {
      return this.events.splice(0);
    }
  }

  export interface DomainEvent {
    aggregateId: EntityId;
    occurredAt: Date;
  }
}

// Application layer
namespace Application {
  import { AggregateRoot, DomainEvent, EntityId } from "../Domain";

  export interface Repository<T extends AggregateRoot> {
    save(aggregate: T): Promise<void>;
    findById(id: EntityId): Promise<T | null>;
  }

  export interface EventBus {
    publish(events: DomainEvent[]): Promise<void>;
  }

  export class ApplicationService<T extends AggregateRoot> {
    constructor(
      private repository: Repository<T>,
      private eventBus: EventBus
    ) {}

    async execute(command: Command): Promise<void> {
      const aggregate = await this.handle(command);
      await this.repository.save(aggregate);
      await this.eventBus.publish(aggregate.pullEvents());
    }

    protected abstract handle(command: Command): Promise<T>;
  }

  export interface Command {}
}
```

### Repository pattern tipado

Repository pattern type-safe:

```typescript
// Generic repository
interface Repository<T, ID> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: ID): Promise<void>;
  exists(id: ID): Promise<boolean>;
}

// Entity base
interface Entity<ID> {
  id: ID;
}

// Specification pattern
interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
}

class AndSpecification<T> implements Specification<T> {
  constructor(
    private left: Specification<T>,
    private right: Specification<T>
  ) {}

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

class UserByNameSpecification implements Specification<User> {
  constructor(private name: string) {}

  isSatisfiedBy(candidate: User): boolean {
    return candidate.name === this.name;
  }
}

// Extended repository with specifications
interface ExtendedRepository<T, ID> extends Repository<T, ID> {
  find(specification: Specification<T>): Promise<T[]>;
  findOne(specification: Specification<T>): Promise<T | null>;
  count(specification?: Specification<T>): Promise<number>;
}

// Implementación
class InMemoryRepository<T extends Entity<ID>, ID> implements ExtendedRepository<T, ID> {
  private entities = new Map<ID, T>();

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

  async exists(id: ID): Promise<boolean> {
    return this.entities.has(id);
  }

  async find(specification: Specification<T>): Promise<T[]> {
    return Array.from(this.entities.values()).filter(e => specification.isSatisfiedBy(e));
  }

  async findOne(specification: Specification<T>): Promise<T | null> {
    const results = await this.find(specification);
    return results[0] || null;
  }

  async count(specification?: Specification<T>): Promise<number> {
    if (!specification) return this.entities.size;
    return (await this.find(specification)).length;
  }
}
```

### Factory pattern tipado

Factory pattern con TypeScript:

```typescript
// Abstract factory
interface Factory<T, Args extends any[]> {
  create(...args: Args): T;
}

// Concrete factory
class UserFactory implements Factory<User, [string, string]> {
  create(name: string, email: string): User {
    return {
      id: crypto.randomUUID(),
      name,
      email,
      createdAt: new Date()
    };
  }
}

// Generic factory
class GenericFactory<T, Args extends any[]> implements Factory<T, Args> {
  constructor(
    private constructor: new (...args: Args) => T
  ) {}

  create(...args: Args): T {
    return new this.constructor(...args);
  }
}

// Builder pattern
class UserBuilder {
  private id?: string;
  private name?: string;
  private email?: string;

  withId(id: string): this {
    this.id = id;
    return this;
  }

  withName(name: string): this {
    this.name = name;
    return this;
  }

  withEmail(email: string): this {
    this.email = email;
    return this;
  }

  build(): User {
    if (!this.id || !this.name || !this.email) {
      throw new Error("Missing required fields");
    }
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      createdAt: new Date()
    };
  }
}

// Fluent builder con generics
class FluentBuilder<T> {
  private data: Partial<T> = {};

  with<K extends keyof T>(key: K, value: T[K]): this {
    this.data[key] = value;
    return this;
  }

  build(): T {
    if (!this.isComplete()) {
      throw new Error("Builder incomplete");
    }
    return this.data as T;
  }

  private isComplete(): boolean {
    // Implementar validación
    return true;
  }
}
```

### Strategy pattern tipado

Strategy pattern type-safe:

```typescript
// Strategy interface
interface Strategy<TContext, TResult> {
  execute(context: TContext): TResult;
}

// Context
interface PaymentContext {
  amount: number;
  currency: string;
}

// Strategies
class CreditCardStrategy implements Strategy<PaymentContext, { success: boolean; transactionId: string }> {
  execute(context: PaymentContext) {
    console.log(`Processing credit card payment: ${context.amount} ${context.currency}`);
    return { success: true, transactionId: "cc-" + crypto.randomUUID() };
  }
}

class PayPalStrategy implements Strategy<PaymentContext, { success: boolean; transactionId: string }> {
  execute(context: PaymentContext) {
    console.log(`Processing PayPal payment: ${context.amount} ${context.currency}`);
    return { success: true, transactionId: "pp-" + crypto.randomUUID() };
  }
}

// Context that uses strategy
class PaymentProcessor {
  constructor(private strategy: Strategy<PaymentContext, any>) {}

  setStrategy(strategy: Strategy<PaymentContext, any>): void {
    this.strategy = strategy;
  }

  processPayment(context: PaymentContext): any {
    return this.strategy.execute(context);
  }
}

// Type-safe strategy selector
type StrategyMap<TContext, TResult> = {
  [K in string]: Strategy<TContext, TResult>;
};

class StrategySelector<TContext, TResult> {
  constructor(private strategies: StrategyMap<TContext, TResult>) {}

  select(key: string): Strategy<TContext, TResult> {
    const strategy = this.strategies[key];
    if (!strategy) {
      throw new Error(`Strategy not found: ${key}`);
    }
    return strategy;
  }
}
```

### Event sourcing tipado

Event sourcing con TypeScript:

```typescript
// Event base
interface Event {
  type: string;
  aggregateId: string;
  version: number;
  timestamp: Date;
}

// User events
type UserEvent =
  | { type: "UserCreated"; aggregateId: string; version: number; timestamp: Date; payload: { name: string; email: string } }
  | { type: "UserNameUpdated"; aggregateId: string; version: number; timestamp: Date; payload: { name: string } }
  | { type: "UserEmailUpdated"; aggregateId: string; version: number; timestamp: Date; payload: { email: string } };

// Event store
interface EventStore<TEvent extends Event> {
  saveEvents(aggregateId: string, events: TEvent[], expectedVersion: number): Promise<void>;
  getEvents(aggregateId: string): Promise<TEvent[]>;
}

// Aggregate
class User {
  private constructor(
    public readonly id: string,
    public name: string,
    public email: string,
    private version: number
  ) {}

  static create(id: string, name: string, email: string): [User, UserEvent] {
    const event: UserEvent = {
      type: "UserCreated",
      aggregateId: id,
      version: 1,
      timestamp: new Date(),
      payload: { name, email }
    };
    return [new User(id, name, email, 1), event];
  }

  static fromEvents(events: UserEvent[]): User {
    let user: User | null = null;
    for (const event of events) {
      switch (event.type) {
        case "UserCreated":
          user = new User(event.aggregateId, event.payload.name, event.payload.email, event.version);
          break;
        case "UserNameUpdated":
          user = user!.withName(event.payload.name, event.version);
          break;
        case "UserEmailUpdated":
          user = user!.withEmail(event.payload.email, event.version);
          break;
      }
    }
    return user!;
  }

  withName(name: string, version: number): User {
    return new User(this.id, name, this.email, version);
  }

  withEmail(email: string, version: number): User {
    return new User(this.id, this.name, email, version);
  }

  updateName(newName: string): UserEvent {
    this.name = newName;
    return {
      type: "UserNameUpdated",
      aggregateId: this.id,
      version: this.version + 1,
      timestamp: new Date(),
      payload: { name: newName }
    };
  }
}
```

### CQRS tipado

CQRS con TypeScript:

```typescript
// Commands
interface Command {
  type: string;
}

type CreateUserCommand = {
  type: "CreateUser";
  payload: { name: string; email: string };
};

type UpdateUserCommand = {
  type: "UpdateUser";
  payload: { id: string; name?: string; email?: string };
};

type DeleteUserCommand = {
  type: "DeleteUser";
  payload: { id: string };
};

// Queries
interface Query<T> {
  type: string;
}

type GetUserQuery = {
  type: "GetUser";
  payload: { id: string };
  result: User | null;
};

type ListUsersQuery = {
  type: "ListUsers";
  payload: {};
  result: User[];
};

// Command handler
interface CommandHandler<TCommand extends Command> {
  handle(command: TCommand): Promise<void>;
}

class CreateUserHandler implements CommandHandler<CreateUserCommand> {
  constructor(private repository: UserRepository) {}

  async handle(command: CreateUserCommand): Promise<void> {
    const user = User.create(command.payload.name, command.payload.email);
    await this.repository.save(user);
  }
}

// Query handler
interface QueryHandler<TQuery extends Query<any>> {
  handle(query: TQuery): Promise<TQuery["result"]>;
}

class GetUserHandler implements QueryHandler<GetUserQuery> {
  constructor(private repository: UserRepository) {}

  async handle(query: GetUserQuery): Promise<User | null> {
    return await this.repository.findById(query.payload.id);
  }
}

// Command bus
class CommandBus {
  private handlers = new Map<string, CommandHandler<any>>();

  register<TCommand extends Command>(
    type: string,
    handler: CommandHandler<TCommand>
  ): void {
    this.handlers.set(type, handler);
  }

  async execute<TCommand extends Command>(command: TCommand): Promise<void> {
    const handler = this.handlers.get(command.type);
    if (!handler) {
      throw new Error(`No handler for command: ${command.type}`);
    }
    await handler.handle(command);
  }
}

// Query bus
class QueryBus {
  private handlers = new Map<string, QueryHandler<any>>();

  register<TQuery extends Query<any>>(
    type: string,
    handler: QueryHandler<TQuery>
  ): void {
    this.handlers.set(type, handler);
  }

  async execute<TQuery extends Query<any>>(query: TQuery): Promise<TQuery["result"]> {
    const handler = this.handlers.get(query.type);
    if (!handler) {
      throw new Error(`No handler for query: ${query.type}`);
    }
    return await handler.handle(query);
  }
}
```

---

**Continúa en Parte 6: Type-safe APIs + Runtime vs Compile-time**

# NestJS: Framework Empresarial

## Conceptos Fundamentales

NestJS usa arquitectura modular con decoradores de TypeScript para crear aplicaciones escalables.

### Decoradores Principales

```typescript
// Controllers: Manejan requests
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
```

### Inyección de Dependencias (DI)

```typescript
// Services: Lógica de negocio
@Injectable()
export class UsersService {
  constructor(
    private db: DatabaseService,
    private logger: LoggerService
  ) {}

  async findAll(): Promise<User[]> {
    this.logger.log('Fetching all users');
    return this.db.query('SELECT * FROM users');
  }

  async findOne(id: string): Promise<User> {
    return this.db.query('SELECT * FROM users WHERE id = ?', [id]);
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    return this.db.execute('INSERT INTO users VALUES ?', [createUserDto]);
  }
}
```

## Estructura de Módulos

```typescript
// users.module.ts
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService] // Exportar para otros módulos
})
export class UsersModule {}

// products.module.ts
@Module({
  imports: [UsersModule], // Importar módulos
  controllers: [ProductsController],
  providers: [ProductsService]
})
export class ProductsModule {}

// app.module.ts
@Module({
  imports: [UsersModule, ProductsModule],
})
export class AppModule {}
```

## Pipes: Validación y Transformación

```typescript
import { IsString, IsEmail, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;
}

// Controller usa ValidationPipe
@Controller('users')
export class UsersController {
  @Post()
  create(
    @Body(new ValidationPipe()) createUserDto: CreateUserDto
  ): Promise<User> {
    return this.usersService.create(createUserDto);
  }
}
```

## Guards: Autenticación y Autorización

```typescript
// auth.guard.ts
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      request.user = this.jwtService.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}

// Usar en controller
@UseGuards(AuthGuard)
@Get('profile')
getProfile(@Request() req): any {
  return req.user;
}
```

## Interceptors: Logging y Transformación

```typescript
// logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        console.log(`${method} ${url} - ${duration}ms`);
      }),
      catchError((err) => {
        console.error(`${method} ${url} - Error:`, err);
        throw err;
      })
    );
  }
}

// Aplicar globalmente
app.useGlobalInterceptors(new LoggingInterceptor());
```

## Exception Filters: Manejo de Errores

```typescript
// http-exception.filter.ts
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    const message = exception.getResponse();

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString()
    });
  }
}

// Usar en controller
@UseFilters(HttpExceptionFilter)
@Post()
create(@Body() createUserDto: CreateUserDto): Promise<User> {
  return this.usersService.create(createUserDto);
}
```

## Middlewares en NestJS

```typescript
// logger.middleware.ts
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    console.log(`${req.method} ${req.path}`);
    next();
  }
}

// app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('users'); // Aplicar solo a /users
  }
}
```

## Estructura de Proyecto Recomendada

```
src/
├── modules/
│   ├── users/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.module.ts
│   │   └── dto/
│   │       └── create-user.dto.ts
│   └── products/
│       ├── products.controller.ts
│       ├── products.service.ts
│       └── products.module.ts
├── common/
│   ├── guards/
│   ├── interceptors/
│   ├── filters/
│   └── pipes/
├── config/
│   └── database.config.ts
├── app.module.ts
└── main.ts
```

## Comparación: Express vs NestJS

| Aspecto | Express | NestJS |
|--------|---------|--------|
| Estructura | Flexible | Opinionada |
| TypeScript | Manual | Built-in |
| DI | Manual | Automático |
| Validación | Manual | Automático |
| Testing | Difícil | Fácil |
| Escalabilidad | Moderada | Excelente |
| Curva aprendizaje | Baja | Media |

## Referencias

- [express-senior.md](./express-senior.md)
- [global-error-handling.md](../07-errores-estabilidad/global-error-handling.md)
- [Documentación NestJS](https://docs.nestjs.com/)

## Pregunta de Entrevista

**¿Cuál es la diferencia entre Pipes, Guards e Interceptors en NestJS?**

- **Pipes**: Transforman y validan datos (validación de DTO)
- **Guards**: Controlan acceso (autenticación/autorización)
- **Interceptors**: Interceptan request/response (logging, transformación global)

Se ejecutan en orden: Middleware → Guards → Pipes → Controller → Interceptors → Response.

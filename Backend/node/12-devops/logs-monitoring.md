# Logging y Monitoreo

## Winston: Logger Empresarial

```bash
npm install winston
```

### Setup Básico

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    // Archivo de errores
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    // Archivo de todos
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

// En desarrollo, también a consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

### Logging Estructurado

```javascript
const logger = require('./logger');

// Nivel
logger.info('User created', { userId: 123 });
logger.error('Database error', { code: 'ECONNREFUSED' });
logger.warn('Cache miss', { key: 'user:1' });
logger.debug('Query executed', { sql: 'SELECT ...' });

// Con contexto
logger.info('API request', {
  method: 'GET',
  url: '/users',
  statusCode: 200,
  duration: 45
});

// Stack trace
logger.error('Process error', {
  error: err.message,
  stack: err.stack
});
```

### Middleware para Express

```javascript
const express = require('express');
const logger = require('./logger');

const app = express();

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id
    });
  });

  next();
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  res.status(500).json({ error: 'Internal Server Error' });
});
```

### Formato Personalizado

```javascript
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level.toUpperCase()}] ${message} ${JSON.stringify(meta)}`;
  })
);

const logger = winston.createLogger({
  format: customFormat,
  transports: [
    new winston.transports.File({ filename: 'logs/app.log' })
  ]
});
```

## Pino: Logger de Alto Performance

Alternativa más rápida que Winston:

```bash
npm install pino
```

```javascript
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

// Uso
logger.info({ userId: 1 }, 'User created');
logger.error({ err }, 'Database error');
logger.debug({ query: 'SELECT ...' }, 'Executing query');
```

### Con Express

```javascript
const express = require('express');
const pinoHttp = require('pino-http');
const logger = require('./logger');

const app = express();

// Auto-logging HTTP
app.use(pinoHttp({
  logger,
  autoLogging: true
}));

app.get('/users/:id', (req, res) => {
  // req.log es el logger de Pino
  req.log.info({ userId: req.params.id }, 'Fetching user');
  res.json({});
});
```

## Log Rotation

```javascript
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const transport = new DailyRotateFile({
  filename: 'logs/%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxDays: '14d' // Mantener 14 días
});

const logger = winston.createLogger({
  transports: [transport]
});
```

## Niveles de Log

```javascript
const logger = require('./logger');

// 0 = error, 1 = warn, 2 = info, 3 = debug
logger.error('Critical error');     // Siempre
logger.warn('Warning');              // Si level >= warn
logger.info('Information');          // Si level >= info
logger.debug('Debug info');          // Si level >= debug
```

## Contexto y Metadata

```javascript
// Agregar contexto a logs
const logger = require('./logger');

app.use((req, res, next) => {
  req.id = generateRequestId();
  res.on('finish', () => {
    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      userId: req.user?.id
    });
  });
  next();
});
```

## APM: Application Performance Monitoring

### New Relic

```bash
npm install newrelic
```

```javascript
// require al inicio
require('newrelic');

const express = require('express');
const app = express();

// Automáticamente monitoreado:
// - Requests HTTP
// - Queries a DB
// - Métodos externos
// - Errores

app.listen(3000);
```

### DataDog

```bash
npm install dd-trace
```

```javascript
const tracer = require('dd-trace').init();

const express = require('express');
const app = express();

// Ver en DataDog dashboard
app.listen(3000);
```

### Herramientas Open Source: Prometheus

```bash
npm install prom-client
```

```javascript
const client = require('prom-client');

// Crear métricas
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status_code']
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.path, res.statusCode)
      .observe(duration);
  });
  next();
});

// Endpoint de métricas para Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
```

## Métricas Importantes

```javascript
const logger = require('./logger');

// 1. Latencia (p50, p95, p99)
// Winston/Pino auto-log con timestamps

// 2. Error rate
logger.error('User not found', { statusCode: 404 });

// 3. Throughput (requests/segundo)
// APM lo calcula automáticamente

// 4. Disponibilidad
app.get('/health', (req, res) => {
  const isHealthy = checkDatabase() && checkRedis();
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded'
  });
});
```

## Log Aggregation

### Con PM2 Plus

```bash
pm2 link
pm2 logs --lines 100 --format=json > logs.json
```

### Con ELK Stack (Elasticsearch, Logstash, Kibana)

```javascript
// Enviar logs a Elasticsearch
const elasticsearch = require('elasticsearch');
const esTransport = require('winston-elasticsearch');

const esClient = new elasticsearch.Client({
  nodes: ['http://localhost:9200']
});

const logger = winston.createLogger({
  transports: [
    new esTransport({
      client: esClient,
      index: 'logs'
    })
  ]
});

// Buscar en Kibana
// http://localhost:5601
```

## Estructura de Log Recomendada

```javascript
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "service": "api",
  "environment": "production",
  "requestId": "req-12345",
  "userId": 123,
  "action": "user.created",
  "message": "User created successfully",
  "metadata": {
    "email": "user@example.com",
    "method": "POST",
    "path": "/users",
    "statusCode": 201,
    "duration": 45
  }
}
```

## Herramientas de Monitoreo

| Herramienta | Tipo | Costo |
|------------|------|-------|
| Winston/Pino | Logging | Gratis |
| New Relic | APM | $$ |
| DataDog | Monitoreo | $$ |
| Prometheus | Métricas | Gratis |
| ELK Stack | Log aggregation | Gratis (self-hosted) |
| PM2 Plus | Monitoreo PM2 | $ |

## Referencias

- [event-loop-monitoring.md](../08-performance/event-loop-monitoring.md)
- [pm2-process-manager.md](./pm2-process-manager.md)
- [global-error-handling.md](../07-errores-estabilidad/global-error-handling.md)

## Pregunta de Entrevista

**¿Por qué es importante el logging estructurado?**

Facilita búsqueda, análisis y debugging. JSON estructurado permite filtrar por campos (userId, requestId, statusCode). Herramientas como ELK o DataDog indexan y visualizan automáticamente. En logs de texto plano, buscar patrones es manual y lento.

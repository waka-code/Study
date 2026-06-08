# AWS AppSync

AWS AppSync es un servicio completamente administrado que facilita el desarrollo de aplicaciones GraphQL escalables. Permite conectar aplicaciones a múltiples fuentes de datos, incluyendo bases de datos, APIs REST, funciones Lambda y más, con un único endpoint GraphQL.

## Características principales

- **GraphQL administrado:**
  - Servicio GraphQL completamente administrado sin necesidad de gestionar servidores.
- **Múltiples fuentes de datos:**
  - Conecta con DynamoDB, RDS, Elasticsearch, Lambda, HTTP endpoints y más.
- **Autenticación y autorización:**
  - Soporta API Key, IAM, Amazon Cognito, OpenID Connect y Lambda.
- **Resolvers y Data Sources:**
  - Mapeo flexible entre esquema GraphQL y fuentes de datos.
- **Offline support:**
  - Sincronización automática de datos cuando la aplicación regresa online.
- **Observabilidad:**
  - Integración con CloudWatch para monitoreo y debugging.

## Casos de uso

- **Aplicaciones móviles:**
  - APIs GraphQL para aplicaciones iOS y Android.
- **Aplicaciones web progresivas (PWA):**
  - Sincronización en tiempo real de datos.
- **Dashboards en tiempo real:**
  - Actualización automática de datos mediante suscripciones GraphQL.
- **Microservicios:**
  - API gateway centralizado para múltiples microservicios.
- **Integración de datos:**
  - Combinar datos de múltiples fuentes con una API unificada.

## Beneficios

- **Desarrollo rápido:**
  - Define tu API con GraphQL schema y deja que AppSync maneje la orquestación.
- **Escalabilidad:**
  - Maneja automáticamente cargas de trabajo variables.
- **Sincronización en tiempo real:**
  - Suscripciones GraphQL para actualizaciones en tiempo real.
- **Integración simplificada:**
  - Conecta fácilmente con servicios de AWS.

## Ejemplo de configuración

### Crear una API GraphQL con AWS CLI
```bash
aws appsync create-graphql-api \
    --name MiAPIGraphQL \
    --authentication-type API_KEY \
    --api-type GRAPHQL
```

### Crear una fuente de datos (Data Source)
```bash
aws appsync create-data-source \
    --api-id <api-id> \
    --name MiFuenteDatos \
    --type AMAZON_DYNAMODB \
    --dynamodb-config "tableName=MiTabla"
```

### Crear un resolver
```bash
aws appsync create-resolver \
    --api-id <api-id> \
    --type-name Query \
    --field-name getUser \
    --data-source-name MiFuenteDatos \
    --request-mapping-template file://request.vtl \
    --response-mapping-template file://response.vtl
```

## Schema GraphQL básico

```graphql
type Query {
  getUser(id: ID!): User
  listUsers(limit: Int): [User]
}

type Mutation {
  createUser(input: CreateUserInput!): User
  updateUser(id: ID!, input: UpdateUserInput!): User
  deleteUser(id: ID!): Boolean
}

type Subscription {
  onUserCreated: User
  onUserUpdated: User
}

type User {
  id: ID!
  name: String!
  email: String!
  age: Int
  createdAt: AWSDateTime!
}

input CreateUserInput {
  name: String!
  email: String!
  age: Int
}

input UpdateUserInput {
  name: String
  email: String
  age: Int
}
```

## Arquitectura de AWS AppSync

```
┌──────────────────────────────────────────────────────┐
│                  AWS AppSync                         │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │     GraphQL Endpoint                         │  │
│  │  (Queries, Mutations, Subscriptions)        │  │
│  └──────────────────────────────────────────────┘  │
│              ↓                                       │
│  ┌──────────────────────────────────────────────┐  │
│  │     GraphQL Schema & Validation              │  │
│  └──────────────────────────────────────────────┘  │
│              ↓                                       │
│  ┌──────────────────────────────────────────────┐  │
│  │     Resolvers & Data Mapping                 │  │
│  └──────────────────────────────────────────────┘  │
│    ↓         ↓         ↓         ↓         ↓       │
│  ┌────┐   ┌────┐   ┌────┐   ┌────┐   ┌────┐     │
│  │DDB │   │RDS │   │ ES │   │HTTP│   │ Lambda│   │
│  └────┘   └────┘   └────┘   └────┘   └────┘     │
│                                                      │
└──────────────────────────────────────────────────────┘
         ↓              ↓              ↓
    ┌─────────┐    ┌─────────┐    ┌────────┐
    │Web App  │    │Mobile   │    │Desktop │
    │(React) │    │(iOS/And)│    │App     │
    └─────────┘    └─────────┘    └────────┘
```

## Tipos de autenticación

- **API Key:**
  - Para desarrollo y pruebas rápidas.

- **AWS IAM:**
  - Autenticación basada en roles de IAM.

- **Amazon Cognito:**
  - Gestión de usuarios y tokens JWT.

- **OpenID Connect:**
  - Integración con proveedores de identidad externos.

- **Lambda:**
  - Lógica de autenticación personalizada.

## Resolvers (VTL - Velocity Template Language)

```velocity
## Request Resolver
{
  "version": "2017-02-28",
  "operation": "GetItem",
  "key": {
    "id": { "S": "$context.arguments.id" }
  }
}

## Response Resolver
$input.path('$.Item')
```

## Suscripciones en tiempo real

```graphql
subscription OnUserCreated {
  onUserCreated {
    id
    name
    email
    createdAt
  }
}
```

## Buenas prácticas

1. **Seguridad:**
   - Usa IAM o Cognito para autenticación en producción.
   - Implementa autorización a nivel de campo.

2. **Monitoreo:**
   - Configura CloudWatch para monitorear latencia y errores.

3. **Optimización:**
   - Usa batching de queries para reducir llamadas.
   - Implementa caching en el cliente.

4. **Error Handling:**
   - Define manejo de errores en resolvers.

5. **Validación:**
   - Valida entrada en el schema GraphQL.

## Integración con otros servicios AWS

- **Amazon DynamoDB:**
  - Base de datos NoSQL para datos transaccionales.

- **Amazon RDS:**
  - Bases de datos relacionales.

- **Amazon Elasticsearch:**
  - Búsqueda y análisis de datos.

- **AWS Lambda:**
  - Lógica personalizada en resolvers.

- **Amazon Cognito:**
  - Gestión de usuarios y autenticación.

- **CloudWatch:**
  - Monitoreo y logging.

## Limitaciones

- **Complejidad:**
  - Requiere comprensión de GraphQL para aprovecharlo al máximo.

- **Costo:**
  - Costo por solicitud de API y datos transferidos.

- **Límites de resolvers:**
  - Timeout máximo de 30 segundos en resolvers.

## Recursos adicionales

- [Documentación oficial de AWS AppSync](https://docs.aws.amazon.com/appsync/)
- [Guía de inicio rápido](https://docs.aws.amazon.com/appsync/latest/devguide/what-is-appsync.html)
- [Ejemplos de código](https://github.com/aws-samples/aws-appsync-samples)
- [Amplify + AppSync](https://docs.amplify.aws/cli/graphql-transformer/overview/)
# API Gateway

## Definición

Amazon API Gateway es un servicio totalmente gestionado que permite crear, publicar, mantener y proteger APIs a cualquier escala. Actúa como la puerta de entrada (gateway) para que las aplicaciones accedan a datos, lógica de negocio o funcionalidades desde servicios backend como Lambda, EC2 o servicios externos.

## Características Principales

### 1. **Gestión completa de APIs**
- Creación y despliegue de APIs REST, HTTP y WebSocket
- Versionamiento de APIs
- Gestión del ciclo de vida completo

### 2. **Escalabilidad automática**
- Maneja millones de solicitudes simultáneas
- Auto-scaling sin configuración manual
- Alta disponibilidad integrada

### 3. **Seguridad integrada**
- Autenticación y autorización
- Integración con IAM, Cognito, OAuth 2.0
- WAF (Web Application Firewall)

### 4. **Monitoreo y análisis**
- CloudWatch integration
- Logs detallados de solicitudes
- Métricas de rendimiento en tiempo real

## Tipos de API Gateway

### **1. REST API**
- APIs tradicionales RESTful
- Soporte completo para recursos y métodos HTTP
- Transformación de payloads
- Caching integrado

### **2. HTTP API**
- Más simple y económico
- Mejor rendimiento
- Soporte para JWT autorización
- Ideal para APIs proxy

### **3. WebSocket API**
- Comunicación bidireccional en tiempo real
- Mantenimiento de conexiones persistentes
- Ideal para chat, notificaciones, gaming
- Routing basado en mensajes

## Componentes Clave

### **API**
- Contenedor principal para tu API
- Configuración global y recursos
- Versiones y etapas (stages)

### **Recursos (Resources)**
- Entidades de tu API (ej: /users, /products)
- Estructura jerárquica
- Parámetros de ruta

### **Métodos (Methods)**
- Operaciones HTTP: GET, POST, PUT, DELETE, PATCH
- Configuración por método
- Integración con backend

### **Integraciones (Integrations)**
- **Lambda Function**: Ejecuta funciones Lambda
- **HTTP**: Redirige a otros endpoints HTTP
- **AWS Service**: Acceso directo a servicios AWS
- **Mock**: Respuestas simuladas para desarrollo

### **Etapas (Stages)**
- Ambientes de despliegue: dev, staging, prod
- Configuración por etapa
- Variables de etapa

## Configuración

### **Métodos HTTP**
```yaml
# Ejemplo de configuración
GET /users:
  Integration:
    Type: AWS_PROXY
    Uri: arn:aws:lambda:us-east-1:123456789:function:GetUsers
  MethodResponses:
    - StatusCode: 200
    - StatusCode: 404
```

### **Parámetros**
- **Path Parameters**: `/users/{id}`
- **Query Parameters**: `?page=1&limit=10`
- **Headers**: `Authorization`, `Content-Type`
- **Request Body**: JSON, XML, form-data

### **Modelos y Mapeos**
- **Models**: Esquemas de datos (JSON Schema)
- **Mapping Templates**: Transformación de datos
- **Request/Response Mapping**: Modificación de payloads

## Seguridad

### **Autenticación**
- **IAM**: Roles y políticas de AWS
- **Cognito**: User pools y identity pools
- **Lambda Authorizer**: Validación personalizada
- **JWT**: Tokens JWT de terceros

### **Autorización**
- **Resource Policies**: Control de acceso a nivel de API
- **Usage Plans**: Límites y cuotas por cliente
- **API Keys**: Identificación de clientes
- **OAuth 2.0**: Scopes y permisos

### **WAF Integration**
- Protección contra ataques comunes
- SQL injection, XSS protection
- Rate limiting
- IP whitelisting/blacklisting

## Monitoreo y Logging

### **CloudWatch Metrics**
- Latencia (p50, p90, p99)
- Count de solicitudes
- Errores 4XX, 5XX
- Cache hits/misses

### **Logging**
- **Execution Logs**: Logs de ejecución
- **Access Logs**: Logs de acceso personalizados
- **X-Ray Tracing**: Distributed tracing
- **CloudTrail**: Auditoría de cambios

## Caching

### **Tipos de Cache**
- **CloudFront Cache**: Cache edge global
- **API Gateway Cache**: Cache regional
- **TTL Configuration**: Tiempo de vida del cache

### **Configuración**
- Cluster size: 0.5 GB a 13.5 GB
- TTL por endpoint
- Cache encryption
- Cache invalidation

## Modelos de Precios

### **REST API**
- $3.50 por millón de solicitudes API
- $0.20 por millón de mensajes WebSocket
- $0.025 por GB de transferencia de datos
- Cache: $0.015 por GB-hora

### **HTTP API**
- $1.00 por millón de solicitudes
- $0.20 por millón de mensajes WebSocket
- Más económico que REST API

### **Nivel Gratuito**
- 1 millón de solicitudes HTTP API
- 1 millón de solicitudes REST API
- 1 millón de mensajes y conexiones WebSocket

## Casos de Uso

### **1. APIs para aplicaciones móviles**
- Backend para iOS/Android
- Autenticación con Cognito
- Integración con Lambda

### **2. Microservicios**
- Gateway para servicios backend
- Routing entre servicios
- Agregación de respuestas

### **3. APIs públicas**
- APIs para terceros
- Monetización con usage plans
- Documentación automática

### **4. Integraciones legacy**
- Modernización de sistemas existentes
- Transformación de formatos
- Bridge entre sistemas

## Mejores Prácticas

### **1. Diseño de APIs**
- Principios RESTful
- Nomenclatura consistente
- Versionamiento adecuado
- Documentación clara

### **2. Seguridad**
- Principio de menor privilegio
- Validación de inputs
- Rate limiting
- HTTPS obligatorio

### **3. Performance**
- Caching estratégico
- Payloads optimizados
- Compression habilitada
- CDN integration

### **4. Monitoreo**
- Métricas personalizadas
- Alerts automáticos
- Health checks
- Error tracking

## Herramientas y Frameworks

### **AWS SAM**
```yaml
Resources:
  MyApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: Prod
      Auth:
        DefaultAuthorizer: AWS_IAM
        AddDefaultAuthorizerToCorsPreflight: false
```

### **Serverless Framework**
```yaml
functions:
  hello:
    handler: handler.hello
    events:
      - http:
          path: hello
          method: get
```

### **OpenAPI/Swagger**
- Definición estándar de APIs
- Importación automática
- Documentación generada
- Testing integrado

## Ejemplo de Configuración

### **API REST con Lambda**
```yaml
# template.yaml
Resources:
  MyApi:
    Type: AWS::Serverless::Api
    Properties:
      Name: MyApplicationAPI
      StageName: prod
      Cors:
        AllowMethods: "'GET,POST,PUT,DELETE,OPTIONS'"
        AllowHeaders: "'Content-Type,X-Amz-Date,Authorization'"
        AllowOrigin: "'*'"
  
  GetUserFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.getUser
      Runtime: python3.9
      Events:
        Api:
          Type: Api
          Properties:
            Path: /users/{id}
            Method: get
            RestApiId: !Ref MyApi
```

## Deployment

### **Stages (Etapas)**
- **dev**: Desarrollo y testing
- **staging**: Pre-producción
- **prod**: Producción
- Variables de configuración por etapa

### **Canary Deployments**
- Despliegue gradual
- Testing con tráfico real
- Rollback automático
- Métricas de canary

### **Import/Export**
- OpenAPI definitions
- Postman collections
- API Gateway export
- Version control

## Conclusión

API Gateway es el componente central para exponer funcionalidades serverless al mundo exterior, proporcionando una capa de abstracción robusta, segura y escalable entre los clientes y los servicios backend de AWS.

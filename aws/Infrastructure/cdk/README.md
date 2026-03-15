# AWS CDK (Cloud Development Kit)

## Definición

AWS CDK (Cloud Development Kit) es un framework de código abierto que permite definir infraestructura en la nube usando lenguajes de programación familiares y provisionarla a través de AWS CloudFormation. Transforma el código en plantillas de CloudFormation, permitiendo construir infraestructura de manera programática y aprovechar las ventajas de los lenguajes de programación modernos.

## Características Principales

### 1. **Código Real**
- Usa lenguajes de programación (TypeScript, Python, Java, C#, Go)
- Abstracciones de alto nivel
- Lógica condicional y loops
- Reutilización de código

### 2. **Constructs**
- Abstracciones reutilizables
- Composición de recursos
- Herencia y polimorfismo
- Libraries pre-construidas

### 3. **Tooling Integrado**
- CLI para gestión de stacks
- Sintetización automática
- Testing integrado
- Diff visualization

### 4. **CloudFormation Backend**
- Plantillas generadas automáticamente
- Estado gestionado por CloudFormation
- Rollback automático
- Change sets

## Lenguajes Soportados

### **TypeScript**
```typescript
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class MyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new s3.Bucket(this, 'MyBucket', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
  }
}
```

### **Python**
```python
from aws_cdk import (
    aws_s3 as s3,
    aws_ec2 as ec2,
    Stack,
    App
)
from constructs import Construct

class MyStack(Stack):
    def __init__(self, scope: Construct, id: str, **kwargs):
        super().__init__(scope, id, **kwargs)
        
        bucket = s3.Bucket(self, "MyBucket",
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            removal_policy=cdk.RemovalPolicy.DESTROY
        )
```

### **Java**
```java
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.services.s3.Bucket;
import software.amazon.awscdk.services.s3.BucketEncryption;

public class MyStack extends Stack {
    public MyStack(final Construct scope, final String id) {
        super(scope, id);

        Bucket bucket = Bucket.Builder.create(this, "MyBucket")
            .versioned(true)
            .encryption(BucketEncryption.S3_MANAGED)
            .removalPolicy(RemovalPolicy.DESTROY)
            .build();
    }
}
```

### **C#**
```csharp
using Amazon.CDK;
using Amazon.CDK.AWS.S3;

public class MyStack : Stack
{
    public MyStack(Construct scope, string id, IStackProps props = null) 
        : base(scope, id, props)
    {
        var bucket = new Bucket(this, "MyBucket", new BucketProps
        {
            Versioned = true,
            Encryption = BucketEncryption.S3_MANAGED,
            RemovalPolicy = RemovalPolicy.DESTROY
        });
    }
}
```

## Arquitectura del CDK

### **App**
- Contenedor principal de stacks
- Configuración global
- Entry point de la aplicación

### **Stack**
- Unidad de despliegue
- Equivalente a CloudFormation stack
- Configuración de contexto

### **Construct**
- Unidad básica de construcción
- Abstracción de recursos
- Composición y reutilización

### **Level 1 (L1) Constructs**
- Mapeo directo a CloudFormation
- Todos los recursos disponibles
- Propiedades completas

### **Level 2 (L2) Constructs**
- Abstracciones de alto nivel
- Configuraciones por defecto inteligentes
- Métodos de conveniencia

### **Level 3 (L3) Constructs**
- Patrones pre-construidos
- Soluciones completas
- Mejores prácticas integradas

## Instalación y Configuración

### **Prerrequisitos**
```bash
# Node.js 14+ para TypeScript
npm install -g aws-cdk

# Python 3.7+ para Python
pip install aws-cdk-lib constructs

# Java 8+ para Java
# Maven/Gradle dependency

# .NET Core 3.1+ para C#
dotnet add package Amazon.CDK
```

### **Inicialización de Proyecto**
```bash
# TypeScript
cdk init app --language typescript

# Python
cdk init app --language python

# Java
cdk init app --language java

# C#
cdk init app --language csharp
```

### **Estructura del Proyecto**
```
my-cdk-app/
├── bin/
│   └── my-cdk-app.ts          # App entry point
├── lib/
│   └── my-cdk-app-stack.ts    # Stack definition
├── test/
│   └── my-cdk-app.test.ts     # Unit tests
├── package.json
├── tsconfig.json
└── cdk.json                   # CDK configuration
```

## Comandos del CDK CLI

### **Inicialización**
```bash
cdk bootstrap          # Bootstrap para primer uso
cdk init --language typescript  # Inicializar proyecto
```

### **Síntesis y Despliegue**
```bash
cdk synth              # Generar CloudFormation template
cdk diff               # Mostrar cambios
cdk deploy             # Desplegar stack
cdk deploy --all       # Desplegar todos los stacks
```

### **Gestión**
```bash
cdk list               # Listar stacks
cdk destroy            # Eliminar stack
cdk destroy --all      # Eliminar todos los stacks
cdk context            # Gestionar contexto
```

### **Testing**
```bash
cdk test               # Ejecutar tests
cdk watch              # Watch mode para desarrollo
```

## Constructs y Patrones

### **L2 Construct Example**
```typescript
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

// L2 construct con defaults inteligentes
const lambdaFunction = new lambda.Function(this, 'MyFunction', {
  runtime: lambda.Runtime.PYTHON_3_9,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda'),
  environment: {
    TABLE_NAME: table.tableName
  }
});

const api = new apigateway.LambdaRestApi(this, 'MyApi', {
  handler: lambdaFunction,
  proxy: true
});
```

### **L3 Construct Example**
```typescript
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';

// L3 construct - patrón completo
const fargateService = new ApplicationLoadBalancedFargateService(this, 'WebService', {
  cluster: cluster,
  cpu: 256,
  memoryLimitMiB: 512,
  desiredCount: 2,
  taskImageOptions: {
    image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
    containerPort: 80
  }
});
```

### **Custom Construct**
```typescript
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';

export class S3LambdaProcessor extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const bucket = new s3.Bucket(this, 'Bucket', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED
    });

    const processor = new lambda.Function(this, 'Processor', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'processor.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        BUCKET_NAME: bucket.bucketName
      }
    });

    bucket.grantRead(processor);
  }
}
```

## Contexto y Configuración

### **cdk.json**
```json
{
  "app": "npx ts-node --prefer-ts-exts bin/my-app.ts",
  "context": {
    "@aws-cdk/aws-apigateway:usagePlanEnabled": false,
    "@aws-cdk/core:enableStackNameDuplicates": true,
    "aws-cdk:enableDiffNoFail": true,
    "stage": "dev",
    "region": "us-east-1"
  }
}
```

### **Uso de Contexto**
```typescript
const stage = this.node.tryGetContext('stage') || 'dev';
const region = this.node.tryGetContext('region') || 'us-east-1';

new s3.Bucket(this, 'Bucket', {
  bucketName: `my-app-${stage}-${region}-${this.account}`
});
```

## Testing

### **Unit Tests**
```typescript
import { Template } from 'aws-cdk-lib/assertions';
import { MyStack } from '../lib/my-stack';

test('S3 Bucket Created', () => {
  const app = new cdk.App();
  const stack = new MyStack(app, 'MyTestStack');
  
  const template = Template.fromStack(stack);
  
  template.hasResourceProperties('AWS::S3::Bucket', {
    VersioningConfiguration: {
      Status: 'Enabled'
    }
  });
});
```

### **Snapshot Tests**
```typescript
test('Snapshot Test', () => {
  const app = new cdk.App();
  const stack = new MyStack(app, 'MyTestStack');
  
  expect(Template.fromStack(stack)).toMatchSnapshot();
});
```

## Aspectos y Decoradores

### **Custom Aspect**
```typescript
import { IAspect } from 'aws-cdk-lib';
import { CfnResource } from 'aws-cdk-lib';

class TagAspect implements IAspect {
  constructor(private tags: { [key: string]: string }) {}

  visit(node: IConstruct) {
    if (CfnResource.isCfnResource(node)) {
      Object.entries(this.tags).forEach(([key, value]) => {
        node.addPropertyOverride('Tags', [{ Key: key, Value: value }]);
      });
    }
  }
}

// Aplicar aspect
Aspects.of(stack).add(new TagAspect({
  Environment: 'production',
  Project: 'my-app'
}));
```

## Integración con CI/CD

### **GitHub Actions**
```yaml
name: CDK Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm run build
      - run: cdk synth
      - run: cdk deploy --require-approval never
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### **AWS CodePipeline**
```typescript
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';

const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
  pipelineName: 'MyAppPipeline'
});

const sourceOutput = new codepipeline.Artifact();
const sourceAction = new codepipeline_actions.GitHubSourceAction({
  actionName: 'GitHub_Source',
  owner: 'my-org',
  repo: 'my-repo',
  output: sourceOutput,
  oauthToken: cdk.SecretValue.secretsManager('github-token')
});

pipeline.addStage({
  stageName: 'Source',
  actions: [sourceAction]
});
```

## Mejores Prácticas

### **1. Organización del Código**
- Constructs reutilizables
- Separación de responsabilidades
- Configuración externa
- Tests completos

### **2. Seguridad**
- Principio de menor privilegio
- Sin secrets en código
- IAM roles específicos
- Validación de inputs

### **3. Performance**
- Lazy loading de recursos
- Optimización de dependencias
- Build eficiente
- Síntesis rápida

### **4. Mantenimiento**
- Versionamiento semántico
- Documentación de constructs
- Testing continuo
- Code reviews

## Patrones Comunes

### **Multi-Stack Application**
```typescript
// bin/app.ts
const app = new cdk.App();

new NetworkStack(app, 'Network', {
  env: { region: 'us-east-1' }
});

new DatabaseStack(app, 'Database', {
  vpc: networkStack.vpc,
  env: { region: 'us-east-1' }
});

new AppStack(app, 'Application', {
  vpc: networkStack.vpc,
  database: databaseStack.database,
  env: { region: 'us-east-1' }
});
```

### **Environment-Specific Configuration**
```typescript
interface StackProps extends cdk.StackProps {
  environment: string;
  tags: { [key: string]: string };
}

export class MyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    
    const isProd = props.environment === 'production';
    
    new s3.Bucket(this, 'Bucket', {
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      encryption: isProd ? s3.BucketEncryption.KMS : s3.BucketEncryption.S3_MANAGED
    });
  }
}
```

## Herramientas Ecosistema

### **CDK Constructs Hub**
- Biblioteca de constructs comunitarios
- Soluciones pre-construidas
- Patrones de mejores prácticas

### **CDK Watch**
- Desarrollo iterativo
- Hot reloading
- Síntesis automática

### **CDK Doctor**
- Diagnóstico de problemas
- Validación de configuración
- Recomendaciones

## Comparación CDK vs CloudFormation

### **CDK**
- ✅ Lenguajes de programación
- ✅ Abstracciones de alto nivel
- ✅ Testing integrado
- ✅ Reutilización de código
- ✅ IDE support
- ❌ Curva de aprendizaje inicial
- ❌ Dependencia de runtime

### **CloudFormation**
- ✅ Declarativo y simple
- ✅ Soporte nativo AWS
- ✅ Sin dependencias
- ✅ Universalmente compatible
- ❌ Verbose y repetitivo
- ❌ Sin lógica compleja
- ❌ Testing limitado

## Conclusión

AWS CDK representa la evolución de Infrastructure as Code, combinando el poder de CloudFormation con la flexibilidad de los lenguajes de programación. Permite a los desarrolladores construir infraestructura de manera más eficiente, segura y mantenible, aprovechando las mejores prácticas del desarrollo de software.

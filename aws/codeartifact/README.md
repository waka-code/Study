# AWS CodeArtifact

## Definición

AWS CodeArtifact es un servicio totalmente gestionado de repositorio de artefactos que permite a las organizaciones almacenar, publicar y compartir paquetes de software de forma segura. Proporciona repositorios compatibles con los formatos más comunes como Maven, npm, PyPI, NuGet y otros, con integración nativa con AWS IAM para control de acceso granular.

## Características Principales

### 1. **Totalmente Gestionado**
- Sin servidores que gestionar
- Escalado automático
- Alta disponibilidad
- Backups automáticos

### 2. **Seguridad Integrada**
- IAM integration
- Encriptación en reposo y tránsito
- Control de acceso granular
- Audit logging

### 3. **Multi-formato**
- Maven (Java)
- npm (Node.js)
- PyPI (Python)
- NuGet (.NET)
- Generic packages

### 4. **Integración AWS**
- CodeBuild, CodePipeline
- Lambda, ECS, EC2
- CloudWatch, CloudTrail
- VPC support

## Componentes Clave

### **Domain**
- Contenedor lógico principal
- Configuración global
- Políticas de acceso
- Billing unit

### **Repository**
- Almacenamiento de paquetes
- Conectividad entre repositorios
- Upstream connections
- Package versions

### **Package**
- Unidad de software
- Versiones y metadatos
- Dependencies
- Security scanning

### **Asset**
- Archivos individuales
- Package metadata
- Documentation
- Source archives

## Formatos Soportados

### **Maven**
```xml
<!-- settings.xml -->
<settings>
  <servers>
    <server>
      <id>my-domain</id>
      <username>aws</username>
      <password>${env.AWS_CODEARTIFACT_AUTH_TOKEN}</password>
    </server>
  </servers>
  
  <profiles>
    <profile>
      <id>codeartifact</id>
      <repositories>
        <repository>
          <id>my-domain</id>
          <url>https://my-domain-123456789012.d.codeartifact.us-east-1.amazonaws.com/maven/my-repo/</url>
        </repository>
      </repositories>
    </profile>
  </profiles>
  
  <activeProfiles>
    <activeProfile>codeartifact</activeProfile>
  </activeProfiles>
</settings>
```

### **npm**
```bash
# Configure npm registry
npm config set registry https://my-domain-123456789012.d.codeartifact.us-east-1.amazonaws.com/npm/my-repo/

# Set authentication
npm config set //my-domain-123456789012.d.codeartifact.us-east-1.amazonaws.com/:_authToken $(aws codeartifact get-authorization-token --domain my-domain --domain-owner 123456789012 --query authorizationToken --output text)

# Publish package
npm publish

# Install package
npm install my-package
```

### **PyPI (pip)**
```bash
# Configure pip
pip config set global.index-url https://my-domain-123456789012.d.codeartifact.us-east-1.amazonaws.com/pypi/my-repo/simple/

# Set authentication
pip config set global.extra-index-url https://aws:${CODEARTIFACT_AUTH_TOKEN}@my-domain-123456789012.d.codeartifact.us-east-1.amazonaws.com/pypi/my-repo/simple/

# Install package
pip install my-package

# Upload package
twine upload --repository my-repo dist/*
```

### **NuGet**
```xml
<!-- NuGet.config -->
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <add key="codeartifact" value="https://my-domain-123456789012.d.codeartifact.us-east-1.amazonaws.com/nuget/my-repo/v3/index.json" />
  </packageSources>
  
  <packageSourceCredentials>
    <codeartifact>
      <add key="Username" value="aws" />
      <add key="ClearTextPassword" value="%CODEARTIFACT_AUTH_TOKEN%" />
    </codeartifact>
  </packageSourceCredentials>
</configuration>
```

## Configuración Inicial

### **Crear Domain**
```bash
# Usando AWS CLI
aws codeartifact create-domain \
  --domain my-domain \
  --domain-owner 123456789012

# Usando Console
# 1. Ir a CodeArtifact console
# 2. Click "Create domain"
# 3. Ingresar nombre del domain
# 4. Click "Create domain"
```

### **Crear Repository**
```bash
# Crear repositorio Maven
aws codeartifact create-repository \
  --domain my-domain \
  --domain-owner 123456789012 \
  --repository my-maven-repo \
  --description "Maven repository for Java packages"

# Crear repositorio npm
aws codeartifact create-repository \
  --domain my-domain \
  --repository my-npm-repo \
  --description "npm repository for Node.js packages"

# Crear repositorio PyPI
aws codeartifact create-repository \
  --domain my-domain \
  --repository my-pypi-repo \
  --description "PyPI repository for Python packages"
```

### **Configurar Upstream**
```bash
# Conectar a Maven Central
aws codeartifact update-repository \
  --domain my-domain \
  --repository my-maven-repo \
  --upstreams repository=maven-central

# Conectar a npm registry
aws codeartifact update-repository \
  --domain my-domain \
  --repository my-npm-repo \
  --upstreams repository=npm

# Conectar a PyPI
aws codeartifact update-repository \
  --domain my-domain \
  --repository my-pypi-repo \
  --upstreams repository=pypi
```

## Autenticación

### **Authorization Token**
```bash
# Get authorization token
aws codeartifact get-authorization-token \
  --domain my-domain \
  --domain-owner 123456789012 \
  --query authorizationToken \
  --output text

# Token con expiración específica
aws codeartifact get-authorization-token \
  --domain my-domain \
  --duration-seconds 3600
```

### **IAM Role para CodeBuild**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "codeartifact:ReadFromRepository",
        "codeartifact:PublishPackageVersion",
        "codeartifact:PutPackageMetadata",
        "codeartifact:ReadAuthorizationToken"
      ],
      "Resource": [
        "arn:aws:codeartifact:us-east-1:123456789012:domain/my-domain",
        "arn:aws:codeartifact:us-east-1:123456789012:domain/my-domain/repository/*"
      ]
    }
  ]
}
```

### **Environment Variables**
```bash
# Exportar token para uso
export CODEARTIFACT_AUTH_TOKEN=$(aws codeartifact get-authorization-token --domain my-domain --query authorizationToken --output text)

# Para npm
export NPM_TOKEN=$CODEARTIFACT_AUTH_TOKEN

# Para Maven
export MAVEN_OPTS="-Dmaven.repo.local=$HOME/.m2/repository"
```

## Integración con CI/CD

### **CodeBuild Integration**
```yaml
# buildspec.yml
version: 0.2

phases:
  install:
    runtime-versions:
      nodejs: 14
    commands:
      - echo Installing dependencies from CodeArtifact
      - export CODEARTIFACT_AUTH_TOKEN=$(aws codeartifact get-authorization-token --domain my-domain --domain-owner 123456789012 --query authorizationToken --output text)
      - npm config set registry https://my-domain-123456789012.d.codeartifact.us-east-1.amazonaws.com/npm/my-repo/
      - npm config set //my-domain-123456789012.d.codeartifact.us-east-1.amazonaws.com/:_authToken $CODEARTIFACT_AUTH_TOKEN
      - npm install

  build:
    commands:
      - echo Building application
      - npm run build
      - npm run test

  post_build:
    commands:
      - echo Publishing to CodeArtifact
      - npm publish
```

### **CodePipeline Integration**
```yaml
# CodePipeline action for publishing
- Name: PublishToCodeArtifact
  ActionTypeId:
    Category: Build
    Owner: AWS
    Provider: CodeBuild
  Configuration:
    ProjectName: publish-build-project
    EnvironmentVariables:
      - Name: CODEARTIFACT_DOMAIN
        Value: my-domain
      - Name: CODEARTIFACT_REPO
        Value: my-npm-repo
```

### **GitHub Actions**
```yaml
name: Publish to CodeArtifact

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '14'
          registry-url: 'https://my-domain-123456789012.d.codeartifact.us-east-1.amazonaws.com/npm/my-repo/'
      
      - name: Get CodeArtifact auth token
        run: |
          echo "//my-domain-123456789012.d.codeartifact.us-east-1.amazonaws.com/:_authToken=$(aws codeartifact get-authorization-token --domain my-domain --domain-owner 123456789012 --query authorizationToken --output text)" >> ~/.npmrc
      
      - name: Install dependencies
        run: npm ci
      
      - name: Publish package
        run: npm publish
```

## Package Management

### **Publicar Paquetes**
```bash
# Maven
mvn deploy

# npm
npm publish

# PyPI
twine upload --repository my-repo dist/*

# NuGet
dotnet nuget push my-package.1.0.0.nupkg --source my-repo
```

### **Listar Paquetes**
```bash
# Listar todos los paquetes
aws codeartifact list-packages \
  --domain my-domain \
  --repository my-repo \
  --format npm

# Listar versiones de un paquete
aws codeartifact list-package-versions \
  --domain my-domain \
  --repository my-repo \
  --package my-package \
  --format npm
```

### **Eliminar Paquetes**
```bash
# Eliminar versión específica
aws codeartifact delete-package-versions \
  --domain my-domain \
  --repository my-repo \
  --package my-package \
  --format npm \
  --versions 1.0.0 1.1.0

# Eliminar paquete completo
aws codeartifact delete-package \
  --domain my-domain \
  --repository my-repo \
  --package my-package \
  --format npm
```

## Security y Access Control

### **Resource Policies**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowReadAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/CodeBuildRole"
      },
      "Action": [
        "codeartifact:ReadFromRepository",
        "codeartifact:GetRepositoryEndpoint"
      ],
      "Resource": "arn:aws:codeartifact:us-east-1:123456789012:domain/my-domain/repository/my-repo"
    },
    {
      "Sid": "AllowPublishAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/CICDRole"
      },
      "Action": [
        "codeartifact:PublishPackageVersion",
        "codeartifact:PutPackageMetadata"
      ],
      "Resource": "arn:aws:codeartifact:us-east-1:123456789012:domain/my-domain/repository/my-repo"
    }
  ]
}
```

### **IAM Policies**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "codeartifact:ReadFromRepository",
        "codeartifact:PublishPackageVersion",
        "codeartifact:ReadAuthorizationToken"
      ],
      "Resource": [
        "arn:aws:codeartifact:us-east-1:123456789012:domain/my-domain",
        "arn:aws:codeartifact:us-east-1:123456789012:domain/my-domain/repository/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "codeartifact:GetAuthorizationToken",
      "Resource": "*"
    }
  ]
}
```

### **VPC Endpoint**
```bash
# Crear VPC endpoint para CodeArtifact
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-12345678 \
  --service-name com.amazonaws.us-east-1.codeartifact.repositories \
  --vpc-endpoint-type Interface \
  --subnet-ids subnet-12345678 subnet-87654321 \
  --security-group-ids sg-12345678 \
  --private-dns-enabled
```

## Monitoring y Logging

### **CloudWatch Metrics**
```bash
# Get repository metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/CodeArtifact \
  --metric-name PackageCount \
  --dimensions Name=DomainName,Value=my-domain Name=RepositoryName,Value=my-repo \
  --statistics Sum \
  --period 3600
```

### **CloudTrail Events**
```json
{
  "eventSource": "codeartifact.amazonaws.com",
  "eventName": "PublishPackageVersion",
  "requestParameters": {
    "domain": "my-domain",
    "repository": "my-repo",
    "package": "my-package",
    "format": "npm",
    "packageVersion": "1.0.0"
  }
}
```

### **Repository Metrics**
```bash
# List repositories
aws codeartifact list-repositories --domain my-domain

# Get repository info
aws codeartifact get-repository-endpoint \
  --domain my-domain \
  --repository my-repo \
  --format npm

# Get package metadata
aws codeartifact describe-package \
  --domain my-domain \
  --repository my-repo \
  --package my-package \
  --format npm
```

## Best Practices

### **1. Repository Organization**
- Domains por organización o equipo
- Repositories por tipo de paquete
- Upstream connections para dependencias externas
- Clear naming conventions

### **2. Security**
- Principio de menor privilegio
- Resource policies específicas
- Regular token rotation
- VPC endpoints para acceso privado

### **3. Performance**
- Cache dependencies localmente
- Usar upstream connections eficientemente
- Optimizar package sizes
- Regional repositories

### **4. Governance**
- Version control policies
- Security scanning integration
- Compliance checks
- Package approval workflows

## Use Cases

### **1. Enterprise Package Management**
- Internal libraries sharing
- Third-party dependency management
- License compliance
- Security scanning

### **2. Microservices Architecture**
- Shared libraries
- Service contracts
- API definitions
- Configuration packages

### **3. Multi-language Applications**
- Polyglot development
- Cross-language dependencies
- Build tool integration
- Release management

### **4. CI/CD Pipelines**
- Build artifacts
- Test dependencies
- Deployment packages
- Version control

## Advanced Features

### **Package Origin Configuration**
```bash
# Configurar origen de paquetes
aws codeartifact put-package-origin-configuration \
  --domain my-domain \
  --repository my-repo \
  --format npm \
  --package my-package \
  --restrict-upstream true \
  --origins repository=external-repo
```

### **Cross-Account Access**
```bash
# Compartir repositorio con otra cuenta
aws codeartifact put-repository-permissions-policy \
  --domain my-domain \
  --repository my-repo \
  --policy-document file://cross-account-policy.json \
  --domain-owner 123456789012
```

### **Package Lifecycle Management**
```bash
# Listar paquetes viejos
aws codeartifact list-packages \
  --domain my-domain \
  --repository my-repo \
  --format npm

# Eliminar paquetes no usados
aws codeartifact delete-package-versions \
  --domain my-domain \
  --repository my-repo \
  --package old-package \
  --format npm \
  --versions $(aws codeartifact list-package-versions --domain my-domain --repository my-repo --package old-package --format npm --query 'versions[]' --output text | tr '\t' ' ')
```

## Costos

### **Pricing**
- **Storage**: $0.05 por GB-mes
- **Data transfer**: Primer 10 GB gratuitos
- **Requests**: Primer 100,000 requests gratuitos
- **Domain fee**: $0.10 por domain-mes

### **Cost Optimization**
- Regular cleanup of old packages
- Efficient upstream connections
- Regional repositories
- Package size optimization

## Comparison with Other Services

### **CodeArtifact vs Nexus**
- **CodeArtifact**: Gestionado, IAM integration, serverless
- **Nexus**: Self-hosted, more features, custom plugins

### **CodeArtifact vs Artifactory**
- **CodeArtifact**: Simpler, AWS integration, pay-as-you-go
- **Artifactory**: More features, enterprise features, self-hosted

### **CodeArtifact vs npm Registry**
- **CodeArtifact**: Private, secure, multi-format
- **npm Registry**: Public, larger ecosystem, free for public packages

## Migration

### **Desde Nexus**
```bash
# Export packages desde Nexus
# Upload a CodeArtifact
aws codeartifact publish-package-version \
  --domain my-domain \
  --repository my-repo \
  --package my-package \
  --format maven \
  --package-version 1.0.0 \
  --package-content file://my-package-1.0.0.jar
```

### **Desde Artifactory**
```bash
# Migrar configuración
# Actualizar build scripts
# Actualizar CI/CD pipelines
# Validar migración
```

## Conclusion

AWS CodeArtifact es ideal para organizaciones que necesitan un repositorio de paquetes seguro, escalable y perfectamente integrado con el ecosistema AWS. Es especialmente útil para empresas con múltiples equipos, lenguajes de programación y requisitos de seguridad y cumplimiento normativo.

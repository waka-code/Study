# AWS CodeBuild

## Definición

AWS CodeBuild es un servicio de compilación totalmente gestionado que compila código fuente, ejecuta tests y produce artefactos listos para despliegue. Elimina la necesidad de provisionar, gestionar y escalar servidores de compilación, proporcionando un entorno de compilación escalable, seguro y rentable.

## Características Principales

### 1. **Totalmente Gestionado**
- Sin servidores que gestionar
- Escalado automático
- Pago por uso
- Alta disponibilidad

### 2. **Múltiples Entornos**
- Entornos pre-configurados
- Soporte para Docker
- Custom images
- Multiple runtimes

### 3. **Integración AWS**
- CodePipeline integration
- CodeCommit, S3, GitHub
- CodeDeploy, Elastic Beanstalk
- CloudWatch, SNS

### 4. **Seguridad**
- IAM integration
- VPC support
- Encryption
- Resource policies

## Componentes Clave

### **Build Project**
- Configuración de compilación
- Source provider
- Environment settings
- Build specifications

### **Build Environment**
- Compute resources
- Runtime environment
- Docker containers
- Custom configurations

### **Build Specification**
- buildspec.yml file
- Build phases
- Commands configuration
- Artifacts definition

### **Build**
- Ejecución individual
- Logs y métricas
- Status tracking
- Artifacts output

## Entornos de Compilación

### **Managed Images**
```yaml
# Ubuntu (default)
- Ubuntu: 20.04, 18.04, 16.04
- Runtimes: Node.js, Python, Java, Go, Ruby, .NET, PHP

# Amazon Linux 2
- Optimizado para AWS
- AWS CLI pre-installed
- Better integration

# Windows Server
- Windows Server 2019
- .NET Framework support
- PowerShell support

# Docker
- Docker runtime
- Container builds
- Multi-architecture
```

### **Custom Images**
```dockerfile
# Dockerfile para custom image
FROM ubuntu:20.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    python3.9 \
    python3-pip \
    nodejs \
    npm \
    git \
    awscli

# Install tools
RUN pip3 install awscli boto3
RUN npm install -g @aws-amplify/cli

# Set working directory
WORKDIR /app

# Default user
USER root
```

### **Docker Images Privados**
```bash
# Build y push custom image
docker build -t my-custom-build-image .
docker tag my-custom-build-image:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-build-image:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-build-image:latest
```

## Build Specification (buildspec.yml)

### **Estructura Básica**
```yaml
version: 0.2

phases:
  install:
    runtime-versions:
      nodejs: 14
    commands:
      - echo Installing dependencies...
      - npm install

  pre_build:
    commands:
      - echo Pre-build phase...
      - npm run lint
      - npm run test:unit

  build:
    commands:
      - echo Build started...
      - npm run build
      - npm run test:integration

  post_build:
    commands:
      - echo Post-build phase...
      - npm run package

artifacts:
  files:
    - '**/*'
  discard-paths: no
  name: build-$(date +%Y%m%d%H%M%S).zip

cache:
  paths:
    - '/root/.npm/**/*'
    - 'node_modules/**/*'
```

### **Phases Detalladas**
```yaml
version: 0.2

phases:
  install:
    runtime-versions:
      python: 3.9
      nodejs: 14
    commands:
      - echo Installing system dependencies
      - apt-get update -y
      - apt-get install -y postgresql-client
      - echo Installing Python dependencies
      - pip install -r requirements.txt
      - echo Installing Node.js dependencies
      - npm install

  pre_build:
    commands:
      - echo Pre-build validation
      - python manage.py check --deploy
      - npm run lint
      - npm run test:unit
      - echo Setting up environment
      - cp .env.example .env
      - echo $DATABASE_URL > .env/db

  build:
    commands:
      - echo Building application
      - npm run build
      - python manage.py collectstatic --noinput
      - echo Running integration tests
      - npm run test:integration
      - python manage.py test

  post_build:
    commands:
      - echo Packaging application
      - tar -czf application.tar.gz *
      - echo Build completed successfully
    finally:
      - echo Cleaning up
      - rm -rf node_modules/.cache
```

### **Artifacts y Caching**
```yaml
artifacts:
  files:
    - 'dist/**/*'
    - 'package.json'
    - 'README.md'
  discard-paths: yes
  base-directory: dist
  name: my-app-$(date +%Y%m%d).zip
  secondary-artifacts:
    documentation:
      files:
        - 'docs/**/*'
      name: docs-$(date +%Y%m%d).zip

cache:
  paths:
    - '/root/.npm/**/*'
    - 'node_modules/**/*'
    - 'vendor/bundle/**/*'
    - '/var/lib/apt/lists/**/*'
```

## Configuración de Build Project

### **AWS CLI**
```bash
# Create build project
aws codebuild create-project \
  --name my-build-project \
  --source type=CODECOMMIT,location=https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-app \
  --artifacts type=NO_ARTIFACTS \
  --environment type=LINUX_CONTAINER,computeType=BUILD_GENERAL1_SMALL,image=aws/codebuild/standard:5.0 \
  --service-role arn:aws:iam::123456789012:role/CodeBuildServiceRole

# Start build
aws codebuild start-build \
  --project-name my-build-project \
  --source-version main
```

### **CloudFormation**
```yaml
Resources:
  MyBuildProject:
    Type: AWS::CodeBuild::Project
    Properties:
      Name: my-build-project
      Description: Build project for my application
      ServiceRole: !GetAtt CodeBuildRole.Arn
      Source:
        Type: CODECOMMIT
        Location: https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-app
        BuildSpec: buildspec.yml
      Artifacts:
        Type: S3
        Location: my-build-artifacts-bucket
        Name: build-$(date +%Y%m%d).zip
        Packaging: ZIP
      Environment:
        Type: LINUX_CONTAINER
        ComputeType: BUILD_GENERAL1_SMALL
        Image: aws/codebuild/standard:5.0
        EnvironmentVariables:
          - Name: NODE_ENV
            Value: production
          - Name: API_URL
            Value: https://api.example.com
      Cache:
        Type: S3
        Location: my-build-cache-bucket
```

## Integración con Source Providers

### **CodeCommit Integration**
```yaml
# buildspec.yml
version: 0.2

phases:
  install:
    runtime-versions:
      nodejs: 14
    commands:
      - echo Installing dependencies
      - npm install

  build:
    commands:
      - echo Building application
      - npm run build

artifacts:
  files:
    - 'dist/**/*'
  name: build-$(CODEBUILD_RESOLVED_SOURCE_VERSION).zip
```

### **GitHub Integration**
```bash
# Configure GitHub webhook
aws codebuild create-webhook \
  --project-name my-build-project \
  --branch-pattern main \
  --filter-groups \
    type=EVENT,pattern=PUSH,excludeMatchedPattern=false
```

### **S3 Integration**
```yaml
source:
  type: S3
  location: my-source-bucket/source-code.zip
  buildspec: buildspec.yml
```

## Environment Variables

### **Configuración**
```yaml
environment:
  type: LINUX_CONTAINER
  computeType: BUILD_GENERAL1_SMALL
  image: aws/codebuild/standard:5.0
  environmentVariables:
    - Name: NODE_ENV
      Value: production
      Type: PLAINTEXT
    - Name: DATABASE_URL
      Value: postgresql://user:pass@host:5432/db
      Type: PLAINTEXT
    - Name: API_KEY
      Value: /my-app/api-key
      Type: PARAMETER_STORE
    - Name: SECRET_KEY
      Value: my-secret-key
      Type: SECRETS_MANAGER
```

### **Variables Predefinidas**
```bash
# Available in build environment
$CODEBUILD_BUILD_ID
$CODEBUILD_BUILD_NUMBER
$CODEBUILD_SOURCE_VERSION
$CODEBUILD_SOURCE_REPO_URL
$CODEBUILD_RESOLVED_SOURCE_VERSION
$CODEBUILD_INITIATOR
$CODEBUILD_WEBHOOK_TRIGGER
$CODEBUILD_WEBHOOK_HEAD_REF
$CODEBUILD_WEBHOOK_BASE_REF
$AWS_REGION
$AWS_ACCOUNT_ID
```

## Testing en CodeBuild

### **Unit Tests**
```yaml
version: 0.2

phases:
  install:
    runtime-versions:
      python: 3.9
    commands:
      - pip install -r requirements.txt
      - pip install pytest pytest-cov

  build:
    commands:
      - echo Running unit tests
      - pytest tests/unit/ --cov=app --cov-report=xml
      - echo Running linting
      - flake8 app/
      - echo Running security scan
      - bandit -r app/

reports:
  unit-tests:
    files:
      - 'reports/**/*'
    base-directory: 'reports'
    file-format: JUNITXML
  coverage:
    files:
      - 'coverage.xml'
    file-format: COBERTURAXML
```

### **Integration Tests**
```yaml
version: 0.2

phases:
  install:
    runtime-versions:
      python: 3.9
    commands:
      - pip install -r requirements.txt
      - pip install pytest-docker

  pre_build:
    commands:
      - echo Starting test environment
      - docker-compose -f docker-compose.test.yml up -d
      - sleep 30

  build:
    commands:
      - echo Running integration tests
      - pytest tests/integration/ --maxfail=1

  post_build:
    commands:
      echo Cleaning up test environment
      docker-compose -f docker-compose.test.yml down
```

## Multi-Container Builds

### **Docker Compose**
```yaml
version: 0.2

phases:
  install:
    runtime-versions:
      docker: 18
    commands:
      - echo Installing Docker Compose
      - curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o docker-compose
      - chmod +x docker-compose
      - mv docker-compose /usr/local/bin/

  build:
    commands:
      - echo Building Docker images
      - docker-compose build
      - echo Running tests in containers
      - docker-compose run --rm app npm test
      - echo Building production image
      - docker build -t my-app:latest .

  post_build:
    commands:
      - echo Pushing to ECR
      - aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
      - docker tag my-app:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/my-app:latest
      - docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/my-app:latest
```

## Reports y Test Results

### **Test Reports Configuration**
```yaml
version: 0.2

phases:
  install:
    runtime-versions:
      nodejs: 14
    commands:
      - npm install
      - npm install --save-dev jest

  build:
    commands:
      - npm run test:unit -- --coverage --watchAll=false

reports:
  jest-reports:
    files:
      - 'coverage/**/*'
    base-directory: 'coverage'
    file-format: JUNITXML
    discard-paths: yes
```

### **Custom Reports**
```yaml
version: 0.2

phases:
  build:
    commands:
      - echo Running custom tests
      - python run_tests.py --output-format junit --output-file test-results.xml

reports:
  custom-tests:
    files:
      - 'test-results.xml'
    file-format: JUNITXML
```

## Caching Strategies

### **Local Cache**
```yaml
cache:
  modes:
    - LOCAL_DOCKER_LAYER_CACHE
    - LOCAL_SOURCE_CACHE
    - LOCAL_CUSTOM_CACHE
```

### **S3 Cache**
```yaml
cache:
  type: S3
  location: my-build-cache-bucket
  modes:
    - S3
```

### **Custom Cache Paths**
```yaml
cache:
  paths:
    - '/root/.npm/**/*'
    - 'node_modules/**/*'
    - 'vendor/bundle/**/*'
    - '/var/lib/apt/lists/**/*'
    - 'target/**/*'
    - '.gradle/**/*'
```

## Security

### **IAM Role**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::my-build-artifacts-bucket/*",
        "arn:aws:s3:::my-build-cache-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchCheckLayerAvailability",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    }
  ]
}
```

### **VPC Configuration**
```yaml
environment:
  type: LINUX_CONTAINER
  computeType: BUILD_GENERAL1_SMALL
  image: aws/codebuild/standard:5.0
  registryCredential:
    credential: arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret
    credentialProvider: SECRETS_MANAGER
  privilegedMode: false
  vpcConfig:
    vpcId: vpc-12345678
    subnets:
      - subnet-12345678
      - subnet-87654321
    securityGroupIds:
      - sg-12345678
```

## Monitoring y Logging

### **CloudWatch Logs**
```bash
# View build logs
aws logs get-log-events \
  --log-group-name /aws/codebuild/my-build-project \
  --log-stream-name build-id

# Stream logs in real-time
aws logs tail /aws/codebuild/my-build-project --follow
```

### **CloudWatch Metrics**
```bash
# Get build metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/CodeBuild \
  --metric-name BuildDuration \
  --dimensions Name=ProjectName,Value=my-build-project \
  --statistics Average \
  --period 3600 \
  --start-time 2023-01-01T00:00:00Z \
  --end-time 2023-01-02T00:00:00Z
```

### **Build Notifications**
```yaml
# CloudWatch Events rule
{
  "source": ["aws.codebuild"],
  "detail-type": ["CodeBuild Build State Change"],
  "detail": {
    "project-name": ["my-build-project"],
    "build-status": ["SUCCEEDED", "FAILED", "STOPPED"]
  }
}
```

## Best Practices

### **1. Build Optimization**
- Usar caching efectivamente
- Optimizar dependencies
- Parallel builds
- Incremental builds

### **2. Security**
- Principio de menor privilegio
- Secrets management
- VPC isolation
- Image scanning

### **3. Performance**
- Right-sizing de compute
- Cache strategies
- Parallel phases
- Optimized Docker images

### **4. Reliability**
- Retry mechanisms
- Health checks
- Monitoring
- Alerting

## Use Cases

### **1. Web Applications**
- Build de SPAs
- Asset optimization
- Testing automatizado
- Deployment pipelines

### **2. Mobile Applications**
- iOS/Android builds
- Testing automatizado
- App store deployment
- Beta distribution

### **3. Microservices**
- Container builds
- Multi-service builds
- Integration testing
- Service mesh deployment

### **4. Data Processing**
- ETL pipelines
- Machine learning builds
- Data validation
- Model deployment

## Costos

### **Pricing**
- **BUILD_GENERAL1_SMALL**: $0.005 por minuto
- **BUILD_GENERAL1_MEDIUM**: $0.01 por minuto
- **BUILD_GENERAL1_LARGE**: $0.02 por minuto
- **BUILD_GENERAL1_2XLARGE**: $0.04 por minuto

### **Cost Optimization**
- Build caching
- Right-sizing
- Scheduled builds
- Reserved capacity

## Comparison with Other Services

### **CodeBuild vs Jenkins**
- **CodeBuild**: Gestionado, escalable, integración AWS
- **Jenkins**: Customizable, plugins, self-hosted

### **CodeBuild vs CircleCI**
- **CodeBuild**: Mejor integración AWS, pricing por uso
- **CircleCI**: Más features, mejor UI

### **CodeBuild vs GitHub Actions**
- **CodeBuild**: Más poderoso, mejor para AWS
- **GitHub Actions**: Mejor integración GitHub, más community

## Conclusion

AWS CodeBuild es ideal para equipos que necesitan un servicio de compilación escalable, seguro y perfectamente integrado con el ecosistema AWS. Elimina la complejidad de gestionar servidores de compilación y proporciona una solución rentable para pipelines CI/CD modernos.

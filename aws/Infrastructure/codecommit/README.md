# AWS CodeCommit

## Definición

AWS CodeCommit es un servicio de control de versiones totalmente gestionado, seguro y altamente escalable que aloja repositorios Git privados. Elimina la necesidad de gestionar tu propia infraestructura de control de versiones y se integra perfectamente con otros servicios AWS para crear pipelines CI/CD completos.

## Características Principales

### 1. **Totalmente Gestionado**
- Sin servidores que gestionar
- Alta disponibilidad y durabilidad
- Escalado automático
- Backups automáticos

### 2. **Seguridad Integrada**
- Encriptación en reposo y en tránsito
- Integración con IAM
- MFA support
- Audit logging

### 3. **Git Compatible**
- Compatible con clientes Git estándar
- Mismos comandos y workflows
- Branching, merging, tagging
- Hooks personalizados

### 4. **Integración AWS**
- CodeBuild para builds
- CodeDeploy para despliegues
- CodePipeline para pipelines
- CloudWatch Events para triggers

## Componentes Clave

### **Repository**
- Contenedor de código fuente
- Historial de versiones
- Branches y tags
- Configuración de acceso

### **Branch**
- Línea de desarrollo independiente
- Feature branches
- Release branches
- Hotfix branches

### **Commit**
- Cambio atómico en el código
- Metadata del autor
- Timestamp
- Message descriptivo

### **Pull Request**
- Propuesta de cambio
- Code review workflow
- Discussion thread
- Merge approval

## Configuración Inicial

### **Crear Repository**
```bash
# Usando AWS CLI
aws codecommit create-repository \
  --repository-name my-app \
  --repository-description "My application repository"

# Usando Console
# 1. Ir a CodeCommit console
# 2. Click "Create repository"
# 3. Ingresar nombre y descripción
# 4. Click "Create"
```

### **Configurar Credenciales**

#### **Opción 1: IAM User con HTTPS**
```bash
# Configurar Git credentials
git config --global credential.helper '!aws codecommit credential-helper $@'
git config --global credential.UseHttpPath true

# Clonar repositorio
git clone https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-app
```

#### **Opción 2: SSH Keys**
```bash
# Generar SSH key
ssh-keygen -t rsa -b 4096 -C "my-email@example.com"

# Subir public key a IAM
# IAM -> Users -> [User] -> Security credentials -> Upload SSH public key

# Configurar SSH
git config --global core.sshCommand "ssh -i ~/.ssh/my-key"

# Clonar con SSH
git clone ssh://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-app
```

#### **Opción 3: AWS CLI Helper**
```bash
# Instalar AWS CLI helper
pip install git-remote-codecommit

# Clonar con helper
git clone codecommit://my-app
```

## Operaciones Básicas

### **Clonar Repository**
```bash
# HTTPS
git clone https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-app

# SSH
git clone ssh://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-app

# AWS CLI helper
git clone codecommit://my-app
```

### **Operaciones Git Estándar**
```bash
# Cambiar al directorio
cd my-app

# Crear archivo
echo "Hello World" > README.md

# Add y commit
git add README.md
git commit -m "Initial commit"

# Push a CodeCommit
git push -u origin main

# Crear branch
git checkout -b feature/new-feature

# Hacer cambios
git add .
git commit -m "Add new feature"

# Push branch
git push origin feature/new-feature

# Crear pull request (desde console)
```

## Branching Strategy

### **Git Flow**
```bash
# Main branches
git checkout main
git checkout develop

# Feature branches
git checkout -b feature/user-authentication

# Release branches
git checkout -b release/v1.2.0

# Hotfix branches
git checkout -b hotfix/critical-bug-fix
```

### **GitHub Flow**
```bash
# Main branch
git checkout main

# Feature branches
git checkout -b feature/api-endpoint

# Direct merge to main
git checkout main
git merge feature/api-endpoint
git push origin main
```

## Pull Requests

### **Crear Pull Request**
```bash
# 1. Push feature branch
git push origin feature/new-feature

# 2. Ir a CodeCommit console
# 3. Seleccionar repository
# 4. Click "Create pull request"
# 5. Configurar source y destination branches
# 6. Agregar título y descripción
# 7. Asignar reviewers
# 8. Click "Create pull request"
```

### **Pull Request Workflow**
```bash
# Review process
# 1. Reviewers revisan cambios
# 2. Dejan comentarios y aprobaciones
# 3. Author hace cambios solicitados
# 4. Actualiza pull request
# 5. Final approval
# 6. Merge pull request
```

## Triggers y Automatización

### **CloudWatch Events Trigger**
```json
{
  "source": ["aws.codecommit"],
  "detail-type": ["CodeCommit Repository State Change"],
  "detail": {
    "event": ["referenceCreated", "referenceUpdated"],
    "referenceType": ["branch"],
    "referenceName": ["main", "develop"]
  }
}
```

### **Lambda Function para Triggers**
```python
import json
import boto3
import subprocess

def lambda_handler(event, context):
    # Extraer información del evento
    repository = event['detail']['repositoryName']
    commit_id = event['detail']['commitId']
    
    # Iniciar CodeBuild
    codebuild = boto3.client('codebuild')
    
    response = codebuild.start_build(
        projectName='my-build-project',
        sourceVersion=commit_id,
        environmentVariablesOverride=[
            {
                'name': 'REPOSITORY',
                'value': repository
            }
        ]
    )
    
    return {
        'statusCode': 200,
        'body': json.dumps('Build started successfully')
    }
```

### **Configurar Trigger**
```bash
# Crear trigger
aws codecommit put-repository-triggers \
  --repository-name my-app \
  --triggers name=BuildTrigger,destinationArn=arn:aws:lambda:us-east-1:123456789:function:BuildFunction,events=push,branches=main
```

## Integración con CI/CD

### **CodePipeline Integration**
```yaml
# CodePipeline configuration
Stages:
  - Name: Source
    Actions:
      - Name: SourceAction
        ActionTypeId:
          Category: Source
          Owner: AWS
          Provider: CodeCommit
        Configuration:
          RepositoryName: my-app
          BranchName: main
          PollForSourceChanges: false
        OutputArtifacts:
          - Name: SourceOutput
        Triggers:
          - Type: Webhook
            WebhookFilters:
              - JsonPath: "$.ref"
                MatchEquals: refs/heads/{Branch}
```

### **CodeBuild Integration**
```yaml
# buildspec.yml
version: 0.2

phases:
  install:
    runtime-versions:
      nodejs: 14
    commands:
      - npm install
  build:
    commands:
      - npm run build
      - npm run test
  post_build:
    commands:
      - npm run deploy

artifacts:
  files:
    - '**/*'
  discard-paths: yes
```

## Seguridad

### **IAM Policies**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "codecommit:GitPull",
        "codecommit:GitPush"
      ],
      "Resource": "arn:aws:codecommit:us-east-1:123456789:my-app"
    },
    {
      "Effect": "Allow",
      "Action": [
        "codecommit:GetRepository",
        "codecommit:ListRepositories"
      ],
      "Resource": "*"
    }
  ]
}
```

### **Repository Permissions**
```bash
# List repositories
aws codecommit list-repositories

# Get repository info
aws codecommit get-repository --repository-name my-app

# Update repository description
aws codecommit update-repository-description \
  --repository-name my-app \
  --repository-description "Updated description"
```

### **Branch Protection**
```bash
# Set branch protection rules
aws codecommit update-repository-branch-name \
  --repository-name my-app \
  --old-branch-name main \
  --new-branch-name main
```

## Hooks y Automatización

### **Pre-commit Hook**
```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run tests
npm test

# Check code style
npm run lint

# Security scan
npm audit

# Exit with error if any test fails
if [ $? -ne 0 ]; then
    echo "Tests failed, commit aborted"
    exit 1
fi
```

### **Pre-push Hook**
```bash
#!/bin/sh
# .git/hooks/pre-push

# Run integration tests
npm run test:integration

# Build application
npm run build

# Security scan
npm audit --audit-level moderate
```

## Best Practices

### **1. Repository Structure**
```
my-app/
├── src/                    # Source code
├── tests/                  # Test files
├── docs/                   # Documentation
├── buildspec.yml           # CodeBuild configuration
├── .gitignore              # Git ignore file
├── README.md               # Project documentation
├── package.json            # Dependencies
└── .github/                # GitHub workflows (si aplica)
    └── workflows/
        └── ci.yml
```

### **2. Commit Messages**
```bash
# Good commit messages
feat: Add user authentication
fix: Resolve memory leak issue
docs: Update API documentation
style: Format code according to standards
refactor: Simplify database connection logic
test: Add unit tests for user service
chore: Update dependencies
```

### **3. Branch Naming**
```bash
# Feature branches
feature/user-authentication
feature/payment-gateway

# Bugfix branches
bugfix/memory-leak
bugfix/login-validation

# Release branches
release/v1.2.0
release/v2.0.0

# Hotfix branches
hotfix/critical-security-patch
hotfix/database-connection
```

### **4. Repository Management**
```bash
# List all repositories
aws codecommit list-repositories --sort-by repositoryName

# Get repository metadata
aws codecommit get-repository --repository-name my-app

# Create branch from commit
aws codecommit create-branch \
  --repository-name my-app \
  --branch-name feature/new-feature \
  --commit-id 1234567890abcdef1234567890abcdef12345678

# Delete branch
aws codecommit delete-branch \
  --repository-name my-app \
  --branch-name feature/old-feature
```

## Monitoring y Logging

### **CloudWatch Metrics**
- **RepositorySize**: Tamaño del repositorio
- **PullRequestCount**: Número de pull requests
- **CommitCount**: Número de commits
- **BranchCount**: Número de branches

### **CloudTrail Events**
```json
{
  "eventSource": "codecommit.amazonaws.com",
  "eventName": "PullRequestCreated",
  "requestParameters": {
    "repositoryName": "my-app",
    "pullRequestId": "123"
  }
}
```

### **Repository Metrics**
```bash
# Get repository metrics
aws codecommit get-repository --repository-name my-app

# Monitor with CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace AWS/CodeCommit \
  --metric-name RepositorySize \
  --dimensions Name=RepositoryName,Value=my-app \
  --statistics Average \
  --period 86400 \
  --start-time 2023-01-01T00:00:00Z \
  --end-time 2023-01-02T00:00:00Z
```

## Troubleshooting

### **Common Issues**
- **Authentication errors**: Verificar credenciales IAM
- **Permission denied**: Validar políticas de acceso
- **Connection timeouts**: Revisar configuración de red
- **Repository not found**: Verificar nombre y región

### **Debug Commands**
```bash
# Test connection
git ls-remote https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-app

# Check credentials
aws sts get-caller-identity

# Test SSH connection
ssh -T git-codecommit.us-east-1.amazonaws.com

# Check repository permissions
aws codecommit get-repository --repository-name my-app
```

### **Configuration Issues**
```bash
# Reset Git credentials
git config --global --unset credential.helper

# Clear SSH cache
ssh-keygen -R git-codecommit.us-east-1.amazonaws.com

# Update AWS CLI
pip install --upgrade awscli
```

## Migration

### **Desde GitHub**
```bash
# 1. Create CodeCommit repository
aws codecommit create-repository --repository-name my-app

# 2. Clone GitHub repository
git clone https://github.com/user/my-app.git

# 3. Add CodeCommit remote
cd my-app
git remote add codecommit https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-app

# 4. Push to CodeCommit
git push codecommit --all
git push codecommit --tags
```

### **Desde GitLab**
```bash
# Export repository from GitLab
git clone https://gitlab.com/user/my-app.git
cd my-app

# Add CodeCommit remote
git remote add codecommit https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-app

# Push to CodeCommit
git push codecommit --mirror
```

## Costos

### **Pricing**
- **Storage**: $0.006 por GB-mes
- **Data transfer**: Primer 10 GB gratuitos
- **Requests**: Primer 10,000 requests gratuitos
- **No hay costos por usuario o repositorio**

### **Cost Optimization**
- **Repository cleanup**: Eliminar branches no usados
- **Large file storage**: Usar S3 para archivos grandes
- **Git LFS**: Para archivos binarios grandes
- **Regular maintenance**: Limpiar commits innecesarios

## Comparison with Other Services

### **CodeCommit vs GitHub**
- **CodeCommit**: Integración AWS, seguridad IAM
- **GitHub**: Comunidad más grande, más features

### **CodeCommit vs Bitbucket**
- **CodeCommit**: Sin límites de usuarios, mejor integración AWS
- **Bitbucket**: Mejor integración con Atlassian tools

### **CodeCommit vs GitLab**
- **CodeCommit**: Más simple, mejor integración AWS
- **GitLab**: Más features, CI/CD integrado

## Conclusion

AWS CodeCommit es ideal para equipos que ya utilizan servicios AWS y necesitan una solución de control de versiones segura, escalable y perfectamente integrada con el ecosistema AWS. Es especialmente útil para empresas que requieren cumplimiento de seguridad y auditoría, así como para pipelines CI/CD completamente gestionados en AWS.

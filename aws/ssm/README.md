# AWS Systems Manager (SSM)

## Definición

AWS Systems Manager (SSM) es un servicio de gestión de operaciones que proporciona una visión unificada y control sobre los recursos de AWS y on-premises. Ofrece capacidades para automatizar tareas, gestionar configuraciones, aplicar parches, y mantener la seguridad y compliance de la infraestructura a gran escala.

## Características Principales

### 1. **Gestión Centralizada**
- Control unificado de recursos
- Visibilidad completa
- Operaciones a gran escala
- Compliance tracking

### 2. **Automatización**
- Runbooks automatizados
- Scheduled tasks
- Event-driven automation
- Workflow orchestration

### 3. **Seguridad**
- Access management
- Session management
- Audit logging
- Compliance enforcement

### 4. **Multi-nube**
- AWS resources
- On-premises servers
- Edge devices
- Hybrid environments

## Componentes Clave

### **Parameter Store**
- Almacenamiento de parámetros
- Configuración centralizada
- Secrets management
- Version control

### **Run Command**
- Ejecución remota de comandos
- Batch operations
- Script distribution
- Command scheduling

### **Automation**
- Workflows automatizados
- Document-based automation
- Event-driven execution
- Complex orchestration

### **Session Manager**
- Acceso seguro a instancias
- Shell access sin SSH
- Audit logging
- Port forwarding

### **Patch Manager**
- Gestión de parches
- Compliance scanning
- Automated patching
- Maintenance windows

### **Fleet Manager**
- Resource inventory
- Compliance tracking
- State management
- Resource grouping

## Parameter Store

### **Tipos de Parámetros**
```bash
# String parameter
aws ssm put-parameter \
  --name "/myapp/database/host" \
  --value "db.example.com" \
  --type String

# SecureString parameter (encrypted)
aws ssm put-parameter \
  --name "/myapp/database/password" \
  --value "SuperSecretPassword123!" \
  --type SecureString \
  --key-id "alias/aws/ssm"

# StringList parameter
aws ssm put-parameter \
  --name "/myapp/allowed_ips" \
  --value "192.168.1.1,10.0.0.1,172.16.0.1" \
  --type StringList
```

### **Jerarquía de Parámetros**
```bash
# Estructura jerárquica
/myapp/
├── database/
│   ├── host
│   ├── port
│   ├── username
│   └── password
├── api/
│   ├── key
│   ├── endpoint
│   └── timeout
└── features/
    ├── feature_a
    ├── feature_b
    └── feature_c
```

### **Uso en Aplicaciones**
```python
# Python example
import boto3

ssm = boto3.client('ssm')

# Get parameter
response = ssm.get_parameter(
    Name='/myapp/database/host',
    WithDecryption=False
)
db_host = response['Parameter']['Value']

# Get secure parameter
response = ssm.get_parameter(
    Name='/myapp/database/password',
    WithDecryption=True
)
db_password = response['Parameter']['Value']

# Get parameters by path
response = ssm.get_parameters_by_path(
    Path='/myapp/',
    Recursive=True,
    WithDecryption=True
)

for param in response['Parameters']:
    print(f"{param['Name']}: {param['Value']}")
```

### **Parameter Policies**
```bash
# Expiration policy
aws ssm put-parameter-policy \
  --name "/myapp/api/key" \
  --policy file://expiration-policy.json

# expiration-policy.json
{
  "Version": 1,
  "Type": "Expiration",
  "Attributes": {
    "Timestamp": "2024-12-31T23:59:59Z"
  }
}
```

## Run Command

### **Ejecución de Comandos**
```bash
# Ejecutar comando en una instancia
aws ssm send-command \
  --instance-ids i-1234567890abcdef0 \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["yum update -y", "service httpd restart"]'

# Ejecutar en múltiples instancias
aws ssm send-command \
  --targets "Key=tag:Environment,Values=production" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["df -h", "free -m"]'

# Ejecutar script
aws ssm send-command \
  --instance-ids i-1234567890abcdef0 \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["bash /tmp/install-software.sh"]'
```

### **Documentos Personalizados**
```json
{
  "schemaVersion": "2.2",
  "description": "Custom document for application deployment",
  "parameters": {
    "AppName": {
      "type": "String",
      "description": "Application name"
    },
    "Version": {
      "type": "String",
      "description": "Application version"
    }
  },
  "mainSteps": [
    {
      "action": "aws:runShellScript",
      "name": "deployApplication",
      "inputs": {
        "runCommand": [
          "echo 'Deploying {{ AppName }} version {{ Version }}'",
          "cd /opt/{{ AppName }}",
          "git pull origin main",
          "npm install",
          "npm run build",
          "systemctl restart {{ AppName }}"
        ]
      }
    }
  ]
}
```

### **Command Invocation**
```bash
# Ver resultados del comando
aws ssm list-command-invocations \
  --command-id "12345678-1234-1234-1234-123456789012"

# Ver detalles específicos
aws ssm get-command-invocation \
  --command-id "12345678-1234-1234-1234-123456789012" \
  --instance-id i-1234567890abcdef0
```

## Automation

### **Documentos de Automatización**
```yaml
---
schemaVersion: '0.3'
description: Automated application deployment
parameters:
  InstanceId:
    type: String
    description: EC2 instance ID
  AppName:
    type: String
    description: Application name
mainSteps:
  - name: stopApplication
    action: aws:runCommand
    inputs:
      DocumentName: AWS-RunShellScript
      Parameters:
        commands:
          - "systemctl stop {{ AppName }}"
    targets:
      - Key: InstanceIds
        Values:
          - "{{ InstanceId }}"
  
  - name: updateCode
    action: aws:runCommand
    inputs:
      DocumentName: AWS-RunShellScript
      Parameters:
        commands:
          - "cd /opt/{{ AppName }}"
          - "git pull origin main"
    targets:
      - Key: InstanceIds
        Values:
          - "{{ InstanceId }}"
  
  - name: startApplication
    action: aws:runCommand
    inputs:
      DocumentName: AWS-RunShellScript
      Parameters:
        commands:
          - "systemctl start {{ AppName }}"
    targets:
      - Key: InstanceIds
        Values:
          - "{{ InstanceId }}"
```

### **Ejecución de Automatización**
```bash
# Ejecutar automatización
aws ssm start-automation-execution \
  --document-name "MyAppDeployment" \
  --parameters "InstanceId=i-1234567890abcdef0,AppName=myapp"

# Ver estado de ejecución
aws ssm get-automation-execution \
  --automation-execution-id "12345678-1234-1234-1234-123456789012"

# Listar ejecuciones
aws ssm describe-automation-executions \
  --max-items 10
```

## Session Manager

### **Configuración de Session Manager**
```bash
# Crear documento de session
aws ssm create-document \
  --name "SSM-SessionManagerRunShell" \
  --content file://session-manager.json \
  --document-type "Command"

# session-manager.json
{
  "schemaVersion": "1.0",
  "description": "Session Manager session configuration",
  "sessionConfiguration": {
    "cloudWatchLogGroupName": "/aws/ssm/sessions",
    "cloudWatchEncryptionEnabled": true,
    "s3BucketName": "my-session-logs",
    "s3KeyPrefix": "sessions/",
    "s3EncryptionEnabled": true,
    "maxSessionDuration": "14400"
  }
}
```

### **Iniciar Sesión**
```bash
# Iniciar sesión en instancia
aws ssm start-session \
  --target i-1234567890abcdef0

# Iniciar sesión con usuario específico
aws ssm start-session \
  --target i-1234567890abcdef0 \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["22"],"localPortNumber":["2222"]}'

# Iniciar sesión en Windows
aws ssm start-session \
  --target i-1234567890abcdef0 \
  --document-name AWS-StartNonInteractiveCommand \
  --parameters '{"command":["powershell.exe"]}'
```

### **Port Forwarding**
```bash
# Port forwarding para RDP
aws ssm start-session \
  --target i-1234567890abcdef0 \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["3389"],"localPortNumber":["13389"]}'

# Port forwarding para base de datos
aws ssm start-session \
  --target i-1234567890abcdef0 \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["5432"],"localPortNumber":["15432"]}'
```

## Patch Manager

### **Baseline Configuration**
```bash
# Crear patch baseline
aws ssm create-patch-baseline \
  --name "MyAppBaseline" \
  --approval-rules "PatchRules=[{PatchRuleGroup={PatchFilters=[{Key=PRODUCT,Values=[WindowsServer]},{Key=CLASSIFICATION,Values=[SecurityUpdates,CriticalUpdates]}],ComplianceLevel=CRITICAL}]}" \
  --approval-rules "PatchRules=[{PatchRuleGroup={PatchFilters=[{Key=MSRC_SEVERITY,Values=[Critical,Important]}],ComplianceLevel=HIGH}}]" \
  --approved-patches-compliance-level "HIGH" \
  --approved-patches-enable-non-security

# Registrar instancia con baseline
aws ssm register-patch-baseline-for-patch-group \
  --baseline-id "pb-1234567890abcdef0" \
  --patch-group "MyAppServers"
```

### **Patch Operations**
```bash
# Escanear compliance
aws ssm describe-instance-patches \
  --instance-id i-1234567890abcdef0

# Ejecutar patching
aws ssm execute-automation \
  --document-name "AWS-RunPatchBaseline" \
  --parameters "Operation=Scan,InstanceIds=[i-1234567890abcdef0]"

# Programar patching
aws ssm create-maintenance-window \
  --name "PatchWindow" \
  --schedule "cron(0 2 ? * SUN *)" \
  --duration 4 \
  --cutoff 1 \
  --allow-unassociated-targets
```

## Fleet Manager

### **Resource Inventory**
```bash
# Listar recursos gestionados
aws ssm describe-instance-information \
  --max-items 50

# Filtrar por tags
aws ssm describe-instance-information \
  --filters "Key=tag:Environment,Values=production"

# Ver detalles de instancia
aws ssm describe-instance-information \
  --instance-information-filter-list "Key=InstanceIds,ValueSet=[i-1234567890abcdef0]"
```

### **Compliance Tracking**
```bash
# Ver compliance de patches
aws ssm describe-instance-patches \
  --instance-id i-1234567890abcdef0

# Ver compliance de asociaciones
aws ssm describe-association-executions \
  --association-id "12345678-1234-1234-1234-123456789012"

# Ver compliance general
aws ssm list-compliance-items \
  --resource-type "ManagedInstance" \
  --resource-id i-1234567890abcdef0
```

## State Manager

### **State Associations**
```bash
# Crear asociación de estado
aws ssm create-association \
  --name "AWS-GatherSoftwareInventory" \
  --instance-id i-1234567890abcdef0 \
  --parameters "inventoryType=[Application,Network,WindowsUpdate,WindowsRole,WindowsService]"

# Crear asociación con schedule
aws ssm create-association \
  --name "AWS-RunPatchBaseline" \
  --targets "Key=tag:Environment,Values=production" \
  --schedule-expression "cron(0 2 ? * SUN *)" \
  --parameters "Operation=Install,RebootOption=RebootIfNeeded"
```

### **Association Management**
```bash
# Listar asociaciones
aws ssm list-associations \
  --max-items 20

# Ver detalles de asociación
aws ssm describe-association \
  --association-id "12345678-1234-1234-1234-123456789012"

# Actualizar asociación
aws ssm update-association \
  --association-id "12345678-1234-1234-1234-123456789012" \
  --parameters "Operation=Scan"
```

## Integration con CI/CD

### **CloudFormation Integration**
```yaml
Resources:
  MyParameter:
    Type: AWS::SSM::Parameter
    Properties:
      Name: /myapp/database/host
      Type: String
      Value: db.example.com
      Description: Database host

  MySecureParameter:
    Type: AWS::SSM::Parameter
    Properties:
      Name: /myapp/database/password
      Type: SecureString
      Value: "{{resolve:secretsmanager:db-password:SecretString:password}}"
      Description: Database password

  MyAssociation:
    Type: AWS::SSM::Association
    Properties:
      Name: AWS-GatherSoftwareInventory
      Targets:
        - Key: tag:Environment
          Values:
            - production
      Parameters:
        inventoryType:
          - Application
          - Network
```

### **CodePipeline Integration**
```yaml
# buildspec.yml con SSM
version: 0.2

phases:
  install:
    runtime-versions:
      python: 3.9
    commands:
      - pip install boto3

  pre_build:
    commands:
      - echo Getting configuration from SSM
      - python get-config.py

  build:
    commands:
      - echo Building application
      - npm run build

  post_build:
    commands:
      - echo Deploying with SSM
      - aws ssm send-command \
          --instance-ids $(aws ssm get-parameter --name /myapp/instance-id --query Parameter.Value --output text) \
          --document-name AWS-RunShellScript \
          --parameters 'commands=["systemctl restart myapp"]'
```

## Security y Access Control

### **IAM Policies**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:us-east-1:123456789012:parameter/myapp/*",
      "Condition": {
        "StringEquals": {
          "ssm:ParameterType": [
            "String",
            "StringList"
          ]
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:us-east-1:123456789012:parameter/myapp/*",
      "Condition": {
        "StringEquals": {
          "ssm:ParameterType": "SecureString"
        },
        "StringEqualsIfExists": {
          "aws:RequestedRegion": "us-east-1"
        }
      }
    }
  ]
}
```

### **Session Manager Security**
```bash
# Configurar logging
aws ssm update-service-setting \
  --setting-id "/ssm/parameters/cloudwatchlogs/loggroupname" \
  --setting-value "/aws/ssm/sessions"

# Habilitar encryption
aws ssm update-service-setting \
  --setting-id "/ssm/parameters/cloudwatchlogs/encryptionenabled" \
  --setting-value "true"
```

## Monitoring y Logging

### **CloudWatch Integration**
```bash
# Métricas de SSM
aws cloudwatch get-metric-statistics \
  --namespace AWS/SSM \
  --metric-name CommandCount \
  --dimensions Name=DocumentName,Value=AWS-RunShellScript \
  --statistics Sum \
  --period 3600

# Logs de Session Manager
aws logs get-log-events \
  --log-group-name /aws/ssm/sessions \
  --log-stream-name session-id
```

### **EventBridge Events**
```json
{
  "source": ["aws.ssm"],
  "detail-type": [
    "EC2 Command Status Change",
    "Automation Execution Status Change",
    "Patch Manager State Change"
  ]
}
```

## Best Practices

### **1. Parameter Store**
- Usar jerarquía lógica
- Encriptar datos sensibles
- Version control de parámetros
- Regular cleanup

### **2. Session Manager**
- Habilitar logging y audit
- Usar IAM roles específicos
- Limitar port forwarding
- Regular session review

### **3. Patch Management**
- Baselines por ambiente
- Maintenance windows apropiados
- Testing before production
- Compliance tracking

### **4. Automation**
- Documentos reutilizables
- Error handling
- Rollback procedures
- Documentation

## Use Cases

### **1. Configuration Management**
- Centralized configuration
- Environment-specific settings
- Secrets management
- Dynamic configuration

### **2. Operations Automation**
- Patch management
- Backup automation
- Health checks
- Compliance enforcement

### **3. Security Operations**
- Secure access management
- Audit logging
- Compliance reporting
- Incident response

### **4. DevOps Integration**
- CI/CD pipelines
- Infrastructure as code
- Automated testing
- Deployment automation

## Costos

### **Pricing**
- **Parameter Store**: $0.40 por 10,000 requests
- **Run Command**: $1.00 por 1,000 commands
- **Session Manager**: $0.015 por GB de datos transferidos
- **Automation**: $0.25 por automation execution

### **Cost Optimization**
- Efficient parameter usage
- Batch operations
- Regular cleanup
- Resource optimization

## Conclusion

AWS Systems Manager es fundamental para la gestión moderna de infraestructura en AWS, proporcionando herramientas centralizadas para automatización, configuración, seguridad y compliance. Es esencial para operaciones a gran escala, gestión híbrida y DevOps practices.

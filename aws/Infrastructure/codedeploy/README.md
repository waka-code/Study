# AWS CodeDeploy

## Definición

AWS CodeDeploy es un servicio de despliegue automatizado que permite desplegar aplicaciones en instancias EC2, instancias on-premises, Lambda functions o Serverless applications. Automatiza el proceso de despliegue de código, minimizando el tiempo de inactividad y proporcionando despliegues seguros y consistentes.

## Características Principales

### 1. **Despliegue Automatizado**
- Despliegues automatizados y repetibles
- Integración con pipelines CI/CD
- Rollback automático en caso de fallos
- Despliegues coordinados

### 2. **Flexibilidad de Despliegue**
- Múltiples estrategias de despliegue
- Soporte para diferentes tipos de instancias
- Despliegues blue/green
- Despliegues canary

### 3. **Seguridad**
- Integración con IAM
- Control de acceso granular
- Validación de despliegues
- Logs detallados

### 4. **Monitoreo**
- Health checks automáticos
- Métricas de despliegue
- Alertas configurables
- Historial de despliegues

## Componentes Clave

### **Application**
- Contenedor lógico para despliegues
- Agrupa despliegues relacionados
- Configuración compartida
- Version management

### **Deployment Group**
- Conjunto de instancias para despliegue
- Configuración de despliegue
- Estrategias de despliegue
- Health monitoring

### **Deployment Config**
- Estrategia de despliegue
- Reglas de despliegue
- Health check settings
- Rollback configuration

### **Revision**
- Versión específica del código
- Artifact bundle
- Version control integration
- AppSpec file

## Tipos de Despliegue

### **In-place Deployment**
- Despliegue en instancias existentes
- Sin crear nuevas instancias
- Rápido y económico
- Tiempo de inactividad mínimo

### **Blue/Green Deployment**
- Nueva versión en instancias separadas
- Switch de tráfico gradual
- Zero downtime
- Rollback instantáneo

### **Canary Deployment**
- Despliegue gradual a subset de instancias
- Validación progresiva
- Reducción de riesgo
- Análisis en producción

### **Lambda Deployment**
- Despliegue de funciones Lambda
- Traffic shifting
- Aliases management
- Version control

## AppSpec File

### **Structure**
```yaml
# appspec.yml
version: 0.0
os: linux
files:
  - source: /
    destination: /var/www/html
hooks:
  BeforeInstall:
    - location: scripts/before_install.sh
      timeout: 300
      runas: root
  AfterInstall:
    - location: scripts/after_install.sh
      timeout: 300
      runas: root
  ApplicationStart:
    - location: scripts/start_server.sh
      timeout: 300
      runas: root
  ApplicationStop:
    - location: scripts/stop_server.sh
      timeout: 300
      runas: root
```

### **Hooks Disponibles**
- **BeforeInstall**: Preparación del entorno
- **AfterInstall**: Post-instalación
- **ApplicationStart**: Iniciar aplicación
- **ApplicationStop**: Detener aplicación
- **BeforeBlockTraffic**: Antes de bloquear tráfico
- **AfterBlockTraffic**: Después de bloquear tráfico
- **BeforeAllowTraffic**: Antes de permitir tráfico
- **AfterAllowTraffic**: Después de permitir tráfico

### **Windows AppSpec**
```yaml
version: 0.0
os: windows
files:
  - source: /
    destination: C:\inetpub\wwwroot
hooks:
  BeforeInstall:
    - location: scripts/before_install.bat
      timeout: 300
  AfterInstall:
    - location: scripts/after_install.bat
      timeout: 300
```

## Deployment Configurations

### **Predefined Configurations**

#### **CodeDeployDefault.AllAtOnce**
- Despliegue a todas las instancias simultáneamente
- Rápido pero con downtime
- Ideal para desarrollo/testing

#### **CodeDeployDefault.HalfAtATime**
- Despliegue a la mitad de las instancias
- Reducción de riesgo
- Balance entre velocidad y seguridad

#### **CodeDeployDefault.OneAtATime**
- Despliegue una instancia a la vez
- Máxima seguridad
- Ideal para producción crítica

### **Custom Configuration**
```json
{
  "deploymentConfigName": "CustomCanary",
  "minimumHealthyHosts": {
    "type": "FLEET_PERCENT",
    "value": 75
  },
  "deploymentConfigInfo": {
    "createTime": 1634567890,
    "computePlatform": "Server"
  },
  "trafficRoutingConfig": {
    "type": "TimeBasedCanary",
    "timeBasedCanary": {
      "canaryPercentage": 25,
      "canaryInterval": 15
    }
  }
}
```

## Scripts de Despliegue

### **Before Install Script**
```bash
#!/bin/bash
# scripts/before_install.sh

# Install dependencies
yum update -y
yum install -y httpd php php-mysqlnd

# Create directories
mkdir -p /var/www/html
mkdir -p /var/log/codedeploy

# Set permissions
chown -R apache:apache /var/www/html
chmod -R 755 /var/www/html
```

### **After Install Script**
```bash
#!/bin/bash
# scripts/after_install.sh

# Copy application files
cp -r /tmp/codedeploy-deployment-staging-area/* /var/www/html/

# Install composer dependencies
cd /var/www/html
composer install --no-dev --optimize-autoloader

# Set environment variables
cat > /var/www/html/.env << EOF
APP_ENV=production
APP_DEBUG=false
DB_HOST=$DB_HOST
DB_DATABASE=$DB_DATABASE
DB_USERNAME=$DB_USERNAME
DB_PASSWORD=$DB_PASSWORD
EOF

# Set permissions
chown -R apache:apache /var/www/html
chmod -R 755 /var/www/html
```

### **Application Start Script**
```bash
#!/bin/bash
# scripts/start_server.sh

# Start Apache
systemctl start httpd
systemctl enable httpd

# Clear cache
php artisan cache:clear
php artisan config:clear

# Health check
curl -f http://localhost/health || exit 1
```

### **Application Stop Script**
```bash
#!/bin/bash
# scripts/stop_server.sh

# Stop Apache
systemctl stop httpd

# Clear temporary files
rm -rf /tmp/codedeploy-*
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
          RepositoryName: my-repo
          BranchName: main
        OutputArtifacts:
          - Name: SourceOutput

  - Name: Build
    Actions:
      - Name: BuildAction
        ActionTypeId:
          Category: Build
          Owner: AWS
          Provider: CodeBuild
        Configuration:
          ProjectName: my-build-project
        InputArtifacts:
          - Name: SourceOutput
        OutputArtifacts:
          - Name: BuildOutput

  - Name: Deploy
    Actions:
      - Name: DeployAction
        ActionTypeId:
          Category: Deploy
          Owner: AWS
          Provider: CodeDeploy
        Configuration:
          ApplicationName: my-app
          DeploymentGroupName: production
        InputArtifacts:
          - Name: BuildOutput
```

### **GitHub Actions**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy to CodeDeploy
        run: |
          aws deploy push \
            --application-name my-app \
            --description "GitHub deployment" \
            --ignore-hidden-files \
            --s3-location s3://my-deployment-bucket/my-app.zip
          
          aws deploy create-deployment \
            --application-name my-app \
            --deployment-group-name production \
            --s3-location bucket=my-deployment-bucket,key=my-app.zip,bundleType=zip \
            --deployment-config-name CodeDeployDefault.OneAtATime
```

## Blue/Green Deployment

### **Configuration**
```yaml
# appspec.yml for blue/green
version: 0.0
os: linux
files:
  - source: /
    destination: /var/www/html
hooks:
  BeforeInstall:
    - location: scripts/before_install.sh
      timeout: 300
  AfterInstall:
    - location: scripts/after_install.sh
      timeout: 300
  ApplicationStart:
    - location: scripts/start_server.sh
      timeout: 300
  ValidateService:
    - location: scripts/validate_service.sh
      timeout: 300
```

### **Validation Script**
```bash
#!/bin/bash
# scripts/validate_service.sh

# Health check endpoint
HEALTH_URL="http://localhost/health"

# Wait for application to start
sleep 30

# Perform health check
for i in {1..10}; do
  if curl -f $HEALTH_URL; then
    echo "Health check passed"
    exit 0
  fi
  echo "Health check failed, retrying... ($i/10)"
  sleep 10
done

echo "Health check failed after 10 attempts"
exit 1
```

## Monitoring y Logging

### **CloudWatch Metrics**
- **DeploymentSuccess**: Despliegues exitosos
- **DeploymentFailure**: Despliegues fallidos
- **DeploymentInProgress**: Despliegues en progreso
- **InstancesHealthy**: Instancias saludables

### **Logs Locations**
- **Agent logs**: `/var/log/aws/codedeploy-agent/codedeploy-agent.log`
- **Deployment logs**: `/var/log/aws/codedeploy-agent/deployment-logs`
- **Application logs**: `/var/log/application.log`

### **CloudWatch Integration**
```bash
# Send custom metrics
aws cloudwatch put-metric-data \
  --namespace "CodeDeploy" \
  --metric-data MetricName=DeploymentCount,Value=1,Unit=Count
```

## Security

### **IAM Roles**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "codedeploy:*",
        "autoscaling:*",
        "ec2:*",
        "s3:Get*",
        "s3:List*"
      ],
      "Resource": "*"
    }
  ]
}
```

### **Instance Profile**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:Get*",
        "s3:List*",
        "codedeploy:*"
      ],
      "Resource": "*"
    }
  ]
}
```

## Troubleshooting

### **Common Issues**
- **Agent not running**: Verificar servicio codedeploy-agent
- **Permissions issues**: Validar IAM roles
- **Script failures**: Revisar logs de ejecución
- **Health check failures**: Verificar endpoints

### **Debug Commands**
```bash
# Check agent status
sudo service codedeploy-agent status

# Restart agent
sudo service codedeploy-agent restart

# View agent logs
tail -f /var/log/aws/codedeploy-agent/codedeploy-agent.log

# View deployment logs
aws deploy get-deployment-instance \
  --deployment-id d-123456789 \
  --instance-id i-1234567890abcdef0
```

### **Validation Scripts**
```bash
#!/bin/bash
# scripts/validate_deployment.sh

# Check if application is running
if ! pgrep -f "httpd" > /dev/null; then
  echo "Apache is not running"
  exit 1
fi

# Check health endpoint
if ! curl -f http://localhost/health; then
  echo "Health check failed"
  exit 1
fi

# Check database connection
if ! php artisan db:show; then
  echo "Database connection failed"
  exit 1
fi

echo "All validations passed"
exit 0
```

## Best Practices

### **1. AppSpec File**
- Scripts idempotentes
- Manejo de errores
- Timeouts apropiados
- Logging detallado

### **2. Scripts**
- Validación de prerequisitos
- Rollback automático
- Health checks
- Testing en staging

### **3. Deployment Strategy**
- Canary para cambios críticos
- Blue/green para zero downtime
- In-place para desarrollo rápido
- Validación progresiva

### **4. Monitoring**
- Métricas personalizadas
- Alertas automáticas
- Logs centralizados
- Health checks

## Use Cases

### **1. Web Applications**
- Despliegue de sitios web
- Actualización de APIs
- Content management systems
- E-commerce platforms

### **2. Microservices**
- Despliegue independiente
- Rolling updates
- Service mesh integration
- Container orchestration

### **3. Enterprise Applications**
- Despliegues coordinados
- Compliance requirements
- Multi-environment support
- Automated rollbacks

### **4. Legacy Modernization**
- Lift and shift
- Gradual migration
- Hybrid deployments
- On-premises integration

## Comparison with Other Services

### **CodeDeploy vs Elastic Beanstalk**
- **CodeDeploy**: Más control, flexible
- **Beanstalk**: Simplificado, managed

### **CodeDeploy vs ECS**
- **CodeDeploy**: Despliegue de código
- **ECS**: Container orchestration

### **CodeDeploy vs CloudFormation**
- **CodeDeploy**: Application deployment
- **CloudFormation**: Infrastructure deployment

## Conclusion

AWS CodeDeploy es fundamental para pipelines CI/CD modernos, proporcionando despliegues automatizados, seguros y flexibles para diferentes tipos de aplicaciones. Es ideal para equipos que necesitan control granular sobre el proceso de despliegue mientras mantienen alta disponibilidad y consistencia.

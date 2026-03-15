# AWS Elastic Beanstalk

## Definición

AWS Elastic Beanstalk es un servicio de PaaS (Platform as a Service) que permite desplegar y escalar aplicaciones web y servicios rápidamente sin necesidad de gestionar la infraestructura subyacente. Automatiza el aprovisionamiento de recursos como balanceadores de carga, escalado automático y servidores de aplicaciones.

## Características Principales

### 1. **Despliegue Simplificado**
- Upload de código y despliegue automático
- Configuración mínima requerida
- Soporte para múltiples lenguajes
- Integración con Git

### 2. **Gestión Automática**
- Escalado automático
- Balanceo de carga
- Health monitoring
- Actualizaciones de seguridad

### 3. **Flexibilidad**
- Control total cuando lo necesitas
- Customización de recursos
- Integración con otros servicios AWS
- Multi-environment support

### 4. **Monitoreo y Logging**
- Métricas en tiempo real
- Logs centralizados
- Alertas configurables
- Performance monitoring

## Plataformas Soportadas

### **Web Servers**
- **Apache HTTP Server**
- **Nginx**
- **IIS** (Windows)

### **Application Servers**
- **Tomcat** (Java)
- **JBoss** (Java)
- **Passenger** (Ruby)
- **Puma** (Ruby)

### **Runtimes**
- **Node.js** (varias versiones)
- **Python** (2.7, 3.6, 3.7, 3.8, 3.9)
- **Java** (8, 11, 17)
- **Ruby** (2.7, 3.0, 3.1)
- **PHP** (7.4, 8.0, 8.1)
- **Go** (1.16, 1.17, 1.18)
- **.NET** (Core 3.1, 5, 6)

### **Docker**
- **Single Container Docker**
- **Multi-Container Docker**

## Arquitectura de Beanstalk

### **Application**
- Contenedor lógico para tu aplicación
- Múltiples versiones
- Configuración compartida

### **Environment**
- Instancia ejecutable de la aplicación
- Recursos AWS provisionados
- Configuración específica
- Health monitoring

### **Version**
- Snapshot del código
- Deployable artifact
- Version control integration
- Rollback capability

### **Environment Configuration**
- Settings y parámetros
- Resource definitions
- Software stack
- Custom configurations

## Tipos de Entornos

### **Web Server Environment**
- Ideal para aplicaciones web tradicionales
- Balanceador de carga incluido
- Auto-scaling automático
- Health checks integrados

### **Worker Environment**
- Para tareas de background
- SQS queue integration
- Decoupled processing
- Scalable workers

### **Single Instance**
- Para desarrollo o testing
- Sin balanceador de carga
- Costos reducidos
- Despliegue rápido

## Componentes de un Environment

### **Elastic Load Balancer**
- Distribución de tráfico
- Health checks
- SSL termination
- Sticky sessions

### **Auto Scaling Group**
- Escalado automático
- Health monitoring
- Instance replacement
- Scaling policies

### **EC2 Instances**
- Servidores de aplicaciones
- Configuración automática
- Security groups
- User data scripts

### **Security Groups**
- Control de acceso
- Reglas de firewall
- Network segmentation
- SSL configuration

### **RDS (Opcional)**
- Base de datos gestionada
- Backups automáticos
- Multi-AZ support
- Read replicas

## Despliegue de Aplicaciones

### **Source Bundle Structure**
```
my-app.zip
├── application.py          # Application code
├── requirements.txt        # Python dependencies
├── .ebextensions/         # Configuration files
│   ├── 01-python.config
│   └── 02-security.config
├── .platform/            # Platform-specific configs
│   └── hooks/
│       ├── preinit
│       └── postdeploy
└── static/               # Static files
    ├── css/
    ├── js/
    └── images/
```

### **Deployment Methods**

#### **1. Console Upload**
- Upload directo desde consola
- Interface simple
- Para despliegues rápidos

#### **2. AWS CLI**
```bash
# Create application
aws elasticbeanstalk create-application \
  --application-name my-app

# Create environment
aws elasticbeanstalk create-environment \
  --application-name my-app \
  --environment-name my-env \
  --solution-stack-name "64bit Amazon Linux 2 v5.5.0 running Python 3.9"

# Deploy version
aws elasticbeanstalk create-application-version \
  --application-name my-app \
  --version-label v1.0 \
  --source-bundle S3Bucket=my-bucket,S3Key=my-app.zip

# Update environment
aws elasticbeanstalk update-environment \
  --environment-name my-env \
  --version-label v1.0
```

#### **3. EB CLI**
```bash
# Initialize
eb init my-app

# Create environment
eb create production

# Deploy
eb deploy

# Set environment variables
eb setenv RDS_HOSTNAME=example.com

# Open application
eb open
```

#### **4. Git Integration**
```bash
# Setup Git repository
git init
git add .
git commit -m "Initial commit"

# Deploy with EB CLI
eb deploy
```

## Configuración y Customización

### **.ebextensions**
```yaml
# .ebextensions/01-environment.config
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: "myapp.settings.production"
    RDS_HOSTNAME: "mydb.example.com"
    RDS_PORT: "5432"
    RDS_DB_NAME: "mydb"
    RDS_USERNAME: "admin"
    RDS_PASSWORD: "password"

  aws:elasticbeanstalk:container:python:
    WSGIPath: myapp/wsgi.py

  aws:elasticbeanstalk:environment:process:default:
    Port: 80
    HealthCheckPath: /health/

  aws:autoscaling:launchconfiguration:
    InstanceType: t3.micro
    IamInstanceProfile: aws-elasticbeanstalk-ec2-role
```

### **Platform Hooks**
```bash
# .platform/hooks/preinit/01_dependencies.sh
#!/bin/bash
yum install -y postgresql-devel
pip install -r requirements.txt

# .platform/hooks/postdeploy/01_migrations.sh
#!/bin/bash
python manage.py migrate
python manage.py collectstatic --noinput
```

### **Configuration Files**
```json
# .platform/confighooks/prebuild/01_config.json
{
  "option_settings": {
    "aws:elasticbeanstalk:command": {
      "Timeout": 1800
    },
    "aws:elasticbeanstalk:container:python": {
      "WSGIPath": "myapp/wsgi.py"
    }
  }
}
```

## Environment Variables

### **Built-in Variables**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_KEY`
- `AWS_REGION`
- `RDS_HOSTNAME`
- `RDS_PORT`
- `RDS_DB_NAME`
- `RDS_USERNAME`
- `RDS_PASSWORD`

### **Custom Variables**
```bash
# Set via CLI
eb setenv DEBUG=false
eb setenv SECRET_KEY=your-secret-key

# Set via console
# Environment > Configuration > Software > Environment properties
```

## Scaling Configuration

### **Auto Scaling Policies**
```yaml
# .ebextensions/02-scaling.config
option_settings:
  aws:autoscaling:asg:
    MinSize: 2
    MaxSize: 10
    Cooldown: 300

  aws:autoscaling:trigger:
    LowerThreshold: 20
    UpperThreshold: 70
    LowerBreachScaleIncrement: -1
    UpperBreachScaleIncrement: 1
    MeasureName: CPUUtilization
    Namespace: AWS/EC2
    Statistic: Average
    Unit: Percent
    Period: 5
```

### **Manual Scaling**
```bash
# Scale up
eb scale 4

# Scale down
eb scale 2

# Auto scaling
eb scale auto
```

## Health Monitoring

### **Health Checks**
- **Basic**: Verifica que la instancia responde
- **Enhanced**: Monitorea métricas detalladas
- **Custom**: Health checks personalizados

### **Health Metrics**
- Application requests
- System load
- CPU utilization
- Memory usage
- Response time

### **Health Configuration**
```yaml
option_settings:
  aws:elasticbeanstalk:environment:
    HealthReporting: enhanced
    ServiceRole: aws-elasticbeanstalk-service-role

  aws:elasticbeanstalk:application:
    Application Healthcheck URL: /health

  aws:elb:healthcheck:
    HealthyThreshold: 3
    UnhealthyThreshold: 3
    Interval: 30
    Timeout: 5
```

## Blue/Green Deployments

### **Swap URLs**
```bash
# Create blue environment
eb create blue-env --instance-profile MyInstanceProfile

# Create green environment
eb create green-env --instance-profile MyInstanceProfile --clone blue-env

# Test green environment
eb open green-env

# Swap URLs
eb swap
```

### **Zero-Downtime Deployment**
```yaml
# .ebextensions/03-deployment.config
option_settings:
  aws:elasticbeanstalk:command:
    DeploymentPolicy: Rolling
    BatchSize: 30
    BatchType: Fixed

  aws:elasticbeanstalk:environment:
    LoadBalancerType: application
```

## Integration with Other Services

### **RDS Integration**
```yaml
Resources:
  AWSEBRedisCache:
    Type: AWS::ElastiCache::CacheCluster
    Properties:
      CacheNodeType: cache.t3.micro
      Engine: redis
      NumCacheNodes: 1

  AWSEBRDSDatabase:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceClass: db.t3.micro
      Engine: postgres
      EngineVersion: "13.4"
      AllocatedStorage: 20
      StorageType: gp2
      MasterUsername: admin
      MasterUserPassword: password
```

### **S3 Integration**
```yaml
option_settings:
  aws:elasticbeanstalk:environment:proxy:staticfiles:
    /static: staticfiles
    /media: mediafiles
```

### **CloudWatch Logs**
```yaml
option_settings:
  aws:elasticbeanstalk:cloudwatch:logs:
    StreamLogs: true
    DeleteOnTerminate: false
    RetentionInDays: 30
    EnableRotation: true
```

## Security

### **IAM Roles**
- **Service Role**: Gestión de recursos
- **Instance Profile**: Acceso de instancias
- **Custom Policies**: Permisos específicos

### **Security Groups**
```yaml
option_settings:
  aws:elasticbeanstalk:environment:
    ServiceRole: aws-elasticbeanstalk-service-role

  aws:autoscaling:launchconfiguration:
    SecurityGroups: [sg-12345678]
    IamInstanceProfile: aws-elasticbeanstalk-ec2-role
```

### **SSL/TLS**
```yaml
option_settings:
  aws:elasticbeanstalk:environment:loadbalancer:
    LoadBalancerHTTPSPort: 443
    SSLCertificateId: arn:aws:acm:us-east-1:123456789:certificate/12345678-1234-1234-1234-123456789012
```

## Troubleshooting

### **Common Issues**
- **Deployment failures**: Check logs in `/var/log/eb-engine.log`
- **Health check failures**: Verify health check endpoint
- **Environment update failures**: Review configuration changes
- **Performance issues**: Monitor CloudWatch metrics

### **Debugging Commands**
```bash
# SSH into instance
eb ssh

# View logs
eb logs

# View specific log
eb logs --zip

# Download logs
eb logs --download
```

### **Log Locations**
- **Application logs**: `/var/log/web.stdout.log`
- **Deployment logs**: `/var/log/eb-engine.log`
- **Nginx logs**: `/var/log/nginx/access.log`
- **System logs**: `/var/log/messages`

## Cost Optimization

### **Instance Types**
- **t3.micro**: Desarrollo/testing
- **t3.small**: Producción baja
- **t3.medium**: Producción media
- **t3.large**: Producción alta

### **Auto Scaling**
- Escalado basado en demanda
- Minimizar instancias inactivas
- Scheduled scaling

### **Reserved Instances**
- Descuento por compromiso
- Para cargas constantes
- Planes de 1 o 3 años

## Best Practices

### **1. Application Design**
- Stateless applications
- External configuration
- Graceful shutdowns
- Health checks

### **2. Deployment**
- Version control
- Blue/green deployments
- Testing en staging
- Rollback plans

### **3. Security**
- IAM roles específicos
- Secrets management
- SSL/TLS everywhere
- Regular updates

### **4. Monitoring**
- Enhanced health monitoring
- Custom metrics
- Log aggregation
- Alerting

## Use Cases

### **1. Web Applications**
- Django, Flask, Rails apps
- REST APIs
- Single page applications
- E-commerce sites

### **2. Microservices**
- Service decomposition
- Independent scaling
- Team autonomy
- Fast deployments

### **3. Prototyping**
- MVP development
- Quick iterations
- Minimal overhead
- Cost-effective

### **4. Enterprise Applications**
- Production workloads
- High availability
- Compliance requirements
- Integration needs

## Comparison with Other Services

### **Elastic Beanstalk vs ECS**
- **EB**: Simplificado, managed
- **ECS**: Más control, flexible

### **Elastic Beanstalk vs Lambda**
- **EB**: Long-running applications
- **Lambda**: Event-driven, serverless

### **Elastic Beanstalk vs EC2**
- **EB**: Platform as a Service
- **EC2**: Infrastructure as a Service

## Conclusion

AWS Elastic Beanstalk es ideal para desarrolladores que quieren desplegar aplicaciones rápidamente sin preocuparse por la infraestructura subyacente, manteniendo la flexibilidad de personalizar cuando sea necesario. Es perfecto para aplicaciones web tradicionales, prototipos y equipos que necesitan enfocarse en el código de negocio.

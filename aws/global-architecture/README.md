# Arquitectura Global de Aplicaciones en AWS

## Definición

La arquitectura global de aplicaciones en AWS es un enfoque de diseño que permite construir aplicaciones escalables, resilientes y de alto rendimiento que sirven a usuarios en todo el mundo. Combina múltiples servicios y patrones para proporcionar baja latencia, alta disponibilidad y cumplimiento regulatorio a escala global.

## Principios Fundamentales

### **1. Global Reach**
- Servir usuarios en múltiples regiones
- Baja latencia independientemente de la ubicación
- Experiencia consistente globalmente
- Cumplimiento de soberanía de datos

### **2. Resiliencia y Disponibilidad**
- Redundancia geográfica
- Failover automático
- Disaster recovery
- Business continuity

### **3. Performance**
- Optimización de latencia
- Edge computing
- Caching estratégico
- CDN global

### **4. Seguridad y Compliance**
- Data sovereignty
- Encriptación global
- Control de acceso centralizado
- Cumplimiento regulatorio

## Arquitectura de Referencia

### **Arquitectura Multi-Regional**
```
Usuarios Globales
    ↓
CloudFront (CDN Global)
    ↓
Route 53 (DNS Global)
    ↓
Regiones AWS Múltiples
├── us-east-1 (Norteamérica)
├── eu-west-1 (Europa)
├── ap-southeast-1 (Asia-Pacífico)
└── sa-east-1 (Sudamérica)
```

### **Componentes por Capa**

#### **Frontend Global**
- **CloudFront**: CDN para contenido estático
- **Route 53**: DNS global con routing inteligente
- **S3**: Almacenamiento global de assets
- **Amplify**: Aplicaciones móviles/web

#### **Backend Distribuido**
- **API Gateway**: Endpoints regionales
- **Lambda/EC2**: Compute regional
- **ECS/EKS**: Container orchestration
- **RDS/DynamoDB**: Bases de datos globales

#### **Data Management**
- **S3 Cross-Region Replication**
- **DynamoDB Global Tables**
- **Aurora Global Database**
- **DataSync** para sincronización

#### **Networking**
- **Direct Connect**: Conexión privada
- **VPN**: Conexión segura
- **Transit Gateway**: Hub de conectividad
- **Global Accelerator**: Optimización de red

## Patrones de Arquitectura

### **1. Active-Active Multi-Region**
```yaml
# Arquitectura activa-activa
Regions:
  - us-east-1:
    - ALB (Application Load Balancer)
    - ECS Cluster
    - RDS Aurora
    - ElastiCache
  - eu-west-1:
    - ALB
    - ECS Cluster
    - RDS Aurora
    - ElastiCache
  - ap-southeast-1:
    - ALB
    - ECS Cluster
    - RDS Aurora
    - ElastiCache

Routing:
  - Route 53 Latency-based
  - Health checks automáticos
  - Failover instantáneo
  - Traffic shifting
```

### **2. Hub-and-Spoke**
```yaml
# Arquitectura hub-and-spoke
Hub Region (us-east-1):
  - Central services
  - Master database
  - Analytics platform
  - Management console

Spoke Regions:
  - Edge services
  - Read replicas
  - Local caching
  - Regional APIs

Data Flow:
  - Write operations → Hub
  - Read operations → Spoke
  - Analytics → Hub
  - User traffic → Nearest spoke
```

### **3. Edge Computing**
```yaml
# Arquitectura edge computing
Edge Locations:
  - CloudFront Edge
  - Local Zones
  - Wavelength Zones
  - Outposts

Processing Layers:
  - Edge: Validación, caching
  - Regional: Business logic
  - Central: Analytics, backup

Data Flow:
  - User → Edge (ms latency)
  - Edge → Regional (10ms)
  - Regional → Central (100ms)
```

## Implementación Completa

### **1. Infraestructura Global**
```bash
# Crear VPCs en múltiples regiones
regions=("us-east-1" "eu-west-1" "ap-southeast-1")

for region in "${regions[@]}"; do
  aws ec2 create-vpc \
    --cidr-block "10.$(echo $region | cut -d'-' -f2).0.0/16" \
    --region $region \
    --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=global-vpc-$region}]"
done

# Crear subnets por Availability Zone
for region in "${regions[@]}"; do
  for az in a b; do
    aws ec2 create-subnet \
      --vpc-id $(aws ec2 describe-vpcs --region $region --filters Name=tag:Name,Values=global-vpc-$region --query 'Vpcs[0].VpcId' --output text) \
      --cidr-block "10.$(echo $region | cut -d'-' -f2).$az.0/24" \
      --availability-zone "${region}${az}" \
      --region $region
  done
done
```

### **2. DNS Global**
```bash
# Crear hosted zone global
aws route53 create-hosted-zone \
  --name myapp.example.com \
  --caller-reference global-dns-2023

# Configurar latency-based routing
aws route53 create-resource-record-set \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://latency-routing.json

# latency-routing.json
{
  "Comment": "Latency-based routing for global application",
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.myapp.example.com",
        "Type": "A",
        "SetIdentifier": "US-East",
        "Region": "us-east-1",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "my-alb-us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.myapp.example.com",
        "Type": "A",
        "SetIdentifier": "EU-West",
        "Region": "eu-west-1",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "my-alb-eu-west-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
```

### **3. CDN Global**
```bash
# Crear distribución CloudFront
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json

# cloudfront-config.json
{
  "CallerReference": "global-cdn-2023",
  "Comment": "Global CDN for my application",
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-myapp-assets",
    "ViewerProtocolPolicy": "redirect-to-https",
    "MinTTL": 0,
    "MaxTTL": 31536000,
    "DefaultTTL": 86400,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {"Forward": "none"}
    },
    "Compress": true
  },
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-myapp-assets",
        "DomainName": "myapp-assets.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": "origin-access-identity/cloudfront/E1234567890ABCDEF"
        }
      }
    ]
  },
  "Enabled": true,
  "PriceClass": "PriceClass_All",
  "ViewerCertificate": {
    "CloudFrontDefaultCertificate": true
  },
  "DefaultRootObject": "index.html"
}
```

### **4. Base de Datos Global**
```bash
# Crear Aurora Global Database
aws rds create-db-cluster \
  --db-cluster-identifier global-primary-cluster \
  --engine aurora-mysql \
  --engine-version 8.0.mysql_aurora.3.02.0 \
  --master-username admin \
  --master-user-password SecurePassword123! \
  --storage-encrypted \
  --region us-east-1

# Añadir region secundaria
aws rds create-global-cluster \
  --global-cluster-identifier my-global-cluster \
  --source-db-cluster-identifier global-primary-cluster

# Crear cluster secundario en Europa
aws rds create-db-cluster \
  --db-cluster-identifier global-secondary-cluster-eu \
  --global-cluster-identifier my-global-cluster \
  --engine aurora-mysql \
  --engine-version 8.0.mysql_aurora.3.02.0 \
  --region eu-west-1
```

### **5. Aplicaciones Distribuidas**
```python
# Aplicación con routing global
import boto3
import os

class GlobalApplication:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.s3 = boto3.client('s3')
        self.region = os.environ.get('AWS_REGION', 'us-east-1')
    
    def get_user_data(self, user_id):
        """Obtener datos de usuario con routing global"""
        try:
            # Intentar cache local primero
            cache_key = f"user:{user_id}"
            cached_data = self.get_from_cache(cache_key)
            if cached_data:
                return cached_data
            
            # Buscar en DynamoDB Global Table
            table = self.dynamodb.Table('global_users')
            response = table.get_item(
                Key={'user_id': user_id}
            )
            
            if 'Item' in response:
                user_data = response['Item']
                
                # Cache local para futuras consultas
                self.set_cache(cache_key, user_data, ttl=300)
                
                return user_data
            
            return None
            
        except Exception as e:
            print(f"Error getting user data: {e}")
            return None
    
    def update_user_data(self, user_id, data):
        """Actualizar datos de usuario globalmente"""
        try:
            table = self.dynamodb.Table('global_users')
            
            # Actualizar en DynamoDB Global Table
            table.put_item(Item={
                'user_id': user_id,
                'region': self.region,
                'updated_at': datetime.utcnow().isoformat(),
                **data
            })
            
            # Invalidar cache local
            cache_key = f"user:{user_id}"
            self.invalidate_cache(cache_key)
            
            # Notificar actualización a otras regiones
            self.notify_global_update(user_id, data)
            
            return True
            
        except Exception as e:
            print(f"Error updating user data: {e}")
            return False
    
    def upload_global_asset(self, file_path, asset_key):
        """Subir asset global con replicación automática"""
        try:
            # Subir a S3 con Cross-Region Replication
            self.s3.upload_file(
                file_path,
                'global-assets',
                asset_key,
                ExtraArgs={
                    'Metadata': {
                        'upload-region': self.region,
                        'upload-time': datetime.utcnow().isoformat()
                    }
                }
            )
            
            # Invalidar CDN cache
            self.invalidate_cdn_cache(asset_key)
            
            return True
            
        except Exception as e:
            print(f"Error uploading global asset: {e}")
            return False
    
    def get_from_cache(self, key):
        """Obtener de cache local (Redis/ElastiCache)"""
        try:
            # Implementación de cache local
            cache = self.get_cache_client()
            return cache.get(key)
        except:
            return None
    
    def set_cache(self, key, value, ttl=300):
        """Establecer cache local"""
        try:
            cache = self.get_cache_client()
            return cache.setex(key, ttl, json.dumps(value))
        except:
            return False
    
    def invalidate_cache(self, key):
        """Invalidar cache local"""
        try:
            cache = self.get_cache_client()
            cache.delete(key)
        except:
            pass
    
    def invalidate_cdn_cache(self, asset_key):
        """Invalidar cache de CDN"""
        try:
            cloudfront = boto3.client('cloudfront')
            cloudfront.create_invalidation(
                DistributionId='E1234567890ABCDEF',
                InvalidationBatch={
                    'Paths': {
                        'Quantity': 1,
                        'Items': [f'/{asset_key}']
                    },
                    'CallerReference': f'invalidation-{asset_key}-{int(time.time())}'
                }
            )
        except:
            pass
    
    def notify_global_update(self, user_id, data):
        """Notificar actualización global a otras regiones"""
        try:
            sns = boto3.client('sns')
            sns.publish(
                TopicArn='arn:aws:sns:us-east-1:123456789012:global-updates',
                Message=json.dumps({
                    'type': 'user_update',
                    'user_id': user_id,
                    'data': data,
                    'source_region': self.region
                }),
                Subject=f'Global Update: {user_id}'
            )
        except:
            pass
```

## Monitoring y Observabilidad

### **1. Métricas Globales**
```python
class GlobalMonitor:
    def __init__(self):
        self.cloudwatch = boto3.client('cloudwatch')
        self.xray = boto3.client('xray')
    
    def setup_global_monitoring(self):
        """Configurar monitoring global"""
        
        # Métricas de latencia por región
        regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1']
        
        for region in regions:
            self.create_latency_alarm(region)
            self.create_error_rate_alarm(region)
            self.create_availability_alarm(region)
    
    def create_latency_alarm(self, region):
        """Crear alarma de latencia por región"""
        self.cloudwatch.put_metric_alarm(
            AlarmName=f'High-Latency-{region}',
            AlarmDescription=f'High latency detected in {region}',
            MetricName='Latency',
            Namespace='MyApp/Global',
            Statistic='Average',
            Period=60,
            EvaluationPeriods=2,
            Threshold=500.0,  # 500ms
            ComparisonOperator='GreaterThanThreshold',
            Dimensions=[
                {'Name': 'Region', 'Value': region}
            ],
            AlarmActions=[
                f'arn:aws:sns:us-east-1:123456789012:global-alerts'
            ]
        )
    
    def create_global_dashboard(self):
        """Crear dashboard global"""
        dashboard = {
            "widgets": [
                {
                    "type": "metric",
                    "properties": {
                        "metrics": [
                            ["MyApp/Global", "Latency", "Region", "us-east-1", {"region": "us-east-1"}],
                            [".", ".", "Region", "eu-west-1", {"region": "eu-west-1"}],
                            [".", ".", "Region", "ap-southeast-1", {"region": "ap-southeast-1"}]
                        ],
                        "view": "timeSeries",
                        "stacked": false,
                        "region": "us-east-1",
                        "title": "Global Latency by Region",
                        "period": 300
                    }
                }
            ]
        }
        
        self.cloudwatch.put_dashboard(
            DashboardName='Global-Application-Dashboard',
            DashboardBody=json.dumps(dashboard)
        )
```

### **2. Distributed Tracing**
```python
class GlobalTracer:
    def __init__(self):
        self.xray = boto3.client('xray')
    
    def trace_global_request(self, request_id, regions):
        """Trazar petición global a través de múltiples regiones"""
        
        # Crear segmento principal
        segment = self.xray.begin_segment(
            name='GlobalRequest',
            annotations={
                'request_id': request_id,
                'regions': ','.join(regions)
            }
        )
        
        # Subsegmentos por región
        for region in regions:
            subsegment = segment.add_subsegment(f'processing-{region}')
            subsegment.add_metadata('region', region)
            subsegment.add_annotation('processing_time_ms', self.measure_processing_time(region))
        
        return segment
    
    def measure_processing_time(self, region):
        """Medir tiempo de procesamiento por región"""
        start_time = time.time()
        
        # Simular procesamiento en región específica
        client = boto3.client('lambda', region_name=region)
        client.invoke(
            FunctionName='global-processor',
            InvocationType='RequestResponse',
            Payload=json.dumps({'test': True})
        )
        
        return (time.time() - start_time) * 1000
```

## Security Global

### **1. IAM Global Policies**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/global_users",
        "arn:aws:dynamodb:*:*:table/global_sessions"
      ],
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": [
            "us-east-1",
            "eu-west-1",
            "ap-southeast-1"
          ]
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::global-assets/*",
        "arn:aws:s3:::global-backups/*"
      ]
    }
  ]
}
```

### **2. Data Sovereignty**
```python
class DataSovereigntyManager:
    def __init__(self):
        self.s3 = boto3.client('s3')
        self.dynamodb = boto3.resource('dynamodb')
    
    def store_user_data(self, user_id, data, user_region):
        """Almacenar datos cumpliendo soberanía de datos"""
        
        # Determinar región de almacenamiento basada en ubicación del usuario
        storage_region = self.get_storage_region(user_region)
        
        # Almacenar en DynamoDB Global Table con metadata de región
        table = self.dynamodb.Table('global_users')
        
        table.put_item(Item={
            'user_id': user_id,
            'data': data,
            'storage_region': storage_region,
            'compliance_region': user_region,
            'created_at': datetime.utcnow().isoformat()
        })
        
        # Almacenar datos sensibles solo en región de cumplimiento
        if self.is_sensitive_data(data):
            self.store_sensitive_data(user_id, data, storage_region)
    
    def get_storage_region(self, user_region):
        """Determinar región de almacenamiento"""
        region_mapping = {
            'US': 'us-east-1',
            'EU': 'eu-west-1',
            'AP': 'ap-southeast-1',
            'SA': 'sa-east-1'
        }
        
        return region_mapping.get(user_region, 'us-east-1')
    
    def is_sensitive_data(self, data):
        """Verificar si los datos son sensibles"""
        sensitive_fields = ['ssn', 'credit_card', 'medical_history', 'biometric']
        return any(field in str(data).lower() for field in sensitive_fields)
```

## Deployment y CI/CD

### **1. Pipeline Global**
```yaml
# CodePipeline para deployment global
Stages:
  - Name: Source
    Actions:
      - Name: SourceAction
        ActionTypeId:
          Category: Source
          Owner: AWS
          Provider: CodeCommit
        Configuration:
          RepositoryName: global-app
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
          ProjectName: global-build-project
        InputArtifacts:
          - Name: SourceOutput
        OutputArtifacts:
          - Name: BuildOutput
  
  - Name: Deploy-US-East
    Actions:
      - Name: DeployUSEast
        ActionTypeId:
          Category: Deploy
          Owner: AWS
          Provider: CloudFormation
        Configuration:
          StackName: global-app-us-east
          TemplatePath: BuildOutput::template-us-east.yaml
          Capabilities: CAPABILITY_IAM
        Region: us-east-1
        InputArtifacts:
          - Name: BuildOutput
  
  - Name: Deploy-EU-West
    Actions:
      - Name: DeployEUwest
        ActionTypeId:
          Category: Deploy
          Owner: AWS
          Provider: CloudFormation
        Configuration:
          StackName: global-app-eu-west
          TemplatePath: BuildOutput::template-eu-west.yaml
          Capabilities: CAPABILITY_IAM
        Region: eu-west-1
        InputArtifacts:
          - Name: BuildOutput
  
  - Name: Deploy-AP-Southeast
    Actions:
      - Name: DeployAPsoutheast
        ActionTypeId:
          Category: Deploy
          Owner: AWS
          Provider: CloudFormation
        Configuration:
          StackName: global-app-ap-southeast
          TemplatePath: BuildOutput::template-ap-southeast.yaml
          Capabilities: CAPABILITY_IAM
        Region: ap-southeast-1
        InputArtifacts:
          - Name: BuildOutput
```

### **2. Blue-Green Global**
```python
class GlobalBlueGreenDeployment:
    def __init__(self):
        self.route53 = boto3.client('route53')
        self.cloudfront = boto3.client('cloudfront')
    
    def deploy_blue_green_global(self, new_version, regions):
        """Deployment blue-green global"""
        
        # 1. Desplegar nueva versión en todas las regiones
        for region in regions:
            self.deploy_new_version(region, new_version)
        
        # 2. Validar deployments
        deployment_status = self.validate_deployments(regions)
        
        if deployment_status['all_success']:
            # 3. Switch tráfico gradualmente
            self.switch_traffic_gradually(regions)
            
            # 4. Actualizar CDN cache
            self.update_cdn_cache(new_version)
            
            return True
        else:
            # 5. Rollback si hay errores
            self.rollback_deployments(regions)
            return False
    
    def deploy_new_version(self, region, version):
        """Desplegar nueva versión en región específica"""
        cf = boto3.client('cloudformation', region_name=region)
        
        cf.update_stack(
            StackName=f'global-app-{region}',
            TemplateURL=f'https://s3.amazonaws.com/global-templates/template-{version}.yaml',
            Parameters=[
                {
                    'ParameterKey': 'ApplicationVersion',
                    'ParameterValue': version
                }
            ],
            Capabilities=['CAPABILITY_IAM']
        )
    
    def switch_traffic_gradually(self, regions):
        """Switch tráfico gradualmente"""
        for region in regions:
            # 5% traffic
            self.update_route53_weight(region, 5)
            time.sleep(30)  # Esperar propagación
            
            # 25% traffic
            self.update_route53_weight(region, 25)
            time.sleep(60)
            
            # 50% traffic
            self.update_route53_weight(region, 50)
            time.sleep(60)
            
            # 100% traffic
            self.update_route53_weight(region, 100)
```

## Cost Management

### **1. Optimización de Costos**
```python
class GlobalCostOptimizer:
    def __init__(self):
        self.ce = boto3.client('ceexplorer')
        self.cloudwatch = boto3.client('cloudwatch')
    
    def analyze_global_costs(self):
        """Analizar costos globales"""
        
        cost_analysis = {
            'regions': {},
            'services': {},
            'recommendations': []
        }
        
        # Analizar costos por región
        regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1']
        
        for region in regions:
            region_costs = self.get_region_costs(region)
            cost_analysis['regions'][region] = region_costs
            
            # Recomendaciones de optimización
            if region_costs['monthly_cost'] > 10000:
                cost_analysis['recommendations'].append({
                    'type': 'reserved_instances',
                    'region': region,
                    'potential_savings': region_costs['monthly_cost'] * 0.3
                })
        
        return cost_analysis
    
    def get_region_costs(self, region):
        """Obtener costos por región"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        response = self.ce.get_cost_and_usage(
            TimePeriod={
                'Start': start_date.strftime('%Y-%m-%d'),
                'End': end_date.strftime('%Y-%m-%d')
            },
            Filter={
                'Dimensions': {
                    'Key': 'REGION',
                    'Values': [region]
                }
            },
            Granularity='MONTHLY',
            Metrics=['BlendedCost']
        )
        
        total_cost = sum(
            result['Amount']['BlendedCost']
            for result in response['ResultsByTime']
        )
        
        return {
            'monthly_cost': total_cost,
            'currency': 'USD'
        }
```

## Best Practices

### **1. Diseño de Arquitectura**
- Separación de concerns por región
- Data locality optimizada
- Failover automático
- Consistencia eventual aceptada

### **2. Performance**
- CDN para contenido estático
- Edge computing para procesamiento
- Caching multi-nivel
- Optimización de consultas

### **3. Seguridad**
- Principio de menor privilegio
- Data encryption everywhere
- Network segmentation
- Compliance por región

### **4. Operaciones**
- Centralized monitoring
- Automated deployments
- Global backup strategy
- Disaster recovery testing

## Conclusion

La arquitectura global de aplicaciones en AWS permite construir sistemas escalables y resilientes que sirven a usuarios en todo el mundo con baja latencia y alta disponibilidad. La clave es combinar los servicios apropiados de AWS con patrones de diseño probados para lograr una experiencia global consistente y cumplir con los requisitos regulatorios de cada región.

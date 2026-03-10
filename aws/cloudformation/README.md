# AWS CloudFormation

## Definición

AWS CloudFormation es un servicio de infraestructura como código (Infrastructure as Code) que permite modelar, aprovisionar y gestionar recursos de AWS de manera predecible y repetible. Utiliza plantillas para definir la infraestructura como código, permitiendo automatizar el despliegue y la gestión de recursos.

## Características Principales

### 1. **Infrastructure as Code**
- Definición de recursos en plantillas
- Versionamiento de infraestructura
- Repetibilidad y consistencia
- Control de cambios

### 2. **Automatización**
- Despliegue automatizado de recursos
- Actualizaciones coordinadas
- Rollback automático
- Integración CI/CD

### 3. **Gestión del Ciclo de Vida**
- Creación, actualización y eliminación
- Stack dependencies
- Change sets para revisiones
- Drift detection

### 4. **Seguridad y Control**
- IAM integration
- Resource policies
- Stack policies
- Role-based access

## Componentes Clave

### **Templates (Plantillas)**
- Archivos JSON o YAML
- Definen recursos y configuración
- Parameters, mappings, outputs
- Intrinsics functions

### **Stacks**
- Colección de recursos gestionados
- Unidad de despliegue
- Lifecycle management
- State tracking

### **Change Sets**
- Vista previa de cambios
- Safe deployment
- Impact analysis
- Approval workflow

### **StackSets**
- Despliegue multi-region/multi-cuenta
- Centralized management
- Automatic provisioning
- Consistency across accounts

## Estructura de Plantilla

### **Formato YAML**
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Plantilla de ejemplo para S3 bucket'

Parameters:
  BucketName:
    Type: String
    Description: 'Nombre del bucket S3'
    Default: 'my-unique-bucket-name'

Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref BucketName
      VersioningConfiguration:
        Status: Enabled
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true

Outputs:
  BucketName:
    Description: 'Nombre del bucket creado'
    Value: !Ref MyBucket
    Export:
      Name: !Sub '${AWS::StackName}-BucketName'
```

### **Secciones Principales**
- **AWSTemplateFormatVersion**: Versión del formato
- **Description**: Descripción de la plantilla
- **Parameters**: Variables de entrada
- **Mappings**: Tablas de lookup
- **Conditions**: Lógica condicional
- **Resources**: Definición de recursos
- **Outputs**: Valores de salida
- **Transform**: Procesamiento de plantillas

## Tipos de Recursos Soportados

### **Compute**
- **EC2**: Instancias, Security Groups, VPC
- **Lambda**: Funciones, Roles, Layers
- **ECS**: Clusters, Services, Tasks
- **EKS**: Clusters, Node Groups

### **Storage**
- **S3**: Buckets, Objects
- **EFS**: File Systems
- **EBS**: Volumes, Snapshots

### **Database**
- **RDS**: Instancias, Clusters
- **DynamoDB**: Tables, Streams
- **ElastiCache**: Clusters, Replication Groups

### **Networking**
- **VPC**: VPCs, Subnets, Route Tables
- **CloudFront**: Distributions
- **Route 53**: Hosted Zones, Records
- **API Gateway**: APIs, Stages

### **Security**
- **IAM**: Roles, Policies, Users
- **KMS**: Keys, Aliases
- **Secrets Manager**: Secrets

## Intrinsic Functions

### **Referencing**
```yaml
# Referencia a parámetros
!Ref ParameterName

# Referencia a recursos
!Ref ResourceName

# Referencia a pseudo-parameters
!Ref AWS::Region
!Ref AWS::AccountId
```

### **String Manipulation**
```yaml
# Join strings
!Join [ '-', [ 'app', !Ref Environment, 'bucket' ] ]

# Sub variables
!Sub '${AWS::StackName}-bucket'

# Get attribute
!GetAtt MyEC2Instance.PublicIp
```

### **Conditionals**
```yaml
Conditions:
  CreateProdResources: !Equals [ !Ref Environment, 'production' ]

Resources:
  MyBucket:
    Condition: CreateProdResources
    Type: AWS::S3::Bucket
```

### **Advanced Functions**
```yaml
# Base64 encoding
!Base64 'string-to-encode'

# CIDR block
!Cidr [ !Ref VpcCidr, 4, 8 ]

# Import value
!ImportValue ExportedValueName

# Split string
!Split [ ',', 'item1,item2,item3' ]
```

## Stack Management

### **Create Stack**
```bash
aws cloudformation create-stack \
  --stack-name my-stack \
  --template-body file://template.yaml \
  --parameters ParameterKey=BucketName,ParameterValue=my-bucket \
  --capabilities CAPABILITY_IAM
```

### **Update Stack**
```bash
aws cloudformation update-stack \
  --stack-name my-stack \
  --template-body file://updated-template.yaml \
  --parameters ParameterKey=BucketName,ParameterValue=updated-bucket
```

### **Delete Stack**
```bash
aws cloudformation delete-stack --stack-name my-stack
```

### **Change Sets**
```bash
# Create change set
aws cloudformation create-change-set \
  --stack-name my-stack \
  --change-set-name my-changes \
  --template-body file://template.yaml

# Execute change set
aws cloudformation execute-change-set \
  --change-set-name my-changes \
  --stack-name my-stack
```

## Nested Stacks

### **Template Principal**
```yaml
Resources:
  VPCStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: https://s3.amazonaws.com/my-bucket/vpc-template.yaml
      Parameters:
        VpcCidr: 10.0.0.0/16
  
  DatabaseStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: https://s3.amazonaws.com/my-bucket/database-template.yaml
      Parameters:
        VpcId: !GetAtt VPCStack.Outputs.VpcId
```

### **Ventajas**
- Modularización de templates
- Reutilización de componentes
- Gestión independiente
- Mejor mantenibilidad

## Cross-Stack References

### **Export Values**
```yaml
# Stack A
Resources:
  MyBucket:
    Type: AWS::S3::Bucket

Outputs:
  BucketName:
    Value: !Ref MyBucket
    Export:
      Name: !Sub '${AWS::StackName}-BucketName'
```

### **Import Values**
```yaml
# Stack B
Resources:
  MyFunction:
    Type: AWS::Lambda::Function
    Properties:
      Environment:
        Variables:
          BUCKET_NAME: !ImportValue StackA-BucketName
```

## Stack Policies

### **Policy de Actualización**
```json
{
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "Update:Modify",
      "Principal": "*",
      "Resource": "*"
    },
    {
      "Effect": "Deny",
      "Action": "Update:Delete",
      "Principal": "*",
      "Resource": "LogicalResourceId/ProductionDatabase"
    }
  ]
}
```

### **Aplicar Policy**
```bash
aws cloudformation set-stack-policy \
  --stack-name my-stack \
  --stack-policy-body file://stack-policy.json
```

## Drift Detection

### **Detect Drift**
```bash
aws cloudformation detect-stack-drift \
  --stack-name my-stack
```

### **Drift Results**
```bash
aws cloudformation describe-stack-drift-detection-status \
  --stack-drift-detection-id detection-id
```

## Herramientas y Frameworks

### **AWS SAM (Serverless Application Model)**
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      Runtime: python3.9
      Events:
        MyApi:
          Type: Api
          Properties:
            Path: /hello
            Method: get
```

### **CDK (Cloud Development Kit)**
```python
from aws_cdk import (
    aws_s3 as s3,
    aws_ec2 as ec2,
    Stack,
    App
)

class MyStack(Stack):
    def __init__(self, scope, id, **kwargs):
        super().__init__(scope, id, **kwargs)
        
        bucket = s3.Bucket(self, "MyBucket",
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED
        )
        
        instance = ec2.Instance(self, "MyInstance",
            instance_type="t2.micro",
            machine_image=ec2.AmazonLinuxImage()
        )
```

### **Terraform**
```hcl
resource "aws_s3_bucket" "my_bucket" {
  bucket = "my-unique-bucket-name"
  
  versioning {
    enabled = true
  }
  
  tags = {
    Environment = var.environment
    Project     = var.project
  }
}
```

## Mejores Prácticas

### **1. Diseño de Templates**
- Templates modulares y reutilizables
- Nombres lógicos descriptivos
- Parámetros con validación
- Outputs para cross-stack references

### **2. Seguridad**
- Principio de menor privilegio
- IAM roles específicos
- Sin credenciales en templates
- Uso de Secrets Manager

### **3. Gestión de Cambios**
- Change sets para revisiones
- Testing en entornos de staging
- Rollback plans
- Versionamiento de templates

### **4. Monitoreo**
- CloudWatch Events
- Stack notifications
- Drift detection regular
- Resource tags

## Casos de Uso

### **1. Infraestructura Base**
- VPCs y networking
- Security groups
- IAM roles y policies
- Monitoring setup

### **2. Aplicaciones**
- Microservicios serverless
- Web applications
- Database clusters
- CI/CD pipelines

### **3. Entornos**
- Development environments
- Staging environments
- Production environments
- Disaster recovery

### **4. Automatización**
- Resource provisioning
- Configuration management
- Compliance enforcement
- Cost optimization

## Errores Comunes

### **1. Resource Dependencies**
- Order incorrecto de recursos
- Referencias circulares
- Implicit dependencies

### **2. Limits y Cuotas**
- Límites de recursos por región
- Template size limits
- Parameter limits

### **3. Naming Conflicts**
- Recursos con nombres duplicados
- Export conflicts
- Resource deletion issues

### **4. Template Validation**
- Sintaxis incorrecta
- Referencias inválidas
- Type mismatches

## Conclusión

AWS CloudFormation es fundamental para la gestión moderna de infraestructura en AWS, permitiendo automatizar, versionar y gestionar recursos de manera consistente y predecible. Es la base para prácticas de DevOps, CI/CD y Infrastructure as Code en la nube de AWS.

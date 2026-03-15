# S3 Cross-Region Replication (CRR)

## Definición

S3 Cross-Region Replication (CRR) es una característica de Amazon S3 que replica automáticamente objetos de un bucket de origen a uno o más buckets de destino en diferentes regiones de AWS. Proporciona redundancia geográfica, baja latencia de acceso y cumplimiento regulatorio, asegurando que los datos estén disponibles en múltiples regiones geográficas.

## Características Principales

### 1. **Replicación Automática**
- Sincronización automática de objetos
- Replicación en tiempo real
- Configuración flexible
- Monitoreo de estado

### 2. **Redundancia Geográfica**
- Disaster recovery
- Alta disponibilidad
- Resiliencia regional
- Business continuity

### 3. **Cumplimiento Regulatorio**
- Data sovereignty
- GDPR compliance
- Industry regulations
- Data residency requirements

### 4. **Optimización de Rendimiento**
- Acceso local a datos
- Reducción de latencia
- Global applications
- Edge computing

## Componentes Clave

### **Source Bucket**
- Bucket de origen
- Configuración de replicación
- Versioning requerido
- IAM permissions

### **Destination Bucket**
- Bucket de destino
- Configuración de recepción
- Mismo nombre opcional
- Access control

### **Replication Configuration**
- Rules de replicación
- Filtros de objetos
- Storage classes
- Metadata handling

### **IAM Roles**
- Permisos de replicación
- Cross-account access
- Security policies
- Access management

## Configuración Básica

### **Habilitar Versioning**
```bash
# Habilitar versioning en bucket de origen
aws s3api put-bucket-versioning \
  --bucket source-bucket \
  --versioning-configuration Status=Enabled

# Habilitar versioning en bucket de destino
aws s3api put-bucket-versioning \
  --bucket destination-bucket \
  --versioning-configuration Status=Enabled

# Verificar versioning
aws s3api get-bucket-versioning \
  --bucket source-bucket
```

### **Crear IAM Role para Replicación**
```bash
# Crear política de confianza
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "s3.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Crear role
aws iam create-role \
  --role-name s3-replication-role \
  --assume-role-policy-document file://trust-policy.json

# Crear política de permisos
cat > replication-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetReplicationConfiguration",
        "s3:GetObjectVersionForReplication",
        "s3:GetObjectVersionAcl",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::source-bucket",
        "arn:aws:s3:::source-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ReplicateObject",
        "s3:ReplicateDelete",
        "s3:ReplicateTags"
      ],
      "Resource": [
        "arn:aws:s3:::destination-bucket",
        "arn:aws:s3:::destination-bucket/*"
      ]
    }
  ]
}
EOF

# Adjuntar política al role
aws iam put-role-policy \
  --role-name s3-replication-role \
  --policy-name s3-replication-policy \
  --policy-document file://replication-policy.json
```

### **Configurar Replicación**
```bash
# Crear configuración de replicación
cat > replication-config.json << EOF
{
  "Role": "arn:aws:iam::123456789012:role/s3-replication-role",
  "Rules": [
    {
      "ID": "GlobalReplicationRule",
      "Status": "Enabled",
      "Prefix": "",
      "Destination": {
        "Bucket": "arn:aws:s3:::destination-bucket",
        "StorageClass": "STANDARD",
        "Account": "123456789012"
      },
      "DeleteMarkerReplication": {
        "Status": "Enabled"
      }
    }
  ]
}
EOF

# Aplicar configuración de replicación
aws s3api put-bucket-replication \
  --bucket source-bucket \
  --replication-configuration file://replication-config.json
```

## Configuración Avanzada

### **Múltiples Destinos**
```bash
# Replicación a múltiples regiones
cat > multi-destination-replication.json << EOF
{
  "Role": "arn:aws:iam::123456789012:role/s3-replication-role",
  "Rules": [
    {
      "ID": "MultiRegionReplication",
      "Status": "Enabled",
      "Prefix": "",
      "Destination": [
        {
          "Bucket": "arn:aws:s3:::destination-bucket-eu",
          "StorageClass": "STANDARD",
          "Account": "123456789012"
        },
        {
          "Bucket": "arn:aws:s3:::destination-bucket-asia",
          "StorageClass": "STANDARD",
          "Account": "123456789012"
        }
      ],
      "DeleteMarkerReplication": {
        "Status": "Enabled"
      }
    }
  ]
}
EOF
```

### **Filtrado por Prefijo**
```bash
# Replicar solo ciertos prefijos
cat > prefix-filter-replication.json << EOF
{
  "Role": "arn:aws:iam::123456789012:role/s3-replication-role",
  "Rules": [
    {
      "ID": "ImagesReplication",
      "Status": "Enabled",
      "Prefix": "images/",
      "Destination": {
        "Bucket": "arn:aws:s3:::destination-bucket",
        "StorageClass": "STANDARD"
      }
    },
    {
      "ID": "VideosReplication",
      "Status": "Enabled",
      "Prefix": "videos/",
      "Destination": {
        "Bucket": "arn:aws:s3:::destination-bucket",
        "StorageClass": "INTELLIGENT_TIERING"
      }
    }
  ]
}
EOF
```

### **Storage Classes Diferentes**
```bash
# Replicación con diferentes storage classes
cat > storage-class-replication.json << EOF
{
  "Role": "arn:aws:iam::123456789012:role/s3-replication-role",
  "Rules": [
    {
      "ID": "ClassBasedReplication",
      "Status": "Enabled",
      "Prefix": "",
      "Filter": {
        "And": {
          "Prefix": "archive/",
          "Tag": {
            "Key": "data-type",
            "Value": "critical"
          }
        }
      },
      "Destination": {
        "Bucket": "arn:aws:s3:::destination-bucket",
        "StorageClass": "GLACIER_IR"
      },
      "DeleteMarkerReplication": {
        "Status": "Enabled"
      }
    }
  ]
}
EOF
```

## Cross-Account Replication

### **Configuración Cross-Account**
```bash
# En cuenta de destino (456789012345)
aws s3api put-bucket-versioning \
  --bucket destination-bucket \
  --versioning-configuration Status=Enabled

# Crear bucket policy en destino
cat > destination-bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/s3-replication-role"
      },
      "Action": [
        "s3:ReplicateObject",
        "s3:ReplicateDelete",
        "s3:ReplicateTags",
        "s3:GetObjectVersion",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::destination-bucket",
        "arn:aws:s3:::destination-bucket/*"
      ]
    }
  ]
}
EOF

aws s3api put-bucket-policy \
  --bucket destination-bucket \
  --policy file://destination-bucket-policy.json

# En cuenta de origen (123456789012)
cat > cross-account-replication.json << EOF
{
  "Role": "arn:aws:iam::123456789012:role/s3-replication-role",
  "Rules": [
    {
      "ID": "CrossAccountReplication",
      "Status": "Enabled",
      "Prefix": "",
      "Destination": {
        "Bucket": "arn:aws:s3:::destination-bucket",
        "StorageClass": "STANDARD",
        "Account": "456789012345"
      },
      "DeleteMarkerReplication": {
        "Status": "Enabled"
      }
    }
  ]
}
EOF
```

## Monitoring y Troubleshooting

### **Verificar Estado de Replicación**
```bash
# Ver configuración de replicación
aws s3api get-bucket-replication \
  --bucket source-bucket

# Ver métricas de replicación
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name ReplicationLatency \
  --dimensions Name=BucketName,Value=source-bucket \
  --statistics Average \
  --period 3600 \
  --start-time 2023-01-01T00:00:00Z \
  --end-time 2023-01-02T00:00:00Z
```

### **S3 Replication Metrics**
```bash
# Configurar métricas de replicación
aws s3api put-bucket-metrics-configuration \
  --bucket source-bucket \
  --id replication-metrics \
  --metrics-configuration file://metrics-config.json

# metrics-config.json
{
  "Id": "replication-metrics",
  "Filter": {
    "Prefix": ""
  }
}
```

### **CloudTrail Logging**
```bash
# Ver eventos de replicación en CloudTrail
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=source-bucket \
  --start-time 2023-01-01T00:00:00Z \
  --end-time 2023-01-02T00:00:00Z
```

## Best Practices

### **1. Configuración Inicial**
- Habilitar versioning antes de replicación
- Configurar IAM roles apropiados
- Validar permisos cross-account
- Test con objetos de prueba

### **2. Performance**
- Usar storage classes apropiadas
- Configurar filtros eficientes
- Monitorear latencia de replicación
- Optimizar tamaños de objetos

### **3. Cost Management**
- Considerar costos de transferencia
- Storage classes optimizadas
- Lifecycle policies
- Data transfer optimization

### **4. Security**
- Principio de menor privilegio
- Bucket policies restrictivas
- Encryption en tránsito
- Audit logging

## Casos de Uso

### **1. Disaster Recovery**
```bash
# Configuración para disaster recovery
cat > dr-replication.json << EOF
{
  "Role": "arn:aws:iam::123456789012:role/s3-replication-role",
  "Rules": [
    {
      "ID": "DisasterRecovery",
      "Status": "Enabled",
      "Prefix": "critical-data/",
      "Destination": {
        "Bucket": "arn:aws:s3:::dr-backup-bucket",
        "StorageClass": "STANDARD_IA"
      },
      "DeleteMarkerReplication": {
        "Status": "Enabled"
      }
    }
  ]
}
EOF
```

### **2. Global Applications**
```bash
# Replicación para aplicaciones globales
cat > global-app-replication.json << EOF
{
  "Role": "arn:aws:iam::123456789012:role/s3-replication-role",
  "Rules": [
    {
      "ID": "GlobalContent",
      "Status": "Enabled",
      "Prefix": "content/",
      "Destination": {
        "Bucket": "arn:aws:s3:::global-content-bucket",
        "StorageClass": "STANDARD"
      }
    }
  ]
}
EOF
```

### **3. Compliance y Data Sovereignty**
```bash
# Replicación para cumplimiento regulatorio
cat > compliance-replication.json << EOF
{
  "Role": "arn:aws:iam::123456789012:role/s3-replication-role",
  "Rules": [
    {
      "ID": "EUDataResidency",
      "Status": "Enabled",
      "Prefix": "eu-data/",
      "Destination": {
        "Bucket": "arn:aws:s3:::eu-compliance-bucket",
        "StorageClass": "STANDARD"
      }
    }
  ]
}
EOF
```

## Cost Optimization

### **Storage Classes por Región**
```bash
# Optimización de storage classes
cat = cost-optimized-replication.json << EOF
{
  "Role": "arn:aws:iam::123456789012:role/s3-replication-role",
  "Rules": [
    {
      "ID": "HotData",
      "Status": "Enabled",
      "Prefix": "hot/",
      "Destination": {
        "Bucket": "arn:aws:s3:::destination-bucket",
        "StorageClass": "STANDARD"
      }
    },
    {
      "ID": "ColdData",
      "Status": "Enabled",
      "Prefix": "archive/",
      "Destination": {
        "Bucket": "arn:aws:s3:::destination-bucket",
        "StorageClass": "GLACIER"
      }
    }
  ]
}
EOF
```

### **Lifecycle Integration**
```bash
# Lifecycle rules para buckets replicados
aws s3api put-bucket-lifecycle-configuration \
  --bucket destination-bucket \
  --lifecycle-configuration file://lifecycle-config.json

# lifecycle-config.json
{
  "Rules": [
    {
      "ID": "ReplicatedArchive",
      "Status": "Enabled",
      "Prefix": "archive/",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ]
    }
  ]
}
```

## Automatización y Scripts

### **Script de Monitoreo**
```python
#!/usr/bin/env python3
import boto3
import time
from datetime import datetime, timedelta

def monitor_replication():
    s3 = boto3.client('s3')
    cloudwatch = boto3.client('cloudwatch')
    
    source_bucket = 'source-bucket'
    destination_bucket = 'destination-bucket'
    
    # Obtener lista de objetos en origen
    source_objects = []
    paginator = s3.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=source_bucket):
        if 'Contents' in page:
            source_objects.extend([obj['Key'] for obj in page['Contents']])
    
    # Verificar replicación
    for obj_key in source_objects[:10]:  # Check first 10 objects
        try:
            # Verificar si existe en destino
            s3.head_object(Bucket=destination_bucket, Key=obj_key)
            print(f"✓ {obj_key} replicated successfully")
        except:
            print(f"✗ {obj_key} not yet replicated")
    
    # Obtener métricas de latencia
    try:
        response = cloudwatch.get_metric_statistics(
            Namespace='AWS/S3',
            MetricName='ReplicationLatency',
            Dimensions=[
                {
                    'Name': 'BucketName',
                    'Value': source_bucket
                }
            ],
            StartTime=datetime.utcnow() - timedelta(hours=24),
            EndTime=datetime.utcnow(),
            Period=3600,
            Statistics=['Average']
        )
        
        if response['Datapoints']:
            avg_latency = sum(dp['Average'] for dp in response['Datapoints']) / len(response['Datapoints'])
            print(f"Average replication latency: {avg_latency:.2f} seconds")
        
    except Exception as e:
        print(f"Error getting metrics: {e}")

if __name__ == "__main__":
    monitor_replication()
```

### **Script de Validación**
```bash
#!/bin/bash
# Script para validar configuración de replicación

SOURCE_BUCKET="source-bucket"
DESTINATION_BUCKET="destination-bucket"

echo "Validating S3 CRR configuration..."

# Check versioning
echo "Checking versioning..."
SOURCE_VERSIONING=$(aws s3api get-bucket-versioning --bucket $SOURCE_BUCKET --query 'Status' --output text)
DEST_VERSIONING=$(aws s3api get-bucket-versioning --bucket $DESTINATION_BUCKET --query 'Status' --output text)

if [ "$SOURCE_VERSIONING" = "Enabled" ] && [ "$DEST_VERSIONING" = "Enabled" ]; then
    echo "✓ Versioning enabled on both buckets"
else
    echo "✗ Versioning not enabled on both buckets"
    exit 1
fi

# Check replication configuration
echo "Checking replication configuration..."
REPLICATION_CONFIG=$(aws s3api get-bucket-replication --bucket $SOURCE_BUCKET --query 'ReplicationConfiguration.Rules[0].Status' --output text)

if [ "$REPLICATION_CONFIG" = "Enabled" ]; then
    echo "✓ Replication enabled"
else
    echo "✗ Replication not enabled"
    exit 1
fi

# Test replication
echo "Testing replication..."
TEST_FILE="test-replication-$(date +%s).txt"
echo "Test content" > $TEST_FILE

aws s3 cp $TEST_FILE s3://$SOURCE_BUCKET/$TEST_FILE

# Wait for replication
sleep 30

# Check if replicated
if aws s3 ls s3://$DESTINATION_BUCKET/$TEST_FILE > /dev/null 2>&1; then
    echo "✓ Test file replicated successfully"
    aws s3 rm s3://$SOURCE_BUCKET/$TEST_FILE
    aws s3 rm s3://$DESTINATION_BUCKET/$TEST_FILE
    rm $TEST_FILE
else
    echo "✗ Test file not replicated"
    rm $TEST_FILE
    exit 1
fi

echo "✓ S3 CRR validation completed successfully"
```

## Troubleshooting Común

### **Problemas Frecuentes**
1. **Replicación no funciona**
   - Verificar versioning habilitado
   - Validar IAM permissions
   - Revisar bucket policies

2. **Alta latencia de replicación**
   - Tamaño de objetos grandes
   - Network congestion
   - Storage class conversion

3. **Costos inesperados**
   - Data transfer entre regiones
   - Storage class differences
   - Replication de objetos no necesarios

### **Debug Commands**
```bash
# Ver estado de replicación
aws s3api get-bucket-replication --bucket source-bucket

# Ver logs de CloudTrail
aws logs filter-log-events \
  --log-group-name /aws/s3/source-bucket \
  --filter-pattern "Replication"

# Ver métricas
aws cloudwatch list-metrics \
  --namespace AWS/S3 \
  --metric-name ReplicationLatency
```

## Comparison con Otras Soluciones

### **S3 CRR vs S3 Same-Region Replication (SRR)**
- **CRR**: Cross-region, disaster recovery
- **SRR**: Same-region, performance optimization

### **S3 CRR vs AWS Backup**
- **CRR**: Object-level replication
- **AWS Backup**: Application-level backups

### **S3 CRR vs Third-party Tools**
- **CRR**: Native, managed
- **Third-party**: More features, complex

## Conclusion

S3 Cross-Region Replication es fundamental para aplicaciones globales que requieren alta disponibilidad, disaster recovery y cumplimiento regulatorio. Proporciona redundancia geográfica automática y seamless, siendo esencial para arquitecturas cloud-native resilientes y escalables.

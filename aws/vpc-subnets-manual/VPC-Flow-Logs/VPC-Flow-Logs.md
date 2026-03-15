# AWS VPC Flow Logs

## Definición

VPC Flow Logs es un servicio de AWS que captura información sobre el tráfico IP que va hacia y desde las interfaces de red en tu VPC. Flow Logs te permiten monitorear y auditar el tráfico de red para análisis de seguridad, diagnóstico de problemas de conectividad y optimización de rendimiento.

## Características Principales

### 1. **Captura de Tráfico**
- Monitoreo de tráfico IP en tiempo real
- Captura de paquetes entrantes y salientes
- Información detallada de conexiones
- Soporte para IPv4 e IPv6

### 2. **Flexibilidad de Almacenamiento**
- CloudWatch Logs
- S3 buckets
- Kinesis Data Firehose
- Formatos JSON y plaintext

### 3. **Configuración Granular**
- Por VPC, subnet o interfaz
- Tipos de tráfico específicos
- Filtros personalizados
- Retención configurable

## Configuración de VPC Flow Logs

### **Creación y Gestión de Flow Logs**
```python
import boto3
from datetime import datetime, timedelta

class VPCFlowLogs:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.logs = boto3.client('logs', region_name=region)
        self.region = region
    
    def create_flow_log(self, vpc_id, log_group_name, traffic_type='ALL'):
        """Crear flow log para VPC"""
        
        try:
            # Crear log group si no existe
            try:
                self.logs.create_log_group(logGroupName=log_group_name)
            except self.logs.exceptions.ResourceAlreadyExistsException:
                pass  # El log group ya existe
            
            # Crear flow log
            response = self.ec2.create_flow_logs(
                ResourceIds=[vpc_id],
                ResourceType='VPC',
                TrafficType=traffic_type,
                LogGroupName=log_group_name,
                DeliverLogsPermissionArn='arn:aws:iam::123456789012:role/flow-logs-role',
                TagSpecifications=[
                    {
                        'ResourceType': 'vpc-flow-log',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'flow-log-{vpc_id}'},
                            {'Key': 'VPC', 'Value': vpc_id}
                        ]
                    }
                ]
            )
            
            return {
                'success': True,
                'flow_log_ids': response['FlowLogIds'],
                'log_group_name': log_group_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_flow_logs(self, vpc_id=None):
        """Describir flow logs"""
        
        try:
            params = {}
            if vpc_id:
                params['Filters'] = [{'Name': 'resource-id', 'Values': [vpc_id]}]
            
            response = self.ec2.describe_flow_logs(**params)
            
            flow_logs = []
            for flow_log in response['FlowLogs']:
                flow_log_info = {
                    'flow_log_id': flow_log['FlowLogId'],
                    'resource_id': flow_log['ResourceId'],
                    'resource_type': flow_log['ResourceType'],
                    'traffic_type': flow_log['TrafficType'],
                    'log_group_name': flow_log['LogGroupName'],
                    'deliver_logs_status': flow_log['DeliverLogsStatus'],
                    'log_destination_type': flow_log['LogDestinationType'],
                    'tags': flow_log.get('Tags', [])
                }
                flow_logs.append(flow_log_info)
            
            return {
                'success': True,
                'flow_logs': flow_logs,
                'count': len(flow_logs)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_flow_log(self, flow_log_id):
        """Eliminar flow log"""
        
        try:
            self.ec2.delete_flow_logs(
                FlowLogIds=[flow_log_id]
            )
            
            return {
                'success': True,
                'flow_log_id': flow_log_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_flow_logs(self, log_group_name, hours=24):
        """Analizar flow logs"""
        
        try:
            # Configurar timeframe
            start_time = datetime.utcnow() - timedelta(hours=hours)
            end_time = datetime.utcnow()
            
            # Query para obtener logs de flow logs
            query = f"""
            fields @timestamp, @message
            | filter @logStream like /flow-log/
            | parse @message "{{version}} {{account_id}} {{interface_id}} {{srcaddr}} {{dstaddr}} {{srcport}} {{dstport}} {{protocol}} {{packets}} {{bytes}} {{start}} {{end}} {{action}} {{log_status}}"
            | stats count() as flow_count, sum(bytes) as total_bytes by srcaddr, dstaddr, action
            | sort flow_count desc
            | limit 100
            """
            
            # Ejecutar query (requiere CloudWatch Logs Insights)
            # Esta es una implementación simplificada
            
            return {
                'success': True,
                'log_group': log_group_name,
                'analysis_period': f"Last {hours} hours",
                'message': 'Flow log analysis completed (simplified implementation)'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_s3_flow_log(self, vpc_id, bucket_name, prefix='flow-logs'):
        """Crear flow log con destino S3"""
        
        try:
            response = self.ec2.create_flow_logs(
                ResourceIds=[vpc_id],
                ResourceType='VPC',
                TrafficType='ALL',
                LogDestinationType='s3',
                LogDestination=f'{bucket_name}/{prefix}',
                TagSpecifications=[
                    {
                        'ResourceType': 'vpc-flow-log',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'flow-log-{vpc_id}'},
                            {'Key': 'Destination', 'Value': 'S3'}
                        ]
                    }
                ]
            )
            
            return {
                'success': True,
                'flow_log_ids': response['FlowLogIds'],
                'destination': f's3://{bucket_name}/{prefix}'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_flow_log_statistics(self, log_group_name, hours=24):
        """Obtener estadísticas de flow logs"""
        
        try:
            # Configurar timeframe
            start_time = datetime.utcnow() - timedelta(hours=hours)
            
            # Obtener métricas de CloudWatch
            metrics = self.logs.get_metric_statistics(
                Namespace='AWS/VPC',
                MetricName='FlowLogs',
                Dimensions=[
                    {
                        'Name': 'LogGroupName',
                        'Value': log_group_name
                    }
                ],
                StartTime=start_time,
                EndTime=datetime.utcnow(),
                Period=3600,  # 1 hora
                Statistics=['Sum', 'Average']
            )
            
            return {
                'success': True,
                'metrics': metrics,
                'period': f"Last {hours} hours"
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Formato de Flow Logs

### **Formato de Registro**
```
version account_id interface_id srcaddr dstaddr srcport dstport protocol packets bytes start end action log_status
```

### **Campos Explicados**
- **version**: Versión del formato de flow log
- **account_id**: ID de la cuenta AWS
- **interface_id**: ID de la interfaz de red
- **srcaddr**: Dirección IP de origen
- **dstaddr**: Dirección IP de destino
- **srcport**: Puerto de origen
- **dstport**: Puerto de destino
- **protocol**: Protocolo (TCP, UDP, ICMP)
- **packets**: Número de paquetes
- **bytes**: Número de bytes
- **start**: Hora de inicio del flujo
- **end**: Hora de fin del flujo
- **action**: Acción (ACCEPT, REJECT)
- **log_status**: Estado del log (OK, NODATA, SKIPDATA)

## Configuración con AWS CLI

### **Crear Flow Log**
```bash
# Crear flow log con destino CloudWatch Logs
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-1234567890abcdef0 \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name vpc-flow-logs \
  --deliver-logs-permission-arn arn:aws:iam::123456789012:role/flow-logs-role

# Crear flow log con destino S3
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-1234567890abcdef0 \
  --traffic-type ALL \
  --log-destination-type s3 \
  --log-destination my-flow-log-bucket/prefix

# Describir flow logs
aws ec2 describe-flow-logs \
  --filters Name=resource-id,Values=vpc-1234567890abcdef0
```

## Casos de Uso

### **1. Monitoreo de Seguridad**
```python
# Ejemplo de monitoreo de seguridad
manager = VPCFlowLogs('us-east-1')

# Crear flow log para VPC
flow_log_result = manager.create_flow_log(
    vpc_id='vpc-1234567890abcdef0',
    log_group_name='security-flow-logs',
    traffic_type='ALL'
)

if flow_log_result['success']:
    print(f"Flow log created: {flow_log_result['flow_log_ids']}")
    
    # Analizar logs de seguridad
    analysis = manager.analyze_flow_logs(
        log_group_name='security-flow-logs',
        hours=24
    )
    
    print(f"Security analysis: {analysis}")
```

### **2. Diagnóstico de Conectividad**
```python
# Diagnóstico de problemas de red
def diagnose_connectivity(log_group_name, source_ip, dest_ip):
    """Diagnosticar problemas de conectividad"""
    
    query = f"""
    fields @timestamp, @message
    | filter @logStream like /flow-log/
    | parse @message "{{version}} {{account_id}} {{interface_id}} {{srcaddr}} {{dstaddr}} {{srcport}} {{dstport}} {{protocol}} {{packets}} {{bytes}} {{start}} {{end}} {{action}} {{log_status}}"
    | filter srcaddr = "{source_ip}" and dstaddr = "{dest_ip}"
    | stats count() by action, protocol, dstport
    | sort count() desc
    """
    
    return query
```

## Análisis de Flow Logs

### **Queries de CloudWatch Logs Insights**
```sql
-- Top 10 IPs con más tráfico
fields @timestamp, srcaddr, dstaddr, bytes
| filter srcaddr != "10.0.0.0/8"
| stats sum(bytes) as total_bytes by srcaddr
| sort total_bytes desc
| limit 10

-- Tráfico rechazado por seguridad
fields @timestamp, srcaddr, dstaddr, action
| filter action = "REJECT"
| stats count() by srcaddr, dstaddr
| sort count() desc

-- Puertos más utilizados
fields @timestamp, dstport, protocol
| stats count() by dstport, protocol
| sort count() desc
| limit 20

-- Tráfico por protocolo
fields @timestamp, protocol, bytes
| stats sum(bytes) as total_bytes, count() as flow_count by protocol
| sort total_bytes desc
```

## Best Practices

### **1. Configuración**
- Habilitar flow logs en todas las VPCs críticas
- Usar diferentes tipos de tráfico según necesidades
- Configurar retención apropiada de logs
- Etiquetar flow logs para organización

### **2. Almacenamiento**
- Usar S3 para logs a largo plazo
- CloudWatch Logs para análisis en tiempo real
- Configurar lifecycle policies para costos
- Comprimir logs para optimizar almacenamiento

### **3. Monitoreo**
- Configurar alertas para tráfico anómalo
- Monitorear costos de almacenamiento
- Revisar periódicamente patrones de tráfico
- Automatizar análisis de seguridad

### **4. Seguridad**
- Restringir acceso a logs sensibles
- Encriptar logs en S3
- Usar IAM roles apropiados
- Auditar acceso a flow logs

## Costos

### **Precios de Flow Logs**
- Sin cargo por crear flow logs
- Costos por datos procesados
- Costos de almacenamiento en destino
- Costos de transferencia de datos

### **Optimización de Costos**
- Filtrar tráfico no necesario
- Usar retention policies
- Comprimir logs antiguos
- Elegir destino apropiado

## Troubleshooting

### **Problemas Comunes**
1. **Flow logs no se crean**: Verificar permisos IAM
2. **Datos no aparecen**: Revisar configuración de destino
3. **Costos elevados**: Optimizar filtros y retención
4. **Análisis lento**: Optimizar queries y timeframe

### **Comandos de Diagnóstico**
```bash
# Verificar estado de flow logs
aws ec2 describe-flow-logs \
  --flow-log-ids fl-1234567890abcdef0

# Verificar log group
aws logs describe-log-groups \
  --log-group-name-prefix vpc-flow-logs

# Verificar permisos
aws iam get-role-policy \
  --role-name flow-logs-role \
  --policy-name FlowLogsPolicy
```

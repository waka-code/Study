# AWS CloudTrail

## Definición

AWS CloudTrail es un servicio de auditoría y logging que registra acciones de API calls y eventos de la cuenta AWS. Proporciona visibilidad completa sobre quién hizo qué, cuándo y desde dónde, permitiendo cumplir con requisitos de compliance, seguridad y governance. CloudTrail captura todos los eventos de la cuenta y los almacena de manera segura para análisis forense y monitoreo de seguridad.

## Características Principales

### 1. **API Activity Logging**
- Todas las llamadas API registradas
- Eventos de gestión y datos
- Timestamps precisos
- Información de origen

### 2. **Security y Compliance**
- Auditoría automática
- Detección de anomalías
- Logs inmutables
- Retention policies

### 3. **Event Analysis**
- Event history tracking
- Event filtering
- Event aggregation
- Integration con SIEM

### 4. **Multi-Account Management**
- Organization trails
- Cross-account visibility
- Centralized logging
- Governance policies

## Componentes Clave

### **Trails**
- Configuración de logging
- Destino de logs
- Event filtering
- Multi-region deployment

### **Events**
- Management events
- Data events
- Insight events
- Service events

### **Log Files**
- JSON format
- Compressed storage
- S3 delivery
- Lifecycle management

### **Event History**
- Event lookup
- Event filtering
- Event analysis
- API access

## Tipos de Events

### **Management Events**
```bash
# Management events por defecto
aws cloudtrail put-event-selectors \
  --trail-name my-trail \
  --event-selectors '[{
    "ReadWriteType": "All",
    "IncludeManagementEvents": true,
    "DataResources": []
  }]'
```

### **Data Events**
```bash
# Data events para S3
aws cloudtrail put-event-selectors \
  --trail-name my-trail \
  --event-selectors '[{
    "ReadWriteType": "All",
    "IncludeManagementEvents": true,
    "DataResources": [
      {
        "Type": "AWS::S3::Object",
        "Values": ["arn:aws:s3:::my-bucket/"]
      }
    ]
  }]'

# Data events para Lambda
aws cloudtrail put-event-selectors \
  --trail-name my-trail \
  --event-selectors '[{
    "ReadWriteType": "All",
    "IncludeManagementEvents": true,
    "DataResources": [
      {
        "Type": "AWS::Lambda::Function",
        "Values": ["arn:aws:lambda:us-east-1:123456789012:function:*"]
      }
    ]
  }]'
```

### **Insight Events**
```bash
# Habilitar insight events
aws cloudtrail put-insight-selectors \
  --trail-name my-trail \
  --insight-selectors '{
    "InsightType": "ApiErrorRateInsight"
  }'
```

## Trail Management

### **Configuración de Trails**
```python
import boto3
import json
import time
from datetime import datetime, timedelta

class CloudTrailManager:
    def __init__(self):
        self.cloudtrail = boto3.client('cloudtrail')
        self.s3 = boto3.client('s3')
    
    def create_trail(self, trail_config):
        """Crear trail de CloudTrail"""
        
        try:
            params = {
                'Name': trail_config['name'],
                'S3BucketName': trail_config['s3_bucket'],
                'IncludeGlobalServiceEvents': trail_config.get('include_global_events', True),
                'IsMultiRegionTrail': trail_config.get('multi_region', True),
                'EnableLogFileValidation': trail_config.get('log_validation', True)
            }
            
            # Configurar S3 key prefix si se especifica
            if trail_config.get('s3_key_prefix'):
                params['S3KeyPrefix'] = trail_config['s3_key_prefix']
            
            # Configurar KMS key si se especifica
            if trail_config.get('kms_key_id'):
                params['KmsKeyId'] = trail_config['kms_key_id']
            
            # Configurar tags si se especifican
            if trail_config.get('tags'):
                params['TagsList'] = trail_config['tags']
            
            response = self.cloudtrail.create_trail(**params)
            
            return {
                'success': True,
                'trail_name': response['Name'],
                'trail_arn': response['TrailARN'],
                's3_bucket': response['S3BucketName']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_organization_trail(self, trail_config):
        """Crear trail para organización"""
        
        try:
            params = {
                'Name': trail_config['name'],
                'S3BucketName': trail_config['s3_bucket'],
                'IncludeGlobalServiceEvents': True,
                'IsMultiRegionTrail': True,
                'EnableLogFileValidation': True,
                'IsOrganizationTrail': True
            }
            
            if trail_config.get('s3_key_prefix'):
                params['S3KeyPrefix'] = trail_config['s3_key_prefix']
            
            response = self.cloudtrail.create_trail(**params)
            
            return {
                'success': True,
                'trail_name': response['Name'],
                'trail_arn': response['TrailARN'],
                'is_organization_trail': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def start_logging(self, trail_name):
        """Iniciar logging para trail"""
        
        try:
            response = self.cloudtrail.start_logging(Name=trail_name)
            
            return {
                'success': True,
                'trail_name': trail_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def stop_logging(self, trail_name):
        """Detener logging para trail"""
        
        try:
            response = self.cloudtrail.stop_logging(Name=trail_name)
            
            return {
                'success': True,
                'trail_name': trail_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_trail_status(self, trail_name):
        """Obtener estado del trail"""
        
        try:
            response = self.cloudtrail.get_trail_status(Name=trail_name)
            
            return {
                'success': True,
                'is_logging': response['IsLogging'],
                'latest_delivery_time': response.get('LatestDeliveryTime'),
                'latest_notification_time': response.get('LatestNotificationTime'),
                'start_logging_time': response.get('StartLoggingTime'),
                'stop_logging_time': response.get('StopLoggingTime'),
                'latest_cloud_watch_logs_delivery_time': response.get('LatestCloudWatchLogsDeliveryTime')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_trails(self):
        """Listar todos los trails"""
        
        try:
            response = self.cloudtrail.describe_trails()
            
            trails = []
            for trail in response['trailList']:
                trail_info = {
                    'name': trail['Name'],
                    'arn': trail['TrailARN'],
                    's3_bucket': trail.get('S3BucketName'),
                    's3_key_prefix': trail.get('S3KeyPrefix'),
                    'include_global_events': trail.get('IncludeGlobalServiceEvents', False),
                    'multi_region': trail.get('IsMultiRegionTrail', False),
                    'organization_trail': trail.get('IsOrganizationTrail', False),
                    'home_region': trail.get('HomeRegion')
                }
                trails.append(trail_info)
            
            return {
                'success': True,
                'trails': trails,
                'count': len(trails)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_trail(self, trail_name):
        """Eliminar trail"""
        
        try:
            response = self.cloudtrail.delete_trail(Name=trail_name)
            
            return {
                'success': True,
                'trail_name': trail_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_trail(self, trail_name, updates):
        """Actualizar configuración del trail"""
        
        try:
            params = {'Name': trail_name}
            
            if updates.get('s3_bucket'):
                params['S3BucketName'] = updates['s3_bucket']
            
            if updates.get('s3_key_prefix'):
                params['S3KeyPrefix'] = updates['s3_key_prefix']
            
            if updates.get('include_global_events') is not None:
                params['IncludeGlobalServiceEvents'] = updates['include_global_events']
            
            if updates.get('multi_region') is not None:
                params['IsMultiRegionTrail'] = updates['multi_region']
            
            if updates.get('log_validation') is not None:
                params['EnableLogFileValidation'] = updates['log_validation']
            
            if updates.get('kms_key_id'):
                params['KmsKeyId'] = updates['kms_key_id']
            
            response = self.cloudtrail.update_trail(**params)
            
            return {
                'success': True,
                'trail_name': response['Name'],
                'trail_arn': response['TrailARN']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Event Management

### **Event Analysis**
```python
class CloudTrailEventAnalyzer:
    def __init__(self):
        self.cloudtrail = boto3.client('cloudtrail')
        self.s3 = boto3.client('s3')
    
    def lookup_events(self, lookup_attributes=None, start_time=None, end_time=None, 
                      event_type=None, max_results=50):
        """Buscar eventos en CloudTrail"""
        
        try:
            params = {'MaxResults': max_results}
            
            if lookup_attributes:
                params['LookupAttributes'] = lookup_attributes
            
            if start_time:
                params['StartTime'] = start_time
            
            if end_time:
                params['EndTime'] = end_time
            
            if event_type:
                params['EventType'] = event_type
            
            response = self.cloudtrail.lookup_events(**params)
            
            events = []
            for event in response['Events']:
                event_info = {
                    'event_id': event['EventId'],
                    'event_time': event['EventTime'],
                    'event_name': event['EventName'],
                    'username': event['Username'],
                    'source_ip_address': event.get('SourceIPAddress'),
                    'event_source': event.get('EventSource'),
                    'aws_region': event.get('AwsRegion'),
                    'user_agent': event.get('UserAgent'),
                    'resources': event.get('Resources', []),
                    'cloud_trail_event': json.loads(event['CloudTrailEvent'])
                }
                events.append(event_info)
            
            return {
                'success': True,
                'events': events,
                'next_token': response.get('NextToken'),
                'count': len(events)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_user_activity(self, username, hours=24):
        """Obtener actividad de usuario"""
        
        start_time = datetime.utcnow() - timedelta(hours=hours)
        end_time = datetime.utcnow()
        
        lookup_attributes = [
            {
                'AttributeKey': 'Username',
                'AttributeValue': username
            }
        ]
        
        return self.lookup_events(
            lookup_attributes=lookup_attributes,
            start_time=start_time,
            end_time=end_time
        )
    
    def get_ip_activity(self, ip_address, hours=24):
        """Obtener actividad por IP"""
        
        start_time = datetime.utcnow() - timedelta(hours=hours)
        end_time = datetime.utcnow()
        
        lookup_attributes = [
            {
                'AttributeKey': 'SourceIPAddress',
                'AttributeValue': ip_address
            }
        ]
        
        return self.lookup_events(
            lookup_attributes=lookup_attributes,
            start_time=start_time,
            end_time=end_time
        )
    
    def get_resource_activity(self, resource_name, hours=24):
        """Obtener actividad de recurso"""
        
        start_time = datetime.utcnow() - timedelta(hours=hours)
        end_time = datetime.utcnow()
        
        lookup_attributes = [
            {
                'AttributeKey': 'ResourceName',
                'AttributeValue': resource_name
            }
        ]
        
        return self.lookup_events(
            lookup_attributes=lookup_attributes,
            start_time=start_time,
            end_time=end_time
        )
    
    def get_security_events(self, hours=24):
        """Obtener eventos de seguridad"""
        
        start_time = datetime.utcnow() - timedelta(hours=hours)
        end_time = datetime.utcnow()
        
        security_events = []
        
        # Eventos de IAM
        iam_events = self.lookup_events(
            start_time=start_time,
            end_time=end_time,
            event_type='AwsApiCall',
            max_results=100
        )
        
        if iam_events['success']:
            security_events.extend([
                event for event in iam_events['events']
                if event['event_source'] == 'iam.amazonaws.com'
            ])
        
        # Eventos de S3
        s3_events = self.lookup_events(
            start_time=start_time,
            end_time=end_time,
            event_type='AwsApiCall',
            max_results=100
        )
        
        if s3_events['success']:
            security_events.extend([
                event for event in s3_events['events']
                if event['event_source'] == 's3.amazonaws.com'
            ])
        
        return {
            'success': True,
            'events': security_events,
            'count': len(security_events)
        }
    
    def analyze_access_patterns(self, username, days=7):
        """Analizar patrones de acceso"""
        
        start_time = datetime.utcnow() - timedelta(days=days)
        end_time = datetime.utcnow()
        
        user_events = self.get_user_activity(username, hours=days*24)
        
        if not user_events['success']:
            return user_events
        
        events = user_events['events']
        
        # Analizar patrones
        patterns = {
            'most_used_apis': {},
            'most_accessed_resources': {},
            'access_by_hour': {},
            'access_by_region': {},
            'unique_ips': set(),
            'total_events': len(events)
        }
        
        for event in events:
            # API usage
            api_name = event['event_name']
            patterns['most_used_apis'][api_name] = patterns['most_used_apis'].get(api_name, 0) + 1
            
            # Resource access
            for resource in event['resources']:
                resource_name = resource['ResourceName']
                patterns['most_accessed_resources'][resource_name] = patterns['most_accessed_resources'].get(resource_name, 0) + 1
            
            # Access by hour
            hour = event['event_time'].hour
            patterns['access_by_hour'][hour] = patterns['access_by_hour'].get(hour, 0) + 1
            
            # Access by region
            region = event.get('aws_region', 'Unknown')
            patterns['access_by_region'][region] = patterns['access_by_region'].get(region, 0) + 1
            
            # Unique IPs
            if event.get('source_ip_address'):
                patterns['unique_ips'].add(event['source_ip_address'])
        
        # Convertir sets a lists para JSON serialization
        patterns['unique_ips'] = list(patterns['unique_ips'])
        
        return {
            'success': True,
            'username': username,
            'analysis_period': f"{days} days",
            'patterns': patterns
        }
    
    def detect_anomalies(self, username, hours=24):
        """Detectar anomalías en el comportamiento"""
        
        user_events = self.get_user_activity(username, hours)
        
        if not user_events['success']:
            return user_events
        
        events = user_events['events']
        anomalies = []
        
        # Detectar acceso desde IPs inusuales
        known_ips = set()
        for event in events:
            if event.get('source_ip_address'):
                known_ips.add(event['source_ip_address'])
        
        # Si hay muchas IPs diferentes en poco tiempo
        if len(known_ips) > 5:
            anomalies.append({
                'type': 'multiple_ips',
                'description': f'Access from {len(known_ips)} different IPs',
                'ips': list(known_ips)
            })
        
        # Detectar acceso desde regiones inusuales
        regions = set()
        for event in events:
            if event.get('aws_region'):
                regions.add(event['aws_region'])
        
        if len(regions) > 3:
            anomalies.append({
                'type': 'multiple_regions',
                'description': f'Access from {len(regions)} different regions',
                'regions': list(regions)
            })
        
        # Detectar eventos de IAM críticos
        critical_iam_events = [
            'CreateUser', 'DeleteUser', 'AddUserToGroup', 'RemoveUserFromGroup',
            'CreateAccessKey', 'DeleteAccessKey', 'UpdateAssumeRolePolicy'
        ]
        
        critical_events = [
            event for event in events
            if event['event_source'] == 'iam.amazonaws.com' and event['event_name'] in critical_iam_events
        ]
        
        if critical_events:
            anomalies.append({
                'type': 'critical_iam_events',
                'description': f'{len(critical_events)} critical IAM events detected',
                'events': critical_events
            })
        
        return {
            'success': True,
            'username': username,
            'anomalies': anomalies,
            'total_events': len(events)
        }
```

## Log Processing y Analysis

### **S3 Log Processing**
```python
class CloudTrailLogProcessor:
    def __init__(self):
        self.s3 = boto3.client('s3')
        self.s3_resource = boto3.resource('s3')
    
    def list_log_files(self, bucket_name, prefix='AWSLogs/', start_date=None, end_date=None):
        """Listar archivos de log en S3"""
        
        try:
            params = {'Bucket': bucket_name, 'Prefix': prefix}
            
            response = self.s3.list_objects_v2(**params)
            
            log_files = []
            
            if 'Contents' in response:
                for obj in response['Contents']:
                    file_info = {
                        'key': obj['Key'],
                        'size': obj['Size'],
                        'last_modified': obj['LastModified']
                    }
                    
                    # Filtrar por fecha si se especifica
                    if start_date and obj['LastModified'] < start_date:
                        continue
                    if end_date and obj['LastModified'] > end_date:
                        continue
                    
                    log_files.append(file_info)
            
            return {
                'success': True,
                'log_files': log_files,
                'count': len(log_files)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def download_log_file(self, bucket_name, log_key):
        """Descargar archivo de log"""
        
        try:
            response = self.s3.get_object(Bucket=bucket_name, Key=log_key)
            
            # Descomprimir si es gzip
            import gzip
            import io
            
            if log_key.endswith('.gz'):
                with gzip.GzipFile(fileobj=io.BytesIO(response['Body'].read())) as gz_file:
                    content = gz_file.read().decode('utf-8')
            else:
                content = response['Body'].read().decode('utf-8')
            
            return {
                'success': True,
                'content': content,
                'size': len(content)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def process_log_file(self, bucket_name, log_key):
        """Procesar archivo de log"""
        
        download_result = self.download_log_file(bucket_name, log_key)
        
        if not download_result['success']:
            return download_result
        
        content = download_result['content']
        
        # Parsear eventos del log
        events = []
        lines = content.strip().split('\n')
        
        for line in lines:
            try:
                event_data = json.loads(line)
                events.append(event_data)
            except json.JSONDecodeError:
                continue
        
        return {
            'success': True,
            'log_key': log_key,
            'events': events,
            'event_count': len(events)
        }
    
    def analyze_log_files(self, bucket_name, prefix='AWSLogs/', hours=24):
        """Analizar archivos de log"""
        
        start_date = datetime.utcnow() - timedelta(hours=hours)
        
        # Listar archivos de log
        log_files_result = self.list_log_files(bucket_name, prefix, start_date)
        
        if not log_files_result['success']:
            return log_files_result
        
        analysis = {
            'total_files': 0,
            'total_events': 0,
            'users': set(),
            'ips': set(),
            'regions': set(),
            'event_sources': set(),
            'event_names': {},
            'errors': 0
        }
        
        # Procesar cada archivo
        for log_file in log_files_result['log_files']:
            analysis['total_files'] += 1
            
            process_result = self.process_log_file(bucket_name, log_file['key'])
            
            if process_result['success']:
                for event in process_result['events']:
                    analysis['total_events'] += 1
                    
                    # Extraer información del evento
                    if 'userIdentity' in event:
                        if 'userName' in event['userIdentity']:
                            analysis['users'].add(event['userIdentity']['userName'])
                        elif 'arn' in event['userIdentity']:
                            analysis['users'].add(event['userIdentity']['arn'])
                    
                    if 'sourceIPAddress' in event:
                        analysis['ips'].add(event['sourceIPAddress'])
                    
                    if 'awsRegion' in event:
                        analysis['regions'].add(event['awsRegion'])
                    
                    if 'eventSource' in event:
                        analysis['event_sources'].add(event['eventSource'])
                    
                    if 'eventName' in event:
                        event_name = event['eventName']
                        analysis['event_names'][event_name] = analysis['event_names'].get(event_name, 0) + 1
                    
                    if 'errorCode' in event:
                        analysis['errors'] += 1
            else:
                analysis['errors'] += 1
        
        # Convertir sets a lists
        analysis['users'] = list(analysis['users'])
        analysis['ips'] = list(analysis['ips'])
        analysis['regions'] = list(analysis['regions'])
        analysis['event_sources'] = list(analysis['event_sources'])
        
        return {
            'success': True,
            'bucket': bucket_name,
            'analysis_period': f"Last {hours} hours",
            'analysis': analysis
        }
    
    def setup_log_lifecycle(self, bucket_name, prefix='AWSLogs/'):
        """Configurar lifecycle policies para logs"""
        
        try:
            lifecycle_config = {
                'Rules': [
                    {
                        'ID': 'CloudTrailLogs',
                        'Status': 'Enabled',
                        'Filter': {
                            'Prefix': prefix
                        },
                        'Transitions': [
                            {
                                'Days': 30,
                                'StorageClass': 'STANDARD_IA'
                            },
                            {
                                'Days': 90,
                                'StorageClass': 'GLACIER'
                            },
                            {
                                'Days': 365,
                                'StorageClass': 'DEEP_ARCHIVE'
                            }
                        ],
                        'Expiration': {
                            'Days': 2555  # 7 years
                        }
                    }
                ]
            }
            
            self.s3.put_bucket_lifecycle_configuration(
                Bucket=bucket_name,
                LifecycleConfiguration=lifecycle_config
            )
            
            return {
                'success': True,
                'bucket': bucket_name,
                'lifecycle_configured': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Security Monitoring**
```python
class CloudTrailSecurityMonitor:
    def __init__(self):
        self.event_analyzer = CloudTrailEventAnalyzer()
        self.log_processor = CloudTrailLogProcessor()
    
    def setup_security_monitoring(self, trail_config):
        """Configurar monitoring de seguridad"""
        
        # Crear trail con eventos de seguridad
        security_trail_config = {
            'name': 'security-trail',
            's3_bucket': trail_config['s3_bucket'],
            's3_key_prefix': 'security-logs/',
            'multi_region': True,
            'include_global_events': True,
            'log_validation': True,
            'kms_key_id': trail_config.get('kms_key_id')
        }
        
        trail_manager = CloudTrailManager()
        trail_result = trail_manager.create_trail(security_trail_config)
        
        if trail_result['success']:
            # Configurar event selectors para eventos críticos
            self.setup_security_event_selectors(trail_result['trail_name'])
            
            # Configurar lifecycle policies
            self.log_processor.setup_log_lifecycle(trail_config['s3_bucket'], 'security-logs/')
        
        return trail_result
    
    def setup_security_event_selectors(self, trail_name):
        """Configurar event selectors para seguridad"""
        
        cloudtrail = boto3.client('cloudtrail')
        
        # Eventos de IAM
        iam_selectors = {
            'ReadWriteType': 'All',
            'IncludeManagementEvents': True,
            'DataResources': []
        }
        
        # Eventos de S3
        s3_selectors = {
            'ReadWriteType': 'All',
            'IncludeManagementEvents': True,
            'DataResources': [
                {
                    'Type': 'AWS::S3::Object',
                    'Values': ['arn:aws:s3:::*/*']
                }
            ]
        }
        
        cloudtrail.put_event_selectors(
            TrailName=trail_name,
            EventSelectors=[iam_selectors, s3_selectors]
        )
    
    def detect_suspicious_activity(self, hours=24):
        """Detectar actividad sospechosa"""
        
        suspicious_activities = []
        
        # Analizar eventos de IAM críticos
        security_events = self.event_analyzer.get_security_events(hours)
        
        if security_events['success']:
            for event in security_events['events']:
                # Detectar eventos de IAM inusuales
                if event['event_source'] == 'iam.amazonaws.com':
                    critical_events = ['CreateUser', 'DeleteUser', 'CreateAccessKey', 'DeleteAccessKey']
                    if event['event_name'] in critical_events:
                        suspicious_activities.append({
                            'type': 'critical_iam_event',
                            'event': event,
                            'severity': 'high'
                        })
        
        # Detectar acceso desde IPs inusuales
        users = self.get_active_users(hours)
        
        for user in users:
            anomalies = self.event_analyzer.detect_anomalies(user, hours)
            
            if anomalies['success'] and anomalies['anomalies']:
                suspicious_activities.extend([
                    {
                        'type': anomaly['type'],
                        'username': user,
                        'details': anomaly,
                        'severity': 'medium'
                    }
                    for anomaly in anomalies['anomalies']
                ])
        
        return {
            'success': True,
            'suspicious_activities': suspicious_activities,
            'count': len(suspicious_activities)
        }
    
    def get_active_users(self, hours=24):
        """Obtener usuarios activos"""
        
        # Obtener todos los eventos del período
        start_time = datetime.utcnow() - timedelta(hours=hours)
        end_time = datetime.utcnow()
        
        events_result = self.event_analyzer.lookup_events(
            start_time=start_time,
            end_time=end_time,
            max_results=1000
        )
        
        if not events_result['success']:
            return []
        
        users = set()
        for event in events_result['events']:
            if event['username'] and event['username'] not in ['root', 'AWSInternalChange']:
                users.add(event['username'])
        
        return list(users)
    
    def generate_security_report(self, hours=24):
        """Generar reporte de seguridad"""
        
        suspicious_activity = self.detect_suspicious_activity(hours)
        
        # Analizar logs completos
        log_analysis = self.log_processor.analyze_log_files(
            'my-cloudtrail-bucket',
            'security-logs/',
            hours
        )
        
        report = {
            'report_period': f"Last {hours} hours",
            'suspicious_activities': suspicious_activity.get('suspicious_activities', []),
            'log_analysis': log_analysis.get('analysis', {}),
            'recommendations': []
        }
        
        # Generar recomendaciones
        if suspicious_activity.get('count', 0) > 0:
            report['recommendations'].append('Review suspicious IAM activities immediately')
        
        if log_analysis.get('analysis', {}).get('errors', 0) > 0:
            report['recommendations'].append('Check for failed API calls indicating potential issues')
        
        return report
```

### **2. Compliance Auditing**
```python
class CloudTrailComplianceAuditor:
    def __init__(self):
        self.event_analyzer = CloudTrailEventAnalyzer()
        self.trail_manager = CloudTrailManager()
    
    def audit_trail_compliance(self, compliance_requirements):
        """Auditar compliance de trails"""
        
        audit_results = {
            'trails_status': [],
            'compliance_score': 0,
            'violations': [],
            'recommendations': []
        }
        
        # Obtener todos los trails
        trails_result = self.trail_manager.list_trails()
        
        if trails_result['success']:
            for trail in trails_result['trails']:
                trail_compliance = self.audit_single_trail(trail, compliance_requirements)
                audit_results['trails_status'].append(trail_compliance)
                
                if not trail_compliance['compliant']:
                    audit_results['violations'].extend(trail_compliance['violations'])
        
        # Calcular score de compliance
        total_checks = len(audit_results['trails_status']) * len(compliance_requirements)
        passed_checks = total_checks - len(audit_results['violations'])
        
        if total_checks > 0:
            audit_results['compliance_score'] = (passed_checks / total_checks) * 100
        
        return audit_results
    
    def audit_single_trail(self, trail, requirements):
        """Auditar trail individual"""
        
        trail_compliance = {
            'trail_name': trail['name'],
            'compliant': True,
            'violations': [],
            'status': 'unknown'
        }
        
        # Verificar si el trail está activo
        if trail.get('name'):
            status_result = self.trail_manager.get_trail_status(trail['name'])
            
            if status_result['success']:
                trail_compliance['status'] = 'active' if status_result['is_logging'] else 'inactive'
                
                if not status_result['is_logging'] and requirements.get('logging_required', True):
                    trail_compliance['violations'].append('Trail is not logging')
                    trail_compliance['compliant'] = False
        
        # Verificar multi-region requirement
        if requirements.get('multi_region_required', True) and not trail.get('multi_region', False):
            trail_compliance['violations'].append('Multi-region logging not enabled')
            trail_compliance['compliant'] = False
        
        # Verificar global events requirement
        if requirements.get('global_events_required', True) and not trail.get('include_global_events', False):
            trail_compliance['violations'].append('Global service events not included')
            trail_compliance['compliant'] = False
        
        # Verificar log validation requirement
        if requirements.get('log_validation_required', True):
            # Esta verificación requeriría más detalles del trail
            pass
        
        return trail_compliance
    
    def audit_user_activity(self, username, days=30):
        """Auditar actividad de usuario"""
        
        audit_result = {
            'username': username,
            'audit_period': f"{days} days",
            'activity_summary': {},
            'compliance_issues': [],
            'recommendations': []
        }
        
        # Analizar patrones de acceso
        patterns_result = self.event_analyzer.analyze_access_patterns(username, days)
        
        if patterns_result['success']:
            audit_result['activity_summary'] = patterns_result['patterns']
            
            # Verificar compliance issues
            patterns = patterns_result['patterns']
            
            # Demasiadas IPs diferentes
            if len(patterns['unique_ips']) > 10:
                audit_result['compliance_issues'].append(
                    f"Access from {len(patterns['unique_ips'])} different IPs"
                )
            
            # Demasiadas regiones
            if len(patterns['access_by_region']) > 5:
                audit_result['compliance_issues'].append(
                    f"Access from {len(patterns['access_by_region'])} different regions"
                )
            
            # Actividad fuera de horas de trabajo
            night_hours = [h for h in range(22, 24)] + [h for h in range(0, 6)]
            night_activity = sum(patterns['access_by_hour'].get(h, 0) for h in night_hours)
            total_activity = sum(patterns['access_by_hour'].values())
            
            if total_activity > 0 and (night_activity / total_activity) > 0.3:
                audit_result['compliance_issues'].append('Significant activity during off-hours')
        
        return audit_result
```

## Integration con otros servicios

### **CloudWatch Integration**
```python
class CloudTrailCloudWatchIntegration:
    def __init__(self):
        self.cloudtrail = boto3.client('cloudtrail')
        self.cloudwatch = boto3.client('cloudwatch')
        self.logs = boto3.client('logs')
    
    def setup_cloudtrail_metrics(self, trail_name):
        """Configurar métricas de CloudTrail en CloudWatch"""
        
        try:
            # Crear métrica personalizada para eventos de seguridad
            self.cloudwatch.put_metric_data(
                Namespace='CloudTrail/Security',
                MetricData=[
                    {
                        'MetricName': 'SecurityEvents',
                        'Value': 0,
                        'Unit': 'Count',
                        'Timestamp': datetime.utcnow()
                    }
                ]
            )
            
            # Crear alarm para eventos de IAM críticos
            self.cloudwatch.put_metric_alarm(
                AlarmName=f'CloudTrail-IAM-Events-{trail_name}',
                AlarmDescription='Alarm for critical IAM events',
                MetricName='SecurityEvents',
                Namespace='CloudTrail/Security',
                Statistic='Sum',
                Period=300,
                EvaluationPeriods=1,
                Threshold=1,
                ComparisonOperator='GreaterThanThreshold',
                AlarmActions=[
                    'arn:aws:sns:us-east-1:123456789012:security-alerts'
                ]
            )
            
            return {
                'success': True,
                'trail_name': trail_name,
                'metrics_configured': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def setup_cloudtrail_logs(self, trail_name, log_group_name):
        """Configurar delivery de logs a CloudWatch Logs"""
        
        try:
            # Crear log group
            self.logs.create_log_group(
                logGroupName=log_group_name,
                retentionInDays=30
            )
            
            # Configurar trail para enviar logs a CloudWatch Logs
            self.cloudtrail.update_trail(
                Name=trail_name,
                CloudWatchLogsLogGroupArn=f'arn:aws:logs:us-east-1:123456789012:log-group:{log_group_name}'
            )
            
            return {
                'success': True,
                'trail_name': trail_name,
                'log_group_name': log_group_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Security y Best Practices

### **Security Configuration**
```python
class CloudTrailSecurityConfig:
    def __init__(self):
        self.cloudtrail = boto3.client('cloudtrail')
        self.kms = boto3.client('kms')
    
    def create_encrypted_trail(self, trail_config):
        """Crear trail con encriptación"""
        
        # Crear KMS key para encriptación
        key_response = self.kms.create_key(
            Description='CloudTrail encryption key',
            Usage='ENCRYPT_DECRYPT'
        )
        
        key_id = key_response['KeyMetadata']['KeyId']
        
        # Configurar key policy
        key_policy = {
            'Version': '2012-10-17',
            'Statement': [
                {
                    'Effect': 'Allow',
                    'Principal': {
                        'AWS': 'arn:aws:iam::123456789012:root'
                    },
                    'Action': 'kms:*',
                    'Resource': '*'
                },
                {
                    'Effect': 'Allow',
                    'Principal': {
                        'Service': 'cloudtrail.amazonaws.com'
                    },
                    'Action': [
                        'kms:Encrypt',
                        'kms:Decrypt',
                        'kms:ReEncrypt*',
                        'kms:GenerateDataKey*',
                        'kms:DescribeKey'
                    ],
                    'Resource': '*'
                }
            ]
        }
        
        self.kms.put_key_policy(
            KeyId=key_id,
            PolicyName='default',
            Policy=json.dumps(key_policy)
        )
        
        # Crear trail con KMS key
        trail_config['kms_key_id'] = key_id
        
        trail_manager = CloudTrailManager()
        return trail_manager.create_trail(trail_config)
    
    def setup_vpc_endpoint_logging(self, trail_name):
        """Configurar logging para VPC endpoints"""
        
        try:
            # Configurar event selectors para eventos de VPC
            event_selectors = {
                'ReadWriteType': 'All',
                'IncludeManagementEvents': True,
                'DataResources': []
            }
            
            self.cloudtrail.put_event_selectors(
                TrailName=trail_name,
                EventSelectors=[event_selectors]
            )
            
            return {
                'success': True,
                'trail_name': trail_name,
                'vpc_logging_enabled': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Cost Management

### **Cost Optimization**
```python
def calculate_cloudtrail_costs(trails_count, s3_storage_gb, data_events_enabled=True):
    """Calcular costos de CloudTrail"""
    
    # CloudTrail es gratuito para el primer trail
    # Trails adicionales tienen un costo
    additional_trails = max(0, trails_count - 1)
    trails_cost = additional_trails * 2.00  # $2.00 por trail adicional
    
    # S3 storage cost
    s3_cost = s3_storage_gb * 0.023  # Standard storage rate
    
    # Data events cost (si están habilitados)
    data_events_cost = 0
    if data_events_enabled:
        # $0.10 por 100,000 data events
        # Asumiendo 1M de eventos por mes
        data_events_cost = (1000000 / 100000) * 0.10
    
    total_cost = trails_cost + s3_cost + data_events_cost
    
    return {
        'trails_cost': trails_cost,
        's3_storage_cost': s3_cost,
        'data_events_cost': data_events_cost,
        'total_monthly_cost': total_cost
    }
```

## Conclusion

AWS CloudTrail es fundamental para la seguridad, compliance y governance en AWS, proporcionando una auditoría completa de todas las acciones en la cuenta. Es esencial para detectar actividades sospechosas, cumplir con regulaciones, investigar incidentes de seguridad y mantener visibilidad completa sobre el uso de los recursos de AWS. Su integración con otros servicios de AWS lo convierte en una herramienta central en cualquier estrategia de seguridad y compliance.

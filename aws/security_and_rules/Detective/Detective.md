# Amazon Detective

## Definición

Amazon Detective es un servicio de AWS que facilita el análisis de la causa raíz de problemas de seguridad. Recopila automáticamente datos de registro de múltiples fuentes de AWS, procesa y correlaciona estos datos para crear un grafo de relación que permite a los analistas de seguridad investigar rápidamente las causas fundamentales de los hallazgos de seguridad.

## Características Principales

### **Análisis de Causa Raíz**
- **Grafo de relación**: Mapeo automático de relaciones entre recursos
- **Línea de tiempo**: Visualización cronológica de eventos
- **Contexto completo**: Información contextual completa de incidentes
- **Correlación automática**: Relación automática de eventos relacionados
- **Investigación guiada**: Flujos de trabajo guiados para investigación

### **Recopilación Automática de Datos**
- **Logs centralizados**: Recopilación automática de logs de múltiples fuentes
- **Metadatos enriquecidos**: Enriquecimiento de datos con metadatos
- **Retención configurable**: Período de retención ajustable
- **Datos históricos**: Acceso a datos históricos para análisis
- **Actualización continua**: Actualización continua de datos

### **Visualización e Investigación**
- **Dashboard interactivo**: Interfaz visual interactiva
- **Filtros avanzados**: Filtros complejos para análisis
- **Búsqueda de entidades**: Búsqueda rápida de entidades específicas
- **Análisis de comportamiento**: Análisis de patrones de comportamiento
- **Exportación de datos**: Exportación de datos para análisis externo

### **Integración Nativa**
- **AWS GuardDuty**: Integración profunda con GuardDuty
- **AWS Security Hub**: Centralización de hallazgos
- **AWS CloudTrail**: Logs de auditoría y eventos
- **AWS VPC Flow Logs**: Logs de tráfico de red
- **Third-party SIEMs**: Integración con herramientas externas

## Tipos de Datos Recopilados

### **1. Datos de Autenticación**
- **IAM Events**: Eventos de autenticación IAM
- **Login Events**: Eventos de inicio de sesión
- **Console Access**: Acceso a la consola de AWS
- **API Access**: Acceso a APIs de AWS
- **MFA Events**: Eventos de autenticación multifactor

### **2. Datos de Red**
- **VPC Flow Logs**: Logs de flujo de VPC
- **Network Traffic**: Tráfico de red
- **IP Addresses**: Direcciones IP y geolocalización
- **Port Activity**: Actividad de puertos
- **DNS Queries**: Consultas DNS

### **3. Datos de Recursos**
- **EC2 Instances**: Actividad de instancias EC2
- **S3 Buckets**: Acceso a buckets S3
- **IAM Roles and Users**: Actividad de roles y usuarios
- **Security Groups**: Configuración de grupos de seguridad
- **Lambda Functions**: Ejecución de funciones Lambda

### **4. Datos de Aplicaciones**
- **API Calls**: Llamadas a APIs
- **Service Events**: Eventos de servicios
- **Resource Changes**: Cambios en recursos
- **Access Patterns**: Patrones de acceso
- **Behavioral Data**: Datos de comportamiento

## Arquitectura de Amazon Detective

### **Componentes Principales**
```
Amazon Detective Architecture
├── Data Collection Layer
│   ├── CloudTrail Logs
│   ├── VPC Flow Logs
│   ├── DNS Logs
│   ├── IAM Events
│   └── Service Logs
├── Data Processing Engine
│   ├── Log Ingestion
│   ├── Data Normalization
│   ├── Entity Resolution
│   ├── Relationship Mapping
│   └── Graph Construction
├── Analysis Engine
│   ├── Graph Analytics
│   ├── Pattern Recognition
│   ├── Anomaly Detection
│   ├── Timeline Generation
│   └── Context Enrichment
├── Investigation Interface
│   ├── Interactive Dashboard
│   ├── Entity Search
│   ├── Timeline View
│   ├── Relationship Graph
│   └── Filter System
└── Integration Layer
    ├── GuardDuty Integration
    ├── Security Hub Integration
    ├── API Access
    ├── Data Export
    └── Third-party Tools
```

### **Flujo de Análisis**
```
Data Sources → Collection → Processing → Graph Building → Analysis → Investigation → Action
```

## Configuración de Amazon Detective

### **Gestión Completa de Amazon Detective**
```python
import boto3
import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class DetectiveManager:
    def __init__(self, region='us-east-1'):
        self.detective = boto3.client('detective', region_name=region)
        self.guardduty = boto3.client('guardduty', region_name=region)
        self.securityhub = boto3.client('securityhub', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.region = region
    
    def enable_detective(self, tags=None):
        """Habilitar Amazon Detective"""
        
        try:
            response = self.detective.enable_graph(
                Tags=tags or []
            )
            
            return {
                'success': True,
                'graph_arn': response['GraphArn'],
                'status': 'CREATING'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def disable_detective(self):
        """Deshabilitar Amazon Detective"""
        
        try:
            response = self.detective.disable_graph()
            
            return {
                'success': True,
                'status': 'DISABLED'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_graph_status(self):
        """Obtener estado del grafo de Detective"""
        
        try:
            response = self.detective.describe_graph()
            
            graph_info = {
                'arn': response['Graph']['Arn'],
                'created_time': response['Graph']['CreatedTime'].isoformat() if response['Graph'].get('CreatedTime') else '',
                'status': response['Graph']['Status'],
                'volume_usage_in_bytes': response['Graph'].get('VolumeUsageInBytes', 0),
                'volume_size_in_bytes': response['Graph'].get('VolumeSizeInBytes', 0)
            }
            
            return {
                'success': True,
                'graph_info': graph_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_member_account(self, account_id, email, display_name=None,
                             message=None, tags=None):
        """Crear cuenta miembro"""
        
        try:
            member_config = {
                'AccountId': account_id,
                'Email': email
            }
            
            if display_name:
                member_config['DisplayName'] = display_name
            
            if message:
                member_config['Message'] = message
            
            response = self.detective.create_members(
                GraphArn=self._get_graph_arn(),
                MemberDetails=[member_config]
            )
            
            return {
                'success': True,
                'account_id': account_id,
                'member_arn': response.get('Members', [{}])[0].get('MemberArn', ''),
                'status': 'INVITED'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_graph_arn(self):
        """Obtener ARN del grafo"""
        
        try:
            response = self.detective.describe_graph()
            return response['Graph']['Arn']
        except Exception:
            return f'arn:aws:detective:{self.region}:123456789012:graph:default'
    
    def list_member_accounts(self, max_results=100, next_token=None):
        """Listar cuentas miembro"""
        
        try:
            params = {
                'GraphArn': self._get_graph_arn(),
                'MaxResults': max_results
            }
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.detective.list_members(**params)
            
            members = []
            for member in response.get('Members', []):
                member_info = {
                    'account_id': member.get('AccountId', ''),
                    'email': member.get('Email', ''),
                    'graph_arn': member.get('GraphArn', ''),
                    'master_id': member.get('MasterId', ''),
                    'status': member.get('Status', ''),
                    'disabled_reason': member.get('DisabledReason', ''),
                    'invited_time': member.get('InvitedTime', '').isoformat() if member.get('InvitedTime') else '',
                    'updated_time': member.get('UpdatedTime', '').isoformat() if member.get('UpdatedTime') else ''
                }
                members.append(member_info)
            
            return {
                'success': True,
                'members': members,
                'count': len(members),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_member_account(self, account_id):
        """Eliminar cuenta miembro"""
        
        try:
            response = self.detective.delete_members(
                GraphArn=self._get_graph_arn(),
                AccountIds=[account_id]
            )
            
            return {
                'success': True,
                'account_id': account_id,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_investigation_entity(self, entity_type, entity_id):
        """Obtener entidad de investigación"""
        
        try:
            response = self.detective.get_investigation(
                GraphArn=self._get_graph_arn(),
                InvestigationId=self._create_investigation_id(entity_type, entity_id)
            )
            
            investigation = response['Investigation']
            
            investigation_info = {
                'arn': investigation.get('Arn', ''),
                'entity_id': investigation.get('EntityId', ''),
                'entity_type': investigation.get('EntityType', ''),
                'status': investigation.get('Status', ''),
                'created_time': investigation.get('CreatedTime', '').isoformat() if investigation.get('CreatedTime') else '',
                'started_time': investigation.get('StartedTime', '').isoformat() if investigation.get('StartedTime') else '',
                'end_time': investigation.get('EndTime', '').isoformat() if investigation.get('EndTime') else '',
                'scope_start_time': investigation.get('ScopeStartTime', '').isoformat() if investigation.get('ScopeStartTime') else '',
                'scope_end_time': investigation.get('ScopeEndTime', '').isoformat() if investigation.get('ScopeEndTime') else ''
            }
            
            return {
                'success': True,
                'investigation_info': investigation_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _create_investigation_id(self, entity_type, entity_id):
        """Crear ID de investigación"""
        
        # Simulación de ID de investigación
        return f'investigation-{entity_type}-{entity_id}-{int(time.time())}'
    
    def list_investigations(self, max_results=100, next_token=None):
        """Listar investigaciones"""
        
        try:
            params = {
                'GraphArn': self._get_graph_arn(),
                'MaxResults': max_results
            }
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.detective.list_investigations(**params)
            
            investigations = []
            for investigation in response.get('InvestigationSummaries', []):
                investigation_info = {
                    'arn': investigation.get('Arn', ''),
                    'entity_id': investigation.get('EntityId', ''),
                    'entity_type': investigation.get('EntityType', ''),
                    'status': investigation.get('Status', ''),
                    'created_time': investigation.get('CreatedTime', '').isoformat() if investigation.get('CreatedTime') else '',
                    'started_time': investigation.get('StartedTime', '').isoformat() if investigation.get('StartedTime') else '',
                    'end_time': investigation.get('EndTime', '').isoformat() if investigation.get('EndTime') else ''
                }
                investigations.append(investigation_info)
            
            return {
                'success': True,
                'investigations': investigations,
                'count': len(investigations),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_entity_data(self, entity_type, entity_id, start_time=None, end_time=None):
        """Obtener datos de entidad"""
        
        try:
            params = {
                'GraphArn': self._get_graph_arn(),
                'EntityType': entity_type,
                'EntityId': entity_id
            }
            
            if start_time:
                params['StartTime'] = start_time
            
            if end_time:
                params['EndTime'] = end_time
            
            response = self.detective.get_entity_data(**params)
            
            entity_data = {
                'entity': response.get('Entity', {}),
                'data_sources': response.get('DataSources', {}),
                'total_count': response.get('TotalCount', 0)
            }
            
            return {
                'success': True,
                'entity_data': entity_data
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_data_sources(self, max_results=100, next_token=None):
        """Listar fuentes de datos"""
        
        try:
            params = {
                'GraphArn': self._get_graph_arn(),
                'MaxResults': max_results
            }
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.detective.list_data_sources(**params)
            
            data_sources = []
            for data_source in response.get('DataSources', []):
                source_info = {
                    'account_id': data_source.get('AccountId', ''),
                    'data_source_type': data_source.get('DataSourceType', ''),
                    'status': data_source.get('Status', ''),
                    'collection_time': data_source.get('CollectionTime', '').isoformat() if data_source.get('CollectionTime') else '',
                    'start_time': data_source.get('StartTime', '').isoformat() if data_source.get('StartTime') else '',
                    'end_time': data_source.get('EndTime', '').isoformat() if data_source.get('EndTime') else ''
                }
                data_sources.append(source_info)
            
            return {
                'success': True,
                'data_sources': data_sources,
                'count': len(data_sources),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def start_investigation(self, entity_type, entity_id, scope_start_time=None,
                          scope_end_time=None):
        """Iniciar investigación"""
        
        try:
            params = {
                'GraphArn': self._get_graph_arn(),
                'EntityType': entity_type,
                'EntityId': entity_id
            }
            
            if scope_start_time:
                params['ScopeStartTime'] = scope_start_time
            
            if scope_end_time:
                params['ScopeEndTime'] = scope_end_time
            
            response = self.detective.start_investigation(**params)
            
            return {
                'success': True,
                'investigation_arn': response['InvestigationArn'],
                'entity_type': entity_type,
                'entity_id': entity_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def stop_investigation(self, investigation_arn):
        """Detener investigación"""
        
        try:
            response = self.detective.stop_investigation(
                GraphArn=self._get_graph_arn(),
                InvestigationArn=investigation_arn
            )
            
            return {
                'success': True,
                'investigation_arn': investigation_arn,
                'stopped': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_graph_summary(self):
        """Obtener resumen del grafo"""
        
        try:
            response = self.detective.describe_graph()
            
            graph = response['Graph']
            
            summary = {
                'arn': graph['Arn'],
                'status': graph['Status'],
                'created_time': graph.get('CreatedTime', '').isoformat() if graph.get('CreatedTime') else '',
                'volume_usage': {
                    'used_bytes': graph.get('VolumeUsageInBytes', 0),
                    'total_bytes': graph.get('VolumeSizeInBytes', 0),
                    'usage_percentage': round((graph.get('VolumeUsageInBytes', 0) / max(graph.get('VolumeSizeInBytes', 1), 1)) * 100, 2)
                },
                'data_sources_count': self._get_data_sources_count(),
                'members_count': self._get_members_count()
            }
            
            return {
                'success': True,
                'graph_summary': summary
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_data_sources_count(self):
        """Obtener conteo de fuentes de datos"""
        
        try:
            response = self.detective.list_data_sources(
                GraphArn=self._get_graph_arn(),
                MaxResults=1000
            )
            return len(response.get('DataSources', []))
        except Exception:
            return 0
    
    def _get_members_count(self):
        """Obtener conteo de miembros"""
        
        try:
            response = self.detective.list_members(
                GraphArn=self._get_graph_arn(),
                MaxResults=1000
            )
            return len(response.get('Members', []))
        except Exception:
            return 0
    
    def get_entity_relationships(self, entity_type, entity_id):
        """Obtener relaciones de entidad"""
        
        try:
            # Esta función simularía la obtención de relaciones
            # En realidad, esto requeriría llamadas a la API de Detective
            relationships = {
                'entity': {
                    'type': entity_type,
                    'id': entity_id
                },
                'related_entities': [],
                'relationship_types': {},
                'timeline_events': []
            }
            
            # Simular relaciones basadas en el tipo de entidad
            if entity_type == 'INSTANCE':
                relationships['related_entities'] = [
                    {'type': 'SECURITY_GROUP', 'id': 'sg-1234567890abcdef0'},
                    {'type': 'IAM_ROLE', 'id': 'arn:aws:iam::123456789012:role/EC2InstanceRole'},
                    {'type': 'VPC', 'id': 'vpc-1234567890abcdef0'}
                ]
                relationships['relationship_types'] = {
                    'SECURITY_GROUP': 'PROTECTS',
                    'IAM_ROLE': 'USES',
                    'VPC': 'LOCATED_IN'
                }
            
            elif entity_type == 'USER':
                relationships['related_entities'] = [
                    {'type': 'IAM_POLICY', 'id': 'arn:aws:iam::123456789012:policy/UserPolicy'},
                    {'type': 'INSTANCE', 'id': 'i-1234567890abcdef0'},
                    {'type': 'ROLE', 'id': 'arn:aws:iam::123456789012:role/UserRole'}
                ]
                relationships['relationship_types'] = {
                    'IAM_POLICY': 'HAS_PERMISSIONS',
                    'INSTANCE': 'ACCESSES',
                    'ROLE': 'ASSUMES'
                }
            
            return {
                'success': True,
                'relationships': relationships
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_timeline_events(self, entity_type, entity_id, start_time, end_time):
        """Obtener eventos de línea de tiempo"""
        
        try:
            # Simular eventos de línea de tiempo
            events = []
            
            # Generar eventos de ejemplo basados en el tipo de entidad
            if entity_type == 'INSTANCE':
                events = [
                    {
                        'timestamp': start_time,
                        'event_type': 'INSTANCE_LAUNCH',
                        'description': 'Instance launched',
                        'source': 'EC2',
                        'severity': 'INFO'
                    },
                    {
                        'timestamp': start_time + timedelta(hours=1),
                        'event_type': 'API_CALL',
                        'description': 'SSH access attempted',
                        'source': 'CloudTrail',
                        'severity': 'WARNING'
                    },
                    {
                        'timestamp': start_time + timedelta(hours=2),
                        'event_type': 'NETWORK_TRAFFIC',
                        'description': 'Unusual network traffic detected',
                        'source': 'VPC Flow Logs',
                        'severity': 'HIGH'
                    }
                ]
            
            elif entity_type == 'USER':
                events = [
                    {
                        'timestamp': start_time,
                        'event_type': 'LOGIN',
                        'description': 'User logged in',
                        'source': 'CloudTrail',
                        'severity': 'INFO'
                    },
                    {
                        'timestamp': start_time + timedelta(minutes=30),
                        'event_type': 'API_CALL',
                        'description': 'Sensitive API call made',
                        'source': 'CloudTrail',
                        'severity': 'WARNING'
                    },
                    {
                        'timestamp': start_time + timedelta(hours=1),
                        'event_type': 'PRIVILEGE_ESCALATION',
                        'description': 'Privilege escalation attempt',
                        'source': 'IAM',
                        'severity': 'HIGH'
                    }
                ]
            
            return {
                'success': True,
                'events': events,
                'count': len(events),
                'time_range': {
                    'start_time': start_time.isoformat(),
                    'end_time': end_time.isoformat()
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def integrate_with_guardduty(self, detector_id):
        """Integrar con GuardDuty"""
        
        try:
            # Obtener hallazgos de GuardDuty
            findings_response = self.guardduty.get_findings(
                DetectorId=detector_id,
                MaxResults=100
            )
            
            if not findings_response['success']:
                return findings_response
            
            findings = findings_response['findings']
            
            # Procesar hallazgos para Detective
            processed_findings = []
            for finding in findings:
                detective_finding = self._convert_guardduty_finding_to_detective(finding)
                processed_findings.append(detective_finding)
            
            return {
                'success': True,
                'processed_findings': processed_findings,
                'total_findings': len(processed_findings),
                'detector_id': detector_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _convert_guardduty_finding_to_detective(self, guardduty_finding):
        """Convertir hallazgo de GuardDuty a formato Detective"""
        
        try:
            detective_finding = {
                'entity_type': 'INSTANCE',
                'entity_id': guardduty_finding.get('resource', {}).get('instanceId', ''),
                'finding_type': guardduty_finding.get('type', ''),
                'severity': guardduty_finding.get('severity', ''),
                'title': guardduty_finding.get('title', ''),
                'description': guardduty_finding.get('description', ''),
                'created_at': guardduty_finding.get('createdAt', ''),
                'source_service': 'GuardDuty',
                'confidence': guardduty_finding.get('confidence', 0)
            }
            
            return detective_finding
            
        except Exception:
            return {}
    
    def generate_detective_report(self, report_type='investigation', entity_type=None,
                                entity_id=None, time_range_days=7):
        """Generar reporte de Detective"""
        
        try:
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(days=time_range_days)
            
            report = {
                'report_metadata': {
                    'report_type': report_type,
                    'generated_at': end_time.isoformat(),
                    'time_range': {
                        'start_time': start_time.isoformat(),
                        'end_time': end_time.isoformat()
                    }
                }
            }
            
            if report_type == 'investigation' and entity_type and entity_id:
                # Reporte de investigación específica
                relationships_response = self.get_entity_relationships(entity_type, entity_id)
                events_response = self.get_timeline_events(entity_type, entity_id, start_time, end_time)
                
                if relationships_response['success']:
                    report['entity_relationships'] = relationships_response['relationships']
                
                if events_response['success']:
                    report['timeline_events'] = events_response['events']
                    report['event_analysis'] = self._analyze_timeline_events(events_response['events'])
            
            elif report_type == 'summary':
                # Reporte de resumen general
                summary_response = self.get_graph_summary()
                if summary_response['success']:
                    report['graph_summary'] = summary_response['graph_summary']
                
                # Obtener estadísticas de investigaciones
                investigations_response = self.list_investigations(max_results=1000)
                if investigations_response['success']:
                    report['investigation_summary'] = self._analyze_investigations(investigations_response['investigations'])
            
            elif report_type == 'security':
                # Reporte de seguridad
                report['security_analysis'] = self._analyze_security_trends(start_time, end_time)
                report['threat_intelligence'] = self._get_threat_intelligence_summary()
                report['recommendations'] = self._generate_security_recommendations()
            
            return {
                'success': True,
                'detective_report': report
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _analyze_timeline_events(self, events):
        """Analizar eventos de línea de tiempo"""
        
        analysis = {
            'total_events': len(events),
            'by_severity': {},
            'by_source': {},
            'by_type': {},
            'critical_events': [],
            'timeline_pattern': {}
        }
        
        for event in events:
            # Agrupar por severidad
            severity = event.get('severity', 'INFO')
            if severity not in analysis['by_severity']:
                analysis['by_severity'][severity] = 0
            analysis['by_severity'][severity] += 1
            
            # Agrupar por fuente
            source = event.get('source', 'Unknown')
            if source not in analysis['by_source']:
                analysis['by_source'][source] = 0
            analysis['by_source'][source] += 1
            
            # Agrupar por tipo
            event_type = event.get('event_type', 'Unknown')
            if event_type not in analysis['by_type']:
                analysis['by_type'][event_type] = 0
            analysis['by_type'][event_type] += 1
            
            # Eventos críticos
            if severity in ['HIGH', 'CRITICAL']:
                analysis['critical_events'].append({
                    'timestamp': event.get('timestamp', ''),
                    'event_type': event_type,
                    'description': event.get('description', ''),
                    'source': source
                })
        
        return analysis
    
    def _analyze_investigations(self, investigations):
        """Analizar investigaciones"""
        
        analysis = {
            'total_investigations': len(investigations),
            'by_status': {},
            'by_entity_type': {},
            'average_duration': 0,
            'recent_investigations': []
        }
        
        total_duration = 0
        current_time = datetime.utcnow()
        recent_threshold = current_time - timedelta(days=7)
        
        for investigation in investigations:
            # Agrupar por estado
            status = investigation.get('status', 'UNKNOWN')
            if status not in analysis['by_status']:
                analysis['by_status'][status] = 0
            analysis['by_status'][status] += 1
            
            # Agrupar por tipo de entidad
            entity_type = investigation.get('entity_type', 'UNKNOWN')
            if entity_type not in analysis['by_entity_type']:
                analysis['by_entity_type'][entity_type] = 0
            analysis['by_entity_type'][entity_type] += 1
            
            # Calcular duración
            started_time = investigation.get('started_time', '')
            end_time = investigation.get('end_time', '')
            
            if started_time and end_time:
                try:
                    start = datetime.fromisoformat(started_time.replace('Z', '+00:00'))
                    end = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                    duration = (end - start).total_seconds()
                    total_duration += duration
                except Exception:
                    pass
            
            # Investigaciones recientes
            created_time = investigation.get('created_time', '')
            if created_time:
                try:
                    created = datetime.fromisoformat(created_time.replace('Z', '+00:00'))
                    if created >= recent_threshold:
                        analysis['recent_investigations'].append({
                            'arn': investigation.get('arn', ''),
                            'entity_type': entity_type,
                            'status': status,
                            'created_time': created_time
                        })
                except Exception:
                    pass
        
        # Calcular duración promedio
        if len(investigations) > 0:
            analysis['average_duration'] = total_duration / len(investigations)
        
        return analysis
    
    def _analyze_security_trends(self, start_time, end_time):
        """Analizar tendencias de seguridad"""
        
        # Simulación de análisis de tendencias
        trends = {
            'threat_patterns': {
                'credential_compromise': 3,
                'privilege_escalation': 2,
                'data_exfiltration': 1,
                'unusual_access': 4
            },
            'risk_indicators': {
                'high_risk_ips': 12,
                'suspicious_users': 5,
                'compromised_instances': 2,
                'unusual_api_calls': 8
            },
            'timeline_analysis': {
                'peak_activity_hours': ['14:00-16:00', '22:00-00:00'],
                'most_active_days': ['Monday', 'Wednesday', 'Friday'],
                'trend_direction': 'STABLE',
                'anomaly_count': 7
            }
        }
        
        return trends
    
    def _get_threat_intelligence_summary(self):
        """Obtener resumen de inteligencia de amenazas"""
        
        # Simulación de inteligencia de amenazas
        intelligence = {
            'known_threat_actors': 3,
            'malware_families': 5,
            'attack_patterns': 8,
            'indicators_of_compromise': 12,
            'threat_feeds_updated': True,
            'last_update': datetime.utcnow().isoformat()
        }
        
        return intelligence
    
    def _generate_security_recommendations(self):
        """Generar recomendaciones de seguridad"""
        
        recommendations = [
            {
                'priority': 'HIGH',
                'category': 'ACCESS_CONTROL',
                'title': 'Review IAM permissions',
                'description': 'Review and tighten IAM permissions for all users',
                'action': 'Conduct IAM permissions audit'
            },
            {
                'priority': 'MEDIUM',
                'category': 'MONITORING',
                'title': 'Enhance monitoring',
                'description': 'Increase monitoring of critical resources',
                'action': 'Configure additional CloudWatch alarms'
            },
            {
                'priority': 'HIGH',
                'category': 'INCIDENT_RESPONSE',
                'title': 'Update incident response plan',
                'description': 'Review and update incident response procedures',
                'action': 'Conduct incident response drill'
            }
        ]
        
        return recommendations
    
    def setup_detective_monitoring(self, sns_topic_arn=None):
        """Configurar monitoreo de Detective"""
        
        try:
            monitoring_setup = {
                'sns_topic_arn': None,
                'data_source_monitoring': {},
                'investigation_alerts': {},
                'integration_status': {}
            }
            
            # Crear o usar SNS topic
            if sns_topic_arn:
                monitoring_setup['sns_topic_arn'] = sns_topic_arn
            else:
                # Simular creación de SNS topic
                monitoring_setup['sns_topic_arn'] = f'arn:aws:sns:{self.region}:123456789012:detective-alerts'
            
            # Configurar monitoreo de fuentes de datos
            monitoring_setup['data_source_monitoring'] = {
                'cloudtrail_enabled': True,
                'vpc_flow_logs_enabled': True,
                'dns_logs_enabled': True,
                'monitoring_frequency': 'HOURLY'
            }
            
            # Configurar alertas de investigación
            monitoring_setup['investigation_alerts'] = {
                'high_severity_alerts': True,
                'unusual_activity_alerts': True,
                'compromise_indicators': True,
                'alert_threshold': 'MEDIUM'
            }
            
            # Verificar estado de integración
            monitoring_setup['integration_status'] = {
                'guardduty_integration': self._check_guardduty_integration(),
                'security_hub_integration': self._check_security_hub_integration(),
                'cloudtrail_integration': True,
                'vpc_flow_logs_integration': True
            }
            
            return {
                'success': True,
                'monitoring_setup': monitoring_setup
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _check_guardduty_integration(self):
        """Verificar integración con GuardDuty"""
        
        try:
            detectors = self.guardduty.list_detectors()
            return len(detectors.get('DetectorIds', [])) > 0
        except Exception:
            return False
    
    def _check_security_hub_integration(self):
        """Verificar integración con Security Hub"""
        
        try:
            self.securityhub.describe_hub()
            return True
        except Exception:
            return False
```

## Casos de Uso

### **1. Habilitar y Configurar Detective**
```python
# Ejemplo: Habilitar Amazon Detective
manager = DetectiveManager('us-east-1')

# Habilitar Detective
enable_result = manager.enable_detective(
    tags=[
        {'Key': 'Environment', 'Value': 'production'},
        {'Key': 'Team', 'Value': 'Security'}
    ]
)

if enable_result['success']:
    print(f"Amazon Detective enabled: {enable_result['graph_arn']}")
    
    # Esperar a que el grafo esté activo
    time.sleep(60)
    
    # Verificar estado
    status_result = manager.get_graph_status()
    if status_result['success']:
        print(f"Graph status: {status_result['graph_info']['status']}")
```

### **2. Configurar Cuentas Miembro**
```python
# Ejemplo: Configurar cuenta miembro
member_result = manager.create_member_account(
    account_id='123456789012',
    email='security@example.com',
    display_name='Security Team',
    message='Join our Detective organization for centralized security analysis'
)

if member_result['success']:
    print(f"Member account invited: {member_result['account_id']}")
    
    # Listar miembros
    members_result = manager.list_member_accounts()
    if members_result['success']:
        print(f"Total members: {members_result['count']}")
```

### **3. Iniciar Investigación**
```python
# Ejemplo: Iniciar investigación de instancia EC2
from datetime import datetime, timedelta

end_time = datetime.utcnow()
start_time = end_time - timedelta(days=7)

investigation_result = manager.start_investigation(
    entity_type='INSTANCE',
    entity_id='i-1234567890abcdef0',
    scope_start_time=start_time,
    scope_end_time=end_time
)

if investigation_result['success']:
    print(f"Investigation started: {investigation_result['investigation_arn']}")
    
    # Obtener relaciones de entidad
    relationships_result = manager.get_entity_relationships(
        entity_type='INSTANCE',
        entity_id='i-1234567890abcdef0'
    )
    
    if relationships_result['success']:
        relationships = relationships_result['relationships']
        print(f"Related entities: {len(relationships['related_entities'])}")
```

### **4. Analizar Eventos de Línea de Tiempo**
```python
# Ejemplo: Analizar eventos de línea de tiempo
events_result = manager.get_timeline_events(
    entity_type='USER',
    entity_id='arn:aws:iam::123456789012:user/security-admin',
    start_time=start_time,
    end_time=end_time
)

if events_result['success']:
    events = events_result['events']
    print(f"Timeline events: {len(events)}")
    
    # Analizar eventos críticos
    critical_events = [e for e in events if e['severity'] in ['HIGH', 'CRITICAL']]
    if critical_events:
        print(f"CRITICAL: {len(critical_events)} events require attention")
        for event in critical_events:
            print(f"  - {event['event_type']}: {event['description']}")
```

### **5. Generar Reporte de Investigación**
```python
# Ejemplo: Generar reporte de investigación
report_result = manager.generate_detective_report(
    report_type='investigation',
    entity_type='INSTANCE',
    entity_id='i-1234567890abcdef0',
    time_range_days=7
)

if report_result['success']:
    report = report_result['detective_report']
    
    if 'entity_relationships' in report:
        relationships = report['entity_relationships']
        print(f"Entity relationships: {len(relationships['related_entities'])}")
    
    if 'timeline_events' in report:
        events = report['timeline_events']
        print(f"Timeline events: {len(events)}")
    
    if 'event_analysis' in report:
        analysis = report['event_analysis']
        print(f"Events by severity: {analysis['by_severity']}")
        print(f"Events by source: {analysis['by_source']}")
```

## Configuración con AWS CLI

### **Habilitar y Configurar Detective**
```bash
# Habilitar Detective
aws detective enable-graph --tags Key=Environment,Value=Production

# Obtener estado del grafo
aws detective describe-graph

# Deshabilitar Detective
aws detective disable-graph
```

### **Gestión de Miembros**
```bash
# Invitar cuenta miembro
aws detective create-members \
  --graph-arn arn:aws:detective:region:account-id:graph:graph-id \
  --member-details AccountId=123456789012,Email=member@example.com

# Listar miembros
aws detective list-members \
  --graph-arn arn:aws:detective:region:account-id:graph:graph-id

# Eliminar miembro
aws detective delete-members \
  --graph-arn arn:aws:detective:region:account-id:graph:graph-id \
  --account-ids 123456789012
```

### **Gestión de Investigaciones**
```bash
# Iniciar investigación
aws detective start-investigation \
  --graph-arn arn:aws:detective:region:account-id:graph:graph-id \
  --entity-type INSTANCE \
  --entity-id i-1234567890abcdef0 \
  --scope-start-time 2023-12-01T00:00:00Z \
  --scope-end-time 2023-12-07T23:59:59Z

# Listar investigaciones
aws detective list-investigations \
  --graph-arn arn:aws:detective:region:account-id:graph:graph-id

# Detener investigación
aws detective stop-investigation \
  --graph-arn arn:aws:detective:region:account-id:graph:graph-id \
  --investigation-arn arn:aws:detective:region:account-id:graph:graph-id:investigation/investigation-id
```

### **Gestión de Datos**
```bash
# Listar fuentes de datos
aws detective list-data-sources \
  --graph-arn arn:aws:detective:region:account-id:graph:graph-id

# Obtener datos de entidad
aws detective get-entity-data \
  --graph-arn arn:aws:detective:region:account-id:graph:graph-id \
  --entity-type INSTANCE \
  --entity-id i-1234567890abcdef0 \
  --start-time 2023-12-01T00:00:00Z \
  --end-time 2023-12-07T23:59:59Z
```

## Best Practices

### **1. Configuración Inicial**
- Habilitar Detective en todas las regiones relevantes
- Configurar retención de datos apropiada
- Establecer integración con GuardDuty y Security Hub
- Configurar monitoreo de fuentes de datos

### **2. Gestión de Investigaciones**
- Iniciar investigaciones para hallazgos críticos
- Usar líneas de tiempo apropiadas para análisis
- Documentar hallazgos y conclusiones
- Establecer flujos de trabajo estandarizados

### **3. Análisis de Datos**
- Utilizar relaciones de entidad para análisis completo
- Analizar patrones de comportamiento anómalos
- Correlacionar eventos de múltiples fuentes
- Generar reportes periódicos de seguridad

### **4. Operaciones**
- Regularizar revisión de investigaciones activas
- Configurar alertas para actividades sospechosas
- Mantener actualizadas fuentes de datos
- Optimizar almacenamiento y rendimiento

## Costos

### **Precios de Amazon Detective**
- **Grafo de Detective**: $2.00 por miembro por mes
- **Almacenamiento de datos**: $0.10 por GB-mes
- **Análisis de datos**: Incluido en el precio base
- **Transferencia de datos**: Costos estándar de AWS

### **Ejemplo de Costos Mensuales**
- **5 miembros**: 5 × $2.00 = $10.00
- **Almacenamiento**: 50 GB × $0.10 = $5.00
- **Total estimado**: ~$15.00 por mes

## Troubleshooting

### **Problemas Comunes**
1. **Grafo no se crea**: Verificar permisos y configuración
2. **No hay datos de fuentes**: Revisar configuración de logs
3. **Investigaciones fallan**: Verificar entidad y rango de tiempo
4. **Miembros no pueden unirse**: Revisar invitación y permisos

### **Comandos de Diagnóstico**
```bash
# Verificar estado del grafo
aws detective describe-graph

# Verificar fuentes de datos
aws detective list-data-sources --graph-arn arn:aws:detective:region:account-id:graph:graph-id

# Verificar investigaciones
aws detective list-investigations --graph-arn arn:aws:detective:region:account-id:graph:graph-id

# Verificar miembros
aws detective list-members --graph-arn arn:aws:detective:region:account-id:graph:graph-id
```

## Cumplimiento Normativo

### **PCI-DSS**
- **Requerimiento 10**: Tracking y monitoreo de acceso
- **Requerimiento 11**: Pruebas de seguridad y monitoreo
- **Requerimiento 12**: Políticas de seguridad

### **HIPAA**
- **Security Rule**: Controles técnicos de seguridad
- **Audit Controls**: Controles de auditoría
- **Access Controls**: Controles de acceso

### **SOC 2**
- **Security**: Controles de seguridad
- **Availability**: Controles de disponibilidad
- **Monitoring**: Monitoreo continuo

### **NIST Cybersecurity Framework**
- **Detect**: Detección de actividades maliciosas
- **Respond**: Respuesta a incidentes
- **Recover**: Recuperación de incidentes

## Integración con Otros Servicios

### **AWS GuardDuty**
- **Threat Detection**: Detección de amenazas
- **Investigation Context**: Contexto de investigación
- **Findings Integration**: Integración de hallazgos
- **Alert Correlation**: Correlación de alertas

### **AWS Security Hub**
- **Centralized Findings**: Hallazgos centralizados
- **Compliance Monitoring**: Monitoreo de cumplimiento
- **Workflow Integration**: Integración de flujos de trabajo
- **Reporting**: Reportes consolidados

### **AWS CloudTrail**
- **Audit Logs**: Logs de auditoría
- **API Tracking**: Seguimiento de APIs
- **Event History**: Historial de eventos
- **Compliance Evidence**: Evidencia de cumplimiento

### **AWS VPC Flow Logs**
- **Network Monitoring**: Monitoreo de red
- **Traffic Analysis**: Análisis de tráfico
- **Security Events**: Eventos de seguridad
- **Forensic Data**: Datos forenses

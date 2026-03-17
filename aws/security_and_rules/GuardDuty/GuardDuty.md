# AWS GuardDuty

## Definición

AWS GuardDuty es un servicio de seguridad gestionado que monitorea continuamente actividades maliciosas y comportamientos no autorizados en tus cuentas y workloads de AWS. Utiliza machine learning, análisis de anomalías y threat intelligence para detectar amenazas en tiempo real y generar alertas de seguridad.

## Características Principales

### **Detección Inteligente**
- **Machine Learning**: Algoritmos de ML para detección de anomalías
- **Threat Intelligence**: Inteligencia de amenazas en tiempo real
- **Anomaly Detection**: Detección de comportamientos anómalos
- **Behavioral Analysis**: Análisis de patrones de comportamiento
- **Continuous Monitoring**: Monitoreo 24/7 de recursos AWS

### **Cobertura Integral**
- **Network Traffic**: Análisis de tráfico de red
- **Account Activity**: Actividad de cuenta y usuarios
- **Data Access**: Acceso a datos y recursos
- **API Calls**: Llamadas a APIs de AWS
- **Workloads**: Contenedores, Lambda, EC2 instances

### **Integración Nativa**
- **AWS Security Hub**: Centralización de hallazgos
- **CloudWatch Events**: Eventos y notificaciones
- **AWS Config**: Configuración de seguridad
- **AWS Organizations**: Gestión multi-cuenta
- **Third-party SIEMs**: Integración con herramientas externas

## Tipos de Detecciones

### **1. Amenazas de Red**
- **Port Scanning**: Escaneo de puertos malicioso
- **DDoS Attacks**: Ataques de denegación de servicio
- **DNS Exfiltration**: Exfiltración de datos via DNS
- **Suspicious IP Access**: Acceso desde IPs sospechosas
- **Unusual Network Protocols**: Protocolos de red inusuales

### **2. Amenazas de Cuenta**
- **Credential Compromise**: Compromiso de credenciales
- **Privilege Escalation**: Escalada de privilegios
- **Unusual User Activity**: Actividad de usuario anómala
- **Root Account Usage**: Uso de cuenta root
- **MFA Disabled**: MFA deshabilitado

### **3. Amenazas de Datos**
- **Data Exfiltration**: Exfiltración de datos
- **Unusual S3 Access**: Acceso inusual a S3
- **RDS Access Patterns**: Patrones de acceso a RDS
- **DynamoDB Anomalies**: Anomalías en DynamoDB
- **EFS Access**: Acceso a EFS

### **4. Amenazas de Workloads**
- **EC2 Compromise**: Compromiso de instancias EC2
- **Container Threats**: Amenazas en contenedores
- **Lambda Anomalies**: Anomalías en Lambda
- **EKS/Kubernetes**: Amenazas en clusters de Kubernetes
- **Fargate Issues**: Problemas en Fargate

## Arquitectura de GuardDuty

### **Componentes Principales**
```
AWS GuardDuty Architecture
├── Data Collection
│   ├── VPC Flow Logs
│   ├── CloudTrail Logs
│   ├── DNS Logs
│   ├── S3 Data Events
│   └── Kubernetes Audit Logs
├── Analysis Engine
│   ├── Machine Learning Models
│   ├── Threat Intelligence Feeds
│   ├── Anomaly Detection
│   ├── Behavioral Analysis
│   └── Signature-Based Detection
├── Detection Types
│   ├── Network Threats
│   ├── Account Threats
│   ├── Data Threats
│   ├── Workload Threats
│   └── Container Threats
├── Alerting & Response
│   ├── Findings Generation
│   ├── Severity Classification
│   ├── Alert Delivery
│   ├── Automated Response
│   └── Integration Hub
└── Management & Configuration
    ├── Detector Management
    ├── Threat Intel Updates
    ├── Suppression Rules
    ├── Trusted IP Lists
    └── Multi-Account Management
```

### **Flujo de Detección**
```
Data Collection → Analysis Engine → Threat Detection → Finding Generation → Alert Delivery → Response Action
```

## Configuración de GuardDuty

### **Gestión Completa de GuardDuty**
```python
import boto3
import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class GuardDutyManager:
    def __init__(self, region='us-east-1'):
        self.guardduty = boto3.client('guardduty', region_name=region)
        self.organizations = boto3.client('organizations', region_name=region)
        self.securityhub = boto3.client('securityhub', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.region = region
    
    def enable_guardduty(self, detector_id=None, enable_s3_logs=True, enable_kubernetes_audit_logs=True,
                        data_sources=None, tags=None):
        """Habilitar GuardDuty en la cuenta"""
        
        try:
            # Si no se proporciona detector_id, crear uno nuevo
            if not detector_id:
                # Verificar si ya existe un detector
                detectors_response = self.guardduty.list_detectors()
                if detectors_response['DetectorIds']:
                    detector_id = detectors_response['DetectorIds'][0]
                else:
                    # Crear nuevo detector
                    detector_response = self.guardduty.create_detector(
                        Enable=True,
                        ClientRequestToken=str(int(time.time())),
                        Tags=tags or []
                    )
                    detector_id = detector_response['DetectorId']
            
            # Configurar fuentes de datos
            data_sources_config = self._get_default_data_sources_config(
                enable_s3_logs=enable_s3_logs,
                enable_kubernetes_audit_logs=enable_kubernetes_audit_logs,
                custom_data_sources=data_sources
            )
            
            # Actualizar detector
            update_params = {
                'DetectorId': detector_id,
                'DataSources': data_sources_config,
                'Enable': True
            }
            
            if tags:
                update_params['Tags'] = tags
            
            response = self.guardduty.update_detector(**update_params)
            
            return {
                'success': True,
                'detector_id': detector_id,
                'data_sources': data_sources_config,
                'status': 'ENABLED'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_default_data_sources_config(self, enable_s3_logs=True, enable_kubernetes_audit_logs=True,
                                        custom_data_sources=None):
        """Obtener configuración por defecto de fuentes de datos"""
        
        config = {
            'CloudTrail': {
                'Enable': True
            },
            'DNSLogs': {
                'Enable': True
            },
            'FlowLogs': {
                'Enable': True
            }
        }
        
        if enable_s3_logs:
            config['S3Logs'] = {
                'Enable': True
            }
        
        if enable_kubernetes_audit_logs:
            config['Kubernetes'] = {
                'AuditLogs': {
                    'Enable': True
                }
            }
        
        # Aplicar configuración personalizada si se proporciona
        if custom_data_sources:
            for source, settings in custom_data_sources.items():
                config[source] = settings
        
        return config
    
    def create_member_accounts(self, detector_id, account_ids, invitation_message=None):
        """Crear cuentas miembro para GuardDuty multi-cuenta"""
        
        try:
            # Crear miembros
            members = []
            for account_id in account_ids:
                member_info = {
                    'AccountId': account_id,
                    'Email': f'admin+{account_id}@example.com'  # Reemplazar con email real
                }
                members.append(member_info)
            
            response = self.guardduty.create_members(
                DetectorId=detector_id,
                AccountDetails=members
            )
            
            # Enviar invitaciones
            invitation_response = self.guardduty.invite_members(
                DetectorId=detector_id,
                AccountIds=account_ids,
                Message=invitation_message or 'Invitation to join GuardDuty organization'
            )
            
            unprocessed_accounts = invitation_response.get('UnprocessedAccounts', [])
            
            return {
                'success': True,
                'detector_id': detector_id,
                'accounts_invited': len(account_ids),
                'unprocessed_accounts': len(unprocessed_accounts),
                'invitation_id': invitation_response.get('UnprocessedAccounts', [])
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def accept_invitation(self, detector_id, master_account_id):
        """Aceptar invitación de cuenta maestra"""
        
        try:
            response = self.guardduty.accept_invitation(
                DetectorId=detector_id,
                MasterAccountId=master_account_id,
                InvitationId=self._get_invitation_id(detector_id, master_account_id)
            )
            
            return {
                'success': True,
                'detector_id': detector_id,
                'master_account_id': master_account_id,
                'invitation_accepted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_invitation_id(self, detector_id, master_account_id):
        """Obtener ID de invitación"""
        
        try:
            response = self.guardduty.list_invitations()
            for invitation in response['Invitations']:
                if invitation['AccountId'] == master_account_id:
                    return invitation['InvitationId']
        except Exception:
            pass
        
        return None
    
    def create_ip_set(self, detector_id, ip_set_name, ip_addresses, location='S3',
                     format='TXT', activate=True):
        """Crear conjunto de IPs de confianza o bloqueadas"""
        
        try:
            # Crear conjunto de IPs
            response = self.guardduty.create_ip_set(
                DetectorId=detector_id,
                Name=ip_set_name,
                Format=format.upper(),
                Location=location,
                Activate=activate
            )
            
            ip_set_id = response['IpSetId']
            
            # Si se proporcionaron IPs, actualizar el conjunto
            if ip_addresses:
                self._update_ip_set_content(detector_id, ip_set_id, ip_addresses, format)
            
            return {
                'success': True,
                'ip_set_id': ip_set_id,
                'ip_set_name': ip_set_name,
                'format': format,
                'location': location,
                'activated': activate
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _update_ip_set_content(self, detector_id, ip_set_id, ip_addresses, format='TXT'):
        """Actualizar contenido del conjunto de IPs"""
        
        try:
            # Formatear IPs según el formato
            if format.upper() == 'TXT':
                content = '\n'.join(ip_addresses)
            elif format.upper() == 'STIX':
                # Formato STIX simplificado
                content = json.dumps({
                    'indicators': [
                        {
                            'type': 'ip',
                            'value': ip,
                            'confidence': 'high'
                        }
                        for ip in ip_addresses
                    ]
                })
            else:
                content = '\n'.join(ip_addresses)
            
            # Subir contenido a S3 si es necesario
            if content:
                s3_client = boto3.client('s3')
                bucket_name = f'guardduty-ip-sets-{detector_id}'
                key = f'{ip_set_id}/ip-list.{format.lower()}'
                
                try:
                    s3_client.put_object(
                        Bucket=bucket_name,
                        Key=key,
                        Body=content.encode('utf-8')
                    )
                except Exception:
                    pass
            
            return True
            
        except Exception:
            return False
    
    def create_threat_intel_set(self, detector_id, threat_intel_name, threat_intel_data,
                              format='STIX', activate=True, tags=None):
        """Crear conjunto de inteligencia de amenazas"""
        
        try:
            response = self.guardduty.create_threat_intel_set(
                DetectorId=detector_id,
                Name=threat_intel_name,
                Format=format.upper(),
                Location='S3',  # GuardDuty requiere S3 para threat intel sets
                Activate=activate,
                Tags=tags or []
            )
            
            threat_intel_id = response['ThreatIntelSetId']
            
            return {
                'success': True,
                'threat_intel_id': threat_intel_id,
                'threat_intel_name': threat_intel_name,
                'format': format,
                'activated': activate
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_suppression_rule(self, detector_id, rule_name, description, criteria,
                               reason='SUPPRESSION_AUTOMATED'):
        """Crear regla de supresión de hallazgos"""
        
        try:
            response = self.guardduty.create_suppression_rule(
                DetectorId=detector_id,
                Name=rule_name,
                Description=description,
                Reason=reason,
                RuleCriteria=criteria
            )
            
            return {
                'success': True,
                'rule_id': response['RuleId'],
                'rule_name': rule_name,
                'description': description,
                'criteria': criteria
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_findings(self, detector_id, finding_criteria=None, sort_criteria=None,
                    max_results=100, next_token=None):
        """Obtener hallazgos de GuardDuty"""
        
        try:
            get_params = {
                'DetectorId': detector_id,
                'MaxResults': max_results
            }
            
            if finding_criteria:
                get_params['FindingCriteria'] = finding_criteria
            
            if sort_criteria:
                get_params['SortCriteria'] = sort_criteria
            
            if next_token:
                get_params['NextToken'] = next_token
            
            response = self.guardduty.get_findings(**get_params)
            
            findings = []
            for finding in response['Findings']:
                finding_info = self._format_finding(finding)
                findings.append(finding_info)
            
            return {
                'success': True,
                'findings': findings,
                'count': len(findings),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _format_finding(self, finding):
        """Formatear hallazgo para mejor legibilidad"""
        
        return {
            'id': finding.get('Id', ''),
            'arn': finding.get('Arn', ''),
            'type': finding.get('Type', ''),
            'title': finding.get('Title', ''),
            'description': finding.get('Description', ''),
            'severity': finding.get('Severity', 0),
            'confidence': finding.get('Confidence', 0),
            'created_at': finding.get('CreatedAt', '').isoformat() if finding.get('CreatedAt') else '',
            'updated_at': finding.get('UpdatedAt', '').isoformat() if finding.get('UpdatedAt') else '',
            'resource': {
                'resource_type': finding.get('Resource', {}).get('ResourceType', ''),
                'resource_id': finding.get('Resource', {}).get('InstanceId', ''),
                'resource_arn': finding.get('Resource', {}).get('ResourceArn', ''),
                'resource_tags': finding.get('Resource', {}).get('Tags', {})
            },
            'service': {
                'service_name': finding.get('Service', {}).get('ServiceName', ''),
                'action': finding.get('Service', {}).get('Action', {}),
                'evidence': finding.get('Service', {}).get('Evidence', {}),
                'additional_info': finding.get('Service', {}).get('AdditionalInfo', {})
            },
            'source': {
                'source_type': finding.get('Source', {}).get('SourceType', ''),
                'source_details': finding.get('Source', {}).get('SourceDetails', {})
            },
            'product_fields': finding.get('ProductFields', {}),
            'schema_version': finding.get('SchemaVersion', '')
        }
    
    def get_findings_statistics(self, detector_id, finding_criteria=None):
        """Obtener estadísticas de hallazgos"""
        
        try:
            stats_params = {
                'DetectorId': detector_id
            }
            
            if finding_criteria:
                stats_params['FindingCriteria'] = finding_criteria
            
            response = self.guardduty.get_findings_statistics(**stats_params)
            
            return {
                'success': True,
                'statistics': response['FindingStatistics'],
                'total_findings': response['FindingStatistics'].get('CountBySeverity', {})
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def archive_findings(self, detector_id, finding_ids):
        """Archivar hallazgos"""
        
        try:
            response = self.guardduty.archive_findings(
                DetectorId=detector_id,
                FindingIds=finding_ids
            )
            
            return {
                'success': True,
                'archived_count': len(finding_ids),
                'detector_id': detector_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def unarchive_findings(self, detector_id, finding_ids):
        """Desarchivar hallazgos"""
        
        try:
            response = self.guardduty.unarchive_findings(
                DetectorId=detector_id,
                FindingIds=finding_ids
            )
            
            return {
                'success': True,
                'unarchived_count': len(finding_ids),
                'detector_id': detector_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_detector(self, detector_id, enable=None, data_sources=None, features=None):
        """Actualizar configuración del detector"""
        
        try:
            update_params = {'DetectorId': detector_id}
            
            if enable is not None:
                update_params['Enable'] = enable
            
            if data_sources:
                update_params['DataSources'] = data_sources
            
            if features:
                update_params['Features'] = features
            
            response = self.guardduty.update_detector(**update_params)
            
            return {
                'success': True,
                'detector_id': detector_id,
                'updated': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_detectors(self, max_results=100, next_token=None):
        """Listar detectores"""
        
        try:
            list_params = {'MaxResults': max_results}
            
            if next_token:
                list_params['NextToken'] = next_token
            
            response = self.guardduty.list_detectors(**list_params)
            
            detectors = []
            for detector_id in response['DetectorIds']:
                detector_info = self.describe_detector(detector_id)
                if detector_info['success']:
                    detectors.append(detector_info['detector_info'])
            
            return {
                'success': True,
                'detectors': detectors,
                'count': len(detectors),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_detector(self, detector_id):
        """Describir detector"""
        
        try:
            response = self.guardduty.get_detector(DetectorId=detector_id)
            
            detector_info = {
                'detector_id': detector_id,
                'created_at': response['CreatedAt'].isoformat() if response.get('CreatedAt') else '',
                'status': response.get('Status', ''),
                'data_sources': response.get('DataSources', {}),
                'features': response.get('Features', []),
                'tags': response.get('Tags', []),
                'updated_at': response['UpdatedAt'].isoformat() if response.get('UpdatedAt') else ''
            }
            
            return {
                'success': True,
                'detector_info': detector_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_detector_metrics(self, detector_id, start_time, end_time):
        """Obtener métricas del detector"""
        
        try:
            metrics = {
                'findings_by_severity': {},
                'findings_by_type': {},
                'findings_by_resource': {},
                'total_findings': 0,
                'new_findings': 0,
                'resolved_findings': 0
            }
            
            # Obtener hallazgos en el período
            finding_criteria = {
                'Criterion': {
                    'updatedAt': {
                        'Gte': start_time.isoformat(),
                        'Lte': end_time.isoformat()
                    }
                }
            }
            
            findings_response = self.get_findings(
                detector_id=detector_id,
                finding_criteria=finding_criteria,
                max_results=1000
            )
            
            if findings_response['success']:
                findings = findings_response['findings']
                metrics['total_findings'] = len(findings)
                
                # Agrupar por severidad
                for finding in findings:
                    severity = finding['severity']
                    if severity not in metrics['findings_by_severity']:
                        metrics['findings_by_severity'][severity] = 0
                    metrics['findings_by_severity'][severity] += 1
                    
                    # Agrupar por tipo
                    finding_type = finding['type']
                    if finding_type not in metrics['findings_by_type']:
                        metrics['findings_by_type'][finding_type] = 0
                    metrics['findings_by_type'][finding_type] += 1
                    
                    # Agrupar por recurso
                    resource_type = finding['resource']['resource_type']
                    if resource_type not in metrics['findings_by_resource']:
                        metrics['findings_by_resource'][resource_type] = 0
                    metrics['findings_by_resource'][resource_type] += 1
            
            return {
                'success': True,
                'detector_id': detector_id,
                'metrics': metrics,
                'time_period': {
                    'start_time': start_time.isoformat(),
                    'end_time': end_time.isoformat()
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_automation_rules(self, detector_id, rules):
        """Crear reglas de automatización"""
        
        try:
            created_rules = []
            
            for rule_config in rules:
                try:
                    response = self.guardduty.create_automation_rules(
                        DetectorId=detector_id,
                        AutomationRules=[rule_config]
                    )
                    
                    created_rules.append({
                        'rule_id': response['Rules'][0]['RuleId'],
                        'rule_name': rule_config.get('Name', ''),
                        'status': 'CREATED'
                    })
                    
                except Exception as e:
                    created_rules.append({
                        'rule_name': rule_config.get('Name', ''),
                        'status': 'FAILED',
                        'error': str(e)
                    })
            
            return {
                'success': True,
                'created_rules': created_rules,
                'total_rules': len(rules)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def setup_guardduty_monitoring(self, detector_id, sns_topic_arn=None):
        """Configurar monitoreo de GuardDuty"""
        
        try:
            monitoring_setup = {
                'cloudwatch_alarms': [],
                'sns_topic': None,
                'automation_rules': []
            }
            
            # Crear o usar SNS topic para notificaciones
            if sns_topic_arn:
                monitoring_setup['sns_topic'] = sns_topic_arn
            else:
                # Crear nuevo SNS topic
                topic_response = self.sns.create_topic(
                    Name='guardduty-alerts',
                    Tags=[
                        {'Key': 'Service', 'Value': 'GuardDuty'},
                        {'Key': 'Purpose', 'Value': 'SecurityAlerts'}
                    ]
                )
                monitoring_setup['sns_topic'] = topic_response['TopicArn']
            
            # Crear alarmas de CloudWatch
            alarm_configs = [
                {
                    'name': f'GuardDuty-HighSeverity-{detector_id}',
                    'metric': 'HighSeverityFindings',
                    'threshold': 1,
                    'comparison': 'GreaterThanOrEqualToThreshold'
                },
                {
                    'name': f'GuardDuty-MediumSeverity-{detector_id}',
                    'metric': 'MediumSeverityFindings',
                    'threshold': 5,
                    'comparison': 'GreaterThanOrEqualToThreshold'
                },
                {
                    'name': f'GuardDuty-TotalFindings-{detector_id}',
                    'metric': 'TotalFindings',
                    'threshold': 10,
                    'comparison': 'GreaterThanOrEqualToThreshold'
                }
            ]
            
            for alarm_config in alarm_configs:
                try:
                    self.cloudwatch.put_metric_alarm(
                        AlarmName=alarm_config['name'],
                        AlarmDescription=f'GuardDuty alert: {alarm_config["metric"]}',
                        Namespace='AWS/GuardDuty',
                        MetricName=alarm_config['metric'],
                        Dimensions=[
                            {'Name': 'DetectorId', 'Value': detector_id}
                        ],
                        Statistic='Sum',
                        Period=300,
                        EvaluationPeriods=1,
                        Threshold=alarm_config['threshold'],
                        ComparisonOperator=alarm_config['comparison'],
                        AlarmActions=[monitoring_setup['sns_topic']],
                        TreatMissingData='missing'
                    )
                    
                    monitoring_setup['cloudwatch_alarms'].append(alarm_config['name'])
                    
                except Exception:
                    continue
            
            # Crear reglas de automatización básicas
            automation_rules = [
                {
                    'Name': 'Auto-archive low severity',
                    'Description': 'Automatically archive low severity findings',
                    'RuleCriteria': {
                        'Criterion': {
                            'severity': {
                                'Gte': 1,
                                'Lte': 3.9
                            }
                        }
                    },
                    'Actions': [
                        {
                            'Type': 'ARCHIVE'
                        }
                    ],
                    'RuleOrder': 1,
                    'Enabled': True
                },
                {
                    'Name': 'Auto-notify high severity',
                    'Description': 'Automatically notify on high severity findings',
                    'RuleCriteria': {
                        'Criterion': {
                            'severity': {
                                'Gte': 7.0
                            }
                        }
                    },
                    'Actions': [
                        {
                            'Type': 'NOTIFICATION'
                        }
                    ],
                    'RuleOrder': 2,
                    'Enabled': True
                }
            ]
            
            automation_result = self.create_automation_rules(detector_id, automation_rules)
            if automation_result['success']:
                monitoring_setup['automation_rules'] = automation_result['created_rules']
            
            return {
                'success': True,
                'monitoring_setup': monitoring_setup,
                'detector_id': detector_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_security_report(self, detector_id, start_time, end_time, report_type='summary'):
        """Generar reporte de seguridad"""
        
        try:
            # Obtener métricas del detector
            metrics_response = self.get_detector_metrics(detector_id, start_time, end_time)
            
            if not metrics_response['success']:
                return metrics_response
            
            metrics = metrics_response['metrics']
            
            # Obtener hallazgos recientes
            finding_criteria = {
                'Criterion': {
                    'updatedAt': {
                        'Gte': start_time.isoformat(),
                        'Lte': end_time.isoformat()
                    }
                }
            }
            
            findings_response = self.get_findings(
                detector_id=detector_id,
                finding_criteria=finding_criteria,
                max_results=500
            )
            
            # Generar reporte
            report = {
                'report_metadata': {
                    'detector_id': detector_id,
                    'report_type': report_type,
                    'generated_at': datetime.utcnow().isoformat(),
                    'time_period': {
                        'start_time': start_time.isoformat(),
                        'end_time': end_time.isoformat()
                    }
                },
                'executive_summary': {
                    'total_findings': metrics['total_findings'],
                    'high_severity': metrics['findings_by_severity'].get('HIGH', 0),
                    'medium_severity': metrics['findings_by_severity'].get('MEDIUM', 0),
                    'low_severity': metrics['findings_by_severity'].get('LOW', 0),
                    'top_threat_types': self._get_top_threat_types(metrics['findings_by_type']),
                    'affected_resources': metrics['findings_by_resource']
                },
                'detailed_findings': findings_response['findings'] if findings_response['success'] else [],
                'trend_analysis': self._analyze_trends(metrics),
                'recommendations': self._generate_recommendations(metrics)
            }
            
            return {
                'success': True,
                'security_report': report
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_top_threat_types(self, findings_by_type):
        """Obtener tipos de amenaza principales"""
        
        sorted_types = sorted(
            findings_by_type.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return sorted_types[:5]
    
    def _analyze_trends(self, metrics):
        """Analizar tendencias"""
        
        trends = {
            'severity_distribution': metrics['findings_by_severity'],
            'resource_distribution': metrics['findings_by_resource'],
            'threat_distribution': metrics['findings_by_type'],
            'risk_level': 'MEDIUM'
        }
        
        # Determinar nivel de riesgo
        high_severity = metrics['findings_by_severity'].get('HIGH', 0)
        medium_severity = metrics['findings_by_severity'].get('MEDIUM', 0)
        
        if high_severity > 5:
            trends['risk_level'] = 'HIGH'
        elif high_severity > 0 or medium_severity > 10:
            trends['risk_level'] = 'MEDIUM'
        else:
            trends['risk_level'] = 'LOW'
        
        return trends
    
    def _generate_recommendations(self, metrics):
        """Generar recomendaciones basadas en métricas"""
        
        recommendations = []
        
        # Recomendaciones basadas en severidad
        high_severity = metrics['findings_by_severity'].get('HIGH', 0)
        if high_severity > 0:
            recommendations.append({
                'priority': 'HIGH',
                'title': 'Investigate High Severity Findings',
                'description': f'{high_severity} high severity findings require immediate investigation',
                'action': 'Review and remediate all high severity findings within 24 hours'
            })
        
        medium_severity = metrics['findings_by_severity'].get('MEDIUM', 0)
        if medium_severity > 10:
            recommendations.append({
                'priority': 'MEDIUM',
                'title': 'Review Medium Severity Findings',
                'description': f'{medium_severity} medium severity findings need attention',
                'action': 'Review and address medium severity findings within 72 hours'
            })
        
        # Recomendaciones basadas en recursos
        resource_findings = metrics['findings_by_resource']
        if 'Instance' in resource_findings and resource_findings['Instance'] > 5:
            recommendations.append({
                'priority': 'MEDIUM',
                'title': 'Review EC2 Instance Security',
                'description': 'Multiple findings related to EC2 instances',
                'action': 'Review security groups, IAM roles, and instance configurations'
            })
        
        # Recomendaciones basadas en tipos de amenaza
        threat_findings = metrics['findings_by_type']
        if 'CredentialAccess' in threat_findings:
            recommendations.append({
                'priority': 'HIGH',
                'title': 'Credential Compromise Detected',
                'description': 'Evidence of credential access attempts',
                'action': 'Immediately rotate affected credentials and review access patterns'
            })
        
        return recommendations
```

## Casos de Uso

### **1. Habilitar y Configurar GuardDuty**
```python
# Ejemplo: Habilitar GuardDuty con todas las fuentes de datos
manager = GuardDutyManager('us-east-1')

# Habilitar GuardDuty
enable_result = manager.enable_guardduty(
    enable_s3_logs=True,
    enable_kubernetes_audit_logs=True,
    tags=[
        {'Key': 'Environment', 'Value': 'production'},
        {'Key': 'Team', 'Value': 'Security'}
    ]
)

if enable_result['success']:
    detector_id = enable_result['detector_id']
    print(f"GuardDuty enabled with detector: {detector_id}")
    
    # Configurar monitoreo
    monitoring_result = manager.setup_guardduty_monitoring(detector_id)
    
    if monitoring_result['success']:
        setup = monitoring_result['monitoring_setup']
        print(f"Monitoring configured with {len(setup['cloudwatch_alarms'])} alarms")
```

### **2. Configurar Multi-Cuenta**
```python
# Ejemplo: Configurar GuardDuty multi-cuenta
member_accounts = ['123456789012', '123456789013', '123456789014']

# Crear cuentas miembro
member_result = manager.create_member_accounts(
    detector_id=detector_id,
    account_ids=member_accounts,
    invitation_message='Join our GuardDuty organization for centralized security monitoring'
)

if member_result['success']:
    print(f"Invitations sent to {member_result['accounts_invited']} accounts")
    
    # Las cuentas miembro deben aceptar la invitación
    for account_id in member_accounts:
        accept_result = manager.accept_invitation(
            detector_id=f'new-detector-{account_id}',
            master_account_id='123456789015'  # Cuenta maestra
        )
        print(f"Account {account_id} invitation accepted: {accept_result['success']}")
```

### **3. Analizar Hallazgos**
```python
# Ejemplo: Obtener y analizar hallazgos
from datetime import datetime, timedelta

end_time = datetime.utcnow()
start_time = end_time - timedelta(days=7)

# Obtener hallazgos de alta severidad
finding_criteria = {
    'Criterion': {
        'severity': {
            'Gte': 7.0
        }
    }
}

findings_result = manager.get_findings(
    detector_id=detector_id,
    finding_criteria=finding_criteria,
    max_results=50
)

if findings_result['success']:
    findings = findings_result['findings']
    print(f"Found {len(findings)} high severity findings")
    
    for finding in findings[:5]:  # Mostrar primeros 5
        print(f"  - {finding['title']} (Severity: {finding['severity']})")
        print(f"    Resource: {finding['resource']['resource_type']}")
        print(f"    Description: {finding['description'][:100]}...")
```

### **4. Generar Reporte de Seguridad**
```python
# Ejemplo: Generar reporte semanal de seguridad
report_result = manager.generate_security_report(
    detector_id=detector_id,
    start_time=start_time,
    end_time=end_time,
    report_type='weekly'
)

if report_result['success']:
    report = report_result['security_report']
    summary = report['executive_summary']
    
    print(f"Weekly Security Report")
    print(f"Total Findings: {summary['total_findings']}")
    print(f"High Severity: {summary['high_severity']}")
    print(f"Medium Severity: {summary['medium_severity']}")
    print(f"Low Severity: {summary['low_severity']}")
    print(f"Risk Level: {report['trend_analysis']['risk_level']}")
    print(f"Recommendations: {len(report['recommendations'])}")
```

## Configuración con AWS CLI

### **Habilitar y Configurar GuardDuty**
```bash
# Crear detector
aws guardduty create-detector --enable --client-request-token token123

# Listar detectores
aws guardduty list-detectors

# Habilitar fuentes de datos
aws guardduty update-detector \
  --detector-id detector-id \
  --data-sources CloudTrail={Enable=true},DNSLogs={Enable=true},FlowLogs={Enable=true}

# Habilitar logs de S3
aws guardduty update-detector \
  --detector-id detector-id \
  --data-sources S3Logs={Enable=true}
```

### **Gestión Multi-Cuenta**
```bash
# Crear cuentas miembro
aws guardduty create-members \
  --detector-id detector-id \
  --account-details Id=123456789012,Email=admin@example.com Id=123456789013,Email=admin2@example.com

# Invitar cuentas miembro
aws guardduty invite-members \
  --detector-id detector-id \
  --account-ids 123456789012 123456789013 \
  --message "Join our GuardDuty organization"

# Listar invitaciones
aws guardduty list-invitations

# Aceptar invitación
aws guardduty accept-invitation \
  --detector-id detector-id \
  --master-account-id 123456789015 \
  --invitation-id invitation-id
```

### **Gestión de Hallazgos**
```bash
# Obtener hallazgos
aws guardduty get-findings \
  --detector-id detector-id \
  --finding-criteria '{ "severity": { "Gte": 7.0 } }'

# Obtener estadísticas
aws guardduty get-findings-statistics \
  --detector-id detector-id \
  --finding-criteria '{ "updatedAt": { "Gte": "2023-12-01T00:00:00Z" } }'

# Archivar hallazgos
aws guardduty archive-findings \
  --detector-id detector-id \
  --finding-ids finding-id1 finding-id2

# Desarchivar hallazgos
aws guardduty unarchive-findings \
  --detector-id detector-id \
  --finding-ids finding-id1 finding-id2
```

### **Configuración de IP Sets y Threat Intel**
```bash
# Crear IP set
aws guardduty create-ip-set \
  --detector-id detector-id \
  --name trusted-ips \
  --format TXT \
  --location s3://my-bucket/trusted-ips.txt \
  --activate

# Crear threat intel set
aws guardduty create-threat-intel-set \
  --detector-id detector-id \
  --name custom-threat-intel \
  --format STIX \
  --location s3://my-bucket/threat-intel.json \
  --activate
```

## Best Practices

### **1. Configuración Inicial**
- Habilitar todas las fuentes de datos disponibles
- Configurar monitoreo multi-cuenta desde el inicio
- Establecer alertas para hallazgos de alta severidad
- Documentar procedimientos de respuesta

### **2. Gestión de Hallazgos**
- Priorizar hallazgos por severidad y criticidad
- Establecer SLAs para diferentes tipos de hallazgos
- Automatizar respuestas para hallazgos de baja severidad
- Integrar con sistemas de ticketing

### **3. Monitoreo y Alertas**
- Configurar alertas para hallazgos de alta y media severidad
- Usar SNS para notificaciones en tiempo real
- Integrar con Security Hub para vista centralizada
- Configurar dashboards de CloudWatch

### **4. Optimización**
- Usar IP sets para reducir falsos positivos
- Configurar reglas de supresión para hallazgos esperados
- Regularizar revisión y ajuste de configuración
- Mantener actualizada inteligencia de amenazas

## Costos

### **Precios de GuardDuty**
- **Por endpoint**: $1.00 por mes por endpoint
- **Endpoints incluidos**: Primer 100 endpoints gratis
- **VPC Flow Logs**: $0.05 por 100,000 eventos analizados
- **DNS Logs**: $0.10 por 100,000 eventos analizados
- **CloudTrail Events**: $0.10 por 100,000 eventos analizados

### **Ejemplo de Costos Mensuales**
- **150 endpoints**: $50.00 (100 gratis + 50 × $1.00)
- **1M VPC Flow Logs**: $0.50
- **500K DNS Logs**: $0.50
- **1M CloudTrail Events**: $1.00
- **Total estimado**: ~$52.00 por mes

## Troubleshooting

### **Problemas Comunes**
1. **Detector no habilitado**: Verificar permisos y configuración
2. **No hay hallazgos**: Revisar configuración de fuentes de datos
3. **Falsos positivos**: Configurar IP sets y reglas de supresión
4. **Alertas no funcionan**: Verificar configuración de SNS y CloudWatch

### **Comandos de Diagnóstico**
```bash
# Verificar estado del detector
aws guardduty get-detector --detector-id detector-id

# Verificar fuentes de datos
aws guardduty get-detector --detector-id detector-id --query 'DataSources'

# Verificar métricas
aws cloudwatch get-metric-statistics \
  --namespace AWS/GuardDuty \
  --metric-name HighSeverityFindings \
  --dimensions Name=DetectorId,Value=detector-id

# Verificar logs de CloudTrail
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceType,Value=AWS::GuardDuty::Detector
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

### **AWS Security Hub**
- **Centralización**: Vista centralizada de hallazgos
- **Correlation**: Correlación de hallazgos entre servicios
- **Compliance**: Cumplimiento con estándares
- **Automation**: Automatización de respuestas

### **AWS Config**
- **Configuration Tracking**: Seguimiento de configuración
- **Compliance Rules**: Reglas de cumplimiento
- **Remediation**: Corrección automática
- **Historical Data**: Datos históricos

### **AWS CloudTrail**
- **API Logging**: Logs de llamadas a API
- **Event History**: Historial de eventos
- **Multi-region**: Logs multi-región
- **Data Events**: Eventos de datos

### **AWS Lambda**
- **Custom Response**: Respuestas personalizadas
- **Automation**: Automatización de tareas
- **Integration**: Integración con otros servicios
- **Serverless**: Sin servidor

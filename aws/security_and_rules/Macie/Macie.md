# AWS Macie

## Definición

AWS Macie es un servicio de seguridad y privacidad de datos que utiliza machine learning y pattern matching para descubrir, clasificar y proteger automáticamente datos sensibles almacenados en AWS. Proporciona visibilidad completa sobre dónde se encuentran los datos sensibles, quién accede a ellos y cómo se utilizan, ayudando a cumplir con regulaciones como GDPR, CCPA y HIPAA.

## Características Principales

### **Descubrimiento Automático**
- **Machine Learning**: Algoritmos de ML para detección de datos sensibles
- **Pattern Matching**: Reconocimiento de patrones de datos sensibles
- **Data Classification**: Clasificación automática de datos
- **Continuous Monitoring**: Monitoreo continuo de datos
- **Multi-format Support**: Soporte para múltiples formatos de datos

### **Clasificación de Datos**
- **PII Detection**: Detección de información personal identificable
- **Financial Data**: Datos financieros y de tarjetas de crédito
- **Health Information**: Información médica protegida (PHI)
- **Credentials**: Credenciales y claves de acceso
- **Custom Data Types**: Tipos de datos personalizados

### **Monitoreo y Alertas**
- **Access Monitoring**: Monitoreo de acceso a datos sensibles
- **Anomaly Detection**: Detección de comportamientos anómalos
- **Real-time Alerts**: Alertas en tiempo real
- **Risk Scoring**: Puntuación de riesgo de accesos
- **Audit Trail**: Registro completo de actividades

### **Integración Nativa**
- **AWS S3**: Integración profunda con S3
- **AWS Security Hub**: Centralización de hallazgos
- **AWS CloudTrail**: Auditoría de accesos
- **AWS Lambda**: Automatización de respuestas
- **Third-party SIEMs**: Integración con herramientas externas

## Tipos de Datos Sensibles

### **1. Información Personal (PII)**
- **Nombres completos**: Nombres de personas
- **Direcciones de correo**: Email addresses
- **Números de teléfono**: Phone numbers
- **Direcciones físicas**: Physical addresses
- **Números de identificación**: ID numbers, SSN, etc.

### **2. Datos Financieros**
- **Tarjetas de crédito**: Credit card numbers
- **Números de cuenta**: Bank account numbers
- **Información bancaria**: Banking information
- **Datos de transacciones**: Transaction data
- **Información fiscal**: Tax information

### **3. Información Médica (PHI)**
- **Números de seguro médico**: Health insurance numbers
- **Registros médicos**: Medical records
- **Información de pacientes**: Patient information
- **Recetas médicas**: Prescription information
- **Diagnósticos**: Medical diagnoses

### **4. Credenciales y Claves**
- **Contraseñas**: Passwords
- **API Keys**: Claves de API
- **Tokens de acceso**: Access tokens
- **Certificados SSL**: SSL certificates
- **Claves privadas**: Private keys

### **5. Datos Personalizados**
- **Formatos personalizados**: Custom data formats
- **Expresiones regulares**: Regex patterns
- **Reglas de negocio**: Business rules
- **Datos específicos**: Industry-specific data
- **Propietarios de datos**: Data owner information

## Arquitectura de AWS Macie

### **Componentes Principales**
```
AWS Macie Architecture
├── Data Discovery Engine
│   ├── Machine Learning Models
│   ├── Pattern Recognition
│   ├── Data Classification
│   ├── Content Analysis
│   └── Metadata Extraction
├── Monitoring & Analysis
│   ├── Access Monitoring
│   ├── Anomaly Detection
│   ├── Risk Assessment
│   ├── Behavior Analysis
│   └── Threat Intelligence
├── Alerting & Response
│   ├── Finding Generation
│   ├── Risk Scoring
│   ├── Alert Delivery
│   ├── Automated Response
│   └── Integration Hub
├── Data Management
│   ├── Classification Results
│   ├── Inventory Management
│   ├── Policy Enforcement
│   ├── Retention Management
│   └── Archive Storage
└── Integration Layer
    ├── AWS S3 Integration
    ├── Security Hub Integration
    ├── CloudTrail Integration
    ├── Lambda Integration
    └── Third-party Tools
```

### **Flujo de Descubrimiento**
```
Data Source → Content Analysis → Pattern Matching → Classification → Risk Assessment → Alert Generation
```

## Configuración de AWS Macie

### **Gestión Completa de AWS Macie**
```python
import boto3
import json
import time
import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class MacieManager:
    def __init__(self, region='us-east-1'):
        self.macie2 = boto3.client('macie2', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.securityhub = boto3.client('securityhub', region_name=region)
        self.lambda_client = boto3.client('lambda', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.region = region
    
    def enable_macie(self, finding_publishing_frequency='FIFTEEN_MINUTES',
                    status='ENABLED', security_hub_configuration=None):
        """Habilitar AWS Macie"""
        
        try:
            enable_params = {
                'findingPublishingFrequency': finding_publishing_frequency,
                'status': status
            }
            
            if security_hub_configuration:
                enable_params['securityHubConfiguration'] = security_hub_configuration
            
            response = self.macie2.enable_macie(**enable_params)
            
            return {
                'success': True,
                'status': 'ENABLED',
                'finding_publishing_frequency': finding_publishing_frequency,
                'service_role': response.get('serviceRole', '')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_s3_bucket_classification_job(self, account_id, bucket_name,
                                          job_type='ONE_TIME', job_arn=None,
                                          schedule_frequency=None,
                                          custom_data_identifiers=None,
                                          sampling_percentage=100):
        """Crear trabajo de clasificación de bucket S3"""
        
        try:
            # Configurar definición del trabajo
            job_definition = {
                'bucketDefinitions': [
                    {
                        'accountId': account_id,
                        'buckets': [
                            {
                                'name': bucket_name,
                                's3JobDefinition': {
                                    'bucketDefinitions': [
                                        {
                                            'accountId': account_id,
                                            'buckets': [bucket_name]
                                        }
                                    ],
                                    'scoping': {
                                        'excludes': {},
                                        'includes': {
                                            'buckets': [bucket_name]
                                        }
                                    }
                                }
                            }
                        ]
                    }
                ],
                'jobType': job_type,
                'name': f'macie-classification-{bucket_name}-{int(time.time())}',
                'samplingPercentage': sampling_percentage
            }
            
            # Configurar programación si es recurrente
            if job_type == 'SCHEDULED' and schedule_frequency:
                job_definition['scheduleFrequency'] = {
                    'dailySchedule': {}
                } if schedule_frequency == 'DAILY' else {
                    'weeklySchedule': {}
                } if schedule_frequency == 'WEEKLY' else {
                    'monthlySchedule': {}
                }
            
            # Agregar identificadores de datos personalizados
            if custom_data_identifiers:
                job_definition['customDataIdentifierIds'] = custom_data_identifiers
            
            # Crear trabajo
            response = self.macie2.create_classification_job(**job_definition)
            
            return {
                'success': True,
                'job_id': response['jobId'],
                'job_arn': response['jobArn'],
                'job_type': job_type,
                'bucket_name': bucket_name,
                'sampling_percentage': sampling_percentage
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_custom_data_identifier(self, name, description, regex,
                                    keywords=None, ignore_words=None,
                                    data_identifier_type='REGEX',
                                    severity='MEDIUM'):
        """Crear identificador de datos personalizado"""
        
        try:
            identifier_config = {
                'name': name,
                'description': description,
                'regex': regex,
                'dataIdentifierType': data_identifier_type,
                'severity': severity
            }
            
            if keywords:
                identifier_config['keywords'] = keywords
            
            if ignore_words:
                identifier_config['ignoreWords'] = ignore_words
            
            response = self.macie2.create_custom_data_identifier(**identifier_config)
            
            return {
                'success': True,
                'id': response['id'],
                'arn': response['arn'],
                'name': name,
                'description': description,
                'regex': regex,
                'severity': severity
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_allow_list(self, name, description, criteria, tags=None):
        """Crear lista de permitidos para reducir falsos positivos"""
        
        try:
            allow_list_config = {
                'name': name,
                'description': description,
                'criteria': criteria
            }
            
            if tags:
                allow_list_config['tags'] = tags
            
            response = self.macie2.create_allow_list(**allow_list_config)
            
            return {
                'success': True,
                'id': response['id'],
                'arn': response['arn'],
                'name': name,
                'description': description
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_classification_job(self, job_id):
        """Obtener detalles de trabajo de clasificación"""
        
        try:
            response = self.macie2.get_classification_job(jobId=job_id)
            
            job = response['job']
            
            job_details = {
                'job_id': job['jobId'],
                'job_arn': job['jobArn'],
                'job_type': job['jobType'],
                'status': job['jobStatus'],
                'created_at': job.get('createdAt', '').isoformat() if job.get('createdAt') else '',
                'started_at': job.get('startedAt', '').isoformat() if job.get('startedAt') else '',
                'completed_at': job.get('completedAt', '').isoformat() if job.get('completedAt') else '',
                'name': job.get('name', ''),
                'bucket_definitions': job.get('bucketDefinitions', []),
                'statistics': job.get('statistics', {}),
                'user_paused_details': job.get('userPausedDetails', {}),
                'last_run_error_status': job.get('lastRunErrorStatus', {})
            }
            
            return {
                'success': True,
                'job_details': job_details
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_classification_jobs(self, filter_criteria=None, sort_criteria=None,
                               max_results=100, next_token=None):
        """Listar trabajos de clasificación"""
        
        try:
            params = {'maxResults': max_results}
            
            if filter_criteria:
                params['filterCriteria'] = filter_criteria
            
            if sort_criteria:
                params['sortCriteria'] = sort_criteria
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.macie2.list_classification_jobs(**params)
            
            jobs = []
            for job in response['items']:
                job_info = {
                    'job_id': job['jobId'],
                    'job_type': job['jobType'],
                    'status': job['jobStatus'],
                    'created_at': job.get('createdAt', '').isoformat() if job.get('createdAt') else '',
                    'name': job.get('name', ''),
                    'bucket_count': len(job.get('bucketDefinitions', []))
                }
                jobs.append(job_info)
            
            return {
                'success': True,
                'jobs': jobs,
                'count': len(jobs),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_sensitive_data_discovery_statistics(self):
        """Obtener estadísticas de descubrimiento de datos sensibles"""
        
        try:
            response = self.macie2.get_sensitive_data_discovery_statistics()
            
            statistics = {
                'sensitive_data_discovery': response.get('sensitiveDataDiscovery', {}),
                'classification_scope': response.get('classificationScope', {}),
                'bucket_count': response.get('bucketCount', 0),
                'object_count': response.get('objectCount', 0)
            }
            
            return {
                'success': True,
                'statistics': statistics
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_sensitive_data_occurrences(self, finding_id):
        """Obtener ocurrencias de datos sensibles"""
        
        try:
            response = self.macie2.get_sensitive_data_occurrences(
                findingId=finding_id
            )
            
            occurrences = []
            for occurrence in response.get('sensitiveDataOccurrences', []):
                occurrence_info = {
                    'cell_reference': occurrence.get('cellReference', ''),
                    'column': occurrence.get('column', 0),
                    'row': occurrence.get('row', 0),
                    'value': occurrence.get('value', ''),
                    'page_number': occurrence.get('pageNumber', 0),
                    'offset': occurrence.get('offset', 0),
                    'record_index': occurrence.get('recordIndex', 0)
                }
                occurrences.append(occurrence_info)
            
            return {
                'success': True,
                'finding_id': finding_id,
                'occurrences': occurrences,
                'count': len(occurrences)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_findings(self, finding_criteria=None, sort_criteria=None,
                    max_results=100, next_token=None):
        """Obtener hallazgos de Macie"""
        
        try:
            params = {'maxResults': max_results}
            
            if finding_criteria:
                params['findingCriteria'] = finding_criteria
            
            if sort_criteria:
                params['sortCriteria'] = sort_criteria
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.macie2.get_findings(**params)
            
            findings = []
            for finding in response.get('findings', []):
                finding_info = self._format_finding(finding)
                findings.append(finding_info)
            
            return {
                'success': True,
                'findings': findings,
                'count': len(findings),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _format_finding(self, finding):
        """Formatear hallazgo para mejor legibilidad"""
        
        return {
            'id': finding.get('id', ''),
            'arn': finding.get('arn', ''),
            'classification_details': {
                'job_id': finding.get('classificationDetails', {}).get('jobId', ''),
                'job_arn': finding.get('classificationDetails', {}).get('jobArn', ''),
                'result': finding.get('classificationDetails', {}).get('result', {})
            },
            'data_at_rest': {
                'classified_at': finding.get('dataAtRest', {}).get('classifiedAt', '').isoformat() if finding.get('dataAtRest', {}).get('classifiedAt') else '',
                'object': finding.get('dataAtRest', {}).get('object', {}),
                'sensitive_data': finding.get('dataAtRest', {}).get('sensitiveData', {}),
                'size': finding.get('dataAtRest', {}).get('size', 0)
            },
            'resources_affected': {
                's3_bucket': finding.get('resourcesAffected', {}).get('s3Bucket', {}),
                's3_object': finding.get('resourcesAffected', {}).get('s3Object', {})
            },
            'severity': {
                'score': finding.get('severity', {}).get('score', 0),
                'description': finding.get('severity', {}).get('description', '')
            },
            'type': finding.get('type', ''),
            'created_at': finding.get('createdAt', '').isoformat() if finding.get('createdAt') else '',
            'updated_at': finding.get('updatedAt', '').isoformat() if finding.get('updatedAt') else ''
        }
    
    def update_classification_job(self, job_id, job_status=None, job_arn=None):
        """Actualizar trabajo de clasificación"""
        
        try:
            update_params = {'jobId': job_id}
            
            if job_status:
                update_params['jobStatus'] = job_status
            
            if job_arn:
                update_params['jobArn'] = job_arn
            
            response = self.macie2.update_classification_job(**update_params)
            
            return {
                'success': True,
                'job_id': job_id,
                'job_status': job_status,
                'updated': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_member_account(self, account_id, email, invitation_message=None):
        """Crear cuenta miembro"""
        
        try:
            member_params = {
                'account': {
                    'accountId': account_id,
                    'email': email
                }
            }
            
            if invitation_message:
                member_params['invitationMessage'] = invitation_message
            
            response = self.macie2.create_member(**member_params)
            
            return {
                'success': True,
                'account_id': account_id,
                'email': email,
                'relationship_status': 'Created'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_member_account(self, account_id):
        """Obtener información de cuenta miembro"""
        
        try:
            response = self.macie2.get_member(accountId=account_id)
            
            member_info = {
                'account_id': response['member']['accountId'],
                'email': response['member']['email'],
                'relationship_status': response['member']['relationshipStatus'],
                'invited_at': response['member'].get('invitedAt', '').isoformat() if response['member'].get('invitedAt') else '',
                'updated_at': response['member'].get('updatedAt', '').isoformat() if response['member'].get('updatedAt') else ''
            }
            
            return {
                'success': True,
                'member_info': member_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_member_accounts(self, max_results=100, next_token=None):
        """Listar cuentas miembro"""
        
        try:
            params = {'maxResults': max_results}
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.macie2.list_members(**params)
            
            members = []
            for member in response.get('members', []):
                member_info = {
                    'account_id': member['accountId'],
                    'email': member['email'],
                    'relationship_status': member['relationshipStatus'],
                    'invited_at': member.get('invitedAt', '').isoformat() if member.get('invitedAt') else '',
                    'updated_at': member.get('updatedAt', '').isoformat() if member.get('updatedAt') else ''
                }
                members.append(member_info)
            
            return {
                'success': True,
                'members': members,
                'count': len(members),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_findings_filter(self, action, description, finding_criteria,
                             name, tags=None):
        """Crear filtro de hallazgos"""
        
        try:
            filter_config = {
                'action': action,
                'description': description,
                'findingCriteria': finding_criteria,
                'name': name
            }
            
            if tags:
                filter_config['tags'] = tags
            
            response = self.macie2.create_findings_filter(**filter_config)
            
            return {
                'success': True,
                'filter_id': response['id'],
                'filter_arn': response['arn'],
                'name': name,
                'action': action
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_findings_filter(self, filter_id, action=None, description=None,
                             finding_criteria=None, name=None):
        """Actualizar filtro de hallazgos"""
        
        try:
            update_params = {'id': filter_id}
            
            if action:
                update_params['action'] = action
            
            if description:
                update_params['description'] = description
            
            if finding_criteria:
                update_params['findingCriteria'] = finding_criteria
            
            if name:
                update_params['name'] = name
            
            response = self.macie2.update_findings_filter(**update_params)
            
            return {
                'success': True,
                'filter_id': filter_id,
                'updated': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_findings_filter(self, filter_id):
        """Obtener filtro de hallazgos"""
        
        try:
            response = self.macie2.get_findings_filter(id=filter_id)
            
            filter_info = {
                'id': response['id'],
                'arn': response['arn'],
                'action': response['action'],
                'description': response['description'],
                'finding_criteria': response['findingCriteria'],
                'name': response['name'],
                'created_at': response.get('createdAt', '').isoformat() if response.get('createdAt') else '',
                'updated_at': response.get('updatedAt', '').isoformat() if response.get('updatedAt') else ''
            }
            
            return {
                'success': True,
                'filter_info': filter_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_macie_report(self, report_type='summary', time_range_days=30):
        """Generar reporte de Macie"""
        
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
            
            if report_type == 'summary':
                # Obtener estadísticas generales
                stats_response = self.get_sensitive_data_discovery_statistics()
                if stats_response['success']:
                    report['discovery_statistics'] = stats_response['statistics']
                
                # Obtener hallazgos recientes
                finding_criteria = {
                    'criterion': {
                        'createdAt': {
                            'dateRange': {
                                'unit': 'DAYS',
                                'value': time_range_days
                            }
                        }
                    }
                }
                
                findings_response = self.get_findings(
                    finding_criteria=finding_criteria,
                    max_results=1000
                )
                
                if findings_response['success']:
                    findings = findings_response['findings']
                    report['findings_summary'] = self._analyze_findings_summary(findings)
            
            elif report_type == 'detailed':
                # Reporte detallado con análisis completo
                findings_response = self.get_findings(max_results=1000)
                
                if findings_response['success']:
                    findings = findings_response['findings']
                    report['detailed_findings'] = findings
                    report['data_type_analysis'] = self._analyze_data_types(findings)
                    report['risk_assessment'] = self._assess_risk_levels(findings)
            
            elif report_type == 'compliance':
                # Reporte de cumplimiento
                report['compliance_assessment'] = self._assess_compliance()
                report['data_location_analysis'] = self._analyze_data_locations()
                report['access_patterns'] = self._analyze_access_patterns()
            
            return {
                'success': True,
                'macie_report': report
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _analyze_findings_summary(self, findings):
        """Analizar resumen de hallazgos"""
        
        summary = {
            'total_findings': len(findings),
            'by_severity': {},
            'by_data_type': {},
            'by_bucket': {},
            'high_risk_findings': 0,
            'recent_findings': 0
        }
        
        current_time = datetime.utcnow()
        recent_threshold = current_time - timedelta(days=7)
        
        for finding in findings:
            # Agrupar por severidad
            severity_score = finding['severity']['score']
            if severity_score >= 70:
                severity_level = 'HIGH'
                summary['high_risk_findings'] += 1
            elif severity_score >= 40:
                severity_level = 'MEDIUM'
            else:
                severity_level = 'LOW'
            
            if severity_level not in summary['by_severity']:
                summary['by_severity'][severity_level] = 0
            summary['by_severity'][severity_level] += 1
            
            # Agrupar por tipo de dato
            sensitive_data = finding['data_at_rest'].get('sensitiveData', {})
            for data_type in sensitive_data.get('dataTypes', []):
                type_name = data_type.get('type', 'UNKNOWN')
                if type_name not in summary['by_data_type']:
                    summary['by_data_type'][type_name] = 0
                summary['by_data_type'][type_name] += 1
            
            # Agrupar por bucket
            bucket_name = finding['resources_affected'].get('s3Bucket', {}).get('name', '')
            if bucket_name:
                if bucket_name not in summary['by_bucket']:
                    summary['by_bucket'][bucket_name] = 0
                summary['by_bucket'][bucket_name] += 1
            
            # Hallazgos recientes
            created_at = datetime.fromisoformat(finding['created_at'].replace('Z', '+00:00'))
            if created_at >= recent_threshold:
                summary['recent_findings'] += 1
        
        return summary
    
    def _analyze_data_types(self, findings):
        """Analizar tipos de datos sensibles"""
        
        data_type_analysis = {
            'most_common_types': {},
            'risk_by_type': {},
            'location_distribution': {},
            'total_sensitive_objects': 0
        }
        
        type_counts = {}
        type_risks = {}
        
        for finding in findings:
            sensitive_data = finding['data_at_rest'].get('sensitiveData', {})
            
            for data_type in sensitive_data.get('dataTypes', []):
                type_name = data_type.get('type', 'UNKNOWN')
                severity = finding['severity']['score']
                
                # Contar tipos
                if type_name not in type_counts:
                    type_counts[type_name] = 0
                type_counts[type_name] += 1
                
                # Acumular riesgo por tipo
                if type_name not in type_risks:
                    type_risks[type_name] = []
                type_risks[type_name].append(severity)
                
                data_type_analysis['total_sensitive_objects'] += 1
        
        # Calcular estadísticas
        for type_name, count in type_counts.items():
            data_type_analysis['most_common_types'][type_name] = count
            if type_risks[type_name]:
                avg_risk = sum(type_risks[type_name]) / len(type_risks[type_name])
                data_type_analysis['risk_by_type'][type_name] = avg_risk
        
        return data_type_analysis
    
    def _assess_risk_levels(self, findings):
        """Evaluar niveles de riesgo"""
        
        risk_assessment = {
            'overall_risk_level': 'LOW',
            'risk_distribution': {
                'HIGH': 0,
                'MEDIUM': 0,
                'LOW': 0
            },
            'risk_trends': {},
            'recommendations': []
        }
        
        high_risk_count = 0
        medium_risk_count = 0
        low_risk_count = 0
        
        for finding in findings:
            severity_score = finding['severity']['score']
            
            if severity_score >= 70:
                high_risk_count += 1
            elif severity_score >= 40:
                medium_risk_count += 1
            else:
                low_risk_count += 1
        
        risk_assessment['risk_distribution'] = {
            'HIGH': high_risk_count,
            'MEDIUM': medium_risk_count,
            'LOW': low_risk_count
        }
        
        # Determinar nivel de riesgo general
        if high_risk_count > 10:
            risk_assessment['overall_risk_level'] = 'CRITICAL'
        elif high_risk_count > 0 or medium_risk_count > 50:
            risk_assessment['overall_risk_level'] = 'HIGH'
        elif medium_risk_count > 10:
            risk_assessment['overall_risk_level'] = 'MEDIUM'
        else:
            risk_assessment['overall_risk_level'] = 'LOW'
        
        # Generar recomendaciones
        if high_risk_count > 0:
            risk_assessment['recommendations'].append({
                'priority': 'CRITICAL',
                'action': 'Review and remediate high-risk findings immediately',
                'details': f'{high_risk_count} high-risk findings detected'
            })
        
        if medium_risk_count > 20:
            risk_assessment['recommendations'].append({
                'priority': 'HIGH',
                'action': 'Review medium-risk findings within 7 days',
                'details': f'{medium_risk_count} medium-risk findings detected'
            })
        
        return risk_assessment
    
    def _assess_compliance(self):
        """Evaluar cumplimiento normativo"""
        
        compliance_assessment = {
            'gdpr_compliance': {
                'status': 'COMPLIANT',
                'findings': 0,
                'recommendations': []
            },
            'ccpa_compliance': {
                'status': 'COMPLIANT',
                'findings': 0,
                'recommendations': []
            },
            'hipaa_compliance': {
                'status': 'COMPLIANT',
                'findings': 0,
                'recommendations': []
            },
            'pci_dss_compliance': {
                'status': 'COMPLIANT',
                'findings': 0,
                'recommendations': []
            }
        }
        
        # Obtener hallazgos relevantes para cumplimiento
        finding_criteria = {
            'criterion': {
                'type': {
                    'eq': 'SensitiveData:S3Object/Multiple'
                }
            }
        }
        
        findings_response = self.get_findings(finding_criteria=finding_criteria)
        
        if findings_response['success']:
            findings = findings_response['findings']
            
            for finding in findings:
                data_types = finding['data_at_rest'].get('sensitiveData', {}).get('dataTypes', [])
                
                for data_type in data_types:
                    type_name = data_type.get('type', '').upper()
                    
                    if 'FINANCIAL' in type_name or 'CREDIT_CARD' in type_name:
                        compliance_assessment['pci_dss_compliance']['findings'] += 1
                        compliance_assessment['pci_dss_compliance']['status'] = 'NON_COMPLIANT'
                    
                    if 'HEALTH' in type_name or 'MEDICAL' in type_name:
                        compliance_assessment['hipaa_compliance']['findings'] += 1
                        compliance_assessment['hipaa_compliance']['status'] = 'REVIEW_NEEDED'
                    
                    if 'PERSONAL' in type_name or 'PII' in type_name:
                        compliance_assessment['gdpr_compliance']['findings'] += 1
                        compliance_assessment['ccpa_compliance']['findings'] += 1
        
        return compliance_assessment
    
    def _analyze_data_locations(self):
        """Analizar ubicaciones de datos"""
        
        # Obtener estadísticas de descubrimiento
        stats_response = self.get_sensitive_data_discovery_statistics()
        
        location_analysis = {
            'total_buckets_with_sensitive_data': 0,
            'total_objects_with_sensitive_data': 0,
            'bucket_risk_distribution': {},
            'geographic_distribution': {},
            'accessibility_analysis': {}
        }
        
        if stats_response['success']:
            stats = stats_response['statistics']
            location_analysis['total_buckets_with_sensitive_data'] = stats.get('bucketCount', 0)
            location_analysis['total_objects_with_sensitive_data'] = stats.get('objectCount', 0)
        
        return location_analysis
    
    def _analyze_access_patterns(self):
        """Analizar patrones de acceso"""
        
        # Esta función analizaría patrones de acceso a datos sensibles
        # Requiere integración con CloudTrail y análisis de logs
        
        access_patterns = {
            'total_access_events': 0,
            'unusual_access_patterns': 0,
            'high_risk_access': 0,
            'access_by_user_type': {},
            'access_by_time': {},
            'access_by_location': {}
        }
        
        return access_patterns
    
    def setup_macie_monitoring(self, sns_topic_arn=None, security_hub_enabled=True):
        """Configurar monitoreo de Macie"""
        
        try:
            monitoring_setup = {
                'sns_topic_arn': None,
                'security_hub_enabled': False,
                'findings_filters': [],
                'automated_responses': []
            }
            
            # Crear o usar SNS topic
            if sns_topic_arn:
                monitoring_setup['sns_topic_arn'] = sns_topic_arn
            else:
                # Crear nuevo SNS topic
                topic_response = self.sns.create_topic(
                    Name='macie-alerts',
                    Tags=[
                        {'Key': 'Service', 'Value': 'Macie'},
                        {'Key': 'Purpose', 'Value': 'SecurityAlerts'}
                    ]
                )
                monitoring_setup['sns_topic_arn'] = topic_response['TopicArn']
            
            # Habilitar Security Hub
            if security_hub_enabled:
                try:
                    self.securityhub.enable_security_hub()
                    monitoring_setup['security_hub_enabled'] = True
                except Exception:
                    pass
            
            # Crear filtros de hallazgos
            high_risk_filter = self.create_findings_filter(
                action='ARCHIVE',
                description='Archive low severity findings',
                finding_criteria={
                    'criterion': {
                        'severity': {
                            'lt': 40
                        }
                    }
                },
                name='macie-low-severity-filter'
            )
            
            if high_risk_filter['success']:
                monitoring_setup['findings_filters'].append(high_risk_filter['filter_id'])
            
            return {
                'success': True,
                'monitoring_setup': monitoring_setup
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Habilitar y Configurar Macie**
```python
# Ejemplo: Habilitar AWS Macie
manager = MacieManager('us-east-1')

# Habilitar Macie
enable_result = manager.enable_macie(
    finding_publishing_frequency='FIFTEEN_MINUTES',
    status='ENABLED'
)

if enable_result['success']:
    print("AWS Macie enabled successfully")
    
    # Configurar monitoreo
    monitoring_result = manager.setup_macie_monitoring(
        security_hub_enabled=True
    )
    
    if monitoring_result['success']:
        setup = monitoring_result['monitoring_setup']
        print(f"Monitoring configured with Security Hub: {setup['security_hub_enabled']}")
```

### **2. Crear Trabajo de Clasificación**
```python
# Ejemplo: Crear trabajo de clasificación para bucket S3
job_result = manager.create_s3_bucket_classification_job(
    account_id='123456789012',
    bucket_name='sensitive-data-bucket',
    job_type='SCHEDULED',
    schedule_frequency='DAILY',
    sampling_percentage=100
)

if job_result['success']:
    print(f"Classification job created: {job_result['job_id']}")
    
    # Monitorear estado del trabajo
    time.sleep(60)  # Esperar a que inicie
    
    job_details = manager.get_classification_job(job_result['job_id'])
    if job_details['success']:
        print(f"Job status: {job_details['job_details']['status']}")
```

### **3. Crear Identificador de Datos Personalizado**
```python
# Ejemplo: Crear identificador para números de empleado
custom_identifier_result = manager.create_custom_data_identifier(
    name='employee-id-number',
    description='Detects employee ID numbers in format EMP-XXXXX',
    regex=r'EMP-\d{5}',
    keywords=['employee', 'id', 'number', 'staff'],
    severity='MEDIUM'
)

if custom_identifier_result['success']:
    print(f"Custom data identifier created: {custom_identifier_result['id']}")
```

### **4. Analizar Hallazgos**
```python
# Ejemplo: Obtener y analizar hallazgos
findings_result = manager.get_findings(max_results=100)

if findings_result['success']:
    findings = findings_result['findings']
    print(f"Found {len(findings)} Macie findings")
    
    # Analizar hallazgos de alto riesgo
    high_risk_findings = [f for f in findings if f['severity']['score'] >= 70]
    if high_risk_findings:
        print(f"HIGH RISK: {len(high_risk_findings)} findings require attention")
        
        for finding in high_risk_findings[:3]:  # Mostrar primeros 3
            print(f"  - Finding: {finding['id']}")
            print(f"    Severity: {finding['severity']['score']}")
            print(f"    Bucket: {finding['resources_affected'].get('s3Bucket', {}).get('name', 'Unknown')}")
```

### **5. Generar Reporte de Cumplimiento**
```python
# Ejemplo: Generar reporte de cumplimiento GDPR
report_result = manager.generate_macie_report(
    report_type='compliance',
    time_range_days=30
)

if report_result['success']:
    report = report_result['macie_report']
    compliance = report['compliance_assessment']
    
    print("Compliance Assessment")
    print(f"GDPR Status: {compliance['gdpr_compliance']['status']}")
    print(f"HIPAA Status: {compliance['hipaa_compliance']['status']}")
    print(f"PCI DSS Status: {compliance['pci_dss_compliance']['status']}")
    print(f"CCPA Status: {compliance['ccpa_compliance']['status']}")
```

## Configuración con AWS CLI

### **Habilitar y Configurar Macie**
```bash
# Habilitar Macie
aws macie2 enable-macie \
  --finding-publishing-frequency FIFTEEN_MINUTES \
  --status ENABLED

# Obtener estado de Macie
aws macie2 get-macie-session

# Deshabilitar Macie
aws macie2 disable-macie
```

### **Gestión de Trabajos de Clasificación**
```bash
# Crear trabajo de clasificación
aws macie2 create-classification-job \
  --job-type ONE_TIME \
  --name "sensitive-data-scan" \
  --sampling-percentage 100 \
  --bucket-definition accountId=123456789012,buckets=[{name=my-sensitive-bucket}]

# Listar trabajos de clasificación
aws macie2 list-classification-jobs

# Obtener detalles de trabajo
aws macie2 get-classification-job --job-id job-id

# Actualizar trabajo (pausar/reanudar)
aws macie2 update-classification-job \
  --job-id job-id \
  --job-status PAUSED
```

### **Gestión de Identificadores de Datos**
```bash
# Crear identificador de datos personalizado
aws macie2 create-custom-data-identifier \
  --name "employee-id" \
  --description "Employee ID numbers" \
  --regex "EMP-\\d{5}" \
  --keywords "employee,id,staff"

# Listar identificadores de datos
aws macie2 list-custom-data-identifiers

# Obtener detalles de identificador
aws macie2 get-custom-data-identifier --id identifier-id
```

### **Gestión de Hallazgos**
```bash
# Obtener hallazgos
aws macie2 get-findings \
  --finding-attributes id,severity,type,createdAt

# Crear filtro de hallazgos
aws macie2 create-findings-filter \
  --name "high-severity-filter" \
  --action ARCHIVE \
  --description "Archive low severity findings" \
  --finding-attributes severity

# Actualizar filtro de hallazgos
aws macie2 update-findings-filter \
  --id filter-id \
  --action ARCHIVE
```

### **Gestión Multi-Cuenta**
```bash
# Crear cuenta miembro
aws macie2 create-member \
  --account accountId=123456789012,email=member@example.com

# Listar cuentas miembro
aws macie2 list-members

# Obtener información de cuenta miembro
aws macie2 get-member --account-id 123456789012
```

## Best Practices

### **1. Configuración Inicial**
- Habilitar Macie en todas las regiones relevantes
- Configurar frecuencia de publicación adecuada
- Integrar con Security Hub para vista centralizada
- Establecer alertas para hallazgos críticos

### **2. Gestión de Trabajos de Clasificación**
- Configurar trabajos programados para monitoreo continuo
- Usar sampling apropiado para buckets grandes
- Priorizar buckets con datos sensibles conocidos
- Configurar exclusiones para datos no sensibles

### **3. Identificadores de Datos**
- Usar identificadores gestionados para datos comunes
- Crear identificadores personalizados para datos específicos
- Regularizar revisión y ajuste de patrones
- Documentar propósito y uso de cada identificador

### **4. Monitoreo y Respuesta**
- Configurar alertas para hallazgos de alta severidad
- Automatizar respuestas para hallazgos conocidos
- Integrar con sistemas de ticketing
- Regularizar revisión de hallazgos falsos positivos

## Costos

### **Precios de AWS Macie**
- **S3 Objects**: $5 por 100,000 objetos evaluados por mes
- **Custom Data Identifiers**: $1 por 100,000 evaluaciones por mes
- **S3 Storage**: $0.10 por GB de datos de Macie por mes
- **Member Accounts**: $10 por cuenta miembro por mes

### **Ejemplo de Costos Mensuales**
- **1M S3 objects**: 10 × $5 = $50.00
- **Custom identifiers**: 5 × $1 = $5.00
- **Macie storage**: 10 GB × $0.10 = $1.00
- **Member accounts**: 5 × $10 = $50.00
- **Total estimado**: ~$106.00 por mes

## Troubleshooting

### **Problemas Comunes**
1. **Macie no habilita**: Verificar permisos y región
2. **Trabajos no inician**: Revisar configuración de bucket y permisos
3. **No hay hallazgos**: Verificar configuración de identificadores
4. **Falsos positivos**: Configurar allow lists y ajustar patrones

### **Comandos de Diagnóstico**
```bash
# Verificar estado de Macie
aws macie2 get-macie-session

# Verificar estado de trabajo
aws macie2 get-classification-job --job-id job-id

# Verificar estadísticas de descubrimiento
aws macie2 get-sensitive-data-discovery-statistics

# Verificar hallazgos recientes
aws macie2 get-findings --finding-attributes id,severity,createdAt
```

## Cumplimiento Normativo

### **GDPR**
- **Artículo 30**: Registro de actividades de tratamiento
- **Artículo 32**: Seguridad del tratamiento
- **Artículo 33**: Notificación de brechas
- **Artículo 34**: Comunicación de brechas

### **CCPA**
- **Right to Know**: Derecho a saber qué datos se recopilan
- **Right to Delete**: Derecho a eliminar datos
- **Right to Opt-Out**: Derecho a optar por no participar
- **Data Minimization**: Minimización de datos

### **HIPAA**
- **Security Rule**: Regla de seguridad técnica
- **Privacy Rule**: Regla de privacidad
- **Breach Notification**: Notificación de brechas
- **Access Controls**: Controles de acceso

### **PCI-DSS**
- **Requirement 3**: Protección de datos de titulares de tarjetas
- **Requirement 7**: Restricción de acceso a datos
- **Requirement 10**: Monitoreo y logging
- **Requirement 11**: Pruebas de seguridad

## Integración con Otros Servicios

### **AWS Security Hub**
- **Centralización**: Vista centralizada de hallazgos
- **Correlation**: Correlación de hallazgos entre servicios
- **Compliance**: Cumplimiento con estándares
- **Automation**: Automatización de respuestas

### **AWS CloudTrail**
- **API Logging**: Logs de accesos a datos sensibles
- **Event History**: Historial de eventos
- **Integration**: Integración con hallazgos de Macie
- **Auditing**: Auditoría de accesos

### **AWS Lambda**
- **Custom Processing**: Procesamiento personalizado de hallazgos
- **Automation**: Automatización de respuestas
- **Integration**: Integración con otros servicios
- **Remediation**: Remediación automatizada

### **AWS SNS**
- **Real-time Alerts**: Alertas en tiempo real
- **Multi-channel**: Múltiples canales de notificación
- **Integration**: Integración con sistemas externos
- **Customization**: Personalización de alertas

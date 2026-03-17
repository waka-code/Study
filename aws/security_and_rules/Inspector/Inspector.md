# AWS Inspector

## Definición

AWS Inspector es un servicio de evaluación de seguridad que automatiza el proceso de evaluación de la seguridad y conformidad de las aplicaciones desplegadas en AWS. Proporciona análisis de seguridad automatizados para identificar vulnerabilidades, desviaciones de seguridad y mejores prácticas no seguras en tus recursos de AWS.

## Características Principales

### **Evaluaciones Automatizadas**
- **Análisis de seguridad**: Evaluación automática de vulnerabilidades
- **Evaluación de conformidad**: Verificación contra estándares de seguridad
- **Análisis de comportamiento**: Detección de comportamientos anómalos
- **Evaluación continua**: Monitoreo continuo de seguridad
- **Resultados detallados**: Informes detallados de hallazgos

### **Cobertura Integral**
- **Instancias EC2**: Evaluación de seguridad de instancias
- **Contenedores**: Análisis de seguridad de contenedores
- **Lambda Functions**: Evaluación de seguridad de funciones Lambda
- **Redes**: Análisis de configuración de red
- **Aplicaciones**: Evaluación de seguridad de aplicaciones

### **Integración Nativa**
- **AWS Security Hub**: Centralización de hallazgos
- **AWS Systems Manager**: Integración con gestión de sistemas
- **AWS CloudTrail**: Auditoría de evaluaciones
- **AWS Lambda**: Automatización de respuestas
- **Third-party Tools**: Integración con herramientas externas

## Tipos de Evaluaciones

### **1. Network Reachability**
- **Análisis de red**: Evaluación de conectividad de red
- **Puertos abiertos**: Detección de puertos expuestos
- **Configuración de firewall**: Evaluación de reglas de seguridad
- **Vulnerabilidades de red**: Identificación de vulnerabilidades de red
- **Acceso no autorizado**: Detección de accesos no autorizados

### **2. Host Assessment**
- **Configuración del sistema**: Evaluación de configuración del SO
- **Vulnerabilidades del sistema**: Detección de vulnerabilidades conocidas
- **Software instalado**: Análisis de software y parches
- **Configuración de seguridad**: Evaluación de configuraciones de seguridad
- **Permisos de usuario**: Análisis de permisos y accesos

### **3. Application Assessment**
- **Configuración de aplicaciones**: Evaluación de configuración de apps
- **Vulnerabilidades de aplicación**: Detección de vulnerabilidades web
- **Dependencias**: Análisis de dependencias y librerías
- **Configuración de base de datos**: Evaluación de seguridad de DB
- **API Security**: Evaluación de seguridad de APIs

### **4. Container Assessment**
- **Imágenes de contenedor**: Análisis de seguridad de imágenes
- **Configuración de Kubernetes**: Evaluación de configuración de K8s
- **Vulnerabilidades de contenedor**: Detección de vulnerabilidades
- **Red de contenedores**: Análisis de red de contenedores
- **Políticas de seguridad**: Evaluación de políticas de seguridad

## Arquitectura de AWS Inspector

### **Componentes Principales**
```
AWS Inspector Architecture
├── Assessment Engine
│   ├── Network Assessments
│   ├── Host Assessments
│   ├── Application Assessments
│   ├── Container Assessments
│   └── Custom Assessments
├── Data Collection
│   ├── EC2 Metadata
│   ├── Network Traffic
│   ├── System Configuration
│   ├── Application Data
│   └── Container Data
├── Analysis & Scoring
│   ├── Vulnerability Database
│   ├── Security Rules Engine
│   ├── Risk Scoring
│   ├── Compliance Checking
│   └── Anomaly Detection
├── Reporting & Alerting
│   ├── Findings Generation
│   ├── Severity Classification
│   ├── Report Generation
│   ├── Alert Delivery
│   └── Integration Hub
└── Management & Configuration
    ├── Assessment Templates
    ├── Target Selection
    ├── Schedule Management
    ├── Integration Setup
    └── Access Control
```

### **Flujo de Evaluación**
```
Target Selection → Data Collection → Security Analysis → Vulnerability Scoring → Finding Generation → Alert Delivery
```

## Configuración de AWS Inspector

### **Gestión Completa de AWS Inspector**
```python
import boto3
import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class InspectorManager:
    def __init__(self, region='us-east-1'):
        self.inspector = boto3.client('inspector', region_name=region)
        self.inspector2 = boto3.client('inspector2', region_name=region)
        self.ec2 = boto3.client('ec2', region_name=region)
        self.ssm = boto3.client('ssm', region_name=region)
        self.securityhub = boto3.client('securityhub', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.region = region
    
    def create_assessment_target(self, assessment_target_name, resource_group_arn):
        """Crear target de evaluación"""
        
        try:
            response = self.inspector.create_assessment_target(
                assessmentTargetName=assessment_target_name,
                resourceGroupArn=resource_group_arn
            )
            
            return {
                'success': True,
                'assessment_target_arn': response['assessmentTargetArn'],
                'assessment_target_name': assessment_target_name,
                'resource_group_arn': resource_group_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_resource_group(self, resource_group_name, resource_type_tags=None):
        """Crear grupo de recursos"""
        
        try:
            # Configurar tags para el grupo de recursos
            tags = []
            if resource_type_tags:
                for tag_key, tag_value in resource_type_tags.items():
                    tags.append({
                        'key': tag_key,
                        'value': tag_value
                    })
            
            response = self.inspector.create_resource_group(
                resourceGroupType='EC2_INSTANCE_TAG',
                tags=tags
            )
            
            return {
                'success': True,
                'resource_group_arn': response['resourceGroupArn'],
                'resource_group_name': resource_group_name,
                'tags': tags
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_assessment_template(self, assessment_template_name, assessment_target_arn,
                                 duration_in_seconds, rules_package_arns=None,
                                 user_attributes_for_findings=None):
        """Crear plantilla de evaluación"""
        
        try:
            # Si no se proporcionan paquetes de reglas, usar los por defecto
            if not rules_package_arns:
                rules_package_arns = self._get_default_rules_packages()
            
            response = self.inspector.create_assessment_template(
                assessmentTemplateName=assessment_template_name,
                assessmentTargetArn=assessment_target_arn,
                durationInSeconds=duration_in_seconds,
                rulesPackageArns=rules_package_arns,
                userAttributesForFindings=user_attributes_for_findings or []
            )
            
            return {
                'success': True,
                'assessment_template_arn': response['assessmentTemplateArn'],
                'assessment_template_name': assessment_template_name,
                'assessment_target_arn': assessment_target_arn,
                'duration_in_seconds': duration_in_seconds,
                'rules_package_arns': rules_package_arns
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_default_rules_packages(self):
        """Obtener paquetes de reglas por defecto"""
        
        try:
            response = self.inspector.list_rules_packages()
            return [package['arn'] for package in response['rulesPackageArns'][:5]]
        except Exception:
            return []
    
    def start_assessment_run(self, assessment_template_arn, assessment_run_name=None):
        """Iniciar ejecución de evaluación"""
        
        try:
            response = self.inspector.start_assessment_run(
                assessmentTemplateArn=assessment_template_arn,
                assessmentRunName=assessment_run_name
            )
            
            return {
                'success': True,
                'assessment_run_arn': response['assessmentRunArn'],
                'assessment_template_arn': assessment_template_arn,
                'assessment_run_name': assessment_run_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def stop_assessment_run(self, assessment_run_arn, stop_action='STOP_EVALUATION'):
        """Detener ejecución de evaluación"""
        
        try:
            response = self.inspector.stop_assessment_run(
                assessmentRunArn=assessment_run_arn,
                stopAction=stop_action
            )
            
            return {
                'success': True,
                'assessment_run_arn': assessment_run_arn,
                'stop_action': stop_action
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_assessment_runs(self, assessment_template_arn=None, max_results=100,
                           next_token=None):
        """Obtener ejecuciones de evaluación"""
        
        try:
            params = {'maxResults': max_results}
            
            if assessment_template_arn:
                params['assessmentTemplateArns'] = [assessment_template_arn]
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.inspector.list_assessment_runs(**params)
            
            assessment_runs = []
            for run in response['assessmentRunArns']:
                run_details = self.describe_assessment_run(run)
                if run_details['success']:
                    assessment_runs.append(run_details['run_details'])
            
            return {
                'success': True,
                'assessment_runs': assessment_runs,
                'count': len(assessment_runs),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_assessment_run(self, assessment_run_arn):
        """Describir ejecución de evaluación"""
        
        try:
            response = self.inspector.describe_assessment_run(
                assessmentRunArn=assessment_run_arn
            )
            
            run = response['assessmentRun']
            
            run_details = {
                'arn': run['arn'],
                'name': run.get('name', ''),
                'assessment_template_arn': run['assessmentTemplateArn'],
                'state': run['state'],
                'created_at': run.get('createdAt', '').isoformat() if run.get('createdAt') else '',
                'started_at': run.get('startedAt', '').isoformat() if run.get('startedAt') else '',
                'completed_at': run.get('completedAt', '').isoformat() if run.get('completedAt') else '',
                'state_changed_at': run.get('stateChangedAt', '').isoformat() if run.get('stateChangedAt') else '',
                'duration_in_seconds': run.get('durationInSeconds', 0),
                'user_attributes_for_findings': run.get('userAttributesForFindings', []),
                'finding_counts': run.get('findingCounts', {}),
                'data_collected': run.get('dataCollected', False),
                'state_changed_at': run.get('stateChangedAt', '').isoformat() if run.get('stateChangedAt') else ''
            }
            
            return {
                'success': True,
                'run_details': run_details
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_findings(self, assessment_run_arn=None, max_results=100, next_token=None):
        """Obtener hallazgos"""
        
        try:
            params = {'maxResults': max_results}
            
            if assessment_run_arn:
                params['assessmentRunArns'] = [assessment_run_arn]
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.inspector.list_findings(**params)
            
            findings = []
            for finding_arn in response['findingArns']:
                finding_details = self.describe_finding(finding_arn)
                if finding_details['success']:
                    findings.append(finding_details['finding_details'])
            
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
    
    def describe_finding(self, finding_arn):
        """Describir hallazgo"""
        
        try:
            response = self.inspector.describe_findings(
                findingArns=[finding_arn]
            )
            
            if response['findings']:
                finding = response['findings'][0]
                
                finding_details = {
                    'arn': finding['arn'],
                    'service_attributes': finding.get('serviceAttributes', {}),
                    'severity': finding.get('severity', ''),
                    'confidence': finding.get('confidence', 0),
                    'numeric_severity': finding.get('numericSeverity', 0),
                    'title': finding.get('title', ''),
                    'description': finding.get('description', ''),
                    'recommendation': finding.get('recommendation', ''),
                    'indicator_of_compromise': finding.get('indicatorOfCompromise', False),
                    'attributes': finding.get('attributes', []),
                    'user_attributes': finding.get('userAttributes', []),
                    'created_at': finding.get('createdAt', '').isoformat() if finding.get('createdAt') else '',
                    'updated_at': finding.get('updatedAt', '').isoformat() if finding.get('updatedAt') else ''
                }
                
                return {
                    'success': True,
                    'finding_details': finding_details
                }
            
            return {
                'success': False,
                'error': 'Finding not found'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_exclusions_preview(self, assessment_template_arn, exclusions):
        """Crear vista previa de exclusiones"""
        
        try:
            response = self.inspector.create_exclusions_preview(
                assessmentTemplateArn=assessment_template_arn
            )
            
            return {
                'success': True,
                'exclusions_preview_arn': response['exclusionsPreviewArn'],
                'assessment_template_arn': assessment_template_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_exclusions_preview(self, exclusions_preview_arn):
        """Obtener vista previa de exclusiones"""
        
        try:
            response = self.inspector.get_exclusions_preview(
                exclusionsPreviewArn=exclusions_preview_arn
            )
            
            return {
                'success': True,
                'exclusions_preview': response
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def subscribe_to_event(self, event, topic_arn):
        """Suscribirse a eventos de Inspector"""
        
        try:
            response = self.inspector.subscribe_to_event(
                event=event,
                topicArn=topic_arn
            )
            
            return {
                'success': True,
                'event': event,
                'topic_arn': topic_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def unsubscribe_from_event(self, event, topic_arn):
        """Cancelar suscripción a eventos de Inspector"""
        
        try:
            response = self.inspector.unsubscribe_from_event(
                event=event,
                topicArn=topic_arn
            )
            
            return {
                'success': True,
                'event': event,
                'topic_arn': topic_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_assessment_targets(self, max_results=100, next_token=None):
        """Obtener targets de evaluación"""
        
        try:
            params = {'maxResults': max_results}
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.inspector.list_assessment_targets(**params)
            
            assessment_targets = []
            for target in response['assessmentTargetArns']:
                target_details = self.describe_assessment_target(target)
                if target_details['success']:
                    assessment_targets.append(target_details['target_details'])
            
            return {
                'success': True,
                'assessment_targets': assessment_targets,
                'count': len(assessment_targets),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_assessment_target(self, assessment_target_arn):
        """Describir target de evaluación"""
        
        try:
            response = self.inspector.describe_assessment_targets(
                assessmentTargetArns=[assessment_target_arn]
            )
            
            if response['assessmentTargets']:
                target = response['assessmentTargets'][0]
                
                target_details = {
                    'arn': target['arn'],
                    'name': target['name'],
                    'resource_group_arn': target['resourceGroupArn'],
                    'created_at': target.get('createdAt', '').isoformat() if target.get('createdAt') else '',
                    'updated_at': target.get('updatedAt', '').isoformat() if target.get('updatedAt') else ''
                }
                
                return {
                    'success': True,
                    'target_details': target_details
                }
            
            return {
                'success': False,
                'error': 'Assessment target not found'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_assessment_templates(self, assessment_target_arn=None, max_results=100,
                                next_token=None):
        """Obtener plantillas de evaluación"""
        
        try:
            params = {'maxResults': max_results}
            
            if assessment_target_arn:
                params['assessmentTargetArns'] = [assessment_target_arn]
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.inspector.list_assessment_templates(**params)
            
            assessment_templates = []
            for template in response['assessmentTemplateArns']:
                template_details = self.describe_assessment_template(template)
                if template_details['success']:
                    assessment_templates.append(template_details['template_details'])
            
            return {
                'success': True,
                'assessment_templates': assessment_templates,
                'count': len(assessment_templates),
                'next_token': response.get('nextToken')
            }
            
        except Exception e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_assessment_template(self, assessment_template_arn):
        """Describir plantilla de evaluación"""
        
        try:
            response = self.inspector.describe_assessment_templates(
                assessmentTemplateArns=[assessment_template_arn]
            )
            
            if response['assessmentTemplates']:
                template = response['assessmentTemplates'][0]
                
                template_details = {
                    'arn': template['arn'],
                    'name': template['name'],
                    'assessment_target_arn': template['assessmentTargetArn'],
                    'duration_in_seconds': template['durationInSeconds'],
                    'rules_package_arns': template['rulesPackageArns'],
                    'user_attributes_for_findings': template.get('userAttributesForFindings', []),
                    'last_assessment_run_arn': template.get('lastAssessmentRunArn', ''),
                    'created_at': template.get('createdAt', '').isoformat() if template.get('createdAt') else '',
                    'assessment_run_count': template.get('assessmentRunCount', 0)
                }
                
                return {
                    'success': True,
                    'template_details': template_details
                }
            
            return {
                'success': False,
                'error': 'Assessment template not found'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_inspector_report(self, assessment_run_arn, report_type='finding'):
        """Generar reporte de evaluación"""
        
        try:
            # Obtener detalles de la evaluación
            run_details = self.describe_assessment_run(assessment_run_arn)
            if not run_details['success']:
                return run_details
            
            run = run_details['run_details']
            
            # Obtener hallazgos
            findings_response = self.get_findings(assessment_run_arn=assessment_run_arn)
            
            report = {
                'report_metadata': {
                    'assessment_run_arn': assessment_run_arn,
                    'report_type': report_type,
                    'generated_at': datetime.utcnow().isoformat(),
                    'assessment_template_arn': run['assessment_template_arn'],
                    'assessment_name': run['name']
                },
                'assessment_summary': {
                    'state': run['state'],
                    'duration_in_seconds': run['duration_in_seconds'],
                    'created_at': run['created_at'],
                    'started_at': run['started_at'],
                    'completed_at': run['completed_at'],
                    'finding_counts': run['finding_counts']
                },
                'findings_analysis': self._analyze_findings(findings_response['findings'] if findings_response['success'] else []),
                'recommendations': self._generate_recommendations(findings_response['findings'] if findings_response['success'] else [])
            }
            
            return {
                'success': True,
                'inspector_report': report
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _analyze_findings(self, findings):
        """Analizar hallazgos"""
        
        analysis = {
            'total_findings': len(findings),
            'by_severity': {},
            'by_confidence': {},
            'by_type': {},
            'high_priority_findings': [],
            'indicator_of_compromise': 0
        }
        
        for finding in findings:
            # Agrupar por severidad
            severity = finding.get('severity', 'INFORMATIONAL')
            if severity not in analysis['by_severity']:
                analysis['by_severity'][severity] = 0
            analysis['by_severity'][severity] += 1
            
            # Agrupar por confianza
            confidence = finding.get('confidence', 0)
            confidence_range = self._get_confidence_range(confidence)
            if confidence_range not in analysis['by_confidence']:
                analysis['by_confidence'][confidence_range] = 0
            analysis['by_confidence'][confidence_range] += 1
            
            # Agrupar por tipo (basado en título)
            finding_type = self._extract_finding_type(finding.get('title', ''))
            if finding_type not in analysis['by_type']:
                analysis['by_type'][finding_type] = 0
            analysis['by_type'][finding_type] += 1
            
            # Hallazgos de alta prioridad
            if severity in ['HIGH', 'CRITICAL']:
                analysis['high_priority_findings'].append({
                    'arn': finding['arn'],
                    'title': finding['title'],
                    'severity': severity,
                    'confidence': confidence
                })
            
            # Indicador de compromiso
            if finding.get('indicatorOfCompromise', False):
                analysis['indicator_of_compromise'] += 1
        
        return analysis
    
    def _get_confidence_range(self, confidence):
        """Obtener rango de confianza"""
        
        if confidence >= 80:
            return 'HIGH'
        elif confidence >= 60:
            return 'MEDIUM'
        elif confidence >= 40:
            return 'LOW'
        else:
            return 'VERY_LOW'
    
    def _extract_finding_type(self, title):
        """Extraer tipo de hallazgo del título"""
        
        title_lower = title.lower()
        
        if 'network' in title_lower or 'port' in title_lower:
            return 'NETWORK'
        elif 'vulnerability' in title_lower or 'cve' in title_lower:
            return 'VULNERABILITY'
        elif 'security' in title_lower or 'access' in title_lower:
            return 'SECURITY'
        elif 'configuration' in title_lower or 'setting' in title_lower:
            return 'CONFIGURATION'
        else:
            return 'OTHER'
    
    def _generate_recommendations(self, findings):
        """Generar recomendaciones basadas en hallazgos"""
        
        recommendations = []
        
        # Analizar hallazgos críticos
        critical_findings = [f for f in findings if f.get('severity') == 'CRITICAL']
        if critical_findings:
            recommendations.append({
                'priority': 'CRITICAL',
                'title': 'Address Critical Security Findings',
                'description': f'{len(critical_findings)} critical security findings require immediate attention',
                'action': 'Review and remediate all critical findings within 24 hours'
            })
        
        # Analizar hallazgos de alta severidad
        high_findings = [f for f in findings if f.get('severity') == 'HIGH']
        if high_findings:
            recommendations.append({
                'priority': 'HIGH',
                'title': 'Review High Severity Findings',
                'description': f'{len(high_findings)} high severity findings need attention',
                'action': 'Review and address high severity findings within 72 hours'
            })
        
        # Analizar indicadores de compromiso
        ioc_findings = [f for f in findings if f.get('indicatorOfCompromise', False)]
        if ioc_findings:
            recommendations.append({
                'priority': 'CRITICAL',
                'title': 'Investigate Indicators of Compromise',
                'description': f'{len(ioc_findings)} findings indicate potential compromise',
                'action': 'Immediately investigate and isolate affected systems'
            })
        
        # Recomendaciones basadas en tipos de hallazgos
        network_findings = [f for f in findings if 'network' in f.get('title', '').lower()]
        if len(network_findings) > 5:
            recommendations.append({
                'priority': 'MEDIUM',
                'title': 'Review Network Security Configuration',
                'description': 'Multiple network-related security findings detected',
                'action': 'Review and tighten network security group rules and firewall configurations'
            })
        
        return recommendations
    
    def setup_inspector_monitoring(self, assessment_template_arn, sns_topic_arn=None):
        """Configurar monitoreo de Inspector"""
        
        try:
            monitoring_setup = {
                'event_subscriptions': [],
                'sns_topic_arn': None,
                'assessment_schedules': []
            }
            
            # Crear o usar SNS topic
            if sns_topic_arn:
                monitoring_setup['sns_topic_arn'] = sns_topic_arn
            else:
                # Crear nuevo SNS topic
                topic_response = self.sns.create_topic(
                    Name='inspector-alerts',
                    Tags=[
                        {'Key': 'Service', 'Value': 'Inspector'},
                        {'Key': 'Purpose', 'Value': 'SecurityAlerts'}
                    ]
                )
                monitoring_setup['sns_topic_arn'] = topic_response['TopicArn']
            
            # Suscribirse a eventos
            events = [
                'ASSESSMENT_RUN_STARTED',
                'ASSESSMENT_RUN_COMPLETED',
                'ASSESSMENT_RUN_STATE_CHANGED',
                'FINDING_REPORTED'
            ]
            
            for event in events:
                try:
                    subscription_result = self.subscribe_to_event(event, monitoring_setup['sns_topic_arn'])
                    if subscription_result['success']:
                        monitoring_setup['event_subscriptions'].append(event)
                except Exception:
                    continue
            
            return {
                'success': True,
                'monitoring_setup': monitoring_setup,
                'assessment_template_arn': assessment_template_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def integrate_with_security_hub(self, assessment_run_arn):
        """Integrar hallazgos con Security Hub"""
        
        try:
            # Obtener hallazgos
            findings_response = self.get_findings(assessment_run_arn=assessment_run_arn)
            
            if not findings_response['success']:
                return findings_response
            
            findings = findings_response['findings']
            security_hub_findings = []
            
            for finding in findings:
                # Convertir hallazgo de Inspector a formato Security Hub
                security_hub_finding = self._convert_to_security_hub_format(finding)
                security_hub_findings.append(security_hub_finding)
            
            # Importar hallazgos a Security Hub
            if security_hub_findings:
                response = self.securityhub.batch_import_findings(
                    Findings=security_hub_findings
                )
                
                return {
                    'success': True,
                    'imported_count': len(response['FailedCount']) if 'FailedCount' in response else len(security_hub_findings),
                    'failed_count': response.get('FailedCount', 0),
                    'assessment_run_arn': assessment_run_arn
                }
            
            return {
                'success': True,
                'imported_count': 0,
                'assessment_run_arn': assessment_run_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _convert_to_security_hub_format(self, inspector_finding):
        """Convertir hallazgo de Inspector a formato Security Hub"""
        
        try:
            # Mapear severidad
            severity_mapping = {
                'CRITICAL': 'CRITICAL',
                'HIGH': 'HIGH',
                'MEDIUM': 'MEDIUM',
                'LOW': 'LOW',
                'INFORMATIONAL': 'INFORMATIONAL'
            }
            
            security_hub_finding = {
                'SchemaVersion': '2018-10-08',
                'Id': inspector_finding['arn'],
                'ProductArn': f'arn:aws:securityhub:{self.region}::product/aws/inspector',
                'GeneratorId': 'inspector-assessment',
                'AwsAccountId': '123456789012',  # Reemplazar con cuenta real
                'Types': ['Software and Configuration Checks/AWS Security Best Practices'],
                'FirstObservedAt': inspector_finding.get('created_at', ''),
                'LastObservedAt': inspector_finding.get('updated_at', ''),
                'Severity': {
                    'Label': severity_mapping.get(inspector_finding.get('severity', 'INFORMATIONAL'), 'INFORMATIONAL'),
                    'Normalized': self._normalize_severity(inspector_finding.get('severity', 'INFORMATIONAL'))
                },
                'Title': inspector_finding.get('title', 'Inspector Finding'),
                'Description': inspector_finding.get('description', ''),
                'Remediation': {
                    'Recommendation': {
                        'Text': inspector_finding.get('recommendation', 'Review and remediate the finding')
                    }
                },
                'ProductFields': {
                    'InspectorFindingArn': inspector_finding['arn'],
                    'InspectorConfidence': str(inspector_finding.get('confidence', 0)),
                    'InspectorNumericSeverity': str(inspector_finding.get('numeric_severity', 0))
                }
            }
            
            # Agregar recursos si están disponibles
            if inspector_finding.get('serviceAttributes', {}).get('resourceType'):
                resource_type = inspector_finding['serviceAttributes']['resourceType']
                security_hub_finding['Resources'] = [{
                    'Type': resource_type,
                    'Id': inspector_finding['serviceAttributes'].get('resourceId', ''),
                    'Partition': 'aws',
                    'Region': self.region
                }]
            
            return security_hub_finding
            
        except Exception:
            return None
    
    def _normalize_severity(self, severity):
        """Normalizar severidad para Security Hub"""
        
        severity_mapping = {
            'CRITICAL': 90,
            'HIGH': 70,
            'MEDIUM': 50,
            'LOW': 30,
            'INFORMATIONAL': 10
        }
        
        return severity_mapping.get(severity, 10)
```

## Casos de Uso

### **1. Configurar Evaluación Básica**
```python
# Ejemplo: Configurar evaluación básica de seguridad
manager = InspectorManager('us-east-1')

# Crear grupo de recursos
resource_group_result = manager.create_resource_group(
    resource_group_name='web-servers',
    resource_type_tags={
        'Environment': 'Production',
        'Type': 'WebServer'
    }
)

if resource_group_result['success']:
    # Crear target de evaluación
    target_result = manager.create_assessment_target(
        assessment_target_name='production-web-servers',
        resource_group_arn=resource_group_result['resource_group_arn']
    )
    
    if target_result['success']:
        # Crear plantilla de evaluación
        template_result = manager.create_assessment_template(
            assessment_template_name='web-server-security-scan',
            assessment_target_arn=target_result['assessment_target_arn'],
            duration_in_seconds=3600  # 1 hora
        )
        
        if template_result['success']:
            print("Inspector assessment template created successfully")
```

### **2. Ejecutar Evaluación de Seguridad**
```python
# Ejemplo: Ejecutar evaluación de seguridad
assessment_run_result = manager.start_assessment_run(
    assessment_template_arn=template_result['assessment_template_arn'],
    assessment_run_name=f'security-scan-{datetime.now().strftime("%Y%m%d-%H%M%S")}'
)

if assessment_run_result['success']:
    run_arn = assessment_run_result['assessment_run_arn']
    print(f"Assessment run started: {run_arn}")
    
    # Esperar a que complete (en producción, usar polling)
    time.sleep(3600)  # Esperar 1 hora
    
    # Obtener resultados
    run_details = manager.describe_assessment_run(run_arn)
    if run_details['success']:
        print(f"Assessment state: {run_details['run_details']['state']}")
        print(f"Finding counts: {run_details['run_details']['finding_counts']}")
```

### **3. Analizar Hallazgos**
```python
# Ejemplo: Analizar hallazgos de seguridad
findings_result = manager.get_findings(
    assessment_run_arn=run_arn,
    max_results=100
)

if findings_result['success']:
    findings = findings_result['findings']
    print(f"Found {len(findings)} security findings")
    
    # Analizar hallazgos críticos
    critical_findings = [f for f in findings if f.get('severity') == 'CRITICAL']
    if critical_findings:
        print(f"CRITICAL: {len(critical_findings)} findings require immediate attention")
        for finding in critical_findings:
            print(f"  - {finding['title']}")
    
    # Generar reporte
    report_result = manager.generate_inspector_report(run_arn)
    if report_result['success']:
        report = report_result['inspector_report']
        analysis = report['findings_analysis']
        print(f"Report generated with {analysis['total_findings']} findings")
```

### **4. Integrar con Security Hub**
```python
# Ejemplo: Integrar hallazgos con Security Hub
integration_result = manager.integrate_with_security_hub(run_arn)

if integration_result['success']:
    print(f"Imported {integration_result['imported_count']} findings to Security Hub")
    if integration_result['failed_count'] > 0:
        print(f"Failed to import {integration_result['failed_count']} findings")
```

### **5. Configurar Monitoreo**
```python
# Ejemplo: Configurar monitoreo de evaluaciones
monitoring_result = manager.setup_inspector_monitoring(
    assessment_template_arn=template_result['assessment_template_arn']
)

if monitoring_result['success']:
    setup = monitoring_result['monitoring_setup']
    print(f"Monitoring configured with {len(setup['event_subscriptions'])} event subscriptions")
    print(f"SNS topic: {setup['sns_topic_arn']}")
```

## Configuración con AWS CLI

### **Configuración Básica**
```bash
# Crear grupo de recursos
aws inspector create-resource-group \
  --resource-group-type EC2_INSTANCE_TAG \
  --tags key=Environment,value=Production key=Type,value=WebServer

# Crear target de evaluación
aws inspector create-assessment-target \
  --assessment-target-name production-web-servers \
  --resource-group-arn arn:aws:inspector:region:account-id:resourcegroup/resource-group-id

# Crear plantilla de evaluación
aws inspector create-assessment-template \
  --assessment-template-name web-server-security-scan \
  --assessment-target-arn arn:aws:inspector:region:account-id:target/target-id \
  --duration-in-seconds 3600 \
  --rules-package-arns arn:aws:inspector:region:account-id:rulespackage/package-id

# Iniciar evaluación
aws inspector start-assessment-run \
  --assessment-template-arn arn:aws:inspector:region:account-id:template/template-id \
  --assessment-run-name security-scan-$(date +%Y%m%d-%H%M%S)
```

### **Gestión de Evaluaciones**
```bash
# Listar ejecuciones de evaluación
aws inspector list-assessment-runs \
  --assessment-template-arns arn:aws:inspector:region:account-id:template/template-id

# Describir ejecución de evaluación
aws inspector describe-assessment-run \
  --assessment-run-arn arn:aws:inspector:region:account-id:run/run-id

# Detener ejecución de evaluación
aws inspector stop-assessment-run \
  --assessment-run-arn arn:aws:inspector:region:account-id:run/run-id \
  --stop-action STOP_EVALUATION
```

### **Gestión de Hallazgos**
```bash
# Listar hallazgos
aws inspector list-findings \
  --assessment-run-arns arn:aws:inspector:region:account-id:run/run-id

# Describir hallazgos
aws inspector describe-findings \
  --finding-arns arn:aws:inspector:region:account-id:finding/finding-id

# Crear vista previa de exclusiones
aws inspector create-exclusions-preview \
  --assessment-template-arn arn:aws:inspector:region:account-id:template/template-id
```

### **Configuración de Eventos**
```bash
# Suscribirse a eventos
aws inspector subscribe-to-event \
  --event ASSESSMENT_RUN_COMPLETED \
  --topic-arn arn:aws:sns:region:account-id:inspector-alerts

# Cancelar suscripción a eventos
aws inspector unsubscribe-from-event \
  --event ASSESSMENT_RUN_COMPLETED \
  --topic-arn arn:aws:sns:region:account-id:inspector-alerts
```

## Best Practices

### **1. Configuración Inicial**
- Definir grupos de recursos claros y específicos
- Configurar plantillas de evaluación apropiadas
- Establecer duraciones de evaluación razonables
- Configurar notificaciones para eventos importantes

### **2. Gestión de Evaluaciones**
- Programar evaluaciones regulares y periódicas
- Usar diferentes plantillas para diferentes tipos de recursos
- Configurar exclusiones para hallazgos esperados
- Documentar propósito y alcance de cada evaluación

### **3. Análisis de Hallazgos**
- Priorizar hallazgos por severidad y criticidad
- Investigar indicadores de compromiso inmediatamente
- Integrar con Security Hub para vista centralizada
- Automatizar respuestas para hallazgos conocidos

### **4. Optimización**
- Usar exclusiones para reducir falsos positivos
- Configurar evaluaciones en horarios de baja actividad
- Regularizar revisión y ajuste de plantillas
- Mantener actualizada documentación de hallazgos

## Costos

### **Precios de AWS Inspector**
- **Evaluaciones**: $0.14 por agente-instancia por hora
- **Reglas de evaluación**: $0.05 por regla por evaluación
- **Almacenamiento de datos**: $0.05 por GB-mes
- **Transferencia de datos**: Costos estándar de AWS

### **Ejemplo de Costos Mensuales**
- **10 instancias EC2**: 10 × $0.14 × 24 × 30 = $1,008.00
- **5 reglas de evaluación**: 5 × $0.05 × 4 × 30 = $30.00
- **Almacenamiento**: 10 GB × $0.05 = $0.50
- **Total estimado**: ~$1,038.50 por mes

## Troubleshooting

### **Problemas Comunes**
1. **Evaluación no inicia**: Verificar permisos y configuración de target
2. **No hay hallazgos**: Revisar configuración de reglas y recursos
3. **Hallazgos falsos positivos**: Configurar exclusiones apropiadas
4. **Notificaciones no funcionan**: Verificar configuración de SNS

### **Comandos de Diagnóstico**
```bash
# Verificar estado de evaluación
aws inspector describe-assessment-run --assessment-run-arn arn:aws:inspector:region:account-id:run/run-id

# Verificar configuración de target
aws inspector describe-assessment-target --assessment-target-arn arn:aws:inspector:region:account-id:target/target-id

# Verificar estado de plantilla
aws inspector describe-assessment-template --assessment-template-arn arn:aws:inspector:region:account-id:template/template-id

# Verificar suscripciones a eventos
aws inspector list-event-subscriptions
```

## Cumplimiento Normativo

### **PCI-DSS**
- **Requerimiento 6**: Desarrollo de software seguro
- **Requerimiento 11**: Pruebas de seguridad regulares
- **Requerimiento 12**: Políticas de seguridad

### **HIPAA**
- **Security Rule**: Evaluación de seguridad técnica
- **Risk Analysis**: Análisis de riesgos y vulnerabilidades
- **Audit Controls**: Controles de auditoría

### **SOC 2**
- **Security**: Evaluación de controles de seguridad
- **Availability**: Evaluación de controles de disponibilidad
- **Monitoring**: Monitoreo continuo de seguridad

### **NIST Cybersecurity Framework**
- **Identify**: Identificación de vulnerabilidades
- **Protect**: Evaluación de controles de protección
- **Detect**: Detección de actividades maliciosas

## Integración con Otros Servicios

### **AWS Security Hub**
- **Centralización**: Vista centralizada de hallazgos
- **Correlation**: Correlación de hallazgos entre servicios
- **Compliance**: Cumplimiento con estándares
- **Automation**: Automatización de respuestas

### **AWS Systems Manager**
- **Agent Management**: Gestión de agentes de Inspector
- **Patch Management**: Integración con gestión de parches
- **Automation**: Automatización de respuestas
- **Inventory**: Inventario de recursos

### **AWS CloudTrail**
- **API Logging**: Logs de llamadas a API de Inspector
- **Event History**: Historial de eventos de evaluación
- **Compliance**: Cumplimiento de auditoría
- **Security**: Auditoría de seguridad

### **AWS Lambda**
- **Custom Processing**: Procesamiento personalizado de hallazgos
- **Automation**: Automatización de respuestas
- **Integration**: Integración con otros servicios
- **Remediation**: Remediación automatizada

# AWS IAM Access Analyzer

## Definición

AWS IAM Access Analyzer es un servicio que ayuda a identificar los recursos compartidos en tu cuenta de AWS y las entidades que tienen acceso a esos recursos. Proporciona una vista centralizada de los permisos de acceso, ayudando a identificar y gestionar accesos no deseados o excesivos, y facilitando el cumplimiento de políticas de seguridad y requisitos de auditoría.

## Características Principales

### **Análisis de Acceso**
- **Descubrimiento automático**: Identificación automática de recursos compartidos
- **Visualización gráfica**: Representación visual de relaciones de acceso
- **Análisis de permisos**: Evaluación detallada de permisos de acceso
- **Detección de riesgos**: Identificación de accesos potencialmente riesgosos
- **Reportes detallados**: Informes completos de análisis de acceso

### **Tipos de Análisis**
- **Análisis de cuenta**: Análisis completo de la cuenta
- **Análisis de organización**: Análisis multi-cuenta en AWS Organizations
- **Análisis de bucket**: Análisis específico de buckets S3
- **Análisis de policy**: Análisis de políticas específicas
- **Análisis de access preview**: Vista previa de cambios de acceso

### **Recursos Soportados**
- **S3 Buckets**: Buckets y objetos S3
- **IAM Roles**: Roles de IAM
- **IAM Policies**: Políticas de IAM
- **Lambda Functions**: Funciones Lambda
- **API Gateway**: APIs de API Gateway
- **SQS Queues**: Colas SQS
- **SNS Topics**: Topics SNS
- **Secrets Manager**: Secretos de Secrets Manager
- **KMS Keys**: Claves de KMS

### **Integración Nativa**
- **AWS Organizations**: Análisis multi-cuenta
- **AWS Config**: Integración con reglas de configuración
- **AWS CloudTrail**: Auditoría de cambios de acceso
- **AWS Security Hub**: Centralización de hallazgos
- **AWS EventBridge**: Automatización de respuestas

## Tipos de Acceso Identificados

### **1. Acceso Externo**
- **Cross-account**: Acceso entre cuentas AWS
- **Public access**: Acceso público a recursos
- **Third-party access**: Acceso de terceros
- **Partner access**: Acceso de socios comerciales
- **Customer access**: Acceso de clientes

### **2. Acceso Interno**
- **IAM users**: Usuarios de IAM
- **IAM roles**: Roles de IAM
- **Service roles**: Roles de servicio
- **Instance profiles**: Perfiles de instancia
- **Federated users**: Usuarios federados

### **3. Acceso de Aplicaciones**
- **API access**: Acceso a través de APIs
- **SDK access**: Acceso mediante SDKs
- **CLI access**: Acceso mediante CLI
- **Console access**: Acceso a través de consola
- **Programmatic access**: Acceso programático

### **4. Acceso Temporal**
- **Session credentials**: Credenciales de sesión
- **Assume role**: Asumir roles temporalmente
- **Federated sessions**: Sesiones federadas
- **Temporary access**: Acceso temporal
- **One-time access**: Acceso único

## Arquitectura de IAM Access Analyzer

### **Componentes Principales**
```
AWS IAM Access Analyzer Architecture
├── Data Collection Layer
│   ├── Resource Discovery
│   ├── Permission Analysis
│   ├── Relationship Mapping
│   ├── Policy Evaluation
│   └── Access Pattern Analysis
├── Analysis Engine
│   ├── Graph Builder
│   ├── Path Analysis
│   ├── Risk Assessment
│   ├── Compliance Checking
│   └── Anomaly Detection
├── Visualization Layer
│   ├── Access Graph
│   ├── Resource Maps
│   ├── Permission Trees
│   ├── Risk Heatmaps
│   └── Interactive Views
├── Reporting Layer
│   ├── Detailed Reports
│   ├── Executive Summaries
│   ├── Compliance Reports
│   ├── Risk Assessments
│   └── Export Capabilities
└── Integration Layer
    ├── AWS Organizations
    ├── AWS Config
    ├── AWS CloudTrail
    ├── AWS Security Hub
    └── Third-party Tools
```

### **Flujo de Análisis**
```
Resource Discovery → Permission Analysis → Graph Building → Risk Assessment → Visualization → Reporting
```

## Configuración de IAM Access Analyzer

### **Gestión Completa de IAM Access Analyzer**
```python
import boto3
import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class AccessAnalyzerManager:
    def __init__(self, region='us-east-1'):
        self.accessanalyzer = boto3.client('accessanalyzer', region_name=region)
        self.organizations = boto3.client('organizations', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.lambda_client = boto3.client('lambda', region_name=region)
        self.securityhub = boto3.client('securityhub', region_name=region)
        self.region = region
    
    def create_account_analyzer(self, analyzer_name, tags=None):
        """Crear analizador de cuenta"""
        
        try:
            response = self.accessanalyzer.create_analyzer(
                analyzerName=analyzer_name,
                type='ACCOUNT',
                tags=tags or []
            )
            
            return {
                'success': True,
                'analyzer_arn': response['arn'],
                'analyzer_name': analyzer_name,
                'type': 'ACCOUNT',
                'status': 'CREATING'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_organization_analyzer(self, analyzer_name, analysis_type='ACCOUNT_UNUSED_ACCESS',
                                      tags=None):
        """Crear analizador de organización"""
        
        try:
            response = self.accessanalyzer.create_analyzer(
                analyzerName=analyzer_name,
                type='ORGANIZATION',
                configuration={
                    'unused_access_analysis': {
                        'unused_access': True
                    }
                },
                tags=tags or []
            )
            
            return {
                'success': True,
                'analyzer_arn': response['arn'],
                'analyzer_name': analyzer_name,
                'type': 'ORGANIZATION',
                'analysis_type': analysis_type,
                'status': 'CREATING'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_analyzers(self, max_results=100, next_token=None):
        """Listar analizadores"""
        
        try:
            params = {'maxResults': max_results}
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.accessanalyzer.list_analyzers(**params)
            
            analyzers = []
            for analyzer in response['analyzers']:
                analyzer_info = {
                    'arn': analyzer['arn'],
                    'name': analyzer['name'],
                    'type': analyzer['type'],
                    'status': analyzer['status'],
                    'created_at': analyzer.get('createdAt', '').isoformat() if analyzer.get('createdAt') else '',
                    'tags': analyzer.get('tags', [])
                }
                analyzers.append(analyzer_info)
            
            return {
                'success': True,
                'analyzers': analyzers,
                'count': len(analyzers),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_analyzer(self, analyzer_arn):
        """Obtener detalles de analizador"""
        
        try:
            response = self.accessanalyzer.get_analyzer(
                analyzerArn=analyzer_arn
            )
            
            analyzer_info = {
                'arn': response['analyzer']['arn'],
                'name': response['analyzer']['name'],
                'type': response['analyzer']['type'],
                'status': response['analyzer']['status'],
                'created_at': response['analyzer'].get('createdAt', '').isoformat() if response['analyzer'].get('createdAt') else '',
                'tags': response['analyzer'].get('tags', []),
                'configuration': response['analyzer'].get('configuration', {}),
                'last_resource_analyzed': response['analyzer'].get('lastResourceAnalyzed', '').isoformat() if response['analyzer'].get('lastResourceAnalyzed') else '',
                'last_resource_analyzed_at': response['analyzer'].get('lastResourceAnalyzedAt', '').isoformat() if response['analyzer'].get('lastResourceAnalyzedAt') else ''
            }
            
            return {
                'success': True,
                'analyzer_info': analyzer_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def start_resource_scan(self, analyzer_arn, resource_arn):
        """Iniciar análisis de recurso"""
        
        try:
            response = self.accessanalyzer.start_resource_scan(
                analyzerArn=analyzer_arn,
                resourceArn=resource_arn
            )
            
            return {
                'success': True,
                'analyzer_arn': analyzer_arn,
                'resource_arn': resource_arn,
                'scan_id': response.get('scanId', ''),
                'status': 'STARTED'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_analyzed_resource(self, analyzer_arn, resource_arn):
        """Obtener recurso analizado"""
        
        try:
            response = self.accessanalyzer.get_analyzed_resource(
                analyzerArn=analyzer_arn,
                resourceArn=resource_arn
            )
            
            resource_info = {
                'resource_arn': response['resource']['resourceArn'],
                'resource_type': response['resource']['resourceType'],
                'resource_owner_account': response['resource']['resourceOwnerAccount'],
                'is_public': response['resource'].get('isPublic', False),
                'status': response['resource'].get('status', ''),
                'created_at': response['resource'].get('createdAt', '').isoformat() if response['resource'].get('createdAt') else '',
                'updated_at': response['resource'].get('updatedAt', '').isoformat() if response['resource'].get('updatedAt') else ''
            }
            
            return {
                'success': True,
                'resource_info': resource_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_analyzed_resources(self, analyzer_arn, max_results=100, next_token=None):
        """Listar recursos analizados"""
        
        try:
            params = {
                'analyzerArn': analyzer_arn,
                'maxResults': max_results
            }
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.accessanalyzer.list_analyzed_resources(**params)
            
            resources = []
            for resource in response['analyzedResources']:
                resource_info = {
                    'resource_arn': resource['resourceArn'],
                    'resource_type': resource['resourceType'],
                    'resource_owner_account': resource['resourceOwnerAccount'],
                    'is_public': resource.get('isPublic', False),
                    'status': resource.get('status', ''),
                    'created_at': resource.get('createdAt', '').isoformat() if resource.get('createdAt') else ''
                }
                resources.append(resource_info)
            
            return {
                'success': True,
                'resources': resources,
                'count': len(resources),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_findings(self, analyzer_arn, max_results=100, next_token=None, sort_criteria=None):
        """Obtener hallazgos de acceso"""
        
        try:
            params = {
                'analyzerArn': analyzer_arn,
                'maxResults': max_results
            }
            
            if next_token:
                params['nextToken'] = next_token
            
            if sort_criteria:
                params['sortCriteria'] = sort_criteria
            
            response = self.accessanalyzer.get_findings(**params)
            
            findings = []
            for finding in response['findings']:
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
            'id': finding['id'],
            'arn': finding['resourceArn'],
            'type': finding['type'],
            'status': finding['status'],
            'resource': {
                'arn': finding['resourceArn'],
                'type': finding['resourceType'],
                'owner_account': finding['resourceOwnerAccount'],
                'is_public': finding.get('isPublic', False)
            },
            'principal': {
                'arn': finding.get('principal', {}).get('arn', ''),
                'type': finding.get('principal', {}).get('type', ''),
                'name': finding.get('principal', {}).get('name', ''),
                'account_id': finding.get('principal', {}).get('accountId', '')
            },
            'action': {
                'access': finding.get('action', {}).get('access', ''),
                'permission': finding.get('action', {}).get('permission', ''),
                'condition': finding.get('action', {}).get('condition', {})
            },
            'created_at': finding.get('createdAt', '').isoformat() if finding.get('createdAt') else '',
            'updated_at': finding.get('updatedAt', '').isoformat() if finding.get('updatedAt') else '',
            'source': finding.get('source', {}),
            'recommendation': finding.get('recommendation', {})
        }
    
    def generate_findings_report(self, analyzer_arn, report_format='PDF', output_location=None):
        """Generar reporte de hallazgos"""
        
        try:
            params = {
                'analyzerArn': analyzer_arn,
                'reportFormat': report_format
            }
            
            if output_location:
                params['s3Destination'] = {
                    'bucket': output_location['bucket'],
                    'key': output_location.get('key', f'access-analyzer-report-{int(time.time())}.{report_format.lower()}'),
                    'path': output_location.get('path', 'reports/')
                }
            
            response = self.accessanalyzer.generate_findings_report(**params)
            
            return {
                'success': True,
                'report_id': response['jobId'],
                'analyzer_arn': analyzer_arn,
                'report_format': report_format,
                'output_location': output_location
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_access_preview(self, analyzer_arn, policy_document, resource_arn=None):
        """Crear vista previa de acceso"""
        
        try:
            params = {
                'analyzerArn': analyzer_arn,
                'policyDocument': policy_document
            }
            
            if resource_arn:
                params['resourceArn'] = resource_arn
            
            response = self.accessanalyzer.create_access_preview(
                **params
            )
            
            return {
                'success': True,
                'access_preview_id': response['id'],
                'analyzer_arn': analyzer_arn,
                'status': 'CREATING'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_access_preview(self, access_preview_id):
        """Obtener vista previa de acceso"""
        
        try:
            response = self.accessanalyzer.get_access_preview(
                accessPreviewId=access_preview_id
            )
            
            preview_info = {
                'id': response['accessPreview']['id'],
                'analyzer_arn': response['accessPreview']['analyzerArn'],
                'status': response['accessPreview']['status'],
                'created_at': response['accessPreview'].get('createdAt', '').isoformat() if response['accessPreview'].get('createdAt') else '',
                'updated_at': response['accessPreview'].get('updatedAt', '').isoformat() if response['accessPreview'].get('updatedAt') else '',
                'policy_document': response['accessPreview'].get('policyDocument', ''),
                'resource_arn': response['accessPreview'].get('resourceArn', ''),
                'findings': response['accessPreview'].get('findings', [])
            }
            
            return {
                'success': True,
                'access_preview_info': preview_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_unused_access(self, analyzer_arn, max_results=100):
        """Analizar acceso no utilizado"""
        
        try:
            # Obtener hallazgos de acceso no utilizado
            findings_response = self.get_findings(
                analyzer_arn=analyzer_arn,
                max_results=max_results,
                sort_criteria={
                    'field': 'CREATED_AT',
                    'ascending': True
                }
            )
            
            if not findings_response['success']:
                return findings_response
            
            # Filtrar hallazgos de acceso no utilizado
            unused_access_findings = [
                finding for finding in findings_response['findings']
                if finding['type'] == 'UNUSED_PERMISSION' or finding['type'] == 'UNUSED_IAM_ROLE'
            ]
            
            # Analizar patrones de acceso no utilizado
            analysis = self._analyze_unused_access_patterns(unused_access_findings)
            
            return {
                'success': True,
                'unused_access_findings': unused_access_findings,
                'analysis': analysis,
                'total_unused': len(unused_access_findings),
                'risk_level': analysis['risk_level']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _analyze_unused_access_patterns(self, findings):
        """Analizar patrones de acceso no utilizado"""
        
        analysis = {
            'total_findings': len(findings),
            'by_resource_type': {},
            'by_principal_type': {},
            'by_access_level': {},
            'risk_level': 'LOW',
            'recommendations': [],
            'unused_iam_roles': [],
            'unused_permissions': []
        }
        
        for finding in findings:
            # Agrupar por tipo de recurso
            resource_type = finding['resource']['type']
            if resource_type not in analysis['by_resource_type']:
                analysis['by_resource_type'][resource_type] = 0
            analysis['by_resource_type'][resource_type] += 1
            
            # Agrupar por tipo de principal
            principal_type = finding['principal']['type']
            if principal_type not in analysis['by_principal_type']:
                analysis['by_principal_type'][principal_type] = 0
            analysis['by_principal_type'][principal_type] += 1
            
            # Agrupar por nivel de acceso
            access_level = self._determine_access_level(finding)
            if access_level not in analysis['by_access_level']:
                analysis['by_access_level'][access_level] = 0
            analysis['by_access_level'][access_level] += 1
            
            # Clasificar por tipo específico
            if finding['type'] == 'UNUSED_IAM_ROLE':
                analysis['unused_iam_roles'].append({
                    'arn': finding['principal']['arn'],
                    'name': finding['principal']['name'],
                    'account_id': finding['principal']['account_id']
                })
            
            if finding['type'] == 'UNUSED_PERMISSION':
                analysis['unused_permissions'].append({
                    'permission': finding['action']['permission'],
                    'resource': finding['resource']['arn'],
                    'principal': finding['principal']['arn']
                })
        
        # Determinar nivel de riesgo
        if analysis['total_findings'] > 50:
            analysis['risk_level'] = 'HIGH'
        elif analysis['total_findings'] > 20:
            analysis['risk_level'] = 'MEDIUM'
        else:
            analysis['risk_level'] = 'LOW'
        
        # Generar recomendaciones
        analysis['recommendations'] = self._generate_unused_access_recommendations(analysis)
        
        return analysis
    
    def _determine_access_level(self, finding):
        """Determinar nivel de acceso"""
        
        permission = finding['action'].get('permission', '')
        principal_type = finding['principal'].get('type', '')
        
        # Determinar nivel basado en permisos y tipo de principal
        if 'Delete' in permission or 'Terminate' in permission:
            return 'HIGH'
        elif 'Create' in permission or 'Update' in permission:
            return 'MEDIUM'
        elif 'Get' in permission or 'List' in permission:
            return 'LOW'
        else:
            return 'UNKNOWN'
    
    def _generate_unused_access_recommendations(self, analysis):
        """Generar recomendaciones para acceso no utilizado"""
        
        recommendations = []
        
        # Basado en cantidad total
        if analysis['total_findings'] > 50:
            recommendations.append({
                'priority': 'HIGH',
                'category': 'CLEANUP',
                'title': 'Clean up unused access',
                'description': f'Found {analysis["total_findings"]} unused access items requiring immediate attention',
                'action': 'Review and remove unused IAM roles and permissions'
            })
        
        # Basado en roles IAM no utilizados
        unused_roles_count = len(analysis['unused_iam_roles'])
        if unused_roles_count > 10:
            recommendations.append({
                'priority': 'HIGH',
                'category': 'IAM_ROLES',
                'title': 'Review unused IAM roles',
                'description': f'{unused_roles_count} IAM roles are unused and should be reviewed',
                'action': 'Delete unused IAM roles or verify their necessity'
            })
        
        # Basado en permisos no utilizados
        unused_permissions_count = len(analysis['unused_permissions'])
        if unused_permissions_count > 20:
            recommendations.append({
                'priority': 'MEDIUM',
                'category': 'PERMISSIONS',
                'title': 'Review unused permissions',
                'description': f'{unused_permissions_count} permissions are unused',
                'action': 'Review and remove unnecessary permissions'
            })
        
        # Recomendaciones generales
        recommendations.extend([
            {
                'priority': 'MEDIUM',
                'category': 'MONITORING',
                'title': 'Implement regular access reviews',
                'description': 'Schedule regular reviews of access patterns',
                'action': 'Set up quarterly access reviews and cleanup'
            },
            {
                'priority': 'LOW',
                'category': 'AUTOMATION',
                'title': 'Automate access cleanup',
                'description': 'Implement automated cleanup of unused access',
                'action': 'Create Lambda functions for automated cleanup'
            }
        ])
        
        return recommendations
    
    def analyze_external_access(self, analyzer_arn, max_results=100):
        """Analizar acceso externo"""
        
        try:
            # Obtener hallazgos de acceso externo
            findings_response = self.get_findings(
                analyzer_arn=analyzer_arn,
                max_results=max_results
            )
            
            if not findings_response['success']:
                return findings_response
            
            # Filtrar hallazgos de acceso externo
            external_access_findings = [
                finding for finding in findings_response['findings']
                if finding['principal']['accountId'] != self._get_current_account_id() or
                   finding['resource'].get('is_public', False)
            ]
            
            # Analizar patrones de acceso externo
            analysis = self._analyze_external_access_patterns(external_access_findings)
            
            return {
                'success': True,
                'external_access_findings': external_access_findings,
                'analysis': analysis,
                'total_external': len(external_access_findings),
                'risk_level': analysis['risk_level']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _analyze_external_access_patterns(self, findings):
        """Analizar patrones de acceso externo"""
        
        analysis = {
            'total_findings': len(findings),
            'by_external_account': {},
            'by_resource_type': {},
            'by_access_type': {},
            'public_resources': [],
            'cross_account_access': [],
            'risk_level': 'LOW',
            'recommendations': []
        }
        
        for finding in findings:
            # Agrupar por cuenta externa
            external_account = finding['principal']['accountId']
            if external_account not in analysis['by_external_account']:
                analysis['by_external_account'][external_account] = 0
            analysis['by_external_account'][external_account] += 1
            
            # Agrupar por tipo de recurso
            resource_type = finding['resource']['type']
            if resource_type not in analysis['by_resource_type']:
                analysis['by_resource_type'][resource_type] = 0
            analysis['by_resource_type'][resource_type] += 1
            
            # Agrupar por tipo de acceso
            access_type = 'PUBLIC' if finding['resource'].get('is_public', False) else 'CROSS_ACCOUNT'
            if access_type not in analysis['by_access_type']:
                analysis['by_access_type'][access_type] = 0
            analysis['by_access_type'][access_type] += 1
            
            # Clasificar por tipo específico
            if finding['resource'].get('is_public', False):
                analysis['public_resources'].append({
                    'arn': finding['resource']['arn'],
                    'type': finding['resource']['type']
                })
            else:
                analysis['cross_account_access'].append({
                    'resource_arn': finding['resource']['arn'],
                    'resource_type': finding['resource']['type'],
                    'external_account': finding['principal']['accountId'],
                    'principal_arn': finding['principal']['arn']
                })
        
        # Determinar nivel de riesgo
        public_count = len(analysis['public_resources'])
        cross_account_count = len(analysis['cross_account_access'])
        
        if public_count > 10 or cross_account_count > 50:
            analysis['risk_level'] = 'HIGH'
        elif public_count > 5 or cross_account_count > 20:
            analysis['risk_level'] = 'MEDIUM'
        else:
            analysis['risk_level'] = 'LOW'
        
        # Generar recomendaciones
        analysis['recommendations'] = self._generate_external_access_recommendations(analysis)
        
        return analysis
    
    def _generate_external_access_recommendations(self, analysis):
        """Generar recomendaciones para acceso externo"""
        
        recommendations = []
        
        # Basado en recursos públicos
        public_count = len(analysis['public_resources'])
        if public_count > 0:
            recommendations.append({
                'priority': 'HIGH',
                'category': 'PUBLIC_ACCESS',
                'title': 'Review public access',
                'description': f'{public_count} resources are publicly accessible',
                'action': 'Review and restrict public access to sensitive resources'
            })
        
        # Basado en acceso entre cuentas
        cross_account_count = len(analysis['cross_account_access'])
        if cross_account_count > 20:
            recommendations.append({
                'priority': 'MEDIUM',
                'category': 'CROSS_ACCOUNT',
                'title': 'Review cross-account access',
                'description': f'{cross_account_count} cross-account access patterns detected',
                'action': 'Review and validate cross-account access policies'
            })
        
        # Basado en cuentas externas específicas
        if len(analysis['by_external_account']) > 10:
            recommendations.append({
                'priority': 'MEDIUM',
                'category': 'EXTERNAL_ACCOUNTS',
                'title': 'Review external account access',
                'description': 'Access from multiple external accounts detected',
                'action': 'Validate and document external account access requirements'
            })
        
        # Recomendaciones generales
        recommendations.extend([
            {
                'priority': 'MEDIUM',
                'category': 'MONITORING',
                'title': 'Monitor external access patterns',
                'description': 'Implement regular monitoring of external access',
                'action': 'Set up alerts for new external access patterns'
            },
            {
                'priority': 'LOW',
                'category': 'DOCUMENTATION',
                'title': 'Document external access requirements',
                'description': 'Document all external access requirements and approvals',
                'action': 'Create and maintain external access documentation'
            }
        ])
        
        return recommendations
    
    def _get_current_account_id(self):
        """Obtener ID de cuenta actual"""
        
        try:
            return boto3.client('sts').get_caller_identity()['Account']
        except Exception:
            return '123456789012'  # Reemplazar con cuenta real
    
    def create_access_analyzer_report(self, analyzer_arn, report_type='comprehensive',
                                    time_range_days=30):
        """Crear reporte de analizador de acceso"""
        
        try:
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(days=time_range_days)
            
            report = {
                'report_metadata': {
                    'report_type': report_type,
                    'analyzer_arn': analyzer_arn,
                    'generated_at': end_time.isoformat(),
                    'time_range': {
                        'start_time': start_time.isoformat(),
                        'end_time': end_time.isoformat()
                    }
                }
            }
            
            if report_type == 'comprehensive':
                # Análisis completo
                unused_access_result = self.analyze_unused_access(analyzer_arn)
                if unused_access_result['success']:
                    report['unused_access_analysis'] = unused_access_result['analysis']
                
                external_access_result = self.analyze_external_access(analyzer_arn)
                if external_access_result['success']:
                    report['external_access_analysis'] = external_access_result['analysis']
                
                # Obtener hallazgos generales
                findings_result = self.get_findings(analyzer_arn, max_results=1000)
                if findings_result['success']:
                    report['findings_summary'] = self._summarize_findings(findings_result['findings'])
                
                # Estado del analizador
                analyzer_info = self.get_analyzer(analyzer_arn)
                if analyzer_info['success']:
                    report['analyzer_status'] = analyzer_info['analyzer_info']
            
            elif report_type == 'security':
                # Reporte de seguridad
                report['security_assessment'] = {
                    'risk_level': 'UNKNOWN',
                    'critical_findings': 0,
                    'high_risk_findings': 0,
                    'security_score': 0,
                    'recommendations': []
                }
                
                findings_result = self.get_findings(analyzer_arn, max_results=500)
                if findings_result['success']:
                    findings = findings_result['findings']
                    
                    critical_findings = [f for f in findings if f['status'] == 'ACTIVE']
                    report['security_assessment']['critical_findings'] = len(critical_findings)
                    report['security_assessment']['high_risk_findings'] = len([f for f in critical_findings if self._is_high_risk(f)])
                    report['security_assessment']['security_score'] = self._calculate_security_score(critical_findings)
                    
                    # Generar recomendaciones de seguridad
                    report['security_assessment']['recommendations'] = self._generate_security_recommendations(critical_findings)
            
            elif report_type == 'compliance':
                # Reporte de cumplimiento
                report['compliance_assessment'] = {
                    'compliance_frameworks': {},
                    'compliance_score': 0,
                    'violations': [],
                    'recommendations': []
                }
                
                # Verificar cumplimiento de diferentes frameworks
                compliance_checks = self._check_compliance_standards(analyzer_arn)
                report['compliance_assessment']['compliance_frameworks'] = compliance_checks
                report['compliance_assessment']['compliance_score'] = self._calculate_compliance_score(compliance_checks)
                report['compliance_assessment']['violations'] = self._identify_compliance_violations(compliance_checks)
                report['compliance_assessment']['recommendations'] = self._generate_compliance_recommendations(compliance_checks)
            
            return {
                'success': True,
                'access_analyzer_report': report
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _summarize_findings(self, findings):
        """Resumir hallazgos"""
        
        summary = {
            'total_findings': len(findings),
            'by_status': {},
            'by_type': {},
            'by_resource_type': {},
            'by_principal_type': {},
            'by_access_level': {},
            'risk_distribution': {}
        }
        
        for finding in findings:
            # Agrupar por estado
            status = finding['status']
            if status not in summary['by_status']:
                summary['by_status'][status] = 0
            summary['by_status'][status] += 1
            
            # Agrupar por tipo
            finding_type = finding['type']
            if finding_type not in summary['by_type']:
                summary['by_type'][finding_type] = 0
            summary['by_type'][finding_type] += 1
            
            # Agrupar por tipo de recurso
            resource_type = finding['resource']['type']
            if resource_type not in summary['by_resource_type']:
                summary['by_resource_type'][resource_type] = 0
            summary['by_resource_type'][resource_type] += 1
            
            # Agrupar por tipo de principal
            principal_type = finding['principal']['type']
            if principal_type not in summary['by_principal_type']:
                summary['by_principal_type'][principal_type] = 0
            summary['by_principal_type'][principal_type] += 1
            
            # Agrupar por nivel de acceso
            access_level = self._determine_access_level(finding)
            if access_level not in summary['by_access_level']:
                summary['by_access_level'][access_level] = 0
            summary['by_access_level'][access_level] += 1
        
        # Calcular distribución de riesgo
        high_risk_count = len([f for f in findings if self._is_high_risk(f)])
        medium_risk_count = len([f for f in findings if self._is_medium_risk(f)])
        low_risk_count = len([f for f in findings if self._is_low_risk(f)])
        
        summary['risk_distribution'] = {
            'HIGH': high_risk_count,
            'MEDIUM': medium_risk_count,
            'LOW': low_risk_count
        }
        
        return summary
    
    def _is_high_risk(self, finding):
        """Determinar si el hallazgo es de alto riesgo"""
        
        high_risk_indicators = [
            'DELETE', 'TERMINATE', 'CREATE', 'UPDATE',
            'PUBLIC', 'EXTERNAL', 'CROSS_ACCOUNT'
        ]
        
        permission = finding['action'].get('permission', '').upper()
        resource_type = finding['resource'].get('type', '').upper()
        
        return any(indicator in permission or resource_type for indicator in high_risk_indicators)
    
    def _is_medium_risk(self, finding):
        """Determinar si el hallazgo es de riesgo medio"""
        
        medium_risk_indicators = [
            'READ', 'LIST', 'GET', 'PUT', 'POST'
        ]
        
        permission = finding['action'].get('permission', '').upper()
        
        return any(indicator in permission for indicator in medium_risk_indicators)
    
    def _is_low_risk(self, finding):
        """Determinar si el hallazgo es de bajo riesgo"""
        
        return not (self._is_high_risk(finding) or self._is_medium_risk(finding))
    
    def _calculate_security_score(self, findings):
        """Calcular puntuación de seguridad"""
        
        if not findings:
            return 100
        
        total_findings = len(findings)
        high_risk_count = len([f for f in findings if self._is_high_risk(f)])
        
        # Penalizar hallazgos de alto riesgo
        score = max(0, 100 - (high_risk_count * 10) - (total_findings - high_risk_count) * 2)
        
        return score
    
    def _generate_security_recommendations(self, findings):
        """Generar recomendaciones de seguridad"""
        
        recommendations = []
        
        high_risk_findings = [f for f in findings if self._is_high_risk(f)]
        
        if len(high_risk_findings) > 10:
            recommendations.append({
                'priority': 'CRITICAL',
                'category': 'IMMEDIATE_ACTION',
                'title': 'Address critical security findings',
                'description': f'{len(high_risk_findings)} high-risk findings require immediate attention',
                'action': 'Review and remediate all high-risk findings immediately'
            })
        
        # Recomendaciones basadas en tipos de hallazgos
        finding_types = {}
        for finding in findings:
            finding_type = finding['type']
            if finding_type not in finding_types:
                finding_types[finding_type] = 0
            finding_types[finding_type] += 1
        
        for finding_type, count in finding_types.items():
            if count > 5 and finding_type in ['EXTERNAL_ACCESS', 'UNUSED_PERMISSION', 'SHARED_RESOURCE']:
                recommendations.append({
                    'priority': 'HIGH',
                    'category': finding_type,
                    'title': f'Review {finding_type.replace("_", " ").title()}',
                    'description': f'{count} findings of type {finding_type}',
                    'action': f'Review and address {finding_type.lower()} issues'
                })
        
        return recommendations
    
    def _check_compliance_standards(self, analyzer_arn):
        """Verificar estándares de cumplimiento"""
        
        try:
            # Simulación de verificación de cumplimiento
            compliance_standards = {
                'SOX': {
                    'status': 'COMPLIANT',
                    'score': 85,
                    'violations': ['EXTERNAL_ACCESS_NOT_DOCUMENTED'],
                    'recommendations': ['Document all external access']
                },
                'GDPR': {
                    'status': 'PARTIALLY_COMPLIANT',
                    'score': 70,
                    'violations': ['PUBLIC_ACCESS_TO_PERSONAL_DATA'],
                    'recommendations': ['Review public access to sensitive data']
                },
                'HIPAA': {
                    'status': 'COMPLIANT',
                    'score': 90,
                    'violations': [],
                    'recommendations': ['Maintain current access controls']
                },
                'PCI_DSS': {
                    'status': 'COMPLIANT',
                    'score': 88,
                    'violations': ['EXCESSIVE_PERMISSIONS'],
                    'recommendations': ['Implement least privilege principle']
                }
            }
            
            return compliance_standards
            
        except Exception as e:
            return {'error': str(e)}
    
    def _calculate_compliance_score(self, compliance_standards):
        """Calcular puntuación de cumplimiento"""
        
        if 'error' in compliance_standards:
            return 0
        
        scores = []
        for standard, status in compliance_standards.items():
            if 'score' in status:
                scores.append(status['score'])
        
        return sum(scores) / len(scores) if scores else 0
    
    def _identify_compliance_violations(self, compliance_standards):
        """Identificar violaciones de cumplimiento"""
        
        violations = []
        
        if 'error' not in compliance_standards:
            for standard, status in compliance_standards.items():
                if 'violations' in status:
                    for violation in status['violations']:
                        violations.append({
                            'standard': standard,
                            'violation': violation
                        })
        
        return violations
    
    def _generate_compliance_recommendations(self, compliance_standards):
        """Generar recomendaciones de cumplimiento"""
        
        recommendations = []
        
        if 'error' not in compliance_standards:
            for standard, status in compliance_standards.items():
                if 'recommendations' in status:
                    for recommendation in status['recommendations']:
                        recommendations.append({
                            'standard': standard,
                            'recommendation': recommendation
                        })
        
        return recommendations
    
    def setup_access_analyzer_monitoring(self, analyzer_arn, sns_topic_arn=None):
        """Configurar monitoreo de Access Analyzer"""
        
        try:
            monitoring_setup = {
                'analyzer_arn': analyzer_arn,
                'sns_topic_arn': None,
                'lambda_functions': [],
                'cloudwatch_alarms': [],
                'automated_reports': []
            }
            
            # Crear o usar SNS topic
            if sns_topic_arn:
                monitoring_setup['sns_topic_arn'] = sns_topic_arn
            else:
                topic_response = self.sns.create_topic(
                    Name='access-analyzer-alerts',
                    Tags=[
                        {'Key': 'Service', 'Value': 'AccessAnalyzer'},
                        {'Key': 'Purpose', 'Value': 'SecurityAlerts'}
                    ]
                )
                monitoring_setup['sns_topic_arn'] = topic_response['TopicArn']
            
            # Crear función Lambda para monitoreo
            lambda_result = self.create_access_analyzer_lambda(analyzer_arn)
            if lambda_result['success']:
                monitoring_setup['lambda_functions'].append(lambda_result['function_arn'])
            
            # Configurar alarmas de CloudWatch
            alarm_result = self.setup_access_analyzer_alarms(analyzer_arn, monitoring_setup['sns_topic_arn'])
            if alarm_result['success']:
                monitoring_setup['cloudwatch_alarms'] = alarm_result['alarms']
            
            # Configurar reportes automáticos
            report_result = self.setup_automated_reports(analyzer_arn)
            if report_result['success']:
                monitoring_setup['automated_reports'] = report_result['reports']
            
            return {
                'success': True,
                'monitoring_setup': monitoring_setup
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_access_analyzer_lambda(self, analyzer_arn):
        """Crear función Lambda para monitoreo de Access Analyzer"""
        
        try:
            lambda_code = self._get_access_analyzer_lambda_code()
            
            # Crear rol de ejecución
            role_arn = self._create_lambda_execution_role('access-analyzer-role')
            
            # Crear función Lambda
            response = self.lambda_client.create_function(
                FunctionName='access-analyzer-monitor',
                Runtime='python3.9',
                Role=role_arn,
                Handler='lambda_function.lambda_handler',
                Code={
                    'ZipFile': lambda_code
                },
                Description='Lambda function for Access Analyzer monitoring',
                Timeout=300,
                Environment={
                    'Variables': {
                        'ANALYZER_ARN': analyzer_arn,
                        'SNS_TOPIC_ARN': f'arn:aws:sns:{self.region}:123456789012:access-analyzer-alerts'
                    }
                },
                Tags={
                    'Service': 'AccessAnalyzer',
                    'Purpose': 'Monitoring'
                }
            )
            
            return {
                'success': True,
                'function_name': 'access-analyzer-monitor',
                'function_arn': response['FunctionArn'],
                'role_arn': role_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_access_analyzer_lambda_code(self):
        """Obtener código de Lambda para monitoreo de Access Analyzer"""
        
        return '''
import json
import boto3
import os
from datetime import datetime

def lambda_handler(event, context):
    sns = boto3.client('sns')
    accessanalyzer = boto3.client('accessanalyzer')
    
    analyzer_arn = os.environ['ANALYZER_ARN']
    sns_topic_arn = os.environ['SNS_TOPIC_ARN']
    
    # Analizar evento (simulado)
    event_analysis = analyze_access_analyzer_event(event)
    
    if event_analysis['requires_attention']:
        # Enviar alerta
        alert = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': 'ACCESS_ANALYZER_ALERT',
            'analyzer_arn': analyzer_arn,
            'finding_type': event_analysis['finding_type'],
            'resource_arn': event_analysis['resource_arn'],
            'principal_arn': event_analysis['principal_arn'],
            'risk_level': event_analysis['risk_level'],
            'recommendations': event_analysis['recommendations']
        }
        
        sns.publish(
            TopicArn=sns_topic_arn,
            Subject=f'Access Analyzer Alert: {event_analysis["finding_type"]}',
            Message=json.dumps(alert),
            MessageStructure='string'
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Access Analyzer alert sent',
                'finding_type': event_analysis['finding_type'],
                'risk_level': event_analysis['risk_level']
            })
        }
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'No action required'})
    }

def analyze_access_analyzer_event(event):
    """Analizar evento de Access Analyzer"""
    
    analysis = {
        'requires_attention': False,
        'finding_type': 'UNKNOWN',
        'resource_arn': '',
        'principal_arn': '',
        'risk_level': 'LOW',
        'recommendations': []
    }
    
    # Simular análisis de evento
    if 'detail-type' in event:
        detail_type = event['detail-type']
        
        if detail_type == 'Access Analyzer Finding':
            analysis['requires_attention'] = True
            analysis['finding_type'] = event.get('detail', {}).get('type', 'UNKNOWN')
            analysis['resource_arn'] = event.get('detail', {}).get('resourceArn', '')
            analysis['principal_arn'] = event.get('detail', {}).get('principal', {}).get('arn', '')
            
            # Determinar nivel de riesgo
            finding_type = analysis['finding_type']
            if finding_type in ['EXTERNAL_ACCESS', 'UNUSED_PERMISSION', 'SHARED_RESOURCE']:
                analysis['risk_level'] = 'HIGH'
            elif finding_type in ['PUBLIC_ACCESS', 'CROSS_ACCOUNT']:
                analysis['risk_level'] = 'MEDIUM'
            else:
                analysis['risk_level'] = 'LOW'
            
            # Generar recomendaciones
            analysis['recommendations'] = [
                f'Review {finding_type.lower()} finding',
                'Investigate the access pattern',
                'Consider remediation if unnecessary'
            ]
    
    return analysis
'''
    
    def _create_lambda_execution_role(self, role_name):
        """Crear rol de ejecución para Lambda"""
        
        try:
            # Verificar si el rol ya existe
            try:
                response = self.iam.get_role(RoleName=role_name)
                return response['Role']['Arn']
            except self.iam.exceptions.NoSuchEntityException:
                pass
            
            # Crear política de confianza
            trust_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "lambda.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }
            
            # Crear rol
            response = self.iam.create_role(
                RoleName=role_name,
                AssumeRolePolicyDocument=json.dumps(trust_policy),
                Description='Execution role for Access Analyzer monitoring Lambda',
                Tags=[
                    {'Key': 'Service', 'Value': 'Lambda'},
                    {'Key': 'Purpose', 'Value': 'AccessAnalyzerMonitoring'}
                ]
            )
            
            role_arn = response['Role']['Arn']
            
            # Adjuntar políticas necesarias
            policies = [
                'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
                'arn:aws:iam::aws:policy/CloudWatchLogsFullAccess',
                'arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess'
            ]
            
            for policy_arn in policies:
                self.iam.attach_role_policy(
                    RoleName=role_name,
                    PolicyArn=policy_arn
                )
            
            # Esperar a que el rol esté disponible
            time.sleep(10)
            
            return role_arn
            
        except Exception as e:
            raise Exception(f"Failed to create Lambda execution role: {str(e)}")
    
    def setup_access_analyzer_alarms(self, analyzer_arn, sns_topic_arn):
        """Configurar alarmas de CloudWatch"""
        
        try:
            alarms_created = []
            
            # Alarma para hallazgos de alto riesgo
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='AccessAnalyzer-HighRiskFindings',
                    AlarmDescription='High risk findings detected by Access Analyzer',
                    Namespace='AWS/AccessAnalyzer',
                    MetricName='HighRiskFindingsCount',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('AccessAnalyzer-HighRiskFindings')
            except Exception:
                pass
            
            # Alarma para acceso externo
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='AccessAnalyzer-ExternalAccess',
                    AlarmDescription='External access detected by Access Analyzer',
                    Namespace='AWS/AccessAnalyzer',
                    MetricName='ExternalAccessCount',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('AccessAnalyzer-ExternalAccess')
            except Exception:
                pass
            
            return {
                'success': True,
                'alarms': alarms_created,
                'count': len(alarms_created)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def setup_automated_reports(self, analyzer_arn):
        """Configurar reportes automatizados"""
        
        try:
            reports = []
            
            # Reporte semanal de seguridad
            reports.append({
                'name': 'weekly-security-report',
                'frequency': 'WEEKLY',
                'report_type': 'SECURITY',
                'recipients': ['security-team@example.com']
            })
            
            # Reporte mensual de cumplimiento
            reports.append({
                'name': 'monthly-compliance-report',
                'frequency': 'MONTHLY',
                'report_type': 'COMPLIANCE',
                'recipients': ['compliance-team@example.com']
            })
            
            return {
                'success': True,
                'reports': reports,
                'count': len(reports)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Crear Analizador de Cuenta**
```python
# Ejemplo: Crear analizador de cuenta
manager = AccessAnalyzerManager('us-east-1')

analyzer_result = manager.create_account_analyzer(
    analyzer_name='main-account-analyzer',
    tags=[
        {'Key': 'Environment', 'Value': 'production'},
        {'Key': 'Team', 'Value': 'Security'}
    ]
)

if analyzer_result['success']:
    print(f"Account analyzer created: {analyzer_result['analyzer_arn']}")
    
    # Configurar monitoreo
    monitoring_result = manager.setup_access_analyzer_monitoring(
        analyzer_arn=analyzer_result['analyzer_arn']
    )
    
    if monitoring_result['success']:
        setup = monitoring_result['monitoring_setup']
        print(f"Monitoring configured with {len(setup['cloudwatch_alarms'])} alarms")
```

### **2. Analizar Acceso No Utilizado**
```python
# Ejemplo: Analizar acceso no utilizado
unused_result = manager.analyze_unused_access(analyzer_arn=analyzer_result['analyzer_arn'])

if unused_result['success']:
    analysis = unused_result['analysis']
    
    print(f"Unused Access Analysis")
    print(f"Total unused findings: {analysis['total_unused']}")
    print(f"Risk level: {analysis['risk_level']}")
    print(f"Unused IAM roles: {len(analysis['unused_iam_roles'])}")
    print(f"Unused permissions: {len(analysis['unused_permissions'])}")
    
    # Mostrar recomendaciones
    for recommendation in analysis['recommendations']:
        print(f"Recommendation: {recommendation['title']} ({recommendation['priority']})")
```

### **3. Analizar Acceso Externo**
```python
# Ejemplo: Analizar acceso externo
external_result = manager.analyze_external_access(analyzer_arn=analyzer_result['analyzer_arn'])

if external_result['success']:
    analysis = external_result['analysis']
    
    print(f"External Access Analysis")
    print(f"Total external findings: {analysis['total_external']}")
    print(f"Risk level: {analysis['risk_level']}")
    print(f"Public resources: {len(analysis['public_resources'])}")
    print(f"Cross-account access: {len(analysis['cross_account_access'])}")
    
    # Mostrar recomendaciones
    for recommendation in analysis['recommendations']:
        print(f"Recommendation: {recommendation['title']} ({recommendation['priority']})")
```

### **4. Generar Reporte de Seguridad**
```python
# Ejemplo: Generar reporte de seguridad
report_result = manager.create_access_analyzer_report(
    analyzer_arn=analyzer_result['analyzer_arn'],
    report_type='security',
    time_range_days=30
)

if report_result['success']:
    report = report_result['access_analyzer_report']
    security_assessment = report['security_assessment']
    
    print(f"Security Assessment")
    print(f"Risk level: {security_assessment['risk_level']}")
    print(f"Critical findings: {security_assessment['critical_findings']}")
    print(f"High risk findings: {security_assessment['high_risk_findings']}")
    print(f"Security score: {security_assessment['security_score']}")
    print(f"Recommendations: {len(security_assessment['recommendations'])}")
```

### **5. Generar Reporte de Cumplimiento**
```python
# Ejemplo: Generar reporte de cumplimiento
compliance_result = manager.create_access_analyzer_report(
    analyzer_arn=analyzer_result['analyzer_arn'],
    report_type='compliance',
    time_range_days=30
)

if compliance_result['success']:
    report = compliance_result['access_analyzer_report']
    compliance_assessment = report['compliance_assessment']
    
    print(f"Compliance Assessment")
    print(f"Overall compliance score: {compliance_assessment['compliance_score']:.1f}")
    print(f"Violations: {len(compliance_assessment['violations'])}")
    print(f"Recommendations: {len(compliance_assessment['recommendations'])}")
    
    # Mostrar estado por framework
    for framework, status in compliance_assessment['compliance_frameworks'].items():
        print(f"{framework}: {status['status']} (Score: {status['score']})")
```

## Configuración con AWS CLI

### **Creación y Gestión de Analizadores**
```bash
# Crear analizador de cuenta
aws accessanalyzer create-analyzer \
  --analyzer-name main-analyzer \
  --type ACCOUNT \
  --tags Key=Environment,Value=Production

# Crear analizador de organización
aws accessanalyzer create-analyzer \
  --analyzer-name organization-analyzer \
  --type ORGANIZATION \
  --configuration 'unusedAccessAnalysis={unusedAccess=true}' \
  --tags Key=Environment,Value=Production

# Listar analizadores
aws accessanalyzer list-analyzers

# Obtener detalles del analizador
aws accessanalyzer get-analyzer \
  --analyzer-arn arn:aws:access-analyzer:region:account-id:analyzer/main-analyzer
```

### **Análisis de Recursos**
```bash
# Iniciar análisis de recurso
aws accessanalyzer start-resource-scan \
  --analyzer-arn arn:aws:access-analyzer:region:account-id:analyzer/main-analyzer \
  --resource-arn arn:aws:s3:::my-bucket

# Obtener recurso analizado
aws accessanalyzer get-analyzed-resource \
  --analyzer-arn arn:aws:access-analyzer:region:account-id:analyzer/main-analyzer \
  --resource-arn arn:aws:s3:::my-bucket

# Listar recursos analizados
aws accessanalyzer list-analyzed-resources \
  --analyzer-arn arn:aws:access-analyzer:region:account-id:analyzer/main-analyzer
```

### **Gestión de Hallazgos**
```bash
# Obtener hallazgos
aws accessanalyzer get-findings \
  --analyzer-arn arn:aws:access-analyzer:region:account-id:analyzer/main-analyzer \
  --max-results 100

# Generar reporte de hallazgos
aws accessanalyzer generate-findings-report \
  --analyzer-arn arn:aws:access-analyzer:region:account-id:analyzer/main-analyzer \
  --report-format PDF \
  --s3destination '{ "bucket": "my-reports", "key": "access-analyzer-report.pdf" }'

# Crear vista previa de acceso
aws accessanalyzer create-access-preview \
  --analyzer-arn arn:aws:access-analyzer:region:account-id:analyzer/main-analyzer \
  --policy-document file://policy.json
```

## Mejores Prácticas

### **1. Configuración Inicial**
- Crear analizador para cuenta y organización
- Habilitar análisis de acceso no utilizado
- Configurar monitoreo y alertas
- Documentar políticas de acceso

### **2. Análisis Regular**
- Realizar análisis semanal de acceso
- Revisar hallazgos de alto riesgo
- Identificar patrones de acceso externo
- Generar reportes de cumplimiento

### **3. Gestión de Hallazgos**
- Clasificar hallazgos por prioridad
- Implementar corrección de riesgos
- Documentar acciones tomadas
- Realizar seguimiento de correcciones

### **4. Automatización**
- Configurar alertas automáticas
- Implementar correcciones automatizadas
- Programar reportes periódicos
- Integrar con herramientas de seguridad

## Costos

### **Precios de IAM Access Analyzer**
- **Analizadores**: GRATIS
- **Análisis de recursos**: GRATIS
- **Generación de reportes**: GRATIS
- **API Calls**: Costos estándar de AWS
- **Almacenamiento**: Costos estándar de AWS

### **Costos de Servicios Asociados**
- **Lambda**: $0.20 por 1M requests + $0.00001667 por GB-segundo
- **CloudWatch**: $0.10 por métrica por mes
- **SNS**: $0.50 por millón de publicaciones
- **S3**: $0.023 por GB almacenado + $0.0049 por 1000 requests

### **Ejemplo de Costos Mensuales**
- **Lambda**: $2.00 + $1.00 = $3.00
- **CloudWatch**: $2.00 + $0.50 = $2.50
- **SNS**: $1.00
- **S3**: $5.00 + $2.00 = $7.00
- **Total estimado**: ~$13.50 por mes

## Troubleshooting

### **Problemas Comunes**
1. **Analizador no se crea**: Verificar permisos de IAM
2. **No hay hallazgos**: Revisar configuración y permisos
3. **Reporte no se genera**: Verificar permisos de S3
4. **Alertas no funcionan**: Revisar configuración de SNS y CloudWatch

### **Comandos de Diagnóstico**
```bash
# Verificar estado del analizador
aws accessanalyzer get-analyzer --analyzer-arn arn:aws:access-analyzer:region:account-id:analyzer/main-analyzer

# Verificar recursos analizados
aws accessanalyzer list-analyzed-resources --analyzer-arn arn:aws:access-analyzer:region:account-id:analyzer/main-analyzer

# Verificar estado del análisis
aws accessanalyzer get-analyzed-resource --analyzer-arn arn:aws:access-analyzer:region:account-id:analyzer/main-analyzer --resource-arn arn:aws:s3:::my-bucket

# Verificar logs de Lambda
aws logs tail /aws/lambda/access-analyzer-monitor --follow
```

## Cumplimiento Normativo

### **SOX**
- **Sección 302**: Control sobre servicios de la organización
- **Sección 404**: Controles y responsabilidades
- **Sección 406**: Evaluación de controles
- **Sección 409**: Controles de seguridad

### **GDPR**
- **Artículo 32**: Seguridad del tratamiento
- **Artículo 33**: Notificación de brechas
- **Artículo 35**: Evaluación de impacto
- **Artículo 25**: Protección desde el diseño

### **HIPAA**
- **Security Rule**: Controles técnicos y administrativos
- **Access Control**: Controles de acceso
- **Audit Controls**: Controles de auditoría
- **Risk Management**: Gestión de riesgos

### **PCI-DSS**
- **Requerimiento 7**: Restricción de acceso a datos
- **Requerimiento 8**: Identificación y autenticación
- **Requerimiento 10**: Monitoreo y logging
- **Requerimiento 12**: Políticas de seguridad

## Integración con Otros Servicios

### **AWS IAM**
- **Users and Roles**: Análisis de usuarios y roles
- **Policies**: Evaluación de políticas de acceso
- **Permissions**: Análisis de permisos específicos
- **Groups**: Análisis de grupos de usuarios

### **AWS Organizations**
- **Multi-Account**: Análisis multi-cuenta
- **Service Control Policies**: Evaluación de SCPs
- **Member Accounts**: Análisis de cuentas miembro
- **Root Account**: Análisis de cuenta root

### **AWS Security Hub**
- **Centralización**: Hallazgos centralizados
- **Correlation**: Correlación de hallazgos
- **Compliance**: Evaluación de cumplimiento
- **Automation**: Respuestas automatizadas

### **AWS CloudTrail**
- **Audit Trail**: Registro de cambios de acceso
- **API Logging**: Logs de llamadas a API
- **Event History**: Historial de eventos
- **Compliance**: Evidencia de cumplimiento

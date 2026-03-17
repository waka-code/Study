# AWS Security Hub

## Definición

AWS Security Hub es un servicio centralizado de seguridad que proporciona una vista completa de tu estado de seguridad en AWS. Agrega y organiza automáticamente hallazgos de seguridad de múltiples servicios de AWS, permitiendo monitorear el cumplimiento, analizar tendencias de seguridad y responder a incidentes de manera más eficiente.

## Características Principales

### **Centralización de Hallazgos**
- **Agregación automática**: Recopila hallazgos de múltiples servicios AWS
- **Normalización de datos**: Formato unificado para todos los hallazgos
- **Deduplicación**: Elimina hallazgos duplicados
- **Enriquecimiento**: Agrega contexto adicional a los hallazgos
- **Correlación**: Relaciona hallazgos relacionados

### **Cumplimiento Normativo**
- **Estándares predefinidos**: CIS, PCI-DSS, NIST, AWS Foundational Security
- **Controles personalizados**: Creación de controles específicos
- **Evaluación continua**: Monitoreo continuo del cumplimiento
- **Reportes de cumplimiento**: Generación de reportes detallados
- **Benchmarking**: Comparación con estándares de la industria

### **Automatización y Respuesta**
- **Acciones automatizadas**: Respuestas automáticas a hallazgos
- **Workflows personalizados**: Flujos de trabajo personalizados
- **Integración con Lambda**: Automatización con funciones Lambda
- **Insights personalizados**: Análisis personalizado de hallazgos
- **Notificaciones**: Alertas y notificaciones configurables

### **Visibilidad y Análisis**
- **Dashboard centralizado**: Vista unificada de seguridad
- **Métricas de seguridad**: Indicadores clave de seguridad
- **Tendencias**: Análisis de tendencias de seguridad
- **Investigación**: Herramientas de investigación
- **Historial**: Registro histórico de hallazgos

## Estándares de Cumplimiento

### **1. CIS AWS Foundations Benchmark**
- **Control 1**: IAM policies
- **Control 2**: S3 bucket policies
- **Control 3**: CloudTrail logging
- **Control 4**: Config service
- **Control 5**: VPC configuration

### **2. PCI-DSS**
- **Requirement 1**: Firewall configuration
- **Requirement 2**: Default passwords
- **Requirement 3**: Data protection
- **Requirement 4**: Encryption
- **Requirement 5**: Malware protection

### **3. NIST Cybersecurity Framework**
- **Identify**: Asset management
- **Protect**: Access control
- **Detect**: Continuous monitoring
- **Respond**: Response planning
- **Recover**: Recovery planning

### **4. AWS Foundational Security Best Practices**
- **Security Groups**: Network security
- **IAM**: Access management
- **Encryption**: Data encryption
- **Logging**: Audit trails
- **Monitoring**: Security monitoring

## Arquitectura de AWS Security Hub

### **Componentes Principales**
```
AWS Security Hub Architecture
├── Data Ingestion
│   ├── AWS Config
│   ├── AWS GuardDuty
│   ├── AWS Inspector
│   ├── AWS Macie
│   ├── Third-party Tools
│   └── Custom Findings
├── Processing Engine
│   ├── Normalization
│   ├── Deduplication
│   ├── Enrichment
│   ├── Correlation
│   └── Scoring
├── Compliance Engine
│   ├── Standard Mapping
│   ├── Control Evaluation
│   ├── Compliance Scoring
│   ├── Benchmarking
│   └── Reporting
├── Analysis & Insights
│   ├── Finding Analysis
│   ├── Trend Analysis
│   ├── Risk Assessment
│   ├── Custom Insights
│   └── Dashboard
└── Automation & Response
    ├── Action Automation
    ├── Workflow Engine
    ├── Notification System
    ├── Integration Hub
    └── Remediation
```

### **Flujo de Procesamiento**
```
Finding Source → Ingestion → Normalization → Deduplication → Enrichment → Compliance Mapping → Analysis → Action
```

## Configuración de AWS Security Hub

### **Gestión Completa de AWS Security Hub**
```python
import boto3
import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class SecurityHubManager:
    def __init__(self, region='us-east-1'):
        self.securityhub = boto3.client('securityhub', region_name=region)
        self.organizations = boto3.client('organizations', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.lambda_client = boto3.client('lambda', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.region = region
    
    def enable_security_hub(self, enable_default_standards=True, tags=None):
        """Habilitar AWS Security Hub"""
        
        try:
            enable_params = {
                'EnableDefaultStandards': enable_default_standards
            }
            
            if tags:
                enable_params['Tags'] = tags
            
            response = self.securityhub.enable_security_hub(**enable_params)
            
            return {
                'success': True,
                'status': 'ENABLED',
                'subscribed_arn': response.get('SubscribedArn', '')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def disable_security_hub(self):
        """Deshabilitar AWS Security Hub"""
        
        try:
            response = self.securityhub.disable_security_hub()
            
            return {
                'success': True,
                'status': 'DISABLED'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def subscribe_to_security_hub(self, account_id, region=None):
        """Suscribir cuenta a Security Hub"""
        
        try:
            subscribe_params = {
                'AccountId': account_id
            }
            
            if region:
                subscribe_params['Region'] = region
            
            response = self.securityhub.subscribe_to_security_hub(**subscribe_params)
            
            return {
                'success': True,
                'account_id': account_id,
                'subscribed_arn': response.get('SubscribedArn', '')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def enable_security_hub_for_organization(self, auto_enable_standards=True,
                                           auto_enable_members=True):
        """Habilitar Security Hub para organización"""
        
        try:
            config = {
                'AutoEnableStandards': auto_enable_standards,
                'AutoEnableMembers': auto_enable_members
            }
            
            response = self.securityhub.enable_organization_admin_account(
                AdminAccountId=self._get_management_account_id(),
                Configuration=config
            )
            
            return {
                'success': True,
                'auto_enable_standards': auto_enable_standards,
                'auto_enable_members': auto_enable_members
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_management_account_id(self):
        """Obtener ID de cuenta de gestión"""
        
        try:
            response = self.organizations.describe_organization()
            return response['Organization']['MasterAccountId']
        except Exception:
            return '123456789012'  # Reemplazar con cuenta real
    
    def create_custom_insight(self, insight_name, insight_description,
                            filters, group_by_attribute):
        """Crear insight personalizado"""
        
        try:
            insight_config = {
                'Name': insight_name,
                'Description': insight_description,
                'Filters': filters,
                'GroupByAttribute': group_by_attribute
            }
            
            response = self.securityhub.create_insight(**insight_config)
            
            return {
                'success': True,
                'insight_arn': response['InsightArn'],
                'insight_name': insight_name,
                'insight_id': response['InsightId']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def import_findings(self, findings):
        """Importar hallazgos a Security Hub"""
        
        try:
            response = self.securityhub.batch_import_findings(Findings=findings)
            
            return {
                'success': True,
                'imported_count': len(findings) - len(response.get('FailedCount', 0)),
                'failed_count': response.get('FailedCount', 0),
                'failed_findings': response.get('UnprocessedFindings', [])
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_findings(self, findings):
        """Actualizar hallazgos existentes"""
        
        try:
            response = self.securityhub.batch_update_findings(Findings=findings)
            
            return {
                'success': True,
                'updated_count': len(findings),
                'failed_count': response.get('FailedCount', 0),
                'failed_findings': response.get('UnprocessedFindings', [])
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_findings(self, filters=None, sort_criteria=None, max_results=100,
                    next_token=None):
        """Obtener hallazgos de Security Hub"""
        
        try:
            params = {'MaxResults': max_results}
            
            if filters:
                params['Filters'] = filters
            
            if sort_criteria:
                params['SortCriteria'] = sort_criteria
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.securityhub.get_findings(**params)
            
            findings = []
            for finding in response.get('Findings', []):
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
            'schema_version': finding.get('SchemaVersion', ''),
            'product_arn': finding.get('ProductArn', ''),
            'generator_id': finding.get('GeneratorId', ''),
            'aws_account_id': finding.get('AwsAccountId', ''),
            'types': finding.get('Types', []),
            'first_observed_at': finding.get('FirstObservedAt', ''),
            'last_observed_at': finding.get('LastObservedAt', ''),
            'created_at': finding.get('CreatedAt', ''),
            'updated_at': finding.get('UpdatedAt', ''),
            'severity': {
                'label': finding.get('Severity', {}).get('Label', ''),
                'normalized': finding.get('Severity', {}).get('Normalized', 0),
                'product_specific': finding.get('Severity', {}).get('ProductSpecific', {}),
                'original': finding.get('Severity', {}).get('Original', '')
            },
            'confidence': finding.get('Confidence', 0),
            'criticality': finding.get('Criticality', 0),
            'title': finding.get('Title', ''),
            'description': finding.get('Description', ''),
            'remediation': {
                'recommendation': finding.get('Remediation', {}).get('Recommendation', {}),
                'automatic': finding.get('Remediation', {}).get('Automatic', {})
            },
            'source_url': finding.get('SourceUrl', ''),
            'product_fields': finding.get('ProductFields', {}),
            'user_defined_fields': finding.get('UserDefinedFields', {}),
            'malware': finding.get('Malware', []),
            'network': {
                'direction': finding.get('Network', {}).get('Direction', ''),
                'protocol': finding.get('Network', {}).get('Protocol', ''),
                'open_port_range': finding.get('Network', {}).get('OpenPortRange', {}),
                'source_ip_v4': finding.get('Network', {}).get('SourceIpV4', []),
                'source_ip_v6': finding.get('Network', {}).get('SourceIpV6', []),
                'source_port': finding.get('Network', {}).get('SourcePort', []),
                'destination_ip_v4': finding.get('Network', {}).get('DestinationIpV4', []),
                'destination_ip_v6': finding.get('Network', {}).get('DestinationIpV6', []),
                'destination_port': finding.get('Network', {}).get('DestinationPort', [])
            },
            'network_path': finding.get('NetworkPath', []),
            'process': finding.get('Process', {}),
            'threat_intel_indicators': finding.get('ThreatIntelIndicators', []),
            'resources': finding.get('Resources', []),
            'compliance': {
                'status': finding.get('Compliance', {}).get('Status', ''),
                'related_requirements': finding.get('Compliance', {}).get('RelatedRequirements', []),
                'security_controls': finding.get('Compliance', {}).get('SecurityControls', {}),
                'associated_standards': finding.get('Compliance', {}).get('AssociatedStandards', [])
            },
            'verification_state': finding.get('VerificationState', ''),
            'workflow_state': finding.get('Workflow', {}).get('State', ''),
            'workflow_status': finding.get('Workflow', {}).get('Status', ''),
            'record_state': finding.get('RecordState', ''),
            'note': {
                'text': finding.get('Note', {}).get('Text', ''),
                'updated_by': finding.get('Note', {}).get('UpdatedBy', ''),
                'updated_at': finding.get('Note', {}).get('UpdatedAt', '')
            },
            'vulnerabilities': finding.get('Vulnerabilities', [])
        }
    
    def get_insight_results(self, insight_arn):
        """Obtener resultados de insight"""
        
        try:
            response = self.securityhub.get_insight_results(InsightArn=insight_arn)
            
            results = {
                'insight_arn': insight_arn,
                'insight_results': response.get('InsightResults', {}),
                'result_values': response.get('ResultValues', [])
            }
            
            return {
                'success': True,
                'results': results
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def enable_security_hub_standard(self, standards_short_name, standards_arn=None):
        """Habilitar estándar de seguridad"""
        
        try:
            enable_params = {
                'StandardsSubscriptionRequest': {
                    'StandardsArn': standards_arn if standards_arn else self._get_standard_arn(standards_short_name)
                }
            }
            
            response = self.securityhub.batch_enable_standards(**enable_params)
            
            return {
                'success': True,
                'standards_arn': standards_arn if standards_arn else self._get_standard_arn(standards_short_name),
                'standards_subscriptions': response.get('StandardsSubscriptions', [])
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_standard_arn(self, standards_short_name):
        """Obtener ARN de estándar"""
        
        standard_arns = {
            'cis': 'arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.2.0',
            'pci-dss': 'arn:aws:securityhub:::ruleset/pci-dss/v/3.2.1',
            'nist': 'arn:aws:securityhub:::ruleset/nist-800-53/v/4.0.0',
            'aws-foundational': 'arn:aws:securityhub:::ruleset/aws-foundational-security-best-practices/v/1.0.0'
        }
        
        return standard_arns.get(standards_short_name.lower(), standards_short_name)
    
    def get_enabled_standards(self, standards_subscription_arns=None):
        """Obtener estándares habilitados"""
        
        try:
            params = {}
            
            if standards_subscription_arns:
                params['StandardsSubscriptionArns'] = standards_subscription_arns
            
            response = self.securityhub.get_enabled_standards(**params)
            
            standards = []
            for standard in response.get('StandardsSubscriptions', []):
                standard_info = {
                    'standards_subscription_arn': standard.get('StandardsSubscriptionArn', ''),
                    'standards_arn': standard.get('StandardsArn', ''),
                    'standards_input': standard.get('StandardsInput', {}),
                    'standards_status': standard.get('StandardsStatus', ''),
                    'standards_status_reason': standard.get('StandardsStatusReason', '')
                }
                standards.append(standard_info)
            
            return {
                'success': True,
                'standards': standards,
                'count': len(standards)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_security_controls(self, standards_control_arn=None, security_control_ids=None):
        """Obtener controles de seguridad"""
        
        try:
            params = {}
            
            if standards_control_arn:
                params['StandardsControlArn'] = standards_control_arn
            
            if security_control_ids:
                params['SecurityControlIds'] = security_control_ids
            
            response = self.securityhub.get_security_controls(**params)
            
            controls = []
            for control in response.get('Controls', []):
                control_info = {
                    'control_id': control.get('ControlId', ''),
                    'control_title': control.get('ControlTitle', ''),
                    'control_description': control.get('ControlDescription', ''),
                    'control_status': control.get('ControlStatus', ''),
                    'remediation_url': control.get('RemediationUrl', ''),
                    'severity_rating': control.get('SeverityRating', ''),
                    'security_control_arn': control.get('SecurityControlArn', ''),
                    'related_standards': control.get('RelatedStandards', []),
                    'parameters': control.get('Parameters', {}),
                    'last_updated_reason': control.get('LastUpdatedReason', ''),
                    'workflow_status': control.get('WorkflowStatus', '')
                }
                controls.append(control_info)
            
            return {
                'success': True,
                'controls': controls,
                'count': len(controls)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_security_controls(self, security_control_arns, control_status=None,
                               reason=None, security_control_ids=None):
        """Actualizar controles de seguridad"""
        
        try:
            update_params = {
                'SecurityControlArns': security_control_arns
            }
            
            if control_status:
                update_params['ControlStatus'] = control_status
            
            if reason:
                update_params['Reason'] = reason
            
            if security_control_ids:
                update_params['SecurityControlIds'] = security_control_ids
            
            response = self.securityhub.batch_update_security_controls(**update_params)
            
            return {
                'success': True,
                'updated_controls': response.get('UpdatedControls', []),
                'failed_controls': response.get('UnprocessedControls', [])
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_security_hub_statistics(self):
        """Obtener estadísticas de Security Hub"""
        
        try:
            response = self.securityhub.get_statistics()
            
            statistics = {
                'critical_severity': response.get('CriticalSeverity', 0),
                'high_severity': response.get('HighSeverity', 0),
                'medium_severity': response.get('MediumSeverity', 0),
                'low_severity': response.get('LowSeverity', 0),
                'informational_severity': response.get('InformationalSeverity', 0),
                'total_findings': response.get('TotalFindings', 0),
                'by_type': response.get('Types', {}),
                'by_product': response.get('Products', {}),
                'by_compliance_status': response.get('ComplianceStatus', {})
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
    
    def create_automation_rule(self, rule_name, rule_description, rule_status,
                              rule_criteria, rule_actions):
        """Crear regla de automatización"""
        
        try:
            rule_config = {
                'RuleName': rule_name,
                'Description': rule_description,
                'RuleStatus': rule_status,
                'RuleCriteria': rule_criteria,
                'RuleActions': rule_actions
            }
            
            response = self.securityhub.create_automation_rules(
                AutomationRules=[rule_config]
            )
            
            return {
                'success': True,
                'rule_arn': response['Rules'][0]['RuleArn'],
                'rule_name': rule_name,
                'rule_id': response['Rules'][0]['RuleId']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_automation_rule(self, rule_arn, rule_name=None, description=None,
                            rule_status=None, rule_criteria=None, rule_actions=None):
        """Actualizar regla de automatización"""
        
        try:
            update_params = {'RuleArn': rule_arn}
            
            if rule_name:
                update_params['RuleName'] = rule_name
            
            if description:
                update_params['Description'] = description
            
            if rule_status:
                update_params['RuleStatus'] = rule_status
            
            if rule_criteria:
                update_params['RuleCriteria'] = rule_criteria
            
            if rule_actions:
                update_params['RuleActions'] = rule_actions
            
            response = self.securityhub.update_automation_rule(**update_params)
            
            return {
                'success': True,
                'rule_arn': rule_arn,
                'updated': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_automation_rules(self, rule_arns=None):
        """Obtener reglas de automatización"""
        
        try:
            params = {}
            
            if rule_arns:
                params['RuleArns'] = rule_arns
            
            response = self.securityhub.describe_automation_rules(**params)
            
            rules = []
            for rule in response.get('Rules', []):
                rule_info = {
                    'rule_arn': rule.get('RuleArn', ''),
                    'rule_name': rule.get('RuleName', ''),
                    'description': rule.get('Description', ''),
                    'rule_status': rule.get('RuleStatus', ''),
                    'rule_criteria': rule.get('RuleCriteria', {}),
                    'rule_actions': rule.get('RuleActions', {}),
                    'created_at': rule.get('CreatedAt', '').isoformat() if rule.get('CreatedAt') else '',
                    'updated_at': rule.get('UpdatedAt', '').isoformat() if rule.get('UpdatedAt') else ''
                }
                rules.append(rule_info)
            
            return {
                'success': True,
                'rules': rules,
                'count': len(rules)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_action_target(self, action_target_arn, name, description):
        """Crear objetivo de acción"""
        
        try:
            response = self.securityhub.create_action_target(
                ActionTargetArn=action_target_arn,
                Name=name,
                Description=description
            )
            
            return {
                'success': True,
                'action_target_arn': action_target_arn,
                'name': name,
                'description': description
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_action_targets(self):
        """Listar objetivos de acción"""
        
        try:
            response = self.securityhub.list_action_targets()
            
            action_targets = []
            for target in response.get('ActionTargets', []):
                target_info = {
                    'action_target_arn': target.get('ActionTargetArn', ''),
                    'name': target.get('Name', ''),
                    'description': target.get('Description', '')
                }
                action_targets.append(target_info)
            
            return {
                'success': True,
                'action_targets': action_targets,
                'count': len(action_targets)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_members(self, account_ids=None):
        """Obtener miembros de Security Hub"""
        
        try:
            params = {}
            
            if account_ids:
                params['AccountIds'] = account_ids
            
            response = self.securityhub.list_members(**params)
            
            members = []
            for member in response.get('Members', []):
                member_info = {
                    'account_id': member.get('AccountId', ''),
                    'email': member.get('Email', ''),
                    'master_id': member.get('MasterId', ''),
                    'member_status': member.get('MemberStatus', ''),
                    'invited_at': member.get('InvitedAt', '').isoformat() if member.get('InvitedAt') else '',
                    'updated_at': member.get('UpdatedAt', '').isoformat() if member.get('UpdatedAt') else ''
                }
                members.append(member_info)
            
            return {
                'success': True,
                'members': members,
                'count': len(members)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def invite_members(self, account_ids):
        """Invitar miembros a Security Hub"""
        
        try:
            response = self.securityhub.invite_members(AccountIds=account_ids)
            
            return {
                'success': True,
                'unprocessed_accounts': response.get('UnprocessedAccounts', []),
                'invited_count': len(account_ids) - len(response.get('UnprocessedAccounts', []))
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_security_hub_report(self, report_type='compliance', time_range_days=30):
        """Generar reporte de Security Hub"""
        
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
            
            if report_type == 'compliance':
                # Obtener estadísticas generales
                stats_response = self.get_security_hub_statistics()
                if stats_response['success']:
                    report['security_statistics'] = stats_response['statistics']
                
                # Obtener estándares habilitados
                standards_response = self.get_enabled_standards()
                if standards_response['success']:
                    report['enabled_standards'] = standards_response['standards']
                
                # Obtener hallazgos recientes
                finding_filters = {
                    'CreatedAt': {
                        'DateRange': {
                            'Unit': 'DAYS',
                            'Value': time_range_days
                        }
                    }
                }
                
                findings_response = self.get_findings(filters=finding_filters, max_results=1000)
                
                if findings_response['success']:
                    findings = findings_response['findings']
                    report['findings_analysis'] = self._analyze_findings_for_report(findings)
            
            elif report_type == 'trends':
                # Reporte de tendencias
                findings_response = self.get_findings(max_results=1000)
                
                if findings_response['success']:
                    findings = findings_response['findings']
                    report['trend_analysis'] = self._analyze_security_trends(findings)
            
            elif report_type == 'executive':
                # Reporte ejecutivo
                stats_response = self.get_security_hub_statistics()
                if stats_response['success']:
                    stats = stats_response['statistics']
                    report['executive_summary'] = {
                        'total_findings': stats['total_findings'],
                        'critical_findings': stats['critical_severity'],
                        'high_findings': stats['high_severity'],
                        'risk_level': self._calculate_risk_level(stats),
                        'compliance_score': self._calculate_compliance_score(stats)
                    }
            
            return {
                'success': True,
                'security_hub_report': report
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _analyze_findings_for_report(self, findings):
        """Analizar hallazgos para reporte"""
        
        analysis = {
            'total_findings': len(findings),
            'by_severity': {},
            'by_type': {},
            'by_product': {},
            'by_compliance_status': {},
            'critical_findings': [],
            'trend_analysis': {}
        }
        
        for finding in findings:
            # Agrupar por severidad
            severity = finding['severity']['label']
            if severity not in analysis['by_severity']:
                analysis['by_severity'][severity] = 0
            analysis['by_severity'][severity] += 1
            
            # Agrupar por tipo
            for finding_type in finding['types']:
                if finding_type not in analysis['by_type']:
                    analysis['by_type'][finding_type] = 0
                analysis['by_type'][finding_type] += 1
            
            # Agrupar por producto
            product_arn = finding['product_arn']
            product_name = product_arn.split(':')[-2] if ':' in product_arn else 'Unknown'
            if product_name not in analysis['by_product']:
                analysis['by_product'][product_name] = 0
            analysis['by_product'][product_name] += 1
            
            # Agrupar por estado de cumplimiento
            compliance_status = finding['compliance'].get('status', '')
            if compliance_status:
                if compliance_status not in analysis['by_compliance_status']:
                    analysis['by_compliance_status'][compliance_status] = 0
                analysis['by_compliance_status'][compliance_status] += 1
            
            # Hallazgos críticos
            if severity == 'CRITICAL':
                analysis['critical_findings'].append({
                    'id': finding['id'],
                    'title': finding['title'],
                    'severity': finding['severity']['normalized'],
                    'product': product_name
                })
        
        return analysis
    
    def _analyze_security_trends(self, findings):
        """Analizar tendencias de seguridad"""
        
        trends = {
            'finding_trends': {},
            'severity_trends': {},
            'product_trends': {},
            'risk_assessment': {}
        }
        
        # Analizar tendencias por día (simplificado)
        daily_counts = {}
        for finding in findings:
            created_date = finding['created_at'].split('T')[0] if finding['created_at'] else 'Unknown'
            if created_date not in daily_counts:
                daily_counts[created_date] = 0
            daily_counts[created_date] += 1
        
        trends['finding_trends'] = daily_counts
        
        # Evaluar riesgo general
        stats_response = self.get_security_hub_statistics()
        if stats_response['success']:
            stats = stats_response['statistics']
            trends['risk_assessment'] = {
                'risk_level': self._calculate_risk_level(stats),
                'trend_direction': 'STABLE',  # Simplificado
                'recommendations': self._generate_trend_recommendations(stats)
            }
        
        return trends
    
    def _calculate_risk_level(self, statistics):
        """Calcular nivel de riesgo"""
        
        critical = statistics.get('critical_severity', 0)
        high = statistics.get('high_severity', 0)
        total = statistics.get('total_findings', 1)
        
        if critical > 0:
            return 'CRITICAL'
        elif high > 10:
            return 'HIGH'
        elif high > 0:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def _calculate_compliance_score(self, statistics):
        """Calcular puntuación de cumplimiento"""
        
        total = statistics.get('total_findings', 1)
        compliant = statistics.get('by_compliance_status', {}).get('PASSED', 0)
        
        return round((compliant / total) * 100, 2)
    
    def _generate_trend_recommendations(self, statistics):
        """Generar recomendaciones basadas en tendencias"""
        
        recommendations = []
        
        critical = statistics.get('critical_severity', 0)
        high = statistics.get('high_severity', 0)
        
        if critical > 0:
            recommendations.append({
                'priority': 'CRITICAL',
                'action': 'Address critical findings immediately',
                'details': f'{critical} critical findings detected'
            })
        
        if high > 20:
            recommendations.append({
                'priority': 'HIGH',
                'action': 'Review and remediate high severity findings',
                'details': f'{high} high severity findings require attention'
            })
        
        return recommendations
    
    def setup_security_hub_automation(self, sns_topic_arn=None):
        """Configurar automatización de Security Hub"""
        
        try:
            automation_setup = {
                'automation_rules': [],
                'action_targets': [],
                'sns_topic_arn': None,
                'insights': []
            }
            
            # Crear o usar SNS topic
            if sns_topic_arn:
                automation_setup['sns_topic_arn'] = sns_topic_arn
            else:
                # Crear nuevo SNS topic
                topic_response = self.sns.create_topic(
                    Name='security-hub-alerts',
                    Tags=[
                        {'Key': 'Service', 'Value': 'SecurityHub'},
                        {'Key': 'Purpose', 'Value': 'SecurityAlerts'}
                    ]
                )
                automation_setup['sns_topic_arn'] = topic_response['TopicArn']
            
            # Crear regla de automatización para hallazgos críticos
            critical_rule = self.create_automation_rule(
                rule_name='critical-findings-automation',
                rule_description='Automatically process critical security findings',
                rule_status='ENABLED',
                rule_criteria={
                    'ProductArn': [{'Value': '*', 'Comparison': 'EQUALS'}],
                    'SeverityLabel': [{'Value': 'CRITICAL', 'Comparison': 'EQUALS'}]
                },
                rule_actions=[
                    {
                        'Type': 'WORKFLOW',
                        'Workflow': {'Status': 'NEW'}
                    }
                ]
            )
            
            if critical_rule['success']:
                automation_setup['automation_rules'].append(critical_rule['rule_arn'])
            
            # Crear insight para hallazgos de alta severidad
            high_severity_filters = {
                'SeverityLabel': [{'Value': 'HIGH', 'Comparison': 'EQUALS'}]
            }
            
            insight_result = self.create_custom_insight(
                insight_name='high-severity-findings',
                insight_description='All high severity security findings',
                filters=high_severity_filters,
                group_by_attribute='ProductArn'
            )
            
            if insight_result['success']:
                automation_setup['insights'].append(insight_result['insight_arn'])
            
            return {
                'success': True,
                'automation_setup': automation_setup
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Habilitar Security Hub**
```python
# Ejemplo: Habilitar AWS Security Hub
manager = SecurityHubManager('us-east-1')

# Habilitar Security Hub con estándares por defecto
enable_result = manager.enable_security_hub(
    enable_default_standards=True,
    tags=[
        {'Key': 'Environment', 'Value': 'production'},
        {'Key': 'Team', 'Value': 'Security'}
    ]
)

if enable_result['success']:
    print("AWS Security Hub enabled successfully")
    
    # Configurar automatización
    automation_result = manager.setup_security_hub_automation()
    
    if automation_result['success']:
        setup = automation_result['automation_setup']
        print(f"Automation configured with {len(setup['automation_rules'])} rules")
```

### **2. Habilitar Estándares de Cumplimiento**
```python
# Ejemplo: Habilitar estándares de cumplimiento
standards = ['cis', 'pci-dss', 'aws-foundational']

for standard in standards:
    standard_result = manager.enable_security_hub_standard(standard)
    
    if standard_result['success']:
        print(f"Standard {standard} enabled successfully")
```

### **3. Importar Hallazgos Personalizados**
```python
# Ejemplo: Importar hallazgos personalizados
custom_findings = [
    {
        'SchemaVersion': '2018-10-08',
        'Id': 'custom-finding-001',
        'ProductArn': 'arn:aws:securityhub:us-east-1:123456789012:product/custom/security-scanner',
        'GeneratorId': 'custom-security-scanner',
        'AwsAccountId': '123456789012',
        'Types': ['Software and Configuration Checks/AWS Security Best Practices'],
        'FirstObservedAt': '2023-12-01T00:00:00Z',
        'LastObservedAt': '2023-12-01T00:00:00Z',
        'CreatedAt': '2023-12-01T00:00:00Z',
        'UpdatedAt': '2023-12-01T00:00:00Z',
        'Severity': {
            'Label': 'HIGH',
            'Normalized': 70
        },
        'Title': 'Unencrypted S3 Bucket',
        'Description': 'S3 bucket is not encrypted',
        'Remediation': {
            'Recommendation': {
                'Text': 'Enable server-side encryption for the S3 bucket'
            }
        },
        'Resources': [
            {
                'Type': 'AwsS3Bucket',
                'Id': 'arn:aws:s3:::unencrypted-bucket',
                'Partition': 'aws',
                'Region': 'us-east-1'
            }
        ]
    }
]

import_result = manager.import_findings(custom_findings)

if import_result['success']:
    print(f"Imported {import_result['imported_count']} findings")
    if import_result['failed_count'] > 0:
        print(f"Failed to import {import_result['failed_count']} findings")
```

### **4. Analizar Hallazgos**
```python
# Ejemplo: Obtener y analizar hallazgos
findings_result = manager.get_findings(max_results=100)

if findings_result['success']:
    findings = findings_result['findings']
    print(f"Found {len(findings)} security findings")
    
    # Analizar hallazgos críticos
    critical_findings = [f for f in findings if f['severity']['label'] == 'CRITICAL']
    if critical_findings:
        print(f"CRITICAL: {len(critical_findings)} findings require immediate attention")
        for finding in critical_findings:
            print(f"  - {finding['title']}")
    
    # Obtener estadísticas
    stats_result = manager.get_security_hub_statistics()
    if stats_result['success']:
        stats = stats_result['statistics']
        print(f"Statistics: Critical={stats['critical_severity']}, High={stats['high_severity']}")
```

### **5. Generar Reporte de Cumplimiento**
```python
# Ejemplo: Generar reporte de cumplimiento
report_result = manager.generate_security_hub_report(
    report_type='compliance',
    time_range_days=30
)

if report_result['success']:
    report = report_result['security_hub_report']
    stats = report['security_statistics']
    
    print("Compliance Report")
    print(f"Total Findings: {stats['total_findings']}")
    print(f"Critical: {stats['critical_severity']}")
    print(f"High: {stats['high_severity']}")
    print(f"Medium: {stats['medium_severity']}")
    print(f"Low: {stats['low_severity']}")
    
    if 'findings_analysis' in report:
        analysis = report['findings_analysis']
        print(f"Findings by severity: {analysis['by_severity']}")
        print(f"Findings by product: {analysis['by_product']}")
```

## Configuración con AWS CLI

### **Habilitar y Configurar Security Hub**
```bash
# Habilitar Security Hub
aws securityhub enable-security-hub --enable-default-standards

# Deshabilitar Security Hub
aws securityhub disable-security-hub

# Obtener estado de Security Hub
aws securityhub describe-hub

# Habilitar Security Hub para organización
aws securityhub enable-organization-admin-account \
  --admin-account-id 123456789012 \
  --configuration AutoEnableStandards=true,AutoEnableMembers=true
```

### **Gestión de Estándares**
```bash
# Habilitar estándar CIS
aws securityhub batch-enable-standards \
  --standards-subscription-requests StandardsArn=arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.2.0

# Habilitar estándar PCI-DSS
aws securityhub batch-enable-standards \
  --standards-subscription-requests StandardsArn=arn:aws:securityhub:::ruleset/pci-dss/v/3.2.1

# Listar estándares habilitados
aws securityhub get-enabled-standards

# Obtener controles de seguridad
aws securityhub get-security-controls \
  --security-control-ids IAM.1 S3.1 EC2.1
```

### **Gestión de Hallazgos**
```bash
# Obtener hallazgos
aws securityhub get-findings \
  --filters '{"SeverityLabel":[{"Value":"CRITICAL","Comparison":"EQUALS"}]}'

# Importar hallazgos
aws securityhub batch-import-findings \
  --findings file://findings.json

# Actualizar hallazgos
aws securityhub batch-update-findings \
  --findings file://findings-update.json

# Obtener estadísticas
aws securityhub get-statistics
```

### **Gestión de Automatización**
```bash
# Crear regla de automatización
aws securityhub create-automation-rules \
  --automation-rules file://automation-rules.json

# Listar reglas de automatización
aws securityhub describe-automation-rules

# Actualizar regla de automatización
aws securityhub update-automation-rule \
  --rule-arn arn:aws:securityhub:region:account-id:automation-rule/rule-id \
  --rule-status DISABLED
```

### **Gestión de Insights**
```bash
# Crear insight personalizado
aws securityhub create-insight \
  --name "High Severity Findings" \
  --description "All high severity security findings" \
  --filters '{"SeverityLabel":[{"Value":"HIGH","Comparison":"EQUALS"}]}' \
  --group-by-attribute ProductArn

# Obtener resultados de insight
aws securityhub get-insight-results \
  --insight-arn arn:aws:securityhub:region:account-id:insight/insight-id

# Listar insights
aws securityhub list-insights
```

## Best Practices

### **1. Configuración Inicial**
- Habilitar Security Hub en todas las regiones relevantes
- Configurar estándares de cumplimiento apropiados
- Establecer integración con servicios de seguridad
- Configurar notificaciones para hallazgos críticos

### **2. Gestión de Hallazgos**
- Importar hallazgos de todos los servicios de seguridad
- Configurar deduplicación y normalización
- Establecer flujos de trabajo para diferentes tipos de hallazgos
- Documentar procedimientos de respuesta

### **3. Automatización**
- Configurar reglas de automatización para hallazgos comunes
- Establecer insights personalizados para análisis específicos
- Integrar con sistemas de ticketing
- Configurar respuestas automáticas cuando sea seguro

### **4. Cumplimiento**
- Habilitar estándares relevantes para la industria
- Regularizar evaluaciones de cumplimiento
- Generar reportes periódicos
- Mantener documentación de controles

## Costos

### **Precios de AWS Security Hub**
- **Gratis**: Primer 30 días de uso
- **Después del período de prueba**: $1.00 por miembro por mes
- **Ingestión de hallazgos**: $0.25 por 100,000 hallazgos ingeridos
- **Reglas de automatización**: $0.10 por regla por mes

### **Ejemplo de Costos Mensuales**
- **10 cuentas miembro**: 10 × $1.00 = $10.00
- **1M hallazgos**: 10 × $0.25 = $2.50
- **5 reglas de automatización**: 5 × $0.10 = $0.50
- **Total estimado**: ~$13.00 por mes

## Troubleshooting

### **Problemas Comunes**
1. **Security Hub no habilita**: Verificar permisos y región
2. **No hay hallazgos**: Revisar integración con servicios de seguridad
3. **Estándares no habilitan**: Verificar permisos y configuración
4. **Automatización no funciona**: Revisar configuración de reglas

### **Comandos de Diagnóstico**
```bash
# Verificar estado de Security Hub
aws securityhub describe-hub

# Verificar estándares habilitados
aws securityhub get-enabled-standards

# Verificar integración de servicios
aws securityhub list-members

# Verificar reglas de automatización
aws securityhub describe-automation-rules
```

## Cumplimiento Normativo

### **CIS AWS Foundations Benchmark**
- **Control 1.1**: Avoid the use of the root account
- **Control 1.2**: Ensure multi-factor authentication (MFA) is enabled
- **Control 1.3**: Ensure hardware MFA is enabled for the root account
- **Control 1.4**: Avoid using access keys for the root user

### **PCI-DSS**
- **Requirement 1**: Install and maintain a firewall configuration
- **Requirement 2**: Do not use vendor-supplied defaults
- **Requirement 3**: Protect stored cardholder data
- **Requirement 4**: Encrypt transmission of cardholder data

### **NIST Cybersecurity Framework**
- **Identify**: Asset Management, Risk Assessment
- **Protect**: Access Control, Awareness and Training
- **Detect**: Anomalous Activities, Continuous Monitoring
- **Respond**: Response Planning, Communications
- **Recover**: Recovery Planning, Improvements

## Integración con Otros Servicios

### **AWS GuardDuty**
- **Threat Detection**: Detección de amenazas
- **Malware Protection**: Protección contra malware
- **Anomaly Detection**: Detección de anomalías
- **Intelligence**: Inteligencia de amenazas

### **AWS Inspector**
- **Vulnerability Assessment**: Evaluación de vulnerabilidades
- **Application Security**: Seguridad de aplicaciones
- **Network Security**: Seguridad de red
- **Host Assessment**: Evaluación de hosts

### **AWS Macie**
- **Data Discovery**: Descubrimiento de datos
- **Data Classification**: Clasificación de datos
- **PII Detection**: Detección de PII
- **Compliance**: Cumplimiento de privacidad

### **AWS Config**
- **Configuration Tracking**: Seguimiento de configuración
- **Compliance Monitoring**: Monitoreo de cumplimiento
- **Change Management**: Gestión de cambios
- **Resource Inventory**: Inventario de recursos

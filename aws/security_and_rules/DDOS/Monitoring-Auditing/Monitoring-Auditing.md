# AWS Monitoring & Auditing

## Definición

AWS Monitoring & Auditing es un conjunto de servicios y herramientas que permiten supervisar, registrar y auditar el uso y la seguridad de los recursos de AWS. Estos servicios proporcionan visibilidad completa sobre el rendimiento, la disponibilidad y el cumplimiento normativo de tu infraestructura en la nube.

## Servicios de Monitoreo

### **1. Amazon CloudWatch**
- **Métricas**: Recopilación y almacenamiento de métricas
- **Logs**: Agregación y análisis de logs
- **Alarms**: Alertas basadas en umbrales
- **Dashboards**: Visualización de métricas

### **2. AWS CloudTrail**
- **API Logging**: Registro de todas las llamadas a la API
- **Event History**: Historial de eventos de la cuenta
- **Trail Management**: Gestión de trails de auditoría
- **Insights**: Análisis de eventos inusuales

### **3. AWS Config**
- **Configuration Tracking**: Seguimiento de configuraciones
- **Compliance**: Evaluación de cumplimiento normativo
- **Rules**: Reglas de configuración personalizadas
- **Remediation**: Corrección automática de problemas

## Servicios de Auditoría

### **1. AWS Audit Manager**
- **Auditorías Centralizadas**: Gestión de auditorías
- **Frameworks**: Cumplimiento de estándares (SOC, PCI, HIPAA)
- **Evidence Collection**: Recopilación automática de evidencia
- **Reporting**: Generación de informes de auditoría

### **2. Amazon GuardDuty**
- **Threat Detection**: Detección inteligente de amenazas
- **Malware Protection**: Análisis de malware
- **Account Protection**: Protección a nivel de cuenta
- **Findings**: Hallazgos de seguridad detallados

### **3. AWS Security Hub**
- **Security Centralization**: Centralización de alertas
- **Compliance Standards**: Estándares de cumplimiento
- **Automation**: Respuestas automatizadas
- **Risk Scoring**: Puntuación de riesgos

## Configuración de Monitoreo y Auditoría

### **Gestión Integral de Monitoreo**
```python
import boto3
import json
from datetime import datetime, timedelta

class MonitoringAuditingManager:
    def __init__(self, region='us-east-1'):
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.logs = boto3.client('logs', region_name=region)
        self.cloudtrail = boto3.client('cloudtrail', region_name=region)
        self.config = boto3.client('config', region_name=region)
        self.guardduty = boto3.client('guardduty', region_name=region)
        self.securityhub = boto3.client('securityhub', region_name=region)
        self.audit = boto3.client('auditmanager', region_name=region)
        self.region = region
    
    def setup_comprehensive_monitoring(self, project_name, environment, resources):
        """Configurar monitoreo comprehensivo para recursos"""
        
        try:
            monitoring_setup = {
                'cloudwatch': {},
                'cloudtrail': {},
                'config': {},
                'guardduty': {},
                'securityhub': {},
                'logs': {}
            }
            
            # 1. Configurar CloudWatch
            cloudwatch_result = self._setup_cloudwatch_monitoring(
                project_name, environment, resources
            )
            monitoring_setup['cloudwatch'] = cloudwatch_result
            
            # 2. Configurar CloudTrail
            cloudtrail_result = self._setup_cloudtrail_monitoring(
                project_name, environment
            )
            monitoring_setup['cloudtrail'] = cloudtrail_result
            
            # 3. Configurar AWS Config
            config_result = self._setup_config_monitoring(
                project_name, environment
            )
            monitoring_setup['config'] = config_result
            
            # 4. Configurar GuardDuty
            guardduty_result = self._setup_guardduty_monitoring(
                project_name, environment
            )
            monitoring_setup['guardduty'] = guardduty_result
            
            # 5. Configurar Security Hub
            securityhub_result = self._setup_securityhub_monitoring(
                project_name, environment
            )
            monitoring_setup['securityhub'] = securityhub_result
            
            # 6. Configurar CloudWatch Logs
            logs_result = self._setup_logs_monitoring(
                project_name, environment, resources
            )
            monitoring_setup['logs'] = logs_result
            
            return {
                'success': True,
                'monitoring_setup': monitoring_setup,
                'project_name': project_name,
                'environment': environment
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _setup_cloudwatch_monitoring(self, project_name, environment, resources):
        """Configurar monitoreo de CloudWatch"""
        
        try:
            setup_result = {
                'dashboards': [],
                'alarms': [],
                'metric_filters': []
            }
            
            # Crear dashboard principal
            dashboard_name = f'{project_name}-{environment}-dashboard'
            dashboard_body = self._create_dashboard_body(project_name, environment, resources)
            
            try:
                self.cloudwatch.put_dashboard(
                    DashboardName=dashboard_name,
                    DashboardBody=json.dumps(dashboard_body)
                )
                setup_result['dashboards'].append(dashboard_name)
            except Exception as e:
                # Dashboard might already exist
                pass
            
            # Crear alarmas críticas
            critical_alarms = self._create_critical_alarms(project_name, environment, resources)
            setup_result['alarms'] = critical_alarms
            
            # Crear filtros de métricas para logs
            metric_filters = self._create_metric_filters(project_name, environment)
            setup_result['metric_filters'] = metric_filters
            
            return {
                'success': True,
                'setup': setup_result
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _create_dashboard_body(self, project_name, environment, resources):
        """Crear cuerpo de dashboard"""
        
        dashboard_body = {
            'widgets': []
        }
        
        # Widget de CPU utilization para EC2
        if 'ec2_instances' in resources:
            dashboard_body['widgets'].append({
                'type': 'metric',
                'properties': {
                    'metrics': [
                        ['AWS/EC2', 'CPUUtilization', 'InstanceId', resources['ec2_instances'][0]]
                    ],
                    'view': 'timeSeries',
                    'stacked': False,
                    'region': self.region,
                    'title': 'EC2 CPU Utilization',
                    'period': 300
                }
            })
        
        # Widget de RequestCount para ALB
        if 'load_balancers' in resources:
            dashboard_body['widgets'].append({
                'type': 'metric',
                'properties': {
                    'metrics': [
                        ['AWS/ApplicationELB', 'RequestCount', 'LoadBalancer', resources['load_balancers'][0]]
                    ],
                    'view': 'timeSeries',
                    'stacked': False,
                    'region': self.region,
                    'title': 'ALB Request Count',
                    'period': 60
                }
            })
        
        # Widget de Database Connections para RDS
        if 'rds_instances' in resources:
            dashboard_body['widgets'].append({
                'type': 'metric',
                'properties': {
                    'metrics': [
                        ['AWS/RDS', 'DatabaseConnections', 'DBInstanceIdentifier', resources['rds_instances'][0]]
                    ],
                    'view': 'timeSeries',
                    'stacked': False,
                    'region': self.region,
                    'title': 'RDS Database Connections',
                    'period': 60
                }
            })
        
        return dashboard_body
    
    def _create_critical_alarms(self, project_name, environment, resources):
        """Crear alarmas críticas"""
        
        alarms_created = []
        
        # Alarmas para EC2
        if 'ec2_instances' in resources:
            for instance_id in resources['ec2_instances']:
                # CPU alta
                alarm_name = f'{project_name}-{environment}-ec2-{instance_id}-cpu-high'
                try:
                    self.cloudwatch.put_metric_alarm(
                        AlarmName=alarm_name,
                        AlarmDescription='CPU utilization is too high',
                        MetricName='CPUUtilization',
                        Namespace='AWS/EC2',
                        Statistic='Average',
                        Period=300,
                        EvaluationPeriods=2,
                        Threshold=80.0,
                        ComparisonOperator='GreaterThanThreshold',
                        TreatMissingData='missing',
                        AlarmActions=['arn:aws:sns:us-east-1:123456789012:alerts'],
                        Dimensions=[
                            {'Name': 'InstanceId', 'Value': instance_id}
                        ]
                    )
                    alarms_created.append(alarm_name)
                except Exception:
                    pass
                
                # Status check fallido
                alarm_name = f'{project_name}-{environment}-ec2-{instance_id}-status-failed'
                try:
                    self.cloudwatch.put_metric_alarm(
                        AlarmName=alarm_name,
                        AlarmDescription='Instance status check failed',
                        MetricName='StatusCheckFailed',
                        Namespace='AWS/EC2',
                        Statistic='Maximum',
                        Period=60,
                        EvaluationPeriods=1,
                        Threshold=0.0,
                        ComparisonOperator='GreaterThanThreshold',
                        TreatMissingData='missing',
                        AlarmActions=['arn:aws:sns:us-east-1:123456789012:alerts'],
                        Dimensions=[
                            {'Name': 'InstanceId', 'Value': instance_id}
                        ]
                    )
                    alarms_created.append(alarm_name)
                except Exception:
                    pass
        
        # Alarmas para ALB
        if 'load_balancers' in resources:
            for lb_name in resources['load_balancers']:
                # 5XX errors
                alarm_name = f'{project_name}-{environment}-alb-{lb_name}-5xx-errors'
                try:
                    self.cloudwatch.put_metric_alarm(
                        AlarmName=alarm_name,
                        AlarmDescription='ALB 5XX error rate is too high',
                        MetricName='HTTPCode_ELB_5XX_Count',
                        Namespace='AWS/ApplicationELB',
                        Statistic='Sum',
                        Period=60,
                        EvaluationPeriods=2,
                        Threshold=10.0,
                        ComparisonOperator='GreaterThanThreshold',
                        TreatMissingData='missing',
                        AlarmActions=['arn:aws:sns:us-east-1:123456789012:alerts'],
                        Dimensions=[
                            {'Name': 'LoadBalancer', 'Value': lb_name}
                        ]
                    )
                    alarms_created.append(alarm_name)
                except Exception:
                    pass
        
        return alarms_created
    
    def _create_metric_filters(self, project_name, environment):
        """Crear filtros de métricas para logs"""
        
        metric_filters = []
        
        # Filtro para errores de aplicación
        try:
            log_group_name = f'/aws/{project_name}/{environment}/application'
            filter_name = f'{project_name}-{environment}-error-count'
            
            self.logs.put_metric_filter(
                logGroupName=log_group_name,
                filterName=filter_name,
                filterPattern='[timestamp, request_id, level, message]',
                metricTransformations=[
                    {
                        'metricName': 'ErrorCount',
                        'metricNamespace': f'{project_name}/{environment}',
                        'metricValue': '1',
                        'defaultValue': 0
                    }
                ]
            )
            metric_filters.append(filter_name)
        except Exception:
            pass
        
        return metric_filters
    
    def _setup_cloudtrail_monitoring(self, project_name, environment):
        """Configurar CloudTrail para auditoría"""
        
        try:
            # Crear S3 bucket para CloudTrail logs
            s3_client = boto3.client('s3')
            bucket_name = f'{project_name}-{environment}-cloudtrail-logs-{int(datetime.utcnow().timestamp())}'
            
            try:
                s3_client.create_bucket(
                    Bucket=bucket_name,
                    CreateBucketConfiguration={'LocationConstraint': self.region}
                )
            except Exception:
                pass
            
            # Crear trail
            trail_name = f'{project_name}-{environment}-trail'
            response = self.cloudtrail.create_trail(
                Name=trail_name,
                S3BucketName=bucket_name,
                IncludeGlobalServiceEvents=True,
                IsMultiRegionTrail=True,
                EnableLogFileValidation=True,
                Tags=[
                    {'Key': 'Project', 'Value': project_name},
                    {'Key': 'Environment', 'Value': environment}
                ]
            )
            
            # Habilitar trail
            self.cloudtrail.start_logging(Name=trail_name)
            
            return {
                'success': True,
                'trail_name': trail_name,
                'trail_arn': response['TrailARN'],
                's3_bucket': bucket_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _setup_config_monitoring(self, project_name, environment):
        """Configurar AWS Config para seguimiento de configuración"""
        
        try:
            # Crear rol para AWS Config
            iam_client = boto3.client('iam')
            
            # Crear delivery channel
            delivery_channel_name = f'{project_name}-{environment}-delivery-channel'
            
            try:
                self.config.put_delivery_channel(
                    DeliveryChannelName=delivery_channel_name,
                    DeliveryChannelConfiguration={
                        's3BucketName': f'{project_name}-{environment}-config-logs',
                        'snsTopicARN': 'arn:aws:sns:us-east-1:123456789012:config-alerts'
                    }
                )
            except Exception:
                pass
            
            # Crear configuration recorder
            recorder_name = f'{project_name}-{environment}-recorder'
            
            try:
                self.config.put_configuration_recorder(
                    ConfigurationRecorderName=recorder_name,
                    RoleARN='arn:aws:iam::123456789012:role/aws-service-role/config.amazonaws.com/AWSServiceRoleForConfig',
                    RecordingGroup={
                        'allSupported': True,
                        'includeGlobalResourceTypes': True
                    }
                )
                
                # Iniciar recorder
                self.config.start_configuration_recorder(
                    ConfigurationRecorderName=recorder_name
                )
                
            except Exception:
                pass
            
            return {
                'success': True,
                'recorder_name': recorder_name,
                'delivery_channel': delivery_channel_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _setup_guardduty_monitoring(self, project_name, environment):
        """Configurar GuardDuty para detección de amenazas"""
        
        try:
            # Crear detector
            response = self.guardduty.create_detector(
                Enable=True,
                ClientToken=f'{project_name}-{environment}-detector',
                Tags=[
                    {'Key': 'Project', 'Value': project_name},
                    {'Key': 'Environment', 'Value': environment}
                ]
            )
            
            detector_id = response['DetectorId']
            
            # Configurar IP sets para IPs confiables
            try:
                self.guardduty.create_ip_set(
                    DetectorId=detector_id,
                    Name='trusted-ips',
                    Format='TXT',
                    Location=f's3://{project_name}-{environment}-security/trusted-ips.txt',
                    Activate=True
                )
            except Exception:
                pass
            
            # Actualizar detector con configuración óptima
            self.guardduty.update_detector(
                DetectorId=detector_id,
                Enable=True,
                Features=[
                    {'Name': 'FLOW_LOG', 'Status': 'ENABLED'},
                    {'Name': 'CLOUD_TRAIL', 'Status': 'ENABLED'},
                    {'Name': 'DNS_LOG', 'Status': 'ENABLED'},
                    {'Name': 'S3_DATA_EVENTS', 'Status': 'ENABLED'},
                    {'Name': 'EKS_AUDIT_LOG', 'Status': 'ENABLED'},
                    {'Name': 'EBS_MALWARE_PROTECTION', 'Status': 'ENABLED'}
                ]
            )
            
            return {
                'success': True,
                'detector_id': detector_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _setup_securityhub_monitoring(self, project_name, environment):
        """Configurar Security Hub para centralización de seguridad"""
        
        try:
            # Habilitar Security Hub
            try:
                self.securityhub.enable_security_hub(
                    Tags=[
                        {'Key': 'Project', 'Value': project_name},
                        {'Key': 'Environment', 'Value': environment}
                    ]
                )
            except Exception:
                pass  # Ya puede estar habilitado
            
            # Subscribir a estándares de seguridad
            standards = [
                'aws-foundational-security-best-practices/v/1.0.0',
                'pci-dss/v/3.2.1',
                'cis-aws-foundations-benchmark/v/1.2.0'
            ]
            
            for standard_arn in standards:
                try:
                    self.securityhub.subscribe_to_security_hub_standard(
                        StandardsArn=f'arn:aws:securityhub:{self.region}::security-standard/{standard_arn}'
                    )
                except Exception:
                    pass
            
            # Crear acciones automatizadas
            try:
                self.securityhub.create_action_target(
                    Name=f'{project_name}-{environment}-remediate',
                    Description='Automated remediation actions',
                    Id=f'{project_name}-{environment}-remediate'
                )
            except Exception:
                pass
            
            return {
                'success': True,
                'standards_subscribed': len(standards)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _setup_logs_monitoring(self, project_name, environment, resources):
        """Configurar CloudWatch Logs"""
        
        try:
            log_groups = []
            
            # Crear log groups por servicio
            services = ['application', 'nginx', 'database', 'security', 'audit']
            
            for service in services:
                log_group_name = f'/aws/{project_name}/{environment}/{service}'
                
                try:
                    self.logs.create_log_group(
                        logGroupName=log_group_name,
                        tags=[
                            {'Key': 'Project', 'Value': project_name},
                            {'Key': 'Environment', 'Value': environment},
                            {'Key': 'Service', 'Value': service}
                        ]
                    )
                    
                    # Configurar retención
                    retention_days = 30 if service in ['application', 'nginx'] else 365
                    self.logs.put_retention_policy(
                        logGroupName=log_group_name,
                        retentionInDays=retention_days
                    )
                    
                    log_groups.append({
                        'name': log_group_name,
                        'retention_days': retention_days
                    })
                    
                except Exception:
                    pass  # Log group might already exist
            
            return {
                'success': True,
                'log_groups': log_groups
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_compliance_report(self, project_name, environment):
        """Generar reporte de cumplimiento"""
        
        try:
            report = {
                'project_name': project_name,
                'environment': environment,
                'report_date': datetime.utcnow().isoformat(),
                'compliance_summary': {},
                'security_findings': [],
                'recommendations': []
            }
            
            # 1. Obtener resultados de Security Hub
            try:
                findings_response = self.securityhub.get_findings(
                    Filters=[
                        {'Field': 'SeverityLabel', 'ComparisonOperator': 'GREATER_THAN_OR_EQUAL', 'Value': 'LOW'},
                        {'Field': 'RecordState', 'ComparisonOperator': 'EQUALS', 'Value': 'ACTIVE'}
                    ],
                    MaxResults=100
                )
                
                security_findings = findings_response['Findings']
                report['security_findings'] = security_findings
                
                # Analizar hallazgos
                critical_findings = len([f for f in security_findings if f['Severity']['Label'] == 'CRITICAL'])
                high_findings = len([f for f in security_findings if f['Severity']['Label'] == 'HIGH'])
                medium_findings = len([f for f in security_findings if f['Severity']['Label'] == 'MEDIUM'])
                low_findings = len([f for f in security_findings if f['Severity']['Label'] == 'LOW'])
                
                report['compliance_summary']['security_findings'] = {
                    'critical': critical_findings,
                    'high': high_findings,
                    'medium': medium_findings,
                    'low': low_findings,
                    'total': len(security_findings)
                }
                
            except Exception:
                pass
            
            # 2. Obtener resultados de GuardDuty
            try:
                # Listar detectores
                detectors_response = self.guardduty.list_detectors()
                
                for detector in detectors_response['DetectorIds']:
                    findings_response = self.guardduty.list_findings(
                        DetectorId=detector,
                        FindingCriteria={'Criterion': {'Severity': {'Gte': 4}}},  # Medium y superior
                        MaxResults=50
                    )
                    
                    guardduty_findings = findings_response['FindingIds']
                    report['compliance_summary']['guardduty_findings'] = len(guardduty_findings)
                    
                    break  # Solo usar el primer detector
                    
            except Exception:
                pass
            
            # 3. Obtener resultados de AWS Config
            try:
                compliance_response = self.config.get_compliance_summary_by_config_rule()
                
                compliant_rules = len([r for r in compliance_response['ComplianceSummaryRules'] if r['Compliance']['ComplianceType'] == 'COMPLIANT'])
                non_compliant_rules = len([r for r in compliance_response['ComplianceSummaryRules'] if r['Compliance']['ComplianceType'] == 'NON_COMPLIANT'])
                
                report['compliance_summary']['config_rules'] = {
                    'compliant': compliant_rules,
                    'non_compliant': non_compliant_rules,
                    'total': compliant_rules + non_compliant_rules
                }
                
            except Exception:
                pass
            
            # 4. Generar recomendaciones
            recommendations = self._generate_recommendations(report['compliance_summary'])
            report['recommendations'] = recommendations
            
            return {
                'success': True,
                'report': report
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generate_recommendations(self, compliance_summary):
        """Generar recomendaciones basadas en el análisis de cumplimiento"""
        
        recommendations = []
        
        # Recomendaciones basadas en hallazgos de seguridad
        security_findings = compliance_summary.get('security_findings', {})
        if security_findings.get('critical', 0) > 0:
            recommendations.append({
                'priority': 'HIGH',
                'category': 'Security',
                'title': 'Critical Security Issues Detected',
                'description': f'Found {security_findings["critical"]} critical security findings that require immediate attention.',
                'action': 'Review and remediate critical findings immediately'
            })
        
        if security_findings.get('high', 0) > 5:
            recommendations.append({
                'priority': 'MEDIUM',
                'category': 'Security',
                'title': 'Multiple High Severity Findings',
                'description': f'Found {security_findings["high"]} high severity findings.',
                'action': 'Prioritize remediation of high severity findings'
            })
        
        # Recomendaciones basadas en reglas de Config
        config_rules = compliance_summary.get('config_rules', {})
        if config_rules.get('non_compliant', 0) > 0:
            recommendations.append({
                'priority': 'MEDIUM',
                'category': 'Compliance',
                'title': 'Non-Compliant Configuration Rules',
                'description': f'Found {config_rules["non_compliant"]} non-compliant configuration rules.',
                'action': 'Review and remediate non-compliant configurations'
            })
        
        # Recomendaciones basadas en hallazgos de GuardDuty
        guardduty_findings = compliance_summary.get('guardduty_findings', 0)
        if guardduty_findings > 10:
            recommendations.append({
                'priority': 'HIGH',
                'category': 'Threat Detection',
                'title': 'High Number of GuardDuty Findings',
                'description': f'Found {guardduty_findings} GuardDuty findings indicating potential security threats.',
                'action': 'Investigate and respond to GuardDuty findings'
            })
        
        # Recomendaciones generales
        recommendations.extend([
            {
                'priority': 'LOW',
                'category': 'Monitoring',
                'title': 'Review Monitoring Coverage',
                'description': 'Ensure all critical resources have appropriate monitoring and alerting.',
                'action': 'Review and enhance monitoring configuration'
            },
            {
                'priority': 'LOW',
                'category': 'Logging',
                'title': 'Optimize Log Retention',
                'description': 'Review log retention policies to balance compliance and cost.',
                'action': 'Optimize log retention policies based on compliance requirements'
            }
        ])
        
        return recommendations
    
    def create_audit_framework(self, project_name, environment, frameworks):
        """Crear framework de auditoría"""
        
        try:
            framework_setup = {
                'audit_manager': {},
                'security_standards': [],
                'evidence_collection': []
            }
            
            # Configurar AWS Audit Manager
            try:
                # Crear framework personalizado
                framework_name = f'{project_name}-{environment}-framework'
                
                framework_controls = []
                for framework in frameworks:
                    if framework == 'SOC2':
                        framework_controls.extend(self._get_soc2_controls())
                    elif framework == 'PCI-DSS':
                        framework_controls.extend(self._get_pci_dss_controls())
                    elif framework == 'HIPAA':
                        framework_controls.extend(self._get_hipaa_controls())
                
                try:
                    self.audit.create_assessment_framework(
                        Name=framework_name,
                        Description=f'Custom framework for {project_name} {environment}',
                        ComplianceType='Custom',
                        Controls=framework_controls,
                        Tags=[
                            {'Key': 'Project', 'Value': project_name},
                            {'Key': 'Environment', 'Value': environment}
                        ]
                    )
                    
                    framework_setup['audit_manager']['framework_name'] = framework_name
                    framework_setup['audit_manager']['controls_count'] = len(framework_controls)
                    
                except Exception:
                    pass
                
            except Exception:
                pass
            
            # Habilitar estándares en Security Hub
            for framework in frameworks:
                try:
                    if framework == 'SOC2':
                        standard_arn = 'arn:aws:securityhub:::security-standard/SOC2'
                    elif framework == 'PCI-DSS':
                        standard_arn = 'arn:aws:securityhub:::security-standard/pci-dss'
                    elif framework == 'HIPAA':
                        standard_arn = 'arn:aws:securityhub:::security-standard/hipaa'
                    else:
                        continue
                    
                    self.securityhub.subscribe_to_security_hub_standard(
                        StandardsArn=standard_arn
                    )
                    
                    framework_setup['security_standards'].append(framework)
                    
                except Exception:
                    pass
            
            return {
                'success': True,
                'framework_setup': framework_setup
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_soc2_controls(self):
        """Obtener controles SOC2"""
        
        return [
            {
                'Id': 'CC1.1',
                'Name': 'Control Environment',
                'Description': 'The entity defines and documents its control environment',
                'TestingInformation': 'Review control environment documentation'
            },
            {
                'Id': 'CC2.1',
                'Name': 'Communication',
                'Description': 'The entity communicates with required parties',
                'TestingInformation': 'Review communication procedures'
            }
        ]
    
    def _get_pci_dss_controls(self):
        """Obtener controles PCI-DSS"""
        
        return [
            {
                'Id': 'PCI-1.1.1',
                'Name': 'Network Security Control',
                'Description': 'A formal process for approving and testing all network connections',
                'TestingInformation': 'Review network connection approval process'
            },
            {
                'Id': 'PCI-2.2.1',
                'Name': 'Configuration Standards',
                'Description': 'Develop configuration standards for all system components',
                'TestingInformation': 'Review configuration standards documentation'
            }
        ]
    
    def _get_hipaa_controls(self):
        """Obtener controles HIPAA"""
        
        return [
            {
                'Id': 'HIPAA-164.308(a)(1)',
                'Name': 'Security Management Process',
                'Description': 'Implement policies and procedures to prevent, detect, contain, and correct security violations',
                'TestingInformation': 'Review security management policies'
            },
            {
                'Id': 'HIPAA-164.312(a)(1)',
                'Name': 'Access Control',
                'Description': 'Implement technical policies and procedures for electronic information access',
                'TestingInformation': 'Review access control implementation'
            }
        ]
```

## Casos de Uso

### **1. Configurar Monitoreo Completo**
```python
# Ejemplo: Configurar monitoreo comprehensivo
manager = MonitoringAuditingManager('us-east-1')

resources = {
    'ec2_instances': ['i-1234567890abcdef0', 'i-0987654321fedcba0'],
    'load_balancers': ['app-load-balancer'],
    'rds_instances': ['mydatabase']
}

monitoring_result = manager.setup_comprehensive_monitoring(
    project_name='secureapp',
    environment='production',
    resources=resources
)

if monitoring_result['success']:
    print("Comprehensive monitoring configured successfully")
    print(f"CloudTrail: {monitoring_result['monitoring_setup']['cloudtrail'].get('trail_name')}")
    print(f"GuardDuty: {monitoring_result['monitoring_setup']['guardduty'].get('detector_id')}")
```

### **2. Generar Reporte de Cumplimiento**
```python
# Ejemplo: Generar reporte de cumplimiento
report_result = manager.generate_compliance_report(
    project_name='secureapp',
    environment='production'
)

if report_result['success']:
    report = report_result['report']
    print(f"Compliance Report for {report['project_name']}")
    print(f"Security Findings: {report['compliance_summary'].get('security_findings', {}).get('total', 0)}")
    print(f"Config Rules: {report['compliance_summary'].get('config_rules', {}).get('total', 0)}")
    print(f"Recommendations: {len(report['recommendations'])}")
```

## Configuración con AWS CLI

### **Configurar Servicios de Monitoreo**
```bash
# Crear dashboard de CloudWatch
aws cloudwatch put-dashboard \
  --dashboard-name myapp-dashboard \
  --dashboard-body file://dashboard.json

# Crear alarma
aws cloudwatch put-metric-alarm \
  --alarm-name high-cpu \
  --alarm-description "CPU utilization is too high" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0

# Crear trail de CloudTrail
aws cloudtrail create-trail \
  --name myapp-trail \
  --s3-bucket-name my-cloudtrail-bucket \
  --include-global-service-events \
  --is-multi-region-trail

# Habilitar GuardDuty
aws guardduty create-detector --enable

# Habilitar Security Hub
aws securityhub enable-security-hub
```

## Best Practices

### **1. Monitoreo**
- Monitorizar todos los recursos críticos
- Configurar alarmas apropiadas
- Usar dashboards para visualización
- Revisar métricas regularmente

### **2. Logging**
- Habilitar logs para todos los servicios
- Configurar retención apropiada
- Usar métricas desde logs
- Centralizar logs para análisis

### **3. Auditoría**
- Habilitar CloudTrail multi-región
- Configurar AWS Config rules
- Usar estándares de cumplimiento
- Automatizar recopilación de evidencia

### **4. Seguridad**
- Habilitar GuardDuty y Security Hub
- Configurar alertas de seguridad
- Implementar respuestas automáticas
- Revisar hallazgos regularmente

## Costos

### **CloudWatch**
- **Métricas**: $0.30 por métrica (primeras 10 son gratis)
- **Alarms**: $0.10 por alarma
- **Logs**: $0.50 por GB ingestido
- **Dashboards**: $3.00 por dashboard por mes

### **CloudTrail**
- **Management Events**: Gratis
- **Data Events**: $0.10 por 100,000 eventos
- **Integrity Events**: $0.10 por 100,000 eventos

### **GuardDuty**
- **$1.00 por million de eventos**
- **Free tier**: Primeros 30 días gratis

### **Security Hub**
- **$0.24 por finding por mes**
- **Free tier**: Primeros 100 findings gratis

## Troubleshooting

### **Problemas Comunes**
1. **Métricas no aparecen**: Verificar configuración de CloudWatch
2. **Alarms no se disparan**: Revisar umbrales y períodos
3. **Logs no se envían**: Verificar permisos y configuración
4. **Trail no registra eventos**: Validar configuración de buckets

### **Comandos de Diagnóstico**
```bash
# Verificar métricas
aws cloudwatch list-metrics --namespace AWS/EC2

# Verificar alarmas
aws cloudwatch describe-alarms --alarm-names high-cpu

# Verificar trails
aws cloudtrail describe-trails --trail-name-list myapp-trail

# Verificar GuardDuty
aws guardduty get-detector --detector-id abc1234567890abcdef0
```

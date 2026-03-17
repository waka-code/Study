# AWS Config

## Definición

AWS Config es un servicio que permite evaluar, auditar y evaluar las configuraciones de tus recursos de AWS. Proporciona un inventario detallado de los recursos de AWS y su historial de configuración, permitiendo monitorear cambios, evaluar el cumplimiento de políticas y automatizar la corrección de configuraciones no conformes.

## Características Principales

### **Inventario de Recursos**
- **Descubrimiento automático**: Detección automática de recursos de AWS
- **Inventario completo**: Vista completa de todos los recursos
- **Metadatos detallados**: Información detallada de configuración
- **Relaciones entre recursos**: Mapeo de dependencias
- **Multi-región**: Soporte multi-regional

### **Historial de Configuración**
- **Seguimiento de cambios**: Historial completo de cambios
- **Linea de tiempo**: Visualización de cambios en el tiempo
- **Comparación de configuraciones**: Comparación entre versiones
- **Detalles de cambios**: Información detallada de cada cambio
- **Retención configurable**: Período de retención ajustable

### **Evaluación de Cumplimiento**
- **Reglas de conformidad**: Evaluación contra reglas predefinidas
- **Reglas personalizadas**: Creación de reglas personalizadas
- **Evaluación continua**: Monitoreo continuo del cumplimiento
- **Reportes de conformidad**: Reportes detallados de cumplimiento
- **Integración con Compliance**: Integración con frameworks de cumplimiento

### **Automatización y Remediación**
- **Corrección automática**: Remediación automática de no conformidades
- **Notificaciones**: Alertas de cambios y no conformidades
- **Integración con Lambda**: Funciones Lambda para personalización
- **Workflows personalizados**: Flujos de trabajo personalizados
- **Integración con SSM**: Integración con Systems Manager

## Componentes de AWS Config

### **1. Config Rules**
- **Reglas gestionadas**: Reglas predefinidas de AWS
- **Reglas personalizadas**: Reglas personalizadas con Lambda
- **Evaluación periódica**: Evaluación programada
- **Evaluación por eventos**: Evaluación basada en eventos
- **Trigger personalizado**: Configuración de triggers personalizados

### **2. Configuration Items**
- **Estado actual**: Configuración actual del recurso
- **Historial de cambios**: Cambios anteriores
- **Metadatos**: Información de metadatos
- **Relaciones**: Dependencias con otros recursos
- **Tags**: Etiquetas y clasificación

### **3. Aggregator**
- **Multi-cuenta**: Agregación multi-cuenta
- **Multi-región**: Agregación multi-región
- **Vista consolidada**: Vista unificada del cumplimiento
- **Reportes agregados**: Reportes consolidados
- **Políticas globales**: Políticas globales de cumplimiento

### **4. Conformance Packs**
- **Paquetes de reglas**: Colecciones de reglas predefinidas
- **Templates**: Plantillas de cumplimiento
- **Despliegue rápido**: Despliegue rápido de múltiples reglas
- **Versionado**: Control de versiones de paquetes
- **Cumplimiento específico**: Cumplimiento para estándares específicos

## Arquitectura de AWS Config

### **Componentes Principales**
```
AWS Config Architecture
├── Data Collection
│   ├── Resource Discovery
│   ├── Configuration Recording
│   ├── Change Tracking
│   ├── Relationship Mapping
│   └── Metadata Collection
├── Evaluation Engine
│   ├── Config Rules (Managed)
│   ├── Config Rules (Custom)
│   ├── Evaluation Logic
│   ├── Compliance Scoring
│   └── Trigger Management
├── Storage & Indexing
│   ├── Configuration History
│   ├── Configuration Snapshots
│   ├── Resource Inventory
│   ├── Change Timeline
│   └── Metadata Store
├── Compliance Management
│   ├── Conformance Packs
│   ├── Aggregators
│   ├── Compliance Reports
│   ├── Remediation Engine
│   └── Notification System
└── Integration Hub
    ├── AWS Security Hub
    ├── AWS CloudTrail
    ├── AWS Lambda
    ├── AWS SSM
    └── Third-party Tools
```

### **Flujo de Evaluación**
```
Resource Change → Configuration Recording → Rule Evaluation → Compliance Check → Notification → Remediation
```

## Configuración de AWS Config

### **Gestión Completa de AWS Config**
```python
import boto3
import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class ConfigManager:
    def __init__(self, region='us-east-1'):
        self.config = boto3.client('config', region_name=region)
        self.organizations = boto3.client('organizations', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.lambda_client = boto3.client('lambda', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.region = region
    
    def create_configuration_recorder(self, recorder_name, resource_types=None,
                                      recording_group=None, role_arn=None):
        """Crear configuration recorder"""
        
        try:
            # Si no se proporcionan tipos de recursos, usar todos
            if not resource_types:
                resource_types = [
                    'AWS::EC2::Instance',
                    'AWS::S3::Bucket',
                    'AWS::IAM::Role',
                    'AWS::IAM::User',
                    'AWS::IAM::Policy',
                    'AWS::SecurityGroup',
                    'AWS::RDS::DBInstance',
                    'AWS::Lambda::Function',
                    'AWS::CloudFormation::Stack',
                    'AWS::ElasticLoadBalancing::LoadBalancer'
                ]
            
            # Configurar grupo de grabación
            if not recording_group:
                recording_group = {
                    'AllSupported': True
                }
            
            # Crear o usar rol existente
            if not role_arn:
                role_arn = self._create_config_service_role()
            
            # Crear configuration recorder
            response = self.config.put_configuration_recorder(
                ConfigurationRecorder={
                    'name': recorder_name,
                    'roleARN': role_arn,
                    'recordingGroup': recording_group
                }
            )
            
            return {
                'success': True,
                'recorder_name': recorder_name,
                'role_arn': role_arn,
                'resource_types': resource_types,
                'recording_group': recording_group
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _create_config_service_role(self):
        """Crear rol de servicio para AWS Config"""
        
        try:
            role_name = 'AWSConfigServiceRole'
            
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
                            "Service": "config.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }
            
            # Crear rol
            response = self.iam.create_role(
                RoleName=role_name,
                AssumeRolePolicyDocument=json.dumps(trust_policy),
                Description='Service role for AWS Config',
                Tags=[
                    {'Key': 'Service', 'Value': 'Config'},
                    {'Key': 'Purpose', 'Value': 'ServiceRole'}
                ]
            )
            
            role_arn = response['Role']['Arn']
            
            # Adjuntar política gestionada
            self.iam.attach_role_policy(
                RoleName=role_name,
                PolicyArn='arn:aws:iam::aws:policy/service-role/AWSConfigServiceRolePolicy'
            )
            
            # Esperar a que el rol esté disponible
            time.sleep(10)
            
            return role_arn
            
        except Exception as e:
            raise Exception(f"Failed to create Config service role: {str(e)}")
    
    def create_delivery_channel(self, channel_name, s3_bucket_name, s3_key_prefix='config',
                              sns_topic_arn=None, delivery_frequency='One_Hour'):
        """Crear delivery channel"""
        
        try:
            # Configurar destino S3
            s3_config = {
                'bucketName': s3_bucket_name,
                'keyPrefix': s3_key_prefix
            }
            
            # Configurar notificaciones SNS si se proporciona
            sns_config = {}
            if sns_topic_arn:
                sns_config = {
                    'snsTopicArn': sns_topic_arn
                }
            
            # Crear delivery channel
            response = self.config.put_delivery_channel(
                DeliveryChannel={
                    'name': channel_name,
                    's3BucketName': s3_bucket_name,
                    's3KeyPrefix': s3_key_prefix,
                    'snsTopicARN': sns_topic_arn,
                    'configSnapshotDeliveryProperties': {
                        'deliveryFrequency': delivery_frequency
                    }
                }
            )
            
            return {
                'success': True,
                'channel_name': channel_name,
                's3_bucket_name': s3_bucket_name,
                's3_key_prefix': s3_key_prefix,
                'sns_topic_arn': sns_topic_arn,
                'delivery_frequency': delivery_frequency
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def start_configuration_recorder(self, recorder_name):
        """Iniciar configuration recorder"""
        
        try:
            response = self.config.start_configuration_recorder(
                ConfigurationRecorderName=recorder_name
            )
            
            return {
                'success': True,
                'recorder_name': recorder_name,
                'status': 'STARTED'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def stop_configuration_recorder(self, recorder_name):
        """Detener configuration recorder"""
        
        try:
            response = self.config.stop_configuration_recorder(
                ConfigurationRecorderName=recorder_name
            )
            
            return {
                'success': True,
                'recorder_name': recorder_name,
                'status': 'STOPPED'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_managed_config_rule(self, rule_name, managed_rule_identifier,
                                  source_identifier=None, input_parameters=None,
                                  maximum_execution_frequency='One_Hour',
                                  config_rule_name=None, description=None,
                                  tags=None):
        """Crear regla de configuración gestionada"""
        
        try:
            # Configurar fuente de la regla
            source = {
                'Owner': 'AWS',
                'SourceIdentifier': managed_rule_identifier
            }
            
            if input_parameters:
                source['SourceDetails'] = [
                    {
                        'EventSource': 'aws.config',
                        'MessageType': 'ConfigurationItemChangeNotification',
                        'MaximumExecutionFrequency': maximum_execution_frequency
                    }
                ]
            
            # Crear regla
            rule_config = {
                'ConfigRuleName': rule_name,
                'Source': source
            }
            
            if description:
                rule_config['Description'] = description
            
            if input_parameters:
                rule_config['InputParameters'] = json.dumps(input_parameters)
            
            if maximum_execution_frequency:
                rule_config['MaximumExecutionFrequency'] = maximum_execution_frequency
            
            response = self.config.put_config_rule(
                ConfigRule=rule_config,
                Tags=tags or []
            )
            
            return {
                'success': True,
                'rule_name': rule_name,
                'managed_rule_identifier': managed_rule_identifier,
                'source': source,
                'input_parameters': input_parameters
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_custom_config_rule(self, rule_name, lambda_function_arn,
                                 input_parameters=None, maximum_execution_frequency='One_Hour',
                                 trigger_types=None, description=None, tags=None):
        """Crear regla de configuración personalizada"""
        
        try:
            # Configurar fuente de la regla personalizada
            source = {
                'Owner': 'CUSTOM_LAMBDA',
                'SourceIdentifier': lambda_function_arn
            }
            
            # Configurar detalles de la fuente
            if trigger_types:
                source['SourceDetails'] = [
                    {
                        'EventSource': 'aws.config',
                        'MessageType': trigger_type,
                        'MaximumExecutionFrequency': maximum_execution_frequency
                    }
                    for trigger_type in trigger_types
                ]
            else:
                source['SourceDetails'] = [
                    {
                        'EventSource': 'aws.config',
                        'MessageType': 'ConfigurationItemChangeNotification',
                        'MaximumExecutionFrequency': maximum_execution_frequency
                    }
                ]
            
            # Crear regla
            rule_config = {
                'ConfigRuleName': rule_name,
                'Source': source
            }
            
            if description:
                rule_config['Description'] = description
            
            if input_parameters:
                rule_config['InputParameters'] = json.dumps(input_parameters)
            
            if maximum_execution_frequency:
                rule_config['MaximumExecutionFrequency'] = maximum_execution_frequency
            
            response = self.config.put_config_rule(
                ConfigRule=rule_config,
                Tags=tags or []
            )
            
            return {
                'success': True,
                'rule_name': rule_name,
                'lambda_function_arn': lambda_function_arn,
                'source': source,
                'input_parameters': input_parameters
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_config_rule_lambda(self, rule_name, rule_code=None):
        """Crear función Lambda para regla personalizada"""
        
        try:
            # Código por defecto para regla personalizada
            if not rule_code:
                rule_code = self._get_default_lambda_code()
            
            # Crear rol de ejecución para Lambda
            lambda_role_arn = self._create_lambda_execution_role()
            
            # Crear función Lambda
            response = self.lambda_client.create_function(
                FunctionName=rule_name,
                Runtime='python3.9',
                Role=lambda_role_arn,
                Handler='lambda_function.lambda_handler',
                Code={
                    'ZipFile': rule_code
                },
                Description=f'Custom Config rule: {rule_name}',
                Timeout=300,
                Environment={
                    'Variables': {
                        'RULE_NAME': rule_name
                    }
                },
                Tags={
                    'Service': 'Config',
                    'Type': 'CustomRule'
                }
            )
            
            function_arn = response['FunctionArn']
            
            return {
                'success': True,
                'function_name': rule_name,
                'function_arn': function_arn,
                'lambda_role_arn': lambda_role_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_default_lambda_code(self):
        """Obtener código por defecto para Lambda"""
        
        return '''
import json
import boto3

def lambda_handler(event, context):
    config = boto3.client('config')
    
    invoking_event = json.loads(event['invokingEvent'])
    rule_parameters = json.loads(event.get('ruleParameters', '{}'))
    
    # Obtener configuration item
    configuration_item = invoking_event.get('configurationItem')
    
    if not configuration_item:
        return {
            'compliance_type': 'NOT_APPLICABLE'
        }
    
    # Evaluar cumplimiento (ejemplo simple)
    compliance_type = 'COMPLIANT'
    annotation = 'Resource is compliant'
    
    # Lógica de evaluación personalizada aquí
    if configuration_item.get('resourceType') == 'AWS::EC2::Instance':
        # Ejemplo: Verificar que las instancias EC2 tengan ciertos tags
        tags = configuration_item.get('tags', [])
        required_tags = ['Environment', 'Owner']
        
        tag_keys = [tag.get('key', '') for tag in tags]
        missing_tags = [tag for tag in required_tags if tag not in tag_keys]
        
        if missing_tags:
            compliance_type = 'NON_COMPLIANT'
            annotation = f'Missing required tags: {", ".join(missing_tags)}'
    
    evaluation = {
        'ComplianceResourceType': configuration_item['resourceType'],
        'ComplianceResourceId': configuration_item['resourceId'],
        'ComplianceType': compliance_type,
        'OrderingTimestamp': configuration_item['configurationItemCaptureTime'],
        'Annotation': annotation
    }
    
    response = config.put_evaluations(
        Evaluations=[evaluation],
        ResultToken=event['resultToken']
    )
    
    return evaluation

def evaluate_compliance(configuration_item, rule_parameters):
    """
    Función principal de evaluación
    """
    # Implementar lógica de evaluación específica aquí
    return 'COMPLIANT', 'Resource is compliant'
'''
    
    def _create_lambda_execution_role(self):
        """Crear rol de ejecución para Lambda"""
        
        try:
            role_name = 'AWSConfigLambdaExecutionRole'
            
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
                Description='Execution role for Config Lambda functions',
                Tags=[
                    {'Key': 'Service', 'Value': 'Lambda'},
                    {'Key': 'Purpose', 'Value': 'ConfigRule'}
                ]
            )
            
            role_arn = response['Role']['Arn']
            
            # Adjuntar políticas necesarias
            policies = [
                'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
                'arn:aws:iam::aws:policy/AWSConfigRulesExecutionRole'
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
    
    def create_conformance_pack(self, pack_name, template_body=None, template_s3_uri=None,
                              template_s3_bucket=None, template_s3_key=None,
                              parameter_values=None, delivery_s3_bucket=None,
                              delivery_s3_key_prefix=None):
        """Crear conformance pack"""
        
        try:
            # Configurar parámetros del conformance pack
            conformance_pack_input = {
                'ConformancePackName': pack_name
            }
            
            if template_body:
                conformance_pack_input['TemplateBody'] = template_body
            elif template_s3_uri:
                conformance_pack_input['TemplateS3Uri'] = template_s3_uri
            elif template_s3_bucket and template_s3_key:
                conformance_pack_input['TemplateS3Uri'] = f's3://{template_s3_bucket}/{template_s3_key}'
            
            if parameter_values:
                conformance_pack_input['ParameterValues'] = parameter_values
            
            if delivery_s3_bucket:
                conformance_pack_input['DeliveryS3Bucket'] = delivery_s3_bucket
                if delivery_s3_key_prefix:
                    conformance_pack_input['DeliveryS3KeyPrefix'] = delivery_s3_key_prefix
            
            response = self.config.put_conformance_pack(**conformance_pack_input)
            
            return {
                'success': True,
                'pack_name': pack_name,
                'conformance_pack_arn': response.get('ConformancePackArn', ''),
                'parameter_values': parameter_values
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_aggregator(self, aggregator_name, account_aggregation_sources=None,
                        organization_aggregation_source=None):
        """Crear agregador"""
        
        try:
            aggregator_config = {
                'AggregatorName': aggregator_name
            }
            
            if account_aggregation_sources:
                aggregator_config['AccountAggregationSources'] = account_aggregation_sources
            elif organization_aggregation_source:
                aggregator_config['OrganizationAggregationSource'] = organization_aggregation_source
            else:
                # Por defecto, usar todas las cuentas de la organización
                aggregator_config['OrganizationAggregationSource'] = {
                    'RoleArn': self._create_aggregator_role(),
                    'AllAwsRegions': True
                }
            
            response = self.config.put_configuration_aggregator(**aggregator_config)
            
            return {
                'success': True,
                'aggregator_name': aggregator_name,
                'aggregator_arn': response.get('ConfigurationAggregatorArn', '')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _create_aggregator_role(self):
        """Crear rol para agregador"""
        
        try:
            role_name = 'AWSConfigAggregatorRole'
            
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
                            "Service": "config.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }
            
            # Crear rol
            response = self.iam.create_role(
                RoleName=role_name,
                AssumeRolePolicyDocument=json.dumps(trust_policy),
                Description='Service role for AWS Config aggregator',
                Tags=[
                    {'Key': 'Service', 'Value': 'Config'},
                    {'Key': 'Purpose', 'Value': 'Aggregator'}
                ]
            )
            
            role_arn = response['Role']['Arn']
            
            # Adjuntar política necesaria
            aggregator_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": [
                            "config:GetAggregateConfigRuleComplianceSummary",
                            "config:GetAggregateDiscoveredResourceCounts",
                            "config:GetAggregateConformancePackComplianceSummary",
                            "config:DescribeConfigurationAggregators",
                            "config:GetAggregateComplianceDetailsByConfigRule"
                        ],
                        "Resource": "*"
                    }
                ]
            }
            
            self.iam.put_role_policy(
                RoleName=role_name,
                PolicyName='ConfigAggregatorPolicy',
                PolicyDocument=json.dumps(aggregator_policy)
            )
            
            # Esperar a que el rol esté disponible
            time.sleep(10)
            
            return role_arn
            
        except Exception as e:
            raise Exception(f"Failed to create aggregator role: {str(e)}")
    
    def get_compliance_summary(self, config_rule_name=None):
        """Obtener resumen de cumplimiento"""
        
        try:
            if config_rule_name:
                response = self.config.get_compliance_summary_by_config_rule(
                    ConfigRuleName=config_rule_name
                )
            else:
                response = self.config.get_compliance_summary()
            
            compliance_summary = {
                'compliance_summary': response.get('ComplianceSummary', {}),
                'timestamp': response.get('ComplianceSummary', {}).get('ComplianceSummaryTimestamp', '')
            }
            
            return {
                'success': True,
                'compliance_summary': compliance_summary
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_resource_config_history(self, resource_type, resource_id, later_time=None,
                                  earlier_time=None, limit=10, next_token=None):
        """Obtener historial de configuración de recurso"""
        
        try:
            params = {
                'resourceType': resource_type,
                'resourceId': resource_id,
                'limit': limit
            }
            
            if later_time:
                params['laterTime'] = later_time
            if earlier_time:
                params['earlierTime'] = earlier_time
            if next_token:
                params['nextToken'] = next_token
            
            response = self.config.get_resource_config_history(**params)
            
            configuration_items = []
            for item in response['configurationItems']:
                config_item = {
                    'version': item.get('configurationItemVersion', ''),
                    'configuration_item_capture_time': item.get('configurationItemCaptureTime', '').isoformat() if item.get('configurationItemCaptureTime') else '',
                    'configuration_item_status': item.get('configurationItemStatus', ''),
                    'resource_type': item.get('resourceType', ''),
                    'resource_id': item.get('resourceId', ''),
                    'configuration': item.get('configuration', {}),
                    'supplementary_configuration': item.get('supplementaryConfiguration', {}),
                    'tags': item.get('tags', [])
                }
                configuration_items.append(config_item)
            
            return {
                'success': True,
                'resource_type': resource_type,
                'resource_id': resource_id,
                'configuration_items': configuration_items,
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_discovered_resources(self, resource_type, resource_name=None, limit=100,
                               next_token=None):
        """Obtener recursos descubiertos"""
        
        try:
            params = {
                'resourceType': resource_type,
                'limit': limit
            }
            
            if resource_name:
                params['resourceName'] = resource_name
            if next_token:
                params['nextToken'] = next_token
            
            response = self.config.list_discovered_resources(**params)
            
            resources = []
            for resource in response['resourceIdentifiers']:
                resource_info = {
                    'resource_type': resource.get('resourceType', ''),
                    'resource_id': resource.get('resourceId', ''),
                    'resource_name': resource.get('resourceName', ''),
                    'resource_deletion_time': resource.get('resourceDeletionTime', '').isoformat() if resource.get('resourceDeletionTime') else ''
                }
                resources.append(resource_info)
            
            return {
                'success': True,
                'resource_type': resource_type,
                'resources': resources,
                'count': len(resources),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_compliance_details_by_config_rule(self, config_rule_name, compliance_types=None,
                                           limit=100, next_token=None):
        """Obtener detalles de cumplimiento por regla"""
        
        try:
            params = {
                'ConfigRuleName': config_rule_name,
                'limit': limit
            }
            
            if compliance_types:
                params['ComplianceTypes'] = compliance_types
            if next_token:
                params['nextToken'] = next_token
            
            response = self.config.get_compliance_details_by_config_rule(**params)
            
            evaluation_results = []
            for result in response['EvaluationResults']:
                evaluation = {
                    'evaluation_result_identifier': result.get('EvaluationResultIdentifier', {}),
                    'compliance_type': result.get('ComplianceType', ''),
                    'ordering_timestamp': result.get('OrderingTimestamp', '').isoformat() if result.get('OrderingTimestamp') else '',
                    'config_rule_invoked_time': result.get('ConfigRuleInvokedTime', '').isoformat() if result.get('ConfigRuleInvokedTime') else '',
                    'annotation': result.get('Annotation', ''),
                    'result_recorded_time': result.get('ResultRecordedTime', '').isoformat() if result.get('ResultRecordedTime') else ''
                }
                evaluation_results.append(evaluation)
            
            return {
                'success': True,
                'config_rule_name': config_rule_name,
                'evaluation_results': evaluation_results,
                'count': len(evaluation_results),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def start_remediation_execution(self, config_rule_name, resource_keys):
        """Iniciar ejecución de remediación"""
        
        try:
            response = self.config.start_remediation_execution(
                ConfigRuleName=config_rule_name,
                ResourceKeys=resource_keys
            )
            
            return {
                'success': True,
                'config_rule_name': config_rule_name,
                'remediation_execution_id': response.get('RemediationExecutionId', ''),
                'resource_keys': resource_keys
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_remediation_configuration(self, config_rule_name, target_type, target_id,
                                       target_version=None, parameters=None,
                                       automatic=True, execution_controls=None):
        """Crear configuración de remediación"""
        
        try:
            remediation_config = {
                'ConfigRuleName': config_rule_name,
                'TargetType': target_type,
                'TargetId': target_id,
                'Automatic': automatic
            }
            
            if target_version:
                remediation_config['TargetVersion'] = target_version
            
            if parameters:
                remediation_config['Parameters'] = parameters
            
            if execution_controls:
                remediation_config['ExecutionControls'] = execution_controls
            
            response = self.config.put_remediation_configuration(
                RemediationConfiguration=remediation_config
            )
            
            return {
                'success': True,
                'config_rule_name': config_rule_name,
                'target_type': target_type,
                'target_id': target_id,
                'automatic': automatic
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_config_report(self, report_type='compliance', time_range_days=30):
        """Generar reporte de configuración"""
        
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
                # Obtener resumen de cumplimiento
                compliance_response = self.get_compliance_summary()
                if compliance_response['success']:
                    report['compliance_summary'] = compliance_response['compliance_summary']
                
                # Obtener recursos descubiertos
                resource_types = [
                    'AWS::EC2::Instance',
                    'AWS::S3::Bucket',
                    'AWS::IAM::Role',
                    'AWS::SecurityGroup'
                ]
                
                report['resource_inventory'] = {}
                for resource_type in resource_types:
                    resources_response = self.get_discovered_resources(resource_type, limit=1000)
                    if resources_response['success']:
                        report['resource_inventory'][resource_type] = {
                            'count': resources_response['count'],
                            'resources': resources_response['resources'][:10]  # Primeros 10
                        }
            
            elif report_type == 'changes':
                # Analizar cambios de configuración
                report['change_analysis'] = self._analyze_configuration_changes(start_time, end_time)
            
            elif report_type == 'resources':
                # Reporte de recursos
                report['resource_analysis'] = self._analyze_resources()
            
            return {
                'success': True,
                'config_report': report
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _analyze_configuration_changes(self, start_time, end_time):
        """Analizar cambios de configuración"""
        
        try:
            change_analysis = {
                'total_changes': 0,
                'changes_by_resource_type': {},
                'changes_by_time': {},
                'most_changed_resources': []
            }
            
            # Obtener recursos y analizar cambios (simplificado)
            resource_types = ['AWS::EC2::Instance', 'AWS::S3::Bucket']
            
            for resource_type in resource_types:
                resources_response = self.get_discovered_resources(resource_type, limit=100)
                if resources_response['success']:
                    for resource in resources_response['resources'][:5]:  # Analizar primeros 5
                        history_response = self.get_resource_config_history(
                            resource_type=resource['resource_id'].split('/')[0],
                            resource_id=resource['resource_id'],
                            limit=10
                        )
                        
                        if history_response['success']:
                            changes = history_response['configuration_items']
                            change_analysis['total_changes'] += len(changes)
                            
                            if resource_type not in change_analysis['changes_by_resource_type']:
                                change_analysis['changes_by_resource_type'][resource_type] = 0
                            change_analysis['changes_by_resource_type'][resource_type] += len(changes)
            
            return change_analysis
            
        except Exception:
            return {'error': 'Failed to analyze changes'}
    
    def _analyze_resources(self):
        """Analizar recursos"""
        
        try:
            resource_analysis = {
                'total_resources': 0,
                'resources_by_type': {},
                'untagged_resources': 0,
                'compliance_status': {}
            }
            
            # Obtener recursos por tipo
            resource_types = [
                'AWS::EC2::Instance',
                'AWS::S3::Bucket',
                'AWS::IAM::Role',
                'AWS::SecurityGroup',
                'AWS::Lambda::Function'
            ]
            
            for resource_type in resource_types:
                resources_response = self.get_discovered_resources(resource_type, limit=1000)
                if resources_response['success']:
                    count = resources_response['count']
                    resource_analysis['total_resources'] += count
                    resource_analysis['resources_by_type'][resource_type] = count
            
            # Obtener estado de cumplimiento
            compliance_response = self.get_compliance_summary()
            if compliance_response['success']:
                summary = compliance_response['compliance_summary']['compliance_summary']
                resource_analysis['compliance_status'] = summary
            
            return resource_analysis
            
        except Exception:
            return {'error': 'Failed to analyze resources'}
```

## Casos de Uso

### **1. Configurar AWS Config Básico**
```python
# Ejemplo: Configurar AWS Config básico
manager = ConfigManager('us-east-1')

# Crear configuration recorder
recorder_result = manager.create_configuration_recorder(
    recorder_name='default-recorder',
    resource_types=[
        'AWS::EC2::Instance',
        'AWS::S3::Bucket',
        'AWS::IAM::Role',
        'AWS::SecurityGroup'
    ]
)

if recorder_result['success']:
    # Crear delivery channel
    delivery_result = manager.create_delivery_channel(
        channel_name='default-channel',
        s3_bucket_name='my-config-bucket',
        s3_key_prefix='config',
        delivery_frequency='One_Hour'
    )
    
    if delivery_result['success']:
        # Iniciar recorder
        start_result = manager.start_configuration_recorder(
            recorder_name=recorder_result['recorder_name']
        )
        
        if start_result['success']:
            print("AWS Config configured and started successfully")
```

### **2. Crear Regla de Cumplimiento**
```python
# Ejemplo: Crear regla para buckets S3 encriptados
rule_result = manager.create_managed_config_rule(
    rule_name='s3-bucket-encryption',
    managed_rule_identifier='S3_BUCKET_ENCRYPTION_ENABLED',
    input_parameters={
        'EncryptionType': 'AES256'
    },
    maximum_execution_frequency='TwentyFour_Hours',
    description='Ensure S3 buckets are encrypted'
)

if rule_result['success']:
    print(f"Config rule created: {rule_result['rule_name']}")
```

### **3. Crear Regla Personalizada**
```python
# Ejemplo: Crear regla personalizada para tags de EC2
# Primero crear función Lambda
lambda_result = manager.create_config_rule_lambda(
    rule_name='ec2-instance-tags-check'
)

if lambda_result['success']:
    # Crear regla personalizada
    custom_rule_result = manager.create_custom_config_rule(
        rule_name='ec2-instance-tags-check',
        lambda_function_arn=lambda_result['function_arn'],
        input_parameters={
            'required_tags': '["Environment", "Owner"]'
        },
        trigger_types=['ConfigurationItemChangeNotification'],
        description='Ensure EC2 instances have required tags'
    )
    
    if custom_rule_result['success']:
        print(f"Custom config rule created: {custom_rule_result['rule_name']}")
```

### **4. Configurar Conformance Pack**
```python
# Ejemplo: Crear conformance pack para seguridad básica
conformance_pack_template = {
    "Resources": {
        "S3BucketEncryptionRule": {
            "Type": "AWS::Config::ConfigRule",
            "Properties": {
                "ConfigRuleName": "s3-bucket-encryption",
                "Source": {
                    "Owner": "AWS",
                    "SourceIdentifier": "S3_BUCKET_ENCRYPTION_ENABLED"
                }
            }
        },
        "EC2InstanceTagsRule": {
            "Type": "AWS::Config::ConfigRule",
            "Properties": {
                "ConfigRuleName": "ec2-instance-tags",
                "Source": {
                    "Owner": "AWS",
                    "SourceIdentifier": "EC2_INSTANCE_MANAGED_BY_SSM"
                }
            }
        }
    }
}

pack_result = manager.create_conformance_pack(
    pack_name='basic-security-pack',
    template_body=json.dumps(conformance_pack_template),
    delivery_s3_bucket='my-config-bucket',
    delivery_s3_key_prefix='conformance-packs'
)

if pack_result['success']:
    print(f"Conformance pack created: {pack_result['pack_name']}")
```

### **5. Generar Reporte de Cumplimiento**
```python
# Ejemplo: Generar reporte mensual de cumplimiento
report_result = manager.generate_config_report(
    report_type='compliance',
    time_range_days=30
)

if report_result['success']:
    report = report_result['config_report']
    summary = report['compliance_summary']['compliance_summary']
    
    print(f"Compliance Report")
    print(f"Compliant: {summary.get('CompliantResourceCount', 0)}")
    print(f"Non-compliant: {summary.get('NonCompliantResourceCount', 0)}")
    print(f"Not applicable: {summary.get('NotApplicableResourceCount', 0)}")
```

## Configuración con AWS CLI

### **Configuración Básica**
```bash
# Crear configuration recorder
aws configservice put-configuration-recorder \
  --configuration-recorder name=default-recorder,roleARN=arn:aws:iam::123456789012:role/AWSConfigServiceRole,recordingGroup={allSupported=true}

# Crear delivery channel
aws configservice put-delivery-channel \
  --delivery-channel name=default-channel,s3BucketName=my-config-bucket,s3KeyPrefix=config,configSnapshotDeliveryProperties={deliveryFrequency=One_Hour}

# Iniciar recorder
aws configservice start-configuration-recorder --configuration-recorder-name default-recorder
```

### **Gestión de Reglas**
```bash
# Crear regla gestionada
aws configservice put-config-rule \
  --config-rule name=s3-bucket-encryption,source={owner=AWS,sourceIdentifier=S3_BUCKET_ENCRYPTION_ENABLED},maximumExecutionFrequency=TwentyFour_Hours

# Obtener reglas
aws configservice describe-config-rules

# Obtener estado de cumplimiento
aws configservice get-compliance-summary-by-config-rule --config-rule-name s3-bucket-encryption
```

### **Conformance Packs**
```bash
# Crear conformance pack
aws configservice put-conformance-pack \
  --conformance-pack-name security-pack \
  --template-s3-uri s3://my-bucket/security-pack.yaml \
  --parameter-s3-uri s3://my-bucket/security-pack-parameters.json

# Listar conformance packs
aws configservice describe-conformance-packs

# Obtener cumplimiento de conformance pack
aws configservice get-conformance-pack-compliance-summary --conformance-pack-name security-pack
```

### **Agregadores**
```bash
# Crear agregador
aws configservice put-configuration-aggregator \
  --configuration-aggregator-name organization-aggregator \
  --organization-aggregation-source roleArn=arn:aws:iam::123456789012:role/AWSConfigAggregatorRole,allAwsRegions=true

# Obtener resumen agregado
aws configservice get-aggregate-compliance-summary-by-config-rule \
  --configuration-aggregator-name organization-aggregator \
  --config-rule-name s3-bucket-encryption
```

## Best Practices

### **1. Configuración Inicial**
- Habilitar grabación para todos los tipos de recursos
- Configurar delivery channel con S3 y SNS
- Establecer frecuencia de snapshots adecuada
- Configurar retención de datos según requerimientos

### **2. Gestión de Reglas**
- Usar reglas gestionadas cuando sea posible
- Crear reglas personalizadas para requisitos específicos
- Configurar frecuencia de evaluación apropiada
- Documentar propósito y parámetros de cada regla

### **3. Monitoreo y Alertas**
- Configurar alertas para no conformidades críticas
- Integrar con Security Hub para vista centralizada
- Usar agregadores para vista multi-cuenta
- Configurar dashboards de cumplimiento

### **4. Optimización**
- Usar conformance packs para despliegue rápido
- Configurar remediación automática cuando sea seguro
- Regularizar revisión y ajuste de reglas
- Optimizar costos de almacenamiento y transferencia

## Costos

### **Precios de AWS Config**
- **Reglas de configuración**: $0.003 por regla activa por mes
- **Grabación de configuración**: $0.003 por recurso grabado por mes
- **Snapshots de configuración**: $0.005 por snapshot
- **Evaluaciones de conformidad**: $0.001 por evaluación
- **Agregadores**: $0.001 por cuenta agregada por mes

### **Ejemplo de Costos Mensuales**
- **500 recursos grabados**: 500 × $0.003 = $1.50
- **50 reglas activas**: 50 × $0.003 = $0.15
- **30 snapshots**: 30 × $0.005 = $0.15
- **1000 evaluaciones**: 1000 × $0.001 = $1.00
- **Total estimado**: ~$2.80 por mes

## Troubleshooting

### **Problemas Comunes**
1. **Recorder no inicia**: Verificar permisos del rol
2. **No hay recursos descubiertos**: Revisar configuración de grabación
3. **Reglas no evalúan**: Verificar configuración de triggers
4. **Delivery channel falla**: Revisar permisos de S3 y SNS

### **Comandos de Diagnóstico**
```bash
# Verificar estado del recorder
aws configservice describe-configuration-recorders

# Verificar estado del delivery channel
aws configservice describe-delivery-channels

# Verificar estado de las reglas
aws configservice describe-config-rules

# Verificar estado de conformidad
aws configservice get-compliance-summary

# Verificar logs de CloudTrail
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceType,Value=AWS::Config::ConfigurationRecorder
```

## Cumplimiento Normativo

### **PCI-DSS**
- **Requerimiento 2**: Aplicación segura y políticas de red
- **Requerimiento 7**: Restricción de acceso a datos
- **Requerimiento 10**: Monitoreo y logging

### **HIPAA**
- **Security Rule**: Controles técnicos y administrativos
- **Access Control**: Controles de acceso
- **Audit Controls**: Controles de auditoría

### **SOC 2**
- **Security**: Controles de seguridad de la información
- **Availability**: Controles de disponibilidad
- **Processing Integrity**: Integridad del procesamiento

### **NIST Cybersecurity Framework**
- **Identify**: Identificación de activos
- **Protect**: Protección de activos
- **Detect**: Detección de actividades anómalas

## Integración con Otros Servicios

### **AWS Security Hub**
- **Centralización**: Vista centralizada de cumplimiento
- **Correlation**: Correlación de hallazgos
- **Automation**: Automatización de respuestas
- **Compliance**: Cumplimiento con estándares

### **AWS CloudTrail**
- **API Logging**: Logs de cambios de configuración
- **Event History**: Historial de eventos
- **Integration**: Integración con reglas de Config
- **Auditing**: Auditoría de cambios

### **AWS Lambda**
- **Custom Rules**: Reglas personalizadas
- **Remediation**: Remediación automatizada
- **Automation**: Automatización de procesos
- **Integration**: Integración con otros servicios

### **AWS Systems Manager**
- **Remediation**: Remediación automatizada
- **Automation**: Automatización de tareas
- **Compliance**: Cumplimiento de configuración
- **Patch Management**: Gestión de parches

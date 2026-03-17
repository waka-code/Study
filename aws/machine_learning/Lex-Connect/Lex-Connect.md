# AWS Lex

## Definición

AWS Lex es un servicio de inteligencia artificial conversacional que permite construir interfaces de conversación mediante voz y texto en cualquier aplicación. Utiliza las mismas tecnologías de aprendizaje profundo que Amazon Alexa para reconocer la intención del usuario, mantener el contexto de la conversación y gestionar el diálogo de manera natural.

## Características Principales

### **Conversación Natural**
- **Reconocimiento de Voz**: Conversación mediante entrada de voz
- **Entrada de Texto**: Soporte para conversación por texto
- **Inteligencia Artificial**: IA conversacional avanzada
- **Contexto de Conversación**: Mantenimiento del contexto del diálogo
- **Multi-turno**: Conversaciones de múltiples turnos

### **Integración con Servicios AWS**
- **AWS Lambda**: Integración con funciones Lambda para lógica de negocio
- **Amazon DynamoDB**: Almacenamiento de datos de conversación
- **Amazon CloudWatch**: Monitoreo y logging
- **Amazon S3**: Almacenamiento de datos y configuraciones
- **AWS CloudFormation**: Infraestructura como código

### **Características Avanzadas**
- **Intención y Entidades**: Reconocimiento de intenciones y extracción de entidades
- **Diálogo Personalizado**: Flujos de diálogo configurables
- **Versionado**: Gestión de versiones de bots
- **Publicación y Despliegue**: Despliegue en múltiples regiones
- **Análisis de Conversación**: Métricas y análisis detallados

### **Soporte Multiplataforma**
- **Web**: Integración con aplicaciones web
- **Móvil**: SDKs para iOS y Android
- **Facebook Messenger**: Integración con Facebook
- **Slack**: Integración con Slack
- **Twilio**: Integración con Twilio SMS

## Tipos de Operaciones

### **1. Operaciones de Bots**
- **CreateBot**: Crear nuevo bot conversacional
- **GetBot**: Obtener detalles del bot
- **ListBots**: Listar bots disponibles
- **UpdateBot**: Actualizar configuración del bot
- **DeleteBot**: Eliminar bot

### **2. Operaciones de Intenciones**
- **CreateIntent**: Crear intención
- **GetIntent**: Obtener detalles de intención
- **ListIntents**: Listar intenciones
- **UpdateIntent**: Actualizar intención
- **DeleteIntent**: Eliminar intención

### **3. Operaciones de Entidades**
- **CreateSlotType**: Crear tipo de entidad
- **GetSlotType**: Obtener detalles de tipo de entidad
- **ListSlotTypes**: Listar tipos de entidades
- **UpdateSlotType**: Actualizar tipo de entidad
- **DeleteSlotType**: Eliminar tipo de entidad

### **4. Operaciones de Publicación**
- **PublishBotVersion**: Publicar versión del bot
- **GetBotVersion**: Obtener versión del bot
- **ListBotVersions**: Listar versiones del bot
- **DeleteBotVersion**: Eliminar versión del bot
- **CreateBotAlias**: Crear alias del bot

## Arquitectura de AWS Lex

### **Componentes Principales**
```
AWS Lex Architecture
├── Input Layer
│   ├── Voice Input
│   ├── Text Input
│   ├── Audio Processing
│   ├── Speech Recognition
│   └── Text Processing
├── NLP Engine
│   ├── Intent Recognition
│   ├── Entity Extraction
│   ├── Context Management
│   ├── Dialog Management
│   └── Natural Language Understanding
├── Dialog Engine
│   ├── Slot Filling
│   ├── Prompt Management
│   ├── Confirmation Handling
│   ├── Error Handling
│   └── Flow Control
├── Integration Layer
│   ├── Lambda Functions
│   ├── Database Integration
│   ├── API Integration
│   ├── Third-party Services
│   └── Cloud Services
└── Output Layer
    ├── Response Generation
    ├── Voice Synthesis
    ├── Text Response
    ├── Action Execution
    └── Logging
```

### **Flujo de Conversación**
```
Input → Speech Recognition → Intent Recognition → Dialog Management → Response Generation → Output
```

## Configuración de AWS Lex

### **Gestión Completa de AWS Lex**
```python
import boto3
import json
import time
import base64
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class LexManager:
    def __init__(self, region='us-east-1'):
        self.lex = boto3.client('lex-models', region_name=region)
        self.lex_runtime = boto3.client('lex-runtime', region_name=region)
        self.lambda_client = boto3.client('lambda', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.region = region
    
    def create_bot(self, name, intent_names=None, clarification_prompt=None,
                  abort_statement=None, idle_session_ttl_in_seconds=300,
                  voice_id=None, child_directed=None, locale='en-US',
                  detect_sentiment=None, create_version=True):
        """Crear un bot conversacional"""
        
        try:
            params = {
                'name': name,
                'locale': locale,
                'idleSessionTTLInSeconds': idle_session_ttl_in_seconds,
                'createVersion': create_version
            }
            
            if intent_names:
                params['intents'] = intent_names
            
            if clarification_prompt:
                params['clarificationPrompt'] = clarification_prompt
            
            if abort_statement:
                params['abortStatement'] = abort_statement
            
            if voice_id:
                params['voiceId'] = voice_id
            
            if child_directed is not None:
                params['childDirected'] = child_directed
            
            if detect_sentiment is not None:
                params['detectSentiment'] = detect_sentiment
            
            response = self.lex.put_bot(**params)
            
            return {
                'success': True,
                'bot_name': name,
                'bot_status': response['status'],
                'version': response.get('version', ''),
                'create_version': create_version
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_bot(self, name, version_or_alias='$LATEST'):
        """Obtener detalles del bot"""
        
        try:
            response = self.lex.get_bot(
                name=name,
                versionOrAlias=version_or_alias
            )
            
            bot_info = {
                'name': response['name'],
                'version': response['version'],
                'status': response['status'],
                'locale': response['locale'],
                'intents': response.get('intents', []),
                'clarification_prompt': response.get('clarificationPrompt', {}),
                'abort_statement': response.get('abortStatement', {}),
                'idle_session_ttl_in_seconds': response.get('idleSessionTTLInSeconds', 0),
                'voice_id': response.get('voiceId', ''),
                'child_directed': response.get('childDirected', False),
                'detect_sentiment': response.get('detectSentiment', False),
                'creation_date_time': response.get('creationDateTime', '').isoformat() if response.get('creationDateTime') else '',
                'last_updated_date_time': response.get('lastUpdatedDateTime', '').isoformat() if response.get('lastUpdatedDateTime') else ''
            }
            
            return {
                'success': True,
                'bot_info': bot_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_bots(self, max_results=100, next_token=None):
        """Listar bots disponibles"""
        
        try:
            params = {'maxResults': max_results}
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.lex.get_bots(**params)
            
            bots = []
            for bot in response['bots']:
                bot_info = {
                    'name': bot['name'],
                    'version': bot['version'],
                    'status': bot['status'],
                    'creation_date_time': bot.get('creationDateTime', '').isoformat() if bot.get('creationDateTime') else '',
                    'last_updated_date_time': bot.get('lastUpdatedDateTime', '').isoformat() if bot.get('lastUpdatedDateTime') else ''
                }
                bots.append(bot_info)
            
            return {
                'success': True,
                'bots': bots,
                'count': len(bots),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_bot(self, name):
        """Eliminar bot"""
        
        try:
            response = self.lex.delete_bot(name=name)
            
            return {
                'success': True,
                'bot_name': name,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_intent(self, name, sample_utterances=None, slots=None,
                     confirmation_prompt=None, rejection_statement=None,
                     follow_up_prompt=None, conclusion_statement=None,
                     dialog_code_hook=None, fulfillment_activity=None,
                     parent_intent_signature=None, kendra_configuration=None):
        """Crear intención"""
        
        try:
            params = {'name': name}
            
            if sample_utterances:
                params['sampleUtterances'] = sample_utterances
            
            if slots:
                params['slots'] = slots
            
            if confirmation_prompt:
                params['confirmationPrompt'] = confirmation_prompt
            
            if rejection_statement:
                params['rejectionStatement'] = rejection_statement
            
            if follow_up_prompt:
                params['followUpPrompt'] = follow_up_prompt
            
            if conclusion_statement:
                params['conclusionStatement'] = conclusion_statement
            
            if dialog_code_hook:
                params['dialogCodeHook'] = dialog_code_hook
            
            if fulfillment_activity:
                params['fulfillmentActivity'] = fulfillment_activity
            
            if parent_intent_signature:
                params['parentIntentSignature'] = parent_intent_signature
            
            if kendra_configuration:
                params['kendraConfiguration'] = kendra_configuration
            
            response = self.lex.put_intent(**params)
            
            return {
                'success': True,
                'intent_name': name,
                'intent_version': response['version'],
                'checksum': response.get('checksum', '')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_intent(self, name, version='$LATEST'):
        """Obtener detalles de intención"""
        
        try:
            response = self.lex.get_intent(
                name=name,
                version=version
            )
            
            intent_info = {
                'name': response['name'],
                'version': response['version'],
                'checksum': response.get('checksum', ''),
                'sample_utterances': response.get('sampleUtterances', []),
                'slots': response.get('slots', []),
                'confirmation_prompt': response.get('confirmationPrompt', {}),
                'rejection_statement': response.get('rejectionStatement', {}),
                'follow_up_prompt': response.get('followUpPrompt', {}),
                'conclusion_statement': response.get('conclusionStatement', {}),
                'dialog_code_hook': response.get('dialogCodeHook', {}),
                'fulfillment_activity': response.get('fulfillmentActivity', {}),
                'parent_intent_signature': response.get('parentIntentSignature', {}),
                'kendra_configuration': response.get('kendraConfiguration', {}),
                'created_date': response.get('createdDate', '').isoformat() if response.get('createdDate') else '',
                'last_updated_date': response.get('lastUpdatedDate', '').isoformat() if response.get('lastUpdatedDate') else ''
            }
            
            return {
                'success': True,
                'intent_info': intent_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_intents(self, max_results=100, next_token=None):
        """Listar intenciones"""
        
        try:
            params = {'maxResults': max_results}
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.lex.get_intents(**params)
            
            intents = []
            for intent in response['intents']:
                intent_info = {
                    'name': intent['name'],
                    'version': intent['version'],
                    'description': intent.get('description', ''),
                    'created_date': intent.get('createdDate', '').isoformat() if intent.get('createdDate') else '',
                    'last_updated_date': intent.get('lastUpdatedDate', '').isoformat() if intent.get('lastUpdatedDate') else ''
                }
                intents.append(intent_info)
            
            return {
                'success': True,
                'intents': intents,
                'count': len(intents),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False',
                'error': str(e)
            }
    
    def delete_intent(self, name):
        """Eliminar intención"""
        
        try:
            response = self.lex.delete_intent(name=name)
            
            return {
                'success': True,
                'intent_name': name,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_slot_type(self, name, description=None, enumeration_values=None,
                        value_selection_strategy='ORIGINAL_VALUE', parent_slot_type_signature=None,
                        slot_type_configurations=None):
        """Crear tipo de entidad"""
        
        try:
            params = {
                'name': name,
                'valueSelectionStrategy': value_selection_strategy
            }
            
            if description:
                params['description'] = description
            
            if enumeration_values:
                params['enumerationValues'] = enumeration_values
            
            if parent_slot_type_signature:
                params['parentSlotTypeSignature'] = parent_slot_type_signature
            
            if slot_type_configurations:
                params['slotTypeConfigurations'] = slot_type_configurations
            
            response = self.lex.put_slot_type(**params)
            
            return {
                'success': True,
                'slot_type_name': name,
                'version': response['version'],
                'checksum': response.get('checksum', '')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_slot_type(self, name, version='$LATEST'):
        """Obtener detalles de tipo de entidad"""
        
        try:
            response = self.lex.get_slot_type(
                name=name,
                version=version
            )
            
            slot_type_info = {
                'name': response['name'],
                'version': response['version'],
                'description': response.get('description', ''),
                'enumeration_values': response.get('enumerationValues', []),
                'value_selection_strategy': response['valueSelectionStrategy'],
                'parent_slot_type_signature': response.get('parentSlotTypeSignature', ''),
                'slot_type_configurations': response.get('slotTypeConfigurations', []),
                'checksum': response.get('checksum', ''),
                'created_date': response.get('createdDate', '').isoformat() if response.get('createdDate') else '',
                'last_updated_date': response.get('lastUpdatedDate', '').isoformat() if response.get('lastUpdatedDate') else ''
            }
            
            return {
                'success': True,
                'slot_type_info': slot_type_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_slot_types(self, max_results=100, next_token=None):
        """Listar tipos de entidades"""
        
        try:
            params = {'maxResults': max_results}
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.lex.get_slot_types(**params)
            
            slot_types = []
            for slot_type in response['slotTypes']:
                slot_type_info = {
                    'name': slot_type['name'],
                    'version': slot_type['version'],
                    'description': slot_type.get('description', ''),
                    'value_selection_strategy': slot_type['valueSelectionStrategy'],
                    'created_date': slot_type.get('createdDate', '').isoformat() if slot_type.get('createdDate') else '',
                    'last_updated_date': slot_type.get('lastUpdatedDate', '').isoformat() if slot_type.get('lastUpdatedDate') else ''
                }
                slot_types.append(slot_type_info)
            
            return {
                'success': True,
                'slot_types': slot_types,
                'count': len(slot_types),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_slot_type(self, name):
        """Eliminar tipo de entidad"""
        
        try:
            response = self.lex.delete_slot_type(name=name)
            
            return {
                'success': True,
                'slot_type_name': name,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def post_text(self, bot_name, bot_alias='$LATEST', user_id=None,
                  session_attributes=None, input_text=None):
        """Enviar texto al bot para procesamiento"""
        
        try:
            params = {
                'botName': bot_name,
                'botAlias': bot_alias
            }
            
            if user_id:
                params['userId'] = user_id
            else:
                params['userId'] = f'user-{int(time.time())}'
            
            if session_attributes:
                params['sessionAttributes'] = session_attributes
            
            if input_text:
                params['inputText'] = input_text
            
            response = self.lex_runtime.post_text(**params)
            
            return {
                'success': True,
                'response': response
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def post_content(self, bot_name, bot_alias='$LATEST', user_id=None,
                     session_attributes=None, content_type='text/plain; charset=utf-8',
                     accept='text/plain; charset=utf-8', input_stream=None):
        """Enviar contenido al bot para procesamiento"""
        
        try:
            params = {
                'botName': bot_name,
                'botAlias': bot_alias,
                'contentType': content_type,
                'accept': accept
            }
            
            if user_id:
                params['userId'] = user_id
            else:
                params['userId'] f'user-{int(time.time())}'
            
            if session_attributes:
                params['sessionAttributes'] = session_attributes
            
            if input_stream:
                params['inputStream'] = input_stream
            
            response = self.lex_runtime.post_content(**params)
            
            return {
                'success': True,
                'response': response
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_lex_monitoring(self, sns_topic_arn=None):
        """Configurar monitoreo de Lex"""
        
        try:
            monitoring_setup = {
                'sns_topic_arn': None,
                'lambda_functions': [],
                'cloudwatch_alarms': [],
                'dashboards': []
            }
            
            # Crear o usar SNS topic
            if sns_topic_arn:
                monitoring_setup['sns_topic_arn'] = sns_topic_arn
            else:
                topic_response = self.sns.create_topic(
                    Name='lex-alerts',
                    Tags=[
                        {'Key': 'Service', 'Value': 'Lex'},
                        {'Key': 'Purpose', 'Value': 'Monitoring'}
                    ]
                )
                monitoring_setup['sns_topic_arn'] = topic_response['TopicArn']
            
            # Crear función Lambda para monitoreo
            lambda_result = self.create_lex_monitoring_lambda()
            if lambda_result['success']:
                monitoring_setup['lambda_functions'].append(lambda_result['function_arn'])
            
            # Configurar alarmas de CloudWatch
            alarm_result = self.setup_lex_alarms(monitoring_setup['sns_topic_arn'])
            if alarm_result['success']:
                monitoring_setup['cloudwatch_alarms'] = alarm_result['alarms']
            
            return {
                'success': True,
                'monitoring_setup': monitoring_setup
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_lex_monitoring_lambda(self):
        """Crear función Lambda para monitoreo de Lex"""
        
        try:
            lambda_code = self._get_lex_lambda_code()
            
            # Crear rol de ejecución
            role_arn = self._create_lambda_execution_role('lex-monitoring-role')
            
            # Crear función Lambda
            response = self.lambda_client.create_function(
                FunctionName='lex-monitor',
                Runtime='python3.9',
                Role=role_arn,
                Handler='lambda_function.lambda_handler',
                Code={
                    'ZipFile': lambda_code
                },
                Description='Lambda function for Lex monitoring',
                Timeout=300,
                Environment={
                    'Variables': {
                        'SNS_TOPIC_ARN': f'arn:aws:sns:{self.region}:123456789012:lex-alerts'
                    }
                },
                Tags={
                    'Service': 'Lex',
                    'Purpose': 'Monitoring'
                }
            )
            
            return {
                'success': True,
                'function_name': 'lex-monitor',
                'function_arn': response['FunctionArn'],
                'role_arn': role_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_lex_lambda_code(self):
        """Obtener código de Lambda para monitoreo de Lex"""
        
        return '''
import json
import boto3
import os
from datetime import datetime

def lambda_handler(event, context):
    sns = boto3.client('sns')
    lex = boto3.client('lex-runtime')
    
    sns_topic_arn = os.environ['SNS_TOPIC_ARN']
    
    # Analizar evento de Lex
    event_analysis = analyze_lex_event(event)
    
    if event_analysis['requires_attention']:
        # Enviar alerta
        alert = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': 'LEX_ALERT',
            'bot_name': event_analysis['bot_name'],
            'intent': event_analysis['intent'],
            'sentiment': event_analysis['sentiment'],
            'risk_level': event_analysis['risk_level'],
            'recommendations': event_analysis['recommendations']
        }
        
        sns.publish(
            TopicArn=sns_topic_arn,
            Subject=f'Lex Alert: {event_analysis["bot_name"]}',
            Message=json.dumps(alert),
            MessageStructure='string'
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Lex alert sent',
                'bot_name': event_analysis['bot_name'],
                'risk_level': event_analysis['risk_level']
            })
        }
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'No action required'})
    }

def analyze_lex_event(event):
    """Analizar evento de Lex"""
    
    analysis = {
        'requires_attention': False,
        'bot_name': '',
        'intent': '',
        'sentiment': '',
        'risk_level': 'LOW',
        'recommendations': []
    }
    
    # Simular análisis de evento
    if 'detail-type' in event:
        detail_type = event['detail-type']
        
        if detail_type == 'Lex Conversation':
            detail = event.get('detail', {})
            analysis['bot_name'] = detail.get('botName', '')
            analysis['intent'] = detail.get('intentName', '')
            analysis['sentiment'] = detail.get('sentiment', '')
            
            # Determinar si requiere atención
            sentiment = analysis['sentiment']
            if sentiment == 'NEGATIVE':
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'MEDIUM'
                analysis['recommendations'].append('Review negative sentiment conversation')
            
            intent = analysis['intent']
            if intent in ['Help', 'Complaint', 'Cancel']:
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'HIGH'
                analysis['recommendations'].append(f'Handle {intent} intent immediately')
    
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
                Description='Execution role for Lex monitoring Lambda',
                Tags=[
                    {'Key': 'Service', 'Value': 'Lambda'},
                    {'Key': 'Purpose', 'Value': 'LexMonitoring'}
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
    
    def setup_lex_alarms(self, sns_topic_arn):
        """Configurar alarmas de CloudWatch para Lex"""
        
        try:
            alarms_created = []
            
            # Alarma para errores de conversación
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='Lex-ConversationErrors',
                    AlarmDescription='Lex conversation errors detected',
                    Namespace='AWS/Lex',
                    MetricName='ConversationErrors',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('Lex-ConversationErrors')
            except Exception:
                pass
            
            # Alarma para sentimiento negativo
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='Lex-NegativeSentiment',
                    AlarmDescription='Negative sentiment detected in Lex conversations',
                    Namespace='AWS/Lex',
                    MetricName='NegativeSentiment',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=5,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('Lex-NegativeSentiment')
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
    
    def generate_lex_report(self, report_type='comprehensive', time_range_days=30):
        """Generar reporte de Lex"""
        
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
            
            if report_type == 'comprehensive':
                # Análisis completo
                report['usage_statistics'] = self._get_usage_statistics()
                report['performance_metrics'] = self._get_performance_metrics()
                report['cost_analysis'] = self._get_cost_analysis()
                report['conversation_analysis'] = self._get_conversation_analysis()
                report['recommendations'] = self._generate_comprehensive_recommendations()
            
            elif report_type == 'usage':
                # Reporte de uso
                report['usage_analysis'] = {
                    'bot_usage': self._get_bot_usage_stats(),
                    'intent_distribution': self._get_intent_distribution_stats(),
                    'user_engagement': self._get_user_engagement_stats(),
                    'session_analysis': self._get_session_analysis_stats()
                }
            
            elif report_type == 'quality':
                # Reporte de calidad
                report['quality_assessment'] = {
                    'intent_recognition': self._get_intent_recognition_stats(),
                    'sentiment_analysis': self._get_sentiment_analysis_stats(),
                    'dialogue_completion': self._get_dialogue_completion_stats(),
                    'error_rates': self._get_error_rate_stats()
                }
            
            elif report_type == 'cost':
                # Reporte de costos
                report['cost_breakdown'] = {
                    'speech_requests': self._get_speech_costs(),
                    'text_requests': self._get_text_costs(),
                    'lambda_costs': self._get_lambda_costs(),
                    'total_cost': self._calculate_total_cost()
                }
            
            return {
                'success': True,
                'lex_report': report
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_usage_statistics(self):
        """Obtener estadísticas de uso"""
        
        # Simulación de estadísticas de uso
        return {
            'total_conversations': 150000,
            'successful_conversations': 142500,
            'failed_conversations': 1500,
            'unique_users': 25000,
            'average_session_duration': 180,  # segundos
            'total_intents_recognized': 750000,
            'sentiment_analyzed': 120000,
            'bots_deployed': 8
        }
    
    def _get_performance_metrics(self):
        """Obtener métricas de rendimiento"""
        
        return {
            'intent_recognition_accuracy': 94.2,  # porcentaje
            'dialogue_completion_rate': 89.5,  # porcentaje
            'average_response_time': 0.8,  # segundos
            'success_rate': 95.0,  # porcentaje
            'sentiment_accuracy': 87.3,  # porcentaje
            'uptime': 99.9  # porcentaje
        }
    
    def _get_cost_analysis(self):
        """Obtener análisis de costos"""
        
        return {
            'monthly_cost': 1250.00,
            'cost_breakdown': {
                'speech_requests': 750.00,
                'text_requests': 350.00,
                'lambda_functions': 100.00,
                'monitoring': 50.00
            },
            'cost_trend': 'STABLE',
            'cost_optimization_potential': 15.0  # porcentaje
        }
    
    def _get_conversation_analysis(self):
        """Obtener análisis de conversaciones"""
        
        return {
            'top_intents': [
                {'intent': 'OrderFood', 'usage_percentage': 35.2},
                {'intent': 'CheckStatus', 'usage_percentage': 28.5},
                {'intent': 'Help', 'usage_percentage': 15.8},
                {'intent': 'Cancel', 'usage_percentage': 12.3},
                {'intent': 'Complaint', 'usage_percentage': 8.2}
            ],
            'sentiment_distribution': {
                'positive': 65.3,
                'neutral': 25.2,
                'negative': 9.5
            },
            'conversation_patterns': {
                'average_turns': 4.2,
                'completion_rate': 89.5,
                'escalation_rate': 5.2
            }
        }
    
    def _generate_comprehensive_recommendations(self):
        """Generar recomendaciones comprehensivas"""
        
        recommendations = [
            {
                'priority': 'HIGH',
                'category': 'QUALITY',
                'title': 'Improve intent recognition',
                'description': 'Enhance intent recognition accuracy with better training data',
                'action': 'Review and expand sample utterances for all intents'
            },
            {
                'priority': 'MEDIUM',
                'category': 'PERFORMANCE',
                'title': 'Optimize Lambda functions',
                'description': 'Optimize Lambda functions for better performance',
                'action': 'Review and optimize Lambda code for faster response times'
            },
            {
                'priority': 'LOW',
                'category': 'MONITORING',
                'title': 'Enhance monitoring',
                'description': 'Implement comprehensive monitoring and alerting',
                'action': 'Set up detailed monitoring for conversation quality'
            }
        ]
        
        return recommendations


# AWS Connect

class ConnectManager:
    def __init__(self, region='us-east-1'):
        self.connect = boto3.client('connect', region_name=region)
        self.lambda_client = boto3.client('lambda', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.region = region
    
    def create_instance(self, instance_alias, directory_id=None,
                       identity_management_type='CONNECT_MANAGED',
                        client_enablement_type='CONNECT',
                        inbound_calls_enabled=True,
                        outbound_calls_enabled=False,
                        contact_flow_logs_enabled=True,
                        contact_lens_enabled=True,
                        auto_create_voice_connector=False,
                        multi_language_contact_center=False):
        """Crear instancia de Connect"""
        
        try:
            params = {
                'InstanceAlias': instance_alias,
                'IdentityManagementType': identity_management_type,
                'ClientEnablementType': client_enablement_type,
                'InboundCallsEnabled': inbound_calls_enabled,
                'OutboundCallsEnabled': outbound_calls_enabled,
                'ContactFlowLogsEnabled': contact_flow_logs_enabled,
                'ContactLensEnabled': contact_lens_enabled,
                'AutoCreateVoiceConnector': auto_create_voice_connector
            }
            
            if directory_id:
                params['DirectoryId'] = directory_id
            
            if multi_language_contact_center:
                params['MultiLanguageContactCenter'] = multi_language_contact_center
            
            response = self.connect.create_instance(**params)
            
            return {
                'success': True,
                'instance_id': response['Id'],
                'instance_arn': response['Arn'],
                'instance_alias': instance_alias,
                'status': 'CREATING'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_instance(self, instance_id):
        """Obtener detalles de la instancia"""
        
        try:
            response = self.connect.describe_instance(InstanceId=instance_id)
            
            instance_info = {
                'id': response['Instance']['Id'],
                'arn': response['Instance']['Arn'],
                'alias': response['Instance']['InstanceAlias'],
                'identity_management_type': response['Instance']['IdentityManagementType'],
                'client_enablement_type': response['Instance']['ClientEnablementType'],
                'service_role': response['Instance']['ServiceRole'],
                'status': response['Instance']['Status'],
                'created_time': response['Instance']['CreatedTime'].isoformat() if response['Instance'].get('CreatedTime') else '',
                'inbound_calls_enabled': response['Instance']['InboundCallsEnabled'],
                'outbound_calls_enabled': response['Instance']['OutboundCallsEnabled'],
                'contact_flow_logs_enabled': response['Instance']['ContactFlowLogsEnabled'],
                'contact_lens_enabled': response['Instance']['ContactLensEnabled']
            }
            
            return {
                'success': True,
                'instance_info': instance_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_instances(self, max_results=100, next_token=None):
        """Listar instancias"""
        
        try:
            params = {'MaxResults': max_results}
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.connect.list_instances(**params)
            
            instances = []
            for instance in response['InstanceSummaryList']:
                instance_info = {
                    'id': instance['Id'],
                    'arn': instance['Arn'],
                    'alias': instance['InstanceAlias'],
                    'identity_management_type': instance['IdentityManagementType'],
                    'service_role': instance['ServiceRole'],
                    'status': instance['Status'],
                    'created_time': instance['CreatedTime'].isoformat() if instance.get('CreatedTime') else ''
                }
                instances.append(instance_info)
            
            return {
                'success': True,
                'instances': instances,
                'count': len(instances),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_instance(self, instance_id):
        """Eliminar instancia"""
        
        try:
            response = self.connect.delete_instance(InstanceId=instance_id)
            
            return {
                'success': True,
                'instance_id': instance_id,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_contact_flow(self, instance_id, name, description=None,
                           type='CONTACT_FLOW', content=None, tags=None):
        """Crear flujo de contacto"""
        
        try:
            params = {
                'InstanceId': instance_id,
                'Name': name,
                'Type': type
            }
            
            if description:
                params['Description'] = description
            
            if content:
                params['Content'] = content
            
            if tags:
                params['Tags'] = tags
            
            response = self.connect.create_contact_flow(**params)
            
            return {
                'success': True,
                'contact_flow_id': response['ContactFlowId'],
                'contact_flow_arn': response['ContactFlowArn'],
                'name': name,
                'type': type
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_contact_flow(self, instance_id, contact_flow_id):
        """Obtener detalles del flujo de contacto"""
        
        try:
            response = self.connect.describe_contact_flow(
                InstanceId=instance_id,
                ContactFlowId=contact_flow_id
            )
            
            flow_info = {
                'id': response['ContactFlow']['Id'],
                'arn': response['ContactFlow']['Arn'],
                'name': response['ContactFlow']['Name'],
                'description': response['ContactFlow'].get('Description', ''),
                'type': response['ContactFlow']['Type'],
                'content': response['ContactFlow']['Content'],
                'tags': response['ContactFlow'].get('Tags', []),
                'state': response['ContactFlow'].get('State', ''),
                'status': response['ContactFlow'].get('Status', '')
            }
            
            return {
                'success': True,
                'contact_flow_info': flow_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_contact_flows(self, instance_id, flow_types=None, max_results=100, next_token=None):
        """Listar flujos de contacto"""
        
        try:
            params = {
                'InstanceId': instance_id,
                'MaxResults': max_results
            }
            
            if flow_types:
                params['ContactFlowTypes'] = flow_types
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.connect.list_contact_flows(**params)
            
            contact_flows = []
            for flow in response['ContactFlowSummaryList']:
                flow_info = {
                    'id': flow['Id'],
                    'arn': flow['Arn'],
                    'name': flow['Name'],
                    'type': flow['Type'],
                    'state': flow.get('State', ''),
                    'status': flow.get('Status', '')
                }
                contact_flows.append(flow_info)
            
            return {
                'success': True,
                'contact_flows': contact_flows,
                'count': len(contact_flows),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_contact_flow(self, instance_id, contact_flow_id):
        """Eliminar flujo de contacto"""
        
        try:
            response = self.connect.delete_contact_flow(
                InstanceId=instance_id,
                ContactFlowId=contact_flow_id
            )
            
            return {
                'success': True,
                'contact_flow_id': contact_flow_id,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_queue(self, instance_id, name, description=None,
                    hours_of_operation_ids=None, max_contacts=0,
                    quick_connect_ids=None, tags=None):
        """Crear cola"""
        
        try:
            params = {
                'InstanceId': instance_id,
                'Name': name,
                'MaxContacts': max_contacts
            }
            
            if description:
                params['Description'] = description
            
            if hours_of_operation_ids:
                params['HoursOfOperationId'] = hours_of_operation_ids
            
            if quick_connect_ids:
                params['QuickConnectIds'] = quick_connect_ids
            
            if tags:
                params['Tags'] = tags
            
            response = self.connect.create_queue(**params)
            
            return {
                'success': True,
                'queue_id': response['QueueId'],
                'queue_arn': response['QueueArn'],
                'name': name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_queue(self, instance_id, queue_id):
        """Obtener detalles de la cola"""
        
        try:
            response = self.connect.describe_queue(
                InstanceId=instance_id,
                QueueId=queue_id
            )
            
            queue_info = {
                'id': response['Queue']['Id'],
                'arn': response['Queue']['Arn'],
                'name': response['Queue']['Name'],
                'description': response['Queue'].get('Description', ''),
                'hours_of_operation_id': response['Queue'].get('HoursOfOperationId', ''),
                'max_contacts': response['Queue']['MaxContacts'],
                'status': response['Queue'].get('Status', ''),
                'tags': response['Queue'].get('Tags', [])
            }
            
            return {
                'success': True,
                'queue_info': queue_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_queues(self, instance_id, queue_types=None, max_results=100, next_token=None):
        """Listar colas"""
        
        try:
            params = {
                'InstanceId': instance_id,
                'MaxResults': max_results
            }
            
            if queue_types:
                params['QueueTypes'] = queue_types
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.connect.list_queues(**params)
            
            queues = []
            for queue in response['QueueSummaryList']:
                queue_info = {
                    'id': queue['Id'],
                    'arn': queue['Arn'],
                    'name': queue['Name'],
                    'queue_type': queue['QueueType'],
                    'status': queue.get('Status', '')
                }
                queues.append(queue_info)
            
            return {
                'success': True,
                'queues': queues,
                'count': len(queues),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_queue(self, instance_id, queue_id):
        """Eliminar cola"""
        
        try:
            response = self.connect.delete_queue(
                InstanceId=instance_id,
                QueueId=queue_id
            )
            
            return {
                'success': True,
                'queue_id': queue_id,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_connect_monitoring(self, sns_topic_arn=None):
        """Configurar monitoreo de Connect"""
        
        try:
            monitoring_setup = {
                'sns_topic_arn': None,
                'lambda_functions': [],
                'cloudwatch_alarms': [],
                'dashboards': []
            }
            
            # Crear o usar SNS topic
            if sns_topic_arn:
                monitoring_setup['sns_topic_arn'] = sns_topic_arn
            else:
                topic_response = self.sns.create_topic(
                    Name='connect-alerts',
                    Tags=[
                        {'Key': 'Service', 'Value': 'Connect'},
                        {'Key': 'Purpose', 'Value': 'Monitoring'}
                    ]
                )
                monitoring_setup['sns_topic_arn'] = topic_response['TopicArn']
            
            # Crear función Lambda para monitoreo
            lambda_result = self.create_connect_monitoring_lambda()
            if lambda_result['success']:
                monitoring_setup['lambda_functions'].append(lambda_result['function_arn'])
            
            # Configurar alarmas de CloudWatch
            alarm_result = self.setup_connect_alarms(monitoring_setup['sns_topic_arn'])
            if alarm_result['success']:
                monitoring_setup['cloudwatch_alarms'] = alarm_result['alarms']
            
            return {
                'success': True,
                'monitoring_setup': monitoring_setup
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_connect_monitoring_lambda(self):
        """Crear función Lambda para monitoreo de Connect"""
        
        try:
            lambda_code = self._get_connect_lambda_code()
            
            # Crear rol de ejecución
            role_arn = self._create_lambda_execution_role('connect-monitoring-role')
            
            # Crear función Lambda
            response = self.lambda_client.create_function(
                FunctionName='connect-monitor',
                Runtime='python3.9',
                Role=role_arn,
                Handler='lambda_function.lambda_handler',
                Code={
                    'ZipFile': lambda_code
                },
                Description='Lambda function for Connect monitoring',
                Timeout=300,
                Environment={
                    'Variables': {
                        'SNS_TOPIC_ARN': f'arn:aws:sns:{self.region}:123456789012:connect-alerts'
                    }
                },
                Tags={
                    'Service': 'Connect',
                    'Purpose': 'Monitoring'
                }
            )
            
            return {
                'success': True,
                'function_name': 'connect-monitor',
                'function_arn': response['FunctionArn'],
                'role_arn': role_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_connect_lambda_code(self):
        """Obtener código de Lambda para monitoreo de Connect"""
        
        return '''
import json
import boto3
import os
from datetime import datetime

def lambda_handler(event, context):
    sns = boto3.client('sns')
    connect = boto3.client('connect')
    
    sns_topic_arn = os.environ['SNS_TOPIC_ARN']
    
    # Analizar evento de Connect
    event_analysis = analyze_connect_event(event)
    
    if event_analysis['requires_attention']:
        # Enviar alerta
        alert = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': 'CONNECT_ALERT',
            'instance_id': event_analysis['instance_id'],
            'contact_type': event_analysis['contact_type'],
            'queue': event_analysis['queue'],
            'risk_level': event_analysis['risk_level'],
            'recommendations': event_analysis['recommendations']
        }
        
        sns.publish(
            TopicArn=sns_topic_arn,
            Subject=f'Connect Alert: {event_analysis["instance_id"]}',
            Message=json.dumps(alert),
            MessageStructure='string'
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Connect alert sent',
                'instance_id': event_analysis['instance_id'],
                'risk_level': event_analysis['risk_level']
            })
        }
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'No action required'})
    }

def analyze_connect_event(event):
    """Analizar evento de Connect"""
    
    analysis = {
        'requires_attention': False,
        'instance_id': '',
        'contact_type': '',
        'queue': '',
        'risk_level': 'LOW',
        'recommendations': []
    }
    
    # Simular análisis de evento
    if 'detail-type' in event:
        detail_type = event['detail-type']
        
        if detail_type == 'Connect Contact Event':
            detail = event.get('detail', {})
            analysis['instance_id'] = detail.get('InstanceId', '')
            analysis['contact_type'] = detail.get('ContactType', '')
            analysis['queue'] = detail.get('Queue', '')
            
            # Determinar si requiere atención
            queue = analysis['queue']
            if queue in ['Complaint', 'Escalation', 'VIP']:
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'HIGH'
                analysis['recommendations'].append(f'Handle {queue} queue contact immediately')
            
            contact_type = analysis['contact_type']
            if contact_type == 'OUTBOUND':
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'MEDIUM'
                analysis['recommendations'].append('Monitor outbound contact quality')
    
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
                Description='Execution role for Connect monitoring Lambda',
                Tags=[
                    {'Key': 'Service', 'Value': 'Lambda'},
                    {'Key': 'Purpose', 'Value': 'ConnectMonitoring'}
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
    
    def setup_connect_alarms(self, sns_topic_arn):
        """Configurar alarmas de CloudWatch para Connect"""
        
        try:
            alarms_created = []
            
            # Alarma para contactos en cola de quejas
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='Connect-ComplaintQueue',
                    AlarmDescription='Contacts in complaint queue detected',
                    Namespace='AWS/Connect',
                    MetricName='ContactsInQueue',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('Connect-ComplaintQueue')
            except Exception:
                pass
            
            # Alarma para tiempo de espera largo
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='Connect-LongWaitTime',
                    AlarmDescription='Long wait time detected',
                    Namespace='AWS/Connect',
                    MetricName='LongestWaitTime',
                    Statistic='Average',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=300,  # 5 minutos
                    ComparisonOperator='GreaterThanThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('Connect-LongWaitTime')
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
    
    def generate_connect_report(self, report_type='comprehensive', time_range_days=30):
        """Generar reporte de Connect"""
        
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
            
            if report_type == 'comprehensive':
                # Análisis completo
                report['usage_statistics'] = self._get_connect_usage_statistics()
                report['performance_metrics'] = self._get_connect_performance_metrics()
                report['cost_analysis'] = self._get_connect_cost_analysis()
                report['contact_analysis'] = self._get_connect_contact_analysis()
                report['recommendations'] = self._generate_connect_recommendations()
            
            elif report_type == 'usage':
                # Reporte de uso
                report['usage_analysis'] = {
                    'contact_volume': self._get_contact_volume_stats(),
                    'queue_performance': self._get_queue_performance_stats(),
                    'agent_utilization': self._get_agent_utilization_stats(),
                    'channel_distribution': self._get_channel_distribution_stats()
                }
            
            elif report_type == 'quality':
                # Reporte de calidad
                report['quality_assessment'] = {
                    'customer_satisfaction': self._get_customer_satisfaction_stats(),
                    'first_call_resolution': self._get_first_call_resolution_stats(),
                    'average_handling_time': self._get_average_handling_time_stats(),
                    'service_level_agreement': self._get_sla_stats()
                }
            
            elif report_type == 'cost':
                # Reporte de costos
                report['cost_breakdown'] = {
                    'per_minute_charges': self._get_per_minute_costs(),
                    'telephony_costs': self._get_telephony_costs(),
                    'lambda_costs': self._get_lambda_costs(),
                    'total_cost': self._calculate_connect_total_cost()
                }
            
            return {
                'success': True,
                'connect_report': report
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_connect_usage_statistics(self):
        """Obtener estadísticas de uso de Connect"""
        
        # Simulación de estadísticas de uso
        return {
            'total_contacts': 250000,
            'inbound_contacts': 180000,
            'outbound_contacts': 70000,
            'total_agents': 150,
            'active_agents': 120,
            'total_queues': 25,
            'contact_flows': 45,
            'average_contact_duration': 240,  # segundos
            'total_talk_time': 60000000  # segundos
        }
    
    def _get_connect_performance_metrics(self):
        """Obtener métricas de rendimiento de Connect"""
        
        return {
            'service_level': 92.5,  # porcentaje
            'abandonment_rate': 5.2,  # porcentaje
            'average_wait_time': 45,  # segundos
            'average_handling_time': 240,  # segundos
            'first_call_resolution': 78.3,  # porcentaje
            'customer_satisfaction': 4.2,  # escala 1-5
            'agent_utilization': 85.7  # porcentaje
        }
    
    def _get_connect_cost_analysis(self):
        """Obtener análisis de costos de Connect"""
        
        return {
            'monthly_cost': 15000.00,
            'cost_breakdown': {
                'per_minute_charges': 9000.00,
                'telephony': 3000.00,
                'lambda_functions': 1500.00,
                'storage': 500.00,
                'monitoring': 1000.00
            },
            'cost_trend': 'INCREASING',
            'cost_optimization_potential': 12.0  # porcentaje
        }
    
    def _get_connect_contact_analysis(self):
        """Obtener análisis de contactos"""
        
        return {
            'channel_distribution': {
                'voice': 75.3,
                'chat': 15.2,
                'task': 6.8,
                'email': 2.7
            },
            'queue_performance': [
                {'queue': 'Sales', 'avg_wait_time': 30, 'abandonment_rate': 3.2},
                {'queue': 'Support', 'avg_wait_time': 60, 'abandonment_rate': 8.5},
                {'queue': 'Complaint', 'avg_wait_time': 120, 'abandonment_rate': 15.3}
            ],
            'agent_performance': {
                'top_performers': 25,
                'needs_training': 15,
                'average_satisfaction': 4.2
            }
        }
    
    def _generate_connect_recommendations(self):
        """Generar recomendaciones para Connect"""
        
        recommendations = [
            {
                'priority': 'HIGH',
                'category': 'PERFORMANCE',
                'title': 'Reduce wait times',
                'description': 'Optimize queue management to reduce customer wait times',
                'action': 'Implement better queue strategies and agent scheduling'
            },
            {
                'priority': 'MEDIUM',
                'category': 'QUALITY',
                'title': 'Improve first call resolution',
                'description': 'Enhance agent training and knowledge base',
                'action': 'Implement comprehensive training programs and knowledge management'
            },
            {
                'priority': 'LOW',
                'category': 'COST',
                'title': 'Optimize telephony costs',
                'description': 'Review and optimize telephony usage patterns',
                'action': 'Implement cost-effective telephony solutions'
            }
        ]
        
        return recommendations
```

## Casos de Uso

### **AWS Lex - Bot de Soporte al Cliente**
```python
# Ejemplo: Crear bot de soporte al cliente
lex_manager = LexManager('us-east-1')

# Crear tipo de entidad para productos
slot_type_result = lex_manager.create_slot_type(
    name='ProductType',
    description='Types of products',
    enumeration_values=[
        {'value': 'laptop', 'synonyms': ['notebook']},
        {'value': 'smartphone', 'synonyms': ['phone', 'mobile']},
        {'value': 'tablet', 'synonyms': ['ipad']}
    ]
)

if slot_type_result['success']:
    print(f"Slot type created: {slot_type_result['slot_type_name']}")
    
    # Crear intención de soporte
    intent_result = lex_manager.create_intent(
        name='ProductSupport',
        sample_utterances=[
            {'utterance': 'I need help with my laptop'},
            {'utterance': 'My smartphone is not working'},
            {'utterance': 'How do I use my tablet'}
        ],
        slots=[
            {
                'slotType': 'ProductType',
                'slotTypeVersion': slot_type_result['version'],
                'slotConstraint': 'Required',
                'name': 'ProductType',
                'prompt': {
                    'messages': [
                        {'content': 'What type of product do you need help with?', 'contentType': 'PlainText'}
                    ]
                }
            }
        ],
        fulfillment_activity={
            'type': 'ReturnIntent'
        }
    )
    
    if intent_result['success']:
        print(f"Intent created: {intent_result['intent_name']}")
        
        # Crear bot
        bot_result = lex_manager.create_bot(
            name='CustomerSupportBot',
            intent_names=[intent_result['intent_name']],
            clarification_prompt={
                'messages': [
                    {'content': 'I can help you with product support. What do you need?', 'contentType': 'PlainText'}
                ]
            },
            abort_statement={
                'messages': [
                    {'content': 'I\'m sorry, I\'m having trouble helping you. Please try again later.', 'contentType': 'PlainText'}
                ]
            }
        )
        
        if bot_result['success']:
            print(f"Bot created: {bot_result['bot_name']}")
            
            # Probar el bot
            chat_result = lex_manager.post_text(
                bot_name=bot_result['bot_name'],
                input_text='I need help with my laptop'
            )
            
            if chat_result['success']:
                response = chat_result['response']
                print(f"Bot response: {response.get('message', '')}")
                print(f"Intent: {response.get('intentName', '')}")
                print(f"Slots: {response.get('slots', {})}")
```

### **AWS Connect - Centro de Contacto**
```python
# Ejemplo: Configurar centro de contacto
connect_manager = ConnectManager('us-east-1')

# Crear instancia
instance_result = connect_manager.create_instance(
    instance_alias='customer-service',
    identity_management_type='CONNECT_MANAGED',
    inbound_calls_enabled=True,
    outbound_calls_enabled=False,
    contact_flow_logs_enabled=True,
    contact_lens_enabled=True
)

if instance_result['success']:
    print(f"Instance created: {instance_result['instance_id']}")
    
    # Crear cola de soporte
    queue_result = connect_manager.create_queue(
        instance_id=instance_result['instance_id'],
        name='SupportQueue',
        description='Customer support queue',
        max_contacts=50
    )
    
    if queue_result['success']:
        print(f"Queue created: {queue_result['queue_id']}")
        
        # Crear flujo de contacto de bienvenida
        flow_result = connect_manager.create_contact_flow(
            instance_id=instance_result['instance_id'],
            name='WelcomeFlow',
            description='Welcome flow for incoming calls',
            type='CONTACT_FLOW',
            content={
                'Version': '$LATEST',
                'StartAction': {
                    'Type': 'PlayPrompt',
                    'Parameters': {
                        'Prompt': {
                            'Text': 'Welcome to our customer service. How can I help you today?',
                            'Voice': 'Joanna'
                        }
                    }
                }
            }
        )
        
        if flow_result['success']:
            print(f"Contact flow created: {flow_result['contact_flow_id']}")
```

### **Integración Lex-Connect**
```python
# Ejemplo: Integrar bot de Lex con Connect
# El bot de Lex se puede usar en flujos de contacto de Connect

# En Connect, el flujo de contacto puede invocar a Lex
# para procesar la entrada del cliente y determinar la intención

# Simulación de integración
def integrate_lex_connect(connect_instance_id, lex_bot_name):
    """Integrar bot de Lex con Connect"""
    
    try:
        # 1. Crear flujo de contacto que use Lex
        lex_connect_flow = {
            'Version': '$LATEST',
            'StartAction': {
                'Type': 'GetCustomerInput',
                'Parameters': {
                    'ContactFlow': {
                        'Type': 'LexBot',
                        'Parameters': {
                            'BotName': lex_bot_name,
                            'BotAlias': '$LATEST'
                        }
                    }
                }
            }
        }
        
        # 2. Configurar rutas basadas en intenciones de Lex
        routing_logic = {
            'ProductSupport': 'SupportQueue',
            'OrderStatus': 'OrderQueue',
            'Billing': 'BillingQueue',
            'Complaint': 'EscalationQueue'
        }
        
        print(f"Lex-Connect integration configured")
        print(f"Bot: {lex_bot_name}")
        print(f"Instance: {connect_instance_id}")
        print(f"Routing logic: {len(routing_logic)} intent mappings")
        
        return {
            'success': True,
            'integration_config': {
                'lex_bot': lex_bot_name,
                'connect_instance': connect_instance_id,
                'routing_logic': routing_logic
            }
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

# Usar la integración
integration_result = integrate_lex_connect(
    connect_instance_id=instance_result['instance_id'],
    lex_bot_name=bot_result['bot_name']
)

if integration_result['success']:
    print("Lex-Connect integration successful!")
```

### **Monitoreo y Alertas**
```python
# Ejemplo: Configurar monitoreo para ambos servicios

# Monitoreo de Lex
lex_monitoring = lex_manager.create_lex_monitoring()
if lex_monitoring['success']:
    print(f"Lex monitoring configured: {len(lex_monitoring['monitoring_setup']['cloudwatch_alarms'])} alarms")

# Monitoreo de Connect
connect_monitoring = connect_manager.create_connect_monitoring()
if connect_monitoring['success']:
    print(f"Connect monitoring configured: {len(connect_monitoring['monitoring_setup']['cloudwatch_alarms'])} alarms")
```

## Configuración con AWS CLI

### **AWS Lex CLI Commands**
```bash
# Crear bot
aws lex-models put-bot \
  --name CustomerSupportBot \
  --locale en-US \
  --intents ProductSupport \
  --clarification-prompt '{"messages":[{"contentType":"PlainText","content":"How can I help you?"}]}' \
  --abort-statement '{"messages":[{"contentType":"PlainText","content":"I\'m having trouble helping you."}]}'

# Crear intención
aws lex-models put-intent \
  --name ProductSupport \
  --sample-utterances '[{"utterance":"I need help with my laptop"}]' \
  --slots '[{"slotType":"ProductType","slotTypeVersion":"1","slotConstraint":"Required","name":"ProductType"}]'

# Crear tipo de entidad
aws lex-models put-slot-type \
  --name ProductType \
  --enumeration-values '[{"value":"laptop","synonyms":["notebook"]}]'

# Enviar texto al bot
aws lex-runtime post-text \
  --bot-name CustomerSupportBot \
  --bot-alias $LATEST \
  --user-id user123 \
  --input-text "I need help with my laptop"
```

### **AWS Connect CLI Commands**
```bash
# Crear instancia
aws connect create-instance \
  --alias customer-service \
  --identity-management-type CONNECT_MANAGED \
  --client-enablement-type CONNECT \
  --inbound-calls-enabled \
  --contact-flow-logs-enabled \
  --contact-lens-enabled

# Crear cola
aws connect create-queue \
  --instance-id your-instance-id \
  --name SupportQueue \
  --max-contacts 50

# Crear flujo de contacto
aws connect create-contact-flow \
  --instance-id your-instance-id \
  --name WelcomeFlow \
  --type CONTACT_FLOW \
  --content file://welcome-flow.json

# Listar instancias
aws connect list-instances

# Obtener detalles de instancia
aws connect describe-instance --instance-id your-instance-id
```

## Mejores Prácticas

### **AWS Lex**
- **Diseño de Conversación**: Diseñar flujos de conversación naturales
- **Intenciones Claras**: Definir intenciones claras y específicas
- **Entidades Relevantes**: Extraer entidades importantes del contexto
- **Manejo de Errores**: Implementar manejo robusto de errores
- **Testing Continuo**: Probar y mejorar continuamente el bot

### **AWS Connect**
- **Optimización de Colas**: Configurar colas eficientes
- **Horarios de Operación**: Definir horarios apropiados
- **Monitoreo de Calidad**: Monitorear métricas de calidad
- **Capacitación de Agentes**: Capacitar agentes continuamente
- **Integración con Sistemas**: Integrar con CRM y otros sistemas

### **Integración Lex-Connect**
- **Flujos Coherentes**: Asegurar flujos coherentes entre Lex y Connect
- **Transferencia Suave**: Implementar transferencia suave entre bot y agente
- **Contexto Mantenido**: Mantener contexto durante transferencias
- **Feedback Loop**: Implementar sistema de feedback
- **Escalación Apropiada**: Configurar reglas de escalación apropiadas

## Costos

### **AWS Lex**
- **Solicitudes de Voz**: $4.00 por 1M solicitudes
- **Solicitudes de Texto**: GRATIS hasta 1M, luego $4.00 por 1M
- **Funciones Lambda**: Costos estándar de Lambda
- **Almacenamiento**: Costos estándar de AWS

### **AWS Connect**
- **Por Minuto**: $0.048 por minuto de contacto
- **Telefonía**: Costos variables según proveedor
- **Funciones Lambda**: Costos estándar de Lambda
- **Almacenamiento**: Costos estándar de AWS

### **Ejemplo de Costos Mensuales**
- **Lex**: 500K solicitudes de voz + 2M de texto = $2,000 + $4,000 = $6,000
- **Connect**: 100,000 minutos × $0.048 = $4,800
- **Lambda**: $200
- **Storage**: $100
- **Total estimado**: ~$11,100 por mes

## Troubleshooting

### **AWS Lex**
1. **Baja precisión**: Añadir más ejemplos de utterances
2. **Contexto perdido**: Implementar mejor gestión de sesión
3. **Errores de diálogo**: Revisar configuración de flujos
4. **Problemas de integración**: Verificar permisos y configuración

### **AWS Connect**
1. **Largas esperas**: Optimizar asignación de agentes
2. **Baja calidad**: Implementar mejor capacitación
3. **Problemas de enrutamiento**: Revisar configuración de colas
4. **Integraciones fallidas**: Verificar configuración de APIs

### **Comandos de Diagnóstico**
```bash
# Verificar estado del bot
aws lex-models get-bot --name CustomerSupportBot --version $LATEST

# Verificar métricas de Connect
aws connect get-metric-data --instance-id your-instance-id --start-time 2023-12-01T00:00:00Z --end-time 2023-12-01T23:59:59Z --metric-name ContactsInQueue --namespace AWS/Connect

# Verificar logs de Lambda
aws logs tail /aws/lambda/lex-monitor --follow
```

## Cumplimiento Normativo

### **GDPR**
- **Artículo 6**: Base legal para procesamiento
- **Artículo 7**: Consentimiento explícito
- **Artículo 25**: Protección desde el diseño
- **Artículo 32**: Seguridad del tratamiento

### **CCPA**
- **Right to Know**: Derecho a saber
- **Right to Delete**: Derecho a eliminar
- **Right to Opt-out**: Derecho a optar
- **Data Minimization**: Minimización de datos

### **HIPAA**
- **Privacy Rule**: Protección de información de salud
- **Security Rule**: Controles técnicos y administrativos
- **Breach Notification**: Notificación de brechas
- **Audit Controls**: Controles de auditoría

### **SOC 2**
- **Security**: Controles de seguridad
- **Availability**: Controles de disponibilidad
- **Processing Integrity**: Integridad de procesamiento
- **Confidentiality**: Confidencialidad de datos

## Integración con Otros Servicios

### **AWS Lambda**
- **Lógica de Negocio**: Implementación de lógica compleja
- **Integración de APIs**: Conexión con sistemas externos
- **Procesamiento de Datos**: Procesamiento de datos de conversación
- **Validación**: Validación y enriquecimiento de datos

### **AWS DynamoDB**
- **Almacenamiento de Sesiones**: Persistencia de sesiones
- **Datos de Usuario**: Almacenamiento de perfiles de usuarios
- **Historial de Conversaciones**: Registro de conversaciones
- **Cache**: Caching para mejorar rendimiento

### **AWS S3**
- **Almacenamiento de Logs**: Almacenamiento de logs de conversación
- **Archivos de Configuración**: Almacenamiento de configuraciones
- **Backup**: Backup de datos importantes
- **Analytics**: Datos para análisis

### **AWS CloudWatch**
- **Monitoreo**: Monitoreo de métricas y rendimiento
- **Alarmas**: Alertas para eventos críticos
- **Logs**: Almacenamiento de logs de aplicaciones
- **Dashboards**: Visualización de métricas

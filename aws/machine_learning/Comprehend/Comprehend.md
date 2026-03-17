# AWS Comprehend

## Definición

AWS Comprehend es un servicio de procesamiento de lenguaje natural (NLP) que utiliza machine learning para descubrir información y relaciones valiosas en texto. Proporciona capacidades de análisis de texto pre-entrenadas que permiten extraer entidades, frases clave, sentimientos, temas, y mucho más sin necesidad de experiencia previa en machine learning.

## Características Principales

### **Análisis de Texto**
- **Detección de Entidades**: Identificación automática de personas, lugares, organizaciones
- **Análisis de Sentimientos**: Determinación de sentimientos positivos, negativos, neutros o mixtos
- **Extracción de Frases Clave**: Identificación de frases y conceptos importantes
- **Detección de Temas**: Identificación de temas principales en documentos
- **Sintaxis del Lenguaje**: Análisis de estructura gramatical y sintáctica

### **Características Avanzadas**
- **Comprehend Medical**: Análisis especializado para texto médico
- **Comprehend Custom**: Entrenamiento de modelos personalizados
- **Eventos Dominantes**: Detección de eventos en texto
- **PII Detection**: Identificación de información personal sensible
- **Traducción Automática**: Traducción entre múltiples idiomas

### **Procesamiento por Lotes**
- **Batch Analysis**: Análisis de grandes volúmenes de documentos
- **Real-time Processing**: Procesamiento en tiempo real de texto
- **Multi-format Support**: Soporte para múltiples formatos de entrada
- **Scalable Processing**: Escalabilidad automática según demanda
- **Cost Optimization**: Optimización de costos para grandes volúmenes

### **Integración y API**
- **REST API**: API RESTful para fácil integración
- **SDK Support**: SDKs para múltiples lenguajes de programación
- **AWS Lambda**: Integración con funciones Lambda
- **AWS Glue**: Integración con ETL y data pipelines
- **Amazon S3**: Integración con almacenamiento en la nube

## Tipos de Operaciones

### **1. Operaciones de Análisis**
- **DetectDominantLanguage**: Detección del idioma dominante
- **DetectEntities**: Detección de entidades en texto
- **DetectKeyPhrases**: Extracción de frases clave
- **DetectSentiment**: Análisis de sentimientos
- **DetectTopics**: Detección de temas principales

### **2. Operaciones Médicas**
- **DetectEntities**: Detección de entidades médicas especializadas
- **DetectPHI**: Detección de información de salud protegida
- **InferICD10**: Inferencia de códigos ICD-10
- **RxNorm**: Normalización de medicamentos

### **3. Operaciones Personalizadas**
- **CreateEndpoint**: Crear endpoint para modelo personalizado
- **CreateDocumentClassifier**: Crear clasificador de documentos
- **CreateEntityRecognizer**: Crear reconocedor de entidades
- **StartEntitiesDetectionJob**: Iniciar trabajo de detección de entidades

### **4. Operaciones de Configuración**
- **DescribeEndpoint**: Describir endpoint personalizado
- **ListEndpoints**: Listar endpoints disponibles
- **UpdateEndpoint**: Actualizar configuración de endpoint
- **DeleteEndpoint**: Eliminar endpoint personalizado

## Arquitectura de AWS Comprehend

### **Componentes Principales**
```
AWS Comprehend Architecture
├── Input Layer
│   ├── Text Input
│   ├── Document Input
│   ├── Batch Processing
│   ├── Real-time Processing
│   └── Format Validation
├── NLP Engine
│   ├── Language Detection
│   ├── Entity Recognition
│   ├── Sentiment Analysis
│   ├── Key Phrase Extraction
│   └── Topic Modeling
├── Specialized Engines
│   ├── Medical NLP
│   ├── Custom Models
│   ├── PII Detection
│   ├── Event Detection
│   └── Syntax Analysis
├── Processing Layer
│   ├── Text Preprocessing
│   ├── Feature Extraction
│   ├── Model Inference
│   ├── Post-processing
│   └── Quality Scoring
└── Integration Layer
    ├── REST APIs
    ├── SDK Support
    ├── Lambda Integration
    ├── S3 Integration
    └── Event Notifications
```

### **Flujo de Procesamiento**
```
Input → Preprocessing → Feature Extraction → Model Inference → Post-processing → Output
```

## Configuración de AWS Comprehend

### **Gestión Completa de AWS Comprehend**
```python
import boto3
import json
import time
import base64
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class ComprehendManager:
    def __init__(self, region='us-east-1):
        self.comprehend = boto3.client('comprehend', region_name=region)
        self.comprehendmedical = boto3.client('comprehendmedical', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.lambda_client = boto3.client('lambda', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.region = region
    
    def detect_dominant_language(self, text):
        """Detectar el idioma dominante del texto"""
        
        try:
            response = self.comprehend.detect_dominant_language(Text=text)
            
            result = {
                'language_code': response['Languages'][0]['LanguageCode'],
                'language_name': response['Languages'][0]['LanguageName'],
                'score': response['Languages'][0]['Score']
            }
            
            return {
                'success': True,
                'language_detection': result,
                'text_length': len(text)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def detect_entities(self, text, language_code='en', endpoint_arn=None):
        """Detectar entidades en el texto"""
        
        try:
            params = {'Text': text, 'LanguageCode': language_code}
            
            if endpoint_arn:
                params['EndpointArn'] = endpoint_arn
            
            response = self.comprehend.detect_entities(**params)
            
            entities = []
            for entity in response['Entities']:
                entity_info = {
                    'text': entity['Text'],
                    'type': entity['Type'],
                    'score': entity['Score'],
                    'begin_offset': entity['BeginOffset'],
                    'end_offset': entity['EndOffset']
                }
                entities.append(entity_info)
            
            return {
                'success': True,
                'entities': entities,
                'count': len(entities),
                'language_code': language_code
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def detect_key_phrases(self, text, language_code='en', endpoint_arn=None):
        """Extraer frases clave del texto"""
        
        try:
            params = {'Text': text, 'LanguageCode': language_code}
            
            if endpoint_arn:
                params['EndpointArn'] = endpoint_arn
            
            response = self.comprehend.detect_key_phrases(**params)
            
            key_phrases = []
            for phrase in response['KeyPhrases']:
                phrase_info = {
                    'text': phrase['Text'],
                    'score': phrase['Score'],
                    'begin_offset': phrase['BeginOffset'],
                    'end_offset': phrase['EndOffset']
                }
                key_phrases.append(phrase_info)
            
            return {
                'success': True,
                'key_phrases': key_phrases,
                'count': len(key_phrases),
                'language_code': language_code
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def detect_sentiment(self, text, language_code='en', endpoint_arn=None):
        """Analizar sentimientos del texto"""
        
        try:
            params = {'Text': text, 'LanguageCode': language_code}
            
            if endpoint_arn:
                params['EndpointArn'] = endpoint_arn
            
            response = self.comprehend.detect_sentiment(**params)
            
            sentiment = {
                'sentiment': response['Sentiment'],
                'sentiment_score': {
                    'positive': response['SentimentScore']['Positive'],
                    'negative': response['SentimentScore']['Negative'],
                    'neutral': response['SentimentScore']['Neutral'],
                    'mixed': response['SentimentScore']['Mixed']
                }
            }
            
            return {
                'success': True,
                'sentiment': sentiment,
                'language_code': language_code
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def detect_topics(self, text, language_code='en', endpoint_arn=None):
        """Detectar temas principales del texto"""
        
        try:
            params = {'Text': text, 'LanguageCode': language_code}
            
            if endpoint_arn:
                params['EndpointArn'] = endpoint_arn
            
            response = self.comprehend.detect_topics(**params)
            
            topics = []
            for topic in response['Topics']:
                topic_info = {
                    'topic': topic['Topic'],
                    'score': topic['Score']
                }
                topics.append(topic_info)
            
            return {
                'success': True,
                'topics': topics,
                'count': len(topics),
                'language_code': language_code
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def detect_syntax(self, text, language_code='en', endpoint_arn=None):
        """Analizar sintaxis del texto"""
        
        try:
            params = {'Text': text, 'LanguageCode': language_code}
            
            if endpoint_arn:
                params['EndpointArn'] = endpoint_arn
            
            response = self.comprehend.detect_syntax(**params)
            
            syntax_tokens = []
            for token in response['SyntaxTokens']:
                token_info = {
                    'text': token['Text'],
                    'token_id': token['TokenId'],
                    'begin_offset': token['BeginOffset'],
                    'end_offset': token['EndOffset'],
                    'part_of_speech': token['PartOfSpeech']['Tag'],
                    'confidence': token['PartOfSpeech']['Score']
                }
                syntax_tokens.append(token_info)
            
            return {
                'success': True,
                'syntax_tokens': syntax_tokens,
                'count': len(syntax_tokens),
                'language_code': language_code
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def detect_pii_entities(self, text, language_code='en', endpoint_arn=None):
        """Detectar entidades de información personal"""
        
        try:
            params = {'Text': text, 'LanguageCode': language_code}
            
            if endpoint_arn:
                params['EndpointArn'] = endpoint_arn
            
            response = self.comprehend.detect_pii_entities(**params)
            
            pii_entities = []
            for entity in response['Entities']:
                entity_info = {
                    'text': entity['Text'],
                    'type': entity['Type'],
                    'score': entity['Score'],
                    'begin_offset': entity['BeginOffset'],
                    'end_offset': entity['EndOffset']
                }
                pii_entities.append(entity_info)
            
            return {
                'success': True,
                'pii_entities': pii_entities,
                'count': len(pii_entities),
                'language_code': language_code
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def batch_detect_entities(self, s3_uri, input_format='ONE_DOC_PER_FILE',
                             output_s3_uri=None, data_access_role_arn=None,
                             language_code='en', endpoint_arn=None):
        """Detección de entidades por lotes"""
        
        try:
            params = {
                'InputS3Uri': s3_uri,
                'InputFormat': input_format,
                'DataAccessRoleArn': data_access_role_arn,
                'LanguageCode': language_code
            }
            
            if output_s3_uri:
                params['OutputS3Uri'] = output_s3_uri
            
            if endpoint_arn:
                params['EndpointArn'] = endpoint_arn
            
            response = self.comprehend.start_entities_detection_job(**params)
            
            return {
                'success': True,
                'job_id': response['JobId'],
                'job_arn': response['JobArn'],
                'status': 'SUBMITTED'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_entities_detection_job(self, job_id):
        """Obtener estado del trabajo de detección de entidades"""
        
        try:
            response = self.comprehend.describe_entities_detection_job(JobId=job_id)
            
            job_info = {
                'job_id': response['EntitiesDetectionJobProperties']['JobId'],
                'job_arn': response['EntitiesDetectionJobProperties']['JobArn'],
                'job_name': response['EntitiesDetectionJobProperties'].get('JobName', ''),
                'job_status': response['EntitiesDetectionJobProperties']['JobStatus'],
                'language_code': response['EntitiesDetectionJobProperties']['LanguageCode'],
                'data_access_role_arn': response['EntitiesDetectionJobProperties']['DataAccessRoleArn'],
                'input_s3_uri': response['EntitiesDetectionJobProperties']['InputS3Uri'],
                'output_s3_uri': response['EntitiesDetectionJobProperties'].get('OutputS3Uri', ''),
                'submit_time': response['EntitiesDetectionJobProperties']['SubmitTime'].isoformat() if response['EntitiesDetectionJobProperties'].get('SubmitTime') else '',
                'completion_time': response['EntitiesDetectionJobProperties'].get('CompletionTime', '').isoformat() if response['EntitiesDetectionJobProperties'].get('CompletionTime') else '',
                'input_data_config': response['EntitiesDetectionJobProperties']['InputDataConfig'],
                'output_data_config': response['EntitiesDetectionJobProperties']['OutputDataConfig']
            }
            
            return {
                'success': True,
                'job_info': job_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_entities_detection_jobs(self, status=None, max_results=100, next_token=None):
        """Listar trabajos de detección de entidades"""
        
        try:
            params = {'MaxResults': max_results}
            
            if status:
                params['Filter'] = {'JobStatus': status}
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.comprehend.list_entities_detection_jobs(**params)
            
            jobs = []
            for job in response['EntitiesDetectionJobPropertiesList']:
                job_info = {
                    'job_id': job['JobId'],
                    'job_name': job.get('JobName', ''),
                    'job_status': job['JobStatus'],
                    'language_code': job['LanguageCode'],
                    'submit_time': job['SubmitTime'].isoformat() if job.get('SubmitTime') else '',
                    'completion_time': job.get('CompletionTime', '').isoformat() if job.get('CompletionTime') else ''
                }
                jobs.append(job_info)
            
            return {
                'success': True,
                'jobs': jobs,
                'count': len(jobs),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_entity_recognizer(self, recognizer_name, data_access_role_arn,
                                   recognizer_definition, version_name='1.0',
                                   language_code='en', tags=None):
        """Crear reconocedor de entidades personalizado"""
        
        try:
            params = {
                'RecognizerName': recognizer_name,
                'DataAccessRoleArn': data_access_role_arn,
                'RecognizerDefinition': recognizer_definition,
                'VersionName': version_name,
                'LanguageCode': language_code
            }
            
            if tags:
                params['Tags'] = tags
            
            response = self.comprehend.create_entity_recognizer(**params)
            
            return {
                'success': True,
                'recognizer_arn': response['RecognizerArn'],
                'recognizer_id': response['RecognizerId'],
                'version_id': response['VersionId'],
                'status': 'TRAINING_IN_PROGRESS'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_entity_recognizer(self, recognizer_arn):
        """Obtener detalles del reconocedor de entidades"""
        
        try:
            response = self.comprehend.describe_entity_recognizer(RecognizerArn=recognizer_arn)
            
            recognizer_info = {
                'recognizer_arn': response['EntityRecognizerProperties']['RecognizerArn'],
                'recognizer_id': response['EntityRecognizerProperties']['RecognizerId'],
                'recognizer_name': response['EntityRecognizerProperties'].get('RecognizerName', ''),
                'language_code': response['EntityRecognizerProperties']['LanguageCode'],
                'status': response['EntityRecognizerProperties']['Status'],
                'input_data_config': response['EntityRecognizerProperties']['InputDataConfig'],
                'recognizer_definition': response['EntityRecognizerProperties'].get('RecognizerDefinition', {}),
                'created_time': response['EntityRecognizerProperties'].get('CreatedTime', '').isoformat() if response['EntityRecognizerProperties'].get('CreatedTime') else '',
                'last_updated_time': response['EntityRecognizerProperties'].get('LastUpdatedTime', '').isoformat() if response['EntityRecognizerProperties'].get('LastUpdatedTime') else ''
            }
            
            return {
                'success': True,
                'recognizer_info': recognizer_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_endpoint(self, endpoint_name, model_arn, desired_inference_units=1,
                        language_code='en', data_access_role_arn=None,
                        tags=None):
        """Crear endpoint para modelo personalizado"""
        
        try:
            params = {
                'EndpointName': endpoint_name,
                'ModelArn': model_arn,
                'DesiredInferenceUnits': desired_inference_units,
                'LanguageCode': language_code
            }
            
            if data_access_role_arn:
                params['DataAccessRoleArn'] = data_access_role_arn
            
            if tags:
                params['Tags'] = tags
            
            response = self.comprehend.create_endpoint(**params)
            
            return {
                'success': True,
                'endpoint_arn': response['EndpointArn'],
                'endpoint_id': response['EndpointId'],
                'status': 'CREATING'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_endpoint(self, endpoint_arn):
        """Obtener detalles del endpoint"""
        
        try:
            response = self.comprehend.describe_endpoint(EndpointArn=endpoint_arn)
            
            endpoint_info = {
                'endpoint_arn': response['EndpointProperties']['EndpointArn'],
                'endpoint_id': response['EndpointProperties']['EndpointId'],
                'endpoint_name': response['EndpointProperties'].get('EndpointName', ''),
                'model_arn': response['EndpointProperties']['ModelArn'],
                'status': response['EndpointProperties']['Status'],
                'desired_inference_units': response['EndpointProperties']['DesiredInferenceUnits'],
                'current_inference_units': response['EndpointProperties'].get('CurrentInferenceUnits', 0),
                'creation_time': response['EndpointProperties'].get('CreationTime', '').isoformat() if response['EndpointProperties'].get('CreationTime') else '',
                'last_modified_time': response['EndpointProperties'].get('LastModifiedTime', '').isoformat() if response['EndpointProperties'].get('LastModifiedTime') else ''
            }
            
            return {
                'success': True,
                'endpoint_info': endpoint_info
            }
    
    def delete_endpoint(self, endpoint_arn):
        """Eliminar endpoint"""
        
        try:
            response = self.comprehend.delete_endpoint(EndpointArn=endpoint_arn)
            
            return {
                'success': True,
                'endpoint_arn': endpoint_arn,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_text_comprehensive(self, text, language_code='en', endpoint_arn=None):
        """Análisis comprehensivo del texto"""
        
        try:
            analysis_results = {
                'text_length': len(text),
                'language_code': language_code,
                'analysis': {}
            }
            
            # Detección de idioma
            lang_result = self.detect_dominant_language(text)
            if lang_result['success']:
                analysis_results['analysis']['language'] = lang_result['language_detection']
            
            # Detección de entidades
            entities_result = self.detect_entities(text, language_code, endpoint_arn)
            if entities_result['success']:
                analysis_results['analysis']['entities'] = entities_result['entities']
            
            # Extracción de frases clave
            key_phrases_result = self.detect_key_phrases(text, language_code, endpoint_arn)
            if key_phrases_result['success']:
                analysis_results['analysis']['key_phrases'] = key_phrases_result['key_phrases']
            
            # Análisis de sentimientos
            sentiment_result = self.detect_sentiment(text, language_code, endpoint_arn)
            if sentiment_result['success']:
                analysis_results['analysis']['sentiment'] = sentiment_result['sentiment']
            
            # Detección de temas
            topics_result = self.detect_topics(text, language_code, endpoint_arn)
            if topics_result['success']:
                analysis_results['analysis']['topics'] = topics_result['topics']
            
            # Análisis sintáctico
            syntax_result = self.detect_syntax(text, language_code, endpoint_arn)
            if syntax_result['success']:
                analysis_results['analysis']['syntax'] = syntax_result['syntax_tokens']
            
            # Detección de PII
            pii_result = self.detect_pii_entities(text, language_code, endpoint_arn)
            if pii_result['success']:
                analysis_results['analysis']['pii_entities'] = pii_result['pii_entities']
            
            return {
                'success': True,
                'comprehensive_analysis': analysis_results
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def process_batch_documents(self, s3_uri, input_format='ONE_DOC_PER_FILE',
                              analysis_types=['entities', 'key_phrases', 'sentiment'],
                              language_code='en', data_access_role_arn=None,
                              output_s3_uri=None):
        """Procesar documentos por lotes"""
        
        try:
            batch_results = {}
            
            for analysis_type in analysis_types:
                if analysis_type == 'entities':
                    job_result = self.batch_detect_entities(
                        s3_uri=s3_uri,
                        input_format=input_format,
                        output_s3_uri=output_s3_uri + '/entities' if output_s3_uri else None,
                        data_access_role_arn=data_access_role_arn,
                        language_code=language_code
                    )
                    batch_results['entities'] = job_result
                
                elif analysis_type == 'key_phrases':
                    job_result = self.comprehend.start_key_phrases_detection_job(
                        InputS3Uri=s3_uri,
                        InputFormat=input_format,
                        OutputS3Uri=output_s3_uri + '/key_phrases' if output_s3_uri else None,
                        DataAccessRoleArn=data_access_role_arn,
                        LanguageCode=language_code
                    )
                    batch_results['key_phrases'] = job_result
                
                elif analysis_type == 'sentiment':
                    job_result = self.comprehend.start_sentiment_detection_job(
                        InputS3Uri=s3_uri,
                        InputFormat=input_format,
                        OutputS3Uri=output_s3_uri + '/sentiment' if output_s3_uri else None,
                        DataAccessRoleArn=data_access_role_arn,
                        LanguageCode=language_code
                    )
                    batch_results['sentiment'] = job_result
            
            return {
                'success': True,
                'batch_results': batch_results,
                'analysis_types': analysis_types
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_text_quality(self, text, language_code='en'):
        """Analizar calidad del texto"""
        
        try:
            quality_analysis = {
                'readability_score': 0,
                'complexity_score': 0,
                'structure_analysis': {},
                'content_analysis': {},
                'recommendations': []
            }
            
            # Análisis básico de calidad
            words = text.split()
            sentences = text.split('.')
            
            # Calcular puntuación de legibilidad (simplificada)
            avg_sentence_length = len(words) / max(len(sentences), 1)
            if avg_sentence_length < 15:
                readability_score = min(100, 100 - (15 - avg_sentence_length) * 2)
            else:
                readability_score = max(0, 100 - (avg_sentence_length - 15) * 2)
            
            quality_analysis['readability_score'] = readability_score
            
            # Análisis de complejidad
            unique_words = len(set(word.lower() for word in words))
            complexity_score = min(100, (unique_words / max(len(words), 1)) * 100)
            quality_analysis['complexity_score'] = complexity_score
            
            # Análisis de estructura
            quality_analysis['structure_analysis'] = {
                'total_words': len(words),
                'total_sentences': len(sentences),
                'avg_words_per_sentence': avg_sentence_length,
                'unique_words': unique_words,
                'vocabulary_richness': complexity_score
            }
            
            # Análisis de contenido
            sentiment_result = self.detect_sentiment(text, language_code)
            if sentiment_result['success']:
                quality_analysis['content_analysis']['sentiment'] = sentiment_result['sentiment']
            
            entities_result = self.detect_entities(text, language_code)
            if entities_result['success']:
                quality_analysis['content_analysis']['entity_count'] = len(entities_result['entities'])
            
            # Generar recomendaciones
            recommendations = []
            
            if readability_score < 60:
                recommendations.append({
                    'priority': 'HIGH',
                    'category': 'READABILITY',
                    'title': 'Improve readability',
                    'description': f'Readability score is {readability_score:.1f}',
                    'action': 'Use shorter sentences and simpler language'
                })
            
            if complexity_score < 50:
                recommendations.append({
                    'priority': 'MEDIUM',
                    'category': 'COMPLEXITY',
                    'title': 'Increase vocabulary richness',
                    'description': f'Vocabulary richness is {complexity_score:.1f}%',
                    'action': 'Use more diverse vocabulary'
                })
            
            if avg_sentence_length > 25:
                recommendations.append({
                    'priority': 'MEDIUM',
                    'category': 'STRUCTURE',
                    'title': 'Simplify sentence structure',
                    'description': f'Average sentence length is {avg_sentence_length:.1f} words',
                    'action': 'Break long sentences into shorter ones'
                })
            
            quality_analysis['recommendations'] = recommendations
            
            return {
                'success': True,
                'quality_analysis': quality_analysis
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_comprehend_monitoring(self, sns_topic_arn=None):
        """Configurar monitoreo de Comprehend"""
        
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
                    Name='comprehend-alerts',
                    Tags=[
                        {'Key': 'Service', 'Value': 'Comprehend'},
                        {'Key': 'Purpose', 'Value': 'Monitoring'}
                    ]
                )
                monitoring_setup['sns_topic_arn'] = topic_response['TopicArn']
            
            # Crear función Lambda para monitoreo
            lambda_result = self.create_comprehend_monitoring_lambda()
            if lambda_result['success']:
                monitoring_setup['lambda_functions'].append(lambda_result['function_arn'])
            
            # Configurar alarmas de CloudWatch
            alarm_result = self.setup_comprehend_alarms(monitoring_setup['sns_topic_arn'])
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
    
    def create_comprehend_monitoring_lambda(self):
        """Crear función Lambda para monitoreo de Comprehend"""
        
        try:
            lambda_code = self._get_comprehend_lambda_code()
            
            # Crear rol de ejecución
            role_arn = self._create_lambda_execution_role('comprehend-monitoring-role')
            
            # Crear función Lambda
            response = self.lambda_client.create_function(
                FunctionName='comprehend-monitor',
                Runtime='python3.9',
                Role=role_arn,
                Handler='lambda_function.lambda_handler',
                Code={
                    'ZipFile': lambda_code
                },
                Description='Lambda function for Comprehend monitoring',
                Timeout=300,
                Environment={
                    'Variables': {
                        'SNS_TOPIC_ARN': f'arn:aws:sns:{self.region}:123456789012:comprehend-alerts'
                    }
                },
                Tags={
                    'Service': 'Comprehend',
                    'Purpose': 'Monitoring'
                }
            )
            
            return {
                'success': True,
                'function_name': 'comprehend-monitor',
                'function_arn': response['FunctionArn'],
                'role_arn': role_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_comprehend_lambda_code(self):
        """Obtener código de Lambda para monitoreo de Comprehend"""
        
        return '''
import json
import boto3
import os
from datetime import datetime

def lambda_handler(event, context):
    sns = boto3.client('sns')
    comprehend = boto3.client('comprehend')
    
    sns_topic_arn = os.environ['SNS_TOPIC_ARN']
    
    # Analizar evento de Comprehend
    event_analysis = analyze_comprehend_event(event)
    
    if event_analysis['requires_attention']:
        # Enviar alerta
        alert = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': 'COMPREHEND_ALERT',
            'job_type': event_analysis['job_type'],
            'job_id': event_analysis['job_id'],
            'status': event_analysis['status'],
            'risk_level': event_analysis['risk_level'],
            'recommendations': event_analysis['recommendations']
        }
        
        sns.publish(
            TopicArn=sns_topic_arn,
            Subject=f'Comprehend Alert: {event_analysis["job_type"]}',
            Message=json.dumps(alert),
            MessageStructure='string'
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Comprehend alert sent',
                'job_type': event_analysis['job_type'],
                'risk_level': event_analysis['risk_level']
            })
        }
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'No action required'})
    }

def analyze_comprehend_event(event):
    """Analizar evento de Comprehend"""
    
    analysis = {
        'requires_attention': False,
        'job_type': '',
        'job_id': '',
        'status': '',
        'risk_level': 'LOW',
        'recommendations': []
    }
    
    # Simular análisis de evento
    if 'detail-type' in event:
        detail_type = event['detail-type']
        
        if detail_type == 'Comprehend Job Status Change':
            detail = event.get('detail', {})
            analysis['job_type'] = detail.get('JobType', '')
            analysis['job_id'] = detail.get('JobId', '')
            analysis['status'] = detail.get('JobStatus', '')
            
            # Determinar si requiere atención
            if analysis['status'] == 'FAILED':
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'HIGH'
                analysis['recommendations'].append(f'Investigate job failure: {detail.get("FailureReason", "Unknown")}')
            elif analysis['status'] == 'COMPLETED_WITH_ERROR':
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'MEDIUM'
                analysis['recommendations'].append('Review partial job results')
    
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
                Description='Execution role for Comprehend monitoring Lambda',
                Tags=[
                    {'Key': 'Service', 'Value': 'Lambda'},
                    {'Key': 'Purpose', 'Value': 'ComprehendMonitoring'}
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
    
    def setup_comprehend_alarms(self, sns_topic_arn):
        """Configurar alarmas de CloudWatch para Comprehend"""
        
        try:
            alarms_created = []
            
            # Alarma para trabajos fallidos
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='Comprehend-FailedJobs',
                    AlarmDescription='Failed Comprehend jobs detected',
                    Namespace='AWS/Comprehend',
                    MetricName='FailedJobs',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('Comprehend-FailedJobs')
            except Exception:
                pass
            
            # Alarma para uso alto
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='Comprehend-HighUsage',
                    AlarmDescription='High Comprehend usage detected',
                    Namespace='AWS/Comprehend',
                    MetricName='CharacterCount',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1000000,  # 1M characters
                    ComparisonOperator='GreaterThanThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('Comprehend-HighUsage')
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
    
    def generate_comprehend_report(self, report_type='comprehensive', time_range_days=30):
        """Generar reporte de Comprehend"""
        
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
                model_analysis = self._get_model_analysis()
                report['model_analysis'] = model_analysis
                report['recommendations'] = self._generate_comprehensive_recommendations()
            
            elif report_type == 'usage':
                # Reporte de uso
                report['usage_analysis'] = {
                    'api_usage': self._get_api_usage_stats(),
                    'language_distribution': self._get_language_distribution_stats(),
                    'feature_usage': self._get_feature_usage_stats(),
                    'batch_processing': self._get_batch_processing_stats()
                }
            
            elif report_type == 'quality':
                # Reporte de calidad
                report['quality_assessment'] = {
                    'accuracy_metrics': self._get_accuracy_metrics(),
                    'model_performance': self._get_model_performance_stats(),
                    'custom_model_analysis': self._get_custom_model_analysis_stats(),
                    'quality_trends': self._get_quality_trends()
                }
            
            elif report_type == 'cost':
                # Reporte de costos
                report['cost_breakdown'] = {
                    'api_costs': self._get_api_costs(),
                    'batch_costs': self._get_batch_costs(),
                    'custom_model_costs': self._get_custom_model_costs(),
                    'total_cost': self._calculate_total_cost()
                }
            
            return {
                'success': True,
                'comprehend_report': report
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
            'total_api_calls': 2500000,
            'total_characters_processed': 500000000,
            'batch_jobs': 1500,
            'custom_models': 8,
            'endpoints': 5,
            'languages_used': 15,
            'average_text_length': 200,
            'peak_usage_hour': '14:00-15:00'
        }
    
    def _get_performance_metrics(self):
        """Obtener métricas de rendimiento"""
        
        return {
            'average_response_time': 0.85,  # segundos
            'throughput': 3000,  # caracteres por segundo
            'success_rate': 99.2,  # porcentaje
            'accuracy_rate': 94.5,  # porcentaje
            'model_latency': 0.45,  # segundos
            'uptime': 99.95  # porcentaje
        }
    
    def _get_cost_analysis(self):
        """Obtener análisis de costos"""
        
        return {
            'monthly_cost': 2500.00,
            'cost_breakdown': {
                'api_calls': 1500.00,
                'batch_processing': 500.00,
                'custom_models': 300.00,
                'endpoints': 200.00
            },
            'cost_trend': 'INCREASING',
            'cost_optimization_potential': 20.0  # porcentaje
        }
    
    def _get_model_analysis(self):
        """Obtener análisis de modelos"""
        
        return {
            'pretrained_models': {
                'entity_recognition': {'accuracy': 94.5, 'languages': 6},
                'key_phrase_extraction': {'accuracy': 92.3, 'languages': 6},
                'sentiment_analysis': {'accuracy': 89.7, 'languages': 6},
                'language_detection': {'accuracy': 98.2, 'languages': 100}
            },
            'custom_models': [
                {'name': 'medical-entities', 'accuracy': 96.2, 'domain': 'healthcare'},
                {'name': 'legal-entities', 'accuracy': 91.8, 'domain': 'legal'},
                {'name': 'finance-entities', 'accuracy': 93.5, 'domain': 'finance'}
            ]
        }
    
    def _generate_comprehensive_recommendations(self):
        """Generar recomendaciones comprehensivas"""
        
        recommendations = [
            {
                'priority': 'HIGH',
                'category': 'ACCURACY',
                'title': 'Improve model accuracy',
                'description': 'Use custom models for domain-specific terminology',
                'action': 'Train custom models with domain-specific data'
            },
            {
                'priority': 'MEDIUM',
                'category': 'COST',
                'title': 'Optimize batch processing',
                'description': 'Optimize batch sizes and processing schedules',
                'action': 'Implement efficient batching strategies'
            },
            {
                'priority': 'LOW',
                'category': 'MONITORING',
                'title': 'Enhance monitoring',
                'description': 'Implement comprehensive monitoring and alerting',
                'action': 'Set up detailed monitoring for quality metrics'
            }
        ]
        
        return recommendations
```

## Casos de Uso

### **1. Análisis de Texto Completo**
```python
# Ejemplo: Análisis comprehensivo de texto
manager = ComprehendManager('us-east-1')

text = """
Amazon Web Services (AWS) is a subsidiary of Amazon that provides on-demand cloud computing platforms and APIs to individuals, companies, and governments, on a metered pay-as-you-go basis. 
These cloud computing web services provide a variety of basic abstract technical infrastructure and distributed computing building blocks and tools.
One of these services is Amazon Comprehend, a natural language processing (NLP) service that uses machine learning to uncover insights and connections in text.
"""

# Análisis completo
analysis_result = manager.analyze_text_comprehensive(text)

if analysis_result['success']:
    analysis = analysis_result['comprehensive_analysis']
    
    print(f"Text Analysis Results")
    print(f"Text length: {analysis['text_length']} characters")
    print(f"Language: {analysis['analysis']['language']['language_name']} ({analysis['analysis']['language']['language_code']})")
    
    # Entidades detectadas
    if 'entities' in analysis['analysis']:
        entities = analysis['analysis']['entities']
        print(f"Entities detected: {len(entities)}")
        for entity in entities[:5]:  # Mostrar primeras 5
            print(f"  - {entity['text']} ({entity['type']}) - Score: {entity['score']:.2f}")
    
    # Frases clave
    if 'key_phrases' in analysis['analysis']:
        key_phrases = analysis['analysis']['key_phrases']
        print(f"Key phrases: {len(key_phrases)}")
        for phrase in key_phrases[:3]:
            print(f"  - {phrase['text']} - Score: {phrase['score']:.2f}")
    
    # Sentimiento
    if 'sentiment' in analysis['analysis']:
        sentiment = analysis['analysis']['sentiment']
        print(f"Sentiment: {sentiment['sentiment']}")
        print(f"Scores: Positive={sentiment['sentiment_score']['positive']:.2f}, "
              f"Negative={sentiment['sentiment_score']['negative']:.2f}, "
              f"Neutral={sentiment['sentiment_score']['neutral']:.2f}")
    
    # Temas
    if 'topics' in analysis['analysis']:
        topics = analysis['analysis']['topics']
        print(f"Topics: {len(topics)}")
        for topic in topics:
            print(f"  - {topic['topic']} - Score: {topic['score']:.2f}")
```

### **2. Detección de Entidades Personalizadas**
```python
# Ejemplo: Crear y usar reconocedor de entidades personalizado
manager = ComprehendManager('us-east-1')

# Definir datos de entrenamiento
recognizer_definition = {
    'EntityTypes': [
        {
            'Name': 'PRODUCT',
            'Type': 'PRODUCT'
        },
        {
            'Name': 'COMPANY',
            'Type': 'ANY'
        }
    ]
}

# Crear reconocedor de entidades
recognizer_result = manager.create_entity_recognizer(
    recognizer_name='product-recognizer',
    data_access_role_arn='arn:aws:iam::123456789012:role/ComprehendDataAccess',
    recognizer_definition=recognizer_definition,
    language_code='en'
)

if recognizer_result['success']:
    print(f"Entity recognizer created: {recognizer_result['recognizer_id']}")
    
    # Crear endpoint
    endpoint_result = manager.create_endpoint(
        endpoint_name='product-endpoint',
        model_arn=recognizer_result['recognizer_arn'],
        desired_inference_units=1,
        language_code='en'
    )
    
    if endpoint_result['success']:
        print(f"Endpoint created: {endpoint_result['endpoint_id']}")
        
        # Usar endpoint personalizado
        text = "I bought an iPhone 13 and a MacBook Pro last week. The iPhone cost $999 and the MacBook was $1299."
        
        entities_result = manager.detect_entities(
            text=text,
            language_code='en',
            endpoint_arn=endpoint_result['endpoint_arn']
        )
        
        if entities_result['success']:
            entities = entities_result['entities']
            print(f"Custom entities detected: {len(entities)}")
            for entity in entities:
                print(f"  - {entity['text']} ({entity['type']}) - Score: {entity['score']:.2f}")
```

### **3. Procesamiento por Lotes**
```python
# Ejemplo: Procesamiento por lotes de documentos
manager = ComprehendManager('us-east-1')

# Procesar documentos en S3
batch_result = manager.process_batch_documents(
    s3_uri='s3://my-bucket/documents/',
    input_format='ONE_DOC_PER_FILE',
    analysis_types=['entities', 'key_phrases', 'sentiment'],
    language_code='en',
    data_access_role_arn='arn:aws:iam::123456789012:role/ComprehendDataAccess',
    output_s3_uri='s3://my-bucket/output/'
)

if batch_result['success']:
    print(f"Batch processing initiated")
    
    for analysis_type, job in batch_result['batch_results'].items():
        if job['success']:
            print(f"{analysis_type} job: {job['job_id']}")
            
            # Esperar y verificar estado
            import time
            time.sleep(30)  # Esperar a que se complete
            
            job_info = manager.describe_entities_detection_job(job['job_id'])
            if job_info['success']:
                info = job_info['job_info']
                print(f"  Status: {info['job_status']}")
                print(f"  Language: {info['language_code']}")
                print(f"  Submit time: {info['submit_time']}")
```

### **4. Análisis de Calidad de Texto**
```python
# Ejemplo: Análisis de calidad de texto
manager = ComprehendManager('us-east-1')

# Texto de ejemplo
text = """
The quick brown fox jumps over the lazy dog. This is a simple sentence that demonstrates basic English grammar and structure.
The fox is an animal that belongs to the Canidae family. It is known for its intelligence and adaptability.
The dog is a domesticated mammal that has been bred by humans for thousands of years.
"""

quality_result = manager.analyze_text_quality(text)

if quality_result['success']:
    quality = quality_result['quality_analysis']
    
    print(f"Text Quality Analysis")
    print(f"Readability score: {quality['readability_score']:.1f}")
    print(f"Complexity score: {quality['complexity_score']:.1f}")
    
    structure = quality['structure_analysis']
    print(f"Total words: {structure['total_words']}")
    print(f"Total sentences: {structure['total_sentences']}")
    print(f"Average words per sentence: {structure['avg_words_per_sentence']:.1f}")
    print(f"Unique words: {structure['unique_words']}")
    print(f"Vocabulary richness: {structure['vocabulary_richness']:.1f}%")
    
    # Recomendaciones
    recommendations = quality['recommendations']
    print(f"Recommendations: {len(recommendations)}")
    for rec in recommendations:
        print(f"  - {rec['title']} ({rec['priority']})")
        print(f"    {rec['description']}")
        print(f"    Action: {rec['action']}")
```

### **5. Configuración de Monitoreo**
```python
# Ejemplo: Configurar monitoreo de Comprehend
manager = ComprehendManager('us-east-1')

monitoring_result = manager.create_comprehend_monitoring()

if monitoring_result['success']:
    setup = monitoring_result['monitoring_setup']
    print(f"Comprehend monitoring configured")
    print(f"SNS Topic: {setup['sns_topic_arn']}")
    print(f"Lambda functions: {len(setup['lambda_functions'])}")
    print(f"CloudWatch alarms: {len(setup['cloudwatch_alarms'])}")
```

### **6. Generación de Reportes**
```python
# Ejemplo: Generar reporte comprehensivo
manager = ComprehendManager('us-east-1')

report_result = manager.generate_comprehend_report(
    report_type='comprehensive',
    time_range_days=30
)

if report_result['success']:
    report = report_result['comprehend_report']
    
    print(f"Comprehend Report")
    print(f"Report type: {report['report_metadata']['report_type']}")
    print(f"Generated at: {report['report_metadata']['generated_at']}")
    
    if 'usage_statistics' in report:
        usage = report['usage_statistics']
        print(f"Total API calls: {usage['total_api_calls']:,}")
        print(f"Total characters: {usage['total_characters_processed']:,}")
        print(f"Batch jobs: {usage['batch_jobs']}")
        print(f"Custom models: {usage['custom_models']}")
    
    if 'performance_metrics' in report:
        performance = report['performance_metrics']
        print(f"Average response time: {performance['average_response_time']} seconds")
        print(f"Success rate: {performance['success_rate']}%")
        print(f"Accuracy rate: {performance['accuracy_rate']}%")
    
    if 'model_analysis' in report:
        models = report['model_analysis']
        print(f"Pretrained models: {list(models['pretrained_models'].keys())}")
        print(f"Custom models: {[m['name'] for m in models['custom_models']]}")
    
    if 'recommendations' in report:
        recommendations = report['recommendations']
        print(f"Recommendations: {len(recommendations)}")
        for rec in recommendations:
            print(f"  - {rec['title']} ({rec['priority']})")
```

## Configuración con AWS CLI

### **Análisis de Texto**
```bash
# Detectar idioma dominante
aws comprehend detect-dominant-language \
  --text "Hello, how are you today?"

# Detectar entidades
aws comprehend detect-entities \
  --text "John works at Amazon in Seattle" \
  --language-code en

# Extraer frases clave
aws comprehend detect-key-phrases \
  --text "Natural language processing is a subfield of linguistics" \
  --language-code en

# Analizar sentimientos
aws comprehend detect-sentiment \
  --text "I love this product, it's amazing!" \
  --language-code en

# Detectar temas
aws comprehend detect-topics \
  --text "The weather is nice today. I'm going for a walk in the park." \
  --language-code en
```

### **Operaciones por Lotes**
```bash
# Iniciar detección de entidades por lotes
aws comprehend start-entities-detection-job \
  --input-s3-uri s3://my-bucket/input/ \
  --input-format ONE_DOC_PER_FILE \
  --output-s3-uri s3://my-bucket/output/ \
  --data-access-role-arn arn:aws:iam::123456789012:role/ComprehendDataAccess \
  --language-code en

# Iniciar extracción de frases clave por lotes
aws comprehend start-key-phrases-detection-job \
  --input-s3-uri s3://my-bucket/input/ \
  --input-format ONE_DOC_PER_FILE \
  --output-s3-uri s3://my-bucket/output/ \
  --data-access-role-arn arn:aws:iam::123456789012:role/ComprehendDataAccess \
  --language-code en

# Iniciar análisis de sentimientos por lotes
aws comprehend start-sentiment-detection-job \
  --input-s3-uri s3://my-bucket/input/ \
  --input-format ONE_DOC_PER_FILE \
  --output-s3-uri s3://my-bucket/output/ \
  --data-access-role-arn arn:aws:iam::123456789012:role/ComprehendDataAccess \
  --language-code en

# Obtener estado del trabajo
aws comprehend describe-entities-detection-job \
  --job-id job-id

# Listar trabajos
aws comprehend list-entities-detection-jobs \
  --status COMPLETED \
  --max-results 50
```

### **Modelos Personalizados**
```bash
# Crear reconocedor de entidades
aws comprehend create-entity-recognizer \
  --recognizer-name custom-recognizer \
  --data-access-role-arn arn:aws:iam::123456789012:role/ComprehendDataAccess \
  --recognizer-definition file://recognizer-definition.json \
  --language-code en

# Describir reconocedor
aws comprehend describe-entity-recognizer \
  --recognizer-arn arn:aws:comprehend:region:account-id:entity-recognizer/custom-recognizer

# Crear endpoint
aws comprehend create-endpoint \
  --endpoint-name custom-endpoint \
  --model-arn arn:aws:comprehend:region:account-id:entity-recognizer/custom-recognizer \
  --desired-inference-units 1 \
  --language-code en

# Describir endpoint
aws comprehend describe-endpoint \
  --endpoint-arn arn:aws:comprehend:region:account-id:endpoint/custom-endpoint

# Eliminar endpoint
aws comprehend delete-endpoint \
  --endpoint-arn arn:aws:comprehend:region:account-id:endpoint/custom-endpoint
```

## Mejores Prácticas

### **1. Optimización de Texto**
- Preprocesar texto para mejorar calidad
- Usar texto en formato limpio y estructurado
- Evitar caracteres especiales y formato complejo
- Considerar longitud óptima para análisis

### **2. Selección de Idioma**
- Detectar automáticamente el idioma del texto
- Usar códigos de idioma correctos
- Considerar dialectos y variaciones regionales
- Validar soporte para idiomas específicos

### **3. Uso de Modelos Personalizados**
- Entrenar modelos con datos de dominio específicos
- Usar suficientes datos de entrenamiento
- Validar calidad del modelo antes del despliegue
- Monitorear rendimiento del modelo personalizado

### **4. Procesamiento Eficiente**
- Usar procesamiento por lotes para grandes volúmenes
- Optimizar tamaños de lote para mejor rendimiento
- Implementar paralelización cuando sea posible
- Monitorear costos y optimizar procesamiento

## Costos

### **Precios de AWS Comprehend**
- **API Calls**: $0.0001 por 100 caracteres (mínimo $0.01)
- **Batch Processing**: $0.0001 por 100 caracteres (mínimo $0.01)
- **Custom Models**: $2.00 por hora de entrenamiento
- **Endpoints**: $0.60 por hora por endpoint
- **Custom Entities**: $1.00 por hora de entrenamiento

### **Ejemplo de Costos Mensuales**
- **API Calls**: 10M caracteres × $0.0001 = $1.00
- **Batch Processing**: 50M caracteres × $0.0001 = $5.00
- **Custom Models**: 100 horas × $2.00 = $200.00
- **Endpoints**: 5 endpoints × $0.60 × 730 horas = $2,190.00
- **Total estimado**: ~$2,396.00 por mes

## Troubleshooting

### **Problemas Comunes**
1. **Baja precisión**: Usar modelos personalizados para dominio específico
2. **Tiempo de respuesta alto**: Optimizar tamaño de texto y usar procesamiento por lotes
3. **Costos elevados**: Optimizar tamaños de lote y procesamiento
4. **Errores de idioma**: Validar códigos de idioma y soporte

### **Comandos de Diagnóstico**
```bash
# Verificar estado del trabajo
aws comprehend describe-entities-detection-job --job-id job-id

# Verificar endpoint
aws comprehend describe-endpoint --endpoint-arn endpoint-arn

# Verificar modelo personalizado
aws comprehend describe-entity-recognizer --recognizer-arn recognizer-arn

# Verificar logs de Lambda
aws logs tail /aws/lambda/comprehend-monitor --follow
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
- **Procesamiento**: Procesamiento automatizado de texto
- **Eventos**: Respuesta a eventos de Comprehend
- **Transformación**: Transformación de datos
- **Validación**: Validación y enriquecimiento de datos

### **AWS S3**
- **Almacenamiento**: Almacenamiento de documentos de entrada/salida
- **Eventos**: Eventos S3 para procesamiento automático
- **Versioning**: Control de versiones de documentos
- **Lifecycle**: Gestión de ciclo de vida de datos

### **AWS Glue**
- **ETL**: Integración con pipelines de ETL
- **Transformación**: Transformación de datos estructurados
- **Catalog**: Catálogo de datos de texto
- **Jobs**: Trabajos de procesamiento de datos

### **AWS CloudWatch**
- **Monitoreo**: Monitoreo de métricas y rendimiento
- **Alarmas**: Alarmas para eventos críticos
- **Logs**: Almacenamiento de logs de aplicaciones
- **Dashboards**: Visualización de métricas

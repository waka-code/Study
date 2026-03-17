# AWS Polly

## Definición

AWS Polly es un servicio de conversión de texto a voz (TTS) que utiliza tecnologías avanzadas de aprendizaje profundo para sintetizar habla natural a partir de texto. Proporciona voces realistas en múltiples idiomas y dialectos, con soporte para SSML (Speech Synthesis Markup Language) para controlar la prosodia, pronunciación y otros aspectos del habla.

## Características Principales

### **Síntesis de Voz**
- **Voces Neuronales**: Voces de alta calidad basadas en IA
- **Voces Estándar**: Voces tradicionales con buena calidad
- **Múltiples Idiomas**: Soporte para más de 30 idiomas
- **Dialectos Regionales**: Variaciones dialectales específicas
- **Calidad Studio**: Voces optimizadas para producción

### **Control de Síntesis**
- **SSML**: Speech Synthesis Markup Language para control detallado
- **Prosodia**: Control de entonación, ritmo y énfasis
- **Pronunciación**: Control de pronunciación específica
- **Pausas**: Control de pausas y silencios
- **Énfasis**: Control de énfasis en palabras específicas

### **Formatos de Salida**
- **MP3**: Formato comprimido para streaming
- **OGG Vorbis**: Formato abierto de alta calidad
- **PCM**: Formato sin compresión para máxima calidad
- **JSON**: Metadatos y marcas de tiempo
- **Speech Marks**: Marcas de tiempo para sincronización

### **Características Avanzadas**
- **Lexicons**: Diccionarios de pronunciación personalizados
- **Neural Engine**: Motor de síntesis neuronal
- **Long-Form Synthesis**: Síntesis de textos largos
- **Parallel Batch**: Procesamiento paralelo por lotes
- **Real-time Streaming**: Síntesis en tiempo real

## Tipos de Operaciones

### **1. Operaciones de Síntesis**
- **SynthesizeSpeech**: Síntesis básica de texto a voz
- **StartSpeechSynthesisTask**: Iniciar tarea de síntesis asíncrona
- **GetSpeechSynthesisTask**: Obtener estado de tarea de síntesis
- **ListSpeechSynthesisTasks**: Listar tareas de síntesis
- **DeleteSpeechSynthesisTask**: Eliminar tarea de síntesis

### **2. Operaciones de Lexicons**
- **CreateLexicon**: Crear diccionario de pronunciación
- **GetLexicon**: Obtener detalles de lexicon
- **ListLexicons**: Listar lexicons disponibles
- **UpdateLexicon**: Actualizar lexicon existente
- **DeleteLexicon**: Eliminar lexicon

### **3. Operaciones de Voz**
- **DescribeVoices**: Describir voces disponibles
- **ListVoices**: Listar voces por idioma o región
- **GetLexicon**: Obtener información de pronunciación
- **Engine Selection**: Selección entre motores estándar y neuronal

### **4. Operaciones de Configuración**
- **PutLexicon**: Subir o actualizar lexicon
- **GetSpeechSynthesisTask**: Obtener detalles de tarea
- **StartSpeechSynthesisTask**: Iniciar síntesis asíncrona
- **DeleteSpeechSynthesisTask**: Eliminar tarea completada

## Arquitectura de AWS Polly

### **Componentes Principales**
```
AWS Polly Architecture
├── Input Layer
│   ├── Text Input
│   ├── SSML Input
│   ├── Batch Processing
│   ├── Real-time Processing
│   └── Format Validation
├── Synthesis Engine
│   ├── Neural Engine
│   ├── Standard Engine
│   ├── Voice Models
│   ├── Language Models
│   └── Lexicon Integration
├── Processing Layer
│   ├── Text Analysis
│   ├── Linguistic Processing
│   ├── Prosody Generation
│   ├── Audio Synthesis
│   └── Quality Enhancement
├── Output Layer
│   ├── Audio Generation
│   ├── Format Conversion
│   ├── Metadata Generation
│   ├── Speech Marks
│   └── Quality Control
└── API Layer
    ├── REST APIs
    ├── WebSocket APIs
    ├── SDK Support
    ├── Integration APIs
    └── Event Notifications
```

### **Flujo de Procesamiento**
```
Text Input → Linguistic Analysis → Prosody Generation → Audio Synthesis → Format Conversion → Output
```

## Configuración de AWS Polly

### **Gestión Completa de AWS Polly**
```python
import boto3
import json
import time
import base64
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import urllib.request

class PollyManager:
    def __init__(self, region='us-east-1'):
        self.polly = boto3.client('polly', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.lambda_client = boto3.client('lambda', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.region = region
    
    def synthesize_speech(self, text, output_format='mp3', voice_id='Joanna',
                         engine='neural', sample_rate='22050', language_code=None,
                         lexicon_names=None, speech_mark_types=None):
        """Sintetizar texto a voz"""
        
        try:
            params = {
                'Text': text,
                'OutputFormat': output_format,
                'VoiceId': voice_id,
                'Engine': engine
            }
            
            if sample_rate:
                params['SampleRate'] = sample_rate
            
            if language_code:
                params['LanguageCode'] = language_code
            
            if lexicon_names:
                params['LexiconNames'] = lexicon_names
            
            if speech_mark_types:
                params['SpeechMarkTypes'] = speech_mark_types
            
            response = self.polly.synthesize_speech(**params)
            
            # Guardar audio
            audio_data = response['AudioStream'].read()
            audio_filename = f"polly_output_{int(time.time())}.{output_format}"
            
            with open(audio_filename, 'wb') as audio_file:
                audio_file.write(audio_data)
            
            # Obtener metadatos
            metadata = {
                'content_type': response.get('ContentType', ''),
                'request_characters': len(text),
                'audio_filename': audio_filename,
                'audio_size': len(audio_data),
                'voice_id': voice_id,
                'engine': engine,
                'output_format': output_format
            }
            
            return {
                'success': True,
                'audio_filename': audio_filename,
                'audio_size': len(audio_data),
                'metadata': metadata
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def synthesize_speech_ssml(self, ssml_text, output_format='mp3', voice_id='Joanna',
                               engine='neural', sample_rate='22050', language_code=None,
                               lexicon_names=None, speech_mark_types=None):
        """Sintetizar texto SSML a voz"""
        
        try:
            params = {
                'Text': ssml_text,
                'TextType': 'ssml',
                'OutputFormat': output_format,
                'VoiceId': voice_id,
                'Engine': engine
            }
            
            if sample_rate:
                params['SampleRate'] = sample_rate
            
            if language_code:
                params['LanguageCode'] = language_code
            
            if lexicon_names:
                params['LexiconNames'] = lexicon_names
            
            if speech_mark_types:
                params['SpeechMarkTypes'] = speech_mark_types
            
            response = self.polly.synthesize_speech(**params)
            
            # Guardar audio
            audio_data = response['AudioStream'].read()
            audio_filename = f"polly_ssml_output_{int(time.time())}.{output_format}"
            
            with open(audio_filename, 'wb') as audio_file:
                audio_file.write(audio_data)
            
            # Obtener metadatos
            metadata = {
                'content_type': response.get('ContentType', ''),
                'request_characters': len(ssml_text),
                'audio_filename': audio_filename,
                'audio_size': len(audio_data),
                'voice_id': voice_id,
                'engine': engine,
                'output_format': output_format,
                'text_type': 'ssml'
            }
            
            return {
                'success': True,
                'audio_filename': audio_filename,
                'audio_size': len(audio_data),
                'metadata': metadata
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def start_speech_synthesis_task(self, text, output_format='mp3', voice_id='Joanna',
                                   engine='neural', language_code=None, s3_bucket=None,
                                   s3_key=None, lexicon_names=None, speech_mark_types=None):
        """Iniciar tarea de síntesis asíncrona"""
        
        try:
            params = {
                'Text': text,
                'OutputFormat': output_format,
                'VoiceId': voice_id,
                'Engine': engine
            }
            
            if language_code:
                params['LanguageCode'] = language_code
            
            if s3_bucket and s3_key:
                params['OutputS3BucketName'] = s3_bucket
                params['OutputS3KeyPrefix'] = s3_key
            
            if lexicon_names:
                params['LexiconNames'] = lexicon_names
            
            if speech_mark_types:
                params['SpeechMarkTypes'] = speech_mark_types
            
            response = self.polly.start_speech_synthesis_task(**params)
            
            task = response['SynthesisTask']
            
            return {
                'success': True,
                'task_id': task['TaskId'],
                'task_status': task['TaskStatus'],
                'voice_id': voice_id,
                'engine': engine,
                'output_format': output_format
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_speech_synthesis_task(self, task_id):
        """Obtener estado de tarea de síntesis"""
        
        try:
            response = self.polly.get_speech_synthesis_task(TaskId=task_id)
            
            task = response['SynthesisTask']
            
            task_info = {
                'task_id': task['TaskId'],
                'task_status': task['TaskStatus'],
                'voice_id': task['VoiceId'],
                'engine': task['Engine'],
                'language_code': task.get('LanguageCode', ''),
                'output_format': task['OutputFormat'],
                'sample_rate': task.get('SampleRate', ''),
                'creation_time': task['CreationTime'].isoformat() if task.get('CreationTime') else '',
                'completion_time': task.get('CompletionTime', '').isoformat() if task.get('CompletionTime') else '',
                'request_characters': task.get('RequestCharacters', 0),
                'output_uri': task.get('OutputUri', ''),
                'failure_reason': task.get('FailureReason', '')
            }
            
            return {
                'success': True,
                'task_info': task_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_speech_synthesis_tasks(self, status=None, max_results=100, next_token=None):
        """Listar tareas de síntesis"""
        
        try:
            params = {'MaxResults': max_results}
            
            if status:
                params['Status'] = status
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.polly.list_speech_synthesis_tasks(**params)
            
            tasks = []
            for task in response['SynthesisTasks']:
                task_info = {
                    'task_id': task['TaskId'],
                    'task_status': task['TaskStatus'],
                    'voice_id': task['VoiceId'],
                    'engine': task['Engine'],
                    'creation_time': task['CreationTime'].isoformat() if task.get('CreationTime') else '',
                    'completion_time': task.get('CompletionTime', '').isoformat() if task.get('CompletionTime') else '',
                    'request_characters': task.get('RequestCharacters', 0)
                }
                tasks.append(task_info)
            
            return {
                'success': True,
                'tasks': tasks,
                'count': len(tasks),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_speech_synthesis_task(self, task_id):
        """Eliminar tarea de síntesis"""
        
        try:
            response = self.polly.delete_speech_synthesis_task(TaskId=task_id)
            
            return {
                'success': True,
                'task_id': task_id,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_voices(self, language_code=None, engine=None, include_additional_language_codes=False):
        """Describir voces disponibles"""
        
        try:
            params = {}
            
            if language_code:
                params['LanguageCode'] = language_code
            
            if engine:
                params['Engine'] = engine
            
            if include_additional_language_codes:
                params['IncludeAdditionalLanguageCodes'] = include_additional_language_codes
            
            response = self.polly.describe_voices(**params)
            
            voices = []
            for voice in response['Voices']:
                voice_info = {
                    'id': voice['Id'],
                    'name': voice['Name'],
                    'gender': voice['Gender'],
                    'language_code': voice['LanguageCode'],
                    'language_name': voice['LanguageName'],
                    'engine': voice['SupportedEngines'],
                    'additional_language_codes': voice.get('AdditionalLanguageCodes', [])
                }
                voices.append(voice_info)
            
            return {
                'success': True,
                'voices': voices,
                'count': len(voices)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_lexicon(self, name, content):
        """Crear lexicon de pronunciación"""
        
        try:
            params = {
                'Name': name,
                'Content': content
            }
            
            response = self.polly.put_lexicon(**params)
            
            return {
                'success': True,
                'lexicon_name': name,
                'status': response.get('Lexicon', {}).get('Attributes', {}).get('Status', '')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_lexicon(self, name):
        """Obtener detalles de lexicon"""
        
        try:
            response = self.polly.get_lexicon(Name=name)
            
            lexicon_info = {
                'name': response['Lexicon']['Name'],
                'attributes': response['Lexicon']['Attributes'],
                'content': response['Lexicon']['Content']
            }
            
            return {
                'success': True,
                'lexicon_info': lexicon_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_lexicons(self, next_token=None):
        """Listar lexicons disponibles"""
        
        try:
            params = {}
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.polly.list_lexicons(**params)
            
            lexicons = []
            for lexicon in response['Lexicons']:
                lexicon_info = {
                    'name': lexicon['Name'],
                    'attributes': lexicon['Attributes']
                }
                lexicons.append(lexicon_info)
            
            return {
                'success': True,
                'lexicons': lexicons,
                'count': len(lexicons),
                'next_token': response.get('NextToken')
            }
            
        except Exception e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_lexicon(self, name):
        """Eliminar lexicon"""
        
        try:
            response = self.polly.delete_lexicon(Name=name)
            
            return {
                'success': True,
                'lexicon_name': name,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_ssml_with_controls(self, text, voice_id='Joanna', language_code='en-US',
                                   rate='medium', pitch='medium', volume='medium',
                                   emphasis_level='moderate'):
        """Generar SSML con controles de prosodia"""
        
        try:
            # Construir SSML con controles
            ssml = f'<speak><lang xml:lang="{language_code}">'
            
            # Añadir controles de prosodia
            prosody_attrs = f'rate="{rate}" pitch="{pitch}" volume="{volume}"'
            ssml += f'<prosody {prosody_attrs}>'
            
            # Añadir énfasis si es necesario
            if emphasis_level:
                ssml += f'<emphasis level="{emphasis_level}">{text}</emphasis>'
            else:
                ssml += text
            
            ssml += '</prosody></lang></speak>'
            
            return {
                'success': True,
                'ssml': ssml,
                'original_text': text,
                'controls': {
                    'rate': rate,
                    'pitch': pitch,
                    'volume': volume,
                    'emphasis_level': emphasis_level
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def process_batch_synthesis(self, texts, voice_id='Joanna', engine='neural',
                               output_format='mp3', parallel_tasks=5):
        """Procesar síntesis en batch"""
        
        try:
            batch_results = []
            active_tasks = []
            
            for i, text in enumerate(texts):
                # Crear nombre de tarea único
                task_name = f"batch-task-{int(time.time())}-{i}"
                
                # Iniciar tarea asíncrona
                task_result = self.start_speech_synthesis_task(
                    text=text,
                    output_format=output_format,
                    voice_id=voice_id,
                    engine=engine,
                    s3_bucket='polly-batch-output',
                    s3_key=f'batch/{task_name}'
                )
                
                if task_result['success']:
                    batch_results.append({
                        'task_name': task_name,
                        'text': text[:100] + '...' if len(text) > 100 else text,
                        'task_id': task_result['task_id'],
                        'status': 'STARTED',
                        'result': None
                    })
                    active_tasks.append(task_result['task_id'])
                
                # Limitar tareas paralelas
                if len(active_tasks) >= parallel_tasks:
                    # Esperar a que una tarea termine
                    self._wait_for_task_completion(active_tasks[0])
                    active_tasks.pop(0)
            
            # Esperar a que todas las tareas terminen
            for task_id in active_tasks:
                self._wait_for_task_completion(task_id)
            
            # Obtener resultados
            for result in batch_results:
                task_result = self.get_speech_synthesis_task(result['task_id'])
                if task_result['success']:
                    result['status'] = task_result['task_info']['task_status']
                    result['result'] = task_result['task_info']
            
            # Generar resumen del batch
            batch_summary = self._generate_batch_summary(batch_results)
            
            return {
                'success': True,
                'batch_results': batch_results,
                'batch_summary': batch_summary,
                'total_texts': len(texts)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _wait_for_task_completion(self, task_id, timeout=3600):
        """Esperar a que una tarea termine"""
        
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            task_result = self.get_speech_synthesis_task(task_id)
            
            if task_result['success']:
                status = task_result['task_info']['task_status']
                if status in ['completed', 'failed']:
                    return task_result
            
            time.sleep(10)  # Esperar 10 segundos
        
        return {'success': False, 'error': 'Task timeout'}
    
    def _generate_batch_summary(self, batch_results):
        """Generar resumen de procesamiento batch"""
        
        summary = {
            'total_tasks': len(batch_results),
            'completed_tasks': 0,
            'failed_tasks': 0,
            'in_progress_tasks': 0,
            'average_processing_time': 0,
            'total_characters_processed': 0,
            'average_text_length': 0,
            'voice_usage': {},
            'engine_usage': {}
        }
        
        processing_times = []
        text_lengths = []
        
        for result in batch_results:
            status = result.get('status', 'UNKNOWN')
            
            if status == 'completed':
                summary['completed_tasks'] += 1
                
                # Analizar resultado si está disponible
                if result.get('result'):
                    task_info = result['result']
                    
                    # Contar caracteres procesados
                    characters = task_info.get('request_characters', 0)
                    summary['total_characters_processed'] += characters
                    
                    # Calcular tiempo de procesamiento
                    if task_info.get('creation_time') and task_info.get('completion_time'):
                        creation = datetime.fromisoformat(task_info['creation_time'].replace('Z', '+00:00'))
                        completion = datetime.fromisoformat(task_info['completion_time'].replace('Z', '+00:00'))
                        processing_time = (completion - creation).total_seconds()
                        processing_times.append(processing_time)
                    
                    # Contar uso de voz y motor
                    voice_id = task_info.get('voice_id', '')
                    engine = task_info.get('engine', '')
                    
                    if voice_id:
                        summary['voice_usage'][voice_id] = summary['voice_usage'].get(voice_id, 0) + 1
                    
                    if engine:
                        summary['engine_usage'][engine] = summary['engine_usage'].get(engine, 0) + 1
                
                # Longitud del texto
                text_length = len(result.get('text', ''))
                text_lengths.append(text_length)
            
            elif status == 'failed':
                summary['failed_tasks'] += 1
            elif status in ['queued', 'in_progress']:
                summary['in_progress_tasks'] += 1
        
        # Calcular promedios
        if processing_times:
            summary['average_processing_time'] = sum(processing_times) / len(processing_times)
        
        if text_lengths:
            summary['average_text_length'] = sum(text_lengths) / len(text_lengths)
        
        return summary
    
    def create_polly_monitoring(self, sns_topic_arn=None):
        """Configurar monitoreo de Polly"""
        
        try:
            monitoring_setup = {
                'sns_topic_arn': None,
                'lambda_functions': [],
                'cloudwatch_alarms': [],
                'automated_responses': []
            }
            
            # Crear o usar SNS topic
            if sns_topic_arn:
                monitoring_setup['sns_topic_arn'] = sns_topic_arn
            else:
                topic_response = self.sns.create_topic(
                    Name='polly-alerts',
                    Tags=[
                        {'Key': 'Service', 'Value': 'Polly'},
                        {'Key': 'Purpose', 'Value': 'Monitoring'}
                    ]
                )
                monitoring_setup['sns_topic_arn'] = topic_response['TopicArn']
            
            # Crear función Lambda para monitoreo
            lambda_result = self.create_polly_monitoring_lambda()
            if lambda_result['success']:
                monitoring_setup['lambda_functions'].append(lambda_result['function_arn'])
            
            # Configurar alarmas de CloudWatch
            alarm_result = self.setup_polly_alarms(monitoring_setup['sns_topic_arn'])
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
    
    def create_polly_monitoring_lambda(self):
        """Crear función Lambda para monitoreo de Polly"""
        
        try:
            lambda_code = self._get_polly_lambda_code()
            
            # Crear rol de ejecución
            role_arn = self._create_lambda_execution_role('polly-monitoring-role')
            
            # Crear función Lambda
            response = self.lambda_client.create_function(
                FunctionName='polly-monitor',
                Runtime='python3.9',
                Role=role_arn,
                Handler='lambda_function.lambda_handler',
                Code={
                    'ZipFile': lambda_code
                },
                Description='Lambda function for Polly monitoring',
                Timeout=300,
                Environment={
                    'Variables': {
                        'SNS_TOPIC_ARN': f'arn:aws:sns:{self.region}:123456789012:polly-alerts'
                    }
                },
                Tags={
                    'Service': 'Polly',
                    'Purpose': 'Monitoring'
                }
            )
            
            return {
                'success': True,
                'function_name': 'polly-monitor',
                'function_arn': response['FunctionArn'],
                'role_arn': role_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_polly_lambda_code(self):
        """Obtener código de Lambda para monitoreo de Polly"""
        
        return '''
import json
import boto3
import os
from datetime import datetime

def lambda_handler(event, context):
    sns = boto3.client('sns')
    polly = boto3.client('polly')
    
    sns_topic_arn = os.environ['SNS_TOPIC_ARN']
    
    # Analizar evento de Polly
    event_analysis = analyze_polly_event(event)
    
    if event_analysis['requires_attention']:
        # Enviar alerta
        alert = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': 'POLLY_ALERT',
            'task_id': event_analysis['task_id'],
            'task_status': event_analysis['task_status'],
            'voice_id': event_analysis['voice_id'],
            'engine': event_analysis['engine'],
            'risk_level': event_analysis['risk_level'],
            'recommendations': event_analysis['recommendations']
        }
        
        sns.publish(
            TopicArn=sns_topic_arn,
            Subject=f'Polly Alert: {event_analysis["task_id"]}',
            Message=json.dumps(alert),
            MessageStructure='string'
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Polly alert sent',
                'task_id': event_analysis['task_id'],
                'risk_level': event_analysis['risk_level']
            })
        }
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'No action required'})
    }

def analyze_polly_event(event):
    """Analizar evento de Polly"""
    
    analysis = {
        'requires_attention': False,
        'task_id': '',
        'task_status': 'UNKNOWN',
        'voice_id': '',
        'engine': '',
        'risk_level': 'LOW',
        'recommendations': []
    }
    
    # Simular análisis de evento
    if 'detail-type' in event:
        detail_type = event['detail-type']
        
        if detail_type == 'Polly Task Status Change':
            detail = event.get('detail', {})
            analysis['task_id'] = detail.get('TaskId', '')
            analysis['task_status'] = detail.get('TaskStatus', '')
            analysis['voice_id'] = detail.get('VoiceId', '')
            analysis['engine'] = detail.get('Engine', '')
            
            # Determinar si requiere atención
            if analysis['task_status'] == 'FAILED':
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'HIGH'
                analysis['recommendations'].append(f'Investigate task failure: {detail.get("FailureReason", "Unknown")}')
            elif analysis['task_status'] == 'COMPLETED':
                # Verificar si hay problemas de calidad
                characters = detail.get('RequestCharacters', 0)
                if characters > 10000:  # Texto muy largo
                    analysis['requires_attention'] = True
                    analysis['risk_level'] = 'MEDIUM'
                    analysis['recommendations'].append('Consider breaking long texts into smaller chunks')
    
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
                Description='Execution role for Polly monitoring Lambda',
                Tags=[
                    {'Key': 'Service', 'Value': 'Lambda'},
                    {'Key': 'Purpose', 'Value': 'PollyMonitoring'}
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
    
    def setup_polly_alarms(self, sns_topic_arn):
        """Configurar alarmas de CloudWatch para Polly"""
        
        try:
            alarms_created = []
            
            # Alarma para tareas fallidas
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='Polly-FailedTasks',
                    AlarmDescription='Failed Polly synthesis tasks detected',
                    Namespace='AWS/Polly',
                    MetricName='FailedTasks',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('Polly-FailedTasks')
            except Exception:
                pass
            
            # Alarma para uso alto de caracteres
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='Polly-HighCharacterUsage',
                    AlarmDescription='High character usage detected',
                    Namespace='AWS/Polly',
                    MetricName='CharacterUsage',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=100000,
                    ComparisonOperator='GreaterThanThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('Polly-HighCharacterUsage')
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
    
    def generate_polly_report(self, report_type='comprehensive', time_range_days=30):
        """Generar reporte de Polly"""
        
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
                report['voice_analysis'] = self._get_voice_analysis()
                report['recommendations'] = self._generate_comprehensive_recommendations()
            
            elif report_type == 'usage':
                # Reporte de uso
                report['usage_analysis'] = {
                    'synthesis_tasks': self._get_synthesis_task_stats(),
                    'voice_usage': self._get_voice_usage_stats(),
                    'engine_usage': self._get_engine_usage_stats(),
                    'language_usage': self._get_language_usage_stats()
                }
            
            elif report_type == 'quality':
                # Reporte de calidad
                report['quality_assessment'] = {
                    'voice_quality': self._get_voice_quality_stats(),
                    'engine_performance': self._get_engine_performance_stats(),
                    'user_satisfaction': self._get_user_satisfaction_stats(),
                    'quality_trends': self._get_quality_trends()
                }
            
            elif report_type == 'cost':
                # Reporte de costos
                report['cost_breakdown'] = {
                    'synthesis_costs': self._get_synthesis_costs(),
                    'storage_costs': self._get_storage_costs(),
                    'lexicon_costs': self._get_lexicon_costs(),
                    'total_cost': self._calculate_total_cost()
                }
            
            return {
                'success': True,
                'polly_report': report
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
            'total_synthesis_tasks': 25000,
            'completed_tasks': 24250,
            'failed_tasks': 250,
            'total_characters_processed': 12500000,
            'average_characters_per_task': 500,
            'total_audio_hours': 3500,
            'voices_used': 15,
            'lexicons_created': 8,
            'engines_used': ['neural', 'standard']
        }
    
    def _get_performance_metrics(self):
        """Obtener métricas de rendimiento"""
        
        return {
            'average_processing_time': 0.8,  # segundos por 1000 caracteres
            'throughput': 1250,  # caracteres por segundo
            'success_rate': 97.0,  # porcentaje
            'average_response_time': 0.5,  # segundos
            'audio_quality_score': 94.5,  # porcentaje
            'uptime': 99.95  # porcentaje
        }
    
    def _get_cost_analysis(self):
        """Obtener análisis de costos"""
        
        return {
            'monthly_cost': 1250.00,
            'cost_breakdown': {
                'neural_voices': 875.00,
                'standard_voices': 250.00,
                'lexicons': 75.00,
                'storage': 50.00
            },
            'cost_trend': 'INCREASING',
            'cost_optimization_potential': 15.0  # porcentaje
        }
    
    def _get_voice_analysis(self):
        """Obtener análisis de voces"""
        
        return {
            'most_used_voices': [
                {'voice_id': 'Joanna', 'usage_percentage': 35.2},
                {'voice_id': 'Matthew', 'usage_percentage': 28.5},
                {'voice_id': 'Kimberly', 'usage_percentage': 15.8},
                {'voice_id': 'Joey', 'usage_percentage': 12.3},
                {'voice_id': 'Justin', 'usage_percentage': 8.2}
            ],
            'voice_satisfaction': {
                'neural_voices': 94.5,
                'standard_voices': 87.2
            },
            'language_distribution': {
                'en-US': 65.3,
                'en-GB': 15.2,
                'es-US': 8.5,
                'fr-FR': 6.8,
                'de-DE': 4.2
            }
        }
    
    def _generate_comprehensive_recommendations(self):
        """Generar recomendaciones comprehensivas"""
        
        recommendations = [
            {
                'priority': 'HIGH',
                'category': 'COST',
                'title': 'Optimize voice selection',
                'description': 'Use standard voices for non-critical applications to reduce costs',
                'action': 'Implement voice selection strategy based on use case'
            },
            {
                'priority': 'MEDIUM',
                'category': 'PERFORMANCE',
                'title': 'Implement caching',
                'description': 'Cache frequently used audio to reduce API calls',
                'action': 'Implement audio caching strategy for repeated content'
            },
            {
                'priority': 'LOW',
                'category': 'QUALITY',
                'title': 'Expand lexicon usage',
                'description': 'Create more lexicons for domain-specific terminology',
                'action': 'Develop lexicons for specific domains and industries'
            }
        ]
        
        return recommendations
```

## Casos de Uso

### **1. Síntesis Básica**
```python
# Ejemplo: Síntesis básica de texto a voz
manager = PollyManager('us-east-1')

# Sintetizar texto simple
result = manager.synthesize_speech(
    text="Hello, this is a test of AWS Polly text-to-speech service.",
    voice_id='Joanna',
    engine='neural',
    output_format='mp3'
)

if result['success']:
    print(f"Audio generated: {result['audio_filename']}")
    print(f"Audio size: {result['audio_size']} bytes")
    print(f"Voice: {result['metadata']['voice_id']}")
    print(f"Engine: {result['metadata']['engine']}")
```

### **2. Síntesis con SSML**
```python
# Ejemplo: Síntesis con control SSML
ssml_text = """
<speak>
    <lang xml:lang="en-US">
        <prosody rate="medium" pitch="medium" volume="medium">
            Welcome to our <emphasis level="moderate">amazing</emphasis> service!
            <break time="1s"/>
            We are excited to <emphasis level="strong">show you</emphasis> what we can do.
        </prosody>
    </lang>
</speak>
"""

result = manager.synthesize_speech_ssml(
    ssml_text=ssml_text,
    voice_id='Joanna',
    engine='neural',
    output_format='mp3'
)

if result['success']:
    print(f"SSML audio generated: {result['audio_filename']}")
    print(f"Text type: {result['metadata']['text_type']}")
```

### **3. Tarea Asíncrona**
```python
# Ejemplo: Síntesis asíncrona para texto largo
long_text = """
This is a very long text that would benefit from asynchronous processing...
""" * 100  # Texto largo

task_result = manager.start_speech_synthesis_task(
    text=long_text,
    voice_id='Joanna',
    engine='neural',
    output_format='mp3',
    s3_bucket='my-polly-output',
    s3_key='long-text-audio'
)

if task_result['success']:
    print(f"Task started: {task_result['task_id']}")
    
    # Esperar y verificar estado
    import time
    time.sleep(30)  # Esperar a que se complete
    
    task_info = manager.get_speech_synthesis_task(task_result['task_id'])
    if task_info['success']:
        info = task_info['task_info']
        print(f"Task status: {info['task_status']}")
        print(f"Characters processed: {info['request_characters']}")
        if info['output_uri']:
            print(f"Output URI: {info['output_uri']}")
```

### **4. Gestión de Lexicons**
```python
# Ejemplo: Crear y usar lexicon
lexicon_content = """
<?xml version="1.0" encoding="UTF-8"?>
<lexicon version="1.0" 
          xmlns="" 
          xml:lang="en-US" 
          alphabet="ipa">
    <lexeme>
        <grapheme>Polly</grapheme>
        <phoneme>Pɑli</phoneme>
    </lexeme>
    <lexeme>
        <grapheme>AWS</grapheme>
        <phoneme>eɪ dʌbəlju ɛs</phoneme>
    </lexeme>
</lexicon>
"""

# Crear lexicon
lexicon_result = manager.create_lexicon(
    name='tech-terms',
    content=lexicon_content
)

if lexicon_result['success']:
    print(f"Lexicon created: tech-terms")
    
    # Usar lexicon en síntesis
    result = manager.synthesize_speech(
        text="Welcome to AWS Polly, the amazing text-to-speech service.",
        voice_id='Joanna',
        engine='neural',
        lexicon_names=['tech-terms']
    )
    
    if result['success']:
        print(f"Audio with custom pronunciation: {result['audio_filename']}")
```

### **5. Exploración de Voces**
```python
# Ejemplo: Explorar voces disponibles
voices_result = manager.describe_voices(
    language_code='en-US',
    engine='neural'
)

if voices_result['success']:
    print(f"Available voices: {voices_result['count']}")
    
    for voice in voices_result['voices']:
        print(f"Voice: {voice['name']} ({voice['id']})")
        print(f"  Gender: {voice['gender']}")
        print(f"  Language: {voice['language_name']} ({voice['language_code']})")
        print(f"  Engines: {', '.join(voice['engine'])}")
        print()
```

### **6. Procesamiento Batch**
```python
# Ejemplo: Procesamiento batch de múltiples textos
texts = [
    "Welcome to our service!",
    "Thank you for choosing us.",
    "We appreciate your business.",
    "How can we help you today?",
    "Please contact support if needed."
]

batch_result = manager.process_batch_synthesis(
    texts=texts,
    voice_id='Joanna',
    engine='neural',
    output_format='mp3',
    parallel_tasks=3
)

if batch_result['success']:
    summary = batch_result['batch_summary']
    print(f"Batch Processing Summary")
    print(f"Total tasks: {summary['total_tasks']}")
    print(f"Completed: {summary['completed_tasks']}")
    print(f"Failed: {summary['failed_tasks']}")
    print(f"Total characters: {summary['total_characters_processed']}")
    print(f"Average text length: {summary['average_text_length']:.1f}")
    
    # Uso de voces
    print(f"Voice usage: {summary['voice_usage']}")
    print(f"Engine usage: {summary['engine_usage']}")
```

### **7. SSML con Controles Avanzados**
```python
# Ejemplo: Generar SSML con controles avanzados
text = "This is an important announcement that requires your attention."

ssml_result = manager.generate_ssml_with_controls(
    text=text,
    voice_id='Joanna',
    language_code='en-US',
    rate='slow',
    pitch='high',
    volume='loud',
    emphasis_level='strong'
)

if ssml_result['success']:
    print(f"Generated SSML:")
    print(ssml_result['ssml'])
    
    # Sintetizar con SSML generado
    result = manager.synthesize_speech_ssml(
        ssml_text=ssml_result['ssml'],
        voice_id='Joanna',
        engine='neural'
    )
    
    if result['success']:
        print(f"Controlled audio generated: {result['audio_filename']}")
```

### **8. Configuración de Monitoreo**
```python
# Ejemplo: Configurar monitoreo
monitoring_result = manager.create_polly_monitoring()

if monitoring_result['success']:
    setup = monitoring_result['monitoring_setup']
    print(f"Polly monitoring configured")
    print(f"SNS Topic: {setup['sns_topic_arn']}")
    print(f"Lambda functions: {len(setup['lambda_functions'])}")
    print(f"CloudWatch alarms: {len(setup['cloudwatch_alarms'])}")
```

## Configuración con AWS CLI

### **Síntesis de Voz**
```bash
# Síntesis básica
aws polly synthesize-speech \
  --text "Hello, this is AWS Polly." \
  --output-format mp3 \
  --voice-id Joanna \
  --engine neural \
  output.mp3

# Síntesis con SSML
aws polly synthesize-speech \
  --text "<speak><emphasis level=\"strong\">Hello</emphasis> world!</speak>" \
  --text-type ssml \
  --output-format mp3 \
  --voice-id Joanna \
  --engine neural \
  output.mp3

# Síntesis con lexicon
aws polly synthesize-speech \
  --text "Welcome to AWS Polly." \
  --output-format mp3 \
  --voice-id Joanna \
  --lexicon-names tech-terms \
  output.mp3
```

### **Tareas Asíncronas**
```bash
# Iniciar tarea asíncrona
aws polly start-speech-synthesis-task \
  --text "This is a long text for async processing." \
  --output-format mp3 \
  --voice-id Joanna \
  --engine neural \
  --output-s3-bucket-name my-polly-output \
  --output-s3-key-prefix async/

# Obtener estado de tarea
aws polly get-speech-synthesis-task \
  --task-id task-id

# Listar tareas
aws polly list-speech-synthesis-tasks \
  --status completed \
  --max-results 50

# Eliminar tarea
aws polly delete-speech-synthesis-task \
  --task-id task-id
```

### **Lexicons**
```bash
# Crear lexicon
aws polly put-lexicon \
  --name tech-terms \
  --content file://lexicon.xml

# Obtener lexicon
aws polly get-lexicon \
  --name tech-terms

# Listar lexicons
aws polly list-lexicons

# Eliminar lexicon
aws polly delete-lexicon \
  --name tech-terms
```

### **Voces**
```bash
# Describir todas las voces
aws polly describe-voices

# Describir voces por idioma
aws polly describe-voices \
  --language-code en-US \
  --engine neural

# Describir voces con códigos adicionales
aws polly describe-voices \
  --include-additional-language-codes
```

## Mejores Prácticas

### **1. Optimización de Texto**
- Usar puntuación apropiada para pausas naturales
- Evitar abreviaturas y acrónimos sin definición
- Usar SSML para control preciso de prosodia
- Dividir textos largos en segmentos manejables

### **2. Selección de Voz**
- Elegir voces neuronales para mayor naturalidad
- Considerar el idioma y dialecto del público objetivo
- Probar múltiples voces para encontrar la mejor opción
- Usar voces estándar para aplicaciones de bajo costo

### **3. Control de Calidad**
- Usar SSML para controlar ritmo y entonación
- Implementar lexicons para términos específicos
- Probar audio generado antes de producción
- Considerar el contexto de uso

### **4. Gestión de Costos**
- Usar caché para contenido repetido
- Elegir el motor apropiado (estándar vs neuronal)
- Optimizar longitud de textos
- Monitorear uso de caracteres

## Costos

### **Precios de AWS Polly**
- **Voces Neuronales**: $4.00 por 1M caracteres
- **Voces Estándar**: $4.00 por 1M caracteres
- **Voces de Larga Duración**: $15.00 por 1M caracteres
- **Lexicons**: GRATIS
- **Almacenamiento**: Costos estándar de S3

### **Ejemplo de Costos Mensuales**
- **1M caracteres (neural)**: 1 × $4.00 = $4.00
- **500K caracteres (standard)**: 0.5 × $4.00 = $2.00
- **100K caracteres (long-form)**: 0.1 × $15.00 = $1.50
- **Storage**: $5.00
- **Total estimado**: ~$12.50 por mes

## Troubleshooting

### **Problemas Comunes**
1. **Calidad de audio baja**: Usar voces neuronales o mejorar SSML
2. **Pronunciación incorrecta**: Crear lexicons personalizados
3. **Costos elevados**: Optimizar uso y cachear contenido
4. **Errores de SSML**: Validar sintaxis de SSML

### **Comandos de Diagnóstico**
```bash
# Verificar estado de tarea
aws polly get-speech-synthesis-task --task-id task-id

# Verificar lexicon
aws polly get-lexicon --name lexicon-name

# Verificar voces disponibles
aws polly describe-voices --engine neural

# Verificar logs de Lambda
aws logs tail /aws/lambda/polly-monitor --follow
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

### **AWS S3**
- **Almacenamiento**: Almacenamiento de archivos de audio
- **Eventos**: Eventos S3 para procesamiento automático
- **Versioning**: Control de versiones de archivos
- **Lifecycle**: Gestión de ciclo de vida de datos

### **AWS Lambda**
- **Procesamiento**: Procesamiento automático de texto
- **Eventos**: Respuesta a eventos de Polly
- **Transformación**: Transformación de datos
- **Integración**: Integración con otros servicios

### **AWS SNS**
- **Notificaciones**: Notificaciones de estado de tareas
- **Alertas**: Alertas de errores o problemas
- **Eventos**: Eventos de finalización de síntesis
- **Comunicación**: Comunicación entre servicios

### **AWS CloudWatch**
- **Monitoreo**: Monitoreo de métricas y rendimiento
- **Alarmas**: Alarmas para eventos críticos
- **Logs**: Almacenamiento de logs de aplicaciones
- **Dashboards**: Visualización de métricas

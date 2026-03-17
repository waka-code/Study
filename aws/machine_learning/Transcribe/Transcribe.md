# AWS Transcribe

## Definición

AWS Transcribe es un servicio de reconocimiento automático de voz (ASR) que convierte audio en texto transcripción. Utiliza tecnologías avanzadas de machine learning para proporcionar transcripciones precisas de audio en múltiples idiomas y dialectos, con soporte para diferentes formatos de audio y capacidades de identificación de hablantes.

## Características Principales

### **Transcripción de Audio**
- **Reconocimiento de voz**: Conversión precisa de audio a texto
- **Múltiples idiomas**: Soporte para más de 30 idiomas
- **Dialectos regionales**: Reconocimiento de variaciones dialectales
- **Formatos múltiples**: Soporte para WAV, MP3, FLAC, OGG, WebM
- **Calidad variable**: Optimización para diferentes calidades de audio

### **Identificación de Hablantes**
- **Speaker Diarization**: Identificación y separación de hablantes
- **Speaker Count**: Detección automática del número de hablantes
- **Speaker Labels**: Etiquetado de cada hablante identificado
- **Speaker Confidence**: Puntuación de confianza por hablante
- **Speaker Segmentation**: Segmentación por hablante

### **Transcripción Especializada**
- **Medical Transcribe**: Transcripción especializada médica
- **Call Analytics**: Análisis de llamadas con conversaciones
- **Custom Vocabulary**: Vocabulario personalizado
- **Custom Language Models**: Modelos de lenguaje adaptados
- **Content Redaction**: Redacción de contenido sensible

### **Procesamiento por Lotes y Streaming**
- **Batch Transcription**: Procesamiento por lotes de archivos
- **Streaming Transcription**: Transcripción en tiempo real
- **Real-time Processing**: Procesamiento en vivo
- **Asynchronous Processing**: Procesamiento asíncrono
- **Queue Management**: Gestión de colas de procesamiento

## Tipos de Operaciones

### **1. Operaciones de Transcripción por Lotes**
- **StartTranscriptionJob**: Iniciar trabajo de transcripción
- **GetTranscriptionJob**: Obtener estado del trabajo
- **ListTranscriptionJobs**: Listar trabajos de transcripción
- **DeleteTranscriptionJob**: Eliminar trabajo de transcripción
- **UpdateMedicalVocabulary**: Actualizar vocabulario médico

### **2. Operaciones de Streaming**
- **StartStreamTranscription**: Iniciar transcripción de stream
- **StartMedicalStreamTranscription**: Iniciar transcripción médica
- **Real-time Processing**: Procesamiento en tiempo real
- **WebSocket Connection**: Conexión WebSocket para streaming

### **3. Operaciones de Vocabulario**
- **CreateVocabulary**: Crear vocabulario personalizado
- **GetVocabulary**: Obtener detalles de vocabulario
- **ListVocabularies**: Listar vocabularios
- **UpdateVocabulary**: Actualizar vocabulario
- **DeleteVocabulary**: Eliminar vocabulario

### **4. Operaciones de Modelos de Lenguaje**
- **CreateLanguageModel**: Crear modelo de lenguaje
- **GetLanguageModel**: Obtener detalles del modelo
- **ListLanguageModels**: Listar modelos de lenguaje
- **UpdateLanguageModel**: Actualizar modelo de lenguaje
- **DeleteLanguageModel**: Eliminar modelo de lenguaje

## Arquitectura de AWS Transcribe

### **Componentes Principales**
```
AWS Transcribe Architecture
├── Input Layer
│   ├── Audio Upload
│   ├── Stream Input
│   ├── Batch Processing
│   ├── Real-time Processing
│   └── Format Validation
├── Processing Engine
│   ├── Speech Recognition Models
│   ├── Language Models
│   ├── Speaker Diarization
│   ├── Custom Vocabularies
│   └── Content Redaction
├── Analysis Layer
│   ├── Speech-to-Text Conversion
│   ├── Speaker Identification
│   ├── Timestamp Generation
│   ├── Confidence Scoring
│   └── Quality Assessment
├── Storage Layer
│   ├── Transcription Storage
│   ├── Model Storage
│   ├── Vocabulary Storage
│   ├── Metadata Storage
│   └── Cache Storage
└── API Layer
    ├── REST APIs
    ├── WebSocket APIs
    ├── SDK Support
    ├── Integration APIs
    └── Event Notifications
```

### **Flujo de Procesamiento**
```
Audio Input → Preprocessing → Speech Recognition → Post-processing → Storage → Response
```

## Configuración de AWS Transcribe

### **Gestión Completa de AWS Transcribe**
```python
import boto3
import json
import time
import base64
import wave
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import urllib.request

class TranscribeManager:
    def __init__(self, region='us-east-1'):
        self.transcribe = boto3.client('transcribe', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.lambda_client = boto3.client('lambda', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.region = region
    
    def start_transcription_job(self, job_name, media_uri, language_code,
                              media_format=None, settings=None, job_execution_settings=None):
        """Iniciar trabajo de transcripción"""
        
        try:
            params = {
                'TranscriptionJobName': job_name,
                'LanguageCode': language_code,
                'Media': {
                    'MediaFileUri': media_uri
                }
            }
            
            if media_format:
                params['MediaFormat'] = media_format
            
            if settings:
                params['Settings'] = settings
            
            if job_execution_settings:
                params['JobExecutionSettings'] = job_execution_settings
            
            response = self.transcribe.start_transcription_job(**params)
            
            return {
                'success': True,
                'job_name': job_name,
                'job_status': response['TranscriptionJob']['TranscriptionJob']['Status'],
                'language_code': language_code,
                'media_uri': media_uri
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_transcription_job(self, job_name):
        """Obtener estado y detalles del trabajo de transcripción"""
        
        try:
            response = self.transcribe.get_transcription_job(
                TranscriptionJobName=job_name
            )
            
            job = response['TranscriptionJob']['TranscriptionJob']
            
            job_info = {
                'job_name': job['TranscriptionJobName'],
                'status': job['TranscriptionJobStatus'],
                'language_code': job['LanguageCode'],
                'media_format': job.get('MediaFormat', ''),
                'media_sample_rate_hz': job.get('MediaSampleRateHertz', 0),
                'creation_time': job['CreationTime'].isoformat() if job.get('CreationTime') else '',
                'completion_time': job.get('CompletionTime', '').isoformat() if job.get('CompletionTime') else '',
                'failure_reason': job.get('FailureReason', ''),
                'settings': job.get('Settings', {}),
                'job_execution_settings': job.get('JobExecutionSettings', {})
            }
            
            # Obtener transcripción si está completada
            if job['TranscriptionJobStatus'] == 'COMPLETED' and 'Transcript' in job:
                transcript = job['Transcript']
                job_info['transcript'] = {
                    'transcript_file_uri': transcript.get('TranscriptFileUri', ''),
                    'redacted_transcript_file_uri': transcript.get('RedactedTranscriptFileUri', '')
                }
                
                # Descargar y procesar transcripción
                if transcript.get('TranscriptFileUri'):
                    transcript_content = self._download_transcript(transcript['TranscriptFileUri'])
                    job_info['transcript_content'] = transcript_content
            
            return {
                'success': True,
                'job_info': job_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _download_transcript(self, transcript_uri):
        """Descargar y procesar archivo de transcripción"""
        
        try:
            # Extraer bucket y key de la URI
            if transcript_uri.startswith('https://s3.'):
                # Parse S3 URI
                parts = transcript_uri.split('/')
                bucket = parts[2].split('.')[0]
                key = '/'.join(parts[3:])
                
                response = self.s3.get_object(Bucket=bucket, Key=key)
                transcript_data = json.loads(response['Body'].read().decode('utf-8'))
                
                return transcript_data
            else:
                # Descargar desde URL
                with urllib.request.urlopen(transcript_uri) as response:
                    return json.loads(response.read().decode('utf-8'))
                    
        except Exception as e:
            return {'error': str(e)}
    
    def list_transcription_jobs(self, status=None, max_results=100, next_token=None):
        """Listar trabajos de transcripción"""
        
        try:
            params = {'MaxResults': max_results}
            
            if status:
                params['Status'] = status
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.transcribe.list_transcription_jobs(**params)
            
            jobs = []
            for job in response['TranscriptionJobSummaries']:
                job_info = {
                    'job_name': job['TranscriptionJobName'],
                    'status': job['TranscriptionJobStatus'],
                    'language_code': job['LanguageCode'],
                    'creation_time': job['CreationTime'].isoformat() if job.get('CreationTime') else '',
                    'completion_time': job.get('CompletionTime', '').isoformat() if job.get('CompletionTime') else '',
                    'failure_reason': job.get('FailureReason', '')
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
    
    def delete_transcription_job(self, job_name):
        """Eliminar trabajo de transcripción"""
        
        try:
            response = self.transcribe.delete_transcription_job(
                TranscriptionJobName=job_name
            )
            
            return {
                'success': True,
                'job_name': job_name,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_vocabulary(self, vocabulary_name, language_code, phrases,
                        vocabulary_file_uri=None, tags=None):
        """Crear vocabulario personalizado"""
        
        try:
            params = {
                'VocabularyName': vocabulary_name,
                'LanguageCode': language_code
            }
            
            if phrases:
                params['Phrases'] = phrases
            
            if vocabulary_file_uri:
                params['VocabularyFileUri'] = vocabulary_file_uri
            
            if tags:
                params['Tags'] = tags
            
            response = self.transcribe.create_vocabulary(**params)
            
            return {
                'success': True,
                'vocabulary_name': vocabulary_name,
                'language_code': language_code,
                'vocabulary_state': response['VocabularyState'],
                'failure_reason': response.get('FailureReason', '')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_vocabulary(self, vocabulary_name):
        """Obtener detalles del vocabulario"""
        
        try:
            response = self.transcribe.get_vocabulary(
                VocabularyName=vocabulary_name
            )
            
            vocabulary_info = {
                'vocabulary_name': response['VocabularyName'],
                'language_code': response['LanguageCode'],
                'vocabulary_state': response['VocabularyState'],
                'last_modified_time': response.get('LastModifiedTime', '').isoformat() if response.get('LastModifiedTime') else '',
                'download_uri': response.get('DownloadUri', ''),
                'failure_reason': response.get('FailureReason', ''),
                'content': response.get('Phrases', [])
            }
            
            return {
                'success': True,
                'vocabulary_info': vocabulary_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_vocabularies(self, max_results=100, next_token=None):
        """Listar vocabularios"""
        
        try:
            params = {'MaxResults': max_results}
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.transcribe.list_vocabularies(**params)
            
            vocabularies = []
            for vocab in response['Vocabularies']:
                vocab_info = {
                    'vocabulary_name': vocab['VocabularyName'],
                    'language_code': vocab['LanguageCode'],
                    'vocabulary_state': vocab['VocabularyState'],
                    'last_modified_time': vocab.get('LastModifiedTime', '').isoformat() if vocab.get('LastModifiedTime') else '',
                    'failure_reason': vocab.get('FailureReason', '')
                }
                vocabularies.append(vocab_info)
            
            return {
                'success': True,
                'vocabularies': vocabularies,
                'count': len(vocabularies),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_language_model(self, model_name, language_code, base_model_name,
                             training_data_s3_uri, tuning_data_s3_uri=None,
                             data_access_role_arn=None, tags=None):
        """Crear modelo de lenguaje personalizado"""
        
        try:
            params = {
                'ModelName': model_name,
                'LanguageCode': language_code,
                'BaseModelName': base_model_name,
                'TrainingDataS3Uri': training_data_s3_uri
            }
            
            if tuning_data_s3_uri:
                params['TuningDataS3Uri'] = tuning_data_s3_uri
            
            if data_access_role_arn:
                params['DataAccessRoleArn'] = data_access_role_arn
            
            if tags:
                params['Tags'] = tags
            
            response = self.transcribe.create_language_model(**params)
            
            return {
                'success': True,
                'model_name': model_name,
                'language_code': language_code,
                'base_model_name': base_model_name,
                'model_status': response['ModelStatus']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_language_model(self, model_name):
        """Obtener detalles del modelo de lenguaje"""
        
        try:
            response = self.transcribe.get_language_model(
                ModelName=model_name
            )
            
            model_info = {
                'model_name': response['ModelName'],
                'language_code': response['LanguageCode'],
                'base_model_name': response['BaseModelName'],
                'model_status': response['ModelStatus'],
                'failure_reason': response.get('FailureReason', ''),
                'create_time': response.get('CreateTime', '').isoformat() if response.get('CreateTime') else '',
                'last_modified_time': response.get('LastModifiedTime', '').isoformat() if response.get('LastModifiedTime') else '',
                'training_data_s3_uri': response.get('TrainingDataS3Uri', ''),
                'tuning_data_s3_uri': response.get('TuningDataS3Uri', ''),
                'data_access_role_arn': response.get('DataAccessRoleArn', '')
            }
            
            return {
                'success': True,
                'model_info': model_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def start_medical_transcription_job(self, job_name, media_uri, language_code,
                                       specialty, output_bucket_name, settings=None):
        """Iniciar trabajo de transcripción médica"""
        
        try:
            params = {
                'MedicalTranscriptionJobName': job_name,
                'LanguageCode': language_code,
                'Media': {
                    'MediaFileUri': media_uri
                },
                'OutputBucketName': output_bucket_name,
                'Specialty': specialty
            }
            
            if settings:
                params['Settings'] = settings
            
            response = self.transcribe.start_medical_transcription_job(**params)
            
            return {
                'success': True,
                'job_name': job_name,
                'job_status': response['MedicalTranscriptionJob']['TranscriptionJob']['Status'],
                'language_code': language_code,
                'specialty': specialty
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def start_call_analytics_job(self, job_name, media_uri, output_location,
                                settings=None, channel_definitions=None):
        """Iniciar trabajo de análisis de llamadas"""
        
        try:
            params = {
                'CallAnalyticsJobName': job_name,
                'Media': {
                    'MediaFileUri': media_uri
                },
                'OutputLocation': output_location
            }
            
            if settings:
                params['Settings'] = settings
            
            if channel_definitions:
                params['ChannelDefinitions'] = channel_definitions
            
            response = self.transcribe.start_call_analytics_job(**params)
            
            return {
                'success': True,
                'job_name': job_name,
                'job_status': response['CallAnalyticsJob']['CallAnalyticsJob']['Status']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_transcription_quality(self, transcript_content):
        """Analizar calidad de la transcripción"""
        
        try:
            if 'results' not in transcript_content:
                return {
                    'success': False,
                    'error': 'Invalid transcript format'
                }
            
            results = transcript_content['results']
            quality_analysis = {
                'total_alternatives': 0,
                'average_confidence': 0,
                'low_confidence_segments': [],
                'speaker_analysis': {},
                'word_count': 0,
                'duration_estimate': 0,
                'quality_score': 0
            }
            
            confidence_scores = []
            speaker_counts = {}
            
            for result in results.get('alternatives', []):
                if 'transcript' in result:
                    # Contar palabras
                    words = result['transcript'].split()
                    quality_analysis['word_count'] += len(words)
                    
                    # Analizar confianza
                    if 'confidence' in result:
                        confidence = result['confidence']
                        confidence_scores.append(confidence)
                        
                        if confidence < 0.8:
                            quality_analysis['low_confidence_segments'].append({
                                'transcript': result['transcript'],
                                'confidence': confidence
                            })
                
                # Analizar hablantes
                if 'alternatives' in result:
                    for alt in result['alternatives']:
                        if 'items' in alt:
                            for item in alt['items']:
                                if 'speaker' in item:
                                    speaker = item['speaker']
                                    speaker_counts[speaker] = speaker_counts.get(speaker, 0) + 1
            
            # Calcular métricas
            if confidence_scores:
                quality_analysis['average_confidence'] = sum(confidence_scores) / len(confidence_scores)
            
            quality_analysis['speaker_analysis'] = speaker_counts
            quality_analysis['total_alternatives'] = len(results.get('alternatives', []))
            
            # Estimar duración (basado en palabras y velocidad promedio)
            if quality_analysis['word_count'] > 0:
                # Velocidad promedio de habla: 150 palabras por minuto
                quality_analysis['duration_estimate'] = quality_analysis['word_count'] / 150 * 60
            
            # Calcular puntuación de calidad
            quality_score = self._calculate_transcription_quality_score(quality_analysis)
            quality_analysis['quality_score'] = quality_score
            
            return {
                'success': True,
                'quality_analysis': quality_analysis
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _calculate_transcription_quality_score(self, analysis):
        """Calcular puntuación de calidad de transcripción"""
        
        score = 0
        
        # Confianza promedio (40% del peso)
        confidence_score = analysis.get('average_confidence', 0) * 40
        score += confidence_score
        
        # Segmentos de baja confianza (30% del peso)
        low_confidence_ratio = len(analysis.get('low_confidence_segments', [])) / max(analysis.get('total_alternatives', 1), 1)
        low_confidence_score = max(0, (1 - low_confidence_ratio) * 30)
        score += low_confidence_score
        
        # Análisis de hablantes (20% del peso)
        speaker_score = min(20, len(analysis.get('speaker_analysis', {})) * 5)
        score += speaker_score
        
        # Completeness (10% del peso)
        word_count = analysis.get('word_count', 0)
        completeness_score = min(10, word_count / 100)
        score += completeness_score
        
        return round(score, 2)
    
    def process_batch_transcriptions(self, audio_files, language_code='en-US',
                                    settings=None, parallel_jobs=5):
        """Procesar transcripciones en batch"""
        
        try:
            batch_results = []
            active_jobs = []
            
            for i, audio_file in enumerate(audio_files):
                job_name = f"batch-job-{int(time.time())}-{i}"
                media_uri = audio_file
                
                # Iniciar trabajo
                job_result = self.start_transcription_job(
                    job_name=job_name,
                    media_uri=media_uri,
                    language_code=language_code,
                    settings=settings
                )
                
                if job_result['success']:
                    batch_results.append({
                        'job_name': job_name,
                        'media_uri': media_uri,
                        'status': 'STARTED',
                        'result': None
                    })
                    active_jobs.append(job_name)
                
                # Limitar trabajos paralelos
                if len(active_jobs) >= parallel_jobs:
                    # Esperar a que un trabajo termine
                    self._wait_for_job_completion(active_jobs[0])
                    active_jobs.pop(0)
            
            # Esperar a que todos los trabajos terminen
            for job_name in active_jobs:
                self._wait_for_job_completion(job_name)
            
            # Obtener resultados
            for result in batch_results:
                job_result = self.get_transcription_job(result['job_name'])
                if job_result['success']:
                    result['status'] = job_result['job_info']['status']
                    result['result'] = job_result['job_info']
            
            # Generar resumen del batch
            batch_summary = self._generate_batch_summary(batch_results)
            
            return {
                'success': True,
                'batch_results': batch_results,
                'batch_summary': batch_summary,
                'total_files': len(audio_files)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _wait_for_job_completion(self, job_name, timeout=3600):
        """Esperar a que un trabajo termine"""
        
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            job_result = self.get_transcription_job(job_name)
            
            if job_result['success']:
                status = job_result['job_info']['status']
                if status in ['COMPLETED', 'FAILED']:
                    return job_result
            
            time.sleep(10)  # Esperar 10 segundos
        
        return {'success': False, 'error': 'Job timeout'}
    
    def _generate_batch_summary(self, batch_results):
        """Generar resumen de procesamiento batch"""
        
        summary = {
            'total_jobs': len(batch_results),
            'completed_jobs': 0,
            'failed_jobs': 0,
            'in_progress_jobs': 0,
            'average_processing_time': 0,
            'total_words_transcribed': 0,
            'average_confidence': 0,
            'quality_scores': []
        }
        
        processing_times = []
        confidence_scores = []
        
        for result in batch_results:
            status = result.get('status', 'UNKNOWN')
            
            if status == 'COMPLETED':
                summary['completed_jobs'] += 1
                
                # Analizar resultado si está disponible
                if result.get('result') and 'transcript_content' in result['result']:
                    transcript_content = result['result']['transcript_content']
                    
                    # Análisis de calidad
                    quality_result = self.analyze_transcription_quality(transcript_content)
                    if quality_result['success']:
                        quality_analysis = quality_result['quality_analysis']
                        summary['total_words_transcribed'] += quality_analysis.get('word_count', 0)
                        summary['average_confidence'] += quality_analysis.get('average_confidence', 0)
                        summary['quality_scores'].append(quality_analysis.get('quality_score', 0))
                    
                    # Calcular tiempo de procesamiento
                    if 'creation_time' in result['result'] and 'completion_time' in result['result']:
                        creation = datetime.fromisoformat(result['result']['creation_time'].replace('Z', '+00:00'))
                        completion = datetime.fromisoformat(result['result']['completion_time'].replace('Z', '+00:00'))
                        processing_time = (completion - creation).total_seconds()
                        processing_times.append(processing_time)
            
            elif status == 'FAILED':
                summary['failed_jobs'] += 1
            elif status in ['QUEUED', 'IN_PROGRESS']:
                summary['in_progress_jobs'] += 1
        
        # Calcular promedios
        if processing_times:
            summary['average_processing_time'] = sum(processing_times) / len(processing_times)
        
        if summary['completed_jobs'] > 0:
            summary['average_confidence'] = summary['average_confidence'] / summary['completed_jobs']
        
        if summary['quality_scores']:
            summary['average_quality_score'] = sum(summary['quality_scores']) / len(summary['quality_scores'])
        
        return summary
    
    def create_transcribe_monitoring(self, sns_topic_arn=None):
        """Configurar monitoreo de Transcribe"""
        
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
                    Name='transcribe-alerts',
                    Tags=[
                        {'Key': 'Service', 'Value': 'Transcribe'},
                        {'Key': 'Purpose', 'Value': 'Monitoring'}
                    ]
                )
                monitoring_setup['sns_topic_arn'] = topic_response['TopicArn']
            
            # Crear función Lambda para monitoreo
            lambda_result = self.create_transcribe_monitoring_lambda()
            if lambda_result['success']:
                monitoring_setup['lambda_functions'].append(lambda_result['function_arn'])
            
            # Configurar alarmas de CloudWatch
            alarm_result = self.setup_transcribe_alarms(monitoring_setup['sns_topic_arn'])
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
    
    def create_transcribe_monitoring_lambda(self):
        """Crear función Lambda para monitoreo de Transcribe"""
        
        try:
            lambda_code = self._get_transcribe_lambda_code()
            
            # Crear rol de ejecución
            role_arn = self._create_lambda_execution_role('transcribe-monitoring-role')
            
            # Crear función Lambda
            response = self.lambda_client.create_function(
                FunctionName='transcribe-monitor',
                Runtime='python3.9',
                Role=role_arn,
                Handler='lambda_function.lambda_handler',
                Code={
                    'ZipFile': lambda_code
                },
                Description='Lambda function for Transcribe monitoring',
                Timeout=300,
                Environment={
                    'Variables': {
                        'SNS_TOPIC_ARN': f'arn:aws:sns:{self.region}:123456789012:transcribe-alerts'
                    }
                },
                Tags={
                    'Service': 'Transcribe',
                    'Purpose': 'Monitoring'
                }
            )
            
            return {
                'success': True,
                'function_name': 'transcribe-monitor',
                'function_arn': response['FunctionArn'],
                'role_arn': role_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_transcribe_lambda_code(self):
        """Obtener código de Lambda para monitoreo de Transcribe"""
        
        return '''
import json
import boto3
import os
from datetime import datetime

def lambda_handler(event, context):
    sns = boto3.client('sns')
    transcribe = boto3.client('transcribe')
    
    sns_topic_arn = os.environ['SNS_TOPIC_ARN']
    
    # Analizar evento de Transcribe
    event_analysis = analyze_transcribe_event(event)
    
    if event_analysis['requires_attention']:
        # Enviar alerta
        alert = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': 'TRANSCRIBE_ALERT',
            'job_name': event_analysis['job_name'],
            'job_status': event_analysis['job_status'],
            'language_code': event_analysis['language_code'],
            'risk_level': event_analysis['risk_level'],
            'recommendations': event_analysis['recommendations']
        }
        
        sns.publish(
            TopicArn=sns_topic_arn,
            Subject=f'Transcribe Alert: {event_analysis["job_name"]}',
            Message=json.dumps(alert),
            MessageStructure='string'
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Transcribe alert sent',
                'job_name': event_analysis['job_name'],
                'risk_level': event_analysis['risk_level']
            })
        }
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'No action required'})
    }

def analyze_transcribe_event(event):
    """Analizar evento de Transcribe"""
    
    analysis = {
        'requires_attention': False,
        'job_name': '',
        'job_status': 'UNKNOWN',
        'language_code': '',
        'risk_level': 'LOW',
        'recommendations': []
    }
    
    # Simular análisis de evento
    if 'detail-type' in event:
        detail_type = event['detail-type']
        
        if detail_type == 'Transcribe Job State Change':
            detail = event.get('detail', {})
            analysis['job_name'] = detail.get('TranscriptionJobName', '')
            analysis['job_status'] = detail.get('TranscriptionJobStatus', '')
            analysis['language_code'] = detail.get('LanguageCode', '')
            
            # Determinar si requiere atención
            if analysis['job_status'] == 'FAILED':
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'HIGH'
                analysis['recommendations'].append(f'Investigate job failure: {detail.get("FailureReason", "Unknown")}')
            elif analysis['job_status'] == 'COMPLETED':
                # Verificar calidad de la transcripción
                if 'Transcript' in detail:
                    transcript = detail['Transcript']
                    # Simular análisis de calidad
                    confidence = transcript.get('AverageConfidence', 0)
                    if confidence < 0.8:
                        analysis['requires_attention'] = True
                        analysis['risk_level'] = 'MEDIUM'
                        analysis['recommendations'].append(f'Review low confidence transcription: {confidence:.2f}')
    
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
                Description='Execution role for Transcribe monitoring Lambda',
                Tags=[
                    {'Key': 'Service', 'Value': 'Lambda'},
                    {'Key': 'Purpose', 'Value': 'TranscribeMonitoring'}
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
    
    def setup_transcribe_alarms(self, sns_topic_arn):
        """Configurar alarmas de CloudWatch para Transcribe"""
        
        try:
            alarms_created = []
            
            # Alarma para trabajos fallidos
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='Transcribe-FailedJobs',
                    AlarmDescription='Failed Transcribe jobs detected',
                    Namespace='AWS/Transcribe',
                    MetricName='FailedJobs',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('Transcribe-FailedJobs')
            except Exception:
                pass
            
            # Alarma para baja calidad de transcripción
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='Transcribe-LowQuality',
                    AlarmDescription='Low quality transcriptions detected',
                    Namespace='AWS/Transcribe',
                    MetricName='LowQualityTranscriptions',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('Transcribe-LowQuality')
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
    
    def generate_transcribe_report(self, report_type='comprehensive', time_range_days=30):
        """Generar reporte de Transcribe"""
        
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
                report['quality_analysis'] = self._get_quality_analysis()
                report['recommendations'] = self._generate_comprehensive_recommendations()
            
            elif report_type == 'usage':
                # Reporte de uso
                report['usage_analysis'] = {
                    'transcription_jobs': self._get_transcription_job_stats(),
                    'language_distribution': self._get_language_distribution(),
                    'media_format_usage': self._get_media_format_stats(),
                    'vocabulary_usage': self._get_vocabulary_usage_stats()
                }
            
            elif report_type == 'quality':
                # Reporte de calidad
                report['quality_assessment'] = {
                    'accuracy_metrics': self._get_accuracy_metrics(),
                    'confidence_analysis': self._get_confidence_analysis(),
                    'speaker_analysis': self._get_speaker_analysis_stats(),
                    'quality_trends': self._get_quality_trends()
                }
            
            elif report_type == 'cost':
                # Reporte de costos
                report['cost_breakdown'] = {
                    'transcription_costs': self._get_transcription_costs(),
                    'storage_costs': self._get_storage_costs(),
                    'vocabulary_costs': self._get_vocabulary_costs(),
                    'total_cost': self._calculate_total_cost()
                }
            
            return {
                'success': True,
                'transcribe_report': report
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
            'total_transcription_jobs': 15000,
            'completed_jobs': 14250,
            'failed_jobs': 150,
            'total_audio_hours': 2500,
            'average_job_duration': 10.5,  # minutos
            'languages_used': 8,
            'vocabularies_created': 12,
            'custom_models_created': 3
        }
    
    def _get_performance_metrics(self):
        """Obtener métricas de rendimiento"""
        
        return {
            'average_processing_time': 2.3,  # minutos por minuto de audio
            'throughput': 45,  # minutos de audio por hora
            'accuracy_rate': 94.2,  # porcentaje
            'success_rate': 95.0,  # porcentaje
            'average_confidence': 87.5,  # porcentaje
            'uptime': 99.9  # porcentaje
        }
    
    def _get_cost_analysis(self):
        """Obtener análisis de costos"""
        
        return {
            'monthly_cost': 875.00,
            'cost_breakdown': {
                'transcription': 650.00,
                'storage': 125.00,
                'vocabularies': 75.00,
                'custom_models': 25.00
            },
            'cost_trend': 'STABLE',
            'cost_optimization_potential': 12.0  # porcentaje
        }
    
    def _get_quality_analysis(self):
        """Obtener análisis de calidad"""
        
        return {
            'average_accuracy': 94.2,
            'confidence_distribution': {
                'high': 75.5,
                'medium': 20.3,
                'low': 4.2
            },
            'speaker_identification_accuracy': 91.8,
            'punctuation_accuracy': 88.5,
            'quality_score': 92.7
        }
    
    def _generate_comprehensive_recommendations(self):
        """Generar recomendaciones comprehensivas"""
        
        recommendations = [
            {
                'priority': 'HIGH',
                'category': 'QUALITY',
                'title': 'Improve audio quality',
                'description': 'Enhance input audio quality for better transcription accuracy',
                'action': 'Implement audio preprocessing and noise reduction'
            },
            {
                'priority': 'MEDIUM',
                'category': 'COST',
                'title': 'Optimize batch processing',
                'description': 'Optimize batch processing to reduce costs',
                'action': 'Implement efficient batching and job scheduling'
            },
            {
                'priority': 'LOW',
                'category': 'FEATURES',
                'title': 'Expand vocabulary usage',
                'description': 'Increase use of custom vocabularies for domain-specific terms',
                'action': 'Create and maintain domain-specific vocabularies'
            }
        ]
        
        return recommendations
```

## Casos de Uso

### **1. Transcripción Básica**
```python
# Ejemplo: Transcripción básica de audio
manager = TranscribeManager('us-east-1')

# Iniciar transcripción
job_result = manager.start_transcription_job(
    job_name='interview-transcription',
    media_uri='s3://my-bucket/audio/interview.mp3',
    language_code='en-US',
    media_format='mp3',
    settings={
        'ShowSpeakerLabels': True,
        'MaxSpeakerLabels': 2,
        'ChannelIdentification': False
    }
)

if job_result['success']:
    print(f"Transcription job started: {job_result['job_name']}")
    
    # Esperar y obtener resultados
    import time
    time.sleep(60)  # Esperar a que se complete
    
    result = manager.get_transcription_job(job_result['job_name'])
    if result['success']:
        job_info = result['job_info']
        print(f"Job status: {job_info['status']}")
        
        if job_info['status'] == 'COMPLETED' and 'transcript_content' in job_info:
            # Analizar calidad
            quality_result = manager.analyze_transcription_quality(job_info['transcript_content'])
            if quality_result['success']:
                quality = quality_result['quality_analysis']
                print(f"Quality score: {quality['quality_score']}")
                print(f"Average confidence: {quality['average_confidence']}")
                print(f"Word count: {quality['word_count']}")
```

### **2. Transcripción con Vocabulario Personalizado**
```python
# Ejemplo: Crear vocabulario personalizado
vocabulary_result = manager.create_vocabulary(
    vocabulary_name='medical-terms',
    language_code='en-US',
    phrases=[
        'cardiomyopathy',
        'electrocardiogram',
        'myocardial infarction',
        'hypertension',
        'arrhythmia'
    ],
    tags=[
        {'Key': 'Domain', 'Value': 'Medical'},
        {'Key': 'Specialty', 'Value': 'Cardiology'}
    ]
)

if vocabulary_result['success']:
    print(f"Vocabulary created: {vocabulary_result['vocabulary_name']}")
    
    # Usar vocabulario en transcripción
    job_result = manager.start_transcription_job(
        job_name='medical-consultation',
        media_uri='s3://my-bucket/medical/consultation.wav',
        language_code='en-US',
        settings={
            'VocabularyName': 'medical-terms',
            'VocabularyFilterName': 'medical-filter',
            'ShowSpeakerLabels': True
        }
    )
    
    if job_result['success']:
        print(f"Medical transcription started: {job_result['job_name']}")
```

### **3. Transcripción Médica**
```python
# Ejemplo: Transcripción médica especializada
medical_result = manager.start_medical_transcription_job(
    job_name='medical-dictation',
    media_uri='s3://my-bucket/medical/doctor-notes.mp3',
    language_code='en-US',
    specialty='PRIMARYCARE',
    output_bucket_name='medical-transcriptions',
    settings={
        'ShowSpeakerLabels': True,
        'MaxSpeakerLabels': 2,
        'ChannelIdentification': False
    }
)

if medical_result['success']:
    print(f"Medical transcription started: {medical_result['job_name']}")
```

### **4. Análisis de Llamadas**
```python
# Ejemplo: Análisis de llamadas
analytics_result = manager.start_call_analytics_job(
    job_name='customer-call-analysis',
    media_uri='s3://my-bucket/calls/customer-service.mp3',
    output_location='s3://my-bucket/call-analytics/',
    settings={
        'LanguageIdSettings': {
            'en-US': {
                'LanguageModelName': 'en-US-call-center'
            }
        }
    },
    channel_definitions=[
        {
            'ChannelId': 1,
            'ParticipantRole': 'AGENT'
        },
        {
            'ChannelId': 2,
            'ParticipantRole': 'CUSTOMER'
        }
    ]
)

if analytics_result['success']:
    print(f"Call analytics started: {analytics_result['job_name']}")
```

### **5. Procesamiento Batch**
```python
# Ejemplo: Procesamiento batch de múltiples archivos
audio_files = [
    's3://my-bucket/audio/lecture1.mp3',
    's3://my-bucket/audio/lecture2.mp3',
    's3://my-bucket/audio/lecture3.mp3',
    's3://my-bucket/audio/interview1.wav',
    's3://my-bucket/audio/interview2.wav'
]

batch_result = manager.process_batch_transcriptions(
    audio_files=audio_files,
    language_code='en-US',
    settings={
        'ShowSpeakerLabels': True,
        'MaxSpeakerLabels': 3
    },
    parallel_jobs=3
)

if batch_result['success']:
    summary = batch_result['batch_summary']
    print(f"Batch Processing Summary")
    print(f"Total jobs: {summary['total_jobs']}")
    print(f"Completed: {summary['completed_jobs']}")
    print(f"Failed: {summary['failed_jobs']}")
    print(f"Average processing time: {summary['average_processing_time']:.2f} seconds")
    print(f"Total words transcribed: {summary['total_words_transcribed']}")
    print(f"Average confidence: {summary['average_confidence']:.2f}")
```

### **6. Modelo de Lenguaje Personalizado**
```python
# Ejemplo: Crear modelo de lenguaje personalizado
model_result = manager.create_language_model(
    model_name='legal-transcriptions',
    language_code='en-US',
    base_model_name='WideBand',
    training_data_s3_uri='s3://my-bucket/training-data/legal/',
    tuning_data_s3_uri='s3://my-bucket/tuning-data/legal/',
    data_access_role_arn='arn:aws:iam::123456789012:role/TranscribeDataAccess',
    tags=[
        {'Key': 'Domain', 'Value': 'Legal'},
        {'Key': 'Purpose', 'Value': 'Transcription'}
    ]
)

if model_result['success']:
    print(f"Language model created: {model_result['model_name']}")
    
    # Usar modelo personalizado
    job_result = manager.start_transcription_job(
        job_name='legal-deposition',
        media_uri='s3://my-bucket/legal/deposition.wav',
        language_code='en-US',
        settings={
            'LanguageModelName': 'legal-transcriptions',
            'ShowSpeakerLabels': True
        }
    )
```

### **7. Configuración de Monitoreo**
```python
# Ejemplo: Configurar monitoreo
monitoring_result = manager.create_transcribe_monitoring()

if monitoring_result['success']:
    setup = monitoring_result['monitoring_setup']
    print(f"Transcribe monitoring configured")
    print(f"SNS Topic: {setup['sns_topic_arn']}")
    print(f"Lambda functions: {len(setup['lambda_functions'])}")
    print(f"CloudWatch alarms: {len(setup['cloudwatch_alarms'])}")
```

## Configuración con AWS CLI

### **Transcripción por Lotes**
```bash
# Iniciar transcripción
aws transcribe start-transcription-job \
  --transcription-job-name my-job \
  --language-code en-US \
  --media MediaFileUri=s3://my-bucket/audio.mp3 \
  --media-format mp3 \
  --settings ShowSpeakerLabels=true,MaxSpeakerLabels=2

# Obtener estado del trabajo
aws transcribe get-transcription-job \
  --transcription-job-name my-job

# Listar trabajos
aws transcribe list-transcription-jobs \
  --status COMPLETED \
  --max-results 50

# Eliminar trabajo
aws transcribe delete-transcription-job \
  --transcription-job-name my-job
```

### **Vocabularios Personalizados**
```bash
# Crear vocabulario
aws transcribe create-vocabulary \
  --vocabulary-name my-vocab \
  --language-code en-US \
  --phrases "word1,word2,word3" \
  --tags Key=Domain,Value=Technical

# Obtener vocabulario
aws transcribe get-vocabulary \
  --vocabulary-name my-vocab

# Listar vocabularios
aws transcribe list-vocabularies \
  --max-results 50

# Eliminar vocabulario
aws transcribe delete-vocabulary \
  --vocabulary-name my-vocab
```

### **Transcripción Médica**
```bash
# Iniciar transcripción médica
aws transcribe start-medical-transcription-job \
  --medical-transcription-job-name medical-job \
  --language-code en-US \
  --media MediaFileUri=s3://my-bucket/medical.mp3 \
  --output-bucket-name medical-transcriptions \
  --specialty PRIMARYCARE \
  --type CONVERSATION
```

### **Análisis de Llamadas**
```bash
# Iniciar análisis de llamadas
aws transcribe start-call-analytics-job \
  --call-analytics-job-name call-job \
  --media MediaFileUri=s3://my-bucket/call.mp3 \
  --output-location s3://my-bucket/analytics/ \
  --settings '{"LanguageIdSettings":{"en-US":{"LanguageModelName":"en-US"}}}'
```

## Mejores Prácticas

### **1. Preparación de Audio**
- Usar formatos de audio de alta calidad (WAV, FLAC)
- Eliminar ruido de fondo y eco
- Asegurar volumen consistente y claro
- Usar frecuencia de muestreo adecuada (16kHz o superior)

### **2. Configuración de Trabajos**
- Usar vocabularios personalizados para términos específicos
- Configurar identificación de hablantes cuando sea necesario
- Ajustar configuraciones según el tipo de contenido
- Usar modelos de lenguaje personalizados para dominios específicos

### **3. Optimización de Costos**
- Procesar archivos en batch cuando sea posible
- Usar formatos de audio comprimidos para reducir costos
- Eliminar transcripciones no necesarias
- Optimizar tamaño y calidad de archivos

### **4. Calidad y Precisión**
- Revisar y corregir transcripciones cuando sea necesario
- Usar análisis de calidad para identificar problemas
- Entrenar modelos personalizados con datos de alta calidad
- Implementar procesos de revisión humana

## Costos

### **Precios de AWS Transcribe**
- **Transcripción Estándar**: $1.50 por hora de audio
- **Transcripción Médica**: $4.00 por hora de audio
- **Análisis de Llamadas**: $2.50 por hora de audio
- **Streaming**: $0.024 por minuto de audio
- **Vocabularios Personalizados**: $4.00 por vocabulario por mes
- **Modelos de Lenguaje**: $0.006 por 15 minutos de entrenamiento

### **Storage Costs**
- **Almacenamiento de Transcripciones**: Costos estándar de S3
- **Almacenamiento de Vocabularios**: $0.10 por GB-mes
- **Almacenamiento de Modelos**: $0.10 por GB-mes

### **Ejemplo de Costos Mensuales**
- **100 horas de transcripción estándar**: 100 × $1.50 = $150.00
- **20 horas de transcripción médica**: 20 × $4.00 = $80.00
- **50 horas de streaming**: 50 × 60 × $0.024 = $72.00
- **5 vocabularios personalizados**: 5 × $4.00 = $20.00
- **Storage**: $25.00
- **Total estimado**: ~$347.00 por mes

## Troubleshooting

### **Problemas Comunes**
1. **Baja precisión**: Mejorar calidad de audio o usar vocabularios personalizados
2. **Tiempo de procesamiento largo**: Optimizar tamaño de archivos o usar batch
3. **Costos elevados**: Optimizar formatos y procesamiento
4. **Errores de formato**: Verificar formato y calidad del audio

### **Comandos de Diagnóstico**
```bash
# Verificar estado del trabajo
aws transcribe get-transcription-job --transcription-job-name my-job

# Verificar vocabulario
aws transcribe get-vocabulary --vocabulary-name my-vocab

# Verificar modelo de lenguaje
aws transcribe get-language-model --model-name my-model

# Verificar logs de Lambda
aws logs tail /aws/lambda/transcribe-monitor --follow
```

## Cumplimiento Normativo

### **HIPAA**
- **Privacy Rule**: Protección de información de salud
- **Security Rule**: Controles técnicos y administrativos
- **Breach Notification**: Notificación de brechas
- **Audit Controls**: Controles de auditoría

### **GDPR**
- **Artículo 6**: Base legal para procesamiento
- **Artículo 7**: Consentimiento explícito
- **Artículo 25**: Protección desde el diseño
- **Artículo 32**: Seguridad del tratamiento

### **PCI-DSS**
- **Requerimiento 3**: Protección de datos de titulares de tarjetas
- **Requerimiento 4**: Cifrado de datos de tarjeta
- **Requerimiento 7**: Restricción de acceso
- **Requerimiento 10**: Monitoreo y logging

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
- **Procesamiento**: Procesamiento automático de transcripciones
- **Eventos**: Respuesta a eventos de Transcribe
- **Transformación**: Transformación de datos
- **Integración**: Integración con otros servicios

### **AWS SNS**
- **Notificaciones**: Notificaciones de estado de trabajos
- **Alertas**: Alertas de baja calidad o errores
- **Eventos**: Eventos de finalización de procesamiento
- **Comunicación**: Comunicación entre servicios

### **AWS CloudWatch**
- **Monitoreo**: Monitoreo de métricas y rendimiento
- **Alarmas**: Alarmas para eventos críticos
- **Logs**: Almacenamiento de logs de aplicaciones
- **Dashboards**: Visualización de métricas

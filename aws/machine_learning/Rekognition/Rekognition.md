# AWS Rekognition

## Definición

AWS Rekognition es un servicio de inteligencia artificial y machine learning que permite analizar imágenes y videos para identificar objetos, personas, texto, escenas y actividades. Proporciona API de alto nivel que facilitan la incorporación de capacidades de visión por computadora en aplicaciones sin necesidad de experiencia previa en machine learning.

## Características Principales

### **Análisis de Imágenes**
- **Detección de objetos**: Identificación de miles de objetos y escenas
- **Reconocimiento facial**: Detección, análisis y comparación de rostros
- **Análisis de texto**: Detección y extracción de texto en imágenes (OCR)
- **Detección de etiquetas**: Identificación de etiquetas y categorías
- **Análisis de contenido**: Evaluación de contenido inapropiado

### **Análisis de Videos**
- **Detección de objetos**: Seguimiento de objetos a través de fotogramas
- **Reconocimiento facial**: Detección y seguimiento de rostros en video
- **Análisis de etiquetas**: Etiquetado de contenido de video
- **Detección de celebrities**: Identificación de celebridades conocidas
- **Análisis de contenido**: Detección de contenido inapropiado o explícito

### **Análisis de Rostros**
- **Detección de rostros**: Localización de rostros en imágenes
- **Análisis de atributos**: Determinación de edad, género, emociones
- **Comparación de rostros**: Verificación de identidad facial
- **Búsqueda de rostros**: Búsqueda en colecciones de rostros
- **Análisis de calidad**: Evaluación de la calidad de imágenes faciales

### **Análisis de Texto**
- **OCR avanzado**: Detección y extracción de texto
- **Análisis de documentos**: Procesamiento de documentos estructurados
- **Detección de líneas**: Identificación de líneas de texto
- **Análisis de palabras**: Segmentación de palabras individuales
- **Confianza de detección**: Puntuación de confianza para cada detección

## Tipos de Operaciones

### **1. Operaciones de Imágenes**
- **DetectLabels**: Detección de etiquetas y objetos
- **DetectFaces**: Detección de rostros
- **CompareFaces**: Comparación de rostros
- **DetectText**: Detección de texto (OCR)
- **DetectModerationLabels**: Detección de contenido inapropiado
- **RecognizeCelebrities**: Reconocimiento de celebridades

### **2. Operaciones de Video**
- **StartLabelDetection**: Iniciar detección de etiquetas en video
- **StartFaceDetection**: Iniciar detección de rostros en video
- **StartCelebrityRecognition**: Iniciar reconocimiento de celebridades
- **StartContentModeration**: Iniciar análisis de contenido
- **GetLabelDetection**: Obtener resultados de detección de etiquetas
- **GetFaceDetection**: Obtener resultados de detección de rostros

### **3. Operaciones de Colecciones**
- **CreateCollection**: Crear colección de rostros
- **IndexFaces**: Indexar rostros en colección
- **SearchFacesByImage**: Buscar rostros por imagen
- **SearchFaces**: Buscar rostros similares
- **DeleteCollection**: Eliminar colección
- **DeleteFaces**: Eliminar rostros de colección

### **4. Operaciones de Stream**
- **StartStreamProcessor**: Iniciar procesamiento de stream
- **StopStreamProcessor**: Detener procesamiento de stream
- **DescribeStreamProcessor**: Describir procesador de stream
- **ListStreamProcessors**: Listar procesadores de stream
- **UpdateStreamProcessor**: Actualizar procesador de stream

## Arquitectura de AWS Rekognition

### **Componentes Principales**
```
AWS Rekognition Architecture
├── Input Layer
│   ├── Image Upload
│   ├── Video Upload
│   ├── Stream Input
│   ├── Batch Processing
│   └── Real-time Processing
├── Analysis Engine
│   ├── Computer Vision Models
│   ├── Face Recognition Models
│   ├── Text Recognition Models
│   ├── Content Moderation Models
│   └── Celebrity Recognition Models
├── Processing Layer
│   ├── Image Analysis
│   ├── Video Analysis
│   ├── Stream Processing
│   ├── Batch Processing
│   └── Real-time Processing
├── Storage Layer
│   ├── Face Collections
│   ├── Metadata Storage
│   ├── Result Storage
│   ├── Model Storage
│   └── Cache Storage
└── API Layer
    ├── REST APIs
    ├── SDK Support
    ├── Integration APIs
    ├── Webhook Support
    └── Event Notifications
```

### **Flujo de Procesamiento**
```
Input → Preprocessing → Model Inference → Post-processing → Storage → Response
```

## Configuración de AWS Rekognition

### **Gestión Completa de AWS Rekognition**
```python
import boto3
import json
import time
import base64
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import urllib.request

class RekognitionManager:
    def __init__(self, region='us-east-1'):
        self.rekognition = boto3.client('rekognition', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.lambda_client = boto3.client('lambda', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.region = region
    
    def detect_labels_image(self, image_source, max_labels=10, min_confidence=70):
        """Detectar etiquetas en imagen"""
        
        try:
            params = {
                'MaxLabels': max_labels,
                'MinConfidence': min_confidence
            }
            
            if image_source.startswith('s3://'):
                # Imagen desde S3
                bucket, key = image_source[5:].split('/', 1)
                params['Image'] = {'S3Object': {'Bucket': bucket, 'Name': key}}
            elif image_source.startswith('http'):
                # Imagen desde URL
                with urllib.request.urlopen(image_source) as response:
                    image_bytes = response.read()
                params['Image'] = {'Bytes': image_bytes}
            else:
                # Imagen local (base64)
                with open(image_source, 'rb') as image_file:
                    image_bytes = image_file.read()
                params['Image'] = {'Bytes': image_bytes}
            
            response = self.rekognition.detect_labels(**params)
            
            labels = []
            for label in response['Labels']:
                label_info = {
                    'name': label['Name'],
                    'confidence': label['Confidence'],
                    'instances': len(label.get('Instances', [])),
                    'parents': [parent['Name'] for parent in label.get('Parents', [])]
                }
                labels.append(label_info)
            
            return {
                'success': True,
                'labels': labels,
                'count': len(labels),
                'image_source': image_source
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def detect_faces_image(self, image_source, attributes=['ALL']):
        """Detectar rostros en imagen"""
        
        try:
            params = {
                'Attributes': attributes
            }
            
            if image_source.startswith('s3://'):
                bucket, key = image_source[5:].split('/', 1)
                params['Image'] = {'S3Object': {'Bucket': bucket, 'Name': key}}
            else:
                with open(image_source, 'rb') as image_file:
                    image_bytes = image_file.read()
                params['Image'] = {'Bytes': image_bytes}
            
            response = self.rekognition.detect_faces(**params)
            
            faces = []
            for face in response['FaceDetails']:
                face_info = {
                    'face_id': face.get('FaceId', ''),
                    'confidence': face.get('Confidence', 0),
                    'bounding_box': face.get('BoundingBox', {}),
                    'age_range': face.get('AgeRange', {}),
                    'gender': face.get('Gender', {}),
                    'smile': face.get('Smile', {}),
                    'eyeglasses': face.get('Eyeglasses', {}),
                    'sunglasses': face.get('Sunglasses', {}),
                    'beard': face.get('Beard', {}),
                    'mustache': face.get('Mustache', {}),
                    'eyes_open': face.get('EyesOpen', {}),
                    'mouth_open': face.get('MouthOpen', {}),
                    'emotions': face.get('Emotions', [])
                }
                faces.append(face_info)
            
            return {
                'success': True,
                'faces': faces,
                'count': len(faces),
                'image_source': image_source
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def compare_faces(self, source_image, target_image, similarity_threshold=70):
        """Comparar rostros entre imágenes"""
        
        try:
            params = {
                'SimilarityThreshold': similarity_threshold
            }
            
            # Configurar imagen fuente
            if source_image.startswith('s3://'):
                bucket, key = source_image[5:].split('/', 1)
                params['SourceImage'] = {'S3Object': {'Bucket': bucket, 'Name': key}}
            else:
                with open(source_image, 'rb') as image_file:
                    image_bytes = image_file.read()
                params['SourceImage'] = {'Bytes': image_bytes}
            
            # Configurar imagen objetivo
            if target_image.startswith('s3://'):
                bucket, key = target_image[5:].split('/', 1)
                params['TargetImage'] = {'S3Object': {'Bucket': bucket, 'Name': key}}
            else:
                with open(target_image, 'rb') as image_file:
                    image_bytes = image_file.read()
                params['TargetImage'] = {'Bytes': image_bytes}
            
            response = self.rekognition.compare_faces(**params)
            
            matches = []
            for match in response['FaceMatches']:
                match_info = {
                    'similarity': match['Similarity'],
                    'face_id': match['Face']['FaceId'],
                    'bounding_box': match['Face']['BoundingBox'],
                    'confidence': match['Face']['Confidence']
                }
                matches.append(match_info)
            
            unmatched = len(response.get('UnmatchedFaces', []))
            
            return {
                'success': True,
                'matches': matches,
                'unmatched_count': unmatched,
                'source_image': source_image,
                'target_image': target_image
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def detect_text_image(self, image_source):
        """Detectar texto en imagen (OCR)"""
        
        try:
            params = {}
            
            if image_source.startswith('s3://'):
                bucket, key = image_source[5:].split('/', 1)
                params['Image'] = {'S3Object': {'Bucket': bucket, 'Name': key}}
            else:
                with open(image_source, 'rb') as image_file:
                    image_bytes = image_file.read()
                params['Image'] = {'Bytes': image_bytes}
            
            response = self.rekognition.detect_text(**params)
            
            text_detections = []
            for detection in response['TextDetections']:
                text_info = {
                    'detected_text': detection['DetectedText'],
                    'type': detection['Type'],
                    'confidence': detection['Confidence'],
                    'bounding_box': detection.get('Geometry', {}).get('BoundingBox', {}),
                    'polygon': detection.get('Geometry', {}).get('Polygon', [])
                }
                text_detections.append(text_info)
            
            # Extraer solo el texto
            full_text = ' '.join([d['detected_text'] for d in text_detections if d['type'] == 'LINE'])
            
            return {
                'success': True,
                'text_detections': text_detections,
                'full_text': full_text,
                'count': len(text_detections),
                'image_source': image_source
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def detect_moderation_labels(self, image_source, min_confidence=50):
        """Detectar contenido inapropiado"""
        
        try:
            params = {
                'MinConfidence': min_confidence
            }
            
            if image_source.startswith('s3://'):
                bucket, key = image_source[5:].split('/', 1)
                params['Image'] = {'S3Object': {'Bucket': bucket, 'Name': key}}
            else:
                with open(image_source, 'rb') as image_file:
                    image_bytes = image_file.read()
                params['Image'] = {'Bytes': image_bytes}
            
            response = self.rekognition.detect_moderation_labels(**params)
            
            moderation_labels = []
            for label in response['ModerationLabels']:
                label_info = {
                    'name': label['Name'],
                    'confidence': label['Confidence'],
                    'parent_name': label.get('ParentName', ''),
                    'taxonomy_level': label.get('TaxonomyLevel', 0)
                }
                moderation_labels.append(label_info)
            
            # Determinar si es contenido inapropiado
            is_inappropriate = len(moderation_labels) > 0
            risk_level = self._determine_moderation_risk_level(moderation_labels)
            
            return {
                'success': True,
                'moderation_labels': moderation_labels,
                'count': len(moderation_labels),
                'is_inappropriate': is_inappropriate,
                'risk_level': risk_level,
                'image_source': image_source
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _determine_moderation_risk_level(self, labels):
        """Determinar nivel de riesgo de moderación"""
        
        if not labels:
            return 'LOW'
        
        high_risk_labels = ['Explicit Nudity', 'Graphic Violence', 'Rude Gestures']
        medium_risk_labels = ['Suggestive', 'Partial Nudity', 'Violence']
        
        for label in labels:
            if label['name'] in high_risk_labels:
                return 'HIGH'
            elif label['name'] in medium_risk_labels:
                return 'MEDIUM'
        
        return 'LOW'
    
    def recognize_celebrities(self, image_source):
        """Reconocer celebridades en imagen"""
        
        try:
            params = {}
            
            if image_source.startswith('s3://'):
                bucket, key = image_source[5:].split('/', 1)
                params['Image'] = {'S3Object': {'Bucket': bucket, 'Name': key}}
            else:
                with open(image_source, 'rb') as image_file:
                    image_bytes = image_file.read()
                params['Image'] = {'Bytes': image_bytes}
            
            response = self.rekognition.recognize_celebrities(**params)
            
            celebrities = []
            for celebrity in response['CelebrityFaces']:
                celebrity_info = {
                    'name': celebrity['Name'],
                    'id': celebrity['Id'],
                    'confidence': celebrity['MatchConfidence'],
                    'bounding_box': celebrity.get('Face', {}).get('BoundingBox', {}),
                    'urls': celebrity.get('Urls', [])
                }
                celebrities.append(celebrity_info)
            
            unrecognized_faces = len(response.get('UnrecognizedFaces', []))
            
            return {
                'success': True,
                'celebrities': celebrities,
                'unrecognized_faces': unrecognized_faces,
                'count': len(celebrities),
                'image_source': image_source
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_face_collection(self, collection_id, tags=None):
        """Crear colección de rostros"""
        
        try:
            params = {
                'CollectionId': collection_id
            }
            
            if tags:
                params['Tags'] = tags
            
            response = self.rekognition.create_collection(**params)
            
            return {
                'success': True,
                'collection_id': collection_id,
                'arn': response['CollectionArn'],
                'status': response['StatusCode'],
                'face_count': response['FaceModelVersion']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def index_faces(self, collection_id, image_source, external_image_id=None, 
                   detection_attributes=['DEFAULT'], max_faces=10):
        """Indexar rostros en colección"""
        
        try:
            params = {
                'CollectionId': collection_id,
                'DetectionAttributes': detection_attributes,
                'MaxFaces': max_faces
            }
            
            if external_image_id:
                params['ExternalImageId'] = external_image_id
            
            if image_source.startswith('s3://'):
                bucket, key = image_source[5:].split('/', 1)
                params['Image'] = {'S3Object': {'Bucket': bucket, 'Name': key}}
            else:
                with open(image_source, 'rb') as image_file:
                    image_bytes = image_file.read()
                params['Image'] = {'Bytes': image_bytes}
            
            response = self.rekognition.index_faces(**params)
            
            indexed_faces = []
            for face in response['FaceRecords']:
                face_info = {
                    'face_id': face['Face']['FaceId'],
                    'bounding_box': face['Face']['BoundingBox'],
                    'confidence': face['Face']['Confidence'],
                    'image_id': face['Face']['ImageId']
                }
                indexed_faces.append(face_info)
            
            return {
                'success': True,
                'indexed_faces': indexed_faces,
                'count': len(indexed_faces),
                'collection_id': collection_id,
                'image_source': image_source
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def search_faces_by_image(self, collection_id, image_source, 
                              face_match_threshold=70, max_faces=10):
        """Buscar rostros por imagen"""
        
        try:
            params = {
                'CollectionId': collection_id,
                'FaceMatchThreshold': face_match_threshold,
                'MaxFaces': max_faces
            }
            
            if image_source.startswith('s3://'):
                bucket, key = image_source[5:].split('/', 1)
                params['Image'] = {'S3Object': {'Bucket': bucket, 'Name': key}}
            else:
                with open(image_source, 'rb') as image_file:
                    image_bytes = image_file.read()
                params['Image'] = {'Bytes': image_bytes}
            
            response = self.rekognition.search_faces_by_image(**params)
            
            matched_faces = []
            for face in response['FaceMatches']:
                face_info = {
                    'face_id': face['Face']['FaceId'],
                    'similarity': face['Similarity'],
                    'bounding_box': face['Face'].get('BoundingBox', {}),
                    'confidence': face['Face'].get('Confidence', 0)
                }
                matched_faces.append(face_info)
            
            return {
                'success': True,
                'matched_faces': matched_faces,
                'count': len(matched_faces),
                'collection_id': collection_id,
                'image_source': image_source
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def start_label_detection_video(self, video_source, notification_channel,
                                   min_confidence=50, job_tag=None):
        """Iniciar detección de etiquetas en video"""
        
        try:
            params = {
                'Video': self._prepare_video_input(video_source),
                'NotificationChannel': notification_channel,
                'MinConfidence': min_confidence
            }
            
            if job_tag:
                params['JobTag'] = job_tag
            
            response = self.rekognition.start_label_detection(**params)
            
            return {
                'success': True,
                'job_id': response['JobId'],
                'job_tag': job_tag,
                'video_source': video_source,
                'status': 'STARTED'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def start_face_detection_video(self, video_source, notification_channel,
                                  face_attributes=['DEFAULT'], job_tag=None):
        """Iniciar detección de rostros en video"""
        
        try:
            params = {
                'Video': self._prepare_video_input(video_source),
                'NotificationChannel': notification_channel,
                'FaceAttributes': face_attributes
            }
            
            if job_tag:
                params['JobTag'] = job_tag
            
            response = self.rekognition.start_face_detection(**params)
            
            return {
                'success': True,
                'job_id': response['JobId'],
                'job_tag': job_tag,
                'video_source': video_source,
                'status': 'STARTED'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _prepare_video_input(self, video_source):
        """Preparar entrada de video"""
        
        if video_source.startswith('s3://'):
            bucket, key = video_source[5:].split('/', 1)
            return {'S3Object': {'Bucket': bucket, 'Name': key}}
        else:
            raise ValueError("Video source must be S3 URL")
    
    def get_label_detection_job(self, job_id):
        """Obtener estado de trabajo de detección de etiquetas"""
        
        try:
            response = self.rekognition.get_label_detection(JobId=job_id)
            
            job_info = {
                'job_id': response['JobId'],
                'job_tag': response.get('JobTag', ''),
                'status': response['JobStatus'],
                'status_message': response.get('StatusMessage', ''),
                'video_metadata': response.get('VideoMetadata', {}),
                'creation_timestamp': response.get('CreationTimestamp', '').isoformat() if response.get('CreationTimestamp') else '',
                'completion_timestamp': response.get('CompletionTimestamp', '').isoformat() if response.get('CompletionTimestamp') else ''
            }
            
            labels = []
            if 'Labels' in response:
                for label in response['Labels']:
                    label_info = {
                        'name': label['Label']['Name'],
                        'confidence': label['Label']['Confidence'],
                        'timestamp': label['Timestamp'],
                        'instances': label.get('Label', {}).get('Instances', [])
                    }
                    labels.append(label_info)
            
            job_info['labels'] = labels
            
            return {
                'success': True,
                'job_info': job_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_stream_processor(self, input_config, output_config, 
                                settings, name, role_arn):
        """Crear procesador de stream"""
        
        try:
            params = {
                'Input': input_config,
                'Output': output_config,
                'Settings': settings,
                'Name': name,
                'RoleArn': role_arn
            }
            
            response = self.rekognition.create_stream_processor(**params)
            
            return {
                'success': True,
                'stream_processor_arn': response['StreamProcessorArn'],
                'name': name,
                'status': 'CREATING'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def start_stream_processor(self, name):
        """Iniciar procesador de stream"""
        
        try:
            response = self.rekognition.start_stream_processor(Name=name)
            
            return {
                'success': True,
                'name': name,
                'status': 'STARTING'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_batch_images(self, image_sources, operations=['labels', 'faces']):
        """Análisis batch de imágenes"""
        
        try:
            batch_results = []
            
            for image_source in image_sources:
                result = {
                    'image_source': image_source,
                    'analyses': {}
                }
                
                # Análisis de etiquetas
                if 'labels' in operations:
                    labels_result = self.detect_labels_image(image_source)
                    result['analyses']['labels'] = labels_result
                
                # Análisis de rostros
                if 'faces' in operations:
                    faces_result = self.detect_faces_image(image_source)
                    result['analyses']['faces'] = faces_result
                
                # Análisis de texto
                if 'text' in operations:
                    text_result = self.detect_text_image(image_source)
                    result['analyses']['text'] = text_result
                
                # Análisis de moderación
                if 'moderation' in operations:
                    moderation_result = self.detect_moderation_labels(image_source)
                    result['analyses']['moderation'] = moderation_result
                
                # Reconocimiento de celebridades
                if 'celebrities' in operations:
                    celebrity_result = self.recognize_celebrities(image_source)
                    result['analyses']['celebrities'] = celebrity_result
                
                batch_results.append(result)
            
            # Resumen del batch
            summary = self._generate_batch_summary(batch_results)
            
            return {
                'success': True,
                'batch_results': batch_results,
                'summary': summary,
                'total_images': len(image_sources)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generate_batch_summary(self, batch_results):
        """Generar resumen de análisis batch"""
        
        summary = {
            'total_images': len(batch_results),
            'successful_analyses': 0,
            'failed_analyses': 0,
            'labels_detected': 0,
            'faces_detected': 0,
            'text_detected': 0,
            'moderation_flags': 0,
            'celebrities_found': 0
        }
        
        for result in batch_results:
            success_count = 0
            total_count = len(result['analyses'])
            
            for operation, analysis in result['analyses'].items():
                if analysis['success']:
                    success_count += 1
                    
                    if operation == 'labels':
                        summary['labels_detected'] += len(analysis.get('labels', []))
                    elif operation == 'faces':
                        summary['faces_detected'] += len(analysis.get('faces', []))
                    elif operation == 'text':
                        summary['text_detected'] += len(analysis.get('text_detections', []))
                    elif operation == 'moderation':
                        if analysis.get('is_inappropriate', False):
                            summary['moderation_flags'] += 1
                    elif operation == 'celebrities':
                        summary['celebrities_found'] += len(analysis.get('celebrities', []))
            
            if success_count == total_count:
                summary['successful_analyses'] += 1
            else:
                summary['failed_analyses'] += 1
        
        return summary
    
    def create_rekognition_monitoring(self, sns_topic_arn=None):
        """Configurar monitoreo de Rekognition"""
        
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
                    Name='rekognition-alerts',
                    Tags=[
                        {'Key': 'Service', 'Value': 'Rekognition'},
                        {'Key': 'Purpose', 'Value': 'Monitoring'}
                    ]
                )
                monitoring_setup['sns_topic_arn'] = topic_response['TopicArn']
            
            # Crear función Lambda para monitoreo
            lambda_result = self.create_rekognition_monitoring_lambda()
            if lambda_result['success']:
                monitoring_setup['lambda_functions'].append(lambda_result['function_arn'])
            
            # Configurar alarmas de CloudWatch
            alarm_result = self.setup_rekognition_alarms(monitoring_setup['sns_topic_arn'])
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
    
    def create_rekognition_monitoring_lambda(self):
        """Crear función Lambda para monitoreo de Rekognition"""
        
        try:
            lambda_code = self._get_rekognition_lambda_code()
            
            # Crear rol de ejecución
            role_arn = self._create_lambda_execution_role('rekognition-monitoring-role')
            
            # Crear función Lambda
            response = self.lambda_client.create_function(
                FunctionName='rekognition-monitor',
                Runtime='python3.9',
                Role=role_arn,
                Handler='lambda_function.lambda_handler',
                Code={
                    'ZipFile': lambda_code
                },
                Description='Lambda function for Rekognition monitoring',
                Timeout=300,
                Environment={
                    'Variables': {
                        'SNS_TOPIC_ARN': f'arn:aws:sns:{self.region}:123456789012:rekognition-alerts'
                    }
                },
                Tags={
                    'Service': 'Rekognition',
                    'Purpose': 'Monitoring'
                }
            )
            
            return {
                'success': True,
                'function_name': 'rekognition-monitor',
                'function_arn': response['FunctionArn'],
                'role_arn': role_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_rekognition_lambda_code(self):
        """Obtener código de Lambda para monitoreo de Rekognition"""
        
        return '''
import json
import boto3
import os
from datetime import datetime

def lambda_handler(event, context):
    sns = boto3.client('sns')
    rekognition = boto3.client('rekognition')
    
    sns_topic_arn = os.environ['SNS_TOPIC_ARN']
    
    # Analizar evento de Rekognition
    event_analysis = analyze_rekognition_event(event)
    
    if event_analysis['requires_attention']:
        # Enviar alerta
        alert = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': 'REKOGNITION_ALERT',
            'job_id': event_analysis['job_id'],
            'job_type': event_analysis['job_type'],
            'status': event_analysis['status'],
            'risk_level': event_analysis['risk_level'],
            'recommendations': event_analysis['recommendations']
        }
        
        sns.publish(
            TopicArn=sns_topic_arn,
            Subject=f'Rekognition Alert: {event_analysis["job_type"]}',
            Message=json.dumps(alert),
            MessageStructure='string'
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Rekognition alert sent',
                'job_type': event_analysis['job_type'],
                'risk_level': event_analysis['risk_level']
            })
        }
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'No action required'})
    }

def analyze_rekognition_event(event):
    """Analizar evento de Rekognition"""
    
    analysis = {
        'requires_attention': False,
        'job_id': '',
        'job_type': 'UNKNOWN',
        'status': 'UNKNOWN',
        'risk_level': 'LOW',
        'recommendations': []
    }
    
    # Simular análisis de evento
    if 'detail-type' in event:
        detail_type = event['detail-type']
        
        if detail_type == 'Rekognition Job Status Change':
            detail = event.get('detail', {})
            analysis['job_id'] = detail.get('JobId', '')
            analysis['job_type'] = detail.get('JobType', 'UNKNOWN')
            analysis['status'] = detail.get('JobStatus', 'UNKNOWN')
            
            # Determinar si requiere atención
            if analysis['status'] in ['FAILED', 'PARTIAL_SUCCESS']:
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'HIGH'
                analysis['recommendations'].append(f'Investigate {analysis["job_type"]} job failure')
            elif analysis['status'] == 'SUCCEEDED':
                # Verificar si hay hallazgos preocupantes
                if 'Labels' in detail:
                    high_risk_labels = ['Explicit Nudity', 'Violence', 'Weapons']
                    for label in detail['Labels']:
                        if label.get('Name', '') in high_risk_labels:
                            analysis['requires_attention'] = True
                            analysis['risk_level'] = 'MEDIUM'
                            analysis['recommendations'].append(f'Review {label.get("Name")} detection')
                            break
    
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
                Description='Execution role for Rekognition monitoring Lambda',
                Tags=[
                    {'Key': 'Service', 'Value': 'Lambda'},
                    {'Key': 'Purpose', 'Value': 'RekognitionMonitoring'}
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
    
    def setup_rekognition_alarms(self, sns_topic_arn):
        """Configurar alarmas de CloudWatch para Rekognition"""
        
        try:
            alarms_created = []
            
            # Alarma para trabajos fallidos
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='Rekognition-FailedJobs',
                    AlarmDescription='Failed Rekognition jobs detected',
                    Namespace='AWS/Rekognition',
                    MetricName='FailedJobs',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('Rekognition-FailedJobs')
            except Exception:
                pass
            
            # Alarma para contenido inapropiado
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='Rekognition-InappropriateContent',
                    AlarmDescription='Inappropriate content detected',
                    Namespace='AWS/Rekognition',
                    MetricName='InappropriateContent',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('Rekognition-InappropriateContent')
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
    
    def generate_rekognition_report(self, report_type='comprehensive', time_range_days=30):
        """Generar reporte de Rekognition"""
        
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
                report['security_analysis'] = self._get_security_analysis()
                report['recommendations'] = self._generate_comprehensive_recommendations()
            
            elif report_type == 'usage':
                # Reporte de uso
                report['usage_analysis'] = {
                    'api_calls': self._get_api_call_statistics(),
                    'image_processing': self._get_image_processing_stats(),
                    'video_processing': self._get_video_processing_stats(),
                    'face_collections': self._get_face_collection_stats()
                }
            
            elif report_type == 'security':
                # Reporte de seguridad
                report['security_assessment'] = {
                    'content_moderation': self._get_content_moderation_stats(),
                    'face_recognition': self._get_face_recognition_stats(),
                    'privacy_compliance': self._get_privacy_compliance_stats(),
                    'security_incidents': self._get_security_incidents()
                }
            
            elif report_type == 'cost':
                # Reporte de costos
                report['cost_breakdown'] = {
                    'api_costs': self._get_api_costs(),
                    'storage_costs': self._get_storage_costs(),
                    'processing_costs': self._get_processing_costs(),
                    'total_cost': self._calculate_total_cost()
                }
            
            return {
                'success': True,
                'rekognition_report': report
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
            'total_api_calls': 50000,
            'images_processed': 15000,
            'videos_processed': 250,
            'face_collections': 5,
            'stream_processors': 2,
            'average_confidence': 85.2,
            'success_rate': 98.7
        }
    
    def _get_performance_metrics(self):
        """Obtener métricas de rendimiento"""
        
        return {
            'average_response_time': 0.85,  # segundos
            'throughput': 120,  # imágenes por minuto
            'accuracy_rate': 94.5,  # porcentaje
            'error_rate': 1.3,  # porcentaje
            'uptime': 99.95  # porcentaje
        }
    
    def _get_cost_analysis(self):
        """Obtener análisis de costos"""
        
        return {
            'monthly_cost': 1250.00,
            'cost_breakdown': {
                'api_calls': 450.00,
                'storage': 200.00,
                'processing': 600.00
            },
            'cost_trend': 'INCREASING',
            'cost_optimization_potential': 15.0  # porcentaje
        }
    
    def _get_security_analysis(self):
        """Obtener análisis de seguridad"""
        
        return {
            'content_moderation_flags': 125,
            'high_risk_detections': 23,
            'privacy_violations': 5,
            'security_incidents': 2,
            'compliance_score': 92.3
        }
    
    def _generate_comprehensive_recommendations(self):
        """Generar recomendaciones comprehensivas"""
        
        recommendations = [
            {
                'priority': 'HIGH',
                'category': 'PERFORMANCE',
                'title': 'Optimize image processing',
                'description': 'Consider implementing image preprocessing to improve accuracy',
                'action': 'Implement image normalization and enhancement'
            },
            {
                'priority': 'MEDIUM',
                'category': 'COST',
                'title': 'Review storage usage',
                'description': 'Optimize S3 storage for better cost efficiency',
                'action': 'Implement lifecycle policies for processed images'
            },
            {
                'priority': 'LOW',
                'category': 'SECURITY',
                'title': 'Enhance content moderation',
                'description': 'Strengthen content moderation policies',
                'action': 'Update moderation thresholds and review processes'
            }
        ]
        
        return recommendations
```

## Casos de Uso

### **1. Análisis de Imágenes**
```python
# Ejemplo: Análisis completo de imagen
manager = RekognitionManager('us-east-1')

# Detectar etiquetas
labels_result = manager.detect_labels_image(
    image_source='s3://my-bucket/image.jpg',
    max_labels=10,
    min_confidence=70
)

if labels_result['success']:
    print(f"Labels detected: {labels_result['count']}")
    for label in labels_result['labels']:
        print(f"  - {label['name']} ({label['confidence']}%)")

# Detectar rostros
faces_result = manager.detect_faces_image(
    image_source='s3://my-bucket/image.jpg',
    attributes=['ALL']
)

if faces_result['success']:
    print(f"Faces detected: {faces_result['count']}")
    for face in faces_result['faces']:
        print(f"  - Age: {face['age_range']['Low']}-{face['age_range']['High']}")
        print(f"  - Gender: {face['gender']['Value']} ({face['gender']['Confidence']}%)")
```

### **2. Comparación de Rostros**
```python
# Ejemplo: Comparar rostros entre imágenes
comparison_result = manager.compare_faces(
    source_image='s3://my-bucket/person1.jpg',
    target_image='s3://my-bucket/person2.jpg',
    similarity_threshold=70
)

if comparison_result['success']:
    print(f"Face matches: {len(comparison_result['matches'])}")
    for match in comparison_result['matches']:
        print(f"  - Similarity: {match['similarity']}%")
        print(f"  - Face ID: {match['face_id']}")
```

### **3. Detección de Texto (OCR)**
```python
# Ejemplo: Extraer texto de imagen
text_result = manager.detect_text_image(
    image_source='s3://my-bucket/document.jpg'
)

if text_result['success']:
    print(f"Text detected: {text_result['count']} items")
    print(f"Full text: {text_result['full_text']}")
    
    for detection in text_result['text_detections']:
        if detection['type'] == 'LINE':
            print(f"  Line: {detection['detected_text']} ({detection['confidence']}%)")
```

### **4. Análisis de Contenido**
```python
# Ejemplo: Análisis de contenido inapropiado
moderation_result = manager.detect_moderation_labels(
    image_source='s3://my-bucket/content.jpg',
    min_confidence=50
)

if moderation_result['success']:
    print(f"Inappropriate: {moderation_result['is_inappropriate']}")
    print(f"Risk level: {moderation_result['risk_level']}")
    
    for label in moderation_result['moderation_labels']:
        print(f"  - {label['name']} ({label['confidence']}%)")
```

### **5. Reconocimiento de Celebridades**
```python
# Ejemplo: Reconocer celebridades
celebrity_result = manager.recognize_celebrities(
    image_source='s3://my-bucket/photo.jpg'
)

if celebrity_result['success']:
    print(f"Celebrities found: {celebrity_result['count']}")
    for celebrity in celebrity_result['celebrities']:
        print(f"  - {celebrity['name']} ({celebrity['confidence']}%)")
```

### **6. Gestión de Colecciones de Rostros**
```python
# Ejemplo: Crear y usar colección de rostros
# Crear colección
collection_result = manager.create_face_collection(
    collection_id='employee-faces',
    tags={'Department': 'HR'}
)

if collection_result['success']:
    print(f"Collection created: {collection_result['collection_id']}")
    
    # Indexar rostros
    index_result = manager.index_faces(
        collection_id='employee-faces',
        image_source='s3://my-bucket/employee.jpg',
        external_image_id='employee001'
    )
    
    if index_result['success']:
        print(f"Faces indexed: {index_result['count']}")
        
        # Buscar rostros
        search_result = manager.search_faces_by_image(
            collection_id='employee-faces',
            image_source='s3://my-bucket/test-photo.jpg'
        )
        
        if search_result['success']:
            print(f"Matches found: {search_result['count']}")
            for match in search_result['matched_faces']:
                print(f"  - Similarity: {match['similarity']}%")
```

### **7. Análisis Batch**
```python
# Ejemplo: Análisis batch de imágenes
image_sources = [
    's3://my-bucket/image1.jpg',
    's3://my-bucket/image2.jpg',
    's3://my-bucket/image3.jpg'
]

batch_result = manager.analyze_batch_images(
    image_sources=image_sources,
    operations=['labels', 'faces', 'text', 'moderation']
)

if batch_result['success']:
    summary = batch_result['summary']
    print(f"Batch Analysis Summary")
    print(f"Total images: {summary['total_images']}")
    print(f"Successful: {summary['successful_analyses']}")
    print(f"Failed: {summary['failed_analyses']}")
    print(f"Labels detected: {summary['labels_detected']}")
    print(f"Faces detected: {summary['faces_detected']}")
    print(f"Text detected: {summary['text_detected']}")
    print(f"Moderation flags: {summary['moderation_flags']}")
```

## Configuración con AWS CLI

### **Análisis de Imágenes**
```bash
# Detectar etiquetas
aws rekognition detect-labels \
  --image '{"S3Object":{"Bucket":"my-bucket","Name":"image.jpg"}}' \
  --max-labels 10 \
  --min-confidence 70

# Detectar rostros
aws rekognition detect-faces \
  --image '{"S3Object":{"Bucket":"my-bucket","Name":"image.jpg"}}' \
  --attributes ALL

# Comparar rostros
aws rekognition compare-faces \
  --source-image '{"S3Object":{"Bucket":"my-bucket","Name":"person1.jpg"}}' \
  --target-image '{"S3Object":{"Bucket":"my-bucket","Name":"person2.jpg"}}' \
  --similarity-threshold 70

# Detectar texto
aws rekognition detect-text \
  --image '{"S3Object":{"Bucket":"my-bucket","Name":"document.jpg"}}'

# Detectar contenido inapropiado
aws rekognition detect-moderation-labels \
  --image '{"S3Object":{"Bucket":"my-bucket","Name":"content.jpg"}}' \
  --min-confidence 50

# Reconocer celebridades
aws rekognition recognize-celebrities \
  --image '{"S3Object":{"Bucket":"my-bucket","Name":"photo.jpg"}}'
```

### **Gestión de Colecciones**
```bash
# Crear colección
aws rekognition create-collection \
  --collection-id employee-faces

# Indexar rostros
aws rekognition index-faces \
  --collection-id employee-faces \
  --image '{"S3Object":{"Bucket":"my-bucket","Name":"employee.jpg"}}' \
  --external-image-id employee001

# Buscar rostros
aws rekognition search-faces-by-image \
  --collection-id employee-faces \
  --image '{"S3Object":{"Bucket":"my-bucket","Name":"test-photo.jpg"}}' \
  --face-match-threshold 70

# Listar colecciones
aws rekognition list-collections

# Eliminar colección
aws rekognition delete-collection --collection-id employee-faces
```

### **Análisis de Video**
```bash
# Iniciar detección de etiquetas en video
aws rekognition start-label-detection \
  --video '{"S3Object":{"Bucket":"my-bucket","Name":"video.mp4"}}' \
  --notification-channel '{"SNSTopicArn":"arn:aws:sns:region:account-id:rekognition-topic"}'

# Iniciar detección de rostros en video
aws rekognition start-face-detection \
  --video '{"S3Object":{"Bucket":"my-bucket","Name":"video.mp4"}}' \
  --notification-channel '{"SNSTopicArn":"arn:aws:sns:region:account-id:rekognition-topic"}' \
  --face-attributes ALL

# Obtener estado del trabajo
aws rekognition get-label-detection --job-id job-id

# Obtener detecciones de rostros
aws rekognition get-face-detection --job-id job-id
```

## Mejores Prácticas

### **1. Optimización de Imágenes**
- Preprocesar imágenes para mejorar calidad
- Usar formatos de imagen óptimos (JPEG, PNG)
- Implementar redimensionamiento apropiado
- Considerar compresión para reducir costos

### **2. Gestión de Colecciones**
- Limitar tamaño de colecciones para mejor rendimiento
- Implementar limpieza regular de rostros no utilizados
- Usar IDs externos consistentes
- Documentar propósito de cada colección

### **3. Control de Costos**
- Monitorear uso de API regularmente
- Implementar caching para resultados repetidos
- Usar umbrales de confianza apropiados
- Optimizar tamaño de imágenes y videos

### **4. Seguridad y Privacidad**
- Implementar moderación de contenido
- Cumplir con regulaciones de privacidad (GDPR, CCPA)
- Encriptar datos sensibles
- Implementar auditoría de accesos

## Costos

### **Precios de AWS Rekognition**
- **Análisis de Imágenes**: $0.001 por imagen
- **Análisis de Video**: $0.10 por minuto de video
- **Comparación de Rostros**: $0.001 por comparación
- **Detección de Texto**: $0.001 por imagen
- **Moderación de Contenido**: $0.001 por imagen
- **Reconocimiento de Celebridades**: $0.001 por imagen

### **Almacenamiento de Colecciones**
- **Almacenamiento de Rostros**: $0.0001 por rostro por mes
- **Almacenamiento de Metadatos**: $0.00001 por KB por mes

### **Ejemplo de Costos Mensuales**
- **10,000 imágenes**: 10,000 × $0.001 = $10.00
- **100 minutos de video**: 100 × $0.10 = $10.00
- **1,000 rostros en colección**: 1,000 × $0.0001 = $0.10
- **Total estimado**: ~$20.10 por mes

## Troubleshooting

### **Problemas Comunes**
1. **Baja precisión**: Mejorar calidad de imágenes
2. **Tiempo de respuesta alto**: Optimizar tamaño de imágenes
3. **Costos elevados**: Implementar caching y optimización
4. **Errores de API**: Verificar permisos y formato de entrada

### **Comandos de Diagnóstico**
```bash
# Verificar estado de trabajo de video
aws rekognition get-label-detection --job-id job-id

# Verificar detalles de colección
aws rekognition describe-collection --collection-id my-collection

# Verificar procesador de stream
aws rekognition describe-stream-processor --name my-processor

# Verificar logs de Lambda
aws logs tail /aws/lambda/rekognition-monitor --follow
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
- **Almacenamiento**: Almacenamiento de imágenes y videos
- **Eventos**: Eventos S3 para procesamiento automático
- **Versioning**: Control de versiones de archivos
- **Lifecycle**: Gestión de ciclo de vida de datos

### **AWS Lambda**
- **Procesamiento**: Procesamiento automático de imágenes
- **Eventos**: Respuesta a eventos de Rekognition
- **Transformación**: Transformación de datos
- **Integración**: Integración con otros servicios

### **AWS SNS**
- **Notificaciones**: Notificaciones de estado de trabajos
- **Alertas**: Alertas de contenido inapropiado
- **Eventos**: Eventos de finalización de procesamiento
- **Comunicación**: Comunicación entre servicios

### **AWS CloudWatch**
- **Monitoreo**: Monitoreo de métricas y rendimiento
- **Alarmas**: Alarmas para eventos críticos
- **Logs**: Almacenamiento de logs de aplicaciones
- **Dashboards**: Visualización de métricas

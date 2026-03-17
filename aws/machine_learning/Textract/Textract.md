# AWS Textract

## Definición

AWS Textract es un servicio de machine learning que extrae texto y datos de documentos de forma automática. Utiliza tecnología de OCR (Reconocimiento Óptico de Caracteres) avanzada junto con machine learning para identificar, extraer y analizar texto, formularios, tablas y otros datos de documentos escaneados, imágenes y archivos PDF con alta precisión.

## Características Principales

### **Extracción de Texto**
- **OCR Avanzado**: Reconocimiento óptico de caracteres de alta precisión
- **Múltiples Idiomas**: Soporte para más de 100 idiomas y scripts
- **Manuscrito y Impreso**: Detección de texto tanto manuscrito como impreso
- **Layout Analysis**: Análisis de diseño y estructura de documentos
- **Confidence Scores**: Puntuaciones de confianza para cada texto detectado

### **Análisis de Formularios**
- **Form Detection**: Detección automática de formularios en documentos
- **Key-Value Pairs**: Extracción de pares clave-valor de formularios
- **Table Extraction**: Extracción de datos tabulares de documentos
- **Field Mapping**: Mapeo automático de campos de formulario
- **Form Templates**: Soporte para plantillas de formulario personalizadas

### **Análisis de Documentos**
- **Document Analysis**: Análisis completo de estructura de documentos
- **Table Analysis**: Análisis y extracción de tablas complejas
- **Relationship Detection**: Detección de relaciones entre elementos
- **Block Classification**: Clasificación de bloques de contenido
- **Hierarchical Structure**: Estructura jerárquica de documentos

### **Características Avanzadas**
- **Queries**: Consultas específicas para extraer información
- **Expense Analysis**: Análisis especializado para recibos y facturas
- **ID Document Analysis**: Análisis de documentos de identidad
- **Signature Detection**: Detección de firmas en documentos
- **Bounding Boxes**: Delimitación precisa de áreas de texto

## Tipos de Operaciones

### **1. Operaciones de Texto**
- **DetectDocumentText**: Detectar texto en documentos
- **AnalyzeDocument**: Analizar estructura completa del documento
- **StartDocumentAnalysis**: Iniciar análisis asíncrono de documento
- **GetDocumentAnalysis**: Obtener resultados del análisis de documento
- **StopDocumentAnalysis**: Detener análisis de documento

### **2. Operaciones de Formularios**
- **AnalyzeDocument**: Análisis de formularios y tablas
- **StartDocumentTextDetection**: Iniciar detección de texto asíncrona
- **GetDocumentTextDetection**: Obtener resultados de detección de texto
- **StopDocumentTextDetection**: Detener detección de texto

### **3. Operaciones de Consultas**
- **AnalyzeDocument**: Análisis con consultas específicas
- **StartExpenseAnalysis**: Iniciar análisis de gastos
- **GetExpenseAnalysis**: Obtener resultados de análisis de gastos
- **StartDocumentAnalysis**: Iniciar análisis con consultas

### **4. Operaciones de Adaptación**
- **CreateAdapter**: Crear adaptador personalizado
- **CreateAdapterVersion**: Crear versión de adaptador
- **DescribeAdapter**: Describir adaptador
- **ListAdapters**: Listar adaptadores
- **DeleteAdapter**: Eliminar adaptador

## Arquitectura de AWS Textract

### **Componentes Principales**
```
AWS Textract Architecture
├── Input Layer
│   ├── Document Upload
│   ├── Image Processing
│   ├── Format Validation
│   ├── Quality Assessment
│   └── Preprocessing
├── OCR Engine Layer
│   ├── Text Recognition
│   ├── Language Detection
│   ├── Script Identification
│   ├── Confidence Scoring
│   └── Layout Analysis
├── Analysis Layer
│   ├── Form Analysis
│   ├── Table Extraction
│   ├── Key-Value Extraction
│   ├── Relationship Detection
│   └── Block Classification
├── Query Layer
│   ├── Query Processing
│   ├── Information Extraction
│   ├── Custom Queries
│   ├── Response Formatting
│   └── Result Aggregation
└── Integration Layer
    ├── REST APIs
    ├── SDK Support
    ├── Event Notifications
    ├── Batch Processing
    └── Third-party Integration
```

### **Flujo de Procesamiento**
```
Document Input → OCR Processing → Form Analysis → Query Processing → Result Output
```

## Configuración de AWS Textract

### **Gestión Completa de AWS Textract**
```python
import boto3
import json
import time
import base64
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import pandas as pd
import numpy as np

class TextractManager:
    def __init__(self, region='us-east-1'):
        self.textract = boto3.client('textract', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.lambda_client = boto3.client('lambda', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.region = region
    
    def detect_document_text(self, document_source, features=None):
        """Detectar texto en documento"""
        
        try:
            params = {'Document': document_source}
            
            if features:
                params['FeatureTypes'] = features
            
            response = self.textract.detect_document_text(**params)
            
            text_blocks = []
            for block in response['Blocks']:
                block_info = {
                    'block_id': block['Id'],
                    'block_type': block['BlockType'],
                    'confidence': block.get('Confidence', 0),
                    'text': block.get('Text', ''),
                    'geometry': block.get('Geometry', {}),
                    'relationships': block.get('Relationships', [])
                }
                
                if 'BoundingBox' in block['Geometry']:
                    block_info['bounding_box'] = block['Geometry']['BoundingBox']
                
                text_blocks.append(block_info)
            
            return {
                'success': True,
                'text_blocks': text_blocks,
                'total_blocks': len(text_blocks)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_document(self, document_source, features=None, queries_config=None):
        """Analizar documento completo"""
        
        try:
            params = {'Document': document_source}
            
            if features:
                params['FeatureTypes'] = features
            
            if queries_config:
                params['QueriesConfig'] = queries_config
            
            response = self.textract.analyze_document(**params)
            
            analysis_results = {
                'blocks': [],
                'text_content': '',
                'forms': {},
                'tables': [],
                'queries': {},
                'key_value_pairs': []
            }
            
            # Procesar bloques
            for block in response['Blocks']:
                block_info = {
                    'block_id': block['Id'],
                    'block_type': block['BlockType'],
                    'confidence': block.get('Confidence', 0),
                    'text': block.get('Text', ''),
                    'geometry': block.get('Geometry', {}),
                    'relationships': block.get('Relationships', [])
                }
                
                if 'BoundingBox' in block['Geometry']:
                    block_info['bounding_box'] = block['Geometry']['BoundingBox']
                
                analysis_results['blocks'].append(block_info)
                
                # Extraer texto
                if block['BlockType'] == 'LINE':
                    analysis_results['text_content'] += block['Text'] + '\n'
                
                # Extraer pares clave-valor
                elif block['BlockType'] == 'KEY_VALUE_SET':
                    if 'ENTITY' in block.get('EntityTypes', []):
                        # Es una clave
                        key_text = block.get('Text', '')
                        if 'Relationships' in block:
                            for relationship in block['Relationships']:
                                if relationship['Type'] == 'VALUE':
                                    for child_id in relationship['Ids']:
                                        # Encontrar el valor correspondiente
                                        for child_block in response['Blocks']:
                                            if child_block['Id'] == child_id and child_block['BlockType'] == 'KEY_VALUE_SET':
                                                value_text = child_block.get('Text', '')
                                                analysis_results['key_value_pairs'].append({
                                                    'key': key_text,
                                                    'value': value_text,
                                                    'confidence': block.get('Confidence', 0)
                                                })
                
                # Extraer tablas
                elif block['BlockType'] == 'TABLE':
                    table_info = {
                        'table_id': block['Id'],
                        'confidence': block.get('Confidence', 0),
                        'rows': [],
                        'geometry': block.get('Geometry', {})
                    }
                    analysis_results['tables'].append(table_info)
                
                # Extraer consultas
                elif block['BlockType'] == 'QUERY':
                    query_info = {
                        'query_id': block['Id'],
                        'text': block.get('Text', ''),
                        'confidence': block.get('Confidence', 0),
                        'answer': '',
                        'answer_confidence': 0
                    }
                    
                    # Buscar respuesta
                    if 'Relationships' in block:
                        for relationship in block['Relationships']:
                            if relationship['Type'] == 'ANSWER':
                                for child_id in relationship['Ids']:
                                    for child_block in response['Blocks']:
                                        if child_block['Id'] == child_id:
                                            query_info['answer'] = child_block.get('Text', '')
                                            query_info['answer_confidence'] = child_block.get('Confidence', 0)
                    
                    analysis_results['queries'][query_info['query_id']] = query_info
            
            return {
                'success': True,
                'analysis_results': analysis_results
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def start_document_text_detection(self, document_source, client_request_token=None,
                                     job_tag=None, notification_channel=None,
                                     output_config=None, kms_key_id=None):
        """Iniciar detección de texto asíncrona"""
        
        try:
            params = {'DocumentLocation': document_source}
            
            if client_request_token:
                params['ClientRequestToken'] = client_request_token
            
            if job_tag:
                params['JobTag'] = job_tag
            
            if notification_channel:
                params['NotificationChannel'] = notification_channel
            
            if output_config:
                params['OutputConfig'] = output_config
            
            if kms_key_id:
                params['KMSKeyId'] = kms_key_id
            
            response = self.textract.start_document_text_detection(**params)
            
            return {
                'success': True,
                'job_id': response['JobId'],
                'job_arn': response['JobArn'],
                'status': 'IN_PROGRESS'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_document_text_detection(self, job_id, max_results=1000, next_token=None):
        """Obtener resultados de detección de texto"""
        
        try:
            params = {'JobId': job_id, 'MaxResults': max_results}
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.textract.get_document_text_detection(**params)
            
            detection_results = {
                'job_id': response['JobId'],
                'status': response['JobStatus'],
                'status_message': response.get('StatusMessage', ''),
                'document_metadata': response.get('DocumentMetadata', {}),
                'blocks': [],
                'next_token': response.get('NextToken'),
                'detect_document_text_model_version': response.get('DetectDocumentTextModelVersion', '')
            }
            
            for block in response['Blocks']:
                block_info = {
                    'block_id': block['Id'],
                    'block_type': block['BlockType'],
                    'confidence': block.get('Confidence', 0),
                    'text': block.get('Text', ''),
                    'geometry': block.get('Geometry', {}),
                    'relationships': block.get('Relationships', [])
                }
                
                if 'BoundingBox' in block['Geometry']:
                    block_info['bounding_box'] = block['Geometry']['BoundingBox']
                
                detection_results['blocks'].append(block_info)
            
            return {
                'success': True,
                'detection_results': detection_results
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def start_document_analysis(self, document_source, feature_types, client_request_token=None,
                              job_tag=None, notification_channel=None, output_config=None,
                              kms_key_id=None, queries_config=None):
        """Iniciar análisis de documento asíncrono"""
        
        try:
            params = {
                'DocumentLocation': document_source,
                'FeatureTypes': feature_types
            }
            
            if client_request_token:
                params['ClientRequestToken'] = client_request_token
            
            if job_tag:
                params['JobTag'] = job_tag
            
            if notification_channel:
                params['NotificationChannel'] = notification_channel
            
            if output_config:
                params['OutputConfig'] = output_config
            
            if kms_key_id:
                params['KMSKeyId'] = kms_key_id
            
            if queries_config:
                params['QueriesConfig'] = queries_config
            
            response = self.textract.start_document_analysis(**params)
            
            return {
                'success': True,
                'job_id': response['JobId'],
                'job_arn': response['JobArn'],
                'status': 'IN_PROGRESS'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_document_analysis(self, job_id, max_results=1000, next_token=None):
        """Obtener resultados de análisis de documento"""
        
        try:
            params = {'JobId': job_id, 'MaxResults': max_results}
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.textract.get_document_analysis(**params)
            
            analysis_results = {
                'job_id': response['JobId'],
                'status': response['JobStatus'],
                'status_message': response.get('StatusMessage', ''),
                'document_metadata': response.get('DocumentMetadata', {}),
                'blocks': [],
                'next_token': response.get('NextToken'),
                'analyze_document_model_version': response.get('AnalyzeDocumentModelVersion', '')
            }
            
            for block in response['Blocks']:
                block_info = {
                    'block_id': block['Id'],
                    'block_type': block['BlockType'],
                    'confidence': block.get('Confidence', 0),
                    'text': block.get('Text', ''),
                    'geometry': block.get('Geometry', {}),
                    'relationships': block.get('Relationships', [])
                }
                
                if 'BoundingBox' in block['Geometry']:
                    block_info['bounding_box'] = block['Geometry']['BoundingBox']
                
                analysis_results['blocks'].append(block_info)
            
            return {
                'success': True,
                'analysis_results': analysis_results
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def start_expense_analysis(self, document_source, client_request_token=None,
                             job_tag=None, notification_channel=None, output_config=None,
                             kms_key_id=None):
        """Iniciar análisis de gastos"""
        
        try:
            params = {'DocumentLocation': document_source}
            
            if client_request_token:
                params['ClientRequestToken'] = client_request_token
            
            if job_tag:
                params['JobTag'] = job_tag
            
            if notification_channel:
                params['NotificationChannel'] = notification_channel
            
            if output_config:
                params['OutputConfig'] = output_config
            
            if kms_key_id:
                params['KMSKeyId'] = kms_key_id
            
            response = self.textract.start_expense_analysis(**params)
            
            return {
                'success': True,
                'job_id': response['JobId'],
                'job_arn': response['JobArn'],
                'status': 'IN_PROGRESS'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_expense_analysis(self, job_id, max_results=1000, next_token=None):
        """Obtener resultados de análisis de gastos"""
        
        try:
            params = {'JobId': job_id, 'MaxResults': max_results}
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.textract.get_expense_analysis(**params)
            
            expense_results = {
                'job_id': response['JobId'],
                'status': response['JobStatus'],
                'status_message': response.get('StatusMessage', ''),
                'document_metadata': response.get('DocumentMetadata', {}),
                'expense_documents': [],
                'next_token': response.get('NextToken')
            }
            
            for expense_doc in response['ExpenseDocuments']:
                doc_info = {
                    'expense_index': expense_doc['ExpenseIndex'],
                    'summary_fields': {},
                    'line_items': [],
                    'blocks': []
                }
                
                # Extraer campos de resumen
                if 'SummaryFields' in expense_doc:
                    for field in expense_doc['SummaryFields']:
                        field_info = {
                            'type': field['Type']['Text'],
                            'label_detection': field.get('LabelDetection', {}),
                            'value_detection': field.get('ValueDetection', {})
                        }
                        doc_info['summary_fields'][field['Type']['Text']] = field_info
                
                # Extraer líneas de ítems
                if 'LineItems' in expense_doc:
                    for item in expense_doc['LineItems']:
                        item_info = {
                            'line_item_index': item['LineItemIndex'],
                            'fields': []
                        }
                        
                        if 'Fields' in item:
                            for field in item['Fields']:
                                field_info = {
                                    'type': field['Type']['Text'],
                                    'label_detection': field.get('LabelDetection', {}),
                                    'value_detection': field.get('ValueDetection', {})
                                }
                                item_info['fields'].append(field_info)
                        
                        doc_info['line_items'].append(item_info)
                
                # Extraer bloques
                if 'Blocks' in expense_doc:
                    for block in expense_doc['Blocks']:
                        block_info = {
                            'block_id': block['Id'],
                            'block_type': block['BlockType'],
                            'confidence': block.get('Confidence', 0),
                            'text': block.get('Text', ''),
                            'geometry': block.get('Geometry', {})
                        }
                        doc_info['blocks'].append(block_info)
                
                expense_results['expense_documents'].append(doc_info)
            
            return {
                'success': True,
                'expense_results': expense_results
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_id_document(self, document_source):
        """Analizar documento de identidad"""
        
        try:
            response = self.textract.analyze_id_document(Document=document_source)
            
            id_analysis = {
                'document_metadata': {},
                'identity_document_fields': {},
                'blocks': []
            }
            
            # Extraer metadatos del documento
            if 'DocumentMetadata' in response:
                id_analysis['document_metadata'] = response['DocumentMetadata']
            
            # Extraer campos del documento de identidad
            if 'IdentityDocumentFields' in response:
                for field in response['IdentityDocumentFields']:
                    field_info = {
                        'type': field['Type']['Text'],
                        'value_detection': field.get('ValueDetection', {}),
                        'confidence': field.get('ValueDetection', {}).get('Confidence', 0)
                    }
                    id_analysis['identity_document_fields'][field['Type']['Text']] = field_info
            
            # Extraer bloques
            if 'Blocks' in response:
                for block in response['Blocks']:
                    block_info = {
                        'block_id': block['Id'],
                        'block_type': block['BlockType'],
                        'confidence': block.get('Confidence', 0),
                        'text': block.get('Text', ''),
                        'geometry': block.get('Geometry', {})
                    }
                    id_analysis['blocks'].append(block_info)
            
            return {
                'success': True,
                'id_analysis': id_analysis
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_document_with_queries(self, document_source, queries):
        """Analizar documento con consultas específicas"""
        
        try:
            queries_config = {'Queries': []}
            
            for query in queries:
                query_config = {
                    'Text': query['text'],
                    'Alias': query.get('alias', ''),
                    'Pages': query.get('pages', ['*'])
                }
                queries_config['Queries'].append(query_config)
            
            # Realizar análisis con consultas
            result = self.analyze_document(
                document_source=document_source,
                features=['QUERIES'],
                queries_config=queries_config
            )
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def extract_form_data(self, document_source):
        """Extraer datos de formulario"""
        
        try:
            # Realizar análisis completo con características de formulario
            result = self.analyze_document(
                document_source=document_source,
                features=['FORMS']
            )
            
            if result['success']:
                analysis = result['analysis_results']
                
                # Procesar pares clave-valor
                form_data = {}
                for kv_pair in analysis['key_value_pairs']:
                    form_data[kv_pair['key']] = {
                        'value': kv_pair['value'],
                        'confidence': kv_pair['confidence']
                    }
                
                return {
                    'success': True,
                    'form_data': form_data,
                    'total_fields': len(form_data)
                }
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def extract_table_data(self, document_source):
        """Extraer datos de tablas"""
        
        try:
            # Realizar análisis completo con características de tablas
            result = self.analyze_document(
                document_source=document_source,
                features=['TABLES']
            )
            
            if result['success']:
                analysis = result['analysis_results']
                
                tables_data = []
                
                for table in analysis['tables']:
                    table_info = {
                        'table_id': table['table_id'],
                        'confidence': table['confidence'],
                        'rows': [],
                        'columns': []
                    }
                    
                    # Procesar celdas de la tabla
                    table_cells = []
                    for block in analysis['blocks']:
                        if block['block_type'] == 'CELL':
                            cell_info = {
                                'cell_id': block['block_id'],
                                'row_index': block.get('RowIndex', 0),
                                'column_index': block.get('ColumnIndex', 0),
                                'text': block.get('text', ''),
                                'confidence': block.get('confidence', 0)
                            }
                            table_cells.append(cell_info)
                    
                    # Organizar celdas en filas y columnas
                    if table_cells:
                        # Encontrar dimensiones de la tabla
                        max_row = max(cell['row_index'] for cell in table_cells)
                        max_col = max(cell['column_index'] for cell in table_cells)
                        
                        # Crear matriz de tabla
                        table_matrix = [['' for _ in range(max_col + 1)] for _ in range(max_row + 1)]
                        
                        # Llenar matriz con datos de celdas
                        for cell in table_cells:
                            table_matrix[cell['row_index']][cell['column_index']] = cell['text']
                        
                        # Agregar filas a la tabla
                        for row_idx, row_data in enumerate(table_matrix):
                            table_info['rows'].append({
                                'row_index': row_idx,
                                'cells': row_data
                            })
                        
                        # Agregar columnas
                        for col_idx in range(max_col + 1):
                            column_data = [row[col_idx] for row in table_matrix]
                            table_info['columns'].append({
                                'column_index': col_idx,
                                'cells': column_data
                            })
                    
                    tables_data.append(table_info)
                
                return {
                    'success': True,
                    'tables_data': tables_data,
                    'total_tables': len(tables_data)
                }
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def process_s3_document(self, bucket_name, document_key, features=None):
        """Procesar documento desde S3"""
        
        try:
            document_source = {
                'S3Object': {
                    'Bucket': bucket_name,
                    'Name': document_key
                }
            }
            
            # Determinar tipo de procesamiento basado en características
            if features and 'FORMS' in features:
                result = self.analyze_document(document_source, features)
            elif features and 'TABLES' in features:
                result = self.analyze_document(document_source, features)
            elif features and 'QUERIES' in features:
                result = self.analyze_document(document_source, features)
            else:
                result = self.detect_document_text(document_source, features)
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_batch_processing_workflow(self, bucket_name, prefix, features=None,
                                       notification_channel=None, output_config=None):
        """Crear flujo de procesamiento por lotes"""
        
        try:
            workflow_results = {
                'bucket_name': bucket_name,
                'prefix': prefix,
                'features': features or ['TEXT'],
                'jobs': {},
                'status': 'INITIALIZED'
            }
            
            # Listar documentos en S3
            response = self.s3.list_objects_v2(
                Bucket=bucket_name,
                Prefix=prefix
            )
            
            if 'Contents' in response:
                documents = [obj for obj in response['Contents'] if obj['Key'].endswith(('.pdf', '.jpg', '.jpeg', '.png'))]
                
                for doc in documents:
                    document_source = {
                        'S3Object': {
                            'Bucket': bucket_name,
                            'Name': doc['Key']
                        }
                    }
                    
                    # Crear trabajo asíncrono
                    if 'FORMS' in (features or []) or 'TABLES' in (features or []):
                        job_result = self.start_document_analysis(
                            document_source=document_source,
                            feature_types=features or ['TEXT'],
                            notification_channel=notification_channel,
                            output_config=output_config
                        )
                    else:
                        job_result = self.start_document_text_detection(
                            document_source=document_source,
                            notification_channel=notification_channel,
                            output_config=output_config
                        )
                    
                    if job_result['success']:
                        workflow_results['jobs'][doc['Key']] = job_result['job_id']
                
                workflow_results['status'] = 'COMPLETED'
            
            return {
                'success': True,
                'workflow_results': workflow_results
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_document_quality(self, document_source):
        """Analizar calidad del documento"""
        
        try:
            # Realizar análisis básico para evaluar calidad
            result = self.detect_document_text(document_source)
            
            if result['success']:
                text_blocks = result['text_blocks']
                
                quality_analysis = {
                    'total_blocks': len(text_blocks),
                    'text_blocks': len([b for b in text_blocks if b['block_type'] == 'LINE']),
                    'word_blocks': len([b for b in text_blocks if b['block_type'] == 'WORD']),
                    'average_confidence': 0,
                    'low_confidence_blocks': 0,
                    'readability_score': 0,
                    'recommendations': []
                }
                
                # Calcular confianza promedio
                if text_blocks:
                    confidences = [b['confidence'] for b in text_blocks if b['confidence'] > 0]
                    quality_analysis['average_confidence'] = sum(confidences) / len(confidences) if confidences else 0
                
                # Contar bloques con baja confianza
                quality_analysis['low_confidence_blocks'] = len([b for b in text_blocks if b['confidence'] < 80])
                
                # Calcular puntuación de legibilidad
                if quality_analysis['total_blocks'] > 0:
                    readability_score = (quality_analysis['average_confidence'] / 100) * (1 - quality_analysis['low_confidence_blocks'] / quality_analysis['total_blocks'])
                    quality_analysis['readability_score'] = readability_score * 100
                
                # Generar recomendaciones
                if quality_analysis['average_confidence'] < 85:
                    quality_analysis['recommendations'].append({
                        'priority': 'HIGH',
                        'category': 'QUALITY',
                        'title': 'Low confidence detected',
                        'description': f'Average confidence is {quality_analysis["average_confidence"]:.1f}%',
                        'action': 'Consider improving image quality or resolution'
                    })
                
                if quality_analysis['low_confidence_blocks'] > quality_analysis['total_blocks'] * 0.1:
                    quality_analysis['recommendations'].append({
                        'priority': 'MEDIUM',
                        'category': 'ACCURACY',
                        'title': 'Many low confidence blocks',
                        'description': f'{quality_analysis["low_confidence_blocks"]} blocks with low confidence',
                        'action': 'Review document quality and consider preprocessing'
                    })
                
                if quality_analysis['readability_score'] < 70:
                    quality_analysis['recommendations'].append({
                        'priority': 'MEDIUM',
                        'category': 'READABILITY',
                        'title': 'Low readability score',
                        'description': f'Readability score is {quality_analysis["readability_score"]:.1f}',
                        'action': 'Improve document scanning quality and resolution'
                    })
                
                return {
                    'success': True,
                    'quality_analysis': quality_analysis
                }
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_textract_monitoring(self, sns_topic_arn=None):
        """Configurar monitoreo de Textract"""
        
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
                    Name='textract-alerts',
                    Tags=[
                        {'Key': 'Service', 'Value': 'Textract'},
                        {'Key': 'Purpose', 'Value': 'Monitoring'}
                    ]
                )
                monitoring_setup['sns_topic_arn'] = topic_response['TopicArn']
            
            # Crear función Lambda para monitoreo
            lambda_result = self.create_textract_monitoring_lambda()
            if lambda_result['success']:
                monitoring_setup['lambda_functions'].append(lambda_result['function_arn'])
            
            # Configurar alarmas de CloudWatch
            alarm_result = self.setup_textract_alarms(monitoring_setup['sns_topic_arn'])
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
    
    def create_textract_monitoring_lambda(self):
        """Crear función Lambda para monitoreo de Textract"""
        
        try:
            lambda_code = self._get_textract_lambda_code()
            
            # Crear rol de ejecución
            role_arn = self._create_lambda_execution_role('textract-monitoring-role')
            
            # Crear función Lambda
            response = self.lambda_client.create_function(
                FunctionName='textract-monitor',
                Runtime='python3.9',
                Role=role_arn,
                Handler='lambda_function.lambda_handler',
                Code={
                    'ZipFile': lambda_code
                },
                Description='Lambda function for Textract monitoring',
                Timeout=300,
                Environment={
                    'Variables': {
                        'SNS_TOPIC_ARN': f'arn:aws:sns:{self.region}:123456789012:textract-alerts'
                    }
                },
                Tags={
                    'Service': 'Textract',
                    'Purpose': 'Monitoring'
                }
            )
            
            return {
                'success': True,
                'function_name': 'textract-monitor',
                'function_arn': response['FunctionArn'],
                'role_arn': role_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_textract_lambda_code(self):
        """Obtener código de Lambda para monitoreo de Textract"""
        
        return '''
import json
import boto3
import os
from datetime import datetime

def lambda_handler(event, context):
    sns = boto3.client('sns')
    textract = boto3.client('textract')
    
    sns_topic_arn = os.environ['SNS_TOPIC_ARN']
    
    # Analizar evento de Textract
    event_analysis = analyze_textract_event(event)
    
    if event_analysis['requires_attention']:
        # Enviar alerta
        alert = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': 'TEXTRACT_ALERT',
            'resource_type': event_analysis['resource_type'],
            'resource_name': event_analysis['resource_name'],
            'status': event_analysis['status'],
            'risk_level': event_analysis['risk_level'],
            'recommendations': event_analysis['recommendations']
        }
        
        sns.publish(
            TopicArn=sns_topic_arn,
            Subject=f'Textract Alert: {event_analysis["resource_type"]}',
            Message=json.dumps(alert),
            MessageStructure='string'
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Textract alert sent',
                'resource_type': event_analysis['resource_type'],
                'risk_level': event_analysis['risk_level']
            })
        }
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'No action required'})
    }

def analyze_textract_event(event):
    """Analizar evento de Textract"""
    
    analysis = {
        'requires_attention': False,
        'resource_type': '',
        'resource_name': '',
        'status': '',
        'risk_level': 'LOW',
        'recommendations': []
    }
    
    # Simular análisis de evento
    if 'detail-type' in event:
        detail_type = event['detail-type']
        
        if detail_type == 'Textract Document Analysis State Change':
            detail = event.get('detail', {})
            analysis['resource_type'] = 'DocumentAnalysisJob'
            analysis['resource_name'] = detail.get('JobId', '')
            analysis['status'] = detail.get('Status', '')
            
            # Determinar si requiere atención
            if analysis['status'] == 'FAILED':
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'HIGH'
                analysis['recommendations'].append(f'Investigate document analysis failure: {detail.get("StatusMessage", "Unknown")}')
            elif analysis['status'] == 'PARTIAL_SUCCESS':
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'MEDIUM'
                analysis['recommendations'].append('Partial success detected, review results')
        
        elif detail_type == 'Textract Text Detection State Change':
            detail = event.get('detail', {})
            analysis['resource_type'] = 'TextDetectionJob'
            analysis['resource_name'] = detail.get('JobId', '')
            analysis['status'] = detail.get('Status', '')
            
            if analysis['status'] == 'FAILED':
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'HIGH'
                analysis['recommendations'].append(f'Investigate text detection failure: {detail.get("StatusMessage", "Unknown")}')
        
        elif detail_type == 'Textract Expense Analysis State Change':
            detail = event.get('detail', {})
            analysis['resource_type'] = 'ExpenseAnalysisJob'
            analysis['resource_name'] = detail.get('JobId', '')
            analysis['status'] = detail.get('Status', '')
            
            if analysis['status'] == 'FAILED':
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'HIGH'
                analysis['recommendations'].append(f'Investigate expense analysis failure: {detail.get("StatusMessage", "Unknown")}')
    
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
                Description='Execution role for Textract monitoring Lambda',
                Tags=[
                    {'Key': 'Service', 'Value': 'Lambda'},
                    {'Key': 'Purpose', 'Value': 'TextractMonitoring'}
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
    
    def setup_textract_alarms(self, sns_topic_arn):
        """Configurar alarmas de CloudWatch para Textract"""
        
        try:
            alarms_created = []
            
            # Alarma para trabajos fallidos
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='Textract-FailedJobs',
                    AlarmDescription='Failed Textract jobs detected',
                    Namespace='AWS/Textract',
                    MetricName='FailedJobs',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('Textract-FailedJobs')
            except Exception:
                pass
            
            # Alarma para uso alto
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='Textract-HighUsage',
                    AlarmDescription='High Textract usage detected',
                    Namespace='AWS/Textract',
                    MetricName='DocumentCount',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1000,
                    ComparisonOperator='GreaterThanThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('Textract-HighUsage')
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
    
    def generate_textract_report(self, report_type='comprehensive', time_range_days=30):
        """Generar reporte de Textract"""
        
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
                processing_analysis = self._get_processing_analysis()
                report['processing_analysis'] = processing_analysis
                report['recommendations'] = self._generate_comprehensive_recommendations()
            
            elif report_type == 'usage':
                # Reporte de uso
                report['usage_analysis'] = {
                    'document_processing': self._get_document_processing_stats(),
                    'feature_usage': self._get_feature_usage_stats(),
                    'batch_jobs': self._get_batch_job_stats(),
                    'api_calls': self._get_api_call_stats()
                }
            
            elif report_type == 'quality':
                # Reporte de calidad
                report['quality_assessment'] = {
                    'recognition_accuracy': self._get_recognition_accuracy_stats(),
                    'processing_quality': self._get_processing_quality_stats(),
                    'error_rates': self._get_error_rate_stats(),
                    'quality_trends': self._get_quality_trends()
                }
            
            elif report_type == 'cost':
                # Reporte de costos
                report['cost_breakdown'] = {
                    'text_detection_costs': self._get_text_detection_costs(),
                    'analysis_costs': self._get_analysis_costs(),
                    'batch_costs': self._get_batch_costs(),
                    'storage_costs': self._get_storage_costs(),
                    'total_cost': self._calculate_total_cost()
                }
            
            return {
                'success': True,
                'textract_report': report
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
            'total_documents_processed': 500000,
            'text_detection_jobs': 350000,
            'document_analysis_jobs': 120000,
            'expense_analysis_jobs': 30000,
            'total_pages_processed': 2500000,
            'total_text_blocks': 15000000,
            'total_forms_processed': 80000,
            'total_tables_processed': 45000,
            'average_pages_per_document': 5.0
        }
    
    def _get_performance_metrics(self):
        """Obtener métricas de rendimiento"""
        
        return {
            'average_processing_time': 2.5,  # segundos por página
            'success_rate': 98.7,  # porcentaje
            'average_confidence_score': 94.5,  # porcentaje
            'throughput': 1000,  # páginas por hora
            'system_uptime': 99.95,  # porcentaje
            'api_response_time': 0.8,  # segundos
            'batch_job_completion_rate': 97.8  # porcentaje
        }
    
    def _get_cost_analysis(self):
        """Obtener análisis de costos"""
        
        return {
            'monthly_cost': 2500.00,
            'cost_breakdown': {
                'text_detection': 1000.00,
                'document_analysis': 800.00,
                'expense_analysis': 400.00,
                'batch_processing': 200.00,
                'storage': 100.00
            },
            'cost_trend': 'STABLE',
            'cost_optimization_potential': 15.0  # porcentaje
        }
    
    def _get_processing_analysis(self):
        """Obtener análisis de procesamiento"""
        
        return {
            'document_types': {
                'pdf': 45.2,
                'jpeg': 25.8,
                'png': 15.3,
                'tiff': 8.7,
                'other': 5.0
            },
            'feature_usage': {
                'text_detection': 70.0,
                'forms': 16.0,
                'tables': 8.0,
                'queries': 4.0,
                'expense_analysis': 2.0
            },
            'processing_methods': {
                'synchronous': 65.3,
                'asynchronous': 34.7
            },
            'document_quality': {
                'high_quality': 78.5,
                'medium_quality': 18.2,
                'low_quality': 3.3
            }
        }
    
    def _generate_comprehensive_recommendations(self):
        """Generar recomendaciones comprehensivas"""
        
        recommendations = [
            {
                'priority': 'HIGH',
                'category': 'QUALITY',
                'title': 'Improve document quality',
                'description': 'Enhance document scanning and preprocessing',
                'action': 'Implement quality checks and preprocessing workflows'
            },
            {
                'priority': 'MEDIUM',
                'category': 'COST',
                'title': 'Optimize processing costs',
                'description': 'Reduce costs through efficient processing',
                'action': 'Implement batch processing and optimize feature usage'
            },
            {
                'priority': 'LOW',
                'category': 'PERFORMANCE',
                'title': 'Enhance processing speed',
                'description': 'Improve processing throughput and efficiency',
                'action': 'Optimize document formats and processing parameters'
            }
        ]
        
        return recommendations
```

## Casos de Uso

### **1. Detección de Texto Básica**
```python
# Ejemplo: Detección de texto en documento
manager = TextractManager('us-east-1')

# Procesar documento desde S3
document_source = {
    'S3Object': {
        'Bucket': 'my-documents-bucket',
        'Name': 'sample-document.pdf'
    }
}

# Detectar texto
result = manager.detect_document_text(document_source)

if result['success']:
    text_blocks = result['text_blocks']
    print(f"Total blocks detected: {result['total_blocks']}")
    
    # Mostrar texto extraído
    for block in text_blocks:
        if block['block_type'] == 'LINE':
            print(f"Text: {block['text']}")
            print(f"Confidence: {block['confidence']:.2f}%")
            print(f"Bounding box: {block.get('bounding_box', {})}")
            print("---")
```

### **2. Análisis Completo de Documento**
```python
# Ejemplo: Análisis completo con formularios y tablas
manager = TextractManager('us-east-1')

# Análisis completo
result = manager.analyze_document(
    document_source=document_source,
    features=['FORMS', 'TABLES', 'TEXT']
)

if result['success']:
    analysis = result['analysis_results']
    
    print(f"Document Analysis Results")
    print(f"Total blocks: {len(analysis['blocks'])}")
    print(f"Text content preview:")
    print(analysis['text_content'][:500] + "...")
    
    print(f"\nForm Data ({len(analysis['key_value_pairs'])} fields):")
    for kv in analysis['key_value_pairs'][:5]:  # Mostrar primeros 5
        print(f"  {kv['key']}: {kv['value']} (confidence: {kv['confidence']:.1f}%)")
    
    print(f"\nTables ({len(analysis['tables'])} tables):")
    for table in analysis['tables']:
        print(f"  Table ID: {table['table_id']}")
        print(f"  Confidence: {table['confidence']:.1f}%")
```

### **3. Extracción de Datos de Formulario**
```python
# Ejemplo: Extraer datos específicos de formulario
manager = TextractManager('us-east-1')

# Extraer datos de formulario
result = manager.extract_form_data(document_source)

if result['success']:
    form_data = result['form_data']
    print(f"Form Data Extracted: {result['total_fields']} fields")
    
    # Mostrar campos del formulario
    for field_name, field_data in form_data.items():
        print(f"{field_name}: {field_data['value']}")
        print(f"  Confidence: {field_data['confidence']:.1f}%")
```

### **4. Extracción de Datos de Tablas**
```python
# Ejemplo: Extraer datos de tablas
manager = TextractManager('us-east-1')

# Extraer datos de tablas
result = manager.extract_table_data(document_source)

if result['success']:
    tables_data = result['tables_data']
    print(f"Tables Extracted: {result['total_tables']} tables")
    
    # Mostrar datos de tablas
    for table in tables_data:
        print(f"\nTable {table['table_id']}:")
        print(f"  Confidence: {table['confidence']:.1f}%")
        print(f"  Rows: {len(table['rows'])}")
        print(f"  Columns: {len(table['columns'])}")
        
        # Mostrar primeras filas
        for i, row in enumerate(table['rows'][:3]):
            print(f"    Row {i}: {' | '.join(row['cells'])}")
```

### **5. Análisis con Consultas Específicas**
```python
# Ejemplo: Análisis con consultas personalizadas
manager = TextractManager('us-east-1')

# Definir consultas
queries = [
    {'text': 'What is the invoice number?', 'alias': 'invoice_number'},
    {'text': 'What is the total amount?', 'alias': 'total_amount'},
    {'text': 'What is the due date?', 'alias': 'due_date'},
    {'text': 'Who is the vendor?', 'alias': 'vendor'}
]

# Analizar con consultas
result = manager.analyze_document_with_queries(document_source, queries)

if result['success']:
    analysis = result['analysis_results']
    print(f"Query Analysis Results:")
    
    for query_id, query_info in analysis['queries'].items():
        print(f"\nQuery: {query_info['text']}")
        print(f"Answer: {query_info['answer']}")
        print(f"Answer Confidence: {query_info['answer_confidence']:.1f}%")
```

### **6. Análisis de Documentos de Identidad**
```python
# Ejemplo: Analizar documento de identidad
manager = TextractManager('us-east-1')

# Analizar documento de identidad
result = manager.analyze_id_document(document_source)

if result['success']:
    id_analysis = result['id_analysis']
    print(f"Identity Document Analysis:")
    
    # Mostrar campos extraídos
    for field_name, field_info in id_analysis['identity_document_fields'].items():
        print(f"{field_name}: {field_info['value_detection'].get('Text', '')}")
        print(f"  Confidence: {field_info['confidence']:.1f}%")
```

### **7. Procesamiento por Lotes**
```python
# Ejemplo: Procesamiento por lotes de documentos
manager = TextractManager('us-east-1')

# Configurar notificación
notification_channel = {
    'SNSTopicArn': 'arn:aws:sns:us-east-1:123456789012:textract-notifications',
    'RoleArn': 'arn:aws:iam::123456789012:role/TextractNotificationRole'
}

# Configurar salida
output_config = {
    'S3Bucket': 'my-output-bucket',
    'S3Prefix': 'textract-results/'
}

# Crear flujo de procesamiento por lotes
workflow_result = manager.create_batch_processing_workflow(
    bucket_name='my-documents-bucket',
    prefix='invoices/',
    features=['FORMS', 'TABLES'],
    notification_channel=notification_channel,
    output_config=output_config
)

if workflow_result['success']:
    workflow = workflow_result['workflow_results']
    print(f"Batch Processing Workflow Created")
    print(f"Bucket: {workflow['bucket_name']}")
    print(f"Prefix: {workflow['prefix']}")
    print(f"Features: {workflow['features']}")
    print(f"Jobs created: {len(workflow['jobs'])}")
    
    # Mostrar trabajos creados
    for doc_name, job_id in workflow['jobs'].items():
        print(f"  {doc_name}: {job_id}")
```

### **8. Análisis de Calidad de Documento**
```python
# Ejemplo: Analizar calidad del documento
manager = TextractManager('us-east-1')

# Analizar calidad
quality_result = manager.analyze_document_quality(document_source)

if quality_result['success']:
    quality = quality_result['quality_analysis']
    
    print(f"Document Quality Analysis")
    print(f"Total blocks: {quality['total_blocks']}")
    print(f"Text blocks: {quality['text_blocks']}")
    print(f"Word blocks: {quality['word_blocks']}")
    print(f"Average confidence: {quality['average_confidence']:.1f}%")
    print(f"Low confidence blocks: {quality['low_confidence_blocks']}")
    print(f"Readability score: {quality['readability_score']:.1f}")
    
    # Recomendaciones
    recommendations = quality['recommendations']
    print(f"\nRecommendations: {len(recommendations)}")
    for rec in recommendations:
        print(f"  - {rec['title']} ({rec['priority']})")
        print(f"    {rec['description']}")
        print(f"    Action: {rec['action']}")
```

### **9. Configuración de Monitoreo**
```python
# Ejemplo: Configurar monitoreo de Textract
manager = TextractManager('us-east-1')

monitoring_result = manager.create_textract_monitoring()

if monitoring_result['success']:
    setup = monitoring_result['monitoring_setup']
    print(f"Textract monitoring configured")
    print(f"SNS Topic: {setup['sns_topic_arn']}")
    print(f"Lambda functions: {len(setup['lambda_functions'])}")
    print(f"CloudWatch alarms: {len(setup['cloudwatch_alarms'])}")
```

### **10. Generación de Reportes**
```python
# Ejemplo: Generar reporte comprehensivo
manager = TextractManager('us-east-1')

# Generar reporte
report_result = manager.generate_textract_report(
    report_type='comprehensive',
    time_range_days=30
)

if report_result['success']:
    report = report_result['textract_report']
    
    print(f"Textract Report")
    print(f"Report type: {report['report_metadata']['report_type']}")
    print(f"Generated at: {report['report_metadata']['generated_at']}")
    
    if 'usage_statistics' in report:
        usage = report['usage_statistics']
        print(f"Total documents processed: {usage['total_documents_processed']:,}")
        print(f"Text detection jobs: {usage['text_detection_jobs']:,}")
        print(f"Document analysis jobs: {usage['document_analysis_jobs']:,}")
        print(f"Forms processed: {usage['total_forms_processed']:,}")
    
    if 'performance_metrics' in report:
        performance = report['performance_metrics']
        print(f"Average processing time: {performance['average_processing_time']}s")
        print(f"Success rate: {performance['success_rate']}%")
        print(f"Average confidence: {performance['average_confidence_score']}%")
    
    if 'recommendations' in report:
        recommendations = report['recommendations']
        print(f"Recommendations: {len(recommendations)}")
        for rec in recommendations:
            print(f"  - {rec['title']} ({rec['priority']})")
            print(f"    {rec['description']}")
            print(f"    Action: {rec['action']}")
```

## Configuración con AWS CLI

### **Detección de Texto**
```bash
# Detectar texto en documento
aws textract detect-document-text \
  --document 'S3Object={Bucket=my-bucket,Name=document.pdf}'

# Detectar texto con características
aws textract detect-document-text \
  --document 'S3Object={Bucket=my-bucket,Name=document.pdf}' \
  --feature-types TEXT
```

### **Análisis de Documento**
```bash
# Analizar documento completo
aws textract analyze-document \
  --document 'S3Object={Bucket=my-bucket,Name=document.pdf}' \
  --feature-types FORMS TABLES TEXT

# Analizar con consultas
aws textract analyze-document \
  --document 'S3Object={Bucket=my-bucket,Name=document.pdf}' \
  --feature-types QUERIES \
  --queries-config Queries=[{Text="What is the invoice number?"},{Text="What is the total amount?"}]
```

### **Procesamiento Asíncrono**
```bash
# Iniciar detección de texto asíncrona
aws textract start-document-text-detection \
  --document-location 'S3Object={Bucket=my-bucket,Name=document.pdf}' \
  --notification-channel 'SNSTopicArn=arn:aws:sns:us-east-1:123456789012:textract-notifications,RoleArn=arn:aws:iam::123456789012:role/TextractNotificationRole'

# Obtener resultados de detección de texto
aws textract get-document-text-detection --job-id your-job-id

# Iniciar análisis de documento asíncrono
aws textract start-document-analysis \
  --document-location 'S3Object={Bucket=my-bucket,Name=document.pdf}' \
  --feature-types FORMS TABLES \
  --output-config 'S3Bucket=my-output-bucket,S3Prefix=results/'

# Obtener resultados de análisis
aws textract get-document-analysis --job-id your-job-id
```

### **Análisis de Gastos**
```bash
# Iniciar análisis de gastos
aws textract start-expense-analysis \
  --document-location 'S3Object={Bucket=my-bucket,Name=receipt.jpg}' \
  --output-config 'S3Bucket=my-output-bucket,S3Prefix=expense-results/'

# Obtener resultados de análisis de gastos
aws textract get-expense-analysis --job-id your-expense-job-id
```

### **Análisis de Documentos de Identidad**
```bash
# Analizar documento de identidad
aws textract analyze-id-document \
  --document 'S3Object={Bucket=my-bucket,Name=id-document.jpg}'
```

## Mejores Prácticas

### **1. Preparación de Documentos**
- **High Quality Images**: Usar imágenes de alta resolución y calidad
- **Proper Orientation**: Asegurar orientación correcta de documentos
- **Clean Background**: Usar fondos limpios y sin ruido
- **Adequate Lighting**: Asegurar buena iluminación para documentos físicos
- **File Format Optimization**: Usar formatos optimizados (PDF, JPEG, PNG)

### **2. Optimización de Procesamiento**
- **Batch Processing**: Usar procesamiento por lotes para grandes volúmenes
- **Feature Selection**: Seleccionar características apropiadas para reducir costos
- **Asynchronous Processing**: Usar procesamiento asíncrono para documentos grandes
- **Output Configuration**: Configurar salida adecuada para resultados
- **Error Handling**: Implementar manejo robusto de errores

### **3. Calidad y Precisión**
- **Quality Assessment**: Evaluar calidad de documentos antes del procesamiento
- **Confidence Thresholds**: Usar umbrales de confianza apropiados
- **Result Validation**: Validar resultados post-procesamiento
- **Human Review**: Implementar revisión humana para casos críticos
- **Continuous Improvement**: Mejorar continuamente la calidad de datos

### **4. Seguridad y Cumplimiento**
- **Access Control**: Implementar control de acceso adecuado
- **Data Encryption**: Cifrar datos sensibles
- **Audit Logging**: Mantener logs de auditoría completos
- **Compliance**: Asegurar cumplimiento normativo
- **Data Retention**: Implementar políticas de retención de datos

## Costos

### **Precios de AWS Textract**
- **Text Detection**: $1.50 por 1,000 páginas
- **Form Analysis**: $15.00 por 1,000 páginas
- **Table Analysis**: $15.00 por 1,000 páginas
- **Expense Analysis**: $15.00 por 1,000 páginas
- **ID Document Analysis**: $20.00 por 1,000 páginas
- **Queries**: $1.00 por 1,000 consultas

### **Ejemplo de Costos Mensuales**
- **Text Detection**: 10,000 páginas × $1.50/1000 = $15.00
- **Form Analysis**: 5,000 páginas × $15.00/1000 = $75.00
- **Table Analysis**: 2,000 páginas × $15.00/1000 = $30.00
- **Expense Analysis**: 1,000 páginas × $15.00/1000 = $15.00
- **Queries**: 50,000 consultas × $1.00/1000 = $50.00
- **Total estimado**: ~$185.00 por mes

## Troubleshooting

### **Problemas Comunes**
1. **Baja Precisión**: Mejorar calidad de imágenes y orientación
2. **Procesamiento Lento**: Usar procesamiento asíncrono para documentos grandes
3. **Costos Elevados**: Optimizar selección de características y procesamiento por lotes
4. **Errores de Formato**: Validar formatos de documentos compatibles

### **Comandos de Diagnóstico**
```bash
# Verificar estado del trabajo
aws textract get-document-analysis --job-id your-job-id

# Verificar estado del trabajo de texto
aws textract get-document-text-detection --job-id your-job-id

# Verificar logs de CloudWatch
aws logs tail /aws/textract --follow
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
- **Document Storage**: Almacenamiento de documentos de entrada
- **Result Storage**: Almacenamiento de resultados de procesamiento
- **Batch Processing**: Procesamiento por lotes de documentos
- **Versioning**: Control de versiones de documentos

### **AWS Lambda**
- **Preprocessing**: Preprocesamiento de documentos
- **Postprocessing**: Postprocesamiento de resultados
- **Event Handling**: Manejo de eventos de Textract
- **Custom Logic**: Implementación de lógica personalizada

### **AWS CloudWatch**
- **Monitoring**: Monitoreo de métricas y rendimiento
- **Alarms**: Alarmas para eventos críticos
- **Logs**: Almacenamiento de logs de operaciones
- **Dashboards**: Visualización de métricas

### **AWS IAM**
- **Access Control**: Control de acceso a recursos de Textract
- **Role Management**: Gestión de roles de servicio
- **Permissions**: Permisos específicos para diferentes operaciones
- **Security**: Seguridad de acceso a documentos y resultados

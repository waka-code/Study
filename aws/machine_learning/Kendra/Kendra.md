# AWS Kendra

## Definición

AWS Kendra es un servicio de búsqueda inteligente que utiliza machine learning para proporcionar búsquedas de alta precisión en contenido empresarial. A diferencia de las búsquedas tradicionales basadas en palabras clave, Kendra utiliza procesamiento de lenguaje natural y comprensión contextual para entender la intención del usuario y encontrar respuestas relevantes, incluso cuando no se utilizan las palabras exactas.

## Características Principales

### **Búsqueda Inteligente**
- **Natural Language Processing**: Comprensión del lenguaje natural y contexto
- **Semantic Search**: Búsqueda semántica basada en significado, no solo palabras clave
- **Intent Understanding**: Comprensión de la intención del usuario
- **Contextual Results**: Resultados contextualmente relevantes
- **Query Suggestions**: Sugerencias automáticas de consultas

### **Conectores de Datos**
- **Native Connectors**: Conectores nativos para servicios populares
- **Custom Connectors**: Conectores personalizados para fuentes de datos específicas
- **Real-time Syncing**: Sincronización en tiempo real de contenido
- **Incremental Updates**: Actualizaciones incrementales eficientes
- **Multi-source Integration**: Integración con múltiples fuentes simultáneamente

### **Características Avanzadas**
- **FAQ Extraction**: Extracción automática de preguntas frecuentes
- **Document Summaries**: Resúmenes automáticos de documentos
- **People Search**: Búsqueda de personas y expertos
- **Faceted Search**: Búsqueda facetada para filtrado avanzado
- **Query Expansion**: Expansión automática de consultas

### **Enterprise Features**
- **Access Control**: Control de acceso basado en permisos
- **Audit Logging**: Registro de auditoría completo
- **Customization**: Personalización de resultados y ranking
- **Multi-language Support**: Soporte para múltiples idiomas
- **Compliance**: Cumplimiento con estándares de seguridad

## Tipos de Operaciones

### **1. Operaciones de Índices**
- **CreateIndex**: Crear índice de búsqueda
- **DescribeIndex**: Obtener detalles del índice
- **ListIndices**: Listar índices disponibles
- **UpdateIndex**: Actualizar configuración del índice
- **DeleteIndex**: Eliminar índice

### **2. Operaciones de Conectores**
- **CreateDataSource**: Crear fuente de datos
- **DescribeDataSource**: Obtener detalles de la fuente de datos
- **ListDataSources**: Listar fuentes de datos
- **UpdateDataSource**: Actualizar fuente de datos
- **DeleteDataSource**: Eliminar fuente de datos

### **3. Operaciones de Sincronización**
- **StartDataSourceSyncJob**: Iniciar trabajo de sincronización
- **DescribeDataSourceSyncJob**: Obtener detalles del trabajo de sincronización
- **ListDataSourceSyncJobs**: Listar trabajos de sincronización
- **StopDataSourceSyncJob**: Detener trabajo de sincronización

### **4. Operaciones de Búsqueda**
- **Query**: Realizar consulta de búsqueda
- **GetQuerySuggestions**: Obtener sugerencias de consulta
- **DescribeQuerySuggestionsConfig**: Obtener configuración de sugerencias
- **UpdateQuerySuggestionsConfig**: Actualizar configuración de sugerencias

## Arquitectura de AWS Kendra

### **Componentes Principales**
```
AWS Kendra Architecture
├── Data Ingestion Layer
│   ├── Data Connectors
│   ├── Document Processing
│   ├── Content Extraction
│   ├── Metadata Extraction
│   └── Indexing Pipeline
├── Search Engine Layer
│   ├── Query Processing
│   ├── Natural Language Understanding
│   ├── Semantic Analysis
│   ├── Intent Recognition
│   └── Result Ranking
├── Intelligence Layer
│   ├── Machine Learning Models
│   ├── Entity Recognition
│   ├── Relationship Extraction
│   ├── Context Understanding
│   └── Relevance Scoring
├── Security Layer
│   ├── Access Control
│   ├── Authentication
│   ├── Authorization
│   ├── Audit Logging
│   └── Data Encryption
└── Integration Layer
    ├── APIs
    ├── SDKs
    ├── Web Interface
    ├── Custom Applications
    └── Third-party Integration
```

### **Flujo de Búsqueda**
```
User Query → NLP Processing → Intent Understanding → Document Retrieval → Relevance Ranking → Results
```

## Configuración de AWS Kendra

### **Gestión Completa de AWS Kendra**
```python
import boto3
import json
import time
import base64
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class KendraManager:
    def __init__(self, region='us-east-1'):
        self.kendra = boto3.client('kendra', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.lambda_client = boto3.client('lambda', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.region = region
    
    def create_index(self, index_name, role_arn, edition='DEVELOPER_EDITION',
                    description=None, server_side_encryption_configuration=None,
                    document_metadata_configurations=None, user_token_configurations=None):
        """Crear índice de Kendra"""
        
        try:
            params = {
                'Name': index_name,
                'RoleArn': role_arn,
                'Edition': edition
            }
            
            if description:
                params['Description'] = description
            
            if server_side_encryption_configuration:
                params['ServerSideEncryptionConfiguration'] = server_side_encryption_configuration
            
            if document_metadata_configurations:
                params['DocumentMetadataConfigurationUpdates'] = document_metadata_configurations
            
            if user_token_configurations:
                params['UserTokenConfigurations'] = user_token_configurations
            
            response = self.kendra.create_index(**params)
            
            return {
                'success': True,
                'index_id': response['Id'],
                'index_arn': response['Arn'],
                'index_name': index_name,
                'edition': edition,
                'status': 'CREATING'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_index(self, index_id):
        """Obtener detalles del índice"""
        
        try:
            response = self.kendra.describe_index(Id=index_id)
            
            index_info = {
                'index_id': response['Id'],
                'index_arn': response['Arn'],
                'name': response['Name'],
                'description': response.get('Description', ''),
                'edition': response['Edition'],
                'role_arn': response['RoleArn'],
                'status': response['Status'],
                'created_at': response['CreatedAt'].isoformat() if response.get('CreatedAt') else '',
                'updated_at': response.get('UpdatedAt', '').isoformat() if response.get('UpdatedAt') else '',
                'document_metadata_configurations': response.get('DocumentMetadataConfigurations', []),
                'user_token_configurations': response.get('UserTokenConfigurations', []),
                'server_side_encryption_configuration': response.get('ServerSideEncryptionConfiguration', {}),
                'capacity_units': response.get('CapacityUnits', {}),
                'user_context_policy': response.get('UserContextPolicy', ''),
                'query_suggestions_config': response.get('QuerySuggestionsConfig', {}),
                'error_message': response.get('ErrorMessage', '')
            }
            
            return {
                'success': True,
                'index_info': index_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_indices(self, max_results=100, next_token=None):
        """Listar índices"""
        
        try:
            params = {'MaxResults': max_results}
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.kendra.list_indices(**params)
            
            indices = []
            for index in response['IndexConfigurationSummaryItems']:
                index_info = {
                    'index_id': index['Id'],
                    'index_arn': index['Arn'],
                    'name': index['Name'],
                    'edition': index['Edition'],
                    'status': index['Status'],
                    'created_at': index['CreatedAt'].isoformat() if index.get('CreatedAt') else '',
                    'updated_at': index.get('UpdatedAt', '').isoformat() if index.get('UpdatedAt') else ''
                }
                indices.append(index_info)
            
            return {
                'success': True,
                'indices': indices,
                'count': len(indices),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_index(self, index_id, name=None, description=None,
                    role_arn=None, document_metadata_configurations=None,
                    capacity_units=None):
        """Actualizar configuración del índice"""
        
        try:
            params = {'Id': index_id}
            
            if name:
                params['Name'] = name
            
            if description:
                params['Description'] = description
            
            if role_arn:
                params['RoleArn'] = role_arn
            
            if document_metadata_configurations:
                params['DocumentMetadataConfigurationUpdates'] = document_metadata_configurations
            
            if capacity_units:
                params['CapacityUnits'] = capacity_units
            
            response = self.kendra.update_index(**params)
            
            return {
                'success': True,
                'index_id': index_id,
                'updated': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_index(self, index_id):
        """Eliminar índice"""
        
        try:
            response = self.kendra.delete_index(Id=index_id)
            
            return {
                'success': True,
                'index_id': index_id,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_data_source(self, index_id, name, type, configuration,
                          role_arn, description=None, tags=None):
        """Crear fuente de datos"""
        
        try:
            params = {
                'IndexId': index_id,
                'Name': name,
                'Type': type,
                'Configuration': configuration,
                'RoleArn': role_arn
            }
            
            if description:
                params['Description'] = description
            
            if tags:
                params['Tags'] = tags
            
            response = self.kendra.create_data_source(**params)
            
            return {
                'success': True,
                'data_source_id': response['Id'],
                'data_source_arn': response['Arn'],
                'name': name,
                'type': type
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_data_source(self, index_id, data_source_id):
        """Obtener detalles de la fuente de datos"""
        
        try:
            response = self.kendra.describe_data_source(
                IndexId=index_id,
                Id=data_source_id
            )
            
            data_source_info = {
                'data_source_id': response['Id'],
                'data_source_arn': response['Arn'],
                'index_id': response['IndexId'],
                'name': response['Name'],
                'type': response['Type'],
                'description': response.get('Description', ''),
                'role_arn': response['RoleArn'],
                'configuration': response['Configuration'],
                'status': response['Status'],
                'created_at': response['CreatedAt'].isoformat() if response.get('CreatedAt') else '',
                'updated_at': response.get('UpdatedAt', '').isoformat() if response.get('UpdatedAt') else '',
                'sync_schedule': response.get('SyncSchedule', ''),
                'language_code': response.get('LanguageCode', ''),
                'tags': response.get('Tags', []),
                'error_message': response.get('ErrorMessage', '')
            }
            
            return {
                'success': True,
                'data_source_info': data_source_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_data_sources(self, index_id, type=None, max_results=100, next_token=None):
        """Listar fuentes de datos"""
        
        try:
            params = {
                'IndexId': index_id,
                'MaxResults': max_results
            }
            
            if type:
                params['Type'] = type
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.kendra.list_data_sources(**params)
            
            data_sources = []
            for data_source in response['SummaryItems']:
                data_source_info = {
                    'data_source_id': data_source['Id'],
                    'data_source_arn': data_source['Arn'],
                    'index_id': data_source['IndexId'],
                    'name': data_source['Name'],
                    'type': data_source['Type'],
                    'status': data_source['Status'],
                    'created_at': data_source['CreatedAt'].isoformat() if data_source.get('CreatedAt') else '',
                    'updated_at': data_source.get('UpdatedAt', '').isoformat() if data_source.get('UpdatedAt') else ''
                }
                data_sources.append(data_source_info)
            
            return {
                'success': True,
                'data_sources': data_sources,
                'count': len(data_sources),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_data_source(self, index_id, data_source_id, name=None,
                          configuration=None, role_arn=None, description=None):
        """Actualizar fuente de datos"""
        
        try:
            params = {
                'IndexId': index_id,
                'Id': data_source_id
            }
            
            if name:
                params['Name'] = name
            
            if configuration:
                params['Configuration'] = configuration
            
            if role_arn:
                params['RoleArn'] = role_arn
            
            if description:
                params['Description'] = description
            
            response = self.kendra.update_data_source(**params)
            
            return {
                'success': True,
                'data_source_id': data_source_id,
                'updated': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_data_source(self, index_id, data_source_id):
        """Eliminar fuente de datos"""
        
        try:
            response = self.kendra.delete_data_source(
                IndexId=index_id,
                Id=data_source_id
            )
            
            return {
                'success': True,
                'data_source_id': data_source_id,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def start_data_source_sync_job(self, index_id, data_source_id):
        """Iniciar trabajo de sincronización"""
        
        try:
            response = self.kendra.start_data_source_sync_job(
                IndexId=index_id,
                Id=data_source_id
            )
            
            return {
                'success': True,
                'execution_id': response['ExecutionId'],
                'data_source_id': data_source_id,
                'status': 'SYNCING'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_data_source_sync_job(self, index_id, data_source_id, execution_id):
        """Obtener detalles del trabajo de sincronización"""
        
        try:
            response = self.kendra.describe_data_source_sync_job(
                IndexId=index_id,
                Id=data_source_id,
                ExecutionId=execution_id
            )
            
            job_info = {
                'execution_id': response['ExecutionId'],
                'data_source_id': response['DataSourceId'],
                'index_id': response['IndexId'],
                'status': response['Status'],
                'start_time': response['StartTime'].isoformat() if response.get('StartTime') else '',
                'end_time': response.get('EndTime', '').isoformat() if response.get('EndTime') else '',
                'error_message': response.get('ErrorMessage', ''),
                'metrics_on_error': response.get('MetricsOnError', {}),
                'sync_job_metrics': response.get('SyncJobMetrics', {}),
                'data_source_sync_job_metrics': response.get('DataSourceSyncJobMetrics', {})
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
    
    def list_data_source_sync_jobs(self, index_id, data_source_id, status=None,
                                  start_time_filter=None, max_results=100, next_token=None):
        """Listar trabajos de sincronización"""
        
        try:
            params = {
                'IndexId': index_id,
                'Id': data_source_id,
                'MaxResults': max_results
            }
            
            if status:
                params['StatusFilter'] = status
            
            if start_time_filter:
                params['StartTimeFilter'] = start_time_filter
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.kendra.list_data_source_sync_jobs(**params)
            
            jobs = []
            for job in response['History']:
                job_info = {
                    'execution_id': job['ExecutionId'],
                    'data_source_id': job['DataSourceId'],
                    'index_id': job['IndexId'],
                    'status': job['Status'],
                    'start_time': job['StartTime'].isoformat() if job.get('StartTime') else '',
                    'end_time': job.get('EndTime', '').isoformat() if job.get('EndTime') else '',
                    'error_message': job.get('ErrorMessage', ''),
                    'data_source_sync_job_metrics': job.get('DataSourceSyncJobMetrics', {})
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
    
    def stop_data_source_sync_job(self, index_id, data_source_id, execution_id):
        """Detener trabajo de sincronización"""
        
        try:
            response = self.kendra.stop_data_source_sync_job(
                IndexId=index_id,
                Id=data_source_id,
                ExecutionId=execution_id
            )
            
            return {
                'success': True,
                'execution_id': execution_id,
                'stopped': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def query(self, index_id, query_text, query_result_type='DOCUMENT',
             page_size=10, page_number=1, query_facets=None,
             requested_document_attributes=None, query_filter=None,
             sort_configuration=None, user_context=None,
             visitor_id=None):
        """Realizar consulta de búsqueda"""
        
        try:
            params = {
                'IndexId': index_id,
                'QueryText': query_text,
                'QueryResultType': query_result_type,
                'PageSize': page_size,
                'PageNumber': page_number
            }
            
            if query_facets:
                params['QueryFacets'] = query_facets
            
            if requested_document_attributes:
                params['RequestedDocumentAttributes'] = requested_document_attributes
            
            if query_filter:
                params['QueryFilter'] = query_filter
            
            if sort_configuration:
                params['SortConfiguration'] = sort_configuration
            
            if user_context:
                params['UserContext'] = user_context
            
            if visitor_id:
                params['VisitorId'] = visitor_id
            
            response = self.kendra.query(**params)
            
            query_results = {
                'query_id': response['QueryId'],
                'total_number_of_results': response['TotalNumberOfResults'],
                'result_items': [],
                'facet_results': response.get('FacetResults', []),
                'query_result_type': response.get('QueryResultType', ''),
                'warnings': response.get('Warnings', []),
                'spell_suggestions': response.get('SpellSuggestions', [])
            }
            
            for result in response['ResultItems']:
                result_info = {
                    'id': result['Id'],
                    'type': result['Type'],
                    'format': result.get('Format', ''),
                    'additional_attributes': result.get('AdditionalAttributes', []),
                    'document_attributes': result.get('DocumentAttributes', []),
                    'score_attributes': result.get('ScoreAttributes', {}),
                    'document_title': result.get('DocumentTitle', ''),
                    'document_excerpt': result.get('DocumentExcerpt', ''),
                    'document_uri': result.get('DocumentURI', ''),
                    'feedback_token': result.get('FeedbackToken', '')
                }
                query_results['result_items'].append(result_info)
            
            return {
                'success': True,
                'query_results': query_results
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_query_suggestions(self, index_id, query_text, max_suggestions=10,
                             attribute_filter=None):
        """Obtener sugerencias de consulta"""
        
        try:
            params = {
                'IndexId': index_id,
                'QueryText': query_text,
                'MaxSuggestions': max_suggestions
            }
            
            if attribute_filter:
                params['AttributeFilter'] = attribute_filter
            
            response = self.kendra.get_query_suggestions(**params)
            
            suggestions = []
            for suggestion in response['Suggestions']:
                suggestion_info = {
                    'id': suggestion['Id'],
                    'value': suggestion['Value'],
                    'source': suggestion.get('Source', ''),
                    'document_attributes': suggestion.get('DocumentAttributes', [])
                }
                suggestions.append(suggestion_info)
            
            return {
                'success': True,
                'suggestions': suggestions,
                'count': len(suggestions)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_s3_data_source(self, index_id, name, bucket_name, role_arn,
                             description=None, include_patterns=None,
                             exclude_patterns=None, tags=None):
        """Crear fuente de datos S3"""
        
        try:
            configuration = {
                'S3Configuration': {
                    'BucketName': bucket_name
                }
            }
            
            if include_patterns:
                configuration['S3Configuration']['InclusionPrefixes'] = include_patterns
            
            if exclude_patterns:
                configuration['S3Configuration']['ExclusionPrefixes'] = exclude_patterns
            
            result = self.create_data_source(
                index_id=index_id,
                name=name,
                type='S3',
                configuration=configuration,
                role_arn=role_arn,
                description=description,
                tags=tags
            )
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_web_crawler_data_source(self, index_id, name, urls, role_arn,
                                       description=None, crawl_depth=None,
                                       max_urls_per_crawl=None, tags=None):
        """Crear fuente de datos Web Crawler"""
        
        try:
            configuration = {
                'WebCrawlerConfiguration': {
                    'Urls': urls
                }
            }
            
            if crawl_depth:
                configuration['WebCrawlerConfiguration']['CrawlDepth'] = crawl_depth
            
            if max_urls_per_crawl:
                configuration['WebCrawlerConfiguration']['MaxUrlsPerCrawl'] = max_urls_per_crawl
            
            result = self.create_data_source(
                index_id=index_id,
                name=name,
                type='WEBCRAWLER',
                configuration=configuration,
                role_arn=role_arn,
                description=description,
                tags=tags
            )
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_sharepoint_data_source(self, index_id, name, share_point_urls,
                                     role_arn, secret_arn, description=None,
                                     tags=None):
        """Crear fuente de datos SharePoint"""
        
        try:
            configuration = {
                'SharePointConfiguration': {
                    'SharePointVersion': 'SHAREPOINT_ONLINE',
                    'Urls': share_point_urls,
                    'SecretArn': secret_arn
                }
            }
            
            result = self.create_data_source(
                index_id=index_id,
                name=name,
                type='SHAREPOINT',
                configuration=configuration,
                role_arn=role_arn,
                description=description,
                tags=tags
            )
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_database_data_source(self, index_id, name, database_engine,
                                    connection_string, role_arn,
                                    table_configuration=None,
                                    description=None, tags=None):
        """Crear fuente de datos de base de datos"""
        
        try:
            configuration = {
                'DatabaseConfiguration': {
                    'DatabaseEngineType': database_engine,
                    'ConnectionConfiguration': {
                        'DatabaseHost': connection_string['host'],
                        'DatabasePort': connection_string['port'],
                        'DatabaseName': connection_string['database'],
                        'SecretArn': connection_string['secret_arn']
                    }
                }
            }
            
            if table_configuration:
                configuration['DatabaseConfiguration']['TableConfiguration'] = table_configuration
            
            result = self.create_data_source(
                index_id=index_id,
                name=name,
                type='DATABASE',
                configuration=configuration,
                role_arn=role_arn,
                description=description,
                tags=tags
            )
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_complete_kendra_setup(self, project_name, data_sources_config,
                                   role_arn, edition='DEVELOPER_EDITION'):
        """Crear configuración completa de Kendra"""
        
        try:
            setup_results = {
                'project_name': project_name,
                'index': None,
                'data_sources': {},
                'sync_jobs': {},
                'status': 'IN_PROGRESS'
            }
            
            # 1. Crear índice
            index_result = self.create_index(
                index_name=f'{project_name}-index',
                role_arn=role_arn,
                edition=edition,
                description=f'Kendra index for {project_name}'
            )
            
            if index_result['success']:
                setup_results['index'] = index_result['index_id']
                
                # Esperar a que el índice esté activo
                time.sleep(60)
                
                # 2. Crear fuentes de datos
                for data_source_name, config in data_sources_config.items():
                    data_source_type = config.get('type', 'S3')
                    
                    if data_source_type == 'S3':
                        data_source_result = self.create_s3_data_source(
                            index_id=index_result['index_id'],
                            name=f'{project_name}-{data_source_name}',
                            bucket_name=config['bucket_name'],
                            role_arn=role_arn,
                            description=config.get('description', ''),
                            include_patterns=config.get('include_patterns'),
                            exclude_patterns=config.get('exclude_patterns')
                        )
                    
                    elif data_source_type == 'WEBCRAWLER':
                        data_source_result = self.create_web_crawler_data_source(
                            index_id=index_result['index_id'],
                            name=f'{project_name}-{data_source_name}',
                            urls=config['urls'],
                            role_arn=role_arn,
                            description=config.get('description', ''),
                            crawl_depth=config.get('crawl_depth'),
                            max_urls_per_crawl=config.get('max_urls_per_crawl')
                        )
                    
                    elif data_source_type == 'SHAREPOINT':
                        data_source_result = self.create_sharepoint_data_source(
                            index_id=index_result['index_id'],
                            name=f'{project_name}-{data_source_name}',
                            share_point_urls=config['share_point_urls'],
                            role_arn=role_arn,
                            secret_arn=config['secret_arn'],
                            description=config.get('description', '')
                        )
                    
                    elif data_source_type == 'DATABASE':
                        data_source_result = self.create_database_data_source(
                            index_id=index_result['index_id'],
                            name=f'{project_name}-{data_source_name}',
                            database_engine=config['database_engine'],
                            connection_string=config['connection_string'],
                            role_arn=role_arn,
                            table_configuration=config.get('table_configuration'),
                            description=config.get('description', '')
                        )
                    
                    else:
                        continue
                    
                    if data_source_result['success']:
                        setup_results['data_sources'][data_source_name] = data_source_result['data_source_id']
                        
                        # 3. Iniciar sincronización
                        sync_result = self.start_data_source_sync_job(
                            index_id=index_result['index_id'],
                            data_source_id=data_source_result['data_source_id']
                        )
                        
                        if sync_result['success']:
                            setup_results['sync_jobs'][data_source_name] = sync_result['execution_id']
                
                setup_results['status'] = 'COMPLETED'
            
            return {
                'success': True,
                'setup_results': setup_results
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_search_performance(self, index_id, time_range_days=30):
        """Analizar rendimiento de búsqueda"""
        
        try:
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(days=time_range_days)
            
            # Simulación de análisis de rendimiento
            performance_analysis = {
                'index_id': index_id,
                'time_range': {
                    'start_time': start_time.isoformat(),
                    'end_time': end_time.isoformat()
                },
                'query_metrics': {
                    'total_queries': 15000,
                    'unique_queries': 8500,
                    'average_response_time': 0.85,  # segundos
                    'success_rate': 98.5,  # porcentaje
                    'average_results_per_query': 12.3,
                    'zero_result_queries': 3.2,  # porcentaje
                    'click_through_rate': 45.8  # porcentaje
                },
                'popular_queries': [
                    {'query': 'employee handbook', 'frequency': 450},
                    {'query': 'it support', 'frequency': 380},
                    {'query': 'vacation policy', 'frequency': 320},
                    {'query': 'benefits information', 'frequency': 280},
                    {'query': 'training materials', 'frequency': 250}
                ],
                'document_access_patterns': {
                    'most_accessed': [
                        {'document': 'Employee Handbook 2024', 'access_count': 1250},
                        {'document': 'IT Security Policy', 'access_count': 980},
                        {'document': 'Benefits Guide', 'access_count': 850}
                    ],
                    'least_accessed': [
                        {'document': 'Legacy Process Documentation', 'access_count': 15},
                        {'document': 'Archived Project Files', 'access_count': 8}
                    ]
                },
                'search_quality_metrics': {
                    'relevance_score': 4.2,  # escala 1-5
                    'user_satisfaction': 4.1,  # escala 1-5
                    'query_refinement_rate': 22.5,  # porcentaje
                    'search abandonment_rate': 8.3  # porcentaje
                }
            }
            
            # Generar recomendaciones
            recommendations = []
            
            if performance_analysis['query_metrics']['average_response_time'] > 1.0:
                recommendations.append({
                    'priority': 'HIGH',
                    'category': 'PERFORMANCE',
                    'title': 'Optimize query response time',
                    'description': f'Average response time is {performance_analysis["query_metrics"]["average_response_time"]}s',
                    'action': 'Consider increasing index capacity or optimizing data sources'
                })
            
            if performance_analysis['query_metrics']['zero_result_queries'] > 5.0:
                recommendations.append({
                    'priority': 'MEDIUM',
                    'category': 'QUALITY',
                    'title': 'Reduce zero-result queries',
                    'description': f'Zero-result queries are {performance_analysis["query_metrics"]["zero_result_queries"]}%',
                    'action': 'Improve document coverage and query suggestions'
                })
            
            if performance_analysis['search_quality_metrics']['relevance_score'] < 4.0:
                recommendations.append({
                    'priority': 'MEDIUM',
                    'category': 'RELEVANCE',
                    'title': 'Improve search relevance',
                    'description': f'Relevance score is {performance_analysis["search_quality_metrics"]["relevance_score"]}',
                    'action': 'Review document metadata and indexing configuration'
                })
            
            performance_analysis['recommendations'] = recommendations
            
            return {
                'success': True,
                'performance_analysis': performance_analysis
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_kendra_monitoring(self, sns_topic_arn=None):
        """Configurar monitoreo de Kendra"""
        
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
                    Name='kendra-alerts',
                    Tags=[
                        {'Key': 'Service', 'Value': 'Kendra'},
                        {'Key': 'Purpose', 'Value': 'Monitoring'}
                    ]
                )
                monitoring_setup['sns_topic_arn'] = topic_response['TopicArn']
            
            # Crear función Lambda para monitoreo
            lambda_result = self.create_kendra_monitoring_lambda()
            if lambda_result['success']:
                monitoring_setup['lambda_functions'].append(lambda_result['function_arn'])
            
            # Configurar alarmas de CloudWatch
            alarm_result = self.setup_kendra_alarms(monitoring_setup['sns_topic_arn'])
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
    
    def create_kendra_monitoring_lambda(self):
        """Crear función Lambda para monitoreo de Kendra"""
        
        try:
            lambda_code = self._get_kendra_lambda_code()
            
            # Crear rol de ejecución
            role_arn = self._create_lambda_execution_role('kendra-monitoring-role')
            
            # Crear función Lambda
            response = self.lambda_client.create_function(
                FunctionName='kendra-monitor',
                Runtime='python3.9',
                Role=role_arn,
                Handler='lambda_function.lambda_handler',
                Code={
                    'ZipFile': lambda_code
                },
                Description='Lambda function for Kendra monitoring',
                Timeout=300,
                Environment={
                    'Variables': {
                        'SNS_TOPIC_ARN': f'arn:aws:sns:{self.region}:123456789012:kendra-alerts'
                    }
                },
                Tags={
                    'Service': 'Kendra',
                    'Purpose': 'Monitoring'
                }
            )
            
            return {
                'success': True,
                'function_name': 'kendra-monitor',
                'function_arn': response['FunctionArn'],
                'role_arn': role_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_kendra_lambda_code(self):
        """Obtener código de Lambda para monitoreo de Kendra"""
        
        return '''
import json
import boto3
import os
from datetime import datetime

def lambda_handler(event, context):
    sns = boto3.client('sns')
    kendra = boto3.client('kendra')
    
    sns_topic_arn = os.environ['SNS_TOPIC_ARN']
    
    # Analizar evento de Kendra
    event_analysis = analyze_kendra_event(event)
    
    if event_analysis['requires_attention']:
        # Enviar alerta
        alert = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': 'KENDRA_ALERT',
            'resource_type': event_analysis['resource_type'],
            'resource_name': event_analysis['resource_name'],
            'status': event_analysis['status'],
            'risk_level': event_analysis['risk_level'],
            'recommendations': event_analysis['recommendations']
        }
        
        sns.publish(
            TopicArn=sns_topic_arn,
            Subject=f'Kendra Alert: {event_analysis["resource_type"]}',
            Message=json.dumps(alert),
            MessageStructure='string'
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Kendra alert sent',
                'resource_type': event_analysis['resource_type'],
                'risk_level': event_analysis['risk_level']
            })
        }
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'No action required'})
    }

def analyze_kendra_event(event):
    """Analizar evento de Kendra"""
    
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
        
        if detail_type == 'Kendra Index State Change':
            detail = event.get('detail', {})
            analysis['resource_type'] = 'Index'
            analysis['resource_name'] = detail.get('IndexName', '')
            analysis['status'] = detail.get('Status', '')
            
            # Determinar si requiere atención
            if analysis['status'] == 'FAILED':
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'HIGH'
                analysis['recommendations'].append(f'Investigate index failure: {detail.get("ErrorMessage", "Unknown")}')
            elif analysis['status'] == 'ACTIVE':
                # Verificar capacidad
                if 'CapacityUnits' in detail:
                    capacity = detail['CapacityUnits']
                    if capacity.get('QueryCapacity', 0) > 50:
                        analysis['requires_attention'] = True
                        analysis['risk_level'] = 'MEDIUM'
                        analysis['recommendations'].append('High query capacity usage detected')
        
        elif detail_type == 'Kendra DataSource Sync Job State Change':
            detail = event.get('detail', {})
            analysis['resource_type'] = 'DataSourceSyncJob'
            analysis['resource_name'] = detail.get('DataSourceName', '')
            analysis['status'] = detail.get('Status', '')
            
            if analysis['status'] == 'FAILED':
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'HIGH'
                analysis['recommendations'].append(f'Investigate sync job failure: {detail.get("ErrorMessage", "Unknown")}')
            elif analysis['status'] == 'COMPLETED':
                # Verificar métricas de sincronización
                if 'SyncJobMetrics' in detail:
                    metrics = detail['SyncJobMetrics']
                    if metrics.get('DocumentsFailed', 0) > 100:
                        analysis['requires_attention'] = True
                        analysis['risk_level'] = 'MEDIUM'
                        analysis['recommendations'].append('High number of failed documents in sync')
    
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
                Description='Execution role for Kendra monitoring Lambda',
                Tags=[
                    {'Key': 'Service', 'Value': 'Lambda'},
                    {'Key': 'Purpose', 'Value': 'KendraMonitoring'}
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
    
    def setup_kendra_alarms(self, sns_topic_arn):
        """Configurar alarmas de CloudWatch para Kendra"""
        
        try:
            alarms_created = []
            
            # Alarma para índices fallidos
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='Kendra-FailedIndexes',
                    AlarmDescription='Failed Kendra indexes detected',
                    Namespace='AWS/Kendra',
                    MetricName='FailedIndexes',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('Kendra-FailedIndexes')
            except Exception:
                pass
            
            # Alarma para trabajos de sincronización fallidos
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='Kendra-FailedSyncJobs',
                    AlarmDescription='Failed Kendra sync jobs detected',
                    Namespace='AWS/Kendra',
                    MetricName='FailedSyncJobs',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('Kendra-FailedSyncJobs')
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
    
    def generate_kendra_report(self, report_type='comprehensive', time_range_days=30):
        """Generar reporte de Kendra"""
        
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
                index_analysis = self._get_index_analysis()
                report['index_analysis'] = index_analysis
                report['recommendations'] = self._generate_comprehensive_recommendations()
            
            elif report_type == 'usage':
                # Reporte de uso
                report['usage_analysis'] = {
                    'search_queries': self._get_search_query_stats(),
                    'document_access': self._get_document_access_stats(),
                    'user_engagement': self._get_user_engagement_stats(),
                    'data_source_performance': self._get_data_source_stats()
                }
            
            elif report_type == 'quality':
                # Reporte de calidad
                report['quality_assessment'] = {
                    'search_relevance': self._get_search_relevance_stats(),
                    'query_effectiveness': self._get_query_effectiveness_stats(),
                    'document_coverage': self._get_document_coverage_stats(),
                    'user_satisfaction': self._get_user_satisfaction_stats()
                }
            
            elif report_type == 'cost':
                # Reporte de costos
                report['cost_breakdown'] = {
                    'index_costs': self._get_index_costs(),
                    'data_source_costs': self._get_data_source_costs(),
                    'query_costs': self._get_query_costs(),
                    'storage_costs': self._get_storage_costs(),
                    'total_cost': self._calculate_total_cost()
                }
            
            return {
                'success': True,
                'kendra_report': report
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
            'total_indexes': 12,
            'active_indexes': 10,
            'total_data_sources': 45,
            'active_data_sources': 38,
            'total_documents': 2500000,
            'indexed_documents': 2350000,
            'total_queries': 150000,
            'unique_queries': 85000,
            'average_documents_per_query': 12.3,
            'most_active_data_sources': ['S3', 'SharePoint', 'WebCrawler']
        }
    
    def _get_performance_metrics(self):
        """Obtener métricas de rendimiento"""
        
        return {
            'average_query_response_time': 0.85,  # segundos
            'indexing_throughput': 5000,  # documentos por hora
            'sync_job_success_rate': 98.5,  # porcentaje
            'query_success_rate': 99.2,  # porcentaje
            'system_uptime': 99.95,  # porcentaje
            'index_availability': 99.9,  # porcentaje
            'cache_hit_rate': 78.3  # porcentaje
        }
    
    def _get_cost_analysis(self):
        """Obtener análisis de costos"""
        
        return {
            'monthly_cost': 8500.00,
            'cost_breakdown': {
                'index_capacity': 4250.00,
                'data_sources': 1700.00,
                'query_processing': 1275.00,
                'storage': 850.00,
                'api_calls': 425.00
            },
            'cost_trend': 'INCREASING',
            'cost_optimization_potential': 15.0  # porcentaje
        }
    
    def _get_index_analysis(self):
        """Obtener análisis de índices"""
        
        return {
            'index_types': {
                'developer_edition': 8,
                'enterprise_edition': 4
            },
            'index_sizes': {
                'small': 5,
                'medium': 4,
                'large': 3
            },
            'data_source_distribution': {
                'S3': 18,
                'SharePoint': 12,
                'WebCrawler': 8,
                'Database': 4,
                'Custom': 3
            },
            'document_types': {
                'pdf': 45.2,
                'html': 25.8,
                'text': 15.3,
                'word': 8.7,
                'excel': 5.0
            }
        }
    
    def _generate_comprehensive_recommendations(self):
        """Generar recomendaciones comprehensivas"""
        
        recommendations = [
            {
                'priority': 'HIGH',
                'category': 'PERFORMANCE',
                'title': 'Optimize query response time',
                'description': 'Average response time can be improved',
                'action': 'Increase index capacity and optimize data sources'
            },
            {
                'priority': 'MEDIUM',
                'category': 'QUALITY',
                'title': 'Improve search relevance',
                'description': 'Enhance document metadata and indexing',
                'action': 'Review and improve document structure and metadata'
            },
            {
                'priority': 'LOW',
                'category': 'COST',
                'title': 'Optimize index capacity',
                'description': 'Right-size index capacity based on usage',
                'action': 'Implement capacity optimization strategies'
            }
        ]
        
        return recommendations
```

## Casos de Uso

### **1. Configuración Completa de Kendra**
```python
# Ejemplo: Crear configuración completa de Kendra
manager = KendraManager('us-east-1')

# Configuración de fuentes de datos
data_sources_config = {
    'documents': {
        'type': 'S3',
        'bucket_name': 'my-company-documents',
        'description': 'Company documents and policies',
        'include_patterns': ['documents/', 'policies/'],
        'exclude_patterns': ['archive/', 'temp/']
    },
    'intranet': {
        'type': 'WEBCRAWLER',
        'urls': {
            'SeedUrlConfiguration': {
                'SeedUrls': ['https://intranet.company.com']
            }
        },
        'description': 'Company intranet pages',
        'crawl_depth': 3,
        'max_urls_per_crawl': 10000
    },
    'sharepoint': {
        'type': 'SHAREPOINT',
        'share_point_urls': ['https://company.sharepoint.com'],
        'secret_arn': 'arn:aws:secretsmanager:us-east-1:123456789012:secret:sharepoint-credentials',
        'description': 'SharePoint document libraries'
    },
    'database': {
        'type': 'DATABASE',
        'database_engine': 'POSTGRESQL',
        'connection_string': {
            'host': 'db.company.com',
            'port': 5432,
            'database': 'knowledge_base',
            'secret_arn': 'arn:aws:secretsmanager:us-east-1:123456789012:secret:db-credentials'
        },
        'description': 'Knowledge base database'
    }
}

# Crear configuración completa
setup_result = manager.create_complete_kendra_setup(
    project_name='enterprise-search',
    data_sources_config=data_sources_config,
    role_arn='arn:aws:iam::123456789012:role/KendraServiceRole',
    edition='ENTERPRISE_EDITION'
)

if setup_result['success']:
    setup = setup_result['setup_results']
    print(f"Kendra setup created: {setup['project_name']}")
    print(f"Status: {setup['status']}")
    
    # Mostrar resultados
    print(f"Index: {setup['index']}")
    print(f"Data sources: {len(setup['data_sources'])}")
    for source_name, source_id in setup['data_sources'].items():
        print(f"  - {source_name}: {source_id}")
    
    print(f"Sync jobs: {len(setup['sync_jobs'])}")
    for job_name, job_id in setup['sync_jobs'].items():
        print(f"  - {job_name}: {job_id}")
```

### **2. Búsqueda Inteligente**
```python
# Ejemplo: Realizar búsqueda inteligente
manager = KendraManager('us-east-1')

# Realizar consulta simple
query_result = manager.query(
    index_id='your-index-id',
    query_text='employee vacation policy',
    query_result_type='DOCUMENT',
    page_size=10
)

if query_result['success']:
    results = query_result['query_results']
    print(f"Query ID: {results['query_id']}")
    print(f"Total results: {results['total_number_of_results']}")
    
    # Mostrar resultados principales
    for i, result in enumerate(results['result_items'][:3]):
        print(f"\nResult {i+1}:")
        print(f"  Title: {result['document_title']}")
        print(f"  Excerpt: {result['document_excerpt'][:200]}...")
        print(f"  Score: {result['score_attributes'].get('ScoreConfidence', 'N/A')}")
        print(f"  URI: {result['document_uri']}")

# Búsqueda con filtros
query_filter = {
    'AndAllFilters': [
        {
            'DocumentAttributeFilter': {
                'Key': '_document_title',
                'Value': {
                    'StringValue': 'policy'
                }
            }
        },
        {
            'DateRangeFilter': {
                'Key': '_created_at',
                'Value': {
                    'Start': '2023-01-01T00:00:00Z',
                    'End': '2024-12-31T23:59:59Z'
                }
            }
        }
    ]
}

filtered_result = manager.query(
    index_id='your-index-id',
    query_text='benefits',
    query_filter=query_filter,
    page_size=5
)

if filtered_result['success']:
    results = filtered_result['query_results']
    print(f"\nFiltered search results: {results['total_number_of_results']}")
```

### **3. Sugerencias de Consulta**
```python
# Ejemplo: Obtener sugerencias de consulta
manager = KendraManager('us-east-1')

# Obtener sugerencias para consulta parcial
suggestions_result = manager.get_query_suggestions(
    index_id='your-index-id',
    query_text='employee',
    max_suggestions=10
)

if suggestions_result['success']:
    suggestions = suggestions_result['suggestions']
    print(f"Query suggestions for 'employee':")
    for suggestion in suggestions:
        print(f"  - {suggestion['value']} (Source: {suggestion['source']})")
```

### **4. Análisis de Rendimiento**
```python
# Ejemplo: Analizar rendimiento de búsqueda
manager = KendraManager('us-east-1')

performance_result = manager.analyze_search_performance(
    index_id='your-index-id',
    time_range_days=30
)

if performance_result['success']:
    analysis = performance_result['performance_analysis']
    
    print(f"Search Performance Analysis")
    print(f"Total queries: {analysis['query_metrics']['total_queries']}")
    print(f"Average response time: {analysis['query_metrics']['average_response_time']}s")
    print(f"Success rate: {analysis['query_metrics']['success_rate']}%")
    
    print(f"\nPopular queries:")
    for query in analysis['popular_queries']:
        print(f"  - {query['query']}: {query['frequency']} times")
    
    print(f"\nSearch quality metrics:")
    quality = analysis['search_quality_metrics']
    print(f"  - Relevance score: {quality['relevance_score']}/5")
    print(f"  - User satisfaction: {quality['user_satisfaction']}/5")
    print(f"  - Click-through rate: {quality.get('click_through_rate', 0)}%")
    
    # Recomendaciones
    recommendations = analysis['recommendations']
    print(f"\nRecommendations: {len(recommendations)}")
    for rec in recommendations:
        print(f"  - {rec['title']} ({rec['priority']})")
        print(f"    {rec['description']}")
        print(f"    Action: {rec['action']}")
```

### **5. Gestión de Fuentes de Datos**
```python
# Ejemplo: Gestión de fuentes de datos
manager = KendraManager('us-east-1')

# Crear fuente de datos S3
s3_result = manager.create_s3_data_source(
    index_id='your-index-id',
    name='company-policies',
    bucket_name='company-documents',
    role_arn='arn:aws:iam::123456789012:role/KendraServiceRole',
    description='Company policies and procedures',
    include_patterns=['policies/', 'procedures/'],
    exclude_patterns=['draft/', 'archive/']
)

if s3_result['success']:
    print(f"S3 data source created: {s3_result['data_source_id']}")
    
    # Iniciar sincronización
    sync_result = manager.start_data_source_sync_job(
        index_id='your-index-id',
        data_source_id=s3_result['data_source_id']
    )
    
    if sync_result['success']:
        print(f"Sync job started: {sync_result['execution_id']}")
        
        # Verificar estado del trabajo de sincronización
        time.sleep(30)
        
        job_info = manager.describe_data_source_sync_job(
            index_id='your-index-id',
            data_source_id=s3_result['data_source_id'],
            execution_id=sync_result['execution_id']
        )
        
        if job_info['success']:
            info = job_info['job_info']
            print(f"Sync job status: {info['status']}")
            print(f"Start time: {info['start_time']}")
            
            if 'sync_job_metrics' in info:
                metrics = info['sync_job_metrics']
                print(f"Documents added: {metrics.get('DocumentsAdded', 0)}")
                print(f"Documents modified: {metrics.get('DocumentsModified', 0)}")
                print(f"Documents deleted: {metrics.get('DocumentsDeleted', 0)}")
                print(f"Documents failed: {metrics.get('DocumentsFailed', 0)}")
```

### **6. Configuración de Monitoreo**
```python
# Ejemplo: Configurar monitoreo de Kendra
manager = KendraManager('us-east-1')

monitoring_result = manager.create_kendra_monitoring()

if monitoring_result['success']:
    setup = monitoring_result['monitoring_setup']
    print(f"Kendra monitoring configured")
    print(f"SNS Topic: {setup['sns_topic_arn']}")
    print(f"Lambda functions: {len(setup['lambda_functions'])}")
    print(f"CloudWatch alarms: {len(setup['cloudwatch_alarms'])}")
```

### **7. Búsqueda Avanzada con Facetas**
```python
# Ejemplo: Búsqueda avanzada con facetas
manager = KendraManager('us-east-1')

# Configurar facetas para búsqueda
query_facets = [
    {
        'DocumentAttributeKey': '_document_title'
    },
    {
        'DocumentAttributeKey': '_created_at'
    },
    {
        'DocumentAttributeKey': '_source_uri'
    }
]

# Solicitar atributos específicos
requested_attributes = [
    {
        'Name': '_document_title'
    },
    {
        'Name': '_created_at'
    },
    {
        'Name': '_source_uri'
    },
    {
        'Name': 'author'
    },
    {
        'Name': 'department'
    }
]

# Realizar búsqueda con facetas
advanced_result = manager.query(
    index_id='your-index-id',
    query_text='training materials',
    query_facets=query_facets,
    requested_document_attributes=requested_attributes,
    page_size=20
)

if advanced_result['success']:
    results = advanced_result['query_results']
    print(f"Advanced search results: {results['total_number_of_results']}")
    
    # Mostrar facetas
    print(f"\nFacets:")
    for facet in results['facet_results']:
        print(f"  - {facet['DocumentAttributeKey']}: {len(facet['DocumentAttributeValues'])} values")
        for value in facet['DocumentAttributes'][:3]:  # Mostrar primeros 3 valores
            print(f"    * {value['StringValue']}: {value['Count']} documents")
    
    # Mostrar resultados con atributos
    print(f"\nResults with attributes:")
    for i, result in enumerate(results['result_items'][:3]):
        print(f"Result {i+1}:")
        print(f"  Title: {result['document_title']}")
        print(f"  Attributes:")
        for attr in result['document_attributes']:
            print(f"    - {attr['Key']}: {attr.get('Value', {}).get('StringValue', 'N/A')}")
```

### **8. Búsqueda con Contexto de Usuario**
```python
# Ejemplo: Búsqueda con contexto de usuario
manager = KendraManager('us-east-1')

# Configurar contexto de usuario
user_context = {
    'Token': 'user-john-doe',  # Token de usuario para control de acceso
    'Groups': ['employees', 'engineering', 'senior-staff'],  # Grupos del usuario
    'DataSourceGroups': [
        {
            'GroupId': 'engineering-docs',
            'DataSourceId': 'engineering-data-source'
        }
    ]
}

# Realizar búsqueda con contexto de usuario
contextual_result = manager.query(
    index_id='your-index-id',
    query_text='project documentation',
    user_context=user_context,
    page_size=10
)

if contextual_result['success']:
    results = contextual_result['query_results']
    print(f"Contextual search results: {results['total_number_of_results']}")
    print(f"Results filtered for user groups and access permissions")
```

## Configuración con AWS CLI

### **Índices**
```bash
# Crear índice
aws kendra create-index \
  --name enterprise-search-index \
  --role-arn arn:aws:iam::123456789012:role/KendraServiceRole \
  --edition ENTERPRISE_EDITION \
  --description "Enterprise search index"

# Describir índice
aws kendra describe-index --id your-index-id

# Listar índices
aws kendra list-indices --max-results 50

# Actualizar índice
aws kendra update-index \
  --id your-index-id \
  --name updated-index-name \
  --description "Updated description"

# Eliminar índice
aws kendra delete-index --id your-index-id
```

### **Fuentes de Datos**
```bash
# Crear fuente de datos S3
aws kendra create-data-source \
  --index-id your-index-id \
  --name s3-documents \
  --type S3 \
  --role-arn arn:aws:iam::123456789012:role/KendraServiceRole \
  --configuration 'S3Configuration={BucketName=my-documents}'

# Crear fuente de datos Web Crawler
aws kendra create-data-source \
  --index-id your-index-id \
  --name web-crawler \
  --type WEBCRAWLER \
  --role-arn arn:aws:iam::123456789012:role/KendraServiceRole \
  --configuration 'WebCrawlerConfiguration={Urls={SeedUrlConfiguration={SeedUrls=[https://example.com]}}}'

# Describir fuente de datos
aws kendra describe-data-source \
  --index-id your-index-id \
  --id your-data-source-id

# Listar fuentes de datos
aws kendra list-data-sources --index-id your-index-id --max-results 50

# Actualizar fuente de datos
aws kendra update-data-source \
  --index-id your-index-id \
  --id your-data-source-id \
  --name updated-source-name

# Eliminar fuente de datos
aws kendra delete-data-source \
  --index-id your-index-id \
  --id your-data-source-id
```

### **Sincronización**
```bash
# Iniciar trabajo de sincronización
aws kendra start-data-source-sync-job \
  --index-id your-index-id \
  --id your-data-source-id

# Describir trabajo de sincronización
aws kendra describe-data-source-sync-job \
  --index-id your-index-id \
  --id your-data-source-id \
  --execution-id your-execution-id

# Listar trabajos de sincronización
aws kendra list-data-source-sync-jobs \
  --index-id your-index-id \
  --id your-data-source-id \
  --max-results 50

# Detener trabajo de sincronización
aws kendra stop-data-source-sync-job \
  --index-id your-index-id \
  --id your-data-source-id \
  --execution-id your-execution-id
```

### **Búsqueda**
```bash
# Realizar consulta
aws kendra query \
  --index-id your-index-id \
  --query-text "employee handbook" \
  --query-result-type DOCUMENT \
  --page-size 10

# Obtener sugerencias de consulta
aws kendra get-query-suggestions \
  --index-id your-index-id \
  --query-text "employee" \
  --max-suggestions 10

# Búsqueda con filtros
aws kendra query \
  --index-id your-index-id \
  --query-text "policy" \
  --query-filter 'AndAllFilters=[{DocumentAttributeFilter={Key=_document_title,Value={StringValue=policy}}}]'
```

## Mejores Prácticas

### **1. Diseño de Índices**
- **Capacity Planning**: Planificar capacidad adecuada para el volumen de datos
- **Edition Selection**: Elegir la edición apropiada (Developer vs Enterprise)
- **Metadata Configuration**: Configurar metadatos relevantes para búsqueda
- **Security Groups**: Configurar grupos de seguridad apropiados
- **Regional Deployment**: Desplegar en regiones cercanas a los usuarios

### **2. Gestión de Fuentes de Datos**
- **Data Quality**: Asegurar alta calidad de datos fuente
- **Sync Scheduling**: Programar sincronizaciones eficientes
- **Error Handling**: Manejar errores de sincronización
- **Access Control**: Configurar control de acceso apropiado
- **Performance Optimization**: Optimizar configuración para mejor rendimiento

### **3. Optimización de Búsqueda**
- **Query Optimization**: Optimizar consultas para mejores resultados
- **Faceted Search**: Implementar búsqueda facetada para filtrado
- **User Context**: Utilizar contexto de usuario para personalización
- **Relevance Tuning**: Ajustar relevancia de resultados
- **Query Suggestions**: Implementar sugerencias de consulta

### **4. Seguridad y Cumplimiento**
- **Access Control**: Implementar control de acceso granular
- **Data Encryption**: Cifrar datos en reposo y en tránsito
- **Audit Logging**: Mantener logs de auditoría completos
- **Compliance**: Asegurar cumplimiento normativo
- **Regular Reviews**: Revisar configuraciones de seguridad regularmente

## Costos

### **Precios de AWS Kendra**
- **Developer Edition**: $0.70 por hora de índice
- **Enterprise Edition**: $7.00 por hora de índice
- **S3 Connector**: GRATIS
- **SharePoint Connector**: $0.10 por 1000 documentos
- **Web Crawler**: $0.10 por 1000 documentos
- **Database Connector**: $0.10 por 1000 documentos
- **Query Processing**: $0.80 por 1000 consultas
- **Storage**: $0.10 por GB-mes para almacenamiento

### **Ejemplo de Costos Mensuales**
- **Enterprise Edition**: 730 horas × $7.00 = $5,110.00
- **SharePoint Connector**: 50,000 docs × $0.10/1000 = $5.00
- **Web Crawler**: 100,000 docs × $0.10/1000 = $10.00
- **Query Processing**: 100,000 queries × $0.80/1000 = $80.00
- **Storage**: 100 GB × $0.10 = $10.00
- **Total estimado**: ~$5,215.00 por mes

## Troubleshooting

### **Problemas Comunes**
1. **Baja Relevancia**: Mejorar metadatos y configuración de indexación
2. **Sincronización Lenta**: Optimizar configuración de fuentes de datos
3. **Errores de Acceso**: Verificar permisos y configuración de IAM
4. **Alta Latencia**: Optimizar capacidad del índice

### **Comandos de Diagnóstico**
```bash
# Verificar estado del índice
aws kendra describe-index --id your-index-id

# Verificar estado de la fuente de datos
aws kendra describe-data-source --index-id your-index-id --id your-data-source-id

# Verificar estado del trabajo de sincronización
aws kendra describe-data-source-sync-job --index-id your-index-id --id your-data-source-id --execution-id your-execution-id

# Verificar logs de CloudWatch
aws logs tail /aws/kendra --follow
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
- **Data Storage**: Almacenamiento de documentos para indexación
- **Native Connector**: Conector nativo para S3
- **Incremental Sync**: Sincronización incremental de cambios
- **Access Control**: Control de acceso a nivel de bucket

### **AWS Lambda**
- **Custom Connectors**: Desarrollo de conectores personalizados
- **Preprocessing**: Preprocesamiento de documentos
- **Postprocessing**: Postprocesamiento de resultados
- **Event Handling**: Manejo de eventos de Kendra

### **AWS CloudWatch**
- **Monitoring**: Monitoreo de métricas y rendimiento
- **Alarms**: Alarmas para eventos críticos
- **Logs**: Almacenamiento de logs de operaciones
- **Dashboards**: Visualización de métricas

### **AWS IAM**
- **Access Control**: Control de acceso a recursos de Kendra
- **Role Management**: Gestión de roles de servicio
- **Permissions**: Permisos específicos para diferentes operaciones
- **Security**: Seguridad de acceso a datos y índices

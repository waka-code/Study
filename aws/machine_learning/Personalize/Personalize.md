# AWS Personalize

## Definición

AWS Personalize es un servicio de machine learning completamente gestionado que permite a los desarrolladores crear, entrenar y desplegar modelos de recomendación personalizados. Utiliza algoritmos avanzados de machine learning para analizar datos de comportamiento de usuarios y generar recomendaciones altamente personalizadas para aplicaciones web, móviles y de marketing.

## Características Principales

### **Algoritmos de Recomendación**
- **User Personalization**: Recomendaciones personalizadas basadas en historial de usuarios
- **Similar Items**: Recomendación de ítems similares a los que le gustan a los usuarios
- **Popularity-based**: Recomendaciones basadas en popularidad general
- **Personalized Ranking**: Re-ranking personalizado de listas de ítems
- **HRNN (Hierarchical Recurrent Neural Network)**: Modelos de deep learning para secuencias

### **Procesamiento de Datos**
- **Data Import**: Importación flexible de datos de interacción
- **Data Validation**: Validación automática de calidad de datos
- **Schema Management**: Gestión de esquemas de datos
- **Incremental Updates**: Actualizaciones incrementales de modelos
- **Real-time Inference**: Inferencia en tiempo real para recomendaciones

### **Evaluación y Métricas**
- **Offline Evaluation**: Evaluación offline con métricas estándar
- **A/B Testing**: Integración con pruebas A/B
- **Performance Metrics**: Métricas de precisión, recall, nDCG
- **Business Metrics**: Métricas de negocio personalizadas
- **Model Comparison**: Comparación de múltiples modelos

### **Integración y Despliegue**
- **API Integration**: APIs RESTful para fácil integración
- **Real-time Endpoints**: Endpoints para inferencia en tiempo real
- **Batch Recommendations**: Recomendaciones por lotes
- **Campaign Management**: Gestión de campañas de recomendación
- **Multi-region Deployment**: Despliegue en múltiples regiones

## Tipos de Operaciones

### **1. Operaciones de Datasets**
- **CreateDataset**: Crear conjunto de datos
- **DescribeDataset**: Obtener detalles del conjunto de datos
- **ListDatasets**: Listar conjuntos de datos
- **UpdateDataset**: Actualizar configuración del conjunto de datos
- **DeleteDataset**: Eliminar conjunto de datos

### **2. Operaciones de Importación de Datos**
- **CreateDatasetImportJob**: Crear trabajo de importación de datos
- **DescribeDatasetImportJob**: Obtener detalles del trabajo de importación
- **ListDatasetImportJobs**: Listar trabajos de importación
- **UpdateDatasetImportJob**: Actualizar trabajo de importación
- **CancelDatasetImportJob**: Cancelar trabajo de importación

### **3. Operaciones de Soluciones**
- **CreateSolution**: Crear solución de recomendación
- **DescribeSolution**: Obtener detalles de la solución
- **ListSolutions**: Listar soluciones
- **UpdateSolution**: Actualizar solución
- **DeleteSolution**: Eliminar solución

### **4. Operaciones de Campañas**
- **CreateCampaign**: Crear campaña de recomendación
- **DescribeCampaign**: Obtener detalles de la campaña
- **ListCampaigns**: Listar campañas
- **UpdateCampaign**: Actualizar campaña
- **DeleteCampaign**: Eliminar campaña

## Arquitectura de AWS Personalize

### **Componentes Principales**
```
AWS Personalize Architecture
├── Data Layer
│   ├── Data Collection
│   ├── Data Validation
│   ├── Schema Management
│   ├── Data Storage
│   └── Data Processing
├── Model Training Layer
│   ├── Algorithm Selection
│   ├── Hyperparameter Tuning
│   ├── Model Training
│   ├── Model Validation
│   └── Model Selection
├── Inference Layer
│   ├── Real-time Scoring
│   ├── Batch Processing
│   ├── Personalization Logic
│   ├── Ranking Algorithms
│   └── Similarity Computation
├── Evaluation Layer
│   ├── Offline Metrics
│   ├── Online Metrics
│   ├── A/B Testing
│   ├── Business KPIs
│   └── Model Comparison
└── Integration Layer
    ├── REST APIs
    ├── SDK Support
    ├── Event Tracking
    ├── Real-time Updates
    └── Third-party Integration
```

### **Flujo de Procesamiento**
```
Data Collection → Data Processing → Model Training → Model Evaluation → Campaign Deployment → Recommendations
```

## Configuración de AWS Personalize

### **Gestión Completa de AWS Personalize**
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

class PersonalizeManager:
    def __init__(self, region='us-east-1'):
        self.personalize = boto3.client('personalize', region_name=region)
        self.personalize_runtime = boto3.client('personalize-runtime', region_name=region)
        self.personalize_events = boto3.client('personalize-events', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.lambda_client = boto3.client('lambda', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.region = region
    
    def create_dataset(self, name, domain, schema_arn, role_arn=None, tags=None):
        """Crear conjunto de datos"""
        
        try:
            params = {
                'name': name,
                'domain': domain,
                'schemaArn': schema_arn
            }
            
            if role_arn:
                params['roleArn'] = role_arn
            
            if tags:
                params['tags'] = tags
            
            response = self.personalize.create_dataset(**params)
            
            return {
                'success': True,
                'dataset_arn': response['datasetArn'],
                'dataset_name': name,
                'domain': domain
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_dataset(self, dataset_arn):
        """Obtener detalles del conjunto de datos"""
        
        try:
            response = self.personalize.describe_dataset(datasetArn=dataset_arn)
            
            dataset_info = {
                'dataset_arn': response['datasetArn'],
                'dataset_name': response['name'],
                'dataset_type': response['datasetType'],
                'domain': response['domain'],
                'schema_arn': response['schemaArn'],
                'role_arn': response.get('roleArn', ''),
                'status': response['status'],
                'creation_date_time': response['creationDateTime'].isoformat() if response.get('creationDateTime') else '',
                'last_updated_date_time': response.get('lastUpdatedDateTime', '').isoformat() if response.get('lastUpdatedDateTime') else '',
                'tags': response.get('tags', [])
            }
            
            return {
                'success': True,
                'dataset_info': dataset_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_datasets(self, max_results=100, next_token=None):
        """Listar conjuntos de datos"""
        
        try:
            params = {'maxResults': max_results}
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.personalize.list_datasets(**params)
            
            datasets = []
            for dataset in response['datasets']:
                dataset_info = {
                    'dataset_arn': dataset['datasetArn'],
                    'dataset_name': dataset['name'],
                    'dataset_type': dataset['datasetType'],
                    'domain': dataset['domain'],
                    'status': dataset['status'],
                    'creation_date_time': dataset['creationDateTime'].isoformat() if dataset.get('creationDateTime') else '',
                    'last_updated_date_time': dataset.get('lastUpdatedDateTime', '').isoformat() if dataset.get('lastUpdatedDateTime') else ''
                }
                datasets.append(dataset_info)
            
            return {
                'success': True,
                'datasets': datasets,
                'count': len(datasets),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_dataset(self, dataset_arn):
        """Eliminar conjunto de datos"""
        
        try:
            response = self.personalize.delete_dataset(datasetArn=dataset_arn)
            
            return {
                'success': True,
                'dataset_arn': dataset_arn,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_schema(self, name, domain, schema_definition, tags=None):
        """Crear esquema de datos"""
        
        try:
            params = {
                'name': name,
                'schema': schema_definition
            }
            
            if tags:
                params['tags'] = tags
            
            response = self.personalize.create_schema(**params)
            
            return {
                'success': True,
                'schema_arn': response['schemaArn'],
                'schema_name': name,
                'domain': domain
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_schema(self, schema_arn):
        """Obtener detalles del esquema"""
        
        try:
            response = self.personalize.describe_schema(schemaArn=schema_arn)
            
            schema_info = {
                'schema_arn': response['schemaArn'],
                'schema_name': response['name'],
                'schema': response['schema'],
                'creation_date_time': response['creationDateTime'].isoformat() if response.get('creationDateTime') else '',
                'last_updated_date_time': response.get('lastUpdatedDateTime', '').isoformat() if response.get('lastUpdatedDateTime') else '',
                'tags': response.get('tags', [])
            }
            
            return {
                'success': True,
                'schema_info': schema_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_dataset_import_job(self, job_name, dataset_arn, data_source,
                                role_arn, import_mode='FULL', tags=None):
        """Crear trabajo de importación de datos"""
        
        try:
            params = {
                'jobName': job_name,
                'datasetArn': dataset_arn,
                'dataSource': data_source,
                'roleArn': role_arn,
                'importMode': import_mode
            }
            
            if tags:
                params['tags'] = tags
            
            response = self.personalize.create_dataset_import_job(**params)
            
            return {
                'success': True,
                'dataset_import_job_arn': response['datasetImportJobArn'],
                'job_name': job_name,
                'status': 'CREATING'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_dataset_import_job(self, dataset_import_job_arn):
        """Obtener detalles del trabajo de importación"""
        
        try:
            response = self.personalize.describe_dataset_import_job(
                datasetImportJobArn=dataset_import_job_arn
            )
            
            job_info = {
                'dataset_import_job_arn': response['datasetImportJobArn'],
                'job_name': response['jobName'],
                'dataset_arn': response['datasetArn'],
                'data_source': response['dataSource'],
                'role_arn': response['roleArn'],
                'status': response['status'],
                'creation_date_time': response['creationDateTime'].isoformat() if response.get('creationDateTime') else '',
                'last_updated_date_time': response.get('lastUpdatedDateTime', '').isoformat() if response.get('lastUpdatedDateTime') else '',
                'failure_reason': response.get('failureReason', ''),
                'import_mode': response.get('importMode', ''),
                'tags': response.get('tags', [])
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
    
    def list_dataset_import_jobs(self, dataset_arn=None, status=None, max_results=100, next_token=None):
        """Listar trabajos de importación"""
        
        try:
            params = {'maxResults': max_results}
            
            if dataset_arn:
                params['datasetArn'] = dataset_arn
            
            if status:
                params['status'] = status
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.personalize.list_dataset_import_jobs(**params)
            
            jobs = []
            for job in response['datasetImportJobs']:
                job_info = {
                    'dataset_import_job_arn': job['datasetImportJobArn'],
                    'job_name': job['jobName'],
                    'dataset_arn': job['datasetArn'],
                    'status': job['status'],
                    'creation_date_time': job['creationDateTime'].isoformat() if job.get('creationDateTime') else '',
                    'last_updated_date_time': job.get('lastUpdatedDateTime', '').isoformat() if job.get('lastUpdatedDateTime') else ''
                }
                jobs.append(job_info)
            
            return {
                'success': True,
                'jobs': jobs,
                'count': len(jobs),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_solution(self, name, dataset_group_arn, perform_automl=True,
                        recipe_arn=None, perform_hyperparameter_optimization=True,
                        hyperparameter_ranges=None, solution_config=None, tags=None):
        """Crear solución de recomendación"""
        
        try:
            params = {
                'name': name,
                'datasetGroupArn': dataset_group_arn,
                'performAutoML': perform_automl
            }
            
            if recipe_arn:
                params['recipeArn'] = recipe_arn
            
            if perform_hyperparameter_optimization:
                params['performHyperparameterOptimization'] = perform_hyperparameter_optimization
            
            if hyperparameter_ranges:
                params['hyperparameterRanges'] = hyperparameter_ranges
            
            if solution_config:
                params['solutionConfig'] = solution_config
            
            if tags:
                params['tags'] = tags
            
            response = self.personalize.create_solution(**params)
            
            return {
                'success': True,
                'solution_arn': response['solutionArn'],
                'solution_name': name,
                'status': 'CREATING'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_solution(self, solution_arn):
        """Obtener detalles de la solución"""
        
        try:
            response = self.personalize.describe_solution(solutionArn=solution_arn)
            
            solution_info = {
                'solution_arn': response['solutionArn'],
                'solution_name': response['name'],
                'dataset_group_arn': response['datasetGroupArn'],
                'recipe_arn': response['recipeArn'],
                'recipe_name': response.get('recipeName', ''),
                'perform_automl': response['performAutoML'],
                'perform_hyperparameter_optimization': response['performHyperparameterOptimization'],
                'status': response['status'],
                'creation_date_time': response['creationDateTime'].isoformat() if response.get('creationDateTime') else '',
                'last_updated_date_time': response.get('lastUpdatedDateTime', '').isoformat() if response.get('lastUpdatedDateTime') else '',
                'solution_config': response.get('solutionConfig', {}),
                'hyperparameter_ranges': response.get('hyperparameterRanges', {}),
                'tags': response.get('tags', [])
            }
            
            return {
                'success': True,
                'solution_info': solution_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_solutions(self, dataset_group_arn=None, max_results=100, next_token=None):
        """Listar soluciones"""
        
        try:
            params = {'maxResults': max_results}
            
            if dataset_group_arn:
                params['datasetGroupArn'] = dataset_group_arn
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.personalize.list_solutions(**params)
            
            solutions = []
            for solution in response['solutions']:
                solution_info = {
                    'solution_arn': solution['solutionArn'],
                    'solution_name': solution['name'],
                    'dataset_group_arn': solution['datasetGroupArn'],
                    'recipe_arn': solution['recipeArn'],
                    'recipe_name': solution.get('recipeName', ''),
                    'status': solution['status'],
                    'creation_date_time': solution['creationDateTime'].isoformat() if solution.get('creationDateTime') else '',
                    'last_updated_date_time': solution.get('lastUpdatedDateTime', '').isoformat() if solution.get('lastUpdatedDateTime') else ''
                }
                solutions.append(solution_info)
            
            return {
                'success': True,
                'solutions': solutions,
                'count': len(solutions),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_solution(self, solution_arn):
        """Eliminar solución"""
        
        try:
            response = self.personalize.delete_solution(solutionArn=solution_arn)
            
            return {
                'success': True,
                'solution_arn': solution_arn,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_solution_version(self, solution_arn, training_mode='FULL', tags=None):
        """Crear versión de solución"""
        
        try:
            params = {
                'solutionArn': solution_arn,
                'trainingMode': training_mode
            }
            
            if tags:
                params['tags'] = tags
            
            response = self.personalize.create_solution_version(**params)
            
            return {
                'success': True,
                'solution_version_arn': response['solutionVersionArn'],
                'status': 'CREATING'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_solution_version(self, solution_version_arn):
        """Obtener detalles de la versión de solución"""
        
        try:
            response = self.personalize.describe_solution_version(
                solutionVersionArn=solution_version_arn
            )
            
            version_info = {
                'solution_version_arn': response['solutionVersionArn'],
                'solution_arn': response['solutionArn'],
                'status': response['status'],
                'creation_date_time': response['creationDateTime'].isoformat() if response.get('creationDateTime') else '',
                'last_updated_date_time': response.get('lastUpdatedDateTime', '').isoformat() if response.get('lastUpdatedDateTime') else '',
                'failure_reason': response.get('failureReason', ''),
                'training_mode': response.get('trainingMode', ''),
                'training_data_source': response.get('trainingDataSource', {}),
                'training_metrics': response.get('trainingMetrics', {}),
                'validation_metrics': response.get('validationMetrics', {}),
                'tags': response.get('tags', [])
            }
            
            return {
                'success': True,
                'version_info': version_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_solution_versions(self, solution_arn, max_results=100, next_token=None):
        """Listar versiones de solución"""
        
        try:
            params = {
                'solutionArn': solution_arn,
                'maxResults': max_results
            }
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.personalize.list_solution_versions(**params)
            
            versions = []
            for version in response['solutionVersions']:
                version_info = {
                    'solution_version_arn': version['solutionVersionArn'],
                    'solution_arn': version['solutionArn'],
                    'status': version['status'],
                    'creation_date_time': version['creationDateTime'].isoformat() if version.get('creationDateTime') else '',
                    'last_updated_date_time': version.get('lastUpdatedDateTime', '').isoformat() if version.get('lastUpdatedDateTime') else ''
                }
                versions.append(version_info)
            
            return {
                'success': True,
                'versions': versions,
                'count': len(versions),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_campaign(self, name, solution_version_arn, min_provisioned_tps=1,
                        campaign_config=None, tags=None):
        """Crear campaña de recomendación"""
        
        try:
            params = {
                'name': name,
                'solutionVersionArn': solution_version_arn,
                'minProvisionedTPS': min_provisioned_tps
            }
            
            if campaign_config:
                params['campaignConfig'] = campaign_config
            
            if tags:
                params['tags'] = tags
            
            response = self.personalize.create_campaign(**params)
            
            return {
                'success': True,
                'campaign_arn': response['campaignArn'],
                'campaign_name': name,
                'status': 'CREATING'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_campaign(self, campaign_arn):
        """Obtener detalles de la campaña"""
        
        try:
            response = self.personalize.describe_campaign(campaignArn=campaign_arn)
            
            campaign_info = {
                'campaign_arn': response['campaignArn'],
                'campaign_name': response['name'],
                'solution_version_arn': response['solutionVersionArn'],
                'min_provisioned_tps': response['minProvisionedTPS'],
                'status': response['status'],
                'creation_date_time': response['creationDateTime'].isoformat() if response.get('creationDateTime') else '',
                'last_updated_date_time': response.get('lastUpdatedDateTime', '').isoformat() if response.get('lastUpdatedDateTime') else '',
                'failure_reason': response.get('failureReason', ''),
                'campaign_config': response.get('campaignConfig', {}),
                'tags': response.get('tags', [])
            }
            
            return {
                'success': True,
                'campaign_info': campaign_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_campaigns(self, solution_arn=None, max_results=100, next_token=None):
        """Listar campañas"""
        
        try:
            params = {'maxResults': max_results}
            
            if solution_arn:
                params['solutionArn'] = solution_arn
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.personalize.list_campaigns(**params)
            
            campaigns = []
            for campaign in response['campaigns']:
                campaign_info = {
                    'campaign_arn': campaign['campaignArn'],
                    'campaign_name': campaign['name'],
                    'solution_version_arn': campaign['solutionVersionArn'],
                    'status': campaign['status'],
                    'creation_date_time': campaign['creationDateTime'].isoformat() if campaign.get('creationDateTime') else '',
                    'last_updated_date_time': campaign.get('lastUpdatedDateTime', '').isoformat() if campaign.get('lastUpdatedDateTime') else ''
                }
                campaigns.append(campaign_info)
            
            return {
                'success': True,
                'campaigns': campaigns,
                'count': len(campaigns),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_campaign(self, campaign_arn):
        """Eliminar campaña"""
        
        try:
            response = self.personalize.delete_campaign(campaignArn=campaign_arn)
            
            return {
                'success': True,
                'campaign_arn': campaign_arn,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_recommendations(self, campaign_arn, user_id, num_results=10,
                           filter_arn=None, context=None):
        """Obtener recomendaciones para usuario"""
        
        try:
            params = {
                'campaignArn': campaign_arn,
                'userId': user_id,
                'numResults': num_results
            }
            
            if filter_arn:
                params['filterArn'] = filter_arn
            
            if context:
                params['context'] = context
            
            response = self.personalize_runtime.get_recommendations(**params)
            
            recommendations = []
            for item in response['itemList']:
                item_info = {
                    'item_id': item['itemId'],
                    'score': item.get('score', 0),
                    'promotion_name': item.get('promotionName', '')
                }
                recommendations.append(item_info)
            
            return {
                'success': True,
                'recommendations': recommendations,
                'recommendation_id': response.get('recommendationId', '')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_personalized_ranking(self, campaign_arn, user_id, input_list,
                                 filter_arn=None, context=None):
        """Obtener ranking personalizado de ítems"""
        
        try:
            params = {
                'campaignArn': campaign_arn,
                'userId': user_id,
                'inputList': input_list
            }
            
            if filter_arn:
                params['filterArn'] = filter_arn
            
            if context:
                params['context'] = context
            
            response = self.personalize_runtime.get_personalized_ranking(**params)
            
            ranked_items = []
            for item in response['personalizedRanking']:
                item_info = {
                    'item_id': item['itemId'],
                    'score': item.get('score', 0),
                    'promotion_name': item.get('promotionName', '')
                }
                ranked_items.append(item_info)
            
            return {
                'success': True,
                'ranked_items': ranked_items,
                'recommendation_id': response.get('recommendationId', '')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_dataset_group(self, name, domain, role_arn=None, kms_key_arn=None, tags=None):
        """Crear grupo de conjuntos de datos"""
        
        try:
            params = {
                'name': name,
                'domain': domain
            }
            
            if role_arn:
                params['roleArn'] = role_arn
            
            if kms_key_arn:
                params['kmsKeyArn'] = kms_key_arn
            
            if tags:
                params['tags'] = tags
            
            response = self.personalize.create_dataset_group(**params)
            
            return {
                'success': True,
                'dataset_group_arn': response['datasetGroupArn'],
                'dataset_group_name': name,
                'domain': domain
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_dataset_group(self, dataset_group_arn):
        """Obtener detalles del grupo de conjuntos de datos"""
        
        try:
            response = self.personalize.describe_dataset_group(
                datasetGroupArn=dataset_group_arn
            )
            
            group_info = {
                'dataset_group_arn': response['datasetGroupArn'],
                'dataset_group_name': response['name'],
                'domain': response['domain'],
                'role_arn': response.get('roleArn', ''),
                'kms_key_arn': response.get('kmsKeyArn', ''),
                'status': response['status'],
                'creation_date_time': response['creationDateTime'].isoformat() if response.get('creationDateTime') else '',
                'last_updated_date_time': response.get('lastUpdatedDateTime', '').isoformat() if response.get('lastUpdatedDateTime') else '',
                'tags': response.get('tags', [])
            }
            
            return {
                'success': True,
                'group_info': group_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_dataset_groups(self, max_results=100, next_token=None):
        """Listar grupos de conjuntos de datos"""
        
        try:
            params = {'maxResults': max_results}
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.personalize.list_dataset_groups(**params)
            
            groups = []
            for group in response['datasetGroups']:
                group_info = {
                    'dataset_group_arn': group['datasetGroupArn'],
                    'dataset_group_name': group['name'],
                    'domain': group['domain'],
                    'status': group['status'],
                    'creation_date_time': group['creationDateTime'].isoformat() if group.get('creationDateTime') else '',
                    'last_updated_date_time': group.get('lastUpdatedDateTime', '').isoformat() if group.get('lastUpdatedDateTime') else ''
                }
                groups.append(group_info)
            
            return {
                'success': True,
                'groups': groups,
                'count': len(groups),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_dataset_group(self, dataset_group_arn):
        """Eliminar grupo de conjuntos de datos"""
        
        try:
            response = self.personalize.delete_dataset_group(
                datasetGroupArn=dataset_group_arn
            )
            
            return {
                'success': True,
                'dataset_group_arn': dataset_group_arn,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_complete_personalize_workflow(self, project_name, domain, data_s3_uri,
                                           role_arn, recipe_arn=None, min_provisioned_tps=1):
        """Crear flujo completo de Personalize"""
        
        try:
            workflow_results = {
                'project_name': project_name,
                'dataset_group': None,
                'schemas': {},
                'datasets': {},
                'import_jobs': {},
                'solution': None,
                'solution_version': None,
                'campaign': None,
                'status': 'IN_PROGRESS'
            }
            
            # 1. Crear grupo de conjuntos de datos
            dataset_group_result = self.create_dataset_group(
                name=f'{project_name}-dataset-group',
                domain=domain,
                role_arn=role_arn
            )
            
            if dataset_group_result['success']:
                workflow_results['dataset_group'] = dataset_group_result['dataset_group_arn']
                
                # 2. Crear esquemas según el dominio
                if domain == 'ECOMMERCE':
                    # Esquema de interacciones
                    interactions_schema = {
                        'type': 'record',
                        'namespace': 'com.amazonaws.personalize.schema',
                        'fields': [
                            {'name': 'USER_ID', 'type': 'string'},
                            {'name': 'ITEM_ID', 'type': 'string'},
                            {'name': 'TIMESTAMP', 'type': 'long'},
                            {'name': 'EVENT_TYPE', 'type': 'string'},
                            {'name': 'EVENT_VALUE', 'type': 'float'}
                        ],
                        'version': '1.0'
                    }
                    
                    interactions_schema_result = self.create_schema(
                        name=f'{project_name}-interactions-schema',
                        domain=domain,
                        schema_definition=json.dumps(interactions_schema)
                    )
                    
                    if interactions_schema_result['success']:
                        workflow_results['schemas']['interactions'] = interactions_schema_result['schema_arn']
                        
                        # Crear conjunto de datos de interacciones
                        interactions_dataset_result = self.create_dataset(
                            name=f'{project_name}-interactions',
                            domain=domain,
                            schema_arn=interactions_schema_result['schema_arn'],
                            role_arn=role_arn
                        )
                        
                        if interactions_dataset_result['success']:
                            workflow_results['datasets']['interactions'] = interactions_dataset_result['dataset_arn']
                            
                            # Importar datos de interacciones
                            interactions_import_result = self.create_dataset_import_job(
                                job_name=f'{project_name}-interactions-import',
                                dataset_arn=interactions_dataset_result['dataset_arn'],
                                data_source={
                                    'dataLocation': f'{data_s3_uri}/interactions/',
                                    'roleArn': role_arn
                                },
                                role_arn=role_arn
                            )
                            
                            if interactions_import_result['success']:
                                workflow_results['import_jobs']['interactions'] = interactions_import_result['dataset_import_job_arn']
                
                elif domain == 'VIDEO_ON_DEMAND':
                    # Esquema para video on demand
                    interactions_schema = {
                        'type': 'record',
                        'namespace': 'com.amazonaws.personalize.schema',
                        'fields': [
                            {'name': 'USER_ID', 'type': 'string'},
                            {'name': 'ITEM_ID', 'type': 'string'},
                            {'name': 'TIMESTAMP', 'type': 'long'},
                            {'name': 'EVENT_TYPE', 'type': 'string'}
                        ],
                        'version': '1.0'
                    }
                    
                    interactions_schema_result = self.create_schema(
                        name=f'{project_name}-interactions-schema',
                        domain=domain,
                        schema_definition=json.dumps(interactions_schema)
                    )
                    
                    if interactions_schema_result['success']:
                        workflow_results['schemas']['interactions'] = interactions_schema_result['schema_arn']
                        
                        interactions_dataset_result = self.create_dataset(
                            name=f'{project_name}-interactions',
                            domain=domain,
                            schema_arn=interactions_schema_result['schema_arn'],
                            role_arn=role_arn
                        )
                        
                        if interactions_dataset_result['success']:
                            workflow_results['datasets']['interactions'] = interactions_dataset_result['dataset_arn']
                            
                            interactions_import_result = self.create_dataset_import_job(
                                job_name=f'{project_name}-interactions-import',
                                dataset_arn=interactions_dataset_result['dataset_arn'],
                                data_source={
                                    'dataLocation': f'{data_s3_uri}/interactions/',
                                    'roleArn': role_arn
                                },
                                role_arn=role_arn
                            )
                            
                            if interactions_import_result['success']:
                                workflow_results['import_jobs']['interactions'] = interactions_import_result['dataset_import_job_arn']
                
                # 3. Crear solución
                solution_result = self.create_solution(
                    name=f'{project_name}-solution',
                    dataset_group_arn=dataset_group_result['dataset_group_arn'],
                    perform_automl=True,
                    recipe_arn=recipe_arn
                )
                
                if solution_result['success']:
                    workflow_results['solution'] = solution_result['solution_arn']
                    
                    # 4. Crear versión de solución
                    solution_version_result = self.create_solution_version(
                        solution_arn=solution_result['solution_arn']
                    )
                    
                    if solution_version_result['success']:
                        workflow_results['solution_version'] = solution_version_result['solution_version_arn']
                        
                        # 5. Crear campaña
                        campaign_result = self.create_campaign(
                            name=f'{project_name}-campaign',
                            solution_version_arn=solution_version_result['solution_version_arn'],
                            min_provisioned_tps=min_provisioned_tps
                        )
                        
                        if campaign_result['success']:
                            workflow_results['campaign'] = campaign_result['campaign_arn']
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
    
    def analyze_recommendation_performance(self, campaign_arn, time_range_days=30):
        """Analizar rendimiento de recomendaciones"""
        
        try:
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(days=time_range_days)
            
            # Simulación de análisis de rendimiento
            performance_analysis = {
                'campaign_arn': campaign_arn,
                'time_range': {
                    'start_time': start_time.isoformat(),
                    'end_time': end_time.isoformat()
                },
                'usage_metrics': {
                    'total_recommendations': 500000,
                    'unique_users': 25000,
                    'unique_items': 15000,
                    'average_items_per_recommendation': 10.2,
                    'click_through_rate': 12.5,  # porcentaje
                    'conversion_rate': 3.8,  # porcentaje
                    'average_response_time': 45,  # milisegundos
                    'success_rate': 99.7  # porcentaje
                },
                'user_engagement': {
                    'highly_engaged_users': 8500,  # usuarios con más de 10 interacciones
                    'moderately_engaged_users': 12000,  # usuarios con 3-10 interacciones
                    'lowly_engaged_users': 4500,  # usuarios con menos de 3 interacciones
                    'average_sessions_per_user': 4.2,
                    'average_session_duration': 180  # segundos
                },
                'item_performance': {
                    'most_recommended_items': [
                        {'item_id': 'item-001', 'recommendations': 15000, 'clicks': 2100},
                        {'item_id': 'item-002', 'recommendations': 12000, 'clicks': 1680},
                        {'item_id': 'item-003', 'recommendations': 10000, 'clicks': 1400}
                    ],
                    'least_recommended_items': [
                        {'item_id': 'item-999', 'recommendations': 50, 'clicks': 2},
                        {'item_id': 'item-998', 'recommendations': 75, 'clicks': 3}
                    ],
                    'conversion_by_category': {
                        'electronics': 4.2,
                        'clothing': 3.8,
                        'books': 2.9,
                        'home': 3.1
                    }
                },
                'business_impact': {
                    'revenue_from_recommendations': 125000.00,  # USD
                    'average_order_value': 85.50,  # USD
                    'repeat_purchase_rate': 28.5,  # porcentaje
                    'customer_satisfaction': 4.2  # escala 1-5
                }
            }
            
            # Generar recomendaciones
            recommendations = []
            
            if performance_analysis['usage_metrics']['click_through_rate'] < 10.0:
                recommendations.append({
                    'priority': 'HIGH',
                    'category': 'ENGAGEMENT',
                    'title': 'Improve click-through rate',
                    'description': f'CTR is {performance_analysis["usage_metrics"]["click_through_rate"]}%',
                    'action': 'Review recommendation quality and user targeting'
                })
            
            if performance_analysis['usage_metrics']['conversion_rate'] < 3.0:
                recommendations.append({
                    'priority': 'MEDIUM',
                    'category': 'CONVERSION',
                    'title': 'Improve conversion rate',
                    'description': f'Conversion rate is {performance_analysis["usage_metrics"]["conversion_rate"]}%',
                    'action': 'Optimize item selection and recommendation timing'
                })
            
            if performance_analysis['user_engagement']['lowly_engaged_users'] > 5000:
                recommendations.append({
                    'priority': 'MEDIUM',
                    'category': 'RETENTION',
                    'title': 'Reduce low engagement',
                    'description': f'{performance_analysis["user_engagement"]["lowly_engaged_users"]} users with low engagement',
                    'action': 'Implement re-engagement strategies and improve recommendation diversity'
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
    
    def create_personalize_monitoring(self, sns_topic_arn=None):
        """Configurar monitoreo de Personalize"""
        
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
                    Name='personalize-alerts',
                    Tags=[
                        {'Key': 'Service', 'Value': 'Personalize'},
                        {'Key': 'Purpose', 'Value': 'Monitoring'}
                    ]
                )
                monitoring_setup['sns_topic_arn'] = topic_response['TopicArn']
            
            # Crear función Lambda para monitoreo
            lambda_result = self.create_personalize_monitoring_lambda()
            if lambda_result['success']:
                monitoring_setup['lambda_functions'].append(lambda_result['function_arn'])
            
            # Configurar alarmas de CloudWatch
            alarm_result = self.setup_personalize_alarms(monitoring_setup['sns_topic_arn'])
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
    
    def create_personalize_monitoring_lambda(self):
        """Crear función Lambda para monitoreo de Personalize"""
        
        try:
            lambda_code = self._get_personalize_lambda_code()
            
            # Crear rol de ejecución
            role_arn = self._create_lambda_execution_role('personalize-monitoring-role')
            
            # Crear función Lambda
            response = self.lambda_client.create_function(
                FunctionName='personalize-monitor',
                Runtime='python3.9',
                Role=role_arn,
                Handler='lambda_function.lambda_handler',
                Code={
                    'ZipFile': lambda_code
                },
                Description='Lambda function for Personalize monitoring',
                Timeout=300,
                Environment={
                    'Variables': {
                        'SNS_TOPIC_ARN': f'arn:aws:sns:{self.region}:123456789012:personalize-alerts'
                    }
                },
                Tags={
                    'Service': 'Personalize',
                    'Purpose': 'Monitoring'
                }
            )
            
            return {
                'success': True,
                'function_name': 'personalize-monitor',
                'function_arn': response['FunctionArn'],
                'role_arn': role_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_personalize_lambda_code(self):
        """Obtener código de Lambda para monitoreo de Personalize"""
        
        return '''
import json
import boto3
import os
from datetime import datetime

def lambda_handler(event, context):
    sns = boto3.client('sns')
    personalize = boto3.client('personalize')
    
    sns_topic_arn = os.environ['SNS_TOPIC_ARN']
    
    # Analizar evento de Personalize
    event_analysis = analyze_personalize_event(event)
    
    if event_analysis['requires_attention']:
        # Enviar alerta
        alert = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': 'PERSONALIZE_ALERT',
            'resource_type': event_analysis['resource_type'],
            'resource_name': event_analysis['resource_name'],
            'status': event_analysis['status'],
            'risk_level': event_analysis['risk_level'],
            'recommendations': event_analysis['recommendations']
        }
        
        sns.publish(
            TopicArn=sns_topic_arn,
            Subject=f'Personalize Alert: {event_analysis["resource_type"]}',
            Message=json.dumps(alert),
            MessageStructure='string'
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Personalize alert sent',
                'resource_type': event_analysis['resource_type'],
                'risk_level': event_analysis['risk_level']
            })
        }
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'No action required'})
    }

def analyze_personalize_event(event):
    """Analizar evento de Personalize"""
    
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
        
        if detail_type == 'Personalize Dataset Import Job State Change':
            detail = event.get('detail', {})
            analysis['resource_type'] = 'DatasetImportJob'
            analysis['resource_name'] = detail.get('JobName', '')
            analysis['status'] = detail.get('Status', '')
            
            # Determinar si requiere atención
            if analysis['status'] == 'FAILED':
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'HIGH'
                analysis['recommendations'].append(f'Investigate import job failure: {detail.get("FailureReason", "Unknown")}')
        
        elif detail_type == 'Personalize Solution Version State Change':
            detail = event.get('detail', {})
            analysis['resource_type'] = 'SolutionVersion'
            analysis['resource_name'] = detail.get('SolutionName', '')
            analysis['status'] = detail.get('Status', '')
            
            if analysis['status'] == 'FAILED':
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'HIGH'
                analysis['recommendations'].append(f'Investigate solution version failure: {detail.get("FailureReason", "Unknown")}')
            elif analysis['status'] == 'ACTIVE':
                # Verificar métricas de entrenamiento
                if 'TrainingMetrics' in detail:
                    metrics = detail['TrainingMetrics']
                    if metrics.get('coverage', 0) < 0.5:
                        analysis['requires_attention'] = True
                        analysis['risk_level'] = 'MEDIUM'
                        analysis['recommendations'].append('Low coverage detected in training metrics')
        
        elif detail_type == 'Personalize Campaign State Change':
            detail = event.get('detail', {})
            analysis['resource_type'] = 'Campaign'
            analysis['resource_name'] = detail.get('CampaignName', '')
            analysis['status'] = detail.get('Status', '')
            
            if analysis['status'] == 'FAILED':
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'HIGH'
                analysis['recommendations'].append(f'Investigate campaign failure: {detail.get("FailureReason", "Unknown")}')
            elif analysis['status'] == 'ACTIVE':
                # Verificar provisionamiento
                if 'MinProvisionedTPS' in detail:
                    tps = detail['MinProvisionedTPS']
                    if tps > 100:
                        analysis['requires_attention'] = True
                        analysis['risk_level'] 'MEDIUM'
                        analysis['recommendations'].append('High provisioned TPS detected')
    
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
                Description='Execution role for Personalize monitoring Lambda',
                Tags=[
                    {'Key': 'Service', 'Value': 'Lambda'},
                    {'Key': 'Purpose', 'Value': 'PersonalizeMonitoring'}
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
    
    def setup_personalize_alarms(self, sns_topic_arn):
        """Configurar alarmas de CloudWatch para Personalize"""
        
        try:
            alarms_created = []
            
            # Alarma para trabajos de importación fallidos
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='Personalize-FailedImportJobs',
                    AlarmDescription='Failed Personalize import jobs detected',
                    Namespace='AWS/Personalize',
                    MetricName='FailedImportJobs',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('Personalize-FailedImportJobs')
            except Exception:
                pass
            
            # Alarma para campañas fallidas
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='Personalize-FailedCampaigns',
                    AlarmDescription='Failed Personalize campaigns detected',
                    Namespace='AWS/Personalize',
                    MetricName='FailedCampaigns',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('Personalize-FailedCampaigns')
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
    
    def generate_personalize_report(self, report_type='comprehensive', time_range_days=30):
        """Generar reporte de Personalize"""
        
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
                    'recommendations': self._get_recommendation_stats(),
                    'users': self._get_user_stats(),
                    'items': self._get_item_stats(),
                    'campaigns': self._get_campaign_stats()
                }
            
            elif report_type == 'performance':
                # Reporte de rendimiento
                report['performance_assessment'] = {
                    'model_performance': self._get_model_performance_stats(),
                    'recommendation_quality': self._get_recommendation_quality_stats(),
                    'user_engagement': self._get_user_engagement_stats(),
                    'business_impact': self._get_business_impact_stats()
                }
            
            elif report_type == 'cost':
                # Reporte de costos
                report['cost_breakdown'] = {
                    'training_costs': self._get_training_costs(),
                    'campaign_costs': self._get_campaign_costs(),
                    'storage_costs': self._get_storage_costs(),
                    'api_costs': self._get_api_costs(),
                    'total_cost': self._calculate_total_cost()
                }
            
            return {
                'success': True,
                'personalize_report': report
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
            'total_campaigns': 15,
            'active_campaigns': 12,
            'total_solutions': 18,
            'active_solutions': 14,
            'total_dataset_groups': 8,
            'total_datasets': 24,
            'total_recommendations': 2500000,
            'unique_users': 150000,
            'unique_items': 50000,
            'average_recommendations_per_user': 16.7
        }
    
    def _get_performance_metrics(self):
        """Obtener métricas de rendimiento"""
        
        return {
            'average_response_time': 45,  # milisegundos
            'success_rate': 99.7,  # porcentaje
            'click_through_rate': 12.5,  # porcentaje
            'conversion_rate': 3.8,  # porcentaje
            'model_accuracy': 92.3,  # porcentaje
            'coverage': 78.5,  # porcentaje
            'diversity': 65.2,  # porcentaje
            'novelty': 42.8  # porcentaje
        }
    
    def _get_cost_analysis(self):
        """Obtener análisis de costos"""
        
        return {
            'monthly_cost': 4500.00,
            'cost_breakdown': {
                'campaign_provisioning': 2250.00,
                'training': 1125.00,
                'storage': 450.00,
                'api_calls': 675.00
            },
            'cost_trend': 'INCREASING',
            'cost_optimization_potential': 20.0  # porcentaje
        }
    
    def _get_model_analysis(self):
        """Obtener análisis de modelos"""
        
        return {
            'recipe_usage': {
                'user_personalization': 35.2,
                'similar_items': 28.5,
                'popularity_count': 15.8,
                'personalized_ranking': 12.3,
                'custom': 8.2
            },
            'domain_distribution': {
                'ecommerce': 45.3,
                'video_on_demand': 30.2,
                'custom': 24.5
            },
            'model_performance': {
                'high_performing': 8,
                'average_performing': 4,
                'needs_improvement': 2
            }
        }
    
    def _generate_comprehensive_recommendations(self):
        """Generar recomendaciones comprehensivas"""
        
        recommendations = [
            {
                'priority': 'HIGH',
                'category': 'PERFORMANCE',
                'title': 'Improve click-through rate',
                'description': 'Current CTR can be improved with better model tuning',
                'action': 'Implement hyperparameter optimization and feature engineering'
            },
            {
                'priority': 'MEDIUM',
                'category': 'COST',
                'title': 'Optimize campaign provisioning',
                'description': 'Reduce costs by optimizing provisioned TPS',
                'action': 'Implement auto-scaling and right-sizing strategies'
            },
            {
                'priority': 'LOW',
                'category': 'QUALITY',
                'title': 'Enhance recommendation diversity',
                'description': 'Improve recommendation diversity to reduce fatigue',
                'action': 'Implement diversity and novelty optimization techniques'
            }
        ]
        
        return recommendations
```

## Casos de Uso

### **1. Flujo Completo de Personalize**
```python
# Ejemplo: Crear flujo completo de Personalize
manager = PersonalizeManager('us-east-1')

# Configuración del flujo
project_name = 'ecommerce-recommendations'
domain = 'ECOMMERCE'
data_s3_uri = 's3://my-bucket/personalize-data/'
role_arn = 'arn:aws:iam::123456789012:role/PersonalizeServiceRole'
recipe_arn = 'arn:aws:personalize:::recipe/aws-user-personalization'

# Crear flujo completo
workflow_result = manager.create_complete_personalize_workflow(
    project_name=project_name,
    domain=domain,
    data_s3_uri=data_s3_uri,
    role_arn=role_arn,
    recipe_arn=recipe_arn,
    min_provisioned_tps=5
)

if workflow_result['success']:
    workflow = workflow_result['workflow_results']
    print(f"Personalize workflow created: {workflow['project_name']}")
    print(f"Status: {workflow['status']}")
    
    # Mostrar resultados
    print(f"Dataset group: {workflow['dataset_group']}")
    print(f"Schemas: {len(workflow['schemas'])}")
    for schema_type, arn in workflow['schemas'].items():
        print(f"  - {schema_type}: {arn}")
    
    print(f"Datasets: {len(workflow['datasets'])}")
    for dataset_type, arn in workflow['datasets'].items():
        print(f"  - {dataset_type}: {arn}")
    
    print(f"Import jobs: {len(workflow['import_jobs'])}")
    for job_type, arn in workflow['import_jobs'].items():
        print(f"  - {job_type}: {arn}")
    
    if workflow['solution']:
        print(f"Solution: {workflow['solution']}")
    
    if workflow['solution_version']:
        print(f"Solution version: {workflow['solution_version']}")
    
    if workflow['campaign']:
        print(f"Campaign: {workflow['campaign']}")
```

### **2. Obtener Recomendaciones de Usuario**
```python
# Ejemplo: Obtener recomendaciones personalizadas
manager = PersonalizeManager('us-east-1')

# Obtener recomendaciones para un usuario
recommendations_result = manager.get_recommendations(
    campaign_arn='arn:aws:personalize:us-east-1:123456789012:campaign/ecommerce-recommendations-campaign',
    user_id='user-12345',
    num_results=10
)

if recommendations_result['success']:
    recommendations = recommendations_result['recommendations']
    print(f"Recommendations for user:")
    print(f"Recommendation ID: {recommendations_result['recommendation_id']}")
    
    for i, item in enumerate(recommendations):
        print(f"{i+1}. Item: {item['item_id']}")
        print(f"   Score: {item['score']:.4f}")
        print(f"   Promotion: {item['promotion_name']}")
```

### **3. Ranking Personalizado**
```python
# Ejemplo: Obtener ranking personalizado de ítems
manager = PersonalizeManager('us-east-1')

# Lista de ítems para re-ranking
input_list = ['item-001', 'item-002', 'item-003', 'item-004', 'item-005']

# Obtener ranking personalizado
ranking_result = manager.get_personalized_ranking(
    campaign_arn='arn:aws:personalize:us-east-1:123456789012:campaign/ecommerce-recommendations-campaign',
    user_id='user-12345',
    input_list=input_list
)

if ranking_result['success']:
    ranked_items = ranking_result['ranked_items']
    print(f"Personalized ranking for user:")
    print(f"Recommendation ID: {ranking_result['recommendation_id']}")
    
    for i, item in enumerate(ranked_items):
        print(f"{i+1}. Item: {item['item_id']}")
        print(f"   Score: {item['score']:.4f}")
```

### **4. Creación de Esquemas Personalizados**
```python
# Ejemplo: Crear esquemas para diferentes dominios
manager = PersonalizeManager('us-east-1')

# Esquema para E-commerce
ecommerce_schema = {
    'type': 'record',
    'namespace': 'com.amazonaws.personalize.schema',
    'fields': [
        {'name': 'USER_ID', 'type': 'string'},
        {'name': 'ITEM_ID', 'type': 'string'},
        {'name': 'TIMESTAMP', 'type': 'long'},
        {'name': 'EVENT_TYPE', 'type': 'string'},
        {'name': 'EVENT_VALUE', 'type': 'float'}
    ],
    'version': '1.0'
}

# Crear esquema E-commerce
schema_result = manager.create_schema(
    name='ecommerce-interactions-schema',
    domain='ECOMMERCE',
    schema_definition=json.dumps(ecommerce_schema)
)

if schema_result['success']:
    print(f"E-commerce schema created: {schema_result['schema_name']}")
    
    # Obtener detalles del esquema
    schema_info = manager.describe_schema(schema_result['schema_arn'])
    if schema_info['success']:
        info = schema_info['schema_info']
        print(f"Schema ARN: {info['schema_arn']}")
        print(f"Creation time: {info['creation_date_time']}")
```

### **5. Importación de Datos**
```python
# Ejemplo: Importar datos de interacciones
manager = PersonalizeManager('us-east-1')

# Crear trabajo de importación
import_result = manager.create_dataset_import_job(
    job_name='ecommerce-interactions-import',
    dataset_arn='arn:aws:personalize:us-east-1:123456789012:dataset/ecommerce-interactions',
    data_source={
        'dataLocation': 's3://my-bucket/personalize-data/interactions/',
        'roleArn': 'arn:aws:iam::123456789012:role/PersonalizeServiceRole'
    },
    role_arn='arn:aws:iam::123456789012:role/PersonalizeServiceRole'
)

if import_result['success']:
    print(f"Import job created: {import_result['job_name']}")
    
    # Esperar y verificar estado
    time.sleep(60)
    
    import_info = manager.describe_dataset_import_job(import_result['dataset_import_job_arn'])
    if import_info['success']:
        info = import_info['job_info']
        print(f"Import job status: {info['status']}")
        print(f"Creation time: {info['creation_date_time']}")
        
        if info['status'] == 'ACTIVE':
            print(f"Import completed successfully!")
        elif info['status'] == 'FAILED':
            print(f"Import failed: {info['failure_reason']}")
```

### **6. Creación de Solución con AutoML**
```python
# Ejemplo: Crear solución con AutoML
manager = PersonalizeManager('us-east-1')

# Crear solución con AutoML activado
solution_result = manager.create_solution(
    name='ecommerce-user-personalization',
    dataset_group_arn='arn:aws:personalize:us-east-1:123456789012:dataset-group/ecommerce-group',
    perform_automl=True,
    perform_hyperparameter_optimization=True
)

if solution_result['success']:
    print(f"Solution created: {solution_result['solution_name']}")
    
    # Crear versión de solución
    version_result = manager.create_solution_version(
        solution_arn=solution_result['solution_arn']
    )
    
    if version_result['success']:
        print(f"Solution version created: {version_result['solution_version_arn']}")
        
        # Esperar a que se complete el entrenamiento
        time.sleep(300)
        
        # Verificar estado de la versión
        version_info = manager.describe_solution_version(version_result['solution_version_arn'])
        if version_info['success']:
            info = version_info['version_info']
            print(f"Version status: {info['status']}")
            
            if info['status'] == 'ACTIVE':
                print(f"Training completed successfully!")
                
                # Mostrar métricas de entrenamiento
                if 'training_metrics' in info:
                    metrics = info['training_metrics']
                    print(f"Training metrics:")
                    for metric, value in metrics.items():
                        print(f"  - {metric}: {value}")
```

### **7. Análisis de Rendimiento**
```python
# Ejemplo: Analizar rendimiento de recomendaciones
manager = PersonalizeManager('us-east-1')

performance_result = manager.analyze_recommendation_performance(
    campaign_arn='arn:aws:personalize:us-east-1:123456789012:campaign/ecommerce-recommendations-campaign',
    time_range_days=30
)

if performance_result['success']:
    analysis = performance_result['performance_analysis']
    
    print(f"Recommendation Performance Analysis")
    print(f"Total recommendations: {analysis['usage_metrics']['total_recommendations']:,}")
    print(f"Unique users: {analysis['usage_metrics']['unique_users']:,}")
    print(f"Click-through rate: {analysis['usage_metrics']['click_through_rate']}%")
    print(f"Conversion rate: {analysis['usage_metrics']['conversion_rate']}%")
    print(f"Average response time: {analysis['usage_metrics']['average_response_time']}ms")
    
    print(f"\nUser Engagement:")
    engagement = analysis['user_engagement']
    print(f"  - Highly engaged users: {engagement['highly_engaged_users']:,}")
    print(f"  - Moderately engaged users: {engagement['moderately_engaged_users']:,}")
    print(f"  - Lowly engaged users: {engagement['lowly_engaged_users']:,}")
    
    print(f"\nBusiness Impact:")
    business = analysis['business_impact']
    print(f"  - Revenue from recommendations: ${business['revenue_from_recommendations']:,.2f}")
    print(f"  - Average order value: ${business['average_order_value']:.2f}")
    print(f"  - Customer satisfaction: {business['customer_satisfaction']}/5")
    
    # Recomendaciones
    recommendations = analysis['recommendations']
    print(f"\nRecommendations: {len(recommendations)}")
    for rec in recommendations:
        print(f"  - {rec['title']} ({rec['priority']})")
        print(f"    {rec['description']}")
        print(f"    Action: {rec['action']}")
```

### **8. Configuración de Monitoreo**
```python
# Ejemplo: Configurar monitoreo de Personalize
manager = PersonalizeManager('us-east-1')

monitoring_result = manager.create_personalize_monitoring()

if monitoring_result['success']:
    setup = monitoring_result['monitoring_setup']
    print(f"Personalize monitoring configured")
    print(f"SNS Topic: {setup['sns_topic_arn']}")
    print(f"Lambda functions: {len(setup['lambda_functions'])}")
    print(f"CloudWatch alarms: {len(setup['cloudwatch_alarms'])}")
```

## Configuración con AWS CLI

### **Grupos de Conjuntos de Datos**
```bash
# Crear grupo de conjuntos de datos
aws personalize create-dataset-group \
  --name ecommerce-dataset-group \
  --domain ECOMMERCE \
  --role-arn arn:aws:iam::123456789012:role/PersonalizeServiceRole

# Describir grupo de conjuntos de datos
aws personalize describe-dataset-group \
  --dataset-group-arn arn:aws:personalize:us-east-1:123456789012:dataset-group/ecommerce-dataset-group

# Listar grupos de conjuntos de datos
aws personalize list-dataset-groups --max-results 50

# Eliminar grupo de conjuntos de datos
aws personalize delete-dataset-group \
  --dataset-group-arn arn:aws:personalize:us-east-1:123456789012:dataset-group/ecommerce-dataset-group
```

### **Esquemas**
```bash
# Crear esquema
aws personalize create-schema \
  --name ecommerce-interactions-schema \
  --schema file://interactions-schema.json

# Describir esquema
aws personalize describe-schema \
  --schema-arn arn:aws:personalize:us-east-1:123456789012:schema/ecommerce-interactions-schema
```

### **Conjuntos de Datos**
```bash
# Crear conjunto de datos
aws personalize create-dataset \
  --name ecommerce-interactions \
  --domain ECOMMERCE \
  --schema-arn arn:aws:personalize:us-east-1:123456789012:schema/ecommerce-interactions-schema \
  --role-arn arn:aws:iam::123456789012:role/PersonalizeServiceRole

# Describir conjunto de datos
aws personalize describe-dataset \
  --dataset-arn arn:aws:personalize:us-east-1:123456789012:dataset/ecommerce-interactions

# Listar conjuntos de datos
aws personalize list-datasets --max-results 50

# Eliminar conjunto de datos
aws personalize delete-dataset \
  --dataset-arn arn:aws:personalize:us-east-1:123456789012:dataset/ecommerce-interactions
```

### **Importación de Datos**
```bash
# Crear trabajo de importación
aws personalize create-dataset-import-job \
  --job-name ecommerce-interactions-import \
  --dataset-arn arn:aws:personalize:us-east-1:123456789012:dataset/ecommerce-interactions \
  --data-source 'dataLocation=s3://my-bucket/personalize-data/interactions/,roleArn=arn:aws:iam::123456789012:role/PersonalizeServiceRole' \
  --role-arn arn:aws:iam::123456789012:role/PersonalizeServiceRole

# Describir trabajo de importación
aws personalize describe-dataset-import-job \
  --dataset-import-job-arn arn:aws:personalize:us-east-1:123456789012:dataset-import-job/ecommerce-interactions-import

# Listar trabajos de importación
aws personalize list-dataset-import-jobs --max-results 50
```

### **Soluciones**
```bash
# Crear solución
aws personalize create-solution \
  --name ecommerce-user-personalization \
  --dataset-group-arn arn:aws:personalize:us-east-1:123456789012:dataset-group/ecommerce-dataset-group \
  --perform-auto-ml \
  --perform-hyperparameter-optimimization

# Describir solución
aws personalize describe-solution \
  --solution-arn arn:aws:personalize:us-east-1:123456789012:solution/ecommerce-user-personalization

# Listar soluciones
aws personalize list-solutions --max-results 50

# Crear versión de solución
aws personalize create-solution-version \
  --solution-arn arn:aws:personalize:us-east-1:123456789012:solution/ecommerce-user-personalization

# Describir versión de solución
aws personalize describe-solution-version \
  --solution-version-arn arn:aws:personalize:us-east-1:123456789012:solution/ecommerce-user-personalization/VERSION_ID
```

### **Campañas**
```bash
# Crear campaña
aws personalize create-campaign \
  --name ecommerce-recommendations-campaign \
  --solution-version-arn arn:aws:personalize:us-east-1:123456789012:solution/ecommerce-user-personalization/VERSION_ID \
  --min-provisioned-tps 5

# Describir campaña
aws personalize describe-campaign \
  --campaign-arn arn:aws:personalize:us-east-1:123456789012:campaign/ecommerce-recommendations-campaign

# Listar campañas
aws personalize list-campaigns --max-results 50

# Eliminar campaña
aws personalize delete-campaign \
  --campaign-arn arn:aws:personalize:us-east-1:123456789012:campaign/ecommerce-recommendations-campaign
```

### **Recomendaciones**
```bash
# Obtener recomendaciones
aws personalize-runtime get-recommendations \
  --campaign-arn arn:aws:personalize:us-east-1:123456789012:campaign/ecommerce-recommendations-campaign \
  --user-id user-12345 \
  --num-results 10

# Obtener ranking personalizado
aws personalize-runtime get-personalized-ranking \
  --campaign-arn arn:aws:personalize:us-east-1:123456789012:campaign/ecommerce-recommendations-campaign \
  --user-id user-12345 \
  --input-list item-001 item-002 item-003 item-004 item-005
```

## Mejores Prácticas

### **1. Preparación de Datos**
- **Data Quality**: Asegurar alta calidad de datos de interacción
- **Sufficient Data**: Recopilar suficientes datos de usuarios e ítems
- **Event Diversity**: Incluir diferentes tipos de eventos (clicks, purchases, views)
- **Temporal Patterns**: Capturar patrones temporales en los datos
- **User Coverage**: Asegurar cobertura adecuada de usuarios

### **2. Selección de Algoritmos**
- **Domain Selection**: Elegir el dominio apropiado (ECOMMERCE, VIDEO_ON_DEMAND)
- **Recipe Selection**: Seleccionar la receta adecuada para el caso de uso
- **AutoML Usage**: Utilizar AutoML para selección automática
- **Hyperparameter Tuning**: Optimizar hiperparámetros para mejor rendimiento
- **A/B Testing**: Probar múltiples algoritmos con A/B testing

### **3. Evaluación y Optimización**
- **Offline Metrics**: Evaluar modelos con métricas offline
- **Online Metrics**: Monitorear métricas de negocio en producción
- **Continuous Improvement**: Mejorar continuamente los modelos
- **Cold Start**: Manejar problemas de cold start para nuevos usuarios/ítems
- **Diversity**: Asegurar diversidad en las recomendaciones

### **4. Despliegue y Operaciones**
- **Capacity Planning**: Planificar capacidad adecuada para campañas
- **Monitoring**: Monitorear rendimiento y métricas de negocio
- **Cost Optimization**: Optimizar costos de provisionamiento
- **Version Control**: Controlar versiones de modelos
- **Failover**: Implementar estrategias de failover

## Costos

### **Precios de AWS Personalize**
- **Training**: $0.242 por hora de entrenamiento
- **Campaign Provisioning**: $0.20 por hora por TPS provisionado
- **Storage**: $0.10 por GB-mes para almacenamiento de datos
- **API Calls**: $0.20 por 1000 llamadas a la API
- **Dataset Import**: $2.50 por GB de datos importados

### **Ejemplo de Costos Mensuales**
- **Training**: 100 horas × $0.242 = $24.20
- **Campaign Provisioning**: 10 TPS × 730 horas × $0.20 = $1,460.00
- **Storage**: 50 GB × $0.10 = $5.00
- **API Calls**: 100,000 llamadas × $0.20/1000 = $20.00
- **Dataset Import**: 10 GB × $2.50 = $25.00
- **Total estimado**: ~$1,534.20 por mes

## Troubleshooting

### **Problemas Comunes**
1. **Baja Calidad de Recomendaciones**: Mejorar calidad y cantidad de datos
2. **Cold Start Problem**: Implementar estrategias para nuevos usuarios/ítems
3. **Alta Latencia**: Optimizar configuración de campañas
4. **Costos Elevados**: Optimizar provisionamiento y uso de API

### **Comandos de Diagnóstico**
```bash
# Verificar estado del trabajo de importación
aws personalize describe-dataset-import-job --dataset-import-job-arn your-job-arn

# Verificar estado de la versión de solución
aws personalize describe-solution-version --solution-version-arn your-version-arn

# Verificar estado de la campaña
aws personalize describe-campaign --campaign-arn your-campaign-arn

# Verificar logs de CloudWatch
aws logs tail /aws/personalize --follow
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
- **Data Storage**: Almacenamiento de datos de interacción
- **Import/Export**: Importación y exportación de datos
- **Backup**: Backup de conjuntos de datos y modelos
- **Versioning**: Control de versiones de datos

### **AWS Lambda**
- **Data Processing**: Preprocesamiento de datos
- **Event Handling**: Manejo de eventos de Personalize
- **Custom Logic**: Implementación de lógica personalizada
- **Integration**: Integración con sistemas externos

### **AWS CloudWatch**
- **Monitoring**: Monitoreo de métricas y rendimiento
- **Alarms**: Alarmas para eventos críticos
- **Logs**: Almacenamiento de logs de operaciones
- **Dashboards**: Visualización de métricas

### **AWS IAM**
- **Access Control**: Control de acceso a recursos de Personalize
- **Role Management**: Gestión de roles de servicio
- **Permissions**: Permisos específicos para diferentes operaciones
- **Security**: Seguridad de acceso a datos y modelos

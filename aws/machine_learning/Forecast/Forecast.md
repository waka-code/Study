# AWS Forecast

## Definición

AWS Forecast es un servicio de machine learning gestionado que utiliza algoritmos automatizados para predecir series temporales con alta precisión. Proporciona capacidades de pronóstico para demanda, inventario, ventas, y otros datos de series temporales, permitiendo a las empresas tomar decisiones informadas basadas en predicciones precisas sin necesidad de experiencia en machine learning.

## Características Principales

### **Predicción de Series Temporales**
- **AutoML**: Selección automática de algoritmos y optimización de hiperparámetros
- **Múltiples Algoritmos**: Acceso a algoritmos optimizados para diferentes tipos de series temporales
- **Backtesting**: Validación automática de modelos con datos históricos
- **Ensembling**: Combinación de múltiples modelos para mayor precisión
- **Quantile Forecasts**: Predicciones por cuantiles para gestión de incertidumbre

### **Manejo de Datos**
- **Importación de Datos**: Soporte para múltiples formatos y fuentes de datos
- **Preprocesamiento Automático**: Limpieza y transformación de datos
- **Feature Engineering**: Creación automática de características relevantes
- **Holiday Calendar**: Incorporación de calendarios de feriados y eventos especiales
- **Related Time Series**: Incorporación de series temporales relacionadas

### **Visualización y Análisis**
- **Forecast Visualization**: Visualización interactiva de pronósticos
- **Accuracy Metrics**: Métricas detalladas de precisión de pronósticos
- **Backtesting Results**: Resultados de validación histórica
- **Importance Plots**: Visualización de importancia de características
- **Export Capabilities**: Exportación de pronósticos en múltiples formatos

### **Integración y Automatización**
- **API Integration**: APIs RESTful para integración con aplicaciones
- **Event-driven Processing**: Procesamiento basado en eventos
- **Scheduled Forecasts**: Programación automática de pronósticos
- **Real-time Updates**: Actualización de pronósticos con nuevos datos
- **Multi-region Deployment**: Despliegue en múltiples regiones AWS

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

### **3. Operaciones de Pronósticos**
- **CreatePredictor**: Crear predictor de pronósticos
- **DescribePredictor**: Obtener detalles del predictor
- **ListPredictors**: Listar predictores
- **UpdatePredictor**: Actualizar predictor
- **DeletePredictor**: Eliminar predictor

### **4. Operaciones de Exportación**
- **CreateForecast**: Crear pronóstico
- **DescribeForecast**: Obtener detalles del pronóstico
- **ListForecasts**: Listar pronósticos
- **CreateForecastExportJob**: Crear trabajo de exportación
- **DescribeForecastExportJob**: Obtener detalles del trabajo de exportación

## Arquitectura de AWS Forecast

### **Componentes Principales**
```
AWS Forecast Architecture
├── Data Layer
│   ├── Data Import
│   ├── Data Validation
│   ├── Data Preprocessing
│   ├── Feature Engineering
│   └── Data Storage
├── Model Training Layer
│   ├── Algorithm Selection
│   ├── Hyperparameter Tuning
│   ├── Model Training
│   ├── Model Validation
│   └── Model Selection
├── Prediction Layer
│   ├── Forecast Generation
│   ├── Quantile Forecasts
│   ├── Backtesting
│   ├── Accuracy Metrics
│   └── Ensemble Methods
├── Visualization Layer
│   ├── Forecast Plots
│   ├── Accuracy Metrics
│   ├── Feature Importance
│   ├── Backtesting Results
│   └── Export Formats
└── Integration Layer
    ├── REST APIs
    ├── SDK Support
    ├── Event Notifications
    ├── Scheduled Jobs
    └── Third-party Integration
```

### **Flujo de Procesamiento**
```
Data Import → Preprocessing → Model Training → Validation → Forecast Generation → Visualization
```

## Configuración de AWS Forecast

### **Gestión Completa de AWS Forecast**
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

class ForecastManager:
    def __init__(self, region='us-east-1'):
        self.forecast = boto3.client('forecast', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.lambda_client = boto3.client('lambda', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.region = region
    
    def create_dataset(self, dataset_name, domain, dataset_type, data_frequency,
                       schema_definition, encryption_key=None, tags=None):
        """Crear conjunto de datos"""
        
        try:
            params = {
                'DatasetName': dataset_name,
                'Domain': domain,
                'DatasetType': dataset_type,
                'DataFrequency': data_frequency,
                'Schema': schema_definition
            }
            
            if encryption_key:
                params['EncryptionConfig'] = {'KMSKeyArn': encryption_key}
            
            if tags:
                params['Tags'] = tags
            
            response = self.forecast.create_dataset(**params)
            
            return {
                'success': True,
                'dataset_arn': response['DatasetArn'],
                'dataset_name': dataset_name,
                'domain': domain,
                'dataset_type': dataset_type
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_dataset(self, dataset_name):
        """Obtener detalles del conjunto de datos"""
        
        try:
            response = self.forecast.describe_dataset(DatasetName=dataset_name)
            
            dataset_info = {
                'dataset_name': response['DatasetName'],
                'dataset_arn': response['DatasetArn'],
                'domain': response['Domain'],
                'dataset_type': response['DatasetType'],
                'data_frequency': response['DataFrequency'],
                'schema': response['Schema'],
                'creation_time': response['CreationTime'].isoformat() if response.get('CreationTime') else '',
                'last_modification_time': response.get('LastModificationTime', '').isoformat() if response.get('LastModificationTime') else '',
                'status': response['Status'],
                'message': response.get('Message', ''),
                'encryption_config': response.get('EncryptionConfig', {}),
                'estimated_size_in_megabytes': response.get('EstimatedSizeInMegabytes', 0)
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
            params = {'MaxResults': max_results}
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.forecast.list_datasets(**params)
            
            datasets = []
            for dataset in response['Datasets']:
                dataset_info = {
                    'dataset_name': dataset['DatasetName'],
                    'dataset_arn': dataset['DatasetArn'],
                    'domain': dataset['Domain'],
                    'dataset_type': dataset['DatasetType'],
                    'creation_time': dataset['CreationTime'].isoformat() if dataset.get('CreationTime') else ''
                }
                datasets.append(dataset_info)
            
            return {
                'success': True,
                'datasets': datasets,
                'count': len(datasets),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_dataset(self, dataset_name):
        """Eliminar conjunto de datos"""
        
        try:
            response = self.forecast.delete_dataset(DatasetName=dataset_name)
            
            return {
                'success': True,
                'dataset_name': dataset_name,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_dataset_import_job(self, dataset_import_job_name, dataset_arn,
                                  data_source, timestamp_format, time_zone='UTC',
                                  use_case='TRAINING', tags=None):
        """Crear trabajo de importación de datos"""
        
        try:
            params = {
                'DatasetImportJobName': dataset_import_job_name,
                'DatasetArn': dataset_arn,
                'DataSource': data_source,
                'TimestampFormat': timestamp_format,
                'TimeZone': time_zone,
                'UseCase': use_case
            }
            
            if tags:
                params['Tags'] = tags
            
            response = self.forecast.create_dataset_import_job(**params)
            
            return {
                'success': True,
                'import_job_arn': response['DatasetImportJobArn'],
                'import_job_name': dataset_import_job_name,
                'status': 'CREATING'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_dataset_import_job(self, dataset_import_job_name):
        """Obtener detalles del trabajo de importación"""
        
        try:
            response = self.forecast.describe_dataset_import_job(
                DatasetImportJobName=dataset_import_job_name
            )
            
            job_info = {
                'import_job_name': response['DatasetImportJobName'],
                'import_job_arn': response['DatasetImportJobArn'],
                'dataset_arn': response['DatasetArn'],
                'data_source': response['DataSource'],
                'timestamp_format': response['TimestampFormat'],
                'time_zone': response['TimeZone'],
                'use_case': response['UseCase'],
                'status': response['Status'],
                'message': response.get('Message', ''),
                'creation_time': response['CreationTime'].isoformat() if response.get('CreationTime') else '',
                'last_modification_time': response.get('LastModificationTime', '').isoformat() if response.get('LastModificationTime') else '',
                'estimated_size_in_megabytes': response.get('EstimatedSizeInMegabytes', 0),
                'imported_data_size': response.get('ImportedDataSize', 0),
                'field_statistics': response.get('FieldStatistics', {}),
                'data_source_config': response.get('DataSourceConfig', {}),
                'tags': response.get('Tags', [])
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
    
    def list_dataset_import_jobs(self, status=None, max_results=100, next_token=None):
        """Listar trabajos de importación"""
        
        try:
            params = {'MaxResults': max_results}
            
            if status:
                params['Filters'] = [{'Status': status}]
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.forecast.list_dataset_import_jobs(**params)
            
            jobs = []
            for job in response['DatasetImportJobs']:
                job_info = {
                    'import_job_name': job['DatasetImportJobName'],
                    'import_job_arn': job['DatasetImportJobArn'],
                    'dataset_arn': job['DatasetArn'],
                    'status': job['Status'],
                    'creation_time': job['CreationTime'].isoformat() if job.get('CreationTime') else '',
                    'last_modification_time': job.get('LastModificationTime', '').isoformat() if job.get('LastModificationTime') else ''
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
    
    def create_predictor(self, predictor_name, forecast_horizon, algorithm_arn,
                        forecast_types, input_data_config, featurization_config=None,
                        hpo_config=None, training_parameters=None,
                        encryption_key=None, tags=None):
        """Crear predictor de pronósticos"""
        
        try:
            params = {
                'PredictorName': predictor_name,
                'ForecastHorizon': forecast_horizon,
                'AlgorithmArn': algorithm_arn,
                'ForecastTypes': forecast_types,
                'InputDataConfig': input_data_config
            }
            
            if featurization_config:
                params['FeaturizationConfig'] = featurization_config
            
            if hpo_config:
                params['HPOConfig'] = hpo_config
            
            if training_parameters:
                params['TrainingParameters'] = training_parameters
            
            if encryption_key:
                params['EncryptionConfig'] = {'KMSKeyArn': encryption_key}
            
            if tags:
                params['Tags'] = tags
            
            response = self.forecast.create_predictor(**params)
            
            return {
                'success': True,
                'predictor_arn': response['PredictorArn'],
                'predictor_name': predictor_name,
                'status': 'CREATING'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_predictor(self, predictor_name):
        """Obtener detalles del predictor"""
        
        try:
            response = self.forecast.describe_predictor(PredictorName=predictor_name)
            
            predictor_info = {
                'predictor_name': response['PredictorName'],
                'predictor_arn': response['PredictorArn'],
                'algorithm_arn': response['AlgorithmArn'],
                'forecast_horizon': response['ForecastHorizon'],
                'forecast_types': response['ForecastTypes'],
                'input_data_config': response['InputDataConfig'],
                'featurization_config': response.get('FeaturizationConfig', {}),
                'hpo_config': response.get('HPOConfig', {}),
                'training_parameters': response.get('TrainingParameters', {}),
                'estimated_time_remaining_in_minutes': response.get('EstimatedTimeRemainingInMinutes', 0),
                'creation_time': response['CreationTime'].isoformat() if response.get('CreationTime') else '',
                'last_modification_time': response.get('LastModificationTime', '').isoformat() if response.get('LastModificationTime') else '',
                'status': response['Status'],
                'message': response.get('Message', ''),
                'estimated_size_in_megabytes': response.get('EstimatedSizeInMegabytes', 0),
                'auto_ml_override_strategy': response.get('AutoMLOverrideStrategy', ''),
                'encryption_config': response.get('EncryptionConfig', {}),
                'tags': response.get('Tags', [])
            }
            
            return {
                'success': True,
                'predictor_info': predictor_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_predictors(self, status=None, max_results=100, next_token=None):
        """Listar predictores"""
        
        try:
            params = {'MaxResults': max_results}
            
            if status:
                params['Filters'] = [{'Status': status}]
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.forecast.list_predictors(**params)
            
            predictors = []
            for predictor in response['Predictors']:
                predictor_info = {
                    'predictor_name': predictor['PredictorName'],
                    'predictor_arn': predictor['PredictorArn'],
                    'algorithm_arn': predictor['AlgorithmArn'],
                    'forecast_horizon': predictor['ForecastHorizon'],
                    'status': predictor['Status'],
                    'creation_time': predictor['CreationTime'].isoformat() if predictor.get('CreationTime') else '',
                    'last_modification_time': predictor.get('LastModificationTime', '').isoformat() if predictor.get('LastModificationTime') else ''
                }
                predictors.append(predictor_info)
            
            return {
                'success': True,
                'predictors': predictors,
                'count': len(predictors),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_predictor(self, predictor_name):
        """Eliminar predictor"""
        
        try:
            response = self.forecast.delete_predictor(PredictorName=predictor_name)
            
            return {
                'success': True,
                'predictor_name': predictor_name,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_forecast(self, forecast_name, predictor_arn, forecast_types=None,
                       time_series_selector=None, tags=None):
        """Crear pronóstico"""
        
        try:
            params = {
                'ForecastName': forecast_name,
                'PredictorArn': predictor_arn
            }
            
            if forecast_types:
                params['ForecastTypes'] = forecast_types
            
            if time_series_selector:
                params['TimeSeriesSelector'] = time_series_selector
            
            if tags:
                params['Tags'] = tags
            
            response = self.forecast.create_forecast(**params)
            
            return {
                'success': True,
                'forecast_arn': response['ForecastArn'],
                'forecast_name': forecast_name,
                'status': 'CREATING'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_forecast(self, forecast_name):
        """Obtener detalles del pronóstico"""
        
        try:
            response = self.forecast.describe_forecast(ForecastName=forecast_name)
            
            forecast_info = {
                'forecast_name': response['ForecastName'],
                'forecast_arn': response['ForecastArn'],
                'predictor_arn': response['PredictorArn'],
                'forecast_types': response['ForecastTypes'],
                'time_series_selector': response.get('TimeSeriesSelector', {}),
                'estimated_time_remaining_in_minutes': response.get('EstimatedTimeRemainingInMinutes', 0),
                'creation_time': response['CreationTime'].isoformat() if response.get('CreationTime') else '',
                'last_modification_time': response.get('LastModificationTime', '').isoformat() if response.get('LastModificationTime') else '',
                'status': response['Status'],
                'message': response.get('Message', ''),
                'estimated_size_in_megabytes': response.get('EstimatedSizeInMegabytes', 0),
                'tags': response.get('Tags', [])
            }
            
            return {
                'success': True,
                'forecast_info': forecast_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_forecasts(self, status=None, max_results=100, next_token=None):
        """Listar pronósticos"""
        
        try:
            params = {'MaxResults': max_results}
            
            if status:
                params['Filters'] = [{'Status': status}]
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.forecast.list_forecasts(**params)
            
            forecasts = []
            for forecast in response['Forecasts']:
                forecast_info = {
                    'forecast_name': forecast['ForecastName'],
                    'forecast_arn': forecast['ForecastArn'],
                    'predictor_arn': forecast['PredictorArn'],
                    'forecast_types': forecast['ForecastTypes'],
                    'status': forecast['Status'],
                    'creation_time': forecast['CreationTime'].isoformat() if forecast.get('CreationTime') else '',
                    'last_modification_time': forecast.get('LastModificationTime', '').isoformat() if forecast.get('LastModificationTime') else ''
                }
                forecasts.append(forecast_info)
            
            return {
                'success': True,
                'forecasts': forecasts,
                'count': len(forecasts),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_forecast(self, forecast_name):
        """Eliminar pronóstico"""
        
        try:
            response = self.forecast.delete_forecast(ForecastName=forecast_name)
            
            return {
                'success': True,
                'forecast_name': forecast_name,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_forecast_export_job(self, forecast_export_job_name, forecast_arn,
                                    destination, format='CSV', tags=None):
        """Crear trabajo de exportación de pronóstico"""
        
        try:
            params = {
                'ForecastExportJobName': forecast_export_job_name,
                'ForecastArn': forecast_arn,
                'Destination': destination,
                'Format': format
            }
            
            if tags:
                params['Tags'] = tags
            
            response = self.forecast.create_forecast_export_job(**params)
            
            return {
                'success': True,
                'export_job_arn': response['ForecastExportJobArn'],
                'export_job_name': forecast_export_job_name,
                'status': 'CREATING'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_forecast_export_job(self, forecast_export_job_name):
        """Obtener detalles del trabajo de exportación"""
        
        try:
            response = self.forecast.describe_forecast_export_job(
                ForecastExportJobName=forecast_export_job_name
            )
            
            job_info = {
                'export_job_name': response['ForecastExportJobName'],
                'export_job_arn': response['ForecastExportJobArn'],
                'forecast_arn': response['ForecastArn'],
                'destination': response['Destination'],
                'format': response['Format'],
                'status': response['Status'],
                'message': response.get('Message', ''),
                'creation_time': response['CreationTime'].isoformat() if response.get('CreationTime') else '',
                'last_modification_time': response.get('LastModificationTime', '').isoformat() if response.get('LastModificationTime') else '',
                'estimated_size_in_megabytes': response.get('EstimatedSizeInMegabytes', 0),
                'tags': response.get('Tags', [])
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
    
    def list_forecast_export_jobs(self, status=None, max_results=100, next_token=None):
        """Listar trabajos de exportación"""
        
        try:
            params = {'MaxResults': max_results}
            
            if status:
                params['Filters'] = [{'Status': status}]
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.forecast.list_forecast_export_jobs(**params)
            
            jobs = []
            for job in response['ForecastExportJobs']:
                job_info = {
                    'export_job_name': job['ForecastExportJobName'],
                    'export_job_arn': job['ForecastExportJobArn'],
                    'forecast_arn': job['ForecastArn'],
                    'status': job['Status'],
                    'creation_time': job['CreationTime'].isoformat() if job.get('CreationTime') else '',
                    'last_modification_time': job.get('LastModificationTime', '').isoformat() if job.get('LastModificationTime') else ''
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
    
    def get_accuracy_metrics(self, predictor_name):
        """Obtener métricas de precisión del predictor"""
        
        try:
            response = self.forecast.get_accuracy_metrics(PredictorName=predictor_name)
            
            metrics = []
            for metric in response['PredictorEvaluationResults']:
                metric_info = {
                    'algorithm_arn': metric['AlgorithmArn'],
                    'test_windows': metric.get('TestWindows', []),
                    'validation_metrics': metric.get('ValidationMetrics', {}),
                    'window_metrics': metric.get('WindowMetrics', [])
                }
                metrics.append(metric_info)
            
            return {
                'success': True,
                'accuracy_metrics': metrics,
                'count': len(metrics)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def query_forecast(self, forecast_name, start_date=None, end_date=None,
                      filters=None, next_token=None):
        """Consultar pronóstico"""
        
        try:
            params = {'ForecastArn': f'arn:aws:forecast:{self.region}:123456789012:forecast/{forecast_name}'}
            
            if start_date:
                params['StartDate'] = start_date
            
            if end_date:
                params['EndDate'] = end_date
            
            if filters:
                params['Filters'] = filters
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.forecast.query_forecast(**params)
            
            forecast_data = {
                'forecast': response['Forecast'],
                'next_token': response.get('NextToken')
            }
            
            return {
                'success': True,
                'forecast_data': forecast_data
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_time_series_dataset(self, dataset_name, data_frequency, schema_definition,
                                   timestamp_format='yyyy-MM-dd HH:mm:ss',
                                   time_zone='UTC', tags=None):
        """Crear conjunto de datos de series temporales"""
        
        try:
            # Schema para series temporales
            schema = {
                'Attributes': [
                    {
                        'AttributeName': 'timestamp',
                        'AttributeType': 'timestamp'
                    },
                    {
                        'AttributeName': 'target_value',
                        'AttributeType': 'float'
                    },
                    {
                        'AttributeName': 'item_id',
                        'AttributeType': 'string'
                    }
                ]
            }
            
            # Actualizar schema con definición personalizada
            if schema_definition:
                schema.update(schema_definition)
            
            result = self.create_dataset(
                dataset_name=dataset_name,
                domain='CUSTOM',
                dataset_type='TARGET_TIME_SERIES',
                data_frequency=data_frequency,
                schema_definition=schema,
                tags=tags
            )
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_related_dataset(self, dataset_name, data_frequency, schema_definition,
                              timestamp_format='yyyy-MM-dd HH:mm:ss',
                              time_zone='UTC', tags=None):
        """Crear conjunto de datos relacionado"""
        
        try:
            # Schema para datos relacionados
            schema = {
                'Attributes': [
                    {
                        'AttributeName': 'timestamp',
                        'AttributeType': 'timestamp'
                    },
                    {
                        'AttributeName': 'value',
                        'AttributeType': 'float'
                    },
                    {
                        'AttributeName': 'item_id',
                        'AttributeType': 'string'
                    },
                    {
                        'AttributeName': 'feature_name',
                        'AttributeType': 'string'
                    }
                ]
            }
            
            # Actualizar schema con definición personalizada
            if schema_definition:
                schema.update(schema_definition)
            
            result = self.create_dataset(
                dataset_name=dataset_name,
                domain='CUSTOM',
                dataset_type='RELATED_TIME_SERIES',
                data_frequency=data_frequency,
                schema_definition=schema,
                tags=tags
            )
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_item_metadata_dataset(self, dataset_name, schema_definition, tags=None):
        """Crear conjunto de datos de metadatos de items"""
        
        try:
            # Schema para metadatos de items
            schema = {
                'Attributes': [
                    {
                        'AttributeName': 'item_id',
                        'AttributeType': 'string'
                    },
                    {
                        'AttributeName': 'category',
                        'AttributeType': 'string'
                    },
                    {
                        'AttributeName': 'region',
                        'AttributeType': 'string'
                    }
                ]
            }
            
            # Actualizar schema con definición personalizada
            if schema_definition:
                schema.update(schema_definition)
            
            result = self.create_dataset(
                dataset_name=dataset_name,
                domain='CUSTOM',
                dataset_type='ITEM_METADATA',
                data_frequency='D',  # No aplica para metadatos
                schema_definition=schema,
                tags=tags
            )
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_complete_forecast_workflow(self, project_name, target_data_s3_uri,
                                        related_data_s3_uri=None, item_metadata_s3_uri=None,
                                        forecast_horizon=30, data_frequency='D',
                                        forecast_types=['0.1', '0.5', '0.9']):
        """Crear flujo completo de pronóstico"""
        
        try:
            workflow_results = {
                'project_name': project_name,
                'datasets': {},
                'import_jobs': {},
                'predictor': None,
                'forecast': None,
                'status': 'IN_PROGRESS'
            }
            
            # 1. Crear conjunto de datos de series temporales
            target_dataset_name = f'{project_name}_target_data'
            target_schema = {
                'Attributes': [
                    {'AttributeName': 'timestamp', 'AttributeType': 'timestamp'},
                    {'AttributeName': 'target_value', 'AttributeType': 'float'},
                    {'AttributeName': 'item_id', 'AttributeType': 'string'}
                ]
            }
            
            target_dataset_result = self.create_time_series_dataset(
                dataset_name=target_dataset_name,
                data_frequency=data_frequency,
                schema_definition=target_schema
            )
            
            if target_dataset_result['success']:
                workflow_results['datasets']['target'] = target_dataset_result['dataset_arn']
                
                # 2. Importar datos de series temporales
                target_import_job_name = f'{project_name}_target_import'
                target_data_source = {
                    'S3Config': {
                        'Path': target_data_s3_uri,
                        'RoleArn': f'arn:aws:iam::123456789012:role/ForecastServiceRole'
                    }
                }
                
                target_import_result = self.create_dataset_import_job(
                    dataset_import_job_name=target_import_job_name,
                    dataset_arn=target_dataset_result['dataset_arn'],
                    data_source=target_data_source,
                    timestamp_format='yyyy-MM-dd HH:mm:ss'
                )
                
                if target_import_result['success']:
                    workflow_results['import_jobs']['target'] = target_import_result['import_job_arn']
            
            # 3. Crear conjunto de datos relacionado (opcional)
            if related_data_s3_uri:
                related_dataset_name = f'{project_name}_related_data'
                related_schema = {
                    'Attributes': [
                        {'AttributeName': 'timestamp', 'AttributeType': 'timestamp'},
                        {'AttributeName': 'value', 'AttributeType': 'float'},
                        {'AttributeName': 'item_id', 'AttributeType': 'string'},
                        {'AttributeName': 'feature_name', 'AttributeType': 'string'}
                    ]
                }
                
                related_dataset_result = self.create_related_dataset(
                    dataset_name=related_dataset_name,
                    data_frequency=data_frequency,
                    schema_definition=related_schema
                )
                
                if related_dataset_result['success']:
                    workflow_results['datasets']['related'] = related_dataset_result['dataset_arn']
                    
                    # Importar datos relacionados
                    related_import_job_name = f'{project_name}_related_import'
                    related_data_source = {
                        'S3Config': {
                            'Path': related_data_s3_uri,
                            'RoleArn': f'arn:aws:iam::123456789012:role/ForecastServiceRole'
                        }
                    }
                    
                    related_import_result = self.create_dataset_import_job(
                        dataset_import_job_name=related_import_job_name,
                        dataset_arn=related_dataset_result['dataset_arn'],
                        data_source=related_data_source,
                        timestamp_format='yyyy-MM-dd HH:mm:ss'
                    )
                    
                    if related_import_result['success']:
                        workflow_results['import_jobs']['related'] = related_import_result['import_job_arn']
            
            # 4. Crear conjunto de datos de metadatos (opcional)
            if item_metadata_s3_uri:
                metadata_dataset_name = f'{project_name}_item_metadata'
                metadata_schema = {
                    'Attributes': [
                        {'AttributeName': 'item_id', 'AttributeType': 'string'},
                        {'AttributeName': 'category', 'AttributeType': 'string'},
                        {'AttributeName': 'region', 'AttributeType': 'string'}
                    ]
                }
                
                metadata_dataset_result = self.create_item_metadata_dataset(
                    dataset_name=metadata_dataset_name,
                    schema_definition=metadata_schema
                )
                
                if metadata_dataset_result['success']:
                    workflow_results['datasets']['metadata'] = metadata_dataset_result['dataset_arn']
                    
                    # Importar metadatos
                    metadata_import_job_name = f'{project_name}_metadata_import'
                    metadata_data_source = {
                        'S3Config': {
                            'Path': item_metadata_s3_uri,
                            'RoleArn': f'arn:aws:iam::123456789012:role/ForecastServiceRole'
                        }
                    }
                    
                    metadata_import_result = self.create_dataset_import_job(
                        dataset_import_job_name=metadata_import_job_name,
                        dataset_arn=metadata_dataset_result['dataset_arn'],
                        data_source=metadata_data_source,
                        timestamp_format='yyyy-MM-dd HH:mm:ss'
                    )
                    
                    if metadata_import_result['success']:
                        workflow_results['import_jobs']['metadata'] = metadata_import_result['import_job_arn']
            
            # 5. Crear predictor
            predictor_name = f'{project_name}_predictor'
            
            # Configuración de datos de entrada
            input_data_config = {
                'DatasetGroupArn': f'arn:aws:forecast:{self.region}:123456789012:dataset-group/{project_name}'
            }
            
            # Algoritmo AutoML
            algorithm_arn = f'arn:aws:forecast:{self.region}::algorithm/auto_arima'
            
            predictor_result = self.create_predictor(
                predictor_name=predictor_name,
                forecast_horizon=forecast_horizon,
                algorithm_arn=algorithm_arn,
                forecast_types=forecast_types,
                input_data_config=input_data_config
            )
            
            if predictor_result['success']:
                workflow_results['predictor'] = predictor_result['predictor_arn']
            
            # 6. Crear pronóstico
            forecast_name = f'{project_name}_forecast'
            
            forecast_result = self.create_forecast(
                forecast_name=forecast_name,
                predictor_arn=predictor_result['predictor_arn'],
                forecast_types=forecast_types
            )
            
            if forecast_result['success']:
                workflow_results['forecast'] = forecast_result['forecast_arn']
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
    
    def analyze_forecast_accuracy(self, predictor_name):
        """Analizar precisión del pronóstico"""
        
        try:
            # Obtener métricas de precisión
            metrics_result = self.get_accuracy_metrics(predictor_name)
            
            if not metrics_result['success']:
                return metrics_result
            
            accuracy_analysis = {
                'predictor_name': predictor_name,
                'algorithm_performance': {},
                'overall_metrics': {},
                'recommendations': []
            }
            
            # Analizar métricas por algoritmo
            for metric in metrics_result['accuracy_metrics']:
                algorithm_name = metric['algorithm_arn'].split(':')[-1]
                validation_metrics = metric.get('validation_metrics', {})
                
                accuracy_analysis['algorithm_performance'][algorithm_name] = {
                    'validation_metrics': validation_metrics,
                    'test_windows': metric.get('test_windows', [])
                }
            
            # Calcular métricas generales
            all_metrics = []
            for metric in metrics_result['accuracy_metrics']:
                validation_metrics = metric.get('validation_metrics', {})
                if 'RMSE' in validation_metrics:
                    all_metrics.append(validation_metrics['RMSE'])
                if 'MAPE' in validation_metrics:
                    all_metrics.append(validation_metrics['MAPE'])
            
            if all_metrics:
                accuracy_analysis['overall_metrics'] = {
                    'average_rmse': sum(m for m in all_metrics if isinstance(m, (int, float))) / len(all_metrics),
                    'min_rmse': min(m for m in all_metrics if isinstance(m, (int, float))),
                    'max_rmse': max(m for m in all_metrics if isinstance(m, (int, float)))
                }
            
            # Generar recomendaciones
            recommendations = []
            
            if accuracy_analysis['overall_metrics'].get('average_rmse', 0) > 100:
                recommendations.append({
                    'priority': 'HIGH',
                    'category': 'ACCURACY',
                    'title': 'Low forecast accuracy',
                    'description': f'Average RMSE is {accuracy_analysis["overall_metrics"]["average_rmse"]:.2f}',
                    'action': 'Consider additional features or longer training data'
                })
            
            if len(accuracy_analysis['algorithm_performance']) > 1:
                best_algorithm = min(accuracy_analysis['algorithm_performance'].items(),
                                   key=lambda x: x[1]['validation_metrics'].get('RMSE', float('inf')))
                recommendations.append({
                    'priority': 'MEDIUM',
                    'category': 'OPTIMIZATION',
                    'title': 'Best performing algorithm',
                    'description': f'{best_algorithm[0]} performs best',
                    'action': f'Consider using {best_algorithm[0]} for production'
                })
            
            accuracy_analysis['recommendations'] = recommendations
            
            return {
                'success': True,
                'accuracy_analysis': accuracy_analysis
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_forecast_monitoring(self, sns_topic_arn=None):
        """Configurar monitoreo de Forecast"""
        
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
                    Name='forecast-alerts',
                    Tags=[
                        {'Key': 'Service', 'Value': 'Forecast'},
                        {'Key': 'Purpose', 'Value': 'Monitoring'}
                    ]
                )
                monitoring_setup['sns_topic_arn'] = topic_response['TopicArn']
            
            # Crear función Lambda para monitoreo
            lambda_result = self.create_forecast_monitoring_lambda()
            if lambda_result['success']:
                monitoring_setup['lambda_functions'].append(lambda_result['function_arn'])
            
            # Configurar alarmas de CloudWatch
            alarm_result = self.setup_forecast_alarms(monitoring_setup['sns_topic_arn'])
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
    
    def create_forecast_monitoring_lambda(self):
        """Crear función Lambda para monitoreo de Forecast"""
        
        try:
            lambda_code = self._get_forecast_lambda_code()
            
            # Crear rol de ejecución
            role_arn = self._create_lambda_execution_role('forecast-monitoring-role')
            
            # Crear función Lambda
            response = self.lambda_client.create_function(
                FunctionName='forecast-monitor',
                Runtime='python3.9',
                Role=role_arn,
                Handler='lambda_function.lambda_handler',
                Code={
                    'ZipFile': lambda_code
                },
                Description='Lambda function for Forecast monitoring',
                Timeout=300,
                Environment={
                    'Variables': {
                        'SNS_TOPIC_ARN': f'arn:aws:sns:{self.region}:123456789012:forecast-alerts'
                    }
                },
                Tags={
                    'Service': 'Forecast',
                    'Purpose': 'Monitoring'
                }
            )
            
            return {
                'success': True,
                'function_name': 'forecast-monitor',
                'function_arn': response['FunctionArn'],
                'role_arn': role_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_forecast_lambda_code(self):
        """Obtener código de Lambda para monitoreo de Forecast"""
        
        return '''
import json
import boto3
import os
from datetime import datetime

def lambda_handler(event, context):
    sns = boto3.client('sns')
    forecast = boto3.client('forecast')
    
    sns_topic_arn = os.environ['SNS_TOPIC_ARN']
    
    # Analizar evento de Forecast
    event_analysis = analyze_forecast_event(event)
    
    if event_analysis['requires_attention']:
        # Enviar alerta
        alert = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': 'FORECAST_ALERT',
            'resource_type': event_analysis['resource_type'],
            'resource_name': event_analysis['resource_name'],
            'status': event_analysis['status'],
            'risk_level': event_analysis['risk_level'],
            'recommendations': event_analysis['recommendations']
        }
        
        sns.publish(
            TopicArn=sns_topic_arn,
            Subject=f'Forecast Alert: {event_analysis["resource_type"]}',
            Message=json.dumps(alert),
            MessageStructure='string'
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Forecast alert sent',
                'resource_type': event_analysis['resource_type'],
                'risk_level': event_analysis['risk_level']
            })
        }
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'No action required'})
    }

def analyze_forecast_event(event):
    """Analizar evento de Forecast"""
    
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
        
        if detail_type == 'Forecast Dataset Import Job State Change':
            detail = event.get('detail', {})
            analysis['resource_type'] = 'DatasetImportJob'
            analysis['resource_name'] = detail.get('DatasetImportJobName', '')
            analysis['status'] = detail.get('Status', '')
            
            # Determinar si requiere atención
            if analysis['status'] == 'FAILED':
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'HIGH'
                analysis['recommendations'].append(f'Investigate import job failure: {detail.get("FailureReason", "Unknown")}')
        
        elif detail_type == 'Forecast Predictor State Change':
            detail = event.get('detail', {})
            analysis['resource_type'] = 'Predictor'
            analysis['resource_name'] = detail.get('PredictorName', '')
            analysis['status'] = detail.get('Status', '')
            
            if analysis['status'] == 'FAILED':
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'HIGH'
                analysis['recommendations'].append(f'Investigate predictor failure: {detail.get("FailureReason", "Unknown")}')
            elif analysis['status'] == 'ACTIVE':
                # Verificar métricas de precisión
                if 'EstimatedTimeRemainingInMinutes' in detail:
                    estimated_time = detail['EstimatedTimeRemainingInMinutes']
                    if estimated_time > 1440:  # Más de 24 horas
                        analysis['requires_attention'] = True
                        analysis['risk_level'] = 'MEDIUM'
                        analysis['recommendations'].append('Long training time detected')
        
        elif detail_type == 'Forecast State Change':
            detail = event.get('detail', {})
            analysis['resource_type'] = 'Forecast'
            analysis['resource_name'] = detail.get('ForecastName', '')
            analysis['status'] = detail.get('Status', '')
            
            if analysis['status'] == 'FAILED':
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'HIGH'
                analysis['recommendations'].append(f'Investigate forecast failure: {detail.get("FailureReason", "Unknown")}')
    
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
                Description='Execution role for Forecast monitoring Lambda',
                Tags=[
                    {'Key': 'Service', 'Value': 'Lambda'},
                    {'Key': 'Purpose', 'Value': 'ForecastMonitoring'}
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
    
    def setup_forecast_alarms(self, sns_topic_arn):
        """Configurar alarmas de CloudWatch para Forecast"""
        
        try:
            alarms_created = []
            
            # Alarma para trabajos de importación fallidos
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='Forecast-FailedImportJobs',
                    AlarmDescription='Failed Forecast import jobs detected',
                    Namespace='AWS/Forecast',
                    MetricName='FailedImportJobs',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('Forecast-FailedImportJobs')
            except Exception:
                pass
            
            # Alarma para predictores fallidos
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='Forecast-FailedPredictors',
                    AlarmDescription='Failed Forecast predictors detected',
                    Namespace='AWS/Forecast',
                    MetricName='FailedPredictors',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('Forecast-FailedPredictors')
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
    
    def generate_forecast_report(self, report_type='comprehensive', time_range_days=30):
        """Generar reporte de Forecast"""
        
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
                    'datasets': self._get_dataset_stats(),
                    'predictors': self._get_predictor_stats(),
                    'forecasts': self._get_forecast_stats(),
                    'import_jobs': self._get_import_job_stats()
                }
            
            elif report_type == 'accuracy':
                # Reporte de precisión
                report['accuracy_assessment'] = {
                    'model_performance': self._get_model_performance_stats(),
                    'forecast_accuracy': self._get_forecast_accuracy_stats(),
                    'algorithm_comparison': self._get_algorithm_comparison_stats(),
                    'accuracy_trends': self._get_accuracy_trends()
                }
            
            elif report_type == 'cost':
                # Reporte de costos
                report['cost_breakdown'] = {
                    'dataset_costs': self._get_dataset_costs(),
                    'predictor_costs': self._get_predictor_costs(),
                    'forecast_costs': self._get_forecast_costs(),
                    'storage_costs': self._get_storage_costs(),
                    'total_cost': self._calculate_total_cost()
                }
            
            return {
                'success': True,
                'forecast_report': report
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
            'total_datasets': 45,
            'active_predictors': 12,
            'completed_forecasts': 35,
            'import_jobs': 150,
            'forecast_export_jobs': 25,
            'total_time_series': 5000000,
            'average_forecast_horizon': 30,
            'most_used_frequency': 'D'
        }
    
    def _get_performance_metrics(self):
        """Obtener métricas de rendimiento"""
        
        return {
            'average_training_time': 2.5,  # horas
            'average_forecast_generation_time': 0.5,  # horas
            'average_data_import_time': 0.25,  # horas
            'success_rate': 95.2,  # porcentaje
            'average_accuracy': 92.8,  # porcentaje
            'average_rmse': 15.3,
            'system_uptime': 99.9  # porcentaje
        }
    
    def _get_cost_analysis(self):
        """Obtener análisis de costos"""
        
        return {
            'monthly_cost': 3500.00,
            'cost_breakdown': {
                'predictor_training': 1750.00,
                'forecast_generation': 875.00,
                'data_import': 437.50,
                'storage': 250.00,
                'api_calls': 187.50
            },
            'cost_trend': 'STABLE',
            'cost_optimization_potential': 18.0  # porcentaje
        }
    
    def _get_model_analysis(self):
        """Obtener análisis de modelos"""
        
        return {
            'algorithm_usage': {
                'auto_arima': 35.2,
                'prophet': 28.5,
                'deep_ar_plus': 15.8,
                'npts': 12.3,
                'custom': 8.2
            },
            'forecast_types': {
                'point_forecasts': 45.3,
                'quantile_forecasts': 54.7
            },
            'data_frequencies': {
                'hourly': 15.2,
                'daily': 65.3,
                'weekly': 12.5,
                'monthly': 7.0
            }
        }
    
    def _generate_comprehensive_recommendations(self):
        """Generar recomendaciones comprehensivas"""
        
        recommendations = [
            {
                'priority': 'HIGH',
                'category': 'ACCURACY',
                'title': 'Improve forecast accuracy',
                'description': 'Use additional features and longer training data',
                'action': 'Incorporate related time series and item metadata'
            },
            {
                'priority': 'MEDIUM',
                'category': 'COST',
                'title': 'Optimize training costs',
                'description': 'Use appropriate algorithm selection and hyperparameter tuning',
                'action': 'Implement cost optimization strategies for large datasets'
            },
            {
                'priority': 'LOW',
                'category': 'AUTOMATION',
                'title': 'Automate forecast workflows',
                'description': 'Implement automated forecast generation and monitoring',
                'action': 'Set up scheduled forecasts and automated quality checks'
            }
        ]
        
        return recommendations
```

## Casos de Uso

### **1. Flujo Completo de Pronóstico**
```python
# Ejemplo: Crear flujo completo de pronóstico
manager = ForecastManager('us-east-1')

# Datos de ejemplo
target_data_s3_uri = 's3://my-bucket/forecast-data/target/'
related_data_s3_uri = 's3://my-bucket/forecast-data/related/'
item_metadata_s3_uri = 's3://my-bucket/forecast-data/metadata/'

# Crear flujo completo
workflow_result = manager.create_complete_forecast_workflow(
    project_name='sales-forecast-2024',
    target_data_s3_uri=target_data_s3_uri,
    related_data_s3_uri=related_data_s3_uri,
    item_metadata_s3_uri=item_metadata_s3_uri,
    forecast_horizon=30,
    data_frequency='D',
    forecast_types=['0.1', '0.5', '0.9']
)

if workflow_result['success']:
    workflow = workflow_result['workflow_results']
    print(f"Workflow created: {workflow['project_name']}")
    print(f"Status: {workflow['status']}")
    
    # Mostrar resultados
    print(f"Datasets: {len(workflow['datasets'])}")
    for dataset_type, arn in workflow['datasets'].items():
        print(f"  - {dataset_type}: {arn}")
    
    print(f"Import jobs: {len(workflow['import_jobs'])}")
    for job_type, arn in workflow['import_jobs'].items():
        print(f"  - {job_type}: {arn}")
    
    if workflow['predictor']:
        print(f"Predictor: {workflow['predictor']}")
    
    if workflow['forecast']:
        print(f"Forecast: {workflow['forecast']}")
```

### **2. Creación de Conjunto de Datos Personalizado**
```python
# Ejemplo: Crear conjunto de datos de series temporales
manager = ForecastManager('us-east-1')

# Schema personalizado
schema_definition = {
    'Attributes': [
        {'AttributeName': 'timestamp', 'AttributeType': 'timestamp'},
        {'AttributeName': 'demand', 'AttributeType': 'float'},
        {'AttributeName': 'product_id', 'AttributeType': 'string'},
        {'AttributeName': 'store_id', 'AttributeType': 'string'},
        {'AttributeName': 'promotion_flag', 'AttributeType': 'boolean'}
    ]
}

# Crear conjunto de datos
dataset_result = manager.create_time_series_dataset(
    dataset_name='retail-demand-data',
    data_frequency='D',
    schema_definition=schema_definition
)

if dataset_result['success']:
    print(f"Dataset created: {dataset_result['dataset_name']}")
    print(f"Dataset ARN: {dataset_result['dataset_arn']}")
    
    # Obtener detalles
    dataset_info = manager.describe_dataset(dataset_result['dataset_name'])
    if dataset_info['success']:
        info = dataset_info['dataset_info']
        print(f"Domain: {info['domain']}")
        print(f"Data frequency: {info['data_frequency']}")
        print(f"Status: {info['status']}")
```

### **3. Importación de Datos**
```python
# Ejemplo: Importar datos al conjunto de datos
manager = ForecastManager('us-east-1')

# Configurar fuente de datos
data_source = {
    'S3Config': {
        'Path': 's3://my-bucket/forecast-data/retail-demand.csv',
        'RoleArn': 'arn:aws:iam::123456789012:role/ForecastServiceRole'
    }
}

# Crear trabajo de importación
import_result = manager.create_dataset_import_job(
    dataset_import_job_name='retail-demand-import-2024',
    dataset_arn='arn:aws:forecast:us-east-1:123456789012:dataset/retail-demand-data',
    data_source=data_source,
    timestamp_format='yyyy-MM-dd HH:mm:ss'
)

if import_result['success']:
    print(f"Import job created: {import_result['import_job_name']}")
    
    # Esperar y verificar estado
    import time
    time.sleep(60)  # Esperar a que se complete
    
    import_info = manager.describe_dataset_import_job(import_result['import_job_name'])
    if import_info['success']:
        info = import_info['job_info']
        print(f"Import job status: {info['status']}")
        print(f"Imported data size: {info['imported_data_size']} bytes")
        
        if 'field_statistics' in info:
            stats = info['field_statistics']
            print(f"Field statistics: {stats}")
```

### **4. Creación de Predictor**
```python
# Ejemplo: Crear predictor con AutoML
manager = ForecastManager('us-east-1')

# Configuración de datos de entrada
input_data_config = {
    'DatasetGroupArn': 'arn:aws:forecast:us-east-1:123456789012:dataset-group/retail-demand-group'
}

# Configuración de características
featurization_config = {
    'Featurizations': [
        {
            'AttributeName': 'promotion_flag',
            'FeaturizationPipeline': [
                {
                    'FeaturizationMethodName': 'filling'
                }
            ]
        }
    ]
}

# Configuración de optimización de hiperparámetros
hpo_config = {
    'ParameterRanges': [
        {
            'Name': 'p',
            'MinValue': 0.01,
            'MaxValue': 0.5,
            'ScalingType': 'Logarithmic'
        }
    ]
}

# Crear predictor
predictor_result = manager.create_predictor(
    predictor_name='retail-demand-predictor-2024',
    forecast_horizon=30,
    algorithm_arn='arn:aws:forecast:us-east-1::algorithm/auto_arima',
    forecast_types=['0.1', '0.5', '0.9'],
    input_data_config=input_data_config,
    featurization_config=featurization_config,
    hpo_config=hpo_config
)

if predictor_result['success']:
    print(f"Predictor created: {predictor_result['predictor_name']}")
    
    # Esperar y verificar estado
    time.sleep(300)  # Esperar a que se complete
    
    predictor_info = manager.describe_predictor(predictor_result['predictor_name'])
    if predictor_info['success']:
        info = predictor_info['predictor_info']
        print(f"Predictor status: {info['status']}")
        print(f"Algorithm: {info['algorithm_arn']}")
        print(f"Forecast horizon: {info['forecast_horizon']}")
```

### **5. Análisis de Precisión**
```python
# Ejemplo: Analizar precisión del predictor
manager = ForecastManager('us-east-1')

accuracy_result = manager.analyze_forecast_accuracy('retail-demand-predictor-2024')

if accuracy_result['success']:
    analysis = accuracy_result['accuracy_analysis']
    
    print(f"Accuracy Analysis for {analysis['predictor_name']}")
    
    # Métricas generales
    overall = analysis['overall_metrics']
    print(f"Overall RMSE: {overall.get('average_rmse', 0):.2f}")
    print(f"Min RMSE: {overall.get('min_rmse', 0):.2f}")
    print(f"Max RMSE: {overall.get('max_rmse', 0):.2f}")
    
    # Rendimiento por algoritmo
    print(f"Algorithm Performance:")
    for algorithm, performance in analysis['algorithm_performance'].items():
        validation_metrics = performance['validation_metrics']
        print(f"  - {algorithm}: RMSE = {validation_metrics.get('RMSE', 0):.2f}")
    
    # Recomendaciones
    recommendations = analysis['recommendations']
    print(f"Recommendations: {len(recommendations)}")
    for rec in recommendations:
        print(f"  - {rec['title']} ({rec['priority']})")
        print(f"    {rec['description']}")
        print(f"    Action: {rec['action']}")
```

### **6. Generación de Pronóstico**
```python
# Ejemplo: Generar pronóstico
manager = ForecastManager('us-east-1')

# Crear pronóstico
forecast_result = manager.create_forecast(
    forecast_name='retail-demand-forecast-2024',
    predictor_arn='arn:aws:forecast:us-east-1:123456789012:predictor/retail-demand-predictor-2024',
    forecast_types=['0.1', '0.5', '0.9']
)

if forecast_result['success']:
    print(f"Forecast created: {forecast_result['forecast_name']}")
    
    # Esperar a que se complete
    time.sleep(300)
    
    # Verificar estado
    forecast_info = manager.describe_forecast(forecast_result['forecast_name'])
    if forecast_info['success']:
        info = forecast_info['forecast_info']
        print(f"Forecast status: {info['status']}")
        print(f"Forecast types: {info['forecast_types']}")
        
        # Consultar pronóstico
        query_result = manager.query_forecast(
            forecast_name=forecast_result['forecast_name']
        )
        
        if query_result['success']:
            forecast_data = query_result['forecast_data']
            print(f"Forecast data retrieved")
            print(f"Forecast: {forecast_data['forecast']}")
```

### **7. Exportación de Pronóstico**
```python
# Ejemplo: Exportar pronóstico a S3
manager = ForecastManager('us-east-1')

# Configurar destino
destination = {
    'S3Config': {
        'Path': 's3://my-bucket/forecast-output/',
        'RoleArn': 'arn:aws:iam::123456789012:role/ForecastServiceRole'
    }
}

# Crear trabajo de exportación
export_result = manager.create_forecast_export_job(
    forecast_export_job_name='retail-demand-export-2024',
    forecast_arn='arn:aws:forecast:us-east-1:123456789012:forecast/retail-demand-forecast-2024',
    destination=destination,
    format='CSV'
)

if export_result['success']:
    print(f"Export job created: {export_result['export_job_name']}")
    
    # Esperar y verificar estado
    time.sleep(300)
    
    export_info = manager.describe_forecast_export_job(export_result['export_job_name'])
    if export_info['success']:
        info = export_info['job_info']
        print(f"Export job status: {info['status']}")
        print(f"Format: {info['format']}")
        print(f"Destination: {info['destination']}")
```

### **8. Configuración de Monitoreo**
```python
# Ejemplo: Configurar monitoreo de Forecast
manager = ForecastManager('us-east-1')

monitoring_result = manager.create_forecast_monitoring()

if monitoring_result['success']:
    setup = monitoring_result['monitoring_setup']
    print(f"Forecast monitoring configured")
    print(f"SNS Topic: {setup['sns_topic_arn']}")
    print(f"Lambda functions: {len(setup['lambda_functions'])}")
    print(f"CloudWatch alarms: {len(setup['cloudwatch_alarms'])}")
```

## Configuración con AWS CLI

### **Conjuntos de Datos**
```bash
# Crear conjunto de datos de series temporales
aws forecast create-dataset \
  --dataset-name retail-demand-data \
  --domain CUSTOM \
  --dataset-type TARGET_TIME_SERIES \
  --data-frequency D \
  --schema file://schema.json

# Describir conjunto de datos
aws forecast describe-dataset --dataset-name retail-demand-data

# Listar conjuntos de datos
aws forecast list-datasets --max-results 50

# Eliminar conjunto de datos
aws forecast delete-dataset --dataset-name retail-demand-data
```

### **Importación de Datos**
```bash
# Crear trabajo de importación
aws forecast create-dataset-import-job \
  --dataset-import-job-name retail-demand-import \
  --dataset-arn arn:aws:forecast:us-east-1:123456789012:dataset/retail-demand-data \
  --data-source 'S3Config={Path=s3://my-bucket/data/,RoleArn=arn:aws:iam::123456789012:role/ForecastServiceRole}' \
  --timestamp-format 'yyyy-MM-dd HH:mm:ss' \
  --time-zone UTC

# Describir trabajo de importación
aws forecast describe-dataset-import-job --dataset-import-job-name retail-demand-import

# Listar trabajos de importación
aws forecast list-dataset-import-jobs --status COMPLETED --max-results 50
```

### **Predictores**
```bash
# Crear predictor
aws forecast create-predictor \
  --predictor-name retail-demand-predictor \
  --forecast-horizon 30 \
  --algorithm-arn arn:aws:forecast:us-east-1::algorithm/auto_arima \
  --forecast-types '["0.1","0.5","0.9"]' \
  --input-data-config 'DatasetGroupArn=arn:aws:forecast:us-east-1:123456789012:dataset-group/retail-demand-group'

# Describir predictor
aws forecast describe-predictor --predictor-name retail-demand-predictor

# Listar predictores
aws forecast list-predictors --status ACTIVE --max-results 50

# Obtener métricas de precisión
aws forecast get-accuracy-metrics --predictor-name retail-demand-predictor
```

### **Pronósticos**
```bash
# Crear pronóstico
aws forecast create-forecast \
  --forecast-name retail-demand-forecast \
  --predictor-arn arn:aws:forecast:us-east-1:123456789012:predictor/retail-demand-predictor \
  --forecast-types '["0.1","0.5","0.9"]'

# Describir pronóstico
aws forecast describe-forecast --forecast-name retail-demand-forecast

# Listar pronósticos
aws forecast list-forecasts --status ACTIVE --max-results 50

# Consultar pronóstico
aws forecast query-forecast \
  --forecast-arn arn:aws:forecast:us-east-1:123456789012:forecast/retail-demand-forecast \
  --start-date 2024-01-01T00:00:00Z \
  --end-date 2024-01-31T23:59:59Z
```

### **Exportación**
```bash
# Crear trabajo de exportación
aws forecast create-forecast-export-job \
  --forecast-export-job-name retail-demand-export \
  --forecast-arn arn:aws:forecast:us-east-1:123456789012:forecast/retail-demand-forecast \
  --destination 'S3Config={Path=s3://my-bucket/export/,RoleArn=arn:aws:iam::123456789012:role/ForecastServiceRole}' \
  --format CSV

# Describir trabajo de exportación
aws forecast describe-forecast-export-job --forecast-export-job-name retail-demand-export

# Listar trabajos de exportación
aws forecast list-forecast-export-jobs --status COMPLETED --max-results 50
```

## Mejores Prácticas

### **1. Preparación de Datos**
- **Data Quality**: Asegurar alta calidad de datos históricos
- **Consistency**: Mantener consistencia en formatos y frecuencias
- **Completeness**: Completar datos faltantes con métodos apropiados
- **Outlier Detection**: Identificar y manejar valores atípicos
- **Seasonality**: Capturar patrones estacionales y tendencias

### **2. Selección de Algoritmos**
- **AutoML**: Usar AutoML para selección automática
- **Domain Knowledge**: Considerar conocimiento del dominio
- **Data Characteristics**: Adaptar algoritmos a características de datos
- **Performance Testing**: Probar múltiples algoritmos
- **Hyperparameter Tuning**: Optimizar hiperparámetros

### **3. Validación y Evaluación**
- **Backtesting**: Usar backtesting para validación
- **Cross-validation**: Implementar validación cruzada
- **Multiple Metrics**: Usar múltiples métricas de evaluación
- **Quantile Forecasts**: Evaluar predicciones por cuantiles
- **Error Analysis**: Analizar patrones de error

### **4. Despliegue y Monitoreo**
- **Automated Updates**: Actualizar pronósticos automáticamente
- **Performance Monitoring**: Monitorear rendimiento continuo
- **Accuracy Tracking**: Seguir métricas de precisión
- **Alerting**: Configurar alertas para problemas
- **Version Control**: Control de versiones de modelos

## Costos

### **Precios de AWS Forecast**
- **Predictor Training**: $0.608 por hora de entrenamiento
- **Forecast Generation**: $0.20 por 1000 predicciones
- **Dataset Import**: $0.20 por GB de datos importados
- **Storage**: $0.10 por GB-mes para almacenamiento
- **API Calls**: $0.10 por 1000 llamadas a la API

### **Ejemplo de Costos Mensuales**
- **Predictor Training**: 50 horas × $0.608 = $30.40
- **Forecast Generation**: 100,000 predicciones × $0.20/1000 = $20.00
- **Dataset Import**: 10 GB × $0.20 = $2.00
- **Storage**: 50 GB × $0.10 = $5.00
- **API Calls**: 50,000 llamadas × $0.20/1000 = $10.00
- **Total estimado**: ~$67.40 por mes

## Troubleshooting

### **Problemas Comunes**
1. **Baja Precisión**: Mejorar calidad de datos y características
2. **Tiempo de Entrenamiento Largo**: Optimizar tamaño de datos y algoritmos
3. **Importación Fallida**: Verificar formato y permisos de datos
4. **Predicciones Inexactas**: Ajustar horizonte y algoritmos

### **Comandos de Diagnóstico**
```bash
# Verificar estado del predictor
aws forecast describe-predictor --predictor-name my-predictor

# Verificar estado del trabajo de importación
aws forecast describe-dataset-import-job --dataset-import-job-name my-import-job

# Verificar métricas de precisión
aws forecast get-accuracy-metrics --predictor-name my-predictor

# Verificar logs de CloudWatch
aws logs tail /aws/forecast --follow
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
- **Data Storage**: Almacenamiento de datos de entrada y salida
- **Import/Export**: Importación y exportación de datos
- **Backup**: Backup de conjuntos de datos y pronósticos
- **Versioning**: Control de versiones de datos

### **AWS Lambda**
- **Preprocessing**: Preprocesamiento de datos antes de importar
- **Postprocessing**: Postprocesamiento de pronósticos
- **Automation**: Automatización de flujos de trabajo
- **Custom Logic**: Implementación de lógica personalizada

### **AWS CloudWatch**
- **Monitoring**: Monitoreo de métricas y rendimiento
- **Alarms**: Alarmas para eventos críticos
- **Logs**: Almacenamiento de logs de operaciones
- **Dashboards**: Visualización de métricas

### **AWS IAM**
- **Access Control**: Control de acceso a recursos de Forecast
- **Role Management**: Gestión de roles de servicio
- **Permissions**: Permisos específicos para diferentes operaciones
- **Security**: Seguridad de acceso a datos y modelos

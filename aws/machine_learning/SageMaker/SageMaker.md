# AWS SageMaker

## Definición

AWS SageMaker es un servicio de machine learning completamente gestionado que permite a los desarrolladores y científicos de datos construir, entrenar y desplegar modelos de machine learning a cualquier escala. Proporciona un entorno integrado para todo el ciclo de vida del machine learning, desde la preparación de datos hasta el despliegue y monitoreo de modelos.

## Características Principales

### **Entorno de Desarrollo**
- **SageMaker Studio**: Entorno de desarrollo integrado basado en web
- **Notebooks**: Jupyter notebooks preconfigurados con entornos ML
- **IDE Integration**: Integración con VS Code y otros IDEs
- **Collaboration Tools**: Herramientas de colaboración en tiempo real
- **Version Control**: Integración con Git y sistemas de control de versiones

### **Preparación de Datos**
- **Ground Truth**: Etiquetado de datos gestionado
- **Data Wrangler**: Preparación de datos visual sin código
- **Feature Store**: Almacenamiento y gestión de características
- **Processing Jobs**: Procesamiento de datos a escala
- **Data Pipelines**: Construcción de pipelines de datos automatizados

### **Entrenamiento de Modelos**
- **Training Jobs**: Entrenamiento distribuido y escalable
- **Hyperparameter Tuning**: Optimización automática de hiperparámetros
- **Built-in Algorithms**: Algoritmos optimizados preconstruidos
- **Custom Containers**: Entrenamiento con contenedores personalizados
- **Managed Spot Training**: Entrenamiento con instancias spot para ahorro de costos

### **Despliegue y Servicios**
- **Real-time Inference**: Despliegue para inferencia en tiempo real
- **Batch Transform**: Procesamiento por lotes de inferencia
- **Multi-model Endpoints**: Múltiples modelos en un solo endpoint
- **A/B Testing**: Pruebas A/B para comparación de modelos
- **Auto Scaling**: Escalado automático de endpoints

### **MLOps y Monitoreo**
- **Model Monitor**: Monitoreo de calidad y rendimiento de modelos
- **Explainability**: Explicabilidad de predicciones con SHAP
- **Bias Detection**: Detección de sesgos en modelos
- **Model Registry**: Registro y versionado de modelos
- **Pipeline Orchestration**: Orquestación de pipelines ML con SageMaker Pipelines

## Tipos de Operaciones

### **1. Operaciones de Entrenamiento**
- **CreateTrainingJob**: Crear trabajo de entrenamiento
- **CreateHyperParameterTuningJob**: Crear trabajo de optimización de hiperparámetros
- **CreateProcessingJob**: Crear trabajo de procesamiento
- **CreateModel**: Crear modelo a partir de artefactos
- **CreateModelPackage**: Crear paquete de modelo versionado

### **2. Operaciones de Despliegue**
- **CreateEndpointConfig**: Crear configuración de endpoint
- **CreateEndpoint**: Crear endpoint para inferencia
- **CreateTransformJob**: Crear trabajo de transformación por lotes
- **UpdateEndpoint**: Actualizar configuración de endpoint
- **DeleteEndpoint**: Eliminar endpoint

### **3. Operaciones de Datos**
- **CreateFeatureGroup**: Crear grupo de características
- **CreateFeatureStore**: Crear almacén de características
- **CreateProcessingJob**: Crear trabajo de procesamiento
- **CreateLabelingJob**: Crear trabajo de etiquetado
- **CreatePipeline**: Crear pipeline de ML

### **4. Operaciones de Monitoreo**
- **CreateMonitoringSchedule**: Crear programación de monitoreo
- **CreateExplainabilityJob**: Crear trabajo de explicabilidad
- **CreateModelBiasJob**: Crear trabajo de detección de sesgos
- **DescribeModel**: Obtener detalles del modelo
- **ListModels**: Listar modelos disponibles

## Arquitectura de AWS SageMaker

### **Componentes Principales**
```
AWS SageMaker Architecture
├── Development Layer
│   ├── SageMaker Studio
│   ├── Notebook Instances
│   ├── IDE Integration
│   ├── Collaboration Tools
│   └── Version Control
├── Data Layer
│   ├── Data Wrangler
│   ├── Ground Truth
│   ├── Feature Store
│   ├── Processing Jobs
│   └── Data Pipelines
├── Training Layer
│   ├── Training Jobs
│   ├── Hyperparameter Tuning
│   ├── Built-in Algorithms
│   ├── Custom Containers
│   └── Distributed Training
├── Deployment Layer
│   ├── Real-time Endpoints
│   ├── Batch Transform
│   ├── Multi-model Endpoints
│   ├── A/B Testing
│   └── Auto Scaling
├── MLOps Layer
│   ├── Model Monitor
│   ├── Explainability
│   ├── Bias Detection
│   ├── Model Registry
│   └── Pipeline Orchestration
└── Integration Layer
    ├── AWS Services
    ├── Third-party Tools
    ├── API Gateway
    └── Event Notifications
```

### **Flujo de MLOps**
```
Data Collection → Data Preparation → Model Training → Model Evaluation → Model Deployment → Monitoring
```

## Configuración de AWS SageMaker

### **Gestión Completa de AWS SageMaker**
```python
import boto3
import json
import time
import base64
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import sagemaker
from sagemaker.session import Session
from sagemaker.model import Model
from sagemaker.predictor import Predictor
from sagemaker.serializers import JSONSerializer
from sagemaker.deserializers import JSONDeserializer

class SageMakerManager:
    def __init__(self, region='us-east-1', role_arn=None):
        self.sagemaker = boto3.client('sagemaker', region_name=region)
        self.sagemaker_runtime = boto3.client('sagemaker-runtime', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.lambda_client = boto3.client('lambda', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.region = region
        self.role_arn = role_arn or f'arn:aws:iam::123456789012:role/SageMakerExecutionRole'
        self.session = Session(boto3.Session(), sagemaker_client=self.sagemaker)
    
    def create_training_job(self, training_job_name, algorithm_specification,
                           role_arn, input_data_config, output_data_config,
                           resource_config, stopping_condition,
                           hyper_parameters=None, vpc_config=None):
        """Crear trabajo de entrenamiento"""
        
        try:
            params = {
                'TrainingJobName': training_job_name,
                'AlgorithmSpecification': algorithm_specification,
                'RoleArn': role_arn,
                'InputDataConfig': input_data_config,
                'OutputDataConfig': output_data_config,
                'ResourceConfig': resource_config,
                'StoppingCondition': stopping_condition
            }
            
            if hyper_parameters:
                params['HyperParameters'] = hyper_parameters
            
            if vpc_config:
                params['VpcConfig'] = vpc_config
            
            response = self.sagemaker.create_training_job(**params)
            
            return {
                'success': True,
                'training_job_arn': response['TrainingJobArn'],
                'training_job_name': training_job_name,
                'status': 'CREATING'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_training_job(self, training_job_name):
        """Obtener detalles del trabajo de entrenamiento"""
        
        try:
            response = self.sagemaker.describe_training_job(
                TrainingJobName=training_job_name
            )
            
            job_info = {
                'training_job_name': response['TrainingJobName'],
                'training_job_arn': response['TrainingJobArn'],
                'model_artifacts': response.get('ModelArtifacts', {}),
                'training_job_status': response['TrainingJobStatus'],
                'hyper_parameters': response.get('HyperParameters', {}),
                'algorithm_specification': response['AlgorithmSpecification'],
                'role_arn': response['RoleArn'],
                'input_data_config': response['InputDataConfig'],
                'output_data_config': response['OutputDataConfig'],
                'resource_config': response['ResourceConfig'],
                'stopping_condition': response['StoppingCondition'],
                'creation_time': response['CreationTime'].isoformat() if response.get('CreationTime') else '',
                'training_start_time': response.get('TrainingStartTime', '').isoformat() if response.get('TrainingStartTime') else '',
                'training_end_time': response.get('TrainingEndTime', '').isoformat() if response.get('TrainingEndTime') else '',
                'secondary_status': response.get('SecondaryStatus', ''),
                'failure_reason': response.get('FailureReason', '')
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
    
    def list_training_jobs(self, status=None, max_results=100, next_token=None):
        """Listar trabajos de entrenamiento"""
        
        try:
            params = {'MaxResults': max_results}
            
            if status:
                params['StatusEquals'] = status
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.sagemaker.list_training_jobs(**params)
            
            jobs = []
            for job in response['TrainingJobSummaries']:
                job_info = {
                    'training_job_name': job['TrainingJobName'],
                    'training_job_arn': job['TrainingJobArn'],
                    'creation_time': job['CreationTime'].isoformat() if job.get('CreationTime') else '',
                    'training_end_time': job.get('TrainingEndTime', '').isoformat() if job.get('TrainingEndTime') else '',
                    'training_job_status': job['TrainingJobStatus']
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
    
    def stop_training_job(self, training_job_name):
        """Detener trabajo de entrenamiento"""
        
        try:
            response = self.sagemaker.stop_training_job(
                TrainingJobName=training_job_name
            )
            
            return {
                'success': True,
                'training_job_name': training_job_name,
                'stopped': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_hyperparameter_tuning_job(self, tuning_job_name, tuning_job_config,
                                        training_job_definition, role_arn,
                                        input_data_config, output_data_config,
                                        resource_config, stopping_condition,
                                        vpc_config=None):
        """Crear trabajo de optimización de hiperparámetros"""
        
        try:
            params = {
                'HyperParameterTuningJobName': tuning_job_name,
                'HyperParameterTuningJobConfig': tuning_job_config,
                'TrainingJobDefinition': training_job_definition,
                'RoleArn': role_arn,
                'InputDataConfig': input_data_config,
                'OutputDataConfig': output_data_config,
                'ResourceConfig': resource_config,
                'StoppingCondition': stopping_condition
            }
            
            if vpc_config:
                params['VpcConfig'] = vpc_config
            
            response = self.sagemaker.create_hyper_parameter_tuning_job(**params)
            
            return {
                'success': True,
                'tuning_job_arn': response['HyperParameterTuningJobArn'],
                'tuning_job_name': tuning_job_name,
                'status': 'CREATING'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_hyper_parameter_tuning_job(self, tuning_job_name):
        """Obtener detalles del trabajo de optimización de hiperparámetros"""
        
        try:
            response = self.sagemaker.describe_hyper_parameter_tuning_job(
                HyperParameterTuningJobName=tuning_job_name
            )
            
            job_info = {
                'tuning_job_name': response['HyperParameterTuningJobName'],
                'tuning_job_arn': response['HyperParameterTuningJobArn'],
                'tuning_job_status': response['HyperParameterTuningJobStatus'],
                'creation_time': response['CreationTime'].isoformat() if response.get('CreationTime') else '',
                'tuning_job_end_time': response.get('TuningJobEndTime', '').isoformat() if response.get('TuningJobEndTime') else '',
                'objective_status': response.get('ObjectiveStatus', ''),
                'best_training_job': response.get('BestTrainingJob', {}),
                'hyper_parameter_tuning_job_config': response['HyperParameterTuningJobConfig'],
                'training_job_definition': response['TrainingJobDefinition'],
                'role_arn': response['RoleArn'],
                'failure_reason': response.get('FailureReason', '')
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
    
    def create_model(self, model_name, primary_container, execution_role_arn,
                    vpc_config=None, tags=None):
        """Crear modelo a partir de artefactos"""
        
        try:
            params = {
                'ModelName': model_name,
                'PrimaryContainer': primary_container,
                'ExecutionRoleArn': execution_role_arn
            }
            
            if vpc_config:
                params['VpcConfig'] = vpc_config
            
            if tags:
                params['Tags'] = tags
            
            response = self.sagemaker.create_model(**params)
            
            return {
                'success': True,
                'model_arn': response['ModelArn'],
                'model_name': model_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_model(self, model_name):
        """Obtener detalles del modelo"""
        
        try:
            response = self.sagemaker.describe_model(ModelName=model_name)
            
            model_info = {
                'model_name': response['ModelName'],
                'model_arn': response['ModelArn'],
                'creation_time': response['CreationTime'].isoformat() if response.get('CreationTime') else '',
                'primary_container': response['PrimaryContainer'],
                'execution_role_arn': response['ExecutionRoleArn'],
                'vpc_config': response.get('VpcConfig', {}),
                'enable_network_isolation': response.get('EnableNetworkIsolation', False),
                'tags': response.get('Tags', [])
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
    
    def list_models(self, max_results=100, next_token=None):
        """Listar modelos"""
        
        try:
            params = {'MaxResults': max_results}
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.sagemaker.list_models(**params)
            
            models = []
            for model in response['Models']:
                model_info = {
                    'model_name': model['ModelName'],
                    'model_arn': model['ModelArn'],
                    'creation_time': model['CreationTime'].isoformat() if model.get('CreationTime') else ''
                }
                models.append(model_info)
            
            return {
                'success': True,
                'models': models,
                'count': len(models),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_model(self, model_name):
        """Eliminar modelo"""
        
        try:
            response = self.sagemaker.delete_model(ModelName=model_name)
            
            return {
                'success': True,
                'model_name': model_name,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_endpoint_config(self, endpoint_config_name, production_variants,
                             data_capture_config=None, async_inference_config=None):
        """Crear configuración de endpoint"""
        
        try:
            params = {
                'EndpointConfigName': endpoint_config_name,
                'ProductionVariants': production_variants
            }
            
            if data_capture_config:
                params['DataCaptureConfig'] = data_capture_config
            
            if async_inference_config:
                params['AsyncInferenceConfig'] = async_inference_config
            
            response = self.sagemaker.create_endpoint_config(**params)
            
            return {
                'success': True,
                'endpoint_config_arn': response['EndpointConfigArn'],
                'endpoint_config_name': endpoint_config_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_endpoint(self, endpoint_name, endpoint_config_name, tags=None):
        """Crear endpoint para inferencia"""
        
        try:
            params = {
                'EndpointName': endpoint_name,
                'EndpointConfigName': endpoint_config_name
            }
            
            if tags:
                params['Tags'] = tags
            
            response = self.sagemaker.create_endpoint(**params)
            
            return {
                'success': True,
                'endpoint_arn': response['EndpointArn'],
                'endpoint_name': endpoint_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_endpoint(self, endpoint_name):
        """Obtener detalles del endpoint"""
        
        try:
            response = self.sagemaker.describe_endpoint(EndpointName=endpoint_name)
            
            endpoint_info = {
                'endpoint_name': response['EndpointName'],
                'endpoint_arn': response['EndpointArn'],
                'endpoint_config_name': response['EndpointConfigName'],
                'endpoint_status': response['EndpointStatus'],
                'creation_time': response['CreationTime'].isoformat() if response.get('CreationTime') else '',
                'last_modified_time': response.get('LastModifiedTime', '').isoformat() if response.get('LastModifiedTime') else '',
                'production_variants': response['ProductionVariants'],
                'data_capture_config': response.get('DataCaptureConfig', {}),
                'failure_reason': response.get('FailureReason', '')
            }
            
            return {
                'success': True,
                'endpoint_info': endpoint_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_endpoints(self, status=None, max_results=100, next_token=None):
        """Listar endpoints"""
        
        try:
            params = {'MaxResults': max_results}
            
            if status:
                params['StatusEquals'] = status
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.sagemaker.list_endpoints(**params)
            
            endpoints = []
            for endpoint in response['Endpoints']:
                endpoint_info = {
                    'endpoint_name': endpoint['EndpointName'],
                    'endpoint_arn': endpoint['EndpointArn'],
                    'creation_time': endpoint['CreationTime'].isoformat() if endpoint.get('CreationTime') else '',
                    'last_modified_time': endpoint.get('LastModifiedTime', '').isoformat() if endpoint.get('LastModifiedTime') else '',
                    'endpoint_status': endpoint['EndpointStatus']
                }
                endpoints.append(endpoint_info)
            
            return {
                'success': True,
                'endpoints': endpoints,
                'count': len(endpoints),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_endpoint(self, endpoint_name):
        """Eliminar endpoint"""
        
        try:
            response = self.sagemaker.delete_endpoint(EndpointName=endpoint_name)
            
            return {
                'success': True,
                'endpoint_name': endpoint_name,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def invoke_endpoint(self, endpoint_name, content_type='application/json',
                       accept='application/json', body=None, custom_attributes=None):
        """Invocar endpoint para inferencia"""
        
        try:
            params = {
                'EndpointName': endpoint_name,
                'ContentType': content_type,
                'Accept': accept
            }
            
            if body:
                params['Body'] = json.dumps(body) if isinstance(body, dict) else body
            
            if custom_attributes:
                params['CustomAttributes'] = custom_attributes
            
            response = self.sagemaker_runtime.invoke_endpoint(**params)
            
            result = {
                'body': json.loads(response['Body'].read().decode('utf-8')) if response.get('Body') else None,
                'content_type': response.get('ContentType', ''),
                'invoked_production_variant': response.get('InvokedProductionVariant', ''),
                'custom_attributes': response.get('CustomAttributes', '')
            }
            
            return {
                'success': True,
                'inference_result': result
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_transform_job(self, transform_job_name, model_name, transform_input,
                           transform_output, transform_resources, environment=None,
                           max_concurrent_transforms=None, max_payload=None,
                           batch_strategy='MultiRecord'):
        """Crear trabajo de transformación por lotes"""
        
        try:
            params = {
                'TransformJobName': transform_job_name,
                'ModelName': model_name,
                'TransformInput': transform_input,
                'TransformOutput': transform_output,
                'TransformResources': transform_resources,
                'BatchStrategy': batch_strategy
            }
            
            if environment:
                params['Environment'] = environment
            
            if max_concurrent_transforms:
                params['MaxConcurrentTransforms'] = max_concurrent_transforms
            
            if max_payload:
                params['MaxPayload'] = max_payload
            
            response = self.sagemaker.create_transform_job(**params)
            
            return {
                'success': True,
                'transform_job_arn': response['TransformJobArn'],
                'transform_job_name': transform_job_name,
                'status': 'CREATING'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_transform_job(self, transform_job_name):
        """Obtener detalles del trabajo de transformación"""
        
        try:
            response = self.sagemaker.describe_transform_job(
                TransformJobName=transform_job_name
            )
            
            job_info = {
                'transform_job_name': response['TransformJobName'],
                'transform_job_arn': response['TransformJobArn'],
                'model_name': response['ModelName'],
                'transform_job_status': response['TransformJobStatus'],
                'creation_time': response['CreationTime'].isoformat() if response.get('CreationTime') else '',
                'transform_start_time': response.get('TransformStartTime', '').isoformat() if response.get('TransformStartTime') else '',
                'transform_end_time': response.get('TransformEndTime', '').isoformat() if response.get('TransformEndTime') else '',
                'transform_input': response['TransformInput'],
                'transform_output': response['TransformOutput'],
                'transform_resources': response['TransformResources'],
                'failure_reason': response.get('FailureReason', '')
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
    
    def create_feature_group(self, feature_group_name, record_identifier_feature_name,
                           event_time_feature_name, feature_definitions,
                           role_arn, online_store_config=None, offline_store_config=None,
                           throughputs=None, tags=None):
        """Crear grupo de características"""
        
        try:
            params = {
                'FeatureGroupName': feature_group_name,
                'RecordIdentifierFeatureName': record_identifier_feature_name,
                'EventTimeFeatureName': event_time_feature_name,
                'FeatureDefinitions': feature_definitions,
                'RoleArn': role_arn
            }
            
            if online_store_config:
                params['OnlineStoreConfig'] = online_store_config
            
            if offline_store_config:
                params['OfflineStoreConfig'] = offline_store_config
            
            if throughputs:
                params['ThroughputConfig'] = throughputs
            
            if tags:
                params['Tags'] = tags
            
            response = self.sagemaker.create_feature_group(**params)
            
            return {
                'success': True,
                'feature_group_arn': response['FeatureGroupArn'],
                'feature_group_name': feature_group_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_feature_group(self, feature_group_name):
        """Obtener detalles del grupo de características"""
        
        try:
            response = self.sagemaker.describe_feature_group(
                FeatureGroupName=feature_group_name
            )
            
            feature_group_info = {
                'feature_group_name': response['FeatureGroupName'],
                'feature_group_arn': response['FeatureGroupArn'],
                'record_identifier_feature_name': response['RecordIdentifierFeatureName'],
                'event_time_feature_name': response['EventTimeFeatureName'],
                'feature_definitions': response['FeatureDefinitions'],
                'creation_time': response['CreationTime'].isoformat() if response.get('CreationTime') else '',
                'online_store_config': response.get('OnlineStoreConfig', {}),
                'offline_store_config': response.get('OfflineStoreConfig', {}),
                'throughput_config': response.get('ThroughputConfig', {}),
                'role_arn': response['RoleArn'],
                'feature_group_status': response['FeatureGroupStatus']
            }
            
            return {
                'success': True,
                'feature_group_info': feature_group_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_monitoring_schedule(self, monitoring_schedule_name, schedule_expression,
                                  monitoring_output_config, monitoring_job_definition_name,
                                  endpoint_input=None, batch_transform_input=None,
                                  role_arn=None, monitoring_type='DataQuality',
                                  network_config=None, stopping_condition=None):
        """Crear programación de monitoreo"""
        
        try:
            params = {
                'MonitoringScheduleName': monitoring_schedule_name,
                'ScheduleExpression': schedule_expression,
                'MonitoringOutputConfig': monitoring_output_config,
                'MonitoringJobDefinitionName': monitoring_job_definition_name,
                'MonitoringType': monitoring_type
            }
            
            if endpoint_input:
                params['MonitoringJobDefinition']['MonitoringInputs'] = [endpoint_input]
            
            if batch_transform_input:
                params['MonitoringJobDefinition']['MonitoringInputs'] = [batch_transform_input]
            
            if role_arn:
                params['MonitoringJobDefinition']['RoleArn'] = role_arn
            
            if network_config:
                params['MonitoringJobDefinition']['NetworkConfig'] = network_config
            
            if stopping_condition:
                params['MonitoringJobDefinition']['StoppingCondition'] = stopping_condition
            
            response = self.sagemaker.create_monitoring_schedule(**params)
            
            return {
                'success': True,
                'monitoring_schedule_arn': response['MonitoringScheduleArn'],
                'monitoring_schedule_name': monitoring_schedule_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_monitoring_schedule(self, monitoring_schedule_name):
        """Obtener detalles de la programación de monitoreo"""
        
        try:
            response = self.sagemaker.describe_monitoring_schedule(
                MonitoringScheduleName=monitoring_schedule_name
            )
            
            schedule_info = {
                'monitoring_schedule_name': response['MonitoringScheduleName'],
                'monitoring_schedule_arn': response['MonitoringScheduleArn'],
                'schedule_expression': response['ScheduleExpression'],
                'monitoring_type': response['MonitoringType'],
                'creation_time': response['CreationTime'].isoformat() if response.get('CreationTime') else '',
                'last_modified_time': response.get('LastModifiedTime', '').isoformat() if response.get('LastModifiedTime') else '',
                'monitoring_schedule_status': response['MonitoringScheduleStatus'],
                'failure_reason': response.get('FailureReason', ''),
                'monitoring_job_definition': response['MonitoringJobDefinition']
            }
            
            return {
                'success': True,
                'schedule_info': schedule_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_ml_pipeline(self, pipeline_name, pipeline_definition, role_arn,
                          parallelism_config=None, tags=None):
        """Crear pipeline de ML"""
        
        try:
            params = {
                'PipelineName': pipeline_name,
                'PipelineDefinition': pipeline_definition,
                'RoleArn': role_arn
            }
            
            if parallelism_config:
                params['ParallelismConfiguration'] = parallelism_config
            
            if tags:
                params['Tags'] = tags
            
            response = self.sagemaker.create_pipeline(**params)
            
            return {
                'success': True,
                'pipeline_arn': response['PipelineArn'],
                'pipeline_name': pipeline_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def start_pipeline_execution(self, pipeline_name, pipeline_execution_display_name=None,
                               pipeline_parameters=None):
        """Iniciar ejecución del pipeline"""
        
        try:
            params = {'PipelineName': pipeline_name}
            
            if pipeline_execution_display_name:
                params['PipelineExecutionDisplayName'] = pipeline_execution_display_name
            
            if pipeline_parameters:
                params['PipelineParameters'] = pipeline_parameters
            
            response = self.sagemaker.start_pipeline_execution(**params)
            
            return {
                'success': True,
                'pipeline_execution_arn': response['PipelineExecutionArn'],
                'pipeline_execution_id': response['PipelineExecutionId']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_pipeline_execution(self, pipeline_execution_arn):
        """Obtener detalles de la ejecución del pipeline"""
        
        try:
            response = self.sagemaker.describe_pipeline_execution(
                PipelineExecutionArn=pipeline_execution_arn
            )
            
            execution_info = {
                'pipeline_execution_arn': response['PipelineExecutionArn'],
                'pipeline_execution_display_name': response.get('PipelineExecutionDisplayName', ''),
                'pipeline_execution_id': response['PipelineExecutionId'],
                'pipeline_arn': response['PipelineArn'],
                'status': response['PipelineExecutionStatus'],
                'creation_time': response['CreationTime'].isoformat() if response.get('CreationTime') else '',
                'last_modified_time': response.get('LastModifiedTime', '').isoformat() if response.get('LastModifiedTime') else '',
                'pipeline_parameters': response.get('PipelineParameters', []),
                'failure_reason': response.get('FailureReason', '')
            }
            
            return {
                'success': True,
                'execution_info': execution_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_sagemaker_monitoring(self, sns_topic_arn=None):
        """Configurar monitoreo de SageMaker"""
        
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
                    Name='sagemaker-alerts',
                    Tags=[
                        {'Key': 'Service', 'Value': 'SageMaker'},
                        {'Key': 'Purpose', 'Value': 'Monitoring'}
                    ]
                )
                monitoring_setup['sns_topic_arn'] = topic_response['TopicArn']
            
            # Crear función Lambda para monitoreo
            lambda_result = self.create_sagemaker_monitoring_lambda()
            if lambda_result['success']:
                monitoring_setup['lambda_functions'].append(lambda_result['function_arn'])
            
            # Configurar alarmas de CloudWatch
            alarm_result = self.setup_sagemaker_alarms(monitoring_setup['sns_topic_arn'])
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
    
    def create_sagemaker_monitoring_lambda(self):
        """Crear función Lambda para monitoreo de SageMaker"""
        
        try:
            lambda_code = self._get_sagemaker_lambda_code()
            
            # Crear rol de ejecución
            role_arn = self._create_lambda_execution_role('sagemaker-monitoring-role')
            
            # Crear función Lambda
            response = self.lambda_client.create_function(
                FunctionName='sagemaker-monitor',
                Runtime='python3.9',
                Role=role_arn,
                Handler='lambda_function.lambda_handler',
                Code={
                    'ZipFile': lambda_code
                },
                Description='Lambda function for SageMaker monitoring',
                Timeout=300,
                Environment={
                    'Variables': {
                        'SNS_TOPIC_ARN': f'arn:aws:sns:{self.region}:123456789012:sagemaker-alerts'
                    }
                },
                Tags={
                    'Service': 'SageMaker',
                    'Purpose': 'Monitoring'
                }
            )
            
            return {
                'success': True,
                'function_name': 'sagemaker-monitor',
                'function_arn': response['FunctionArn'],
                'role_arn': role_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_sagemaker_lambda_code(self):
        """Obtener código de Lambda para monitoreo de SageMaker"""
        
        return '''
import json
import boto3
import os
from datetime import datetime

def lambda_handler(event, context):
    sns = boto3.client('sns')
    sagemaker = boto3.client('sagemaker')
    
    sns_topic_arn = os.environ['SNS_TOPIC_ARN']
    
    # Analizar evento de SageMaker
    event_analysis = analyze_sagemaker_event(event)
    
    if event_analysis['requires_attention']:
        # Enviar alerta
        alert = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': 'SAGEMAKER_ALERT',
            'resource_type': event_analysis['resource_type'],
            'resource_name': event_analysis['resource_name'],
            'status': event_analysis['status'],
            'risk_level': event_analysis['risk_level'],
            'recommendations': event_analysis['recommendations']
        }
        
        sns.publish(
            TopicArn=sns_topic_arn,
            Subject=f'SageMaker Alert: {event_analysis["resource_type"]}',
            Message=json.dumps(alert),
            MessageStructure='string'
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'SageMaker alert sent',
                'resource_type': event_analysis['resource_type'],
                'risk_level': event_analysis['risk_level']
            })
        }
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'No action required'})
    }

def analyze_sagemaker_event(event):
    """Analizar evento de SageMaker"""
    
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
        
        if detail_type == 'SageMaker Training Job State Change':
            detail = event.get('detail', {})
            analysis['resource_type'] = 'TrainingJob'
            analysis['resource_name'] = detail.get('TrainingJobName', '')
            analysis['status'] = detail.get('TrainingJobStatus', '')
            
            # Determinar si requiere atención
            if analysis['status'] == 'FAILED':
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'HIGH'
                analysis['recommendations'].append(f'Investigate training job failure: {detail.get("FailureReason", "Unknown")}')
            elif analysis['status'] == 'COMPLETED':
                # Verificar métricas de rendimiento
                if 'FinalMetricDataList' in detail:
                    metrics = detail['FinalMetricDataList']
                    for metric in metrics:
                        if metric.get('MetricName') == 'validation:loss' and metric.get('Value', 0) > 0.5:
                            analysis['requires_attention'] = True
                            analysis['risk_level'] = 'MEDIUM'
                            analysis['recommendations'].append('High validation loss detected')
                            break
        
        elif detail_type == 'SageMaker Endpoint State Change':
            detail = event.get('detail', {})
            analysis['resource_type'] = 'Endpoint'
            analysis['resource_name'] = detail.get('EndpointName', '')
            analysis['status'] = detail.get('EndpointStatus', '')
            
            if analysis['status'] == 'FAILED':
                analysis['requires_attention'] = True
                analysis['risk_level'] = 'HIGH'
                analysis['recommendations'].append(f'Endpoint deployment failed: {detail.get("FailureReason", "Unknown")}')
    
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
                Description='Execution role for SageMaker monitoring Lambda',
                Tags=[
                    {'Key': 'Service', 'Value': 'Lambda'},
                    {'Key': 'Purpose', 'Value': 'SageMakerMonitoring'}
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
    
    def setup_sagemaker_alarms(self, sns_topic_arn):
        """Configurar alarmas de CloudWatch para SageMaker"""
        
        try:
            alarms_created = []
            
            # Alarma para trabajos de entrenamiento fallidos
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='SageMaker-FailedTrainingJobs',
                    AlarmDescription='Failed SageMaker training jobs detected',
                    Namespace='AWS/SageMaker',
                    MetricName='FailedTrainingJobs',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('SageMaker-FailedTrainingJobs')
            except Exception:
                pass
            
            # Alarma para endpoints fallidos
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='SageMaker-FailedEndpoints',
                    AlarmDescription='Failed SageMaker endpoints detected',
                    Namespace='AWS/SageMaker',
                    MetricName='FailedEndpoints',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn]
                )
                alarms_created.append('SageMaker-FailedEndpoints')
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
    
    def generate_sagemaker_report(self, report_type='comprehensive', time_range_days=30):
        """Generar reporte de SageMaker"""
        
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
                    'training_jobs': self._get_training_job_stats(),
                    'endpoints': self._get_endpoint_stats(),
                    'notebook_instances': self._get_notebook_instance_stats(),
                    'feature_groups': self._get_feature_group_stats()
                }
            
            elif report_type == 'performance':
                # Reporte de rendimiento
                report['performance_assessment'] = {
                    'model_performance': self._get_model_performance_stats(),
                    'endpoint_performance': self._get_endpoint_performance_stats(),
                    'training_performance': self._get_training_performance_stats(),
                    'pipeline_performance': self._get_pipeline_performance_stats()
                }
            
            elif report_type == 'cost':
                # Reporte de costos
                report['cost_breakdown'] = {
                    'training_costs': self._get_training_costs(),
                    'endpoint_costs': self._get_endpoint_costs(),
                    'storage_costs': self._get_storage_costs(),
                    'notebook_costs': self._get_notebook_costs(),
                    'total_cost': self._calculate_total_cost()
                }
            
            return {
                'success': True,
                'sagemaker_report': report
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
            'total_training_jobs': 1500,
            'completed_training_jobs': 1350,
            'failed_training_jobs': 75,
            'total_endpoints': 45,
            'active_endpoints': 38,
            'notebook_instances': 25,
            'feature_groups': 12,
            'pipelines': 8,
            'models_deployed': 38,
            'total_training_hours': 25000,
            'total_inference_requests': 5000000
        }
    
    def _get_performance_metrics(self):
        """Obtener métricas de rendimiento"""
        
        return {
            'average_training_time': 2.5,  # horas
            'training_success_rate': 90.0,  # porcentaje
            'endpoint_availability': 99.5,  # porcentaje
            'average_inference_latency': 50,  # milisegundos
            'model_accuracy': 94.2,  # porcentaje
            'pipeline_success_rate': 95.8,  # porcentaje
            'feature_store_latency': 10  # milisegundos
        }
    
    def _get_cost_analysis(self):
        """Obtener análisis de costos"""
        
        return {
            'monthly_cost': 15000.00,
            'cost_breakdown': {
                'training': 7500.00,
                'inference': 4500.00,
                'notebook_instances': 1500.00,
                'storage': 1000.00,
                'feature_store': 500.00
            },
            'cost_trend': 'INCREASING',
            'cost_optimization_potential': 25.0  # porcentaje
        }
    
    def _get_model_analysis(self):
        """Obtener análisis de modelos"""
        
        return {
            'model_types': {
                'image_classification': {'count': 15, 'avg_accuracy': 94.5},
                'text_classification': {'count': 12, 'avg_accuracy': 91.2},
                'regression': {'count': 8, 'avg_r2': 0.87},
                'custom_models': {'count': 10, 'avg_performance': 92.8}
            },
            'model_lifecycle': {
                'development': 5,
                'training': 8,
                'testing': 6,
                'production': 38,
                'archived': 12
            },
            'model_performance': {
                'high_performing': 25,
                'average_performing': 10,
                'needs_improvement': 3
            }
        }
    
    def _generate_comprehensive_recommendations(self):
        """Generar recomendaciones comprehensivas"""
        
        recommendations = [
            {
                'priority': 'HIGH',
                'category': 'COST',
                'title': 'Optimize training costs',
                'description': 'Use managed spot training and right-size instances',
                'action': 'Implement spot training and instance optimization strategies'
            },
            {
                'priority': 'MEDIUM',
                'category': 'PERFORMANCE',
                'title': 'Improve model monitoring',
                'description': 'Enhance model monitoring and drift detection',
                'action': 'Implement comprehensive monitoring and alerting'
            },
            {
                'priority': 'LOW',
                'category': 'AUTOMATION',
                'title': 'Automate MLOps pipelines',
                'description': 'Increase automation in ML workflows',
                'action': 'Implement SageMaker Pipelines for end-to-end automation'
            }
        ]
        
        return recommendations
```

## Casos de Uso

### **1. Entrenamiento de Modelo Clásico**
```python
# Ejemplo: Entrenamiento de modelo de clasificación
manager = SageMakerManager('us-east-1')

# Configuración del trabajo de entrenamiento
algorithm_specification = {
    'TrainingImage': '763104351884.dkr.ecr.us-east-1.amazonaws.com/linear-learner:latest',
    'TrainingInputMode': 'File'
}

input_data_config = [
    {
        'ChannelName': 'train',
        'DataSource': {
            'S3DataSource': {
                'S3DataType': 'S3Prefix',
                'S3Uri': 's3://my-bucket/train-data/',
                'S3DataDistributionType': 'FullyReplicated'
            }
        }
    }
]

output_data_config = {
    'S3OutputPath': 's3://my-bucket/model-output/'
}

resource_config = {
    'InstanceType': 'ml.m5.large',
    'InstanceCount': 1,
    'VolumeSizeInGB': 50
}

stopping_condition = {
    'MaxRuntimeInSeconds': 86400
}

hyper_parameters = {
    'feature_dim': '100',
    'mini_batch_size': '1000',
    'predictor_type': 'binary_classifier',
    'epochs': '10'
}

# Crear trabajo de entrenamiento
training_result = manager.create_training_job(
    training_job_name='classification-job-2024',
    algorithm_specification=algorithm_specification,
    role_arn=manager.role_arn,
    input_data_config=input_data_config,
    output_data_config=output_data_config,
    resource_config=resource_config,
    stopping_condition=stopping_condition,
    hyper_parameters=hyper_parameters
)

if training_result['success']:
    print(f"Training job started: {training_result['training_job_name']}")
    
    # Esperar y verificar estado
    import time
    time.sleep(60)  # Esperar a que se complete
    
    job_info = manager.describe_training_job(training_result['training_job_name'])
    if job_info['success']:
        info = job_info['job_info']
        print(f"Job status: {info['training_job_status']}")
        print(f"Creation time: {info['creation_time']}")
        
        if info['training_job_status'] == 'COMPLETED':
            model_artifacts = info['model_artifacts']
            print(f"Model artifacts: {model_artifacts.get('S3ModelArtifacts', '')}")
```

### **2. Optimización de Hiperparámetros**
```python
# Ejemplo: Optimización automática de hiperparámetros
tuning_job_config = {
    'Strategy': 'Bayesian',
    'HyperParameterTuningJobObjective': {
        'Type': 'Maximize',
        'MetricName': 'validation:accuracy'
    },
    'ResourceLimits': {
        'MaxNumberOfTrainingJobs': 20,
        'MaxParallelTrainingJobs': 3
    },
    'ParameterRanges': [
        {
            'Name': 'learning_rate',
            'MinValue': '0.001',
            'MaxValue': '0.1',
            'ScalingType': 'Logarithmic'
        },
        {
            'Name': 'batch_size',
            'MinValue': '32',
            'MaxValue': '256',
            'ScalingType': 'Linear'
        }
    ]
}

training_job_definition = {
    'StaticHyperParameters': {
        'feature_dim': '100',
        'predictor_type': 'binary_classifier',
        'epochs': '10'
    },
    'AlgorithmSpecification': algorithm_specification,
    'InputDataConfig': input_data_config,
    'OutputDataConfig': output_data_config,
    'ResourceConfig': resource_config,
    'StoppingCondition': stopping_condition
}

# Crear trabajo de optimización
tuning_result = manager.create_hyperparameter_tuning_job(
    tuning_job_name='hyperparameter-tuning-2024',
    tuning_job_config=tuning_job_config,
    training_job_definition=training_job_definition,
    role_arn=manager.role_arn,
    input_data_config=input_data_config,
    output_data_config=output_data_config,
    resource_config=resource_config,
    stopping_condition=stopping_condition
)

if tuning_result['success']:
    print(f"Hyperparameter tuning started: {tuning_result['tuning_job_name']}")
    
    # Esperar y verificar resultados
    time.sleep(300)  # Esperar a que se complete
    
    tuning_info = manager.describe_hyper_parameter_tuning_job(tuning_result['tuning_job_name'])
    if tuning_info['success']:
        info = tuning_info['job_info']
        print(f"Tuning status: {info['tuning_job_status']}")
        
        if info['best_training_job']:
            best_job = info['best_training_job']
            print(f"Best training job: {best_job.get('TrainingJobName', '')}")
            print(f"Best objective value: {best_job.get('FinalHyperParameterTuningJobObjectiveMetric', {}).get('Value', 0)}")
```

### **3. Despliegue de Modelo**
```python
# Ejemplo: Despliegue de modelo para inferencia en tiempo real
# Primero crear el modelo
primary_container = {
    'Image': '763104351884.dkr.ecr.us-east-1.amazonaws.com/linear-learner:latest',
    'ModelDataUrl': 's3://my-bucket/model-output/classification-job-2024/output/model.tar.gz',
    'Environment': {
        'SAGEMAKER_PROGRAM': 'linear_learner.py'
    }
}

model_result = manager.create_model(
    model_name='classification-model-2024',
    primary_container=primary_container,
    execution_role_arn=manager.role_arn
)

if model_result['success']:
    print(f"Model created: {model_result['model_name']}")
    
    # Crear configuración de endpoint
    production_variants = [
        {
            'VariantName': 'AllTraffic',
            'ModelName': model_result['model_name'],
            'InitialInstanceCount': 1,
            'InstanceType': 'ml.m5.large',
            'InitialVariantWeight': 1.0
        }
    ]
    
    endpoint_config_result = manager.create_endpoint_config(
        endpoint_config_name='classification-endpoint-config-2024',
        production_variants=production_variants
    )
    
    if endpoint_config_result['success']:
        print(f"Endpoint config created: {endpoint_config_result['endpoint_config_name']}")
        
        # Crear endpoint
        endpoint_result = manager.create_endpoint(
            endpoint_name='classification-endpoint-2024',
            endpoint_config_name=endpoint_config_result['endpoint_config_name']
        )
        
        if endpoint_result['success']:
            print(f"Endpoint created: {endpoint_result['endpoint_name']}")
            
            # Esperar a que el endpoint esté listo
            time.sleep(300)
            
            # Verificar estado del endpoint
            endpoint_info = manager.describe_endpoint(endpoint_result['endpoint_name'])
            if endpoint_info['success']:
                info = endpoint_info['endpoint_info']
                print(f"Endpoint status: {info['endpoint_status']}")
                
                if info['endpoint_status'] == 'InService':
                    # Probar inferencia
                    inference_result = manager.invoke_endpoint(
                        endpoint_name=endpoint_result['endpoint_name'],
                        content_type='application/json',
                        body={'instances': [[0.1, 0.2, 0.3, 0.4, 0.5]]}
                    )
                    
                    if inference_result['success']:
                        result = inference_result['inference_result']
                        print(f"Inference result: {result}")
```

### **4. Transformación por Lotes**
```python
# Ejemplo: Procesamiento por lotes
transform_input = {
    'DataSource': {
        'S3DataSource': {
            'S3DataType': 'S3Prefix',
            'S3Uri': 's3://my-bucket/batch-input/'
        }
    }
}

transform_output = {
    'S3OutputPath': 's3://my-bucket/batch-output/'
}

transform_resources = {
    'InstanceType': 'ml.m5.large',
    'InstanceCount': 1
}

# Crear trabajo de transformación
transform_result = manager.create_transform_job(
    transform_job_name='batch-transform-2024',
    model_name=model_result['model_name'],
    transform_input=transform_input,
    transform_output=transform_output,
    transform_resources=transform_resources
)

if transform_result['success']:
    print(f"Transform job started: {transform_result['transform_job_name']}")
    
    # Esperar y verificar estado
    time.sleep(300)
    
    transform_info = manager.describe_transform_job(transform_result['transform_job_name'])
    if transform_info['success']:
        info = transform_info['job_info']
        print(f"Transform job status: {info['transform_job_status']}")
        print(f"Start time: {info['transform_start_time']}")
        print(f"End time: {info['transform_end_time']}")
```

### **5. Feature Store**
```python
# Ejemplo: Crear grupo de características
feature_definitions = [
    {
        'FeatureName': 'customer_age',
        'FeatureType': 'Integral'
    },
    {
        'FeatureName': 'customer_income',
        'FeatureType': 'Fractional'
    },
    {
        'FeatureName': 'customer_segment',
        'FeatureType': 'String'
    }
]

online_store_config = {
    'EnableOnlineStore': True,
    'TtlDuration': {
        'Unit': 'Days',
        'Value': 30
    }
}

offline_store_config = {
    'S3StorageConfig': {
        'S3Uri': 's3://my-bucket/feature-store/'
    }
}

# Crear grupo de características
feature_group_result = manager.create_feature_group(
    feature_group_name='customer-features',
    record_identifier_feature_name='customer_id',
    event_time_feature_name='timestamp',
    feature_definitions=feature_definitions,
    role_arn=manager.role_arn,
    online_store_config=online_store_config,
    offline_store_config=offline_store_config
)

if feature_group_result['success']:
    print(f"Feature group created: {feature_group_result['feature_group_name']}")
    
    # Obtener detalles
    feature_info = manager.describe_feature_group(feature_group_result['feature_group_name'])
    if feature_info['success']:
        info = feature_info['feature_group_info']
        print(f"Feature group status: {info['feature_group_status']}")
        print(f"Online store: {info['online_store_config']}")
        print(f"Offline store: {info['offline_store_config']}")
```

### **6. Monitoreo de Modelos**
```python
# Ejemplo: Configurar monitoreo de datos
monitoring_output_config = {
    'MonitoringOutputs': [
        {
            'S3OutputPath': 's3://my-bucket/monitoring-output/'
        }
    ]
}

monitoring_job_definition = {
    'MonitoringInputs': [
        {
            'EndpointInput': {
                'EndpointName': 'classification-endpoint-2024',
                'LocalPath': '/opt/ml/processing/endpoint',
                'S3InputMode': 'File',
                'S3DataDistributionType': 'FullyReplicated'
            }
        }
    ]
}

# Crear programación de monitoreo
monitoring_result = manager.create_monitoring_schedule(
    monitoring_schedule_name='data-quality-monitor-2024',
    schedule_expression='cron(0 */6 * * ? *)',  # Cada 6 horas
    monitoring_output_config=monitoring_output_config,
    monitoring_job_definition_name='data-quality-monitor',
    endpoint_input=monitoring_job_definition['MonitoringInputs'][0],
    role_arn=manager.role_arn,
    monitoring_type='DataQuality'
)

if monitoring_result['success']:
    print(f"Monitoring schedule created: {monitoring_result['monitoring_schedule_name']}")
    
    # Obtener detalles
    schedule_info = manager.describe_monitoring_schedule(monitoring_result['monitoring_schedule_name'])
    if schedule_info['success']:
        info = schedule_info['schedule_info']
        print(f"Schedule status: {info['monitoring_schedule_status']}")
        print(f"Schedule expression: {info['schedule_expression']}")
```

### **7. Pipeline de ML**
```python
# Ejemplo: Crear pipeline de ML
pipeline_definition = {
    'Version': '2020-12-01',
    'PipelineExperimentConfig': {
        'ExperimentName': 'ml-pipeline-experiment'
    },
    'Parameters': [
        {
            'Name': 'InputData',
            'Type': 'String',
            'DefaultValue': 's3://my-bucket/train-data/'
        },
        {
            'Name': 'InstanceType',
            'Type': 'String',
            'DefaultValue': 'ml.m5.large'
        }
    ],
    'Steps': [
        {
            'Name': 'TrainingStep',
            'Type': 'Training',
            'Arguments': {
                'TrainingJobName': 'training-job-{{ExecutionId}}',
                'AlgorithmSpecification': algorithm_specification,
                'InputDataConfig': input_data_config,
                'OutputDataConfig': output_data_config,
                'ResourceConfig': resource_config,
                'StoppingCondition': stopping_condition,
                'RoleArn': manager.role_arn
            }
        },
        {
            'Name': 'ModelStep',
            'Type': 'Model',
            'Arguments': {
                'ModelName': 'model-{{ExecutionId}}',
                'PrimaryContainer': primary_container,
                'ExecutionRoleArn': manager.role_arn
            }
        },
        {
            'Name': 'EndpointStep',
            'Type': 'Endpoint',
            'Arguments': {
                'EndpointName': 'endpoint-{{ExecutionId}}',
                'EndpointConfigName': 'endpoint-config-{{ExecutionId}}'
            }
        }
    ]
}

# Crear pipeline
pipeline_result = manager.create_ml_pipeline(
    pipeline_name='ml-pipeline-2024',
    pipeline_definition=json.dumps(pipeline_definition),
    role_arn=manager.role_arn
)

if pipeline_result['success']:
    print(f"Pipeline created: {pipeline_result['pipeline_name']}")
    
    # Iniciar ejecución
    execution_result = manager.start_pipeline_execution(
        pipeline_name=pipeline_result['pipeline_name'],
        pipeline_execution_display_name='pipeline-execution-2024',
        pipeline_parameters=[
            {'Name': 'InputData', 'Value': 's3://my-bucket/train-data/'},
            {'Name': 'InstanceType', 'Value': 'ml.m5.xlarge'}
        ]
    )
    
    if execution_result['success']:
        print(f"Pipeline execution started: {execution_result['pipeline_execution_id']}")
        
        # Verificar estado
        execution_info = manager.describe_pipeline_execution(execution_result['pipeline_execution_arn'])
        if execution_info['success']:
            info = execution_info['execution_info']
            print(f"Execution status: {info['status']}")
            print(f"Creation time: {info['creation_time']}")
```

### **8. Configuración de Monitoreo**
```python
# Ejemplo: Configurar monitoreo de SageMaker
monitoring_result = manager.create_sagemaker_monitoring()

if monitoring_result['success']:
    setup = monitoring_result['monitoring_setup']
    print(f"SageMaker monitoring configured")
    print(f"SNS Topic: {setup['sns_topic_arn']}")
    print(f"Lambda functions: {len(setup['lambda_functions'])}")
    print(f"CloudWatch alarms: {len(setup['cloudwatch_alarms'])}")
```

## Configuración con AWS CLI

### **Entrenamiento de Modelos**
```bash
# Crear trabajo de entrenamiento
aws sagemaker create-training-job \
  --training-job-name my-training-job \
  --algorithm-specification TrainingImage=763104351884.dkr.ecr.us-east-1.amazonaws.com/linear-learner:latest,TrainingInputMode=File \
  --role-arn arn:aws:iam::123456789012:role/SageMakerExecutionRole \
  --input-data-config '[{"ChannelName":"train","DataSource":{"S3DataSource":{"S3DataType":"S3Prefix","S3Uri":"s3://my-bucket/train-data/","S3DataDistributionType":"FullyReplicated"}}}]' \
  --output-data-config S3OutputPath=s3://my-bucket/model-output/ \
  --resource-config InstanceType=ml.m5.large,InstanceCount=1,VolumeSizeInGB=50 \
  --stopping-condition MaxRuntimeInSeconds=86400 \
  --hyper-parameters feature_dim=100,mini_batch_size=1000,predictor_type=binary_classifier,epochs=10

# Describir trabajo de entrenamiento
aws sagemaker describe-training-job --training-job-name my-training-job

# Listar trabajos de entrenamiento
aws sagemaker list-training-jobs --status COMPLETED --max-results 50

# Detener trabajo de entrenamiento
aws sagemaker stop-training-job --training-job-name my-training-job
```

### **Optimización de Hiperparámetros**
```bash
# Crear trabajo de optimización
aws sagemaker create-hyper-parameter-tuning-job \
  --hyper-parameter-tuning-job-name my-tuning-job \
  --hyper-parameter-tuning-job-config Strategy=Bayesian,ObjectiveType=Maximize,MetricName=validation:accuracy,ResourceLimits='{ "MaxNumberOfTrainingJobs": 20, "MaxParallelTrainingJobs": 3 }' \
  --training-job-definition StaticHyperParameters='{ "feature_dim": "100", "predictor_type": "binary_classifier" }' \
  --role-arn arn:aws:iam::123456789012:role/SageMakerExecutionRole \
  --input-data-config '[{"ChannelName":"train","DataSource":{"S3DataSource":{"S3DataType":"S3Prefix","S3Uri":"s3://my-bucket/train-data/"}}}]' \
  --output-data-config S3OutputPath=s3://my-bucket/model-output/ \
  --resource-config InstanceType=ml.m5.large,InstanceCount=1,VolumeSizeInGB=50 \
  --stopping-condition MaxRuntimeInSeconds=86400

# Describir trabajo de optimización
aws sagemaker describe-hyper-parameter-tuning-job --hyper-parameter-tuning-job-name my-tuning-job
```

### **Despliegue de Modelos**
```bash
# Crear modelo
aws sagemaker create-model \
  --model-name my-model \
  --primary-container Image=763104351884.dkr.ecr.us-east-1.amazonaws.com/linear-learner:latest,ModelDataUrl=s3://my-bucket/model-output/model.tar.gz \
  --execution-role-arn arn:aws:iam::123456789012:role/SageMakerExecutionRole

# Crear configuración de endpoint
aws sagemaker create-endpoint-config \
  --endpoint-config-name my-endpoint-config \
  --production-variants '[{"VariantName":"AllTraffic","ModelName":"my-model","InitialInstanceCount":1,"InstanceType":"ml.m5.large","InitialVariantWeight":1.0}]'

# Crear endpoint
aws sagemaker create-endpoint \
  --endpoint-name my-endpoint \
  --endpoint-config-name my-endpoint-config

# Describir endpoint
aws sagemaker describe-endpoint --endpoint-name my-endpoint

# Invocar endpoint
aws sagemaker-runtime invoke-endpoint \
  --endpoint-name my-endpoint \
  --content-type application/json \
  --body '{"instances": [[0.1, 0.2, 0.3, 0.4, 0.5]]}' \
  output.json

# Eliminar endpoint
aws sagemaker delete-endpoint --endpoint-name my-endpoint
```

### **Feature Store**
```bash
# Crear grupo de características
aws sagemaker create-feature-group \
  --feature-group-name my-feature-group \
  --record-identifier-feature-name customer_id \
  --event-time-feature-name timestamp \
  --feature-definitions '[{"FeatureName":"customer_age","FeatureType":"Integral"},{"FeatureName":"customer_income","FeatureType":"Fractional"}]' \
  --role-arn arn:aws:iam::123456789012:role/SageMakerExecutionRole \
  --online-store-config EnableOnlineStore=true,TtlDuration='{ "Unit": "Days", "Value": 30 }' \
  --offline-store-config S3StorageConfig='{ "S3Uri": "s3://my-bucket/feature-store/" }'

# Describir grupo de características
aws sagemaker describe-feature-group --feature-group-name my-feature-group
```

### **Pipelines**
```bash
# Crear pipeline
aws sagemaker create-pipeline \
  --pipeline-name my-pipeline \
  --pipeline-definition file://pipeline-definition.json \
  --role-arn arn:aws:iam::123456789012:role/SageMakerExecutionRole

# Iniciar ejecución del pipeline
aws sagemaker start-pipeline-execution \
  --pipeline-name my-pipeline \
  --pipeline-execution-display-name my-execution \
  --pipeline-parameters '[{"Name":"InputData","Value":"s3://my-bucket/train-data/"}]'

# Describir ejecución del pipeline
aws sagemaker describe-pipeline-execution --pipeline-execution-arn arn:aws:sagemaker:region:account-id:pipeline/my-pipeline/execution/my-execution
```

## Mejores Prácticas

### **1. Entrenamiento de Modelos**
- **Data Preparation**: Preparar y limpiar datos antes del entrenamiento
- **Hyperparameter Tuning**: Usar optimización automática de hiperparámetros
- **Spot Training**: Usar instancias spot para reducir costos
- **Distributed Training**: Usar entrenamiento distribuido para datasets grandes
- **Model Validation**: Validar modelos con datos de prueba independientes

### **2. Despliegue de Modelos**
- **Right-sizing**: Elegir tipos de instancia apropiados
- **Auto Scaling**: Configurar auto scaling para manejar carga variable
- **A/B Testing**: Implementar pruebas A/B para comparar modelos
- **Data Capture**: Habilitar captura de datos para monitoreo
- **Multi-model Endpoints**: Usar endpoints multimodelo para eficiencia

### **3. MLOps y Monitoreo**
- **Model Registry**: Usar registro de modelos para versionado
- **Model Monitoring**: Configurar monitoreo de calidad y rendimiento
- **Explainability**: Implementar explicabilidad de predicciones
- **Bias Detection**: Detectar y mitigar sesgos en modelos
- **Pipeline Automation**: Automatizar pipelines de ML

### **4. Cost Optimization**
- **Managed Spot Training**: Usar instancias spot para entrenamiento
- **Right-sizing**: Elegir tamaños de instancia apropiados
- **Lifecycle Policies**: Implementar políticas de ciclo de vida
- **Resource Cleanup**: Limpiar recursos no utilizados
- **Cost Monitoring**: Monitorear costos regularmente

## Costos

### **Precios de AWS SageMaker**
- **Training**: $0.10 - $15.00 por hora según tipo de instancia
- **Notebook Instances**: $0.05 - $15.24 por hora según tipo de instancia
- **Inference**: $0.05 - $15.24 por hora según tipo de instancia
- **Data Processing**: $0.10 - $15.00 por hora según tipo de instancia
- **Storage**: $0.023 por GB-mes para S3
- **Feature Store**: $0.10 por GB-mes para almacenamiento online

### **Ejemplo de Costos Mensuales**
- **Training**: 100 horas × $2.00 = $200.00
- **Notebook Instances**: 160 horas × $0.50 = $80.00
- **Inference**: 730 horas × $1.00 = $730.00
- **Data Processing**: 50 horas × $1.50 = $75.00
- **Storage**: 500 GB × $0.023 = $11.50
- **Feature Store**: 100 GB × $0.10 = $10.00
- **Total estimado**: ~$1,106.50 por mes

## Troubleshooting

### **Problemas Comunes**
1. **Training Jobs Fallidos**: Verificar configuración de datos y permisos
2. **Endpoints Lentos**: Optimizar configuración de instancias y auto scaling
3. **Costos Elevados**: Usar spot training y optimizar recursos
4. **Model Performance**: Optimizar hiperparámetros y arquitectura de modelo

### **Comandos de Diagnóstico**
```bash
# Verificar estado del trabajo de entrenamiento
aws sagemaker describe-training-job --training-job-name my-training-job

# Verificar estado del endpoint
aws sagemaker describe-endpoint --endpoint-name my-endpoint

# Verificar logs de CloudWatch
aws logs tail /aws/sagemaker/TrainingJobs --follow

# Verificar métricas de CloudWatch
aws cloudwatch get-metric-statistics --namespace AWS/SageMaker --metric-name TrainingTime --dimensions Name=TrainingJobName,Value=my-training-job
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
- **Data Storage**: Almacenamiento de datos de entrenamiento y modelos
- **Model Artifacts**: Almacenamiento de artefactos de modelos
- **Feature Store**: Almacenamiento de características offline
- **Backup**: Backup de modelos y datos importantes

### **AWS Lambda**
- **Preprocessing**: Preprocesamiento de datos antes del entrenamiento
- **Postprocessing**: Postprocesamiento de predicciones
- **Event Handling**: Manejo de eventos de SageMaker
- **Custom Logic**: Implementación de lógica personalizada

### **AWS CloudWatch**
- **Monitoring**: Monitoreo de métricas y rendimiento
- **Alarms**: Alarmas para eventos críticos
- **Logs**: Almacenamiento de logs de entrenamiento e inferencia
- **Dashboards**: Visualización de métricas

### **AWS IAM**
- **Access Control**: Control de acceso a recursos de SageMaker
- **Role Management**: Gestión de roles de ejecución
- **Permissions**: Permisos específicos para diferentes operaciones
- **Security**: Seguridad de acceso a datos y modelos

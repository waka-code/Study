# AWS Compute Optimizer

## Definición

AWS Compute Optimizer es un servicio que utiliza machine learning para analizar las métricas de utilización de recursos y proporcionar recomendaciones de optimización para instancias EC2, volúmenes EBS, funciones Lambda y servicios de Auto Scaling. Ayuda a identificar oportunidades de optimización de costos y rendimiento, recomendando tipos de instancia adecuados, tamaños de volúmenes y configuraciones de memoria.

## Características Principales

### **Análisis de Recursos**
- **EC2 Instances**: Análisis de utilización de CPU, memoria, red y almacenamiento
- **EBS Volumes**: Análisis de IOPS, throughput y utilización de almacenamiento
- **Lambda Functions**: Análisis de memoria, duración y concurrencia
- **Auto Scaling Groups**: Análisis de configuraciones de escalado
- **Fargate Services**: Análisis de CPU y memoria de contenedores

### **Recomendaciones de Optimización**
- **Instance Rightsizing**: Recomendaciones de dimensionamiento correcto
- **Volume Optimization**: Optimización de volúmenes EBS
- **Memory Scaling**: Escalado de memoria Lambda
- **Cost Optimization**: Optimización de costos basada en utilización
- **Performance Improvement**: Mejoras de rendimiento

### **Machine Learning Integration**
- **Pattern Recognition**: Reconocimiento de patrones de uso
- **Predictive Analysis**: Análisis predictivo de tendencias
- **Anomaly Detection**: Detección de anomalías en utilización
- **Learning Models**: Modelos de aprendizaje continuo
- **Adaptive Recommendations**: Recomendaciones adaptativas

### **Integración y Automatización**
- **CloudWatch Integration**: Integración con métricas de CloudWatch
- **Cost Explorer Integration**: Análisis de costos y ahorros
- **Systems Manager Integration**: Gestión automatizada
- **EventBridge Integration**: Automatización de eventos
- **API Integration**: Integración con herramientas externas

## Tipos de Recursos Analizados

### **EC2 Instances**
```
EC2 Instance Analysis
├── Utilization Metrics
│   ├── CPU Utilization
│   ├── Memory Utilization
│   ├── Network Utilization
│   ├── Disk Utilization
│   └── GPU Utilization (si aplica)
├── Performance Metrics
│   ├── CPU Performance
│   ├── Memory Performance
│   ├── Network Performance
│   └── Storage Performance
├── Cost Analysis
│   ├── Current Cost
│   ├── Recommended Cost
│   ├── Potential Savings
│   └── ROI Analysis
└── Recommendations
    ├── Instance Type Changes
    ├── Instance Size Changes
    ├── Platform Changes
    └── Purchase Model Changes
```

### **EBS Volumes**
```
EBS Volume Analysis
├── Utilization Metrics
│   ├── IOPS Utilization
│   ├── Throughput Utilization
│   ├── Storage Utilization
│   └── Read/Write Patterns
├── Performance Analysis
│   ├── IOPS Performance
│   ├── Latency Analysis
│   ├── Throughput Analysis
│   └── Burst Performance
├── Cost Analysis
│   ├── Current Cost
│   ├── Recommended Cost
│   ├── Storage Cost
│   └── IOPS Cost
└── Recommendations
    ├── Volume Type Changes
    ├── Volume Size Changes
    ├── Provisioned IOPS Changes
    └── Lifecycle Policy Changes
```

### **Lambda Functions**
```
Lambda Function Analysis
├── Utilization Metrics
│   ├── Memory Utilization
│   ├── Duration Utilization
│   ├── Concurrency Utilization
│   └── Error Rates
├── Performance Metrics
│   ├── Execution Duration
│   ├── Cold Start Time
│   ├── Throughput
│   └── Success Rate
├── Cost Analysis
│   ├── Compute Cost
│   ├── Request Cost
│   ├── Data Transfer Cost
│   └── Total Cost
└── Recommendations
    ├── Memory Size Changes
    ├── Timeout Adjustments
    ├── Concurrency Changes
    └── Architecture Changes
```

## Configuración de AWS Compute Optimizer

### **Gestión Completa de AWS Compute Optimizer**
```python
import boto3
import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class ComputeOptimizerManager:
    def __init__(self, region='us-east-1'):
        self.compute_optimizer = boto3.client('compute-optimizer', region_name=region)
        self.ec2 = boto3.client('ec2', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.cost_explorer = boto3.client('ce', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.region = region
    
    def enroll_account(self, s3_bucket_name=None, s3_key_prefix=None):
        """Inscribir cuenta en Compute Optimizer"""
        
        try:
            params = {}
            
            if s3_bucket_name:
                params['S3BucketConfig'] = {
                    'S3BucketArn': f'arn:aws:s3:::{s3_bucket_name}'
                }
                
                if s3_key_prefix:
                    params['S3BucketConfig']['S3KeyPrefix'] = s3_key_prefix
            
            response = self.compute_optimizer.enroll_account(**params)
            
            return {
                'success': True,
                'status': response['Status']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_enrollment_status(self, status, s3_bucket_name=None, s3_key_prefix=None):
        """Actualizar estado de inscripción"""
        
        try:
            params = {'Status': status}
            
            if s3_bucket_name:
                params['S3BucketConfig'] = {
                    'S3BucketArn': f'arn:aws:s3:::{s3_bucket_name}'
                }
                
                if s3_key_prefix:
                    params['S3BucketConfig']['S3KeyPrefix'] = s3_key_prefix
            
            response = self.compute_optimizer.update_enrollment_status(**params)
            
            return {
                'success': True,
                'status': response['Status']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_enrollment_status(self):
        """Obtener estado de inscripción"""
        
        try:
            response = self.compute_optimizer.get_enrollment_status()
            
            enrollment_info = {
                'status': response['Status'],
                'status_reason': response.get('StatusReason', ''),
                'last_updated_timestamp': response.get('LastUpdatedTimestamp', '').isoformat() if response.get('LastUpdatedTimestamp') else '',
                'member_accounts_enrolled': response.get('MemberAccountsEnrolled', False),
                's3_bucket_config': response.get('S3BucketConfig', {})
            }
            
            return {
                'success': True,
                'enrollment_status': enrollment_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_ec2_instance_recommendations(self, instance_arns=None, next_token=None, max_results=50):
        """Obtener recomendaciones de instancias EC2"""
        
        try:
            params = {'accountIds': [self.sts.get_caller_identity()['Account']]}
            
            if instance_arns:
                params['instanceArns'] = instance_arns
            
            if next_token:
                params['nextToken'] = next_token
            
            if max_results:
                params['maxResults'] = max_results
            
            response = self.compute_optimizer.get_ec2_instance_recommendations(**params)
            
            recommendations = []
            for rec in response['instanceRecommendations']:
                rec_info = {
                    'instance_arn': rec['instanceArn'],
                    'instance_name': rec['instanceName'],
                    'account_id': rec['accountId'],
                    'current_instance_type': rec['instanceType'],
                    'current_platform': rec['currentPlatform'],
                    'finding': rec['finding'],
                    'utilization_metrics': rec.get('utilizationMetrics', []),
                    'recommendation_options': rec.get('recommendationOptions', []),
                    'recommendation_sources': rec.get('recommendationSources', []),
                    'last_refresh_timestamp': rec.get('lastRefreshTimestamp', '').isoformat() if rec.get('lastRefreshTimestamp') else ''
                }
                recommendations.append(rec_info)
            
            return {
                'success': True,
                'recommendations': recommendations,
                'count': len(recommendations),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_ebs_volume_recommendations(self, volume_arns=None, next_token=None, max_results=50):
        """Obtener recomendaciones de volúmenes EBS"""
        
        try:
            params = {'accountIds': [self.sts.get_caller_identity()['Account']]}
            
            if volume_arns:
                params['volumeArns'] = volume_arns
            
            if next_token:
                params['nextToken'] = next_token
            
            if max_results:
                params['maxResults'] = max_results
            
            response = self.compute_optimizer.get_ebs_volume_recommendations(**params)
            
            recommendations = []
            for rec in response['volumeRecommendations']:
                rec_info = {
                    'volume_arn': rec['volumeArn'],
                    'account_id': rec['accountId'],
                    'current_volume_type': rec['volumeType'],
                    'current_volume_size': rec['volumeSize'],
                    'finding': rec['finding'],
                    'utilization_metrics': rec.get('utilizationMetrics', []),
                    'recommendation_options': rec.get('recommendationOptions', []),
                    'recommendation_sources': rec.get('recommendationSources', []),
                    'last_refresh_timestamp': rec.get('lastRefreshTimestamp', '').isoformat() if rec.get('lastRefreshTimestamp') else ''
                }
                recommendations.append(rec_info)
            
            return {
                'success': True,
                'recommendations': recommendations,
                'count': len(recommendations),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_lambda_function_recommendations(self, function_arns=None, next_token=None, max_results=50):
        """Obtener recomendaciones de funciones Lambda"""
        
        try:
            params = {'accountIds': [self.sts.get_caller_identity()['Account']]}
            
            if function_arns:
                params['functionArns'] = function_arns
            
            if next_token:
                params['nextToken'] = next_token
            
            if max_results:
                params['maxResults'] = max_results
            
            response = self.compute_optimizer.get_lambda_function_recommendations(**params)
            
            recommendations = []
            for rec in response['lambdaFunctionRecommendations']:
                rec_info = {
                    'function_arn': rec['lambdaFunctionArn'],
                    'function_name': rec['functionName'],
                    'function_version': rec['functionVersion'],
                    'account_id': rec['accountId'],
                    'current_memory_size': rec['memorySize'],
                    'finding': rec['finding'],
                    'utilization_metrics': rec.get('utilizationMetrics', []),
                    'recommendation_options': rec.get('recommendationOptions', []),
                    'recommendation_sources': rec.get('recommendationSources', []),
                    'last_refresh_timestamp': rec.get('lastRefreshTimestamp', '').isoformat() if rec.get('LastRefreshTimestamp') else ''
                }
                recommendations.append(rec_info)
            
            return {
                'success': True,
                'recommendations': recommendations,
                'count': len(recommendations),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_auto_scaling_group_recommendations(self, group_arns=None, next_token=None, max_results=50):
        """Obtener recomendaciones de grupos de Auto Scaling"""
        
        try:
            params = {'accountIds': [self.sts.get_caller_identity()['Account']]}
            
            if group_arns:
                params['autoScalingGroupArns'] = group_arns
            
            if next_token:
                params['nextToken'] = next_token
            
            if max_results:
                params['maxResults'] = max_results
            
            response = self.compute_optimizer.get_auto_scaling_group_recommendations(**params)
            
            recommendations = []
            for rec in response['autoScalingGroupRecommendations']:
                rec_info = {
                    'auto_scaling_group_arn': rec['autoScalingGroupArn'],
                    'auto_scaling_group_name': rec['autoScalingGroupName'],
                    'account_id': rec['accountId'],
                    'finding': rec['finding'],
                    'utilization_metrics': rec.get('utilizationMetrics', []),
                    'recommendation_options': rec.get('recommendationOptions', []),
                    'recommendation_sources': rec.get('recommendationSources', []),
                    'last_refresh_timestamp': rec.get('lastRefreshTimestamp', '').isoformat() if rec.get('lastRefreshTimestamp') else ''
                }
                recommendations.append(rec_info)
            
            return {
                'success': True,
                'recommendations': recommendations,
                'count': len(recommendations),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_recommendation_summaries(self, account_ids=None, resource_types=None, next_token=None, max_results=50):
        """Obtener resúmenes de recomendaciones"""
        
        try:
            params = {}
            
            if account_ids:
                params['accountIds'] = account_ids
            else:
                params['accountIds'] = [self.sts.get_caller_identity()['Account']]
            
            if resource_types:
                params['resourceArns'] = resource_types
            
            if next_token:
                params['nextToken'] = next_token
            
            if max_results:
                params['maxResults'] = max_results
            
            response = self.compute_optimizer.get_recommendation_summaries(**params)
            
            summaries = []
            for summary in response['recommendationSummaries']:
                summary_info = {
                    'account_id': summary['accountId'],
                    'summaries': summary.get('summaries', {}),
                    'recommendation_lookup_keys': summary.get('recommendationLookupKeys', [])
                }
                summaries.append(summary_info)
            
            return {
                'success': True,
                'summaries': summaries,
                'count': len(summaries),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def export_recommendations(self, s3_bucket_name, s3_key_prefix=None, account_ids=None,
                              resource_types=None, file_format='Csv', include_member_accounts=False):
        """Exportar recomendaciones a S3"""
        
        try:
            params = {
                's3DestinationConfig': {
                    'bucket': s3_bucket_name
                },
                'fileFormat': file_format
            }
            
            if s3_key_prefix:
                params['s3DestinationConfig']['keyPrefix'] = s3_key_prefix
            
            if account_ids:
                params['accountIds'] = account_ids
            
            if resource_types:
                params['resourceTypes'] = resource_types
            
            if include_member_accounts:
                params['includeMemberAccounts'] = include_member_accounts
            
            response = self.compute_optimizer.export_ec2_instance_recommendations(**params)
            
            return {
                'success': True,
                'job_id': response['jobId'],
                's3_destination': response['s3Destination']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_export_recommendation_status(self, job_id):
        """Obtener estado de exportación de recomendaciones"""
        
        try:
            response = self.compute_optimizer.get_recommendation_export_status(
                jobId=job_id
            )
            
            status_info = {
                'job_id': response['jobId'],
                'status': response['status'],
                'created_timestamp': response['createdTimestamp'].isoformat(),
                'last_updated_timestamp': response.get('lastUpdatedTimestamp', '').isoformat() if response.get('lastUpdatedTimestamp') else '',
                's3_destination': response.get('s3Destination', {}),
                'failure_reason': response.get('failureReason', '')
            }
            
            return {
                'success': True,
                'export_status': status_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_ec2_optimization_opportunities(self, instance_arns=None):
        """Analizar oportunidades de optimización EC2"""
        
        try:
            # Obtener recomendaciones de EC2
            ec2_result = self.get_ec2_instance_recommendations(instance_arns=instance_arns)
            
            if not ec2_result['success']:
                return ec2_result
            
            recommendations = ec2_result['recommendations']
            
            analysis = {
                'total_instances': len(recommendations),
                'optimization_categories': {
                    'underutilized': 0,
                    'overutilized': 0,
                    'optimized': 0,
                    'not_analyzed': 0
                },
                'potential_savings': 0,
                'recommendation_summary': {},
                'actionable_recommendations': []
            }
            
            # Analizar cada recomendación
            for rec in recommendations:
                finding = rec['finding']
                
                # Contar por categoría
                if finding == 'UNDERUTILIZED':
                    analysis['optimization_categories']['underutilized'] += 1
                elif finding == 'OVERUTILIZED':
                    analysis['optimization_categories']['overutilized'] += 1
                elif finding == 'OPTIMIZED':
                    analysis['optimization_categories']['optimized'] += 1
                else:
                    analysis['optimization_categories']['not_analyzed'] += 1
                
                # Analizar opciones de recomendación
                for option in rec.get('recommendationOptions', []):
                    if 'estimatedMonthlySavings' in option:
                        savings = option['estimatedMonthlySavings']
                        if 'amount' in savings:
                            analysis['potential_savings'] += float(savings['amount'])
                    
                    # Crear recomendaciones accionables
                    if finding in ['UNDERUTILIZED', 'OVERUTILIZED']:
                        actionable_rec = {
                            'instance_arn': rec['instance_arn'],
                            'instance_name': rec['instance_name'],
                            'current_type': rec['current_instance_type'],
                            'finding': finding,
                            'recommended_type': option.get('instanceType', ''),
                            'estimated_savings': option.get('estimatedMonthlySavings', {}).get('amount', 0),
                            'performance_risk': option.get('performanceRisk', ''),
                            'priority': 'HIGH' if finding == 'OVERUTILIZED' else 'MEDIUM'
                        }
                        analysis['actionable_recommendations'].append(actionable_rec)
            
            # Crear resumen de recomendaciones
            analysis['recommendation_summary'] = {
                'total_potential_savings': analysis['potential_savings'],
                'actionable_count': len(analysis['actionable_recommendations']),
                'optimization_rate': (analysis['optimization_categories']['underutilized'] + 
                                    analysis['optimization_categories']['overutilized']) / analysis['total_instances'] * 100
            }
            
            return {
                'success': True,
                'analysis': analysis
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_ebs_optimization_opportunities(self, volume_arns=None):
        """Analizar oportunidades de optimización EBS"""
        
        try:
            # Obtener recomendaciones de EBS
            ebs_result = self.get_ebs_volume_recommendations(volume_arns=volume_arns)
            
            if not ebs_result['success']:
                return ebs_result
            
            recommendations = ebs_result['recommendations']
            
            analysis = {
                'total_volumes': len(recommendations),
                'optimization_categories': {
                    'underutilized': 0,
                    'overutilized': 0,
                    'optimized': 0,
                    'not_analyzed': 0
                },
                'potential_savings': 0,
                'recommendation_summary': {},
                'actionable_recommendations': []
            }
            
            # Analizar cada recomendación
            for rec in recommendations:
                finding = rec['finding']
                
                # Contar por categoría
                if finding == 'UNDERUTILIZED':
                    analysis['optimization_categories']['underutilized'] += 1
                elif finding == 'OVERUTILIZED':
                    analysis['optimization_categories']['overutilized'] += 1
                elif finding == 'OPTIMIZED':
                    analysis['optimization_categories']['optimized'] += 1
                else:
                    analysis['optimization_categories']['not_analyzed'] += 1
                
                # Analizar opciones de recomendación
                for option in rec.get('recommendationOptions', []):
                    if 'estimatedMonthlySavings' in option:
                        savings = option['estimatedMonthlySavings']
                        if 'amount' in savings:
                            analysis['potential_savings'] += float(savings['amount'])
                    
                    # Crear recomendaciones accionables
                    if finding in ['UNDERUTILIZED', 'OVERUTILIZED']:
                        actionable_rec = {
                            'volume_arn': rec['volume_arn'],
                            'current_type': rec['current_volume_type'],
                            'current_size': rec['current_volume_size'],
                            'finding': finding,
                            'recommended_type': option.get('volumeType', ''),
                            'recommended_size': option.get('volumeSize', 0),
                            'estimated_savings': option.get('estimatedMonthlySavings', {}).get('amount', 0),
                            'performance_risk': option.get('performanceRisk', ''),
                            'priority': 'MEDIUM'
                        }
                        analysis['actionable_recommendations'].append(actionable_rec)
            
            # Crear resumen de recomendaciones
            analysis['recommendation_summary'] = {
                'total_potential_savings': analysis['potential_savings'],
                'actionable_count': len(analysis['actionable_recommendations']),
                'optimization_rate': (analysis['optimization_categories']['underutilized'] + 
                                    analysis['optimization_categories']['overutilized']) / analysis['total_volumes'] * 100
            }
            
            return {
                'success': True,
                'analysis': analysis
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_lambda_optimization_opportunities(self, function_arns=None):
        """Analizar oportunidades de optimización Lambda"""
        
        try:
            # Obtener recomendaciones de Lambda
            lambda_result = self.get_lambda_function_recommendations(function_arns=function_arns)
            
            if not lambda_result['success']:
                return lambda_result
            
            recommendations = lambda_result['recommendations']
            
            analysis = {
                'total_functions': len(recommendations),
                'optimization_categories': {
                    'underutilized': 0,
                    'overutilized': 0,
                    'optimized': 0,
                    'not_analyzed': 0
                },
                'potential_savings': 0,
                'recommendation_summary': {},
                'actionable_recommendations': []
            }
            
            # Analizar cada recomendación
            for rec in recommendations:
                finding = rec['finding']
                
                # Contar por categoría
                if finding == 'UNDERUTILIZED':
                    analysis['optimization_categories']['underutilized'] += 1
                elif finding == 'OVERUTILIZED':
                    analysis['optimization_categories']['overutilized'] += 1
                elif finding == 'OPTIMIZED':
                    analysis['optimization_categories']['optimized'] += 1
                else:
                    analysis['optimization_categories']['not_analyzed'] += 1
                
                # Analizar opciones de recomendación
                for option in rec.get('recommendationOptions', []):
                    if 'estimatedMonthlySavings' in option:
                        savings = option['estimatedMonthlySavings']
                        if 'amount' in savings:
                            analysis['potential_savings'] += float(savings['amount'])
                    
                    # Crear recomendaciones accionables
                    if finding in ['UNDERUTILIZED', 'OVERUTILIZED']:
                        actionable_rec = {
                            'function_arn': rec['function_arn'],
                            'function_name': rec['function_name'],
                            'current_memory': rec['current_memory_size'],
                            'finding': finding,
                            'recommended_memory': option.get('memorySize', 0),
                            'estimated_savings': option.get('estimatedMonthlySavings', {}).get('amount', 0),
                            'performance_risk': option.get('performanceRisk', ''),
                            'priority': 'MEDIUM'
                        }
                        analysis['actionable_recommendations'].append(actionable_rec)
            
            # Crear resumen de recomendaciones
            analysis['recommendation_summary'] = {
                'total_potential_savings': analysis['potential_savings'],
                'actionable_count': len(analysis['actionable_recommendations']),
                'optimization_rate': (analysis['optimization_categories']['underutilized'] + 
                                    analysis['optimization_categories']['overutilized']) / analysis['total_functions'] * 100
            }
            
            return {
                'success': True,
                'analysis': analysis
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_optimization_report(self, resource_types=None, include_details=True):
        """Generar reporte completo de optimización"""
        
        try:
            report = {
                'report_metadata': {
                    'generated_at': datetime.utcnow().isoformat(),
                    'resource_types': resource_types or ['EC2', 'EBS', 'Lambda'],
                    'include_details': include_details
                },
                'summary': {
                    'total_resources': 0,
                    'total_potential_savings': 0,
                    'optimization_opportunities': 0,
                    'resources_analyzed': 0
                },
                'detailed_analysis': {}
            }
            
            # Analizar EC2 si está incluido
            if not resource_types or 'EC2' in resource_types:
                ec2_analysis = self.analyze_ec2_optimization_opportunities()
                if ec2_analysis['success']:
                    analysis = ec2_analysis['analysis']
                    report['detailed_analysis']['ec2'] = analysis
                    report['summary']['total_resources'] += analysis['total_instances']
                    report['summary']['total_potential_savings'] += analysis['potential_savings']
                    report['summary']['optimization_opportunities'] += len(analysis['actionable_recommendations'])
                    report['summary']['resources_analyzed'] += analysis['total_instances']
            
            # Analizar EBS si está incluido
            if not resource_types or 'EBS' in resource_types:
                ebs_analysis = self.analyze_ebs_optimization_opportunities()
                if ebs_analysis['success']:
                    analysis = ebs_analysis['analysis']
                    report['detailed_analysis']['ebs'] = analysis
                    report['summary']['total_resources'] += analysis['total_volumes']
                    report['summary']['total_potential_savings'] += analysis['potential_savings']
                    report['summary']['optimization_opportunities'] += len(analysis['actionable_recommendations'])
                    report['summary']['resources_analyzed'] += analysis['total_volumes']
            
            # Analizar Lambda si está incluido
            if not resource_types or 'Lambda' in resource_types:
                lambda_analysis = self.analyze_lambda_optimization_opportunities()
                if lambda_analysis['success']:
                    analysis = lambda_analysis['analysis']
                    report['detailed_analysis']['lambda'] = analysis
                    report['summary']['total_resources'] += analysis['total_functions']
                    report['summary']['total_potential_savings'] += analysis['potential_savings']
                    report['summary']['optimization_opportunities'] += len(analysis['actionable_recommendations'])
                    report['summary']['resources_analyzed'] += analysis['total_functions']
            
            # Generar recomendaciones prioritarias
            all_recommendations = []
            for resource_type, analysis in report['detailed_analysis'].items():
                all_recommendations.extend(analysis['actionable_recommendations'])
            
            # Ordenar por ahorros potenciales
            all_recommendations.sort(key=lambda x: x.get('estimated_savings', 0), reverse=True)
            
            report['priority_recommendations'] = all_recommendations[:10]  # Top 10
            
            return {
                'success': True,
                'report': report
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def implement_ec2_recommendation(self, instance_id, recommended_instance_type, dry_run=True):
        """Implementar recomendación de EC2"""
        
        try:
            # Obtener información actual de la instancia
            instance_info = self.ec2.describe_instances(InstanceIds=[instance_id])
            
            if not instance_info['Reservations']:
                return {
                    'success': False,
                    'error': 'Instance not found'
                }
            
            instance = instance_info['Reservations'][0]['Instances'][0]
            
            # Si es dry run, solo simular
            if dry_run:
                return {
                    'success': True,
                    'dry_run': True,
                    'current_instance': instance['InstanceType'],
                    'recommended_instance': recommended_instance_type,
                    'action': 'Would stop instance, modify type, and restart'
                }
            
            # Implementación real
            # 1. Detener instancia
            stop_response = self.ec2.stop_instances(InstanceIds=[instance_id])
            
            # 2. Esperar a que se detenga
            waiter = self.ec2.get_waiter('instance_stopped')
            waiter.wait(InstanceIds=[instance_id])
            
            # 3. Modificar tipo de instancia
            modify_response = self.ec2.modify_instance_attribute(
                InstanceId=instance_id,
                InstanceType={'Value': recommended_instance_type}
            )
            
            # 4. Iniciar instancia
            start_response = self.ec2.start_instances(InstanceIds=[instance_id])
            
            return {
                'success': True,
                'instance_id': instance_id,
                'old_type': instance['InstanceType'],
                'new_type': recommended_instance_type,
                'implemented': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Inscribir Cuenta en Compute Optimizer**
```python
# Ejemplo: Inscribir cuenta en Compute Optimizer
manager = ComputeOptimizerManager('us-east-1')

# Inscribir cuenta con configuración S3
enroll_result = manager.enroll_account(
    s3_bucket_name='compute-optimizer-reports',
    s3_key_prefix='recommendations/'
)

if enroll_result['success']:
    print(f"Account enrolled successfully")
    print(f"Status: {enroll_result['status']}")
    
    # Verificar estado de inscripción
    status_result = manager.get_enrollment_status()
    if status_result['success']:
        status = status_result['enrollment_status']
        print(f"Current Status: {status['status']}")
        print(f"Member Accounts Enrolled: {status['member_accounts_enrolled']}")
        if status['s3_bucket_config']:
            print(f"S3 Bucket: {status['s3_bucket_config']}")
```

### **2. Analizar Recomendaciones de EC2**
```python
# Ejemplo: Analizar recomendaciones de instancias EC2
manager = ComputeOptimizerManager('us-east-1')

# Obtener recomendaciones de EC2
ec2_result = manager.get_ec2_instance_recommendations()

if ec2_result['success']:
    recommendations = ec2_result['recommendations']
    print(f"EC2 Instance Recommendations: {ec2_result['count']}")
    
    # Analizar oportunidades de optimización
    optimization_result = manager.analyze_ec2_optimization_opportunities()
    
    if optimization_result['success']:
        analysis = optimization_result['analysis']
        
        print(f"\nEC2 Optimization Analysis:")
        print(f"  Total Instances: {analysis['total_instances']}")
        print(f"  Underutilized: {analysis['optimization_categories']['underutilized']}")
        print(f"  Overutilized: {analysis['optimization_categories']['overutilized']}")
        print(f"  Optimized: {analysis['optimization_categories']['optimized']}")
        print(f"  Potential Savings: ${analysis['potential_savings']:.2f}")
        
        # Mostrar recomendaciones prioritarias
        actionable = analysis['actionable_recommendations']
        print(f"\nTop 5 Actionable Recommendations:")
        for i, rec in enumerate(actionable[:5], 1):
            print(f"  {i}. {rec['instance_name']}")
            print(f"     Current: {rec['current_type']}")
            print(f"     Recommended: {rec['recommended_type']}")
            print(f"     Savings: ${rec['estimated_savings']:.2f}")
            print(f"     Priority: {rec['priority']}")
```

### **3. Analizar Recomendaciones de EBS**
```python
# Ejemplo: Analizar recomendaciones de volúmenes EBS
manager = ComputeOptimizerManager('us-east-1')

# Obtener recomendaciones de EBS
ebs_result = manager.get_ebs_volume_recommendations()

if ebs_result['success']:
    recommendations = ebs_result['recommendations']
    print(f"EBS Volume Recommendations: {ebs_result['count']}")
    
    # Analizar oportunidades de optimización
    optimization_result = manager.analyze_ebs_optimization_opportunities()
    
    if optimization_result['success']:
        analysis = optimization_result['analysis']
        
        print(f"\nEBS Optimization Analysis:")
        print(f"  Total Volumes: {analysis['total_volumes']}")
        print(f"  Underutilized: {analysis['optimization_categories']['underutilized']}")
        print(f"  Overutilized: {analysis['optimization_categories']['overutilized']}")
        print(f"  Optimized: {analysis['optimization_categories']['optimized']}")
        print(f"  Potential Savings: ${analysis['potential_savings']:.2f}")
        
        # Mostrar recomendaciones prioritarias
        actionable = analysis['actionable_recommendations']
        print(f"\nTop 5 Actionable Recommendations:")
        for i, rec in enumerate(actionable[:5], 1):
            print(f"  {i}. Volume {rec['volume_arn'].split('/')[-1]}")
            print(f"     Current: {rec['current_type']} ({rec['current_size']}GB)")
            print(f"     Recommended: {rec['recommended_type']} ({rec['recommended_size']}GB)")
            print(f"     Savings: ${rec['estimated_savings']:.2f}")
            print(f"     Priority: {rec['priority']}")
```

### **4. Analizar Recomendaciones de Lambda**
```python
# Ejemplo: Analizar recomendaciones de funciones Lambda
manager = ComputeOptimizerManager('us-east-1')

# Obtener recomendaciones de Lambda
lambda_result = manager.get_lambda_function_recommendations()

if lambda_result['success']:
    recommendations = lambda_result['recommendations']
    print(f"Lambda Function Recommendations: {lambda_result['count']}")
    
    # Analizar oportunidades de optimización
    optimization_result = manager.analyze_lambda_optimization_opportunities()
    
    if optimization_result['success']:
        analysis = optimization_result['analysis']
        
        print(f"\nLambda Optimization Analysis:")
        print(f"  Total Functions: {analysis['total_functions']}")
        print(f"  Underutilized: {analysis['optimization_categories']['underutilized']}")
        print(f"  Overutilized: {analysis['optimization_categories']['overutilized']}")
        print(f"  Optimized: {analysis['optimization_categories']['optimized']}")
        print(f"  Potential Savings: ${analysis['potential_savings']:.2f}")
        
        # Mostrar recomendaciones prioritarias
        actionable = analysis['actionable_recommendations']
        print(f"\nTop 5 Actionable Recommendations:")
        for i, rec in enumerate(actionable[:5], 1):
            print(f"  {i}. {rec['function_name']}")
            print(f"     Current Memory: {rec['current_memory']}MB")
            print(f"     Recommended Memory: {rec['recommended_memory']}MB")
            print(f"     Savings: ${rec['estimated_savings']:.2f}")
            print(f"     Priority: {rec['priority']}")
```

### **5. Generar Reporte Completo de Optimización**
```python
# Ejemplo: Generar reporte completo
manager = ComputeOptimizerManager('us-east-1')

# Generar reporte completo
report_result = manager.generate_optimization_report(
    resource_types=['EC2', 'EBS', 'Lambda'],
    include_details=True
)

if report_result['success']:
    report = report_result['report']
    
    print(f"Compute Optimizer Report")
    print(f"  Generated at: {report['report_metadata']['generated_at']}")
    
    summary = report['summary']
    print(f"\nSummary:")
    print(f"  Total Resources: {summary['total_resources']}")
    print(f"  Total Potential Savings: ${summary['total_potential_savings']:.2f}")
    print(f"  Optimization Opportunities: {summary['optimization_opportunities']}")
    print(f"  Resources Analyzed: {summary['resources_analyzed']}")
    
    # Mostrar recomendaciones prioritarias
    priority_recs = report['priority_recommendations']
    print(f"\nTop 10 Priority Recommendations:")
    for i, rec in enumerate(priority_recs, 1):
        print(f"  {i}. {rec.get('instance_name', rec.get('function_name', rec.get('volume_arn', '').split('/')[-1]))}")
        print(f"     Finding: {rec['finding']}")
        print(f"     Estimated Savings: ${rec['estimated_savings']:.2f}")
        print(f"     Priority: {rec['priority']}")
```

### **6. Exportar Recomendaciones a S3**
```python
# Ejemplo: Exportar recomendaciones a S3
manager = ComputeOptimizerManager('us-east-1')

# Exportar recomendaciones de EC2
export_result = manager.export_recommendations(
    s3_bucket_name='compute-optimizer-reports',
    s3_key_prefix='ec2-recommendations/',
    resource_types=['EC2'],
    file_format='Csv'
)

if export_result['success']:
    print(f"Export job started:")
    print(f"  Job ID: {export_result['job_id']}")
    print(f"  S3 Destination: {export_result['s3_destination']}")
    
    # Verificar estado del trabajo
    time.sleep(30)  # Esperar un momento
    
    status_result = manager.get_export_recommendation_status(export_result['job_id'])
    if status_result['success']:
        status = status_result['export_status']
        print(f"  Status: {status['status']}")
        print(f"  Created: {status['created_timestamp']}")
        if status['failure_reason']:
            print(f"  Failure Reason: {status['failure_reason']}")
```

### **7. Implementar Recomendación de EC2**
```python
# Ejemplo: Implementar recomendación de EC2
manager = ComputeOptimizerManager('us-east-1')

# Simular implementación (dry run)
implementation_result = manager.implement_ec2_recommendation(
    instance_id='i-1234567890abcdef0',
    recommended_instance_type='t3.medium',
    dry_run=True
)

if implementation_result['success']:
    if implementation_result['dry_run']:
        print(f"Dry run simulation:")
        print(f"  Current Instance: {implementation_result['current_instance']}")
        print(f"  Recommended Instance: {implementation_result['recommended_instance']}")
        print(f"  Action: {implementation_result['action']}")
    else:
        print(f"Recommendation implemented:")
        print(f"  Instance ID: {implementation_result['instance_id']}")
        print(f"  Old Type: {implementation_result['old_type']}")
        print(f"  New Type: {implementation_result['new_type']}")
        print(f"  Implemented: {implementation_result['implemented']}")
```

## Configuración con AWS CLI

### **Inscripción y Configuración**
```bash
# Inscribir cuenta en Compute Optimizer
aws compute-optimizer enroll-account

# Actualizar estado de inscripción
aws compute-optimizer update-enrollment-status --status Active

# Verificar estado de inscripción
aws compute-optimizer get-enrollment-status

# Inscribir con configuración S3
aws compute-optimizer enroll-account \
  --s3-bucket-arn arn:aws:s3:::my-bucket \
  --s3-key-prefix recommendations/
```

### **Obtener Recomendaciones**
```bash
# Obtener recomendaciones de EC2
aws compute-optimizer get-ec2-instance-recommendations \
  --account-ids 123456789012 \
  --max-results 50

# Obtener recomendaciones de EBS
aws compute-optimizer get-ebs-volume-recommendations \
  --account-ids 123456789012

# Obtener recomendaciones de Lambda
aws compute-optimizer get-lambda-function-recommendations \
  --account-ids 123456789012

# Obtener resúmenes de recomendaciones
aws compute-optimizer get-recommendation-summaries \
  --account-ids 123456789012 \
  --resource-types Ec2Instance EbsVolume LambdaFunction
```

### **Exportación de Recomendaciones**
```bash
# Exportar recomendaciones a S3
aws compute-optimizer export-ec2-instance-recommendations \
  --s3-destination-config bucket=my-bucket,keyPrefix=ec2-recommendations/ \
  --file-format Csv \
  --account-ids 123456789012

# Verificar estado de exportación
aws compute-optimizer get-recommendation-export-status \
  --job-id export-job-123456789
```

## Mejores Prácticas

### **1. Configuración Inicial**
- **Account Enrollment**: Inscribir todas las cuentas relevantes
- **S3 Configuration**: Configurar bucket S3 para exportaciones
- **IAM Permissions**: Configurar permisos adecuados
- **Monitoring Setup**: Configurar monitoreo de recomendaciones
- **Baseline Establishment**: Establecer línea base de rendimiento

### **2. Análisis Continuo**
- **Regular Reviews**: Revisar recomendaciones regularmente
- **Trend Analysis**: Analizar tendencias de utilización
- **Performance Monitoring**: Monitorear rendimiento post-optimización
- **Cost Tracking**: Seguimiento de ahorros de costos
- **Feedback Loop**: Crear ciclo de retroalimentación

### **3. Implementación de Recomendaciones**
- **Prioritization**: Priorizar recomendaciones por impacto
- **Gradual Implementation**: Implementar cambios gradualmente
- **Testing**: Probar cambios en entornos no productivos
- **Rollback Planning**: Planificar rollback si es necesario
- **Documentation**: Documentar cambios realizados

### **4. Automatización**
- **Scheduled Analysis**: Programar análisis automáticos
- **Alert Configuration**: Configurar alertas de recomendaciones
- **Auto-implementation**: Considerar auto-implementación segura
- **Integration**: Integrar con herramientas de gestión
- **Workflow Automation**: Automatizar flujos de trabajo

## Métricas y KPIs

### **Métricas de Optimización**
- **Coverage Rate**: Porcentaje de recursos analizados
- **Optimization Rate**: Porcentaje de recursos con oportunidades
- **Savings Realized**: Ahorros realizados
- **Performance Improvement**: Mejoras de rendimiento
- **Implementation Rate**: Tasa de implementación

### **KPIs de Negocio**
- **Cost Reduction**: Reducción de costos mensual
- **ROI**: Retorno de inversión de optimización
- **Resource Efficiency**: Eficiencia de recursos
- **Application Performance**: Rendimiento de aplicaciones
- **User Satisfaction**: Satisfacción del usuario

## Integración con Otros Servicios

### **AWS CloudWatch**
- **Metrics Collection**: Recopilación de métricas
- **Alarm Configuration**: Configuración de alarmas
- **Dashboard Integration**: Integración con dashboards
- **Performance Monitoring**: Monitoreo de rendimiento

### **AWS Cost Explorer**
- **Cost Analysis**: Análisis de costos
- **Savings Tracking**: Seguimiento de ahorros
- **Budget Integration**: Integración con presupuestos
- **Reporting**: Reportes de costos

### **AWS Systems Manager**
- **Automation**: Automatización de cambios
- **Patch Management**: Gestión de parches
- **Configuration Management**: Gestión de configuración
- **Compliance**: Cumplimiento normativo

### **AWS Lambda**
- **Event Processing**: Procesamiento de eventos
- **Automation Functions**: Funciones de automatización
- **Notification**: Notificaciones de recomendaciones
- **Integration**: Integración con otros servicios

## Costos y Licencias

### **Precios de Compute Optimizer**
- **Service**: GRATIS
- **No hay cargos**: Por usar Compute Optimizer
- **Data Collection**: Sin costo por recopilación de datos
- **Recommendations**: Sin costo por recomendaciones
- **API Calls**: Sin costo por llamadas a API

### **Costos Asociados**
- **CloudWatch Metrics**: Costos de métricas adicionales
- **S3 Storage**: Costos de almacenamiento de exportaciones
- **Data Transfer**: Costos de transferencia de datos
- **Implementation Costs**: Costos de implementación de cambios

## Cumplimiento Normativo

### **Control de Cambios**
- **Change Management**: Gestión de cambios
- **Audit Trail**: Registro de auditoría
- **Approval Workflow**: Flujo de aprobación
- **Documentation**: Documentación de cambios
- **Compliance**: Cumplimiento normativo

### **Regulaciones Aplicables**
- **SOX**: Control de cambios financieros
- **GDPR**: Protección de datos de rendimiento
- **HIPAA**: Optimización de servicios de salud
- **PCI DSS**: Optimización de servicios de pago

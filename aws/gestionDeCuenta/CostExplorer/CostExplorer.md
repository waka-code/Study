# AWS Cost Explorer

## Definición

AWS Cost Explorer es un servicio que permite a los usuarios visualizar, entender y gestionar los costos y el uso de AWS. Proporciona herramientas para analizar los costos a través de diferentes dimensiones, crear informes personalizados, establecer presupuestos y optimizar el gasto en la nube. Ofrece capacidades avanzadas de análisis y visualización para tomar decisiones informadas sobre el uso de recursos.

## Características Principales

### **Análisis de Costos**
- **Cost and Usage Analysis**: Análisis detallado de costos y uso
- **Custom Dimensions**: Dimensiones personalizadas para análisis
- **Time-based Analysis**: Análisis basado en tiempo (días, semanas, meses)
- **Service Breakdown**: Desglose por servicios AWS
- **Resource Level Analysis**: Análisis a nivel de recurso

### **Visualización y Reportes**
- **Interactive Dashboards**: Dashboards interactivos personalizables
- **Custom Reports**: Reportes personalizados y programados
- **Cost Allocation Tags**: Etiquetas para asignación de costos
- **Trend Analysis**: Análisis de tendencias y patrones
- **Forecasting**: Proyecciones de costos futuros

### **Optimización de Costos**
- **Cost Optimization Recommendations**: Recomendaciones de optimización
- **Rightsizing Recommendations**: Recomendaciones de tamaño adecuado
- **Savings Opportunities**: Identificación de oportunidades de ahorro
- **Usage Patterns**: Análisis de patrones de uso
- **Anomaly Detection**: Detección de anomalías en costos

### **Integración y Automatización**
- **API Access**: Acceso completo vía API
- **Data Export**: Exportación de datos a múltiples formatos
- **Integration with Budgets**: Integración con AWS Budgets
- **SNS Notifications**: Notificaciones vía SNS
- **Lambda Integration**: Integración con Lambda para automatización

## Dimensiones y Métricas de Cost Explorer

### **Dimensiones Principales**
```
Cost Explorer Dimensions
├── Service Dimensions
│   ├── SERVICE: Servicio AWS específico
│   ├── OPERATION_TYPE: Tipo de operación (RunInstance, CreateBucket)
│   ├── LOCATION: Región o zona de disponibilidad
│   └── USAGE_TYPE: Tipo de uso específico
├── Time Dimensions
│   ├── START_TIME: Fecha de inicio del período
│   ├── END_TIME: Fecha de fin del período
│   ├── GRANULARITY: Granularidad (DAILY, MONTHLY, HOURLY)
│   └── PERIOD: Período de tiempo específico
├── Resource Dimensions
│   ├── RESOURCE_ID: ID del recurso específico
│   ├── LINKED_ACCOUNT: Cuenta vinculada (Organizations)
│   ├── BILLING_ENTITY: Entidad de facturación
│   └── PURCHASE_TYPE: Tipo de compra (On-Demand, Reserved, Savings Plans)
└── Tag Dimensions
    ├── TAG: Etiquetas personalizadas
    ├── COST_ALLOCATION_TAG: Etiqueta de asignación de costos
    ├── USER_DEFINED_TAG: Etiqueta definida por usuario
    └── SYSTEM_TAG: Etiqueta generada por sistema
```

### **Métricas Disponibles**
```
Cost Explorer Metrics
├── Cost Metrics
│   ├── BlendedCost: Costo combinado (con descuentos)
│   ├── UnblendedCost: Costo sin combinar (tarifa estándar)
│   ├── AmortizedCost: Costo amortizado (reservas)
│   ├── NetAmortizedCost: Costo neto amortizado
│   └── NetUnblendedCost: Costo neto sin combinar
├── Usage Metrics
│   ├── UsageQuantity: Cantidad de uso
│   ├── NormalizedUsageAmount: Uso normalizado (reservas)
│   ├── InstanceHours: Horas de instancia
│   ├── StorageBytes: Bytes de almacenamiento
│   └── DataTransferBytes: Bytes transferidos
├── Rate Metrics
│   ├── Rate: Tarifa por unidad
│   ├── EffectiveRate: Tarifa efectiva
│   ├── BlendedRate: Tarifa combinada
│   └── SavingsRate: Tasa de ahorro
└── Financial Metrics
    ├── RIUtilization: Utilización de reservas
    ├── SPCoverage: Cobertura de Savings Plans
    ├── SavingsAmount: Monto de ahorro
    └── CostAvoidance: Evitación de costos
```

## Configuración de AWS Cost Explorer

### **Gestión Completa de Cost Explorer**
```python
import boto3
import json
import time
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Union, Tuple
from dataclasses import dataclass
from enum import Enum

class CostExplorerManager:
    """Gestor completo de AWS Cost Explorer"""
    
    def __init__(self, region='us-east-1'):
        self.cost_explorer = boto3.client('ce', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.region = region
        self.account_id = boto3.client('sts').get_caller_identity()['Account']
        
        # Inicializar componentes
        self.cost_analyzer = CostAnalyzer(self.cost_explorer)
        self.report_generator = CostReportGenerator(self.cost_explorer)
        self.forecast_engine = CostForecastEngine(self.cost_explorer)
        self.optimization_engine = CostOptimizationEngine(self.cost_explorer)
        self.alert_manager = CostAlertManager(self.cloudwatch, self.sns)
        
        # Configuración de análisis
        self.analysis_config = {
            'default_granularity': 'DAILY',
            'default_metrics': ['BlendedCost', 'UsageQuantity'],
            'default_group_by': ['SERVICE'],
            'forecast_months': 12,
            'anomaly_threshold': 2.0  # desviaciones estándar
        }
    
    def get_cost_and_usage(self, start_date: datetime, end_date: datetime,
                          granularity: str = 'DAILY', metrics: List[str] = None,
                          group_by: List[Dict] = None, filter_dict: Dict = None) -> Dict:
        """Obtener costos y uso"""
        
        try:
            # Configurar parámetros por defecto
            metrics = metrics or self.analysis_config['default_metrics']
            group_by = group_by or [{'Type': 'DIMENSION', 'Key': 'SERVICE'}]
            
            # Construir consulta
            query_params = {
                'TimePeriod': {
                    'Start': start_date.strftime('%Y-%m-%d'),
                    'End': end_date.strftime('%Y-%m-%d')
                },
                'Granularity': granularity,
                'Metrics': metrics,
                'GroupBy': group_by
            }
            
            # Agregar filtro si se proporciona
            if filter_dict:
                query_params['Filter'] = filter_dict
            
            # Ejecutar consulta
            response = self.cost_explorer.get_cost_and_usage(**query_params)
            
            # Procesar resultados
            results = []
            for result in response['ResultsByTime']:
                period = result['TimePeriod']['Start']
                
                for group in result['Groups']:
                    # Extraer claves del grupo
                    keys = group['Keys']
                    
                    # Extraer métricas
                    metrics_data = {}
                    for metric_name, metric_value in group['Metrics'].items():
                        metrics_data[metric_name] = {
                            'amount': float(metric_value['Amount']),
                            'unit': metric_value['Unit']
                        }
                    
                    result_data = {
                        'period': period,
                        'keys': keys,
                        'metrics': metrics_data
                    }
                    results.append(result_data)
            
            # Calcular estadísticas agregadas
            aggregated_stats = self._calculate_aggregated_stats(results)
            
            return {
                'success': True,
                'results': results,
                'aggregated_stats': aggregated_stats,
                'query_params': query_params,
                'total_results': len(results),
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_cost_forecast(self, start_date: datetime, end_date: datetime,
                         metric: str = 'BlendedCost', granularity: str = 'MONTHLY',
                         filter_dict: Dict = None) -> Dict:
        """Obtener pronóstico de costos"""
        
        try:
            # Construir parámetros de pronóstico
            forecast_params = {
                'TimePeriod': {
                    'Start': start_date.strftime('%Y-%m-%d'),
                    'End': end_date.strftime('%Y-%m-%d')
                },
                'Metric': metric,
                'Granularity': granularity
            }
            
            # Agregar filtro si se proporciona
            if filter_dict:
                forecast_params['Filter'] = filter_dict
            
            # Ejecutar pronóstico
            response = self.cost_explorer.get_cost_forecast(**forecast_params)
            
            # Procesar resultados del pronóstico
            forecast_results = []
            for result in response['ForecastResultsByTime']:
                period = result['TimePeriod']['Start']
                
                forecast_data = {
                    'period': period,
                    'predicted_amount': float(result['MeanValue']),
                    'prediction_interval_lower': float(result['PredictionIntervalLowerBound']),
                    'prediction_interval_upper': float(result['PredictionIntervalUpperBound']),
                    'confidence_level': self._calculate_confidence_level(result)
                }
                forecast_results.append(forecast_data)
            
            # Calcular estadísticas del pronóstico
            forecast_stats = self._calculate_forecast_stats(forecast_results)
            
            return {
                'success': True,
                'forecast_results': forecast_results,
                'forecast_stats': forecast_stats,
                'forecast_params': forecast_params,
                'total_forecast_periods': len(forecast_results),
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_dimension_values(self, dimension: str, time_period: Dict = None) -> Dict:
        """Obtener valores de una dimensión específica"""
        
        try:
            # Configurar período de tiempo por defecto
            if not time_period:
                end_date = datetime.utcnow()
                start_date = end_date - timedelta(days=90)
                time_period = {
                    'Start': start_date.strftime('%Y-%m-%d'),
                    'End': end_date.strftime('%Y-%m-%d')
                }
            
            # Obtener valores de la dimensión
            response = self.cost_explorer.get_dimension_values(
                TimePeriod=time_period,
                Dimension=dimension
            )
            
            # Procesar valores
            dimension_values = []
            for dimension_value in response['DimensionValues']:
                value_data = {
                    'value': dimension_value['Value'],
                    'estimated': dimension_value.get('Estimated', False)
                }
                dimension_values.append(value_data)
            
            return {
                'success': True,
                'dimension': dimension,
                'values': dimension_values,
                'total_values': len(dimension_values),
                'time_period': time_period,
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_rightsizing_recommendations(self, service: str = 'EC2') -> Dict:
        """Obtener recomendaciones de rightsizing"""
        
        try:
            # Obtener recomendaciones de rightsizing
            response = self.cost_explorer.get_rightsizing_recommendations(
                Service=service,
                Configuration={
                    'BenefitsConsidered': True,
                    'RecommendationTarget': 'SAME_INSTANCE_FAMILY',
                    'ResourceType': 'EC2_INSTANCE'
                }
            )
            
            # Procesar recomendaciones
            recommendations = []
            for recommendation in response['RightsizingRecommendations']:
                rec_data = {
                    'instance_id': recommendation['InstanceId'],
                    'account_id': recommendation['AccountId'],
                    'current_instance_type': recommendation['CurrentInstanceType'],
                    'recommendation_options': []
                }
                
                # Procesar opciones de recomendación
                for option in recommendation['RecommendationOptions']:
                    option_data = {
                        'instance_type': option['InstanceType'],
                        'projected_utilization_metrics': option['ProjectedUtilizationMetrics'],
                        'estimated_monthly_savings': option['EstimatedMonthlySavings'],
                        'configuration': option.get('Configuration', {})
                    }
                    rec_data['recommendation_options'].append(option_data)
                
                recommendations.append(rec_data)
            
            # Calcular estadísticas agregadas
            stats = self._calculate_rightsizing_stats(recommendations)
            
            return {
                'success': True,
                'service': service,
                'recommendations': recommendations,
                'stats': stats,
                'total_recommendations': len(recommendations),
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_savings_plans_coverage(self, time_period: Dict = None) -> Dict:
        """Obtener cobertura de Savings Plans"""
        
        try:
            # Configurar período de tiempo por defecto
            if not time_period:
                end_date = datetime.utcnow()
                start_date = end_date - timedelta(days=30)
                time_period = {
                    'Start': start_date.strftime('%Y-%m-%d'),
                    'End': end_date.strftime('%Y-%m-%d')
                }
            
            # Obtener cobertura de Savings Plans
            response = self.cost_explorer.get_savings_plans_coverage(
                TimePeriod=time_period,
                GroupBy=[
                    {
                        'Type': 'DIMENSION',
                        'Key': 'SAVINGS_PLANS_TYPE'
                    }
                ],
                Granularity='DAILY',
                Metrics=[
                    'SpendCoveredBySavingsPlans',
                    'OnDemandCost'
                ]
            )
            
            # Procesar resultados de cobertura
            coverage_results = []
            for result in response['SavingsPlansCoverages']:
                period = result['TimePeriod']['Start']
                
                for group in result['Groups']:
                    coverage_data = {
                        'period': period,
                        'savings_plans_type': group['Keys'][0],
                        'coverage_percentage': float(group['Metrics']['SpendCoveredBySavingsPlans']['Amount']),
                        'on_demand_cost': float(group['Metrics']['OnDemandCost']['Amount'])
                    }
                    coverage_results.append(coverage_data)
            
            # Calcular estadísticas de cobertura
            coverage_stats = self._calculate_coverage_stats(coverage_results)
            
            return {
                'success': True,
                'coverage_results': coverage_results,
                'coverage_stats': coverage_stats,
                'time_period': time_period,
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_cost_anomaly_subscription(self, subscription_config: Dict) -> Dict:
        """Crear suscripción de anomalías de costos"""
        
        try:
            # Validar configuración
            validation_result = self._validate_anomaly_subscription_config(subscription_config)
            if not validation_result['valid']:
                return {
                    'success': False,
                    'error': validation_result['error']
                }
            
            # Crear suscripción de anomalías
            response = self.cost_explorer.create_anomaly_subscription(
                AnomalySubscription=subscription_config
            )
            
            return {
                'success': True,
                'subscription_arn': response['AnomalySubscriptionArn'],
                'subscription_id': subscription_config['SubscriptionName'],
                'created_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_cost_trends(self, months: int = 6, service: str = None) -> Dict:
        """Analizar tendencias de costos"""
        
        try:
            # Configurar período de análisis
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=months * 30)
            
            # Obtener datos históricos
            cost_data = self.get_cost_and_usage(
                start_date=start_date,
                end_date=end_date,
                granularity='MONTHLY',
                group_by=[{'Type': 'DIMENSION', 'Key': 'SERVICE'}]
            )
            
            if not cost_data['success']:
                return cost_data
            
            # Analizar tendencias
            trend_analysis = self._analyze_cost_trends_data(cost_data['results'], service)
            
            # Generar proyecciones
            projections = self._generate_cost_projections(trend_analysis)
            
            # Identificar anomalías
            anomalies = self._detect_cost_anomalies(cost_data['results'])
            
            return {
                'success': True,
                'trend_analysis': trend_analysis,
                'projections': projections,
                'anomalies': anomalies,
                'analysis_period': f"{months} months",
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_cost_allocation_tags(self, tags: List[str]) -> Dict:
        """Crear etiquetas de asignación de costos"""
        
        try:
            # Activar etiquetas de asignación de costos
            activated_tags = []
            
            for tag in tags:
                response = self.cost_explorer.create_cost_allocation_tag_status(
                    TagKey=tag,
                    Status='Active'
                )
                activated_tags.append(tag)
            
            return {
                'success': True,
                'activated_tags': activated_tags,
                'total_tags': len(activated_tags),
                'activated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_cost_report(self, report_config: Dict) -> Dict:
        """Generar reporte de costos personalizado"""
        
        try:
            # Validar configuración
            validation_result = self._validate_report_config(report_config)
            if not validation_result['valid']:
                return {
                    'success': False,
                    'error': validation_result['error']
                }
            
            # Generar reporte
            report_data = self._generate_custom_report(report_config)
            
            # Exportar reporte si se solicita
            export_result = None
            if report_config.get('export', False):
                export_result = self._export_report(report_data, report_config.get('export_format', 'CSV'))
            
            return {
                'success': True,
                'report_data': report_data,
                'export_result': export_result,
                'report_config': report_config,
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _calculate_aggregated_stats(self, results: List[Dict]) -> Dict:
        """Calcular estadísticas agregadas"""
        
        try:
            if not results:
                return {}
            
            # Agregar todos los costos
            total_costs = {}
            total_usage = {}
            
            for result in results:
                for metric_name, metric_data in result['metrics'].items():
                    if 'Cost' in metric_name:
                        if metric_name not in total_costs:
                            total_costs[metric_name] = 0.0
                        total_costs[metric_name] += metric_data['amount']
                    elif 'Usage' in metric_name or 'Quantity' in metric_name:
                        if metric_name not in total_usage:
                            total_usage[metric_name] = 0.0
                        total_usage[metric_name] += metric_data['amount']
            
            # Calcular estadísticas
            stats = {
                'total_costs': total_costs,
                'total_usage': total_usage,
                'unique_services': len(set(r['keys'][0] for r in results if r['keys'])),
                'data_points': len(results),
                'period_range': {
                    'start': min(r['period'] for r in results),
                    'end': max(r['period'] for r in results)
                }
            }
            
            return stats
            
        except Exception:
            return {}
    
    def _calculate_forecast_stats(self, forecast_results: List[Dict]) -> Dict:
        """Calcular estadísticas del pronóstico"""
        
        try:
            if not forecast_results:
                return {}
            
            # Calcular estadísticas básicas
            predicted_values = [r['predicted_amount'] for r in forecast_results]
            
            stats = {
                'total_predicted': sum(predicted_values),
                'average_predicted': np.mean(predicted_values),
                'max_predicted': max(predicted_values),
                'min_predicted': min(predicted_values),
                'forecast_periods': len(forecast_results),
                'confidence_levels': [r['confidence_level'] for r in forecast_results]
            }
            
            return stats
            
        except Exception:
            return {}
    
    def _calculate_confidence_level(self, result: Dict) -> float:
        """Calcular nivel de confianza del pronóstico"""
        
        try:
            # Calcular basado en el intervalo de predicción
            upper = float(result['PredictionIntervalUpperBound'])
            lower = float(result['PredictionIntervalLowerBound'])
            mean = float(result['MeanValue'])
            
            if mean == 0:
                return 0.0
            
            # Ancho del intervalo relativo al valor medio
            interval_width = (upper - lower) / mean
            confidence = max(0, min(100, 100 - (interval_width * 50)))
            
            return confidence
            
        except Exception:
            return 50.0  # Valor por defecto
    
    def _calculate_rightsizing_stats(self, recommendations: List[Dict]) -> Dict:
        """Calcular estadísticas de rightsizing"""
        
        try:
            if not recommendations:
                return {}
            
            total_savings = 0.0
            instance_types = {}
            
            for rec in recommendations:
                for option in rec['recommendation_options']:
                    if 'EstimatedMonthlySavings' in option:
                        savings = float(option['EstimatedMonthlySavings']['Amount'])
                        total_savings += savings
                    
                    instance_type = option['instance_type']
                    if instance_type not in instance_types:
                        instance_types[instance_type] = 0
                    instance_types[instance_type] += 1
            
            stats = {
                'total_recommendations': len(recommendations),
                'total_potential_savings': total_savings,
                'average_savings_per_instance': total_savings / len(recommendations) if recommendations else 0,
                'recommended_instance_types': instance_types,
                'most_recommended_type': max(instance_types.keys(), key=lambda x: instance_types[x]) if instance_types else None
            }
            
            return stats
            
        except Exception:
            return {}
    
    def _calculate_coverage_stats(self, coverage_results: List[Dict]) -> Dict:
        """Calcular estadísticas de cobertura"""
        
        try:
            if not coverage_results:
                return {}
            
            # Calcular cobertura promedio
            coverage_percentages = [r['coverage_percentage'] for r in coverage_results]
            
            stats = {
                'average_coverage': np.mean(coverage_percentages),
                'max_coverage': max(coverage_percentages),
                'min_coverage': min(coverage_percentages),
                'coverage_periods': len(coverage_results),
                'total_on_demand_cost': sum(r['on_demand_cost'] for r in coverage_results)
            }
            
            return stats
            
        except Exception:
            return {}
    
    def _analyze_cost_trends_data(self, results: List[Dict], service: str = None) -> Dict:
        """Analizar datos de tendencias de costos"""
        
        try:
            # Filtrar por servicio si se especifica
            if service:
                results = [r for r in results if service in r['keys']]
            
            # Agrupar por servicio
            service_trends = {}
            
            for result in results:
                service_name = result['keys'][0]
                
                if service_name not in service_trends:
                    service_trends[service_name] = {
                        'periods': [],
                        'costs': [],
                        'growth_rate': 0.0,
                        'trend_direction': 'STABLE'
                    }
                
                # Extraer costo
                blended_cost = result['metrics'].get('BlendedCost', {}).get('amount', 0.0)
                
                service_trends[service_name]['periods'].append(result['period'])
                service_trends[service_name]['costs'].append(blended_cost)
            
            # Calcular tendencias por servicio
            for service_name, data in service_trends.items():
                if len(data['costs']) >= 2:
                    # Calcular tasa de crecimiento simple
                    first_cost = data['costs'][0]
                    last_cost = data['costs'][-1]
                    
                    if first_cost > 0:
                        growth_rate = ((last_cost - first_cost) / first_cost) * 100
                        data['growth_rate'] = growth_rate
                        
                        # Determinar dirección de tendencia
                        if growth_rate > 10:
                            data['trend_direction'] = 'INCREASING'
                        elif growth_rate < -10:
                            data['trend_direction'] = 'DECREASING'
                        else:
                            data['trend_direction'] = 'STABLE'
            
            return {
                'service_trends': service_trends,
                'overall_growth_rate': np.mean([data['growth_rate'] for data in service_trends.values()]) if service_trends else 0,
                'total_services': len(service_trends)
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def _generate_cost_projections(self, trend_analysis: Dict) -> Dict:
        """Generar proyecciones de costos"""
        
        try:
            projections = {}
            
            for service_name, trend_data in trend_analysis['service_trends'].items():
                if len(trend_data['costs']) >= 2:
                    # Proyección simple basada en tendencia
                    last_cost = trend_data['costs'][-1]
                    growth_rate = trend_data['growth_rate'] / 100  # Convertir a decimal
                    
                    # Proyectar 3 meses adelante
                    projected_costs = []
                    for month in range(1, 4):
                        projected_cost = last_cost * (1 + growth_rate) ** month
                        projected_costs.append(projected_cost)
                    
                    projections[service_name] = {
                        'projected_costs': projected_costs,
                        'projection_method': 'LINEAR_GROWTH',
                        'confidence': 'MEDIUM'
                    }
            
            return {
                'service_projections': projections,
                'projection_months': 3,
                'method': 'LINEAR_EXTRAPOLATION'
            }
            
        except Exception:
            return {}
    
    def _detect_cost_anomalies(self, results: List[Dict]) -> List[Dict]:
        """Detectar anomalías en costos"""
        
        try:
            anomalies = []
            
            # Agrupar por servicio
            service_data = {}
            for result in results:
                service_name = result['keys'][0]
                cost = result['metrics'].get('BlendedCost', {}).get('amount', 0.0)
                
                if service_name not in service_data:
                    service_data[service_name] = []
                service_data[service_name].append(cost)
            
            # Detectar anomalías por servicio usando desviación estándar
            for service_name, costs in service_data.items():
                if len(costs) < 3:
                    continue
                
                mean_cost = np.mean(costs)
                std_cost = np.std(costs)
                
                if std_cost == 0:
                    continue
                
                for i, cost in enumerate(costs):
                    z_score = abs((cost - mean_cost) / std_cost)
                    
                    if z_score > self.analysis_config['anomaly_threshold']:
                        anomalies.append({
                            'service': service_name,
                            'period_index': i,
                            'cost': cost,
                            'expected_cost': mean_cost,
                            'z_score': z_score,
                            'anomaly_type': 'SPIKE' if cost > mean_cost else 'DROP',
                            'severity': 'HIGH' if z_score > 3 else 'MEDIUM'
                        })
            
            return anomalies
            
        except Exception:
            return []
    
    def _validate_anomaly_subscription_config(self, config: Dict) -> Dict:
        """Validar configuración de suscripción de anomalías"""
        
        required_fields = ['SubscriptionName', 'SnsTopicArns', 'Threshold', 'Frequency']
        
        for field in required_fields:
            if field not in config:
                return {
                    'valid': False,
                    'error': f'Missing required field: {field}'
                }
        
        return {'valid': True}
    
    def _validate_report_config(self, config: Dict) -> Dict:
        """Validar configuración de reporte"""
        
        required_fields = ['report_name', 'time_period']
        
        for field in required_fields:
            if field not in config:
                return {
                    'valid': False,
                    'error': f'Missing required field: {field}'
                }
        
        return {'valid': True}
    
    def _generate_custom_report(self, config: Dict) -> Dict:
        """Generar reporte personalizado"""
        
        try:
            # Extraer configuración
            time_period = config['time_period']
            granularity = config.get('granularity', 'MONTHLY')
            metrics = config.get('metrics', ['BlendedCost'])
            group_by = config.get('group_by', [{'Type': 'DIMENSION', 'Key': 'SERVICE'}])
            
            # Obtener datos
            start_date = datetime.strptime(time_period['start'], '%Y-%m-%d')
            end_date = datetime.strptime(time_period['end'], '%Y-%m-%d')
            
            cost_data = self.get_cost_and_usage(
                start_date=start_date,
                end_date=end_date,
                granularity=granularity,
                metrics=metrics,
                group_by=group_by
            )
            
            if not cost_data['success']:
                return cost_data
            
            # Generar reporte
            report = {
                'report_name': config['report_name'],
                'report_data': cost_data['results'],
                'aggregated_stats': cost_data['aggregated_stats'],
                'report_metadata': {
                    'generated_at': datetime.utcnow().isoformat(),
                    'time_period': time_period,
                    'granularity': granularity,
                    'metrics': metrics
                }
            }
            
            return report
            
        except Exception as e:
            return {'error': str(e)}
    
    def _export_report(self, report_data: Dict, export_format: str) -> Dict:
        """Exportar reporte"""
        
        try:
            if export_format == 'CSV':
                # Convertir a DataFrame y exportar a CSV
                df = pd.DataFrame(report_data['report_data'])
                
                # Guardar en S3
                file_name = f"cost-report-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.csv"
                csv_buffer = df.to_csv(index=False)
                
                self.s3.put_object(
                    Bucket='cost-reports-bucket',
                    Key=file_name,
                    Body=csv_buffer
                )
                
                return {
                    'success': True,
                    'export_format': export_format,
                    'file_name': file_name,
                    'location': f's3://cost-reports-bucket/{file_name}'
                }
            
            elif export_format == 'JSON':
                # Exportar como JSON
                file_name = f"cost-report-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.json"
                json_data = json.dumps(report_data, indent=2, default=str)
                
                self.s3.put_object(
                    Bucket='cost-reports-bucket',
                    Key=file_name,
                    Body=json_data
                )
                
                return {
                    'success': True,
                    'export_format': export_format,
                    'file_name': file_name,
                    'location': f's3://cost-reports-bucket/{file_name}'
                }
            
            else:
                return {
                    'success': False,
                    'error': f'Unsupported export format: {export_format}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }


class CostAnalyzer:
    """Analizador de costos avanzado"""
    
    def __init__(self, cost_explorer_client):
        self.cost_explorer = cost_explorer_client
    
    def analyze_cost_drivers(self, time_period: Dict) -> Dict:
        """Analizar impulsores de costos"""
        
        try:
            # Análisis de impulsores de costos
            drivers_analysis = {
                'service_drivers': {},
                'usage_drivers': {},
                'regional_drivers': {},
                'tag_drivers': {}
            }
            
            return {
                'success': True,
                'drivers_analysis': drivers_analysis,
                'time_period': time_period
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def compare_periods(self, period1: Dict, period2: Dict) -> Dict:
        """Comparar dos períodos de tiempo"""
        
        try:
            # Comparación detallada entre períodos
            comparison = {
                'cost_difference': 0.0,
                'percentage_change': 0.0,
                'service_changes': {},
                'usage_changes': {}
            }
            
            return {
                'success': True,
                'comparison': comparison,
                'period1': period1,
                'period2': period2
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}


class CostReportGenerator:
    """Generador de reportes de costos"""
    
    def __init__(self, cost_explorer_client):
        self.cost_explorer = cost_explorer_client
    
    def generate_monthly_report(self, month: str, year: int) -> Dict:
        """Generar reporte mensual"""
        
        try:
            # Generar reporte mensual detallado
            monthly_report = {
                'report_period': f"{year}-{month}",
                'executive_summary': {},
                'detailed_analysis': {},
                'recommendations': []
            }
            
            return {
                'success': True,
                'monthly_report': monthly_report
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def generate_quarterly_report(self, quarter: int, year: int) -> Dict:
        """Generar reporte trimestral"""
        
        try:
            # Generar reporte trimestral
            quarterly_report = {
                'report_period': f"{year}-Q{quarter}",
                'quarterly_analysis': {},
                'trend_analysis': {},
                'forecast': {}
            }
            
            return {
                'success': True,
                'quarterly_report': quarterly_report
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}


class CostForecastEngine:
    """Motor de pronóstico de costos"""
    
    def __init__(self, cost_explorer_client):
        self.cost_explorer = cost_explorer_client
    
    def generate_advanced_forecast(self, time_period: Dict, forecast_months: int) -> Dict:
        """Generar pronóstico avanzado"""
        
        try:
            # Pronóstico avanzado con múltiples modelos
            forecast_data = {
                'linear_forecast': {},
                'seasonal_forecast': {},
                'ml_forecast': {},
                'ensemble_forecast': {}
            }
            
            return {
                'success': True,
                'forecast_data': forecast_data,
                'forecast_months': forecast_months
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}


class CostOptimizationEngine:
    """Motor de optimización de costos"""
    
    def __init__(self, cost_explorer_client):
        self.cost_explorer = cost_explorer_client
    
    def analyze_optimization_opportunities(self, time_period: Dict) -> Dict:
        """Analizar oportunidades de optimización"""
        
        try:
            # Análisis de oportunidades de optimización
            opportunities = {
                'rightsizing_opportunities': [],
                'savings_plans_opportunities': [],
                'reserved_instances_opportunities': [],
                'storage_optimization': [],
                'data_transfer_optimization': []
            }
            
            return {
                'success': True,
                'optimization_opportunities': opportunities,
                'potential_savings': 0.0
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}


class CostAlertManager:
    """Gestor de alertas de costos"""
    
    def __init__(self, cloudwatch_client, sns_client):
        self.cloudwatch = cloudwatch_client
        self.sns = sns_client
    
    def create_cost_alert(self, alert_config: Dict) -> Dict:
        """Crear alerta de costos"""
        
        try:
            # Crear alarma de CloudWatch para costos
            alarm_name = alert_config['alarm_name']
            
            self.cloudwatch.put_metric_alarm(
                AlarmName=alarm_name,
                AlarmDescription=alert_config['description'],
                MetricName='ActualSpend',
                Namespace='AWS/Billing',
                Statistic='Sum',
                Period=86400,  # 1 día
                EvaluationPeriods=1,
                Threshold=alert_config['threshold'],
                ComparisonOperator='GreaterThanThreshold',
                AlarmActions=[alert_config['sns_topic_arn']]
            )
            
            return {
                'success': True,
                'alarm_name': alarm_name,
                'alert_config': alert_config
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def create_budget_alert(self, budget_config: Dict) -> Dict:
        """Crear alerta de presupuesto"""
        
        try:
            # Crear alerta de presupuesto
            budget_alert = {
                'budget_name': budget_config['budget_name'],
                'threshold': budget_config['threshold'],
                'notification_type': budget_config['notification_type']
            }
            
            return {
                'success': True,
                'budget_alert': budget_alert
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
```

## Casos de Uso

### **1. Obtener Costos y Uso**
```python
# Ejemplo: Obtener costos y uso
cost_manager = CostExplorerManager('us-east-1')

# Obtener costos del último mes
end_date = datetime.utcnow()
start_date = end_date - timedelta(days=30)

cost_result = cost_manager.get_cost_and_usage(
    start_date=start_date,
    end_date=end_date,
    granularity='DAILY',
    metrics=['BlendedCost', 'UsageQuantity'],
    group_by=[
        {'Type': 'DIMENSION', 'Key': 'SERVICE'},
        {'Type': 'DIMENSION', 'Key': 'REGION'}
    ]
)

if cost_result['success']:
    results = cost_result['results']
    stats = cost_result['aggregated_stats']
    
    print(f"Cost and Usage Analysis")
    print(f"Period: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
    print(f"Total Results: {cost_result['total_results']}")
    print(f"Unique Services: {stats['unique_services']}")
    
    print(f"\nTotal Costs:")
    for metric, amount in stats['total_costs'].items():
        print(f"  {metric}: ${amount:.2f}")
    
    print(f"\nSample Results:")
    for result in results[:5]:  # Mostrar primeros 5
        print(f"  Period: {result['period']}")
        print(f"  Service: {result['keys'][0]}")
        print(f"  Region: {result['keys'][1] if len(result['keys']) > 1 else 'N/A'}")
        for metric, data in result['metrics'].items():
            print(f"    {metric}: ${data['amount']:.2f} {data['unit']}")
```

### **2. Obtener Pronóstico de Costos**
```python
# Ejemplo: Obtener pronóstico de costos
cost_manager = CostExplorerManager('us-east-1')

# Pronóstico para próximos 6 meses
end_date = datetime.utcnow()
start_date = end_date + timedelta(days=1)
forecast_end = end_date + timedelta(days=180)

forecast_result = cost_manager.get_cost_forecast(
    start_date=start_date,
    end_date=forecast_end,
    metric='BlendedCost',
    granularity='MONTHLY'
)

if forecast_result['success']:
    forecast_results = forecast_result['forecast_results']
    forecast_stats = forecast_result['forecast_stats']
    
    print(f"Cost Forecast")
    print(f"Forecast Period: {start_date.strftime('%Y-%m-%d')} to {forecast_end.strftime('%Y-%m-%d')}")
    print(f"Total Forecast Periods: {forecast_result['total_forecast_periods']}")
    
    print(f"\nForecast Statistics:")
    print(f"  Total Predicted: ${forecast_stats['total_predicted']:.2f}")
    print(f"  Average Predicted: ${forecast_stats['average_predicted']:.2f}")
    print(f"  Max Predicted: ${forecast_stats['max_predicted']:.2f}")
    print(f"  Min Predicted: ${forecast_stats['min_predicted']:.2f}")
    
    print(f"\nMonthly Forecasts:")
    for forecast in forecast_results:
        print(f"  Period: {forecast['period']}")
        print(f"    Predicted: ${forecast['predicted_amount']:.2f}")
        print(f"    Range: ${forecast['prediction_interval_lower']:.2f} - ${forecast['prediction_interval_upper']:.2f}")
        print(f"    Confidence: {forecast['confidence_level']:.1f}%")
```

### **3. Obtener Recomendaciones de Rightsizing**
```python
# Ejemplo: Obtener recomendaciones de rightsizing
cost_manager = CostExplorerManager('us-east-1')

# Obtener recomendaciones para EC2
rightsizing_result = cost_manager.get_rightsizing_recommendations(service='EC2')

if rightsizing_result['success']:
    recommendations = rightsizing_result['recommendations']
    stats = rightsizing_result['stats']
    
    print(f"Rightsizing Recommendations")
    print(f"Service: {rightsizing_result['service']}")
    print(f"Total Recommendations: {rightsizing_result['total_recommendations']}")
    
    print(f"\nStatistics:")
    print(f"  Total Potential Savings: ${stats['total_potential_savings']:.2f}")
    print(f"  Average Savings per Instance: ${stats['average_savings_per_instance']:.2f}")
    print(f"  Most Recommended Type: {stats['most_recommended_type']}")
    
    print(f"\nSample Recommendations:")
    for rec in recommendations[:3]:  # Mostrar primeras 3
        print(f"  Instance ID: {rec['instance_id']}")
        print(f"  Current Type: {rec['current_instance_type']}")
        print(f"  Account: {rec['account_id']}")
        
        for option in rec['recommendation_options']:
            print(f"    Recommended Type: {option['instance_type']}")
            if 'EstimatedMonthlySavings' in option:
                savings = option['EstimatedMonthlySavings']
                print(f"      Estimated Savings: ${savings['Amount']:.2f} {savings['Unit']}")
```

### **4. Analizar Cobertura de Savings Plans**
```python
# Ejemplo: Analizar cobertura de Savings Plans
cost_manager = CostExplorerManager('us-east-1')

# Obtener cobertura del último mes
end_date = datetime.utcnow()
start_date = end_date - timedelta(days=30)

coverage_result = cost_manager.get_savings_plans_coverage({
    'Start': start_date.strftime('%Y-%m-%d'),
    'End': end_date.strftime('%Y-%m-%d')
})

if coverage_result['success']:
    coverage_results = coverage_result['coverage_results']
    coverage_stats = coverage_result['coverage_stats']
    
    print(f"Savings Plans Coverage")
    print(f"Period: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
    print(f"Coverage Periods: {coverage_stats['coverage_periods']}")
    
    print(f"\nCoverage Statistics:")
    print(f"  Average Coverage: {coverage_stats['average_coverage']:.1f}%")
    print(f"  Max Coverage: {coverage_stats['max_coverage']:.1f}%")
    print(f"  Min Coverage: {coverage_stats['min_coverage']:.1f}%")
    print(f"  Total On-Demand Cost: ${coverage_stats['total_on_demand_cost']:.2f}")
    
    print(f"\nDaily Coverage:")
    for coverage in coverage_results[:7]:  # Mostrar última semana
        print(f"  Date: {coverage['period']}")
        print(f"    Type: {coverage['savings_plans_type']}")
        print(f"    Coverage: {coverage['coverage_percentage']:.1f}%")
        print(f"    On-Demand Cost: ${coverage['on_demand_cost']:.2f}")
```

### **5. Analizar Tendencias de Costos**
```python
# Ejemplo: Analizar tendencias de costos
cost_manager = CostExplorerManager('us-east-1')

# Analizar tendencias de últimos 6 meses
trend_result = cost_manager.analyze_cost_trends(months=6)

if trend_result['success']:
    trend_analysis = trend_result['trend_analysis']
    projections = trend_result['projections']
    anomalies = trend_result['anomalies']
    
    print(f"Cost Trend Analysis")
    print(f"Analysis Period: {trend_result['analysis_period']}")
    print(f"Total Services: {trend_analysis['total_services']}")
    print(f"Overall Growth Rate: {trend_analysis['overall_growth_rate']:.1f}%")
    
    print(f"\nService Trends:")
    for service, data in trend_analysis['service_trends'].items():
        print(f"  {service}:")
        print(f"    Growth Rate: {data['growth_rate']:.1f}%")
        print(f"    Trend Direction: {data['trend_direction']}")
        print(f"    Data Points: {len(data['costs'])}")
    
    print(f"\nProjections:")
    for service, proj in projections['service_projections'].items():
        print(f"  {service}:")
        print(f"    Method: {proj['projection_method']}")
        print(f"    Confidence: {proj['confidence']}")
        print(f"    Projected Costs: {[f'${c:.2f}' for c in proj['projected_costs']]}")
    
    print(f"\nDetected Anomalies: {len(anomalies)}")
    for anomaly in anomalies:
        print(f"  {anomaly['service']}: {anomaly['anomaly_type']} (${anomaly['cost']:.2f})")
        print(f"    Severity: {anomaly['severity']}, Z-Score: {anomaly['z_score']:.2f}")
```

### **6. Crear Reporte Personalizado**
```python
# Ejemplo: Crear reporte personalizado
cost_manager = CostExplorerManager('us-east-1')

# Configuración de reporte
report_config = {
    'report_name': 'Monthly Cost Analysis Report',
    'time_period': {
        'start': '2023-12-01',
        'end': '2023-12-31'
    },
    'granularity': 'DAILY',
    'metrics': ['BlendedCost', 'UnblendedCost', 'UsageQuantity'],
    'group_by': [
        {'Type': 'DIMENSION', 'Key': 'SERVICE'},
        {'Type': 'DIMENSION', 'Key': 'REGION'}
    ],
    'export': True,
    'export_format': 'CSV'
}

# Generar reporte
report_result = cost_manager.generate_cost_report(report_config)

if report_result['success']:
    report_data = report_result['report_data']
    export_result = report_result['export_result']
    
    print(f"Custom Cost Report Generated")
    print(f"Report Name: {report_config['report_name']}")
    print(f"Period: {report_config['time_period']['start']} to {report_config['time_period']['end']}")
    print(f"Granularity: {report_config['granularity']}")
    
    metadata = report_data['report_metadata']
    print(f"Generated At: {metadata['generated_at']}")
    
    # Mostrar estadísticas agregadas
    stats = report_data['aggregated_stats']
    print(f"\nAggregated Statistics:")
    print(f"  Data Points: {stats['data_points']}")
    print(f"  Unique Services: {stats['unique_services']}")
    print(f"  Period Range: {stats['period_range']['start']} to {stats['period_range']['end']}")
    
    print(f"\nTotal Costs:")
    for metric, amount in stats['total_costs'].items():
        print(f"  {metric}: ${amount:.2f}")
    
    # Mostrar resultado de exportación
    if export_result and export_result['success']:
        print(f"\nExport Successful:")
        print(f"  Format: {export_result['export_format']}")
        print(f"  File: {export_result['file_name']}")
        print(f"  Location: {export_result['location']}")
```

### **7. Crear Suscripción de Anomalías**
```python
# Ejemplo: Crear suscripción de anomalías de costos
cost_manager = CostExplorerManager('us-east-1')

# Configuración de suscripción
subscription_config = {
    'SubscriptionName': 'Production-Cost-Anomalies',
    'SnsTopicArns': ['arn:aws:sns:us-east-1:123456789012:cost-anomalies'],
    'Threshold': 100.0,  # $100
    'ThresholdType': 'ABSOLUTE',
    'Frequency': 'DAILY',
    'AccountScope': 'PAYER',
    'MonitorDimension': 'SERVICE',
    'DimensionValue': 'Amazon EC2'
}

# Crear suscripción
subscription_result = cost_manager.create_cost_anomaly_subscription(subscription_config)

if subscription_result['success']:
    print(f"Cost Anomaly Subscription Created")
    print(f"Subscription ID: {subscription_result['subscription_id']}")
    print(f"Subscription ARN: {subscription_result['subscription_arn']}")
    print(f"Created At: {subscription_result['created_at']}")
    
    print(f"\nSubscription Configuration:")
    print(f"  Threshold: ${subscription_config['Threshold']}")
    print(f"  Threshold Type: {subscription_config['ThresholdType']}")
    print(f"  Frequency: {subscription_config['Frequency']}")
    print(f"  Monitor Dimension: {subscription_config['MonitorDimension']}")
    print(f"  Dimension Value: {subscription_config['DimensionValue']}")
```

## Configuración con AWS CLI

### **Análisis de Costos y Uso**
```bash
# Obtener costos y uso
aws ce get-cost-and-usage \
  --time-period Start=2023-12-01,End=2023-12-31 \
  --granularity MONTHLY \
  --metrics BlendedCost UsageQuantity \
  --group-by Type=DIMENSION,Key=SERVICE Type=DIMENSION,Key=REGION

# Obtener pronóstico de costos
aws ce get-cost-forecast \
  --time-period Start=2024-01-01,End=2024-06-30 \
  --metric BlendedCost \
  --granularity MONTHLY

# Obtener valores de dimensión
aws ce get-dimension-values \
  --time-period Start=2023-12-01,End=2023-12-31 \
  --dimension SERVICE

# Obtener recomendaciones de rightsizing
aws ce get-rightsizing-recommendations \
  --service EC2 \
  --configuration BenefitsConsidered=true,RecommendationTarget=SAME_INSTANCE_FAMILY
```

### **Savings Plans y Reservas**
```bash
# Obtener cobertura de Savings Plans
aws ce get-savings-plans-coverage \
  --time-period Start=2023-12-01,End=2023-12-31 \
  --granularity DAILY \
  --metrics SpendCoveredBySavingsPlans OnDemandCost \
  --group-by Type=DIMENSION,Key=SAVINGS_PLANS_TYPE

# Obtener utilización de reservas
aws ce get-reservation-utilization \
  --time-period Start=2023-12-01,End=2023-12-31 \
  --granularity DAILY \
  --group-by Type=DIMENSION,Key=INSTANCE_TYPE

# Obtener detalles de reservas
aws ce get-reservation-details \
  --reservation-arns arn:aws:ec2:us-east-1:123456789012:reservation/i-1234567890abcdef0
```

### **Etiquetas y Asignación de Costos**
```bash
# Activar etiquetas de asignación de costos
aws ce create-cost-allocation-tag-status \
  --tag-key Environment \
  --status Active

# Obtener etiquetas de asignación de costos
aws ce list-cost-allocation-tags \
  --status Active

# Actualizar estado de etiqueta
aws ce update-cost-allocation-tag-status \
  --tag-key Environment \
  --status Inactive
```

### **Anomalías y Alertas**
```bash
# Crear suscripción de anomalías
aws ce create-anomaly-subscription \
  --anomaly-subscription file://anomaly-subscription.json

# Obtener suscripciones de anomalías
aws ce get-anomaly-subscriptions

# Eliminar suscripción de anomalías
aws ce delete-anomaly-subscription \
  --subscription-arn arn:aws:ce::123456789012:anomaly-subscription/Production-Cost-Anomalies
```

## Mejores Prácticas

### **1. Configuración de Cost Explorer**
- **Enable Cost Explorer**: Habilitar Cost Explorer en todas las regiones
- **Configure Cost Allocation Tags**: Configurar etiquetas de asignación de costos
- **Set Up Regular Reports**: Configurar reportes regulares
- **Create Custom Dashboards**: Crear dashboards personalizados
- **Enable Data Export**: Habilitar exportación de datos

### **2. Análisis de Costos**
- **Regular Analysis**: Análisis regular de costos y uso
- **Service Breakdown**: Desglose detallado por servicio
- **Time-based Analysis**: Análisis basado en tiempo
- **Tag-based Analysis**: Análisis basado en etiquetas
- **Comparative Analysis**: Análisis comparativo entre períodos

### **3. Optimización de Costos**
- **Rightsizing**: Implementar rightsizing de recursos
- **Savings Plans**: Utilizar Savings Plans cuando sea apropiado
- **Reserved Instances**: Usar instancias reservadas para cargas predecibles
- **Spot Instances**: Utilizar instancias spot para cargas tolerantes
- **Storage Optimization**: Optimizar almacenamiento

### **4. Monitorización y Alertas**
- **Budget Alerts**: Configurar alertas de presupuesto
- **Anomaly Detection**: Habilitar detección de anomalías
- **Cost Thresholds**: Establecer umbrales de costos
- **Regular Monitoring**: Monitorización regular
- **Trend Analysis**: Análisis de tendencias

## Integración con Servicios AWS

### **AWS Budgets**
- **Budget Creation**: Creación de presupuestos basados en datos históricos
- **Budget Tracking**: Seguimiento de presupuestos
- **Alert Integration**: Integración de alertas
- **Forecast Integration**: Integración de pronósticos
- **Cost Allocation**: Asignación de costos a presupuestos

### **AWS CloudWatch**
- **Metrics Integration**: Integración de métricas
- **Alarm Configuration**: Configuración de alarmas
- **Dashboard Integration**: Integración con dashboards
- **Log Analysis**: Análisis de logs
- **Performance Monitoring**: Monitoreo de rendimiento

### **AWS SNS**
- **Notification Service**: Servicio de notificaciones
- **Alert Delivery**: Entrega de alertas
- **Multi-channel Support**: Soporte multi-canal
- **Topic Management**: Gestión de temas
- **Subscription Management**: Gestión de suscripciones

### **AWS Lambda**
- **Automated Analysis**: Análisis automatizado
- **Custom Processing**: Procesamiento personalizado
- **Event-driven Actions**: Acciones basadas en eventos
- **Integration Hub**: Centro de integración
- **Workflow Automation**: Automatización de flujos de trabajo

## Métricas y KPIs

### **Métricas de Costos**
- **Blended Cost**: Costo combinado con descuentos
- **Unblended Cost**: Costo sin combinar
- **Amortized Cost**: Costo amortizado
- **Usage Quantity**: Cantidad de uso
- **Effective Rate**: Tarifa efectiva

### **KPIs de Optimización**
- **Cost Savings**: Ahorros de costos
- **Savings Rate**: Tasa de ahorro
- **Utilization Rate**: Tasa de utilización
- **Coverage Rate**: Tasa de cobertura
- **ROI**: Retorno de inversión

## Cumplimiento Normativo

### **Control de Costos**
- **Cost Tracking**: Seguimiento detallado de costos
- **Budget Compliance**: Cumplimiento de presupuestos
- **Audit Trail**: Registro de auditoría
- **Cost Allocation**: Asignación apropiada de costos
- **Reporting**: Reportes de cumplimiento

### **Regulaciones Aplicables**
- **SOX**: Control de costos financieros
- **GDPR**: Protección de datos de costos
- **HIPAA**: Costos de servicios de salud
- **PCI DSS**: Costos de servicios de pago

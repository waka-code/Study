# AWS Billing Dashboard

## Definición

AWS Billing Dashboard es una interfaz centralizada que proporciona una visión completa de los costos y el uso de los servicios de AWS. Ofrece herramientas de visualización, análisis, monitoreo y gestión de presupuestos que permiten a las organizaciones entender, controlar y optimizar sus gastos en la nube de manera efectiva.

## Características Principales

### **Visualización de Costos**
- **Cost Overview**: Vista general de costos mensuales
- **Service Breakdown**: Desglose de costos por servicio
- **Time Series Analysis**: Análisis de series temporales
- **Cost Trends**: Tendencias de costos y patrones
- **Interactive Charts**: Gráficos interactivos y personalizables

### **Gestión de Presupuestos**
- **Budget Creation**: Creación de presupuestos personalizados
- **Budget Tracking**: Seguimiento en tiempo real
- **Alert Configuration**: Configuración de alertas de presupuesto
- **Forecast Integration**: Integración con proyecciones
- **Variance Analysis**: Análisis de variaciones

### **Análisis y Reporting**
- **Cost Explorer Integration**: Integración con Cost Explorer
- **Custom Reports**: Reportes personalizados
- **Cost Attribution**: Asignación de costos por departamento
- **Usage Metrics**: Métricas detalladas de uso
- **Export Capabilities**: Exportación a múltiples formatos

### **Control y Optimización**
- **Cost Anomaly Detection**: Detección de anomalías de costos
- **Resource Tagging**: Gestión de etiquetas de recursos
- **Savings Opportunities**: Identificación de oportunidades de ahorro
- **Recommendations Engine**: Motor de recomendaciones
- **Automated Actions**: Acciones automatizadas de optimización

## Componentes del Dashboard

### **Panel Principal**
```
Billing Dashboard Main Panel
├── Cost Overview Section
│   ├── Monthly Total Cost
│   ├── Cost Trend Chart
│   ├── Year-over-Year Comparison
│   └── Budget Status Indicator
├── Service Cost Breakdown
│   ├── Top Services by Cost
│   ├── Service Cost Distribution
│   ├── Usage Metrics
│   └── Cost Drivers Analysis
├── Budget Management
│   ├── Active Budgets
│   ├── Budget Utilization
│   ├── Alert Status
│   └── Forecast vs Actual
└── Quick Actions
    ├── Create Budget
    ├── View Detailed Report
    ├── Export Data
    └── Configure Alerts
```

### **Sección de Análisis Detallado**
```
Detailed Analysis Section
├── Cost Analysis
│   ├── Time Range Selection
│   ├── Granularity Options
│   ├── Grouping Dimensions
│   └── Filter Options
├── Usage Analysis
│   ├── Resource Usage Metrics
│   ├── Usage Patterns
│   ├── Efficiency Metrics
│   └── Utilization Rates
├── Cost Attribution
│   ├── Tag-based Allocation
│   ├── Department Breakdown
│   ├── Project Costing
│   └── Chargeback Reporting
└── Forecasting
    ├── Cost Projections
    ├── Growth Scenarios
    ├── Seasonal Adjustments
    └── Risk Assessment
```

## Implementación Completa del Dashboard

### **Clase Principal del Billing Dashboard**
```python
import boto3
import json
import time
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Union
import matplotlib.pyplot as plt
import seaborn as sns
from dataclasses import dataclass
from enum import Enum
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots

class BillingDashboardManager:
    """Gestor completo del Dashboard de Facturación AWS"""
    
    def __init__(self, region='us-east-1'):
        self.cost_explorer = boto3.client('ce', region_name=region)
        self.budgets = boto3.client('budgets', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.organizations = boto3.client('organizations', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.region = region
        
        # Inicializar componentes
        self.cost_analyzer = CostAnalyzer(self.cost_explorer)
        self.budget_manager = BudgetManager(self.budgets)
        self.visualizer = DashboardVisualizer()
        self.alert_manager = AlertManager(self.cloudwatch, self.sns)
        self.export_manager = ExportManager()
        
        # Caché de datos
        self.data_cache = {}
        self.cache_expiry = {}
    
    def get_dashboard_overview(self, time_range='MONTHLY', start_date=None, end_date=None) -> Dict:
        """Obtener vista general del dashboard"""
        
        try:
            # Determinar rango de tiempo
            if not start_date or not end_date:
                end_date = datetime.utcnow()
                if time_range == 'MONTHLY':
                    start_date = end_date.replace(day=1)
                elif time_range == 'QUARTERLY':
                    quarter = (end_date.month - 1) // 3
                    start_date = datetime(end_date.year, quarter * 3 + 1, 1)
                elif time_range == 'YEARLY':
                    start_date = datetime(end_date.year, 1, 1)
            
            # Obtener datos de costos
            cost_data = self.cost_analyzer.get_cost_overview(
                start_date=start_date,
                end_date=end_date,
                granularity='MONTHLY'
            )
            
            # Obtener datos de presupuestos
            budget_data = self.budget_manager.get_budget_overview()
            
            # Obtener métricas clave
            key_metrics = self._calculate_key_metrics(cost_data, budget_data)
            
            # Generar vista general
            overview = {
                'time_range': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'granularity': time_range
                },
                'cost_summary': cost_data['summary'],
                'budget_summary': budget_data['summary'],
                'key_metrics': key_metrics,
                'alerts': self.alert_manager.get_active_alerts(),
                'recommendations': self._generate_dashboard_recommendations(cost_data, budget_data),
                'generated_at': datetime.utcnow().isoformat()
            }
            
            return {
                'success': True,
                'overview': overview
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_service_cost_breakdown(self, time_range='MONTHLY', top_n=10) -> Dict:
        """Obtener desglose de costos por servicio"""
        
        try:
            # Determinar rango de tiempo
            end_date = datetime.utcnow()
            if time_range == 'MONTHLY':
                start_date = end_date.replace(day=1)
            elif time_range == 'QUARTERLY':
                quarter = (end_date.month - 1) // 3
                start_date = datetime(end_date.year, quarter * 3 + 1, 1)
            else:  # YEARLY
                start_date = datetime(end_date.year, 1, 1)
            
            # Obtener datos de costos por servicio
            service_costs = self.cost_analyzer.get_service_costs(
                start_date=start_date,
                end_date=end_date,
                granularity='MONTHLY'
            )
            
            # Procesar y ordenar servicios
            service_breakdown = []
            for service_data in service_costs['services']:
                service_breakdown.append({
                    'service': service_data['service'],
                    'total_cost': service_data['total_cost'],
                    'cost_percentage': service_data['percentage'],
                    'monthly_trend': service_data['trend'],
                    'usage_metrics': service_data.get('usage_metrics', {}),
                    'cost_drivers': service_data.get('cost_drivers', [])
                })
            
            # Ordenar por costo (descendente)
            service_breakdown.sort(key=lambda x: x['total_cost'], reverse=True)
            
            # Limitar a top_n
            if top_n:
                service_breakdown = service_breakdown[:top_n]
            
            # Calcular métricas adicionales
            total_cost = sum(item['total_cost'] for item in service_breakdown)
            
            return {
                'success': True,
                'service_breakdown': service_breakdown,
                'summary': {
                    'total_services': len(service_breakdown),
                    'total_cost': total_cost,
                    'top_service': service_breakdown[0] if service_breakdown else None,
                    'time_range': time_range
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_budget_analysis(self) -> Dict:
        """Obtener análisis de presupuestos"""
        
        try:
            # Obtener todos los presupuestos
            budgets = self.budget_manager.get_all_budgets()
            
            # Analizar cada presupuesto
            budget_analysis = []
            for budget in budgets['budgets']:
                analysis = self._analyze_single_budget(budget)
                budget_analysis.append(analysis)
            
            # Calcular métricas agregadas
            total_budget_amount = sum(b['budget_amount'] for b in budget_analysis)
            total_actual_cost = sum(b['actual_cost'] for b in budget_analysis)
            total_variance = total_actual_cost - total_budget_amount
            
            aggregated_metrics = {
                'total_budgets': len(budget_analysis),
                'total_budget_amount': total_budget_amount,
                'total_actual_cost': total_actual_cost,
                'total_variance': total_variance,
                'variance_percentage': (total_variance / total_budget_amount * 100) if total_budget_amount > 0 else 0,
                'budgets_on_track': len([b for b in budget_analysis if b['status'] == 'ON_TRACK']),
                'budgets_over_budget': len([b for b in budget_analysis if b['status'] == 'OVER_BUDGET']),
                'budgets_at_risk': len([b for b in budget_analysis if b['status'] == 'AT_RISK'])
            }
            
            return {
                'success': True,
                'budget_analysis': budget_analysis,
                'aggregated_metrics': aggregated_metrics,
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_cost_trends(self, months=12, granularity='MONTHLY') -> Dict:
        """Obtener tendencias de costos"""
        
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=months * 30)
            
            # Obtener datos de tendencias
            trend_data = self.cost_analyzer.get_cost_trends(
                start_date=start_date,
                end_date=end_date,
                granularity=granularity
            )
            
            # Análisis de tendencias
            trend_analysis = self._analyze_trends(trend_data['time_series'])
            
            # Proyecciones
            forecast = self._generate_cost_forecast(trend_data['time_series'])
            
            return {
                'success': True,
                'trend_data': trend_data,
                'trend_analysis': trend_analysis,
                'forecast': forecast,
                'period_analyzed': f"{months} months",
                'granularity': granularity
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_cost_anomaly_detection(self, lookback_days=30) -> Dict:
        """Detectar anomalías en costos"""
        
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=lookback_days)
            
            # Obtener datos históricos
            historical_data = self.cost_analyzer.get_historical_costs(
                start_date=start_date,
                end_date=end_date,
                granularity='DAILY'
            )
            
            # Detectar anomalías
            anomalies = self._detect_cost_anomalies(historical_data['daily_costs'])
            
            # Clasificar anomalías
            anomaly_categories = self._categorize_anomalies(anomalies)
            
            # Generar alertas si es necesario
            alerts_generated = []
            for anomaly in anomalies:
                if anomaly['severity'] in ['HIGH', 'CRITICAL']:
                    alert = self.alert_manager.create_anomaly_alert(anomaly)
                    alerts_generated.append(alert)
            
            return {
                'success': True,
                'anomalies': anomalies,
                'anomaly_categories': anomaly_categories,
                'alerts_generated': alerts_generated,
                'analysis_period': f"{lookback_days} days",
                'detection_threshold': 2.0  # 2 desviaciones estándar
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_cost_optimization_opportunities(self) -> Dict:
        """Identificar oportunidades de optimización de costos"""
        
        try:
            # Obtener datos de uso y costos
            usage_data = self.cost_analyzer.get_usage_metrics()
            cost_data = self.cost_analyzer.get_cost_overview()
            
            # Analizar oportunidades
            opportunities = []
            
            # Oportunidades de EC2
            ec2_opportunities = self._analyze_ec2_optimization(usage_data)
            opportunities.extend(ec2_opportunities)
            
            # Oportunidades de S3
            s3_opportunities = self._analyze_s3_optimization(usage_data)
            opportunities.extend(s3_opportunities)
            
            # Oportunidades de Reserved Instances
            ri_opportunities = self._analyze_reserved_instances(usage_data, cost_data)
            opportunities.extend(ri_opportunities)
            
            # Oportunidades de Storage
            storage_opportunities = self._analyze_storage_optimization(usage_data)
            opportunities.extend(storage_opportunities)
            
            # Calcular impacto potencial
            total_potential_savings = sum(opp['potential_savings'] for opp in opportunities)
            
            # Ordenar por ahorro potencial
            opportunities.sort(key=lambda x: x['potential_savings'], reverse=True)
            
            return {
                'success': True,
                'opportunities': opportunities,
                'summary': {
                    'total_opportunities': len(opportunities),
                    'total_potential_savings': total_potential_savings,
                    'high_priority_opportunities': len([o for o in opportunities if o['priority'] == 'HIGH']),
                    'estimated_implementation_time': sum(o.get('implementation_time_hours', 0) for o in opportunities)
                },
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_custom_dashboard(self, dashboard_config: Dict) -> Dict:
        """Crear dashboard personalizado"""
        
        try:
            # Validar configuración
            validation_result = self._validate_dashboard_config(dashboard_config)
            if not validation_result['valid']:
                return {
                    'success': False,
                    'error': validation_result['error']
                }
            
            # Generar datos para el dashboard
            dashboard_data = self._generate_dashboard_data(dashboard_config)
            
            # Crear visualizaciones
            visualizations = self.visualizer.create_custom_visualizations(
                dashboard_data, dashboard_config['visualizations']
            )
            
            # Compilar dashboard
            custom_dashboard = {
                'dashboard_id': f"custom-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                'name': dashboard_config['name'],
                'description': dashboard_config.get('description', ''),
                'config': dashboard_config,
                'data': dashboard_data,
                'visualizations': visualizations,
                'created_at': datetime.utcnow().isoformat(),
                'refresh_interval': dashboard_config.get('refresh_interval', 3600)  # 1 hora por defecto
            }
            
            return {
                'success': True,
                'dashboard': custom_dashboard
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def export_dashboard_data(self, dashboard_id: str, format_type: str = 'CSV') -> Dict:
        """Exportar datos del dashboard"""
        
        try:
            # Obtener datos del dashboard
            dashboard_data = self._get_dashboard_data(dashboard_id)
            
            if not dashboard_data:
                return {
                    'success': False,
                    'error': 'Dashboard not found'
                }
            
            # Exportar según formato
            if format_type == 'CSV':
                export_result = self.export_manager.export_to_csv(dashboard_data)
            elif format_type == 'JSON':
                export_result = self.export_manager.export_to_json(dashboard_data)
            elif format_type == 'EXCEL':
                export_result = self.export_manager.export_to_excel(dashboard_data)
            else:
                return {
                    'success': False,
                    'error': f'Unsupported format: {format_type}'
                }
            
            return export_result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _calculate_key_metrics(self, cost_data: Dict, budget_data: Dict) -> Dict:
        """Calcular métricas clave"""
        
        try:
            metrics = {}
            
            # Métricas de costos
            metrics['current_month_cost'] = cost_data['summary']['current_month_cost']
            metrics['previous_month_cost'] = cost_data['summary']['previous_month_cost']
            metrics['month_over_month_change'] = (
                (metrics['current_month_cost'] - metrics['previous_month_cost']) / 
                metrics['previous_month_cost'] * 100
            ) if metrics['previous_month_cost'] > 0 else 0
            
            metrics['year_to_date_cost'] = cost_data['summary']['year_to_date_cost']
            metrics['average_monthly_cost'] = cost_data['summary']['average_monthly_cost']
            
            # Métricas de presupuesto
            metrics['total_budget_amount'] = budget_data['summary']['total_budget_amount']
            metrics['budget_utilization'] = (
                (metrics['current_month_cost'] / metrics['total_budget_amount']) * 100
            ) if metrics['total_budget_amount'] > 0 else 0
            
            metrics['budget_variance'] = metrics['current_month_cost'] - metrics['total_budget_amount']
            metrics['budget_status'] = self._determine_budget_status(metrics['budget_utilization'])
            
            # Métricas de eficiencia
            metrics['cost_efficiency_score'] = self._calculate_efficiency_score(cost_data)
            metrics['optimization_potential'] = self._estimate_optimization_potential(cost_data)
            
            return metrics
            
        except Exception as e:
            return {}
    
    def _generate_dashboard_recommendations(self, cost_data: Dict, budget_data: Dict) -> List[Dict]:
        """Generar recomendaciones para el dashboard"""
        
        recommendations = []
        
        # Recomendaciones basadas en costos
        if cost_data['summary']['month_over_month_change'] > 20:
            recommendations.append({
                'type': 'COST_SPIKE',
                'priority': 'HIGH',
                'title': 'Significant Cost Increase Detected',
                'description': f"Costs increased by {cost_data['summary']['month_over_month_change']:.1f}% compared to last month",
                'action': 'Review cost drivers and implement optimization measures',
                'potential_impact': 'HIGH'
            })
        
        # Recomendaciones basadas en presupuesto
        if budget_data['summary']['budget_utilization'] > 90:
            recommendations.append({
                'type': 'BUDGET_RISK',
                'priority': 'HIGH',
                'title': 'Budget Approaching Limit',
                'description': f"Budget utilization is at {budget_data['summary']['budget_utilization']:.1f}%",
                'action': 'Consider increasing budget or implementing cost controls',
                'potential_impact': 'HIGH'
            })
        
        # Recomendaciones de optimización
        if cost_data['summary']['top_service']['service'] == 'Amazon EC2':
            recommendations.append({
                'type': 'OPTIMIZATION',
                'priority': 'MEDIUM',
                'title': 'EC2 Cost Optimization Opportunity',
                'description': 'EC2 is the top cost driver, consider instance optimization',
                'action': 'Review instance types and implement Reserved Instances or Savings Plans',
                'potential_impact': 'MEDIUM'
            })
        
        return recommendations
    
    def _analyze_single_budget(self, budget: Dict) -> Dict:
        """Analizar presupuesto individual"""
        
        try:
            # Obtener costos actuales para el presupuesto
            actual_cost = self.cost_analyzer.get_budget_actual_cost(budget['budget_id'])
            
            # Calcular métricas
            budget_amount = budget['budget_limit']['amount']
            utilized_amount = actual_cost['total_cost']
            variance = utilized_amount - budget_amount
            utilization_percentage = (utilized_amount / budget_amount) * 100 if budget_amount > 0 else 0
            
            # Determinar estado
            if utilization_percentage > 100:
                status = 'OVER_BUDGET'
            elif utilization_percentage > 90:
                status = 'AT_RISK'
            elif utilization_percentage > 75:
                status = 'ON_TRACK'
            else:
                status = 'UNDER_UTILIZED'
            
            return {
                'budget_id': budget['budget_id'],
                'budget_name': budget['budget_name'],
                'budget_amount': budget_amount,
                'actual_cost': utilized_amount,
                'variance': variance,
                'utilization_percentage': utilization_percentage,
                'status': status,
                'remaining_amount': budget_amount - utilized_amount,
                'forecasted_cost': actual_cost.get('forecasted_cost', 0),
                'last_updated': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'budget_id': budget.get('budget_id', 'unknown'),
                'error': str(e)
            }
    
    def _analyze_trends(self, time_series: List[Dict]) -> Dict:
        """Analizar tendencias de costos"""
        
        try:
            if len(time_series) < 2:
                return {
                    'trend': 'INSUFFICIENT_DATA',
                    'growth_rate': 0,
                    'volatility': 0,
                    'seasonality': 'NONE'
                }
            
            # Calcular tasa de crecimiento
            costs = [point['cost'] for point in time_series]
            growth_rates = []
            
            for i in range(1, len(costs)):
                if costs[i-1] > 0:
                    growth_rate = ((costs[i] - costs[i-1]) / costs[i-1]) * 100
                    growth_rates.append(growth_rate)
            
            average_growth_rate = sum(growth_rates) / len(growth_rates) if growth_rates else 0
            
            # Calcular volatilidad
            if len(growth_rates) > 1:
                mean_growth = sum(growth_rates) / len(growth_rates)
                variance = sum((x - mean_growth) ** 2 for x in growth_rates) / len(growth_rates)
                volatility = (variance ** 0.5)
            else:
                volatility = 0
            
            # Determinar tendencia
            if average_growth_rate > 5:
                trend = 'INCREASING'
            elif average_growth_rate < -5:
                trend = 'DECREASING'
            else:
                trend = 'STABLE'
            
            return {
                'trend': trend,
                'average_growth_rate': average_growth_rate,
                'volatility': volatility,
                'growth_volatility': volatility,
                'data_points': len(time_series)
            }
            
        except Exception as e:
            return {
                'trend': 'ERROR',
                'error': str(e)
            }
    
    def _generate_cost_forecast(self, time_series: List[Dict]) -> Dict:
        """Generar pronóstico de costos"""
        
        try:
            if len(time_series) < 3:
                return {
                    'forecast_available': False,
                    'reason': 'Insufficient historical data'
                }
            
            # Método simple: promedio móvil con tendencia
            costs = [point['cost'] for point in time_series]
            
            # Calcular tendencia lineal simple
            x = list(range(len(costs)))
            n = len(costs)
            sum_x = sum(x)
            sum_y = sum(costs)
            sum_xy = sum(x[i] * costs[i] for i in range(n))
            sum_x2 = sum(x[i] ** 2 for i in range(n))
            
            # Calcular pendiente y intercepto
            slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x ** 2)
            intercept = (sum_y - slope * sum_x) / n
            
            # Generar pronóstico para próximos 3 meses
            forecast = []
            for i in range(1, 4):
                future_x = n + i
                forecasted_cost = slope * future_x + intercept
                forecast.append({
                    'period': f"Month +{i}",
                    'forecasted_cost': max(0, forecasted_cost),  # No permitir costos negativos
                    'confidence_interval': {
                        'lower': max(0, forecasted_cost * 0.8),
                        'upper': forecasted_cost * 1.2
                    }
                })
            
            return {
                'forecast_available': True,
                'forecast_periods': forecast,
                'method': 'Linear Regression',
                'confidence_level': 80,
                'historical_data_points': len(time_series)
            }
            
        except Exception as e:
            return {
                'forecast_available': False,
                'error': str(e)
            }
    
    def _detect_cost_anomalies(self, daily_costs: List[Dict]) -> List[Dict]:
        """Detectar anomalías en costos diarios"""
        
        try:
            if len(daily_costs) < 7:
                return []
            
            costs = [day['cost'] for day in daily_costs]
            mean_cost = sum(costs) / len(costs)
            
            # Calcular desviación estándar
            variance = sum((x - mean_cost) ** 2 for x in costs) / len(costs)
            std_dev = variance ** 0.5
            
            # Detectar anomalías (más de 2 desviaciones estándar)
            anomalies = []
            threshold = 2.0
            
            for i, day_data in enumerate(daily_costs):
                cost = day_data['cost']
                z_score = abs((cost - mean_cost) / std_dev) if std_dev > 0 else 0
                
                if z_score > threshold:
                    severity = 'CRITICAL' if z_score > 3 else 'HIGH' if z_score > 2.5 else 'MEDIUM'
                    
                    anomalies.append({
                        'date': day_data['date'],
                        'cost': cost,
                        'expected_cost': mean_cost,
                        'variance': cost - mean_cost,
                        'variance_percentage': ((cost - mean_cost) / mean_cost) * 100 if mean_cost > 0 else 0,
                        'z_score': z_score,
                        'severity': severity,
                        'description': f"Cost {'increased' if cost > mean_cost else 'decreased'} by {abs(variance_percentage):.1f}%"
                    })
            
            return anomalies
            
        except Exception as e:
            return []
    
    def _categorize_anomalies(self, anomalies: List[Dict]) -> Dict:
        """Categorizar anomalías"""
        
        categories = {
            'SPIKES': [],
            'DROPS': [],
            'PATTERNS': [],
            'ISOLATED': []
        }
        
        for anomaly in anomalies:
            if anomaly['variance'] > 0:
                categories['SPIKES'].append(anomaly)
            else:
                categories['DROPS'].append(anomaly)
        
        # Identificar patrones (anomalías consecutivas)
        if len(anomalies) > 1:
            categories['PATTERNS'] = anomalies
        else:
            categories['ISOLATED'] = anomalies
        
        return categories


class CostAnalyzer:
    """Analizador de costos"""
    
    def __init__(self, cost_explorer_client):
        self.cost_explorer = cost_explorer_client
    
    def get_cost_overview(self, start_date: datetime, end_date: datetime, granularity: str) -> Dict:
        """Obtener vista general de costos"""
        
        try:
            response = self.cost_explorer.get_cost_and_usage(
                TimePeriod={
                    'Start': start_date.strftime('%Y-%m-%d'),
                    'End': end_date.strftime('%Y-%m-%d')
                },
                Granularity=granularity,
                Metrics=['BlendedCost', 'UnblendedCost', 'UsageQuantity'],
                GroupBy=[
                    {'Type': 'DIMENSION', 'Key': 'SERVICE'}
                ]
            )
            
            summary = {
                'current_month_cost': 0,
                'previous_month_cost': 0,
                'year_to_date_cost': 0,
                'average_monthly_cost': 0,
                'services': []
            }
            
            total_cost = 0
            for result in response['ResultsByTime']:
                period_start = result['TimePeriod']['Start']
                
                for group in result['Groups']:
                    if 'BlendedCost' in group['Metrics']:
                        cost = float(group['Metrics']['BlendedCost']['Amount'])
                        service = group['Keys'][0]
                        
                        summary['services'].append({
                            'service': service,
                            'cost': cost,
                            'period': period_start
                        })
                        
                        total_cost += cost
            
            summary['current_month_cost'] = total_cost
            
            return {
                'summary': summary,
                'time_series': self._build_time_series(response['ResultsByTime'])
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def get_service_costs(self, start_date: datetime, end_date: datetime, granularity: str) -> Dict:
        """Obtener costos por servicio"""
        
        try:
            response = self.cost_explorer.get_cost_and_usage(
                TimePeriod={
                    'Start': start_date.strftime('%Y-%m-%d'),
                    'End': end_date.strftime('%Y-%m-%d')
                },
                Granularity=granularity,
                Metrics=['BlendedCost'],
                GroupBy=[
                    {'Type': 'DIMENSION', 'Key': 'SERVICE'}
                ]
            )
            
            services = []
            total_cost = 0
            
            for result in response['ResultsByTime']:
                for group in result['Groups']:
                    if 'BlendedCost' in group['Metrics']:
                        cost = float(group['Metrics']['BlendedCost']['Amount'])
                        service = group['Keys'][0]
                        
                        # Buscar si el servicio ya existe
                        existing_service = next((s for s in services if s['service'] == service), None)
                        if existing_service:
                            existing_service['total_cost'] += cost
                        else:
                            services.append({
                                'service': service,
                                'total_cost': cost,
                                'percentage': 0,
                                'trend': 'STABLE',
                                'usage_metrics': {},
                                'cost_drivers': []
                            })
                        
                        total_cost += cost
            
            # Calcular porcentajes
            for service in services:
                service['percentage'] = (service['total_cost'] / total_cost * 100) if total_cost > 0 else 0
            
            # Ordenar por costo
            services.sort(key=lambda x: x['total_cost'], reverse=True)
            
            return {
                'services': services,
                'total_cost': total_cost
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def get_usage_metrics(self) -> Dict:
        """Obtener métricas de uso"""
        
        try:
            # En implementación real, obtendría métricas detalladas de uso
            return {
                'ec2': {
                    'instances_running': 25,
                    'instances_stopped': 5,
                    'average_cpu_utilization': 45.2,
                    'average_memory_utilization': 38.7
                },
                's3': {
                    'total_objects': 150000,
                    'total_storage_gb': 2500,
                    'average_daily_requests': 50000
                },
                'rds': {
                    'instances': 8,
                    'average_cpu_utilization': 35.8,
                    'average_storage_utilization': 62.3
                }
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def get_historical_costs(self, start_date: datetime, end_date: datetime, granularity: str) -> Dict:
        """Obtener costos históricos"""
        
        try:
            response = self.cost_explorer.get_cost_and_usage(
                TimePeriod={
                    'Start': start_date.strftime('%Y-%m-%d'),
                    'End': end_date.strftime('%Y-%m-%d')
                },
                Granularity=granularity,
                Metrics=['BlendedCost']
            )
            
            daily_costs = []
            for result in response['ResultsByTime']:
                if result['Groups']:
                    cost = float(result['Groups'][0]['Metrics']['BlendedCost']['Amount'])
                    daily_costs.append({
                        'date': result['TimePeriod']['Start'],
                        'cost': cost
                    })
            
            return {
                'daily_costs': daily_costs
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def get_cost_trends(self, start_date: datetime, end_date: datetime, granularity: str) -> Dict:
        """Obtener tendencias de costos"""
        
        try:
            response = self.cost_explorer.get_cost_and_usage(
                TimePeriod={
                    'Start': start_date.strftime('%Y-%m-%d'),
                    'End': end_date.strftime('%Y-%m-%d')
                },
                Granularity=granularity,
                Metrics=['BlendedCost'],
                GroupBy=[
                    {'Type': 'DIMENSION', 'Key': 'SERVICE'}
                ]
            )
            
            time_series = []
            for result in response['ResultsByTime']:
                period = result['TimePeriod']['Start']
                total_cost = 0
                
                for group in result['Groups']:
                    if 'BlendedCost' in group['Metrics']:
                        total_cost += float(group['Metrics']['BlendedCost']['Amount'])
                
                time_series.append({
                    'period': period,
                    'cost': total_cost
                })
            
            return {
                'time_series': time_series
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def _build_time_series(self, results: List[Dict]) -> List[Dict]:
        """Construir serie temporal"""
        
        time_series = []
        for result in results:
            period = result['TimePeriod']['Start']
            total_cost = 0
            
            for group in result['Groups']:
                if 'BlendedCost' in group['Metrics']:
                    total_cost += float(group['Metrics']['BlendedCost']['Amount'])
            
            time_series.append({
                'period': period,
                'cost': total_cost
            })
        
        return time_series


class BudgetManager:
    """Gestor de presupuestos"""
    
    def __init__(self, budgets_client):
        self.budgets = budgets_client
    
    def get_budget_overview(self) -> Dict:
        """Obtener vista general de presupuestos"""
        
        try:
            response = self.budgets.describe_budgets(AccountId='123456789012')
            
            budgets = []
            for budget in response['Budgets']:
                budgets.append({
                    'budget_id': budget['BudgetId'],
                    'budget_name': budget['BudgetName'],
                    'budget_amount': budget['BudgetLimit']['Amount'],
                    'unit': budget['BudgetLimit']['Unit'],
                    'time_unit': budget['TimeUnit']
                })
            
            return {
                'budgets': budgets,
                'summary': {
                    'total_budgets': len(budgets),
                    'total_budget_amount': sum(b['budget_amount'] for b in budgets)
                }
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def get_all_budgets(self) -> Dict:
        """Obtener todos los presupuestos"""
        
        try:
            response = self.budgets.describe_budgets(AccountId='123456789012')
            
            budgets = []
            for budget in response['Budgets']:
                budgets.append({
                    'budget_id': budget['BudgetId'],
                    'budget_name': budget['BudgetName'],
                    'budget_limit': budget['BudgetLimit'],
                    'time_unit': budget['TimeUnit'],
                    'time_period': budget['TimePeriod'],
                    'cost_filters': budget.get('CostFilters', {}),
                    'last_updated_time': budget.get('LastUpdatedTime', '').isoformat() if budget.get('LastUpdatedTime') else ''
                })
            
            return {
                'budgets': budgets,
                'summary': {
                    'total_budgets': len(budgets),
                    'total_budget_amount': sum(b['budget_limit']['Amount'] for b in budgets)
                }
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def get_budget_actual_cost(self, budget_id: str) -> Dict:
        """Obtener costo actual del presupuesto"""
        
        try:
            # En implementación real, usaría Cost Explorer para obtener costos actuales
            return {
                'total_cost': 1250.75,
                'forecasted_cost': 1350.00,
                'actual_spend': 1250.75,
                'period_start': datetime.utcnow().replace(day=1).isoformat(),
                'period_end': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {'error': str(e)}


class DashboardVisualizer:
    """Visualizador del dashboard"""
    
    def create_custom_visualizations(self, data: Dict, viz_config: List[Dict]) -> Dict:
        """Crear visualizaciones personalizadas"""
        
        try:
            visualizations = []
            
            for config in viz_config:
                viz_type = config['type']
                
                if viz_type == 'LINE_CHART':
                    viz = self._create_line_chart(data, config)
                elif viz_type == 'BAR_CHART':
                    viz = self._create_bar_chart(data, config)
                elif viz_type == 'PIE_CHART':
                    viz = self._create_pie_chart(data, config)
                elif viz_type == 'AREA_CHART':
                    viz = self._create_area_chart(data, config)
                else:
                    viz = {'type': viz_type, 'error': 'Unsupported visualization type'}
                
                visualizations.append(viz)
            
            return {
                'visualizations': visualizations,
                'total_created': len(visualizations)
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def _create_line_chart(self, data: Dict, config: Dict) -> Dict:
        """Crear gráfico de líneas"""
        
        try:
            # En implementación real, generaría gráfico con plotly
            return {
                'type': 'LINE_CHART',
                'title': config.get('title', 'Cost Trend'),
                'data_source': config.get('data_source', 'cost_trends'),
                'x_axis': config.get('x_axis', 'Time'),
                'y_axis': config.get('y_axis', 'Cost'),
                'series': data.get('time_series', []),
                'config': config
            }
            
        except Exception as e:
            return {'type': 'LINE_CHART', 'error': str(e)}
    
    def _create_bar_chart(self, data: Dict, config: Dict) -> Dict:
        """Crear gráfico de barras"""
        
        try:
            return {
                'type': 'BAR_CHART',
                'title': config.get('title', 'Service Costs'),
                'data_source': config.get('data_source', 'service_costs'),
                'categories': data.get('categories', []),
                'values': data.get('values', []),
                'config': config
            }
            
        except Exception as e:
            return {'type': 'BAR_CHART', 'error': str(e)}
    
    def _create_pie_chart(self, data: Dict, config: Dict) -> Dict:
        """Crear gráfico circular"""
        
        try:
            return {
                'type': 'PIE_CHART',
                'title': config.get('title', 'Cost Distribution'),
                'data_source': config.get('data_source', 'cost_distribution'),
                'labels': data.get('labels', []),
                'values': data.get('values', []),
                'config': config
            }
            
        except Exception as e:
            return {'type': 'PIE_CHART', 'error': str(e)}
    
    def _create_area_chart(self, data: Dict, config: Dict) -> Dict:
        """Crear gráfico de área"""
        
        try:
            return {
                'type': 'AREA_CHART',
                'title': config.get('title', 'Cumulative Cost'),
                'data_source': config.get('data_source', 'cumulative_costs'),
                'x_axis': config.get('x_axis', 'Time'),
                'y_axis': config.get('y_axis', 'Cumulative Cost'),
                'series': data.get('time_series', []),
                'config': config
            }
            
        except Exception as e:
            return {'type': 'AREA_CHART', 'error': str(e)}


class AlertManager:
    """Gestor de alertas"""
    
    def __init__(self, cloudwatch_client, sns_client):
        self.cloudwatch = cloudwatch_client
        self.sns = sns_client
    
    def get_active_alerts(self) -> List[Dict]:
        """Obtener alertas activas"""
        
        try:
            # En implementación real, obtendría alarmas de CloudWatch
            return [
                {
                    'alert_id': 'budget-warning-001',
                    'type': 'BUDGET_WARNING',
                    'severity': 'MEDIUM',
                    'message': 'Budget utilization at 85%',
                    'threshold': 80,
                    'current_value': 85,
                    'created_at': datetime.utcnow().isoformat()
                }
            ]
            
        except Exception as e:
            return []
    
    def create_anomaly_alert(self, anomaly: Dict) -> Dict:
        """Crear alerta de anomalía"""
        
        try:
            alert = {
                'alert_id': f"anomaly-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                'type': 'COST_ANOMALY',
                'severity': anomaly['severity'],
                'message': anomaly['description'],
                'anomaly_data': anomaly,
                'created_at': datetime.utcnow().isoformat()
            }
            
            # En implementación real, crearía alarma de CloudWatch y enviar notificación SNS
            return alert
            
        except Exception as e:
            return {'error': str(e)}


class ExportManager:
    """Gestor de exportación"""
    
    def export_to_csv(self, data: Dict) -> Dict:
        """Exportar a CSV"""
        
        try:
            # En implementación real, generaría archivo CSV
            return {
                'success': True,
                'format': 'CSV',
                'filename': f"billing_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv",
                'size': '2.5KB',
                'records': len(data.get('records', []))
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def export_to_json(self, data: Dict) -> Dict:
        """Exportar a JSON"""
        
        try:
            return {
                'success': True,
                'format': 'JSON',
                'filename': f"billing_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json",
                'size': '5.2KB'
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def export_to_excel(self, data: Dict) -> Dict:
        """Exportar a Excel"""
        
        try:
            return {
                'success': True,
                'format': 'EXCEL',
                'filename': f"billing_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsx",
                'size': '15.8KB',
                'worksheets': len(data.get('worksheets', {}))
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
```

## Casos de Uso

### **1. Obtener Vista General del Dashboard**
```python
# Ejemplo: Obtener vista general del dashboard
dashboard = BillingDashboardManager('us-east-1')

# Obtener vista general
overview_result = dashboard.get_dashboard_overview(time_range='MONTHLY')

if overview_result['success']:
    overview = overview_result['overview']
    
    print(f"Billing Dashboard Overview")
    print(f"Time Range: {overview['time_range']['granularity']}")
    print(f"Generated: {overview['generated_at']}")
    
    # Métricas clave
    metrics = overview['key_metrics']
    print(f"\nKey Metrics:")
    print(f"  Current Month Cost: ${metrics['current_month_cost']:.2f}")
    print(f"  Month-over-Month Change: {metrics['month_over_month_change']:.1f}%")
    print(f"  Budget Utilization: {metrics['budget_utilization']:.1f}%")
    print(f"  Budget Status: {metrics['budget_status']}")
    
    # Resumen de costos
    cost_summary = overview['cost_summary']
    print(f"\nCost Summary:")
    print(f"  Current Month: ${cost_summary['current_month_cost']:.2f}")
    
    # Alertas activas
    alerts = overview['alerts']
    print(f"\nActive Alerts: {len(alerts)}")
    for alert in alerts:
        print(f"  [{alert['severity']}] {alert['message']}")
    
    # Recomendaciones
    recommendations = overview['recommendations']
    print(f"\nRecommendations: {len(recommendations)}")
    for rec in recommendations:
        print(f"  [{rec['priority']}] {rec['title']}")
        print(f"    {rec['description']}")
```

### **2. Análisis de Costos por Servicio**
```python
# Ejemplo: Analizar costos por servicio
dashboard = BillingDashboardManager('us-east-1')

# Obtener desglose de servicios
service_result = dashboard.get_service_cost_breakdown(time_range='MONTHLY', top_n=10)

if service_result['success']:
    breakdown = service_result['service_breakdown']
    summary = service_result['summary']
    
    print(f"Service Cost Breakdown")
    print(f"Total Services: {summary['total_services']}")
    print(f"Total Cost: ${summary['total_cost']:.2f}")
    print(f"Top Service: {summary['top_service']['service']}")
    
    print(f"\nTop 10 Services by Cost:")
    for i, service in enumerate(breakdown, 1):
        print(f"  {i}. {service['service']}")
        print(f"     Cost: ${service['total_cost']:.2f}")
        print(f"     Percentage: {service['cost_percentage']:.1f}%")
        print(f"     Trend: {service['monthly_trend']}")
```

### **3. Análisis de Presupuestos**
```python
# Ejemplo: Analizar presupuestos
dashboard = BillingDashboardManager('us-east-1')

# Obtener análisis de presupuestos
budget_result = dashboard.get_budget_analysis()

if budget_result['success']:
    analysis = budget_result['budget_analysis']
    aggregated = budget_result['aggregated_metrics']
    
    print(f"Budget Analysis")
    print(f"Total Budgets: {aggregated['total_budgets']}")
    print(f"Total Budget Amount: ${aggregated['total_budget_amount']:.2f}")
    print(f"Total Actual Cost: ${aggregated['total_actual_cost']:.2f}")
    print(f"Total Variance: ${aggregated['total_variance']:.2f}")
    print(f"Variance Percentage: {aggregated['variance_percentage']:.1f}%")
    
    print(f"\nBudget Status:")
    print(f"  On Track: {aggregated['budgets_on_track']}")
    print(f"  Over Budget: {aggregated['budgets_over_budget']}")
    print(f"  At Risk: {aggregated['budgets_at_risk']}")
    
    print(f"\nIndividual Budgets:")
    for budget in analysis:
        if 'error' not in budget:
            print(f"  {budget['budget_name']}:")
            print(f"    Budget: ${budget['budget_amount']:.2f}")
            print(f"    Actual: ${budget['actual_cost']:.2f}")
            print(f"    Status: {budget['status']}")
            print(f"    Utilization: {budget['utilization_percentage']:.1f}%")
```

### **4. Detección de Anomalías**
```python
# Ejemplo: Detectar anomalías en costos
dashboard = BillingDashboardManager('us-east-1')

# Detectar anomalías
anomaly_result = dashboard.get_cost_anomaly_detection(lookback_days=30)

if anomaly_result['success']:
    anomalies = anomaly_result['anomalies']
    categories = anomaly_result['anomaly_categories']
    
    print(f"Cost Anomaly Detection")
    print(f"Analysis Period: {anomaly_result['analysis_period']}")
    print(f"Detection Threshold: {anomaly_result['detection_threshold']} standard deviations")
    
    print(f"\nAnomalies Detected: {len(anomalies)}")
    for anomaly in anomalies:
        print(f"  Date: {anomaly['date']}")
        print(f"  Cost: ${anomaly['cost']:.2f}")
        print(f"  Expected: ${anomaly['expected_cost']:.2f}")
        print(f"  Variance: {anomaly['variance_percentage']:.1f}%")
        print(f"  Severity: {anomaly['severity']}")
        print(f"  Description: {anomaly['description']}")
    
    print(f"\nAnomaly Categories:")
    for category, items in categories.items():
        print(f"  {category}: {len(items)} anomalies")
```

### **5. Oportunidades de Optimización**
```python
# Ejemplo: Identificar oportunidades de optimización
dashboard = BillingDashboardManager('us-east-1')

# Obtener oportunidades de optimización
optimization_result = dashboard.get_cost_optimization_opportunities()

if optimization_result['success']:
    opportunities = optimization_result['opportunities']
    summary = optimization_result['summary']
    
    print(f"Cost Optimization Opportunities")
    print(f"Total Opportunities: {summary['total_opportunities']}")
    print(f"Potential Savings: ${summary['total_potential_savings']:.2f}")
    print(f"High Priority: {summary['high_priority_opportunities']}")
    print(f"Implementation Time: {summary['estimated_implementation_time']} hours")
    
    print(f"\nTop 10 Opportunities:")
    for i, opportunity in enumerate(opportunities[:10], 1):
        print(f"  {i}. [{opportunity['priority']}] {opportunity['title']}")
        print(f"     Potential Savings: ${opportunity['potential_savings']:.2f}")
        print(f"     Implementation Time: {opportunity.get('implementation_time_hours', 0)} hours")
        print(f"     Description: {opportunity['description']}")
```

### **6. Crear Dashboard Personalizado**
```python
# Ejemplo: Crear dashboard personalizado
dashboard = BillingDashboardManager('us-east-1')

# Configuración de dashboard personalizado
custom_config = {
    'name': 'Executive Cost Dashboard',
    'description': 'High-level cost overview for executive team',
    'refresh_interval': 1800,  # 30 minutos
    'visualizations': [
        {
            'type': 'LINE_CHART',
            'title': 'Monthly Cost Trend',
            'data_source': 'cost_trends',
            'x_axis': 'Time',
            'y_axis': 'Cost'
        },
        {
            'type': 'PIE_CHART',
            'title': 'Cost Distribution by Service',
            'data_source': 'service_costs'
        },
        {
            'type': 'BAR_CHART',
            'title': 'Budget Utilization',
            'data_source': 'budget_analysis'
        }
    ]
}

# Crear dashboard personalizado
dashboard_result = dashboard.create_custom_dashboard(custom_config)

if dashboard_result['success']:
    custom_dashboard = dashboard_result['dashboard']
    
    print(f"Custom Dashboard Created")
    print(f"Dashboard ID: {custom_dashboard['dashboard_id']}")
    print(f"Name: {custom_dashboard['name']}")
    print(f"Created: {custom_dashboard['created_at']}")
    print(f"Refresh Interval: {custom_dashboard['refresh_interval']} seconds")
    
    print(f"\nVisualizations: {len(custom_dashboard['visualizations'])}")
    for viz in custom_dashboard['visualizations']:
        print(f"  {viz['type']}: {viz['title']}")
```

### **7. Exportar Datos del Dashboard**
```python
# Ejemplo: Exportar datos del dashboard
dashboard = BillingDashboardManager('us-east-1')

# Exportar a diferentes formatos
formats = ['CSV', 'JSON', 'EXCEL']
dashboard_id = 'custom-20231201143000'

for format_type in formats:
    export_result = dashboard.export_dashboard_data(dashboard_id, format_type)
    
    if export_result['success']:
        print(f"Export to {format_type}:")
        print(f"  Filename: {export_result['filename']}")
        print(f"  Size: {export_result['size']}")
        if 'records' in export_result:
            print(f"  Records: {export_result['records']}")
```

## Configuración y Uso

### **Instalación y Configuración**
```bash
# Instalar dependencias
pip install boto3 pandas numpy matplotlib seaborn plotly

# Configurar credenciales de AWS
aws configure

# Crear rol IAM con permisos necesarios
aws iam create-role --role-name BillingDashboardRole \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy --role-name BillingDashboardRole \
  --policy-arn arn:aws:iam::aws:policy/AWSBillingReadOnly
```

### **Uso Básico**
```python
# Importar y configurar
from billing_dashboard import BillingDashboardManager

dashboard = BillingDashboardManager('us-east-1')

# Obtener vista general
overview = dashboard.get_dashboard_overview()
```

### **Configuración de Alertas**
```python
# Configurar alertas de presupuesto
dashboard.alert_manager.create_budget_alert(
    budget_id='budget-001',
    threshold=80,
    notification_email='admin@company.com'
)
```

## Mejores Prácticas

### **1. Diseño del Dashboard**
- **Executive View**: Vista ejecutiva clara y concisa
- **Drill-down Capability**: Capacidad de análisis detallado
- **Real-time Data**: Datos en tiempo real o casi real-time
- **Interactive Elements**: Elementos interactivos y filtros
- **Mobile Responsive**: Diseño responsivo para móviles

### **2. Gestión de Datos**
- **Data Freshness**: Datos frescos y actualizados
- **Data Accuracy**: Precisión y validación de datos
- **Historical Context**: Contexto histórico para análisis
- **Data Aggregation**: Agregación apropiada de datos
- **Performance Optimization**: Optimización de rendimiento

### **3. Alertas y Notificaciones**
- **Threshold Configuration**: Configuración adecuada de umbrales
- **Alert Fatigue Prevention**: Evitar fatiga de alertas
- **Actionable Alerts**: Alertas accionables
- **Escalation Rules**: Reglas de escalado
- **Multi-channel Notifications**: Notificaciones multi-canal

### **4. Seguridad y Cumplimiento**
- **Access Control**: Control de acceso basado en roles
- **Data Encryption**: Cifrado de datos sensibles
- **Audit Logging**: Registro de auditoría completo
- **Compliance Reporting**: Reportes de cumplimiento
- **Data Retention**: Políticas de retención de datos

## Integración con Servicios AWS

### **AWS Cost Explorer**
- **Data Source**: Fuente principal de datos de costos
- **Custom Queries**: Consultas personalizadas
- **Cost Allocation**: Asignación de costos
- **Forecasting**: Proyección de costos
- **Anomaly Detection**: Detección de anomalías

### **AWS Budgets**
- **Budget Management**: Gestión de presupuestos
- **Alert Integration**: Integración de alertas
- **Forecast Integration**: Integración de proyecciones
- **Cost Controls**: Controles de costos
- **Reporting**: Reportes de presupuestos

### **AWS CloudWatch**
- **Metrics Collection**: Recopilación de métricas
- **Alarm Configuration**: Configuración de alarmas
- **Dashboard Integration**: Integración con dashboards
- **Log Analysis**: Análisis de logs
- **Performance Monitoring**: Monitoreo de rendimiento

### **AWS SNS**
- **Notification Service**: Servicio de notificaciones
- **Multi-channel Delivery**: Entrega multi-canal
- **Message Filtering**: Filtrado de mensajes
- **Topic Management**: Gestión de temas
- **Subscription Management**: Gestión de suscripciones

## Métricas y KPIs

### **Métricas de Costos**
- **Total Cost**: Costo total mensual
- **Cost Growth Rate**: Tasa de crecimiento de costos
- **Cost per Service**: Costo por servicio
- **Cost per User**: Costo por usuario
- **Cost Variance**: Varianza de costos

### **KPIs de Presupuesto**
- **Budget Utilization**: Utilización del presupuesto
- **Budget Variance**: Varianza del presupuesto
- **Forecast Accuracy**: Precisión de proyecciones
- **Alert Response Time**: Tiempo de respuesta a alertas
- **Budget Compliance**: Cumplimiento del presupuesto

### **KPIs de Optimización**
- **Savings Achieved**: Ahorros realizados
- **Optimization Rate**: Tasa de optimización
- **Implementation Time**: Tiempo de implementación
- **ROI**: Retorno de inversión
- **Cost Efficiency**: Eficiencia de costos

## Cumplimiento Normativo

### **Control de Costos**
- **Budget Enforcement**: Cumplimiento de presupuestos
- **Cost Tracking**: Seguimiento detallado de costos
- **Audit Trail**: Registro de auditoría
- **Compliance Reporting**: Reportes de cumplimiento
- **Data Protection**: Protección de datos de costos

### **Regulaciones Aplicables**
- **SOX**: Control de costos financieros
- **GDPR**: Protección de datos de costos
- **HIPAA**: Costos de servicios de salud
- **PCI DSS**: Costos de servicios de pago

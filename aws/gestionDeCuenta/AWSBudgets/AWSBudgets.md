# AWS Budgets

## Definición

AWS Budgets es un servicio que permite a las organizaciones planificar, gestionar y controlar sus gastos en la nube AWS. Proporciona herramientas para crear presupuestos personalizados, configurar alertas, realizar seguimiento del uso de recursos y optimizar costos mediante análisis detallados y recomendaciones automatizadas.

## Características Principales

### **Gestión de Presupuestos**
- **Budget Creation**: Creación de presupuestos personalizados por servicio, dimensión o etiqueta
- **Budget Templates**: Plantillas de presupuestos predefinidos
- **Budget Types**: Múltiples tipos de presupuestos (costo, uso, reserva, ahorro)
- **Budget Periods**: Períodos de presupuesto personalizables (mensual, trimestral, anual)
- **Budget Adjustments**: Ajustes dinámicos de presupuestos

### **Alertas y Notificaciones**
- **Threshold Alerts**: Alertas basadas en umbrales de uso o costo
- **Forecast Alerts**: Alertas basadas en proyecciones de costos
- **Anomaly Alerts**: Alertas para anomalías de costos
- **Multi-channel Notifications**: Notificaciones por email, SNS, Slack
- **Escalation Rules**: Reglas de escalado de alertas

### **Análisis y Reportes**
- **Budget Utilization**: Análisis detallado de utilización de presupuestos
- **Cost Analysis**: Análisis de costos por dimensión y etiqueta
- **Trend Analysis**: Análisis de tendencias de costos y uso
- **Variance Analysis**: Análisis de variaciones contra presupuesto
- **Custom Reports**: Reportes personalizados y exportables

### **Optimización de Costos**
- **Cost Recommendations**: Recomendaciones automáticas de optimización
- **Savings Opportunities**: Identificación de oportunidades de ahorro
- **Resource Optimization**: Optimización de uso de recursos
- **Rightsizing Suggestions**: Sugerencias de dimensionamiento correcto
- **Purchase Recommendations**: Recomendaciones de compra (Reserved Instances, Savings Plans)

## Tipos de Presupuestos

### **Cost Budgets**
```
Cost Budgets Structure
├── Budget Configuration
│   ├── Budget Type: COST
│   ├── Time Unit: MONTHLY/QUARTERLY/ANNUALLY
│   ├── Budget Amount: $10,000
│   ├── Time Period: Jan 1 - Dec 31
│   └── Currency: USD
├── Cost Filters
│   ├── Service: Amazon EC2
│   ├── Operation: RunInstance
│   ├── Usage Type: BoxUsage
│   ├── Linked Account: 123456789012
│   └── Tags: Environment=Production
└── Notification Configuration
    ├── Threshold: 80%, 90%, 100%
    ├── Notification Type: ACTUAL/FORECASTED
    ├── Subscribers: email@example.com
    └── SNS Topic: arn:aws:sns:...
```

### **Usage Budgets**
```
Usage Budgets Structure
├── Budget Configuration
│   ├── Budget Type: USAGE
│   ├── Time Unit: MONTHLY
│   ├── Budget Amount: 1000 GB
│   ├── Service: Amazon S3
│   └── Usage Type: TimedStorage
├── Usage Filters
│   ├── Service: Amazon S3
│   ├── Usage Type: TimedStorage
│   ├── Operation: PutObject
│   └── Storage Class: Standard
└── Notification Configuration
    ├── Threshold: 75%, 90%, 100%
    ├── Notification Type: ACTUAL
    └── Subscribers: ops@example.com
```

### **RI Utilization Budgets**
```
RI Utilization Budgets Structure
├── Budget Configuration
│   ├── Budget Type: RI_UTILIZATION
│   ├── Time Unit: MONTHLY
│   ├── Budget Amount: 80%
│   └── RI Type: EC2
├── RI Filters
│   ├── Instance Type: t3.medium
│   ├── Platform: Linux
│   ├── Tenancy: Shared
│   └── Region: us-east-1
└── Notification Configuration
    ├── Threshold: 70%, 80%, 90%
    ├── Notification Type: ACTUAL
    └── Subscribers: finance@example.com
```

## Configuración de AWS Budgets

### **Gestión Completa de AWS Budgets**
```python
import boto3
import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Union
from dataclasses import dataclass
from enum import Enum

class AWSBudgetsManager:
    """Gestor completo de AWS Budgets"""
    
    def __init__(self, region='us-east-1'):
        self.budgets = boto3.client('budgets', region_name=region)
        self.cost_explorer = boto3.client('ce', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.organizations = boto3.client('organizations', region_name=region)
        self.region = region
        self.account_id = boto3.client('sts').get_caller_identity()['Account']
        
        # Inicializar componentes
        self.budget_analyzer = BudgetAnalyzer(self.cost_explorer)
        self.alert_manager = BudgetAlertManager(self.cloudwatch, self.sns)
        self.optimization_engine = BudgetOptimizationEngine(self.cost_explorer)
        self.report_generator = BudgetReportGenerator(self.budgets, self.cost_explorer)
    
    def create_cost_budget(self, budget_config: Dict) -> Dict:
        """Crear presupuesto de costos"""
        
        try:
            # Validar configuración
            validation_result = self._validate_budget_config(budget_config, 'COST')
            if not validation_result['valid']:
                return {
                    'success': False,
                    'error': validation_result['error']
                }
            
            # Construir configuración del presupuesto
            budget_request = self._build_cost_budget_request(budget_config)
            
            # Crear presupuesto
            response = self.budgets.create_budget(
                AccountId=self.account_id,
                Budget=budget_request
            )
            
            # Configurar notificaciones
            notifications_configured = []
            for notification in budget_config.get('notifications', []):
                notification_result = self._create_budget_notification(
                    budget_config['budget_name'], notification
                )
                if notification_result['success']:
                    notifications_configured.append(notification_result['notification_id'])
            
            return {
                'success': True,
                'budget_id': response['Budget']['BudgetId'],
                'budget_name': budget_config['budget_name'],
                'budget_type': 'COST',
                'amount': budget_config['budget_amount'],
                'currency': budget_config.get('currency', 'USD'),
                'time_unit': budget_config.get('time_unit', 'MONTHLY'),
                'notifications_configured': len(notifications_configured),
                'created_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_usage_budget(self, budget_config: Dict) -> Dict:
        """Crear presupuesto de uso"""
        
        try:
            # Validar configuración
            validation_result = self._validate_budget_config(budget_config, 'USAGE')
            if not validation_result['valid']:
                return {
                    'success': False,
                    'error': validation_result['error']
                }
            
            # Construir configuración del presupuesto
            budget_request = self._build_usage_budget_request(budget_config)
            
            # Crear presupuesto
            response = self.budgets.create_budget(
                AccountId=self.account_id,
                Budget=budget_request
            )
            
            # Configurar notificaciones
            notifications_configured = []
            for notification in budget_config.get('notifications', []):
                notification_result = self._create_budget_notification(
                    budget_config['budget_name'], notification
                )
                if notification_result['success']:
                    notifications_configured.append(notification_result['notification_id'])
            
            return {
                'success': True,
                'budget_id': response['Budget']['BudgetId'],
                'budget_name': budget_config['budget_name'],
                'budget_type': 'USAGE',
                'amount': budget_config['budget_amount'],
                'unit': budget_config.get('usage_unit', 'GB'),
                'time_unit': budget_config.get('time_unit', 'MONTHLY'),
                'notifications_configured': len(notifications_configured),
                'created_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_ri_utilization_budget(self, budget_config: Dict) -> Dict:
        """Crear presupuesto de utilización de Reserved Instances"""
        
        try:
            # Validar configuración
            validation_result = self._validate_budget_config(budget_config, 'RI_UTILIZATION')
            if not validation_result['valid']:
                return {
                    'success': False,
                    'error': validation_result['error']
                }
            
            # Construir configuración del presupuesto
            budget_request = self._build_ri_budget_request(budget_config)
            
            # Crear presupuesto
            response = self.budgets.create_budget(
                AccountId=self.account_id,
                Budget=budget_request
            )
            
            # Configurar notificaciones
            notifications_configured = []
            for notification in budget_config.get('notifications', []):
                notification_result = self._create_budget_notification(
                    budget_config['budget_name'], notification
                )
                if notification_result['success']:
                    notifications_configured.append(notification_result['notification_id'])
            
            return {
                'success': True,
                'budget_id': response['Budget']['BudgetId'],
                'budget_name': budget_config['budget_name'],
                'budget_type': 'RI_UTILIZATION',
                'utilization_target': budget_config['utilization_target'],
                'time_unit': budget_config.get('time_unit', 'MONTHLY'),
                'notifications_configured': len(notifications_configured),
                'created_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_budget(self, budget_name: str) -> Dict:
        """Describir presupuesto existente"""
        
        try:
            response = self.budgets.describe_budget(
                AccountId=self.account_id,
                BudgetName=budget_name
            )
            
            budget = response['Budget']
            
            # Extraer información del presupuesto
            budget_info = {
                'budget_id': budget['BudgetId'],
                'budget_name': budget['BudgetName'],
                'budget_type': budget['BudgetType'],
                'time_unit': budget['TimeUnit'],
                'time_period': budget['TimePeriod'],
                'budget_limit': budget['BudgetLimit'],
                'cost_filters': budget.get('CostFilters', {}),
                'last_updated_time': budget.get('LastUpdatedTime', '').isoformat() if budget.get('LastUpdatedTime') else '',
                'calculated_spend': budget.get('CalculatedSpend', {}),
                'budget_state': budget.get('BudgetState', 'PRESENT')
            }
            
            return {
                'success': True,
                'budget': budget_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_budgets(self, max_results: int = 50) -> Dict:
        """Listar todos los presupuestos"""
        
        try:
            response = self.budgets.describe_budgets(
                AccountId=self.account_id,
                MaxResults=max_results
            )
            
            budgets = []
            for budget in response['Budgets']:
                budget_info = {
                    'budget_id': budget['BudgetId'],
                    'budget_name': budget['BudgetName'],
                    'budget_type': budget['BudgetType'],
                    'time_unit': budget['TimeUnit'],
                    'budget_amount': budget['BudgetLimit']['Amount'],
                    'currency': budget['BudgetLimit'].get('Unit', 'USD'),
                    'last_updated': budget.get('LastUpdatedTime', '').isoformat() if budget.get('LastUpdatedTime') else ''
                }
                budgets.append(budget_info)
            
            return {
                'success': True,
                'budgets': budgets,
                'count': len(budgets),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_budget(self, budget_name: str, updates: Dict) -> Dict:
        """Actualizar presupuesto existente"""
        
        try:
            # Obtener presupuesto actual
            current_budget = self.describe_budget(budget_name)
            if not current_budget['success']:
                return current_budget
            
            # Aplicar actualizaciones
            updated_budget = current_budget['budget']
            
            # Actualizar límite del presupuesto
            if 'budget_amount' in updates:
                updated_budget['budget_limit']['Amount'] = str(updates['budget_amount'])
            
            # Actualizar filtros de costos
            if 'cost_filters' in updates:
                updated_budget['cost_filters'] = updates['cost_filters']
            
            # Construir solicitud de actualización
            update_request = {
                'BudgetId': updated_budget['budget_id'],
                'BudgetName': updated_budget['budget_name'],
                'BudgetType': updated_budget['budget_type'],
                'TimeUnit': updated_budget['time_unit'],
                'BudgetLimit': updated_budget['budget_limit'],
                'TimePeriod': updated_budget['time_period']
            }
            
            if updated_budget['cost_filters']:
                update_request['CostFilters'] = updated_budget['cost_filters']
            
            # Actualizar presupuesto
            response = self.budgets.modify_budget(
                AccountId=self.account_id,
                NewBudget=update_request
            )
            
            return {
                'success': True,
                'budget_id': response['Budget']['BudgetId'],
                'budget_name': budget_name,
                'updates_applied': list(updates.keys()),
                'updated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_budget(self, budget_name: str) -> Dict:
        """Eliminar presupuesto"""
        
        try:
            response = self.budgets.delete_budget(
                AccountId=self.account_id,
                BudgetName=budget_name
            )
            
            return {
                'success': True,
                'budget_name': budget_name,
                'deleted_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_budget_performance(self, budget_name: str, time_period: str = 'MONTHLY') -> Dict:
        """Obtener rendimiento del presupuesto"""
        
        try:
            # Obtener detalles del presupuesto
            budget_details = self.describe_budget(budget_name)
            if not budget_details['success']:
                return budget_details
            
            budget = budget_details['budget']
            
            # Obtener datos de rendimiento
            performance_data = self.budget_analyzer.get_budget_performance(
                budget_name, budget['budget_type'], time_period
            )
            
            if not performance_data['success']:
                return performance_data
            
            # Calcular métricas de rendimiento
            performance_metrics = self._calculate_budget_metrics(
                budget, performance_data['data']
            )
            
            return {
                'success': True,
                'budget_name': budget_name,
                'budget_type': budget['budget_type'],
                'performance_data': performance_data['data'],
                'metrics': performance_metrics,
                'analysis_period': time_period,
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_budget_trends(self, budget_name: str, months: int = 6) -> Dict:
        """Analizar tendencias del presupuesto"""
        
        try:
            # Obtener datos históricos
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=months * 30)
            
            trend_data = self.budget_analyzer.get_budget_trends(
                budget_name, start_date, end_date
            )
            
            if not trend_data['success']:
                return trend_data
            
            # Analizar tendencias
            trend_analysis = self._analyze_trends(trend_data['data'])
            
            # Generar proyecciones
            forecast = self._generate_budget_forecast(trend_data['data'])
            
            return {
                'success': True,
                'budget_name': budget_name,
                'trend_data': trend_data['data'],
                'trend_analysis': trend_analysis,
                'forecast': forecast,
                'analysis_period': f"{months} months",
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_budget_template(self, template_config: Dict) -> Dict:
        """Crear plantilla de presupuesto"""
        
        try:
            # Validar configuración de plantilla
            validation_result = self._validate_template_config(template_config)
            if not validation_result['valid']:
                return {
                    'success': False,
                    'error': validation_result['error']
                }
            
            # Generar plantilla
            template = {
                'template_id': f"template-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                'template_name': template_config['template_name'],
                'template_type': template_config['template_type'],
                'description': template_config.get('description', ''),
                'budget_configuration': template_config['budget_configuration'],
                'notification_configuration': template_config.get('notification_configuration', {}),
                'best_practices': template_config.get('best_practices', {}),
                'created_at': datetime.utcnow().isoformat(),
                'created_by': template_config.get('created_by', 'system')
            }
            
            # Guardar plantilla (en implementación real, guardar en S3 o DynamoDB)
            return {
                'success': True,
                'template': template
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def apply_budget_template(self, template_id: str, application_config: Dict) -> Dict:
        """Aplicar plantilla de presupuesto"""
        
        try:
            # Obtener plantilla
            template = self._get_budget_template(template_id)
            if not template:
                return {
                    'success': False,
                    'error': 'Template not found'
                }
            
            # Aplicar configuración de la plantilla
            budget_config = template['budget_configuration'].copy()
            
            # Sobrescribir con configuración de aplicación
            for key, value in application_config.items():
                if key in budget_config:
                    budget_config[key] = value
            
            # Crear presupuesto basado en plantilla
            if template['template_type'] == 'COST':
                result = self.create_cost_budget(budget_config)
            elif template['template_type'] == 'USAGE':
                result = self.create_usage_budget(budget_config)
            elif template['template_type'] == 'RI_UTILIZATION':
                result = self.create_ri_utilization_budget(budget_config)
            else:
                return {
                    'success': False,
                    'error': f'Unsupported template type: {template["template_type"]}'
                }
            
            if result['success']:
                result['template_applied'] = template_id
                result['template_name'] = template['template_name']
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_budget_report(self, budget_names: List[str] = None, 
                              report_type: str = 'comprehensive') -> Dict:
        """Generar reporte de presupuestos"""
        
        try:
            # Obtener todos los presupuestos si no se especifican
            if not budget_names:
                budgets_result = self.list_budgets()
                if budgets_result['success']:
                    budget_names = [b['budget_name'] for b in budgets_result['budgets']]
                else:
                    return budgets_result
            
            # Generar reporte
            report = self.report_generator.generate_report(
                budget_names, report_type
            )
            
            return report
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def optimize_budget_configuration(self, budget_name: str) -> Dict:
        """Optimizar configuración del presupuesto"""
        
        try:
            # Obtener rendimiento actual
            performance = self.get_budget_performance(budget_name)
            if not performance['success']:
                return performance
            
            # Analizar oportunidades de optimización
            optimization_opportunities = self.optimization_engine.analyze_budget(
                budget_name, performance['performance_data']
            )
            
            # Generar recomendaciones
            recommendations = self._generate_optimization_recommendations(
                budget_name, optimization_opportunities
            )
            
            return {
                'success': True,
                'budget_name': budget_name,
                'current_performance': performance['metrics'],
                'optimization_opportunities': optimization_opportunities,
                'recommendations': recommendations,
                'estimated_savings': recommendations.get('estimated_savings', 0),
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _validate_budget_config(self, config: Dict, budget_type: str) -> Dict:
        """Validar configuración del presupuesto"""
        
        required_fields = {
            'COST': ['budget_name', 'budget_amount', 'time_unit'],
            'USAGE': ['budget_name', 'budget_amount', 'usage_unit', 'time_unit', 'service'],
            'RI_UTILIZATION': ['budget_name', 'utilization_target', 'time_unit']
        }
        
        for field in required_fields.get(budget_type, []):
            if field not in config:
                return {
                    'valid': False,
                    'error': f'Missing required field: {field}'
                }
        
        # Validar valores
        if budget_type == 'COST':
            try:
                float(config['budget_amount'])
            except ValueError:
                return {
                    'valid': False,
                    'error': 'budget_amount must be a valid number'
                }
        
        elif budget_type == 'RI_UTILIZATION':
            try:
                target = float(config['utilization_target'])
                if not 0 <= target <= 100:
                    return {
                        'valid': False,
                        'error': 'utilization_target must be between 0 and 100'
                    }
            except ValueError:
                return {
                    'valid': False,
                    'error': 'utilization_target must be a valid number'
                }
        
        return {'valid': True}
    
    def _build_cost_budget_request(self, config: Dict) -> Dict:
        """Construir solicitud de presupuesto de costos"""
        
        budget_request = {
            'BudgetName': config['budget_name'],
            'BudgetType': 'COST',
            'TimeUnit': config.get('time_unit', 'MONTHLY'),
            'BudgetLimit': {
                'Amount': str(config['budget_amount']),
                'Unit': config.get('currency', 'USD')
            },
            'TimePeriod': {
                'Start': config.get('start_date', datetime.utcnow().replace(day=1).strftime('%Y-%m-%d')),
                'End': config.get('end_date', (datetime.utcnow().replace(day=1) + timedelta(days=365)).strftime('%Y-%m-%d'))
            }
        }
        
        # Agregar filtros de costos si se especifican
        if 'cost_filters' in config:
            budget_request['CostFilters'] = config['cost_filters']
        
        return budget_request
    
    def _build_usage_budget_request(self, config: Dict) -> Dict:
        """Construir solicitud de presupuesto de uso"""
        
        budget_request = {
            'BudgetName': config['budget_name'],
            'BudgetType': 'USAGE',
            'TimeUnit': config.get('time_unit', 'MONTHLY'),
            'BudgetLimit': {
                'Amount': str(config['budget_amount']),
                'Unit': config.get('usage_unit', 'GB')
            },
            'TimePeriod': {
                'Start': config.get('start_date', datetime.utcnow().replace(day=1).strftime('%Y-%m-%d')),
                'End': config.get('end_date', (datetime.utcnow().replace(day=1) + timedelta(days=365)).strftime('%Y-%m-%d'))
            },
            'CostFilters': {
                'Service': [config['service']]
            }
        }
        
        # Agregar filtros adicionales
        if 'usage_type' in config:
            budget_request['CostFilters']['UsageType'] = [config['usage_type']]
        
        if 'operation' in config:
            budget_request['CostFilters']['Operation'] = [config['operation']]
        
        return budget_request
    
    def _build_ri_budget_request(self, config: Dict) -> Dict:
        """Construir solicitud de presupuesto de RI"""
        
        budget_request = {
            'BudgetName': config['budget_name'],
            'BudgetType': 'RI_UTILIZATION',
            'TimeUnit': config.get('time_unit', 'MONTHLY'),
            'BudgetLimit': {
                'Amount': str(config['utilization_target']),
                'Unit': 'PERCENTAGE'
            },
            'TimePeriod': {
                'Start': config.get('start_date', datetime.utcnow().replace(day=1).strftime('%Y-%m-%d')),
                'End': config.get('end_date', (datetime.utcnow().replace(day=1) + timedelta(days=365)).strftime('%Y-%m-%d'))
            },
            'CostFilters': {
                'PurchaseOption': ['Reserved Instances']
            }
        }
        
        # Agregar filtros específicos de RI
        if 'instance_type' in config:
            budget_request['CostFilters']['InstanceType'] = [config['instance_type']]
        
        if 'platform' in config:
            budget_request['CostFilters']['Platform'] = [config['platform']]
        
        return budget_request
    
    def _create_budget_notification(self, budget_name: str, notification_config: Dict) -> Dict:
        """Crear notificación de presupuesto"""
        
        try:
            notification = {
                'NotificationType': notification_config.get('notification_type', 'ACTUAL'),
                'ComparisonOperator': notification_config.get('comparison_operator', 'GREATER_THAN'),
                'Threshold': notification_config['threshold'],
                'ThresholdType': notification_config.get('threshold_type', 'PERCENTAGE')
            }
            
            # Agregar suscriptores
            subscribers = []
            for subscriber in notification_config.get('subscribers', []):
                if subscriber['type'] == 'EMAIL':
                    subscribers.append({
                        'SubscriptionType': 'EMAIL',
                        'Address': subscriber['address']
                    })
                elif subscriber['type'] == 'SNS':
                    subscribers.append({
                        'SubscriptionType': 'SNS',
                        'Address': subscriber['address']
                    })
            
            notification['Subscribers'] = subscribers
            
            # Crear notificación
            response = self.budgets.create_notification(
                AccountId=self.account_id,
                BudgetName=budget_name,
                Notification=notification
            )
            
            return {
                'success': True,
                'notification_id': response.get('NotificationId', 'generated'),
                'budget_name': budget_name,
                'threshold': notification['Threshold'],
                'notification_type': notification['NotificationType']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _calculate_budget_metrics(self, budget: Dict, performance_data: Dict) -> Dict:
        """Calcular métricas del presupuesto"""
        
        try:
            metrics = {}
            
            if budget['budget_type'] == 'COST':
                budget_amount = float(budget['budget_limit']['Amount'])
                actual_spend = performance_data.get('actual_spend', 0)
                forecasted_spend = performance_data.get('forecasted_spend', 0)
                
                metrics['budget_amount'] = budget_amount
                metrics['actual_spend'] = actual_spend
                metrics['forecasted_spend'] = forecasted_spend
                metrics['actual_utilization'] = (actual_spend / budget_amount) * 100 if budget_amount > 0 else 0
                metrics['forecasted_utilization'] = (forecasted_spend / budget_amount) * 100 if budget_amount > 0 else 0
                metrics['remaining_amount'] = budget_amount - actual_spend
                metrics['variance'] = actual_spend - budget_amount
                metrics['variance_percentage'] = ((actual_spend - budget_amount) / budget_amount) * 100 if budget_amount > 0 else 0
                
                # Determinar estado
                if metrics['actual_utilization'] > 100:
                    metrics['status'] = 'OVER_BUDGET'
                elif metrics['actual_utilization'] > 90:
                    metrics['status'] = 'AT_RISK'
                elif metrics['actual_utilization'] > 75:
                    metrics['status'] = 'ON_TRACK'
                else:
                    metrics['status'] = 'UNDER_UTILIZED'
            
            elif budget['budget_type'] == 'USAGE':
                budget_amount = float(budget['budget_limit']['Amount'])
                actual_usage = performance_data.get('actual_usage', 0)
                
                metrics['budget_amount'] = budget_amount
                metrics['actual_usage'] = actual_usage
                metrics['utilization_percentage'] = (actual_usage / budget_amount) * 100 if budget_amount > 0 else 0
                metrics['remaining_usage'] = budget_amount - actual_usage
                metrics['usage_variance'] = actual_usage - budget_amount
                
                # Determinar estado
                if metrics['utilization_percentage'] > 100:
                    metrics['status'] = 'OVER_LIMIT'
                elif metrics['utilization_percentage'] > 90:
                    metrics['status'] = 'AT_RISK'
                elif metrics['utilization_percentage'] > 75:
                    metrics['status'] = 'ON_TRACK'
                else:
                    metrics['status'] = 'UNDER_UTILIZED'
            
            elif budget['budget_type'] == 'RI_UTILIZATION':
                target_utilization = float(budget['budget_limit']['Amount'])
                actual_utilization = performance_data.get('actual_utilization', 0)
                
                metrics['target_utilization'] = target_utilization
                metrics['actual_utilization'] = actual_utilization
                metrics['utilization_variance'] = actual_utilization - target_utilization
                metrics['wasted_capacity'] = target_utilization - actual_utilization if actual_utilization < target_utilization else 0
                
                # Determinar estado
                if actual_utilization < target_utilization * 0.7:
                    metrics['status'] = 'UNDER_UTILIZED'
                elif actual_utilization >= target_utilization:
                    metrics['status'] = 'OPTIMAL'
                else:
                    metrics['status'] = 'ON_TRACK'
            
            return metrics
            
        except Exception as e:
            return {'error': str(e)}
    
    def _analyze_trends(self, trend_data: List[Dict]) -> Dict:
        """Analizar tendencias de datos"""
        
        try:
            if len(trend_data) < 2:
                return {
                    'trend': 'INSUFFICIENT_DATA',
                    'growth_rate': 0,
                    'volatility': 0,
                    'seasonality': 'NONE'
                }
            
            # Extraer valores
            values = [point['value'] for point in trend_data]
            
            # Calcular tasa de crecimiento
            growth_rates = []
            for i in range(1, len(values)):
                if values[i-1] > 0:
                    growth_rate = ((values[i] - values[i-1]) / values[i-1]) * 100
                    growth_rates.append(growth_rate)
            
            average_growth_rate = sum(growth_rates) / len(growth_rates) if growth_rates else 0
            
            # Calcular volatilidad
            if len(growth_rates) > 1:
                mean_growth = sum(growth_rates) / len(growth_rates)
                variance = sum((x - mean_growth) ** 2 for x in growth_rates) / len(growth_rates)
                volatility = variance ** 0.5
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
                'data_points': len(trend_data),
                'seasonal_pattern': self._detect_seasonality(trend_data)
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def _detect_seasonality(self, trend_data: List[Dict]) -> str:
        """Detectar patrones estacionales"""
        
        try:
            if len(trend_data) < 12:
                return 'INSUFFICIENT_DATA'
            
            # Análisis simple de estacionalidad
            monthly_averages = {}
            for point in trend_data:
                month = datetime.strptime(point['period'], '%Y-%m-%d').month
                if month not in monthly_averages:
                    monthly_averages[month] = []
                monthly_averages[month].append(point['value'])
            
            # Calcular promedios mensuales
            monthly_means = {month: sum(values) / len(values) for month, values in monthly_averages.items()}
            
            # Determinar si hay variación estacional significativa
            all_values = list(monthly_means.values())
            mean_value = sum(all_values) / len(all_values)
            variance = sum((x - mean_value) ** 2 for x in all_values) / len(all_values)
            
            if variance > mean_value * 0.1:  # 10% de variación
                return 'SEASONAL'
            else:
                return 'NONE'
            
        except Exception as e:
            return 'ERROR'
    
    def _generate_budget_forecast(self, trend_data: List[Dict]) -> Dict:
        """Generar pronóstico del presupuesto"""
        
        try:
            if len(trend_data) < 3:
                return {
                    'forecast_available': False,
                    'reason': 'Insufficient historical data'
                }
            
            # Método simple: regresión lineal
            values = [point['value'] for point in trend_data]
            n = len(values)
            x = list(range(n))
            
            # Calcular regresión lineal
            sum_x = sum(x)
            sum_y = sum(values)
            sum_xy = sum(x[i] * values[i] for i in range(n))
            sum_x2 = sum(x[i] ** 2 for i in range(n))
            
            slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x ** 2)
            intercept = (sum_y - slope * sum_x) / n
            
            # Generar pronóstico para próximos 3 períodos
            forecast = []
            for i in range(1, 4):
                future_x = n + i
                forecasted_value = slope * future_x + intercept
                forecast.append({
                    'period': f"Period +{i}",
                    'forecasted_value': max(0, forecasted_value),
                    'confidence_interval': {
                        'lower': max(0, forecasted_value * 0.8),
                        'upper': forecasted_value * 1.2
                    }
                })
            
            return {
                'forecast_available': True,
                'forecast_periods': forecast,
                'method': 'Linear Regression',
                'confidence_level': 80,
                'historical_data_points': len(trend_data)
            }
            
        except Exception as e:
            return {
                'forecast_available': False,
                'error': str(e)
            }
    
    def _generate_optimization_recommendations(self, budget_name: str, 
                                            opportunities: Dict) -> Dict:
        """Generar recomendaciones de optimización"""
        
        try:
            recommendations = {
                'budget_adjustments': [],
                'cost_optimization': [],
                'process_improvements': [],
                'estimated_savings': 0
            }
            
            # Analizar oportunidades y generar recomendaciones
            for opportunity in opportunities.get('opportunities', []):
                if opportunity['type'] == 'BUDGET_ADJUSTMENT':
                    recommendations['budget_adjustments'].append({
                        'action': opportunity['action'],
                        'reason': opportunity['reason'],
                        'impact': opportunity['impact'],
                        'estimated_savings': opportunity.get('estimated_savings', 0)
                    })
                elif opportunity['type'] == 'COST_OPTIMIZATION':
                    recommendations['cost_optimization'].append({
                        'action': opportunity['action'],
                        'resource': opportunity['resource'],
                        'potential_savings': opportunity.get('potential_savings', 0),
                        'implementation_effort': opportunity.get('implementation_effort', 'MEDIUM')
                    })
                elif opportunity['type'] == 'PROCESS_IMPROVEMENT':
                    recommendations['process_improvements'].append({
                        'action': opportunity['action'],
                        'benefit': opportunity['benefit'],
                        'implementation_time': opportunity.get('implementation_time', '1 week')
                    })
            
            # Calcular ahorros totales estimados
            total_savings = 0
            for category in ['budget_adjustments', 'cost_optimization']:
                for item in recommendations[category]:
                    if 'estimated_savings' in item:
                        total_savings += item['estimated_savings']
                    elif 'potential_savings' in item:
                        total_savings += item['potential_savings']
            
            recommendations['estimated_savings'] = total_savings
            
            return recommendations
            
        except Exception as e:
            return {'error': str(e)}


class BudgetAnalyzer:
    """Analizador de presupuestos"""
    
    def __init__(self, cost_explorer_client):
        self.cost_explorer = cost_explorer_client
    
    def get_budget_performance(self, budget_name: str, budget_type: str, 
                            time_period: str) -> Dict:
        """Obtener rendimiento del presupuesto"""
        
        try:
            # En implementación real, obtendría datos de AWS Budgets API
            if budget_type == 'COST':
                return {
                    'success': True,
                    'data': {
                        'actual_spend': 8500.00,
                        'forecasted_spend': 9200.00,
                        'budget_amount': 10000.00,
                        'period_start': datetime.utcnow().replace(day=1).isoformat(),
                        'period_end': datetime.utcnow().isoformat()
                    }
                }
            elif budget_type == 'USAGE':
                return {
                    'success': True,
                    'data': {
                        'actual_usage': 750.0,
                        'budget_amount': 1000.0,
                        'unit': 'GB',
                        'period_start': datetime.utcnow().replace(day=1).isoformat(),
                        'period_end': datetime.utcnow().isoformat()
                    }
                }
            elif budget_type == 'RI_UTILIZATION':
                return {
                    'success': True,
                    'data': {
                        'actual_utilization': 85.0,
                        'target_utilization': 80.0,
                        'unit': 'PERCENTAGE',
                        'period_start': datetime.utcnow().replace(day=1).isoformat(),
                        'period_end': datetime.utcnow().isoformat()
                    }
                }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_budget_trends(self, budget_name: str, start_date: datetime, 
                         end_date: datetime) -> Dict:
        """Obtener tendencias del presupuesto"""
        
        try:
            # En implementación real, obtendría datos históricos
            trends = []
            current_date = start_date
            
            while current_date <= end_date:
                trends.append({
                    'period': current_date.strftime('%Y-%m-%d'),
                    'value': 8000 + (current_date - start_date).days * 50  # Simulación de crecimiento
                })
                current_date += timedelta(days=30)
            
            return {
                'success': True,
                'data': trends
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}


class BudgetAlertManager:
    """Gestor de alertas de presupuestos"""
    
    def __init__(self, cloudwatch_client, sns_client):
        self.cloudwatch = cloudwatch_client
        self.sns = sns_client
    
    def create_budget_alert(self, budget_name: str, alert_config: Dict) -> Dict:
        """Crear alerta de presupuesto"""
        
        try:
            # En implementación real, crearía alarma de CloudWatch
            alert = {
                'alert_id': f"alert-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                'budget_name': budget_name,
                'threshold': alert_config['threshold'],
                'notification_type': alert_config.get('notification_type', 'EMAIL'),
                'created_at': datetime.utcnow().isoformat()
            }
            
            return {
                'success': True,
                'alert': alert
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}


class BudgetOptimizationEngine:
    """Motor de optimización de presupuestos"""
    
    def __init__(self, cost_explorer_client):
        self.cost_explorer = cost_explorer_client
    
    def analyze_budget(self, budget_name: str, performance_data: Dict) -> Dict:
        """Analizar presupuesto para optimización"""
        
        try:
            opportunities = []
            
            # Analizar oportunidades de optimización
            if performance_data.get('actual_spend', 0) > performance_data.get('budget_amount', 0) * 0.9:
                opportunities.append({
                    'type': 'BUDGET_ADJUSTMENT',
                    'action': 'Increase budget limit',
                    'reason': 'Budget utilization approaching limit',
                    'impact': 'HIGH',
                    'estimated_savings': 0
                })
            
            if performance_data.get('actual_spend', 0) < performance_data.get('budget_amount', 0) * 0.5:
                opportunities.append({
                    'type': 'BUDGET_ADJUSTMENT',
                    'action': 'Reduce budget limit',
                    'reason': 'Budget underutilized',
                    'impact': 'MEDIUM',
                    'estimated_savings': performance_data.get('budget_amount', 0) * 0.2
                })
            
            return {
                'opportunities': opportunities,
                'analysis_date': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {'error': str(e)}


class BudgetReportGenerator:
    """Generador de reportes de presupuestos"""
    
    def __init__(self, budgets_client, cost_explorer_client):
        self.budgets = budgets_client
        self.cost_explorer = cost_explorer_client
    
    def generate_report(self, budget_names: List[str], report_type: str) -> Dict:
        """Generar reporte de presupuestos"""
        
        try:
            if report_type == 'comprehensive':
                return self._generate_comprehensive_report(budget_names)
            elif report_type == 'executive':
                return self._generate_executive_report(budget_names)
            elif report_type == 'detailed':
                return self._generate_detailed_report(budget_names)
            else:
                return {
                    'success': False,
                    'error': f'Unsupported report type: {report_type}'
                }
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _generate_comprehensive_report(self, budget_names: List[str]) -> Dict:
        """Generar reporte comprensivo"""
        
        try:
            report = {
                'report_metadata': {
                    'report_type': 'comprehensive',
                    'budgets_analyzed': len(budget_names),
                    'generated_at': datetime.utcnow().isoformat()
                },
                'executive_summary': {},
                'budget_details': [],
                'analysis': {},
                'recommendations': []
            }
            
            # En implementación real, generaría reporte completo
            return {
                'success': True,
                'report': report
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _generate_executive_report(self, budget_names: List[str]) -> Dict:
        """Generar reporte ejecutivo"""
        
        try:
            report = {
                'report_metadata': {
                    'report_type': 'executive',
                    'budgets_analyzed': len(budget_names),
                    'generated_at': datetime.utcnow().isoformat()
                },
                'summary': {},
                'key_metrics': {},
                'action_items': []
            }
            
            return {
                'success': True,
                'report': report
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _generate_detailed_report(self, budget_names: List[str]) -> Dict:
        """Generar reporte detallado"""
        
        try:
            report = {
                'report_metadata': {
                    'report_type': 'detailed',
                    'budgets_analyzed': len(budget_names),
                    'generated_at': datetime.utcnow().isoformat()
                },
                'budget_analyses': [],
                'trend_analysis': {},
                'optimization_opportunities': []
            }
            
            return {
                'success': True,
                'report': report
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
```

## Casos de Uso

### **1. Crear Presupuesto de Costos**
```python
# Ejemplo: Crear presupuesto de costos
budgets = AWSBudgetsManager('us-east-1')

# Configuración de presupuesto de costos
cost_budget_config = {
    'budget_name': 'Monthly-Production-Costs',
    'budget_amount': 10000.00,
    'currency': 'USD',
    'time_unit': 'MONTHLY',
    'start_date': '2023-01-01',
    'end_date': '2023-12-31',
    'cost_filters': {
        'Service': ['Amazon EC2', 'Amazon RDS', 'Amazon S3'],
        'Tag': {
            'Environment': ['Production']
        }
    },
    'notifications': [
        {
            'notification_type': 'ACTUAL',
            'comparison_operator': 'GREATER_THAN',
            'threshold': 80,
            'threshold_type': 'PERCENTAGE',
            'subscribers': [
                {'type': 'EMAIL', 'address': 'finance@company.com'},
                {'type': 'SNS', 'address': 'arn:aws:sns:us-east-1:123456789012:budget-alerts'}
            ]
        },
        {
            'notification_type': 'FORECASTED',
            'comparison_operator': 'GREATER_THAN',
            'threshold': 90,
            'threshold_type': 'PERCENTAGE',
            'subscribers': [
                {'type': 'EMAIL', 'address': 'ops@company.com'}
            ]
        }
    ]
}

# Crear presupuesto
result = budgets.create_cost_budget(cost_budget_config)

if result['success']:
    print(f"Cost Budget Created:")
    print(f"  Budget ID: {result['budget_id']}")
    print(f"  Budget Name: {result['budget_name']}")
    print(f"  Amount: ${result['amount']:.2f}")
    print(f"  Currency: {result['currency']}")
    print(f"  Time Unit: {result['time_unit']}")
    print(f"  Notifications Configured: {result['notifications_configured']}")
```

### **2. Crear Presupuesto de Uso**
```python
# Ejemplo: Crear presupuesto de uso
budgets = AWSBudgetsManager('us-east-1')

# Configuración de presupuesto de uso
usage_budget_config = {
    'budget_name': 'S3-Storage-Usage',
    'budget_amount': 1000,
    'usage_unit': 'GB',
    'time_unit': 'MONTHLY',
    'service': 'Amazon S3',
    'usage_type': 'TimedStorage',
    'operation': 'PutObject',
    'start_date': '2023-01-01',
    'end_date': '2023-12-31',
    'cost_filters': {
        'StorageClass': ['Standard', 'Intelligent-Tiering']
    },
    'notifications': [
        {
            'notification_type': 'ACTUAL',
            'comparison_operator': 'GREATER_THAN',
            'threshold': 75,
            'threshold_type': 'PERCENTAGE',
            'subscribers': [
                {'type': 'EMAIL', 'address': 'storage-team@company.com'}
            ]
        }
    ]
}

# Crear presupuesto
result = budgets.create_usage_budget(usage_budget_config)

if result['success']:
    print(f"Usage Budget Created:")
    print(f"  Budget ID: {result['budget_id']}")
    print(f"  Budget Name: {result['budget_name']}")
    print(f"  Amount: {result['amount']} {result['unit']}")
    print(f"  Service: {usage_budget_config['service']}")
    print(f"  Notifications Configured: {result['notifications_configured']}")
```

### **3. Crear Presupuesto de RI Utilization**
```python
# Ejemplo: Crear presupuesto de utilización de RI
budgets = AWSBudgetsManager('us-east-1')

# Configuración de presupuesto de RI
ri_budget_config = {
    'budget_name': 'EC2-RI-Utilization',
    'utilization_target': 80.0,
    'time_unit': 'MONTHLY',
    'instance_type': 't3.medium',
    'platform': 'Linux',
    'start_date': '2023-01-01',
    'end_date': '2023-12-31',
    'notifications': [
        {
            'notification_type': 'ACTUAL',
            'comparison_operator': 'LESS_THAN',
            'threshold': 70,
            'threshold_type': 'PERCENTAGE',
            'subscribers': [
                {'type': 'EMAIL', 'address': 'infrastructure@company.com'}
            ]
        }
    ]
}

# Crear presupuesto
result = budgets.create_ri_utilization_budget(ri_budget_config)

if result['success']:
    print(f"RI Utilization Budget Created:")
    print(f"  Budget ID: {result['budget_id']}")
    print(f"  Budget Name: {result['budget_name']}")
    print(f"  Utilization Target: {result['utilization_target']}%")
    print(f"  Instance Type: {ri_budget_config['instance_type']}")
    print(f"  Notifications Configured: {result['notifications_configured']}")
```

### **4. Analizar Rendimiento del Presupuesto**
```python
# Ejemplo: Analizar rendimiento del presupuesto
budgets = AWSBudgetsManager('us-east-1')

# Obtener rendimiento del presupuesto
performance_result = budgets.get_budget_performance('Monthly-Production-Costs')

if performance_result['success']:
    performance = performance_result['performance']
    metrics = performance_result['metrics']
    
    print(f"Budget Performance Analysis")
    print(f"Budget Name: {performance['budget_name']}")
    print(f"Budget Type: {performance['budget_type']}")
    print(f"Analysis Period: {performance['analysis_period']}")
    
    if performance['budget_type'] == 'COST':
        print(f"\nCost Metrics:")
        print(f"  Budget Amount: ${metrics['budget_amount']:.2f}")
        print(f"  Actual Spend: ${metrics['actual_spend']:.2f}")
        print(f"  Forecasted Spend: ${metrics['forecasted_spend']:.2f}")
        print(f"  Actual Utilization: {metrics['actual_utilization']:.1f}%")
        print(f"  Forecasted Utilization: {metrics['forecasted_utilization']:.1f}%")
        print(f"  Remaining Amount: ${metrics['remaining_amount']:.2f}")
        print(f"  Variance: ${metrics['variance']:.2f}")
        print(f"  Status: {metrics['status']}")
```

### **5. Analizar Tendencias del Presupuesto**
```python
# Ejemplo: Analizar tendencias del presupuesto
budgets = AWSBudgetsManager('us-east-1')

# Analizar tendencias de 6 meses
trend_result = budgets.analyze_budget_trends('Monthly-Production-Costs', months=6)

if trend_result['success']:
    trends = trend_result['trend_analysis']
    forecast = trend_result['forecast']
    
    print(f"Budget Trend Analysis")
    print(f"Budget Name: {trend_result['budget_name']}")
    print(f"Analysis Period: {trend_result['analysis_period']}")
    
    print(f"\nTrend Analysis:")
    print(f"  Trend: {trends['trend']}")
    print(f"  Average Growth Rate: {trends['average_growth_rate']:.2f}%")
    print(f"  Volatility: {trends['volatility']:.2f}")
    print(f"  Data Points: {trends['data_points']}")
    print(f"  Seasonal Pattern: {trends['seasonal_pattern']}")
    
    if forecast['forecast_available']:
        print(f"\nForecast:")
        print(f"  Method: {forecast['method']}")
        print(f"  Confidence Level: {forecast['confidence_level']}%")
        print(f"  Historical Data Points: {forecast['historical_data_points']}")
        
        for period in forecast['forecast_periods']:
            print(f"  {period['period']}: {period['forecasted_value']:.2f}")
            print(f"    Confidence Interval: {period['confidence_interval']['lower']:.2f} - {period['confidence_interval']['upper']:.2f}")
```

### **6. Crear y Aplicar Plantilla de Presupuesto**
```python
# Ejemplo: Crear y aplicar plantilla de presupuesto
budgets = AWSBudgetsManager('us-east-1')

# Crear plantilla de presupuesto
template_config = {
    'template_name': 'Production-Service-Budget',
    'template_type': 'COST',
    'description': 'Template for production service budgets',
    'budget_configuration': {
        'time_unit': 'MONTHLY',
        'currency': 'USD',
        'cost_filters': {
            'Tag': {
                'Environment': ['Production']
            }
        }
    },
    'notification_configuration': {
        'notifications': [
            {
                'notification_type': 'ACTUAL',
                'comparison_operator': 'GREATER_THAN',
                'threshold': 80,
                'threshold_type': 'PERCENTAGE',
                'subscribers': [
                    {'type': 'EMAIL', 'address': 'finance@company.com'}
                ]
            }
        ]
    },
    'best_practices': {
        'recommended_review_frequency': 'WEEKLY',
        'recommended_adjustment_threshold': 10,
        'optimization_suggestions': [
            'Consider Reserved Instances for steady workloads',
            'Implement cost allocation tags',
            'Regular budget reviews'
        ]
    }
}

# Crear plantilla
template_result = budgets.create_budget_template(template_config)

if template_result['success']:
    template = template_result['template']
    print(f"Budget Template Created:")
    print(f"  Template ID: {template['template_id']}")
    print(f"  Template Name: {template['template_name']}")
    print(f"  Template Type: {template['template_type']}")
    print(f"  Created: {template['created_at']}")
    
    # Aplicar plantilla
    application_config = {
        'budget_name': 'EC2-Production-Budget',
        'budget_amount': 5000.00
    }
    
    apply_result = budgets.apply_budget_template(template['template_id'], application_config)
    
    if apply_result['success']:
        print(f"\nTemplate Applied Successfully:")
        print(f"  Budget ID: {apply_result['budget_id']}")
        print(f"  Budget Name: {apply_result['budget_name']}")
        print(f"  Template Used: {apply_result['template_name']}")
```

### **7. Optimizar Configuración del Presupuesto**
```python
# Ejemplo: Optimizar configuración del presupuesto
budgets = AWSBudgetsManager('us-east-1')

# Optimizar presupuesto
optimization_result = budgets.optimize_budget_configuration('Monthly-Production-Costs')

if optimization_result['success']:
    optimization = optimization_result
    
    print(f"Budget Optimization Analysis")
    print(f"Budget Name: {optimization['budget_name']}")
    print(f"Estimated Savings: ${optimization['estimated_savings']:.2f}")
    
    print(f"\nCurrent Performance:")
    current = optimization['current_performance']
    print(f"  Status: {current['status']}")
    print(f"  Utilization: {current.get('actual_utilization', 0):.1f}%")
    
    print(f"\nOptimization Opportunities:")
    opportunities = optimization['optimization_opportunities']['opportunities']
    for opportunity in opportunities:
        print(f"  Type: {opportunity['type']}")
        print(f"  Action: {opportunity['action']}")
        print(f"  Reason: {opportunity['reason']}")
        print(f"  Impact: {opportunity['impact']}")
    
    print(f"\nRecommendations:")
    recommendations = optimization['recommendations']
    
    print(f"  Budget Adjustments: {len(recommendations['budget_adjustments'])}")
    for adj in recommendations['budget_adjustments']:
        print(f"    - {adj['action']}: {adj['reason']}")
        print(f"      Estimated Savings: ${adj['estimated_savings']:.2f}")
    
    print(f"  Cost Optimization: {len(recommendations['cost_optimization'])}")
    for opt in recommendations['cost_optimization']:
        print(f"    - {opt['action']} ({opt['resource']})")
        print(f"      Potential Savings: ${opt['potential_savings']:.2f}")
        print(f"      Implementation Effort: {opt['implementation_effort']}")
```

### **8. Generar Reporte de Presupuestos**
```python
# Ejemplo: Generar reporte de presupuestos
budgets = AWSBudgetsManager('us-east-1')

# Generar reporte comprensivo
report_result = budgets.generate_budget_report(
    budget_names=['Monthly-Production-Costs', 'S3-Storage-Usage'],
    report_type='comprehensive'
)

if report_result['success']:
    report = report_result['report']
    
    print(f"Budget Report Generated")
    metadata = report['report_metadata']
    print(f"  Report Type: {metadata['report_type']}")
    print(f"  Budgets Analyzed: {metadata['budgets_analyzed']}")
    print(f"  Generated: {metadata['generated_at']}")
    
    # Mostrar resumen ejecutivo
    if 'executive_summary' in report:
        summary = report['executive_summary']
        print(f"\nExecutive Summary:")
        # Mostrar detalles del resumen
    
    # Mostrar detalles de presupuestos
    if 'budget_details' in report:
        details = report['budget_details']
        print(f"\nBudget Details:")
        for detail in details:
            print(f"  Budget: {detail['budget_name']}")
            print(f"    Status: {detail['status']}")
            print(f"    Utilization: {detail['utilization']:.1f}%")
    
    # Mostrar recomendaciones
    if 'recommendations' in report:
        recommendations = report['recommendations']
        print(f"\nRecommendations: {len(recommendations)}")
        for rec in recommendations:
            print(f"  - {rec['title']}: {rec['description']}")
```

## Configuración con AWS CLI

### **Creación y Gestión de Presupuestos**
```bash
# Crear presupuesto de costos
aws budgets create-budget \
  --account-id 123456789012 \
  --budget file://cost-budget.json

# Crear presupuesto de uso
aws budgets create-budget \
  --account-id 123456789012 \
  --budget file://usage-budget.json

# Crear presupuesto de RI utilization
aws budgets create-budget \
  --account-id 123456789012 \
  --budget file://ri-budget.json

# Describir presupuesto
aws budgets describe-budget \
  --account-id 123456789012 \
  --budget-name "Monthly-Production-Costs"

# Listar presupuestos
aws budgets describe-budgets \
  --account-id 123456789012 \
  --max-results 50

# Modificar presupuesto
aws budgets modify-budget \
  --account-id 123456789012 \
  --new-budget file://updated-budget.json

# Eliminar presupuesto
aws budgets delete-budget \
  --account-id 123456789012 \
  --budget-name "Monthly-Production-Costs"
```

### **Notificaciones y Alertas**
```bash
# Crear notificación
aws budgets create-notification \
  --account-id 123456789012 \
  --budget-name "Monthly-Production-Costs" \
  --notification file://notification.json

# Describir notificaciones
aws budgets describe-notifications-for-budget \
  --account-id 123456789012 \
  --budget-name "Monthly-Production-Costs"

# Eliminar notificación
aws budgets delete-notification \
  --account-id 123456789012 \
  --budget-name "Monthly-Production-Costs" \
  --notification file://notification-to-delete.json
```

## Mejores Prácticas

### **1. Diseño de Presupuestos**
- **Granularity Appropriate**: Nivel de granularidad apropiado
- **Regular Reviews**: Revisiones regulares de presupuestos
- **Realistic Targets**: Objetivos realistas y alcanzables
- **Multi-dimensional Filtering**: Filtrado multidimensional
- **Tag-based Allocation**: Asignación basada en etiquetas

### **2. Configuración de Alertas**
- **Threshold Optimization**: Optimización de umbrales
- **Multi-channel Notifications**: Notificaciones multi-canal
- **Escalation Rules**: Reglas de escalado claras
- **Alert Fatigue Prevention**: Prevención de fatiga de alertas
- **Actionable Alerts**: Alertas accionables

### **3. Monitorización y Análisis**
- **Continuous Monitoring**: Monitorización continua
- **Trend Analysis**: Análisis de tendencias
- **Variance Analysis**: Análisis de variaciones
- **Performance Metrics**: Métricas de rendimiento
- **Forecast Accuracy**: Precisión de proyecciones

### **4. Optimización y Mejora**
- **Regular Optimization**: Optimización regular
- **Template Usage**: Uso de plantillas
- **Best Practices Implementation**: Implementación de mejores prácticas
- **Feedback Loop**: Ciclo de retroalimentación
- **Continuous Improvement**: Mejora continua

## Integración con Servicios AWS

### **AWS Cost Explorer**
- **Data Source**: Fuente principal de datos de costos
- **Custom Queries**: Consultas personalizadas
- **Cost Allocation**: Asignación de costos
- **Forecasting**: Proyección de costos
- **Anomaly Detection**: Detección de anomalías

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

### **AWS Organizations**
- **Multi-account Management**: Gestión multi-cuenta
- **Service Control Policies**: Políticas de control de servicios
- **Consolidated Billing**: Facturación consolidada
- **Account Structure**: Estructura de cuentas
- **Policy Enforcement**: Aplicación de políticas

## Métricas y KPIs

### **Métricas de Presupuestos**
- **Budget Utilization**: Utilización del presupuesto
- **Budget Variance**: Varianza del presupuesto
- **Forecast Accuracy**: Precisión de proyecciones
- **Alert Response Time**: Tiempo de respuesta a alertas
- **Budget Compliance**: Cumplimiento del presupuesto

### **KPIs de Rendimiento**
- **Cost Control Effectiveness**: Efectividad del control de costos
- **Budget Achievement Rate**: Tasa de cumplimiento de presupuestos
- **Optimization Success**: Éxito de optimización
- **Alert Effectiveness**: Efectividad de alertas
- **Process Efficiency**: Eficiencia de procesos

## Cumplimiento Normativo

### **Control de Presupuestos**
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

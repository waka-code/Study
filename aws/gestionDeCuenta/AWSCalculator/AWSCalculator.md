# AWS Calculator - Herramienta Completa de Cálculo de Costos

## Definición

AWS Calculator es una herramienta integral que combina todas las capacidades de cálculo de costos de AWS en una sola interfaz. Permite estimar, analizar, optimizar y proyectar costos para todos los servicios de AWS, proporcionando una visión completa del gasto en la nube y recomendaciones de optimización basadas en machine learning.

## Características Principales

### **Cálculo Integral de Costos**
- **Multi-service Calculator**: Calculadora para todos los servicios AWS
- **Real-time Pricing**: Precios en tiempo real de AWS Pricing API
- **Workload Analysis**: Análisis completo de workloads
- **Cost Optimization**: Optimización automática de costos
- **Forecasting**: Proyección de costos futuros

### **Análisis y Optimización**
- **Scenario Comparison**: Comparación de múltiples escenarios
- **Optimization Engine**: Motor de optimización con ML
- **Savings Opportunities**: Identificación de oportunidades de ahorro
- **ROI Analysis**: Análisis de retorno de inversión
- **Budget Planning**: Planificación de presupuestos

### **Visualización y Reportes**
- **Interactive Dashboard**: Dashboard interactivo de costos
- **Cost Breakdown**: Desglose detallado de costos
- **Trend Analysis**: Análisis de tendencias
- **Alert Configuration**: Configuración de alertas
- **Export Options**: Múltiples opciones de exportación

### **Integración y Automatización**
- **API Integration**: Integración completa con APIs de AWS
- **Automation Rules**: Reglas de automatización
- **Scheduled Analysis**: Análisis programado
- **Notification System**: Sistema de notificaciones
- **Workflow Integration**: Integración con flujos de trabajo

## Arquitectura de AWS Calculator

### **Componentes Principales**
```
AWS Calculator Architecture
├── Pricing Engine
│   ├── Service Pricing APIs
│   ├── Real-time Calculations
│   ├── Cost Models
│   └── Pricing Database
├── Analysis Engine
│   ├── Workload Analyzer
│   ├── Optimization Engine
│   ├── Forecasting Engine
│   └── Comparison Engine
├── Visualization Layer
│   ├── Dashboard Components
│   ├── Chart Generators
│   ├── Report Templates
│   └── Export Functions
├── Integration Layer
│   ├── AWS APIs
│   ├── Third-party Tools
│   ├── Webhooks
│   └── Event Handlers
└── Data Layer
    ├── Cost Database
    ├── Historical Data
    ├── User Preferences
    └── Configuration Data
```

### **Flujo de Trabajo**
```
User Input → Service Selection → Configuration → Cost Calculation → 
Analysis → Optimization → Reporting → Export/Integration
```

## Implementación Completa de AWS Calculator

### **Clase Principal del Calculator**
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

class AWSCalculator:
    """Calculadora integral de costos de AWS"""
    
    def __init__(self, region='us-east-1'):
        self.pricing = boto3.client('pricing', region_name=region)
        self.cost_explorer = boto3.client('ce', region_name=region)
        self.ec2 = boto3.client('ec2', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.rds = boto3.client('rds', region_name=region)
        self.lambda_client = boto3.client('lambda', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.region = region
        
        # Inicializar componentes
        self.pricing_engine = PricingEngine(self.pricing, self.region)
        self.analysis_engine = AnalysisEngine(self.cost_explorer)
        self.optimization_engine = OptimizationEngine()
        self.visualization_engine = VisualizationEngine()
        self.export_engine = ExportEngine()
        
        # Caché de precios
        self.price_cache = {}
        
    def calculate_workload_cost(self, workload_config: Dict) -> Dict:
        """Calcular costo completo de workload"""
        
        try:
            # Validar configuración
            validation_result = self._validate_workload_config(workload_config)
            if not validation_result['valid']:
                return {
                    'success': False,
                    'error': validation_result['error']
                }
            
            # Calcular costos por componente
            component_costs = {}
            total_cost = 0
            
            for component_name, component_config in workload_config.get('components', {}).items():
                cost_result = self._calculate_component_cost(component_config)
                
                if cost_result['success']:
                    component_costs[component_name] = cost_result['cost']
                    total_cost += cost_result['cost']['total_cost']
                else:
                    return {
                        'success': False,
                        'error': f"Error calculating {component_name}: {cost_result['error']}"
                    }
            
            # Análisis de optimización
            optimization_result = self.optimization_engine.analyze_workload(
                workload_config, component_costs
            )
            
            # Generar reporte completo
            report = {
                'workload_name': workload_config.get('name', 'Unknown'),
                'total_cost': total_cost,
                'component_costs': component_costs,
                'optimization_opportunities': optimization_result.get('opportunities', []),
                'potential_savings': optimization_result.get('potential_savings', 0),
                'calculated_at': datetime.utcnow().isoformat(),
                'region': self.region
            }
            
            return {
                'success': True,
                'report': report
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def compare_scenarios(self, scenarios: List[Dict]) -> Dict:
        """Comparar múltiples escenarios"""
        
        try:
            scenario_results = {}
            
            # Calcular costo para cada escenario
            for scenario in scenarios:
                result = self.calculate_workload_cost(scenario)
                if result['success']:
                    scenario_results[scenario['name']] = result['report']
                else:
                    scenario_results[scenario['name']] = {
                        'error': result['error'],
                        'total_cost': float('inf')
                    }
            
            # Análisis comparativo
            comparison_analysis = self._perform_comparative_analysis(scenario_results)
            
            return {
                'success': True,
                'scenarios': scenario_results,
                'comparison': comparison_analysis
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def forecast_costs(self, current_config: Dict, months: int = 12, 
                       growth_rate: float = 0.1) -> Dict:
        """Proyectar costos futuros"""
        
        try:
            # Calcular costo actual
            current_result = self.calculate_workload_cost(current_config)
            
            if not current_result['success']:
                return current_result
            
            current_cost = current_result['report']['total_cost']
            
            # Proyección con diferentes escenarios
            forecast_scenarios = {
                'conservative': growth_rate * 0.5,
                'moderate': growth_rate,
                'aggressive': growth_rate * 1.5
            }
            
            forecasts = {}
            
            for scenario_name, scenario_rate in forecast_scenarios.items():
                forecast_data = self._generate_forecast(
                    current_cost, scenario_rate, months
                )
                forecasts[scenario_name] = forecast_data
            
            return {
                'success': True,
                'current_cost': current_cost,
                'forecasts': forecasts,
                'forecast_period_months': months
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def optimize_configuration(self, workload_config: Dict, 
                             optimization_level: str = 'balanced') -> Dict:
        """Optimizar configuración de workload"""
        
        try:
            # Calcular costo actual
            current_result = self.calculate_workload_cost(workload_config)
            
            if not current_result['success']:
                return current_result
            
            # Generar configuraciones optimizadas
            optimized_configs = self.optimization_engine.generate_optimized_configs(
                workload_config, optimization_level
            )
            
            # Evaluar configuraciones optimizadas
            best_config = None
            best_cost = float('inf')
            
            for config in optimized_configs:
                result = self.calculate_workload_cost(config)
                if result['success'] and result['report']['total_cost'] < best_cost:
                    best_cost = result['report']['total_cost']
                    best_config = config
                    best_config['cost_report'] = result['report']
            
            # Calcular ahorros
            savings = current_result['report']['total_cost'] - best_cost
            savings_percentage = (savings / current_result['report']['total_cost']) * 100
            
            return {
                'success': True,
                'original_config': workload_config,
                'original_cost': current_result['report']['total_cost'],
                'optimized_config': best_config,
                'optimized_cost': best_cost,
                'savings': savings,
                'savings_percentage': savings_percentage,
                'optimization_level': optimization_level
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_comprehensive_report(self, workload_config: Dict, 
                                    include_visualizations: bool = True) -> Dict:
        """Generar reporte comprehensivo"""
        
        try:
            # Calcular costo base
            cost_result = self.calculate_workload_cost(workload_config)
            
            if not cost_result['success']:
                return cost_result
            
            # Análisis detallado
            detailed_analysis = self._perform_detailed_analysis(workload_config)
            
            # Optimización
            optimization_result = self.optimize_configuration(workload_config)
            
            # Proyección
            forecast_result = self.forecast_costs(workload_config, months=12)
            
            # Generar visualizaciones
            visualizations = {}
            if include_visualizations:
                visualizations = self.visualization_engine.generate_visualizations(
                    cost_result['report'],
                    detailed_analysis,
                    optimization_result,
                    forecast_result
                )
            
            # Compilar reporte completo
            comprehensive_report = {
                'executive_summary': {
                    'workload_name': workload_config.get('name', 'Unknown'),
                    'total_cost': cost_result['report']['total_cost'],
                    'potential_savings': optimization_result.get('savings', 0),
                    'savings_percentage': optimization_result.get('savings_percentage', 0),
                    'roi_analysis': detailed_analysis.get('roi_analysis', {}),
                    'generated_at': datetime.utcnow().isoformat()
                },
                'cost_analysis': cost_result['report'],
                'detailed_analysis': detailed_analysis,
                'optimization_analysis': optimization_result,
                'forecast_analysis': forecast_result,
                'visualizations': visualizations,
                'recommendations': self._generate_executive_recommendations(
                    cost_result, optimization_result, detailed_analysis
                )
            }
            
            return {
                'success': True,
                'report': comprehensive_report
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _validate_workload_config(self, config: Dict) -> Dict:
        """Validar configuración de workload"""
        
        required_fields = ['name', 'components']
        
        for field in required_fields:
            if field not in config:
                return {
                    'valid': False,
                    'error': f'Missing required field: {field}'
                }
        
        if not config['components']:
            return {
                'valid': False,
                'error': 'No components specified'
            }
        
        # Validar cada componente
        for component_name, component_config in config['components'].items():
            if 'type' not in component_config:
                return {
                    'valid': False,
                    'error': f'Component {component_name} missing type'
                }
        
        return {'valid': True}
    
    def _calculate_component_cost(self, component_config: Dict) -> Dict:
        """Calcular costo de componente individual"""
        
        component_type = component_config['type']
        
        if component_type == 'ec2':
            return self.pricing_engine.calculate_ec2_cost(component_config)
        elif component_type == 's3':
            return self.pricing_engine.calculate_s3_cost(component_config)
        elif component_type == 'rds':
            return self.pricing_engine.calculate_rds_cost(component_config)
        elif component_type == 'lambda':
            return self.pricing_engine.calculate_lambda_cost(component_config)
        elif component_type == 'ebs':
            return self.pricing_engine.calculate_ebs_cost(component_config)
        elif component_type == 'cloudfront':
            return self.pricing_engine.calculate_cloudfront_cost(component_config)
        elif component_type == 'rds':
            return self.pricing_engine.calculate_rds_cost(component_config)
        else:
            return {
                'success': False,
                'error': f'Unsupported component type: {component_type}'
            }
    
    def _perform_comparative_analysis(self, scenario_results: Dict) -> Dict:
        """Realizar análisis comparativo"""
        
        valid_scenarios = {
            name: result for name, result in scenario_results.items()
            if 'error' not in result
        }
        
        if not valid_scenarios:
            return {
                'cheapest_scenario': None,
                'most_expensive': None,
                'cost_range': 0,
                'recommendations': []
            }
        
        costs = {name: result['total_cost'] for name, result in valid_scenarios.items()}
        
        cheapest_scenario = min(costs, key=costs.get)
        most_expensive = max(costs, key=costs.get)
        cost_range = costs[most_expensive] - costs[cheapest_scenario]
        
        return {
            'cheapest_scenario': cheapest_scenario,
            'most_expensive': most_expensive,
            'cost_range': cost_range,
            'average_cost': sum(costs.values()) / len(costs),
            'recommendations': [
                {
                    'scenario': cheapest_scenario,
                    'type': 'COST_OPTIMAL',
                    'description': f'The cheapest scenario is {cheapest_scenario}',
                    'savings': cost_range
                }
            ]
        }
    
    def _generate_forecast(self, current_cost: float, growth_rate: float, months: int) -> Dict:
        """Generar proyección de costos"""
        
        projections = []
        cumulative_cost = 0
        
        for month in range(1, months + 1):
            projected_cost = current_cost * ((1 + growth_rate) ** month)
            cumulative_cost += projected_cost
            
            projections.append({
                'month': month,
                'projected_cost': projected_cost,
                'cumulative_cost': cumulative_cost
            })
        
        return {
            'projections': projections,
            'total_projected_cost': cumulative_cost,
            'average_monthly_cost': cumulative_cost / months,
            'growth_rate': growth_rate
        }
    
    def _perform_detailed_analysis(self, workload_config: Dict) -> Dict:
        """Realizar análisis detallado"""
        
        # Análisis de componentes
        component_analysis = {}
        total_cost = 0
        
        for component_name, component_config in workload_config.get('components', {}).items():
            cost_result = self._calculate_component_cost(component_config)
            if cost_result['success']:
                component_analysis[component_name] = {
                    'cost': cost_result['cost']['total_cost'],
                    'type': component_config['type'],
                    'config': component_config
                }
                total_cost += cost_result['cost']['total_cost']
        
        # Análisis de distribución de costos
        cost_distribution = {
            name: {
                'cost': data['cost'],
                'percentage': (data['cost'] / total_cost) * 100
            }
            for name, data in component_analysis.items()
        }
        
        # Análisis de ROI
        roi_analysis = self._calculate_roi_analysis(workload_config, total_cost)
        
        return {
            'component_analysis': component_analysis,
            'cost_distribution': cost_distribution,
            'roi_analysis': roi_analysis,
            'complexity_score': self._calculate_complexity_score(workload_config),
            'risk_assessment': self._assess_risks(workload_config)
        }
    
    def _calculate_roi_analysis(self, config: Dict, total_cost: float) -> Dict:
        """Calcular análisis de ROI"""
        
        # Simular análisis de ROI (en implementación real, usaría datos del negocio)
        monthly_revenue = config.get('estimated_monthly_revenue', 0)
        monthly_operational_cost = config.get('monthly_operational_cost', 0)
        
        if monthly_revenue > 0:
            monthly_profit = monthly_revenue - monthly_operational_cost - total_cost
            roi_percentage = (monthly_profit / total_cost) * 100 if total_cost > 0 else 0
            payback_period = total_cost / monthly_profit if monthly_profit > 0 else float('inf')
        else:
            roi_percentage = 0
            payback_period = float('inf')
        
        return {
            'monthly_revenue': monthly_revenue,
            'monthly_operational_cost': monthly_operational_cost,
            'aws_cost': total_cost,
            'monthly_profit': monthly_profit if monthly_revenue > 0 else 0,
            'roi_percentage': roi_percentage,
            'payback_period_months': payback_period,
            'annual_roi': roi_percentage * 12
        }
    
    def _calculate_complexity_score(self, config: Dict) -> float:
        """Calcular puntuación de complejidad"""
        
        complexity_factors = {
            'components': len(config.get('components', {})),
            'regions': len(set(comp.get('region', 'us-east-1') for comp in config.get('components', {}).values())),
            'services': len(set(comp.get('type') for comp in config.get('components', {}).values())),
            'integrations': sum(1 for comp in config.get('components', {}).values() if comp.get('integrations'))
        }
        
        # Ponderación de factores
        weights = {
            'components': 0.3,
            'regions': 0.2,
            'services': 0.3,
            'integrations': 0.2
        }
        
        complexity_score = sum(
            complexity_factors[factor] * weight 
            for factor, weight in weights.items()
        )
        
        # Normalizar a escala 0-100
        max_possible = sum(weights.values() * 10)  # Asumir máximo 10 para cada factor
        normalized_score = (complexity_score / max_possible) * 100
        
        return min(normalized_score, 100)
    
    def _assess_risks(self, config: Dict) -> Dict:
        """Evaluar riesgos"""
        
        risks = {
            'cost_risk': 'LOW',
            'complexity_risk': 'LOW',
            'scalability_risk': 'LOW',
            'security_risk': 'LOW'
        }
        
        # Evaluar riesgo de costos
        total_estimated_cost = 0
        for component_config in config.get('components', {}).values():
            if component_config.get('type') == 'ec2':
                total_estimated_cost += component_config.get('hours', 0) * 0.1  # Estimación simple
        
        if total_estimated_cost > 10000:
            risks['cost_risk'] = 'HIGH'
        elif total_estimated_cost > 5000:
            risks['cost_risk'] = 'MEDIUM'
        
        # Evaluar riesgo de complejidad
        complexity_score = self._calculate_complexity_score(config)
        if complexity_score > 70:
            risks['complexity_risk'] = 'HIGH'
        elif complexity_score > 40:
            risks['complexity_risk'] = 'MEDIUM'
        
        # Evaluar riesgo de escalabilidad
        has_auto_scaling = any(
            comp.get('auto_scaling', False) 
            for comp in config.get('components', {}).values()
        )
        if not has_auto_scaling:
            risks['scalability_risk'] = 'MEDIUM'
        
        return risks
    
    def _generate_executive_recommendations(self, cost_result: Dict, 
                                          optimization_result: Dict,
                                          detailed_analysis: Dict) -> List[Dict]:
        """Generar recomendaciones ejecutivas"""
        
        recommendations = []
        
        # Recomendaciones de optimización
        if optimization_result.get('savings', 0) > 0:
            recommendations.append({
                'priority': 'HIGH',
                'category': 'COST_OPTIMIZATION',
                'title': 'Implement Cost Optimization',
                'description': f'Potential savings of ${optimization_result["savings"]:.2f} identified',
                'action': 'Review and implement optimized configuration',
                'impact': 'HIGH'
            })
        
        # Recomendaciones de complejidad
        complexity_score = detailed_analysis.get('complexity_score', 0)
        if complexity_score > 70:
            recommendations.append({
                'priority': 'MEDIUM',
                'category': 'COMPLEXITY',
                'title': 'Simplify Architecture',
                'description': f'High complexity score of {complexity_score:.1f} detected',
                'action': 'Consider simplifying architecture or using managed services',
                'impact': 'MEDIUM'
            })
        
        # Recomendaciones de ROI
        roi_analysis = detailed_analysis.get('roi_analysis', {})
        if roi_analysis.get('roi_percentage', 0) < 20:
            recommendations.append({
                'priority': 'MEDIUM',
                'category': 'ROI',
                'title': 'Improve ROI',
                'description': f'Current ROI is {roi_analysis.get("roi_percentage", 0):.1f}%',
                'action': 'Review revenue projections and cost optimization',
                'impact': 'MEDIUM'
            })
        
        return recommendations


class PricingEngine:
    """Motor de cálculo de precios"""
    
    def __init__(self, pricing_client, region):
        self.pricing = pricing_client
        self.region = region
        self.price_cache = {}
    
    def calculate_ec2_cost(self, config: Dict) -> Dict:
        """Calcular costo de EC2"""
        
        try:
            instance_type = config['instance_type']
            hours = config['hours']
            quantity = config.get('quantity', 1)
            pricing_model = config.get('pricing_model', 'on-demand')
            platform = config.get('platform', 'linux')
            
            # Precios estándar (en implementación real, usaría Pricing API)
            standard_prices = {
                't3.micro': 0.0104,
                't3.small': 0.0208,
                't3.medium': 0.0416,
                't3.large': 0.0832,
                'm5.large': 0.096,
                'm5.xlarge': 0.192,
                'c5.large': 0.085,
                'c5.xlarge': 0.17
            }
            
            base_price = standard_prices.get(instance_type, 0.0416)
            
            # Aplicar descuentos según modelo
            if pricing_model == 'reserved':
                discount = 0.4  # 40% descuento
            elif pricing_model == 'spot':
                discount = 0.8  # 80% descuento
            else:
                discount = 0.0
            
            effective_price = base_price * (1 - discount)
            total_cost = effective_price * hours * quantity
            
            return {
                'success': True,
                'cost': {
                    'instance_type': instance_type,
                    'hours': hours,
                    'quantity': quantity,
                    'price_per_hour': effective_price,
                    'total_cost': total_cost,
                    'pricing_model': pricing_model,
                    'discount_percentage': discount * 100
                }
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def calculate_s3_cost(self, config: Dict) -> Dict:
        """Calcular costo de S3"""
        
        try:
            storage_gb = config['storage_gb']
            storage_class = config.get('storage_class', 'Standard')
            put_requests = config.get('put_requests', 0)
            get_requests = config.get('get_requests', 0)
            data_transfer_gb = config.get('data_transfer_gb', 0)
            
            # Precios estándar
            storage_prices = {
                'Standard': 0.023,
                'Intelligent-Tiering': 0.023,
                'Infrequent Access': 0.0125,
                'Glacier': 0.004,
                'Deep Archive': 0.00099
            }
            
            storage_cost = storage_prices.get(storage_class, 0.023) * storage_gb
            put_cost = (put_requests / 1000) * 0.005
            get_cost = (get_requests / 1000) * 0.0004
            transfer_cost = data_transfer_gb * 0.09
            
            total_cost = storage_cost + put_cost + get_cost + transfer_cost
            
            return {
                'success': True,
                'cost': {
                    'storage_gb': storage_gb,
                    'storage_class': storage_class,
                    'storage_cost': storage_cost,
                    'put_cost': put_cost,
                    'get_cost': get_cost,
                    'transfer_cost': transfer_cost,
                    'total_cost': total_cost
                }
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def calculate_rds_cost(self, config: Dict) -> Dict:
        """Calcular costo de RDS"""
        
        try:
            instance_type = config['instance_type']
            hours = config['hours']
            storage_gb = config.get('storage_gb', 20)
            multi_az = config.get('multi_az', False)
            engine = config.get('engine', 'mysql')
            
            # Precios estándar
            instance_prices = {
                'db.t3.micro': 0.089,
                'db.t3.small': 0.179,
                'db.t3.medium': 0.358,
                'db.m5.large': 0.215
            }
            
            instance_cost = instance_prices.get(instance_type, 0.089) * hours
            if multi_az:
                instance_cost *= 2.0
            
            storage_cost = storage_gb * 0.10
            backup_cost = storage_gb * 0.023
            
            total_cost = instance_cost + storage_cost + backup_cost
            
            return {
                'success': True,
                'cost': {
                    'instance_type': instance_type,
                    'hours': hours,
                    'instance_cost': instance_cost,
                    'storage_cost': storage_cost,
                    'backup_cost': backup_cost,
                    'total_cost': total_cost,
                    'multi_az': multi_az,
                    'engine': engine
                }
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def calculate_lambda_cost(self, config: Dict) -> Dict:
        """Calcular costo de Lambda"""
        
        try:
            invocations = config['invocations']
            duration_seconds = config['duration_seconds']
            memory_mb = config.get('memory_mb', 128)
            provisioned_concurrency = config.get('provisioned_concurrency', 0)
            
            # Precios estándar
            request_cost = (invocations / 1000000) * 0.20
            compute_cost = invocations * duration_seconds * memory_mb * 0.0000166667 / 1024
            provisioned_cost = provisioned_concurrency * memory_mb * 30 * 24 * 3600 * 0.0000041667 / 1024
            
            total_cost = request_cost + compute_cost + provisioned_cost
            
            return {
                'success': True,
                'cost': {
                    'invocations': invocations,
                    'duration_seconds': duration_seconds,
                    'memory_mb': memory_mb,
                    'request_cost': request_cost,
                    'compute_cost': compute_cost,
                    'provisioned_cost': provisioned_cost,
                    'total_cost': total_cost
                }
            }
            
        except Exception as e:
            return {'success': False', 'error': str(e)}


class AnalysisEngine:
    """Motor de análisis"""
    
    def __init__(self, cost_explorer_client):
        self.cost_explorer = cost_explorer_client
    
    def analyze_historical_costs(self, months: int = 12) -> Dict:
        """Analizar costos históricos"""
        
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=months * 30)
            
            response = self.cost_explorer.get_cost_and_usage(
                TimePeriod={
                    'Start': start_date.strftime('%Y-%m-%d'),
                    'End': end_date.strftime('%Y-%m-%d')
                },
                Granularity='MONTHLY',
                Metrics=['BlendedCost']
            )
            
            monthly_costs = []
            for result in response['ResultsByTime']:
                total_cost = 0
                for group in result['Groups']:
                    if 'BlendedCost' in group['Metrics']:
                        total_cost += float(group['Metrics']['BlendedCost']['Amount'])
                
                monthly_costs.append({
                    'period': result['TimePeriod']['Start'],
                    'cost': total_cost
                })
            
            return {
                'success': True,
                'monthly_costs': monthly_costs,
                'analysis_period_months': months
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}


class OptimizationEngine:
    """Motor de optimización"""
    
    def analyze_workload(self, workload_config: Dict, component_costs: Dict) -> Dict:
        """Analizar workload para optimización"""
        
        opportunities = []
        total_savings = 0
        
        # Analizar componentes EC2
        for component_name, cost in component_costs.items():
            if cost.get('pricing_model') == 'on-demand':
                potential_savings = cost['total_cost'] * 0.4  # 40% con Reserved
                opportunities.append({
                    'component': component_name,
                    'type': 'RESERVED_INSTANCES',
                    'potential_savings': potential_savings,
                    'description': 'Consider Reserved Instances for steady workloads'
                })
                total_savings += potential_savings
        
        # Analizar almacenamiento S3
        for component_name, cost in component_costs.items():
            if cost.get('storage_class') == 'Standard' and cost.get('storage_gb', 0) > 1000:
                potential_savings = cost['storage_cost'] * 0.1  # 10% con Intelligent-Tiering
                opportunities.append({
                    'component': component_name,
                    'type': 'STORAGE_OPTIMIZATION',
                    'potential_savings': potential_savings,
                    'description': 'Consider Intelligent-Tiering for large storage'
                })
                total_savings += potential_savings
        
        return {
            'opportunities': opportunities,
            'potential_savings': total_savings,
            'optimization_rate': (total_savings / sum(cost['total_cost'] for cost in component_costs.values())) * 100
        }
    
    def generate_optimized_configs(self, original_config: Dict, optimization_level: str) -> List[Dict]:
        """Generar configuraciones optimizadas"""
        
        optimized_configs = []
        
        # Configuración conservadora
        conservative_config = self._apply_conservative_optimization(original_config)
        optimized_configs.append(conservative_config)
        
        # Configuración balanceada
        if optimization_level in ['balanced', 'aggressive']:
            balanced_config = self._apply_balanced_optimization(original_config)
            optimized_configs.append(balanced_config)
        
        # Configuración agresiva
        if optimization_level == 'aggressive':
            aggressive_config = self._apply_aggressive_optimization(original_config)
            optimized_configs.append(aggressive_config)
        
        return optimized_configs
    
    def _apply_conservative_optimization(self, config: Dict) -> Dict:
        """Aplicar optimización conservadora"""
        
        optimized_config = config.copy()
        
        # Optimizar componentes EC2
        for component_name, component_config in optimized_config['components'].items():
            if component_config.get('type') == 'ec2':
                # Cambiar a Reserved si es on-demand
                if component_config.get('pricing_model') == 'on-demand':
                    component_config['pricing_model'] = 'reserved'
                    component_config['term'] = 'one_year'
                    component_config['payment_option'] = 'no_upfront'
        
        return optimized_config
    
    def _apply_balanced_optimization(self, config: Dict) -> Dict:
        """Aplicar optimización balanceada"""
        
        optimized_config = self._apply_conservative_optimization(config)
        
        # Optimización adicional
        for component_name, component_config in optimized_config['components'].items():
            if component_config.get('type') == 's3':
                # Cambiar a Intelligent-Tiering si es Standard y grande
                if (component_config.get('storage_class') == 'Standard' and 
                    component_config.get('storage_gb', 0) > 500):
                    component_config['storage_class'] = 'Intelligent-Tiering'
        
        return optimized_config
    
    def _apply_aggressive_optimization(self, config: Dict) -> Dict:
        """Aplicar optimización agresiva"""
        
        optimized_config = self._apply_balanced_optimization(config)
        
        # Optimización agresiva
        for component_name, component_config in optimized_config['components'].items():
            if component_config.get('type') == 'ec2':
                # Cambiar a Reserved de 3 años
                if component_config.get('pricing_model') == 'reserved':
                    component_config['term'] = 'three_year'
                    component_config['payment_option'] = 'partial_upfront'
        
        return optimized_config


class VisualizationEngine:
    """Motor de visualización"""
    
    def generate_visualizations(self, cost_report: Dict, detailed_analysis: Dict,
                               optimization_result: Dict, forecast_result: Dict) -> Dict:
        """Generar visualizaciones"""
        
        visualizations = {}
        
        # Gráfico de distribución de costos
        visualizations['cost_distribution'] = self._create_cost_distribution_chart(
            detailed_analysis.get('cost_distribution', {})
        )
        
        # Gráfico de optimización
        visualizations['optimization_comparison'] = self._create_optimization_chart(
            cost_report, optimization_result
        )
        
        # Gráfico de proyección
        visualizations['forecast_chart'] = self._create_forecast_chart(forecast_result)
        
        return visualizations
    
    def _create_cost_distribution_chart(self, cost_distribution: Dict) -> Dict:
        """Crear gráfico de distribución de costos"""
        
        # En implementación real, generaría gráfico con matplotlib/plotly
        return {
            'type': 'pie_chart',
            'data': cost_distribution,
            'title': 'Cost Distribution by Component'
        }
    
    def _create_optimization_chart(self, cost_report: Dict, optimization_result: Dict) -> Dict:
        """Crear gráfico de optimización"""
        
        comparison_data = {
            'Original Cost': cost_report['total_cost'],
            'Optimized Cost': optimization_result.get('optimized_cost', 0),
            'Savings': optimization_result.get('savings', 0)
        }
        
        return {
            'type': 'bar_chart',
            'data': comparison_data,
            'title': 'Cost Optimization Comparison'
        }
    
    def _create_forecast_chart(self, forecast_result: Dict) -> Dict:
        """Crear gráfico de proyección"""
        
        forecasts = forecast_result.get('forecasts', {})
        
        # En implementación real, generaría gráfico de líneas con múltiples escenarios
        return {
            'type': 'line_chart',
            'data': forecasts,
            'title': 'Cost Forecast (12 months)'
        }


class ExportEngine:
    """Motor de exportación"""
    
    def export_to_csv(self, report: Dict, filename: str) -> Dict:
        """Exportar a CSV"""
        
        try:
            # En implementación real, generaría archivo CSV
            return {
                'success': True,
                'filename': filename,
                'format': 'csv',
                'size': '2.5KB'
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def export_to_json(self, report: Dict, filename: str) -> Dict:
        """Exportar a JSON"""
        
        try:
            # En implementación real, generaría archivo JSON
            return {
                'success': True,
                'filename': filename,
                'format': 'json',
                'size': '5.2KB'
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def export_to_excel(self, report: Dict, filename: str) -> Dict:
        """Exportar a Excel"""
        
        try:
            # En implementación real, generaría archivo Excel
            return {
                'success': True,
                'filename': filename,
                'format': 'excel',
                'size': '15.8KB'
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
```

## Casos de Uso

### **1. Cálculo Básico de Workload**
```python
# Ejemplo: Calcular costo de workload básico
calculator = AWSCalculator('us-east-1')

# Configuración de workload
workload_config = {
    'name': 'Web Application',
    'components': {
        'web_servers': {
            'type': 'ec2',
            'instance_type': 't3.medium',
            'hours': 730,
            'quantity': 2,
            'pricing_model': 'on-demand'
        },
        'database': {
            'type': 'rds',
            'instance_type': 'db.t3.micro',
            'hours': 730,
            'storage_gb': 100,
            'multi_az': True
        },
        'storage': {
            'type': 's3',
            'storage_gb': 500,
            'storage_class': 'Standard',
            'put_requests': 10000,
            'get_requests': 50000
        }
    }
}

# Calcular costo
result = calculator.calculate_workload_cost(workload_config)

if result['success']:
    report = result['report']
    print(f"Workload: {report['workload_name']}")
    print(f"Total Cost: ${report['total_cost']:.2f}")
    print(f"Potential Savings: ${report['potential_savings']:.2f}")
    
    print("\nComponent Costs:")
    for component_name, cost in report['component_costs'].items():
        print(f"  {component_name}: ${cost['total_cost']:.2f}")
```

### **2. Comparación de Escenarios**
```python
# Ejemplo: Comparar diferentes escenarios
calculator = AWSCalculator('us-east-1')

# Definir escenarios
scenarios = [
    {
        'name': 'Basic Setup',
        'components': {
            'web_server': {
                'type': 'ec2',
                'instance_type': 't3.micro',
                'hours': 730,
                'quantity': 1
            },
            'storage': {
                'type': 's3',
                'storage_gb': 100
            }
        }
    },
    {
        'name': 'Production Setup',
        'components': {
            'web_servers': {
                'type': 'ec2',
                'instance_type': 't3.medium',
                'hours': 730,
                'quantity': 2,
                'pricing_model': 'reserved'
            },
            'database': {
                'type': 'rds',
                'instance_type': 'db.t3.small',
                'hours': 730,
                'storage_gb': 100,
                'multi_az': True
            }
        }
    }
]

# Comparar escenarios
comparison_result = calculator.compare_scenarios(scenarios)

if comparison_result['success']:
    comparison = comparison_result['comparison']
    
    print("Scenario Comparison:")
    for scenario_name, scenario in comparison_result['scenarios'].items():
        if 'error' not in scenario:
            print(f"  {scenario_name}: ${scenario['total_cost']:.2f}")
        else:
            print(f"  {scenario_name}: Error - {scenario['error']}")
    
    print(f"\nCheapest: {comparison['cheapest_scenario']}")
    print(f"Cost Range: ${comparison['cost_range']:.2f}")
```

### **3. Optimización de Configuración**
```python
# Ejemplo: Optimizar configuración
calculator = AWSCalculator('us-east-1')

# Configuración actual
current_config = {
    'name': 'Current Infrastructure',
    'components': {
        'web_servers': {
            'type': 'ec2',
            'instance_type': 't3.medium',
            'hours': 730,
            'quantity': 3,
            'pricing_model': 'on-demand'
        },
        'database': {
            'type': 'rds',
            'instance_type': 'db.t3.medium',
            'hours': 730,
            'storage_gb': 200,
            'multi_az': True
        }
    }
}

# Optimizar configuración
optimization_result = calculator.optimize_configuration(current_config, 'balanced')

if optimization_result['success']:
    print(f"Original Cost: ${optimization_result['original_cost']:.2f}")
    print(f"Optimized Cost: ${optimization_result['optimized_cost']:.2f}")
    print(f"Savings: ${optimization_result['savings']:.2f} ({optimization_result['savings_percentage']:.1f}%)")
    
    # Mostrar configuración optimizada
    optimized_config = optimization_result['optimized_config']
    print(f"\nOptimized Configuration:")
    for component_name, component in optimized_config['components'].items():
        print(f"  {component_name}:")
        for key, value in component.items():
            print(f"    {key}: {value}")
```

### **4. Proyección de Costos**
```python
# Ejemplo: Proyectar costos futuros
calculator = AWSCalculator('us-east-1')

# Configuración actual
current_config = {
    'name': 'Growing Application',
    'components': {
        'web_servers': {
            'type': 'ec2',
            'instance_type': 't3.medium',
            'hours': 730,
            'quantity': 2
        }
    },
    'estimated_monthly_revenue': 5000,
    'monthly_operational_cost': 1000
}

# Proyectar costos
forecast_result = calculator.forecast_costs(current_config, months=12, growth_rate=0.15)

if forecast_result['success']:
    print(f"Current Monthly Cost: ${forecast_result['current_cost']:.2f}")
    
    print("\n12-Month Forecast:")
    for scenario_name, forecast in forecast_result['forecasts'].items():
        print(f"\n{scenario_name.title()} Scenario:")
        print(f"  Total Projected: ${forecast['total_projected_cost']:.2f}")
        print(f"  Average Monthly: ${forecast['average_monthly_cost']:.2f}")
        print(f"  Growth Rate: {forecast['growth_rate']:.1%}")
```

### **5. Reporte Completo**
```python
# Ejemplo: Generar reporte completo
calculator = AWSCalculator('us-east-1')

# Configuración compleja
complex_config = {
    'name': 'E-commerce Platform',
    'components': {
        'web_tier': {
            'type': 'ec2',
            'instance_type': 't3.medium',
            'hours': 730,
            'quantity': 3,
            'pricing_model': 'on-demand'
        },
        'app_tier': {
            'type': 'ec2',
            'instance_type': 't3.large',
            'hours': 730,
            'quantity': 2
        },
        'database': {
            'type': 'rds',
            'instance_type': 'db.t3.medium',
            'hours': 730,
            'storage_gb': 500,
            'multi_az': True
        },
        'cache': {
            'type': 'ec2',
            'instance_type': 'cache.t3.micro',
            'hours': 730,
            'quantity': 2
        },
        'storage': {
            'type': 's3',
            'storage_gb': 1000,
            'storage_class': 'Intelligent-Tiering',
            'put_requests': 50000,
            'get_requests': 200000
        }
    },
    'estimated_monthly_revenue': 15000,
    'monthly_operational_cost': 3000
}

# Generar reporte completo
report_result = calculator.generate_comprehensive_report(complex_config, include_visualizations=True)

if report_result['success']:
    report = report_result['report']
    
    # Resumen ejecutivo
    executive = report['executive_summary']
    print(f"Executive Summary: {executive['workload_name']}")
    print(f"Total Cost: ${executive['total_cost']:.2f}")
    print(f"Potential Savings: ${executive['potential_savings']:.2f}")
    print(f"Savings Percentage: {executive['savings_percentage']:.1f}%")
    
    # Análisis de ROI
    roi = executive['roi_analysis']
    print(f"\nROI Analysis:")
    print(f"  Monthly Revenue: ${roi['monthly_revenue']:,.2f}")
    print(f"  Monthly Profit: ${roi['monthly_profit']:,.2f}")
    print(f"  ROI: {roi['roi_percentage']:.1f}%")
    print(f"  Payback Period: {roi['payback_period_months']:.1f} months")
    
    # Recomendaciones
    recommendations = report['recommendations']
    print(f"\nRecommendations: {len(recommendations)}")
    for i, rec in enumerate(recommendations, 1):
        print(f"  {i}. [{rec['priority']}] {rec['title']}")
        print(f"     {rec['description']}")
        print(f"     Impact: {rec['impact']}")
```

## Configuración y Uso

### **Instalación y Configuración**
```bash
# Instalar dependencias
pip install boto3 pandas numpy matplotlib seaborn

# Configurar credenciales de AWS
aws configure
```

### **Uso Básico**
```python
# Importar y configurar
from aws_calculator import AWSCalculator

calculator = AWSCalculator('us-east-1')

# Calcular costo
result = calculator.calculate_workload_cost(workload_config)
```

### **Exportación de Resultados**
```python
# Exportar a diferentes formatos
export_engine = ExportEngine()

# Exportar a CSV
csv_result = export_engine.export_to_csv(report, 'cost_analysis.csv')

# Exportar a Excel
excel_result = export_engine.export_to_excel(report, 'cost_analysis.xlsx')
```

## Mejores Prácticas

### **1. Configuración de Workloads**
- **Detailed Configuration**: Configuración detallada de componentes
- **Realistic Parameters**: Parámetros realistas de uso
- **Regular Updates**: Actualización regular de configuraciones
- **Validation**: Validación de configuraciones antes del cálculo
- **Documentation**: Documentación de suposiciones y parámetros

### **2. Análisis de Costos**
- **Multiple Scenarios**: Análisis de múltiples escenarios
- **Historical Data**: Uso de datos históricos para proyecciones
- **Regular Reviews**: Revisión regular de análisis
- **Benchmarking**: Comparación con benchmarks
- **Continuous Improvement**: Mejora continua de análisis

### **3. Optimización**
- **Balanced Approach**: Enfoque balanceado de optimización
- **Risk Assessment**: Evaluación de riesgos de optimización
- **Gradual Implementation**: Implementación gradual de cambios
- **Performance Monitoring**: Monitoreo de rendimiento post-optimización
- **Rollback Planning**: Planificación de rollback si es necesario

### **4. Reportes y Visualizaciones**
- **Executive Summaries**: Resúmenes ejecutivos claros
- **Detailed Analysis**: Análisis detallados para técnicos
- **Visual Clarity**: Claridad visual en gráficos
- **Actionable Insights**: Insights accionables
- **Regular Reporting**: Reportes regulares y consistentes

## Integración con Herramientas

### **AWS Services**
- **Cost Explorer**: Integración con Cost Explorer
- **Budgets**: Integración con AWS Budgets
- **CloudWatch**: Monitoreo de métricas
- **S3**: Almacenamiento de reportes
- **Lambda**: Automatización de cálculos

### **Third-party Tools**
- **Excel/Google Sheets**: Exportación a hojas de cálculo
- **Power BI/Tableau**: Visualización avanzada
- **Slack/Teams**: Notificaciones y alertas
- **Jira**: Integración con gestión de proyectos
- **Git**: Version control de configuraciones

## Métricas y KPIs

### **Métricas de Costos**
- **Total Cost**: Costo total mensual
- **Cost per Component**: Costo por componente
- **Cost Growth Rate**: Tasa de crecimiento de costos
- **Cost Variance**: Varianza de costos
- **Optimization Rate**: Tasa de optimización

### **KPIs de Negocio**
- **ROI**: Retorno de inversión
- **Payback Period**: Período de recuperación
- **Cost Efficiency**: Eficiencia de costos
- **Budget Adherence**: Adherencia al presupuesto
- **Savings Achieved**: Ahorros realizados

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

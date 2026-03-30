# AWS Savings Plans

## Definición

AWS Savings Plans es un modelo de precios flexible que ofrece ahorros significativos en comparación con los precios On-Demand a cambio de un compromiso de uso de uno o tres años. A diferencia de las Reserved Instances, los Savings Plans proporcionan flexibilidad para usar los ahorros en diferentes tipos de instancias, familias y regiones, lo que los hace ideales para workloads variables y cambiantes.

## Tipos de Savings Plans

### **1. Compute Savings Plans**
- **Descripción**: Ahorros en servicios de computación EC2 y Fargate
- **Flexibilidad**: Cambio entre tipos de instancia, familias y regiones
- **Ahorros**: Hasta 66% de descuento sobre precios On-Demand
- **Compromiso**: 1 o 3 años
- **Aplicable a**: EC2, Fargate, Lambda

### **2. SageMaker Savings Plans**
- **Descripción**: Ahorros en servicios de machine learning
- **Flexibilidad**: Uso en diferentes instancias de SageMaker
- **Ahorros**: Hasta 64% de descuento
- **Compromiso**: 1 o 3 años
- **Aplicable a**: SageMaker Notebook, Training, Processing

### **3. Machine Learning Savings Plans**
- **Descripción**: Ahorros en servicios de ML de AWS
- **Flexibilidad**: Uso en diferentes servicios ML
- **Ahorros**: Hasta 64% de descuento
- **Compromiso**: 1 o 3 años
- **Aplicable a**: SageMaker, AWS Inferentia, AWS Trainium

## Estructura de Precios de Savings Plans

### **Compute Savings Plans Pricing**
```
Compute Savings Plans Structure
├── Commitment Options
│   ├── 1 Year Commitment
│   │   ├── No Upfront: 42% de descuento
│   │   ├── Partial Upfront: 44% de descuento
│   │   └── All Upfront: 45% de descuento
│   └── 3 Year Commitment
│       ├── No Upfront: 60% de descuento
│       ├── Partial Upfront: 63% de descuento
│       └── All Upfront: 66% de descuento
├── Flexibility Options
│   ├── Instance Family Flexibility
│   ├── Region Flexibility
│   ├── Instance Size Flexibility
│   └── Platform Flexibility
└── Coverage Options
    ├── Regional Coverage
    ├── Instance Type Coverage
    └── Service Coverage
```

### **Comparación con Reserved Instances**
```
Savings Plans vs Reserved Instances
├── Flexibility
│   ├── Savings Plans: Alta flexibilidad
│   │   ├── Cambio entre tipos de instancia
│   │   ├── Cambio entre familias
│   │   ├── Cambio entre regiones
│   │   └── Cambio entre servicios
│   └── Reserved Instances: Baja flexibilidad
│       ├── Fijo a tipo de instancia
│       ├── Fijo a región
│       ├── Fijo a plataforma
│       └── Fijo a tenancy
├── Ahorros
│   ├── Savings Plans: 42-66% de descuento
│   └── Reserved Instances: 40-60% de descuento
├── Compromiso
│   ├── Savings Plans: Compromiso de uso
│   └── Reserved Instances: Compromiso de capacidad
└── Casos de Uso
    ├── Savings Plans: Workloads variables
    └── Reserved Instances: Workloads estables
```

## Configuración de AWS Savings Plans

### **Gestión Completa de AWS Savings Plans**
```python
import boto3
import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class SavingsPlansManager:
    def __init__(self, region='us-east-1'):
        self.savings_plans = boto3.client('savings-plans', region_name=region)
        self.pricing = boto3.client('pricing', region_name=region)
        self.cost_explorer = boto3.client('ce', region_name=region)
        self.ec2 = boto3.client('ec2', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.region = region
    
    def create_savings_plan(self, savings_plan_offering_id, commitment, 
                           upfront_amount=None, client_token=None, tags=None):
        """Crear Savings Plan"""
        
        try:
            params = {
                'savingsPlanOfferingId': savings_plan_offering_id,
                'commitment': commitment
            }
            
            if upfront_amount:
                params['upfrontAmount'] = upfront_amount
            
            if client_token:
                params['clientToken'] = client_token
            
            if tags:
                params['tags'] = tags
            
            response = self.savings_plans.create_savings_plan(**params)
            
            return {
                'success': True,
                'savings_plan_id': response['savingsPlanId'],
                'status': response['savingsPlanState']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_savings_plans(self, savings_plan_ids=None, states=None, filters=None):
        """Describir Savings Plans"""
        
        try:
            params = {}
            
            if savings_plan_ids:
                params['savingsPlanIds'] = savings_plan_ids
            
            if states:
                params['states'] = states
            
            if filters:
                params['filters'] = filters
            
            response = self.savings_plans.describe_savings_plans(**params)
            
            savings_plans = []
            for sp in response['savingsPlans']:
                sp_info = {
                    'savings_plan_id': sp['savingsPlanId'],
                    'savings_plan_arn': sp['savingsPlanArn'],
                    'savings_plan_type': sp['savingsPlanType'],
                    'state': sp['state'],
                    'region': sp.get('region', ''),
                    'start': sp['start'].isoformat(),
                    'end': sp.get('end', '').isoformat() if sp.get('end') else '',
                    'commitment': sp['commitment'],
                    'upfront_amount': sp.get('upfrontAmount', 0),
                    'recurring_payment_amount': sp.get('recurringPaymentAmount', 0),
                    'currency': sp.get('currency', 'USD'),
                    'product_types': sp.get('productTypes', []),
                    'tags': sp.get('tags', [])
                }
                savings_plans.append(sp_info)
            
            return {
                'success': True,
                'savings_plans': savings_plans,
                'count': len(savings_plans)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_savings_plan(self, savings_plan_id):
        """Eliminar Savings Plan"""
        
        try:
            response = self.savings_plans.delete_savings_plan(
                savingsPlanId=savings_plan_id
            )
            
            return {
                'success': True,
                'savings_plan_id': savings_plan_id,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_savings_plan_rates(self, savings_plan_id, filters=None):
        """Describir tasas de Savings Plan"""
        
        try:
            params = {'savingsPlanId': savings_plan_id}
            
            if filters:
                params['filters'] = filters
            
            response = self.savings_plans.describe_savings_plan_rates(**params)
            
            rates = []
            for rate in response['searchResults']:
                rate_info = {
                    'savings_plan_id': rate['savingsPlanId'],
                    'rate_code': rate['rateCode'],
                    'unit': rate['unit'],
                    'product_type': rate['productType'],
                    'service_code': rate['serviceCode'],
                    'usage_type': rate['usageType'],
                    'operation': rate['operation'],
                    'properties': rate.get('properties', {}),
                    'rate': rate.get('rate', 0),
                    'currency': rate.get('currency', 'USD')
                }
                rates.append(rate_info)
            
            return {
                'success': True,
                'rates': rates,
                'count': len(rates)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_savings_plan_offerings(self, savings_plan_type=None, product_type=None,
                                       service_code=None, usage_type=None, operation=None,
                                       filters=None, max_results=100):
        """Describir ofertas de Savings Plans"""
        
        try:
            params = {'maxResults': max_results}
            
            if savings_plan_type:
                params['savingsPlanType'] = savings_plan_type
            
            if product_type:
                params['productType'] = product_type
            
            if service_code:
                params['serviceCode'] = service_code
            
            if usage_type:
                params['usageType'] = usage_type
            
            if operation:
                params['operation'] = operation
            
            if filters:
                params['filters'] = filters
            
            response = self.savings_plans.describe_savings_plan_offerings(**params)
            
            offerings = []
            for offering in response['searchResults']:
                offering_info = {
                    'offering_id': offering['offeringId'],
                    'savings_plan_type': offering['savingsPlanType'],
                    'product_type': offering['productType'],
                    'service_code': offering['serviceCode'],
                    'usage_type': offering['usageType'],
                    'operation': offering['operation'],
                    'properties': offering.get('properties', {}),
                    'options': offering.get('options', {}),
                    'payment_option': offering.get('paymentOption', ''),
                    'plan_type': offering.get('planType', ''),
                    'duration_seconds': offering.get('durationSeconds', 0),
                    'currency': offering.get('currency', 'USD')
                }
                offerings.append(offering_info)
            
            return {
                'success': True,
                'offerings': offerings,
                'count': len(offerings),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_savings_plan_recommendation(self, usage_type, commitment_amount, 
                                          commitment_term='ONE_YEAR', payment_option='NO_UPFRONT'):
        """Crear recomendación de Savings Plan"""
        
        try:
            # Obtener ofertas disponibles
            offerings_result = self.describe_savings_plan_offerings(
                savings_plan_type='Compute',
                usage_type=usage_type,
                filters=[
                    {'name': 'region', 'values': [self.region]},
                    {'name': 'commitment', 'values': [commitment_amount]},
                    {'name': 'term', 'values': [commitment_term]},
                    {'name': 'paymentOption', 'values': [payment_option]}
                ]
            )
            
            if not offerings_result['success']:
                return offerings_result
            
            # Seleccionar mejor oferta
            best_offering = None
            for offering in offerings_result['offerings']:
                if offering['payment_option'] == payment_option:
                    best_offering = offering
                    break
            
            if not best_offering:
                return {
                    'success': False,
                    'error': 'No suitable offering found'
                }
            
            # Calcular ahorros estimados
            on_demand_cost = commitment_amount * 12  # Estimación simple
            savings_percentage = 0.42 if commitment_term == 'ONE_YEAR' else 0.60
            savings_amount = on_demand_cost * savings_percentage
            effective_cost = on_demand_cost - savings_amount
            
            recommendation = {
                'offering_id': best_offering['offering_id'],
                'savings_plan_type': best_offering['savings_plan_type'],
                'commitment_amount': commitment_amount,
                'commitment_term': commitment_term,
                'payment_option': payment_option,
                'on_demand_cost': on_demand_cost,
                'savings_percentage': savings_percentage * 100,
                'savings_amount': savings_amount,
                'effective_cost': effective_cost,
                'region': self.region,
                'created_at': datetime.utcnow().isoformat()
            }
            
            return {
                'success': True,
                'recommendation': recommendation
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def calculate_savings_plan_coverage(self, start_date, end_date):
        """Calcular cobertura de Savings Plans"""
        
        try:
            # Obtener datos de uso de Cost Explorer
            response = self.cost_explorer.get_savings_plans_coverage(
                TimePeriod={
                    'Start': start_date,
                    'End': end_date
                },
                Granularity='MONTHLY',
                Metrics=['SavingsPlanCoverage']
            )
            
            coverage_data = []
            for result in response['SavingsPlansCoverages']:
                coverage_info = {
                    'period_start': result['TimePeriod']['Start'],
                    'period_end': result['TimePeriod']['End'],
                    'total_coverage_percentage': result['Total'].get('CoveragePercentage', 0),
                    'savings_plans': []
                }
                
                for sp in result.get('SavingsPlans', []):
                    sp_info = {
                        'savings_plan_arn': sp['SavingsPlanArn'],
                        'coverage_percentage': sp['CoveragePercentage'],
                        'attributes': sp.get('Attributes', {})
                    }
                    coverage_info['savings_plans'].append(sp_info)
                
                coverage_data.append(coverage_info)
            
            return {
                'success': True,
                'coverage_data': coverage_data,
                'count': len(coverage_data)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def calculate_savings_plan_utilization(self, start_date, end_date):
        """Calcular utilización de Savings Plans"""
        
        try:
            # Obtener datos de utilización de Cost Explorer
            response = self.cost_explorer.get_savings_plans_utilization(
                TimePeriod={
                    'Start': start_date,
                    'End': end_date
                },
                Granularity='MONTHLY'
            )
            
            utilization_data = []
            for result in response['SavingsPlansUtilizations']:
                utilization_info = {
                    'period_start': result['TimePeriod']['Start'],
                    'period_end': result['TimePeriod']['End'],
                    'total_utilization_percentage': result['Total'].get('UtilizationPercentage', 0),
                    'amortized_commitment': result['Total'].get('AmortizedCommitment', {}).get('Amount', 0),
                    'savings_value': result['Total'].get('SavingsValue', {}).get('Amount', 0),
                    'savings_plans': []
                }
                
                for sp in result.get('SavingsPlans', []):
                    sp_info = {
                        'savings_plan_arn': sp['SavingsPlanArn'],
                        'utilization_percentage': sp['UtilizationPercentage'],
                        'amortized_commitment': sp.get('AmortizedCommitment', {}).get('Amount', 0),
                        'savings_value': sp.get('SavingsValue', {}).get('Amount', 0),
                        'attributes': sp.get('Attributes', {})
                    }
                    utilization_info['savings_plans'].append(sp_info)
                
                utilization_data.append(utilization_info)
            
            return {
                'success': True,
                'utilization_data': utilization_data,
                'count': len(utilization_data)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_savings_plans_performance(self, months=6):
        """Analizar rendimiento de Savings Plans"""
        
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=months * 30)
            
            # Obtener datos de cobertura y utilización
            coverage_result = self.calculate_savings_plan_coverage(
                start_date.strftime('%Y-%m-%d'),
                end_date.strftime('%Y-%m-%d')
            )
            
            utilization_result = self.calculate_savings_plan_utilization(
                start_date.strftime('%Y-%m-%d'),
                end_date.strftime('%Y-%m-%d')
            )
            
            if not coverage_result['success'] or not utilization_result['success']:
                return {
                    'success': False,
                    'error': 'Failed to retrieve performance data'
                }
            
            # Analizar rendimiento
            performance_analysis = {
                'analysis_period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'months': months
                },
                'coverage_metrics': {
                    'average_coverage': 0,
                    'max_coverage': 0,
                    'min_coverage': 100,
                    'trend': 'STABLE'
                },
                'utilization_metrics': {
                    'average_utilization': 0,
                    'max_utilization': 0,
                    'min_utilization': 100,
                    'trend': 'STABLE'
                },
                'savings_metrics': {
                    'total_savings': 0,
                    'average_monthly_savings': 0,
                    'savings_efficiency': 0
                },
                'recommendations': []
            }
            
            # Calcular métricas de cobertura
            coverage_values = []
            for coverage in coverage_result['coverage_data']:
                coverage_values.append(coverage['total_coverage_percentage'])
            
            if coverage_values:
                performance_analysis['coverage_metrics']['average_coverage'] = sum(coverage_values) / len(coverage_values)
                performance_analysis['coverage_metrics']['max_coverage'] = max(coverage_values)
                performance_analysis['coverage_metrics']['min_coverage'] = min(coverage_values)
            
            # Calcular métricas de utilización
            utilization_values = []
            total_savings = 0
            
            for utilization in utilization_result['utilization_data']:
                utilization_values.append(utilization['total_utilization_percentage'])
                total_savings += utilization['savings_value']
            
            if utilization_values:
                performance_analysis['utilization_metrics']['average_utilization'] = sum(utilization_values) / len(utilization_values)
                performance_analysis['utilization_metrics']['max_utilization'] = max(utilization_values)
                performance_analysis['utilization_metrics']['min_utilization'] = min(utilization_values)
            
            performance_analysis['savings_metrics']['total_savings'] = total_savings
            performance_analysis['savings_metrics']['average_monthly_savings'] = total_savings / months
            
            # Calcular eficiencia de ahorros
            if performance_analysis['coverage_metrics']['average_coverage'] > 0:
                performance_analysis['savings_metrics']['savings_efficiency'] = (
                    performance_analysis['utilization_metrics']['average_utilization'] / 
                    performance_analysis['coverage_metrics']['average_coverage']
                ) * 100
            
            # Generar recomendaciones
            recommendations = []
            
            if performance_analysis['utilization_metrics']['average_utilization'] < 70:
                recommendations.append({
                    'priority': 'HIGH',
                    'category': 'UTILIZATION',
                    'title': 'Low utilization detected',
                    'description': f'Average utilization is {performance_analysis["utilization_metrics"]["average_utilization"]:.1f}%',
                    'action': 'Consider reducing commitment or increasing workload'
                })
            
            if performance_analysis['coverage_metrics']['average_coverage'] < 80:
                recommendations.append({
                    'priority': 'MEDIUM',
                    'category': 'COVERAGE',
                    'title': 'Low coverage detected',
                    'description': f'Average coverage is {performance_analysis["coverage_metrics"]["average_coverage"]:.1f}%',
                    'action': 'Consider increasing commitment or optimizing workloads'
                })
            
            if performance_analysis['savings_metrics']['savings_efficiency'] < 80:
                recommendations.append({
                    'priority': 'MEDIUM',
                    'category': 'EFFICIENCY',
                    'title': 'Low savings efficiency',
                    'description': f'Savings efficiency is {performance_analysis["savings_metrics"]["savings_efficiency"]:.1f}%',
                    'action': 'Review workload patterns and adjust commitments'
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
    
    def optimize_savings_plans_portfolio(self, current_usage, budget_constraints):
        """Optimizar portafolio de Savings Plans"""
        
        try:
            optimization_result = {
                'current_portfolio': {},
                'recommended_portfolio': {},
                'optimization_opportunities': [],
                'projected_savings': 0,
                'implementation_steps': []
            }
            
            # Obtener Savings Plans actuales
            current_plans_result = self.describe_savings_plans(states=['active', 'pending'])
            if current_plans_result['success']:
                optimization_result['current_portfolio'] = {
                    'total_plans': current_plans_result['count'],
                    'total_commitment': sum(sp['commitment']['Amount'] for sp in current_plans_result['savings_plans']),
                    'total_upfront': sum(sp['upfront_amount'] for sp in current_plans_result['savings_plans'])
                }
            
            # Analizar patrones de uso
            usage_patterns = self._analyze_usage_patterns(current_usage)
            
            # Generar recomendaciones de optimización
            recommendations = self._generate_optimization_recommendations(
                usage_patterns, 
                budget_constraints,
                optimization_result['current_portfolio']
            )
            
            optimization_result['recommended_portfolio'] = recommendations['portfolio']
            optimization_result['optimization_opportunities'] = recommendations['opportunities']
            optimization_result['projected_savings'] = recommendations['projected_savings']
            optimization_result['implementation_steps'] = recommendations['implementation_steps']
            
            return {
                'success': True,
                'optimization_result': optimization_result
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _analyze_usage_patterns(self, current_usage):
        """Analizar patrones de uso"""
        
        # Simulación de análisis de patrones de uso
        patterns = {
            'compute_usage': {
                'daily_average': 100,  # horas
                'peak_hours': 150,
                'off_peak_hours': 50,
                'instance_types': {
                    't3.micro': 40,
                    't3.small': 30,
                    't3.medium': 20,
                    'm5.large': 10
                },
                'regions': {
                    'us-east-1': 60,
                    'us-west-2': 25,
                    'eu-west-1': 15
                }
            },
            'variability': {
                'daily_variance': 0.3,
                'weekly_variance': 0.2,
                'monthly_variance': 0.15
            },
            'trends': {
                'growth_rate': 0.05,  # 5% mensual
                'seasonality': 'MODERATE'
            }
        }
        
        return patterns
    
    def _generate_optimization_recommendations(self, usage_patterns, budget_constraints, current_portfolio):
        """Generar recomendaciones de optimización"""
        
        recommendations = {
            'portfolio': {},
            'opportunities': [],
            'projected_savings': 0,
            'implementation_steps': []
        }
        
        # Analizar oportunidades de optimización
        compute_usage = usage_patterns['compute_usage']
        
        # Recomendación 1: Ajustar compromiso basado en uso promedio
        recommended_commitment = compute_usage['daily_average'] * 0.8  # 80% de uso promedio
        
        if recommended_commitment != current_portfolio.get('total_commitment', 0):
            recommendations['opportunities'].append({
                'type': 'COMMITMENT_ADJUSTMENT',
                'description': 'Adjust commitment to match actual usage patterns',
                'current_commitment': current_portfolio.get('total_commitment', 0),
                'recommended_commitment': recommended_commitment,
                'potential_savings': abs(current_portfolio.get('total_commitment', 0) - recommended_commitment) * 0.1
            })
        
        # Recomendación 2: Cambiar a Compute Savings Plans si hay Reserved Instances
        recommendations['opportunities'].append({
            'type': 'PLAN_TYPE_OPTIMIZATION',
            'description': 'Migrate to Compute Savings Plans for better flexibility',
            'current_type': 'Reserved Instances',
            'recommended_type': 'Compute Savings Plans',
            'potential_savings': 500.00  # Estimación
        })
        
        # Recomendación 3: Optimizar término de compromiso
        if usage_patterns['variability']['monthly_variance'] < 0.2:
            recommendations['opportunities'].append({
                'type': 'TERM_OPTIMIZATION',
                'description': 'Extend to 3-year term for stable workloads',
                'current_term': '1_YEAR',
                'recommended_term': '3_YEAR',
                'potential_savings': 300.00
            })
        
        # Calcular ahorros proyectados
        recommendations['projected_savings'] = sum(opp['potential_savings'] for opp in recommendations['opportunities'])
        
        # Generar pasos de implementación
        recommendations['implementation_steps'] = [
            'Review current usage patterns and commitments',
            'Calculate optimal commitment amounts',
            'Purchase new Savings Plans with adjusted commitments',
            'Monitor performance and coverage',
            'Adjust commitments based on actual usage'
        ]
        
        return recommendations
```

## Casos de Uso

### **1. Crear Compute Savings Plan**
```python
# Ejemplo: Crear Compute Savings Plan
manager = SavingsPlansManager('us-east-1')

# Obtener ofertas disponibles
offerings_result = manager.describe_savings_plan_offerings(
    savings_plan_type='Compute',
    usage_type='BoxUsage',
    filters=[
        {'name': 'region', 'values': ['us-east-1']},
        {'name': 'term', 'values': ['ONE_YEAR']},
        {'name': 'paymentOption', 'values': ['NO_UPFRONT']}
    ]
)

if offerings_result['success']:
    offerings = offerings_result['offerings']
    print(f"Available Compute Savings Plans: {offerings_result['count']}")
    
    # Seleccionar primera oferta
    if offerings:
        selected_offering = offerings[0]
        print(f"Selected Offering ID: {selected_offering['offering_id']}")
        
        # Crear Savings Plan
        create_result = manager.create_savings_plan(
            savings_plan_offering_id=selected_offering['offering_id'],
            commitment='10.00',  # $10.00 por hora
            tags=[
                {'Key': 'Environment', 'Value': 'Production'},
                {'Key': 'Department', 'Value': 'Engineering'}
            ]
        )
        
        if create_result['success']:
            print(f"Savings Plan created:")
            print(f"  ID: {create_result['savings_plan_id']}")
            print(f"  Status: {create_result['status']}")
```

### **2. Analizar Rendimiento de Savings Plans**
```python
# Ejemplo: Analizar rendimiento de Savings Plans
manager = SavingsPlansManager('us-east-1')

# Analizar rendimiento de últimos 6 meses
performance_result = manager.analyze_savings_plans_performance(months=6)

if performance_result['success']:
    performance = performance_result['performance_analysis']
    
    print(f"Savings Plans Performance Analysis")
    print(f"  Analysis Period: {performance['analysis_period']['months']} months")
    
    coverage = performance['coverage_metrics']
    print(f"\nCoverage Metrics:")
    print(f"  Average Coverage: {coverage['average_coverage']:.1f}%")
    print(f"  Max Coverage: {coverage['max_coverage']:.1f}%")
    print(f"  Min Coverage: {coverage['min_coverage']:.1f}%")
    print(f"  Trend: {coverage['trend']}")
    
    utilization = performance['utilization_metrics']
    print(f"\nUtilization Metrics:")
    print(f"  Average Utilization: {utilization['average_utilization']:.1f}%")
    print(f"  Max Utilization: {utilization['max_utilization']:.1f}%")
    print(f"  Min Utilization: {utilization['min_utilization']:.1f}%")
    print(f"  Trend: {utilization['trend']}")
    
    savings = performance['savings_metrics']
    print(f"\nSavings Metrics:")
    print(f"  Total Savings: ${savings['total_savings']:.2f}")
    print(f"  Average Monthly Savings: ${savings['average_monthly_savings']:.2f}")
    print(f"  Savings Efficiency: {savings['savings_efficiency']:.1f}%")
    
    # Recomendaciones
    recommendations = performance['recommendations']
    print(f"\nRecommendations: {len(recommendations)}")
    for rec in recommendations:
        print(f"  [{rec['priority']}] {rec['title']}")
        print(f"    {rec['description']}")
        print(f"    Action: {rec['action']}")
```

### **3. Calcular Cobertura y Utilización**
```python
# Ejemplo: Calcular cobertura y utilización
manager = SavingsPlansManager('us-east-1')

# Calcular cobertura del último mes
end_date = datetime.utcnow()
start_date = end_date - timedelta(days=30)

coverage_result = manager.calculate_savings_plan_coverage(
    start_date.strftime('%Y-%m-%d'),
    end_date.strftime('%Y-%m-%d')
)

utilization_result = manager.calculate_savings_plan_utilization(
    start_date.strftime('%Y-%m-%d'),
    end_date.strftime('%Y-%m-%d')
)

if coverage_result['success']:
    coverage_data = coverage_result['coverage_data']
    print(f"Coverage Analysis:")
    for coverage in coverage_data:
        print(f"  Period: {coverage['period_start']} to {coverage['period_end']}")
        print(f"  Total Coverage: {coverage['total_coverage_percentage']:.1f}%")
        print(f"  Savings Plans: {len(coverage['savings_plans'])}")

if utilization_result['success']:
    utilization_data = utilization_result['utilization_data']
    print(f"\nUtilization Analysis:")
    for utilization in utilization_data:
        print(f"  Period: {utilization['period_start']} to {utilization['period_end']}")
        print(f"  Total Utilization: {utilization['total_utilization_percentage']:.1f}%")
        print(f"  Amortized Commitment: ${utilization['amortized_commitment']:.2f}")
        print(f"  Savings Value: ${utilization['savings_value']:.2f}")
```

### **4. Optimizar Portafolio de Savings Plans**
```python
# Ejemplo: Optimizar portafolio
manager = SavingsPlansManager('us-east-1')

# Datos de uso simulados
current_usage = {
    'compute_hours': 730,  # horas por mes
    'instance_types': ['t3.micro', 't3.small', 't3.medium'],
    'regions': ['us-east-1', 'us-west-2']
}

budget_constraints = {
    'monthly_budget': 1000.00,
    'upfront_budget': 5000.00
}

# Optimizar portafolio
optimization_result = manager.optimize_savings_plans_portfolio(current_usage, budget_constraints)

if optimization_result['success']:
    optimization = optimization_result['optimization_result']
    
    print(f"Savings Plans Portfolio Optimization")
    
    current = optimization['current_portfolio']
    print(f"\nCurrent Portfolio:")
    print(f"  Total Plans: {current.get('total_plans', 0)}")
    print(f"  Total Commitment: ${current.get('total_commitment', 0):.2f}")
    print(f"  Total Upfront: ${current.get('total_upfront', 0):.2f}")
    
    recommended = optimization['recommended_portfolio']
    print(f"\nRecommended Portfolio:")
    # Mostrar detalles del portafolio recomendado
    
    opportunities = optimization['optimization_opportunities']
    print(f"\nOptimization Opportunities: {len(opportunities)}")
    for opp in opportunities:
        print(f"  {opp['type']}: {opp['description']}")
        print(f"    Potential Savings: ${opp['potential_savings']:.2f}")
    
    print(f"\nProjected Total Savings: ${optimization['projected_savings']:.2f}")
    
    steps = optimization['implementation_steps']
    print(f"\nImplementation Steps:")
    for i, step in enumerate(steps, 1):
        print(f"  {i}. {step}")
```

### **5. Generar Recomendaciones de Savings Plans**
```python
# Ejemplo: Generar recomendaciones
manager = SavingsPlansManager('us-east-1')

# Crear recomendación basada en uso
recommendation_result = manager.create_savings_plan_recommendation(
    usage_type='BoxUsage',
    commitment_amount=10.00,  # $10.00 por hora
    commitment_term='ONE_YEAR',
    payment_option='NO_UPFRONT'
)

if recommendation_result['success']:
    recommendation = recommendation_result['recommendation']
    
    print(f"Savings Plan Recommendation")
    print(f"  Type: {recommendation['savings_plan_type']}")
    print(f"  Commitment: ${recommendation['commitment_amount']}/hour")
    print(f"  Term: {recommendation['commitment_term']}")
    print(f"  Payment: {recommendation['payment_option']}")
    print(f"  Region: {recommendation['region']}")
    
    print(f"\nCost Analysis:")
    print(f"  On-Demand Cost: ${recommendation['on_demand_cost']:.2f}")
    print(f"  Savings Percentage: {recommendation['savings_percentage']:.1f}%")
    print(f"  Savings Amount: ${recommendation['savings_amount']:.2f}")
    print(f"  Effective Cost: ${recommendation['effective_cost']:.2f}")
```

## Configuración con AWS CLI

### **Creación y Gestión de Savings Plans**
```bash
# Listar ofertas de Savings Plans
aws savingsplans describe-savings-plan-offerings \
  --savings-plan-type Compute \
  --product-type EC2 \
  --region us-east-1

# Crear Compute Savings Plan
aws savingsplans create-savings-plan \
  --savings-plan-offering-id "offering-id" \
  --commitment "10.00" \
  --tags Key=Environment,Value=Production

# Listar Savings Plans existentes
aws savingsplans describe-savings-plans \
  --states active

# Describir tasas de Savings Plan
aws savingsplans describe-savings-plan-rates \
  --savings-plan-id "savings-plan-id"

# Eliminar Savings Plan
aws savingsplans delete-savings-plan \
  --savings-plan-id "savings-plan-id"
```

### **Análisis de Costos y Utilización**
```bash
# Obtener cobertura de Savings Plans
aws ce get-savings-plans-coverage \
  --time-period Start=2023-01-01,End=2023-12-31 \
  --granularity MONTHLY

# Obtener utilización de Savings Plans
aws ce get-savings-plans-utilization \
  --time-period Start=2023-01-01,End=2023-12-31 \
  --granularity MONTHLY

# Obtener recomendaciones de Savings Plans
aws ce get-savings-plans-purchase-recommendations \
  --savings-plans-type Compute \
  --term-in-years ONE_YEAR \
  --payment-option NO_UPFRONT
```

## Mejores Prácticas

### **1. Selección de Savings Plans**
- **Usage Analysis**: Analizar patrones de uso antes de comprar
- **Workload Stability**: Evaluar estabilidad de workloads
- **Flexibility Requirements**: Considerar necesidades de flexibilidad
- **Budget Planning**: Planificar presupuesto para compromisos
- **Regional Considerations**: Considerar uso multi-regional

### **2. Optimización de Compromisos**
- **Rightsizing**: Ajustar compromisos al uso real
- **Regular Review**: Revisar y ajustar compromisos regularmente
- **Utilization Monitoring**: Monitorear utilización continuamente
- **Coverage Analysis**: Analizar cobertura de workloads
- **Cost Efficiency**: Optimizar eficiencia de costos

### **3. Gestión de Portafolio**
- **Diversification**: Diversificar tipos de Savings Plans
- **Term Optimization**: Optimizar términos de compromiso
- **Payment Strategy**: Estrategia de pagos optimizada
- **Performance Tracking**: Seguimiento del rendimiento
- **Continuous Improvement**: Mejora continua del portafolio

### **4. Monitoreo y Alertas**
- **Coverage Alerts**: Alertas de baja cobertura
- **Utilization Alerts**: Alertas de baja utilización
- **Budget Alerts**: Alertas de presupuesto
- **Performance Alerts**: Alertas de rendimiento
- **Optimization Alerts**: Alertas de optimización

## Comparación con Reserved Instances

### **Ventajas de Savings Plans**
- **Flexibilidad**: Cambio entre tipos de instancia y regiones
- **Simplicidad**: Gestión más simple que Reserved Instances
- **Cobertura**: Mayor cobertura de workloads variables
- **Adaptabilidad**: Adaptación a cambios en arquitectura
- **Eficiencia**: Mayor eficiencia de costos

### **Cuándo Usar Reserved Instances**
- **Workloads Estables**: Uso predecible y constante
- **Instancias Específicas**: Necesidad de instancias específicas
- **Requisitos de Licenciamiento**: Licencias específicas de software
- **Cumplimiento Normativo**: Requisitos de cumplimiento específicos
- **Control de Hardware**: Necesidad de control sobre hardware

## Estrategias de Implementación

### **1. Estrategia Gradual**
- **Pilot Testing**: Pruebas piloto con compromisos pequeños
- **Gradual Expansion**: Expansión gradual de compromisos
- **Performance Monitoring**: Monitoreo continuo del rendimiento
- **Adjustment Phase**: Fase de ajuste basada en resultados
- **Full Implementation**: Implementación completa

### **2. Estrategia Híbrida**
- **Savings Plans**: Para workloads variables
- **Reserved Instances**: Para workloads estables
- **On-Demand**: Para picos de uso inesperados
- **Spot Instances**: Para workloads tolerantes a interrupciones
- **Optimization Balance**: Balance de optimización

### **3. Estrategia Multi-regional**
- **Regional Coverage**: Cobertura en múltiples regiones
- **Workload Distribution**: Distribución de workloads
- **Cost Optimization**: Optimización de costos regionales
- **Latency Considerations**: Consideraciones de latencia
- **Compliance Requirements**: Requisitos de cumplimiento

## Costos y Ahorros

### **Estructura de Precios**
```
Compute Savings Plans Pricing
├── 1 Year Commitment
│   ├── No Upfront: 42% de descuento
│   ├── Partial Upfront: 44% de descuento
│   └── All Upfront: 45% de descuento
├── 3 Year Commitment
│   ├── No Upfront: 60% de descuento
│   ├── Partial Upfront: 63% de descuento
│   └── All Upfront: 66% de descuento
└── Regional Flexibility
    ├── Regional: Máxima flexibilidad
    ├── Zonal: Flexibilidad limitada
    └── Instance Family: Flexibilidad por familia
```

### **Análisis de ROI**
- **Break-even Point**: Punto de equilibrio
- **ROI Calculation**: Cálculo de retorno de inversión
- **Savings Projection**: Proyección de ahorros
- **Risk Assessment**: Evaluación de riesgos
- **Benefit Analysis**: Análisis de beneficios

## Cumplimiento Normativo

### **Control de Compromisos**
- **Commitment Tracking**: Seguimiento de compromisos
- **Budget Enforcement**: Cumplimiento de presupuestos
- **Audit Trail**: Registro de auditoría
- **Compliance Reporting**: Reportes de cumplimiento

### **Regulaciones Aplicables**
- **SOX**: Control de compromisos financieros
- **GDPR**: Protección de datos de costos
- **HIPAA**: Compromisos de servicios de salud
- **PCI DSS**: Compromisos de servicios de pago

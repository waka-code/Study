# AWS Pricing Calculator

## Definición

AWS Pricing Calculator es una herramienta gratuita que permite estimar los costos de los servicios de AWS antes de implementarlos. Facilita la planificación de presupuestos, la optimización de costos y la toma de decisiones informadas sobre arquitectura y configuración de recursos. Proporciona estimaciones detalladas basadas en los precios actuales de AWS y permite comparar diferentes escenarios de configuración.

## Características Principales

### **Estimación de Costos**
- **Multi-service Support**: Soporte para todos los servicios de AWS
- **Detailed Pricing**: Precios detallados por servicio y región
- **Usage-based Calculation**: Cálculos basados en patrones de uso
- **Currency Support**: Soporte para múltiples monedas
- **Real-time Updates**: Actualizaciones en tiempo real de precios

### **Análisis de Escenarios**
- **What-if Analysis**: Análisis de escenarios hipotéticos
- **Configuration Comparison**: Comparación de diferentes configuraciones
- **Cost Optimization**: Identificación de oportunidades de optimización
- **Savings Estimation**: Estimación de ahorros con diferentes modelos
- **Break-even Analysis**: Análisis de punto de equilibrio

### **Planificación y Presupuestos**
- **Budget Planning**: Planificación de presupuestos detallados
- **Cost Forecasting**: Proyección de costos a futuro
- **Resource Planning**: Planificación de recursos y capacidad
- **Capacity Planning**: Planificación de capacidad y crecimiento
- **Financial Planning**: Planificación financiera y ROI

### **Integración y Compartición**
- **Export Options**: Exportación a múltiples formatos
- **Sharing Capabilities**: Compartir estimaciones con equipos
- **Template Library**: Biblioteca de plantillas predefinidas
- **API Integration**: Integración con herramientas externas
- **Collaboration Tools**: Herramientas de colaboración

## Tipos de Cálculos Soportados

### **Computing Services**
```
Compute Services Pricing
├── EC2 Instances
│   ├── On-Demand Pricing
│   ├── Reserved Instances
│   ├── Spot Instances
│   ├── Dedicated Hosts
│   └── Savings Plans
├── Lambda Functions
│   ├── Compute Pricing
│   ├── Request Pricing
│   ├── Duration Pricing
│   └── Provisioned Concurrency
├── Container Services
│   ├── ECS Pricing
│   ├── EKS Pricing
│   ├── Fargate Pricing
│   └── Container Storage
└── Serverless Computing
    ├── Lambda
    ├── Fargate
    ├── API Gateway
    └── Step Functions
```

### **Storage Services**
```
Storage Services Pricing
├── S3 Storage
│   ├── Standard Storage
│   ├── Intelligent-Tiering
│   ├── Infrequent Access
│   ├── Glacier
│   └── Deep Archive
├── EBS Storage
│   ├── General Purpose SSD
│   ├── Provisioned IOPS SSD
│   ├── Throughput Optimized
│   ├── Cold HDD
│   └── Magnetic
├── Database Storage
│   ├── RDS Storage
│   ├── DynamoDB Storage
│   ├── Redshift Storage
│   └── Aurora Storage
└── File Storage
    ├── EFS Storage
    ├── FSx for Windows
    ├── FSx for Lustre
    └── Transfer Family
```

### **Network Services**
```
Network Services Pricing
├── Data Transfer
│   ├── Internet Transfer
│   ├── Regional Transfer
│   ├── Cross-region Transfer
│   ├── Direct Connect
│   └── VPN Connection
├── Content Delivery
│   ├── CloudFront
│   ├── Global Accelerator
│   ├── Route 53
│   └── Cloud Map
└── Networking
    ├── VPC
    ├── Load Balancer
    ├── NAT Gateway
    └── Transit Gateway
```

## Configuración de AWS Pricing Calculator

### **Gestión Completa de Pricing Calculator**
```python
import boto3
import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class PricingCalculatorManager:
    def __init__(self, region='us-east-1'):
        self.pricing = boto3.client('pricing', region_name=region)
        self.cost_explorer = boto3.client('ce', region_name=region)
        self.ec2 = boto3.client('ec2', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.region = region
    
    def get_service_pricing(self, service_code, filters=None):
        """Obtener precios de servicio específico"""
        
        try:
            params = {'ServiceCode': service_code}
            
            if filters:
                params['Filters'] = filters
            
            response = self.pricing.get_products(**params)
            
            products = []
            for product in response['PriceList']:
                product_info = json.loads(product)
                products.append(product_info)
            
            return {
                'success': True,
                'products': products,
                'count': len(products)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def calculate_ec2_cost(self, instance_type, hours, quantity=1, 
                          pricing_model='on-demand', term='one_year',
                          payment_option='no_upfront', platform='linux'):
        """Calcular costo de instancias EC2"""
        
        try:
            # Configurar filtros para EC2
            filters = [
                {'Type': 'TERM_MATCH', 'Field': 'instanceType', 'Value': instance_type},
                {'Type': 'TERM_MATCH', 'Field': 'location', 'Value': self.region},
                {'Type': 'TERM_MATCH', 'Field': 'operatingSystem', 'Value': platform},
                {'Type': 'TERM_MATCH', 'Field': 'tenancy', 'Value': 'Shared'}
            ]
            
            # Ajustar filtros según modelo de precios
            if pricing_model == 'on-demand':
                filters.append({'Type': 'TERM_MATCH', 'Field': 'capacitystatus', 'Value': 'Used'})
            elif pricing_model == 'reserved':
                filters.append({'Type': 'TERM_MATCH', 'Field': 'capacitystatus', 'Value': 'Used'})
                filters.append({'Type': 'TERM_MATCH', 'Field': 'purchaseOption', 'Value': payment_option})
                filters.append({'Type': 'TERM_MATCH', 'Field': 'term', 'Value': term})
            elif pricing_model == 'spot':
                filters.append({'Type': 'TERM_MATCH', 'Field': 'capacitystatus', 'Value': 'Used'})
                filters.append({'Type': 'TERM_MATCH', 'Field': 'tenancy', 'Value': 'Shared'})
            
            response = self.pricing.get_products(
                ServiceCode='AmazonEC2',
                Filters=filters
            )
            
            if not response['PriceList']:
                return {
                    'success': False,
                    'error': 'No pricing information found'
                }
            
            # Extraer precio por hora
            price_per_hour = 0
            for product in response['PriceList']:
                product_info = json.loads(product)
                
                for term in product_info['terms']:
                    if pricing_model == 'on-demand' and 'OnDemand' in term:
                        for dimension in term['OnDemand']['PriceDimensions']:
                            if dimension['rateCode'].endswith('Hrs'):
                                price_per_hour = float(dimension['pricePerUnit']['USD'])
                                break
                    elif pricing_model == 'reserved' and 'Reserved' in term:
                        for dimension in term['Reserved']['PriceDimensions']:
                            if dimension['rateCode'].endswith('Hrs'):
                                price_per_hour = float(dimension['pricePerUnit']['USD'])
                                break
                    elif pricing_model == 'spot' and 'OnDemand' in term:
                        # Para spot, usar precio on-demand como referencia
                        for dimension in term['OnDemand']['PriceDimensions']:
                            if dimension['rateCode'].endswith('Hrs'):
                                price_per_hour = float(dimension['pricePerUnit']['USD']) * 0.2  # Estimación 80% descuento
                                break
            
            # Calcular costo total
            if pricing_model == 'spot':
                total_cost = price_per_hour * hours * quantity
                effective_price = price_per_hour
            elif pricing_model == 'reserved':
                # Para reservadas, calcular costo mensual
                monthly_hours = 730  # Promedio mensual
                total_cost = price_per_hour * monthly_hours * quantity
                effective_price = price_per_hour
            else:
                total_cost = price_per_hour * hours * quantity
                effective_price = price_per_hour
            
            # Calcular descuentos si aplica
            discount_percentage = 0
            if pricing_model == 'reserved':
                if term == 'one_year':
                    discount_percentage = 40 if payment_option == 'no_upfront' else 45
                elif term == 'three_year':
                    discount_percentage = 60 if payment_option == 'no_upfront' else 66
            elif pricing_model == 'spot':
                discount_percentage = 80
            
            return {
                'success': True,
                'calculation': {
                    'instance_type': instance_type,
                    'pricing_model': pricing_model,
                    'hours': hours,
                    'quantity': quantity,
                    'price_per_hour': effective_price,
                    'total_cost': total_cost,
                    'discount_percentage': discount_percentage,
                    'platform': platform,
                    'region': self.region
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def calculate_s3_cost(self, storage_gb, storage_class='Standard', 
                          put_requests=0, get_requests=0, data_transfer_gb=0):
        """Calcular costo de almacenamiento S3"""
        
        try:
            # Precios estándar de S3 (us-east-1)
            storage_prices = {
                'Standard': 0.023,
                'Intelligent-Tiering': 0.023,
                'Infrequent Access': 0.0125,
                'One Zone-IA': 0.01,
                'Glacier Instant Retrieval': 0.004,
                'Glacier': 0.004,
                'Glacier Deep Archive': 0.00099
            }
            
            request_prices = {
                'PUT': 0.005,
                'GET': 0.0004,
                'LIST': 0.005,
                'SELECT': 0.002
            }
            
            data_transfer_prices = {
                'internet': 0.09,  # Primer 10 TB
                'regional': 0.00,   # Gratis
                'cross_region': 0.02
            }
            
            # Calcular costo de almacenamiento
            storage_price_per_gb = storage_prices.get(storage_class, storage_prices['Standard'])
            storage_cost = storage_price_per_gb * storage_gb
            
            # Calcular costo de solicitudes
            put_cost = (put_requests / 1000) * request_prices['PUT']
            get_cost = (get_requests / 1000) * request_prices['GET']
            
            # Calcular costo de transferencia de datos
            internet_cost = data_transfer_gb * data_transfer_prices['internet']
            
            total_cost = storage_cost + put_cost + get_cost + internet_cost
            
            return {
                'success': True,
                'calculation': {
                    'storage_gb': storage_gb,
                    'storage_class': storage_class,
                    'storage_cost': storage_cost,
                    'put_requests': put_requests,
                    'put_cost': put_cost,
                    'get_requests': get_requests,
                    'get_cost': get_cost,
                    'data_transfer_gb': data_transfer_gb,
                    'internet_cost': internet_cost,
                    'total_cost': total_cost,
                    'region': self.region
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def calculate_rds_cost(self, instance_type, hours, storage_gb=20, 
                          multi_az=False, engine='mysql', pricing_model='on-demand'):
        """Calcular costo de base de datos RDS"""
        
        try:
            # Precios estándar de RDS (us-east-1)
            instance_prices = {
                'db.t3.micro': {'mysql': 0.089, 'postgres': 0.089, 'sqlserver': 0.095},
                'db.t3.small': {'mysql': 0.179, 'postgres': 0.179, 'sqlserver': 0.189},
                'db.t3.medium': {'mysql': 0.358, 'postgres': 0.358, 'sqlserver': 0.378},
                'db.m5.large': {'mysql': 0.215, 'postgres': 0.215, 'sqlserver': 0.235},
                'db.m5.xlarge': {'mysql': 0.43, 'postgres': 0.43, 'sqlserver': 0.47},
                'db.m5.2xlarge': {'mysql': 0.86, 'postgres': 0.86, 'sqlserver': 0.94}
            }
            
            storage_price = 0.10  # General Purpose SSD
            backup_price = 0.023  # Backup storage
            
            # Obtener precio de instancia
            instance_price_per_hour = instance_prices.get(instance_type, {}).get(engine, 0.089)
            
            # Calcular costo de instancia
            multi_az_multiplier = 2.0 if multi_az else 1.0
            instance_cost = instance_price_per_hour * hours * multi_az_multiplier
            
            # Calcular costo de almacenamiento
            storage_cost = storage_price * storage_gb
            
            # Calcular costo de backup (aproximadamente igual al almacenamiento)
            backup_cost = backup_price * storage_gb
            
            total_cost = instance_cost + storage_cost + backup_cost
            
            return {
                'success': True,
                'calculation': {
                    'instance_type': instance_type,
                    'engine': engine,
                    'hours': hours,
                    'multi_az': multi_az,
                    'instance_cost': instance_cost,
                    'storage_gb': storage_gb,
                    'storage_cost': storage_cost,
                    'backup_cost': backup_cost,
                    'total_cost': total_cost,
                    'pricing_model': pricing_model,
                    'region': self.region
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def calculate_lambda_cost(self, invocations, duration_seconds, memory_mb=128, 
                            provisioned_concurrency=0):
        """Calcular costo de funciones Lambda"""
        
        try:
            # Precios estándar de Lambda
            request_price = 0.0000002  # $0.20 por millón de solicitudes
            compute_price = 0.0000166667  # $0.0000166667 por GB-segundo
            provisioned_price = 0.0000041667  # $0.0000041667 por GB-segundo
            
            # Convertir GB-segundo a MB-segundo
            compute_price_per_mb_second = compute_price / 1024
            provisioned_price_per_mb_second = provisioned_price / 1024
            
            # Calcular costo de solicitudes
            request_cost = (invocations / 1000000) * request_price
            
            # Calcular costo de cómputo
            compute_cost = invocations * duration_seconds * memory_mb * compute_price_per_mb_second
            
            # Calcular costo de concurrencia aprovisionada
            monthly_seconds = 30 * 24 * 3600  # Segundos en un mes
            provisioned_cost = provisioned_concurrency * memory_mb * monthly_seconds * provisioned_price_per_mb_second
            
            total_cost = request_cost + compute_cost + provisioned_cost
            
            return {
                'success': True,
                'calculation': {
                    'invocations': invocations,
                    'duration_seconds': duration_seconds,
                    'memory_mb': memory_mb,
                    'provisioned_concurrency': provisioned_concurrency,
                    'request_cost': request_cost,
                    'compute_cost': compute_cost,
                    'provisioned_cost': provisioned_cost,
                    'total_cost': total_cost,
                    'region': self.region
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def calculate_workload_cost(self, workload_config):
        """Calcular costo de workload completo"""
        
        try:
            workload_cost = {
                'workload_name': workload_config.get('name', 'Unknown'),
                'total_cost': 0,
                'components': {},
                'optimization_suggestions': []
            }
            
            # Calcular costo de componentes
            for component_name, component_config in workload_config.get('components', {}).items():
                component_type = component_config.get('type')
                component_cost = 0
                
                if component_type == 'ec2':
                    calc_result = self.calculate_ec2_cost(
                        instance_type=component_config['instance_type'],
                        hours=component_config['hours'],
                        quantity=component_config.get('quantity', 1),
                        pricing_model=component_config.get('pricing_model', 'on-demand'),
                        platform=component_config.get('platform', 'linux')
                    )
                    if calc_result['success']:
                        component_cost = calc_result['calculation']['total_cost']
                        workload_cost['components'][component_name] = calc_result['calculation']
                
                elif component_type == 's3':
                    calc_result = self.calculate_s3_cost(
                        storage_gb=component_config['storage_gb'],
                        storage_class=component_config.get('storage_class', 'Standard'),
                        put_requests=component_config.get('put_requests', 0),
                        get_requests=component_config.get('get_requests', 0),
                        data_transfer_gb=component_config.get('data_transfer_gb', 0)
                    )
                    if calc_result['success']:
                        component_cost = calc_result['calculation']['total_cost']
                        workload_cost['components'][component_name] = calc_result['calculation']
                
                elif component_type == 'rds':
                    calc_result = self.calculate_rds_cost(
                        instance_type=component_config['instance_type'],
                        hours=component_config['hours'],
                        storage_gb=component_config.get('storage_gb', 20),
                        multi_az=component_config.get('multi_az', False),
                        engine=component_config.get('engine', 'mysql')
                    )
                    if calc_result['success']:
                        component_cost = calc_result['calculation']['total_cost']
                        workload_cost['components'][component_name] = calc_result['calculation']
                
                elif component_type == 'lambda':
                    calc_result = self.calculate_lambda_cost(
                        invocations=component_config['invocations'],
                        duration_seconds=component_config['duration_seconds'],
                        memory_mb=component_config.get('memory_mb', 128),
                        provisioned_concurrency=component_config.get('provisioned_concurrency', 0)
                    )
                    if calc_result['success']:
                        component_cost = calc_result['calculation']['total_cost']
                        workload_cost['components'][component_name] = calc_result['calculation']
                
                workload_cost['total_cost'] += component_cost
            
            # Generar sugerencias de optimización
            workload_cost['optimization_suggestions'] = self._generate_optimization_suggestions(workload_cost)
            
            return {
                'success': True,
                'workload_cost': workload_cost
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generate_optimization_suggestions(self, workload_cost):
        """Generar sugerencias de optimización"""
        
        suggestions = []
        
        # Analizar componentes EC2
        for component_name, component in workload_cost['components'].items():
            if 'instance_type' in component:
                # Sugerir Reserved Instances para uso alto
                if component.get('hours', 0) > 500:  # Más de 500 horas al mes
                    suggestions.append({
                        'component': component_name,
                        'type': 'RESERVED_INSTANCES',
                        'description': 'Consider Reserved Instances for high utilization',
                        'potential_savings': component['total_cost'] * 0.4,
                        'priority': 'HIGH'
                    })
                
                # Sugerir Spot Instances para workloads tolerantes
                if component.get('pricing_model') == 'on-demand':
                    suggestions.append({
                        'component': component_name,
                        'type': 'SPOT_INSTANCES',
                        'description': 'Consider Spot Instances for fault-tolerant workloads',
                        'potential_savings': component['total_cost'] * 0.8,
                        'priority': 'MEDIUM'
                    })
        
        # Analizar componentes S3
        for component_name, component in workload_cost['components'].items():
            if 'storage_class' in component:
                if component['storage_class'] == 'Standard' and component.get('storage_gb', 0) > 1000:
                    suggestions.append({
                        'component': component_name,
                        'type': 'STORAGE_CLASS',
                        'description': 'Consider Intelligent-Tiering for large storage',
                        'potential_savings': component['storage_cost'] * 0.1,
                        'priority': 'MEDIUM'
                    })
        
        # Sugerir Savings Plans
        total_compute_cost = sum(
            comp['total_cost'] for comp in workload_cost['components'].values()
            if comp.get('instance_type') or comp.get('memory_mb')
        )
        
        if total_compute_cost > 100:  # Más de $100 en cómputo
            suggestions.append({
                'component': 'All Compute Resources',
                'type': 'SAVINGS_PLANS',
                'description': 'Consider Compute Savings Plans for flexible savings',
                'potential_savings': total_compute_cost * 0.4,
                'priority': 'HIGH'
            })
        
        return suggestions
    
    def compare_scenarios(self, scenarios_config):
        """Comparar múltiples escenarios de configuración"""
        
        try:
            comparison = {
                'scenarios': {},
                'cheapest_scenario': None,
                'most_expensive_scenario': None,
                'cost_difference': 0,
                'recommendations': []
            }
            
            scenario_costs = {}
            
            # Calcular costo para cada escenario
            for scenario_name, scenario_config in scenarios_config.items():
                cost_result = self.calculate_workload_cost(scenario_config)
                
                if cost_result['success']:
                    scenario_cost = cost_result['workload_cost']
                    comparison['scenarios'][scenario_name] = scenario_cost
                    scenario_costs[scenario_name] = scenario_cost['total_cost']
            
            # Encontrar escenario más barato y más caro
            if scenario_costs:
                cheapest_scenario = min(scenario_costs, key=scenario_costs.get)
                most_expensive_scenario = max(scenario_costs, key=scenario_costs.get)
                
                comparison['cheapest_scenario'] = cheapest_scenario
                comparison['most_expensive_scenario'] = most_expensive_scenario
                comparison['cost_difference'] = scenario_costs[most_expensive_scenario] - scenario_costs[cheapest_scenario]
                
                # Generar recomendaciones
                comparison['recommendations'] = [
                    {
                        'scenario': cheapest_scenario,
                        'type': 'COST_OPTIMAL',
                        'description': f'The cheapest scenario is {cheapest_scenario}',
                        'cost': scenario_costs[cheapest_scenario],
                        'savings': comparison['cost_difference']
                    }
                ]
            
            return {
                'success': True,
                'comparison': comparison
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def forecast_costs(self, current_config, growth_rate=0.1, months=12):
        """Proyectar costos a futuro"""
        
        try:
            # Calcular costo actual
            current_cost_result = self.calculate_workload_cost(current_config)
            
            if not current_cost_result['success']:
                return current_cost_result
            
            current_cost = current_cost_result['workload_cost']['total_cost']
            
            # Proyectar costos futuros
            forecast = {
                'current_cost': current_cost,
                'growth_rate': growth_rate,
                'forecast_period_months': months,
                'monthly_projections': [],
                'total_projected_cost': 0
            }
            
            projected_cost = current_cost
            total_projected = 0
            
            for month in range(1, months + 1):
                # Aplicar tasa de crecimiento
                projected_cost = projected_cost * (1 + growth_rate)
                total_projected += projected_cost
                
                forecast['monthly_projections'].append({
                    'month': month,
                    'projected_cost': projected_cost,
                    'cumulative_cost': total_projected
                })
            
            forecast['total_projected_cost'] = total_projected
            
            return {
                'success': True,
                'forecast': forecast
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_cost_report(self, workload_config, include_optimizations=True):
        """Generar reporte completo de costos"""
        
        try:
            # Calcular costo del workload
            workload_cost_result = self.calculate_workload_cost(workload_config)
            
            if not workload_cost_result['success']:
                return workload_cost_result
            
            workload_cost = workload_cost_result['workload_cost']
            
            # Generar reporte
            report = {
                'report_metadata': {
                    'generated_at': datetime.utcnow().isoformat(),
                    'workload_name': workload_cost['workload_name'],
                    'region': self.region
                },
                'cost_summary': {
                    'total_cost': workload_cost['total_cost'],
                    'component_count': len(workload_cost['components']),
                    'currency': 'USD'
                },
                'component_breakdown': {},
                'optimization_analysis': {},
                'recommendations': []
            }
            
            # Desglose por componentes
            for component_name, component in workload_cost['components'].items():
                report['component_breakdown'][component_name] = {
                    'cost': component['total_cost'],
                    'percentage': (component['total_cost'] / workload_cost['total_cost']) * 100,
                    'type': component.get('instance_type', component.get('storage_class', 'Unknown'))
                }
            
            # Análisis de optimización
            if include_optimizations:
                suggestions = workload_cost['optimization_suggestions']
                total_potential_savings = sum(s['potential_savings'] for s in suggestions)
                
                report['optimization_analysis'] = {
                    'optimization_opportunities': len(suggestions),
                    'total_potential_savings': total_potential_savings,
                    'optimized_cost': workload_cost['total_cost'] - total_potential_savings,
                    'optimization_percentage': (total_potential_savings / workload_cost['total_cost']) * 100
                }
                
                # Ordenar sugerencias por ahorro potencial
                suggestions.sort(key=lambda x: x['potential_savings'], reverse=True)
                report['recommendations'] = suggestions[:5]  # Top 5
            
            return {
                'success': True,
                'report': report
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Calcular Costo de Instancia EC2**
```python
# Ejemplo: Calcular costo de instancia EC2
calculator = PricingCalculatorManager('us-east-1')

# Calcular costo para diferentes modelos de precios
pricing_models = ['on-demand', 'reserved', 'spot']
instance_type = 't3.medium'
hours = 730  # 1 mes

print(f"EC2 Cost Analysis for {instance_type} ({hours} hours)")
print("=" * 50)

for model in pricing_models:
    cost_result = calculator.calculate_ec2_cost(
        instance_type=instance_type,
        hours=hours,
        pricing_model=model,
        term='one_year' if model == 'reserved' else None
    )
    
    if cost_result['success']:
        calc = cost_result['calculation']
        print(f"\n{model.upper()}:")
        print(f"  Price per hour: ${calc['price_per_hour']:.4f}")
        print(f"  Total cost: ${calc['total_cost']:.2f}")
        print(f"  Discount: {calc['discount_percentage']:.1f}%")
```

### **2. Calcular Costo de Workload Completo**
```python
# Ejemplo: Calcular costo de workload completo
calculator = PricingCalculatorManager('us-east-1')

# Definir configuración de workload
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
            'multi_az': True,
            'engine': 'mysql'
        },
        'storage': {
            'type': 's3',
            'storage_gb': 500,
            'storage_class': 'Standard',
            'put_requests': 10000,
            'get_requests': 50000,
            'data_transfer_gb': 100
        },
        'api_functions': {
            'type': 'lambda',
            'invocations': 1000000,
            'duration_seconds': 0.5,
            'memory_mb': 256,
            'provisioned_concurrency': 10
        }
    }
}

# Calcular costo del workload
workload_result = calculator.calculate_workload_cost(workload_config)

if workload_result['success']:
    workload = workload_result['workload_cost']
    
    print(f"Workload Cost Analysis: {workload['workload_name']}")
    print(f"Total Cost: ${workload['total_cost']:.2f}")
    print(f"\nComponent Breakdown:")
    
    for component_name, component in workload['components'].items():
        print(f"  {component_name}: ${component['total_cost']:.2f}")
    
    # Mostrar sugerencias de optimización
    suggestions = workload['optimization_suggestions']
    print(f"\nOptimization Suggestions: {len(suggestions)}")
    for suggestion in suggestions:
        print(f"  [{suggestion['priority']}] {suggestion['description']}")
        print(f"    Potential Savings: ${suggestion['potential_savings']:.2f}")
```

### **3. Comparar Escenarios**
```python
# Ejemplo: Comparar diferentes escenarios
calculator = PricingCalculatorManager('us-east-1')

# Definir escenarios a comparar
scenarios = {
    'basic_setup': {
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
    'production_setup': {
        'name': 'Production Setup',
        'components': {
            'web_servers': {
                'type': 'ec2',
                'instance_type': 't3.medium',
                'hours': 730,
                'quantity': 2
            },
            'database': {
                'type': 'rds',
                'instance_type': 'db.t3.small',
                'hours': 730,
                'storage_gb': 100,
                'multi_az': True
            },
            'storage': {
                'type': 's3',
                'storage_gb': 500
            }
        }
    },
    'enterprise_setup': {
        'name': 'Enterprise Setup',
        'components': {
            'web_servers': {
                'type': 'ec2',
                'instance_type': 'm5.large',
                'hours': 730,
                'quantity': 4
            },
            'database': {
                'type': 'rds',
                'instance_type': 'db.m5.large',
                'hours': 730,
                'storage_gb': 1000,
                'multi_az': True
            },
            'storage': {
                'type': 's3',
                'storage_gb': 2000
            }
        }
    }
}

# Comparar escenarios
comparison_result = calculator.compare_scenarios(scenarios)

if comparison_result['success']:
    comparison = comparison_result['comparison']
    
    print(f"Scenario Comparison")
    print("=" * 40)
    
    for scenario_name, scenario in comparison['scenarios'].items():
        print(f"\n{scenario_name}:")
        print(f"  Total Cost: ${scenario['total_cost']:.2f}")
        print(f"  Components: {len(scenario['components'])}")
    
    print(f"\nCheapest Scenario: {comparison['cheapest_scenario']}")
    print(f"Most Expensive: {comparison['most_expensive_scenario']}")
    print(f"Cost Difference: ${comparison['cost_difference']:.2f}")
    
    # Mostrar recomendaciones
    for rec in comparison['recommendations']:
        print(f"\nRecommendation: {rec['description']}")
        print(f"  Scenario: {rec['scenario']}")
        print(f"  Savings: ${rec['savings']:.2f}")
```

### **4. Proyectar Costos Futuros**
```python
# Ejemplo: Proyectar costos a futuro
calculator = PricingCalculatorManager('us-east-1')

# Configuración actual
current_config = {
    'name': 'Current Infrastructure',
    'components': {
        'web_servers': {
            'type': 'ec2',
            'instance_type': 't3.medium',
            'hours': 730,
            'quantity': 2
        },
        'database': {
            'type': 'rds',
            'instance_type': 'db.t3.micro',
            'hours': 730,
            'storage_gb': 100
        }
    }
}

# Proyectar costos con diferentes tasas de crecimiento
growth_rates = [0.05, 0.10, 0.15]

for rate in growth_rates:
    forecast_result = calculator.forecast_costs(
        current_config=current_config,
        growth_rate=rate,
        months=12
    )
    
    if forecast_result['success']:
        forecast = forecast_result['forecast']
        
        print(f"\nCost Forecast - {rate*100:.0f}% Growth Rate")
        print(f"Current Cost: ${forecast['current_cost']:.2f}")
        print(f"12-Month Projection: ${forecast['total_projected_cost']:.2f}")
        print(f"Average Monthly: ${forecast['total_projected_cost']/12:.2f}")
        
        # Mostrar primeros 3 meses
        print(f"\nFirst 3 Months:")
        for month in forecast['monthly_projections'][:3]:
            print(f"  Month {month['month']}: ${month['projected_cost']:.2f}")
```

### **5. Generar Reporte Completo**
```python
# Ejemplo: Generar reporte completo
calculator = PricingCalculatorManager('us-east-1')

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
            'quantity': 2,
            'pricing_model': 'on-demand'
        },
        'database': {
            'type': 'rds',
            'instance_type': 'db.t3.medium',
            'hours': 730,
            'storage_gb': 500,
            'multi_az': True,
            'engine': 'mysql'
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
            'get_requests': 200000,
            'data_transfer_gb': 500
        },
        'api': {
            'type': 'lambda',
            'invocations': 5000000,
            'duration_seconds': 0.3,
            'memory_mb': 512,
            'provisioned_concurrency': 20
        }
    }
}

# Generar reporte
report_result = calculator.generate_cost_report(complex_config, include_optimizations=True)

if report_result['success']:
    report = report_result['report']
    
    print(f"Cost Report: {report['report_metadata']['workload_name']}")
    print(f"Generated: {report['report_metadata']['generated_at']}")
    print("=" * 50)
    
    # Resumen de costos
    summary = report['cost_summary']
    print(f"\nCost Summary:")
    print(f"  Total Cost: ${summary['total_cost']:.2f}")
    print(f"  Components: {summary['component_count']}")
    print(f"  Currency: {summary['currency']}")
    
    # Desglose por componentes
    print(f"\nComponent Breakdown:")
    for component_name, component in report['component_breakdown'].items():
        print(f"  {component_name}: ${component['cost']:.2f} ({component['percentage']:.1f}%)")
    
    # Análisis de optimización
    if 'optimization_analysis' in report:
        optimization = report['optimization_analysis']
        print(f"\nOptimization Analysis:")
        print(f"  Opportunities: {optimization['optimization_opportunities']}")
        print(f"  Potential Savings: ${optimization['total_potential_savings']:.2f}")
        print(f"  Optimized Cost: ${optimization['optimized_cost']:.2f}")
        print(f"  Optimization: {optimization['optimization_percentage']:.1f}%")
    
    # Recomendaciones
    print(f"\nTop Recommendations:")
    for i, rec in enumerate(report['recommendations'], 1):
        print(f"  {i}. [{rec['priority']}] {rec['description']}")
        print(f"     Component: {rec['component']}")
        print(f"     Savings: ${rec['potential_savings']:.2f}")
```

### **6. Análisis de S3 Storage**
```python
# Ejemplo: Analizar diferentes clases de almacenamiento S3
calculator = PricingCalculatorManager('us-east-1')

# Escenarios de almacenamiento
storage_scenarios = [
    {'class': 'Standard', 'gb': 1000, 'put': 10000, 'get': 50000},
    {'class': 'Intelligent-Tiering', 'gb': 1000, 'put': 10000, 'get': 50000},
    {'class': 'Infrequent Access', 'gb': 1000, 'put': 10000, 'get': 50000},
    {'class': 'Glacier Deep Archive', 'gb': 1000, 'put': 10000, 'get': 50000}
]

print("S3 Storage Cost Comparison")
print("=" * 40)

for scenario in storage_scenarios:
    cost_result = calculator.calculate_s3_cost(
        storage_gb=scenario['gb'],
        storage_class=scenario['class'],
        put_requests=scenario['put'],
        get_requests=scenario['get']
    )
    
    if cost_result['success']:
        cost = cost_result['calculation']
        print(f"\n{scenario['class']}:")
        print(f"  Storage Cost: ${cost['storage_cost']:.2f}")
        print(f"  PUT Cost: ${cost['put_cost']:.2f}")
        print(f"  GET Cost: ${cost['get_cost']:.2f}")
        print(f"  Internet Cost: ${cost['internet_cost']:.2f}")
        print(f"  Total Cost: ${cost['total_cost']:.2f}")
```

## Configuración con AWS CLI

### **Obtener Precios de Servicios**
```bash
# Obtener precios de EC2
aws pricing get-products \
  --service-code AmazonEC2 \
  --filters Type=TERM_MATCH,Field=instanceType,Value=t3.medium \
          Type=TERM_MATCH,Field=location,Value=us-east-1

# Obtener precios de S3
aws pricing get-products \
  --service-code AmazonS3 \
  --filters Type=TERM_MATCH,Field=storageClass,Value=Standard

# Obtener precios de RDS
aws pricing get-products \
  --service-code AmazonRDS \
  --filters Type=TERM_MATCH,Field=instanceType,Value=db.t3.micro
```

### **Análisis de Costos con Cost Explorer**
```bash
# Obtener costos y uso
aws ce get-cost-and-usage \
  --time-period Start=2023-01-01,End=2023-12-31 \
  --granularity MONTHLY \
  --metrics BlendedCost

# Obtener dimensiones de costos
aws ce get-cost-and-usage \
  --time-period Start=2023-01-01,End=2023-12-31 \
  --granularity MONTHLY \
  --group-by Type=DIMENSION,Key=SERVICE

# Obtener presupuestos
aws budgets describe-budgets --account-id 123456789012
```

## Mejores Prácticas

### **1. Planificación de Costos**
- **Early Estimation**: Estimar costos tempranamente
- **Regular Updates**: Actualizar estimaciones regularmente
- **Multiple Scenarios**: Considerar múltiples escenarios
- **Growth Planning**: Planificar crecimiento futuro
- **Buffer Planning**: Incluir buffers en presupuestos

### **2. Optimización de Costos**
- **Right Sizing**: Dimensionamiento correcto de recursos
- **Pricing Models**: Seleccionar modelos de precios óptimos
- **Storage Classes**: Usar clases de almacenamiento apropiadas
- **Reserved Capacity**: Planificar capacidad reservada
- **Spot Instances**: Aprovechar instancias spot

### **3. Monitoreo y Control**
- **Cost Tracking**: Seguimiento continuo de costos
- **Budget Alerts**: Configurar alertas de presupuesto
- **Anomaly Detection**: Detectar anomalías en costos
- **Regular Reviews': Revisar costos regularmente
- **Cost Attribution**: Asignar costos por departamento

### **4. Documentación y Reportes**
- **Cost Documentation**: Documentar suposiciones y cálculos
- **Regular Reporting': Reportes regulares de costos
- **Stakeholder Communication': Comunicación con stakeholders
- **Change Tracking': Seguimiento de cambios en configuración
- **Historical Analysis**: Análisis histórico de costos

## Integración con Herramientas

### **AWS Cost Explorer**
- **Cost Analysis**: Análisis detallado de costos
- **Cost Forecasting**: Proyección de costos
- **Budget Tracking**: Seguimiento de presupuestos
- **Cost Allocation**: Asignación de costos
- **Anomaly Detection**: Detección de anomalías

### **AWS Budgets**
- **Budget Creation**: Creación de presupuestos
- **Alert Configuration**: Configuración de alertas
- **Cost Tracking**: Seguimiento de costos
- **Forecasting**: Proyección de costos
- **Reporting**: Reportes de presupuesto

### **Third-party Tools**
- **CloudHealth**: Gestión de costos multi-nube
- **Apptio**: FinOps y gestión de costos
- **Cloudability**: Análisis y optimización de costos
- **Turbonomic**: Optimización automática de recursos
- **ParkMyCloud**: Automatización de ahorro de costos

## Estrategias de Optimización

### **1. Compute Optimization**
- **Instance Right Sizing**: Dimensionamiento correcto
- **Reserved Instances**: Compromisos a largo plazo
- **Savings Plans**: Flexibilidad con ahorros
- **Spot Instances**: Máximo ahorro
- **Auto Scaling**: Escalado automático

### **2. Storage Optimization**
- **Storage Classes**: Clases apropiadas
- **Lifecycle Policies**: Políticas de ciclo de vida
- **Data Compression**: Compresión de datos
- **Cleanup**: Limpieza regular
- **Tiering**: Niveles de almacenamiento

### **3. Network Optimization**
- **Data Transfer**: Minimizar transferencias
- **CDN Usage**: Uso de CDN
- **Regional Deployment**: Despliegue regional
- **Direct Connect**: Conexiones dedicadas
- **VPC Peering**: Peering de VPC

## Métricas y KPIs

### **Métricas de Costos**
- **Total Cost**: Costo total mensual
- **Cost per User**: Costo por usuario
- **Cost per Transaction**: Costo por transacción
- **Cost Growth Rate**: Tasa de crecimiento de costos
- **Cost Variance**: Varianza de costos

### **KPIs de Optimización**
- **Savings Achieved**: Ahorros realizados
- **Optimization Rate**: Tasa de optimización
- **ROI**: Retorno de inversión
- **Cost Efficiency**: Eficiencia de costos
- **Budget Adherence**: Adherencia al presupuesto

## Cumplimiento Normativo

### **Control de Costos**
- **Budget Enforcement**: Cumplimiento de presupuestos
- **Cost Tracking**: Seguimiento de costos
- **Audit Trail**: Registro de auditoría
- **Compliance Reporting**: Reportes de cumplimiento
- **Cost Governance**: Gobernanza de costos

### **Regulaciones Aplicables**
- **SOX**: Control de costos financieros
- **GDPR**: Protección de datos de costos
- **HIPAA**: Costos de servicios de salud
- **PCI DSS**: Costos de servicios de pago

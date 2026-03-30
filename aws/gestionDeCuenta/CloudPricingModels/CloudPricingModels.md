# Modelos de Precios de Cloud

## Definición

Los modelos de precios de cloud son estructuras de costos que los proveedores de servicios en la nube utilizan para cobrar por el uso de sus recursos computacionales, de almacenamiento y de red. Estos modelos permiten a las organizaciones pagar solo por los recursos que consumen, optimizar costos según sus patrones de uso y escalar su infraestructura de manera flexible.

## Tipos Principales de Modelos de Precios

### **1. Pay-as-you-go (Pago por uso)**
- **Descripción**: Pagar solo por los recursos que se utilizan
- **Ventajas**: Flexibilidad, sin compromisos a largo plazo
- **Ideal para**: Workloads variables, desarrollo y pruebas
- **Características**: Facturación por segundo/minuto/hora
- **Ejemplos**: EC2, Lambda, S3, RDS

### **2. Reserved Instances (Instancias Reservadas)**
- **Descripción**: Compromiso a largo plazo con descuento significativo
- **Ventajas**: Ahorro de hasta 75% comparado con on-demand
- **Ideal para**: Workloads predecibles y estables
- **Tipos**: Standard, Convertible, Scheduled
- **Ejemplos**: EC2, RDS, ElastiCache, Redshift

### **3. Savings Plans (Planes de Ahorro)**
- **Descripción**: Compromiso flexible de uso con descuentos
- **Ventajas**: Flexibilidad de uso con ahorros garantizados
- **Ideal para**: Workloads mixtas y cambiantes
- **Tipos**: Compute, Machine Learning, SageMaker
- **Ejemplos**: EC2, Lambda, Fargate, SageMaker

### **4. Spot Instances (Instancias Spot)**
- **Descripción**: Recursos no utilizados con descuentos de hasta 90%
- **Ventajas**: Máximo ahorro para workloads tolerantes a interrupciones
- **Ideal para**: Procesamiento por lotes, análisis de datos
- **Características**: Interrumpible con poca antelación
- **Ejemplos**: EC2, ECS, EKS, Batch

### **5. Dedicated Hosts (Hosts Dedicados)**
- **Descripción**: Servidores físicos dedicados para un solo cliente
- **Ventajas**: Licencias existentes, cumplimiento normativo
- **Ideal para**: Requisitos de licenciamiento, seguridad
- **Características**: Control completo del hardware
- **Ejemplos**: EC2, RDS, SAP

## Modelos de Precios por Servicio AWS

### **Computing (EC2)**
```
EC2 Pricing Models
├── On-Demand Instances
│   ├── $0.0136 por hora (t3.micro)
│   ├── Flexibilidad total
│   ├── Sin compromiso
│   └── Ideal para desarrollo/pruebas
├── Reserved Instances
│   ├── 1 Year: 40% de descuento
│   ├── 3 Years: 60% de descuento
│   ├── Upfront: Mayor descuento
│   └── Ideal para producción estable
├── Savings Plans
│   ├── 1 Year: 42% de descuento
│   ├── 3 Years: 66% de descuento
│   ├── Flexible usage
│   └── Ideal para workloads variables
├── Spot Instances
│   ├── Hasta 90% de descuento
│   ├── Interrumpible
│   ├── Ideal para batch/analytics
│   └── No garantía de disponibilidad
└── Dedicated Hosts
    ├── Control completo del hardware
    ├── Licencias existentes
    ├── Cumplimiento normativo
    └── Mayor costo total
```

### **Storage (S3)**
```
S3 Pricing Structure
├── Storage Classes
│   ├── S3 Standard: $0.023 por GB/mes
│   ├── S3 Infrequent Access: $0.0125 por GB/mes
│   ├── S3 Glacier Instant Retrieval: $0.004 por GB/mes
│   ├── S3 Glacier Deep Archive: $0.00099 por GB/mes
│   └── S3 Intelligent-Tiering: $0.023 por GB/mes
├── Request Pricing
│   ├── PUT: $0.005 por 1,000 solicitudes
│   ├── GET: $0.0004 por 1,000 solicitudes
│   ├── LIST: $0.005 por 1,000 solicitudes
│   └── SELECT: $0.002 por GB escaneado
└── Data Transfer
    ├── Internet: $0.09 por GB (primer 10 TB)
    ├── Regional: Gratis
    ├── Cross-region: $0.02 por GB
    └── CloudFront: $0.085 por GB
```

### **Database (RDS)**
```
RDS Pricing Models
├── Database Engine
│   ├── MySQL: $0.089 por hora (db.t3.micro)
│   ├── PostgreSQL: $0.089 por hora (db.t3.micro)
│   ├── SQL Server: $0.095 por hora (db.t3.micro)
│   └── Oracle: $0.125 por hora (db.t3.micro)
├── Pricing Models
│   ├── On-Demand: Pago por uso
│   ├── Reserved: 30-60% descuento
│   ├── Multi-AZ: Duplicación de costo
│   └── Serverless: $0.000125 por vCPU-segundo
├── Storage
│   ├── General Purpose SSD: $0.10 por GB-mes
│   ├── Provisioned IOPS SSD: $0.125 por GB-mes
│   ├── Magnetic: $0.100 por GB-mes
│   └── Backup Storage: $0.023 por GB-mes
└── Additional Costs
    ├── Data Transfer: $0.01 por GB
    ├── Snapshots: $0.023 por GB-mes
    └── Enhanced Monitoring: $0.015 por instancia-hora
```

## Modelos de Precios por Proveedor

### **AWS Pricing Models**
```
AWS Pricing Structure
├── Compute Services
│   ├── EC2: On-demand, Reserved, Spot, Dedicated
│   ├── Lambda: $0.0000002081 por GB-segundo
│   ├── ECS: $0.01056 por hora (Fargate)
│   └── EKS: $0.10 por hora (cluster)
├── Storage Services
│   ├── S3: $0.023 por GB-mes (Standard)
│   ├── EFS: $0.08 por GB-mes
│   ├── EBS: $0.08 por GB-mes (gp2)
│   └── Glacier: $0.004 por GB-mes
├── Database Services
│   ├── RDS: $0.089 por hora (t3.micro)
│   ├── DynamoDB: $0.00013 por RC
│   ├── Redshift: $0.25 por hora (dc2.large)
│   └── Aurora: $0.029 por hora (serverless v1)
└── Network Services
    ├── VPC: Gratis
    ├── ELB: $0.0225 por hora
    ├── CloudFront: $0.085 por GB
    └── Direct Connect: $0.30 por hora
```

### **Azure Pricing Models**
```
Azure Pricing Structure
├── Compute Services
│   ├── VMs: $0.0081 por hora (B1s)
│   ├── Functions: $0.20 por millón de ejecuciones
│   ├── Container Instances: $0.036 por hora
│   └── Kubernetes: $0.10 por hora
├── Storage Services
│   ├── Blob Storage: $0.0184 por GB-mes
│   ├── Disk Storage: $0.05 por GB-mes
│   ├── File Storage: $0.13 por GB-mes
│   └── Archive Storage: $0.002 por GB-mes
├── Database Services
│   ├── SQL Database: $12.00 por mes (Basic)
│   ├── Cosmos DB: $0.00025 por RU
│   ├── MySQL: $0.0048 por hora
│   └── PostgreSQL: $0.0048 por hora
└── Network Services
    ├── Virtual Network: Gratis
    ├── Load Balancer: $0.025 por hora
    ├── CDN: $0.087 por GB
    └── ExpressRoute: $0.27 por hora
```

### **Google Cloud Pricing Models**
```
GCP Pricing Structure
├── Compute Services
│   ├── Compute Engine: $0.00495 por hora (e2-micro)
│   ├── Cloud Functions: $0.40 por millón de invocaciones
│   ├── GKE: $0.10 por hora (cluster)
│   └── Cloud Run: $0.000024 por vCPU-segundo
├── Storage Services
│   ├── Cloud Storage: $0.020 por GB-mes (Standard)
│   ├── Persistent Disk: $0.10 por GB-mes
│   ├── Filestore: $0.30 por GB-mes
│   └── Archive: $0.0025 por GB-mes
├── Database Services
│   ├── Cloud SQL: $9.28 por mes (db-n1-standard-1)
│   ├── BigQuery: $5.00 por TB
│   ├── Firestore: $0.18 por GB-mes
│   └── Spanner: $0.90 por hora (node)
└── Network Services
    ├── VPC Network: Gratis
    ├── Load Balancing: $0.025 por hora
    ├── CDN: $0.08 por GB
    └── Interconnect: $0.288 por hora
```

## Estrategias de Optimización de Costos

### **1. Rightsizing (Dimensionamiento Correcto)**
- **Monitoreo de Uso**: Analizar métricas de utilización
- **Ajuste de Recursos**: Redimensionar según demanda real
- **Auto Scaling**: Escalado automático basado en métricas
- **Optimización**: Eliminar recursos subutilizados

### **2. Purchasing Optimization**
- **Reserved Instances**: Para workloads predecibles
- **Savings Plans**: Para workloads variables
- **Spot Instances**: Para workloads tolerantes a interrupciones
- **Hybrid Models**: Combinación de modelos según necesidades

### **3. Storage Optimization**
- **Storage Classes**: Usar clases de almacenamiento apropiadas
- **Lifecycle Policies**: Automatizar transición de clases
- **Data Compression**: Comprimir datos para reducir almacenamiento
- **Cleanup**: Eliminar datos no utilizados

### **4. Network Optimization**
- **Data Transfer**: Minimizar transferencias entre regiones
- **CDN Usage**: Usar CDN para reducir costos de transferencia
- **VPC Peering**: Optimizar conectividad de red
- **Direct Connect**: Para conexiones de alto volumen

## Calculadoras de Costos y Herramientas

### **AWS Cost Management Tools**
```python
import boto3
import json
from datetime import datetime, timedelta

class CloudPricingManager:
    def __init__(self, region='us-east-1'):
        self.pricing = boto3.client('pricing', region_name=region)
        self.cost_explorer = boto3.client('ce', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.region = region
    
    def get_service_pricing(self, service_code, filters=None):
        """Obtener precios de servicio específico"""
        
        try:
            params = {
                'ServiceCode': service_code
            }
            
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
    
    def calculate_ec2_cost(self, instance_type, hours, pricing_model='on-demand'):
        """Calcular costo de instancia EC2"""
        
        try:
            # Obtener precios de EC2
            filters = [
                {'Type': 'TERM_MATCH', 'Field': 'instanceType', 'Value': instance_type},
                {'Type': 'TERM_MATCH', 'Field': 'location', 'Value': self.region},
                {'Type': 'TERM_MATCH', 'Field': 'operatingSystem', 'Value': 'Linux'}
            ]
            
            if pricing_model == 'on-demand':
                filters.append({'Type': 'TERM_MATCH', 'Field': 'tenancy', 'Value': 'Shared'})
            elif pricing_model == 'reserved':
                filters.append({'Type': 'TERM_MATCH', 'Field': 'tenancy', 'Value': 'Shared'})
                filters.append({'Type': 'TERM_MATCH', 'Field': 'purchaseOption', 'Value': 'No Upfront'})
            
            response = self.pricing.get_products(
                ServiceCode='AmazonEC2',
                Filters=filters
            )
            
            if response['PriceList']:
                product = json.loads(response['PriceList'][0])
                
                # Extraer precio por hora
                price_per_hour = 0
                for term in product['terms']:
                    if 'OnDemand' in term or term.get('TermAttributes', {}).get('TermType') == 'Reserved':
                        for dimension in term['priceDimensions']:
                            if dimension['rateCode'].endswith('Hrs'):
                                price_per_hour = float(dimension['pricePerUnit']['USD'])
                                break
                
                total_cost = price_per_hour * hours
                
                return {
                    'success': True,
                    'instance_type': instance_type,
                    'pricing_model': pricing_model,
                    'price_per_hour': price_per_hour,
                    'hours': hours,
                    'total_cost': total_cost
                }
            
            return {
                'success': False,
                'error': 'No pricing information found'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def calculate_s3_cost(self, storage_gb, storage_class='Standard', requests_put=0, requests_get=0):
        """Calcular costo de almacenamiento S3"""
        
        try:
            # Precios estándar de S3 (us-east-1)
            storage_prices = {
                'Standard': 0.023,
                'Intelligent-Tiering': 0.023,
                'Infrequent Access': 0.0125,
                'One Zone-IA': 0.01,
                'Glacier Instant Retrieval': 0.004,
                'Glacier Deep Archive': 0.00099
            }
            
            request_prices = {
                'PUT': 0.005,
                'GET': 0.0004,
                'SELECT': 0.002
            }
            
            # Calcular costo de almacenamiento
            storage_price_per_gb = storage_prices.get(storage_class, storage_prices['Standard'])
            storage_cost = storage_price_per_gb * storage_gb
            
            # Calcular costo de solicitudes
            put_cost = (requests_put / 1000) * request_prices['PUT']
            get_cost = (requests_get / 1000) * request_prices['GET']
            
            total_cost = storage_cost + put_cost + get_cost
            
            return {
                'success': True,
                'storage_gb': storage_gb,
                'storage_class': storage_class,
                'storage_cost': storage_cost,
                'put_requests': requests_put,
                'put_cost': put_cost,
                'get_requests': requests_get,
                'get_cost': get_cost,
                'total_cost': total_cost
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def calculate_rds_cost(self, instance_type, hours, multi_az=False, storage_gb=20):
        """Calcular costo de instancia RDS"""
        
        try:
            # Precios estándar de RDS (us-east-1)
            instance_prices = {
                'db.t3.micro': 0.089,
                'db.t3.small': 0.179,
                'db.t3.medium': 0.358,
                'db.t3.large': 0.716,
                'db.m5.large': 0.215,
                'db.m5.xlarge': 0.43,
                'db.m5.2xlarge': 0.86
            }
            
            storage_price = 0.10  # General Purpose SSD
            multi_az_multiplier = 2.0 if multi_az else 1.0
            
            # Calcular costo de instancia
            instance_price_per_hour = instance_prices.get(instance_type, 0.089)
            instance_cost = instance_price_per_hour * hours * multi_az_multiplier
            
            # Calcular costo de almacenamiento
            storage_cost = storage_price * storage_gb
            
            total_cost = instance_cost + storage_cost
            
            return {
                'success': True,
                'instance_type': instance_type,
                'hours': hours,
                'multi_az': multi_az,
                'instance_cost': instance_cost,
                'storage_gb': storage_gb,
                'storage_cost': storage_cost,
                'total_cost': total_cost
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def compare_pricing_models(self, instance_type, monthly_hours=730):
        """Comparar modelos de precios para instancia EC2"""
        
        try:
            # Calcular costos para diferentes modelos
            on_demand_cost = self.calculate_ec2_cost(instance_type, monthly_hours, 'on-demand')
            reserved_cost = self.calculate_ec2_cost(instance_type, monthly_hours, 'reserved')
            spot_cost = self.calculate_ec2_cost(instance_type, monthly_hours, 'spot')
            
            if not all([on_demand_cost['success'], reserved_cost['success'], spot_cost['success']]):
                return {
                    'success': False,
                    'error': 'Failed to calculate costs for one or more models'
                }
            
            # Calcular ahorros
            reserved_savings = ((on_demand_cost['total_cost'] - reserved_cost['total_cost']) / on_demand_cost['total_cost']) * 100
            spot_savings = ((on_demand_cost['total_cost'] - spot_cost['total_cost']) / on_demand_cost['total_cost']) * 100
            
            comparison = {
                'instance_type': instance_type,
                'monthly_hours': monthly_hours,
                'on_demand': {
                    'cost': on_demand_cost['total_cost'],
                    'price_per_hour': on_demand_cost['price_per_hour']
                },
                'reserved': {
                    'cost': reserved_cost['total_cost'],
                    'price_per_hour': reserved_cost['price_per_hour'],
                    'savings_percentage': reserved_savings
                },
                'spot': {
                    'cost': spot_cost['total_cost'],
                    'price_per_hour': spot_cost['price_per_hour'],
                    'savings_percentage': spot_savings
                },
                'recommendations': []
            }
            
            # Generar recomendaciones
            if reserved_savings > 40:
                comparison['recommendations'].append({
                    'model': 'Reserved',
                    'reason': f'Significant savings of {reserved_savings:.1f}% for stable workloads',
                    'savings': reserved_savings
                })
            
            if spot_savings > 80:
                comparison['recommendations'].append({
                    'model': 'Spot',
                    'reason': f'Maximum savings of {spot_savings:.1f}% for fault-tolerant workloads',
                    'savings': spot_savings,
                    'warning': 'Instances can be interrupted with short notice'
                })
            
            if reserved_savings < 20 and spot_savings < 50:
                comparison['recommendations'].append({
                    'model': 'On-Demand',
                    'reason': 'Limited savings for variable workloads',
                    'savings': 0
                })
            
            return {
                'success': True,
                'comparison': comparison
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_cost_and_usage(self, start_date, end_date, granularity='MONTHLY', metrics=None):
        """Obtener costos y uso de AWS Cost Explorer"""
        
        try:
            params = {
                'TimePeriod': {
                    'Start': start_date,
                    'End': end_date
                },
                'Granularity': granularity
            }
            
            if metrics:
                params['Metrics'] = metrics
            else:
                params['Metrics'] = ['BlendedCost', 'UnblendedCost', 'UsageQuantity']
            
            response = self.cost_explorer.get_cost_and_usage(**params)
            
            results = []
            for result in response['ResultsByTime']:
                period_info = {
                    'period_start': result['TimePeriod']['Start'],
                    'period_end': result['TimePeriod']['End'],
                    'groups': []
                }
                
                for group in result['Groups']:
                    group_info = {
                        'keys': group['Keys'],
                        'metrics': group['Metrics']
                    }
                    period_info['groups'].append(group_info)
                
                results.append(period_info)
            
            return {
                'success': True,
                'results': results,
                'count': len(results)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_cost_trends(self, months=6):
        """Analizar tendencias de costos"""
        
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=months * 30)
            
            # Obtener costos mensuales
            cost_result = self.get_cost_and_usage(
                start_date=start_date.strftime('%Y-%m-%d'),
                end_date=end_date.strftime('%Y-%m-%d'),
                granularity='MONTHLY'
            )
            
            if not cost_result['success']:
                return cost_result
            
            # Analizar tendencias
            monthly_costs = []
            for result in cost_result['results']:
                total_cost = 0
                for group in result['groups']:
                    if 'BlendedCost' in group['metrics']:
                        total_cost += float(group['metrics']['BlendedCost']['Amount'])
                
                monthly_costs.append({
                    'period': result['period_start'][:7],  # YYYY-MM
                    'cost': total_cost
                })
            
            # Calcular estadísticas
            if len(monthly_costs) > 1:
                first_month = monthly_costs[0]['cost']
                last_month = monthly_costs[-1]['cost']
                
                total_change = last_month - first_month
                percentage_change = (total_change / first_month) * 100 if first_month > 0 else 0
                
                average_cost = sum(month['cost'] for month in monthly_costs) / len(monthly_costs)
                max_cost = max(month['cost'] for month in monthly_costs)
                min_cost = min(month['cost'] for month in monthly_costs)
                
                trend_analysis = {
                    'period_months': months,
                    'monthly_costs': monthly_costs,
                    'statistics': {
                        'first_month_cost': first_month,
                        'last_month_cost': last_month,
                        'total_change': total_change,
                        'percentage_change': percentage_change,
                        'average_monthly_cost': average_cost,
                        'max_monthly_cost': max_cost,
                        'min_monthly_cost': min_cost
                    },
                    'recommendations': []
                }
                
                # Generar recomendaciones
                if percentage_change > 20:
                    trend_analysis['recommendations'].append({
                        'type': 'COST_INCREASE',
                        'message': f'Costs increased by {percentage_change:.1f}% over {months} months',
                        'action': 'Review recent changes and implement cost optimization'
                    })
                elif percentage_change < -10:
                    trend_analysis['recommendations'].append({
                        'type': 'COST_DECREASE',
                        'message': f'Costs decreased by {abs(percentage_change):.1f}% over {months} months',
                        'action': 'Maintain current optimization strategies'
                    })
                
                if max_cost > average_cost * 1.5:
                    trend_analysis['recommendations'].append({
                        'type': 'COST_VOLATILITY',
                        'message': 'High cost volatility detected',
                        'action': 'Implement budget alerts and investigate peak cost periods'
                    })
                
                return {
                    'success': True,
                    'trend_analysis': trend_analysis
                }
            
            return {
                'success': False,
                'error': 'Insufficient data for trend analysis'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Comparación de Modelos de Precios EC2**
```python
# Ejemplo: Comparar modelos de precios para diferentes instancias
manager = CloudPricingManager('us-east-1')

# Comparar precios para instancia t3.medium
comparison_result = manager.compare_pricing_models('db.t3.medium', monthly_hours=730)

if comparison_result['success']:
    comparison = comparison_result['comparison']
    
    print(f"EC2 Pricing Comparison for {comparison['instance_type']}")
    print(f"  Monthly Hours: {comparison['monthly_hours']}")
    
    print(f"\nOn-Demand:")
    print(f"  Cost: ${comparison['on_demand']['cost']:.2f}")
    print(f"  Price per hour: ${comparison['on_demand']['price_per_hour']:.4f}")
    
    print(f"\nReserved:")
    print(f"  Cost: ${comparison['reserved']['cost']:.2f}")
    print(f"  Price per hour: ${comparison['reserved']['price_per_hour']:.4f}")
    print(f"  Savings: {comparison['reserved']['savings_percentage']:.1f}%")
    
    print(f"\nSpot:")
    print(f"  Cost: ${comparison['spot']['cost']:.2f}")
    print(f"  Price per hour: ${comparison['spot']['price_per_hour']:.4f}")
    print(f"  Savings: {comparison['spot']['savings_percentage']:.1f}%")
    
    print(f"\nRecommendations:")
    for rec in comparison['recommendations']:
        print(f"  {rec['model']}: {rec['reason']}")
        if 'warning' in rec:
            print(f"    Warning: {rec['warning']}")
```

### **2. Análisis de Costos de Almacenamiento**
```python
# Ejemplo: Calcular costos de almacenamiento S3
manager = CloudPricingManager('us-east-1')

# Calcular costo para diferentes clases de almacenamiento
storage_scenarios = [
    {'class': 'Standard', 'gb': 1000, 'put': 10000, 'get': 50000},
    {'class': 'Infrequent Access', 'gb': 1000, 'put': 10000, 'get': 50000},
    {'class': 'Glacier Deep Archive', 'gb': 1000, 'put': 10000, 'get': 50000}
]

print("S3 Storage Cost Comparison:")
for scenario in storage_scenarios:
    cost_result = manager.calculate_s3_cost(
        storage_gb=scenario['gb'],
        storage_class=scenario['class'],
        requests_put=scenario['put'],
        requests_get=scenario['get']
    )
    
    if cost_result['success']:
        cost = cost_result
        print(f"\n{scenario['class']}:")
        print(f"  Storage Cost: ${cost['storage_cost']:.2f}")
        print(f"  PUT Cost: ${cost['put_cost']:.2f}")
        print(f"  GET Cost: ${cost['get_cost']:.2f}")
        print(f"  Total Cost: ${cost['total_cost']:.2f}")
```

### **3. Análisis de Tendencias de Costos**
```python
# Ejemplo: Analizar tendencias de costos de 6 meses
manager = CloudPricingManager('us-east-1')

trend_result = manager.analyze_cost_trends(months=6)

if trend_result['success']:
    trend = trend_result['trend_analysis']
    
    print(f"Cost Trend Analysis ({trend['period_months']} months)")
    
    stats = trend['statistics']
    print(f"\nStatistics:")
    print(f"  First Month: ${stats['first_month_cost']:.2f}")
    print(f"  Last Month: ${stats['last_month_cost']:.2f}")
    print(f"  Total Change: ${stats['total_change']:.2f}")
    print(f"  Percentage Change: {stats['percentage_change']:.1f}%")
    print(f"  Average Monthly: ${stats['average_monthly_cost']:.2f}")
    print(f"  Max Monthly: ${stats['max_monthly_cost']:.2f}")
    print(f"  Min Monthly: ${stats['min_monthly_cost']:.2f}")
    
    print(f"\nMonthly Costs:")
    for month_cost in trend['monthly_costs']:
        print(f"  {month_cost['period']}: ${month_cost['cost']:.2f}")
    
    print(f"\nRecommendations:")
    for rec in trend['recommendations']:
        print(f"  {rec['type']}: {rec['message']}")
        print(f"    Action: {rec['action']}")
```

### **4. Cálculo de Costos de Base de Datos**
```python
# Ejemplo: Calcular costos de RDS
manager = CloudPricingManager('us-east-1')

# Comparar configuraciones de RDS
rds_scenarios = [
    {'instance': 'db.t3.micro', 'hours': 730, 'multi_az': False, 'storage': 20},
    {'instance': 'db.t3.micro', 'hours': 730, 'multi_az': True, 'storage': 20},
    {'instance': 'db.m5.large', 'hours': 730, 'multi_az': True, 'storage': 100}
]

print("RDS Cost Comparison:")
for scenario in rds_scenarios:
    cost_result = manager.calculate_rds_cost(
        instance_type=scenario['instance'],
        hours=scenario['hours'],
        multi_az=scenario['multi_az'],
        storage_gb=scenario['storage']
    )
    
    if cost_result['success']:
        cost = cost_result
        print(f"\n{scenario['instance']} ({'Multi-AZ' if scenario['multi_az'] else 'Single-AZ'}):")
        print(f"  Instance Cost: ${cost['instance_cost']:.2f}")
        print(f"  Storage Cost: ${cost['storage_cost']:.2f}")
        print(f"  Total Cost: ${cost['total_cost']:.2f}")
```

## Herramientas de Análisis de Costos

### **AWS Cost Management Tools**
- **Cost Explorer**: Análisis detallado de costos
- **Budgets**: Creación y seguimiento de presupuestos
- **Cost and Usage Report**: Reportes detallados de costos
- **Reserved Instance Reporting**: Reportes de instancias reservadas
- **Savings Plans Reporting**: Reportes de planes de ahorro

### **Third-party Tools**
- **CloudHealth**: Gestión de costos y optimización
- **ParkMyCloud**: Automatización de ahorro de costos
- **Cloudability**: Análisis y optimización de costos
- **Turbonomic**: Optimización automática de recursos
- **CloudZero**: Análisis de costos unitarios

## Mejores Prácticas de Optimización

### **1. Monitorización Continua**
- **Cost Alerts**: Configurar alertas de costos
- **Budget Tracking**: Seguimiento de presupuestos
- **Usage Analysis**: Análisis regular del uso
- **Cost Attribution**: Asignación de costos por departamento

### **2. Automatización**
- **Auto Scaling**: Escalado automático basado en demanda
- **Scheduled Scaling**: Escalado programado
- **Resource Scheduling**: Programación de recursos
- **Cleanup Automation**: Limpieza automática de recursos

### **3. Selección de Modelos**
- **Workload Analysis**: Analizar patrones de uso
- **Reserved Instances**: Para workloads estables
- **Spot Instances**: Para workloads tolerantes
- **Savings Plans**: Para flexibilidad con ahorros

### **4. Optimización de Recursos**
- **Rightsizing**: Dimensionamiento correcto de recursos
- **Storage Classes**: Clases de almacenamiento apropiadas
- **Data Transfer**: Optimización de transferencia de datos
- **Instance Types**: Tipos de instancia optimizados

## Comparación de Proveedores

### **Costo Total de Propiedad (TCO)**
```
TCO Comparison (3-year period for 100 instances)
├── AWS
│   ├── Compute: $200,000
│   ├── Storage: $50,000
│   ├── Network: $30,000
│   ├── Management: $40,000
│   └── Total: $320,000
├── Azure
│   ├── Compute: $220,000
│   ├── Storage: $55,000
│   ├── Network: $35,000
│   ├── Management: $45,000
│   └── Total: $355,000
└── Google Cloud
    ├── Compute: $180,000
    ├── Storage: $45,000
    ├── Network: $25,000
    ├── Management: $35,000
    └── Total: $285,000
```

### **Factores de Decisión**
- **Workload Requirements**: Requisitos específicos del workload
- **Geographic Presence**: Presencia geográfica del proveedor
- **Compliance Requirements**: Requisitos de cumplimiento normativo
- **Technical Expertise**: Experiencia técnica del equipo
- **Vendor Lock-in**: Riesgo de dependencia del proveedor

## Estrategias de Negociación

### **Enterprise Discounts**
- **Volume Commitments**: Compromisos de volumen
- **Multi-year Contracts**: Contratos multi-anuales
- **Enterprise Support**: Soporte empresarial
- **Custom Pricing**: Precios personalizados

### **Optimization Programs**
- **AWS Enterprise Discount**: Programa de descuentos empresariales
- **Azure Hybrid Benefit**: Beneficio híbrido de Azure
- **Google Committed Use**: Uso comprometido de Google
- **Strategic Pricing**: Precios estratégicos

## Cumplimiento Normativo

### **Control de Costos**
- **Budget Enforcement**: Cumplimiento de presupuestos
- **Cost Allocation**: Asignación de costos por proyecto
- **Audit Trail**: Registro de auditoría de costos
- **Compliance Reporting**: Reportes de cumplimiento

### **Regulaciones Aplicables**
- **SOX**: Control de costos y auditoría
- **GDPR**: Protección de datos de costos
- **HIPAA**: Costos de servicios de salud
- **PCI DSS**: Costos de servicios de pago

## Herramientas de Análisis de Costos

### **AWS Tools**
- **AWS Cost Explorer**: Análisis avanzado de costos
- **AWS Budgets**: Gestión de presupuestos
- **AWS Cost and Usage Report**: Reportes detallados
- **AWS Trusted Advisor**: Recomendaciones de optimización

### **Third-party Solutions**
- **CloudHealth**: Gestión de costos multi-nube
- **Apptio**: FinOps y gestión de costos
- **Flexera**: Optimización de costos y licencias
- **Cloudability**: Análisis de costos y optimización

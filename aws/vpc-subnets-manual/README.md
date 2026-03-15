# Manual de VPC y Subredes AWS

## Tabla de Contenidos
1. [Introducción](#introducción)
2. [Conceptos Fundamentales](#conceptos-fundamentales)
3. [Planificación de VPC](#planificación-de-vpc)
4. [Creación de VPC](#creación-de-vpc)
5. [Configuración de Subredes](#configuración-de-subredes)
6. [Networking y Conectividad](#networking-y-conectividad)
7. [Seguridad](#seguridad)
8. [Mejores Prácticas](#mejores-prácticas)
9. [Troubleshooting](#troubleshooting)
10. [Casos de Uso Prácticos](#casos-de-uso-prácticos)

## Introducción

### ¿Qué es una VPC?
Una Virtual Private Cloud (VPC) es una red virtual aislada lógicamente dentro de la nube de AWS que te permite lanzar recursos AWS en una red virtual que defines. Tienes control completo sobre tu entorno de red, incluyendo la selección de tu propio rango de direcciones IP, la creación de subredes, la configuración de tablas de rutas y gateways de red.

### Beneficios de VPC
- **Aislamiento**: Red privada y aislada de otros clientes
- **Control**: Control completo sobre la configuración de red
- **Seguridad**: Múltiples capas de seguridad
- **Flexibilidad**: Configuración personalizada según necesidades
- **Escalabilidad**: Crecimiento según demanda

## Conceptos Fundamentales

### CIDR Blocks
```
Formato: x.x.x.x/y
Ejemplos:
- 10.0.0.0/16 = 65,536 direcciones IP
- 172.16.0.0/12 = 1,048,576 direcciones IP
- 192.168.0.0/16 = 65,536 direcciones IP
```

### Tipos de Subredes
- **Públicas**: Acceso a internet a través de Internet Gateway
- **Privadas**: Sin acceso directo a internet, usan NAT Gateway
- **Aisladas**: Sin acceso a internet ni a otros servicios

### Componentes Principales
```
VPC
├── Subnets (Públicas/Privadas)
├── Internet Gateway (para subredes públicas)
├── NAT Gateway (para subredes privadas)
├── Route Tables
├── Security Groups
└── Network ACLs
```

## Planificación de VPC

### Paso 1: Definir Requisitos
```bash
# Preguntas clave:
- ¿Cuántas instancias necesitas?
- ¿Necesitas acceso a internet?
- ¿Cuántas capas de arquitectura (web/app/db)?
- ¿Cuántas Availability Zones?
- ¿Necesitas conectividad con otras redes?
```

### Paso 2: Diseño de CIDR
```python
# Ejemplo de planificación CIDR
class VPCPlanner:
    def __init__(self):
        self.vpc_cidr = "10.0.0.0/16"  # 65,536 IPs
        
    def plan_subnets(self, num_tiers=3, num_azs=2):
        """Planificar subredes por tier y AZ"""
        
        # Dividir VPC en subnets
        # Tier 1 (Web): 10.0.1.0/24, 10.0.2.0/24
        # Tier 2 (App): 10.0.11.0/24, 10.0.12.0/24  
        # Tier 3 (DB): 10.0.21.0/24, 10.0.22.0/24
        
        subnet_plan = {
            'web': [
                {'cidr': '10.0.1.0/24', 'az': 'us-east-1a', 'type': 'public'},
                {'cidr': '10.0.2.0/24', 'az': 'us-east-1b', 'type': 'public'}
            ],
            'app': [
                {'cidr': '10.0.11.0/24', 'az': 'us-east-1a', 'type': 'private'},
                {'cidr': '10.0.12.0/24', 'az': 'us-east-1b', 'type': 'private'}
            ],
            'db': [
                {'cidr': '10.0.21.0/24', 'az': 'us-east-1a', 'type': 'private'},
                {'cidr': '10.0.22.0/24', 'az': 'us-east-1b', 'type': 'private'}
            ]
        }
        
        return subnet_plan
```

### Paso 3: Plan de IP Addressing
```bash
# Planificación de direcciones IP
VPC: 10.0.0.0/16 (65,536 IPs)
├── Reservado: 10.0.0.0/24 (256 IPs) - AWS reservado
├── Web Tier: 10.0.1.0/22 (1,024 IPs)
│   ├── 10.0.1.0/24 - AZ1 (256 IPs)
│   └── 10.0.2.0/24 - AZ2 (256 IPs)
├── App Tier: 10.0.4.0/22 (1,024 IPs)
│   ├── 10.0.4.0/24 - AZ1 (256 IPs)
│   └── 10.0.5.0/24 - AZ2 (256 IPs)
└── DB Tier: 10.0.8.0/22 (1,024 IPs)
    ├── 10.0.8.0/24 - AZ1 (256 IPs)
    └── 10.0.9.0/24 - AZ2 (256 IPs)
```

## Creación de VPC

### Método 1: AWS Console
1. Ir a VPC Dashboard
2. Click "Create VPC"
3. Seleccionar "VPC and more"
4. Configurar nombre, CIDR, Availability Zones
5. Seleccionar tipo de subredes
6. Configurar NAT Gateways, VPC Endpoints
7. Click "Create VPC"

### Método 2: AWS CLI
```bash
# 1. Crear VPC
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=my-vpc}]'

# 2. Habilitar DNS
aws ec2 modify-vpc-attribute \
  --vpc-id vpc-1234567890abcdef0 \
  --enable-dns-hostnames \
  --enable-dns-support

# 3. Crear Internet Gateway
aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=my-igw}]'

# 4. Adjuntar IGW a VPC
aws ec2 attach-internet-gateway \
  --vpc-id vpc-1234567890abcdef0 \
  --internet-gateway-id igw-1234567890abcdef0
```

### Método 3: Python/Boto3
```python
import boto3

class VPCCreator:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
    
    def create_complete_vpc(self, config):
        """Crear VPC completa con todos los componentes"""
        
        # 1. Crear VPC
        vpc_response = self.ec2.create_vpc(
            CidrBlock=config['vpc_cidr'],
            TagSpecifications=[
                {
                    'ResourceType': 'vpc',
                    'Tags': [{'Key': 'Name', 'Value': config['vpc_name']}]
                }
            ]
        )
        vpc_id = vpc_response['Vpc']['VpcId']
        
        print(f"VPC creada: {vpc_id}")
        
        # 2. Habilitar DNS
        self.ec2.modify_vpc_attribute(
            VpcId=vpc_id,
            EnableDnsHostnames={'Value': True}
        )
        self.ec2.modify_vpc_attribute(
            VpcId=vpc_id,
            EnableDnsSupport={'Value': True}
        )
        
        # 3. Crear subredes
        subnets = {}
        for subnet_config in config['subnets']:
            subnet_response = self.ec2.create_subnet(
                VpcId=vpc_id,
                CidrBlock=subnet_config['cidr'],
                AvailabilityZone=subnet_config['az'],
                TagSpecifications=[
                    {
                        'ResourceType': 'subnet',
                        'Tags': [{'Key': 'Name', 'Value': subnet_config['name']}]
                    }
                ]
            )
            
            subnet_id = subnet_response['Subnet']['SubnetId']
            subnets[subnet_config['name']] = subnet_id
            print(f"Subnet creada: {subnet_id}")
            
            # Habilitar auto-assign IP para subredes públicas
            if subnet_config['type'] == 'public':
                self.ec2.modify_subnet_attribute(
                    SubnetId=subnet_id,
                    MapPublicIpOnLaunch={'Value': True}
                )
        
        # 4. Crear Internet Gateway
        igw_response = self.ec2.create_internet_gateway(
            TagSpecifications=[
                {
                    'ResourceType': 'internet-gateway',
                    'Tags': [{'Key': 'Name', 'Value': f"{config['vpc_name']}-igw"}]
                }
            ]
        )
        igw_id = igw_response['InternetGateway']['InternetGatewayId']
        
        # Adjuntar IGW
        self.ec2.attach_internet_gateway(
            VpcId=vpc_id,
            InternetGatewayId=igw_id
        )
        
        print(f"Internet Gateway creado: {igw_id}")
        
        # 5. Crear NAT Gateway (para subredes privadas)
        nat_gateway_id = None
        if config.get('create_nat_gateway'):
            # Primero crear Elastic IP
            eip_response = self.ec2.allocate_address(Domain='vpc')
            eip_id = eip_response['AllocationId']
            
            # Crear NAT Gateway en primera subnet pública
            public_subnet = next(s for s in config['subnets'] if s['type'] == 'public')
            public_subnet_id = subnets[public_subnet['name']]
            
            nat_response = self.ec2.create_nat_gateway(
                SubnetId=public_subnet_id,
                AllocationId=eip_id,
                TagSpecifications=[
                    {
                        'ResourceType': 'natgateway',
                        'Tags': [{'Key': 'Name', 'Value': f"{config['vpc_name']}-nat"}]
                    }
                ]
            )
            nat_gateway_id = nat_response['NatGateway']['NatGatewayId']
            print(f"NAT Gateway creado: {nat_gateway_id}")
        
        # 6. Crear Route Tables
        route_tables = {}
        
        # Route table para subredes públicas
        public_rt_response = self.ec2.create_route_table(
            VpcId=vpc_id,
            TagSpecifications=[
                {
                    'ResourceType': 'route-table',
                    'Tags': [{'Key': 'Name', 'Value': f"{config['vpc_name']}-public-rt"}]
                }
            ]
        )
        public_rt_id = public_rt_response['RouteTable']['RouteTableId']
        
        # Agregar ruta a internet
        self.ec2.create_route(
            RouteTableId=public_rt_id,
            DestinationCidrBlock='0.0.0.0/0',
            GatewayId=igw_id
        )
        
        route_tables['public'] = public_rt_id
        
        # Route table para subredes privadas
        if nat_gateway_id:
            private_rt_response = self.ec2.create_route_table(
                VpcId=vpc_id,
                TagSpecifications=[
                    {
                        'ResourceType': 'route-table',
                        'Tags': [{'Key': 'Name', 'Value': f"{config['vpc_name']}-private-rt"}]
                    }
                ]
            )
            private_rt_id = private_rt_response['RouteTable']['RouteTableId']
            
            # Agregar ruta a NAT Gateway
            self.ec2.create_route(
                RouteTableId=private_rt_id,
                DestinationCidrBlock='0.0.0.0/0',
                NatGatewayId=nat_gateway_id
            )
            
            route_tables['private'] = private_rt_id
        
        # 7. Asociar route tables a subredes
        for subnet_config in config['subnets']:
            subnet_id = subnets[subnet_config['name']]
            rt_type = 'public' if subnet_config['type'] == 'public' else 'private'
            
            self.ec2.associate_route_table(
                RouteTableId=route_tables[rt_type],
                SubnetId=subnet_id
            )
        
        return {
            'vpc_id': vpc_id,
            'subnets': subnets,
            'internet_gateway_id': igw_id,
            'nat_gateway_id': nat_gateway_id,
            'route_tables': route_tables
        }

# Ejemplo de uso
creator = VPCCreator()

config = {
    'vpc_name': 'mi-vpc-produccion',
    'vpc_cidr': '10.0.0.0/16',
    'create_nat_gateway': True,
    'subnets': [
        {'name': 'web-1a', 'cidr': '10.0.1.0/24', 'az': 'us-east-1a', 'type': 'public'},
        {'name': 'web-1b', 'cidr': '10.0.2.0/24', 'az': 'us-east-1b', 'type': 'public'},
        {'name': 'app-1a', 'cidr': '10.0.11.0/24', 'az': 'us-east-1a', 'type': 'private'},
        {'name': 'app-1b', 'cidr': '10.0.12.0/24', 'az': 'us-east-1b', 'type': 'private'},
        {'name': 'db-1a', 'cidr': '10.0.21.0/24', 'az': 'us-east-1a', 'type': 'private'},
        {'name': 'db-1b', 'cidr': '10.0.22.0/24', 'az': 'us-east-1b', 'type': 'private'}
    ]
}

result = creator.create_complete_vpc(config)
print(f"VPC creada exitosamente: {result}")
```

## Configuración de Subredes

### Subredes Públicas
```bash
# Características:
- Acceso a Internet Gateway
- Auto-assign public IP enabled
- Para: Load Balancers, Bastion Hosts, NAT Gateways

# Creación
aws ec2 create-subnet \
  --vpc-id vpc-1234567890abcdef0 \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=public-subnet-1a}]'

# Habilitar auto-assign public IP
aws ec2 modify-subnet-attribute \
  --subnet-id subnet-1234567890abcdef0 \
  --map-public-ip-on-launch
```

### Subredes Privadas
```bash
# Características:
- Sin acceso directo a Internet
- Usan NAT Gateway para salida
- Para: Servidores de aplicación, bases de datos

# Creación
aws ec2 create-subnet \
  --vpc-id vpc-1234567890abcdef0 \
  --cidr-block 10.0.11.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=private-subnet-1a}]'
```

### Subredes Aisladas
```bash
# Características:
- Sin acceso a Internet
- Sin NAT Gateway
- Para: Datos sensibles, backups

# Creación
aws ec2 create-subnet \
  --vpc-id vpc-1234567890abcdef0 \
  --cidr-block 10.0.31.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=isolated-subnet-1a}]'
```

## Networking y Conectividad

### Internet Gateway

El Internet Gateway (IGW) permite la comunicación entre tu VPC e internet. Es un componente fundamental para las subredes públicas.

#### Características del Internet Gateway
- Conexión bidireccional entre VPC e internet
- Altamente disponible y redundante
- Sin costo adicional por el gateway
- Solo un IGW por VPC

#### Creación y Configuración
```bash
# Crear Internet Gateway
aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=my-igw}]'

# Adjuntar a VPC
aws ec2 attach-internet-gateway \
  --vpc-id vpc-1234567890abcdef0 \
  --internet-gateway-id igw-1234567890abcdef0

# Describir Internet Gateway
aws ec2 describe-internet-gateways \
  --internet-gateway-ids igw-1234567890abcdef0

# Desadjuntar de VPC (antes de eliminar)
aws ec2 detach-internet-gateway \
  --vpc-id vpc-1234567890abcdef0 \
  --internet-gateway-id igw-1234567890abcdef0

# Eliminar Internet Gateway
aws ec2 delete-internet-gateway \
  --internet-gateway-id igw-1234567890abcdef0
```

#### Configuración con Python
```python
class InternetGatewayManager:
    def __init__(self, ec2_client):
        self.ec2 = ec2_client
    
    def create_and_attach_igw(self, vpc_id, name):
        """Crear y adjuntar Internet Gateway"""
        
        # Crear Internet Gateway
        igw_response = self.ec2.create_internet_gateway(
            TagSpecifications=[
                {
                    'ResourceType': 'internet-gateway',
                    'Tags': [{'Key': 'Name', 'Value': name}]
                }
            ]
        )
        
        igw_id = igw_response['InternetGateway']['InternetGatewayId']
        
        # Adjuntar a VPC
        self.ec2.attach_internet_gateway(
            VpcId=vpc_id,
            InternetGatewayId=igw_id
        )
        
        return {
            'igw_id': igw_id,
            'vpc_id': vpc_id,
            'status': 'attached'
        }
    
    def verify_igw_connectivity(self, vpc_id):
        """Verificar conectividad del Internet Gateway"""
        
        response = self.ec2.describe_internet_gateways(
            Filters=[
                {'Name': 'attachment.vpc-id', 'Values': [vpc_id]}
            ]
        )
        
        if response['InternetGateways']:
            igw = response['InternetGateways'][0]
            return {
                'igw_id': igw['InternetGatewayId'],
                'state': igw['Attachments'][0]['State'],
                'vpc_id': igw['Attachments'][0]['VpcId']
            }
        else:
            return {'error': 'No Internet Gateway found for VPC'}
```

### NAT Gateway

El Network Address Translation (NAT) Gateway permite que las instancias en subredes privadas se conecten a internet o a otros servicios de AWS, pero impide que internet inicie una conexión con esas instancias.

#### Características del NAT Gateway
- Permite salida a internet desde subredes privadas
- Alta disponibilidad en una Availability Zone
- Escala automáticamente hasta 45 Gbps
- Gestión automática de direcciones IP

#### Creación y Configuración
```bash
# 1. Asignar Elastic IP para NAT Gateway
aws ec2 allocate-address \
  --domain vpc \
  --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=nat-eip}]'

# 2. Crear NAT Gateway
aws ec2 create-nat-gateway \
  --subnet-id subnet-1234567890abcdef0 \
  --allocation-id eipalloc-1234567890abcdef0 \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=my-nat-gateway}]

# 3. Esperar a que NAT Gateway esté disponible
aws ec2 wait nat-gateway-available \
  --nat-gateway-ids nat-1234567890abcdef0

# 4. Describir NAT Gateway
aws ec2 describe-nat-gateways \
  --nat-gateway-ids nat-1234567890abcdef0

# 5. Eliminar NAT Gateway (primero liberar EIP)
aws ec2 delete-nat-gateway \
  --nat-gateway-id nat-1234567890abcdef0

aws ec2 release-address \
  --allocation-id eipalloc-1234567890abcdef0
```

#### Configuración con Python
```python
class NATGatewayManager:
    def __init__(self, ec2_client):
        self.ec2 = ec2_client
    
    def create_nat_gateway(self, subnet_id, name):
        """Crear NAT Gateway con Elastic IP"""
        
        # 1. Asignar Elastic IP
        eip_response = self.ec2.allocate_address(
            Domain='vpc',
            TagSpecifications=[
                {
                    'ResourceType': 'elastic-ip',
                    'Tags': [{'Key': 'Name', 'Value': f'{name}-eip'}]
                }
            ]
        )
        
        allocation_id = eip_response['AllocationId']
        
        # 2. Crear NAT Gateway
        nat_response = self.ec2.create_nat_gateway(
            SubnetId=subnet_id,
            AllocationId=allocation_id,
            TagSpecifications=[
                {
                    'ResourceType': 'natgateway',
                    'Tags': [{'Key': 'Name', 'Value': name}]
                }
            ]
        )
        
        nat_id = nat_response['NatGateway']['NatGatewayId']
        
        # 3. Esperar a que esté disponible
        waiter = self.ec2.get_waiter('nat_gateway_available')
        waiter.wait(NatGatewayIds=[nat_id])
        
        return {
            'nat_gateway_id': nat_id,
            'allocation_id': allocation_id,
            'subnet_id': subnet_id,
            'status': 'available'
        }
    
    def monitor_nat_gateway_usage(self, nat_id, hours=24):
        """Monitorear uso de NAT Gateway"""
        
        import boto3
        cloudwatch = boto3.client('cloudwatch')
        
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=hours)
        
        # Obtener métricas de bytes procesados
        metrics = cloudwatch.get_metric_statistics(
            Namespace='AWS/NATGateway',
            MetricName='BytesOutFromSource',
            Dimensions=[
                {'Name': 'NatGatewayId', 'Value': nat_id}
            ],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=['Sum', 'Average']
        )
        
        return {
            'nat_gateway_id': nat_id,
            'metrics': metrics['Datapoints'],
            'time_range': f"Last {hours} hours"
        }
    
    def get_nat_gateway_cost_estimate(self, nat_id, hours=730):
        """Estimar costos de NAT Gateway (6 meses = 730 horas)"""
        
        # NAT Gateway: $0.045 por hora
        # Data Processing: $0.045 por GB
        
        hourly_cost = 0.045
        total_hours_cost = hourly_cost * hours
        
        return {
            'nat_gateway_id': nat_id,
            'hourly_rate': hourly_cost,
            'estimated_hours': hours,
            'gateway_cost': total_hours_cost,
            'data_processing_cost': '0.045 por GB procesado'
        }
```

### Comparación: Internet Gateway vs NAT Gateway

| Característica | Internet Gateway | NAT Gateway |
|----------------|-------------------|--------------|
| **Propósito** | Conectar VPC a internet | Salida a internet desde subnets privadas |
| **Dirección IP** | Pública estática | Pública estática (EIP) |
| **Costo** | Gratis | $0.045 por hora + $0.045/GB |
| **Disponibilidad** | Regional | Por Availability Zone |
| **Escalabilidad** | Ilimitada | Hasta 45 Gbps |
| **Uso típico** | Subredes públicas | Subredes privadas |

### Route Tables
```python
class RouteTableManager:
    def __init__(self, ec2_client):
        self.ec2 = ec2_client
    
    def create_public_route_table(self, vpc_id, igw_id, name):
        """Crear route table para subredes públicas"""
        
        # Crear route table
        rt_response = self.ec2.create_route_table(
            VpcId=vpc_id,
            TagSpecifications=[
                {
                    'ResourceType': 'route-table',
                    'Tags': [{'Key': 'Name', 'Value': name}]
                }
            ]
        )
        rt_id = rt_response['RouteTable']['RouteTableId']
        
        # Agregar ruta a Internet
        self.ec2.create_route(
            RouteTableId=rt_id,
            DestinationCidrBlock='0.0.0.0/0',
            GatewayId=igw_id
        )
        
        return rt_id
    
    def create_private_route_table(self, vpc_id, nat_id, name):
        """Crear route table para subredes privadas"""
        
        # Crear route table
        rt_response = self.ec2.create_route_table(
            VpcId=vpc_id,
            TagSpecifications=[
                {
                    'ResourceType': 'route-table',
                    'Tags': [{'Key': 'Name', 'Value': name}]
                }
            ]
        )
        rt_id = rt_response['RouteTable']['RouteTableId']
        
        # Agregar ruta a NAT Gateway
        self.ec2.create_route(
            RouteTableId=rt_id,
            DestinationCidrBlock='0.0.0.0/0',
            NatGatewayId=nat_id
        )
        
        return rt_id
    
    def associate_subnet_to_route_table(self, rt_id, subnet_id):
        """Asociar subnet a route table"""
        
        response = self.ec2.associate_route_table(
            RouteTableId=rt_id,
            SubnetId=subnet_id
        )
        
        return response['AssociationId']
```

### NAT Gateway
```bash
# 1. Asignar Elastic IP
aws ec2 allocate-address --domain vpc

# 2. Crear NAT Gateway
aws ec2 create-nat-gateway \
  --subnet-id subnet-1234567890abcdef0 \
  --allocation-id eipalloc-1234567890abcdef0 \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=my-nat}]'

# 3. Esperar a que esté disponible
aws ec2 wait nat-gateway-available \
  --nat-gateway-ids nat-1234567890abcdef0
```

### VPC Endpoints
```bash
# VPC Endpoint para S3 (Gateway)
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-1234567890abcdef0 \
  --service-name com.amazonaws.us-east-1.s3 \
  --route-table-ids rtb-1234567890abcdef0 \
  --tag-specifications 'ResourceType=vpc-endpoint,Tags=[{Key=Name,Value=s3-endpoint}]'

# VPC Endpoint para DynamoDB (Gateway)
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-1234567890abcdef0 \
  --service-name com.amazonaws.us-east-1.dynamodb \
  --route-table-ids rtb-1234567890abcdef0 \
  --tag-specifications 'ResourceType=vpc-endpoint,Tags=[{Key=Name,Value=dynamodb-endpoint}]'

# VPC Endpoint para API (Interface)
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-1234567890abcdef0 \
  --service-name com.amazonaws.us-east-1.ec2 \
  --vpc-endpoint-type Interface \
  --subnet-ids subnet-1234567890abcdef0 subnet-87654321fedcba9 \
  --security-group-ids sg-1234567890abcdef0 \
  --tag-specifications 'ResourceType=vpc-endpoint,Tags=[{Key=Name,Value=ec2-endpoint}]'
```

## Seguridad

### Security Groups
```python
class SecurityGroupManager:
    def __init__(self, ec2_client):
        self.ec2 = ec2_client
    
    def create_web_security_group(self, vpc_id, name):
        """Crear security group para web servers"""
        
        response = self.ec2.create_security_group(
            GroupName=name,
            Description='Security group for web servers',
            VpcId=vpc_id,
            TagSpecifications=[
                {
                    'ResourceType': 'security-group',
                    'Tags': [{'Key': 'Name', 'Value': name}]
                }
            ]
        )
        
        sg_id = response['GroupId']
        
        # Reglas de entrada
        ingress_rules = [
            # HTTP desde cualquier lugar
            {
                'IpProtocol': 'tcp',
                'FromPort': 80,
                'ToPort': 80,
                'IpRanges': [{'CidrIp': '0.0.0.0/0'}]
            },
            # HTTPS desde cualquier lugar
            {
                'IpProtocol': 'tcp',
                'FromPort': 443,
                'ToPort': 443,
                'IpRanges': [{'CidrIp': '0.0.0.0/0'}]
            },
            # SSH desde red corporativa
            {
                'IpProtocol': 'tcp',
                'FromPort': 22,
                'ToPort': 22,
                'IpRanges': [{'CidrIp': '203.0.113.0/24'}]
            }
        ]
        
        for rule in ingress_rules:
            self.ec2.authorize_security_group_ingress(
                GroupId=sg_id,
                IpPermissions=[rule]
            )
        
        # Reglas de salida (permitir todo)
        egress_rules = [
            {
                'IpProtocol': '-1',
                'IpRanges': [{'CidrIp': '0.0.0.0/0'}]
            }
        ]
        
        self.ec2.authorize_security_group_egress(
            GroupId=sg_id,
            IpPermissions=egress_rules
        )
        
        return sg_id
    
    def create_app_security_group(self, vpc_id, name, web_sg_id):
        """Crear security group para application servers"""
        
        response = self.ec2.create_security_group(
            GroupName=name,
            Description='Security group for application servers',
            VpcId=vpc_id,
            TagSpecifications=[
                {
                    'ResourceType': 'security-group',
                    'Tags': [{'Key': 'Name', 'Value': name}]
                }
            ]
        )
        
        sg_id = response['GroupId']
        
        # Solo permitir tráfico desde web servers
        ingress_rules = [
            # HTTP desde web servers
            {
                'IpProtocol': 'tcp',
                'FromPort': 8080,
                'ToPort': 8080,
                'UserIdGroupPairs': [{'GroupId': web_sg_id}]
            },
            # SSH desde web servers
            {
                'IpProtocol': 'tcp',
                'FromPort': 22,
                'ToPort': 22,
                'UserIdGroupPairs': [{'GroupId': web_sg_id}]
            }
        ]
        
        for rule in ingress_rules:
            self.ec2.authorize_security_group_ingress(
                GroupId=sg_id,
                IpPermissions=[rule]
            )
        
        return sg_id
    
    def create_db_security_group(self, vpc_id, name, app_sg_id):
        """Crear security group para bases de datos"""
        
        response = self.ec2.create_security_group(
            GroupName=name,
            Description='Security group for database servers',
            VpcId=vpc_id,
            TagSpecifications=[
                {
                    'ResourceType': 'security-group',
                    'Tags': [{'Key': 'Name', 'Value': name}]
                }
            ]
        )
        
        sg_id = response['GroupId']
        
        # Solo permitir tráfico desde app servers
        ingress_rules = [
            # MySQL desde app servers
            {
                'IpProtocol': 'tcp',
                'FromPort': 3306,
                'ToPort': 3306,
                'UserIdGroupPairs': [{'GroupId': app_sg_id}]
            },
            # PostgreSQL desde app servers
            {
                'IpProtocol': 'tcp',
                'FromPort': 5432,
                'ToPort': 5432,
                'UserIdGroupPairs': [{'GroupId': app_sg_id}]
            }
        ]
        
        for rule in ingress_rules:
            self.ec2.authorize_security_group_ingress(
                GroupId=sg_id,
                IpPermissions=[rule]
            )
        
        return sg_id
```

### Network ACLs (Access Control Lists)

Las Network ACLs (NACLs) son una capa adicional de seguridad que actúa como un firewall stateless a nivel de subnet. A diferencia de los Security Groups, las NACLs controlan el tráfico de entrada y salida a nivel de subnet.

#### Características de las Network ACLs
- **Stateless**: No mantienen estado de conexiones
- **Subnet level**: Se aplican a toda la subnet
- **Bidirectional**: Controlan tráfico de entrada y salida
- **Reglas numeradas**: Evaluadas en orden numérico
- **Default deny**: Deniegan todo el tráfico por defecto

#### Reglas por Defecto
```
Reglas por defecto (Default NACL):
- Entrada: Permitir todo (100)
- Salida: Permitir todo (100)

Reglas personalizadas (Custom NACL):
- Entrada: Denegar todo (*)
- Salida: Denegar todo (*)
```

#### Creación y Configuración
```bash
# 1. Crear Network ACL personalizada
aws ec2 create-network-acl \
  --vpc-id vpc-1234567890abcdef0 \
  --tag-specifications 'ResourceType=network-acl,Tags=[{Key=Name,Value=my-custom-nacl}]'

# 2. Agregar reglas de entrada
# Regla 100: Permitir SSH desde red corporativa
aws ec2 create-network-acl-entry \
  --network-acl-id acl-1234567890abcdef0 \
  --rule-number 100 \
  --protocol 6 \
  --rule-action allow \
  --ingress \
  --port-range From=22,To=22 \
  --cidr-block 203.0.113.0/24

# Regla 110: Permitir HTTP desde cualquier lugar
aws ec2 create-network-acl-entry \
  --network-acl-id acl-1234567890abcdef0 \
  --rule-number 110 \
  --protocol 6 \
  --rule-action allow \
  --ingress \
  --port-range From=80,To=80 \
  --cidr-block 0.0.0.0/0

# Regla 120: Permitir HTTPS desde cualquier lugar
aws ec2 create-network-acl-entry \
  --network-acl-id acl-1234567890abcdef0 \
  --rule-number 120 \
  --protocol 6 \
  --rule-action allow \
  --ingress \
  --port-range From=443,To=443 \
  --cidr-block 0.0.0.0/0

# 3. Agregar reglas de salida
# Regla 100: Permitir todo el tráfico de salida
aws ec2 create-network-acl-entry \
  --network-acl-id acl-1234567890abcdef0 \
  --rule-number 100 \
  --protocol -1 \
  --rule-action allow \
  --egress \
  --cidr-block 0.0.0.0/0

# 4. Asociar ACL a subnet
aws ec2 associate-network-acl-subnet \
  --network-acl-id acl-1234567890abcdef0 \
  --subnet-id subnet-1234567890abcdef0

# 5. Describir Network ACL
aws ec2 describe-network-acls \
  --network-acl-ids acl-1234567890abcdef0

# 6. Reemplazar asociación (cambiar ACL de subnet)
aws ec2 replace-network-acl-association \
  --association-id acla-1234567890abcdef0 \
  --network-acl-id acl-87654321fedcba98

# 7. Eliminar regla de ACL
aws ec2 delete-network-acl-entry \
  --network-acl-id acl-1234567890abcdef0 \
  --rule-number 100 \
  --egress

# 8. Eliminar Network ACL
aws ec2 delete-network-acl \
  --network-acl-id acl-1234567890abcdef0
```

#### Configuración con Python
```python
class NetworkACLManager:
    def __init__(self, ec2_client):
        self.ec2 = ec2_client
    
    def create_custom_nacl(self, vpc_id, name, rules=None):
        """Crear Network ACL personalizada con reglas"""
        
        # Crear Network ACL
        nacl_response = self.ec2.create_network_acl(
            VpcId=vpc_id,
            TagSpecifications=[
                {
                    'ResourceType': 'network-acl',
                    'Tags': [{'Key': 'Name', 'Value': name}]
                }
            ]
        )
        
        nacl_id = nacl_response['NetworkAcl']['NetworkAclId']
        
        # Agregar reglas por defecto (permitir todo)
        default_rules = [
            {
                'rule_number': 100,
                'protocol': -1,
                'rule_action': 'allow',
                'egress': True,
                'cidr_block': '0.0.0.0/0'
            },
            {
                'rule_number': 100,
                'protocol': -1,
                'rule_action': 'allow',
                'egress': False,
                'cidr_block': '0.0.0.0/0'
            }
        ]
        
        # Agregar reglas personalizadas si se especifican
        all_rules = default_rules + (rules or [])
        
        for rule in all_rules:
            self.create_nacl_entry(nacl_id, rule)
        
        return {
            'nacl_id': nacl_id,
            'rules_count': len(all_rules)
        }
    
    def create_nacl_entry(self, nacl_id, rule_config):
        """Crear entrada de Network ACL"""
        
        params = {
            'NetworkAclId': nacl_id,
            'RuleNumber': rule_config['rule_number'],
            'Protocol': str(rule_config['protocol']),
            'RuleAction': rule_config['rule_action'],
            'Egress': rule_config['egress']
        }
        
        # Agregar CIDR block
        if 'cidr_block' in rule_config:
            params['CidrBlock'] = rule_config['cidr_block']
        
        # Agregar rango de puertos
        if 'port_range' in rule_config:
            params['PortRange'] = rule_config['port_range']
        
        # Agregar rango de ICMP
        if 'icmp_type_code' in rule_config:
            params['IcmpTypeCode'] = rule_config['icmp_type_code']
        
        self.ec2.create_network_acl_entry(**params)
    
    def create_web_server_nacl(self, vpc_id):
        """Crear Network ACL para servidores web"""
        
        rules = [
            # Reglas de entrada
            {
                'rule_number': 100,
                'protocol': 6,  # TCP
                'rule_action': 'allow',
                'egress': False,
                'port_range': {'From': 80, 'To': 80},
                'cidr_block': '0.0.0.0/0'
            },
            {
                'rule_number': 110,
                'protocol': 6,  # TCP
                'rule_action': 'allow',
                'egress': False,
                'port_range': {'From': 443, 'To': 443},
                'cidr_block': '0.0.0.0/0'
            },
            {
                'rule_number': 120,
                'protocol': 6,  # TCP
                'rule_action': 'allow',
                'egress': False,
                'port_range': {'From': 22, 'To': 22},
                'cidr_block': '203.0.113.0/24'  # Red corporativa
            },
            # Reglas de salida
            {
                'rule_number': 100,
                'protocol': -1,  # All
                'rule_action': 'allow',
                'egress': True,
                'cidr_block': '0.0.0.0/0'
            }
        ]
        
        return self.create_custom_nacl(
            vpc_id, 
            'web-server-nacl', 
            rules
        )
    
    def create_database_nacl(self, vpc_id, app_cidr):
        """Crear Network ACL para bases de datos"""
        
        rules = [
            # Solo permitir tráfico desde capa de aplicación
            {
                'rule_number': 100,
                'protocol': 6,  # TCP
                'rule_action': 'allow',
                'egress': False,
                'port_range': {'From': 3306, 'To': 3306},  # MySQL
                'cidr_block': app_cidr
            },
            {
                'rule_number': 110,
                'protocol': 6,  # TCP
                'rule_action': 'allow',
                'egress': False,
                'port_range': {'From': 5432, 'To': 5432},  # PostgreSQL
                'cidr_block': app_cidr
            },
            # Permitir salida para actualizaciones
            {
                'rule_number': 100,
                'protocol': -1,  # All
                'rule_action': 'allow',
                'egress': True,
                'cidr_block': '0.0.0.0/0'
            }
        ]
        
        return self.create_custom_nacl(
            vpc_id, 
            'database-nacl', 
            rules
        )
    
    def associate_nacl_to_subnet(self, nacl_id, subnet_id):
        """Asociar Network ACL a subnet"""
        
        association_response = self.ec2.associate_network_acl_subnet(
            NetworkAclId=nacl_id,
            SubnetId=subnet_id
        )
        
        return {
            'association_id': association_response['NetworkAclAssociationId'],
            'nacl_id': nacl_id,
            'subnet_id': subnet_id
        }
    
    def analyze_nacl_rules(self, nacl_id):
        """Analizar reglas de Network ACL"""
        
        response = self.ec2.describe_network_acls(
            NetworkAclIds=[nacl_id]
        )
        
        if not response['NetworkAcls']:
            return {'error': 'Network ACL not found'}
        
        nacl = response['NetworkAcls'][0]
        
        analysis = {
            'nacl_id': nacl_id,
            'vpc_id': nacl['VpcId'],
            'is_default': nacl['IsDefault'],
            'entries': {
                'ingress': [],
                'egress': []
            },
            'security_assessment': {
                'allows_all_ingress': False,
                'allows_all_egress': False,
                'has_restrictive_rules': False,
                'recommendations': []
            }
        }
        
        # Analizar entradas
        for entry in nacl['Entries']:
            entry_info = {
                'rule_number': entry['RuleNumber'],
                'protocol': entry['Protocol'],
                'rule_action': entry['RuleAction'],
                'port_range': entry.get('PortRange'),
                'cidr_block': entry.get('CidrBlock')
            }
            
            if entry['Egress']:
                analysis['entries']['egress'].append(entry_info)
                
                # Verificar si permite todo el tráfico de salida
                if (entry['RuleNumber'] == 100 and 
                    entry['Protocol'] == -1 and 
                    entry['RuleAction'] == 'allow' and
                    entry.get('CidrBlock') == '0.0.0.0/0'):
                    analysis['security_assessment']['allows_all_egress'] = True
            else:
                analysis['entries']['ingress'].append(entry_info)
                
                # Verificar si permite todo el tráfico de entrada
                if (entry['RuleNumber'] == 100 and 
                    entry['Protocol'] == -1 and 
                    entry['RuleAction'] == 'allow' and
                    entry.get('CidrBlock') == '0.0.0.0/0'):
                    analysis['security_assessment']['allows_all_ingress'] = True
        
        # Generar recomendaciones
        if analysis['security_assessment']['allows_all_ingress']:
            analysis['security_assessment']['recommendations'].append(
                'Consider restricting ingress traffic to specific ports and sources'
            )
        
        if analysis['security_assessment']['allows_all_egress']:
            analysis['security_assessment']['recommendations'].append(
                'Consider restricting egress traffic to specific destinations'
            )
        
        if len(analysis['entries']['ingress']) > 10:
            analysis['security_assessment']['recommendations'].append(
                'Consider simplifying rules for better maintainability'
            )
        
        return analysis
```

#### Comparación: Security Groups vs Network ACLs

| Característica | Security Groups | Network ACLs |
|----------------|------------------|--------------|
| **Nivel** | Instancia/ENI | Subnet |
| **Estado** | Stateful | Stateless |
| **Reglas por defecto** | Denegar todo | Permitir todo (default) |
| **Evaluación** | Todas las reglas | En orden numérico |
| **Bidireccional** | Solo entrada | Entrada y salida |
| **Prioridad** | No aplica | Por número de regla |
| **Flexibilidad** | Alta | Media |

#### Mejores Prácticas para Network ACLs

```python
class NACBestPractices:
    @staticmethod
    def create_secure_web_nacl(vpc_id):
        """Crear Network ACL segura para servidores web"""
        
        rules = [
            # Permitir tráfico web específico
            {
                'rule_number': 100,
                'protocol': 6,  # TCP
                'rule_action': 'allow',
                'egress': False,
                'port_range': {'From': 80, 'To': 80},
                'cidr_block': '0.0.0.0/0'
            },
            {
                'rule_number': 110,
                'protocol': 6,  # TCP
                'rule_action': 'allow',
                'egress': False,
                'port_range': {'From': 443, 'To': 443},
                'cidr_block': '0.0.0.0/0'
            },
            # Permitir SSH solo desde red corporativa
            {
                'rule_number': 120,
                'protocol': 6,  # TCP
                'rule_action': 'allow',
                'egress': False,
                'port_range': {'From': 22, 'To': 22},
                'cidr_block': '203.0.113.0/24'
            },
            # Permitir tráfico de salida a puertos específicos
            {
                'rule_number': 100,
                'protocol': 6,  # TCP
                'rule_action': 'allow',
                'egress': True,
                'port_range': {'From': 443, 'To': 443},
                'cidr_block': '0.0.0.0/0'
            },
            {
                'rule_number': 110,
                'protocol': 6,  # TCP
                'rule_action': 'allow',
                'egress': True,
                'port_range': {'From': 80, 'To': 80},
                'cidr_block': '0.0.0.0/0'
            },
            {
                'rule_number': 120,
                'protocol': 17,  # UDP
                'rule_action': 'allow',
                'egress': True,
                'port_range': {'From': 53, 'To': 53},
                'cidr_block': '0.0.0.0/0'
            }
        ]
        
        return rules
    
    @staticmethod
    def create_database_nacl(vpc_id, app_cidr):
        """Crear Network ACL restrictiva para bases de datos"""
        
        rules = [
            # Solo permitir tráfico desde capa de aplicación
            {
                'rule_number': 100,
                'protocol': 6,  # TCP
                'rule_action': 'allow',
                'egress': False,
                'port_range': {'From': 3306, 'To': 3306},  # MySQL
                'cidr_block': app_cidr
            },
            {
                'rule_number': 110,
                'protocol': 6,  # TCP
                'rule_action': 'allow',
                'egress': False,
                'port_range': {'From': 5432, 'To': 5432},  # PostgreSQL
                'cidr_block': app_cidr
            },
            # Permitir DNS para resolución de nombres
            {
                'rule_number': 120,
                'protocol': 17,  # UDP
                'rule_action': 'allow',
                'egress': False,
                'port_range': {'From': 53, 'To': 53},
                'cidr_block': '0.0.0.0/0'
            },
            # Permitir salida para actualizaciones y patches
            {
                'rule_number': 100,
                'protocol': 6,  # TCP
                'rule_action': 'allow',
                'egress': True,
                'port_range': {'From': 443, 'To': 443},
                'cidr_block': '0.0.0.0/0'
            },
            {
                'rule_number': 110,
                'protocol': 17,  # UDP
                'rule_action': 'allow',
                'egress': True,
                'port_range': {'From': 53, 'To': 53},
                'cidr_block': '0.0.0.0/0'
            }
        ]
        
        return rules
    
    @staticmethod
    def audit_nacl_security(nacl_manager, nacl_id):
        """Auditar seguridad de Network ACL"""
        
        analysis = nacl_manager.analyze_nacl_rules(nacl_id)
        
        security_score = 100
        issues = []
        
        # Penalizar reglas muy permisivas
        if analysis['security_assessment']['allows_all_ingress']:
            security_score -= 30
            issues.append('Allows all ingress traffic - high security risk')
        
        if analysis['security_assessment']['allows_all_egress']:
            security_score -= 20
            issues.append('Allows all egress traffic - medium security risk')
        
        # Penalizar demasiadas reglas
        total_rules = len(analysis['entries']['ingress']) + len(analysis['entries']['egress'])
        if total_rules > 20:
            security_score -= 10
            issues.append('Too many rules - maintenance complexity')
        
        return {
            'nacl_id': nacl_id,
            'security_score': max(0, security_score),
            'issues': issues,
            'recommendations': analysis['security_assessment']['recommendations']
        }
```

## Mejores Prácticas

### 1. Planificación de CIDR
```python
class CIDRPlanner:
    @staticmethod
    def calculate_subnet_count(vpc_cidr, subnet_size):
        """Calcular cuántas subredes de tamaño X caben en VPC"""
        
        import ipaddress
        
        vpc_network = ipaddress.IPv4Network(vpc_cidr)
        subnet_network = ipaddress.IPv4Network(f'0.0.0.0/{subnet_size}')
        
        # Calcular subredes disponibles
        subnets = list(vpc_network.subnets(new_prefix=subnet_size))
        
        return len(subnets)
    
    @staticmethod
    def suggest_vpc_size(num_subnets, hosts_per_subnet):
        """Sugerir tamaño de VPC basado en requerimientos"""
        
        # Encontrar el tamaño de subnet más pequeño que cumpla
        subnet_sizes = [24, 23, 22, 21, 20, 19, 18, 17, 16]
        
        for size in subnet_sizes:
            hosts = 2**(32 - size) - 2  # -2 para network y broadcast
            if hosts >= hosts_per_subnet:
                # Calcular cuántas de estas subredes caben en /16
                subnets_in_16 = 2**(size - 16)
                if subnets_in_16 >= num_subnets:
                    return f"10.0.0.0/16 con subredes /{size}"
        
        return "Requiere VPC más grande que /16"

# Ejemplos
planner = CIDRPlanner()

print(f"Subnets /24 en /16: {planner.calculate_subnet_count('10.0.0.0/16', 24)}")
print(f"Sugerencia: {planner.suggest_vpc_size(6, 50)}")
```

### 2. Naming Conventions
```python
class NamingConventions:
    @staticmethod
    def generate_vpc_name(environment, project, region=None):
        """Generar nombre estandarizado para VPC"""
        
        parts = [environment, project]
        if region:
            parts.append(region)
        
        return '-'.join(parts).lower()
    
    @staticmethod
    def generate_subnet_name(vpc_name, tier, az, purpose=None):
        """Generar nombre estandarizado para subnet"""
        
        parts = [vpc_name, tier, az]
        if purpose:
            parts.append(purpose)
        
        return '-'.join(parts).lower()
    
    @staticmethod
    def generate_sg_name(vpc_name, tier, purpose):
        """Generar nombre estandarizado para security group"""
        
        return f"{vpc_name}-{tier}-{purpose}".lower()

# Ejemplos
vpc_name = NamingConventions.generate_vpc_name("prod", "ecommerce", "useast1")
subnet_name = NamingConventions.generate_subnet_name(vpc_name, "web", "1a", "public")
sg_name = NamingConventions.generate_sg_name(vpc_name, "web", "servers")

print(f"VPC: {vpc_name}")
print(f"Subnet: {subnet_name}")
print(f"Security Group: {sg_name}")
```

### 3. Monitoring y Logging
```python
class VPCMonitoring:
    def __init__(self, ec2_client, cloudwatch_client):
        self.ec2 = ec2_client
        self.cloudwatch = cloudwatch_client
    
    def setup_flow_logs(self, vpc_id, log_group_name):
        """Configurar VPC Flow Logs"""
        
        # Crear log group si no existe
        logs_client = boto3.client('logs')
        
        try:
            logs_client.create_log_group(logGroupName=log_group_name)
        except logs_client.exceptions.ResourceAlreadyExistsException:
            pass
        
        # Crear flow log
        response = self.ec2.create_flow_logs(
            ResourceIds=[vpc_id],
            ResourceType='VPC',
            TrafficType='ALL',
            LogGroupName=log_group_name,
            DeliverLogsPermissionArn='arn:aws:iam::123456789012:role/flow-logs-role'
        )
        
        return response['FlowLogIds']
    
    def create_nat_gateway_metrics(self, nat_gateway_id):
        """Crear métricas personalizadas para NAT Gateway"""
        
        # Métrica de error rate
        self.cloudwatch.put_metric_data(
            Namespace='AWS/NATGateway',
            MetricData=[
                {
                    'MetricName': 'ErrorPortAllocation',
                    'Value': 0,
                    'Unit': 'Count',
                    'Timestamp': datetime.utcnow(),
                    'Dimensions': [
                        {
                            'Name': 'NatGatewayId',
                            'Value': nat_gateway_id
                        }
                    ]
                }
            ]
        )
        
        # Crear alarmas
        self.cloudwatch.put_metric_alarm(
            AlarmName=f'NAT-ErrorRate-{nat_gateway_id}',
            AlarmDescription=f'High error rate for NAT Gateway {nat_gateway_id}',
            MetricName='ErrorPortAllocation',
            Namespace='AWS/NATGateway',
            Statistic='Sum',
            Period=300,
            EvaluationPeriods=2,
            Threshold=1,
            ComparisonOperator='GreaterThanThreshold',
            Dimensions=[
                {
                    'Name': 'NatGatewayId',
                    'Value': nat_gateway_id
                }
            ],
            AlarmActions=['arn:aws:sns:us-east-1:123456789012:vpc-alerts']
        )
```

## Troubleshooting

### Problemas Comunes y Soluciones

#### 1. Instancia sin acceso a Internet
```bash
# Verificar:
aws ec2 describe-instances --instance-ids i-1234567890abcdef0

# Verificar subnet:
aws ec2 describe-subnets --subnet-ids subnet-1234567890abcdef0

# Verificar route table:
aws ec2 describe-route-tables --filters Name=association.subnet-id,Values=subnet-1234567890abcdef0

# Verificar NAT Gateway:
aws ec2 describe-nat-gateways --nat-gateway-ids nat-1234567890abcdef0

# Solución común:
# - Asegurar que instancia está en subnet privada
# - Verificar que route table tiene ruta a NAT Gateway
# - Confirmar que NAT Gateway está en estado 'available'
```

#### 2. No se pueden conectar entre instancias
```bash
# Verificar security groups:
aws ec2 describe-security-groups --group-ids sg-1234567890abcdef0

# Verificar Network ACLs:
aws ec2 describe-network-acls --filters Name=vpc-id,Values=vpc-1234567890abcdef0

# Solución común:
# - Agregar regla en security group para permitir tráfico entre instancias
# - Verificar que Network ACL permita el tráfico
# - Confirmar que ambas instancias están en la misma VPC
```

#### 3. Subnet sin IPs disponibles
```bash
# Verificar IPs disponibles:
aws ec2 describe-subnets --subnet-ids subnet-1234567890abcdef0

# Calcular IPs usadas:
# IP disponibles = Total IPs - 5 (AWS reservadas) - IPs asignadas

# Solución:
# - Crear nueva subnet en misma AZ
# - Redimensionar subnet (no posible, crear nueva)
# - Liberar IPs no utilizadas
```

### Scripts de Diagnóstico
```python
class VPCDiagnostics:
    def __init__(self, ec2_client):
        self.ec2 = ec2_client
    
    def check_vpc_health(self, vpc_id):
        """Diagnóstico completo de VPC"""
        
        diagnosis = {
            'vpc_id': vpc_id,
            'checks': {},
            'issues': [],
            'recommendations': []
        }
        
        # 1. Verificar subredes
        subnets_response = self.ec2.describe_subnets(
            Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
        )
        
        diagnosis['checks']['subnets'] = {
            'total': len(subnets_response['Subnets']),
            'public': len([s for s in subnets_response['Subnets'] if s['MapPublicIpOnLaunch']]),
            'private': len([s for s in subnets_response['Subnets'] if not s['MapPublicIpOnLaunch']])
        }
        
        # 2. Verificar Internet Gateway
        igw_response = self.ec2.describe_internet_gateways(
            Filters=[{'Name': 'attachment.vpc-id', 'Values': [vpc_id]}]
        )
        
        diagnosis['checks']['internet_gateway'] = len(igw_response['InternetGateways']) > 0
        
        if not diagnosis['checks']['internet_gateway']:
            diagnosis['issues'].append('No Internet Gateway attached')
            diagnosis['recommendations'].append('Attach Internet Gateway for public subnets')
        
        # 3. Verificar NAT Gateways
        nat_response = self.ec2.describe_nat_gateways(
            Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
        )
        
        diagnosis['checks']['nat_gateways'] = len(nat_response['NatGateways'])
        
        # 4. Verificar Route Tables
        rt_response = self.ec2.describe_route_tables(
            Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
        )
        
        diagnosis['checks']['route_tables'] = len(rt_response['RouteTables'])
        
        # 5. Verificar Security Groups
        sg_response = self.ec2.describe_security_groups(
            Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
        )
        
        diagnosis['checks']['security_groups'] = len(sg_response['SecurityGroups'])
        
        return diagnosis
    
    def check_connectivity(self, source_instance_id, target_instance_id):
        """Verificar conectividad entre instancias"""
        
        # Obtener información de instancias
        instances_response = self.ec2.describe_instances(
            InstanceIds=[source_instance_id, target_instance_id]
        )
        
        connectivity_check = {
            'source_instance': source_instance_id,
            'target_instance': target_instance_id,
            'same_vpc': False,
            'same_subnet': False,
            'security_groups_compatible': False,
            'network_acls_compatible': False,
            'issues': []
        }
        
        # Verificar misma VPC
        instances = instances_response['Reservations']
        if len(instances) == 2:
            source_vpc = instances[0]['Instances'][0]['VpcId']
            target_vpc = instances[1]['Instances'][0]['VpcId']
            
            connectivity_check['same_vpc'] = source_vpc == target_vpc
            
            if not connectivity_check['same_vpc']:
                connectivity_check['issues'].append('Instances are in different VPCs')
            
            # Verificar misma subnet
            source_subnet = instances[0]['Instances'][0]['SubnetId']
            target_subnet = instances[1]['Instances'][0]['SubnetId']
            
            connectivity_check['same_subnet'] = source_subnet == target_subnet
        
        return connectivity_check
```

## Casos de Uso Prácticos

### Caso 1: Arquitectura Web 3-Tier
```python
class Web3TierArchitecture:
    def __init__(self, ec2_client):
        self.ec2 = ec2_client
    
    def create_3tier_vpc(self, config):
        """Crear VPC para arquitectura web 3-tier"""
        
        # 1. Crear VPC
        vpc_response = self.ec2.create_vpc(
            CidrBlock=config['vpc_cidr'],
            TagSpecifications=[
                {'ResourceType': 'vpc', 'Tags': [{'Key': 'Name', 'Value': config['name']}]}
            ]
        )
        vpc_id = vpc_response['Vpc']['VpcId']
        
        # 2. Crear subredes por tier
        tiers = {
            'web': [],
            'app': [],
            'db': []
        }
        
        for tier_config in config['tiers']:
            for az_config in tier_config['availability_zones']:
                subnet_response = self.ec2.create_subnet(
                    VpcId=vpc_id,
                    CidrBlock=az_config['cidr'],
                    AvailabilityZone=az_config['az'],
                    TagSpecifications=[
                        {'ResourceType': 'subnet', 'Tags': [{'Key': 'Name', 'Value': az_config['name']}]}
                    ]
                )
                
                tiers[tier_config['name']].append(subnet_response['Subnet']['SubnetId'])
                
                # Configurar auto-assign IP para web tier
                if tier_config['name'] == 'web':
                    self.ec2.modify_subnet_attribute(
                        SubnetId=subnet_response['Subnet']['SubnetId'],
                        MapPublicIpOnLaunch={'Value': True}
                    )
        
        # 3. Configurar networking
        networking = self.setup_3tier_networking(vpc_id, tiers, config)
        
        # 4. Crear security groups
        security_groups = self.setup_3tier_security_groups(vpc_id, config)
        
        return {
            'vpc_id': vpc_id,
            'tiers': tiers,
            'networking': networking,
            'security_groups': security_groups
        }
    
    def setup_3tier_networking(self, vpc_id, tiers, config):
        """Configurar networking para 3-tier"""
        
        # Crear Internet Gateway
        igw_response = self.ec2.create_internet_gateway()
        igw_id = igw_response['InternetGateway']['InternetGatewayId']
        
        self.ec2.attach_internet_gateway(VpcId=vpc_id, InternetGatewayId=igw_id)
        
        # Crear NAT Gateway
        eip_response = self.ec2.allocate_address(Domain='vpc')
        nat_response = self.ec2.create_nat_gateway(
            SubnetId=tiers['web'][0],  # Primera subnet web
            AllocationId=eip_response['AllocationId']
        )
        nat_id = nat_response['NatGateway']['NatGatewayId']
        
        # Crear route tables
        route_tables = {}
        
        # Route table para web tier (pública)
        web_rt = self.ec2.create_route_table(VpcId=vpc_id)
        self.ec2.create_route(
            RouteTableId=web_rt['RouteTable']['RouteTableId'],
            DestinationCidrBlock='0.0.0.0/0',
            GatewayId=igw_id
        )
        
        # Asociar a subredes web
        for subnet_id in tiers['web']:
            self.ec2.associate_route_table(
                RouteTableId=web_rt['RouteTable']['RouteTableId'],
                SubnetId=subnet_id
            )
        
        route_tables['web'] = web_rt['RouteTable']['RouteTableId']
        
        # Route table para app tier (privada)
        app_rt = self.ec2.create_route_table(VpcId=vpc_id)
        self.ec2.create_route(
            RouteTableId=app_rt['RouteTable']['RouteTableId'],
            DestinationCidrBlock='0.0.0.0/0',
            NatGatewayId=nat_id
        )
        
        # Asociar a subredes app
        for subnet_id in tiers['app']:
            self.ec2.associate_route_table(
                RouteTableId=app_rt['RouteTable']['RouteTableId'],
                SubnetId=subnet_id
            )
        
        route_tables['app'] = app_rt['RouteTable']['RouteTableId']
        
        # Route table para db tier (sin salida a internet)
        db_rt = self.ec2.create_route_table(VpcId=vpc_id)
        
        # Asociar a subredes db
        for subnet_id in tiers['db']:
            self.ec2.associate_route_table(
                RouteTableId=db_rt['RouteTable']['RouteTableId'],
                SubnetId=subnet_id
            )
        
        route_tables['db'] = db_rt['RouteTable']['RouteTableId']
        
        return {
            'internet_gateway_id': igw_id,
            'nat_gateway_id': nat_id,
            'route_tables': route_tables
        }
    
    def setup_3tier_security_groups(self, vpc_id, config):
        """Configurar security groups para 3-tier"""
        
        security_groups = {}
        
        # Web tier SG
        web_sg = self.ec2.create_security_group(
            GroupName=f"{config['name']}-web",
            Description="Web tier security group",
            VpcId=vpc_id
        )
        
        # Reglas web tier
        web_rules = [
            {'IpProtocol': 'tcp', 'FromPort': 80, 'ToPort': 80, 'IpRanges': [{'CidrIp': '0.0.0.0/0'}]},
            {'IpProtocol': 'tcp', 'FromPort': 443, 'ToPort': 443, 'IpRanges': [{'CidrIp': '0.0.0.0/0'}]}
        ]
        
        for rule in web_rules:
            self.ec2.authorize_security_group_ingress(
                GroupId=web_sg['GroupId'],
                IpPermissions=[rule]
            )
        
        security_groups['web'] = web_sg['GroupId']
        
        # App tier SG
        app_sg = self.ec2.create_security_group(
            GroupName=f"{config['name']}-app",
            Description="Application tier security group",
            VpcId=vpc_id
        )
        
        # Solo permitir tráfico desde web tier
        app_rules = [
            {
                'IpProtocol': 'tcp',
                'FromPort': 8080,
                'ToPort': 8080,
                'UserIdGroupPairs': [{'GroupId': web_sg['GroupId']}]
            }
        ]
        
        for rule in app_rules:
            self.ec2.authorize_security_group_ingress(
                GroupId=app_sg['GroupId'],
                IpPermissions=[rule]
            )
        
        security_groups['app'] = app_sg['GroupId']
        
        # DB tier SG
        db_sg = self.ec2.create_security_group(
            GroupName=f"{config['name']}-db",
            Description="Database tier security group",
            VpcId=vpc_id
        )
        
        # Solo permitir tráfico desde app tier
        db_rules = [
            {
                'IpProtocol': 'tcp',
                'FromPort': 3306,
                'ToPort': 3306,
                'UserIdGroupPairs': [{'GroupId': app_sg['GroupId']}]
            }
        ]
        
        for rule in db_rules:
            self.ec2.authorize_security_group_ingress(
                GroupId=db_sg['GroupId'],
                IpPermissions=[rule]
            )
        
        security_groups['db'] = db_sg['GroupId']
        
        return security_groups

# Ejemplo de uso
creator = Web3TierArchitecture(boto3.client('ec2'))

config = {
    'name': 'ecommerce-3tier',
    'vpc_cidr': '10.0.0.0/16',
    'tiers': [
        {
            'name': 'web',
            'availability_zones': [
                {'name': 'web-1a', 'cidr': '10.0.1.0/24', 'az': 'us-east-1a'},
                {'name': 'web-1b', 'cidr': '10.0.2.0/24', 'az': 'us-east-1b'}
            ]
        },
        {
            'name': 'app',
            'availability_zones': [
                {'name': 'app-1a', 'cidr': '10.0.11.0/24', 'az': 'us-east-1a'},
                {'name': 'app-1b', 'cidr': '10.0.12.0/24', 'az': 'us-east-1b'}
            ]
        },
        {
            'name': 'db',
            'availability_zones': [
                {'name': 'db-1a', 'cidr': '10.0.21.0/24', 'az': 'us-east-1a'},
                {'name': 'db-1b', 'cidr': '10.0.22.0/24', 'az': 'us-east-1b'}
            ]
        }
    ]
}

result = creator.create_3tier_vpc(config)
print(f"Arquitectura 3-tier creada: {result}")
```

### Caso 2: VPC Multi-Cuenta
```python
class MultiAccountVPC:
    def __init__(self, organizations_client, ec2_client):
        self.org = organizations_client
        self.ec2 = ec2_client
    
    def setup_shared_services_vpc(self, config):
        """Configurar VPC de servicios compartidos"""
        
        # 1. Crear VPC central
        vpc_response = self.ec2.create_vpc(
            CidrBlock=config['vpc_cidr'],
            TagSpecifications=[
                {'ResourceType': 'vpc', 'Tags': [{'Key': 'Name', 'Value': 'shared-services'}]}
            ]
        )
        vpc_id = vpc_response['Vpc']['VpcId']
        
        # 2. Crear subredes para servicios compartidos
        shared_subnets = []
        for subnet_config in config['shared_subnets']:
            subnet_response = self.ec2.create_subnet(
                VpcId=vpc_id,
                CidrBlock=subnet_config['cidr'],
                AvailabilityZone=subnet_config['az'],
                TagSpecifications=[
                    {'ResourceType': 'subnet', 'Tags': [{'Key': 'Name', 'Value': subnet_config['name']}]}
                ]
            )
            shared_subnets.append(subnet_response['Subnet']['SubnetId'])
        
        # 3. Compartir subredes con otras cuentas
        for account_id in config['shared_accounts']:
            for subnet_id in shared_subnets:
                self.ec2.modify_subnet_attribute(
                    SubnetId=subnet_id,
                    MapPublicIpOnLaunch={'Value': False}
                )
                
                # Compartir subnet (requiere RAM)
                ram_client = boto3.client('ram')
                
                resource_share = ram_client.create_resource_share(
                    Name=f'shared-subnets-{account_id}',
                    ResourceArns=[f'arn:aws:ec2:{self.ec2.meta.region_name}:123456789012:subnet/{subnet_id}'],
                    Principals=[account_id]
                )
        
        return {
            'vpc_id': vpc_id,
            'shared_subnets': shared_subnets,
            'shared_accounts': config['shared_accounts']
        }
```

## Resumen

Este manual proporciona una guía completa para la creación y gestión de VPCs y subredes en AWS, cubriendo desde conceptos básicos hasta implementaciones complejas. Los puntos clave a recordar son:

1. **Planificación es crucial**: Diseña tu arquitectura antes de crear recursos
2. **Sigue mejores prácticas**: Usa naming conventions, segmentación por tiers, security groups apropiados
3. **Monitorea tu infraestructura**: Configura Flow Logs y métricas
4. **Documenta todo**: Mantén registros de tu configuración de red
5. **Prueba conectividad**: Verifica que tus instancias puedan comunicarse como esperas

Con esta guía, deberías poder crear VPCs robustas y seguras que soporten tus aplicaciones en la nube de AWS.

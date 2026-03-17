# AWS VPC Security

## Definición

AWS VPC Security es un conjunto de servicios y características que proporcionan seguridad de red a múltiples niveles dentro de tu Virtual Private Cloud. Estos servicios trabajan juntos para crear una arquitectura de defensa en profundidad que protege tus aplicaciones y datos contra amenazas internas y externas.

## Componentes de Seguridad VPC

### **1. Control de Acceso de Red**
- **Security Groups**: Firewalls stateful a nivel de instancia
- **Network ACLs**: Firewalls stateless a nivel de subnet
- **VPC Endpoints**: Conexión privada a servicios AWS

### **2. Monitoreo y Detección**
- **VPC Flow Logs**: Registro de tráfico IP
- **GuardDuty**: Detección de amenazas inteligente
- **Macie**: Descubrimiento y protección de datos

### **3. Protección Avanzada**
- **AWS WAF & Shield**: Protección contra ataques web y DDoS
- **PrivateLink**: Conexión segura a servicios
- **Transit Gateway**: Conectividad segura centralizada

### **4. Gestión de Identidades**
- **IAM Policies**: Control granular de permisos
- **Resource Tags**: Control de acceso basado en etiquetas
- **Service Control Policies**: Políticas a nivel organizacional

## Arquitectura de Seguridad VPC

### **Modelo de Defensa en Profundidad**
```
Internet Gateway
├── AWS WAF & Shield (Layer 7/3-4)
├── Network ACLs (Layer 3/4 - Stateless)
├── Security Groups (Layer 3/4 - Stateful)
├── Instance Level Security
├── Application Level Security
└── Data Level Security
```

### **Segmentación de Red**
```
VPC
├── Public Subnets
│   ├── Web Tier
│   ├── Load Balancers
│   └── NAT Gateways
├── Private Subnets
│   ├── Application Tier
│   ├── Database Tier
│   └── Internal Services
└── Isolated Subnets
    ├── Backend Systems
    └── Sensitive Data
```

## Configuración de Seguridad VPC

### **Gestión Integral de Seguridad VPC**
```python
import boto3
import json
from datetime import datetime, timedelta

class VPCSecurityManager:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.guardduty = boto3.client('guardduty', region_name=region)
        self.macie = boto3.client('macie2', region_name=region)
        self.waf = boto3.client('wafv2', region_name=region)
        self.shield = boto3.client('shield', region_name=region)
        self.region = region
    
    def create_secure_vpc_architecture(self, vpc_cidr, project_name, environment):
        """Crear arquitectura VPC segura completa"""
        
        try:
            # 1. Crear VPC
            vpc_response = self.ec2.create_vpc(
                CidrBlock=vpc_cidr,
                TagSpecifications=[
                    {
                        'ResourceType': 'vpc',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'{project_name}-{environment}-vpc'},
                            {'Key': 'Project', 'Value': project_name},
                            {'Key': 'Environment', 'Value': environment},
                            {'Key': 'Security', 'Value': 'High'}
                        ]
                    }
                ]
            )
            vpc_id = vpc_response['Vpc']['VpcId']
            
            # 2. Habilitar DNS y hostname
            self.ec2.modify_vpc_attribute(
                VpcId=vpc_id,
                EnableDnsSupport={'Value': True}
            )
            self.ec2.modify_vpc_attribute(
                VpcId=vpc_id,
                EnableDnsHostnames={'Value': True}
            )
            
            # 3. Crear subnets segmentadas
            subnets = self._create_segmented_subnets(vpc_id, vpc_cidr, project_name, environment)
            
            # 4. Crear security groups por tier
            security_groups = self._create_tier_security_groups(vpc_id, project_name, environment)
            
            # 5. Configurar Network ACLs
            network_acls = self._create_security_network_acls(vpc_id, project_name, environment)
            
            # 6. Habilitar VPC Flow Logs
            flow_log_result = self._enable_vpc_flow_logs(vpc_id, project_name, environment)
            
            # 7. Habilitar GuardDuty
            guardduty_result = self._enable_guardduty(project_name, environment)
            
            # 8. Crear VPC endpoints para servicios críticos
            endpoints = self._create_security_endpoints(vpc_id, project_name, environment)
            
            return {
                'success': True,
                'vpc_id': vpc_id,
                'vpc_cidr': vpc_cidr,
                'subnets': subnets,
                'security_groups': security_groups,
                'network_acls': network_acls,
                'flow_logs': flow_log_result,
                'guardduty': guardduty_result,
                'endpoints': endpoints
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _create_segmented_subnets(self, vpc_id, vpc_cidr, project_name, environment):
        """Crear subnets segmentadas por seguridad"""
        
        try:
            # Dividir CIDR para diferentes tiers
            base_network = ipaddress.IPv4Network(vpc_cidr)
            
            # Subnets públicas (web tier)
            public_subnets = []
            for i in range(2):
                subnet_cidr = str(list(base_network.subnets(new_prefix=24))[i])
                subnet_response = self.ec2.create_subnet(
                    VpcId=vpc_id,
                    CidrBlock=subnet_cidr,
                    AvailabilityZone=f"{self.region}{chr(97 + i)}",
                    TagSpecifications=[
                        {
                            'ResourceType': 'subnet',
                            'Tags': [
                                {'Key': 'Name', 'Value': f'{project_name}-{environment}-public-{i+1}'},
                                {'Key': 'Tier', 'Value': 'Public'},
                                {'Key': 'Security', 'Value': 'Web'}
                            ]
                        }
                    ]
                )
                public_subnets.append({
                    'subnet_id': subnet_response['Subnet']['SubnetId'],
                    'cidr': subnet_cidr,
                    'az': f"{self.region}{chr(97 + i)}"
                })
            
            # Subnets privadas (application tier)
            private_subnets = []
            for i in range(2):
                subnet_cidr = str(list(base_network.subnets(new_prefix=24))[i + 2])
                subnet_response = self.ec2.create_subnet(
                    VpcId=vpc_id,
                    CidrBlock=subnet_cidr,
                    AvailabilityZone=f"{self.region}{chr(97 + i)}",
                    TagSpecifications=[
                        {
                            'ResourceType': 'subnet',
                            'Tags': [
                                {'Key': 'Name', 'Value': f'{project_name}-{environment}-private-{i+1}'},
                                {'Key': 'Tier', 'Value': 'Private'},
                                {'Key': 'Security', 'Value': 'Application'}
                            ]
                        }
                    ]
                )
                private_subnets.append({
                    'subnet_id': subnet_response['Subnet']['SubnetId'],
                    'cidr': subnet_cidr,
                    'az': f"{self.region}{chr(97 + i)}"
                })
            
            # Subnets de base de datos (aisladas)
            db_subnets = []
            for i in range(2):
                subnet_cidr = str(list(base_network.subnets(new_prefix=24))[i + 4])
                subnet_response = self.ec2.create_subnet(
                    VpcId=vpc_id,
                    CidrBlock=subnet_cidr,
                    AvailabilityZone=f"{self.region}{chr(97 + i)}",
                    TagSpecifications=[
                        {
                            'ResourceType': 'subnet',
                            'Tags': [
                                {'Key': 'Name', 'Value': f'{project_name}-{environment}-database-{i+1}'},
                                {'Key': 'Tier', 'Value': 'Database'},
                                {'Key': 'Security', 'Value': 'High'}
                            ]
                        }
                    ]
                )
                db_subnets.append({
                    'subnet_id': subnet_response['Subnet']['SubnetId'],
                    'cidr': subnet_cidr,
                    'az': f"{self.region}{chr(97 + i)}"
                })
            
            return {
                'public_subnets': public_subnets,
                'private_subnets': private_subnets,
                'database_subnets': db_subnets
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _create_tier_security_groups(self, vpc_id, project_name, environment):
        """Crear security groups por tier con seguridad estricta"""
        
        try:
            security_groups = {}
            
            # Security Group para Load Balancer
            lb_sg_response = self.ec2.create_security_group(
                GroupName=f'{project_name}-{environment}-lb-sg',
                Description='Security group for load balancers',
                VpcId=vpc_id,
                TagSpecifications=[
                    {
                        'ResourceType': 'security-group',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'{project_name}-{environment}-lb-sg'},
                            {'Key': 'Tier', 'Value': 'LoadBalancer'},
                            {'Key': 'Security', 'Value': 'Medium'}
                        ]
                    }
                ]
            )
            lb_sg_id = lb_sg_response['GroupId']
            
            # Reglas para Load Balancer
            lb_rules = [
                {'IpProtocol': 'tcp', 'FromPort': 80, 'ToPort': 80, 'IpRanges': [{'CidrIp': '0.0.0.0/0'}]},
                {'IpProtocol': 'tcp', 'FromPort': 443, 'ToPort': 443, 'IpRanges': [{'CidrIp': '0.0.0.0/0'}]}
            ]
            self.ec2.authorize_security_group_ingress(GroupId=lb_sg_id, IpPermissions=lb_rules)
            
            # Security Group para Web Servers
            web_sg_response = self.ec2.create_security_group(
                GroupName=f'{project_name}-{environment}-web-sg',
                Description='Security group for web servers',
                VpcId=vpc_id,
                TagSpecifications=[
                    {
                        'ResourceType': 'security-group',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'{project_name}-{environment}-web-sg'},
                            {'Key': 'Tier', 'Value': 'Web'},
                            {'Key': 'Security', 'Value': 'Medium'}
                        ]
                    }
                ]
            )
            web_sg_id = web_sg_response['GroupId']
            
            # Reglas para Web Servers (solo desde LB)
            web_rules = [
                {'IpProtocol': 'tcp', 'FromPort': 80, 'ToPort': 80, 'UserIdGroupPairs': [{'GroupId': lb_sg_id}]},
                {'IpProtocol': 'tcp', 'FromPort': 443, 'ToPort': 443, 'UserIdGroupPairs': [{'GroupId': lb_sg_id}]},
                {'IpProtocol': 'tcp', 'FromPort': 22, 'ToPort': 22, 'IpRanges': [{'CidrIp': '203.0.113.0/24'}]}  # SSH desde office
            ]
            self.ec2.authorize_security_group_ingress(GroupId=web_sg_id, IpPermissions=web_rules)
            
            # Security Group para Application Servers
            app_sg_response = self.ec2.create_security_group(
                GroupName=f'{project_name}-{environment}-app-sg',
                Description='Security group for application servers',
                VpcId=vpc_id,
                TagSpecifications=[
                    {
                        'ResourceType': 'security-group',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'{project_name}-{environment}-app-sg'},
                            {'Key': 'Tier', 'Value': 'Application'},
                            {'Key': 'Security', 'Value': 'High'}
                        ]
                    }
                ]
            )
            app_sg_id = app_sg_response['GroupId']
            
            # Reglas para Application Servers (solo desde web servers)
            app_rules = [
                {'IpProtocol': 'tcp', 'FromPort': 8080, 'ToPort': 8080, 'UserIdGroupPairs': [{'GroupId': web_sg_id}]},
                {'IpProtocol': 'tcp', 'FromPort': 22, 'ToPort': 22, 'IpRanges': [{'CidrIp': '203.0.113.0/24'}]}
            ]
            self.ec2.authorize_security_group_ingress(GroupId=app_sg_id, IpPermissions=app_rules)
            
            # Security Group para Database
            db_sg_response = self.ec2.create_security_group(
                GroupName=f'{project_name}-{environment}-db-sg',
                Description='Security group for database servers',
                VpcId=vpc_id,
                TagSpecifications=[
                    {
                        'ResourceType': 'security-group',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'{project_name}-{environment}-db-sg'},
                            {'Key': 'Tier', 'Value': 'Database'},
                            {'Key': 'Security', 'Value': 'Critical'}
                        ]
                    }
                ]
            )
            db_sg_id = db_sg_response['GroupId']
            
            # Reglas para Database (solo desde application servers)
            db_rules = [
                {'IpProtocol': 'tcp', 'FromPort': 3306, 'ToPort': 3306, 'UserIdGroupPairs': [{'GroupId': app_sg_id}]},
                {'IpProtocol': 'tcp', 'FromPort': 5432, 'ToPort': 5432, 'UserIdGroupPairs': [{'GroupId': app_sg_id}]}
            ]
            self.ec2.authorize_security_group_ingress(GroupId=db_sg_id, IpPermissions=db_rules)
            
            security_groups = {
                'load_balancer': {'sg_id': lb_sg_id, 'name': f'{project_name}-{environment}-lb-sg'},
                'web_servers': {'sg_id': web_sg_id, 'name': f'{project_name}-{environment}-web-sg'},
                'application_servers': {'sg_id': app_sg_id, 'name': f'{project_name}-{environment}-app-sg'},
                'database': {'sg_id': db_sg_id, 'name': f'{project_name}-{environment}-db-sg'}
            }
            
            return security_groups
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _create_security_network_acls(self, vpc_id, project_name, environment):
        """Crear Network ACLs con reglas de seguridad estrictas"""
        
        try:
            # Crear NACL para subnets públicas
            public_acl_response = self.ec2.create_network_acl(
                VpcId=vpc_id,
                TagSpecifications=[
                    {
                        'ResourceType': 'network-acl',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'{project_name}-{environment}-public-nacl'},
                            {'Key': 'Tier', 'Value': 'Public'},
                            {'Key': 'Security', 'Value': 'Medium'}
                        ]
                    }
                ]
            )
            public_acl_id = public_acl_response['NetworkAcl']['NetworkAclId']
            
            # Reglas para subnets públicas
            public_inbound_rules = [
                {'RuleNumber': 100, 'Protocol': '6', 'RuleAction': 'allow', 'Egress': False, 'CidrBlock': '0.0.0.0/0', 'PortRange': {'From': 80, 'To': 80}},
                {'RuleNumber': 110, 'Protocol': '6', 'RuleAction': 'allow', 'Egress': False, 'CidrBlock': '0.0.0.0/0', 'PortRange': {'From': 443, 'To': 443}},
                {'RuleNumber': 120, 'Protocol': '6', 'RuleAction': 'allow', 'Egress': False, 'CidrBlock': '0.0.0.0/0', 'PortRange': {'From': 1024, 'To': 65535}}  # Temp ports
            ]
            
            for rule in public_inbound_rules:
                self.ec2.create_network_acl_entry(NetworkAclId=public_acl_id, **rule)
            
            # Crear NACL para subnets privadas
            private_acl_response = self.ec2.create_network_acl(
                VpcId=vpc_id,
                TagSpecifications=[
                    {
                        'ResourceType': 'network-acl',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'{project_name}-{environment}-private-nacl'},
                            {'Key': 'Tier', 'Value': 'Private'},
                            {'Key': 'Security', 'Value': 'High'}
                        ]
                    }
                ]
            )
            private_acl_id = private_acl_response['NetworkAcl']['NetworkAclId']
            
            # Reglas más restrictivas para subnets privadas
            private_inbound_rules = [
                {'RuleNumber': 100, 'Protocol': '6', 'RuleAction': 'allow', 'Egress': False, 'CidrBlock': '10.0.0.0/8', 'PortRange': {'From': 8080, 'ToPort': 8080}},
                {'RuleNumber': 110, 'Protocol': '6', 'RuleAction': 'allow', 'Egress': False, 'CidrBlock': '10.0.0.0/8', 'PortRange': {'From': 1024, 'To': 65535}}
            ]
            
            for rule in private_inbound_rules:
                self.ec2.create_network_acl_entry(NetworkAclId=private_acl_id, **rule)
            
            return {
                'public_acl': {'acl_id': public_acl_id, 'name': f'{project_name}-{environment}-public-nacl'},
                'private_acl': {'acl_id': private_acl_id, 'name': f'{project_name}-{environment}-private-nacl'}
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _enable_vpc_flow_logs(self, vpc_id, project_name, environment):
        """Habilitar VPC Flow Logs para monitoreo"""
        
        try:
            # Crear log group para flow logs
            logs_client = boto3.client('logs', region_name=self.region)
            log_group_name = f'/aws/vpc/flow-logs/{project_name}-{environment}'
            
            try:
                logs_client.create_log_group(logGroupName=log_group_name)
            except logs_client.exceptions.ResourceAlreadyExistsException:
                pass
            
            # Habilitar flow logs
            response = self.ec2.create_flow_logs(
                ResourceIds=[vpc_id],
                ResourceType='VPC',
                TrafficType='ALL',
                LogGroupName=log_group_name,
                DeliverLogsPermissionArn='arn:aws:iam::123456789012:role/flow-logs-role',
                TagSpecifications=[
                    {
                        'ResourceType': 'vpc-flow-log',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'{project_name}-{environment}-flow-logs'},
                            {'Key': 'Project', 'Value': project_name},
                            {'Key': 'Environment', 'Value': environment}
                        ]
                    }
                ]
            )
            
            return {
                'success': True,
                'flow_log_ids': response['FlowLogIds'],
                'log_group_name': log_group_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _enable_guardduty(self, project_name, environment):
        """Habilitar GuardDuty para detección de amenazas"""
        
        try:
            # Crear detector GuardDuty
            response = self.guardduty.create_detector(
                Enable=True,
                ClientToken=f'{project_name}-{environment}-detector',
                Tags=[
                    {'Key': 'Project', 'Value': project_name},
                    {'Key': 'Environment', 'Value': environment}
                ]
            )
            
            detector_id = response['DetectorId']
            
            # Configurar IP sets para IPs confiables
            trusted_ips = ['203.0.113.0/24', '198.51.100.0/24']  # Office networks
            
            for ip_set_name, ip_list in [('trusted-ips', trusted_ips)]:
                try:
                    self.guardduty.create_ip_set(
                        DetectorId=detector_id,
                        Name=ip_set_name,
                        Format='TXT',
                        Location=f's3://your-security-bucket/{project_name}-{environment}/{ip_set_name}.txt',
                        Activate=True
                    )
                except Exception:
                    pass
            
            return {
                'success': True,
                'detector_id': detector_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _create_security_endpoints(self, vpc_id, project_name, environment):
        """Crear VPC endpoints para servicios críticos"""
        
        try:
            endpoints = []
            
            # Services críticos para endpoints privados
            critical_services = [
                {'service': 'com.amazonaws.us-east-1.s3', 'type': 'Gateway'},
                {'service': 'com.amazonaws.us-east-1.dynamodb', 'type': 'Gateway'},
                {'service': 'com.amazonaws.us-east-1.ecr.api', 'type': 'Interface'},
                {'service': 'com.amazonaws.us-east-1.ecr.dkr', 'type': 'Interface'},
                {'service': 'com.amazonaws.us-east-1.logs', 'type': 'Interface'}
            ]
            
            for service_info in critical_services:
                try:
                    if service_info['type'] == 'Gateway':
                        response = self.ec2.create_vpc_endpoint(
                            VpcId=vpc_id,
                            ServiceName=service_info['service'],
                            VpcEndpointType='Gateway',
                            TagSpecifications=[
                                {
                                    'ResourceType': 'vpc-endpoint',
                                    'Tags': [
                                        {'Key': 'Name', 'Value': f'{project_name}-{environment}-{service_info["service"].split(".")[-1]}'},
                                        {'Key': 'Security', 'Value': 'Private'}
                                    ]
                                }
                            ]
                        )
                    else:  # Interface
                        # Necesitaríamos subnet IDs y security groups para interface endpoints
                        pass
                    
                    endpoints.append({
                        'service': service_info['service'],
                        'type': service_info['type'],
                        'endpoint_id': response.get('VpcEndpointId', 'pending')
                    })
                    
                except Exception as e:
                    # Log error but continue with other services
                    continue
            
            return {
                'success': True,
                'endpoints': endpoints
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_vpc_security_posture(self, vpc_id):
        """Analizar la postura de seguridad de una VPC"""
        
        try:
            analysis = {
                'vpc_id': vpc_id,
                'security_score': 0,
                'findings': [],
                'recommendations': []
            }
            
            # 1. Analizar configuración de DNS
            vpc_response = self.ec2.describe_vpcs(VpcIds=[vpc_id])
            if vpc_response['Vpcs']:
                vpc = vpc_response['Vpcs'][0]
                
                dns_support = vpc.get('DnsOptions', {}).get('DnsSupport', False)
                dns_hostnames = vpc.get('DnsHostnames', False)
                
                if dns_support and dns_hostnames:
                    analysis['security_score'] += 10
                else:
                    analysis['findings'].append('DNS support not fully enabled')
                    analysis['recommendations'].append('Enable DNS support and hostnames')
            
            # 2. Analizar security groups
            sg_response = self.ec2.describe_security_groups(
                Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
            )
            
            high_risk_sgs = 0
            for sg in sg_response['SecurityGroups']:
                open_rules = 0
                for rule in sg['IpPermissions']:
                    if 'IpRanges' in rule:
                        for ip_range in rule['IpRanges']:
                            if ip_range['CidrIp'] == '0.0.0.0/0':
                                open_rules += 1
                
                if open_rules > 2:
                    high_risk_sgs += 1
                    analysis['findings'].append(f'Security group {sg["GroupName"]} has {open_rules} open rules')
            
            if high_risk_sgs == 0:
                analysis['security_score'] += 20
            else:
                analysis['recommendations'].append(f'Review {high_risk_sgs} high-risk security groups')
            
            # 3. Analizar flow logs
            flow_logs_response = self.ec2.describe_flow_logs(
                Filters=[{'Name': 'resource-id', 'Values': [vpc_id]}]
            )
            
            if flow_logs_response['FlowLogs']:
                analysis['security_score'] += 15
            else:
                analysis['findings'].append('VPC Flow Logs not enabled')
                analysis['recommendations'].append('Enable VPC Flow Logs for network monitoring')
            
            # 4. Analizar endpoints
            endpoints_response = self.ec2.describe_vpc_endpoints(
                Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
            )
            
            private_endpoints = len([ep for ep in endpoints_response['VpcEndpoints'] 
                                  if ep['VpcEndpointType'] == 'Interface'])
            
            if private_endpoints >= 3:
                analysis['security_score'] += 15
            else:
                analysis['recommendations'].append('Consider using VPC Endpoints for critical services')
            
            # Calcular calificación final
            max_score = 60
            final_score = (analysis['security_score'] / max_score) * 100
            
            analysis['final_score'] = final_score
            analysis['grade'] = self._calculate_security_grade(final_score)
            
            return {
                'success': True,
                'analysis': analysis
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _calculate_security_grade(self, score):
        """Calificar la postura de seguridad"""
        
        if score >= 90:
            return 'A'
        elif score >= 80:
            return 'B'
        elif score >= 70:
            return 'C'
        elif score >= 60:
            return 'D'
        else:
            return 'F'
    
    def generate_security_report(self, vpc_id):
        """Generar reporte completo de seguridad"""
        
        try:
            # Análisis de postura de seguridad
            posture_result = self.analyze_vpc_security_posture(vpc_id)
            
            if not posture_result['success']:
                return posture_result
            
            analysis = posture_result['analysis']
            
            # Recopilar métricas adicionales
            vpc_response = self.ec2.describe_vpcs(VpcIds=[vpc_id])
            vpc = vpc_response['Vpcs'][0]
            
            # Contar recursos
            sg_response = self.ec2.describe_security_groups(
                Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
            )
            
            subnets_response = self.ec2.describe_subnets(
                Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
            )
            
            endpoints_response = self.ec2.describe_vpc_endpoints(
                Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
            )
            
            report = {
                'vpc_id': vpc_id,
                'vpc_cidr': vpc['CidrBlock'],
                'analysis_date': datetime.utcnow().isoformat(),
                'security_score': analysis['final_score'],
                'security_grade': analysis['grade'],
                'resource_summary': {
                    'security_groups': len(sg_response['SecurityGroups']),
                    'subnets': len(subnets_response['Subnets']),
                    'vpc_endpoints': len(endpoints_response['VpcEndpoints']),
                    'flow_logs_enabled': len([fl for fl in self.ec2.describe_flow_logs(
                        Filters=[{'Name': 'resource-id', 'Values': [vpc_id]}]
                    ).get('FlowLogs', [])])
                },
                'findings': analysis['findings'],
                'recommendations': analysis['recommendations'],
                'detailed_analysis': analysis
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
```

## Casos de Uso

### **1. Crear Arquitectura VPC Segura**
```python
# Ejemplo: Crear arquitectura VPC segura completa
manager = VPCSecurityManager('us-east-1')

architecture_result = manager.create_secure_vpc_architecture(
    vpc_cidr='10.0.0.0/16',
    project_name='secureapp',
    environment='production'
)

if architecture_result['success']:
    print(f"Secure VPC created: {architecture_result['vpc_id']}")
    print(f"Subnets created: {len(architecture_result['subnets']['public_subnets'])} public, "
          f"{len(architecture_result['subnets']['private_subnets'])} private, "
          f"{len(architecture_result['subnets']['database_subnets'])} database")
    print(f"Security groups: {len(architecture_result['security_groups'])}")
    print(f"Network ACLs: {len(architecture_result['network_acls'])}")
```

### **2. Análisis de Seguridad**
```python
# Ejemplo: Analizar postura de seguridad existente
analysis_result = manager.analyze_vpc_security_posture('vpc-1234567890abcdef0')

if analysis_result['success']:
    analysis = analysis_result['analysis']
    print(f"Security Score: {analysis['final_score']:.1f}/100")
    print(f"Security Grade: {analysis['grade']}")
    print(f"Findings: {len(analysis['findings'])}")
    print(f"Recommendations: {len(analysis['recommendations'])}")
    
    # Generar reporte completo
    report_result = manager.generate_security_report('vpc-1234567890abcdef0')
    
    if report_result['success']:
        report = report_result['report']
        print(f"Report generated for VPC {report['vpc_id']}")
```

## Best Practices

### **1. Diseño de Red**
- Segmentar subnets por función y seguridad
- Usar CIDR blocks no solapados
- Implementar defensa en profundidad
- Planificar crecimiento futuro

### **2. Control de Acceso**
- Aplicar principio de menor privilegio
- Usar security groups específicos
- Implementar Network ACLs restrictivos
- Configurar monitoreo continuo

### **3. Monitoreo**
- Habilitar VPC Flow Logs
- Configurar GuardDuty
- Implementar alertas de seguridad
- Revisar logs regularmente

### **4. Automatización**
- Usar Infrastructure as Code
- Automatizar provisionamiento
- Implementar políticas de seguridad
- Configurar respuestas automáticas

## Configuración con AWS CLI

### **Crear VPC Segura**
```bash
# Crear VPC con DNS
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=secure-vpc}]'

# Habilitar DNS
aws ec2 modify-vpc-attribute \
  --vpc-id vpc-1234567890abcdef0 \
  --enable-dns-support

aws ec2 modify-vpc-attribute \
  --vpc-id vpc-1234567890abcdef0 \
  --enable-dns-hostnames

# Habilitar Flow Logs
aws ec2 create-flow-logs \
  --resource-ids vpc-1234567890abcdef0 \
  --resource-type VPC \
  --traffic-type ALL \
  --log-group-name /aws/vpc/flow-logs/secure-vpc

# Habilitar GuardDuty
aws guardduty create-detector \
  --enable \
  --tags Key=Project,Value=secure-app
```

## Monitoreo y Alertas

### **CloudWatch Metrics**
- VPC Flow Logs
- GuardDuty findings
- Security Group changes
- Network ACL modifications

### **Alertas Recomendadas**
- Cambios en configuración de red
- Detección de amenazas
- Tráfico anómalo
- Conexiones no autorizadas

## Troubleshooting

### **Problemas Comunes**
1. **Conectividad entre tiers**: Verificar SGs y NACLs
2. **Flow Logs no funcionan**: Revisar permisos IAM
3. **GuardDuty no detecta**: Verificar configuración
4. **Endpoints no conectan**: Validar configuración de red

### **Comandos de Diagnóstico**
```bash
# Verificar configuración VPC
aws ec2 describe-vpcs --vpc-ids vpc-1234567890abcdef0

# Verificar flow logs
aws ec2 describe-flow-logs --filters Name=resource-id,Values=vpc-1234567890abcdef0

# Verificar GuardDuty
aws guardduty get-detector --detector-id abc1234567890abcdef0

# Verificar endpoints
aws ec2 describe-vpc-endpoints --filters Name=vpc-id,Values=vpc-1234567890abcdef0
```

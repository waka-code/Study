# AWS Security Groups

## Definición

AWS Security Groups son firewalls virtuales que controlan el tráfico de entrada y salida para los recursos en tu VPC. Funcionan a nivel de instancia (stateful) y permiten especificar reglas para permitir o denegar tráfico basado en protocolo, puerto y dirección IP de origen/destino.

## Características Principales

### **Stateful Filtering**
- **Conexiones bidireccionales**: Permiten tráfico de retorno automático
- **Seguimiento de estado**: Mantiene estado de conexiones activas
- **Respuestas permitidas**: Traffic de retorno automáticamente permitido

### **Granular Control**
- **Protocolos específicos**: TCP, UDP, ICMP, etc.
- **Rangos de puertos**: Puertos individuales o rangos
- **Control de IPs**: IPs específicas o rangos CIDR
- **Referencias**: Otros security groups

### **Flexibilidad**
- **Reglas dinámicas**: Agregar/eliminar reglas en tiempo real
- **Múltiples SGs**: Asignar múltiples security groups
- **Herencia**: Reglas combinadas de múltiples SGs

### **Integración**
- **IAM**: Control de gestión de SGs
- **CloudTrail**: Auditoría de cambios
- **VPC**: Aislamiento por red

## Componentes de Security Groups

### **1. Inbound Rules**
- Controlan tráfico entrante
- Especifican protocolo, puerto, origen
- Permiten o deniegan acceso

### **2. Outbound Rules**
- Controlan tráfico saliente
- Por defecto permiten todo el tráfico
- Pueden ser restringidas

### **3. References**
- Referencias a otros SGs
- Permiten comunicación entre recursos
- Facilitan gestión de microservicios

## Configuración de Security Groups

### **Gestión de Security Groups**
```python
import boto3
import json
from datetime import datetime, timedelta

class SecurityGroupManager:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.region = region
    
    def create_security_group(self, group_name, description, vpc_id, 
                             tags=None):
        """Crear security group"""
        
        try:
            sg_params = {
                'GroupName': group_name,
                'Description': description,
                'VpcId': vpc_id
            }
            
            if tags:
                sg_params['TagSpecifications'] = [
                    {
                        'ResourceType': 'security-group',
                        'Tags': tags
                    }
                ]
            
            response = self.ec2.create_security_group(**sg_params)
            sg_id = response['GroupId']
            
            return {
                'success': True,
                'group_id': sg_id,
                'group_name': group_name,
                'vpc_id': vpc_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def authorize_ingress(self, group_id, ip_permissions):
        **Agregar reglas de entrada**
        
        try:
            response = self.ec2.authorize_security_group_ingress(
                GroupId=group_id,
                IpPermissions=ip_permissions
            )
            
            return {
                'success': True,
                'group_id': group_id,
                'rules_added': len(ip_permissions)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def authorize_egress(self, group_id, ip_permissions):
        **Agregar reglas de salida**
        
        try:
            response = self.ec2.authorize_security_group_egress(
                GroupId=group_id,
                IpPermissions=ip_permissions
            )
            
            return {
                'success': True,
                'group_id': group_id,
                'rules_added': len(ip_permissions)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def revoke_ingress(self, group_id, ip_permissions):
        **Revocar reglas de entrada**
        
        try:
            response = self.ec2.revoke_security_group_ingress(
                GroupId=group_id,
                IpPermissions=ip_permissions
            )
            
            return {
                'success': True,
                'group_id': group_id,
                'rules_removed': len(ip_permissions)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def revoke_egress(self, group_id, ip_permissions):
        **Revocar reglas de salida**
        
        try:
            response = self.ec2.revoke_security_group_egress(
                GroupId=group_id,
                IpPermissions=ip_permissions
            )
            
            return {
                'success': True,
                'group_id': group_id,
                'rules_removed': len(ip_permissions)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_security_groups(self, group_ids=None, filters=None):
        **Describir security groups**
        
        try:
            params = {}
            if group_ids:
                params['GroupIds'] = group_ids
            if filters:
                params['Filters'] = filters
            
            response = self.ec2.describe_security_groups(**params)
            
            security_groups = []
            for sg in response['SecurityGroups']:
                sg_info = {
                    'group_id': sg['GroupId'],
                    'group_name': sg['GroupName'],
                    'description': sg['Description'],
                    'vpc_id': sg['VpcId'],
                    'owner_id': sg['OwnerId'],
                    'inbound_rules': sg['IpPermissions'],
                    'outbound_rules': sg['IpPermissionsEgress'],
                    'tags': sg.get('Tags', [])
                }
                security_groups.append(sg_info)
            
            return {
                'success': True,
                'security_groups': security_groups,
                'count': len(security_groups)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_security_group(self, group_id):
        **Eliminar security group**
        
        try:
            self.ec2.delete_security_group(GroupId=group_id)
            
            return {
                'success': True,
                'group_id': group_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_ip_permission(self, ip_protocol, from_port=None, to_port=None,
                           cidr_blocks=None, user_id_group_pairs=None,
                           prefix_list_ids=None):
        **Crear permiso IP**
        
        permission = {
            'IpProtocol': ip_protocol
        }
        
        if from_port is not None:
            permission['FromPort'] = from_port
        if to_port is not None:
            permission['ToPort'] = to_port
        
        if cidr_blocks:
            permission['IpRanges'] = [{'CidrIp': cidr} for cidr in cidr_blocks]
        
        if user_id_group_pairs:
            permission['UserIdGroupPairs'] = user_id_group_pairs
        
        if prefix_list_ids:
            permission['PrefixListIds'] = prefix_list_ids
        
        return permission
    
    def create_web_server_sg(self, vpc_id, sg_name='web-servers'):
        **Crear security group para servidores web**
        
        try:
            # Crear SG
            create_result = self.create_security_group(
                group_name=sg_name,
                description='Security group for web servers',
                vpc_id=vpc_id,
                tags=[
                    {'Key': 'Name', 'Value': sg_name},
                    {'Key': 'Type', 'Value': 'Web Server'}
                ]
            )
            
            if not create_result['success']:
                return create_result
            
            sg_id = create_result['group_id']
            
            # Reglas de entrada
            inbound_rules = [
                # HTTP
                self.create_ip_permission(
                    ip_protocol='tcp',
                    from_port=80,
                    to_port=80,
                    cidr_blocks=['0.0.0.0/0']
                ),
                # HTTPS
                self.create_ip_permission(
                    ip_protocol='tcp',
                    from_port=443,
                    to_port=443,
                    cidr_blocks=['0.0.0.0/0']
                ),
                # SSH (desde office)
                self.create_ip_permission(
                    ip_protocol='tcp',
                    from_port=22,
                    to_port=22,
                    cidr_blocks=['203.0.113.0/24']
                )
            ]
            
            # Reglas de salida
            outbound_rules = [
                # Permitir todo el tráfico saliente
                self.create_ip_permission(ip_protocol='-1')
            ]
            
            # Aplicar reglas
            self.authorize_ingress(sg_id, inbound_rules)
            self.authorize_egress(sg_id, outbound_rules)
            
            return {
                'success': True,
                'group_id': sg_id,
                'group_name': sg_name,
                'inbound_rules': len(inbound_rules),
                'outbound_rules': len(outbound_rules)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_database_sg(self, vpc_id, web_sg_id, sg_name='database'):
        **Crear security group para bases de datos**
        
        try:
            # Crear SG
            create_result = self.create_security_group(
                group_name=sg_name,
                description='Security group for database servers',
                vpc_id=vpc_id,
                tags=[
                    {'Key': 'Name', 'Value': sg_name},
                    {'Key': 'Type', 'Value': 'Database'}
                ]
            )
            
            if not create_result['success']:
                return create_result
            
            sg_id = create_result['group_id']
            
            # Reglas de entrada (solo desde web servers)
            inbound_rules = [
                # MySQL desde web servers
                self.create_ip_permission(
                    ip_protocol='tcp',
                    from_port=3306,
                    to_port=3306,
                    user_id_group_pairs=[{
                        'GroupId': web_sg_id
                    }]
                ),
                # PostgreSQL desde web servers
                self.create_ip_permission(
                    ip_protocol='tcp',
                    from_port=5432,
                    to_port=5432,
                    user_id_group_pairs=[{
                        'GroupId': web_sg_id
                    }]
                )
            ]
            
            # Reglas de salida
            outbound_rules = [
                # Permitir todo el tráfico saliente
                self.create_ip_permission(ip_protocol='-1')
            ]
            
            # Aplicar reglas
            self.authorize_ingress(sg_id, inbound_rules)
            self.authorize_egress(sg_id, outbound_rules)
            
            return {
                'success': True,
                'group_id': sg_id,
                'group_name': sg_name,
                'inbound_rules': len(inbound_rules),
                'outbound_rules': len(outbound_rules)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_load_balancer_sg(self, vpc_id, sg_name='load-balancer'):
        **Crear security group para load balancer**
        
        try:
            # Crear SG
            create_result = self.create_security_group(
                group_name=sg_name,
                description='Security group for load balancer',
                vpc_id=vpc_id,
                tags=[
                    {'Key': 'Name', 'Value': sg_name},
                    {'Key': 'Type', 'Value': 'Load Balancer'}
                ]
            )
            
            if not create_result['success']:
                return create_result
            
            sg_id = create_result['group_id']
            
            # Reglas de entrada
            inbound_rules = [
                # HTTP
                self.create_ip_permission(
                    ip_protocol='tcp',
                    from_port=80,
                    to_port=80,
                    cidr_blocks=['0.0.0.0/0']
                ),
                # HTTPS
                self.create_ip_permission(
                    ip_protocol='tcp',
                    from_port=443,
                    to_port=443,
                    cidr_blocks=['0.0.0.0/0']
                )
            ]
            
            # Reglas de salida
            outbound_rules = [
                # Permitir todo el tráfico saliente
                self.create_ip_permission(ip_protocol='-1')
            ]
            
            # Aplicar reglas
            self.authorize_ingress(sg_id, inbound_rules)
            self.authorize_egress(sg_id, outbound_rules)
            
            return {
                'success': True,
                'group_id': sg_id,
                'group_name': sg_name,
                'inbound_rules': len(inbound_rules),
                'outbound_rules': len(outbound_rules)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_security_group_rules(self, group_id):
        **Analizar reglas de security group**
        
        try:
            response = self.ec2.describe_security_groups(GroupIds=[group_id])
            
            if not response['SecurityGroups']:
                return {
                    'success': False,
                    'error': 'Security group not found'
                }
            
            sg = response['SecurityGroups'][0]
            
            # Analizar reglas de entrada
            inbound_analysis = {
                'total_rules': len(sg['IpPermissions']),
                'open_to_world': 0,
                'restricted_access': 0,
                'sg_references': 0,
                'risk_level': 'low'
            }
            
            for rule in sg['IpPermissions']:
                # Verificar acceso abierto al mundo
                if 'IpRanges' in rule:
                    for ip_range in rule['IpRanges']:
                        if ip_range['CidrIp'] == '0.0.0.0/0':
                            inbound_analysis['open_to_world'] += 1
                
                # Verificar referencias a otros SGs
                if 'UserIdGroupPairs' in rule:
                    inbound_analysis['sg_references'] += len(rule['UserIdGroupPairs'])
            
            # Calcular nivel de riesgo
            if inbound_analysis['open_to_world'] > 2:
                inbound_analysis['risk_level'] = 'high'
            elif inbound_analysis['open_to_world'] > 0:
                inbound_analysis['risk_level'] = 'medium'
            
            # Analizar reglas de salida
            outbound_analysis = {
                'total_rules': len(sg['IpPermissionsEgress']),
                'wide_open': False
            }
            
            for rule in sg['IpPermissionsEgress']:
                if rule['IpProtocol'] == '-1' and 'IpRanges' not in rule:
                    outbound_analysis['wide_open'] = True
                    break
            
            return {
                'success': True,
                'group_id': group_id,
                'group_name': sg['GroupName'],
                'inbound_analysis': inbound_analysis,
                'outbound_analysis': outbound_analysis,
                'overall_risk': inbound_analysis['risk_level']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_security_group_usage(self, group_id):
        **Obtener uso del security group**
        
        try:
            # Buscar instancias que usan el SG
            instances_response = self.ec2.describe_instances(
                Filters=[
                    {'Name': 'instance.group-id', 'Values': [group_id]}
                ]
            )
            
            instances = []
            for reservation in instances_response['Reservations']:
                for instance in reservation['Instances']:
                    instances.append({
                        'instance_id': instance['InstanceId'],
                        'instance_type': instance['InstanceType'],
                        'state': instance['State']['Name'],
                        'private_ip': instance.get('PrivateIpAddress'),
                        'public_ip': instance.get('PublicIpAddress')
                    })
            
            # Buscar interfaces de red que usan el SG
            interfaces_response = self.ec2.describe_network_interfaces(
                Filters=[
                    {'Name': 'group-id', 'Values': [group_id]}
                ]
            )
            
            interfaces = []
            for interface in interfaces_response['NetworkInterfaces']:
                interfaces.append({
                    'interface_id': interface['NetworkInterfaceId'],
                    'interface_type': interface['InterfaceType'],
                    'status': interface['Status'],
                    'subnet_id': interface['SubnetId'],
                    'attachment': interface.get('Attachment', {})
                })
            
            return {
                'success': True,
                'group_id': group_id,
                'instances_count': len(instances),
                'interfaces_count': len(interfaces),
                'instances': instances,
                'interfaces': interfaces
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Configuración de Arquitectura Web Típica**
```python
# Ejemplo: Configurar SGs para arquitectura web de 3 tiers
manager = SecurityGroupManager('us-east-1')
vpc_id = 'vpc-1234567890abcdef0'

# Crear SG para Load Balancer
lb_sg_result = manager.create_load_balancer_sg(
    vpc_id=vpc_id,
    sg_name='web-load-balancer'
)

if lb_sg_result['success']:
    lb_sg_id = lb_sg_result['group_id']
    
    # Crear SG para Web Servers
    web_sg_result = manager.create_web_server_sg(
        vpc_id=vpc_id,
        sg_name='web-servers'
    )
    
    if web_sg_result['success']:
        web_sg_id = web_sg_result['group_id']
        
        # Crear SG para Database
        db_sg_result = manager.create_database_sg(
            vpc_id=vpc_id,
            web_sg_id=web_sg_id,
            sg_name='database-servers'
        )
        
        if db_sg_result['success']:
            print("3-tier security groups created successfully")
            
            # Analizar configuración
            for sg_id, name in [(lb_sg_id, 'Load Balancer'), 
                               (web_sg_id, 'Web Servers'), 
                               (db_sg_result['group_id'], 'Database')]:
                analysis = manager.analyze_security_group_rules(sg_id)
                if analysis['success']:
                    print(f"{name} - Risk Level: {analysis['overall_risk']}")
```

### **2. Análisis de Seguridad**
```python
# Ejemplo: Analizar todos los SGs de una VPC
sgs_response = manager.describe_security_groups(
    filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
)

if sgs_response['success']:
    high_risk_sgs = []
    
    for sg in sgs_response['security_groups']:
        analysis = manager.analyze_security_group_rules(sg['group_id'])
        if analysis['success'] and analysis['overall_risk'] == 'high':
            high_risk_sgs.append({
                'group_id': sg['group_id'],
                'group_name': sg['group_name'],
                'risk_details': analysis['inbound_analysis']
            })
    
    print(f"Found {len(high_risk_sgs)} high-risk security groups")
    
    for sg in high_risk_sgs:
        print(f"High Risk: {sg['group_name']} ({sg['group_id']})")
```

## Configuración con AWS CLI

### **Crear Security Groups**
```bash
# Crear SG para web servers
aws ec2 create-security-group \
  --group-name web-servers \
  --description "Security group for web servers" \
  --vpc-id vpc-1234567890abcdef0 \
  --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=web-servers}]'

# Agregar reglas de entrada
aws ec2 authorize-security-group-ingress \
  --group-id sg-1234567890abcdef0 \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-1234567890abcdef0 \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Agregar regla de referencia a otro SG
aws ec2 authorize-security-group-ingress \
  --group-id sg-0987654321fedcba0 \
  --protocol tcp \
  --port 3306 \
  --source-group sg-1234567890abcdef0

# Describir SGs
aws ec2 describe-security-groups \
  --group-ids sg-1234567890abcdef0

# Eliminar SG
aws ec2 delete-security-group --group-id sg-1234567890abcdef0
```

## Best Practices

### **1. Principio de Menor Privilegio**
- Solo permitir tráfico necesario
- Usar rangos IP específicos
- Evitar reglas demasiado permissivas

### **2. Organización**
- Usar nombres descriptivos
- Etiquetar todos los SGs
- Documentar propósito de cada SG

### **3. Gestión**
- Revisar reglas regularmente
- Eliminar SGs no utilizados
- Usar herramientas de análisis

### **4. Seguridad**
- Limitar acceso administrativo
- Usar referencias entre SGs
- Implementar monitoreo

## Troubleshooting

### **Problemas Comunes**
1. **Conexión rechazada**: Verificar reglas de entrada
2. **No se puede conectar a internet**: Revisar reglas de salida
3. **Reglas no aplican**: Verificar orden y prioridad
4. **Conflictos entre SGs**: Revisar reglas combinadas

### **Comandos de Diagnóstico**
```bash
# Verificar reglas de SG
aws ec2 describe-security-groups \
  --group-ids sg-1234567890abcdef0 \
  --query 'SecurityGroups[0].IpPermissions'

# Verificar uso de SG
aws ec2 describe-instances \
  --filters Name=instance.group-id,Values=sg-1234567890abcdef0

# Verificar interfaces de red
aws ec2 describe-network-interfaces \
  --filters Name=group-id,Values=sg-1234567890abcdef0

# Test de conectividad
nc -zv target-ip 80
```

## Monitoreo

### **Métricas CloudWatch**
- AWS/EC2: NetworkIn, NetworkOut
- Conexiones por puerto
- Tráfico rechazado

### **Herramientas de Análisis**
- AWS Config Rules
- AWS Trusted Advisor
- Third-party security tools
- Custom scripts

### **Alarmas Recomendadas**
- Cambios en reglas de SG
- Conexiones inusuales
- Tráfico elevado a puertos críticos

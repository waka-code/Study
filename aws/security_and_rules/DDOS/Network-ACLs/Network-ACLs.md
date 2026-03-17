# AWS Network ACLs

## Definición

AWS Network Access Control Lists (NACLs) son firewalls stateless que controlan el tráfico de entrada y salida para subnets en tu VPC. A diferencia de los Security Groups, los NACLs operan a nivel de subnet y no mantienen estado, lo que significa que debes configurar reglas tanto para tráfico de entrada como de salida.

## Características Principales

### **Stateless Filtering**
- **Sin estado**: No mantienen estado de conexiones
- **Reglas bidireccionales**: Deben configurarse entrada y salida
- **Evaluación explícita**: Cada regla evaluada independientemente

### **Subnet Level Control**
- **Por subnet**: Se aplican a todas las instancias en la subnet
- **Obligatorios**: Todas las subnets tienen un NACL asociado
- **Herencia**: Subnets heredan NACL por defecto

### **Reglas Numeradas**
- **Orden numérico**: Reglas evaluadas en orden ascendente
- **Prioridad**: Reglas más bajas tienen mayor prioridad
- **Rango**: 1-32766 para reglas personalizadas

### **Acciones Explícitas**
- **Allow**: Permite tráfico específico
- **Deny**: Deniega tráfico específico
- **Deny por defecto**: Tráfico no coincidente es denegado

## Componentes de Network ACLs

### **1. Inbound Rules**
- Controlan tráfico entrante a la subnet
- Especifican protocolo, puerto, rango de IPs
- Evaluadas en orden numérico

### **2. Outbound Rules**
- Controlan tráfico saliente de la subnet
- Necesarias para respuestas (stateless)
- Configuradas independientemente

### **3. Default NACL**
- NACL por defecto de la VPC
- Permite todo el tráfico
- Modificable según necesidades

## Configuración de Network ACLs

### **Gestión de Network ACLs**
```python
import boto3
import json
from datetime import datetime, timedelta

class NetworkACLManager:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.region = region
    
    def create_network_acl(self, vpc_id, acl_name=None, tags=None):
        """Crear Network ACL"""
        
        try:
            acl_params = {
                'VpcId': vpc_id
            }
            
            if tags:
                acl_params['TagSpecifications'] = [
                    {
                        'ResourceType': 'network-acl',
                        'Tags': tags
                    }
                ]
            
            response = self.ec2.create_network_acl(**acl_params)
            acl_id = response['NetworkAcl']['NetworkAclId']
            
            return {
                'success': True,
                'acl_id': acl_id,
                'vpc_id': vpc_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_network_acl_entry(self, network_acl_id, rule_number, protocol,
                                rule_action, egress, cidr_block, icmp_code=None,
                                icmp_type=None, port_range_from=None, port_range_to=None):
        """Crear entrada de Network ACL"""
        
        try:
            entry_params = {
                'NetworkAclId': network_acl_id,
                'RuleNumber': rule_number,
                'Protocol': protocol,
                'RuleAction': rule_action,
                'Egress': egress,
                'CidrBlock': cidr_block
            }
            
            # Agregar parámetros ICMP si se especifican
            if icmp_code is not None and icmp_type is not None:
                entry_params['IcmpTypeCode'] = {
                    'Code': icmp_code,
                    'Type': icmp_type
                }
            
            # Agregar rango de puertos si se especifica
            if port_range_from is not None and port_range_to is not None:
                entry_params['PortRange'] = {
                    'From': port_range_from,
                    'To': port_range_to
                }
            
            self.ec2.create_network_acl_entry(**entry_params)
            
            return {
                'success': True,
                'acl_id': network_acl_id,
                'rule_number': rule_number,
                'protocol': protocol,
                'action': rule_action,
                'direction': 'outbound' if egress else 'inbound'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def replace_network_acl_entry(self, network_acl_id, rule_number, protocol,
                                 rule_action, egress, cidr_block, icmp_code=None,
                                 icmp_type=None, port_range_from=None, port_range_to=None):
        """Reemplazar entrada de Network ACL"""
        
        try:
            entry_params = {
                'NetworkAclId': network_acl_id,
                'RuleNumber': rule_number,
                'Protocol': protocol,
                'RuleAction': rule_action,
                'Egress': egress,
                'CidrBlock': cidr_block
            }
            
            if icmp_code is not None and icmp_type is not None:
                entry_params['IcmpTypeCode'] = {
                    'Code': icmp_code,
                    'Type': icmp_type
                }
            
            if port_range_from is not None and port_range_to is not None:
                entry_params['PortRange'] = {
                    'From': port_range_from,
                    'To': port_range_to
                }
            
            self.ec2.replace_network_acl_entry(**entry_params)
            
            return {
                'success': True,
                'acl_id': network_acl_id,
                'rule_number': rule_number
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_network_acl_entry(self, network_acl_id, rule_number, egress):
        """Eliminar entrada de Network ACL"""
        
        try:
            self.ec2.delete_network_acl_entry(
                NetworkAclId=network_acl_id,
                RuleNumber=rule_number,
                Egress=egress
            )
            
            return {
                'success': True,
                'acl_id': network_acl_id,
                'rule_number': rule_number
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_network_acls(self, network_acl_ids=None, filters=None):
        """Describir Network ACLs"""
        
        try:
            params = {}
            if network_acl_ids:
                params['NetworkAclIds'] = network_acl_ids
            if filters:
                params['Filters'] = filters
            
            response = self.ec2.describe_network_acls(**params)
            
            acls = []
            for acl in response['NetworkAcls']:
                acl_info = {
                    'acl_id': acl['NetworkAclId'],
                    'vpc_id': acl['VpcId'],
                    'is_default': acl['IsDefault'],
                    'owner_id': acl['OwnerId'],
                    'associations': acl.get('Associations', []),
                    'entries': acl.get('Entries', []),
                    'tags': acl.get('Tags', [])
                }
                acls.append(acl_info)
            
            return {
                'success': True,
                'network_acls': acls,
                'count': len(acls)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def replace_network_acl_association(self, association_id, network_acl_id):
        """Reemplazar asociación de Network ACL"""
        
        try:
            response = self.ec2.replace_network_acl_association(
                AssociationId=association_id,
                NetworkAclId=network_acl_id
            )
            
            new_association_id = response['NewAssociationId']
            
            return {
                'success': True,
                'old_association_id': association_id,
                'new_association_id': new_association_id,
                'network_acl_id': network_acl_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_network_acl(self, network_acl_id):
        """Eliminar Network ACL"""
        
        try:
            self.ec2.delete_network_acl(NetworkAclId=network_acl_id)
            
            return {
                'success': True,
                'acl_id': network_acl_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_web_server_acl(self, vpc_id, acl_name='web-server-acl'):
        """Crear Network ACL para servidores web"""
        
        try:
            # Crear NACL
            create_result = self.create_network_acl(
                vpc_id=vpc_id,
                tags=[
                    {'Key': 'Name', 'Value': acl_name},
                    {'Key': 'Type', 'Value': 'Web Server'}
                ]
            )
            
            if not create_result['success']:
                return create_result
            
            acl_id = create_result['acl_id']
            
            # Reglas de entrada
            inbound_rules = [
                # Permitir HTTP desde cualquier lugar
                {
                    'rule_number': 100,
                    'protocol': '6',  # TCP
                    'rule_action': 'allow',
                    'egress': False,
                    'cidr_block': '0.0.0.0/0',
                    'port_range_from': 80,
                    'port_range_to': 80
                },
                # Permitir HTTPS desde cualquier lugar
                {
                    'rule_number': 110,
                    'protocol': '6',  # TCP
                    'rule_action': 'allow',
                    'egress': False,
                    'cidr_block': '0.0.0.0/0',
                    'port_range_from': 443,
                    'port_range_to': 443
                },
                # Permitir SSH desde office network
                {
                    'rule_number': 120,
                    'protocol': '6',  # TCP
                    'rule_action': 'allow',
                    'egress': False,
                    'cidr_block': '203.0.113.0/24',
                    'port_range_from': 22,
                    'port_range_to': 22
                },
                # Permitir respuestas temporarias (para conexiones establecidas)
                {
                    'rule_number': 130,
                    'protocol': '6',  # TCP
                    'rule_action': 'allow',
                    'egress': False,
                    'cidr_block': '0.0.0.0/0',
                    'port_range_from': 1024,
                    'port_range_to': 65535
                }
            ]
            
            # Reglas de salida
            outbound_rules = [
                # Permitir HTTP saliente
                {
                    'rule_number': 100,
                    'protocol': '6',  # TCP
                    'rule_action': 'allow',
                    'egress': True,
                    'cidr_block': '0.0.0.0/0',
                    'port_range_from': 80,
                    'port_range_to': 80
                },
                # Permitir HTTPS saliente
                {
                    'rule_number': 110,
                    'protocol': '6',  # TCP
                    'rule_action': 'allow',
                    'egress': True,
                    'cidr_block': '0.0.0.0/0',
                    'port_range_from': 443,
                    'port_range_to': 443
                },
                # Permitir DNS
                {
                    'rule_number': 120,
                    'protocol': '17',  # UDP
                    'rule_action': 'allow',
                    'egress': True,
                    'cidr_block': '0.0.0.0/0',
                    'port_range_from': 53,
                    'port_range_to': 53
                },
                # Permitir respuestas temporarias
                {
                    'rule_number': 130,
                    'protocol': '6',  # TCP
                    'rule_action': 'allow',
                    'egress': True,
                    'cidr_block': '0.0.0.0/0',
                    'port_range_from': 1024,
                    'port_range_to': 65535
                }
            ]
            
            # Aplicar reglas
            for rule in inbound_rules:
                self.create_network_acl_entry(acl_id, **rule)
            
            for rule in outbound_rules:
                self.create_network_acl_entry(acl_id, **rule)
            
            return {
                'success': True,
                'acl_id': acl_id,
                'acl_name': acl_name,
                'inbound_rules': len(inbound_rules),
                'outbound_rules': len(outbound_rules)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_database_acl(self, vpc_id, web_subnet_cidr, acl_name='database-acl'):
        """Crear Network ACL para bases de datos"""
        
        try:
            # Crear NACL
            create_result = self.create_network_acl(
                vpc_id=vpc_id,
                tags=[
                    {'Key': 'Name', 'Value': acl_name},
                    {'Key': 'Type', 'Value': 'Database'}
                ]
            )
            
            if not create_result['success']:
                return create_result
            
            acl_id = create_result['acl_id']
            
            # Reglas de entrada (solo desde web servers)
            inbound_rules = [
                # Permitir MySQL desde web subnet
                {
                    'rule_number': 100,
                    'protocol': '6',  # TCP
                    'rule_action': 'allow',
                    'egress': False,
                    'cidr_block': web_subnet_cidr,
                    'port_range_from': 3306,
                    'port_range_to': 3306
                },
                # Permitir PostgreSQL desde web subnet
                {
                    'rule_number': 110,
                    'protocol': '6',  # TCP
                    'rule_action': 'allow',
                    'egress': False,
                    'cidr_block': web_subnet_cidr,
                    'port_range_from': 5432,
                    'port_range_to': 5432
                }
            ]
            
            # Reglas de salida
            outbound_rules = [
                # Permitir respuestas a web servers
                {
                    'rule_number': 100,
                    'protocol': '6',  # TCP
                    'rule_action': 'allow',
                    'egress': True,
                    'cidr_block': web_subnet_cidr,
                    'port_range_from': 1024,
                    'port_range_to': 65535
                }
            ]
            
            # Aplicar reglas
            for rule in inbound_rules:
                self.create_network_acl_entry(acl_id, **rule)
            
            for rule in outbound_rules:
                self.create_network_acl_entry(acl_id, **rule)
            
            return {
                'success': True,
                'acl_id': acl_id,
                'acl_name': acl_name,
                'inbound_rules': len(inbound_rules),
                'outbound_rules': len(outbound_rules)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_network_acl_rules(self, network_acl_id):
        """Analizar reglas de Network ACL"""
        
        try:
            response = self.ec2.describe_network_acls(NetworkAclIds=[network_acl_id])
            
            if not response['NetworkAcls']:
                return {
                    'success': False,
                    'error': 'Network ACL not found'
                }
            
            acl = response['NetworkAcls'][0]
            
            # Analizar reglas de entrada
            inbound_rules = [rule for rule in acl['Entries'] if not rule['Egress']]
            outbound_rules = [rule for rule in acl['Entries'] if rule['Egress']]
            
            inbound_analysis = {
                'total_rules': len(inbound_rules),
                'allow_rules': len([r for r in inbound_rules if r['RuleAction'] == 'allow']),
                'deny_rules': len([r for r in inbound_rules if r['RuleAction'] == 'deny']),
                'open_ports': set(),
                'restricted_sources': [],
                'wide_open_rules': 0
            }
            
            for rule in inbound_rules:
                if rule['RuleAction'] == 'allow':
                    if 'PortRange' in rule:
                        inbound_analysis['open_ports'].add(
                            f"{rule['PortRange']['From']}-{rule['PortRange']['To']}"
                        )
                    
                    if rule['CidrBlock'] == '0.0.0.0/0':
                        inbound_analysis['wide_open_rules'] += 1
                    else:
                        inbound_analysis['restricted_sources'].append(rule['CidrBlock'])
            
            # Análisis similar para reglas de salida
            outbound_analysis = {
                'total_rules': len(outbound_rules),
                'allow_rules': len([r for r in outbound_rules if r['RuleAction'] == 'allow']),
                'deny_rules': len([r for r in outbound_rules if r['RuleAction'] == 'deny']),
                'open_ports': set(),
                'wide_open_rules': 0
            }
            
            for rule in outbound_rules:
                if rule['RuleAction'] == 'allow' and 'PortRange' in rule:
                    outbound_analysis['open_ports'].add(
                        f"{rule['PortRange']['From']}-{rule['PortRange']['To']}"
                    )
                    
                    if rule['CidrBlock'] == '0.0.0.0/0':
                        outbound_analysis['wide_open_rules'] += 1
            
            # Calcular nivel de riesgo
            risk_level = 'low'
            if inbound_analysis['wide_open_rules'] > 2:
                risk_level = 'high'
            elif inbound_analysis['wide_open_rules'] > 0:
                risk_level = 'medium'
            
            return {
                'success': True,
                'acl_id': network_acl_id,
                'is_default': acl['IsDefault'],
                'associations': len(acl.get('Associations', [])),
                'inbound_analysis': inbound_analysis,
                'outbound_analysis': outbound_analysis,
                'overall_risk': risk_level
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_subnet_associations(self, network_acl_id):
        """Obtener asociaciones de subnets"""
        
        try:
            response = self.ec2.describe_network_acls(NetworkAclIds=[network_acl_id])
            
            if not response['NetworkAcls']:
                return {
                    'success': False,
                    'error': 'Network ACL not found'
                }
            
            acl = response['NetworkAcls'][0]
            associations = acl.get('Associations', [])
            
            subnet_info = []
            for association in associations:
                subnet_info.append({
                    'association_id': association['NetworkAclAssociationId'],
                    'subnet_id': association['SubnetId'],
                    'is_main': association.get('Main', False)
                })
            
            return {
                'success': True,
                'acl_id': network_acl_id,
                'associations': subnet_info,
                'count': len(subnet_info)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Configurar NACLs para Arquitectura Web**
```python
# Ejemplo: Configurar NACLs para arquitectura web
manager = NetworkACLManager('us-east-1')
vpc_id = 'vpc-1234567890abcdef0'
web_subnet_cidr = '10.0.1.0/24'

# Crear NACL para servidores web
web_acl_result = manager.create_web_server_acl(
    vpc_id=vpc_id,
    acl_name='web-servers-acl'
)

if web_acl_result['success']:
    web_acl_id = web_acl_result['acl_id']
    
    # Crear NACL para bases de datos
    db_acl_result = manager.create_database_acl(
        vpc_id=vpc_id,
        web_subnet_cidr=web_subnet_cidr,
        acl_name='database-acl'
    )
    
    if db_acl_result['success']:
        print("Network ACLs created successfully")
        
        # Analizar configuración
        for acl_id, name in [(web_acl_id, 'Web Servers'), 
                           (db_acl_result['acl_id'], 'Database')]:
            analysis = manager.analyze_network_acl_rules(acl_id)
            if analysis['success']:
                print(f"{name} NACL - Risk Level: {analysis['overall_risk']}")
                print(f"  Inbound rules: {analysis['inbound_analysis']['total_rules']}")
                print(f"  Outbound rules: {analysis['outbound_analysis']['total_rules']}")
```

### **2. Asociar NACL a Subnets**
```python
# Ejemplo: Asociar NACLs a subnets específicas
subnets_to_associate = {
    'subnet-11111111111111111': web_acl_id,  # Web subnet
    'subnet-22222222222222222': db_acl_result['acl_id']  # Database subnet
}

for subnet_id, acl_id in subnets_to_associate.items():
    # Obtener asociación actual
    associations = manager.get_subnet_associations(acl_id)
    
    if associations['success']:
        # Encontrar asociación existente para la subnet
        for assoc in associations['associations']:
            if assoc['subnet_id'] == subnet_id:
                # La subnet ya está asociada
                print(f"Subnet {subnet_id} already associated with ACL {acl_id}")
                break
        else:
            # Necesitamos obtener el association ID de la subnet
            # (Esto requeriría buscar la asociación actual primero)
            print(f"Would associate subnet {subnet_id} with ACL {acl_id}")
```

## Configuración con AWS CLI

### **Crear y Gestionar NACLs**
```bash
# Crear Network ACL
aws ec2 create-network-acl \
  --vpc-id vpc-1234567890abcdef0 \
  --tag-specifications 'ResourceType=network-acl,Tags=[{Key=Name,Value=web-servers-acl}]'

# Crear regla de entrada
aws ec2 create-network-acl-entry \
  --network-acl-id acl-1234567890abcdef0 \
  --rule-number 100 \
  --protocol 6 \
  --rule-action allow \
  --egress \
  --cidr-block 0.0.0.0/0 \
  --port-range From=80,To=80

# Crear regla de salida
aws ec2 create-network-acl-entry \
  --network-acl-id acl-1234567890abcdef0 \
  --rule-number 100 \
  --protocol 6 \
  --rule-action allow \
  --no-egress \
  --cidr-block 0.0.0.0/0 \
  --port-range From=1024,To=65535

# Describir NACLs
aws ec2 describe-network-acls \
  --network-acl-ids acl-1234567890abcdef0

# Reemplazar asociación
aws ec2 replace-network-acl-association \
  --association-id aclassoc-1234567890abcdef0 \
  --network-acl-id acl-0987654321fedcba0

# Eliminar regla
aws ec2 delete-network-acl-entry \
  --network-acl-id acl-1234567890abcdef0 \
  --rule-number 100 \
  --egress
```

## Best Practices

### **1. Principio de Menor Privilegio**
- Solo permitir tráfico necesario
- Usar rangos IP específicos
- Evitar reglas demasiado permissivas

### **2. Organización**
- Usar nombres descriptivos
- Documentar propósito de cada NACL
- Etiquetar todos los NACLs

### **3. Reglas**
- Numerar reglas consistentemente
- Dejar espacio para reglas futuras
- Usar rangos de números por tipo

### **4. Monitoreo**
- Revisar reglas regularmente
- Analizar tráfico permitido
- Detectar configuraciones inseguras

## Troubleshooting

### **Problemas Comunes**
1. **Conexión rechazada**: Verificar reglas de entrada y salida
2. **Reglas no aplican**: Revisar orden y numeración
3. **Tráfico bloqueado**: Verificar reglas deny
4. **Asociación incorrecta**: Verificar subnet association

### **Comandos de Diagnóstico**
```bash
# Verificar reglas de NACL
aws ec2 describe-network-acls \
  --network-acl-ids acl-1234567890abcdef0 \
  --query 'NetworkAcls[0].Entries'

# Verificar asociaciones
aws ec2 describe-network-acls \
  --filters Name=association.subnet-id,Values=subnet-1234567890abcdef0

# Verificar tráfico de red
tcpdump -i any -n host target-ip

# Test de conectividad
nc -zv target-ip 80
```

## Diferencias NACL vs Security Groups

| Característica | Network ACL | Security Group |
|----------------|-------------|----------------|
| **Nivel** | Subnet | Instancia/ENI |
| **Estado** | Stateless | Stateful |
| **Reglas** | Allow/Deny explícitos | Solo Allow |
| **Evaluación** | Todas las reglas | Primera coincidencia |
| **Asociación** | Una por subnet | Múltiples por recurso |

## Monitoreo

### **CloudWatch Metrics**
- AWS/VPC: NetworkIn, NetworkOut
- Bytes transferidos
- Paquetes descartados

### **VPC Flow Logs**
- Registro de tráfico IP
- Análisis de conexiones
- Detección de anomalías

### **Herramientas**
- AWS Config Rules
- AWS Trusted Advisor
- Third-party security tools

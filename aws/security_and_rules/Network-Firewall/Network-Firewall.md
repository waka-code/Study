# AWS Network Firewall

## Definición

AWS Network Firewall es un servicio de firewall gestionado que controla el tráfico de red a nivel de VPC. Proporciona protección centralizada para tus aplicaciones y redes, con capacidades de inspección profunda de paquetes, filtrado de aplicaciones y prevención de intrusiones.

## Características Principales

### **1. Inspección Profunda de Paquetes**
- **Stateful Filtering**: Mantiene estado de conexiones
- **Stateless Filtering**: Reglas sin estado personalizadas
- **Protocol Awareness**: Soporte para múltiples protocolos
- **Performance Optimized**: Procesamiento de alto rendimiento

### **2. Filtrado de Aplicaciones**
- **Application Layer**: Control de tráfico a nivel de aplicación
- **Domain Filtering**: Bloqueo por nombre de dominio
- **URL Filtering**: Control de acceso a URLs específicas
- **Web Application Protection**: Protección contra ataques web

### **3. Prevención de Intrusiones**
- **IPS Signatures**: Base de datos de firmas de intrusiones
- **Threat Intelligence**: Inteligencia de amenazas actualizada
- **Custom Rules**: Reglas personalizadas de seguridad
- **Automatic Updates**: Actualizaciones automáticas de firmas

### **4. Integración Centralizada**
- **VPC Integration**: Integración nativa con VPC
- **Central Management**: Gestión centralizada de políticas
- **Multi-Account**: Soporte para múltiples cuentas
- **Logging Integration**: Integración con CloudWatch y S3

## Componentes de Network Firewall

### **1. Firewall Endpoints**
- **Data Plane**: Procesamiento de tráfico
- **High Availability**: Despliegue en múltiples AZs
- **Scalable**: Escalabilidad automática
- **Traffic Inspection**: Inspección de tráfico entrante/saliente

### **2. Rule Groups**
- **Stateful Rules**: Reglas con estado
- **Stateless Rules**: Reglas sin estado
- **Domain Lists**: Listas de dominios permitidos/bloqueados
- **Custom Rules**: Reglas personalizadas

### **3. Firewall Policies**
- **Policy Management**: Gestión de políticas
- **Rule Group Association**: Asociación de grupos de reglas
- **Priority Setting**: Configuración de prioridades
- **Policy Variables**: Variables de políticas dinámicas

### **4. Monitoring & Logging**
- **Flow Logs**: Registro de flujo de tráfico
- **Alert Logs**: Registro de alertas de seguridad
- **Metrics**: Métricas de rendimiento
- **Integration**: Integración con CloudWatch

## Configuración de Network Firewall

### **Gestión de Network Firewall**
```python
import boto3
import json
from datetime import datetime, timedelta

class NetworkFirewallManager:
    def __init__(self, region='us-east-1'):
        self.nfw = boto3.client('network-firewall', region_name=region)
        self.ec2 = boto3.client('ec2', region_name=region)
        self.logs = boto3.client('logs', region_name=region)
        self.region = region
    
    def create_network_firewall(self, firewall_name, vpc_id, subnet_mapping, 
                               firewall_policy_arn, tags=None):
        """Crear Network Firewall"""
        
        try:
            firewall_params = {
                'FirewallName': firewall_name,
                'FirewallPolicyArn': firewall_policy_arn,
                'VpcId': vpc_id,
                'SubnetMappings': subnet_mapping,
                'DeleteProtection': False,
                'SubnetChangeProtection': False,
                'FirewallPolicyChangeProtection': False
            }
            
            if tags:
                firewall_params['Tags'] = tags
            
            response = self.nfw.create_firewall(**firewall_params)
            firewall_arn = response['Firewall']['FirewallArn']
            firewall_status = response['Firewall']['Status']
            
            return {
                'success': True,
                'firewall_arn': firewall_arn,
                'firewall_name': firewall_name,
                'firewall_status': firewall_status,
                'vpc_id': vpc_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_firewall_policy(self, policy_name, stateless_rule_groups=None,
                            stateful_rule_groups=None, tags=None):
        """Crear política de firewall"""
        
        try:
            policy_params = {
                'FirewallPolicyName': policy_name,
                'StatelessRuleGroupReferences': stateless_rule_groups or [],
                'StatefulRuleGroupReferences': stateful_rule_groups or [],
                'StatelessDefaultActions': ['aws:drop'],
                'StatelessFragmentDefaultActions': ['aws:drop'],
                'StatefulDefaultActions': ['aws:drop_established'],
                'StatefulEngineOptions': {
                    'RuleOrder': 'DEFAULT_ACTION_ORDER'
                }
            }
            
            if tags:
                policy_params['Tags'] = tags
            
            response = self.nfw.create_firewall_policy(**policy_params)
            policy_arn = response['FirewallPolicy']['FirewallPolicyArn']
            
            return {
                'success': True,
                'policy_arn': policy_arn,
                'policy_name': policy_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_stateful_rule_group(self, rule_group_name, capacity, rules,
                                 rule_variables=None, tags=None):
        """Crear grupo de reglas con estado"""
        
        try:
            rule_group_params = {
                'RuleGroupName': rule_group_name,
                'Capacity': capacity,
                'Rules': rules,
                'RuleVariables': rule_variables or {},
                'Type': 'STATEFUL'
            }
            
            if tags:
                rule_group_params['Tags'] = tags
            
            response = self.nfw.create_rule_group(**rule_group_params)
            rule_group_arn = response['RuleGroup']['RuleGroupArn']
            
            return {
                'success': True,
                'rule_group_arn': rule_group_arn,
                'rule_group_name': rule_group_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_stateless_rule_group(self, rule_group_name, capacity, rules,
                                   tags=None):
        """Crear grupo de reglas sin estado"""
        
        try:
            rule_group_params = {
                'RuleGroupName': rule_group_name,
                'Capacity': capacity,
                'Rules': rules,
                'Type': 'STATELESS'
            }
            
            if tags:
                rule_group_params['Tags'] = tags
            
            response = self.nfw.create_rule_group(**rule_group_params)
            rule_group_arn = response['RuleGroup']['RuleGroupArn']
            
            return {
                'success': True,
                'rule_group_arn': rule_group_arn,
                'rule_group_name': rule_group_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_web_security_firewall(self, project_name, environment, vpc_id, subnets):
        """Crear firewall para seguridad web"""
        
        try:
            firewall_setup = {
                'rule_groups': {},
                'policy': {},
                'firewall': {}
            }
            
            # 1. Crear grupo de reglas con estado para seguridad web
            stateful_rules = self._get_web_security_stateful_rules()
            
            stateful_group_result = self.create_stateful_rule_group(
                rule_group_name=f'{project_name}-{environment}-web-stateful',
                capacity=100,
                rules=stateful_rules,
                tags=[
                    {'Key': 'Project', 'Value': project_name},
                    {'Key': 'Environment', 'Value': environment},
                    {'Key': 'Type', 'Value': 'WebSecurity'}
                ]
            )
            
            if stateful_group_result['success']:
                firewall_setup['rule_groups']['stateful'] = stateful_group_result
            
            # 2. Crear grupo de reglas sin estado para bloqueo básico
            stateless_rules = self._get_web_security_stateless_rules()
            
            stateless_group_result = self.create_stateless_rule_group(
                rule_group_name=f'{project_name}-{environment}-web-stateless',
                capacity=50,
                rules=stateless_rules,
                tags=[
                    {'Key': 'Project', 'Value': project_name},
                    {'Key': 'Environment', 'Value': environment},
                    {'Key': 'Type', 'Value': 'WebSecurity'}
                ]
            )
            
            if stateless_group_result['success']:
                firewall_setup['rule_groups']['stateless'] = stateless_group_result
            
            # 3. Crear política de firewall
            if stateful_group_result['success'] and stateless_group_result['success']:
                policy_result = self.create_firewall_policy(
                    policy_name=f'{project_name}-{environment}-web-policy',
                    stateless_rule_groups=[
                        {
                            'ResourceArn': stateless_group_result['rule_group_arn'],
                            'Priority': 1
                        }
                    ],
                    stateful_rule_groups=[
                        {
                            'ResourceArn': stateful_group_result['rule_group_arn'],
                            'Priority': 1
                        }
                    ],
                    tags=[
                        {'Key': 'Project', 'Value': project_name},
                        {'Key': 'Environment', 'Value': environment}
                    ]
                )
                
                if policy_result['success']:
                    firewall_setup['policy'] = policy_result
                    
                    # 4. Crear firewall
                    subnet_mapping = []
                    for subnet_id in subnets:
                        subnet_mapping.append({'SubnetId': subnet_id})
                    
                    firewall_result = self.create_network_firewall(
                        firewall_name=f'{project_name}-{environment}-firewall',
                        vpc_id=vpc_id,
                        subnet_mapping=subnet_mapping,
                        firewall_policy_arn=policy_result['policy_arn'],
                        tags=[
                            {'Key': 'Project', 'Value': project_name},
                            {'Key': 'Environment', 'Value': environment}
                        ]
                    )
                    
                    if firewall_result['success']:
                        firewall_setup['firewall'] = firewall_result
                        
                        # 5. Configurar logging
                        logging_result = self._setup_firewall_logging(
                            firewall_result['firewall_name'],
                            project_name,
                            environment
                        )
                        
                        firewall_setup['logging'] = logging_result
            
            return {
                'success': True,
                'firewall_setup': firewall_setup
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_web_security_stateful_rules(self):
        """Obtener reglas con estado para seguridad web"""
        
        rules = """
# Allow established connections
pass any any -> any any (established;)

# Allow HTTP/HTTPS outbound
pass tcp $HOME_NET any -> $EXTERNAL_NET 80 (msg:"Allow HTTP outbound"; sid:1000001; rev:1;)
pass tcp $HOME_NET any -> $EXTERNAL_NET 443 (msg:"Allow HTTPS outbound"; sid:1000002; rev:1;)

# Allow DNS
pass udp $HOME_NET any -> $EXTERNAL_NET 53 (msg:"Allow DNS"; sid:1000003; rev:1;)

# Allow HTTP/HTTPS inbound to web servers
pass tcp $EXTERNAL_NET any -> $HOME_NET 80 (msg:"Allow HTTP inbound"; sid:1000004; rev:1;)
pass tcp $EXTERNAL_NET any -> $HOME_NET 443 (msg:"Allow HTTPS inbound"; sid:1000005; rev:1;)

# Block known malicious domains
drop ip any any -> any any (msg:"Block malicious domains"; flow:established; content:"malicious-site.com"; sid:2000001; rev:1;)

# Block suspicious traffic patterns
alert tcp any any -> $HOME_NET 22 (msg:"SSH connection detected"; flow:established; sid:3000001; rev:1;)
alert tcp any any -> $HOME_NET 3389 (msg:"RDP connection detected"; flow:established; sid:3000002; rev:1;)

# Drop invalid packets
drop ip any any -> any any (msg:"Drop invalid packets"; ip_proto:0; sid:4000001; rev:1;)
"""
        
        return rules
    
    def _get_web_security_stateless_rules(self):
        """Obtener reglas sin estado para seguridad web"""
        
        rules = [
            {
                'RuleDefinition': {
                    'MatchAttributes': {
                        'Sources': [{'AddressDefinition': '0.0.0.0/0'}],
                        'Destinations': [{'AddressDefinition': '0.0.0.0/0'}],
                        'SourcePorts': [],
                        'DestinationPorts': [{'PortRange': {'FromPort': 80, 'ToPort': 80}}],
                        'Protocols': [6],  # TCP
                        'TCPFlags': []
                    },
                    'Actions': ['aws:allow'],
                    'Priority': 1
                }
            },
            {
                'RuleDefinition': {
                    'MatchAttributes': {
                        'Sources': [{'AddressDefinition': '0.0.0.0/0'}],
                        'Destinations': [{'AddressDefinition': '0.0.0.0/0'}],
                        'SourcePorts': [],
                        'DestinationPorts': [{'PortRange': {'FromPort': 443, 'ToPort': 443}}],
                        'Protocols': [6],  # TCP
                        'TCPFlags': []
                    },
                    'Actions': ['aws:allow'],
                    'Priority': 2
                }
            },
            {
                'RuleDefinition': {
                    'MatchAttributes': {
                        'Sources': [{'AddressDefinition': '0.0.0.0/0'}],
                        'Destinations': [{'AddressDefinition': '0.0.0.0/0'}],
                        'SourcePorts': [],
                        'DestinationPorts': [{'PortRange': {'FromPort': 53, 'ToPort': 53}}],
                        'Protocols': [17],  # UDP
                        'TCPFlags': []
                    },
                    'Actions': ['aws:allow'],
                    'Priority': 3
                }
            },
            {
                'RuleDefinition': {
                    'MatchAttributes': {
                        'Sources': [{'AddressDefinition': '0.0.0.0/0'}],
                        'Destinations': [{'AddressDefinition': '0.0.0.0/0'}],
                        'SourcePorts': [],
                        'DestinationPorts': [{'PortRange': {'FromPort': 22, 'ToPort': 22}}],
                        'Protocols': [6],  # TCP
                        'TCPFlags': []
                    },
                    'Actions': ['aws:alert'],
                    'Priority': 4
                }
            },
            {
                'RuleDefinition': {
                    'MatchAttributes': {
                        'Sources': [{'AddressDefinition': '0.0.0.0/0'}],
                        'Destinations': [{'AddressDefinition': '0.0.0.0/0'}],
                        'SourcePorts': [],
                        'DestinationPorts': [{'PortRange': {'FromPort': 3389, 'ToPort': 3389}}],
                        'Protocols': [6],  # TCP
                        'TCPFlags': []
                    },
                    'Actions': ['aws:alert'],
                    'Priority': 5
                }
            }
        ]
        
        return rules
    
    def _setup_firewall_logging(self, firewall_name, project_name, environment):
        """Configurar logging para firewall"""
        
        try:
            # Crear log groups
            log_groups = [
                f'/aws/network-firewall/{firewall_name}/alert',
                f'/aws/network-firewall/{firewall_name}/flow',
                f'/aws/network-firewall/{firewall_name}/log'
            ]
            
            created_log_groups = []
            
            for log_group_name in log_groups:
                try:
                    self.logs.create_log_group(
                        logGroupName=log_group_name,
                        tags=[
                            {'Key': 'Project', 'Value': project_name},
                            {'Key': 'Environment', 'Value': environment},
                            {'Key': 'Service', 'Value': 'NetworkFirewall'}
                        ]
                    )
                    
                    # Configurar retención
                    retention_days = 30
                    self.logs.put_retention_policy(
                        logGroupName=log_group_name,
                        retentionInDays=retention_days
                    )
                    
                    created_log_groups.append({
                        'name': log_group_name,
                        'retention_days': retention_days
                    })
                    
                except Exception:
                    pass  # Log group might already exist
            
            # Configurar logging de firewall
            logging_configuration = {
                'LogDestinationConfig': [
                    {
                        'LogType': 'ALERT',
                        'LogDestinationType': 'CloudWatchLogs',
                        'LogDestination': {
                            'LogGroup': f'/aws/network-firewall/{firewall_name}/alert'
                        }
                    },
                    {
                        'LogType': 'FLOW',
                        'LogDestinationType': 'CloudWatchLogs',
                        'LogDestination': {
                            'LogGroup': f'/aws/network-firewall/{firewall_name}/flow'
                        }
                    }
                ],
                'OverrideExistingConfig': True
            }
            
            try:
                self.nfw.update_logging_configuration(
                    FirewallName=firewall_name,
                    LoggingConfiguration=logging_configuration
                )
            except Exception:
                pass
            
            return {
                'success': True,
                'log_groups': created_log_groups,
                'logging_configured': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_firewall_policy(self, policy_name, stateless_rule_groups=None,
                             stateful_rule_groups=None):
        """Actualizar política de firewall"""
        
        try:
            update_params = {
                'UpdateToken': str(int(datetime.utcnow().timestamp())),
                'FirewallPolicyName': policy_name
            }
            
            if stateless_rule_groups:
                update_params['StatelessRuleGroupReferences'] = stateless_rule_groups
            
            if stateful_rule_groups:
                update_params['StatefulRuleGroupReferences'] = stateful_rule_groups
            
            response = self.nfw.update_firewall_policy(**update_params)
            update_token = response['UpdateToken']
            
            return {
                'success': True,
                'update_token': update_token,
                'policy_name': policy_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_firewall(self, firewall_name):
        """Describir firewall"""
        
        try:
            response = self.nfw.describe_firewall(FirewallName=firewall_name)
            firewall = response['Firewall']
            
            firewall_info = {
                'firewall_name': firewall['FirewallName'],
                'firewall_arn': firewall['FirewallArn'],
                'firewall_policy_arn': firewall['FirewallPolicyArn'],
                'vpc_id': firewall['VpcId'],
                'subnet_mappings': firewall['SubnetMappings'],
                'status': firewall['Status'],
                'status_message': firewall.get('StatusMessage', ''),
                'tags': firewall.get('Tags', []),
                'delete_protection': firewall.get('DeleteProtection', False),
                'subnet_change_protection': firewall.get('SubnetChangeProtection', False),
                'firewall_policy_change_protection': firewall.get('FirewallPolicyChangeProtection', False)
            }
            
            return {
                'success': True,
                'firewall': firewall_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_firewalls(self, max_results=100, next_token=None):
        """Listar firewalls"""
        
        try:
            params = {'MaxResults': max_results}
            if next_token:
                params['NextToken'] = next_token
            
            response = self.nfw.list_firewalls(**params)
            
            firewalls = []
            for firewall in response['Firewalls']:
                firewall_info = {
                    'firewall_name': firewall['FirewallName'],
                    'firewall_arn': firewall['FirewallArn'],
                    'vpc_id': firewall['VpcId'],
                    'status': firewall['Status']
                }
                firewalls.append(firewall_info)
            
            return {
                'success': True,
                'firewalls': firewalls,
                'count': len(firewalls),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_firewall_rules(self, firewall_name):
        """Analizar reglas de firewall"""
        
        try:
            # Obtener información del firewall
            firewall_response = self.describe_firewall(firewall_name)
            
            if not firewall_response['success']:
                return firewall_response
            
            firewall = firewall_response['firewall']
            policy_arn = firewall['firewall_policy_arn']
            
            # Obtener información de la política
            policy_response = self.nfw.describe_firewall_policy(
                FirewallPolicyArn=policy_arn
            )
            
            policy = policy_response['FirewallPolicy']
            
            analysis = {
                'firewall_name': firewall_name,
                'policy_arn': policy_arn,
                'stateful_rules_count': len(policy.get('StatefulRuleGroupReferences', [])),
                'stateless_rules_count': len(policy.get('StatelessRuleGroupReferences', [])),
                'rule_groups': [],
                'security_analysis': {
                    'allow_rules': 0,
                    'drop_rules': 0,
                    'alert_rules': 0,
                    'wide_open_rules': 0,
                    'risk_level': 'low'
                }
            }
            
            # Analizar grupos de reglas
            all_rule_groups = []
            
            # Agregar grupos de reglas con estado
            for stateful_ref in policy.get('StatefulRuleGroupReferences', []):
                try:
                    rule_group_response = self.nfw.describe_rule_group(
                        RuleGroupArn=stateful_ref['ResourceArn'],
                        Type='STATEFUL'
                    )
                    
                    rule_group = rule_group_response['RuleGroup']
                    analysis['rule_groups'].append({
                        'name': rule_group['RuleGroupName'],
                        'arn': rule_group['RuleGroupArn'],
                        'type': 'STATEFUL',
                        'capacity': rule_group['Capacity'],
                        'priority': stateful_ref.get('Priority', 1)
                    })
                    
                except Exception:
                    pass
            
            # Agregar grupos de reglas sin estado
            for stateless_ref in policy.get('StatelessRuleGroupReferences', []):
                try:
                    rule_group_response = self.nfw.describe_rule_group(
                        RuleGroupArn=stateless_ref['ResourceArn'],
                        Type='STATELESS'
                    )
                    
                    rule_group = rule_group_response['RuleGroup']
                    analysis['rule_groups'].append({
                        'name': rule_group['RuleGroupName'],
                        'arn': rule_group['RuleGroupArn'],
                        'type': 'STATELESS',
                        'capacity': rule_group['Capacity'],
                        'priority': stateless_ref.get('Priority', 1)
                    })
                    
                    # Analizar reglas sin estado para seguridad
                    if 'RulesSource' in rule_group and 'StatelessRules' in rule_group['RulesSource']:
                        for rule in rule_group['RulesSource']['StatelessRules']:
                            for action in rule.get('Actions', []):
                                if action == 'aws:allow':
                                    analysis['security_analysis']['allow_rules'] += 1
                                elif action == 'aws:drop':
                                    analysis['security_analysis']['drop_rules'] += 1
                                elif action == 'aws:alert':
                                    analysis['security_analysis']['alert_rules'] += 1
                    
                except Exception:
                    pass
            
            # Calcular nivel de riesgo
            if analysis['security_analysis']['allow_rules'] > 10:
                analysis['security_analysis']['risk_level'] = 'medium'
            if analysis['security_analysis']['allow_rules'] > 20:
                analysis['security_analysis']['risk_level'] = 'high'
            
            return {
                'success': True,
                'analysis': analysis
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_firewall(self, firewall_name):
        """Eliminar firewall"""
        
        try:
            # Primero eliminar logging configuration
            try:
                self.nfw.update_logging_configuration(
                    FirewallName=firewall_name,
                    LoggingConfiguration={'LogDestinationConfig': []}
                )
            except Exception:
                pass
            
            # Eliminar firewall
            self.nfw.delete_firewall(FirewallName=firewall_name)
            
            return {
                'success': True,
                'firewall_name': firewall_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_domain_filter_rule_group(self, rule_group_name, domains, action='DROP'):
        """Crear grupo de reglas de filtrado de dominios"""
        
        try:
            # Crear variables de regla para dominios
            rule_variables = {
                'HOME_NET': '10.0.0.0/8',
                'EXTERNAL_NET': '!10.0.0.0/8'
            }
            
            # Crear regla para bloquear dominios
            rules = f"""
# Block specified domains
drop ip any any -> any any (msg:"Block malicious domains"; flow:established; content:"{domains[0]}"; sid:2000001; rev:1;)
"""
            
            # Agregar más dominios si existen
            for i, domain in enumerate(domains[1:], 2):
                rules += f'\ndrop ip any any -> any any (msg:"Block malicious domain {i}"; flow:established; content:"{domain}"; sid:200000{i:04d}; rev:1;)'
            
            result = self.create_stateful_rule_group(
                rule_group_name=rule_group_name,
                capacity=50,
                rules=rules,
                rule_variables=rule_variables,
                tags=[
                    {'Key': 'Type', 'Value': 'DomainFilter'},
                    {'Key': 'Action', 'Value': action}
                ]
            )
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_firewall_metrics(self, firewall_name, start_time, end_time):
        """Obtener métricas de firewall"""
        
        try:
            cloudwatch = boto3.client('cloudwatch', region_name=self.region)
            
            metrics = {
                'processed_packets': 0,
                'dropped_packets': 0,
                'alert_packets': 0,
                'bytes_processed': 0
            }
            
            # Métricas de paquetes procesados
            try:
                response = cloudwatch.get_metric_statistics(
                    Namespace='AWS/NetworkFirewall',
                    MetricName='ProcessedPackets',
                    Dimensions=[
                        {'Name': 'FirewallName', 'Value': firewall_name}
                    ],
                    StartTime=start_time,
                    EndTime=end_time,
                    Period=300,
                    Statistics=['Sum']
                )
                
                if response['Datapoints']:
                    metrics['processed_packets'] = sum(dp['Sum'] for dp in response['Datapoints'])
                
            except Exception:
                pass
            
            # Métricas de paquetes descartados
            try:
                response = cloudwatch.get_metric_statistics(
                    Namespace='AWS/NetworkFirewall',
                    MetricName='DroppedPackets',
                    Dimensions=[
                        {'Name': 'FirewallName', 'Value': firewall_name}
                    ],
                    StartTime=start_time,
                    EndTime=end_time,
                    Period=300,
                    Statistics=['Sum']
                )
                
                if response['Datapoints']:
                    metrics['dropped_packets'] = sum(dp['Sum'] for dp in response['Datapoints'])
                
            except Exception:
                pass
            
            # Métricas de alertas
            try:
                response = cloudwatch.get_metric_statistics(
                    Namespace='AWS/NetworkFirewall',
                    MetricName='AlertPackets',
                    Dimensions=[
                        {'Name': 'FirewallName', 'Value': firewall_name}
                    ],
                    StartTime=start_time,
                    EndTime=end_time,
                    Period=300,
                    Statistics=['Sum']
                )
                
                if response['Datapoints']:
                    metrics['alert_packets'] = sum(dp['Sum'] for dp in response['Datapoints'])
                
            except Exception:
                pass
            
            return {
                'success': True,
                'metrics': metrics,
                'time_period': {
                    'start_time': start_time.isoformat(),
                    'end_time': end_time.isoformat()
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Crear Firewall para Seguridad Web**
```python
# Ejemplo: Crear firewall para seguridad web
manager = NetworkFirewallManager('us-east-1')

# Configuración
project_name = 'secureapp'
environment = 'production'
vpc_id = 'vpc-1234567890abcdef0'
subnets = ['subnet-11111111111111111', 'subnet-22222222222222222']

# Crear firewall
firewall_result = manager.create_web_security_firewall(
    project_name=project_name,
    environment=environment,
    vpc_id=vpc_id,
    subnets=subnets
)

if firewall_result['success']:
    setup = firewall_result['firewall_setup']
    print(f"Firewall created: {setup['firewall']['firewall_name']}")
    print(f"Policy: {setup['policy']['policy_name']}")
    print(f"Stateful Rule Group: {setup['rule_groups']['stateful']['rule_group_name']}")
    print(f"Stateless Rule Group: {setup['rule_groups']['stateless']['rule_group_name']}")
```

### **2. Analizar Configuración de Firewall**
```python
# Ejemplo: Analizar reglas de firewall
analysis_result = manager.analyze_firewall_rules('secureapp-production-firewall')

if analysis_result['success']:
    analysis = analysis_result['analysis']
    print(f"Firewall: {analysis['firewall_name']}")
    print(f"Stateful Rules: {analysis['stateful_rules_count']}")
    print(f"Stateless Rules: {analysis['stateless_rules_count']}")
    print(f"Risk Level: {analysis['security_analysis']['risk_level']}")
    print(f"Rule Groups: {len(analysis['rule_groups'])}")
```

### **3. Crear Filtro de Dominios**
```python
# Ejemplo: Crear filtro de dominios maliciosos
malicious_domains = [
    'malicious-site.com',
    'phishing-domain.net',
    'malware-host.org'
]

domain_filter_result = manager.create_domain_filter_rule_group(
    rule_group_name='malicious-domains-filter',
    domains=malicious_domains,
    action='DROP'
)

if domain_filter_result['success']:
    print(f"Domain filter created: {domain_filter_result['rule_group_name']}")
```

## Configuración con AWS CLI

### **Crear y Gestionar Network Firewall**
```bash
# Crear grupo de reglas con estado
aws network-firewall create-rule-group \
  --rule-group-name my-stateful-rules \
  --capacity 100 \
  --type STATEFUL \
  --rules file://stateful-rules.txt \
  --tags Key=Project,Value=myapp

# Crear grupo de reglas sin estado
aws network-firewall create-rule-group \
  --rule-group-name my-stateless-rules \
  --capacity 50 \
  --type STATELESS \
  --rules file://stateless-rules.json

# Crear política de firewall
aws network-firewall create-firewall-policy \
  --firewall-policy-name my-policy \
  --stateful-rule-group-references ResourceArn=arn:aws:network-firewall:us-east-1:123456789012:rulegroup/my-stateful-rules,Priority=1 \
  --stateless-rule-group-references ResourceArn=arn:aws:network-firewall:us-east-1:123456789012:rulegroup/my-stateless-rules,Priority=1

# Crear firewall
aws network-firewall create-firewall \
  --firewall-name my-firewall \
  --firewall-policy-arn arn:aws:network-firewall:us-east-1:123456789012:firewallpolicy/my-policy \
  --vpc-id vpc-1234567890abcdef0 \
  --subnet-mappings SubnetId=subnet-11111111111111111 SubnetId=subnet-22222222222222222

# Configurar logging
aws network-firewall update-logging-configuration \
  --firewall-name my-firewall \
  --logging-configuration 'LogDestinationConfig=[{LogType=ALERT,LogDestinationType=CloudWatchLogs,LogDestination={LogGroup=/aws/network-firewall/my-firewall/alert}}]'
```

## Best Practices

### **1. Diseño de Reglas**
- Usar principio de menor privilegio
- Implementar defensa en profundidad
- Priorizar reglas específicas sobre generales
- Documentar propósito de cada regla

### **2. Gestión de Recursos**
- Monitorear capacidad de rule groups
- Planificar escalabilidad
- Usar tags para organización
- Implementar versionado de políticas

### **3. Monitoreo**
- Habilitar logging completo
- Configurar alertas críticas
- Analizar métricas regularmente
- Revisar logs de seguridad

### **4. Seguridad**
- Actualizar firmas regularmente
- Revisar reglas periódicamente
- Implementar pruebas de penetración
- Mantener documentación actualizada

## Costos

### **Network Firewall Pricing**
- **Endpoints**: $0.395 por hora por endpoint
- **Data Processing**: $0.075 por GB procesado
- **Rule Groups**: $0.10 por hora por rule group
- **Logging**: Costos estándar de CloudWatch Logs

### **Ejemplo de Costos Mensuales**
- **2 endpoints**: $0.395 × 24 × 30 × 2 = $568.80
- **10 GB procesados**: 10 × $0.075 = $0.75
- **2 rule groups**: $0.10 × 24 × 30 × 2 = $144.00
- **Total estimado**: ~$713.55 por mes

## Troubleshooting

### **Problemas Comunes**
1. **Firewall no procesa tráfico**: Verificar configuración de subnets
2. **Reglas no aplican**: Revisar prioridad y sintaxis
3. **Logging no funciona**: Validar permisos y configuración
4. **Alto latency**: Revisar capacidad y configuración

### **Comandos de Diagnóstico**
```bash
# Verificar estado del firewall
aws network-firewall describe-firewall --firewall-name my-firewall

# Verificar métricas
aws cloudwatch get-metric-statistics \
  --namespace AWS/NetworkFirewall \
  --metric-name ProcessedPackets \
  --dimensions Name=FirewallName,Value=my-firewall

# Verificar logs
aws logs describe-log-groups --log-group-name-prefix /aws/network-firewall/

# Test de conectividad
telnet target-ip port
```

## Diferencias con Otros Servicios

| Servicio | Nivel | Estado | Casos de Uso |
|----------|-------|--------|--------------|
| **Network Firewall** | VPC | Stateful/Stateless | Tráfico complejo, inspección profunda |
| **Security Groups** | Instancia | Stateful | Control básico a nivel de instancia |
| **Network ACLs** | Subnet | Stateless | Control simple a nivel de subnet |
| **WAF** | Application | Stateful | Protección a nivel de aplicación |

# AWS WAF & Shield

## Definición

AWS WAF (Web Application Firewall) y AWS Shield son servicios de seguridad que trabajan juntos para proteger aplicaciones web contra diversas amenazas. WAF protege contra ataques a nivel de aplicación (Layer 7), mientras que Shield proporciona protección contra ataques DDoS (Layer 3/4).

## AWS WAF

### **Características Principales**
- **Protección Layer 7**: Contra ataques de aplicación web
- **Reglas personalizables**: SQL injection, XSS, rate limiting
- **Reglas administradas**: Mantenidas por AWS Marketplace
- **Bot Control**: Protección contra bots maliciosos
- **API Protection**: Para APIs REST y GraphQL
- **Real-time monitoring**: Métricas y alertas en tiempo real

### **Componentes de WAF**
```
Web ACL (Access Control List)
├── Rules (Reglas)
│   ├── Statements (Declaraciones)
│   ├── Actions (Acciones)
│   └── Override (Anulaciones)
├── Default Action (Acción por defecto)
└── Visibility Config (Configuración de visibilidad)
```

### **Tipos de Reglas WAF**
- **Rate-based**: Limitar frecuencia de requests
- **IP sets**: Bloquear/permitir IPs específicas
- **SQL injection**: Detectar inyecciones SQL
- **XSS protection**: Detectar cross-site scripting
- **Size constraint**: Limitar tamaño de requests
- **Managed rules**: Reglas predefinidas de AWS

## AWS Shield

### **Shield Standard (Gratuito)**
- **Protección automática**: Para todos los servicios AWS
- **Mitigación básica**: SYN/UDP floods, reflection attacks
- **Monitoreo 24/7**: Detección automática de ataques
- **Sin configuración**: Activo por defecto

### **Shield Advanced (Pago)**
- **Protección mejorada**: Ataques sofisticados y persistentes
- **Soporte DRT**: AWS DDoS Response Team 24/7
- **Cost protection**: Protección contra picos de costos
- **Visibilidad avanzada**: Métricas detalladas y análisis
- **Respuesta automática**: Mitigación inteligente

## Configuración Completa

### **Gestión de WAF y Shield**
```python
import boto3
import json
from datetime import datetime, timedelta

class WAFShieldManager:
    def __init__(self, region='us-east-1'):
        self.waf = boto3.client('wafv2', region_name=region)
        self.shield = boto3.client('shield', region_name=region)
        self.cloudfront = boto3.client('cloudfront')
        self.region = region
    
    def create_comprehensive_web_acl(self, name, scope='CLOUDFRONT'):
        """Crear Web ACL con reglas comprehensivas"""
        
        try:
            # Regla 1: Rate Limiting
            rate_limit_rule = {
                'Name': 'RateLimitRule',
                'Priority': 1,
                'Statement': {
                    'RateBasedStatement': {
                        'Limit': 2000,
                        'AggregateKeyType': 'IP'
                    }
                },
                'Action': {'Block': {}},
                'VisibilityConfig': {
                    'SampledRequestsEnabled': True,
                    'CloudWatchMetricsEnabled': True,
                    'MetricName': 'RateLimitRule'
                }
            }
            
            # Regla 2: SQL Injection Protection
            sql_injection_rule = {
                'Name': 'SQLInjectionRule',
                'Priority': 2,
                'Statement': {
                    'OrStatement': {
                        'Statements': [
                            {
                                'SqlInjectionMatchStatement': {
                                    'FieldToMatch': {'Body': {}},
                                    'TextTransformations': [
                                        {'Priority': 0, 'Type': 'URL_DECODE'}
                                    ]
                                }
                            },
                            {
                                'SqlInjectionMatchStatement': {
                                    'FieldToMatch': {'QueryString': {}},
                                    'TextTransformations': [
                                        {'Priority': 0, 'Type': 'URL_DECODE'}
                                    ]
                                }
                            }
                        ]
                    }
                },
                'Action': {'Block': {}},
                'VisibilityConfig': {
                    'SampledRequestsEnabled': True,
                    'CloudWatchMetricsEnabled': True,
                    'MetricName': 'SQLInjectionRule'
                }
            }
            
            # Regla 3: XSS Protection
            xss_rule = {
                'Name': 'XSSProtectionRule',
                'Priority': 3,
                'Statement': {
                    'XssMatchStatement': {
                        'FieldToMatch': {'Body': {}},
                        'TextTransformations': [
                            {'Priority': 0, 'Type': 'URL_DECODE'},
                            {'Priority': 1, 'Type': 'HTML_ENTITY_DECODE'}
                        ]
                    }
                },
                'Action': {'Block': {}},
                'VisibilityConfig': {
                    'SampledRequestsEnabled': True,
                    'CloudWatchMetricsEnabled': True,
                    'MetricName': 'XSSProtectionRule'
                }
            }
            
            # Regla 4: Bad Bot Protection
            bot_rule = {
                'Name': 'BadBotRule',
                'Priority': 4,
                'Statement': {
                    'AndStatement': {
                        'Statements': [
                            {
                                'LabelMatchStatement': {
                                    'Scope': 'LABEL',
                                    'Key': 'awswaf:managed:aws:bot-control:bot:category:scrapers'
                                }
                            },
                            {
                                'LabelMatchStatement': {
                                    'Scope': 'LABEL',
                                    'Key': 'awswaf:managed:aws:bot-control:bot:category:scanners'
                                }
                            }
                        ]
                    }
                },
                'Action': {'Block': {}},
                'VisibilityConfig': {
                    'SampledRequestsEnabled': True,
                    'CloudWatchMetricsEnabled': True,
                    'MetricName': 'BadBotRule'
                }
            }
            
            # Regla 5: Size Constraint
            size_rule = {
                'Name': 'SizeConstraintRule',
                'Priority': 5,
                'Statement': {
                    'SizeConstraintStatement': {
                        'FieldToMatch': {'Body': {}},
                        'Comparison': 'GT',
                        'Size': 8192,  # 8KB
                        'TextTransformations': [
                            {'Priority': 0, 'Type': 'NONE'}
                        ]
                    }
                },
                'Action': {'Block': {}},
                'VisibilityConfig': {
                    'SampledRequestsEnabled': True,
                    'CloudWatchMetricsEnabled': True,
                    'MetricName': 'SizeConstraintRule'
                }
            }
            
            rules = [rate_limit_rule, sql_injection_rule, xss_rule, bot_rule, size_rule]
            
            response = self.waf.create_web_acl(
                Name=name,
                Scope=scope,
                DefaultAction={'Allow': {}},
                Rules=rules,
                VisibilityConfig={
                    'SampledRequestsEnabled': True,
                    'CloudWatchMetricsEnabled': True,
                    'MetricName': f'{name}-WebACL'
                },
                Tags=[
                    {'Key': 'Name', 'Value': name},
                    {'Key': 'Environment', 'Value': 'production'}
                ]
            )
            
            return {
                'success': True,
                'web_acl_id': response['Summary']['Id'],
                'web_acl_arn': response['Summary']['ARN'],
                'name': name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_managed_rule_group_statement(self, vendor_name, rule_group_name, 
                                          scope='CLOUDFRONT', version=None):
        """Crear statement para grupo de reglas administradas"""
        
        try:
            # Obtener información del grupo de reglas
            if not version:
                response = self.waf.list_available_managed_rule_groups(
                    Scope=scope,
                    VendorName=vendor_name
                )
                
                for group in response['ManagedRuleGroups']:
                    if group['Name'] == rule_group_name:
                        version = group['Version']
                        break
            
            statement = {
                'ManagedRuleGroupStatement': {
                    'VendorName': vendor_name,
                    'Name': rule_group_name,
                    'Version': version
                }
            }
            
            return {
                'success': True,
                'statement': statement
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_ip_set(self, name, ip_addresses, scope='CLOUDFRONT', 
                     ip_address_version='IPV4'):
        """Crear IP set para bloqueo/permiso de IPs"""
        
        try:
            response = self.waf.create_ip_set(
                Name=name,
                Scope=scope,
                IPAddressVersion=ip_address_version,
                Addresses=ip_addresses,
                Description=f'IP set for {name}'
            )
            
            return {
                'success': True,
                'ip_set_id': response['Summary']['Id'],
                'ip_set_arn': response['Summary']['ARN'],
                'name': name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_ip_set(self, ip_set_id, scope='CLOUDFRONT', 
                      ip_addresses=None, lock_token=None):
        """Actualizar IP set"""
        
        try:
            if not lock_token:
                # Obtener lock token
                response = self.waf.get_ip_set(
                    Name=ip_set_id,
                    Scope=scope,
                    Id=ip_set_id
                )
                lock_token = response['LockToken']
            
            update_params = {
                'Name': ip_set_id,
                'Scope': scope,
                'Id': ip_set_id,
                'LockToken': lock_token
            }
            
            if ip_addresses is not None:
                update_params['Addresses'] = ip_addresses
            
            self.waf.update_ip_set(**update_params)
            
            return {
                'success': True,
                'ip_set_id': ip_set_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_regex_pattern_set(self, name, regular_expressions, scope='CLOUDFRONT'):
        """Crear conjunto de patrones regex"""
        
        try:
            response = self.waf.create_regex_pattern_set(
                Name=name,
                Scope=scope,
                RegularExpressionList=[
                    {'RegexString': regex} for regex in regular_expressions
                ],
                Description=f'Regex pattern set for {name}'
            )
            
            return {
                'success': True,
                'regex_pattern_set_id': response['Summary']['Id'],
                'regex_pattern_set_arn': response['Summary']['ARN'],
                'name': name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def enable_shield_advanced_protection(self, resource_arn, 
                                        emergency_contacts=None):
        """Habilitar protección Shield Advanced"""
        
        try:
            # Crear suscripción
            response = self.shield.create_subscription(
                ResourceArn=resource_arn
            )
            
            # Crear contactos de emergencia si se especifican
            if emergency_contacts:
                for contact in emergency_contacts:
                    self.shield.create_emergency_contact(
                        EmailAddress=contact['email'],
                        PhoneNumber=contact.get('phone')
                    )
            
            return {
                'success': True,
                'subscription_arn': response['SubscriptionArn'],
                'resource_arn': resource_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def configure_shield_advanced_automatic_response(self, resource_arn, 
                                                   action_block=True):
        """Configurar respuesta automática de Shield Advanced"""
        
        try:
            self.shield.enable_application_layer_automatic_response(
                ResourceArn=resource_arn,
                Action={'Block': action_block}
            )
            
            return {
                'success': True,
                'resource_arn': resource_arn,
                'action_block': action_block
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def associate_web_acl_with_resource(self, web_acl_arn, resource_arn):
        **Asociar Web ACL a recurso**
        
        try:
            self.waf.associate_web_acl(
                WebACLArn=web_acl_arn,
                ResourceArn=resource_arn
            )
            
            return {
                'success': True,
                'web_acl_arn': web_acl_arn,
                'resource_arn': resource_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_web_acl_metrics(self, web_acl_arn, start_time, end_time):
        """Obtener métricas de Web ACL"""
        
        try:
            cloudwatch = boto3.client('cloudwatch')
            
            # Métricas principales
            metrics = [
                'AllowedRequests',
                'BlockedRequests',
                'CountedRequests',
                'PassedRequests'
            ]
            
            results = {}
            
            for metric in metrics:
                response = cloudwatch.get_metric_statistics(
                    Namespace='AWS/WAFV2',
                    MetricName=metric,
                    Dimensions=[
                        {
                            'Name': 'WebACL',
                            'Value': web_acl_arn.split('/')[-1]
                        }
                    ],
                    StartTime=start_time,
                    EndTime=end_time,
                    Period=3600,  # 1 hora
                    Statistics=['Sum']
                )
                
                results[metric] = response['Datapoints']
            
            return {
                'success': True,
                'metrics': results
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_attack_patterns(self, start_time, end_time):
        """Analizar patrones de ataque"""
        
        try:
            # Obtener ataques de Shield
            shield_attacks = self.shield.list_attacks(
                StartTime=start_time,
                EndTime=end_time
            )
            
            # Obtener métricas de WAF
            waf_metrics = {}
            
            attack_analysis = {
                'shield_attacks': shield_attacks.get('Attacks', []),
                'waf_blocked_requests': 0,
                'waf_allowed_requests': 0,
                'attack_sources': set(),
                'attack_types': set()
            }
            
            # Analizar ataques de Shield
            for attack in shield_attacks.get('Attacks', []):
                for counter in attack.get('AttackCounters', []):
                    if counter['Name'] == 'REQUESTS':
                        attack_analysis['attack_sources'].add(str(attack['ResourceArn']))
            
            return {
                'success': True,
                'analysis': attack_analysis
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Configuración Completa de Protección**
```python
# Ejemplo: Configurar protección completa
manager = WAFShieldManager('us-east-1')

# Crear Web ACL comprehensiva
web_acl_result = manager.create_comprehensive_web_acl(
    name='production-web-acl',
    scope='CLOUDFRONT'
)

if web_acl_result['success']:
    web_acl_arn = web_acl_result['web_acl_arn']
    
    # Crear IP set para IPs bloqueadas
    blocked_ips = [
        '192.0.2.0/24',
        '203.0.113.0/24',
        '198.51.100.0/24'
    ]
    
    ip_set_result = manager.create_ip_set(
        name='blocked-ips',
        ip_addresses=blocked_ips
    )
    
    # Habilitar Shield Advanced
    distribution_arn = 'arn:aws:cloudfront::123456789012:distribution/E1234567890ABC'
    shield_result = manager.enable_shield_advanced_protection(
        resource_arn=distribution_arn,
        emergency_contacts=[
            {'email': 'security@company.com', 'phone': '+1234567890'}
        ]
    )
    
    if shield_result['success']:
        # Configurar respuesta automática
        auto_response_result = manager.configure_shield_advanced_automatic_response(
            resource_arn=distribution_arn,
            action_block=True
        )
        
        # Asociar Web ACL a distribución
        association_result = manager.associate_web_acl_with_resource(
            web_acl_arn=web_acl_arn,
            resource_arn=distribution_arn
        )
        
        print("Complete protection configured successfully")
```

### **2. Análisis de Ataques y Métricas**
```python
# Ejemplo: Analizar ataques recientes
end_time = datetime.utcnow()
start_time = end_time - timedelta(days=7)

# Analizar patrones de ataque
analysis_result = manager.analyze_attack_patterns(start_time, end_time)

if analysis_result['success']:
    analysis = analysis_result['analysis']
    print(f"Shield attacks detected: {len(analysis['shield_attacks'])}")
    print(f"Attack sources: {len(analysis['attack_sources'])}")

# Obtener métricas de Web ACL
metrics_result = manager.get_web_acl_metrics(
    web_acl_arn='arn:aws:wafv2:us-east-1:123456789012:global/webacl/production-web-acl/12345678-1234-1234-1234-123456789012',
    start_time=start_time,
    end_time=end_time
)

if metrics_result['success']:
    metrics = metrics_result['metrics']
    for metric_name, datapoints in metrics.items():
        if datapoints:
            total = sum(dp['Sum'] for dp in datapoints)
            print(f"{metric_name}: {total} requests")
```

## Configuración con AWS CLI

### **WAF Configuration**
```bash
# Crear Web ACL
aws wafv2 create-web-acl \
  --name production-web-acl \
  --scope CLOUDFRONT \
  --default-action Allow={} \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=production-web-acl \
  --rules file://rules.json

# Crear IP set
aws wafv2 create-ip-set \
  --name blocked-ips \
  --scope CLOUDFRONT \
  --ip-address-version IPV4 \
  --addresses 192.0.2.0/24 203.0.113.0/24

# Asociar Web ACL
aws wafv2 associate-web-acl \
  --web-acl-arn arn:aws:wafv2:us-east-1:123456789012:global/webacl/production-web-acl/12345678-1234-1234-1234-123456789012 \
  --resource-arn arn:aws:cloudfront::123456789012:distribution/E1234567890ABC
```

### **Shield Configuration**
```bash
# Habilitar Shield Advanced
aws shield create-subscription \
  --resource-arn arn:aws:cloudfront::123456789012:distribution/E1234567890ABC

# Crear contacto de emergencia
aws shield create-emergency-contact \
  --email-address security@company.com \
  --phone-number +1234567890

# Habilitar respuesta automática
aws shield enable-application-layer-automatic-response \
  --resource-arn arn:aws:cloudfront::123456789012:distribution/E1234567890ABC \
  --action Block={}
```

## Best Practices

### **1. Arquitectura de Seguridad**
- Implementar defensa en profundidad
- Usar múltiples capas de protección
- Configurar monitoreo continuo
- Documentar procedimientos de respuesta

### **2. Configuración de WAF**
- Usar reglas administradas cuando sea posible
- Personalizar reglas según aplicación
- Implementar rate limiting apropiado
- Configurar logging y monitoreo

### **3. Shield Advanced**
- Habilitar para recursos críticos
- Configurar contactos de emergencia
- Implementar cost protection
- Revisar configuración regularmente

### **4. Monitoreo y Respuesta**
- Configurar alertas de CloudWatch
- Analizar patrones de ataque
- Realizar pruebas de penetración
- Tener plan de respuesta a incidentes

## Costos

### **WAF Pricing**
- **$5.00 por Web ACL**: Por mes
- **$1.00 por regla**: Por mes
- **$0.60 por millón de requests**: Cargos de procesamiento
- **Reglas administradas**: Precios variables ($0.10-$1.00 por millón)

### **Shield Advanced**
- **$3,000 por mes**: Por suscripción
- **$39 por GB**: Datos mitigados durante ataques
- **Protección extendida**: Contra ataques sofisticados
- **Soporte DRT**: Incluido durante ataques

## Troubleshooting

### **Problemas Comunes**
1. **WAF bloqueando tráfico legítimo**: Revisar reglas y configuración
2. **Shield no activa**: Verificar tipo de recurso soportado
3. **Costos inesperados**: Monitorear uso durante ataques
4. **Latencia aumentada**: Optimizar configuración de WAF

### **Comandos de Diagnóstico**
```bash
# Verificar Web ACL
aws wafv2 get-web-acl \
  --name production-web-acl \
  --scope CLOUDFRONT \
  --id 12345678-1234-1234-1234-123456789012

# Verificar estado de Shield
aws shield describe-protection \
  --resource-arn arn:aws:cloudfront::123456789012:distribution/E1234567890ABC

# Verificar métricas
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name BlockedRequests \
  --dimensions Name=WebACL,Value=production-web-acl \
  --start-time 2023-01-01T00:00:00Z \
  --end-time 2023-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

## Monitoreo

### **Métricas CloudWatch**
- AWS/WAFV2: AllowedRequests, BlockedRequests
- AWS/DDoSProtection: DDoSDetected, RequestCount
- AWS/CloudFront: ErrorRate, Latency

### **Alarmas Recomendadas**
- High blocked requests rate
- DDoS attack detected
- WAF rule exceeded limits
- Increased error rate

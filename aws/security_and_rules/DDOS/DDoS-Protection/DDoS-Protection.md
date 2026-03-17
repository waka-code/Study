# AWS DDoS Protection

## Definición

AWS DDoS Protection es un conjunto de servicios diseñados para proteger aplicaciones y redes contra ataques de denegación de servicio distribuido (DDoS). Estos servicios proporcionan protección automática y escalable contra múltiples tipos de ataques DDoS, asegurando la disponibilidad y accesibilidad de las aplicaciones.

## Servicios de Protección DDoS

### **1. AWS Shield**
- **Shield Standard**: Protección automática y gratuita para todos los clientes AWS
- **Shield Advanced**: Protección mejorada con costos adicionales y características avanzadas

### **2. AWS WAF**
- Firewall de aplicaciones web
- Protección contra ataques a nivel de aplicación (Layer 7)
- Reglas personalizables y administradas

### **3. Amazon CloudFront**
- CDN con capacidades de mitigación DDoS
- Distribución global de contenido
- Caching para reducir carga en origen

### **4. AWS Global Accelerator**
- Mejora el rendimiento y disponibilidad
- Protección contra ataques de red (Layer 3/4)
- Enrutamiento inteligente del tráfico

## AWS Shield

### **Shield Standard (Gratuito)**
- **Protección automática** para todos los recursos AWS
- **Mitigación de ataques comunes**: SYN/UDP floods, reflection attacks
- **Monitoreo continuo** 24/7
- **Integración automática** con CloudWatch
- **Sin configuración requerida**

### **Shield Advanced ($3,000/mes + $39/GB)**
- **Protección mejorada** contra ataques sofisticados
- **Soporte 24/7** del AWS DRT (DDoS Response Team)
- **Cost protection**: Protección contra picos de costos por ataques
- **Visibilidad avanzada**: Métricas detalladas y alertas
- **Protección personalizada**: Reglas adaptativas

## Configuración de Shield Advanced

### **Gestión de Shield Advanced**
```python
import boto3
import json
from datetime import datetime, timedelta

class DDoSProtectionManager:
    def __init__(self, region='us-east-1'):
        self.shield = boto3.client('shield', region_name=region)
        self.waf = boto3.client('wafv2', region_name=region)
        self.cloudfront = boto3.client('cloudfront')
        self.region = region
    
    def enable_shield_advanced(self, resource_arn, subscription_duration_months=12):
        """Habilitar Shield Advanced para un recurso"""
        
        try:
            response = self.shield.create_subscription(
                ResourceArn=resource_arn,
                SubscriptionDurationMonths=subscription_duration_months
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
    
    def create_protection(self, resource_arn, resource_name=None):
        """Crear protección para un recurso"""
        
        try:
            protection_params = {
                'ResourceArn': resource_arn
            }
            
            if resource_name:
                protection_params['Name'] = resource_name
            
            response = self.shield.create_protection(**protection_params)
            protection_id = response['ProtectionId']
            
            return {
                'success': True,
                'protection_id': protection_id,
                'resource_arn': resource_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_protection(self, resource_arn):
        """Obtener detalles de protección"""
        
        try:
            response = self.shield.describe_protection(ResourceArn=resource_arn)
            
            protection_info = {
                'protection_id': response['Protection']['Id'],
                'resource_arn': response['Protection']['ResourceArn'],
                'protection_name': response['Protection'].get('Name'),
                'health_check_arn': response['Protection'].get('HealthCheckArn'),
                'application_layer_automatic_response_configuration': response['Protection'].get('ApplicationLayerAutomaticResponseConfiguration', {}),
                'protection_status': response['Protection']['ProtectionStatus']
            }
            
            return {
                'success': True,
                'protection': protection_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_protections(self, max_results=100):
        """Listar todas las protecciones"""
        
        try:
            response = self.shield.list_protections(MaxResults=max_results)
            
            protections = []
            for protection in response['Protections']:
                protection_info = {
                    'protection_id': protection['Id'],
                    'resource_arn': protection['ResourceArn'],
                    'protection_name': protection.get('Name'),
                    'protection_status': protection['ProtectionStatus']
                }
                protections.append(protection_info)
            
            return {
                'success': True,
                'protections': protections,
                'count': len(protections)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_protection(self, protection_id):
        """Eliminar protección"""
        
        try:
            self.shield.delete_protection(ProtectionId=protection_id)
            
            return {
                'success': True,
                'protection_id': protection_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def enable_application_layer_automatic_response(self, resource_arn, action_block=True):
        """Habilitar respuesta automática a nivel de aplicación"""
        
        try:
            response = self.shield.enable_application_layer_automatic_response(
                ResourceArn=resource_arn,
                Action={
                    'Block': action_block
                }
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
    
    def disable_application_layer_automatic_response(self, resource_arn):
        """Deshabilitar respuesta automática a nivel de aplicación"""
        
        try:
            self.shield.disable_application_layer_automatic_response(
                ResourceArn=resource_arn
            )
            
            return {
                'success': True,
                'resource_arn': resource_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_emergency_contact(self, email_address, phone_number=None):
        """Crear contacto de emergencia"""
        
        try:
            contact_params = {
                'EmailAddress': email_address
            }
            
            if phone_number:
                contact_params['PhoneNumber'] = phone_number
            
            response = self.shield.create_emergency_contact(**contact_params)
            
            return {
                'success': True,
                'email_address': email_address
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_attack(self, attack_id):
        """Obtener detalles de un ataque"""
        
        try:
            response = self.shield.describe_attack(AttackId=attack_id)
            
            attack_info = {
                'attack_id': response['Attack']['AttackId'],
                'resource_arn': response['Attack']['ResourceArn'],
                'start_time': response['Attack']['StartTime'],
                'end_time': response['Attack'].get('EndTime'),
                'attack_counters': response['Attack'].get('AttackCounters', []),
                'attack_properties': response['Attack'].get('AttackProperties', []),
                'mitigations': response['Attack'].get('Mitigations', [])
            }
            
            return {
                'success': True,
                'attack': attack_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_attacks(self, start_time=None, end_time=None, max_results=100):
        """Listar ataques"""
        
        try:
            params = {'MaxResults': max_results}
            
            if start_time:
                params['StartTime'] = start_time
            if end_time:
                params['EndTime'] = end_time
            
            response = self.shield.list_attacks(**params)
            
            attacks = []
            for attack in response['Attacks']:
                attack_info = {
                    'attack_id': attack['AttackId'],
                    'resource_arn': attack['ResourceArn'],
                    'start_time': attack['StartTime'],
                    'end_time': attack.get('EndTime'),
                    'attack_counters': attack.get('AttackCounters', [])
                }
                attacks.append(attack_info)
            
            return {
                'success': True,
                'attacks': attacks,
                'count': len(attacks)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_emergency_contact_settings(self, emergency_contact_list):
        """Actualizar configuración de contactos de emergencia"""
        
        try:
            self.shield.update_emergency_contact_settings(
                EmergencyContactList=emergency_contact_list
            )
            
            return {
                'success': True,
                'contacts_updated': len(emergency_contact_list)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## AWS WAF

### **Configuración de WAF**
```python
class WAFManager:
    def __init__(self, region='us-east-1'):
        self.waf = boto3.client('wafv2', region_name=region)
        self.region = region
    
    def create_web_acl(self, name, scope='CLOUDFRONT', default_action='allow', 
                      rules=None, visibility_config=None):
        """Crear Web ACL"""
        
        try:
            # Configuración de visibilidad por defecto
            if not visibility_config:
                visibility_config = {
                    'SampledRequestsEnabled': True,
                    'CloudWatchMetricsEnabled': True,
                    'MetricName': f'{name}-WebACL'
                }
            
            acl_params = {
                'Name': name,
                'Scope': scope,
                'DefaultAction': {
                    'Allow': {} if default_action == 'allow' else {'Block': {}}
                },
                'VisibilityConfig': visibility_config
            }
            
            # Agregar reglas si se especifican
            if rules:
                acl_params['Rules'] = rules
            
            response = self.waf.create_web_acl(**acl_params)
            web_acl_arn = response['Summary']['ARN']
            web_acl_id = response['Summary']['Id']
            
            return {
                'success': True,
                'web_acl_id': web_acl_id,
                'web_acl_arn': web_acl_arn,
                'name': name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_ip_set_reference_statement(self, ip_set_arn):
        """Crear statement para IP set"""
        
        return {
            'IPSetReferenceStatement': {
                'ARN': ip_set_arn
            }
        }
    
    def create_rate_based_statement(self, limit, aggregate_key_type='IP'):
        """Crear statement para rate limiting"""
        
        return {
            'RateBasedStatement': {
                'Limit': limit,
                'AggregateKeyType': aggregate_key_type
            }
        }
    
    def create_sql_injection_match_statement(self, field_to_match, text_transformations):
        """Crear statement para SQL injection"""
        
        return {
            'SqlInjectionMatchStatement': {
                'FieldToMatch': field_to_match,
                'TextTransformations': text_transformations,
                'SensitivityLevel': 'HIGH'
            }
        }
    
    def create_xss_match_statement(self, field_to_match, text_transformations):
        """Crear statement para XSS protection"""
        
        return {
            'XssMatchStatement': {
                'FieldToMatch': field_to_match,
                'TextTransformations': text_transformations
            }
        }
    
    def associate_web_acl(self, resource_arn, web_acl_arn):
        **Asociar Web ACL a recurso**
        
        try:
            self.waf.associate_web_acl(
                WebACLArn=web_acl_arn,
                ResourceArn=resource_arn
            )
            
            return {
                'success': True,
                'resource_arn': resource_arn,
                'web_acl_arn': web_acl_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def disassociate_web_acl(self, resource_arn):
        **Desasociar Web ACL de recurso**
        
        try:
            self.waf.disassociate_web_acl(ResourceArn=resource_arn)
            
            return {
                'success': True,
                'resource_arn': resource_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Configuración Completa de Protección DDoS**
```python
# Ejemplo: Configurar protección completa
ddos_manager = DDoSProtectionManager('us-east-1')
waf_manager = WAFManager('us-east-1')

# Habilitar Shield Advanced para distribution de CloudFront
distribution_arn = 'arn:aws:cloudfront::123456789012:distribution/E1234567890ABC'
shield_result = ddos_manager.enable_shield_advanced(
    resource_arn=distribution_arn,
    subscription_duration_months=12
)

if shield_result['success']:
    # Crear Web ACL con reglas básicas
    rules = [
        {
            'Name': 'RateLimitRule',
            'Priority': 1,
            'Statement': waf_manager.create_rate_based_statement(limit=1000),
            'Action': {'Block': {}},
            'VisibilityConfig': {
                'SampledRequestsEnabled': True,
                'CloudWatchMetricsEnabled': True,
                'MetricName': 'RateLimitRule'
            }
        },
        {
            'Name': 'SQLInjectionRule',
            'Priority': 2,
            'Statement': waf_manager.create_sql_injection_match_statement(
                field_to_match={'Body': {}},
                text_transformations=[{'Priority': 0, 'Type': 'URL_DECODE'}]
            ),
            'Action': {'Block': {}},
            'VisibilityConfig': {
                'SampledRequestsEnabled': True,
                'CloudWatchMetricsEnabled': True,
                'MetricName': 'SQLInjectionRule'
            }
        }
    ]
    
    web_acl_result = waf_manager.create_web_acl(
        name='application-web-acl',
        scope='CLOUDFRONT',
        default_action='allow',
        rules=rules
    )
    
    if web_acl_result['success']:
        # Asociar Web ACL a la distribución
        association_result = waf_manager.associate_web_acl(
            resource_arn=distribution_arn,
            web_acl_arn=web_acl_result['web_acl_arn']
        )
        
        print("DDoS protection configured successfully")
```

### **2. Monitoreo de Ataques**
```python
# Ejemplo: Monitorear ataques recientes
end_time = datetime.utcnow()
start_time = end_time - timedelta(days=7)

attacks_result = ddos_manager.list_attacks(
    start_time=start_time,
    end_time=end_time
)

if attacks_result['success']:
    print(f"Total attacks in last 7 days: {attacks_result['count']}")
    
    for attack in attacks_result['attacks']:
        attack_details = ddos_manager.describe_attack(attack['attack_id'])
        if attack_details['success']:
            print(f"Attack {attack['attack_id']}: {attack['start_time']} - {attack.get('end_time', 'ongoing')}")
```

## Configuración con AWS CLI

### **Shield Advanced**
```bash
# Habilitar Shield Advanced
aws shield create-subscription \
  --resource-arn arn:aws:cloudfront::123456789012:distribution/E1234567890ABC

# Crear protección
aws shield create-protection \
  --resource-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-load-balancer/1234567890abcdef0 \
  --name "My ALB Protection"

# Listar protecciones
aws shield list-protections --max-results 100

# Describir ataque
aws shield describe-attack --attack-id attack-1234567890abcdef0
```

### **AWS WAF**
```bash
# Crear Web ACL
aws wafv2 create-web-acl \
  --name application-web-acl \
  --scope CLOUDFRONT \
  --default-action Allow={} \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=application-web-acl

# Crear IP set
aws wafv2 create-ip-set \
  --name blocked-ips \
  --scope CLOUDFRONT \
  --ip-address-version IPV4 \
  --addresses 192.0.2.0/24 203.0.113.0/24

# Asociar Web ACL
aws wafv2 associate-web-acl \
  --web-acl-arn arn:aws:wafv2:us-east-1:123456789012:global/webacl/application-web-acl/12345678-1234-1234-1234-123456789012 \
  --resource-arn arn:aws:cloudfront::123456789012:distribution/E1234567890ABC
```

## Best Practices

### **1. Arquitectura de Seguridad**
- Implementar defensa en profundidad
- Usar múltiples capas de protección
- Configurar monitoreo continuo
- Documentar procedimientos de respuesta

### **2. Configuración de Shield**
- Habilitar Shield Advanced para recursos críticos
- Configurar contactos de emergencia
- Implementar cost protection
- Revisar configuración regularmente

### **3. Reglas WAF**
- Implementar rate limiting apropiado
- Proteger contra ataques comunes (SQLi, XSS)
- Usar reglas administradas de AWS
- Personalizar según aplicación

### **4. Monitoreo y Respuesta**
- Configurar alertas de CloudWatch
- Implementar logging completo
- Realizar pruebas de penetración
- Tener plan de respuesta a incidentes

## Costos

### **Shield Standard**
- **Gratis**: Incluido con todos los servicios AWS
- **Protección básica**: Contra ataques comunes
- **Monitoreo**: 24/7 sin costo adicional

### **Shield Advanced**
- **$3,000 por mes**: Por suscripción
- **$39 por GB**: Datos mitigados durante ataques
- **Protección extendida**: Contra ataques sofisticados
- **Soporte DRT**: 24/7 durante ataques

### **AWS WAF**
- **$5.00 por Web ACL**: Por mes
- **$1.00 por regla**: Por mes
- **$0.60 por millón de requests**: Cargos de procesamiento
- **Reglas administradas**: Precios variables

## Troubleshooting

### **Problemas Comunes**
1. **Shield no activa**: Verificar tipo de recurso soportado
2. **WAF bloqueando tráfico legítimo**: Revisar reglas y configuración
3. **Costos inesperados**: Monitorear uso durante ataques
4. **Latencia aumentada**: Optimizar configuración de WAF

### **Comandos de Diagnóstico**
```bash
# Verificar estado de Shield
aws shield describe-protection \
  --resource-arn arn:aws:cloudfront::123456789012:distribution/E1234567890ABC

# Verificar Web ACL
aws wafv2 get-web-acl \
  --name application-web-acl \
  --scope CLOUDFRONT \
  --id 12345678-1234-1234-1234-123456789012

# Verificar métricas
aws cloudwatch get-metric-statistics \
  --namespace AWS/DDoSProtection \
  --metric-name DDoSDetected \
  --start-time 2023-01-01T00:00:00Z \
  --end-time 2023-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

## Monitoreo

### **Métricas CloudWatch**
- AWS/DDoSProtection
- AWS/WAFV2
- AWS/CloudFront
- Latency y error rates

### **Alarmas Recomendadas**
- DDoS attack detected
- WAF blocked requests
- High error rate
- Increased latency

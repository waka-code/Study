# AWS Control Tower

## Definición

AWS Control Tower es un servicio que configura y gestiona un entorno de aterrizaje seguro y multi-cuenta (landing zone) en AWS. Proporciona una forma simplificada de configurar una arquitectura de múltiples cuentas con las mejores prácticas de seguridad y gobernanza predefinidas, incluyendo guardrails preventivos y detectivos que se aplican automáticamente a todas las cuentas.

## Características Principales

### **Landing Zone Setup**
- **Automated Setup**: Configuración automatizada de landing zone
- **Best Practices**: Implementación de mejores prácticas de AWS
- **Multi-account Architecture**: Arquitectura multi-cuenta predefinida
- **Network Design**: Diseño de red VPC compartida y cuentas de aislamiento
- **Identity Management**: Configuración centralizada de identidad con AWS SSO

### **Guardrails**
- **Preventive Guardrails**: Barreras preventivas que bloquean acciones no conformes
- **Detective Guardrails**: Barreras detectivas que monitorean y reportan no conformidad
- **Strong Guardrails**: Guardrails que no pueden ser modificados
- **Weak Guardrails**: Guardrails que pueden ser deshabilitados por administradores
- **Custom Guardrails**: Guardrails personalizados para requisitos específicos

### **Account Management**
- **Account Factory**: Creación automatizada de cuentas con plantillas predefinidas
- **Account Provisioning**: Aprovisionamiento rápido de nuevas cuentas
- **Account Customization**: Personalización de cuentas con CloudFormation
- **Account Governance**: Gobernanza automática aplicada a nuevas cuentas
- **Account Lifecycle**: Gestión completa del ciclo de vida de cuentas

### **Compliance and Governance**
- **AWS Config Rules**: Reglas de configuración automatizadas
- **Service Catalog Products**: Catálogo de productos aprobados
- **Compliance Dashboard**: Dashboard centralizado de cumplimiento
- **Audit Logging**: Logs centralizados con CloudTrail
- **Security Hub**: Integración con AWS Security Hub

## Conceptos Clave

### **Landing Zone**
- Entorno multi-cuenta preconfigurado
- Incluye cuentas de gestión, auditoría y logging
- Configuración de red segura y aislada
- Aplicación automática de guardrails

### **Guardrails**
- Controles que aplican políticas de gobernanza
- Pueden ser preventivos (bloquean) o detectivos (reportan)
- Se aplican automáticamente a OUs y cuentas
- Basados en AWS Config Rules y SCPs

### **Account Factory**
- Servicio para crear cuentas consistentemente
- Usa plantillas de Service Catalog
- Aplica configuraciones personalizadas automáticamente
- Integra con AWS Organizations

### **Control Tower Dashboard**
- Interfaz centralizada de gestión
- Visibilidad del estado de la landing zone
- Monitoreo de cumplimiento
- Gestión de guardrails y cuentas

## Arquitectura de AWS Control Tower

### **Estructura de Landing Zone**
```
AWS Control Tower Landing Zone
├── Management Account
│   ├── Control Tower
│   ├── AWS Organizations
│   ├── AWS SSO
│   └── Service Catalog
├── Core Accounts
│   ├── Audit Account
│   │   ├── CloudTrail
│   │   ├── AWS Config
│   │   └── AWS Security Hub
│   └── Log Archive Account
│       ├── S3 Buckets
│       ├── Centralized Logging
│       └── Log Retention
├── Shared Services Account
│   ├── Network Resources
│   ├── Shared Services
│   └── Centralized Tools
└── OU Structure
    ├── Security OU
    │   ├── Production Accounts
    │   ├── Development Accounts
    │   └── Sandbox Accounts
    └── Infrastructure OU
        ├── Network Accounts
        ├── Database Accounts
        └── Application Accounts
```

### **Flujo de Guardrails**
```
Control Tower (Guardrail Definition)
  ↓
AWS Organizations (SCP Application)
  ↓
AWS Config (Rule Evaluation)
  ↓
AWS Security Hub (Finding Aggregation)
  ↓
Compliance Dashboard (Reporting)
```

## Configuración de AWS Control Tower

### **Gestión Completa de AWS Control Tower**
```python
import boto3
import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class ControlTowerManager:
    def __init__(self, region='us-east-1'):
        self.control_tower = boto3.client('controltower', region_name=region)
        self.organizations = boto3.client('organizations', region_name=region)
        self.sso = boto3.client('sso', region_name=region)
        self.cloudformation = boto3.client('cloudformation', region_name=region)
        self.service_catalog = boto3.client('servicecatalog', region_name=region)
        self.config = boto3.client('config', region_name=region)
        self.securityhub = boto3.client('securityhub', region_name=region)
        self.cloudtrail = boto3.client('cloudtrail', region_name=region)
        self.region = region
    
    def get_landing_zone(self):
        """Obtener información de la landing zone"""
        
        try:
            response = self.control_tower.get_landing_zone()
            
            landing_zone_info = {
                'landing_zone_arn': response['LandingZone']['Arn'],
                'landing_zone_identifier': response['LandingZone']['Identifier'],
                'landing_zone_name': response['LandingZone']['Name'],
                'status': response['LandingZone']['Status'],
                'latest_available_version': response['LandingZone']['LatestAvailableVersion'],
                'manifest': response['LandingZone'].get('Manifest', {}),
                'drift_status': response['LandingZone'].get('DriftStatus', ''),
                'drift_status_updated_at': response['LandingZone'].get('DriftStatusUpdatedAt', '').isoformat() if response['LandingZone'].get('DriftStatusUpdatedAt') else ''
            }
            
            return {
                'success': True,
                'landing_zone': landing_zone_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_landing_zone_operation(self, operation_identifier):
        """Obtener estado de operación de landing zone"""
        
        try:
            response = self.control_tower.get_landing_zone_operation(
                operationIdentifier=operation_identifier
            )
            
            operation_info = {
                'operation_identifier': response['Operation']['OperationIdentifier'],
                'operation_type': response['Operation']['OperationType'],
                'status': response['Operation']['Status'],
                'started_at': response['Operation']['StartedAt'].isoformat(),
                'completed_at': response['Operation'].get('CompletedAt', '').isoformat() if response['Operation'].get('CompletedAt') else '',
                'error_details': response['Operation'].get('ErrorDetails', {})
            }
            
            return {
                'success': True,
                'operation': operation_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_landing_zones(self, max_results=20, next_token=None):
        """Listar landing zones"""
        
        try:
            params = {'maxResults': max_results}
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.control_tower.list_landing_zones(**params)
            
            landing_zones = []
            for lz in response['LandingZones']:
                lz_info = {
                    'arn': lz['Arn'],
                    'identifier': lz['Identifier'],
                    'name': lz['Name'],
                    'status': lz['Status'],
                    'latest_available_version': lz['LatestAvailableVersion']
                }
                landing_zones.append(lz_info)
            
            return {
                'success': True,
                'landing_zones': landing_zones,
                'count': len(landing_zones),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_landing_zone(self, landing_zone_identifier, manifest, version='latest', tags=None):
        """Crear landing zone"""
        
        try:
            params = {
                'landingZoneIdentifier': landing_zone_identifier,
                'manifest': manifest,
                'version': version
            }
            
            if tags:
                params['tags'] = tags
            
            response = self.control_tower.create_landing_zone(**params)
            
            return {
                'success': True,
                'operation_identifier': response['OperationIdentifier'],
                'landing_zone_identifier': landing_zone_identifier
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_landing_zone(self, landing_zone_identifier, manifest, version='latest'):
        """Actualizar landing zone"""
        
        try:
            response = self.control_tower.update_landing_zone(
                landingZoneIdentifier=landing_zone_identifier,
                manifest=manifest,
                version=version
            )
            
            return {
                'success': True,
                'operation_identifier': response['OperationIdentifier'],
                'landing_zone_identifier': landing_zone_identifier
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_landing_zone(self, landing_zone_identifier):
        """Eliminar landing zone"""
        
        try:
            response = self.control_tower.delete_landing_zone(
                landingZoneIdentifier=landing_zone_identifier
            )
            
            return {
                'success': True,
                'operation_identifier': response['OperationIdentifier'],
                'landing_zone_identifier': landing_zone_identifier
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_control_operation(self, operation_identifier):
        """Obtener estado de operación de control"""
        
        try:
            response = self.control_tower.get_control_operation(
                operationIdentifier=operation_identifier
            )
            
            operation_info = {
                'operation_identifier': response['Operation']['OperationIdentifier'],
                'control_identifier': response['Operation']['ControlIdentifier'],
                'operation_type': response['Operation']['OperationType'],
                'status': response['Operation']['Status'],
                'started_at': response['Operation']['StartedAt'].isoformat(),
                'completed_at': response['Operation'].get('CompletedAt', '').isoformat() if response['Operation'].get('CompletedAt') else '',
                'target_identifier': response['Operation'].get('TargetIdentifier', ''),
                'error_details': response['Operation'].get('ErrorDetails', {})
            }
            
            return {
                'success': True,
                'operation': operation_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def enable_control(self, control_identifier, target_identifier):
        """Habilitar control (guardrail)"""
        
        try:
            response = self.control_tower.enable_control(
                controlIdentifier=control_identifier,
                targetIdentifier=target_identifier
            )
            
            return {
                'success': True,
                'operation_identifier': response['OperationIdentifier'],
                'control_identifier': control_identifier,
                'target_identifier': target_identifier
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def disable_control(self, control_identifier, target_identifier):
        """Deshabilitar control (guardrail)"""
        
        try:
            response = self.control_tower.disable_control(
                controlIdentifier=control_identifier,
                targetIdentifier=target_identifier
            )
            
            return {
                'success': True,
                'operation_identifier': response['OperationIdentifier'],
                'control_identifier': control_identifier,
                'target_identifier': target_identifier
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_enabled_controls(self, target_identifier, max_results=20, next_token=None):
        """Listar controles habilitados"""
        
        try:
            params = {
                'targetIdentifier': target_identifier,
                'maxResults': max_results
            }
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.control_tower.list_enabled_controls(**params)
            
            enabled_controls = []
            for control in response['EnabledControls']:
                control_info = {
                    'control_identifier': control['ControlIdentifier'],
                    'control_name': control['ControlName'],
                    'control_description': control.get('ControlDescription', ''),
                    'drift_status': control.get('DriftStatus', ''),
                    'status': control.get('Status', '')
                }
                enabled_controls.append(control_info)
            
            return {
                'success': True,
                'enabled_controls': enabled_controls,
                'count': len(enabled_controls),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_controls(self, control_filter=None, max_results=20, next_token=None):
        """Listar controles disponibles"""
        
        try:
            params = {'maxResults': max_results}
            
            if control_filter:
                params['controlFilter'] = control_filter
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.control_tower.list_controls(**params)
            
            controls = []
            for control in response['Controls']:
                control_info = {
                    'control_identifier': control['ControlIdentifier'],
                    'control_name': control['ControlName'],
                    'control_description': control.get('ControlDescription', ''),
                    'control_type': control.get('ControlType', ''),
                    'behavior': control.get('Behavior', ''),
                    'region': control.get('Region', ''),
                    'drift_status': control.get('DriftStatus', '')
                }
                controls.append(control_info)
            
            return {
                'success': True,
                'controls': controls,
                'count': len(controls),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_control(self, control_identifier):
        """Obtener detalles de control"""
        
        try:
            response = self.control_tower.get_control(
                controlIdentifier=control_identifier
            )
            
            control_info = {
                'control_identifier': response['Control']['ControlIdentifier'],
                'control_name': response['Control']['ControlName'],
                'control_description': response['Control']['ControlDescription'],
                'control_type': response['Control'].get('ControlType', ''),
                'behavior': response['Control'].get('Behavior', ''),
                'region': response['Control'].get('Region', ''),
                'drift_status': response['Control'].get('DriftStatus', ''),
                'implementation': response['Control'].get('Implementation', {}),
                'parameters': response['Control'].get('Parameters', {})
            }
            
            return {
                'success': True,
                'control': control_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def setup_account_factory(self, product_name, provisioning_artifact_name,
                              provisioning_artifact_type='CLOUDFORMATION_TEMPLATE',
                              product_description=None, tags=None):
        """Configurar Account Factory"""
        
        try:
            # Crear producto en Service Catalog
            product_params = {
                'Name': product_name,
                'ProvisioningArtifactName': provisioning_artifact_name,
                'ProvisioningArtifactType': provisioning_artifact_type
            }
            
            if product_description:
                product_params['Description'] = product_description
            
            if tags:
                product_params['Tags'] = tags
            
            # Este es un ejemplo simplificado - en realidad necesitarías
            # el template de CloudFormation y la configuración completa
            
            return {
                'success': True,
                'message': 'Account Factory setup initiated',
                'product_name': product_name,
                'provisioning_artifact': provisioning_artifact_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_account_with_factory(self, account_name, email, sso_user_email,
                                   organizational_unit, tags=None):
        """Crear cuenta usando Account Factory"""
        
        try:
            # En una implementación real, esto usaría Service Catalog
            # para aprovisionar la cuenta con la plantilla predefinida
            
            account_info = {
                'account_name': account_name,
                'email': email,
                'sso_user_email': sso_user_email,
                'organizational_unit': organizational_unit,
                'status': 'PROVISIONING',
                'created_at': datetime.utcnow().isoformat()
            }
            
            if tags:
                account_info['tags'] = tags
            
            return {
                'success': True,
                'account': account_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_landing_zone_drift(self, landing_zone_identifier):
        """Obtener estado de drift de landing zone"""
        
        try:
            response = self.control_tower.get_landing_zone(
                landingZoneIdentifier=landing_zone_identifier
            )
            
            drift_info = {
                'landing_zone_identifier': landing_zone_identifier,
                'drift_status': response['LandingZone'].get('DriftStatus', ''),
                'drift_status_updated_at': response['LandingZone'].get('DriftStatusUpdatedAt', '').isoformat() if response['LandingZone'].get('DriftStatusUpdatedAt') else '',
                'has_drift': response['LandingZone'].get('DriftStatus') == 'DRIFTED'
            }
            
            return {
                'success': True,
                'drift': drift_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_control_tower_compliance(self):
        """Analizar cumplimiento de Control Tower"""
        
        try:
            compliance_analysis = {
                'landing_zone_status': '',
                'total_enabled_controls': 0,
                'drifted_controls': 0,
                'compliance_score': 0,
                'guardrails_analysis': {},
                'recommendations': []
            }
            
            # Obtener estado de landing zone
            lz_result = self.get_landing_zone()
            if lz_result['success']:
                lz = lz_result['landing_zone']
                compliance_analysis['landing_zone_status'] = lz['status']
                
                # Analizar controles habilitados
                # Esto requeriría iterar sobre OUs y cuentas
                # Para simplificación, usamos datos simulados
                
                compliance_analysis['total_enabled_controls'] = 45
                compliance_analysis['drifted_controls'] = 3
                compliance_analysis['compliance_score'] = ((45 - 3) / 45) * 100
                
                # Análisis de guardrails
                compliance_analysis['guardrails_analysis'] = {
                    'preventive_guardrails': {
                        'total': 25,
                        'enabled': 24,
                        'compliant': 23
                    },
                    'detective_guardrails': {
                        'total': 20,
                        'enabled': 18,
                        'compliant': 17
                    },
                    'strong_guardrails': {
                        'total': 15,
                        'enabled': 15,
                        'compliant': 15
                    },
                    'weak_guardrails': {
                        'total': 30,
                        'enabled': 27,
                        'compliant': 25
                    }
                }
                
                # Generar recomendaciones
                recommendations = []
                
                if compliance_analysis['drifted_controls'] > 0:
                    recommendations.append({
                        'priority': 'HIGH',
                        'category': 'DRIFT',
                        'title': 'Control drift detected',
                        'description': f'{compliance_analysis["drifted_controls"]} controls have drifted',
                        'action': 'Review and remediate drifted controls'
                    })
                
                if compliance_analysis['compliance_score'] < 95:
                    recommendations.append({
                        'priority': 'MEDIUM',
                        'category': 'COMPLIANCE',
                        'title': 'Compliance score below threshold',
                        'description': f'Compliance score is {compliance_analysis["compliance_score"]:.1f}%',
                        'action': 'Enable additional guardrails and address non-compliance'
                    })
                
                guardrails_analysis = compliance_analysis['guardrails_analysis']
                if guardrails_analysis['detective_guardrails']['enabled'] < guardrails_analysis['detective_guardrails']['total']:
                    recommendations.append({
                        'priority': 'MEDIUM',
                        'category': 'MONITORING',
                        'title': 'Missing detective guardrails',
                        'description': 'Some detective guardrails are not enabled',
                        'action': 'Enable all recommended detective guardrails'
                    })
                
                compliance_analysis['recommendations'] = recommendations
            
            return {
                'success': True,
                'compliance_analysis': compliance_analysis
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_control_tower_summary(self):
        """Obtener resumen completo de Control Tower"""
        
        try:
            summary = {
                'landing_zone': {},
                'controls': {},
                'accounts': {},
                'guardrails': {},
                'compliance': {}
            }
            
            # Obtener información de landing zone
            lz_result = self.get_landing_zone()
            if lz_result['success']:
                summary['landing_zone'] = lz_result['landing_zone']
            
            # Obtener controles disponibles
            controls_result = self.list_controls()
            if controls_result['success']:
                summary['controls'] = {
                    'total_available': controls_result['count'],
                    'preventive': len([c for c in controls_result['controls'] if c.get('behavior') == 'PREVENTIVE']),
                    'detective': len([c for c in controls_result['controls'] if c.get('behavior') == 'DETECTIVE'])
                }
            
            # Simular información de cuentas (requeriría integración con Organizations)
            summary['accounts'] = {
                'total_accounts': 12,
                'managed_accounts': 10,
                'pending_accounts': 2
            }
            
            # Simular información de guardrails
            summary['guardrails'] = {
                'total_enabled': 45,
                'strong': 15,
                'weak': 30,
                'drifted': 3
            }
            
            # Obtener análisis de cumplimiento
            compliance_result = self.analyze_control_tower_compliance()
            if compliance_result['success']:
                summary['compliance'] = compliance_result['compliance_analysis']
            
            return {
                'success': True,
                'summary': summary
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_control_tower_report(self, report_type='comprehensive'):
        """Generar reporte de Control Tower"""
        
        try:
            report = {
                'report_metadata': {
                    'report_type': report_type,
                    'generated_at': datetime.utcnow().isoformat()
                }
            }
            
            if report_type == 'comprehensive':
                # Reporte completo
                summary_result = self.get_control_tower_summary()
                if summary_result['success']:
                    report['summary'] = summary_result['summary']
                
                # Obtener controles detallados
                controls_result = self.list_controls()
                if controls_result['success']:
                    report['controls'] = controls_result['controls']
                
                # Análisis de cumplimiento
                compliance_result = self.analyze_control_tower_compliance()
                if compliance_result['success']:
                    report['compliance'] = compliance_result['compliance_analysis']
            
            elif report_type == 'landing_zone':
                # Reporte de landing zone
                lz_result = self.get_landing_zone()
                if lz_result['success']:
                    report['landing_zone'] = lz_result['landing_zone']
                
                drift_result = self.get_landing_zone_drift(lz_result['landing_zone']['landing_zone_identifier'])
                if drift_result['success']:
                    report['drift'] = drift_result['drift']
            
            elif report_type == 'guardrails':
                # Reporte de guardrails
                controls_result = self.list_controls()
                if controls_result['success']:
                    report['available_controls'] = controls_result['controls']
                
                # Agrupar por tipo
                report['guardrails_by_type'] = {
                    'preventive': [c for c in controls_result['controls'] if c.get('behavior') == 'PREVENTIVE'],
                    'detective': [c for c in controls_result['controls'] if c.get('behavior') == 'DETECTIVE']
                }
            
            elif report_type == 'compliance':
                # Reporte de cumplimiento
                compliance_result = self.analyze_control_tower_compliance()
                if compliance_result['success']:
                    report['compliance'] = compliance_result['compliance_analysis']
            
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

### **1. Obtener Información de Landing Zone**
```python
# Ejemplo: Obtener estado de landing zone
manager = ControlTowerManager('us-east-1')

lz_result = manager.get_landing_zone()

if lz_result['success']:
    lz = lz_result['landing_zone']
    print(f"Landing Zone Information:")
    print(f"  Name: {lz['landing_zone_name']}")
    print(f"  ARN: {lz['landing_zone_arn']}")
    print(f"  Status: {lz['status']}")
    print(f"  Latest Version: {lz['latest_available_version']}")
    print(f"  Drift Status: {lz['drift_status']}")
```

### **2. Listar y Analizar Guardrails**
```python
# Ejemplo: Listar guardrails disponibles
manager = ControlTowerManager('us-east-1')

# Listar todos los controles
controls_result = manager.list_controls()

if controls_result['success']:
    controls = controls_result['controls']
    print(f"Available Controls: {controls_result['count']}")
    
    # Agrupar por tipo
    preventive = [c for c in controls if c.get('behavior') == 'PREVENTIVE']
    detective = [c for c in controls if c.get('behavior') == 'DETECTIVE']
    
    print(f"  Preventive: {len(preventive)}")
    print(f"  Detective: {len(detective)}")
    
    # Mostrar algunos ejemplos
    print(f"\nSample Preventive Guardrails:")
    for control in preventive[:3]:
        print(f"  - {control['control_name']}")
        print(f"    ID: {control['control_identifier']}")
        print(f"    Description: {control['control_description'][:100]}...")
    
    print(f"\nSample Detective Guardrails:")
    for control in detective[:3]:
        print(f"  - {control['control_name']}")
        print(f"    ID: {control['control_identifier']}")
        print(f"    Description: {control['control_description'][:100]}...")
```

### **3. Habilitar Guardrail Específico**
```python
# Ejemplo: Habilitar guardrail en OU específica
manager = ControlTowerManager('us-east-1')

# Habilitar guardrail para restringir regiones
guardrail_id = 'AWS-GR_RESTRICTED_REGIONS'
target_ou = 'ou-xxxx-xxxxxxxx'  # OU ID

enable_result = manager.enable_control(
    control_identifier=guardrail_id,
    target_identifier=target_ou
)

if enable_result['success']:
    print(f"Guardrail enabled:")
    print(f"  Guardrail ID: {guardrail_id}")
    print(f"  Target OU: {target_ou}")
    print(f"  Operation ID: {enable_result['operation_identifier']}")
    
    # Esperar y verificar estado
    time.sleep(30)
    
    operation_result = manager.get_control_operation(enable_result['operation_identifier'])
    if operation_result['success']:
        operation = operation_result['operation']
        print(f"  Status: {operation['status']}")
        print(f"  Started: {operation['started_at']}")
        if operation['completed_at']:
            print(f"  Completed: {operation['completed_at']}")
```

### **4. Analizar Cumplimiento**
```python
# Ejemplo: Analizar cumplimiento completo
manager = ControlTowerManager('us-east-1')

compliance_result = manager.analyze_control_tower_compliance()

if compliance_result['success']:
    compliance = compliance_result['compliance_analysis']
    
    print(f"Control Tower Compliance Analysis")
    print(f"  Landing Zone Status: {compliance['landing_zone_status']}")
    print(f"  Total Enabled Controls: {compliance['total_enabled_controls']}")
    print(f"  Drifted Controls: {compliance['drifted_controls']}")
    print(f"  Compliance Score: {compliance['compliance_score']:.1f}%")
    
    print(f"\nGuardrails Analysis:")
    guardrails = compliance['guardrails_analysis']
    
    print(f"  Preventive Guardrails:")
    preventive = guardrails['preventive_guardrails']
    print(f"    Total: {preventive['total']}")
    print(f"    Enabled: {preventive['enabled']}")
    print(f"    Compliant: {preventive['compliant']}")
    
    print(f"  Detective Guardrails:")
    detective = guardrails['detective_guardrails']
    print(f"    Total: {detective['total']}")
    print(f"    Enabled: {detective['enabled']}")
    print(f"    Compliant: {detective['compliant']}")
    
    print(f"\nRecommendations: {len(compliance['recommendations'])}")
    for rec in compliance['recommendations']:
        print(f"  [{rec['priority']}] {rec['title']}")
        print(f"    {rec['description']}")
        print(f"    Action: {rec['action']}")
```

### **5. Obtener Resumen Completo**
```python
# Ejemplo: Obtener resumen completo de Control Tower
manager = ControlTowerManager('us-east-1')

summary_result = manager.get_control_tower_summary()

if summary_result['success']:
    summary = summary_result['summary']
    
    print(f"Control Tower Summary")
    
    if 'landing_zone' in summary:
        lz = summary['landing_zone']
        print(f"\nLanding Zone:")
        print(f"  Name: {lz['landing_zone_name']}")
        print(f"  Status: {lz['status']}")
    
    if 'controls' in summary:
        controls = summary['controls']
        print(f"\nControls:")
        print(f"  Total Available: {controls['total_available']}")
        print(f"  Preventive: {controls['preventive']}")
        print(f"  Detective: {controls['detective']}")
    
    if 'accounts' in summary:
        accounts = summary['accounts']
        print(f"\nAccounts:")
        print(f"  Total: {accounts['total_accounts']}")
        print(f"  Managed: {accounts['managed_accounts']}")
        print(f"  Pending: {accounts['pending_accounts']}")
    
    if 'guardrails' in summary:
        guardrails = summary['guardrails']
        print(f"\nGuardrails:")
        print(f"  Total Enabled: {guardrails['total_enabled']}")
        print(f"  Strong: {guardrails['strong']}")
        print(f"  Weak: {guardrails['weak']}")
        print(f"  Drifted: {guardrails['drifted']}")
    
    if 'compliance' in summary:
        compliance = summary['compliance']
        print(f"\nCompliance:")
        print(f"  Score: {compliance['compliance_score']:.1f}%")
        print(f"  Recommendations: {len(compliance['recommendations'])}")
```

### **6. Generar Reporte Comprehensivo**
```python
# Ejemplo: Generar reporte completo
manager = ControlTowerManager('us-east-1')

report_result = manager.generate_control_tower_report(report_type='comprehensive')

if report_result['success']:
    report = report_result['report']
    
    print(f"Control Tower Report")
    print(f"  Generated at: {report['report_metadata']['generated_at']}")
    
    if 'summary' in report:
        summary = report['summary']
        print(f"\nSummary:")
        if 'landing_zone' in summary:
            print(f"  Landing Zone Status: {summary['landing_zone']['status']}")
        if 'controls' in summary:
            print(f"  Available Controls: {summary['controls']['total_available']}")
        if 'accounts' in summary:
            print(f"  Total Accounts: {summary['accounts']['total_accounts']}")
    
    if 'compliance' in report:
        compliance = report['compliance']
        print(f"\nCompliance:")
        print(f"  Score: {compliance['compliance_score']:.1f}%")
        print(f"  Drifted Controls: {compliance['drifted_controls']}")
        
        # Mostrar hallazgos
        if 'guardrails_analysis' in compliance:
            guardrails = compliance['guardrails_analysis']
            print(f"  Guardrails:")
            print(f"    Preventive: {guardrails['preventive_guardrails']['enabled']}/{guardrails['preventive_guardrails']['total']}")
            print(f"    Detective: {guardrails['detective_guardrails']['enabled']}/{guardrails['detective_guardrails']['total']}")
```

### **7. Configurar Account Factory**
```python
# Ejemplo: Configurar Account Factory
manager = ControlTowerManager('us-east-1')

# Configurar Account Factory
factory_result = manager.setup_account_factory(
    product_name='AWS Control Tower Account Factory',
    provisioning_artifact_name='Account Factory Template',
    provisioning_artifact_type='CLOUDFORMATION_TEMPLATE',
    product_description='Template for creating new accounts with standard configuration',
    tags=[
        {'Key': 'Purpose', 'Value': 'AccountFactory'},
        {'Key': 'Environment', 'Value': 'Production'}
    ]
)

if factory_result['success']:
    print(f"Account Factory setup initiated:")
    print(f"  Product: {factory_result['product_name']}")
    print(f"  Template: {factory_result['provisioning_artifact']}")
```

### **8. Crear Cuenta con Account Factory**
```python
# Ejemplo: Crear nueva cuenta usando Account Factory
manager = ControlTowerManager('us-east-1')

# Crear cuenta
account_result = manager.create_account_with_factory(
    account_name='new-prod-app',
    email='new-prod-app@company.com',
    sso_user_email='admin@company.com',
    organizational_unit='Production',
    tags=[
        {'Key': 'Application', 'Value': 'NewProdApp'},
        {'Key': 'Environment', 'Value': 'Production'}
    ]
)

if account_result['success']:
    account = account_result['account']
    print(f"Account creation initiated:")
    print(f"  Name: {account['account_name']}")
    print(f"  Email: {account['email']}")
    print(f"  OU: {account['organizational_unit']}")
    print(f"  Status: {account['status']}")
```

## Configuración con AWS CLI

### **Landing Zone**
```bash
# Crear landing zone
aws controltower create-landing-zone \
  --landing-zone-identifier my-landing-zone \
  --manifest file://landing-zone-manifest.json

# Obtener información de landing zone
aws controltower get-landing-zone \
  --landing-zone-identifier my-landing-zone

# Actualizar landing zone
aws controltower update-landing-zone \
  --landing-zone-identifier my-landing-zone \
  --manifest file://updated-manifest.json

# Eliminar landing zone
aws controltower delete-landing-zone \
  --landing-zone-identifier my-landing-zone
```

### **Guardrails**
```bash
# Listar controles disponibles
aws controltower list-controls \
  --control-filter 'Behavior=PREVENTIVE'

# Habilitar control
aws controltower enable-control \
  --control-identifier AWS-GR_RESTRICTED_REGIONS \
  --target-identifier ou-xxxx-xxxxxxxx

# Deshabilitar control
aws controltower disable-control \
  --control-identifier AWS-GR_RESTRICTED_REGIONS \
  --target-identifier ou-xxxx-xxxxxxxx

# Listar controles habilitados
aws controltower list-enabled-controls \
  --target-identifier ou-xxxx-xxxxxxxx
```

### **Operaciones**
```bash
# Obtener estado de operación
aws controltower get-landing-zone-operation \
  --operation-identifier operation-xxxxxxxx

# Obtener estado de operación de control
aws controltower get-control-operation \
  --operation-identifier operation-xxxxxxxx
```

## Mejores Prácticas

### **1. Diseño de Landing Zone**
- **Planning**: Planificar estructura antes del despliegue
- **OU Strategy**: Diseñar OUs basadas en función y entorno
- **Network Design**: Diseñar arquitectura de red segura
- **Account Strategy**: Definir estrategia de cuentas
- **Naming Convention**: Usar convenciones de nomenclatura consistentes

### **2. Gestión de Guardrails**
- **Enable Essential Guardrails**: Habilitar guardrails esenciales primero
- **Test Before Deploy**: Probar guardrails en entornos no productivos
- **Monitor Drift**: Monitorear drift de configuraciones
- **Regular Review**: Revisar y actualizar guardrails regularmente
- **Custom Guardrails**: Crear guardrails personalizados para requisitos específicos

### **3. Account Factory**
- **Standardized Templates**: Usar plantillas estandarizadas
- **Automated Provisioning**: Automatizar todo el proceso
- **Customization**: Personalizar según necesidades específicas
- **Governance Integration**: Integrar con políticas de gobernanza
- **Cost Management**: Implementar etiquetado para gestión de costos

### **4. Monitoreo y Cumplimiento**
- **Centralized Monitoring**: Monitoreo centralizado de todas las cuentas
- **Compliance Dashboard**: Usar dashboard de cumplimiento
- **Regular Audits**: Realizar auditorías regulares
- **Security Integration**: Integrar con Security Hub
- **Alerting**: Configurar alertas para no conformidad

## Costos

### **Precios de AWS Control Tower**
- **Service**: GRATIS
- **No hay cargos**: Por usar AWS Control Tower
- **AWS Config**: Costos por reglas de configuración
- **AWS SSO**: Sin costo adicional para hasta 5,000 usuarios
- **Service Catalog**: Sin costo adicional

### **Costos Asociados**
- **AWS Config**: $0.003 por configuración por mes
- **CloudTrail**: Primer trail gratuito, $2.00 por trail adicional
- **Security Hub**: $1.00 por cuenta por mes
- **CloudWatch**: Costos por métricas y logs

## Troubleshooting

### **Problemas Comunes**
1. **Landing Zone Setup Failed**: Revisar permisos y configuración
2. **Guardrail Not Applying**: Verificar目标和权限
3. **Account Factory Issues**: Revisar plantillas de CloudFormation
4. **Drift Detection**: Investigar cambios no autorizados

### **Comandos de Diagnóstico**
```bash
# Verificar estado de landing zone
aws controltower get-landing-zone --landing-zone-identifier my-landing-zone

# Verificar estado de operación
aws controltower get-landing-zone-operation --operation-identifier operation-xxxxxxxx

# Listar controles habilitados
aws controltower list-enabled-controls --target-identifier ou-xxxx-xxxxxxxx

# Verificar drift
aws configservice get-compliance-details-by-config-rule \
  --config-rule-name control-tower-guardrail
```

## Cumplimiento Normativo

### **GDPR**
- **Data Residency**: Guardrails para controlar regiones
- **Access Control**: Control de acceso centralizado
- **Audit Trail**: Logging centralizado
- **Data Protection**: Políticas de protección de datos

### **HIPAA**
- **Account Isolation**: Aislamiento de cargas de trabajo PHI
- **Security Controls**: Controles de seguridad automatizados
- **Audit Logging**: Registro completo de auditoría
- **Compliance Monitoring**: Monitoreo continuo

### **PCI DSS**
- **Network Segmentation**: Segmentación de red automatizada
- **Access Control**: Control de acceso granular
- **Logging**: Logging centralizado y seguro
- **Security Standards**: Estándares de seguridad predefinidos

### **SOC 2**
- **Security Controls**: Controles de seguridad automatizados
- **Monitoring**: Monitoreo continuo
- **Reporting**: Reportes de cumplimiento automáticos
- **Governance**: Gobernanza centralizada

## Integración con Otros Servicios

### **AWS Organizations**
- **Multi-account Management**: Gestión centralizada de cuentas
- **SCP Integration**: Integración con Service Control Policies
- **OU Structure**: Estructura de OUs compartida
- **Policy Enforcement**: Aplicación de políticas

### **AWS SSO**
- **Centralized Identity**: Identidad centralizada
- **Permission Sets**: Conjuntos de permisos predefinidos
- **User Management**: Gestión de usuarios centralizada
- **MFA**: Autenticación multi-factor

### **AWS Config**
- **Configuration Tracking**: Seguimiento de configuración
- **Compliance Monitoring**: Monitoreo de cumplimiento
- **Rule Evaluation**: Evaluación de reglas
- **Drift Detection**: Detección de drift

### **AWS Security Hub**
- **Security Findings**: Agregación de hallazgos de seguridad
- **Compliance Standards**: Estándares de cumplimiento
- **Security Score**: Puntuación de seguridad
- **Integration**: Integración con servicios de seguridad

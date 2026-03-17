# AWS Root User Privileges and Security

## Definición

El usuario root de AWS es la cuenta de administrador principal que tiene acceso completo y sin restricciones a todos los recursos y servicios de AWS. Aunque es una herramienta poderosa para la administración inicial y emergencias, su uso indebido representa uno de los mayores riesgos de seguridad en cualquier entorno AWS.

## Características del Usuario Root

### **Privilegios Completos**
- **Acceso sin restricciones**: Control total sobre todos los recursos
- **Sin límites de servicio**: No está sujeto a límites de servicio
- **Control de políticas**: Puede crear, modificar y eliminar todas las políticas IAM
- **Gestión de facturación**: Acceso completo a información de facturación y costos
- **Cierre de cuenta**: Puede cerrar la cuenta de AWS

### **Capacidades Especiales**
- **Creación de usuarios IAM**: Puede crear cualquier tipo de usuario IAM
- **Modificación de políticas**: Puede modificar cualquier política IAM existente
- **Acceso a todos los servicios**: Tiene acceso a todos los servicios y APIs
- **Control de organización**: Puede configurar AWS Organizations
- **Gestión de certificados**: Puede administrar todos los certificados y claves

### **Riesgos de Seguridad**
- **Punto único de fallo**: Compromiso total si es comprometido
- **Sin auditoría interna**: No puede ser restringido por políticas IAM
- **Acceso irrestricto**: No se pueden aplicar controles de acceso
- **Visibilidad completa**: Tiene acceso a todos los datos y configuraciones

## Mejores Prácticas de Seguridad

### **1. No Usar el Usuario Root para Operaciones Diarias**
- **Crear usuarios IAM**: Utilizar usuarios IAM con permisos específicos
- **Principio de menor privilegio**: Solo conceder permisos necesarios
- **Separación de responsabilidades**: Diferentes usuarios para diferentes tareas
- **Rotación regular**: Cambiar credenciales regularmente

### **2. Protección de Credenciales Root**
- **Habilitar MFA**: Autenticación multifactor obligatoria
- **Contraseña fuerte**: Contraseña compleja y única
- **Almacenamiento seguro**: Usar gestores de contraseñas
- **No compartir credenciales**: Nunca compartir acceso root

### **3. Monitoreo y Auditoría**
- **CloudTrail**: Habilitar logging de todas las acciones
- **Alertas de seguridad**: Configurar alertas para uso de root
- **Revisión regular**: Auditar periódicamente el uso de root
- **Notificaciones**: Configurar notificaciones para actividades sospechosas

### **4. Procedimientos de Emergencia**
- **Credenciales de emergencia**: Almacenar de forma segura
- **Procedimientos documentados**: Procesos claros para emergencias
- **Acceso limitado**: Solo usar en situaciones críticas
- **Post-incidente**: Rotar credenciales después de emergencias

## Configuración de Seguridad del Usuario Root

### **Gestión Completa de Seguridad Root**
```python
import boto3
import json
import time
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class RootSecurityManager:
    def __init__(self, region='us-east-1'):
        self.iam = boto3.client('iam', region_name=region)
        self.cloudtrail = boto3.client('cloudtrail', region_name=region)
        self.securityhub = boto3.client('securityhub', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.organizations = boto3.client('organizations', region_name=region)
        self.region = region
    
    def analyze_root_account_security(self):
        """Analizar la seguridad de la cuenta root"""
        
        try:
            security_analysis = {
                'root_account': self.get_root_account_info(),
                'security_status': self.assess_root_security(),
                'risk_factors': self.identify_risk_factors(),
                'recommendations': self.generate_root_recommendations(),
                'compliance_status': self.check_compliance_status(),
                'monitoring_status': self.check_monitoring_setup()
            }
            
            return {
                'success': True,
                'security_analysis': security_analysis
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_root_account_info(self):
        """Obtener información de la cuenta root"""
        
        try:
            # Obtener información del usuario root
            response = self.iam.get_user(UserName='root')
            
            root_info = {
                'user_name': response['User']['UserName'],
                'user_id': response['User']['UserId'],
                'arn': response['User']['Arn'],
                'create_date': response['User']['CreateDate'].isoformat() if response['User'].get('CreateDate') else '',
                'password_last_used': response['User'].get('PasswordLastUsed', '').isoformat() if response['User'].get('PasswordLastUsed') else '',
                'tags': response['User'].get('Tags', [])
            }
            
            # Obtener información de MFA
            try:
                mfa_devices = self.iam.list_mfa_devices(UserName='root')
                root_info['mfa_devices'] = mfa_devices['MFADevices']
                root_info['mfa_enabled'] = len(mfa_devices['MFADevices']) > 0
            except Exception:
                root_info['mfa_devices'] = []
                root_info['mfa_enabled'] = False
            
            # Obtener información de claves de acceso
            try:
                access_keys = self.iam.list_access_keys(UserName='root')
                root_info['access_keys'] = access_keys['AccessKeyMetadata']
                root_info['access_keys_count'] = len(access_keys['AccessKeyMetadata'])
            except Exception:
                root_info['access_keys'] = []
                root_info['access_keys_count'] = 0
            
            return root_info
            
        except Exception as e:
            return {'error': str(e)}
    
    def assess_root_security(self):
        """Evaluar el estado de seguridad del usuario root"""
        
        try:
            root_info = self.get_root_account_info()
            
            if 'error' in root_info:
                return {'error': root_info['error']}
            
            security_status = {
                'overall_score': 0,
                'mfa_status': 'UNKNOWN',
                'access_keys_status': 'UNKNOWN',
                'password_status': 'UNKNOWN',
                'last_login_status': 'UNKNOWN',
                'risk_level': 'UNKNOWN'
            }
            
            score = 0
            
            # Evaluar MFA
            if root_info.get('mfa_enabled', False):
                security_status['mfa_status'] = 'ENABLED'
                score += 30
            else:
                security_status['mfa_status'] = 'DISABLED'
                security_status['risk_level'] = 'HIGH'
            
            # Evaluar claves de acceso
            access_keys_count = root_info.get('access_keys_count', 0)
            if access_keys_count == 0:
                security_status['access_keys_status'] = 'NONE'
                score += 25
            elif access_keys_count == 1:
                security_status['access_keys_status'] = 'ONE_KEY'
                score += 10
            else:
                security_status['access_keys_status'] = 'MULTIPLE_KEYS'
                security_status['risk_level'] = 'HIGH'
            
            # Evaluar último uso
            password_last_used = root_info.get('password_last_used', '')
            if password_last_used:
                last_used = datetime.fromisoformat(password_last_used.replace('Z', '+00:00'))
                days_since_last_use = (datetime.utcnow() - last_used).days
                
                if days_since_last_use > 90:
                    security_status['last_login_status'] = 'OLD'
                    score += 20
                elif days_since_last_use > 30:
                    security_status['last_login_status'] = 'RECENT'
                    score += 15
                else:
                    security_status['last_login_status'] = 'VERY_RECENT'
                    score += 5
            else:
                security_status['last_login_status'] = 'NEVER'
                score += 25
            
            # Evaluar riesgo general
            if score >= 70:
                security_status['risk_level'] = 'LOW'
            elif score >= 40:
                security_status['risk_level'] = 'MEDIUM'
            else:
                security_status['risk_level'] = 'HIGH'
            
            security_status['overall_score'] = score
            
            return security_status
            
        except Exception as e:
            return {'error': str(e)}
    
    def identify_risk_factors(self):
        """Identificar factores de riesgo"""
        
        try:
            risk_factors = []
            
            root_info = self.get_root_account_info()
            
            if 'error' in root_info:
                return [{'error': root_info['error']}]
            
            # Verificar MFA
            if not root_info.get('mfa_enabled', False):
                risk_factors.append({
                    'risk_type': 'NO_MFA',
                    'severity': 'CRITICAL',
                    'description': 'Root account does not have MFA enabled',
                    'recommendation': 'Enable MFA for root account immediately'
                })
            
            # Verificar claves de acceso
            access_keys_count = root_info.get('access_keys_count', 0)
            if access_keys_count > 1:
                risk_factors.append({
                    'risk_type': 'MULTIPLE_ACCESS_KEYS',
                    'severity': 'HIGH',
                    'description': f'Root account has {access_keys_count} access keys',
                    'recommendation': 'Remove unnecessary access keys from root account'
                })
            elif access_keys_count == 1:
                risk_factors.append({
                    'risk_type': 'ACTIVE_ACCESS_KEY',
                    'severity': 'MEDIUM',
                    'description': 'Root account has an active access key',
                    'recommendation': 'Delete access key if not needed for automation'
                })
            
            # Verificar último uso reciente
            password_last_used = root_info.get('password_last_used', '')
            if password_last_used:
                last_used = datetime.fromisoformat(password_last_used.replace('Z', '+00:00'))
                days_since_last_use = (datetime.utcnow() - last_used).days
                
                if days_since_last_use < 7:
                    risk_factors.append({
                        'risk_type': 'RECENT_ROOT_USAGE',
                        'severity': 'MEDIUM',
                        'description': f'Root account used {days_since_last_use} days ago',
                        'recommendation': 'Review if root usage was necessary'
                    })
            
            # Verificar políticas de IAM
            try:
                policies = self.iam.list_policies(Scope='Local', OnlyAttached=False, PathPrefix='/')
                root_policies = [p for p in policies['Policies'] if 'root' in p['PolicyName'].lower()]
                
                if root_policies:
                    risk_factors.append({
                        'risk_type': 'ROOT_POLICIES',
                        'severity': 'LOW',
                        'description': 'Found policies potentially related to root account',
                        'recommendation': 'Review and document root-related policies'
                    })
            except Exception:
                pass
            
            return risk_factors
            
        except Exception as e:
            return [{'error': str(e)}]
    
    def generate_root_recommendations(self):
        """Generar recomendaciones de seguridad para root"""
        
        try:
            recommendations = []
            security_status = self.assess_root_security()
            
            if 'error' in security_status:
                return [{'error': security_status['error']}]
            
            # Recomendaciones basadas en estado de seguridad
            if security_status['mfa_status'] == 'DISABLED':
                recommendations.append({
                    'priority': 'CRITICAL',
                    'category': 'MFA',
                    'title': 'Enable MFA for Root Account',
                    'description': 'Enable multi-factor authentication for the root account',
                    'action': 'Configure hardware or virtual MFA device',
                    'risk_reduction': 'HIGH'
                })
            
            if security_status['access_keys_status'] != 'NONE':
                recommendations.append({
                    'priority': 'HIGH',
                    'category': 'ACCESS_KEYS',
                    'title': 'Remove Root Access Keys',
                    'description': 'Delete access keys from root account and use IAM users instead',
                    'action': 'Delete all access keys and create IAM users with appropriate permissions',
                    'risk_reduction': 'HIGH'
                })
            
            if security_status['last_login_status'] == 'VERY_RECENT':
                recommendations.append({
                    'priority': 'MEDIUM',
                    'category': 'USAGE',
                    'title': 'Review Recent Root Usage',
                    'description': 'Review recent root account usage and consider using IAM users',
                    'action': 'Audit recent root activities and create appropriate IAM users',
                    'risk_reduction': 'MEDIUM'
                })
            
            # Recomendaciones generales
            recommendations.extend([
                {
                    'priority': 'HIGH',
                    'category': 'MONITORING',
                    'title': 'Enable Root Account Monitoring',
                    'description': 'Set up monitoring and alerts for root account usage',
                    'action': 'Configure CloudTrail alerts for root account activities',
                    'risk_reduction': 'HIGH'
                },
                {
                    'priority': 'MEDIUM',
                    'category': 'DOCUMENTATION',
                    'title': 'Document Root Access Procedures',
                    'description': 'Create and document procedures for root account access',
                    'action': 'Write SOPs for emergency root account usage',
                    'risk_reduction': 'MEDIUM'
                },
                {
                    'priority': 'LOW',
                    'category': 'TRAINING',
                    'title': 'Train Security Team',
                    'description': 'Train security team on root account best practices',
                    'action': 'Conduct regular security training sessions',
                    'risk_reduction': 'LOW'
                }
            ])
            
            return recommendations
            
        except Exception as e:
            return [{'error': str(e)}]
    
    def check_compliance_status(self):
        """Verificar estado de cumplimiento"""
        
        try:
            compliance_status = {
                'frameworks': {},
                'overall_compliance': 'UNKNOWN'
            }
            
            # Verificar cumplimiento de CIS AWS Foundations Benchmark
            cis_compliance = self.check_cis_compliance()
            compliance_status['frameworks']['CIS'] = cis_compliance
            
            # Verificar cumplimiento de NIST
            nist_compliance = self.check_nist_compliance()
            compliance_status['frameworks']['NIST'] = nist_compliance
            
            # Verificar cumplimiento de SOC 2
            soc2_compliance = self.check_soc2_compliance()
            compliance_status['frameworks']['SOC2'] = soc2_compliance
            
            # Calcular cumplimiento general
            scores = []
            for framework, status in compliance_status['frameworks'].items():
                if status.get('score') is not None:
                    scores.append(status['score'])
            
            if scores:
                avg_score = sum(scores) / len(scores)
                if avg_score >= 90:
                    compliance_status['overall_compliance'] = 'COMPLIANT'
                elif avg_score >= 70:
                    compliance_status['overall_compliance'] = 'PARTIALLY_COMPLIANT'
                else:
                    compliance_status['overall_compliance'] = 'NON_COMPLIANT'
            
            return compliance_status
            
        except Exception as e:
            return {'error': str(e)}
    
    def check_cis_compliance(self):
        """Verificar cumplimiento de CIS AWS Foundations Benchmark"""
        
        try:
            cis_controls = {
                '1.1': {
                    'name': 'Avoid using the root account for daily tasks',
                    'status': 'UNKNOWN',
                    'score': 0,
                    'recommendation': 'Use IAM users for daily operations'
                },
                '1.2': {
                    'name': 'Enable MFA for the root account',
                    'status': 'UNKNOWN',
                    'score': 0,
                    'recommendation': 'Enable multi-factor authentication'
                },
                '1.3': {
                    'name': 'Ensure hardware MFA is enabled for the root account',
                    'status': 'UNKNOWN',
                    'score': 0,
                    'recommendation': 'Use hardware MFA device'
                },
                '1.4': {
                    'name': 'Avoid root account access key usage',
                    'status': 'UNKNOWN',
                    'score': 0,
                    'recommendation': 'Do not use root access keys'
                }
            }
            
            root_info = self.get_root_account_info()
            
            if 'error' not in root_info:
                # Evaluar control 1.1 (uso diario)
                password_last_used = root_info.get('password_last_used', '')
                if password_last_used:
                    last_used = datetime.fromisoformat(password_last_used.replace('Z', '+00:00'))
                    days_since_last_use = (datetime.utcnow() - last_used).days
                    
                    if days_since_last_use > 90:
                        cis_controls['1.1']['status'] = 'COMPLIANT'
                        cis_controls['1.1']['score'] = 100
                    else:
                        cis_controls['1.1']['status'] = 'NON_COMPLIANT'
                        cis_controls['1.1']['score'] = 0
                else:
                    cis_controls['1.1']['status'] = 'COMPLIANT'
                    cis_controls['1.1']['score'] = 100
                
                # Evaluar control 1.2 (MFA)
                if root_info.get('mfa_enabled', False):
                    cis_controls['1.2']['status'] = 'COMPLIANT'
                    cis_controls['1.2']['score'] = 100
                else:
                    cis_controls['1.2']['status'] = 'NON_COMPLIANT'
                    cis_controls['1.2']['score'] = 0
                
                # Evaluar control 1.3 (MFA hardware)
                mfa_devices = root_info.get('mfa_devices', [])
                hardware_mfa = any('mfa' in device.get('SerialNumber', '').lower() for device in mfa_devices)
                
                if hardware_mfa:
                    cis_controls['1.3']['status'] = 'COMPLIANT'
                    cis_controls['1.3']['score'] = 100
                else:
                    cis_controls['1.3']['status'] = 'PARTIALLY_COMPLIANT'
                    cis_controls['1.3']['score'] = 50
                
                # Evaluar control 1.4 (access keys)
                access_keys_count = root_info.get('access_keys_count', 0)
                if access_keys_count == 0:
                    cis_controls['1.4']['status'] = 'COMPLIANT'
                    cis_controls['1.4']['score'] = 100
                else:
                    cis_controls['1.4']['status'] = 'NON_COMPLIANT'
                    cis_controls['1.4']['score'] = 0
            
            # Calcular puntuación general
            total_score = sum(control['score'] for control in cis_controls.values())
            cis_status = {
                'controls': cis_controls,
                'score': total_score / len(cis_controls),
                'status': 'COMPLIANT' if total_score >= 350 else 'PARTIALLY_COMPLIANT' if total_score >= 250 else 'NON_COMPLIANT'
            }
            
            return cis_status
            
        except Exception as e:
            return {'error': str(e)}
    
    def check_nist_compliance(self):
        """Verificar cumplimiento de NIST Cybersecurity Framework"""
        
        try:
            nist_controls = {
                'PR.AC-1': {
                    'name': 'Identities, credentials, and access management',
                    'status': 'UNKNOWN',
                    'score': 0,
                    'recommendation': 'Implement proper identity and access management'
                },
                'PR.AC-7': {
                    'name': 'Identity management, authentication, and access control',
                    'status': 'UNKNOWN',
                    'score': 0,
                    'recommendation': 'Implement strong authentication and access controls'
                },
                'DE.CM-8': {
                    'name': 'Vulnerability scanning',
                    'status': 'UNKNOWN',
                    'score': 0,
                    'recommendation': 'Regular vulnerability scanning of root account'
                }
            }
            
            root_info = self.get_root_account_info()
            
            if 'error' not in root_info:
                # Evaluar PR.AC-1
                if root_info.get('mfa_enabled', False) and root_info.get('access_keys_count', 0) == 0:
                    nist_controls['PR.AC-1']['status'] = 'COMPLIANT'
                    nist_controls['PR.AC-1']['score'] = 90
                else:
                    nist_controls['PR.AC-1']['status'] = 'PARTIALLY_COMPLIANT'
                    nist_controls['PR.AC-1']['score'] = 50
                
                # Evaluar PR.AC-7
                if root_info.get('mfa_enabled', False):
                    nist_controls['PR.AC-7']['status'] = 'COMPLIANT'
                    nist_controls['PR.AC-7']['score'] = 85
                else:
                    nist_controls['PR.AC-7']['status'] = 'NON_COMPLIANT'
                    nist_controls['PR.AC-7']['score'] = 30
                
                # Evaluar DE.CM-8
                nist_controls['DE.CM-8']['status'] = 'PARTIALLY_COMPLIANT'
                nist_controls['DE.CM-8']['score'] = 60
                nist_controls['DE.CM-8']['recommendation'] = 'Implement regular security assessments'
            
            total_score = sum(control['score'] for control in nist_controls.values())
            nist_status = {
                'controls': nist_controls,
                'score': total_score / len(nist_controls),
                'status': 'COMPLIANT' if total_score >= 240 else 'PARTIALLY_COMPLIANT' if total_score >= 180 else 'NON_COMPLIANT'
            }
            
            return nist_status
            
        except Exception as e:
            return {'error': str(e)}
    
    def check_soc2_compliance(self):
        """Verificar cumplimiento de SOC 2"""
        
        try:
            soc2_controls = {
                'CC6.1': {
                    'name': 'Logical access controls',
                    'status': 'UNKNOWN',
                    'score': 0,
                    'recommendation': 'Implement logical access controls'
                },
                'CC6.2': {
                    'name': 'Logical access security',
                    'status': 'UNKNOWN',
                    'score': 0,
                    'recommendation': 'Implement security for logical access'
                },
                'CC7.1': {
                    'name': 'System operations',
                    'status': 'UNKNOWN',
                    'score': 0,
                    'recommendation': 'Document system operations'
                }
            }
            
            root_info = self.get_root_account_info()
            
            if 'error' not in root_info:
                # Evaluar CC6.1
                if root_info.get('mfa_enabled', False):
                    soc2_controls['CC6.1']['status'] = 'COMPLIANT'
                    soc2_controls['CC6.1']['score'] = 85
                else:
                    soc2_controls['CC6.1']['status'] = 'NON_COMPLIANT'
                    soc2_controls['CC6.1']['score'] = 25
                
                # Evaluar CC6.2
                access_keys_count = root_info.get('access_keys_count', 0)
                if access_keys_count == 0:
                    soc2_controls['CC6.2']['status'] = 'COMPLIANT'
                    soc2_controls['CC6.2']['score'] = 90
                else:
                    soc2_controls['CC6.2']['status'] = 'PARTIALLY_COMPLIANT'
                    soc2_controls['CC6.2']['score'] = 60
                
                # Evaluar CC7.1
                soc2_controls['CC7.1']['status'] = 'PARTIALLY_COMPLIANT'
                soc2_controls['CC7.1']['score'] = 70
                soc2_controls['CC7.1']['recommendation'] = 'Document root account usage procedures'
            
            total_score = sum(control['score'] for control in soc2_controls.values())
            soc2_status = {
                'controls': soc2_controls,
                'score': total_score / len(soc2_controls),
                'status': 'COMPLIANT' if total_score >= 240 else 'PARTIALLY_COMPLIANT' if total_score >= 180 else 'NON_COMPLIANT'
            }
            
            return soc2_status
            
        except Exception as e:
            return {'error': str(e)}
    
    def check_monitoring_setup(self):
        """Verificar configuración de monitoreo"""
        
        try:
            monitoring_status = {
                'cloudtrail': self.check_cloudtrail_monitoring(),
                'cloudwatch': self.check_cloudwatch_monitoring(),
                'securityhub': self.check_securityhub_monitoring(),
                'sns': self.check_sns_monitoring(),
                'overall_status': 'UNKNOWN'
            }
            
            # Calcular estado general
            services = ['cloudtrail', 'cloudwatch', 'securityhub', 'sns']
            active_services = sum(1 for service in services if monitoring_status[service].get('enabled', False))
            
            if active_services == 4:
                monitoring_status['overall_status'] = 'FULLY_CONFIGURED'
            elif active_services >= 2:
                monitoring_status['overall_status'] = 'PARTIALLY_CONFIGURED'
            else:
                monitoring_status['overall_status'] = 'MINIMALLY_CONFIGURED'
            
            return monitoring_status
            
        except Exception as e:
            return {'error': str(e)}
    
    def check_cloudtrail_monitoring(self):
        """Verificar monitoreo de CloudTrail"""
        
        try:
            trails = self.cloudtrail.describe_trails()
            
            if trails.get('trailList'):
                # Verificar si hay trails que monitorean eventos de root
                root_monitoring = False
                for trail in trails['trailList']:
                    if trail.get('IncludeGlobalServiceEvents', False):
                        root_monitoring = True
                        break
                
                return {
                    'enabled': True,
                    'trails_count': len(trails['trailList']),
                    'root_monitoring': root_monitoring,
                    'status': 'ACTIVE' if root_monitoring else 'PARTIAL'
                }
            else:
                return {
                    'enabled': False,
                    'trails_count': 0,
                    'root_monitoring': False,
                    'status': 'NOT_CONFIGURED'
                }
                
        except Exception as e:
            return {
                'enabled': False,
                'error': str(e),
                'status': 'ERROR'
            }
    
    def check_cloudwatch_monitoring(self):
        """Verificar monitoreo de CloudWatch"""
        
        try:
            # Verificar alarmas relacionadas con root account
            alarms = self.cloudwatch.describe_alarms()
            
            root_alarms = [
                alarm for alarm in alarms['MetricAlarms']
                if 'root' in alarm.get('AlarmName', '').lower()
            ]
            
            return {
                'enabled': len(alarms['MetricAlarms']) > 0,
                'total_alarms': len(alarms['MetricAlarms']),
                'root_alarms': len(root_alarms),
                'status': 'ACTIVE' if root_alarms else 'NO_ROOT_ALARMS'
            }
            
        except Exception as e:
            return {
                'enabled': False,
                'error': str(e),
                'status': 'ERROR'
            }
    
    def check_securityhub_monitoring(self):
        """Verificar monitoreo de Security Hub"""
        
        try:
            # Verificar si Security Hub está habilitado
            try:
                self.securityhub.describe_hub()
                hub_enabled = True
            except Exception:
                hub_enabled = False
            
            if hub_enabled:
                # Verificar hallazgos relacionados con root
                findings = self.securityhub.get_findings(
                    Filters={
                        'AwsAccountId': [{'Value': '123456789012', 'Comparison': 'EQUALS'}],
                        'SeverityLabel': [{'Value': 'HIGH', 'Comparison': 'GREATER_THAN_OR_EQUAL'}]
                    }
                )
                
                return {
                    'enabled': True,
                    'findings_count': len(findings.get('Findings', [])),
                    'status': 'ACTIVE'
                }
            else:
                return {
                    'enabled': False,
                    'status': 'NOT_ENABLED'
                }
                
        except Exception as e:
            return {
                'enabled': False,
                'error': str(e),
                'status': 'ERROR'
            }
    
    def check_sns_monitoring(self):
        """Verificar monitoreo de SNS"""
        
        try:
            topics = self.sns.list_topics()
            
            # Buscar topics relacionados con seguridad
            security_topics = [
                topic for topic in topics['Topics']
                if any(keyword in topic['TopicArn'].lower() 
                      for keyword in ['security', 'root', 'alert', 'abuse'])
            ]
            
            return {
                'enabled': len(topics['Topics']) > 0,
                'total_topics': len(topics['Topics']),
                'security_topics': len(security_topics),
                'status': 'ACTIVE' if security_topics else 'NO_SECURITY_TOPICS'
            }
            
        except Exception as e:
            return {
                'enabled': False,
                'error': str(e),
                'status': 'ERROR'
            }
    
    def setup_root_monitoring(self, sns_topic_arn=None):
        """Configurar monitoreo del usuario root"""
        
        try:
            monitoring_setup = {
                'cloudtrail': {},
                'cloudwatch': {},
                'securityhub': {},
                'sns': {},
                'lambda_functions': []
            }
            
            # Configurar o verificar CloudTrail
            trail_result = self.setup_cloudtrail_monitoring()
            monitoring_setup['cloudtrail'] = trail_result
            
            # Configurar alarmas de CloudWatch
            alarm_result = self.setup_cloudwatch_alarms(sns_topic_arn)
            monitoring_setup['cloudwatch'] = alarm_result
            
            # Configurar Security Hub
            hub_result = self.setup_securityhub_monitoring()
            monitoring_setup['securityhub'] = hub_result
            
            # Configurar SNS topic
            if sns_topic_arn:
                monitoring_setup['sns']['topic_arn'] = sns_topic_arn
            else:
                topic_result = self.create_security_sns_topic()
                monitoring_setup['sns'] = topic_result
            
            # Crear función Lambda para monitoreo
            lambda_result = self.create_root_monitoring_lambda()
            if lambda_result['success']:
                monitoring_setup['lambda_functions'].append(lambda_result['function_arn'])
            
            return {
                'success': True,
                'monitoring_setup': monitoring_setup
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def setup_cloudtrail_monitoring(self):
        """Configurar monitoreo de CloudTrail"""
        
        try:
            # Verificar si ya existe un trail
            trails = self.cloudtrail.describe_trails()
            
            if trails.get('trailList'):
                return {
                    'success': True,
                    'status': 'ALREADY_EXISTS',
                    'trail_count': len(trails['trailList'])
                }
            
            # Crear nuevo trail
            bucket_name = f'root-monitoring-{int(time.time())}'
            
            # Crear bucket S3
            try:
                self.s3.create_bucket(
                    Bucket=bucket_name,
                    CreateBucketConfiguration={'LocationConstraint': self.region}
                )
            except Exception:
                pass
            
            # Crear trail
            response = self.cloudtrail.create_trail(
                Name='root-monitoring-trail',
                S3BucketName=bucket_name,
                IncludeGlobalServiceEvents=True,
                IsMultiRegionTrail=True,
                EnableLogFileValidation=True
            )
            
            # Habilitar logging
            self.cloudtrail.start_logging(Name=response['TrailARN'])
            
            return {
                'success': True,
                'trail_arn': response['TrailARN'],
                'bucket_name': bucket_name,
                'status': 'CREATED'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def setup_cloudwatch_alarms(self, sns_topic_arn=None):
        """Configurar alarmas de CloudWatch para root"""
        
        try:
            alarms_created = []
            
            # Alarma para uso de root account
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='RootAccountUsage',
                    AlarmDescription='Alarm for root account usage',
                    Namespace='AWS/CloudTrail',
                    MetricName='RootAccountUsageCount',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn] if sns_topic_arn else []
                )
                alarms_created.append('RootAccountUsage')
            except Exception:
                pass
            
            # Alarma para cambios en políticas de IAM
            try:
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName='RootIAMPolicyChanges',
                    AlarmDescription='Alarm for IAM policy changes by root',
                    Namespace='AWS/IAM',
                    MetricName='IAMPolicyChanges',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=1,
                    Threshold=1,
                    ComparisonOperator='GreaterThanOrEqualToThreshold',
                    TreatMissingData='missing',
                    AlarmActions=[sns_topic_arn] if sns_topic_arn else []
                )
                alarms_created.append('RootIAMPolicyChanges')
            except Exception:
                pass
            
            return {
                'success': True,
                'alarms_created': alarms_created,
                'count': len(alarms_created)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def setup_securityhub_monitoring(self):
        """Configurar monitoreo de Security Hub"""
        
        try:
            # Verificar si Security Hub está habilitado
            try:
                self.securityhub.describe_hub()
                return {
                    'success': True,
                    'status': 'ALREADY_ENABLED'
                }
            except Exception:
                pass
            
            # Habilitar Security Hub
            response = self.securityhub.enable_security_hub()
            
            return {
                'success': True,
                'status': 'ENABLED',
                'subscribed_arn': response.get('SubscribedArn', '')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_security_sns_topic(self):
        """Crear SNS topic para alertas de seguridad"""
        
        try:
            response = self.sns.create_topic(
                Name='root-security-alerts',
                Tags=[
                    {'Key': 'Purpose', 'Value': 'RootAccountMonitoring'},
                    {'Key': 'Security', 'Value': 'Alerts'}
                ]
            )
            
            return {
                'success': True,
                'topic_arn': response['TopicArn'],
                'topic_name': 'root-security-alerts'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_root_monitoring_lambda(self):
        """Crear función Lambda para monitoreo de root"""
        
        try:
            lambda_code = self._get_root_monitoring_lambda_code()
            
            # Crear rol de ejecución
            role_arn = self._create_lambda_execution_role('root-monitoring-role')
            
            # Crear función Lambda
            response = self.lambda_client.create_function(
                FunctionName='root-monitoring',
                Runtime='python3.9',
                Role=role_arn,
                Handler='lambda_function.lambda_handler',
                Code={
                    'ZipFile': lambda_code
                },
                Description='Lambda function for root account monitoring',
                Timeout=300,
                Environment={
                    'Variables': {
                        'SNS_TOPIC_ARN': f'arn:aws:sns:{self.region}:123456789012:root-security-alerts'
                    }
                }
            )
            
            return {
                'success': True,
                'function_name': 'root-monitoring',
                'function_arn': response['FunctionArn'],
                'role_arn': role_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_root_monitoring_lambda_code(self):
        """Obtener código de Lambda para monitoreo de root"""
        
        return '''
import json
import boto3
import os
from datetime import datetime

def lambda_handler(event, context):
    sns = boto3.client('sns')
    cloudtrail = boto3.client('cloudtrail')
    
    # Analizar evento de CloudTrail
    event_analysis = analyze_cloudtrail_event(event)
    
    if event_analysis['is_root_activity']:
        # Enviar alerta
        alert = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': 'ROOT_ACCOUNT_ACTIVITY',
            'user': event.get('userIdentity', {}).get('userName', 'unknown'),
            'source_ip': event.get('sourceIPAddress', 'unknown'),
            'event_name': event.get('eventName', 'unknown'),
            'event_source': event.get('eventSource', 'unknown'),
            'risk_level': event_analysis['risk_level'],
            'recommendations': event_analysis['recommendations']
        }
        
        sns.publish(
            TopicArn=os.environ['SNS_TOPIC_ARN'],
            Subject=f'Root Account Alert: {event["eventName"]}',
            Message=json.dumps(alert),
            MessageStructure='string'
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Root account activity detected and alert sent',
                'risk_level': event_analysis['risk_level']
            })
        }
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'No root account activity detected'})
    }

def analyze_cloudtrail_event(event):
    """Analizar evento de CloudTrail para actividad de root"""
    
    analysis = {
        'is_root_activity': False,
        'risk_level': 'LOW',
        'recommendations': []
    }
    
    # Verificar si es actividad de root
    user_identity = event.get('userIdentity', {})
    user_name = user_identity.get('userName', '')
    
    if user_name == 'root':
        analysis['is_root_activity'] = True
        
        # Evaluar nivel de riesgo
        event_name = event.get('eventName', '')
        event_source = event.get('eventSource', '')
        
        high_risk_events = [
            'CreateAccessKey', 'DeleteAccessKey', 'UpdateAccessKey',
            'CreateUser', 'DeleteUser', 'UpdateUser',
            'CreateRole', 'DeleteRole', 'UpdateRole',
            'CreatePolicy', 'DeletePolicy', 'UpdatePolicy',
            'AttachUserPolicy', 'DetachUserPolicy',
            'AttachRolePolicy', 'DetachRolePolicy'
        ]
        
        if event_name in high_risk_events:
            analysis['risk_level'] = 'HIGH'
            analysis['recommendations'].append(f'High-risk event detected: {event_name}')
        elif event_name in ['ConsoleLogin', 'GetCallerIdentity']:
            analysis['risk_level'] = 'MEDIUM'
            analysis['recommendations'].append(f'Medium-risk event detected: {event_name}')
        else:
            analysis['risk_level'] = 'LOW'
            analysis['recommendations'].append(f'Low-risk event detected: {event_name}')
        
        # Agregar recomendaciones generales
        analysis['recommendations'].append('Review if root access was necessary')
        analysis['recommendations'].append('Consider using IAM users instead')
    
    return analysis
'''
    
    def _create_lambda_execution_role(self, role_name):
        """Crear rol de ejecución para Lambda"""
        
        try:
            # Verificar si el rol ya existe
            try:
                response = self.iam.get_role(RoleName=role_name)
                return response['Role']['Arn']
            except self.iam.exceptions.NoSuchEntityException:
                pass
            
            # Crear política de confianza
            trust_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "lambda.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }
            
            # Crear rol
            response = self.iam.create_role(
                RoleName=role_name,
                AssumeRolePolicyDocument=json.dumps(trust_policy),
                Description='Execution role for root monitoring Lambda',
                Tags=[
                    {'Key': 'Service', 'Value': 'Lambda'},
                    {'Key': 'Purpose', 'Value': 'RootMonitoring'}
                ]
            )
            
            role_arn = response['Role']['Arn']
            
            # Adjuntar políticas necesarias
            policies = [
                'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
                'arn:aws:iam::aws:policy/CloudWatchLogsFullAccess',
                'arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess'
            ]
            
            for policy_arn in policies:
                self.iam.attach_role_policy(
                    RoleName=role_name,
                    PolicyArn=policy_arn
                )
            
            # Esperar a que el rol esté disponible
            time.sleep(10)
            
            return role_arn
            
        except Exception as e:
            raise Exception(f"Failed to create Lambda execution role: {str(e)}")
    
    def generate_root_security_report(self, report_type='comprehensive'):
        """Generar reporte de seguridad del usuario root"""
        
        try:
            report = {
                'report_metadata': {
                    'report_type': report_type,
                    'generated_at': datetime.utcnow().isoformat()
                }
            }
            
            if report_type == 'comprehensive':
                # Análisis completo de seguridad
                security_analysis = self.analyze_root_account_security()
                if security_analysis['success']:
                    report['security_analysis'] = security_analysis['security_analysis']
                
                # Estado de cumplimiento
                report['compliance_status'] = self.check_compliance_status()
                
                # Estado de monitoreo
                report['monitoring_status'] = self.check_monitoring_setup()
                
                # Recomendaciones
                report['recommendations'] = self.generate_root_recommendations()
                
                # Métricas de seguridad
                report['security_metrics'] = self.calculate_security_metrics()
            
            elif report_type == 'executive':
                # Reporte ejecutivo
                report['executive_summary'] = {
                    'overall_risk_level': 'UNKNOWN',
                    'critical_issues': 0,
                    'compliance_score': 0,
                    'key_recommendations': []
                }
                
                security_analysis = self.analyze_root_account_security()
                if security_analysis['success']:
                    report['executive_summary']['overall_risk_level'] = security_analysis['security_analysis']['security_status']['risk_level']
                    report['executive_summary']['critical_issues'] = len([r for r in security_analysis['security_analysis']['risk_factors'] if r['severity'] == 'CRITICAL'])
                
                compliance_status = self.check_compliance_status()
                if 'overall_compliance' in compliance_status:
                    report['executive_summary']['compliance_score'] = self._calculate_compliance_score(compliance_status)
                
                recommendations = self.generate_root_recommendations()
                critical_recommendations = [r for r in recommendations if r['priority'] == 'CRITICAL']
                report['executive_summary']['key_recommendations'] = critical_recommendations[:3]
            
            elif report_type == 'technical':
                # Reporte técnico
                report['technical_details'] = {
                    'root_account_info': self.get_root_account_info(),
                    'security_status': self.assess_root_security(),
                    'risk_factors': self.identify_risk_factors(),
                    'monitoring_configuration': self.check_monitoring_setup()
                }
            
            return {
                'success': True,
                'root_security_report': report
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _calculate_compliance_score(self, compliance_status):
        """Calcular puntuación de cumplimiento"""
        
        if 'frameworks' not in compliance_status:
            return 0
        
        frameworks = compliance_status['frameworks']
        scores = []
        
        for framework, status in frameworks.items():
            if 'score' in status:
                scores.append(status['score'])
        
        return sum(scores) / len(scores) if scores else 0
    
    def calculate_security_metrics(self):
        """Calcular métricas de seguridad"""
        
        try:
            metrics = {
                'security_score': 0,
                'risk_score': 0,
                'compliance_score': 0,
                'monitoring_score': 0,
                'overall_health': 'UNKNOWN'
            }
            
            # Calcular puntuación de seguridad
            security_status = self.assess_root_security()
            if 'error' not in security_status:
                metrics['security_score'] = security_status['overall_score']
            
            # Calcular puntuación de riesgo
            risk_factors = self.identify_risk_factors()
            if 'error' not in risk_factors:
                critical_risks = len([r for r in risk_factors if r.get('severity') == 'CRITICAL'])
                high_risks = len([r for r in risk_factors if r.get('severity') == 'HIGH'])
                metrics['risk_score'] = max(0, 100 - (critical_risks * 40 + high_risks * 20))
            
            # Calcular puntuación de cumplimiento
            compliance_status = self.check_compliance_status()
            if 'error' not in compliance_status:
                metrics['compliance_score'] = self._calculate_compliance_score(compliance_status)
            
            # Calcular puntuación de monitoreo
            monitoring_status = self.check_monitoring_setup()
            if 'error' not in monitoring_status:
                if monitoring_status['overall_status'] == 'FULLY_CONFIGURED':
                    metrics['monitoring_score'] = 100
                elif monitoring_status['overall_status'] == 'PARTIALLY_CONFIGURED':
                    metrics['monitoring_score'] = 60
                else:
                    metrics['monitoring_score'] = 30
            
            # Calcular salud general
            scores = [metrics['security_score'], metrics['risk_score'], 
                     metrics['compliance_score'], metrics['monitoring_score']]
            avg_score = sum(scores) / len(scores)
            
            if avg_score >= 80:
                metrics['overall_health'] = 'EXCELLENT'
            elif avg_score >= 60:
                metrics['overall_health'] = 'GOOD'
            elif avg_score >= 40:
                metrics['overall_health'] = 'FAIR'
            else:
                metrics['overall_health'] = 'POOR'
            
            return metrics
            
        except Exception as e:
            return {'error': str(e)}
```

## Casos de Uso

### **1. Analizar Seguridad del Usuario Root**
```python
# Ejemplo: Analizar seguridad completa del usuario root
manager = RootSecurityManager('us-east-1')

analysis_result = manager.analyze_root_account_security()

if analysis_result['success']:
    analysis = analysis_result['security_analysis']
    
    print(f"Root Account Security Analysis")
    print(f"Overall Risk Level: {analysis['security_status']['risk_level']}")
    print(f"Security Score: {analysis['security_status']['overall_score']}")
    print(f"MFA Status: {analysis['security_status']['mfa_status']}")
    print(f"Access Keys: {analysis['security_status']['access_keys_status']}")
    print(f"Risk Factors: {len(analysis['risk_factors'])}")
    
    # Mostrar recomendaciones
    for recommendation in analysis['recommendations']:
        print(f"Recommendation: {recommendation['title']} ({recommendation['priority']})")
```

### **2. Configurar Monitoreo del Usuario Root**
```python
# Ejemplo: Configurar monitoreo completo
monitoring_result = manager.setup_root_monitoring()

if monitoring_result['success']:
    setup = monitoring_result['monitoring_setup']
    print(f"Root monitoring configured")
    print(f"CloudTrail: {setup['cloudtrail'].get('status', 'UNKNOWN')}")
    print(f"CloudWatch Alarms: {len(setup['cloudwatch'].get('alarms_created', []))}")
    print(f"Security Hub: {setup['securityhub'].get('status', 'UNKNOWN')}")
    print(f"Lambda Functions: {len(setup['lambda_functions'])}")
```

### **3. Generar Reporte de Seguridad**
```python
# Ejemplo: Generar reporte ejecutivo
report_result = manager.generate_root_security_report(report_type='executive')

if report_result['success']:
    report = report_result['root_security_report']
    summary = report['executive_summary']
    
    print(f"Executive Summary")
    print(f"Overall Risk Level: {summary['overall_risk_level']}")
    print(f"Critical Issues: {summary['critical_issues']}")
    print(f"Compliance Score: {summary['compliance_score']:.1f}")
    print(f"Key Recommendations: {len(summary['key_recommendations'])}")
```

### **4. Verificar Cumplimiento**
```python
# Ejemplo: Verificar cumplimiento de múltiples frameworks
compliance_result = manager.check_compliance_status()

if compliance_result['success']:
    compliance = compliance_result['compliance_status']
    
    print(f"Compliance Status")
    print(f"Overall: {compliance['overall_compliance']}")
    
    for framework, status in compliance['frameworks'].items():
        print(f"{framework}: {status['status']} (Score: {status['score']:.1f})")
```

### **5. Identificar Factores de Riesgo**
```python
# Ejemplo: Identificar factores de riesgo
risk_factors = manager.identify_risk_factors()

if risk_factors and 'error' not in risk_factors[0]:
    print(f"Risk Factors Found: {len(risk_factors)}")
    
    for risk in risk_factors:
        print(f"Risk: {risk['risk_type']} ({risk['severity']})")
        print(f"  Description: {risk['description']}")
        print(f"  Recommendation: {risk['recommendation']}")
```

## Configuración con AWS CLI

### **Verificar Estado del Usuario Root**
```bash
# Obtener información del usuario root
aws iam get-user --user-name root

# Listar dispositivos MFA del usuario root
aws iam list-mfa-devices --user-name root

# Listar claves de acceso del usuario root
aws iam list-access-keys --user-name root
```

### **Configurar MFA para Root**
```bash
# Habilitar MFA virtual
aws iam enable-mfa-device \
  --user-name root \
  --serial-number arn:aws:iam::123456789012:mfa/root-device \
  --authentication-code-1 123456 \
  --authentication-code-2 654321

# Habilitar MFA hardware
aws iam enable-mfa-device \
  --user-name root \
  --serial-number GAHT12345678 \
  --authentication-code-1 123456789012
```

### **Configurar Monitoreo**
```bash
# Crear trail de CloudTrail
aws cloudtrail create-trail \
  --name root-monitoring-trail \
  --s3-bucket-name my-cloudtrail-bucket \
  --include-global-service-events \
  --is-multi-region-trail

# Crear alarma de CloudWatch
aws cloudwatch put-metric-alarm \
  --alarm-name RootAccountUsage \
  --alarm-description "Alarm for root account usage" \
  --metric-name RootAccountUsageCount \
  --namespace AWS/CloudTrail \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold
```

### **Configurar Security Hub**
```bash
# Habilitar Security Hub
aws securityhub enable-security-hub

# Importar hallazgos personalizados
aws securityhub batch-import-findings \
  --findings file://root-findings.json
```

## Mejores Prácticas

### **1. Seguridad de Credenciales**
- **Habilitar MFA obligatorio**: Siempre usar MFA para root
- **Contraseña fuerte**: Contraseña compleja y única
- **Rotación regular**: Cambiar contraseña cada 90 días
- **Almacenamiento seguro**: Usar gestores de contraseñas

### **2. Uso del Usuario Root**
- **No uso diario**: Nunca usar root para operaciones diarias
- **Emergencias solo**: Usar solo en situaciones críticas
- **Documentación**: Documentar cada uso de root
- **Post-incidente**: Rotar credenciales después de emergencias

### **3. Monitoreo y Auditoría**
- **CloudTrail completo**: Habilitar logging de todas las acciones
- **Alertas automáticas**: Configurar alertas para uso de root
- **Revisión regular**: Auditar uso de root mensualmente
- **Notificaciones**: Configurar notificaciones inmediatas

### **4. Gestión de Acceso**
- **Usuarios IAM**: Crear usuarios IAM para diferentes roles
- **Principio de menor privilegio**: Conceder solo permisos necesarios
- **Roles de servicio**: Usar roles para aplicaciones
- **Políticas claras**: Definir políticas de acceso claras

## Costos

### **Precios de Servicios de AWS**
- **CloudTrail**: $5.00 por trail por mes + $0.10 por 100,000 eventos
- **CloudWatch**: $0.10 por métrica por mes + $0.05 por alarmas
- **Security Hub**: $1.00 por miembro por mes
- **Lambda**: $0.20 por 1M requests + $0.00001667 por GB-segundo
- **SNS**: $0.50 por millón de publicaciones

### **Ejemplo de Costos Mensuales**
- **CloudTrail**: $5.00 + $2.00 = $7.00
- **CloudWatch**: $2.00 + $0.50 = $2.50
- **Security Hub**: $1.00
- **Lambda**: $1.00 + $0.50 = $1.50
- **SNS**: $0.50
- **Total estimado**: ~$12.50 por mes

## Troubleshooting

### **Problemas Comunes**
1. **MFA no funciona**: Verificar configuración del dispositivo MFA
2. **No se puede acceder**: Verificar credenciales y políticas de IAM
3. **Alertas no funcionan**: Revisar configuración de CloudWatch y SNS
4. **Logs no aparecen**: Verificar configuración de CloudTrail

### **Comandos de Diagnóstico**
```bash
# Verificar estado del usuario root
aws iam get-user --user-name root

# Verificar dispositivos MFA
aws iam list-mfa-devices --user-name root

# Verificar claves de acceso
aws iam list-access-keys --user-name root

# Verificar estado de CloudTrail
aws cloudtrail describe-trails

# Verificar alarmas de CloudWatch
aws cloudwatch describe-alarms --alarm-names RootAccountUsage
```

## Cumplimiento Normativo

### **CIS AWS Foundations Benchmark**
- **Control 1.1**: Evitar usar la cuenta root para tareas diarias
- **Control 1.2**: Habilitar MFA para la cuenta root
- **Control 1.3**: Asegurar que el hardware MFA esté habilitado
- **Control 1.4**: Evitar el uso de claves de acceso de root

### **NIST Cybersecurity Framework**
- **PR.AC-1**: Gestión de identidades, credenciales y acceso
- **PR.AC-7**: Gestión de identidades, autenticación y control de acceso
- **DE.CM-8**: Escaneo de vulnerabilidades
- **IR.RP-1**: Plan de respuesta a incidentes

### **SOC 2**
- **CC6.1**: Controles de acceso lógico
- **CC6.2**: Seguridad de acceso lógico
- **CC7.1**: Operaciones del sistema
- **CC7.2**: Capacidades de soporte

### **PCI-DSS**
- **Requerimiento 7**: Restricción de acceso a datos
- **Requerimiento 8**: Identificación y autenticación
- **Requerimiento 10**: Monitoreo y logging
- **Requerimiento 12**: Políticas de seguridad

## Integración con Otros Servicios

### **AWS IAM**
- **Usuarios y Roles**: Creación y gestión de usuarios IAM
- **Políticas**: Definición de políticas de acceso
- **Grupos**: Organización de usuarios en grupos
- **Roles de Servicio**: Roles para aplicaciones y servicios

### **AWS CloudTrail**
- **Auditoría**: Registro de todas las acciones de AWS
- **Eventos**: Captura de eventos de API y consola
- **Logs**: Almacenamiento y análisis de logs
- **Compliance**: Cumplimiento normativo

### **AWS Security Hub**
- **Centralización**: Vista centralizada de seguridad
- **Hallazgos**: Agregación de hallazgos de seguridad
- **Cumplimiento**: Evaluación de cumplimiento
- **Automatización**: Respuestas automatizadas

### **AWS CloudWatch**
- **Monitoreo**: Monitoreo de métricas y logs
- **Alarmas**: Alertas automáticas basadas en umbrales
- **Dashboards**: Visualización de métricas
- **Eventos**: Respuesta a eventos de CloudWatch

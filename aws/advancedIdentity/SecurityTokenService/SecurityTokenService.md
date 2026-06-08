# AWS Security Token Service (STS)

## Definición

AWS Security Token Service (STS) es un servicio web que permite a los usuarios solicitar credenciales de seguridad temporales con privilegios limitados para usuarios de AWS o usuarios federados. STS es fundamental para la gestión de identidad y acceso en AWS, proporcionando un mecanismo seguro para conceder acceso temporal a recursos AWS sin necesidad de compartir credenciales a largo plazo.

## Características Principales

### **Gestión de Credenciales Temporales**
- **Temporary Credentials**: Credenciales de seguridad temporales con vida útil limitada
- **Fine-grained Permissions**: Permisos granulares basados en políticas de IAM
- **Session Tokens**: Tokens de sesión para autenticación temporal
- **Access Key Rotation**: Rotación automática de claves de acceso
- **Cross-account Access**: Acceso seguro entre cuentas AWS

### **Federación de Identidad**
- **Identity Federation**: Federación con proveedores de identidad externos
- **Web Identity Federation**: Federación con proveedores de identidad web (Google, Facebook, Amazon)
- **SAML Federation**: Federación con proveedores SAML 2.0
- **OpenID Connect**: Soporte para OpenID Connect
- **AD Federation**: Federación con Active Directory

### **Control de Acceso**
- **Role-based Access**: Acceso basado en roles con permisos específicos
- **Assume Role**: Delegación de permisos temporal
- **Trust Relationships**: Relaciones de confianza entre cuentas y servicios
- **Policy Evaluation**: Evaluación dinámica de políticas
- **Session Policies**: Políticas específicas para sesiones temporales

### **Seguridad y Cumplimiento**
- **Multi-factor Authentication**: Soporte para MFA en sesiones temporales
- **Session Duration**: Configuración de duración de sesiones
- **Credential Scoping**: Alcance limitado de credenciales
- **Audit Logging**: Registro de auditoría de todas las operaciones
- **Compliance Standards**: Cumplimiento de estándares de seguridad

## Tipos de Operaciones STS

### **Operaciones Principales**
```
STS Operations Structure
├── AssumeRole
│   ├── Description: Asumir un rol temporalmente
│   ├── Use Case: Delegación de permisos entre cuentas
│   ├── Duration: 15 minutos - 12 horas
│   ├── Requirements: Política de confianza del rol
│   └── Output: Credenciales temporales
├── AssumeRoleWithWebIdentity
│   ├── Description: Asumir rol con identidad web
│   ├── Use Case: Aplicaciones móviles y web
│   ├── Providers: Google, Facebook, Amazon, etc.
│   ├── Duration: 15 minutos - 1 hora
│   └── Output: Credenciales temporales
├── AssumeRoleWithSAML
│   ├── Description: Asumir rol con SAML
│   ├── Use Case: Federación empresarial
│   ├── Providers: ADFS, Okta, etc.
│   ├── Duration: 15 minutos - 12 horas
│   └── Output: Credenciales temporales
├── GetFederationToken
│   ├── Description: Obtener token federado
│   ├── Use Case: Acceso federado directo
│   ├── Duration: 15 minutos - 36 horas
│   ├── Requirements: Usuario IAM existente
│   └── Output: Credenciales federadas
└── GetSessionToken
    ├── Description: Obtener token de sesión
    ├── Use Case: MFA y sesiones temporales
    ├── Duration: 15 minutos - 36 horas
    ├── Requirements: Usuario IAM existente
    └── Output: Credenciales temporales
```

### **Tipos de Credenciales**
```
Credentials Types
├── Access Key ID
│   ├── Description: Identificador de clave de acceso
│   ├── Format: 20 caracteres alfanuméricos
│   ├── Usage: Identificación de credenciales
│   ├── Rotation: Automática con cada sesión
│   └── Security: Pública, no sensible
├── Secret Access Key
│   ├── Description: Clave de acceso secreta
│   ├── Format: 40 caracteres alfanuméricos
│   ├── Usage: Firma de solicitudes AWS
│   ├── Rotation: Automática con cada sesión
│   └── Security: Altamente sensible
├── Session Token
│   ├── Description: Token de sesión temporal
│   ├── Format: Token único por sesión
│   ├── Usage: Verificación de temporalidad
│   ├── Rotation: Cada nueva sesión
│   └── Security: Requerido para credenciales temporales
└── Expiration Time
    ├── Description: Tiempo de expiración
    ├── Format: Timestamp UTC
    ├── Usage: Validación de sesión
    ├── Rotation: Fija por configuración
    └── Security: No extensible después de expirar
```

## Configuración de AWS STS

### **Gestión Completa de Security Token Service**
```python
import boto3
import json
import time
import jwt
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Union, Tuple
from dataclasses import dataclass
from enum import Enum

class SecurityTokenServiceManager:
    """Gestor completo de AWS Security Token Service"""
    
    def __init__(self, region='us-east-1'):
        self.sts = boto3.client('sts', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.cognito = boto3.client('cognito-identity', region_name=region)
        self.region = region
        self.account_id = boto3.client('sts').get_caller_identity()['Account']
        
        # Inicializar componentes
        self.role_manager = STSRoleManager(self.sts, self.iam)
        self.federation_manager = STSFederationManager(self.sts, self.cognito)
        self.session_manager = STSSessionManager(self.sts)
        self.security_manager = STSSecurityManager(self.sts, self.iam)
        self.audit_manager = STSAuditManager(self.sts)
        
        # Configuración de seguridad
        self.security_config = {
            'default_session_duration': 3600,  # 1 hora
            'max_session_duration': 43200,      # 12 horas
            'require_mfa': True,
            'audit_logging': True,
            'credential_rotation': True
        }
    
    def assume_role(self, role_arn: str, session_name: str, 
                   policy_arn: str = None, duration_seconds: int = None,
                   external_id: str = None, serial_number: str = None,
                   token_code: str = None) -> Dict:
        """Asumir un rol AWS"""
        
        try:
            # Validar parámetros
            validation_result = self._validate_assume_role_params(
                role_arn, session_name, duration_seconds
            )
            if not validation_result['valid']:
                return {
                    'success': False,
                    'error': validation_result['error']
                }
            
            # Construir parámetros de la solicitud
            assume_params = {
                'RoleArn': role_arn,
                'RoleSessionName': session_name,
                'DurationSeconds': duration_seconds or self.security_config['default_session_duration']
            }
            
            # Agregar parámetros opcionales
            if policy_arn:
                assume_params['PolicyArns'] = [{'arn': policy_arn}]
            
            if external_id:
                assume_params['ExternalId'] = external_id
            
            if serial_number and token_code:
                assume_params['SerialNumber'] = serial_number
                assume_params['TokenCode'] = token_code
            
            # Ejecutar AssumeRole
            response = self.sts.assume_role(**assume_params)
            
            # Procesar credenciales
            credentials = response['Credentials']
            
            # Formatear respuesta
            result = {
                'success': True,
                'credentials': {
                    'access_key_id': credentials['AccessKeyId'],
                    'secret_access_key': credentials['SecretAccessKey'],
                    'session_token': credentials['SessionToken'],
                    'expiration': credentials['Expiration'].isoformat(),
                    'duration_seconds': duration_seconds or self.security_config['default_session_duration']
                },
                'assumed_role_user': {
                    'assumed_role_id': response['AssumedRoleUser']['AssumedRoleId'],
                    'arn': response['AssumedRoleUser']['Arn']
                },
                'role_arn': role_arn,
                'session_name': session_name,
                'assumed_at': datetime.utcnow().isoformat()
            }
            
            # Registrar auditoría
            if self.security_config['audit_logging']:
                self._log_assume_role_event(result)
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def assume_role_with_web_identity(self, role_arn: str, role_session_name: str,
                                    web_identity_token: str, provider_id: str = None,
                                    policy_arn: str = None, duration_seconds: int = None) -> Dict:
        """Asumir rol con identidad web"""
        
        try:
            # Validar token web
            token_validation = self._validate_web_identity_token(web_identity_token)
            if not token_validation['valid']:
                return {
                    'success': False,
                    'error': token_validation['error']
                }
            
            # Construir parámetros
            assume_params = {
                'RoleArn': role_arn,
                'RoleSessionName': role_session_name,
                'WebIdentityToken': web_identity_token,
                'DurationSeconds': duration_seconds or 3600
            }
            
            if provider_id:
                assume_params['ProviderId'] = provider_id
            
            if policy_arn:
                assume_params['PolicyArns'] = [{'arn': policy_arn}]
            
            # Ejecutar AssumeRoleWithWebIdentity
            response = self.sts.assume_role_with_web_identity(**assume_params)
            
            # Procesar respuesta
            credentials = response['Credentials']
            
            result = {
                'success': True,
                'credentials': {
                    'access_key_id': credentials['AccessKeyId'],
                    'secret_access_key': credentials['SecretAccessKey'],
                    'session_token': credentials['SessionToken'],
                    'expiration': credentials['Expiration'].isoformat()
                },
                'assumed_role_user': {
                    'assumed_role_id': response['AssumedRoleUser']['AssumedRoleId'],
                    'arn': response['AssumedRoleUser']['Arn']
                },
                'subject_from_web_identity_token': response['SubjectFromWebIdentityToken'],
                'audience': response['Audience'],
                'assumed_at': datetime.utcnow().isoformat()
            }
            
            # Registrar auditoría
            if self.security_config['audit_logging']:
                self._log_web_identity_assume_event(result)
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def assume_role_with_saml(self, role_arn: str, principal_arn: str,
                            saml_assertion: str, policy_arn: str = None,
                            duration_seconds: int = None) -> Dict:
        """Asumir rol con SAML"""
        
        try:
            # Validar aserción SAML
            saml_validation = self._validate_saml_assertion(saml_assertion)
            if not saml_validation['valid']:
                return {
                    'success': False,
                    'error': saml_validation['error']
                }
            
            # Construir parámetros
            assume_params = {
                'RoleArn': role_arn,
                'PrincipalArn': principal_arn,
                'SAMLAssertion': saml_assertion,
                'DurationSeconds': duration_seconds or self.security_config['default_session_duration']
            }
            
            if policy_arn:
                assume_params['PolicyArns'] = [{'arn': policy_arn}]
            
            # Ejecutar AssumeRoleWithSAML
            response = self.sts.assume_role_with_saml(**assume_params)
            
            # Procesar respuesta
            credentials = response['Credentials']
            
            result = {
                'success': True,
                'credentials': {
                    'access_key_id': credentials['AccessKeyId'],
                    'secret_access_key': credentials['SecretAccessKey'],
                    'session_token': credentials['SessionToken'],
                    'expiration': credentials['Expiration'].isoformat()
                },
                'assumed_role_user': {
                    'assumed_role_id': response['AssumedRoleUser']['AssumedRoleId'],
                    'arn': response['AssumedRoleUser']['Arn']
                },
                'subject': response['Subject'],
                'subject_type': response['SubjectType'],
                'issuer': response['Issuer'],
                'audience': response['Audience'],
                'name_qualifier': response.get('NameQualifier', ''),
                'assumed_at': datetime.utcnow().isoformat()
            }
            
            # Registrar auditoría
            if self.security_config['audit_logging']:
                self._log_saml_assume_event(result)
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_federation_token(self, name: str, policy: str = None,
                           duration_seconds: int = None, tags: List[Dict] = None) -> Dict:
        """Obtener token federado"""
        
        try:
            # Validar parámetros
            validation_result = self._validate_federation_token_params(name, duration_seconds)
            if not validation_result['valid']:
                return {
                    'success': False,
                    'error': validation_result['error']
                }
            
            # Construir parámetros
            token_params = {
                'Name': name,
                'DurationSeconds': duration_seconds or self.security_config['default_session_duration']
            }
            
            if policy:
                token_params['Policy'] = policy
            
            if tags:
                token_params['Tags'] = tags
            
            # Ejecutar GetFederationToken
            response = self.sts.get_federation_token(**token_params)
            
            # Procesar respuesta
            credentials = response['Credentials']
            federated_user = response['FederatedUser']
            
            result = {
                'success': True,
                'credentials': {
                    'access_key_id': credentials['AccessKeyId'],
                    'secret_access_key': credentials['SecretAccessKey'],
                    'session_token': credentials['SessionToken'],
                    'expiration': credentials['Expiration'].isoformat()
                },
                'federated_user': {
                    'federated_user_id': federated_user['FederatedUserId'],
                    'arn': federated_user['Arn']
                },
                'packed_policy_size': response.get('PackedPolicySize', 0),
                'issued_at': datetime.utcnow().isoformat()
            }
            
            # Registrar auditoría
            if self.security_config['audit_logging']:
                self._log_federation_token_event(result)
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_session_token(self, duration_seconds: int = None, 
                         serial_number: str = None, token_code: str = None) -> Dict:
        """Obtener token de sesión"""
        
        try:
            # Validar parámetros
            validation_result = self._validate_session_token_params(duration_seconds)
            if not validation_result['valid']:
                return {
                    'success': False,
                    'error': validation_result['error']
                }
            
            # Construir parámetros
            token_params = {
                'DurationSeconds': duration_seconds or self.security_config['default_session_duration']
            }
            
            if serial_number and token_code:
                token_params['SerialNumber'] = serial_number
                token_params['TokenCode'] = token_code
            
            # Ejecutar GetSessionToken
            response = self.sts.get_session_token(**token_params)
            
            # Procesar respuesta
            credentials = response['Credentials']
            
            result = {
                'success': True,
                'credentials': {
                    'access_key_id': credentials['AccessKeyId'],
                    'secret_access_key': credentials['SecretAccessKey'],
                    'session_token': credentials['SessionToken'],
                    'expiration': credentials['Expiration'].isoformat()
                },
                'duration_seconds': duration_seconds or self.security_config['default_session_duration'],
                'issued_at': datetime.utcnow().isoformat()
            }
            
            # Registrar auditoría
            if self.security_config['audit_logging']:
                self._log_session_token_event(result)
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_caller_identity(self) -> Dict:
        """Obtener identidad del llamador"""
        
        try:
            response = self.sts.get_caller_identity()
            
            result = {
                'success': True,
                'identity': {
                    'user_id': response['UserId'],
                    'account': response['Account'],
                    'arn': response['Arn']
                },
                'retrieved_at': datetime.utcnow().isoformat()
            }
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def decode_authorization_message(self, encoded_message: str) -> Dict:
        """Decodificar mensaje de autorización"""
        
        try:
            response = self.sts.decode_authorization_message(
                EncodedMessage=encoded_message
            )
            
            result = {
                'success': True,
                'decoded_message': response['DecodedMessage'],
                'decoded_at': datetime.utcnow().isoformat()
            }
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_trust_relationship(self, role_name: str, trust_policy: Dict,
                                 trusted_accounts: List[str] = None) -> Dict:
        """Crear relación de confianza para rol"""
        
        try:
            # Validar política de confianza
            policy_validation = self._validate_trust_policy(trust_policy)
            if not policy_validation['valid']:
                return {
                    'success': False,
                    'error': policy_validation['error']
                }
            
            # Crear o actualizar rol con política de confianza
            role_params = {
                'RoleName': role_name,
                'AssumeRolePolicyDocument': json.dumps(trust_policy),
                'Description': f'Role with trust relationship created at {datetime.utcnow().isoformat()}'
            }
            
            try:
                # Intentar crear rol
                response = self.iam.create_role(**role_params)
                role_arn = response['Role']['Arn']
                created = True
            except self.iam.exceptions.EntityAlreadyExistsException:
                # Rol ya existe, actualizar política de confianza
                self.iam.update_assume_role_policy(
                    RoleName=role_name,
                    PolicyDocument=json.dumps(trust_policy)
                )
                
                # Obtener ARN del rol existente
                role_response = self.iam.get_role(RoleName=role_name)
                role_arn = role_response['Role']['Arn']
                created = False
            
            result = {
                'success': True,
                'role_name': role_name,
                'role_arn': role_arn,
                'trust_policy': trust_policy,
                'created': created,
                'trusted_accounts': trusted_accounts or [],
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Registrar auditoría
            if self.security_config['audit_logging']:
                self._log_trust_relationship_event(result)
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_sts_usage(self, days: int = 30) -> Dict:
        """Analizar uso de STS"""
        
        try:
            # En implementación real, analizaría CloudTrail logs
            # Por ahora, simulamos análisis de uso
            
            usage_analysis = {
                'assume_role_operations': {
                    'total_count': 1250,
                    'success_rate': 98.5,
                    'average_duration': 3600,
                    'top_roles': [
                        {'role_arn': 'arn:aws:iam::123456789012:role/CrossAccountRole', 'count': 450},
                        {'role_arn': 'arn:aws:iam::123456789012:role/ServiceRole', 'count': 380}
                    ]
                },
                'web_identity_operations': {
                    'total_count': 850,
                    'success_rate': 97.2,
                    'top_providers': [
                        {'provider': 'Google', 'count': 350},
                        {'provider': 'Facebook', 'count': 280}
                    ]
                },
                'saml_operations': {
                    'total_count': 420,
                    'success_rate': 99.1,
                    'top_providers': [
                        {'provider': 'ADFS', 'count': 220},
                        {'provider': 'Okta', 'count': 180}
                    ]
                },
                'federation_tokens': {
                    'total_count': 180,
                    'success_rate': 99.8,
                    'average_duration': 7200
                },
                'session_tokens': {
                    'total_count': 650,
                    'success_rate': 98.9,
                    'mfa_usage': 85.2
                }
            }
            
            # Calcular métricas agregadas
            total_operations = sum(
                data['total_count'] for data in usage_analysis.values()
            )
            
            aggregated_metrics = {
                'total_operations': total_operations,
                'overall_success_rate': sum(
                    data['total_count'] * data['success_rate'] 
                    for data in usage_analysis.values()
                ) / total_operations,
                'analysis_period': f"{days} days",
                'security_events': 12,
                'failed_operations': int(total_operations * (1 - 0.987))
            }
            
            return {
                'success': True,
                'usage_analysis': usage_analysis,
                'aggregated_metrics': aggregated_metrics,
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _validate_assume_role_params(self, role_arn: str, session_name: str, 
                                   duration_seconds: int) -> Dict:
        """Validar parámetros de AssumeRole"""
        
        try:
            # Validar formato de ARN
            if not role_arn.startswith('arn:aws:iam::'):
                return {
                    'valid': False,
                    'error': 'Invalid Role ARN format'
                }
            
            # Validar nombre de sesión
            if not session_name or len(session_name) > 64:
                return {
                    'valid': False,
                    'error': 'Session name must be 1-64 characters'
                }
            
            # Validar duración
            if duration_seconds and (duration_seconds < 900 or duration_seconds > 43200):
                return {
                    'valid': False,
                    'error': 'Duration must be between 900 and 43200 seconds'
                }
            
            return {'valid': True}
            
        except Exception as e:
            return {
                'valid': False,
                'error': str(e)
            }
    
    def _validate_web_identity_token(self, token: str) -> Dict:
        """Validar token de identidad web"""
        
        try:
            # Validar formato JWT
            if not token or not isinstance(token, str):
                return {
                    'valid': False,
                    'error': 'Invalid web identity token format'
                }
            
            # Intentar decodificar token (validación básica)
            try:
                decoded = jwt.decode(token, options={'verify_signature': False})
                if 'exp' in decoded and decoded['exp'] < time.time():
                    return {
                        'valid': False,
                        'error': 'Token has expired'
                    }
            except jwt.DecodeError:
                return {
                    'valid': False,
                    'error': 'Invalid JWT token'
                }
            
            return {'valid': True}
            
        except Exception as e:
            return {
                'valid': False,
                'error': str(e)
            }
    
    def _validate_saml_assertion(self, assertion: str) -> Dict:
        """Validar aserción SAML"""
        
        try:
            # Validación básica de aserción SAML
            if not assertion or not isinstance(assertion, str):
                return {
                    'valid': False,
                    'error': 'Invalid SAML assertion format'
                }
            
            # Verificar que contenga elementos SAML básicos
            if 'samlp:Response' not in assertion and 'saml2p:Response' not in assertion:
                return {
                    'valid': False,
                    'error': 'Invalid SAML response format'
                }
            
            return {'valid': True}
            
        except Exception as e:
            return {
                'valid': False,
                'error': str(e)
            }
    
    def _validate_federation_token_params(self, name: str, duration_seconds: int) -> Dict:
        """Validar parámetros de token federado"""
        
        try:
            # Validar nombre
            if not name or len(name) < 2 or len(name) > 32:
                return {
                    'valid': False,
                    'error': 'Name must be 2-32 characters'
                }
            
            # Validar duración
            if duration_seconds and (duration_seconds < 900 or duration_seconds > 129600):
                return {
                    'valid': False,
                    'error': 'Duration must be between 900 and 129600 seconds'
                }
            
            return {'valid': True}
            
        except Exception as e:
            return {
                'valid': False,
                'error': str(e)
            }
    
    def _validate_session_token_params(self, duration_seconds: int) -> Dict:
        """Validar parámetros de token de sesión"""
        
        try:
            # Validar duración
            if duration_seconds and (duration_seconds < 900 or duration_seconds > 129600):
                return {
                    'valid': False,
                    'error': 'Duration must be between 900 and 129600 seconds'
                }
            
            return {'valid': True}
            
        except Exception as e:
            return {
                'valid': False,
                'error': str(e)
            }
    
    def _validate_trust_policy(self, policy: Dict) -> Dict:
        """Validar política de confianza"""
        
        try:
            # Validar estructura básica de política IAM
            required_fields = ['Version', 'Statement']
            
            for field in required_fields:
                if field not in policy:
                    return {
                        'valid': False,
                        'error': f'Missing required field: {field}'
                    }
            
            # Validar que haya al menos una declaración
            if not policy['Statement']:
                return {
                    'valid': False,
                    'error': 'Policy must contain at least one statement'
                }
            
            # Validar declaración de confianza
            for statement in policy['Statement']:
                if 'Effect' not in statement or statement['Effect'] != 'Allow':
                    return {
                        'valid': False,
                        'error': 'Trust policy statements must have Effect: Allow'
                    }
                
                if 'Principal' not in statement:
                    return {
                        'valid': False,
                        'error': 'Trust policy statements must specify a Principal'
                    }
                
                if 'Action' not in statement or 'sts:AssumeRole' not in statement['Action']:
                    return {
                        'valid': False,
                        'error': 'Trust policy must allow sts:AssumeRole action'
                    }
            
            return {'valid': True}
            
        except Exception as e:
            return {
                'valid': False,
                'error': str(e)
            }
    
    def _log_assume_role_event(self, result: Dict) -> None:
        """Registrar evento de AssumeRole"""
        
        try:
            # En implementación real, enviar a CloudWatch Logs
            log_entry = {
                'event_type': 'AssumeRole',
                'timestamp': datetime.utcnow().isoformat(),
                'role_arn': result['role_arn'],
                'session_name': result['session_name'],
                'assumed_role_user': result['assumed_role_user'],
                'duration': result['credentials']['duration_seconds']
            }
            
            # Simular logging
            print(f"STS Audit Log: {json.dumps(log_entry, indent=2)}")
            
        except Exception:
            pass
    
    def _log_web_identity_assume_event(self, result: Dict) -> None:
        """Registrar evento de AssumeRoleWithWebIdentity"""
        
        try:
            log_entry = {
                'event_type': 'AssumeRoleWithWebIdentity',
                'timestamp': datetime.utcnow().isoformat(),
                'subject': result['subject_from_web_identity_token'],
                'audience': result['audience'],
                'assumed_role_user': result['assumed_role_user']
            }
            
            print(f"STS Audit Log: {json.dumps(log_entry, indent=2)}")
            
        except Exception:
            pass
    
    def _log_saml_assume_event(self, result: Dict) -> None:
        """Registrar evento de AssumeRoleWithSAML"""
        
        try:
            log_entry = {
                'event_type': 'AssumeRoleWithSAML',
                'timestamp': datetime.utcnow().isoformat(),
                'subject': result['subject'],
                'issuer': result['issuer'],
                'audience': result['audience'],
                'assumed_role_user': result['assumed_role_user']
            }
            
            print(f"STS Audit Log: {json.dumps(log_entry, indent=2)}")
            
        except Exception:
            pass
    
    def _log_federation_token_event(self, result: Dict) -> None:
        """Registrar evento de GetFederationToken"""
        
        try:
            log_entry = {
                'event_type': 'GetFederationToken',
                'timestamp': datetime.utcnow().isoformat(),
                'federated_user': result['federated_user'],
                'packed_policy_size': result['packed_policy_size']
            }
            
            print(f"STS Audit Log: {json.dumps(log_entry, indent=2)}")
            
        except Exception:
            pass
    
    def _log_session_token_event(self, result: Dict) -> None:
        """Registrar evento de GetSessionToken"""
        
        try:
            log_entry = {
                'event_type': 'GetSessionToken',
                'timestamp': datetime.utcnow().isoformat(),
                'duration_seconds': result['duration_seconds']
            }
            
            print(f"STS Audit Log: {json.dumps(log_entry, indent=2)}")
            
        except Exception:
            pass
    
    def _log_trust_relationship_event(self, result: Dict) -> None:
        """Registrar evento de creación de relación de confianza"""
        
        try:
            log_entry = {
                'event_type': 'CreateTrustRelationship',
                'timestamp': datetime.utcnow().isoformat(),
                'role_name': result['role_name'],
                'role_arn': result['role_arn'],
                'created': result['created'],
                'trusted_accounts': result['trusted_accounts']
            }
            
            print(f"STS Audit Log: {json.dumps(log_entry, indent=2)}")
            
        except Exception:
            pass


class STSRoleManager:
    """Gestor de roles STS"""
    
    def __init__(self, sts_client, iam_client):
        self.sts = sts_client
        self.iam = iam_client
    
    def create_cross_account_role(self, role_name: str, trusted_account: str,
                                permissions: List[str]) -> Dict:
        """Crear rol para acceso entre cuentas"""
        
        try:
            # Política de confianza para cuenta específica
            trust_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "AWS": f"arn:aws:iam::{trusted_account}:root"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }
            
            # Política de permisos
            permissions_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": permissions,
                        "Resource": "*"
                    }
                ]
            }
            
            # Crear rol
            role_response = self.iam.create_role(
                RoleName=role_name,
                AssumeRolePolicyDocument=json.dumps(trust_policy),
                Description=f'Cross-account role for {trusted_account}'
            )
            
            # Crear y adjuntar política de permisos
            policy_name = f"{role_name}Policy"
            self.iam.put_role_policy(
                RoleName=role_name,
                PolicyName=policy_name,
                PolicyDocument=json.dumps(permissions_policy)
            )
            
            return {
                'success': True,
                'role_arn': role_response['Role']['Arn'],
                'role_name': role_name,
                'trusted_account': trusted_account,
                'permissions': permissions,
                'created_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def create_service_role(self, role_name: str, service_principal: str,
                           permissions: List[str]) -> Dict:
        """Crear rol para servicio AWS"""
        
        try:
            # Política de confianza para servicio
            trust_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": service_principal
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }
            
            # Crear rol
            role_response = self.iam.create_role(
                RoleName=role_name,
                AssumeRolePolicyDocument=json.dumps(trust_policy),
                Description=f'Service role for {service_principal}'
            )
            
            # Crear y adjuntar política de permisos
            policy_name = f"{role_name}Policy"
            permissions_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": permissions,
                        "Resource": "*"
                    }
                ]
            }
            
            self.iam.put_role_policy(
                RoleName=role_name,
                PolicyName=policy_name,
                PolicyDocument=json.dumps(permissions_policy)
            )
            
            return {
                'success': True,
                'role_arn': role_response['Role']['Arn'],
                'role_name': role_name,
                'service_principal': service_principal,
                'permissions': permissions,
                'created_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def list_role_trust_relationships(self, role_name: str) -> Dict:
        """Listar relaciones de confianza de un rol"""
        
        try:
            # Obtener política de confianza del rol
            response = self.iam.get_role(RoleName=role_name)
            trust_policy = json.loads(response['Role']['AssumeRolePolicyDocument'])
            
            # Extraer principales de confianza
            trusted_principals = []
            for statement in trust_policy['Statement']:
                if statement['Effect'] == 'Allow' and 'Principal' in statement:
                    principal = statement['Principal']
                    for principal_type, principal_value in principal.items():
                        if isinstance(principal_value, list):
                            for value in principal_value:
                                trusted_principals.append({
                                    'type': principal_type,
                                    'value': value
                                })
                        else:
                            trusted_principals.append({
                                'type': principal_type,
                                'value': principal_value
                            })
            
            return {
                'success': True,
                'role_name': role_name,
                'trust_policy': trust_policy,
                'trusted_principals': trusted_principals,
                'total_principals': len(trusted_principals)
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}


class STSFederationManager:
    """Gestor de federación STS"""
    
    def __init__(self, sts_client, cognito_client):
        self.sts = sts_client
        self.cognito = cognito_client
    
    def setup_web_identity_federation(self, role_name: str, identity_providers: List[str]) -> Dict:
        """Configurar federación de identidad web"""
        
        try:
            # Política de confianza para múltiples proveedores
            trust_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Federated": identity_providers
                        },
                        "Action": "sts:AssumeRoleWithWebIdentity",
                        "Condition": {
                            "StringEquals": {
                                "sts:ExternalId": "web-identity-federation"
                            }
                        }
                    }
                ]
            }
            
            # Crear rol
            role_response = self.iam.create_role(
                RoleName=role_name,
                AssumeRolePolicyDocument=json.dumps(trust_policy),
                Description='Web identity federation role'
            )
            
            return {
                'success': True,
                'role_arn': role_response['Role']['Arn'],
                'role_name': role_name,
                'identity_providers': identity_providers,
                'created_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def setup_saml_federation(self, role_name: str, saml_provider_arn: str) -> Dict:
        """Configurar federación SAML"""
        
        try:
            # Política de confianza para proveedor SAML
            trust_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Federated": saml_provider_arn
                        },
                        "Action": "sts:AssumeRoleWithSAML",
                        "Condition": {
                            "StringEquals": {
                                "SAML:aud": "https://signin.aws.amazon.com/saml"
                            }
                        }
                    }
                ]
            }
            
            # Crear rol
            role_response = self.iam.create_role(
                RoleName=role_name,
                AssumeRolePolicyDocument=json.dumps(trust_policy),
                Description='SAML federation role'
            )
            
            return {
                'success': True,
                'role_arn': role_response['Role']['Arn'],
                'role_name': role_name,
                'saml_provider_arn': saml_provider_arn,
                'created_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}


class STSSessionManager:
    """Gestor de sesiones STS"""
    
    def __init__(self, sts_client):
        self.sts = sts_client
        self.active_sessions = {}
    
    def create_session(self, session_name: str, credentials: Dict) -> Dict:
        """Crear sesión STS"""
        
        try:
            # Almacenar información de sesión
            session_info = {
                'session_name': session_name,
                'credentials': credentials,
                'created_at': datetime.utcnow().isoformat(),
                'expires_at': credentials['expiration'],
                'status': 'ACTIVE'
            }
            
            self.active_sessions[session_name] = session_info
            
            return {
                'success': True,
                'session_name': session_name,
                'session_info': session_info,
                'created_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_session_status(self, session_name: str) -> Dict:
        """Obtener estado de sesión"""
        
        try:
            if session_name not in self.active_sessions:
                return {
                    'success': False,
                    'error': 'Session not found'
                }
            
            session_info = self.active_sessions[session_name]
            
            # Verificar si la sesión ha expirado
            expiration_time = datetime.fromisoformat(session_info['expires_at'].replace('Z', '+00:00'))
            current_time = datetime.utcnow()
            
            if current_time >= expiration_time:
                session_info['status'] = 'EXPIRED'
            elif (expiration_time - current_time).total_seconds() < 300:  # 5 minutos
                session_info['status'] = 'EXPIRING_SOON'
            
            return {
                'success': True,
                'session_name': session_name,
                'status': session_info['status'],
                'created_at': session_info['created_at'],
                'expires_at': session_info['expires_at'],
                'time_remaining': max(0, (expiration_time - current_time).total_seconds())
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def list_active_sessions(self) -> Dict:
        """Listar sesiones activas"""
        
        try:
            active_sessions = []
            expired_sessions = []
            
            for session_name, session_info in self.active_sessions.items():
                # Verificar estado actual
                status_result = self.get_session_status(session_name)
                if status_result['success']:
                    if status_result['status'] in ['ACTIVE', 'EXPIRING_SOON']:
                        active_sessions.append({
                            'session_name': session_name,
                            'status': status_result['status'],
                            'time_remaining': status_result['time_remaining']
                        })
                    else:
                        expired_sessions.append(session_name)
            
            return {
                'success': True,
                'active_sessions': active_sessions,
                'expired_sessions': expired_sessions,
                'total_sessions': len(self.active_sessions),
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}


class STSSecurityManager:
    """Gestor de seguridad STS"""
    
    def __init__(self, sts_client, iam_client):
        self.sts = sts_client
        self.iam = iam_client
    
    def enforce_mfa_requirement(self, role_name: str) -> Dict:
        """Forzar requisito de MFA para rol"""
        
        try:
            # Obtener política de confianza actual
            role_response = self.iam.get_role(RoleName=role_name)
            trust_policy = json.loads(role_response['Role']['AssumeRolePolicyDocument'])
            
            # Agregar condición de MFA
            for statement in trust_policy['Statement']:
                if statement['Effect'] == 'Allow':
                    if 'Condition' not in statement:
                        statement['Condition'] = {}
                    
                    statement['Condition']['BoolIfExists'] = {
                        'aws:MultiFactorAuthPresent': 'true'
                    }
            
            # Actualizar política de confianza
            self.iam.update_assume_role_policy(
                RoleName=role_name,
                PolicyDocument=json.dumps(trust_policy)
            )
            
            return {
                'success': True,
                'role_name': role_name,
                'mfa_enforced': True,
                'updated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def validate_session_security(self, credentials: Dict) -> Dict:
        """Validar seguridad de sesión"""
        
        try:
            security_checks = {
                'credential_format_valid': True,
                'session_not_expired': True,
                'session_duration_appropriate': True,
                'minimum_security_met': True
            }
            
            # Verificar formato de credenciales
            required_fields = ['access_key_id', 'secret_access_key', 'session_token', 'expiration']
            for field in required_fields:
                if field not in credentials:
                    security_checks['credential_format_valid'] = False
                    security_checks['minimum_security_met'] = False
            
            # Verificar expiración
            expiration_time = datetime.fromisoformat(credentials['expiration'].replace('Z', '+00:00'))
            current_time = datetime.utcnow()
            
            if current_time >= expiration_time:
                security_checks['session_not_expired'] = False
                security_checks['minimum_security_met'] = False
            
            # Verificar duración apropiada
            duration = (expiration_time - current_time).total_seconds()
            if duration > 43200:  # 12 horas
                security_checks['session_duration_appropriate'] = False
            
            return {
                'success': True,
                'security_checks': security_checks,
                'overall_security': 'SECURE' if security_checks['minimum_security_met'] else 'INSECURE',
                'validated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}


class STSAuditManager:
    """Gestor de auditoría STS"""
    
    def __init__(self, sts_client):
        self.sts = sts_client
        self.audit_logs = []
    
    def log_sts_event(self, event_type: str, event_data: Dict) -> Dict:
        """Registrar evento STS"""
        
        try:
            log_entry = {
                'event_id': f"sts-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{len(self.audit_logs)}",
                'event_type': event_type,
                'timestamp': datetime.utcnow().isoformat(),
                'event_data': event_data,
                'source_ip': event_data.get('source_ip', 'unknown'),
                'user_agent': event_data.get('user_agent', 'unknown')
            }
            
            self.audit_logs.append(log_entry)
            
            return {
                'success': True,
                'event_id': log_entry['event_id'],
                'logged_at': log_entry['timestamp']
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_audit_summary(self, hours: int = 24) -> Dict:
        """Obtener resumen de auditoría"""
        
        try:
            # Filtrar logs por período
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            recent_logs = [
                log for log in self.audit_logs
                if datetime.fromisoformat(log['timestamp']) >= cutoff_time
            ]
            
            # Calcular estadísticas
            event_types = {}
            for log in recent_logs:
                event_type = log['event_type']
                if event_type not in event_types:
                    event_types[event_type] = 0
                event_types[event_type] += 1
            
            # Identificar eventos sospechosos
            suspicious_events = [
                log for log in recent_logs
                if self._is_suspicious_event(log)
            ]
            
            return {
                'success': True,
                'period_hours': hours,
                'total_events': len(recent_logs),
                'event_types': event_types,
                'suspicious_events': len(suspicious_events),
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _is_suspicious_event(self, log_entry: Dict) -> bool:
        """Identificar eventos sospechosos"""
        
        try:
            event_data = log_entry['event_data']
            
            # Verificar patrones sospechosos
            suspicious_patterns = [
                'multiple_failed_assume_role_attempts',
                'unusual_source_ip',
                'short_duration_sessions',
                'cross_account_access_from_unexpected_location'
            ]
            
            for pattern in suspicious_patterns:
                if pattern in str(event_data).lower():
                    return True
            
            return False
            
        except Exception:
            return False
```

## Casos de Uso

### **1. Asumir Rol entre Cuentas**
```python
# Ejemplo: Asumir rol entre cuentas
sts_manager = SecurityTokenServiceManager('us-east-1')

# Asumir rol en otra cuenta
assume_result = sts_manager.assume_role(
    role_arn='arn:aws:iam::987654321098:role/CrossAccountAdmin',
    session_name='cross-account-session',
    duration_seconds=3600,
    external_id='external-id-123'
)

if assume_result['success']:
    credentials = assume_result['credentials']
    assumed_user = assume_result['assumed_role_user']
    
    print(f"Role Assumed Successfully")
    print(f"Role ARN: {assume_result['role_arn']}")
    print(f"Session Name: {assume_result['session_name']}")
    print(f"Assumed Role ID: {assumed_user['assumed_role_id']}")
    print(f"Assumed Role ARN: {assumed_user['arn']}")
    
    print(f"\nTemporary Credentials:")
    print(f"  Access Key ID: {credentials['access_key_id']}")
    print(f"  Secret Access Key: {credentials['secret_access_key']}")
    print(f"  Session Token: {credentials['session_token']}")
    print(f"  Expiration: {credentials['expiration']}")
    print(f"  Duration: {credentials['duration_seconds']} seconds")
```

### **2. Asumir Rol con Identidad Web**
```python
# Ejemplo: Asumir rol con identidad web (Google)
sts_manager = SecurityTokenServiceManager('us-east-1')

# Token de identidad web (ejemplo)
web_identity_token = "eyJhbGciOiJSUzI1NiIsImtpZCI6Ij..."  # Token real de Google

# Asumir rol con identidad web
web_result = sts_manager.assume_role_with_web_identity(
    role_arn='arn:aws:iam::123456789012:role/WebAppRole',
    role_session_name='web-app-session',
    web_identity_token=web_identity_token,
    provider_id='accounts.google.com',
    duration_seconds=3600
)

if web_result['success']:
    credentials = web_result['credentials']
    
    print(f"Web Identity Role Assumed")
    print(f"Subject: {web_result['subject_from_web_identity_token']}")
    print(f"Audience: {web_result['audience']}")
    print(f"Assumed Role ARN: {web_result['assumed_role_user']['arn']}")
    
    print(f"\nTemporary Credentials:")
    print(f"  Access Key ID: {credentials['access_key_id']}")
    print(f"  Expiration: {credentials['expiration']}")
```

### **3. Asumir Rol con SAML**
```python
# Ejemplo: Asumir rol con SAML
sts_manager = SecurityTokenServiceManager('us-east-1')

# Aserción SAML (ejemplo)
saml_assertion = """<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">
    <Assertion xmlns="urn:oasis:names:tc:SAML:2.0:assertion">
        <!-- Contenido SAML real -->
    </Assertion>
</samlp:Response>"""

# Asumir rol con SAML
saml_result = sts_manager.assume_role_with_saml(
    role_arn='arn:aws:iam::123456789012:role/SAMLRole',
    principal_arn='arn:aws:iam::123456789012:saml-provider/ADFS',
    saml_assertion=saml_assertion,
    duration_seconds=28800  # 8 horas
)

if saml_result['success']:
    credentials = saml_result['credentials']
    
    print(f"SAML Role Assumed")
    print(f"Subject: {saml_result['subject']}")
    print(f"Issuer: {saml_result['issuer']}")
    print(f"Audience: {saml_result['audience']}")
    print(f"Assumed Role ARN: {saml_result['assumed_role_user']['arn']}")
    
    print(f"\nTemporary Credentials:")
    print(f"  Access Key ID: {credentials['access_key_id']}")
    print(f"  Expiration: {credentials['expiration']}")
```

### **4. Obtener Token Federado**
```python
# Ejemplo: Obtener token federado
sts_manager = SecurityTokenServiceManager('us-east-1')

# Política de permisos para usuario federado
federation_policy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::example-bucket/*"
        }
    ]
}

# Obtener token federado
token_result = sts_manager.get_federation_token(
    name='federated-user',
    policy=json.dumps(federation_policy),
    duration_seconds=7200,  # 2 horas
    tags=[
        {'Key': 'Department', 'Value': 'Engineering'},
        {'Key': 'Project', 'Value': 'WebApp'}
    ]
)

if token_result['success']:
    credentials = token_result['credentials']
    federated_user = token_result['federated_user']
    
    print(f"Federation Token Obtained")
    print(f"Federated User ID: {federated_user['federated_user_id']}")
    print(f"Federated User ARN: {federated_user['arn']}")
    print(f"Packed Policy Size: {token_result['packed_policy_size']}")
    
    print(f"\nTemporary Credentials:")
    print(f"  Access Key ID: {credentials['access_key_id']}")
    print(f"  Secret Access Key: {credentials['secret_access_key']}")
    print(f"  Session Token: {credentials['session_token']}")
    print(f"  Expiration: {credentials['expiration']}")
```

### **5. Obtener Token de Sesión con MFA**
```python
# Ejemplo: Obtener token de sesión con MFA
sts_manager = SecurityTokenServiceManager('us-east-1')

# Obtener token de sesión con MFA
session_result = sts_manager.get_session_token(
    duration_seconds=3600,  # 1 hora
    serial_number='arn:aws:iam::123456789012:mfa/user-mfa-device',
    token_code='123456'  # Código MFA real
)

if session_result['success']:
    credentials = session_result['credentials']
    
    print(f"Session Token Obtained with MFA")
    print(f"Duration: {session_result['duration_seconds']} seconds")
    print(f"Issued At: {session_result['issued_at']}")
    
    print(f"\nTemporary Credentials:")
    print(f"  Access Key ID: {credentials['access_key_id']}")
    print(f"  Secret Access Key: {credentials['secret_access_key']}")
    print(f"  Session Token: {credentials['session_token']}")
    print(f"  Expiration: {credentials['expiration']}")
```

### **6. Crear Rol de Confianza Entre Cuentas**
```python
# Ejemplo: Crear rol de confianza entre cuentas
sts_manager = SecurityTokenServiceManager('us-east-1')

# Política de confianza para cuenta específica
trust_policy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::987654321098:root"
            },
            "Action": "sts:AssumeRole",
            "Condition": {
                "StringEquals": {
                    "sts:ExternalId": "cross-account-external-id"
                }
            }
        }
    ]
}

# Crear relación de confianza
trust_result = sts_manager.create_trust_relationship(
    role_name='CrossAccountReadOnly',
    trust_policy=trust_policy,
    trusted_accounts=['987654321098']
)

if trust_result['success']:
    print(f"Trust Relationship Created")
    print(f"Role Name: {trust_result['role_name']}")
    print(f"Role ARN: {trust_result['role_arn']}")
    print(f"Created: {trust_result['created']}")
    print(f"Trusted Accounts: {trust_result['trusted_accounts']}")
```

### **7. Analizar Uso de STS**
```python
# Ejemplo: Analizar uso de STS
sts_manager = SecurityTokenServiceManager('us-east-1')

# Analizar uso de últimos 30 días
usage_result = sts_manager.analyze_sts_usage(days=30)

if usage_result['success']:
    analysis = usage_result['usage_analysis']
    metrics = usage_result['aggregated_metrics']
    
    print(f"STS Usage Analysis")
    print(f"Analysis Period: {metrics['analysis_period']}")
    print(f"Total Operations: {metrics['total_operations']}")
    print(f"Overall Success Rate: {metrics['overall_success_rate']:.1f}%")
    print(f"Security Events: {metrics['security_events']}")
    
    print(f"\nAssume Role Operations:")
    assume_data = analysis['assume_role_operations']
    print(f"  Total Count: {assume_data['total_count']}")
    print(f"  Success Rate: {assume_data['success_rate']:.1f}%")
    print(f"  Average Duration: {assume_data['average_duration']} seconds")
    
    print(f"\nTop Roles:")
    for role in assume_data['top_roles']:
        print(f"  {role['role_arn']}: {role['count']} operations")
    
    print(f"\nWeb Identity Operations:")
    web_data = analysis['web_identity_operations']
    print(f"  Total Count: {web_data['total_count']}")
    print(f"  Success Rate: {web_data['success_rate']:.1f}%")
    
    print(f"\nTop Providers:")
    for provider in web_data['top_providers']:
        print(f"  {provider['provider']}: {provider['count']} operations")
```

## Configuración con AWS CLI

### **Operaciones STS Principales**
```bash
# Asumir rol
aws sts assume-role \
  --role-arn arn:aws:iam::987654321098:role/CrossAccountRole \
  --role-session-name my-session \
  --duration-seconds 3600 \
  --external-id external-id-123

# Asumir rol con identidad web
aws sts assume-role-with-web-identity \
  --role-arn arn:aws:iam::123456789012:role/WebAppRole \
  --role-session-name web-session \
  --web-identity-token file://web-token.json \
  --provider-id accounts.google.com

# Asumir rol con SAML
aws sts assume-role-with-saml \
  --role-arn arn:aws:iam::123456789012:role/SAMLRole \
  --principal-arn arn:aws:iam::123456789012:saml-provider/ADFS \
  --saml-assertion file://saml-assertion.xml

# Obtener token federado
aws sts get-federation-token \
  --name federated-user \
  --policy file://federation-policy.json \
  --duration-seconds 7200

# Obtener token de sesión
aws sts get-session-token \
  --duration-seconds 3600 \
  --serial-number arn:aws:iam::123456789012:mfa/user-mfa \
  --token-code 123456

# Obtener identidad del llamador
aws sts get-caller-identity
```

### **Gestión de Roles y Políticas**
```bash
# Crear rol con política de confianza
aws iam create-role \
  --role-name CrossAccountRole \
  --assume-role-policy-document file://trust-policy.json \
  --description "Cross account access role"

# Actualizar política de confianza
aws iam update-assume-role-policy \
  --role-name CrossAccountRole \
  --policy-document file://updated-trust-policy.json

# Obtener política de confianza de rol
aws iam get-role-policy \
  --role-name CrossAccountRole \
  --policy-name AssumeRolePolicy

# Listar roles
aws iam list-roles \
  --path-prefix /

# Obtener detalles de rol
aws iam get-role \
  --role-name CrossAccountRole
```

### **Configuración de Proveedores de Identidad**
```bash
# Crear proveedor de identidad OIDC
aws iam create-open-id-connect-provider \
  --url https://accounts.google.com \
  --client-id-list client-id-1 client-id-2 \
  --thumbprint-list thumbprint

# Crear proveedor SAML
aws iam create-saml-provider \
  --saml-metadata-document file://saml-metadata.xml \
  --name ADFS-Provider

# Listar proveedores OIDC
aws iam list-open-id-connect-providers

# Listar proveedores SAML
aws iam list-saml-providers
```

## Mejores Prácticas

### **1. Gestión de Credenciales**
- **Short-lived Sessions**: Usar sesiones con la duración más corta posible
- **Minimum Privilege**: Otorgar solo los permisos necesarios
- **Regular Rotation**: Rotación regular de credenciales
- **Secure Storage**: Almacenamiento seguro de credenciales temporales
- **Immediate Revocation**: Revocación inmediata de credenciales comprometidas

### **2. Configuración de Roles**
- **Trust Relationships**: Relaciones de confianza específicas y limitadas
- **Resource-based Policies**: Políticas basadas en recursos cuando sea apropiado
- **Condition-based Access**: Acceso basado en condiciones específicas
- **MFA Requirements**: Requerir MFA para operaciones sensibles
- **External IDs**: Usar External IDs para acceso entre cuentas

### **3. Federación de Identidad**
- **Provider Validation**: Validación rigurosa de proveedores de identidad
- **Token Validation**: Validación completa de tokens de identidad
- **Session Policies**: Políticas de sesión específicas para usuarios federados
- **Audit Logging**: Registro completo de auditoría para operaciones federadas
- **Compliance Standards**: Cumplimiento de estándares de federación

### **4. Monitorización y Seguridad**
- **CloudTrail Integration**: Integración completa con CloudTrail
- **Real-time Monitoring**: Monitorización en tiempo real de operaciones STS
- **Anomaly Detection**: Detección de anomalías en patrones de uso
- **Security Alerts**: Alertas de seguridad para eventos sospechosos
- **Compliance Reporting**: Reportes de cumplimiento regulares

## Integración con Servicios AWS

### **AWS IAM**
- **Role Management**: Gestión completa de roles IAM
- **Policy Evaluation**: Evaluación dinámica de políticas
- **Trust Relationships**: Gestión de relaciones de confianza
- **Permission Boundaries**: Límites de permisos para roles
- **Access Analyzer**: Análisis de acceso y permisos

### **AWS Cognito**
- **Identity Pools**: Pools de identidad para federación
- **User Pools**: Pools de usuarios para autenticación
- **Token Exchange**: Intercambio de tokens Cognito-STS
- **Multi-factor Authentication**: MFA integrado
- **Sync Gateway**: Sincronización de identidad

### **AWS CloudTrail**
- **API Logging**: Registro completo de llamadas API
- **Event History**: Historial de eventos STS
- **Trail Management**: Gestión de trails de auditoría
- **Log Analysis**: Análisis de logs de seguridad
- **Compliance Monitoring**: Monitorización de cumplimiento

### **AWS CloudWatch**
- **Metrics Collection**: Recopilación de métricas STS
- **Alarm Configuration**: Configuración de alarmas
- **Dashboard Integration**: Integración con dashboards
- **Log Monitoring**: Monitorización de logs
- **Performance Metrics**: Métricas de rendimiento

## Métricas y KPIs

### **Métricas de Operaciones**
- **AssumeRole Count**: Número de operaciones AssumeRole
- **Session Duration**: Duración promedio de sesiones
- **Success Rate**: Tasa de éxito de operaciones
- **Error Rate**: Tasa de errores por tipo de operación
- **Geographic Distribution**: Distribución geográfica de accesos

### **KPIs de Seguridad**
- **MFA Usage Rate**: Tasa de uso de MFA
- **Cross-account Access**: Acceso entre cuentas
- **Federation Success Rate**: Tasa de éxito de federación
- **Security Events**: Eventos de seguridad detectados
- **Compliance Score**: Puntuación de cumplimiento

## Cumplimiento Normativo

### **Control de Acceso**
- **Identity Verification**: Verificación robusta de identidad
- **Access Control**: Control de acceso granular
- **Audit Trail**: Registro completo de auditoría
- **Data Protection**: Protección de datos de identidad
- **Compliance Standards**: Cumplimiento de estándares

### **Regulaciones Aplicables**
- **SOC 2**: Controles de seguridad y disponibilidad
- **ISO 27001**: Gestión de seguridad de la información
- **GDPR**: Protección de datos personales
- **HIPAA**: Cumplimiento de servicios de salud
- **PCI DSS**: Estándares de seguridad de pagos

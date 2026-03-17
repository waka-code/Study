# AWS KMS (Key Management Service)

## Definición

AWS KMS (Key Management Service) es un servicio gestionado que permite crear y controlar claves de cifrado utilizadas para cifrar datos. KMS simplifica la gestión de claves criptográficas y se integra nativamente con más de 100 servicios AWS, proporcionando control centralizado sobre el cifrado de datos en toda tu infraestructura.

## Características Principales

### **Gestión Centralizada**
- **Servicio gestionado**: Sin infraestructura que administrar
- **Control unificado**: Gestión centralizada de todas las claves
- **Rotación automática**: Rotación programada de claves
- **Políticas granulares**: Control detallado de acceso a claves
- **Auditoría completa**: Logs detallados con CloudTrail

### **Integración Nativa**
- **Más de 100 servicios**: Integración con servicios AWS
- **API RESTful**: Acceso programático completo
- **SDKs disponibles**: Soporte para múltiples lenguajes
- **Consola web**: Interfaz gráfica de gestión
- **CLI tools**: Herramientas de línea de comandos

### **Cumplimiento y Seguridad**
- **FIPS 140-2 Level 3**: Validación de seguridad
- **PCI-DSS**: Cumplimiento con estándares de pago
- **HIPAA**: Cumplimiento con datos de salud
- **SOC 2**: Certificación de seguridad y disponibilidad
- **ISO 27001**: Certificación de gestión de seguridad

## Tipos de Claves KMS

### **1. Customer Managed Keys (CMKs)**
- **Control total**: Gestión completa por el cliente
- **Políticas personalizadas**: Control granular de acceso
- **Rotación configurable**: Opcional y configurable
- **Costo**: $1.00 por mes por clave
- **Uso ideal**: Datos sensibles y cumplimiento regulatorio

### **2. AWS Managed Keys**
- **Gestión AWS**: Mantenidas automáticamente por AWS
- **Gratis**: Sin costo adicional
- **Rotación automática**: Cada 3 años
- **Servicios específicas**: Una por servicio (S3, RDS, EBS)
- **Uso ideal**: Cifrado general de servicios AWS

### **3. AWS Owned Keys**
- **Propiedad AWS**: Claves propiedad de AWS
- **Invisibles**: No visibles para clientes
- **Gratis**: Sin costo
- **Múltiples inquilinos**: Compartidas entre clientes
- **Uso ideal**: Operaciones internas de AWS

### **4. Data Keys**
- **Generación dinámica**: Creadas bajo demanda
- **Uso local**: Para cifrado local de datos
- **Envelope encryption**: Cifrado híbrido
- **Eficientes**: Optimizadas para rendimiento
- **Uso ideal**: Grandes volúmenes de datos

## Componentes de KMS

### **Arquitectura de KMS**
```
KMS Architecture
├── Customer Master Keys (CMKs)
│   ├── Key Material (Material de clave)
│   ├── Key Metadata (Metadatos)
│   ├── Key Policies (Políticas de clave)
│   ├── Tags (Etiquetas)
│   └── Rotation (Rotación automática)
├── Key Operations
│   ├── Encrypt (Cifrar)
│   ├── Decrypt (Descifrar)
│   ├── GenerateDataKey (Generar clave de datos)
│   ├── Sign (Firmar)
│   ├── Verify (Verificar)
│   ├── ReEncrypt (Recifrar)
│   └── Import/Export (Importar/Exportar)
├── Access Control
│   ├── Key Policies (Políticas de clave)
│   ├── IAM Policies (Políticas IAM)
│   ├── Grants (Concesiones)
│   └── Context (Contexto de cifrado)
└── Monitoring
    ├── CloudTrail Logs
    ├── CloudWatch Metrics
    ├── EventBridge Events
    └── Audit Reports
```

### **Flujo de Operaciones**
```
Encryption Flow
Request → IAM Validation → Key Policy Check → Key Access → Operation → CloudTrail Log

Decryption Flow
Request → Context Validation → Key Access → Operation → CloudTrail Log
```

## Configuración de KMS

### **Gestión Completa de KMS**
```python
import boto3
import json
import base64
from datetime import datetime, timedelta
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

class KMSManager:
    def __init__(self, region='us-east-1'):
        self.kms = boto3.client('kms', region_name=region)
        self.cloudtrail = boto3.client('cloudtrail', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.region = region
    
    def create_customer_master_key(self, key_description, key_usage='ENCRYPT_DECRYPT',
                                 key_spec='SYMMETRIC_DEFAULT', tags=None):
        """Crear Customer Master Key (CMK)"""
        
        try:
            key_params = {
                'Description': key_description,
                'KeyUsage': key_usage,
                'KeySpec': key_spec,
                'Origin': 'AWS_KMS',
                'BypassPolicyLockoutSafetyCheck': False,
                'MultiRegion': False,
                'Policy': self._create_default_key_policy()
            }
            
            if tags:
                key_params['Tags'] = tags
            
            response = self.kms.create_key(**key_params)
            key_id = response['KeyMetadata']['KeyId']
            key_arn = response['KeyMetadata']['Arn']
            
            # Crear alias para la clave
            alias_name = f'alias/{key_description.lower().replace(" ", "-")}'
            self.kms.create_alias(AliasName=alias_name, TargetKeyId=key_id)
            
            # Habilitar rotación automática para claves simétricas
            if key_spec == 'SYMMETRIC_DEFAULT':
                self.kms.enable_key_rotation(KeyId=key_id)
            
            return {
                'success': True,
                'key_id': key_id,
                'key_arn': key_arn,
                'alias_name': alias_name,
                'key_spec': key_spec,
                'key_usage': key_usage,
                'rotation_enabled': key_spec == 'SYMMETRIC_DEFAULT'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_asymmetric_key(self, key_description, key_pair_spec='RSA_2048',
                            key_usage='SIGN_VERIFY', tags=None):
        """Crear clave asimétrica"""
        
        try:
            key_params = {
                'Description': key_description,
                'KeyUsage': key_usage,
                'KeySpec': key_pair_spec,
                'Origin': 'AWS_KMS',
                'CustomerMasterKeySpec': key_pair_spec,
                'Policy': self._create_default_key_policy()
            }
            
            if tags:
                key_params['Tags'] = tags
            
            response = self.kms.create_key(**key_params)
            key_id = response['KeyMetadata']['KeyId']
            key_arn = response['KeyMetadata']['Arn']
            
            # Crear alias
            alias_name = f'alias/{key_description.lower().replace(" ", "-")}'
            self.kms.create_alias(AliasName=alias_name, TargetKeyId=key_id)
            
            return {
                'success': True,
                'key_id': key_id,
                'key_arn': key_arn,
                'alias_name': alias_name,
                'key_pair_spec': key_pair_spec,
                'key_usage': key_usage
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_multi_region_key(self, key_description, key_spec='SYMMETRIC_DEFAULT',
                               replica_regions=None, tags=None):
        """Crear clave multi-región"""
        
        try:
            key_params = {
                'Description': key_description,
                'KeySpec': key_spec,
                'Origin': 'AWS_KMS',
                'MultiRegion': True,
                'Policy': self._create_default_key_policy()
            }
            
            if tags:
                key_params['Tags'] = tags
            
            response = self.kms.create_key(**key_params)
            primary_key_id = response['KeyMetadata']['KeyId']
            primary_key_arn = response['KeyMetadata']['Arn']
            
            # Crear réplicas en otras regiones si se especifican
            replica_keys = []
            if replica_regions:
                for region in replica_regions:
                    try:
                        replica_client = boto3.client('kms', region_name=region)
                        replica_response = replica_client.replicate_key(
                            KeyId=primary_key_arn,
                            RegionName=region,
                            Policy=self._create_default_key_policy()
                        )
                        replica_keys.append({
                            'region': region,
                            'key_id': replica_response['ReplicatedKeyMetadata']['KeyId'],
                            'key_arn': replica_response['ReplicatedKeyMetadata']['Arn']
                        })
                    except Exception:
                        continue
            
            # Crear alias
            alias_name = f'alias/{key_description.lower().replace(" ", "-")}'
            self.kms.create_alias(AliasName=alias_name, TargetKeyId=primary_key_id)
            
            return {
                'success': True,
                'primary_key_id': primary_key_id,
                'primary_key_arn': primary_key_arn,
                'alias_name': alias_name,
                'key_spec': key_spec,
                'replica_keys': replica_keys
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _create_default_key_policy(self):
        """Crear política de clave por defecto"""
        
        policy = {
            'Version': '2012-10-17',
            'Statement': [
                {
                    'Sid': 'Enable IAM User Permissions',
                    'Effect': 'Allow',
                    'Principal': {'AWS': 'arn:aws:iam::123456789012:root'},
                    'Action': 'kms:*',
                    'Resource': '*'
                },
                {
                    'Sid': 'Allow use of the key',
                    'Effect': 'Allow',
                    'Principal': {'AWS': 'arn:aws:iam::123456789012:role/AdminRole'},
                    'Action': [
                        'kms:Encrypt',
                        'kms:Decrypt',
                        'kms:ReEncrypt*',
                        'kms:GenerateDataKey*',
                        'kms:DescribeKey'
                    ],
                    'Resource': '*'
                },
                {
                    'Sid': 'Allow attachment of persistent resources',
                    'Effect': 'Allow',
                    'Principal': {'AWS': 'arn:aws:iam::123456789012:role/AdminRole'},
                    'Action': [
                        'kms:CreateGrant',
                        'kms:ListGrants',
                        'kms:RevokeGrant'
                    ],
                    'Resource': '*'
                }
            ]
        }
        
        return json.dumps(policy)
    
    def encrypt_data(self, data, key_id=None, key_arn=None, encryption_context=None):
        """Cifrar datos usando KMS"""
        
        try:
            if not key_id and not key_arn:
                return {
                    'success': False,
                    'error': 'Se requiere key_id o key_arn'
                }
            
            key_identifier = key_id if key_id else key_arn
            
            # Convertir datos a bytes si es necesario
            if isinstance(data, str):
                data_bytes = data.encode('utf-8')
            elif isinstance(data, dict):
                data_bytes = json.dumps(data).encode('utf-8')
            else:
                data_bytes = data
            
            # Preparar contexto de cifrado
            context = encryption_context or {
                'purpose': 'data-encryption',
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Cifrar datos
            response = self.kms.encrypt(
                KeyId=key_identifier,
                Plaintext=data_bytes,
                EncryptionContext=context
            )
            
            ciphertext_blob = response['CiphertextBlob']
            key_id_used = response['KeyId']
            encryption_algorithm = response.get('EncryptionAlgorithm', 'SYMMETRIC_DEFAULT')
            
            return {
                'success': True,
                'ciphertext_blob': base64.b64encode(ciphertext_blob).decode('utf-8'),
                'key_id_used': key_id_used,
                'encryption_algorithm': encryption_algorithm,
                'encryption_context': context,
                'data_size': len(data_bytes)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def decrypt_data(self, ciphertext_blob, encryption_context=None):
        """Descifrar datos usando KMS"""
        
        try:
            # Convertir de base64 a bytes
            if isinstance(ciphertext_blob, str):
                ciphertext_bytes = base64.b64decode(ciphertext_blob)
            else:
                ciphertext_bytes = ciphertext_blob
            
            # Descifrar datos
            decrypt_params = {
                'CiphertextBlob': ciphertext_bytes
            }
            
            if encryption_context:
                decrypt_params['EncryptionContext'] = encryption_context
            
            response = self.kms.decrypt(**decrypt_params)
            plaintext = response['Plaintext']
            key_id_used = response['KeyId']
            encryption_algorithm = response.get('EncryptionAlgorithm', 'SYMMETRIC_DEFAULT')
            
            return {
                'success': True,
                'plaintext': plaintext.decode('utf-8'),
                'key_id_used': key_id_used,
                'encryption_algorithm': encryption_algorithm,
                'encryption_context': response.get('EncryptionContext', {}),
                'data_size': len(plaintext)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_data_key(self, key_id, key_spec='AES_256', encryption_context=None):
        """Generar clave de datos"""
        
        try:
            params = {
                'KeyId': key_id,
                'KeySpec': key_spec
            }
            
            if encryption_context:
                params['EncryptionContext'] = encryption_context
            
            response = self.kms.generate_data_key(**params)
            
            plaintext_key = response['Plaintext']
            ciphertext_key = response['CiphertextBlob']
            key_id_used = response['KeyId']
            
            return {
                'success': True,
                'plaintext_key': base64.b64encode(plaintext_key).decode('utf-8'),
                'ciphertext_key': base64.b64encode(ciphertext_key).decode('utf-8'),
                'key_id_used': key_id_used,
                'key_spec': key_spec
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def decrypt_data_key(self, ciphertext_key, encryption_context=None):
        """Descifrar clave de datos"""
        
        try:
            # Convertir de base64 a bytes
            if isinstance(ciphertext_key, str):
                ciphertext_bytes = base64.b64decode(ciphertext_key)
            else:
                ciphertext_bytes = ciphertext_key
            
            params = {'CiphertextBlob': ciphertext_bytes}
            
            if encryption_context:
                params['EncryptionContext'] = encryption_context
            
            response = self.kms.decrypt(**params)
            plaintext_key = response['Plaintext']
            key_id_used = response['KeyId']
            
            return {
                'success': True,
                'plaintext_key': base64.b64encode(plaintext_key).decode('utf-8'),
                'key_id_used': key_id_used
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def sign_data(self, data, key_id, signing_algorithm='RSASSA_PSS_SHA_256'):
        """Firmar datos con clave asimétrica"""
        
        try:
            # Convertir datos a bytes
            if isinstance(data, str):
                data_bytes = data.encode('utf-8')
            else:
                data_bytes = data
            
            response = self.kms.sign(
                KeyId=key_id,
                Message=data_bytes,
                MessageType='RAW',
                SigningAlgorithm=signing_algorithm
            )
            
            signature = response['Signature']
            signing_algorithm_used = response['SigningAlgorithm']
            
            return {
                'success': True,
                'signature': base64.b64encode(signature).decode('utf-8'),
                'signing_algorithm': signing_algorithm_used,
                'key_id_used': key_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def verify_signature(self, data, signature, key_id, signing_algorithm='RSASSA_PSS_SHA_256'):
        """Verificar firma digital"""
        
        try:
            # Convertir datos y firma a bytes
            if isinstance(data, str):
                data_bytes = data.encode('utf-8')
            else:
                data_bytes = data
            
            if isinstance(signature, str):
                signature_bytes = base64.b64decode(signature)
            else:
                signature_bytes = signature
            
            response = self.kms.verify(
                KeyId=key_id,
                Message=data_bytes,
                MessageType='RAW',
                Signature=signature_bytes,
                SigningAlgorithm=signing_algorithm
            )
            
            signature_valid = response['SignatureValid']
            signing_algorithm_used = response['SigningAlgorithm']
            
            return {
                'success': True,
                'signature_valid': signature_valid,
                'signing_algorithm': signing_algorithm_used,
                'key_id_used': key_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def re_encrypt_data(self, ciphertext_blob, source_key_id, destination_key_id,
                       encryption_context=None):
        """Recifrar datos con una clave diferente"""
        
        try:
            # Convertir de base64 a bytes
            if isinstance(ciphertext_blob, str):
                ciphertext_bytes = base64.b64decode(ciphertext_blob)
            else:
                ciphertext_bytes = ciphertext_blob
            
            params = {
                'CiphertextBlob': ciphertext_bytes,
                'SourceKeyId': source_key_id,
                'DestinationKeyId': destination_key_id
            }
            
            if encryption_context:
                params['EncryptionContext'] = encryption_context
            
            response = self.kms.re_encrypt(**params)
            
            new_ciphertext_blob = response['CiphertextBlob']
            source_key_id_used = response['SourceKeyId']
            destination_key_id_used = response['DestinationKeyId']
            
            return {
                'success': True,
                'ciphertext_blob': base64.b64encode(new_ciphertext_blob).decode('utf-8'),
                'source_key_id_used': source_key_id_used,
                'destination_key_id_used': destination_key_id_used
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def enable_key_rotation(self, key_id):
        """Habilitar rotación automática de clave"""
        
        try:
            response = self.kms.enable_key_rotation(KeyId=key_id)
            
            return {
                'success': True,
                'key_id': key_id,
                'rotation_enabled': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def disable_key_rotation(self, key_id):
        """Deshabilitar rotación automática de clave"""
        
        try:
            response = self.kms.disable_key_rotation(KeyId=key_id)
            
            return {
                'success': True,
                'key_id': key_id,
                'rotation_enabled': False
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def rotate_key(self, key_id):
        """Rotar clave manualmente"""
        
        try:
            response = self.kms.rotate_key(KeyId=key_id)
            key_id = response['KeyId']
            
            return {
                'success': True,
                'key_id': key_id,
                'rotation_status': 'completed'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def schedule_key_deletion(self, key_id, pending_window_in_days=7):
        """Programar eliminación de clave"""
        
        try:
            response = self.kms.schedule_key_deletion(
                KeyId=key_id,
                PendingWindowInDays=pending_window_in_days
            )
            
            deletion_date = response['DeletionDate']
            
            return {
                'success': True,
                'key_id': key_id,
                'deletion_date': deletion_date.isoformat(),
                'pending_window_days': pending_window_in_days
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def cancel_key_deletion(self, key_id):
        """Cancelar eliminación de clave"""
        
        try:
            response = self.kms.cancel_key_deletion(KeyId=key_id)
            key_id = response['KeyId']
            
            return {
                'success': True,
                'key_id': key_id,
                'deletion_cancelled': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_grant(self, key_id, grantee_principal, operations, 
                    retiring_principal=None, constraints=None, grant_tokens=None):
        """Crear concesión para clave"""
        
        try:
            grant_params = {
                'KeyId': key_id,
                'GranteePrincipal': grantee_principal,
                'Operations': operations
            }
            
            if retiring_principal:
                grant_params['RetiringPrincipal'] = retiring_principal
            
            if constraints:
                grant_params['Constraints'] = constraints
            
            if grant_tokens:
                grant_params['GrantTokens'] = grant_tokens
            
            response = self.kms.create_grant(**grant_params)
            
            grant_id = response['GrantId']
            grant_token = response['GrantToken']
            
            return {
                'success': True,
                'grant_id': grant_id,
                'grant_token': grant_token,
                'grantee_principal': grantee_principal,
                'operations': operations
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_grants(self, key_id, limit=100):
        """Listar concesiones de clave"""
        
        try:
            response = self.kms.list_grants(
                KeyId=key_id,
                Limit=limit
            )
            
            grants = []
            for grant in response['Grants']:
                grant_info = {
                    'grant_id': grant['GrantId'],
                    'key_id': grant['KeyId'],
                    'grantee_principal': grant.get('GranteePrincipal'),
                    'retiring_principal': grant.get('RetiringPrincipal'),
                    'operations': grant.get('Operations', []),
                    'creation_date': grant.get('CreationDate').isoformat() if grant.get('CreationDate') else None,
                    'grants': grant.get('Grants', [])
                }
                grants.append(grant_info)
            
            return {
                'success': True,
                'grants': grants,
                'count': len(grants)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def revoke_grant(self, key_id, grant_id):
        """Revocar concesión"""
        
        try:
            response = self.kms.revoke_grant(
                KeyId=key_id,
                GrantId=grant_id
            )
            
            return {
                'success': True,
                'key_id': key_id,
                'grant_id': grant_id,
                'revoked': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_key(self, key_id):
        """Describir clave"""
        
        try:
            response = self.kms.describe_key(KeyId=key_id)
            key_metadata = response['KeyMetadata']
            
            key_info = {
                'key_id': key_metadata['KeyId'],
                'key_arn': key_metadata['Arn'],
                'description': key_metadata.get('Description', ''),
                'key_usage': key_metadata.get('KeyUsage', ''),
                'key_spec': key_metadata.get('KeySpec', ''),
                'key_state': key_metadata.get('KeyState', ''),
                'origin': key_metadata.get('Origin', ''),
                'creation_date': key_metadata.get('CreationDate').isoformat() if key_metadata.get('CreationDate') else None,
                'deletion_date': key_metadata.get('DeletionDate').isoformat() if key_metadata.get('DeletionDate') else None,
                'valid_to': key_metadata.get('ValidTo').isoformat() if key_metadata.get('ValidTo') else None,
                'multi_region': key_metadata.get('MultiRegion', False)
            }
            
            return {
                'success': True,
                'key_info': key_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_keys(self, limit=100, marker=None):
        """Listar claves"""
        
        try:
            params = {'Limit': limit}
            if marker:
                params['Marker'] = marker
            
            response = self.kms.list_keys(**params)
            
            keys = []
            for key in response['Keys']:
                key_info = {
                    'key_id': key['KeyId'],
                    'key_arn': key['KeyArn']
                }
                keys.append(key_info)
            
            return {
                'success': True,
                'keys': keys,
                'count': len(keys),
                'next_marker': response.get('NextMarker')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_key_rotation_status(self, key_id):
        """Obtener estado de rotación de clave"""
        
        try:
            response = self.kms.get_key_rotation_status(KeyId=key_id)
            
            return {
                'success': True,
                'key_id': key_id,
                'key_rotation_enabled': response['KeyRotationEnabled']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_key_policy(self, key_id, policy_name='default'):
        """Obtener política de clave"""
        
        try:
            response = self.kms.get_key_policy(
                KeyId=key_id,
                PolicyName=policy_name
            )
            
            policy = response['Policy']
            
            return {
                'success': True,
                'key_id': key_id,
                'policy_name': policy_name,
                'policy': json.loads(policy)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def put_key_policy(self, key_id, policy, policy_name='default'):
        """Actualizar política de clave"""
        
        try:
            if isinstance(policy, dict):
                policy_json = json.dumps(policy)
            else:
                policy_json = policy
            
            response = self.kms.put_key_policy(
                KeyId=key_id,
                PolicyName=policy_name,
                Policy=policy_json
            )
            
            return {
                'success': True,
                'key_id': key_id,
                'policy_name': policy_name,
                'policy_updated': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_public_key(self, key_id):
        """Obtener clave pública (para claves asimétricas)"""
        
        try:
            response = self.kms.get_public_key(KeyId=key_id)
            
            public_key = response['PublicKey']
            key_spec = response['KeySpec']
            key_usage = response['KeyUsage']
            encryption_algorithms = response.get('EncryptionAlgorithms', [])
            signing_algorithms = response.get('SigningAlgorithms', [])
            
            return {
                'success': True,
                'key_id': key_id,
                'public_key': base64.b64encode(public_key).decode('utf-8'),
                'key_spec': key_spec,
                'key_usage': key_usage,
                'encryption_algorithms': encryption_algorithms,
                'signing_algorithms': signing_algorithms
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def import_key_material(self, key_id, key_material, import_token, 
                          wrapping_algorithm='RSAES_OAEP_SHA_1', valid_to=None):
        """Importar material de clave"""
        
        try:
            params = {
                'KeyId': key_id,
                'ImportToken': import_token,
                'EncryptedKeyMaterial': key_material,
                'WrappingAlgorithm': wrapping_algorithm
            }
            
            if valid_to:
                params['ValidTo'] = valid_to
            
            response = self.kms.import_key_material(**params)
            
            key_id = response['KeyId']
            
            return {
                'success': True,
                'key_id': key_id,
                'import_completed': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_parameters_for_import(self, key_id, wrapping_algorithm='RSAES_OAEP_SHA_1',
                                 wrapping_key_spec='RSA_2048'):
        """Obtener parámetros para importación"""
        
        try:
            response = self.kms.get_parameters_for_import(
                KeyId=key_id,
                WrappingAlgorithm=wrapping_algorithm,
                WrappingKeySpec=wrapping_key_spec
            )
            
            import_token = response['ImportToken']
            public_key = response['PublicKey']
            parameters_valid_to = response['ParametersValidTo']
            
            return {
                'success': True,
                'key_id': key_id,
                'import_token': base64.b64encode(import_token).decode('utf-8'),
                'public_key': base64.b64encode(public_key).decode('utf-8'),
                'parameters_valid_to': parameters_valid_to.isoformat(),
                'wrapping_algorithm': wrapping_algorithm,
                'wrapping_key_spec': wrapping_key_spec
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_key_usage_statistics(self, key_id, start_time, end_time):
        """Obtener estadísticas de uso de clave"""
        
        try:
            # Obtener métricas de CloudWatch
            metrics = {
                'encryption_attempts': 0,
                'decryption_attempts': 0,
                'generate_data_key_attempts': 0,
                'sign_attempts': 0,
                'verify_attempts': 0
            }
            
            # Métricas de cifrado
            try:
                response = self.cloudwatch.get_metric_statistics(
                    Namespace='AWS/KMS',
                    MetricName='EncryptionAttempts',
                    Dimensions=[
                        {'Name': 'KeyId', 'Value': key_id}
                    ],
                    StartTime=start_time,
                    EndTime=end_time,
                    Period=300,
                    Statistics=['Sum']
                )
                
                if response['Datapoints']:
                    metrics['encryption_attempts'] = sum(dp['Sum'] for dp in response['Datapoints'])
                
            except Exception:
                pass
            
            # Métricas de descifrado
            try:
                response = self.cloudwatch.get_metric_statistics(
                    Namespace='AWS/KMS',
                    MetricName='DecryptionAttempts',
                    Dimensions=[
                        {'Name': 'KeyId', 'Value': key_id}
                    ],
                    StartTime=start_time,
                    EndTime=end_time,
                    Period=300,
                    Statistics=['Sum']
                )
                
                if response['Datapoints']:
                    metrics['decryption_attempts'] = sum(dp['Sum'] for dp in response['Datapoints'])
                
            except Exception:
                pass
            
            return {
                'success': True,
                'key_id': key_id,
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
    
    def audit_key_usage(self, key_id, start_time, end_time):
        """Auditar uso de clave"""
        
        try:
            # Buscar eventos en CloudTrail
            events = []
            
            try:
                response = self.cloudtrail.lookup_events(
                    LookupAttributes=[
                        {'AttributeKey': 'ResourceName', 'AttributeValue': key_id}
                    ],
                    StartTime=start_time,
                    EndTime=end_time,
                    MaxResults=50
                )
                
                for event in response['Events']:
                    event_info = {
                        'event_time': event['EventTime'].isoformat(),
                        'event_name': event['EventName'],
                        'username': event.get('Username', ''),
                        'resource_name': event.get('Resources', [{}])[0].get('ResourceName', ''),
                        'cloud_trail_event': json.loads(event['CloudTrailEvent'])
                    }
                    events.append(event_info)
                
            except Exception:
                pass
            
            # Analizar eventos
            audit_summary = {
                'total_events': len(events),
                'unique_users': len(set(e['username'] for e in events if e['username'])),
                'operations': {},
                'timeline': []
            }
            
            # Agrupar por operaciones
            for event in events:
                operation = event['event_name']
                if operation not in audit_summary['operations']:
                    audit_summary['operations'][operation] = 0
                audit_summary['operations'][operation] += 1
            
            # Crear timeline
            sorted_events = sorted(events, key=lambda x: x['event_time'])
            audit_summary['timeline'] = [
                {
                    'time': event['event_time'],
                    'operation': event['event_name'],
                    'user': event['username']
                }
                for event in sorted_events
            ]
            
            return {
                'success': True,
                'key_id': key_id,
                'audit_summary': audit_summary,
                'events': events
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Crear y Usar Clave Simétrica**
```python
# Ejemplo: Crear clave para cifrado de datos
manager = KMSManager('us-east-1')

# Crear clave
key_result = manager.create_customer_master_key(
    key_description='Production Data Encryption Key',
    key_spec='SYMMETRIC_DEFAULT',
    tags=[
        {'Key': 'Environment', 'Value': 'production'},
        {'Key': 'Purpose', 'Value': 'data-encryption'}
    ]
)

if key_result['success']:
    key_id = key_result['key_id']
    
    # Cifrar datos
    sensitive_data = "Confidential information"
    encrypt_result = manager.encrypt_data(
        data=sensitive_data,
        key_id=key_id
    )
    
    if encrypt_result['success']:
        encrypted_data = encrypt_result['ciphertext_blob']
        
        # Descifrar datos
        decrypt_result = manager.decrypt_data(
            ciphertext_blob=encrypted_data
        )
        
        if decrypt_result['success']:
            print(f"Decrypted: {decrypt_result['plaintext']}")
```

### **2. Crear y Usar Clave Asimétrica**
```python
# Ejemplo: Crear clave para firmas digitales
key_result = manager.create_asymmetric_key(
    key_description='Digital Signature Key',
    key_pair_spec='RSA_2048',
    key_usage='SIGN_VERIFY'
)

if key_result['success']:
    key_id = key_result['key_id']
    
    # Firmar datos
    document = "Important document to sign"
    sign_result = manager.sign_data(
        data=document,
        key_id=key_id
    )
    
    if sign_result['success']:
        signature = sign_result['signature']
        
        # Verificar firma
        verify_result = manager.verify_signature(
            data=document,
            signature=signature,
            key_id=key_id
        )
        
        if verify_result['success']:
            print(f"Signature valid: {verify_result['signature_valid']}")
```

### **3. Generar y Usar Clave de Datos**
```python
# Ejemplo: Envelope encryption
key_result = manager.create_customer_master_key(
    key_description='Envelope Encryption Master Key'
)

if key_result['success']:
    master_key_id = key_result['key_id']
    
    # Generar clave de datos
    data_key_result = manager.generate_data_key(master_key_id)
    
    if data_key_result['success']:
        plaintext_key = base64.b64decode(data_key_result['plaintext_key'])
        ciphertext_key = data_key_result['ciphertext_key']
        
        # Usar clave de datos para cifrar localmente
        # (Aquí iría el cifrado local con la clave de datos)
        
        # Guardar ciphertext_key para descifrar después
        # Descifrar clave de datos cuando se necesite
        decrypt_key_result = manager.decrypt_data_key(ciphertext_key)
        
        if decrypt_key_result['success']:
            decrypted_key = base64.b64decode(decrypt_key_result['plaintext_key'])
            # Usar clave descifrada para descifrar datos
```

## Configuración con AWS CLI

### **Gestión de Claves**
```bash
# Crear clave simétrica
aws kms create-key \
  --description "Production encryption key" \
  --key-usage ENCRYPT_DECRYPT \
  --origin AWS_KMS \
  --tags TagKey=Environment,TagValue=production TagKey=Purpose,TagValue=data-encryption

# Crear clave asimétrica
aws kms create-key \
  --description "Digital signature key" \
  --key-usage SIGN_VERIFY \
  --key-spec RSA_2048

# Crear alias
aws kms create-alias \
  --alias-name alias/production-key \
  --target-key-id key-id

# Describir clave
aws kms describe-key --key-id alias/production-key

# Listar claves
aws kms list-keys
```

### **Operaciones de Cifrado**
```bash
# Cifrar datos
aws kms encrypt \
  --key-id alias/production-key \
  --plaintext "Sensitive data" \
  --encryption-context purpose=test,environment=dev \
  --output text \
  --query CiphertextBlob \
  --base64

# Descifrar datos
aws kms decrypt \
  --ciphertext-blob file://encrypted-data.bin \
  --encryption-context purpose=test,environment=dev \
  --output text \
  --query Plaintext \
  --base64

# Generar clave de datos
aws kms generate-data-key \
  --key-id alias/production-key \
  --key-spec AES_256 \
  --encryption-context purpose=data-encryption \
  --output json
```

### **Gestión de Políticas**
```bash
# Obtener política de clave
aws kms get-key-policy \
  --key-id alias/production-key \
  --policy-name default

# Actualizar política de clave
aws kms put-key-policy \
  --key-id alias/production-key \
  --policy-name default \
  --policy file://key-policy.json

# Habilitar rotación automática
aws kms enable-key-rotation \
  --key-id alias/production-key

# Verificar estado de rotación
aws kms get-key-rotation-status \
  --key-id alias/production-key
```

## Best Practices

### **1. Gestión de Claves**
- Usar claves separadas para diferentes tipos de datos
- Habilitar rotación automática para claves simétricas
- Implementar políticas de acceso granulares
- Usar aliases para facilitar gestión

### **2. Seguridad**
- Usar contexto de cifrado para control adicional
- Limitar acceso a claves con políticas IAM
- Monitorear uso de claves con CloudTrail
- Implementar auditoría regular

### **3. Rendimiento**
- Usar envelope encryption para datos grandes
- Generar claves de datos para operaciones locales
- Cachear claves de datos descifradas con cuidado
- Optimizar tamaño de datos para cifrado

### **4. Cumplimiento**
- Documentar políticas de uso de claves
- Mantener registros de auditoría
- Cumplir con estándares regulatorios
- Implementar retención de claves adecuada

## Costos

### **Precios de KMS**
- **Claves CMK**: $1.00 por mes por clave
- **Operaciones de cifrado**: $0.02 por 10,000 operaciones
- **Claves multi-región**: $1.00 por mes por réplica
- **Importación de claves**: Sin costo adicional

### **Ejemplo de Costos Mensuales**
- **5 claves CMK**: 5 × $1.00 = $5.00
- **100,000 operaciones**: 10 × $0.02 = $200.00
- **2 réplicas multi-región**: 2 × $1.00 = $2.00
- **Total estimado**: ~$207.00 por mes

## Troubleshooting

### **Problemas Comunes**
1. **Acceso denegado**: Verificar políticas IAM y de clave
2. **Clave deshabilitada**: Verificar estado de la clave
3. **Contexto incorrecto**: Validar contexto de cifrado
4. **Rotación fallida**: Revisar configuración de rotación

### **Comandos de Diagnóstico**
```bash
# Verificar estado de clave
aws kms describe-key --key-id key-id

# Verificar políticas de acceso
aws kms get-key-policy --key-id key-id --policy-name default

# Verificar métricas de uso
aws cloudwatch get-metric-statistics \
  --namespace AWS/KMS \
  --metric-name EncryptionAttempts \
  --dimensions Name=KeyId,Value=key-id

# Verificar eventos en CloudTrail
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=key-id
```

## Cumplimiento Normativo

### **PCI-DSS**
- **Requerimiento 3**: Protección de datos de titulares de tarjetas
- **Requerimiento 10**: Tracking y monitoreo de acceso a datos
- **Requerimiento 12**: Políticas de seguridad

### **HIPAA**
- **Security Rule**: Controles técnicos y administrativos
- **Privacy Rule**: Protección de información de salud
- **Breach Notification**: Notificación de violaciones

### **GDPR**
- **Artículo 32**: Seguridad del tratamiento
- **Artículo 25**: Protección de datos desde el diseño
- **Artículo 33**: Notificación de brechas de seguridad

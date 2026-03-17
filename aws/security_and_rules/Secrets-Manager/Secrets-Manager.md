# AWS Secrets Manager

## Definición

AWS Secrets Manager es un servicio que permite crear, gestionar y rotar secretos de manera segura. Centraliza el control de secretos como credenciales de base de datos, tokens de API y claves de acceso, eliminando la necesidad de almacenar información sensible en código o archivos de configuración.

## Características Principales

### **Gestión Centralizada**
- **Almacenamiento seguro**: Cifrado automático con AWS KMS
- **Control de acceso**: Políticas granulares con IAM
- **Versionado**: Control de versiones de secretos
- **Auditoría completa**: Logs detallados con CloudTrail
- **Integración nativa**: Con servicios AWS

### **Rotación Automática**
- **Rotación programada**: Configuración de intervalos de rotación
- **Lambda functions**: Rotación automatizada con Lambda
- **Plantillas predefinidas**: Para bases de datos populares
- **Notificaciones**: Alertas de rotación exitosa o fallida
- **Compatibilidad**: RDS, DocumentDB, Redshift y más

### **Seguridad Avanzada**
- **Cifrado KMS**: Cifrado automático con claves KMS
- **Recuperación**: Eliminación suave y recuperación
- **Replicación**: Replicación multi-región
- **Validación**: Validación de secretos durante rotación
- **Control de acceso**: IAM policies y resource policies

## Tipos de Secretos

### **1. Credenciales de Base de Datos**
- **RDS**: MySQL, PostgreSQL, SQL Server, Oracle, MariaDB
- **Aurora**: MySQL y PostgreSQL compatible
- **DocumentDB**: MongoDB compatible
- **Redshift**: Data warehouse
- **Neptune**: Graph database

### **2. Credenciales de Servicios**
- **API Keys**: Tokens de API de terceros
- **OAuth Tokens**: Tokens de acceso OAuth
- **Service Credentials**: Credenciales de microservicios
- **SSH Keys**: Claves SSH para acceso a servidores

### **3. Secretos Personalizados**
- **JSON**: Estructuras de datos complejas
- **Binary**: Archivos binarios (certificados, claves)
- **Plain Text**: Texto plano simple
- **Key-Value**: Pares clave-valor

## Arquitectura de Secrets Manager

### **Componentes Principales**
```
Secrets Manager Architecture
├── Secret Store
│   ├── Secrets (Secretos)
│   ├── Versions (Versiones)
│   ├── Staging Labels (Etiquetas de staging)
│   └── Rotation Configuration (Configuración de rotación)
├── Access Control
│   ├── IAM Policies (Políticas IAM)
│   ├── Resource Policies (Políticas de recursos)
│   ├── VPC Endpoints (Endpoints de VPC)
│   └── KMS Integration (Integración KMS)
├── Rotation Engine
│   ├── Lambda Functions (Funciones Lambda)
│   ├── Rotation Templates (Plantillas de rotación)
│   ├── Rotation Schedule (Programación de rotación)
│   └── Validation (Validación)
└── Monitoring
    ├── CloudTrail Logs
    ├── CloudWatch Metrics
    ├── EventBridge Events
    └── Health Checks
```

### **Flujo de Rotación**
```
Schedule Trigger → Lambda Function → Create New Version → Test Secret → Update Application → Mark as Current
```

## Configuración de Secrets Manager

### **Gestión Completa de Secretos**
```python
import boto3
import json
import time
import base64
import secrets
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

class SecretsManager:
    def __init__(self, region='us-east-1'):
        self.secretsmanager = boto3.client('secretsmanager', region_name=region)
        self.kms = boto3.client('kms', region_name=region)
        self.lambda_client = boto3.client('lambda', region_name=region)
        self.rds = boto3.client('rds', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.region = region
    
    def create_database_secret(self, secret_name, database_type, username, password,
                              host, port, database_name, engine, tags=None):
        """Crear secreto de base de datos"""
        
        try:
            # Estructura del secreto para base de datos
            secret_structure = {
                'username': username,
                'password': password,
                'engine': engine,
                'host': host,
                'port': port,
                'dbname': database_name,
                'dbInstanceIdentifier': database_name
            }
            
            # Crear secreto
            secret_params = {
                'Name': secret_name,
                'SecretString': json.dumps(secret_structure),
                'Description': f'Database credentials for {database_name}',
                'Tags': tags or []
            }
            
            response = self.secretsmanager.create_secret(**secret_params)
            secret_arn = response['ARN']
            secret_name = response['Name']
            version_id = response['VersionId']
            
            return {
                'success': True,
                'secret_arn': secret_arn,
                'secret_name': secret_name,
                'version_id': version_id,
                'database_type': database_type,
                'engine': engine
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_api_key_secret(self, secret_name, api_key, api_secret, service_name,
                           additional_data=None, tags=None):
        """Crear secreto de API key"""
        
        try:
            # Estructura del secreto para API key
            secret_structure = {
                'apiKey': api_key,
                'apiSecret': api_secret,
                'serviceName': service_name,
                'createdDate': datetime.utcnow().isoformat()
            }
            
            if additional_data:
                secret_structure.update(additional_data)
            
            # Crear secreto
            secret_params = {
                'Name': secret_name,
                'SecretString': json.dumps(secret_structure),
                'Description': f'API credentials for {service_name}',
                'Tags': tags or []
            }
            
            response = self.secretsmanager.create_secret(**secret_params)
            secret_arn = response['ARN']
            secret_name = response['Name']
            version_id = response['VersionId']
            
            return {
                'success': True,
                'secret_arn': secret_arn,
                'secret_name': secret_name,
                'version_id': version_id,
                'service_name': service_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_ssh_key_secret(self, secret_name, private_key, public_key,
                            username, host, port=22, tags=None):
        """Crear secreto de clave SSH"""
        
        try:
            # Estructura del secreto para SSH key
            secret_structure = {
                'privateKey': private_key,
                'publicKey': public_key,
                'username': username,
                'host': host,
                'port': port,
                'createdDate': datetime.utcnow().isoformat()
            }
            
            # Crear secreto
            secret_params = {
                'Name': secret_name,
                'SecretString': json.dumps(secret_structure),
                'Description': f'SSH credentials for {username}@{host}',
                'Tags': tags or []
            }
            
            response = self.secretsmanager.create_secret(**secret_params)
            secret_arn = response['ARN']
            secret_name = response['Name']
            version_id = response['VersionId']
            
            return {
                'success': True,
                'secret_arn': secret_arn,
                'secret_name': secret_name,
                'version_id': version_id,
                'host': host,
                'username': username
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_custom_secret(self, secret_name, secret_data, secret_type='string',
                           description=None, tags=None):
        """Crear secreto personalizado"""
        
        try:
            # Determinar si es string o binary
            if secret_type == 'binary':
                secret_params = {
                    'Name': secret_name,
                    'SecretBinary': secret_data,
                    'Description': description or f'Custom binary secret: {secret_name}',
                    'Tags': tags or []
                }
            else:
                secret_params = {
                    'Name': secret_name,
                    'SecretString': secret_data,
                    'Description': description or f'Custom secret: {secret_name}',
                    'Tags': tags or []
                }
            
            response = self.secretsmanager.create_secret(**secret_params)
            secret_arn = response['ARN']
            secret_name = response['Name']
            version_id = response['VersionId']
            
            return {
                'success': True,
                'secret_arn': secret_arn,
                'secret_name': secret_name,
                'version_id': version_id,
                'secret_type': secret_type
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def rotate_secret(self, secret_name, rotation_lambda_arn=None, rotation_rules=None):
        """Rotar secreto manualmente"""
        
        try:
            rotate_params = {
                'SecretId': secret_name
            }
            
            if rotation_lambda_arn:
                rotate_params['RotationLambdaARN'] = rotation_lambda_arn
            
            if rotation_rules:
                rotate_params['RotationRules'] = rotation_rules
            
            response = self.secretsmanager.rotate_secret(**rotate_params)
            
            secret_arn = response['ARN']
            secret_name = response['Name']
            version_id = response['VersionId']
            
            return {
                'success': True,
                'secret_arn': secret_arn,
                'secret_name': secret_name,
                'version_id': version_id,
                'rotation_initiated': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def setup_automatic_rotation(self, secret_name, rotation_interval_days=30,
                               rotation_lambda_arn=None):
        """Configurar rotación automática"""
        
        try:
            # Configurar reglas de rotación
            rotation_rules = {
                'AutomaticallyAfterDays': rotation_interval_days
            }
            
            # Si no se proporciona Lambda, usar Lambda por defecto de AWS
            if not rotation_lambda_arn:
                # Obtener información del secreto para determinar el tipo
                secret_response = self.secretsmanager.describe_secret(SecretId=secret_name)
                secret_description = secret_response.get('Description', '')
                
                # Determinar Lambda de rotación basado en el tipo de base de datos
                if 'mysql' in secret_description.lower():
                    rotation_lambda_arn = f'arn:aws:lambda:{self.region}:123456789012:function:SecretsManagerRotationTemplate-MySQLSingleUser'
                elif 'postgresql' in secret_description.lower():
                    rotation_lambda_arn = f'arn:aws:lambda:{self.region}:123456789012:function:SecretsManagerRotationTemplate-PostgreSQLSingleUser'
                elif 'sql server' in secret_description.lower():
                    rotation_lambda_arn = f'arn:aws:lambda:{self.region}:123456789012:function:SecretsManagerRotationTemplate-SQLServerSingleUser'
                else:
                    rotation_lambda_arn = None
            
            rotation_params = {
                'SecretId': secret_name,
                'RotationRules': rotation_rules
            }
            
            if rotation_lambda_arn:
                rotation_params['RotationLambdaARN'] = rotation_lambda_arn
            
            response = self.secretsmanager.rotate_secret(**rotation_params)
            
            return {
                'success': True,
                'secret_name': secret_name,
                'rotation_interval_days': rotation_interval_days,
                'rotation_lambda_arn': rotation_lambda_arn,
                'rotation_configured': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_rotation_lambda(self, secret_name, database_type, function_name=None):
        """Crear función Lambda para rotación personalizada"""
        
        try:
            # Nombre de la función
            if not function_name:
                function_name = f'{secret_name}-rotation-function'
            
            # Código de rotación basado en el tipo de base de datos
            if database_type.lower() == 'mysql':
                lambda_code = self._get_mysql_rotation_code(secret_name)
            elif database_type.lower() == 'postgresql':
                lambda_code = self._get_postgresql_rotation_code(secret_name)
            elif database_type.lower() == 'sqlserver':
                lambda_code = self._get_sqlserver_rotation_code(secret_name)
            else:
                lambda_code = self._get_generic_rotation_code(secret_name)
            
            # Crear función Lambda
            lambda_params = {
                'FunctionName': function_name,
                'Runtime': 'python3.9',
                'Role': f'arn:aws:iam::123456789012:role/lambda-execution-role',  # Reemplazar con rol real
                'Handler': 'lambda_function.lambda_handler',
                'Code': {
                    'ZipFile': lambda_code
                },
                'Description': f'Rotation function for {secret_name}',
                'Timeout': 300,
                'Environment': {
                    'Variables': {
                        'SECRET_NAME': secret_name
                    }
                }
            }
            
            response = self.lambda_client.create_function(**lambda_params)
            function_arn = response['FunctionArn']
            
            return {
                'success': True,
                'function_name': function_name,
                'function_arn': function_arn,
                'database_type': database_type,
                'secret_name': secret_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_mysql_rotation_code(self, secret_name):
        """Obtener código de rotación para MySQL"""
        
        return '''
import json
import boto3
import pymysql
import secrets
import string
import os

def lambda_handler(event, context):
    secret_name = os.environ['SECRET_NAME']
    
    # Conectar a Secrets Manager
    client = boto3.client('secretsmanager')
    
    try:
        # Obtener secreto actual
        current_secret = client.get_secret_value(SecretId=secret_name)
        secret_data = json.loads(current_secret['SecretString'])
        
        # Generar nueva contraseña
        new_password = generate_password()
        
        # Conectar a base de datos y cambiar contraseña
        connection = pymysql.connect(
            host=secret_data['host'],
            user=secret_data['username'],
            password=secret_data['password'],
            database=secret_data['dbname'],
            port=secret_data['port']
        )
        
        with connection.cursor() as cursor:
            cursor.execute("ALTER USER %s@%s IDENTIFIED BY %s", 
                          (secret_data['username'], secret_data['host'], new_password))
            connection.commit()
        
        connection.close()
        
        # Actualizar secreto
        secret_data['password'] = new_password
        client.put_secret_value(
            SecretId=secret_name,
            SecretString=json.dumps(secret_data)
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Secret rotated successfully'})
        }
        
    except Exception as e:
        print(f"Error rotating secret: {str(e)}")
        raise e

def generate_password(length=32):
    characters = string.ascii_letters + string.digits + '!@#$%^&*()_+-=[]{}|;:,.<>?'
    return ''.join(secrets.choice(characters) for _ in range(length))
'''
    
    def _get_postgresql_rotation_code(self, secret_name):
        """Obtener código de rotación para PostgreSQL"""
        
        return '''
import json
import boto3
import psycopg2
import secrets
import string
import os

def lambda_handler(event, context):
    secret_name = os.environ['SECRET_NAME']
    
    # Conectar a Secrets Manager
    client = boto3.client('secretsmanager')
    
    try:
        # Obtener secreto actual
        current_secret = client.get_secret_value(SecretId=secret_name)
        secret_data = json.loads(current_secret['SecretString'])
        
        # Generar nueva contraseña
        new_password = generate_password()
        
        # Conectar a base de datos y cambiar contraseña
        connection = psycopg2.connect(
            host=secret_data['host'],
            user=secret_data['username'],
            password=secret_data['password'],
            database=secret_data['dbname'],
            port=secret_data['port']
        )
        
        with connection.cursor() as cursor:
            cursor.execute("ALTER USER %s WITH PASSWORD %s", 
                          (secret_data['username'], new_password))
            connection.commit()
        
        connection.close()
        
        # Actualizar secreto
        secret_data['password'] = new_password
        client.put_secret_value(
            SecretId=secret_name,
            SecretString=json.dumps(secret_data)
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Secret rotated successfully'})
        }
        
    except Exception as e:
        print(f"Error rotating secret: {str(e)}")
        raise e

def generate_password(length=32):
    characters = string.ascii_letters + string.digits + '!@#$%^&*()_+-=[]{}|;:,.<>?'
    return ''.join(secrets.choice(characters) for _ in range(length))
'''
    
    def _get_sqlserver_rotation_code(self, secret_name):
        """Obtener código de rotación para SQL Server"""
        
        return '''
import json
import boto3
import pyodbc
import secrets
import string
import os

def lambda_handler(event, context):
    secret_name = os.environ['SECRET_NAME']
    
    # Conectar a Secrets Manager
    client = boto3.client('secretsmanager')
    
    try:
        # Obtener secreto actual
        current_secret = client.get_secret_value(SecretId=secret_name)
        secret_data = json.loads(current_secret['SecretString'])
        
        # Generar nueva contraseña
        new_password = generate_password()
        
        # Conectar a base de datos y cambiar contraseña
        connection_string = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={secret_data['host']};DATABASE={secret_data['dbname']};UID={secret_data['username']};PWD={secret_data['password']}"
        
        connection = pyodbc.connect(connection_string)
        
        with connection.cursor() as cursor:
            cursor.execute(f"ALTER LOGIN {secret_data['username']} WITH PASSWORD = '{new_password}'")
            connection.commit()
        
        connection.close()
        
        # Actualizar secreto
        secret_data['password'] = new_password
        client.put_secret_value(
            SecretId=secret_name,
            SecretString=json.dumps(secret_data)
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Secret rotated successfully'})
        }
        
    except Exception as e:
        print(f"Error rotating secret: {str(e)}")
        raise e

def generate_password(length=32):
    characters = string.ascii_letters + string.digits + '!@#$%^&*()_+-=[]{}|;:,.<>?'
    return ''.join(secrets.choice(characters) for _ in range(length))
'''
    
    def _get_generic_rotation_code(self, secret_name):
        """Obtener código de rotación genérico"""
        
        return '''
import json
import boto3
import secrets
import string
import os

def lambda_handler(event, context):
    secret_name = os.environ['SECRET_NAME']
    
    # Conectar a Secrets Manager
    client = boto3.client('secretsmanager')
    
    try:
        # Obtener secreto actual
        current_secret = client.get_secret_value(SecretId=secret_name)
        secret_data = json.loads(current_secret['SecretString'])
        
        # Generar nuevo valor (ejemplo para API key)
        new_api_key = generate_api_key()
        new_api_secret = generate_api_secret()
        
        # Actualizar secreto (aquí iría la lógica específica del servicio)
        secret_data['apiKey'] = new_api_key
        secret_data['apiSecret'] = new_api_secret
        secret_data['updatedDate'] = boto3.client('secretsmanager').describe_secret(SecretId=secret_name)['LastChangedDate'].isoformat()
        
        # Actualizar secreto en Secrets Manager
        client.put_secret_value(
            SecretId=secret_name,
            SecretString=json.dumps(secret_data)
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Secret rotated successfully'})
        }
        
    except Exception as e:
        print(f"Error rotating secret: {str(e)}")
        raise e

def generate_api_key(length=32):
    return secrets.token_urlsafe(length)

def generate_api_secret(length=64):
    characters = string.ascii_letters + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))
'''
    
    def get_secret_value(self, secret_name, version_stage=None):
        """Obtener valor de secreto"""
        
        try:
            get_params = {'SecretId': secret_name}
            
            if version_stage:
                get_params['VersionStage'] = version_stage
            
            response = self.secretsmanager.get_secret_value(**get_params)
            
            secret_data = {
                'arn': response['ARN'],
                'name': response['Name'],
                'version_id': response['VersionId'],
                'version_stages': response.get('VersionStages', []),
                'created_date': response.get('CreatedDate').isoformat() if response.get('CreatedDate') else None,
                'secret_string': response.get('SecretString'),
                'secret_binary': response.get('SecretBinary')
            }
            
            return {
                'success': True,
                'secret_data': secret_data
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_secret_value(self, secret_name, secret_string=None, secret_binary=None,
                          version_stages=None):
        """Actualizar valor de secreto"""
        
        try:
            update_params = {'SecretId': secret_name}
            
            if secret_string:
                update_params['SecretString'] = secret_string
            
            if secret_binary:
                update_params['SecretBinary'] = secret_binary
            
            if version_stages:
                update_params['VersionStages'] = version_stages
            
            response = self.secretsmanager.put_secret_value(**update_params)
            
            return {
                'success': True,
                'arn': response['ARN'],
                'name': response['Name'],
                'version_id': response['VersionId'],
                'version_stages': response.get('VersionStages', [])
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_secret_version(self, secret_name, secret_string=None, secret_binary=None,
                             version_stages=None):
        """Crear nueva versión de secreto"""
        
        try:
            create_params = {'SecretId': secret_name}
            
            if secret_string:
                create_params['SecretString'] = secret_string
            
            if secret_binary:
                create_params['SecretBinary'] = secret_binary
            
            if version_stages:
                create_params['VersionStages'] = version_stages
            
            response = self.secretsmanager.create_secret(**create_params)
            
            return {
                'success': True,
                'arn': response['ARN'],
                'name': response['Name'],
                'version_id': response['VersionId'],
                'version_stages': response.get('VersionStages', [])
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_secret_versions(self, secret_name, include_planned_deletions=False,
                          max_results=100, next_token=None):
        """Listar versiones de secreto"""
        
        try:
            list_params = {
                'SecretId': secret_name,
                'IncludePlannedDeletions': include_planned_deletions,
                'MaxResults': max_results
            }
            
            if next_token:
                list_params['NextToken'] = next_token
            
            response = self.secretsmanager.list_secret_version_ids(**list_params)
            
            versions = []
            for version in response['Versions']:
                version_info = {
                    'version_id': version['VersionId'],
                    'version_stages': version.get('VersionStages', []),
                    'last_accessed_date': version.get('LastAccessedDate').isoformat() if version.get('LastAccessedDate') else None,
                    'created_date': version.get('CreatedDate').isoformat() if version.get('CreatedDate') else None
                }
                versions.append(version_info)
            
            return {
                'success': True,
                'secret_name': secret_name,
                'versions': versions,
                'count': len(versions),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_secret(self, secret_name, recovery_window_in_days=30,
                      force_delete_without_recovery=False):
        """Eliminar secreto"""
        
        try:
            delete_params = {'SecretId': secret_name}
            
            if force_delete_without_recovery:
                delete_params['ForceDeleteWithoutRecovery'] = True
            else:
                delete_params['RecoveryWindowInDays'] = recovery_window_in_days
            
            response = self.secretsmanager.delete_secret(**delete_params)
            
            return {
                'success': True,
                'arn': response['ARN'],
                'name': response['Name'],
                'deletion_date': response.get('DeletionDate').isoformat() if response.get('DeletionDate') else None
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def restore_secret(self, secret_name):
        """Restaurar secreto eliminado"""
        
        try:
            response = self.secretsmanager.restore_secret(SecretId=secret_name)
            
            return {
                'success': True,
                'arn': response['ARN'],
                'name': response['Name'],
                'restored': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def replicate_secret_to_region(self, secret_name, region, kms_key_id=None):
        """Replicar secreto a otra región"""
        
        try:
            replicate_params = {
                'SecretId': secret_name,
                'ReplicaRegion': region
            }
            
            if kms_key_id:
                replicate_params['KmsKeyId'] = kms_key_id
            
            response = self.secretsmanager.replicate_secret_to_region(**replicate_params)
            
            return {
                'success': True,
                'replicated_secret_arn': response['ReplicatedSecretArn'],
                'source_region': self.region,
                'target_region': region
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def remove_replica_region(self, secret_name, region):
        """Eliminar réplica de región"""
        
        try:
            response = self.secretsmanager.remove_regions_from_replication(
                SecretId=secret_name,
                RemoveReplicaRegions=[region]
            )
            
            return {
                'success': True,
                'arn': response['ARN'],
                'replica_regions_removed': [region]
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_secrets(self, filters=None, max_results=100, next_token=None,
                    include_planned_deletions=False):
        """Listar secretos"""
        
        try:
            list_params = {
                'MaxResults': max_results,
                'IncludePlannedDeletions': include_planned_deletions
            }
            
            if filters:
                list_params['Filters'] = filters
            
            if next_token:
                list_params['NextToken'] = next_token
            
            response = self.secretsmanager.list_secrets(**list_params)
            
            secrets = []
            for secret in response['SecretList']:
                secret_info = {
                    'arn': secret['ARN'],
                    'name': secret['Name'],
                    'description': secret.get('Description', ''),
                    'last_changed_date': secret.get('LastChangedDate').isoformat() if secret.get('LastChangedDate') else None,
                    'last_accessed_date': secret.get('LastAccessedDate').isoformat() if secret.get('LastAccessedDate') else None,
                    'rotation_enabled': secret.get('RotationEnabled', False),
                    'rotation_lambda_arn': secret.get('RotationLambdaARN', ''),
                    'rotation_rules': secret.get('RotationRules', {}),
                    'next_rotation_date': secret.get('NextRotationDate').isoformat() if secret.get('NextRotationDate') else None,
                    'tags': secret.get('Tags', []),
                    'secret_versions_to_stages': secret.get('SecretVersionsToStages', {}),
                    'owning_service': secret.get('OwningService', ''),
                    'created_date': secret.get('CreatedDate').isoformat() if secret.get('CreatedDate') else None,
                    'primary_region': secret.get('PrimaryRegion', ''),
                    'replica_regions': secret.get('ReplicaRegions', [])
                }
                secrets.append(secret_info)
            
            return {
                'success': True,
                'secrets': secrets,
                'count': len(secrets),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_secret(self, secret_name):
        """Describir secreto"""
        
        try:
            response = self.secretsmanager.describe_secret(SecretId=secret_name)
            
            secret_info = {
                'arn': response['ARN'],
                'name': response['Name'],
                'description': response.get('Description', ''),
                'last_changed_date': response.get('LastChangedDate').isoformat() if response.get('LastChangedDate') else None,
                'last_accessed_date': response.get('LastAccessedDate').isoformat() if response.get('LastAccessedDate') else None,
                'rotation_enabled': response.get('RotationEnabled', False),
                'rotation_lambda_arn': response.get('RotationLambdaARN', ''),
                'rotation_rules': response.get('RotationRules', {}),
                'next_rotation_date': response.get('NextRotationDate').isoformat() if response.get('NextRotationDate') else None,
                'tags': response.get('Tags', []),
                'secret_versions_to_stages': response.get('SecretVersionsToStages', {}),
                'owning_service': response.get('OwningService', ''),
                'created_date': response.get('CreatedDate').isoformat() if response.get('CreatedDate') else None,
                'primary_region': response.get('PrimaryRegion', ''),
                'replica_regions': response.get('ReplicaRegions', []),
                'deleted_date': response.get('DeletedDate').isoformat() if response.get('DeletedDate') else None
            }
            
            return {
                'success': True,
                'secret_info': secret_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_secret_usage_metrics(self, secret_name, start_time, end_time):
        """Obtener métricas de uso de secreto"""
        
        try:
            metrics = {
                'access_count': 0,
                'rotation_count': 0,
                'error_count': 0,
                'last_accessed': None
            }
            
            # Métricas de acceso
            try:
                response = self.cloudwatch.get_metric_statistics(
                    Namespace='AWS/SecretsManager',
                    MetricName='SecretAccessCount',
                    Dimensions=[
                        {'Name': 'SecretId', 'Value': secret_name}
                    ],
                    StartTime=start_time,
                    EndTime=end_time,
                    Period=300,
                    Statistics=['Sum']
                )
                
                if response['Datapoints']:
                    metrics['access_count'] = sum(dp['Sum'] for dp in response['Datapoints'])
                
            except Exception:
                pass
            
            # Métricas de rotación
            try:
                response = self.cloudwatch.get_metric_statistics(
                    Namespace='AWS/SecretsManager',
                    MetricName='SecretRotationCount',
                    Dimensions=[
                        {'Name': 'SecretId', 'Value': secret_name}
                    ],
                    StartTime=start_time,
                    EndTime=end_time,
                    Period=300,
                    Statistics=['Sum']
                )
                
                if response['Datapoints']:
                    metrics['rotation_count'] = sum(dp['Sum'] for dp in response['Datapoints'])
                
            except Exception:
                pass
            
            # Obtener último acceso
            try:
                secret_response = self.secretsmanager.describe_secret(SecretId=secret_name)
                if secret_response.get('LastAccessedDate'):
                    metrics['last_accessed'] = secret_response['LastAccessedDate'].isoformat()
            except Exception:
                pass
            
            return {
                'success': True,
                'secret_name': secret_name,
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
    
    def audit_secret_access(self, secret_name, start_time, end_time):
        """Auditar acceso a secreto"""
        
        try:
            # Buscar eventos en CloudTrail
            cloudtrail = boto3.client('cloudtrail', region_name=self.region)
            
            events = []
            try:
                response = cloudtrail.lookup_events(
                    LookupAttributes=[
                        {'AttributeKey': 'ResourceName', 'Value': secret_name}
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
                'secret_name': secret_name,
                'audit_summary': audit_summary,
                'events': events
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_secret_bundle(self, project_name, secrets_config):
        """Crear bundle de secretos para proyecto"""
        
        try:
            bundle_setup = {
                'secrets': [],
                'rotation_functions': [],
                'total_secrets': 0
            }
            
            for secret_config in secrets_config:
                secret_type = secret_config['type']
                secret_name = f'{project_name}-{secret_config["name"]}'
                
                if secret_type == 'database':
                    # Crear secreto de base de datos
                    db_result = self.create_database_secret(
                        secret_name=secret_name,
                        database_type=secret_config['database_type'],
                        username=secret_config['username'],
                        password=secret_config['password'],
                        host=secret_config['host'],
                        port=secret_config['port'],
                        database_name=secret_config['database_name'],
                        engine=secret_config['engine'],
                        tags=secret_config.get('tags', [])
                    )
                    
                    if db_result['success']:
                        bundle_setup['secrets'].append(db_result)
                        
                        # Configurar rotación automática
                        rotation_result = self.setup_automatic_rotation(
                            secret_name=secret_name,
                            rotation_interval_days=secret_config.get('rotation_days', 30)
                        )
                        
                        if rotation_result['success']:
                            bundle_setup['secrets'][-1]['rotation'] = rotation_result
                
                elif secret_type == 'api_key':
                    # Crear secreto de API key
                    api_result = self.create_api_key_secret(
                        secret_name=secret_name,
                        api_key=secret_config['api_key'],
                        api_secret=secret_config['api_secret'],
                        service_name=secret_config['service_name'],
                        additional_data=secret_config.get('additional_data', {}),
                        tags=secret_config.get('tags', [])
                    )
                    
                    if api_result['success']:
                        bundle_setup['secrets'].append(api_result)
                
                elif secret_type == 'custom':
                    # Crear secreto personalizado
                    custom_result = self.create_custom_secret(
                        secret_name=secret_name,
                        secret_data=secret_config['secret_data'],
                        secret_type=secret_config.get('data_type', 'string'),
                        description=secret_config.get('description'),
                        tags=secret_config.get('tags', [])
                    )
                    
                    if custom_result['success']:
                        bundle_setup['secrets'].append(custom_result)
            
            bundle_setup['total_secrets'] = len(bundle_setup['secrets'])
            
            return {
                'success': True,
                'bundle_setup': bundle_setup,
                'project_name': project_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_secret_report(self, project_name=None):
        """Generar reporte de secretos"""
        
        try:
            # Listar todos los secretos
            secrets_response = self.list_secrets()
            
            if not secrets_response['success']:
                return secrets_response
            
            secrets = secrets_response['secrets']
            
            # Filtrar por proyecto si se especifica
            if project_name:
                secrets = [s for s in secrets if project_name in s['name']]
            
            # Generar reporte
            report = {
                'report_metadata': {
                    'project_name': project_name or 'All Secrets',
                    'report_date': datetime.utcnow().isoformat(),
                    'total_secrets': len(secrets)
                },
                'secret_summary': {
                    'total': len(secrets),
                    'with_rotation': len([s for s in secrets if s['rotation_enabled']]),
                    'without_rotation': len([s for s in secrets if not s['rotation_enabled']]),
                    'recently_accessed': len([s for s in secrets if s['last_accessed_date']]),
                    'replicated': len([s for s in secrets if s['replica_regions']])
                },
                'secret_details': [],
                'rotation_status': {
                    'daily': 0,
                    'weekly': 0,
                    'monthly': 0,
                    'quarterly': 0,
                    'custom': 0
                },
                'recommendations': []
            }
            
            # Analizar cada secreto
            current_date = datetime.utcnow()
            
            for secret in secrets:
                secret_detail = {
                    'arn': secret['arn'],
                    'name': secret['name'],
                    'description': secret['description'],
                    'rotation_enabled': secret['rotation_enabled'],
                    'last_changed_date': secret['last_changed_date'],
                    'last_accessed_date': secret['last_accessed_date'],
                    'next_rotation_date': secret['next_rotation_date'],
                    'replica_regions': secret['replica_regions']
                }
                
                # Analizar rotación
                if secret['rotation_enabled'] and secret['rotation_rules']:
                    rotation_rules = secret['rotation_rules']
                    if 'AutomaticallyAfterDays' in rotation_rules:
                        days = rotation_rules['AutomaticallyAfterDays']
                        if days <= 7:
                            report['rotation_status']['daily'] += 1
                        elif days <= 30:
                            report['rotation_status']['monthly'] += 1
                        elif days <= 90:
                            report['rotation_status']['quarterly'] += 1
                        else:
                            report['rotation_status']['custom'] += 1
                
                report['secret_details'].append(secret_detail)
            
            # Generar recomendaciones
            if report['secret_summary']['without_rotation'] > 0:
                report['recommendations'].append({
                    'priority': 'high',
                    'recommendation': 'Enable rotation for secrets without rotation',
                    'details': f'{report["secret_summary"]["without_rotation"]} secrets without rotation'
                })
            
            if report['secret_summary']['recently_accessed'] < report['secret_summary']['total'] * 0.5:
                report['recommendations'].append({
                    'priority': 'medium',
                    'recommendation': 'Review unused secrets',
                    'details': 'Many secrets have not been accessed recently'
                })
            
            return {
                'success': True,
                'secret_report': report
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Crear Secreto de Base de Datos**
```python
# Ejemplo: Crear secreto para base de datos MySQL
manager = SecretsManager('us-east-1')

db_result = manager.create_database_secret(
    secret_name='myapp-prod-db',
    database_type='mysql',
    username='admin',
    password='SecurePassword123!',
    host='myapp-prod-db.c1234567890.us-east-1.rds.amazonaws.com',
    port=3306,
    database_name='myapp_production',
    engine='mysql',
    tags=[
        {'Key': 'Project', 'Value': 'myapp'},
        {'Key': 'Environment', 'Value': 'production'}
    ]
)

if db_result['success']:
    # Configurar rotación automática
    rotation_result = manager.setup_automatic_rotation(
        secret_name=db_result['secret_name'],
        rotation_interval_days=30
    )
    
    print(f"Database secret created: {db_result['secret_name']}")
    print(f"Rotation configured: {rotation_result['rotation_configured']}")
```

### **2. Crear Secreto de API Key**
```python
# Ejemplo: Crear secreto para API key
api_result = manager.create_api_key_secret(
    secret_name='myapp-stripe-api',
    api_key='sk_test_1234567890abcdef',
    api_secret='sk_live_1234567890abcdef',
    service_name='Stripe',
    additional_data={
        'environment': 'production',
        'permissions': ['read', 'write']
    },
    tags=[
        {'Key': 'Service', 'Value': 'Stripe'},
        {'Key': 'Environment', 'Value': 'production'}
    ]
)

if api_result['success']:
    print(f"API key secret created: {api_result['secret_name']}")
```

### **3. Crear Bundle de Secretos**
```python
# Ejemplo: Crear bundle de secretos para proyecto
secrets_config = [
    {
        'type': 'database',
        'name': 'mysql-db',
        'database_type': 'mysql',
        'username': 'app_user',
        'password': 'SecurePassword123!',
        'host': 'db.example.com',
        'port': 3306,
        'database_name': 'myapp',
        'engine': 'mysql',
        'rotation_days': 30,
        'tags': [{'Key': 'Type', 'Value': 'Database'}]
    },
    {
        'type': 'api_key',
        'name': 'payment-api',
        'api_key': 'pk_test_1234567890',
        'api_secret': 'sk_test_1234567890',
        'service_name': 'PaymentGateway',
        'tags': [{'Key': 'Type', 'Value': 'API'}]
    },
    {
        'type': 'custom',
        'name': 'jwt-secret',
        'secret_data': json.dumps({
            'jwt_secret': 'super-secret-jwt-key-12345',
            'algorithm': 'HS256',
            'expires_in': '1h'
        }),
        'data_type': 'string',
        'description': 'JWT signing secret',
        'tags': [{'Key': 'Type', 'Value': 'JWT'}]
    }
]

bundle_result = manager.create_secret_bundle(
    project_name='myapp',
    secrets_config=secrets_config
)

if bundle_result['success']:
    bundle = bundle_result['bundle_setup']
    print(f"Bundle created with {bundle['total_secrets']} secrets")
    for secret in bundle['secrets']:
        print(f"  - {secret['secret_name']}")
```

### **4. Generar Reporte de Secretos**
```python
# Ejemplo: Generar reporte completo
report_result = manager.generate_secret_report(project_name='myapp')

if report_result['success']:
    report = report_result['secret_report']
    print(f"Total secrets: {report['secret_summary']['total']}")
    print(f"With rotation: {report['secret_summary']['with_rotation']}")
    print(f"Recommendations: {len(report['recommendations'])}")
```

## Configuración con AWS CLI

### **Gestión de Secretos**
```bash
# Crear secreto de base de datos
aws secretsmanager create-secret \
  --name myapp-prod-db \
  --secret-string '{
    "username": "admin",
    "password": "SecurePassword123!",
    "engine": "mysql",
    "host": "myapp-prod-db.c1234567890.us-east-1.rds.amazonaws.com",
    "port": 3306,
    "dbname": "myapp_production"
  }' \
  --description "Database credentials for myapp production"

# Obtener valor de secreto
aws secretsmanager get-secret-value --secret-id myapp-prod-db

# Actualizar valor de secreto
aws secretsmanager put-secret-value \
  --secret-id myapp-prod-db \
  --secret-string '{
    "username": "admin",
    "password": "NewSecurePassword456!",
    "engine": "mysql",
    "host": "myapp-prod-db.c1234567890.us-east-1.rds.amazonaws.com",
    "port": 3306,
    "dbname": "myapp_production"
  }'

# Listar secretos
aws secretsmanager list-secrets

# Eliminar secreto
aws secretsmanager delete-secret --secret-id myapp-prod-db --recovery-window-in-days 30
```

### **Configuración de Rotación**
```bash
# Configurar rotación automática
aws secretsmanager rotate-secret \
  --secret-id myapp-prod-db \
  --rotation-rules AutomaticallyAfterDays=30 \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:123456789012:function:SecretsManagerRotationTemplate-MySQLSingleUser

# Rotar secreto manualmente
aws secretsmanager rotate-secret --secret-id myapp-prod-db

# Describir secreto
aws secretsmanager describe-secret --secret-id myapp-prod-db
```

### **Replicación Multi-Región**
```bash
# Replicar secreto a otra región
aws secretsmanager replicate-secret-to-region \
  --secret-id myapp-prod-db \
  --replica-region us-west-2

# Eliminar réplica
aws secretsmanager remove-regions-from-replication \
  --secret-id myapp-prod-db \
  --remove-replica-regions us-west-2
```

## Best Practices

### **1. Gestión de Secretos**
- Usar nombres descriptivos y consistentes
- Implementar tags para organización
- Configurar rotación automática siempre que sea posible
- Usar diferentes secretos para diferentes entornos

### **2. Seguridad**
- Usar contraseñas fuertes y complejas
- Limitar acceso con políticas IAM granulares
- Monitorear acceso y uso de secretos
- Implementar VPC endpoints para acceso privado

### **3. Rotación**
- Configurar intervalos de rotación apropiados
- Validar secretos después de rotación
- Implementar notificaciones de rotación
- Documentar procedimientos de rotación

### **4. Operaciones**
- Automatizar creación y gestión de secretos
- Configurar monitoreo y alertas
- Implementar backup y recuperación
- Regularizar auditorías de acceso

## Costos

### **Precios de Secrets Manager**
- **Secretos**: $0.40 por mes por secreto
- **API Calls**: $0.05 por 10,000 llamadas
- **Rotación**: Sin costo adicional
- **Replicación**: Costos de transferencia de datos

### **Ejemplo de Costos Mensuales**
- **50 secretos**: 50 × $0.40 = $20.00
- **100,000 API calls**: 10 × $0.05 = $0.50
- **Replicación**: Variable
- **Total estimado**: ~$20.50 por mes

## Troubleshooting

### **Problemas Comunes**
1. **Acceso denegado**: Verificar políticas IAM
2. **Rotación fallida**: Revisar función Lambda
3. **Conexión fallida**: Validar credenciales de red
4. **Replicación fallida**: Verificar permisos de región

### **Comandos de Diagnóstico**
```bash
# Verificar estado de secreto
aws secretsmanager describe-secret --secret-id secret-name

# Verificar métricas de acceso
aws cloudwatch get-metric-statistics \
  --namespace AWS/SecretsManager \
  --metric-name SecretAccessCount \
  --dimensions Name=SecretId,Value=secret-name

# Verificar logs de CloudTrail
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,Value=secret-name

# Verificar configuración de rotación
aws secretsmanager describe-secret --secret-id secret-name --query 'RotationEnabled'
```

## Cumplimiento Normativo

### **PCI-DSS**
- **Requerimiento 3**: Protección de datos de titulares de tarjetas
- **Requerimiento 7**: Restricción de acceso a datos
- **Requerimiento 8**: Identificación y autenticación

### **HIPAA**
- **Security Rule**: Controles técnicos y administrativos
- **Access Control**: Controles de acceso a datos
- **Audit Controls**: Controles de auditoría

### **GDPR**
- **Artículo 32**: Seguridad del tratamiento
- **Artículo 25**: Protección de datos desde el diseño
- **Artículo 33**: Notificación de brechas

## Integración con Otros Servicios

### **AWS RDS Integration**
- **Auto-rotation**: Rotación automática de contraseñas
- **IAM authentication**: Autenticación IAM para RDS
- **Security groups**: Control de acceso de red
- **Encryption**: Cifrado de datos en reposo y tránsito

### **AWS Lambda Integration**
- **Custom rotation**: Funciones Lambda personalizadas
- **Event-driven**: Rotación basada en eventos
- **Monitoring**: Monitoreo de rotación
- **Error handling**: Manejo de errores de rotación

### **AWS CloudFormation Integration**
- **Infrastructure as Code**: Gestión con CloudFormation
- **Stack updates**: Actualización de secretos
- **Drift detection**: Detección de cambios
- **Rollback**: Reversión de cambios

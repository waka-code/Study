# AWS RAM (Resource Access Manager)

## Definición

AWS Resource Access Manager (RAM) es un servicio que permite compartir recursos de AWS específicos entre cuentas de AWS, organizaciones o unidades organizacionales (OUs). Facilita el uso compartido de recursos de manera segura y controlada sin necesidad de crear múltiples copias de los recursos, lo que reduce costos y simplifica la gestión.

## Características Principales

### **Compartimiento de Recursos**
- **Cross-account Sharing**: Compartir recursos entre diferentes cuentas AWS
- **Organization-wide Sharing**: Compartir recursos dentro de una organización
- **OU-level Sharing**: Compartir recursos a nivel de unidades organizacionales
- **Principal-based Sharing**: Compartir con cuentas, usuarios o roles específicos
- **Resource Types**: Soporte para múltiples tipos de recursos AWS

### **Gestión de Permisos**
- **Permission Sets**: Conjuntos de permisos predefinidos
- **Fine-grained Control**: Control granular sobre permisos de acceso
- **Managed Permissions**: Permisos gestionados por AWS
- **Customer-managed Permissions**: Permisos personalizados
- **Resource Policies**: Políticas de recursos para acceso

### **Automatización y Monitoreo**
- **Auto-acceptance**: Aceptación automática de recursos compartidos
- **Resource Discovery**: Descubrimiento automático de recursos compartidos
- **Change Monitoring**: Monitoreo de cambios en recursos compartidos
- **Audit Logging**: Registro de auditoría completo
- **Compliance Tracking**: Seguimiento de cumplimiento

### **Seguridad y Cumplimiento**
- **Secure Sharing**: Compartimiento seguro con cifrado y autenticación
- **Access Control**: Control de acceso basado en IAM
- **Encryption**: Cifrado de datos en tránsito y en reposo
- **Compliance**: Cumplimiento con estándares de seguridad
- **Audit Trail**: Registro completo de actividades

## Tipos de Recursos Compartibles

### **Recursos de Red**
- **VPC Subnets**: Subredes de VPC
- **Transit Gateways**: Gateways de tránsito
- **Route 53 Resolver Rules**: Reglas de resolver Route 53
- **Network Interfaces**: Interfaces de red
- **Customer Gateways**: Gateways de clientes

### **Recursos de Almacenamiento**
- **EFS File Systems**: Sistemas de archivos EFS
- **FSx File Systems**: Sistemas de archivos FSx
- **S3 Multi-Region Access Points**: Puntos de acceso multi-región S3
- **Glacier Vaults**: Bóvedas Glacier

### **Recursos de Base de Datos**
- **RDS Aurora Clusters**: Clústeres Aurora
- **RDS Snapshots**: Snapshots de RDS
- **DynamoDB Tables**: Tablas DynamoDB
- **DocumentDB Clusters**: Clústeres DocumentDB

### **Recursos de Otros Servicios**
- **License Manager Configurations**: Configuraciones de License Manager
- **AWS Resource Explorer**: Explorador de recursos
- **AWS App Mesh**: Malla de aplicaciones
- **AWS Global Accelerator**: Acelerador global

## Conceptos Clave

### **Resource Share**
- Entidad que contiene los recursos a compartir
- Define los permisos y los participantes
- Puede ser compartido con múltiples participantes
- Soporta diferentes tipos de participantes

### **Resource Owner**
- Cuenta que posee el recurso original
- Define qué recursos compartir
- Controla los permisos de acceso
- Puede modificar o revocar el compartimiento

### **Resource Consumer**
- Cuenta que recibe acceso a recursos compartidos
- Puede usar los recursos según los permisos definidos
- No puede modificar el recurso original
- Puede tener múltiples consumidores

### **Permission Set**
- Conjunto de permisos predefinidos
- Define qué acciones puede realizar el consumidor
- Puede ser gestionado por AWS o por el cliente
- Se aplica a tipos de recursos específicos

## Arquitectura de AWS RAM

### **Flujo de Compartimiento**
```
Resource Owner Account
├── Create Resource Share
│   ├── Select Resources to Share
│   ├── Define Permission Set
│   └── Specify Participants
├── Share Resource
│   ├── Send Invitation
│   ├── Apply Permissions
│   └── Enable Access
└── Monitor Sharing
    ├── Track Usage
    ├── Monitor Compliance
    └── Audit Access

Resource Consumer Account
├── Receive Invitation
│   ├── Accept Share
│   ├── Apply Permissions
│   └── Access Resource
└── Use Resource
    ├── Read/Write Access
    ├── Monitor Usage
    └── Report Issues
```

### **Modelo de Permisos**
```
Resource Share
├── Resources
│   ├── Resource Type
│   ├── Resource ARN
│   └── Resource Properties
├── Permissions
│   ├── Permission Set
│   ├── Allowed Actions
│   └── Resource Conditions
└── Participants
    ├── AWS Accounts
    ├── Organizations
    ├── Organizational Units
    └── IAM Principals
```

## Configuración de AWS RAM

### **Gestión Completa de AWS RAM**
```python
import boto3
import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class RAMManager:
    def __init__(self, region='us-east-1'):
        self.ram = boto3.client('ram', region_name=region)
        self.organizations = boto3.client('organizations', region_name=region)
        self.ec2 = boto3.client('ec2', region_name=region)
        self.rds = boto3.client('rds', region_name=region)
        self.efs = boto3.client('efs', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.region = region
    
    def create_resource_share(self, name, resource_arns, principals=None,
                             allow_external_principals=False, tags=None):
        """Crear resource share"""
        
        try:
            params = {
                'name': name,
                'resourceArns': resource_arns
            }
            
            if principals:
                params['principals'] = principals
            
            if allow_external_principals:
                params['allowExternalPrincipals'] = allow_external_principals
            
            if tags:
                params['tags'] = tags
            
            response = self.ram.create_resource_share(**params)
            
            return {
                'success': True,
                'resource_share_arn': response['resourceShareArn'],
                'resource_share_name': name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_resource_share(self, resource_share_arn):
        """Obtener detalles de resource share"""
        
        try:
            response = self.ram.get_resource_shares(
                resourceShareArns=[resource_share_arn]
            )
            
            if response['resourceShares']:
                share = response['resourceShares'][0]
                share_info = {
                    'resource_share_arn': share['resourceShareArn'],
                    'resource_share_name': share['name'],
                    'resource_group_arn': share.get('resourceGroupArn', ''),
                    'owner_aws_account_id': share['owningAccountId'],
                    'allow_external_principals': share['allowExternalPrincipals'],
                    'status': share['status'],
                    'creation_time': share['creationDateTime'].isoformat(),
                    'last_updated_time': share.get('lastUpdatedDateTime', '').isoformat() if share.get('lastUpdatedDateTime') else '',
                    'associated_permissions': share.get('associatedPermissions', []),
                    'tags': share.get('tags', [])
                }
                
                return {
                    'success': True,
                    'resource_share': share_info
                }
            
            return {
                'success': False,
                'error': 'Resource share not found'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_resource_shares(self, resource_owner='SELF', resource_share_status=None,
                            resource_share_type='ALL', max_results=100, next_token=None):
        """Listar resource shares"""
        
        try:
            params = {
                'resourceOwner': resource_owner,
                'maxResults': max_results
            }
            
            if resource_share_status:
                params['resourceShareStatus'] = resource_share_status
            
            if resource_share_type:
                params['resourceShareType'] = resource_share_type
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.ram.list_resource_shares(**params)
            
            shares = []
            for share in response['resourceShares']:
                share_info = {
                    'resource_share_arn': share['resourceShareArn'],
                    'resource_share_name': share['name'],
                    'resource_group_arn': share.get('resourceGroupArn', ''),
                    'owner_aws_account_id': share['owningAccountId'],
                    'allow_external_principals': share['allowExternalPrincipals'],
                    'status': share['status'],
                    'creation_time': share['creationDateTime'].isoformat(),
                    'last_updated_time': share.get('lastUpdatedDateTime', '').isoformat() if share.get('LastUpdatedDateTime') else ''
                }
                shares.append(share_info)
            
            return {
                'success': True,
                'resource_shares': shares,
                'count': len(shares),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_resource_share(self, resource_share_arn, name=None, allow_external_principals=None):
        """Actualizar resource share"""
        
        try:
            params = {
                'resourceShareArn': resource_share_arn
            }
            
            if name:
                params['name'] = name
            
            if allow_external_principals is not None:
                params['allowExternalPrincipals'] = allow_external_principals
            
            response = self.ram.update_resource_share(**params)
            
            return {
                'success': True,
                'resource_share_arn': response['resourceShareArn'],
                'updated': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_resource_share(self, resource_share_arn):
        """Eliminar resource share"""
        
        try:
            response = self.ram.delete_resource_share(
                resourceShareArn=resource_share_arn
            )
            
            return {
                'success': True,
                'resource_share_arn': resource_share_arn,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def associate_resource_share_permission(self, resource_share_arn, permission_arn,
                                         replace=False):
        """Asociar permiso a resource share"""
        
        try:
            response = self.ram.associate_resource_share_permission(
                resourceShareArn=resource_share_arn,
                permissionArn=permission_arn,
                replace=replace
            )
            
            return {
                'success': True,
                'resource_share_arn': resource_share_arn,
                'permission_arn': permission_arn,
                'associated': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def disassociate_resource_share_permission(self, resource_share_arn, permission_arn):
        """Desasociar permiso de resource share"""
        
        try:
            response = self.ram.disassociate_resource_share_permission(
                resourceShareArn=resource_share_arn,
                permissionArn=permission_arn
            )
            
            return {
                'success': True,
                'resource_share_arn': resource_share_arn,
                'permission_arn': permission_arn,
                'disassociated': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_resource_share_permissions(self, resource_share_arn, max_results=100, next_token=None):
        """Listar permisos de resource share"""
        
        try:
            params = {
                'resourceShareArn': resource_share_arn,
                'maxResults': max_results
            }
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.ram.list_resource_share_permissions(**params)
            
            permissions = []
            for permission in response['permissions']:
                permission_info = {
                    'arn': permission['arn'],
                    'version': permission['version'],
                    'default_version': permission['defaultVersion'],
                    'name': permission['name'],
                    'resource_type': permission['resourceType'],
                    'status': permission['status'],
                    'creation_time': permission['creationDateTime'].isoformat(),
                    'last_updated_time': permission.get('lastUpdatedDateTime', '').isoformat() if permission.get('lastUpdatedDateTime') else ''
                }
                permissions.append(permission_info)
            
            return {
                'success': True,
                'permissions': permissions,
                'count': len(permissions),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_permission(self, permission_arn, permission_version=None):
        """Obtener detalles de permiso"""
        
        try:
            params = {
                'permissionArn': permission_arn
            }
            
            if permission_version:
                params['permissionVersion'] = permission_version
            
            response = self.ram.get_permission(**params)
            
            permission_info = {
                'arn': response['permission']['arn'],
                'version': response['permission']['version'],
                'default_version': response['permission']['defaultVersion'],
                'name': response['permission']['name'],
                'resource_type': response['permission']['resourceType'],
                'status': response['permission']['status'],
                'creation_time': response['permission']['creationDateTime'].isoformat(),
                'last_updated_time': response['permission'].get('lastUpdatedDateTime', '').isoformat() if response['permission'].get('lastUpdatedDateTime') else '',
                'policy_template': response['permission'].get('policyTemplate', {})
            }
            
            return {
                'success': True,
                'permission': permission_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_permissions(self, resource_type=None, max_results=100, next_token=None):
        """Listar permisos disponibles"""
        
        try:
            params = {'maxResults': max_results}
            
            if resource_type:
                params['resourceType'] = resource_type
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.ram.list_permissions(**params)
            
            permissions = []
            for permission in response['permissions']:
                permission_info = {
                    'arn': permission['arn'],
                    'version': permission['version'],
                    'default_version': permission['defaultVersion'],
                    'name': permission['name'],
                    'resource_type': permission['resourceType'],
                    'status': permission['status'],
                    'feature_set': permission.get('featureSet', ''),
                    'creation_time': permission['creationDateTime'].isoformat(),
                    'last_updated_time': permission.get('lastUpdatedDateTime', '').isoformat() if permission.get('lastUpdatedDateTime') else ''
                }
                permissions.append(permission_info)
            
            return {
                'success': True,
                'permissions': permissions,
                'count': len(permissions),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def associate_resource_share(self, resource_share_arn, resource_arns, principals=None):
        """Asociar recursos y participantes a resource share"""
        
        try:
            params = {
                'resourceShareArn': resource_share_arn,
                'resourceArns': resource_arns
            }
            
            if principals:
                params['principals'] = principals
            
            response = self.ram.associate_resource_share(**params)
            
            return {
                'success': True,
                'resource_share_arn': resource_share_arn,
                'associated_resources': len(resource_arns),
                'associated_principals': len(principals) if principals else 0
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def disassociate_resource_share(self, resource_share_arn, resource_arns=None, principals=None):
        """Desasociar recursos y participantes de resource share"""
        
        try:
            params = {
                'resourceShareArn': resource_share_arn
            }
            
            if resource_arns:
                params['resourceArns'] = resource_arns
            
            if principals:
                params['principals'] = principals
            
            response = self.ram.disassociate_resource_share(**params)
            
            return {
                'success': True,
                'resource_share_arn': resource_share_arn,
                'disassociated_resources': len(resource_arns) if resource_arns else 0,
                'disassociated_principals': len(principals) if principals else 0
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_resource_share_associations(self, resource_owner='SELF', association_type='PRINCIPAL',
                                      resource_share_arn=None, resource_share_status=None,
                                      principal=None, resource_type=None, max_results=100, next_token=None):
        """Obtener asociaciones de resource share"""
        
        try:
            params = {
                'resourceOwner': resource_owner,
                'associationType': association_type,
                'maxResults': max_results
            }
            
            if resource_share_arn:
                params['resourceShareArn'] = resource_share_arn
            
            if resource_share_status:
                params['resourceShareStatus'] = resource_share_status
            
            if principal:
                params['principal'] = principal
            
            if resource_type:
                params['resourceType'] = resource_type
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.ram.get_resource_share_associations(**params)
            
            associations = []
            for association in response['resourceShareAssociations']:
                association_info = {
                    'resource_share_arn': association['resourceShareArn'],
                    'resource_share_name': association['resourceShareName'],
                    'association_type': association['associationType'],
                    'status': association['status'],
                    'creation_time': association['creationDateTime'].isoformat(),
                    'last_updated_time': association.get('lastUpdatedDateTime', '').isoformat() if association.get('lastUpdatedDateTime') else ''
                }
                
                if 'associatedEntity' in association:
                    association_info['associated_entity'] = association['associatedEntity']
                
                associations.append(association_info)
            
            return {
                'success': True,
                'associations': associations,
                'count': len(associations),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def accept_resource_share_invitation(self, resource_share_arn):
        """Aceptar invitación de resource share"""
        
        try:
            response = self.ram.accept_resource_share_invitation(
                resourceShareArn=resource_share_arn
            )
            
            return {
                'success': True,
                'resource_share_arn': resource_share_arn,
                'accepted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def reject_resource_share_invitation(self, resource_share_arn):
        """Rechazar invitación de resource share"""
        
        try:
            response = self.ram.reject_resource_share_invitation(
                resourceShareArn=resource_share_arn
            )
            
            return {
                'success': True,
                'resource_share_arn': resource_share_arn,
                'rejected': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_resource_share_invitations(self, max_results=100, next_token=None):
        """Listar invitaciones de resource share"""
        
        try:
            params = {'maxResults': max_results}
            
            if next_token:
                params['nextToken'] = next_token
            
            response = self.ram.list_resource_share_invitations(**params)
            
            invitations = []
            for invitation in response['resourceShareInvitations']:
                invitation_info = {
                    'resource_share_invitation_arn': invitation['resourceShareInvitationArn'],
                    'resource_share_name': invitation['resourceShareName'],
                    'resource_share_arn': invitation['resourceShareArn'],
                    'sender_account_id': invitation['senderAccountId'],
                    'receiver_account_id': invitation['receiverAccountId'],
                    'status': invitation['status'],
                    'invitation_timestamp': invitation['invitationTimestamp'].isoformat()
                }
                invitations.append(invitation_info)
            
            return {
                'success': True,
                'invitations': invitations,
                'count': len(invitations),
                'next_token': response.get('nextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_resource_share_invitation(self, resource_share_invitation_arn):
        """Obtener detalles de invitación"""
        
        try:
            response = self.ram.get_resource_share_invitation(
                resourceShareInvitationArn=resource_share_invitation_arn
            )
            
            invitation_info = {
                'resource_share_invitation_arn': response['resourceShareInvitation']['resourceShareInvitationArn'],
                'resource_share_name': response['resourceShareInvitation']['resourceShareName'],
                'resource_share_arn': response['resourceShareInvitation']['resourceShareArn'],
                'sender_account_id': response['resourceShareInvitation']['senderAccountId'],
                'receiver_account_id': response['resourceShareInvitation']['receiverAccountId'],
                'status': response['resourceShareInvitation']['status'],
                'invitation_timestamp': response['resourceShareInvitation']['invitationTimestamp'].isoformat()
            }
            
            return {
                'success': True,
                'invitation': invitation_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_vpc_share(self, share_name, vpc_id, subnet_ids, principals=None, tags=None):
        """Crear compartimiento de VPC"""
        
        try:
            # Construir ARNs de recursos
            vpc_arn = f'arn:aws:ec2:{self.region}:{self.sts.get_caller_identity()["Account"]}:vpc/{vpc_id}'
            subnet_arns = [
                f'arn:aws:ec2:{self.region}:{self.sts.get_caller_identity()["Account"]}:subnet/{subnet_id}'
                for subnet_id in subnet_ids
            ]
            
            resource_arns = [vpc_arn] + subnet_arns
            
            # Crear resource share
            share_result = self.create_resource_share(
                name=share_name,
                resource_arns=resource_arns,
                principals=principals,
                allow_external_principals=True,
                tags=tags
            )
            
            if share_result['success']:
                # Asociar permisos estándar para VPC
                permission_arn = 'arn:aws:ram::aws:permission/AWSRAMDefaultPermissions'
                
                associate_result = self.associate_resource_share_permission(
                    resource_share_arn=share_result['resource_share_arn'],
                    permission_arn=permission_arn
                )
                
                return {
                    'success': True,
                    'resource_share_arn': share_result['resource_share_arn'],
                    'share_name': share_name,
                    'vpc_id': vpc_id,
                    'subnet_count': len(subnet_ids),
                    'principals': principals or []
                }
            
            return share_result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_rds_snapshot_share(self, share_name, snapshot_arn, principals=None, tags=None):
        """Crear compartimiento de snapshot RDS"""
        
        try:
            # Crear resource share
            share_result = self.create_resource_share(
                name=share_name,
                resource_arns=[snapshot_arn],
                principals=principals,
                allow_external_principals=True,
                tags=tags
            )
            
            if share_result['success']:
                # Asociar permisos para RDS snapshot
                permission_arn = 'arn:aws:ram::aws:permission/AWSRAMDefaultPermissions'
                
                associate_result = self.associate_resource_share_permission(
                    resource_share_arn=share_result['resource_share_arn'],
                    permission_arn=permission_arn
                )
                
                return {
                    'success': True,
                    'resource_share_arn': share_result['resource_share_arn'],
                    'share_name': share_name,
                    'snapshot_arn': snapshot_arn,
                    'principals': principals or []
                }
            
            return share_result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_efs_share(self, share_name, file_system_id, principals=None, tags=None):
        """Crear compartimiento de sistema de archivos EFS"""
        
        try:
            # Construir ARN del sistema de archivos
            file_system_arn = f'arn:aws:elasticfilesystem:{self.region}:{self.sts.get_caller_identity()["Account"]}:file-system/{file_system_id}'
            
            # Crear resource share
            share_result = self.create_resource_share(
                name=share_name,
                resource_arns=[file_system_arn],
                principals=principals,
                allow_external_principals=True,
                tags=tags
            )
            
            if share_result['success']:
                # Asociar permisos para EFS
                permission_arn = 'arn:aws:ram::aws:permission/AWSRAMDefaultPermissions'
                
                associate_result = self.associate_resource_share_permission(
                    resource_share_arn=share_result['resource_share_arn'],
                    permission_arn=permission_arn
                )
                
                return {
                    'success': True,
                    'resource_share_arn': share_result['resource_share_arn'],
                    'share_name': share_name,
                    'file_system_id': file_system_id,
                    'principals': principals or []
                }
            
            return share_result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_ram_usage(self, time_range_days=30):
        """Analizar uso de RAM"""
        
        try:
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(days=time_range_days)
            
            # Simulación de análisis de uso
            usage_analysis = {
                'time_range': {
                    'start_time': start_time.isoformat(),
                    'end_time': end_time.isoformat()
                },
                'resource_shares': {
                    'total_shares': 25,
                    'active_shares': 23,
                    'pending_shares': 2,
                    'failed_shares': 0
                },
                'shared_resources': {
                    'vpc_subnets': 15,
                    'rds_snapshots': 8,
                    'efs_file_systems': 5,
                    'transit_gateways': 3,
                    'other_resources': 4
                },
                'participants': {
                    'total_principals': 18,
                    'aws_accounts': 12,
                    'organizations': 2,
                    'organizational_units': 4
                },
                'permissions': {
                    'managed_permissions': 45,
                    'customer_permissions': 8,
                    'associated_permissions': 53
                },
                'cost_savings': {
                    'estimated_monthly_savings': 2500.00,
                    'resources_avoided': 35,
                    'storage_savings': 800.00,
                    'compute_savings': 1200.00,
                    'network_savings': 500.00
                },
                'compliance': {
                    'compliant_shares': 23,
                    'non_compliant_shares': 0,
                    'compliance_score': 100.0,
                    'last_audit_date': end_time.isoformat()
                }
            }
            
            # Generar recomendaciones
            recommendations = []
            
            if usage_analysis['resource_shares']['pending_shares'] > 0:
                recommendations.append({
                    'priority': 'MEDIUM',
                    'category': 'SHARING',
                    'title': 'Pending resource shares',
                    'description': f'{usage_analysis["resource_shares"]["pending_shares"]} shares pending approval',
                    'action': 'Review and approve pending resource shares'
                })
            
            if usage_analysis['shared_resources']['vpc_subnets'] > 10:
                recommendations.append({
                    'priority': 'LOW',
                    'category': 'OPTIMIZATION',
                    'title': 'Consider VPC consolidation',
                    'description': f'{usage_analysis["shared_resources"]["vpc_subnets"]} VPC subnets being shared',
                    'action': 'Evaluate VPC architecture for optimization opportunities'
                })
            
            if usage_analysis['participants']['total_principals'] > 15:
                recommendations.append({
                    'priority': 'LOW',
                    'category': 'GOVERNANCE',
                    'title': 'Review participant access',
                    'description': f'{usage_analysis["participants"]["total_principals"]} participants have access',
                    'action': 'Regularly review and clean up participant access'
                })
            
            usage_analysis['recommendations'] = recommendations
            
            return {
                'success': True,
                'usage_analysis': usage_analysis
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_ram_report(self, report_type='comprehensive', time_range_days=30):
        """Generar reporte de RAM"""
        
        try:
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(days=time_range_days)
            
            report = {
                'report_metadata': {
                    'report_type': report_type,
                    'generated_at': end_time.isoformat(),
                    'time_range': {
                        'start_time': start_time.isoformat(),
                        'end_time': end_time.isoformat()
                    }
                }
            }
            
            if report_type == 'comprehensive':
                # Reporte completo
                shares_result = self.list_resource_shares()
                if shares_result['success']:
                    report['resource_shares'] = shares_result['resource_shares']
                    report['share_count'] = shares_result['count']
                
                permissions_result = self.list_permissions()
                if permissions_result['success']:
                    report['permissions'] = permissions_result['permissions']
                    report['permission_count'] = permissions_result['count']
                
                usage_result = self.analyze_ram_usage(time_range_days)
                if usage_result['success']:
                    report['usage_analysis'] = usage_result['usage_analysis']
            
            elif report_type == 'shares':
                # Reporte de resource shares
                shares_result = self.list_resource_shares()
                if shares_result['success']:
                    report['resource_shares'] = shares_result['resource_shares']
                    
                    # Agrupar por estado
                    report['shares_by_status'] = {}
                    for share in shares_result['resource_shares']:
                        status = share['status']
                        if status not in report['shares_by_status']:
                            report['shares_by_status'][status] = []
                        report['shares_by_status'][status].append(share)
            
            elif report_type == 'permissions':
                # Reporte de permisos
                permissions_result = self.list_permissions()
                if permissions_result['success']:
                    report['permissions'] = permissions_result['permissions']
                    
                    # Agrupar por tipo de recurso
                    report['permissions_by_resource_type'] = {}
                    for permission in permissions_result['permissions']:
                        resource_type = permission['resource_type']
                        if resource_type not in report['permissions_by_resource_type']:
                            report['permissions_by_resource_type'][resource_type] = []
                        report['permissions_by_resource_type'][resource_type].append(permission)
            
            elif report_type == 'usage':
                # Reporte de uso
                usage_result = self.analyze_ram_usage(time_range_days)
                if usage_result['success']:
                    report['usage_analysis'] = usage_result['usage_analysis']
            
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

### **1. Crear Resource Share de VPC**
```python
# Ejemplo: Compartir VPC y subredes
manager = RAMManager('us-east-1')

# Compartir VPC con subredes
vpc_share_result = manager.create_vpc_share(
    share_name='shared-vpc-production',
    vpc_id='vpc-12345678',
    subnet_ids=['subnet-11111111', 'subnet-22222222', 'subnet-33333333'],
    principals=['123456789012', '987654321098'],  # Account IDs
    tags=[
        {'Key': 'Environment', 'Value': 'Production'},
        {'Key': 'Purpose', 'Value': 'VPCSharing'}
    ]
)

if vpc_share_result['success']:
    print(f"VPC Share created:")
    print(f"  Share Name: {vpc_share_result['share_name']}")
    print(f"  VPC ID: {vpc_share_result['vpc_id']}")
    print(f"  Subnets: {vpc_share_result['subnet_count']}")
    print(f"  Principals: {vpc_share_result['principals']}")
    print(f"  ARN: {vpc_share_result['resource_share_arn']}")
```

### **2. Compartir Snapshot de RDS**
```python
# Ejemplo: Compartir snapshot de RDS
manager = RAMManager('us-east-1')

# Compartir snapshot
snapshot_share_result = manager.create_rds_snapshot_share(
    share_name='db-snapshot-share',
    snapshot_arn='arn:aws:rds:us-east-1:123456789012:snapshot:my-db-snapshot',
    principals=['987654321098'],
    tags=[
        {'Key': 'Database', 'Value': 'Production'},
        {'Key': 'Backup', 'Value': 'Shared'}
    ]
)

if snapshot_share_result['success']:
    print(f"RDS Snapshot Share created:")
    print(f"  Share Name: {snapshot_share_result['share_name']}")
    print(f"  Snapshot ARN: {snapshot_share_result['snapshot_arn']}")
    print(f"  Principals: {snapshot_share_result['principals']}")
    print(f"  ARN: {snapshot_share_result['resource_share_arn']}")
```

### **3. Compartir Sistema de Archivos EFS**
```python
# Ejemplo: Compartir sistema de archivos EFS
manager = RAMManager('us-east-1')

# Compartir EFS
efs_share_result = manager.create_efs_share(
    share_name='shared-efs-data',
    file_system_id='fs-12345678',
    principals=['123456789012', '987654321098'],
    tags=[
        {'Key': 'FileSystem', 'Value': 'SharedData'},
        {'Key': 'Access', 'Value': 'ReadWrite'}
    ]
)

if efs_share_result['success']:
    print(f"EFS Share created:")
    print(f"  Share Name: {efs_share_result['share_name']}")
    print(f"  File System ID: {efs_share_result['file_system_id']}")
    print(f"  Principals: {efs_share_result['principals']}")
    print(f"  ARN: {efs_share_result['resource_share_arn']}")
```

### **4. Listar y Analizar Resource Shares**
```python
# Ejemplo: Listar resource shares
manager = RAMManager('us-east-1')

# Listar todos los resource shares
shares_result = manager.list_resource_shares()

if shares_result['success']:
    shares = shares_result['resource_shares']
    print(f"Total Resource Shares: {shares_result['count']}")
    
    # Agrupar por estado
    status_groups = {}
    for share in shares:
        status = share['status']
        if status not in status_groups:
            status_groups[status] = []
        status_groups[status].append(share)
    
    print(f"\nShares by Status:")
    for status, group_shares in status_groups.items():
        print(f"  {status}: {len(group_shares)}")
    
    # Mostrar detalles de shares activos
    active_shares = status_groups.get('ACTIVE', [])
    print(f"\nActive Shares Details:")
    for share in active_shares[:3]:  # Mostrar primeros 3
        print(f"  - {share['resource_share_name']}")
        print(f"    ARN: {share['resource_share_arn']}")
        print(f"    Owner: {share['owner_aws_account_id']}")
        print(f"    External Principals: {share['allow_external_principals']}")
        print(f"    Created: {share['creation_time']}")
```

### **5. Gestionar Permisos de Resource Share**
```python
# Ejemplo: Gestionar permisos
manager = RAMManager('us-east-1')

# Listar permisos disponibles
permissions_result = manager.list_permissions()

if permissions_result['success']:
    permissions = permissions_result['permissions']
    print(f"Available Permissions: {permissions_result['count']}")
    
    # Agrupar por tipo de recurso
    resource_types = {}
    for permission in permissions:
        resource_type = permission['resource_type']
        if resource_type not in resource_types:
            resource_types[resource_type] = []
        resource_types[resource_type].append(permission)
    
    print(f"\nPermissions by Resource Type:")
    for resource_type, perms in resource_types.items():
        print(f"  {resource_type}: {len(perms)}")
    
    # Mostrar permisos para VPC
    vpc_permissions = resource_types.get('subnet', [])
    print(f"\nVPC/Subnet Permissions:")
    for perm in vpc_permissions[:3]:
        print(f"  - {perm['name']}")
        print(f"    ARN: {perm['arn']}")
        print(f"    Version: {perm['version']}")
        print(f"    Status: {perm['status']}")

# Asociar permiso a resource share existente
if shares_result['success'] and shares_result['resource_shares']:
    share_arn = shares_result['resource_shares'][0]['resource_share_arn']
    
    # Obtener permisos disponibles para VPC
    vpc_perms = [p for p in permissions if p['resource_type'] == 'subnet']
    if vpc_perms:
        permission_arn = vpc_perms[0]['arn']
        
        associate_result = manager.associate_resource_share_permission(
            resource_share_arn=share_arn,
            permission_arn=permission_arn
        )
        
        if associate_result['success']:
            print(f"\nPermission associated:")
            print(f"  Share ARN: {share_arn}")
            print(f"  Permission ARN: {permission_arn}")
```

### **6. Gestionar Invitaciones**
```python
# Ejemplo: Gestionar invitaciones
manager = RAMManager('us-east-1')

# Listar invitaciones
invitations_result = manager.list_resource_share_invitations()

if invitations_result['success']:
    invitations = invitations_result['invitations']
    print(f"Pending Invitations: {invitations_result['count']}")
    
    for invitation in invitations:
        print(f"\nInvitation:")
        print(f"  ARN: {invitation['resource_share_invitation_arn']}")
        print(f"  Share Name: {invitation['resource_share_name']})
        print(f"  Sender: {invitation['sender_account_id']}")
        print(f"  Receiver: {invitation['receiver_account_id']}")
        print(f"  Status: {invitation['status']}")
        print(f"  Sent: {invitation['invitation_timestamp']}")
        
        # Aceptar invitación si está pendiente
        if invitation['status'] == 'PENDING':
            accept_result = manager.accept_resource_share_invitation(
                resource_share_arn=invitation['resource_share_invitation_arn']
            )
            
            if accept_result['success']:
                print(f"  -> Invitation accepted!")
```

### **7. Análisis de Uso**
```python
# Ejemplo: Analizar uso de RAM
manager = RAMManager('us-east-1')

usage_result = manager.analyze_ram_usage(time_range_days=30)

if usage_result['success']:
    usage = usage_result['usage_analysis']
    
    print(f"RAM Usage Analysis (Last 30 Days)")
    print(f"  Time Range: {usage['time_range']['start_time']} to {usage['time_range']['end_time']}")
    
    print(f"\nResource Shares:")
    shares = usage['resource_shares']
    print(f"  Total: {shares['total_shares']}")
    print(f"  Active: {shares['active_shares']}")
    print(f"  Pending: {shares['pending_shares']}")
    print(f"  Failed: {shares['failed_shares']}")
    
    print(f"\nShared Resources:")
    resources = usage['shared_resources']
    print(f"  VPC Subnets: {resources['vpc_subnets']}")
    print(f"  RDS Snapshots: {resources['rds_snapshots']}")
    print(f"  EFS File Systems: {resources['efs_file_systems']}")
    print(f"  Transit Gateways: {resources['transit_gateways']}")
    print(f"  Other: {resources['other_resources']}")
    
    print(f"\nParticipants:")
    participants = usage['participants']
    print(f"  Total: {participants['total_principals']}")
    print(f"  AWS Accounts: {participants['aws_accounts']}")
    print(f"  Organizations: {participants['organizations']}")
    print(f"  OUs: {participants['organizational_units']}")
    
    print(f"\nCost Savings:")
    savings = usage['cost_savings']
    print(f"  Estimated Monthly Savings: ${savings['estimated_monthly_savings']:,.2f}")
    print(f"  Resources Avoided: {savings['resources_avoided']}")
    print(f"  Storage Savings: ${savings['storage_savings']:,.2f}")
    print(f"  Compute Savings: ${savings['compute_savings']:,.2f}")
    print(f"  Network Savings: ${savings['network_savings']:,.2f}")
    
    print(f"\nCompliance:")
    compliance = usage['compliance']
    print(f"  Compliant Shares: {compliance['compliant_shares']}")
    print(f"  Non-compliant Shares: {compliance['non_compliant_shares']}")
    print(f"  Compliance Score: {compliance['compliance_score']}%")
    
    # Recomendaciones
    recommendations = usage['recommendations']
    print(f"\nRecommendations: {len(recommendations)}")
    for rec in recommendations:
        print(f"  [{rec['priority']}] {rec['title']}")
        print(f"    {rec['description']}")
        print(f"    Action: {rec['action']}")
```

### **8. Generar Reporte Comprehensivo**
```python
# Ejemplo: Generar reporte completo
manager = RAMManager('us-east-1')

report_result = manager.generate_ram_report(report_type='comprehensive', time_range_days=30)

if report_result['success']:
    report = report_result['report']
    
    print(f"RAM Report")
    print(f"  Generated at: {report['report_metadata']['generated_at']}")
    print(f"  Time Range: {report['report_metadata']['time_range']['start_time']} to {report['report_metadata']['time_range']['end_time']}")
    
    if 'share_count' in report:
        print(f"\nResource Shares: {report['share_count']}")
    
    if 'permission_count' in report:
        print(f"Permissions: {report['permission_count']}")
    
    if 'usage_analysis' in report:
        usage = report['usage_analysis']
        print(f"\nUsage Summary:")
        print(f"  Total Shares: {usage['resource_shares']['total_shares']}")
        print(f"  Active Shares: {usage['resource_shares']['active_shares']}")
        print(f"  Cost Savings: ${usage['cost_savings']['estimated_monthly_savings']:,.2f}")
        print(f"  Compliance Score: {usage['compliance']['compliance_score']}%")
        
        # Mostrar recursos compartidos principales
        resources = usage['shared_resources']
        print(f"\nTop Shared Resources:")
        for resource_type, count in resources.items():
            if count > 0:
                print(f"  {resource_type}: {count}")
```

## Configuración con AWS CLI

### **Resource Shares**
```bash
# Crear resource share
aws ram create-resource-share \
  --name "shared-vpc" \
  --resource-arns "arn:aws:ec2:us-east-1:123456789012:vpc/vpc-12345678" \
  --principals "123456789012" \
  --allow-external-principals

# Listar resource shares
aws ram list-resource-shares --resource-owner SELF

# Obtener detalles de resource share
aws ram get-resource-shares --resource-share-arns "arn:aws:ram:us-east-1:123456789012:resource-share/abc123"

# Actualizar resource share
aws ram update-resource-share \
  --resource-share-arn "arn:aws:ram:us-east-1:123456789012:resource-share/abc123" \
  --name "updated-share-name"

# Eliminar resource share
aws ram delete-resource-share --resource-share-arn "arn:aws:ram:us-east-1:123456789012:resource-share/abc123"
```

### **Permisos**
```bash
# Listar permisos disponibles
aws ram list-permissions

# Obtener detalles de permiso
aws ram get-permission --permission-arn "arn:aws:ram::aws:permission/AWSRAMDefaultPermissions"

# Asociar permiso a resource share
aws ram associate-resource-share-permission \
  --resource-share-arn "arn:aws:ram:us-east-1:123456789012:resource-share/abc123" \
  --permission-arn "arn:aws:ram::aws:permission/AWSRAMDefaultPermissions"

# Desasociar permiso
aws ram disassociate-resource-share-permission \
  --resource-share-arn "arn:aws:ram:us-east-1:123456789012:resource-share/abc123" \
  --permission-arn "arn:aws:ram::aws:permission/AWSRAMDefaultPermissions"
```

### **Invitaciones**
```bash
# Listar invitaciones
aws ram list-resource-share-invitations

# Aceptar invitación
aws ram accept-resource-share-invitation --resource-share-invitation-arn "arn:aws:ram:us-east-1:123456789012:resource-share-invitation/abc123"

# Rechazar invitación
aws ram reject-resource-share-invitation --resource-share-invitation-arn "arn:aws:ram:us-east-1:123456789012:resource-share-invitation/abc123"
```

### **Asociaciones**
```bash
# Asociar recursos
aws ram associate-resource-share \
  --resource-share-arn "arn:aws:ram:us-east-1:123456789012:resource-share/abc123" \
  --resource-arns "arn:aws:ec2:us-east-1:123456789012:subnet/subnet-12345678"

# Desasociar recursos
aws ram disassociate-resource-share \
  --resource-share-arn "arn:aws:ram:us-east-1:123456789012:resource-share/abc123" \
  --resource-arns "arn:aws:ec2:us-east-1:123456789012:subnet/subnet-12345678"

# Obtener asociaciones
aws ram get-resource-share-associations --association-type PRINCIPAL
```

## Mejores Prácticas

### **1. Diseño de Compartimiento**
- **Least Privilege**: Aplicar principio de mínimo privilegio
- **Resource Grouping**: Agrupar recursos lógicamente
- **Naming Convention**: Usar convenciones de nomenclatura consistentes
- **Tag Strategy**: Implementar estrategia de etiquetado
- **Regular Review**: Revisar compartimientos regularmente

### **2. Gestión de Permisos**
- **Standard Permissions**: Usar permisos estándar cuando sea posible
- **Custom Permissions**: Crear permisos personalizados para casos específicos
- **Permission Testing**: Probar permisos antes de aplicarlos
- **Documentation**: Documentar permisos y su propósito
- **Version Control**: Controlar versiones de permisos personalizados

### **3. Seguridad**
- **Principal Validation**: Validar participantes antes de compartir
- **Access Monitoring**: Monitorear acceso a recursos compartidos
- **Encryption**: Asegurar cifrado de datos compartidos
- **Audit Logging**: Habilitar logging completo
- **Compliance**: Asegurar cumplimiento normativo

### **4. Optimización**
- **Resource Consolidation**: Consolidar recursos cuando sea posible
- **Cost Analysis**: Analizar costos de compartimiento
- **Performance Impact**: Considerar impacto en rendimiento
- **Automation**: Automatizar procesos de compartimiento
- **Lifecycle Management**: Gestionar ciclo de vida de compartimientos

## Costos

### **Precios de AWS RAM**
- **Service**: GRATIS
- **No hay cargos**: Por usar AWS RAM
- **Resource Costs**: Los costos provienen de los recursos compartidos
- **Data Transfer**: Costos de transferencia de datos estándar
- **API Calls**: Sin costo por llamadas a API

### **Costos Asociados**
- **Shared Resources**: Los costos son responsabilidad del propietario
- **Data Transfer**: Costos de transferencia entre cuentas
- **Storage**: Costos de almacenamiento compartido
- **Compute**: Costos de cómputo en recursos compartidos

## Troubleshooting

### **Problemas Comunes**
1. **Permission Denied**: Verificar permisos y configuración
2. **Resource Not Found**: Validar ARNs de recursos
3. **Invitation Issues**: Revisar configuración de invitaciones
4. **Access Problems**: Verificar configuración de IAM

### **Comandos de Diagnóstico**
```bash
# Verificar resource share
aws ram get-resource-shares --resource-share-arns "arn:aws:ram:us-east-1:123456789012:resource-share/abc123"

# Verificar permisos
aws ram list-resource-share-permissions --resource-share-arn "arn:aws:ram:us-east-1:123456789012:resource-share/abc123"

# Verificar asociaciones
aws ram get-resource-share-associations --resource-share-arn "arn:aws:ram:us-east-1:123456789012:resource-share/abc123"

# Verificar invitaciones
aws ram list-resource-share-invitations
```

## Cumplimiento Normativo

### **GDPR**
- **Data Residency**: Controlar ubicación de datos compartidos
- **Access Control**: Control de acceso granular
- **Audit Trail**: Registro completo de acceso
- **Data Protection**: Protección de datos compartidos

### **HIPAA**
- **Secure Sharing**: Compartimiento seguro de datos PHI
- **Access Logging**: Registro de acceso a datos
- **Encryption**: Cifrado obligatorio
- **Compliance Monitoring**: Monitoreo continuo

### **PCI DSS**
- **Network Isolation**: Aislamiento de red para datos PCI
- **Access Control**: Control de acceso estricto
- **Audit Logging**: Logging completo y seguro
- **Compliance**: Cumplimiento con estándares PCI

### **SOC 2**
- **Security Controls**: Controles de seguridad para compartimiento
- **Access Management**: Gestión de acceso centralizada
- **Audit Trail**: Registro de auditoría completo
- **Compliance**: Cumplimiento con estándares SOC 2

## Integración con Otros Servicios

### **AWS Organizations**
- **Organization-wide Sharing**: Compartimiento a nivel de organización
- **OU Sharing**: Compartimiento a nivel de OU
- **Policy Integration**: Integración con políticas de organización
- **Centralized Management**: Gestión centralizada

### **AWS IAM**
- **Permission Integration**: Integración con permisos IAM
- **Principal Management**: Gestión de principales
- **Access Control**: Control de acceso granular
- **Security**: Seguridad basada en IAM

### **AWS Resource Groups**
- **Resource Grouping**: Agrupación de recursos compartidos
- **Tagging**: Etiquetado consistente
- **Management**: Gestión simplificada
- **Automation**: Automatización de operaciones

### **AWS CloudTrail**
- **Audit Logging**: Registro de auditoría
- **Access Monitoring**: Monitoreo de acceso
- **Compliance**: Cumplimiento normativo
- **Security**: Seguridad de compartimiento

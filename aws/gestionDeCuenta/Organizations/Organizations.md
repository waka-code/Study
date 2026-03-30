# AWS Organizations

## Definición

AWS Organizations es un servicio de gestión de cuentas que permite consolidar múltiples cuentas de AWS en una organización que se crea y gestiona de forma centralizada. Permite aplicar políticas basadas en grupos a múltiples cuentas, automatizar la creación de cuentas, simplificar la facturación mediante una única factura consolidada y controlar el acceso a los servicios de AWS.

## Características Principales

### **Gestión Centralizada de Cuentas**
- **Consolidated Billing**: Facturación consolidada para todas las cuentas
- **Account Management**: Gestión centralizada de múltiples cuentas AWS
- **Hierarchical Structure**: Estructura organizacional jerárquica con OUs (Organizational Units)
- **Automated Account Creation**: Creación automatizada de nuevas cuentas
- **Account Grouping**: Agrupación lógica de cuentas por función, proyecto o departamento

### **Control de Políticas**
- **Service Control Policies (SCPs)**: Políticas de control de servicios para permisos
- **Tag Policies**: Políticas de etiquetado para estandarización
- **Backup Policies**: Políticas de respaldo automatizadas
- **AI Services Opt-out Policies**: Políticas de exclusión de servicios de IA
- **Policy Inheritance**: Herencia de políticas en la jerarquía organizacional

### **Seguridad y Cumplimiento**
- **Centralized Security**: Seguridad centralizada para todas las cuentas
- **Compliance Management**: Gestión de cumplimiento normativo
- **Access Control**: Control de acceso granular por cuenta y OU
- **Audit Trail**: Registro de auditoría completo con CloudTrail
- **GuardRails**: Barreras de seguridad preventivas y detectivas

### **Integración y Automatización**
- **AWS Control Tower**: Integración con Control Tower para landing zones
- **AWS SSO**: Single Sign-On para acceso unificado
- **CloudFormation StackSets**: Despliegue automatizado en múltiples cuentas
- **Service Catalog**: Catálogo de servicios compartido
- **Resource Sharing**: Compartición de recursos entre cuentas

## Conceptos Clave

### **Organization**
- Entidad que contiene todas las cuentas AWS
- Tiene una cuenta raíz (management account)
- Puede tener múltiples OUs y cuentas miembro

### **Organizational Unit (OU)**
- Contenedor para cuentas dentro de una organización
- Puede contener otras OUs (anidamiento)
- Permite aplicar políticas a grupos de cuentas
- Estructura jerárquica flexible

### **Management Account**
- Cuenta principal que crea la organización
- Paga todas las cargas de las cuentas miembro
- Tiene control completo sobre la organización
- No puede ser restringida por SCPs

### **Member Account**
- Cuenta que pertenece a una organización
- Puede ser creada por la organización o invitada
- Sujeta a las políticas de la organización
- Puede ser movida entre OUs

### **Service Control Policies (SCPs)**
- Políticas JSON que especifican permisos máximos
- Se aplican a OUs o cuentas individuales
- No otorgan permisos, solo los limitan
- Funcionan como filtros de permisos

## Arquitectura de AWS Organizations

### **Estructura Jerárquica**
```
Organization Root
├── Management Account
├── OU: Production
│   ├── Account: Prod-App1
│   ├── Account: Prod-App2
│   └── OU: Production-Data
│       ├── Account: Prod-DB1
│       └── Account: Prod-DB2
├── OU: Development
│   ├── Account: Dev-App1
│   ├── Account: Dev-App2
│   └── Account: Dev-Shared
├── OU: Security
│   ├── Account: Security-Audit
│   ├── Account: Security-Log
│   └── Account: Security-Compliance
└── OU: Shared Services
    ├── Account: Networking
    ├── Account: DNS
    └── Account: Monitoring
```

### **Flujo de Políticas**
```
Root (SCP aplicado a toda la organización)
  ↓
OU Level 1 (SCP heredado + SCP específico de OU)
  ↓
OU Level 2 (SCPs heredados + SCP específico)
  ↓
Account (Todos los SCPs heredados + SCP específico de cuenta)
  ↓
IAM Policies (Permisos efectivos = intersección de SCPs + IAM)
```

## Configuración de AWS Organizations

### **Gestión Completa de AWS Organizations**
```python
import boto3
import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class OrganizationsManager:
    def __init__(self, region='us-east-1'):
        self.organizations = boto3.client('organizations', region_name=region)
        self.sts = boto3.client('sts', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.cloudtrail = boto3.client('cloudtrail', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.region = region
    
    def create_organization(self, feature_set='ALL'):
        """Crear organización"""
        
        try:
            response = self.organizations.create_organization(
                FeatureSet=feature_set
            )
            
            org_info = {
                'organization_id': response['Organization']['Id'],
                'organization_arn': response['Organization']['Arn'],
                'master_account_id': response['Organization']['MasterAccountId'],
                'master_account_email': response['Organization']['MasterAccountEmail'],
                'feature_set': response['Organization']['FeatureSet'],
                'available_policy_types': response['Organization'].get('AvailablePolicyTypes', [])
            }
            
            return {
                'success': True,
                'organization': org_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_organization(self):
        """Obtener detalles de la organización"""
        
        try:
            response = self.organizations.describe_organization()
            
            org_info = {
                'organization_id': response['Organization']['Id'],
                'organization_arn': response['Organization']['Arn'],
                'master_account_id': response['Organization']['MasterAccountId'],
                'master_account_email': response['Organization']['MasterAccountEmail'],
                'feature_set': response['Organization']['FeatureSet'],
                'available_policy_types': response['Organization'].get('AvailablePolicyTypes', [])
            }
            
            return {
                'success': True,
                'organization': org_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_organizational_unit(self, parent_id, name, tags=None):
        """Crear unidad organizacional"""
        
        try:
            params = {
                'ParentId': parent_id,
                'Name': name
            }
            
            if tags:
                params['Tags'] = tags
            
            response = self.organizations.create_organizational_unit(**params)
            
            ou_info = {
                'ou_id': response['OrganizationalUnit']['Id'],
                'ou_arn': response['OrganizationalUnit']['Arn'],
                'ou_name': response['OrganizationalUnit']['Name']
            }
            
            return {
                'success': True,
                'organizational_unit': ou_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_organizational_units_for_parent(self, parent_id, max_results=20, next_token=None):
        """Listar unidades organizacionales de un padre"""
        
        try:
            params = {
                'ParentId': parent_id,
                'MaxResults': max_results
            }
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.organizations.list_organizational_units_for_parent(**params)
            
            ous = []
            for ou in response['OrganizationalUnits']:
                ou_info = {
                    'ou_id': ou['Id'],
                    'ou_arn': ou['Arn'],
                    'ou_name': ou['Name']
                }
                ous.append(ou_info)
            
            return {
                'success': True,
                'organizational_units': ous,
                'count': len(ous),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_account(self, email, account_name, role_name='OrganizationAccountAccessRole',
                      iam_user_access_to_billing='ALLOW', tags=None):
        """Crear cuenta en la organización"""
        
        try:
            params = {
                'Email': email,
                'AccountName': account_name,
                'RoleName': role_name,
                'IamUserAccessToBilling': iam_user_access_to_billing
            }
            
            if tags:
                params['Tags'] = tags
            
            response = self.organizations.create_account(**params)
            
            return {
                'success': True,
                'create_account_request_id': response['CreateAccountStatus']['Id'],
                'state': response['CreateAccountStatus']['State'],
                'account_name': response['CreateAccountStatus']['AccountName']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_create_account_status(self, create_account_request_id):
        """Obtener estado de creación de cuenta"""
        
        try:
            response = self.organizations.describe_create_account_status(
                CreateAccountRequestId=create_account_request_id
            )
            
            status_info = {
                'request_id': response['CreateAccountStatus']['Id'],
                'state': response['CreateAccountStatus']['State'],
                'account_name': response['CreateAccountStatus']['AccountName'],
                'requested_timestamp': response['CreateAccountStatus']['RequestedTimestamp'].isoformat(),
                'completed_timestamp': response['CreateAccountStatus'].get('CompletedTimestamp', '').isoformat() if response['CreateAccountStatus'].get('CompletedTimestamp') else '',
                'account_id': response['CreateAccountStatus'].get('AccountId', ''),
                'failure_reason': response['CreateAccountStatus'].get('FailureReason', '')
            }
            
            return {
                'success': True,
                'status': status_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_accounts(self, max_results=20, next_token=None):
        """Listar cuentas en la organización"""
        
        try:
            params = {'MaxResults': max_results}
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.organizations.list_accounts(**params)
            
            accounts = []
            for account in response['Accounts']:
                account_info = {
                    'account_id': account['Id'],
                    'account_arn': account['Arn'],
                    'account_name': account['Name'],
                    'email': account['Email'],
                    'status': account['Status'],
                    'joined_method': account['JoinedMethod'],
                    'joined_timestamp': account['JoinedTimestamp'].isoformat()
                }
                accounts.append(account_info)
            
            return {
                'success': True,
                'accounts': accounts,
                'count': len(accounts),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def move_account(self, account_id, source_parent_id, destination_parent_id):
        """Mover cuenta entre OUs"""
        
        try:
            response = self.organizations.move_account(
                AccountId=account_id,
                SourceParentId=source_parent_id,
                DestinationParentId=destination_parent_id
            )
            
            return {
                'success': True,
                'account_id': account_id,
                'moved_from': source_parent_id,
                'moved_to': destination_parent_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_policy(self, content, description, name, type='SERVICE_CONTROL_POLICY', tags=None):
        """Crear política"""
        
        try:
            params = {
                'Content': content,
                'Description': description,
                'Name': name,
                'Type': type
            }
            
            if tags:
                params['Tags'] = tags
            
            response = self.organizations.create_policy(**params)
            
            policy_info = {
                'policy_id': response['Policy']['PolicySummary']['Id'],
                'policy_arn': response['Policy']['PolicySummary']['Arn'],
                'policy_name': response['Policy']['PolicySummary']['Name'],
                'policy_type': response['Policy']['PolicySummary']['Type'],
                'description': response['Policy']['PolicySummary']['Description']
            }
            
            return {
                'success': True,
                'policy': policy_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def attach_policy(self, policy_id, target_id):
        """Adjuntar política a objetivo (OU o cuenta)"""
        
        try:
            response = self.organizations.attach_policy(
                PolicyId=policy_id,
                TargetId=target_id
            )
            
            return {
                'success': True,
                'policy_id': policy_id,
                'target_id': target_id,
                'attached': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def detach_policy(self, policy_id, target_id):
        """Desadjuntar política de objetivo"""
        
        try:
            response = self.organizations.detach_policy(
                PolicyId=policy_id,
                TargetId=target_id
            )
            
            return {
                'success': True,
                'policy_id': policy_id,
                'target_id': target_id,
                'detached': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_policies(self, filter_type='SERVICE_CONTROL_POLICY', max_results=20, next_token=None):
        """Listar políticas"""
        
        try:
            params = {
                'Filter': filter_type,
                'MaxResults': max_results
            }
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.organizations.list_policies(**params)
            
            policies = []
            for policy in response['Policies']:
                policy_info = {
                    'policy_id': policy['Id'],
                    'policy_arn': policy['Arn'],
                    'policy_name': policy['Name'],
                    'policy_type': policy['Type'],
                    'description': policy['Description'],
                    'aws_managed': policy['AwsManaged']
                }
                policies.append(policy_info)
            
            return {
                'success': True,
                'policies': policies,
                'count': len(policies),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_policy(self, policy_id):
        """Obtener detalles de política"""
        
        try:
            response = self.organizations.describe_policy(PolicyId=policy_id)
            
            policy_info = {
                'policy_id': response['Policy']['PolicySummary']['Id'],
                'policy_arn': response['Policy']['PolicySummary']['Arn'],
                'policy_name': response['Policy']['PolicySummary']['Name'],
                'policy_type': response['Policy']['PolicySummary']['Type'],
                'description': response['Policy']['PolicySummary']['Description'],
                'aws_managed': response['Policy']['PolicySummary']['AwsManaged'],
                'content': response['Policy']['Content']
            }
            
            return {
                'success': True,
                'policy': policy_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_roots(self, max_results=20, next_token=None):
        """Listar raíces de la organización"""
        
        try:
            params = {'MaxResults': max_results}
            
            if next_token:
                params['NextToken'] = next_token
            
            response = self.organizations.list_roots(**params)
            
            roots = []
            for root in response['Roots']:
                root_info = {
                    'root_id': root['Id'],
                    'root_arn': root['Arn'],
                    'root_name': root['Name'],
                    'policy_types': root.get('PolicyTypes', [])
                }
                roots.append(root_info)
            
            return {
                'success': True,
                'roots': roots,
                'count': len(roots),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def enable_policy_type(self, root_id, policy_type):
        """Habilitar tipo de política en la raíz"""
        
        try:
            response = self.organizations.enable_policy_type(
                RootId=root_id,
                PolicyType=policy_type
            )
            
            return {
                'success': True,
                'root_id': root_id,
                'policy_type': policy_type,
                'enabled': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def disable_policy_type(self, root_id, policy_type):
        """Deshabilitar tipo de política en la raíz"""
        
        try:
            response = self.organizations.disable_policy_type(
                RootId=root_id,
                PolicyType=policy_type
            )
            
            return {
                'success': True,
                'root_id': root_id,
                'policy_type': policy_type,
                'disabled': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_organization_structure(self, structure_config):
        """Crear estructura organizacional completa"""
        
        try:
            results = {
                'organization': None,
                'root_id': None,
                'ous': {},
                'accounts': {},
                'policies': {},
                'status': 'IN_PROGRESS'
            }
            
            # 1. Obtener organización existente o crear nueva
            org_result = self.describe_organization()
            if not org_result['success']:
                org_result = self.create_organization()
            
            if org_result['success']:
                results['organization'] = org_result['organization']
                
                # 2. Obtener root ID
                roots_result = self.list_roots()
                if roots_result['success'] and roots_result['roots']:
                    results['root_id'] = roots_result['roots'][0]['root_id']
                    
                    # 3. Crear OUs según configuración
                    for ou_name, ou_config in structure_config.get('ous', {}).items():
                        parent_id = ou_config.get('parent_id', results['root_id'])
                        
                        ou_result = self.create_organizational_unit(
                            parent_id=parent_id,
                            name=ou_name,
                            tags=ou_config.get('tags')
                        )
                        
                        if ou_result['success']:
                            results['ous'][ou_name] = ou_result['organizational_unit']
                    
                    # 4. Crear cuentas según configuración
                    for account_name, account_config in structure_config.get('accounts', {}).items():
                        account_result = self.create_account(
                            email=account_config['email'],
                            account_name=account_name,
                            role_name=account_config.get('role_name', 'OrganizationAccountAccessRole'),
                            tags=account_config.get('tags')
                        )
                        
                        if account_result['success']:
                            results['accounts'][account_name] = account_result
                    
                    # 5. Crear políticas según configuración
                    for policy_name, policy_config in structure_config.get('policies', {}).items():
                        policy_result = self.create_policy(
                            content=policy_config['content'],
                            description=policy_config['description'],
                            name=policy_name,
                            type=policy_config.get('type', 'SERVICE_CONTROL_POLICY'),
                            tags=policy_config.get('tags')
                        )
                        
                        if policy_result['success']:
                            results['policies'][policy_name] = policy_result['policy']
                            
                            # Adjuntar política a objetivos
                            for target in policy_config.get('targets', []):
                                target_id = results['ous'].get(target, {}).get('ou_id') or target
                                self.attach_policy(
                                    policy_id=policy_result['policy']['policy_id'],
                                    target_id=target_id
                                )
                    
                    results['status'] = 'COMPLETED'
            
            return {
                'success': True,
                'results': results
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_organization_tree(self):
        """Obtener árbol completo de la organización"""
        
        try:
            tree = {
                'organization': None,
                'root': None,
                'structure': {}
            }
            
            # Obtener organización
            org_result = self.describe_organization()
            if org_result['success']:
                tree['organization'] = org_result['organization']
            
            # Obtener root
            roots_result = self.list_roots()
            if roots_result['success'] and roots_result['roots']:
                root = roots_result['roots'][0]
                tree['root'] = root
                
                # Construir árbol recursivamente
                tree['structure'] = self._build_tree_recursive(root['root_id'])
            
            return {
                'success': True,
                'tree': tree
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _build_tree_recursive(self, parent_id):
        """Construir árbol de forma recursiva"""
        
        node = {
            'id': parent_id,
            'ous': [],
            'accounts': []
        }
        
        # Obtener OUs hijas
        ous_result = self.list_organizational_units_for_parent(parent_id)
        if ous_result['success']:
            for ou in ous_result['organizational_units']:
                ou_node = {
                    'ou_id': ou['ou_id'],
                    'ou_name': ou['ou_name'],
                    'children': self._build_tree_recursive(ou['ou_id'])
                }
                node['ous'].append(ou_node)
        
        # Obtener cuentas
        try:
            accounts_response = self.organizations.list_accounts_for_parent(ParentId=parent_id)
            for account in accounts_response['Accounts']:
                account_info = {
                    'account_id': account['Id'],
                    'account_name': account['Name'],
                    'email': account['Email'],
                    'status': account['Status']
                }
                node['accounts'].append(account_info)
        except Exception:
            pass
        
        return node
    
    def analyze_organization_compliance(self):
        """Analizar cumplimiento de la organización"""
        
        try:
            compliance_analysis = {
                'organization_id': '',
                'total_accounts': 0,
                'total_ous': 0,
                'policy_coverage': {},
                'security_findings': [],
                'recommendations': []
            }
            
            # Obtener información de la organización
            org_result = self.describe_organization()
            if org_result['success']:
                compliance_analysis['organization_id'] = org_result['organization']['organization_id']
            
            # Contar cuentas
            accounts_result = self.list_accounts()
            if accounts_result['success']:
                compliance_analysis['total_accounts'] = accounts_result['count']
            
            # Obtener árbol para contar OUs
            tree_result = self.get_organization_tree()
            if tree_result['success']:
                compliance_analysis['total_ous'] = self._count_ous_in_tree(tree_result['tree']['structure'])
            
            # Analizar cobertura de políticas
            policies_result = self.list_policies()
            if policies_result['success']:
                compliance_analysis['policy_coverage'] = {
                    'total_policies': policies_result['count'],
                    'scp_policies': len([p for p in policies_result['policies'] if p['policy_type'] == 'SERVICE_CONTROL_POLICY']),
                    'tag_policies': len([p for p in policies_result['policies'] if p['policy_type'] == 'TAG_POLICY']),
                    'backup_policies': len([p for p in policies_result['policies'] if p['policy_type'] == 'BACKUP_POLICY'])
                }
            
            # Generar hallazgos de seguridad
            if compliance_analysis['policy_coverage']['scp_policies'] == 0:
                compliance_analysis['security_findings'].append({
                    'severity': 'HIGH',
                    'category': 'POLICY',
                    'title': 'No Service Control Policies',
                    'description': 'No SCPs configured in the organization',
                    'recommendation': 'Implement SCPs to restrict service access'
                })
            
            if compliance_analysis['total_accounts'] > 10 and compliance_analysis['total_ous'] < 3:
                compliance_analysis['security_findings'].append({
                    'severity': 'MEDIUM',
                    'category': 'STRUCTURE',
                    'title': 'Limited OU structure',
                    'description': f'{compliance_analysis["total_accounts"]} accounts with only {compliance_analysis["total_ous"]} OUs',
                    'recommendation': 'Create more OUs for better organization and policy management'
                })
            
            # Generar recomendaciones
            recommendations = [
                {
                    'priority': 'HIGH',
                    'category': 'SECURITY',
                    'title': 'Implement SCPs',
                    'description': 'Use Service Control Policies to enforce security guardrails',
                    'action': 'Create and attach SCPs to OUs and accounts'
                },
                {
                    'priority': 'MEDIUM',
                    'category': 'GOVERNANCE',
                    'title': 'Enable CloudTrail organization trail',
                    'description': 'Centralize logging for all accounts',
                    'action': 'Configure organization-wide CloudTrail'
                },
                {
                    'priority': 'MEDIUM',
                    'category': 'COMPLIANCE',
                    'title': 'Implement tag policies',
                    'description': 'Standardize tagging across accounts',
                    'action': 'Create and enforce tag policies'
                }
            ]
            
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
    
    def _count_ous_in_tree(self, node):
        """Contar OUs en el árbol recursivamente"""
        
        count = len(node.get('ous', []))
        
        for ou in node.get('ous', []):
            count += self._count_ous_in_tree(ou.get('children', {}))
        
        return count
    
    def generate_organization_report(self, report_type='comprehensive'):
        """Generar reporte de la organización"""
        
        try:
            report = {
                'report_metadata': {
                    'report_type': report_type,
                    'generated_at': datetime.utcnow().isoformat()
                }
            }
            
            if report_type == 'comprehensive':
                # Reporte completo
                org_result = self.describe_organization()
                if org_result['success']:
                    report['organization'] = org_result['organization']
                
                accounts_result = self.list_accounts()
                if accounts_result['success']:
                    report['accounts'] = accounts_result['accounts']
                    report['account_count'] = accounts_result['count']
                
                tree_result = self.get_organization_tree()
                if tree_result['success']:
                    report['structure'] = tree_result['tree']
                
                policies_result = self.list_policies()
                if policies_result['success']:
                    report['policies'] = policies_result['policies']
                    report['policy_count'] = policies_result['count']
                
                compliance_result = self.analyze_organization_compliance()
                if compliance_result['success']:
                    report['compliance'] = compliance_result['compliance_analysis']
            
            elif report_type == 'accounts':
                # Reporte de cuentas
                accounts_result = self.list_accounts()
                if accounts_result['success']:
                    report['accounts'] = accounts_result['accounts']
                    report['account_count'] = accounts_result['count']
                    
                    # Agrupar por estado
                    report['accounts_by_status'] = {}
                    for account in accounts_result['accounts']:
                        status = account['status']
                        if status not in report['accounts_by_status']:
                            report['accounts_by_status'][status] = []
                        report['accounts_by_status'][status].append(account)
            
            elif report_type == 'policies':
                # Reporte de políticas
                policies_result = self.list_policies()
                if policies_result['success']:
                    report['policies'] = policies_result['policies']
                    report['policy_count'] = policies_result['count']
                    
                    # Agrupar por tipo
                    report['policies_by_type'] = {}
                    for policy in policies_result['policies']:
                        policy_type = policy['policy_type']
                        if policy_type not in report['policies_by_type']:
                            report['policies_by_type'][policy_type] = []
                        report['policies_by_type'][policy_type].append(policy)
            
            elif report_type == 'compliance':
                # Reporte de cumplimiento
                compliance_result = self.analyze_organization_compliance()
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

### **1. Crear Organización**
```python
# Ejemplo: Crear organización
manager = OrganizationsManager('us-east-1')

# Crear organización con todas las características
org_result = manager.create_organization(feature_set='ALL')

if org_result['success']:
    org = org_result['organization']
    print(f"Organization created:")
    print(f"  ID: {org['organization_id']}")
    print(f"  Master Account: {org['master_account_id']}")
    print(f"  Email: {org['master_account_email']}")
    print(f"  Feature Set: {org['feature_set']}")
```

### **2. Crear Estructura Organizacional**
```python
# Ejemplo: Crear estructura completa
manager = OrganizationsManager('us-east-1')

# Definir configuración de estructura
structure_config = {
    'ous': {
        'Production': {
            'parent_id': 'r-xxxx',  # Root ID
            'tags': [{'Key': 'Environment', 'Value': 'Production'}]
        },
        'Development': {
            'parent_id': 'r-xxxx',
            'tags': [{'Key': 'Environment', 'Value': 'Development'}]
        },
        'Security': {
            'parent_id': 'r-xxxx',
            'tags': [{'Key': 'Function', 'Value': 'Security'}]
        }
    },
    'accounts': {
        'prod-app1': {
            'email': 'prod-app1@company.com',
            'role_name': 'OrganizationAccountAccessRole',
            'tags': [{'Key': 'Application', 'Value': 'App1'}]
        },
        'dev-app1': {
            'email': 'dev-app1@company.com',
            'role_name': 'OrganizationAccountAccessRole',
            'tags': [{'Key': 'Application', 'Value': 'App1'}]
        }
    },
    'policies': {
        'DenyRootAccount': {
            'content': json.dumps({
                'Version': '2012-10-17',
                'Statement': [{
                    'Effect': 'Deny',
                    'Action': '*',
                    'Resource': '*',
                    'Condition': {
                        'StringLike': {
                            'aws:PrincipalArn': 'arn:aws:iam::*:root'
                        }
                    }
                }]
            }),
            'description': 'Deny root account usage',
            'type': 'SERVICE_CONTROL_POLICY',
            'targets': ['Production', 'Development']
        }
    }
}

# Crear estructura
result = manager.create_organization_structure(structure_config)

if result['success']:
    results = result['results']
    print(f"Organization structure created:")
    print(f"  OUs: {len(results['ous'])}")
    print(f"  Accounts: {len(results['accounts'])}")
    print(f"  Policies: {len(results['policies'])}")
    print(f"  Status: {results['status']}")
```

### **3. Crear y Adjuntar Service Control Policy**
```python
# Ejemplo: Crear SCP para restringir regiones
manager = OrganizationsManager('us-east-1')

# Definir política SCP
scp_content = {
    'Version': '2012-10-17',
    'Statement': [
        {
            'Effect': 'Deny',
            'Action': '*',
            'Resource': '*',
            'Condition': {
                'StringNotEquals': {
                    'aws:RequestedRegion': [
                        'us-east-1',
                        'us-west-2',
                        'eu-west-1'
                    ]
                }
            }
        }
    ]
}

# Crear política
policy_result = manager.create_policy(
    content=json.dumps(scp_content),
    description='Restrict operations to approved regions only',
    name='RestrictRegions',
    type='SERVICE_CONTROL_POLICY'
)

if policy_result['success']:
    policy = policy_result['policy']
    print(f"Policy created: {policy['policy_name']}")
    print(f"  ID: {policy['policy_id']}")
    
    # Adjuntar política a OU
    attach_result = manager.attach_policy(
        policy_id=policy['policy_id'],
        target_id='ou-xxxx-xxxxxxxx'  # OU ID
    )
    
    if attach_result['success']:
        print(f"Policy attached to OU successfully")
```

### **4. Obtener Árbol de Organización**
```python
# Ejemplo: Visualizar estructura organizacional
manager = OrganizationsManager('us-east-1')

tree_result = manager.get_organization_tree()

if tree_result['success']:
    tree = tree_result['tree']
    print(f"Organization Tree:")
    print(f"  Organization ID: {tree['organization']['organization_id']}")
    print(f"  Root ID: {tree['root']['root_id']}")
    
    # Función para imprimir árbol recursivamente
    def print_tree(node, indent=0):
        prefix = "  " * indent
        
        # Imprimir OUs
        for ou in node.get('ous', []):
            print(f"{prefix}OU: {ou['ou_name']} ({ou['ou_id']})")
            print_tree(ou['children'], indent + 1)
        
        # Imprimir cuentas
        for account in node.get('accounts', []):
            print(f"{prefix}Account: {account['account_name']} ({account['account_id']})")
    
    print_tree(tree['structure'])
```

### **5. Análisis de Cumplimiento**
```python
# Ejemplo: Analizar cumplimiento organizacional
manager = OrganizationsManager('us-east-1')

compliance_result = manager.analyze_organization_compliance()

if compliance_result['success']:
    compliance = compliance_result['compliance_analysis']
    
    print(f"Organization Compliance Analysis")
    print(f"  Organization ID: {compliance['organization_id']}")
    print(f"  Total Accounts: {compliance['total_accounts']}")
    print(f"  Total OUs: {compliance['total_ous']}")
    
    print(f"\nPolicy Coverage:")
    coverage = compliance['policy_coverage']
    print(f"  Total Policies: {coverage['total_policies']}")
    print(f"  SCP Policies: {coverage['scp_policies']}")
    print(f"  Tag Policies: {coverage['tag_policies']}")
    print(f"  Backup Policies: {coverage['backup_policies']}")
    
    print(f"\nSecurity Findings: {len(compliance['security_findings'])}")
    for finding in compliance['security_findings']:
        print(f"  [{finding['severity']}] {finding['title']}")
        print(f"    {finding['description']}")
        print(f"    Recommendation: {finding['recommendation']}")
    
    print(f"\nRecommendations: {len(compliance['recommendations'])}")
    for rec in compliance['recommendations']:
        print(f"  [{rec['priority']}] {rec['title']}")
        print(f"    {rec['description']}")
        print(f"    Action: {rec['action']}")
```

### **6. Generar Reporte Comprehensivo**
```python
# Ejemplo: Generar reporte completo
manager = OrganizationsManager('us-east-1')

report_result = manager.generate_organization_report(report_type='comprehensive')

if report_result['success']:
    report = report_result['report']
    
    print(f"Organization Report")
    print(f"  Generated at: {report['report_metadata']['generated_at']}")
    
    if 'organization' in report:
        org = report['organization']
        print(f"\nOrganization:")
        print(f"  ID: {org['organization_id']}")
        print(f"  Master Account: {org['master_account_id']}")
    
    if 'account_count' in report:
        print(f"\nAccounts: {report['account_count']}")
    
    if 'policy_count' in report:
        print(f"Policies: {report['policy_count']}")
    
    if 'compliance' in report:
        compliance = report['compliance']
        print(f"\nCompliance:")
        print(f"  Security Findings: {len(compliance['security_findings'])}")
        print(f"  Recommendations: {len(compliance['recommendations'])}")
```

## Configuración con AWS CLI

### **Organización**
```bash
# Crear organización
aws organizations create-organization --feature-set ALL

# Describir organización
aws organizations describe-organization

# Listar raíces
aws organizations list-roots
```

### **Unidades Organizacionales**
```bash
# Crear OU
aws organizations create-organizational-unit \
  --parent-id r-xxxx \
  --name Production

# Listar OUs
aws organizations list-organizational-units-for-parent --parent-id r-xxxx

# Mover cuenta a OU
aws organizations move-account \
  --account-id 123456789012 \
  --source-parent-id r-xxxx \
  --destination-parent-id ou-xxxx-xxxxxxxx
```

### **Cuentas**
```bash
# Crear cuenta
aws organizations create-account \
  --email prod-app1@company.com \
  --account-name prod-app1

# Listar cuentas
aws organizations list-accounts

# Describir estado de creación de cuenta
aws organizations describe-create-account-status \
  --create-account-request-id car-xxxxxxxxxxxxxxxx
```

### **Políticas**
```bash
# Crear SCP
aws organizations create-policy \
  --content file://scp-policy.json \
  --description "Restrict regions" \
  --name RestrictRegions \
  --type SERVICE_CONTROL_POLICY

# Listar políticas
aws organizations list-policies --filter SERVICE_CONTROL_POLICY

# Adjuntar política
aws organizations attach-policy \
  --policy-id p-xxxxxxxx \
  --target-id ou-xxxx-xxxxxxxx

# Desadjuntar política
aws organizations detach-policy \
  --policy-id p-xxxxxxxx \
  --target-id ou-xxxx-xxxxxxxx
```

## Mejores Prácticas

### **1. Diseño de Estructura**
- **Hierarchical Design**: Diseñar jerarquía lógica basada en función, entorno o proyecto
- **OU Strategy**: Crear OUs para diferentes propósitos (producción, desarrollo, seguridad)
- **Account Separation**: Separar cargas de trabajo en cuentas diferentes
- **Naming Convention**: Usar convenciones de nomenclatura consistentes
- **Scalability**: Diseñar para crecimiento futuro

### **2. Gestión de Políticas**
- **Least Privilege**: Aplicar principio de mínimo privilegio con SCPs
- **Policy Testing**: Probar políticas en entornos no productivos primero
- **Documentation**: Documentar propósito y alcance de cada política
- **Regular Review**: Revisar y actualizar políticas regularmente
- **Inheritance**: Entender herencia de políticas en la jerarquía

### **3. Seguridad**
- **MFA**: Habilitar MFA en cuenta de gestión
- **CloudTrail**: Configurar CloudTrail organizacional
- **GuardDuty**: Habilitar GuardDuty en todas las cuentas
- **Config**: Usar AWS Config para cumplimiento
- **Security Hub**: Centralizar hallazgos de seguridad

### **4. Gobernanza**
- **Tag Policies**: Implementar políticas de etiquetado
- **Backup Policies**: Configurar políticas de respaldo
- **Cost Allocation**: Usar etiquetas para asignación de costos
- **Compliance**: Monitorear cumplimiento normativo
- **Automation**: Automatizar creación y gestión de cuentas

## Costos

### **Precios de AWS Organizations**
- **Service**: GRATIS
- **No hay cargos**: Por usar AWS Organizations
- **Consolidated Billing**: Sin costo adicional
- **Policy Management**: Sin costo adicional

### **Costos Asociados**
- Los costos provienen de los servicios utilizados en las cuentas
- Facturación consolidada puede proporcionar descuentos por volumen
- Uso compartido de recursos puede reducir costos

## Troubleshooting

### **Problemas Comunes**
1. **Políticas Demasiado Restrictivas**: Revisar y ajustar SCPs
2. **Errores de Creación de Cuenta**: Verificar límites y permisos
3. **Problemas de Facturación**: Revisar configuración de facturación consolidada
4. **Conflictos de Políticas**: Analizar herencia y combinación de políticas

### **Comandos de Diagnóstico**
```bash
# Verificar organización
aws organizations describe-organization

# Verificar estado de cuenta
aws organizations describe-account --account-id 123456789012

# Listar políticas adjuntas a objetivo
aws organizations list-policies-for-target --target-id ou-xxxx-xxxxxxxx

# Verificar políticas efectivas
aws organizations describe-effective-policy \
  --policy-type SERVICE_CONTROL_POLICY \
  --target-id 123456789012
```

## Cumplimiento Normativo

### **GDPR**
- **Data Residency**: Controlar regiones con SCPs
- **Access Control**: Gestión centralizada de acceso
- **Audit Trail**: CloudTrail organizacional
- **Data Protection**: Políticas de cifrado

### **HIPAA**
- **Account Isolation**: Separación de cargas de trabajo PHI
- **Access Logging**: Registro completo de acceso
- **Encryption**: Políticas de cifrado obligatorio
- **Compliance Monitoring**: AWS Config y Security Hub

### **PCI DSS**
- **Network Segmentation**: Separación de cuentas
- **Access Control**: SCPs para restricción de servicios
- **Logging**: CloudTrail centralizado
- **Regular Audits**: Monitoreo continuo

### **SOC 2**
- **Security Controls**: SCPs y políticas de seguridad
- **Availability**: Arquitectura multi-cuenta
- **Confidentiality**: Control de acceso granular
- **Processing Integrity**: Automatización y validación

## Integración con Otros Servicios

### **AWS Control Tower**
- **Landing Zone**: Configuración automatizada de multi-cuenta
- **Guardrails**: Implementación de controles preventivos y detectivos
- **Account Factory**: Creación automatizada de cuentas
- **Dashboard**: Visualización centralizada

### **AWS SSO**
- **Single Sign-On**: Acceso unificado a todas las cuentas
- **Permission Sets**: Gestión centralizada de permisos
- **User Management**: Administración de usuarios y grupos
- **MFA**: Autenticación multi-factor centralizada

### **AWS CloudFormation StackSets**
- **Multi-account Deployment**: Despliegue en múltiples cuentas
- **Automated Provisioning**: Aprovisionamiento automatizado
- **Consistent Configuration**: Configuración consistente
- **Update Management**: Gestión de actualizaciones

### **AWS Service Catalog**
- **Shared Portfolios**: Catálogos compartidos entre cuentas
- **Standardized Products**: Productos estandarizados
- **Governance**: Control de aprovisionamiento
- **Self-service**: Autoservicio para usuarios

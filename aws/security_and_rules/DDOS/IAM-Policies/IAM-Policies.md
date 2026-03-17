# AWS IAM Policies

## Definición

AWS IAM (Identity and Access Management) Policies son documentos JSON que definen permisos específicos para acciones de AWS en recursos. Estas políticas controlan qué usuarios, grupos y roles pueden realizar acciones específicas en recursos específicos, siguiendo el principio de menor privilegio.

## Tipos de Políticas IAM

### **1. Managed Policies**
- **AWS Managed**: Políticas predefinidas por AWS
- **Customer Managed**: Políticas personalizadas creadas por ti
- **Reusables**: Pueden ser asignadas a múltiples identidades

### **2. Inline Policies**
- **Específicas para identidad**: Asociadas a un solo usuario, grupo o rol
- **No reusables**: No pueden ser compartidas
- **Útiles para permisos únicos**

### **3. Service Control Policies (SCPs)**
- **Organizaciones**: Control a nivel de AWS Organizations
- **Restricciones de servicio**: Limitan servicios disponibles
- **Cumplimiento**: Aplican políticas corporativas

## Componentes de Políticas

### **Estructura Básica**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "StatementIdentifier",
      "Effect": "Allow|Deny",
      "Principal": {"AWS": "arn:aws:iam::account:user/user"},
      "Action": ["ec2:DescribeInstances"],
      "Resource": ["arn:aws:ec2:region:account:instance/instance-id"],
      "Condition": {"StringEquals": {"ec2:ResourceTag/Environment": "production"}}
    }
  ]
}
```

### **Elementos Clave**
- **Version**: Versión de la política (generalmente "2012-10-17")
- **Statement**: Array de declaraciones de permisos
- **Effect**: "Allow" o "Deny"
- **Action**: Acciones permitidas/denegadas
- **Resource**: Recursos afectados
- **Condition**: Condiciones adicionales

## Configuración de IAM Policies

### **Gestión de Políticas IAM**
```python
import boto3
import json
from datetime import datetime, timedelta

class IAMPolicyManager:
    def __init__(self, region='us-east-1'):
        self.iam = boto3.client('iam')
        self.region = region
    
    def create_managed_policy(self, policy_name, policy_document, description=None,
                            path=None, tags=None):
        """Crear política gestionada"""
        
        try:
            policy_params = {
                'PolicyName': policy_name,
                'PolicyDocument': json.dumps(policy_document) if isinstance(policy_document, dict) else policy_document
            }
            
            if description:
                policy_params['Description'] = description
            
            if path:
                policy_params['Path'] = path
            
            if tags:
                policy_params['Tags'] = tags
            
            response = self.iam.create_policy(**policy_params)
            policy_arn = response['Policy']['Arn']
            
            return {
                'success': True,
                'policy_arn': policy_arn,
                'policy_name': policy_name,
                'policy_id': response['Policy']['PolicyId']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_policy(self, policy_arn):
        """Obtener detalles de política"""
        
        try:
            response = self.iam.get_policy(PolicyArn=policy_arn)
            
            # Obtener versión de política
            version_response = self.iam.get_policy_version(
                PolicyArn=policy_arn,
                VersionId=response['Policy']['DefaultVersionId']
            )
            
            policy_info = {
                'policy_arn': response['Policy']['Arn'],
                'policy_name': response['Policy']['PolicyName'],
                'policy_id': response['Policy']['PolicyId'],
                'path': response['Policy']['Path'],
                'description': response['Policy'].get('Description'),
                'create_date': response['Policy']['CreateDate'],
                'update_date': response['Policy']['UpdateDate'],
                'default_version_id': response['Policy']['DefaultVersionId'],
                'attachment_count': response['Policy']['AttachmentCount'],
                'permissions_boundary_usage_count': response['Policy'].get('PermissionsBoundaryUsageCount', 0),
                'is_attachable': response['Policy']['IsAttachable'],
                'policy_document': version_response['PolicyVersion']['Document'],
                'tags': response['Policy'].get('Tags', [])
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
    
    def list_policies(self, scope='All', only_attached=False, path_prefix=None,
                     marker=None, max_items=100):
        """Listar políticas"""
        
        try:
            params = {
                'Scope': scope,
                'OnlyAttached': only_attached,
                'MaxItems': max_items
            }
            
            if path_prefix:
                params['PathPrefix'] = path_prefix
            
            if marker:
                params['Marker'] = marker
            
            response = self.iam.list_policies(**params)
            
            policies = []
            for policy in response['Policies']:
                policy_info = {
                    'policy_arn': policy['Arn'],
                    'policy_name': policy['PolicyName'],
                    'policy_id': policy['PolicyId'],
                    'path': policy['Path'],
                    'description': policy.get('Description'),
                    'create_date': policy['CreateDate'],
                    'update_date': policy['UpdateDate'],
                    'attachment_count': policy['AttachmentCount'],
                    'is_attachable': policy['IsAttachable']
                }
                policies.append(policy_info)
            
            return {
                'success': True,
                'policies': policies,
                'count': len(policies),
                'is_truncated': response.get('IsTruncated', False),
                'marker': response.get('Marker')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_policy(self, policy_arn, policy_document):
        """Actualizar política"""
        
        try:
            # Crear nueva versión
            response = self.iam.create_policy_version(
                PolicyArn=policy_arn,
                PolicyDocument=json.dumps(policy_document) if isinstance(policy_document, dict) else policy_document,
                SetAsDefault=True
            )
            
            return {
                'success': True,
                'policy_arn': policy_arn,
                'version_id': response['PolicyVersion']['VersionId']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_policy(self, policy_arn):
        """Eliminar política"""
        
        try:
            self.iam.delete_policy(PolicyArn=policy_arn)
            
            return {
                'success': True,
                'policy_arn': policy_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def attach_user_policy(self, user_name, policy_arn):
        """Asociar política a usuario"""
        
        try:
            self.iam.attach_user_policy(
                UserName=user_name,
                PolicyArn=policy_arn
            )
            
            return {
                'success': True,
                'user_name': user_name,
                'policy_arn': policy_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def attach_role_policy(self, role_name, policy_arn):
        """Asociar política a rol"""
        
        try:
            self.iam.attach_role_policy(
                RoleName=role_name,
                PolicyArn=policy_arn
            )
            
            return {
                'success': True,
                'role_name': role_name,
                'policy_arn': policy_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def attach_group_policy(self, group_name, policy_arn):
        """Asociar política a grupo"""
        
        try:
            self.iam.attach_group_policy(
                GroupName=group_name,
                PolicyArn=policy_arn
            )
            
            return {
                'success': True,
                'group_name': group_name,
                'policy_arn': policy_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def detach_user_policy(self, user_name, policy_arn):
        """Desasociar política de usuario"""
        
        try:
            self.iam.detach_user_policy(
                UserName=user_name,
                PolicyArn=policy_arn
            )
            
            return {
                'success': True,
                'user_name': user_name,
                'policy_arn': policy_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_developer_policy(self, policy_name, project_name, environment):
        """Crear política para desarrolladores"""
        
        policy_document = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "AllowEC2ReadOnly",
                    "Effect": "Allow",
                    "Action": [
                        "ec2:DescribeInstances",
                        "ec2:DescribeImages",
                        "ec2:DescribeSnapshots",
                        "ec2:DescribeVolumes",
                        "ec2:DescribeVpcs",
                        "ec2:DescribeSubnets",
                        "ec2:DescribeSecurityGroups"
                    ],
                    "Resource": "*"
                },
                {
                    "Sid": "AllowProjectEC2Management",
                    "Effect": "Allow",
                    "Action": [
                        "ec2:StartInstances",
                        "ec2:StopInstances",
                        "ec2:RebootInstances"
                    ],
                    "Resource": "*",
                    "Condition": {
                        "StringEquals": {
                            "ec2:ResourceTag/Project": project_name,
                            "ec2:ResourceTag/Environment": environment
                        }
                    }
                },
                {
                    "Sid": "AllowS3ProjectAccess",
                    "Effect": "Allow",
                    "Action": [
                        "s3:GetObject",
                        "s3:PutObject",
                        "s3:DeleteObject",
                        "s3:ListBucket"
                    ],
                    "Resource": [
                        f"arn:aws:s3:::{project_name}-{environment}-*",
                        f"arn:aws:s3:::{project_name}-{environment}-*/*"
                    ]
                },
                {
                    "Sid": "AllowCloudWatchLogs",
                    "Effect": "Allow",
                    "Action": [
                        "logs:CreateLogGroup",
                        "logs:CreateLogStream",
                        "logs:PutLogEvents",
                        "logs:DescribeLogStreams",
                        "logs:DescribeLogGroups"
                    ],
                    "Resource": "*"
                }
            ]
        }
        
        return self.create_managed_policy(
            policy_name=policy_name,
            policy_document=policy_document,
            description=f"Developer policy for {project_name} {environment}",
            path=f"/{project_name}/",
            tags=[
                {'Key': 'Project', 'Value': project_name},
                {'Key': 'Environment', 'Value': environment},
                {'Key': 'Role', 'Value': 'Developer'}
            ]
        )
    
    def create_readonly_policy(self, policy_name, services=None):
        """Crear política de solo lectura"""
        
        if not services:
            services = ['EC2', 'S3', 'RDS', 'DynamoDB', 'Lambda', 'CloudWatch']
        
        policy_document = {
            "Version": "2012-10-17",
            "Statement": []
        }
        
        for service in services:
            service_lower = service.lower()
            
            # Acciones de solo lectura comunes
            readonly_actions = [
                f"{service_lower}:Describe*",
                f"{service_lower}:Get*",
                f"{service_lower}:List*"
            ]
            
            # Excepciones específicas
            if service == 'S3':
                readonly_actions = [
                    "s3:GetObject",
                    "s3:ListBucket",
                    "s3:ListAllMyBuckets"
                ]
            elif service == 'CloudWatch':
                readonly_actions = [
                    "cloudwatch:Get*",
                    "cloudwatch:List*",
                    "cloudwatch:Describe*"
                ]
            
            statement = {
                "Sid": f"Allow{service}ReadOnly",
                "Effect": "Allow",
                "Action": readonly_actions,
                "Resource": "*"
            }
            
            policy_document["Statement"].append(statement)
        
        return self.create_managed_policy(
            policy_name=policy_name,
            policy_document=policy_document,
            description="Read-only access for multiple AWS services",
            tags=[
                {'Key': 'Access', 'Value': 'ReadOnly'},
                {'Key': 'Services', 'Value': ','.join(services)}
            ]
        )
    
    def create_admin_policy(self, policy_name, restricted_services=None):
        """Crear política administrativa restringida"""
        
        if not restricted_services:
            restricted_services = ['IAM', 'Billing', 'Organizations']
        
        policy_document = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "AllowMostServices",
                    "Effect": "Allow",
                    "NotAction": [
                        "iam:*",
                        "billing:*",
                        "organizations:*",
                        "account:*",
                        "aws-portal:*"
                    ],
                    "Resource": "*"
                },
                {
                    "Sid": "AllowLimitedIAM",
                    "Effect": "Allow",
                    "Action": [
                        "iam:Get*",
                        "iam:List*",
                        "iam:CreateUser",
                        "iam:CreateRole",
                        "iam:CreatePolicy",
                        "iam:AttachUserPolicy",
                        "iam:AttachRolePolicy",
                        "iam:PutUserPolicy",
                        "iam:PutRolePolicy"
                    ],
                    "Resource": "*"
                }
            ]
        }
        
        return self.create_managed_policy(
            policy_name=policy_name,
            policy_document=policy_document,
            description="Administrative access with restrictions",
            tags=[
                {'Key': 'Access', 'Value': 'Admin'},
                {'Key': 'Restricted', 'Value': 'True'}
            ]
        )
    
    def simulate_policy(self, policy_source_arn, action_names, resource_arns=None,
                       max_items=100):
        """Simular efectos de política"""
        
        try:
            params = {
                'PolicySourceArn': policy_source_arn,
                'ActionNames': action_names,
                'MaxItems': max_items
            }
            
            if resource_arns:
                params['ResourceArns'] = resource_arns
            
            response = self.iam.simulate_principal_policy(**params)
            
            results = []
            for result in response['EvaluationResults']:
                result_info = {
                    'action_name': result['EvalActionName'],
                    'resource_name': result.get('EvalResourceName'),
                    'decision': result['EvalDecision'],
                    'matched_statements': result.get('MatchedStatements', []),
                    'missing_context_values': result.get('MissingContextValues', []),
                    'organizations_decision_detail': result.get('OrganizationsDecisionDetail')
                }
                results.append(result_info)
            
            return {
                'success': True,
                'results': results,
                'is_truncated': response.get('IsTruncated', False),
                'marker': response.get('Marker')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_policy_permissions(self, policy_arn):
        """Analizar permisos de política"""
        
        try:
            # Obtener documento de política
            policy_response = self.get_policy(policy_arn)
            
            if not policy_response['success']:
                return policy_response
            
            policy_doc = policy_response['policy']['policy_document']
            
            analysis = {
                'total_statements': len(policy_doc.get('Statement', [])),
                'allow_statements': 0,
                'deny_statements': 0,
                'actions_allowed': set(),
                'actions_denied': set(),
                'resources_affected': set(),
                'wildcard_resources': False,
                'risk_level': 'low'
            }
            
            for statement in policy_doc.get('Statement', []):
                effect = statement.get('Effect', 'Allow')
                
                if effect == 'Allow':
                    analysis['allow_statements'] += 1
                else:
                    analysis['deny_statements'] += 1
                
                # Analizar acciones
                actions = statement.get('Action', [])
                if isinstance(actions, str):
                    actions = [actions]
                
                for action in actions:
                    if effect == 'Allow':
                        analysis['actions_allowed'].add(action)
                    else:
                        analysis['actions_denied'].add(action)
                
                # Analizar recursos
                resources = statement.get('Resource', [])
                if isinstance(resources, str):
                    resources = [resources]
                
                for resource in resources:
                    if resource == '*':
                        analysis['wildcard_resources'] = True
                    analysis['resources_affected'].add(resource)
            
            # Calcular nivel de riesgo
            if analysis['wildcard_resources'] and len(analysis['actions_allowed']) > 20:
                analysis['risk_level'] = 'high'
            elif analysis['wildcard_resources']:
                analysis['risk_level'] = 'medium'
            
            return {
                'success': True,
                'policy_arn': policy_arn,
                'analysis': analysis
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Crear Políticas para Diferentes Roles**
```python
# Ejemplo: Crear políticas para diferentes roles
manager = IAMPolicyManager()

# Política para desarrolladores
dev_policy_result = manager.create_developer_policy(
    policy_name='webapp-developer-policy',
    project_name='mywebapp',
    environment='development'
)

if dev_policy_result['success']:
    print(f"Developer policy created: {dev_policy_result['policy_arn']}")

# Política de solo lectura
readonly_policy_result = manager.create_readonly_policy(
    policy_name='multi-service-readonly',
    services=['EC2', 'S3', 'RDS', 'Lambda']
)

if readonly_policy_result['success']:
    print(f"Readonly policy created: {readonly_policy_result['policy_arn']}")

# Política administrativa restringida
admin_policy_result = manager.create_admin_policy(
    policy_name='restricted-admin',
    restricted_services=['IAM', 'Billing']
)

if admin_policy_result['success']:
    print(f"Admin policy created: {admin_policy_result['policy_arn']}")
```

### **2. Simular y Analizar Políticas**
```python
# Ejemplo: Simular permisos de política
simulation_result = manager.simulate_policy(
    policy_source_arn='arn:aws:iam::123456789012:user/developer',
    action_names=['ec2:StartInstances', 's3:GetObject'],
    resource_arns=[
        'arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0',
        'arn:aws:s3:::mywebapp-dev-bucket/*'
    ]
)

if simulation_result['success']:
    for result in simulation_result['results']:
        print(f"Action {result['action_name']}: {result['decision']}")

# Analizar política existente
analysis_result = manager.analyze_policy_permissions(
    policy_arn='arn:aws:iam::123456789012:policy/webapp-developer-policy'
)

if analysis_result['success']:
    analysis = analysis_result['analysis']
    print(f"Risk Level: {analysis['risk_level']}")
    print(f"Actions Allowed: {len(analysis['actions_allowed'])}")
    print(f"Wildcard Resources: {analysis['wildcard_resources']}")
```

## Configuración con AWS CLI

### **Crear y Gestionar Políticas**
```bash
# Crear política
aws iam create-policy \
  --policy-name my-developer-policy \
  --policy-document file://policy.json \
  --description "Developer policy for web application" \
  --tags Key=Project,Value=mywebapp Key=Environment,Value=development

# Obtener política
aws iam get-policy \
  --policy-arn arn:aws:iam::123456789012:policy/my-developer-policy

# Listar políticas
aws iam list-policies \
  --scope Local \
  --max-items 100

# Asociar política a usuario
aws iam attach-user-policy \
  --user-name developer \
  --policy-arn arn:aws:iam::123456789012:policy/my-developer-policy

# Simular política
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:user/developer \
  --action-names ec2:StartInstances s3:GetObject \
  --resource-arns arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0

# Actualizar política
aws iam create-policy-version \
  --policy-arn arn:aws:iam::123456789012:policy/my-developer-policy \
  --policy-document file://updated-policy.json \
  --set-as-default
```

## Best Practices

### **1. Principio de Menor Privilegio**
- Solo conceder permisos necesarios
- Usar recursos específicos en lugar de wildcards
- Revisar permisos regularmente

### **2. Organización**
- Usar naming conventions consistentes
- Agrupar políticas por proyecto/rol
- Documentar propósito de cada política

### **3. Gestión**
- Usar políticas gestionadas cuando sea posible
- Evitar políticas inline para permisos reutilizables
- Implementar versionado de políticas

### **4. Seguridad**
- Usar condiciones para restricciones adicionales
- Implementar MFA para acciones sensibles
- Monitorear uso de políticas

## Troubleshooting

### **Problemas Comunes**
1. **Acceso denegado**: Verificar política y condiciones
2. **Sintaxis JSON inválida**: Validar documento de política
3. **Recursos no encontrados**: Verificar ARNs correctos
4. **Permisos insuficientes**: Revisar políticas asignadas

### **Comandos de Diagnóstico**
```bash
# Validar política JSON
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:user/testuser \
  --action-names s3:GetObject \
  --resource-arns arn:aws:s3:::test-bucket/*

# Verificar políticas asociadas
aws iam list-attached-user-policies \
  --user-name testuser

# Verificar políticas de rol
aws iam list-attached-role-policies \
  --role-name testrole

# Analizar políticas con IAM Access Analyzer
aws accessanalyzer analyze-policy \
  --policy-document file://policy.json
```

## Monitoreo

### **CloudTrail**
- Auditoría de cambios en políticas
- Registro de accesos denegados
- Monitoreo de acciones sensibles

### **IAM Access Analyzer**
- Análisis de permisos
- Detección de acceso no utilizado
- Recomendaciones de optimización

### **Herramientas de Terceros**
- AWS IAM Identity Center
- CloudFormation para políticas
- Terraform para gestión de IAM

# AWS Compliance Guardrails

## Definición

AWS Compliance Guardrails son políticas y controles automatizados que aseguran el cumplimiento normativo y las mejores prácticas de seguridad en tu infraestructura AWS. Estos guardrails ayudan a prevenir configuraciones no conformes, detectar desviaciones de políticas y mantener el cumplimiento continuo de estándares regulatorios.

## Tipos de Guardrails

### **1. Preventive Guardrails**
- **Bloquean acciones** que violan políticas
- **Actúan en tiempo real** antes de ejecutar
- **Previenen problemas** antes de que ocurran
- **Ejemplos**: Restricciones de creación de recursos, validación de configuraciones

### **2. Detective Guardrails**
- **Detectan violaciones** después de que ocurren
- **Generan alertas** y reportes
- **Permiten corrección** post-facto
- **Ejemplos**: Detección de recursos no etiquetados, configuraciones inseguras

### **3. Responsive Guardrails**
- **Corrigen automáticamente** violaciones detectadas
- **Ejecutan acciones** remediadoras
- **Restauran cumplimiento** automáticamente
- **Ejemplos**: Aplicar tags, eliminar recursos no conformes

## Servicios de Compliance

### **1. AWS Organizations Service Control Policies (SCPs)**
- **Control a nivel organizacional**
- **Restricciones de servicio**
- **Límites de permisos**
- **Jerarquía de políticas**

### **2. AWS Config Rules**
- **Validación de configuraciones**
- **Evaluación de cumplimiento**
- **Reglas personalizadas**
- **Remediación automática**

### **3. AWS Control Tower**
- **Landing zone gestionada**
- **Guardrails predefinidos**
- **Blueprints de cumplimiento**
- **Gobernanza centralizada**

### **4. AWS Audit Manager**
- **Auditorías centralizadas**
- **Evidencia automática**
- **Frameworks normativos**
- **Reportes de cumplimiento**

## Configuración de Compliance Guardrails

### **Gestión Integral de Guardrails**
```python
import boto3
import json
from datetime import datetime, timedelta

class ComplianceGuardrailsManager:
    def __init__(self, region='us-east-1'):
        self.organizations = boto3.client('organizations')
        self.config = boto3.client('config', region_name=region)
        self.controltower = boto3.client('controltower', region_name=region)
        self.audit = boto3.client('auditmanager', region_name=region)
        self.securityhub = boto3.client('securityhub', region_name=region)
        self.region = region
    
    def setup_comprehensive_guardrails(self, organization_id, compliance_frameworks):
        """Configurar guardrails comprehensivos"""
        
        try:
            guardrails_setup = {
                'service_control_policies': {},
                'config_rules': {},
                'control_tower': {},
                'audit_frameworks': {},
                'security_standards': {}
            }
            
            # 1. Configurar Service Control Policies
            scp_result = self._setup_service_control_policies(
                organization_id, compliance_frameworks
            )
            guardrails_setup['service_control_policies'] = scp_result
            
            # 2. Configurar AWS Config Rules
            config_result = self._setup_config_rules(compliance_frameworks)
            guardrails_setup['config_rules'] = config_result
            
            # 3. Configurar Control Tower Guardrails
            ct_result = self._setup_control_tower_guardrails(compliance_frameworks)
            guardrails_setup['control_tower'] = ct_result
            
            # 4. Configurar Audit Manager Frameworks
            audit_result = self._setup_audit_frameworks(compliance_frameworks)
            guardrails_setup['audit_frameworks'] = audit_result
            
            # 5. Configurar Security Hub Standards
            security_result = self._setup_security_standards(compliance_frameworks)
            guardrails_setup['security_standards'] = security_result
            
            return {
                'success': True,
                'guardrails_setup': guardrails_setup,
                'organization_id': organization_id,
                'compliance_frameworks': compliance_frameworks
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _setup_service_control_policies(self, organization_id, frameworks):
        """Configurar Service Control Policies"""
        
        try:
            scp_setup = {
                'policies_created': [],
                'policies_attached': []
            }
            
            # Crear SCPs base según frameworks
            base_scps = self._get_base_service_control_policies(frameworks)
            
            for scp in base_scps:
                try:
                    # Crear política
                    response = self.organizations.create_policy(
                        Content=json.dumps(scp['content']),
                        Description=scp['description'],
                        Name=scp['name'],
                        Type='SERVICE_CONTROL_POLICY',
                        Tags=[
                            {'Key': 'Framework', 'Value': scp['framework']},
                            {'Key': 'Type', 'Value': scp['type']}
                        ]
                    )
                    
                    policy_id = response['Policy']['PolicySummary']['Id']
                    
                    # Adjuntar a raíz de organización
                    try:
                        root_id = self._get_organization_root_id(organization_id)
                        self.organizations.attach_policy(
                            PolicyId=policy_id,
                            TargetId=root_id
                        )
                        
                        scp_setup['policies_attached'].append({
                            'policy_id': policy_id,
                            'name': scp['name'],
                            'framework': scp['framework']
                        })
                        
                    except Exception as e:
                        pass
                    
                    scp_setup['policies_created'].append({
                        'policy_id': policy_id,
                        'name': scp['name'],
                        'framework': scp['framework']
                    })
                    
                except Exception as e:
                    continue
            
            return {
                'success': True,
                'setup': scp_setup
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_base_service_control_policies(self, frameworks):
        """Obtener políticas SCP base según frameworks"""
        
        policies = []
        
        # Política de restricción de regiones (común a todos)
        if any(framework in ['SOC2', 'PCI-DSS', 'HIPAA'] for framework in frameworks):
            policies.append({
                'name': 'RestrictRegions',
                'description': 'Restrict access to specific regions',
                'framework': 'Common',
                'type': 'Preventive',
                'content': {
                    'Version': '2012-10-17',
                    'Statement': [
                        {
                            'Sid': 'DenyRegions',
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
            })
        
        # Política de restricción de servicios (PCI-DSS)
        if 'PCI-DSS' in frameworks:
            policies.append({
                'name': 'PCI-DSS-ServiceRestrictions',
                'description': 'Restrict services not compliant with PCI-DSS',
                'framework': 'PCI-DSS',
                'type': 'Preventive',
                'content': {
                    'Version': '2012-10-17',
                    'Statement': [
                        {
                            'Sid': 'DenyNonCompliantServices',
                            'Effect': 'Deny',
                            'Action': [
                                'aws-marketplace:*',
                                'aws-portal:*',
                                'iam:CreateServiceLinkedRole'
                            ],
                            'Resource': '*'
                        }
                    ]
                }
            })
        
        # Política de encriptación requerida (HIPAA)
        if 'HIPAA' in frameworks:
            policies.append({
                'name': 'HIPAA-EncryptionRequired',
                'description': 'Require encryption for all storage operations',
                'framework': 'HIPAA',
                'type': 'Preventive',
                'content': {
                    'Version': '2012-10-17',
                    'Statement': [
                        {
                            'Sid': 'DenyUnencryptedStorage',
                            'Effect': 'Deny',
                            'Action': [
                                's3:PutObject',
                                's3:CreateBucket',
                                'rds:CreateDBInstance',
                                'ebs:CreateVolume'
                            ],
                            'Resource': '*',
                            'Condition': {
                                'StringNotEquals': {
                                    's3:x-amz-server-side-encryption': [
                                        'AES256',
                                        'aws:kms'
                                    ],
                                    'rds:StorageEncrypted': 'true',
                                    'kms:EncryptionContext': '*'
                                }
                            }
                        }
                    ]
                }
            })
        
        # Política de MFA requerido (SOC2)
        if 'SOC2' in frameworks:
            policies.append({
                'name': 'SOC2-MFARequired',
                'description': 'Require MFA for privileged operations',
                'framework': 'SOC2',
                'type': 'Preventive',
                'content': {
                    'Version': '2012-10-17',
                    'Statement': [
                        {
                            'Sid': 'DenyWithoutMFA',
                            'Effect': 'Deny',
                            'Action': [
                                'iam:CreateUser',
                                'iam:CreateRole',
                                'iam:AttachUserPolicy',
                                'iam:AttachRolePolicy'
                            ],
                            'Resource': '*',
                            'Condition': {
                                'BoolIfExists': {
                                    'aws:MultiFactorAuthPresent': 'false'
                                }
                            }
                        }
                    ]
                }
            })
        
        return policies
    
    def _setup_config_rules(self, frameworks):
        """Configurar reglas de AWS Config"""
        
        try:
            config_setup = {
                'rules_created': [],
                'compliance_packs': []
            }
            
            # Reglas base según frameworks
            base_rules = self._get_base_config_rules(frameworks)
            
            for rule in base_rules:
                try:
                    # Crear regla de configuración
                    rule_params = {
                        'ConfigRuleName': rule['name'],
                        'Description': rule['description'],
                        'Source': {
                            'Owner': 'AWS' if rule['source'] == 'managed' else 'CUSTOM_LAMBDA',
                            'SourceIdentifier': rule['identifier']
                        },
                        'Scope': rule.get('scope', {}),
                        'InputParameters': rule.get('parameters', {}),
                        'MaximumExecutionFrequency': rule.get('frequency', 'TwentyFour_Hours'),
                        'ConfigRuleState': 'ENABLED'
                    }
                    
                    if rule['source'] == 'custom':
                        # Para reglas personalizadas, necesitaríamos el ARN de la función Lambda
                        pass
                    
                    response = self.config.put_config_rule(**rule_params)
                    
                    config_setup['rules_created'].append({
                        'rule_name': rule['name'],
                        'framework': rule['framework'],
                        'type': rule['type']
                    })
                    
                except Exception as e:
                    continue
            
            return {
                'success': True,
                'setup': config_setup
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_base_config_rules(self, frameworks):
        """Obtener reglas de Config base según frameworks"""
        
        rules = []
        
        # Reglas comunes a todos los frameworks
        common_rules = [
            {
                'name': 'required-tags',
                'description': 'Ensure all resources have required tags',
                'framework': 'Common',
                'type': 'Detective',
                'source': 'managed',
                'identifier': 'REQUIRED_TAGS',
                'parameters': '{"tag1Key": "Environment", "tag2Key": "Project"}'
            },
            {
                'name': 'iam-root-access-key-check',
                'description': 'Check if root user has access keys',
                'framework': 'Common',
                'type': 'Detective',
                'source': 'managed',
                'identifier': 'IAM_ROOT_ACCESS_KEY_CHECK'
            },
            {
                'name': 'cloudtrail-enabled',
                'description': 'Ensure CloudTrail is enabled',
                'framework': 'Common',
                'type': 'Detective',
                'source': 'managed',
                'identifier': 'CLOUD_TRAIL_ENABLED'
            }
        ]
        
        rules.extend(common_rules)
        
        # Reglas específicas de PCI-DSS
        if 'PCI-DSS' in frameworks:
            pci_rules = [
                {
                    'name': 's3-bucket-public-write-prohibited',
                    'description': 'Ensure S3 buckets are not publicly writable',
                    'framework': 'PCI-DSS',
                    'type': 'Preventive',
                    'source': 'managed',
                    'identifier': 'S3_BUCKET_PUBLIC_WRITE_PROHIBITED'
                },
                {
                    'name': 'rds-storage-encrypted',
                    'description': 'Ensure RDS storage is encrypted',
                    'framework': 'PCI-DSS',
                    'type': 'Detective',
                    'source': 'managed',
                    'identifier': 'RDS_STORAGE_ENCRYPTED'
                },
                {
                    'name': 'vpc-sg-open-only-to-authorized-tcp-ports',
                    'description': 'Ensure security groups allow only authorized TCP ports',
                    'framework': 'PCI-DSS',
                    'type': 'Detective',
                    'source': 'managed',
                    'identifier': 'VPC_SG_OPEN_ONLY_TO_AUTHORIZED_TCP_PORTS'
                }
            ]
            rules.extend(pci_rules)
        
        # Reglas específicas de HIPAA
        if 'HIPAA' in frameworks:
            hipaa_rules = [
                {
                    'name': 's3-bucket-server-side-encryption-enabled',
                    'description': 'Ensure S3 buckets have server-side encryption enabled',
                    'framework': 'HIPAA',
                    'type': 'Detective',
                    'source': 'managed',
                    'identifier': 'S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED'
                },
                {
                    'name': 'ebs-optimized-instance',
                    'description': 'Ensure instances are EBS-optimized for performance',
                    'framework': 'HIPAA',
                    'type': 'Detective',
                    'source': 'managed',
                    'identifier': 'EBS_OPTIMIZED_INSTANCE'
                },
                {
                    'name': 'iam-policy-no-statements-with-admin-access',
                    'description': 'Ensure IAM policies do not allow admin access',
                    'framework': 'HIPAA',
                    'type': 'Detective',
                    'source': 'managed',
                    'identifier': 'IAM_POLICY_NO_STATEMENTS_WITH_ADMIN_ACCESS'
                }
            ]
            rules.extend(hipaa_rules)
        
        # Reglas específicas de SOC2
        if 'SOC2' in frameworks:
            soc2_rules = [
                {
                    'name': 'cmk-backup-key-enabled',
                    'description': 'Ensure CMK backup key is enabled',
                    'framework': 'SOC2',
                    'type': 'Detective',
                    'source': 'managed',
                    'identifier': 'CMK_BACKUP_KEY_ENABLED'
                },
                {
                    'name': 'iam-password-policy',
                    'description': 'Ensure IAM password policy meets requirements',
                    'framework': 'SOC2',
                    'type': 'Detective',
                    'source': 'managed',
                    'identifier': 'IAM_PASSWORD_POLICY'
                },
                {
                    'name': 'multi-region-cloudtrail-enabled',
                    'description': 'Ensure CloudTrail is enabled in all regions',
                    'framework': 'SOC2',
                    'type': 'Detective',
                    'source': 'managed',
                    'identifier': 'MULTI_REGION_CLOUD_TRAIL_ENABLED'
                }
            ]
            rules.extend(soc2_rules)
        
        return rules
    
    def _setup_control_tower_guardrails(self, frameworks):
        """Configurar guardrails de Control Tower"""
        
        try:
            ct_setup = {
                'guardrails_enabled': [],
                'blueprints_applied': []
            }
            
            # Guardrails de Control Tower según frameworks
            ct_guardrails = self._get_control_tower_guardrails(frameworks)
            
            for guardrail in ct_guardrails:
                try:
                    # Habilitar guardrail
                    self.controltower.update_enabled_control(
                        ControlIdentifier=guardrail['identifier'],
                        ControlOperation='ENABLE'
                    )
                    
                    ct_setup['guardrails_enabled'].append({
                        'identifier': guardrail['identifier'],
                        'name': guardrail['name'],
                        'framework': guardrail['framework'],
                        'type': guardrail['type']
                    })
                    
                except Exception as e:
                    continue
            
            return {
                'success': True,
                'setup': ct_setup
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_control_tower_guardrails(self, frameworks):
        """Obtener guardrails de Control Tower según frameworks"""
        
        guardrails = []
        
        # Guardrails comunes
        common_guardrails = [
            {
                'identifier': 'AWS-GR_RESTRICTED_IAM_ACTIONS',
                'name': 'Restricted IAM Actions',
                'framework': 'Common',
                'type': 'Preventive'
            },
            {
                'identifier': 'AWS-GR_RESTRICTED_S3_BUCKETS',
                'name': 'Restricted S3 Buckets',
                'framework': 'Common',
                'type': 'Preventive'
            }
        ]
        
        guardrails.extend(common_guardrails)
        
        # Guardrails específicos por framework
        if 'PCI-DSS' in frameworks:
            guardrails.extend([
                {
                    'identifier': 'AWS-GR_ENCRYPTED_VOLUMES',
                    'name': 'Encrypted Volumes',
                    'framework': 'PCI-DSS',
                    'type': 'Detective'
                },
                {
                    'identifier': 'AWS-GR_PUBLIC_S3_BUCKETS',
                    'name': 'Public S3 Buckets',
                    'framework': 'PCI-DSS',
                    'type': 'Detective'
                }
            ])
        
        if 'HIPAA' in frameworks:
            guardrails.extend([
                {
                    'identifier': 'AWS-GR_ENCRYPTED_EBS_VOLUMES',
                    'name': 'Encrypted EBS Volumes',
                    'framework': 'HIPAA',
                    'type': 'Detective'
                },
                {
                    'identifier': 'AWS-GR_RDS_ENCRYPTED_STORAGE',
                    'name': 'RDS Encrypted Storage',
                    'framework': 'HIPAA',
                    'type': 'Detective'
                }
            ])
        
        if 'SOC2' in frameworks:
            guardrails.extend([
                {
                    'identifier': 'AWS-GR_CLOUD_TRAIL_ENABLED',
                    'name': 'CloudTrail Enabled',
                    'framework': 'SOC2',
                    'type': 'Detective'
                },
                {
                    'identifier': 'AWS-GR_IAM_USER_MFA',
                    'name': 'IAM User MFA',
                    'framework': 'SOC2',
                    'type': 'Detective'
                }
            ])
        
        return guardrails
    
    def _setup_audit_frameworks(self, frameworks):
        """Configurar frameworks de auditoría"""
        
        try:
            audit_setup = {
                'frameworks_created': [],
                'assessments_setup': []
            }
            
            for framework in frameworks:
                try:
                    # Crear framework de auditoría
                    framework_name = f'{framework}-compliance-framework'
                    
                    controls = []
                    if framework == 'PCI-DSS':
                        controls = self._get_pci_dss_audit_controls()
                    elif framework == 'SOC2':
                        controls = self._get_soc2_audit_controls()
                    elif framework == 'HIPAA':
                        controls = self._get_hipaa_audit_controls()
                    
                    response = self.audit.create_assessment_framework(
                        Name=framework_name,
                        Description=f'Compliance framework for {framework}',
                        ComplianceType='Custom',
                        Controls=controls,
                        Tags=[
                            {'Key': 'Framework', 'Value': framework}
                        ]
                    )
                    
                    audit_setup['frameworks_created'].append({
                        'framework_name': framework_name,
                        'framework_arn': response['Framework']['Arn'],
                        'controls_count': len(controls)
                    })
                    
                except Exception as e:
                    continue
            
            return {
                'success': True,
                'setup': audit_setup
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _setup_security_standards(self, frameworks):
        """Configurar estándares de seguridad en Security Hub"""
        
        try:
            security_setup = {
                'standards_enabled': [],
                'controls_subscribed': 0
            }
            
            # Mapeo de frameworks a estándares de Security Hub
            framework_mapping = {
                'PCI-DSS': 'arn:aws:securityhub:::security-standard/pci-dss',
                'SOC2': 'arn:aws:securityhub:::security-standard/SOC2',
                'HIPAA': 'arn:aws:securityhub:::security-standard/hipaa',
                'CIS': 'arn:aws:securityhub:::security-standard/cis-aws-foundations-benchmark'
            }
            
            for framework in frameworks:
                if framework in framework_mapping:
                    try:
                        standard_arn = framework_mapping[framework]
                        
                        self.securityhub.subscribe_to_security_hub_standard(
                            StandardsArn=standard_arn
                        )
                        
                        security_setup['standards_enabled'].append({
                            'framework': framework,
                            'standard_arn': standard_arn
                        })
                        
                        security_setup['controls_subscribed'] += 1
                        
                    except Exception as e:
                        continue
            
            # Habilitar AWS Foundational Security Best Practices
            try:
                self.securityhub.subscribe_to_security_hub_standard(
                    StandardsArn='arn:aws:securityhub:::security-standard/aws-foundational-security-best-practices'
                )
                
                security_setup['standards_enabled'].append({
                    'framework': 'AWS-Foundational',
                    'standard_arn': 'arn:aws:securityhub:::security-standard/aws-foundational-security-best-practices'
                })
                
                security_setup['controls_subscribed'] += 1
                
            except Exception:
                pass
            
            return {
                'success': True,
                'setup': security_setup
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_organization_root_id(self, organization_id):
        """Obtener ID de la raíz de la organización"""
        
        try:
            response = self.organizations.list_roots()
            for root in response['Roots']:
                if root['Id'] != organization_id:
                    return root['Id']
            return None
        except Exception:
            return None
    
    def _get_pci_dss_audit_controls(self):
        """Obtener controles de auditoría PCI-DSS"""
        
        return [
            {
                'Id': 'PCI-1.1.1',
                'Name': 'Network Security Control',
                'Description': 'A formal process for approving and testing all network connections',
                'TestingInformation': 'Review network connection approval process',
                'Source': 'PCI-DSS',
                'ControlMappingSources': [
                    {
                        'SourceName': 'PCI DSS v3.2.1',
                        'SourceSetUpTime': datetime.utcnow().isoformat()
                    }
                ]
            },
            {
                'Id': 'PCI-2.2.1',
                'Name': 'Configuration Standards',
                'Description': 'Develop configuration standards for all system components',
                'TestingInformation': 'Review configuration standards documentation',
                'Source': 'PCI-DSS',
                'ControlMappingSources': [
                    {
                        'SourceName': 'PCI DSS v3.2.1',
                        'SourceSetUpTime': datetime.utcnow().isoformat()
                    }
                ]
            }
        ]
    
    def _get_soc2_audit_controls(self):
        """Obtener controles de auditoría SOC2"""
        
        return [
            {
                'Id': 'CC1.1',
                'Name': 'Control Environment',
                'Description': 'The entity defines and documents its control environment',
                'TestingInformation': 'Review control environment documentation',
                'Source': 'SOC2',
                'ControlMappingSources': [
                    {
                        'SourceName': 'SOC 2 Type II',
                        'SourceSetUpTime': datetime.utcnow().isoformat()
                    }
                ]
            },
            {
                'Id': 'CC2.1',
                'Name': 'Communication',
                'Description': 'The entity communicates with required parties',
                'TestingInformation': 'Review communication procedures',
                'Source': 'SOC2',
                'ControlMappingSources': [
                    {
                        'SourceName': 'SOC 2 Type II',
                        'SourceSetUpTime': datetime.utcnow().isoformat()
                    }
                ]
            }
        ]
    
    def _get_hipaa_audit_controls(self):
        """Obtener controles de auditoría HIPAA"""
        
        return [
            {
                'Id': 'HIPAA-164.308(a)(1)',
                'Name': 'Security Management Process',
                'Description': 'Implement policies and procedures to prevent, detect, contain, and correct security violations',
                'TestingInformation': 'Review security management policies',
                'Source': 'HIPAA',
                'ControlMappingSources': [
                    {
                        'SourceName': 'HIPAA Security Rule',
                        'SourceSetUpTime': datetime.utcnow().isoformat()
                    }
                ]
            },
            {
                'Id': 'HIPAA-164.312(a)(1)',
                'Name': 'Access Control',
                'Description': 'Implement technical policies and procedures for electronic information access',
                'TestingInformation': 'Review access control implementation',
                'Source': 'HIPAA',
                'ControlMappingSources': [
                    {
                        'SourceName': 'HIPAA Security Rule',
                        'SourceSetUpTime': datetime.utcnow().isoformat()
                    }
                ]
            }
        ]
    
    def assess_compliance_status(self, frameworks):
        """Evaluar estado de cumplimiento"""
        
        try:
            compliance_assessment = {
                'assessment_date': datetime.utcnow().isoformat(),
                'frameworks': {},
                'overall_score': 0,
                'recommendations': []
            }
            
            total_score = 0
            framework_count = len(frameworks)
            
            for framework in frameworks:
                framework_assessment = {
                    'name': framework,
                    'score': 0,
                    'compliant_resources': 0,
                    'non_compliant_resources': 0,
                    'findings': []
                }
                
                # Evaluar cumplimiento en Security Hub
                try:
                    if framework == 'PCI-DSS':
                        standard_arn = 'arn:aws:securityhub:::security-standard/pci-dss'
                    elif framework == 'SOC2':
                        standard_arn = 'arn:aws:securityhub:::security-standard/SOC2'
                    elif framework == 'HIPAA':
                        standard_arn = 'arn:aws:securityhub:::security-standard/hipaa'
                    else:
                        standard_arn = 'arn:aws:securityhub:::security-standard/aws-foundational-security-best-practices'
                    
                    # Obtener resumen de cumplimiento
                    summary_response = self.securityhub.get_standards_control_association_summary(
                        SecurityStandardArn=standard_arn
                    )
                    
                    for control_summary in summary_response['StandardsControlAssociationSummaries']:
                        if control_summary['ControlStatus'] == 'COMPLIANT':
                            framework_assessment['compliant_resources'] += 1
                        elif control_summary['ControlStatus'] == 'NON_COMPLIANT':
                            framework_assessment['non_compliant_resources'] += 1
                            framework_assessment['findings'].append({
                                'control_id': control_summary['ControlId'],
                                'status': control_summary['ControlStatus'],
                                'reason': control_summary.get('StatusReason', 'Unknown')
                            })
                    
                    # Calcular score del framework
                    total_controls = framework_assessment['compliant_resources'] + framework_assessment['non_compliant_resources']
                    if total_controls > 0:
                        framework_assessment['score'] = (framework_assessment['compliant_resources'] / total_controls) * 100
                        total_score += framework_assessment['score']
                    
                except Exception:
                    framework_assessment['score'] = 50  # Default score si no se puede evaluar
                    total_score += framework_assessment['score']
                
                compliance_assessment['frameworks'][framework] = framework_assessment
            
            # Calcular score general
            if framework_count > 0:
                compliance_assessment['overall_score'] = total_score / framework_count
            
            # Generar recomendaciones
            compliance_assessment['recommendations'] = self._generate_compliance_recommendations(
                compliance_assessment['frameworks']
            )
            
            return {
                'success': True,
                'assessment': compliance_assessment
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generate_compliance_recommendations(self, frameworks_assessment):
        """Generar recomendaciones basadas en evaluación de cumplimiento"""
        
        recommendations = []
        
        for framework, assessment in frameworks_assessment.items():
            if assessment['score'] < 80:
                recommendations.append({
                    'priority': 'HIGH',
                    'framework': framework,
                    'title': f'Low Compliance Score for {framework}',
                    'description': f'Current compliance score is {assessment["score"]:.1f}%',
                    'action': 'Review and remediate non-compliant resources',
                    'affected_controls': len(assessment['findings'])
                })
            
            if assessment['non_compliant_resources'] > 10:
                recommendations.append({
                    'priority': 'MEDIUM',
                    'framework': framework,
                    'title': f'Multiple Non-Compliant Resources in {framework}',
                    'description': f'Found {assessment["non_compliant_resources"]} non-compliant resources',
                    'action': 'Prioritize remediation of high-impact findings'
                })
        
        # Recomendaciones generales
        recommendations.extend([
            {
                'priority': 'LOW',
                'framework': 'General',
                'title': 'Regular Compliance Monitoring',
                'description': 'Establish regular compliance monitoring and reporting',
                'action': 'Schedule monthly compliance reviews and quarterly assessments'
            },
            {
                'priority': 'LOW',
                'framework': 'General',
                'title': 'Automated Remediation',
                'description': 'Implement automated remediation for common compliance issues',
                'action': 'Configure AWS Config remediation actions for non-compliant resources'
            }
        ])
        
        return recommendations
```

## Casos de Uso

### **1. Configurar Guardrails para PCI-DSS**
```python
# Ejemplo: Configurar guardrails para cumplimiento PCI-DSS
manager = ComplianceGuardrailsManager('us-east-1')

guardrails_result = manager.setup_comprehensive_guardrails(
    organization_id='o-123456789012',
    compliance_frameworks=['PCI-DSS', 'SOC2']
)

if guardrails_result['success']:
    setup = guardrails_result['guardrails_setup']
    print(f"Service Control Policies: {len(setup['service_control_policies'].get('setup', {}).get('policies_created', []))}")
    print(f"Config Rules: {len(setup['config_rules'].get('setup', {}).get('rules_created', []))}")
    print(f"Control Tower Guardrails: {len(setup['control_tower'].get('setup', {}).get('guardrails_enabled', []))}")
```

### **2. Evaluar Cumplimiento**
```python
# Ejemplo: Evaluar estado de cumplimiento
assessment_result = manager.assess_compliance_status(['PCI-DSS', 'SOC2', 'HIPAA'])

if assessment_result['success']:
    assessment = assessment_result['assessment']
    print(f"Overall Compliance Score: {assessment['overall_score']:.1f}%")
    
    for framework, framework_assessment in assessment['frameworks'].items():
        print(f"{framework}: {framework_assessment['score']:.1f}% ({framework_assessment['compliant_resources']} compliant, {framework_assessment['non_compliant_resources']} non-compliant)")
    
    print(f"Recommendations: {len(assessment['recommendations'])}")
```

## Configuración con AWS CLI

### **Configurar Service Control Policies**
```bash
# Crear SCP
aws organizations create-policy \
  --content file://scp-policy.json \
  --description "Restrict regions" \
  --name RestrictRegions \
  --type SERVICE_CONTROL_POLICY

# Adjuntar SCP a raíz
aws organizations attach-policy \
  --policy-id p-1234567890abcdef0 \
  --target-id r-1234567890abcdef0

# Listar SCPs
aws organizations list-policies --filter Key=TYPE,Value=SERVICE_CONTROL_POLICY
```

### **Configurar AWS Config Rules**
```bash
# Crear regla de Config
aws configservice put-config-rule \
  --config-rule-name required-tags \
  --description "Ensure required tags" \
  --source Owner=AWS,SourceIdentifier=REQUIRED_TAGS \
  --input-Parameters '{"tag1Key": "Environment", "tag2Key": "Project"}'

# Obtener estado de cumplimiento
aws configservice get-compliance-summary-by-config-rule

# Evaluar cumplimiento
aws configservice start-evaluations
```

### **Configurar Control Tower**
```bash
# Habilitar guardrail
aws controltower update-enabled-control \
  --control-identifier AWS-GR_ENCRYPTED_VOLUMES \
  --control-operation ENABLE

# Listar guardrails
aws controltower list-enabled-controls
```

## Best Practices

### **1. Diseño de Guardrails**
- Implementar defensa en profundidad
- Usar preventivo, detective y responsive
- Personalizar según necesidades específicas
- Documentar propósito y alcance

### **2. Gestión**
- Revisar y actualizar regularmente
- Monitorear efectividad
- Automatizar donde sea posible
- Mantener documentación actualizada

### **3. Cumplimiento**
- Mapear controles a requisitos normativos
- Implementar evidencia automática
- Realizar auditorías regulares
- Mantener registros de cumplimiento

### **4. Monitoreo**
- Configurar alertas de violaciones
- Dashboard de cumplimiento
- Reportes automáticos
- Análisis de tendencias

## Costos

### **AWS Organizations**
- **Gratis**: SCPs y organizaciones
- **Sin costo adicional**: Por uso de guardrails

### **AWS Config**
- **$0.003 por hora**: Por regla de configuración
- **$0.001 por evaluación**: Por evaluación de regla
- **Gratis**: Primeras 10 reglas

### **Control Tower**
- **$0.24 por governed account**: Por mes
- **$6.00 por guardrail**: Por guardrail activo
- **$0.10 por managed account**: Por mes

### **Audit Manager**
- **$0.10 por assessment**: Por evaluación
- **$0.50 por framework**: Por mes
- **$0.20 por evidence collection**: Por mes

## Troubleshooting

### **Problemas Comunes**
1. **SCP no se aplica**: Verificar jerarquía y adjuntos
2. **Config Rule no evalúa**: Revisar permisos y configuración
3. **Guardrail no funciona**: Validar compatibilidad de región
4. **Audit Manager errores**: Verificar permisos y configuración

### **Comandos de Diagnóstico**
```bash
# Verificar SCP
aws organizations list-policies-for-target --target-id r-1234567890abcdef0

# Verificar Config Rules
aws configservice describe-config-rules --config-rule-names required-tags

# Verificar Control Tower
aws controltower get-control-operation --control-identifier AWS-GR_ENCRYPTED_VOLUMES

# Verificar Audit Manager
aws auditmanager list-assessments
```

# AWS Penetration Testing

## Definición

Las pruebas de penetración en AWS son evaluaciones de seguridad controladas que simulan ataques maliciosos para identificar vulnerabilidades en la infraestructura, aplicaciones y configuraciones de AWS. Estas pruebas son esenciales para validar la postura de seguridad y cumplir con requisitos regulatorios.

## Tipos de Pruebas de Penetración

### **1. Pruebas de Infraestructura**
- **Network Scanning**: Descubrimiento de puertos y servicios
- **Vulnerability Assessment**: Identificación de vulnerabilidades conocidas
- **Configuration Review**: Análisis de configuraciones inseguras
- **Cloud Security Posture Assessment**: Evaluación general de seguridad

### **2. Pruebas de Aplicaciones**
- **Web Application Testing**: Pruebas OWASP Top 10
- **API Security Testing**: Evaluación de endpoints de API
- **Mobile Application Testing**: Pruebas de aplicaciones móviles
- **Container Security**: Análisis de contenedores Docker/ECS

### **3. Pruebas de Identidad y Acceso**
- **IAM Policy Testing**: Evaluación de permisos excesivos
- **Credential Stuffing**: Pruebas de credenciales débiles
- **Privilege Escalation**: Intentos de escalada de privilegios
- **MFA Bypass Testing**: Evaluación de controles MFA

### **4. Pruebas de Datos**
- **Data Classification Testing**: Verificación de clasificación de datos
- **Encryption Validation**: Validación de controles de encriptación
- **Data Access Testing**: Pruebas de acceso no autorizado
- **Backup Security Testing**: Evaluación de seguridad de backups

## Política de Pruebas de Penetración de AWS

### **Autorización Requerida**
AWS requiere autorización explícita para realizar pruebas de penetración:
- **Notificación previa**: Informar a AWS Security
- **Scope definido**: Delimitar recursos a probar
- **Tiempo limitado**: Especificar duración de las pruebas
- **Contacto técnico**: Proporcionar información de contacto

### **Servicios No Permitidos**
AWS prohíbe pruebas en ciertos servicios:
- **AWS Infrastructure**: Infraestructura subyacente de AWS
- **Physical Security**: Seguridad física de data centers
- **Service Endpoints**: Endpoints de servicios globales
- **Other Customers**: Recursos de otros clientes

## Herramientas y Frameworks

### **1. Herramientas de Escaneo**
- **Nmap**: Escaneo de puertos y servicios
- **Nessus**: Evaluación de vulnerabilidades
- **OpenVAS**: Escáner de vulnerabilidades open source
- **Qualys**: Evaluación de vulnerabilidades en la nube

### **2. Frameworks de Pruebas**
- **Metasploit**: Framework de explotación
- **Burp Suite**: Pruebas de aplicaciones web
- **OWASP ZAP**: Pruebas de seguridad de aplicaciones
- **Kali Linux**: Distribución especializada en seguridad

### **3. Herramientas Específicas de AWS**
- **Prowler**: Evaluación de seguridad de AWS
- **ScoutSuite**: Auditoría de configuraciones de nube
- **CloudMapper**: Mapeo de recursos AWS
- **CloudCustodian**: Políticas de seguridad automatizadas

## Configuración de Pruebas de Penetración

### **Gestión de Pruebas de Penetración**
```python
import boto3
import json
import subprocess
import time
from datetime import datetime, timedelta

class PenetrationTestingManager:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.securityhub = boto3.client('securityhub', region_name=region)
        self.guardduty = boto3.client('guardduty', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.region = region
    
    def setup_pentesting_environment(self, project_name, environment, target_resources):
        """Configurar entorno de pruebas de penetración"""
        
        try:
            pentesting_setup = {
                'pentesting_account': {},
                'security_groups': {},
                'iam_roles': {},
                'monitoring': {},
                'tools': {}
            }
            
            # 1. Crear security group para pentesting
            sg_result = self._create_pentesting_security_group(
                project_name, environment
            )
            pentesting_setup['security_groups'] = sg_result
            
            # 2. Crear rol para herramientas de pentesting
            role_result = self._create_pentesting_role(
                project_name, environment
            )
            pentesting_setup['iam_roles'] = role_result
            
            # 3. Configurar monitoreo durante pruebas
            monitoring_result = self._setup_pentesting_monitoring(
                project_name, environment
            )
            pentesting_setup['monitoring'] = monitoring_result
            
            # 4. Desplegar herramientas de pentesting
            tools_result = self._deploy_pentesting_tools(
                project_name, environment, sg_result.get('security_group_id')
            )
            pentesting_setup['tools'] = tools_result
            
            return {
                'success': True,
                'pentesting_setup': pentesting_setup,
                'project_name': project_name,
                'environment': environment
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _create_pentesting_security_group(self, project_name, environment):
        """Crear security group para pentesting"""
        
        try:
            sg_name = f'{project_name}-{environment}-pentesting-sg'
            
            response = self.ec2.create_security_group(
                GroupName=sg_name,
                Description='Security group for penetration testing tools',
                VpcId=self._get_default_vpc_id(),
                TagSpecifications=[
                    {
                        'ResourceType': 'security-group',
                        'Tags': [
                            {'Key': 'Name', 'Value': sg_name},
                            {'Key': 'Project', 'Value': project_name},
                            {'Key': 'Environment', 'Value': environment},
                            {'Key': 'Purpose', 'Value': 'Pentesting'}
                        ]
                    }
                ]
            )
            
            sg_id = response['GroupId']
            
            # Reglas de entrada
            inbound_rules = [
                {'IpProtocol': 'tcp', 'FromPort': 22, 'ToPort': 22, 'IpRanges': [{'CidrIp': '0.0.0.0/0'}]},  # SSH
                {'IpProtocol': 'tcp', 'FromPort': 443, 'ToPort': 443, 'IpRanges': [{'CidrIp': '0.0.0.0/0'}]},  # HTTPS
                {'IpProtocol': 'tcp', 'FromPort': 80, 'ToPort': 80, 'IpRanges': [{'CidrIp': '0.0.0.0/0'}]},  # HTTP
                {'IpProtocol': 'tcp', 'FromPort': 3000, 'ToPort': 3000, 'IpRanges': [{'CidrIp': '0.0.0.0/0']}},  # Web interfaces
                {'IpProtocol': 'tcp', 'FromPort': 8080, 'ToPort': 8080, 'IpRanges': [{'CidrIp': '0.0.0.0/0']}},  # Web tools
            ]
            
            for rule in inbound_rules:
                self.ec2.authorize_security_group_ingress(
                    GroupId=sg_id,
                    IpPermissions=[rule]
                )
            
            # Reglas de salida (permitir todo)
            self.ec2.authorize_security_group_egress(
                GroupId=sg_id,
                IpPermissions=[
                    {'IpProtocol': '-1', 'FromPort': -1, 'ToPort': -1, 'IpRanges': [{'CidrIp': '0.0.0.0/0'}]}
                ]
            )
            
            return {
                'success': True,
                'security_group_id': sg_id,
                'security_group_name': sg_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _create_pentesting_role(self, project_name, environment):
        """Crear rol IAM para herramientas de pentesting"""
        
        try:
            role_name = f'{project_name}-{environment}-pentesting-role'
            
            # Política de confianza
            trust_policy = {
                'Version': '2012-10-17',
                'Statement': [
                    {
                        'Effect': 'Allow',
                        'Principal': {'Service': 'ec2.amazonaws.com'},
                        'Action': 'sts:AssumeRole'
                    }
                ]
            }
            
            response = self.iam.create_role(
                RoleName=role_name,
                AssumeRolePolicyDocument=json.dumps(trust_policy),
                Description='Role for penetration testing tools',
                Tags=[
                    {'Key': 'Project', 'Value': project_name},
                    {'Key': 'Environment', 'Value': environment},
                    {'Key': 'Purpose', 'Value': 'Pentesting'}
                ]
            )
            
            role_arn = response['Role']['Arn']
            
            # Política de permisos para pentesting
            pentesting_policy = {
                'Version': '2012-10-17',
                'Statement': [
                    {
                        'Effect': 'Allow',
                        'Action': [
                            'ec2:DescribeInstances',
                            'ec2:DescribeSecurityGroups',
                            'ec2:DescribeVpcs',
                            'ec2:DescribeSubnets',
                            'ec2:DescribeNetworkInterfaces',
                            'ec2:DescribeRouteTables',
                            'ec2:DescribeImages',
                            's3:ListBuckets',
                            's3:GetBucketLocation',
                            'iam:ListRoles',
                            'iam:ListUsers',
                            'iam:ListPolicies',
                            'rds:DescribeDBInstances',
                            'rds:DescribeDBClusters',
                            'lambda:ListFunctions',
                            'cloudformation:DescribeStacks'
                        ],
                        'Resource': '*'
                    },
                    {
                        'Effect': 'Allow',
                        'Action': [
                            'logs:CreateLogGroup',
                            'logs:CreateLogStream',
                            'logs:PutLogEvents',
                            'logs:DescribeLogGroups'
                        ],
                        'Resource': '*'
                    },
                    {
                        'Effect': 'Allow',
                        'Action': [
                            'securityhub:GetFindings',
                            'securityhub:GetSecurityControlDefinition',
                            'guardduty:GetFindings',
                            'guardduty:ListDetectors'
                        ],
                        'Resource': '*'
                    }
                ]
            }
            
            policy_name = f'{role_name}-policy'
            self.iam.put_role_policy(
                RoleName=role_name,
                PolicyName=policy_name,
                PolicyDocument=json.dumps(pentesting_policy)
            )
            
            return {
                'success': True,
                'role_name': role_name,
                'role_arn': role_arn,
                'policy_name': policy_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _setup_pentesting_monitoring(self, project_name, environment):
        """Configurar monitoreo durante pruebas"""
        
        try:
            monitoring_setup = {
                'cloudwatch_alarms': [],
                'securityhub_findings': [],
                'guardduty_enabled': False
            }
            
            # 1. Crear alarmas de CloudWatch para detectar actividad inusual
            alarm_definitions = [
                {
                    'name': f'{project_name}-{environment}-pentesting-unauthorized-access',
                    'metric': 'CPUUtilization',
                    'threshold': 80,
                    'comparison': 'GreaterThanThreshold',
                    'description': 'High CPU utilization detected during pentesting'
                },
                {
                    'name': f'{project_name}-{environment}-pentesting-network-activity',
                    'metric': 'NetworkOut',
                    'threshold': 100000000,  # 100MB
                    'comparison': 'GreaterThanThreshold',
                    'description': 'High network activity detected'
                }
            ]
            
            for alarm_def in alarm_definitions:
                try:
                    self._create_cloudwatch_alarm(
                        alarm_def['name'],
                        alarm_def['metric'],
                        alarm_def['threshold'],
                        alarm_def['comparison'],
                        alarm_def['description']
                    )
                    monitoring_setup['cloudwatch_alarms'].append(alarm_def['name'])
                except Exception:
                    pass
            
            # 2. Habilitar GuardDuty si no está activo
            try:
                detector_response = self.guardduty.list_detectors()
                if not detector_response['Detectors']:
                    detector_result = self.guardduty.create_detector(Enable=True)
                    monitoring_setup['guardduty_enabled'] = True
                else:
                    monitoring_setup['guardduty_enabled'] = True
            except Exception:
                pass
            
            # 3. Habilitar Security Hub si no está activo
            try:
                self.securityhub.enable_security_hub()
            except Exception:
                pass
            
            return {
                'success': True,
                'monitoring_setup': monitoring_setup
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _deploy_pentesting_tools(self, project_name, environment, security_group_id):
        """Desplegar herramientas de pentesting"""
        
        try:
            tools_setup = {
                'instances': [],
                'docker_containers': []
            }
            
            # 1. Lanzar instancia con herramientas de pentesting
            user_data = '''#!/bin/bash
# Update system
yum update -y

# Install basic pentesting tools
yum install -y nmap netcat telnet curl wget git

# Install Docker
yum install -y docker
service docker start
chkconfig docker on

# Pull pentesting Docker images
docker pull owasp/zap2docker-stable
docker pull citizenstig/dvwa
docker pull vulnerables/web-dvwa

# Install Python tools
yum install -y python3 python3-pip
pip3 install boto3 requests paramiko scapy

# Create pentesting directory
mkdir -p /opt/pentesting
cd /opt/pentesting

# Clone pentesting repositories
git clone https://github.com/andrew-drew-brown/prowler
git clone https://github.com/nccgroup/ScoutSuite

# Install Prowler
cd prowler
pip3 install -r requirements.txt

# Install ScoutSuite
cd ../ScoutSuite
pip3 install -r requirements.txt

# Create startup script
cat > /opt/pentesting/startup.sh << 'EOF'
#!/bin/bash
echo "Pentesting environment ready"
echo "Available tools:"
echo "- nmap: Network scanning"
echo "- docker: Container security testing"
echo "- prowler: AWS security assessment"
echo "- ScoutSuite: Cloud security assessment"
echo "- OWASP ZAP: Web application security"
EOF

chmod +x /opt/pentesting/startup.sh
/opt/pentesting/startup.sh
'''
            
            instance_response = self.ec2.run_instances(
                ImageId='ami-0c02fb55956c7d316',  # Amazon Linux 2
                InstanceType='t3.medium',
                MinCount=1,
                MaxCount=1,
                SecurityGroupIds=[security_group_id],
                UserData=user_data,
                TagSpecifications=[
                    {
                        'ResourceType': 'instance',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'{project_name}-{environment}-pentesting-instance'},
                            {'Key': 'Project', 'Value': project_name},
                            {'Key': 'Environment', 'Value': environment},
                            {'Key': 'Purpose', 'Value': 'Pentesting'}
                        ]
                    }
                ]
            )
            
            instance_id = instance_response['Instances'][0]['InstanceId']
            tools_setup['instances'].append({
                'instance_id': instance_id,
                'instance_type': 't3.medium',
                'tools': ['nmap', 'docker', 'prowler', 'scoutsuite', 'owasp-zap']
            })
            
            return {
                'success': True,
                'tools_setup': tools_setup
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def run_vulnerability_scan(self, target_resources, scan_type='basic'):
        """Ejecutar escaneo de vulnerabilidades"""
        
        try:
            scan_results = {
                'scan_id': f'scan-{int(time.time())}',
                'scan_type': scan_type,
                'target_resources': target_resources,
                'findings': [],
                'recommendations': []
            }
            
            # 1. Escaneo de red básico
            if scan_type in ['basic', 'comprehensive']:
                network_findings = self._run_network_scan(target_resources)
                scan_results['findings'].extend(network_findings)
            
            # 2. Escaneo de configuración AWS
            if scan_type in ['aws', 'comprehensive']:
                aws_findings = self._run_aws_security_scan()
                scan_results['findings'].extend(aws_findings)
            
            # 3. Escaneo de aplicaciones web
            if scan_type in ['web', 'comprehensive']:
                web_findings = self._run_web_security_scan(target_resources)
                scan_results['findings'].extend(web_findings)
            
            # 4. Generar recomendaciones
            scan_results['recommendations'] = self._generate_security_recommendations(
                scan_results['findings']
            )
            
            return {
                'success': True,
                'scan_results': scan_results
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _run_network_scan(self, target_resources):
        """Ejecutar escaneo de red"""
        
        try:
            findings = []
            
            # Escanear puertos abiertos en instancias EC2
            for resource in target_resources:
                if resource['type'] == 'ec2_instance':
                    instance_id = resource['id']
                    
                    # Obtener información de la instancia
                    try:
                        response = self.ec2.describe_instances(InstanceIds=[instance_id])
                        instance = response['Reservations'][0]['Instances'][0]
                        
                        # Analizar security groups
                        for sg in instance['SecurityGroups']:
                            sg_response = self.ec2.describe_security_groups(GroupIds=[sg['GroupId']])
                            security_group = sg_response['SecurityGroups'][0]
                            
                            # Verificar puertos abiertos
                            for rule in security_group['IpPermissions']:
                                if 'FromPort' in rule and 'ToPort' in rule:
                                    port_range = f"{rule['FromPort']}-{rule['ToPort']}"
                                    
                                    # Verificar si es un puerto de alto riesgo
                                    high_risk_ports = [22, 3389, 1433, 3306, 5432, 6379, 27017]
                                    for port in high_risk_ports:
                                        if rule['FromPort'] <= port <= rule['ToPort']:
                                            findings.append({
                                                'type': 'network',
                                                'severity': 'high',
                                                'resource': instance_id,
                                                'finding': f'High-risk port {port} open',
                                                'description': f'Port {port} is exposed to the internet',
                                                'recommendation': 'Restrict access to this port or close it if not needed'
                                            })
                    
                    except Exception:
                        continue
            
            return findings
            
        except Exception as e:
            return []
    
    def _run_aws_security_scan(self):
        """Ejecutar escaneo de seguridad AWS"""
        
        try:
            findings = []
            
            # 1. Verificar configuración de IAM
            try:
                users_response = self.iam.list_users()
                for user in users_response['Users']:
                    # Verificar si el usuario tiene MFA
                    mfa_devices = self.iam.list_mfa_devices(UserName=user['UserName'])
                    if not mfa_devices['MFADevices']:
                        findings.append({
                            'type': 'iam',
                            'severity': 'medium',
                            'resource': user['UserName'],
                            'finding': 'User without MFA',
                            'description': f'User {user["UserName"]} does not have MFA enabled',
                            'recommendation': 'Enable MFA for this user'
                        })
            except Exception:
                pass
            
            # 2. Verificar buckets S3 públicos
            try:
                buckets_response = self.s3.list_buckets()
                for bucket in buckets_response['Buckets']:
                    try:
                        acl_response = self.s3.get_bucket_acl(Bucket=bucket['Name'])
                        
                        for grant in acl_response['Grants']:
                            if 'URI' in grant.get('Grantee', {}) and 'AllUsers' in grant['Grantee']['URI']:
                                findings.append({
                                    'type': 's3',
                                    'severity': 'high',
                                    'resource': bucket['Name'],
                                    'finding': 'Public S3 bucket',
                                    'description': f'S3 bucket {bucket["Name"]} is publicly accessible',
                                    'recommendation': 'Remove public access or secure the bucket'
                                })
                                break
                    except Exception:
                        continue
            except Exception:
                pass
            
            # 3. Verificar Security Groups con reglas muy amplias
            try:
                sg_response = self.ec2.describe_security_groups()
                for sg in sg_response['SecurityGroups']:
                    for rule in sg['IpPermissions']:
                        if 'IpRanges' in rule:
                            for ip_range in rule['IpRanges']:
                                if ip_range['CidrIp'] == '0.0.0.0/0':
                                    findings.append({
                                        'type': 'security_group',
                                        'severity': 'medium',
                                        'resource': sg['GroupId'],
                                        'finding': 'Open security group rule',
                                        'description': f'Security group {sg["GroupId"]} has open rule to 0.0.0.0/0',
                                        'recommendation': 'Restrict to specific IP ranges'
                                    })
            except Exception:
                pass
            
            return findings
            
        except Exception as e:
            return []
    
    def _run_web_security_scan(self, target_resources):
        """Ejecutar escaneo de seguridad web"""
        
        try:
            findings = []
            
            # Escanear aplicaciones web
            for resource in target_resources:
                if resource['type'] == 'web_application':
                    url = resource['url']
                    
                    # Verificar HTTPS
                    if not url.startswith('https://'):
                        findings.append({
                            'type': 'web',
                            'severity': 'medium',
                            'resource': url,
                            'finding': 'HTTP instead of HTTPS',
                            'description': 'Application is using HTTP instead of HTTPS',
                            'recommendation': 'Implement SSL/TLS encryption'
                        })
                    
                    # Verificar headers de seguridad (simulado)
                    security_headers = [
                        'X-Frame-Options',
                        'X-Content-Type-Options',
                        'X-XSS-Protection',
                        'Strict-Transport-Security',
                        'Content-Security-Policy'
                    ]
                    
                    # Simulación de verificación de headers
                    missing_headers = ['X-Frame-Options', 'Content-Security-Policy']  # Ejemplo
                    
                    for header in missing_headers:
                        findings.append({
                            'type': 'web',
                            'severity': 'low',
                            'resource': url,
                            'finding': f'Missing security header: {header}',
                            'description': f'Security header {header} is not present',
                            'recommendation': f'Add {header} header to improve security'
                        })
            
            return findings
            
        except Exception as e:
            return []
    
    def _generate_security_recommendations(self, findings):
        """Generar recomendaciones de seguridad basadas en hallazgos"""
        
        try:
            recommendations = []
            
            # Agrupar hallazgos por severidad
            high_severity = [f for f in findings if f['severity'] == 'high']
            medium_severity = [f for f in findings if f['severity'] == 'medium']
            low_severity = [f for f in findings if f['severity'] == 'low']
            
            # Recomendaciones de alta prioridad
            if high_severity:
                recommendations.append({
                    'priority': 'high',
                    'title': 'Address High-Severity Findings Immediately',
                    'description': f'Found {len(high_severity)} high-severity security issues',
                    'action': 'Remediate high-severity findings immediately to prevent security breaches',
                    'affected_resources': list(set([f['resource'] for f in high_severity]))
                })
            
            # Recomendaciones de media prioridad
            if medium_severity:
                recommendations.append({
                    'priority': 'medium',
                    'title': 'Review Medium-Severity Findings',
                    'description': f'Found {len(medium_severity)} medium-severity security issues',
                    'action': 'Review and remediate medium-severity findings within 30 days',
                    'affected_resources': list(set([f['resource'] for f in medium_severity]))
                })
            
            # Recomendaciones de baja prioridad
            if low_severity:
                recommendations.append({
                    'priority': 'low',
                    'title': 'Address Low-Severity Findings',
                    'description': f'Found {len(low_severity)} low-severity security issues',
                    'action': 'Address low-severity findings as part of regular security maintenance',
                    'affected_resources': list(set([f['resource'] for f in low_severity]))
                })
            
            # Recomendaciones generales
            recommendations.extend([
                {
                    'priority': 'medium',
                    'title': 'Implement Regular Security Scanning',
                    'description': 'Establish regular vulnerability scanning and penetration testing',
                    'action': 'Schedule quarterly penetration tests and monthly vulnerability scans'
                },
                {
                    'priority': 'low',
                    'title': 'Enhance Security Monitoring',
                    'description': 'Improve security monitoring and alerting',
                    'action': 'Implement comprehensive logging and real-time security monitoring'
                }
            ])
            
            return recommendations
            
        except Exception as e:
            return []
    
    def generate_pentesting_report(self, scan_results, project_name, environment):
        """Generar reporte completo de pruebas de penetración"""
        
        try:
            report = {
                'report_metadata': {
                    'project_name': project_name,
                    'environment': environment,
                    'scan_date': datetime.utcnow().isoformat(),
                    'scan_id': scan_results['scan_id'],
                    'scan_type': scan_results['scan_type']
                },
                'executive_summary': {
                    'total_findings': len(scan_results['findings']),
                    'high_severity': len([f for f in scan_results['findings'] if f['severity'] == 'high']),
                    'medium_severity': len([f for f in scan_results['findings'] if f['severity'] == 'medium']),
                    'low_severity': len([f for f in scan_results['findings'] if f['severity'] == 'low']),
                    'risk_score': self._calculate_risk_score(scan_results['findings'])
                },
                'detailed_findings': scan_results['findings'],
                'recommendations': scan_results['recommendations'],
                'methodology': self._get_methodology_description(scan_results['scan_type'])
            }
            
            return {
                'success': True,
                'report': report
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _calculate_risk_score(self, findings):
        """Calcular score de riesgo"""
        
        try:
            severity_weights = {
                'high': 10,
                'medium': 5,
                'low': 1
            }
            
            total_score = sum([severity_weights[f['severity']] for f in findings])
            
            # Normalizar a escala de 0-100
            max_possible_score = len(findings) * 10
            if max_possible_score > 0:
                normalized_score = (total_score / max_possible_score) * 100
            else:
                normalized_score = 0
            
            return normalized_score
            
        except Exception:
            return 0
    
    def _get_methodology_description(self, scan_type):
        """Obtener descripción de metodología de prueba"""
        
        methodologies = {
            'basic': {
                'name': 'Basic Security Assessment',
                'description': 'Basic vulnerability scanning and security review',
                'tools': ['Nmap', 'AWS Config Rules', 'Basic security checks']
            },
            'comprehensive': {
                'name': 'Comprehensive Penetration Test',
                'description': 'Full penetration testing including network, application, and AWS security',
                'tools': ['Nmap', 'Metasploit', 'OWASP ZAP', 'Prowler', 'ScoutSuite', 'Custom scripts']
            },
            'aws': {
                'name': 'AWS Security Assessment',
                'description': 'Focused AWS security configuration and access review',
                'tools': ['Prowler', 'ScoutSuite', 'AWS Config', 'IAM Policy Simulator']
            },
            'web': {
                'name': 'Web Application Security Test',
                'description': 'Web application vulnerability assessment',
                'tools': ['OWASP ZAP', 'Burp Suite', 'SSL/TLS testing']
            }
        }
        
        return methodologies.get(scan_type, methodologies['basic'])
    
    def _create_cloudwatch_alarm(self, alarm_name, metric_name, threshold, comparison, description):
        """Crear alarma de CloudWatch"""
        
        try:
            cloudwatch = boto3.client('cloudwatch', region_name=self.region)
            
            cloudwatch.put_metric_alarm(
                AlarmName=alarm_name,
                AlarmDescription=description,
                MetricName=metric_name,
                Namespace='AWS/EC2',
                Statistic='Average',
                Period=300,
                EvaluationPeriods=2,
                Threshold=threshold,
                ComparisonOperator=comparison,
                TreatMissingData='missing'
            )
            
        except Exception:
            pass
    
    def _get_default_vpc_id(self):
        """Obtener VPC por defecto"""
        
        try:
            response = self.ec2.describe_vpcs(Filters=[{'Name': 'isDefault', 'Values': ['true']}])
            if response['Vpcs']:
                return response['Vpcs'][0]['VpcId']
        except Exception:
            pass
        
        return None
    
    def cleanup_pentesting_environment(self, project_name, environment):
        """Limpiar entorno de pruebas"""
        
        try:
            cleanup_results = {
                'instances_terminated': [],
                'security_groups_deleted': [],
                'iam_roles_deleted': [],
                'monitoring_disabled': []
            }
            
            # 1. Terminar instancias de pentesting
            try:
                response = self.ec2.describe_instances(
                    Filters=[
                        {'Name': 'tag:Project', 'Values': [project_name]},
                        {'Name': 'tag:Environment', 'Values': [environment]},
                        {'Name': 'tag:Purpose', 'Values': ['Pentesting']}
                    ]
                )
                
                for reservation in response['Reservations']:
                    for instance in reservation['Instances']:
                        if instance['State']['Name'] != 'terminated':
                            self.ec2.terminate_instances(InstanceIds=[instance['InstanceId']])
                            cleanup_results['instances_terminated'].append(instance['InstanceId'])
            except Exception:
                pass
            
            # 2. Eliminar security groups
            try:
                response = self.ec2.describe_security_groups(
                    Filters=[
                        {'Name': 'tag:Project', 'Values': [project_name]},
                        {'Name': 'tag:Environment', 'Values': [environment]},
                        {'Name': 'tag:Purpose', 'Values': ['Pentesting']}
                    ]
                )
                
                for sg in response['SecurityGroups']:
                    try:
                        self.ec2.delete_security_group(GroupId=sg['GroupId'])
                        cleanup_results['security_groups_deleted'].append(sg['GroupId'])
                    except Exception:
                        pass
            except Exception:
                pass
            
            # 3. Eliminar roles IAM
            try:
                role_name = f'{project_name}-{environment}-pentesting-role'
                
                # Eliminar políticas del rol
                try:
                    self.iam.delete_role_policy(RoleName=role_name, PolicyName=f'{role_name}-policy')
                except Exception:
                    pass
                
                # Eliminar rol
                try:
                    self.iam.delete_role(RoleName=role_name)
                    cleanup_results['iam_roles_deleted'].append(role_name)
                except Exception:
                    pass
            except Exception:
                pass
            
            # 4. Eliminar alarmas de CloudWatch
            try:
                cloudwatch = boto3.client('cloudwatch', region_name=self.region)
                alarm_names = [
                    f'{project_name}-{environment}-pentesting-unauthorized-access',
                    f'{project_name}-{environment}-pentesting-network-activity'
                ]
                
                for alarm_name in alarm_names:
                    try:
                        cloudwatch.delete_alarms(AlarmNames=[alarm_name])
                        cleanup_results['monitoring_disabled'].append(alarm_name)
                    except Exception:
                        pass
            except Exception:
                pass
            
            return {
                'success': True,
                'cleanup_results': cleanup_results
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Configurar Entorno de Pruebas**
```python
# Ejemplo: Configurar entorno completo de pruebas de penetración
manager = PenetrationTestingManager('us-east-1')

target_resources = [
    {'type': 'ec2_instance', 'id': 'i-1234567890abcdef0'},
    {'type': 'web_application', 'url': 'https://example.com'}
]

setup_result = manager.setup_pentesting_environment(
    project_name='myapp',
    environment='staging',
    target_resources=target_resources
)

if setup_result['success']:
    setup = setup_result['pentesting_setup']
    print(f"Security Group: {setup['security_groups'].get('security_group_id')}")
    print(f"IAM Role: {setup['iam_roles'].get('role_name')}")
    print(f"Tools Instance: {setup['tools']['tools_setup']['instances'][0]['instance_id']}")
```

### **2. Ejecutar Escaneo de Vulnerabilidades**
```python
# Ejemplo: Ejecutar escaneo comprehensivo
scan_result = manager.run_vulnerability_scan(
    target_resources=target_resources,
    scan_type='comprehensive'
)

if scan_result['success']:
    scan_results = scan_result['scan_results']
    print(f"Scan ID: {scan_results['scan_id']}")
    print(f"Total Findings: {len(scan_results['findings'])}")
    print(f"High Severity: {len([f for f in scan_results['findings'] if f['severity'] == 'high'])}")
```

### **3. Generar Reporte**
```python
# Ejemplo: Generar reporte completo
report_result = manager.generate_pentesting_report(
    scan_results=scan_result['scan_results'],
    project_name='myapp',
    environment='staging'
)

if report_result['success']:
    report = report_result['report']
    print(f"Risk Score: {report['executive_summary']['risk_score']:.1f}/100")
    print(f"Total Findings: {report['executive_summary']['total_findings']}")
    print(f"Recommendations: {len(report['recommendations'])}")
```

## Configuración con AWS CLI

### **Configurar Entorno de Pruebas**
```bash
# Crear security group para pentesting
aws ec2 create-security-group \
  --group-name pentesting-sg \
  --description "Security group for pentesting tools" \
  --vpc-id vpc-1234567890abcdef0

# Crear rol para pentesting
aws iam create-role \
  --role-name pentesting-role \
  --assume-role-policy-document file://trust-policy.json

# Lanzar instancia con herramientas
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t3.medium \
  --security-group-ids sg-1234567890abcdef0 \
  --iam-instance-profile Name=pentesting-profile \
  --user-data file://pentesting-setup.sh
```

### **Ejecutar Escaneos**
```bash
# Escaneo de red con nmap (desde instancia)
nmap -sS -O target-ip

# Escaneo de vulnerabilidades con Prowler
./prowler -p account-id -M group

# Escaneo de configuración con ScoutSuite
python3 scout.py aws --regions us-east-1
```

## Best Practices

### **1. Planificación**
- Definir scope claro y delimitado
- Obtener autorización explícita
- Programar pruebas en horarios de bajo impacto
- Tener plan de rollback

### **2. Ejecución**
- Comenzar con pruebas no destructivas
- Documentar todos los hallazgos
- Evitar impactar producción
- Mantener comunicación constante

### **3. Reporte**
- Clasificar hallazgos por severidad
- Proporcionar recomendaciones accionables
- Incluir evidencia detallada
- Establecer plazos de corrección

### **4. Post-Pruebas**
- Limpiar todos los recursos de prueba
- Remediación de vulnerabilidades
- Validación de correcciones
- Actualización de políticas

## Cumplimiento Normativo

### **PCI-DSS**
- Requiere pruebas de penetración trimestrales
- Evaluación de controles de red
- Pruebas de aplicaciones web
- Validación de controles de acceso

### **SOC2**
- Evaluación de controles de seguridad
- Pruebas de controles de acceso
- Validación de monitoreo
- Revisión de políticas de seguridad

### **HIPAA**
- Evaluación de controles de PHI
- Pruebas de encriptación
- Validación de auditoría
- Revisión de controles de acceso

## Costos

### **Herramientas y Servicios**
- **EC2 Instance**: ~$50-100 por mes (t3.medium)
- **Security Tools**: $0-500 (herramientas open source)
- **Professional Services**: $5,000-50,000 por prueba
- **Compliance Reporting**: $1,000-5,000 por reporte

### **Costos de AWS durante Pruebas**
- **Data Transfer**: Variable según escaneos
- **API Calls**: Mínimo ($0.01 por 1,000 llamadas)
- **CloudWatch Logs**: $0.50 por GB
- **Security Hub**: $0.24 por finding por mes

## Troubleshooting

### **Problemas Comunes**
1. **Autorización denegada**: Verificar permisos y autorización
2. **Recursos no encontrados**: Validar configuración de red
3. **Herramientas no funcionan**: Revisar instalación y configuración
4. **Impacto en producción**: Detener pruebas inmediatamente

### **Comandos de Diagnóstico**
```bash
# Verificar permisos de instancia
aws sts get-caller-identity

# Verificar configuración de red
aws ec2 describe-security-groups --group-ids sg-1234567890abcdef0

# Verificar logs de pentesting
aws logs describe-log-groups --log-group-name-prefix /aws/pentesting/

# Verificar estado de instancias
aws ec2 describe-instances --instance-ids i-1234567890abcdef0
```

## Consideraciones Legales y Éticas

### **Autorización**
- Obtener consentimiento explícito
- Documentar scope y limitaciones
- Firmar acuerdo de confidencialidad
- Establecer reglas de compromiso

### **Responsabilidad**
- Reportar vulnerabilidades responsablemente
- No explotar vulnerabilidades encontradas
- Mantener confidencialidad de datos
- Seguir leyes locales e internacionales

### **Documentación**
- Mantener registros detallados
- Documentar metodología utilizada
- Archivar evidencia de hallazgos
- Preparar reportes formales

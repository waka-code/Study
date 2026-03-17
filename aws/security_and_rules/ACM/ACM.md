# AWS Certificate Manager (ACM)

## Definición

AWS Certificate Manager (ACM) es un servicio que simplifica el proceso de creación, gestión y despliegue de certificados SSL/TLS. ACM proporciona certificados públicos gratuitos y certificados privados pagados, integrándose nativamente con servicios AWS como Elastic Load Balancing, CloudFront, API Gateway y más.

## Características Principales

### **Certificados Públicos**
- **Gratis**: Sin costo para certificados públicos
- **Validación automática**: Validación DNS o email
- **Renovación automática**: Renovación gestionada por AWS
- **Soporte wildcard**: Certificados para subdominios
- **Multi-dominio**: Soporte SAN (Subject Alternative Names)

### **Certificados Privados**
- **Importación**: Importar certificados existentes
- **Almacenamiento seguro**: Gestión centralizada de claves
- **Integración KMS**: Integración con AWS Key Management Service
- **Validación interna**: Validación para uso interno
- **Cumplimiento**: Soporte para certificados de CA internas

### **Gestión Simplificada**
- **Despliegue automático**: Integración con servicios AWS
- **Monitoreo**: Notificaciones de expiración
- **Validación**: Proceso de validación simplificado
- **Auditoría**: Logs detallados con CloudTrail
- **API completa**: Acceso programático completo

## Tipos de Certificados

### **1. Certificados Públicos (Gratis)**
- **CA**: Amazon Trust Services
- **Validación**: DNS o Email
- **Duración**: 13 meses
- **Renovación**: Automática
- **Uso**: Público, internet-facing

### **2. Certificados Privados (Pagados)**
- **CA**: Propia o CA externa
- **Validación**: Interna
- **Duración**: Variable
- **Renovación**: Manual
- **Uso**: Interno, privado

### **3. Certificados Importados**
- **Fuente**: CA externa
- **Formato**: PEM, PKCS12
- **Validación**: Externa
- **Gestión**: ACM
- **Uso**: Compatible con servicios AWS

## Validación de Certificados

### **Validación DNS**
- **Registro CNAME**: Crear registro CNAME en DNS
- **Control del dominio**: Demostrar control del dominio
- **Automatización**: Compatible con Route 53
- **Tiempo**: 5-30 minutos
- **Requerimiento**: Acceso a configuración DNS

### **Validación Email**
- **Email de contacto**: whois, admin, webmaster
- **Validación**: Click en enlace de validación
- **Manual**: Requiere intervención humana
- **Tiempo**: 24-48 horas
- **Requerimiento**: Acceso a email

### **Validación Organizacional**
- **Documentación**: Documentos legales requeridos
- **Verificación**: Proceso manual de verificación
- **Nivel**: Extended Validation (EV)
- **Tiempo**: 3-5 días hábiles
- **Requerimiento**: Documentación organizacional

## Integración con Servicios AWS

### **Servicios Compatibles**
```
ACM Integration
├── Elastic Load Balancing
│   ├── Application Load Balancer (ALB)
│   ├── Network Load Balancer (NLB)
│   └── Classic Load Balancer (CLB)
├── CloudFront
│   ├── Distributions
│   ├── Behaviors
│   └── Cache policies
├── API Gateway
│   ├── REST APIs
│   ├── WebSocket APIs
│   └── HTTP APIs
├── Elastic Beanstalk
│   ├── Environments
│   ├── Applications
│   └── Platforms
├── CloudFormation
│   ├── Stacks
│   ├── Templates
│   └── Resources
└── Otros Servicios
    ├── AWS Elemental MediaLive
    ├── AWS Elemental MediaStore
    ├── AWS CodeBuild
    └── AWS Elastic Kubernetes Service
```

## Configuración de ACM

### **Gestión Completa de Certificados**
```python
import boto3
import json
import time
import subprocess
import os
from datetime import datetime, timedelta
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa

class ACManager:
    def __init__(self, region='us-east-1'):
        self.acm = boto3.client('acm', region_name=region)
        self.route53 = boto3.client('route53', region_name=region)
        self.elbv2 = boto3.client('elbv2', region_name=region)
        self.cloudfront = boto3.client('cloudfront', region_name='us-east-1')
        self.apigateway = boto3.client('apigateway', region_name=region)
        self.region = region
    
    def request_public_certificate(self, domain_name, subject_alternative_names=None,
                                 validation_method='DNS', tags=None):
        """Solicitar certificado público"""
        
        try:
            request_params = {
                'DomainName': domain_name,
                'ValidationMethod': validation_method,
                'SubjectAlternativeNames': subject_alternative_names or []
            }
            
            if tags:
                request_params['Tags'] = tags
            
            response = self.acm.request_certificate(**request_params)
            certificate_arn = response['CertificateArn']
            
            # Esperar a que el certificado esté pendiente de validación
            self._wait_for_certificate_status(certificate_arn, 'PENDING_VALIDATION')
            
            return {
                'success': True,
                'certificate_arn': certificate_arn,
                'domain_name': domain_name,
                'subject_alternative_names': subject_alternative_names or [],
                'validation_method': validation_method,
                'status': 'PENDING_VALIDATION'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def validate_certificate_dns(self, certificate_arn, hosted_zone_id=None):
        """Validar certificado usando DNS"""
        
        try:
            # Obtener detalles de validación DNS
            response = self.acm.describe_certificate(CertificateArn=certificate_arn)
            certificate = response['Certificate']
            
            domain_validation_options = certificate.get('DomainValidationOptions', [])
            validation_records = []
            
            for validation_option in domain_validation_options:
                domain_name = validation_option['DomainName']
                resource_record = validation_option.get('ResourceRecord')
                
                if resource_record:
                    validation_records.append({
                        'domain_name': domain_name,
                        'name': resource_record['Name'],
                        'type': resource_record['Type'],
                        'value': resource_record['Value']
                    })
            
            # Si se proporciona hosted zone_id, crear registros automáticamente
            if hosted_zone_id and validation_records:
                for record in validation_records:
                    try:
                        self.route53.change_resource_record_sets(
                            HostedZoneId=hosted_zone_id,
                            ChangeBatch={
                                'Changes': [
                                    {
                                        'Action': 'CREATE',
                                        'ResourceRecordSet': {
                                            'Name': record['name'],
                                            'Type': record['type'],
                                            'TTL': 300,
                                            'ResourceRecords': [
                                                {'Value': record['value']}
                                            ]
                                        }
                                    }
                                ]
                            }
                        )
                    except Exception as e:
                        continue
            
            return {
                'success': True,
                'certificate_arn': certificate_arn,
                'validation_records': validation_records,
                'hosted_zone_id': hosted_zone_id,
                'validation_method': 'DNS'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def validate_certificate_email(self, certificate_arn):
        """Validar certificado usando email"""
        
        try:
            response = self.acm.describe_certificate(CertificateArn=certificate_arn)
            certificate = response['Certificate']
            
            domain_validation_options = certificate.get('DomainValidationOptions', [])
            validation_emails = []
            
            for validation_option in domain_validation_options:
                domain_name = validation_option['DomainName']
                validation_domain = validation_option.get('ValidationDomain', domain_name)
                validation_methods = validation_option.get('ValidationMethods', [])
                
                if 'EMAIL' in validation_methods:
                    validation_emails.append({
                        'domain_name': domain_name,
                        'validation_domain': validation_domain,
                        'validation_emails': validation_option.get('ValidationEmails', [])
                    })
            
            return {
                'success': True,
                'certificate_arn': certificate_arn,
                'validation_emails': validation_emails,
                'validation_method': 'EMAIL',
                'note': 'Check validation emails and click validation links'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def import_private_certificate(self, certificate_pem, private_key_pem,
                                 certificate_chain_pem=None, tags=None):
        """Importar certificado privado"""
        
        try:
            import_params = {
                'Certificate': certificate_pem,
                'PrivateKey': private_key_pem
            }
            
            if certificate_chain_pem:
                import_params['CertificateChain'] = certificate_chain_pem
            
            if tags:
                import_params['Tags'] = tags
            
            response = self.acm.import_certificate(**import_params)
            certificate_arn = response['CertificateArn']
            
            return {
                'success': True,
                'certificate_arn': certificate_arn,
                'imported': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_self_signed_certificate(self, domain_name, key_size=2048,
                                       validity_days=365, subject_info=None):
        """Generar certificado auto-firmado para pruebas"""
        
        try:
            # Generar clave privada
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=key_size
            )
            
            # Crear sujeto del certificado
            subject_info = subject_info or {
                'common_name': domain_name,
                'organization': 'Test Organization',
                'country': 'US'
            }
            
            subject = x509.Name([
                x509.NameAttribute(NameOID.COMMON_NAME, subject_info['common_name']),
                x509.NameAttribute(NameOID.ORGANIZATION_NAME, subject_info['organization']),
                x509.NameAttribute(NameOID.COUNTRY_NAME, subject_info['country'])
            ])
            
            # Crear certificado
            builder = x509.CertificateBuilder()
            builder = builder.subject_name(subject)
            builder = builder.issuer_name(subject)
            builder = builder.public_key(private_key.public_key())
            builder = builder.serial_number(x509.random_serial_number())
            builder = builder.not_valid_before(datetime.utcnow())
            builder = builder.not_valid_after(datetime.utcnow() + timedelta(days=validity_days))
            
            # Agregar Subject Alternative Names
            builder = builder.add_extension(
                x509.SubjectAlternativeName([x509.DNSName(domain_name)]),
                critical=False
            )
            
            # Firmar certificado
            certificate = builder.sign(private_key, hashes.SHA256())
            
            # Serializar certificado y clave
            cert_pem = certificate.public_bytes(serialization.Encoding.PEM).decode('utf-8')
            key_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ).decode('utf-8')
            
            return {
                'success': True,
                'certificate_pem': cert_pem,
                'private_key_pem': key_pem,
                'domain_name': domain_name,
                'validity_days': validity_days,
                'key_size': key_size
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_wildcard_certificate(self, base_domain, validation_method='DNS',
                                   subject_alternative_names=None, tags=None):
        """Crear certificado wildcard"""
        
        try:
            # Crear nombre de dominio wildcard
            wildcard_domain = f'*.{base_domain}'
            
            # Agregar dominio base y otros dominios
            all_domains = [wildcard_domain, base_domain]
            if subject_alternative_names:
                all_domains.extend(subject_alternative_names)
            
            # Solicitar certificado
            request_result = self.request_public_certificate(
                domain_name=wildcard_domain,
                subject_alternative_names=all_domains,
                validation_method=validation_method,
                tags=tags
            )
            
            if request_result['success']:
                return {
                    'success': True,
                    'certificate_arn': request_result['certificate_arn'],
                    'wildcard_domain': wildcard_domain,
                    'base_domain': base_domain,
                    'all_domains': all_domains,
                    'validation_method': validation_method
                }
            
            return request_result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def deploy_certificate_to_elb(self, certificate_arn, load_balancer_arn,
                                listener_port=443, default_action=None):
        """Desplegar certificado en Elastic Load Balancer"""
        
        try:
            # Obtener listeners existentes
            listeners_response = self.elbv2.describe_listeners(
                LoadBalancerArn=load_balancer_arn
            )
            
            existing_listener = None
            for listener in listeners_response['Listeners']:
                if listener['Port'] == listener_port:
                    existing_listener = listener
                    break
            
            # Configurar acción por defecto
            if not default_action:
                default_action = {
                    'Type': 'forward',
                    'TargetGroupArn': self._get_default_target_group(load_balancer_arn)
                }
            
            # Crear o actualizar listener
            if existing_listener:
                # Actualizar listener existente
                response = self.elbv2.modify_listener(
                    ListenerArn=existing_listener['ListenerArn'],
                    Certificates=[
                        {
                            'CertificateArn': certificate_arn,
                            'IsDefault': True
                        }
                    ],
                    DefaultActions=[default_action]
                )
            else:
                # Crear nuevo listener
                response = self.elbv2.create_listener(
                    LoadBalancerArn=load_balancer_arn,
                    Protocol='HTTPS',
                    Port=listener_port,
                    Certificates=[
                        {
                            'CertificateArn': certificate_arn,
                            'IsDefault': True
                        }
                    ],
                    DefaultActions=[default_action]
                )
            
            return {
                'success': True,
                'certificate_arn': certificate_arn,
                'load_balancer_arn': load_balancer_arn,
                'listener_port': listener_port,
                'deployed': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def deploy_certificate_to_cloudfront(self, certificate_arn, distribution_id,
                                      minimum_protocol_version='TLSv1.2_2021'):
        """Desplegar certificado en CloudFront"""
        
        try:
            # Obtener configuración actual de distribución
            response = self.cloudfront.get_distribution_config(
                Id=distribution_id
            )
            
            distribution_config = response['DistributionConfig']
            etag = response['ETag']
            
            # Actualizar configuración de viewer certificate
            viewer_certificate = {
                'ACMCertificateArn': certificate_arn,
                'SSLSupportMethod': 'sni-only',
                'MinimumProtocolVersion': minimum_protocol_version,
                'Certificate': certificate_arn,
                'CertificateSource': 'acm'
            }
            
            distribution_config['ViewerCertificate'] = viewer_certificate
            
            # Actualizar distribución
            update_response = self.cloudfront.update_distribution(
                DistributionConfig=distribution_config,
                Id=distribution_id,
                IfMatch=etag
            )
            
            return {
                'success': True,
                'certificate_arn': certificate_arn,
                'distribution_id': distribution_id,
                'minimum_protocol_version': minimum_protocol_version,
                'deployed': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def deploy_certificate_to_api_gateway(self, certificate_arn, domain_name,
                                       endpoint_configuration=None):
        """Desplegar certificado en API Gateway"""
        
        try:
            # Crear nombre de dominio personalizado
            domain_name_params = {
                'domainName': domain_name,
                'certificateArn': certificate_arn
            }
            
            if endpoint_configuration:
                domain_name_params['endpointConfiguration'] = endpoint_configuration
            
            response = self.apigateway.create_domain_name(**domain_name_params)
            
            domain_name_info = {
                'domain_name': response['domainName'],
                'certificate_arn': response['certificateArn'],
                'certificate_upload_date': response['certificateUploadDate'].isoformat(),
                'regional_domain_name': response.get('regionalDomainName', ''),
                'regional_hosted_zone_id': response.get('regionalHostedZoneId', '')
            }
            
            return {
                'success': True,
                'certificate_arn': certificate_arn,
                'domain_name': domain_name,
                'domain_name_info': domain_name_info,
                'deployed': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_certificates(self, certificate_status=None, max_results=100, next_token=None):
        """Listar certificados"""
        
        try:
            params = {'MaxResults': max_results}
            if certificate_status:
                params['CertificateStatuses'] = [certificate_status]
            if next_token:
                params['NextToken'] = next_token
            
            response = self.acm.list_certificates(**params)
            
            certificates = []
            for cert in response['CertificateSummaryList']:
                cert_info = {
                    'certificate_arn': cert['CertificateArn'],
                    'domain_name': cert['DomainName'],
                    'subject_alternative_names': cert.get('SubjectAlternativeNames', []),
                    'status': cert['Status'],
                    'type': cert.get('Type', 'IMPORTED'),
                    'key_algorithm': cert.get('KeyAlgorithm', ''),
                    'not_before': cert.get('NotBefore', ''),
                    'not_after': cert.get('NotAfter', ''),
                    'creation_date': cert.get('CreatedAt', ''),
                    'in_use_by': cert.get('InUseBy', [])
                }
                certificates.append(cert_info)
            
            return {
                'success': True,
                'certificates': certificates,
                'count': len(certificates),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_certificate(self, certificate_arn):
        """Describir certificado"""
        
        try:
            response = self.acm.describe_certificate(CertificateArn=certificate_arn)
            certificate = response['Certificate']
            
            cert_info = {
                'certificate_arn': certificate['CertificateArn'],
                'domain_name': certificate['DomainName'],
                'subject_alternative_names': certificate.get('SubjectAlternativeNames', []),
                'domain_validation_options': certificate.get('DomainValidationOptions', []),
                'status': certificate['Status'],
                'type': certificate.get('Type', 'IMPORTED'),
                'key_algorithm': certificate.get('KeyAlgorithm', ''),
                'signature_algorithm': certificate.get('SignatureAlgorithm', ''),
                'in_use_by': certificate.get('InUseBy', []),
                'created_at': certificate.get('CreatedAt').isoformat() if certificate.get('CreatedAt') else None,
                'issued_at': certificate.get('IssuedAt').isoformat() if certificate.get('IssuedAt') else None,
                'not_before': certificate.get('NotBefore').isoformat() if certificate.get('NotBefore') else None,
                'not_after': certificate.get('NotAfter').isoformat() if certificate.get('NotAfter') else None,
                'failure_reason': certificate.get('FailureReason', ''),
                'revoked_at': certificate.get('RevokedAt').isoformat() if certificate.get('RevokedAt') else None,
                'revocation_reason': certificate.get('RevocationReason', ''),
                'subject': certificate.get('Subject', ''),
                'issuer': certificate.get('Issuer', ''),
                'serial': certificate.get('Serial', ''),
                'options': certificate.get('Options', {}),
                'certificate_chain': certificate.get('CertificateChain', ''),
                'renewal_summary': certificate.get('RenewalSummary', {}),
                'extended_key_usages': certificate.get('ExtendedKeyUsages', []),
                'certificate_authority_arn': certificate.get('CertificateAuthorityArn', ''),
                'tags': certificate.get('Tags', [])
            }
            
            return {
                'success': True,
                'certificate_info': cert_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_certificate(self, certificate_arn):
        """Eliminar certificado"""
        
        try:
            response = self.acm.delete_certificate(CertificateArn=certificate_arn)
            
            return {
                'success': True,
                'certificate_arn': certificate_arn,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_certificate_usage(self, certificate_arn):
        """Obtener uso del certificado"""
        
        try:
            response = self.acm.describe_certificate(CertificateArn=certificate_arn)
            certificate = response['Certificate']
            
            in_use_by = certificate.get('InUseBy', [])
            
            usage_details = {
                'certificate_arn': certificate_arn,
                'total_resources_using': len(in_use_by),
                'resources': []
            }
            
            for resource_arn in in_use_by:
                resource_info = {
                    'resource_arn': resource_arn,
                    'resource_type': self._get_resource_type_from_arn(resource_arn),
                    'resource_name': self._get_resource_name_from_arn(resource_arn)
                }
                usage_details['resources'].append(resource_info)
            
            return {
                'success': True,
                'usage_details': usage_details
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_certificate_expiration_alerts(self, days_threshold=30):
        """Obtener alertas de expiración de certificados"""
        
        try:
            # Listar todos los certificados
            certificates_response = self.list_certificates()
            
            if not certificates_response['success']:
                return certificates_response
            
            expiring_certificates = []
            current_date = datetime.utcnow()
            
            for cert in certificates_response['certificates']:
                if cert['not_after']:
                    expiration_date = datetime.fromisoformat(cert['not_after'].replace('Z', '+00:00'))
                    days_until_expiration = (expiration_date - current_date).days
                    
                    if days_until_expiration <= days_threshold:
                        expiring_certificates.append({
                            'certificate_arn': cert['certificate_arn'],
                            'domain_name': cert['domain_name'],
                            'expiration_date': cert['not_after'],
                            'days_until_expiration': days_until_expiration,
                            'status': cert['status'],
                            'urgency': 'critical' if days_until_expiration <= 7 else 'warning'
                        })
            
            # Ordenar por días hasta expiración
            expiring_certificates.sort(key=lambda x: x['days_until_expiration'])
            
            return {
                'success': True,
                'expiring_certificates': expiring_certificates,
                'total_expiring': len(expiring_certificates),
                'days_threshold': days_threshold
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def renew_certificate(self, certificate_arn):
        """Renovar certificado manualmente"""
        
        try:
            response = self.acm.renew_certificate(CertificateArn=certificate_arn)
            
            return {
                'success': True,
                'certificate_arn': certificate_arn,
                'renewal_initiated': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def export_certificate(self, certificate_arn, passphrase=None):
        """Exportar certificado y clave privada"""
        
        try:
            response = self.acm.export_certificate(
                CertificateArn=certificate_arn,
                Passphrase=passphrase
            )
            
            export_data = {
                'certificate': response['Certificate'],
                'certificate_chain': response.get('CertificateChain', ''),
                'private_key': response.get('PrivateKey', '')
            }
            
            return {
                'success': True,
                'certificate_arn': certificate_arn,
                'export_data': export_data
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def add_tags_to_certificate(self, certificate_arn, tags):
        """Agregar tags a certificado"""
        
        try:
            self.acm.add_tags_to_certificate(
                CertificateArn=certificate_arn,
                Tags=tags
            )
            
            return {
                'success': True,
                'certificate_arn': certificate_arn,
                'tags_added': tags
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def remove_tags_from_certificate(self, certificate_arn, tag_keys):
        """Eliminar tags de certificado"""
        
        try:
            self.acm.remove_tags_from_certificate(
                CertificateArn=certificate_arn,
                Tags=[{'Key': key} for key in tag_keys]
            )
            
            return {
                'success': True,
                'certificate_arn': certificate_arn,
                'tags_removed': tag_keys
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_certificate_bundle(self, project_name, domains, validation_method='DNS',
                                tags=None):
        """Crear bundle de certificados para proyecto"""
        
        try:
            bundle_setup = {
                'certificates': [],
                'wildcard_certificates': [],
                'individual_certificates': []
            }
            
            # Agrupar dominios por wildcard
            wildcard_domains = {}
            individual_domains = []
            
            for domain in domains:
                if domain.startswith('*.'):
                    base_domain = domain[2:]  # Remover '*.'
                    if base_domain not in wildcard_domains:
                        wildcard_domains[base_domain] = []
                    wildcard_domains[base_domain].append(domain)
                else:
                    individual_domains.append(domain)
            
            # Crear certificados wildcard
            for base_domain, wildcard_list in wildcard_domains.items():
                wildcard_result = self.create_wildcard_certificate(
                    base_domain=base_domain,
                    validation_method=validation_method,
                    subject_alternative_names=wildcard_list[1:],  # Excluir el primer wildcard
                    tags=tags
                )
                
                if wildcard_result['success']:
                    bundle_setup['wildcard_certificates'].append(wildcard_result)
                    bundle_setup['certificates'].append(wildcard_result)
            
            # Crear certificados individuales
            for domain in individual_domains:
                cert_result = self.request_public_certificate(
                    domain_name=domain,
                    validation_method=validation_method,
                    tags=tags
                )
                
                if cert_result['success']:
                    bundle_setup['individual_certificates'].append(cert_result)
                    bundle_setup['certificates'].append(cert_result)
            
            return {
                'success': True,
                'bundle_setup': bundle_setup,
                'project_name': project_name,
                'total_certificates': len(bundle_setup['certificates']),
                'wildcard_count': len(bundle_setup['wildcard_certificates']),
                'individual_count': len(bundle_setup['individual_certificates'])
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _wait_for_certificate_status(self, certificate_arn, target_status, timeout=1800):
        """Esperar a que el certificado alcance el estado deseado"""
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = self.acm.describe_certificate(CertificateArn=certificate_arn)
                certificate = response['Certificate']
                if certificate['Status'] == target_status:
                    return True
                time.sleep(30)
            except Exception:
                pass
        return False
    
    def _get_default_target_group(self, load_balancer_arn):
        """Obtener target group por defecto"""
        
        try:
            response = self.elbv2.describe_target_groups(
                LoadBalancerArn=load_balancer_arn
            )
            
            if response['TargetGroups']:
                return response['TargetGroups'][0]['TargetGroupArn']
            
        except Exception:
            pass
        
        return None
    
    def _get_resource_type_from_arn(self, arn):
        """Obtener tipo de recurso desde ARN"""
        
        try:
            parts = arn.split(':')
            if len(parts) >= 6:
                service = parts[2]
                resource_type = parts[5].split('/')[0]
                return f'{service}:{resource_type}'
        except Exception:
            pass
        
        return 'unknown'
    
    def _get_resource_name_from_arn(self, arn):
        """Obtener nombre de recurso desde ARN"""
        
        try:
            parts = arn.split('/')
            return parts[-1] if len(parts) > 1 else arn
        except Exception:
            pass
        
        return arn
    
    def generate_certificate_report(self, project_name=None):
        """Generar reporte de certificados"""
        
        try:
            # Listar todos los certificados
            certificates_response = self.list_certificates()
            
            if not certificates_response['success']:
                return certificates_response
            
            certificates = certificates_response['certificates']
            
            # Generar reporte
            report = {
                'report_metadata': {
                    'project_name': project_name or 'All Certificates',
                    'report_date': datetime.utcnow().isoformat(),
                    'total_certificates': len(certificates)
                },
                'certificate_summary': {
                    'total': len(certificates),
                    'issued': len([c for c in certificates if c['status'] == 'ISSUED']),
                    'pending': len([c for c in certificates if c['status'] == 'PENDING_VALIDATION']),
                    'failed': len([c for c in certificates if c['status'] == 'FAILED']),
                    'expired': len([c for c in certificates if c['status'] == 'EXPIRED']),
                    'in_use': len([c for c in certificates if c['in_use_by']])
                },
                'certificate_details': [],
                'expiring_soon': [],
                'recommendations': []
            }
            
            # Analizar cada certificado
            current_date = datetime.utcnow()
            
            for cert in certificates:
                cert_detail = {
                    'certificate_arn': cert['certificate_arn'],
                    'domain_name': cert['domain_name'],
                    'subject_alternative_names': cert['subject_alternative_names'],
                    'status': cert['status'],
                    'type': cert['type'],
                    'in_use_by': cert['in_use_by'],
                    'days_until_expiration': None
                }
                
                # Calcular días hasta expiración
                if cert['not_after']:
                    expiration_date = datetime.fromisoformat(cert['not_after'].replace('Z', '+00:00'))
                    days_until_expiration = (expiration_date - current_date).days
                    cert_detail['days_until_expiration'] = days_until_expiration
                    
                    # Agregar a expiración cercana
                    if days_until_expiration <= 30:
                        report['expiring_soon'].append({
                            'certificate_arn': cert['certificate_arn'],
                            'domain_name': cert['domain_name'],
                            'days_until_expiration': days_until_expiration
                        })
                
                report['certificate_details'].append(cert_detail)
            
            # Generar recomendaciones
            if report['expiring_soon']:
                report['recommendations'].append({
                    'priority': 'high',
                    'recommendation': 'Renew expiring certificates',
                    'details': f'{len(report["expiring_soon"])} certificates expiring within 30 days'
                })
            
            if report['certificate_summary']['pending'] > 0:
                report['recommendations'].append({
                    'priority': 'medium',
                    'recommendation': 'Complete pending validations',
                    'details': f'{report["certificate_summary"]["pending"]} certificates pending validation'
                })
            
            if report['certificate_summary']['failed'] > 0:
                report['recommendations'].append({
                    'priority': 'high',
                    'recommendation': 'Fix failed validations',
                    'details': f'{report["certificate_summary"]["failed"]} certificates failed validation'
                })
            
            return {
                'success': True,
                'certificate_report': report
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Solicitar y Validar Certificado Público**
```python
# Ejemplo: Solicitar certificado público
manager = ACManager('us-east-1')

# Solicitar certificado
cert_result = manager.request_public_certificate(
    domain_name='example.com',
    subject_alternative_names=['www.example.com', 'api.example.com'],
    validation_method='DNS',
    tags=[
        {'Key': 'Project', 'Value': 'myapp'},
        {'Key': 'Environment', 'Value': 'production'}
    ]
)

if cert_result['success']:
    # Validar con DNS
    validation_result = manager.validate_certificate_dns(
        certificate_arn=cert_result['certificate_arn'],
        hosted_zone_id='Z1234567890ABCDEF'
    )
    
    if validation_result['success']:
        print(f"Certificate requested and DNS validation configured")
```

### **2. Crear Certificado Wildcard**
```python
# Ejemplo: Crear certificado wildcard
wildcard_result = manager.create_wildcard_certificate(
    base_domain='example.com',
    validation_method='DNS',
    subject_alternative_names=['*.api.example.com'],
    tags=[
        {'Key': 'Type', 'Value': 'Wildcard'},
        {'Key': 'Environment', 'Value': 'production'}
    ]
)

if wildcard_result['success']:
    print(f"Wildcard certificate created: {wildcard_result['certificate_arn']}")
```

### **3. Desplegar en Elastic Load Balancer**
```python
# Ejemplo: Desplegar certificado en ELB
deploy_result = manager.deploy_certificate_to_elb(
    certificate_arn=cert_result['certificate_arn'],
    load_balancer_arn='arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/mylb/1234567890abcdef',
    listener_port=443
)

if deploy_result['success']:
    print(f"Certificate deployed to ELB")
```

### **4. Generar Reporte de Certificados**
```python
# Ejemplo: Generar reporte completo
report_result = manager.generate_certificate_report(project_name='myapp')

if report_result['success']:
    report = report_result['certificate_report']
    print(f"Total certificates: {report['certificate_summary']['total']}")
    print(f"Expiring soon: {len(report['expiring_soon'])}")
    print(f"Recommendations: {len(report['recommendations'])}")
```

## Configuración con AWS CLI

### **Gestión de Certificados**
```bash
# Solicitar certificado público
aws acm request-certificate \
  --domain-name example.com \
  --subject-alternative-names www.example.com api.example.com \
  --validation-method DNS \
  --tags Key=Project,Value=myapp Key=Environment,Value=production

# Describir certificado
aws acm describe-certificate --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/certificate-id

# Listar certificados
aws acm list-certificates --certificate-statuses ISSUED

# Eliminar certificado
aws acm delete-certificate --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/certificate-id
```

### **Validación DNS**
```bash
# Obtener registros de validación DNS
aws acm describe-certificate --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/certificate-id \
  --query 'Certificate.DomainValidationOptions[*].ResourceRecord'

# Crear registro CNAME en Route 53
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABCDEF \
  --change-batch '{
    "Changes": [
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "_example.com.example.com",
          "Type": "CNAME",
          "TTL": 300,
          "ResourceRecords": [{"Value": "validation-domain.example.com"}]
        }
      }
    ]
  }'
```

### **Importar Certificado**
```bash
# Importar certificado privado
aws acm import-certificate \
  --certificate file://certificate.pem \
  --private-key file://private-key.pem \
  --certificate-chain file://certificate-chain.pem \
  --tags Key=Type,Value=Imported
```

### **Despliegue en Servicios**
```bash
# Desplegar en Elastic Load Balancer
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/mylb/1234567890abcdef \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/certificate-id,IsDefault=true \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/mytg/1234567890abcdef

# Desplegar en CloudFront
aws cloudfront get-distribution-config --id distribution-id > distribution-config.json

# Editar el archivo para configurar ViewerCertificate
# Luego:
aws cloudfront update-distribution \
  --distribution-config file://distribution-config.json \
  --id distribution-id \
  --if-match etag
```

## Best Practices

### **1. Gestión de Certificados**
- Usar certificados wildcard para múltiples subdominios
- Configurar renovación automática
- Monitorear fechas de expiración
- Usar tags para organización

### **2. Validación**
- Preferir validación DNS sobre email
- Automatizar creación de registros DNS
- Validar múltiples dominios simultáneamente
- Documentar proceso de validación

### **3. Seguridad**
- Usar protocolos TLS modernos (TLS 1.2+)
- Configurar redirección HTTP a HTTPS
- Implementar HSTS headers
- Regularizar certificados

### **4. Operaciones**
- Automatizar despliegue de certificados
- Configurar monitoreo y alertas
- Documentar procedimientos de emergencia
- Realizar pruebas de renovación

## Costos

### **Precios de ACM**
- **Certificados públicos**: GRATIS
- **Certificados privados**: $400 por mes por CA
- **Importación de certificados**: GRATIS
- **Renovación automática**: GRATIS
- **Transferencia de datos**: Costos estándar de AWS

### **Costos de Servicios Asociados**
- **Route 53**: $0.50 por zona alojada por mes
- **CloudFront**: Costos estándar de distribución
- **ELB**: Costos estándar de load balancer
- **API Gateway**: Costos estándar de API

## Troubleshooting

### **Problemas Comunes**
1. **Validación fallida**: Verificar registros DNS
2. **Certificado no encontrado**: Validar ARN
3. **Despliegue fallido**: Verificar permisos
4. **Renovación fallida**: Revisar configuración

### **Comandos de Diagnóstico**
```bash
# Verificar estado de certificado
aws acm describe-certificate --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/certificate-id

# Verificar registros DNS
dig _example.com.example.com CNAME

# Verificar configuración de ELB
aws elbv2 describe-listeners --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/mylb/1234567890abcdef

# Verificar configuración de CloudFront
aws cloudfront get-distribution --id distribution-id
```

## Cumplimiento Normativo

### **PCI-DSS**
- **Requerimiento 4**: Encriptación de datos en tránsito
- **Requerimiento 8**: Identificación y autenticación
- **Requerimiento 10**: Monitoreo de acceso

### **HIPAA**
- **Security Rule**: Controles técnicos de seguridad
- **Transport Encryption**: Encriptación de datos en tránsito
- **Access Control**: Controles de acceso

### **GDPR**
- **Artículo 32**: Seguridad del tratamiento
- **Artículo 25**: Protección de datos desde el diseño
- **Artículo 33**: Notificación de brechas

## Integración con Otros Servicios

### **AWS Certificate Manager Private CA**
- **CA privada**: Crear tu propia Certificate Authority
- **Certificados internos**: Para uso interno
- **Validación personalizada**: Proceso de validación propio
- **Integración ACM**: Gestión centralizada

### **AWS Certificate Manager Certificate Transparency**
- **Transparencia**: Logs públicos de certificados
- **Monitoreo**: Detección de certificados fraudulentos
- **Cumplimiento**: Requisitos de CA/Browser Forum
- **Seguridad**: Mayor confianza en certificados

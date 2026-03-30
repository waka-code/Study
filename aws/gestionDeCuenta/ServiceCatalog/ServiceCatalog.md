# AWS Service Catalog

## Definición

AWS Service Catalog es un servicio que permite a las organizaciones crear y gestionar catálogos de productos y servicios de AWS aprobados para su uso. Facilita la estandarización de infraestructura, el cumplimiento normativo y la gobernanza mediante la creación de productos predefinidos que los usuarios pueden desplegar de forma segura y consistente.

## Características Principales

### **Gestión de Catálogos**
- **Product Catalog**: Catálogo centralizado de productos y servicios
- **Standardized Products**: Productos estandarizados con plantillas predefinidas
- **Version Control**: Control de versiones de productos y plantillas
- **Portfolio Management**: Gestión de portafolios por departamento o función
- **Approval Workflows**: Flujos de aprobación para despliegue de productos

### **Gobernanza y Cumplimiento**
- **Constraint Rules**: Reglas de restricción para cumplimiento normativo
- **Tagging Policies**: Políticas de etiquetado obligatorias
- **IAM Integration**: Integración con IAM para control de acceso
- **Budget Controls**: Controles presupuestarios para productos
- **Compliance Monitoring**: Monitoreo continuo de cumplimiento

### **Automatización y Orquestación**
- **CloudFormation Integration**: Integración nativa con CloudFormation
- **Automated Provisioning**: Aprovisionamiento automatizado de productos
- **Resource Tracking**: Seguimiento de recursos provisionados
- **Change Management**: Gestión de cambios y actualizaciones
- **Lifecycle Management**: Gestión completa del ciclo de vida

### **Gestión de Acceso**
- **Role-based Access**: Acceso basado en roles y permisos
- **Self-service Portal**: Portal de autoservicio para usuarios
- **Product Sharing**: Compartir productos entre cuentas y usuarios
- **Access Control**: Control granular de acceso a productos
- **Audit Trail**: Registro completo de actividades

## Conceptos Clave

### **Product**
- Entidad que representa un servicio o infraestructura desplegable
- Contiene plantillas de CloudFormation y metadatos
- Puede tener múltiples versiones
- Define parámetros y opciones de configuración

### **Portfolio**
- Colección de productos relacionados
- Se puede asignar a usuarios o grupos
- Permite gestión por departamento o función
- Soporta políticas y restricciones a nivel de portafolio

### **Provisioned Product**
- Instancia desplegada de un producto del catálogo
- Contiene los recursos AWS creados
- Puede ser gestionado y actualizado
- Tiene su propio ciclo de vida

### **Constraint**
- Regla que aplica restricciones a productos
- Puede ser de plantilla, IAM o etiquetado
- Se aplica a nivel de portafolio o producto
- Garantiza cumplimiento normativo

## Arquitectura de AWS Service Catalog

### **Flujo de Despliegue**
```
Service Catalog Administrator
├── Create Portfolio
│   ├── Define Products
│   ├── Set Constraints
│   ├── Configure Permissions
│   └── Set Approval Workflows
├── Share Portfolio
│   ├── Select Users/Groups
│   ├── Set Access Level
│   ├── Configure Notifications
│   └── Enable Self-service
└── Monitor Usage
    ├── Track Provisioned Products
    ├── Monitor Compliance
    │   └── Generate Reports

Service Catalog User
├── Browse Catalog
│   ├── Search Products
│   ├── View Details
│   └── Check Availability
├── Launch Product
│   ├── Select Version
│   ├── Configure Parameters
│   ├── Request Approval (if required)
│   └── Provision Resources
└── Manage Product
    ├── View Resources
    ├── Update Configuration
    ├── Terminate Product
    └── Request Changes
```

### **Modelo de Gobernanza**
```
Service Catalog
├── Portfolios
│   ├── Products
│   │   ├── CloudFormation Templates
│   │   ├── Parameters
│   │   └── Metadata
│   ├── Constraints
│   │   ├── Template Constraints
│   │   ├── IAM Constraints
│   │   └── Tagging Constraints
│   └── Access Controls
│       ├── User Permissions
│       ├── Group Permissions
│       └── Role Permissions
└── Provisioned Products
    ├── AWS Resources
    ├── Configuration Data
    ├── Compliance Status
    └── Lifecycle Management
```

## Configuración de AWS Service Catalog

### **Gestión Completa de AWS Service Catalog**
```python
import boto3
import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class ServiceCatalogManager:
    def __init__(self, region='us-east-1'):
        self.service_catalog = boto3.client('servicecatalog', region_name=region)
        self.cloudformation = boto3.client('cloudformation', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.sns = boto3.client('sns', region_name=region)
        self.region = region
    
    def create_portfolio(self, display_name, description, provider_name=None,
                        accept_language=None, tags=None):
        """Crear portafolio"""
        
        try:
            params = {
                'DisplayName': display_name,
                'Description': description
            }
            
            if provider_name:
                params['ProviderName'] = provider_name
            
            if accept_language:
                params['AcceptLanguage'] = accept_language
            
            if tags:
                params['Tags'] = tags
            
            response = self.service_catalog.create_portfolio(**params)
            
            return {
                'success': True,
                'portfolio_id': response['PortfolioDetail']['Id'],
                'portfolio_arn': response['PortfolioDetail']['ARN'],
                'display_name': display_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_portfolio(self, portfolio_id, accept_language=None):
        """Obtener detalles del portafolio"""
        
        try:
            params = {'Id': portfolio_id}
            
            if accept_language:
                params['AcceptLanguage'] = accept_language
            
            response = self.service_catalog.describe_portfolio(**params)
            
            portfolio_info = {
                'portfolio_id': response['PortfolioDetail']['Id'],
                'portfolio_arn': response['PortfolioDetail']['ARN'],
                'display_name': response['PortfolioDetail']['DisplayName'],
                'description': response['PortfolioDetail']['Description'],
                'provider_name': response['PortfolioDetail'].get('ProviderName', ''),
                'created_time': response['PortfolioDetail']['CreatedTime'].isoformat(),
                'tags': response.get('Tags', [])
            }
            
            return {
                'success': True,
                'portfolio': portfolio_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_portfolios(self, accept_language=None, page_size=20, page_token=None):
        """Listar portafolios"""
        
        try:
            params = {'PageSize': page_size}
            
            if accept_language:
                params['AcceptLanguage'] = accept_language
            
            if page_token:
                params['PageToken'] = page_token
            
            response = self.service_catalog.list_portfolios(**params)
            
            portfolios = []
            for portfolio in response['PortfolioDetails']:
                portfolio_info = {
                    'portfolio_id': portfolio['Id'],
                    'portfolio_arn': portfolio['ARN'],
                    'display_name': portfolio['DisplayName'],
                    'description': portfolio['Description'],
                    'provider_name': portfolio.get('ProviderName', ''),
                    'created_time': portfolio['CreatedTime'].isoformat()
                }
                portfolios.append(portfolio_info)
            
            return {
                'success': True,
                'portfolios': portfolios,
                'count': len(portfolios),
                'next_page_token': response.get('NextPageToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_portfolio(self, portfolio_id, display_name=None, description=None,
                        provider_name=None, accept_language=None, add_tags=None,
                        remove_tags=None):
        """Actualizar portafolio"""
        
        try:
            params = {'Id': portfolio_id}
            
            if display_name:
                params['DisplayName'] = display_name
            
            if description:
                params['Description'] = description
            
            if provider_name:
                params['ProviderName'] = provider_name
            
            if accept_language:
                params['AcceptLanguage'] = accept_language
            
            if add_tags:
                params['AddTags'] = add_tags
            
            if remove_tags:
                params['RemoveTags'] = remove_tags
            
            response = self.service_catalog.update_portfolio(**params)
            
            return {
                'success': True,
                'portfolio_id': portfolio_id,
                'updated': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_portfolio(self, portfolio_id, accept_language=None):
        """Eliminar portafolio"""
        
        try:
            params = {'Id': portfolio_id}
            
            if accept_language:
                params['AcceptLanguage'] = accept_language
            
            response = self.service_catalog.delete_portfolio(**params)
            
            return {
                'success': True,
                'portfolio_id': portfolio_id,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_product(self, name, owner, description, distributor, support_description,
                      support_email, support_url, product_type, accept_language=None,
                      tags=None):
        """Crear producto"""
        
        try:
            params = {
                'Name': name,
                'Owner': owner,
                'Description': description,
                'Distributor': distributor,
                'SupportDescription': support_description,
                'SupportEmail': support_email,
                'SupportUrl': support_url,
                'ProductType': product_type
            }
            
            if accept_language:
                params['AcceptLanguage'] = accept_language
            
            if tags:
                params['Tags'] = tags
            
            response = self.service_catalog.create_product(**params)
            
            return {
                'success': True,
                'product_id': response['ProductViewDetail']['ProductViewSummary']['Id'],
                'product_arn': response['ProductViewDetail']['ProductViewSummary']['ProductARN'],
                'product_name': name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_product(self, product_id, accept_language=None):
        """Obtener detalles del producto"""
        
        try:
            params = {'Id': product_id}
            
            if accept_language:
                params['AcceptLanguage'] = accept_language
            
            response = self.service_catalog.describe_product(**params)
            
            product_info = {
                'product_id': response['ProductViewDetail']['ProductViewSummary']['Id'],
                'product_arn': response['ProductViewDetail']['ProductViewSummary']['ProductARN'],
                'product_name': response['ProductViewDetail']['ProductViewSummary']['Name'],
                'product_type': response['ProductViewDetail']['ProductViewSummary']['ProductType'],
                'owner': response['ProductViewDetail']['ProductViewSummary']['Owner'],
                'description': response['ProductViewDetail']['ProductViewSummary']['Description'],
                'distributor': response['ProductViewDetail']['ProductViewSummary']['Distributor'],
                'support_description': response['ProductViewDetail']['ProductViewSummary']['SupportDescription'],
                'support_email': response['ProductViewDetail']['ProductViewSummary']['SupportEmail'],
                'support_url': response['ProductViewDetail']['ProductViewSummary']['SupportUrl'],
                'created_time': response['ProductViewDetail']['ProductViewSummary']['CreatedTime'].isoformat()
            }
            
            return {
                'success': True,
                'product': product_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_products(self, accept_language=None, page_size=20, page_token=None):
        """Listar productos"""
        
        try:
            params = {'PageSize': page_size}
            
            if accept_language:
                params['AcceptLanguage'] = accept_language
            
            if page_token:
                params['PageToken'] = page_token
            
            response = self.service_catalog.list_products(**params)
            
            products = []
            for product in response['ProductViewDetails']:
                product_info = {
                    'product_id': product['ProductViewSummary']['Id'],
                    'product_arn': product['ProductViewSummary']['ProductARN'],
                    'product_name': product['ProductViewSummary']['Name'],
                    'product_type': product['ProductViewSummary']['ProductType'],
                    'owner': product['ProductViewSummary']['Owner'],
                    'description': product['ProductViewSummary']['Description'],
                    'created_time': product['ProductViewSummary']['CreatedTime'].isoformat()
                }
                products.append(product_info)
            
            return {
                'success': True,
                'products': products,
                'count': len(products),
                'next_page_token': response.get('NextPageToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_provisioning_artifact(self, product_id, name, description, info_type,
                                     info, accept_language=None, disable_template_validation=None):
        """Crear artefacto de aprovisionamiento"""
        
        try:
            params = {
                'ProductId': product_id,
                'Name': name,
                'Description': description,
                'InfoType': info_type,
                'Info': info
            }
            
            if accept_language:
                params['AcceptLanguage'] = accept_language
            
            if disable_template_validation is not None:
                params['DisableTemplateValidation'] = disable_template_validation
            
            response = self.service_catalog.create_provisioning_artifact(**params)
            
            return {
                'success': True,
                'provisioning_artifact_id': response['ProvisioningArtifactDetail']['Id'],
                'product_id': product_id,
                'name': name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_provisioning_artifact(self, product_name, provisioning_artifact_id,
                                      accept_language=None):
        """Obtener detalles del artefacto de aprovisionamiento"""
        
        try:
            params = {
                'ProductName': product_name,
                'ProvisioningArtifactId': provisioning_artifact_id
            }
            
            if accept_language:
                params['AcceptLanguage'] = accept_language
            
            response = self.service_catalog.describe_provisioning_artifact(**params)
            
            artifact_info = {
                'provisioning_artifact_id': response['ProvisioningArtifactDetail']['Id'],
                'name': response['ProvisioningArtifactDetail']['Name'],
                'description': response['ProvisioningArtifactDetail']['Description'],
                'info_type': response['ProvisioningArtifactDetail']['InfoType'],
                'info': response['ProvisioningArtifactDetail']['Info'],
                'created_time': response['ProvisioningArtifactDetail']['CreatedTime'].isoformat(),
                'active': response['ProvisioningArtifactDetail']['Active']
            }
            
            return {
                'success': True,
                'provisioning_artifact': artifact_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def associate_product_with_portfolio(self, portfolio_id, product_id, accept_language=None):
        """Asociar producto a portafolio"""
        
        try:
            params = {
                'PortfolioId': portfolio_id,
                'ProductId': product_id
            }
            
            if accept_language:
                params['AcceptLanguage'] = accept_language
            
            response = self.service_catalog.associate_product_with_portfolio(**params)
            
            return {
                'success': True,
                'portfolio_id': portfolio_id,
                'product_id': product_id,
                'associated': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def disassociate_product_from_portfolio(self, portfolio_id, product_id, accept_language=None):
        """Desasociar producto de portafolio"""
        
        try:
            params = {
                'PortfolioId': portfolio_id,
                'ProductId': product_id
            }
            
            if accept_language:
                params['AcceptLanguage'] = accept_language
            
            response = self.service_catalog.disassociate_product_from_portfolio(**params)
            
            return {
                'success': True,
                'portfolio_id': portfolio_id,
                'product_id': product_id,
                'disassociated': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_constraint(self, portfolio_id, product_id, parameters, type, description=None,
                         accept_language=None):
        """Crear restricción"""
        
        try:
            params = {
                'PortfolioId': portfolio_id,
                'ProductId': product_id,
                'Parameters': parameters,
                'Type': type
            }
            
            if description:
                params['Description'] = description
            
            if accept_language:
                params['AcceptLanguage'] = accept_language
            
            response = self.service_catalog.create_constraint(**params)
            
            return {
                'success': True,
                'constraint_id': response['ConstraintDetail']['ConstraintParameters'],
                'portfolio_id': portfolio_id,
                'product_id': product_id,
                'type': type
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_constraint(self, accept_language=None, id=None):
        """Obtener detalles de restricción"""
        
        try:
            params = {'Id': id}
            
            if accept_language:
                params['AcceptLanguage'] = accept_language
            
            response = self.service_catalog.describe_constraint(**params)
            
            constraint_info = {
                'constraint_id': response['ConstraintDetail']['ConstraintParameters'],
                'portfolio_id': response['ConstraintDetail']['PortfolioId'],
                'product_id': response['ConstraintDetail']['ProductId'],
                'type': response['ConstraintDetail']['Type'],
                'description': response['ConstraintDetail'].get('Description', ''),
                'status': response['ConstraintDetail']['Status']
            }
            
            return {
                'success': True,
                'constraint': constraint_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_constraint(self, accept_language=None, id=None):
        """Eliminar restricción"""
        
        try:
            params = {'Id': id}
            
            if accept_language:
                params['AcceptLanguage'] = accept_language
            
            response = self.service_catalog.delete_constraint(**params)
            
            return {
                'success': True,
                'constraint_id': id,
                'deleted': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def provision_product(self, product_name, provisioning_artifact_name, provisioning_parameters,
                         provisioned_product_name, provisioned_product_display_name,
                         tags=None, notification_arns=None, path_id=None, accept_language=None):
        """Aprovisionar producto"""
        
        try:
            params = {
                'ProductName': product_name,
                'ProvisioningArtifactName': provisioning_artifact_name,
                'ProvisioningParameters': provisioning_parameters,
                'ProvisionedProductName': provisioned_product_name,
                'ProvisionedProductDisplayName': provisioned_product_display_name
            }
            
            if tags:
                params['Tags'] = tags
            
            if notification_arns:
                params['NotificationArns'] = notification_arns
            
            if path_id:
                params['PathId'] = path_id
            
            if accept_language:
                params['AcceptLanguage'] = accept_language
            
            response = self.service_catalog.provision_product(**params)
            
            return {
                'success': True,
                'record_detail': response['RecordDetail'],
                'provisioned_product_id': response['RecordDetail']['ProvisionedProductId'],
                'status': response['RecordDetail']['Status']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_provisioned_product(self, accept_language=None, id=None, name=None):
        """Obtener detalles del producto aprovisionado"""
        
        try:
            params = {}
            
            if id:
                params['Id'] = id
            
            if name:
                params['Name'] = name
            
            if accept_language:
                params['AcceptLanguage'] = accept_language
            
            response = self.service_catalog.describe_provisioned_product(**params)
            
            product_info = {
                'provisioned_product_id': response['ProvisionedProductDetail']['Id'],
                'provisioned_product_name': response['ProvisionedProductDetail']['Name'],
                'provisioned_product_display_name': response['ProvisionedProductDetail']['ProvisionedProductDisplayName'],
                'product_id': response['ProvisionedProductDetail']['ProductId'],
                'provisioning_artifact_id': response['ProvisionedProductDetail']['ProvisioningArtifactId'],
                'status': response['ProvisionedProductDetail']['Status'],
                'created_time': response['ProvisionedProductDetail']['CreatedTime'].isoformat(),
                'last_record_id': response['ProvisionedProductDetail']['LastRecordId'],
                'tags': response['ProvisionedProductDetail'].get('Tags', [])
            }
            
            return {
                'success': True,
                'provisioned_product': product_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_provisioned_product(self, accept_language=None, provisioning_parameters=None,
                                 provisioning_preferences=None, product_id=None,
                                 provisioning_artifact_id=None, provisioned_product_id=None,
                                 provisioned_product_name=None):
        """Actualizar producto aprovisionado"""
        
        try:
            params = {}
            
            if accept_language:
                params['AcceptLanguage'] = accept_language
            
            if provisioning_parameters:
                params['ProvisioningParameters'] = provisioning_parameters
            
            if provisioning_preferences:
                params['ProvisioningPreferences'] = provisioning_preferences
            
            if product_id:
                params['ProductId'] = product_id
            
            if provisioning_artifact_id:
                params['ProvisioningArtifactId'] = provisioning_artifact_id
            
            if provisioned_product_id:
                params['ProvisionedProductId'] = provisioned_product_id
            
            if provisioned_product_name:
                params['ProvisionedProductName'] = provisioned_product_name
            
            response = self.service_catalog.update_provisioned_product(**params)
            
            return {
                'success': True,
                'record_detail': response['RecordDetail'],
                'provisioned_product_id': response['RecordDetail']['ProvisionedProductId'],
                'status': response['RecordDetail']['Status']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def terminate_provisioned_product(self, accept_language=None, ignore_errors=None,
                                    provisioned_product_id=None, provisioned_product_name=None,
                                    retain_physical_resources=None):
        """Terminar producto aprovisionado"""
        
        try:
            params = {}
            
            if accept_language:
                params['AcceptLanguage'] = accept_language
            
            if ignore_errors:
                params['IgnoreErrors'] = ignore_errors
            
            if provisioned_product_id:
                params['ProvisionedProductId'] = provisioned_product_id
            
            if provisioned_product_name:
                params['ProvisionedProductName'] = provisioned_product_name
            
            if retain_physical_resources:
                params['RetainPhysicalResources'] = retain_physical_resources
            
            response = self.service_catalog.terminate_provisioned_product(**params)
            
            return {
                'success': True,
                'record_detail': response['RecordDetail'],
                'provisioned_product_id': response['RecordDetail']['ProvisionedProductId'],
                'status': response['RecordDetail']['Status']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def search_products_as_admin(self, accept_language=None, page_size=20, page_token=None,
                                 product_source=None, filters=None):
        """Buscar productos como administrador"""
        
        try:
            params = {'PageSize': page_size}
            
            if accept_language:
                params['AcceptLanguage'] = accept_language
            
            if page_token:
                params['PageToken'] = page_token
            
            if product_source:
                params['ProductSource'] = product_source
            
            if filters:
                params['Filters'] = filters
            
            response = self.service_catalog.search_products_as_admin(**params)
            
            products = []
            for product in response['ProductViewDetails']:
                product_info = {
                    'product_id': product['ProductViewSummary']['Id'],
                    'product_arn': product['ProductViewSummary']['ProductARN'],
                    'product_name': product['ProductViewSummary']['Name'],
                    'product_type': product['ProductViewSummary']['ProductType'],
                    'owner': product['ProductViewSummary']['Owner'],
                    'description': product['ProductViewSummary']['Description'],
                    'created_time': product['ProductViewSummary']['CreatedTime'].isoformat()
                }
                products.append(product_info)
            
            return {
                'success': True,
                'products': products,
                'count': len(products),
                'next_page_token': response.get('NextPageToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_complete_service_catalog_setup(self, setup_config):
        """Crear configuración completa de Service Catalog"""
        
        try:
            setup_results = {
                'portfolios': {},
                'products': {},
                'constraints': {},
                'associations': {},
                'status': 'IN_PROGRESS'
            }
            
            # 1. Crear portafolios
            for portfolio_name, portfolio_config in setup_config.get('portfolios', {}).items():
                portfolio_result = self.create_portfolio(
                    display_name=portfolio_config['display_name'],
                    description=portfolio_config['description'],
                    provider_name=portfolio_config.get('provider_name', ''),
                    tags=portfolio_config.get('tags')
                )
                
                if portfolio_result['success']:
                    setup_results['portfolios'][portfolio_name] = portfolio_result['portfolio_id']
            
            # 2. Crear productos
            for product_name, product_config in setup_config.get('products', {}).items():
                product_result = self.create_product(
                    name=product_config['name'],
                    owner=product_config['owner'],
                    description=product_config['description'],
                    distributor=product_config['distributor'],
                    support_description=product_config['support_description'],
                    support_email=product_config['support_email'],
                    support_url=product_config['support_url'],
                    product_type=product_config['product_type'],
                    tags=product_config.get('tags')
                )
                
                if product_result['success']:
                    setup_results['products'][product_name] = product_result['product_id']
                    
                    # Crear artefacto de aprovisionamiento
                    artifact_result = self.create_provisioning_artifact(
                        product_id=product_result['product_id'],
                        name=product_config['artifact']['name'],
                        description=product_config['artifact']['description'],
                        info_type=product_config['artifact']['info_type'],
                        info=product_config['artifact']['info']
                    )
                    
                    if artifact_result['success']:
                        setup_results['products'][f'{product_name}_artifact'] = artifact_result['provisioning_artifact_id']
            
            # 3. Asociar productos a portafolios
            for portfolio_name, portfolio_id in setup_results['portfolios'].items():
                portfolio_config = setup_config['portfolios'][portfolio_name]
                
                for product_name in portfolio_config.get('products', []):
                    if product_name in setup_results['products']:
                        product_id = setup_results['products'][product_name]
                        
                        associate_result = self.associate_product_with_portfolio(
                            portfolio_id=portfolio_id,
                            product_id=product_id
                        )
                        
                        if associate_result['success']:
                            if portfolio_name not in setup_results['associations']:
                                setup_results['associations'][portfolio_name] = []
                            setup_results['associations'][portfolio_name].append(product_name)
            
            # 4. Crear restricciones
            for constraint_name, constraint_config in setup_config.get('constraints', {}).items():
                constraint_result = self.create_constraint(
                    portfolio_id=setup_results['portfolios'][constraint_config['portfolio']],
                    product_id=setup_results['products'][constraint_config['product']],
                    parameters=constraint_config['parameters'],
                    type=constraint_config['type'],
                    description=constraint_config.get('description', '')
                )
                
                if constraint_result['success']:
                    setup_results['constraints'][constraint_name] = constraint_result['constraint_id']
            
            setup_results['status'] = 'COMPLETED'
            
            return {
                'success': True,
                'setup_results': setup_results
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_service_catalog_usage(self, time_range_days=30):
        """Analizar uso de Service Catalog"""
        
        try:
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(days=time_range_days)
            
            # Simulación de análisis de uso
            usage_analysis = {
                'time_range': {
                    'start_time': start_time.isoformat(),
                    'end_time': end_time.isoformat()
                },
                'portfolios': {
                    'total_portfolios': 8,
                    'active_portfolios': 7,
                    'inactive_portfolios': 1,
                    'total_products': 25,
                    'average_products_per_portfolio': 3.1
                },
                'products': {
                    'total_products': 25,
                    'cloudformation_products': 18,
                    'terraform_products': 5,
                    'marketplace_products': 2,
                    'active_products': 23,
                    'deprecated_products': 2
                },
                'provisioned_products': {
                    'total_provisioned': 150,
                    'active_provisioned': 125,
                    'failed_provisioned': 5,
                    'terminated_provisioned': 20,
                    'success_rate': 96.7,
                    'average_provisioning_time': 8.5  # minutos
                },
                'constraints': {
                    'total_constraints': 35,
                    'template_constraints': 15,
                    'iam_constraints': 12,
                    'tagging_constraints': 8,
                    'active_constraints': 33,
                    'violations': 3
                },
                'compliance': {
                    'compliant_products': 22,
                    'non_compliant_products': 3,
                    'compliance_score': 88.0,
                    'last_audit_date': end_time.isoformat(),
                    'critical_violations': 0,
                    'warning_violations': 3
                },
                'cost_impact': {
                    'estimated_monthly_savings': 3500.00,
                    'resources_standardized': 180,
                    'automation_savings': 1200.00,
                    'compliance_savings': 800.00,
                    'operational_savings': 1500.00
                },
                'user_adoption': {
                    'total_users': 45,
                    'active_users': 38,
                    'provisioning_frequency': 3.2,  # por usuario por mes
                    'self_service_adoption': 85.5,  # porcentaje
                    'user_satisfaction': 4.2  # escala 1-5
                }
            }
            
            # Generar recomendaciones
            recommendations = []
            
            if usage_analysis['provisioned_products']['success_rate'] < 95:
                recommendations.append({
                    'priority': 'HIGH',
                    'category': 'RELIABILITY',
                    'title': 'Improve provisioning success rate',
                    'description': f'Success rate is {usage_analysis["provisioned_products"]["success_rate"]}%',
                    'action': 'Review templates and improve error handling'
                })
            
            if usage_analysis['constraints']['violations'] > 0:
                recommendations.append({
                    'priority': 'MEDIUM',
                    'category': 'COMPLIANCE',
                    'title': 'Address constraint violations',
                    'description': f'{usage_analysis["constraints"]["violations"]} constraint violations detected',
                    'action': 'Review and remediate constraint violations'
                })
            
            if usage_analysis['products']['deprecated_products'] > 0:
                recommendations.append({
                    'priority': 'LOW',
                    'category': 'MAINTENANCE',
                    'title': 'Update deprecated products',
                    'description': f'{usage_analysis["products"]["deprecated_products"]} products are deprecated',
                    'action': 'Update or replace deprecated products'
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
    
    def generate_service_catalog_report(self, report_type='comprehensive', time_range_days=30):
        """Generar reporte de Service Catalog"""
        
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
                portfolios_result = self.list_portfolios()
                if portfolios_result['success']:
                    report['portfolios'] = portfolios_result['portfolios']
                    report['portfolio_count'] = portfolios_result['count']
                
                products_result = self.list_products()
                if products_result['success']:
                    report['products'] = products_result['products']
                    report['product_count'] = products_result['count']
                
                usage_result = self.analyze_service_catalog_usage(time_range_days)
                if usage_result['success']:
                    report['usage_analysis'] = usage_result['usage_analysis']
            
            elif report_type == 'portfolios':
                # Reporte de portafolios
                portfolios_result = self.list_portfolios()
                if portfolios_result['success']:
                    report['portfolios'] = portfolios_result['portfolios']
                    
                    # Agrupar por proveedor
                    report['portfolios_by_provider'] = {}
                    for portfolio in portfolios_result['portfolios']:
                        provider = portfolio['provider_name'] or 'Unknown'
                        if provider not in report['portfolios_by_provider']:
                            report['portfolios_by_provider'][provider] = []
                        report['portfolios_by_provider'][provider].append(portfolio)
            
            elif report_type == 'products':
                # Reporte de productos
                products_result = self.list_products()
                if products_result['success']:
                    report['products'] = products_result['products']
                    
                    # Agrupar por tipo
                    report['products_by_type'] = {}
                    for product in products_result['products']:
                        product_type = product['product_type']
                        if product_type not in report['products_by_type']:
                            report['products_by_type'][product_type] = []
                        report['products_by_type'][product_type].append(product)
            
            elif report_type == 'usage':
                # Reporte de uso
                usage_result = self.analyze_service_catalog_usage(time_range_days)
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

### **1. Crear Portafolio Completo**
```python
# Ejemplo: Crear portafolio de infraestructura
manager = ServiceCatalogManager('us-east-1')

# Crear portafolio
portfolio_result = manager.create_portfolio(
    display_name='Infrastructure Services',
    description='Catálogo de productos de infraestructura aprobados',
    provider_name='Infrastructure Team',
    tags=[
        {'Key': 'Department', 'Value': 'Infrastructure'},
        {'Key': 'Environment', 'Value': 'Production'}
    ]
)

if portfolio_result['success']:
    print(f"Portfolio created:")
    print(f"  ID: {portfolio_result['portfolio_id']}")
    print(f"  Name: {portfolio_result['display_name']}")
    
    # Obtener detalles
    portfolio_info = manager.describe_portfolio(portfolio_result['portfolio_id'])
    if portfolio_info['success']:
        portfolio = portfolio_info['portfolio']
        print(f"  ARN: {portfolio['portfolio_arn']}")
        print(f"  Created: {portfolio['created_time']}")
```

### **2. Crear Producto CloudFormation**
```python
# Ejemplo: Crear producto de VPC
manager = ServiceCatalogManager('us-east-1')

# Crear producto
product_result = manager.create_product(
    name='Standard VPC',
    owner='Network Team',
    description='VPC estándar con subredes públicas y privadas',
    distributor='AWS Internal',
    support_description='Soporte de red 24/7',
    support_email='network-team@company.com',
    support_url='https://internal.company.com/network-support',
    product_type='CLOUD_FORMATION_TEMPLATE',
    tags=[
        {'Key': 'Category', 'Value': 'Networking'},
        {'Key': 'Compliance', 'Value': 'Approved'}
    ]
)

if product_result['success']:
    print(f"Product created:")
    print(f"  ID: {product_result['product_id']}")
    print(f"  Name: {product_result['product_name']}")
    
    # Crear artefacto de aprovisionamiento
    artifact_result = manager.create_provisioning_artifact(
        product_id=product_result['product_id'],
        name='VPC Template v1.0',
        description='Plantilla CloudFormation para VPC estándar',
        info_type='CLOUDFORMATION_TEMPLATE',
        info={
            'TemplateUrl': 'https://s3.amazonaws.com/cloudformation-templates/vpc-template.yaml'
        }
    )
    
    if artifact_result['success']:
        print(f"  Artifact ID: {artifact_result['provisioning_artifact_id']}")
```

### **3. Configuración Completa de Service Catalog**
```python
# Ejemplo: Configurar Service Catalog completo
manager = ServiceCatalogManager('us-east-1')

# Definir configuración completa
setup_config = {
    'portfolios': {
        'infrastructure': {
            'display_name': 'Infrastructure Services',
            'description': 'Catálogo de productos de infraestructura',
            'provider_name': 'Infrastructure Team',
            'products': ['vpc-standard', 'ec2-webserver', 'rds-database'],
            'tags': [{'Key': 'Department', 'Value': 'Infrastructure'}]
        },
        'applications': {
            'display_name': 'Application Services',
            'description': 'Catálogo de productos de aplicaciones',
            'provider_name': 'Application Team',
            'products': ['web-app', 'api-gateway', 'microservice'],
            'tags': [{'Key': 'Department', 'Value': 'Applications'}]
        }
    },
    'products': {
        'vpc-standard': {
            'name': 'Standard VPC',
            'owner': 'Network Team',
            'description': 'VPC estándar con subredes',
            'distributor': 'AWS Internal',
            'support_description': 'Soporte de red',
            'support_email': 'network@company.com',
            'support_url': 'https://internal.company.com/network',
            'product_type': 'CLOUD_FORMATION_TEMPLATE',
            'artifact': {
                'name': 'VPC Template v1.0',
                'description': 'Plantilla VPC',
                'info_type': 'CLOUDFORMATION_TEMPLATE',
                'info': {
                    'TemplateUrl': 'https://s3.amazonaws.com/templates/vpc.yaml'
                }
            },
            'tags': [{'Key': 'Category', 'Value': 'Networking'}]
        },
        'ec2-webserver': {
            'name': 'EC2 Web Server',
            'owner': 'Compute Team',
            'description': 'Servidor web EC2 estándar',
            'distributor': 'AWS Internal',
            'support_description': 'Soporte de cómputo',
            'support_email': 'compute@company.com',
            'support_url': 'https://internal.company.com/compute',
            'product_type': 'CLOUD_FORMATION_TEMPLATE',
            'artifact': {
                'name': 'EC2 Template v1.0',
                'description': 'Plantilla EC2',
                'info_type': 'CLOUD_FORMATION_TEMPLATE',
                'info': {
                    'TemplateUrl': 'https://s3.amazonaws.com/templates/ec2.yaml'
                }
            },
            'tags': [{'Key': 'Category', 'Value': 'Compute'}]
        }
    },
    'constraints': {
        'vpc-tagging': {
            'portfolio': 'infrastructure',
            'product': 'vpc-standard',
            'parameters': json.dumps({
                'Rules': [
                    {
                        'TagKey': 'Environment',
                        'TagValue': ['Production', 'Staging', 'Development'],
                        'Compliance': 'required'
                    }
                ]
            }),
            'type': 'TAG',
            'description': 'Requerir etiquetas de entorno'
        }
    }
}

# Crear configuración completa
setup_result = manager.create_complete_service_catalog_setup(setup_config)

if setup_result['success']:
    setup = setup_result['setup_results']
    print(f"Service Catalog setup completed:")
    print(f"  Status: {setup['status']}")
    print(f"  Portfolios: {len(setup['portfolios'])}")
    print(f"  Products: {len(setup['products'])}")
    print(f"  Constraints: {len(setup['constraints'])}")
    print(f"  Associations: {len(setup['associations'])}")
```

### **4. Aprovisionar Producto**
```python
# Ejemplo: Aprovisionar VPC desde catálogo
manager = ServiceCatalogManager('us-east-1')

# Aprovisionar producto
provision_result = manager.provision_product(
    product_name='Standard VPC',
    provisioning_artifact_name='VPC Template v1.0',
    provisioning_parameters=[
        {
            'ParameterKey': 'VPCCIDR',
            'ParameterValue': '10.0.0.0/16'
        },
        {
            'ParameterKey': 'PublicSubnetCIDR',
            'ParameterValue': '10.0.1.0/24'
        },
        {
            'ParameterKey': 'PrivateSubnetCIDR',
            'ParameterValue': '10.0.2.0/24'
        },
        {
            'ParameterKey': 'Environment',
            'ParameterValue': 'Production'
        }
    ],
    provisioned_product_name='prod-vpc-001',
    provisioned_product_display_name='Production VPC 001',
    tags=[
        {'Key': 'Owner', 'Value': 'John Doe'},
        {'Key': 'Project', 'Value': 'WebApp'}
    ]
)

if provision_result['success']:
    record = provision_result['record_detail']
    print(f"Product provisioning initiated:")
    print(f"  Provisioned Product ID: {record['ProvisionedProductId']}")
    print(f"  Status: {record['Status']}")
    print(f"  Record ID: {record['RecordId']}")
    
    # Esperar y verificar estado
    time.sleep(30)
    
    product_info = manager.describe_provisioned_product(id=record['ProvisionedProductId'])
    if product_info['success']:
        product = product_info['provisioned_product']
        print(f"  Current Status: {product['status']}")
        print(f"  Created: {product['created_time']}")
```

### **5. Crear y Aplicar Restricciones**
```python
# Ejemplo: Crear restricción de etiquetado
manager = ServiceCatalogManager('us-east-1')

# Crear restricción de etiquetado
constraint_result = manager.create_constraint(
    portfolio_id='port-12345678',
    product_id='prod-12345678',
    parameters=json.dumps({
        'Rules': [
            {
                'TagKey': 'Environment',
                'TagValue': ['Production', 'Staging', 'Development'],
                'Compliance': 'required'
            },
            {
                'TagKey': 'Owner',
                'TagValue': '.*',
                'Compliance': 'required'
            },
            {
                'TagKey': 'CostCenter',
                'TagValue': ['Marketing', 'Engineering', 'Operations'],
                'Compliance': 'optional'
            }
        ]
    }),
    type='TAG',
    description='Requerir etiquetas obligatorias'
)

if constraint_result['success']:
    print(f"Constraint created:")
    print(f"  Constraint ID: {constraint_result['constraint_id']}")
    print(f"  Type: {constraint_result['type']}")
    
    # Obtener detalles
    constraint_info = manager.describe_constraint(id=constraint_result['constraint_id'])
    if constraint_info['success']:
        constraint = constraint_info['constraint']
        print(f"  Status: {constraint['status']}")
        print(f"  Portfolio: {constraint['portfolio_id']}")
        print(f"  Product: {constraint['product_id']}')

# Crear restricción de plantilla
template_constraint = manager.create_constraint(
    portfolio_id='port-12345678',
    product_id='prod-12345678',
    parameters=json.dumps({
        'Rules': [
            {
                'RuleType': 'TemplateParameter',
                'RuleName': 'AllowedInstanceTypes',
                'RuleDescription': 'Restringir tipos de instancia EC2',
                'ParameterName': 'InstanceType',
                'AllowedValues': ['t3.micro', 't3.small', 't3.medium']
            }
        ]
    }),
    type='TEMPLATE',
    description='Restringir tipos de instancia permitidos'
)

if template_constraint['success']:
    print(f"Template constraint created:")
    print(f"  Constraint ID: {template_constraint['constraint_id']}")
```

### **6. Análisis de Uso**
```python
# Ejemplo: Analizar uso de Service Catalog
manager = ServiceCatalogManager('us-east-1')

usage_result = manager.analyze_service_catalog_usage(time_range_days=30)

if usage_result['success']:
    usage = usage_result['usage_analysis']
    
    print(f"Service Catalog Usage Analysis (Last 30 Days)")
    print(f"  Time Range: {usage['time_range']['start_time']} to {usage['time_range']['end_time']}")
    
    print(f"\nPortfolios:")
    portfolios = usage['portfolios']
    print(f"  Total: {portfolios['total_portfolios']}")
    print(f"  Active: {portfolios['active_portfolios']}")
    print(f"  Inactive: {portfolios['inactive_portfolios']}")
    print(f"  Average Products per Portfolio: {portfolios['average_products_per_portfolio']}")
    
    print(f"\nProducts:")
    products = usage['products']
    print(f"  Total: {products['total_products']}")
    print(f"  CloudFormation: {products['cloudformation_products']}")
    print(f"  Terraform: {products['terraform_products']}")
    print(f"  Marketplace: {products['marketplace_products']}")
    print(f"  Active: {products['active_products']}")
    
    print(f"\nProvisioned Products:")
    provisioned = usage['provisioned_products']
    print(f"  Total: {provisioned['total_provisioned']}")
    print(f"  Active: {provisioned['active_provisioned']}")
    print(f"  Failed: {provisioned['failed_provisioned']}")
    print(f"  Success Rate: {provisioned['success_rate']}%")
    print(f"  Average Provisioning Time: {provisioned['average_provisioning_time']} minutes")
    
    print(f"\nConstraints:")
    constraints = usage['constraints']
    print(f"  Total: {constraints['total_constraints']}")
    print(f"  Template: {constraints['template_constraints']}")
    print(f"  IAM: {constraints['iam_constraints']}")
    print(f"  Tagging: {constraints['tagging_constraints']}")
    print(f"  Violations: {constraints['violations']}")
    
    print(f"\nCompliance:")
    compliance = usage['compliance']
    print(f"  Compliant Products: {compliance['compliant_products']}")
    print(f"  Non-compliant Products: {compliance['non_compliant_products']}")
    print(f"  Compliance Score: {compliance['compliance_score']}%")
    print(f"  Critical Violations: {compliance['critical_violations']}")
    print(f"  Warning Violations: {compliance['warning_violations']}")
    
    print(f"\nCost Impact:")
    cost = usage['cost_impact']
    print(f"  Estimated Monthly Savings: ${cost['estimated_monthly_savings']:,.2f}")
    print(f"  Resources Standardized: {cost['resources_standardized']}")
    print(f"  Automation Savings: ${cost['automation_savings']:,.2f}")
    print(f"  Compliance Savings: ${cost['compliance_savings']:,.2f}")
    print(f"  Operational Savings: ${cost['operational_savings']:,.2f}")
    
    # Recomendaciones
    recommendations = usage['recommendations']
    print(f"\nRecommendations: {len(recommendations)}")
    for rec in recommendations:
        print(f"  [{rec['priority']}] {rec['title']}")
        print(f"    {rec['description']}")
        print(f"    Action: {rec['action']}")
```

### **7. Generar Reporte Comprehensivo**
```python
# Ejemplo: Generar reporte completo
manager = ServiceCatalogManager('us-east-1')

report_result = manager.generate_service_catalog_report(report_type='comprehensive', time_range_days=30)

if report_result['success']:
    report = report_result['report']
    
    print(f"Service Catalog Report")
    print(f"  Generated at: {report['report_metadata']['generated_at']}")
    print(f"  Time Range: {report['report_metadata']['time_range']['start_time']} to {report['report_metadata']['time_range']['end_time']}")
    
    if 'portfolio_count' in report:
        print(f"\nPortfolios: {report['portfolio_count']}")
    
    if 'product_count' in report:
        print(f"Products: {report['product_count']}")
    
    if 'usage_analysis' in report:
        usage = report['usage_analysis']
        print(f"\nUsage Summary:")
        print(f"  Total Portfolios: {usage['portfolios']['total_portfolios']}")
        print(f"  Total Products: {usage['products']['total_products']}")
        print(f"  Active Provisioned: {usage['provisioned_products']['active_provisioned']}")
        print(f"  Success Rate: {usage['provisioned_products']['success_rate']}%")
        print(f"  Compliance Score: {usage['compliance']['compliance_score']}%")
        print(f"  Monthly Savings: ${usage['cost_impact']['estimated_monthly_savings']:,.2f}")
```

### **8. Gestión de Ciclo de Vida**
```python
# Ejemplo: Gestión completa del ciclo de vida
manager = ServiceCatalogManager('us-east-1')

# 1. Aprovisionar producto
provision_result = manager.provision_product(
    product_name='EC2 Web Server',
    provisioning_artifact_name='EC2 Template v1.0',
    provisioning_parameters=[
        {'ParameterKey': 'InstanceType', 'ParameterValue': 't3.micro'},
        {'ParameterKey': 'Environment', 'ParameterValue': 'Development'}
    ],
    provisioned_product_name='dev-webserver-001',
    provisioned_product_display_name='Dev Web Server 001'
)

if provision_result['success']:
    provisioned_id = provision_result['record_detail']['ProvisionedProductId']
    print(f"Product provisioned: {provisioned_id}")
    
    # 2. Actualizar producto aprovisionado
    time.sleep(60)  # Esperar a que se complete el aprovisionamiento
    
    update_result = manager.update_provisioned_product(
        provisioning_parameters=[
            {'ParameterKey': 'InstanceType', 'ParameterValue': 't3.small'}
        ],
        provisioned_product_id=provisioned_id
    )
    
    if update_result['success']:
        print(f"Product update initiated: {update_result['record_detail']['RecordId']}")
        
        # 3. Terminar producto aprovisionado
        time.sleep(60)  # Esperar a que se complete la actualización
        
        terminate_result = manager.terminate_provisioned_product(
            provisioned_product_id=provisioned_id,
            retain_physical_resources=False
        )
        
        if terminate_result['success']:
            print(f"Product termination initiated: {terminate_result['record_detail']['RecordId']}")
```

## Configuración con AWS CLI

### **Portafolios**
```bash
# Crear portafolio
aws servicecatalog create-portfolio \
  --display-name "Infrastructure Services" \
  --description "Catálogo de infraestructura" \
  --provider-name "Infrastructure Team"

# Listar portafolios
aws servicecatalog list-portfolios

# Describir portafolio
aws servicecatalog describe-portfolio --id port-12345678

# Actualizar portafolio
aws servicecatalog update-portfolio \
  --id port-12345678 \
  --display-name "Updated Infrastructure Services"

# Eliminar portafolio
aws servicecatalog delete-portfolio --id port-12345678
```

### **Productos**
```bash
# Crear producto
aws servicecatalog create-product \
  --name "Standard VPC" \
  --owner "Network Team" \
  --description "VPC estándar" \
  --distributor "AWS Internal" \
  --support-description "Soporte de red" \
  --support-email "network@company.com" \
  --support-url "https://internal.company.com/network" \
  --product-type "CLOUD_FORMATION_TEMPLATE"

# Listar productos
aws servicecatalog list-products

# Describir producto
aws servicecatalog describe-product --id prod-12345678

# Crear artefacto de aprovisionamiento
aws servicecatalog create-provisioning-artifact \
  --product-id prod-12345678 \
  --name "VPC Template v1.0" \
  --description "Plantilla VPC" \
  --info-type "CLOUD_FORMATION_TEMPLATE" \
  --info TemplateUrl=https://s3.amazonaws.com/templates/vpc.yaml
```

### **Asociaciones y Restricciones**
```bash
# Asociar producto a portafolio
aws servicecatalog associate-product-with-portfolio \
  --portfolio-id port-12345678 \
  --product-id prod-12345678

# Desasociar producto
aws servicecatalog disassociate-product-from-portfolio \
  --portfolio-id port-12345678 \
  --product-id prod-12345678

# Crear restricción
aws servicecatalog create-constraint \
  --portfolio-id port-12345678 \
  --product-id prod-12345678 \
  --parameters '{"Rules":[{"TagKey":"Environment","TagValue":["Production","Staging"],"Compliance":"required"}]}' \
  --type "TAG" \
  --description "Requerir etiquetas de entorno"
```

### **Aprovisionamiento**
```bash
# Aprovisionar producto
aws servicecatalog provision-product \
  --product-name "Standard VPC" \
  --provisioning-artifact-name "VPC Template v1.0" \
  --provisioning-parameters ParameterKey=VPCCIDR,ParameterValue=10.0.0.0/16 \
  --provisioned-product-name "prod-vpc-001" \
  --provisioned-product-display-name "Production VPC 001"

# Describir producto aprovisionado
aws servicecatalog describe-provisioned-product --id pp-12345678

# Actualizar producto aprovisionado
aws servicecatalog update-provisioned-product \
  --provisioned-product-id pp-12345678 \
  --provisioning-parameters ParameterKey=VPCCIDR,ParameterValue=10.1.0.0/16

# Terminar producto aprovisionado
aws servicecatalog terminate-provisioned-product \
  --provisioned-product-id pp-12345678
```

## Mejores Prácticas

### **1. Diseño de Catálogo**
- **Standardization**: Estandarizar productos y configuraciones
- **Naming Convention**: Usar convenciones de nomenclatura consistentes
- **Version Control**: Controlar versiones de productos y plantillas
- **Documentation**: Documentar productos y su uso
- **Regular Review**: Revisar y actualizar catálogo regularmente

### **2. Gestión de Productos**
- **Template Validation**: Validar plantillas antes de publicar
- **Parameter Management**: Gestionar parámetros de forma efectiva
- **Testing**: Probar productos en entornos no productivos
- **Security**: Implementar seguridad en plantillas
- **Cost Optimization**: Optimizar costos en productos

### **3. Restricciones y Cumplimiento**
- **Mandatory Constraints**: Implementar restricciones obligatorias
- **Tagging Policies**: Aplicar políticas de etiquetado
- **IAM Constraints**: Controlar acceso con restricciones IAM
- **Compliance Monitoring**: Monitorear cumplimiento continuo
- **Regular Audits**: Realizar auditorías regulares

### **4. Operaciones**
- **Self-service**: Habilitar autoservicio para usuarios
- **Approval Workflows**: Implementar flujos de aprobación
- **Monitoring**: Monitorear aprovisionamiento y uso
- **Cost Tracking**: Rastrear costos por producto
- **Automation**: Automatizar operaciones repetitivas

## Costos

### **Precios de AWS Service Catalog**
- **Service**: GRATIS
- **No hay cargos**: Por usar AWS Service Catalog
- **AWS Resources**: Los costos provienen de los recursos aprovisionados
- **Data Transfer**: Costos de transferencia de datos estándar
- **API Calls**: Sin costo por llamadas a API

### **Costos Asociados**
- **Provisioned Resources**: Costos de recursos AWS aprovisionados
- **Storage**: Costos de almacenamiento de plantillas
- **Compute**: Costos de cómputo en productos aprovisionados
- **Data Transfer**: Costos de transferencia entre regiones

## Troubleshooting

### **Problemas Comunes**
1. **Template Validation Errors**: Revisar sintaxis de plantillas CloudFormation
2. **Permission Issues**: Verificar permisos de IAM
3. **Constraint Violations**: Revisar y corregir violaciones de restricciones
4. **Provisioning Failures**: Investigar errores de aprovisionamiento

### **Comandos de Diagnóstico**
```bash
# Verificar estado de producto aprovisionado
aws servicecatalog describe-provisioned-product --id pp-12345678

# Verificar historial de aprovisionamiento
aws servicecatalog scan-provisioned-products --product-id prod-12345678

# Verificar restricciones
aws servicecatalog list-constraints-for-portfolio --portfolio-id port-12345678

# Verificar estado de producto
aws servicecatalog describe-product --id prod-12345678
```

## Cumplimiento Normativo

### **GDPR**
- **Data Protection**: Protección de datos en productos
- **Access Control**: Control de acceso granular
- **Audit Trail**: Registro completo de actividades
- **Compliance Monitoring**: Monitoreo continuo

### **HIPAA**
- **Secure Products**: Productos seguros para datos PHI
- **Access Logging**: Registro de acceso a datos
- **Encryption**: Cifrado obligatorio en productos
- **Compliance**: Cumplimiento con estándares HIPAA

### **PCI DSS**
- **Compliant Products**: Productos conformes con PCI
- **Network Isolation**: Aislamiento de red en productos
- **Security Controls**: Controles de seguridad implementados
- **Audit Logging**: Logging completo y seguro

### **SOC 2**
- **Security Controls**: Controles de seguridad en productos
- **Access Management**: Gestión de acceso centralizada
- **Compliance**: Cumplimiento con estándares SOC 2
- **Documentation**: Documentación completa

## Integración con Otros Servicios

### **AWS CloudFormation**
- **Template Integration**: Integración nativa con plantillas
- **Resource Management**: Gestión de recursos CloudFormation
- **Stack Operations**: Operaciones de stack automatizadas
- **Change Management**: Gestión de cambios y actualizaciones

### **AWS IAM**
- **Access Control**: Control de acceso basado en IAM
- **Role Management**: Gestión de roles para productos
- **Permission Integration**: Integración con permisos IAM
- **Security**: Seguridad basada en IAM

### **AWS S3**
- **Template Storage**: Almacenamiento de plantillas en S3
- **Version Control**: Control de versiones de plantillas
- **Access Control**: Control de acceso a plantillas
- **Backup**: Backup de plantillas y configuraciones

### **AWS CloudWatch**
- **Monitoring**: Monitoreo de aprovisionamiento
- **Alarms**: Alarmas para eventos críticos
- **Metrics**: Métricas de uso y rendimiento
- **Logging**: Logging de operaciones y errores

# AWS Directory Service

## Definición

AWS Directory Service es un servicio que permite conectar y utilizar directorios existentes en la nube o crear y administrar nuevos directorios en AWS. Proporciona múltiples opciones de directorio para diferentes casos de uso y requisitos.

## Tipos de Directorios

### AWS Managed Microsoft AD
- Directorio Active Directory totalmente gestionado por AWS
- Compatible con Windows Server
- Permite integración con aplicaciones Windows existentes
- Soporta trusts con directorios on-premises
- Incluye controladores de dominio gestionados
- Parches y mantenimiento automático

### AD Connector
- Proxy de directorio que conecta a Active Directory on-premises
- No almacena datos de directorio en AWS
- Permite que aplicaciones en AWS se autentiquen contra AD existente
- Ideal para migraciones híbridas
- Baja latencia para autenticación

### Simple AD
- Directorio compatible con Active Directory básico
- Opción de menor costo
- No incluye todas las características de AD completo
- Adecuado para casos de uso simples

### Cognito User Pools
- Directorio de usuarios gestionado para aplicaciones web y móviles
- Basado en estándares (OAuth 2.0, SAML, OpenID Connect)
- Escalabilidad automática
- Integración con proveedores de identidad social

## Características Principales

- **Alta Disponibilidad**: Réplicas automáticas en múltiples AZs
- **Seguridad**: Cifrado de datos en reposo y en tránsito
- **Integración**: Compatible con aplicaciones Windows y Linux
- **Gestión Simplificada**: AWS maneja el mantenimiento y parches
- **Escalabilidad**: Se adapta automáticamente a la demanda
- **Híbrido**: Conectividad con directorios on-premises
- **Cumplimiento**: Cumple con estándares de seguridad y compliance

## Casos de Uso Comunes

1. **Autenticación de Aplicaciones**: Aplicaciones Windows y Linux requieren autenticación AD
2. **Migraciones Híbridas**: Integración entre infraestructura on-premises y AWS
3. **Gestión de Usuarios**: Centralización de identidad y acceso
4. **Single Sign-On (SSO)**: Acceso unificado a múltiples aplicaciones
5. **Gestión de Policías**: Aplicación de GPOs y políticas de seguridad
6. **Recursos Compartidos**: Gestión de permisos para archivos y recursos

## Funcionalidades

### Gestión de Usuarios y Grupos
- Creación y administración de usuarios
- Gestión de grupos y membresías
- Policías de contraseñas
- Bloqueo de cuentas

### Autenticación y Autorización
- Kerberos y NTLM
- LDAP
- Integración con aplicaciones
- MFA (Multi-Factor Authentication)

### Integración con AWS
- EC2 instances pueden unirse al dominio
- RDS puede usar autenticación de Windows
- Lambda puede acceder al directorio
- Integración con otros servicios AWS

### Trusts y Federación
- Trusts con directorios externos
- Federación con SAML
- Integración con proveedores de identidad

## Ventajas

- Elimina la necesidad de gestionar infraestructura de directorios
- Reduce costos operativos
- Proporciona alta disponibilidad y redundancia
- Facilita migraciones a la nube
- Integración nativa con servicios AWS
- Seguridad enterprise-ready
- Cumplimiento con regulaciones

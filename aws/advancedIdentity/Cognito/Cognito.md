# Amazon Cognito

## Definición

Amazon Cognito es un servicio de gestión de identidad de usuario que proporciona registro, inicio de sesión y control de acceso para usuarios de aplicaciones web y móviles. Ofrece dos componentes principales: User Pools y Identity Pools.

## Componentes Principales

### User Pools (Grupos de Usuarios)
- Directorio de usuarios para registro y autenticación
- Soporta inicio de sesión con email/contraseña, teléfono, y proveedores de identidad social (Google, Facebook, Apple, etc.)
- Gestión de perfiles de usuario
- Autenticación multifactor (MFA)
- Personalización de flujos de autenticación
- Integración con Lambda para lógica personalizada

### Identity Pools (Grupos de Identidad Federada)
- Proporciona credenciales AWS temporales a usuarios
- Permite acceso a recursos de AWS (S3, DynamoDB, etc.)
- Soporta múltiples proveedores de identidad:
  - Cognito User Pools
  - Proveedores sociales (Google, Facebook, Amazon, Apple)
  - Proveedores SAML (Active Directory, etc.)
  - Proveedores OpenID Connect
  - Autenticación anónima para usuarios no autenticados

## Características Principales

- **Escalabilidad Automática**: Maneja millones de usuarios sin configuración adicional
- **Seguridad**: Cifrado de datos en reposo y en tránsito
- **Cumplimiento**: Cumple con HIPAA, GDPR, PCI DSS
- **Integración**: Funciona con otros servicios AWS y bibliotecas de SDK
- **Personalización**: Interfaz de usuario de inicio de sesión personalizable (Hosted UI)
- **MFA**: Autenticación multifactor con SMS o aplicaciones TOTP
- **Gestión de Contraseñas**: Políticas de contraseña, recuperación, y cambio
- **Auditoría**: Logs de autenticación y eventos de usuario

## Casos de Uso Comunes

1. **Aplicaciones Web y Móviles**: Registro y autenticación de usuarios
2. **Acceso a Recursos AWS**: Otorgar acceso controlado a servicios AWS
3. **Federación de Identidad**: Integración con sistemas de identidad existentes
4. **Usuarios Invitados**: Acceso temporal para usuarios externos
5. **Acceso Anónimo**: Permitir acceso sin autenticación para ciertas funciones

## Flujos de Autenticación

### User Pool Flow
1. Usuario se registra o inicia sesión
2. Cognito valida las credenciales
3. Retorna tokens JWT (ID, Access, Refresh)
4. Aplicación usa tokens para autenticar solicitudes

### Identity Pool Flow
1. Usuario obtiene token del proveedor de identidad
2. Token se intercambia por credenciales AWS temporales
3. Credenciales permiten acceso a recursos AWS
4. Permisos se definen mediante roles IAM

## Ventajas

- Elimina la necesidad de construir y mantener sistemas de autenticación
- Reduce el tiempo de desarrollo
- Proporciona seguridad enterprise-ready
- Escala automáticamente con la base de usuarios
- Integración sencilla con aplicaciones existentes
- Soporte para múltiples métodos de autenticación

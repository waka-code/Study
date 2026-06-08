# AWS IAM Identity Center

AWS IAM Identity Center (anteriormente conocido como AWS Single Sign-On - SSO) es un servicio completamente administrado que facilita la administración centralizada de acceso de usuarios a múltiples aplicaciones y servicios de AWS. Proporciona una solución de inicio de sesión único (SSO) para empresas de cualquier tamaño.

## Características principales

- **Inicio de sesión único (SSO):**
  - Los usuarios se autentican una sola vez para acceder a múltiples aplicaciones.
- **Administración centralizada de usuarios y grupos:**
  - Gestiona usuarios y grupos desde una ubicación central o integra con un directorio externo.
- **Integración con directorios:**
  - Compatible con AWS Directory Service, Microsoft Active Directory, OKTA, Ping Identity, y otros proveedores de identidad.
- **Control de acceso basado en roles:**
  - Asigna permisos a usuarios mediante roles y pertenencia a grupos.
- **Auditoría y cumplimiento:**
  - Registra acciones de acceso y autenticación para auditoría.
- **Multi-cuenta de AWS:**
  - Administra acceso a múltiples cuentas de AWS de manera centralizada.

## Casos de uso

- **Administración de acceso empresarial:**
  - Gestionar acceso de empleados a servicios de AWS y aplicaciones SaaS.
- **Integración con Active Directory:**
  - Sincronizar usuarios y grupos desde Active Directory de manera automática.
- **Acceso a múltiples cuentas:**
  - Permitir que usuarios accedan a múltiples cuentas de AWS con credenciales centralizadas.
- **Cumplimiento normativo:**
  - Mantener auditorías y registros de acceso para cumplimiento regulatorio.

## Beneficios

- **Simplificación:**
  - Reduce la complejidad de gestión de acceso en entornos empresariales.
- **Seguridad mejorada:**
  - Autenticación centralizada y política de contraseñas consistente.
- **Experiencia de usuario mejorada:**
  - Los usuarios utilizan un único conjunto de credenciales para acceder a todos los servicios.
- **Escalabilidad:**
  - Maneja de manera eficiente grandes organizaciones con miles de usuarios.

## Ejemplo de configuración

### Habilitar IAM Identity Center
```bash
aws sso-admin create-instance \
    --name MiInstanciaSSO
```

### Crear un grupo
```bash
aws identitystore create-group \
    --identity-store-id d-1234567890 \
    --display-name MiGrupo \
    --description "Grupo de desarrollo"
```

### Crear un usuario
```bash
aws identitystore create-user \
    --identity-store-id d-1234567890 \
    --user-name usuario-test \
    --name GivenName=Juan,FamilyName=Pérez \
    --emails Value=juan.perez@example.com,Primary=true
```

### Asignar un usuario a un grupo
```bash
aws identitystore create-group-membership \
    --identity-store-id d-1234567890 \
    --group-id group-1234567890 \
    --member-id member-1234567890
```

## Arquitectura de IAM Identity Center

```
┌─────────────────────────────────────────────────────┐
│         IAM Identity Center (SSO)                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐    ┌──────────────────┐          │
│  │  Directorio  │───→│  Gestión Central │          │
│  │   Externo    │    │   de Usuarios    │          │
│  │ (Active Dir) │    │   y Grupos       │          │
│  └──────────────┘    └──────────────────┘          │
│         ↓                      ↓                     │
│  ┌─────────────────────────────────────────┐       │
│  │        Portal de Acceso SSO             │       │
│  │  (URL única para todos los usuarios)    │       │
│  └─────────────────────────────────────────┘       │
│         ↓              ↓              ↓             │
│  ┌────────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Cuentas   │  │  Apps    │  │ Aplicaciones │   │
│  │   AWS      │  │  AWS     │  │   SaaS       │   │
│  └────────────┘  └──────────┘  └──────────────┘   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Flujo de autenticación

1. **Usuario accede al portal SSO:**
   - El usuario navega a la URL del portal de IAM Identity Center.

2. **Autenticación:**
   - El usuario proporciona sus credenciales o se autentica mediante el proveedor de identidad integrado.

3. **Autorización:**
   - IAM Identity Center verifica los permisos del usuario basándose en su membresía en grupos.

4. **Acceso concedido:**
   - El usuario obtiene acceso a las aplicaciones y servicios autorizados.

## Buenas prácticas

1. **Usar directorios corporativos:**
   - Integra con Active Directory o proveedores de identidad existentes para sincronización automática.

2. **Administración de grupos:**
   - Usa grupos para gestionar permisos de manera escalable y centralizada.

3. **Auditoría:**
   - Habilita el registro de CloudTrail para auditar accesos y cambios de configuración.

4. **Política de contraseñas:**
   - Configura políticas de contraseñas fuertes en el directorio de IAM Identity Center.

5. **Acceso Multi-Factor (MFA):**
   - Requiere MFA para autenticación adicional de seguridad.

6. **Revisión periódica:**
   - Revisa periódicamente los permisos de usuarios y elimina acceso innecesario.

## Integración con otros servicios AWS

- **AWS Management Console:**
  - Los usuarios pueden acceder a múltiples cuentas desde el console de AWS.
- **AWS CLI:**
  - Integración con AWS CLI para acceso desde la línea de comandos.
- **Aplicaciones empresariales:**
  - Soporta integración con aplicaciones SaaS como Salesforce, ServiceNow, Slack, etc.

## Limitaciones

- **Compatibilidad:**
  - Algunas características avanzadas de AD pueden no estar completamente soportadas.
- **Costo:**
  - Costo por usuario en algunas configuraciones avanzadas.
- **Migración:**
  - La migración desde AWS Single Sign-On heredado requiere planificación cuidadosa.

## Recursos adicionales

- [Documentación oficial de AWS IAM Identity Center](https://docs.aws.amazon.com/singlesignon/)
- [Guía de inicio rápido](https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html)
- [Integración con directorios](https://docs.aws.amazon.com/singlesignon/latest/userguide/manage-your-identity-source.html)
- [Ejemplos de uso](https://github.com/aws-samples/aws-sso-samples)
# Modelo de responsabilidad compartida en AWS

## AWS se encarga de:
- Infraestructura (seguridad de la red global)
- Análisis de configuración y vulnerabilidad
- Validación de la conformidad

## El administrador (tú) se encarga de:
- Gestión y supervisión de usuarios, grupos, roles y políticas
- Habilitar MFA en todas las cuentas
- Rotar todas las claves con frecuencia
- Utilizar las herramientas IAM para aplicar los permisos adecuados
- Analizar los patrones de acceso y revisar los permisos

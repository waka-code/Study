# IAM (Identity and Access Management) en AWS

IAM es el servicio de AWS que permite gestionar de forma segura el acceso a los recursos de AWS. Permite crear y administrar usuarios, grupos, roles y políticas para controlar quién puede hacer qué en tu cuenta de AWS.

---

## Claves de acceso, CLI y SDK
- **Claves de acceso**: Permiten el acceso programático a AWS (CLI, SDK, API REST).
- **CLI**: Herramienta de línea de comandos para interactuar con AWS usando credenciales IAM.
- **SDK**: Bibliotecas para programar aplicaciones que interactúan con AWS usando credenciales IAM.

**Ejemplo de configuración CLI:**
```sh
aws configure
```

---

## Roles comunes
- **Roles de instancia EC2**: Permiten que una instancia EC2 acceda a servicios AWS sin almacenar claves en la máquina.
- **Roles de función Lambda**: Permiten que una función Lambda acceda a otros servicios AWS.
- **Role para CloudFormation**: Permite que CloudFormation cree y gestione recursos en nombre del usuario.

---

## Herramientas de seguridad
- **MFA (Multi-Factor Authentication)**: Añade una capa extra de seguridad.
- **Políticas de contraseña**: Define requisitos de complejidad y rotación.
- **Acceso mínimo necesario**: Aplica el principio de menor privilegio.
- **CloudTrail**: Audita el uso de IAM y los accesos.

---

## IAM Credential Report
Un informe que enumera todos los usuarios de tu cuenta y el estado de sus credenciales (contraseñas, claves de acceso, MFA, etc.).

**Cómo generarlo:**
```sh
aws iam generate-credential-report
aws iam get-credential-report --query Content --output text | base64 -d > credential-report.csv
```

---

## IAM Access Advisor
Muestra los permisos de servicio concedidos a un usuario y cuándo se accedió a esos servicios por última vez. Útil para revisar y ajustar políticas.

---

## Modelo de responsabilidad compartida

### AWS
- Infraestructura (seguridad de la red global)
- Análisis de configuración y vulnerabilidad
- Validación de la conformidad

### Administrador (tú)
- Gestión y supervisión de usuarios, grupos, roles y políticas
- Habilitar MFA en todas las cuentas
- Rotar todas las claves con frecuencia
- Utilizar las herramientas IAM para aplicar los permisos adecuados
- Analizar los patrones de acceso y revisar los permisos

---

## CloudShell
- Terminal administrada por AWS para ejecutar comandos CLI sin configurar credenciales locales.
- Funciona a nivel de región.
- Permite acceso rápido y seguro a recursos AWS desde el navegador.

---

## Recursos útiles
- [Documentación oficial IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html)
- [Buenas prácticas de IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS CLI IAM](https://docs.aws.amazon.com/cli/latest/reference/iam/index.html)

# Object Lock

Amazon S3 Object Lock permite almacenar objetos utilizando un modelo WORM (Write Once, Read Many), lo que ayuda a prevenir la eliminación o modificación de datos durante un período de retención especificado. Esto es útil para cumplir con requisitos regulatorios o de cumplimiento.

## Características
- **Modos de retención:**
  - **Governance mode:** Permite que ciertos usuarios con permisos especiales sobrescriban o eliminen objetos bloqueados.
  - **Compliance mode:** No permite que nadie sobrescriba o elimine objetos bloqueados durante el período de retención.
- **Período de retención:**
  - Se puede configurar un período de retención para cada objeto.
- **Marcas legales (Legal Hold):**
  - Permite bloquear objetos indefinidamente hasta que se elimine la marca legal.

## Casos de Uso
- Cumplimiento de normativas regulatorias.
- Protección contra eliminaciones accidentales o maliciosas.
- Archivos que requieren retención a largo plazo.

## Configuración
1. Crear un bucket con Object Lock habilitado.
2. Configurar el modo de retención y el período deseado.
3. Subir objetos al bucket con las configuraciones de retención aplicadas.

## Ejemplo de Configuración con AWS CLI
```sh
aws s3api create-bucket --bucket my-object-lock-bucket --object-lock-enabled-for-bucket --region us-east-1

aws s3api put-object-lock-configuration --bucket my-object-lock-bucket --object-lock-configuration "Rule={DefaultRetention={Mode=GOVERNANCE,Days=30}}"
```
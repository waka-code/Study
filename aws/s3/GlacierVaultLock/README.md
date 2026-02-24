# Glacier Vault Lock

Amazon S3 Glacier Vault Lock permite configurar políticas de control de acceso inmutables en un "vault" de Glacier. Esto asegura que las políticas no puedan ser modificadas después de ser bloqueadas, ayudando a cumplir con requisitos regulatorios y de cumplimiento.

## Características
- **Políticas inmutables:**
  - Una vez que una política está bloqueada, no puede ser modificada ni eliminada.
- **Cumplimiento:**
  - Ayuda a cumplir con normativas como SEC 17a-4(f), FINRA y otros requisitos regulatorios.
- **Configuración flexible:**
  - Permite definir políticas detalladas antes de bloquearlas.

## Casos de Uso
- Cumplimiento de normativas regulatorias.
- Protección de datos archivados contra modificaciones accidentales o maliciosas.
- Archivos que requieren retención a largo plazo con políticas estrictas.

## Configuración
1. Crear un vault en Amazon S3 Glacier.
2. Configurar una política de Vault Lock.
3. Bloquear la política para hacerla inmutable.

## Ejemplo de Configuración con AWS CLI
```sh
aws glacier create-vault --account-id - --vault-name my-vault

aws glacier initiate-vault-lock --account-id - --vault-name my-vault --policy file://policy.json

aws glacier complete-vault-lock --account-id - --vault-name my-vault --lock-id <lock-id>
```
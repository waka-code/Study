# Versionado (Versioning) en Amazon S3

## ¿Qué es el versionado en S3?
El versionado (versioning) es una característica de buckets de Amazon S3 que habilita el almacenamiento de múltiples versiones de un mismo objeto (mismo `key`). Cuando el versionado está activado en un bucket, cada vez que se sube un objeto con la misma clave, S3 crea una nueva versión y mantiene las versiones anteriores. 

El versionado ayuda a:
- Recuperar versiones previas después de una sobrescritura accidental.
- Recuperar objetos borrados (mediante eliminación de "delete markers" o restaurando versiones previas).
- Mantener un historial de cambios para auditoría y recuperación.

---

## Comportamiento clave
- El versionado se habilita por bucket (no por objeto).
- Al habilitar versionado, los objetos nuevos obtienen un `VersionId` distinto de `null`.
- Si el bucket NO tiene versionado, los objetos tienen `VersionId = null`.
- Cuando un objeto es borrado en un bucket versionado, S3 crea un **delete marker** (marca de borrado). El objeto "visualmente" desaparece, pero las versiones anteriores siguen existiendo.

---

## Estados de versionado
- `Enabled`: El bucket almacena versiones completas y asigna VersionId a cada objeto nuevo.
- `Suspended`: El bucket mantiene las versiones existentes, pero nuevos objetos subidos reciben `VersionId = null` (comportamiento no-versionado). Las versiones previas se mantienen.

**Nota:** Suspender no borra versiones anteriores; solo deja de versionar nuevas cargas.

---

## Habilitar / Consultar versionado (CLI)
- Habilitar versionado:
```sh
aws s3api put-bucket-versioning --bucket mi-bucket --versioning-configuration Status=Enabled
```
- Suspender versionado:
```sh
aws s3api put-bucket-versioning --bucket mi-bucket --versioning-configuration Status=Suspended
```
- Consultar estado de versionado:
```sh
aws s3api get-bucket-versioning --bucket mi-bucket
```

---

## Listar versiones de un objeto (CLI)
```sh
aws s3api list-object-versions --bucket mi-bucket --prefix ruta/archivo.txt
```
La salida incluye `Versions` y `DeleteMarkers`. Cada entrada `Version` contiene `VersionId`, `IsLatest`, `LastModified`.

---

## Recuperar (restaurar) una versión previa
- Método 1: Copiar la versión antigua a la misma clave (esto crea una nueva versión cuyo contenido es la versión copiada):
```sh
aws s3api copy-object \
  --bucket mi-bucket \
  --key ruta/archivo.txt \
  --copy-source mi-bucket/ruta/archivo.txt?versionId=VIRTUAL_VERSION_ID \
  --metadata-directive REPLACE
```
- Método 2: Eliminar el `delete marker` (si el objeto fue borrado recientemente y hay un `delete marker` como el último):
```sh
aws s3api delete-object --bucket mi-bucket --key ruta/archivo.txt --version-id DELETE_MARKER_VERSION_ID
```
Eliminar el delete marker hará que la versión previa más reciente vuelva a ser la visible.

---

## Eliminar versiones (peligro y consideraciones)
- Borrar una versión específica (esto elimina esa versión permanentemente):
```sh
aws s3api delete-object --bucket mi-bucket --key ruta/archivo.txt --version-id VERSION_ID
```
- Ten cuidado: eliminar versiones específicas es irreversible y puede requerir MFA si MFA Delete está activado.

---

## MFA Delete
- `MFA Delete` es una opción adicional que protege la eliminación de versiones y la modificación del estado de versionado. Requiere MFA (autenticación multifactor) para:
  - Eliminar versiones de objetos de forma permanente.
  - Cambiar el estado de versionado del bucket.
- **Importante:** Sólo el root account puede habilitar o deshabilitar MFA Delete y debe hacerse mediante la AWS CLI (no desde la consola). Requiere el token MFA del dispositivo del root.

Habilitar MFA Delete (ejemplo conceptual — requiere root y parámetros de MFA):
```sh
# Ejemplo ilustrativo (requiere parámetros MFA y uso de root):
aws s3api put-bucket-versioning \
  --bucket mi-bucket \
  --versioning-configuration Status=Enabled,MFADelete=Enabled \
  --mfa "arn:aws:iam::111122223333:mfa/root-account-mfa-device 123456"
```

---

## Reglas de lifecycle y manejo de versiones
El versionado aumenta el almacenamiento (cada versión ocupa espacio). Para controlar costos y cumplir políticas de retención, usa reglas de lifecycle:
- `NoncurrentVersionExpiration`: Elimina versiones no actuales después de N días.
- `NoncurrentVersionTransition`: Mueve versiones no actuales a clases de almacenamiento más baratas (Glacier, Deep Archive) tras N días.

Ejemplo de regla de lifecycle (JSON) — mover versiones no actuales a Glacier y eliminar tras 365 días:
```json
{
  "Rules": [
    {
      "ID": "ArchivarVersionesNoActuales",
      "Status": "Enabled",
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 30,
          "StorageClass": "GLACIER"
        }
      ],
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 365
      }
    }
  ]
}
```
Aplica la regla con `aws s3api put-bucket-lifecycle-configuration --bucket mi-bucket --lifecycle-configuration file://lifecycle.json`.

---

## Interacción con replicación entre regiones (CRR/Azure?)
- Para usar Cross-Region Replication (CRR) o Replication, el versionado **debe estar habilitado** en el bucket de origen y en el bucket de destino.
- La replicación copia versiones nuevos y mantiene el VersionId en el bucket destino (comportamiento depende de la configuración y del tipo de replicación).

---

## Costos y consideraciones económicas
- Cada versión cuenta como un objeto independiente a efectos de almacenamiento: tendrás que pagar por espacio y solicitudes.
- Utiliza lifecycle para mover versiones antiguas a almacenamiento más barato o para expirarlas.
- Monitoriza con `S3 Storage Lens` o métricas de CloudWatch para entender impacto del versionado.

---

## Buenas prácticas
- Habilita versionado para buckets con datos críticos (backups, configuraciones, artefactos) donde la pérdida por sobrescritura o borrado sea inaceptable.
- Configura reglas de lifecycle para controlar costos (transición y expiración de versiones no actuales).
- Considera activar MFA Delete para buckets extremadamente sensibles (nota: operación limitada al root account para habilitarlo).
- Prueba la recuperación de versiones en un entorno de pruebas para conocer el proceso y tiempos.
- Documenta políticas de retención (cuántos días/versión) y automatiza con lifecycle.
- Evita habilitar versionado en buckets temporales sin lifecycle — puede disparar costos inadvertidos.

---

## Casos prácticos / Ejemplos de uso
1. Backups de configuración: almacena configuraciones de infra en S3; ante un cambio erróneo, restaura versión previa.
2. Artefactos de despliegue: guarda binarios de releases; puedes recuperar un release anterior sobrescribiendo la clave con la versión deseada.
3. Logs transformados: si procesas y sobrescribes logs, versionado permite auditar cambios y recuperar datos previos.

---

## Comandos útiles rápidos
```sh
# Habilitar
aws s3api put-bucket-versioning --bucket mi-bucket --versioning-configuration Status=Enabled

# Ver estado
aws s3api get-bucket-versioning --bucket mi-bucket

# Listar versiones
aws s3api list-object-versions --bucket mi-bucket --prefix ruta/archivo.txt

# Eliminar una versión concreta (irrevocable)
aws s3api delete-object --bucket mi-bucket --key ruta/archivo.txt --version-id VERSION_ID

# Eliminar un delete marker (para "restaurar" visualmente el objeto)
aws s3api delete-object --bucket mi-bucket --key ruta/archivo.txt --version-id DELETE_MARKER_VERSION_ID
```

---

## Recursos
- Documentación oficial S3 Versioning: https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html
- Lifecycle configuration: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-configuration-examples.html
- Replication and versioning: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html

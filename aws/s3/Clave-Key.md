# Clave (Key) en Amazon S3

La **Clave (Key)** es el identificador único de cada objeto dentro de un bucket. Es similar a la ruta de un archivo en un sistema de archivos tradicional.

## Características
- Cada objeto en un bucket se identifica únicamente por su clave.
- Las claves pueden tener estructura de carpetas usando `/` (por ejemplo: `imagenes/2024/foto.jpg`).
- No hay jerarquía real, pero la consola de S3 simula carpetas usando las claves.

## Buenas prácticas
- Usa claves descriptivas y estructuradas (por ejemplo, `proyecto/fecha/archivo.txt`).
- Evita caracteres especiales problemáticos.

## Ejemplo
- Clave: `documentos/contrato.pdf`
- Clave: `backups/2026-01-19/db.sql`

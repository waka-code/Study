# Claves de acceso, CLI y SDK en IAM

## Claves de acceso
Permiten el acceso programático a AWS (CLI, SDK, API REST). Se componen de un Access Key ID y un Secret Access Key.

## CLI (Command Line Interface)
Herramienta para interactuar con AWS desde la terminal usando credenciales IAM.

**Ejemplo de configuración:**
```sh
aws configure
```

## SDK
Bibliotecas para programar aplicaciones que interactúan con AWS usando credenciales IAM.

**Ejemplo en Python (boto3):**
```python
import boto3
s3 = boto3.client('s3')
response = s3.list_buckets()
print(response)
```

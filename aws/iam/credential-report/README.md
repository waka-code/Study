# IAM Credential Report

Un informe que enumera todos los usuarios de tu cuenta y el estado de sus credenciales (contraseñas, claves de acceso, MFA, etc.).

**Cómo generarlo:**
```sh
aws iam generate-credential-report
aws iam get-credential-report --query Content --output text | base64 -d > credential-report.csv
```

**Columnas importantes:**
- user
- arn
- password_enabled
- mfa_active
- access_key_1_active
- access_key_2_active

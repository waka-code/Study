# Amazon AppStream 2.0

Amazon AppStream 2.0 es un servicio completamente administrado de transmisión de aplicaciones que permite a los usuarios acceder a aplicaciones de escritorio desde cualquier dispositivo. Es ideal para proporcionar acceso seguro a aplicaciones especializadas sin necesidad de instalarlas localmente.

## Características principales

- **Transmisión de aplicaciones:**
  - Transmite aplicaciones completas desde la nube al cliente sin descargas.
- **Compatibilidad con aplicaciones heredadas:**
  - Ejecuta aplicaciones Windows desktop antiguas y modernas.
- **Experiencia nativa:**
  - Acceso a aplicaciones con experiencia de usuario similar a la local.
- **Seguridad:**
  - Cifrado end-to-end, integración con IAM, y datos almacenados en la nube.
- **Escalabilidad:**
  - Escala automáticamente para manejar múltiples usuarios concurrentes.

## Diferencia entre AppStream 2.0 y WorkSpaces

| Característica | AppStream 2.0 | WorkSpaces |
|---|---|---|
| **Tipo** | Transmisión de aplicaciones | Escritorio virtual completo |
| **Uso** | Aplicaciones específicas | Escritorio completo |
| **Instalación** | Preconfiguradas | Personalizable |
| **Perfil de usuario** | Temporal | Persistente |
| **Casos de uso** | SaaS, acceso público | Trabajo remoto corporativo |

## Casos de uso

- **Aplicaciones de terceros:**
  - Proporcionar acceso a aplicaciones de software específico sin instalación local.
- **Software de diseño:**
  - Acceso a aplicaciones como AutoCAD, Adobe Creative Suite desde navegador.
- **Aplicaciones de tráining:**
  - Proporcionar herramientas de capacitación sin afectar dispositivos locales.
- **Acceso público seguro:**
  - Permitir que usuarios externos accedan a aplicaciones de manera segura.

## Beneficios

- **Facilidad de acceso:**
  - Los usuarios acceden desde un navegador sin instalación.
- **Seguridad mejorada:**
  - Las aplicaciones y datos residen en la nube, no en dispositivos locales.
- **Mantenimiento simplificado:**
  - Actualizaciones y parches centralizados.
- **Flexibilidad:**
  - Acceso desde cualquier dispositivo con navegador.

## Ejemplo de configuración

### Crear una pila de AppStream 2.0
```bash
aws appstream create-stack \
    --name MiPilaAppStream \
    --display-name "Mi Pila de Aplicaciones" \
    --instance-type stream.standard.medium
```

### Crear una flota
```bash
aws appstream create-fleet \
    --name MiFlotaAppStream \
    --instance-type stream.standard.medium \
    --image-name AppStream-WinServer2019-10-15-2021 \
    --desired-capacity 2
```

### Crear una asociación de pila y flota
```bash
aws appstream associate-fleet \
    --fleet-name MiFlotaAppStream \
    --stack-name MiPilaAppStream
```

### Crear un usuario
```bash
aws appstream create-user \
    --user-name usuario-test \
    --authentication-type USERPOOL \
    --first-name Juan \
    --last-name Pérez \
    --message-action SUPPRESS
```

## Arquitectura de Amazon AppStream 2.0

```
┌──────────────────────────────────────────────┐
│       Amazon AppStream 2.0                   │
├──────────────────────────────────────────────┤
│                                              │
│  ┌─────────────────────────────────────┐   │
│  │   Imágenes Personalizadas           │   │
│  │  (Aplicaciones preinstaladas)       │   │
│  └─────────────────────────────────────┘   │
│              ↓                              │
│  ┌─────────────────────────────────────┐   │
│  │   Flota de Instancias               │   │
│  │  (Streaming instances)              │   │
│  └─────────────────────────────────────┘   │
│    ↓        ↓        ↓        ↓            │
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐          │
│  │ I1 │  │ I2 │  │ I3 │  │ I4 │          │
│  └────┘  └────┘  └────┘  └────┘          │
│                                              │
│  ┌─────────────────────────────────────┐   │
│  │   Pila (Stack)                      │   │
│  │  (Configuración de usuario)         │   │
│  └─────────────────────────────────────┘   │
│                                              │
└──────────────────────────────────────────────┘
         ↓              ↓              ↓
    ┌─────────┐    ┌─────────┐    ┌────────┐
    │Navegador│    │ Cliente │    │ Tablet │
    │  Web    │    │AppStream│    │  iPad  │
    └─────────┘    └─────────┘    └────────┘
```

## Tipos de instancias

- **stream.standard.small:**
  - vCPU: 1, RAM: 2 GB, GPU: Ninguna. Ideal para aplicaciones ligeras.

- **stream.standard.medium:**
  - vCPU: 2, RAM: 4 GB, GPU: Ninguna. Uso general.

- **stream.standard.large:**
  - vCPU: 4, RAM: 8 GB, GPU: Ninguna. Aplicaciones moderadas.

- **stream.graphics.g4dn.xlarge:**
  - vCPU: 4, RAM: 16 GB, GPU: NVIDIA T4. Diseño y renderizado.

- **stream.graphics.g4dn.12xlarge:**
  - vCPU: 48, RAM: 192 GB, GPU: Múltiples NVIDIA T4. Aplicaciones intensivas en GPU.

## Modelos de entrega

- **Acceso persistente:**
  - Usuarios mantienen acceso continuo a sus aplicaciones.

- **Acceso temporal:**
  - Usuarios reciben acceso limitado a aplicaciones específicas.

## Buenas prácticas

1. **Seguridad:**
   - Configura políticas de acceso y requiere autenticación MFA.

2. **Monitoreo:**
   - Usa Amazon CloudWatch para supervisar el rendimiento y disponibilidad.

3. **Personalización de imágenes:**
   - Mantén imágenes actualizadas con parches de seguridad.

4. **Optimización de costos:**
   - Usa escalado automático basado en demanda.

5. **Gestión de sesiones:**
   - Configura tiempos de desconexión automática para usuarios inactivos.

## Integración con otros servicios AWS

- **Amazon VPC:**
  - AppStream 2.0 se ejecuta dentro de una VPC.

- **AWS IAM:**
  - Control de acceso a usuarios y administradores.

- **AWS Directory Service:**
  - Autenticación con Active Directory corporativo.

- **Amazon S3:**
  - Almacenamiento compartido de datos accesibles desde aplicaciones.

- **AWS CloudTrail:**
  - Auditoría de acceso a aplicaciones.

## Limitaciones

- **Costo:**
  - Costo por hora de instancia además de tarifas de streaming.

- **Compatibilidad:**
  - Algunas aplicaciones pueden no ser compatibles o requerir configuración especial.

- **Latencia:**
  - La experiencia depende de la calidad de la conexión a internet.

- **Licenciamiento:**
  - Requiere licencias adecuadas para las aplicaciones transmitidas.

## Recursos adicionales

- [Documentación oficial de Amazon AppStream 2.0](https://docs.aws.amazon.com/appstream2/)
- [Guía de inicio rápido](https://docs.aws.amazon.com/appstream2/latest/userguide/appstream-get-started.html)
- [Mejores prácticas](https://docs.aws.amazon.com/appstream2/latest/adminguide/best-practices.html)
- [Ejemplos de uso](https://github.com/aws-samples/amazon-appstream2-samples)
# Grupos de Seguridad en EC2

Los Grupos de Seguridad (Security Groups) son conjuntos de reglas que controlan el tráfico entrante y saliente de las instancias EC2.

## Características Clave
- **Stateful:**
  - Si permites tráfico entrante, la respuesta saliente se permite automáticamente.
- **Reglas Entrantes y Salientes:**
  - Controlan quién puede conectarse y a dónde puede salir la instancia.
- **Asociación Flexible:**
  - Un grupo de seguridad puede asociarse a múltiples instancias.

## Ejemplo de Reglas
### Entrantes (Inbound)
| Tipo  | Puerto | Origen       |
|-------|--------|--------------|
| HTTP  | 80     | 0.0.0.0/0    |
| HTTPS | 443    | 0.0.0.0/0    |
| SSH   | 22     | Tu IP        |

### Salientes (Outbound)
| Tipo        | Puerto | Destino    |
|-------------|--------|------------|
| All Traffic | All    | 0.0.0.0/0  |

## Buenas Prácticas
- Abrir solo los puertos necesarios.
- Limitar SSH/RDP a tu IP.
- Usar grupos de seguridad referenciados.
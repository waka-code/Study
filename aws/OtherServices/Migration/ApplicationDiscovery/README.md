# AWS Application Discovery Service

AWS Application Discovery Service ayuda a recopilar información sobre servidores on‑premises, su configuración, dependencias y uso, con el objetivo de facilitar la planificación de migraciones a la nube. Proporciona datos para comprender inventario, dependencias de aplicaciones y patrones de uso de recursos.

## Características principales

- **Inventario automático:** Detecta servidores, procesos, puertos y configuraciones.
- **Dependencias de aplicaciones:** Muestra llamadas entre servidores para mapear dependencias (network dependency mapping).
- **Recopilación de métricas de rendimiento:** Uso de CPU, memoria, I/O, redes y patrones de carga.
- **Integración con Migration Hub:** Permite centralizar el seguimiento de migraciones con AWS Migration Hub.
- **Agentes y métodos sin agente:** Soporta agente ligero para recolección detallada y opciones sin agente para inventarios básicos.
- **Exportación de datos:** Exporta datos a CSV o integraciones con otras herramientas para análisis.

## Casos de uso

- Inventario inicial para un proyecto de migración.
- Análisis de dependencias para identificar grupos de aplicación que deben migrarse juntos.
- Dimensionamiento y right‑sizing en la nube (estimación de instancias EC2/RDS necesarias).
- Identificar patrones de uso para elegir la estrategia 7R adecuada.

## Componentes

- **Collector (agente):** Agente ligero que se instala en servidores on‑prem para recoger datos detallados.
- **Discovery Connector:** Integraciones para entornos virtualizados (VMware) para extraer metadatos.
- **Data export:** Exportación a CSV o integración con AWS Migration Hub.

## Flujo de trabajo

1. Registrar el entorno en la consola de Application Discovery Service.
2. Desplegar agentes o configurar connectors (VMware) según el entorno.
3. Recopilar datos durante un periodo representativo (ej. 1–2 semanas) para capturar patrones de uso.
4. Analizar dependencias y métricas para segmentar aplicaciones y determinar RTO/RPO y patrones de migración.
5. Exportar resultados y usar Migration Hub / herramientas de planificación.

## Ejemplos (resumen CLI y pasos)

- Descargar e instalar el agente desde la consola y activar con el Activation Key.
- Para entornos VMware, usar el Discovery Connector (vCenter credentials) desde la consola.

> Nota: Application Discovery Service tiene integración principalmente vía consola y agentes; muchos pasos de activación se hacen desde la UI de AWS y requieren credenciales y permisos adecuados.

## Buenas prácticas

- Recopilar datos suficientes en tiempo (p. ej. 1–2 semanas) para capturar picos y patrones.
- Usar el mapping de dependencias para agrupar aplicaciones que deben migrarse juntas.
- Mantener agentes actualizados y asegurados (principio de menor privilegio).
- Integrar resultados con AWS Migration Hub para tracking centralizado.

## Limitaciones

- Requiere despliegue de agente para máxima visibilidad; entornos muy heterogéneos pueden necesitar trabajo adicional.
- Algunos datos detallados se obtienen mejor sobre periodos largos para capturar patrones estacionales.

## Recursos

- Documentación: https://docs.aws.amazon.com/application-discovery/
- Migration Hub integraciones: https://aws.amazon.com/migration-hub/

Ruta del archivo: `/Users/waddini/Study/aws/Migration/ApplicationDiscovery/README.md`

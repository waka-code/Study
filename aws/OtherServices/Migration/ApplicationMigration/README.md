# AWS Application Migration Service (MGN)

AWS Application Migration Service (anteriormente AWS Server Migration Service y CloudEndure; ahora MGN) es la solución recomendada para migrar servidores físicos, virtuales y en la nube a Amazon EC2 con mínima interrupción. Automatiza la replicación continua de servidores y simplifica el proceso de corte (cutover).

## Características principales

- **Replicación continua:** Captura cambios en tiempo casi real y los replica a AWS.
- **Conversión automatizada:** Convierte discos, drivers y configuración para que el servidor pueda arrancar en EC2.
- **Orquestación de pruebas y cutover:** Permite realizar pruebas sin afectar al origen y ejecutar el cutover con pasos automatizados.
- **Compatibilidad amplia:** Soporta máquinas físicas, VMs (VMware, Hyper‑V), y cloud providers.
- **Integración con AWS:** Integración con CloudWatch, IAM, CloudFormation y AWS Migration Hub.

## Casos de uso

- Lift-and-shift (Rehost) de servidores on‑prem a EC2.
- Migración de data centers completos con mínima interrupción.
- Pruebas de migración en entornos aislados antes del cutover final.

## Componentes

- **MGN Replication Server / agents:** Se despliegan agentes o appliances en origen para replicación.
- **Staging area en AWS:** Instancias y volúmenes temporales usados para replicación y pruebas.
- **Launch templates / tasks:** Plantillas y orquestación para lanzar instancias de prueba o realizar cutover.

## Flujo de migración básico

1. Preparar cuenta AWS y permisos IAM para MGN.
2. Desplegar el agente/appliance en el entorno origen (VMs o física).
3. Configurar replicación para los servidores objetivo (selección de discos, red, etc.).
4. Esperar a que la replicación inicial complete (full sync) y luego replicación continua.
5. Ejecutar una prueba de launch (test) para validar que el servidor funciona en AWS.
6. Planificar y ejecutar el cutover: detener servicios en origen, lanzar instancias EC2 definitivas y validar.

## Ejemplos CLI / pasos relevantes

- La mayoría de configuraciones primarias se realizan vía consola, pero puedes usar APIs para listar/gestionar reps.
- Ver estado de replicación y lanzar instancias de prueba desde la consola o via llamadas a la API/SDK.

## Buenas prácticas

- Realizar pruebas de launch (test launches) en entorno aislado para validar funcionalidades antes del cutover.
- Dimensionar correctamente la staging area en AWS para soportar I/O y transferencia.
- Monitorear latencia y uso de ancho de banda; programar replicaciones iniciales fuera de ventanas críticas.
- Planificar cutover con ventanas de mantenimiento y rollback plan si algo falla.
- Integrar con CloudWatch y Migration Hub para trazabilidad.

## Limitaciones y consideraciones

- Requiere permisos y configuración de red (abrir puertos, VPC, subnets) para que agentes comuniquen con MGN.
- Coste asociado a staging storage y instancias de prueba en AWS durante el proceso de migración.

## Recursos

- Documentación: https://docs.aws.amazon.com/mgn/
- Guía de inicio: https://aws.amazon.com/mgn/learn-more/

Ruta del archivo: `/Users/waddini/Study/aws/Migration/ApplicationMigration/README.md`

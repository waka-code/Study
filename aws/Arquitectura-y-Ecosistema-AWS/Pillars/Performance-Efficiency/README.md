# Pilar 4 — Eficiencia del Rendimiento (Performance Efficiency)

Este documento resume el pilar de **Eficiencia del Rendimiento** del AWS Well‑Architected Framework: objetivos, principios, prácticas, métricas, checklist y ejemplos enfocados en seleccionar recursos apropiados, diseñar para escalabilidad y optimizar latencia y throughput.

## Objetivos clave

- Seleccionar recursos computacionales, de almacenamiento y de red que cumplan requisitos de rendimiento.
- Escalar eficientemente bajo carga (autoscaling, serverless).
- Optimizar latencia y throughput.
- Monitorizar y ajustar continuamente.

## Principios de diseño

- **Right-sizing**: elegir tipos y tamaños de instancia/recursos adecuados (no sobreasignados ni subutilizados).
- **Escalabilidad**: diseña para crecer con la demanda (horizontal > vertical).
- **Serverless donde sea apropiado**: delega escalabilidad a servicios gestionados (Lambda, DynamoDB, Fargate).
- **Caching y distribución**: usa CDN, cachés en memoria (ElastiCache) para reducir latencia.
- **Monitoreo y benchmarking**: mide continuamente y compara contra targets.

## Prácticas recomendadas

- **Selección de recursos**:
  - Usa AWS Compute Optimizer para recomendaciones de right-sizing.
  - Considera Spot Instances para cargas interrumpibles (ahorro de costes + performance).
  - Usa instancias optimizadas para el workload (compute, memory, storage, GPU, etc.).
- **Autoscaling y elasticidad**:
  - EC2 Auto Scaling Groups: escala por CPU, memoria, custom metrics o programado.
  - Application Load Balancer (ALB) para distribución de tráfico.
  - DynamoDB on-demand o provisioned con auto-scaling.
  - Lambda: escalado automático sin gestión.
- **Caching y aceleración**:
  - CloudFront (CDN) para contenido estático y dinámico.
  - ElastiCache (Redis, Memcached) para caching de aplicación.
  - S3 Transfer Acceleration para uploads rápidos.
  - Route 53 latency-based routing para multi-región.
- **Optimización de almacenamiento y bases de datos**:
  - Elige tipo de BD según caso (OLTP: RDS/Aurora; NoSQL: DynamoDB; OLAP: Redshift).
  - Particionamiento y sharding en bases de datos grandes.
  - Índices y query optimization.
  - Data lifecycle policies (S3 Intelligent-Tiering, Glacier archive).
- **Monitoreo y ajuste**:
  - CloudWatch metrics (CPU, Network, Disk I/O).
  - X-Ray para trazas de latencia end-to-end.
  - Application Performance Monitoring (APM) tools.
  - Benchmarking y load testing periódicos.

## Métricas y KPIs sugeridos

- **Latency percentiles** (p50, p95, p99) — target según SLO.
- **Throughput** (requests/sec, MB/sec).
- **CPU / Memory utilization** — target 60-80% para margen de escalado.
- **Error rates** bajo carga.
- **Time to First Byte (TTFB)** para aplicaciones web.
- **P99 database query latency**.

## Checklist rápido (performance)

- [ ] ¿Hemos realizado right-sizing de instancias EC2 (CPU, memoria, tipo)?
- [ ] ¿Auto Scaling está configurado en aplicaciones críticas?
- [ ] ¿Usamos CloudFront para distribuir contenido?
- [ ] ¿ElastiCache está implementado para datos calientes?
- [ ] ¿Bases de datos están optimizadas (índices, particiones, tipo correcto)?
- [ ] ¿Monitoreamos latency percentiles y comparamos contra SLOs?
- [ ] ¿Realizamos load testing y benchmarking periódicamente?
- [ ] ¿Aprovechamos serverless donde es apropiado (Lambda, Fargate)?
- [ ] ¿Aplicamos data lifecycle policies para optimizar costes?

## Ejemplo — Aplicación web escalable

- ALB distribuyendo tráfico a múltiples AZs.
- EC2 Auto Scaling Group con right-sized instances.
- ElastiCache para datos de sesión y caché de aplicación.
- CloudFront para assets estáticos (CSS, JS, imágenes).
- RDS Aurora con read replicas para queries de lectura.
- CloudWatch alarms monitoreando latencia p95 y p99.

## Herramientas AWS relevantes

- **AWS Compute Optimizer**: recomendaciones de right-sizing.
- **EC2 Auto Scaling / Application Auto Scaling**: escalado automático.
- **Elastic Load Balancing (ALB, NLB)**: distribución de tráfico.
- **CloudFront**: CDN y aceleración.
- **ElastiCache**: caching en memoria.
- **CloudWatch**: monitoreo de métricas.
- **X-Ray**: trazas distribuidas y análisis de latencia.
- **AWS Lambda**: compute serverless con autoscaling automático.
- **Amazon RDS / Aurora**: bases de datos gestionadas.
- **Amazon DynamoDB**: NoSQL con autoscaling on-demand.

## Buenas prácticas operativas

- Benchmarking antes y después de cambios.
- Load testing en staging para validar performance bajo picos.
- Revisión trimestral de utilización y oportunidades de optimización.
- Automatizar scaling policies y alertas.

## Evitar antipatrones

- No esperar a que la CPU/memoria alcance 95-100% para escalar (reactividad).
- Monolitos sin posibilidad de escalar horizontalmente.
- Caching innecesario sin invalidación (datos stale).
- Falta de comprensión de bottlenecks (aplicación vs BD vs red).

## Recursos y lecturas

- Performance Efficiency pillar — AWS Well‑Architected: https://docs.aws.amazon.com/wellarchitected/latest/performance-efficiency-pillar/welcome.html
- AWS Compute Optimizer: https://docs.aws.amazon.com/compute-optimizer/
- Load testing with locust, JMeter, etc.

---

Ruta del archivo: `/Users/waddini/Study/aws/Arquitectura-y-Ecosistema-AWS/Pillars/Performance-Efficiency/README.md`

# Preguntas típicas de entrevista Senior sobre Sidekiq

Este documento contiene respuestas a preguntas comunes en entrevistas técnicas relacionadas con Sidekiq, un sistema de procesamiento de trabajos en segundo plano para Ruby on Rails.

---

## Preguntas y Respuestas

### ✔ ¿Por qué Sidekiq usa Redis?
- **Alto rendimiento**: Redis es una base de datos en memoria extremadamente rápida, lo que permite a Sidekiq manejar miles de trabajos por segundo.
- **Estructuras de datos optimizadas**: Redis utiliza listas y conjuntos ordenados, que son ideales para gestionar colas de trabajos.
- **Persistencia opcional**: Redis puede almacenar datos en disco, lo que permite recuperar trabajos en caso de reinicio.
- **Soporte para Pub/Sub**: Esto permite que Sidekiq implemente notificaciones en tiempo real y comunicación eficiente entre procesos.

---

### ✔ ¿Qué pasa si Redis cae?
- **Pérdida de trabajos en memoria**: Si Redis no está configurado para persistir datos en disco, los trabajos en memoria se perderán.
- **Interrupción del procesamiento**: Sidekiq no puede procesar trabajos sin Redis, ya que depende de él para gestionar las colas.
- **Soluciones**:
  1. Configurar Redis con persistencia (RDB o AOF).
  2. Implementar un clúster de Redis con alta disponibilidad (Redis Sentinel o Redis Cluster).
  3. Monitorear Redis con herramientas como `Redis Monitor` o `Prometheus` para detectar problemas rápidamente.

---

### ✔ ¿Cómo evitas jobs duplicados?
- **Uso de claves únicas en Redis**: Puedes usar gemas como `sidekiq-unique-jobs` para garantizar que no se encolen trabajos duplicados.
- **Ejemplo con `sidekiq-unique-jobs`**:
```ruby
class MyWorker
  include Sidekiq::Worker
  sidekiq_options unique: :until_executed

  def perform(args)
    # Lógica del trabajo
  end
end
```
- **Evitar reintentos innecesarios**: Configura el número de reintentos y el tiempo de expiración de los jobs para evitar duplicados.

---

### ✔ ¿Qué diferencia hay entre retry y dead job?
- **Retry Job**:
  - Un trabajo que ha fallado pero que Sidekiq intentará ejecutar nuevamente.
  - El número de reintentos se puede configurar (por defecto, 25 reintentos).
  - Los reintentos se realizan con un backoff exponencial.

- **Dead Job**:
  - Un trabajo que ha fallado después de agotar todos los reintentos.
  - Se mueve a la cola de "Dead Jobs" (morgue) para su inspección manual.
  - Los trabajos en la cola de Dead Jobs pueden ser reintentos manualmente o eliminados.

---

### ✔ ¿Cómo escalas Sidekiq?
- **Estrategias de escalabilidad**:
  1. **Aumentar el número de procesos**: Ejecuta múltiples procesos de Sidekiq en diferentes servidores.
  2. **Configurar múltiples colas**: Prioriza trabajos críticos asignándolos a colas específicas con mayor prioridad.
  3. **Optimizar Redis**: Usa un clúster de Redis para manejar grandes volúmenes de datos.
  4. **Monitoreo y métricas**: Usa herramientas como `Sidekiq Pro` o `Sidekiq Enterprise` para obtener métricas avanzadas y monitoreo.

---

### ✔ ¿Sidekiq es thread-safe?
- **Sí, Sidekiq es thread-safe**:
  - Sidekiq utiliza múltiples hilos para procesar trabajos en paralelo.
  - Asegúrate de que el código que escribas también sea thread-safe, especialmente si accede a recursos compartidos como bases de datos o archivos.
  - Usa mecanismos de sincronización como `Mutex` o evita el uso compartido de variables globales.

---

¡Prepárate bien para tu entrevista y demuestra tus habilidades avanzadas en Sidekiq! 🚀
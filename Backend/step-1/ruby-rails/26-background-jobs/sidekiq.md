# Sidekiq – Background Jobs

## Cómo Funciona (Redis-based)

```
Rails App
   │
   ├─ perform_async(args)  →  Redis (cola de jobs)
   │                              │
   └─────────────────────  Sidekiq worker (proceso separado)
                                  │  procesa jobs
                                  └─ DB / APIs / Mailers
```

Sidekiq usa Redis como broker: Rails encola jobs como JSON en Redis; los workers de Sidekiq los consumen en procesos separados. Rails y Sidekiq no comparten memoria.

---

## Setup

```ruby
# Gemfile
gem 'sidekiq'

# config/application.rb
config.active_job.queue_adapter = :sidekiq

# Iniciar Redis y Sidekiq
redis-server
bundle exec sidekiq

# Monitor web (montar en routes.rb)
require 'sidekiq/web'
mount Sidekiq::Web => '/sidekiq'  # Proteger con autenticación en producción
```

---

## Worker Básico

```ruby
# app/workers/email_worker.rb
class EmailWorker
  include Sidekiq::Worker

  sidekiq_options queue: :mailers, retry: 3

  def perform(user_id)
    user = User.find(user_id)
    UserMailer.welcome_email(user).deliver_now
  end
end

# Encolar
EmailWorker.perform_async(user.id)           # Inmediato
EmailWorker.perform_in(5.minutes, user.id)   # Después de 5 min
EmailWorker.perform_at(Time.zone.parse("2024-01-01 09:00"), user.id)

# Con ActiveJob (abstracción sobre el adapter)
class WelcomeEmailJob < ApplicationJob
  queue_as :mailers

  def perform(user)
    UserMailer.welcome_email(user).deliver_now
  end
end

WelcomeEmailJob.perform_later(user)
WelcomeEmailJob.set(wait: 1.hour).perform_later(user)
```

---

## Jobs Idempotentes

Un job es **idempotente** si ejecutarlo múltiples veces produce el mismo resultado que ejecutarlo una vez. Crítico porque Sidekiq puede reintentar jobs fallidos.

```ruby
# ❌ NO idempotente: cada ejecución crea un registro nuevo
class ChargeWorker
  include Sidekiq::Worker

  def perform(order_id)
    order = Order.find(order_id)
    PaymentGateway.charge(order.amount)  # Cobra N veces si se reintenta
    order.update!(charged: true)
  end
end

# ✅ Idempotente: verifica estado antes de actuar
class ChargeWorker
  include Sidekiq::Worker

  def perform(order_id)
    order = Order.find(order_id)

    return if order.charged?  # Ya fue procesado, no hacer nada

    result = PaymentGateway.charge(order.amount)
    order.update!(charged: true, payment_id: result.id)
  end
end

# ✅ Idempotente con find_or_create
class SyncUserWorker
  include Sidekiq::Worker

  def perform(external_id, data)
    User.find_or_create_by(external_id: external_id) do |u|
      u.name  = data["name"]
      u.email = data["email"]
    end
  end
end
```

---

## Retries y Dead Queue

```ruby
class RiskyWorker
  include Sidekiq::Worker

  # Reintentar hasta 5 veces con backoff exponencial
  sidekiq_options retry: 5

  # Sin reintentos (fallo → dead queue directamente)
  sidekiq_options retry: false

  def perform(id)
    # Si lanza una excepción, Sidekiq reintenta
    ExternalApi.call(id)
  end

  # Callback cuando se agotan los reintentos
  sidekiq_retries_exhausted do |msg, ex|
    # msg contiene la info del job
    Sentry.capture_exception(ex, extra: { job: msg })
    FailedJob.create!(worker: msg["class"], args: msg["args"], error: ex.message)
  end
end
```

**Dead Queue:** Jobs que agotaron todos los reintentos van a la dead queue en Redis. Visibles en el dashboard `/sidekiq` → se pueden reintentar o eliminar manualmente.

**Backoff por defecto:** `(retry_count^4) + 15 + (rand(30) * (retry_count + 1))` segundos.

---

## Scheduling

```ruby
# Opción 1: perform_in / perform_at (built-in)
ReportWorker.perform_in(24.hours, user.id)
ReportWorker.perform_at(Date.tomorrow.beginning_of_day, user.id)

# Opción 2: sidekiq-cron (jobs periódicos)
gem 'sidekiq-cron'

# config/schedule.yml
daily_report:
  cron: "0 8 * * *"       # Todos los días a las 8am
  class: "DailyReportWorker"

cleanup_old_records:
  cron: "0 2 * * 0"       # Domingos a las 2am
  class: "CleanupWorker"

# config/initializers/sidekiq.rb
Sidekiq::Cron::Job.load_from_hash(YAML.load_file("config/schedule.yml"))
```

---

## Concurrency

```ruby
# config/sidekiq.yml
:concurrency: 10          # 10 threads por proceso (default: 5)
:queues:
  - [critical, 3]         # Prioridad 3x (más alta)
  - [default, 2]
  - [mailers, 1]
  - [low, 1]

# Regla: concurrency ≤ pool de conexiones de DB
# database.yml pool: 10 → sidekiq concurrency: 10
```

**Importante:** Sidekiq usa threads, no procesos. Cada thread puede manejar un job simultáneamente. El código debe ser thread-safe (no compartir estado mutable entre workers).

---

## Rate Limiting

```ruby
# Opción 1: sidekiq-throttled
gem 'sidekiq-throttled'

class ApiWorker
  include Sidekiq::Worker
  include Sidekiq::Throttled::Worker

  sidekiq_throttle(
    concurrency: { limit: 5 },           # Máx 5 jobs simultáneos
    threshold: { limit: 100, period: 60 } # Máx 100 jobs por minuto
  )

  def perform(record_id)
    ExternalApi.call(record_id)
  end
end

# Opción 2: Middleware personalizado con Redis
class RateLimitMiddleware
  def call(worker, job, queue, redis_pool)
    key = "rate_limit:#{worker.class.name}"
    redis_pool.with do |conn|
      count = conn.incr(key)
      conn.expire(key, 60) if count == 1

      raise "Rate limit exceeded" if count > 100
    end
    yield
  end
end
```

---

## Buenas Prácticas

```ruby
# ✅ Pasar IDs, no objetos (los objetos pueden quedar stale)
UserWorker.perform_async(user.id)    # ✅
UserWorker.perform_async(user)       # ❌ Serializa el objeto entero

# ✅ Jobs pequeños y enfocados
class SendEmailWorker
  def perform(user_id)
    user = User.find(user_id)
    UserMailer.welcome(user).deliver_now
  end
end

# ❌ Jobs que hacen demasiado (difícil de reintentar parcialmente)
class OnboardingWorker
  def perform(user_id)
    send_email(user_id)
    setup_account(user_id)
    notify_crm(user_id)
    charge_first_payment(user_id)
  end
end

# ✅ Usar after_commit para encolar (no after_save)
class User < ApplicationRecord
  after_commit :enqueue_welcome_job, on: :create

  def enqueue_welcome_job
    WelcomeEmailWorker.perform_async(id)
  end
end
```

---

## Pregunta de Entrevista

**P: ¿Por qué los jobs de Sidekiq deben ser idempotentes?**

Sidekiq garantiza entrega "at-least-once": si un job falla (error de red, crash), se reintenta. Si el job no es idempotente, ejecutarlo dos veces puede cobrar dos veces al cliente o crear duplicados. La idempotencia garantiza que reintentar es seguro.

**P: ¿Qué va a la dead queue?**

Jobs que agotaron todos los reintentos configurados. Sidekiq los mueve a la dead queue en Redis donde se pueden inspeccionar, reintentar o eliminar manualmente desde el dashboard. Por defecto se limpian después de 6 meses.

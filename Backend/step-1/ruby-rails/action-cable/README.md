# Action Cable: Preguntas de entrevista senior

Este documento contiene preguntas comunes de entrevistas técnicas relacionadas con Action Cable, el framework de WebSockets de Ruby on Rails. Las respuestas están diseñadas para ayudarte a prepararte para entrevistas a nivel senior.

---

## Preguntas y Respuestas

### ❓ ¿Por qué Action Cable necesita Redis?
- **Pub/Sub**: Redis actúa como un sistema de publicación/suscripción que permite a los servidores de Action Cable comunicarse entre sí.
- **Coordinación entre servidores**: En una configuración de múltiples servidores, Redis asegura que los mensajes enviados a un canal sean recibidos por todos los clientes suscritos, sin importar en qué servidor estén conectados.
- **Alto rendimiento**: Redis es rápido y eficiente para manejar grandes volúmenes de mensajes en tiempo real.

---

### ❓ ¿Cómo escala horizontalmente?
- **Uso de Redis**: Redis permite que múltiples instancias de Action Cable compartan el mismo backend de mensajes, lo que facilita la escalabilidad horizontal.
- **Balanceadores de carga**: Se pueden usar balanceadores de carga (como NGINX o AWS ELB) para distribuir las conexiones WebSocket entre múltiples servidores.
- **Ejemplo de configuración con Redis**:
```yaml
# config/cable.yml
development:
  adapter: redis
  url: redis://localhost:6379/1

production:
  adapter: redis
  url: <%= ENV['REDIS_URL'] %>
  channel_prefix: myapp_production
```

---

### ❓ ¿Diferencia entre `stream_from` y `stream_for`?
- **`stream_from`**:
  - Se utiliza para escuchar un canal específico.
  - Ejemplo:
  ```ruby
  stream_from "chat_channel"
  ```

- **`stream_for`**:
  - Es un atajo para crear un canal único basado en un modelo o recurso específico.
  - Ejemplo:
  ```ruby
  stream_for current_user
  ```

---

### ❓ ¿Dónde autenticas y dónde autorizas?
- **Autenticación**:
  - Se realiza en el archivo `ApplicationCable::Connection`.
  - Ejemplo:
  ```ruby
  # app/channels/application_cable/connection.rb
  module ApplicationCable
    class Connection < ActionCable::Connection::Base
      identified_by :current_user

      def connect
        self.current_user = find_verified_user
      end

      private

      def find_verified_user
        if (user = User.find_by(id: cookies.signed[:user_id]))
          user
        else
          reject_unauthorized_connection
        end
      end
    end
  end
  ```

- **Autorización**:
  - Se realiza en los canales específicos, generalmente en el método `subscribed`.
  - Ejemplo:
  ```ruby
  class ChatChannel < ApplicationCable::Channel
    def subscribed
      if current_user.can_access?(params[:room_id])
        stream_from "chat_#{params[:room_id]}"
      else
        reject
      end
    end
  end
  ```

---

### ❓ ¿Qué pasa si un channel lanza una excepción?
- **Comportamiento predeterminado**:
  - Si un canal lanza una excepción, la conexión del cliente se cierra automáticamente.
  - Rails registra la excepción en los logs.

- **Manejo de excepciones**:
  - Puedes manejar excepciones personalizadas en el canal para evitar que la conexión se cierre.
  - Ejemplo:
  ```ruby
  class ChatChannel < ApplicationCable::Channel
    def subscribed
      stream_from "chat_channel"
    rescue StandardError => e
      Rails.logger.error("Error en el canal: #{e.message}")
    end
  end
  ```

---

### ❓ ¿Cuándo NO usar Action Cable?
- **Altas tasas de mensajes**: Si necesitas manejar millones de mensajes por segundo, considera soluciones especializadas como Kafka o RabbitMQ.
- **Conexiones de larga duración**: Si necesitas mantener conexiones abiertas durante días o semanas, Action Cable puede no ser la mejor opción.
- **Escalabilidad extrema**: Para aplicaciones con millones de usuarios concurrentes, servicios como Pusher o Firebase pueden ser más adecuados.

---

### ❓ ¿Cómo evitar memory leaks?
- **Cerrar conexiones**: Asegúrate de que las conexiones se cierren correctamente cuando los clientes se desconecten.
- **Evitar referencias circulares**: No almacenes referencias a objetos que puedan evitar que el recolector de basura los libere.
- **Monitoreo**: Usa herramientas como `New Relic` o `Scout` para identificar y solucionar problemas de memoria.

---

### ❓ ¿Cómo manejar miles de conexiones?
- **Uso de servidores optimizados**:
  - Usa servidores como `Puma` o `Unicorn` que soporten múltiples hilos y procesos.
  - Configura el número de hilos y workers según los recursos del servidor.

- **Balanceo de carga**:
  - Usa un balanceador de carga para distribuir las conexiones entre múltiples servidores.
  - Ejemplo con NGINX:
  ```nginx
  upstream app_servers {
    server app1.example.com;
    server app2.example.com;
  }

  server {
    listen 80;
    location /cable {
      proxy_pass http://app_servers;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "Upgrade";
    }
  }
  ```

- **Optimización de Redis**:
  - Usa un clúster de Redis para manejar grandes volúmenes de conexiones.
  - Configura límites de memoria y políticas de eliminación en Redis para evitar problemas de rendimiento.

---

¡Prepárate para responder estas preguntas y demuestra tu experiencia con Action Cable en tus entrevistas! 🚀
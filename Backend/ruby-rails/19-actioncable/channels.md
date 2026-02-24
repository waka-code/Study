# Action Cable – Real-Time con WebSockets

## ¿Qué son WebSockets?

HTTP: cliente hace request → servidor responde → conexión se cierra (pull).
WebSocket: conexión persistente bidireccional — servidor puede enviar datos al cliente en cualquier momento (push).

```
HTTP:   Cliente ──── request ───► Servidor
                ◄─── response ──

WebSocket: Cliente ◄══════════════► Servidor
                  conexión abierta
                  (cualquiera puede enviar)
```

**Action Cable** integra WebSockets en Rails usando canales (Channels).

---

## Arquitectura

```
Cliente (browser)                    Servidor Rails
   │                                      │
   ├─ ActionCable.createConsumer()  ──►   │  /cable (WebSocket endpoint)
   │                                      │
   ├─ consumer.subscriptions.create()──►  │  Channel#subscribed
   │                                      │
   │  ◄─────── broadcast ─────────────── │  ActionCable.server.broadcast(...)
   │                                      │
   └─ channel.send(data) ──────────────► │  Channel#receive(data)
```

---

## Setup

```ruby
# config/cable.yml
development:
  adapter: async          # En memoria (solo 1 proceso)

production:
  adapter: redis          # Necesario para múltiples procesos / Puma clusters
  url: <%= ENV.fetch("REDIS_URL") %>
  channel_prefix: myapp_production
```

---

## Connection: Autenticación (Authorization)

La conexión se establece una vez por cliente. Aquí se autentica:

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
      # Desde cookie de sesión
      if (user = User.find_by(id: cookies.encrypted[:user_id]))
        user
      # Desde JWT en el header
      elsif (token = request.params[:token])
        decoded = JWT.decode(token, Rails.application.secret_key_base).first
        User.find(decoded["user_id"])
      else
        reject_unauthorized_connection  # Cierra el WebSocket
      end
    end
  end
end
```

---

## Channel: Chat en Tiempo Real

```ruby
# app/channels/chat_channel.rb
class ChatChannel < ApplicationCable::Channel
  def subscribed
    room = Room.find(params[:room_id])

    # Autorización por sala
    reject unless current_user.member_of?(room)

    # Suscribirse al stream de esta sala
    stream_from "chat_room_#{params[:room_id]}"
  end

  def unsubscribed
    stop_all_streams  # Limpieza automática al desconectar
  end

  # Cliente envía mensaje → servidor lo procesa y hace broadcast
  def receive(data)
    message = Message.create!(
      content: data["content"],
      user: current_user,
      room_id: params[:room_id]
    )

    ActionCable.server.broadcast(
      "chat_room_#{params[:room_id]}",
      {
        id:         message.id,
        content:    message.content,
        user_name:  current_user.name,
        created_at: message.created_at
      }
    )
  end
end
```

---

## Broadcasting desde Cualquier Lugar

```ruby
# Desde un Controller
class MessagesController < ApplicationController
  def create
    @message = Message.create!(message_params.merge(user: current_user))

    ActionCable.server.broadcast(
      "chat_room_#{@message.room_id}",
      { content: @message.content, user_name: current_user.name }
    )

    render json: @message
  end
end

# Desde un Job (background)
class MessageBroadcastJob < ApplicationJob
  def perform(message)
    ActionCable.server.broadcast(
      "chat_room_#{message.room_id}",
      MessageSerializer.new(message).as_json
    )
  end
end

# Desde un Model callback (después de commit)
class Message < ApplicationRecord
  after_commit :broadcast_message, on: :create

  private

  def broadcast_message
    MessageBroadcastJob.perform_later(self)
  end
end
```

---

## Caso Real: Notificaciones

```ruby
# app/channels/notifications_channel.rb
class NotificationsChannel < ApplicationCable::Channel
  def subscribed
    # Stream privado por usuario (no sala compartida)
    stream_for current_user
    # Internamente: "notifications_channel:User:#{current_user.id}"
  end
end

# Enviar notificación desde cualquier parte del backend
class Notification < ApplicationRecord
  after_commit :broadcast_to_user, on: :create

  def broadcast_to_user
    NotificationsChannel.broadcast_to(
      user,
      {
        id:      id,
        message: message,
        read:    false,
        url:     url
      }
    )
  end
end

# Creando notificación desde un service
NotificationsChannel.broadcast_to(
  user,
  { message: "Tu orden fue enviada", url: "/orders/#{order.id}" }
)
```

---

## Cliente JavaScript

```javascript
// app/javascript/channels/chat_channel.js
import consumer from "./consumer"

const chatChannel = consumer.subscriptions.create(
  { channel: "ChatChannel", room_id: roomId },
  {
    connected() {
      console.log("Connected to ChatChannel")
    },

    disconnected() {
      console.log("Disconnected")
    },

    received(data) {
      // data = lo que broadcast envió
      appendMessage(data.user_name, data.content)
    },

    // Enviar al servidor
    sendMessage(content) {
      this.perform("receive", { content })
    }
  }
)

// Usar
document.querySelector("#send-btn").addEventListener("click", () => {
  const content = document.querySelector("#message-input").value
  chatChannel.sendMessage(content)
})
```

---

## Escalabilidad con Redis

**Problema:** Con múltiples procesos (Puma cluster, varios servidores), un broadcast en proceso A no llega a clientes conectados en proceso B.

**Solución:** Redis como pub/sub broker entre procesos.

```
Proceso A (broadcast) ──► Redis pub/sub ──► Proceso B ──► Cliente B
                                        └──► Proceso C ──► Cliente C
```

```ruby
# config/cable.yml
production:
  adapter: redis
  url: <%= ENV["REDIS_URL"] %>
  channel_prefix: myapp_production

# ✅ Con Redis: broadcast en cualquier proceso llega a todos los clientes
# ✅ Escala horizontalmente (múltiples servidores)
# ✅ Funciona con Heroku dynos, Kubernetes pods, etc.
```

**Regla:** `async` adapter solo para desarrollo con 1 proceso. Redis en producción siempre.

---

## Autorización en Canales

```ruby
class ProjectChannel < ApplicationCable::Channel
  def subscribed
    project = Project.find(params[:project_id])

    # Rechazar si no tiene permisos
    reject unless current_user.can?(:read, project)

    stream_for project
  end
end

# Autorización más granular con Pundit
class DocumentChannel < ApplicationCable::Channel
  def subscribed
    @document = Document.find(params[:document_id])

    # Verifica política de Pundit
    unless DocumentPolicy.new(current_user, @document).show?
      reject
      return
    end

    stream_for @document
  end

  def receive(data)
    # Verificar permiso también al recibir datos
    unless DocumentPolicy.new(current_user, @document).update?
      transmit({ error: "Unauthorized" })
      return
    end

    @document.update!(content: data["content"])
    DocumentChannel.broadcast_to(@document, data.merge(user: current_user.name))
  end
end
```

---

## Pregunta de Entrevista

**P: ¿Cómo escala Action Cable en producción con múltiples servidores?**

Action Cable usa Redis como pub/sub backend. Cuando un proceso hace broadcast, publica en Redis; todos los procesos suscritos reciben el mensaje y lo reenvían a sus clientes conectados. Sin Redis (adapter `async`), el broadcast solo llegaría a clientes del mismo proceso.

**P: ¿Dónde autenticarías una conexión de Action Cable?**

En `Connection#connect`. Se ejecuta una vez al establecer el WebSocket. Aquí valido la sesión o JWT y seteo `current_user`. Si no hay usuario válido, llamo `reject_unauthorized_connection` para cerrar el WebSocket antes de que abra canales. Cada canal puede añadir autorización adicional en `subscribed` con `reject`.

# Channels en ActionCable

```ruby
# app/channels/chat_channel.rb
class ChatChannel < ApplicationCable::Channel
  def subscribed
    stream_from "chat_#{params[:room_id]}"
  end
  
  def unsubscribed
    stop_all_streams
  end
  
  def receive(data)
    ActionCable.server.broadcast("chat_#{params[:room_id]}", {
      message: data['message'],
      user: current_user.name
    })
  end
end

# Broadcasting desde controller
ChatChannel.broadcast_to room, { message: "Welcome!" }
```

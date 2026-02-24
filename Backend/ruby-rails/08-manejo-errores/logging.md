# Logging en Rails

```ruby
# Niveles de log
Rails.logger.debug("Debug info")
Rails.logger.info("General info")
Rails.logger.warn("Warning")
Rails.logger.error("Error occurred")
Rails.logger.fatal("Fatal error")

# Log estructurado
Rails.logger.info({
  event: "user_created",
  user_id: user.id,
  timestamp: Time.current
}.to_json)

# Servicios externos
# Sentry, Rollbar, Airbrake, etc.
```

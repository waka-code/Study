# Traducciones

```yaml
# config/locales/es.yml
es:
  hello: "Hola"
  messages:
    welcome: "Bienvenido"
    
# config/locales/en.yml
en:
  hello: "Hello"
  messages:
    welcome: "Welcome"
```

```ruby
# Uso
I18n.t('hello')  # "Hola" o "Hello" según locale
I18n.locale = :es
I18n.t('messages.welcome')  # "Bienvenido"

# En modelos
validates :name, presence: { message: I18n.t('errors.name_required') }
```

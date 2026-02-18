# Crear un Engine

```bash
rails plugin new my_engine --mountable

# Estructura
my_engine/
├── app/
├── config/
├── lib/
│   └── my_engine.rb
└── test/

# Montar en app principal
# Gemfile
gem 'my_engine', path: 'engines/my_engine'

# config/routes.rb
mount MyEngine::Engine, at: '/my_engine'
```

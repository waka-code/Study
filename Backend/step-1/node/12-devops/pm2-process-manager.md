# PM2: Gestor de Procesos

## Instalación y Uso Básico

```bash
npm install -g pm2

# Iniciar app
pm2 start app.js

# Ver status
pm2 status
pm2 list

# Logs
pm2 logs
pm2 logs app

# Parar
pm2 stop app
pm2 stop all

# Restart
pm2 restart app
pm2 restart all

# Delete
pm2 delete app
pm2 delete all
```

## Cluster Mode

Automáticamente crea múltiples procesos (uno por CPU core):

```bash
# Cluster mode con máximo de cores
pm2 start app.js -i max

# Específico: 4 procesos
pm2 start app.js -i 4

# Greedy clustering: comienza con max, escala según load
pm2 start app.js -i max --max-memory-restart 500M
```

### Reload Graceful (sin downtime)

```bash
# Carga nuevos workers, luego termina viejos
pm2 reload app

# Reload de todos
pm2 reload all

# Hard restart (downtime)
pm2 restart app
```

## Archivo de Configuración (ecosystem.config.js)

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api',
      script: './app.js',
      instances: 'max', // Cluster mode
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ],
  deploy: {
    production: {
      user: 'ubuntu',
      host: '1.2.3.4',
      key: '/path/to/key',
      ref: 'origin/main',
      repo: 'git@github.com:user/repo.git',
      path: '/var/www/myapp',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
};
```

```bash
# Usar configuración
pm2 start ecosystem.config.js

# Con ambiente
pm2 start ecosystem.config.js --env production

# Deploy
pm2 deploy ecosystem.config.js production setup
pm2 deploy ecosystem.config.js production
```

## Configuración Avanzada

```javascript
module.exports = {
  apps: [
    {
      name: 'api',
      script: './app.js',
      instances: 'max',
      exec_mode: 'cluster',

      // Memory
      max_memory_restart: '500M',

      // Logs
      out_file: '/var/log/pm2/out.log',
      error_file: '/var/log/pm2/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // Restart policies
      max_restarts: 10,
      min_uptime: '10s',

      // Graceful shutdown
      kill_timeout: 10000, // 10s para graceful, luego force
      listen_timeout: 10000,

      // Ignore
      ignore_watch: ['node_modules', 'logs', '.env'],
      watch: ['src/'], // Reiniciar si cambian estos archivos

      // Env
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 80
      }
    }
  ]
};
```

## Monitoreo

### PM2 Plus (SaaS monitoring)

```bash
# Conectar a PM2 Plus
pm2 link

# Ver dashboard
# https://app.pm2.io/
```

### Monitoreo Local

```bash
# Monitoreo en tiempo real
pm2 monit

# Estadísticas
pm2 info api

# CPU y memoria
pm2 stats
```

### Alerts y Acciones

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api',
      script: './app.js',
      instances: 'max',
      // Alert si CPU > 90%
      error_file: '/var/log/pm2/error.log',
      max_memory_restart: '500M' // Reiniciar si > 500MB
    }
  ]
};
```

## Autoinicio en Servidor

```bash
# Generar startup script para tu SO
pm2 startup

# Salvar configuración actual
pm2 save

# Remover de startup
pm2 unstartup
```

## Balanceo de Carga con Nginx

```nginx
# /etc/nginx/sites-available/default
upstream api {
  least_conn; # Conexiones mínimas
  server 127.0.0.1:3000;
  server 127.0.0.1:3001;
  server 127.0.0.1:3002;
  server 127.0.0.1:3003;
}

server {
  listen 80;
  server_name example.com;

  location / {
    proxy_pass http://api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

## Zero-downtime Reloading

```bash
# Script de deployment
#!/bin/bash

# Pull código
git pull

# Instalar dependencias
npm install

# Reload graceful (sin downtime)
pm2 reload api
```

## Manejo de Errores y Restarts

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api',
      script: './app.js',

      // Si falla, espera antes de reintentar
      restart_delay: 4000,

      // Máximo reintentos
      max_restarts: 10,

      // Debe estar up mínimo 10s, sino cuenta como crash
      min_uptime: '10s',

      // Si se cae 4 veces en 1 minuto, espera 5 min
      autorestart: true,
      max_memory_restart: '500M'
    }
  ]
};
```

## PM2 Plus Features (Pago)

```bash
# Push git updates automáticamente
pm2 link

# Triggers automáticos
pm2 trigger api "git pull" --watch

# Monitoreo con alertas
# Email cuando crash
# Dashboards
```

## Debugging

```bash
# Ver detalles de un app
pm2 describe api

# Logs en detalle
pm2 logs api --lines 100

# Log de PM2 mismo
pm2 logs PM2

# Búsqueda en logs
pm2 logs | grep error
```

## Comparación: PM2 vs Docker Compose

| Aspecto | PM2 | Docker Compose |
|--------|-----|----------------|
| Setup | Rápido | Moderado |
| Isolation | Procesos | Containers |
| Scaling | Fácil | Con orchestration |
| Dev/Prod | Con envs | Mismo |
| Logs | Centralizados | Separados |

## Monitoreo de Health Check

```javascript
// En tu app
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ecosystem.config.js con script healthcheck
module.exports = {
  apps: [{
    name: 'api',
    script: './app.js',
    instances: 'max',
    // PM2 monitorea internamente
  }]
};
```

## Estructura Recomendada

```
project/
├── app.js
├── ecosystem.config.js
├── package.json
├── src/
│   ├── server.js
│   └── ...
├── logs/
│   └── .gitkeep
└── scripts/
    ├── start.sh
    ├── deploy.sh
    └── restart.sh
```

## Checklist de Producción

```bash
✅ PM2 config con cluster mode
✅ Graceful shutdown configurado
✅ Memory limits
✅ Logs rotados
✅ Monitoreo de health
✅ Alertas configuradas
✅ Auto-restart en crashes
✅ Zero-downtime deployment con reload
✅ Startup script para server reboot
✅ Nginx como reverse proxy
```

## Referencias

- [clustering.md](../08-performance/clustering.md)
- [graceful-shutdown.md](../07-errores-estabilidad/graceful-shutdown.md)
- [logs-monitoring.md](./logs-monitoring.md)

## Pregunta de Entrevista

**¿Cuál es la diferencia entre pm2 restart y pm2 reload?**

- `pm2 restart`: Hard restart - mata procesos y reinicia. Hay downtime.
- `pm2 reload`: Graceful reload - crea nuevos workers, luego mata viejos. Sin downtime.

En producción siempre usa `pm2 reload` para deployments.

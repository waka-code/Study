# Preguntas de Entrevista Senior: Node.js

Este documento contiene una recopilación de preguntas típicas que podrían surgir en una entrevista técnica para un desarrollador senior con experiencia en Node.js. Estas preguntas están diseñadas para evaluar tu conocimiento avanzado en esta tecnología.

---

## Preguntas sobre Node.js

1. **¿Qué es el Event Loop en Node.js y cómo funciona?**
   - El Event Loop es un mecanismo central en Node.js que permite manejar operaciones asíncronas. Node.js utiliza un modelo de ejecución basado en eventos y no bloqueante. El Event Loop procesa tareas en diferentes fases, como temporizadores, callbacks pendientes, operaciones de I/O, y más. Esto permite que Node.js maneje múltiples solicitudes concurrentes sin bloquear el hilo principal.

2. **¿Cómo manejarías operaciones de I/O intensivas en Node.js?**
   - Para operaciones de I/O intensivas, usaría técnicas como:
     - **Streams**: Para procesar datos en fragmentos en lugar de cargar todo en memoria.
     - **Workers**: Usar `worker_threads` para delegar tareas intensivas a hilos secundarios.
     - **Colas de trabajo**: Usar librerías como `bull` o `kue` para manejar tareas en segundo plano.
     - **Optimización de consultas**: Reducir la carga de I/O optimizando las consultas a bases de datos o APIs externas.

3. **¿Qué es un Stream en Node.js y cuáles son sus tipos?**
   - Un Stream es una abstracción para manejar datos que se transfieren de manera secuencial. Los tipos principales son:
     - **Readable Streams**: Para leer datos (por ejemplo, `fs.createReadStream`).
     - **Writable Streams**: Para escribir datos (por ejemplo, `fs.createWriteStream`).
     - **Duplex Streams**: Para leer y escribir datos (por ejemplo, sockets).
     - **Transform Streams**: Para modificar o transformar datos mientras se leen o escriben (por ejemplo, `zlib.createGzip`).

4. **¿Cómo manejarías errores en aplicaciones Node.js?**
   - Usaría las siguientes estrategias:
     - **Manejo de errores con try/catch**: Para capturar errores en bloques de código sincrónico.
     - **Manejo de errores en Promesas**: Usar `.catch()` o `try/catch` con `async/await`.
     - **Middleware de manejo de errores en Express**: Crear un middleware dedicado para capturar y manejar errores globales.
     - **Eventos de error**: Escuchar eventos de error en Streams o en el EventEmitter.
     ```js
     process.on('uncaughtException', (err) => {
       console.error('Error no capturado:', err);
       process.exit(1);
     });
     ```

5. **¿Qué es el módulo `cluster` y cómo se utiliza para escalar aplicaciones Node.js?**
   - El módulo `cluster` permite crear procesos hijos que comparten el mismo puerto del servidor, lo que permite aprovechar al máximo los núcleos de la CPU. Esto es útil para escalar aplicaciones Node.js, ya que por defecto Node.js utiliza un solo hilo para manejar las solicitudes.
   ```js
   const cluster = require('cluster');
   const http = require('http');
   const numCPUs = require('os').cpus().length;

   if (cluster.isMaster) {
     for (let i = 0; i < numCPUs; i++) {
       cluster.fork();
     }

     cluster.on('exit', (worker, code, signal) => {
       console.log(`Worker ${worker.process.pid} died`);
       cluster.fork(); // Reemplazar el worker caído
     });
   } else {
     http.createServer((req, res) => {
       res.writeHead(200);
       res.end('Hello World');
     }).listen(8000);
   }
   ```

6. **¿Cómo funciona el sistema de módulos en Node.js? Explica CommonJS vs ES Modules.**
   - Node.js soporta dos sistemas de módulos principales:
     - **CommonJS**: Es el sistema de módulos por defecto en Node.js. Utiliza `require` para importar módulos y `module.exports` para exportarlos.
       ```js
       // CommonJS
       const fs = require('fs');
       module.exports = { myFunction };
       ```
     - **ES Modules (ESM)**: Es el estándar moderno de JavaScript para módulos. Utiliza `import` y `export`.
       ```js
       // ES Modules
       import fs from 'fs';
       export const myFunction = () => {};
       ```
   - CommonJS es síncrono y adecuado para Node.js, mientras que ESM es asíncrono y más adecuado para navegadores modernos.

7. **¿Qué es el concepto de Middleware en Node.js y cómo lo implementarías?**
   - Un middleware es una función que tiene acceso al objeto de solicitud (`req`), respuesta (`res`) y al siguiente middleware en la cadena. Se utiliza para realizar tareas como autenticación, validación, registro, etc.
   ```js
   const express = require('express');
   const app = express();

   const loggerMiddleware = (req, res, next) => {
     console.log(`${req.method} ${req.url}`);
     next();
   };

   app.use(loggerMiddleware);

   app.get('/', (req, res) => {
     res.send('Hello World');
   });

   app.listen(3000);
   ```

8. **¿Cómo manejarías la autenticación y autorización en una aplicación Node.js?**
   - Usaría bibliotecas como `passport.js` o `jsonwebtoken` para implementar autenticación basada en sesiones o tokens JWT. Para autorización, definiría roles y permisos claros y los verificaría en los middlewares.
   ```js
   const jwt = require('jsonwebtoken');

   const authenticateToken = (req, res, next) => {
     const token = req.headers['authorization'];
     if (!token) return res.sendStatus(401);

     jwt.verify(token, 'secret_key', (err, user) => {
       if (err) return res.sendStatus(403);
       req.user = user;
       next();
     });
   };
   ```

9. **¿Qué es un Buffer en Node.js y cuándo lo usarías?**
   - Un Buffer es una estructura de datos que almacena datos binarios en memoria. Es útil para manejar flujos de datos binarios, como archivos, imágenes o datos provenientes de la red.
   ```js
   const buffer = Buffer.from('Hello World');
   console.log(buffer.toString()); // Convierte el buffer a string
   ```

10. **¿Cómo optimizarías el rendimiento de una aplicación Node.js?**
    - Usaría técnicas como:
      - Implementar **caché** con Redis o Memcached.
      - Usar **Streams** para manejar grandes volúmenes de datos.
      - Optimizar consultas a bases de datos.
      - Implementar **compresión** de respuestas HTTP con `compression`.
      - Usar un **balanceador de carga** para distribuir el tráfico.

11. **¿Qué es la asincronía en Node.js y cómo se maneja?**
    - La asincronía permite que Node.js maneje múltiples tareas sin bloquear el hilo principal. Se maneja con callbacks, Promesas y `async/await`.
    ```js
    // Ejemplo con async/await
    const fetchData = async () => {
      try {
        const data = await fetch('https://api.example.com/data');
        console.log(await data.json());
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
    ```

12. **¿Qué son los WebSockets y cómo los implementarías en Node.js?**
    - Los WebSockets permiten comunicación bidireccional en tiempo real entre cliente y servidor. Usaría la biblioteca `ws` o `socket.io` para implementarlos.
    ```js
    const WebSocket = require('ws');
    const wss = new WebSocket.Server({ port: 8080 });

    wss.on('connection', (ws) => {
      ws.on('message', (message) => {
        console.log(`Received: ${message}`);
        ws.send('Hello Client');
      });
    });
    ```

13. **¿Cómo manejarías la seguridad en una aplicación Node.js?**
    - Implementaría las siguientes prácticas:
      - Usar HTTPS para la comunicación.
      - Validar y sanitizar entradas del usuario.
      - Usar bibliotecas como `helmet` para configurar encabezados HTTP seguros.
      - Implementar autenticación y autorización robustas.
      - Proteger las cookies con `httpOnly` y `secure`.
      - Monitorear y actualizar dependencias.

14. **¿Qué es un proceso hijo (child process) en Node.js y cómo se utiliza?**
    - Un proceso hijo permite ejecutar comandos del sistema o scripts en un proceso separado. Se utiliza el módulo `child_process`.
    ```js
    const { exec } = require('child_process');

    exec('ls', (err, stdout, stderr) => {
      if (err) {
        console.error(`Error: ${err.message}`);
        return;
      }
      console.log(`Output: ${stdout}`);
    });
    ```

15. **¿Qué es la diferencia entre `process.nextTick` y `setImmediate`?**
    - `process.nextTick` ejecuta una función después de la fase actual del Event Loop, mientras que `setImmediate` la ejecuta en la siguiente iteración del Event Loop.
    ```js
    process.nextTick(() => console.log('nextTick'));
    setImmediate(() => console.log('setImmediate'));
    console.log('sync');
    // Salida: sync, nextTick, setImmediate
    ```

16. **¿Cómo manejarías la carga de trabajo pesada en un servidor Node.js?**
    - Para manejar cargas de trabajo pesadas, consideraría:
      - Usar el módulo `cluster` para aprovechar múltiples núcleos de CPU.
      - Implementar `worker_threads` para tareas intensivas en cómputo.
      - Usar colas de trabajo para procesar tareas en segundo plano.
      - Optimizar el código para mejorar la eficiencia y reducir el tiempo de ejecución.

17. **¿Qué es la diferencia entre `readFile` y `createReadStream` en Node.js?**
    - `readFile` lee un archivo completo en memoria y devuelve su contenido, mientras que `createReadStream` crea un flujo legible que permite leer el archivo en fragmentos.
    ```js
    const fs = require('fs');

    // readFile
    fs.readFile('file.txt', 'utf8', (err, data) => {
      if (err) throw err;
      console.log(data);
    });

    // createReadStream
    const stream = fs.createReadStream('file.txt', { encoding: 'utf8' });
    stream.on('data', (chunk) => {
      console.log(`Nuevo fragmento recibido: ${chunk}`);
    });
    ```

18. **¿Cómo implementarías un sistema de logging eficiente en Node.js?**
    - Implementaría un sistema de logging utilizando la biblioteca `winston` o `bunyan`. Estos permiten registrar mensajes en diferentes niveles (info, warn, error) y son configurables para enviar logs a diferentes destinos (consola, archivos, servicios externos).
    ```js
    const { createLogger, format, transports } = require('winston');

    const logger = createLogger({
      level: 'info',
      format: format.combine(
        format.timestamp(),
        format.json()
      ),
      transports: [
        new transports.Console(),
        new transports.File({ filename: 'app.log' })
      ],
    });

    logger.info('Mensaje de información');
    logger.error('Mensaje de error');
    ```

19. **¿Qué es un Memory Leak en Node.js y cómo lo identificarías?**
    - Un Memory Leak ocurre cuando una aplicación consume más y más memoria con el tiempo debido a referencias no deseadas a objetos que ya no se necesitan. Se puede identificar usando herramientas como `node --inspect` para analizar el uso de memoria o bibliotecas como `memwatch` para detectar fugas.
    ```js
    const memwatch = require('memwatch');

    memwatch.on('leak', (info) => {
      console.log('Fuga de memoria detectada:', info);
    });
    ```

20. **¿Cómo manejarías la configuración de una aplicación Node.js para diferentes entornos (desarrollo, producción, etc.)?**
    - Manejaría la configuración usando variables de entorno y archivos de configuración específicos para cada entorno. Usaría la biblioteca `dotenv` para cargar variables de entorno desde un archivo `.env`.
    ```js
    // .env
    DB_HOST=localhost
    DB_USER=root
    DB_PASS=s1mpl3

    // config.js
    require('dotenv').config();

    const config = {
      dbHost: process.env.DB_HOST,
      dbUser: process.env.DB_USER,
      dbPass: process.env.DB_PASS,
    };

    module.exports = config;
    ```

21. **¿Qué es la diferencia entre `require` y `import` en Node.js?**
    - `require` es parte del sistema de módulos CommonJS y se utiliza para importar módulos en Node.js. `import` es parte del estándar ES Modules y se utiliza para importar módulos en un formato más moderno y compatible con navegadores.
    ```js
    // CommonJS
    const express = require('express');

    // ES Modules
    import express from 'express';
    ```

22. **¿Cómo manejarías la concurrencia en Node.js?**
    - Manejaría la concurrencia utilizando el modelo de programación asíncrona de Node.js, que se basa en callbacks, Promesas y `async/await`. También podría usar `worker_threads` para tareas que requieren mucho tiempo de CPU.
    ```js
    const { Worker, isMainThread, parentPort } = require('worker_threads');

    if (isMainThread) {
      // Código del hilo principal
      const worker = new Worker(__filename);
      worker.on('message', (message) => {
        console.log(`Mensaje del worker: ${message}`);
      });
      worker.postMessage('Hola, worker!');
    } else {
      // Código del worker
      parentPort.on('message', (message) => {
        console.log(`Mensaje del hilo principal: ${message}`);
        parentPort.postMessage('Hola, hilo principal!');
      });
    }
    ```

23. **¿Qué es un Middleware en Express y cómo funciona?**
    - Un Middleware en Express es una función que tiene acceso al objeto de solicitud (`req`), respuesta (`res`) y a la siguiente función middleware en la pila. Se utiliza para realizar tareas como procesamiento de datos, autenticación, manejo de errores, etc.
    ```js
    const express = require('express');
    const app = express();

    const myMiddleware = (req, res, next) => {
      console.log('Middleware ejecutado');
      next(); // Llama al siguiente middleware en la pila
    };

    app.use(myMiddleware);

    app.get('/', (req, res) => {
      res.send('Hello World');
    });

    app.listen(3000);
    ```

24. **¿Cómo implementarías un sistema de colas en Node.js?**
    - Implementaría un sistema de colas utilizando la biblioteca `bull`, que es una cola de trabajos basada en Redis. Esto permite procesar trabajos en segundo plano y manejar tareas asíncronas de manera eficiente.
    ```js
    const Queue = require('bull');

    // Crear una nueva cola
    const myQueue = new Queue('mi-cola');

    // Procesar trabajos en la cola
    myQueue.process((job, done) => {
      console.log(`Procesando trabajo ${job.id}`);
      done();
    });

    // Agregar un trabajo a la cola
    myQueue.add({ foo: 'bar' });
    ```

25. **¿Qué es la diferencia entre `setTimeout` y `setInterval` en Node.js?**
    - `setTimeout` ejecuta una función una vez después de un retraso especificado, mientras que `setInterval` ejecuta una función repetidamente en intervalos de tiempo especificados.
    ```js
    // setTimeout
    setTimeout(() => {
      console.log('Esto se ejecuta una vez después de 2 segundos');
    }, 2000);

    // setInterval
    const intervalId = setInterval(() => {
      console.log('Esto se ejecuta cada 2 segundos');
    }, 2000);

    // Para detener el intervalo después de 10 segundos
    setTimeout(() => {
      clearInterval(intervalId);
      console.log('Intervalo detenido');
    }, 10000);
    ```

26. **¿Cómo manejarías la integración con bases de datos en Node.js?**
    - Manejaría la integración con bases de datos utilizando bibliotecas específicas para cada tipo de base de datos, como `mongoose` para MongoDB o `sequelize` para bases de datos SQL. Configuraría conexiones, modelos y realizaría consultas según las necesidades de la aplicación.
    ```js
    // Ejemplo con mongoose
    const mongoose = require('mongoose');

    mongoose.connect('mongodb://localhost:27017/miapp', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const usuarioSchema = new mongoose.Schema({
      nombre: String,
      edad: Number,
    });

    const Usuario = mongoose.model('Usuario', usuarioSchema);

    // Crear un nuevo usuario
    const nuevoUsuario = new Usuario({ nombre: 'Juan', edad: 30 });
    nuevoUsuario.save();
    ```

27. **¿Qué es la diferencia entre una Promesa y `async/await` en Node.js?**
    - Una Promesa es un objeto que representa la eventual finalización o falla de una operación asíncrona. `async/await` es una sintaxis que permite escribir código asíncrono de manera más legible, basado en Promesas.
    ```js
    // Promesa
    const miPromesa = new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve('¡Éxito!');
      }, 2000);
    });

    miPromesa.then((resultado) => {
      console.log(resultado);
    });

    // async/await
    const miFuncionAsync = async () => {
      const resultado = await miPromesa;
      console.log(resultado);
    };

    miFuncionAsync();
    ```

28. **¿Cómo manejarías errores no capturados en una aplicación Node.js?**
    - Manejaría errores no capturados utilizando el evento `uncaughtException` de `process` para registrar el error y realizar una limpieza adecuada antes de cerrar la aplicación.
    ```js
    process.on('uncaughtException', (err) => {
      console.error('Error no capturado:', err);
      // Realizar limpieza y cerrar la aplicación
      process.exit(1);
    });
    ```

29. **¿Qué es la diferencia entre `fork` y `spawn` en el módulo `child_process`?**
    - `fork` se utiliza para crear un nuevo proceso hijo y ejecutar un módulo de JavaScript en él, mientras que `spawn` se utiliza para crear un proceso hijo y ejecutar un comando del sistema.
    ```js
    const { fork, spawn } = require('child_process');

    // fork
    const child = fork('miModulo.js');
    child.on('message', (mensaje) => {
      console.log(`Mensaje del proceso hijo: ${mensaje}`);
    });
    child.send('Hola, proceso hijo');

    // spawn
    const ls = spawn('ls', ['-lh', '/usr']);
    ls.stdout.on('data', (data) => {
      console.log(`Salida: ${data}`);
    });
    ```

30. **¿Cómo implementarías un API RESTful con Express?**
    - Implementaría un API RESTful definiendo rutas y controladores para manejar las operaciones CRUD (Crear, Leer, Actualizar, Eliminar). Usaría métodos HTTP apropiados (POST, GET, PUT, DELETE) y estructuraría las respuestas en formato JSON.
    ```js
    const express = require('express');
    const app = express();
    app.use(express.json());

    let usuarios = [{ id: 1, nombre: 'Juan' }];

    // Obtener todos los usuarios
    app.get('/api/usuarios', (req, res) => {
      res.json(usuarios);
    });

    // Crear un nuevo usuario
    app.post('/api/usuarios', (req, res) => {
      const nuevoUsuario = { id: Date.now(), ...req.body };
      usuarios.push(nuevoUsuario);
      res.status(201).json(nuevoUsuario);
    });

    // Actualizar un usuario
    app.put('/api/usuarios/:id', (req, res) => {
      const { id } = req.params;
      const index = usuarios.findIndex((u) => u.id == id);
      if (index === -1) return res.sendStatus(404);
      usuarios[index] = { id, ...req.body };
      res.json(usuarios[index]);
    });

    // Eliminar un usuario
    app.delete('/api/usuarios/:id', (req, res) => {
      const { id } = req.params;
      usuarios = usuarios.filter((u) => u.id != id);
      res.sendStatus(204);
    });

    app.listen(3000);
    ```

31. **¿Qué es la diferencia entre `app.use` y `app.get` en Express?**
    - `app.use` se utiliza para montar middleware en la aplicación, mientras que `app.get` se utiliza para definir rutas que responden a solicitudes GET.
    ```js
    const express = require('express');
    const app = express();

    // Middleware que se ejecuta para todas las solicitudes
    app.use((req, res, next) => {
      console.log('Middleware global');
      next();
    });

    // Ruta que responde a solicitudes GET en /
    app.get('/', (req, res) => {
      res.send('Hola Mundo');
    });

    app.listen(3000);
    ```

32. **¿Cómo manejarías la escalabilidad horizontal en una aplicación Node.js?**
    - Manejaría la escalabilidad horizontal ejecutando múltiples instancias de la aplicación en diferentes servidores o contenedores y utilizando un balanceador de carga para distribuir el tráfico entre ellas. También consideraría el uso de bases de datos y sistemas de caché que soporten escalabilidad horizontal.
    ```js
    // Ejemplo de configuración de un balanceador de carga con Nginx
    upstream miapp {
      server app1.example.com;
      server app2.example.com;
    }

    server {
      listen 80;

      location / {
        proxy_pass http://miapp;
      }
    }
    ```

33. **¿Qué es un Worker Thread en Node.js y cuándo lo usarías?**
    - Un Worker Thread es un hilo de ejecución separado que puede ejecutar código JavaScript en paralelo con el hilo principal. Lo usaría para tareas intensivas en cómputo que podrían bloquear el Event Loop, como procesamiento de imágenes, cálculos complejos, etc.
    ```js
    const { Worker, isMainThread, parentPort } = require('worker_threads');

    if (isMainThread) {
      // Código del hilo principal
      const worker = new Worker(__filename);
      worker.on('message', (mensaje) => {
        console.log(`Mensaje del worker: ${mensaje}`);
      });
      worker.postMessage('Iniciar tarea pesada');
    } else {
      // Código del worker
      parentPort.on('message', (mensaje) => {
        console.log(`Mensaje del hilo principal: ${mensaje}`);
        // Realizar tarea pesada aquí
        parentPort.postMessage('Tarea pesada completada');
      });
    }
    ```

34. **¿Cómo manejarías la validación de datos en una API de Node.js?**
    - Manejaría la validación de datos utilizando bibliotecas como `joi` o `express-validator` para definir esquemas de validación y verificar los datos de entrada en las solicitudes.
    ```js
    const express = require('express');
    const { body, validationResult } = require('express-validator');
    const app = express();
    app.use(express.json());

    app.post('/api/usuarios', [
      body('nombre').isString().notEmpty(),
      body('edad').isInt({ min: 0 }),
    ], (req, res) => {
      const errores = validationResult(req);
      if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
      }
      // Crear usuario
    });

    app.listen(3000);
    ```

35. **¿Qué es la diferencia entre `process.env` y un archivo `.env`?**
    - `process.env` es un objeto que contiene las variables de entorno del proceso en ejecución. Un archivo `.env` es un archivo de texto que contiene pares clave-valor de variables de entorno. Se suele usar la biblioteca `dotenv` para cargar las variables de un archivo `.env` a `process.env`.
    ```js
    // .env
    DB_HOST=localhost
    DB_USER=root
    DB_PASS=s1mpl3

    // config.js
    require('dotenv').config();

    console.log(process.env.DB_HOST); // localhost
    ```

36. **¿Cómo implementarías WebSockets con Socket.IO en Node.js?**
    - Implementaría WebSockets con Socket.IO instalando la biblioteca `socket.io` y configurándola en el servidor. Luego, manejaría eventos de conexión y mensajes en el servidor y el cliente.
    ```js
    const http = require('http');
    const { Server } = require('socket.io');

    const server = http.createServer();
    const io = new Server(server);

    io.on('connection', (socket) => {
      console.log('Nuevo cliente conectado');

      socket.on('mensaje', (data) => {
        console.log(`Mensaje recibido: ${data}`);
        socket.emit('respuesta', 'Hola desde el servidor');
      });

      socket.on('disconnect', () => {
        console.log('Cliente desconectado');
      });
    });

    server.listen(3000);
    ```

37. **¿Qué es la diferencia entre `npm` y `yarn`?**
    - `npm` es el gestor de paquetes por defecto para Node.js, mientras que `yarn` es un gestor de paquetes alternativo desarrollado por Facebook. Ambos se utilizan para instalar, actualizar y gestionar dependencias en proyectos de Node.js, pero tienen diferencias en su rendimiento, características y sintaxis de comandos.
    ```bash
    # npm
    npm install express

    # yarn
    yarn add express
    ```

38. **¿Cómo manejarías la gestión de dependencias en un proyecto Node.js?**
    - Manejaría la gestión de dependencias utilizando `npm` o `yarn` para instalar y actualizar paquetes. También usaría un archivo `package.json` para definir las dependencias del proyecto y sus versiones.
    ```bash
    # Inicializar un nuevo proyecto y crear package.json
    npm init -y

    # Instalar una dependencia
    npm install express

    # Instalar una dependencia de desarrollo
    npm install --save-dev nodemon
    ```

39. **¿Qué es un Middleware de error en Express y cómo se implementa?**
    - Un Middleware de error en Express es una función que maneja errores que ocurren durante el procesamiento de una solicitud. Se implementa definiendo una función middleware con cuatro argumentos: `err`, `req`, `res` y `next`.
    ```js
    const express = require('express');
    const app = express();

    // Middleware de error
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).send('Algo salió mal');
    });

    app.get('/', (req, res) => {
      throw new Error('Error de prueba');
    });

    app.listen(3000);
    ```

40. **¿Cómo manejarías la autenticación basada en tokens (JWT) en Node.js?**
    - Manejaría la autenticación basada en tokens utilizando la biblioteca `jsonwebtoken` para generar y verificar tokens JWT. Protegería las rutas de la API verificando el token en los headers de las solicitudes.
    ```js
    const jwt = require('jsonwebtoken');

    // Generar un token
    const token = jwt.sign({ id: usuario.id }, 'clave_secreta', { expiresIn: '1h' });

    // Verificar un token
    jwt.verify(token, 'clave_secreta', (err, decoded) => {
      if (err) return res.sendStatus(403);
      req.user = decoded;
      next();
    });
    ```

---

Estas preguntas abarcan los temas más avanzados y relevantes para entrevistas técnicas de nivel senior en Node.js. Si necesitas respuestas detalladas o ejemplos para alguna de estas preguntas, ¡no dudes en pedírmelo! 🚀
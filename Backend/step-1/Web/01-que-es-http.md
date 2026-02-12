# Qué es HTTP y para qué sirve

## 📌 Definición

**HTTP (HyperText Transfer Protocol)** es un protocolo de aplicación diseñado para la transferencia de datos en la World Wide Web. Es el protocolo sobre el cual se construye la web moderna.

## 🎯 Propósito

HTTP permite la comunicación entre clientes (navegadores, aplicaciones) y servidores web, permitiendo:
- **Solicitar recursos** (páginas HTML, imágenes, APIs)
- **Enviar datos** (formularios, información del usuario)
- **Recibir respuestas** con el contenido o estados

## 🔑 Características Fundamentales

### 1. **Protocolo sin estado (Stateless)**
Cada petición HTTP es independiente. El servidor no mantiene información sobre peticiones anteriores del cliente.

```
Petición 1 → Respuesta 1
Petición 2 → Respuesta 2 (el servidor no recuerda la petición 1)
```

### 2. **Basado en TCP/IP**
HTTP utiliza TCP (Transmission Control Protocol) para garantizar que los datos lleguen correctamente.

### 3. **Request-Response**
Sigue un modelo de pregunta-respuesta:
- Cliente envía una **request** (solicitud)
- Servidor procesa y envía una **response** (respuesta)

### 4. **Métodos HTTP**
Define formas estandarizadas de solicitar recursos: GET, POST, PUT, PATCH, DELETE, etc.

### 5. **Códigos de Estado**
Indica el resultado de la operación: 200 (éxito), 404 (no encontrado), 500 (error servidor), etc.

## 📊 Versiones de HTTP

| Versión | Año | Características |
|---------|-----|-----------------|
| HTTP/1.0 | 1996 | Versión original, conexión por petición |
| HTTP/1.1 | 1997 | Keep-alive, pipeline, mejoras de rendimiento |
| HTTP/2 | 2015 | Multiplexión, compresión, rendimiento mejorado |
| HTTP/3 | 2022 | QUIC protocol, latencia reducida |

## 🌐 URLs en HTTP

Una URL HTTP tiene la estructura:

```
scheme://host:port/path?query#fragment

Ejemplo:
https://www.ejemplo.com:443/api/usuarios?id=123#seccion
```

- **scheme**: `https://` (protocolo)
- **host**: `www.ejemplo.com` (dominio)
- **port**: `443` (puerto, opcional)
- **path**: `/api/usuarios` (ruta del recurso)
- **query**: `?id=123` (parámetros)
- **fragment**: `#seccion` (ancla, no se envía al servidor)

## 💡 Ejemplo: Flujo Simple

### Cliente (Navegador)
```
Usuario escribe: https://ejemplo.com/index.html
El navegador crea una petición HTTP
```

### Servidor
```
Recibe la petición
Busca el archivo /index.html
Prepara la respuesta
```

### Respuesta
```
Envía HTTP/1.1 200 OK
Content-Type: text/html
[contenido HTML]
```

### Navegador
```
Renderiza el HTML
Descarga recursos adicionales (CSS, JS, imágenes)
```

## 🔒 HTTP vs HTTPS

| Aspecto | HTTP | HTTPS |
|--------|------|-------|
| Protocolo | Inseguro | Seguro (con TLS/SSL) |
| Puerto | 80 | 443 |
| Encriptación | No | Sí |
| Certificado | No requerido | Sí, requerido |
| Uso | Obsoleto/Local | Recomendado/Producción |

## 📚 Casos de Uso

1. **Páginas Web** - Cargar HTML, CSS, JavaScript
2. **APIs RESTful** - Transferencia de datos en formato JSON
3. **Descargas** - Archivos, documentos
4. **Streaming** - Video, audio
5. **IoT** - Dispositivos comunicándose con servidores

## 🎓 Conceptos Clave a Recordar

✅ HTTP es **stateless** - sin memoria entre peticiones
✅ HTTP es **request-response** - cliente inicia, servidor responde
✅ HTTP es **estándar** - definido por la IETF (RFC 7230-7237)
✅ HTTP es **extensible** - soporta headers y métodos personalizados
✅ HTTP es **seguro** - especialmente en HTTPS con TLS/SSL

## 🔗 Próximo Paso

Continúa con [Cliente vs Servidor](02-cliente-vs-servidor.md) para entender la arquitectura.

---

**Nivel de Dificultad:** ⭐ Básico

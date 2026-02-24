# Throttling Pattern

Limita la cantidad de recursos utilizados o la frecuencia de operaciones para evitar saturar el sistema. Se aplica a llamadas API, procesamiento de eventos, etc.

**Ventajas:**
- Protege el sistema de sobrecarga.
- Mantiene la estabilidad bajo alta demanda.

**Trade-off:**

---

## Profundización
El patrón de throttling controla la frecuencia con la que se ejecutan acciones, evitando saturar recursos. Es fundamental en sistemas que reciben muchas solicitudes o eventos, como APIs, interfaces de usuario, o procesamiento de streams.

### Ejemplo Frontend (JavaScript/React)
```js
// Throttle: ejecuta la función cada X ms, ignorando eventos intermedios
function throttle(fn, delay) {
	let lastCall = 0;
	return function (...args) {
		const now = Date.now();
		if (now - lastCall >= delay) {
			lastCall = now;
			fn.apply(this, args);
		}
	};
}

// Uso: limitar scroll handler
window.addEventListener('scroll', throttle(() => {
	console.log('Scroll detectado');
}, 200));
```

### Ejemplo Backend (Node.js/Express)
```js
// Middleware de throttling para rutas
const throttle = (limit, interval) => {
	let calls = 0;
	let start = Date.now();
	return (req, res, next) => {
		if (Date.now() - start > interval) {
			calls = 0;
			start = Date.now();
		}
		if (calls < limit) {
			calls++;
			next();
		} else {
			res.status(429).send('Too Many Requests');
		}
	};
};

app.use('/api', throttle(10, 1000)); // Máximo 10 llamadas por segundo
```

### Ejemplo Backend (Ruby on Rails)
```ruby
# Usando rack-throttle
use Rack::Throttle::Minute, max: 60
# Limita a 60 solicitudes por minuto
```

---

## Consideraciones

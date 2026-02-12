# Caching Pattern

Almacena temporalmente datos o resultados de operaciones costosas (consultas, cálculos) para evitar repetir el trabajo y mejorar la velocidad. Se usa en memoria, disco, o sistemas distribuidos (Redis, Memcached).

## Ejemplos

### Frontend (React)
```js
// Cache simple en memoria para datos de API
const cache = {};
async function fetchWithCache(url) {
	if (cache[url]) return cache[url];
	const res = await fetch(url);
	const data = await res.json();
	cache[url] = data;
	return data;
}
```

#### Alternativas en React:
- **useMemo:** Cachea el resultado de una función mientras las dependencias no cambian.
- **useCallback:** Cachea una función para evitar recrearla en cada render.
- **React.memo:** Cachea componentes para evitar renders innecesarios.

Estos hooks son útiles para optimizar cálculos, funciones o componentes, pero no para cachear datos de API entre renders o rutas. Para cache persistente, se usa un objeto, context, o librerías como SWR/React Query.

### Backend (Node.js)
```js
// Usando Redis para cachear resultados
const redis = require('redis');
const client = redis.createClient();

async function getUser(id) {
	const cached = await client.getAsync(`user:${id}`);
	if (cached) return JSON.parse(cached);
	const user = await db.findUserById(id);
	await client.setAsync(`user:${id}`, JSON.stringify(user));
	return user;
}
```

### Backend (Next.js)
```js
// ISR (Incremental Static Regeneration)
export async function getStaticProps() {
	const data = await fetch('https://api.example.com/data');
	return {
		props: { data },
		revalidate: 60, // Regenera cada 60 segundos
	};
}
```

### Backend (Ruby on Rails)
```ruby
# Usando fragment caching en vistas
<% cache(@user) do %>
	<%= render @user %>
<% end %>

# Usando Rails.cache para datos
Rails.cache.fetch("user/#{user.id}", expires_in: 12.hours) do
	user.expensive_query
end
```

**Ventajas:**
- Reduce latencia y carga en recursos.
- Mejora la experiencia del usuario.

**Trade-off:**
- Riesgo de datos desactualizados (cache invalidation).
- Consumo de memoria adicional.

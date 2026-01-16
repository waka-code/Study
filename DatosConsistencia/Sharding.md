# Sharding

## ¿Qué es?
Dividir los datos en fragmentos (shards) distribuidos en varios servidores.

## ¿Para qué sirve?
- Escalar horizontalmente.
- Manejar grandes volúmenes de datos.

## Desafíos
- Consultas complejas entre shards.
- Consistencia y particionamiento de datos.

## Ejemplo
- Supón que tienes usuarios con id numérico:
- Usuarios con id 1-1000 van al shard1, 1001-2000 al shard2, etc.

```js
// Pseudocódigo de selección de shard
function getShard(userId) {
  if (userId <= 1000) return shard1;
  else if (userId <= 2000) return shard2;
  else return shard3;
}
getShard(1500).query('SELECT * FROM usuarios WHERE id = 1500');
```

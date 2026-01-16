# Read Replicas

## ¿Qué son?
Copias de solo lectura de la base de datos principal.

## ¿Para qué sirven?
- Escalar la lectura (más consultas simultáneas).
- Mejorar la disponibilidad y tolerancia a fallos.

## Consideraciones
- Las réplicas pueden tener un pequeño retraso respecto a la base principal.
- No se usan para escrituras.

## Ejemplo
- En PostgreSQL:
```sh
# En el servidor replica
standby_mode = 'on'
primary_conninfo = 'host=master_ip user=replicator password=secret'
```
- En código (pseudocódigo):
```js
// Lecturas van a la réplica
readDb.query('SELECT * FROM productos');
// Escrituras van al master
writeDb.query('INSERT INTO productos ...');
```

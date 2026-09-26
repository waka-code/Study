# Sesión 16 — MongoDB con Mongoose: schemas, populate, índices, agregaciones

> **Objetivo de la sesión**: entender *cuándo* un modelo documental encaja mejor que uno relacional y cómo Nest integra **Mongoose** a través de `@nestjs/mongoose`. Al terminar deberías poder definir schemas con decoradores (`@Schema`, `@Prop`), inyectar modelos con `@InjectModel`, decidir entre **embeber y referenciar**, usar `populate` sin caer en N+1, diseñar **índices** (compuestos, únicos, de texto, TTL) siguiendo la regla ESR, escribir **pipelines de agregación**, usar `lean()` con criterio, hooks, virtuals, discriminators y transacciones con replica sets.

---

## 1. ¿Por qué MongoDB (y por qué no)?

MongoDB es una base de datos **documental**: guarda documentos BSON (JSON binario con tipos extra: `ObjectId`, `Date`, `Decimal128`...) agrupados en **colecciones**. No hay esquema obligatorio a nivel de base de datos; el esquema vive en tu aplicación (Mongoose) o, opcionalmente, en un `$jsonSchema` validator.

| Aspecto | Relacional (Postgres, Sesiones 14–15) | Documental (MongoDB) |
|---|---|---|
| Unidad de datos | Fila en una tabla normalizada | Documento anidado (agregado) |
| Esquema | Rígido, en la BD (DDL + migraciones) | Flexible, en la app |
| Relaciones | `JOIN` eficiente, FKs con integridad | Embebido o referencias; `$lookup` existe pero es más caro |
| Transacciones | Nativas, maduras | Multi-documento desde 4.0, **requieren replica set** |
| Escalado horizontal | Difícil (sharding manual, Citus) | Sharding nativo |
| Modelado | Normalizas y luego consultas lo que sea | **Modelas según cómo vas a leer** |

La idea clave: en Mongo **el documento es la unidad de atomicidad**. Una escritura sobre *un* documento es atómica siempre, aunque modifique arrays y subdocumentos anidados. Por eso el buen diseño documental intenta que cada operación de negocio toque **un solo documento**.

```
Relacional (normalizado)                 Documental (agregado)
┌────────┐   ┌───────────┐              ┌──────────────────────────────┐
│ ordenes│──<│ orden_items│             │ orden {                       │
└────────┘   └───────────┘              │   _id, clienteId, estado,     │
                  │                      │   items: [                    │
             ┌─────────┐                 │     { productoId, nombre,     │
             │productos│                 │       precio, cantidad } ],   │
             └─────────┘                 │   total                       │
  3 tablas, JOINs al leer                │ }  ← 1 lectura, 1 escritura   │
                                         └──────────────────────────────┘
```

> ❓ **Entrevista**: *"¿Cuándo elegirías MongoDB sobre Postgres?"* → Cuando los datos son naturalmente jerárquicos o de forma variable (catálogos con atributos distintos por categoría, eventos, logs, contenido CMS), cuando las lecturas son por agregado completo, o cuando necesitas sharding horizontal. Si el dominio tiene muchas relaciones muchos-a-muchos, reportes ad-hoc con JOINs e integridad referencial fuerte (dinero, inventario contable), Postgres suele ganar. "Mongo porque no tiene esquema" es una mala razón: el esquema existe igual, solo que lo mantienes tú.

---

## 2. Instalación y conexión

```bash
npm i @nestjs/mongoose mongoose
# Mongo local con replica set de un nodo (necesario para transacciones, sección 10)
docker run -d --name mongo -p 27017:27017 mongo:7 --replSet rs0
docker exec mongo mongosh --eval "rs.initiate()"
```

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductosModule } from './productos/productos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // forRootAsync: la URI viene de ConfigService (Sesión 7), nunca hardcodeada
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGO_URI'), // mongodb://localhost:27017/tienda?replicaSet=rs0
        maxPoolSize: 20,          // conexiones simultáneas por instancia de la app
        serverSelectionTimeoutMS: 5000,
        autoIndex: config.get('NODE_ENV') !== 'production', // ver sección 6
      }),
    }),
    ProductosModule,
  ],
})
export class AppModule {}
```

`MongooseModule.forRoot*` crea **una conexión** (con su pool) registrada como provider. Si necesitas varias bases, usa `connectionName`:

```typescript
MongooseModule.forRoot(process.env.MONGO_LOGS_URI!, { connectionName: 'logs' });
// y luego: MongooseModule.forFeature([...], 'logs') y @InjectModel(Log.name, 'logs')
```

> ⚠️ No llames a `mongoose.connect()` a mano dentro de un servicio. El módulo ya gestiona la conexión, la cierra en el shutdown (lifecycle hooks, Sesión 24) y la expone vía DI con `@InjectConnection()`.

---

## 3. Schemas con decoradores

`@nestjs/mongoose` permite definir el schema como una **clase TypeScript** con decoradores; `SchemaFactory.createForClass` la convierte en un `mongoose.Schema` real.

```typescript
// src/productos/schemas/producto.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Categoria } from '../../categorias/schemas/categoria.schema';

// Tipo del documento "hidratado": la clase + métodos de Mongoose (save, populate, _id...)
export type ProductoDocument = HydratedDocument<Producto>;

@Schema({
  collection: 'productos',
  timestamps: true,        // agrega createdAt / updatedAt automáticamente
  versionKey: false,       // elimina __v (o déjalo para optimistic concurrency, Sesión 17)
})
export class Producto {
  @Prop({ required: true, trim: true, minlength: 3, maxlength: 100 })
  nombre: string;

  @Prop({ required: true, unique: true, lowercase: true })  // unique crea un índice único
  slug: string;

  @Prop({ required: true, min: 0 })
  precio: number;          // en centavos/pesos enteros: evita floats para dinero

  @Prop({ default: 0, min: 0 })
  stock: number;

  @Prop({ type: [String], default: [] })   // arrays: declara el tipo explícito
  etiquetas: string[];

  // Referencia a otra colección (se resuelve con populate, sección 5)
  @Prop({ type: Types.ObjectId, ref: Categoria.name, required: true, index: true })
  categoria: Types.ObjectId | Categoria;

  // Atributos libres por categoría (tallas, voltaje...): Mixed / Map
  @Prop({ type: Map, of: String, default: {} })
  atributos: Map<string, string>;

  @Prop({ default: true })
  activo: boolean;
}

export const ProductoSchema = SchemaFactory.createForClass(Producto);

// Índices compuestos y de texto se declaran sobre el schema (sección 6)
ProductoSchema.index({ categoria: 1, activo: 1, precio: 1 });
ProductoSchema.index({ nombre: 'text', etiquetas: 'text' });
```

### 3.1 Por qué `type:` explícito a veces

Los decoradores se apoyan en `reflect-metadata` (Sesión 2) para inferir el tipo: `design:type` de `string` es `String`, de `number` es `Number`. Pero la reflexión de TypeScript **pierde información** en:

| Caso | Qué emite TS | Qué necesitas en `@Prop` |
|---|---|---|
| `string[]` | `Array` (sin tipo del elemento) | `type: [String]` |
| `Types.ObjectId \| Categoria` (unión) | `Object` | `type: Types.ObjectId, ref: ...` |
| `Map<string, string>` | `Map` | `type: Map, of: String` |
| Subdocumento como clase | a veces OK, en arrays no | `type: [ItemSchema]` |
| `Record<string, any>` | `Object` | `type: mongoose.Schema.Types.Mixed` |

> ⚠️ Un campo `Mixed` es invisible para el change tracking de Mongoose: si lo mutas in-place (`doc.meta.x = 1`) debes llamar `doc.markModified('meta')` antes de `save()`, o el cambio no se persiste.

### 3.2 Subdocumentos embebidos

```typescript
// src/ordenes/schemas/orden.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

// _id: false → los items no necesitan identidad propia
@Schema({ _id: false })
export class ItemOrden {
  @Prop({ type: Types.ObjectId, ref: 'Producto', required: true })
  productoId: Types.ObjectId;

  @Prop({ required: true }) nombre: string;   // SNAPSHOT del nombre al comprar
  @Prop({ required: true }) precio: number;   // SNAPSHOT del precio al comprar
  @Prop({ required: true, min: 1 }) cantidad: number;
}
export const ItemOrdenSchema = SchemaFactory.createForClass(ItemOrden);

export enum EstadoOrden { PENDIENTE = 'PENDIENTE', PAGADA = 'PAGADA', ENVIADA = 'ENVIADA', CANCELADA = 'CANCELADA' }

@Schema({ timestamps: true })
export class Orden {
  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, index: true })
  clienteId: Types.ObjectId;

  @Prop({ type: [ItemOrdenSchema], validate: [(v: unknown[]) => v.length > 0, 'La orden necesita items'] })
  items: ItemOrden[];

  @Prop({ type: String, enum: EstadoOrden, default: EstadoOrden.PENDIENTE })
  estado: EstadoOrden;

  @Prop({ required: true, min: 0 })
  total: number;
}
export type OrdenDocument = HydratedDocument<Orden>;
export const OrdenSchema = SchemaFactory.createForClass(Orden);
OrdenSchema.index({ clienteId: 1, createdAt: -1 }); // "mis órdenes, más recientes primero"
```

> ❓ **Entrevista**: *"¿Por qué el item de la orden copia nombre y precio en vez de referenciar al producto?"* → Porque la orden es un **hecho histórico**: si mañana el producto sube de precio, la orden de ayer debe seguir diciendo lo que el cliente pagó. Duplicar datos en Mongo no es un pecado cuando el dato es un snapshot inmutable; es precisamente el patrón correcto.

---

## 4. Registrar e inyectar modelos

```typescript
// src/productos/productos.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Producto, ProductoSchema } from './schemas/producto.schema';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';

@Module({
  imports: [
    // Registra el modelo en el scope de ESTE módulo. El token es 'ProductoModel'
    MongooseModule.forFeature([{ name: Producto.name, schema: ProductoSchema }]),
  ],
  controllers: [ProductosController],
  providers: [ProductosService],
  exports: [ProductosService], // exporta el servicio, no el modelo (encapsulación, Sesión 3)
})
export class ProductosModule {}
```

```typescript
// src/productos/productos.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Producto, ProductoDocument } from './schemas/producto.schema';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { ActualizarProductoDto } from './dto/actualizar-producto.dto';

@Injectable()
export class ProductosService {
  constructor(
    @InjectModel(Producto.name) private readonly productoModel: Model<Producto>,
  ) {}

  async crear(dto: CrearProductoDto): Promise<ProductoDocument> {
    try {
      return await this.productoModel.create(dto); // valida el schema y hace insert
    } catch (e: any) {
      // 11000 = duplicate key (índice único violado)
      if (e?.code === 11000) throw new ConflictException('El slug ya existe');
      throw e;
    }
  }

  async obtener(id: string) {
    const producto = await this.productoModel.findById(id).lean().exec();
    if (!producto) throw new NotFoundException(`Producto ${id} no encontrado`);
    return producto;
  }

  async actualizar(id: string, dto: ActualizarProductoDto) {
    const actualizado = await this.productoModel
      .findByIdAndUpdate(id, { $set: dto }, {
        new: true,            // devuelve el documento DESPUÉS del update
        runValidators: true,  // ⚠️ por defecto los updates NO corren validadores
      })
      .lean()
      .exec();
    if (!actualizado) throw new NotFoundException(`Producto ${id} no encontrado`);
    return actualizado;
  }

  async descontarStock(id: Types.ObjectId, cantidad: number): Promise<boolean> {
    // Update ATÓMICO condicional: nunca "leer, restar en JS y guardar" (race condition)
    const res = await this.productoModel.updateOne(
      { _id: id, stock: { $gte: cantidad } },
      { $inc: { stock: -cantidad } },
    );
    return res.modifiedCount === 1;
  }
}
```

> ⚠️ **`runValidators`**: `create()` y `save()` validan el schema, pero `updateOne`, `findByIdAndUpdate`, etc. **no** lo hacen a menos que pases `runValidators: true` (o lo actives globalmente con `mongoose.set('runValidators', true)`). Es uno de los bugs más comunes: un `precio: -5` entra por un PATCH.

> ⚠️ **Read-modify-write** (`findById` → `doc.stock -= n` → `save()`) con dos requests concurrentes pierde actualizaciones. Usa operadores atómicos (`$inc`, `$push`, `$set`) con la condición en el filtro, como `descontarStock`.

### 4.1 Validar ObjectId en la entrada

Un `findById('abc')` lanza `CastError`, que sin manejo termina en un 500. Valida en el borde con un pipe (Sesión 10):

```typescript
// src/common/pipes/parse-object-id.pipe.ts
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isValidObjectId, Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, Types.ObjectId> {
  transform(value: string): Types.ObjectId {
    if (!isValidObjectId(value)) throw new BadRequestException(`"${value}" no es un ObjectId válido`);
    return new Types.ObjectId(value);
  }
}

// uso: @Get(':id') obtener(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) { ... }
```

> 💡 Versiones recientes de `@nestjs/mongoose` ya exportan un `ParseObjectIdPipe` propio; revisa tu versión antes de duplicarlo. Escribirlo a mano es buen ejercicio y no depende de la versión.

### 4.2 Documento hidratado vs `lean()`

| | Documento hidratado | `.lean()` |
|---|---|---|
| Qué devuelve | Instancia de `Model` con getters, setters, `save()`, virtuals | POJO plano |
| Costo | Alto (≈3–5x más memoria y CPU al instanciar) | Bajo |
| Virtuals / getters | ✅ | ❌ (salvo plugin `mongoose-lean-virtuals`) |
| `save()`, change tracking | ✅ | ❌ |
| Cuándo | Vas a modificar y guardar con la lógica del documento | Lecturas para devolver en la API (la mayoría) |

> ❓ **Entrevista**: *"¿Qué hace `lean()` y cuándo NO usarlo?"* → Salta la hidratación y devuelve objetos planos: mucho más rápido para lecturas. No lo uses cuando necesitas virtuals, getters, métodos de instancia o `save()` con hooks `pre('save')`.

---

## 5. Relaciones: embeber vs referenciar, y `populate`

La decisión de diseño más importante en Mongo:

| Criterio | **Embeber** | **Referenciar** |
|---|---|---|
| Cardinalidad | 1–a–pocos (direcciones de un usuario) | 1–a–muchos o muchos-a-muchos (productos de una categoría) |
| ¿Se lee junto? | Casi siempre | A veces |
| ¿Crece sin límite? | ❌ Nunca embebas arrays no acotados | ✅ |
| ¿Tiene vida propia? | No (items de una orden) | Sí (producto, usuario) |
| ¿Se actualiza por separado y a menudo? | No | Sí |
| Límite duro | Documento ≤ **16 MB** | — |

> ⚠️ **Anti-patrón "array sin límite"**: guardar `productoIds: [...]` dentro de la categoría. Crece sin fin, cada `$push` reescribe un documento cada vez más grande, y chocas contra los 16 MB. La referencia va del lado "muchos": el producto apunta a su categoría.

### 5.1 `populate`

```typescript
// Trae el producto con su categoría resuelta (solo nombre y slug)
const producto = await this.productoModel
  .findById(id)
  .populate<{ categoria: Categoria }>('categoria', 'nombre slug') // tipado del campo poblado
  .lean()
  .exec();
```

¿Cómo funciona por dentro? `populate` **no es un JOIN**: Mongoose ejecuta la query principal, recolecta todos los `ObjectId` referenciados y hace **una segunda query** `{ _id: { $in: [...] } }` a la colección referenciada, luego los "cose" en memoria.

```
find productos (limit 20) ──▶ 20 docs, 5 categorías distintas
        │
        └─▶ find categorias { _id: { $in: [c1..c5] } }   ← 1 query extra, no 20
```

Eso significa que **un `populate` sobre una lista NO es N+1** (son 2 queries). El N+1 aparece cuando haces `populate` *dentro de un bucle* o `findById` por cada elemento (Sesión 17 lo profundiza).

```typescript
// ❌ N+1: una query por orden
for (const orden of ordenes) {
  orden.cliente = await this.usuarioModel.findById(orden.clienteId).lean();
}

// ✅ 2 queries
const ordenes = await this.ordenModel.find({ estado: 'PAGADA' })
  .populate('clienteId', 'nombre email')
  .lean();
```

Populate anidado y con condiciones:

```typescript
await this.ordenModel.find({ clienteId })
  .populate({
    path: 'items.productoId',
    select: 'nombre categoria',
    populate: { path: 'categoria', select: 'nombre' }, // 3ra query
  })
  .lean();
```

> ⚠️ Populates anidados profundos = muchas queries y mucha memoria. Si lo necesitas siempre, es señal de que el modelo debería **embeber un snapshot** o de que la lectura es un buen caso para `$lookup` en una agregación.

---

## 6. Índices: el 80 % del rendimiento

Sin índice, Mongo hace un **COLLSCAN** (recorre toda la colección). Con el índice correcto, un **IXSCAN** que toca solo lo necesario.

```typescript
// Formas de declarar índices
@Prop({ index: true }) sku: string;                       // simple
@Prop({ unique: true }) email: string;                    // único (NO es un validador de Mongoose)
ProductoSchema.index({ categoria: 1, precio: -1 });       // compuesto
ProductoSchema.index({ nombre: 'text', descripcion: 'text' }, { weights: { nombre: 5 } }); // texto
ProductoSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { eliminado: false } }); // parcial
SesionSchema.index({ expiraEn: 1 }, { expireAfterSeconds: 0 }); // TTL: Mongo borra los docs vencidos
```

### 6.1 La regla ESR para índices compuestos

El orden de los campos en un índice compuesto importa. Regla **ESR**: **E**quality → **S**ort → **R**ange.

```typescript
// Query típica del catálogo:
// categoria = X (igualdad), activo = true (igualdad), ordenado por createdAt desc (sort), precio entre A y B (rango)
this.productoModel
  .find({ categoria, activo: true, precio: { $gte: min, $lte: max } })
  .sort({ createdAt: -1 });

// Índice óptimo según ESR:
ProductoSchema.index({ categoria: 1, activo: 1, createdAt: -1, precio: 1 });
//                      E            E          S               R
```

Si pones el rango antes del sort, Mongo no puede usar el índice para ordenar y hace un **SORT en memoria** (limitado a 100 MB; si lo excede, la query falla o usa disco con `allowDiskUse`).

### 6.2 Verificar con `explain`

```typescript
const plan = await this.productoModel
  .find({ categoria, activo: true })
  .sort({ createdAt: -1 })
  .explain('executionStats');
// Revisa: winningPlan.stage (IXSCAN bueno, COLLSCAN malo),
// totalDocsExamined vs nReturned (idealmente ≈ iguales)
```

### 6.3 `autoIndex` en producción

Por defecto Mongoose llama `createIndex` para cada índice del schema al arrancar. En producción con colecciones grandes, construir un índice puede tardar y consumir recursos. Práctica habitual: `autoIndex: false` en producción y crear índices con un **script de migración** controlado (Sesión 17) o `Model.syncIndexes()` en un job de deploy.

> ⚠️ `unique: true` en `@Prop` **no** es una validación: es un índice. Si el índice no se creó (por `autoIndex: false` o porque ya había duplicados), no hay garantía de unicidad. Y el error llega como `E11000 duplicate key` del servidor, no como `ValidationError`.

> ❓ **Entrevista**: *"¿Qué costo tiene un índice?"* → Cada índice ocupa RAM (el working set ideal cabe en memoria) y **ralentiza cada escritura**, porque hay que actualizarlo. Indexa según las queries reales (usa el profiler o `$indexStats`), no "por si acaso".

---

## 7. Paginación y búsqueda en Mongo

```typescript
// Offset (skip/limit): simple, pero skip(100000) recorre 100 000 docs
async listar(page = 1, limit = 20) {
  limit = Math.min(limit, 100);
  const filtro = { activo: true };
  const [items, total] = await Promise.all([
    this.productoModel.find(filtro).sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit).limit(limit).lean(),
    this.productoModel.countDocuments(filtro),
  ]);
  return { items, total, page, limit };
}

// Cursor / keyset: estable y O(log n) por página, ideal para scroll infinito
async listarPorCursor(despuesDe?: string, limit = 20) {
  const filtro = despuesDe ? { _id: { $lt: new Types.ObjectId(despuesDe) } } : {};
  const items = await this.productoModel.find(filtro).sort({ _id: -1 }).limit(limit + 1).lean();
  const hayMas = items.length > limit;
  if (hayMas) items.pop();
  return { items, siguienteCursor: hayMas ? items[items.length - 1]._id.toString() : null };
}
```

El `ObjectId` incluye un timestamp en sus primeros 4 bytes, por eso ordenar por `_id` equivale aproximadamente a ordenar por fecha de creación. Paginación en profundidad (offset vs cursor, en los tres ORMs) en la **Sesión 17**.

Búsqueda de texto con el índice `text`:

```typescript
this.productoModel
  .find({ $text: { $search: 'zapatilla running' } }, { score: { $meta: 'textScore' } })
  .sort({ score: { $meta: 'textScore' } })
  .limit(20)
  .lean();
```

> 💡 El índice `text` es básico (sin tolerancia a typos ni autocompletado). Para búsqueda seria usa **Atlas Search** o un motor dedicado (OpenSearch/Elasticsearch).

---

## 8. Pipeline de agregación

La agregación es el "SQL analítico" de Mongo: una secuencia de **etapas**, cada una transforma el flujo de documentos.

```
colección ─▶ $match ─▶ $unwind ─▶ $group ─▶ $sort ─▶ $lookup ─▶ $project ─▶ resultado
            (filtra     (aplana    (agrupa    (ordena)  (join)     (da forma)
             primero)    arrays)    y suma)
```

Ejemplo real de TiendaApi: **top 5 productos más vendidos del mes** con el nombre de su categoría.

```typescript
// src/ordenes/reportes.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { Orden, EstadoOrden } from './schemas/orden.schema';

interface TopProducto { productoId: string; nombre: string; unidades: number; ingresos: number; categoria: string; }

@Injectable()
export class ReportesService {
  constructor(@InjectModel(Orden.name) private readonly ordenModel: Model<Orden>) {}

  async topProductos(desde: Date, hasta: Date): Promise<TopProducto[]> {
    const pipeline: PipelineStage[] = [
      // 1. $match PRIMERO: reduce el volumen y puede usar índices
      { $match: { estado: EstadoOrden.PAGADA, createdAt: { $gte: desde, $lt: hasta } } },
      // 2. Un documento por item
      { $unwind: '$items' },
      // 3. Agrupar por producto
      {
        $group: {
          _id: '$items.productoId',
          nombre: { $first: '$items.nombre' },
          unidades: { $sum: '$items.cantidad' },
          ingresos: { $sum: { $multiply: ['$items.precio', '$items.cantidad'] } },
        },
      },
      { $sort: { unidades: -1 } },
      { $limit: 5 },
      // 4. $lookup DESPUÉS de reducir a 5: el join es caro, hazlo sobre pocos docs
      { $lookup: { from: 'productos', localField: '_id', foreignField: '_id', as: 'producto' } },
      { $unwind: '$producto' },
      { $lookup: { from: 'categorias', localField: 'producto.categoria', foreignField: '_id', as: 'cat' } },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      // 5. Forma final del resultado
      {
        $project: {
          _id: 0,
          productoId: { $toString: '$_id' },
          nombre: 1, unidades: 1, ingresos: 1,
          categoria: { $ifNull: ['$cat.nombre', 'Sin categoría'] },
        },
      },
    ];
    return this.ordenModel.aggregate<TopProducto>(pipeline).exec();
  }
}
```

Etapas que debes conocer:

| Etapa | Equivalente SQL | Nota |
|---|---|---|
| `$match` | `WHERE` | Ponla lo más arriba posible: usa índices |
| `$project` / `$addFields` | `SELECT` | Da forma / calcula campos |
| `$group` | `GROUP BY` | Acumuladores: `$sum`, `$avg`, `$min`, `$max`, `$push`, `$first` |
| `$sort`, `$limit`, `$skip` | `ORDER BY`, `LIMIT`, `OFFSET` | `$sort` + `$limit` juntos se optimizan (top-k) |
| `$unwind` | — | Aplana un array: 1 doc por elemento |
| `$lookup` | `LEFT JOIN` | Caro; también admite sub-pipeline |
| `$facet` | Varias queries en una | Ej. items + total para paginar en una sola ida |
| `$bucket` | Histogramas | Rangos de precio |

> ⚠️ `aggregate()` **no aplica** el casting del schema ni los hooks de `find`. Si filtras por un id recibido como string, debes convertirlo tú: `{ $match: { clienteId: new Types.ObjectId(id) } }`. Con string no matchea nada y no hay error: solo un array vacío.

> ⚠️ Cada etapa tiene un límite de 100 MB de RAM. Para agregaciones grandes: `.allowDiskUse(true)`, o mejor, precalcula (materializa) el reporte con `$merge` en un job nocturno (colas, Sesión 25).

---

## 9. Hooks (middleware), virtuals, métodos y discriminators

### 9.1 Hooks con `forFeatureAsync`

Los hooks de Mongoose (`pre`/`post`) deben registrarse **antes** de compilar el modelo. En Nest, usa `forFeatureAsync` para poder inyectar dependencias:

```typescript
// src/usuarios/usuarios.module.ts
import * as argon2 from 'argon2';

MongooseModule.forFeatureAsync([
  {
    name: Usuario.name,
    useFactory: () => {
      const schema = UsuarioSchema;
      // pre('save'): hashea solo si el password cambió (Sesión 18)
      schema.pre('save', async function () {
        if (!this.isModified('password')) return;
        this.password = await argon2.hash(this.password);
      });
      return schema;
    },
  },
]);
```

> ⚠️ Usa `function () {}` y no arrow functions en hooks: `this` es el documento (en `save`) o la query (en `find`). Con arrow `this` es `undefined`.

> ⚠️ `pre('save')` **no se ejecuta** en `updateOne` / `findOneAndUpdate` / `insertMany` (según opciones). Si hasheas passwords en un hook de `save` y luego alguien actualiza el password con `updateOne`, se guarda en texto plano. Mejor: la lógica de hashing en el **servicio**, explícita, y los hooks para cosas transversales (auditoría, slug).

| Tipo de hook | `this` es | Se dispara con |
|---|---|---|
| Document middleware | el documento | `save`, `validate`, `deleteOne` (con `{ document: true }`) |
| Query middleware | la `Query` | `find`, `findOne`, `updateOne`, `findOneAndUpdate`, `deleteMany`... |
| Aggregate middleware | el `Aggregate` | `aggregate` |
| Model middleware | el `Model` | `insertMany` |

### 9.2 Virtuals, métodos y serialización

```typescript
// Virtual: campo calculado, NO se persiste
ProductoSchema.virtual('disponible').get(function () {
  return this.activo && this.stock > 0;
});

// Para que aparezca al serializar a JSON
ProductoSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret: Record<string, any>) => {
    ret.id = ret._id.toString();   // expón "id" en vez de "_id"
    delete ret._id;
    return ret;
  },
});
```

> ⚠️ Los virtuals **no existen** en resultados `lean()`. Y ojo con `toJSON` + `transform` como mecanismo de "ocultar campos": es frágil. Para no filtrar `password` usa `select: false` en el `@Prop` y **DTOs de respuesta** (Sesión 21).

```typescript
@Prop({ required: true, select: false }) // excluido de TODAS las queries salvo .select('+password')
password: string;
```

### 9.3 Discriminators: herencia en una colección

Útil cuando tienes variantes de un mismo concepto (productos físicos vs digitales) con campos distintos:

```typescript
@Schema() export class ProductoFisico { @Prop({ required: true }) pesoGramos: number; }
@Schema() export class ProductoDigital { @Prop({ required: true }) urlDescarga: string; }

MongooseModule.forFeature([
  {
    name: Producto.name,
    schema: ProductoSchema,
    discriminators: [
      { name: 'ProductoFisico', schema: SchemaFactory.createForClass(ProductoFisico) },
      { name: 'ProductoDigital', schema: SchemaFactory.createForClass(ProductoDigital) },
    ],
  },
]);
// Mongoose guarda un campo __t = 'ProductoFisico' | 'ProductoDigital' en la misma colección
// @InjectModel('ProductoDigital') private digitalModel: Model<ProductoDigital>
```

---

## 10. Transacciones multi-documento

Si una operación toca varios documentos (crear orden + descontar stock de N productos), necesitas una transacción. Requisitos: **replica set o cluster sharded** (por eso el `--replSet` del Docker de la sección 2).

```typescript
// src/ordenes/ordenes.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Orden } from './schemas/orden.schema';
import { Producto } from '../productos/schemas/producto.schema';

@Injectable()
export class OrdenesService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Orden.name) private readonly ordenModel: Model<Orden>,
    @InjectModel(Producto.name) private readonly productoModel: Model<Producto>,
  ) {}

  async crearOrden(clienteId: string, items: { productoId: string; cantidad: number }[]) {
    const session = await this.connection.startSession();
    try {
      // withTransaction reintenta automáticamente ante TransientTransactionError
      return await session.withTransaction(async () => {
        const itemsOrden = [];
        for (const it of items) {
          // Cada operación DEBE recibir { session }; si la olvidas, queda FUERA de la transacción
          const p = await this.productoModel.findOneAndUpdate(
            { _id: it.productoId, stock: { $gte: it.cantidad }, activo: true },
            { $inc: { stock: -it.cantidad } },
            { new: true, session },
          ).lean();
          if (!p) throw new BadRequestException(`Sin stock para ${it.productoId}`); // aborta todo
          itemsOrden.push({ productoId: p._id, nombre: p.nombre, precio: p.precio, cantidad: it.cantidad });
        }
        const total = itemsOrden.reduce((s, i) => s + i.precio * i.cantidad, 0);
        const [orden] = await this.ordenModel.create(
          [{ clienteId: new Types.ObjectId(clienteId), items: itemsOrden, total }],
          { session }, // create con session exige pasar un ARRAY de docs
        );
        return orden;
      });
    } finally {
      await session.endSession();
    }
  }
}
```

> ⚠️ El error más común: olvidar `{ session }` en una de las operaciones. No hay error; simplemente esa escritura se confirma aunque la transacción aborte. Alternativa que evita pasar la sesión a mano: `connection.transaction(async (session) => ...)` con la opción global `transactionAsyncLocalStorage: true` de Mongoose 8, o el patrón con `@nestjs-cls/transactional` de la **Sesión 17**.

> ❓ **Entrevista**: *"¿Siempre necesito transacciones en Mongo?"* → No. Si modelas bien, muchas operaciones tocan un solo documento y ya son atómicas. Las transacciones multi-documento tienen costo (locks, límite de 60 s por defecto, más latencia). Úsalas cuando la invariante de negocio abarca varios documentos, y prefiere rediseñar el agregado cuando sea posible.

---

## 11. Testing rápido con mongodb-memory-server

```typescript
// test/productos.e2e-spec.ts (detalle completo de testing en la Sesión 22)
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Test } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';

let mongo: MongoMemoryReplSet;

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); // replica set → transacciones OK
  const moduleRef = await Test.createTestingModule({
    imports: [MongooseModule.forRoot(mongo.getUri()), ProductosModule],
  }).compile();
  // Para unit tests puros, en cambio, mockea el modelo:
  // { provide: getModelToken(Producto.name), useValue: { findById: jest.fn() } }
});

afterAll(async () => mongo.stop());
```

`getModelToken(Producto.name)` devuelve el token de DI que usa `@InjectModel`: es la forma de reemplazar el modelo por un mock.

---

## Resumen mental de la sesión

```
Mongo = documentos BSON; el DOCUMENTO es la unidad de atomicidad
Modela según cómo LEES: embeber (1-a-pocos, se lee junto, acotado) vs referenciar (crece, vida propia)
Límite 16 MB/doc → nunca arrays sin límite

@nestjs/mongoose:
  MongooseModule.forRootAsync({ useFactory: cfg => ({ uri }) })   ← 1 conexión + pool
  @Schema({ timestamps }) class X { @Prop({...}) campo }          ← type: explícito en arrays/uniones/Map
  SchemaFactory.createForClass(X); XSchema.index({...})
  MongooseModule.forFeature([{ name: X.name, schema }])           ← por módulo
  @InjectModel(X.name) model: Model<X>     | getModelToken(X.name) para mocks
  @InjectConnection() connection           → startSession / withTransaction

Updates: runValidators: true; operadores atómicos ($inc con condición) > read-modify-write
lean() para lecturas (sin virtuals/save); hidratado para modificar
populate = 2da query con $in (NO es JOIN; en lista NO es N+1; en bucle SÍ)
Índices: ESR (Equality → Sort → Range); explain('executionStats'); autoIndex off en prod
unique = índice, no validador (E11000)
Agregación: $match primero, $lookup después de reducir; aggregate NO castea ObjectId
Hooks: function(){} no arrow; pre('save') no corre en updateOne
Transacciones: replica set; { session } en CADA operación; withTransaction reintenta
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué significa que "el documento es la unidad de atomicidad" y cómo influye en el modelado?
2. ❓ ¿Cuándo embeberías y cuándo referenciarías? Da un ejemplo de TiendaApi de cada uno.
3. ❓ ¿Por qué a veces necesitas `type:` explícito en `@Prop`? Menciona dos casos.
4. ❓ ¿Qué diferencia hay entre `forFeature` y `forFeatureAsync`? ¿Cuándo necesitas el segundo?
5. ❓ ¿Cómo funciona `populate` internamente? ¿Es un JOIN? ¿Cuándo produce N+1?
6. ❓ ¿Qué hace `lean()` y cuándo no deberías usarlo?
7. ❓ ¿Por qué `findByIdAndUpdate` puede guardar datos inválidos? ¿Cómo lo evitas?
8. ❓ Explica la regla ESR con un ejemplo de índice compuesto.
9. ❓ ¿`unique: true` garantiza unicidad? ¿Qué error recibes si se viola?
10. ❓ ¿Por qué en `aggregate` debes convertir strings a `ObjectId` manualmente?
11. ❓ ¿Qué necesitas para usar transacciones en Mongo y cuál es el error más común al implementarlas?
12. ❓ ¿Cómo evitas que el hash del password salga en las respuestas?

## Ejercicio práctico
1. Levanta Mongo 7 en Docker con `--replSet rs0` e inicializa el replica set.
2. Instala `@nestjs/mongoose` y configura `MongooseModule.forRootAsync` leyendo `MONGO_URI` desde `ConfigService`.
3. Crea los schemas `Categoria`, `Producto` (con `Map` de atributos y referencia a categoría) y `Orden` con `ItemOrden` embebido (sin `_id`).
4. Implementa el CRUD de productos con `ParseObjectIdPipe`, `lean()` en lecturas, `runValidators: true` en updates y manejo del error `11000` → `409 Conflict`.
5. Agrega `GET /productos?categoria=&min=&max=` ordenado por `createdAt` y diseña el índice compuesto con ESR. Verifica con `explain('executionStats')` que el plan sea `IXSCAN` y que no haya `SORT` en memoria.
6. Implementa paginación por cursor usando `_id`.
7. Implementa `POST /ordenes` con transacción que descuente stock atómicamente y aborte si un producto no tiene stock. Prueba con dos requests concurrentes sobre el último item en stock.
8. Implementa `GET /reportes/top-productos?desde=&hasta=` con el pipeline de agregación de la sección 8.
9. Escribe un test e2e con `mongodb-memory-server` (`MongoMemoryReplSet`) para la creación de órdenes.
10. (Opcional) Agrega discriminators `ProductoFisico` / `ProductoDigital` y valida que cada uno exige sus campos.

---

➡️ **Cuando termines**, marca la Sesión 16 en el [README](README.md) y pasa a la **Sesión 17 — Datos en producción: migraciones, transacciones, paginación, N+1, patrón repository**.

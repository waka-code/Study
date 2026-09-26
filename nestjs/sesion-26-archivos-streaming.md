# Sesión 26 — Archivos: uploads, streaming, S3, Server-Sent Events y compresión

> **Objetivo de la sesión**: dejar de tratar los archivos como "un campo más del body". Al terminar deberías poder explicar por qué un upload mal hecho puede tumbar tu servidor (memoria, disco, event loop), recibir archivos con **Multer** (`FileInterceptor`, `ParseFilePipe`) y validarlos de verdad (tamaño, *magic numbers*), subir a **S3** sin pasar el archivo por tu proceso (**presigned URLs**) o haciendo *streaming* real con `busboy` + `@aws-sdk/lib-storage`, descargar con **`StreamableFile`** respetando *backpressure*, exportar CSV gigantes sin cargar todo en memoria, empujar eventos al navegador con **Server-Sent Events** (`@Sse`) y decidir dónde se comprime la respuesta.

---

## 1. Por qué los archivos son un tema aparte

Una request JSON típica pesa unos pocos KB y `express.json()` la parsea completa en memoria sin problema. Un archivo puede pesar **cientos de MB**. Si lo tratas igual:

| Enfoque | Qué pasa con un archivo de 500 MB y 20 usuarios concurrentes |
|---|---|
| Cargar todo en memoria (`Buffer`) | 10 GB de RAM → el contenedor muere por OOM |
| Escribir a disco local | Funciona... hasta que tienes 3 réplicas en ECS y el archivo quedó en **una** de ellas (y el disco es efímero) |
| **Streaming** a almacenamiento externo (S3) | Memoria constante (~unos MB por upload), cualquier réplica sirve cualquier archivo |
| **Presigned URL** (el cliente sube directo a S3) | Tu API ni siquiera ve los bytes: solo firma un permiso |

La idea central de la sesión es el **stream**: procesar datos *por trozos (chunks)* a medida que llegan, en vez de esperar a tenerlos todos.

```
 Sin streaming:   cliente ──[500 MB]──▶ RAM del proceso ──[500 MB]──▶ S3
                                        ▲ pico de memoria = tamaño del archivo

 Con streaming:   cliente ──chunk──▶ [64 KB buffer] ──chunk──▶ S3
                           ──chunk──▶ [64 KB buffer] ──chunk──▶ S3
                                        ▲ memoria constante, independiente del tamaño
```

### 1.1 Backpressure en una frase

Si el productor (el cliente subiendo, o tu base de datos devolviendo filas) es más rápido que el consumidor (S3, la red del cliente descargando), los chunks se acumulan en memoria. **Backpressure** es el mecanismo por el cual el consumidor le dice al productor "espera": `writable.write()` devuelve `false` y el productor pausa hasta el evento `'drain'`. `stream.pipeline()` y `.pipe()` lo manejan por ti; escribir a mano con `on('data')` + `write()` sin mirar el retorno **rompe** el backpressure.

> ❓ **Entrevista**: *"¿Qué es backpressure y cómo lo respetas en Node?"* → Es la señal que un stream de destino lento envía hacia el origen para que deje de producir. En Node, `write()` devuelve `false` cuando el buffer interno supera el `highWaterMark`; hay que esperar `'drain'`. En la práctica se usa `pipeline()` de `node:stream/promises`, que propaga backpressure, errores y cierra todos los streams si uno falla.

```ts
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';

// Copia comprimiendo, con memoria constante y manejo de errores correcto
await pipeline(
  createReadStream('ventas.csv'),
  createGzip(),
  createWriteStream('ventas.csv.gz'),
);
```

> ⚠️ `a.pipe(b)` **no** propaga errores: si `a` falla, `b` queda abierto (fuga de file descriptors). Prefiere siempre `pipeline()`.

---

## 2. Uploads con Multer: lo básico bien hecho

Con la plataforma Express (la default, Sesión 1), Nest integra **Multer**, que parsea `multipart/form-data`. El body parser JSON de Nest **no** toca multipart: por eso sin un interceptor de archivos `@Body()` llega vacío.

```bash
npm i -D @types/multer     # tipos de Express.Multer.File
```

### 2.1 Un archivo, varios archivos, varios campos

```ts
// src/productos/productos-imagenes.controller.ts
import {
  Controller, Post, Param, ParseIntPipe, UploadedFile, UploadedFiles, UseInterceptors,
} from '@nestjs/common';
import {
  FileInterceptor, FilesInterceptor, FileFieldsInterceptor,
} from '@nestjs/platform-express';

@Controller('productos/:id')
export class ProductosImagenesController {
  // Un solo archivo en el campo "imagen"
  @Post('imagen')
  @UseInterceptors(FileInterceptor('imagen'))
  subirImagen(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    // archivo.buffer (memoryStorage) o archivo.path (diskStorage)
    return { id, nombre: archivo.originalname, bytes: archivo.size, mime: archivo.mimetype };
  }

  // Hasta 5 archivos en el mismo campo "galeria"
  @Post('galeria')
  @UseInterceptors(FilesInterceptor('galeria', 5))
  subirGaleria(@UploadedFiles() archivos: Express.Multer.File[]) {
    return archivos.map((a) => a.originalname);
  }

  // Campos distintos, cada uno con su máximo
  @Post('medios')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'portada', maxCount: 1 },
    { name: 'fichaTecnica', maxCount: 1 },
  ]))
  subirMedios(
    @UploadedFiles() archivos: { portada?: Express.Multer.File[]; fichaTecnica?: Express.Multer.File[] },
  ) {
    return { portada: archivos.portada?.[0]?.originalname, ficha: archivos.fichaTecnica?.[0]?.originalname };
  }
}
```

| Interceptor | Decorador | Uso |
|---|---|---|
| `FileInterceptor(campo)` | `@UploadedFile()` | Un archivo |
| `FilesInterceptor(campo, max)` | `@UploadedFiles()` → array | N archivos, mismo campo |
| `FileFieldsInterceptor([...])` | `@UploadedFiles()` → objeto | Varios campos |
| `AnyFilesInterceptor()` | `@UploadedFiles()` | Cualquier campo (evítalo: no controlas qué entra) |
| `NoFilesInterceptor()` | `@Body()` | Formularios multipart **sin** archivos |

Los campos de texto del mismo formulario llegan en `@Body()` (como strings: si el DTO espera números, necesitas `transform: true` o `@Type(() => Number)`, Sesión 6).

### 2.2 Storage: memoria vs disco y **límites siempre**

```ts
// src/productos/productos.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),        // el archivo queda en archivo.buffer
      limits: {
        fileSize: 5 * 1024 * 1024,     // 5 MB: Multer CORTA el stream al superarlo
        files: 5,                      // máximo de archivos por request
        fields: 20,                    // máximo de campos de texto
      },
    }),
  ],
  controllers: [ProductosImagenesController],
})
export class ProductosModule {}
```

> ⚠️ **Sin `limits.fileSize` Multer acepta archivos de cualquier tamaño.** Con `memoryStorage` eso es un DoS trivial: `curl -F "imagen=@/dev/zero"`... El límite de Multer es la defensa real porque aborta **mientras** recibe; `MaxFileSizeValidator` (siguiente sección) valida **después** de haber recibido todo.

| Storage | Pros | Contras | Cuándo |
|---|---|---|---|
| `memoryStorage()` | Simple, `buffer` listo para procesar (sharp, S3 `PutObject`) | RAM = tamaño × concurrencia | Archivos pequeños (avatares, < 10 MB) con límite estricto |
| `diskStorage({ destination, filename })` | No consume RAM | Disco efímero en contenedores, limpieza manual, no compartido entre réplicas | Procesamiento local temporal (ej. ffmpeg) y borrar luego |
| Streaming propio (busboy → S3) | Memoria constante, sin disco | Más código | Archivos grandes (sección 4) |

> ⚠️ Con `diskStorage` **nunca** uses `file.originalname` como nombre en disco: permite *path traversal* (`../../etc/passwd`) y colisiones. Genera un nombre con `randomUUID()` y guarda el original como metadato.

---

## 3. Validar archivos de verdad: `ParseFilePipe`

```ts
import {
  ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, HttpStatus, ParseFilePipeBuilder,
} from '@nestjs/common';

@Post('imagen')
@UseInterceptors(FileInterceptor('imagen'))
subirImagen(
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024, message: 'Máximo 2 MB' }),
        new FileTypeValidator({ fileType: /^image\/(png|jpeg|webp)$/ }),
      ],
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY, // 422 en vez de 400
      fileIsRequired: true,
    }),
  )
  archivo: Express.Multer.File,
) { /* ... */ }

// Equivalente con el builder (más legible cuando hay varias reglas)
const imagenPipe = new ParseFilePipeBuilder()
  .addFileTypeValidator({ fileType: /^image\/(png|jpeg|webp)$/ })
  .addMaxSizeValidator({ maxSize: 2 * 1024 * 1024 })
  .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY });
```

### 3.1 El `mimetype` miente

`archivo.mimetype` viene del header `Content-Type` **que envía el cliente**: cualquiera puede subir un `.exe` declarando `image/png`. La validación seria mira los **magic numbers** (los primeros bytes del contenido: PNG empieza con `89 50 4E 47`, PDF con `%PDF`).

En Nest 11, `FileTypeValidator` inspecciona el contenido del buffer para detectar el tipo real (además del mimetype declarado) cuando el archivo está en memoria; revisa la opción `skipMagicNumbersValidation` en tu versión. Si necesitas control total, escribe tu propio validador:

```ts
// src/common/files/magic-number.validator.ts
import { FileValidator } from '@nestjs/common';

const FIRMAS: Record<string, number[]> = {
  'image/png':  [0x89, 0x50, 0x4e, 0x47],
  'image/jpeg': [0xff, 0xd8, 0xff],
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // "%PDF"
};

export class MagicNumberValidator extends FileValidator<{ permitidos: string[] }> {
  isValid(file?: Express.Multer.File): boolean {
    if (!file?.buffer) return false;              // requiere memoryStorage
    return this.validationOptions.permitidos.some((mime) => {
      const firma = FIRMAS[mime];
      return firma?.every((byte, i) => file.buffer[i] === byte);
    });
  }

  buildErrorMessage(): string {
    return `El contenido no corresponde a: ${this.validationOptions.permitidos.join(', ')}`;
  }
}
```

> 💡 Para imágenes, la defensa más robusta es **re-codificarlas** (por ejemplo con `sharp`: `sharp(buffer).resize(1200).webp().toBuffer()`). Eso descarta metadatos EXIF (que pueden incluir la ubicación GPS del usuario) y cualquier payload escondido. Para documentos que otros usuarios descargarán, considera un escaneo antivirus asíncrono (ClamAV en un worker de BullMQ, Sesión 25).

> ❓ **Entrevista**: *"¿Cómo validas que un archivo subido es realmente una imagen?"* → Límite de tamaño en el parser (Multer `limits`) para no recibir basura infinita; luego verificar magic numbers (no confiar en extensión ni en `Content-Type`); idealmente re-codificar la imagen, guardar con nombre generado, servir desde otro dominio/bucket con `Content-Disposition` y `Content-Type` controlados por ti, y escanear de forma asíncrona.

---

## 4. S3: tres formas de subir, de peor a mejor

```bash
npm i @aws-sdk/client-s3 @aws-sdk/lib-storage @aws-sdk/s3-request-presigner busboy
npm i -D @types/busboy
```

Un provider para el cliente S3 (DI con token, Sesión 23):

```ts
// src/storage/storage.module.ts
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { StorageService } from './storage.service';

export const S3_CLIENT = Symbol('S3_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: S3_CLIENT,
      inject: [ConfigService],
      // En ECS/Lambda NO pases credenciales: el SDK toma las del rol IAM de la tarea
      useFactory: (config: ConfigService) => new S3Client({ region: config.getOrThrow('AWS_REGION') }),
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
```

### 4.1 Opción A: buffer en memoria → `PutObject` (archivos pequeños)

```ts
// src/storage/storage.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { S3_CLIENT } from './storage.module';

@Injectable()
export class StorageService {
  private readonly bucket: string;

  constructor(@Inject(S3_CLIENT) private readonly s3: S3Client, config: ConfigService) {
    this.bucket = config.getOrThrow('S3_BUCKET');
  }

  // A) Archivo ya en memoria (Multer memoryStorage)
  async subirBuffer(prefijo: string, buffer: Buffer, contentType: string): Promise<string> {
    const key = `${prefijo}/${randomUUID()}`;
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket, Key: key, Body: buffer, ContentType: contentType,
    }));
    return key;
  }

  // B) Stream de tamaño desconocido → multipart upload gestionado por lib-storage
  async subirStream(prefijo: string, stream: Readable, contentType: string): Promise<string> {
    const key = `${prefijo}/${randomUUID()}`;
    const upload = new Upload({
      client: this.s3,
      params: { Bucket: this.bucket, Key: key, Body: stream, ContentType: contentType },
      queueSize: 4,                 // partes subiendo en paralelo
      partSize: 5 * 1024 * 1024,    // 5 MB es el mínimo de S3 por parte
    });
    await upload.done();
    return key;
  }

  // C) URL firmada: el cliente sube DIRECTO a S3
  async urlDeSubida(prefijo: string, contentType: string) {
    const key = `${prefijo}/${randomUUID()}`;
    const url = await getSignedUrl(
      this.s3,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: 300 },           // 5 minutos
    );
    return { key, url };
  }

  async urlDeDescarga(key: string, nombreDescarga: string) {
    return getSignedUrl(this.s3, new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(nombreDescarga)}"`,
    }), { expiresIn: 60 });
  }

  async obtenerStream(key: string) {
    const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    // En Node, Body es un Readable (SdkStreamMixin)
    return { stream: res.Body as Readable, contentType: res.ContentType, length: res.ContentLength };
  }
}
```

### 4.2 Opción B: streaming real con busboy (sin Multer)

Multer siempre termina el archivo en memoria o disco antes de tu handler. Para mandar los bytes a S3 **mientras** llegan, parseas el multipart tú mismo con `busboy` (la librería que Multer usa por debajo):

```ts
// src/documentos/documentos.controller.ts
import { BadRequestException, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import busboy from 'busboy';
import { StorageService } from '../storage/storage.service';

@Controller('documentos')
export class DocumentosController {
  constructor(private readonly storage: StorageService) {}

  @Post()
  subir(@Req() req: Request): Promise<{ key: string }> {
    return new Promise((resolve, reject) => {
      const bb = busboy({
        headers: req.headers,
        limits: { fileSize: 500 * 1024 * 1024, files: 1 },   // 500 MB, un archivo
      });
      let subida: Promise<string> | undefined;

      bb.on('file', (_campo, archivo, info) => {
        if (info.mimeType !== 'application/pdf') {
          archivo.resume();                                  // descartar bytes para no trabar el parser
          return reject(new BadRequestException('Solo PDF'));
        }
        archivo.on('limit', () => reject(new BadRequestException('Archivo demasiado grande')));
        // El stream "archivo" fluye directo a S3 con backpressure
        subida = this.storage.subirStream('documentos', archivo, info.mimeType);
      });

      bb.on('close', async () => {
        if (!subida) return reject(new BadRequestException('Falta el archivo'));
        try { resolve({ key: await subida }); } catch (e) { reject(e); }
      });
      bb.on('error', reject);

      req.pipe(bb);
    });
  }
}
```

> ⚠️ Si el archivo supera el límite, busboy emite `'limit'` y **trunca** el stream, pero `Upload` podría completar un objeto parcial. En producción, aborta la subida (`upload.abort()`) y configura en el bucket una *lifecycle rule* que limpie multipart uploads incompletos (`AbortIncompleteMultipartUpload`), o te cobrarán por partes huérfanas.

### 4.3 Opción C: presigned URL (la preferida para archivos grandes)

```
  Cliente                    TiendaApi                        S3
    │  POST /uploads/firma      │                               │
    │ { contentType }  ───────▶ │  valida auth, cuota, tipo     │
    │                           │  getSignedUrl(PutObject)      │
    │ ◀──── { key, url } ────── │                               │
    │                                                           │
    │  PUT url  (bytes)  ─────────────────────────────────────▶ │
    │ ◀──────────────────────── 200 ─────────────────────────── │
    │                                                           │
    │  POST /productos/42/imagen { key }  ──▶ │ HeadObject(key) │
    │                                         │ valida tamaño,  │
    │ ◀─────────── 201 ─────────────────────  │ asocia a producto
```

```ts
@Post('uploads/firma')
@UseGuards(JwtAuthGuard)                        // Sesión 18
async firmar(@Body() dto: FirmarUploadDto, @CurrentUser() user: UsuarioActual) {
  // dto.contentType validado con @IsIn(['image/png','image/jpeg','image/webp'])
  return this.storage.urlDeSubida(`usuarios/${user.id}/imagenes`, dto.contentType);
}
```

Ventajas: tu API no paga ancho de banda, CPU ni memoria por los bytes; S3 escala solo. Contras: validas el archivo **después** (con `HeadObject` para tamaño/tipo, o con un evento `s3:ObjectCreated` → Lambda/SQS que lo procese), y con `PutObject` firmado no puedes imponer un tamaño máximo. Si necesitas límite de tamaño en la firma, usa **presigned POST** (`@aws-sdk/s3-presigned-post`, condición `content-length-range`).

| Estrategia | Memoria API | Validación previa | Complejidad | Ideal para |
|---|---|---|---|---|
| Multer memory + `PutObject` | Alta (tamaño × concurrencia) | ✅ completa | Baja | Avatares, imágenes pequeñas |
| busboy + `lib-storage` | Constante | Parcial (tipo declarado, límite) | Media | Archivos grandes que *deben* pasar por la API |
| Presigned PUT/POST | Cero | Después de subir | Media | Archivos grandes, móviles, alto volumen |

> ❓ **Entrevista**: *"Los usuarios suben videos de 2 GB, ¿cómo lo diseñas?"* → No por la API: presigned URL con **multipart upload** en el cliente (S3 permite firmar cada parte), CORS en el bucket, evento de S3 a una cola que dispare el procesamiento (transcoding, antivirus) en workers, y la API solo registra metadatos y estado (`PENDIENTE → PROCESADO`). El cliente consulta el estado o recibe un evento por SSE/WebSocket.

---

## 5. Descargas: `StreamableFile`

Devolver un `Buffer` obliga a tener todo el archivo en memoria. `StreamableFile` envuelve un `Readable` (o un `Uint8Array`) y Nest lo *pipea* a la respuesta, **funcionando igual en Express y Fastify** y pasando por los interceptors (a diferencia de usar `@Res()` y `res.pipe()` a mano, que te saca del flujo de Nest, Sesión 4).

```ts
import { Controller, Get, Param, StreamableFile, NotFoundException } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

@Controller('facturas')
export class FacturasController {
  constructor(private readonly storage: StorageService, private readonly facturas: FacturasService) {}

  // Desde disco local
  @Get('plantilla')
  async plantilla(): Promise<StreamableFile> {
    const ruta = join(process.cwd(), 'assets', 'plantilla-factura.pdf');
    const { size } = await stat(ruta);
    return new StreamableFile(createReadStream(ruta), {
      type: 'application/pdf',
      disposition: 'inline; filename="plantilla.pdf"',
      length: size,                          // Content-Length: el cliente ve el progreso
    });
  }

  // Proxy desde S3 (cuando el archivo es privado y quieres control total)
  @Get(':id/pdf')
  async descargar(@Param('id') id: string): Promise<StreamableFile> {
    const factura = await this.facturas.buscar(id);
    if (!factura) throw new NotFoundException();
    const { stream, contentType, length } = await this.storage.obtenerStream(factura.s3Key);
    return new StreamableFile(stream, {
      type: contentType ?? 'application/pdf',
      length,
      disposition: `attachment; filename="factura-${factura.numero}.pdf"`,
    });
  }

  // Mejor aún: redirigir a una URL firmada de corta duración
  @Get(':id/pdf-url')
  async url(@Param('id') id: string) {
    const factura = await this.facturas.buscar(id);
    if (!factura) throw new NotFoundException();
    return { url: await this.storage.urlDeDescarga(factura.s3Key, `factura-${factura.numero}.pdf`) };
  }
}
```

> ⚠️ Si también necesitas setear headers extra (cache, ETag), inyecta `@Res({ passthrough: true }) res: Response` y usa `res.set(...)`: con `passthrough: true` Nest sigue manejando la respuesta y el `StreamableFile` que devuelves.

> ⚠️ Si el stream falla a mitad (S3 corta la conexión), los headers ya se enviaron con `200`: no puedes cambiar el status. El cliente recibe un archivo truncado. Por eso `Content-Length` es importante: le permite detectar que la descarga quedó incompleta.

### 5.1 Range requests (video y descargas reanudables)

Para `<video>` o descargas pausables, el navegador pide `Range: bytes=1000-1999` y espera `206 Partial Content`. S3 y CloudFront lo soportan nativamente, otra razón para servir binarios desde ahí. Si debes hacerlo tú:

```ts
@Get('videos/:nombre')
async video(
  @Param('nombre') nombre: string,
  @Headers('range') range: string | undefined,
  @Res({ passthrough: true }) res: Response,
): Promise<StreamableFile> {
  const ruta = this.videos.rutaSegura(nombre);              // valida contra path traversal
  const { size } = await stat(ruta);
  res.set('Accept-Ranges', 'bytes');

  if (!range) return new StreamableFile(createReadStream(ruta), { type: 'video/mp4', length: size });

  const [inicioStr, finStr] = range.replace('bytes=', '').split('-');
  const inicio = Number(inicioStr);
  const fin = finStr ? Number(finStr) : Math.min(inicio + 1024 * 1024, size - 1); // 1 MB por chunk
  if (Number.isNaN(inicio) || inicio >= size) {
    res.status(416).set('Content-Range', `bytes */${size}`);
    return new StreamableFile(Buffer.alloc(0));
  }

  res.status(206).set('Content-Range', `bytes ${inicio}-${fin}/${size}`);
  return new StreamableFile(createReadStream(ruta, { start: inicio, end: fin }), {
    type: 'video/mp4',
    length: fin - inicio + 1,
  });
}
```

---

## 6. Exportar datos gigantes: streaming desde la base de datos

"Exportar todas las órdenes del año a CSV" con `find()` carga 2 millones de filas en memoria. La alternativa es un **generador asíncrono** que lee por páginas (*keyset pagination*, Sesión 17) y `Readable.from()` para convertirlo en stream:

```ts
// src/ordenes/ordenes-export.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { Readable } from 'node:stream';
import { Orden } from './orden.entity';

@Injectable()
export class OrdenesExportService {
  constructor(@InjectRepository(Orden) private readonly repo: Repository<Orden>) {}

  csv(): Readable {
    const repo = this.repo;
    async function* filas() {
      yield 'id,cliente,total,estado,creada\n';
      let ultimoId = 0;
      while (true) {
        // Keyset: WHERE id > :ultimo ORDER BY id LIMIT 1000 → usa el índice, sin OFFSET
        const lote = await repo.find({
          where: { id: MoreThan(ultimoId) },
          order: { id: 'ASC' },
          take: 1000,
        });
        if (lote.length === 0) return;
        for (const o of lote) {
          yield `${o.id},${escaparCsv(o.clienteEmail)},${o.total},${o.estado},${o.creadaEn.toISOString()}\n`;
        }
        ultimoId = lote[lote.length - 1].id;
      }
    }
    // Readable.from respeta backpressure: el generador no avanza si el cliente no consume
    return Readable.from(filas());
  }
}

function escaparCsv(v: string): string {
  // Comillas dobles + prevención de CSV injection (celdas que empiezan con = + - @)
  const seguro = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return `"${seguro.replace(/"/g, '""')}"`;
}
```

```ts
@Get('export.csv')
@Roles('admin')
exportar(): StreamableFile {
  return new StreamableFile(this.exportService.csv(), {
    type: 'text/csv; charset=utf-8',
    disposition: 'attachment; filename="ordenes.csv"',
  });
}
```

La clave está en `Readable.from(generador)`: el `yield` solo se ejecuta cuando el stream necesita más datos. Si el cliente descarga lento, el generador **no** consulta la siguiente página. Memoria: ~1000 filas, sin importar si son 10 mil o 10 millones.

> ❓ **Entrevista**: *"¿Qué pasa si el cliente cierra la conexión a mitad del export?"* → Nest destruye el stream de respuesta; `Readable.from` llama a `return()` del generador y el `while` deja de consultar la base. Si en cambio hubieras cargado todo con `find()` antes de responder, la query ya se habría ejecutado entera para nada. Para exports muy largos (> 1 min), mejor un **job en BullMQ** (Sesión 25) que genere el archivo en S3 y notifique con un link firmado.

> 💡 Con PostgreSQL también puedes usar cursores del driver (`pg-query-stream`, o `queryBuilder.stream()` de TypeORM, que lo requiere) para un stream de filas nativo. El generador por páginas funciona con cualquier ORM (Prisma incluido) y no mantiene una conexión ocupada durante toda la descarga.

---

## 7. Server-Sent Events (SSE)

### 7.1 Qué es y por qué a veces basta

SSE es una respuesta HTTP **que no termina**: `Content-Type: text/event-stream` y el servidor escribe eventos de texto cuando quiere. El navegador los consume con la API nativa `EventSource`, que **reconecta sola** y envía el header `Last-Event-ID` para retomar.

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

id: 1
event: estado
data: {"ordenId":"A-17","estado":"PAGADA"}

id: 2
event: estado
data: {"ordenId":"A-17","estado":"DESPACHADA"}

```

| | Polling | **SSE** | WebSocket (Sesión 27) |
|---|---|---|---|
| Dirección | Cliente pregunta | Servidor → cliente | Bidireccional |
| Protocolo | HTTP normal | HTTP normal (pasa proxies, auth por cookie) | Upgrade a `ws://` |
| Reconexión | N/A | **Automática** con `Last-Event-ID` | Manual (Socket.io la implementa) |
| Formato | Cualquiera | Texto (UTF-8) | Texto o binario |
| Límite en navegador | — | 6 conexiones por dominio en HTTP/1.1 (sin límite práctico en HTTP/2) | Sin ese límite |
| Casos típicos | Datos que cambian poco | Notificaciones, progreso de jobs, feeds, tokens de un LLM | Chat, juegos, colaboración |

> ❓ **Entrevista**: *"¿SSE o WebSockets para notificar el estado de una orden?"* → SSE: el flujo es solo servidor → cliente, funciona sobre HTTP estándar (balanceadores, CDN, auth existente), reconecta solo y es más simple de operar. WebSocket cuando el cliente también envía mensajes frecuentes o necesitas binario o baja latencia bidireccional.

### 7.2 `@Sse()` en Nest

Un handler `@Sse()` devuelve un `Observable<MessageEvent>`; Nest escribe cada emisión en el formato de arriba y se **desuscribe cuando el cliente se desconecta**.

```ts
// src/ordenes/ordenes-eventos.controller.ts
import { Controller, MessageEvent, Param, Sse, UseGuards } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, filter, fromEvent, interval, map, merge } from 'rxjs';

interface EstadoOrdenCambiado { ordenId: string; usuarioId: number; estado: string; secuencia: number }

@Controller('ordenes')
export class OrdenesEventosController {
  constructor(private readonly eventos: EventEmitter2) {}

  @Sse(':id/eventos')
  @UseGuards(JwtCookieGuard)            // EventSource no permite headers → auth por cookie
  eventosDeOrden(@Param('id') ordenId: string): Observable<MessageEvent> {
    // Eventos de dominio emitidos con EventEmitter2 (Sesión 25): 'orden.estado'
    const cambios$ = fromEvent(this.eventos, 'orden.estado').pipe(
      map((e) => e as EstadoOrdenCambiado),
      filter((e) => e.ordenId === ordenId),
      map((e): MessageEvent => ({
        id: String(e.secuencia),        // el navegador lo reenvía como Last-Event-ID
        type: 'estado',                 // el cliente escucha con addEventListener('estado', ...)
        data: { estado: e.estado },     // Nest serializa objetos a JSON
      })),
    );

    // Heartbeat: evita que proxies/ALB cierren la conexión por inactividad
    const ping$ = interval(25_000).pipe(map((): MessageEvent => ({ type: 'ping', data: '' })));

    return merge(cambios$, ping$);
  }
}
```

Cliente:

```ts
const es = new EventSource('/ordenes/A-17/eventos', { withCredentials: true });
es.addEventListener('estado', (e) => console.log(JSON.parse(e.data)));
es.onerror = () => console.log('Reconectando...');   // EventSource reintenta solo
```

> ⚠️ `EventSource` **no puede enviar headers** (`Authorization: Bearer`). Opciones: cookie `HttpOnly` (la más limpia), un token corto en query string (queda en logs: que sea de un solo uso y expire en segundos), o usar `fetch` con streaming y parsear el formato tú mismo (librerías como `@microsoft/fetch-event-source`).

> ⚠️ **SSE y múltiples réplicas**: `EventEmitter2` es *in-process*. Si el evento `orden.estado` ocurre en la réplica A y el cliente está conectado a la réplica B, nunca le llega. Solución: publicar los eventos en **Redis Pub/Sub** (o el broker de la Sesión 29) y que cada réplica los reenvíe a sus clientes locales. Es el mismo problema que resuelve el adapter Redis de WebSockets (Sesión 27).

> ⚠️ Cada conexión SSE es un socket abierto por usuario. En ALB configura el *idle timeout* por encima del intervalo de heartbeat, y en Nginx desactiva el buffering (`proxy_buffering off;` o el header `X-Accel-Buffering: no`) o los eventos llegan en bloques.

---

## 8. Compresión

Comprimir respuestas JSON reduce el tamaño 70–90%. ¿Dónde hacerlo?

```ts
// Express
import compression from 'compression';
app.use(compression({ threshold: 1024 }));    // no comprimir respuestas < 1 KB

// Fastify
import compress from '@fastify/compress';
await app.register(compress, { encodings: ['br', 'gzip', 'deflate'] });
```

| Dónde | Pros | Contras |
|---|---|---|
| En Node (`compression`) | Sin infraestructura extra | Consume **CPU del event loop**: gzip de respuestas grandes compite con tus requests |
| Reverse proxy / CDN (Nginx, CloudFront, API Gateway) | CPU fuera de Node, caché del resultado comprimido, Brotli fácil | Hay que configurarlo |

> 💡 Recomendación senior: en producción, **comprime en el borde** (CloudFront, Nginx) y deja Node sin compresión. Usa `compression` en Node solo si expones Node directamente o no controlas el proxy. Detalles de performance en la Sesión 33.

> ⚠️ **Compresión + SSE**: el middleware `compression` bufferiza la salida para comprimir mejor, y los eventos SSE pueden quedar retenidos. Excluye `text/event-stream` con la opción `filter` o comprime en el proxy. Tampoco recomprimas archivos que ya vienen comprimidos (JPEG, PNG, MP4, ZIP): gastas CPU sin ganar nada.

> ⚠️ **Fastify**: `FileInterceptor` y compañía son de `@nestjs/platform-express`. Con Fastify usa `@fastify/multipart` (y su API `request.file()`, que ya es un stream) y `@fastify/compress`.

---

## 9. Checklist de producción para archivos

| Riesgo | Mitigación |
|---|---|
| DoS por tamaño | `limits.fileSize` en Multer/busboy, límite en el proxy (`client_max_body_size`), presigned POST con `content-length-range` |
| Tipo falso | Magic numbers, re-codificación, allowlist de tipos |
| Path traversal | Nombre generado (`randomUUID()`), nunca `originalname` como ruta |
| XSS por archivo subido | Servir desde otro dominio/bucket, `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff` |
| Archivos en réplica equivocada | Almacenamiento externo (S3), nunca disco local |
| Costos de S3 | Lifecycle rules (multipart incompletos, pasar a Glacier), URLs firmadas cortas |
| Datos personales en metadatos | Eliminar EXIF |
| Malware | Escaneo asíncrono antes de marcar el archivo como disponible |

---

## Resumen mental de la sesión

```
Archivos = streams. Memoria constante > buffer completo.
pipeline() propaga backpressure y errores; .pipe() no propaga errores.

Upload (Express):
  FileInterceptor / FilesInterceptor / FileFieldsInterceptor + @UploadedFile(s)
  MulterModule.register({ storage, limits: { fileSize } })  ← SIEMPRE limits
  ParseFilePipe(MaxFileSizeValidator, FileTypeValidator)  ← valida DESPUÉS de recibir
  mimetype lo manda el cliente → magic numbers / re-codificar

S3:
  pequeño → memoryStorage + PutObject
  grande por la API → busboy + @aws-sdk/lib-storage Upload (multipart, stream)
  grande ideal → presigned URL (getSignedUrl) → cliente sube directo; validar después

Descarga: StreamableFile(stream, { type, length, disposition }) → Express y Fastify
  mejor: redirect / URL firmada de GET; Range → 206
Export gigante: async generator + keyset + Readable.from() → StreamableFile
SSE: @Sse() → Observable<MessageEvent>{ id, type, data }; heartbeat; auth por cookie;
     multi-réplica → Redis pub/sub
Compresión: mejor en CDN/proxy; ojo con SSE y archivos ya comprimidos
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Por qué `memoryStorage` sin `limits.fileSize` es una vulnerabilidad? ¿Qué diferencia hay entre el límite de Multer y `MaxFileSizeValidator`?
2. ❓ ¿Qué es backpressure y por qué `pipeline()` es preferible a `.pipe()`?
3. ❓ ¿Por qué no puedes confiar en `file.mimetype`? ¿Cómo validas el tipo real?
4. ❓ Compara subir a S3 vía buffer, vía stream con `lib-storage` y vía presigned URL.
5. ❓ ¿Qué problema tiene guardar uploads en disco local cuando corres en ECS con 3 réplicas?
6. ❓ ¿Qué ventajas tiene `StreamableFile` frente a usar `@Res()` y `res.pipe()`?
7. ❓ ¿Cómo exportarías 5 millones de filas a CSV sin agotar la memoria? ¿Qué pasa si el cliente se desconecta?
8. ❓ ¿Qué es SSE, cómo reconecta y qué es `Last-Event-ID`?
9. ❓ ¿Cómo autenticas un endpoint SSE si `EventSource` no permite headers?
10. ❓ ¿Qué problema tiene SSE con varias réplicas y cómo lo resuelves?
11. ❓ ¿Dónde comprimirías las respuestas en producción y por qué? ¿Qué cuidado hay que tener con SSE?
12. ❓ Diseña la subida de videos de 2 GB con procesamiento posterior.

## Ejercicio práctico
1. En TiendaApi, crea `POST /productos/:id/imagen` con `FileInterceptor('imagen')`, `memoryStorage` y `limits.fileSize` de 2 MB. Prueba con `curl -F "imagen=@foto.png" localhost:3000/productos/1/imagen`.
2. Agrega un `ParseFilePipe` con `MaxFileSizeValidator` y tu `MagicNumberValidator`. Renombra un `.txt` a `.png`, súbelo declarando `image/png` y verifica que devuelve `422`.
3. Levanta **LocalStack** o **MinIO** con Docker (`docker run -p 9000:9000 minio/minio server /data`), configura `S3Client` con `endpoint` y `forcePathStyle: true`, y guarda la imagen con `StorageService.subirBuffer`.
4. Implementa `POST /uploads/firma` que devuelva una presigned URL; sube un archivo con `curl -X PUT -T archivo.pdf "<url>"` y luego registra el `key` en un producto validando con `HeadObjectCommand`.
5. Implementa `POST /documentos` con busboy + `Upload`. Sube un archivo de 200 MB y mide la memoria del proceso (`process.memoryUsage().rss`) comparándola con la versión Multer en memoria.
6. Crea `GET /ordenes/export.csv` con el generador asíncrono y keyset pagination. Inserta 200 000 órdenes con un script y descarga con `curl --limit-rate 100k` para comprobar que el generador avanza al ritmo del cliente (loguea cada lote).
7. Crea `@Sse('ordenes/:id/eventos')` y un endpoint `PATCH /ordenes/:id/estado` que emita `orden.estado` con `EventEmitter2`. Abre dos pestañas con `EventSource` y verifica que solo reciben los eventos de su orden.
8. Agrega `compression()` y comprueba con `curl -H "Accept-Encoding: gzip" -I` el header `Content-Encoding`. Luego verifica que tu endpoint SSE sigue entregando eventos en tiempo real (y corrígelo con `filter` si no).

---

➡️ **Cuando termines**, marca la Sesión 26 en el [README](README.md) y pasa a la **Sesión 27 — WebSockets: Gateways, Socket.io, rooms, auth y escalado con Redis**.

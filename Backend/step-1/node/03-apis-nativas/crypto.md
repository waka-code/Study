# Crypto

El módulo `crypto` proporciona funcionalidades criptográficas: hashing, encriptación, firmas digitales, y generación de valores aleatorios seguros.

## Hashing

Los hash son funciones unidireccionales que convierten datos de cualquier tamaño en un valor de tamaño fijo. Son irreversibles.

### Algoritmos Comunes

```javascript
const crypto = require('crypto');

// SHA-256 (recomendado para hashing general)
function hash256(data) {
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}

console.log(hash256('password123'));
// 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f'

// SHA-512 (más seguro, más lento)
function hash512(data) {
  return crypto
    .createHash('sha512')
    .update(data)
    .digest('hex');
}

// MD5 (legacy, NO usar para seguridad)
function md5(data) {
  return crypto
    .createHash('md5')
    .update(data)
    .digest('hex');
}

// Hash de archivos
const fs = require('fs');

async function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// Digest en diferentes formatos
const data = 'hello';
const hash = crypto.createHash('sha256').update(data);

console.log(hash.digest('hex'));        // hexadecimal
console.log(hash.digest('base64'));     // base64
console.log(hash.digest('base64url'));  // base64 URL-safe
console.log(hash.digest());             // Buffer
```

### HMAC (Hash-based Message Authentication Code)

HMAC combina un hash con una clave secreta. Se usa para verificar integridad y autenticidad.

```javascript
const crypto = require('crypto');

// Crear HMAC
function createHMAC(data, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

const secret = 'my-secret-key';
const signature = createHMAC('message', secret);
console.log(signature);

// Verificar HMAC (comparación segura contra timing attacks)
function verifyHMAC(data, secret, expectedSignature) {
  const actualSignature = createHMAC(data, secret);

  // timingSafeEqual previene timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(actualSignature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Uso para verificar webhooks
function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Ejemplo: Verificar webhook de GitHub/Stripe
function verifyGitHubWebhook(req, secret) {
  const signature = req.headers['x-hub-signature-256']; // 'sha256=...'
  const [algorithm, hash] = signature.split('=');

  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(req.body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(expectedHash, 'hex')
  );
}
```

### Password Hashing con PBKDF2

NUNCA almacenar passwords en texto plano ni con hash simple. Usar PBKDF2, bcrypt o scrypt.

```javascript
const crypto = require('crypto');
const { promisify } = require('util');

const pbkdf2 = promisify(crypto.pbkdf2);

// Hashear password
async function hashPassword(password) {
  // Generar salt aleatorio
  const salt = crypto.randomBytes(16).toString('hex');

  // PBKDF2 con 100,000 iteraciones (ajustar según necesidad)
  const hash = await pbkdf2(
    password,
    salt,
    100000,      // iterations
    64,          // key length
    'sha512'     // digest algorithm
  );

  // Almacenar salt + hash juntos
  return `${salt}:${hash.toString('hex')}`;
}

// Verificar password
async function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');

  const verifyHash = await pbkdf2(
    password,
    salt,
    100000,
    64,
    'sha512'
  );

  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    verifyHash
  );
}

// Uso
async function example() {
  const password = 'MySecurePassword123!';

  // Registro de usuario
  const hashedPassword = await hashPassword(password);
  console.log('Stored:', hashedPassword);
  // 'a1b2c3...:d4e5f6...'

  // Login
  const isValid = await verifyPassword(password, hashedPassword);
  console.log('Valid:', isValid); // true

  const isInvalid = await verifyPassword('wrongpass', hashedPassword);
  console.log('Invalid:', isInvalid); // false
}

// Clase reutilizable
class PasswordHasher {
  constructor(iterations = 100000, keyLength = 64, digest = 'sha512') {
    this.iterations = iterations;
    this.keyLength = keyLength;
    this.digest = digest;
  }

  async hash(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await pbkdf2(
      password,
      salt,
      this.iterations,
      this.keyLength,
      this.digest
    );

    return `${salt}:${hash.toString('hex')}`;
  }

  async verify(password, storedHash) {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = await pbkdf2(
      password,
      salt,
      this.iterations,
      this.keyLength,
      this.digest
    );

    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      verifyHash
    );
  }
}
```

### Scrypt (alternativa moderna a PBKDF2)

```javascript
const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

async function hashPasswordScrypt(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);

  return `${salt}:${hash.toString('hex')}`;
}

async function verifyPasswordScrypt(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = await scrypt(password, salt, 64);

  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    verifyHash
  );
}
```

## Encriptación Simétrica (AES)

La misma clave se usa para encriptar y desencriptar. Rápido y eficiente.

### AES-256-GCM (Recomendado)

GCM proporciona autenticación además de encriptación.

```javascript
const crypto = require('crypto');

// Encriptar
function encrypt(text, masterKey) {
  // Generar IV (Initialization Vector) aleatorio
  const iv = crypto.randomBytes(16);

  // Derivar clave de 32 bytes desde masterKey
  const key = crypto.scryptSync(masterKey, 'salt', 32);

  // Crear cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  // Encriptar
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Obtener auth tag (para verificación)
  const authTag = cipher.getAuthTag();

  // Retornar iv + authTag + encrypted (todo necesario para desencriptar)
  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    encrypted
  };
}

// Desencriptar
function decrypt(encryptedData, masterKey) {
  const key = crypto.scryptSync(masterKey, 'salt', 32);

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(encryptedData.iv, 'hex')
  );

  // Establecer auth tag para verificación
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

  // Desencriptar
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Uso
const masterKey = 'my-master-encryption-key';
const sensitiveData = 'SSN: 123-45-6789';

const encrypted = encrypt(sensitiveData, masterKey);
console.log('Encrypted:', encrypted);
/*
{
  iv: 'a1b2c3d4...',
  authTag: 'e5f6g7h8...',
  encrypted: 'i9j0k1l2...'
}
*/

const decrypted = decrypt(encrypted, masterKey);
console.log('Decrypted:', decrypted);
// 'SSN: 123-45-6789'

// Formato compacto (todo en un string)
function encryptCompact(text, masterKey) {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(masterKey, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combinar en formato: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptCompact(encryptedString, masterKey) {
  const [ivHex, authTagHex, encrypted] = encryptedString.split(':');

  const key = crypto.scryptSync(masterKey, 'salt', 32);
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivHex, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### Clase Reutilizable para Encriptación

```javascript
const crypto = require('crypto');

class Encryptor {
  constructor(masterKey, algorithm = 'aes-256-gcm') {
    this.algorithm = algorithm;
    this.key = crypto.scryptSync(masterKey, 'salt', 32);
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedString) {
    const [ivHex, authTagHex, encrypted] = encryptedString.split(':');

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(ivHex, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Encriptar objetos JSON
  encryptObject(obj) {
    return this.encrypt(JSON.stringify(obj));
  }

  decryptObject(encryptedString) {
    return JSON.parse(this.decrypt(encryptedString));
  }
}

// Uso
const encryptor = new Encryptor(process.env.ENCRYPTION_KEY);

const user = { id: 123, email: 'user@example.com' };
const encrypted = encryptor.encryptObject(user);
const decrypted = encryptor.decryptObject(encrypted);
```

## Generación de Valores Aleatorios

```javascript
const crypto = require('crypto');

// Bytes aleatorios
const randomBytes = crypto.randomBytes(32);
console.log(randomBytes.toString('hex')); // 64 caracteres hex

// Generar token seguro
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

console.log(generateToken()); // Token de 64 caracteres

// Generar UUID v4
function generateUUID() {
  return crypto.randomUUID();
}

console.log(generateUUID()); // 'a1b2c3d4-e5f6-4789-9012-3456789abcde'

// Número aleatorio en rango
function randomInt(min, max) {
  const range = max - min;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxValue = Math.pow(256, bytesNeeded);
  const randomValue = crypto.randomBytes(bytesNeeded).readUIntBE(0, bytesNeeded);

  return min + (randomValue % range);
}

console.log(randomInt(1, 100)); // Número entre 1 y 99

// Mejor: usar randomInt nativo (Node 14.10+)
const num = crypto.randomInt(1, 100);
console.log(num);

// String aleatorio con caracteres específicos
function generateRandomString(length, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
  let result = '';
  const charsetLength = charset.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charsetLength);
    result += charset[randomIndex];
  }

  return result;
}

console.log(generateRandomString(16)); // 'aB3xK9mP2qW7sN4v'

// Generar código de verificación
function generateVerificationCode(length = 6) {
  return generateRandomString(length, '0123456789');
}

console.log(generateVerificationCode()); // '482719'
```

## Firmas Digitales (RSA)

Verificar autenticidad e integridad usando criptografía asimétrica.

```javascript
const crypto = require('crypto');

// Generar par de claves RSA
function generateKeyPair() {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
}

const { publicKey, privateKey } = generateKeyPair();

// Firmar datos
function sign(data, privateKey) {
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  sign.end();

  return sign.sign(privateKey, 'hex');
}

// Verificar firma
function verify(data, signature, publicKey) {
  const verify = crypto.createVerify('SHA256');
  verify.update(data);
  verify.end();

  return verify.verify(publicKey, signature, 'hex');
}

// Uso
const data = 'Important message';
const signature = sign(data, privateKey);
console.log('Signature:', signature);

const isValid = verify(data, signature, publicKey);
console.log('Valid:', isValid); // true

const isInvalid = verify('Tampered message', signature, publicKey);
console.log('Invalid:', isInvalid); // false

// JWT manual (simplificado)
function createJWT(payload, privateKey) {
  const header = { alg: 'RS256', typ: 'JWT' };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = sign(data, privateKey);
  const encodedSignature = Buffer.from(signature, 'hex').toString('base64url');

  return `${data}.${encodedSignature}`;
}

function verifyJWT(token, publicKey) {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');

  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = Buffer.from(encodedSignature, 'base64url').toString('hex');

  return verify(data, signature, publicKey);
}
```

## Casos de Uso Prácticos

### Session Tokens

```javascript
const crypto = require('crypto');

class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  createSession(userId) {
    const sessionId = crypto.randomBytes(32).toString('hex');

    this.sessions.set(sessionId, {
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 horas
    });

    return sessionId;
  }

  getSession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  destroySession(sessionId) {
    this.sessions.delete(sessionId);
  }
}
```

### API Key Generation

```javascript
function generateAPIKey() {
  const prefix = 'sk';
  const version = 'v1';
  const randomPart = crypto.randomBytes(24).toString('base64url');

  return `${prefix}_${version}_${randomPart}`;
}

console.log(generateAPIKey());
// 'sk_v1_aB3xK9mP2qW7sN4vaB3xK9mP2qW7sN4v'
```

### Checksum de Archivos

```javascript
async function generateFileChecksum(filePath) {
  const hash = crypto.createHash('sha256');
  const stream = require('fs').createReadStream(filePath);

  return new Promise((resolve, reject) => {
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function verifyFileIntegrity(filePath, expectedChecksum) {
  const actualChecksum = await generateFileChecksum(filePath);
  return actualChecksum === expectedChecksum;
}
```

## Pregunta de Entrevista

**P: ¿Por qué nunca deberías usar MD5 o SHA-1 para hashear passwords? ¿Qué usarías en su lugar y por qué?**

**R:**

**Problemas con MD5 y SHA-1:**

1. **Velocidad**: Son muy rápidos (millones de hashes/segundo)
   - Un atacante puede probar miles de millones de passwords por segundo
   - GPU puede calcular ~50 mil millones de MD5/seg

2. **Colisiones**: Se han encontrado colisiones
   - MD5: Completamente roto (2004)
   - SHA-1: Deprecated por colisiones (2017)

3. **Rainbow Tables**: Tablas precalculadas de hashes comunes
   - Sin salt, password común = hash común
   - Atacante puede buscar hash en tabla precalculada

4. **No diseñados para passwords**:
   - Diseñados para checksums/integridad
   - No tienen protección contra fuerza bruta

**Soluciones correctas:**

**1. PBKDF2** (Password-Based Key Derivation Function 2):
- Múltiples iteraciones (100,000+)
- Deriva clave desde password + salt
- Computacionalmente costoso por diseño
- Built-in en Node.js crypto

**2. bcrypt**:
- Diseñado específicamente para passwords
- Tiene "cost factor" ajustable
- Requiere librería externa (`bcrypt` npm)
- Más lento intencionalmente

**3. scrypt**:
- Requiere mucha memoria (previene hardware especializado)
- Recomendado por expertos modernos
- Built-in en Node.js crypto (v10.5+)

**4. Argon2** (lo más moderno):
- Ganador de Password Hashing Competition 2015
- Resistente a GPU/ASIC
- Requiere librería externa

**Ejemplo correcto:**
```javascript
// ❌ NUNCA hacer esto
const hash = crypto.createHash('md5').update(password).digest('hex');

// ✅ Hacer esto
const salt = crypto.randomBytes(16);
const hash = await crypto.pbkdf2(password, salt, 100000, 64, 'sha512');
```

**Características necesarias:**
1. **Salt único** por password (previene rainbow tables)
2. **Múltiples iteraciones** (ralentiza fuerza bruta)
3. **Algoritmo moderno** (PBKDF2/scrypt/bcrypt/Argon2)
4. **Timing attack protection** (crypto.timingSafeEqual)

## Referencias

- [Crypto Module](https://nodejs.org/api/crypto.html)
- Ver: `09-seguridad/resumen-seguridad.md` para mejores prácticas de seguridad
- Ver: `/Backend/step-1/PatronesSeguridad/` para patrones de autenticación

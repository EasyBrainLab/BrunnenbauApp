# Architektur-Prompt fuer neue Webanwendungen

> Dieses Dokument dient als Startprompt fuer Claude Code (oder andere KI-Assistenten),
> um von Beginn an eine saubere, wartbare und skalierbare Architektur aufzubauen.
> Ausgelegt fuer Anwendungen mit bis zu 100.000+ Usern, Millionen von Datensaetzen
> und grossem Dateivolumen (Bilder, Dokumente).

---

## Anweisung

Erstelle eine Webanwendung mit folgender Architektur und halte dich an die
beschriebenen Designregeln. Diese Regeln gelten fuer das gesamte Projekt und
duerfen nicht ohne explizite Anweisung abgeaendert werden.

---

## 1. Verbindlicher Tech-Stack

| Schicht | Technologie | Version | Zweck |
|---------|------------|---------|-------|
| **Frontend** | React + Vite + TailwindCSS | React 18+, Vite 5+ | SPA, schnelles Build |
| **Backend** | Express.js (ESM) + Zod | Express 4+, Zod 3+ | API-Server, Validierung |
| **Datenbank** | PostgreSQL | 16+ | Relationale Daten, JSONB, Volltextsuche |
| **Dateispeicher** | MinIO (S3-kompatibel) | Latest | Bilder, Dokumente, Uploads |
| **Cache/Sessions** | Redis | 7+ | Sessions, Caching, Rate-Limiting |
| **Reverse Proxy** | Nginx | Latest | SSL, Compression, Static Files |
| **Deployment** | Docker Compose | 3.8+ | Alle Services als Container |
| **DB-Client** | pg (node-postgres) | 8+ | PostgreSQL-Anbindung |
| **Datei-Client** | @aws-sdk/client-s3 | 3+ | S3/MinIO-Anbindung |
| **Session-Store** | connect-redis | 7+ | Sessions in Redis statt RAM |

Dieser Stack ist NICHT verhandelbar. Keine Alternativen einsetzen (kein SQLite,
kein MongoDB, kein lokales Dateisystem fuer Uploads, keine Memory-Sessions).

---

## 2. Projektstruktur

```
projekt/
  backend/
    src/
      server.js                # Express-App, Middleware, Route-Mounting
      database.js              # PostgreSQL Pool-Init, query()-Wrapper
      storage.js               # MinIO/S3-Client, Upload/Download-Helpers
      redis.js                 # Redis-Client, Session-Config
      migrations/              # Nummerierte Migrationsdateien
        001_initial.sql
        002_add_feature_x.sql
      routes/                  # Ein File pro Domaene
      services/                # Geschaeftslogik (bei Komplexitaet)
      middleware/              # Auth, CSRF, Rate-Limiting, Validierung
        auth.js
        csrf.js
        validate.js
      schemas/                 # Zod-Schemas pro Domaene
    .env.example
    Dockerfile
  frontend/
    src/
      api.js                   # Zentraler API-Client
      App.jsx                  # Routing
      hooks/                   # Wiederverwendbare Hooks
        useValueList.js
      components/              # UI-Komponenten
      pages/                   # Seitenkomponenten
      index.css                # Tailwind + Custom Utility Classes
    vite.config.js             # Proxy-Config fuer /api
    Dockerfile
  nginx/
    nginx.conf                 # Reverse-Proxy-Konfiguration
    Dockerfile
  docker-compose.yml
  docker-compose.dev.yml       # Overrides fuer Development
  .env.example
  CLAUDE.md
```

---

## 3. Datenbank (PostgreSQL)

### 3.1 Connection Pool

Nutze `pg.Pool` mit Connection-Pooling. Niemals einzelne Clients erstellen.

```js
// database.js
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Max gleichzeitige Verbindungen
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Query-Wrapper
export async function query(sql, params) {
  const result = await pool.query(sql, params);
  return result.rows;
}

export async function queryOne(sql, params) {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
}

export async function execute(sql, params) {
  const result = await pool.query(sql, params);
  return { rowCount: result.rowCount };
}

// Transaktionen
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export { pool };
```

**Regel:** Alle DB-Zugriffe ueber `query()`, `queryOne()`, `execute()` oder
`withTransaction()`. Niemals `pool.query()` direkt in Routes aufrufen.

### 3.2 Parametrisierte Queries

PostgreSQL nutzt `$1, $2, ...` statt `?` als Platzhalter:

```js
// RICHTIG:
await query('SELECT * FROM users WHERE email = $1 AND status = $2', [email, 'active']);

// FALSCH (SQL-Injection!):
await query(`SELECT * FROM users WHERE email = '${email}'`);
```

**Regel:** NIEMALS String-Interpolation in SQL. Immer parametrisierte Queries.

### 3.3 Nummerierte SQL-Migrationen

```
backend/src/migrations/
  001_initial.sql
  002_add_user_params.sql
  003_value_lists.sql
```

```sql
-- 001_initial.sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

Migrations-Runner in `database.js`:

```js
export async function runMigrations() {
  // Erstelle Tracking-Tabelle
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Lese Migrations-Verzeichnis, sortiert nach Nummer
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const executed = await queryOne('SELECT id FROM _migrations WHERE filename = $1', [file]);
    if (!executed) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await pool.query(sql);
      await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      console.log(`Migration ausgefuehrt: ${file}`);
    }
  }
}
```

**Regel:** Schema-Aenderungen NIE durch Modifikation bestehender Migrationen.
Immer neue Migrationsdatei hinzufuegen. Migrationen sind immutable nach Ausfuehrung.

### 3.4 JSONB fuer flexible Parameter

Fuer User-Parameter, die sich haeufig aendern oder variabel sind:

```sql
-- Option A: JSONB-Spalte (fuer bis zu ~50 Parameter pro User)
ALTER TABLE users ADD COLUMN params JSONB DEFAULT '{}';
CREATE INDEX idx_users_params ON users USING GIN (params);

-- Abfrage einzelner Werte:
SELECT params->>'hauttyp' FROM users WHERE params->>'alter_gruppe' = 'adult';

-- Option B: Key-Value-Tabelle (fuer 50-100+ Parameter pro User)
CREATE TABLE user_params (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  param_key TEXT NOT NULL,
  param_value TEXT,
  PRIMARY KEY (user_id, param_key)
);
CREATE INDEX idx_user_params_key ON user_params(param_key);
```

**Regel:** Bis ~50 Parameter pro Entity → JSONB mit GIN-Index.
Ab ~50+ oder wenn einzelne Parameter haeufig abgefragt/gefiltert werden
→ Key-Value-Tabelle. Beide Ansaetze koennen kombiniert werden.

---

## 4. Dateispeicher (MinIO / S3)

### 4.1 S3-Client

```js
// storage.js
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,           // http://minio:9000
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true,  // Noetig fuer MinIO
});

const BUCKET = process.env.S3_BUCKET || 'uploads';

// Datei hochladen
export async function uploadFile(buffer, originalName, mimeType, folder = '') {
  const ext = originalName.split('.').pop();
  const key = `${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`.replace(/^\//, '');

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));

  return key;  // In DB speichern
}

// Temporaere Download-URL (15 Min gueltig)
export async function getFileUrl(key, expiresIn = 900) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

// Datei loeschen
export async function deleteFile(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
```

### 4.2 Bild-Upload-Route

```js
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },  // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.post('/upload', requireAuth, upload.single('image'), async (req, res) => {
  const key = await uploadFile(
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype,
    `users/${req.session.userId}`    // Ordner pro User
  );

  // Metadaten in DB speichern
  await execute(
    'INSERT INTO user_files (user_id, s3_key, original_name, mime_type, size) VALUES ($1,$2,$3,$4,$5)',
    [req.session.userId, key, req.file.originalname, req.file.mimetype, req.file.size]
  );

  res.json({ key });
});
```

**Regel:** Bilder NIEMALS im lokalen Dateisystem speichern. Immer in MinIO/S3.
In der DB wird nur der S3-Key gespeichert, nie der vollstaendige Pfad.
Frontend erhaelt Pre-Signed URLs mit begrenzter Gueltigkeit.

---

## 5. Sessions & Caching (Redis)

### 5.1 Redis-Client & Session-Store

```js
// redis.js
import { createClient } from 'redis';
import RedisStore from 'connect-redis';
import session from 'express-session';

const redisClient = createClient({
  url: process.env.REDIS_URL,  // redis://:password@redis:6379
});
await redisClient.connect();

export const sessionMiddleware = session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,   // PFLICHT, kein Fallback!
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000,  // 8 Stunden
    sameSite: 'lax',
  },
});

export { redisClient };
```

### 5.2 Caching-Helper

```js
// Wert mit TTL cachen
export async function cacheGet(key) {
  const val = await redisClient.get(key);
  return val ? JSON.parse(val) : null;
}

export async function cacheSet(key, value, ttlSeconds = 300) {
  await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
}

export async function cacheDelete(key) {
  await redisClient.del(key);
}
```

### 5.3 Rate-Limiting

```js
// middleware/rateLimit.js
export function rateLimit(maxRequests, windowSeconds) {
  return async (req, res, next) => {
    const key = `rl:${req.ip}:${req.path}`;
    const current = await redisClient.incr(key);
    if (current === 1) await redisClient.expire(key, windowSeconds);
    if (current > maxRequests) {
      return res.status(429).json({ error: 'Zu viele Anfragen. Bitte warten.' });
    }
    next();
  };
}

// Verwendung:
router.post('/login', rateLimit(5, 60), loginHandler);      // 5 Versuche/Min
router.post('/upload', rateLimit(20, 60), uploadHandler);    // 20 Uploads/Min
```

**Regel:** Sessions gehoeren in Redis, nicht in den Server-RAM.
Rate-Limiting fuer alle oeffentlichen Endpunkte (Login, Registrierung, Uploads).

---

## 6. Authentifizierung & Sicherheit

### 6.1 User-Registrierung & Login

```js
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function registerUser(email, password, displayName) {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  return queryOne(
    'INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, email',
    [email, hash, displayName]
  );
}

export async function verifyUser(email, password) {
  const user = await queryOne('SELECT id, email, password_hash, is_active FROM users WHERE email = $1', [email]);
  if (!user || !user.is_active) return null;
  const valid = await bcrypt.compare(password, user.password_hash);
  return valid ? { id: user.id, email: user.email } : null;
}
```

### 6.2 Auth-Middleware (Rollen)

```js
// middleware/auth.js
export function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Nicht autorisiert' });
  }
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session?.userId) return res.status(401).json({ error: 'Nicht autorisiert' });
    if (!roles.includes(req.session.role)) return res.status(403).json({ error: 'Keine Berechtigung' });
    next();
  };
}
```

### 6.3 CSRF-Schutz

```js
// middleware/csrf.js
import crypto from 'crypto';

export function csrfToken(req, res) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.json({ csrfToken: req.session.csrfToken });
}

export function csrfProtection(req, res, next) {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const token = req.headers['x-csrf-token'];
    if (!token || token !== req.session.csrfToken) {
      return res.status(403).json({ error: 'Ungueltiger CSRF-Token' });
    }
  }
  next();
}
```

### 6.4 Environment-Variablen

```env
# .env.example — PFLICHTFELDER starten den Server nicht ohne Wert!

# Datenbank
DATABASE_URL=postgresql://user:password@localhost:5432/myapp

# Redis
REDIS_URL=redis://:password@localhost:6379

# MinIO / S3
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=uploads

# Sicherheit — KEIN FALLBACK IM CODE!
SESSION_SECRET=
ADMIN_PASSWORD=

# E-Mail (optional — Dev-Modus loggt in Konsole)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=

# Allgemein
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Startup-Check:**

```js
// server.js — ganz oben
const REQUIRED_ENV = ['DATABASE_URL', 'REDIS_URL', 'SESSION_SECRET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`FEHLER: Environment-Variable ${key} ist nicht gesetzt!`);
    process.exit(1);
  }
}
```

**Regel:** Sicherheitskritische Werte MUESSEN gesetzt sein. Der Server
startet nicht ohne sie. Kein Fallback, kein Default-Passwort.

---

## 7. Zentraler API-Client (Frontend)

```js
// api.js
let csrfToken = null;

async function fetchCsrfToken() {
  const res = await fetch('/api/csrf-token', { credentials: 'include' });
  const data = await res.json();
  csrfToken = data.csrfToken;
  return csrfToken;
}

async function apiRequest(url, method, body, isFormData = false) {
  if (method !== 'GET' && !csrfToken) await fetchCsrfToken();

  const options = { method, credentials: 'include', headers: {} };

  if (method !== 'GET') {
    options.headers['X-CSRF-Token'] = csrfToken;
  }

  if (body && !isFormData) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  } else if (body && isFormData) {
    options.body = body;
  }

  let res = await fetch(url, options);

  // CSRF-Token abgelaufen → einmal erneuern und retry
  if (res.status === 403 && method !== 'GET') {
    await fetchCsrfToken();
    options.headers['X-CSRF-Token'] = csrfToken;
    res = await fetch(url, options);
  }

  return res;
}

export const apiGet    = (url)                        => apiRequest(url, 'GET');
export const apiPost   = (url, body, isFormData)      => apiRequest(url, 'POST', body, isFormData);
export const apiPut    = (url, body)                   => apiRequest(url, 'PUT', body);
export const apiDelete = (url)                         => apiRequest(url, 'DELETE');
```

**Regel:** EINE private `apiRequest`-Funktion mit konsistenter Retry-Logik
fuer ALLE Methoden. Kein Code-Duplication zwischen POST/PUT/DELETE.

---

## 8. Frontend-Patterns

### 8.1 Debounced Search

```jsx
const [search, setSearch] = useState('');
const [debouncedSearch, setDebouncedSearch] = useState('');

useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(search), 600);
  return () => clearTimeout(timer);
}, [search]);

useEffect(() => {
  loadData(debouncedSearch);
}, [debouncedSearch]);
```

**Regel:** Lokaler Eingabe-State getrennt vom API-State. Verhindert
Cursor-Springen und unnoetige Requests.

### 8.2 Value-List-Hook mit Cache

```js
const { items, loading } = useValueList('order_statuses');
```

- In-Memory-Cache mit 5-Minuten-TTL
- Request-Deduplication
- `invalidateValueListCache(key)` nach Admin-Aenderungen

### 8.3 Custom CSS-Utility-Klassen

```css
@layer components {
  .btn-primary   { @apply bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold
                          hover:bg-blue-700 transition-colors
                          focus:outline-none focus:ring-2 focus:ring-blue-300
                          disabled:opacity-50 disabled:cursor-not-allowed; }
  .btn-secondary { @apply bg-white text-blue-600 border-2 border-blue-600 px-6 py-3
                          rounded-lg font-semibold hover:bg-blue-50 transition-colors; }
  .form-input    { @apply w-full px-4 py-3 border rounded-lg bg-white
                          focus:ring-2 focus:ring-blue-300 focus:border-blue-500; }
  .form-input.error { @apply border-red-400 ring-2 ring-red-200; }
  .card          { @apply bg-white rounded-2xl shadow-sm border p-6; }
}
```

**Regel:** Maximal 5-8 Utility-Klassen. Konsistentes Aussehen ohne
Copy-Paste in jeder Komponente.

### 8.4 Lazy Loading

```jsx
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
// Hauptseiten eager, Spezialseiten lazy.
```

### 8.5 Bild-Uploads mit Pre-Signed URLs

```jsx
async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await apiPost('/api/files/upload', formData, true);
  return res.json();  // { key: 'users/42/1234-uuid.jpg' }
}

// Bild anzeigen: Pre-Signed URL vom Backend holen
async function getImageUrl(key) {
  const res = await apiGet(`/api/files/url?key=${encodeURIComponent(key)}`);
  const { url } = await res.json();
  return url;  // Temporaere URL, 15 Min gueltig
}
```

---

## 9. Backend-Patterns

### 9.1 Route-Struktur

Ein File pro Domaene, gemountet in `server.js`:

```js
app.use('/api/users', csrfProtection, userRoutes);
app.use('/api/files', csrfProtection, requireAuth, fileRoutes);
// Oeffentliche Endpunkte: CSRF nur fuer schreibende Methoden
app.use('/api/value-lists', (req, res, next) => {
  if (['POST','PUT','DELETE'].includes(req.method)) return csrfProtection(req, res, next);
  next();
}, valueListRoutes);
```

### 9.2 Server-seitige Validierung (Zod)

```js
// schemas/userSchemas.js
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Ungueltige E-Mail'),
  password: z.string().min(8, 'Mindestens 8 Zeichen'),
  display_name: z.string().min(1).max(100),
});

// middleware/validate.js
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.flatten().fieldErrors });
    }
    req.validated = result.data;
    next();
  };
}

// Verwendung in Route:
router.post('/register', validate(registerSchema), registerHandler);
```

**Regel:** Frontend-Validierung ist UX. Backend-Validierung ist Sicherheit.
Beides ist noetig, keines ersetzt das andere.

### 9.3 Dev-Modus fuer externe Services

```js
function createTransporter() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({ /* ... */ });
  }
  return {
    sendMail: async (opts) => {
      console.log('=== EMAIL (Dev) ===', opts.to, opts.subject);
      return { messageId: 'dev-' + Date.now() };
    }
  };
}
```

**Regel:** Externe Services immer mit Dev-Fallback (Console-Log).
Kein SMTP/S3-Server noetig zum lokalen Entwickeln.

### 9.4 Health-Check

```js
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');                    // DB erreichbar?
    const redisPing = await redisClient.ping();      // Redis erreichbar?
    res.json({ status: 'ok', db: 'ok', redis: redisPing, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});
```

**Regel:** Health-Endpoint prueft alle Abhaengigkeiten (DB, Redis).
Ohne Auth, ohne CSRF. Liefert 503 wenn ein Service ausfaellt.

---

## 10. Wertelisten-System (Value Lists)

```sql
CREATE TABLE value_lists (
  id SERIAL PRIMARY KEY,
  list_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE value_list_items (
  id SERIAL PRIMARY KEY,
  list_id INTEGER NOT NULL REFERENCES value_lists(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  color TEXT,
  icon TEXT,
  metadata_json JSONB,
  UNIQUE(list_id, value)
);
```

- `GET /api/value-lists/:key/items` — Oeffentlich (fuer Formulare)
- `POST/PUT/DELETE` — Admin-only mit CSRF
- Frontend: `useValueList(key)` Hook mit 5-Min-Cache

**Regel:** Keine Enums im Code fuer Geschaeftswerte. Alles, was ein Admin
aendern koennen soll, gehoert in Wertelisten.

---

## 11. Deployment (Docker Compose)

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${S3_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${S3_SECRET_KEY}
    volumes:
      - miniodata:/data
    ports:
      - "9001:9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      S3_ENDPOINT: http://minio:9000
      S3_ACCESS_KEY: ${S3_ACCESS_KEY}
      S3_SECRET_KEY: ${S3_SECRET_KEY}
      S3_BUCKET: ${S3_BUCKET}
      SESSION_SECRET: ${SESSION_SECRET}
      NODE_ENV: production
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
      minio: { condition: service_started }
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "8080:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  pgdata:
  redisdata:
  miniodata:
```

**Regel:** Alle persistenten Daten in Named Volumes. Health-Checks fuer
Abhaengigkeitsreihenfolge. Backend startet erst wenn DB + Redis bereit sind.

---

## 12. Dateikonventionen

| Aspekt | Konvention |
|--------|-----------|
| Dateinamen (Code) | Englisch, camelCase (`userRoutes.js`, `useValueList.js`) |
| Module | ESM (`import/export`), kein CommonJS (`require`) |
| UI-Texte | Deutsch (oder Zielsprache), als Strings im Code |
| Komponenten | PascalCase (`AdminDashboard.jsx`, `Step1Contact.jsx`) |
| DB-Spalten | snake_case (`first_name`, `created_at`) |
| DB-Tabellen | snake_case, Plural (`users`, `user_files`) |
| API-Pfade | kebab-case (`/api/value-lists`, `/api/cost-items`) |
| CSS-Klassen | kebab-case (`btn-primary`, `form-input`) |
| Environment | UPPER_SNAKE_CASE (`DATABASE_URL`, `SESSION_SECRET`) |

---

## 13. CLAUDE.md Template

Erstelle zu Beginn jedes Projekts eine `CLAUDE.md` mit:

```markdown
# CLAUDE.md

## Commands
- `cd backend && npm run dev` — Backend mit --watch auf Port 3001
- `cd frontend && npm run dev` — Vite Dev-Server auf Port 5173
- `docker-compose up --build` — Gesamter Stack
- Migrationen laufen automatisch beim Serverstart

## Architecture
- Frontend: React 18 + Vite + TailwindCSS (SPA)
- Backend: Express.js (ESM) + Zod
- DB: PostgreSQL 16 (pg Pool)
- Dateien: MinIO (S3-kompatibel)
- Sessions: Redis 7 + connect-redis
- Proxy: Nginx

## Key Patterns
- API-Client: `apiGet/apiPost/apiPut/apiDelete` aus `api.js`
- DB-Queries: `query()`, `queryOne()`, `execute()`, `withTransaction()`
- Validierung: Zod-Schemas in `schemas/`, Middleware `validate(schema)`
- Uploads: MinIO mit Pre-Signed URLs
- Value Lists: `useValueList(key)` Hook mit 5-Min-Cache

## Data Model
[ASCII-Baum mit Kern-Tabellen und FK-Beziehungen]

## Environment Variables
[Tabelle aller Variablen mit PFLICHT/OPTIONAL-Markierung]
```

---

## Zusammenfassung der Kernregeln

1. **PostgreSQL** fuer alle relationalen Daten — kein SQLite, kein MongoDB
2. **MinIO/S3** fuer alle Dateien — kein lokales Dateisystem
3. **Redis** fuer Sessions und Caching — kein Memory-Store
4. **Zentraler API-Client** mit konsistenter CSRF-Retry-Logik
5. **Nummerierte SQL-Migrationen** — immutable nach Ausfuehrung
6. **Zod-Validierung** serverseitig fuer alle Eingaben
7. **Connection-Pooling** — nie einzelne DB-Clients erstellen
8. **Rate-Limiting** fuer oeffentliche Endpunkte (Login, Uploads)
9. **Keine Security-Fallbacks** — .env ist Pflicht, Server startet nicht ohne
10. **Health-Endpoint** prueft alle Abhaengigkeiten (DB, Redis)
11. **Wertelisten** statt Enums fuer konfigurierbare Geschaeftswerte
12. **Debounced Search** — lokaler State getrennt vom API-State
13. **ESM-Module** — kein CommonJS (`require`) in neuem Code
14. **Docker Compose** mit Health-Checks und Named Volumes
15. **CLAUDE.md pflegen** — aktuell, knapp, vollstaendig

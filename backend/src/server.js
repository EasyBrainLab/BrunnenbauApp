require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initDatabase } = require('./database');
const inquiryRoutes = require('./routes/inquiries');
const adminRoutes = require('./routes/admin');
const costRoutes = require('./routes/costs');
const supplierRoutes = require('./routes/suppliers');
const inventoryRoutes = require('./routes/inventory');
const valueListRoutes = require('./routes/valueLists');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const tenantSmtpRoutes = require('./routes/tenantSmtp');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy wenn hinter nginx/Reverse-Proxy (noetig fuer secure cookies + rate-limit)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security-Header
app.use(helmet({
  contentSecurityPolicy: false, // CSP separat konfigurieren falls noetig
  crossOriginEmbedderPolicy: false,
}));

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Session-Konfiguration
const sessionSecret = process.env.SESSION_SECRET;
if (process.env.NODE_ENV === 'production' && (!sessionSecret || sessionSecret === 'ein-sicherer-zufaelliger-string-hier-aendern')) {
  console.error('FEHLER: SESSION_SECRET muss in Produktion gesetzt werden! Server wird nicht gestartet.');
  process.exit(1);
}

app.use(session({
  secret: sessionSecret || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8 Stunden
  },
}));

// Rate-Limiting fuer Login (Brute-Force-Schutz)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 10, // Max 10 Versuche pro IP
  message: { error: 'Zu viele Anmeldeversuche. Bitte in 15 Minuten erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/admin/login', loginLimiter);

// Allgemeines Rate-Limiting fuer API
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 Minute
  max: 100, // Max 100 Anfragen pro IP pro Minute
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Statische Dateien (Uploads) — oeffentliche Uploads (Logos etc.)
app.use('/api/uploads/suppliers', express.static(path.join(__dirname, '..', 'uploads', 'suppliers')));
app.use('/api/uploads/materials', express.static(path.join(__dirname, '..', 'uploads', 'materials')));

// Geschuetzte Uploads (Kundendateien) — nur fuer eingeloggte Admins
app.use('/api/uploads', (req, res, next) => {
  // Logo-Dateien sind oeffentlich
  if (req.path.match(/^\/logo\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    return next();
  }
  // Alles andere erfordert Admin-Auth
  if (!req.session?.isAdmin) {
    return res.status(401).json({ error: 'Nicht autorisiert' });
  }
  next();
}, express.static(path.join(__dirname, '..', 'uploads')));

// CSRF-Token-Endpunkt
app.get('/api/csrf-token', (req, res) => {
  // Einfacher CSRF-Schutz über Session
  const crypto = require('crypto');
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.json({ csrfToken: req.session.csrfToken });
});

// CSRF-Prüfung für POST/PUT/DELETE
function csrfProtection(req, res, next) {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const token = req.headers['x-csrf-token'];
    if (!token || token !== req.session.csrfToken) {
      return res.status(403).json({ error: 'Ungültiger CSRF-Token' });
    }
  }
  next();
}

// Auth-Routen (CSRF fuer Login/Register, aber nicht fuer GET /me)
app.use('/api/auth', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) return csrfProtection(req, res, next);
  next();
}, authRoutes);
app.use('/api/users', csrfProtection, userRoutes);
app.use('/api/settings/smtp', csrfProtection, tenantSmtpRoutes);

// API-Routen
app.use('/api/inquiries', csrfProtection, inquiryRoutes);
app.use('/api/admin', csrfProtection, adminRoutes);
app.use('/api/costs', csrfProtection, costRoutes);
app.use('/api/suppliers', csrfProtection, supplierRoutes);
app.use('/api/inventory', csrfProtection, inventoryRoutes);
// Value lists: CSRF only for POST/PUT/DELETE, public GET for wizard pages
app.use('/api/value-lists', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) return csrfProtection(req, res, next);
  next();
}, valueListRoutes);

// Oeffentliche Behoerden-Links (kein CSRF noetig, nur GET)
app.get('/api/authority-links', (req, res) => {
  const { getDb } = require('./database');
  const { bundesland } = req.query;
  if (!bundesland) return res.json([]);
  const db = getDb();
  const links = db.prepare(
    'SELECT id, bundesland, title, url, description, link_type FROM authority_links WHERE bundesland = ? AND is_active = 1 ORDER BY sort_order, title'
  ).all(bundesland);
  res.json(links);
});

// Gesundheitscheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Server starten nach DB-Initialisierung
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Brunnenbau-Backend läuft auf Port ${PORT}`);
  });
}).catch((err) => {
  console.error('Datenbankfehler:', err);
  process.exit(1);
});

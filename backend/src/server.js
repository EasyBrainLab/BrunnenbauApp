require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const { initDatabase } = require('./database');
const inquiryRoutes = require('./routes/inquiries');
const adminRoutes = require('./routes/admin');
const costRoutes = require('./routes/costs');
const supplierRoutes = require('./routes/suppliers');
const inventoryRoutes = require('./routes/inventory');
const valueListRoutes = require('./routes/valueLists');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Session-Konfiguration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000, // 8 Stunden
  },
}));

// Statische Dateien (Uploads)
app.use('/api/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/api/uploads/suppliers', express.static(path.join(__dirname, '..', 'uploads', 'suppliers')));
app.use('/api/uploads/materials', express.static(path.join(__dirname, '..', 'uploads', 'materials')));

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

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { dbGet, dbAll, dbRun } = require('../database');
const { requireAuth, requirePermission, requirePlanFeature } = require('../middleware/tenantContext');

const router = express.Router();

const GRAPHICS_DIR = path.join(__dirname, '..', '..', 'uploads', 'graphics');
function ensureDir() { try { fs.mkdirSync(GRAPHICS_DIR, { recursive: true }); } catch (e) { /* ignore */ } }

const storage = multer.diskStorage({
  destination: (req, file, cb) => { ensureDir(); cb(null, GRAPHICS_DIR); },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`),
});
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(ALLOWED.includes(file.mimetype) ? null : new Error('Nur Bilddateien (JPG, PNG, WEBP, SVG, GIF) erlaubt.'), ALLOWED.includes(file.mimetype)),
});

// GET /api/graphics — Map target_key -> URL (public, tenant-scoped)
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.session?.tenantId || req.query.tenantId || 'default';
    const rows = await dbAll('SELECT target_key, stored_name FROM well_type_graphics WHERE tenant_id = $1', [tenantId]);
    const map = {};
    for (const r of rows) map[r.target_key] = `/api/uploads/graphics/${r.stored_name}`;
    res.json(map);
  } catch (err) {
    console.error('Grafiken konnten nicht geladen werden:', err);
    res.status(500).json({ error: 'Grafiken konnten nicht geladen werden' });
  }
});

// POST /api/graphics — Grafik hochladen + mit target_key verlinken (Auth)
router.post('/', requireAuth, requirePlanFeature('costs'), requirePermission('costs_manage'), upload.single('graphic'), async (req, res) => {
  try {
    const targetKey = req.body.target_key;
    if (!targetKey) return res.status(400).json({ error: 'target_key erforderlich' });
    if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' });

    const existing = await dbGet('SELECT id, stored_name FROM well_type_graphics WHERE tenant_id = $1 AND target_key = $2', [req.tenantId, targetKey]);
    if (existing) {
      await dbRun('UPDATE well_type_graphics SET original_name = $1, stored_name = $2, mime_type = $3, size = $4 WHERE id = $5',
        [req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, existing.id]);
      // alte Datei entfernen
      try { fs.unlinkSync(path.join(GRAPHICS_DIR, existing.stored_name)); } catch (e) { /* ignore */ }
    } else {
      await dbRun('INSERT INTO well_type_graphics (tenant_id, target_key, original_name, stored_name, mime_type, size) VALUES ($1, $2, $3, $4, $5, $6)',
        [req.tenantId, targetKey, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size]);
    }
    res.status(201).json({ target_key: targetKey, url: `/api/uploads/graphics/${req.file.filename}` });
  } catch (err) {
    console.error('Grafik konnte nicht gespeichert werden:', err);
    res.status(500).json({ error: 'Grafik konnte nicht gespeichert werden' });
  }
});

// DELETE /api/graphics/:targetKey — Grafik entfernen (Auth)
router.delete('/:targetKey', requireAuth, requirePlanFeature('costs'), requirePermission('costs_manage'), async (req, res) => {
  try {
    const row = await dbGet('SELECT id, stored_name FROM well_type_graphics WHERE tenant_id = $1 AND target_key = $2', [req.tenantId, req.params.targetKey]);
    if (!row) return res.status(404).json({ error: 'Grafik nicht gefunden' });
    await dbRun('DELETE FROM well_type_graphics WHERE id = $1', [row.id]);
    try { fs.unlinkSync(path.join(GRAPHICS_DIR, row.stored_name)); } catch (e) { /* ignore */ }
    res.json({ message: 'Grafik entfernt' });
  } catch (err) {
    console.error('Grafik konnte nicht entfernt werden:', err);
    res.status(500).json({ error: 'Grafik konnte nicht entfernt werden' });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
  if (err && err.message?.includes('Nur Bild')) return res.status(400).json({ error: err.message });
  next(err);
});

module.exports = router;

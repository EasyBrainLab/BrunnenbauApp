# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Backend
cd backend && npm install
npm run dev          # Start with --watch on port 3001
npm run seed         # Insert 5 test inquiries
node src/seedCosts.js       # Seed materials & BOM data
node src/seedRegulations.js # Seed regional regulations

# Frontend
cd frontend && npm install
npm run dev          # Vite dev server on port 5173
npm run build        # Production build to dist/

# Docker
docker-compose up --build   # Full stack on port 8080
```

Admin login: `admin` / `brunnen2024!`

No test framework or linter is configured.

## Architecture

**Backend:** Express.js + sql.js (SQLite in WASM), CommonJS modules, port 3001.

**Frontend:** React 18 + Vite + TailwindCSS SPA, port 5173. Proxies `/api` to backend via `vite.config.js`.

**Database:** `backend/data/brunnenbau.db`. sql.js loads/persists the file. `PRAGMA foreign_keys = ON`.

### Backend Structure

- `backend/src/server.js` — Express app, middleware (CORS, session, CSRF), route mounting, static `/api/uploads/*`
- `backend/src/database.js` — Async sql.js init, `getDb()` accessor, `saveDb()` persistence
- `backend/src/routes/` — `admin.js`, `inquiries.js`, `costs.js`, `suppliers.js`, `inventory.js`, `valueLists.js`
- `backend/src/email.js` — Nodemailer templates, `WELL_TYPE_LABELS` export
- `backend/src/pdfGenerator.js` — PDF quote generation
- `backend/src/telegram.js` — Telegram notification integration

### Frontend Structure

- `frontend/src/App.jsx` — All routes (customer wizard `/`, admin pages `/admin/*`)
- `frontend/src/api.js` — `apiGet`, `apiPost`, `apiPut`, `apiDelete` with auto CSRF token handling
- `frontend/src/components/steps/Step1-Step7` — Wizard form steps
- `frontend/src/pages/` — WizardPage, AdminDashboard, AdminDetail, AdminCosts, AdminSuppliers, AdminInventory, AdminValueLists, AdminCalendar (lazy)
- `frontend/src/hooks/useValueList.js` — Cached hook for dynamic dropdown values
- `frontend/src/data/wellTypeData.jsx` — Complex well type definitions with pros/cons/icons (NOT a value list)

## Key Patterns

**DB queries:** `getDb().prepare(sql).all(...params)` / `.get()` / `.run()` — sql.js sync API. Call `saveDb()` only in route handlers that mutate (the existing routes handle this via the database module).

**Migrations:** Use `ALTER TABLE ... ADD COLUMN` wrapped in try/catch. If column exists, the error is silently ignored.

**Auth:** Session-based via `express-session`. Admin routes use `requireAuth` middleware. CSRF token fetched from `/api/csrf-token` and sent as `X-CSRF-Token` header on POST/PUT/DELETE.

**Frontend API calls:** Always use `apiGet/apiPost/apiPut/apiDelete` from `api.js`. These handle CSRF tokens and credentials automatically.

**Value Lists:** 15 system-seeded lists (inquiry_statuses, well_types, soil_types, etc.) in `value_lists` + `value_list_items` tables. Public read via `/api/value-lists/:key/items`. Use `useValueList(listKey)` hook on frontend (5-minute cache).

**CSS classes:** `form-input`, `btn-primary`, `btn-secondary`, `card` are custom Tailwind utility classes defined in `frontend/src/index.css`.

**Search inputs:** Use debounced pattern — local `search` state → 600ms timeout → `debouncedSearch` → useEffect triggers API call. This prevents cursor jumping.

## Data Model (core FK relationships)

```
inquiries (inquiry_id TEXT UNIQUE)
  ├── inquiry_files (inquiry_id FK, stored_name for file path)
  ├── inquiry_responses (inquiry_id FK)
  ├── inquiry_messages (inquiry_id FK)
  └── quotes (inquiry_id FK)

cost_items (id)
  ├── well_type_bom (cost_item_id FK)
  └── cost_item_suppliers (cost_item_id FK)

suppliers (id)
  └── cost_item_suppliers (supplier_id FK)
```

Uploaded files are stored in `backend/uploads/` as `{timestamp}-{uuid}.{ext}`.

## Environment Variables

Set in `.env` (copy from `.env.example`). Key vars: `PORT`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM`, `EMAIL_COMPANY`, `FRONTEND_URL`.

## Language

All UI text, variable names in routes, and user-facing strings are in **German**. Code structure (function names, file names) is in English.

const { dbGet, dbAll, dbRun } = require('../database');

const PERMISSION_CATALOG = [
  { key: 'dashboard_view', label: 'Dashboard & Anfragen lesen', group: 'Anfragen', description: 'Dashboard und Detailansichten oeffnen und Daten einsehen.' },
  { key: 'inquiries_edit', label: 'Anfragen bearbeiten', group: 'Anfragen', description: 'Anfragen, Notizen, Status und Kommunikation bearbeiten.' },
  { key: 'calendar_manage', label: 'Einsatzplanung / Kalender', group: 'Planung', description: 'Bohrtermine planen und Kalenderdaten verwalten.' },
  { key: 'offers_manage', label: 'Angebote vorbereiten & versenden', group: 'Vertrieb', description: 'Angebote erzeugen, bearbeiten und an Kunden senden.' },
  { key: 'costs_manage', label: 'Kosten, Material & BOM verwalten', group: 'Stammdaten', description: 'Materialstamm, Brunnenarten, BOM und Kostenrichtwerte pflegen.' },
  { key: 'suppliers_manage', label: 'Lieferanten verwalten', group: 'Einkauf', description: 'Lieferanten anlegen, bearbeiten und Dokumente pflegen.' },
  { key: 'inventory_manage', label: 'Lager verwalten', group: 'Lager', description: 'Lagerorte, Bestaende, Bewegungen und Bestellvorschlaege pflegen.' },
  { key: 'company_manage', label: 'Firmendaten & Dokumentlayout verwalten', group: 'Einstellungen', description: 'Firmendaten, Layouttexte und Dokumentinhalte pflegen.' },
  { key: 'authority_links_manage', label: 'Behoerden-Links verwalten', group: 'Einstellungen', description: 'Behoerden- und Genehmigungslinks je Bundesland pflegen.' },
  { key: 'value_lists_manage', label: 'Wertelisten verwalten', group: 'Einstellungen', description: 'Dropdown-Werte und interne Listen pflegen.' },
  { key: 'smtp_manage', label: 'SMTP / E-Mail verwalten', group: 'Einstellungen', description: 'E-Mail-Konten und Versandkonfiguration verwalten.' },
  { key: 'users_manage', label: 'Benutzer & Rollen verwalten', group: 'Administration', description: 'Benutzer anlegen, Rollen zuweisen und Rechte verwalten.' },
];

const SYSTEM_ROLES = [
  {
    value: 'owner',
    label: 'Inhaber',
    is_active: 1,
    sort_order: 10,
    metadata_json: JSON.stringify({
      description: 'Vollzugriff auf alle Bereiche',
      isSystem: true,
      permissions: PERMISSION_CATALOG.map((permission) => permission.key),
    }),
  },
  {
    value: 'admin',
    label: 'Administrator',
    is_active: 1,
    sort_order: 20,
    metadata_json: JSON.stringify({
      description: 'Operativer Vollzugriff ohne Eigentuemerverwaltung',
      isSystem: true,
      permissions: PERMISSION_CATALOG.map((permission) => permission.key).filter((key) => key !== 'users_manage'),
    }),
  },
  {
    value: 'worker',
    label: 'Mitarbeiter',
    is_active: 1,
    sort_order: 30,
    metadata_json: JSON.stringify({
      description: 'Anfragen und Einsatzplanung bearbeiten',
      isSystem: true,
      permissions: ['dashboard_view', 'inquiries_edit', 'calendar_manage', 'offers_manage'],
    }),
  },
  {
    value: 'readonly',
    label: 'Nur Lesen',
    is_active: 1,
    sort_order: 40,
    metadata_json: JSON.stringify({
      description: 'Nur lesender Zugriff auf Anfragen',
      isSystem: true,
      permissions: ['dashboard_view'],
    }),
  },
];

function parseMetadata(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function normalizeRoleItem(item) {
  const metadata = parseMetadata(item.metadata_json);
  return {
    ...item,
    description: metadata.description || '',
    permissions: Array.isArray(metadata.permissions) ? metadata.permissions : [],
    is_system: metadata.isSystem ? 1 : item.is_system || 0,
  };
}

async function ensureRoleList(tenantId) {
  const tenant = tenantId || 'default';
  let list = await dbGet('SELECT * FROM value_lists WHERE list_key = $1 AND tenant_id = $2', ['user_roles', tenant]);

  if (!list) {
    const inserted = await dbRun(
      `INSERT INTO value_lists (list_key, display_name, description, is_system, tenant_id)
       VALUES ($1, $2, $3, 0, $4)
       RETURNING *`,
      ['user_roles', 'Benutzerrollen', 'Rollenprofile und Berechtigungen fuer den Admin-Bereich', tenant]
    );
    list = inserted.rows[0] || await dbGet('SELECT * FROM value_lists WHERE list_key = $1 AND tenant_id = $2', ['user_roles', tenant]);
  }

  for (const role of SYSTEM_ROLES) {
    const existing = await dbGet('SELECT id FROM value_list_items WHERE list_id = $1 AND value = $2', [list.id, role.value]);
    if (!existing) {
      await dbRun(
        `INSERT INTO value_list_items (list_id, value, label, sort_order, is_active, metadata_json, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [list.id, role.value, role.label, role.sort_order, role.is_active, role.metadata_json, tenant]
      );
    }
  }

  return list;
}

async function getRoleDefinitions(tenantId, { includeInactive = true } = {}) {
  const tenant = tenantId || 'default';
  const list = await ensureRoleList(tenant);
  const sql = includeInactive
    ? 'SELECT * FROM value_list_items WHERE list_id = $1 ORDER BY sort_order, label'
    : 'SELECT * FROM value_list_items WHERE list_id = $1 AND is_active = 1 ORDER BY sort_order, label';
  const rows = await dbAll(sql, [list.id]);
  return rows.map(normalizeRoleItem);
}

async function getRoleDefinition(tenantId, roleKey) {
  const tenant = tenantId || 'default';
  const list = await ensureRoleList(tenant);
  const row = await dbGet('SELECT * FROM value_list_items WHERE list_id = $1 AND value = $2', [list.id, roleKey]);
  return row ? normalizeRoleItem(row) : null;
}

async function isValidRole(tenantId, roleKey) {
  if (!roleKey) return false;
  const role = await getRoleDefinition(tenantId, roleKey);
  return !!role && !!role.is_active;
}

async function upsertRoleDefinition(tenantId, payload) {
  const tenant = tenantId || 'default';
  const list = await ensureRoleList(tenant);
  const permissions = Array.isArray(payload.permissions)
    ? payload.permissions.filter((permission) => PERMISSION_CATALOG.some((entry) => entry.key === permission))
    : [];
  const metadata = JSON.stringify({
    description: payload.description || '',
    permissions,
    isSystem: !!payload.is_system,
  });

  if (payload.id) {
    await dbRun(
      `UPDATE value_list_items
       SET label = $1,
           sort_order = $2,
           is_active = $3,
           metadata_json = $4
       WHERE id = $5 AND list_id = $6`,
      [payload.label, payload.sort_order || 0, payload.is_active ? 1 : 0, metadata, payload.id, list.id]
    );
    return getRoleDefinition(tenant, payload.value);
  }

  await dbRun(
    `INSERT INTO value_list_items (list_id, value, label, sort_order, is_active, metadata_json, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [list.id, payload.value, payload.label, payload.sort_order || 0, payload.is_active ? 1 : 0, metadata, tenant]
  );
  return getRoleDefinition(tenant, payload.value);
}

async function deleteRoleDefinition(tenantId, roleKey) {
  const tenant = tenantId || 'default';
  const list = await ensureRoleList(tenant);
  const role = await dbGet('SELECT * FROM value_list_items WHERE list_id = $1 AND value = $2', [list.id, roleKey]);
  if (!role) return { deleted: false, reason: 'not_found' };

  const normalized = normalizeRoleItem(role);
  if (normalized.is_system) return { deleted: false, reason: 'system_role' };

  const usage = await dbGet('SELECT COUNT(*)::int AS count FROM users WHERE tenant_id = $1 AND role = $2', [tenant, roleKey]);
  if ((usage?.count || 0) > 0) return { deleted: false, reason: 'in_use' };

  await dbRun('DELETE FROM value_list_items WHERE id = $1', [role.id]);
  return { deleted: true };
}

async function getPermissionsForRole(tenantId, roleKey) {
  if (roleKey === 'owner') return PERMISSION_CATALOG.map((permission) => permission.key);
  const role = await getRoleDefinition(tenantId, roleKey);
  if (!role) {
    const fallback = SYSTEM_ROLES.find((entry) => entry.value === roleKey);
    return fallback ? parseMetadata(fallback.metadata_json).permissions || [] : [];
  }
  return role.permissions || [];
}

module.exports = {
  PERMISSION_CATALOG,
  SYSTEM_ROLES,
  ensureRoleList,
  getRoleDefinitions,
  getRoleDefinition,
  getPermissionsForRole,
  isValidRole,
  upsertRoleDefinition,
  deleteRoleDefinition,
};

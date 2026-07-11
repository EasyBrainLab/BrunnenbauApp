// Zentrales Feature->Plan-Mapping fuer das Abo-basierte Feature-Gating.
//
// Orthogonal zum Rollen-/Rechtesystem (services/roles.js):
//   - Rechte (Permissions) steuern, WER innerhalb eines Tenants etwas darf.
//   - Der Plan steuert, WELCHE Module das Abo des Tenants ueberhaupt enthaelt.
//
// Gate-faehige Module = nur in Stufe B ("Komplett") bzw. im 3-Tage-Trial verfuegbar.
// Stufe A ("Konfigurator & Interessenten" / plan 'leads') enthaelt KEINES davon;
// der oeffentliche Konfigurator und die Interessenten-/Anfragenliste sind bewusst
// NICHT gate-faehig und laufen in jedem Plan.
const GATED_FEATURES = ['quotes', 'costs', 'suppliers', 'inventory', 'calendar'];

const PLAN_FEATURES = {
  trial: [...GATED_FEATURES],    // 3-Tage-Test: Vollzugriff
  complete: [...GATED_FEATURES], // Abo Stufe B: Vollzugriff
  pro: [...GATED_FEATURES],      // Legacy/Default-Tenant: Vollzugriff
  leads: [],                     // Abo Stufe A: nur Konfigurator + Interessenten
  free: [],                      // Legacy neue Tenants: wie leads
  expired: [],                   // Trial abgelaufen (gesperrt)
};

// Unbekannte Plaene erhalten keine gate-faehigen Features (deny-by-default).
function planHasFeature(plan, feature) {
  if (!GATED_FEATURES.includes(feature)) return true; // ungegatetes Feature -> immer verfuegbar
  return (PLAN_FEATURES[plan] || []).includes(feature);
}

module.exports = { GATED_FEATURES, PLAN_FEATURES, planHasFeature };

-- 009_trial_billing.sql
-- Aktiviert den Trial-Lebenszyklus auf der bisher ungenutzten subscriptions-Tabelle
-- (subscriptions selbst wird in 001_foundation.sql angelegt).
-- Phase 1: nur die Zusatzspalten fuer den spaeteren Loeschjob; das Fuellen der
-- Trial-Zeile passiert in routes/auth.js bei der Registrierung.

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS purge_at TIMESTAMPTZ;      -- geplante endgueltige Loeschung (Tag 24)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;   -- Zeitpunkt einer Kuendigung

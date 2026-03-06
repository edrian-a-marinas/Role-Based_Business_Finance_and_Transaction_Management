-- Usage: \i /home/edrian/Projects/Transaction-Processing/backend/migrations/dev_scratch.sql


-- ── Reset a user's password ───────────────────────────────────────────────────
/*
BEGIN;
UPDATE users
SET password_hash = crypt('test1234', gen_salt('bf', 6))
WHERE id = x;
*/


-- ── Deactivate a user ─────────────────────────────────────────────────────────
/*
BEGIN;
UPDATE users
SET is_active = false
WHERE id = 2;
*/


-- ── Hard delete users ─────────────────────────────────────────────────────────
/*
BEGIN;
DELETE FROM users
WHERE id IN (12, 20, 21, 22);
*/


-- ── Truncate tables (full reset) ──────────────────────────────────────────────
/*
TRUNCATE TABLE transactions RESTART IDENTITY CASCADE;
TRUNCATE TABLE reports_history RESTART IDENTITY CASCADE;
TRUNCATE TABLE log_history RESTART IDENTITY CASCADE;
*/


-- ── Update a category ─────────────────────────────────────────────────────────
/*
UPDATE categories
SET name = 'Operating Overhead',
  description = 'Miscellaneous expenses (rent, electricity, internet, water) // daily cost'
WHERE name = 'Expenses';
*/


-- ── Active query (uncomment to run) ──────────────────────────────────────────
/*
DELETE FROM categories
WHERE id = 1;
*/
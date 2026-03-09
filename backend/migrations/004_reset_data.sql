-- =========================================
-- 004_reset_data_fk_safe.sql
-- Deletes in FK-dependency order, no superuser needed
-- =========================================
BEGIN;

-- 1. Notifications first (likely references transactions/users)
DELETE FROM notifications;

-- 2. Deletion requests (references transactions)
DELETE FROM transaction_deletion_requests;

-- 3. Logs and reports (references transactions)
DELETE FROM log_history;
DELETE FROM reports_history;

-- 4. Transactions (references categories)
DELETE FROM transactions;

-- 5. Categories (now safe, nothing references it)
DELETE FROM categories;

-- 6. Auth scratch tables (independent)
DELETE FROM email_verifications;
DELETE FROM login_attempts;

-- Reset all sequences
ALTER SEQUENCE notifications_id_seq                     RESTART WITH 1;
ALTER SEQUENCE transaction_deletion_requests_id_seq     RESTART WITH 1;
ALTER SEQUENCE log_history_id_seq                       RESTART WITH 1;
ALTER SEQUENCE reports_history_id_seq                   RESTART WITH 1;
ALTER SEQUENCE transactions_id_seq                      RESTART WITH 1;
ALTER SEQUENCE categories_id_seq                        RESTART WITH 1;
ALTER SEQUENCE email_verifications_id_seq               RESTART WITH 1;
ALTER SEQUENCE login_attempts_id_seq                    RESTART WITH 1;
-- !! WARNING: Uncomment below to also wipe non-superadmin users !!
-- Preserves id=1 (Super Admin). Cascades will handle FKs.
/*
DELETE FROM users WHERE id != 1;
ALTER SEQUENCE users_id_seq RESTART WITH 2;

-- COMMIT;






-- =========================================
-- 004_reset_verify.sql
-- Run AFTER 004_reset_data.sql, BEFORE COMMIT
-- Verifies all tables were cleared and sequences reset
-- =========================================

-- Row count checks (all should be 0)
SELECT 'notifications'                    AS table_name, COUNT(*) AS remaining_rows FROM notifications
UNION ALL
SELECT 'transaction_deletion_requests',                  COUNT(*) FROM transaction_deletion_requests
UNION ALL
SELECT 'log_history',                                    COUNT(*) FROM log_history
UNION ALL
SELECT 'reports_history',                                COUNT(*) FROM reports_history
UNION ALL
SELECT 'transactions',                                   COUNT(*) FROM transactions
UNION ALL
SELECT 'categories',                                     COUNT(*) FROM categories
UNION ALL
SELECT 'email_verifications',                            COUNT(*) FROM email_verifications
UNION ALL
SELECT 'login_attempts',                                 COUNT(*) FROM login_attempts
ORDER BY table_name;

-- Sequence checks (all last_value should be 1)
SELECT 'notifications_id_seq'                   AS sequence_name, last_value FROM notifications_id_seq
UNION ALL
SELECT 'transaction_deletion_requests_id_seq',           last_value FROM transaction_deletion_requests_id_seq
UNION ALL
SELECT 'log_history_id_seq',                             last_value FROM log_history_id_seq
UNION ALL
SELECT 'reports_history_id_seq',                         last_value FROM reports_history_id_seq
UNION ALL
SELECT 'transactions_id_seq',                            last_value FROM transactions_id_seq
UNION ALL
SELECT 'categories_id_seq',                              last_value FROM categories_id_seq
UNION ALL
SELECT 'email_verifications_id_seq',                     last_value FROM email_verifications_id_seq
UNION ALL
SELECT 'login_attempts_id_seq',                          last_value FROM login_attempts_id_seq
ORDER BY sequence_name;

-- Safety check: confirm users are untouched
SELECT 'users (must NOT be 0)' AS safety_check, COUNT(*) AS user_count FROM users;



*/
-- test_queries.sql
-- Purpose: verify that all tables, sequences, and constraints are correctly initialized

-- List all tables in public schema
SELECT table_schema, table_name, table_type, table_owner
FROM information_schema.tables
WHERE table_schema = 'public';

-- Verify row counts in each table
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type='BASE TABLE'
    LOOP
        EXECUTE format('SELECT ''%s'' AS table_name, COUNT(*) AS row_count FROM %I', tbl.table_name, tbl.table_name);
    END LOOP;
END$$;

-- Show all rows in reference tables (roles, categories)
SELECT * FROM roles;
SELECT * FROM categories;

-- Show all rows in transactional tables (users, transactions, reports_history)
SELECT * FROM users;
SELECT * FROM transactions;
SELECT * FROM reports_history;

-- Show sequences last values
SELECT 'roles_id_seq' AS sequence, last_value FROM roles_id_seq;
SELECT 'categories_id_seq' AS sequence, last_value FROM categories_id_seq;
SELECT 'transactions_id_seq' AS sequence, last_value FROM transactions_id_seq;
SELECT 'users_id_seq' AS sequence, last_value FROM users_id_seq;

-- Show all foreign key constraints
SELECT
    constraint_name,
    table_name AS table_from,
    foreign_table_name AS table_to
FROM (
    SELECT
        conname AS constraint_name,
        conrelid::regclass::text AS table_name,
        confrelid::regclass::text AS foreign_table_name
    FROM pg_constraint
    WHERE contype = 'f'
) AS fk;

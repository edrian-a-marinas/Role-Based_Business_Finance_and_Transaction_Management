/*
CREATE VIEW active_transactions AS
SELECT * FROM transactions WHERE deleted_at IS NULL;
*/

/*
CREATE OR REPLACE VIEW users_shortcut AS
SELECT 
  id,
  first_name,
  middle_name,
  last_name,
  phone_number,
  email,
  LEFT(password_hash, 7) || '...' AS password_hash,
  role_id,
  is_active,
  TO_CHAR(created_at, 'YYYY-MM-DD') AS created_at
FROM users;
*/
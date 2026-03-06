-- =========================================
-- 001_create_tables.sql
-- Transaction Processing & Reporting System
-- =========================================
-- Setup (run as superuser before this file):
--   CREATE USER transaction_user WITH PASSWORD 'edrian';
--   CREATE DATABASE transaction_db;
--   ALTER DATABASE transaction_db OWNER TO transaction_user;
--   GRANT ALL PRIVILEGES ON DATABASE transaction_db TO transaction_user;
-- Run:
--   psql -U transaction_user -d transaction_db -W
--   \i /home/edrian/Projects/Transaction-Processing/backend/migrations/001_create_tables.sql

BEGIN;

CREATE TABLE roles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMP(0) NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  role_id       INTEGER      REFERENCES roles(id),
  is_active     BOOLEAN      DEFAULT true,
  created_at    TIMESTAMP(0) NOT NULL DEFAULT now(),
  first_name    VARCHAR(50)  NOT NULL,
  middle_name   VARCHAR(50),
  last_name     VARCHAR(50)  NOT NULL,
  phone_number  VARCHAR(20)
);

CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  created_at  TIMESTAMP(0) NOT NULL DEFAULT now(),
  type        VARCHAR(20)  NOT NULL,
  deleted_at  TIMESTAMP,
  CONSTRAINT categories_type_check CHECK (type IN ('Income', 'Expense')),
  CONSTRAINT categories_name_unique_active UNIQUE (name) WHERE deleted_at IS NULL
);

CREATE TABLE transactions (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER      REFERENCES users(id),
  category_id      INTEGER      REFERENCES categories(id) ON DELETE SET NULL,
  amount           NUMERIC(12,2) NOT NULL,
  transaction_type VARCHAR(20)  NOT NULL,
  description      TEXT,
  transaction_date DATE         NOT NULL,
  created_at       TIMESTAMP(0) NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMP(0),
  CONSTRAINT transactions_transaction_type_check CHECK (transaction_type IN ('Expense', 'Income'))
);

CREATE TABLE transaction_deletion_requests (
  id             SERIAL PRIMARY KEY,
  transaction_id INTEGER      NOT NULL REFERENCES transactions(id),
  requested_by   INTEGER      NOT NULL REFERENCES users(id),
  status         VARCHAR(20)  NOT NULL DEFAULT 'pending',
  requested_at   TIMESTAMP    NOT NULL DEFAULT now(),
  reviewed_by    INTEGER      REFERENCES users(id),
  reviewed_at    TIMESTAMP
);

CREATE TABLE reports_history (
  id           SERIAL PRIMARY KEY,
  generated_by INTEGER      REFERENCES users(id),
  report_type  VARCHAR(50),
  start_date   DATE,
  end_date     DATE,
  created_at   TIMESTAMP(0) NOT NULL DEFAULT now()
);

CREATE TABLE log_history (
  id              SERIAL PRIMARY KEY,
  entity_type     VARCHAR(50)  NOT NULL,
  entity_id       INTEGER      NOT NULL,
  user_id         INTEGER      NOT NULL REFERENCES users(id),
  action          VARCHAR(20)  NOT NULL,
  old_data        JSONB,
  new_data        JSONB,
  action_taken_at TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE email_verifications (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL,
  code       TEXT         NOT NULL,
  expires_at TIMESTAMP    NOT NULL,
  is_used    BOOLEAN      DEFAULT false,
  created_at TIMESTAMP    DEFAULT now()
);

CREATE TYPE notification_type AS ENUM (
  'deletion_request',
  'deletion_approved',
  'deletion_rejected'
);

CREATE TABLE notifications (
  id                SERIAL PRIMARY KEY,
  recipient_user_id INTEGER           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              notification_type NOT NULL,
  payload           JSONB             NOT NULL DEFAULT '{}',
  is_read           BOOLEAN           NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ       NOT NULL DEFAULT now()
);

CREATE TABLE login_attempts (
  id           SERIAL PRIMARY KEY,
  email        VARCHAR(255)             NOT NULL,
  ip_address   VARCHAR(45),
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX idx_log_entity         ON log_history (entity_type, entity_id);
CREATE INDEX idx_log_action_time    ON log_history (action_taken_at);

CREATE INDEX idx_login_attempts_email ON login_attempts (email);
CREATE INDEX idx_login_attempts_ip    ON login_attempts (ip_address);
CREATE INDEX idx_login_attempts_time  ON login_attempts (attempted_at);

CREATE INDEX idx_email_verifications_email   ON email_verifications (email);
CREATE INDEX idx_email_verifications_expires ON email_verifications (expires_at);

CREATE INDEX idx_notifications_recipient_created ON notifications (recipient_user_id, created_at DESC);
CREATE INDEX idx_notifications_recipient_unread  ON notifications (recipient_user_id, is_read) WHERE is_read = false;

COMMIT;
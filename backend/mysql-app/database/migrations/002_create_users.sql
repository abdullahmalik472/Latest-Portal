CREATE TABLE IF NOT EXISTS users (
  id                 CHAR(36)     NOT NULL,
  org_id             CHAR(36)     NOT NULL,
  name               VARCHAR(120) NOT NULL,
  email              VARCHAR(254) NOT NULL,   -- NOT unique: same email may exist in many orgs
  password_hash      VARCHAR(100) NOT NULL,   -- bcrypt
  role               ENUM('admin','teacher','student') NOT NULL,
  reg                VARCHAR(32)  NOT NULL,
  created_at         DATETIME(3)  NOT NULL,
  migrated_at        DATETIME(3)  NULL,       -- set once copied to Supabase (one-way)
  migration_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  migration_error    VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_reg (reg),
  KEY ix_users_email (email),
  KEY ix_users_org_role (org_id, role),
  KEY ix_users_created (created_at),
  KEY ix_users_migration (migrated_at, migration_attempts, created_at),
  CONSTRAINT fk_users_org FOREIGN KEY (org_id) REFERENCES orgs (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Audit trail of the MySQL -> Supabase user migration job.
CREATE TABLE IF NOT EXISTS user_migration_runs (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  started_at   DATETIME(3)  NOT NULL,
  finished_at  DATETIME(3)  NULL,
  migrated     INT UNSIGNED NOT NULL DEFAULT 0,
  failed       INT UNSIGNED NOT NULL DEFAULT 0,
  error        VARCHAR(255) NULL,
  PRIMARY KEY (id),
  KEY ix_runs_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

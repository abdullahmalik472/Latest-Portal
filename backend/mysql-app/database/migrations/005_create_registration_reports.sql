-- Snapshots written by the registration-report cron job.
CREATE TABLE IF NOT EXISTS registration_reports (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  generated_at  DATETIME(3)  NOT NULL,
  total_users   INT UNSIGNED NOT NULL,
  last_10m      INT UNSIGNED NOT NULL,
  last_1h       INT UNSIGNED NOT NULL,
  last_1d       INT UNSIGNED NOT NULL,
  last_7d       INT UNSIGNED NOT NULL,
  last_30d      INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY ix_reports_generated (generated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

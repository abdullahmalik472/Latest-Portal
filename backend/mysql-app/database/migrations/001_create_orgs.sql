CREATE TABLE IF NOT EXISTS orgs (
  id          CHAR(36)     NOT NULL,
  name        VARCHAR(120) NOT NULL,
  created_at  DATETIME(3)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orgs_name (name)          -- utf8mb4_0900_ai_ci: case/accent-insensitive
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

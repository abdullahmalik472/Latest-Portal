-- Server-side sessions. Only the SHA-256 of the cookie token is stored.
CREATE TABLE IF NOT EXISTS sessions (
  id            CHAR(36)     NOT NULL,
  user_id       CHAR(36)     NOT NULL,
  token_hash    CHAR(64)     NOT NULL,
  created_at    DATETIME(3)  NOT NULL,
  expires_at    DATETIME(3)  NOT NULL,
  last_seen_at  DATETIME(3)  NOT NULL,
  ip            VARCHAR(45)  NULL,
  user_agent    VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessions_token (token_hash),
  KEY ix_sessions_user (user_id),
  KEY ix_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

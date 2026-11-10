CREATE TABLE IF NOT EXISTS courses (
  id          CHAR(36)     NOT NULL,
  org_id      CHAR(36)     NOT NULL,
  teacher_id  CHAR(36)     NOT NULL,
  title       VARCHAR(160) NOT NULL,
  created_at  DATETIME(3)  NOT NULL,
  PRIMARY KEY (id),
  KEY ix_courses_org (org_id),
  KEY ix_courses_teacher (teacher_id),
  CONSTRAINT fk_courses_org FOREIGN KEY (org_id) REFERENCES orgs (id) ON DELETE RESTRICT,
  CONSTRAINT fk_courses_teacher FOREIGN KEY (teacher_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

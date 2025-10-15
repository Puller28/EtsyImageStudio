CREATE INDEX IF NOT EXISTS idx_projects_user_created_at
  ON projects (user_id, created_at DESC);

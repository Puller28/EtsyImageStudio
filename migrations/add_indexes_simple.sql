-- Simple index creation without DO blocks
-- Run these one at a time if you get timeouts

-- Index 1: user_id for filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Index 2: composite index for user_id + created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_user_created ON projects(user_id, created_at DESC);

-- Index 3: created_at for sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

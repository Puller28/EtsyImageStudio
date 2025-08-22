-- Add composite index for fast project queries by user_id and created_at
-- This prevents slow table scans when fetching user projects
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_userid_createdat_desc
ON projects (user_id, created_at DESC);
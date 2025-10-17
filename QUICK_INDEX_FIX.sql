-- Quick fix for slow project loading
-- Copy and paste this into Supabase SQL Editor and click "Run"

-- This single index will dramatically speed up project queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Expected result: Query time drops from 2-70 seconds to under 1 second

-- Add index on user_id for faster project queries
-- This will dramatically speed up queries like: SELECT * FROM projects WHERE user_id = ?

-- Check if index already exists before creating
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'projects'
        AND indexname = 'idx_projects_user_id'
    ) THEN
        CREATE INDEX idx_projects_user_id ON projects(user_id);
        RAISE NOTICE 'Created index idx_projects_user_id';
    ELSE
        RAISE NOTICE 'Index idx_projects_user_id already exists';
    END IF;
END
$$;

-- Also add composite index for user_id + created_at for faster sorting
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'projects'
        AND indexname = 'idx_projects_user_created'
    ) THEN
        CREATE INDEX idx_projects_user_created ON projects(user_id, created_at DESC);
        RAISE NOTICE 'Created index idx_projects_user_created';
    ELSE
        RAISE NOTICE 'Index idx_projects_user_created already exists';
    END IF;
END
$$;

-- Add index on created_at for general sorting
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'projects'
        AND indexname = 'idx_projects_created_at'
    ) THEN
        CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
        RAISE NOTICE 'Created index idx_projects_created_at';
    ELSE
        RAISE NOTICE 'Index idx_projects_created_at already exists';
    END IF;
END
$$;

-- Analyze the table to update statistics for query planner
ANALYZE projects;

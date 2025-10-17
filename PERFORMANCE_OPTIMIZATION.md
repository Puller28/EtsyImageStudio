# Performance Optimization Guide

## Current Issue: Slow Project Loading (69 seconds)

### Problem
Projects are taking **69 seconds** to load for just 9 projects. This is unacceptably slow.

### Root Cause
The database query is slow because:
1. **Missing Database Index** - No index on `user_id` column means full table scan
2. **Large Image Data** - Even though the query excludes image columns, the table has large JSONB/TEXT columns
3. **Database Performance** - Supabase free tier can be slow under load

### Solution

#### 1. Add Database Indexes (CRITICAL) ⚡

Run the migration to add indexes:

```powershell
.\scripts\run-migration.ps1
```

Or manually run this SQL in Supabase SQL Editor:

```sql
-- Add index on user_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Add composite index for user_id + created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_projects_user_created ON projects(user_id, created_at DESC);

-- Add index on created_at for general sorting
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Update statistics
ANALYZE projects;
```

**Expected Impact**: 50-100x faster queries (69s → <1s)

#### 2. Query Optimization (DONE) ✅

The query is already optimized to only fetch lightweight fields:
- ✅ Excludes large image columns (`original_image_url`, `upscaled_image_url`, etc.)
- ✅ Limits to 20 most recent projects
- ✅ Uses proper ordering

#### 3. Caching (DONE) ✅

- ✅ 30-second cache for project lists
- ✅ In-memory storage for fast access
- ✅ Automatic cache invalidation

### Performance Monitoring

The system now logs detailed timing:

```
⚠️ Slow database connection: 2000ms
⚠️ Slow query: 3000ms
🐌 VERY SLOW QUERY: 69000ms - Consider adding database index on user_id
```

### Expected Performance After Index

| Metric | Before | After |
|--------|--------|-------|
| Project list query | 69s | <1s |
| Database connection | Variable | <100ms |
| Total load time | 69s | <2s |

### Additional Optimizations

#### Short Term
1. **Run the migration** to add indexes (highest priority!)
2. **Monitor** query times with new diagnostics
3. **Consider** upgrading Supabase tier if still slow

#### Long Term
1. **Pagination** - Load 10 projects at a time instead of 20
2. **Virtual Scrolling** - Only render visible projects
3. **Separate Tables** - Move large image data to separate table
4. **CDN** - Serve thumbnails from CDN instead of database
5. **Redis Cache** - Add Redis for faster caching

### How to Run Migration

#### Option 1: PowerShell Script (Recommended)
```powershell
.\scripts\run-migration.ps1
```

#### Option 2: Supabase Dashboard
1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Open `migrations/add_user_id_index.sql`
4. Copy and paste the SQL
5. Click **Run**

#### Option 3: Command Line (if psql installed)
```bash
psql $DATABASE_URL -f migrations/add_user_id_index.sql
```

### Verification

After running the migration, check that indexes were created:

```sql
-- List all indexes on projects table
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'projects';
```

You should see:
- `idx_projects_user_id`
- `idx_projects_user_created`
- `idx_projects_created_at`

### Monitoring

Watch the logs for improvements:
```
Before: ⚡ Retrieved 9 projects (lightweight) in 68997ms
After:  ⚡ Retrieved 9 projects (lightweight) in 234ms
```

### Troubleshooting

If still slow after adding indexes:

1. **Check Index Usage**
   ```sql
   EXPLAIN ANALYZE 
   SELECT id, user_id, title, status 
   FROM projects 
   WHERE user_id = 'your-user-id' 
   ORDER BY created_at DESC 
   LIMIT 20;
   ```
   Should show "Index Scan" not "Seq Scan"

2. **Check Database Stats**
   ```sql
   SELECT schemaname, tablename, 
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
   FROM pg_tables 
   WHERE tablename = 'projects';
   ```

3. **Vacuum and Analyze**
   ```sql
   VACUUM ANALYZE projects;
   ```

4. **Consider Upgrading** Supabase tier for better performance

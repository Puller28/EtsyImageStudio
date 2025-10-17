# Run database migration to add indexes
# This will significantly speed up project queries

Write-Host "🔧 Running database migration to add indexes..." -ForegroundColor Cyan

# Load environment variables
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

$DATABASE_URL = $env:DATABASE_URL

if (-not $DATABASE_URL) {
    Write-Host "❌ DATABASE_URL not found in environment" -ForegroundColor Red
    exit 1
}

Write-Host "📊 Connecting to database..." -ForegroundColor Yellow

# Extract connection details from DATABASE_URL
# Format: postgres://user:password@host:port/database
if ($DATABASE_URL -match 'postgres://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
    $user = $matches[1]
    $password = $matches[2]
    $host = $matches[3]
    $port = $matches[4]
    $database = $matches[5]
    
    Write-Host "Host: $host" -ForegroundColor Gray
    Write-Host "Database: $database" -ForegroundColor Gray
    
    # Run migration using psql (requires PostgreSQL client tools)
    $migrationFile = "migrations\add_user_id_index.sql"
    
    if (Test-Path $migrationFile) {
        Write-Host "📝 Running migration: $migrationFile" -ForegroundColor Yellow
        
        # Set PGPASSWORD environment variable for psql
        $env:PGPASSWORD = $password
        
        # Run psql command
        $result = psql -h $host -p $port -U $user -d $database -f $migrationFile 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
            Write-Host $result
        } else {
            Write-Host "❌ Migration failed!" -ForegroundColor Red
            Write-Host $result
            
            Write-Host "`n💡 Alternative: Run this SQL manually in Supabase SQL Editor:" -ForegroundColor Cyan
            Write-Host "   1. Go to your Supabase project dashboard" -ForegroundColor Gray
            Write-Host "   2. Navigate to SQL Editor" -ForegroundColor Gray
            Write-Host "   3. Copy and paste the contents of: $migrationFile" -ForegroundColor Gray
            Write-Host "   4. Click 'Run'" -ForegroundColor Gray
        }
        
        # Clear password
        Remove-Item Env:\PGPASSWORD
    } else {
        Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Invalid DATABASE_URL format" -ForegroundColor Red
    Write-Host "💡 Run the migration manually in Supabase SQL Editor" -ForegroundColor Cyan
}

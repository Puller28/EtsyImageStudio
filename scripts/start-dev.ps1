$envFile = Join-Path (Get-Location) '.env'
if (-not (Test-Path $envFile)) {
    Write-Error "Missing .env file at $envFile"
    exit 1
}

Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_.Trim() -eq '') { return }
    $parts = $_ -split '=', 2
    if ($parts.Length -eq 2) {
        Set-Item -Path ("Env:" + $parts[0]) -Value $parts[1]
    }
}

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Error 'npx is not available in PATH.'
    exit 1
}

npx tsx server/index.ts

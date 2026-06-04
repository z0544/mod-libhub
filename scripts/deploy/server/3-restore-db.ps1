<#
.SYNOPSIS  Creates the modlibhub database (if missing) and restores the data dump.
#>
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\config.ps1"

if (-not (Test-PgReady)) { throw "PostgreSQL is not running. Run 1-setup-postgres.ps1 first." }

$env:PGPASSWORD = $DbPassword

# 1. Create database if it does not exist ----------------------------------
Write-Step "Ensuring database '$DbName' exists"
$exists = & "$PgBin\psql.exe" -h localhost -p $DbPort -U $DbUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName'"
if ($exists -ne "1") {
  & "$PgBin\createdb.exe" -h localhost -p $DbPort -U $DbUser $DbName
  if ($LASTEXITCODE -ne 0) { throw "createdb failed" }
  Write-Ok "Database created"
} else {
  Write-Ok "Database already exists"
}

# 2. Restore the dump ------------------------------------------------------
$dump = Join-Path $ReleaseRoot "data\modlibhub.sql"
if (-not (Test-Path $dump)) { throw "Dump not found: $dump" }
Write-Step "Restoring data from $dump"
& "$PgBin\psql.exe" -h localhost -p $DbPort -U $DbUser -d $DbName -v ON_ERROR_STOP=0 -f $dump | Out-Null
Write-Ok "Restore complete"

# 3. Verify ----------------------------------------------------------------
$cats  = & "$PgBin\psql.exe" -h localhost -p $DbPort -U $DbUser -d $DbName -tAc "SELECT count(*) FROM categories"
$items = & "$PgBin\psql.exe" -h localhost -p $DbPort -U $DbUser -d $DbName -tAc "SELECT count(*) FROM items"
$vers  = & "$PgBin\psql.exe" -h localhost -p $DbPort -U $DbUser -d $DbName -tAc "SELECT count(*) FROM item_versions"
Write-Host ""
Write-Host "VERIFY (row counts):" -ForegroundColor Gray
Write-Host "  categories=$cats  items=$items  item_versions=$vers" -ForegroundColor Gray

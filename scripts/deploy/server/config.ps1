# Shared configuration for ModLibHub server scripts.
# Dot-source this file:  . "$PSScriptRoot\config.ps1"
# Override the base folder by setting the MODLIBHUB_ROOT environment variable.

$script:ModRoot = if ($env:MODLIBHUB_ROOT) { $env:MODLIBHUB_ROOT } else { "D:\modlibhub" }

$script:PgRoot   = Join-Path $ModRoot "pgsql"     # PostgreSQL binaries (contains \bin)
$script:PgBin    = Join-Path $PgRoot  "bin"
$script:PgData   = Join-Path $ModRoot "pgdata"    # PostgreSQL data directory
$script:Uploads  = Join-Path $ModRoot "uploads"   # Uploaded files (UPLOAD_DIR)
$script:AppDir   = Join-Path $ModRoot "app"       # Application (api, web, node_modules)
$script:Logs     = Join-Path $ModRoot "logs"      # Log files

# Database settings
$script:DbName     = "modlibhub"
$script:DbUser     = "postgres"
$script:DbPassword = "postgres"
$script:DbPort     = 5432

# Application
$script:AppPort = 4000

# The release folder = parent of this scripts folder (release\scripts\config.ps1)
$script:ReleaseRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Write-Step($msg)  { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn2($msg) { Write-Host "  [!] $msg"  -ForegroundColor Yellow }

function Test-PgReady {
  & "$PgBin\pg_isready.exe" -h localhost -p $DbPort | Out-Null
  return ($LASTEXITCODE -eq 0)
}

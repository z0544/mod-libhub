<#
.SYNOPSIS
  Builds an offline deployment bundle of ModLibHub.

.DESCRIPTION
  Run this on a BUILD machine that HAS internet access and a working copy of the
  project (with node_modules installed and the database seeded). It produces a
  self-contained "release" folder that you copy to the offline internal server.

  The release contains:
    app\        - compiled API (dist), built website (web), node_modules, prisma
    data\modlibhub.sql - full database dump (schema + data)
    data\uploads\      - all uploaded software/library files
    scripts\           - the server-side deployment scripts

.PARAMETER OutDir
  Where to write the release. Default: <repo>\INSTALLS\release

.PARAMETER PgBin
  PostgreSQL bin folder (for pg_dump). Default: %USERPROFILE%\pg18\pgsql\bin

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\deploy\package-release.ps1
#>
param(
  [string]$OutDir,
  [string]$PgBin = "$env:USERPROFILE\pg18\pgsql\bin",
  [string]$DbUser = "postgres",
  [string]$DbPassword = "postgres",
  [int]$DbPort = 5432,
  [string]$DbName = "libhub"
)

$ErrorActionPreference = "Stop"
$repo = (Resolve-Path "$PSScriptRoot\..\..").Path
if (-not $OutDir) { $OutDir = Join-Path $repo "INSTALLS\release" }

Write-Host "== ModLibHub release packaging ==" -ForegroundColor Cyan
Write-Host "Repo:   $repo"
Write-Host "Output: $OutDir"

# 1. Install deps + build + generate client -------------------------------
Push-Location $repo
try {
  Write-Host "`n[1/6] Installing dependencies..." -ForegroundColor Yellow
  npm install
  Write-Host "`n[2/6] Building API + Web..." -ForegroundColor Yellow
  npm run build
  Write-Host "`n[3/6] Generating Prisma client..." -ForegroundColor Yellow
  npm run db:generate
} finally {
  Pop-Location
}

# 2. Prepare output layout -------------------------------------------------
Write-Host "`n[4/6] Staging files..." -ForegroundColor Yellow
if (Test-Path $OutDir) { Remove-Item $OutDir -Recurse -Force }
$appDir  = Join-Path $OutDir "app"
$dataDir = Join-Path $OutDir "data"
New-Item -ItemType Directory -Force -Path $appDir, $dataDir, "$appDir\api" | Out-Null

# robocopy returns non-zero exit codes for success; wrap it.
function Copy-Tree($src, $dst) {
  robocopy $src $dst /E /NFL /NDL /NJH /NJS /NP /MT:16 | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($src -> $dst), code $LASTEXITCODE" }
  $global:LASTEXITCODE = 0
}

Copy-Tree "$repo\node_modules"      "$appDir\node_modules"
Copy-Tree "$repo\apps\api\dist"     "$appDir\api\dist"
Copy-Tree "$repo\apps\api\prisma"   "$appDir\api\prisma"
Copy-Item "$repo\apps\api\package.json" "$appDir\api\package.json" -Force
Copy-Item "$repo\apps\api\.env.production.example" "$appDir\api\.env.example" -Force
Copy-Tree "$repo\apps\web\dist"     "$appDir\web"
Copy-Tree "$repo\scripts\deploy\server" "$OutDir\scripts"

# uploaded files
if (Test-Path "$repo\apps\api\uploads") {
  Copy-Tree "$repo\apps\api\uploads" "$dataDir\uploads"
} else {
  New-Item -ItemType Directory -Force -Path "$dataDir\uploads" | Out-Null
}

# 3. Database dump ---------------------------------------------------------
Write-Host "`n[5/6] Dumping database '$DbName'..." -ForegroundColor Yellow
$env:PGPASSWORD = $DbPassword
& "$PgBin\pg_dump.exe" -h localhost -p $DbPort -U $DbUser -d $DbName `
  --no-owner --no-privileges --clean --if-exists -f "$dataDir\modlibhub.sql"
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed" }

# 4. Done ------------------------------------------------------------------
Write-Host "`n[6/6] Done." -ForegroundColor Green
Write-Host "Release ready at: $OutDir" -ForegroundColor Green
Write-Host "Copy the whole 'release' folder to the offline server and follow DEPLOYMENT.md."

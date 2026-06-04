<#
.SYNOPSIS  Extracts the portable PostgreSQL binaries, initializes the data dir and starts the server.
.PARAMETER PgZip  Path to the PostgreSQL portable binaries zip (from INSTALLS\software).
#>
param(
  [string]$PgZip
)
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\config.ps1"

Write-Step "Setting up PostgreSQL under $ModRoot"
New-Item -ItemType Directory -Force -Path $ModRoot, $Logs, $Uploads | Out-Null

# 1. Extract binaries (if not already present) -----------------------------
if (-not (Test-Path "$PgBin\postgres.exe")) {
  if (-not $PgZip) {
    # Try to auto-locate in ..\..\software next to the release
    $guess = Get-ChildItem (Join-Path $ReleaseRoot "..\software") -Filter "postgresql*.zip" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($guess) { $PgZip = $guess.FullName }
  }
  if (-not $PgZip -or -not (Test-Path $PgZip)) {
    throw "PostgreSQL zip not found. Pass -PgZip <path to postgresql-*-portable.zip>."
  }
  Write-Step "Extracting $PgZip ..."
  $tmp = Join-Path $env:TEMP ("pgx-" + [guid]::NewGuid().ToString("N"))
  Expand-Archive -Path $PgZip -DestinationPath $tmp -Force
  # The zip contains a top-level 'pgsql' folder.
  $inner = Join-Path $tmp "pgsql"
  if (-not (Test-Path $inner)) { $inner = (Get-ChildItem $tmp -Directory | Select-Object -First 1).FullName }
  Move-Item $inner $PgRoot -Force
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
  Write-Ok "Binaries installed at $PgRoot"
} else {
  Write-Ok "PostgreSQL binaries already present"
}

# 2. Initialize the data directory (if empty) ------------------------------
if (-not (Test-Path "$PgData\postgresql.conf")) {
  Write-Step "Initializing data directory $PgData"
  $pw = Join-Path $env:TEMP "pgpw.txt"
  Set-Content -Path $pw -Value $DbPassword -NoNewline -Encoding ascii
  & "$PgBin\initdb.exe" -D $PgData -U $DbUser -A scram-sha-256 --pwfile=$pw -E UTF8
  Remove-Item $pw -Force
  if ($LASTEXITCODE -ne 0) { throw "initdb failed" }
  Write-Ok "Data directory initialized"
} else {
  Write-Ok "Data directory already initialized"
}

# 3. Start the server ------------------------------------------------------
if (-not (Test-PgReady)) {
  Write-Step "Starting PostgreSQL on port $DbPort"
  & "$PgBin\pg_ctl.exe" -D $PgData -l "$Logs\postgres.log" -o "-p $DbPort" start | Out-Null
  Start-Sleep -Seconds 3
}

# 4. Verify ----------------------------------------------------------------
if (Test-PgReady) {
  Write-Ok "PostgreSQL is accepting connections on port $DbPort"
  Write-Host ""
  Write-Host "VERIFY:  `"$PgBin\pg_isready.exe`" -p $DbPort   (expect: accepting connections)" -ForegroundColor Gray
} else {
  throw "PostgreSQL did not start. Check $Logs\postgres.log"
}

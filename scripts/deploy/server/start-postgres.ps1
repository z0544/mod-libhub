<# Starts the PostgreSQL server if it is not already running. #>
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\config.ps1"

if (Test-PgReady) {
  Write-Ok "PostgreSQL already running on port $DbPort"
  return
}
Write-Step "Starting PostgreSQL"
New-Item -ItemType Directory -Force -Path $Logs | Out-Null
& "$PgBin\pg_ctl.exe" -D $PgData -l "$Logs\postgres.log" -o "-p $DbPort" start | Out-Null
Start-Sleep -Seconds 3
if (Test-PgReady) { Write-Ok "PostgreSQL is up" } else { throw "Failed to start PostgreSQL (see $Logs\postgres.log)" }

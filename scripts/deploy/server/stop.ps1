<# Stops the ModLibHub app (and optionally PostgreSQL with -IncludeDb). #>
param([switch]$IncludeDb)
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\config.ps1"

$pidFile = Join-Path $ModRoot "app.pid"
if (Test-Path $pidFile) {
  $appPid = Get-Content $pidFile
  if (Get-Process -Id $appPid -ErrorAction SilentlyContinue) {
    Stop-Process -Id $appPid -Force
    Write-Ok "App stopped (PID $appPid)"
  }
  Remove-Item $pidFile -Force
} else {
  Write-Warn2 "No app.pid found"
}

if ($IncludeDb) { & "$PSScriptRoot\stop-postgres.ps1" }

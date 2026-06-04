<# Stops the PostgreSQL server. #>
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\config.ps1"
Write-Step "Stopping PostgreSQL"
& "$PgBin\pg_ctl.exe" -D $PgData stop -m fast | Out-Null
Write-Ok "Stopped"

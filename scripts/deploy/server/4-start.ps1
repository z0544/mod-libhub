<#
.SYNOPSIS  Starts the whole stack: PostgreSQL (if down) + the ModLibHub Node app.
           The app serves BOTH the API and the website on http://localhost:<PORT>.
#>
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\config.ps1"

# 1. Database --------------------------------------------------------------
& "$PSScriptRoot\start-postgres.ps1"

# 2. Application -----------------------------------------------------------
$apiDir  = Join-Path $AppDir "api"
$pidFile = Join-Path $ModRoot "app.pid"
New-Item -ItemType Directory -Force -Path $Logs | Out-Null

# Already running?
if (Test-Path $pidFile) {
  $oldPid = Get-Content $pidFile
  if (Get-Process -Id $oldPid -ErrorAction SilentlyContinue) {
    Write-Ok "App already running (PID $oldPid)"
    return
  }
}

Write-Step "Starting ModLibHub app"
$node = (Get-Command node -ErrorAction Stop).Source
$proc = Start-Process -FilePath $node -ArgumentList "dist\index.js" `
  -WorkingDirectory $apiDir `
  -RedirectStandardOutput "$Logs\app.out.log" `
  -RedirectStandardError  "$Logs\app.err.log" `
  -WindowStyle Hidden -PassThru
$proc.Id | Set-Content $pidFile
Start-Sleep -Seconds 3

# 3. Verify ----------------------------------------------------------------
try {
  $health = Invoke-RestMethod "http://localhost:$AppPort/api/health" -TimeoutSec 10
  Write-Ok "App is healthy (status=$($health.status)), PID $($proc.Id)"
  Write-Host ""
  Write-Host "Open the site at:  http://localhost:$AppPort" -ForegroundColor Green
  Write-Host "VERIFY:  Invoke-RestMethod http://localhost:$AppPort/api/health   (expect status=ok)" -ForegroundColor Gray
} catch {
  Write-Warn2 "Health check failed - inspect $Logs\app.err.log"
  throw
}

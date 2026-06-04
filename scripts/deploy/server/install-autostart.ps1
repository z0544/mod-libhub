<#
.SYNOPSIS  Registers a Scheduled Task that starts ModLibHub automatically at system boot.
.NOTES     Run this in an ELEVATED (Administrator) PowerShell.
#>
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\config.ps1"

$taskName = "ModLibHub"
$startScript = Join-Path $PSScriptRoot "4-start.ps1"

Write-Step "Registering scheduled task '$taskName' (runs at startup)"

$action  = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
  -Principal $principal -Settings $settings -Force | Out-Null

Write-Ok "Task '$taskName' registered."
Write-Host ""
Write-Host "VERIFY:  Get-ScheduledTask -TaskName ModLibHub | Select State" -ForegroundColor Gray
Write-Host "Run now: Start-ScheduledTask -TaskName ModLibHub" -ForegroundColor Gray
Write-Host "Remove:  Unregister-ScheduledTask -TaskName ModLibHub -Confirm:`$false" -ForegroundColor Gray

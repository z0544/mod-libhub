<#
.SYNOPSIS  Copies the application and uploaded files into place and prepares the .env file.
#>
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\config.ps1"

function Copy-Tree($src, $dst) {
  robocopy $src $dst /E /NFL /NDL /NJH /NJS /NP /MT:16 | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($src -> $dst), code $LASTEXITCODE" }
  $global:LASTEXITCODE = 0
}

Write-Step "Deploying application to $AppDir"
New-Item -ItemType Directory -Force -Path $AppDir, $Uploads | Out-Null

# 1. Copy app (node_modules, api, web) -------------------------------------
Copy-Tree (Join-Path $ReleaseRoot "app") $AppDir
Write-Ok "Application files copied"

# 2. Copy uploaded files ---------------------------------------------------
$srcUploads = Join-Path $ReleaseRoot "data\uploads"
if (Test-Path $srcUploads) {
  Copy-Tree $srcUploads $Uploads
  Write-Ok "Uploaded files copied to $Uploads"
}

# 3. Create .env from the template if it does not exist --------------------
$envFile = Join-Path $AppDir "api\.env"
$envExample = Join-Path $AppDir "api\.env.example"
if (-not (Test-Path $envFile)) {
  Copy-Item $envExample $envFile -Force
  Write-Warn2 "Created $envFile from template - REVIEW IT (set JWT_SECRET, paths, DB password)."
} else {
  Write-Ok ".env already exists (left unchanged)"
}

$fileCount = (Get-ChildItem $Uploads -File -ErrorAction SilentlyContinue | Measure-Object).Count
Write-Host ""
Write-Host "VERIFY:" -ForegroundColor Gray
Write-Host "  - App present:    Test-Path `"$AppDir\api\dist\index.js`"   (expect: True)" -ForegroundColor Gray
Write-Host "  - node_modules:   Test-Path `"$AppDir\node_modules`"        (expect: True)" -ForegroundColor Gray
Write-Host "  - Uploads count:  $fileCount files in $Uploads" -ForegroundColor Gray
Write-Host "  - Edit env:       notepad `"$envFile`"" -ForegroundColor Gray

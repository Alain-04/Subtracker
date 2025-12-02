# SubTrack Server Startup Script
# Double-click this file or run: powershell -ExecutionPolicy Bypass -File START_SERVER.ps1

# Navigate to project directory
$projectPath = "C:\Users\Alain\OneDrive - University of Saint Joseph\Desktop\webnov11"
Set-Location $projectPath

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SubTrack Server Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Project Directory: $projectPath" -ForegroundColor Green
Write-Host "Starting server..." -ForegroundColor Yellow
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Start the server
npm start

# Keep window open if there's an error
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Server failed to start. Press any key to exit..." -ForegroundColor Red
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}


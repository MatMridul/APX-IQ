# APX-IQ Demo Reset & Run Script
# Clears previous demo data and runs a fresh demo

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         APX-IQ DEMO RESET & RUN                              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Clear previous demo data
Write-Host "`n🗑️  Clearing previous demo data..." -ForegroundColor Yellow
$response = curl http://localhost:8000/telemetry/laps/completed -s | ConvertFrom-Json
$lapCount = $response.Count
if ($lapCount -gt 0) {
    curl http://localhost:8000/reports/clear -s -X DELETE | Out-Null
    Write-Host "✅ Cleared $lapCount laps and reports" -ForegroundColor Green
} else {
    Write-Host "✅ No previous data to clear" -ForegroundColor Green
}

# Verify services are running
Write-Host "`n🔍 Verifying services..." -ForegroundColor Yellow
$apiHealth = curl http://localhost:8000/health -s 2>$null
if ($apiHealth) {
    Write-Host "✅ API Server: Running" -ForegroundColor Green
} else {
    Write-Host "❌ API Server: Not responding" -ForegroundColor Red
    exit 1
}

$frontendCheck = curl http://localhost:3000 -s 2>$null
if ($frontendCheck) {
    Write-Host "✅ Frontend: Running" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend: Not responding" -ForegroundColor Red
    exit 1
}

# Run demo
Write-Host "`n🏎️  Starting demo race..." -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
python demo_race.py
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

# Verify laps were saved
Write-Host "`n📊 Verifying saved laps..." -ForegroundColor Yellow
$laps = curl http://localhost:8000/telemetry/laps/completed -s | ConvertFrom-Json
$lapCount = $laps.Count
Write-Host "✅ $lapCount laps saved successfully!" -ForegroundColor Green

Write-Host "`n🎥 Ready for video recording!" -ForegroundColor Cyan
Write-Host "   Dashboard: http://localhost:3000" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

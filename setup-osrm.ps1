# PowerShell script to prepare OSRM data using Docker volume
# This runs automatically integrated with docker-compose

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OSRM Data Preparation for Russia" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if data already prepared by inspecting the volume
Write-Host "Checking existing data..." -ForegroundColor Yellow
$checkResult = docker run --rm -v footpath-backend-monolith_osrm_data:/data alpine ls /data/russia-latest.osrm.hsgr 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ OSRM data already prepared!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To re-download, run:" -ForegroundColor Yellow
    Write-Host "  docker-compose down -v" -ForegroundColor White
    Write-Host "  Then run this script again" -ForegroundColor White
    exit 0
}

Write-Host "⚠ OSRM data not found, will prepare now..." -ForegroundColor Yellow
Write-Host ""

# Download OSM data (Russia only, ~3.5GB)
Write-Host "Downloading Russia OSM data (~3.5GB)..." -ForegroundColor Yellow
Write-Host "This may take 10 to 30 minutes depending on connection" -ForegroundColor Yellow
Write-Host ""

$tempFile = "$env:TEMP\russia-latest.osm.pbf"

try {
    Invoke-WebRequest -Uri "https://download.geofabrik.de/russia-latest.osm.pbf" `
        -OutFile $tempFile `
        -UseBasicParsing
    Write-Host "✓ Download complete!" -ForegroundColor Green
} catch {
    Write-Host "Failed to download Russia map, trying Moscow region fallback..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://download.geofabrik.de/russia/central-fed-district-latest.osm.pbf" `
        -OutFile $tempFile `
        -UseBasicParsing
    Write-Host "✓ Download complete (Moscow region - limited coverage)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Copying to Docker volume..." -ForegroundColor Yellow
docker run --rm -v footpath-backend-monolith_osrm_data:/data -v "${env:TEMP}:/temp" alpine cp /temp/russia-latest.osm.pbf /data/russia-latest.osm.pbf
Write-Host "✓ Copy complete" -ForegroundColor Green

# Process OSRM data
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Processing map data (20 to 40 minutes)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1/3: Extracting (10 to 15 min)..." -ForegroundColor Yellow
docker run --rm -t -v footpath-backend-monolith_osrm_data:/data `
    osrm/osrm-backend:latest `
    osrm-extract -p /opt/foot.lua /data/russia-latest.osm.pbf
Write-Host "✓ Extract complete" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2/3: Partitioning (5 to 10 min)..." -ForegroundColor Yellow
docker run --rm -t -v footpath-backend-monolith_osrm_data:/data `
    osrm/osrm-backend:latest `
    osrm-partition /data/russia-latest.osrm
Write-Host "✓ Partition complete" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3/3: Customizing (5 to 10 min)..." -ForegroundColor Yellow
docker run --rm -t -v footpath-backend-monolith_osrm_data:/data `
    osrm/osrm-backend:latest `
    osrm-customize /data/russia-latest.osrm
Write-Host "✓ Customize complete" -ForegroundColor Green

# Clean up
Write-Host ""
Write-Host "Cleaning up..." -ForegroundColor Yellow
Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
docker run --rm -v footpath-backend-monolith_osrm_data:/data alpine rm -f /data/russia-latest.osm.pbf
Write-Host "✓ Cleanup complete" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "OSRM data preparation complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "You can now start the services with:" -ForegroundColor Cyan
Write-Host "  docker-compose up -d" -ForegroundColor White
Write-Host ""

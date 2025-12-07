@echo off
REM Setup OSRM data for Russia

echo ========================================
echo OSRM Data Preparation
echo ========================================
echo.

REM Check if data exists
echo Checking existing data...
docker run --rm -v footpath-backend-monolith_osrm_data:/data alpine ls /data/russia-latest.osrm.hsgr >nul 2>&1
if %errorlevel%==0 (
    echo Data already exists! Skipping.
    echo To re-download: docker-compose down -v
    exit /b 0
)

echo Data not found, will prepare now...
echo.

REM Download
echo Downloading Russia OSM data (3.5GB, 10-30 minutes)...
powershell -Command "Invoke-WebRequest -Uri 'https://download.geofabrik.de/russia-latest.osm.pbf' -OutFile '%TEMP%\russia-latest.osm.pbf'"
if %errorlevel% neq 0 (
    echo Download failed! Check internet connection.
    exit /b 1
)

echo Copying to Docker volume...
docker run --rm -v footpath-backend-monolith_osrm_data:/data -v %TEMP%:/temp alpine cp /temp/russia-latest.osm.pbf /data/russia-latest.osm.pbf

REM Process
echo.
echo ========================================
echo Processing (20-40 minutes total)
echo ========================================
echo.

echo Step 1/3: Extract (10-15 min)...
docker run --rm -t -v footpath-backend-monolith_osrm_data:/data osrm/osrm-backend:latest osrm-extract -p /opt/foot.lua /data/russia-latest.osm.pbf
echo Done!
echo.

echo Step 2/3: Partition (5-10 min)...
docker run --rm -t -v footpath-backend-monolith_osrm_data:/data osrm/osrm-backend:latest osrm-partition /data/russia-latest.osrm
echo Done!
echo.

echo Step 3/3: Customize (5-10 min)...
docker run --rm -t -v footpath-backend-monolith_osrm_data:/data osrm/osrm-backend:latest osrm-customize /data/russia-latest.osrm
echo Done!

REM Cleanup
echo.
echo Cleaning up...
del /q %TEMP%\russia-latest.osm.pbf
docker run --rm -v footpath-backend-monolith_osrm_data:/data alpine rm -f /data/russia-latest.osm.pbf

echo.
echo ========================================
echo OSRM data ready!
echo Start services: docker-compose up -d
echo ========================================

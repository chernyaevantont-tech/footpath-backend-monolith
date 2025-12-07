@echo off
echo Rebuilding OSRM container...
docker-compose build osrm
echo.
echo Starting OSRM service...
docker-compose up -d osrm
echo.
echo Checking logs...
timeout /t 3 /nobreak >nul
docker-compose logs osrm --tail=20
pause

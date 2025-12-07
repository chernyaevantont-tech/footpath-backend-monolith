@echo off
echo Checking OSRM volume contents...
docker run --rm -v footpath-backend-monolith_osrm_data:/data alpine ls -lah /data/
pause

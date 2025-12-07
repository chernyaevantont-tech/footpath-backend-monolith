#!/bin/bash
set -e

VOLUME_NAME="footpath-backend-monolith_osrm_data"

echo "========================================"
echo "OSRM Data Preparation for Russia"
echo "========================================"
echo ""

# Check if data already exists
echo "Checking existing data..."
if docker run --rm -v ${VOLUME_NAME}:/data alpine ls /data/russia-latest.osrm.mldgr >/dev/null 2>&1; then
    echo "✓ OSRM data already prepared!"
    echo ""
    echo "To re-download, run:"
    echo "  docker-compose down -v"
    echo "  Then run this script again"
    exit 0
fi

echo "⚠ OSRM data not found, will prepare now..."
echo ""

# Download
echo "Downloading Russia OSM data (~3.5GB, 10-30 minutes)..."
TEMP_FILE="/tmp/russia-latest.osm.pbf"
wget -O "$TEMP_FILE" https://download.geofabrik.de/russia-latest.osm.pbf || {
    echo "Download failed! Trying curl..."
    curl -L -o "$TEMP_FILE" https://download.geofabrik.de/russia-latest.osm.pbf
}

echo "Copying to Docker volume..."
docker run --rm -v ${VOLUME_NAME}:/data -v /tmp:/temp alpine cp /temp/russia-latest.osm.pbf /data/russia-latest.osm.pbf

# Process
echo ""
echo "========================================"
echo "Processing (20-40 minutes total)"
echo "========================================"
echo ""

echo "Step 1/3: Extract (10-15 min)..."
docker run --rm -t -v ${VOLUME_NAME}:/data osrm/osrm-backend:latest osrm-extract -p /opt/foot.lua /data/russia-latest.osm.pbf
echo "Done!"
echo ""

echo "Step 2/3: Partition (5-10 min)..."
docker run --rm -t -v ${VOLUME_NAME}:/data osrm/osrm-backend:latest osrm-partition /data/russia-latest.osrm
echo "Done!"
echo ""

echo "Step 3/3: Customize (5-10 min)..."
docker run --rm -t -v ${VOLUME_NAME}:/data osrm/osrm-backend:latest osrm-customize /data/russia-latest.osrm
echo "Done!"
echo ""

# Cleanup
echo "Cleaning up..."
rm -f "$TEMP_FILE"
docker run --rm -v ${VOLUME_NAME}:/data alpine rm -f /data/russia-latest.osm.pbf
echo ""

echo "========================================"
echo "✓ OSRM data ready!"
echo "Start services: docker-compose up -d"
echo "========================================"

echo "OSRM data preparation complete!"
echo "You can now start the services with: docker-compose up -d"

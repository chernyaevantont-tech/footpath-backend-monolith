#!/bin/bash
set -e

OSRM_FILE="/data/russia-latest.osrm"
OSM_FILE="/data/russia-latest.osm.pbf"
DOWNLOAD_URL="https://download.geofabrik.de/russia-latest.osm.pbf"

echo "=========================================="
echo "OSRM Data Preparation"
echo "=========================================="

# Check if already prepared
if [ -f "${OSRM_FILE}.hsgr" ]; then
    echo "✓ OSRM data already prepared!"
    echo "Delete volume to re-download: docker-compose down -v"
    exit 0
fi

# Download OSM data
if [ ! -f "${OSM_FILE}" ]; then
    echo "Downloading Russia OSM data..."
    echo "URL: ${DOWNLOAD_URL}"
    echo "Size: ~3.5GB"
    echo "This may take 10-30 minutes depending on connection"
    echo ""
    
    # Try multiple download methods
    if command -v wget &> /dev/null; then
        echo "Using wget..."
        wget -O "${OSM_FILE}" "${DOWNLOAD_URL}"
    elif command -v curl &> /dev/null; then
        echo "Using curl..."
        curl -L -o "${OSM_FILE}" "${DOWNLOAD_URL}"
    else
        echo "❌ Neither wget nor curl found!"
        echo "Please install one and try again."
        exit 1
    fi
    
    echo "✓ Download complete"
else
    echo "✓ OSM file already downloaded"
fi

echo ""
echo "=========================================="
echo "Processing map data..."
echo "This will take 20-40 minutes"
echo "=========================================="

echo "Step 1/3: Extracting (10-15 min)..."
osrm-extract -p /opt/foot.lua "${OSM_FILE}"
echo "✓ Extract complete"

echo ""
echo "Step 2/3: Partitioning (5-10 min)..."
osrm-partition "${OSRM_FILE}"
echo "✓ Partition complete"

echo ""
echo "Step 3/3: Customizing (5-10 min)..."
osrm-customize "${OSRM_FILE}"
echo "✓ Customize complete"

echo ""
echo "Cleaning up OSM file to save space..."
rm -f "${OSM_FILE}"
echo "✓ Cleanup complete"

echo ""
echo "=========================================="
echo "✓ OSRM data preparation complete!"
echo "You can now start the OSRM service:"
echo "  docker-compose up -d osrm"
echo "=========================================="

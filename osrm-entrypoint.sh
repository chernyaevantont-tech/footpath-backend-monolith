#!/bin/bash
set -e

OSRM_FILE="/data/russia-latest.osrm"

echo "=========================================="
echo "OSRM: Checking data..."
echo "=========================================="

# Check if OSRM data is prepared (MLD algorithm files)
# For MLD algorithm, we need .mldgr file (not .hsgr which is for CH algorithm)
if [ ! -f "${OSRM_FILE}.mldgr" ] || [ ! -f "${OSRM_FILE}.fileIndex" ]; then
    echo "❌ OSRM data not found!"
    echo ""
    echo "Please run data preparation first:"
    echo "  setup-osrm.bat (Windows) or setup-osrm.sh (Linux/Mac)"
    echo ""
    echo "This will download and process Russia OSM data (~3.5GB)"
    echo "It takes 20-40 minutes on the first run."
    exit 1
fi

echo "✓ OSRM data found (MLD algorithm ready)"
echo "Starting OSRM server..."
echo "=========================================="

# Start OSRM server with provided arguments
exec "$@"

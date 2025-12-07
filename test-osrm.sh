#!/bin/bash

echo "Testing OSRM API..."
echo ""

echo "Test 1: Health check"
curl http://localhost:5000/
echo ""
echo ""

echo "Test 2: Route from Moscow center to Kremlin"
curl "http://localhost:5000/route/v1/foot/37.6173,55.7558;37.6176,55.7539?overview=full&geometries=geojson"
echo ""
echo ""

echo "✓ OSRM is ready!"

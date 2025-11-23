#!/bin/bash

# Health check script for FootPath Monolith
# This script can be used for monitoring and health checks

HEALTH_URL="http://localhost:3000/health"
TIMEOUT=10

echo "Checking FootPath Monolith health at $HEALTH_URL"

# Perform health check
response=$(curl -s --max-time $TIMEOUT $HEALTH_URL)
status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT $HEALTH_URL)

if [ $status_code -eq 200 ]; then
    timestamp=$(echo $response | jq -r '.timestamp')
    status=$(echo $response | jq -r '.status')
    
    echo "Health check PASSED"
    echo "Status: $status"
    echo "Timestamp: $timestamp"
    
    # Additional checks could be added here
    
    exit 0
else
    echo "Health check FAILED"
    echo "HTTP Status Code: $status_code"
    
    if [ $status_code -eq 000 ]; then
        echo "Could not connect to service"
    fi
    
    exit 1
fi
#!/bin/bash

# FootPath Monolith Production Setup Script

set -e  # Exit on any error

echo "FootPath Monolith Production Setup Script"
echo "=========================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please create a .env file with the required environment variables."
    echo "Use .env.example as a template."
    exit 1
fi

echo "Environment file found. Loading variables..."

# Load environment variables
export $(grep -v '^#' .env | xargs)

echo "Starting services..."

# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

echo "Waiting for services to be ready..."

# Wait for services to be healthy
sleep 30

# Check if services are running
echo "Checking service status..."
docker-compose -f docker-compose.prod.yml ps

echo "Services started successfully!"

echo ""
echo "Application is now running at: http://localhost:3000"
echo "API Documentation: http://localhost:3000/api/docs"
echo "Health check: http://localhost:3000/health"
echo ""
echo "To view logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "To stop services: docker-compose -f docker-compose.prod.yml down"
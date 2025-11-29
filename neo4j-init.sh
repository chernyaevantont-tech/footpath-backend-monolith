#!/bin/bash
# Neo4j initialization script

# Check if this is the first run (data directory is empty)
if [ ! "$(ls -A /data)" ]; then
  # First run - start Neo4j with initial password
  echo "Initializing Neo4j for the first time"
  NEO4J_AUTH=neo4j/letmein123 neo4j console
else
  # Subsequent runs - start Neo4j with authentication already configured
  echo "Starting Neo4j with existing data"
  # We'll just use the same environment variable, Neo4j will handle existing password
  NEO4J_AUTH=neo4j/letmein123 neo4j console
fi
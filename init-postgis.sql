-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Create pgvector extension if available
CREATE EXTENSION IF NOT EXISTS vector;
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Enable pgvector extension (requires pgvector-compatible image)
CREATE EXTENSION IF NOT EXISTS vector;
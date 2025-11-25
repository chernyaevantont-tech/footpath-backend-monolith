# Deployment Guide for FootPath Monolith

## Overview
This guide provides instructions for deploying the FootPath monolith application in production environments.

## Prerequisites

### System Requirements
- Docker 20.10 or higher
- Docker Compose v2.0 or higher
- At least 4GB RAM available
- At least 2GB free disk space
- Ports 3000 (API), 5432 (PostgreSQL), 7474 (Neo4j), 6379 (Redis) available

### Environment Variables
Create a `.env` file in your project root with the following variables:

```bash
# Application settings
NODE_ENV=production
PORT=3000

# PostgreSQL settings
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=footpath_user
DB_PASSWORD=your_secure_password
DB_NAME=footpath

# Neo4j settings
NEO4J_URI=bolt://neo4j:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_neo4j_password

# Redis settings
REDIS_HOST=redis
REDIS_PORT=6379

# JWT settings
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# Logging
LOG_LEVEL=info

# Default Admin User (these will be used to create a default admin user at startup)
DEFAULT_ADMIN_EMAIL=admin@footpath.com
DEFAULT_ADMIN_PASSWORD=your_secure_admin_password
```

## Production Deployment

### 1. Prepare Your Environment
```bash
# Clone the repository
git clone <repository-url>
cd footpath-backend-monolith

# Create production environment file
cp .env.example .env
# Edit .env with your production values
```

### 2. Build and Deploy
```bash
# Build and start services
docker-compose up -d --build

# Wait for services to be ready
docker-compose logs -f app
```

### 3. Initial Database Setup
```bash
# Run migrations or initial setup if needed
docker-compose exec app npm run migration:run
```

## Docker Compose Configuration

The production-ready `docker-compose.yml` includes:
- Application service with health checks
- PostgreSQL with PostGIS extension
- Neo4j for social graph storage
- Redis for caching and sessions
- Proper resource limits and restart policies

## Environment Configuration

### Production Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment mode | production |
| LOG_LEVEL | Logging level | info |
| JWT_SECRET | JWT signing secret | - (required) |
| JWT_EXPIRES_IN | JWT expiration time | 24h |
| DB_HOST | PostgreSQL host | postgres |
| DB_PORT | PostgreSQL port | 5432 |
| DB_USERNAME | PostgreSQL username | footpath_user |
| DB_PASSWORD | PostgreSQL password | - (required) |
| DB_NAME | PostgreSQL database name | footpath |
| NEO4J_URI | Neo4j connection URI | bolt://neo4j:7687 |
| NEO4J_USERNAME | Neo4j username | neo4j |
| NEO4J_PASSWORD | Neo4j password | - (required) |
| REDIS_HOST | Redis host | redis |
| REDIS_PORT | Redis port | 6379 |
| DEFAULT_ADMIN_EMAIL | Email for default admin user | admin@footpath.com |
| DEFAULT_ADMIN_PASSWORD | Password for default admin user | - (recommended) |

## Scaling Recommendations

### Horizontal Scaling
- The monolith can be scaled horizontally by running multiple instances behind a load balancer
- Ensure shared Redis and database instances to maintain session consistency

### Database Scaling
- PostgreSQL can be scaled with read replicas for read-heavy operations
- Consider connection pooling for high-traffic scenarios

### Caching
- Redis is used for session storage and caching
- Configure Redis persistence for production environments

## Monitoring and Logging

### Health Checks
The application provides a health check endpoint at `/health` which returns:
```json
{
  "status": "ok",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

### Logging
- Application logs are stored in the `./logs` directory
- Error logs in `./logs/error.log`
- Combined logs in `./logs/combined.log`
- Log rotation is recommended for production

## Security Considerations

### Secrets Management
- Store sensitive data (passwords, keys) in environment variables
- Never commit secrets to version control
- Use Docker secrets for sensitive production data in orchestration environments

### HTTPS
- Use a reverse proxy (nginx, Apache) with SSL termination
- Enable HTTPS in production environments only

### Database Security
- Use strong passwords for database access
- Enable network-level isolation between services
- Regular database backups

## Backup and Recovery

### Database Backup
```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U footpath_user footpath > backup.sql

# Backup Neo4j (export data)
docker-compose exec neo4j cypher-shell -u neo4j -p $NEO4J_PASSWORD
```

### Application Backup
- Backup the environment variables file
- Backup the logs directory regularly
- Version control the application code and configurations

## Troubleshooting

### Common Issues
1. **Port conflicts**: Ensure required ports are available
2. **Database connection failures**: Check environment variables and network connectivity
3. **Insufficient resources**: Ensure system meets requirements

### Log Analysis
- Check application logs: `./logs/combined.log`
- Check Docker container logs: `docker-compose logs <service-name>`
- Look for error patterns or repeated messages

## API Documentation
The API documentation is available at: `http://<your-domain>/api/docs` when the application is running.

## Maintenance Tasks

### Routine Maintenance
- Regular log rotation
- Database optimization queries
- Security updates for base images
- Dependency updates

### Updating the Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose build
docker-compose up -d
```